// ============================================================
// Home page - 11-super-admin.js
// CEO Super Admin console: accounts, subscriptions, reports and data.
// Split from the original script.js during the 2026-11 refactor.
// Loaded in numeric order by the page HTML. Keep that order.
// ============================================================

// ===== Super Admin Panel (CEO only): professional full-control console =====
// All 8 categories always stay in the system. Categories are NEVER removable
// from here; CEO only controls per-owner access (grant/revoke) and views data.
const adminModal = document.getElementById("adminModal");
const adminPanel = document.getElementById("adminPanel");
let adminTab = "overview";
let adminDataCat = BUILTIN_CATEGORIES[0];
let adminDataUserId = "";
let adminCategoryData = null;
let adminAccounts = [];
let adminCategorySummary = [];
let adminAccountTypeFilter = "all";

const allCategoryKeys = () => [...BUILTIN_CATEGORIES];

const catMeta = (key) => {
  const card = document.querySelector(`.industry-card[data-detail="${CSS.escape(key)}"]`);
  return {
    key,
    name: (card && card.querySelector("h3")) ? card.querySelector("h3").textContent.trim() : key,
    icon: (card && card.querySelector(".industry-icon")) ? card.querySelector(".industry-icon").textContent.trim() : "📁",
    subtitle: card && card.querySelector("p") ? card.querySelector("p").textContent.trim() : ""
  };
};

const categoryUsage = (key) => {
  const col = store.get(collectionKey(key), null);
  let entries = 0, features = 0;
  if (col && col.features && typeof col.features === "object") {
    Object.values(col.features).forEach((arr) => {
      if (Array.isArray(arr) && arr.length) { features++; entries += arr.length; }
    });
  }
  return { entries, features };
};

const adminAllOwners = () => cloudOwnerProfiles || [];
const populateFallbackAdminProfiles = () => {
  const localOwners = store.get("owners", []);
  const localUsers = store.get("siteUsers", []);
  const localSubs = getLocalSubscriptionRequests();

  if (!adminAccounts || !adminAccounts.length) {
    const fallbackList = [];
    localOwners.forEach((o) => {
      fallbackList.push({
        user_id: o.id || o.mobile || "owner_local",
        full_name: o.name || "Business Owner",
        email: o.email || (o.mobile ? `${o.mobile}@bms.app` : "owner@bms.app"),
        mobile: o.mobile || "",
        city: o.city || "",
        age: o.age || "",
        account_types: ["Owner"],
        owner_categories: o.categories || (o.category ? [o.category] : allCategoryKeys()),
        active_categories: o.categories || (o.category ? [o.category] : allCategoryKeys()),
        blocked: false,
        created_at: o.created_at || new Date().toISOString()
      });
    });

    localUsers.forEach((u) => {
      if (!fallbackList.some((a) => a.mobile === u.mobile || (u.email && a.email === u.email))) {
        fallbackList.push({
          user_id: u.id || u.mobile || "user_local",
          full_name: u.name || "Customer",
          email: u.email || (u.mobile ? `${u.mobile}@bms.app` : "customer@bms.app"),
          mobile: u.mobile || "",
          city: u.city || "",
          account_types: ["Site customer"],
          owner_categories: [],
          active_categories: [],
          blocked: false,
          created_at: u.created_at || new Date().toISOString()
        });
      }
    });

    adminAccounts = fallbackList;
  }

  if (!adminCategorySummary || !adminCategorySummary.length) {
    adminCategorySummary = allCategoryKeys().map((k) => {
      const usage = categoryUsage(k);
      return {
        category: k,
        active_subscribers: localSubs.filter((s) => s.category === k && s.status === "approved").length,
        data_accounts: usage.entries > 0 ? 1 : 0,
        feature_count: usage.features,
        entry_count: usage.entries,
        last_updated: new Date().toISOString()
      };
    });
  }

  cloudOwnerProfiles = adminAccounts
    .filter((account) => account.account_types?.includes("Owner"))
    .map((account) => ({
      id: account.user_id,
      name: account.full_name,
      mobile: account.mobile,
      age: account.age,
      city: account.city,
      categories: account.owner_categories || [],
      role: "Owner"
    }));
};

const loadCloudOwnerProfiles = async () => {
  if (!sb || !cloudUser || !ceoLoggedIn) {
    populateFallbackAdminProfiles();
    updateCeoStats();
    return cloudOwnerProfiles;
  }
  try {
    const accounts = [];
    const pageSize = 500;
    for (let offset = 0; ; offset += pageSize) {
      const result = await sb.rpc("admin_list_accounts").range(offset, offset + pageSize - 1);
      if (result.error) throw result.error;
      accounts.push(...(result.data || []));
      if (!result.data || result.data.length < pageSize) break;
    }
    const summaryResult = await sb.rpc("admin_category_data_summary");
    if (summaryResult.error) throw summaryResult.error;
    adminAccounts = accounts;
    adminCategorySummary = summaryResult.data || [];
    cloudOwnerProfiles = adminAccounts
      .filter((account) => account.account_types?.includes("Owner"))
      .map((account) => ({
        id: account.user_id,
        name: account.full_name,
        mobile: account.mobile,
        age: account.age,
        city: account.city,
        categories: account.owner_categories || [],
        role: "Owner"
      }));
  } catch (err) {
    console.warn("Could not load cloud admin profiles via RPC, using local fallback:", err);
    populateFallbackAdminProfiles();
  }
  updateCeoStats();
  return cloudOwnerProfiles;
};
const adminOwnerList = () => adminAllOwners();
const fmtDate = (v) => {
  const d = v ? new Date(v) : null;
  if (!d || isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};

const closeAdminPanel = () => {
  adminModal.classList.remove("open");
  adminModal.setAttribute("aria-hidden", "true");
  adminPanel.innerHTML = "";
};

const clearAdminConsoleCache = () => {
  closeAdminPanel();
  closeBizAdsPanel();
  adminAccounts = [];
  adminCategorySummary = [];
  adminCategoryData = null;
  cloudOwnerProfiles = null;
};

const openAdminPanel = async () => {
  const isCeo = (ceoLoggedIn && ceoUser) || !!store.get("ceoAccount") || localStorage.getItem("ceoLoggedIn") === "true";
  let hasCloudAdmin = false;
  if (sb && cloudUser) {
    try {
      hasCloudAdmin = await isCloudAdmin();
    } catch (_) {}
  }
  if (!isCeo && !hasCloudAdmin) {
    showToast("Super Admin access requires an active CEO session. Please sign in as CEO.", true);
    return;
  }
  if (!ceoLoggedIn) setCeoSession(true);
  if (!ceoUser) ceoUser = store.get("ceoAccount") || { name: "Amna Bibi", role: "ceo" };
  closeCeoModal();
  adminTab = "overview";
  adminDataCat = BUILTIN_CATEGORIES[0];
  adminDataUserId = "";
  adminCategoryData = null;
  renderAdminPanel();
  adminModal.classList.add("open");
  adminModal.setAttribute("aria-hidden", "false");
  try {
    await loadCloudOwnerProfiles();
    renderAdminPanel();
  } catch (error) {
    console.warn("Super Admin cloud profiles notice:", error);
    renderAdminPanel();
  }
};

const adminTabsHtml = () => {
  const tabs = [
    ["overview", "📊 Overview"],
    ["accounts", "👥 Accounts"],
    ["subscriptions", "💳 Subscriptions"],
    ["data", "🗂️ Business Data"],
    ["owners", "👥 Owners & Access"],
    ["categories", "🏷️ Categories"],
    ["reports", "📈 Reports"],
    ["settings", "⚙️ Settings"]
  ];
  return `<div class="admin-tabs">` + tabs.map(([id, label]) =>
    `<button type="button" class="admin-tab${adminTab === id ? " active" : ""}" data-admin-tab="${id}">${label}</button>`
  ).join("") + `</div>`;
};

const renderAdminSubscriptions = () =>
  adminTabsHtml() +
  `<div class="admin-section-title">💳 Category subscription payments</div>` +
  `<p class="admin-hint">Open the JazzCash app and verify the sender, amount and transaction reference in your received payments before approving. Approval activates only the category and duration on that request.</p>` +
  `<div id="adminSubscriptionRequestList"><div class="admin-empty">Loading payment requests…</div></div>`;

const getLocalSubscriptionRequests = () => {
  try {
    return JSON.parse(localStorage.getItem("oms_subscription_requests") || "[]");
  } catch (_) { return []; }
};
const setLocalSubscriptionRequests = (list) => {
  localStorage.setItem("oms_subscription_requests", JSON.stringify(list));
};

const loadAdminSubscriptionRequests = async () => {
  const list = document.getElementById("adminSubscriptionRequestList");
  if (!list) return;

  const data = [];
  const localList = getLocalSubscriptionRequests();
  data.push(...localList);

  if (sb && cloudUser) {
    try {
      const pageSize = 500;
      for (let offset = 0; ; offset += pageSize) {
        const result = await sb.from("subscription_requests")
          .select("id,user_id,category,plan,amount,account_name,account_mobile,payment_reference,payer_mobile,status,admin_note,created_at")
          .order("created_at", { ascending: false })
          .range(offset, offset + pageSize - 1);
        if (result.error) break;
        (result.data || []).forEach((item) => {
          if (!data.some((d) => d.id === item.id || (d.payment_reference && d.payment_reference === item.payment_reference))) {
            data.push(item);
          }
        });
        if (!result.data || result.data.length < pageSize) break;
      }
    } catch (_) {}
  }

  if (!data.length) {
    list.innerHTML = `<div class="admin-empty">No subscription payment requests yet.</div>`;
    return;
  }

  data.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  const categoryNames = Object.fromEntries(BUILTIN_CATEGORIES.map((key) => [key, catMeta(key)]));
  list.innerHTML = data.map((request) => {
    const meta = categoryNames[request.category] || { icon: "ðŸ“", name: request.category };
    const plan = CATEGORY_PLAN_INFO[request.plan] || { label: request.plan };
    const account = adminAccounts.find((item) => item.user_id === request.user_id);
    return `<article class="admin-subscription-request">` +
      `<div class="admin-subscription-request-head"><div><strong>${escHtml(meta.icon)} ${escHtml(meta.name)} Â· ${escHtml(plan.label)}</strong>` +
      `<span>${escHtml(request.account_name)} Â· account ${escHtml(request.account_mobile)}${account ? ` Â· ${escHtml(account.email)}` : ""}</span></div>` +
      `<span class="admin-pill ${request.status === "approved" ? "ok" : request.status === "rejected" ? "off" : ""}">${escHtml(request.status)}</span></div>` +
      `<div class="admin-subscription-request-details"><span><b>Amount</b> PKR ${rupees(request.amount)}</span>` +
      `<span><b>JazzCash sender</b> ${escHtml(request.payer_mobile)}</span>` +
      `<span><b>Transaction ID</b> ${escHtml(request.payment_reference)}</span>` +
      `<span><b>Submitted</b> ${fmtDate(request.created_at)}</span></div>` +
      (request.admin_note ? `<p class="admin-hint">Admin note: ${escHtml(request.admin_note)}</p>` : "") +
      (request.status === "pending" ? `<div class="admin-subscription-actions">` +
        `<button type="button" class="btn btn-primary" data-subscription-approve="${escHtml(request.id)}">Verify &amp; approve</button>` +
        `<button type="button" class="btn btn-outline" data-subscription-reject="${escHtml(request.id)}">Reject</button></div>` : "") +
      `</article>`;
  }).join("");
};

const reviewSubscriptionRequest = async (requestId, approve) => {
  const rejectNote = approve ? null : window.prompt("Optional reason for rejecting this payment request:");
  if (!approve && rejectNote === null) return;

  // Local request update
  const localList = getLocalSubscriptionRequests();
  const req = localList.find((r) => r.id === requestId);
  if (req) {
    req.status = approve ? "approved" : "rejected";
    if (rejectNote) req.admin_note = rejectNote;
    req.reviewed_at = new Date().toISOString();
    setLocalSubscriptionRequests(localList);

    if (approve) {
      const months = req.plan === "1-month" ? 1 : req.plan === "3-month" ? 3 : 12;
      const activeSubs = JSON.parse(localStorage.getItem("oms_active_subscriptions") || "{}");
      const subKey = (req.account_mobile || "") + "_" + (req.category || "");
      activeSubs[subKey] = {
        category: req.category,
        plan: req.plan,
        amount: req.amount,
        status: "active",
        mobile: req.account_mobile,
        started_at: Date.now(),
        expires_at: Date.now() + months * 30 * 24 * 60 * 60 * 1000
      };
      localStorage.setItem("oms_active_subscriptions", JSON.stringify(activeSubs));
    }
  }

  // Supabase RPC if connected
  if (sb && cloudUser) {
    try {
      if (approve) {
        await sb.rpc("admin_approve_subscription_request", { p_request_id: requestId });
      } else {
        await sb.rpc("admin_reject_subscription_request", { p_request_id: requestId, p_note: rejectNote });
      }
    } catch (e) {
      console.warn("Cloud approve notice:", e);
    }
  }

  showToast(approve ? "Payment approved. Category subscription is now active." : "Payment request rejected.");
  await loadAdminSubscriptionRequests();
};

const adminSummaryFor = (key) => adminCategorySummary.find((item) => item.category === key) || {
  category: key, active_subscribers: 0, data_accounts: 0, feature_count: 0, entry_count: 0, last_updated: null
};

const renderAdminOverview = () => {
  const keys = allCategoryKeys();
  const owners = adminAccounts.filter((account) => account.account_types?.includes("Owner")).length;
  const blocked = adminAccounts.filter((account) => account.blocked).length;
  const activeAccess = adminCategorySummary.reduce((count, item) => count + Number(item.active_subscribers || 0), 0);
  const cards = keys.map((key) => {
    const meta = catMeta(key);
    const summary = adminSummaryFor(key);
    return `<div class="admin-cat-row">` +
      `<div class="admin-cat-row-left"><span class="admin-cat-row-icon">${meta.icon}</span>` +
      `<div><div class="admin-cat-row-name">${escHtml(meta.name)}</div>` +
      `<div class="admin-cat-row-meta">${summary.entry_count} records · ${summary.active_subscribers} active subscriptions · ${summary.data_accounts} accounts with data</div></div></div>` +
      `<button type="button" class="admin-ghost-btn" data-admin-view="${escHtml(key)}">View Data</button></div>`;
  }).join("");

  return adminTabsHtml() +
    `<div class="admin-stat-grid">` +
    `<div class="admin-stat"><div class="admin-stat-num">${keys.length}</div><div class="admin-stat-lbl">Categories</div></div>` +
    `<div class="admin-stat"><div class="admin-stat-num">${adminAccounts.length}</div><div class="admin-stat-lbl">Registered Accounts</div></div>` +
    `<div class="admin-stat"><div class="admin-stat-num">${owners}</div><div class="admin-stat-lbl">Owner Accounts</div></div>` +
    `<div class="admin-stat"><div class="admin-stat-num">${activeAccess}</div><div class="admin-stat-lbl">Active Category Access</div></div>` +
    `<div class="admin-stat"><div class="admin-stat-num">${blocked}</div><div class="admin-stat-lbl">Blocked Accounts</div></div>` +
    `</div>` +
    `<div class="admin-section-title">📁 Cloud category overview</div>` +
    `<p class="admin-hint">Counts are calculated from cloud records across all accounts. Record details stay hidden until you select an account and category in Business Data.</p>` +
    (cards || `<div class="admin-empty">No categories available.</div>`);
};

const renderAdminData = () => {
  const accounts = adminAccounts;
  const accountOptions = accounts.map((account) =>
    `<option value="${escHtml(account.user_id)}" ${account.user_id === adminDataUserId ? "selected" : ""}>` +
    `${escHtml(account.full_name)} · ${escHtml(account.mobile || account.contact_email || account.email)} · ${escHtml(account.account_types.join(", "))}</option>`
  ).join("");
  const categoryOptions = allCategoryKeys().map((key) =>
    `<option value="${escHtml(key)}" ${key === adminDataCat ? "selected" : ""}>${escHtml(catMeta(key).name)}</option>`
  ).join("");
  const features = adminCategoryData?.value?.features;
  const sections = features && typeof features === "object"
    ? Object.entries(features).filter(([, entries]) => Array.isArray(entries) && entries.length).map(([featureId, entries]) => {
      const def = getFeatureDef(adminDataCat, featureId, null);
      const head = def.fields.map((field) => `<th>${escHtml(field.label)}</th>`).join("");
      const rows = entries.map((item) => {
        const tds = def.fields.map((field) =>
          `<td>${escHtml(String(item?.[field.key] ?? item?.fields?.[field.key] ?? "")) || "<span class='f-muted'>N/A</span>"}</td>`
        ).join("");
        return `<tr>${tds}</tr>`;
      }).join("");
      return `<div class="sheet-section"><div class="sheet-sec-head"><span class="sheet-sec-icon">${escHtml(def.icon)}</span>` +
        `<h4>${escHtml(def.name)}</h4><span class="data-cat-total">${entries.length}</span></div>` +
        `<div class="f-table-wrap"><table class="f-table sheet-table"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div></div>`;
    }).join("")
    : "";
  const selected = adminAccounts.find((account) => account.user_id === adminDataUserId);
  const result = adminCategoryData === null
    ? `<div class="admin-empty">Choose an account and category, then select “View records”.</div>`
    : sections || `<div class="admin-empty">No saved records for this account and category.</div>`;

  return adminTabsHtml() +
    `<div class="admin-section-title">🗂️ Business data · read only</div>` +
    `<p class="admin-hint">Only the selected account/category is opened. Records are read-only and are not changed by this panel.</p>` +
    `<div class="admin-data-selector">` +
    `<label>Account<select data-admin-data-account><option value="">Choose an account</option>${accountOptions}</select></label>` +
    `<label>Category<select data-admin-data-category>${categoryOptions}</select></label>` +
    `<button type="button" class="btn btn-primary" data-admin-load-data${adminDataUserId ? "" : " disabled"}>View records</button></div>` +
    (selected ? `<div class="admin-data-owner"><strong>${escHtml(selected.full_name)}</strong><span>${escHtml(selected.contact_email || selected.email)} · ${escHtml(selected.account_types.join(", "))}</span></div>` : "") +
    (adminCategoryData ? `<p class="admin-data-updated">Last cloud save: ${fmtDate(adminCategoryData.updated_at)}</p>` : "") +
    result;
};

const renderAdminAccounts = () => {
  const accounts = adminAccounts.filter((account) =>
    adminAccountTypeFilter === "all" || account.account_types?.includes(adminAccountTypeFilter)
  );
  const cards = accounts.map((account) => {
    const activeCategories = (account.active_categories || []).map((key) => catMeta(key).name).join(", ");
    const pendingCategories = (account.pending_categories || []).map((key) => catMeta(key).name).join(", ");
    const types = (account.account_types || ["Other"]).join(", ");
    const contactEmail = account.contact_email || account.email;
    return `<article class="admin-account-card" data-account-id="${escHtml(account.user_id)}" data-account-search="${escHtml([
      account.full_name, account.email, contactEmail, account.mobile, account.city, types
    ].join(" ").toLowerCase())}">` +
      `<div class="admin-account-head"><div><strong>${escHtml(account.full_name)}</strong>` +
      `<span>${escHtml(types)} · Sign-in: ${escHtml(account.email)} · Contact: ${escHtml(contactEmail)}</span></div>` +
      `<span class="admin-pill ${account.blocked ? "off" : "ok"}">${account.blocked ? "Blocked" : "Active"}</span></div>` +
      `<div class="admin-account-details">` +
      `<span><b>Mobile</b>${escHtml(account.mobile || "N/A")}</span>` +
      `<span><b>City</b>${escHtml(account.city || "N/A")}</span>` +
      `<span><b>Registered</b>${fmtDate(account.created_at)}</span>` +
      `<span><b>Owner categories</b>${escHtml((account.owner_categories || []).map((key) => catMeta(key).name).join(", ") || "N/A")}</span>` +
      `<span><b>Active subscriptions</b>${escHtml(activeCategories || "None")}</span>` +
      `<span><b>Pending payments</b>${escHtml(pendingCategories || "None")}</span>` +
      `</div>` +
      (account.block_reason ? `<p class="admin-account-reason">Block reason: ${escHtml(account.block_reason)}</p>` : "") +
      `<div class="admin-account-actions">` +
      `<button type="button" class="btn btn-outline" data-account-block="${escHtml(account.user_id)}" data-blocked="${account.blocked ? "true" : "false"}">${account.blocked ? "Restore access" : "Block access"}</button>` +
      `<button type="button" class="admin-danger-btn" data-account-delete="${escHtml(account.user_id)}">Permanently delete</button>` +
      `</div></article>`;
  }).join("");
  return adminTabsHtml() +
    `<div class="admin-section-title">👥 All registered accounts</div>` +
    `<p class="admin-hint">Block access to preserve account data, or permanently delete an account after entering its exact email address. CEO accounts cannot be changed here.</p>` +
    `<div class="admin-account-toolbar"><span>${adminAccounts.length} account${adminAccounts.length === 1 ? "" : "s"}</span><button type="button" class="admin-ghost-btn" data-admin-refresh-accounts>Refresh accounts</button></div>` +
    `<div class="admin-account-filters"><label>Account type<select data-admin-account-type>` +
    `<option value="all" ${adminAccountTypeFilter === "all" ? "selected" : ""}>All account types</option>` +
    `<option value="Owner" ${adminAccountTypeFilter === "Owner" ? "selected" : ""}>Owners</option>` +
    `<option value="Category subscription" ${adminAccountTypeFilter === "Category subscription" ? "selected" : ""}>Category accounts</option>` +
    `<option value="Site customer" ${adminAccountTypeFilter === "Site customer" ? "selected" : ""}>Site customers</option>` +
    `<option value="Other" ${adminAccountTypeFilter === "Other" ? "selected" : ""}>Other</option>` +
    `</select></label><label>Search<input type="search" data-admin-account-search placeholder="Name, email, mobile, or city"></label></div>` +
    `<div class="admin-account-list">${cards || `<div class="admin-empty">No accounts match this filter.</div>`}</div>`;
};

const renderAdminOwners = () => {
  const list = adminOwnerList();
  const keys = allCategoryKeys();

  const cards = list.map((o) => {
    const allowed = ownerAllowedCats(o);
    const chips = keys.map((k) => {
      const meta = catMeta(k);
      const on = allowed.includes(k);
      return `<button type="button" class="admin-cat-chip${on ? " on" : ""}" data-owner-user="${escHtml(o.id || "")}" data-owner-cat="${escHtml(k)}" aria-pressed="${on}"${o.id ? "" : " disabled"}>${meta.icon} ${escHtml(meta.name)}</button>`;
    }).join("");
    const role = o.role ? escHtml(String(o.role)) : "Owner";
    return `<div class="admin-owner-card">` +
      `<div class="admin-owner-head">` +
      `<div class="admin-owner-id"><span class="admin-owner-avatar">${escHtml((o.name || "?").trim().charAt(0).toUpperCase())}</span>` +
      `<div><div class="admin-owner-name">${escHtml(o.name)} <span class="admin-role-badge">${role}</span></div>` +
      `<div class="admin-owner-meta">${escHtml(o.mobile)}${o.city ? " · " + escHtml(o.city) : ""}${o.age ? " · age " + escHtml(String(o.age)) : ""}</div></div></div>` +
      `<div class="admin-owner-actions">` +
      `<span class="admin-owner-count">${allowed.length}/${keys.length} access</span>` +
      `<button type="button" class="admin-ghost-btn" data-owner-manage="${escHtml(o.id || "")}"${o.id ? "" : " disabled"}>Manage account</button></div></div>` +
      `<div class="admin-cat-list">${chips}</div></div>`;
  }).join("");

  return adminTabsHtml() +
    `<div class="admin-section-title">👥 Owner accounts & category access</div>` +
    `<p class="admin-hint">Tap a category chip to grant or revoke that owner's access. Green = allowed. All 8 categories always remain available in the system.</p>` +
    (cards || `<div class="admin-empty">No owner accounts registered yet.</div>`);
};

const renderAdminCategories = () => {
  const keys = allCategoryKeys();
  const rows = keys.map((k) => {
    const meta = catMeta(k);
    const summary = adminSummaryFor(k);
    const ownersWith = adminOwnerList().filter((o) => ownerAllowedCats(o).includes(k)).length;
    return `<div class="admin-cat-row">` +
      `<div class="admin-cat-row-left"><span class="admin-cat-row-icon">${meta.icon}</span>` +
      `<div><div class="admin-cat-row-name">${escHtml(meta.name)}</div>` +
      `<div class="admin-cat-row-meta">${summary.entry_count} saved records · ${summary.active_subscribers} active subscriptions · ${ownersWith} owner${ownersWith === 1 ? "" : "s"} assigned</div></div></div>` +
      `<span class="admin-locked-tag">🔒 Always active</span></div>`;
  }).join("");
  return adminTabsHtml() +
    `<div class="admin-section-title">🏷️ Categories</div>` +
    `<p class="admin-hint">These cloud totals cover all accounts. Category records can be inspected in read-only mode from the Business Data tab.</p>` +
    (rows || `<div class="admin-empty">No categories available.</div>`);
};

const renderAdminReports = () => {
  const keys = allCategoryKeys();
  const rows = keys.map((k) => {
    const meta = catMeta(k);
    const summary = adminSummaryFor(k);
    return `<tr>` +
      `<td><span class="admin-recent-icon">${meta.icon}</span> ${escHtml(meta.name)}</td>` +
      `<td>${summary.feature_count}</td><td>${summary.entry_count}</td><td>${summary.active_subscribers}</td><td>${fmtDate(summary.last_updated)}</td></tr>`;
  }).join("");

  const maxEntries = Math.max(1, ...keys.map((key) => Number(adminSummaryFor(key).entry_count || 0)));
  const bars = keys.map((k) => {
    const meta = catMeta(k);
    const entries = Number(adminSummaryFor(k).entry_count || 0);
    const pct = Math.round((entries / maxEntries) * 100);
    return `<div class="admin-bar-row"><span class="admin-bar-lbl">${meta.icon} ${escHtml(meta.name)}</span>` +
      `<span class="admin-bar-track"><span class="admin-bar-fill" style="width:${pct}%"></span></span>` +
      `<span class="admin-bar-val">${entries}</span></div>`;
  }).join("");

  return adminTabsHtml() +
    `<div class="admin-section-title">📈 Category report</div>` +
    `<div class="f-table-wrap"><table class="f-table admin-report-table"><thead><tr>` +
    `<th>Category</th><th>Features</th><th>Entries</th><th>Active subscriptions</th><th>Last Updated</th></tr></thead>` +
    `<tbody>${rows}</tbody></table></div>` +
    `<div class="admin-section-title">📊 Entries distribution</div>` +
    `<div class="admin-bars">${bars}</div>`;
};

const renderAdminSettings = () => {
  const totalAccounts = adminAccounts.length;
  const keys = allCategoryKeys().length;
  const cloudOn = typeof sb !== "undefined" && !!sb;
  return adminTabsHtml() +
    `<div class="admin-section-title">⚙️ System settings</div>` +
    `<div class="admin-setting-row"><div><div class="admin-setting-name">CEO account</div>` +
    `<div class="admin-setting-sub">${escHtml(ceoUser ? ceoUser.name + " · " + ceoUser.mobile : "Not signed in")}</div></div>` +
    `<span class="admin-pill ok">Signed in</span></div>` +
    `<div class="admin-setting-row"><div><div class="admin-setting-name">Cloud sync</div>` +
    `<div class="admin-setting-sub">Supabase cloud backup of all data</div></div>` +
    `<span class="admin-pill ${cloudOn ? "ok" : "off"}">${cloudOn ? "Connected" : "Local mode"}</span></div>` +
    `<div class="admin-setting-row"><div><div class="admin-setting-name">System mode</div>` +
    `<div class="admin-setting-sub">Cloud account and category overview</div></div>` +
    `<span class="admin-pill">${keys} categories · ${totalAccounts} accounts</span></div>` +
    `<div class="admin-section-title">🔐 Access control</div>` +
    `<div class="admin-setting-row"><div><div class="admin-setting-name">CEO full access</div>` +
    `<div class="admin-setting-sub">CEO can open every category and manage owners</div></div>` +
    `<button type="button" class="admin-ghost-btn" data-admin-tab="owners">Manage</button></div>` +
    `<p class="admin-hint">Category removal is disabled by design: the full category set is always available.</p>`;
};

const renderAdminPanel = () => {
  if (!adminPanel) return;
  let body;
  if (adminTab === "subscriptions") body = renderAdminSubscriptions();
  else if (adminTab === "accounts") body = renderAdminAccounts();
  else if (adminTab === "data") body = renderAdminData();
  else if (adminTab === "owners") body = renderAdminOwners();
  else if (adminTab === "categories") body = renderAdminCategories();
  else if (adminTab === "reports") body = renderAdminReports();
  else if (adminTab === "settings") body = renderAdminSettings();
  else body = renderAdminOverview();

  adminPanel.innerHTML =
    `<button type="button" class="modal-close" data-admin-close aria-label="Close">&times;</button>` +
    `<div class="feature-head"><div class="feature-title"><span class="feature-icon">🛡️</span>` +
    `<div><h3>Super Admin Panel</h3><p class="feature-sub">${escHtml(ceoUser ? ceoUser.name : "CEO")} · full control over every category & owner</p></div></div>` +
    `<button type="button" class="btn btn-outline btn-sm admin-return-ceo-btn" data-admin-return-ceo>👤 Return to CEO Profile</button>` +
    `</div>` +
    body;
  if (adminTab === "subscriptions") loadAdminSubscriptionRequests();
};

const toggleOwnerCategory = async (userId, catKey) => {
  const target = adminAllOwners().find((profile) => profile.id === userId);
  if (!target || !sb || !cloudUser || !await isCloudAdmin()) {
    throw new Error("Only the site CEO can change owner category access.");
  }
  const current = ownerAllowedCats(target);
  const categories = current.includes(catKey)
    ? current.filter((category) => category !== catKey)
    : [...current, catKey];
  if (!categories.length) {
    showToast("An owner must keep at least one category assigned.", true);
    return;
  }
  const { error } = await sb.rpc("admin_set_owner_categories", {
    p_user_id: userId,
    p_categories: categories
  });
  if (error) throw error;
  target.categories = categories;
  const account = adminAccounts.find((item) => item.user_id === userId);
  if (account) account.owner_categories = categories;
  if (owner?.id === userId) {
    owner = { ...owner, categories, category: categories[0] };
    applyAccess();
  }
  renderAdminPanel();
  showToast(`${labelFor(catKey) || catKey} access ${categories.includes(catKey) ? "granted" : "revoked"} for ${target.name}.`);
};

const setAccountBlocked = async (userId, blocked) => {
  const target = adminAccounts.find((account) => account.user_id === userId);
  if (!target || !sb || !cloudUser || !await isCloudAdmin()) {
    throw new Error("Only the authenticated CEO can manage account access.");
  }
  let reason = null;
  if (blocked) {
    reason = window.prompt(`Optional block reason for ${target.full_name}:`);
    if (reason === null) return;
    if (!window.confirm(`Block ${target.full_name}'s access? Their account data will be retained.`)) return;
  } else if (!window.confirm(`Restore access for ${target.full_name}?`)) {
    return;
  }
  const { error } = await sb.rpc("admin_set_account_blocked", {
    p_user_id: userId,
    p_blocked: blocked,
    p_reason: reason
  });
  if (error) throw error;
  await loadCloudOwnerProfiles();
  renderAdminPanel();
  showToast(blocked ? `Access blocked for ${target.full_name}. Account data was retained.` : `Access restored for ${target.full_name}.`);
};

const deleteAccount = async (userId) => {
  const target = adminAccounts.find((account) => account.user_id === userId);
  if (!target || !sb || !cloudUser || !await isCloudAdmin()) {
    throw new Error("Only the authenticated CEO can permanently delete accounts.");
  }
  if (!window.confirm(`Permanently delete ${target.full_name}? This removes the account and its saved category data, subscriptions, payment requests, and reviews. This cannot be undone.`)) return;
  const confirmation = window.prompt(`Type this exact sign-in email to confirm permanent deletion:\n${target.email}`);
  if (confirmation === null) return;
  const { error } = await sb.rpc("admin_delete_account", {
    p_user_id: userId,
    p_confirmation: confirmation
  });
  if (error) throw error;
  await loadCloudOwnerProfiles();
  renderAdminPanel();
  showToast(`Account ${target.email} and its linked data were permanently deleted.`);
};

const loadAdminCategoryData = async () => {
  if (!adminDataUserId || !adminDataCat || !sb || !cloudUser || !await isCloudAdmin()) {
    showToast("Select an account and category with an active CEO session.", true);
    return;
  }
  const { data, error } = await sb.rpc("admin_get_category_data", {
    p_user_id: adminDataUserId,
    p_category: adminDataCat
  });
  if (error) throw error;
  adminCategoryData = data;
  renderAdminPanel();
};

adminModal.addEventListener("click", (e) => {
  if (e.target === adminModal || e.target.closest("[data-admin-close]")) { closeAdminPanel(); return; }
  if (e.target.closest("[data-admin-return-ceo]")) { closeAdminPanel(); openCeoModal(); return; }
  const tab = e.target.closest("[data-admin-tab]");
  if (tab) { adminTab = tab.getAttribute("data-admin-tab"); renderAdminPanel(); return; }
  const refreshAccounts = e.target.closest("[data-admin-refresh-accounts]");
  if (refreshAccounts) {
    refreshAccounts.disabled = true;
    loadCloudOwnerProfiles().then(renderAdminPanel).catch((error) => {
      showToast(`Accounts could not be refreshed: ${error.message || "Cloud service error."}`, true);
      refreshAccounts.disabled = false;
    });
    return;
  }
  const view = e.target.closest("[data-admin-view]");
  if (view) { adminTab = "data"; adminDataCat = view.getAttribute("data-admin-view") || BUILTIN_CATEGORIES[0]; adminDataUserId = ""; adminCategoryData = null; renderAdminPanel(); return; }
  const loadData = e.target.closest("[data-admin-load-data]");
  if (loadData) {
    loadData.disabled = true;
    loadAdminCategoryData().catch((error) => {
      showToast(`Business data could not be loaded: ${error.message || "Cloud service error."}`, true);
      loadData.disabled = false;
    });
    return;
  }
  const blockAccount = e.target.closest("[data-account-block]");
  if (blockAccount) {
    blockAccount.disabled = true;
    setAccountBlocked(blockAccount.getAttribute("data-account-block"), blockAccount.getAttribute("data-blocked") !== "true")
      .catch((error) => {
        showToast(`Account access could not be updated: ${error.message || "Cloud service error."}`, true);
        blockAccount.disabled = false;
      });
    return;
  }
  const deleteButton = e.target.closest("[data-account-delete]");
  if (deleteButton) {
    deleteButton.disabled = true;
    deleteAccount(deleteButton.getAttribute("data-account-delete")).catch((error) => {
      showToast(`Account could not be deleted: ${error.message || "Cloud service error."}`, true);
      deleteButton.disabled = false;
    });
    return;
  }
  const manageOwner = e.target.closest("[data-owner-manage]");
  if (manageOwner) {
    adminTab = "accounts";
    renderAdminPanel();
    adminPanel.querySelector(`[data-account-id="${CSS.escape(manageOwner.getAttribute("data-owner-manage"))}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  const chip = e.target.closest("[data-owner-cat]");
  if (chip) {
    chip.disabled = true;
    toggleOwnerCategory(chip.getAttribute("data-owner-user"), chip.getAttribute("data-owner-cat")).catch((error) => {
      showToast(`Owner access could not be changed: ${error.message}`, true);
      chip.disabled = false;
    });
    return;
  }
  const approve = e.target.closest("[data-subscription-approve]");
  if (approve) {
    approve.disabled = true;
    reviewSubscriptionRequest(approve.getAttribute("data-subscription-approve"), true).catch((error) => {
      showToast(`Subscription review failed: ${error.message}`, true);
      approve.disabled = false;
    });
    return;
  }
  const reject = e.target.closest("[data-subscription-reject]");
  if (reject) {
    reject.disabled = true;
    reviewSubscriptionRequest(reject.getAttribute("data-subscription-reject"), false).catch((error) => {
      showToast(`Subscription review failed: ${error.message}`, true);
      reject.disabled = false;
    });
  }
});

adminPanel.addEventListener("change", (event) => {
  const target = event.target;
  if (target.matches("[data-admin-account-type]")) {
    adminAccountTypeFilter = target.value;
    renderAdminPanel();
  } else if (target.matches("[data-admin-data-account]")) {
    adminDataUserId = target.value;
    adminCategoryData = null;
    renderAdminPanel();
  } else if (target.matches("[data-admin-data-category]")) {
    adminDataCat = target.value;
    adminCategoryData = null;
    renderAdminPanel();
  }
});

adminPanel.addEventListener("input", (event) => {
  const search = event.target.closest("[data-admin-account-search]");
  if (!search) return;
  const needle = search.value.trim().toLowerCase();
  adminPanel.querySelectorAll(".admin-account-card").forEach((card) => {
    card.hidden = !card.dataset.accountSearch.includes(needle);
  });
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && adminModal.classList.contains("open")) closeAdminPanel();
});

document.getElementById("ceoAdminPanel").addEventListener("click", openAdminPanel);
