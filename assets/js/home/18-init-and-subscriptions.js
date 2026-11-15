// ============================================================
// Home page - 18-init-and-subscriptions.js
// Startup cleanup, cloud restore and subscription purchase modal.
// Split from the original script.js during the 2026-11 refactor.
// Loaded in numeric order by the page HTML. Keep that order.
// ============================================================

// ===== Init: apply saved removals, rebuild custom categories =====
// Core categories are permanent: strip any builtin keys out of removedKeys.
const sanitizeRemovedKeys = () => {
  const cleaned = (store.get("removedKeys", []) || []).filter((k) => !BUILTIN_CATEGORIES.includes(k));
  if (cleaned.length !== removedKeys.length) store.set("removedKeys", cleaned);
  removedKeys = cleaned;
  return cleaned;
};

const applyRemovedKeys = () => {
  sanitizeRemovedKeys().forEach((key) => {
    document.querySelector(`.industry-card[data-detail="${key}"]`)?.remove();
    document.getElementById(`${key}Detail`)?.remove();
  });
};

applyRemovedKeys();
customCats.forEach(buildCustomCategory);
restoreOwnerAvatar();

// Drop any saved copies of the old built-in posts.
const cleanupRetiredArticles = () => {
  RETIRED_ARTICLE_KEYS.forEach((k) => { try { localStorage.removeItem(k); } catch {} });
};
cleanupRetiredArticles();

refreshOwnerButton();
if (typeof refreshUserSignupButton === "function") refreshUserSignupButton();
applyAccess();
initFeatureModules();
updateFeatureBadges();

// ===== Cloud: restore session, pull saved data, refresh UI =====
(async () => {
  try {
    const signedIn = await cloudRestore();
    let authUser = null;
    if (sb) {
      const { data, error } = await sb.auth.getSession();
      if (error) throw error;
      authUser = data.session?.user || null;
    }
    await refreshAccountProfiles(authUser);
    if (ceoLoggedIn) await migrateLegacyReviews();
    await loadReviews();
    if (signedIn) {
      removedKeys = store.get("removedKeys", []);
      customCats = store.get("customCats", []);
      applyRemovedKeys();
      customCats.forEach(buildCustomCategory);
      refreshOwnerButton();
      applyAccess();
      initFeatureModules();
      updateFeatureBadges();
      updateCeoStats();
      restoreOwnerAvatar();
      if (ceoLoggedIn && ceoUser) showCeoPanel();
      showToast(`Cloud data synced: welcome back, ${ceoUser.name}!`);
    }
  } catch (e) {
    console.warn("Cloud init failed:", e);
    showToast(`Account or cloud data could not be restored: ${e.message || "Cloud service error."}`, true);
  }
})();

if (sb) {
  window.setInterval(() => {
    if (!accountAuthUser || ceoLoggedIn) return;
    ensureCurrentAccountActive(accountAuthUser).catch((error) => {
      showToast(`Account access could not be verified: ${error.message || "Cloud service error."}`, true);
    });
  }, 60000);

  sb.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      setTimeout(() => {
        ceoLogin.hidden = false;
        ceoPanel.hidden = true;
        ceoLoginForm.hidden = true;
        document.getElementById("ceoModeToggle").hidden = true;
        document.getElementById("ceoForgotPassword").hidden = true;
        document.getElementById("ceoPasswordRecoveryForm").hidden = false;
        document.getElementById("ceoLoginTitle").textContent = "Reset CEO Password";
        document.getElementById("ceoLoginSub").textContent = "Choose a new password for your CEO account.";
        ceoModal.classList.add("open");
        ceoModal.setAttribute("aria-hidden", "false");
      }, 0);
      return;
    }
    if (event === "SIGNED_IN" && session?.user?.id !== cloudUser?.id) {
      clearAdminConsoleCache();
      return;
    }
    if (event !== "SIGNED_OUT") return;
    setTimeout(() => {
      cloudUser = null;
      cloudOwnerProfiles = null;
      clearAdminConsoleCache();
      setCeoSession(false);
      refreshAccountProfiles(null).catch((error) => {
        showToast(`Account state could not be cleared: ${error.message || "Cloud service error."}`, true);
      });
    }, 0);
  });
}


// ===== SUBSCRIPTION PLANS PURCHASE MODAL LOGIC =====
const subscriptionModal = document.getElementById("subscriptionModal");
const subModalClose = document.getElementById("subModalClose");
const subCancelBtn = document.getElementById("subCancelBtn");
const subPurchaseForm = document.getElementById("subPurchaseForm");
const subSelectedPlanInput = document.getElementById("subSelectedPlan");
const subCategorySelect = document.getElementById("subCategorySelect");
const subAmountDue = document.getElementById("subAmountDue");
const subSubmitBtn = document.getElementById("subSubmitBtn");
const subPlanCards = document.querySelectorAll(".sub-plan-card");

const SUB_PRICES = {
  "1-month": { label: "1 Month", price: 2800, priceUsd: 10, months: 1 },
  "3-month": { label: "3 Month", price: 8400, priceUsd: 30, months: 3 },
  "6-month": { label: "6 Month", price: 16800, priceUsd: 60, months: 6 },
  "12-month": { label: "12 Month", price: 33600, priceUsd: 120, months: 12 }
};

const selectSubPlan = (planId) => {
  const p = SUB_PRICES[planId] || SUB_PRICES["3-month"];
  if (subSelectedPlanInput) subSelectedPlanInput.value = planId;
  const cards = document.querySelectorAll(".sub-plan-card");
  cards.forEach((c) => {
    c.classList.toggle("selected", c.dataset.subPlan === planId);
  });
  if (subAmountDue) subAmountDue.textContent = `$ ${p.priceUsd}`;
  if (subSubmitBtn) {
    subSubmitBtn.innerHTML = `
      <svg class="sub-btn-icon" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
      </svg>
      <span class="sub-btn-text">Submit Form &amp; Contact on WhatsApp ($ ${p.priceUsd})</span>
    `;
  }
};

subPlanCards.forEach((c) => {
  c.addEventListener("click", () => selectSubPlan(c.dataset.subPlan));
});

// Global Payment method tab switching in subscription modal
document.querySelectorAll(".sub-pay-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".sub-pay-tab").forEach(t => t.classList.remove("is-active"));
    tab.classList.add("is-active");
    const method = tab.dataset.payMethod;

    const iconEl = document.getElementById("subPayIcon");
    const titleEl = document.getElementById("subPayTitle");
    const descEl = document.getElementById("subPayDesc");
    const acctEl = document.getElementById("subPayAccount");

    if (method === "card") {
      if (iconEl) iconEl.textContent = "💳";
      if (titleEl) titleEl.textContent = "Credit / Debit Card & Online Checkout";
      if (descEl) descEl.textContent = "Pay securely worldwide using Visa, MasterCard, Amex, Apple Pay, Google Pay or PayPal.";
      if (acctEl) acctEl.textContent = "Global Online Card Terminal";
    } else if (method === "bank") {
      if (iconEl) iconEl.textContent = "🏦";
      if (titleEl) titleEl.textContent = "International Bank Wire / SWIFT / IBAN";
      if (descEl) descEl.textContent = "Direct wire transfer for international business and corporate clients.";
      if (acctEl) acctEl.textContent = "IBAN: PK92MEZN0001020304050607 / SWIFT: MEZNPKKA";
    } else {
      if (iconEl) iconEl.textContent = "📱";
      if (titleEl) titleEl.textContent = "Regional Mobile Wallet (JazzCash / Raast)";
      if (descEl) descEl.textContent = "Instant regional wallet transfer.";
      if (acctEl) acctEl.textContent = "0304 295 4627 (Amna Bibi)";
    }
  });
});

const openSubscriptionModal = (categoryKey = "", planId = "3-month") => {
  if (!subscriptionModal) return;
  selectSubPlan(planId);
  if (categoryKey && subCategorySelect) {
    subCategorySelect.value = categoryKey;
  }
  subscriptionModal.classList.add("open");
  subscriptionModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
};

const closeSubscriptionModal = () => {
  if (!subscriptionModal) return;
  subscriptionModal.classList.remove("open");
  subscriptionModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
};

subModalClose?.addEventListener("click", closeSubscriptionModal);
subCancelBtn?.addEventListener("click", closeSubscriptionModal);
subscriptionModal?.addEventListener("click", (e) => {
  if (e.target === subscriptionModal) closeSubscriptionModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && subscriptionModal?.classList.contains("open")) closeSubscriptionModal();
});

// Hero button click opens Subscription Modal
document.getElementById("openPlansHero")?.addEventListener("click", () => {
  openSubscriptionModal();
});

// URL hash handling for subscription plans
if (window.location.hash === "#subscription-plans" || window.location.hash === "#open-subscription-plans") {
  openSubscriptionModal();
  history.replaceState(null, "", window.location.pathname + window.location.search);
}

if (subPurchaseForm) {
  subPurchaseForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const planId = subSelectedPlanInput?.value || "3-month";
    const plan = SUB_PRICES[planId] || SUB_PRICES["3-month"];
    const category = subCategorySelect?.value || "";
    const bizName = String(document.getElementById("subBizName")?.value || "").trim();
    const name = String(document.getElementById("subFullName")?.value || "").trim();
    const email = String(document.getElementById("subEmail")?.value || "").trim().toLowerCase();
    const subCode = document.getElementById("subCountryCode")?.value || "+92";
    const mobile = combinePhoneWithCode(subCode, document.getElementById("subAccountMobile")?.value || "");
    const city = String(document.getElementById("subCityName")?.value || "").trim();
    const password = String(document.getElementById("subPassword")?.value || "");
    const payerMobile = normMobile(document.getElementById("subPayerMobile")?.value || "");
    const txId = String(document.getElementById("subTxId")?.value || "").trim();

    let valid = true;
    const setErr = (id, msg) => {
      const el = document.getElementById(id);
      if (el) el.textContent = msg;
      if (msg) valid = false;
    };

    setErr("subFullNameErr", name.length >= 2 ? "" : "Please enter your name.");
    setErr("subAccountMobileErr", MOBILE_RE.test(mobile) ? "" : "Please enter a valid phone number.");
    setErr("subCityNameErr", city.length >= 2 ? "" : "Please enter your country.");
    setErr("subCategorySelectErr", category ? "" : "Please select a category.");
    const emailEl = document.getElementById("subEmail");
    if (emailEl && emailEl.type !== "hidden") {
      setErr("subEmailErr", EMAIL_RE.test(email) ? "" : "Enter a valid email address.");
    }

    if (!valid) {
      showToast("Please fill all required fields correctly.", true);
      return;
    }

    subSubmitBtn.disabled = true;
    subSubmitBtn.innerHTML = `
      <span class="sub-btn-text">Connecting to WhatsApp...</span>
    `;

    const reqData = {
      id: "req_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      user_id: currentUser ? currentUser.id : "user_" + mobile,
      category,
      plan: planId,
      amount: plan.price,
      account_name: name,
      account_email: email,
      account_mobile: mobile,
      city,
      payment_reference: txId || "Pending WhatsApp Arrangement",
      payer_mobile: payerMobile || mobile,
      status: "pending",
      created_at: new Date().toISOString()
    };

    // Save locally
    const localReqs = getLocalSubscriptionRequests();
    localReqs.unshift(reqData);
    setLocalSubscriptionRequests(localReqs);

    // Save to Supabase cloud if connected
    if (sb) {
      try {
        let authId = currentUser?.id;
        if (!authId) {
          try {
            const fallbackPass = password || ("Pass@" + mobile.replace(/\D/g, "").slice(-6) + "x!");
            const authUser = await createOrResumeAuthAccount(mobile, fallbackPass, { name, mobile, city });
            authId = authUser.id;
          } catch (_) {}
        }
        await sb.from("subscription_requests").insert({
          user_id: authId || reqData.user_id,
          category,
          plan: planId,
          amount: plan.price,
          account_name: name,
          account_email: email,
          account_mobile: mobile,
          payment_reference: txId,
          payer_mobile: payerMobile,
          status: "pending"
        });
      } catch (cloudErr) {
        console.warn("Cloud subscription sync note:", cloudErr);
      }
    }

    subSubmitBtn.disabled = false;
    closeSubscriptionModal();
    subPurchaseForm.reset();
    selectSubPlan("3-month");

    const categoryName = subCategorySelect?.selectedOptions[0]?.text || category;

    const waText = encodeURIComponent(
      `💎 *SUBSCRIPTION PLAN REQUEST* 💎\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📅 *Plan:* ${plan.label} ($ ${plan.priceUsd})\n` +
      `👤 *Name:* ${name}\n` +
      `📞 *Number:* ${mobile}\n` +
      `🌍 *Country:* ${city}\n` +
      `📂 *Category:* ${categoryName}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Assalam o Alaikum! I have submitted my subscription form. Please share your payment details so I can make the payment and activate my category portal access.\nThank you!`
    );
    window.open(`https://wa.me/923042954627?text=${waText}`, "_blank", "noopener");

    showToast("Subscription request submitted! Connecting with Owner on WhatsApp for instant activation.");
  });

  const toggleSubPassBtn = document.getElementById("toggleSubPass");
  const subPassInput = document.getElementById("subPassword");
  if (toggleSubPassBtn && subPassInput) {
    toggleSubPassBtn.addEventListener("click", () => {
      const isPass = subPassInput.type === "password";
      subPassInput.type = isPass ? "text" : "password";
      toggleSubPassBtn.textContent = isPass ? "🔒" : "👁️";
    });
  }
}

// Global Legal Charter (Terms of Use & Privacy Policy) Triggers & Tab Switching
document.addEventListener("click", (e) => {
  if (e.target.closest("#openPrivacyPolicyLink")) {
    e.preventDefault();
    const modal = document.getElementById("globalPrivacyModal");
    if (modal) {
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
    }
  }
  if (e.target.closest("#closeGlobalPrivacyModal") || e.target.closest("#acceptLegalCharterBtn")) {
    const modal = document.getElementById("globalPrivacyModal");
    if (modal) {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
    }
  }
  const tabBtn = e.target.closest(".legal-tab-btn");
  if (tabBtn) {
    const tabName = tabBtn.dataset.legalTab;
    document.querySelectorAll(".legal-tab-btn").forEach(b => {
      const active = b === tabBtn;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-selected", active ? "true" : "false");
    });
    const termsPane = document.getElementById("legalTabTerms");
    const privPane = document.getElementById("legalTabPrivacy");
    if (termsPane && privPane) {
      termsPane.classList.toggle("is-active", tabName === "terms");
      privPane.classList.toggle("is-active", tabName === "privacy");
    }
  }
});
