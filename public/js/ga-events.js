(function () {
  function analyticsTrackingAllowed() {
    var consentState = window.cookieConsentState || {};
    var measurementId = window.env && window.env.GA_MEASUREMENT_ID;
    return consentState.analytics === true
      && typeof window.gtag === 'function'
      && !(measurementId && window['ga-disable-' + measurementId]);
  }

  // Warte bis DOM da ist
  document.addEventListener('DOMContentLoaded', function () {
    // Alle Elemente, die wir tracken wollen
    var ctas = document.querySelectorAll('[data-track="cta"]');
    if (!ctas.length) return;

    ctas.forEach(function (el) {
      if (el.dataset.ctaTrackingBound === 'true') return;
      el.dataset.ctaTrackingBound = 'true';

      el.addEventListener('click', function (e) {
        try {
          var name = el.getAttribute('data-cta-name') || 'cta_unbenannt';
          var location = el.getAttribute('data-cta-location') || '';
          var url  = el.getAttribute('href') || window.location.href;

          if (!analyticsTrackingAllowed()) return;

          var payload = {
            event_category: 'engagement',
            cta_name: name,
            cta_location: location,
            link_url: url,
            page_path: window.location.pathname,
            transport_type: 'beacon', // robust bei Page-Wechsel
          };

          var target = (el.getAttribute('target') || '').toLowerCase();
          var modifiedClick = e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;
          var shouldDelayNavigation = el.tagName === 'A' && url && target !== '_blank' && !modifiedClick;

          if (shouldDelayNavigation) {
            e.preventDefault();
            var navigated = false;
            var go = function(){ if(!navigated){ navigated = true; window.location.href = url; } };

            payload.event_callback = go;
            gtag('event', 'cta_clicked', payload);

            // Fallback, falls event_callback nicht feuert
            setTimeout(go, 600);
          } else {
            gtag('event', 'cta_clicked', payload);
          }
        } catch (err) {
          // Im Fehlerfall normal weiter navigieren
        }
      }, { passive: false });
    });
  });
})();
