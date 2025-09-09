// /public/js/cookie-consent.js
document.addEventListener('DOMContentLoaded', () => {
  const banner = document.getElementById('cookie-banner');

  // ---------- Helpers: Banner (robust: Klasse + display) ----------
  const showBanner = () => {
    if (!banner) return;
    banner.classList.remove('hidden');
    banner.style.display = 'block';
  };
  const hideBanner = () => {
    if (!banner) return;
    banner.classList.add('hidden');
    banner.style.display = 'none';
  };

  // ---------- Helpers: Cookies löschen (eigene Domain) ----------
  function deleteCookie(name, path = '/') {
    const expires = 'Thu, 01 Jan 1970 00:00:00 GMT';
    const host = location.hostname;           // z. B. www.komplettwebdesign.de
    const bare = host.replace(/^www\./, '');  // komplettwebdesign.de

    [
      `${name}=; expires=${expires}; path=${path}`,
      `${name}=; expires=${expires}; path=${path}; domain=${host}`,
      `${name}=; expires=${expires}; path=${path}; domain=.${bare}`
    ].forEach(str => { document.cookie = str; });
  }

  function deleteCookiesByNameOrPrefix(list) {
    const all = document.cookie.split(';').map(c => c.split('=')[0].trim());
    list.forEach(item => {
      all.forEach(name => {
        if (name === item || name.startsWith(item)) {
          deleteCookie(name);
        }
      });
    });
  }

  // Kandidaten (erweitern, falls du noch Tools nutzt)
  const ANALYTICS_COOKIE_NAMES = ['_ga', '_gid', '_gat', '_gcl_au', '_ga_', '_gac_'];

  // ---------- Consent Mode steuern ----------
  function ensureGtagShim() {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function(){ window.dataLayer.push(arguments); };
  }

  // Setzt die vier CMv2-Flags je nach Auswahl (immer 'update', niemals 'default granted')
  function applyConsent(prefs) {
    // prefs: { analytics: boolean, marketing: boolean }
    ensureGtagShim();
    window.gtag('consent', 'update', {
      analytics_storage:  prefs.analytics ? 'granted' : 'denied',
      ad_storage:         prefs.marketing ? 'granted' : 'denied',
      ad_user_data:       prefs.marketing ? 'granted' : 'denied',
      ad_personalization: prefs.marketing ? 'granted' : 'denied'
    });
    window.dataLayer.push({ event: 'consent_updated' });
  }

  // Blockt alles (z. B. Erstbesuch oder nach Widerruf)
  function blockAll() {
    ensureGtagShim();
    window.gtag('consent', 'update', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    // Optional: GA Kill-Switch
    const id = window.env?.GA_MEASUREMENT_ID || '';
    if (id) window['ga-disable-' + id] = true;
  }

  // ---------- GA Loader (nur laden, wenn analytics erlaubt) ----------
  function loadGA() {
    const id = window.env?.GA_MEASUREMENT_ID;
    if (!id) return;

    if (!document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${id}"]`)) {
      const s = document.createElement('script');
      s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
      s.async = true;
      document.head.appendChild(s);
    }

    ensureGtagShim();
    window.gtag('js', new Date());
    window.gtag('config', id);
  }

  // ---------- Revoke-Button ----------
  function createRevokeButton() {
    const wrapper = document.createElement('div');
    wrapper.id = 'cookie-revoke';
    Object.assign(wrapper.style, { position: 'fixed', bottom: '0', left: '0', zIndex: 1000 });

    const btn = document.createElement('button');
    btn.id = 'revoke-cookies';
    btn.textContent = 'Cookies widerrufen';
    Object.assign(btn.style, {
      background: '#e94b1b65',
      color: '#fff',
      border: 'none',
      padding: '.2rem .2rem',
      borderRadius: '0 0.25rem 0.25rem 0',
      cursor: 'pointer',
      fontSize: '10px'
    });

    wrapper.appendChild(btn);
    attachRevokeHandler(btn);
    return wrapper;
  }

  function showRevokeButton() {
    if (!document.getElementById('cookie-revoke')) {
      document.body.appendChild(createRevokeButton());
    }
  }

  function attachRevokeHandler(btn) {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      btn.disabled = true;
      btn.textContent = 'Widerrufe…';

      fetch('/api/consent', { method: 'DELETE' })
        .then(r => r.json())
        .then(json => {
          if (!json.success) throw new Error('Consent withdrawal failed');

          // 1) Tracking sofort stoppen
          blockAll();

          // 2) Analytics-Cookies aktiv löschen (eigene Domain)
          deleteCookiesByNameOrPrefix(ANALYTICS_COOKIE_NAMES);

          // 3) UI aktualisieren
          document.getElementById('cookie-revoke')?.remove();
          showBanner();
        })
        .catch(err => {
          console.error(err);
          btn.disabled = false;
          btn.textContent = 'Cookies widerrufen';
        });
    });
  }

  // ---------- Banner-Buttons (Accept All / Necessary) ----------
  if (banner) {
    const setConsent = (analytics, marketing) => {
      fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analytics, marketing })
      })
        .then(r => r.json())
        .then(json => {
          if (!json.success) return;

          // Consent Mode korrekt setzen
          applyConsent({ analytics, marketing });

          // GA nur laden, wenn Analytics erlaubt
          if (analytics) {
            loadGA();
          } else {
            deleteCookiesByNameOrPrefix(ANALYTICS_COOKIE_NAMES);
          }

          hideBanner();
          showRevokeButton();
        })
        .catch(err => console.error(err));
    };

    const acceptAllBtn = document.getElementById('accept-all');
    const acceptNecBtn = document.getElementById('accept-necessary');

    if (acceptAllBtn) acceptAllBtn.onclick = () => setConsent(true,  true);
    if (acceptNecBtn) acceptNecBtn.onclick = () => setConsent(false, false);
  }

  // ---------- Initial-Load: aktuellen Consent aus der Session holen ----------
  fetch('/api/consent', { cache: 'no-store' })
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(({ cookieConsent }) => {
      // console.log('[Consent] GET /api/consent →', cookieConsent); // DEBUG optional
      const consent = cookieConsent;

      if (consent) {
        // Consent vorhanden -> Banner aus, Revoke an
        hideBanner();
        showRevokeButton();

        // Consent Mode v2 gemäß Auswahl
        applyConsent({
          analytics: !!consent.analytics,
          marketing: !!consent.marketing
        });

        // GA nur laden, wenn Analytics erlaubt
        if (consent.analytics) {
          loadGA();
        } else {
          deleteCookiesByNameOrPrefix(ANALYTICS_COOKIE_NAMES);
        }
      } else {
        // Kein Consent -> blocken und Banner zeigen
        blockAll();
        showBanner();
      }
    })
    .catch(err => {
      console.warn('[Consent] GET /api/consent failed:', err);
      blockAll();
      showBanner();
    });
});
