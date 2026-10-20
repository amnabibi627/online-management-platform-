// ===== Supabase cloud (login + data sync) =====
const SUPABASE_URL = "https://lsoprwhjnurfqnsymhzf.supabase.co";
const SUPABASE_KEY = "sb_publishable_Q_-tMvYWJGriBaASXZm7zQ__dXPpRMD";
const sb = window.supabase && typeof window.supabase.createClient === "function"
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;
const CLOUD_TABLE = "app_data";
let cloudUser = null;
let cloudBusy = false;
let cloudTimer = null;
let cloudPending = new Map();

const cloudEmail = (mobile) => `${mobile}@bms.app`;

const cloudState = (cls, label) => {
  const pill = document.getElementById("cloudPill");
  if (!pill) return;
  pill.classList.remove("connected", "syncing", "error");
  if (cls) pill.classList.add(cls);
  const t = document.getElementById("cloudPillText");
  if (t) t.textContent = label;
};

const SYNC_KEY = (k) => !!k && !k.startsWith("sb-") && (
  k === "ownerAccount" || k === "owners" || k === "customCats" || k === "removedKeys" ||
  k === "ceoMode" || k === "ceoAccount" || k.endsWith(":data"));

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
      if (row.value === null || row.value === undefined) localStorage.removeItem(row.key);
      else localStorage.setItem(row.key, JSON.stringify(row.value));
    } catch {}
  });
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
    const meta = cloudUser.user_metadata || {};
    ceoUser = store.get("ceoAccount", null) ||
      (meta.name ? { name: meta.name, mobile: meta.mobile || "", codeHash: "" } : null);
    if (ceoUser) { store.set("ceoAccount", ceoUser); setCeoSession(true); }
    return !!ceoUser;
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
const sections = [...document.querySelectorAll("section[id]")];
const navLinks = [...mainNav.querySelectorAll(".nav-link")];

const setActiveLink = () => {
  const scrollPos = window.scrollY + 120;
  let current = "home";
  sections.forEach((section) => {
    if (scrollPos >= section.offsetTop) current = section.id;
  });
  navLinks.forEach((link) => {
    const href = link.getAttribute("href").replace("#", "");
    link.classList.toggle("active", href === current || (current === "home" && href === "top"));
  });
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
  if (!card) return;

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
  loginMobile: { input: document.getElementById("ofLoginMobile"), err: document.getElementById("errLoginMobile") },
};

const loadOwner = () => {
  try { return JSON.parse(localStorage.getItem("ownerAccount")); } catch { return null; }
};
let owner = loadOwner();

const setError = (f, msg) => {
  f.err.textContent = msg || "";
  f.input.classList.toggle("invalid", !!msg);
};

const openOwnerModal = (mode) => {
  const isSignup = mode === "signup";
  ownerModalTitle.textContent = isSignup ? "Owner Sign Up" : "Owner Login";
  ownerModalSub.textContent = isSignup
    ? "Create your owner account and choose your business category."
    : "Enter your registered mobile number to log in.";
  signupFields.hidden = !isSignup;
  loginField.hidden = isSignup;
  ownerSubmit.textContent = isSignup ? "Create Owner Account" : "Login";
  Object.values(fields).forEach((f) => setError(f, ""));
  ownerForm.reset();
  ownerModal.classList.add("open");
  ownerModal.setAttribute("aria-hidden", "false");
};

const closeOwnerModal = () => {
  ownerModal.classList.remove("open");
  ownerModal.setAttribute("aria-hidden", "true");
};

const refreshOwnerButton = () => {
  ownerBtn.textContent = owner ? "Owner Login" : "Owner Sign Up";
};

const ownerAllowedCats = (o) =>
  Array.isArray(o && o.categories) ? o.categories : (o && o.category ? [o.category] : []);

const applyAccess = () => {
  document.querySelectorAll(".industry-card").forEach((card) => {
    if (ceoMode) {
      card.classList.remove("locked");
      card.classList.remove("allowed");
      if (!card.querySelector(".card-remove")) {
        const rm = document.createElement("button");
        rm.type = "button";
        rm.className = "card-remove";
        rm.title = "Remove category";
        rm.textContent = "✕";
        card.appendChild(rm);
      }
    } else {
      card.querySelector(".card-remove")?.remove();
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

  if (name.length < 3) { setError(fields.name, "Enter your full name (min 3 letters)."); ok = false; } else setError(fields.name, "");
  if (!MOBILE_RE.test(mobile)) { setError(fields.mobile, "Enter a valid number, e.g. 03123456789 or +923123456789."); ok = false; } else setError(fields.mobile, "");
  const ageNum = Number(age);
  if (!age || !Number.isInteger(ageNum) || ageNum < 18 || ageNum > 100) { setError(fields.age, "Age must be between 18 and 100."); ok = false; } else setError(fields.age, "");
  if (city.length < 2) { setError(fields.city, "Enter your city."); ok = false; } else setError(fields.city, "");
  if (!category) { setError(fields.category, "Select one category — you will only get access to it."); ok = false; } else setError(fields.category, "");

  if (!ok) return null;
  return { name, mobile, age: ageNum, city, category };
};

ownerBtn.addEventListener("click", () => openOwnerModal(owner ? "login" : "signup"));

document.getElementById("ownerModalClose").addEventListener("click", closeOwnerModal);
ownerModal.addEventListener("click", (e) => { if (e.target === ownerModal) closeOwnerModal(); });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && ownerModal.classList.contains("open")) closeOwnerModal();
});

ownerForm.addEventListener("submit", (e) => {
  e.preventDefault();

  if (!owner) {
    const data = validateSignup();
    if (!data) { showToast("Signup failed — please fix the fields (valid mobile number required).", true); return; }
    owner = { ...data, categories: [data.category] };
    try { localStorage.setItem("ownerAccount", JSON.stringify(owner)); } catch {}
    const ownersList = store.get("owners", []);
    if (!ownersList.some((o) => o.mobile === owner.mobile)) {
      ownersList.push({ name: owner.name, mobile: owner.mobile, age: owner.age, city: owner.city, categories: [owner.category] });
      store.set("owners", ownersList);
    }
    closeOwnerModal();
    refreshOwnerButton();
    applyAccess();
    showToast(`Welcome, ${owner.name}! Access: ${labelFor(owner.category)} only.`);
  } else {
    const mobile = normMobile(fields.loginMobile.input.value);
    if (!MOBILE_RE.test(mobile)) { setError(fields.loginMobile, "Enter a valid mobile number, e.g. 03123456789."); showToast("Login failed — invalid mobile number.", true); return; }
    if (mobile !== owner.mobile) { setError(fields.loginMobile, "This number is not registered."); showToast("Login failed — number not registered.", true); return; }
    setError(fields.loginMobile, "");
    closeOwnerModal();
    showToast(`Logged in — welcome back, ${owner.name}! Access: ${labelFor(owner.category)} only.`);
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

let ceoMode = localStorage.getItem("ceoMode") === "all";
let removedKeys = store.get("removedKeys", []);
let customCats = store.get("customCats", []);

const ceoBtn = document.getElementById("ceoBtn");
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

// Sirf CEO (Amna Bibi) is code se account register kar sakti hain — code yahan badal sakti hain
const CEO_SECRET_CODE = "AMNA2026";

const hashSecret = (s) => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
};

let ceoUser = store.get("ceoAccount", null);
let ceoLoggedIn = !!ceoUser && store.get("ceoLoggedIn", false) === true;

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
  document.getElementById("ceoLoginTitle").textContent = isNew ? "Create CEO Account" : "Owner Account Login";
  document.getElementById("ceoLoginSub").textContent = isNew
    ? "Registration is CEO-only — secret code required."
    : "Login with your registered mobile number and secret code.";
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
};

const showCeoPanel = () => {
  ceoLogin.hidden = true;
  ceoPanel.hidden = false;
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
  try { localStorage.setItem("ceoLoggedIn", JSON.stringify(value)); } catch {}
};

ceoLoginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!ceoUser) {
    const name = ceoNameInput.value.trim();
    const mobile = normMobile(ceoMobileInput.value);
    const code = ceoCodeInput.value.trim();
    let ok = true;
    if (name.length < 3) { ceoErrName.textContent = "Enter your full name (min 3 letters)."; ceoNameInput.classList.add("invalid"); ok = false; }
    else { ceoErrName.textContent = ""; ceoNameInput.classList.remove("invalid"); }
    if (!MOBILE_RE.test(mobile)) { ceoErrMobile.textContent = "Enter a valid number, e.g. 03123456789."; ceoMobileInput.classList.add("invalid"); ok = false; }
    else { ceoErrMobile.textContent = ""; ceoMobileInput.classList.remove("invalid"); }
    if (code !== CEO_SECRET_CODE) { ceoErrCode.textContent = "Wrong secret code — only the CEO can register."; ceoCodeInput.classList.add("invalid"); ok = false; }
    else { ceoErrCode.textContent = ""; ceoCodeInput.classList.remove("invalid"); }
    if (!ok) { showToast("Registration blocked — secret code required.", true); return; }

    if (sb) {
      cloudState("syncing", "Creating…");
      const { data, error } = await sb.auth.signUp({
        email: cloudEmail(mobile),
        password: code,
        options: { data: { name, mobile } }
      });
      if (error) {
        cloudState("error", "Error");
        if (/already registered/i.test(error.message || "")) {
          showToast("Account already exists — Login with mobile + code.", true);
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
      ceoUser = { name, mobile, codeHash: hashSecret(code) };
      store.set("ceoAccount", ceoUser);
      setCeoSession(true);
      showCeoPanel();
      showToast(`CEO account created & connected to cloud — welcome, ${name}!`);
      cloudBusy = false;
      await cloudPushAll();
      cloudState("connected", "Synced ✓");
      return;
    }

    ceoUser = { name, mobile, codeHash: hashSecret(code) };
    store.set("ceoAccount", ceoUser);
    setCeoSession(true);
    showCeoPanel();
    showToast(`CEO account created (local) — welcome, ${name}!`);
  } else {
    const mobile = normMobile(ceoMobileInput.value);
    const code = ceoCodeInput.value.trim();
    if (!MOBILE_RE.test(mobile)) {
      ceoErrMobile.textContent = "Enter a valid number, e.g. 03123456789.";
      ceoMobileInput.classList.add("invalid");
      showToast("Login failed — invalid mobile number.", true);
      return;
    }
    if (!code) {
      ceoErrCode.textContent = "Enter your secret code.";
      ceoCodeInput.classList.add("invalid");
      showToast("Login failed — secret code required.", true);
      return;
    }

    if (sb) {
      cloudState("syncing", "Signing in…");
      const { data, error } = await sb.auth.signInWithPassword({
        email: cloudEmail(mobile),
        password: code
      });
      if (error) {
        cloudState("error", "Error");
        if (/invalid login credentials/i.test(error.message || "") && ceoUser && mobile !== ceoUser.mobile) {
          ceoErrMobile.textContent = "This number is not registered in cloud.";
          ceoMobileInput.classList.add("invalid");
        } else if (/invalid login credentials/i.test(error.message || "")) {
          ceoErrCode.textContent = "Wrong secret code.";
          ceoCodeInput.classList.add("invalid");
        }
        showToast(authErrMsg(error), true);
        return;
      }
      cloudUser = data.user;
      ceoErrMobile.textContent = ""; ceoMobileInput.classList.remove("invalid");
      ceoErrCode.textContent = ""; ceoCodeInput.classList.remove("invalid");
      const meta = data.user.user_metadata || {};
      if (meta.name && (!ceoUser || !ceoUser.name)) ceoUser = { name: meta.name, mobile: meta.mobile || mobile, codeHash: hashSecret(code) };
      store.set("ceoAccount", ceoUser);
      setCeoSession(true);
      cloudBusy = true;
      const ok = await cloudPull();
      cloudBusy = false;
      showCeoPanel();
      showToast(ok ? `Logged in — cloud data synced. Welcome back, ${ceoUser.name}!` : `Logged in — welcome back, ${ceoUser.name}!`);
      return;
    }

    if (mobile !== ceoUser.mobile) {
      ceoErrMobile.textContent = "This number is not registered.";
      ceoMobileInput.classList.add("invalid");
      showToast("Login failed — number not registered.", true);
      return;
    }
    // code match: purana hash ya current script wala code (jis se aap ne code badla ho)
    const codeOk = (ceoUser.codeHash && hashSecret(code) === ceoUser.codeHash) || code === CEO_SECRET_CODE;
    if (!codeOk) {
      ceoErrCode.textContent = "Wrong secret code.";
      ceoCodeInput.classList.add("invalid");
      showToast("Login failed — wrong secret code.", true);
      return;
    }
    if (!ceoUser.codeHash || hashSecret(code) !== ceoUser.codeHash) {
      ceoUser.codeHash = hashSecret(code);
      store.set("ceoAccount", ceoUser);
    }
    ceoErrCode.textContent = "";
    ceoCodeInput.classList.remove("invalid");
    setCeoSession(true);
    showCeoPanel();
    showToast(`Logged in — welcome back, ${ceoUser.name}!`);
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

// ===== Feature modules: every detail-card is a working CRUD module =====
const BUILTIN_CATEGORIES = ["clinic", "academy", "restaurant", "generalstore", "beautysalon", "petrolpump", "medicalstore", "laboratory"];
const FEATURE_VERSION = 1;

const slugify = (s) =>
  String(s || "").trim().toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const F = (key, label, type, required, options) => ({ key, label, type, required: !!required, options: options || null });

const GENERIC_FEATURES = [
  { id: "records", name: "Records", icon: "📁", desc: "Store every important record digitally and find it in seconds.",
    fields: [F("title", "Record Title", "text", 1), F("date", "Date", "date", 1), F("details", "Details", "textarea", 0), F("status", "Status", "select", 1, ["Active", "Archived"])] },
  { id: "contacts", name: "Contacts", icon: "📇", desc: "Customers, vendors and partners in one clean contact book.",
    fields: [F("name", "Full Name", "text", 1), F("mobile", "Mobile Number", "tel", 1), F("email", "Email", "text", 0), F("address", "Address", "text", 0), F("notes", "Notes", "textarea", 0)] },
  { id: "invoices", name: "Invoices", icon: "🧾", desc: "Create invoices and track paid and pending payments.",
    fields: [F("invoice", "Invoice #", "text", 1), F("client", "Client / Customer", "text", 0), F("amount", "Amount", "number", 1), F("date", "Date", "date", 1), F("status", "Status", "select", 1, ["Paid", "Pending", "Partial"])] },
  { id: "products", name: "Products", icon: "📦", desc: "Catalog products with price, quantity and stock status.",
    fields: [F("product", "Product Name", "text", 1), F("category", "Category", "text", 0), F("price", "Price", "number", 1), F("qty", "Quantity", "number", 1), F("status", "Status", "select", 1, ["In Stock", "Low Stock", "Out of Stock"])] },
  { id: "staff", name: "Staff", icon: "🧑‍💼", desc: "Staff records, roles, shifts and joining dates.",
    fields: [F("name", "Full Name", "text", 1), F("role", "Role", "text", 1), F("mobile", "Mobile Number", "tel", 0), F("shift", "Shift", "text", 0), F("joined", "Joining Date", "date", 0)] },
  { id: "appointments", name: "Appointments", icon: "📅", desc: "Schedule appointments and never miss a booking.",
    fields: [F("client", "Client Name", "text", 1), F("date", "Date", "date", 1), F("time", "Time", "time", 1), F("service", "Service / Purpose", "text", 0), F("status", "Status", "select", 1, ["Pending", "Confirmed", "Done", "Cancelled"])] },
  { id: "tasks", name: "Tasks", icon: "✅", desc: "Assign tasks, set priorities and track progress.",
    fields: [F("title", "Task Title", "text", 1), F("assignee", "Assigned To", "text", 0), F("due", "Due Date", "date", 0), F("priority", "Priority", "select", 1, ["Low", "Medium", "High"]), F("status", "Status", "select", 1, ["Open", "In Progress", "Done"])] },
  { id: "expenses", name: "Expenses", icon: "💸", desc: "Record expenses and see where the money goes.",
    fields: [F("title", "Expense Title", "text", 1), F("amount", "Amount", "number", 1), F("date", "Date", "date", 1), F("category", "Category", "text", 0), F("notes", "Notes", "textarea", 0)] },
  { id: "sales", name: "Sales", icon: "💰", desc: "Log every sale with quantity, amount and payment mode.",
    fields: [F("date", "Date", "date", 1), F("item", "Item / Service", "text", 1), F("qty", "Quantity", "number", 1), F("amount", "Amount", "number", 1), F("payment", "Payment Mode", "select", 1, ["Cash", "Card", "Online", "Credit"])] },
  { id: "reports", name: "Reports", icon: "📊", desc: "Save quick reports with values, types and statuses.",
    fields: [F("title", "Report Title", "text", 1), F("date", "Date", "date", 1), F("value", "Value / Amount", "number", 0), F("type", "Type", "text", 0), F("status", "Status", "select", 1, ["Draft", "Final"])] },
  { id: "notes", name: "Notes", icon: "📝", desc: "Quick notes and reminders for your daily work.",
    fields: [F("title", "Note Title", "text", 1), F("note", "Note", "textarea", 1), F("date", "Date", "date", 1), F("tag", "Tag", "text", 0)] },
  { id: "settings", name: "Settings", icon: "⚙️", desc: "Simple name and value settings for this category.",
    fields: [F("name", "Setting Name", "text", 1), F("value", "Value", "text", 1), F("type", "Type", "select", 1, ["Text", "Number", "Yes / No"]), F("updated", "Last Updated", "date", 0)] }
];

const FEATURE_REGISTRY = {
  clinic: {
    "patient-records": { name: "Patient Records", icon: "📁", fields: [
      F("name", "Patient Name", "text", 1), F("mobile", "Mobile Number", "tel", 1), F("age", "Age", "number", 1),
      F("gender", "Gender", "select", 1, ["Male", "Female", "Other"]), F("address", "Address", "text", 0), F("blood", "Blood Group", "text", 0)] },
    "smart-appointments": { name: "Smart Appointments", icon: "📅", fields: [
      F("patient", "Patient Name", "text", 1), F("doctor", "Doctor", "text", 1), F("date", "Date", "date", 1),
      F("time", "Time", "time", 1), F("status", "Status", "select", 1, ["Pending", "Confirmed", "Completed", "Cancelled"])] },
    "opd-token-system": { name: "OPD Token System", icon: "🎫", fields: [
      F("token", "Token #", "text", 1), F("patient", "Patient Name", "text", 1), F("doctor", "Doctor", "text", 0),
      F("issued", "Issued Date", "date", 1), F("status", "Status", "select", 1, ["Waiting", "In Progress", "Done"])] },
    "digital-prescriptions": { name: "Digital Prescriptions", icon: "📝", fields: [
      F("patient", "Patient Name", "text", 1), F("doctor", "Doctor", "text", 1), F("medicines", "Medicines", "textarea", 1),
      F("date", "Date", "date", 1), F("notes", "Notes", "textarea", 0)] },
    "billing-and-payments": { name: "Billing & Payments", icon: "💳", fields: [
      F("invoice", "Invoice #", "text", 1), F("patient", "Patient Name", "text", 1), F("amount", "Amount", "number", 1),
      F("date", "Date", "date", 1), F("status", "Status", "select", 1, ["Paid", "Pending", "Partial"])] },
    "lab-tests-and-reports": { name: "Lab Tests & Reports", icon: "🧪", fields: [
      F("test", "Test Name", "text", 1), F("patient", "Patient Name", "text", 1), F("doctor", "Doctor", "text", 0),
      F("result", "Result", "textarea", 0), F("date", "Date", "date", 1)] },
    "doctor-profiles": { name: "Doctor Profiles", icon: "🧑‍⚕️", fields: [
      F("name", "Doctor Name", "text", 1), F("specialty", "Specialty", "text", 1), F("mobile", "Mobile Number", "tel", 0),
      F("timing", "Timings", "text", 0), F("fee", "Visit Fee", "number", 0)] },
    "staff-management": { name: "Staff Management", icon: "🧑‍🔧", fields: [
      F("name", "Full Name", "text", 1), F("role", "Role", "text", 1), F("shift", "Shift", "text", 0),
      F("mobile", "Mobile Number", "tel", 0), F("joined", "Joining Date", "date", 0)] },
    "pharmacy-stock": { name: "Pharmacy Stock", icon: "💊", fields: [
      F("item", "Medicine Item", "text", 1), F("qty", "Quantity", "number", 1), F("expiry", "Expiry Date", "date", 0),
      F("price", "Price", "number", 1), F("batch", "Batch #", "text", 0)] },
    "revenue-reports": { name: "Revenue Reports", icon: "📊", fields: [
      F("source", "Revenue Source", "text", 1), F("amount", "Amount", "number", 1), F("date", "Date", "date", 1),
      F("method", "Payment Method", "select", 0, ["Cash", "Card", "Online", "Other"])] },
    "expense-tracking": { name: "Expense Tracking", icon: "💸", fields: [
      F("title", "Expense Title", "text", 1), F("amount", "Amount", "number", 1), F("date", "Date", "date", 1),
      F("category", "Category", "text", 0), F("notes", "Notes", "textarea", 0)] },
    "patient-reminders": { name: "Patient Reminders", icon: "✉️", fields: [
      F("patient", "Patient Name", "text", 1), F("mobile", "Mobile Number", "tel", 1), F("channel", "Channel", "select", 1, ["SMS", "WhatsApp", "Call"]),
      F("due", "Due Date", "date", 1), F("message", "Message", "textarea", 0)] }
  },
  academy: {
    "student-profiles": { name: "Student Profiles", icon: "👨‍🎓", fields: [
      F("name", "Student Name", "text", 1), F("mobile", "Mobile Number", "tel", 1), F("class", "Class / Batch", "text", 1),
      F("guardian", "Guardian Name", "text", 0), F("address", "Address", "textarea", 0)] },
    "course-management": { name: "Course Management", icon: "📚", fields: [
      F("course", "Course Name", "text", 1), F("duration", "Duration", "text", 1), F("level", "Level", "select", 0, ["Beginner", "Intermediate", "Advanced"]),
      F("fee", "Course Fee", "number", 0), F("seats", "Total Seats", "number", 0)] },
    "class-timetable": { name: "Class Timetable", icon: "🗓️", fields: [
      F("batch", "Batch", "text", 1), F("subject", "Subject", "text", 1), F("day", "Day", "select", 1, ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]),
      F("time", "Time", "time", 1), F("teacher", "Teacher", "text", 0), F("room", "Room", "text", 0)] },
    "attendance": { name: "Attendance", icon: "✅", fields: [
      F("student", "Student Name", "text", 1), F("date", "Date", "date", 1), F("status", "Status", "select", 1, ["Present", "Absent", "Leave"]),
      F("remarks", "Remarks", "text", 0)] },
    "fee-automation": { name: "Fee Automation", icon: "💰", fields: [
      F("student", "Student Name", "text", 1), F("amount", "Amount", "number", 1), F("due", "Due Date", "date", 1),
      F("invoice", "Invoice #", "text", 0), F("status", "Status", "select", 1, ["Paid", "Pending", "Overdue"])] },
    "fee-reports": { name: "Fee Reports", icon: "🧾", fields: [
      F("student", "Student Name", "text", 1), F("class", "Class / Batch", "text", 0), F("amount", "Amount", "number", 1),
      F("month", "Month", "text", 1), F("status", "Status", "select", 1, ["Paid", "Pending", "Defaulter"])] },
    "exams-and-grades": { name: "Exams & Grades", icon: "📝", fields: [
      F("student", "Student Name", "text", 1), F("subject", "Subject", "text", 1), F("score", "Score", "number", 1),
      F("grade", "Grade", "text", 0), F("date", "Exam Date", "date", 0)] },
    "assignments": { name: "Assignments", icon: "📄", fields: [
      F("title", "Assignment Title", "text", 1), F("course", "Course / Batch", "text", 1), F("due", "Due Date", "date", 1),
      F("marks", "Total Marks", "number", 0), F("status", "Status", "select", 1, ["Open", "Submitted", "Graded"])] },
    "teacher-profiles": { name: "Teacher Profiles", icon: "🧑‍🏫", fields: [
      F("name", "Teacher Name", "text", 1), F("subject", "Subjects", "text", 1), F("mobile", "Mobile Number", "tel", 0),
      F("timing", "Timings", "text", 0), F("salary", "Salary", "number", 0)] },
    "parent-updates": { name: "Parent Updates", icon: "👨‍👩‍👦", fields: [
      F("student", "Student Name", "text", 1), F("parent", "Parent Name", "text", 1), F("mobile", "Mobile Number", "tel", 1),
      F("message", "Update Message", "textarea", 1), F("date", "Date", "date", 1)] },
    "course-material": { name: "Course Material", icon: "📖", fields: [
      F("title", "Material Title", "text", 1), F("course", "Course / Batch", "text", 1), F("type", "Type", "select", 0, ["Notes", "Video", "Link", "PDF"]),
      F("link", "Link", "text", 0), F("date", "Date", "date", 0)] },
    "income-reports": { name: "Income Reports", icon: "📊", fields: [
      F("source", "Income Source", "text", 1), F("amount", "Amount", "number", 1), F("date", "Date", "date", 1),
      F("notes", "Notes", "textarea", 0)] }
  },
  restaurant: {
    "dynamic-pos": { name: "Dynamic POS", icon: "🧾", fields: [
      F("order", "Order #", "text", 1), F("table", "Table", "text", 0), F("items", "Items", "text", 1),
      F("amount", "Amount", "number", 1), F("payment", "Payment Mode", "select", 1, ["Cash", "Card", "Online"])] },
    "live-kitchen-orders": { name: "Live Kitchen Orders", icon: "👨‍🍳", fields: [
      F("ticket", "Ticket #", "text", 1), F("table", "Table", "text", 0), F("items", "Order Items", "textarea", 1),
      F("status", "Status", "select", 1, ["New", "Preparing", "Ready", "Served"]), F("time", "Time", "time", 0)] },
    "table-management": { name: "Table Management", icon: "🪑", fields: [
      F("table", "Table #", "text", 1), F("seats", "Seats", "number", 1), F("status", "Status", "select", 1, ["Free", "Occupied", "Reserved"]),
      F("waiter", "Waiter", "text", 0)] },
    "menu-management": { name: "Menu Management", icon: "🍔", fields: [
      F("dish", "Dish Name", "text", 1), F("category", "Category", "text", 1), F("price", "Price", "number", 1),
      F("available", "Available", "select", 0, ["Yes", "No"])] },
    "order-types": { name: "Order Types", icon: "🛵", fields: [
      F("order", "Order #", "text", 1), F("type", "Order Type", "select", 1, ["Dine-in", "Takeaway", "Delivery"]),
      F("customer", "Customer", "text", 0), F("amount", "Amount", "number", 1)] },
    "staff-and-waiters": { name: "Staff & Waiters", icon: "🧑‍🍳", fields: [
      F("name", "Full Name", "text", 1), F("role", "Role", "text", 1), F("shift", "Shift", "text", 0),
      F("mobile", "Mobile Number", "tel", 0), F("tables", "Tables Covered", "text", 0)] },
    "inventory-and-stock": { name: "Inventory & Stock", icon: "📦", fields: [
      F("item", "Item Name", "text", 1), F("qty", "Quantity", "number", 1), F("unit", "Unit", "text", 0),
      F("reorder", "Reorder Level", "number", 0), F("expiry", "Expiry Date", "date", 0)] },
    "purchases-and-suppliers": { name: "Purchases & Suppliers", icon: "🚚", fields: [
      F("supplier", "Supplier Name", "text", 1), F("items", "Items", "text", 1), F("amount", "Amount", "number", 1),
      F("date", "Date", "date", 1), F("status", "Status", "select", 0, ["Ordered", "Received", "Pending"])] },
    "discounts-and-promotions": { name: "Discounts & Promotions", icon: "🏷️", fields: [
      F("code", "Coupon Code", "text", 1), F("type", "Discount Type", "select", 1, ["Flat", "Percent"]),
      F("value", "Discount Value", "number", 1), F("valid", "Valid Till", "date", 0), F("status", "Status", "select", 0, ["Active", "Inactive"])] },
    "payments-and-invoicing": { name: "Payments & Invoicing", icon: "💳", fields: [
      F("invoice", "Invoice #", "text", 1), F("order", "Order #", "text", 0), F("amount", "Amount", "number", 1),
      F("date", "Date", "date", 1), F("method", "Payment Method", "select", 1, ["Cash", "Card", "Online"])] },
    "sales-reports": { name: "Sales Reports", icon: "📊", fields: [
      F("date", "Date", "date", 1), F("amount", "Total Sales", "number", 1), F("orders", "Orders Count", "number", 0),
      F("top", "Top Selling Item", "text", 0), F("channel", "Channel", "select", 0, ["Dine-in", "Takeaway", "Delivery"])] },
    "expense-tracking": { name: "Expense Tracking", icon: "💸", fields: [
      F("title", "Expense Title", "text", 1), F("amount", "Amount", "number", 1), F("date", "Date", "date", 1),
      F("category", "Category", "text", 0), F("notes", "Notes", "textarea", 0)] }
  },
  generalstore: {
    "dynamic-pos": { name: "Dynamic POS", icon: "🧾", fields: [
      F("bill", "Bill #", "text", 1), F("items", "Items", "text", 1), F("qty", "Quantity", "number", 1),
      F("amount", "Amount", "number", 1), F("payment", "Payment Mode", "select", 1, ["Cash", "Card", "Credit"])] },
    "barcode-scanning": { name: "Barcode Scanning", icon: "📱", fields: [
      F("barcode", "Barcode", "text", 1), F("product", "Product Name", "text", 1), F("price", "Price", "number", 1),
      F("scanned", "Scanned Date", "date", 1)] },
    "real-time-inventory": { name: "Real-time Inventory", icon: "📦", fields: [
      F("item", "Item Name", "text", 1), F("qty", "Quantity", "number", 1), F("unit", "Unit", "text", 0),
      F("price", "Price", "number", 0), F("updated", "Updated Date", "date", 1)] },
    "supplier-tracking": { name: "Supplier Tracking", icon: "🚚", fields: [
      F("supplier", "Supplier Name", "text", 1), F("mobile", "Mobile Number", "tel", 0), F("items", "Supplied Items", "text", 0),
      F("pending", "Pending Amount", "number", 0), F("last", "Last Order Date", "date", 0)] },
    "purchase-orders": { name: "Purchase Orders", icon: "📝", fields: [
      F("po", "PO #", "text", 1), F("supplier", "Supplier Name", "text", 1), F("amount", "Amount", "number", 1),
      F("date", "Date", "date", 1), F("status", "Status", "select", 0, ["Draft", "Ordered", "Delivered"])] },
    "product-catalog": { name: "Product Catalog", icon: "🛒", fields: [
      F("product", "Product Name", "text", 1), F("category", "Category", "text", 1), F("price", "Price", "number", 1),
      F("unit", "Unit", "text", 0), F("barcode", "Barcode", "text", 0)] },
    "stock-alerts": { name: "Stock Alerts", icon: "⚠️", fields: [
      F("item", "Item Name", "text", 1), F("qty", "Current Quantity", "number", 1), F("threshold", "Min Level", "number", 1),
      F("status", "Status", "select", 1, ["Low", "Out of Stock", "OK"])] },
    "expiry-alerts": { name: "Expiry Alerts", icon: "🗓️", fields: [
      F("item", "Item Name", "text", 1), F("batch", "Batch #", "text", 0), F("expiry", "Expiry Date", "date", 1),
      F("qty", "Quantity", "number", 0), F("status", "Status", "select", 1, ["OK", "Near Expiry", "Expired"])] },
    "customer-khata": { name: "Customer Khata", icon: "📒", fields: [
      F("customer", "Customer Name", "text", 1), F("mobile", "Mobile Number", "tel", 0), F("balance", "Balance", "number", 1),
      F("last", "Last Paid Date", "date", 0), F("status", "Status", "select", 1, ["Clear", "Pending"])] },
    "sales-reports": { name: "Sales Reports", icon: "📊", fields: [
      F("date", "Date", "date", 1), F("amount", "Total Sales", "number", 1), F("bills", "Bills Count", "number", 0),
      F("items", "Top Items", "text", 0), F("payment", "Payment Mode", "select", 0, ["Cash", "Card", "Credit"])] },
    "expense-tracking": { name: "Expense Tracking", icon: "💸", fields: [
      F("title", "Expense Title", "text", 1), F("amount", "Amount", "number", 1), F("date", "Date", "date", 1),
      F("category", "Category", "text", 0), F("notes", "Notes", "textarea", 0)] },
    "profit-and-loss": { name: "Profit & Loss", icon: "💰", fields: [
      F("month", "Month", "text", 1), F("revenue", "Revenue", "number", 1), F("expenses", "Expenses", "number", 1),
      F("profit", "Profit", "number", 1), F("notes", "Notes", "textarea", 0)] }
  },
  beautysalon: {
    "online-bookings": { name: "Online Bookings", icon: "📅", fields: [
      F("client", "Client Name", "text", 1), F("service", "Service", "text", 1), F("date", "Date", "date", 1),
      F("time", "Time", "time", 1), F("status", "Status", "select", 1, ["Pending", "Confirmed", "Done", "Cancelled"])] },
    "stylist-bookings": { name: "Stylist Bookings", icon: "🧑‍🎨", fields: [
      F("client", "Client Name", "text", 1), F("stylist", "Stylist", "text", 1), F("service", "Service", "text", 1),
      F("date", "Date", "date", 1), F("status", "Status", "select", 1, ["Pending", "Confirmed", "Done"])] },
    "appointment-calendar": { name: "Appointment Calendar", icon: "🗓️", fields: [
      F("date", "Date", "date", 1), F("time", "Time", "time", 1), F("client", "Client Name", "text", 1),
      F("stylist", "Stylist", "text", 0), F("status", "Status", "select", 1, ["Booked", "Cancelled", "Completed"])] },
    "service-menu": { name: "Service Menu", icon: "✂️", fields: [
      F("service", "Service Name", "text", 1), F("category", "Category", "text", 0), F("duration", "Duration", "text", 0),
      F("price", "Price", "number", 1)] },
    "client-logs": { name: "Client Logs", icon: "📒", fields: [
      F("client", "Client Name", "text", 1), F("mobile", "Mobile Number", "tel", 0), F("visit", "Last Visit", "date", 1),
      F("service", "Service Taken", "text", 0), F("notes", "Notes", "textarea", 0)] },
    "staff-management": { name: "Staff Management", icon: "🧑‍💼", fields: [
      F("name", "Full Name", "text", 1), F("role", "Role", "text", 1), F("shift", "Shift", "text", 0),
      F("mobile", "Mobile Number", "tel", 0), F("commission", "Commission %", "number", 0)] },
    "pos-and-billing": { name: "POS & Billing", icon: "🧾", fields: [
      F("invoice", "Invoice #", "text", 1), F("client", "Client Name", "text", 0), F("service", "Service", "text", 0),
      F("amount", "Amount", "number", 1), F("method", "Payment Method", "select", 1, ["Cash", "Card", "Online"])] },
    "packages-and-membership": { name: "Packages & Membership", icon: "🎁", fields: [
      F("package", "Package Name", "text", 1), F("client", "Client Name", "text", 1), F("price", "Price", "number", 1),
      F("valid", "Valid Till", "date", 0), F("status", "Status", "select", 1, ["Active", "Expired"])] },
    "product-inventory": { name: "Product Inventory", icon: "🧴", fields: [
      F("item", "Product Name", "text", 1), F("qty", "Quantity", "number", 1), F("price", "Price", "number", 0),
      F("expiry", "Expiry Date", "date", 0), F("status", "Status", "select", 1, ["In Stock", "Low Stock", "Out of Stock"])] },
    "offers-and-coupons": { name: "Offers & Coupons", icon: "🏷️", fields: [
      F("code", "Coupon Code", "text", 1), F("discount", "Discount", "text", 1), F("valid", "Valid Till", "date", 0),
      F("status", "Status", "select", 1, ["Active", "Inactive"])] },
    "revenue-reports": { name: "Revenue Reports", icon: "📊", fields: [
      F("date", "Date", "date", 1), F("amount", "Amount", "number", 1), F("stylist", "Stylist", "text", 0),
      F("service", "Service", "text", 0), F("method", "Payment Method", "select", 0, ["Cash", "Card", "Online"])] },
    "expense-tracking": { name: "Expense Tracking", icon: "💸", fields: [
      F("title", "Expense Title", "text", 1), F("amount", "Amount", "number", 1), F("date", "Date", "date", 1),
      F("category", "Category", "text", 0), F("notes", "Notes", "textarea", 0)] }
  },
  petrolpump: {
    "dispenser-tracking": { name: "Dispenser Tracking", icon: "⛽", fields: [
      F("dispenser", "Dispenser #", "text", 1), F("nozzle", "Nozzle", "text", 0), F("status", "Status", "select", 1, ["On", "Off", "Maintenance"]),
      F("reading", "Current Reading", "number", 0), F("date", "Date", "date", 1)] },
    "shift-management": { name: "Shift Management", icon: "🕒", fields: [
      F("shift", "Shift", "select", 1, ["Morning", "Evening", "Night"]), F("date", "Date", "date", 1),
      F("attendant", "Attendant", "text", 1), F("cash", "Cash in Hand", "number", 0), F("handover", "Handover Notes", "textarea", 0)] },
    "nozzle-readings": { name: "Nozzle Readings", icon: "⛽", fields: [
      F("nozzle", "Nozzle", "text", 1), F("date", "Date", "date", 1), F("opening", "Opening Reading", "number", 1),
      F("closing", "Closing Reading", "number", 1), F("sold", "Litres Sold", "number", 0)] },
    "rate-management": { name: "Rate Management", icon: "💲", fields: [
      F("fuel", "Fuel Type", "select", 1, ["Petrol", "Diesel", "CNG"]), F("rate", "Rate per Litre", "number", 1),
      F("date", "Effective Date", "date", 1), F("by", "Updated By", "text", 0)] },
    "tank-inventory": { name: "Tank Inventory", icon: "🛢️", fields: [
      F("tank", "Tank ID", "text", 1), F("fuel", "Fuel Type", "select", 1, ["Petrol", "Diesel", "CNG"]),
      F("volume", "Volume (L)", "number", 1), F("dip", "Dip Reading", "number", 0), F("status", "Status", "select", 1, ["Full", "Half", "Low", "Refill Due"])] },
    "sales-reports": { name: "Sales Reports", icon: "📊", fields: [
      F("date", "Date", "date", 1), F("fuel", "Fuel Type", "select", 0, ["Petrol", "Diesel", "CNG"]),
      F("litres", "Litres", "number", 1), F("amount", "Amount", "number", 1), F("shift", "Shift", "text", 0)] },
    "cash-and-payments": { name: "Cash & Payments", icon: "💳", fields: [
      F("date", "Date", "date", 1), F("amount", "Amount", "number", 1), F("mode", "Payment Mode", "select", 1, ["Cash", "Card", "Online", "Credit"]),
      F("shift", "Shift", "text", 0), F("notes", "Notes", "textarea", 0)] },
    "credit-accounts": { name: "Credit Accounts", icon: "🚛", fields: [
      F("customer", "Customer Name", "text", 1), F("vehicle", "Vehicle #", "text", 0), F("due", "Due Amount", "number", 1),
      F("last", "Last Paid Date", "date", 0), F("status", "Status", "select", 1, ["Clear", "Pending"])] },
    "staff-and-attendants": { name: "Staff & Attendants", icon: "🧑‍🔧", fields: [
      F("name", "Full Name", "text", 1), F("role", "Role", "text", 0), F("shift", "Shift", "text", 0),
      F("mobile", "Mobile Number", "tel", 0), F("joined", "Joining Date", "date", 0)] },
    "shop-and-lube-sales": { name: "Shop & Lube Sales", icon: "🛒", fields: [
      F("item", "Item Name", "text", 1), F("qty", "Quantity", "number", 1), F("amount", "Amount", "number", 1),
      F("date", "Date", "date", 1), F("payment", "Payment Mode", "select", 1, ["Cash", "Credit"])] },
    "expense-tracking": { name: "Expense Tracking", icon: "💸", fields: [
      F("title", "Expense Title", "text", 1), F("amount", "Amount", "number", 1), F("date", "Date", "date", 1),
      F("category", "Category", "text", 0), F("notes", "Notes", "textarea", 0)] },
    "profit-and-loss": { name: "Profit & Loss", icon: "💰", fields: [
      F("month", "Month", "text", 1), F("revenue", "Revenue", "number", 1), F("expenses", "Expenses", "number", 1),
      F("profit", "Profit", "number", 1), F("notes", "Notes", "textarea", 0)] }
  },
  medicalstore: {
    "digital-prescriptions": { name: "Digital Prescriptions", icon: "📝", fields: [
      F("patient", "Patient Name", "text", 1), F("doctor", "Doctor Name", "text", 1), F("medicines", "Medicines", "textarea", 1),
      F("date", "Date", "date", 1), F("rx", "Rx #", "text", 0)] },
    "medicine-catalog": { name: "Medicine Catalog", icon: "💊", fields: [
      F("medicine", "Medicine Name", "text", 1), F("brand", "Brand", "text", 0), F("form", "Form", "select", 0, ["Tablet", "Syrup", "Capsule", "Injection", "Other"]),
      F("price", "Price", "number", 1), F("company", "Maker Company", "text", 0)] },
    "batch-stock": { name: "Batch Stock", icon: "📦", fields: [
      F("medicine", "Medicine Name", "text", 1), F("batch", "Batch #", "text", 1), F("qty", "Quantity", "number", 1),
      F("expiry", "Expiry Date", "date", 1), F("price", "Price", "number", 0)] },
    "expiry-alerts": { name: "Expiry Alerts", icon: "⚠️", fields: [
      F("medicine", "Medicine Name", "text", 1), F("batch", "Batch #", "text", 0), F("expiry", "Expiry Date", "date", 1),
      F("qty", "Quantity", "number", 0), F("status", "Status", "select", 1, ["OK", "Near Expiry", "Expired"])] },
    "fast-pos-billing": { name: "Fast POS Billing", icon: "🧾", fields: [
      F("bill", "Bill #", "text", 1), F("customer", "Customer", "text", 0), F("items", "Items", "text", 1),
      F("amount", "Amount", "number", 1), F("payment", "Payment Mode", "select", 1, ["Cash", "Card", "Credit"])] },
    "barcode-scanning": { name: "Barcode Scanning", icon: "📱", fields: [
      F("barcode", "Barcode", "text", 1), F("medicine", "Medicine Name", "text", 1), F("price", "Price", "number", 1),
      F("scanned", "Scanned Date", "date", 1)] },
    "purchase-and-suppliers": { name: "Purchase & Suppliers", icon: "🚚", fields: [
      F("supplier", "Supplier Name", "text", 1), F("medicines", "Medicines", "text", 1), F("amount", "Amount", "number", 1),
      F("date", "Date", "date", 1), F("status", "Status", "select", 0, ["Ordered", "Received", "Pending"])] },
    "stock-alerts": { name: "Stock Alerts", icon: "🔔", fields: [
      F("medicine", "Medicine Name", "text", 1), F("qty", "Current Quantity", "number", 1), F("min", "Min Level", "number", 1),
      F("status", "Status", "select", 1, ["Low", "Out of Stock", "OK"])] },
    "customer-khata": { name: "Customer Khata", icon: "📒", fields: [
      F("customer", "Customer Name", "text", 1), F("mobile", "Mobile Number", "tel", 0), F("balance", "Balance", "number", 1),
      F("last", "Last Paid Date", "date", 0), F("status", "Status", "select", 1, ["Clear", "Pending"])] },
    "sales-reports": { name: "Sales Reports", icon: "📊", fields: [
      F("date", "Date", "date", 1), F("amount", "Total Sales", "number", 1), F("medicines", "Top Medicines", "text", 0),
      F("bills", "Bills Count", "number", 0), F("payment", "Payment Mode", "select", 0, ["Cash", "Card", "Credit"])] },
    "expense-tracking": { name: "Expense Tracking", icon: "💸", fields: [
      F("title", "Expense Title", "text", 1), F("amount", "Amount", "number", 1), F("date", "Date", "date", 1),
      F("category", "Category", "text", 0), F("notes", "Notes", "textarea", 0)] },
    "profit-and-loss": { name: "Profit & Loss", icon: "💰", fields: [
      F("month", "Month", "text", 1), F("revenue", "Revenue", "number", 1), F("expenses", "Expenses", "number", 1),
      F("profit", "Profit", "number", 1), F("notes", "Notes", "textarea", 0)] }
  },
  laboratory: {
    "test-catalog": { name: "Test Catalog", icon: "📋", fields: [
      F("test", "Test Name", "text", 1), F("department", "Department", "text", 0), F("price", "Price", "number", 1),
      F("range", "Normal Range", "text", 0)] },
    "sample-collection": { name: "Sample Collection", icon: "🧪", fields: [
      F("sample", "Sample ID", "text", 1), F("patient", "Patient Name", "text", 1), F("type", "Sample Type", "text", 0),
      F("collected", "Collected Date", "date", 1), F("staff", "Collected By", "text", 0)] },
    "sample-tracking": { name: "Sample Tracking", icon: "📍", fields: [
      F("sample", "Sample ID", "text", 1), F("patient", "Patient Name", "text", 1), F("status", "Status", "select", 1, ["Collected", "Processing", "Completed", "Verified"]),
      F("date", "Date", "date", 1), F("notes", "Notes", "textarea", 0)] },
    "digital-reports": { name: "Digital Reports", icon: "📑", fields: [
      F("report", "Report #", "text", 1), F("patient", "Patient Name", "text", 1), F("test", "Test Name", "text", 1),
      F("result", "Result / Values", "textarea", 1), F("date", "Date", "date", 1), F("status", "Status", "select", 1, ["Draft", "Final"])] },
    "report-delivery": { name: "Report Delivery", icon: "📤", fields: [
      F("patient", "Patient Name", "text", 1), F("report", "Report #", "text", 1), F("channel", "Channel", "select", 1, ["SMS", "Email", "WhatsApp"]),
      F("date", "Date", "date", 1), F("status", "Status", "select", 1, ["Sent", "Pending"])] },
    "patient-profiles": { name: "Patient Profiles", icon: "🧑‍⚕️", fields: [
      F("name", "Patient Name", "text", 1), F("mobile", "Mobile Number", "tel", 0), F("age", "Age", "number", 0),
      F("gender", "Gender", "select", 0, ["Male", "Female", "Other"]), F("last", "Last Visit", "date", 0)] },
    "doctor-referrals": { name: "Doctor Referrals", icon: "🏥", fields: [
      F("doctor", "Doctor Name", "text", 1), F("mobile", "Mobile Number", "tel", 0), F("patients", "Patients Referred", "number", 0),
      F("tests", "Common Tests", "text", 0), F("pending", "Pending Amount", "number", 0)] },
    "home-collection": { name: "Home Collection", icon: "🏠", fields: [
      F("patient", "Patient Name", "text", 1), F("address", "Address", "text", 1), F("date", "Date", "date", 1),
      F("time", "Time", "time", 1), F("staff", "Staff Assigned", "text", 0), F("status", "Status", "select", 1, ["Scheduled", "Done", "Cancelled"])] },
    "billing-and-payments": { name: "Billing & Payments", icon: "🧾", fields: [
      F("invoice", "Invoice #", "text", 1), F("patient", "Patient Name", "text", 1), F("amount", "Amount", "number", 1),
      F("date", "Date", "date", 1), F("status", "Status", "select", 1, ["Paid", "Pending"])] },
    "lab-inventory": { name: "Lab Inventory", icon: "📦", fields: [
      F("item", "Item Name", "text", 1), F("qty", "Quantity", "number", 1), F("expiry", "Expiry Date", "date", 0),
      F("price", "Price", "number", 1), F("status", "Status", "select", 1, ["OK", "Low", "Out of Stock"])] },
    "staff-and-pathologists": { name: "Staff & Pathologists", icon: "🧑‍🔬", fields: [
      F("name", "Full Name", "text", 1), F("role", "Role", "text", 0), F("shift", "Shift", "text", 0),
      F("mobile", "Mobile Number", "tel", 0), F("joined", "Joining Date", "date", 0)] },
    "income-reports": { name: "Income Reports", icon: "📊", fields: [
      F("date", "Date", "date", 1), F("amount", "Amount", "number", 1), F("test", "Test / Source", "text", 0),
      F("status", "Status", "select", 1, ["Received", "Pending"])] }
  }
};

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
      const tds = fields.map((f) => `<td>${escHtml(String(it[f.key] ?? "")) || "<span class='f-muted'>—</span>"}</td>`).join("");
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
    const val = item ? item[f.key] ?? "" : "";
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
  const label = entry[def.fields[0].key] || "this entry";
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
      lines.push(def.fields.map((f) => q(it[f.key] ?? "")).join(","));
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
      const tds = def.fields.map((f) => `<td>${escHtml(String(it[f.key] ?? "")) || "<span class='f-muted'>—</span>"}</td>`).join("");
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
  const label = entry[def.fields[0].key] || "this entry";
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
  if (!detail.querySelector(".detail-admin-btn")) {
    const abtn = document.createElement("button");
    abtn.type = "button";
    abtn.className = "btn btn-primary detail-admin-btn";
    abtn.textContent = `📊 ${labelFor(catKey)} Admin Panel`;
    abtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openCategoryAdmin(catKey);
    });
    detail.querySelector(".detail-header").appendChild(abtn);
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

const adminAllOwners = () => store.get("owners", []);
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
};

const adminTabsHtml = () => {
  const tabs = [
    ["overview", "📊 Overview"],
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
      (col.features[fid] || []).forEach((it) => {
        recent.push({ cat: catMeta(k), fid, name: (it && it.fields && (it.fields.name || it.fields.title || it.fields.customer)) || "(entry)", at: it && (it.updatedAt || it.createdAt) });
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
        const tds = def.fields.map((f) => `<td>${escHtml(String(it[f.key] ?? "")) || "<span class='f-muted'>—</span>"}</td>`).join("");
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

  const cards = list.map((o, i) => {
    const allowed = ownerAllowedCats(o);
    const chips = keys.map((k) => {
      const meta = catMeta(k);
      const on = allowed.includes(k);
      return `<button type="button" class="admin-cat-chip${on ? " on" : ""}" data-owner-mobile="${escHtml(o.mobile)}" data-owner-cat="${escHtml(k)}" aria-pressed="${on}">${meta.icon} ${escHtml(meta.name)}</button>`;
    }).join("");
    const role = o.role ? escHtml(String(o.role)) : "Owner";
    return `<div class="admin-owner-card">` +
      `<div class="admin-owner-head">` +
      `<div class="admin-owner-id"><span class="admin-owner-avatar">${escHtml((o.name || "?").trim().charAt(0).toUpperCase())}</span>` +
      `<div><div class="admin-owner-name">${escHtml(o.name)} <span class="admin-role-badge">${role}</span></div>` +
      `<div class="admin-owner-meta">${escHtml(o.mobile)}${o.city ? " · " + escHtml(o.city) : ""}${o.age ? " · age " + escHtml(String(o.age)) : ""}</div></div></div>` +
      `<div class="admin-owner-actions">` +
      `<span class="admin-owner-count">${allowed.length}/${keys.length} access</span>` +
      `<button type="button" class="admin-danger-btn" data-owner-remove="${i}">Remove</button></div></div>` +
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
  if (adminTab === "data") body = renderAdminData();
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
};

const toggleOwnerCategory = (mobile, catKey) => {
  let owners = adminAllOwners();
  let idx = owners.findIndex((o) => o.mobile === mobile);
  if (idx === -1 && owner && owner.mobile === mobile) {
    owners = [{ ...owner, categories: owner.category ? [owner.category] : [] }, ...owners];
    idx = 0;
  }
  if (idx === -1) return;
  const o = owners[idx];
  if (!Array.isArray(o.categories)) o.categories = o.category ? [o.category] : [];
  if (o.categories.includes(catKey)) o.categories = o.categories.filter((c) => c !== catKey);
  else o.categories.push(catKey);
  store.set("owners", owners);
  if (owner && owner.mobile === mobile) {
    owner = { ...owner, categories: o.categories, category: o.categories[0] || "" };
    try { localStorage.setItem("ownerAccount", JSON.stringify(owner)); } catch {}
    applyAccess();
  }
  renderAdminPanel();
  showToast(`${labelFor(catKey) || catKey} access ${o.categories.includes(catKey) ? "granted" : "revoked"} for ${o.name}.`);
};

const removeOwnerByIndex = (i) => {
  const full = adminOwnerList();
  const target = full[i];
  if (!target) return;
  if (!confirm(`Remove owner account "${target.name}" (${target.mobile})?`)) return;
  const next = adminAllOwners().filter((o) => o.mobile !== target.mobile);
  store.set("owners", next);
  if (owner && owner.mobile === target.mobile) {
    store.remove("ownerAccount");
    owner = null;
    refreshOwnerButton();
  }
  applyAccess();
  updateCeoStats();
  renderAdminPanel();
  showToast(`Owner "${target.name}" removed.`);
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
  if (chip) { toggleOwnerCategory(chip.getAttribute("data-owner-mobile"), chip.getAttribute("data-owner-cat")); return; }
  const rmOwner = e.target.closest("[data-owner-remove]");
  if (rmOwner) { removeOwnerByIndex(Number(rmOwner.getAttribute("data-owner-remove"))); }
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

const MONEY_KEYS = ["amount", "price", "fee", "total", "cost", "salary", "profit", "due", "paid", "advance", "rent", "bill", "charges", "rate", "revenue", "expense"];
const STATUS_PAID = /paid|clear|complete|done|received|settled|success/i;
const STATUS_PENDING = /pend|due|unpaid|partial|remaining|unclear|outstanding/i;

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
    Object.entries(it.fields || {}).forEach(([fk, fv]) => {
      if (!isMoneyKey(fk)) return;
      const n = toNum(fv);
      total += n;
      const skey = Object.keys(it.fields).find((kk) => /status|payment|paid/i.test(kk));
      const sval = skey ? String(it.fields[skey] ?? "") : "";
      if (STATUS_PAID.test(sval)) paid += n;
      else if (STATUS_PENDING.test(sval)) pending += n;
    });
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
        const tds = def.fields.map((f) => `<td>${escHtml(String(it[f.key] ?? "")) || "<span class='f-muted'>—</span>"}</td>`).join("");
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
        let val = 0;
        Object.entries(it.fields || {}).forEach(([fk, fv]) => { if (isMoneyKey(fk)) val += toNum(fv); });
        const labelKey = Object.keys(it.fields || {}).find((k) => /name|title|patient|customer|client|student|item|product|service/i.test(k));
        items.push({ def, label: labelKey ? String(it.fields[labelKey]) : (def.name + " #" + String(it.id).slice(0, 4)), val, at: it.updatedAt || it.createdAt });
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
      const tds = def.fields.map((f) => `<td>${escHtml(String(it[f.key] ?? "")) || "<span class='f-muted'>—</span>"}</td>`).join("");
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
const AVATAR_KEY = "ownerAvatar";
const ownerAvatarEl = document.getElementById("ownerAvatar");
const ownerAvatarInput = document.getElementById("ownerAvatarInput");

const applyOwnerAvatar = () => {
  if (!ownerAvatarEl) return;
  const data = store.get(AVATAR_KEY, null);
  if (data) {
    ownerAvatarEl.style.backgroundImage = `url(${data})`;
    ownerAvatarEl.classList.add("has-photo");
  } else {
    ownerAvatarEl.style.backgroundImage = "";
    ownerAvatarEl.classList.remove("has-photo");
  }
};

if (ownerAvatarEl && ownerAvatarInput) {
  ownerAvatarEl.addEventListener("click", () => ownerAvatarInput.click());
  ownerAvatarInput.addEventListener("change", () => {
    const file = ownerAvatarInput.files && ownerAvatarInput.files[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) { showToast("Please choose an image file.", true); return; }
    if (file.size > 2 * 1024 * 1024) { showToast("Image too large — please use under 2 MB.", true); return; }
    const reader = new FileReader();
    reader.onload = () => {
      store.set(AVATAR_KEY, reader.result);
      applyOwnerAvatar();
      showToast("Profile photo updated!");
    };
    reader.onerror = () => showToast("Could not read that image.", true);
    reader.readAsDataURL(file);
  });
}

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
applyOwnerAvatar();

refreshOwnerButton();
applyAccess();
initFeatureModules();
updateFeatureBadges();

// ===== Cloud: restore session, pull saved data, refresh UI =====
(async () => {
  try {
    const signedIn = await cloudRestore();
    if (signedIn) {
      owner = loadOwner();
      ceoMode = localStorage.getItem("ceoMode") === "all";
      removedKeys = store.get("removedKeys", []);
      customCats = store.get("customCats", []);
      applyRemovedKeys();
      customCats.forEach(buildCustomCategory);
      refreshOwnerButton();
      applyAccess();
      initFeatureModules();
      updateFeatureBadges();
      updateCeoStats();
      if (ceoLoggedIn && ceoUser) showCeoPanel();
      showToast(`Cloud data synced — welcome back, ${ceoUser.name}!`);
    }
  } catch (e) {
    console.warn("Cloud init failed:", e);
  }
})();
