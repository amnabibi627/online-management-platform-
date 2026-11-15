// ============================================================
// Category page - 06-auth-and-paywall.js
// Sign-in, paywall and auth panel open / close.
// Split from the original category.js during the 2026-11 refactor.
// Loaded in numeric order by the page HTML. Keep that order.
// ============================================================

const showCategoryTrialRequiredModal = () => {
  showCategoryTrialModal("signup");
};

const showCategorySubscriptionPaywall = () => {
  categoryEnsureToolsUi();
  const modal = document.getElementById("categoryAuthModal");
  const content = document.getElementById("categoryAuthContent");
  if (!modal || !content) return;

  content.innerHTML = `
    <div style="text-align:center; margin-bottom:1.2rem;">
      <div style="font-size:2.3rem; margin-bottom:0.3rem;">🔒</div>
      <h2 id="categoryAuthTitle" style="margin:0 0 0.35rem; font-size:1.4rem; font-weight:800; color:#0f172a;">5-Day Free Trial Ended</h2>
      <p style="margin:0; font-size:0.86rem; color:#64748b; line-height:1.5;">
        Aapka 5-din ka free trial khatam ho chuka hai. Categories mein data add karne ke liye subscription plan purchase karein. (Aap website par feedback aur reviews bila rukawat de sakte hain).
      </p>
    </div>

    <div style="display:grid; gap:0.6rem; margin-bottom:1.2rem;">
      <div style="border:1.5px solid #ff8f04; border-radius:12px; padding:0.85rem 1rem; background:#fff7ed; display:flex; justify-content:space-between; align-items:center; cursor:pointer;" data-select-plan="3-month">
        <div>
          <strong style="display:block; font-size:0.95rem; color:#0f172a;">3 Months (Best Value)</strong>
          <span style="font-size:0.78rem; color:#ff8f04; font-weight:600;">Full category access</span>
        </div>
        <div style="font-size:1.15rem; font-weight:800; color:#ff8f04;">PKR 6,000</div>
      </div>
      <div style="border:1px solid #e2e8f0; border-radius:12px; padding:0.85rem 1rem; background:#fff; display:flex; justify-content:space-between; align-items:center; cursor:pointer;" data-select-plan="1-month">
        <div>
          <strong style="display:block; font-size:0.95rem; color:#0f172a;">1 Month</strong>
          <span style="font-size:0.78rem; color:#64748b;">Standard access</span>
        </div>
        <div style="font-size:1.1rem; font-weight:800; color:#0f172a;">PKR 2,000</div>
      </div>
      <div style="border:1px solid #e2e8f0; border-radius:12px; padding:0.85rem 1rem; background:#fff; display:flex; justify-content:space-between; align-items:center; cursor:pointer;" data-select-plan="1-year">
        <div>
          <strong style="display:block; font-size:0.95rem; color:#0f172a;">Yearly (Pro)</strong>
          <span style="font-size:0.78rem; color:#64748b;">Extended access</span>
        </div>
        <div style="font-size:1.1rem; font-weight:800; color:#0f172a;">PKR 20,000</div>
      </div>
    </div>

    <button type="button" class="btn btn-primary" style="width:100%; padding:0.75rem; font-weight:700; border-radius:10px; background:#ff8f04; border-color:#ff8f04; color:#fff;" data-action-pay-selected="3-month">
      Continue with 3 Months (PKR 6,000) &rarr;
    </button>
  `;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
};

const showCategorySignIn = (message = "") => {
  categoryEnsureToolsUi();
  const modal = document.getElementById("categoryAuthModal");
  const content = document.getElementById("categoryAuthContent");
  if (!modal || !content) return;
  content.innerHTML = `<p class="category-workspace-eyebrow">${categoryEscape(CURRENT.short)} workspace</p>` +
    `<h2 id="categoryAuthTitle">Sign in to your account</h2>` +
    `<p class="category-auth-copy">An active subscription is required for this category. Other categories require their own separate subscription.</p>` +
    `<form id="categoryLoginForm" class="category-auth-form">` +
    `<label>Account mobile number` +
    `<div class="phone-input-group" style="margin-top:0.3rem;">` +
    `<select name="countryCode" class="phone-country-select" aria-label="Country Code">` +
    `<option value="+92" selected>PK (+92)</option><option value="+1">US (+1)</option><option value="+44">UK (+44)</option><option value="+971">UAE (+971)</option><option value="+966">SA (+966)</option><option value="+91">IN (+91)</option><option value="+1">CA (+1)</option><option value="+61">AU (+61)</option><option value="+49">DE (+49)</option><option value="+33">FR (+33)</option>` +
    `</select>` +
    `<input name="mobile" type="tel" autocomplete="tel" required inputmode="tel" placeholder="Mobile Number">` +
    `</div></label>` +
    `<label>Password<input name="password" type="text" autocomplete="current-password" required></label>` +
    `<p class="category-auth-error" role="alert">${categoryEscape(message)}</p>` +
    `<button class="btn btn-primary" type="submit">Sign in</button></form>` +
    `<p class="category-auth-switch">New account? Purchase a plan with Card, Bank Wire, or Mobile Wallet.</p>`;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  content.querySelector("input")?.focus();
};

const showCategoryAuth = (planId = categorySelectedPlan, mode = "signup", message = "") => {
  categoryEnsureToolsUi();
  const modal = document.getElementById("categoryAuthModal");
  const content = document.getElementById("categoryAuthContent");
  if (!modal || !content) return;
  const plan = CATEGORY_SUBSCRIPTION_PLANS[planId];
  if (!plan) {
    document.getElementById("categorySubscriptionPlans")?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  categorySelectedPlan = planId;
  const signup = mode === "signup";
  const alreadySignedIn = !!categoryUser;
  const priceDisplay = `$${plan.priceUsd || Math.round(plan.price / 250)} USD / PKR ${plan.price.toLocaleString()}`;
  content.innerHTML = `<p class="category-workspace-eyebrow">${categoryEscape(CURRENT.short)} subscription</p>` +
    `<h2 id="categoryAuthTitle">Payment &amp; account setup</h2>` +
    `<p class="category-auth-copy">Plan: <strong>${plan.label}</strong> · ${priceDisplay} · applies to ${categoryEscape(CURRENT.short)}. Pay securely via Credit/Debit Card, International Wire, or Mobile Wallet.</p>` +
    `<div class="category-jazzcash-box" style="text-align:left;">` +
      `<span>Global Multi-Payment Channels</span>` +
      `<strong style="font-size:1.02rem; display:block; margin:0.35rem 0; line-height:1.45;">💳 Card / PayPal: Online Checkout<br>🏦 Wire: IBAN PK92MEZN0001020304050607 (SWIFT: MEZNPKKA)<br>📱 Mobile Wallet: 0304 295 4627</strong>` +
      `<small>Beneficiary: Amna Bibi / OpenMarket SaaS. Keep your transaction receipt or reference ID.</small>` +
    `</div>` +
    `<form id="categoryAuthForm" class="category-auth-form">` +
    (!alreadySignedIn && signup ? `<label>Full name<input name="name" type="text" autocomplete="name" required minlength="3" maxlength="80"></label>` : "") +
    (alreadySignedIn ? "" : `<label>Account phone / mobile number<input name="mobile" type="tel" autocomplete="tel" required inputmode="tel" placeholder="Mobile Number"></label>` +
    `<label>Password<input name="password" type="text" autocomplete="${signup ? "new-password" : "current-password"}" required ${signup ? "minlength=\"8\"" : ""}></label>`) +
    `<label>Sender contact / mobile<input name="payerMobile" type="tel" inputmode="tel" required placeholder="Phone, email or sender identifier"></label>` +
    `<label>Transaction / reference ID<input name="paymentReference" type="text" required maxlength="100" autocomplete="off" placeholder="Card TID, wire reference or receipt #"></label>` +
    `<label class="category-subscription-ack"><input name="categoryOnly" type="checkbox" required> I understand this purchase activates ${categoryEscape(CURRENT.short)}.</label>` +
    `<p class="category-auth-copy">After submission, the administrator verifies the payment reference to activate cloud access worldwide.</p>` +
    `<p class="category-auth-error" role="alert">${categoryEscape(message)}</p>` +
    `<button class="btn btn-primary" type="submit">${alreadySignedIn ? "Submit payment for verification" : signup ? "Create account & submit payment" : "Sign in & submit payment"}</button></form>` +
    (alreadySignedIn ? `<p class="category-auth-switch">Signed in as ${categoryEscape(categoryUser.user_metadata?.mobile || categoryUser.email)}. <button type="button" data-auth-signout>Use another account</button></p>` :
      `<p class="category-auth-switch">${signup ? "Already have an account?" : "Need a new account?"} <button type="button" data-auth-mode="${signup ? "login" : "signup"}" data-plan="${categoryEscape(planId)}">${signup ? "Sign in" : "Create account"}</button></p>`);
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  content.querySelector("input")?.focus();
};

const closeCategoryAuth = () => {
  const modal = document.getElementById("categoryAuthModal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
};

const closeCategoryWorkspace = () => {
  const modal = document.getElementById("categoryWorkspaceModal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  categoryFeature = null;
  categoryEditId = null;
};
