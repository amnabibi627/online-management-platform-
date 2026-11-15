// ===== Feature modules: every detail-card is a working CRUD module =====
(function () {
const BUILTIN_CATEGORIES = ["clinic", "academy", "restaurant", "generalstore", "beautysalon", "petrolpump", "medicalstore", "laboratory"];
const FEATURE_VERSION = 1;

const slugify = (s) =>
  String(s || "").trim().toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const F = (key, label, type, required, options) => ({ key, label, type, required: !!required, options: options || null });

const GENERIC_FEATURES = [
  { id: "records", name: "Records", icon: "📁", desc: "Store every important record digitally and find it in seconds.",
    fields: [F("title", "Record Title", "text", 1), F("date", "Date", "date", 1), F("details", "Details", "textarea", 0), F("status", "Status", "select", 1, ["Active", "Archived"])] },
  { id: "contacts", name: "Contacts", icon: "📇", desc: "Customers, vendors and partners in one clean contact book.",
    fields: [F("name", "Full Name", "text", 1), F("mobile", "Mobile Number", "tel", 1), F("email", "Email", "text", 0), F("address", "Address", "text", 0), F("notes", "Notes", "textarea", 0)] },
  { id: "invoices", name: "Invoices", icon: "🧾", desc: "Create invoices and track paid and pending payments.",
    fields: [F("invoice", "Invoice #", "text", 1), F("client", "Client / Customer", "text", 0), F("amount", "Amount", "number", 1), F("date", "Date", "date", 1), F("status", "Status", "select", 1, ["Paid", "Pending", "Partial"])] },
  { id: "products", name: "Products", icon: "📦", desc: "Catalog products with price, quantity and stock status.",
    fields: [F("product", "Product Name", "text", 1), F("category", "Category", "text", 0), F("price", "Price", "number", 1), F("qty", "Quantity", "number", 1), F("status", "Status", "select", 1, ["In Stock", "Low Stock", "Out of Stock"])] },
  { id: "staff", name: "Staff", icon: "🧑‍💼", desc: "Staff records, roles, shifts and joining dates.",
    fields: [F("name", "Full Name", "text", 1), F("role", "Role", "text", 1), F("mobile", "Mobile Number", "tel", 0), F("shift", "Shift", "text", 0), F("joined", "Joining Date", "date", 0)] },
  { id: "appointments", name: "Appointments", icon: "📅", desc: "Schedule appointments and never miss a booking.",
    fields: [F("client", "Client Name", "text", 1), F("date", "Date", "date", 1), F("time", "Time", "time", 1), F("service", "Service / Purpose", "text", 0), F("status", "Status", "select", 1, ["Pending", "Confirmed", "Done", "Cancelled"])] },
  { id: "tasks", name: "Tasks", icon: "✅", desc: "Assign tasks, set priorities and track progress.",
    fields: [F("title", "Task Title", "text", 1), F("assignee", "Assigned To", "text", 0), F("due", "Due Date", "date", 0), F("priority", "Priority", "select", 1, ["Low", "Medium", "High"]), F("status", "Status", "select", 1, ["Open", "In Progress", "Done"])] },
  { id: "expenses", name: "Expenses", icon: "💸", desc: "Record expenses and see where the money goes.",
    fields: [F("title", "Expense Title", "text", 1), F("amount", "Amount", "number", 1), F("date", "Date", "date", 1), F("category", "Category", "text", 0), F("notes", "Notes", "textarea", 0)] },
  { id: "sales", name: "Sales", icon: "💰", desc: "Log every sale with quantity, amount and payment mode.",
    fields: [F("date", "Date", "date", 1), F("item", "Item / Service", "text", 1), F("qty", "Quantity", "number", 1), F("amount", "Amount", "number", 1), F("payment", "Payment Mode", "select", 1, ["Cash", "Card", "Online", "Credit"])] },
  { id: "reports", name: "Reports", icon: "📊", desc: "Save quick reports with values, types and statuses.",
    fields: [F("title", "Report Title", "text", 1), F("date", "Date", "date", 1), F("value", "Value / Amount", "number", 0), F("type", "Type", "text", 0), F("status", "Status", "select", 1, ["Draft", "Final"])] },
  { id: "notes", name: "Notes", icon: "📝", desc: "Quick notes and reminders for your daily work.",
    fields: [F("title", "Note Title", "text", 1), F("note", "Note", "textarea", 1), F("date", "Date", "date", 1), F("tag", "Tag", "text", 0)] },
  { id: "settings", name: "Settings", icon: "⚙️", desc: "Simple name and value settings for this category.",
    fields: [F("name", "Setting Name", "text", 1), F("value", "Value", "text", 1), F("type", "Type", "select", 1, ["Text", "Number", "Yes / No"]), F("updated", "Last Updated", "date", 0)] }
];

const FEATURE_REGISTRY = {
  clinic: {
    "patient-records": { name: "Patient Records", icon: "📁", fields: [
      F("name", "Patient Name", "text", 1), F("mobile", "Mobile Number", "tel", 1), F("age", "Age", "number", 1),
      F("gender", "Gender", "select", 1, ["Male", "Female", "Other"]), F("address", "Address", "text", 0), F("blood", "Blood Group", "text", 0)] },
    "smart-appointments": { name: "Smart Appointments", icon: "📅", fields: [
      F("patient", "Patient Name", "text", 1), F("doctor", "Doctor", "text", 1), F("date", "Date", "date", 1),
      F("time", "Time", "time", 1), F("status", "Status", "select", 1, ["Pending", "Confirmed", "Completed", "Cancelled"])] },
    "opd-token-system": { name: "OPD Token System", icon: "🎫", fields: [
      F("token", "Token #", "text", 1), F("patient", "Patient Name", "text", 1), F("doctor", "Doctor", "text", 0),
      F("issued", "Issued Date", "date", 1), F("status", "Status", "select", 1, ["Waiting", "In Progress", "Done"])] },
    "digital-prescriptions": { name: "Digital Prescriptions", icon: "📝", fields: [
      F("patient", "Patient Name", "text", 1), F("doctor", "Doctor", "text", 1), F("medicines", "Medicines", "textarea", 1),
      F("date", "Date", "date", 1), F("notes", "Notes", "textarea", 0)] },
    "billing-and-payments": { name: "Billing & Payments", icon: "💳", fields: [
      F("invoice", "Invoice #", "text", 1), F("patient", "Patient Name", "text", 1), F("amount", "Amount", "number", 1),
      F("date", "Date", "date", 1), F("status", "Status", "select", 1, ["Paid", "Pending", "Partial"])] },
    "lab-tests-and-reports": { name: "Lab Tests & Reports", icon: "🧪", fields: [
      F("test", "Test Name", "text", 1), F("patient", "Patient Name", "text", 1), F("doctor", "Doctor", "text", 0),
      F("result", "Result", "textarea", 0), F("date", "Date", "date", 1)] },
    "doctor-profiles": { name: "Doctor Profiles", icon: "🧑‍⚕️", fields: [
      F("name", "Doctor Name", "text", 1), F("specialty", "Specialty", "text", 1), F("mobile", "Mobile Number", "tel", 0),
      F("timing", "Timings", "text", 0), F("fee", "Visit Fee", "number", 0)] },
    "staff-management": { name: "Staff Management", icon: "🧑‍🔧", fields: [
      F("name", "Full Name", "text", 1), F("role", "Role", "text", 1), F("shift", "Shift", "text", 0),
      F("mobile", "Mobile Number", "tel", 0), F("joined", "Joining Date", "date", 0)] },
    "pharmacy-stock": { name: "Pharmacy Stock", icon: "💊", fields: [
      F("item", "Medicine Item", "text", 1), F("qty", "Quantity", "number", 1), F("expiry", "Expiry Date", "date", 0),
      F("price", "Price", "number", 1), F("batch", "Batch #", "text", 0)] },
    "revenue-reports": { name: "Revenue Reports", icon: "📊", fields: [
      F("source", "Revenue Source", "text", 1), F("amount", "Amount", "number", 1), F("date", "Date", "date", 1),
      F("method", "Payment Method", "select", 0, ["Cash", "Card", "Online", "Other"])] },
    "expense-tracking": { name: "Expense Tracking", icon: "💸", fields: [
      F("title", "Expense Title", "text", 1), F("amount", "Amount", "number", 1), F("date", "Date", "date", 1),
      F("category", "Category", "text", 0), F("notes", "Notes", "textarea", 0)] },
    "patient-reminders": { name: "Patient Reminders", icon: "✉️", fields: [
      F("patient", "Patient Name", "text", 1), F("mobile", "Mobile Number", "tel", 1), F("channel", "Channel", "select", 1, ["SMS", "WhatsApp", "Call"]),
      F("due", "Due Date", "date", 1), F("message", "Message", "textarea", 0)] }
  },
  academy: {
    "student-profiles": { name: "Student Profiles", icon: "👨‍🎓", fields: [
      F("name", "Student Name", "text", 1), F("mobile", "Mobile Number", "tel", 1), F("class", "Class / Batch", "text", 1),
      F("guardian", "Guardian Name", "text", 0), F("address", "Address", "textarea", 0)] },
    "course-management": { name: "Course Management", icon: "📚", fields: [
      F("course", "Course Name", "text", 1), F("duration", "Duration", "text", 1), F("level", "Level", "select", 0, ["Beginner", "Intermediate", "Advanced"]),
      F("fee", "Course Fee", "number", 0), F("seats", "Total Seats", "number", 0)] },
    "class-timetable": { name: "Class Timetable", icon: "🗓️", fields: [
      F("batch", "Batch", "text", 1), F("subject", "Subject", "text", 1), F("day", "Day", "select", 1, ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]),
      F("time", "Time", "time", 1), F("teacher", "Teacher", "text", 0), F("room", "Room", "text", 0)] },
    "attendance": { name: "Attendance", icon: "✅", fields: [
      F("student", "Student Name", "text", 1), F("date", "Date", "date", 1), F("status", "Status", "select", 1, ["Present", "Absent", "Leave"]),
      F("remarks", "Remarks", "text", 0)] },
    "fee-automation": { name: "Fee Automation", icon: "💰", fields: [
      F("student", "Student Name", "text", 1), F("amount", "Amount", "number", 1), F("due", "Due Date", "date", 1),
      F("invoice", "Invoice #", "text", 0), F("status", "Status", "select", 1, ["Paid", "Pending", "Overdue"])] },
    "fee-reports": { name: "Fee Reports", icon: "🧾", fields: [
      F("student", "Student Name", "text", 1), F("class", "Class / Batch", "text", 0), F("amount", "Amount", "number", 1),
      F("month", "Month", "text", 1), F("status", "Status", "select", 1, ["Paid", "Pending", "Defaulter"])] },
    "exams-and-grades": { name: "Exams & Grades", icon: "📝", fields: [
      F("student", "Student Name", "text", 1), F("subject", "Subject", "text", 1), F("score", "Score", "number", 1),
      F("grade", "Grade", "text", 0), F("date", "Exam Date", "date", 0)] },
    "assignments": { name: "Assignments", icon: "📄", fields: [
      F("title", "Assignment Title", "text", 1), F("course", "Course / Batch", "text", 1), F("due", "Due Date", "date", 1),
      F("marks", "Total Marks", "number", 0), F("status", "Status", "select", 1, ["Open", "Submitted", "Graded"])] },
    "teacher-profiles": { name: "Teacher Profiles", icon: "🧑‍🏫", fields: [
      F("name", "Teacher Name", "text", 1), F("subject", "Subjects", "text", 1), F("mobile", "Mobile Number", "tel", 0),
      F("timing", "Timings", "text", 0), F("salary", "Salary", "number", 0)] },
    "parent-updates": { name: "Parent Updates", icon: "👨‍👩‍👦", fields: [
      F("student", "Student Name", "text", 1), F("parent", "Parent Name", "text", 1), F("mobile", "Mobile Number", "tel", 1),
      F("message", "Update Message", "textarea", 1), F("date", "Date", "date", 1)] },
    "course-material": { name: "Course Material", icon: "📖", fields: [
      F("title", "Material Title", "text", 1), F("course", "Course / Batch", "text", 1), F("type", "Type", "select", 0, ["Notes", "Video", "Link", "PDF"]),
      F("link", "Link", "text", 0), F("date", "Date", "date", 0)] },
    "income-reports": { name: "Income Reports", icon: "📊", fields: [
      F("source", "Income Source", "text", 1), F("amount", "Amount", "number", 1), F("date", "Date", "date", 1),
      F("notes", "Notes", "textarea", 0)] }
  },
  restaurant: {
    "dynamic-pos": { name: "Dynamic POS", icon: "🧾", fields: [
      F("order", "Order #", "text", 1), F("table", "Table", "text", 0), F("items", "Items", "text", 1),
      F("amount", "Amount", "number", 1), F("payment", "Payment Mode", "select", 1, ["Cash", "Card", "Online"])] },
    "live-kitchen-orders": { name: "Live Kitchen Orders", icon: "👨‍🍳", fields: [
      F("ticket", "Ticket #", "text", 1), F("table", "Table", "text", 0), F("items", "Order Items", "textarea", 1),
      F("status", "Status", "select", 1, ["New", "Preparing", "Ready", "Served"]), F("time", "Time", "time", 0)] },
    "table-management": { name: "Table Management", icon: "🪑", fields: [
      F("table", "Table #", "text", 1), F("seats", "Seats", "number", 1), F("status", "Status", "select", 1, ["Free", "Occupied", "Reserved"]),
      F("waiter", "Waiter", "text", 0)] },
    "menu-management": { name: "Menu Management", icon: "🍔", fields: [
      F("dish", "Dish Name", "text", 1), F("category", "Category", "text", 1), F("price", "Price", "number", 1),
      F("available", "Available", "select", 0, ["Yes", "No"])] },
    "order-types": { name: "Order Types", icon: "🛵", fields: [
      F("order", "Order #", "text", 1), F("type", "Order Type", "select", 1, ["Dine-in", "Takeaway", "Delivery"]),
      F("customer", "Customer", "text", 0), F("amount", "Amount", "number", 1)] },
    "staff-and-waiters": { name: "Staff & Waiters", icon: "🧑‍🍳", fields: [
      F("name", "Full Name", "text", 1), F("role", "Role", "text", 1), F("shift", "Shift", "text", 0),
      F("mobile", "Mobile Number", "tel", 0), F("tables", "Tables Covered", "text", 0)] },
    "inventory-and-stock": { name: "Inventory & Stock", icon: "📦", fields: [
      F("item", "Item Name", "text", 1), F("qty", "Quantity", "number", 1), F("unit", "Unit", "text", 0),
      F("reorder", "Reorder Level", "number", 0), F("expiry", "Expiry Date", "date", 0)] },
    "purchases-and-suppliers": { name: "Purchases & Suppliers", icon: "🚚", fields: [
      F("supplier", "Supplier Name", "text", 1), F("items", "Items", "text", 1), F("amount", "Amount", "number", 1),
      F("date", "Date", "date", 1), F("status", "Status", "select", 0, ["Ordered", "Received", "Pending"])] },
    "discounts-and-promotions": { name: "Discounts & Promotions", icon: "🏷️", fields: [
      F("code", "Coupon Code", "text", 1), F("type", "Discount Type", "select", 1, ["Flat", "Percent"]),
      F("value", "Discount Value", "number", 1), F("valid", "Valid Till", "date", 0), F("status", "Status", "select", 0, ["Active", "Inactive"])] },
    "payments-and-invoicing": { name: "Payments & Invoicing", icon: "💳", fields: [
      F("invoice", "Invoice #", "text", 1), F("order", "Order #", "text", 0), F("amount", "Amount", "number", 1),
      F("date", "Date", "date", 1), F("method", "Payment Method", "select", 1, ["Cash", "Card", "Online"])] },
    "sales-reports": { name: "Sales Reports", icon: "📊", fields: [
      F("date", "Date", "date", 1), F("amount", "Total Sales", "number", 1), F("orders", "Orders Count", "number", 0),
      F("top", "Top Selling Item", "text", 0), F("channel", "Channel", "select", 0, ["Dine-in", "Takeaway", "Delivery"])] },
    "expense-tracking": { name: "Expense Tracking", icon: "💸", fields: [
      F("title", "Expense Title", "text", 1), F("amount", "Amount", "number", 1), F("date", "Date", "date", 1),
      F("category", "Category", "text", 0), F("notes", "Notes", "textarea", 0)] }
  },
  generalstore: {
    "dynamic-pos": { name: "Dynamic POS", icon: "🧾", fields: [
      F("bill", "Bill #", "text", 1), F("items", "Items", "text", 1), F("qty", "Quantity", "number", 1),
      F("amount", "Amount", "number", 1), F("payment", "Payment Mode", "select", 1, ["Cash", "Card", "Credit"])] },
    "barcode-scanning": { name: "Barcode Scanning", icon: "📱", fields: [
      F("barcode", "Barcode", "text", 1), F("product", "Product Name", "text", 1), F("price", "Price", "number", 1),
      F("scanned", "Scanned Date", "date", 1)] },
    "real-time-inventory": { name: "Real-time Inventory", icon: "📦", fields: [
      F("item", "Item Name", "text", 1), F("qty", "Quantity", "number", 1), F("unit", "Unit", "text", 0),
      F("price", "Price", "number", 0), F("updated", "Updated Date", "date", 1)] },
    "supplier-tracking": { name: "Supplier Tracking", icon: "🚚", fields: [
      F("supplier", "Supplier Name", "text", 1), F("mobile", "Mobile Number", "tel", 0), F("items", "Supplied Items", "text", 0),
      F("pending", "Pending Amount", "number", 0), F("last", "Last Order Date", "date", 0)] },
    "purchase-orders": { name: "Purchase Orders", icon: "📝", fields: [
      F("po", "PO #", "text", 1), F("supplier", "Supplier Name", "text", 1), F("amount", "Amount", "number", 1),
      F("date", "Date", "date", 1), F("status", "Status", "select", 0, ["Draft", "Ordered", "Delivered"])] },
    "product-catalog": { name: "Product Catalog", icon: "🛒", fields: [
      F("product", "Product Name", "text", 1), F("category", "Category", "text", 1), F("price", "Price", "number", 1),
      F("unit", "Unit", "text", 0), F("barcode", "Barcode", "text", 0)] },
    "stock-alerts": { name: "Stock Alerts", icon: "⚠️", fields: [
      F("item", "Item Name", "text", 1), F("qty", "Current Quantity", "number", 1), F("threshold", "Min Level", "number", 1),
      F("status", "Status", "select", 1, ["Low", "Out of Stock", "OK"])] },
    "expiry-alerts": { name: "Expiry Alerts", icon: "🗓️", fields: [
      F("item", "Item Name", "text", 1), F("batch", "Batch #", "text", 0), F("expiry", "Expiry Date", "date", 1),
      F("qty", "Quantity", "number", 0), F("status", "Status", "select", 1, ["OK", "Near Expiry", "Expired"])] },
    "customer-khata": { name: "Customer Khata", icon: "📒", fields: [
      F("customer", "Customer Name", "text", 1), F("mobile", "Mobile Number", "tel", 0), F("balance", "Balance", "number", 1),
      F("last", "Last Paid Date", "date", 0), F("status", "Status", "select", 1, ["Clear", "Pending"])] },
    "sales-reports": { name: "Sales Reports", icon: "📊", fields: [
      F("date", "Date", "date", 1), F("amount", "Total Sales", "number", 1), F("bills", "Bills Count", "number", 0),
      F("items", "Top Items", "text", 0), F("payment", "Payment Mode", "select", 0, ["Cash", "Card", "Credit"])] },
    "expense-tracking": { name: "Expense Tracking", icon: "💸", fields: [
      F("title", "Expense Title", "text", 1), F("amount", "Amount", "number", 1), F("date", "Date", "date", 1),
      F("category", "Category", "text", 0), F("notes", "Notes", "textarea", 0)] },
    "profit-and-loss": { name: "Profit & Loss", icon: "💰", fields: [
      F("month", "Month", "text", 1), F("revenue", "Revenue", "number", 1), F("expenses", "Expenses", "number", 1),
      F("profit", "Profit", "number", 1), F("notes", "Notes", "textarea", 0)] }
  },
  beautysalon: {
    "online-bookings": { name: "Online Bookings", icon: "📅", fields: [
      F("client", "Client Name", "text", 1), F("service", "Service", "text", 1), F("date", "Date", "date", 1),
      F("time", "Time", "time", 1), F("status", "Status", "select", 1, ["Pending", "Confirmed", "Done", "Cancelled"])] },
    "stylist-bookings": { name: "Stylist Bookings", icon: "🧑‍🎨", fields: [
      F("client", "Client Name", "text", 1), F("stylist", "Stylist", "text", 1), F("service", "Service", "text", 1),
      F("date", "Date", "date", 1), F("status", "Status", "select", 1, ["Pending", "Confirmed", "Done"])] },
    "appointment-calendar": { name: "Appointment Calendar", icon: "🗓️", fields: [
      F("date", "Date", "date", 1), F("time", "Time", "time", 1), F("client", "Client Name", "text", 1),
      F("stylist", "Stylist", "text", 0), F("status", "Status", "select", 1, ["Booked", "Cancelled", "Completed"])] },
    "service-menu": { name: "Service Menu", icon: "✂️", fields: [
      F("service", "Service Name", "text", 1), F("category", "Category", "text", 0), F("duration", "Duration", "text", 0),
      F("price", "Price", "number", 1)] },
    "client-logs": { name: "Client Logs", icon: "📒", fields: [
      F("client", "Client Name", "text", 1), F("mobile", "Mobile Number", "tel", 0), F("visit", "Last Visit", "date", 1),
      F("service", "Service Taken", "text", 0), F("notes", "Notes", "textarea", 0)] },
    "staff-management": { name: "Staff Management", icon: "🧑‍💼", fields: [
      F("name", "Full Name", "text", 1), F("role", "Role", "text", 1), F("shift", "Shift", "text", 0),
      F("mobile", "Mobile Number", "tel", 0), F("commission", "Commission %", "number", 0)] },
    "pos-and-billing": { name: "POS & Billing", icon: "🧾", fields: [
      F("invoice", "Invoice #", "text", 1), F("client", "Client Name", "text", 0), F("service", "Service", "text", 0),
      F("amount", "Amount", "number", 1), F("method", "Payment Method", "select", 1, ["Cash", "Card", "Online"])] },
    "packages-and-membership": { name: "Packages & Membership", icon: "🎁", fields: [
      F("package", "Package Name", "text", 1), F("client", "Client Name", "text", 1), F("price", "Price", "number", 1),
      F("valid", "Valid Till", "date", 0), F("status", "Status", "select", 1, ["Active", "Expired"])] },
    "product-inventory": { name: "Product Inventory", icon: "🧴", fields: [
      F("item", "Product Name", "text", 1), F("qty", "Quantity", "number", 1), F("price", "Price", "number", 0),
      F("expiry", "Expiry Date", "date", 0), F("status", "Status", "select", 1, ["In Stock", "Low Stock", "Out of Stock"])] },
    "offers-and-coupons": { name: "Offers & Coupons", icon: "🏷️", fields: [
      F("code", "Coupon Code", "text", 1), F("discount", "Discount", "text", 1), F("valid", "Valid Till", "date", 0),
      F("status", "Status", "select", 1, ["Active", "Inactive"])] },
    "revenue-reports": { name: "Revenue Reports", icon: "📊", fields: [
      F("date", "Date", "date", 1), F("amount", "Amount", "number", 1), F("stylist", "Stylist", "text", 0),
      F("service", "Service", "text", 0), F("method", "Payment Method", "select", 0, ["Cash", "Card", "Online"])] },
    "expense-tracking": { name: "Expense Tracking", icon: "💸", fields: [
      F("title", "Expense Title", "text", 1), F("amount", "Amount", "number", 1), F("date", "Date", "date", 1),
      F("category", "Category", "text", 0), F("notes", "Notes", "textarea", 0)] }
  },
  petrolpump: {
    "dispenser-tracking": { name: "Dispenser Tracking", icon: "⛽", fields: [
      F("dispenser", "Dispenser #", "text", 1), F("nozzle", "Nozzle", "text", 0), F("status", "Status", "select", 1, ["On", "Off", "Maintenance"]),
      F("reading", "Current Reading", "number", 0), F("date", "Date", "date", 1)] },
    "shift-management": { name: "Shift Management", icon: "🕒", fields: [
      F("shift", "Shift", "select", 1, ["Morning", "Evening", "Night"]), F("date", "Date", "date", 1),
      F("attendant", "Attendant", "text", 1), F("cash", "Cash in Hand", "number", 0), F("handover", "Handover Notes", "textarea", 0)] },
    "nozzle-readings": { name: "Nozzle Readings", icon: "⛽", fields: [
      F("nozzle", "Nozzle", "text", 1), F("date", "Date", "date", 1), F("opening", "Opening Reading", "number", 1),
      F("closing", "Closing Reading", "number", 1), F("sold", "Litres Sold", "number", 0)] },
    "rate-management": { name: "Rate Management", icon: "💲", fields: [
      F("fuel", "Fuel Type", "select", 1, ["Petrol", "Diesel", "CNG"]), F("rate", "Rate per Litre", "number", 1),
      F("date", "Effective Date", "date", 1), F("by", "Updated By", "text", 0)] },
    "tank-inventory": { name: "Tank Inventory", icon: "🛢️", fields: [
      F("tank", "Tank ID", "text", 1), F("fuel", "Fuel Type", "select", 1, ["Petrol", "Diesel", "CNG"]),
      F("volume", "Volume (L)", "number", 1), F("dip", "Dip Reading", "number", 0), F("status", "Status", "select", 1, ["Full", "Half", "Low", "Refill Due"])] },
    "sales-reports": { name: "Sales Reports", icon: "📊", fields: [
      F("date", "Date", "date", 1), F("fuel", "Fuel Type", "select", 0, ["Petrol", "Diesel", "CNG"]),
      F("litres", "Litres", "number", 1), F("amount", "Amount", "number", 1), F("shift", "Shift", "text", 0)] },
    "cash-and-payments": { name: "Cash & Payments", icon: "💳", fields: [
      F("date", "Date", "date", 1), F("amount", "Amount", "number", 1), F("mode", "Payment Mode", "select", 1, ["Cash", "Card", "Online", "Credit"]),
      F("shift", "Shift", "text", 0), F("notes", "Notes", "textarea", 0)] },
    "credit-accounts": { name: "Credit Accounts", icon: "🚛", fields: [
      F("customer", "Customer Name", "text", 1), F("vehicle", "Vehicle #", "text", 0), F("due", "Due Amount", "number", 1),
      F("last", "Last Paid Date", "date", 0), F("status", "Status", "select", 1, ["Clear", "Pending"])] },
    "staff-and-attendants": { name: "Staff & Attendants", icon: "🧑‍🔧", fields: [
      F("name", "Full Name", "text", 1), F("role", "Role", "text", 0), F("shift", "Shift", "text", 0),
      F("mobile", "Mobile Number", "tel", 0), F("joined", "Joining Date", "date", 0)] },
    "shop-and-lube-sales": { name: "Shop & Lube Sales", icon: "🛒", fields: [
      F("item", "Item Name", "text", 1), F("qty", "Quantity", "number", 1), F("amount", "Amount", "number", 1),
      F("date", "Date", "date", 1), F("payment", "Payment Mode", "select", 1, ["Cash", "Credit"])] },
    "expense-tracking": { name: "Expense Tracking", icon: "💸", fields: [
      F("title", "Expense Title", "text", 1), F("amount", "Amount", "number", 1), F("date", "Date", "date", 1),
      F("category", "Category", "text", 0), F("notes", "Notes", "textarea", 0)] },
    "profit-and-loss": { name: "Profit & Loss", icon: "💰", fields: [
      F("month", "Month", "text", 1), F("revenue", "Revenue", "number", 1), F("expenses", "Expenses", "number", 1),
      F("profit", "Profit", "number", 1), F("notes", "Notes", "textarea", 0)] }
  },
  medicalstore: {
    "digital-prescriptions": { name: "Digital Prescriptions", icon: "📝", fields: [
      F("patient", "Patient Name", "text", 1), F("doctor", "Doctor Name", "text", 1), F("medicines", "Medicines", "textarea", 1),
      F("date", "Date", "date", 1), F("rx", "Rx #", "text", 0)] },
    "medicine-catalog": { name: "Medicine Catalog", icon: "💊", fields: [
      F("medicine", "Medicine Name", "text", 1), F("brand", "Brand", "text", 0), F("form", "Form", "select", 0, ["Tablet", "Syrup", "Capsule", "Injection", "Other"]),
      F("price", "Price", "number", 1), F("company", "Maker Company", "text", 0)] },
    "batch-stock": { name: "Batch Stock", icon: "📦", fields: [
      F("medicine", "Medicine Name", "text", 1), F("batch", "Batch #", "text", 1), F("qty", "Quantity", "number", 1),
      F("expiry", "Expiry Date", "date", 1), F("price", "Price", "number", 0)] },
    "expiry-alerts": { name: "Expiry Alerts", icon: "⚠️", fields: [
      F("medicine", "Medicine Name", "text", 1), F("batch", "Batch #", "text", 0), F("expiry", "Expiry Date", "date", 1),
      F("qty", "Quantity", "number", 0), F("status", "Status", "select", 1, ["OK", "Near Expiry", "Expired"])] },
    "fast-pos-billing": { name: "Fast POS Billing", icon: "🧾", fields: [
      F("bill", "Bill #", "text", 1), F("customer", "Customer", "text", 0), F("items", "Items", "text", 1),
      F("amount", "Amount", "number", 1), F("payment", "Payment Mode", "select", 1, ["Cash", "Card", "Credit"])] },
    "barcode-scanning": { name: "Barcode Scanning", icon: "📱", fields: [
      F("barcode", "Barcode", "text", 1), F("medicine", "Medicine Name", "text", 1), F("price", "Price", "number", 1),
      F("scanned", "Scanned Date", "date", 1)] },
    "purchase-and-suppliers": { name: "Purchase & Suppliers", icon: "🚚", fields: [
      F("supplier", "Supplier Name", "text", 1), F("medicines", "Medicines", "text", 1), F("amount", "Amount", "number", 1),
      F("date", "Date", "date", 1), F("status", "Status", "select", 0, ["Ordered", "Received", "Pending"])] },
    "stock-alerts": { name: "Stock Alerts", icon: "🔔", fields: [
      F("medicine", "Medicine Name", "text", 1), F("qty", "Current Quantity", "number", 1), F("min", "Min Level", "number", 1),
      F("status", "Status", "select", 1, ["Low", "Out of Stock", "OK"])] },
    "customer-khata": { name: "Customer Khata", icon: "📒", fields: [
      F("customer", "Customer Name", "text", 1), F("mobile", "Mobile Number", "tel", 0), F("balance", "Balance", "number", 1),
      F("last", "Last Paid Date", "date", 0), F("status", "Status", "select", 1, ["Clear", "Pending"])] },
    "sales-reports": { name: "Sales Reports", icon: "📊", fields: [
      F("date", "Date", "date", 1), F("amount", "Total Sales", "number", 1), F("medicines", "Top Medicines", "text", 0),
      F("bills", "Bills Count", "number", 0), F("payment", "Payment Mode", "select", 0, ["Cash", "Card", "Credit"])] },
    "expense-tracking": { name: "Expense Tracking", icon: "💸", fields: [
      F("title", "Expense Title", "text", 1), F("amount", "Amount", "number", 1), F("date", "Date", "date", 1),
      F("category", "Category", "text", 0), F("notes", "Notes", "textarea", 0)] },
    "profit-and-loss": { name: "Profit & Loss", icon: "💰", fields: [
      F("month", "Month", "text", 1), F("revenue", "Revenue", "number", 1), F("expenses", "Expenses", "number", 1),
      F("profit", "Profit", "number", 1), F("notes", "Notes", "textarea", 0)] }
  },
  laboratory: {
    "test-catalog": { name: "Test Catalog", icon: "📋", fields: [
      F("test", "Test Name", "text", 1), F("department", "Department", "text", 0), F("price", "Price", "number", 1),
      F("range", "Normal Range", "text", 0)] },
    "sample-collection": { name: "Sample Collection", icon: "🧪", fields: [
      F("sample", "Sample ID", "text", 1), F("patient", "Patient Name", "text", 1), F("type", "Sample Type", "text", 0),
      F("collected", "Collected Date", "date", 1), F("staff", "Collected By", "text", 0)] },
    "sample-tracking": { name: "Sample Tracking", icon: "📍", fields: [
      F("sample", "Sample ID", "text", 1), F("patient", "Patient Name", "text", 1), F("status", "Status", "select", 1, ["Collected", "Processing", "Completed", "Verified"]),
      F("date", "Date", "date", 1), F("notes", "Notes", "textarea", 0)] },
    "digital-reports": { name: "Digital Reports", icon: "📑", fields: [
      F("report", "Report #", "text", 1), F("patient", "Patient Name", "text", 1), F("test", "Test Name", "text", 1),
      F("result", "Result / Values", "textarea", 1), F("date", "Date", "date", 1), F("status", "Status", "select", 1, ["Draft", "Final"])] },
    "report-delivery": { name: "Report Delivery", icon: "📤", fields: [
      F("patient", "Patient Name", "text", 1), F("report", "Report #", "text", 1), F("channel", "Channel", "select", 1, ["SMS", "Email", "WhatsApp"]),
      F("date", "Date", "date", 1), F("status", "Status", "select", 1, ["Sent", "Pending"])] },
    "patient-profiles": { name: "Patient Profiles", icon: "🧑‍⚕️", fields: [
      F("name", "Patient Name", "text", 1), F("mobile", "Mobile Number", "tel", 0), F("age", "Age", "number", 0),
      F("gender", "Gender", "select", 0, ["Male", "Female", "Other"]), F("last", "Last Visit", "date", 0)] },
    "doctor-referrals": { name: "Doctor Referrals", icon: "🏥", fields: [
      F("doctor", "Doctor Name", "text", 1), F("mobile", "Mobile Number", "tel", 0), F("patients", "Patients Referred", "number", 0),
      F("tests", "Common Tests", "text", 0), F("pending", "Pending Amount", "number", 0)] },
    "home-collection": { name: "Home Collection", icon: "🏠", fields: [
      F("patient", "Patient Name", "text", 1), F("address", "Address", "text", 1), F("date", "Date", "date", 1),
      F("time", "Time", "time", 1), F("staff", "Staff Assigned", "text", 0), F("status", "Status", "select", 1, ["Scheduled", "Done", "Cancelled"])] },
    "billing-and-payments": { name: "Billing & Payments", icon: "🧾", fields: [
      F("invoice", "Invoice #", "text", 1), F("patient", "Patient Name", "text", 1), F("amount", "Amount", "number", 1),
      F("date", "Date", "date", 1), F("status", "Status", "select", 1, ["Paid", "Pending"])] },
    "lab-inventory": { name: "Lab Inventory", icon: "📦", fields: [
      F("item", "Item Name", "text", 1), F("qty", "Quantity", "number", 1), F("expiry", "Expiry Date", "date", 0),
      F("price", "Price", "number", 1), F("status", "Status", "select", 1, ["OK", "Low", "Out of Stock"])] },
    "staff-and-pathologists": { name: "Staff & Pathologists", icon: "🧑‍🔬", fields: [
      F("name", "Full Name", "text", 1), F("role", "Role", "text", 0), F("shift", "Shift", "text", 0),
      F("mobile", "Mobile Number", "tel", 0), F("joined", "Joining Date", "date", 0)] },
    "income-reports": { name: "Income Reports", icon: "📊", fields: [
      F("date", "Date", "date", 1), F("amount", "Amount", "number", 1), F("test", "Test / Source", "text", 0),
      F("status", "Status", "select", 1, ["Received", "Pending"])] }
  }
};

const SUPABASE_URL = "https://lsoprwhjnurfqnsymhzf.supabase.co";
const SUPABASE_KEY = "sb_publishable_Q_-tMvYWJGriBaASXZm7zQ__dXPpRMD";
const supabaseClient = window.supabase && typeof window.supabase.createClient === "function"
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

window.OMS_FEATURE_MODULES = {
  BUILTIN_CATEGORIES,
  FEATURE_VERSION,
  slugify,
  GENERIC_FEATURES,
  FEATURE_REGISTRY,
  supabaseClient
};
})();
