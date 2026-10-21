// ===== Anti-Copy / Anti-Inspect Protection =====
// Note: This is for deterring casual copying. It cannot stop screenshots,
// screen recording, or browser DevTools by a determined person.

(function() {
  "use strict";

  // Allow interaction with form elements
  function isFormElement(el) {
    if (!el) return false;
    const tag = el.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
    if (el.isContentEditable) return true;
    return false;
  }

  // Block right click
  document.addEventListener("contextmenu", function(e) {
    if (isFormElement(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    return false;
  }, true);

  // Block copy/cut/drag
  document.addEventListener("copy", function(e) {
    if (isFormElement(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    return false;
  }, true);

  document.addEventListener("cut", function(e) {
    if (isFormElement(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    return false;
  }, true);

  document.addEventListener("dragstart", function(e) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }, true);

  document.addEventListener("selectstart", function(e) {
    if (isFormElement(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    return false;
  }, true);

  // Block common dev/view-source shortcuts
  document.addEventListener("keydown", function(e) {
    // Allow in form fields
    if (isFormElement(e.target)) return;

    // Ctrl+S, Ctrl+A, Ctrl+U, Ctrl+P
    if (e.ctrlKey && (e.key === "s" || e.key === "a" || e.key === "u" || e.key === "p")) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+Shift+K
    if (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C" || e.key === "K" || e.key === "i" || e.key === "j" || e.key === "c" || e.key === "k")) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // F12
    if (e.key === "F12") {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Cmd+Opt+I on Mac
    if (e.metaKey && e.altKey && (e.key === "i" || e.key === "I" || e.key === "j" || e.key === "J" || e.key === "c" || e.key === "C")) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Cmd+S, Cmd+U, Cmd+A
    if (e.metaKey && (e.key === "s" || e.key === "u" || e.key === "a")) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, true);

  // Disable print
  window.addEventListener("beforeprint", function(e) {
    e.preventDefault();
    return false;
  });
})();
