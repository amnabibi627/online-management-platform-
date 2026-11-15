// ============================================================
// Home page - 09-ceo-account.js
// CEO one-time setup, sign-in, session and master panel.
// Split from the original script.js during the 2026-11 refactor.
// Loaded in numeric order by the page HTML. Keep that order.
// ============================================================

// ===== CEO master account (header "Owner Account" button) =====
const store = {
  get(key, fallback) { try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} cloudPut(key, value); },
  remove(key) { try { localStorage.removeItem(key); } catch {} cloudDrop(key); },
};

let ceoUser = null;
let ceoLoggedIn = false;
let ceoMode = false;
let ceoSetupAvailable = false;
let ceoSetupMode = false;
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
const ceoNameInput = document.getElementById("ceoSetupName");
const ceoSetupEmailInput = document.getElementById("ceoSetupEmail");
const ceoMobileInput = document.getElementById("ceoSetupMobile");
const ceoSecretInput = document.getElementById("ceoSecretCode");
const ceoLoginEmailInput = document.getElementById("ceoLoginEmail");
const ceoCodeInput = document.getElementById("ceoCode");
const ceoErrName = document.getElementById("ceoErrName");
const ceoErrEmail = document.getElementById("ceoErrEmail");
const ceoErrMobile = document.getElementById("ceoErrSetupMobile");
const ceoErrLoginEmail = document.getElementById("ceoErrLoginEmail");
const ceoErrSecret = document.getElementById("ceoErrSecret");
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

const setCeoLoginMode = (createAccount = false) => {
  ceoSetupMode = createAccount && ceoSetupAvailable;
  document.getElementById("ceoLoginTitle").textContent = ceoSetupMode ? "Create CEO Account" : "CEO Account Login";
  document.getElementById("ceoLoginSub").textContent = ceoSetupMode
    ? "One-time secure setup. Your email, name, and phone must match the private setup configuration."
    : "Sign in with the CEO email and password.";
  ceoSignupExtra.hidden = !ceoSetupMode;
  ceoLoginSubmit.textContent = ceoSetupMode ? "Create and Verify Account" : "Login";
  document.getElementById("ceoLoginEmail").closest(".field").hidden = ceoSetupMode;
  document.getElementById("ceoModeToggle").hidden = !ceoSetupAvailable;
  document.getElementById("ceoModeToggle").textContent = ceoSetupMode
    ? "Already have an account? Login"
    : "Create the one-time CEO account";
  document.getElementById("ceoForgotPassword").hidden = ceoSetupMode;
  ceoErrName.textContent = "";
  ceoErrEmail.textContent = "";
  ceoErrMobile.textContent = "";
  ceoErrLoginEmail.textContent = "";
  ceoErrSecret.textContent = "";
  ceoErrCode.textContent = "";
  ceoNameInput.classList.remove("invalid");
  ceoSetupEmailInput.classList.remove("invalid");
  ceoMobileInput.classList.remove("invalid");
  ceoLoginEmailInput.classList.remove("invalid");
  ceoSecretInput.classList.remove("invalid");
  ceoCodeInput.classList.remove("invalid");
  ceoLoginForm.reset();
  ceoLoginForm.hidden = false;
  ceoLogin.hidden = false;
  ceoPanel.hidden = true;
  document.getElementById("ceoPasswordRecoveryForm").hidden = true;
};

const showCeoPanel = () => {
  ceoLogin.hidden = true;
  ceoPanel.hidden = false;
  const settingsPanel = document.getElementById("ceoSettingsPanel");
  const settingsToggle = document.getElementById("ceoSettingsToggle");
  settingsPanel.hidden = true;
  settingsToggle.setAttribute("aria-expanded", "false");
  document.getElementById("ceoPanelName").textContent = ceoUser.name;
  const settings = document.getElementById("ceoAccountSettings");
  settings.elements.name.value = ceoUser.name || "";
  settings.elements.email.value = ceoUser.email || "";
  settings.elements.mobile.value = ceoUser.mobile || "";
  settings.elements.currentPassword.value = "";
  settings.elements.newPassword.value = "";
  updateCeoStats();
};

document.getElementById("ceoSettingsToggle").addEventListener("click", (event) => {
  const button = event.currentTarget;
  const panel = document.getElementById("ceoSettingsPanel");
  const isExpanded = button.getAttribute("aria-expanded") === "true";
  button.setAttribute("aria-expanded", String(!isExpanded));
  panel.hidden = isExpanded;
});

const refreshCeoSetupAvailability = async () => {
  if (!sb) throw new Error("CEO setup requires a Supabase connection.");
  const { data, error } = await sb.rpc("oms_ceo_setup_available");
  if (error) throw error;
  ceoSetupAvailable = data === true;
  document.getElementById("ceoModeToggle").hidden = !ceoSetupAvailable;
};

const openCeoModal = () => {
  if (ceoLoggedIn && ceoUser) showCeoPanel();
  else setCeoLoginMode();
  ceoModal.classList.add("open");
  ceoModal.setAttribute("aria-hidden", "false");
  if (!ceoLoggedIn) {
    refreshCeoSetupAvailability()
      .then(() => setCeoLoginMode())
      .catch((error) => {
        showToast(`CEO setup status could not be checked. Apply the latest Supabase setup SQL. ${error.message || ""}`, true);
      });
  }
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

  ceoLoginSubmit.disabled = true;
  try {
    if (ceoSetupMode) {
      const name = ceoNameInput.value.trim();
      const mobile = normMobile(ceoMobileInput.value);
      const email = ceoSetupEmailInput.value.trim().toLowerCase();
      const secret = ceoSecretInput.value;
      const password = ceoCodeInput.value;
      let valid = true;
      if (name.length < 3 || name.length > 80) {
        ceoErrName.textContent = "Enter your full name (3–80 characters).";
        ceoNameInput.classList.add("invalid");
        valid = false;
      } else {
        ceoErrName.textContent = "";
        ceoNameInput.classList.remove("invalid");
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        ceoErrEmail.textContent = "Enter a valid email address.";
        ceoSetupEmailInput.classList.add("invalid");
        valid = false;
      } else {
        ceoErrEmail.textContent = "";
        ceoSetupEmailInput.classList.remove("invalid");
      }
      if (!MOBILE_RE.test(mobile)) {
        ceoErrMobile.textContent = "Enter a valid mobile number.";
        ceoMobileInput.classList.add("invalid");
        valid = false;
      } else {
        ceoErrMobile.textContent = "";
        ceoMobileInput.classList.remove("invalid");
      }
      if (!secret || secret.length < 32 || secret.length > 256) {
        ceoErrSecret.textContent = "Enter the private setup secret (32–256 characters).";
        ceoSecretInput.classList.add("invalid");
        valid = false;
      } else {
        ceoErrSecret.textContent = "";
        ceoSecretInput.classList.remove("invalid");
      }
      if (password.length < 8 || password.length > 72) {
        ceoErrCode.textContent = "Choose a password between 8 and 72 characters.";
        ceoCodeInput.classList.add("invalid");
        valid = false;
      } else {
        ceoErrCode.textContent = "";
        ceoCodeInput.classList.remove("invalid");
      }
      if (!valid) {
        showToast("Fix the highlighted fields and try again.", true);
        return;
      }

      cloudState("syncing", "Creating…");
      let authResult = await sb.auth.signUp({
        email,
        password,
        options: { data: { name, mobile } },
      });
      if (authResult.error) {
        if (!/already registered|already been registered/i.test(authResult.error.message || "")) {
          ceoSecretInput.value = "";
          throw authResult.error;
        }
        authResult = await sb.auth.signInWithPassword({ email, password });
      } else if (!authResult.data.session) {
        authResult = await sb.auth.signInWithPassword({ email, password });
        if (authResult.error && /not confirmed|email_not_confirmed/i.test(authResult.error.message || "")) {
          ceoSecretInput.value = "";
          throw new Error("Supabase email confirmation is on. Turn off Confirm email in Authentication → Providers → Email, then try again.");
        }
      }
      if (authResult.error) {
        ceoSecretInput.value = "";
        throw authResult.error;
      }
      if (!authResult.data.session || !authResult.data.user) {
        ceoSecretInput.value = "";
        throw new Error("CEO account sign-in did not complete. Check the email confirmation setting and try again.");
      }
      cloudUser = authResult.data.user;
      let claimError;
      try {
        const result = await sb.rpc("claim_oms_ceo", {
          p_name: name,
          p_mobile: mobile,
          p_secret: secret,
        });
        claimError = result.error;
      } finally {
        ceoSecretInput.value = "";
      }
      if (claimError) {
        await sb.auth.signOut();
        cloudUser = null;
        throw claimError;
      }
      if (!await isCloudAdmin()) {
        await sb.auth.signOut();
        cloudUser = null;
        throw new Error("The account was created but CEO access could not be verified. Contact the site owner.");
      }
      ceoLoginForm.reset();
      ceoUser = { name, mobile, email };
      store.set("ceoAccount", ceoUser);
      setCeoSession(true);
      showCeoPanel();
      cloudState("connected", "Synced ✓");
      showToast(`CEO account ready: welcome, ${name}!`);
      await migrateLegacyReviews();
      await loadReviews();
      return;
    }

    const email = ceoLoginEmailInput.value.trim().toLowerCase();
    const password = ceoCodeInput.value;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      ceoErrLoginEmail.textContent = "Enter your registered email address.";
      ceoLoginEmailInput.classList.add("invalid");
      showToast("Login failed: enter a valid email.", true);
      return;
    }
    if (!password) {
      ceoErrCode.textContent = "Enter your password.";
      ceoCodeInput.classList.add("invalid");
      showToast("Login failed: password required.", true);
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
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      cloudState("error", "Error");
      logAttempt("ceo");
      ceoErrCode.textContent = /invalid login credentials/i.test(error.message || "") ? "Email or password is incorrect." : "";
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
      showToast("Access denied: this account is not the CEO account.", true);
      logAttempt("ceo");
      return;
    }
    clearAttempts("ceo");
    ceoErrLoginEmail.textContent = ""; ceoLoginEmailInput.classList.remove("invalid");
    ceoErrCode.textContent = ""; ceoCodeInput.classList.remove("invalid");
    ceoLoginForm.reset();
    const meta = data.user.user_metadata || {};
    const profile = await loadCeoProfile();
    ceoUser = {
      name: profile?.full_name || meta.name || "CEO",
      mobile: profile?.mobile || meta.mobile || "",
      email: cloudUser.email || "",
    };
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
  } catch (error) {
    cloudState("error", "Error");
    showToast(authErrMsg(error), true);
  } finally {
    ceoLoginSubmit.disabled = false;
  }
});

document.getElementById("ceoModeToggle").addEventListener("click", (event) => {
  event.preventDefault();
  setCeoLoginMode(!ceoSetupMode);
});

document.getElementById("ceoForgotPassword").addEventListener("click", async (event) => {
  event.preventDefault();
  const email = ceoLoginEmailInput.value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    ceoErrLoginEmail.textContent = "Enter your CEO email first.";
    ceoLoginEmailInput.classList.add("invalid");
    return;
  }
  try {
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${window.location.pathname}`,
    });
    if (error) throw error;
    showToast("Password reset instructions were sent if this email is registered.");
  } catch (error) {
    showToast(`Password reset could not be requested: ${error.message || "Supabase error."}`, true);
  }
});

document.getElementById("ceoPasswordRecoveryForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const password = form.elements.newPassword.value;
  const confirm = form.elements.confirmPassword.value;
  if (password.length < 8 || password.length > 72 || password !== confirm) {
    showToast("Enter matching new passwords (8–72 characters).", true);
    return;
  }
  try {
    const { error } = await sb.auth.updateUser({ password });
    if (error) throw error;
    form.reset();
    setCeoSession(false);
    await sb.auth.signOut();
    cloudUser = null;
    setCeoLoginMode();
    showToast("Password updated. Sign in with your new password.");
  } catch (error) {
    showToast(`Password could not be updated: ${error.message || "Supabase error."}`, true);
  }
});

document.getElementById("ceoAccountSettings").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!sb || !cloudUser || !ceoLoggedIn) return;
  const form = event.currentTarget;
  const name = form.elements.name.value.trim();
  const email = form.elements.email.value.trim().toLowerCase();
  const mobile = normMobile(form.elements.mobile.value);
  const currentPassword = form.elements.currentPassword.value;
  const newPassword = form.elements.newPassword.value;
  if (name.length < 3 || name.length > 80 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !MOBILE_RE.test(mobile) || !currentPassword ||
      (newPassword && (newPassword.length < 8 || newPassword.length > 72))) {
    showToast("Check the name, email, mobile, current password, and optional new password.", true);
    return;
  }
  const submit = form.querySelector('button[type="submit"]');
  submit.disabled = true;
  try {
    const { error: reauthError } = await sb.auth.signInWithPassword({
      email: cloudUser.email,
      password: currentPassword,
    });
    if (reauthError) throw new Error("Current password is incorrect.");

    const authChanges = { data: { name, mobile } };
    if (email !== cloudUser.email) authChanges.email = email;
    if (newPassword) authChanges.password = newPassword;
    const { data: updateData, error: updateError } = await sb.auth.updateUser(authChanges);
    if (updateError) throw updateError;
    if (updateData.user) cloudUser = updateData.user;
    const { error: profileError } = await sb.rpc("update_oms_ceo_profile", {
      p_name: name,
      p_mobile: mobile,
    });
    if (profileError) throw profileError;

    ceoUser = { name, mobile, email: cloudUser.email || email };
    store.set("ceoAccount", ceoUser);
    document.getElementById("ceoPanelName").textContent = name;
    form.elements.currentPassword.value = "";
    form.elements.newPassword.value = "";
    showToast(email !== ceoUser.email
      ? "Profile updated. Confirm the new email using the message sent to that address."
      : "CEO account details updated.");
  } catch (error) {
    showToast(`Account settings were not fully updated: ${error.message || "Supabase error."}`, true);
  } finally {
    submit.disabled = false;
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
document.addEventListener("click", (e) => {
  const target = e.target.closest("#userSignupHeaderBtn, .header-signup-btn, #userSignupHero");
  if (target) {
    e.preventDefault();
    if (typeof openUserModal === "function") {
      const trial = getBmsTrial();
      const hasAccount = !!currentUser || !!trial;
      openUserModal(hasAccount ? "active" : "signup");
    }
  }
});
if (userSignupHeaderBtn) {
  userSignupHeaderBtn.addEventListener("click", () => {
    if (typeof openUserModal === "function") {
      const trial = getBmsTrial();
      const hasAccount = !!currentUser || !!trial;
      openUserModal(hasAccount ? "active" : "signup");
    }
  });
}
const userSignupHeroBtn = document.getElementById("userSignupHero");
if (userSignupHeroBtn) {
  userSignupHeroBtn.addEventListener("click", () => {
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
    showToast(`Access denied: your owner account does not have ${labelFor(catKey)} access.`, true);
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
      const tds = fields.map((f) => `<td>${escHtml(String((it[f.key] ?? (it.fields && it.fields[f.key])) ?? "")) || "<span class='f-muted'>N/A</span>"}</td>`).join("");
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
        <option value="">Select</option>
        ${(f.options || []).map((o) => `<option value="${escHtml(o)}"${String(val) === o ? " selected" : ""}>${escHtml(o)}</option>`).join("")}
      </select>`;
    } else if (f.type === "textarea") {
      control = `<textarea name="${f.key}" rows="3" maxlength="2000" placeholder="Enter ${escHtml(f.label.toLowerCase())}"${f.required ? " data-required" : ""}>${escHtml(String(val))}</textarea>`;
    } else {
      const maxLength = { text: 200, tel: 20, email: 254 }[f.type];
      const constraints = f.type === "number" ? ' min="0" step="any"' : (maxLength ? ` maxlength="${maxLength}"` : "");
      control = `<input type="${f.type}" name="${f.key}" value="${escHtml(String(val))}" placeholder="Enter ${escHtml(f.label.toLowerCase())}"${constraints}${f.required ? " data-required" : ""} />`;
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
    if (f.type === "number" && value) {
      const number = Number(value);
      if (!Number.isFinite(number) || number < 0) { fail(`${f.label} must be a non-negative number.`); return; }
    }
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
