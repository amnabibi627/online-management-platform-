// ============================================================
// Category page - 02-category-catalog.js
// Category catalog: titles, copy, icons and feature lists.
// Split from the original category.js during the 2026-11 refactor.
// Loaded in numeric order by the page HTML. Keep that order.
// ============================================================

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
