// ============================================================
// Category page - 12-open-feature.js
// Opening a feature from its card.
// Split from the original category.js during the 2026-11 refactor.
// Loaded in numeric order by the page HTML. Keep that order.
// ============================================================

const openCategoryFeature = async (card) => {
  if (!categorySessionReady) await categorySessionPromise;

  const featureId = card.dataset.toolFeature;
  categoryFeature = categoryFeatureDef(featureId, card);
  categoryEditId = null;
  categoryTab = "active";
  categorySearchQuery = "";

  categoryEnsureToolsUi();
  const modal = document.getElementById("categoryWorkspaceModal");
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");

  const content = document.getElementById("categoryWorkspaceContent");
  content.innerHTML = `<div class="category-workspace-loading"><p>Loading records…</p></div>`;

  try {
    await categoryLoadData();
    categoryRenderList();
  } catch (error) {
    content.innerHTML = `
      <h2 id="categoryWorkspaceTitle">Could not load records</h2>
      <p class="category-auth-error">${categoryEscape(error.message || "Data could not be loaded.")}</p>
      <button type="button" class="btn btn-outline" data-workspace-close>Close</button>
    `;
  }
};
