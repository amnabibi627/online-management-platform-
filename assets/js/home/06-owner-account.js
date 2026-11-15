// ============================================================
// Home page - 06-owner-account.js
// Owner account helpers connecting owners to categories.
// Split from the original script.js during the 2026-11 refactor.
// Loaded in numeric order by the page HTML. Keep that order.
// ============================================================

// ===== Owner Account: Sign Up / Login connected with categories =====
const normMobile = (v) => String(v || "").trim().replace(/[\s\-\(\)\.]/g, "").replace(/^\+/, "");
const MOBILE_RE = /^\d{7,16}$/;
// Supabase profile tables store Pakistani numbers in local form (03xxxxxxxxx),
// while Auth uses the international digits (923xxxxxxxxx). Convert only at the
// profile-write boundary so sign-in and profile storage stay compatible.
const profileMobile = (v) => {
  const digits = normMobile(v).replace(/\D/g, "");
  if (digits.startsWith("92") && digits.length === 12) return "0" + digits.slice(2);
  return digits;
};
const ownerModal = document.getElementById("ownerModal");
const ownerForm = document.getElementById("ownerForm");
const ownerModalTitle = document.getElementById("ownerModalTitle");
const ownerModalSub = document.getElementById("ownerModalSub");
const signupFields = document.getElementById("signupFields");
const loginField = document.getElementById("loginField");
const ownerSubmit = document.getElementById("ownerSubmit");
const ownerBtn = document.querySelector(".portal-btn[data-portal='owner'], [data-portal='owner'] .portal-btn");

const fields = {
  name: { input: document.getElementById("ofName"), err: document.getElementById("errName") },
  email: { input: document.getElementById("ofEmail"), err: document.getElementById("errEmail") },
  mobile: { input: document.getElementById("ofMobile"), err: document.getElementById("errMobile") },
  age: { input: document.getElementById("ofAge"), err: document.getElementById("errAge") },
  city: { input: document.getElementById("ofCity"), err: document.getElementById("errCity") },
  category: { input: document.getElementById("ofCategory"), err: document.getElementById("errCategory") },
  pass: { input: document.getElementById("ofPass"), err: document.getElementById("errPass") },
  loginMobile: { input: document.getElementById("ofLoginMobile"), err: document.getElementById("errLoginMobile") },
  loginPass: { input: document.getElementById("ofLoginPass"), err: document.getElementById("errLoginPass") },
};
