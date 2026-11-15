// ============================================================
// Home page - 07-user-accounts.js
// Site user records, trial state and account profiles.
// Split from the original script.js during the 2026-11 refactor.
// Loaded in numeric order by the page HTML. Keep that order.
// ============================================================

// ===== User accounts (for reviews & comments) =====
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
const accountEmail = (mobile) => cloudEmail(mobile);
let currentUser = null;
let owner = null;
let accountAuthUser = null;
let cloudOwnerProfiles = null;

const getAccountProfiles = async (authUser) => {
  if (!sb || !authUser) return { customer: null, owner: null };
  const [customerResult, ownerResult] = await Promise.all([
    sb.from("customer_profiles").select("user_id,full_name,mobile,email,city").eq("user_id", authUser.id).maybeSingle(),
    sb.from("owner_profiles").select("user_id,full_name,mobile,age,city,categories").eq("user_id", authUser.id).maybeSingle()
  ]);
  if (customerResult.error) throw customerResult.error;
  if (ownerResult.error) throw ownerResult.error;
  const customer = customerResult.data ? {
    id: customerResult.data.user_id,
    name: customerResult.data.full_name,
    mobile: customerResult.data.mobile,
    email: customerResult.data.email,
    city: customerResult.data.city
  } : null;
  const ownerProfile = ownerResult.data ? {
    id: ownerResult.data.user_id,
    name: ownerResult.data.full_name,
    mobile: ownerResult.data.mobile,
    age: ownerResult.data.age,
    city: ownerResult.data.city,
    categories: ownerResult.data.categories,
    category: ownerResult.data.categories[0]
  } : null;
  return { customer, owner: ownerProfile };
};

const refreshAccountProfiles = async (authUser) => {
  accountAuthUser = authUser || null;
  const profiles = await getAccountProfiles(accountAuthUser);
  currentUser = profiles.customer;
  owner = profiles.owner;
  refreshOwnerButton();
  if (typeof refreshUserSignupButton === "function") refreshUserSignupButton();
  applyAccess();
  if (typeof renderReviews === "function") await renderReviews();
  return profiles;
};

const resetClientIdentityForAuthChange = () => {
  cloudUser = null;
  cloudPending.clear();
  cloudOwnerProfiles = null;
  accountAuthUser = null;
  currentUser = null;
  owner = null;
  setCeoSession(false);
  refreshOwnerButton();
  if (typeof refreshUserSignupButton === "function") refreshUserSignupButton();
  applyAccess();
};

const signOutSiteAccount = async () => {
  if (!sb) throw new Error("Cloud account service is unavailable.");
  const { error } = await sb.auth.signOut();
  if (error) throw error;
  resetClientIdentityForAuthChange();
  if (typeof renderReviews === "function") await renderReviews();
};

const signInWithMobile = async (mobile, password) => {
  if (!sb) throw new Error("Account service is unavailable. Check your connection and try again.");
  const { data, error } = await sb.auth.signInWithPassword({
    email: accountEmail(mobile),
    password
  });
  if (error) throw error;
  if (!data.user || !data.session) {
    throw new Error("Email confirmation is enabled. The site administrator must disable it before accounts can sign in.");
  }
  await ensureCurrentAccountActive(data.user);
  cloudPending.clear();
  resetClientIdentityForAuthChange();
  return data.user;
};

const createOrResumeAuthAccount = async (mobile, password, metadata) => {
  if (!sb) throw new Error("Account service is unavailable. Check your connection and try again.");
  const { data, error } = await sb.auth.signUp({
    email: accountEmail(mobile),
    password,
    options: { data: metadata }
  });
  if (!error && data.user && data.session) {
    cloudPending.clear();
    resetClientIdentityForAuthChange();
    return data.user;
  }
  if (!error && data.user && !data.session) {
    throw new Error("Email confirmation is enabled. The site administrator must disable it before accounts can be created.");
  }
  if (error && /already registered|already been registered/i.test(error.message || "")) {
    return signInWithMobile(mobile, password);
  }
  throw error || new Error("Account creation did not complete.");
};


const setError = (f, msg) => {
  if (!f) return;
  if (f.err) f.err.textContent = msg || "";
  if (f.input) f.input.classList.toggle("invalid", !!msg);
};

const ownerActiveBox = document.getElementById("ownerActiveBox");
const ownerActiveName = document.getElementById("ownerActiveName");
const ownerActiveMobile = document.getElementById("ownerActiveMobile");
const ownerActiveCategory = document.getElementById("ownerActiveCategory");
const ownerModeToggle = document.getElementById("ownerModeToggle");
const ownerLogout = document.getElementById("ownerLogout");
const ownerGoCategory = document.getElementById("ownerGoCategory");
const ownerSwitchAccount = document.getElementById("ownerSwitchAccount");

let ownerModalMode = "signup"; // "signup" | "login" | "active"

const openOwnerModal = (mode) => {
  ownerModalMode = mode || (owner ? "active" : "signup");
  Object.values(fields).forEach((f) => setError(f, ""));

  if (ownerModalMode === "active" && owner) {
    ownerModalTitle.textContent = "My Owner Account";
    ownerModalSub.textContent = "You are currently signed in as an Owner.";
    if (ownerActiveBox) ownerActiveBox.hidden = false;
    ownerForm.hidden = true;
    const loginPassField = document.getElementById("loginPassField");
    if (loginPassField) loginPassField.hidden = true;
    if (ownerActiveName) ownerActiveName.textContent = owner.name || "Owner";
    if (ownerActiveMobile) ownerActiveMobile.textContent = owner.mobile || "N/A";
    const allowed = ownerAllowedCats(owner);
    if (ownerActiveCategory) ownerActiveCategory.textContent = allowed.map(labelFor).join(", ") || labelFor(owner.category) || "N/A";
  } else {
    const isSignup = ownerModalMode === "signup";
    ownerModalTitle.textContent = isSignup ? "Owner Sign Up" : "Owner Login";
    ownerModalSub.textContent = isSignup
      ? "Create your owner account and choose your business category."
      : "Enter your registered mobile number and password to log in.";
    if (ownerActiveBox) ownerActiveBox.hidden = true;
    ownerForm.hidden = false;
    signupFields.hidden = !isSignup;
    loginField.hidden = isSignup;
    const loginPassFieldEl = document.getElementById("loginPassField");
    if (loginPassFieldEl) loginPassFieldEl.hidden = isSignup;
    ownerSubmit.textContent = isSignup ? "Create Owner Account" : "Login";
    if (ownerModeToggle) {
      ownerModeToggle.textContent = isSignup ? "Already registered? Login here" : "Need a new account? Sign Up here";
    }
    ownerForm.reset();
  }

  ownerModal.classList.add("open");
  ownerModal.setAttribute("aria-hidden", "false");
};

const closeOwnerModal = () => {
  ownerModal.classList.remove("open");
  ownerModal.setAttribute("aria-hidden", "true");
};
