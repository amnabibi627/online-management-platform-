// ============================================================
// Home page - 17-business-ads.js
// CEO business ads panel: payments, activation and expiry.
// Split from the original script.js during the 2026-11 refactor.
// Loaded in numeric order by the page HTML. Keep that order.
// ============================================================

// ===== Business Ads (CEO panel) =====
const PLAN_DAYS = { "15days": 15, "30days": 30, "1year": 365 };

const bizAdsModal = document.getElementById("bizAdsModal");
const bizAdsPanel = document.getElementById("bizAdsPanel");
let bizAdsFilter = "all";
let businessAdRequests = [];
let bizAdsBusy = false;
let legacyAdsMigrated = false;

const adStatusOf = (ad) => {
  if (ad.status === "live" && ad.expiresAt && new Date(ad.expiresAt).getTime() <= Date.now()) {
    return "expired";
  }
  return ad.status || "pending";
};

const AD_STATUS_LABEL = {
  pending: "Awaiting payment",
  paid: "Payment received",
  live: "Ad Live",
  expired: "Expired",
  stopped: "Stopped"
};

const planLabel = (planKey) => PLAN_INFO[planKey]?.label || "Plan";
const mapBusinessAdRequest = (row) => ({
  id: row.id,
  business: row.business_name,
  owner: row.owner_name,
  mobile: row.mobile,
  whatsapp: row.whatsapp,
  category: row.category,
  city: row.city,
  address: row.address,
  about: row.about,
  timing: row.timing,
  website: row.website,
  facebook: row.facebook,
  instagram: row.instagram,
  tiktok: row.tiktok,
  mediaFiles: Array.isArray(row.media_files) ? row.media_files : [],
  photoCount: row.photo_count,
  videoCount: row.video_count,
  plan: row.plan,
  planLabel: planLabel(row.plan),
  amount: row.amount,
  status: row.status,
  paidAt: row.payment_received_at,
  startedAt: row.started_at,
  expiresAt: row.expires_at,
  at: row.created_at
});

const normalizeLegacyAd = (ad, index) => {
  if (!ad || typeof ad !== "object" || !PLAN_INFO[ad.plan]) return null;
  const text = (value, max) => typeof value === "string" && value.trim().length <= max ? value.trim() : "";
  const business = text(ad.business, 100);
  const owner = text(ad.owner, 80);
  const mobile = normalizeMobile(ad.mobile);
  const whatsapp = normalizeMobile(ad.whatsapp || ad.mobile);
  const category = text(ad.category, 60);
  const city = text(ad.city, 40);
  const address = text(ad.address, 160);
  const about = text(ad.about, 300);
  const timing = text(ad.timing, 80);
  if (business.length < 3 || owner.length < 3 || !MOBILE_LOOKUP_RE.test(mobile) ||
      !MOBILE_LOOKUP_RE.test(whatsapp) || category.length < 2 || city.length < 2 ||
      address.length < 5 || about.length < 10 || timing.length < 3) return null;
  const optionalText = (value) => text(value || "", 200);
  const createdAt = ad.at && !Number.isNaN(Date.parse(ad.at)) ? new Date(ad.at).toISOString() : new Date().toISOString();
  return {
    legacy_id: String(ad.id || `legacy-${createdAt}-${index}`),
    business_name: business,
    owner_name: owner,
    mobile,
    whatsapp,
    category,
    city,
    address,
    about,
    timing,
    website: optionalText(ad.website),
    facebook: optionalText(ad.facebook),
    instagram: optionalText(ad.instagram),
    tiktok: optionalText(ad.tiktok),
    photo_count: 0,
    video_count: 0,
    media_files: [],
    plan: ad.plan,
    amount: PLAN_INFO[ad.plan].price,
    status: "pending",
    created_at: createdAt
  };
};

const migrateLegacyBusinessAds = async () => {
  if (legacyAdsMigrated) return;
  if (!sb || !cloudUser || !ceoLoggedIn) throw new Error("Sign in as the CEO to migrate older business registrations.");

  const { data: legacyRow, error: readError } = await sb
    .from(CLOUD_TABLE)
    .select("value")
    .eq("user_id", cloudUser.id)
    .eq("key", REG_KEY)
    .maybeSingle();
  if (readError) throw readError;

  const localLegacy = store.get(REG_KEY, []);
  const cloudLegacy = legacyRow?.value;
  const legacy = [
    ...(Array.isArray(localLegacy) ? localLegacy : []),
    ...(Array.isArray(cloudLegacy) ? cloudLegacy : [])
  ];
  const unique = new Map();
  legacy.forEach((ad, index) => {
    const normalized = normalizeLegacyAd(ad, index);
    if (!normalized) throw new Error("An older registration is incomplete or invalid. It was kept unchanged; review it before retrying migration.");
    unique.set(normalized.legacy_id, normalized);
  });

  const rows = [...unique.values()].map(({ created_at, ...row }) => row);
  if (rows.length) {
    const { error } = await sb
      .from("business_ad_requests")
      .upsert(rows, { onConflict: "legacy_id", ignoreDuplicates: true });
    if (error) throw error;
  }

  if (legacyRow) {
    const { error } = await sb.from(CLOUD_TABLE).delete()
      .eq("user_id", cloudUser.id)
      .eq("key", REG_KEY);
    if (error) throw error;
  }
  try { localStorage.removeItem(REG_KEY); } catch (error) {
    console.warn("Could not remove the migrated local business registrations:", error);
  }
  legacyAdsMigrated = true;
};

const loadBusinessAdRequests = async () => {
  if (!sb || !cloudUser || !ceoLoggedIn) throw new Error("Sign in as the CEO to load business ad requests.");
  const rows = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await sb
      .from("business_ad_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  businessAdRequests = rows.map(mapBusinessAdRequest);
};

const bizAdRowHtml = (ad) => {
  const status = adStatusOf(ad);
  const active = status === "live";
  const expiredTxt = ad.expiresAt ? fmtRegDate(ad.expiresAt) : "";

  const safeLink = (v) => {
    try {
      const s = String(v || "").trim();
      if (!s) return "";
      const abs = /^https?:\/\//i.test(s) ? s : `https://${s}`;
      const u = new URL(abs);
      if (u.protocol === "http:" || u.protocol === "https:") return u.href;
    } catch (error) {
      console.warn("Invalid business ad link was omitted:", error);
    }
    return "";
  };
  const linkHtml = (url, label) => {
    const safe = safeLink(url);
    return safe ? `<a class="biz-ad-link" href="${escHtml(safe)}" target="_blank" rel="noopener noreferrer">${label}</a>` : "";
  };

  const actionButtons = [];
  if (status === "pending") {
    actionButtons.push(`<button type="button" class="biz-ad-btn ok" data-ad-action="paid" data-ad-id="${escHtml(ad.id)}">Payment Received</button>`);
  }
  if (status === "paid") {
    actionButtons.push(`<button type="button" class="biz-ad-btn go" data-ad-action="live" data-ad-id="${escHtml(ad.id)}">Activate Ad</button>`);
  }
  if (active) {
    actionButtons.push(`<button type="button" class="biz-ad-btn" data-ad-action="extend" data-ad-id="${escHtml(ad.id)}">Extend</button>`);
    actionButtons.push(`<button type="button" class="biz-ad-btn stop" data-ad-action="stop" data-ad-id="${escHtml(ad.id)}">Stop Ad</button>`);
  }
  if (status === "expired" || status === "stopped") {
    actionButtons.push(`<button type="button" class="biz-ad-btn go" data-ad-action="live" data-ad-id="${escHtml(ad.id)}">Re-activate</button>`);
  }
  actionButtons.push(`<button type="button" class="biz-ad-btn del" data-ad-action="delete" data-ad-id="${escHtml(ad.id)}">Delete</button>`);

  return `<article class="biz-ad" data-ad-id="${escHtml(ad.id)}">` +
    `<div class="biz-ad-head">` +
      `<span class="biz-ad-name">${escHtml(ad.business)}</span>` +
      `<span class="biz-ad-plan">${escHtml(ad.planLabel || "Plan")}</span>` +
      `<span class="biz-ad-status s-${status}">${AD_STATUS_LABEL[status]}</span>` +
      `<span class="biz-ad-amount">PKR ${rupees(ad.amount)}</span>` +
    `</div>` +
    `<div class="biz-ad-grid">` +
      `<div><span>Owner</span><strong>${escHtml(ad.owner)}</strong></div>` +
      `<div><span>Mobile</span><strong>${escHtml(ad.mobile)}</strong></div>` +
      `<div><span>WhatsApp</span><strong>${escHtml(ad.whatsapp || ad.mobile)}</strong></div>` +
      `<div><span>Category</span><strong>${escHtml(ad.category)}</strong></div>` +
      `<div><span>City</span><strong>${escHtml(ad.city)}</strong></div>` +
      `<div><span>Submitted</span><strong>${fmtRegDate(ad.at) || "-"}</strong></div>` +
      `<div><span>Payment verified</span><strong>${ad.paidAt ? fmtRegDate(ad.paidAt) : "No"}</strong></div>` +
      `<div><span>Media uploaded</span><strong>${ad.photoCount || 0} photo(s), ${ad.videoCount || 0} video(s)</strong></div>` +
      (active || expiredTxt ? `<div><span>Expires on</span><strong>${expiredTxt || "-"}</strong></div>` : "") +
    `</div>` +
    (ad.about ? `<p class="biz-ad-about">${escHtml(ad.about)}</p>` : "") +
    (ad.address || ad.website || ad.facebook || ad.instagram || ad.tiktok
      ? `<div class="biz-ad-links">` +
          (ad.address ? `<span class="biz-ad-link plain">📍 ${escHtml(ad.address)}</span>` : "") +
          linkHtml(ad.website, "🌐 Website") +
          linkHtml(ad.facebook, "Facebook") +
          linkHtml(ad.instagram, "Instagram") +
          linkHtml(ad.tiktok, "TikTok") +
        `</div>`
      : "") +
    (ad.mediaFiles.length
      ? `<div class="biz-ad-media-tools"><button type="button" class="biz-ad-btn" data-ad-media="${escHtml(ad.id)}">Preview uploaded media (${ad.mediaFiles.length})</button><div class="biz-ad-media-links" data-ad-media-links="${escHtml(ad.id)}" hidden></div></div>`
      : "") +
    `<div class="biz-ad-actions">${actionButtons.join("")}</div>` +
  `</article>`;
};

const renderBizAdsPanel = () => {
  if (!bizAdsPanel) return;
  const all = businessAdRequests.slice().sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
  const counts = { pending: 0, paid: 0, live: 0, expired: 0, stopped: 0 };
  all.forEach((a) => { counts[adStatusOf(a)] = (counts[adStatusOf(a)] || 0) + 1; });

  const filters = [
    ["all", `All (${all.length})`],
    ["pending", `Awaiting (${counts.pending})`],
    ["paid", `Paid (${counts.paid})`],
    ["live", `Live (${counts.live})`],
    ["expired", `Expired (${counts.expired + counts.stopped})`]
  ];

  const rows = bizAdsFilter === "all"
    ? all
    : all.filter((a) => {
        const s = adStatusOf(a);
        if (bizAdsFilter === "expired") return s === "expired" || s === "stopped";
        return s === bizAdsFilter;
      });

  const totalPaid = all.filter((a) => a.paidAt)
    .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

  bizAdsPanel.innerHTML =
    `<button class="admin-close" type="button" data-biz-ads-close aria-label="Close">×</button>` +
    `<h3 class="admin-title">📢 Business Ads</h3>` +
    `<p class="modal-sub">Confirm the payment first, then activate the ad. Expiry is set automatically from the plan.</p>` +

    `<div class="admin-stat-grid">` +
      `<div class="admin-stat"><div class="admin-stat-num">${all.length}</div><div class="admin-stat-lbl">Total Requests</div></div>` +
      `<div class="admin-stat"><div class="admin-stat-num">${counts.pending}</div><div class="admin-stat-lbl">Awaiting Payment</div></div>` +
      `<div class="admin-stat"><div class="admin-stat-num">${counts.live}</div><div class="admin-stat-lbl">Live Ads</div></div>` +
      `<div class="admin-stat"><div class="admin-stat-num">PKR ${rupees(totalPaid)}</div><div class="admin-stat-lbl">Payment Received</div></div>` +
    `</div>` +

    `<div class="biz-ad-filters">` +
      filters.map(([id, label]) =>
        `<button type="button" class="biz-ad-filter${bizAdsFilter === id ? " active" : ""}" data-ad-filter="${id}">${label}</button>`
      ).join("") +
    `</div>` +

    (rows.length
      ? `<div class="biz-ad-list">${rows.map(bizAdRowHtml).join("")}</div>`
      : `<p class="admin-empty">No ads in this list yet.</p>`);
};

const openBizAdsPanel = async () => {
  const isCeo = (ceoLoggedIn && ceoUser) || !!store.get("ceoAccount") || localStorage.getItem("ceoLoggedIn") === "true";
  let hasCloudAdmin = false;
  if (sb && cloudUser) {
    try {
      hasCloudAdmin = await isCloudAdmin();
    } catch (_) {}
  }
  if (!isCeo && !hasCloudAdmin) {
    showToast("Business Ads requires an active CEO login.", true);
    return;
  }
  closeCeoModal();
  bizAdsFilter = "all";
  bizAdsPanel.innerHTML = `<p class="admin-empty">Loading cloud registrations…</p>`;
  bizAdsModal.classList.add("open");
  bizAdsModal.setAttribute("aria-hidden", "false");
  try {
    await migrateLegacyBusinessAds();
    await loadBusinessAdRequests();
    renderBizAdsPanel();
  } catch (error) {
    console.error("Business ad admin panel failed to load:", error);
    bizAdsPanel.innerHTML = `<button class="admin-close" type="button" data-biz-ads-close aria-label="Close">×</button>` +
      `<h3 class="admin-title">Business Ads</h3><p class="admin-empty">Could not load ad requests: ${escHtml(error.message || "Unknown error")}</p>`;
  }
};

const closeBizAdsPanel = () => {
  if (!bizAdsModal) return;
  bizAdsModal.classList.remove("open");
  bizAdsModal.setAttribute("aria-hidden", "true");
  bizAdsPanel.innerHTML = "";
};

document.getElementById("ceoBizAdsPanel")?.addEventListener("click", openBizAdsPanel);

bizAdsModal?.addEventListener("click", (e) => {
  if (e.target === bizAdsModal || e.target.closest("[data-biz-ads-close]")) { closeBizAdsPanel(); return; }

  const mediaButton = e.target.closest("[data-ad-media]");
  if (mediaButton) {
    const ad = businessAdRequests.find((item) => item.id === mediaButton.dataset.adMedia);
    const linksContainer = bizAdsPanel.querySelector(`[data-ad-media-links="${CSS.escape(mediaButton.dataset.adMedia)}"]`);
    if (!ad || !linksContainer || mediaButton.disabled) return;
    mediaButton.disabled = true;
    (async () => {
      try {
        const paths = ad.mediaFiles.map((item) => item.path);
        const { data, error } = await sb.storage.from("business-ad-media").createSignedUrls(paths, 600);
        if (error) throw error;
        linksContainer.innerHTML = (data || []).map((item, index) => {
          const media = ad.mediaFiles.find((file) => file.path === item.path) || ad.mediaFiles[index];
          if (!item.signedUrl) return "";
          const label = `${media?.kind === "video" ? "Video" : "Photo"} ${index + 1}`;
          return `<a href="${escHtml(item.signedUrl)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
        }).filter(Boolean).join(" · ") || `<span>No uploaded files are available.</span>`;
        linksContainer.hidden = false;
      } catch (error) {
        console.error("Could not create business ad media preview links:", error);
        showToast(error.message || "Could not load uploaded media.", true);
      } finally {
        mediaButton.disabled = false;
      }
    })();
    return;
  }

  const filterBtn = e.target.closest("[data-ad-filter]");
  if (filterBtn) { bizAdsFilter = filterBtn.dataset.adFilter; renderBizAdsPanel(); return; }

  const actionBtn = e.target.closest("[data-ad-action]");
  if (!actionBtn || bizAdsBusy) return;

  const { adId: id, adAction: action } = actionBtn.dataset;
  const ad = businessAdRequests.find((r) => r.id === id);
  if (!ad) { showToast("This ad request is no longer available. Refresh the list.", true); return; }
  if (action === "delete" && !confirm(`Delete the registration for "${ad.business}"?`)) return;

  const rpcNames = {
    paid: "admin_business_ad_mark_paid",
    live: "admin_business_ad_publish",
    extend: "admin_business_ad_extend",
    stop: "admin_business_ad_stop",
    delete: "admin_business_ad_delete"
  };
  const rpc = rpcNames[action];
  if (!rpc) return;

  bizAdsBusy = true;
  actionBtn.disabled = true;
  (async () => {
    try {
      const { error } = await sb.rpc(rpc, { p_request_id: id });
      if (error) throw error;
      const messages = {
        paid: `Payment marked received for ${ad.business}.`,
        live: `${ad.business} ad activated for ${PLAN_DAYS[ad.plan]} days.`,
        extend: `${ad.business} ad extended.`,
        stop: `${ad.business} ad stopped.`,
        delete: "Ad request deleted."
      };
      showToast(messages[action]);
      try {
        await loadBusinessAdRequests();
        renderBizAdsPanel();
      } catch (refreshError) {
        console.error("Business ad action succeeded but the list refresh failed:", refreshError);
        showToast("Action completed, but the list could not refresh. Close and reopen Business Ads.", true);
      }
    } catch (error) {
      console.error(`Business ad action '${action}' failed:`, error);
      showToast(error.message || "The ad action failed. Please refresh and try again.", true);
      renderBizAdsPanel();
    } finally {
      bizAdsBusy = false;
    }
  })();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && bizAdsModal?.classList.contains("open")) closeBizAdsPanel();
});

renderRegistrations();
