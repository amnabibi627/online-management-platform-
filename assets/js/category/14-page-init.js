// ============================================================
// Category page - 14-page-init.js
// Related categories and page bootstrap.
// Split from the original category.js during the 2026-11 refactor.
// Loaded in numeric order by the page HTML. Keep that order.
// ============================================================

const fillCategoryRelated = () => {
  const grid = document.getElementById("catRelated");
  if (!grid) return;
  const others = Object.values(CATEGORIES).filter((c) => c.key !== CURRENT.key);
  grid.innerHTML = others.map((c) =>
    `<a class="cat-related-card" href="${c.key}.html">` +
    `<div class="cat-related-thumb-wrap">` +
    `<img src="assets/img/${c.key}.jpg?v=20261105LuxuryV4" alt="${categoryEscape(c.short)}" class="cat-related-thumb-img" width="56" height="56" loading="lazy" />` +
    `</div>` +
    `<span class="cat-related-text">` +
    `<strong>${categoryEscape(c.short)}</strong>` +
    `<small>${categoryEscape(c.sub)}</small>` +
    `</span>` +
    `<span class="cat-related-arrow" aria-hidden="true">&rarr;</span>` +
    `</a>`
  ).join("");
};

/* Mobile navigation + misc page wiring */
const initCategoryPage = () => {
  const navToggle = document.getElementById("navToggle");
  const mainNav = document.getElementById("mainNav");
  if (navToggle && mainNav) {
    const setNavOpen = (open) => {
      mainNav.classList.toggle("open", open);
      navToggle.setAttribute("aria-expanded", String(open));
    };
    navToggle.addEventListener("click", () => setNavOpen(!mainNav.classList.contains("open")));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && mainNav.classList.contains("open")) setNavOpen(false);
    });
    mainNav.querySelectorAll(".nav-link").forEach((link) => {
      link.addEventListener("click", () => setNavOpen(false));
    });
  }

  // Highlight the current section in the nav
  const navLinks = mainNav ? [...mainNav.querySelectorAll(".nav-link")] : [];
  navLinks.forEach((link) => {
    const href = link.getAttribute("href") || "";
    const key = href.split("#")[0].replace(/^.*\//, "").replace(/\.html$/, "");
    const active = key === CURRENT.key || href.endsWith("#industries");
    link.classList.toggle("active", active);
  });

  // Back to categories button
  const backBtn = document.querySelector(".cat-back-btn");
  if (backBtn) backBtn.addEventListener("click", () => { window.location.href = "index.html#industries"; });
};

fillCategoryMeta();
fillCategoryHero();
fillCategoryFeatures();
fillCategoryRelated();
initCategoryPage();
initCategoryTools();
categoryUpdateHeaderBtn();

window.categoryRenderForm = categoryRenderForm;
window.categoryPrintReport = categoryPrintReport;
window.categoryExportCsv = categoryExportCsv;
window.categoryExportBackup = categoryExportBackup;
window.categoryRenderList = categoryRenderList;
window.selectSaasFeature = selectSaasFeature;
window.showCategoryTrialModal = showCategoryTrialModal;
window.showCategorySubscriptionPaywall = showCategorySubscriptionPaywall;
window.setGlobalCurrency = setGlobalCurrency;
window.formatCurrencyVal = formatCurrencyVal;
window.showCategoryShortcutsModal = showCategoryShortcutsModal;
