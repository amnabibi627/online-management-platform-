// ============================================================
// Home page - 05-navigation-and-hero.js
// Mobile nav, scroll spy, category detail cards, toasts and portal toggles.
// Split from the original script.js during the 2026-11 refactor.
// Loaded in numeric order by the page HTML. Keep that order.
// ============================================================

// Mobile navigation
const navToggle = document.getElementById("navToggle");
const mainNav = document.getElementById("mainNav");

const setNavOpen = (open) => {
  mainNav.classList.toggle("open", open);
  navToggle.setAttribute("aria-expanded", String(open));
};

navToggle.addEventListener("click", () => setNavOpen(!mainNav.classList.contains("open")));

mainNav.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", () => setNavOpen(false));
});

// Smart Hub Category Pill click
document.querySelectorAll(".hub-cat-pill").forEach((pill) => {
  pill.addEventListener("click", () => {
    document.querySelectorAll(".hub-cat-pill").forEach((p) => p.classList.remove("is-active"));
    pill.classList.add("is-active");
    const indSec = document.getElementById("industries");
    if (indSec) indSec.scrollIntoView({ behavior: "smooth" });
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && mainNav.classList.contains("open")) setNavOpen(false);
});

// Active nav link on scroll
const sections = [...document.querySelectorAll("section[id], #reviews")];
const navLinks = [...mainNav.querySelectorAll(".nav-link")];

const setActiveLink = () => {
  const headerHeight = document.querySelector(".site-header")?.offsetHeight || 80;
  const pos = window.scrollY + headerHeight + 200;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;

  navLinks.forEach((l) => l.classList.remove("active"));

  if (window.scrollY < 60) {
    const homeLink = navLinks.find((link) => {
      const href = (link.getAttribute("href") || "").replace("#", "");
      return href === "top" || href === "home";
    });
    if (homeLink) { homeLink.classList.add("active"); return; }
  }

  if (docHeight > 0 && window.scrollY + window.innerHeight >= docHeight - 15) {
    const reviewsLink = navLinks.find((link) => {
      const href = (link.getAttribute("href") || "").replace("#", "");
      return href === "reviews";
    });
    if (reviewsLink) { reviewsLink.classList.add("active"); return; }
  }

  let best = null;
  let bestTop = -Infinity;
  sections.forEach((section) => {
    const top = section.getBoundingClientRect().top + window.scrollY;
    if (pos >= top && top > bestTop) {
      bestTop = top;
      best = section.id;
    }
  });

  if (best) {
    let matched = false;
    navLinks.forEach((link) => {
      const href = (link.getAttribute("href") || "").replace("#", "");
      if (href === best) {
        link.classList.add("active");
        matched = true;
      }
    });
    if (matched) return;
  }

  navLinks[0].classList.add("active");
};

navLinks.forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    navLinks.forEach((l) => l.classList.remove("active"));
    link.classList.add("active");
    const href = link.getAttribute("href");
    if (href && href.startsWith("#")) {
      const targetId = href === "#top" ? "top" : href.substring(1);
      if (href === "#top") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        const target = document.getElementById(targetId);
        if (target) {
          const headerHeight = document.querySelector(".site-header")?.offsetHeight || 80;
          const top = target.getBoundingClientRect().top + window.pageYOffset - headerHeight - 10;
          window.scrollTo({ top, behavior: "smooth" });
        }
      }
    }
    if (mainNav.classList.contains("open")) setNavOpen(false);
    setTimeout(setActiveLink, 400);
  });
});

window.addEventListener("scroll", setActiveLink, { passive: true });
setActiveLink();

// Category detail views (event delegation: works for CEO-added cards too)
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
    showToast(`Access denied: your owner account does not have ${labelFor(card.dataset.detail)} access.`, true);
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
      showToast(`${label} Login: redirecting to the ${label} portal...`);
    } else {
      registered.add(portal);
      button.textContent = `${label} Login`;
      showToast(`Registration complete! Your ${label} account is ready.`);
    }
  });
});
