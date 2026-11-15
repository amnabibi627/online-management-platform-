// ============================================================
// Home page - 03-security.js
// Server-side CEO check and login throttling.
// Split from the original script.js during the 2026-11 refactor.
// Loaded in numeric order by the page HTML. Keep that order.
// ============================================================

// ===== Security: server-side CEO check =====
// The "admins" table has RLS that only lets a signed-in user read their
// OWN row. So this answer comes from the database, not from the browser,
// and cannot be faked by editing localStorage or the page source.
const isCloudAdmin = async () => {
  if (!sb || !cloudUser) return false;
  try {
    const { data, error } = await sb
      .from(ADMIN_TABLE)
      .select("role")
      .eq("user_id", cloudUser.id)
      .maybeSingle();
    if (error) {
      console.warn("Admin check failed:", error.message);
      return false;
    }
    return data?.role === "ceo";
  } catch {
    return false;
  }
};

const loadCeoProfile = async () => {
  if (!sb || !cloudUser) return null;
  const { data, error } = await sb
    .from(ADMIN_TABLE)
    .select("full_name,mobile,email")
    .eq("user_id", cloudUser.id)
    .eq("role", "ceo")
    .maybeSingle();
  if (error) throw error;
  return data;
};

// ===== Security: login throttling (brute force guard) =====
const ATTEMPT_WINDOW = 60 * 1000;
const ATTEMPT_MAX = 5;

const attemptState = (key) => {
  try {
    const raw = JSON.parse(localStorage.getItem("oms_attempts_" + key)) || { count: 0, first: Date.now() };
    if (Date.now() - raw.first > ATTEMPT_WINDOW) return { count: 0, first: Date.now() };
    return raw;
  } catch {
    return { count: 0, first: Date.now() };
  }
};

const attemptsLeft = (key) => {
  const s = attemptState(key);
  return Math.max(0, ATTEMPT_MAX - s.count);
};

const logAttempt = (key) => {
  const s = attemptState(key);
  s.count += 1;
  s.first = Date.now();
  try { localStorage.setItem("oms_attempts_" + key, JSON.stringify(s)); } catch {}
  return s.count;
};

const clearAttempts = (key) => {
  try { localStorage.removeItem("oms_attempts_" + key); } catch {}
};

const rateMsg = (key) => {
  const left = attemptsLeft(key);
  if (left > 0) return null;
  return "Too many failed tries. Wait 1 minute, then try again.";
};

const cloudState = (cls, label) => {
  const pill = document.getElementById("cloudPill");
  if (!pill) return;
  pill.classList.remove("connected", "syncing", "error");
  if (cls) pill.classList.add(cls);
  const t = document.getElementById("cloudPillText");
  if (t) t.textContent = label;
};
