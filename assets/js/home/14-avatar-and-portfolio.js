// ============================================================
// Home page - 14-avatar-and-portfolio.js
// Owner profile photo upload and portfolio viewer.
// Split from the original script.js during the 2026-11 refactor.
// Loaded in numeric order by the page HTML. Keep that order.
// ============================================================

// ===== Owner profile photo (DP) upload =====
// Three copies of the photo are kept: localStorage (fast), IndexedDB (survives
// a wiped localStorage) and the cloud (follows the owner to other devices).
const AVATAR_DB = "oms_media";
const AVATAR_SHOP = "files";

const ownerAvatarEl = document.getElementById("ownerAvatar");
const ownerAvatarInput = document.getElementById("ownerAvatarInput");
const headerAvatarEl = document.getElementById("headerAvatar");
const headerAvatarInput = document.getElementById("headerAvatarInput");

// --- IndexedDB backup, survives a cleared or full localStorage ---
const avatarDB = () => new Promise((resolve, reject) => {
  if (!window.indexedDB) { reject(new Error("IndexedDB not available")); return; }
  const req = indexedDB.open(AVATAR_DB, 1);
  req.onupgradeneeded = () => { try { req.result.createObjectStore(AVATAR_SHOP); } catch {} };
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

const avatarDBPut = async (record) => {
  try {
    const db = await avatarDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(AVATAR_SHOP, "readwrite");
      tx.objectStore(AVATAR_SHOP).put(record, AVATAR_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    db.close();
  } catch (e) {
    console.warn("Photo backup failed:", e);
  }
};

const avatarDBGet = async () => {
  try {
    const db = await avatarDB();
    const record = await new Promise((resolve, reject) => {
      const tx = db.transaction(AVATAR_SHOP, "readonly");
      const req = tx.objectStore(AVATAR_SHOP).get(AVATAR_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return record;
  } catch {
    return null;
  }
};

// --- Shrink the picked photo ---
// A 2 MB phone photo becomes a ~50 KB JPEG, so it always fits in localStorage
// and goes up to the cloud without any trouble.
const shrinkPhoto = (file) => new Promise((resolve) => {
  const reader = new FileReader();
  reader.onerror = () => resolve(null);
  reader.onload = () => {
    const img = new Image();
    img.onerror = () => resolve(null);
    img.onload = () => {
      const long = Math.max(img.width, img.height) || 1;
      const scale = Math.min(1, AVATAR_EDGE / long);
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const cv = document.createElement("canvas");
      cv.width = w; cv.height = h;
      const ctx = cv.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      let out = "";
      try { out = cv.toDataURL("image/jpeg", 0.86); } catch {}
      if (!out) { try { out = cv.toDataURL("image/png"); } catch {} }
      resolve(out || null);
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});

// --- Show the photo in every avatar spot ---
const applyOwnerAvatar = (value) => {
  const src = avatarSrc(value !== undefined ? value : store.get(AVATAR_KEY, null));
  const css = src ? `url("${src}")` : "";
  if (ownerAvatarEl) {
    ownerAvatarEl.style.backgroundImage = css;
    ownerAvatarEl.classList.toggle("has-photo", !!src);
  }
  if (headerAvatarEl) {
    headerAvatarEl.style.backgroundImage = css;
    headerAvatarEl.classList.toggle("has-photo", !!src);
  }
};

// --- Save the photo everywhere at once ---
const saveOwnerAvatar = async (src) => {
  const record = { v: src, t: Date.now() };
  try {
    localStorage.setItem(AVATAR_KEY, JSON.stringify(record));
  } catch (e) {
    console.warn("Photo save failed:", e);
    showToast("Photo could not be saved, browser storage is full.", true);
    return null;
  }
  await avatarDBPut(record);
  cloudPut(AVATAR_KEY, record);
  applyOwnerAvatar(record);
  return record;
};

// --- The site wide copy, every visitor sees the owner photo ---
const publishOwnerAvatar = async (record) => {
  if (!sb || !cloudUser || !ceoLoggedIn) return;
  try {
    const { error } = await sb.from(AVATAR_TABLE).upsert(
      { id: "owner", photo: record.v, saved_at: record.t, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    );
    if (error) console.warn("Photo publish failed:", error.message);
    else {
      avatarTableOk = true;
      try { localStorage.removeItem(AVATAR_TABLE_FLAG); } catch {}
    }
  } catch (e) {
    console.warn("Photo publish failed:", e);
  }
};

let avatarTableOk = null; // null = not checked yet, false = table not there

const fetchOwnerAvatar = async () => {
  if (!sb) return null;
  if (avatarTableOk === false) return null;
  if (avatarTableOk === null && localStorage.getItem(AVATAR_TABLE_FLAG)) { avatarTableOk = false; return null; }
  try {
    const { data, error } = await sb
      .from(AVATAR_TABLE)
      .select("photo,saved_at")
      .eq("id", "owner")
      .maybeSingle();
    if (error) {
      avatarTableOk = false;
      try { localStorage.setItem(AVATAR_TABLE_FLAG, "1"); } catch {}
      return null;
    }
    avatarTableOk = true;
    try { localStorage.removeItem(AVATAR_TABLE_FLAG); } catch {}
    if (!data || !data.photo) return null;
    return { v: data.photo, t: Number(data.saved_at) || 0 };
  } catch {
    avatarTableOk = false;
    return null;
  }
};

// --- Bring the photo back if it went missing on its own ---
const restoreOwnerAvatar = async () => {
  const local = store.get(AVATAR_KEY, null);
  const legacy = typeof local === "string" ? local : "";
  const backup = await avatarDBGet();
  const published = await fetchOwnerAvatar();
  const candidates = [];
  if (legacy) candidates.push({ v: legacy, t: Date.now() });
  else if (local && avatarSrc(local)) candidates.push(local);
  if (backup && avatarSrc(backup)) candidates.push(backup);
  if (published && avatarSrc(published)) candidates.push(published);
  const best = candidates.sort((a, b) => avatarTime(b) - avatarTime(a))[0] || null;
  if (!best) { applyOwnerAvatar(null); return null; }
  try { localStorage.setItem(AVATAR_KEY, JSON.stringify(best)); } catch {}
  await avatarDBPut(best);
  applyOwnerAvatar(best);
  return best;
};

// Shared upload wiring: click → file picker → shrink → save → refresh every avatar
const initAvatarUpload = (el, input) => {
  if (!el || !input) return;
  const open = () => input.click();
  el.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); open(); });
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
  });
  input.addEventListener("change", async () => {
    const file = input.files && input.files[0];
    input.value = "";
    if (!file) return;
    if (!/^image\//.test(file.type)) { showToast("Please choose an image file.", true); return; }
    if (file.size > 10 * 1024 * 1024) { showToast("Image too large, please pick a smaller photo.", true); return; }
    showToast("Saving photo...");
    const src = await shrinkPhoto(file);
    if (!src) { showToast("Could not read that image.", true); return; }
    const record = await saveOwnerAvatar(src);
    if (!record) return;
    showToast("Profile photo updated!");
    publishOwnerAvatar(record);
  });
};

initAvatarUpload(headerAvatarEl, headerAvatarInput);
initAvatarUpload(ownerAvatarEl, ownerAvatarInput);

// ===== Contact Owner: reveal social icons =====
const contactOwnerToggle = document.getElementById("contactOwnerToggle");
const ownerSocials = document.getElementById("ownerSocials");

if (contactOwnerToggle && ownerSocials) {
  contactOwnerToggle.addEventListener("click", () => {
    const open = ownerSocials.hidden;
    ownerSocials.hidden = !open;
    contactOwnerToggle.setAttribute("aria-expanded", String(open));
    contactOwnerToggle.classList.toggle("btn-primary", !open);
    contactOwnerToggle.classList.toggle("btn-outline", open);
    contactOwnerToggle.textContent = open ? "Hide Contacts" : "Contact Owner";
    if (open) {
      ownerSocials.scrollIntoView({ behavior: "smooth", block: "nearest" });
      showToast("Connect with Amna Bibi on social media!");
    }
  });
}

// ===== View Portfolio: show the portfolio inside the page (with new-tab fallback) =====
const portfolioToggle = document.getElementById("portfolioToggle");
const ownerPortfolio = document.getElementById("ownerPortfolio");
const portfolioFrame = document.getElementById("portfolioFrame");
const portfolioLoader = document.getElementById("portfolioLoader");
const portfolioClose = document.getElementById("portfolioClose");
const PORTFOLIO_URL = portfolioFrame ? portfolioFrame.dataset.src : "";

if (portfolioToggle && ownerPortfolio && portfolioFrame) {
  let frameReady = false;
  const setEmpty = (open) => {
    frameReady = false;
    portfolioFrame.src = open ? PORTFOLIO_URL : "about:blank";
  };

  portfolioFrame.addEventListener("load", () => {
    frameReady = true;
    if (portfolioLoader) {
      portfolioLoader.hidden = true;
      portfolioLoader.innerHTML = "";
    }
  });

  portfolioToggle.addEventListener("click", () => {
    const open = ownerPortfolio.hidden;
    ownerPortfolio.hidden = !open;
    portfolioToggle.setAttribute("aria-expanded", String(open));
    portfolioToggle.classList.toggle("btn-outline", !open);
    portfolioToggle.classList.toggle("btn-primary", open);
    portfolioToggle.textContent = open ? "Hide Portfolio" : "View Portfolio";
    setEmpty(open);
    if (open) {
      if (portfolioLoader) {
        portfolioLoader.hidden = false;
        portfolioLoader.textContent = "Loading portfolio…";
      }
      // Some hosts block embedding (CSP / X-Frame-Options): fall back to opening in a new tab.
      setTimeout(() => {
        if (frameReady || !portfolioLoader) return;
        portfolioLoader.textContent = "";
        const msg = document.createElement("span");
        msg.textContent = "This portfolio can't be shown here. ";
        const link = document.createElement("a");
        link.href = PORTFOLIO_URL;
        link.target = "_blank";
        link.rel = "noopener";
        link.className = "portfolio-link";
        link.textContent = "Open in new tab ↗";
        msg.appendChild(link);
        portfolioLoader.appendChild(msg);
      }, 12000);
      ownerPortfolio.scrollIntoView({ behavior: "smooth", block: "nearest" });
      showToast("Loading Amna Bibi's portfolio…");
    }
  });

  if (portfolioClose) {
    portfolioClose.addEventListener("click", () => {
      ownerPortfolio.hidden = true;
      portfolioFrame.src = "about:blank";
      portfolioToggle.setAttribute("aria-expanded", "false");
      portfolioToggle.classList.remove("btn-primary");
      portfolioToggle.classList.add("btn-outline");
      portfolioToggle.textContent = "View Portfolio";
    });
  }
}
