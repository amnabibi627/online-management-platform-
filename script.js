// ===== Supabase cloud (login + data sync) =====
const sb = window.OMS_FEATURE_MODULES.supabaseClient;
const CLOUD_TABLE = "app_data";
const ADMIN_TABLE = "admins";
let cloudUser = null;
let cloudBusy = false;
let cloudTimer = null;
let cloudPending = new Map();
const LEGACY_LOCAL_AUTH_KEYS = ["ownerAccount", "owners", "siteUsers", "siteReviews"];

const cloudEmail = (mobile) => `${mobile}@bms.app`;

const removeLegacyPasswordHashes = () => {
  ["ownerAccount", "owners", "siteUsers", "ceoAccount"].forEach((key) => {
    try {
      const stored = JSON.parse(localStorage.getItem(key));
      if (key === "ceoAccount" && stored && typeof stored === "object" &&
          (Object.prototype.hasOwnProperty.call(stored, "passHash") ||
           Object.prototype.hasOwnProperty.call(stored, "codeHash"))) {
        localStorage.removeItem(key);
        return;
      }
      if (Array.isArray(stored)) {
        localStorage.setItem(key, JSON.stringify(stored.map((profile) => {
          if (!profile || typeof profile !== "object" || Array.isArray(profile)) return profile;
          const { passHash, codeHash, ...safeProfile } = profile;
          return safeProfile;
        })));
      } else if (stored && typeof stored === "object") {
        delete stored.passHash;
        delete stored.codeHash;
        localStorage.setItem(key, JSON.stringify(stored));
      }
    } catch (error) {
      console.warn(`Could not remove legacy credential data from ${key}:`, error);
    }
  });
  try {
    localStorage.removeItem("siteUserSession");
  } catch (error) {
    console.warn("Could not clear the legacy browser-only user session:", error);
  }
};

removeLegacyPasswordHashes();

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
  k === "businessRegistrations" || k === "selectedBizPlan" ||
  k.endsWith(":data"));

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

const cloudPull = async () => {
  if (!sb || !cloudUser) return false;
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
      const meta = cloudUser.user_metadata || {};
      const stored = store.get("ceoAccount", null);
      ceoUser = stored || { name: meta.name || "CEO", mobile: meta.mobile || "", email: cloudUser.email || "" };
      ceoUser.email = cloudUser.email || ceoUser.email || "";
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
  if (/invalid login credentials/i.test(m)) return "Mobile number ya secret code ghalat hai.";
  if (/email_not_confirmed|not confirmed/i.test(m)) return "Supabase mein 'Confirm email' band karein (Authentication → Email).";
  if (/rate limit|too many/i.test(m)) return "Bohat zyada tries — thori der baad dobara try karein.";
  if (/fetch|network|failed to fetch/i.test(m)) return "Internet nahi mil raha — local mode mein kaam jaari hai.";
  return "Login failed: " + m;
};

// Mobile navigation
const navToggle = document.getElementById("navToggle");
const mainNav = document.getElementById("mainNav");

navToggle.addEventListener("click", () => {
  mainNav.classList.toggle("open");
});

mainNav.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", () => mainNav.classList.remove("open"));
});

// Active nav link on scroll
const sections = [...document.querySelectorAll("section[id], #reviews")];
const navLinks = [...mainNav.querySelectorAll(".nav-link")];

const setActiveLink = () => {
  const scrollPos = window.scrollY + 140;
  let current = "home";
  sections.forEach((section) => {
    const top = section.getBoundingClientRect().top + window.scrollY;
    if (scrollPos >= top) current = section.id;
  });
  let matched = false;
  navLinks.forEach((link) => {
    const href = link.getAttribute("href").replace("#", "");
    const on = href === current || (current === "home" && href === "top");
    if (on) matched = true;
    link.classList.toggle("active", on);
  });
  // Sections that are not in the nav (Guides) keep the last nav link highlighted.
  if (!matched && navLinks.length) navLinks[navLinks.length - 1].classList.add("active");
};

window.addEventListener("scroll", setActiveLink, { passive: true });
setActiveLink();

// Category detail views (event delegation — works for CEO-added cards too)
const getDetail = (card) => document.getElementById(`${card.dataset.detail}Detail`);

const closeDetail = (detail) => {
  detail.classList.remove("open");
  detail.setAttribute("aria-hidden", "true");
  document.body.classList.remove("detail-open");
};

const industryGrid = document.querySelector(".industry-grid");

industryGrid.addEventListener("click", (e) => {
  const rm = e.target.closest(".card-remove");
  if (rm) { handleRemoveCard(rm.closest(".industry-card")); return; }

  const card = e.target.closest(".industry-card[data-detail]");
  if (!card || card.matches("a[href]")) return;

  if (!ceoMode && owner && !ownerAllowedCats(owner).includes(card.dataset.detail)) {
    showToast(`Access denied — your owner account does not have ${labelFor(card.dataset.detail)} access.`, true);
    return;
  }

  const detail = getDetail(card);
  if (!detail) return;
  detail.classList.add("open");
  detail.setAttribute("aria-hidden", "false");
  document.body.classList.add("detail-open");
  detail.scrollTop = 0;
});

document.addEventListener("click", (e) => {
  const back = e.target.closest(".detail-back");
  if (back) { closeFeaturePanel(); closeDetail(back.closest(".category-detail")); }
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (dataModal.classList.contains("open")) { closeDataBrowser(); return; }
  if (featureModal.classList.contains("open")) { closeFeaturePanel(); return; }
  document.querySelectorAll(".category-detail.open").forEach(closeDetail);
});

// Hero buttons: white by default, pink when selected
document.querySelectorAll(".hero-actions .btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".hero-actions .btn").forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
  });
});

// Toast
const toastEl = document.getElementById("toast");
let toastTimer;
const showToast = (msg, isError = false) => {
  toastEl.textContent = msg;
  toastEl.classList.toggle("error", isError);
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 3200);
};

// Staff / Customer portal buttons: Sign Up <-> Login toggle
const registered = new Set();

document.querySelectorAll(".portal-card:not([data-portal='owner'])").forEach((card) => {
  const portal = card.dataset.portal;
  if (portal === "ceo") {
    const button = card.querySelector(".portal-btn");
    if (button) {
      button.addEventListener("click", (e) => {
        e.preventDefault();
        if (typeof openCeoModal === "function") openCeoModal();
      });
    }
    return;
  }
  const label = portal.charAt(0).toUpperCase() + portal.slice(1);
  const button = card.querySelector(".portal-btn");

  button.addEventListener("click", () => {
    if (registered.has(portal)) {
      showToast(`${label} Login — redirecting to the ${label} portal...`);
    } else {
      registered.add(portal);
      button.textContent = `${label} Login`;
      showToast(`Registration complete! Your ${label} account is ready.`);
    }
  });
});

// ===== Owner Account: Sign Up / Login connected with categories =====
const normMobile = (v) => v.replace(/[\s-]/g, "").replace(/^\+92/, "0");
const MOBILE_RE = /^03\d{9}$/;
const ownerModal = document.getElementById("ownerModal");
const ownerForm = document.getElementById("ownerForm");
const ownerModalTitle = document.getElementById("ownerModalTitle");
const ownerModalSub = document.getElementById("ownerModalSub");
const signupFields = document.getElementById("signupFields");
const loginField = document.getElementById("loginField");
const ownerSubmit = document.getElementById("ownerSubmit");
const ownerBtn = document.querySelector(".portal-btn[data-portal='owner'], [data-portal='owner'] .portal-btn");

const fields = {
  name: { input: document.getElementById("ofName"), err: document.getElementById("errName") },
  mobile: { input: document.getElementById("ofMobile"), err: document.getElementById("errMobile") },
  age: { input: document.getElementById("ofAge"), err: document.getElementById("errAge") },
  city: { input: document.getElementById("ofCity"), err: document.getElementById("errCity") },
  category: { input: document.getElementById("ofCategory"), err: document.getElementById("errCategory") },
  pass: { input: document.getElementById("ofPass"), err: document.getElementById("errPass") },
  loginMobile: { input: document.getElementById("ofLoginMobile"), err: document.getElementById("errLoginMobile") },
  loginPass: { input: document.getElementById("ofLoginPass"), err: document.getElementById("errLoginPass") },
};

// ===== User accounts (for reviews & comments) =====
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
const accountEmail = (mobile) => cloudEmail(mobile);
let currentUser = null;
let owner = null;
let accountAuthUser = null;
let cloudOwnerProfiles = null;

const getAccountProfiles = async (authUser) => {
  if (!sb || !authUser) return { customer: null, owner: null };
  const [customerResult, ownerResult] = await Promise.all([
    sb.from("customer_profiles").select("user_id,full_name,mobile,email,city").eq("user_id", authUser.id).maybeSingle(),
    sb.from("owner_profiles").select("user_id,full_name,mobile,age,city,categories").eq("user_id", authUser.id).maybeSingle()
  ]);
  if (customerResult.error) throw customerResult.error;
  if (ownerResult.error) throw ownerResult.error;
  const customer = customerResult.data ? {
    id: customerResult.data.user_id,
    name: customerResult.data.full_name,
    mobile: customerResult.data.mobile,
    email: customerResult.data.email,
    city: customerResult.data.city
  } : null;
  const ownerProfile = ownerResult.data ? {
    id: ownerResult.data.user_id,
    name: ownerResult.data.full_name,
    mobile: ownerResult.data.mobile,
    age: ownerResult.data.age,
    city: ownerResult.data.city,
    categories: ownerResult.data.categories,
    category: ownerResult.data.categories[0]
  } : null;
  return { customer, owner: ownerProfile };
};

const refreshAccountProfiles = async (authUser) => {
  accountAuthUser = authUser || null;
  const profiles = await getAccountProfiles(accountAuthUser);
  currentUser = profiles.customer;
  owner = profiles.owner;
  refreshOwnerButton();
  applyAccess();
  if (typeof renderReviews === "function") await renderReviews();
  return profiles;
};

const resetClientIdentityForAuthChange = () => {
  cloudUser = null;
  cloudPending.clear();
  cloudOwnerProfiles = null;
  accountAuthUser = null;
  currentUser = null;
  owner = null;
  setCeoSession(false);
  refreshOwnerButton();
  applyAccess();
};

const signOutSiteAccount = async () => {
  if (!sb) throw new Error("Cloud account service is unavailable.");
  const { error } = await sb.auth.signOut();
  if (error) throw error;
  resetClientIdentityForAuthChange();
  if (typeof renderReviews === "function") await renderReviews();
};

const signInWithMobile = async (mobile, password) => {
  if (!sb) throw new Error("Account service is unavailable. Check your connection and try again.");
  const { data, error } = await sb.auth.signInWithPassword({
    email: accountEmail(mobile),
    password
  });
  if (error) throw error;
  if (!data.user || !data.session) {
    throw new Error("Email confirmation is enabled. The site administrator must disable it before accounts can sign in.");
  }
  cloudPending.clear();
  resetClientIdentityForAuthChange();
  return data.user;
};

const createOrResumeAuthAccount = async (mobile, password, metadata) => {
  if (!sb) throw new Error("Account service is unavailable. Check your connection and try again.");
  const { data, error } = await sb.auth.signUp({
    email: accountEmail(mobile),
    password,
    options: { data: metadata }
  });
  if (!error && data.user && data.session) {
    cloudPending.clear();
    resetClientIdentityForAuthChange();
    return data.user;
  }
  if (!error && data.user && !data.session) {
    throw new Error("Email confirmation is enabled. The site administrator must disable it before accounts can be created.");
  }
  if (error && /already registered|already been registered/i.test(error.message || "")) {
    return signInWithMobile(mobile, password);
  }
  throw error || new Error("Account creation did not complete.");
};


const setError = (f, msg) => {
  f.err.textContent = msg || "";
  f.input.classList.toggle("invalid", !!msg);
};

const ownerActiveBox = document.getElementById("ownerActiveBox");
const ownerActiveName = document.getElementById("ownerActiveName");
const ownerActiveMobile = document.getElementById("ownerActiveMobile");
const ownerActiveCategory = document.getElementById("ownerActiveCategory");
const ownerModeToggle = document.getElementById("ownerModeToggle");
const ownerLogout = document.getElementById("ownerLogout");
const ownerGoCategory = document.getElementById("ownerGoCategory");
const ownerSwitchAccount = document.getElementById("ownerSwitchAccount");

let ownerModalMode = "signup"; // "signup" | "login" | "active"

const openOwnerModal = (mode) => {
  ownerModalMode = mode || (owner ? "active" : "signup");
  Object.values(fields).forEach((f) => setError(f, ""));

  if (ownerModalMode === "active" && owner) {
    ownerModalTitle.textContent = "My Owner Account";
    ownerModalSub.textContent = "You are currently signed in as an Owner.";
    if (ownerActiveBox) ownerActiveBox.hidden = false;
    ownerForm.hidden = true;
    const loginPassField = document.getElementById("loginPassField");
    if (loginPassField) loginPassField.hidden = true;
    if (ownerActiveName) ownerActiveName.textContent = owner.name || "Owner";
    if (ownerActiveMobile) ownerActiveMobile.textContent = owner.mobile || "—";
    const allowed = ownerAllowedCats(owner);
    if (ownerActiveCategory) ownerActiveCategory.textContent = allowed.map(labelFor).join(", ") || labelFor(owner.category) || "—";
  } else {
    const isSignup = ownerModalMode === "signup";
    ownerModalTitle.textContent = isSignup ? "Owner Sign Up" : "Owner Login";
    ownerModalSub.textContent = isSignup
      ? "Create your owner account and choose your business category."
      : "Enter your registered mobile number and password to log in.";
    if (ownerActiveBox) ownerActiveBox.hidden = true;
    ownerForm.hidden = false;
    signupFields.hidden = !isSignup;
    loginField.hidden = isSignup;
    const loginPassFieldEl = document.getElementById("loginPassField");
    if (loginPassFieldEl) loginPassFieldEl.hidden = isSignup;
    ownerSubmit.textContent = isSignup ? "Create Owner Account" : "Login";
    if (ownerModeToggle) {
      ownerModeToggle.textContent = isSignup ? "Already registered? Login here" : "Need a new account? Sign Up here";
    }
    ownerForm.reset();
  }

  ownerModal.classList.add("open");
  ownerModal.setAttribute("aria-hidden", "false");
};

const closeOwnerModal = () => {
  ownerModal.classList.remove("open");
  ownerModal.setAttribute("aria-hidden", "true");
};

// ===== User Sign Up / Login modal =====
const userModal = document.getElementById("userModal");
const userForm = document.getElementById("userForm");
const userSignupFields = document.getElementById("userSignupFields");
const userLoginFields = document.getElementById("userLoginFields");
const userActiveBox = document.getElementById("userActiveBox");
const userModalTitle = document.getElementById("userModalTitle");
const userModalSub = document.getElementById("userModalSub");
const userSubmit = document.getElementById("userSubmit");
const userModeToggle = document.getElementById("userModeToggle");
const userLogout = document.getElementById("userLogout");

const uFields = {
  name: { input: document.getElementById("ufName"), err: document.getElementById("ufNameErr") },
  mobile: { input: document.getElementById("ufMobile"), err: document.getElementById("ufMobileErr") },
  email: { input: document.getElementById("ufEmail"), err: document.getElementById("ufEmailErr") },
  city: { input: document.getElementById("ufCity"), err: document.getElementById("ufCityErr") },
  pass: { input: document.getElementById("ufPass"), err: document.getElementById("ufPassErr") },
  pass2: { input: document.getElementById("ufPass2"), err: document.getElementById("ufPass2Err") },
  loginMobile: { input: document.getElementById("ufLoginMobile"), err: document.getElementById("ufLoginMobileErr") },
  loginPass: { input: document.getElementById("ufLoginPass"), err: document.getElementById("ufLoginPassErr") },
};

let userModalMode = "signup"; // "signup" | "login" | "active"

// Show / hide password
const setUserPassVisibility = (show, isLogin = false) => {
  const ids = isLogin ? ["ufLoginPass"] : ["ufPass", "ufPass2"];
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.type = show ? "text" : "password";
  });
};

const setUserError = (f, msg) => {
  if (!f || !f.err) return;
  f.err.textContent = msg || "";
  if (f.input) f.input.classList.toggle("invalid", !!msg);
};

const openUserModal = (mode) => {
  userModalMode = mode || (currentUser ? "active" : "signup");
  Object.values(uFields).forEach((f) => setUserError(f, ""));

  if (userModalMode === "active" && currentUser) {
    userModalTitle.textContent = "Your Account";
    userModalSub.textContent = "You are signed in. Thanks for being part of Online Management Site.";
    if (userActiveBox) userActiveBox.hidden = false;
    userForm.hidden = true;
    const nm = document.getElementById("userActiveName");
    const mb = document.getElementById("userActiveMobile");
    const ct = document.getElementById("userActiveCity");
    if (nm) nm.textContent = currentUser.name || "User";
    if (mb) mb.textContent = currentUser.mobile || "—";
    if (ct) ct.textContent = currentUser.city || "—";
  } else {
    const isSignup = userModalMode === "signup";
    userModalTitle.textContent = isSignup ? "Create Your Account" : "Welcome Back";
    userModalSub.textContent = isSignup
      ? "Fill the form below to sign up. It takes less than a minute."
      : "Enter your registered mobile number and password to log in.";
    if (userActiveBox) userActiveBox.hidden = true;
    userForm.hidden = false;
    userSignupFields.hidden = !isSignup;
    userLoginFields.hidden = isSignup;
    userSubmit.textContent = isSignup ? "Create Account" : "Login";
    if (userModeToggle) {
      userModeToggle.textContent = isSignup
        ? "Already have an account? Login here"
        : "Need a new account? Sign Up here";
    }
    userForm.reset();
    setUserPassVisibility(false);
    setUserPassVisibility(false, true);
  }

  userModal.classList.add("open");
  userModal.setAttribute("aria-hidden", "false");
  if (typeof renderReviews === "function") renderReviews();
};

const closeUserModal = () => {
  userModal.classList.remove("open");
  userModal.setAttribute("aria-hidden", "true");
};

if (userModeToggle) {
  userModeToggle.addEventListener("click", (e) => {
    e.preventDefault();
    openUserModal(userModalMode === "signup" ? "login" : "signup");
  });
}

const userShowPass = document.getElementById("ufShowPass");
if (userShowPass) {
  userShowPass.addEventListener("change", () => setUserPassVisibility(userShowPass.checked));
}
const userShowPassLogin = document.getElementById("ufShowPassLogin");
if (userShowPassLogin) {
  userShowPassLogin.addEventListener("change", () => setUserPassVisibility(userShowPassLogin.checked, true));
}

if (userLogout) {
  userLogout.addEventListener("click", async () => {
    userLogout.disabled = true;
    try {
      await signOutSiteAccount();
      closeUserModal();
      showToast("Logged out.");
    } catch (error) {
      showToast(`Logout failed: ${error.message || "Cloud service error."}`, true);
    } finally {
      userLogout.disabled = false;
    }
  });
}

document.getElementById("userModalClose").addEventListener("click", closeUserModal);
userModal.addEventListener("click", (e) => { if (e.target === userModal) closeUserModal(); });

if (userForm) {
  userForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!sb) {
      showToast("Account service is unavailable. Check your connection and try again.", true);
      return;
    }
    userSubmit.disabled = true;

    try {
      if (userModalMode === "signup") {
      const name = String(uFields.name.input.value || "").trim();
      const mobile = normMobile(uFields.mobile.input.value);
      const email = String(uFields.email.input.value || "").trim().toLowerCase();
      const city = String(uFields.city.input.value || "").trim();
      const pass = String(uFields.pass.input.value || "");
      const pass2 = String(uFields.pass2.input.value || "");
      let ok = true;

      if (name.length < 3) { setUserError(uFields.name, "Enter your full name (min 3 letters)."); ok = false; }
      else setUserError(uFields.name, "");
      if (!MOBILE_RE.test(mobile)) { setUserError(uFields.mobile, "Enter a valid number, e.g. 03123456789."); ok = false; }
      else setUserError(uFields.mobile, "");
      if (!EMAIL_RE.test(email)) { setUserError(uFields.email, "Enter a valid email address."); ok = false; }
      else setUserError(uFields.email, "");
      if (city.length < 2) { setUserError(uFields.city, "Enter your city."); ok = false; }
      else setUserError(uFields.city, "");
      if (pass.length < 8) { setUserError(uFields.pass, "Password must be at least 8 characters."); ok = false; }
      else setUserError(uFields.pass, "");
      if (pass !== pass2) { setUserError(uFields.pass2, "Both passwords must match."); ok = false; }
      else setUserError(uFields.pass2, "");

      if (!ok) { showToast("Please fix the highlighted fields.", true); return; }

      const authUser = await createOrResumeAuthAccount(mobile, pass, { name, mobile });
      const { error } = await sb.from("customer_profiles").insert({
        user_id: authUser.id,
        full_name: name,
        mobile,
        email,
        city
      });
      if (error && !/duplicate key|already exists/i.test(error.message || "")) throw error;
      const profiles = await refreshAccountProfiles(authUser);
      if (!profiles.customer) throw new Error("Account was created but its customer profile could not be loaded. Please sign in again.");
      closeUserModal();
      showToast(`Account ready. Welcome, ${profiles.customer.name}!`);
      return;
      }

      const mobile = normMobile(uFields.loginMobile.input.value);
      const pass = String(uFields.loginPass.input.value || "");
      if (!MOBILE_RE.test(mobile)) {
        setUserError(uFields.loginMobile, "Enter a valid number, e.g. 03123456789.");
        showToast("Login failed — invalid mobile number.", true);
        return;
      }
      if (!pass) {
        setUserError(uFields.loginPass, "Enter your password.");
        showToast("Login failed — password required.", true);
        return;
      }
      const authUser = await signInWithMobile(mobile, pass);
      const profiles = await refreshAccountProfiles(authUser);
      if (!profiles.customer) {
        throw new Error("No customer profile was found for this account. Choose Create Account and use the same mobile and password to finish setup.");
      }
      setUserError(uFields.loginMobile, "");
      setUserError(uFields.loginPass, "");
      closeUserModal();
      showToast(`Logged in successfully. Welcome back, ${profiles.customer.name}!`);
    } catch (error) {
      const message = error.message || "Account request failed. Please try again.";
      if (userModalMode === "signup") {
        if (/mobile|already registered|duplicate key/i.test(message)) setUserError(uFields.mobile, message);
        else if (/email/i.test(message)) setUserError(uFields.email, message);
        else setUserError(uFields.pass, message);
      } else {
        setUserError(uFields.loginPass, message);
      }
      showToast(message, true);
    } finally {
      userSubmit.disabled = false;
    }
  });
}

const refreshOwnerButton = () => {
  if (ownerBtn) ownerBtn.textContent = owner ? "Owner Account" : "Owner Sign Up";
};

const ownerAllowedCats = (o) =>
  Array.isArray(o && o.categories) ? o.categories : (o && o.category ? [o.category] : []);

const applyAccess = () => {
  document.querySelectorAll(".industry-card").forEach((card) => {
    card.querySelector(".card-remove")?.remove();
    if (ceoMode) {
      card.classList.remove("locked");
      card.classList.remove("allowed");
    } else {
      const isAllowed = owner && ownerAllowedCats(owner).includes(card.dataset.detail);
      card.classList.toggle("locked", !!owner && !isAllowed);
      card.classList.toggle("allowed", !!isAllowed);
    }
  });
  document.querySelectorAll(".category-detail .detail-admin-btn").forEach((btn) => {
    const key = btn.closest(".category-detail").id.replace(/Detail$/, "");
    btn.hidden = !(ceoMode || !owner || ownerAllowedCats(owner).includes(key));
  });
};

const validateSignup = () => {
  let ok = true;
  const name = fields.name.input.value.trim();
  const mobile = normMobile(fields.mobile.input.value);
  const age = fields.age.input.value.trim();
  const city = fields.city.input.value.trim();
  const category = fields.category.input.value;
  const pass = fields.pass.input.value;

  if (name.length < 3) { setError(fields.name, "Enter your full name (min 3 letters)."); ok = false; } else setError(fields.name, "");
  if (!MOBILE_RE.test(mobile)) { setError(fields.mobile, "Enter a valid number, e.g. 03123456789 or +923123456789."); ok = false; } else setError(fields.mobile, "");
  const ageNum = Number(age);
  if (!age || !Number.isInteger(ageNum) || ageNum < 18 || ageNum > 100) { setError(fields.age, "Age must be between 18 and 100."); ok = false; } else setError(fields.age, "");
  if (city.length < 2) { setError(fields.city, "Enter your city."); ok = false; } else setError(fields.city, "");
  if (!category) { setError(fields.category, "Select one category — you will only get access to it."); ok = false; } else setError(fields.category, "");
  if (pass.length < 8) { setError(fields.pass, "Choose a password (min 8 characters)."); ok = false; } else setError(fields.pass, "");

  if (!ok) return null;
  return { name, mobile, age: ageNum, city, category, pass };
};

if (ownerModeToggle) {
  ownerModeToggle.addEventListener("click", (e) => {
    e.preventDefault();
    openOwnerModal(ownerModalMode === "signup" ? "login" : "signup");
  });
}

if (ownerSwitchAccount) {
  ownerSwitchAccount.addEventListener("click", () => openOwnerModal("login"));
}

if (ownerGoCategory) {
  ownerGoCategory.addEventListener("click", () => {
    closeOwnerModal();
    const cat = owner && (owner.category || (owner.categories && owner.categories[0]));
    if (!cat) return;
    const card = document.querySelector(`.industry-card[data-detail="${cat}"]`);
    if (card) card.click();
  });
}

if (ownerLogout) {
  ownerLogout.addEventListener("click", async () => {
    ownerLogout.disabled = true;
    try {
      await signOutSiteAccount();
      closeOwnerModal();
      showToast("Logged out of owner account.");
    } catch (error) {
      showToast(`Logout failed: ${error.message || "Cloud service error."}`, true);
    } finally {
      ownerLogout.disabled = false;
    }
  });
}

if (ownerBtn) ownerBtn.addEventListener("click", () => openOwnerModal(owner ? "active" : "signup"));

document.getElementById("ownerModalClose").addEventListener("click", closeOwnerModal);
ownerModal.addEventListener("click", (e) => { if (e.target === ownerModal) closeOwnerModal(); });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && ownerModal.classList.contains("open")) closeOwnerModal();
});

ownerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!sb) {
    showToast("Account service is unavailable. Check your connection and try again.", true);
    return;
  }
  ownerSubmit.disabled = true;

  try {
    if (ownerModalMode === "signup") {
      const data = await validateSignup();
      if (!data) { showToast("Signup failed — please fix the fields.", true); return; }
      const authUser = await createOrResumeAuthAccount(data.mobile, data.pass, { name: data.name, mobile: data.mobile });
      const { error } = await sb.from("owner_profiles").insert({
        user_id: authUser.id,
        full_name: data.name,
        mobile: data.mobile,
        age: data.age,
        city: data.city,
        categories: [data.category]
      });
      if (error && !/duplicate key|already exists/i.test(error.message || "")) throw error;
      const profiles = await refreshAccountProfiles(authUser);
      if (!profiles.owner) throw new Error("Account was created but its owner profile could not be loaded. Please sign in again.");
      closeOwnerModal();
      showToast(`Welcome, ${owner.name}! Select your paid category plan to unlock its tools.`);
      return;
    }

    const mobile = normMobile(fields.loginMobile.input.value);
    const pass = fields.loginPass.input.value;
    if (!MOBILE_RE.test(mobile)) {
      setError(fields.loginMobile, "Enter a valid mobile number, e.g. 03123456789.");
      showToast("Login failed — invalid mobile number.", true);
      return;
    }
    if (!pass) {
      setError(fields.loginPass, "Enter your password.");
      showToast("Login failed — password required.", true);
      return;
    }
    const authUser = await signInWithMobile(mobile, pass);
    const profiles = await refreshAccountProfiles(authUser);
    if (!profiles.owner) throw new Error("No owner profile found. Choose Sign Up and use the same mobile and password to finish setup.");
    setError(fields.loginMobile, "");
    setError(fields.loginPass, "");
    closeOwnerModal();
    showToast(`Logged in — welcome back, ${owner.name}!`);
  } catch (error) {
    const message = error.message || "Owner account request failed.";
    if (ownerModalMode === "signup") {
      if (/mobile|already registered|duplicate key/i.test(message)) setError(fields.mobile, message);
      else if (/age/i.test(message)) setError(fields.age, message);
      else if (/city/i.test(message)) setError(fields.city, message);
      else setError(fields.pass, message);
    } else {
      setError(fields.loginPass, message);
    }
    showToast(message, true);
  } finally {
    ownerSubmit.disabled = false;
  }
});

function labelFor(key) {
  const card = document.querySelector(`.industry-card[data-detail="${key}"]`);
  return card ? card.querySelector("h3").textContent : key;
}

// ===== CEO master account (header "Owner Account" button) =====
const store = {
  get(key, fallback) { try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} cloudPut(key, value); },
  remove(key) { try { localStorage.removeItem(key); } catch {} cloudDrop(key); },
};

let ceoUser = store.get("ceoAccount", null);
let ceoLoggedIn = false;
let ceoMode = false;
let removedKeys = store.get("removedKeys", []);
let customCats = store.get("customCats", []);

const ceoBtn = document.getElementById("ceoBtn");
const ceoSignupBtn = document.getElementById("ceoSignupBtn");
const userSignupHeaderBtn = document.getElementById("userSignupHeaderBtn");
const ceoModal = document.getElementById("ceoModal");
const ceoLogin = document.getElementById("ceoLogin");
const ceoPanel = document.getElementById("ceoPanel");
const ceoLoginForm = document.getElementById("ceoLoginForm");
const ceoSignupExtra = document.getElementById("ceoSignupExtra");
const ceoLoginSubmit = document.getElementById("ceoLoginSubmit");
const ceoNameInput = document.getElementById("ceoName");
const ceoMobileInput = document.getElementById("ceoMobile");
const ceoCodeInput = document.getElementById("ceoCode");
const ceoErrName = document.getElementById("ceoErrName");
const ceoErrMobile = document.getElementById("ceoErrMobile");
const ceoErrCode = document.getElementById("ceoErrCode");

const escHtml = (s) => String(s ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

const safeIcon = (s) => {
  const t = String(s ?? "").trim();
  return /^[^\u0000-\u007F]{1,4}$/.test(t) ? t : "📁";
};

const buildCustomCategory = (cat) => {
  const card = document.createElement("article");
  card.className = "industry-card";
  card.dataset.detail = cat.key;
  card.innerHTML = `<div class="industry-icon">${safeIcon(cat.icon)}</div><h3>${escHtml(cat.name)}</h3><p>${escHtml(cat.sub)}</p>`;
  industryGrid.appendChild(card);

  const cardsHtml = GENERIC_FEATURES.map((f) =>
    `<div class="detail-card" data-category="${escHtml(cat.key)}" data-feature="${escHtml(f.id)}">` +
    `<div class="detail-card-icon">${f.icon}</div>` +
    `<h4>${escHtml(f.name)}</h4>` +
    `<p>${escHtml(f.desc)}</p></div>`
  ).join("");

  const detail = document.createElement("div");
  detail.className = "category-detail";
  detail.id = `${cat.key}Detail`;
  detail.setAttribute("aria-hidden", "true");
  detail.innerHTML =
    `<div class="detail-header">` +
    `<button class="btn btn-outline detail-back">&larr; Back to Categories</button>` +
    `<span class="brand small">Online Management <span class="brand-accent">Site</span></span></div>` +
    `<div class="container"><div class="detail-hero"><div class="detail-icon">${safeIcon(cat.icon)}</div>` +
    `<h2>${escHtml(cat.name)}</h2><p>${escHtml(cat.sub)}</p></div>` +
    `<div class="detail-grid">${cardsHtml}</div></div>`;
  document.querySelector("main").appendChild(detail);
  addSheetButton(detail, cat.key);
};

const updateCeoStats = () => {
  const el = document.getElementById("ceoCatCount");
  if (!el) return;
  const ownersCount = adminAllOwners().length + (owner && !adminAllOwners().some((o) => o.mobile === owner.mobile) ? 1 : 0);
  el.textContent = document.querySelectorAll(".industry-card").length;
  document.getElementById("ceoOwnerInfo").textContent = ownersCount > 1 ? `${ownersCount} owners` : (owner ? owner.name : "Not registered");
  document.getElementById("ceoAccessInfo").textContent = ceoMode ? "Full (CEO)" : owner ? "Owner restricted" : "Open";
};

const setCeoLoginMode = () => {
  const isNew = !ceoUser;
  document.getElementById("ceoLoginTitle").textContent = isNew ? "Create CEO Account" : "CEO Account Login";
  document.getElementById("ceoLoginSub").textContent = isNew
    ? "One-time setup. Pick a strong password — nobody else can guess it."
    : "Login with your registered mobile number and password.";
  ceoSignupExtra.hidden = !isNew;
  ceoLoginSubmit.textContent = isNew ? "Create Account" : "Login";
  ceoErrName.textContent = "";
  ceoErrMobile.textContent = "";
  ceoErrCode.textContent = "";
  ceoNameInput.classList.remove("invalid");
  ceoMobileInput.classList.remove("invalid");
  ceoCodeInput.classList.remove("invalid");
  ceoLoginForm.reset();
  ceoLogin.hidden = false;
  ceoPanel.hidden = true;
  const hint = document.getElementById("ceoSetupHint");
  if (hint) hint.hidden = true;
};

// SECURITY: shows the one-time steps that activate the CEO account in the
// database. Without the admins row the account is just a normal user.
const showCeoSetupHint = (email) => {
  const hint = document.getElementById("ceoSetupHint");
  if (!hint) return;
  hint.hidden = false;
  hint.innerHTML =
    `<strong>One last step — activate CEO access</strong>` +
    `<p>Your account is created. Now open Supabase &rarr; <b>SQL Editor</b> &rarr; New query &rarr; paste this and Run:</p>` +
    `<code class="ceo-setup-sql">insert into public.admins (user_id, email, role)<br />` +
    `select id, email, 'ceo' from auth.users where email = '${escHtml(email)}'<br />` +
    `on conflict (user_id) do nothing;</code>` +
    `<p>Then close this box and log in. Full steps are in <b>SETUP.md</b>.</p>`;
};

const showCeoPanel = () => {
  ceoLogin.hidden = true;
  ceoPanel.hidden = false;
  const hint = document.getElementById("ceoSetupHint");
  if (hint) hint.hidden = true;
  document.getElementById("ceoPanelName").textContent = ceoUser.name;
  updateCeoStats();
};

const openCeoModal = () => {
  if (ceoLoggedIn && ceoUser) showCeoPanel();
  else setCeoLoginMode();
  ceoModal.classList.add("open");
  ceoModal.setAttribute("aria-hidden", "false");
};

const setCeoSession = (value) => {
  ceoLoggedIn = value;
  ceoMode = value;
  try {
    localStorage.setItem("ceoLoggedIn", JSON.stringify(value));
    localStorage.setItem("ceoMode", value ? "all" : "restricted");
  } catch {}
  applyAccess();
  updateCeoStats();
  if (typeof renderReviews === "function") renderReviews();
};

ceoLoginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!sb) {
    showToast("CEO access requires Supabase. Offline mode cannot securely verify administrator access.", true);
    return;
  }

  if (!ceoUser) {
    // ---------- CREATE the CEO account (first time only) ----------
    const name = ceoNameInput.value.trim();
    const mobile = normMobile(ceoMobileInput.value);
    const code = ceoCodeInput.value.trim();
    let ok = true;
    if (name.length < 3) { ceoErrName.textContent = "Enter your full name (min 3 letters)."; ceoNameInput.classList.add("invalid"); ok = false; }
    else { ceoErrName.textContent = ""; ceoNameInput.classList.remove("invalid"); }
    if (!MOBILE_RE.test(mobile)) { ceoErrMobile.textContent = "Enter a valid number, e.g. 03123456789."; ceoMobileInput.classList.add("invalid"); ok = false; }
    else { ceoErrMobile.textContent = ""; ceoMobileInput.classList.remove("invalid"); }
    if (code.length < 8) { ceoErrCode.textContent = "Choose a strong password (min 8 characters)."; ceoCodeInput.classList.add("invalid"); ok = false; }
    else { ceoErrCode.textContent = ""; ceoCodeInput.classList.remove("invalid"); }
    if (!ok) { showToast("Fix the highlighted fields and try again.", true); return; }

    cloudState("syncing", "Creating…");
    const { data, error } = await sb.auth.signUp({
      email: cloudEmail(mobile),
      password: code,
      options: { data: { name, mobile } }
    });
    if (error) {
      cloudState("error", "Error");
      if (/already registered|already been registered/i.test(error.message || "")) {
        ceoUser = { name, mobile, email: cloudEmail(mobile) };
        store.set("ceoAccount", ceoUser);
        showToast("Account already exists — Login with mobile + password.", true);
        setCeoLoginMode();
      } else {
        showToast(authErrMsg(error), true);
      }
      return;
    }
    if (!data.session) {
      cloudState("error", "Confirm email");
      showToast("Account ban gaya — email confirmation band karein (Authentication → Email → Confirm email OFF), phir login karein.", true);
      setCeoLoginMode();
      return;
    }
    cloudUser = data.user;
    const admin = await isCloudAdmin();
    ceoUser = { name, mobile, email: cloudEmail(mobile) };
    store.set("ceoAccount", ceoUser);
    if (admin) {
      setCeoSession(true);
      showCeoPanel();
      showToast(`CEO account ready — welcome, ${name}!`);
      cloudBusy = false;
      await cloudPushAll();
      cloudState("connected", "Synced ✓");
      await migrateLegacyReviews();
      await loadReviews();
    } else {
      await sb.auth.signOut();
      cloudUser = null;
      cloudState(null, "Not signed in");
      showCeoSetupHint(cloudEmail(mobile));
      showToast("Account created! One step left: activate CEO access (see the box below).");
    }
  } else {
    // ---------- LOGIN ----------
    const mobile = normMobile(ceoMobileInput.value);
    const code = ceoCodeInput.value.trim();
    if (!MOBILE_RE.test(mobile)) {
      ceoErrMobile.textContent = "Enter a valid number, e.g. 03123456789.";
      ceoMobileInput.classList.add("invalid");
      showToast("Login failed — invalid mobile number.", true);
      return;
    }
    if (!code) {
      ceoErrCode.textContent = "Enter your password.";
      ceoCodeInput.classList.add("invalid");
      showToast("Login failed — password required.", true);
      return;
    }
    const blocked = rateMsg("ceo");
    if (blocked) {
      ceoErrCode.textContent = blocked;
      ceoCodeInput.classList.add("invalid");
      showToast(blocked, true);
      return;
    }

    cloudState("syncing", "Signing in…");
    const { data, error } = await sb.auth.signInWithPassword({
      email: cloudEmail(mobile),
      password: code
    });
    if (error) {
      cloudState("error", "Error");
      logAttempt("ceo");
      if (/invalid login credentials/i.test(error.message || "") && ceoUser && mobile !== ceoUser.mobile) {
        ceoErrMobile.textContent = "This number is not registered in cloud.";
        ceoMobileInput.classList.add("invalid");
      } else if (/invalid login credentials/i.test(error.message || "")) {
        ceoErrCode.textContent = "Wrong password.";
        ceoCodeInput.classList.add("invalid");
      }
      showToast(authErrMsg(error), true);
      return;
    }
    cloudUser = data.user;
    const admin = await isCloudAdmin();
    if (!admin) {
      await sb.auth.signOut();
      cloudUser = null;
      cloudState("error", "Not CEO");
      ceoErrCode.textContent = "This account is not registered as the CEO account.";
      ceoCodeInput.classList.add("invalid");
      showToast("Access denied — this account is not the CEO account.", true);
      logAttempt("ceo");
      return;
    }
    clearAttempts("ceo");
    ceoErrMobile.textContent = ""; ceoMobileInput.classList.remove("invalid");
    ceoErrCode.textContent = ""; ceoCodeInput.classList.remove("invalid");
    const meta = data.user.user_metadata || {};
    if (!ceoUser) ceoUser = { name: meta.name || "CEO", mobile: meta.mobile || mobile, email: cloudUser.email || "" };
    ceoUser.email = cloudUser.email || ceoUser.email || "";
    store.set("ceoAccount", ceoUser);
    setCeoSession(true);
    cloudBusy = true;
    const ok = await cloudPull();
    cloudBusy = false;
    restoreOwnerAvatar().then((rec) => { if (rec) publishOwnerAvatar(rec); });
    showCeoPanel();
    showToast(ok ? `Logged in - cloud data synced. Welcome back, ${ceoUser.name}!` : `Logged in - welcome back, ${ceoUser.name}!`);
    await migrateLegacyReviews();
    await loadReviews();
  }
});

document.getElementById("ceoLogout").addEventListener("click", async () => {
  setCeoSession(false);
  if (sb && cloudUser) {
    cloudUser = null;
    cloudPending.clear();
    try { await sb.auth.signOut(); } catch {}
    cloudState(null, "Not signed in");
  }
  setCeoLoginMode();
  showToast("Logged out of the CEO account.");
});

const closeCeoModal = () => {
  ceoModal.classList.remove("open");
  ceoModal.setAttribute("aria-hidden", "true");
};

ceoBtn.addEventListener("click", openCeoModal);
if (userSignupHeaderBtn) {
  userSignupHeaderBtn.addEventListener("click", () => {
    if (typeof openUserModal === "function") {
      openUserModal(currentUser ? "active" : "signup");
    }
  });
}
if (ceoSignupBtn) {
  ceoSignupBtn.addEventListener("click", () => {
    if (typeof openCeoModal === "function") {
      openCeoModal();
      setTimeout(() => {
        if (typeof setCeoLoginMode === "function" && ceoLogin && !ceoUser) {
          setCeoLoginMode();
          ceoLogin.hidden = false;
          ceoPanel.hidden = true;
        }
      }, 60);
    }
  });
}

const heroChooseCategoryBtn = document.getElementById("heroChooseCategoryBtn");
if (heroChooseCategoryBtn) {
  heroChooseCategoryBtn.addEventListener("click", () => {
    const industries = document.getElementById("industries");
    if (industries) {
      industries.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}
document.getElementById("ceoClose").addEventListener("click", closeCeoModal);
ceoModal.addEventListener("click", (e) => { if (e.target === ceoModal) closeCeoModal(); });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && ceoModal.classList.contains("open")) closeCeoModal();
});

function handleRemoveCard(card) {
  const key = card.dataset.detail;
  if (!key) return;
  const name = card.querySelector("h3").textContent;

  const custom = customCats.find((c) => c.key === key);
  if (!custom) {
    showToast(`"${name}" is a core category and cannot be removed.`, true);
    return;
  }
  if (!confirm(`Remove "${name}" category?`)) return;

  customCats = customCats.filter((c) => c.key !== key);
  store.set("customCats", customCats);

  document.getElementById(`${key}Detail`)?.remove();
  card.remove();
  closeFeaturePanel();
  updateCeoStats();
  showToast(`"${name}" removed.`);
}

const { BUILTIN_CATEGORIES, FEATURE_VERSION, slugify, GENERIC_FEATURES, FEATURE_REGISTRY } = window.OMS_FEATURE_MODULES;

const collectionKey = (catKey) =>
  BUILTIN_CATEGORIES.includes(catKey) ? `${catKey}:data` : `custom_${catKey}:data`;

const newEntryId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const readCollection = (catKey) => {
  const key = collectionKey(catKey);
  const data = store.get(key, null);
  if (data && typeof data === "object" && data.v === FEATURE_VERSION && data.features && typeof data.features === "object") return data;
  const col = data && typeof data === "object" && data.features && typeof data.features === "object"
    ? Object.assign({}, data, { v: FEATURE_VERSION })
    : { v: FEATURE_VERSION, features: {} };
  store.set(key, col);
  return col;
};

const getFeatureItems = (catKey, featureId) => {
  const items = readCollection(catKey).features[featureId];
  return Array.isArray(items) ? items : [];
};

const setFeatureItems = (catKey, featureId, items) => {
  const col = readCollection(catKey);
  col.features[featureId] = items;
  col.updated = Date.now();
  store.set(collectionKey(catKey), col);
};

const getFeatureDef = (catKey, featureId, card) => {
  const reg = FEATURE_REGISTRY[catKey];
  const def = (reg && reg[featureId]) || GENERIC_FEATURES.find((f) => f.id === featureId) || null;
  const h4 = card ? card.querySelector("h4") : null;
  const iconEl = card ? card.querySelector(".detail-card-icon") : null;
  return {
    id: featureId,
    name: (def && def.name) || (h4 ? h4.textContent.trim() : featureId),
    icon: (def && def.icon) || (iconEl ? iconEl.textContent.trim() : "📁"),
    fields: (def && def.fields) || GENERIC_FEATURES[0].fields
  };
};

const featureModal = document.getElementById("featureModal");
const featurePanel = document.getElementById("featurePanel");
let featureCtx = null;

const closeFeaturePanel = () => {
  featureModal.classList.remove("open");
  featureModal.setAttribute("aria-hidden", "true");
  featurePanel.innerHTML = "";
  featureCtx = null;
};

const openFeaturePanel = (catKey, featureId, itemId, card) => {
  if (!ceoMode && owner && !ownerAllowedCats(owner).includes(catKey)) {
    showToast(`Access denied — your owner account does not have ${labelFor(catKey)} access.`, true);
    return;
  }
  featureCtx = { catKey, featureId, def: getFeatureDef(catKey, featureId, card) };
  featureModal.classList.add("open");
  featureModal.setAttribute("aria-hidden", "false");
  if (itemId) renderFeatureForm(itemId);
  else renderFeatureList();
};

const renderFeatureList = () => {
  if (!featureCtx) return;
  const { catKey, def } = featureCtx;
  const items = getFeatureItems(catKey, def.id);
  const fields = def.fields;

  let body;
  if (!items.length) {
    body = `<div class="f-empty">No entries yet in <strong>${escHtml(def.name)}</strong>. Click <strong>Add New</strong> to create the first one.</div>`;
  } else {
    const head = fields.map((f) => `<th>${escHtml(f.label)}</th>`).join("");
    const rows = items.map((it) => {
      const tds = fields.map((f) => `<td>${escHtml(String((it[f.key] ?? (it.fields && it.fields[f.key])) ?? "")) || "<span class='f-muted'>—</span>"}</td>`).join("");
      return `<tr>${tds}<td class="f-act-cell"><div class="f-actions">
        <button type="button" class="f-btn edit" data-f-edit="${escHtml(it.id)}">Edit</button>
        <button type="button" class="f-btn del" data-f-del="${escHtml(it.id)}">Delete</button>
      </div></td></tr>`;
    }).join("");
    body = `<div class="f-table-wrap"><table class="f-table"><thead><tr>${head}<th class="f-act-cell">Actions</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  featurePanel.innerHTML =
    `<button type="button" class="modal-close" data-f-close aria-label="Close">&times;</button>` +
    `<div class="feature-head">` +
    `<div class="feature-title"><span class="feature-icon">${def.icon}</span>` +
    `<div><h3>${escHtml(def.name)}</h3><p class="feature-sub">${escHtml(labelFor(catKey) || catKey)} · ${items.length} ${items.length === 1 ? "entry" : "entries"}</p></div></div>` +
    `<button type="button" class="btn btn-primary" data-f-add>+ Add New</button></div>` +
    body;
};

const renderFeatureForm = (itemId) => {
  if (!featureCtx) return;
  const { catKey, def } = featureCtx;
  const items = getFeatureItems(catKey, def.id);
  const item = itemId ? items.find((i) => i.id === itemId) : null;
  const isEdit = !!item;

  const inputs = def.fields.map((f) => {
    const val = item ? ((item[f.key] ?? (item.fields && item.fields[f.key])) ?? "") : "";
    let control;
    if (f.type === "select") {
      control = `<select name="${f.key}"${f.required ? " data-required" : ""}>
        <option value="">— Select —</option>
        ${(f.options || []).map((o) => `<option value="${escHtml(o)}"${String(val) === o ? " selected" : ""}>${escHtml(o)}</option>`).join("")}
      </select>`;
    } else if (f.type === "textarea") {
      control = `<textarea name="${f.key}" rows="3" placeholder="Enter ${escHtml(f.label.toLowerCase())}"${f.required ? " data-required" : ""}>${escHtml(String(val))}</textarea>`;
    } else {
      control = `<input type="${f.type}" name="${f.key}" value="${escHtml(String(val))}" placeholder="Enter ${escHtml(f.label.toLowerCase())}"${f.required ? " data-required" : ""} />`;
    }
    return `<div class="field"><label>${escHtml(f.label)}${f.required ? ' <span class="req-star">*</span>' : ""}</label>${control}<span class="field-error" data-err="${f.key}"></span></div>`;
  }).join("");

  featurePanel.innerHTML =
    `<button type="button" class="modal-close" data-f-close aria-label="Close">&times;</button>` +
    `<div class="feature-head">` +
    `<div class="feature-title"><span class="feature-icon">${def.icon}</span>` +
    `<div><h3>${isEdit ? "Edit Entry" : "Add New Entry"}</h3><p class="feature-sub">${escHtml(def.name)} · ${escHtml(labelFor(catKey) || catKey)}</p></div></div>` +
    `<button type="button" class="btn btn-outline" data-f-back>&larr; Back</button></div>` +
    `<form id="featureForm" novalidate><div class="f-form-grid">${inputs}</div>` +
    `<div class="f-form-actions">` +
    `<button type="button" class="btn btn-outline" data-f-back>Cancel</button>` +
    `<button type="submit" class="btn btn-primary">${isEdit ? "Save Changes" : "Save Entry"}</button>` +
    `</div></form>`;

  featurePanel.querySelector("#featureForm").addEventListener("submit", (e) => {
    e.preventDefault();
    saveFeatureForm(itemId);
  });
};

const saveFeatureForm = (itemId) => {
  if (!featureCtx) return;
  const { catKey, def } = featureCtx;
  const form = featurePanel.querySelector("#featureForm");
  const data = {};
  let ok = true;

  def.fields.forEach((f) => {
    const el = form.elements.namedItem(f.key);
    if (!el) return;
    const value = String(el.value ?? "").trim();
    const errEl = featurePanel.querySelector(`[data-err="${f.key}"]`);
    const fail = (msg) => {
      ok = false;
      el.classList.add("invalid");
      if (errEl) errEl.textContent = msg;
    };
    if (f.required && !value) { fail(`${f.label} is required.`); return; }
    if (f.type === "number" && value && isNaN(Number(value))) { fail(`${f.label} must be a number.`); return; }
    el.classList.remove("invalid");
    if (errEl) errEl.textContent = "";
    data[f.key] = value;
  });

  if (!ok) { showToast("Please fix the highlighted fields.", true); return; }

  const items = getFeatureItems(catKey, def.id);
  const stamp = new Date().toISOString();

  if (itemId) {
    const idx = items.findIndex((i) => i.id === itemId);
    if (idx === -1) {
      items.push(Object.assign({ id: newEntryId() }, data, { createdAt: stamp }));
      setFeatureItems(catKey, def.id, items);
      updateFeatureBadges();
      showToast(`${def.name} entry added.`);
      renderFeatureList();
      return;
    }
    items[idx] = Object.assign({}, items[idx], data, { updatedAt: stamp });
    showToast(`${def.name} entry updated.`);
  } else {
    items.push(Object.assign({ id: newEntryId() }, data, { createdAt: stamp }));
    showToast(`${def.name} entry added.`);
  }

  setFeatureItems(catKey, def.id, items);
  updateFeatureBadges();
  renderFeatureList();
};

const deleteFeatureItem = (itemId) => {
  if (!featureCtx) return;
  const { catKey, def } = featureCtx;
  const items = getFeatureItems(catKey, def.id);
  const entry = items.find((i) => i.id === itemId);
  if (!entry) return;
  const label = entry[def.fields[0].key] || (entry.fields && entry.fields[def.fields[0].key]) || "this entry";
  if (!confirm(`Delete "${label}"?`)) return;
  setFeatureItems(catKey, def.id, items.filter((i) => i.id !== itemId));
  updateFeatureBadges();
  renderFeatureList();
  showToast(`${def.name} entry deleted.`);
};

// ===== Feature badges: show entry count on every detail-card =====
const updateFeatureBadges = () => {
  document.querySelectorAll(".category-detail .detail-card[data-feature]").forEach((card) => {
    const catKey = card.dataset.category || card.closest(".category-detail").id.replace(/Detail$/, "");
    const count = getFeatureItems(catKey, card.dataset.feature).length;
    let badge = card.querySelector(".f-count");
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "f-count";
      card.appendChild(badge);
    }
    badge.textContent = count;
    badge.hidden = count === 0;
  });
};

// ===== All Data sheet: per-category Excel-like view of every saved entry =====
const dataModal = document.getElementById("dataModal");
const dataPanel = document.getElementById("dataPanel");
let sheetCatKey = null;

const closeDataBrowser = () => {
  dataModal.classList.remove("open");
  dataModal.setAttribute("aria-hidden", "true");
  dataPanel.innerHTML = "";
  sheetCatKey = null;
};

const exportSheetCsv = (catKey) => {
  const col = readCollection(catKey);
  const featureIds = Object.keys(col.features).filter((fid) => Array.isArray(col.features[fid]) && col.features[fid].length);
  if (!featureIds.length) { showToast("Nothing to export yet.", true); return; }
  const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [];
  featureIds.forEach((fid) => {
    const def = getFeatureDef(catKey, fid, null);
    lines.push([def.name].map(q).join(","));
    lines.push(def.fields.map((f) => q(f.label)).join(","));
    col.features[fid].forEach((it) => {
      lines.push(def.fields.map((f) => q((it[f.key] ?? (it.fields && it.fields[f.key])) ?? "")).join(","));
    });
    lines.push("");
  });
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  const catCard = document.querySelector(`.industry-card[data-detail="${CSS.escape(catKey)}"]`);
  const catName = catCard ? catCard.querySelector("h3").textContent.trim() : catKey;
  a.href = URL.createObjectURL(blob);
  a.download = `${slugify(catName) || catKey}-data-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast("CSV downloaded — opens in Excel like a sheet.");
};

const renderDataBrowser = (catKey) => {
  sheetCatKey = catKey;
  const col = readCollection(catKey);
  const featureIds = Object.keys(col.features).filter((fid) => Array.isArray(col.features[fid]) && col.features[fid].length);
  const total = featureIds.reduce((s, fid) => s + col.features[fid].length, 0);
  const catCard = document.querySelector(`.industry-card[data-detail="${CSS.escape(catKey)}"]`);
  const catName = catCard ? catCard.querySelector("h3").textContent.trim() : catKey;
  const catIcon = catCard ? catCard.querySelector(".industry-icon").textContent.trim() : "📁";

  const sections = featureIds.map((fid) => {
    const def = getFeatureDef(catKey, fid, null);
    const entries = col.features[fid];
    const head = def.fields.map((f) => `<th>${escHtml(f.label)}</th>`).join("");
    const rows = entries.map((it) => {
      const tds = def.fields.map((f) => `<td>${escHtml(String((it[f.key] ?? (it.fields && it.fields[f.key])) ?? "")) || "<span class='f-muted'>—</span>"}</td>`).join("");
      const hay = (def.name + " " + Object.values(it).join(" ")).toLowerCase();
      return `<tr data-sheet-row data-search="${escHtml(hay)}">${tds}<td class="f-act-cell"><div class="f-actions">` +
        `<button type="button" class="f-btn edit" data-s-edit="${escHtml(fid)}" data-s-id="${escHtml(it.id)}">Edit</button>` +
        `<button type="button" class="f-btn del" data-s-del="${escHtml(fid)}" data-s-id="${escHtml(it.id)}">Delete</button>` +
        `</div></td></tr>`;
    }).join("");
    return `<div class="sheet-section" data-sheet-section data-search-sec="${escHtml((def.name + " " + entries.map((it) => Object.values(it).join(" ")).join(" ")).toLowerCase())}">` +
      `<div class="sheet-sec-head"><span class="sheet-sec-icon">${def.icon}</span><h4>${escHtml(def.name)}</h4>` +
      `<span class="data-cat-total">${entries.length} ${entries.length === 1 ? "entry" : "entries"}</span></div>` +
      `<div class="f-table-wrap"><table class="f-table sheet-table"><thead><tr>${head}<th class="f-act-cell">Actions</th></tr></thead>` +
      `<tbody>${rows}</tbody></table></div></div>`;
  }).join("");

  dataPanel.innerHTML =
    `<button type="button" class="modal-close" data-d-close aria-label="Close">&times;</button>` +
    `<div class="feature-head">` +
    `<div class="feature-title"><span class="feature-icon">${catIcon}</span>` +
    `<div><h3>${escHtml(catName)} — All Data</h3><p class="feature-sub">${total} saved ${total === 1 ? "entry" : "entries"} in ${featureIds.length} ${featureIds.length === 1 ? "section" : "sections"} · sheet view</p></div></div>` +
    `<div class="data-head-actions">` +
    `<button type="button" class="btn btn-outline" data-d-export>⬇ Export CSV</button></div></div>` +
    `<div class="data-search"><input type="search" id="dataSearch" placeholder="Search ${escHtml(catName)} data — name, amount, date…" /></div>` +
    (sections || `<div class="f-empty">No saved data in <strong>${escHtml(catName)}</strong> yet. Click any feature card and press <strong>+ Add New</strong> — entries appear here.</div>`);

  dataModal.classList.add("open");
  dataModal.setAttribute("aria-hidden", "false");
};

const filterDataBrowser = (q) => {
  const query = q.trim().toLowerCase();
  dataPanel.querySelectorAll("[data-sheet-section]").forEach((sec) => {
    let visible = 0;
    sec.querySelectorAll("[data-sheet-row]").forEach((row) => {
      const match = !query || (row.dataset.search || row.textContent).toLowerCase().includes(query);
      row.hidden = !match;
      if (match) visible++;
    });
    sec.hidden = visible === 0;
  });
  const any = [...dataPanel.querySelectorAll("[data-sheet-section]")].some((s) => !s.hidden);
  let empty = dataPanel.querySelector(".data-no-match");
  if (!any && query) {
    if (!empty) {
      empty = document.createElement("div");
      empty.className = "f-empty data-no-match";
      empty.textContent = `No entries match “${q}”.`;
      dataPanel.appendChild(empty);
    }
  } else if (empty) empty.remove();
};

const deleteSheetItem = (fid, itemId) => {
  if (!sheetCatKey) return;
  const def = getFeatureDef(sheetCatKey, fid, null);
  const items = getFeatureItems(sheetCatKey, fid);
  const entry = items.find((i) => i.id === itemId);
  if (!entry) return;
  const label = entry[def.fields[0].key] || (entry.fields && entry.fields[def.fields[0].key]) || "this entry";
  if (!confirm(`Delete "${label}"?`)) return;
  setFeatureItems(sheetCatKey, fid, items.filter((i) => i.id !== itemId));
  updateFeatureBadges();
  renderDataBrowser(sheetCatKey);
  showToast(`${def.name} entry deleted.`);
};

dataModal.addEventListener("click", (e) => {
  if (e.target === dataModal || e.target.closest("[data-d-close]")) { closeDataBrowser(); return; }
  if (e.target.closest("[data-d-export]")) { if (sheetCatKey) exportSheetCsv(sheetCatKey); return; }
  const editBtn = e.target.closest("[data-s-edit]");
  if (editBtn && sheetCatKey) {
    const fid = editBtn.getAttribute("data-s-edit");
    const id = editBtn.getAttribute("data-s-id");
    const catKey = sheetCatKey;
    const card = document.querySelector(`.category-detail .detail-card[data-category="${CSS.escape(catKey)}"][data-feature="${CSS.escape(fid)}"]`);
    closeDataBrowser();
    openFeaturePanel(catKey, fid, id, card);
    return;
  }
  const delBtn = e.target.closest("[data-s-del]");
  if (delBtn) { deleteSheetItem(delBtn.getAttribute("data-s-del"), delBtn.getAttribute("data-s-id")); }
});

dataPanel.addEventListener("input", (e) => {
  if (e.target.id === "dataSearch") filterDataBrowser(e.target.value);
});

const addSheetButton = (detail, catKey) => {
  if (!detail) return;
  const header = detail.querySelector(".detail-header");
  if (!header) return;
  if (!header.querySelector(".detail-data-btn")) {
    const dbtn = document.createElement("button");
    dbtn.type = "button";
    dbtn.className = "btn btn-outline detail-data-btn";
    dbtn.textContent = "📑 All Data Sheet";
    dbtn.title = "View all entries in Excel-style sheet";
    dbtn.addEventListener("click", (e) => {
      e.stopPropagation();
      renderDataBrowser(catKey);
    });
    header.appendChild(dbtn);
  }
  if (!header.querySelector(".detail-admin-btn")) {
    const abtn = document.createElement("button");
    abtn.type = "button";
    abtn.className = "btn btn-primary detail-admin-btn";
    abtn.textContent = `📊 ${labelFor(catKey)} Admin Panel`;
    abtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openCategoryAdmin(catKey);
    });
    header.appendChild(abtn);
  }
};

document.addEventListener("click", (e) => {
  const card = e.target.closest(".category-detail .detail-card");
  if (!card) return;
  const detail = card.closest(".category-detail");
  const catKey = card.dataset.category || (detail ? detail.id.replace(/Detail$/, "") : "");
  const h4 = card.querySelector("h4");
  const featureId = card.dataset.feature || slugify(h4 ? h4.textContent : "");
  if (!catKey || !featureId) return;
  openFeaturePanel(catKey, featureId, null, card);
});

featureModal.addEventListener("click", (e) => {
  if (e.target === featureModal) { closeFeaturePanel(); return; }
  if (e.target.closest("[data-f-close]")) { closeFeaturePanel(); return; }
  if (e.target.closest("[data-f-back]")) { renderFeatureList(); return; }
  if (e.target.closest("[data-f-add]")) { renderFeatureForm(null); return; }
  const editBtn = e.target.closest("[data-f-edit]");
  if (editBtn) { renderFeatureForm(editBtn.getAttribute("data-f-edit")); return; }
  const delBtn = e.target.closest("[data-f-del]");
  if (delBtn) { deleteFeatureItem(delBtn.getAttribute("data-f-del")); }
});

featurePanel.addEventListener("input", (e) => {
  const el = e.target;
  if (!el.name) return;
  el.classList.remove("invalid");
  const errEl = featurePanel.querySelector(`[data-err="${el.name}"]`);
  if (errEl) errEl.textContent = "";
});

const initFeatureModules = () => {
  document.querySelectorAll(".category-detail").forEach((detail) => {
    const catKey = detail.id.replace(/Detail$/, "");
    detail.querySelectorAll(".detail-card").forEach((card) => {
      if (!card.dataset.category) card.dataset.category = catKey;
      if (!card.dataset.feature) {
        const h4 = card.querySelector("h4");
        if (h4) card.dataset.feature = slugify(h4.textContent);
      }
    });
    addSheetButton(detail, catKey);
  });
  BUILTIN_CATEGORIES.concat(customCats.map((c) => c.key)).forEach(readCollection);
};

// ===== Super Admin Panel (CEO only) — professional full-control console =====
// All 8 categories always stay in the system. Categories are NEVER removable
// from here; CEO only controls per-owner access (grant/revoke) and views data.
const adminModal = document.getElementById("adminModal");
const adminPanel = document.getElementById("adminPanel");
let adminTab = "overview";
let adminDataCat = "all";

const allCategoryKeys = () =>
  [...document.querySelectorAll(".industry-card[data-detail]")].map((c) => c.dataset.detail);

const catMeta = (key) => {
  const card = document.querySelector(`.industry-card[data-detail="${CSS.escape(key)}"]`);
  return {
    key,
    name: card ? card.querySelector("h3").textContent.trim() : key,
    icon: card ? card.querySelector(".industry-icon").textContent.trim() : "📁",
    subtitle: card && card.querySelector("p") ? card.querySelector("p").textContent.trim() : ""
  };
};

const categoryUsage = (key) => {
  const col = store.get(collectionKey(key), null);
  let entries = 0, features = 0;
  if (col && col.features && typeof col.features === "object") {
    Object.values(col.features).forEach((arr) => {
      if (Array.isArray(arr) && arr.length) { features++; entries += arr.length; }
    });
  }
  return { entries, features };
};

const adminAllOwners = () => cloudOwnerProfiles || store.get("owners", []);
const loadCloudOwnerProfiles = async () => {
  if (!sb || !cloudUser || !ceoLoggedIn) throw new Error("CEO cloud session is required to load owner profiles.");
  const { data, error } = await sb.from("owner_profiles")
    .select("user_id,full_name,mobile,age,city,categories")
    .order("created_at", { ascending: false });
  if (error) throw error;
  cloudOwnerProfiles = data.map((profile) => ({
    id: profile.user_id,
    name: profile.full_name,
    mobile: profile.mobile,
    age: profile.age,
    city: profile.city,
    categories: profile.categories,
    role: "Owner"
  }));
  updateCeoStats();
  return cloudOwnerProfiles;
};
const adminOwnerList = () => {
  const owners = adminAllOwners();
  const legacy = owner && !owners.some((o) => o.mobile === owner.mobile) ? owner : null;
  return legacy ? [legacy, ...owners] : owners;
};
const fmtDate = (v) => {
  const d = v ? new Date(v) : null;
  if (!d || isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};

const closeAdminPanel = () => {
  adminModal.classList.remove("open");
  adminModal.setAttribute("aria-hidden", "true");
  adminPanel.innerHTML = "";
};

const openAdminPanel = () => {
  if (!ceoLoggedIn || !ceoUser) { showToast("Super Admin access requires CEO login.", true); return; }
  adminTab = "overview";
  adminDataCat = "all";
  renderAdminPanel();
  adminModal.classList.add("open");
  adminModal.setAttribute("aria-hidden", "false");
  loadCloudOwnerProfiles().then(renderAdminPanel).catch((error) => {
    showToast(`Owner profiles could not be loaded: ${error.message || "Cloud service error."}`, true);
  });
};

const adminTabsHtml = () => {
  const tabs = [
    ["overview", "📊 Overview"],
    ["subscriptions", "💳 Subscriptions"],
    ["data", "🗂️ Business Data"],
    ["owners", "👥 Owners & Access"],
    ["categories", "🏷️ Categories"],
    ["reports", "📈 Reports"],
    ["settings", "⚙️ Settings"]
  ];
  return `<div class="admin-tabs">` + tabs.map(([id, label]) =>
    `<button type="button" class="admin-tab${adminTab === id ? " active" : ""}" data-admin-tab="${id}">${label}</button>`
  ).join("") + `</div>`;
};

const renderAdminSubscriptions = () =>
  adminTabsHtml() +
  `<div class="admin-section-title">💳 Category subscription payments</div>` +
  `<p class="admin-hint">Open the JazzCash app and verify the sender, amount and transaction reference in your received payments before approving. Approval activates only the category and duration on that request.</p>` +
  `<div id="adminSubscriptionRequestList"><div class="admin-empty">Loading payment requests…</div></div>`;

const loadAdminSubscriptionRequests = async () => {
  const list = document.getElementById("adminSubscriptionRequestList");
  if (!list || !sb || !cloudUser) return;
  const { data, error } = await sb.from("subscription_requests")
    .select("id,user_id,category,plan,amount,account_name,account_mobile,payment_reference,payer_mobile,status,admin_note,created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    list.innerHTML = `<div class="admin-note">Could not load subscription requests: ${escHtml(error.message)}. Confirm that the subscription SQL setup has been applied.</div>`;
    return;
  }
  if (!data || !data.length) {
    list.innerHTML = `<div class="admin-empty">No subscription payment requests yet.</div>`;
    return;
  }
  const categoryNames = Object.fromEntries(BUILTIN_CATEGORIES.map((key) => [key, catMeta(key)]));
  list.innerHTML = data.map((request) => {
    const meta = categoryNames[request.category] || { icon: "📁", name: request.category };
    const plan = CATEGORY_PLAN_INFO[request.plan] || { label: request.plan };
    return `<article class="admin-subscription-request">` +
      `<div class="admin-subscription-request-head"><div><strong>${escHtml(meta.icon)} ${escHtml(meta.name)} · ${escHtml(plan.label)}</strong>` +
      `<span>${escHtml(request.account_name)} · account ${escHtml(request.account_mobile)}</span></div>` +
      `<span class="admin-pill ${request.status === "approved" ? "ok" : request.status === "rejected" ? "off" : ""}">${escHtml(request.status)}</span></div>` +
      `<div class="admin-subscription-request-details"><span><b>Amount</b> PKR ${rupees(request.amount)}</span>` +
      `<span><b>JazzCash sender</b> ${escHtml(request.payer_mobile)}</span>` +
      `<span><b>Transaction ID</b> ${escHtml(request.payment_reference)}</span>` +
      `<span><b>Submitted</b> ${fmtDate(request.created_at)}</span></div>` +
      (request.admin_note ? `<p class="admin-hint">Admin note: ${escHtml(request.admin_note)}</p>` : "") +
      (request.status === "pending" ? `<div class="admin-subscription-actions">` +
        `<button type="button" class="btn btn-primary" data-subscription-approve="${escHtml(request.id)}">Verify &amp; approve</button>` +
        `<button type="button" class="btn btn-outline" data-subscription-reject="${escHtml(request.id)}">Reject</button></div>` : "") +
      `</article>`;
  }).join("");
};

const CATEGORY_PLAN_INFO = {
  "1-month": { label: "1 Month" },
  "3-month": { label: "3 Months" },
  "6-month": { label: "6 Months" }
};

const reviewSubscriptionRequest = async (requestId, approve) => {
  if (!sb || !cloudUser || !await isCloudAdmin()) {
    showToast("Only the authenticated site CEO can review subscription payments.", true);
    return;
  }
  const rejectNote = approve ? null : window.prompt("Optional reason for rejecting this payment request:");
  if (!approve && rejectNote === null) return;
  const result = approve
    ? await sb.rpc("admin_approve_subscription_request", { p_request_id: requestId })
    : await sb.rpc("admin_reject_subscription_request", { p_request_id: requestId, p_note: rejectNote });
  if (result.error) {
    showToast(`Subscription request could not be ${approve ? "approved" : "rejected"}: ${result.error.message}`, true);
    return;
  }
  showToast(approve ? "Payment approved. Category access is now active." : "Payment request rejected.");
  await loadAdminSubscriptionRequests();
};

const renderAdminOverview = () => {
  const keys = allCategoryKeys();
  let totalEntries = 0, totalFeatures = 0;
  const perCat = keys.map((k) => { const u = categoryUsage(k); totalEntries += u.entries; totalFeatures += u.features; return { ...catMeta(k), ...u }; });
  const owners = adminOwnerList();
  const custom = customCats.length;
  const emptyCats = perCat.filter((c) => c.entries === 0).length;
  const accessGrants = owners.reduce((n, o) => n + (Array.isArray(o.categories) ? o.categories.length : (o.category ? 1 : 0)), 0);

  const cards = perCat.map((c) =>
    `<div class="admin-cat-row">` +
    `<div class="admin-cat-row-left"><span class="admin-cat-row-icon">${c.icon}</span>` +
    `<div><div class="admin-cat-row-name">${escHtml(c.name)}</div>` +
    `<div class="admin-cat-row-meta">${c.features} features used · ${c.entries} entries</div></div></div>` +
    `<button type="button" class="admin-ghost-btn" data-admin-view="${escHtml(c.key)}">View Data</button></div>`
  ).join("");

  const recent = [];
  keys.forEach((k) => {
    const col = store.get(collectionKey(k), null);
    if (!col || !col.features) return;
    Object.keys(col.features).forEach((fid) => {
      const def = getFeatureDef(k, fid, null);
      (col.features[fid] || []).forEach((it) => {
        const f = it && it.fields && typeof it.fields === "object" ? { ...it, ...it.fields } : (it || {});
        const labelKey = Object.keys(f).find((kk) =>
          kk !== "id" && kk !== "createdAt" && kk !== "updatedAt" &&
          /name|title|patient|customer|client|student|dish|item|product|medicine|service|course|doctor|supplier|attendant|stylist/i.test(kk)
        );
        const name = labelKey && f[labelKey] ? String(f[labelKey]) : (def ? def.name : "(entry)");
        recent.push({ cat: catMeta(k), fid, name, at: it && (it.updatedAt || it.createdAt) });
      });
    });
  });
  recent.sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
  const recentRows = recent.slice(0, 6).map((r) =>
    `<div class="admin-recent-row"><span class="admin-recent-icon">${r.cat.icon}</span>` +
    `<span class="admin-recent-name">${escHtml(String(r.name))}</span>` +
    `<span class="admin-recent-cat">${escHtml(r.cat.name)}</span>` +
    `<span class="admin-recent-date">${fmtDate(r.at)}</span></div>`
  ).join("");

  return adminTabsHtml() +
    `<div class="admin-stat-grid">` +
    `<div class="admin-stat"><div class="admin-stat-num">${keys.length}</div><div class="admin-stat-lbl">Categories</div></div>` +
    `<div class="admin-stat"><div class="admin-stat-num">${totalEntries}</div><div class="admin-stat-lbl">Total Entries</div></div>` +
    `<div class="admin-stat"><div class="admin-stat-num">${totalFeatures}</div><div class="admin-stat-lbl">Active Features</div></div>` +
    `<div class="admin-stat"><div class="admin-stat-num">${owners.length}</div><div class="admin-stat-lbl">Owner Accounts</div></div>` +
    `<div class="admin-stat"><div class="admin-stat-num">${accessGrants}</div><div class="admin-stat-lbl">Access Grants</div></div>` +
    `<div class="admin-stat"><div class="admin-stat-num">${custom}</div><div class="admin-stat-lbl">Custom Categories</div></div>` +
    `</div>` +
    (emptyCats ? `<div class="admin-note">${emptyCats} ${emptyCats === 1 ? "category has" : "categories have"} no saved entries yet.</div>` : "") +
    `<div class="admin-section-title">📁 Category-wise data</div>` +
    (cards || `<div class="admin-empty">No categories available.</div>`) +
    (recentRows ? `<div class="admin-section-title">🕒 Recent activity</div><div class="admin-recent">${recentRows}</div>` : "");
};

const renderAdminData = () => {
  const keys = allCategoryKeys();
  const filterHtml =
    `<div class="admin-filter-bar">` +
    `<button type="button" class="admin-filter${adminDataCat === "all" ? " active" : ""}" data-admin-filter="all">All Categories</button>` +
    keys.map((k) => { const m = catMeta(k); return `<button type="button" class="admin-filter${adminDataCat === k ? " active" : ""}" data-admin-filter="${escHtml(k)}">${m.icon} ${escHtml(m.name)}</button>`; }).join("") +
    `</div>`;

  const useKeys = adminDataCat === "all" ? keys : [adminDataCat];
  const blocks = useKeys.map((key) => {
    const meta = catMeta(key);
    const col = store.get(collectionKey(key), null);
    const featureIds = col && col.features ? Object.keys(col.features).filter((fid) => Array.isArray(col.features[fid]) && col.features[fid].length) : [];
    if (!featureIds.length) return "";
    const sections = featureIds.map((fid) => {
      const def = getFeatureDef(key, fid, null);
      const entries = col.features[fid];
      const head = def.fields.map((f) => `<th>${escHtml(f.label)}</th>`).join("");
      const rows = entries.map((it) => {
        const tds = def.fields.map((f) => `<td>${escHtml(String((it[f.key] ?? (it.fields && it.fields[f.key])) ?? "")) || "<span class='f-muted'>—</span>"}</td>`).join("");
        return `<tr>${tds}</tr>`;
      }).join("");
      return `<div class="sheet-section"><div class="sheet-sec-head"><span class="sheet-sec-icon">${def.icon}</span>` +
        `<h4>${escHtml(def.name)}</h4><span class="data-cat-total">${entries.length}</span></div>` +
        `<div class="f-table-wrap"><table class="f-table sheet-table"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div></div>`;
    }).join("");
    return `<div class="admin-section-title">${meta.icon} ${escHtml(meta.name)}</div>` + sections;
  }).join("");

  return adminTabsHtml() +
    `<div class="admin-section-title">🗂️ All business data (read-only admin view)</div>` +
    filterHtml +
    (blocks || `<div class="admin-empty">No data saved yet for this selection.</div>`);
};

const renderAdminOwners = () => {
  const list = adminOwnerList();
  const keys = allCategoryKeys();

  const cards = list.map((o) => {
    const allowed = ownerAllowedCats(o);
    const chips = keys.map((k) => {
      const meta = catMeta(k);
      const on = allowed.includes(k);
      return `<button type="button" class="admin-cat-chip${on ? " on" : ""}" data-owner-user="${escHtml(o.id || "")}" data-owner-cat="${escHtml(k)}" aria-pressed="${on}"${o.id ? "" : " disabled"}>${meta.icon} ${escHtml(meta.name)}</button>`;
    }).join("");
    const role = o.role ? escHtml(String(o.role)) : "Owner";
    return `<div class="admin-owner-card">` +
      `<div class="admin-owner-head">` +
      `<div class="admin-owner-id"><span class="admin-owner-avatar">${escHtml((o.name || "?").trim().charAt(0).toUpperCase())}</span>` +
      `<div><div class="admin-owner-name">${escHtml(o.name)} <span class="admin-role-badge">${role}</span></div>` +
      `<div class="admin-owner-meta">${escHtml(o.mobile)}${o.city ? " · " + escHtml(o.city) : ""}${o.age ? " · age " + escHtml(String(o.age)) : ""}</div></div></div>` +
      `<div class="admin-owner-actions">` +
      `<span class="admin-owner-count">${allowed.length}/${keys.length} access</span>` +
      `<button type="button" class="admin-danger-btn" data-owner-remove="${escHtml(o.id || "")}"${o.id ? "" : " disabled"}>Remove profile</button></div></div>` +
      `<div class="admin-cat-list">${chips}</div></div>`;
  }).join("");

  return adminTabsHtml() +
    `<div class="admin-section-title">👥 Owner accounts & category access</div>` +
    `<p class="admin-hint">Tap a category chip to grant or revoke that owner's access. Green = allowed. All 8 categories always remain available in the system.</p>` +
    (cards || `<div class="admin-empty">No owner accounts registered yet.</div>`);
};

const renderAdminCategories = () => {
  const keys = allCategoryKeys();
  const rows = keys.map((k) => {
    const meta = catMeta(k);
    const isCustom = !!customCats.find((c) => c.key === k);
    const u = categoryUsage(k);
    const ownersWith = adminOwnerList().filter((o) => ownerAllowedCats(o).includes(k)).length;
    return `<div class="admin-cat-row">` +
      `<div class="admin-cat-row-left"><span class="admin-cat-row-icon">${meta.icon}</span>` +
      `<div><div class="admin-cat-row-name">${escHtml(meta.name)} ${isCustom ? '<span class="admin-cat-badge">custom</span>' : ""}</div>` +
      `<div class="admin-cat-row-meta">${u.entries} entries · ${ownersWith} owner${ownersWith === 1 ? "" : "s"} with access</div></div></div>` +
      `<span class="admin-locked-tag">🔒 Always active</span></div>`;
  }).join("");
  return adminTabsHtml() +
    `<div class="admin-section-title">🏷️ Categories</div>` +
    `<p class="admin-hint">Every category is permanently part of the system and cannot be removed here. Use <strong>Owners &amp; Access</strong> to decide who can open each one.</p>` +
    (rows || `<div class="admin-empty">No categories available.</div>`);
};

const renderAdminReports = () => {
  const keys = allCategoryKeys();
  const rows = keys.map((k) => {
    const meta = catMeta(k);
    const u = categoryUsage(k);
    const ownersWith = adminOwnerList().filter((o) => ownerAllowedCats(o).includes(k)).length;
    const col = store.get(collectionKey(k), null);
    let last = null;
    if (col && col.features) {
      Object.values(col.features).forEach((arr) => (arr || []).forEach((it) => {
        const at = it && (it.updatedAt || it.createdAt);
        if (at && (!last || new Date(at) > new Date(last))) last = at;
      }));
    }
    return `<tr>` +
      `<td><span class="admin-recent-icon">${meta.icon}</span> ${escHtml(meta.name)}</td>` +
      `<td>${u.features}</td><td>${u.entries}</td><td>${ownersWith}</td><td>${fmtDate(last)}</td></tr>`;
  }).join("");

  const maxEntries = Math.max(1, ...keys.map((k) => categoryUsage(k).entries));
  const bars = keys.map((k) => {
    const meta = catMeta(k);
    const u = categoryUsage(k);
    const pct = Math.round((u.entries / maxEntries) * 100);
    return `<div class="admin-bar-row"><span class="admin-bar-lbl">${meta.icon} ${escHtml(meta.name)}</span>` +
      `<span class="admin-bar-track"><span class="admin-bar-fill" style="width:${pct}%"></span></span>` +
      `<span class="admin-bar-val">${u.entries}</span></div>`;
  }).join("");

  return adminTabsHtml() +
    `<div class="admin-section-title">📈 Category report</div>` +
    `<div class="f-table-wrap"><table class="f-table admin-report-table"><thead><tr>` +
    `<th>Category</th><th>Features</th><th>Entries</th><th>Owners</th><th>Last Updated</th></tr></thead>` +
    `<tbody>${rows}</tbody></table></div>` +
    `<div class="admin-section-title">📊 Entries distribution</div>` +
    `<div class="admin-bars">${bars}</div>`;
};

const renderAdminSettings = () => {
  const totalOwners = adminOwnerList().length;
  const keys = allCategoryKeys().length;
  const cloudOn = typeof sb !== "undefined" && !!sb;
  return adminTabsHtml() +
    `<div class="admin-section-title">⚙️ System settings</div>` +
    `<div class="admin-setting-row"><div><div class="admin-setting-name">CEO account</div>` +
    `<div class="admin-setting-sub">${escHtml(ceoUser ? ceoUser.name + " · " + ceoUser.mobile : "Not signed in")}</div></div>` +
    `<span class="admin-pill ok">Signed in</span></div>` +
    `<div class="admin-setting-row"><div><div class="admin-setting-name">Cloud sync</div>` +
    `<div class="admin-setting-sub">Supabase cloud backup of all data</div></div>` +
    `<span class="admin-pill ${cloudOn ? "ok" : "off"}">${cloudOn ? "Connected" : "Local mode"}</span></div>` +
    `<div class="admin-setting-row"><div><div class="admin-setting-name">System mode</div>` +
    `<div class="admin-setting-sub">Categories & owners overview</div></div>` +
    `<span class="admin-pill">${keys} categories · ${totalOwners} owners</span></div>` +
    `<div class="admin-section-title">🔐 Access control</div>` +
    `<div class="admin-setting-row"><div><div class="admin-setting-name">CEO full access</div>` +
    `<div class="admin-setting-sub">CEO can open every category and manage owners</div></div>` +
    `<button type="button" class="admin-ghost-btn" data-admin-tab="owners">Manage</button></div>` +
    `<p class="admin-hint">Category removal is disabled by design — the full category set is always available.</p>`;
};

const renderAdminPanel = () => {
  if (!adminPanel) return;
  let body;
  if (adminTab === "subscriptions") body = renderAdminSubscriptions();
  else if (adminTab === "data") body = renderAdminData();
  else if (adminTab === "owners") body = renderAdminOwners();
  else if (adminTab === "categories") body = renderAdminCategories();
  else if (adminTab === "reports") body = renderAdminReports();
  else if (adminTab === "settings") body = renderAdminSettings();
  else body = renderAdminOverview();

  adminPanel.innerHTML =
    `<button type="button" class="modal-close" data-admin-close aria-label="Close">&times;</button>` +
    `<div class="feature-head"><div class="feature-title"><span class="feature-icon">🛡️</span>` +
    `<div><h3>Super Admin Panel</h3><p class="feature-sub">${escHtml(ceoUser ? ceoUser.name : "CEO")} · full control over every category & owner</p></div></div></div>` +
    body;
  if (adminTab === "subscriptions") loadAdminSubscriptionRequests();
};

const toggleOwnerCategory = async (userId, catKey) => {
  const target = adminAllOwners().find((profile) => profile.id === userId);
  if (!target || !sb || !cloudUser || !await isCloudAdmin()) {
    throw new Error("Only the site CEO can change owner category access.");
  }
  const current = ownerAllowedCats(target);
  const categories = current.includes(catKey)
    ? current.filter((category) => category !== catKey)
    : [...current, catKey];
  if (!categories.length) {
    showToast("An owner must keep at least one category assigned.", true);
    return;
  }
  const { error } = await sb.rpc("admin_set_owner_categories", {
    p_user_id: userId,
    p_categories: categories
  });
  if (error) throw error;
  target.categories = categories;
  if (owner?.id === userId) {
    owner = { ...owner, categories, category: categories[0] };
    applyAccess();
  }
  renderAdminPanel();
  showToast(`${labelFor(catKey) || catKey} access ${categories.includes(catKey) ? "granted" : "revoked"} for ${target.name}.`);
};

const removeOwnerById = async (userId) => {
  const target = adminAllOwners().find((profile) => profile.id === userId);
  if (!target || !sb || !cloudUser || !await isCloudAdmin()) {
    throw new Error("Only the site CEO can remove owner profiles.");
  }
  if (!confirm(`Remove owner access for "${target.name}" (${target.mobile})? Their Supabase login remains available for other account features.`)) return;
  const { error } = await sb.from("owner_profiles").delete().eq("user_id", userId);
  if (error) throw error;
  cloudOwnerProfiles = adminAllOwners().filter((profile) => profile.id !== userId);
  if (owner?.id === userId) {
    owner = null;
    refreshOwnerButton();
  }
  applyAccess();
  updateCeoStats();
  renderAdminPanel();
  showToast(`Owner access removed for "${target.name}".`);
};

adminModal.addEventListener("click", (e) => {
  if (e.target === adminModal || e.target.closest("[data-admin-close]")) { closeAdminPanel(); return; }
  const tab = e.target.closest("[data-admin-tab]");
  if (tab) { adminTab = tab.getAttribute("data-admin-tab"); renderAdminPanel(); return; }
  const view = e.target.closest("[data-admin-view]");
  if (view) { adminTab = "data"; adminDataCat = view.getAttribute("data-admin-view") || "all"; renderAdminPanel(); return; }
  const filter = e.target.closest("[data-admin-filter]");
  if (filter) { adminDataCat = filter.getAttribute("data-admin-filter"); renderAdminPanel(); return; }
  const chip = e.target.closest("[data-owner-cat]");
  if (chip) {
    chip.disabled = true;
    toggleOwnerCategory(chip.getAttribute("data-owner-user"), chip.getAttribute("data-owner-cat")).catch((error) => {
      showToast(`Owner access could not be changed: ${error.message}`, true);
      chip.disabled = false;
    });
    return;
  }
  const rmOwner = e.target.closest("[data-owner-remove]");
  if (rmOwner) {
    rmOwner.disabled = true;
    removeOwnerById(rmOwner.getAttribute("data-owner-remove")).catch((error) => {
      showToast(`Owner profile could not be removed: ${error.message}`, true);
      rmOwner.disabled = false;
    });
    return;
  }
  const approve = e.target.closest("[data-subscription-approve]");
  if (approve) {
    approve.disabled = true;
    reviewSubscriptionRequest(approve.getAttribute("data-subscription-approve"), true).catch((error) => {
      showToast(`Subscription review failed: ${error.message}`, true);
      approve.disabled = false;
    });
    return;
  }
  const reject = e.target.closest("[data-subscription-reject]");
  if (reject) {
    reject.disabled = true;
    reviewSubscriptionRequest(reject.getAttribute("data-subscription-reject"), false).catch((error) => {
      showToast(`Subscription review failed: ${error.message}`, true);
      reject.disabled = false;
    });
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && adminModal.classList.contains("open")) closeAdminPanel();
});

document.getElementById("ceoAdminPanel").addEventListener("click", openAdminPanel);

// ===== Owner Business Admin Panel =====
// Per-owner management console: financial reports, analytics and tools,
// scoped to the categories the owner is allowed to access (CEO sees all).
const ownerAdminModal = document.getElementById("ownerAdminModal");
const ownerAdminPanel = document.getElementById("ownerAdminPanel");
let ownerAdminTab = "overview";
let ownerAdminCat = "all";

const ownerScopeKeys = () => {
  const all = allCategoryKeys();
  if (ceoMode || !owner) return all;
  const allowed = ownerAllowedCats(owner);
  return all.filter((k) => allowed.includes(k));
};

const MONEY_KEYS = ["amount", "price", "fee", "total", "cost", "salary", "profit", "due", "paid", "advance", "rent", "bill", "charges", "rate", "revenue", "expense", "balance"];
const STATUS_PAID = /paid|clear|complete|done|received|settled|success|cash|card|online/i;
const STATUS_PENDING = /pend|due|unpaid|partial|remaining|unclear|outstanding|credit|overdue|defaulter/i;

const toNum = (v) => {
  if (typeof v === "number") return isFinite(v) ? v : 0;
  const n = parseFloat(String(v ?? "").replace(/[^0-9.\-]/g, ""));
  return isFinite(n) ? n : 0;
};

const isMoneyKey = (k) => MONEY_KEYS.some((m) => String(k).toLowerCase().includes(m));

const featureLedger = (key, fid) => {
  const col = store.get(collectionKey(key), null);
  const entries = (col && col.features && col.features[fid]) || [];
  let total = 0, pending = 0, paid = 0, count = 0;
  entries.forEach((it) => {
    count++;
    const f = it && it.fields && typeof it.fields === "object" ? { ...it, ...it.fields } : (it || {});
    const skey = Object.keys(f).find((kk) => kk !== "id" && /status|payment|paid|mode|method/i.test(kk));
    const sval = skey ? String(f[skey] ?? "") : "";
    let entryTotal = 0;
    Object.entries(f).forEach(([fk, fv]) => {
      if (fk === "id" || fk === "createdAt" || fk === "updatedAt") return;
      if (!isMoneyKey(fk)) return;
      entryTotal += toNum(fv);
    });
    total += entryTotal;
    if (STATUS_PAID.test(sval)) paid += entryTotal;
    else if (STATUS_PENDING.test(sval)) pending += entryTotal;
    else paid += entryTotal;
  });
  return { total, pending, paid, count };
};

const categoryLedger = (key) => {
  const col = store.get(collectionKey(key), null);
  let total = 0, pending = 0, paid = 0, entries = 0, features = 0;
  if (col && col.features) {
    Object.keys(col.features).forEach((fid) => {
      const arr = col.features[fid];
      if (!Array.isArray(arr) || !arr.length) return;
      features++;
      const l = featureLedger(key, fid);
      total += l.total; pending += l.pending; paid += l.paid; entries += l.count;
    });
  }
  return { total, pending, paid, entries, features };
};

const ownerScopeLedger = () => {
  const keys = ownerAdminCat === "all" ? ownerScopeKeys() : [ownerAdminCat];
  let total = 0, pending = 0, paid = 0, entries = 0, features = 0;
  keys.forEach((k) => {
    const l = categoryLedger(k);
    total += l.total; pending += l.pending; paid += l.paid; entries += l.entries; features += l.features;
  });
  return { total, pending, paid, entries, features, keys };
};

const money = (n) => "PKR " + Math.round(n || 0).toLocaleString();

const closeOwnerAdmin = () => {
  ownerAdminModal.classList.remove("open");
  ownerAdminModal.setAttribute("aria-hidden", "true");
  ownerAdminPanel.innerHTML = "";
};

const openOwnerAdmin = () => {
  if (!ceoUser && !owner) { showToast("Business Admin Panel requires CEO or Owner login.", true); return; }
  ownerAdminTab = "overview";
  ownerAdminCat = "all";
  renderOwnerAdminPanel();
  ownerAdminModal.classList.add("open");
  ownerAdminModal.setAttribute("aria-hidden", "false");
};

const ownerAdminTabsHtml = () => {
  const tabs = [
    ["overview", "📊 Overview"],
    ["reports", "💰 Financial Reports"],
    ["analytics", "📈 Analytics"],
    ["data", "🗂️ Data"]
  ];
  return `<div class="admin-tabs">` + tabs.map(([id, label]) =>
    `<button type="button" class="admin-tab${ownerAdminTab === id ? " active" : ""}" data-owner-admin-tab="${id}">${label}</button>`
  ).join("") + `</div>`;
};

const ownerScopeBar = () => {
  const keys = ownerScopeKeys();
  if (keys.length <= 1) return "";
  return `<div class="admin-filter-bar">` +
    `<button type="button" class="admin-filter${ownerAdminCat === "all" ? " active" : ""}" data-owner-admin-filter="all">All (${keys.length})</button>` +
    keys.map((k) => { const m = catMeta(k); return `<button type="button" class="admin-filter${ownerAdminCat === k ? " active" : ""}" data-owner-admin-filter="${escHtml(k)}">${m.icon} ${escHtml(m.name)}</button>`; }).join("") +
    `</div>`;
};

const renderOwnerAdminOverview = () => {
  const keys = ownerAdminCat === "all" ? ownerScopeKeys() : [ownerAdminCat];
  const led = ownerScopeLedger();
  const ownersName = ceoMode ? "CEO (full access)" : owner ? owner.name : "—";

  const catCards = keys.map((k) => {
    const m = catMeta(k);
    const l = categoryLedger(k);
    return `<div class="admin-cat-row">` +
      `<div class="admin-cat-row-left"><span class="admin-cat-row-icon">${m.icon}</span>` +
      `<div><div class="admin-cat-row-name">${escHtml(m.name)}</div>` +
      `<div class="admin-cat-row-meta">${l.entries} entries · ${l.features} features · ${money(l.total)}</div></div></div>` +
      `<button type="button" class="admin-ghost-btn" data-owner-admin-goto="${escHtml(k)}">Report</button></div>`;
  }).join("");

  return ownerAdminTabsHtml() + ownerScopeBar() +
    `<div class="admin-stat-grid">` +
    `<div class="admin-stat"><div class="admin-stat-num">${money(led.total)}</div><div class="admin-stat-lbl">Total Value</div></div>` +
    `<div class="admin-stat"><div class="admin-stat-num">${money(led.paid)}</div><div class="admin-stat-lbl">Paid / Received</div></div>` +
    `<div class="admin-stat"><div class="admin-stat-num">${money(led.pending)}</div><div class="admin-stat-lbl">Pending / Due</div></div>` +
    `<div class="admin-stat"><div class="admin-stat-num">${led.entries}</div><div class="admin-stat-lbl">Total Entries</div></div>` +
    `<div class="admin-stat"><div class="admin-stat-num">${led.features}</div><div class="admin-stat-lbl">Active Features</div></div>` +
    `<div class="admin-stat"><div class="admin-stat-num">${keys.length}</div><div class="admin-stat-lbl">My Categories</div></div>` +
    `</div>` +
    `<div class="admin-note">Signed in as <strong>${escHtml(ownersName)}</strong> · ${keys.length} categor${keys.length === 1 ? "y" : "ies"} in scope.</div>` +
    `<div class="admin-section-title">📁 Category performance</div>` +
    (catCards || `<div class="admin-empty">No categories in your scope.</div>`);
};

const renderOwnerAdminReports = () => {
  const keys = ownerAdminCat === "all" ? ownerScopeKeys() : [ownerAdminCat];
  const rows = keys.map((k) => {
    const m = catMeta(k);
    const l = categoryLedger(k);
    const rate = l.total > 0 ? Math.round((l.paid / l.total) * 100) : 0;
    return `<tr><td><span class="admin-recent-icon">${m.icon}</span> ${escHtml(m.name)}</td>` +
      `<td>${l.entries}</td><td>${money(l.total)}</td><td>${money(l.paid)}</td><td>${money(l.pending)}</td><td>${rate}%</td></tr>`;
  }).join("");
  return ownerAdminTabsHtml() + ownerScopeBar() +
    `<div class="admin-section-title">💰 Financial report by category</div>` +
    `<div class="f-table-wrap"><table class="f-table admin-report-table"><thead><tr>` +
    `<th>Category</th><th>Entries</th><th>Total</th><th>Paid</th><th>Pending</th><th>Collected %</th>` +
    `</tr></thead><tbody>${rows || `<tr><td colspan="6" class="f-muted">No data.</td></tr>`}</tbody></table></div>`;
};

const renderOwnerAdminAnalytics = () => {
  const keys = ownerAdminCat === "all" ? ownerScopeKeys() : [ownerAdminCat];
  const led = ownerScopeLedger();
  const maxTotal = Math.max(1, ...keys.map((k) => categoryLedger(k).total));
  const totalBars = keys.map((k) => {
    const m = catMeta(k);
    const l = categoryLedger(k);
    const pct = Math.round((l.total / maxTotal) * 100);
    return `<div class="admin-bar-row"><span class="admin-bar-lbl">${m.icon} ${escHtml(m.name)}</span>` +
      `<span class="admin-bar-track"><span class="admin-bar-fill" style="width:${pct}%"></span></span>` +
      `<span class="admin-bar-val">${money(l.total)}</span></div>`;
  }).join("");

  const featureBreakdown = keys.map((k) => {
    const m = catMeta(k);
    const col = store.get(collectionKey(k), null);
    if (!col || !col.features) return "";
    const frows = Object.keys(col.features).map((fid) => {
      const arr = col.features[fid];
      if (!Array.isArray(arr) || !arr.length) return "";
      const def = getFeatureDef(k, fid, null);
      const l = featureLedger(k, fid);
      return `<div class="admin-bar-row"><span class="admin-bar-lbl">${def.icon} ${escHtml(def.name)}</span>` +
        `<span class="admin-bar-track"><span class="admin-bar-fill" style="width:${Math.round((l.total / Math.max(1, led.total)) * 100)}%"></span></span>` +
        `<span class="admin-bar-val">${money(l.total)}</span></div>`;
    }).join("");
    return frows ? `<div class="admin-section-title">${m.icon} ${escHtml(m.name)}</div><div class="admin-bars">${frows}</div>` : "";
  }).join("");

  return ownerAdminTabsHtml() + ownerScopeBar() +
    `<div class="admin-stat-grid">` +
    `<div class="admin-stat"><div class="admin-stat-num">${money(led.total)}</div><div class="admin-stat-lbl">Gross Value</div></div>` +
    `<div class="admin-stat"><div class="admin-stat-num">${money(led.paid)}</div><div class="admin-stat-lbl">Collected</div></div>` +
    `<div class="admin-stat"><div class="admin-stat-num">${money(led.pending)}</div><div class="admin-stat-lbl">Outstanding</div></div>` +
    `</div>` +
    `<div class="admin-section-title">📈 Value by category</div>` +
    `<div class="admin-bars">${totalBars || `<div class="admin-empty">No data.</div>`}</div>` +
    (featureBreakdown ? `<div class="admin-section-title">🔎 Breakdown by feature</div>${featureBreakdown}` : "");
};

const renderOwnerAdminData = () => {
  const keys = ownerAdminCat === "all" ? ownerScopeKeys() : [ownerAdminCat];
  const blocks = keys.map((key) => {
    const meta = catMeta(key);
    const col = store.get(collectionKey(key), null);
    const featureIds = col && col.features ? Object.keys(col.features).filter((fid) => Array.isArray(col.features[fid]) && col.features[fid].length) : [];
    if (!featureIds.length) return "";
    const sections = featureIds.map((fid) => {
      const def = getFeatureDef(key, fid, null);
      const entries = col.features[fid];
      const head = def.fields.map((f) => `<th>${escHtml(f.label)}</th>`).join("");
      const rows = entries.map((it) => {
        const tds = def.fields.map((f) => `<td>${escHtml(String((it[f.key] ?? (it.fields && it.fields[f.key])) ?? "")) || "<span class='f-muted'>—</span>"}</td>`).join("");
        return `<tr>${tds}</tr>`;
      }).join("");
      return `<div class="sheet-section"><div class="sheet-sec-head"><span class="sheet-sec-icon">${def.icon}</span>` +
        `<h4>${escHtml(def.name)}</h4><span class="data-cat-total">${entries.length}</span></div>` +
        `<div class="f-table-wrap"><table class="f-table sheet-table"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div></div>`;
    }).join("");
    return `<div class="admin-section-title">${meta.icon} ${escHtml(meta.name)}</div>` + sections;
  }).join("");
  return ownerAdminTabsHtml() + ownerScopeBar() +
    `<div class="admin-section-title">🗂️ Business data in your scope</div>` +
    (blocks || `<div class="admin-empty">No data saved yet.</div>`);
};

const renderOwnerAdminPanel = () => {
  if (!ownerAdminPanel) return;
  let body;
  if (ownerAdminTab === "reports") body = renderOwnerAdminReports();
  else if (ownerAdminTab === "analytics") body = renderOwnerAdminAnalytics();
  else if (ownerAdminTab === "data") body = renderOwnerAdminData();
  else body = renderOwnerAdminOverview();

  ownerAdminPanel.innerHTML =
    `<button type="button" class="modal-close" data-owner-admin-close aria-label="Close">&times;</button>` +
    `<div class="feature-head"><div class="feature-title"><span class="feature-icon">🔐</span>` +
    `<div><h3>Business Admin Panel</h3><p class="feature-sub">${escHtml(ceoMode ? "CEO — full access" : owner ? owner.name + " · Owner" : "Owner")} · financial reports, analytics &amp; management tools</p></div></div></div>` +
    body;
};

ownerAdminModal.addEventListener("click", (e) => {
  if (e.target === ownerAdminModal || e.target.closest("[data-owner-admin-close]")) { closeOwnerAdmin(); return; }
  const tab = e.target.closest("[data-owner-admin-tab]");
  if (tab) { ownerAdminTab = tab.getAttribute("data-owner-admin-tab"); renderOwnerAdminPanel(); return; }
  const filter = e.target.closest("[data-owner-admin-filter]");
  if (filter) { ownerAdminCat = filter.getAttribute("data-owner-admin-filter"); renderOwnerAdminPanel(); return; }
  const goto = e.target.closest("[data-owner-admin-goto]");
  if (goto) { ownerAdminCat = goto.getAttribute("data-owner-admin-goto"); ownerAdminTab = "reports"; renderOwnerAdminPanel(); }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && ownerAdminModal.classList.contains("open")) closeOwnerAdmin();
});

document.getElementById("ceoOwnerAdminPanel").addEventListener("click", openOwnerAdmin);

// ===== Per-Category Admin Panel =====
// Each category (Clinic, Restaurant, ...) has its own dedicated business
// console, opened from inside that category. Visible only to users who have
// access to that category (CEO sees every category).
const catAdminModal = document.getElementById("catAdminModal");
const catAdminPanel = document.getElementById("catAdminPanel");
let catAdminKey = null;
let catAdminTab = "overview";

const canAccessCat = (key) => ceoMode || !owner || ownerAllowedCats(owner).includes(key);

const closeCategoryAdmin = () => {
  catAdminModal.classList.remove("open");
  catAdminModal.setAttribute("aria-hidden", "true");
  catAdminPanel.innerHTML = "";
  catAdminKey = null;
};

const openCategoryAdmin = (key) => {
  if (!canAccessCat(key)) {
    showToast(`Access denied — you don't have ${labelFor(key)} access.`, true);
    return;
  }
  catAdminKey = key;
  catAdminTab = "overview";
  renderCategoryAdmin();
  catAdminModal.classList.add("open");
  catAdminModal.setAttribute("aria-hidden", "false");
};

const catAdminTabsHtml = () => {
  const tabs = [
    ["overview", "📊 Overview"],
    ["reports", "💰 Reports"],
    ["features", "🧩 Features"],
    ["top", "🏆 Top Lists"],
    ["data", "🗂️ Data"]
  ];
  return `<div class="admin-tabs">` + tabs.map(([id, label]) =>
    `<button type="button" class="admin-tab${catAdminTab === id ? " active" : ""}" data-cat-admin-tab="${id}">${label}</button>`
  ).join("") + `</div>`;
};

const catAdminFeatureSummaries = (key) => {
  const col = store.get(collectionKey(key), null);
  if (!col || !col.features) return [];
  return Object.keys(col.features).filter((fid) => Array.isArray(col.features[fid]) && col.features[fid].length).map((fid) => {
    const def = getFeatureDef(key, fid, null);
    const l = featureLedger(key, fid);
    return { fid, def, ...l };
  });
};

const renderCatAdminOverview = () => {
  const m = catMeta(catAdminKey);
  const l = categoryLedger(catAdminKey);
  const rate = l.total > 0 ? Math.round((l.paid / l.total) * 100) : 0;
  const feats = catAdminFeatureSummaries(catAdminKey);
  const featRows = feats.map((f) =>
    `<div class="admin-cat-row">` +
    `<div class="admin-cat-row-left"><span class="admin-cat-row-icon">${f.def.icon}</span>` +
    `<div><div class="admin-cat-row-name">${escHtml(f.def.name)}</div>` +
    `<div class="admin-cat-row-meta">${f.count} entries · ${money(f.total)}</div></div></div>` +
    `<button type="button" class="admin-ghost-btn" data-cat-admin-feature="${escHtml(f.fid)}">Open</button></div>`
  ).join("");

  return catAdminTabsHtml() +
    `<div class="admin-stat-grid">` +
    `<div class="admin-stat"><div class="admin-stat-num">${money(l.total)}</div><div class="admin-stat-lbl">Total Value</div></div>` +
    `<div class="admin-stat"><div class="admin-stat-num">${money(l.paid)}</div><div class="admin-stat-lbl">Paid / Received</div></div>` +
    `<div class="admin-stat"><div class="admin-stat-num">${money(l.pending)}</div><div class="admin-stat-lbl">Pending / Due</div></div>` +
    `<div class="admin-stat"><div class="admin-stat-num">${l.entries}</div><div class="admin-stat-lbl">Total Entries</div></div>` +
    `<div class="admin-stat"><div class="admin-stat-num">${l.features}</div><div class="admin-stat-lbl">Active Features</div></div>` +
    `<div class="admin-stat"><div class="admin-stat-num">${rate}%</div><div class="admin-stat-lbl">Collected</div></div>` +
    `</div>` +
    `<div class="admin-toolbar">` +
    `<button type="button" class="btn btn-primary" data-cat-admin-export>⬇️ Export CSV</button>` +
    `<button type="button" class="btn btn-outline" data-cat-admin-data>🗂️ View All Data</button>` +
    `<button type="button" class="btn btn-outline" data-cat-admin-close2>✕ Close</button>` +
    `</div>` +
    `<div class="admin-section-title">🧩 ${m.icon} ${escHtml(m.name)} — feature performance</div>` +
    (featRows || `<div class="admin-empty">No entries yet in ${escHtml(m.name)}. Open a feature card and add your first record.</div>`);
};

const renderCatAdminReports = () => {
  const feats = catAdminFeatureSummaries(catAdminKey);
  const rows = feats.map((f) => {
    const rate = f.total > 0 ? Math.round((f.paid / f.total) * 100) : 0;
    return `<tr><td><span class="admin-recent-icon">${f.def.icon}</span> ${escHtml(f.def.name)}</td>` +
      `<td>${f.count}</td><td>${money(f.total)}</td><td>${money(f.paid)}</td><td>${money(f.pending)}</td><td>${rate}%</td></tr>`;
  }).join("");
  const l = categoryLedger(catAdminKey);
  return catAdminTabsHtml() +
    `<div class="admin-section-title">💰 Financial report — ${escHtml(catMeta(catAdminKey).name)}</div>` +
    `<div class="f-table-wrap"><table class="f-table admin-report-table"><thead><tr>` +
    `<th>Feature</th><th>Entries</th><th>Total</th><th>Paid</th><th>Pending</th><th>Collected %</th>` +
    `</tr></thead><tbody>${rows || `<tr><td colspan="6" class="f-muted">No data.</td></tr>`}` +
    `</tbody><tfoot><tr><th>Total</th><th>${l.entries}</th><th>${money(l.total)}</th><th>${money(l.paid)}</th><th>${money(l.pending)}</th><th>—</th></tr></tfoot></table></div>`;
};

const renderCatAdminFeatures = () => {
  const feats = catAdminFeatureSummaries(catAdminKey);
  const maxTotal = Math.max(1, ...feats.map((f) => f.total));
  const bars = feats.map((f) => {
    const pct = Math.round((f.total / maxTotal) * 100);
    return `<div class="admin-bar-row"><span class="admin-bar-lbl">${f.def.icon} ${escHtml(f.def.name)}</span>` +
      `<span class="admin-bar-track"><span class="admin-bar-fill" style="width:${pct}%"></span></span>` +
      `<span class="admin-bar-val">${money(f.total)}</span></div>`;
  }).join("");
  const cards = feats.map((f) =>
    `<div class="admin-cat-row">` +
    `<div class="admin-cat-row-left"><span class="admin-cat-row-icon">${f.def.icon}</span>` +
    `<div><div class="admin-cat-row-name">${escHtml(f.def.name)}</div>` +
    `<div class="admin-cat-row-meta">${f.count} entries · ${money(f.paid)} paid · ${money(f.pending)} due</div></div></div>` +
    `<button type="button" class="admin-ghost-btn" data-cat-admin-feature="${escHtml(f.fid)}">Manage</button></div>`
  ).join("");
  return catAdminTabsHtml() +
    `<div class="admin-section-title">📈 Value by feature</div>` +
    `<div class="admin-bars">${bars || `<div class="admin-empty">No data.</div>`}</div>` +
    `<div class="admin-section-title">🧩 Manage features</div>` +
    (cards || `<div class="admin-empty">No features with data yet.</div>`);
};

const renderCatAdminTop = () => {
  const col = store.get(collectionKey(catAdminKey), null);
  const items = [];
  if (col && col.features) {
    Object.keys(col.features).forEach((fid) => {
      const def = getFeatureDef(catAdminKey, fid, null);
      (col.features[fid] || []).forEach((it) => {
        const f = it && it.fields && typeof it.fields === "object" ? { ...it, ...it.fields } : (it || {});
        let val = 0;
        Object.entries(f).forEach(([fk, fv]) => {
          if (fk === "id" || fk === "createdAt" || fk === "updatedAt") return;
          if (isMoneyKey(fk)) val += toNum(fv);
        });
        const labelKey = Object.keys(f).find((k) =>
          k !== "id" && k !== "createdAt" && k !== "updatedAt" &&
          /name|title|patient|customer|client|student|dish|item|product|medicine|service|course|doctor|supplier|attendant|stylist/i.test(k)
        );
        const label = labelKey && f[labelKey] ? String(f[labelKey]) : (def.name + " #" + String(it.id || "").slice(0, 4));
        items.push({ def, label, val, at: it.updatedAt || it.createdAt });
      });
    });
  }
  items.sort((a, b) => b.val - a.val);
  const top = items.slice(0, 10);
  const rows = top.map((it, i) =>
    `<tr><td>${i + 1}</td><td><span class="admin-recent-icon">${it.def.icon}</span> ${escHtml(it.label)}</td>` +
    `<td>${escHtml(it.def.name)}</td><td>${money(it.val)}</td><td>${fmtDate(it.at)}</td></tr>`
  ).join("");
  return catAdminTabsHtml() +
    `<div class="admin-section-title">🏆 Top 10 by value — ${escHtml(catMeta(catAdminKey).name)}</div>` +
    `<div class="f-table-wrap"><table class="f-table admin-report-table"><thead><tr>` +
    `<th>#</th><th>Record</th><th>Feature</th><th>Value</th><th>Updated</th>` +
    `</tr></thead><tbody>${rows || `<tr><td colspan="5" class="f-muted">No records yet.</td></tr>`}</tbody></table></div>`;
};

const renderCatAdminData = () => {
  const meta = catMeta(catAdminKey);
  const col = store.get(collectionKey(catAdminKey), null);
  const featureIds = col && col.features ? Object.keys(col.features).filter((fid) => Array.isArray(col.features[fid]) && col.features[fid].length) : [];
  const sections = featureIds.map((fid) => {
    const def = getFeatureDef(catAdminKey, fid, null);
    const entries = col.features[fid];
    const head = def.fields.map((f) => `<th>${escHtml(f.label)}</th>`).join("");
    const rows = entries.map((it) => {
      const tds = def.fields.map((f) => `<td>${escHtml(String((it[f.key] ?? (it.fields && it.fields[f.key])) ?? "")) || "<span class='f-muted'>—</span>"}</td>`).join("");
      return `<tr>${tds}</tr>`;
    }).join("");
    return `<div class="sheet-section"><div class="sheet-sec-head"><span class="sheet-sec-icon">${def.icon}</span>` +
      `<h4>${escHtml(def.name)}</h4><span class="data-cat-total">${entries.length}</span></div>` +
      `<div class="f-table-wrap"><table class="f-table sheet-table"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div></div>`;
  }).join("");
  return catAdminTabsHtml() +
    `<div class="admin-toolbar"><button type="button" class="btn btn-primary" data-cat-admin-export>⬇️ Export CSV</button></div>` +
    `<div class="admin-section-title">🗂️ ${meta.icon} ${escHtml(meta.name)} data</div>` +
    (sections || `<div class="admin-empty">No data saved yet in ${escHtml(meta.name)}.</div>`);
};

const renderCategoryAdmin = () => {
  if (!catAdminPanel || !catAdminKey) return;
  let body;
  if (catAdminTab === "reports") body = renderCatAdminReports();
  else if (catAdminTab === "features") body = renderCatAdminFeatures();
  else if (catAdminTab === "top") body = renderCatAdminTop();
  else if (catAdminTab === "data") body = renderCatAdminData();
  else body = renderCatAdminOverview();
  const m = catMeta(catAdminKey);
  catAdminPanel.innerHTML =
    `<button type="button" class="modal-close" data-cat-admin-close aria-label="Close">&times;</button>` +
    `<div class="feature-head"><div class="feature-title"><span class="feature-icon">${m.icon}</span>` +
    `<div><h3>${escHtml(m.name)} Admin Panel</h3><p class="feature-sub">${escHtml(ceoMode ? "CEO" : owner ? owner.name : "")} · complete control of your ${escHtml(m.name)} management</p></div></div></div>` +
    body;
};

catAdminModal.addEventListener("click", (e) => {
  if (e.target === catAdminModal || e.target.closest("[data-cat-admin-close]") || e.target.closest("[data-cat-admin-close2]")) { closeCategoryAdmin(); return; }
  const tab = e.target.closest("[data-cat-admin-tab]");
  if (tab) { catAdminTab = tab.getAttribute("data-cat-admin-tab"); renderCategoryAdmin(); return; }
  const feat = e.target.closest("[data-cat-admin-feature]");
  if (feat) {
    const fid = feat.getAttribute("data-cat-admin-feature");
    const key = catAdminKey;
    closeCategoryAdmin();
    openFeaturePanel(key, fid, null, null);
    return;
  }
  if (e.target.closest("[data-cat-admin-export]")) { exportSheetCsv(catAdminKey); return; }
  if (e.target.closest("[data-cat-admin-data]")) { catAdminTab = "data"; renderCategoryAdmin(); }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && catAdminModal.classList.contains("open")) closeCategoryAdmin();
});



// ===== Owner profile photo (DP) upload =====
// Three copies of the photo are kept: localStorage (fast), IndexedDB (survives
// a wiped localStorage) and the cloud (follows the owner to other devices).
const AVATAR_DB = "oms_media";
const AVATAR_SHOP = "files";

const ownerAvatarEl = document.getElementById("ownerAvatar");
const ownerAvatarInput = document.getElementById("ownerAvatarInput");
const headerAvatarEl = document.getElementById("headerAvatar");
const headerAvatarInput = document.getElementById("headerAvatarInput");

// --- IndexedDB backup, survives a cleared or full localStorage ---
const avatarDB = () => new Promise((resolve, reject) => {
  if (!window.indexedDB) { reject(new Error("IndexedDB not available")); return; }
  const req = indexedDB.open(AVATAR_DB, 1);
  req.onupgradeneeded = () => { try { req.result.createObjectStore(AVATAR_SHOP); } catch {} };
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

const avatarDBPut = async (record) => {
  try {
    const db = await avatarDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(AVATAR_SHOP, "readwrite");
      tx.objectStore(AVATAR_SHOP).put(record, AVATAR_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    db.close();
  } catch (e) {
    console.warn("Photo backup failed:", e);
  }
};

const avatarDBGet = async () => {
  try {
    const db = await avatarDB();
    const record = await new Promise((resolve, reject) => {
      const tx = db.transaction(AVATAR_SHOP, "readonly");
      const req = tx.objectStore(AVATAR_SHOP).get(AVATAR_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return record;
  } catch {
    return null;
  }
};

// --- Shrink the picked photo ---
// A 2 MB phone photo becomes a ~50 KB JPEG, so it always fits in localStorage
// and goes up to the cloud without any trouble.
const shrinkPhoto = (file) => new Promise((resolve) => {
  const reader = new FileReader();
  reader.onerror = () => resolve(null);
  reader.onload = () => {
    const img = new Image();
    img.onerror = () => resolve(null);
    img.onload = () => {
      const long = Math.max(img.width, img.height) || 1;
      const scale = Math.min(1, AVATAR_EDGE / long);
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const cv = document.createElement("canvas");
      cv.width = w; cv.height = h;
      const ctx = cv.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      let out = "";
      try { out = cv.toDataURL("image/jpeg", 0.86); } catch {}
      if (!out) { try { out = cv.toDataURL("image/png"); } catch {} }
      resolve(out || null);
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});

// --- Show the photo in every avatar spot ---
const applyOwnerAvatar = (value) => {
  const src = avatarSrc(value !== undefined ? value : store.get(AVATAR_KEY, null));
  const css = src ? `url("${src}")` : "";
  if (ownerAvatarEl) {
    ownerAvatarEl.style.backgroundImage = css;
    ownerAvatarEl.classList.toggle("has-photo", !!src);
  }
  if (headerAvatarEl) {
    headerAvatarEl.style.backgroundImage = css;
    headerAvatarEl.classList.toggle("has-photo", !!src);
  }
};

// --- Save the photo everywhere at once ---
const saveOwnerAvatar = async (src) => {
  const record = { v: src, t: Date.now() };
  try {
    localStorage.setItem(AVATAR_KEY, JSON.stringify(record));
  } catch (e) {
    console.warn("Photo save failed:", e);
    showToast("Photo could not be saved, browser storage is full.", true);
    return null;
  }
  await avatarDBPut(record);
  cloudPut(AVATAR_KEY, record);
  applyOwnerAvatar(record);
  return record;
};

// --- The site wide copy, every visitor sees the owner photo ---
const publishOwnerAvatar = async (record) => {
  if (!sb || !cloudUser || !ceoLoggedIn) return;
  try {
    const { error } = await sb.from(AVATAR_TABLE).upsert(
      { id: "owner", photo: record.v, saved_at: record.t, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    );
    if (error) console.warn("Photo publish failed:", error.message);
    else {
      avatarTableOk = true;
      try { localStorage.removeItem(AVATAR_TABLE_FLAG); } catch {}
    }
  } catch (e) {
    console.warn("Photo publish failed:", e);
  }
};

let avatarTableOk = null; // null = not checked yet, false = table not there

const fetchOwnerAvatar = async () => {
  if (!sb) return null;
  if (avatarTableOk === false) return null;
  if (avatarTableOk === null && localStorage.getItem(AVATAR_TABLE_FLAG)) { avatarTableOk = false; return null; }
  try {
    const { data, error } = await sb
      .from(AVATAR_TABLE)
      .select("photo,saved_at")
      .eq("id", "owner")
      .maybeSingle();
    if (error) {
      avatarTableOk = false;
      try { localStorage.setItem(AVATAR_TABLE_FLAG, "1"); } catch {}
      return null;
    }
    avatarTableOk = true;
    try { localStorage.removeItem(AVATAR_TABLE_FLAG); } catch {}
    if (!data || !data.photo) return null;
    return { v: data.photo, t: Number(data.saved_at) || 0 };
  } catch {
    avatarTableOk = false;
    return null;
  }
};

// --- Bring the photo back if it went missing on its own ---
const restoreOwnerAvatar = async () => {
  const local = store.get(AVATAR_KEY, null);
  const legacy = typeof local === "string" ? local : "";
  const backup = await avatarDBGet();
  const published = await fetchOwnerAvatar();
  const candidates = [];
  if (legacy) candidates.push({ v: legacy, t: Date.now() });
  else if (local && avatarSrc(local)) candidates.push(local);
  if (backup && avatarSrc(backup)) candidates.push(backup);
  if (published && avatarSrc(published)) candidates.push(published);
  const best = candidates.sort((a, b) => avatarTime(b) - avatarTime(a))[0] || null;
  if (!best) { applyOwnerAvatar(null); return null; }
  try { localStorage.setItem(AVATAR_KEY, JSON.stringify(best)); } catch {}
  await avatarDBPut(best);
  applyOwnerAvatar(best);
  return best;
};

// Shared upload wiring: click → file picker → shrink → save → refresh every avatar
const initAvatarUpload = (el, input) => {
  if (!el || !input) return;
  const open = () => input.click();
  el.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); open(); });
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
  });
  input.addEventListener("change", async () => {
    const file = input.files && input.files[0];
    input.value = "";
    if (!file) return;
    if (!/^image\//.test(file.type)) { showToast("Please choose an image file.", true); return; }
    if (file.size > 10 * 1024 * 1024) { showToast("Image too large, please pick a smaller photo.", true); return; }
    showToast("Saving photo...");
    const src = await shrinkPhoto(file);
    if (!src) { showToast("Could not read that image.", true); return; }
    const record = await saveOwnerAvatar(src);
    if (!record) return;
    showToast("Profile photo updated!");
    publishOwnerAvatar(record);
  });
};

initAvatarUpload(headerAvatarEl, headerAvatarInput);
initAvatarUpload(ownerAvatarEl, ownerAvatarInput);

// ===== Contact Owner: reveal social icons =====
const contactOwnerToggle = document.getElementById("contactOwnerToggle");
const ownerSocials = document.getElementById("ownerSocials");

if (contactOwnerToggle && ownerSocials) {
  contactOwnerToggle.addEventListener("click", () => {
    const open = ownerSocials.hidden;
    ownerSocials.hidden = !open;
    contactOwnerToggle.setAttribute("aria-expanded", String(open));
    contactOwnerToggle.classList.toggle("btn-primary", !open);
    contactOwnerToggle.classList.toggle("btn-outline", open);
    contactOwnerToggle.textContent = open ? "Hide Contacts" : "Contact Owner";
    if (open) {
      ownerSocials.scrollIntoView({ behavior: "smooth", block: "nearest" });
      showToast("Connect with Amna Bibi on social media!");
    }
  });
}

// ===== View Portfolio: show the portfolio inside the page (with new-tab fallback) =====
const portfolioToggle = document.getElementById("portfolioToggle");
const ownerPortfolio = document.getElementById("ownerPortfolio");
const portfolioFrame = document.getElementById("portfolioFrame");
const portfolioLoader = document.getElementById("portfolioLoader");
const portfolioClose = document.getElementById("portfolioClose");
const PORTFOLIO_URL = portfolioFrame ? portfolioFrame.dataset.src : "";

if (portfolioToggle && ownerPortfolio && portfolioFrame) {
  let frameReady = false;
  const setEmpty = (open) => {
    frameReady = false;
    portfolioFrame.src = open ? PORTFOLIO_URL : "about:blank";
  };

  portfolioFrame.addEventListener("load", () => {
    frameReady = true;
    if (portfolioLoader) {
      portfolioLoader.hidden = true;
      portfolioLoader.innerHTML = "";
    }
  });

  portfolioToggle.addEventListener("click", () => {
    const open = ownerPortfolio.hidden;
    ownerPortfolio.hidden = !open;
    portfolioToggle.setAttribute("aria-expanded", String(open));
    portfolioToggle.classList.toggle("btn-outline", !open);
    portfolioToggle.classList.toggle("btn-primary", open);
    portfolioToggle.textContent = open ? "Hide Portfolio" : "View Portfolio";
    setEmpty(open);
    if (open) {
      if (portfolioLoader) {
        portfolioLoader.hidden = false;
        portfolioLoader.textContent = "Loading portfolio…";
      }
      // Some hosts block embedding (CSP / X-Frame-Options) — fall back to opening in a new tab.
      setTimeout(() => {
        if (frameReady || !portfolioLoader) return;
        portfolioLoader.textContent = "";
        const msg = document.createElement("span");
        msg.textContent = "This portfolio can't be shown here. ";
        const link = document.createElement("a");
        link.href = PORTFOLIO_URL;
        link.target = "_blank";
        link.rel = "noopener";
        link.className = "portfolio-link";
        link.textContent = "Open in new tab ↗";
        msg.appendChild(link);
        portfolioLoader.appendChild(msg);
      }, 12000);
      ownerPortfolio.scrollIntoView({ behavior: "smooth", block: "nearest" });
      showToast("Loading Amna Bibi's portfolio…");
    }
  });

  if (portfolioClose) {
    portfolioClose.addEventListener("click", () => {
      ownerPortfolio.hidden = true;
      portfolioFrame.src = "about:blank";
      portfolioToggle.setAttribute("aria-expanded", "false");
      portfolioToggle.classList.remove("btn-primary");
      portfolioToggle.classList.add("btn-outline");
      portfolioToggle.textContent = "View Portfolio";
    });
  }
}

// ===== Ratings & Comments =====
const REVIEWS_KEY = "siteReviews";
const reviewForm = document.getElementById("reviewForm");
const reviewList = document.getElementById("reviewList");
const starPicker = document.getElementById("starPicker");
const starValue = document.getElementById("starValue");
const reviewsAvgEl = document.getElementById("reviewsAvg");
const reviewsAvgStars = document.getElementById("reviewsAvgStars");
const reviewsCountEl = document.getElementById("reviewsCount");
const reviewsBars = document.getElementById("reviewsBars");
const revNameInput = document.getElementById("revName");
const revTextInput = document.getElementById("revText");
const revNameErr = document.getElementById("revNameErr");
const revRatingErr = document.getElementById("revRatingErr");

let pickedRating = 0;
let reviewCache = [];

const getReviews = () => reviewCache;

const loadReviews = async () => {
  if (!reviewList) return;
  if (!sb) {
    reviewCache = [];
    renderReviews();
    if (reviewsCountEl) reviewsCountEl.textContent = "Reviews require an internet connection.";
    return;
  }
  const { data, error } = await sb.from("site_reviews")
    .select("id,author_id,author_name,rating,comment,created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) {
    console.warn("Could not load public reviews:", error.message);
    reviewCache = [];
    renderReviews();
    if (reviewsCountEl) reviewsCountEl.textContent = "Reviews are temporarily unavailable.";
    return;
  }
  reviewCache = (data || []).map((review) => ({
    id: review.id,
    author_id: review.author_id,
    name: review.author_name,
    rating: review.rating,
    text: review.comment,
    at: review.created_at
  }));
  renderReviews();
};

const migrateLegacyReviews = async () => {
  if (!sb || !cloudUser || !ceoLoggedIn) return;
  let legacy;
  try {
    legacy = JSON.parse(localStorage.getItem(REVIEWS_KEY) || "[]");
  } catch (error) {
    console.warn("Could not read legacy local reviews:", error);
    return;
  }
  if (!Array.isArray(legacy) || !legacy.length) return;
  const rows = legacy.flatMap((review, index) => {
    const rating = Number(review.rating);
    const name = String(review.name || "").trim().slice(0, 60);
    if (!name || !Number.isInteger(rating) || rating < 1 || rating > 5) return [];
    return [{
      author_id: null,
      author_name: name,
      rating,
      comment: String(review.text || "").slice(0, 500),
      legacy_id: String(review.id || `${review.at || "legacy"}-${index}`).slice(0, 200),
      created_at: Number.isNaN(Date.parse(review.at)) ? new Date().toISOString() : new Date(review.at).toISOString()
    }];
  });
  if (!rows.length) return;
  const { error } = await sb.from("site_reviews").upsert(rows, { onConflict: "legacy_id", ignoreDuplicates: true });
  if (error) {
    console.warn("Could not migrate legacy reviews:", error.message);
    showToast(`Legacy reviews were not migrated: ${error.message}`, true);
    return;
  }
  try {
    localStorage.removeItem(REVIEWS_KEY);
  } catch (error) {
    console.warn("Legacy reviews were migrated but the local copy could not be removed:", error);
  }
};

const starString = (n) => "★".repeat(n) + "☆".repeat(5 - n);

const paintStars = (value) => {
  if (!starPicker) return;
  starPicker.querySelectorAll(".star").forEach((s) => {
    s.classList.toggle("on", Number(s.dataset.value) <= value);
  });
  if (starValue) {
    starValue.textContent = value ? `${value} of 5` : "Select stars";
    starValue.style.color = value ? "#f59e0b" : "";
  }
};

const renderReviews = () => {
  if (!reviewList) return;
  const list = getReviews();
  const total = list.length;
  const sum = list.reduce((n, r) => n + (Number(r.rating) || 0), 0);
  const avg = total ? sum / total : 0;

  if (reviewsAvgEl) reviewsAvgEl.textContent = avg.toFixed(1);
  if (reviewsAvgStars) reviewsAvgStars.textContent = starString(Math.round(avg));
  if (reviewsCountEl) reviewsCountEl.textContent = total ? `${total} review${total === 1 ? "" : "s"}` : "No reviews yet";

  // Distribution bars (5 → 1)
  if (reviewsBars) {
    reviewsBars.innerHTML = [5, 4, 3, 2, 1].map((n) => {
      const count = list.filter((r) => Number(r.rating) === n).length;
      const pct = total ? Math.round((count / total) * 100) : 0;
      return `<div class="rv-bar-row"><span class="rv-bar-lbl">${n} ★</span>` +
        `<span class="rv-bar-track"><span class="rv-bar-fill" style="width:${pct}%"></span></span>` +
        `<span class="rv-bar-val">${count}</span></div>`;
    }).join("");
  }
  if (revNameInput) {
    revNameInput.value = currentUser?.name || "";
    revNameInput.readOnly = !!currentUser;
  }

  if (!total) {
    reviewList.innerHTML = "";
    return;
  }

  const isCEO = !!(ceoMode && ceoUser);

  const sorted = [...list].sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
  reviewList.innerHTML = sorted.map((r) => {
    const initial = escHtml(String(r.name || "?").trim().charAt(0).toUpperCase());
    const canDelete = isCEO || (r.author_id && r.author_id === accountAuthUser?.id);
    return `<div class="review-item" data-review-id="${escHtml(r.id)}">` +
      `<div class="review-item-head">` +
      `<span class="review-avatar">${initial}</span>` +
      `<span class="review-name">${escHtml(r.name)}</span>` +
      `<span class="review-stars" title="${Number(r.rating) || 0} of 5">${starString(Number(r.rating) || 0)}</span>` +
      `<span class="review-date">${fmtReviewDate(r.at)}</span>` +
      `</div>` +
      (r.text ? `<p class="review-comment">${escHtml(r.text)}</p>` : "") +
      (canDelete ? `<button type="button" class="review-del" data-review-del="${escHtml(r.id)}" title="Delete review" aria-label="Delete review">&times;</button>` : "") +
      `</div>`;
  }).join("");
};

const fmtReviewDate = (v) => {
  const d = v ? new Date(v) : null;
  if (!d || isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};

if (starPicker) {
  starPicker.addEventListener("click", (e) => {
    const btn = e.target.closest(".star");
    if (!btn) return;
    pickedRating = Number(btn.dataset.value) || 0;
    paintStars(pickedRating);
    if (revRatingErr) revRatingErr.textContent = "";
  });
  starPicker.addEventListener("mouseover", (e) => {
    const btn = e.target.closest(".star");
    if (btn) paintStars(Number(btn.dataset.value) || 0);
  });
  starPicker.addEventListener("mouseleave", () => paintStars(pickedRating));
}

if (revNameInput) {
  revNameInput.addEventListener("focus", () => {
    if (currentUser && currentUser.name) return;
    if (typeof openUserModal === "function") {
      openUserModal("signup");
      revNameInput.blur();
      return;
    }
  });
  revNameInput.addEventListener("click", () => {
    if (currentUser && currentUser.name) return;
    if (typeof openUserModal === "function") {
      openUserModal("signup");
      revNameInput.blur();
    }
  });
}

if (reviewForm) {
  reviewForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentUser || !currentUser.name || !accountAuthUser) {
      showToast("Please sign up or login first to post a review.", true);
      if (typeof openUserModal === "function") openUserModal("signup");
      return;
    }
    const name = String(revNameInput.value || "").trim();
    const text = String(revTextInput.value || "").trim();
    let ok = true;

    if (name.length < 2) {
      if (revNameErr) revNameErr.textContent = "Please enter your name (min 2 letters).";
      revNameInput.classList.add("invalid");
      ok = false;
    } else {
      if (revNameErr) revNameErr.textContent = "";
      revNameInput.classList.remove("invalid");
    }

    if (!pickedRating) {
      if (revRatingErr) revRatingErr.textContent = "Please tap a star to rate.";
      ok = false;
    } else if (revRatingErr) revRatingErr.textContent = "";

    if (!ok) { showToast("Please add your name and rating.", true); return; }

    const submit = reviewForm.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;
    try {
      const { error } = await sb.from("site_reviews").insert({
        author_id: accountAuthUser.id,
        author_name: currentUser.name,
        rating: pickedRating,
        comment: text
      });
      if (error) throw error;
      reviewForm.reset();
      pickedRating = 0;
      paintStars(0);
      await loadReviews();
      showToast("Thanks! Your review has been posted. ⭐");
    } catch (error) {
      showToast(`Review could not be posted: ${error.message || "Cloud service error."}`, true);
    } finally {
      if (submit) submit.disabled = false;
    }
  });

  reviewForm.addEventListener("input", (e) => {
    if (e.target === revNameInput) {
      revNameInput.classList.remove("invalid");
      if (revNameErr) revNameErr.textContent = "";
    }
  });
}

if (reviewList) {
  reviewList.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-review-del]");
    if (!btn) return;
    const id = btn.getAttribute("data-review-del");
    const item = getReviews().find((r) => r.id === id);
    if (!item) return;
    const isCEO = !!(ceoMode && ceoUser);
    const isAuthor = item.author_id && item.author_id === accountAuthUser?.id;
    if (!isCEO && !isAuthor) {
      showToast("You can only delete your own review.", true);
      return;
    }
    if (!confirm(`Delete review by "${item.name}"?`)) return;
    btn.disabled = true;
    try {
      const { error } = await sb.from("site_reviews").delete().eq("id", id);
      if (error) throw error;
      await loadReviews();
      showToast("Review deleted.");
    } catch (error) {
      showToast(`Review could not be deleted: ${error.message || "Cloud service error."}`, true);
      btn.disabled = false;
    }
  });
}

renderReviews();

// ===== Business Registration =====
const REG_KEY = "businessRegistrations";
const REG_PLAN_KEY = "selectedBizPlan";

const regForm = document.getElementById("regForm");
const planGrid = document.getElementById("planGrid");
const regPlanSummary = document.getElementById("regPlanSummary");
const regListWrap = document.getElementById("regListWrap");
const regList = document.getElementById("regList");
const regPhotoPreview = document.getElementById("regPhotoPreview");
const regVideoPreview = document.getElementById("regVideoPreview");
const regPhotosInput = document.getElementById("regPhotos");
const regVideosInput = document.getElementById("regVideos");
const regTerms = document.getElementById("regTerms");
const regTermsErr = document.getElementById("regTermsErr");
const regModal = document.getElementById("regModal");
const openRegFormBtn = document.getElementById("openRegForm");
const regModalClose = document.getElementById("regModalClose");

const PLAN_INFO = {
  "15days": { label: "15 Days", price: 2500 },
  "30days": { label: "30 Days", price: 5000 },
  "1year": { label: "1 Year", price: 60000 }
};

const MOBILE_LOOKUP_RE = /^03\d{9}$/;
const normalizeMobile = (v) => String(v || "").replace(/[^\d]/g, "");

const rupees = (n) => Number(n || 0).toLocaleString("en-PK");

const getRegistrations = () => {
  const list = store.get(REG_KEY, []);
  return Array.isArray(list) ? list : [];
};

const getSelectedPlan = () => {
  const key = store.get(REG_PLAN_KEY, null);
  return key && PLAN_INFO[key] ? key : null;
};

const renderPlanSummary = () => {
  if (!regPlanSummary) return;
  const key = getSelectedPlan();
  if (!key) {
    regPlanSummary.innerHTML = `<span class="reg-plan-none">No plan selected yet. Pick one above.</span>`;
    return;
  }
  const p = PLAN_INFO[key];
  regPlanSummary.innerHTML =
    `<div class="reg-plan-item"><span>Plan</span><strong>${escHtml(p.label)}</strong></div>` +
    `<div class="reg-plan-item"><span>Amount</span><strong>PKR ${rupees(p.price)}</strong></div>` +
    `<div class="reg-plan-item"><span>Ad runs for</span><strong>${escHtml(p.label)}</strong></div>`;
};

const markPlanSelected = (key) => {
  if (!planGrid) return;
  planGrid.querySelectorAll(".plan-mini").forEach((card) => {
    const on = card.dataset.plan === key;
    card.classList.toggle("selected", on);
    card.setAttribute("aria-pressed", on ? "true" : "false");
  });
};

const selectPlan = (key, { silence = false } = {}) => {
  if (!PLAN_INFO[key]) return;
  store.set(REG_PLAN_KEY, key);
  markPlanSelected(key);
  renderPlanSummary();
  const err = document.getElementById("regPlanErr");
  if (err) err.textContent = "";
  if (!silence) showToast(`${PLAN_INFO[key].label} plan selected - PKR ${rupees(PLAN_INFO[key].price)}`);
};

if (planGrid) {
  planGrid.addEventListener("click", (e) => {
    const card = e.target.closest(".plan-mini");
    if (!card) return;
    selectPlan(card.dataset.plan);
  });
}

// --- Media pickers (preview only, nothing is uploaded from the browser) ---
const clearPreview = (el) => { if (el) el.innerHTML = ""; };

const renderMediaPreview = (files, container, kind) => {
  if (!container) return;
  clearPreview(container);
  if (!files || !files.length) {
    container.innerHTML = `<span class="media-empty">Nothing selected yet.</span>`;
    return;
  }
  [...files].slice(0, 8).forEach((file) => {
    const wrap = document.createElement("div");
    wrap.className = "media-thumb";
    const url = URL.createObjectURL(file);
    if (kind === "video") {
      const v = document.createElement("video");
      v.src = url; v.muted = true; v.playsInline = true;
      v.addEventListener("loadeddata", () => URL.revokeObjectURL(url), { once: true });
      wrap.appendChild(v);
      const tag = document.createElement("span");
      tag.className = "media-kind";
      tag.textContent = "Video";
      wrap.appendChild(tag);
    } else {
      const img = document.createElement("img");
      img.src = url; img.alt = "Selected photo";
      img.addEventListener("load", () => URL.revokeObjectURL(url), { once: true });
      wrap.appendChild(img);
    }
    container.appendChild(wrap);
  });
  if (files.length > 8) {
    const more = document.createElement("span");
    more.className = "media-empty";
    more.textContent = `+${files.length - 8} more`;
    container.appendChild(more);
  }
};

regPhotosInput?.addEventListener("change", () => renderMediaPreview(regPhotosInput.files, regPhotoPreview, "photo"));
regVideosInput?.addEventListener("change", () => renderMediaPreview(regVideosInput.files, regVideoPreview, "video"));

clearPreview(regPhotoPreview);
clearPreview(regVideoPreview);
if (regPhotoPreview) regPhotoPreview.innerHTML = `<span class="media-empty">Nothing selected yet.</span>`;
if (regVideoPreview) regVideoPreview.innerHTML = `<span class="media-empty">Nothing selected yet.</span>`;

// --- Validation helpers ---
const setRegError = (inputEl, errEl, message) => {
  if (errEl) errEl.textContent = message || "";
  if (inputEl) inputEl.classList.toggle("invalid", !!message);
  return !message;
};

// Optional field: only checked when the user types something.
const URL_FIELDS = [
  ["regWebsite", "regWebsiteErr", "website"],
  ["regFacebook", "regFacebookErr", "Facebook"],
  ["regInstagram", "regInstagramErr", "Instagram"],
  ["regTiktok", "regTiktokErr", "TikTok"]
];

const isLikelyLink = (v) => /^(https?:\/\/)?[\w-]+(\.[\w-]+)+([\w.,@?^=%&:/~+#-]*)?$/.test(v.trim());

const validateRegForm = () => {
  const get = (id) => document.getElementById(id);
  let ok = true;

  const bizName = get("regBizName").value.trim();
  ok = setRegError(get("regBizName"), get("regBizNameErr"), bizName.length < 3 ? "Please write your business name (min 3 letters)." : "") && ok;

  const ownerName = get("regOwnerName").value.trim();
  ok = setRegError(get("regOwnerName"), get("regOwnerNameErr"), ownerName.length < 3 ? "Please write the owner name (min 3 letters)." : "") && ok;

  const mobile = normalizeMobile(get("regMobile").value);
  ok = setRegError(get("regMobile"), get("regMobileErr"), MOBILE_LOOKUP_RE.test(mobile) ? "" : "Please enter a valid mobile number, e.g. 03123456789.") && ok;

  const wa = normalizeMobile(get("regWhatsapp").value);
  ok = setRegError(get("regWhatsapp"), get("regWhatsappErr"), MOBILE_LOOKUP_RE.test(wa) ? "" : "Please enter a valid WhatsApp number, e.g. 03123456789.") && ok;

  const category = get("regCategory").value;
  ok = setRegError(get("regCategory"), get("regCategoryErr"), category ? "" : "Please select your business category.") && ok;

  const city = get("regCity").value.trim();
  ok = setRegError(get("regCity"), get("regCityErr"), city.length < 2 ? "Please write your city." : "") && ok;

  const address = get("regAddress").value.trim();
  ok = setRegError(get("regAddress"), get("regAddressErr"), address.length < 5 ? "Please write the full address." : "") && ok;

  const about = get("regAbout").value.trim();
  ok = setRegError(get("regAbout"), get("regAboutErr"), about.length < 10 ? "Please write a short description (min 10 letters)." : "") && ok;

  const timing = get("regTiming").value.trim();
  ok = setRegError(get("regTiming"), get("regTimingErr"), timing.length < 3 ? "Please write your opening hours." : "") && ok;

  // Social links are optional, but if filled they must look like a real link.
  URL_FIELDS.forEach(([id, errId, label]) => {
    const el = get(id);
    const raw = el.value.trim();
    const bad = raw && !isLikelyLink(raw);
    ok = setRegError(el, get(errId), bad ? `Please enter a valid ${label} link.` : "") && ok;
  });

  if (regTermsErr) regTermsErr.textContent = regTerms && !regTerms.checked ? "Please confirm the details and the payment steps." : "";
  if (regTerms && !regTerms.checked) ok = false;

  return ok;
};

// --- Submit ---
if (regForm) {
  regForm.addEventListener("submit", (e) => {
    e.preventDefault();

    if (!validateRegForm()) {
      showToast("Please fill the highlighted fields.", true);
      regForm.querySelector(".invalid")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const planKey = getSelectedPlan();
    const planErr = document.getElementById("regPlanErr");
    if (!planKey) {
      if (planErr) planErr.textContent = "Please choose a plan above.";
      showToast("Please choose a plan first, then submit.", true);
      document.getElementById("planGrid")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (planErr) planErr.textContent = "";

    const get = (id) => document.getElementById(id).value.trim();
    const plan = PLAN_INFO[planKey];
    const entry = {
      id: newEntryId(),
      business: get("regBizName"),
      owner: get("regOwnerName"),
      mobile: normalizeMobile(get("regMobile")),
      whatsapp: normalizeMobile(get("regWhatsapp")),
      category: get("regCategory"),
      city: get("regCity"),
      address: get("regAddress"),
      about: get("regAbout"),
      timing: get("regTiming"),
      website: get("regWebsite"),
      facebook: get("regFacebook"),
      instagram: get("regInstagram"),
      tiktok: get("regTiktok"),
      photoCount: regPhotosInput?.files?.length || 0,
      videoCount: regVideosInput?.files?.length || 0,
      plan: planKey,
      planLabel: plan.label,
      amount: plan.price,
      at: new Date().toISOString(),
      status: "pending"
    };

    const list = getRegistrations();
    list.push(entry);
    store.set(REG_KEY, list);

    regForm.reset();
    clearPreview(regPhotoPreview);
    clearPreview(regVideoPreview);
    if (regPhotoPreview) regPhotoPreview.innerHTML = `<span class="media-empty">Nothing selected yet.</span>`;
    if (regVideoPreview) regVideoPreview.innerHTML = `<span class="media-empty">Nothing selected yet.</span>`;
    store.set(REG_PLAN_KEY, null);
    markPlanSelected(null);
    renderPlanSummary();
    renderRegistrations();
    resetRegErrors();

    showToast("Registration submitted! Now contact the owner on WhatsApp to send the payment.");
    closeRegModal();
    regListWrap?.scrollIntoView({ behavior: "smooth", block: "start" });

    // Straight to the owner's WhatsApp with the business and plan pre-filled.
    const waText = encodeURIComponent(
      `Assalam o Alaikum! I submitted my business registration on Online Management Site.\n` +
      `Business: ${entry.business}\nOwner: ${entry.owner}\nPlan: ${entry.planLabel} (PKR ${rupees(entry.amount)})\n` +
      `Please send me the payment details so my ad can run.`
    );
    setTimeout(() => {
      window.open(`https://wa.me/923042954627?text=${waText}`, "_blank", "noopener");
    }, 700);
  });

  regForm.addEventListener("input", (e) => {
    const t = e.target;
    if (t && t.classList.contains("invalid")) {
      t.classList.remove("invalid");
      const err = document.getElementById(`${t.id}Err`);
      if (err) err.textContent = "";
    }
    if (t === regTerms && regTermsErr) regTermsErr.textContent = "";
  });

  document.getElementById("regReset")?.addEventListener("click", () => {
    clearPreview(regPhotoPreview);
    clearPreview(regVideoPreview);
    if (regPhotoPreview) regPhotoPreview.innerHTML = `<span class="media-empty">Nothing selected yet.</span>`;
    if (regVideoPreview) regVideoPreview.innerHTML = `<span class="media-empty">Nothing selected yet.</span>`;
    store.set(REG_PLAN_KEY, null);
    markPlanSelected(null);
    renderPlanSummary();
    resetRegErrors();
    showToast("Form cleared.");
  });
}

const resetRegErrors = () => {
  regForm?.querySelectorAll(".field-error").forEach((el) => { el.textContent = ""; });
  regForm?.querySelectorAll(".invalid").forEach((el) => el.classList.remove("invalid"));
};

// --- Registration modal open / close ---
const openRegModal = () => {
  if (!regModal) return;
  regModal.classList.add("open");
  regModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
};

const closeRegModal = () => {
  if (!regModal) return;
  regModal.classList.remove("open");
  regModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
};

openRegFormBtn?.addEventListener("click", openRegModal);
regModalClose?.addEventListener("click", closeRegModal);
regModal?.addEventListener("click", (e) => {
  if (e.target === regModal) closeRegModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && regModal?.classList.contains("open")) closeRegModal();
});

// --- Submitted registrations list ---
const fmtRegDate = (v) => {
  const d = v ? new Date(v) : null;
  if (!d || isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};

const renderRegistrations = () => {
  if (!regList || !regListWrap) return;
  const list = getRegistrations().slice().sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));

  if (!list.length) {
    regListWrap.hidden = true;
    regList.innerHTML = "";
    return;
  }

  regListWrap.hidden = false;
  regList.innerHTML = list.map((r) => {
    const status = adStatusOf(r);
    const label = AD_STATUS_LABEL[status] || "Awaiting payment";
    const expiry = status === "live" && r.expiresAt ? `<br /><strong>Ad expires:</strong> ${fmtRegDate(r.expiresAt)}` : "";
    return `<div class="reg-item" data-reg-id="${escHtml(r.id)}">` +
      `<div class="reg-item-head">` +
      `<span class="reg-item-name">${escHtml(r.business)}</span>` +
      `<span class="reg-item-plan">${escHtml(r.planLabel || "Plan")}</span>` +
      `<span class="reg-item-status s-${status}">${label}</span>` +
      `<button type="button" class="reg-item-del" data-reg-del="${escHtml(r.id)}">Remove</button>` +
      `</div>` +
      `<div class="reg-item-meta">` +
      `<strong>Owner:</strong> ${escHtml(r.owner)} &nbsp;•&nbsp; ` +
      `<strong>Mobile:</strong> ${escHtml(r.mobile)} &nbsp;•&nbsp; ` +
      `<strong>Category:</strong> ${escHtml(r.category)}<br />` +
      `<strong>City:</strong> ${escHtml(r.city)} &nbsp;•&nbsp; ` +
      `<strong>Amount:</strong> PKR ${rupees(r.amount)} &nbsp;•&nbsp; ` +
      `<strong>Submitted:</strong> ${fmtRegDate(r.at)}` +
      expiry +
      (r.photoCount || r.videoCount ? `<br /><strong>Media:</strong> ${r.photoCount || 0} photo(s), ${r.videoCount || 0} video(s) selected` : "") +
      `</div>` +
      `</div>`;
  }).join("");
};

if (regList) {
  regList.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-reg-del]");
    if (!btn) return;
    const id = btn.getAttribute("data-reg-del");
    const list = getRegistrations();
    const item = list.find((r) => r.id === id);
    if (!item) return;
    if (!confirm(`Remove the registration for "${item.business}"?`)) return;
    store.set(REG_KEY, list.filter((r) => r.id !== id));
    renderRegistrations();
    showToast("Registration removed.");
  });
}

markPlanSelected(getSelectedPlan());
renderPlanSummary();

// ===== Business Ads (CEO panel) =====
// Ad lifecycle: pending -> paid -> live -> expired (or stopped early).
// Payment and activation are both controlled by the CEO after the money is received.
const PLAN_DAYS = { "15days": 15, "30days": 30, "1year": 365 };

const bizAdsModal = document.getElementById("bizAdsModal");
const bizAdsPanel = document.getElementById("bizAdsPanel");
let bizAdsFilter = "all";

const adStatusOf = (ad) => {
  if (ad.status === "live" && ad.expiresAt && new Date(ad.expiresAt).getTime() <= Date.now()) {
    return "expired";
  }
  return ad.status || "pending";
};

// Expiry sweep: anything past its expiry date is marked expired and dropped from live listings.
const sweepExpiredAds = () => {
  const list = getRegistrations();
  let changed = false;
  list.forEach((ad) => {
    if (ad.status === "live" && ad.expiresAt && new Date(ad.expiresAt).getTime() <= Date.now()) {
      ad.status = "expired";
      changed = true;
    }
  });
  if (changed) store.set(REG_KEY, list);
  return changed;
};

const AD_STATUS_LABEL = {
  pending: "Awaiting payment",
  paid: "Payment received",
  live: "Ad Live",
  expired: "Expired",
  stopped: "Stopped"
};

const addPlanDuration = (from, planKey) => {
  const days = PLAN_DAYS[planKey] || 30;
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

const bizAdRowHtml = (ad) => {
  const status = adStatusOf(ad);
  const active = status === "live";
  const expiredTxt = ad.expiresAt ? fmtRegDate(ad.expiresAt) : "";

  // Links may be typed without https://, so normalise before using them as href.
  // SECURITY: only allow http/https to block javascript:/data: schemes.
  const safeLink = (v) => {
    try {
      const s = String(v || "").trim();
      if (!s) return "";
      if (/^(javascript|data|vbscript):/i.test(s)) return "";
      const abs = /^https?:\/\//i.test(s) ? s : `https://${s}`;
      const u = new URL(abs);
      if (u.protocol === "http:" || u.protocol === "https:") return u.href;
    } catch {}
    return "";
  };
  const safeUrl = (u) => safeLink(u);

  const actionButtons = [];
  if (status === "pending") {
    actionButtons.push(`<button type="button" class="biz-ad-btn ok" data-ad-action="paid" data-ad-id="${escHtml(ad.id)}">Payment Received</button>`);
  }
  if (status === "pending" || status === "paid") {
    actionButtons.push(`<button type="button" class="biz-ad-btn go" data-ad-action="live" data-ad-id="${escHtml(ad.id)}">Activate Ad</button>`);
  }
  if (active) {
    actionButtons.push(`<button type="button" class="biz-ad-btn" data-ad-action="extend" data-ad-id="${escHtml(ad.id)}">Extend</button>`);
    actionButtons.push(`<button type="button" class="biz-ad-btn stop" data-ad-action="stop" data-ad-id="${escHtml(ad.id)}">Stop Ad</button>`);
  }
  if (status === "expired" || status === "stopped") {
    actionButtons.push(`<button type="button" class="biz-ad-btn go" data-ad-action="live" data-ad-id="${escHtml(ad.id)}">Re-activate</button>`);
  }
  actionButtons.push(`<button type="button" class="biz-ad-btn del" data-ad-action="delete" data-ad-id="${escHtml(ad.id)}">Delete</button>`);

  return `<article class="biz-ad" data-ad-id="${escHtml(ad.id)}">` +
    `<div class="biz-ad-head">` +
      `<span class="biz-ad-name">${escHtml(ad.business)}</span>` +
      `<span class="biz-ad-plan">${escHtml(ad.planLabel || "Plan")}</span>` +
      `<span class="biz-ad-status s-${status}">${AD_STATUS_LABEL[status]}</span>` +
      `<span class="biz-ad-amount">PKR ${rupees(ad.amount)}</span>` +
    `</div>` +
    `<div class="biz-ad-grid">` +
      `<div><span>Owner</span><strong>${escHtml(ad.owner)}</strong></div>` +
      `<div><span>Mobile</span><strong>${escHtml(ad.mobile)}</strong></div>` +
      `<div><span>WhatsApp</span><strong>${escHtml(ad.whatsapp || ad.mobile)}</strong></div>` +
      `<div><span>Category</span><strong>${escHtml(ad.category)}</strong></div>` +
      `<div><span>City</span><strong>${escHtml(ad.city)}</strong></div>` +
      `<div><span>Submitted</span><strong>${fmtRegDate(ad.at) || "-"}</strong></div>` +
      `<div><span>Media</span><strong>${ad.photoCount || 0} photo(s), ${ad.videoCount || 0} video(s)</strong></div>` +
      (active || expiredTxt ? `<div><span>Expires on</span><strong>${expiredTxt || "-"}</strong></div>` : "") +
    `</div>` +
    (ad.about ? `<p class="biz-ad-about">${escHtml(ad.about)}</p>` : "") +
    (ad.address || ad.website || ad.facebook || ad.instagram || ad.tiktok
      ? `<div class="biz-ad-links">` +
          (ad.address ? `<span class="biz-ad-link plain">📍 ${escHtml(ad.address)}</span>` : "") +
          (ad.website ? `<a class="biz-ad-link" href="${escHtml(safeLink(ad.website))}" target="_blank" rel="noopener noreferrer">🌐 Website</a>` : "") +
          (ad.facebook ? `<a class="biz-ad-link" href="${escHtml(safeLink(ad.facebook))}" target="_blank" rel="noopener noreferrer">Facebook</a>` : "") +
          (ad.instagram ? `<a class="biz-ad-link" href="${escHtml(safeLink(ad.instagram))}" target="_blank" rel="noopener noreferrer">Instagram</a>` : "") +
          (ad.tiktok ? `<a class="biz-ad-link" href="${escHtml(safeLink(ad.tiktok))}" target="_blank" rel="noopener noreferrer">TikTok</a>` : "") +
        `</div>`
      : "") +
    `<div class="biz-ad-actions">${actionButtons.join("")}</div>` +
  `</article>`;
};

const renderBizAdsPanel = () => {
  if (!bizAdsPanel) return;
  sweepExpiredAds();

  const all = getRegistrations().slice().sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
  const counts = { pending: 0, paid: 0, live: 0, expired: 0, stopped: 0 };
  all.forEach((a) => { counts[adStatusOf(a)] = (counts[adStatusOf(a)] || 0) + 1; });

  const filters = [
    ["all", `All (${all.length})`],
    ["pending", `Awaiting (${counts.pending})`],
    ["paid", `Paid (${counts.paid})`],
    ["live", `Live (${counts.live})`],
    ["expired", `Expired (${counts.expired + counts.stopped})`]
  ];

  const rows = bizAdsFilter === "all"
    ? all
    : all.filter((a) => {
        const s = adStatusOf(a);
        if (bizAdsFilter === "expired") return s === "expired" || s === "stopped";
        return s === bizAdsFilter;
      });

  const totalPaid = all.filter((a) => ["paid", "live", "expired", "stopped"].includes(adStatusOf(a)))
    .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

  bizAdsPanel.innerHTML =
    `<button class="admin-close" type="button" data-biz-ads-close aria-label="Close">×</button>` +
    `<h3 class="admin-title">📢 Business Ads</h3>` +
    `<p class="modal-sub">Confirm the payment first, then activate the ad. Expiry is set automatically from the plan.</p>` +

    `<div class="admin-stat-grid">` +
      `<div class="admin-stat"><div class="admin-stat-num">${all.length}</div><div class="admin-stat-lbl">Total Requests</div></div>` +
      `<div class="admin-stat"><div class="admin-stat-num">${counts.pending}</div><div class="admin-stat-lbl">Awaiting Payment</div></div>` +
      `<div class="admin-stat"><div class="admin-stat-num">${counts.live}</div><div class="admin-stat-lbl">Live Ads</div></div>` +
      `<div class="admin-stat"><div class="admin-stat-num">PKR ${rupees(totalPaid)}</div><div class="admin-stat-lbl">Payment Received</div></div>` +
    `</div>` +

    `<div class="biz-ad-filters">` +
      filters.map(([id, label]) =>
        `<button type="button" class="biz-ad-filter${bizAdsFilter === id ? " active" : ""}" data-ad-filter="${id}">${label}</button>`
      ).join("") +
    `</div>` +

    (rows.length
      ? `<div class="biz-ad-list">${rows.map(bizAdRowHtml).join("")}</div>`
      : `<p class="admin-empty">No ads in this list yet.</p>`);
};

const openBizAdsPanel = () => {
  if (!ceoLoggedIn || !ceoUser) { showToast("Business Ads requires CEO login.", true); return; }
  bizAdsFilter = "all";
  renderBizAdsPanel();
  bizAdsModal.classList.add("open");
  bizAdsModal.setAttribute("aria-hidden", "false");
};

const closeBizAdsPanel = () => {
  if (!bizAdsModal) return;
  bizAdsModal.classList.remove("open");
  bizAdsModal.setAttribute("aria-hidden", "true");
  bizAdsPanel.innerHTML = "";
};

const setAdStatus = (id, status, message) => {
  const list = getRegistrations();
  const ad = list.find((r) => r.id === id);
  if (!ad) return;
  ad.status = status;
  if (status === "live") {
    ad.startedAt = new Date().toISOString();
    ad.expiresAt = addPlanDuration(Date.now(), ad.plan);
  }
  if (status === "paid") {
    ad.paidAt = new Date().toISOString();
  }
  store.set(REG_KEY, list);
  renderRegistrations();
  renderBizAdsPanel();
  if (message) showToast(message);
};

document.getElementById("ceoBizAdsPanel")?.addEventListener("click", openBizAdsPanel);

bizAdsModal?.addEventListener("click", (e) => {
  if (e.target === bizAdsModal || e.target.closest("[data-biz-ads-close]")) { closeBizAdsPanel(); return; }

  const filterBtn = e.target.closest("[data-ad-filter]");
  if (filterBtn) { bizAdsFilter = filterBtn.dataset.adFilter; renderBizAdsPanel(); return; }

  const actionBtn = e.target.closest("[data-ad-action]");
  if (!actionBtn) return;

  const id = actionBtn.dataset.adId;
  const action = actionBtn.dataset.adAction;
  const ad = getRegistrations().find((r) => r.id === id);
  if (!ad) return;

  if (action === "paid") {
    setAdStatus(id, "paid", `Payment marked received for ${ad.business}.`);
  } else if (action === "live") {
    setAdStatus(id, "live", `${ad.business} ad is live for ${PLAN_DAYS[ad.plan] || 30} days.`);
  } else if (action === "extend") {
    const list = getRegistrations();
    const item = list.find((r) => r.id === id);
    const base = item.expiresAt && new Date(item.expiresAt).getTime() > Date.now() ? item.expiresAt : Date.now();
    item.expiresAt = addPlanDuration(base, item.plan);
    store.set(REG_KEY, list);
    renderRegistrations();
    renderBizAdsPanel();
    showToast(`${ad.business} ad extended to ${fmtRegDate(item.expiresAt)}.`);
  } else if (action === "stop") {
    const list = getRegistrations();
    const item = list.find((r) => r.id === id);
    item.status = "stopped";
    item.expiresAt = new Date().toISOString();
    store.set(REG_KEY, list);
    renderRegistrations();
    renderBizAdsPanel();
    showToast(`${ad.business} ad stopped.`);
  } else if (action === "delete") {
    if (!confirm(`Delete the registration for "${ad.business}"?`)) return;
    store.set(REG_KEY, getRegistrations().filter((r) => r.id !== id));
    renderRegistrations();
    renderBizAdsPanel();
    showToast("Ad deleted.");
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && bizAdsModal?.classList.contains("open")) closeBizAdsPanel();
});

sweepExpiredAds();
renderRegistrations();

// ===== Init: apply saved removals, rebuild custom categories =====
// Core categories are permanent — strip any builtin keys out of removedKeys.
const sanitizeRemovedKeys = () => {
  const cleaned = (store.get("removedKeys", []) || []).filter((k) => !BUILTIN_CATEGORIES.includes(k));
  if (cleaned.length !== removedKeys.length) store.set("removedKeys", cleaned);
  removedKeys = cleaned;
  return cleaned;
};

const applyRemovedKeys = () => {
  sanitizeRemovedKeys().forEach((key) => {
    document.querySelector(`.industry-card[data-detail="${key}"]`)?.remove();
    document.getElementById(`${key}Detail`)?.remove();
  });
};

applyRemovedKeys();
customCats.forEach(buildCustomCategory);
restoreOwnerAvatar();

// Drop any saved copies of the old built-in posts.
const cleanupRetiredArticles = () => {
  RETIRED_ARTICLE_KEYS.forEach((k) => { try { localStorage.removeItem(k); } catch {} });
};
cleanupRetiredArticles();

refreshOwnerButton();
applyAccess();
initFeatureModules();
updateFeatureBadges();

// ===== Cloud: restore session, pull saved data, refresh UI =====
(async () => {
  try {
    const signedIn = await cloudRestore();
    let authUser = null;
    if (sb) {
      const { data, error } = await sb.auth.getSession();
      if (error) throw error;
      authUser = data.session?.user || null;
    }
    await refreshAccountProfiles(authUser);
    if (ceoLoggedIn) await migrateLegacyReviews();
    await loadReviews();
    if (signedIn) {
      removedKeys = store.get("removedKeys", []);
      customCats = store.get("customCats", []);
      applyRemovedKeys();
      customCats.forEach(buildCustomCategory);
      refreshOwnerButton();
      applyAccess();
      initFeatureModules();
      updateFeatureBadges();
      updateCeoStats();
      restoreOwnerAvatar();
      if (ceoLoggedIn && ceoUser) showCeoPanel();
      showToast(`Cloud data synced — welcome back, ${ceoUser.name}!`);
    }
  } catch (e) {
    console.warn("Cloud init failed:", e);
    showToast(`Account or cloud data could not be restored: ${e.message || "Cloud service error."}`, true);
  }
})();

if (sb) {
  sb.auth.onAuthStateChange((event) => {
    if (event !== "SIGNED_OUT") return;
    setTimeout(() => {
      cloudUser = null;
      cloudOwnerProfiles = null;
      setCeoSession(false);
      refreshAccountProfiles(null).catch((error) => {
        showToast(`Account state could not be cleared: ${error.message || "Cloud service error."}`, true);
      });
    }, 0);
  });
}
