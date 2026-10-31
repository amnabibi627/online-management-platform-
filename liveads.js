// ===== Cloud-backed live business ads (Fiverr Profile & Gig Style) =====
const liveAdsGrid = document.getElementById("liveAdsGrid");
const liveAdsEmpty = document.getElementById("liveAdsEmpty");
const adsSupabase = window.OMS_FEATURE_MODULES?.supabaseClient;
let liveAdsLoading = false;
const liveAdMediaUrlCache = new Map();

const planPrice = (plan) => {
  if (plan === "1year") return "60,000";
  if (plan === "30days") return "5,000";
  if (plan === "15days") return "2,500";
  return "2,500";
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
    try {
      mediaUrls = await signAdMedia(list);
    } catch (error) {
      console.warn("Could not sign business ad media links:", error);
    }

    const renderedCards = list.map((ad) => {
      const waNum = String(ad.whatsapp || "").replace(/\D/g, "");
      const isFiverr = !!(ad.website && /fiverr\.com/i.test(ad.website));
      const isInfluencerGig = isFiverr && (ad.website.includes("kXXdgoN") || ad.website.includes("amnabibi"));

      // 1. Seller Name & Level Badge (Never generic 'Freelancing' or 'Paid listing')
      let sellerName = String(ad.business_name || "").trim();
      let sellerUsername = "";
      let sellerBadge = "Level 2 Seller";
      let ratingCount = "100+";

      if (isInfluencerGig || sellerName.toLowerCase() === "freelancing") {
        sellerName = "Amna Bibi";
        sellerUsername = "@amnabibi5693";
        sellerBadge = "Level 2 Seller";
        ratingCount = "100+";
      } else {
        sellerBadge = "Verified Pro";
        ratingCount = "50+";
      }

      const initials = sellerName.charAt(0).toUpperCase() || "A";

      // 2. Clean Gig Title (Never prefix 'Other - ')
      let rawTitle = "";
      if (isInfluencerGig) {
        rawTitle = "I will do influencer marketing research for Instagram, TikTok and YouTube";
      } else {
        let cleanAbout = String(ad.about || "").replace(/^Other\s*[-–—:]\s*/i, "").trim();
        if (cleanAbout) {
          rawTitle = cleanAbout.length > 90 ? cleanAbout.slice(0, 87) + "…" : cleanAbout;
        } else if (ad.category && ad.category !== "Other") {
          rawTitle = `Professional ${ad.category} Management & Services`;
        } else {
          rawTitle = sellerName || "Professional Services";
        }
      }

      // 3. About description excerpt
      let aboutSnippet = String(ad.about || "").replace(/^Other\s*[-–—:]\s*/i, "").trim();
      if (aboutSnippet.toLowerCase() === rawTitle.toLowerCase()) {
        aboutSnippet = "";
      } else if (aboutSnippet.length > 120) {
        aboutSnippet = aboutSnippet.slice(0, 117) + "…";
      }

      // 4. Location Display (Never repeat Bahawalpur twice)
      const cityClean = String(ad.city || "").trim();
      const addrClean = String(ad.address || "").trim();
      let locationText = "";
      if (cityClean && addrClean && cityClean.toLowerCase() === addrClean.toLowerCase()) {
        locationText = `${cityClean}, Pakistan`;
      } else if (cityClean && addrClean) {
        if (addrClean.toLowerCase().includes(cityClean.toLowerCase())) {
          locationText = addrClean;
        } else {
          locationText = `${addrClean}, ${cityClean}`;
        }
      } else {
        locationText = cityClean || addrClean || "Pakistan";
      }

      // 5. Media Cover Image (Show real gig photo / user media / sleek banner)
      let mediaHtml = "";
      const mediaItems = (Array.isArray(ad.media_files) ? ad.media_files : [])
        .map((file) => ({ ...file, url: mediaUrls.get(file.path) }))
        .filter((file) => file.url && (file.kind === "photo" || file.kind === "video"));

      if (mediaItems.length) {
        mediaHtml = `<div class="fiverr-gig-media" aria-label="Gig media">${mediaItems.map((file, index) =>
          file.kind === "video"
            ? `<video class="fiverr-gig-media-item" src="${liveAdsEscape(file.url)}" controls playsinline preload="none"></video>`
            : `<img class="fiverr-gig-media-item" src="${liveAdsEscape(file.url)}" alt="${liveAdsEscape(sellerName)} photo ${index + 1}" loading="lazy" />`
        ).join("")}</div>`;
      } else if (isInfluencerGig) {
        const fiverrGigImg = "https://fiverr-res.cloudinary.com/images/t_main1,q_auto,f_auto,q_auto,f_auto/gigs/468928323/original/7a953eb03eb955d5f71236f8a7e2f846593be3de/do-influencer-marketing-research-for-instagram-tiktok-and-youtube.jpg";
        mediaHtml = `
          <div class="fiverr-gig-media-wrap">
            <a href="${liveAdsEscape(ad.website)}" target="_blank" rel="noopener noreferrer">
              <img class="fiverr-gig-media-item" src="${fiverrGigImg}" alt="Influencer Marketing Research" loading="lazy" />
            </a>
            <span class="fiverr-gig-pro-badge">Top Rated</span>
          </div>
        `;
      } else {
        mediaHtml = `
          <div class="fiverr-gig-banner-placeholder">
            <span class="fiverr-gig-pro-badge">Verified Gig</span>
            <div class="fiverr-banner-center">
              <span class="fiverr-banner-icon">🎯</span>
              <div class="fiverr-banner-tag">${liveAdsEscape(ad.category !== "Other" ? ad.category : "Freelance Pro")}</div>
            </div>
            <div class="fiverr-banner-footer">⭐ 5.0 Rated &bull; 100% Quality Guaranteed</div>
          </div>
        `;
      }

      // 6. Tags
      const tags = isInfluencerGig
        ? ["Influencer Marketing", "Instagram", "TikTok", "YouTube"]
        : (ad.category && ad.category !== "Other" ? [ad.category] : ["Freelance", "Verified"]);

      // 7. Action buttons
      let actionButtons = "";
      if (isFiverr) {
        actionButtons += `<a class="fiverr-gig-btn-order" href="${liveAdsEscape(ad.website)}" target="_blank" rel="noopener noreferrer"><span>View on Fiverr</span> &rarr;</a>`;
      }
      if (waNum) {
        actionButtons += `<a class="fiverr-gig-btn-wa" href="https://wa.me/${liveAdsEscape(waNum)}" target="_blank" rel="noopener noreferrer"><span>💬 WhatsApp</span></a>`;
      }

      const startingPrice = isInfluencerGig ? "2,500" : planPrice(ad.plan);

      return `<article class="fiverr-gig-card">` +
        mediaHtml +
        `<div class="fiverr-gig-content">` +
          `<div class="fiverr-gig-seller">` +
            `<div class="fiverr-gig-avatar-wrap">` +
              `<div class="fiverr-gig-avatar">${liveAdsEscape(initials)}</div>` +
              `<span class="fiverr-online-dot" title="Online now"></span>` +
            `</div>` +
            `<div class="fiverr-gig-seller-info">` +
              `<div class="fiverr-gig-seller-name-row">` +
                `<span class="fiverr-gig-seller-name">${liveAdsEscape(sellerName)}</span>` +
                (sellerUsername ? `<span class="fiverr-gig-username">${liveAdsEscape(sellerUsername)}</span>` : "") +
              `</div>` +
              `<div class="fiverr-gig-seller-badge"><span class="fiverr-badge-star">⭐</span> ${liveAdsEscape(sellerBadge)}</div>` +
            `</div>` +
          `</div>` +
          `<h3 class="fiverr-gig-title">` +
            (isFiverr ? `<a href="${liveAdsEscape(ad.website)}" target="_blank" rel="noopener noreferrer">${liveAdsEscape(rawTitle)}</a>` : liveAdsEscape(rawTitle)) +
          `</h3>` +
          (aboutSnippet ? `<p class="fiverr-gig-desc">${liveAdsEscape(aboutSnippet)}</p>` : "") +
          `<div class="fiverr-gig-rating-row">` +
            `<span class="fiverr-star">★</span>` +
            `<strong class="fiverr-rating-val">5.0</strong>` +
            `<span class="fiverr-rating-count">(${ratingCount})</span>` +
            `<span class="fiverr-dot-sep">•</span>` +
            `<span class="fiverr-gig-location">📍 ${liveAdsEscape(locationText)}</span>` +
          `</div>` +
          `<div class="fiverr-gig-tags">` +
            tags.map((t) => `<span class="fiverr-tag">${liveAdsEscape(t)}</span>`).join("") +
            (ad.timing ? `<span class="fiverr-tag fiverr-tag-timing">🕒 ${liveAdsEscape(ad.timing)}</span>` : "") +
          `</div>` +
          `<div class="fiverr-gig-footer">` +
            `<div class="fiverr-gig-price">` +
              `<span class="fiverr-gig-price-label">Starting at</span>` +
              `<span class="fiverr-gig-price-amount">PKR ${liveAdsEscape(startingPrice)}</span>` +
            `</div>` +
            `<div class="fiverr-gig-actions">${actionButtons}</div>` +
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
