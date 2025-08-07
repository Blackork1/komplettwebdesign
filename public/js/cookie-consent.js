document.addEventListener('DOMContentLoaded', () => {
  const banner = document.getElementById('cookie-banner');

  // 1) Funktionen zum Erzeugen & Handhaben des Revoke-Buttons
  function createRevokeButton() {
    const wrapper = document.createElement('div');
    wrapper.id = 'cookie-revoke';
    Object.assign(wrapper.style, {
      position: 'fixed',
      bottom: '0',
      left: '0',
      zIndex: 1000,
    });

    const btn = document.createElement('button');
    btn.id = 'revoke-cookies';
    btn.textContent = 'Cookies';
    Object.assign(btn.style, {
      background: '#e94b1b65',
      color: '#fff',
      border: 'none',
      padding: '0.2rem 0.2rem',
      borderRadius: '0 0.25rem 0.25rem 0',
      cursor: 'pointer',
      fontSize: '8px',
    });

    wrapper.appendChild(btn);
    attachRevokeHandler(btn);
    return wrapper;
  }

  function attachRevokeHandler(btn) {
    btn.addEventListener('click', () => {
      btn.disabled = true;
      btn.textContent = 'Widerrufe…';

      fetch('/api/consent', { method: 'DELETE' })
        .then(r => r.json())
        .then(json => {
          if (json.success) {
            // Revoke-Button entfernen
            document.getElementById('cookie-revoke')?.remove();
            // Banner wieder einblenden, wenn vorhanden
            if (banner) {
              banner.style.display = 'block';
            }
          } else {
            console.error('Consent withdrawal failed', json);
            btn.disabled = false;
            btn.textContent = 'Cookies widerrufen';
          }
        })
        .catch(err => {
          console.error(err);
          btn.disabled = false;
          btn.textContent = 'Cookies widerrufen';
        });
    });
  }

  function showRevokeButton() {
    if (!document.getElementById('cookie-revoke')) {
      document.body.appendChild(createRevokeButton());
    }
  }

  // 2) Banner-Buttons: Alles akzeptieren / Nur Notwendiges
  if (banner) {
    const setConsent = (analytics, marketing) => {
      fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analytics, marketing })
      })
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          // Banner nur verstecken, nicht entfernen
          banner.style.display = 'none';
          if (analytics) loadGA();
          showRevokeButton();
        }
      });
    };

    document.getElementById('accept-all').onclick       = () => setConsent(true, true);
    document.getElementById('accept-necessary').onclick = () => setConsent(false, false);
  }

  // 3) Beim Laden prüfen, ob schon Consent vorliegt
  fetch('/api/consent')
    .then(r => r.json())
    .then(json => {
      const consent = json.cookieConsent;
      if (consent) {
        // sofort Revoke-Button anzeigen
        showRevokeButton();
        // GA laden, falls analytics=true
        if (consent.analytics) loadGA();
      }
    })
    .catch(()=>{/* ignore */});

  // 4) GA-Lader
  function loadGA() {
    const id = window.env.GA_MEASUREMENT_ID;
    const s = document.createElement('script');
    s.src   = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    s.async = true;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', id);
  }
});
