/* ============================================================
   public/js/kontakt.js - Mehrstufiges Kontakt-Formular
   ============================================================ */

const SITEKEY = window.SITEKEY;
const CONTACT_I18N = window.CONTACT_I18N || {};
const I18N = {
  invalidRequired: CONTACT_I18N.invalidRequired || "Bitte alle Pflichtfelder ausfüllen.",
  recaptchaMissingKey: CONTACT_I18N.recaptchaMissingKey || "Es wurde kein reCAPTCHA Sitekey konfiguriert.",
  recaptchaLoadError: CONTACT_I18N.recaptchaLoadError || "reCAPTCHA konnte nicht geladen werden. Bitte versuche es erneut.",
  summaryNone: CONTACT_I18N.summaryNone || "Keine",
  summaryNotSet: CONTACT_I18N.summaryNotSet || "Nicht angegeben",
  progressLabel: CONTACT_I18N.progressLabel || "Schritt {current} von {total}",
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

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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
  const kontaktForm = document.getElementById("kontaktForm");
  const progressText = document.getElementById("contactProgressText");
  const progressFill = document.getElementById("contactProgressFill");
  const contactFormSteps = [
    { eventName: "contact_step_01_scope", stepName: "project_scope" },
    { eventName: "contact_step_02_pages", stepName: "page_scope" },
    { eventName: "contact_step_03_texts", stepName: "content_writing" },
    { eventName: "contact_step_04_images", stepName: "images" },
    { eventName: "contact_step_05_features", stepName: "features" },
    { eventName: "contact_step_06_appointment", stepName: "appointment" },
    { eventName: "contact_step_07_contact", stepName: "contact_details" },
    { eventName: "contact_step_08_details", stepName: "additional_info" },
    { eventName: "contact_step_09_summary", stepName: "summary" }
  ];
  const trackedStepIndexes = new Set();

  function updateContactProgress(stepIndex) {
    const current = Math.min(Math.max((Number(stepIndex) || 0) + 1, 1), contactFormSteps.length);
    const total = contactFormSteps.length;
    if (progressText) {
      progressText.textContent = I18N.progressLabel
        .replace("{current}", String(current))
        .replace("{total}", String(total));
    }
    if (progressFill) {
      progressFill.style.width = Math.round((current / total) * 100) + "%";
    }
  }

  function analyticsTrackingAllowed() {
    const consentState = window.cookieConsentState || {};
    const measurementId = window.env && window.env.GA_MEASUREMENT_ID;
    return consentState.analytics === true
      && typeof window.gtag === "function"
      && !(measurementId && window["ga-disable-" + measurementId]);
  }

  function readFormValue(name, fallback) {
    const input = kontaktForm && kontaktForm.querySelector(`[name="${name}"]`);
    return input && input.value ? input.value : fallback;
  }

  function trackContactStep(stepIndex) {
    const step = contactFormSteps[stepIndex];
    if (!step || trackedStepIndexes.has(stepIndex) || !analyticsTrackingAllowed()) return;

    try {
      window.gtag("event", step.eventName, {
        event_category: "lead_form",
        form_name: "contact_form",
        form_id: "kontaktForm",
        form_source: readFormValue("source", "contact_page"),
        locale: readFormValue("locale", document.documentElement.lang || "de"),
        step_number: stepIndex + 1,
        step_total: contactFormSteps.length,
        step_name: step.stepName,
        step_progress_percent: Math.round(((stepIndex + 1) / contactFormSteps.length) * 100)
      });
      trackedStepIndexes.add(stepIndex);
    } catch (err) {
      console.warn("[Analytics] Contact form step tracking failed:", err);
    }
  }

  function trackActiveContactStep() {
    const slides = Array.from(carouselEl.querySelectorAll(".carousel-item"));
    const activeIndex = slides.findIndex((slide) => slide.classList.contains("active"));
    const resolvedIndex = activeIndex >= 0 ? activeIndex : 0;
    updateContactProgress(resolvedIndex);
    trackContactStep(resolvedIndex);
  }

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

  const row = (l, v) => `<tr><th style="white-space:nowrap">${escapeHtml(l)}</th><td>${escapeHtml(v || I18N.summaryNotSet)}</td></tr>`;
  const labelText = (n) => {
    const i = document.querySelector(`input[name="${n}"]:checked`);
    if (!i) return I18N.summaryNotSet;
    const label = i.nextElementSibling;
    if (!label) return i.value || I18N.summaryNotSet;
    const title = label.querySelector(".option-title");
    return (title || label).textContent.trim();
  };

  function updateSummary() {
    const box = document.getElementById("summaryBox");
    if (!box) return;
    const features = [...document.querySelectorAll('input[name="inhalte"]:checked')]
      .map((c) => {
        const label = c.nextElementSibling;
        if (!label) return c.value;
        const title = label.querySelector(".option-title");
        return (title || label).textContent.trim();
      })
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

  carouselEl.addEventListener("slid.bs.carousel", (e) => {
    updateContactProgress(e.to);
    trackContactStep(e.to);
  });

  document.addEventListener("cookieConsentUpdate", (e) => {
    if (e.detail && e.detail.analytics === true) window.setTimeout(trackActiveContactStep, 0);
  });
  trackActiveContactStep();

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
