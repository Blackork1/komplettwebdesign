(function () {
  // Warte bis DOM da ist
  document.addEventListener('DOMContentLoaded', function () {
    // Alle Elemente, die wir tracken wollen
    var ctas = document.querySelectorAll('[data-track="cta"]');
    if (!ctas.length) return;

    ctas.forEach(function (el) {
      el.addEventListener('click', function (e) {
        try {
          var name = el.getAttribute('data-cta-name') || 'cta_unbenannt';
          var url  = el.getAttribute('href') || window.location.href;

          // GA4-Event senden (ohne Tag Manager)
          var payload = {
            event_category: 'engagement',
            cta_name: name,
            link_url: url,
            transport_type: 'beacon', // robust bei Page-Wechsel
          };

          // Wenn Consent noch verweigert: NICHT blockieren – Seite soll trotzdem öffnen
          if (typeof gtag === 'function') {
            // Für maximale Zuverlässigkeit beim Seitenwechsel: kurz warten, dann navigieren
            e.preventDefault();
            var navigated = false;
            var go = function(){ if(!navigated){ navigated = true; window.location.href = url; } };

            payload.event_callback = go;
            gtag('event', name, payload);

            // Fallback, falls event_callback nicht feuert
            setTimeout(go, 600);
          }
        } catch (err) {
          // Im Fehlerfall normal weiter navigieren
        }
      }, { passive: false });
    });
  });
})();
