// ============================================================
// Home page - 19-user-profile.js
// Enterprise user profile card and account management.
// Split from the original script.js during the 2026-11 refactor.
// Loaded in numeric order by the page HTML. Keep that order.
// ============================================================

// ===== Enterprise User Profile & Account Management =====
const renderUserActiveProfile = (viewMode = "overview") => {
  const box = document.getElementById("userActiveBox");
  if (!box) return;

  if (userModalTitle) userModalTitle.style.display = "none";
  if (userModalSub) userModalSub.style.display = "none";
  const modalIcon = document.querySelector("#userModal .modal-icon");
  if (modalIcon) modalIcon.style.display = "none";

  const trial = getBmsTrial();
  const user = currentUser;
  const userName = user?.user_metadata?.name || trial?.name || "Business Owner";
  const userEmail = user?.user_metadata?.email || trial?.email || "N/A";
  const userMobile = user?.user_metadata?.mobile || trial?.mobile || "N/A";
  const userCity = user?.user_metadata?.city || trial?.city || "";
  const userCountry = trial?.country || user?.user_metadata?.country || "Pakistan";
  const rawBusiness = trial?.businessName || "";
  const displayBusiness = rawBusiness || "Business Management Portal";
  const uid = trial?.uid || (user ? `UID-${user.id.slice(0, 5).toUpperCase()}` : "UID-84920");
  const initial = (userName.charAt(0) || "U").toUpperCase();
  const avatar = trial?.avatar || "";
  const regDate = trial?.startedAt
    ? new Date(trial.startedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
    : new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

  const avatarInner = avatar
    ? `<img src="${avatar}" alt="${userName}" class="user-avatar-img" />`
    : `<span>${initial}</span>`;

  box.innerHTML = `
    <div class="pro-account-card">
      <div class="pro-account-header">
        <div class="pro-avatar-wrapper">
          <div class="pro-avatar-circle" id="userProfileAvatarCircle">
            ${avatarInner}
          </div>
          <label class="pro-avatar-camera-btn" title="Upload / Change Profile Picture">
            <input type="file" id="userModalDpInput" accept="image/*" style="display:none;" />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
              <circle cx="12" cy="13" r="4"></circle>
            </svg>
          </label>
        </div>

        <div class="pro-account-meta">
          <div class="pro-account-name-row">
            <h2 class="pro-account-name">${userName}</h2>
            <span class="pro-verified-pill" title="Verified Account">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              Verified
            </span>
          </div>
          <p class="pro-account-sub">${displayBusiness}</p>

          <div class="pro-badges-strip">
            <div class="pro-uid-badge" id="userProfileUidBadge" title="Click to copy User ID" data-user-copy-uid="${uid}">
              <span class="pro-uid-label">ID:</span>
              <code class="pro-uid-val">${uid}</code>
              <svg class="pro-copy-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </div>
            <span class="pro-status-chip is-active">
              <span class="pro-status-dot"></span>
              Active 5-Day Free Trial
            </span>
          </div>

          <div class="pro-avatar-actions-row">
            <label class="pro-avatar-text-link" for="userModalDpInput">Change photo</label>
            ${avatar ? `<button type="button" class="pro-remove-dp-btn" id="userModalRemoveDpBtn">Remove photo</button>` : ""}
          </div>
        </div>
      </div>

      <div class="pro-tabs-nav">
        <button type="button" class="pro-tab-btn ${viewMode === 'overview' ? 'is-active' : ''}" data-user-tab="overview">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          Account Details
        </button>
        <button type="button" class="pro-tab-btn ${viewMode === 'edit' ? 'is-active' : ''}" data-user-tab="edit">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          Edit Profile
        </button>
      </div>

      ${viewMode === "overview" ? `
        <div class="pro-details-card">
          <div class="pro-detail-row">
            <span class="pro-detail-label">Full Name</span>
            <strong class="pro-detail-val">${userName}</strong>
          </div>
          <div class="pro-detail-row">
            <span class="pro-detail-label">Email Address</span>
            <strong class="pro-detail-val">${userEmail}</strong>
          </div>
          <div class="pro-detail-row">
            <span class="pro-detail-label">Registered Phone</span>
            <strong class="pro-detail-val">${userMobile}</strong>
          </div>
          <div class="pro-detail-row">
            <span class="pro-detail-label">City / Location</span>
            <strong class="pro-detail-val">${userCity || "Not specified"}</strong>
          </div>
          <div class="pro-detail-row">
            <span class="pro-detail-label">Account Status</span>
            <strong class="pro-detail-val" style="color:#047857;">Active (All 8 Categories Unlocked)</strong>
          </div>
          <div class="pro-detail-row">
            <span class="pro-detail-label">Registered Date</span>
            <strong class="pro-detail-val">${regDate}</strong>
          </div>
        </div>

        <div class="pro-actions-footer">
          <button type="button" class="btn btn-primary pro-edit-cta-btn" data-user-tab="edit">
            Edit Profile
          </button>
          <button type="button" class="btn btn-outline pro-logout-btn" id="userActiveLogoutBtn">
            Logout
          </button>
          <button type="button" class="btn btn-outline pro-delete-acc-btn" id="userActiveDeleteBtn">
            Delete Account
          </button>
        </div>
      ` : `
        <form class="pro-edit-form" id="userActiveEditForm">
          <div class="pro-form-group">
            <label>Full Name *</label>
            <input name="name" type="text" value="${userName}" required minlength="3" maxlength="80" />
          </div>
          <div class="pro-form-group">
            <label>Email Address</label>
            <input name="email" type="email" value="${userEmail !== 'N/A' ? userEmail : ''}" maxlength="80" />
          </div>
          <div class="pro-form-group">
            <label>Registered Phone / Mobile *</label>
            <input name="mobile" type="tel" value="${userMobile}" required maxlength="20" />
          </div>
          <div class="pro-form-group">
            <label>City / Location</label>
            <input name="city" type="text" value="${userCity}" maxlength="50" />
          </div>
          <div class="pro-form-group">
            <label>Business / Enterprise Name</label>
            <input name="businessName" type="text" value="${rawBusiness}" maxlength="80" />
          </div>

          <p class="category-auth-error" id="userEditError" role="alert" style="color:#ef4444; font-size:0.84rem; margin:0.2rem 0; min-height:1rem;"></p>

          <div class="pro-edit-actions">
            <button type="button" class="btn btn-outline" data-user-tab="overview">Cancel</button>
            <button type="submit" class="btn btn-primary" id="userSaveProfileBtn" style="background:#ff8f04; border-color:#ff8f04; color:#fff;">Save Changes</button>
          </div>
        </form>
      `}
    </div>
  `;
};

// Global User Profile Card Event Handlers
document.addEventListener("click", async (e) => {
  const tabBtn = e.target.closest("[data-user-tab]");
  if (tabBtn) {
    renderUserActiveProfile(tabBtn.dataset.userTab);
    return;
  }
  const copyBtn = e.target.closest("[data-user-copy-uid]");
  if (copyBtn) {
    try {
      await navigator.clipboard.writeText(copyBtn.dataset.userCopyUid);
      showToast(`Copied User ID: ${copyBtn.dataset.userCopyUid}`);
    } catch (_) {}
    return;
  }
  if (e.target.closest("#userActiveLogoutBtn, #userLogout")) {
    localStorage.removeItem("bms_user_trial");
    localStorage.removeItem("oms_trial_account");
    if (sb) {
      try { await signOutSiteAccount(); } catch (_) {}
    }
    currentUser = null;
    refreshUserSignupButton();
    closeUserModal();
    showToast("Logged out successfully.");
    return;
  }
  if (e.target.closest("#userActiveDeleteBtn")) {
    if (confirm("Are you sure you want to delete your account? All your trial data and saved records will be permanently removed.")) {
      localStorage.removeItem("bms_user_trial");
      localStorage.removeItem("oms_trial_account");
      if (sb) {
        try { await signOutSiteAccount(); } catch (_) {}
      }
      currentUser = null;
      refreshUserSignupButton();
      closeUserModal();
      showToast("Account deleted successfully. You can sign up free again anytime.");
    }
    return;
  }
  if (e.target.closest("#userModalRemoveDpBtn")) {
    const trial = getBmsTrial();
    if (trial) {
      delete trial.avatar;
      localStorage.setItem("bms_user_trial", JSON.stringify(trial));
      localStorage.setItem("oms_trial_account", JSON.stringify(trial));
      refreshUserSignupButton();
      renderUserActiveProfile("overview");
      showToast("Profile photo removed.");
    }
    return;
  }
});

document.addEventListener("change", (e) => {
  if (e.target && e.target.id === "userModalDpInput") {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        alert("Image must be smaller than 3MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const trial = getBmsTrial();
        if (trial) {
          trial.avatar = ev.target.result;
          localStorage.setItem("bms_user_trial", JSON.stringify(trial));
          localStorage.setItem("oms_trial_account", JSON.stringify(trial));
          refreshUserSignupButton();
          renderUserActiveProfile("overview");
          showToast("Profile photo updated.");
        }
      };
      reader.readAsDataURL(file);
    }
  }
});

document.addEventListener("submit", (e) => {
  if (e.target && e.target.id === "userActiveEditForm") {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const mobile = String(formData.get("mobile") || "").trim();
    const city = String(formData.get("city") || "").trim();
    const businessName = String(formData.get("businessName") || "").trim();

    if (name.length < 3) {
      const err = document.getElementById("userEditError");
      if (err) err.textContent = "Please enter your full name (minimum 3 characters).";
      return;
    }
    const trial = getBmsTrial() || {};
    const updated = {
      ...trial,
      name,
      email: email || trial.email,
      mobile: mobile || trial.mobile,
      city: city || trial.city,
      businessName: businessName || trial.businessName
    };
    localStorage.setItem("bms_user_trial", JSON.stringify(updated));
    localStorage.setItem("oms_trial_account", JSON.stringify(updated));
    refreshUserSignupButton();
    renderUserActiveProfile("overview");
    showToast("Profile updated successfully!");
  }
});
