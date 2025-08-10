// /public/js/cookie-consent.js
document.addEventListener('DOMContentLoaded', () => {
  const banner = document.getElementById('cookie-banner');

  // ---------- Helpers: Banner ----------
  const showBanner = () => { if (banner) banner.classList.remove('hidden'); };
  const hideBanner = () => { if (banner) banner.classList.add('hidden'); };

  // ---------- Helpers: Cookie löschen (eigene Domain) ----------
  function deleteCookie(name, path = '/') {
    const expires = 'Thu, 01 Jan 1970 00:00:00 GMT';
    const host = location.hostname;
    const bare = host.replace(/^www\./, '');

    // verschiedene Domain-Varianten, damit es wirklich weg ist
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
  const ANALYTICS_COOKIE_NAMES = [
    '_ga', '_gid', '_gat', '_gcl_au', '_ga_', '_gac_'
  ];

  // ---------- Consent Mode steuern ----------
  function ensureGtagShim() {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function(){ window.dataLayer.push(arguments); };
  }

  function setConsentGranted() {
    ensureGtagShim();
    window.gtag('consent', 'default', {
      'analytics_storage': 'granted',
      // Falls du keine Ads nutzt, alles weitere geblockt lassen:
      'ad_storage': 'denied',
      'ad_user_data': 'denied',
      'ad_personalization': 'denied'
    });
  }

  function setConsentDenied() {
    try {
      ensureGtagShim();
      window.gtag('consent', 'update', {
        'analytics_storage': 'denied',
        'ad_storage': 'denied',
        'ad_user_data': 'denied',
        'ad_personalization': 'denied'
      });

      // UA-Style Kill-Switch (unschädlich bei GA4, aber ok)
      const id = window.env?.GA_MEASUREMENT_ID || '';
      if (id) window['ga-disable-' + id] = true;
    } catch (_) {}
  }

  // ---------- GA Loader ----------
  function loadGA() {
    const id = window.env?.GA_MEASUREMENT_ID;
    if (!id) return;

    // Script nur einmal anhängen
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
    Object.assign(wrapper.style, { position:'fixed', bottom:'0', left:'0', zIndex:1000 });

    const btn = document.createElement('button');
    btn.id = 'revoke-cookies';
    btn.textContent = 'Cookies widerrufen';
    Object.assign(btn.style, {
      background:'#e94b1b65',
      color:'#fff',
      border:'none',
      padding:'.2rem .2rem',
      borderRadius:'0 0.25rem 0.25rem 0',
      cursor:'pointer',
      fontSize:'10px'
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
          setConsentDenied();

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
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body:JSON.stringify({ analytics, marketing })
      })
      .then(r => r.json())
      .then(json => {
        if (!json.success) return;

        // (2) Beim Erteilen des Consents: Consent Mode korrekt setzen
        if (analytics) {
          setConsentGranted();  // <-- HIER Consent Mode "granted"
          loadGA();             // und erst dann GA laden
        } else {
          setConsentDenied();   // alles andere bleibt "denied"
          // zur Sicherheit evtl. vorhandene _ga/_gid entfernen
          deleteCookiesByNameOrPrefix(ANALYTICS_COOKIE_NAMES);
        }

        hideBanner();
        showRevokeButton();
      })
      .catch(err => console.error(err));
    };

    const acceptAllBtn = document.getElementById('accept-all');
    const acceptNecBtn = document.getElementById('accept-necessary');

    if (acceptAllBtn) acceptAllBtn.onclick       = () => setConsent(true,  true);
    if (acceptNecBtn) acceptNecBtn.onclick       = () => setConsent(false, false);
  }

  // ---------- Initial-Load: aktuellen Consent prüfen ----------
  fetch('/api/consent')
    .then(r => r.json())
    .then(json => {
      const consent = json.cookieConsent;

      if (consent) {
        // Consent vorhanden -> Banner weg, Revoke sichtbar
        hideBanner();
        showRevokeButton();

        if (consent.analytics) {
          setConsentGranted();
          loadGA();
        } else {
          setConsentDenied();
          // Vorsichtshalber Cookies wegräumen, falls sie vorhanden sind
          deleteCookiesByNameOrPrefix(ANALYTICS_COOKIE_NAMES);
        }
      } else {
        // Kein Consent -> Banner zeigen und Consent Mode blocken
        setConsentDenied();
        showBanner();
      }
    })
    .catch(() => {
      // Im Zweifel: Banner zeigen und blocken
      setConsentDenied();
      showBanner();
    });
});
