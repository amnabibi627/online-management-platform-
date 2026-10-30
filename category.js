/* ============================================================
   category.js: renders the individual business category pages
   (clinic.html, academy.html, restaurant.html, ...)
   Loaded ONLY on the dedicated category pages.
   ============================================================ */

const CATEGORY_SITE_NAME = "Online Management Site";
const CATEGORY_SITE_URL = "https://onlinemanagement.site";
const CATEGORY_MODULES = window.OMS_FEATURE_MODULES;
const CATEGORY_SUPABASE = CATEGORY_MODULES.supabaseClient;
const CATEGORY_SUBSCRIPTION_PLANS = {
  "1-month": { label: "1 Month", months: 1, price: 2000 },
  "3-month": { label: "3 Months", months: 3, price: 6000 },
  "1-year": { label: "1 Year", months: 12, price: 20000 }
};

const CATEGORIES = {
  clinic: {
    key: "clinic",
    short: "Clinic",
    icon: "🩺",
    sub: "Patients, appointments & billing",
    h1: 'Clinic <span class="accent">Management</span>',
    desc: "Patient records, smart appointments, OPD tokens, digital prescriptions, billing and lab reports: everything your clinic needs, in one place.",
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
    desc: "Students, courses, timetables, attendance, exams and fee automation: run your academy smoothly from one place.",
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
    desc: "POS, live kitchen orders, table management, menu and inventory: your restaurant runs on rails.",
    meta: "Online Management Site gives restaurants a dynamic POS, live kitchen, table management and inventory tools in one simple portal.",
    features: [
      { id: "dynamic-pos", name: "Dynamic POS", icon: "🧾", desc: "Fast billing with split bills, discounts and quick item search." },
      { id: "live-kitchen-orders", name: "Live Kitchen Orders", icon: "👨‍🍳", desc: "Orders appear instantly on the kitchen screen with status updates." },
      { id: "table-management", name: "Table Management", icon: "🪑", desc: "Floor map with live table status: free, occupied and reserved." },
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
    desc: "Billing, real-time inventory, suppliers and customer khata: complete control over your general store.",
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
    desc: "Online bookings, stylist assignments, client logs and packages: your salon, organized beautifully.",
    meta: "Online Management Site gives beauty salons online bookings, stylist management and client logs in one simple portal.",
    features: [
      { id: "online-bookings", name: "Online Bookings", icon: "📅", desc: "Clients book their slots online: no calls, no double booking." },
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
    desc: "Dispensers, shifts, nozzle readings, tank stock and sales reports: full control of your petrol pump.",
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
    desc: "Digital prescriptions, batch stock, expiry alerts and fast POS billing: your pharmacy, fully digital.",
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
    desc: "Test catalog, sample tracking, digital reports and delivery: your lab, fully paperless.",
    meta: "Online Management Site gives laboratories test catalogs, sample tracking and digital reports in one simple portal.",
    features: [
      { id: "test-catalog", name: "Test Catalog", icon: "📋", desc: "All tests with prices, departments and normal ranges." },
      { id: "sample-collection", name: "Sample Collection", icon: "🧪", desc: "Unique sample ID for every patient with barcode labels." },
      { id: "sample-tracking", name: "Sample Tracking", icon: "📍", desc: "Live status: collected, processing, completed and verified." },
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

  const toolsStat = document.getElementById("catToolsStat");
  if (toolsStat) toolsStat.textContent = String(CURRENT.features.length);

  const heroCardTitle = document.querySelector(".cat-hero-card h2");
  if (heroCardTitle) heroCardTitle.textContent = `${CURRENT.short} Portal`;

  const heroCardDesc = document.querySelector(".cat-hero-card > p");
  if (heroCardDesc) heroCardDesc.textContent = `Every tool below is part of the ${CURRENT.short} portal.`;
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
const categoryLocalStorageKey = `bms_cat_${CURRENT.key}_data_v2`;
const categoryData = { v: CATEGORY_MODULES.FEATURE_VERSION, features: {}, trash: {} };
let categoryUser = null;
let categoryFeature = null;
let categoryEditId = null;
let categoryBusy = false;
let categorySessionReady = false;
let categorySessionPromise = Promise.resolve();
let categorySubscription = null;
let categoryLatestRequest = null;
let categorySelectedPlan = null;
let categoryTab = "active";
let categorySearchQuery = "";
let categoryToastTimeout = null;
let categoryUndoAction = null;

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
      `<div id="categoryWsToastContainer" class="cat-ws-toast-container"></div>` +
      `<div id="categoryWorkspaceContent"></div>` +
      `<input type="file" id="categoryBackupFileInput" accept=".json,application/json" style="display:none;" />` +
      `</section></div>` +
      `<div class="category-auth-modal" id="categoryAuthModal" aria-hidden="true">` +
      `<section class="category-auth-panel" role="dialog" aria-modal="true" aria-labelledby="categoryAuthTitle">` +
      `<button type="button" class="category-workspace-close" data-auth-close aria-label="Close sign in">&times;</button>` +
      `<div id="categoryAuthContent"></div></section></div>`);
  }
};

const setCategoryAccountUi = () => {
  categoryUpdateHeaderBtn();
};

const categoryGetTrial = () => {
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

const categorySetTrial = (userData) => {
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
  categoryUpdateHeaderBtn();
  return trial;
};

const categoryHasActiveSubscription = () =>
  !!categorySubscription &&
  categorySubscription.status === "active" &&
  new Date(categorySubscription.expires_at).getTime() > Date.now();

const categoryHasAccess = () => {
  if (categoryHasActiveSubscription()) return true;
  const trial = categoryGetTrial();
  return !!trial && trial.isActive;
};

const categoryUpdateHeaderBtn = () => {
  const btn = document.getElementById("userSignupHeaderBtn");
  if (!btn) return;
  const hasSub = categoryHasActiveSubscription();
  const trial = categoryGetTrial();
  if (hasSub) {
    btn.textContent = "💎 Pro Member";
  } else if (trial && trial.isActive) {
    btn.textContent = `🟢 5-Day Trial (${trial.daysLeft}d)`;
  } else if (trial && !trial.isActive) {
    btn.textContent = "⚠️ Trial Expired";
  } else if (categoryUser) {
    btn.textContent = "👤 My Account";
  } else {
    btn.textContent = "Sign Up Free";
  }
};

const showCategoryTrialModal = () => {
  categoryEnsureToolsUi();
  const modal = document.getElementById("categoryAuthModal");
  const content = document.getElementById("categoryAuthContent");
  if (!modal || !content) return;

  const trial = categoryGetTrial();
  const hasSub = categoryHasActiveSubscription();

  if (categoryUser || (trial && trial.isActive) || hasSub) {
    const userName = categoryUser?.user_metadata?.name || trial?.name || "Business Owner";
    const userMobile = categoryUser?.user_metadata?.mobile || trial?.mobile || "N/A";
    const daysLeft = trial ? trial.daysLeft : 0;

    content.innerHTML = `
      <div style="text-align:center; padding: 0.5rem 0;">
        <div style="font-size:2.4rem; margin-bottom: 0.4rem;">👤</div>
        <h2 id="categoryAuthTitle" style="margin:0 0 0.4rem; font-size:1.45rem;">Your Account</h2>
        <div class="cat-ws-trial-pill ${hasSub ? 'is-pro' : (trial && trial.isActive ? 'is-active' : 'is-expired')}" style="margin-bottom:1.2rem;">
          ${hasSub
            ? '💎 Active Pro Subscription'
            : (trial && trial.isActive
                ? `🟢 5-Day Free Trial (${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left)`
                : '⚠️ Free Trial Expired: Subscription Needed')}
        </div>
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:1rem; text-align:left; margin-bottom:1.2rem;">
          <div style="font-size:0.8rem; color:#64748b; margin-bottom:0.25rem;">Name</div>
          <div style="font-weight:700; color:#0f172a; margin-bottom:0.75rem;">${categoryEscape(userName)}</div>
          <div style="font-size:0.8rem; color:#64748b; margin-bottom:0.25rem;">Mobile</div>
          <div style="font-weight:700; color:#0f172a;">${categoryEscape(userMobile)}</div>
        </div>
        ${!hasSub ? `
          <button type="button" class="btn btn-primary" style="width:100%; margin-bottom:0.6rem; padding:0.75rem; background:#ff8f04; border-color:#ff8f04; color:#fff;" data-action-view-paywall>
            Upgrade / Purchase Subscription
          </button>
        ` : ''}
        <button type="button" class="btn btn-outline" style="width:100%; padding:0.7rem;" data-auth-signout>
          Logout
        </button>
      </div>
    `;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    return;
  }

  content.innerHTML = `
    <div style="text-align:center; margin-bottom:1.25rem;">
      <div style="font-size:2.4rem; margin-bottom:0.3rem;">🚀</div>
      <h2 id="categoryAuthTitle" style="margin:0 0 0.35rem; font-size:1.45rem; font-weight:800; color:#0f172a;">Start 5-Day Free Trial</h2>
      <p style="margin:0; font-size:0.86rem; color:#64748b;">
        Instant full access to all 8 categories &amp; 96 tools. Zero upfront payment or card needed.
      </p>
    </div>

    <form id="categoryTrialForm" class="category-auth-form" style="display:grid; gap:0.75rem;">
      <div>
        <label style="font-size:0.82rem; font-weight:700; color:#334155; display:block; margin-bottom:0.3rem;">Full Name *</label>
        <input name="name" type="text" placeholder="e.g. Ali Khan" required minlength="3" maxlength="80" style="width:100%; padding:0.65rem 0.8rem; border:1px solid #cbd5e1; border-radius:10px; font-size:0.9rem;">
      </div>
      <div>
        <label style="font-size:0.82rem; font-weight:700; color:#334155; display:block; margin-bottom:0.3rem;">Mobile Number *</label>
        <input name="mobile" type="tel" placeholder="03XXXXXXXXX" required inputmode="numeric" maxlength="13" style="width:100%; padding:0.65rem 0.8rem; border:1px solid #cbd5e1; border-radius:10px; font-size:0.9rem;">
      </div>
      <div>
        <label style="font-size:0.82rem; font-weight:700; color:#334155; display:block; margin-bottom:0.3rem;">City *</label>
        <input name="city" type="text" placeholder="e.g. Lahore" required maxlength="40" style="width:100%; padding:0.65rem 0.8rem; border:1px solid #cbd5e1; border-radius:10px; font-size:0.9rem;">
      </div>
      <div>
        <label style="font-size:0.82rem; font-weight:700; color:#334155; display:block; margin-bottom:0.3rem;">Create Password *</label>
        <input name="password" type="text" placeholder="Min 8 characters" required minlength="8" maxlength="64" style="width:100%; padding:0.65rem 0.8rem; border:1px solid #cbd5e1; border-radius:10px; font-size:0.9rem;">
      </div>
      <label style="display:flex; align-items:center; gap:0.55rem; font-size:0.78rem; color:#64748b; margin:0.35rem 0 0.2rem; cursor:pointer; text-align:left;">
        <input name="terms" type="checkbox" required checked style="width:16px; height:16px; flex:0 0 auto; accent-color:#ff8f04;">
        <span>By creating an account you agree to the Terms of Use and Privacy Policy.</span>
      </label>
      <p class="category-auth-error" role="alert" style="color:#ef4444; font-size:0.8rem; margin:0.2rem 0 0; min-height:1rem;"></p>
      <button class="btn btn-primary" type="submit" style="width:100%; padding:0.75rem; font-weight:700; border-radius:10px; background:#ff8f04; border-color:#ff8f04; color:#fff; cursor:pointer;">
        🚀 Start 5-Day Free Trial
      </button>
    </form>

    <div style="margin-top:1rem; text-align:center;">
      <button type="button" data-action-signin-toggle style="background:none; border:none; color:#ff8f04; font-size:0.84rem; font-weight:600; cursor:pointer;">
        Already have an account? Sign in here
      </button>
    </div>
  `;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  content.querySelector("input")?.focus();
};

const showCategoryTrialRequiredModal = () => {
  categoryEnsureToolsUi();
  const modal = document.getElementById("categoryAuthModal");
  const content = document.getElementById("categoryAuthContent");
  if (!modal || !content) return;

  content.innerHTML = `
    <div style="text-align:center; padding: 0.5rem 0;">
      <div style="font-size:2.5rem; margin-bottom: 0.4rem;">✨</div>
      <h2 id="categoryAuthTitle" style="margin:0 0 0.4rem; font-size:1.45rem; font-weight:800; color:#0f172a;">Start 5-Day Free Trial</h2>
      <p style="margin:0 0 1.25rem; font-size:0.88rem; color:#64748b; line-height:1.5;">
        To add and save records in <strong>${categoryEscape(CURRENT.short)}</strong>, start your 5-day unlimited free trial. It takes less than 30 seconds!
      </p>
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:1rem; text-align:left; margin-bottom:1.25rem;">
        <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.45rem; font-size:0.85rem; color:#0f172a; font-weight:600;">
          <span style="color:#10b981;">✓</span> 5 days completely free trial
        </div>
        <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.45rem; font-size:0.85rem; color:#0f172a; font-weight:600;">
          <span style="color:#10b981;">✓</span> Add unlimited records in all 8 categories
        </div>
        <div style="display:flex; align-items:center; gap:0.5rem; font-size:0.85rem; color:#0f172a; font-weight:600;">
          <span style="color:#10b981;">✓</span> No credit card or advance payment
        </div>
      </div>
      <button type="button" class="btn btn-primary" style="width:100%; padding:0.75rem; font-weight:700; border-radius:10px; background:#ff8f04; border-color:#ff8f04; color:#fff;" data-action-open-trial-form>
        🚀 Start 5-Day Free Trial
      </button>
      <div style="margin-top:0.85rem;">
        <button type="button" data-action-signin-toggle style="background:none; border:none; color:#ff8f04; font-size:0.82rem; font-weight:600; cursor:pointer;">
          Already have an account? Sign in
        </button>
      </div>
    </div>
  `;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
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
        Your 5-day free trial has expired. To continue adding records to <strong>${categoryEscape(CURRENT.short)}</strong>, choose an affordable subscription below.
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
    `<label>Account mobile number<input name="mobile" type="tel" autocomplete="tel" required inputmode="tel" placeholder="03XXXXXXXXX"></label>` +
    `<label>Password<input name="password" type="text" autocomplete="current-password" required></label>` +
    `<p class="category-auth-error" role="alert">${categoryEscape(message)}</p>` +
    `<button class="btn btn-primary" type="submit">Sign in</button></form>` +
    `<p class="category-auth-switch">New account? Purchase a plan after paying through JazzCash.</p>`;
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
  content.innerHTML = `<p class="category-workspace-eyebrow">${categoryEscape(CURRENT.short)} subscription</p>` +
    `<h2 id="categoryAuthTitle">Payment &amp; account setup</h2>` +
    `<p class="category-auth-copy">Plan: <strong>${plan.label}</strong> · PKR ${plan.price.toLocaleString()} · applies only to ${categoryEscape(CURRENT.short)}. Send payment by JazzCash to the owner number below. Access starts only after manual payment verification.</p>` +
    `<div class="category-jazzcash-box"><span>JazzCash account</span><strong>03042954627</strong><small>Confirm the recipient name shown in JazzCash before sending. Keep your transaction receipt and reference ID.</small></div>` +
    `<form id="categoryAuthForm" class="category-auth-form">` +
    (!alreadySignedIn && signup ? `<label>Full name<input name="name" type="text" autocomplete="name" required minlength="3" maxlength="80"></label>` : "") +
    (alreadySignedIn ? "" : `<label>Account mobile number<input name="mobile" type="tel" autocomplete="tel" required inputmode="tel" placeholder="03XXXXXXXXX"></label>` +
    `<label>Password<input name="password" type="text" autocomplete="${signup ? "new-password" : "current-password"}" required ${signup ? "minlength=\"8\"" : ""}></label>`) +
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
  if (!categoryFeature) return [];
  if (!categoryData.features) categoryData.features = {};
  const items = categoryData.features[categoryFeature.id];
  return Array.isArray(items) ? items : [];
};

const categoryTrashItems = () => {
  if (!categoryFeature) return [];
  if (!categoryData.trash) categoryData.trash = {};
  const items = categoryData.trash[categoryFeature.id];
  return Array.isArray(items) ? items : [];
};

const showWorkspaceToast = (msg, undoCallback = null) => {
  const container = document.getElementById("categoryWsToastContainer");
  if (!container) return;
  clearTimeout(categoryToastTimeout);
  categoryUndoAction = undoCallback;
  container.innerHTML = `<div class="cat-ws-toast" role="status">` +
    `<span class="cat-ws-toast-icon">ℹ️</span>` +
    `<span class="cat-ws-toast-text">${categoryEscape(msg)}</span>` +
    (undoCallback ? `<button type="button" class="cat-ws-toast-undo" data-ws-undo>Undo</button>` : "") +
    `<button type="button" class="cat-ws-toast-close" data-ws-toast-close aria-label="Dismiss">&times;</button>` +
    `</div>`;
  categoryToastTimeout = setTimeout(() => {
    container.innerHTML = "";
    categoryUndoAction = null;
  }, 6000);
};

const categoryEnsureAccountActive = async () => {
  if (!categoryUser || !CATEGORY_SUPABASE) return;
  try {
    const { data, error } = await CATEGORY_SUPABASE.rpc("oms_current_account_status");
    if (error) return;
    if (data?.active) return;
    const message = data?.reason || "This account has been blocked. Contact the site administrator.";
    await CATEGORY_SUPABASE.auth.signOut();
    categoryUser = null;
    categorySubscription = null;
    categoryLatestRequest = null;
    closeCategoryWorkspace();
    throw new Error(message);
  } catch (err) {
    if (err.message && err.message.includes("blocked")) throw err;
  }
};

const categoryRefreshSubscription = async () => {
  if (!categoryUser || !CATEGORY_SUPABASE) {
    categorySubscription = null;
    categoryLatestRequest = null;
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
  if (!subscriptionResult.error) categorySubscription = subscriptionResult.data || null;
  if (!requestResult.error) categoryLatestRequest = requestResult.data || null;
};

const categoryLoadData = async () => {
  // 1. Load from localStorage first (Instant, resilient, offline-ready worldwide)
  try {
    const raw = localStorage.getItem(categoryLocalStorageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        if (parsed.features && typeof parsed.features === "object") categoryData.features = parsed.features;
        if (parsed.trash && typeof parsed.trash === "object") categoryData.trash = parsed.trash;
      }
    }
  } catch (err) {
    console.warn("Local storage read warning:", err);
  }

  // 2. If signed in with active cloud subscription, load and sync from Supabase
  if (categoryUser && CATEGORY_SUPABASE && categoryHasAccess()) {
    try {
      await categoryEnsureAccountActive();
      const { data, error } = await CATEGORY_SUPABASE.from("app_data")
        .select("value")
        .eq("user_id", categoryUser.id)
        .eq("key", categoryCollectionKey)
        .maybeSingle();
      if (!error && data?.value) {
        const cloudVal = data.value;
        if (cloudVal.features && typeof cloudVal.features === "object") {
          categoryData.features = { ...categoryData.features, ...cloudVal.features };
        }
        if (cloudVal.trash && typeof cloudVal.trash === "object") {
          categoryData.trash = { ...categoryData.trash, ...cloudVal.trash };
        }
        try {
          localStorage.setItem(categoryLocalStorageKey, JSON.stringify(categoryData));
        } catch (_) {}
      }
    } catch (cloudErr) {
      console.warn("Cloud data load warning (using local data):", cloudErr);
    }
  }
};

const categorySaveData = async () => {
  // Always persist locally first so business owner data is never lost
  try {
    localStorage.setItem(categoryLocalStorageKey, JSON.stringify(categoryData));
  } catch (err) {
    console.warn("Local storage write warning:", err);
  }

  // If cloud account is active, sync with Supabase
  if (categoryUser && CATEGORY_SUPABASE && categoryHasAccess()) {
    try {
      await categoryEnsureAccountActive();
      const { error } = await CATEGORY_SUPABASE.from("app_data").upsert({
        user_id: categoryUser.id,
        key: categoryCollectionKey,
        value: {
          v: CATEGORY_MODULES.FEATURE_VERSION,
          features: categoryData.features,
          trash: categoryData.trash || {},
          updated: Date.now()
        },
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id,key" });
      if (error) console.warn("Supabase upsert warning:", error);
    } catch (cloudErr) {
      console.warn("Cloud save warning (saved locally):", cloudErr);
    }
  }
};

const categoryMoveToTrash = async (featureId, itemId) => {
  const current = categoryData.features[featureId] || [];
  const item = current.find((entry) => entry.id === itemId);
  if (!item) return;

  if (!categoryData.trash) categoryData.trash = {};
  if (!Array.isArray(categoryData.trash[featureId])) categoryData.trash[featureId] = [];

  const trashedItem = {
    ...item,
    deletedAt: new Date().toISOString()
  };

  categoryData.trash[featureId] = [trashedItem, ...categoryData.trash[featureId]];
  categoryData.features[featureId] = current.filter((entry) => entry.id !== itemId);

  await categorySaveData();
  showWorkspaceToast("1 record moved to Recycle Bin.", async () => {
    await categoryRestoreFromTrash(featureId, itemId);
  });
  categoryRenderList();
};

const categoryRestoreFromTrash = async (featureId, itemId) => {
  if (!categoryData.trash || !Array.isArray(categoryData.trash[featureId])) return;
  const item = categoryData.trash[featureId].find((entry) => entry.id === itemId);
  if (!item) return;

  const { deletedAt, ...restored } = item;
  restored.updatedAt = new Date().toISOString();

  categoryData.trash[featureId] = categoryData.trash[featureId].filter((entry) => entry.id !== itemId);
  if (!Array.isArray(categoryData.features[featureId])) categoryData.features[featureId] = [];
  categoryData.features[featureId] = [restored, ...categoryData.features[featureId]];

  await categorySaveData();
  showWorkspaceToast("Record restored to Active Records!");
  categoryRenderList();
};

const categoryPermanentDelete = async (featureId, itemId) => {
  if (!confirm("Permanently delete this record? This action cannot be undone.")) return;
  if (categoryData.trash && Array.isArray(categoryData.trash[featureId])) {
    categoryData.trash[featureId] = categoryData.trash[featureId].filter((entry) => entry.id !== itemId);
    await categorySaveData();
    showWorkspaceToast("Record permanently deleted.");
    categoryRenderList();
  }
};

const categoryEmptyTrash = async (featureId) => {
  const count = (categoryData.trash && categoryData.trash[featureId]) ? categoryData.trash[featureId].length : 0;
  if (!count) return;
  if (!confirm(`Permanently delete all ${count} records in the Recycle Bin? This action cannot be undone.`)) return;
  categoryData.trash[featureId] = [];
  await categorySaveData();
  showWorkspaceToast("Recycle bin emptied.");
  categoryRenderList();
};

const categoryExportBackup = () => {
  const payload = {
    appName: "Online Management Site",
    bmsVersion: "2026.1",
    category: CURRENT.key,
    categoryName: CURRENT.short,
    exportedAt: new Date().toISOString(),
    features: categoryData.features,
    trash: categoryData.trash || {}
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `bms-${CURRENT.key}-backup-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showWorkspaceToast("Backup downloaded successfully!");
};

const categoryImportBackup = (file) => {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!parsed || typeof parsed !== "object") throw new Error("Invalid backup format.");
      const incomingFeatures = parsed.features || (parsed.category === CURRENT.key ? parsed.data : null);
      if (!incomingFeatures || typeof incomingFeatures !== "object") {
        throw new Error("No category records found in this backup file.");
      }

      const shouldMerge = confirm(
        "Backup file verified!\n\nClick 'OK' to MERGE with current records.\nClick 'Cancel' to REPLACE all current records with the backup."
      );

      if (shouldMerge) {
        for (const [featId, items] of Object.entries(incomingFeatures)) {
          if (Array.isArray(items)) {
            const existing = categoryData.features[featId] || [];
            const existingIds = new Set(existing.map((x) => x.id));
            const newOnes = items.filter((x) => !existingIds.has(x.id));
            categoryData.features[featId] = [...existing, ...newOnes];
          }
        }
      } else {
        categoryData.features = incomingFeatures;
        if (parsed.trash && typeof parsed.trash === "object") {
          categoryData.trash = parsed.trash;
        }
      }

      await categorySaveData();
      showWorkspaceToast("Backup successfully restored!");
      categoryRenderList();
    } catch (err) {
      alert("Restore failed: " + (err.message || "Invalid JSON file."));
    }
  };
  reader.readAsText(file);
};

const categoryExportCsv = () => {
  if (!categoryFeature) return;
  const items = categoryTab === "trash" ? categoryTrashItems() : categoryItems();
  if (!items.length) {
    alert("No records to export.");
    return;
  }
  const headers = categoryFeature.fields.map((f) => `"${f.label.replace(/"/g, '""')}"`);
  headers.push('"Created / Deleted Date"');

  const rows = items.map((item) => {
    const cells = categoryFeature.fields.map((f) => {
      const val = String(item[f.key] ?? item.fields?.[f.key] ?? "").replace(/"/g, '""');
      return `"${val}"`;
    });
    const dateVal = item.deletedAt || item.createdAt || "";
    cells.push(`"${dateVal ? new Date(dateVal).toLocaleString() : ''}"`);
    return cells.join(",");
  });

  const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bms-${CURRENT.key}-${categoryFeature.id}-${categoryTab}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showWorkspaceToast("CSV file exported successfully!");
};

const categoryPrintReport = () => {
  if (!categoryFeature) return;
  const items = categoryTab === "trash" ? categoryTrashItems() : categoryItems();
  const printWindow = window.open("", "_blank", "width=900,height=650");
  if (!printWindow) {
    alert("Please allow popups to print report.");
    return;
  }
  const title = `${CURRENT.short} - ${categoryFeature.name} (${categoryTab === "trash" ? "Recycle Bin" : "Active Records"})`;
  const tableHeaders = categoryFeature.fields.map((f) => `<th>${categoryEscape(f.label)}</th>`).join("");
  const tableRows = items.map((item, idx) => {
    const cells = categoryFeature.fields.map((f) => `<td>${categoryEscape(item[f.key] ?? item.fields?.[f.key] ?? "N/A")}</td>`).join("");
    const dateStr = item.deletedAt ? `Deleted: ${new Date(item.deletedAt).toLocaleString()}` : (item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A');
    return `<tr><td>${idx + 1}</td>${cells}<td>${dateStr}</td></tr>`;
  }).join("");

  printWindow.document.write(
    `<!DOCTYPE html><html><head><title>${categoryEscape(title)}</title>` +
    `<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;padding:25px;color:#1e293b;}` +
    `.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #e2e8f0;padding-bottom:15px;margin-bottom:20px;}` +
    `h1{margin:0;font-size:20px;font-weight:800;color:#0f172a;}.meta{font-size:13px;color:#64748b;margin-top:5px;}` +
    `table{width:100%;border-collapse:collapse;font-size:13px;margin-top:15px;}th,td{border:1px solid #cbd5e1;padding:8px 10px;text-align:left;}` +
    `th{background:#f8fafc;font-weight:700;color:#0f172a;}tr:nth-child(even){background:#f8fafc;}@media print{body{padding:0;}button{display:none;}}</style>` +
    `</head><body><div class="header"><div><h1>${categoryEscape(CURRENT.short)} &bull; ${categoryEscape(categoryFeature.name)}</h1>` +
    `<div class="meta">${categoryTab === "trash" ? "Recycle Bin Records" : "Active Tool Records"} &bull; Printed: ${new Date().toLocaleString()} &bull; Total: ${items.length} records</div></div>` +
    `<button onclick="window.print()" style="padding:8px 16px;background:#ff8f04;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;">Print / Save PDF</button>` +
    `</div><table><thead><tr><th>#</th>${tableHeaders}<th>Date</th></tr></thead><tbody>${tableRows}</tbody></table></body></html>`
  );
  printWindow.document.close();
};

const formatCellVal = (val, type) => {
  if (val === null || val === undefined || val === "") return `<span class="category-empty-value">N/A</span>`;
  const s = String(val).trim();
  const lower = s.toLowerCase();
  if (["paid", "active", "completed", "done", "confirmed", "in stock", "yes", "received", "open"].includes(lower)) {
    return `<span class="cat-status-pill is-success">${categoryEscape(s)}</span>`;
  }
  if (["pending", "partial", "waiting", "low stock", "draft", "in progress"].includes(lower)) {
    return `<span class="cat-status-pill is-warning">${categoryEscape(s)}</span>`;
  }
  if (["cancelled", "out of stock", "archived", "alert", "rejected", "unpaid", "blocked", "failed"].includes(lower)) {
    return `<span class="cat-status-pill is-danger">${categoryEscape(s)}</span>`;
  }
  if (type === "number" && !isNaN(Number(s))) {
    return `<strong class="cat-num-val">${Number(s).toLocaleString()}</strong>`;
  }
  return categoryEscape(s);
};

const categoryRenderList = () => {
  if (!categoryFeature) return;
  const content = document.getElementById("categoryWorkspaceContent");
  if (!content) return;

  const allActive = categoryItems();
  const allTrash = categoryTrashItems();
  const isTrash = categoryTab === "trash";
  const sourceItems = isTrash ? allTrash : allActive;

  let displayedItems = sourceItems;
  const query = categorySearchQuery.trim().toLowerCase();
  if (query) {
    displayedItems = sourceItems.filter((item) => {
      return categoryFeature.fields.some((field) => {
        const val = String(item[field.key] ?? item.fields?.[field.key] ?? "").toLowerCase();
        return val.includes(query);
      }) || (item.createdAt && item.createdAt.toLowerCase().includes(query))
         || (item.deletedAt && item.deletedAt.toLowerCase().includes(query));
    });
  }

  const columns = categoryFeature.fields.map((f) => `<th>${categoryEscape(f.label)}</th>`).join("");

  const rows = displayedItems.map((item, index) => {
    const cells = categoryFeature.fields.map((f) => {
      const raw = item[f.key] ?? item.fields?.[f.key] ?? "";
      return `<td>${formatCellVal(raw, f.type)}</td>`;
    }).join("");

    const dateVal = isTrash ? item.deletedAt : (item.updatedAt || item.createdAt);
    const dateFormatted = dateVal ? new Date(dateVal).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "N/A";

    let actionButtons = "";
    if (isTrash) {
      actionButtons = `
        <button type="button" class="cat-act-btn restore" data-tool-restore="${categoryEscape(item.id)}" title="Restore record to active list">
          <span aria-hidden="true">🔄</span> Restore
        </button>
        <button type="button" class="cat-act-btn delete-perm" data-tool-perm-delete="${categoryEscape(item.id)}" title="Permanently delete">
          <span aria-hidden="true">❌</span> Delete
        </button>
      `;
    } else {
      actionButtons = `
        <button type="button" class="cat-act-btn edit" data-tool-edit="${categoryEscape(item.id)}" title="Edit record">
          <span aria-hidden="true">✏️</span> Edit
        </button>
        <button type="button" class="cat-act-btn trash" data-tool-trash="${categoryEscape(item.id)}" title="Move to Recycle Bin">
          <span aria-hidden="true">🗑️</span> Delete
        </button>
      `;
    }

    return `
      <tr>
        <td class="cat-col-idx">${index + 1}</td>
        ${cells}
        <td class="cat-col-date">${categoryEscape(dateFormatted)}</td>
        <td class="category-row-actions">${actionButtons}</td>
      </tr>
    `;
  }).join("");

  const trial = categoryGetTrial();
  const hasSub = categoryHasActiveSubscription();
  let trialBadgeHtml = "";
  if (hasSub) {
    trialBadgeHtml = `<span class="cat-ws-trial-pill is-pro">💎 Pro Active</span>`;
  } else if (trial && trial.isActive) {
    trialBadgeHtml = `<span class="cat-ws-trial-pill is-active">🟢 5-Day Trial (${trial.daysLeft}d left)</span>`;
  } else if (trial && !trial.isActive) {
    trialBadgeHtml = `<span class="cat-ws-trial-pill is-expired" data-action-view-paywall title="Trial ended - click to purchase subscription">⚠️ Trial Expired (Upgrade)</span>`;
  }

  content.innerHTML = `
    <div class="cat-ws-header">
      <div class="cat-ws-header-info" style="display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap;">
        <h2 id="categoryWorkspaceTitle"><span class="cat-ws-title-icon">${categoryEscape(categoryFeature.icon)}</span> ${categoryEscape(categoryFeature.name)}</h2>
        ${trialBadgeHtml}
      </div>
      <div class="cat-ws-header-actions">
        <button type="button" class="btn btn-primary" data-tool-add>
          <span aria-hidden="true">➕</span> Add Record
        </button>
        <div class="cat-ws-dropdown">
          <button type="button" class="btn btn-outline cat-ws-dropdown-btn" data-ws-menu-toggle aria-expanded="false" title="Data Backup, Restore, Export & Tools">
            <span aria-hidden="true">⚙️</span> Manage Data <span class="cat-caret">▾</span>
          </button>
          <div class="cat-ws-dropdown-menu" id="catWsDataMenu">
            <div class="cat-ws-menu-header">Data Backup & Recovery</div>
            <button type="button" class="cat-ws-menu-item" data-ws-backup>
              <span class="cat-menu-icon" aria-hidden="true">💾</span>
              <div class="cat-menu-text">
                <strong>Export Backup</strong>
                <small>Download full data file (JSON)</small>
              </div>
            </button>
            <button type="button" class="cat-ws-menu-item" data-ws-restore>
              <span class="cat-menu-icon" aria-hidden="true">📥</span>
              <div class="cat-menu-text">
                <strong>Restore Backup</strong>
                <small>Upload and import JSON backup</small>
              </div>
            </button>
            <button type="button" class="cat-ws-menu-item" data-ws-tab="${isTrash ? 'active' : 'trash'}">
              <span class="cat-menu-icon" aria-hidden="true">${isTrash ? '📋' : '🗑️'}</span>
              <div class="cat-menu-text">
                <strong>${isTrash ? 'View Active Records' : 'Open Recycle Bin'}</strong>
                <small>${isTrash ? `Switch to ${allActive.length} active records` : `${allTrash.length} deleted items safely kept`}</small>
              </div>
            </button>
            <div class="cat-ws-menu-divider"></div>
            <div class="cat-ws-menu-header">Export & Reports</div>
            <button type="button" class="cat-ws-menu-item" data-ws-csv>
              <span class="cat-menu-icon" aria-hidden="true">📊</span>
              <div class="cat-menu-text">
                <strong>Export CSV</strong>
                <small>Compatible with Excel / Sheets</small>
              </div>
            </button>
            <button type="button" class="cat-ws-menu-item" data-ws-print>
              <span class="cat-menu-icon" aria-hidden="true">🖨️</span>
              <div class="cat-menu-text">
                <strong>Print / PDF Report</strong>
                <small>Clean print-ready layout</small>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>

    ${isTrash ? `
      <div class="cat-ws-trash-banner">
        <span>🗑️ <strong>Recycle Bin View (${allTrash.length})</strong>: Deleted records can be restored anytime or deleted permanently.</span>
        <div class="cat-ws-trash-banner-actions">
          <button type="button" class="cat-btn-back-active" data-ws-tab="active">← Back to Active Records</button>
          ${allTrash.length ? `<button type="button" class="cat-btn-empty-trash" data-ws-empty-trash>Empty Trash</button>` : ''}
        </div>
      </div>
    ` : ""}

    <div class="cat-ws-toolbar">
      <div class="cat-ws-search-wrap">
        <span class="cat-ws-search-icon" aria-hidden="true">🔍</span>
        <input type="search" class="cat-ws-search-input" data-ws-search placeholder="Search by any field..." value="${categoryEscape(categorySearchQuery)}" />
        ${categorySearchQuery ? `<button type="button" class="cat-ws-search-clear" data-ws-search-clear aria-label="Clear search">&times;</button>` : ""}
      </div>

      <div class="cat-ws-toolbar-right">
        <div class="cat-ws-view-tabs" role="tablist">
          <button type="button" class="cat-ws-view-tab ${!isTrash ? 'is-active' : ''}" data-ws-tab="active" title="View Active Records">
            <span>📋 Active</span>
            <span class="cat-ws-badge">${allActive.length}</span>
          </button>
          <button type="button" class="cat-ws-view-tab ${isTrash ? 'is-active' : ''} ${allTrash.length ? 'has-trash' : ''}" data-ws-tab="trash" title="View Recycle Bin (Deleted items)">
            <span>🗑️ Recycle Bin</span>
            <span class="cat-ws-badge">${allTrash.length}</span>
          </button>
        </div>
        <div class="cat-ws-meta-count">
          ${query ? `<strong>${displayedItems.length}</strong> of ${sourceItems.length}` : `<strong>${sourceItems.length}</strong> ${sourceItems.length === 1 ? 'item' : 'items'}`}
        </div>
      </div>
    </div>

    ${displayedItems.length ? `
      <div class="category-workspace-table-wrap">
        <table class="category-workspace-table">
          <thead>
            <tr>
              <th style="width: 45px;">#</th>
              ${columns}
              <th>${isTrash ? 'Deleted Date' : 'Date'}</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    ` : `
      <div class="category-workspace-empty">
        <div class="cat-ws-empty-icon">${isTrash ? '🗑️' : (query ? '🔍' : '📝')}</div>
        <strong>${isTrash ? 'Recycle Bin is empty' : (query ? 'No matching records found' : 'No records yet')}</strong>
        <span>${isTrash ? 'Items moved to the recycle bin will appear here with a restore option.' : (query ? `No records match "${categoryEscape(categorySearchQuery)}". Try another search.` : `Click "+ Add Record" above to create your first ${categoryEscape(categoryFeature.name.toLowerCase())} entry.`)}</span>
        ${query ? `<button type="button" class="btn btn-outline btn-sm" data-ws-search-clear style="margin-top: 0.8rem;">Clear Search</button>` : (!isTrash ? `<button type="button" class="btn btn-primary btn-sm" data-tool-add style="margin-top: 0.8rem;">Add First Record</button>` : '')}
      </div>
    `}
  `;
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
      control = `<textarea id="${id}" name="${categoryEscape(field.key)}" rows="3" maxlength="2000" placeholder="Enter ${categoryEscape(field.label.toLowerCase())}..." ${required}>${categoryEscape(value)}</textarea>`;
    } else if (field.type === "select") {
      control = `<select id="${id}" name="${categoryEscape(field.key)}" ${required}><option value="">Choose ${categoryEscape(field.label)}…</option>` +
        (field.options || []).map((option) => `<option value="${categoryEscape(option)}" ${value === option ? "selected" : ""}>${categoryEscape(option)}</option>`).join("") +
        `</select>`;
    } else {
      const maxLength = { text: 200, tel: 25, email: 254 }[field.type];
      const constraints = field.type === "number" ? 'min="0" step="any"' : (maxLength ? `maxlength="${maxLength}"` : "");
      const placeholder = field.type === "date" ? "" : (field.type === "time" ? "" : `Enter ${categoryEscape(field.label.toLowerCase())}...`);
      control = `<input id="${id}" name="${categoryEscape(field.key)}" type="${categoryEscape(["text", "date", "time", "number", "tel", "email"].includes(field.type) ? field.type : "text")}" value="${categoryEscape(value)}" placeholder="${placeholder}" ${constraints} ${required}>`;
    }
    return `
      <div class="cat-form-group">
        <label for="${id}">${categoryEscape(field.label)}${field.required ? ` <span class="cat-req">*</span>` : ""}</label>
        ${control}
      </div>
    `;
  }).join("");

  const content = document.getElementById("categoryWorkspaceContent");
  content.innerHTML = `
    <div class="cat-form-head">
      <h2 id="categoryWorkspaceTitle">${itemId ? "Edit Record" : "Add New Record"}</h2>
      <p class="category-workspace-description">${itemId ? "Update record details below and click Save Changes." : "Fill in the required information to create a new record."}</p>
    </div>
    <form class="category-record-form" id="categoryRecordForm">
      <div class="category-record-fields">${fieldsHtml}</div>
      <p class="category-auth-error" role="alert"></p>
      <div class="category-form-actions">
        <button type="button" class="btn btn-outline" data-tool-back>Cancel</button>
        <button type="submit" class="btn btn-primary" ${categoryBusy ? "disabled" : ""}>${categoryBusy ? "Saving…" : (itemId ? "Save Changes" : "Create Record")}</button>
      </div>
    </form>
  `;
  content.querySelector("input,select,textarea")?.focus();
};

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

const initCategoryTools = () => {
  categoryEnsureToolsUi();

  document.getElementById("catFeatures")?.addEventListener("click", (event) => {
    const card = event.target.closest("[data-tool-feature]");
    if (card) openCategoryFeature(card);
  });
  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-workspace-close]")) closeCategoryWorkspace();
    if (event.target.closest("[data-auth-close]")) closeCategoryAuth();
    const planButton = event.target.closest("[data-subscription-plan]");
    if (planButton) showCategoryAuth(planButton.dataset.subscriptionPlan, categoryUser ? "request" : "signup");
    const heroSignup = event.target.closest("#categoryHeroSignup, #userSignupHeaderBtn");
    if (heroSignup) {
      showCategoryTrialModal();
      return;
    }
    if (event.target.closest("[data-action-open-trial-form]")) {
      showCategoryTrialModal();
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

    const add = event.target.closest("[data-tool-add]");
    if (add) {
      if (categoryHasAccess()) {
        categoryRenderForm();
      } else {
        const trial = categoryGetTrial();
        if (!trial && !categoryUser) {
          showCategoryTrialRequiredModal();
        } else {
          showCategorySubscriptionPaywall();
        }
      }
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
      categoryMoveToTrash(categoryFeature.id, trash.dataset.toolTrash);
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
  });

  document.getElementById("categoryWorkspaceContent")?.addEventListener("input", (event) => {
    if (event.target.matches("[data-ws-search]")) {
      categorySearchQuery = event.target.value;
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
    }
  });

  document.getElementById("categoryAuthContent")?.addEventListener("submit", async (event) => {
    const trialForm = event.target.closest("#categoryTrialForm");
    if (trialForm) {
      event.preventDefault();
      const formData = new FormData(trialForm);
      const name = String(formData.get("name") || "").trim();
      const mobile = categoryMobile(String(formData.get("mobile") || ""));
      const email = String(formData.get("email") || "").trim().toLowerCase();
      const city = String(formData.get("city") || "").trim();
      const password = String(formData.get("password") || "");
      const termsBox = trialForm.querySelector('input[name="terms"]');
      const message = trialForm.querySelector(".category-auth-error");
      const submit = trialForm.querySelector('button[type="submit"]');

      if (name.length < 3) {
        if (message) message.textContent = "Please enter your full name (minimum 3 characters).";
        return;
      }
      if (!/^\d{7,15}$/.test(mobile)) {
        if (message) message.textContent = "Please enter a valid mobile number (e.g. 03XXXXXXXXX).";
        return;
      }
      if (password.length < 8) {
        if (message) message.textContent = "Password must be at least 8 characters.";
        return;
      }

      submit.disabled = true;
      submit.textContent = "Starting trial…";

      if (termsBox && !termsBox.checked) {
        if (message) message.textContent = "Please agree to the Terms of Use and Privacy Policy.";
        submit.disabled = false;
        submit.textContent = "🚀 Start 5-Day Free Trial";
        return;
      }
      categorySetTrial({ name, mobile, email, city });

      if (CATEGORY_SUPABASE) {
        try {
          const res = await CATEGORY_SUPABASE.auth.signUp({
            email: categoryEmail(mobile),
            password,
            options: { data: { name, mobile, city, email } }
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
      showWorkspaceToast(`🎉 Welcome, ${name}! Your 5-day free trial has started.`);
      if (categoryFeature) categoryRenderList();
      return;
    }

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
        if (!categoryGetTrial()) {
          categorySetTrial({ mobile, name: categoryUser.user_metadata?.name || "Business User" });
        }
        categoryUpdateHeaderBtn();
        closeCategoryAuth();
        showWorkspaceToast(`Welcome back, ${categoryUser.user_metadata?.name || 'User'}!`);
        if (categoryFeature) categoryRenderList();
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
      // removed scroll to account bar
    } catch (error) {
      message.textContent = error.message || "Authentication failed. Please try again.";
      submit.disabled = false;
      submit.textContent = categoryUser ? "Submit payment for verification" : signup ? "Create account & submit payment" : "Sign in & submit payment";
    }
  });
  document.getElementById("categoryWorkspaceContent")?.addEventListener("submit", async (event) => {
    const form = event.target.closest("#categoryRecordForm");
    if (!form || !categoryFeature) return;
    event.preventDefault();
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

  // Highlight the current section in the nav
  const navLinks = mainNav ? [...mainNav.querySelectorAll(".nav-link")] : [];
  navLinks.forEach((link) => {
    const href = link.getAttribute("href") || "";
    const key = href.split("#")[0].replace(/^.*\//, "").replace(/\.html$/, "");
    const active = key === CURRENT.key || href.endsWith("#industries");
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
categoryUpdateHeaderBtn();
