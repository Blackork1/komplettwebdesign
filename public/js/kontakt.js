/* ============================================================
   public/js/kontakt.js - Kontaktformular Phase 5
   ============================================================ */

(function () {
  const SITEKEY = window.SITEKEY;
  const CONTACT_I18N = window.CONTACT_I18N || {};
  const CONTACT_FLOWS = window.CONTACT_FLOWS || {};
  const I18N = {
    recaptchaMissingKey: CONTACT_I18N.recaptchaMissingKey || "Es wurde kein Spamschutz-Schlüssel konfiguriert.",
    recaptchaLoadError: CONTACT_I18N.recaptchaLoadError || "Der Spamschutz konnte nicht geladen werden. Bitte versuche es erneut.",
    formStartEvent: CONTACT_I18N.formStartEvent || "contact_form_start",
    backLabel: CONTACT_I18N.backLabel || "Zurück",
    nextLabel: CONTACT_I18N.nextLabel || "Weiter",
    submittingLabel: CONTACT_I18N.submittingLabel || "Wird gesendet ...",
    stepLabel: CONTACT_I18N.stepLabel || "Schritt",
    ofLabel: CONTACT_I18N.ofLabel || "von"
  };

  let recaptchaPromise = null;
  const startedForms = new WeakSet();

  function waitForGrecaptchaReady() {
    return new Promise((resolve) => {
      if (window.grecaptcha && typeof window.grecaptcha.ready === "function") {
        window.grecaptcha.ready(resolve);
        return;
      }
      const interval = window.setInterval(() => {
        if (window.grecaptcha && typeof window.grecaptcha.ready === "function") {
          window.clearInterval(interval);
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

  function dispatchContactEvent(name, detail) {
    const payload = {
      ...(detail || {}),
      event_source: (detail && detail.event_source) || "contact_form",
      page_path: window.location.pathname
    };

    if (window.KWDTracking && typeof window.KWDTracking.trackEvent === "function") {
      window.KWDTracking.trackEvent(name, payload);
      return;
    }

    document.dispatchEvent(new CustomEvent("kwd:" + name, {
      detail: payload
    }));
  }

  function markFormStarted(form) {
    if (!form || startedForms.has(form)) return;
    startedForms.add(form);
    dispatchContactEvent(I18N.formStartEvent, {
      form_variant: form.dataset.formVariant || "contact",
      form_id: form.id || ""
    });
  }

  function bindRecaptcha(form) {
    if (!form) return;
    let isSubmitting = false;

    const prefetch = () => {
      form.removeEventListener("focusin", prefetch, true);
      form.removeEventListener("pointerdown", prefetch, true);
      form.removeEventListener("click", prefetch, true);
      loadRecaptchaScript().catch(() => {});
    };

    form.addEventListener("focusin", prefetch, true);
    form.addEventListener("pointerdown", prefetch, true);
    form.addEventListener("click", prefetch, true);

    form.addEventListener("input", () => markFormStarted(form), { once: true });
    form.addEventListener("change", () => markFormStarted(form), { once: true });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (isSubmitting) return;
      if (typeof form.checkValidity === "function" && !form.checkValidity()) {
        if (typeof form.reportValidity === "function") form.reportValidity();
        return;
      }

      const submitButton = event.submitter instanceof HTMLElement
        ? event.submitter
        : form.querySelector('button[type="submit"], input[type="submit"]');
      const originalButtonText = submitButton && "textContent" in submitButton ? submitButton.textContent : "";
      isSubmitting = true;
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.setAttribute("aria-busy", "true");
        if ("textContent" in submitButton) {
          submitButton.textContent = I18N.submittingLabel;
        }
      }

      dispatchContactEvent("contact_form_submit_attempt", {
        form_id: form.id || "",
        form_variant: form.dataset.formVariant || "contact"
      });
      try {
        await loadRecaptchaScript();
        const token = await window.grecaptcha.execute(SITEKEY, { action: form.dataset.recaptchaAction || "contact_request" });
        const tokenField = form.querySelector('input[name="token"]');
        if (tokenField) tokenField.value = token;
        HTMLFormElement.prototype.submit.call(form);
      } catch (err) {
        isSubmitting = false;
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.removeAttribute("aria-busy");
          if ("textContent" in submitButton && originalButtonText) {
            submitButton.textContent = originalButtonText;
          }
        }
        dispatchContactEvent("contact_form_submit_error", {
          form_id: form.id || "",
          form_variant: form.dataset.formVariant || "contact",
          error_type: "spam_check"
        });
        if (window.location.search.indexOf("debug-tracking") !== -1) {
          console.error("reCAPTCHA Fehler:", err);
        }
        window.alert(I18N.recaptchaLoadError);
      }
    });
  }

  function bindOptionalFeatureLogic(form) {
    if (!form) return;
    const featureInputs = Array.from(form.querySelectorAll('input[name="optionalFeatures"]'));
    if (!featureInputs.length) return;

    featureInputs.forEach((input) => {
      input.addEventListener("change", () => {
        if (!input.checked) return;
        if (input.value === "none") {
          featureInputs.forEach((candidate) => {
            if (candidate !== input) candidate.checked = false;
          });
          return;
        }
        const noneInput = featureInputs.find((candidate) => candidate.value === "none");
        if (noneInput) noneInput.checked = false;
      });
    });
  }

  function escapeSelector(value) {
    if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(value);
    return String(value).replace(/["\\]/g, "\\$&");
  }

  function findCardFields(card) {
    return Array.from(card.querySelectorAll("input, select, textarea"))
      .filter((field) => !field.disabled && field.type !== "hidden");
  }

  function findAllCardFields(card) {
    return Array.from(card.querySelectorAll("input, select, textarea"))
      .filter((field) => field.type !== "hidden");
  }

  function isGroupComplete(form, field) {
    const name = field.name;
    if (!name) return field.checked;
    const selector = `input[type="${field.type}"][name="${escapeSelector(name)}"]`;
    const group = Array.from(form.querySelectorAll(selector));
    return group.some((candidate) => candidate.checked);
  }

  function isCardComplete(form, card) {
    const requiredFields = findCardFields(card).filter((field) => field.required);
    const checkedGroups = new Set();

    for (const field of requiredFields) {
      if (field.type === "radio" || field.type === "checkbox") {
        const key = `${field.type}:${field.name}`;
        if (checkedGroups.has(key)) continue;
        checkedGroups.add(key);
        if (!isGroupComplete(form, field)) return false;
        continue;
      }

      if (!field.checkValidity()) return false;
    }

    return true;
  }

  function focusCard(card) {
    const legend = card.querySelector("legend");
    if (legend) {
      legend.setAttribute("tabindex", "-1");
      legend.focus({ preventScroll: true });
      return;
    }

    const firstField = findCardFields(card)[0];
    firstField?.focus({ preventScroll: true });
  }

  function scrollCardIntoView(card, behavior = "smooth") {
    if (!card || typeof window.scrollTo !== "function") return;
    const header = document.querySelector(".site-header, .main-header, header");
    const headerHeight = header ? header.getBoundingClientRect().height : 0;
    const topOffset = Math.max(72, Math.round(headerHeight + 18));
    const targetTop = card.getBoundingClientRect().top + window.scrollY - topOffset;
    window.scrollTo({
      top: Math.max(0, targetTop),
      behavior
    });
  }

  function reportCardProblem(card) {
    card.classList.add("was-validated");
    const firstRequired = findCardFields(card).find((field) => {
      if (!field.required) return false;
      if (field.type === "radio" || field.type === "checkbox") return !isGroupComplete(field.form, field);
      return !field.checkValidity();
    });

    if (!firstRequired) return;
    if (firstRequired.type === "radio" || firstRequired.type === "checkbox") {
      firstRequired.closest("label")?.focus?.();
      firstRequired.reportValidity?.();
      return;
    }
    firstRequired.reportValidity?.();
  }

  function stepIdForCard(card, index) {
    if (!card) return "";
    if (card.hasAttribute("data-contact-final")) return "contact_final";
    const explicit = card.getAttribute("data-contact-step");
    return explicit || `step_${index + 1}`;
  }

  function setWizardHeight(viewport, card) {
    if (!viewport || !card || card.hidden) return;
    const height = card.offsetHeight;
    if (height > 0) {
      viewport.style.setProperty("--contact-wizard-min-height", `${height}px`);
    }
  }

  function getSelectedProjectType(form) {
    return form.querySelector('input[name="projectType"]:checked')?.value || "unsure";
  }

  function cardBranches(card) {
    const value = card.getAttribute("data-contact-branch") || "";
    return value.split(/\s+/).map((item) => item.trim()).filter(Boolean);
  }

  function cardMatchesProjectType(card, projectType) {
    if (card.hasAttribute("data-contact-final")) return true;
    const branches = cardBranches(card);
    if (!branches.length || branches.includes("all")) return true;
    return branches.includes(projectType);
  }

  function stepKeyForCard(card) {
    if (!card) return "";
    if (card.hasAttribute("data-contact-final")) return "contact";
    return card.getAttribute("data-contact-step") || "";
  }

  function getActiveCards(form, cards) {
    const projectType = getSelectedProjectType(form);
    const active = cards.filter((card) => cardMatchesProjectType(card, projectType));
    const configuredSteps = Array.isArray(CONTACT_FLOWS[projectType])
      ? CONTACT_FLOWS[projectType]
      : (Array.isArray(CONTACT_FLOWS.unsure) ? CONTACT_FLOWS.unsure : []);
    if (!configuredSteps.length) return active;

    const originalIndex = new Map(cards.map((card, index) => [card, index]));
    return active.sort((a, b) => {
      const indexA = configuredSteps.indexOf(stepKeyForCard(a));
      const indexB = configuredSteps.indexOf(stepKeyForCard(b));
      const safeA = indexA === -1 ? configuredSteps.length + (originalIndex.get(a) || 0) : indexA;
      const safeB = indexB === -1 ? configuredSteps.length + (originalIndex.get(b) || 0) : indexB;
      return safeA - safeB;
    });
  }

  function fieldRequiredForProjectType(field, projectType) {
    const requiredFor = field.getAttribute("data-required-for");
    if (!requiredFor) return field.dataset.originalRequired === "true";
    return requiredFor.split(/\s+/).filter(Boolean).includes(projectType);
  }

  function applyBranchFieldState(form, cards) {
    const projectType = getSelectedProjectType(form);
    cards.forEach((card) => {
      const isActiveCard = cardMatchesProjectType(card, projectType);
      findAllCardFields(card).forEach((field) => {
        if (!field.dataset.originalRequired) {
          field.dataset.originalRequired = field.required ? "true" : "false";
        }
        field.disabled = !isActiveCard;
        field.required = isActiveCard && fieldRequiredForProjectType(field, projectType);
      });
    });
  }

  function createStepHeader(card, index, total) {
    const existing = card.querySelector(".contact-step-head");
    if (existing) {
      const progress = existing.querySelector(".contact-step-progress");
      if (progress) progress.textContent = `${I18N.stepLabel} ${index + 1} ${I18N.ofLabel} ${total}`;
      return;
    }

    const head = document.createElement("div");
    head.className = "contact-step-head";
    head.innerHTML = `
      <button class="contact-step-back" type="button" aria-label="${I18N.backLabel}">
        <span aria-hidden="true">←</span>
      </button>
      <span class="contact-step-progress">${I18N.stepLabel} ${index + 1} ${I18N.ofLabel} ${total}</span>
    `;

    const legend = card.querySelector("legend");
    if (legend) legend.insertAdjacentElement("afterend", head);
    else card.prepend(head);
  }

  function createStepFooter(card) {
    if (card.hasAttribute("data-contact-final") || card.querySelector(".contact-step-actions")) return;

    const footer = document.createElement("div");
    footer.className = "contact-step-actions";
    footer.innerHTML = `<button class="contact-step-next" type="button">${I18N.nextLabel}</button>`;
    card.append(footer);
  }

  function bindDetailedWizard(form) {
    if (!form || !form.classList.contains("contact-form--detailed")) return;

    const viewport = form.querySelector("[data-contact-wizard-viewport]") || form;
    const cards = Array.from(form.querySelectorAll("[data-contact-step], [data-contact-final]"));
    if (!cards.length) return;

    form.classList.add("is-stepped");
    const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let currentIndex = 0;
    let isTransitioning = false;
    let activeCards = [];

    function refreshActiveCards() {
      applyBranchFieldState(form, cards);
      activeCards = getActiveCards(form, cards);
      activeCards.forEach((card, index) => {
        createStepHeader(card, index, activeCards.length);
        createStepFooter(card);
      });
      return activeCards;
    }

    function updateControls(card) {
      const nextButton = card.querySelector(".contact-step-next");
      if (!nextButton) return;
      nextButton.disabled = !isCardComplete(form, card);
    }

    function showOnly(index, shouldFocus = false) {
      refreshActiveCards();
      currentIndex = Math.max(0, Math.min(index, activeCards.length - 1));
      const currentCard = activeCards[currentIndex];
      cards.forEach((card, cardIndex) => {
        const active = card === currentCard;
        card.hidden = !active;
        card.setAttribute("aria-hidden", active ? "false" : "true");
        card.classList.toggle("is-step-active", active);
        card.classList.remove("is-entering-from-right", "is-entering-from-left", "is-leaving-left", "is-leaving-right");
      });
      form.dataset.visibleStep = String(currentIndex + 1);
      updateControls(currentCard);
      setWizardHeight(viewport, currentCard);
      dispatchContactEvent("contact_form_step_view", {
        form_id: form.id || "",
        form_variant: form.dataset.formVariant || "detailed",
        step_id: stepIdForCard(currentCard, currentIndex)
      });
      if (shouldFocus) {
        scrollCardIntoView(currentCard, reduceMotion ? "auto" : "smooth");
        focusCard(currentCard);
      }
    }

    function goTo(index, direction) {
      if (isTransitioning) return;
      refreshActiveCards();
      const nextIndex = Math.max(0, Math.min(index, activeCards.length - 1));
      if (nextIndex === currentIndex) return;

      const previous = activeCards[currentIndex];
      const next = activeCards[nextIndex];
      const isBack = direction === "back";

      if (reduceMotion) {
        showOnly(nextIndex, true);
        return;
      }

      isTransitioning = true;
      form.classList.add("is-transitioning");
      setWizardHeight(viewport, previous);

      next.hidden = false;
      next.setAttribute("aria-hidden", "false");
      next.classList.remove("is-step-active", "is-leaving-left", "is-leaving-right");
      next.classList.add(isBack ? "is-entering-from-left" : "is-entering-from-right");
      previous.classList.add(isBack ? "is-leaving-right" : "is-leaving-left");

      window.requestAnimationFrame(() => {
        setWizardHeight(viewport, next);
        next.classList.add("is-step-active");
        next.classList.remove("is-entering-from-left", "is-entering-from-right");
      });

      window.setTimeout(() => {
        previous.hidden = true;
        previous.setAttribute("aria-hidden", "true");
        previous.classList.remove("is-step-active", "is-leaving-left", "is-leaving-right");
        next.classList.add("is-step-active");
        currentIndex = nextIndex;
        form.dataset.visibleStep = String(currentIndex + 1);
        form.classList.remove("is-transitioning");
        isTransitioning = false;
        updateControls(next);
        setWizardHeight(viewport, next);
        dispatchContactEvent("contact_form_step_view", {
          form_id: form.id || "",
          form_variant: form.dataset.formVariant || "detailed",
          step_id: stepIdForCard(next, currentIndex)
        });
        scrollCardIntoView(next, reduceMotion ? "auto" : "smooth");
        focusCard(next);
      }, 320);
    }

    function handleBack() {
      if (currentIndex > 0) {
        goTo(currentIndex - 1, "back");
        return;
      }

      if (window.KWDContactPanels && typeof window.KWDContactPanels.hidePanels === "function") {
        window.history.replaceState(null, "", "#anfrage");
        window.KWDContactPanels.hidePanels(true);
      }
    }

    refreshActiveCards();

    cards.forEach((card) => {
      createStepHeader(card, activeCards.indexOf(card) >= 0 ? activeCards.indexOf(card) : 0, activeCards.length);
      createStepFooter(card);

      const backButton = card.querySelector(".contact-step-back");
      backButton?.addEventListener("click", handleBack);

      const nextButton = card.querySelector(".contact-step-next");
      nextButton?.addEventListener("click", () => {
        const activeIndex = activeCards.indexOf(card);
        if (!isCardComplete(form, card)) {
          dispatchContactEvent("contact_form_validation_error", {
            form_id: form.id || "",
            form_variant: form.dataset.formVariant || "detailed",
            step_id: stepIdForCard(card, activeIndex),
            error_type: "missing_required"
          });
          reportCardProblem(card);
          return;
        }
        dispatchContactEvent("contact_form_step_complete", {
          form_id: form.id || "",
          form_variant: form.dataset.formVariant || "detailed",
          step_id: stepIdForCard(card, activeIndex)
        });
        goTo(activeIndex + 1, "forward");
      });

      findAllCardFields(card).forEach((field) => {
        field.addEventListener("input", () => updateControls(card));
        field.addEventListener("change", () => {
          if (field.name === "projectType") {
            showOnly(1, true);
            return;
          }
          updateControls(card);
        });
      });
    });

    refreshActiveCards();
    const firstIncompleteIndex = activeCards.findIndex((card) => !isCardComplete(form, card));
    const initialIndex = form.dataset.formHasErrors === "true"
      ? (firstIncompleteIndex >= 0 ? firstIncompleteIndex : activeCards.length - 1)
      : 0;

    showOnly(initialIndex, false);

    window.addEventListener("resize", () => {
      window.requestAnimationFrame(() => setWizardHeight(viewport, activeCards[currentIndex]));
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const forms = Array.from(document.querySelectorAll(".contact-form"));
    forms.forEach((form) => {
      bindRecaptcha(form);
      bindOptionalFeatureLogic(form);
      bindDetailedWizard(form);
      if (form.dataset.formHasErrors === "true") {
        dispatchContactEvent("contact_form_submit_error", {
          form_id: form.id || "",
          form_variant: form.dataset.formVariant || "contact",
          error_type: "server_validation"
        });
      }
    });

    document.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
      const eventName = target.dataset.contactEvent;
      if (!eventName) return;
      const form = target.closest("form");
      const selectedFeatures = form
        ? Array.from(form.querySelectorAll('input[name="optionalFeatures"]:checked')).map((input) => input.value)
        : [];
      dispatchContactEvent(eventName, {
        form_id: form?.id || "",
        form_variant: form?.dataset.formVariant || "contact",
        field_name: target.name,
        selected_value: target.value,
        optional_features: target.name === "optionalFeatures" ? selectedFeatures : undefined,
        feature_count: target.name === "optionalFeatures" ? selectedFeatures.length : undefined
      });
    });
  });
})();
