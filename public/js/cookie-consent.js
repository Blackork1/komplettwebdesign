// /public/js/cookie-consent.js  — Option B: GA immer geladen, aber vor Consent blockiert
document.addEventListener('DOMContentLoaded', () => {
  const banner = document.getElementById('cookie-banner');
  const ANALYTICS_COOKIE_NAMES = ['_ga', '_gid', '_gat', '_gcl_au', '_ga_', '_gac_'];
  let firstPageviewSent = false;

  // ---------- Banner show/hide (robust) ----------
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

  // ---------- Cookie-Utilities ----------
  function deleteCookie(name, path = '/') {
    const expires = 'Thu, 01 Jan 1970 00:00:00 GMT';
    const host = location.hostname;          // z. B. www.komplettwebdesign.de
    const bare = host.replace(/^www\./, ''); // komplettwebdesign.de
    [
      `${name}=; expires=${expires}; path=${path}`,
      `${name}=; expires=${expires}; path=${path}; domain=${host}`,
      `${name}=; expires=${expires}; path=${path}; domain=.${bare}`
    ].forEach(s => { document.cookie = s; });
  }
  function deleteCookiesByNameOrPrefix(list) {
    const all = document.cookie.split(';').map(c => c.split('=')[0].trim());
    list.forEach(item => {
      all.forEach(name => {
        if (name === item || name.startsWith(item)) deleteCookie(name);
      });
    });
  }

  // ---------- Consent Mode Helpers ----------
  function ensureGtagShim() {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  }

  // Setzt CMv2-Flags je nach Auswahl (immer 'update', niemals 'default granted')
  function applyConsent(prefs) {
    // prefs: { analytics: boolean, marketing: boolean }
    ensureGtagShim();
    window.gtag('consent', 'update', {
      analytics_storage: prefs.analytics ? 'granted' : 'denied',
      ad_storage: prefs.marketing ? 'granted' : 'denied',
      ad_user_data: prefs.marketing ? 'granted' : 'denied',
      ad_personalization: prefs.marketing ? 'granted' : 'denied'
    });
    window.dataLayer.push({ event: 'consent_updated' });
  }

  // Blockt alles (Erstbesuch / Widerruf)
  function blockAll() {
    ensureGtagShim();
    window.gtag('consent', 'update', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    const id = window.env?.GA_MEASUREMENT_ID || '';
    if (id) window['ga-disable-' + id] = true; // optionaler Kill-Switch
    firstPageviewSent = false;
  }

  // Nach erteilter Einwilligung: ersten PV senden & Signals je nach Marketing
  function sendInitialPageviewIfNeeded(analytics, marketing) {
    const id = window.env?.GA_MEASUREMENT_ID;
    if (!id) return;

    // Google Signals je nach Marketing erlauben/unterbinden
    window.gtag('config', id, { allow_google_signals: !!marketing });

    if (analytics && !firstPageviewSent) {
      // GA ist bereits im <head> geladen (send_page_view:false) → manueller PV
      window.gtag('event', 'page_view');
      firstPageviewSent = true;
    } else if (!analytics) {
      deleteCookiesByNameOrPrefix(ANALYTICS_COOKIE_NAMES);
    }
  }

  // ---------- Revoke-Button ----------
  function createRevokeButton() {
    const wrap = document.createElement('div');
    wrap.id = 'cookie-revoke';
    Object.assign(wrap.style, { position: 'fixed', bottom: '0', left: '0', zIndex: 1000 });

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

    wrap.appendChild(btn);
    attachRevokeHandler(btn);
    return wrap;
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

      fetch('/api/consent', { method: 'DELETE', cache: 'no-store' })
        .then(r => r.json())
        .then(json => {
          if (!json.success) throw new Error('Consent withdrawal failed');
          blockAll();                                     // sofort blocken
          deleteCookiesByNameOrPrefix(ANALYTICS_COOKIE_NAMES); // GA-Cookies löschen
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

  // ---------- Banner-Buttons ----------
  if (banner) {
    const setConsent = (analytics, marketing) => {
      fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ analytics, marketing })
      })
        .then(r => r.json())
        .then(json => {
          if (!json.success) return;
          applyConsent({ analytics, marketing });          // CMv2 umstellen
          sendInitialPageviewIfNeeded(analytics, marketing); // ggf. ersten PV senden
          hideBanner();
          showRevokeButton();
        })
        .catch(err => console.error(err));
    };

    const acceptAllBtn = document.getElementById('accept-all');
    const acceptNecBtn = document.getElementById('accept-necessary');

    if (acceptAllBtn) acceptAllBtn.onclick = () => {
      setConsent(true, true);
      if (window.env?.CLARITY_ID) window.loadClarityOnce(window.env.CLARITY_ID);
    };
    if (acceptNecBtn) acceptNecBtn.onclick = () => {
      setConsent(false, false); // kein Clarity-Laden
    };

    // if (acceptAllBtn) acceptAllBtn.onclick = () => setConsent(true, true);
    // if (acceptNecBtn) acceptNecBtn.onclick = () => setConsent(false, false);
  }

  // ---------- Initial-Load: aktuellen Consent aus der Session ----------
  fetch('/api/consent', { cache: 'no-store' })
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(({ cookieConsent }) => {
      const consent = cookieConsent;

      if (consent) {
        hideBanner();
        showRevokeButton();
        applyConsent({
          analytics: !!consent.analytics,
          marketing: !!consent.marketing
        });
        sendInitialPageviewIfNeeded(!!consent.analytics, !!consent.marketing);
        if (consent.analytics && window.env?.CLARITY_ID) {
          window.loadClarityOnce(window.env.CLARITY_ID);
        }
      } else {
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
