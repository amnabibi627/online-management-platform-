// ===== Cloud-backed live business ads =====
const liveAdsGrid = document.getElementById("liveAdsGrid");
const liveAdsEmpty = document.getElementById("liveAdsEmpty");
const adsSupabase = window.OMS_FEATURE_MODULES?.supabaseClient;
let liveAdsLoading = false;
const liveAdMediaUrlCache = new Map();

const planPrice = (plan) => {
  if (plan === "1year") return "60,000";
  if (plan === "30days") return "5,000";
  if (plan === "15days") return "2,500";
  return "";
};

const liveAdsEscape = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));

const safeBusinessUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
  } catch (error) {
    console.warn("Invalid public business link was omitted:", error);
    return "";
  }
};

const signAdMedia = async (ads) => {
  const now = Date.now();
  liveAdMediaUrlCache.forEach((cached, path) => {
    if (cached.expiresAt <= now) liveAdMediaUrlCache.delete(path);
  });
  const paths = ads.flatMap((ad) =>
    Array.isArray(ad.media_files)
      ? ad.media_files.filter((file) => file && typeof file.path === "string").map((file) => file.path)
      : []
  );
  const missing = [...new Set(paths)].filter((path) => !liveAdMediaUrlCache.has(path));
  for (let offset = 0; offset < missing.length; offset += 100) {
    const { data, error } = await adsSupabase.storage
      .from("business-ad-media")
      .createSignedUrls(missing.slice(offset, offset + 100), 900);
    if (error) throw error;
    (data || []).forEach((item) => {
      if (item.path && item.signedUrl) {
        liveAdMediaUrlCache.set(item.path, { url: item.signedUrl, expiresAt: now + 840000 });
      } else if (item.error) {
        throw new Error(item.error.message || "Could not sign an ad media link.");
      }
    });
  }
  if ([...new Set(paths)].some((path) => !liveAdMediaUrlCache.has(path))) {
    throw new Error("One or more business media links could not be signed.");
  }
  return new Map(paths.map((path) => [path, liveAdMediaUrlCache.get(path)?.url]).filter(([, url]) => url));
};

const renderLiveAds = async () => {
  if (!liveAdsGrid || liveAdsLoading) return;
  liveAdsLoading = true;
  try {
    if (!adsSupabase) throw new Error("The cloud service is not configured.");
    const { data, error } = await adsSupabase
      .from("business_ads")
      .select("request_id,business_name,category,city,address,about,timing,whatsapp,website,facebook,instagram,tiktok,media_files,plan,amount,started_at,expires_at")
      .gt("expires_at", new Date().toISOString())
      .order("started_at", { ascending: false });
    if (error) throw error;

    const planOrder = { "1year": 0, "30days": 1, "15days": 2 };
    const list = (data || []).slice().sort((a, b) =>
      (planOrder[a.plan] ?? 9) - (planOrder[b.plan] ?? 9) ||
      new Date(b.started_at) - new Date(a.started_at)
    );
    if (!list.length) {
      liveAdsGrid.innerHTML = "";
      if (liveAdsEmpty) {
        liveAdsEmpty.textContent = "No running ads yet.";
        liveAdsEmpty.hidden = false;
      }
      return;
    }
    if (liveAdsEmpty) liveAdsEmpty.hidden = true;
    let mediaUrls = new Map();
    let mediaUnavailable = false;
    try {
      mediaUrls = await signAdMedia(list);
    } catch (error) {
      console.error("Could not create public business ad media links:", error);
      mediaUnavailable = true;
    }

    const renderedCards = list.map((ad) => {
      const waNum = String(ad.whatsapp || "").replace(/\D/g, "");
      const contact = waNum
        ? `<a class="fiverr-gig-contact" href="https://wa.me/${liveAdsEscape(waNum)}" target="_blank" rel="noopener noreferrer">Contact</a>`
        : `<span class="fiverr-gig-contact disabled">Contact unavailable</span>`;
      const initials = String(ad.business_name || "B").trim().charAt(0).toUpperCase();
      const links = [
        ["website", "Website"],
        ["facebook", "Facebook"],
        ["instagram", "Instagram"],
        ["tiktok", "TikTok"]
      ].map(([key, label]) => {
        const url = safeBusinessUrl(ad[key]);
        return url ? `<a href="${liveAdsEscape(url)}" target="_blank" rel="noopener noreferrer">${label}</a>` : "";
      }).filter(Boolean);
      const planText = ad.plan === "1year" ? "1 Year" : ad.plan === "30days" ? "30 Days" : "15 Days";
      const mediaItems = (Array.isArray(ad.media_files) ? ad.media_files : [])
        .map((file) => ({ ...file, url: mediaUrls.get(file.path) }))
        .filter((file) => file.url && (file.kind === "photo" || file.kind === "video"));
      const mediaHtml = mediaItems.length
        ? `<div class="fiverr-gig-media" aria-label="Business photos and videos">${mediaItems.map((file, index) =>
            file.kind === "video"
              ? `<video class="fiverr-gig-media-item" src="${liveAdsEscape(file.url)}" controls playsinline preload="none" aria-label="${liveAdsEscape(ad.business_name)} video ${index + 1}"></video>`
              : `<img class="fiverr-gig-media-item" src="${liveAdsEscape(file.url)}" alt="${liveAdsEscape(ad.business_name)} photo ${index + 1}" loading="lazy" />`
          ).join("")}</div>`
        : `<div class="fiverr-gig-thumb"><div class="fiverr-gig-thumb-inner"></div>${mediaUnavailable && ad.media_files?.length ? `<span class="fiverr-gig-media-error">Media temporarily unavailable.</span>` : ""}</div>`;

      return `<article class="fiverr-gig-card">` +
        mediaHtml +
        `<div class="fiverr-gig-content">` +
          `<div class="fiverr-gig-seller">` +
            `<div class="fiverr-gig-avatar">${liveAdsEscape(initials)}</div>` +
            `<div class="fiverr-gig-seller-info">` +
              `<div class="fiverr-gig-seller-name">${liveAdsEscape(ad.business_name)}</div>` +
              `<div class="fiverr-gig-seller-badge">Paid listing</div>` +
            `</div>` +
          `</div>` +
          `<h3 class="fiverr-gig-title">${liveAdsEscape(ad.category || "")}${ad.about ? ` - ${liveAdsEscape(ad.about)}` : ""}</h3>` +
          `<div class="fiverr-gig-meta">` +
            (ad.city ? `<span class="fiverr-gig-meta-item">📍 ${liveAdsEscape(ad.city)}</span>` : "") +
            (ad.timing ? `<span class="fiverr-gig-meta-item">🕒 ${liveAdsEscape(ad.timing)}</span>` : "") +
          `</div>` +
          (ad.address ? `<div class="fiverr-gig-address">📍 ${liveAdsEscape(ad.address)}</div>` : "") +
          (links.length ? `<div class="fiverr-gig-links">${links.join(" • ")}</div>` : "") +
          `<div class="fiverr-gig-footer">` +
            `<div class="fiverr-gig-price">` +
              `<span class="fiverr-gig-price-label">Listing plan</span>` +
              `<span class="fiverr-gig-price-amount">PKR ${liveAdsEscape(planPrice(ad.plan))}</span>` +
              `<span class="fiverr-gig-price-plan">${liveAdsEscape(planText)}</span>` +
            `</div>` +
            contact +
          `</div>` +
        `</div>` +
      `</article>`;
    }).join("");
    if (liveAdsGrid.innerHTML !== renderedCards) liveAdsGrid.innerHTML = renderedCards;
  } catch (error) {
    console.error("Could not load cloud business ads:", error);
    liveAdsGrid.innerHTML = "";
    if (liveAdsEmpty) {
      liveAdsEmpty.textContent = "Live listings are temporarily unavailable. Please try again later.";
      liveAdsEmpty.hidden = false;
    }
  } finally {
    liveAdsLoading = false;
  }
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", renderLiveAds);
} else {
  renderLiveAds();
}
setInterval(renderLiveAds, 60000);
