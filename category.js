/* ============================================================
   category.js — renders the individual business category pages
   (clinic.html, academy.html, restaurant.html, ...)
   Loaded ONLY on the dedicated category pages.
   ============================================================ */

const CATEGORY_SITE_NAME = "Online Management Site";
const CATEGORY_SITE_URL = "https://onlinemanagement.site";
const CATEGORY_MODULES = window.OMS_FEATURE_MODULES;
const CATEGORY_SUPABASE = CATEGORY_MODULES.supabaseClient;
const CATEGORY_SUBSCRIPTION_PLANS = {
  "1-month": { label: "1 Month", months: 1, price: 3000 },
  "3-month": { label: "3 Months", months: 3, price: 9000 },
  "6-month": { label: "6 Months", months: 6, price: 12000 }
};

const CATEGORIES = {
  clinic: {
    key: "clinic",
    short: "Clinic",
    icon: "🩺",
    sub: "Patients, appointments & billing",
    h1: 'Clinic <span class="accent">Management</span>',
    desc: "Patient records, smart appointments, OPD tokens, digital prescriptions, billing and lab reports — everything your clinic needs, in one place.",
    meta: "Online Management Site gives clinics patient records, smart appointments, OPD tokens, digital prescriptions, billing and reports in one simple portal.",
    features: [
      { id: "patient-records", name: "Patient Records", icon: "📁", desc: "Save medical history, allergies and past visits of every patient in one place." },
      { id: "smart-appointments", name: "Smart Appointments", icon: "📅", desc: "Online booking, doctor calendar view and automatic visit reminders." },
      { id: "opd-token-system", name: "OPD Token System", icon: "🎫", desc: "Digital queue tokens with live status so patients know their turn." },
      { id: "digital-prescriptions", name: "Digital Prescriptions", icon: "📝", desc: "Write and print prescriptions in seconds with saved medicine templates." },
      { id: "billing-and-payments", name: "Billing & Payments", icon: "💳", desc: "Invoices, cash and card payments, dues tracking and receipts." },
      { id: "lab-tests-and-reports", name: "Lab Tests & Reports", icon: "🧪", desc: "Order lab tests and attach digital results directly to patient profiles." },
      { id: "doctor-profiles", name: "Doctor Profiles", icon: "🧑‍⚕️", desc: "Multiple doctors with their schedules, timings and availability." },
      { id: "staff-management", name: "Staff Management", icon: "🧑‍🔧", desc: "Receptionist and nurse shifts, duties and daily attendance." },
      { id: "pharmacy-stock", name: "Pharmacy Stock", icon: "💊", desc: "Medicine inventory inside the clinic with low-stock and expiry alerts." },
      { id: "revenue-reports", name: "Revenue Reports", icon: "📊", desc: "Daily, monthly and doctor-wise earnings with profit summaries." },
      { id: "expense-tracking", name: "Expense Tracking", icon: "💸", desc: "Record clinic expenses and see where the money goes each month." },
      { id: "patient-reminders", name: "Patient Reminders", icon: "✉️", desc: "SMS and WhatsApp follow-ups for appointments and check-ups." }
    ]
  },
  academy: {
    key: "academy",
    short: "Academy",
    icon: "🎓",
    sub: "Students, fees & exams",
    h1: 'Academy <span class="accent">Management</span>',
    desc: "Students, courses, timetables, attendance, exams and fee automation — run your academy smoothly from one place.",
    meta: "Online Management Site gives academies student management, course tracking, fee automation and exam tools in one simple portal.",
    features: [
      { id: "student-profiles", name: "Student Profiles", icon: "👨‍🎓", desc: "Admission details, contacts and complete learning history of every student." },
      { id: "course-management", name: "Course Management", icon: "📚", desc: "Create courses and batches with syllabus, duration and level." },
      { id: "class-timetable", name: "Class Timetable", icon: "🗓️", desc: "Batch timings, teacher allocation and room schedule in one view." },
      { id: "attendance", name: "Attendance", icon: "✅", desc: "Daily attendance with automatic alerts for absent students." },
      { id: "fee-automation", name: "Fee Automation", icon: "💰", desc: "Auto fee invoices, due dates, receipts and late-fee reminders." },
      { id: "fee-reports", name: "Fee Reports", icon: "🧾", desc: "Paid, pending and defaulters list with monthly fee summaries." },
      { id: "exams-and-grades", name: "Exams & Grades", icon: "📝", desc: "Result sheets, report cards and grade calculation for every class." },
      { id: "assignments", name: "Assignments", icon: "📄", desc: "Give tasks, collect submissions and share marks online." },
      { id: "teacher-profiles", name: "Teacher Profiles", icon: "🧑‍🏫", desc: "Faculty subjects, schedules, workload and attendance tracking." },
      { id: "parent-updates", name: "Parent Updates", icon: "👨‍👩‍👦", desc: "Send progress, attendance and fee updates to parents instantly." },
      { id: "course-material", name: "Course Material", icon: "📖", desc: "Share notes, videos and study material with students online." },
      { id: "income-reports", name: "Income Reports", icon: "📊", desc: "Monthly fee income, expenses and profit of your academy." }
    ]
  },
  restaurant: {
    key: "restaurant",
    short: "Restaurant",
    icon: "🍽️",
    sub: "POS, kitchen & tables",
    h1: 'Restaurant <span class="accent">Management</span>',
    desc: "POS, live kitchen orders, table management, menu and inventory — your restaurant runs on rails.",
    meta: "Online Management Site gives restaurants a dynamic POS, live kitchen, table management and inventory tools in one simple portal.",
    features: [
      { id: "dynamic-pos", name: "Dynamic POS", icon: "🧾", desc: "Fast billing with split bills, discounts and quick item search." },
      { id: "live-kitchen-orders", name: "Live Kitchen Orders", icon: "👨‍🍳", desc: "Orders appear instantly on the kitchen screen with status updates." },
      { id: "table-management", name: "Table Management", icon: "🪑", desc: "Floor map with live table status — free, occupied and reserved." },
      { id: "menu-management", name: "Menu Management", icon: "🍔", desc: "Add dishes, categories, prices, images and daily specials." },
      { id: "order-types", name: "Order Types", icon: "🛵", desc: "Handle dine-in, takeaway and delivery from one screen." },
      { id: "staff-and-waiters", name: "Staff & Waiters", icon: "🧑‍🍳", desc: "Waiter assignments, shifts and table-wise order ownership." },
      { id: "inventory-and-stock", name: "Inventory & Stock", icon: "📦", desc: "Ingredient stock with low-stock alerts and waste tracking." },
      { id: "purchases-and-suppliers", name: "Purchases & Suppliers", icon: "🚚", desc: "Supplier orders, delivery records and purchase bills." },
      { id: "discounts-and-promotions", name: "Discounts & Promotions", icon: "🏷️", desc: "Combo offers, coupon codes and happy-hour pricing." },
      { id: "payments-and-invoicing", name: "Payments & Invoicing", icon: "💳", desc: "Cash, card and online payments with printed invoices." },
      { id: "sales-reports", name: "Sales Reports", icon: "📊", desc: "Hourly and monthly sales, best sellers and peak hours." },
      { id: "expense-tracking", name: "Expense Tracking", icon: "💸", desc: "Daily expenses, staff wages and profit calculation." }
    ]
  },
  generalstore: {
    key: "generalstore",
    short: "General Store",
    icon: "🏪",
    sub: "Billing, stock & khata",
    h1: 'General Store <span class="accent">Management</span>',
    desc: "Billing, real-time inventory, suppliers and customer khata — complete control over your general store.",
    meta: "Online Management Site gives general stores billing, real-time inventory, supplier tracking and POS tools in one simple portal.",
    features: [
      { id: "dynamic-pos", name: "Dynamic POS", icon: "🧾", desc: "Fast counter billing with quick item search and repeat bills." },
      { id: "barcode-scanning", name: "Barcode Scanning", icon: "📱", desc: "Scan products for instant checkout and stock updates." },
      { id: "real-time-inventory", name: "Real-time Inventory", icon: "📦", desc: "Live stock levels for every item, updated on each sale." },
      { id: "supplier-tracking", name: "Supplier Tracking", icon: "🚚", desc: "Supplier contacts, purchase history and pending payments." },
      { id: "purchase-orders", name: "Purchase Orders", icon: "📝", desc: "Create and track purchase orders with delivery status." },
      { id: "product-catalog", name: "Product Catalog", icon: "🛒", desc: "Items with categories, units, prices and barcodes." },
      { id: "stock-alerts", name: "Stock Alerts", icon: "⚠️", desc: "Low-stock warnings so you never run out of fast-moving items." },
      { id: "expiry-alerts", name: "Expiry Alerts", icon: "🗓️", desc: "Get notified before dairy, snacks and other items expire." },
      { id: "customer-khata", name: "Customer Khata", icon: "📒", desc: "Credit accounts for regular customers with pending dues." },
      { id: "sales-reports", name: "Sales Reports", icon: "📊", desc: "Day-wise and monthly sales with best-selling items." },
      { id: "expense-tracking", name: "Expense Tracking", icon: "💸", desc: "Shop rent, utilities and daily expenses in one place." },
      { id: "profit-and-loss", name: "Profit & Loss", icon: "💰", desc: "Monthly profit and loss report for your whole store." }
    ]
  },
  beautysalon: {
    key: "beautysalon",
    short: "Beauty Salon",
    icon: "💇",
    sub: "Bookings, stylists & clients",
    h1: 'Beauty Salon <span class="accent">Management</span>',
    desc: "Online bookings, stylist assignments, client logs and packages — your salon, organized beautifully.",
    meta: "Online Management Site gives beauty salons online bookings, stylist management and client logs in one simple portal.",
    features: [
      { id: "online-bookings", name: "Online Bookings", icon: "📅", desc: "Clients book their slots online — no calls, no double booking." },
      { id: "stylist-bookings", name: "Stylist Bookings", icon: "🧑‍🎨", desc: "Assign bookings to stylists based on availability and skill." },
      { id: "appointment-calendar", name: "Appointment Calendar", icon: "🗓️", desc: "Day and week view of every appointment in one screen." },
      { id: "service-menu", name: "Service Menu", icon: "✂️", desc: "Services with prices, duration and required products." },
      { id: "client-logs", name: "Client Logs", icon: "📒", desc: "Visit history, preferences and notes for every client." },
      { id: "staff-management", name: "Staff Management", icon: "🧑‍💼", desc: "Stylist shifts, roles, attendance and commissions." },
      { id: "pos-and-billing", name: "POS & Billing", icon: "🧾", desc: "Quick billing at counter with receipts and payment modes." },
      { id: "packages-and-membership", name: "Packages & Membership", icon: "🎁", desc: "Prepaid packages, monthly memberships and balance tracking." },
      { id: "product-inventory", name: "Product Inventory", icon: "🧴", desc: "Salon products and consumables with low-stock alerts." },
      { id: "offers-and-coupons", name: "Offers & Coupons", icon: "🏷️", desc: "Seasonal offers, coupon codes and gift cards for clients." },
      { id: "revenue-reports", name: "Revenue Reports", icon: "📊", desc: "Stylist-wise earnings, service sales and daily income." },
      { id: "expense-tracking", name: "Expense Tracking", icon: "💸", desc: "Salon rent, products and staff costs with profit view." }
    ]
  },
  petrolpump: {
    key: "petrolpump",
    short: "Petrol Pump",
    icon: "⛽",
    sub: "Dispensers, shifts & sales",
    h1: 'Petrol Pump <span class="accent">Management</span>',
    desc: "Dispensers, shifts, nozzle readings, tank stock and sales reports — full control of your petrol pump.",
    meta: "Online Management Site gives petrol pumps dispenser tracking, shift management and sales reporting in one simple portal.",
    features: [
      { id: "dispenser-tracking", name: "Dispenser Tracking", icon: "⛽", desc: "Live status and readings of every dispenser and nozzle." },
      { id: "shift-management", name: "Shift Management", icon: "🕒", desc: "Shift-wise cash, fuel readings and smooth staff handover." },
      { id: "nozzle-readings", name: "Nozzle Readings", icon: "⛽", desc: "Opening and closing readings counted nozzle by nozzle." },
      { id: "rate-management", name: "Rate Management", icon: "💲", desc: "Update petrol, diesel and CNG rates anytime with history." },
      { id: "tank-inventory", name: "Tank Inventory", icon: "🛢️", desc: "Tank stock with dip readings and refill alerts." },
      { id: "sales-reports", name: "Sales Reports", icon: "📊", desc: "Daily and monthly fuel sales by type, nozzle and shift." },
      { id: "cash-and-payments", name: "Cash & Payments", icon: "💳", desc: "Cash, card and UPI reconciliation for every shift." },
      { id: "credit-accounts", name: "Credit Accounts", icon: "🚛", desc: "Fleet and regular vehicle credit with pending dues." },
      { id: "staff-and-attendants", name: "Staff & Attendants", icon: "🧑‍🔧", desc: "Attendant shifts, attendance and performance logs." },
      { id: "shop-and-lube-sales", name: "Shop & Lube Sales", icon: "🛒", desc: "Engine oil, coolants and convenience store items." },
      { id: "expense-tracking", name: "Expense Tracking", icon: "💸", desc: "Electricity, salaries and daily pump expenses." },
      { id: "profit-and-loss", name: "Profit & Loss", icon: "💰", desc: "Margin on every litre with monthly profit report." }
    ]
  },
  medicalstore: {
    key: "medicalstore",
    short: "Medical Store",
    icon: "💊",
    sub: "Prescriptions, stock & billing",
    h1: 'Medical Store <span class="accent">Management</span>',
    desc: "Digital prescriptions, batch stock, expiry alerts and fast POS billing — your pharmacy, fully digital.",
    meta: "Online Management Site gives medical stores digital prescriptions, batch stock and POS billing in one simple portal.",
    features: [
      { id: "digital-prescriptions", name: "Digital Prescriptions", icon: "📝", desc: "Receive and save doctor prescriptions against every patient." },
      { id: "medicine-catalog", name: "Medicine Catalog", icon: "💊", desc: "Medicines with brand, form, packing, price and maker company." },
      { id: "batch-stock", name: "Batch Stock", icon: "📦", desc: "Batch numbers with manufacturing and expiry dates for every item." },
      { id: "expiry-alerts", name: "Expiry Alerts", icon: "⚠️", desc: "Auto alerts before medicines expire so you can return them in time." },
      { id: "fast-pos-billing", name: "Fast POS Billing", icon: "🧾", desc: "Counter billing in seconds with strip, pack and salt-wise search." },
      { id: "barcode-scanning", name: "Barcode Scanning", icon: "📱", desc: "Scan packs for instant billing and stock updates." },
      { id: "purchase-and-suppliers", name: "Purchase & Suppliers", icon: "🚚", desc: "Supplier orders, bills, returns and payment records." },
      { id: "stock-alerts", name: "Stock Alerts", icon: "🔔", desc: "Low-stock and fast-moving medicine reorder warnings." },
      { id: "customer-khata", name: "Customer Khata", icon: "📒", desc: "Credit accounts for regular customers with pending dues." },
      { id: "sales-reports", name: "Sales Reports", icon: "📊", desc: "Medicine-wise sales, daily totals and top-selling drugs." },
      { id: "expense-tracking", name: "Expense Tracking", icon: "💸", desc: "Shop expenses, salaries and daily running costs." },
      { id: "profit-and-loss", name: "Profit & Loss", icon: "💰", desc: "Margin per medicine with monthly profit summary." }
    ]
  },
  laboratory: {
    key: "laboratory",
    short: "Laboratory",
    icon: "🔬",
    sub: "Tests, samples & reports",
    h1: 'Laboratory <span class="accent">Management</span>',
    desc: "Test catalog, sample tracking, digital reports and delivery — your lab, fully paperless.",
    meta: "Online Management Site gives laboratories test catalogs, sample tracking and digital reports in one simple portal.",
    features: [
      { id: "test-catalog", name: "Test Catalog", icon: "📋", desc: "All tests with prices, departments and normal ranges." },
      { id: "sample-collection", name: "Sample Collection", icon: "🧪", desc: "Unique sample ID for every patient with barcode labels." },
      { id: "sample-tracking", name: "Sample Tracking", icon: "📍", desc: "Live status — collected, processing, completed and verified." },
      { id: "digital-reports", name: "Digital Reports", icon: "📑", desc: "Create reports with values, remarks and printable PDF format." },
      { id: "report-delivery", name: "Report Delivery", icon: "📤", desc: "Send reports by SMS, email or WhatsApp instantly." },
      { id: "patient-profiles", name: "Patient Profiles", icon: "🧑‍⚕️", desc: "Past reports and value comparison over time in one view." },
      { id: "doctor-referrals", name: "Doctor Referrals", icon: "🏥", desc: "Referring doctors list with test history and payments." },
      { id: "home-collection", name: "Home Collection", icon: "🏠", desc: "Schedule home sample pickups with route and staff assignment." },
      { id: "billing-and-payments", name: "Billing & Payments", icon: "🧾", desc: "Test invoices, packages, cash and online payments." },
      { id: "lab-inventory", name: "Lab Inventory", icon: "📦", desc: "Reagents, kits and consumables with expiry alerts." },
      { id: "staff-and-pathologists", name: "Staff & Pathologists", icon: "🧑‍🔬", desc: "Technicians and pathologists with shifts and workload." },
      { id: "income-reports", name: "Income Reports", icon: "📊", desc: "Test-wise income, pending payments and monthly summary." }
    ]
  }
};

const CATEGORY_KEY = document.body.dataset.category;
const CURRENT = CATEGORIES[CATEGORY_KEY] || CATEGORIES.clinic;
const CURRENT_TITLE = `${CURRENT.short} Management | ${CATEGORY_SITE_NAME}`;

const escHtml = (s) => String(s ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

const setMetaContent = (selector, attr, value) => {
  const el = document.querySelector(selector);
  if (el && value) el.setAttribute(attr, value);
};

const fillCategoryMeta = () => {
  document.title = CURRENT_TITLE;
  setMetaContent('meta[name="description"]', "content", CURRENT.meta);
  setMetaContent('link[rel="canonical"]', "href", `${CATEGORY_SITE_URL}/${CURRENT.key}`);
  setMetaContent('meta[property="og:title"]', "content", CURRENT_TITLE);
  setMetaContent('meta[property="og:description"]', "content", CURRENT.meta);
  setMetaContent('meta[property="og:url"]', "content", `${CATEGORY_SITE_URL}/${CURRENT.key}`);
  setMetaContent('meta[name="twitter:title"]', "content", CURRENT_TITLE);
  setMetaContent('meta[name="twitter:description"]', "content", CURRENT.meta);
};

const fillCategoryHero = () => {
  const crumb = document.getElementById("catCrumbCurrent");
  if (crumb) crumb.textContent = CURRENT.short;

  const eyebrow = document.getElementById("catEyebrow");
  if (eyebrow) eyebrow.textContent = `${CURRENT.short} Software`;

  const h1 = document.getElementById("catH1");
  if (h1) h1.innerHTML = CURRENT.h1;

  const desc = document.getElementById("catDesc");
  if (desc) desc.textContent = CURRENT.desc;

  const icon = document.getElementById("catIcon");
  if (icon) icon.textContent = CURRENT.icon;

  const toolsPoint = document.getElementById("catToolsPoint");
  if (toolsPoint) toolsPoint.textContent = `${CURRENT.features.length} tools in one place`;

  const toolsStat = document.getElementById("catToolsStat");
  if (toolsStat) toolsStat.textContent = String(CURRENT.features.length);
};

const fillCategoryFeatures = () => {
  const grid = document.getElementById("catFeatures");
  if (!grid) return;
  grid.innerHTML = CURRENT.features.map((f) =>
    `<button class="cat-feature cat-tool-card" type="button" data-tool-feature="${escHtml(f.id)}">` +
    `<div class="cat-feature-icon">${f.icon}</div>` +
    `<h3>${escHtml(f.name)}</h3>` +
    `<p>${escHtml(f.desc)}</p>` +
    `<span class="cat-tool-open">Open workspace <span aria-hidden="true">&rarr;</span></span>` +
    `</button>`
  ).join("");
};

const categoryEscape = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));

const categoryEmail = (mobile) => `${mobile}@bms.app`;
const categoryMobile = (value) => value.trim().replace(/[\s-]/g, "").replace(/^\+92/, "0");
const categoryCollectionKey = `${CURRENT.key}:data`;
const categoryData = { v: CATEGORY_MODULES.FEATURE_VERSION, features: {} };
let categoryUser = null;
let categoryFeature = null;
let categoryEditId = null;
let categoryBusy = false;
let categorySessionReady = false;
let categorySessionPromise = Promise.resolve();
let categorySubscription = null;
let categoryLatestRequest = null;
let categorySelectedPlan = null;

const categoryFeatureDef = (featureId, card) => {
  const registered = CATEGORY_MODULES.FEATURE_REGISTRY[CURRENT.key]?.[featureId];
  const generic = CATEGORY_MODULES.GENERIC_FEATURES.find((feature) => feature.id === featureId);
  const fallback = CATEGORY_MODULES.GENERIC_FEATURES[0];
  return {
    id: featureId,
    name: registered?.name || generic?.name || card.querySelector("h3")?.textContent || featureId,
    icon: registered?.icon || generic?.icon || card.querySelector(".cat-feature-icon")?.textContent || "📁",
    fields: registered?.fields || generic?.fields || fallback.fields
  };
};

const categoryEnsureToolsUi = () => {
  if (!document.getElementById("categoryWorkspaceModal")) {
    document.body.insertAdjacentHTML("beforeend",
      `<div class="category-workspace-modal" id="categoryWorkspaceModal" aria-hidden="true">` +
      `<section class="category-workspace" role="dialog" aria-modal="true" aria-labelledby="categoryWorkspaceTitle">` +
      `<button type="button" class="category-workspace-close" data-workspace-close aria-label="Close workspace">&times;</button>` +
      `<div id="categoryWorkspaceContent"></div></section></div>` +
      `<div class="category-auth-modal" id="categoryAuthModal" aria-hidden="true">` +
      `<section class="category-auth-panel" role="dialog" aria-modal="true" aria-labelledby="categoryAuthTitle">` +
      `<button type="button" class="category-workspace-close" data-auth-close aria-label="Close sign in">&times;</button>` +
      `<div id="categoryAuthContent"></div></section></div>`);
  }
  const featureSection = document.getElementById("catFeatures");
  if (featureSection && !document.getElementById("categoryAccountBar")) {
    const accountBar = document.createElement("div");
    accountBar.id = "categoryAccountBar";
    accountBar.className = "category-account-bar";
    accountBar.innerHTML = `<div><strong>Category subscription</strong><span id="categoryAccountStatus">Choose a plan for this category to unlock its tools.</span></div>` +
      `<div class="category-account-actions"><button type="button" class="btn btn-primary" id="categorySubscribe">View plans</button>` +
      `<button type="button" class="btn btn-outline" id="categoryLogin">Sign in</button>` +
      `<button type="button" class="btn btn-outline" id="categoryRefreshAccess" hidden>Refresh access</button>` +
      `<button type="button" class="btn btn-outline" id="categorySignOut" hidden>Sign out</button></div>`;
    featureSection.before(accountBar);
  }
};

const setCategoryAccountUi = () => {
  const status = document.getElementById("categoryAccountStatus");
  const subscribe = document.getElementById("categorySubscribe");
  const login = document.getElementById("categoryLogin");
  const refresh = document.getElementById("categoryRefreshAccess");
  const signOut = document.getElementById("categorySignOut");
  if (!status || !subscribe || !login || !refresh || !signOut) return;
  if (!CATEGORY_SUPABASE) {
    status.textContent = "Cloud service is unavailable. Please refresh or contact support.";
    subscribe.disabled = true;
    login.disabled = true;
    document.querySelectorAll("[data-subscription-plan]").forEach((button) => { button.disabled = true; });
    return;
  }
  if (categorySubscription?.status === "active" && new Date(categorySubscription.expires_at) > new Date()) {
    status.textContent = `Active until ${new Date(categorySubscription.expires_at).toLocaleDateString()}. ${categoryUser?.user_metadata?.mobile || categoryUser?.email || "Signed in"} · only ${CURRENT.short} access.`;
    subscribe.textContent = "Renew / Change plan";
  } else if (categoryLatestRequest?.status === "pending") {
    status.textContent = `Payment request submitted for ${categoryLatestRequest.plan}. Waiting for the owner to verify your JazzCash payment.`;
    subscribe.textContent = "View plans";
  } else if (categoryLatestRequest?.status === "rejected") {
    status.textContent = `Payment request was not approved${categoryLatestRequest.admin_note ? `: ${categoryLatestRequest.admin_note}` : "."} You can submit a new request.`;
    subscribe.textContent = "Choose a plan";
  } else if (categoryUser) {
    status.textContent = `Signed in as ${categoryUser.user_metadata?.mobile || categoryUser.email}. This category is locked until its subscription is approved.`;
    subscribe.textContent = "Choose a plan";
  } else {
    status.textContent = `Choose a plan for ${CURRENT.short}; payment is verified before access is activated.`;
    subscribe.textContent = "Choose a plan";
  }
  subscribe.hidden = false;
  login.hidden = !!categoryUser;
  refresh.hidden = !categoryUser;
  signOut.hidden = !categoryUser;
};

const showCategorySignIn = (message = "") => {
  const modal = document.getElementById("categoryAuthModal");
  const content = document.getElementById("categoryAuthContent");
  if (!modal || !content) return;
  content.innerHTML = `<p class="category-workspace-eyebrow">${categoryEscape(CURRENT.short)} workspace</p>` +
    `<h2 id="categoryAuthTitle">Sign in to your account</h2>` +
    `<p class="category-auth-copy">An active subscription is required for this category. Other categories require their own separate subscription.</p>` +
    `<form id="categoryLoginForm" class="category-auth-form">` +
    `<label>Account mobile number<input name="mobile" type="tel" autocomplete="tel" required inputmode="tel" placeholder="03XXXXXXXXX"></label>` +
    `<label>Password<input name="password" type="password" autocomplete="current-password" required></label>` +
    `<p class="category-auth-error" role="alert">${categoryEscape(message)}</p>` +
    `<button class="btn btn-primary" type="submit">Sign in</button></form>` +
    `<p class="category-auth-switch">New account? Purchase a plan after paying through JazzCash. <button type="button" data-auth-plans>View plans</button></p>`;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  content.querySelector("input")?.focus();
};

const showCategoryAuth = (planId = categorySelectedPlan, mode = "signup", message = "") => {
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
  content.innerHTML = `<p class="category-workspace-eyebrow">${categoryEscape(CURRENT.short)} subscription</p>` +
    `<h2 id="categoryAuthTitle">Payment &amp; account setup</h2>` +
    `<p class="category-auth-copy">Plan: <strong>${plan.label}</strong> · PKR ${plan.price.toLocaleString()} · applies only to ${categoryEscape(CURRENT.short)}. Send payment by JazzCash to the owner number below. Access starts only after manual payment verification.</p>` +
    `<div class="category-jazzcash-box"><span>JazzCash account</span><strong>03042954627</strong><small>Confirm the recipient name shown in JazzCash before sending. Keep your transaction receipt and reference ID.</small></div>` +
    `<form id="categoryAuthForm" class="category-auth-form">` +
    (!alreadySignedIn && signup ? `<label>Full name<input name="name" type="text" autocomplete="name" required minlength="3" maxlength="80"></label>` : "") +
    (alreadySignedIn ? "" : `<label>Account mobile number<input name="mobile" type="tel" autocomplete="tel" required inputmode="tel" placeholder="03XXXXXXXXX"></label>` +
    `<label>Password<input name="password" type="password" autocomplete="${signup ? "new-password" : "current-password"}" required ${signup ? "minlength=\"8\"" : ""}></label>`) +
    `<label>JazzCash sender mobile<input name="payerMobile" type="tel" inputmode="tel" required placeholder="Number used to send payment"></label>` +
    `<label>JazzCash transaction / reference ID<input name="paymentReference" type="text" required maxlength="100" autocomplete="off" placeholder="Enter the transaction ID from your receipt"></label>` +
    `<label class="category-subscription-ack"><input name="categoryOnly" type="checkbox" required> I understand this purchase activates only ${categoryEscape(CURRENT.short)}.</label>` +
    `<p class="category-auth-copy">After you submit, this request stays pending while the owner checks the payment in JazzCash. Do not send your password or PIN to anyone.</p>` +
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

const categoryItems = () => {
  const items = categoryData.features[categoryFeature?.id || ""];
  return Array.isArray(items) ? items : [];
};

const categoryHasAccess = () =>
  !!categorySubscription &&
  categorySubscription.status === "active" &&
  new Date(categorySubscription.expires_at).getTime() > Date.now();

const categoryEnsureAccountActive = async () => {
  if (!categoryUser || !CATEGORY_SUPABASE) throw new Error("Sign in to verify account access.");
  const { data, error } = await CATEGORY_SUPABASE.rpc("oms_current_account_status");
  if (error) throw error;
  if (data?.active) return;
  const message = data?.reason || "This account has been blocked. Contact the site administrator.";
  const { error: signOutError } = await CATEGORY_SUPABASE.auth.signOut();
  if (signOutError) throw signOutError;
  categoryUser = null;
  categoryData.features = {};
  categorySubscription = null;
  categoryLatestRequest = null;
  closeCategoryWorkspace();
  setCategoryAccountUi();
  throw new Error(message);
};

const categoryRefreshSubscription = async () => {
  if (!categoryUser || !CATEGORY_SUPABASE) {
    categorySubscription = null;
    categoryLatestRequest = null;
    setCategoryAccountUi();
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
  if (subscriptionResult.error) throw subscriptionResult.error;
  if (requestResult.error) throw requestResult.error;
  categorySubscription = subscriptionResult.data || null;
  categoryLatestRequest = requestResult.data || null;
  setCategoryAccountUi();
};

const categoryRenderList = () => {
  if (!categoryFeature) return;
  const content = document.getElementById("categoryWorkspaceContent");
  const items = categoryItems();
  const columns = categoryFeature.fields.map((field) => `<th>${categoryEscape(field.label)}</th>`).join("");
  const rows = items.map((item) => {
    const cells = categoryFeature.fields.map((field) =>
      `<td>${categoryEscape(item[field.key] ?? item.fields?.[field.key] ?? "") || "<span class=\"category-empty-value\">—</span>"}</td>`
    ).join("");
    return `<tr>${cells}<td class="category-row-actions">` +
      `<button type="button" data-tool-edit="${categoryEscape(item.id)}">Edit</button>` +
      `<button type="button" data-tool-delete="${categoryEscape(item.id)}">Delete</button></td></tr>`;
  }).join("");
  content.innerHTML = `<p class="category-workspace-eyebrow">${categoryEscape(CURRENT.short)} workspace</p>` +
    `<h2 id="categoryWorkspaceTitle">${categoryEscape(categoryFeature.icon)} ${categoryEscape(categoryFeature.name)}</h2>` +
    `<p class="category-workspace-description">Manage this tool's records. Changes are saved to your signed-in account.</p>` +
    `<div class="category-workspace-toolbar"><span>${items.length} ${items.length === 1 ? "record" : "records"}</span>` +
    `<button class="btn btn-primary" type="button" data-tool-add>Add record</button></div>` +
    (items.length
      ? `<div class="category-workspace-table-wrap"><table><thead><tr>${columns}<th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div>`
      : `<div class="category-workspace-empty"><strong>No records yet</strong><span>Add your first ${categoryEscape(categoryFeature.name.toLowerCase())} record to get started.</span></div>`);
};

const categoryRenderForm = (itemId = null) => {
  if (!categoryFeature) return;
  categoryEditId = itemId;
  const item = itemId ? categoryItems().find((entry) => entry.id === itemId) : null;
  const fieldsHtml = categoryFeature.fields.map((field) => {
    const value = item?.[field.key] ?? item?.fields?.[field.key] ?? "";
    const required = field.required ? "required" : "";
    const id = `category-field-${categoryEscape(field.key)}`;
    let control;
    if (field.type === "textarea") {
      control = `<textarea id="${id}" name="${categoryEscape(field.key)}" rows="3" maxlength="2000" ${required}>${categoryEscape(value)}</textarea>`;
    } else if (field.type === "select") {
      control = `<select id="${id}" name="${categoryEscape(field.key)}" ${required}><option value="">Choose…</option>` +
        (field.options || []).map((option) => `<option value="${categoryEscape(option)}" ${value === option ? "selected" : ""}>${categoryEscape(option)}</option>`).join("") +
        `</select>`;
    } else {
      const maxLength = { text: 200, tel: 20, email: 254 }[field.type];
      const constraints = field.type === "number" ? 'min="0" step="any"' : (maxLength ? `maxlength="${maxLength}"` : "");
      control = `<input id="${id}" name="${categoryEscape(field.key)}" type="${categoryEscape(["text", "date", "time", "number", "tel", "email"].includes(field.type) ? field.type : "text")}" value="${categoryEscape(value)}" ${constraints} ${required}>`;
    }
    return `<label for="${id}">${categoryEscape(field.label)}${field.required ? " *" : ""}${control}</label>`;
  }).join("");
  const content = document.getElementById("categoryWorkspaceContent");
  content.innerHTML = `<p class="category-workspace-eyebrow">${categoryEscape(CURRENT.short)} workspace</p>` +
    `<h2 id="categoryWorkspaceTitle">${itemId ? "Edit" : "Add"} ${categoryEscape(categoryFeature.name)}</h2>` +
    `<form class="category-record-form" id="categoryRecordForm"><div class="category-record-fields">${fieldsHtml}</div>` +
    `<p class="category-auth-error" role="alert"></p><div class="category-workspace-toolbar">` +
    `<button type="button" class="btn btn-outline" data-tool-back>Back</button>` +
    `<button type="submit" class="btn btn-primary" ${categoryBusy ? "disabled" : ""}>${categoryBusy ? "Saving…" : "Save record"}</button></div></form>`;
  content.querySelector("input,select,textarea")?.focus();
};

const categoryLoadData = async () => {
  if (!categoryUser || !CATEGORY_SUPABASE) return;
  await categoryEnsureAccountActive();
  if (!categoryHasAccess()) throw new Error("An active subscription is required for this category.");
  const { data, error } = await CATEGORY_SUPABASE.from("app_data")
    .select("value")
    .eq("user_id", categoryUser.id)
    .eq("key", categoryCollectionKey)
    .maybeSingle();
  if (error) throw error;
  const value = data?.value;
  categoryData.features = value && typeof value === "object" && value.features && typeof value.features === "object"
    ? value.features
    : {};
};

const categorySaveData = async () => {
  if (!categoryUser || !CATEGORY_SUPABASE) throw new Error("Sign in is required to save records.");
  await categoryEnsureAccountActive();
  if (!categoryHasAccess()) throw new Error("Your category subscription is not active.");
  const { error } = await CATEGORY_SUPABASE.from("app_data").upsert({
    user_id: categoryUser.id,
    key: categoryCollectionKey,
    value: { v: CATEGORY_MODULES.FEATURE_VERSION, features: categoryData.features, updated: Date.now() },
    updated_at: new Date().toISOString()
  }, { onConflict: "user_id,key" });
  if (error) throw error;
};

const openCategoryFeature = async (card) => {
  if (!categorySessionReady) await categorySessionPromise;
  if (!categoryUser || !categoryHasAccess()) {
    document.getElementById("categorySubscriptionPlans")?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  const featureId = card.dataset.toolFeature;
  categoryFeature = categoryFeatureDef(featureId, card);
  categoryEditId = null;
  const modal = document.getElementById("categoryWorkspaceModal");
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  const content = document.getElementById("categoryWorkspaceContent");
  content.innerHTML = `<p class="category-workspace-loading">Loading your secure records…</p>`;
  try {
    await categoryLoadData();
    categoryRenderList();
  } catch (error) {
    content.innerHTML = `<h2 id="categoryWorkspaceTitle">Could not load records</h2><p class="category-auth-error">${categoryEscape(error.message || "Cloud data could not be loaded.")}</p>` +
      `<button type="button" class="btn btn-outline" data-workspace-close>Close</button>`;
  }
};

const initCategoryTools = () => {
  categoryEnsureToolsUi();
  setCategoryAccountUi();
  const subscribe = document.getElementById("categorySubscribe");
  const refresh = document.getElementById("categoryRefreshAccess");
  const signOut = document.getElementById("categorySignOut");
  subscribe?.addEventListener("click", () => {
    document.getElementById("categorySubscriptionPlans")?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  refresh?.addEventListener("click", async () => {
    if (!categoryUser) return;
    refresh.disabled = true;
    try {
      await categoryRefreshSubscription();
    } catch (error) {
      const status = document.getElementById("categoryAccountStatus");
      if (status) status.textContent = `Could not refresh subscription: ${error.message || "Cloud service error."}`;
    } finally {
      refresh.disabled = false;
    }
  });
  signOut?.addEventListener("click", async () => {
    if (!CATEGORY_SUPABASE) return;
    try {
      const { error } = await CATEGORY_SUPABASE.auth.signOut();
      if (error) throw error;
      categoryUser = null;
      categorySubscription = null;
      categoryLatestRequest = null;
      categoryData.features = {};
      closeCategoryWorkspace();
      setCategoryAccountUi();
    } catch (error) {
      const status = document.getElementById("categoryAccountStatus");
      if (status) status.textContent = `Sign out failed: ${error.message || "Cloud service is unavailable."}`;
    }
  });

  document.getElementById("catFeatures")?.addEventListener("click", (event) => {
    const card = event.target.closest("[data-tool-feature]");
    if (card) openCategoryFeature(card);
  });
  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-workspace-close]")) closeCategoryWorkspace();
    if (event.target.closest("[data-auth-close]")) closeCategoryAuth();
    const planButton = event.target.closest("[data-subscription-plan]");
    if (planButton) showCategoryAuth(planButton.dataset.subscriptionPlan, categoryUser ? "request" : "signup");
    if (event.target.closest("#categoryLogin")) showCategorySignIn();
    if (event.target.closest("[data-auth-plans]")) {
      closeCategoryAuth();
      document.getElementById("categorySubscriptionPlans")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    const mode = event.target.closest("[data-auth-mode]");
    if (mode) showCategoryAuth(mode.dataset.plan, mode.dataset.authMode);
    if (event.target.closest("[data-auth-signout]")) {
      CATEGORY_SUPABASE?.auth.signOut().then(({ error }) => {
        if (error) throw error;
        categoryUser = null;
        categorySubscription = null;
        categoryLatestRequest = null;
        setCategoryAccountUi();
        showCategoryAuth(categorySelectedPlan, "signup");
      }).catch((error) => {
        const message = document.querySelector("#categoryAuthContent .category-auth-error");
        if (message) message.textContent = `Could not switch accounts: ${error.message || "Cloud service error."}`;
      });
    }
    const add = event.target.closest("[data-tool-add]");
    if (add) categoryRenderForm();
    if (event.target.closest("[data-tool-back]")) categoryRenderList();
    const edit = event.target.closest("[data-tool-edit]");
    if (edit) categoryRenderForm(edit.dataset.toolEdit);
    const del = event.target.closest("[data-tool-delete]");
    if (del && categoryFeature && categoryUser) {
      const previous = categoryItems();
      const updated = previous.filter((item) => item.id !== del.dataset.toolDelete);
      categoryData.features[categoryFeature.id] = updated;
      del.disabled = true;
      categorySaveData().then(categoryRenderList).catch((error) => {
        categoryData.features[categoryFeature.id] = previous;
        categoryRenderList();
        document.getElementById("categoryWorkspaceContent").insertAdjacentHTML(
          "afterbegin",
          `<p class="category-auth-error" role="alert">Delete failed: ${categoryEscape(error.message || "Cloud save failed.")}</p>`
        );
      });
    }
  });
  document.getElementById("categoryAuthContent")?.addEventListener("submit", async (event) => {
    const loginForm = event.target.closest("#categoryLoginForm");
    if (loginForm && CATEGORY_SUPABASE) {
      event.preventDefault();
      const formData = new FormData(loginForm);
      const mobile = categoryMobile(String(formData.get("mobile") || ""));
      const password = String(formData.get("password") || "");
      const message = loginForm.querySelector(".category-auth-error");
      const submit = loginForm.querySelector('button[type="submit"]');
      if (!/^\d{7,15}$/.test(mobile)) {
        message.textContent = "Enter a valid account mobile number.";
        return;
      }
      submit.disabled = true;
      submit.textContent = "Signing in…";
      try {
        const { data, error } = await CATEGORY_SUPABASE.auth.signInWithPassword({
          email: categoryEmail(mobile),
          password
        });
        if (error) throw error;
        categoryUser = data.user;
        categorySessionReady = true;
        await categoryRefreshSubscription();
        closeCategoryAuth();
      } catch (error) {
        message.textContent = error.message || "Sign in failed. Please check your details.";
        submit.disabled = false;
        submit.textContent = "Sign in";
      }
      return;
    }
    const form = event.target.closest("#categoryAuthForm");
    if (!form || !CATEGORY_SUPABASE) return;
    event.preventDefault();
    const formData = new FormData(form);
    const mobile = categoryMobile(String(formData.get("mobile") || ""));
    const password = String(formData.get("password") || "");
    const signup = !!formData.get("name");
    const message = form.querySelector(".category-auth-error");
    const submit = form.querySelector('button[type="submit"]');
    const payerMobile = categoryMobile(String(formData.get("payerMobile") || ""));
    const paymentReference = String(formData.get("paymentReference") || "").trim();
    if (!/^\d{7,15}$/.test(payerMobile)) {
      message.textContent = "Enter the mobile number used to send the JazzCash payment.";
      return;
    }
    if (!/^[A-Za-z0-9-]{4,100}$/.test(paymentReference)) {
      message.textContent = "Enter a valid JazzCash transaction/reference ID (at least 4 letters or numbers).";
      return;
    }
    submit.disabled = true;
    submit.textContent = categoryUser ? "Submitting request…" : signup ? "Creating account…" : "Signing in…";
    try {
      if (!categoryUser) {
        if (!/^\d{7,15}$/.test(mobile)) throw new Error("Enter a valid account mobile number.");
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
        account_mobile: categoryMobile(String(formData.get("mobile") || categoryUser.user_metadata?.mobile || categoryUser.email?.split("@")[0] || "")),
        payment_reference: paymentReference,
        payer_mobile: payerMobile,
        status: "pending"
      });
      if (request.error) throw request.error;
      await categoryRefreshSubscription();
      closeCategoryAuth();
      setCategoryAccountUi();
      document.getElementById("categoryAccountBar")?.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (error) {
      message.textContent = error.message || "Authentication failed. Please try again.";
      submit.disabled = false;
      submit.textContent = categoryUser ? "Submit payment for verification" : signup ? "Create account & submit payment" : "Sign in & submit payment";
    }
  });
  document.getElementById("categoryWorkspaceContent")?.addEventListener("submit", async (event) => {
    const form = event.target.closest("#categoryRecordForm");
    if (!form || !categoryFeature || !categoryUser) return;
    event.preventDefault();
    if (!form.reportValidity()) return;
    const fields = Object.fromEntries(new FormData(form).entries());
    const current = categoryItems();
    const existing = categoryEditId ? current.find((item) => item.id === categoryEditId) : null;
    const entry = {
      id: existing?.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`),
      fields,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    categoryData.features[categoryFeature.id] = existing
      ? current.map((item) => item.id === existing.id ? entry : item)
      : [entry, ...current];
    categoryBusy = true;
    categoryRenderForm(existing?.id || null);
    try {
      await categorySaveData();
      categoryBusy = false;
      categoryRenderList();
    } catch (error) {
      categoryData.features[categoryFeature.id] = current;
      categoryBusy = false;
      const activeForm = document.getElementById("categoryRecordForm");
      const saveButton = activeForm?.querySelector('button[type="submit"]');
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = "Save record";
      }
      const alert = activeForm?.querySelector(".category-auth-error");
      if (alert) alert.textContent = `Save failed: ${error.message || "Cloud save failed."}`;
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
      setCategoryAccountUi();
    }).catch((error) => {
      categorySessionReady = true;
      const status = document.getElementById("categoryAccountStatus");
      if (status) status.textContent = `Could not verify account: ${error.message || "Cloud service is unavailable."}`;
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
            if (status) status.textContent = `Could not verify this category subscription: ${error.message || "Cloud service error."}`;
          });
        }, 0);
      }
    });
    window.setInterval(() => {
      if (!categoryUser) return;
      categoryEnsureAccountActive().catch((error) => {
        const status = document.getElementById("categoryAccountStatus");
        if (status) status.textContent = `Account access could not be verified: ${error.message || "Cloud service error."}`;
      });
    }, 60000);
  }
};

const fillCategoryRelated = () => {
  const grid = document.getElementById("catRelated");
  if (!grid) return;
  const others = Object.values(CATEGORIES).filter((c) => c.key !== CURRENT.key);
  grid.innerHTML = others.map((c) =>
    `<a class="cat-related-card" href="${c.key}.html">` +
    `<span class="cat-related-icon">${c.icon}</span>` +
    `<span class="cat-related-text">` +
    `<strong>${c.short}</strong>` +
    `<small>${c.sub}</small>` +
    `</span>` +
    `<span class="cat-related-arrow" aria-hidden="true">&rarr;</span>` +
    `</a>`
  ).join("");
};

/* Mobile navigation + misc page wiring */
const initCategoryPage = () => {
  const navToggle = document.getElementById("navToggle");
  const mainNav = document.getElementById("mainNav");
  if (navToggle && mainNav) {
    const setNavOpen = (open) => {
      mainNav.classList.toggle("open", open);
      navToggle.setAttribute("aria-expanded", String(open));
    };
    navToggle.addEventListener("click", () => setNavOpen(!mainNav.classList.contains("open")));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && mainNav.classList.contains("open")) setNavOpen(false);
    });
    mainNav.querySelectorAll(".nav-link").forEach((link) => {
      link.addEventListener("click", () => setNavOpen(false));
    });
  }

  // Highlight the current category in the nav
  const navLinks = mainNav ? [...mainNav.querySelectorAll(".nav-link")] : [];
  navLinks.forEach((link) => {
    const href = link.getAttribute("href") || "";
    const key = href.split("#")[0].replace(/^.*\//, "").replace(/\.html$/, "");
    const active = key === CURRENT.key;
    link.classList.toggle("active", active);
  });

  // Back to categories button
  const backBtn = document.querySelector(".cat-back-btn");
  if (backBtn) backBtn.addEventListener("click", () => { window.location.href = "index.html#industries"; });
};

fillCategoryMeta();
fillCategoryHero();
fillCategoryFeatures();
fillCategoryRelated();
initCategoryPage();
initCategoryTools();
