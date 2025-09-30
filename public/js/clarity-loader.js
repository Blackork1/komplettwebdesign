// /public/js/clarity-loader.js
(function () {
  function injectClarity(id) {
    if (!id || window.clarity) return;
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, "clarity", "script", id);

    // Sobald Clarity geladen ist, Consent explizit setzen
    var tryConsent = function () {
      if (typeof window.clarity === "function") {
        try { window.clarity("consent", true); } catch (e) {}
      } else {
        setTimeout(tryConsent, 200);
      }
    };
    tryConsent();
  }

  // öffentlich: lädt Clarity genau einmal
  window.loadClarityOnce = function (id) {
    if (window.__clarityLoaded) return;
    window.__clarityLoaded = true;
    injectClarity(id);
  };
})();
