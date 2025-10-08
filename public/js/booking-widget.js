/* booking-widget.js — reCAPTCHA v3 mit Lazy-Load nur bei Interaktion */
(() => {
  const widget = document.querySelector('.kwd-booking-widget');
  if (!widget) return;

  const SITEKEY   = widget.dataset.sitekey;               // v3 Sitekey
  const container = widget.querySelector('.kwd-slot-container');
  const form      = widget.querySelector('.kwd-booking-form');

  // Back-Link
  const backLink = document.createElement('div');
  backLink.className = 'kwd-back';
  backLink.textContent = '← zurück zu allen Terminen';
  widget.insertBefore(backLink, container);

  // Hidden Inputs bequem greifen
  const inputSlotId = form.querySelector('input[name="slotId"]');
  // WICHTIG: im Markup sollte dieses Feld existieren:
  // <input type="hidden" name="g-recaptcha-response" />
  const inputToken  = form.querySelector('input[name="g-recaptcha-response"]');

  /* --------------------------------------------------------------
   * 0) reCAPTCHA v3 — Lazy Loader
   *    -> Lädt NUR bei Interaktion (mouseover/focusin/click)
   * -------------------------------------------------------------- */
  let recaptchaScriptLoaded = false;
  let grecaptchaReadyPromise = null;

  function loadRecaptchaScript() {
    if (recaptchaScriptLoaded) return grecaptchaReadyPromise;
    recaptchaScriptLoaded = true;

    grecaptchaReadyPromise = new Promise((resolve) => {
      const s = document.createElement('script');
      // v3: render=<sitekey> (kein explicit/render-Widget!)
      s.src   = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(SITEKEY)}`;
      s.async = true;
      s.defer = true;
      s.onload = () => {
        // falls grecaptcha noch nicht synchron verfügbar ist -> kurz pollen
        if (typeof grecaptcha !== 'undefined') {
          grecaptcha.ready(resolve);
        } else {
          const iv = setInterval(() => {
            if (typeof grecaptcha !== 'undefined') {
              clearInterval(iv);
              grecaptcha.ready(resolve);
            }
          }, 50);
        }
      };
      document.head.appendChild(s);
    });

    return grecaptchaReadyPromise;
  }

  // Erstes Anstupsen: lädt Script nur einmal, beim ersten Kontakt
  const lazyLoadHandler = () => loadRecaptchaScript();
  widget.addEventListener('mouseover', lazyLoadHandler, { once: true });
  widget.addEventListener('focusin',  lazyLoadHandler, { once: true });
  widget.addEventListener('click',    lazyLoadHandler, { once: true });

  /* --------------------------------------------------------------
   * 1) Slots per Ajax holen
   * -------------------------------------------------------------- */
  (async function loadSlots() {
    try {
      const res = await fetch('/api/slots?limit=3', { credentials: 'same-origin' });
      const slots = await res.json();

      if (!Array.isArray(slots) || slots.length === 0) {
        container.innerHTML =
          '<p>Leider stehen momentan keine freien Termine zur Verfügung. Diese werden täglich neu freigegeben.</p>';
        return;
      }

      slots.forEach(s => {
        const card = document.createElement('div');
        card.className = 'kwd-slot-card';
        card.dataset.id = s.id;
        const dt = new Date(s.start_time);
        card.innerHTML = `<strong>${dt.toLocaleString('de-DE', {
          weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
        })}</strong>`;
        container.appendChild(card);
      });
    } catch (err) {
      console.error('Slots laden fehlgeschlagen:', err);
      container.innerHTML = '<p>Beim Laden der Termine ist etwas schiefgelaufen. Bitte später erneut versuchen.</p>';
    }
  })();

  /* --------------------------------------------------------------
   * 2) Auswahl + Animation
   * -------------------------------------------------------------- */
  container.addEventListener('click', e => {
    const card = e.target.closest('.kwd-slot-card');
    if (!card || card.classList.contains('selected')) return;

    [...container.children].forEach(c => {
      c.classList.toggle('selected', c === card);
      c.classList.toggle('faded',   c !== card);
    });

    backLink.classList.add('visible');
    inputSlotId.value = card.dataset.id;
    form.hidden = false;
  });

  backLink.addEventListener('click', () => {
    [...container.children].forEach(c => c.classList.remove('selected', 'faded'));
    backLink.classList.remove('visible');
    form.hidden = true;
    form.reset();
    inputSlotId.value = '';
    if (inputToken) inputToken.value = '';
  });

  /* --------------------------------------------------------------
   * 3) Submit mit reCAPTCHA v3 Token
   *    -> Script wird hier NOTFALLS noch nachgeladen,
   *       falls der Nutzer direkt submit klickt.
   * -------------------------------------------------------------- */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    try {
      // Stelle sicher, dass das Script geladen & grecaptcha ready ist
      await loadRecaptchaScript();

      // Token holen (custom action hilft beim Server-Matching)
      const token = await grecaptcha.execute(SITEKEY, { action: 'booking_submit' });

      if (inputToken) inputToken.value = token;

      // Normales Submit
      form.submit();
    } catch (err) {
      console.error('reCAPTCHA Fehler:', err);
      const msg = form.querySelector('.form-msg');
      if (msg) {
        msg.textContent = 'reCAPTCHA-Validierung fehlgeschlagen. Bitte neu versuchen.';
        msg.classList.add('is-error');
      }
    }
  });
})();
