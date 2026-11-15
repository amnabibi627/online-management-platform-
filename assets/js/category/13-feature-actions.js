// ============================================================
// Category page - 13-feature-actions.js
// Per-feature tools, table actions and workspace event wiring.
// Split from the original category.js during the 2026-11 refactor.
// Loaded in numeric order by the page HTML. Keep that order.
// ============================================================

const initCategoryTools = async () => {
  categoryEnsureToolsUi();
  await categoryLoadData();

  if (document.getElementById("saasNavList")) {
    const firstFeatId = CURRENT.features[0]?.id;
    if (firstFeatId) {
      selectSaasFeature(firstFeatId);
    }
  }

  document.getElementById("saasNavList")?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-saas-feature]");
    if (btn) {
      selectSaasFeature(btn.dataset.saasFeature);
    }
  });

  document.addEventListener("change", (e) => {
    if (e.target && e.target.id === "userProfileDpInput") {
      const file = e.target.files?.[0];
      if (!file) return;
      compressUserProfileDp(file, (dataUrl) => {
        let trial = categoryGetTrial() || {};
        trial.avatar = dataUrl;
        localStorage.setItem("bms_user_trial", JSON.stringify(trial));
        localStorage.setItem("oms_trial_account", JSON.stringify(trial));
        categoryUpdateHeaderBtn();
        showCategoryTrialModal(currentProfileViewMode);
        showWorkspaceToast("Profile photo updated successfully!");
      });
      return;
    }
    if (e.target && e.target.id === "countryCode") {
      const sel = e.target;
      const opt = sel.options[sel.selectedIndex];
      const flag = opt?.dataset?.flag || "🇵🇰";
      const code = opt?.dataset?.code || sel.value || "+92";
      const flagEl = document.getElementById("countryFlagDisplay");
      const codeEl = document.getElementById("countryCodeDisplay");
      if (flagEl) flagEl.textContent = flag;
      if (codeEl) codeEl.textContent = code;
      return;
    }
    if (e.target && e.target.id === "saasDateFilterInput") {
      categoryDateFilter = e.target.value || "";
      categoryRenderList();
    }
  });

  document.getElementById("saasNavSearchInput")?.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase().trim();
    const buttons = document.querySelectorAll("#saasNavList .saas-nav-btn");
    buttons.forEach((btn) => {
      const text = btn.textContent.toLowerCase();
      btn.style.display = text.includes(query) ? "flex" : "none";
    });
  });

  document.getElementById("saasAddRecordBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    categoryRenderForm();
  });
  document.getElementById("saasPrintBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    categoryPrintReport();
  });


  // Auto backup verification
  categoryCheckAutoBackup();

  // Safety & Privacy Modal Triggers
  document.addEventListener("click", (e) => {
    if (e.target.closest("#saasSafetyBtn, [data-action-open-safety]")) {
      showCategorySafetyModal();
      return;
    }
    if (e.target.closest("#saasPrivacyBtn, [data-action-open-privacy]")) {
      showCategoryPrivacyModal();
      return;
    }
    if (e.target.closest("[data-close-safety]")) {
      const m = document.getElementById("categorySafetyModalBackdrop");
      if (m) { m.classList.remove("is-open"); m.setAttribute("aria-hidden", "true"); }
      return;
    }
    const catTabBtn = e.target.closest("[data-cat-legal-tab]");
    if (catTabBtn) {
      const tabName = catTabBtn.getAttribute("data-cat-legal-tab");
      document.querySelectorAll("[data-cat-legal-tab]").forEach(b => {
        const active = b === catTabBtn;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-selected", active ? "true" : "false");
      });
      const tPane = document.getElementById("catLegalTabTerms");
      const pPane = document.getElementById("catLegalTabPrivacy");
      if (tPane && pPane) {
        tPane.classList.toggle("is-active", tabName === "terms");
        pPane.classList.toggle("is-active", tabName === "privacy");
      }
      return;
    }
    if (e.target.closest("[data-close-privacy]")) {
      const m = document.getElementById("categoryPrivacyModalBackdrop");
      if (m) { m.classList.remove("is-open"); m.setAttribute("aria-hidden", "true"); }
      return;
    }
    if (e.target.closest("#safetyDownloadBackupBtn")) {
      categoryExportBackup();
      return;
    }
    if (e.target.closest("#safetyUploadBackupBtn")) {
      document.getElementById("categoryBackupFileInput")?.click();
      return;
    }
    const restoreBtn = e.target.closest("[data-restore-snapshot]");
    if (restoreBtn) {
      const idx = parseInt(restoreBtn.dataset.restoreSnapshot, 10);
      const snapshotsKey = `bms_snapshots_${CURRENT.key}`;
      try {
        const snapshots = JSON.parse(localStorage.getItem(snapshotsKey) || "[]");
        const targetSnapshot = snapshots[idx];
        if (targetSnapshot && targetSnapshot.features) {
          if (confirm(`Restore snapshot from ${targetSnapshot.date}? Current records will be replaced with this snapshot.`)) {
            categoryData.features = JSON.parse(JSON.stringify(targetSnapshot.features));
            if (targetSnapshot.trash) categoryData.trash = JSON.parse(JSON.stringify(targetSnapshot.trash));
            categorySaveData();
            categoryRenderList();
            showWorkspaceToast(`Restored snapshot from ${targetSnapshot.date}!`);
            const m = document.getElementById("categorySafetyModalBackdrop");
            if (m) { m.classList.remove("is-open"); m.setAttribute("aria-hidden", "true"); }
          }
        }
      } catch (err) {
        alert("Error restoring snapshot: " + err.message);
      }
      return;
    }
  });



  document.getElementById("catFeatures")?.addEventListener("click", (event) => {
    const card = event.target.closest("[data-tool-feature]");
    if (card) {
      const featId = card.dataset.toolFeature;
      if (document.getElementById("saasPortal")) {
        selectSaasFeature(featId);
        document.getElementById("portalSection")?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        openCategoryFeature(card);
      }
    }
  });
  document.addEventListener("click", (event) => {
    const toggleBtn = event.target.closest("#saasNavToggleBtn");
    if (toggleBtn) {
      event.preventDefault();
      toggleSaasSidebar();
      return;
    }
    const closeBtn = event.target.closest("#saasSidebarClose, #saasSidebarBackdrop");
    if (closeBtn) {
      event.preventDefault();
      toggleSaasSidebar(false);
      return;
    }
    const navFeat = event.target.closest("[data-saas-feature]");
    if (navFeat) {
      selectSaasFeature(navFeat.dataset.saasFeature);
      toggleSaasSidebar(false);
      return;
    }
    if (window.innerWidth <= 1024) {
      const sidebar = document.getElementById("saasSidebar");
      if (sidebar && sidebar.classList.contains("is-open")) {
        if (!event.target.closest("#saasSidebar, #saasNavToggleBtn")) {
          toggleSaasSidebar(false);
        }
      }
    }
    if (event.target.closest("#toTop")) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (event.target.closest("[data-workspace-close]")) closeCategoryWorkspace();
    if (event.target.closest("[data-auth-close]")) closeCategoryAuth();
    const planButton = event.target.closest("[data-subscription-plan]");
    if (planButton) showCategoryAuth(planButton.dataset.subscriptionPlan, categoryUser ? "request" : "signup");
    const proTab = event.target.closest("[data-pro-tab]");
    if (proTab) {
      showCategoryTrialModal(proTab.dataset.proTab);
      return;
    }
    if (event.target.closest("#proRemoveDpBtn")) {
      let trial = categoryGetTrial() || {};
      delete trial.avatar;
      localStorage.setItem("bms_user_trial", JSON.stringify(trial));
      localStorage.setItem("oms_trial_account", JSON.stringify(trial));
      categoryUpdateHeaderBtn();
      showCategoryTrialModal(currentProfileViewMode);
      showWorkspaceToast("Profile photo removed.");
      return;
    }
    const copyUid = event.target.closest("[data-action-copy-uid]");
    if (copyUid) {
      const uid = copyUid.dataset.actionCopyUid;
      if (uid) {
        try {
          navigator.clipboard.writeText(uid);
          showWorkspaceToast(`Copied User ID: ${uid}`);
        } catch (_) {}
      }
      return;
    }
    const heroSignup = event.target.closest("#categoryHeroSignup, #userSignupHeaderBtn");
    if (heroSignup) {
      showCategoryTrialModal();
      return;
    }
    if (event.target.closest("#toggleToPasswordLogin")) {
      event.preventDefault();
      const sMain = document.getElementById("signupStepMain");
      const sLog = document.getElementById("signupStepLogin");
      if (sMain && sLog) {
        sMain.style.display = "none";
        sLog.style.display = "block";
        document.getElementById("loginIdentifier")?.focus();
      }
      return;
    }
    if (event.target.closest("#toggleToCreateAccount")) {
      event.preventDefault();
      const sMain = document.getElementById("signupStepMain");
      const sLog = document.getElementById("signupStepLogin");
      if (sMain && sLog) {
        sMain.style.display = "block";
        sLog.style.display = "none";
        document.getElementById("signupEmail")?.focus();
      }
      return;
    }
    const passToggle = event.target.closest("#toggleSignupPass, #toggleLoginPass");
    if (passToggle) {
      const isSignup = passToggle.id === "toggleSignupPass";
      const inp = document.getElementById(isSignup ? "signupPassword" : "loginPassword");
      if (inp) {
        inp.type = inp.type === "password" ? "text" : "password";
      }
      return;
    }
    if (event.target.closest("#categoryGoogleAuthBtn")) {
      if (CATEGORY_SUPABASE) {
        CATEGORY_SUPABASE.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: window.location.href }
        }).catch((e) => console.warn("Google auth err:", e));
      } else {
        showWorkspaceToast("Google Sign-In is active. Connect cloud auth for live sync.");
      }
      return;
    }
    if (event.target.closest("[data-action-open-trial-form], [data-action-open-trial-signup]")) {
      showCategoryTrialModal("signup");
      return;
    }
    if (event.target.closest("[data-action-view-paywall], #categoryHeroPlans")) {
      showCategorySubscriptionPaywall();
      return;
    }
    if (event.target.closest("[data-action-signin-toggle]")) {
      showCategorySignIn();
      return;
    }
    const selectPlan = event.target.closest("[data-select-plan]");
    if (selectPlan) {
      const planId = selectPlan.dataset.selectPlan;
      showCategoryAuth(planId, categoryUser ? "request" : "signup");
      return;
    }
    const paySelected = event.target.closest("[data-action-pay-selected]");
    if (paySelected) {
      const planId = paySelected.dataset.actionPaySelected || "3-month";
      showCategoryAuth(planId, categoryUser ? "request" : "signup");
      return;
    }
    if (event.target.closest("#categoryLogin")) showCategorySignIn();
    const mode = event.target.closest("[data-auth-mode]");
    if (mode) showCategoryAuth(mode.dataset.plan, mode.dataset.authMode);
    if (event.target.closest("[data-auth-signout]")) {
      localStorage.removeItem("bms_user_trial");
      localStorage.removeItem("oms_trial_account");
      categoryUser = null;
      categorySubscription = null;
      categoryLatestRequest = null;
      categoryUpdateHeaderBtn();
      CATEGORY_SUPABASE?.auth.signOut().catch(() => {});
      closeCategoryAuth();
      showWorkspaceToast("Logged out successfully.");
      if (categoryFeature) categoryRenderList();
      return;
    }
    if (event.target.closest("[data-action-delete-account]")) {
      const confirmDel = window.confirm("Are you sure you want to delete your account? This will permanently delete your profile and reset your session.");
      if (!confirmDel) return;

      localStorage.removeItem("bms_user_trial");
      localStorage.removeItem("oms_trial_account");
      categoryUser = null;
      categorySubscription = null;
      categoryLatestRequest = null;
      categoryUpdateHeaderBtn();
      CATEGORY_SUPABASE?.auth.signOut().catch(() => {});
      closeCategoryAuth();
      showWorkspaceToast("Account deleted successfully. You can sign up free again anytime.");
      if (categoryFeature) categoryRenderList();
      return;
    }
    const menuToggle = event.target.closest("[data-ws-menu-toggle]");
    if (menuToggle) {
      const menu = document.getElementById("catWsDataMenu");
      if (menu) {
        const isOpen = menu.classList.toggle("is-open");
        menuToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      }
      return;
    }
    if (!event.target.closest(".cat-ws-dropdown")) {
      const menu = document.getElementById("catWsDataMenu");
      if (menu && menu.classList.contains("is-open")) {
        menu.classList.remove("is-open");
        const toggle = document.querySelector("[data-ws-menu-toggle]");
        if (toggle) toggle.setAttribute("aria-expanded", "false");
      }
    }

    if (event.target.closest("#saasBoxToday")) {
      const today = getTodayDateString();
      categoryDateFilter = categoryDateFilter === today ? "" : today;
      categoryRenderList();
      return;
    }
    if (event.target.closest("#saasBoxTotal")) {
      categoryDateFilter = "";
      categoryRenderList();
      return;
    }
    if (event.target.closest("#saasClearDateBtn, [data-action-clear-date]")) {
      categoryDateFilter = "";
      categoryRenderList();
      return;
    }

    const add = event.target.closest("[data-tool-add], .saas-btn-add, #saasAddRecordBtn");
    if (add) {
      categoryRenderForm();
      return;
    }
    if (event.target.closest("#saasRecycleBinBtn")) {
      categoryTab = categoryTab === "trash" ? "active" : "trash";
      categoryRenderList();
      return;
    }
    if (event.target.closest("#saasCsvBtn, [data-action-csv]")) {
      categoryExportCsv();
      return;
    }
    if (event.target.closest(".saas-btn-print, [data-action-print], #saasPrintBtn")) {
      categoryPrintReport();
      return;
    }
    if (event.target.closest("[data-tool-back]")) {
      categoryRenderList();
      return;
    }
    const edit = event.target.closest("[data-tool-edit]");
    if (edit) {
      categoryRenderForm(edit.dataset.toolEdit);
      return;
    }
    const trash = event.target.closest("[data-tool-trash]");
    if (trash && categoryFeature) {
      const idToTrash = trash.dataset.toolTrash;
      if (confirm("Are you sure you want to delete this record? It can be restored anytime from the Recycle Bin.")) {
        categoryMoveToTrash(categoryFeature.id, idToTrash);
      }
      return;
    }
    const restore = event.target.closest("[data-tool-restore]");
    if (restore && categoryFeature) {
      categoryRestoreFromTrash(categoryFeature.id, restore.dataset.toolRestore);
      return;
    }
    const permDel = event.target.closest("[data-tool-perm-delete]");
    if (permDel && categoryFeature) {
      categoryPermanentDelete(categoryFeature.id, permDel.dataset.toolPermDelete);
      return;
    }
    if (event.target.closest("[data-ws-empty-trash]") && categoryFeature) {
      categoryEmptyTrash(categoryFeature.id);
      return;
    }
    const wsTab = event.target.closest("[data-ws-tab]");
    if (wsTab) {
      categoryTab = wsTab.dataset.wsTab || "active";
      categoryRenderList();
      return;
    }
    const closeDataMenu = () => {
      const menu = document.getElementById("catWsDataMenu");
      if (menu && menu.classList.contains("is-open")) {
        menu.classList.remove("is-open");
        const toggle = document.querySelector("[data-ws-menu-toggle]");
        if (toggle) toggle.setAttribute("aria-expanded", "false");
      }
    };

    if (event.target.closest("[data-ws-search-clear]")) {
      categorySearchQuery = "";
      categoryRenderList();
      return;
    }
    if (event.target.closest("[data-ws-backup]")) {
      closeDataMenu();
      categoryExportBackup();
      return;
    }
    if (event.target.closest("[data-ws-restore]")) {
      closeDataMenu();
      document.getElementById("categoryBackupFileInput")?.click();
      return;
    }
    if (event.target.closest("[data-ws-csv]")) {
      closeDataMenu();
      categoryExportCsv();
      return;
    }
    if (event.target.closest("[data-ws-print]")) {
      closeDataMenu();
      categoryPrintReport();
      return;
    }
    if (event.target.closest("[data-ws-undo]")) {
      if (typeof categoryUndoAction === "function") categoryUndoAction();
      return;
    }
    if (event.target.closest("[data-ws-toast-close]")) {
      const container = document.getElementById("categoryWsToastContainer");
      if (container) container.innerHTML = "";
      return;
    }

    const sortTh = event.target.closest("[data-sort-key]");
    if (sortTh) {
      const key = sortTh.dataset.sortKey;
      if (categorySortCol === key) {
        categorySortDir = categorySortDir === "asc" ? "desc" : "asc";
      } else {
        categorySortCol = key;
        categorySortDir = "asc";
      }
      categoryPage = 1;
      categoryRenderList();
      return;
    }

    const pageBtn = event.target.closest("[data-ws-page]");
    if (pageBtn) {
      const action = pageBtn.dataset.wsPage;
      if (action === "prev") categoryPage--;
      else if (action === "next") categoryPage++;
      else categoryPage = Number(action) || 1;
      categoryRenderList();
      return;
    }

    if (event.target.closest("[data-action-export-csv]")) {
      categoryExportCsv();
      return;
    }
    if (event.target.closest("[data-action-backup-json]")) {
      categoryExportBackup();
      return;
    }
    if (event.target.closest("[data-action-restore-json]")) {
      document.getElementById("categoryBackupFileInput")?.click();
      return;
    }
    if (event.target.closest("[data-action-show-shortcuts]")) {
      showCategoryShortcutsModal();
      return;
    }
  });

  document.getElementById("categoryWorkspaceContent")?.addEventListener("input", (event) => {
    if (event.target.matches("[data-ws-search]")) {
      categorySearchQuery = event.target.value;
      categoryPage = 1;
      categoryRenderList();
      const input = document.querySelector("[data-ws-search]");
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }
  });

  document.addEventListener("change", (event) => {
    if (event.target.id === "categoryBackupFileInput" && event.target.files?.length) {
      categoryImportBackup(event.target.files[0]);
      event.target.value = "";
      return;
    }
    if (event.target.matches("[data-ws-currency-select]")) {
      setGlobalCurrency(event.target.value);
      return;
    }
    if (event.target.matches("[data-ws-page-size]")) {
      categoryPageSize = event.target.value === "all" ? "all" : Number(event.target.value);
      categoryPage = 1;
      categoryRenderList();
      return;
    }
  });

  document.addEventListener("keydown", (e) => {
    const isInput = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
    if (e.key === "Escape") {
      const shortcutsModal = document.getElementById("catShortcutsModal");
      if (shortcutsModal) {
        shortcutsModal.remove();
        return;
      }
      const editForm = document.getElementById("categoryRecordForm");
      if (editForm) {
        categoryRenderList();
        return;
      }
      const authModal = document.getElementById("categoryAuthModal");
      if (authModal && authModal.classList.contains("open")) {
        closeCategoryAuth();
        return;
      }
      return;
    }
    if (!isInput && e.key === "/") {
      e.preventDefault();
      const searchInput = document.querySelector(".cat-ws-search-input");
      if (searchInput) searchInput.focus();
      return;
    }
    if (e.altKey && (e.key === "n" || e.key === "N")) {
      e.preventDefault();
      categoryRenderForm();
      return;
    }
    if (e.altKey && (e.key === "p" || e.key === "P")) {
      e.preventDefault();
      categoryPrintReport();
      return;
    }
    if (e.altKey && (e.key === "e" || e.key === "E")) {
      e.preventDefault();
      categoryExportCsv();
      return;
    }
  });

  document.getElementById("categoryAuthContent")?.addEventListener("submit", async (event) => {
    const editForm = event.target.closest("#proEditProfileForm");
    if (editForm) {
      event.preventDefault();
      const formData = new FormData(editForm);
      const name = String(formData.get("name") || "").trim();
      const country = String(formData.get("country") || "International").trim();
            const code = String(formData.get("countryCode") || "+92").trim();
      const mobile = combinePhoneWithCode(code, String(formData.get("mobile") || ""));
      const city = String(formData.get("city") || "").trim();
      const businessName = String(formData.get("businessName") || "").trim();
      const errEl = document.getElementById("proEditError");

      if (name.length < 3) {
        if (errEl) errEl.textContent = "Please enter your full name (minimum 3 characters).";
        return;
      }
      if (!/^\d{7,16}$/.test(mobile)) {
        if (errEl) errEl.textContent = "Please enter a valid phone number with 7 to 16 digits.";
        return;
      }

      let trial = categoryGetTrial() || {};
      trial.name = name;
      trial.country = country;
      trial.mobile = mobile;
      trial.city = city;
      trial.businessName = businessName;
      localStorage.setItem("bms_user_trial", JSON.stringify(trial));
      localStorage.setItem("oms_trial_account", JSON.stringify(trial));

      if (categoryUser && categoryUser.user_metadata) {
        categoryUser.user_metadata.name = name;
        categoryUser.user_metadata.country = country;
        categoryUser.user_metadata.mobile = mobile;
        categoryUser.user_metadata.city = city;
      }

      categoryUpdateHeaderBtn();
      renderSaasAnalytics();
      showWorkspaceToast("Profile updated successfully!");
      showCategoryTrialModal("overview");
      return;
    }

    const trialForm = event.target.closest("#signupAccountForm, #categoryTrialForm");
    if (trialForm) {
      event.preventDefault();
      const formData = new FormData(trialForm);
      const name = String(formData.get("signupName") || formData.get("name") || "").trim() || "Business Owner";
      const email = String(formData.get("signupEmail") || formData.get("email") || "").trim().toLowerCase();
      const code = String(formData.get("countryCode") || "+92").trim();
      const rawMobile = String(formData.get("phoneNumber") || formData.get("mobile") || "").trim();
      const mobile = rawMobile ? combinePhoneWithCode(code, rawMobile) : "";
      const password = String(formData.get("signupPassword") || formData.get("password") || "");
      const authMsg = trialForm.querySelector(".auth-message, .category-auth-error") || document.getElementById("authMessage");
      const submit = trialForm.querySelector('button[type="submit"]');

      if (!email && !rawMobile) {
        if (authMsg) { authMsg.textContent = "Please enter either Gmail or Mobile number."; authMsg.classList.add("is-visible"); }
        return;
      }
      if (password.length < 8) {
        if (authMsg) { authMsg.textContent = "Password must be at least 8 characters."; authMsg.classList.add("is-visible"); }
        return;
      }
      if (rawMobile && !/^\d{7,16}$/.test(rawMobile.replace(/\D/g, ""))) {
        if (authMsg) { authMsg.textContent = "Please enter a valid phone number with 7 to 16 digits."; authMsg.classList.add("is-visible"); }
        return;
      }

      submit.disabled = true;
      submit.textContent = "Creating account…";

      const cleanUser = {
        name,
        email,
        mobile: mobile || rawMobile,
        country: code === "+92" ? "Pakistan" : "International",
        city: "Online",
        businessName: CURRENT?.name || "Online Business"
      };

      categorySetTrial(cleanUser);

      // Save locally to registered users for cross-page persistence
      try {
        const rawUsers = localStorage.getItem("oms_registered_users");
        const users = rawUsers ? JSON.parse(rawUsers) : [];
        users.push({ ...cleanUser, password, registeredAt: Date.now() });
        localStorage.setItem("oms_registered_users", JSON.stringify(users));
      } catch (_) {}

      if (CATEGORY_SUPABASE) {
        try {
          const authEmail = email || categoryEmail(mobile || rawMobile || ("user" + Date.now()));
          const res = await CATEGORY_SUPABASE.auth.signUp({
            email: authEmail,
            password,
            options: { data: cleanUser }
          });
          if (res.data?.user) {
            categoryUser = res.data.user;
            categorySessionReady = true;
          }
        } catch (cloudErr) {
          console.warn("Trial cloud register notice (trial active locally):", cloudErr);
        }
      }

      closeCategoryAuth();
      categoryUpdateHeaderBtn();
      showWorkspaceToast(`🎉 Welcome, ${name}! Your account has been created.`);
      if (categoryFeature) categoryRenderList();
      return;
    }

    const loginForm = event.target.closest("#loginAccountForm, #categoryLoginForm");
    if (loginForm) {
      event.preventDefault();
      const formData = new FormData(loginForm);
      const identifier = String(formData.get("loginIdentifier") || formData.get("mobile") || "").trim();
      const password = String(formData.get("loginPassword") || formData.get("password") || "");
      const authMsg = loginForm.querySelector(".auth-message, .category-auth-error") || document.getElementById("loginAuthMessage");
      const submit = loginForm.querySelector('button[type="submit"]');

      if (!identifier || !password) {
        if (authMsg) { authMsg.textContent = "Enter your Gmail / Mobile number and password."; authMsg.classList.add("is-visible"); }
        return;
      }

      submit.disabled = true;
      submit.textContent = "Signing in…";

      // 1. Check local registered users list
      let matchedUser = null;
      try {
        const rawUsers = localStorage.getItem("oms_registered_users");
        const users = rawUsers ? JSON.parse(rawUsers) : [];
        const cleanId = identifier.toLowerCase().replace(/\D/g, "");
        matchedUser = users.find((u) => {
          const uEmail = (u.email || "").toLowerCase();
          const uMob = (u.mobile || "").replace(/\D/g, "");
          return (uEmail && uEmail === identifier.toLowerCase()) || (uMob && cleanId && uMob.includes(cleanId));
        });
      } catch (_) {}

      if (matchedUser && matchedUser.password === password) {
        categorySetTrial({
          name: matchedUser.name || "Business User",
          email: matchedUser.email || "",
          mobile: matchedUser.mobile || identifier,
          city: matchedUser.city || "Online",
          country: matchedUser.country || "Pakistan"
        });
        categoryUpdateHeaderBtn();
        closeCategoryAuth();
        showWorkspaceToast(`Welcome back, ${matchedUser.name || 'User'}!`);
        if (categoryFeature) categoryRenderList();
        return;
      }

      // 2. Check Supabase
      if (CATEGORY_SUPABASE) {
        try {
          const isEmail = identifier.includes("@");
          const authEmail = isEmail ? identifier : categoryEmail(identifier.replace(/\D/g, ""));
          const { data, error } = await CATEGORY_SUPABASE.auth.signInWithPassword({
            email: authEmail,
            password
          });
          if (error) throw error;
          categoryUser = data.user;
          categorySessionReady = true;
          await categoryRefreshSubscription();
          if (!categoryGetTrial()) {
            categorySetTrial({ mobile: identifier, name: categoryUser.user_metadata?.name || "Business User" });
          }
          categoryUpdateHeaderBtn();
          closeCategoryAuth();
          showWorkspaceToast(`Welcome back, ${categoryUser.user_metadata?.name || 'User'}!`);
          if (categoryFeature) categoryRenderList();
          return;
        } catch (error) {
          if (authMsg) {
            authMsg.textContent = error.message || "Invalid credentials. Please check your password.";
            authMsg.classList.add("is-visible");
          }
          submit.disabled = false;
          submit.textContent = "Sign In to Account";
          return;
        }
      }

      if (authMsg) {
        authMsg.textContent = "Account not found or password incorrect. Please sign up free.";
        authMsg.classList.add("is-visible");
      }
      submit.disabled = false;
      submit.textContent = "Sign In to Account";
      return;
    }
    const form = event.target.closest("#categoryAuthForm");
    if (!form || !CATEGORY_SUPABASE) return;
    event.preventDefault();
    const formData = new FormData(form);
          const code = String(formData.get("countryCode") || "+92").trim();
      const mobile = combinePhoneWithCode(code, String(formData.get("mobile") || ""));
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "");
    const signup = !!formData.get("name");
    const message = form.querySelector(".category-auth-error");
    const submit = form.querySelector('button[type="submit"]');
    const payerMobile = categoryMobile(String(formData.get("payerMobile") || ""));
    const paymentReference = String(formData.get("paymentReference") || "").trim();
    if (!/^\d{7,16}$/.test(payerMobile)) {
      message.textContent = "Enter the sender mobile or contact identifier used for payment.";
      return;
    }
    if (!/^[A-Za-z0-9-]{4,100}$/.test(paymentReference)) {
      message.textContent = "Enter a valid transaction or reference ID (at least 4 characters).";
      return;
    }
    submit.disabled = true;
    submit.textContent = categoryUser ? "Submitting request…" : signup ? "Creating account…" : "Signing in…";
    try {
      if (!categoryUser) {
        if (!/^\d{7,16}$/.test(mobile)) throw new Error("Enter a valid account phone / mobile number.");
        const result = signup
          ? await CATEGORY_SUPABASE.auth.signUp({
            email: categoryEmail(mobile),
            password,
            options: { data: { name: String(formData.get("name")).trim(), mobile } }
          })
          : await CATEGORY_SUPABASE.auth.signInWithPassword({ email: categoryEmail(mobile), password });
        if (result.error) throw result.error;
        if (!result.data.session || !result.data.user) {
          throw new Error("Email confirmation is enabled, so sign-up cannot continue yet. The site administrator must disable Supabase email confirmation, then you can sign in.");
        }
        categoryUser = result.data.user;
        categorySessionReady = true;
      }
      const request = await CATEGORY_SUPABASE.from("subscription_requests").insert({
        user_id: categoryUser.id,
        category: CURRENT.key,
        plan: categorySelectedPlan,
        amount: CATEGORY_SUBSCRIPTION_PLANS[categorySelectedPlan].price,
        account_name: String(formData.get("name") || categoryUser.user_metadata?.name || "Account holder").trim().slice(0, 80),
        account_email: email || categoryUser.email || (categoryUser.user_metadata?.email || ""),
        account_mobile: categoryMobile(String(formData.get("mobile") || categoryUser.user_metadata?.mobile || categoryUser.email?.split("@")[0] || "")),
        payment_reference: paymentReference,
        payer_mobile: payerMobile,
        status: "pending"
      });
      if (request.error) throw request.error;
      await categoryRefreshSubscription();
      closeCategoryAuth();
      setCategoryAccountUi();
      // removed scroll to account bar
    } catch (error) {
      message.textContent = error.message || "Authentication failed. Please try again.";
      submit.disabled = false;
      submit.textContent = categoryUser ? "Submit payment for verification" : signup ? "Create account & submit payment" : "Sign in & submit payment";
    }
  });
  document.addEventListener("submit", async (event) => {
    const form = event.target.closest("#categoryRecordForm");
    if (!form || !categoryFeature) return;
    event.preventDefault();

    if (!categoryCanAddData()) {
      if (!categoryIsSignedIn()) {
        showWorkspaceToast("Website use karne ke liye pehle Sign Up karein (5-Day Free Trial).");
        showCategoryTrialModal("signup");
      } else {
        showWorkspaceToast("Aapka 5-Din ka Free Trial khatam ho chuka hai. Data add karne ke liye Subscription Plan lein.");
        showCategorySubscriptionPaywall();
      }
      return;
    }

    if (!form.reportValidity()) return;
    const fields = Object.fromEntries(new FormData(form).entries());
    const current = categoryItems();
    const existing = categoryEditId ? current.find((item) => item.id === categoryEditId) : null;
    const entry = {
      id: existing?.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `bms_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
      ...fields,
      fields,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    categoryData.features[categoryFeature.id] = existing
      ? current.map((item) => item.id === existing.id ? entry : item)
      : [entry, ...current];
    categoryBusy = true;
    try {
      await categorySaveData();
      categoryBusy = false;
      showWorkspaceToast(existing ? "Record updated successfully!" : "New record saved successfully!");
      categoryRenderList();
    } catch (error) {
      categoryBusy = false;
      const activeForm = document.getElementById("categoryRecordForm");
      const alert = activeForm?.querySelector(".category-auth-error");
      if (alert) alert.textContent = `Save warning: ${error.message || "Saved locally."}`;
      categoryRenderList();
    }
  });
  document.getElementById("categoryWorkspaceModal")?.addEventListener("click", (event) => {
    if (event.target.id === "categoryWorkspaceModal") closeCategoryWorkspace();
  });
  document.getElementById("categoryAuthModal")?.addEventListener("click", (event) => {
    if (event.target.id === "categoryAuthModal") closeCategoryAuth();
  });

  if (CATEGORY_SUPABASE) {
    categorySessionPromise = CATEGORY_SUPABASE.auth.getSession().then(({ data, error }) => {
      if (error) throw error;
      categoryUser = data.session?.user || null;
      categorySessionReady = true;
      if (categoryUser) return categoryRefreshSubscription();
      categorySubscription = null;
      categoryLatestRequest = null;
    }).catch((error) => {
      categorySessionReady = true;
      const status = document.getElementById("categoryAccountStatus");
      // subscription status display removed
    });
    CATEGORY_SUPABASE.auth.onAuthStateChange((_event, session) => {
      categoryUser = session?.user || null;
      categorySessionReady = true;
      if (!categoryUser) {
        categoryData.features = {};
        categorySubscription = null;
        categoryLatestRequest = null;
        closeCategoryWorkspace();
        setCategoryAccountUi();
      } else {
        setTimeout(() => {
          categoryRefreshSubscription().catch((error) => {
            const status = document.getElementById("categoryAccountStatus");
            // subscription status display removed
          });
        }, 0);
      }
    });
    window.setInterval(() => {
      if (!categoryUser) return;
      categoryEnsureAccountActive().catch((error) => {
        // subscription status display removed
      });
    }, 60000);
  }
};
