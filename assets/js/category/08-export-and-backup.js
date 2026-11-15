// ============================================================
// Category page - 08-export-and-backup.js
// Backup export / import, CSV, print report and auto backup.
// Split from the original category.js during the 2026-11 refactor.
// Loaded in numeric order by the page HTML. Keep that order.
// ============================================================

const categoryExportBackup = () => {
  const payload = {
    appName: "Online Management Site",
    bmsVersion: "2026.1",
    category: CURRENT.key,
    categoryName: CURRENT.short,
    exportedAt: new Date().toISOString(),
    features: categoryData.features,
    trash: categoryData.trash || {}
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `bms-${CURRENT.key}-backup-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showWorkspaceToast("Backup downloaded successfully!");
};

const categoryImportBackup = (file) => {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!parsed || typeof parsed !== "object") throw new Error("Invalid backup format.");
      const incomingFeatures = parsed.features || (parsed.category === CURRENT.key ? parsed.data : null);
      if (!incomingFeatures || typeof incomingFeatures !== "object") {
        throw new Error("No category records found in this backup file.");
      }

      const shouldMerge = confirm(
        "Backup file verified!\n\nClick 'OK' to MERGE with current records.\nClick 'Cancel' to REPLACE all current records with the backup."
      );

      if (shouldMerge) {
        for (const [featId, items] of Object.entries(incomingFeatures)) {
          if (Array.isArray(items)) {
            const existing = categoryData.features[featId] || [];
            const existingIds = new Set(existing.map((x) => x.id));
            const newOnes = items.filter((x) => !existingIds.has(x.id));
            categoryData.features[featId] = [...existing, ...newOnes];
          }
        }
      } else {
        categoryData.features = incomingFeatures;
        if (parsed.trash && typeof parsed.trash === "object") {
          categoryData.trash = parsed.trash;
        }
      }

      await categorySaveData();
      showWorkspaceToast("Backup successfully restored!");
      categoryRenderList();
    } catch (err) {
      alert("Restore failed: " + (err.message || "Invalid JSON file."));
    }
  };
  reader.readAsText(file);
};

const categoryExportCsv = () => {
  if (!categoryFeature) return;
  const items = categoryTab === "trash" ? categoryTrashItems() : categoryItems();
  if (!items.length) {
    alert("No records to export.");
    return;
  }
  const headers = categoryFeature.fields.map((f) => `"${f.label.replace(/"/g, '""')}"`);
  headers.push('"Created / Deleted Date"');

  const rows = items.map((item) => {
    const cells = categoryFeature.fields.map((f) => {
      const val = String(item[f.key] ?? item.fields?.[f.key] ?? "").replace(/"/g, '""');
      return `"${val}"`;
    });
    const dateVal = item.deletedAt || item.createdAt || "";
    cells.push(`"${dateVal ? new Date(dateVal).toLocaleString() : ''}"`);
    return cells.join(",");
  });

  const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bms-${CURRENT.key}-${categoryFeature.id}-${categoryTab}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showWorkspaceToast("CSV file exported successfully!");
};

const categoryPrintReport = () => {
  if (!categoryFeature && CURRENT?.features?.length) {
    categoryFeature = categoryFeatureDef(CURRENT.features[0].id);
  }
  if (!categoryFeature) return;
  const items = categoryTab === "trash" ? categoryTrashItems() : categoryItems();
  const title = `${CURRENT.short} - ${categoryFeature.name} (${categoryTab === "trash" ? "Recycle Bin" : "Active Records"})`;
  const tableHeaders = categoryFeature.fields.map((f) => `<th>${categoryEscape(f.label)}</th>`).join("");
  const tableRows = items.length ? items.map((item, idx) => {
    const cells = categoryFeature.fields.map((f) => `<td>${categoryEscape(item[f.key] ?? item.fields?.[f.key] ?? "N/A")}</td>`).join("");
    const dateStr = item.deletedAt ? `Deleted: ${new Date(item.deletedAt).toLocaleString()}` : (item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A');
    return `<tr><td>${idx + 1}</td>${cells}<td>${dateStr}</td></tr>`;
  }).join("") : `<tr><td colspan="${categoryFeature.fields.length + 2}" style="text-align:center; padding: 25px; color: #64748b; font-style: italic;">No records found.</td></tr>`;

  showWorkspaceToast("Preparing Print / PDF report...");

  const printHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${categoryEscape(title)}</title>` +
    `<style>` +
    `@page { size: auto; margin: 15mm; }` +
    `body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 25px; color: #0f172a; margin: 0; background: #fff; }` +
    `.header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 18px; }` +
    `h1 { margin: 0 0 4px; font-size: 20px; font-weight: 800; color: #0f172a; }` +
    `.meta { font-size: 12px; color: #64748b; }` +
    `table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 14px; }` +
    `th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }` +
    `th { background: #f1f5f9; font-weight: 700; color: #0f172a; }` +
    `tr:nth-child(even) { background: #f8fafc; }` +
    `@media print { body { padding: 0; } }` +
    `</style></head><body>` +
    `<div class="header"><div><h1>${categoryEscape(CURRENT.short)} &bull; ${categoryEscape(categoryFeature.name)}</h1>` +
    `<div class="meta">${categoryTab === "trash" ? "Recycle Bin Records" : "Active Records"} &bull; Printed: ${new Date().toLocaleString()} &bull; Total: ${items.length} records</div></div>` +
    `<div style="text-align:right;"><div style="font-size:14px;font-weight:700;color:#ff8f04;">Online Management Site</div><div style="font-size:11px;color:#64748b;">Enterprise Business Portal</div></div>` +
    `</div><table><thead><tr><th>#</th>${tableHeaders}<th>Date</th></tr></thead><tbody>${tableRows}</tbody></table></body></html>`;

  try {
    let iframe = document.getElementById("saasPrintFrame");
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = "saasPrintFrame";
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      iframe.style.visibility = "hidden";
      document.body.appendChild(iframe);
    }
    const frameDoc = iframe.contentWindow || iframe.contentDocument;
    const doc = frameDoc.document || frameDoc;
    doc.open();
    doc.write(printHtml);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (_) {
        window.print();
      }
    }, 250);
  } catch (_) {
    window.print();
  }
};

const formatCellVal = (val, type, fieldKey = "") => {
  if (val === null || val === undefined || val === "") return `<span class="category-empty-value">N/A</span>`;
  const s = String(val).trim();
  const lower = s.toLowerCase();
  if (["paid", "active", "completed", "done", "confirmed", "in stock", "yes", "received", "open"].includes(lower)) {
    return `<span class="cat-status-pill is-success">${categoryEscape(s)}</span>`;
  }
  if (["pending", "partial", "waiting", "low stock", "draft", "in progress"].includes(lower)) {
    return `<span class="cat-status-pill is-warning">${categoryEscape(s)}</span>`;
  }
  if (["cancelled", "out of stock", "archived", "alert", "rejected", "unpaid", "blocked", "failed"].includes(lower)) {
    return `<span class="cat-status-pill is-danger">${categoryEscape(s)}</span>`;
  }
  const isFinancial = /(amount|price|rate|cost|fee|bill|balance|cash|salary|due|expense|sale|margin)/i.test(fieldKey || "");
  if (type === "number" && !isNaN(Number(s))) {
    if (isFinancial) {
      return `<strong class="cat-num-val cat-currency-val">${categoryEscape(formatCurrencyVal(Number(s)))}</strong>`;
    }
    return `<strong class="cat-num-val">${Number(s).toLocaleString()}</strong>`;
  }
  return categoryEscape(s);
};

const categoryCheckAutoBackup = () => {
  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    const lastBackupDate = localStorage.getItem(`bms_last_autobackup_${CURRENT.key}`);
    const totalRecords = Object.values(categoryData.features || {}).reduce((s, a) => s + (Array.isArray(a) ? a.length : 0), 0);

    if (totalRecords > 0 && lastBackupDate !== todayStr) {
      const snapshotsKey = `bms_snapshots_${CURRENT.key}`;
      let snapshots = [];
      try {
        snapshots = JSON.parse(localStorage.getItem(snapshotsKey) || "[]");
      } catch (_) { snapshots = []; }

      const newSnapshot = {
        date: todayStr,
        timestamp: new Date().toISOString(),
        recordCount: totalRecords,
        features: JSON.parse(JSON.stringify(categoryData.features || {})),
        trash: JSON.parse(JSON.stringify(categoryData.trash || {}))
      };

      snapshots = [newSnapshot, ...snapshots.filter(s => s.date !== todayStr)].slice(0, 7);
      localStorage.setItem(snapshotsKey, JSON.stringify(snapshots));
      localStorage.setItem(`bms_last_autobackup_${CURRENT.key}`, todayStr);
    }
  } catch (err) {
    console.warn("Auto backup note:", err);
  }
};
