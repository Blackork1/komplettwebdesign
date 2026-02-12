/* ============================================================
   public/js/kontakt.js - Mehrstufiges Kontakt-Formular
   ============================================================ */

const SITEKEY = window.SITEKEY;
const CONTACT_I18N = window.CONTACT_I18N || {};
const I18N = {
  invalidRequired: CONTACT_I18N.invalidRequired || "Bitte alle Pflichtfelder ausfuellen.",
  recaptchaMissingKey: CONTACT_I18N.recaptchaMissingKey || "Es wurde kein reCAPTCHA Sitekey konfiguriert.",
  recaptchaLoadError: CONTACT_I18N.recaptchaLoadError || "reCAPTCHA konnte nicht geladen werden. Bitte versuche es erneut.",
  summaryNone: CONTACT_I18N.summaryNone || "Keine",
  summaryNotSet: CONTACT_I18N.summaryNotSet || "Nicht angegeben",
  labels: CONTACT_I18N.labels || {
    paket: "Paket",
    umfang: "Seitenumfang",
    texte: "Texte",
    bilder: "Bilder",
    funktionen: "Funktionen",
    termin: "Termin",
    name: "Name",
    email: "E-Mail",
    telefon: "Telefon",
    firma: "Firma",
    infos: "Sonstige Infos"
  }
};

let recaptchaPromise = null;

function waitForGrecaptchaReady() {
  return new Promise((resolve) => {
    if (window.grecaptcha && typeof window.grecaptcha.ready === "function") {
      window.grecaptcha.ready(resolve);
      return;
    }
    const iv = window.setInterval(() => {
      if (window.grecaptcha && typeof window.grecaptcha.ready === "function") {
        window.clearInterval(iv);
        window.grecaptcha.ready(resolve);
      }
    }, 50);
  });
}

function loadRecaptchaScript() {
  if (!SITEKEY) return Promise.reject(new Error(I18N.recaptchaMissingKey));

  if (window.grecaptcha && typeof window.grecaptcha.execute === "function") {
    return waitForGrecaptchaReady();
  }

  if (recaptchaPromise) return recaptchaPromise;

  recaptchaPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src^="https://www.google.com/recaptcha/api.js"]');

    function handleReady() {
      waitForGrecaptchaReady().then(resolve).catch(reject);
    }

    if (existing) {
      if (existing.hasAttribute("data-recaptcha-loaded")) {
        handleReady();
        return;
      }
      existing.addEventListener("load", () => {
        existing.setAttribute("data-recaptcha-loaded", "true");
        handleReady();
      }, { once: true });
      existing.addEventListener("error", () => {
        existing.remove();
        reject(new Error(I18N.recaptchaLoadError));
      }, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://www.google.com/recaptcha/api.js?render=" + encodeURIComponent(SITEKEY);
    script.async = true;
    script.defer = true;
    script.onload = () => {
      script.setAttribute("data-recaptcha-loaded", "true");
      handleReady();
    };
    script.onerror = () => {
      script.remove();
      reject(new Error(I18N.recaptchaLoadError));
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
    form.removeEventListener("focusin", triggerOnce, true);
    form.removeEventListener("pointerdown", triggerOnce, true);
    form.removeEventListener("click", triggerOnce, true);
    loadRecaptchaScript().catch((err) => console.warn(err));
  };

  form.addEventListener("focusin", triggerOnce, true);
  form.addEventListener("pointerdown", triggerOnce, true);
  form.addEventListener("click", triggerOnce, true);

  if (document.activeElement && form.contains(document.activeElement)) {
    triggerOnce();
  }
}

const carouselEl = document.querySelector("#contactCarousel");
if (!carouselEl) {
  // Dieses Script wird nur auf /kontakt gebraucht.
} else {
  const carousel = new bootstrap.Carousel(carouselEl, { interval: false, wrap: false });
  const next = () => carousel.next();
  const prev = () => carousel.prev();

  ["paket", "umfang", "texterstellung", "bilderstellung", "slotId"].forEach((name) => {
    document.querySelectorAll(`input[name="${name}"]`).forEach((inp) => {
      inp.addEventListener("change", (e) => {
        if (name === "bilderstellung") {
          const fld = document.getElementById("uploadImagesField");
          if (e.target.value === "eigen") fld.style.display = "block";
          else {
            fld.style.display = "none";
            document.getElementById("imagesInput").value = "";
          }
        }
        next();
      });
    });
  });

  document.querySelectorAll(".next-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const slide = carouselEl.querySelector(".carousel-item.active");
      const invalid = [...slide.querySelectorAll("[required]")].some((f) => {
        if (/^(radio|checkbox)$/.test(f.type)) {
          return ![...slide.querySelectorAll(`[name="${f.name}"]`)].some((i) => i.checked);
        }
        return !f.value;
      });
      if (invalid) alert(I18N.invalidRequired);
      else next();
    });
  });

  document.querySelectorAll(".back-btn").forEach((b) => b.addEventListener("click", prev));

  const row = (l, v) => `<tr><th style="white-space:nowrap">${l}</th><td>${v || I18N.summaryNotSet}</td></tr>`;
  const labelText = (n) => {
    const i = document.querySelector(`input[name="${n}"]:checked`);
    return i ? i.nextElementSibling.textContent.trim() : I18N.summaryNotSet;
  };

  function updateSummary() {
    const box = document.getElementById("summaryBox");
    const features = [...document.querySelectorAll('input[name="inhalte"]:checked')]
      .map((c) => c.nextElementSibling.textContent.trim())
      .join(", ") || I18N.summaryNone;
    box.innerHTML = `
      <table class="table table-sm"><tbody>
        ${row(I18N.labels.paket, labelText("paket"))}
        ${row(I18N.labels.umfang, labelText("umfang"))}
        ${row(I18N.labels.texte, labelText("texterstellung"))}
        ${row(I18N.labels.bilder, labelText("bilderstellung"))}
        ${row(I18N.labels.funktionen, features)}
        ${row(I18N.labels.termin, labelText("slotId"))}
        ${row(I18N.labels.name, document.getElementById("nameInput").value)}
        ${row(I18N.labels.email, document.getElementById("emailInput").value)}
        ${row(I18N.labels.telefon, document.getElementById("telefonInput").value)}
        ${row(I18N.labels.firma, document.getElementById("firmaInput").value)}
        ${row(I18N.labels.infos, document.querySelector('textarea[name="sonstigeInfos"]').value)}
      </tbody></table>`;
  }

  carouselEl.addEventListener("slide.bs.carousel", (e) => {
    if (e.to === 8) updateSummary();
  });

  const kontaktForm = document.getElementById("kontaktForm");
  if (kontaktForm) {
    bindRecaptchaPrefetch(kontaktForm);

    kontaktForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        await loadRecaptchaScript();
        const token = await grecaptcha.execute(SITEKEY, { action: "submit" });
        e.target.token.value = token;
        e.target.submit();
      } catch (err) {
        console.error("reCAPTCHA Fehler:", err);
        alert(I18N.recaptchaLoadError);
      }
    });
  }
}
