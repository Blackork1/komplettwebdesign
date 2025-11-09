/* ============================================================
   public/js/kontakt.js   –   Mehrstufiges Kontakt-Formular
   – nutzt globales window.SITEKEY (aus Inline-Script)
   ============================================================ */

const SITEKEY = window.SITEKEY;

/* ---------- reCAPTCHA Lazy Loader ---------- */
let recaptchaPromise = null;

function waitForGrecaptchaReady() {
  return new Promise((resolve) => {
    if (window.grecaptcha && typeof window.grecaptcha.ready === 'function') {
      window.grecaptcha.ready(resolve);
      return;
    }
    const iv = window.setInterval(() => {
      if (window.grecaptcha && typeof window.grecaptcha.ready === 'function') {
        window.clearInterval(iv);
        window.grecaptcha.ready(resolve);
      }
    }, 50);
  });
}

function loadRecaptchaScript() {
  if (!SITEKEY) {
    return Promise.reject(new Error('Es wurde kein reCAPTCHA Sitekey konfiguriert.'));
  }

  if (window.grecaptcha && typeof window.grecaptcha.execute === 'function') {
    return waitForGrecaptchaReady();
  }

  if (recaptchaPromise) return recaptchaPromise;

  recaptchaPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src^="https://www.google.com/recaptcha/api.js"]');

    function handleReady() {
      waitForGrecaptchaReady().then(resolve).catch(reject);
    }

    if (existing) {
      if (existing.hasAttribute('data-recaptcha-loaded')) {
        handleReady();
        return;
      }

      existing.addEventListener('load', () => {
        existing.setAttribute('data-recaptcha-loaded', 'true');
        handleReady();
      }, { once: true });
      existing.addEventListener('error', () => {
        existing.remove();
        reject(new Error('reCAPTCHA konnte nicht geladen werden.'));
      }, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js?render=' + encodeURIComponent(SITEKEY);
    script.async = true;
    script.defer = true;
    script.onload = () => {
      script.setAttribute('data-recaptcha-loaded', 'true');
      handleReady();
    };
    script.onerror = () => {
      script.remove();
      reject(new Error('reCAPTCHA konnte nicht geladen werden.'));
    };
    document.head.appendChild(script);
  });

  return recaptchaPromise.finally(() => {
    recaptchaPromise = null;
  });
}

function bindRecaptchaPrefetch(form) {
  if (!form) return;
  const triggerOnce = () => {
    form.removeEventListener('focusin', triggerOnce, true);
    form.removeEventListener('pointerdown', triggerOnce, true);
    form.removeEventListener('click', triggerOnce, true);
    loadRecaptchaScript().catch((err) => console.warn(err));
  };

  form.addEventListener('focusin', triggerOnce, true);
  form.addEventListener('pointerdown', triggerOnce, true);
  form.addEventListener('click', triggerOnce, true);

  if (document.activeElement && form.contains(document.activeElement)) {
    triggerOnce();
  }
}


/* ---------- Carousel ---------- */
const carouselEl = document.querySelector('#contactCarousel');
const carousel = new bootstrap.Carousel(carouselEl, { interval: false, wrap: false });

const next = () => carousel.next();
const prev = () => carousel.prev();

/* ---------- Auto-Weiter ---------- */
['paket', 'umfang', 'texterstellung', 'bilderstellung', 'slotId'].forEach(name =>
  document.querySelectorAll(`input[name="${name}"]`).forEach(inp =>
    inp.addEventListener('change', e => {
      if (name === 'bilderstellung') {
        const fld = document.getElementById('uploadImagesField');
        if (e.target.value === 'eigen') fld.style.display = 'block';
        else { fld.style.display = 'none'; document.getElementById('imagesInput').value = ''; }
      }
      next();
    })
  )
);

/* ---------- Weiter-Buttons ---------- */
document.querySelectorAll('.next-btn').forEach(btn =>
  btn.addEventListener('click', () => {
    const slide = carouselEl.querySelector('.carousel-item.active');
    const invalid = [...slide.querySelectorAll('[required]')].some(f => {
      if (/^(radio|checkbox)$/.test(f.type)) {
        return ![...slide.querySelectorAll(`[name="${f.name}"]`)].some(i => i.checked);
      }
      return !f.value;
    });
    if (invalid) alert('Bitte alle Pflichtfelder ausfüllen.');
    else next();
  })
);

/* ---------- Zurück ---------- */
document.querySelectorAll('.back-btn').forEach(b => b.addEventListener('click', prev));

/* ---------- Zusammenfassung ---------- */
const row = (l, v) => `<tr><th style="white-space:nowrap">${l}</th><td>${v || '—'}</td></tr>`;
const labelText = n => {
  const i = document.querySelector(`input[name="${n}"]:checked`);
  return i ? i.nextElementSibling.textContent.trim() : '—';
};

function updateSummary() {
  const box = document.getElementById('summaryBox');
  const features = [...document.querySelectorAll('input[name="inhalte"]:checked')]
    .map(c => c.nextElementSibling.textContent.trim())
    .join(', ') || 'Keine';
  box.innerHTML = `
    <table class="table table-sm"><tbody>
      ${row('Paket', labelText('paket'))}
      ${row('Seitenumfang', labelText('umfang'))}
      ${row('Texte', labelText('texterstellung'))}
      ${row('Bilder', labelText('bilderstellung'))}
      ${row('Funktionen', features)}
      ${row('Termin', labelText('slotId'))}
      ${row('Name', document.getElementById('nameInput').value)}
      ${row('E-Mail', document.getElementById('emailInput').value)}
      ${row('Telefon', document.getElementById('telefonInput').value)}
      ${row('Firma', document.getElementById('firmaInput').value)}
      ${row('Sonstige Infos', document.querySelector('textarea[name="sonstigeInfos"]').value)}
    </tbody></table>`;
}
carouselEl.addEventListener('slide.bs.carousel', e => { if (e.to === 8) updateSummary(); });
//       ${row('Weitere Wünsche',document.getElementById('weitereWuensche').value)}
/* ---------- Submit: ReCAPTCHA v3 ---------- */
const kontaktForm = document.getElementById('kontaktForm');
if (kontaktForm) {
  bindRecaptchaPrefetch(kontaktForm);

  kontaktForm.addEventListener('submit', async e => {
    e.preventDefault();

    try {
      await loadRecaptchaScript();
      const token = await grecaptcha.execute(SITEKEY, { action: 'submit' });
      e.target.token.value = token;
      e.target.submit();
    } catch (err) {
      console.error('reCAPTCHA Fehler:', err);
      alert('reCAPTCHA konnte nicht geladen werden. Bitte versuche es erneut.');
    }
  });
}