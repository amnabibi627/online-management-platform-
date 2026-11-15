// ============================================================
// Home page - 08-user-auth-modal.js
// User sign-up / sign-in modal, validation and country phone picker.
// Split from the original script.js during the 2026-11 refactor.
// Loaded in numeric order by the page HTML. Keep that order.
// ============================================================

// ===== User Sign Up / Login modal =====
const userModal = document.getElementById("userModal");
const userForm = document.getElementById("userForm");
const userSignupFields = document.getElementById("userSignupFields");
const userLoginFields = document.getElementById("userLoginFields");
const userActiveBox = document.getElementById("userActiveBox");
const userPurpose = document.getElementById("ufPurpose");
const userSubscriptionFields = document.getElementById("ufSubscriptionFields");
const userModalTitle = document.getElementById("userModalTitle");
const userModalSub = document.getElementById("userModalSub");
const userSubmit = document.getElementById("userSubmit");
const userModeToggle = document.getElementById("userModeToggle");
const userLogout = document.getElementById("userLogout");

const uFields = {
  name: { input: document.getElementById("ufName"), err: document.getElementById("ufNameErr") },
  mobile: { input: document.getElementById("ufMobile"), err: document.getElementById("ufMobileErr") },
  email: { input: document.getElementById("ufEmail"), err: document.getElementById("ufEmailErr") },
  city: { input: document.getElementById("ufCity"), err: document.getElementById("ufCityErr") },
  pass: { input: document.getElementById("ufPass"), err: document.getElementById("ufPassErr") },
  pass2: { input: document.getElementById("ufPass2"), err: document.getElementById("ufPass2Err") },
  subscriptionCategory: { input: document.getElementById("ufSubscriptionCategory"), err: document.getElementById("ufSubscriptionCategoryErr") },
  subscriptionPlan: { input: document.getElementById("ufSubscriptionPlan"), err: document.getElementById("ufSubscriptionPlanErr") },
  payerMobile: { input: document.getElementById("ufPayerMobile"), err: document.getElementById("ufPayerMobileErr") },
  paymentReference: { input: document.getElementById("ufPaymentReference"), err: document.getElementById("ufPaymentReferenceErr") },
  loginMobile: { input: document.getElementById("ufLoginMobile"), err: document.getElementById("ufLoginMobileErr") },
  loginPass: { input: document.getElementById("ufLoginPass"), err: document.getElementById("ufLoginPassErr") },
};

let userModalMode = "signup"; // "signup" | "login" | "active"
const USER_SUBSCRIPTION_PLANS = {
  "1-month": { months: 1, amount: 2000 },
  "3-month": { months: 3, amount: 6000 },
  "1-year": { months: 12, amount: 20000 }
};

if (userPurpose && userSubscriptionFields) {
  userPurpose.addEventListener("change", () => {
    const requestsSubscription = userPurpose.value === "subscription";
    userSubscriptionFields.hidden = !requestsSubscription;
    userSubmit.textContent = requestsSubscription ? "Create Account & Submit Request" : "Create Account";
    ["subscriptionCategory", "subscriptionPlan", "payerMobile", "paymentReference"].forEach((key) => setUserError(uFields[key], ""));
  });
}

// Show / hide password
const setUserPassVisibility = (show, isLogin = false) => {
  const ids = isLogin ? ["ufLoginPass"] : ["ufPass", "ufPass2"];
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.type = "text";
  });
};

const setUserError = (f, msg) => {
  if (!f || !f.err) return;
  f.err.textContent = msg || "";
  if (f.input) f.input.classList.toggle("invalid", !!msg);
};

const getBmsTrial = () => {
  try {
    const raw = localStorage.getItem("bms_user_trial") || localStorage.getItem("oms_trial_account");
    if (!raw) return null;
    const t = JSON.parse(raw);
    if (!t || !t.expiresAt) return null;
    const now = Date.now();
    const expires = typeof t.expiresAt === "number" ? t.expiresAt : new Date(t.expiresAt).getTime();
    const msLeft = expires - now;
    const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
    const hoursLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60)));
    return { ...t, isActive: msLeft > 0, daysLeft, hoursLeft, expiresAt: expires };
  } catch (_) {
    return null;
  }
};

const setBmsTrial = (userData) => {
  const trial = {
    name: userData.name || "Business User",
    mobile: userData.mobile || "",
    email: userData.email || "",
    city: userData.city || "",
    startedAt: Date.now(),
    expiresAt: Date.now() + 5 * 24 * 60 * 60 * 1000,
    plan: "5_day_free_trial",
    status: "active"
  };
  localStorage.setItem("bms_user_trial", JSON.stringify(trial));
  localStorage.setItem("oms_trial_account", JSON.stringify(trial));
  refreshUserSignupButton();
  return trial;
};

const refreshUserSignupButton = () => {
  const btn = document.getElementById("userSignupHeaderBtn");
  if (!btn) return;
  const trial = getBmsTrial();
  const user = currentUser;

  if (user || (trial && trial.isActive)) {
    const rawName = user?.user_metadata?.name || trial?.name || "Business Owner";
    const initial = (rawName.charAt(0) || "U").toUpperCase();
    const uid = trial?.uid || (user ? `UID-${user.id.slice(0, 5).toUpperCase()}` : "UID-84920");
    const firstName = rawName.split(" ")[0];
    const avatar = trial?.avatar || "";

    btn.className = "header-user-profile-btn";
    btn.innerHTML = `
      <span class="user-avatar-badge ${avatar ? 'has-img' : ''}">
        ${avatar ? `<img src="${avatar}" alt="${rawName}" class="user-avatar-img" />` : initial}
      </span>
      <div class="user-meta-text">
        <span class="user-id-title">${rawName}</span>
        <span class="user-id-code">${uid}</span>
      </div>
      <span class="user-dropdown-arrow">&#9662;</span>
    `;
    btn.title = `Signed in: ${rawName} (${uid}) - Click to manage account`;
  } else {
    btn.className = "btn btn-primary header-signup-btn";
    btn.innerHTML = `<span>Sign Up Free</span>`;
    btn.title = "Create an account or sign in";
  }
};

const getRegisteredUsers = () => {
  try {
    const raw = localStorage.getItem("oms_registered_users");
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
};

const saveRegisteredUser = (userObj) => {
  try {
    const users = getRegisteredUsers();
    const cleanId = (userObj.email || userObj.mobile || "").toLowerCase();
    const idx = users.findIndex(u => {
      if (userObj.email && u.email && u.email.toLowerCase() === userObj.email.toLowerCase()) return true;
      if (userObj.mobile && u.mobile && u.mobile.replace(/\D/g, "") === userObj.mobile.replace(/\D/g, "")) return true;
      return false;
    });
    if (idx >= 0) {
      users[idx] = { ...users[idx], ...userObj };
    } else {
      users.push(userObj);
    }
    localStorage.setItem("oms_registered_users", JSON.stringify(users));
  } catch (err) {
    console.warn("User save err:", err);
  }
};

const openUserModal = (mode) => {
  const trial = getBmsTrial();
  const hasAccount = !!currentUser || !!trial;
  userModalMode = mode || (hasAccount ? "active" : "signup");
  Object.values(uFields).forEach((f) => setUserError(f, ""));

  const signupCardView = document.getElementById("signupCardView");
  const signupStepMain = document.getElementById("signupStepMain");
  const signupStepLogin = document.getElementById("signupStepLogin");
  const modalIcon = document.getElementById("userModalIcon") || document.querySelector("#userModal .modal-icon");
  const userModalTitle = document.getElementById("userModalTitle");
  const userModalSub = document.getElementById("userModalSub");
  const authMessage = document.getElementById("authMessage");
  const loginAuthMessage = document.getElementById("loginAuthMessage");

  if (authMessage) {
    authMessage.textContent = "";
    authMessage.classList.remove("is-visible");
  }
  if (loginAuthMessage) {
    loginAuthMessage.textContent = "";
    loginAuthMessage.classList.remove("is-visible");
  }

  if (userModalMode === "active" && hasAccount) {
    if (signupCardView) signupCardView.hidden = true;
    if (userModalTitle) userModalTitle.style.display = "none";
    if (userModalSub) userModalSub.style.display = "none";
    if (modalIcon) modalIcon.style.display = "none";

    if (userActiveBox) userActiveBox.hidden = false;
    if (userForm) userForm.hidden = true;
    renderUserActiveProfile("overview");
  } else if (userModalMode === "login") {
    if (signupCardView) {
      signupCardView.hidden = false;
      if (signupStepMain) signupStepMain.style.display = "none";
      if (signupStepLogin) signupStepLogin.style.display = "block";
    }
    if (userActiveBox) userActiveBox.hidden = true;
    if (userForm) userForm.hidden = true;
    if (userModalTitle) userModalTitle.style.display = "none";
    if (userModalSub) userModalSub.style.display = "none";
    if (modalIcon) modalIcon.style.display = "none";

    const loginIdInput = document.getElementById("loginIdentifier");
    if (loginIdInput) setTimeout(() => loginIdInput.focus(), 60);
  } else {
    // Show the NEW sign-up card
    if (signupCardView) {
      signupCardView.hidden = false;
      if (signupStepMain) signupStepMain.style.display = "block";
      if (signupStepLogin) signupStepLogin.style.display = "none";
    }
    if (userActiveBox) userActiveBox.hidden = true;
    if (userForm) userForm.hidden = true;
    if (userModalTitle) userModalTitle.style.display = "none";
    if (userModalSub) userModalSub.style.display = "none";
    if (modalIcon) modalIcon.style.display = "none";
  }

  userModal.classList.add("open");
  userModal.setAttribute("aria-hidden", "false");
  if (typeof renderReviews === "function") renderReviews();
};

const closeUserModal = () => {
  userModal.classList.remove("open");
  userModal.setAttribute("aria-hidden", "true");
};

if (userModeToggle) {
  userModeToggle.addEventListener("click", (e) => {
    e.preventDefault();
    openUserModal(userModalMode === "login" ? "signup" : "login");
  });
}

const toggleToPasswordLogin = document.getElementById("toggleToPasswordLogin");
if (toggleToPasswordLogin) {
  toggleToPasswordLogin.addEventListener("click", (e) => {
    e.preventDefault();
    openUserModal("login");
  });
}

const toggleToCreateAccount = document.getElementById("toggleToCreateAccount");
if (toggleToCreateAccount) {
  toggleToCreateAccount.addEventListener("click", (e) => {
    e.preventDefault();
    openUserModal("signup");
  });
}

// Password toggle helpers
const toggleSignupPass = document.getElementById("toggleSignupPass");
if (toggleSignupPass) {
  toggleSignupPass.addEventListener("click", () => {
    const passInput = document.getElementById("signupPassword");
    if (!passInput) return;
    const isPass = passInput.type === "password";
    passInput.type = isPass ? "text" : "password";
    toggleSignupPass.textContent = isPass ? "🙈" : "👁️";
  });
}

const toggleLoginPass = document.getElementById("toggleLoginPass");
if (toggleLoginPass) {
  toggleLoginPass.addEventListener("click", () => {
    const passInput = document.getElementById("loginPassword");
    if (!passInput) return;
    const isPass = passInput.type === "password";
    passInput.type = isPass ? "text" : "password";
    toggleLoginPass.textContent = isPass ? "🙈" : "👁️";
  });
}

// Country Code Picker sync
const countryCodeSelect = document.getElementById("countryCode");
if (countryCodeSelect) {
  countryCodeSelect.addEventListener("change", () => {
    const selected = countryCodeSelect.options[countryCodeSelect.selectedIndex];
    if (!selected) return;
    const flag = selected.getAttribute("data-flag") || "🌐";
    const code = selected.getAttribute("data-code") || selected.value;
    const flagDisplay = document.getElementById("countryFlagDisplay");
    const codeDisplay = document.getElementById("countryCodeDisplay");
    if (flagDisplay) flagDisplay.textContent = flag;
    if (codeDisplay) codeDisplay.textContent = code;
  });
}

// Sign up Account Form
const signupAccountForm = document.getElementById("signupAccountForm");
if (signupAccountForm) {
  signupAccountForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const emailInput = document.getElementById("signupEmail");
    const phoneInput = document.getElementById("phoneNumber");
    const passInput = document.getElementById("signupPassword");
    const authMessage = document.getElementById("authMessage");

    const email = emailInput ? emailInput.value.trim().toLowerCase() : "";
    const rawPhone = phoneInput ? phoneInput.value.trim() : "";
    const pass = passInput ? passInput.value.trim() : "";

    if (!email && !rawPhone) {
      if (authMessage) {
        authMessage.textContent = "Please enter either your Gmail or Mobile number.";
        authMessage.classList.add("is-visible");
      }
      if (emailInput) emailInput.focus();
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email)) {
      if (authMessage) {
        authMessage.textContent = "Please enter a valid Gmail / Email address.";
        authMessage.classList.add("is-visible");
      }
      if (emailInput) emailInput.focus();
      return;
    }

    let fullPhone = "";
    if (rawPhone) {
      const digits = rawPhone.replace(/\D/g, "");
      if (digits.length < 6 || digits.length > 15) {
        if (authMessage) {
          authMessage.textContent = "Please enter a valid mobile number.";
          authMessage.classList.add("is-visible");
        }
        if (phoneInput) phoneInput.focus();
        return;
      }
      const cCodeSelect = document.getElementById("countryCode");
      const cCode = cCodeSelect ? cCodeSelect.value : "+92";
      const cleanNumber = rawPhone.replace(/^0+/, "");
      fullPhone = rawPhone.startsWith("+") ? rawPhone : `${cCode} ${cleanNumber}`;
    }

    if (!pass || pass.length < 4) {
      if (authMessage) {
        authMessage.textContent = "Please create a password of at least 4 characters.";
        authMessage.classList.add("is-visible");
      }
      if (passInput) passInput.focus();
      return;
    }

    const userName = email ? email.split("@")[0] : (fullPhone ? `User ${fullPhone.slice(-4)}` : "Business User");
    const newUser = {
      id: "u_" + Date.now(),
      name: userName,
      email: email,
      mobile: fullPhone,
      password: pass,
      createdAt: Date.now()
    };
    saveRegisteredUser(newUser);

    setBmsTrial({
      name: userName,
      email: email,
      mobile: fullPhone,
      password: pass
    });

    showToast(`🎉 Account created successfully! Welcome, ${userName}.`);
    openUserModal("active");
  });
}

// Login Account Form
const loginAccountForm = document.getElementById("loginAccountForm");
if (loginAccountForm) {
  loginAccountForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const identifierInput = document.getElementById("loginIdentifier");
    const passInput = document.getElementById("loginPassword");
    const loginAuthMessage = document.getElementById("loginAuthMessage");

    const identifier = identifierInput ? identifierInput.value.trim() : "";
    const pass = passInput ? passInput.value.trim() : "";

    if (!identifier) {
      if (loginAuthMessage) {
        loginAuthMessage.textContent = "Please enter your Gmail or Mobile number.";
        loginAuthMessage.classList.add("is-visible");
      }
      if (identifierInput) identifierInput.focus();
      return;
    }

    if (!pass) {
      if (loginAuthMessage) {
        loginAuthMessage.textContent = "Please enter your password.";
        loginAuthMessage.classList.add("is-visible");
      }
      if (passInput) passInput.focus();
      return;
    }

    const users = getRegisteredUsers();
    const idLower = identifier.toLowerCase();
    const idDigits = identifier.replace(/\D/g, "");
    const idClean = idDigits.replace(/^0+/, "");

    const matchPhone = (storedPhone) => {
      if (!storedPhone || !idClean) return false;
      const sDigits = String(storedPhone).replace(/\D/g, "");
      const sClean = sDigits.replace(/^0+/, "");
      if (sClean === idClean) return true;
      if (sClean.length >= 7 && idClean.length >= 7) {
        if (sClean.endsWith(idClean) || idClean.endsWith(sClean)) return true;
      }
      return false;
    };

    let matchedUser = users.find(u => {
      const uEmail = (u.email || "").toLowerCase();
      if (uEmail && uEmail === idLower) return true;
      if (matchPhone(u.mobile)) return true;
      return false;
    });

    if (!matchedUser) {
      const trial = getBmsTrial();
      if (trial) {
        const tEmail = (trial.email || "").toLowerCase();
        if ((tEmail && tEmail === idLower) || matchPhone(trial.mobile)) {
          matchedUser = trial;
        }
      }
    }

    if (!matchedUser) {
      if (loginAuthMessage) {
        loginAuthMessage.textContent = "No registered account found with this Gmail or mobile number.";
        loginAuthMessage.classList.add("is-visible");
      }
      return;
    }

    if (matchedUser.password && matchedUser.password !== pass) {
      if (loginAuthMessage) {
        loginAuthMessage.textContent = "Incorrect password. Please try again.";
        loginAuthMessage.classList.add("is-visible");
      }
      if (passInput) passInput.focus();
      return;
    }

    setBmsTrial({
      name: matchedUser.name || "Business User",
      email: matchedUser.email || "",
      mobile: matchedUser.mobile || "",
      password: pass
    });

    showToast(`Welcome back, ${matchedUser.name || 'User'}! Logged in successfully.`);
    openUserModal("active");
  });
}

// Clear error messages on input
["signupEmail", "phoneNumber", "signupPassword"].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener("input", () => {
      const authMessage = document.getElementById("authMessage");
      if (authMessage && authMessage.classList.contains("is-visible")) {
        authMessage.textContent = "";
        authMessage.classList.remove("is-visible");
      }
    });
  }
});

["loginIdentifier", "loginPassword"].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener("input", () => {
      const loginAuthMessage = document.getElementById("loginAuthMessage");
      if (loginAuthMessage && loginAuthMessage.classList.contains("is-visible")) {
        loginAuthMessage.textContent = "";
        loginAuthMessage.classList.remove("is-visible");
      }
    });
  }
});

const openTermsLink = document.getElementById("openTermsLink");
const openPrivacyLink = document.getElementById("openPrivacyLink");
const globalPrivacyModal = document.getElementById("globalPrivacyModal");
if (openTermsLink && globalPrivacyModal) {
  openTermsLink.addEventListener("click", (e) => {
    e.preventDefault();
    globalPrivacyModal.classList.add("open");
    globalPrivacyModal.setAttribute("aria-hidden", "false");
  });
}
if (openPrivacyLink && globalPrivacyModal) {
  openPrivacyLink.addEventListener("click", (e) => {
    e.preventDefault();
    globalPrivacyModal.classList.add("open");
    globalPrivacyModal.setAttribute("aria-hidden", "false");
  });
}

const phoneInputField = document.getElementById("phoneNumber");
if (phoneInputField) {
  phoneInputField.addEventListener("input", () => {
    const authMessage = document.getElementById("authMessage");
    if (authMessage && authMessage.classList.contains("is-visible")) {
      authMessage.textContent = "";
      authMessage.classList.remove("is-visible");
    }
  });
}

const userShowPass = document.getElementById("ufShowPass");
if (userShowPass) {
  userShowPass.addEventListener("change", () => setUserPassVisibility(userShowPass.checked));
}
const userShowPassLogin = document.getElementById("ufShowPassLogin");
if (userShowPassLogin) {
  userShowPassLogin.addEventListener("change", () => setUserPassVisibility(userShowPassLogin.checked, true));
}

if (userLogout) {
  userLogout.addEventListener("click", async () => {
    userLogout.disabled = true;
    try {
      localStorage.removeItem("bms_user_trial");
      localStorage.removeItem("oms_trial_account");
      if (sb) await signOutSiteAccount();
      currentUser = null;
      refreshUserSignupButton();
      closeUserModal();
      showToast("Logged out successfully.");
    } catch (error) {
      localStorage.removeItem("bms_user_trial");
      localStorage.removeItem("oms_trial_account");
      currentUser = null;
      refreshUserSignupButton();
      closeUserModal();
      showToast("Logged out.");
    } finally {
      userLogout.disabled = false;
    }
  });
}

document.getElementById("userModalClose").addEventListener("click", closeUserModal);
userModal.addEventListener("click", (e) => { if (e.target === userModal) closeUserModal(); });

if (userForm) {
  userForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    userSubmit.disabled = true;

    try {
      if (userModalMode === "signup") {
        const name = String(uFields.name.input?.value || "").trim();
        const uCode = document.getElementById("ufCountryCode")?.value || "+92";
        const mobile = combinePhoneWithCode(uCode, uFields.mobile.input?.value || "");
        const email = String(uFields.email.input?.value || "").trim().toLowerCase() || `${mobile}@oms.app`;
        const city = String(uFields.city.input?.value || "").trim();
        const pass = String(uFields.pass.input?.value || "");
        const termsBox = document.getElementById("ufTerms");
        let ok = true;

        if (name.length < 3) { setUserError(uFields.name, "Enter your full name (min 3 letters)."); ok = false; }
        else setUserError(uFields.name, "");
        if (!EMAIL_RE.test(email)) { setUserError(uFields.email, "Enter a valid email address."); ok = false; }
        else setUserError(uFields.email, "");
        if (!MOBILE_RE.test(mobile)) { setUserError(uFields.mobile, "Enter a valid mobile number."); ok = false; }
        else setUserError(uFields.mobile, "");
        if (city.length < 2) { setUserError(uFields.city, "Enter your city."); ok = false; }
        else setUserError(uFields.city, "");
        if (pass.length < 8) { setUserError(uFields.pass, "Create a password of at least 8 characters."); ok = false; }
        else setUserError(uFields.pass, "");

        if (termsBox && !termsBox.checked) {
          userSubmit.disabled = false;
          showToast("Please agree to the Terms of Use and Privacy Policy.", true);
          return;
        }

        if (!ok) { showToast("Please fix the highlighted fields.", true); return; }

        setBmsTrial({ name, mobile, email, city });

        if (sb) {
          try {
            const authUser = await createOrResumeAuthAccount(mobile, pass, { name, mobile });
            await sb.from("customer_profiles").upsert({
              user_id: authUser.id,
              full_name: name,
              mobile: profileMobile(mobile),
              email,
              city
            }, { onConflict: "user_id" });
            await refreshAccountProfiles(authUser);
          } catch (cloudErr) {
            console.warn("Cloud auth sync note (trial active locally):", cloudErr);
          }
        }

        closeUserModal();
        refreshUserSignupButton();
        showToast(`🎉 Welcome, ${name}! Your 5-day free trial has started. Enjoy all 8 categories!`);
        return;
      }

      const uLoginCode = document.getElementById("ufLoginCountryCode")?.value || "+92";
      const mobile = combinePhoneWithCode(uLoginCode, uFields.loginMobile.input.value);
      const pass = String(uFields.loginPass.input.value || "");
      if (!MOBILE_RE.test(mobile)) {
        setUserError(uFields.loginMobile, "Enter a valid mobile number.");
        showToast("Login failed: invalid mobile number.", true);
        return;
      }
      if (!pass) {
        setUserError(uFields.loginPass, "Enter your password.");
        showToast("Login failed: password required.", true);
        return;
      }

      if (sb) {
        try {
          const authUser = await signInWithMobile(mobile, pass);
          await refreshAccountProfiles(authUser);
        } catch (cloudErr) {
          console.warn("Cloud sign-in fallback:", cloudErr);
        }
      }

      let trial = getBmsTrial();
      if (!trial) {
        trial = setBmsTrial({ mobile, name: currentUser?.name || "Business User" });
      }

      setUserError(uFields.loginMobile, "");
      setUserError(uFields.loginPass, "");
      closeUserModal();
      refreshUserSignupButton();
      showToast(`Logged in successfully. Welcome back, ${currentUser?.name || trial.name || 'User'}!`);
    } catch (error) {
      const message = error.message || "Account request failed. Please try again.";
      if (userModalMode === "signup") {
        if (/mobile|already registered|duplicate key/i.test(message)) setUserError(uFields.mobile, message);
        else if (/email/i.test(message)) setUserError(uFields.email, message);
        else setUserError(uFields.pass, message);
      } else {
        setUserError(uFields.loginPass, message);
      }
      showToast(message, true);
    } finally {
      userSubmit.disabled = false;
    }
  });
}

const refreshOwnerButton = () => {
  if (ownerBtn) ownerBtn.textContent = owner ? "Owner Account" : "Owner Sign Up";
};

const ownerAllowedCats = (o) =>
  Array.isArray(o && o.categories) ? o.categories : (o && o.category ? [o.category] : []);

const applyAccess = () => {
  document.querySelectorAll(".industry-card").forEach((card) => {
    card.querySelector(".card-remove")?.remove();
    if (ceoMode) {
      card.classList.remove("locked");
      card.classList.remove("allowed");
    } else {
      const isAllowed = owner && ownerAllowedCats(owner).includes(card.dataset.detail);
      card.classList.toggle("locked", !!owner && !isAllowed);
      card.classList.toggle("allowed", !!isAllowed);
    }
  });
  document.querySelectorAll(".category-detail .detail-admin-btn").forEach((btn) => {
    const key = btn.closest(".category-detail").id.replace(/Detail$/, "");
    btn.hidden = !(ceoMode || !owner || ownerAllowedCats(owner).includes(key));
  });
};

const validateSignup = () => {
  let ok = true;
  const name = fields.name.input.value.trim();
  const ofCode = document.getElementById("ofCountryCode")?.value || "+92";
  const mobile = combinePhoneWithCode(ofCode, fields.mobile.input.value);
  const age = fields.age.input.value.trim();
  const city = fields.city.input.value.trim();
  const category = fields.category.input.value;
  const pass = fields.pass.input.value;

  if (name.length < 3) { setError(fields.name, "Enter your full name (min 3 letters)."); ok = false; } else setError(fields.name, "");
  if (!MOBILE_RE.test(mobile)) { setError(fields.mobile, "Enter a valid mobile number."); ok = false; } else setError(fields.mobile, "");
  const ageNum = Number(age);
  if (!age || !Number.isInteger(ageNum) || ageNum < 18 || ageNum > 100) { setError(fields.age, "Age must be between 18 and 100."); ok = false; } else setError(fields.age, "");
  if (city.length < 2) { setError(fields.city, "Enter your city."); ok = false; } else setError(fields.city, "");
  if (!category) { setError(fields.category, "Select one category: you will only get access to it."); ok = false; } else setError(fields.category, "");
  if (pass.length < 8) { setError(fields.pass, "Choose a password (min 8 characters)."); ok = false; } else setError(fields.pass, "");

  if (!ok) return null;
  return { name, mobile, age: ageNum, city, category, pass };
};

if (ownerModeToggle) {
  ownerModeToggle.addEventListener("click", (e) => {
    e.preventDefault();
    openOwnerModal(ownerModalMode === "signup" ? "login" : "signup");
  });
}

if (ownerSwitchAccount) {
  ownerSwitchAccount.addEventListener("click", () => openOwnerModal("login"));
}

if (ownerGoCategory) {
  ownerGoCategory.addEventListener("click", () => {
    closeOwnerModal();
    const cat = owner && (owner.category || (owner.categories && owner.categories[0]));
    if (!cat) return;
    const card = document.querySelector(`.industry-card[data-detail="${cat}"]`);
    if (card) card.click();
  });
}

if (ownerLogout) {
  ownerLogout.addEventListener("click", async () => {
    ownerLogout.disabled = true;
    try {
      await signOutSiteAccount();
      closeOwnerModal();
      showToast("Logged out of owner account.");
    } catch (error) {
      showToast(`Logout failed: ${error.message || "Cloud service error."}`, true);
    } finally {
      ownerLogout.disabled = false;
    }
  });
}

if (ownerBtn) ownerBtn.addEventListener("click", () => openOwnerModal(owner ? "active" : "signup"));

document.getElementById("ownerModalClose").addEventListener("click", closeOwnerModal);
ownerModal.addEventListener("click", (e) => { if (e.target === ownerModal) closeOwnerModal(); });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && ownerModal.classList.contains("open")) closeOwnerModal();
});

ownerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!sb) {
    showToast("Account service is unavailable. Check your connection and try again.", true);
    return;
  }
  ownerSubmit.disabled = true;

  try {
    if (ownerModalMode === "signup") {
      const data = await validateSignup();
      if (!data) { showToast("Signup failed: please fix the fields.", true); return; }
      const authUser = await createOrResumeAuthAccount(data.mobile, data.pass, { name: data.name, mobile: data.mobile });
      const { error } = await sb.from("owner_profiles").insert({
        user_id: authUser.id,
        full_name: data.name,
        mobile: profileMobile(data.mobile),
        age: data.age,
        city: data.city,
        categories: [data.category]
      });
      if (error && !/duplicate key|already exists/i.test(error.message || "")) throw error;
      const profiles = await refreshAccountProfiles(authUser);
      if (!profiles.owner) throw new Error("Account was created but its owner profile could not be loaded. Please sign in again.");
      closeOwnerModal();
      showToast(`Welcome, ${owner.name}! Select your paid category plan to unlock its tools.`);
      return;
    }

    const ofLoginCode = document.getElementById("ofLoginCountryCode")?.value || "+92";
    const mobile = combinePhoneWithCode(ofLoginCode, fields.loginMobile.input.value);
    const pass = fields.loginPass.input.value;
    if (!MOBILE_RE.test(mobile)) {
      setError(fields.loginMobile, "Enter a valid mobile number.");
      showToast("Login failed: invalid mobile number.", true);
      return;
    }
    if (!pass) {
      setError(fields.loginPass, "Enter your password.");
      showToast("Login failed: password required.", true);
      return;
    }
    const authUser = await signInWithMobile(mobile, pass);
    const profiles = await refreshAccountProfiles(authUser);
    if (!profiles.owner) throw new Error("No owner profile found. Choose Sign Up and use the same mobile and password to finish setup.");
    setError(fields.loginMobile, "");
    setError(fields.loginPass, "");
    closeOwnerModal();
    showToast(`Logged in: welcome back, ${owner.name}!`);
  } catch (error) {
    const message = error.message || "Owner account request failed.";
    if (ownerModalMode === "signup") {
      if (/mobile|already registered|duplicate key/i.test(message)) setError(fields.mobile, message);
      else if (/age/i.test(message)) setError(fields.age, message);
      else if (/city/i.test(message)) setError(fields.city, message);
      else setError(fields.pass, message);
    } else {
      setError(fields.loginPass, message);
    }
    showToast(message, true);
  } finally {
    ownerSubmit.disabled = false;
  }
});

function labelFor(key) {
  const card = document.querySelector(`.industry-card[data-detail="${key}"]`);
  return card ? card.querySelector("h3").textContent : key;
}
