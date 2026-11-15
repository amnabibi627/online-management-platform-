// ============================================================
// Home page - 04-cloud-sync.js
// Automatic cloud sync, restore and session bootstrap.
// Split from the original script.js during the 2026-11 refactor.
// Loaded in numeric order by the page HTML. Keep that order.
// ============================================================

// ===== Cleanup: the Guides & Updates section was removed =====
// Keys used by the old built-in posts. They are dropped from localStorage
// and from the cloud sync table so no stale data is left behind.
const RETIRED_ARTICLE_KEYS = ["siteArticles", "siteArticlesRemoved", "siteArticlesSeedVersion"];

// ===== Owner profile photo (DP) =====
// The photo used to live in localStorage only, so it could vanish on its own
// (cleared site data, a full localStorage, another browser, another device).
// It is kept in three places now - localStorage, IndexedDB and the cloud -
// and any one of them can bring it back.
const AVATAR_KEY = "ownerAvatar";
const AVATAR_TABLE = "site_profile";
const AVATAR_TABLE_FLAG = "oms_avatarTableMissing";
const AVATAR_EDGE = 512; // longest side of the stored photo
const avatarSrc = (v) => (!v ? "" : (typeof v === "string" ? v : v.v || ""));
const avatarTime = (v) => (!v || typeof v === "string" ? 0 : Number(v.t) || 0);

const SYNC_KEY = (k) => !!k && !k.startsWith("sb-") && !k.startsWith("oms_attempts_") && (
  k === "customCats" || k === "removedKeys" || k === "ownerAvatar" ||
  k.endsWith(":data") || k.startsWith("accountingLedger:"));

const cloudPushRows = async (rows) => {
  if (!sb || !cloudUser || !rows.length) return;
  const payload = rows.map((r) => ({
    user_id: cloudUser.id, key: r.key,
    value: r.value === undefined ? null : r.value,
    updated_at: new Date().toISOString()
  }));
  cloudState("syncing", "Syncing…");
  const { error } = await sb.from(CLOUD_TABLE).upsert(payload, { onConflict: "user_id,key" });
  if (error) {
    rows.forEach((r) => cloudPending.set(r.key, r.value));
    cloudState("error", "Sync error");
    console.warn("Supabase push failed:", error);
    return;
  }
  cloudState("connected", "Synced ✓");
};

const cloudSchedule = () => {
  clearTimeout(cloudTimer);
  cloudTimer = setTimeout(async () => {
    const rows = [...cloudPending].map(([key, value]) => ({ key, value }));
    cloudPending = new Map();
    await cloudPushRows(rows);
  }, 700);
};

const cloudPut = (key, value) => {
  if (!SYNC_KEY(key) || cloudBusy) return;
  cloudPending.set(key, value);
  cloudSchedule();
};

const cloudDrop = (key) => {
  if (!SYNC_KEY(key) || cloudBusy) return;
  cloudPending.set(key, null);
  cloudSchedule();
};

const ensureCurrentAccountActive = async (authUser = cloudUser) => {
  if (!sb || !authUser) throw new Error("Sign in to verify account access.");
  const { data, error } = await sb.rpc("oms_current_account_status");
  if (error) throw error;
  if (data?.active) return;
  const message = data?.reason || "This account has been blocked. Contact the site administrator.";
  const { error: signOutError } = await sb.auth.signOut();
  if (signOutError) throw signOutError;
  resetClientIdentityForAuthChange();
  throw new Error(message);
};

const cloudPull = async () => {
  if (!sb || !cloudUser) return false;
  await ensureCurrentAccountActive();
  cloudState("syncing", "Downloading…");
  const { data, error } = await sb.from(CLOUD_TABLE).select("key,value").eq("user_id", cloudUser.id);
  if (error) {
    cloudState("error", "Sync error");
    console.warn("Supabase pull failed:", error);
    return false;
  }
  (data || []).forEach((row) => {
    try {
      if (LEGACY_LOCAL_AUTH_KEYS.includes(row.key)) return;
      if (row.key === "businessRegistrations" || row.key === "selectedBizPlan") return;
      if (RETIRED_ARTICLE_KEYS.includes(row.key)) { localStorage.removeItem(row.key); return; }
      if (row.key === AVATAR_KEY) {
        // The photo can be newer on one side than the other. Keep the newer
        // copy and push it back up, so a photo is never reverted to an old one.
        const local = store.get(AVATAR_KEY, null);
        const localT = avatarTime(local);
        const cloudT = avatarTime(row.value);
        if (avatarSrc(local) && localT >= cloudT) {
          if (localT > cloudT) {
            sb.from(CLOUD_TABLE).upsert(
              { user_id: cloudUser.id, key: AVATAR_KEY, value: local, updated_at: new Date().toISOString() },
              { onConflict: "user_id,key" }
            ).then(() => {}, () => {});
          }
          return;
        }
        localStorage.setItem(row.key, JSON.stringify(row.value));
        return;
      }
      if (row.value === null || row.value === undefined) localStorage.removeItem(row.key);
      else localStorage.setItem(row.key, JSON.stringify(row.value));
    } catch {}
  });
  // Remove cloud rows for the retired Guides & Updates posts.
  try {
    const old = (data || []).filter((r) => RETIRED_ARTICLE_KEYS.includes(r.key)).map((r) => r.key);
    if (old.length) await sb.from(CLOUD_TABLE).delete().eq("user_id", cloudUser.id).in("key", old);
  } catch {}
  cloudState("connected", "Synced ✓");
  return true;
};

const cloudPushAll = async () => {
  if (!sb || !cloudUser) return;
  const rows = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!SYNC_KEY(k)) continue;
    try { rows.push({ key: k, value: JSON.parse(localStorage.getItem(k)) }); } catch {}
  }
  await cloudPushRows(rows);
};

const cloudRestore = async () => {
  if (!sb) { cloudState(null, "Local only"); return false; }
  try {
    const { data, error } = await sb.auth.getSession();
    if (error) throw error;
    const session = data && data.session;
    if (!session || !session.user) { cloudState(null, "Not signed in"); return false; }
    cloudUser = session.user;
    cloudBusy = true;
    const ok = await cloudPull();
    cloudBusy = false;
    if (!ok) { cloudState("error", "Offline"); return false; }
    // SECURITY: a signed-in session alone does NOT mean CEO.
    // The database decides, via the admins table (RLS limited to own row).
    const admin = await isCloudAdmin();
    if (admin) {
      const profile = await loadCeoProfile();
      const meta = cloudUser.user_metadata || {};
      ceoUser = {
        name: profile?.full_name || meta.name || "CEO",
        mobile: profile?.mobile || meta.mobile || "",
        email: cloudUser.email || "",
      };
      store.set("ceoAccount", ceoUser);
      setCeoSession(true);
    } else {
      cloudUser = null;
      setCeoSession(false);
    }
    return admin;
  } catch (e) {
    cloudBusy = false;
    cloudState("error", "Offline");
    console.warn("Cloud restore failed:", e);
    return false;
  }
};

const authErrMsg = (error) => {
  const m = (error && error.message) || "";
  if (/invalid login credentials/i.test(m)) return "The email/mobile number or password is incorrect.";
  if (/email_not_confirmed|not confirmed/i.test(m)) return "Supabase mein 'Confirm email' band karein (Authentication → Email).";
  if (/rate limit|too many/i.test(m)) return "Bohat zyada tries: thori der baad dobara try karein.";
  if (/fetch|network|failed to fetch/i.test(m)) return "Internet nahi mil raha: local mode mein kaam jaari hai.";
  return "Login failed: " + m;
};
