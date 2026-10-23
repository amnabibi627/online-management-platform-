/* ============================================================
   ui.js — small page-level interactions
   Scroll progress, back-to-top, CTA wiring, reveal on scroll.
   Runs after the DOM because the tag sits at the end of <body>.
   ============================================================ */
(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.add("js");

  /* ---------- Scroll progress bar ---------- */
  var bar = document.getElementById("scrollProgress");
  var toTop = document.getElementById("toTop");

  function onScroll() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    var pct = max > 0 ? (window.scrollY / max) * 100 : 0;
    if (bar) bar.style.width = (pct < 0 ? 0 : pct > 100 ? 100 : pct) + "%";
    if (toTop) toTop.classList.toggle("show", window.scrollY > 600);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  onScroll();

  /* ---------- Back to top ---------- */
  if (toTop) {
    toTop.addEventListener("click", function () {
      try {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (e) {
        window.scrollTo(0, 0);
      }
    });
  }

  /* ---------- CTA band button opens the registration modal ---------- */
  var ctaBtn = document.getElementById("ctaRegisterBtn");
  if (ctaBtn) {
    ctaBtn.addEventListener("click", function () {
      var opener = document.getElementById("openRegForm");
      if (opener) opener.click();
    });
  }

  /* ---------- Reveal on scroll ---------- */
  var SELECTOR = [
    ".section-head",
    ".trust-inner",
    ".industry-card",
    ".step",
    ".faq-item",
    ".ads-combo-reg",
    ".ads-combo-live",
    ".owner-profile",
    ".reviews-summary",
    ".review-form",
    ".cta-inner"
  ].join(",");

  var items = Array.prototype.slice.call(document.querySelectorAll(SELECTOR));
  if (!items.length) return;

  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduced || !("IntersectionObserver" in window)) {
    return;
  }

  items.forEach(function (el, i) {
    el.classList.add("reveal");
    el.style.transitionDelay = (i % 6) * 55 + "ms";
  });

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        entry.target.style.transitionDelay = "";
        io.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -50px 0px", threshold: 0.06 }
  );

  items.forEach(function (el) {
    io.observe(el);
  });

  /* Anything already on screen should never wait for a scroll event. */
  window.requestAnimationFrame(function () {
    items.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) {
        el.classList.add("in");
        el.style.transitionDelay = "";
        io.unobserve(el);
      }
    });
  });

  /* Safety net: never leave content hidden if the observer is unavailable
     or the page is inside a viewer that does not fire intersections. */
  window.setTimeout(function () {
    items.forEach(function (el) {
      if (!el.classList.contains("in")) {
        el.classList.add("in");
        el.style.transitionDelay = "";
      }
    });
  }, 6000);
})();
