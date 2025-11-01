(function() {
  'use strict';

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
    if (form.id === 'kontaktForm') return false; // eigenes Handling in kontakt.ejs

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

  function bindForm(form, siteKey) {
    if (!form || form.dataset.recaptchaBound === 'true') return;
    form.dataset.recaptchaBound = 'true';
    var actionName = (form.dataset && form.dataset.recaptchaAction) || 'kontakt';

    form.addEventListener('submit', function(event) {
      if (!window.grecaptcha || typeof window.grecaptcha.execute !== 'function') {
        console.warn('reCAPTCHA ist noch nicht bereit.');
        return;
      }

      event.preventDefault();

      window.grecaptcha.execute(siteKey, { action: actionName }).then(function(token) {
        ensureHiddenToken(form).value = token;
        form.submit();
      }).catch(function(err) {
        console.error('reCAPTCHA Fehler:', err);
        var message = (form.dataset && form.dataset.recaptchaError) ||
          'Die reCAPTCHA-Validierung ist fehlgeschlagen. Bitte versuche es erneut.';
        if (typeof window.alert === 'function') {
          window.alert(message);
        }
      });
    });
  }

  function waitForRecaptchaReady(callback) {
    if (window.grecaptcha && typeof window.grecaptcha.ready === 'function') {
      window.grecaptcha.ready(callback);
    } else {
      setTimeout(function() { waitForRecaptchaReady(callback); }, 150);
    }
  }

  function init() {
    var siteKey = window.SITEKEY;
    if (!siteKey) return;

    var forms = Array.prototype.slice.call(document.forms || []).filter(isEligibleForm);
    if (!forms.length) return;

    waitForRecaptchaReady(function() {
      forms.forEach(function(form) { bindForm(form, siteKey); });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();