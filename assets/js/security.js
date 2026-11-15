/**
 * ============================================================
 * Online Management Site: Core Security & Anti-Theft Shield
 * Protects frontend content, guards against unauthorized inspection,
 * prevents framing (clickjacking), and sanitizes user input against XSS.
 * ============================================================
 */
(function () {
  "use strict";

  // 1. Anti-Clickjacking (Framebusting)
  // Ensures this site cannot be embedded in unauthorized iframes
  try {
    if (window.top !== window.self) {
      window.top.location = window.self.location;
    }
  } catch (e) {
    if (window.top) {
      window.top.location = window.location.href;
    }
  }

  // 2. Notification Helper
  var toastTimer = null;
  function showSecurityNotice(msg) {
    var toast = document.getElementById("toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "toast";
      toast.className = "toast";
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add("error", "show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove("show");
    }, 2500);
  }

  // 3. Disable Context Menu (Right-Click Protection)
  document.addEventListener("contextmenu", function (e) {
    var target = e.target;
    var tag = target && target.tagName ? target.tagName.toUpperCase() : "";
    var hasSelectedText = false;
    try {
      hasSelectedText = !!(window.getSelection && window.getSelection().toString().trim().length > 0);
    } catch (err) {}
    var isEditable =
      tag === "INPUT" ||
      tag === "TEXTAREA" ||
      (target && target.isContentEditable) ||
      (target && target.closest && target.closest(".allow-select")) ||
      hasSelectedText;

    if (!isEditable) {
      e.preventDefault();
      showSecurityNotice("Content is protected. Right-click is disabled.");
      return false;
    }
  }, false);

  // 4. Block Developer Tools & Source Inspection Shortcuts
  document.addEventListener("keydown", function (e) {
    var key = e.key || "";
    var code = e.keyCode || e.which;
    var ctrlOrMeta = e.ctrlKey || e.metaKey;
    var shift = e.shiftKey;

    // F12 key (DevTools)
    if (key === "F12" || code === 123) {
      e.preventDefault();
      e.stopPropagation();
      showSecurityNotice("Developer tools are disabled.");
      return false;
    }

    // Ctrl+Shift+I / Cmd+Option+I (Inspect)
    // Ctrl+Shift+J / Cmd+Option+J (Console)
    // Ctrl+Shift+C / Cmd+Option+C (Inspect Elements)
    if (ctrlOrMeta && shift && (key === "I" || key === "i" || key === "J" || key === "j" || key === "C" || key === "c" || code === 73 || code === 74 || code === 67)) {
      e.preventDefault();
      e.stopPropagation();
      showSecurityNotice("Source inspection is disabled.");
      return false;
    }

    // Ctrl+U / Cmd+Option+U (View Source)
    if (ctrlOrMeta && (key === "U" || key === "u" || code === 85)) {
      e.preventDefault();
      e.stopPropagation();
      showSecurityNotice("Viewing page source is disabled.");
      return false;
    }

    // Ctrl+S / Cmd+S (Save Page)
    if (ctrlOrMeta && (key === "S" || key === "s" || code === 83)) {
      e.preventDefault();
      e.stopPropagation();
      showSecurityNotice("Saving webpage is disabled.");
      return false;
    }

    // Ctrl+P / Cmd+P (Print Page)
    if (ctrlOrMeta && (key === "P" || key === "p" || code === 80)) {
      e.preventDefault();
      e.stopPropagation();
      showSecurityNotice("Printing is disabled.");
      return false;
    }
  }, false);

  // 5. Block Dragging of Images and Assets
  document.addEventListener("dragstart", function (e) {
    var target = e.target;
    var tag = target && target.tagName ? target.tagName.toUpperCase() : "";
    if (tag === "IMG" || tag === "PICTURE" || tag === "SVG" || tag === "A") {
      e.preventDefault();
      return false;
    }
  }, false);

  // 6. Console Security Banner (Self-XSS Defense)
  try {
    var bannerStyle1 = "color: #dc2626; font-size: 38px; font-weight: 900; -webkit-text-stroke: 1px #000;";
    var bannerStyle2 = "color: #ff8f04; font-size: 15px; font-weight: bold; padding: 4px 0;";
    var bannerStyle3 = "color: #475569; font-size: 12px; line-height: 1.5;";
    console.log("%cSTOP!", bannerStyle1);
    console.log("%cWARNING: This browser feature is for developers only.", bannerStyle2);
    console.log("%cDo not paste, run, or execute any scripts here. Tampering with this website or attempting unauthorized access is strictly prohibited and monitored.", bannerStyle3);
  } catch (err) {}

  // 7. Global Anti-XSS Sanitizer Utility
  window.OMS_SECURITY = {
    sanitize: function (val) {
      if (typeof val !== "string") return val;
      return val
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;")
        .replace(/\//g, "&#x2F;");
    },
    stripDangerousTags: function (str) {
      if (typeof str !== "string") return str;
      return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
                .replace(/javascript:/gi, "")
                .replace(/on\w+\s*=/gi, "");
    }
  };
})();
