// ============================================================
// Home page - 02-supabase-client.js
// Supabase client, cloud user state and legacy auth cleanup.
// Split from the original script.js during the 2026-11 refactor.
// Loaded in numeric order by the page HTML. Keep that order.
// ============================================================

// ===== Supabase cloud (login + data sync) =====
const sb = window.OMS_FEATURE_MODULES.supabaseClient;
const CLOUD_TABLE = "app_data";
const ADMIN_TABLE = "admins";
let cloudUser = null;
let cloudBusy = false;
let cloudTimer = null;
let cloudPending = new Map();
const LEGACY_LOCAL_AUTH_KEYS = ["ownerAccount", "owners", "siteUsers", "siteReviews"];

const cloudEmail = (mobile) => `${mobile}@bms.app`;

const removeLegacyPasswordHashes = () => {
  ["ownerAccount", "owners", "siteUsers", "ceoAccount"].forEach((key) => {
    try {
      const stored = JSON.parse(localStorage.getItem(key));
      if (key === "ceoAccount" && stored && typeof stored === "object" &&
          (Object.prototype.hasOwnProperty.call(stored, "passHash") ||
           Object.prototype.hasOwnProperty.call(stored, "codeHash"))) {
        localStorage.removeItem(key);
        return;
      }
      if (Array.isArray(stored)) {
        localStorage.setItem(key, JSON.stringify(stored.map((profile) => {
          if (!profile || typeof profile !== "object" || Array.isArray(profile)) return profile;
          const { passHash, codeHash, ...safeProfile } = profile;
          return safeProfile;
        })));
      } else if (stored && typeof stored === "object") {
        delete stored.passHash;
        delete stored.codeHash;
        localStorage.setItem(key, JSON.stringify(stored));
      }
    } catch (error) {
      console.warn(`Could not remove legacy credential data from ${key}:`, error);
    }
  });
  try {
    localStorage.removeItem("siteUserSession");
  } catch (error) {
    console.warn("Could not clear the legacy browser-only user session:", error);
  }
};

removeLegacyPasswordHashes();
