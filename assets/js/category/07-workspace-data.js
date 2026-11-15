// ============================================================
// Category page - 07-workspace-data.js
// Workspace records, trash, toasts and cloud load / save.
// Split from the original category.js during the 2026-11 refactor.
// Loaded in numeric order by the page HTML. Keep that order.
// ============================================================

const categoryItems = () => {
  if (!categoryFeature) return [];
  if (!categoryData.features) categoryData.features = {};
  const items = categoryData.features[categoryFeature.id];
  return Array.isArray(items) ? items : [];
};

const categoryTrashItems = () => {
  if (!categoryFeature) return [];
  if (!categoryData.trash) categoryData.trash = {};
  const items = categoryData.trash[categoryFeature.id];
  return Array.isArray(items) ? items : [];
};

const showWorkspaceToast = (msg, undoCallback = null) => {
  const container = document.getElementById("categoryWsToastContainer");
  if (!container) return;
  clearTimeout(categoryToastTimeout);
  categoryUndoAction = undoCallback;
  container.innerHTML = `<div class="cat-ws-toast" role="status">` +
    `<span class="cat-ws-toast-icon">ℹ️</span>` +
    `<span class="cat-ws-toast-text">${categoryEscape(msg)}</span>` +
    (undoCallback ? `<button type="button" class="cat-ws-toast-undo" data-ws-undo>Undo</button>` : "") +
    `<button type="button" class="cat-ws-toast-close" data-ws-toast-close aria-label="Dismiss">&times;</button>` +
    `</div>`;
  categoryToastTimeout = setTimeout(() => {
    container.innerHTML = "";
    categoryUndoAction = null;
  }, 6000);
};

const categoryEnsureAccountActive = async () => {
  if (!categoryUser || !CATEGORY_SUPABASE) return;
  try {
    const { data, error } = await CATEGORY_SUPABASE.rpc("oms_current_account_status");
    if (error) return;
    if (data?.active) return;
    const message = data?.reason || "This account has been blocked. Contact the site administrator.";
    await CATEGORY_SUPABASE.auth.signOut();
    categoryUser = null;
    categorySubscription = null;
    categoryLatestRequest = null;
    closeCategoryWorkspace();
    throw new Error(message);
  } catch (err) {
    if (err.message && err.message.includes("blocked")) throw err;
  }
};

const categoryRefreshSubscription = async () => {
  if (!categoryUser || !CATEGORY_SUPABASE) {
    categorySubscription = null;
    categoryLatestRequest = null;
    return;
  }
  await categoryEnsureAccountActive();
  const [subscriptionResult, requestResult] = await Promise.all([
    CATEGORY_SUPABASE.from("category_subscriptions")
      .select("category,plan,status,started_at,expires_at")
      .eq("user_id", categoryUser.id)
      .eq("category", CURRENT.key)
      .maybeSingle(),
    CATEGORY_SUPABASE.from("subscription_requests")
      .select("plan,status,admin_note,created_at")
      .eq("user_id", categoryUser.id)
      .eq("category", CURRENT.key)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);
  if (!subscriptionResult.error) categorySubscription = subscriptionResult.data || null;
  if (!requestResult.error) categoryLatestRequest = requestResult.data || null;
};

const categoryLoadData = async () => {
  // 1. Load from localStorage first (Instant, resilient, offline-ready worldwide)
  try {
    const raw = localStorage.getItem(categoryLocalStorageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        if (parsed.features && typeof parsed.features === "object") categoryData.features = parsed.features;
        if (parsed.trash && typeof parsed.trash === "object") categoryData.trash = parsed.trash;
      }
    }
  } catch (err) {
    console.warn("Local storage read warning:", err);
  }

  // 2. If signed in with active cloud subscription, load and sync from Supabase
  if (categoryUser && CATEGORY_SUPABASE && categoryHasAccess()) {
    try {
      await categoryEnsureAccountActive();
      const { data, error } = await CATEGORY_SUPABASE.from("app_data")
        .select("value")
        .eq("user_id", categoryUser.id)
        .eq("key", categoryCollectionKey)
        .maybeSingle();
      if (!error && data?.value) {
        const cloudVal = data.value;
        if (cloudVal.features && typeof cloudVal.features === "object") {
          categoryData.features = { ...categoryData.features, ...cloudVal.features };
        }
        if (cloudVal.trash && typeof cloudVal.trash === "object") {
          categoryData.trash = { ...categoryData.trash, ...cloudVal.trash };
        }
        try {
          localStorage.setItem(categoryLocalStorageKey, JSON.stringify(categoryData));
        } catch (_) {}
      }
    } catch (cloudErr) {
      console.warn("Cloud data load warning (using local data):", cloudErr);
    }
  }

  // Purge any pre-seeded demo entries so portal starts 100% clean
  if (categoryData.features) {
    for (const key of Object.keys(categoryData.features)) {
      if (Array.isArray(categoryData.features[key])) {
        categoryData.features[key] = categoryData.features[key].filter(
          item => !String(item.id || "").startsWith("demo_")
        );
      }
    }
  }
  if (categoryData.trash) {
    for (const key of Object.keys(categoryData.trash)) {
      if (Array.isArray(categoryData.trash[key])) {
        categoryData.trash[key] = categoryData.trash[key].filter(
          item => !String(item.id || "").startsWith("demo_")
        );
      }
    }
  }
};

const categorySaveData = async () => {
  categoryCheckAutoBackup();
  // Always persist locally first so business owner data is never lost
  try {
    localStorage.setItem(categoryLocalStorageKey, JSON.stringify(categoryData));
  } catch (err) {
    console.warn("Local storage write warning:", err);
  }

  // If cloud account is active, sync with Supabase
  if (categoryUser && CATEGORY_SUPABASE && categoryHasAccess()) {
    try {
      await categoryEnsureAccountActive();
      const { error } = await CATEGORY_SUPABASE.from("app_data").upsert({
        user_id: categoryUser.id,
        key: categoryCollectionKey,
        value: {
          v: CATEGORY_MODULES.FEATURE_VERSION,
          features: categoryData.features,
          trash: categoryData.trash || {},
          updated: Date.now()
        },
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id,key" });
      if (error) console.warn("Supabase upsert warning:", error);
    } catch (cloudErr) {
      console.warn("Cloud save warning (saved locally):", cloudErr);
    }
  }
};

const categoryMoveToTrash = async (featureId, itemId) => {
  const current = categoryData.features[featureId] || [];
  const item = current.find((entry) => entry.id === itemId);
  if (!item) return;

  if (!categoryData.trash) categoryData.trash = {};
  if (!Array.isArray(categoryData.trash[featureId])) categoryData.trash[featureId] = [];

  const trashedItem = {
    ...item,
    deletedAt: new Date().toISOString()
  };

  categoryData.trash[featureId] = [trashedItem, ...categoryData.trash[featureId]];
  categoryData.features[featureId] = current.filter((entry) => entry.id !== itemId);

  await categorySaveData();
  showWorkspaceToast("1 record moved to Recycle Bin.", async () => {
    await categoryRestoreFromTrash(featureId, itemId);
  });
  categoryRenderList();
};

const categoryRestoreFromTrash = async (featureId, itemId) => {
  if (!categoryData.trash || !Array.isArray(categoryData.trash[featureId])) return;
  const item = categoryData.trash[featureId].find((entry) => entry.id === itemId);
  if (!item) return;

  const { deletedAt, ...restored } = item;
  restored.updatedAt = new Date().toISOString();

  categoryData.trash[featureId] = categoryData.trash[featureId].filter((entry) => entry.id !== itemId);
  if (!Array.isArray(categoryData.features[featureId])) categoryData.features[featureId] = [];
  categoryData.features[featureId] = [restored, ...categoryData.features[featureId]];

  await categorySaveData();
  showWorkspaceToast("Record restored to Active Records!");
  categoryRenderList();
};

const categoryPermanentDelete = async (featureId, itemId) => {
  if (!confirm("Permanently delete this record? This action cannot be undone.")) return;
  if (categoryData.trash && Array.isArray(categoryData.trash[featureId])) {
    categoryData.trash[featureId] = categoryData.trash[featureId].filter((entry) => entry.id !== itemId);
    await categorySaveData();
    showWorkspaceToast("Record permanently deleted.");
    categoryRenderList();
  }
};

const categoryEmptyTrash = async (featureId) => {
  const count = (categoryData.trash && categoryData.trash[featureId]) ? categoryData.trash[featureId].length : 0;
  if (!count) return;
  if (!confirm(`Permanently delete all ${count} records in the Recycle Bin? This action cannot be undone.`)) return;
  categoryData.trash[featureId] = [];
  await categorySaveData();
  showWorkspaceToast("Recycle bin emptied.");
  categoryRenderList();
};
