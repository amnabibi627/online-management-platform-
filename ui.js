/* ============================================================
   ui.js — small page-level interactions
   Scroll progress, back-to-top, CTA wiring, reveal on scroll.
   Runs after the DOM because the tag sits at the end of <body>.
   ============================================================ */
(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.add("js");

  /* ---------- Scroll progress bar + back-to-top ---------- */
  var bar = document.getElementById("scrollProgress");
  var toTop = document.getElementById("toTop");

  window.addEventListener(
    "scroll",
    function () {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      if (bar) bar.style.width = (pct < 0 ? 0 : pct > 100 ? 100 : pct) + "%";
      if (toTop) toTop.classList.toggle("show", window.scrollY > 600);
      checkReveals();
    },
    { passive: true }
  );

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
  var pending = [];
  var reduced =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function show(el) {
    if (!el || el.classList.contains("in")) return;
    el.classList.add("in");
    el.style.transitionDelay = "";
  }

  function checkReveals() {
    var limit = window.innerHeight - 40;
    for (var i = pending.length - 1; i >= 0; i--) {
      var el = pending[i];
      if (el.getBoundingClientRect().top < limit) {
        show(el);
        pending.splice(i, 1);
      }
    }
  }

  /* Only animate when the user is fine with motion and the API exists. */
  if (items.length && !reduced) {
    items.forEach(function (el, i) {
      el.classList.add("reveal");
      el.style.transitionDelay = (i % 6) * 55 + "ms";
    });
    pending = items.slice();

    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) show(entry.target);
          });
        },
        { rootMargin: "0px 0px -40px 0px", threshold: 0.05 }
      );
      items.forEach(function (el) {
        io.observe(el);
      });
    }

    checkReveals();
    window.addEventListener("resize", checkReveals, { passive: true });

    /* Last resort: never leave a section hidden if nothing above fired. */
    window.setTimeout(function () {
      pending.slice().forEach(show);
      pending = [];
    }, 9000);
  }
})();
