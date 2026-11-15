// ============================================================
// Category page - 11-render-list-and-form.js
// Workspace record list, sorting, pagination and entry form.
// Split from the original category.js during the 2026-11 refactor.
// Loaded in numeric order by the page HTML. Keep that order.
// ============================================================

const categoryRenderList = () => {
  if (!categoryFeature && CURRENT?.features?.length) {
    categoryFeature = categoryFeatureDef(CURRENT.features[0].id);
  }
  if (!categoryFeature) return;
  categoryEditId = null;
  const content = document.getElementById("categoryWorkspaceContent");
  renderSaasNav();
  renderSaasAnalytics();
  updateSaasPortalHeader();
  if (!content) return;

  const allActive = categoryItems();
  const allTrash = categoryTrashItems();
  const isTrash = categoryTab === "trash";
  const sourceItems = isTrash ? allTrash : allActive;

  let displayedItems = [...sourceItems];

  if (categoryDateFilter) {
    displayedItems = displayedItems.filter((item) => {
      const c = (item.createdAt || "").slice(0, 10);
      const u = (item.updatedAt || "").slice(0, 10);
      return c === categoryDateFilter || u === categoryDateFilter;
    });
  }

  const query = categorySearchQuery.trim().toLowerCase();
  if (query) {
    displayedItems = displayedItems.filter((item) => {
      return categoryFeature.fields.some((field) => {
        const val = String(item[field.key] ?? item.fields?.[field.key] ?? "").toLowerCase();
        return val.includes(query);
      }) || (item.createdAt && item.createdAt.toLowerCase().includes(query))
         || (item.deletedAt && item.deletedAt.toLowerCase().includes(query));
    });
  }

  // Column sorting
  if (categorySortCol) {
    displayedItems.sort((a, b) => {
      let va = "";
      let vb = "";
      if (categorySortCol === "__date") {
        va = isTrash ? (a.deletedAt || "") : (a.updatedAt || a.createdAt || "");
        vb = isTrash ? (b.deletedAt || "") : (b.updatedAt || b.createdAt || "");
      } else {
        va = a[categorySortCol] ?? a.fields?.[categorySortCol] ?? "";
        vb = b[categorySortCol] ?? b.fields?.[categorySortCol] ?? "";
      }

      const na = parseFloat(String(va).replace(/[^0-9.-]/g, ""));
      const nb = parseFloat(String(vb).replace(/[^0-9.-]/g, ""));
      if (!isNaN(na) && !isNaN(nb) && String(va).match(/^[0-9$€£\s,.-]+$/) && String(vb).match(/^[0-9$€£\s,.-]+$/)) {
        return categorySortDir === "asc" ? na - nb : nb - na;
      }
      return categorySortDir === "asc"
        ? String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: "base" })
        : String(vb).localeCompare(String(va), undefined, { numeric: true, sensitivity: "base" });
    });
  }

  const totalRecords = displayedItems.length;
  const pageSize = categoryPageSize === "all" ? totalRecords : (Number(categoryPageSize) || 25);
  const totalPages = Math.max(1, Math.ceil(totalRecords / (pageSize || 1)));
  if (categoryPage > totalPages) categoryPage = totalPages;
  if (categoryPage < 1) categoryPage = 1;

  const startIndex = (categoryPage - 1) * pageSize;
  const pageItems = categoryPageSize === "all" ? displayedItems : displayedItems.slice(startIndex, startIndex + pageSize);

  const columns = categoryFeature.fields.map((f) => {
    const isSorted = categorySortCol === f.key;
    const sortIcon = isSorted ? (categorySortDir === "asc" ? " ▲" : " ▼") : " <span class='cat-sort-idle'>↕</span>";
    return `<th class="cat-sortable-th ${isSorted ? 'is-sorted' : ''}" data-sort-key="${categoryEscape(f.key)}" title="Click to sort by ${categoryEscape(f.label)}">
      <span class="cat-th-wrap">
        <span>${categoryEscape(f.label)}</span>
        <span class="cat-sort-indicator">${sortIcon}</span>
      </span>
    </th>`;
  }).join("");

  const rows = pageItems.map((item, index) => {
    const cells = categoryFeature.fields.map((f) => {
      const raw = item[f.key] ?? item.fields?.[f.key] ?? "";
      return `<td>${formatCellVal(raw, f.type, f.key)}</td>`;
    }).join("");

    const dateVal = isTrash ? item.deletedAt : (item.updatedAt || item.createdAt);
    const dateFormatted = dateVal ? new Date(dateVal).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "N/A";

    let actionButtons = "";
    if (isTrash) {
      actionButtons = `
        <button type="button" class="cat-act-btn restore" data-tool-restore="${categoryEscape(item.id)}" title="Restore record to active list">
          <span aria-hidden="true">🔄</span> Restore
        </button>
        <button type="button" class="cat-act-btn delete-perm" data-tool-perm-delete="${categoryEscape(item.id)}" title="Permanently delete">
          <span aria-hidden="true">❌</span> Delete
        </button>
      `;
    } else {
      actionButtons = `
        <button type="button" class="cat-act-btn edit" data-tool-edit="${categoryEscape(item.id)}" title="Edit record">
          <span aria-hidden="true">✏️</span> Edit
        </button>
        <button type="button" class="cat-act-btn trash" data-tool-trash="${categoryEscape(item.id)}" title="Move to Recycle Bin">
          <span aria-hidden="true">🗑️</span> Delete
        </button>
      `;
    }

    const rowNum = startIndex + index + 1;
    return `
      <tr>
        <td class="cat-col-idx">${rowNum}</td>
        ${cells}
        <td class="cat-col-date">${categoryEscape(dateFormatted)}</td>
        <td class="category-row-actions">${actionButtons}</td>
      </tr>
    `;
  }).join("");

  const currCode = getGlobalCurrency();

  content.innerHTML = `
    ${isTrash ? `
      <div class="cat-ws-trash-banner">
        <span>🗑️ <strong>Recycle Bin View (${allTrash.length})</strong>: Deleted records can be restored anytime or deleted permanently.</span>
        <div class="cat-ws-trash-banner-actions">
          <button type="button" class="cat-btn-back-active" data-ws-tab="active">← Back to Active Records</button>
          ${allTrash.length ? `<button type="button" class="cat-btn-empty-trash" data-ws-empty-trash>Empty Trash</button>` : ''}
        </div>
      </div>
    ` : ""}

    ${!categoryIsSignedIn() ? `
      <div class="cat-ws-trial-banner is-guest" style="background:#fff7ed; border:1.5px solid #ff8f04; border-radius:12px; padding:0.85rem 1.15rem; margin-bottom:1rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem;">
        <div style="display:flex; align-items:center; gap:0.6rem;">
          <span style="font-size:1.3rem;">&#128274;</span>
          <div>
            <strong style="display:block; color:#0f172a; font-size:0.92rem;">Website use karne ke liye Sign Up lazmi hai</strong>
            <span style="font-size:0.8rem; color:#64748b;">Sign up karte hi aapko 5 din ka Free Trial milega jis mein aap category use kar sakenge.</span>
          </div>
        </div>
        <button type="button" class="btn btn-primary" data-action-open-trial-signup style="background:#ff8f04; border-color:#ff8f04; color:#fff; font-weight:700; padding:0.5rem 1rem; border-radius:8px; font-size:0.85rem;">
          Sign Up Free (5 Days Trial) &rarr;
        </button>
      </div>
    ` : (categoryIsSignedIn() && !categoryCanAddData() ? `
      <div class="cat-ws-trial-banner is-expired" style="background:#fef2f2; border:1.5px solid #ef4444; border-radius:12px; padding:0.85rem 1.15rem; margin-bottom:1rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem;">
        <div style="display:flex; align-items:center; gap:0.6rem;">
          <span style="font-size:1.3rem;">&#9888;&#65039;</span>
          <div>
            <strong style="display:block; color:#991b1b; font-size:0.92rem;">Aapka 5-Din ka Free Trial Khatam ho chuka hai</strong>
            <span style="font-size:0.8rem; color:#64748b;">Categories mein data add karne ke liye Subscription Plan lein. (Aap website par reviews aur comments bina subscription ke de sakte hain).</span>
          </div>
        </div>
        <button type="button" class="btn btn-primary" data-action-view-paywall style="background:#ef4444; border-color:#ef4444; color:#fff; font-weight:700; padding:0.5rem 1rem; border-radius:8px; font-size:0.85rem;">
          Purchase Subscription Plan &rarr;
        </button>
      </div>
    ` : '')}

    <div class="cat-ws-toolbar">
      <div class="cat-ws-search-wrap">
        <span class="cat-ws-search-icon" aria-hidden="true">🔍</span>
        <input type="search" class="cat-ws-search-input" data-ws-search placeholder="Search by any field..." value="${categoryEscape(categorySearchQuery)}" />
        ${categorySearchQuery ? `<button type="button" class="cat-ws-search-clear" data-ws-search-clear aria-label="Clear search">&times;</button>` : ""}
      </div>

      <div class="cat-ws-toolbar-right">
        <div class="cat-ws-view-tabs" role="tablist">
          <button type="button" class="cat-ws-view-tab ${!isTrash ? 'is-active' : ''}" data-ws-tab="active" title="View Active Records">
            <span>📋 Active</span>
            <span class="cat-ws-badge">${allActive.length}</span>
          </button>
          <button type="button" class="cat-ws-view-tab ${isTrash ? 'is-active' : ''} ${allTrash.length ? 'has-trash' : ''}" data-ws-tab="trash" title="View Recycle Bin (Deleted items)">
            <span>🗑️ Recycle Bin</span>
            <span class="cat-ws-badge">${allTrash.length}</span>
          </button>
        </div>
      </div>
    </div>

    ${displayedItems.length ? `
      <div class="category-workspace-table-wrap">
        <table class="category-workspace-table">
          <thead>
            <tr>
              <th style="width: 45px;">#</th>
              ${columns}
              <th class="cat-sortable-th ${categorySortCol === '__date' ? 'is-sorted' : ''}" data-sort-key="__date" title="Sort by Date">
                <span class="cat-th-wrap">
                  <span>${isTrash ? 'Deleted Date' : 'Date'}</span>
                  <span class="cat-sort-indicator">${categorySortCol === '__date' ? (categorySortDir === 'asc' ? ' ▲' : ' ▼') : ' <span class="cat-sort-idle">↕</span>'}</span>
                </span>
              </th>
              <th style="text-align: right; min-width: 190px; width: 190px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>

      <!-- Pagination Controls -->
      <div class="cat-table-pagination-bar">
        <div class="cat-pagination-info">
          Showing <strong>${totalRecords === 0 ? 0 : startIndex + 1}</strong> to <strong>${Math.min(startIndex + pageSize, totalRecords)}</strong> of <strong>${totalRecords}</strong> entries
          ${query ? `(filtered from ${sourceItems.length} total)` : ''}
        </div>
        <div class="cat-pagination-controls">
          <label class="cat-page-size-label">
            <span>Rows:</span>
            <select class="cat-page-size-select" data-ws-page-size aria-label="Entries per page">
              <option value="10" ${categoryPageSize == 10 ? 'selected' : ''}>10</option>
              <option value="25" ${categoryPageSize == 25 ? 'selected' : ''}>25</option>
              <option value="50" ${categoryPageSize == 50 ? 'selected' : ''}>50</option>
              <option value="100" ${categoryPageSize == 100 ? 'selected' : ''}>100</option>
              <option value="all" ${categoryPageSize === 'all' ? 'selected' : ''}>All</option>
            </select>
          </label>
          <div class="cat-pagination-btns">
            <button type="button" class="cat-page-btn" data-ws-page="prev" ${categoryPage <= 1 ? 'disabled' : ''} title="Previous Page">← Prev</button>
            <span class="cat-page-number">Page ${categoryPage} of ${totalPages}</span>
            <button type="button" class="cat-page-btn" data-ws-page="next" ${categoryPage >= totalPages ? 'disabled' : ''} title="Next Page">Next →</button>
          </div>
        </div>
      </div>
    ` : `
      <div class="saas-empty-state-card">
        <div class="saas-empty-icon-circle">${categoryEscape(isTrash ? '🗑️' : (query ? '🔍' : (categoryFeature.icon || '📝')))}</div>
        <h3 class="saas-empty-title">${isTrash ? 'Recycle Bin is Empty' : (query ? 'No Matching Records Found' : `No records yet`)}</h3>
        <p class="saas-empty-subtitle">${query ? `No records matched "${categoryEscape(categorySearchQuery)}". Try another search or clear the filter.` : (isTrash ? 'There are no deleted records currently stored in the Recycle Bin.' : `Add your first ${categoryEscape(categoryFeature.name.toLowerCase())} record to get started.`)}</p>
        <div class="saas-empty-actions">
          ${query ? `<button type="button" class="btn btn-outline" data-ws-search-clear>Clear Search</button>` : (!isTrash ? `<button type="button" class="btn btn-primary saas-module-cta-btn" data-tool-add><span>➕ Add First Record</span></button>` : `<button type="button" class="btn btn-outline" data-ws-tab="active">← Return to Active Records</button>`)}
        </div>
      </div>
    `}
  `;
};

const categoryRenderForm = (itemId = null) => {
  if (!categoryFeature && CURRENT?.features?.length) {
    categoryFeature = categoryFeatureDef(CURRENT.features[0].id);
  }
  if (!categoryFeature) return;

  // Sign up and 5-Day Free Trial / Subscription requirement check
  if (!categoryCanAddData()) {
    if (!categoryIsSignedIn()) {
      showWorkspaceToast("Website use karne ke liye pehle Sign Up karein. Aapko 5 din ka Free Trial milega!");
      showCategoryTrialModal("signup");
      return;
    }
    // Trial expired & no active subscription
    showWorkspaceToast("Aapka 5-Din ka Free Trial khatam ho chuka hai. Categories mein data add karne ke liye Subscription Plan purchase karein.");
    showCategorySubscriptionPaywall();
    return;
  }

  categoryTab = "active";
  categoryEditId = itemId;
  const item = itemId ? categoryItems().find((entry) => entry.id === itemId) : null;
  const fieldsHtml = categoryFeature.fields.map((field) => {
    const value = item?.[field.key] ?? item?.fields?.[field.key] ?? "";
    const required = field.required ? "required" : "";
    const id = `category-field-${categoryEscape(field.key)}`;
    let control;
    if (field.type === "textarea") {
      control = `<textarea id="${id}" name="${categoryEscape(field.key)}" rows="3" maxlength="2000" placeholder="Enter ${categoryEscape(field.label.toLowerCase())}..." ${required}>${categoryEscape(value)}</textarea>`;
    } else if (field.type === "select") {
      control = `<select id="${id}" name="${categoryEscape(field.key)}" ${required}><option value="">Choose ${categoryEscape(field.label)}…</option>` +
        (field.options || []).map((option) => `<option value="${categoryEscape(option)}" ${value === option ? "selected" : ""}>${categoryEscape(option)}</option>`).join("") +
        `</select>`;
    } else {
      const maxLength = { text: 200, tel: 25, email: 254 }[field.type];
      const constraints = field.type === "number" ? 'min="0" step="any"' : (maxLength ? `maxlength="${maxLength}"` : "");
      const placeholder = field.type === "date" ? "" : (field.type === "time" ? "" : `Enter ${categoryEscape(field.label.toLowerCase())}...`);
      control = `<input id="${id}" name="${categoryEscape(field.key)}" type="${categoryEscape(["text", "date", "time", "number", "tel", "email"].includes(field.type) ? field.type : "text")}" value="${categoryEscape(value)}" placeholder="${placeholder}" ${constraints} ${required}>`;
    }
    return `
      <div class="cat-form-group">
        <label for="${id}">${categoryEscape(field.label)}${field.required ? ` <span class="cat-req">*</span>` : ""}</label>
        ${control}
      </div>
    `;
  }).join("");

  const content = document.getElementById("categoryWorkspaceContent");
  if (!content) return;
  content.innerHTML = `
    <div class="cat-form-head">
      <h2 id="categoryWorkspaceTitle">${itemId ? "Edit Record" : "Add New Record"}</h2>
      <p class="category-workspace-description">${itemId ? "Update record details below and click Save Changes." : "Fill in the required information to create a new record."}</p>
    </div>
    <form class="category-record-form" id="categoryRecordForm">
      <div class="category-record-fields">${fieldsHtml}</div>
      <p class="category-auth-error" role="alert"></p>
      <div class="category-form-actions">
        ${itemId ? `<button type="button" class="btn btn-outline" data-tool-trash="${categoryEscape(itemId)}" style="margin-right:auto; color:#dc2626; border-color:#fecaca; background:#fff5f5; font-weight:700;">🗑️ Delete Record</button>` : ''}
        <button type="button" class="btn btn-outline" data-tool-back>Cancel</button>
        <button type="submit" class="btn btn-primary" ${categoryBusy ? "disabled" : ""}>${categoryBusy ? "Saving…" : (itemId ? "Save Changes" : "Create Record")}</button>
      </div>
    </form>
  `;
  content.scrollIntoView({ behavior: "smooth", block: "start" });
  setTimeout(() => {
    content.querySelector("input,select,textarea")?.focus();
  }, 100);
};
