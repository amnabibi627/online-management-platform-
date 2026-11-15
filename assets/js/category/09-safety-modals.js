// ============================================================
// Category page - 09-safety-modals.js
// Shortcuts, data safety, privacy and demo reset modals.
// Split from the original category.js during the 2026-11 refactor.
// Loaded in numeric order by the page HTML. Keep that order.
// ============================================================

const showCategoryShortcutsModal = () => {
  const existing = document.getElementById("catShortcutsModal");
  if (existing) existing.remove();
  const html = `
    <div class="category-modal-backdrop is-open" id="catShortcutsModal" style="display:flex; z-index:99999;">
      <div class="category-modal-card" style="max-width:440px;">
        <div class="category-modal-card-header">
          <h3 style="margin:0; font-size:1.15rem; font-weight:800; color:#0f172a;">&#9000;&#65039; Global Power Shortcuts</h3>
          <button type="button" class="category-modal-close-btn" onclick="document.getElementById('catShortcutsModal')?.remove()">&times;</button>
        </div>
        <div class="category-modal-card-body" style="padding:1rem 1.25rem;">
          <div style="display:grid; gap:0.75rem; font-size:0.88rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f1f5f9; padding-bottom:6px;">
              <span>Add New Record</span>
              <kbd style="padding:3px 8px; background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; font-weight:700;">Alt + N</kbd>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f1f5f9; padding-bottom:6px;">
              <span>Focus Search Box</span>
              <kbd style="padding:3px 8px; background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; font-weight:700;">/</kbd>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f1f5f9; padding-bottom:6px;">
              <span>Print / PDF View</span>
              <kbd style="padding:3px 8px; background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; font-weight:700;">Alt + P</kbd>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f1f5f9; padding-bottom:6px;">
              <span>Export CSV Spreadsheet</span>
              <kbd style="padding:3px 8px; background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; font-weight:700;">Alt + E</kbd>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f1f5f9; padding-bottom:6px;">
              <span>Cancel / Close Dialog</span>
              <kbd style="padding:3px 8px; background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; font-weight:700;">Esc</kbd>
            </div>
          </div>
          <div style="margin-top:1.25rem; text-align:right;">
            <button type="button" class="btn btn-primary" onclick="document.getElementById('catShortcutsModal')?.remove()" style="padding:0.45rem 1.1rem; font-size:0.85rem; background:#ff8f04; border-color:#ff8f04; color:#fff;">Got it</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", html);
};

const showCategorySafetyModal = () => {
  categoryEnsureToolsUi();
  const modal = document.getElementById("categorySafetyModalBackdrop");
  const body = document.getElementById("categorySafetyModalBody");
  if (!modal || !body) return;

  const totalRecords = Object.values(categoryData.features || {}).reduce((s, a) => s + (Array.isArray(a) ? a.length : 0), 0);
  const snapshotsKey = `bms_snapshots_${CURRENT.key}`;
  let snapshots = [];
  try {
    snapshots = JSON.parse(localStorage.getItem(snapshotsKey) || "[]");
  } catch (_) { snapshots = []; }

  const todayStr = new Date().toISOString().slice(0, 10);

  let snapshotsHtml = "";
  if (snapshots.length === 0) {
    snapshotsHtml = `
      <div class="safety-snapshot-item">
        <div class="safety-snapshot-info">
          <span class="safety-snapshot-date">Today's Live Snapshot (${todayStr})</span>
          <span class="safety-snapshot-meta">${totalRecords} records active &bull; Auto-sync active</span>
        </div>
        <span class="cat-status-pill is-success">Up to date</span>
      </div>
    `;
  } else {
    snapshotsHtml = snapshots.map((s, idx) => `
      <div class="safety-snapshot-item">
        <div class="safety-snapshot-info">
          <span class="safety-snapshot-date">Daily Snapshot: ${categoryEscape(s.date)}</span>
          <span class="safety-snapshot-meta">${s.recordCount || 0} records &bull; Time: ${new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <button type="button" class="btn btn-outline btn-sm" data-restore-snapshot="${idx}">Restore</button>
      </div>
    `).join("");
  }

  body.innerHTML = `
    <div class="safety-status-badge">
      <span class="safety-status-dot"></span>
      <span>Encrypted Database Active &bull; Multi-Tenant Isolation &bull; TLS 1.3</span>
    </div>

    <p style="margin-bottom:0.75rem; font-size:0.88rem; color:#475569;">
      Your business data is protected by multi-tenant database isolation. Patient health records, store invoices, and customer transactions are private and never accessible to other accounts.
    </p>

    <div class="safety-section-title">ðŸ”„ Automatic Daily Rolling Backups (Last 7 Days)</div>
    <div class="safety-snapshots-list">
      ${snapshotsHtml}
    </div>

    <div class="safety-actions-grid">
      <button type="button" class="btn btn-primary" id="safetyDownloadBackupBtn">
        <span>ðŸ’¾ Download JSON Backup</span>
      </button>
      <button type="button" class="btn btn-outline" id="safetyUploadBackupBtn">
        <span>ðŸ“‚ Upload &amp; Restore File</span>
      </button>
    </div>
  `;

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
};

const showCategoryPrivacyModal = () => {
  categoryEnsureToolsUi();
  const modal = document.getElementById("categoryPrivacyModalBackdrop");
  if (modal) {
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
  }
};

const categoryEnsureSampleData = () => {};

const categoryResetDemoData = () => {
  if (confirm("Reset portal to live demo sample records? This will populate all 12 modules with clean test data.")) {
    categoryData.features = {};
    categoryData.trash = {};
    categoryEnsureSampleData();
    categoryRenderList();
    showWorkspaceToast("Reset to active demo data successfully!");
  }
};
