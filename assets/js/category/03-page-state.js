// ============================================================
// Category page - 03-page-state.js
// Current category, SEO meta, currency and workspace state.
// Split from the original category.js during the 2026-11 refactor.
// Loaded in numeric order by the page HTML. Keep that order.
// ============================================================

const CATEGORY_KEY = document.body.dataset.category;
const CURRENT = CATEGORIES[CATEGORY_KEY] || CATEGORIES.clinic;
const CURRENT_TITLE = `${CURRENT.short} Management | ${CATEGORY_SITE_NAME}`;

const escHtml = (s) => String(s ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

const setMetaContent = (selector, attr, value) => {
  const el = document.querySelector(selector);
  if (el && value) el.setAttribute(attr, value);
};

const fillCategoryMeta = () => {
  document.title = CURRENT_TITLE;
  setMetaContent('meta[name="description"]', "content", CURRENT.meta);
  setMetaContent('link[rel="canonical"]', "href", `${CATEGORY_SITE_URL}/${CURRENT.key}`);
  setMetaContent('meta[property="og:title"]', "content", CURRENT_TITLE);
  setMetaContent('meta[property="og:description"]', "content", CURRENT.meta);
  setMetaContent('meta[property="og:url"]', "content", `${CATEGORY_SITE_URL}/${CURRENT.key}`);
  setMetaContent('meta[name="twitter:title"]', "content", CURRENT_TITLE);
  setMetaContent('meta[name="twitter:description"]', "content", CURRENT.meta);
};

const fillCategoryHero = () => {
  const crumb = document.getElementById("catCrumbCurrent");
  if (crumb) crumb.textContent = CURRENT.short;

  const eyebrow = document.getElementById("catEyebrow");
  if (eyebrow) eyebrow.textContent = `${CURRENT.short} Software`;

  const h1 = document.getElementById("catH1");
  if (h1) h1.innerHTML = CURRENT.h1;

  const desc = document.getElementById("catDesc");
  if (desc) desc.textContent = CURRENT.desc;

  const icon = document.getElementById("catIcon");
  if (icon) icon.textContent = CURRENT.icon;

  const toolsStat = document.getElementById("catToolsStat");
  if (toolsStat) toolsStat.textContent = String(CURRENT.features.length);

  const heroCardTitle = document.querySelector(".cat-hero-card h2");
  if (heroCardTitle) heroCardTitle.textContent = `${CURRENT.short} Portal`;

  const heroCardDesc = document.querySelector(".cat-hero-card > p");
  if (heroCardDesc) heroCardDesc.textContent = `Every tool below is part of the ${CURRENT.short} portal.`;
};

const fillCategoryFeatures = () => {
  const grid = document.getElementById("catFeatures");
  if (!grid) return;
  grid.innerHTML = CURRENT.features.map((f) =>
    `<button class="cat-feature cat-tool-card" type="button" data-tool-feature="${escHtml(f.id)}">` +
    `<div class="cat-feature-icon">${f.icon}</div>` +
    `<h3>${escHtml(f.name)}</h3>` +
    `<p>${escHtml(f.desc)}</p>` +
    `<span class="cat-tool-open">Open workspace <span aria-hidden="true">&rarr;</span></span>` +
    `</button>`
  ).join("");
};

const categoryEscape = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));

const OMS_CURRENCIES = {
  USD: { code: "USD", symbol: "$", name: "US Dollar ($)" },
  EUR: { code: "EUR", symbol: "€", name: "Euro (€)" },
  GBP: { code: "GBP", symbol: "£", name: "British Pound (£)" },
  AED: { code: "AED", symbol: "AED ", name: "UAE Dirham (AED)" },
  SAR: { code: "SAR", symbol: "SAR ", name: "Saudi Riyal (SAR)" },
  CAD: { code: "CAD", symbol: "CA$", name: "Canadian Dollar ($)" },
  AUD: { code: "AUD", symbol: "AU$", name: "Australian Dollar ($)" },
  PKR: { code: "PKR", symbol: "Rs. ", name: "Pakistani Rupee (Rs.)" },
  INR: { code: "INR", symbol: "₹", name: "Indian Rupee (₹)" },
  JPY: { code: "JPY", symbol: "¥", name: "Japanese Yen (¥)" }
};

const getGlobalCurrency = () => {
  return localStorage.getItem("oms_global_currency") || "USD";
};

const setGlobalCurrency = (code) => {
  if (OMS_CURRENCIES[code]) {
    localStorage.setItem("oms_global_currency", code);
    renderSaasAnalytics();
    categoryRenderList();
    showWorkspaceToast(`Currency switched to ${OMS_CURRENCIES[code].name}`);
  }
};

const formatCurrencyVal = (num) => {
  const code = getGlobalCurrency();
  const curr = OMS_CURRENCIES[code] || OMS_CURRENCIES.USD;
  const n = typeof num === "number" ? num : parseFloat(String(num).replace(/[^0-9.-]/g, ""));
  if (isNaN(n)) return "N/A";
  return `${curr.symbol}${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

const categoryEmail = (mobile) => `${String(mobile).replace(/[^0-9a-zA-Z]/g, "")}@bms.app`;
const categoryMobile = (value) => String(value || "").trim().replace(/[\s\-\(\)\.]/g, "").replace(/^\+/, "");
const categoryCollectionKey = `${CURRENT.key}:data`;
const categoryLocalStorageKey = `bms_cat_${CURRENT.key}_data_v2`;
const categoryData = { v: CATEGORY_MODULES.FEATURE_VERSION, features: {}, trash: {} };
let categoryUser = null;
let categoryFeature = null;
let categoryEditId = null;
let categoryBusy = false;
let categorySessionReady = false;
let categorySessionPromise = Promise.resolve();
let categorySubscription = null;
let categoryLatestRequest = null;
let categorySelectedPlan = null;
let categoryTab = "active";
let categorySearchQuery = "";
let categorySortCol = null;
let categorySortDir = "asc";
let categoryPage = 1;
let categoryPageSize = 25;
let categoryToastTimeout = null;
let categoryUndoAction = null;
