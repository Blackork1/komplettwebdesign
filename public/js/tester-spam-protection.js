(function () {
  var config = window.KWD_TESTER_SPAM || {};
  var startedAt = Date.now();
  var recaptchaPromise = null;
  var RECAPTCHA_TIMEOUT_MS = 12_000;

  function withTimeout(promise, timeoutMs, message) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        reject(new Error(message || 'reCAPTCHA konnte nicht geladen werden.'));
      }, timeoutMs);

      Promise.resolve(promise).then(function (value) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      }, function (error) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  function getSiteKey() {
    return String(config.siteKey || window.SITEKEY || '');
  }

  function waitForReady() {
    return new Promise(function (resolve, reject) {
      var attempts = 0;
      function check() {
        attempts += 1;
        if (window.grecaptcha && typeof window.grecaptcha.ready === 'function') {
          window.grecaptcha.ready(resolve);
          return;
        }
        if (attempts > 40) {
          reject(new Error('reCAPTCHA konnte nicht geladen werden.'));
          return;
        }
        setTimeout(check, 100);
      }
      check();
    });
  }

  function loadRecaptcha(siteKey) {
    if (window.grecaptcha && typeof window.grecaptcha.ready === 'function') {
      return waitForReady();
    }
    if (recaptchaPromise) return recaptchaPromise;

    recaptchaPromise = new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[src^="https://www.google.com/recaptcha/api.js"]');
      if (existing) {
        waitForReady().then(resolve).catch(reject);
        return;
      }

      var script = document.createElement('script');
      script.src = 'https://www.google.com/recaptcha/api.js?render=' + encodeURIComponent(siteKey);
      script.async = true;
      script.defer = true;
      script.onload = function () { waitForReady().then(resolve).catch(reject); };
      script.onerror = function () { reject(new Error('reCAPTCHA konnte nicht geladen werden.')); };
      document.head.appendChild(script);
    }).finally(function () {
      recaptchaPromise = null;
    });

    return recaptchaPromise;
  }

  async function execute(action) {
    var siteKey = getSiteKey();
    if (!siteKey) return '';
    await withTimeout(loadRecaptcha(siteKey), RECAPTCHA_TIMEOUT_MS, 'reCAPTCHA konnte nicht geladen werden.');
    if (!window.grecaptcha || typeof window.grecaptcha.execute !== 'function') {
      throw new Error('reCAPTCHA konnte nicht geladen werden.');
    }
    return withTimeout(window.grecaptcha.execute(siteKey, { action: action || 'website_audit_scan' }), RECAPTCHA_TIMEOUT_MS, 'reCAPTCHA konnte nicht geladen werden.');
  }

  function createInput(name, value) {
    var input = document.createElement('input');
    input.type = 'text';
    input.name = name;
    input.value = value || '';
    input.autocomplete = 'off';
    input.tabIndex = -1;
    input.setAttribute('aria-hidden', 'true');
    input.className = 'tester-honeypot';
    return input;
  }

  function ensureFields(form) {
    var targetForm = form || document.body;
    var honeypot = targetForm.querySelector('input[name="company_website"]');
    if (!honeypot) {
      honeypot = createInput('company_website', '');
      targetForm.appendChild(honeypot);
    }

    var timestamp = targetForm.querySelector('input[name="tester_started_at"]');
    if (!timestamp) {
      timestamp = createInput('tester_started_at', String(startedAt));
      timestamp.type = 'hidden';
      targetForm.appendChild(timestamp);
    }

    if (!timestamp.value) timestamp.value = String(startedAt);
    return { honeypot: honeypot, timestamp: timestamp };
  }

  async function collect(form, action) {
    var fields = ensureFields(form);
    var token = await execute(action);
    return {
      token: token,
      tester_started_at: fields.timestamp.value,
      company_website: fields.honeypot.value
    };
  }

  window.KWDTesterSpamProtection = {
    collect: collect,
    ensureFields: ensureFields,
    execute: execute
  };
})();
