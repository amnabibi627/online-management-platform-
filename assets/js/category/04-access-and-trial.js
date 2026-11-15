// ============================================================
// Category page - 04-access-and-trial.js
// Feature definitions, trial state and access rules.
// Split from the original category.js during the 2026-11 refactor.
// Loaded in numeric order by the page HTML. Keep that order.
// ============================================================

const categoryFeatureDef = (featureId, card = null) => {
  const registered = CATEGORY_MODULES.FEATURE_REGISTRY[CURRENT.key]?.[featureId];
  const generic = CATEGORY_MODULES.GENERIC_FEATURES.find((feature) => feature.id === featureId);
  const fallback = CATEGORY_MODULES.GENERIC_FEATURES[0];
  const foundInCurrent = Array.isArray(CURRENT.features) ? CURRENT.features.find((f) => f.id === featureId) : null;
  return {
    id: featureId,
    name: registered?.name || generic?.name || foundInCurrent?.name || card?.querySelector("h3")?.textContent || featureId,
    icon: registered?.icon || generic?.icon || foundInCurrent?.icon || card?.querySelector(".cat-feature-icon")?.textContent || "\u{1F4C1}",
    desc: foundInCurrent?.desc || generic?.desc || registered?.desc || `Live digital management for ${featureId}.`,
    fields: registered?.fields || generic?.fields || fallback.fields
  };
};
const categoryEnsureToolsUi = () => {
  if (!document.getElementById("categoryWorkspaceModal")) {
    const hasEmbeddedWs = !!document.getElementById("categoryWorkspaceContent");
    const hasEmbeddedToast = !!document.getElementById("categoryWsToastContainer");
    document.body.insertAdjacentHTML("beforeend",
      `<div class="category-workspace-modal" id="categoryWorkspaceModal" aria-hidden="true">` +
      `<section class="category-workspace" role="dialog" aria-modal="true" aria-labelledby="categoryWorkspaceTitle">` +
      `<button type="button" class="category-workspace-close" data-workspace-close aria-label="Close workspace">&times;</button>` +
      (hasEmbeddedToast ? "" : `<div id="categoryWsToastContainer" class="cat-ws-toast-container"></div>`) +
      (hasEmbeddedWs ? "" : `<div id="categoryWorkspaceContent"></div>`) +
      `<input type="file" id="categoryBackupFileInput" accept=".json,application/json" style="display:none;" />` +
      `</section></div>` +
      `<div class="category-auth-modal" id="categoryAuthModal" aria-hidden="true">` +
      `<section class="category-auth-panel" role="dialog" aria-modal="true" aria-labelledby="categoryAuthTitle">` +
      `<button type="button" class="category-workspace-close" data-auth-close aria-label="Close sign in">&times;</button>` +
      `<div id="categoryAuthContent"></div></section></div>` +
      `<div class="category-modal-backdrop" id="categorySafetyModalBackdrop" aria-hidden="true">` +
      `<div class="category-modal-card">` +
      `<div class="category-modal-card-header">` +
      `<h3>&#128737;&#65039; Database Security &amp; Daily Cloud Backups</h3>` +
      `<button type="button" class="category-modal-close-btn" data-close-safety aria-label="Close">&times;</button></div>` +
      `<div class="category-modal-card-body" id="categorySafetyModalBody"></div></div></div>` +
            `<div class="category-modal-backdrop" id="categoryPrivacyModalBackdrop" aria-hidden="true">` +
      `<div class="category-modal-card legal-modal-card" role="dialog" aria-modal="true" aria-labelledby="catLegalCharterTitle">` +
      `<div class="legal-modal-header">` +
      `<div class="legal-header-top">` +
      `<div class="legal-title-wrap">` +
      `<h3 id="catLegalCharterTitle">&#9878;&#65039; Terms of Use &amp; Privacy Policy</h3>` +
      `<p class="legal-header-sub">Essential software guidelines and data protection rules</p>` +
      `</div>` +
      `<button type="button" class="category-modal-close-btn" data-close-privacy aria-label="Close dialog">&times;</button>` +
      `</div>` +
      `<div class="legal-tabs-bar" role="tablist">` +
      `<button type="button" class="legal-tab-btn is-active" data-cat-legal-tab="terms" role="tab" aria-selected="true">` +
      `<span>&#128196; Terms of Use</span>` +
      `</button>` +
      `<button type="button" class="legal-tab-btn" data-cat-legal-tab="privacy" role="tab" aria-selected="false">` +
      `<span>&#128274; Privacy Policy</span>` +
      `</button>` +
      `</div>` +
      `</div>` +
      `<div class="legal-modal-body">` +
      `<div class="legal-tab-content is-active" id="catLegalTabTerms" role="tabpanel">` +
      `<div class="legal-clause"><div class="legal-clause-title"><span class="legal-num-badge">1</span> Software License &amp; Usage</div>` +
      `<p>This software is provided to manage your daily business operations (invoices, inventory, records, reports). You agree to use it responsibly and lawfully for your business.</p></div>` +
      `<div class="legal-clause"><div class="legal-clause-title"><span class="legal-num-badge">2</span> Account Security</div>` +
      `<p>You are responsible for keeping your login credentials and password secure. All activity carried out under your account remains your responsibility.</p></div>` +
      `<div class="legal-clause"><div class="legal-clause-title"><span class="legal-num-badge">3</span> 100% Data Ownership</div>` +
      `<p>You retain 100% full ownership of all data you enter (sales, customer ledgers, patient records, products). We never claim any ownership over your business data.</p></div>` +
      `<div class="legal-clause"><div class="legal-clause-title"><span class="legal-num-badge">4</span> Subscriptions &amp; Cloud Service</div>` +
      `<p>Subscriptions cover cloud hosting, storage, updates, and customer support. All plans have upfront pricing with zero hidden charges.</p></div>` +
      `<div class="legal-clause"><div class="legal-clause-title"><span class="legal-num-badge">5</span> Backups &amp; Account Control</div>` +
      `<p>You can export complete backups (JSON/CSV) of your business data at any time. You can also delete your records or close your account whenever you choose.</p></div>` +
      `</div>` +
      `<div class="legal-tab-content" id="catLegalTabPrivacy" role="tabpanel">` +
      `<div class="legal-clause"><div class="legal-clause-title"><span class="legal-num-badge">1</span> Information We Store</div>` +
      `<p>We only store information necessary to provide the service: your business name, contact info (phone/email) for login, and the operational records you choose to input.</p></div>` +
      `<div class="legal-clause"><div class="legal-clause-title"><span class="legal-num-badge">2</span> Zero Data Selling (Guaranteed)</div>` +
      `<p>We strictly never sell, rent, trade, or share your business data, patient records, customer contacts, or financial figures with any advertisers or third parties.</p></div>` +
      `<div class="legal-clause"><div class="legal-clause-title"><span class="legal-num-badge">3</span> Security &amp; Encryption</div>` +
      `<p>Your records are protected with industry-standard TLS 1.3 encryption in transit and secure AES-256 cloud database storage with daily automated backups.</p></div>` +
      `<div class="legal-clause"><div class="legal-clause-title"><span class="legal-num-badge">4</span> Data Export &amp; Deletion Rights</div>` +
      `<p>You have full control over your records. You can download your data anytime or permanently delete items from your Recycle Bin with instant purging.</p></div>` +
      `<div class="legal-clause"><div class="legal-clause-title"><span class="legal-num-badge">5</span> Direct Support &amp; Contact</div>` +
      `<p>If you have any questions or need technical support, you can reach us directly:<br /><strong>Phone / WhatsApp:</strong> +92 304 295 4627 &bull; <strong>Email:</strong> onlinemanagementsite627@gmail.com</p></div>` +
      `</div>` +
      `</div>` +
      `<div class="legal-modal-footer">` +
      `<span class="legal-footer-note">&#128274; 100% Secure &bull; User Privacy Protected</span>` +
      `<div class="legal-footer-btns">` +
      `<button type="button" class="btn btn-primary" data-close-privacy style="padding:0.45rem 1.25rem; font-size:0.85rem;">I Understand &amp; Agree</button>` +
      `</div>` +
      `</div>` +
      `</div></div>`);
  }
};
const setCategoryAccountUi = () => {
  categoryUpdateHeaderBtn();
};

const categoryGetTrial = () => {
  try {
    const raw = localStorage.getItem("bms_user_trial") || localStorage.getItem("oms_trial_account");
    if (!raw) return null;
    const t = JSON.parse(raw);
    if (!t || !t.expiresAt) return null;
    const now = Date.now();
    const expires = typeof t.expiresAt === "number" ? t.expiresAt : new Date(t.expiresAt).getTime();
    const msLeft = expires - now;
    const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
    const hoursLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60)));
    const uid = t.uid || ("UID-" + (Math.abs((t.mobile || t.name || "").split("").reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0) | 0, 54321)) % 90000 + 10000));
    return { ...t, uid, isActive: msLeft > 0, daysLeft, hoursLeft, expiresAt: expires };
  } catch (_) {
    return null;
  }
};

const categorySetTrial = (userData) => {
  const prevTrial = categoryGetTrial() || {};
  const seed = (userData.mobile || "") + (userData.name || "") + Date.now();
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash) + seed.charCodeAt(i) | 0;
  const uid = userData.uid || prevTrial.uid || ("UID-" + (Math.abs(hash) % 90000 + 10000));

  const trial = {
    ...prevTrial,
    uid,
    name: userData.name || prevTrial.name || "Business User",
    mobile: userData.mobile || prevTrial.mobile || "",
    email: userData.email || prevTrial.email || "",
    city: userData.city || prevTrial.city || "",
    businessName: userData.businessName || prevTrial.businessName || (CURRENT?.short ? `${CURRENT.short} Management` : "Business Portal"),
    avatar: userData.avatar || prevTrial.avatar || "",
    startedAt: prevTrial.startedAt || Date.now(),
    expiresAt: prevTrial.expiresAt || (Date.now() + 5 * 24 * 60 * 60 * 1000),
    plan: "5_day_free_trial",
    status: "active"
  };
  localStorage.setItem("bms_user_trial", JSON.stringify(trial));
  localStorage.setItem("oms_trial_account", JSON.stringify(trial));
  categoryUpdateHeaderBtn();
  return trial;
};

const categoryHasActiveSubscription = () =>
  !!categorySubscription &&
  categorySubscription.status === "active" &&
  new Date(categorySubscription.expires_at).getTime() > Date.now();

const categoryIsSignedIn = () => {
  const trial = categoryGetTrial();
  const trialAcc = localStorage.getItem("oms_trial_account");
  const localUser = localStorage.getItem("bms_user_trial");
  return !!(categoryUser || (trial && trial.uid) || trialAcc || localUser);
};

const categoryCanAddData = () => {
  // 1. Paid active subscription -> always allowed
  if (categoryHasActiveSubscription()) return true;

  // 2. User must be signed up
  if (!categoryIsSignedIn()) return false;

  // 3. Check 5-day free trial status
  const trial = categoryGetTrial();
  if (trial && trial.isActive) return true;

  // 4. Trial expired and no active subscription -> blocked from adding data
  return false;
};

const categoryHasAccess = () => {
  return categoryCanAddData();
};
