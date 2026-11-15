// ============================================================
// Category page - 10-saas-shell.js
// SaaS sidebar, top bar, analytics strip and navigation.
// Split from the original category.js during the 2026-11 refactor.
// Loaded in numeric order by the page HTML. Keep that order.
// ============================================================

const renderSaasNav = () => {
  const navList = document.getElementById("saasNavList");
  if (!navList || !CURRENT || !Array.isArray(CURRENT.features)) return;
  const currentFeatId = categoryFeature?.id;
  navList.innerHTML = CURRENT.features.map((f) => {
    const items = categoryData.features?.[f.id];
    const count = Array.isArray(items) ? items.length : 0;
    const isActive = f.id === currentFeatId && categoryTab !== "trash";
    return `
      <button type="button" class="saas-nav-btn ${isActive ? 'active' : ''}" data-saas-feature="${categoryEscape(f.id)}" title="${categoryEscape(f.name)}">
        <span class="saas-nav-btn-icon">${f.icon}</span>
        <span class="saas-nav-btn-text">${categoryEscape(f.name)}</span>
        <span class="saas-nav-badge">${count}</span>
      </button>
    `;
  }).join("");
};


const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const renderSaasAnalytics = () => {
  const container = document.getElementById("saasAnalyticsStrip");
  if (!container || !categoryFeature) return;

  const items = categoryItems();
  const todayStr = getTodayDateString();

  const todayCount = items.filter((item) => {
    const c = (item.createdAt || "").slice(0, 10);
    const u = (item.updatedAt || "").slice(0, 10);
    return c === todayStr || u === todayStr;
  }).length;

  const totalCount = items.length;

  let dateFilterCount = 0;
  let formattedSelectedDate = "";
  if (categoryDateFilter) {
    dateFilterCount = items.filter((item) => {
      const c = (item.createdAt || "").slice(0, 10);
      const u = (item.updatedAt || "").slice(0, 10);
      return c === categoryDateFilter || u === categoryDateFilter;
    }).length;
    try {
      formattedSelectedDate = new Date(categoryDateFilter + "T00:00:00").toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    } catch (_) {
      formattedSelectedDate = categoryDateFilter;
    }
  }

  const isTodayFiltered = categoryDateFilter === todayStr;
  const isAllFiltered = !categoryDateFilter;

  container.innerHTML = `
    <!-- Box 1: Today's Entries -->
    <div class="saas-stat-box saas-stat-today is-clickable ${isTodayFiltered ? 'is-active' : ''}" id="saasBoxToday" title="Click to view today's records">
      <div class="saas-stat-header">
        <span class="saas-stat-title">Today's Entries</span>
        ${isTodayFiltered ? '<span class="saas-badge-active">Active</span>' : ''}
      </div>
      <div class="saas-stat-body">
        <strong class="saas-stat-number">${todayCount}</strong>
        <span class="saas-stat-hint">${todayCount === 1 ? '1 entry' : todayCount + ' entries'} today</span>
      </div>
    </div>

    <!-- Box 2: Total Entries -->
    <div class="saas-stat-box saas-stat-total is-clickable ${isAllFiltered ? 'is-active' : ''}" id="saasBoxTotal" title="Click to view all records">
      <div class="saas-stat-header">
        <span class="saas-stat-title">Total Entries</span>
      </div>
      <div class="saas-stat-body">
        <strong class="saas-stat-number">${totalCount}</strong>
        <span class="saas-stat-hint">All-time records</span>
      </div>
    </div>

    <!-- Box 3: Filter by Specific Date -->
    <div class="saas-stat-box saas-stat-date ${categoryDateFilter && !isTodayFiltered ? 'is-active' : ''}" id="saasBoxDatePicker">
      <div class="saas-stat-header">
        <span class="saas-stat-title">Filter by Date</span>
        ${categoryDateFilter ? `<button type="button" class="saas-date-clear-btn" id="saasClearDateBtn" title="Reset and show all dates">Reset</button>` : ''}
      </div>
      <div class="saas-stat-date-controls">
        <div class="saas-date-input-wrap">
          <input type="date" id="saasDateFilterInput" class="saas-date-input" value="${categoryDateFilter || ''}" aria-label="Select date" />
        </div>
        <div class="saas-date-status-badge">
          ${categoryDateFilter ? `<strong>${dateFilterCount}</strong> (${formattedSelectedDate})` : `<span>Select date</span>`}
        </div>
      </div>
    </div>
  `;
};
const updateSaasPortalHeader = () => {
  const brandIcon = document.getElementById("saasBrandIcon");
  if (brandIcon && CURRENT?.icon) brandIcon.textContent = CURRENT.icon;
  const brandTitle = document.getElementById("saasBrandTitle");
  if (brandTitle && CURRENT?.short) brandTitle.textContent = `${CURRENT.short} Portal`;
  const crumbRoot = document.getElementById("saasCrumbRoot");
  if (crumbRoot && CURRENT?.short) crumbRoot.textContent = CURRENT.short;
  const crumbCur = document.getElementById("saasCrumbCurrent");
  if (crumbCur && categoryFeature) crumbCur.textContent = categoryTab === "trash" ? `${categoryFeature.name} (Trash)` : categoryFeature.name;

  const topTrashBtn = document.getElementById("saasRecycleBinBtn");
  if (topTrashBtn) {
    const totalTrash = Object.values(categoryData.trash || {}).reduce((s, a) => s + (Array.isArray(a) ? a.length : 0), 0);
    if (categoryTab === "trash") {
      topTrashBtn.classList.add("is-active");
      topTrashBtn.innerHTML = `<span>&#128203; Active Records</span>`;
      topTrashBtn.title = "Return to Active Records";
    } else {
      topTrashBtn.classList.remove("is-active");
      topTrashBtn.innerHTML = `<span>&#128465;&#65039; Recycle Bin (${totalTrash})</span>`;
      topTrashBtn.title = "View Recycle Bin";
    }
  }

  const trial = categoryGetTrial();
  const hasSub = categoryHasActiveSubscription();
  const userTitle = document.getElementById("saasUserTitle");
  const userSub = document.getElementById("saasUserSub");
  if (userTitle && userSub) {
    if (hasSub) {
      userTitle.textContent = categoryUser?.user_metadata?.name || "Pro Member";
      userSub.textContent = "\u{1F48E} Pro Active";
      userSub.style.color = "#3b82f6";
    } else if (trial && trial.isActive) {
      userTitle.textContent = trial.name || "Business User";
      userSub.textContent = `\u{1F7E2} Free Trial (${trial.daysLeft}d left)`;
      userSub.style.color = "#10b981";
    } else if (trial && !trial.isActive) {
      userTitle.textContent = trial.name || "Business User";
      userSub.textContent = "\u26A0\uFE0F Trial Ended";
      userSub.style.color = "#ef4444";
    } else {
      userTitle.textContent = "Sign Up Required";
      userSub.textContent = "\u{1F512} Sign Up (5-Day Trial)";
      userSub.style.color = "#f59e0b";
    }
  }
};

const ensureSaasSidebarBackdrop = () => {
  let backdrop = document.getElementById("saasSidebarBackdrop");
  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.id = "saasSidebarBackdrop";
    backdrop.className = "saas-sidebar-backdrop";
    document.body.appendChild(backdrop);
    backdrop.addEventListener("click", () => toggleSaasSidebar(false));
  }
  return backdrop;
};

const toggleSaasSidebar = (forceState) => {
  const sidebar = document.getElementById("saasSidebar");
  if (!sidebar) return;
  const backdrop = ensureSaasSidebarBackdrop();
  const isCurrentlyOpen = sidebar.classList.contains("is-open");
  const shouldOpen = typeof forceState === "boolean" ? forceState : !isCurrentlyOpen;
  sidebar.classList.toggle("is-open", shouldOpen);
  if (backdrop) backdrop.classList.toggle("is-open", shouldOpen);
  if (shouldOpen) {
    document.body.classList.add("saas-sidebar-locked");
  } else {
    document.body.classList.remove("saas-sidebar-locked");
  }
};

const selectSaasFeature = (featureId) => {
  categoryFeature = categoryFeatureDef(featureId);
  categoryEditId = null;
  categoryTab = "active";
  categorySearchQuery = "";
  categorySortCol = null;
  categorySortDir = "asc";
  categoryPage = 1;
  renderSaasNav();
  renderSaasAnalytics();
  updateSaasPortalHeader();
  categoryRenderList();

  toggleSaasSidebar(false);
};
