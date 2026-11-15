// ============================================================
// Home page - 01-core-utilities.js
// Shared phone helper.
// Split from the original script.js during the 2026-11 refactor.
// Loaded in numeric order by the page HTML. Keep that order.
// ============================================================

const combinePhoneWithCode = (code, rawNum) => {
  let cleaned = String(rawNum || "").trim().replace(/[\s\-\(\)\.]/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("+")) return cleaned.replace(/^\+/, "");
  const cleanCode = String(code || "+92").replace(/^\+/, "");
  if (cleaned.startsWith("0")) cleaned = cleaned.substring(1);
  if (cleaned.startsWith(cleanCode)) return cleaned;
  return cleanCode + cleaned;
};
