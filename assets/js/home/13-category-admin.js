// ============================================================
// Home page - 13-category-admin.js
// Per-category admin console.
// Split from the original script.js during the 2026-11 refactor.
// Loaded in numeric order by the page HTML. Keep that order.
// ============================================================

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

const openCategoryAdmin = async (key) => {
  if (!canAccessCat(key)) {
    showToast(`Access denied: you don't have ${labelFor(key)} access.`, true);
    return;
  }
  catAdminKey = key;
  catAdminTab = "overview";
  catAdminPanel.innerHTML = `<p class="admin-empty">Loading category data…</p>`;
  catAdminModal.classList.add("open");
  catAdminModal.setAttribute("aria-hidden", "false");
  if (sb && cloudUser) {
    try {
      await loadAccountingTransactions();
    } catch (error) {
      console.error("Category cashbook data failed to load:", error);
      accountingTransactions = [];
      accountingTransactionsOwnerId = null;
      showToast("Cashbook totals could not be refreshed. Retry from the Business Admin Panel.", true);
    }
  }
  renderCategoryAdmin();
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
  const feats = catAdminFeatureSummaries(catAdminKey);
  const featRows = feats.map((f) =>
    `<div class="admin-cat-row">` +
    `<div class="admin-cat-row-left"><span class="admin-cat-row-icon">${f.def.icon}</span>` +
    `<div><div class="admin-cat-row-name">${escHtml(f.def.name)}</div>` +
    `<div class="admin-cat-row-meta">${f.count} operational records</div></div></div>` +
    `<button type="button" class="admin-ghost-btn" data-cat-admin-feature="${escHtml(f.fid)}">Open</button></div>`
  ).join("");

  return catAdminTabsHtml() +
    `<div class="admin-stat-grid">` +
    `<div class="admin-stat"><div class="admin-stat-num">${money(l.received)}</div><div class="admin-stat-lbl">Income received</div></div>` +
    `<div class="admin-stat"><div class="admin-stat-num">${money(l.receivable)}</div><div class="admin-stat-lbl">Receivable</div></div>` +
    `<div class="admin-stat"><div class="admin-stat-num">${money(l.expensesPaid)}</div><div class="admin-stat-lbl">Expenses paid</div></div>` +
    `<div class="admin-stat"><div class="admin-stat-num">${money(l.payable)}</div><div class="admin-stat-lbl">Expenses unpaid</div></div>` +
    `<div class="admin-stat"><div class="admin-stat-num">${money(l.netCash)}</div><div class="admin-stat-lbl">Net cash recorded</div></div>` +
    `<div class="admin-stat"><div class="admin-stat-num">${l.entries}</div><div class="admin-stat-lbl">Total Entries</div></div>` +
    `</div>` +
    `<p class="admin-note">Financial values come only from the cloud Cashbook. Feature records are counted as operational data, not money.</p>` +
    `<div class="admin-toolbar">` +
    `<button type="button" class="btn btn-primary" data-cat-admin-export>⬇️ Export CSV</button>` +
    `<button type="button" class="btn btn-outline" data-cat-admin-data>🗂️ View All Data</button>` +
    `<button type="button" class="btn btn-outline" data-cat-admin-close2>✕ Close</button>` +
    `</div>` +
    `<div class="admin-section-title">🧩 ${m.icon} ${escHtml(m.name)}: feature performance</div>` +
    (featRows || `<div class="admin-empty">No entries yet in ${escHtml(m.name)}. Open a feature card and add your first record.</div>`);
};

const renderCatAdminReports = () => {
  const l = categoryLedger(catAdminKey);
  return catAdminTabsHtml() +
    `<div class="admin-section-title">💰 Cashbook report: ${escHtml(catMeta(catAdminKey).name)}</div>` +
    `<p class="admin-note">Net cash includes settled income less paid expenses. Pending amounts are shown separately and are not included in net cash.</p>` +
    `<div class="f-table-wrap"><table class="f-table admin-report-table"><thead><tr>` +
    `<th>Transactions</th><th>Income</th><th>Received</th><th>Receivable</th><th>Expenses</th><th>Paid</th><th>Unpaid</th><th>Net cash</th>` +
    `</tr></thead><tbody><tr><td>${l.transactionCount}</td><td>${money(l.income)}</td><td>${money(l.received)}</td>` +
    `<td>${money(l.receivable)}</td><td>${money(l.expenses)}</td><td>${money(l.expensesPaid)}</td>` +
    `<td>${money(l.payable)}</td><td>${money(l.netCash)}</td></tr></tbody></table></div>` +
    `<p class="admin-note">Add or manage entries in Business Admin → Cashbook. No amounts are inferred from feature records.</p>`;
};

const renderCatAdminFeatures = () => {
  const feats = catAdminFeatureSummaries(catAdminKey);
  const maxCount = Math.max(1, ...feats.map((f) => f.count));
  const bars = feats.map((f) => {
    const pct = Math.round((f.count / maxCount) * 100);
    return `<div class="admin-bar-row"><span class="admin-bar-lbl">${f.def.icon} ${escHtml(f.def.name)}</span>` +
      `<span class="admin-bar-track"><span class="admin-bar-fill" style="width:${pct}%"></span></span>` +
      `<span class="admin-bar-val">${f.count} records</span></div>`;
  }).join("");
  const cards = feats.map((f) =>
    `<div class="admin-cat-row">` +
    `<div class="admin-cat-row-left"><span class="admin-cat-row-icon">${f.def.icon}</span>` +
    `<div><div class="admin-cat-row-name">${escHtml(f.def.name)}</div>` +
    `<div class="admin-cat-row-meta">${f.count} operational records</div></div></div>` +
    `<button type="button" class="admin-ghost-btn" data-cat-admin-feature="${escHtml(f.fid)}">Manage</button></div>`
  ).join("");
  return catAdminTabsHtml() +
    `<div class="admin-section-title">📈 Operational records by feature</div>` +
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
        const labelKey = Object.keys(f).find((k) =>
          k !== "id" && k !== "createdAt" && k !== "updatedAt" &&
          /name|title|patient|customer|client|student|dish|item|product|medicine|service|course|doctor|supplier|attendant|stylist/i.test(k)
        );
        const label = labelKey && f[labelKey] ? String(f[labelKey]) : (def.name + " #" + String(it.id || "").slice(0, 4));
        items.push({ def, label, at: it.updatedAt || it.createdAt });
      });
    });
  }
  items.sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
  const top = items.slice(0, 10);
  const rows = top.map((it, i) =>
    `<tr><td>${i + 1}</td><td><span class="admin-recent-icon">${it.def.icon}</span> ${escHtml(it.label)}</td>` +
    `<td>${escHtml(it.def.name)}</td><td>${fmtDate(it.at)}</td></tr>`
  ).join("");
  return catAdminTabsHtml() +
    `<div class="admin-section-title">🕒 10 most recently updated records: ${escHtml(catMeta(catAdminKey).name)}</div>` +
    `<div class="f-table-wrap"><table class="f-table admin-report-table"><thead><tr>` +
    `<th>#</th><th>Record</th><th>Feature</th><th>Updated</th>` +
    `</tr></thead><tbody>${rows || `<tr><td colspan="4" class="f-muted">No records yet.</td></tr>`}</tbody></table></div>`;
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
      const tds = def.fields.map((f) => `<td>${escHtml(String((it[f.key] ?? (it.fields && it.fields[f.key])) ?? "")) || "<span class='f-muted'>N/A</span>"}</td>`).join("");
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
