// ============================================================
// Home page - 12-owner-business-admin.js
// Owner business admin console, cashbook and reports.
// Split from the original script.js during the 2026-11 refactor.
// Loaded in numeric order by the page HTML. Keep that order.
// ============================================================

// ===== Owner Business Admin Panel =====
// Per-owner management console: financial reports, analytics and tools,
// scoped to the categories the owner is allowed to access (CEO sees all).
const ownerAdminModal = document.getElementById("ownerAdminModal");
const ownerAdminPanel = document.getElementById("ownerAdminPanel");
let ownerAdminTab = "overview";
let ownerAdminCat = "all";

const ownerScopeKeys = () => {
  const all = allCategoryKeys();
  if (ceoMode || !owner) return all;
  const allowed = ownerAllowedCats(owner);
  return all.filter((k) => allowed.includes(k));
};

let accountingTransactions = [];
let accountingTransactionsOwnerId = null;

const loadAccountingTransactions = async () => {
  if (!sb || !cloudUser) throw new Error("Sign in to load your cloud cashbook.");
  accountingTransactions = [];
  accountingTransactionsOwnerId = null;
  const { data, error } = await sb.from("financial_transactions")
    .select("id,user_id,category,transaction_date,transaction_type,payment_status,amount,description,created_at")
    .eq("user_id", cloudUser.id)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  accountingTransactions = data || [];
  accountingTransactionsOwnerId = cloudUser.id;
};

const transactionsForCategories = (keys) =>
  (accountingTransactionsOwnerId === cloudUser?.id ? accountingTransactions : [])
    .filter((transaction) => keys.includes(transaction.category));

const transactionSummary = (transactions) => {
  const sum = (test) => transactions.reduce((total, transaction) =>
    test(transaction) ? total + Number(transaction.amount || 0) : total, 0);
  const income = sum((t) => t.transaction_type === "income");
  const expenses = sum((t) => t.transaction_type === "expense");
  const received = sum((t) => t.transaction_type === "income" && t.payment_status === "settled");
  const receivable = sum((t) => t.transaction_type === "income" && t.payment_status === "pending");
  const expensesPaid = sum((t) => t.transaction_type === "expense" && t.payment_status === "settled");
  const payable = sum((t) => t.transaction_type === "expense" && t.payment_status === "pending");
  return {
    income, expenses, received, receivable, expensesPaid, payable,
    netCash: received - expensesPaid,
    transactionCount: transactions.length
  };
};

const featureLedger = (key, fid) => {
  const col = store.get(collectionKey(key), null);
  const entries = (col && col.features && col.features[fid]) || [];
  return { count: Array.isArray(entries) ? entries.length : 0 };
};

const categoryLedger = (key) => {
  const col = store.get(collectionKey(key), null);
  let entries = 0, features = 0;
  if (col && col.features) {
    Object.keys(col.features).forEach((fid) => {
      const arr = col.features[fid];
      if (!Array.isArray(arr) || !arr.length) return;
      features++;
      entries += arr.length;
    });
  }
  return {
    ...transactionSummary(transactionsForCategories([key])),
    entries,
    features
  };
};

const ownerScopeLedger = () => {
  const keys = ownerAdminCat === "all" ? ownerScopeKeys() : [ownerAdminCat];
  let entries = 0, features = 0;
  keys.forEach((k) => {
    const l = categoryLedger(k);
    entries += l.entries;
    features += l.features;
  });
  return {
    ...transactionSummary(transactionsForCategories(keys)),
    entries, features, keys
  };
};

const money = (n) => "PKR " + Math.round(n || 0).toLocaleString();

const closeOwnerAdmin = () => {
  ownerAdminModal.classList.remove("open");
  ownerAdminModal.setAttribute("aria-hidden", "true");
  ownerAdminPanel.innerHTML = "";
};

const openOwnerAdmin = async () => {
  if (!ceoUser && !owner) { showToast("Business Admin Panel requires CEO or Owner login.", true); return; }
  closeCeoModal();
  if (!sb || !cloudUser) { showToast("Sign in online to open your cloud cashbook.", true); return; }
  ownerAdminTab = "overview";
  ownerAdminCat = "all";
  ownerAdminPanel.innerHTML = `<p class="admin-empty">Loading your cloud cashbook…</p>`;
  ownerAdminModal.classList.add("open");
  ownerAdminModal.setAttribute("aria-hidden", "false");
  try {
    await loadAccountingTransactions();
    renderOwnerAdminPanel();
  } catch (error) {
    console.error("Business Admin Panel failed to load:", error);
    ownerAdminPanel.innerHTML = `<button type="button" class="modal-close" data-owner-admin-close aria-label="Close">&times;</button>` +
      `<p class="admin-empty">Could not load your cashbook: ${escHtml(error.message || "Unknown error")}</p>`;
  }
};

const ownerAdminTabsHtml = () => {
  const tabs = [
    ["overview", "📊 Overview"],
    ["reports", "💰 Financial Reports"],
    ["cashbook", "📒 Cashbook"],
    ["analytics", "📈 Analytics"],
    ["data", "🗂️ Data"]
  ];
  return `<div class="admin-tabs">` + tabs.map(([id, label]) =>
    `<button type="button" class="admin-tab${ownerAdminTab === id ? " active" : ""}" data-owner-admin-tab="${id}">${label}</button>`
  ).join("") + `</div>`;
};

const ownerScopeBar = () => {
  const keys = ownerScopeKeys();
  if (keys.length <= 1) return "";
  return `<div class="admin-filter-bar">` +
    `<button type="button" class="admin-filter${ownerAdminCat === "all" ? " active" : ""}" data-owner-admin-filter="all">All (${keys.length})</button>` +
    keys.map((k) => { const m = catMeta(k); return `<button type="button" class="admin-filter${ownerAdminCat === k ? " active" : ""}" data-owner-admin-filter="${escHtml(k)}">${m.icon} ${escHtml(m.name)}</button>`; }).join("") +
    `</div>`;
};

const renderOwnerAdminOverview = () => {
  const keys = ownerAdminCat === "all" ? ownerScopeKeys() : [ownerAdminCat];
  const led = ownerScopeLedger();
  const ownersName = ceoMode ? "CEO (full access)" : owner ? owner.name : "N/A";

  const catCards = keys.map((k) => {
    const m = catMeta(k);
    const l = categoryLedger(k);
    return `<div class="admin-cat-row">` +
      `<div class="admin-cat-row-left"><span class="admin-cat-row-icon">${m.icon}</span>` +
      `<div><div class="admin-cat-row-name">${escHtml(m.name)}</div>` +
      `<div class="admin-cat-row-meta">${l.entries} records · ${l.transactionCount} transactions · net cash ${money(l.netCash)}</div></div></div>` +
      `<button type="button" class="admin-ghost-btn" data-owner-admin-goto="${escHtml(k)}">Report</button></div>`;
  }).join("");

  return ownerAdminTabsHtml() + ownerScopeBar() +
    `<div class="admin-stat-grid">` +
    `<div class="admin-stat"><div class="admin-stat-num">${money(led.received)}</div><div class="admin-stat-lbl">Income received</div></div>` +
    `<div class="admin-stat"><div class="admin-stat-num">${money(led.receivable)}</div><div class="admin-stat-lbl">Income receivable</div></div>` +
    `<div class="admin-stat"><div class="admin-stat-num">${money(led.expensesPaid)}</div><div class="admin-stat-lbl">Expenses paid</div></div>` +
    `<div class="admin-stat"><div class="admin-stat-num">${money(led.payable)}</div><div class="admin-stat-lbl">Expenses unpaid</div></div>` +
    `<div class="admin-stat"><div class="admin-stat-num">${money(led.netCash)}</div><div class="admin-stat-lbl">Net cash recorded</div></div>` +
    `<div class="admin-stat"><div class="admin-stat-num">${led.entries}</div><div class="admin-stat-lbl">Total Entries</div></div>` +
    `</div>` +
    `<div class="admin-note">Signed in as <strong>${escHtml(ownersName)}</strong> · ${keys.length} categor${keys.length === 1 ? "y" : "ies"} in scope.</div>` +
    `<div class="admin-note">Financial totals include only transactions entered in the Cashbook. Feature records are not treated as income or expenses.</div>` +
    `<div class="admin-section-title">📁 Category performance</div>` +
    (catCards || `<div class="admin-empty">No categories in your scope.</div>`);
};

const renderOwnerAdminReports = () => {
  const keys = ownerAdminCat === "all" ? ownerScopeKeys() : [ownerAdminCat];
  const rows = keys.map((k) => {
    const m = catMeta(k);
    const l = categoryLedger(k);
    return `<tr><td><span class="admin-recent-icon">${m.icon}</span> ${escHtml(m.name)}</td>` +
      `<td>${l.transactionCount}</td><td>${money(l.income)}</td><td>${money(l.received)}</td>` +
      `<td>${money(l.receivable)}</td><td>${money(l.expenses)}</td><td>${money(l.expensesPaid)}</td>` +
      `<td>${money(l.payable)}</td><td>${money(l.netCash)}</td></tr>`;
  }).join("");
  return ownerAdminTabsHtml() + ownerScopeBar() +
    `<div class="admin-section-title">💰 Cashbook report by category</div>` +
    `<p class="admin-note">Only saved cashbook transactions are included. Pending income and unpaid expenses are excluded from net cash.</p>` +
    `<div class="f-table-wrap"><table class="f-table admin-report-table"><thead><tr>` +
    `<th>Category</th><th>Transactions</th><th>Income</th><th>Received</th><th>Receivable</th>` +
    `<th>Expenses</th><th>Paid</th><th>Unpaid</th><th>Net cash</th>` +
    `</tr></thead><tbody>${rows || `<tr><td colspan="9" class="f-muted">No data.</td></tr>`}</tbody></table></div>`;
};

const renderOwnerAdminAnalytics = () => {
  const keys = ownerAdminCat === "all" ? ownerScopeKeys() : [ownerAdminCat];
  const led = ownerScopeLedger();
  const maxActivity = Math.max(1, ...keys.map((k) => {
    const l = categoryLedger(k);
    return l.income + l.expenses;
  }));
  const totalBars = keys.map((k) => {
    const m = catMeta(k);
    const l = categoryLedger(k);
    const activity = l.income + l.expenses;
    const pct = Math.round((activity / maxActivity) * 100);
    return `<div class="admin-bar-row"><span class="admin-bar-lbl">${m.icon} ${escHtml(m.name)}</span>` +
      `<span class="admin-bar-track"><span class="admin-bar-fill" style="width:${pct}%"></span></span>` +
      `<span class="admin-bar-val">${money(activity)}</span></div>`;
  }).join("");

  const featureBreakdown = keys.map((k) => {
    const m = catMeta(k);
    const col = store.get(collectionKey(k), null);
    if (!col || !col.features) return "";
    const frows = Object.keys(col.features).map((fid) => {
      const arr = col.features[fid];
      if (!Array.isArray(arr) || !arr.length) return "";
      const def = getFeatureDef(k, fid, null);
      const l = featureLedger(k, fid);
      const maxEntries = Math.max(1, ...Object.values(col.features).map((entries) => Array.isArray(entries) ? entries.length : 0));
      return `<div class="admin-bar-row"><span class="admin-bar-lbl">${def.icon} ${escHtml(def.name)}</span>` +
        `<span class="admin-bar-track"><span class="admin-bar-fill" style="width:${Math.round((l.count / maxEntries) * 100)}%"></span></span>` +
        `<span class="admin-bar-val">${l.count} records</span></div>`;
    }).join("");
    return frows ? `<div class="admin-section-title">${m.icon} ${escHtml(m.name)}</div><div class="admin-bars">${frows}</div>` : "";
  }).join("");

  return ownerAdminTabsHtml() + ownerScopeBar() +
    `<div class="admin-stat-grid">` +
    `<div class="admin-stat"><div class="admin-stat-num">${money(led.received)}</div><div class="admin-stat-lbl">Cash received</div></div>` +
    `<div class="admin-stat"><div class="admin-stat-num">${money(led.expensesPaid)}</div><div class="admin-stat-lbl">Cash expenses</div></div>` +
    `<div class="admin-stat"><div class="admin-stat-num">${money(led.netCash)}</div><div class="admin-stat-lbl">Net cash</div></div>` +
    `</div>` +
    `<div class="admin-section-title">📈 Recorded transaction amounts by category</div>` +
    `<div class="admin-bars">${totalBars || `<div class="admin-empty">No data.</div>`}</div>` +
    (featureBreakdown ? `<div class="admin-section-title">🔎 Operational records by feature (not financial)</div>${featureBreakdown}` : "");
};

const cashbookStatusLabel = (transaction) => {
  if (transaction.transaction_type === "income") {
    return transaction.payment_status === "settled" ? "Received" : "Receivable";
  }
  return transaction.payment_status === "settled" ? "Paid" : "Unpaid";
};

const renderOwnerAdminCashbook = () => {
  const keys = ownerAdminCat === "all" ? ownerScopeKeys() : [ownerAdminCat];
  const transactions = transactionsForCategories(keys).slice()
    .sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));
  const summary = transactionSummary(transactions);
  const categoryOptions = keys.map((key) => {
    const meta = catMeta(key);
    return `<option value="${escHtml(key)}"${keys.length === 1 ? " selected" : ""}>${escHtml(meta.name)}</option>`;
  }).join("");
  const rows = transactions.slice(0, 200).map((transaction) => {
    const meta = catMeta(transaction.category);
    const typeLabel = transaction.transaction_type === "income" ? "Income" : "Expense";
    return `<tr>` +
      `<td>${fmtRegDate(transaction.transaction_date)}</td>` +
      `<td>${meta.icon} ${escHtml(meta.name)}</td>` +
      `<td>${typeLabel}</td>` +
      `<td>${escHtml(cashbookStatusLabel(transaction))}</td>` +
      `<td>${money(transaction.amount)}</td>` +
      `<td>${escHtml(transaction.description)}</td>` +
      `<td class="f-act-cell"><button type="button" class="admin-ghost-btn" data-cashbook-delete="${escHtml(transaction.id)}">Delete</button></td>` +
      `</tr>`;
  }).join("");

  return ownerAdminTabsHtml() + ownerScopeBar() +
    `<div class="admin-section-title">📒 Cashbook transactions</div>` +
    `<p class="admin-note">Enter each income or expense once. Pending income and unpaid expenses are tracked separately; only settled transactions affect net cash. Older feature records are not imported as financial entries.</p>` +
    `<div class="admin-stat-grid">` +
      `<div class="admin-stat"><div class="admin-stat-num">${money(summary.received)}</div><div class="admin-stat-lbl">Income received</div></div>` +
      `<div class="admin-stat"><div class="admin-stat-num">${money(summary.receivable)}</div><div class="admin-stat-lbl">Receivable</div></div>` +
      `<div class="admin-stat"><div class="admin-stat-num">${money(summary.expensesPaid)}</div><div class="admin-stat-lbl">Expenses paid</div></div>` +
      `<div class="admin-stat"><div class="admin-stat-num">${money(summary.payable)}</div><div class="admin-stat-lbl">Expenses unpaid</div></div>` +
      `<div class="admin-stat"><div class="admin-stat-num">${money(summary.netCash)}</div><div class="admin-stat-lbl">Net cash</div></div>` +
    `</div>` +
    `<form class="cashbook-form" data-cashbook-form>` +
      `<label>Category<select name="category" required>${categoryOptions}</select></label>` +
      `<label>Type<select name="transaction_type" required><option value="income">Income</option><option value="expense">Expense</option></select></label>` +
      `<label>Payment status<select name="payment_status" required><option value="settled">Settled</option><option value="pending">Pending</option></select></label>` +
      `<label>Amount (PKR)<input name="amount" type="number" min="1" step="1" inputmode="numeric" required /></label>` +
      `<label>Date<input name="transaction_date" type="date" value="${new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)}" required /></label>` +
      `<label class="cashbook-description">Description<input name="description" type="text" minlength="3" maxlength="160" required placeholder="e.g. Consultation fee or utility bill" /></label>` +
      `<button type="submit" class="btn btn-primary">Add transaction</button>` +
    `</form>` +
    `<div class="f-table-wrap"><table class="f-table admin-report-table"><thead><tr>` +
      `<th>Date</th><th>Category</th><th>Type</th><th>Status</th><th>Amount</th><th>Description</th><th></th>` +
    `</tr></thead><tbody>${rows || `<tr><td colspan="7" class="f-muted">No cashbook transactions in this scope yet.</td></tr>`}</tbody></table></div>` +
    (transactions.length > 200 ? `<p class="admin-note">Showing the latest 200 of ${transactions.length} transactions.</p>` : "");
};

const renderOwnerAdminData = () => {
  const keys = ownerAdminCat === "all" ? ownerScopeKeys() : [ownerAdminCat];
  const blocks = keys.map((key) => {
    const meta = catMeta(key);
    const col = store.get(collectionKey(key), null);
    const featureIds = col && col.features ? Object.keys(col.features).filter((fid) => Array.isArray(col.features[fid]) && col.features[fid].length) : [];
    if (!featureIds.length) return "";
    const sections = featureIds.map((fid) => {
      const def = getFeatureDef(key, fid, null);
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
    return `<div class="admin-section-title">${meta.icon} ${escHtml(meta.name)}</div>` + sections;
  }).join("");
  return ownerAdminTabsHtml() + ownerScopeBar() +
    `<div class="admin-section-title">🗂️ Business data in your scope</div>` +
    (blocks || `<div class="admin-empty">No data saved yet.</div>`);
};

const renderOwnerAdminPanel = () => {
  if (!ownerAdminPanel) return;
  let body;
  if (ownerAdminTab === "reports") body = renderOwnerAdminReports();
  else if (ownerAdminTab === "cashbook") body = renderOwnerAdminCashbook();
  else if (ownerAdminTab === "analytics") body = renderOwnerAdminAnalytics();
  else if (ownerAdminTab === "data") body = renderOwnerAdminData();
  else body = renderOwnerAdminOverview();

  ownerAdminPanel.innerHTML =
    `<button type="button" class="modal-close" data-owner-admin-close aria-label="Close">&times;</button>` +
    `<div class="feature-head"><div class="feature-title"><span class="feature-icon">🔐</span>` +
    `<div><h3>Business Admin Panel</h3><p class="feature-sub">${escHtml(ceoMode ? "CEO: full access" : owner ? owner.name + " · Owner" : "Owner")} · cashbook, reports, analytics &amp; management tools</p></div></div></div>` +
    body;
};

ownerAdminModal.addEventListener("click", (e) => {
  if (e.target === ownerAdminModal || e.target.closest("[data-owner-admin-close]")) { closeOwnerAdmin(); return; }
  const deleteTransaction = e.target.closest("[data-cashbook-delete]");
  if (deleteTransaction) {
    const transaction = accountingTransactions.find((item) => item.id === deleteTransaction.dataset.cashbookDelete);
    if (!transaction || !confirm(`Delete this ${transaction.transaction_type} transaction for ${money(transaction.amount)}?`)) return;
    deleteTransaction.disabled = true;
    (async () => {
      try {
        const { error } = await sb.from("financial_transactions").delete()
          .eq("id", transaction.id)
          .eq("user_id", cloudUser.id);
        if (error) throw error;
        accountingTransactions = accountingTransactions.filter((item) => item.id !== transaction.id);
        renderOwnerAdminPanel();
        showToast("Cashbook transaction deleted.");
      } catch (error) {
        console.error("Cashbook transaction deletion failed:", error);
        showToast(error.message || "Could not delete the transaction.", true);
        deleteTransaction.disabled = false;
      }
    })();
    return;
  }
  const tab = e.target.closest("[data-owner-admin-tab]");
  if (tab) { ownerAdminTab = tab.getAttribute("data-owner-admin-tab"); renderOwnerAdminPanel(); return; }
  const filter = e.target.closest("[data-owner-admin-filter]");
  if (filter) { ownerAdminCat = filter.getAttribute("data-owner-admin-filter"); renderOwnerAdminPanel(); return; }
  const goto = e.target.closest("[data-owner-admin-goto]");
  if (goto) { ownerAdminCat = goto.getAttribute("data-owner-admin-goto"); ownerAdminTab = "reports"; renderOwnerAdminPanel(); }
});

ownerAdminModal.addEventListener("submit", (e) => {
  const form = e.target.closest("[data-cashbook-form]");
  if (!form) return;
  e.preventDefault();
  const formData = new FormData(form);
  const category = String(formData.get("category") || "");
  const type = String(formData.get("transaction_type") || "");
  const status = String(formData.get("payment_status") || "");
  const amount = Number(formData.get("amount"));
  const date = String(formData.get("transaction_date") || "");
  const description = String(formData.get("description") || "").trim();
  const allowedCategories = ownerScopeKeys();
  const parsedDate = new Date(`${date}T00:00:00`);
  const parsedLocalDate = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, "0")}-${String(parsedDate.getDate()).padStart(2, "0")}`;
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(parsedDate.getTime()) &&
    parsedLocalDate === date;
  if (!cloudUser || !sb) { showToast("Sign in to save cashbook transactions.", true); return; }
  if (!allowedCategories.includes(category) || !["income", "expense"].includes(type) ||
      !["settled", "pending"].includes(status) || !Number.isSafeInteger(amount) || amount <= 0 ||
      !validDate || description.length < 3 || description.length > 160) {
    showToast("Check the category, type, status, date, amount and description.", true);
    return;
  }

  const submit = form.querySelector('button[type="submit"]');
  if (submit) submit.disabled = true;
  (async () => {
    try {
      const { data, error } = await sb.from("financial_transactions").insert({
        user_id: cloudUser.id,
        category,
        transaction_date: date,
        transaction_type: type,
        payment_status: status,
        amount,
        description
      }).select("id,user_id,category,transaction_date,transaction_type,payment_status,amount,description,created_at").single();
      if (error) throw error;
      if (!data?.id) throw new Error("The server did not return the saved transaction.");
      accountingTransactions.unshift(data);
      renderOwnerAdminPanel();
      showToast("Cashbook transaction saved.");
    } catch (error) {
      console.error("Cashbook transaction save failed:", error);
      showToast(error.message || "Could not save the transaction.", true);
      if (submit) submit.disabled = false;
    }
  })();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && ownerAdminModal.classList.contains("open")) closeOwnerAdmin();
});

document.getElementById("ceoOwnerAdminPanel").addEventListener("click", openOwnerAdmin);
