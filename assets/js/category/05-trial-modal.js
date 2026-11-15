// ============================================================
// Category page - 05-trial-modal.js
// Sign-up / trial / subscription modals for category pages.
// Split from the original category.js during the 2026-11 refactor.
// Loaded in numeric order by the page HTML. Keep that order.
// ============================================================

let currentProfileViewMode = "overview";

const compressUserProfileDp = (file, callback) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const maxDim = 280;
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxDim) {
          height = Math.round(height * (maxDim / width));
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round(width * (maxDim / height));
          height = maxDim;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      callback(dataUrl);
    };
    img.onerror = () => alert("Could not process this image format. Please select JPEG or PNG.");
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
};

const categoryUpdateHeaderBtn = () => {
  const btn = document.getElementById("userSignupHeaderBtn");
  if (!btn) return;
  const hasSub = categoryHasActiveSubscription();
  const trial = categoryGetTrial();
  const user = categoryUser;

  if (user || trial || hasSub) {
    const rawName = user?.user_metadata?.name || trial?.name || "Business Owner";
    const initial = (rawName.charAt(0) || "U").toUpperCase();
    const uid = trial?.uid || (user ? `UID-${user.id.slice(0, 5).toUpperCase()}` : "UID-84920");
    const avatar = trial?.avatar || "";
    const isExpired = trial && !trial.isActive && !hasSub;

    btn.className = "header-user-profile-btn";
    btn.innerHTML = `
      <span class="user-avatar-badge ${avatar ? 'has-img' : ''}">
        ${avatar ? `<img src="${avatar}" alt="${categoryEscape(rawName)}" class="user-avatar-img" />` : categoryEscape(initial)}
      </span>
      <div class="user-meta-text">
        <span class="user-id-title">${categoryEscape(rawName)}</span>
        <span class="user-id-code">${categoryEscape(uid)}${isExpired ? ' · Expired' : ''}</span>
      </div>
      <span class="user-dropdown-arrow">&#9662;</span>
    `;
    btn.title = isExpired ? `Signed in: ${rawName} (${uid}) - 5-Day Free Trial Ended` : `Signed in: ${rawName} (${uid}) - Click to manage account`;
  } else {
    btn.className = "btn btn-primary header-signup-btn";
    btn.innerHTML = `<span>Sign Up Free</span>`;
    btn.title = "Create an account or sign in";
  }
};

const showCategoryTrialModal = (viewMode = "overview") => {
  currentProfileViewMode = viewMode;
  categoryEnsureToolsUi();
  const modal = document.getElementById("categoryAuthModal");
  const panel = modal?.querySelector(".category-auth-panel");
  const content = document.getElementById("categoryAuthContent");
  if (!modal || !content) return;

  const trial = categoryGetTrial();
  const hasSub = categoryHasActiveSubscription();

  if (categoryUser || (trial && trial.isActive) || hasSub) {
    if (panel) panel.classList.add("is-profile-view");
    const userName = categoryUser?.user_metadata?.name || trial?.name || "Business Owner";
    const userMobile = categoryUser?.user_metadata?.mobile || trial?.mobile || "N/A";
    const userCity = categoryUser?.user_metadata?.city || trial?.city || "";
    const userCountry = trial?.country || categoryUser?.user_metadata?.country || "International";
    const portalName = CURRENT?.name ? `${CURRENT.name} Portal` : (CURRENT?.short ? `${CURRENT.short} Portal` : "Business Portal");
    const rawBusiness = trial?.businessName || "";
    const displayBusiness = (rawBusiness && rawBusiness.trim().toLowerCase() !== userName.trim().toLowerCase())
      ? rawBusiness.trim()
      : portalName;
    const uid = trial?.uid || (categoryUser ? `UID-${categoryUser.id.slice(0, 5).toUpperCase()}` : "UID-84920");
    const initial = (userName.charAt(0) || "U").toUpperCase();
    const avatar = trial?.avatar || "";
    const currCode = getGlobalCurrency();
    const curr = OMS_CURRENCIES[currCode] || OMS_CURRENCIES.USD;
    const regDate = trial?.startedAt
      ? new Date(trial.startedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
      : new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

    const avatarInnerHtml = avatar
      ? `<img src="${avatar}" alt="${categoryEscape(userName)}" />`
      : `<span>${categoryEscape(initial)}</span>`;

    content.innerHTML = `
      <div class="pro-account-card">
        <div class="pro-account-header">
          <div class="pro-avatar-wrapper">
            <div class="pro-avatar-circle" id="proAvatarCircle">
              ${avatarInnerHtml}
            </div>
            <label class="pro-avatar-camera-btn" title="Upload / Change Profile Picture">
              <input type="file" id="userProfileDpInput" accept="image/*" style="display:none;" />
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
            </label>
          </div>

          <div class="pro-account-meta">
            <div class="pro-account-name-row">
              <h2 class="pro-account-name">${categoryEscape(userName)}</h2>
              <span class="pro-verified-pill" title="Verified Account">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                Verified
              </span>
            </div>
            <p class="pro-account-sub">${categoryEscape(displayBusiness)}</p>

            <div class="pro-badges-strip">
              <div class="pro-uid-badge" id="proUidBadge" title="Click to copy User ID" data-action-copy-uid="${categoryEscape(uid)}">
                <span class="pro-uid-label">ID:</span>
                <code class="pro-uid-val">${categoryEscape(uid)}</code>
                <svg class="pro-copy-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              </div>
              <span class="pro-status-chip ${trial && !trial.isActive && !hasSub ? 'is-expired' : 'is-active'}" style="${trial && !trial.isActive && !hasSub ? 'background:#fef2f2; color:#dc2626; border:1px solid #fecaca;' : ''}">
                <span class="pro-status-dot" style="${trial && !trial.isActive && !hasSub ? 'background:#dc2626;' : ''}"></span>
                ${trial && !trial.isActive && !hasSub ? '5-Day Trial Ended' : (hasSub ? 'Pro Subscription' : `Active Trial (${trial?.daysLeft || 0}d left)`)}
              </span>
            </div>

            <div class="pro-avatar-actions-row">
              <label class="pro-avatar-text-link" for="userProfileDpInput">Change photo</label>
              ${avatar ? `<button type="button" class="pro-remove-dp-btn" id="proRemoveDpBtn">Remove photo</button>` : ''}
            </div>
          </div>
        </div>

        <div class="pro-tabs-nav">
          <button type="button" class="pro-tab-btn ${viewMode === 'overview' ? 'is-active' : ''}" data-pro-tab="overview">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            Account Details
          </button>
          <button type="button" class="pro-tab-btn ${viewMode === 'edit' ? 'is-active' : ''}" data-pro-tab="edit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            Edit Profile
          </button>
        </div>

        ${viewMode === 'overview' ? `
          <div class="pro-details-card">
            <div class="pro-detail-row">
              <span class="pro-detail-label">Full Name</span>
              <strong class="pro-detail-val">${categoryEscape(userName)}</strong>
            </div>
            <div class="pro-detail-row">
              <span class="pro-detail-label">Registered Phone</span>
              <strong class="pro-detail-val">${categoryEscape(userMobile)}</strong>
            </div>
            <div class="pro-detail-row">
              <span class="pro-detail-label">Country / Region</span>
              <strong class="pro-detail-val">${categoryEscape(userCountry)}</strong>
            </div>
            <div class="pro-detail-row">
              <span class="pro-detail-label">City / Location</span>
              <strong class="pro-detail-val">${categoryEscape(userCity && userCity !== 'Not specified' ? userCity : 'Not set')}</strong>
            </div>
            <div class="pro-detail-row">
              <span class="pro-detail-label">Business / Category</span>
              <strong class="pro-detail-val">${categoryEscape(displayBusiness)}</strong>
            </div>
            <div class="pro-detail-row">
              <span class="pro-detail-label">Active Currency</span>
              <strong class="pro-detail-val" style="color:#047857;">${categoryEscape(curr.name)} (${categoryEscape(curr.code)})</strong>
            </div>
            <div class="pro-detail-row">
              <span class="pro-detail-label">Account Status</span>
              <strong class="pro-detail-val" style="color:${trial && !trial.isActive && !hasSub ? '#dc2626' : '#047857'};">${trial && !trial.isActive && !hasSub ? '5-Day Free Trial Ended' : (hasSub ? 'Pro Subscription Active' : `Active Trial (${trial?.daysLeft || 0}d left)`)}</strong>
            </div>
            <div class="pro-detail-row">
              <span class="pro-detail-label">Registered Date</span>
              <strong class="pro-detail-val">${regDate}</strong>
            </div>
          </div>

          <div class="pro-actions-footer">
            ${trial && !trial.isActive && !hasSub ? `
              <button type="button" class="btn btn-primary" data-action-view-paywall style="background:#ff8f04; border-color:#ff8f04; color:#fff; font-weight:700;">
                💳 Purchase Subscription Plan
              </button>
            ` : ''}
            <button type="button" class="btn btn-primary pro-edit-cta-btn" data-pro-tab="edit">
              ✏️ Edit Profile
            </button>
            <button type="button" class="btn btn-outline pro-logout-btn" data-auth-signout>
              Logout
            </button>
            <button type="button" class="btn btn-outline pro-delete-acc-btn" data-action-delete-account>
              Delete Account
            </button>
          </div>
        ` : `
          <form class="pro-edit-form" id="proEditProfileForm">
            <div class="pro-form-group">
              <label>Full Name *</label>
              <input name="name" type="text" value="${categoryEscape(userName)}" required minlength="3" maxlength="80" placeholder="Full Name" />
            </div>
            <div class="pro-form-group">
              <label>Country / Region</label>
              <select name="country" style="width:100%; padding:0.65rem 0.8rem; border:1px solid #cbd5e1; border-radius:10px; font-size:0.9rem; background:#fff;">
                <option value="United States" ${userCountry === 'United States' ? 'selected' : ''}>🇺🇸 United States</option>
                <option value="United Kingdom" ${userCountry === 'United Kingdom' ? 'selected' : ''}>🇬🇧 United Kingdom</option>
                <option value="United Arab Emirates" ${userCountry === 'United Arab Emirates' ? 'selected' : ''}>🇦🇪 United Arab Emirates</option>
                <option value="Saudi Arabia" ${userCountry === 'Saudi Arabia' ? 'selected' : ''}>🇸🇦 Saudi Arabia</option>
                <option value="Canada" ${userCountry === 'Canada' ? 'selected' : ''}>🇨🇦 Canada</option>
                <option value="Australia" ${userCountry === 'Australia' ? 'selected' : ''}>🇦🇺 Australia</option>
                <option value="Pakistan" ${userCountry === 'Pakistan' ? 'selected' : ''}>🇵🇰 Pakistan</option>
                <option value="India" ${userCountry === 'India' ? 'selected' : ''}>🇮🇳 India</option>
                <option value="Germany" ${userCountry === 'Germany' ? 'selected' : ''}>🇩🇪 Germany</option>
                <option value="France" ${userCountry === 'France' ? 'selected' : ''}>🇫🇷 France</option>
                <option value="Singapore" ${userCountry === 'Singapore' ? 'selected' : ''}>🇸🇬 Singapore</option>
                <option value="Malaysia" ${userCountry === 'Malaysia' ? 'selected' : ''}>🇲🇾 Malaysia</option>
                <option value="International" ${!userCountry || userCountry === 'International' ? 'selected' : ''}>🌐 Other / International</option>
              </select>
            </div>
            <div class="pro-form-group">
              <label>Registered Phone / Mobile *</label>
              <input name="mobile" type="tel" value="${categoryEscape(userMobile)}" required maxlength="20" placeholder="Mobile Number" />
            </div>
            <div class="pro-form-group">
              <label>City / Location</label>
              <input name="city" type="text" value="${categoryEscape(userCity !== 'Not specified' && userCity !== 'Not set' ? userCity : '')}" maxlength="50" placeholder="City" />
            </div>
            <div class="pro-form-group">
              <label>Business / Enterprise Name</label>
              <input name="businessName" type="text" value="${categoryEscape(rawBusiness)}" maxlength="80" placeholder="Business Name" />
            </div>

            <p class="category-auth-error" id="proEditError" role="alert" style="color:#ef4444; font-size:0.84rem; margin:0.2rem 0; min-height:1rem;"></p>

            <div class="pro-edit-actions">
              <button type="button" class="btn btn-outline" data-pro-tab="overview">Cancel</button>
              <button type="submit" class="btn btn-primary" id="proSaveProfileBtn" style="background:#ff8f04; border-color:#ff8f04; color:#fff;">Save Changes</button>
            </div>
          </form>
        `}
      </div>
    `;

    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    return;
  }

  if (panel) panel.classList.remove("is-profile-view");
  const isLogin = viewMode === "login";
  content.innerHTML = `
    <div class="signup-modal-content" id="signupCardView">
      <!-- Step 1: Account Creation View -->
      <div id="signupStepMain" style="${isLogin ? 'display:none;' : 'display:block;'}">
        <div class="card-heading">
          <h2 id="signup-title" class="signup-title">Create your account</h2>
          <p class="signup-sub">Enter your Gmail or Mobile number to start your 5-day free access.</p>
        </div>

        <form id="signupAccountForm" class="signup-phone-form" novalidate>
          <!-- Continue with Google button -->
          <button type="button" class="google-button" id="categoryGoogleAuthBtn">
            <svg class="google-icon" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          <div class="divider">or continue with details</div>

          <!-- Full Name Box -->
          <div class="form-field-group">
            <label class="field-label" for="signupName">Full Name</label>
            <div class="custom-input-box">
              <input type="text" id="signupName" name="signupName" autocomplete="name" placeholder="Full Name" required minlength="3">
            </div>
          </div>

          <!-- Gmail / Email Box -->
          <div class="form-field-group">
            <label class="field-label" for="signupEmail">Gmail / Email Address</label>
            <div class="custom-input-box">
              <input type="email" id="signupEmail" name="signupEmail" autocomplete="email" placeholder="name@gmail.com">
            </div>
          </div>

          <!-- Mobile Number Box with Clean Country Code Picker -->
          <div class="form-field-group">
            <label class="field-label" for="phoneNumber">Mobile Number</label>
            <div class="phone-input-wrap">
              <div class="country-picker-btn" id="countryPickerBtn">
                <div class="country-display">
                  <span class="flag-emoji" id="countryFlagDisplay">🇵🇰</span>
                  <span class="dial-code" id="countryCodeDisplay">+92</span>
                  <svg class="chevron-icon" viewBox="0 0 10 6" fill="none" aria-hidden="true">
                    <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <select id="countryCode" name="countryCode" aria-label="Select Country Code">
                  <option value="+92" data-flag="🇵🇰" data-code="+92" selected>🇵🇰 Pakistan (+92)</option>
                  <option value="+1" data-flag="🇺🇸" data-code="+1">🇺🇸 United States (+1)</option>
                  <option value="+44" data-flag="🇬🇧" data-code="+44">🇬🇧 United Kingdom (+44)</option>
                  <option value="+971" data-flag="🇦🇪" data-code="+971">🇦🇪 UAE (+971)</option>
                  <option value="+966" data-flag="🇸🇦" data-code="+966">🇸🇦 Saudi Arabia (+966)</option>
                  <option value="+1" data-flag="🇨🇦" data-code="+1">🇨🇦 Canada (+1)</option>
                  <option value="+61" data-flag="🇦🇺" data-code="+61">🇦🇺 Australia (+61)</option>
                  <option value="+91" data-flag="🇮🇳" data-code="+91">🇮🇳 India (+91)</option>
                  <option value="+49" data-flag="🇩🇪" data-code="+49">🇩🇪 Germany (+49)</option>
                  <option value="+33" data-flag="🇫🇷" data-code="+33">🇫🇷 France (+33)</option>
                  <option value="+90" data-flag="🇹🇷" data-code="+90">🇹🇷 Turkey (+90)</option>
                  <option value="+86" data-flag="🇨🇳" data-code="+86">🇨🇳 China (+86)</option>
                  <option value="+81" data-flag="🇯🇵" data-code="+81">🇯🇵 Japan (+81)</option>
                  <option value="+60" data-flag="🇲🇾" data-code="+60">🇲🇾 Malaysia (+60)</option>
                  <option value="+65" data-flag="🇸🇬" data-code="+65">🇸🇬 Singapore (+65)</option>
                </select>
              </div>
              <span class="phone-v-divider" aria-hidden="true"></span>
              <input type="tel" id="phoneNumber" name="phoneNumber" inputmode="tel" autocomplete="tel" placeholder="300 1234567" required>
            </div>
          </div>

          <!-- Create Password Box -->
          <div class="form-field-group">
            <label class="field-label" for="signupPassword">Create Password</label>
            <div class="custom-input-box">
              <input type="password" id="signupPassword" name="signupPassword" autocomplete="new-password" required minlength="8" placeholder="Minimum 8 characters">
              <button type="button" class="input-icon-btn" id="toggleSignupPass" aria-label="Toggle password visibility">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
          </div>

          <button class="phone-button" id="signupSubmitBtn" type="submit">
            <span>Sign Up Free</span>
            <svg class="btn-arrow" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M4.167 10h11.666M10 4.167 15.833 10 10 15.833" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </form>

        <p class="auth-message" id="authMessage" role="status" aria-live="polite"></p>

        <div class="signup-modal-footer">
          <p class="modal-switch-text" style="border-top: none; padding-top: 0;">
            Already have an account? <a href="#" id="toggleToPasswordLogin">Log in with password</a>
          </p>
        </div>
      </div>

      <!-- Step 2: Login View -->
      <div id="signupStepLogin" style="${isLogin ? 'display:block;' : 'display:none;'}">
        <div class="card-heading">
          <h2 class="signup-title">Welcome Back</h2>
          <p class="signup-sub">Enter your registered Gmail or mobile number &amp; password.</p>
        </div>

        <form id="loginAccountForm" class="signup-phone-form" novalidate>
          <div class="form-field-group">
            <label class="field-label" for="loginIdentifier">Gmail or Mobile Number</label>
            <div class="custom-input-box">
              <input type="text" id="loginIdentifier" name="loginIdentifier" autocomplete="username" required placeholder="name@gmail.com or 03001234567">
            </div>
          </div>

          <div class="form-field-group">
            <label class="field-label" for="loginPassword">Password</label>
            <div class="custom-input-box">
              <input type="password" id="loginPassword" name="loginPassword" autocomplete="current-password" required placeholder="Enter password">
              <button type="button" class="input-icon-btn" id="toggleLoginPass" aria-label="Toggle password visibility">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
          </div>

          <button class="phone-button" id="loginSubmitBtn" type="submit">
            <span>Sign In to Account</span>
            <svg class="btn-arrow" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M4.167 10h11.666M10 4.167 15.833 10 10 15.833" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </form>

        <p class="auth-message" id="loginAuthMessage" role="status" aria-live="polite"></p>

        <div class="signup-modal-footer">
          <p class="modal-switch-text" style="border-top: none; padding-top: 0;">
            Don't have an account yet? <a href="#" id="toggleToCreateAccount">Create an account free</a>
          </p>
        </div>
      </div>
    </div>
  `;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  content.querySelector("input")?.focus();
};
