(function () {
  function analyticsConsentGranted() {
    return window.cookieConsentState && window.cookieConsentState.analytics === true;
  }

  function randomNonce() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (character) {
      var random = Math.floor(Math.random() * 16);
      var value = character === "x" ? random : (random & 3) | 8;
      return value.toString(16);
    });
  }

  function internalTarget(link) {
    try {
      var target = new URL(link.getAttribute("href") || "", window.location.origin);
      if (target.origin !== window.location.origin) return "";
      return target.pathname + target.search;
    } catch (_error) {
      return "";
    }
  }

  function bindArticleCtas() {
    var root = document.querySelector("[data-content-post-id]");
    if (!root) return;
    var postId = Number(root.getAttribute("data-content-post-id"));
    var csrfToken = root.getAttribute("data-content-csrf-token") || "";
    if (!Number.isSafeInteger(postId) || postId <= 0 || !csrfToken) return;

    Array.from(root.querySelectorAll('[data-track="cta"] a')).forEach(function (link) {
      if (link.dataset.contentArticleTrackingBound === "true") return;
      link.dataset.contentArticleTrackingBound = "true";
      link.addEventListener("click", function () {
        if (!analyticsConsentGranted()) return;
        var target = internalTarget(link);
        var wrapper = link.closest('[data-track="cta"]');
        var location = wrapper ? wrapper.getAttribute("data-cta-location") || "" : "";
        if (!target || !location) return;
        fetch("/analytics/content-article-cta", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-csrf-token": csrfToken
          },
          credentials: "same-origin",
          keepalive: true,
          body: JSON.stringify({
            postId: postId,
            nonce: randomNonce(),
            ctaLocation: location,
            ctaTarget: target
          })
        }).catch(function () {});
      }, { passive: true });
    });
  }

  document.addEventListener("DOMContentLoaded", bindArticleCtas);
})();

