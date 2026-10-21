// ===== Live Business Ads (Fiverr Style) =====
const liveAdsGrid = document.getElementById('liveAdsGrid');
const liveAdsEmpty = document.getElementById('liveAdsEmpty');

const planPrice = (plan) => {
  if (plan === '1year') return '60,000';
  if (plan === '30days') return '5,000';
  if (plan === '15days') return '2,500';
  return '';
};

const renderLiveAds = () => {
  if (!liveAdsGrid) return;
  if (typeof sweepExpiredAds === 'function') sweepExpiredAds();

  const getRegs = typeof getRegistrations === 'function' ? getRegistrations : () => [];
  const getStatus = typeof adStatusOf === 'function' ? adStatusOf : (a) => a.status || 'pending';
  const esc = typeof escHtml === 'function' ? escHtml : (s) => String(s || '');

  const list = getRegs().filter(ad => getStatus(ad) === 'live').sort((a,b) => {
    if (a.plan === b.plan) return new Date(b.startedAt || b.at || 0) - new Date(a.startedAt || a.at || 0);
    const order = { '1year': 0, '30days': 1, '15days': 2 };
    return (order[a.plan] ?? 9) - (order[b.plan] ?? 9);
  });

  if (!list.length) {
    liveAdsGrid.innerHTML = '';
    if (liveAdsEmpty) liveAdsEmpty.hidden = false;
    return;
  }
  if (liveAdsEmpty) liveAdsEmpty.hidden = true;

  liveAdsGrid.innerHTML = list.map(ad => {
    const waNum = String(ad.whatsapp || ad.mobile || '').replace(/\D/g,'');
    const wa = waNum ? 'https://wa.me/' + waNum : '#';
    const initials = (ad.business || 'B').trim().charAt(0).toUpperCase();
    const price = planPrice(ad.plan);
    const planLabel = ad.planLabel || '';

    const links = [];
    const fix = (v) => { const s = String(v||'').trim(); if(!s)return ''; return /^https?:\/\//i.test(s)?s:'https://'+s; };
    if (ad.website) links.push('<a href="' + esc(fix(ad.website)) + '" target="_blank" rel="noopener">Website</a>');
    if (ad.facebook) links.push('<a href="' + esc(fix(ad.facebook)) + '" target="_blank" rel="noopener">Facebook</a>');
    if (ad.instagram) links.push('<a href="' + esc(fix(ad.instagram)) + '" target="_blank" rel="noopener">Instagram</a>');
    if (ad.tiktok) links.push('<a href="' + esc(fix(ad.tiktok)) + '" target="_blank" rel="noopener">TikTok</a>');

    return '<article class="fiverr-gig-card">' +
      '<div class="fiverr-gig-thumb">' +
        '<div class="fiverr-gig-thumb-inner"></div>' +
      '</div>' +
      '<div class="fiverr-gig-content">' +
        '<div class="fiverr-gig-seller">' +
          '<div class="fiverr-gig-avatar">' + esc(initials) + '</div>' +
          '<div class="fiverr-gig-seller-info">' +
            '<div class="fiverr-gig-seller-name">' + esc(ad.business) + '</div>' +
            '<div class="fiverr-gig-seller-badge">Verified Business</div>' +
          '</div>' +
        '</div>' +
        '<h3 class="fiverr-gig-title">' + esc(ad.category || '') + (ad.about ? ' - ' + esc(ad.about) : '') + '</h3>' +
        '<div class="fiverr-gig-meta">' +
          (ad.city ? '<span class="fiverr-gig-meta-item">📍 ' + esc(ad.city) + '</span>' : '') +
          (ad.timing ? '<span class="fiverr-gig-meta-item">🕒 ' + esc(ad.timing) + '</span>' : '') +
        '</div>' +
        (ad.address ? '<div class="fiverr-gig-address">📍 ' + esc(ad.address) + '</div>' : '') +
        (links.length ? '<div class="fiverr-gig-links">' + links.join(' • ') + '</div>' : '') +
        '<div class="fiverr-gig-footer">' +
          '<div class="fiverr-gig-price">' +
            '<span class="fiverr-gig-price-label">Starts from</span>' +
            '<span class="fiverr-gig-price-amount">PKR ' + esc(price) + '</span>' +
            '<span class="fiverr-gig-price-plan">' + esc(planLabel) + '</span>' +
          '</div>' +
          '<a class="fiverr-gig-contact" href="' + wa + '" target="_blank" rel="noopener noreferrer">Contact</a>' +
        '</div>' +
      '</div>' +
    '</article>';
  }).join('');
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderLiveAds);
} else {
  renderLiveAds();
}
setInterval(renderLiveAds, 60000);
