// ============================================================
// Home page - 16-business-registration.js
// Business ad registration form, plans, media and validation.
// Split from the original script.js during the 2026-11 refactor.
// Loaded in numeric order by the page HTML. Keep that order.
// ============================================================

// ===== Business Registration =====
const REG_KEY = "businessRegistrations";
const REG_PLAN_KEY = "selectedBizPlan";
const REG_RECEIPTS_KEY = "businessAdReceipts";

const regForm = document.getElementById("regForm");
const planGrid = document.getElementById("planGrid");
const regPlanSummary = document.getElementById("regPlanSummary");
const regListWrap = document.getElementById("regListWrap");
const regList = document.getElementById("regList");
const regPhotoPreview = document.getElementById("regPhotoPreview");
const regVideoPreview = document.getElementById("regVideoPreview");
const regPhotosInput = document.getElementById("regPhotos");
const regVideosInput = document.getElementById("regVideos");
const regMediaNote = document.getElementById("regMediaNote");
const regTerms = document.getElementById("regTerms");
const regTermsErr = document.getElementById("regTermsErr");
const regModal = document.getElementById("regModal");
const openRegFormBtn = document.getElementById("openRegForm");
const regModalClose = document.getElementById("regModalClose");

const PLAN_INFO = {
  "15days": { label: "15 Days", price: 2500, priceUsd: 10 },
  "30days": { label: "30 Days", price: 5000, priceUsd: 20 },
  "1year": { label: "1 Year", price: 60000, priceUsd: 200 }
};

const MOBILE_LOOKUP_RE = /^\d{7,16}$/;
const normalizeMobile = (v) => String(v || "").replace(/[^\d]/g, "");
const newCloudUuid = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  throw new Error("This browser cannot securely create a registration reference.");
};

const rupees = (n) => Number(n || 0).toLocaleString("en-PK");

const getRegistrationReceipts = () => {
  const list = store.get(REG_RECEIPTS_KEY, []);
  return Array.isArray(list) ? list : [];
};

const getSelectedPlan = () => {
  const key = store.get(REG_PLAN_KEY, null);
  return key && PLAN_INFO[key] ? key : null;
};

const renderPlanSummary = () => {
  if (!regPlanSummary) return;
  const key = getSelectedPlan();
  if (!key) {
    regPlanSummary.innerHTML = `<span class="reg-plan-none">No plan selected yet. Pick one above.</span>`;
    return;
  }
  const p = PLAN_INFO[key];
  regPlanSummary.innerHTML =
    `<div class="reg-plan-item"><span>Plan</span><strong>${escHtml(p.label)}</strong></div>` +
    `<div class="reg-plan-item"><span>Amount</span><strong>$ ${p.priceUsd} (PKR ${rupees(p.price)})</strong></div>` +
    `<div class="reg-plan-item"><span>Ad runs for</span><strong>${escHtml(p.label)}</strong></div>`;
};

const markPlanSelected = (key) => {
  if (!planGrid) return;
  planGrid.querySelectorAll(".plan-mini").forEach((card) => {
    const on = card.dataset.plan === key;
    card.classList.toggle("selected", on);
    card.setAttribute("aria-pressed", on ? "true" : "false");
  });
};

const selectPlan = (key, { silence = false } = {}) => {
  if (!PLAN_INFO[key]) return;
  store.set(REG_PLAN_KEY, key);
  markPlanSelected(key);
  renderPlanSummary();
  const err = document.getElementById("regPlanErr");
  if (err) err.textContent = "";
  if (!silence) showToast(`${PLAN_INFO[key].label} plan selected - $ ${PLAN_INFO[key].priceUsd} / PKR ${rupees(PLAN_INFO[key].price)}`);
};

if (planGrid) {
  planGrid.addEventListener("click", (e) => {
    const card = e.target.closest(".plan-mini");
    if (!card) return;
    selectPlan(card.dataset.plan);
  });
}

// --- Business ad media ---
const clearPreview = (el) => { if (el) el.innerHTML = ""; };

const BUSINESS_AD_MEDIA = {
  photos: { maxCount: 5, maxBytes: 5 * 1024 * 1024, types: ["image/jpeg", "image/png", "image/webp"] },
  videos: { maxCount: 1, maxBytes: 25 * 1024 * 1024, types: ["video/mp4", "video/webm"] }
};
const MEDIA_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm"
};

const validateBusinessAdFiles = (files, kind) => {
  const limit = BUSINESS_AD_MEDIA[kind];
  if (files.length > limit.maxCount) {
    return kind === "photos" ? "Choose no more than 5 photos." : "Choose no more than 1 video.";
  }
  const invalidType = files.find((file) => !limit.types.includes(file.type));
  if (invalidType) return `Use ${kind === "photos" ? "JPG, PNG or WebP" : "MP4 or WebM"} files only.`;
  const oversized = files.find((file) => file.size > limit.maxBytes);
  if (oversized) return `Each ${kind === "photos" ? "photo" : "video"} must be ${kind === "photos" ? "5 MB" : "25 MB"} or smaller.`;
  return "";
};

const renderMediaPreview = (files, container, kind) => {
  if (!container) return;
  clearPreview(container);
  if (!files || !files.length) {
    container.innerHTML = `<span class="media-empty">Nothing selected yet.</span>`;
    return;
  }
  [...files].forEach((file) => {
    const wrap = document.createElement("div");
    wrap.className = "media-thumb";
    const url = URL.createObjectURL(file);
    if (kind === "video") {
      const v = document.createElement("video");
      v.src = url; v.muted = true; v.playsInline = true;
      v.addEventListener("loadeddata", () => URL.revokeObjectURL(url), { once: true });
      wrap.appendChild(v);
      const tag = document.createElement("span");
      tag.className = "media-kind";
      tag.textContent = "Video";
      wrap.appendChild(tag);
    } else {
      const img = document.createElement("img");
      img.src = url; img.alt = "Selected photo";
      img.addEventListener("load", () => URL.revokeObjectURL(url), { once: true });
      wrap.appendChild(img);
    }
    container.appendChild(wrap);
  });
};

const handleBusinessAdMediaChange = (input, preview, kind) => {
  if (!input) return;
  const files = [...(input.files || [])];
  const error = validateBusinessAdFiles(files, kind);
  if (error) {
    input.value = "";
    renderMediaPreview([], preview, kind === "photos" ? "photo" : "video");
    if (regMediaNote) regMediaNote.textContent = error;
    showToast(error, true);
    return;
  }
  if (regMediaNote) regMediaNote.textContent = "";
  renderMediaPreview(files, preview, kind === "photos" ? "photo" : "video");
};

regPhotosInput?.addEventListener("change", () => handleBusinessAdMediaChange(regPhotosInput, regPhotoPreview, "photos"));
regVideosInput?.addEventListener("change", () => handleBusinessAdMediaChange(regVideosInput, regVideoPreview, "videos"));

clearPreview(regPhotoPreview);
clearPreview(regVideoPreview);
if (regPhotoPreview) regPhotoPreview.innerHTML = `<span class="media-empty">Nothing selected yet.</span>`;
if (regVideoPreview) regVideoPreview.innerHTML = `<span class="media-empty">Nothing selected yet.</span>`;
if (regMediaNote) regMediaNote.textContent = "";

const buildBusinessAdMediaManifest = (requestId, photos, videos) => {
  const files = [
    ...photos.map((file) => ({ file, kind: "photos" })),
    ...videos.map((file) => ({ file, kind: "videos" }))
  ];
  return files.map(({ file, kind }) => {
    const mediaKind = kind === "photos" ? "photo" : "video";
    const folder = kind;
    const path = `${requestId}/${folder}/${newCloudUuid()}.${MEDIA_EXTENSIONS[file.type]}`;
    return { file, kind: mediaKind, path };
  });
};

const uploadBusinessAdMedia = async (manifest, onProgress) => {
  const uploaded = [];
  const failures = [];
  for (const item of manifest) {
    const { error } = await sb.storage.from("business-ad-media").upload(item.path, item.file, {
      cacheControl: "3600",
      contentType: item.file.type,
      upsert: false
    });
    if (error) failures.push(error);
    else uploaded.push({ path: item.path, kind: item.kind });
    onProgress?.(uploaded.length + failures.length, manifest.length);
  }
  return { uploaded, failures };
};

// --- Validation helpers ---
const setRegError = (inputEl, errEl, message) => {
  if (errEl) errEl.textContent = message || "";
  if (inputEl) inputEl.classList.toggle("invalid", !!message);
  return !message;
};

// Optional field: only checked when the user types something.
const URL_FIELDS = [
  ["regWebsite", "regWebsiteErr", "website"],
  ["regFacebook", "regFacebookErr", "Facebook"],
  ["regInstagram", "regInstagramErr", "Instagram"],
  ["regTiktok", "regTiktokErr", "TikTok"]
];

const isLikelyLink = (v) => /^(https?:\/\/)?[\w-]+(\.[\w-]+)+([\w.,@?^=%&:/~+#-]*)?$/.test(v.trim());

const validateRegForm = () => {
  const get = (id) => document.getElementById(id);
  let ok = true;

  // Always sync WhatsApp from mobile
  const mCode = document.getElementById("regCountryCode")?.value || "+92";
  const mNum = get("regMobile")?.value || "";
  const waEl = get("regWhatsapp");
  const waCodeEl = document.getElementById("regWhatsappCountryCode");
  if (waEl) waEl.value = mNum;
  if (waCodeEl) waCodeEl.value = mCode;

  const bizNameEl = get("regBizName");
  if (bizNameEl && bizNameEl.type !== "hidden") {
    const bizName = bizNameEl.value.trim();
    ok = setRegError(bizNameEl, get("regBizNameErr"), bizName.length < 2 ? "Please write your business name." : "") && ok;
  }

  const ownerName = get("regOwnerName").value.trim();
  ok = setRegError(get("regOwnerName"), get("regOwnerNameErr"), ownerName.length < 2 ? "Please write your name." : "") && ok;

  const mobile = combinePhoneWithCode(mCode, mNum);
  ok = setRegError(get("regMobile"), get("regMobileErr"), MOBILE_LOOKUP_RE.test(mobile) ? "" : "Please enter a valid mobile number.") && ok;

  const regEmailEl = document.getElementById("regEmail");
  if (regEmailEl) {
    const rawEm = regEmailEl.value.trim();
    const badEm = rawEm && !EMAIL_RE.test(rawEm);
    ok = setRegError(regEmailEl, document.getElementById("regEmailErr"), badEm ? "Please enter a valid email address." : "") && ok;
  }

  const category = get("regCategory").value;
  ok = setRegError(get("regCategory"), get("regCategoryErr"), category ? "" : "Please select your business category.") && ok;

  const city = get("regCity").value.trim();
  ok = setRegError(get("regCity"), get("regCityErr"), city.length < 2 ? "Please write your city & country." : "") && ok;

  const addressEl = get("regAddress");
  if (addressEl && addressEl.type !== "hidden") {
    const address = addressEl.value.trim();
    ok = setRegError(addressEl, get("regAddressErr"), address.length < 2 ? "Please write your business address or shop location." : "") && ok;
  }

  const aboutEl = get("regAbout");
  if (aboutEl && aboutEl.type !== "hidden") {
    const about = aboutEl.value.trim();
    ok = setRegError(aboutEl, get("regAboutErr"), about.length < 5 ? "Please describe your business or offers (min 5 characters)." : "") && ok;
  }

  const timingEl = get("regTiming");
  if (timingEl && timingEl.type !== "hidden") {
    const timing = timingEl.value.trim();
    ok = setRegError(timingEl, get("regTimingErr"), timing.length < 2 ? "Please write your opening hours or timings." : "") && ok;
  }

  // Social links are optional, but if filled they must look like a real link.
  URL_FIELDS.forEach(([id, errId, label]) => {
    const el = get(id);
    const raw = el.value.trim();
    const bad = raw && !isLikelyLink(raw);
    ok = setRegError(el, get(errId), bad ? `Please enter a valid ${label} link.` : "") && ok;
  });

  if (regTerms && regTerms.type === "checkbox") {
    if (regTermsErr) regTermsErr.textContent = !regTerms.checked ? "Please confirm the details." : "";
    if (!regTerms.checked) ok = false;
  }

  return ok;
};

// --- Submit ---
if (regForm) {
  regForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!validateRegForm()) {
      showToast("Please fill the highlighted fields.", true);
      regForm.querySelector(".invalid")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const planKey = getSelectedPlan();
    const planErr = document.getElementById("regPlanErr");
    if (!planKey) {
      if (planErr) planErr.textContent = "Please choose a plan above.";
      showToast("Please choose a plan first, then submit.", true);
      document.getElementById("planGrid")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (planErr) planErr.textContent = "";

    const submitButton = regForm.querySelector('button[type="submit"]');
    if (submitButton?.disabled) return;
    if (!sb) {
      showToast("Cloud registration is unavailable right now. Please try again when the connection is restored.", true);
      return;
    }

    const get = (id) => document.getElementById(id).value.trim();
    const plan = PLAN_INFO[planKey];
    const photos = [...(regPhotosInput?.files || [])];
    const videos = [...(regVideosInput?.files || [])];
    const mediaError = validateBusinessAdFiles(photos, "photos") || validateBusinessAdFiles(videos, "videos");
    if (mediaError) {
      if (regMediaNote) regMediaNote.textContent = mediaError;
      showToast(mediaError, true);
      return;
    }
    let submission;
    let mediaWarning = "";
    const entry = {
      business_name: get("regBizName") || get("regOwnerName"),
      owner_name: get("regOwnerName"),
      email: (document.getElementById("regEmail")?.value || "").trim().toLowerCase(),
      mobile: normalizeMobile(get("regMobile")),
      whatsapp: normalizeMobile(get("regWhatsapp")),
      category: get("regCategory"),
      city: get("regCity"),
      address: get("regAddress"),
      about: get("regAbout"),
      timing: get("regTiming"),
      website: get("regWebsite"),
      facebook: get("regFacebook"),
      instagram: get("regInstagram"),
      tiktok: get("regTiktok"),
      photo_count: photos.length,
      video_count: videos.length,
      plan: planKey,
      amount: plan.price
    };

    submitButton.disabled = true;
    try {
      entry.id = newCloudUuid();
      const mediaManifest = buildBusinessAdMediaManifest(entry.id, photos, videos);
      entry.media_files = mediaManifest.map(({ path, kind }) => ({ path, kind }));
      const { error } = await sb
        .from("business_ad_requests")
        .insert(entry);
      if (error) throw error;
      submission = { id: entry.id, created_at: new Date().toISOString() };

      if (mediaManifest.length) {
        if (regMediaNote) regMediaNote.textContent = "Uploading media securely… Please keep this page open until the upload finishes.";
        try {
          const result = await uploadBusinessAdMedia(mediaManifest, (done, total) => {
            if (regMediaNote) regMediaNote.textContent = `Uploading media securely… ${done} of ${total} files complete.`;
          });
          const { error: finalizeError } = await sb.rpc("finalize_business_ad_media", {
            p_request_id: submission.id,
            p_media_files: result.uploaded
          });
          if (finalizeError) throw finalizeError;
          if (result.failures.length) {
            console.error("Some business ad media failed to upload:", result.failures);
            const failedPaths = mediaManifest
              .filter((item) => !result.uploaded.some((uploadedItem) => uploadedItem.path === item.path))
              .map((item) => item.path);
            const { error: cleanupError } = await sb.rpc("cleanup_pending_business_ad_media", {
              p_request_id: submission.id,
              p_paths: failedPaths
            });
            if (cleanupError) {
              console.error("Could not remove unregistered failed business ad uploads:", cleanupError);
              mediaWarning = " Some selected files could not be uploaded. Ask the owner to clean up any incomplete uploads before resubmitting media.";
            } else {
              mediaWarning = " Some media could not be uploaded; only successful files will appear. Contact the owner if you need to add the rest.";
            }
          }
        } catch (error) {
          console.error("Business ad media processing failed:", error);
          mediaWarning = " The registration was saved, but media could not be finalized. Contact the owner with your request reference before activation.";
        }
      }

      const receipts = getRegistrationReceipts();
      receipts.unshift({
        id: submission.id,
        business: entry.business_name,
        planLabel: plan.label,
        amount: plan.price,
        at: submission.created_at
      });
      store.set(REG_RECEIPTS_KEY, receipts.slice(0, 20));

      regForm.reset();
      clearPreview(regPhotoPreview);
      clearPreview(regVideoPreview);
      if (regPhotoPreview) regPhotoPreview.innerHTML = `<span class="media-empty">Nothing selected yet.</span>`;
      if (regVideoPreview) regVideoPreview.innerHTML = `<span class="media-empty">Nothing selected yet.</span>`;
      if (regMediaNote) regMediaNote.textContent = "";
      store.set(REG_PLAN_KEY, null);
      markPlanSelected(null);
      renderPlanSummary();
      renderRegistrations();
      resetRegErrors();

      showToast(`Registration saved! Redirecting to WhatsApp to complete payment with the owner.${mediaWarning}`, !!mediaWarning);
      closeRegModal();
      regListWrap?.scrollIntoView({ behavior: "smooth", block: "start" });

      const waText = encodeURIComponent(
        `🌟 *BUSINESS AD REGISTRATION* 🌟\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🆔 *Ref ID:* ${submission.id}\n` +
        `🏢 *Business:* ${entry.business_name}\n` +
        `👤 *Owner:* ${entry.owner_name}\n` +
        `📂 *Category:* ${entry.category}\n` +
        `📍 *Location:* ${entry.city}\n` +
        (entry.address && entry.address !== "Online" ? `🏠 *Address:* ${entry.address}\n` : "") +
        (entry.timing ? `⏰ *Timings:* ${entry.timing}\n` : "") +
        (entry.about ? `📝 *Ad Details:* ${entry.about.slice(0, 100)}\n` : "") +
        (entry.website ? `🌐 *Website:* ${entry.website}\n` : "") +
        `📞 *Contact:* ${entry.mobile}\n` +
        `📅 *Plan:* ${plan.label} ($ ${plan.priceUsd || (plan.price === 2500 ? 10 : plan.price === 5000 ? 20 : 200)} / PKR ${rupees(entry.amount)})\n` +
        `📸 *Media:* ${entry.photo_count} Photos, ${entry.video_count} Video\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `Assalam o Alaikum! I have submitted my business ad on the portal with media. Please provide payment details (JazzCash / EasyPaisa / Bank Transfer) so I can pay and have my ad activated.\nThank you!` +
        (mediaWarning ? `\n\n*Note:* ${mediaWarning.trim()}` : "")
      );
      window.open(`https://wa.me/923042954627?text=${waText}`, "_blank", "noopener");
    } catch (error) {
      console.error("Business ad registration failed:", error);
      showToast(error.message || "Could not save the registration. Please try again.", true);
    } finally {
      submitButton.disabled = false;
    }
  });

  // Auto-sync WhatsApp with Mobile number
  const regMobileInput = document.getElementById("regMobile");
  const regCountrySelect = document.getElementById("regCountryCode");
  const syncWaInputs = () => {
    const waEl = document.getElementById("regWhatsapp");
    const waCodeEl = document.getElementById("regWhatsappCountryCode");
    if (waEl && regMobileInput) waEl.value = regMobileInput.value;
    if (waCodeEl && regCountrySelect) waCodeEl.value = regCountrySelect.value;
  };
  regMobileInput?.addEventListener("input", syncWaInputs);
  regCountrySelect?.addEventListener("change", syncWaInputs);

  regForm.addEventListener("input", (e) => {
    const t = e.target;
    if (t && t.classList.contains("invalid")) {
      t.classList.remove("invalid");
      const err = document.getElementById(`${t.id}Err`);
      if (err) err.textContent = "";
    }
    if (t === regTerms && regTermsErr) regTermsErr.textContent = "";
  });

  document.getElementById("regReset")?.addEventListener("click", () => {
    clearPreview(regPhotoPreview);
    clearPreview(regVideoPreview);
    if (regMediaNote) regMediaNote.textContent = "Uploaded media is saved securely and published live once your ad is verified and activated by the owner.";
    if (regPhotoPreview) regPhotoPreview.innerHTML = `<span class="media-empty">Nothing selected yet.</span>`;
    if (regVideoPreview) regVideoPreview.innerHTML = `<span class="media-empty">Nothing selected yet.</span>`;
    store.set(REG_PLAN_KEY, null);
    markPlanSelected(null);
    renderPlanSummary();
    resetRegErrors();
    showToast("Form cleared.");
  });
}

const resetRegErrors = () => {
  regForm?.querySelectorAll(".field-error").forEach((el) => { el.textContent = ""; });
  regForm?.querySelectorAll(".invalid").forEach((el) => el.classList.remove("invalid"));
};

// --- Registration modal open / close ---
const openRegModal = () => {
  if (!regModal) return;
  regModal.classList.add("open");
  regModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
};

const closeRegModal = () => {
  if (!regModal) return;
  regModal.classList.remove("open");
  regModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
};

openRegFormBtn?.addEventListener("click", openRegModal);
document.getElementById("openRegFormHero")?.addEventListener("click", openRegModal);

regModalClose?.addEventListener("click", closeRegModal);
regModal?.addEventListener("click", (e) => {
  if (e.target === regModal) closeRegModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && regModal?.classList.contains("open")) closeRegModal();
});

// Open the business registration form when arriving from category pages (#open-reg-form)
if (regModal && window.location.hash === "#open-reg-form") {
  openRegModal();
  history.replaceState(null, "", window.location.pathname + window.location.search);
}

const toggleReviewsBtn = document.getElementById("toggleReviewsBtn");
const reviewListEl = document.getElementById("reviewList");
if (toggleReviewsBtn && reviewListEl) {
  toggleReviewsBtn.addEventListener("click", () => {
    const isHidden = reviewListEl.hasAttribute("hidden");
    if (isHidden) {
      reviewListEl.removeAttribute("hidden");
      toggleReviewsBtn.textContent = "Hide Ratings & Comments";
    } else {
      reviewListEl.setAttribute("hidden", "");
      toggleReviewsBtn.textContent = "View Ratings & Comments";
    }
  });
}

// --- Submitted registrations list ---
const fmtRegDate = (v) => {
  const d = v ? new Date(v) : null;
  if (!d || isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};

const renderRegistrations = () => {
  if (!regList || !regListWrap) return;
  const list = getRegistrationReceipts().slice().sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));

  if (!list.length) {
    regListWrap.hidden = true;
    regList.innerHTML = "";
    return;
  }

  regListWrap.hidden = false;
  regList.innerHTML = list.map((r) => {
    const waText = encodeURIComponent(
      `Assalam o Alaikum! I submitted my business registration on Online Management Site.\n` +
      `Business: ${r.business}\nPlan: ${r.planLabel} (PKR ${rupees(r.amount)})\n` +
      `Request reference: ${r.id}\nPlease send me the payment details.`
    );
    return `<div class="reg-item" data-reg-id="${escHtml(r.id)}">` +
      `<div class="reg-item-head">` +
      `<span class="reg-item-name">${escHtml(r.business)}</span>` +
      `<span class="reg-item-plan">${escHtml(r.planLabel || "Plan")}</span>` +
      `<span class="reg-item-status s-pending">Submitted</span>` +
      `<button type="button" class="reg-item-del" data-reg-del="${escHtml(r.id)}">Hide receipt</button>` +
      `</div>` +
      `<div class="reg-item-meta">` +
      `<strong>Amount:</strong> PKR ${rupees(r.amount)} &nbsp;•&nbsp; ` +
      `<strong>Submitted:</strong> ${fmtRegDate(r.at)}` +
      `<br /><strong>Reference:</strong> ${escHtml(r.id)}` +
      `<br /><a class="reg-item-contact" href="https://wa.me/923042954627?text=${waText}" target="_blank" rel="noopener noreferrer">Contact owner on WhatsApp</a>` +
      `</div>` +
      `</div>`;
  }).join("");
};

if (regList) {
  regList.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-reg-del]");
    if (!btn) return;
    const id = btn.getAttribute("data-reg-del");
    const list = getRegistrationReceipts();
    const item = list.find((r) => r.id === id);
    if (!item) return;
    if (!confirm(`Hide the receipt for "${item.business}" from this browser? The online request will not be deleted.`)) return;
    store.set(REG_RECEIPTS_KEY, list.filter((r) => r.id !== id));
    renderRegistrations();
    showToast("Receipt hidden from this browser.");
  });
}

markPlanSelected(getSelectedPlan());
renderPlanSummary();
