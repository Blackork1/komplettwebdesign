(function () {
  'use strict';

  var RECAPTCHA_TIMEOUT_MS = 12_000;
  var DEFAULT_ERROR_MESSAGE = 'Die reCAPTCHA-Validierung ist fehlgeschlagen. Bitte versuche es erneut.';
  var DEFAULT_SUBMITTING_LABEL = 'Wird gesendet ...';

  function withTimeout(promise, timeoutMs, message) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        reject(new Error(message || DEFAULT_ERROR_MESSAGE));
      }, timeoutMs);

      Promise.resolve(promise).then(function (value) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      }, function (err) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  function normaliseAction(action) {
    if (!action) return '';
    action = action.trim();
    if (!action) return '';
    try {
      if (/^https?:/i.test(action)) {
        return new URL(action, window.location.origin).pathname;
      }
      if (window.location && action.indexOf(window.location.origin) === 0) {
        return action.slice(window.location.origin.length);
      }
    } catch (err) {
      return '';
    }
    return action;
  }

  function isEligibleForm(form) {
    if (!form) return false;
    if (form.dataset && form.dataset.recaptchaBound === 'true') return false;
    if (form.id === 'kontaktForm' || form.id === 'contactQuickForm') return false; // eigenes Handling in kontakt.ejs

    if (form.dataset && typeof form.dataset.recaptcha === 'string' && form.dataset.recaptcha.toLowerCase() === 'v3') {
      return true;
    }

    var action = normaliseAction(form.getAttribute('action'));
    return action === '/kontakt';
  }

  function ensureHiddenToken(form) {
    var input = form.querySelector('input[name="token"]');
    if (!input) {
      input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'token';
      form.appendChild(input);
    }
    return input;
  }

  function findStatusElement(form) {
    var status = form.querySelector('[data-form-status]');
    if (status) return status;

    status = document.createElement('p');
    status.className = 'form-status';
    status.setAttribute('data-form-status', '');
    status.setAttribute('role', 'alert');
    status.setAttribute('aria-live', 'polite');
    form.appendChild(status);
    return status;
  }

  function setStatus(form, message, isError) {
    var status = findStatusElement(form);
    if (!status) return;
    status.textContent = message || '';
    status.hidden = !message;
    status.classList.toggle('is-error', !!isError);
    status.classList.toggle('is-success', !!message && !isError);
  }

  function clearStatus(form) {
    var status = form.querySelector('[data-form-status]');
    if (!status) return;
    status.textContent = '';
    status.hidden = true;
    status.classList.remove('is-error', 'is-success');
  }

  function getSubmitButton(form, event) {
    if (event && event.submitter && typeof event.submitter === 'object') {
      return event.submitter;
    }
    return form.querySelector('button[type="submit"], input[type="submit"]');
  }

  function setSubmitState(button, isSubmitting, originalText, label) {
    if (!button) return;
    button.disabled = !!isSubmitting;
    if (isSubmitting) {
      button.setAttribute('aria-busy', 'true');
      if ('textContent' in button) button.textContent = label || DEFAULT_SUBMITTING_LABEL;
      return;
    }
    button.removeAttribute('aria-busy');
    if (originalText && 'textContent' in button) button.textContent = originalText;
  }

  function bindForm(form, siteKey) {
    if (!form || form.dataset.recaptchaBound === 'true') return;
    form.dataset.recaptchaBound = 'true';
    var actionName = (form.dataset && form.dataset.recaptchaAction) || 'kontakt';
    var tokenInput = ensureHiddenToken(form);
    var pendingPromise = null;
    var isSubmitting = false;

    function requestToken() {
      if (pendingPromise) return pendingPromise;

      try {
        pendingPromise = withTimeout(loadRecaptchaScript(siteKey), RECAPTCHA_TIMEOUT_MS, DEFAULT_ERROR_MESSAGE).then(function () {
          if (!window.grecaptcha || typeof window.grecaptcha.execute !== 'function') {
            throw new Error('reCAPTCHA ist nicht bereit.');
          }
          return withTimeout(
            window.grecaptcha.execute(siteKey, { action: actionName }),
            RECAPTCHA_TIMEOUT_MS,
            DEFAULT_ERROR_MESSAGE
          );
        }).then(function (token) {
          tokenInput.value = token || '';
          pendingPromise = null;
          return token;
        }, function (err) {
          pendingPromise = null;
          throw err;
        });
      } catch (err) {
        pendingPromise = null;
        return Promise.reject(err);
      }

      return pendingPromise;
    }

    function showError(err) {
      console.error('reCAPTCHA Fehler:', err);
      var message = (form.dataset && form.dataset.recaptchaError) ||
        DEFAULT_ERROR_MESSAGE;
      setStatus(form, message, true);
      if (!form.querySelector('[data-form-status]') && typeof window.alert === 'function') {
        window.alert(message);
      }
    }

    function detachInteractionHandlers() {
      form.removeEventListener('focusin', onInteraction, true);
      form.removeEventListener('pointerdown', onInteraction, true);
      form.removeEventListener('click', onInteraction, true);
    }

    function prefetchToken() {
      if (tokenInput.value) {
        detachInteractionHandlers();
        return;
      }
      requestToken().then(function () {
        detachInteractionHandlers();
      }).catch(function (err) {
        console.warn('reCAPTCHA konnte nicht vorab geladen werden:', err);
      });
    }

    function onInteraction(event) {
      if (!event) {
        prefetchToken();
        return;
      }
      var target = event.target;
      if (!target) {
        prefetchToken();
        return;
      }
      if (target === form) {
        prefetchToken();
        return;
      }
      if (typeof target.closest === 'function') {
        var relatedForm = target.closest('form');
        if (relatedForm && relatedForm !== form) {
          return;
        }
      }
      prefetchToken();
    }

    form.addEventListener('focusin', onInteraction, true);
    form.addEventListener('pointerdown', onInteraction, true);
    form.addEventListener('click', onInteraction, true);

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (isSubmitting) return;
      clearStatus(form);

      if (typeof form.checkValidity === 'function' && !form.checkValidity()) {
        if (typeof form.reportValidity === 'function') form.reportValidity();
        setStatus(form, (form.dataset && form.dataset.validationError) || 'Bitte prüfe die markierten Pflichtfelder.', true);
        return;
      }

      var submitButton = getSubmitButton(form, event);
      var originalButtonText = submitButton && 'textContent' in submitButton ? submitButton.textContent : '';
      isSubmitting = true;
      setSubmitState(submitButton, true, originalButtonText, (form.dataset && form.dataset.submittingLabel) || DEFAULT_SUBMITTING_LABEL);
      requestToken().then(function () {
        HTMLFormElement.prototype.submit.call(form);
      }).catch(function (err) {
        isSubmitting = false;
        setSubmitState(submitButton, false, originalButtonText);
        showError(err);
      });
    });
  }

  var recaptchaScriptPromise = null;

  function waitForRecaptchaReady() {
    return new Promise(function (resolve, reject) {
      var attempts = 0;

      function checkReady() {
        if (window.grecaptcha && typeof window.grecaptcha.ready === 'function') {
          window.grecaptcha.ready(resolve);
          return;
        }

        attempts += 1;
        if (attempts > 80) {
          reject(new Error('reCAPTCHA konnte nicht geladen werden.'));
          return;
        }

        setTimeout(checkReady, 100);
      }

      checkReady();
    });
  }

  function loadRecaptchaScript(siteKey) {
    if (window.grecaptcha && typeof window.grecaptcha.ready === 'function') {
      return waitForRecaptchaReady();
    }
    if (recaptchaScriptPromise) return recaptchaScriptPromise;

    recaptchaScriptPromise = new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[src^="https://www.google.com/recaptcha/api.js"]');
      if (existing) {
        waitForRecaptchaReady().then(resolve, reject);
        return;
      }

      var script = document.createElement('script');
      script.src = 'https://www.google.com/recaptcha/api.js?render=' + encodeURIComponent(siteKey);
      script.async = true;
      script.defer = true;
      script.onload = function () {
        waitForRecaptchaReady().then(resolve, reject);
      };
      script.onerror = function () {
        reject(new Error('reCAPTCHA konnte nicht geladen werden.'));
      };
      document.head.appendChild(script);
    }).then(function (value) {
      recaptchaScriptPromise = null;
      return value;
    }, function (err) {
      recaptchaScriptPromise = null;
      throw err;
    });

    return recaptchaScriptPromise;
  }

  function init() {
    var siteKey = window.SITEKEY;
    if (!siteKey) return;

    var forms = Array.prototype.slice.call(document.forms || []).filter(isEligibleForm);
    if (!forms.length) return;

    forms.forEach(function (form) { bindForm(form, siteKey); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
