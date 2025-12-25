(function () {
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
    var tokenInput = ensureHiddenToken(form);
    var pendingPromise = null;

    function requestToken() {
      if (!window.grecaptcha || typeof window.grecaptcha.execute !== 'function') {
        return Promise.reject(new Error('reCAPTCHA ist nicht bereit.'));
      }
      if (pendingPromise) return pendingPromise;

      try {
        pendingPromise = Promise.resolve(window.grecaptcha.execute(siteKey, { action: actionName })).then(function (token) {
          tokenInput.value = token || '';
          return token;
        })
          .finally(function () {
            pendingPromise = null;
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
        'Die reCAPTCHA-Validierung ist fehlgeschlagen. Bitte versuche es erneut.';
      if (typeof window.alert === 'function') {
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
      if (!window.grecaptcha || typeof window.grecaptcha.execute !== 'function') {
        console.warn('reCAPTCHA ist noch nicht bereit.');
        return;
      }

      event.preventDefault();

      requestToken().then(function () {
        form.submit();
      }).catch(function (err) {
        showError(err);
      });
    });
  }

  function waitForRecaptchaReady(callback) {
    if (window.grecaptcha && typeof window.grecaptcha.ready === 'function') {
      window.grecaptcha.ready(callback);
      return;
    }
    setTimeout(function () { waitForRecaptchaReady(callback); }, 200);
  }

  function init() {
    var siteKey = window.SITEKEY;
    if (!siteKey) return;

    var forms = Array.prototype.slice.call(document.forms || []).filter(isEligibleForm);
    if (!forms.length) return;

    waitForRecaptchaReady(function () {
      forms.forEach(function (form) { bindForm(form, siteKey); });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();