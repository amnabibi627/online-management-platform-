import { createClient } from "npm:@supabase/supabase-js@2";

const encoder = new TextEncoder();

const constantTimeEqual = (left: string, right: string) => {
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    difference |= (a[i] || 0) ^ (b[i] || 0);
  }
  return difference === 0;
};

Deno.serve(async (request) => {
  const allowedOrigin = Deno.env.get("CEO_APP_ORIGIN");
  const origin = request.headers.get("origin");
  const corsHeaders = {
    "Access-Control-Allow-Origin": allowedOrigin || "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };
  const respond = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), { status, headers: corsHeaders });

  if (!allowedOrigin || origin !== allowedOrigin) {
    return respond(403, { error: "Request origin is not allowed." });
  }
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return respond(405, { error: "Method not allowed." });
  if (Number(request.headers.get("content-length") || "0") > 4096) {
    return respond(413, { error: "Request is too large." });
  }

  const expectedEmail = Deno.env.get("CEO_SETUP_EMAIL")?.trim().toLowerCase();
  const expectedName = Deno.env.get("CEO_SETUP_NAME")?.trim();
  const expectedMobile = Deno.env.get("CEO_SETUP_MOBILE");
  const expectedSecret = Deno.env.get("CEO_SETUP_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!expectedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(expectedEmail) ||
      !expectedName || expectedName.length < 3 || expectedName.length > 80 ||
      !expectedMobile || !/^03[0-9]{9}$/.test(expectedMobile) ||
      !expectedSecret || expectedSecret.length < 32 ||
      !supabaseUrl || !serviceRoleKey) {
    console.error("CEO bootstrap secrets are missing or invalid.");
    return respond(503, { error: "CEO setup is not configured. Contact the site owner." });
  }

  let input: Record<string, unknown>;
  try {
    input = await request.json();
  } catch {
    return respond(400, { error: "Invalid request." });
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return respond(400, { error: "Invalid request." });
  }

  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const mobile = typeof input.mobile === "string" ? input.mobile : "";
  const secret = typeof input.secret === "string" ? input.secret : "";
  const password = typeof input.password === "string" ? input.password : "";
  if (email !== expectedEmail || name !== expectedName || mobile !== expectedMobile ||
      !constantTimeEqual(secret, expectedSecret)) {
    return respond(403, { error: "The supplied account details could not be verified." });
  }
  if (password.length < 8 || password.length > 72) {
    return respond(400, { error: "Choose a password between 8 and 72 characters." });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: setupAvailable, error: availabilityError } = await adminClient
    .rpc("oms_ceo_setup_available");
  if (availabilityError) {
    console.error("Could not check CEO setup availability:", availabilityError.message);
    return respond(500, { error: "CEO account availability could not be checked." });
  }
  if (setupAvailable !== true) return respond(409, { error: "The one-time CEO account has already been created." });

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email: expectedEmail,
    password,
    email_confirm: true,
    user_metadata: { name: expectedName, mobile: expectedMobile },
  });
  if (createError || !created.user) {
    console.error("Could not create the CEO Auth account:", createError?.message || "No user returned.");
    return respond(400, { error: "CEO account could not be created. It may already exist; contact the site owner." });
  }

  const { error: claimError } = await adminClient.rpc("complete_oms_ceo_bootstrap", {
    p_user_id: created.user.id,
    p_email: expectedEmail,
    p_name: expectedName,
    p_mobile: expectedMobile,
  });
  if (claimError) {
    const { data: claimed, error: verifyError } = await adminClient
      .from("admins")
      .select("user_id")
      .eq("user_id", created.user.id)
      .eq("role", "ceo")
      .maybeSingle();
    if (verifyError) {
      console.error("Could not verify the CEO claim after an RPC failure:", verifyError.message);
      return respond(500, { error: "CEO setup status is unclear. Contact the site owner before retrying." });
    }
    if (claimed) return respond(200, { ok: true });

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(created.user.id);
    if (deleteError) console.error("Could not clean up the unclaimed CEO Auth account:", deleteError.message);
    console.error("Could not claim the CEO account:", claimError.message);
    return respond(409, { error: "CEO setup could not be completed. Contact the site owner before retrying." });
  }

  return respond(200, { ok: true });
});
