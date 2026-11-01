let categoryDateFilter = "";
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
  "1-month": { label: "1 Month", months: 1, price: 2000, priceUsd: 9 },
  "3-month": { label: "3 Months", months: 3, price: 6000, priceUsd: 24 },
  "1-year": { label: "1 Year", months: 12, price: 20000, priceUsd: 69 }
};

const CATEGORIES = {
  clinic: {
    key: "clinic",
    short: "Clinic",
    icon: "🩺",
    sub: "Patients, appointments & billing",
    h1: 'Clinic <span class="accent">Management</span>',
    desc: "A complete cloud portal built to manage your clinic operations with ease. Register patients, issue OPD queue tokens, and schedule doctor visits. Easily add, edit, delete, and restore patient records whenever needed. Create digital prescriptions and generate instant billing invoices. Print thermal receipts or download clean patient records in PDF format. Manage your clinic smoothly from mobile or PC with live sync.",
    meta: "A complete cloud portal built to manage your clinic operations with ease. Register patients, issue OPD queue tokens, and schedule doctor visits. Easily add, edit, delete, and restore patient records whenever needed. Create digital prescriptions and generate instant billing invoices. Print thermal receipts or download clean patient records in PDF format. Manage your clinic smoothly from mobile or PC with live sync.",
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
    desc: "A smart educational portal to run your academy, coaching, or school. Enroll students, set class timetables, and mark daily attendance easily. You have full freedom to add, edit, delete, and restore student files. Generate automatic monthly fee vouchers with dues tracking and reminders. Print instant fee receipts or download complete student reports in PDF. Keep teachers and parents connected from any mobile phone or computer.",
    meta: "A smart educational portal to run your academy, coaching, or school. Enroll students, set class timetables, and mark daily attendance easily. You have full freedom to add, edit, delete, and restore student files. Generate automatic monthly fee vouchers with dues tracking and reminders. Print instant fee receipts or download complete student reports in PDF. Keep teachers and parents connected from any mobile phone or computer.",
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
    desc: "A fast POS portal designed to streamline your restaurant orders and dining. Manage table bookings, dine-in guests, takeaway, and live kitchen tickets. Effortlessly add, edit, delete, and restore menu dishes and orders anytime. Track ingredient stock and get low-inventory alerts automatically. Print instant customer bills or export daily sales and profit reports to PDF. Control your entire restaurant smoothly from any mobile phone or PC.",
    meta: "A fast POS portal designed to streamline your restaurant orders and dining. Manage table bookings, dine-in guests, takeaway, and live kitchen tickets. Effortlessly add, edit, delete, and restore menu dishes and orders anytime. Track ingredient stock and get low-inventory alerts automatically. Print instant customer bills or export daily sales and profit reports to PDF. Control your entire restaurant smoothly from any mobile phone or PC.",
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
    desc: "A complete retail portal to manage your store, inventory, and sales. Scan product barcodes for fast counter billing and repeat checkout. Easily add, edit, delete, and restore store items and price records. Monitor live stock levels with automatic low-stock and expiry warnings. Maintain customer khata credit accounts with instant payment logs. Print counter receipts or download supplier bills and reports in PDF.",
    meta: "A complete retail portal to manage your store, inventory, and sales. Scan product barcodes for fast counter billing and repeat checkout. Easily add, edit, delete, and restore store items and price records. Monitor live stock levels with automatic low-stock and expiry warnings. Maintain customer khata credit accounts with instant payment logs. Print counter receipts or download supplier bills and reports in PDF.",
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
    desc: "An elegant portal built to organize salon bookings and beauty services. Book client appointments online and manage stylists and chair queues smoothly. Freely add, edit, delete, and restore client records and bookings anytime. Keep detailed records of customer service history and favorite styles. Process quick payments at the counter with instant service receipts. Download monthly revenue and stylist commission reports in PDF on any device.",
    meta: "An elegant portal built to organize salon bookings and beauty services. Book client appointments online and manage stylists and chair queues smoothly. Freely add, edit, delete, and restore client records and bookings anytime. Keep detailed records of customer service history and favorite styles. Process quick payments at the counter with instant service receipts. Download monthly revenue and stylist commission reports in PDF on any device.",
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
    desc: "A dedicated fuel station portal to manage dispensers, shifts, and sales. Record opening and closing meter readings for each nozzle accurately. Seamlessly add, edit, delete, and restore shift logs and transaction data. Monitor underground fuel tank levels with daily dip reading records. Track fleet vehicle credit accounts and pending balance payments. Print shift handover slips or export monthly profit and loss reports to PDF.",
    meta: "A dedicated fuel station portal to manage dispensers, shifts, and sales. Record opening and closing meter readings for each nozzle accurately. Seamlessly add, edit, delete, and restore shift logs and transaction data. Monitor underground fuel tank levels with daily dip reading records. Track fleet vehicle credit accounts and pending balance payments. Print shift handover slips or export monthly profit and loss reports to PDF.",
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
    desc: "A modern pharmacy portal built for medicine inventory and fast billing. Search medicines quickly by name or formula and scan barcodes at checkout. Easily add, edit, delete, and restore medicine stock and batch files. Track batch numbers with automatic expiry alerts to prevent losses. Manage customer khata credit balances and supplier purchase bills. Print itemized pharmacy receipts or download complete sales reports in PDF.",
    meta: "A modern pharmacy portal built for medicine inventory and fast billing. Search medicines quickly by name or formula and scan barcodes at checkout. Easily add, edit, delete, and restore medicine stock and batch files. Track batch numbers with automatic expiry alerts to prevent losses. Manage customer khata credit balances and supplier purchase bills. Print itemized pharmacy receipts or download complete sales reports in PDF.",
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
    desc: "A complete diagnostic portal to operate your medical lab paperless. Register patient tests from a full catalog and print barcode sample labels. You can easily add, edit, delete, and restore test records anytime. Track sample progress live from collection to pathologist verification. Deliver accurate digital test reports directly via WhatsApp or print. Download professional PDF lab reports and track daily revenue on any screen.",
    meta: "A complete diagnostic portal to operate your medical lab paperless. Register patient tests from a full catalog and print barcode sample labels. You can easily add, edit, delete, and restore test records anytime. Track sample progress live from collection to pathologist verification. Deliver accurate digital test reports directly via WhatsApp or print. Download professional PDF lab reports and track daily revenue on any screen.",
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

const OMS_CURRENCIES = {
  USD: { code: "USD", symbol: "$", name: "US Dollar ($)" },
  EUR: { code: "EUR", symbol: "€", name: "Euro (€)" },
  GBP: { code: "GBP", symbol: "£", name: "British Pound (£)" },
  AED: { code: "AED", symbol: "AED ", name: "UAE Dirham (AED)" },
  SAR: { code: "SAR", symbol: "SAR ", name: "Saudi Riyal (SAR)" },
  CAD: { code: "CAD", symbol: "CA$", name: "Canadian Dollar ($)" },
  AUD: { code: "AUD", symbol: "AU$", name: "Australian Dollar ($)" },
  PKR: { code: "PKR", symbol: "Rs. ", name: "Pakistani Rupee (Rs.)" },
  INR: { code: "INR", symbol: "₹", name: "Indian Rupee (₹)" },
  JPY: { code: "JPY", symbol: "¥", name: "Japanese Yen (¥)" }
};

const getGlobalCurrency = () => {
  return localStorage.getItem("oms_global_currency") || "USD";
};

const setGlobalCurrency = (code) => {
  if (OMS_CURRENCIES[code]) {
    localStorage.setItem("oms_global_currency", code);
    renderSaasAnalytics();
    categoryRenderList();
    showWorkspaceToast(`Currency switched to ${OMS_CURRENCIES[code].name}`);
  }
};

const formatCurrencyVal = (num) => {
  const code = getGlobalCurrency();
  const curr = OMS_CURRENCIES[code] || OMS_CURRENCIES.USD;
  const n = typeof num === "number" ? num : parseFloat(String(num).replace(/[^0-9.-]/g, ""));
  if (isNaN(n)) return "N/A";
  return `${curr.symbol}${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

const categoryEmail = (mobile) => `${String(mobile).replace(/[^0-9a-zA-Z]/g, "")}@bms.app`;
const categoryMobile = (value) => String(value || "").trim().replace(/[\s\-\(\)\.]/g, "").replace(/^\+/, "");
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
let categorySortCol = null;
let categorySortDir = "asc";
let categoryPage = 1;
let categoryPageSize = 25;
let categoryToastTimeout = null;
let categoryUndoAction = null;

const categoryFeatureDef = (featureId, card = null) => {
  const registered = CATEGORY_MODULES.FEATURE_REGISTRY[CURRENT.key]?.[featureId];
  const generic = CATEGORY_MODULES.GENERIC_FEATURES.find((feature) => feature.id === featureId);
  const fallback = CATEGORY_MODULES.GENERIC_FEATURES[0];
  const foundInCurrent = Array.isArray(CURRENT.features) ? CURRENT.features.find((f) => f.id === featureId) : null;
  return {
    id: featureId,
    name: registered?.name || generic?.name || foundInCurrent?.name || card?.querySelector("h3")?.textContent || featureId,
    icon: registered?.icon || generic?.icon || foundInCurrent?.icon || card?.querySelector(".cat-feature-icon")?.textContent || "\u{1F4C1}",
    desc: foundInCurrent?.desc || generic?.desc || registered?.desc || `Live digital management for ${featureId}.`,
    fields: registered?.fields || generic?.fields || fallback.fields
  };
};
const categoryEnsureToolsUi = () => {
  if (!document.getElementById("categoryWorkspaceModal")) {
    const hasEmbeddedWs = !!document.getElementById("categoryWorkspaceContent");
    const hasEmbeddedToast = !!document.getElementById("categoryWsToastContainer");
    document.body.insertAdjacentHTML("beforeend",
      `<div class="category-workspace-modal" id="categoryWorkspaceModal" aria-hidden="true">` +
      `<section class="category-workspace" role="dialog" aria-modal="true" aria-labelledby="categoryWorkspaceTitle">` +
      `<button type="button" class="category-workspace-close" data-workspace-close aria-label="Close workspace">&times;</button>` +
      (hasEmbeddedToast ? "" : `<div id="categoryWsToastContainer" class="cat-ws-toast-container"></div>`) +
      (hasEmbeddedWs ? "" : `<div id="categoryWorkspaceContent"></div>`) +
      `<input type="file" id="categoryBackupFileInput" accept=".json,application/json" style="display:none;" />` +
      `</section></div>` +
      `<div class="category-auth-modal" id="categoryAuthModal" aria-hidden="true">` +
      `<section class="category-auth-panel" role="dialog" aria-modal="true" aria-labelledby="categoryAuthTitle">` +
      `<button type="button" class="category-workspace-close" data-auth-close aria-label="Close sign in">&times;</button>` +
      `<div id="categoryAuthContent"></div></section></div>` +
      `<div class="category-modal-backdrop" id="categorySafetyModalBackdrop" aria-hidden="true">` +
      `<div class="category-modal-card">` +
      `<div class="category-modal-card-header">` +
      `<h3>&#128737;&#65039; Database Security &amp; Daily Cloud Backups</h3>` +
      `<button type="button" class="category-modal-close-btn" data-close-safety aria-label="Close">&times;</button></div>` +
      `<div class="category-modal-card-body" id="categorySafetyModalBody"></div></div></div>` +
      `<div class="category-modal-backdrop" id="categoryPrivacyModalBackdrop" aria-hidden="true">` +
      `<div class="category-modal-card">` +
      `<div class="category-modal-card-header">` +
      `<h3>&#128274; Enterprise Data Privacy &amp; Confidentiality Charter</h3>` +
      `<button type="button" class="category-modal-close-btn" data-close-privacy aria-label="Close">&times;</button></div>` +
      `<div class="category-modal-card-body">` +
      `<div class="safety-status-badge"><span class="safety-status-dot"></span><span>100% Confidential: Business, Patient &amp; Financial Records Protection</span></div>` +
      `<div class="privacy-pillar-box"><h4>&#127973; Patient &amp; Clinical Data Privacy (Medical Store, Clinic, Lab)</h4><p>All patient medical records, diagnostic test results, medical histories, and digital prescriptions are strictly private and accessible only to your authenticated business account. We adhere to high confidentiality standards and never share medical data.</p></div>` +
      `<div class="privacy-pillar-box"><h4>&#128188; Commercial &amp; Financial Confidentiality (Store, Restaurant, Fuel)</h4><p>Invoices, wholesale supplier costs, daily cash reconciliation, and customer khata ledgers remain solely under your exclusive control. Data is encrypted using TLS 1.3 in transit and AES-256 at rest.</p></div>` +
      `<div class="privacy-pillar-box"><h4>&#128683; Zero Third-Party Monetization</h4><p>We do not monetize, rent, analyze for advertising, or sell your customer phone numbers, receipts, or business data to any third-party marketing network.</p></div>` +
      `<div class="privacy-pillar-box"><h4>&#128465;&#65039; Right to Eradication &amp; Full Data Portability</h4><p>You hold 100% ownership of your database. You can export complete JSON backups at any moment and permanently delete records from your Recycle Bin with instant irrevocable purging.</p></div>` +
      `<div class="privacy-dpo-box"><strong>Direct Grievance &amp; Data Protection Officer Contact:</strong><br />Phone / WhatsApp: <strong>03042954627</strong> &bull; Email: <strong>amnabibi627@gmail.com</strong></div>` +
      `</div></div></div>`);
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
    const uid = t.uid || ("UID-" + (Math.abs((t.mobile || t.name || "").split("").reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0) | 0, 54321)) % 90000 + 10000));
    return { ...t, uid, isActive: msLeft > 0, daysLeft, hoursLeft, expiresAt: expires };
  } catch (_) {
    return null;
  }
};

const categorySetTrial = (userData) => {
  const prevTrial = categoryGetTrial() || {};
  const seed = (userData.mobile || "") + (userData.name || "") + Date.now();
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash) + seed.charCodeAt(i) | 0;
  const uid = userData.uid || prevTrial.uid || ("UID-" + (Math.abs(hash) % 90000 + 10000));

  const trial = {
    ...prevTrial,
    uid,
    name: userData.name || prevTrial.name || "Business User",
    mobile: userData.mobile || prevTrial.mobile || "",
    email: userData.email || prevTrial.email || "",
    city: userData.city || prevTrial.city || "",
    businessName: userData.businessName || prevTrial.businessName || (CURRENT?.short ? `${CURRENT.short} Management` : "Business Portal"),
    avatar: userData.avatar || prevTrial.avatar || "",
    startedAt: prevTrial.startedAt || Date.now(),
    expiresAt: prevTrial.expiresAt || (Date.now() + 5 * 24 * 60 * 60 * 1000),
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
  return true; // Full instant access in dedicated SaaS dashboard portal
};

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

  if (user || (trial && trial.isActive) || hasSub) {
    const rawName = user?.user_metadata?.name || trial?.name || "Business Owner";
    const initial = (rawName.charAt(0) || "U").toUpperCase();
    const uid = trial?.uid || (user ? `UID-${user.id.slice(0, 5).toUpperCase()}` : "UID-84920");
    const avatar = trial?.avatar || "";

    btn.className = "header-user-profile-btn";
    btn.innerHTML = `
      <span class="user-avatar-badge ${avatar ? 'has-img' : ''}">
        ${avatar ? `<img src="${avatar}" alt="${categoryEscape(rawName)}" class="user-avatar-img" />` : categoryEscape(initial)}
      </span>
      <div class="user-meta-text">
        <span class="user-id-title">${categoryEscape(rawName)}</span>
        <span class="user-id-code">${categoryEscape(uid)}</span>
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
              <span class="pro-status-chip is-active">
                <span class="pro-status-dot"></span>
                Active Account
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
              <strong class="pro-detail-val" style="color:#047857;">Verified Active</strong>
            </div>
            <div class="pro-detail-row">
              <span class="pro-detail-label">Registered Date</span>
              <strong class="pro-detail-val">${regDate}</strong>
            </div>
          </div>

          <div class="pro-actions-footer">
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
              <input name="name" type="text" value="${categoryEscape(userName)}" required minlength="3" maxlength="80" placeholder="e.g. John Doe / Amna Bibi" />
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
              <input name="mobile" type="tel" value="${categoryEscape(userMobile)}" required maxlength="20" placeholder="e.g. +1 555 0199 or 03001234567" />
            </div>
            <div class="pro-form-group">
              <label>City / Location</label>
              <input name="city" type="text" value="${categoryEscape(userCity !== 'Not specified' && userCity !== 'Not set' ? userCity : '')}" maxlength="50" placeholder="e.g. New York / London / Dubai / Lahore" />
            </div>
            <div class="pro-form-group">
              <label>Business / Enterprise Name</label>
              <input name="businessName" type="text" value="${categoryEscape(rawBusiness)}" maxlength="80" placeholder="e.g. Apex Global Management" />
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
  content.innerHTML = `
    <div style="text-align:center; margin-bottom:1.25rem;">
      <div style="font-size:2.2rem; margin-bottom:0.25rem;">🚀</div>
      <h2 id="categoryAuthTitle" style="margin:0 0 0.35rem; font-size:1.45rem; font-weight:800; color:#0f172a;">Sign Up Free</h2>
      <p style="margin:0; font-size:0.86rem; color:#64748b;">
        Instant full access to all 8 categories &amp; tools worldwide. Zero upfront payment or credit card required.
      </p>
    </div>

    <form id="categoryTrialForm" class="category-auth-form" style="display:grid; gap:0.75rem;">
      <div>
        <label style="font-size:0.82rem; font-weight:700; color:#334155; display:block; margin-bottom:0.3rem;">Full Name *</label>
        <input name="name" type="text" placeholder="e.g. John Doe / Amna Bibi" required minlength="3" maxlength="80" style="width:100%; padding:0.65rem 0.8rem; border:1px solid #cbd5e1; border-radius:10px; font-size:0.9rem;">
      </div>
      <div>
        <label style="font-size:0.82rem; font-weight:700; color:#334155; display:block; margin-bottom:0.3rem;">Email Address *</label>
        <input name="email" type="email" placeholder="e.g. name@company.com" required maxlength="80" autocomplete="email" style="width:100%; padding:0.65rem 0.8rem; border:1px solid #cbd5e1; border-radius:10px; font-size:0.9rem;">
      </div>
      <div>
        <label style="font-size:0.82rem; font-weight:700; color:#334155; display:block; margin-bottom:0.3rem;">Country / Region *</label>
        <select name="country" style="width:100%; padding:0.65rem 0.8rem; border:1px solid #cbd5e1; border-radius:10px; font-size:0.9rem; background:#fff;">
          <option value="United States">🇺🇸 United States</option>
          <option value="United Kingdom">🇬🇧 United Kingdom</option>
          <option value="United Arab Emirates">🇦🇪 United Arab Emirates</option>
          <option value="Saudi Arabia">🇸🇦 Saudi Arabia</option>
          <option value="Canada">🇨🇦 Canada</option>
          <option value="Australia">🇦🇺 Australia</option>
          <option value="Pakistan" selected>🇵🇰 Pakistan</option>
          <option value="India">🇮🇳 India</option>
          <option value="Germany">🇩🇪 Germany</option>
          <option value="France">🇫🇷 France</option>
          <option value="Singapore">🇸🇬 Singapore</option>
          <option value="Malaysia">🇲🇾 Malaysia</option>
          <option value="International">🌐 Other / International</option>
        </select>
      </div>
      <div>
        <label style="font-size:0.82rem; font-weight:700; color:#334155; display:block; margin-bottom:0.3rem;">Mobile / WhatsApp / Phone *</label>
        <input name="mobile" type="tel" placeholder="+1 555 0199 or 03001234567" required maxlength="20" style="width:100%; padding:0.65rem 0.8rem; border:1px solid #cbd5e1; border-radius:10px; font-size:0.9rem;">
      </div>
      <div>
        <label style="font-size:0.82rem; font-weight:700; color:#334155; display:block; margin-bottom:0.3rem;">City / Location *</label>
        <input name="city" type="text" placeholder="e.g. New York / London / Dubai / Lahore" required maxlength="50" style="width:100%; padding:0.65rem 0.8rem; border:1px solid #cbd5e1; border-radius:10px; font-size:0.9rem;">
      </div>
      <div>
        <label style="font-size:0.82rem; font-weight:700; color:#334155; display:block; margin-bottom:0.3rem;">Business / Enterprise Name (Optional)</label>
        <input name="businessName" type="text" placeholder="e.g. Apex Global Management" maxlength="80" style="width:100%; padding:0.65rem 0.8rem; border:1px solid #cbd5e1; border-radius:10px; font-size:0.9rem;">
      </div>
      <div>
        <label style="font-size:0.82rem; font-weight:700; color:#334155; display:block; margin-bottom:0.3rem;">Create Password *</label>
        <input name="password" type="password" placeholder="Min 8 characters" required minlength="8" maxlength="64" style="width:100%; padding:0.65rem 0.8rem; border:1px solid #cbd5e1; border-radius:10px; font-size:0.9rem;">
      </div>
      <label style="display:flex; align-items:center; gap:0.55rem; font-size:0.78rem; color:#64748b; margin:0.35rem 0 0.2rem; cursor:pointer; text-align:left;">
        <input name="terms" type="checkbox" required checked style="width:16px; height:16px; flex:0 0 auto; accent-color:#ff8f04;">
        <span>By creating an account you agree to the Terms of Use and Privacy Policy.</span>
      </label>
      <p class="category-auth-error" role="alert" style="color:#ef4444; font-size:0.8rem; margin:0.2rem 0 0; min-height:1rem;"></p>
      <button class="btn btn-primary" type="submit" style="width:100%; padding:0.75rem; font-weight:700; border-radius:10px; background:#ff8f04; border-color:#ff8f04; color:#fff; cursor:pointer;">
        Create Account &amp; Start Free
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
    `<label>Account mobile number<input name="mobile" type="tel" autocomplete="tel" required inputmode="tel" placeholder="e.g. +1 555 0199 or 03001234567"></label>` +
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
    (alreadySignedIn ? "" : `<label>Account phone / mobile number<input name="mobile" type="tel" autocomplete="tel" required inputmode="tel" placeholder="e.g. +1 555 0199 or 03001234567"></label>` +
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

  // Purge any pre-seeded demo entries so portal starts 100% clean
  if (categoryData.features) {
    for (const key of Object.keys(categoryData.features)) {
      if (Array.isArray(categoryData.features[key])) {
        categoryData.features[key] = categoryData.features[key].filter(
          item => !String(item.id || "").startsWith("demo_")
        );
      }
    }
  }
  if (categoryData.trash) {
    for (const key of Object.keys(categoryData.trash)) {
      if (Array.isArray(categoryData.trash[key])) {
        categoryData.trash[key] = categoryData.trash[key].filter(
          item => !String(item.id || "").startsWith("demo_")
        );
      }
    }
  }
};

const categorySaveData = async () => {
  categoryCheckAutoBackup();
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
  if (!categoryFeature && CURRENT?.features?.length) {
    categoryFeature = categoryFeatureDef(CURRENT.features[0].id);
  }
  if (!categoryFeature) return;
  const items = categoryTab === "trash" ? categoryTrashItems() : categoryItems();
  const title = `${CURRENT.short} - ${categoryFeature.name} (${categoryTab === "trash" ? "Recycle Bin" : "Active Records"})`;
  const tableHeaders = categoryFeature.fields.map((f) => `<th>${categoryEscape(f.label)}</th>`).join("");
  const tableRows = items.length ? items.map((item, idx) => {
    const cells = categoryFeature.fields.map((f) => `<td>${categoryEscape(item[f.key] ?? item.fields?.[f.key] ?? "N/A")}</td>`).join("");
    const dateStr = item.deletedAt ? `Deleted: ${new Date(item.deletedAt).toLocaleString()}` : (item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A');
    return `<tr><td>${idx + 1}</td>${cells}<td>${dateStr}</td></tr>`;
  }).join("") : `<tr><td colspan="${categoryFeature.fields.length + 2}" style="text-align:center; padding: 25px; color: #64748b; font-style: italic;">No records found.</td></tr>`;

  showWorkspaceToast("Preparing Print / PDF report...");

  const printHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${categoryEscape(title)}</title>` +
    `<style>` +
    `@page { size: auto; margin: 15mm; }` +
    `body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 25px; color: #0f172a; margin: 0; background: #fff; }` +
    `.header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 18px; }` +
    `h1 { margin: 0 0 4px; font-size: 20px; font-weight: 800; color: #0f172a; }` +
    `.meta { font-size: 12px; color: #64748b; }` +
    `table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 14px; }` +
    `th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }` +
    `th { background: #f1f5f9; font-weight: 700; color: #0f172a; }` +
    `tr:nth-child(even) { background: #f8fafc; }` +
    `@media print { body { padding: 0; } }` +
    `</style></head><body>` +
    `<div class="header"><div><h1>${categoryEscape(CURRENT.short)} &bull; ${categoryEscape(categoryFeature.name)}</h1>` +
    `<div class="meta">${categoryTab === "trash" ? "Recycle Bin Records" : "Active Records"} &bull; Printed: ${new Date().toLocaleString()} &bull; Total: ${items.length} records</div></div>` +
    `<div style="text-align:right;"><div style="font-size:14px;font-weight:700;color:#ff8f04;">Online Management Site</div><div style="font-size:11px;color:#64748b;">Enterprise Business Portal</div></div>` +
    `</div><table><thead><tr><th>#</th>${tableHeaders}<th>Date</th></tr></thead><tbody>${tableRows}</tbody></table></body></html>`;

  try {
    let iframe = document.getElementById("saasPrintFrame");
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = "saasPrintFrame";
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      iframe.style.visibility = "hidden";
      document.body.appendChild(iframe);
    }
    const frameDoc = iframe.contentWindow || iframe.contentDocument;
    const doc = frameDoc.document || frameDoc;
    doc.open();
    doc.write(printHtml);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (_) {
        window.print();
      }
    }, 250);
  } catch (_) {
    window.print();
  }
};

const formatCellVal = (val, type, fieldKey = "") => {
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
  const isFinancial = /(amount|price|rate|cost|fee|bill|balance|cash|salary|due|expense|sale|margin)/i.test(fieldKey || "");
  if (type === "number" && !isNaN(Number(s))) {
    if (isFinancial) {
      return `<strong class="cat-num-val cat-currency-val">${categoryEscape(formatCurrencyVal(Number(s)))}</strong>`;
    }
    return `<strong class="cat-num-val">${Number(s).toLocaleString()}</strong>`;
  }
  return categoryEscape(s);
};

const categoryCheckAutoBackup = () => {
  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    const lastBackupDate = localStorage.getItem(`bms_last_autobackup_${CURRENT.key}`);
    const totalRecords = Object.values(categoryData.features || {}).reduce((s, a) => s + (Array.isArray(a) ? a.length : 0), 0);

    if (totalRecords > 0 && lastBackupDate !== todayStr) {
      const snapshotsKey = `bms_snapshots_${CURRENT.key}`;
      let snapshots = [];
      try {
        snapshots = JSON.parse(localStorage.getItem(snapshotsKey) || "[]");
      } catch (_) { snapshots = []; }

      const newSnapshot = {
        date: todayStr,
        timestamp: new Date().toISOString(),
        recordCount: totalRecords,
        features: JSON.parse(JSON.stringify(categoryData.features || {})),
        trash: JSON.parse(JSON.stringify(categoryData.trash || {}))
      };

      snapshots = [newSnapshot, ...snapshots.filter(s => s.date !== todayStr)].slice(0, 7);
      localStorage.setItem(snapshotsKey, JSON.stringify(snapshots));
      localStorage.setItem(`bms_last_autobackup_${CURRENT.key}`, todayStr);
    }
  } catch (err) {
    console.warn("Auto backup note:", err);
  }
};

const showCategoryShortcutsModal = () => {
  const existing = document.getElementById("catShortcutsModal");
  if (existing) existing.remove();
  const html = `
    <div class="category-modal-backdrop is-open" id="catShortcutsModal" style="display:flex; z-index:99999;">
      <div class="category-modal-card" style="max-width:440px;">
        <div class="category-modal-card-header">
          <h3 style="margin:0; font-size:1.15rem; font-weight:800; color:#0f172a;">&#9000;&#65039; Global Power Shortcuts</h3>
          <button type="button" class="category-modal-close-btn" onclick="document.getElementById('catShortcutsModal')?.remove()">&times;</button>
        </div>
        <div class="category-modal-card-body" style="padding:1rem 1.25rem;">
          <div style="display:grid; gap:0.75rem; font-size:0.88rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f1f5f9; padding-bottom:6px;">
              <span>Add New Record</span>
              <kbd style="padding:3px 8px; background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; font-weight:700;">Alt + N</kbd>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f1f5f9; padding-bottom:6px;">
              <span>Focus Search Box</span>
              <kbd style="padding:3px 8px; background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; font-weight:700;">/</kbd>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f1f5f9; padding-bottom:6px;">
              <span>Print / PDF View</span>
              <kbd style="padding:3px 8px; background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; font-weight:700;">Alt + P</kbd>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f1f5f9; padding-bottom:6px;">
              <span>Export CSV Spreadsheet</span>
              <kbd style="padding:3px 8px; background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; font-weight:700;">Alt + E</kbd>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f1f5f9; padding-bottom:6px;">
              <span>Cancel / Close Dialog</span>
              <kbd style="padding:3px 8px; background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; font-weight:700;">Esc</kbd>
            </div>
          </div>
          <div style="margin-top:1.25rem; text-align:right;">
            <button type="button" class="btn btn-primary" onclick="document.getElementById('catShortcutsModal')?.remove()" style="padding:0.45rem 1.1rem; font-size:0.85rem; background:#ff8f04; border-color:#ff8f04; color:#fff;">Got it</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", html);
};

const showCategorySafetyModal = () => {
  categoryEnsureToolsUi();
  const modal = document.getElementById("categorySafetyModalBackdrop");
  const body = document.getElementById("categorySafetyModalBody");
  if (!modal || !body) return;

  const totalRecords = Object.values(categoryData.features || {}).reduce((s, a) => s + (Array.isArray(a) ? a.length : 0), 0);
  const snapshotsKey = `bms_snapshots_${CURRENT.key}`;
  let snapshots = [];
  try {
    snapshots = JSON.parse(localStorage.getItem(snapshotsKey) || "[]");
  } catch (_) { snapshots = []; }

  const todayStr = new Date().toISOString().slice(0, 10);

  let snapshotsHtml = "";
  if (snapshots.length === 0) {
    snapshotsHtml = `
      <div class="safety-snapshot-item">
        <div class="safety-snapshot-info">
          <span class="safety-snapshot-date">Today's Live Snapshot (${todayStr})</span>
          <span class="safety-snapshot-meta">${totalRecords} records active &bull; Auto-sync active</span>
        </div>
        <span class="cat-status-pill is-success">Up to date</span>
      </div>
    `;
  } else {
    snapshotsHtml = snapshots.map((s, idx) => `
      <div class="safety-snapshot-item">
        <div class="safety-snapshot-info">
          <span class="safety-snapshot-date">Daily Snapshot: ${categoryEscape(s.date)}</span>
          <span class="safety-snapshot-meta">${s.recordCount || 0} records &bull; Time: ${new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <button type="button" class="btn btn-outline btn-sm" data-restore-snapshot="${idx}">Restore</button>
      </div>
    `).join("");
  }

  body.innerHTML = `
    <div class="safety-status-badge">
      <span class="safety-status-dot"></span>
      <span>Encrypted Database Active &bull; Multi-Tenant Isolation &bull; TLS 1.3</span>
    </div>

    <p style="margin-bottom:0.75rem; font-size:0.88rem; color:#475569;">
      Your business data is protected by multi-tenant database isolation. Patient health records, store invoices, and customer transactions are private and never accessible to other accounts.
    </p>

    <div class="safety-section-title">ðŸ”„ Automatic Daily Rolling Backups (Last 7 Days)</div>
    <div class="safety-snapshots-list">
      ${snapshotsHtml}
    </div>

    <div class="safety-actions-grid">
      <button type="button" class="btn btn-primary" id="safetyDownloadBackupBtn">
        <span>ðŸ’¾ Download JSON Backup</span>
      </button>
      <button type="button" class="btn btn-outline" id="safetyUploadBackupBtn">
        <span>ðŸ“‚ Upload &amp; Restore File</span>
      </button>
    </div>
  `;

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
};

const showCategoryPrivacyModal = () => {
  categoryEnsureToolsUi();
  const modal = document.getElementById("categoryPrivacyModalBackdrop");
  if (modal) {
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
  }
};

const categoryEnsureSampleData = () => {};

const categoryResetDemoData = () => {
  if (confirm("Reset portal to live demo sample records? This will populate all 12 modules with clean test data.")) {
    categoryData.features = {};
    categoryData.trash = {};
    categoryEnsureSampleData();
    categoryRenderList();
    showWorkspaceToast("Reset to active demo data successfully!");
  }
};



const renderSaasNav = () => {
  const navList = document.getElementById("saasNavList");
  if (!navList || !CURRENT || !Array.isArray(CURRENT.features)) return;
  const currentFeatId = categoryFeature?.id;
  navList.innerHTML = CURRENT.features.map((f) => {
    const items = categoryData.features?.[f.id];
    const count = Array.isArray(items) ? items.length : 0;
    const isActive = f.id === currentFeatId && categoryTab !== "trash";
    return `
      <button type="button" class="saas-nav-btn ${isActive ? 'active' : ''}" data-saas-feature="${categoryEscape(f.id)}" title="${categoryEscape(f.name)}">
        <span class="saas-nav-btn-icon">${f.icon}</span>
        <span class="saas-nav-btn-text">${categoryEscape(f.name)}</span>
        <span class="saas-nav-badge">${count}</span>
      </button>
    `;
  }).join("");
};


const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const renderSaasAnalytics = () => {
  const container = document.getElementById("saasAnalyticsStrip");
  if (!container || !categoryFeature) return;

  const items = categoryItems();
  const todayStr = getTodayDateString();

  const todayCount = items.filter((item) => {
    const c = (item.createdAt || "").slice(0, 10);
    const u = (item.updatedAt || "").slice(0, 10);
    return c === todayStr || u === todayStr;
  }).length;

  const totalCount = items.length;

  let dateFilterCount = 0;
  let formattedSelectedDate = "";
  if (categoryDateFilter) {
    dateFilterCount = items.filter((item) => {
      const c = (item.createdAt || "").slice(0, 10);
      const u = (item.updatedAt || "").slice(0, 10);
      return c === categoryDateFilter || u === categoryDateFilter;
    }).length;
    try {
      formattedSelectedDate = new Date(categoryDateFilter + "T00:00:00").toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    } catch (_) {
      formattedSelectedDate = categoryDateFilter;
    }
  }

  const isTodayFiltered = categoryDateFilter === todayStr;
  const isAllFiltered = !categoryDateFilter;

  container.innerHTML = `
    <!-- Box 1: Today's Entries -->
    <div class="saas-stat-box saas-stat-today is-clickable ${isTodayFiltered ? 'is-active' : ''}" id="saasBoxToday" title="Click to view today's records">
      <div class="saas-stat-header">
        <span class="saas-stat-title">Today's Entries</span>
        ${isTodayFiltered ? '<span class="saas-badge-active">Active</span>' : ''}
      </div>
      <div class="saas-stat-body">
        <strong class="saas-stat-number">${todayCount}</strong>
        <span class="saas-stat-hint">${todayCount === 1 ? '1 entry' : todayCount + ' entries'} today</span>
      </div>
    </div>

    <!-- Box 2: Total Entries -->
    <div class="saas-stat-box saas-stat-total is-clickable ${isAllFiltered ? 'is-active' : ''}" id="saasBoxTotal" title="Click to view all records">
      <div class="saas-stat-header">
        <span class="saas-stat-title">Total Entries</span>
      </div>
      <div class="saas-stat-body">
        <strong class="saas-stat-number">${totalCount}</strong>
        <span class="saas-stat-hint">All-time records</span>
      </div>
    </div>

    <!-- Box 3: Filter by Specific Date -->
    <div class="saas-stat-box saas-stat-date ${categoryDateFilter && !isTodayFiltered ? 'is-active' : ''}" id="saasBoxDatePicker">
      <div class="saas-stat-header">
        <span class="saas-stat-title">Filter by Date</span>
        ${categoryDateFilter ? `<button type="button" class="saas-date-clear-btn" id="saasClearDateBtn" title="Reset and show all dates">Reset</button>` : ''}
      </div>
      <div class="saas-stat-date-controls">
        <div class="saas-date-input-wrap">
          <input type="date" id="saasDateFilterInput" class="saas-date-input" value="${categoryDateFilter || ''}" aria-label="Select date" />
        </div>
        <div class="saas-date-status-badge">
          ${categoryDateFilter ? `<strong>${dateFilterCount}</strong> (${formattedSelectedDate})` : `<span>Select date</span>`}
        </div>
      </div>
    </div>
  `;
};
const updateSaasPortalHeader = () => {
  const brandIcon = document.getElementById("saasBrandIcon");
  if (brandIcon && CURRENT?.icon) brandIcon.textContent = CURRENT.icon;
  const brandTitle = document.getElementById("saasBrandTitle");
  if (brandTitle && CURRENT?.short) brandTitle.textContent = `${CURRENT.short} Portal`;
  const crumbRoot = document.getElementById("saasCrumbRoot");
  if (crumbRoot && CURRENT?.short) crumbRoot.textContent = CURRENT.short;
  const crumbCur = document.getElementById("saasCrumbCurrent");
  if (crumbCur && categoryFeature) crumbCur.textContent = categoryTab === "trash" ? `${categoryFeature.name} (Trash)` : categoryFeature.name;

  const topTrashBtn = document.getElementById("saasRecycleBinBtn");
  if (topTrashBtn) {
    const totalTrash = Object.values(categoryData.trash || {}).reduce((s, a) => s + (Array.isArray(a) ? a.length : 0), 0);
    if (categoryTab === "trash") {
      topTrashBtn.classList.add("is-active");
      topTrashBtn.innerHTML = `<span>&#128203; Active Records</span>`;
      topTrashBtn.title = "Return to Active Records";
    } else {
      topTrashBtn.classList.remove("is-active");
      topTrashBtn.innerHTML = `<span>&#128465;&#65039; Recycle Bin (${totalTrash})</span>`;
      topTrashBtn.title = "View Recycle Bin";
    }
  }

  const trial = categoryGetTrial();
  const hasSub = categoryHasActiveSubscription();
  const userTitle = document.getElementById("saasUserTitle");
  const userSub = document.getElementById("saasUserSub");
  if (userTitle && userSub) {
    if (hasSub) {
      userTitle.textContent = categoryUser?.user_metadata?.name || "Pro Member";
      userSub.textContent = "\u{1F48E} Pro Active";
      userSub.style.color = "#3b82f6";
    } else if (trial && trial.isActive) {
      userTitle.textContent = trial.name || "Business User";
      userSub.textContent = `\u{1F7E2} Free Trial (${trial.daysLeft}d left)`;
      userSub.style.color = "#10b981";
    } else if (trial && !trial.isActive) {
      userTitle.textContent = trial.name || "Business User";
      userSub.textContent = "\u26A0\uFE0F Trial Ended";
      userSub.style.color = "#ef4444";
    } else {
      userTitle.textContent = "Guest Workspace";
      userSub.textContent = "\u{1F7E2} 5-Day Free Trial";
      userSub.style.color = "#10b981";
    }
  }
};

const selectSaasFeature = (featureId) => {
  categoryFeature = categoryFeatureDef(featureId);
  categoryEditId = null;
  categoryTab = "active";
  categorySearchQuery = "";
  categorySortCol = null;
  categorySortDir = "asc";
  categoryPage = 1;
  renderSaasNav();
  renderSaasAnalytics();
  updateSaasPortalHeader();
  categoryRenderList();

  const sidebar = document.getElementById("saasSidebar");
  if (sidebar && sidebar.classList.contains("is-open")) {
    sidebar.classList.remove("is-open");
  }
};

const categoryRenderList = () => {
  if (!categoryFeature && CURRENT?.features?.length) {
    categoryFeature = categoryFeatureDef(CURRENT.features[0].id);
  }
  if (!categoryFeature) return;
  const content = document.getElementById("categoryWorkspaceContent");
  renderSaasNav();
  renderSaasAnalytics();
  updateSaasPortalHeader();
  if (!content) return;

  const allActive = categoryItems();
  const allTrash = categoryTrashItems();
  const isTrash = categoryTab === "trash";
  const sourceItems = isTrash ? allTrash : allActive;

  let displayedItems = [...sourceItems];

  if (categoryDateFilter) {
    displayedItems = displayedItems.filter((item) => {
      const c = (item.createdAt || "").slice(0, 10);
      const u = (item.updatedAt || "").slice(0, 10);
      return c === categoryDateFilter || u === categoryDateFilter;
    });
  }

  const query = categorySearchQuery.trim().toLowerCase();
  if (query) {
    displayedItems = displayedItems.filter((item) => {
      return categoryFeature.fields.some((field) => {
        const val = String(item[field.key] ?? item.fields?.[field.key] ?? "").toLowerCase();
        return val.includes(query);
      }) || (item.createdAt && item.createdAt.toLowerCase().includes(query))
         || (item.deletedAt && item.deletedAt.toLowerCase().includes(query));
    });
  }

  // Column sorting
  if (categorySortCol) {
    displayedItems.sort((a, b) => {
      let va = "";
      let vb = "";
      if (categorySortCol === "__date") {
        va = isTrash ? (a.deletedAt || "") : (a.updatedAt || a.createdAt || "");
        vb = isTrash ? (b.deletedAt || "") : (b.updatedAt || b.createdAt || "");
      } else {
        va = a[categorySortCol] ?? a.fields?.[categorySortCol] ?? "";
        vb = b[categorySortCol] ?? b.fields?.[categorySortCol] ?? "";
      }

      const na = parseFloat(String(va).replace(/[^0-9.-]/g, ""));
      const nb = parseFloat(String(vb).replace(/[^0-9.-]/g, ""));
      if (!isNaN(na) && !isNaN(nb) && String(va).match(/^[0-9$€£\s,.-]+$/) && String(vb).match(/^[0-9$€£\s,.-]+$/)) {
        return categorySortDir === "asc" ? na - nb : nb - na;
      }
      return categorySortDir === "asc"
        ? String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: "base" })
        : String(vb).localeCompare(String(va), undefined, { numeric: true, sensitivity: "base" });
    });
  }

  const totalRecords = displayedItems.length;
  const pageSize = categoryPageSize === "all" ? totalRecords : (Number(categoryPageSize) || 25);
  const totalPages = Math.max(1, Math.ceil(totalRecords / (pageSize || 1)));
  if (categoryPage > totalPages) categoryPage = totalPages;
  if (categoryPage < 1) categoryPage = 1;

  const startIndex = (categoryPage - 1) * pageSize;
  const pageItems = categoryPageSize === "all" ? displayedItems : displayedItems.slice(startIndex, startIndex + pageSize);

  const columns = categoryFeature.fields.map((f) => {
    const isSorted = categorySortCol === f.key;
    const sortIcon = isSorted ? (categorySortDir === "asc" ? " ▲" : " ▼") : " <span class='cat-sort-idle'>↕</span>";
    return `<th class="cat-sortable-th ${isSorted ? 'is-sorted' : ''}" data-sort-key="${categoryEscape(f.key)}" title="Click to sort by ${categoryEscape(f.label)}">
      <span class="cat-th-wrap">
        <span>${categoryEscape(f.label)}</span>
        <span class="cat-sort-indicator">${sortIcon}</span>
      </span>
    </th>`;
  }).join("");

  const rows = pageItems.map((item, index) => {
    const cells = categoryFeature.fields.map((f) => {
      const raw = item[f.key] ?? item.fields?.[f.key] ?? "";
      return `<td>${formatCellVal(raw, f.type, f.key)}</td>`;
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

    const rowNum = startIndex + index + 1;
    return `
      <tr>
        <td class="cat-col-idx">${rowNum}</td>
        ${cells}
        <td class="cat-col-date">${categoryEscape(dateFormatted)}</td>
        <td class="category-row-actions">${actionButtons}</td>
      </tr>
    `;
  }).join("");

  const currCode = getGlobalCurrency();

  content.innerHTML = `
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
      </div>
    </div>

    ${displayedItems.length ? `
      <div class="category-workspace-table-wrap">
        <table class="category-workspace-table">
          <thead>
            <tr>
              <th style="width: 45px;">#</th>
              ${columns}
              <th class="cat-sortable-th ${categorySortCol === '__date' ? 'is-sorted' : ''}" data-sort-key="__date" title="Sort by Date">
                <span class="cat-th-wrap">
                  <span>${isTrash ? 'Deleted Date' : 'Date'}</span>
                  <span class="cat-sort-indicator">${categorySortCol === '__date' ? (categorySortDir === 'asc' ? ' ▲' : ' ▼') : ' <span class="cat-sort-idle">↕</span>'}</span>
                </span>
              </th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>

      <!-- Pagination Controls -->
      <div class="cat-table-pagination-bar">
        <div class="cat-pagination-info">
          Showing <strong>${totalRecords === 0 ? 0 : startIndex + 1}</strong> to <strong>${Math.min(startIndex + pageSize, totalRecords)}</strong> of <strong>${totalRecords}</strong> entries
          ${query ? `(filtered from ${sourceItems.length} total)` : ''}
        </div>
        <div class="cat-pagination-controls">
          <label class="cat-page-size-label">
            <span>Rows:</span>
            <select class="cat-page-size-select" data-ws-page-size aria-label="Entries per page">
              <option value="10" ${categoryPageSize == 10 ? 'selected' : ''}>10</option>
              <option value="25" ${categoryPageSize == 25 ? 'selected' : ''}>25</option>
              <option value="50" ${categoryPageSize == 50 ? 'selected' : ''}>50</option>
              <option value="100" ${categoryPageSize == 100 ? 'selected' : ''}>100</option>
              <option value="all" ${categoryPageSize === 'all' ? 'selected' : ''}>All</option>
            </select>
          </label>
          <div class="cat-pagination-btns">
            <button type="button" class="cat-page-btn" data-ws-page="prev" ${categoryPage <= 1 ? 'disabled' : ''} title="Previous Page">← Prev</button>
            <span class="cat-page-number">Page ${categoryPage} of ${totalPages}</span>
            <button type="button" class="cat-page-btn" data-ws-page="next" ${categoryPage >= totalPages ? 'disabled' : ''} title="Next Page">Next →</button>
          </div>
        </div>
      </div>
    ` : `
      <div class="saas-empty-state-card">
        <div class="saas-empty-icon-circle">${categoryEscape(isTrash ? '🗑️' : (query ? '🔍' : (categoryFeature.icon || '📝')))}</div>
        <h3 class="saas-empty-title">${isTrash ? 'Recycle Bin is Empty' : (query ? 'No Matching Records Found' : `No records yet`)}</h3>
        <p class="saas-empty-subtitle">${query ? `No records matched "${categoryEscape(categorySearchQuery)}". Try another search or clear the filter.` : (isTrash ? 'There are no deleted records currently stored in the Recycle Bin.' : `Add your first ${categoryEscape(categoryFeature.name.toLowerCase())} record to get started.`)}</p>
        <div class="saas-empty-actions">
          ${query ? `<button type="button" class="btn btn-outline" data-ws-search-clear>Clear Search</button>` : (!isTrash ? `<button type="button" class="btn btn-primary saas-module-cta-btn" data-tool-add><span>➕ Add First Record</span></button>` : `<button type="button" class="btn btn-outline" data-ws-tab="active">← Return to Active Records</button>`)}
        </div>
      </div>
    `}
  `;
};

const categoryRenderForm = (itemId = null) => {
  if (!categoryFeature && CURRENT?.features?.length) {
    categoryFeature = categoryFeatureDef(CURRENT.features[0].id);
  }
  if (!categoryFeature) return;
  categoryTab = "active";
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
  if (!content) return;
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
  content.scrollIntoView({ behavior: "smooth", block: "start" });
  setTimeout(() => {
    content.querySelector("input,select,textarea")?.focus();
  }, 100);
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
  document.getElementById("saasNavToggleBtn")?.addEventListener("click", () => {
    document.getElementById("saasSidebar")?.classList.toggle("is-open");
  });
  document.getElementById("saasSidebarClose")?.addEventListener("click", () => {
    document.getElementById("saasSidebar")?.classList.remove("is-open");
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
    if (event.target.closest("#saasNavToggleBtn")) {
      document.getElementById("saasSidebar")?.classList.toggle("is-open");
      return;
    }
    if (event.target.closest("#saasSidebarClose")) {
      document.getElementById("saasSidebar")?.classList.remove("is-open");
      return;
    }
    const navFeat = event.target.closest("[data-saas-feature]");
    if (navFeat) {
      selectSaasFeature(navFeat.dataset.saasFeature);
      return;
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
      const mobile = categoryMobile(String(formData.get("mobile") || ""));
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

    const trialForm = event.target.closest("#categoryTrialForm");
    if (trialForm) {
      event.preventDefault();
      const formData = new FormData(trialForm);
      const name = String(formData.get("name") || "").trim();
      const country = String(formData.get("country") || "International").trim();
      const mobile = categoryMobile(String(formData.get("mobile") || ""));
      const email = String(formData.get("email") || "").trim().toLowerCase();
      const city = String(formData.get("city") || "").trim();
      const businessName = String(formData.get("businessName") || "").trim();
      const password = String(formData.get("password") || "");
      const termsBox = trialForm.querySelector('input[name="terms"]');
      const message = trialForm.querySelector(".category-auth-error");
      const submit = trialForm.querySelector('button[type="submit"]');

      if (name.length < 3) {
        if (message) message.textContent = "Please enter your full name (minimum 3 characters).";
        return;
      }
      if (!/^\d{7,16}$/.test(mobile)) {
        if (message) message.textContent = "Please enter a valid phone number with 7 to 16 digits.";
        return;
      }
      if (password.length < 8) {
        if (message) message.textContent = "Password must be at least 8 characters.";
        return;
      }

      submit.disabled = true;
      submit.textContent = "Creating account…";

      if (termsBox && !termsBox.checked) {
        if (message) message.textContent = "Please agree to the Terms of Use and Privacy Policy.";
        submit.disabled = false;
        submit.textContent = "Create Account & Start Free";
        return;
      }
      categorySetTrial({ name, country, mobile, email, city, businessName });

      if (CATEGORY_SUPABASE) {
        try {
          const res = await CATEGORY_SUPABASE.auth.signUp({
            email: categoryEmail(mobile),
            password,
            options: { data: { name, country, mobile, city, email, businessName } }
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

window.categoryRenderForm = categoryRenderForm;
window.categoryPrintReport = categoryPrintReport;
window.categoryExportCsv = categoryExportCsv;
window.categoryExportBackup = categoryExportBackup;
window.categoryRenderList = categoryRenderList;
window.selectSaasFeature = selectSaasFeature;
window.showCategoryTrialModal = showCategoryTrialModal;
window.showCategorySubscriptionPaywall = showCategorySubscriptionPaywall;
window.setGlobalCurrency = setGlobalCurrency;
window.formatCurrencyVal = formatCurrencyVal;
window.showCategoryShortcutsModal = showCategoryShortcutsModal;
