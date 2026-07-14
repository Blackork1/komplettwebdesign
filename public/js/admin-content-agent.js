(function () {
  'use strict';

  function formatGermanLocalDateTime(value) {
    var match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(String(value || ''));
    if (!match) return '';
    var year = Number(match[1]);
    var month = Number(match[2]);
    var day = Number(match[3]);
    var hour = Number(match[4]);
    var minute = Number(match[5]);
    var candidate = new Date(Date.UTC(year, month - 1, day, hour, minute));
    if (candidate.getUTCFullYear() !== year
        || candidate.getUTCMonth() !== month - 1
        || candidate.getUTCDate() !== day
        || candidate.getUTCHours() !== hour
        || candidate.getUTCMinutes() !== minute) return '';
    var weekdays = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    var months = [
      'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
      'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
    ];
    return weekdays[candidate.getUTCDay()] + ', ' + day + '. ' + months[month - 1]
      + ' ' + year + ' um ' + match[4] + ':' + match[5] + ' Uhr';
  }

  document.querySelectorAll('[data-confirm]').forEach(function (form) {
    form.addEventListener('submit', function (event) {
      var question = form.getAttribute('data-confirm');
      if (form.getAttribute('data-confirm-scheduled-at') !== null) {
        var scheduledAtField = form.querySelector('input[name="scheduled_at_local"]');
        var scheduledAtLabel = formatGermanLocalDateTime(scheduledAtField && scheduledAtField.value);
        if (!scheduledAtLabel) {
          event.preventDefault();
          if (scheduledAtField && typeof scheduledAtField.reportValidity === 'function') {
            scheduledAtField.reportValidity();
          }
          return;
        }
        question += '\n\nAusgewählter Termin: ' + scheduledAtLabel + '.';
      }
      if (question && !window.confirm(question)) event.preventDefault();
    });
  });

  document.querySelectorAll('[data-confirm-mode]').forEach(function (form) {
    form.addEventListener('submit', function (event) {
      var selected = form.querySelector('input[name="operating_mode"]:checked');
      if (!selected || selected.value !== form.getAttribute('data-confirm-mode')) return;
      if (!window.confirm('Direktveröffentlichung wirklich aktivieren? Alle Sicherheitsvoraussetzungen werden serverseitig erneut geprüft.')) {
        event.preventDefault();
      }
    });
  });

  document.querySelectorAll('[data-count-target]').forEach(function (field) {
    var target = document.getElementById(field.getAttribute('data-count-target'));
    if (!target) return;
    var update = function () {
      target.textContent = String(field.value.length);
    };
    field.addEventListener('input', update);
    update();
  });

  var optimizationStatus = document.querySelector('[data-review-optimization-status]');
  var optimizationForms = Array.from(document.querySelectorAll('[data-review-optimization-form]'));
  var optimizationLocked = false;
  var optimizationRequestRunning = false;
  var optimizationTimer = null;
  var optimizationStates = ['idle', 'queued', 'running', 'completed', 'failed', 'manual_attention'];
  var optimizationTitles = {
    idle: 'Fehlerbehebung bereit',
    queued: 'Fehlerbehebung eingeplant',
    running: 'Fehlerbehebung läuft',
    completed: 'Fehlerbehebung abgeschlossen',
    failed: 'Fehlerbehebung fehlgeschlagen',
    manual_attention: 'Manuelle Prüfung erforderlich'
  };
  var optimizationMessages = {
    idle: 'Du kannst einzelne oder alle Prüfhinweise automatisch bearbeiten lassen.',
    queued: 'Die Fehlerbehebung wurde eingeplant und wartet auf den Worker.',
    running: 'Die Fehlerbehebung wird gerade ausgeführt.',
    completed: 'Die Fehlerbehebung wurde erfolgreich abgeschlossen.',
    failed: 'Die Fehlerbehebung ist fehlgeschlagen.',
    manual_attention: 'Die Fehlerbehebung benötigt eine manuelle Prüfung.'
  };

  function positiveInteger(value) {
    var normalized = Number(value);
    return Number.isSafeInteger(normalized) && normalized > 0 ? normalized : null;
  }

  function nonNegativeInteger(value) {
    var normalized = Number(value);
    return Number.isSafeInteger(normalized) && normalized >= 0 ? normalized : 0;
  }

  function safeOptimizationState(value) {
    return optimizationStates.includes(value) ? value : 'failed';
  }

  function optimizationIconClass(state, active) {
    if (active) return 'fa-solid fa-spinner';
    if (state === 'completed') return 'fa-solid fa-circle-check';
    if (state === 'failed' || state === 'manual_attention') {
      return 'fa-solid fa-triangle-exclamation';
    }
    return 'fa-solid fa-wand-magic-sparkles';
  }

  function setOptimizationState(data) {
    if (!optimizationStatus) return;
    var state = safeOptimizationState(data && data.state);
    var active = Boolean(data && data.active === true);
    var title = optimizationStatus.querySelector('[data-review-optimization-title]');
    var message = optimizationStatus.querySelector('[data-review-optimization-message]');
    var meta = optimizationStatus.querySelector('[data-review-optimization-meta]');
    var network = optimizationStatus.querySelector('[data-review-optimization-network]');
    var reload = optimizationStatus.querySelector('[data-review-optimization-reload]');
    var jobs = optimizationStatus.querySelector('[data-review-optimization-jobs]');
    var retry = optimizationStatus.querySelector('[data-review-optimization-retry]');
    var icon = optimizationStatus.querySelector('.content-agent-review-optimization__icon i');
    var jobId = positiveInteger(data && data.jobId);
    var attempts = nonNegativeInteger(data && data.attempts);
    var maxAttempts = nonNegativeInteger(data && data.maxAttempts);

    optimizationStates.forEach(function (knownState) {
      optimizationStatus.classList.remove('is-' + knownState);
    });
    optimizationStatus.classList.add('is-' + state);
    optimizationStatus.setAttribute('data-state', state);
    optimizationStatus.setAttribute('data-active', active ? 'true' : 'false');
    optimizationStatus.setAttribute('aria-busy', active ? 'true' : 'false');

    if (title) title.textContent = optimizationTitles[state];
    if (message) {
      var safeMessage = typeof data.message === 'string' && data.message.length <= 300
        ? data.message
        : optimizationMessages[state];
      message.textContent = safeMessage;
    }
    if (meta) {
      meta.hidden = jobId === null;
      meta.textContent = jobId === null
        ? ''
        : 'Job #' + jobId + (maxAttempts > 0 ? ' · Versuch ' + attempts + ' von ' + maxAttempts : '');
    }
    if (network) {
      network.hidden = true;
      network.textContent = '';
    }
    if (reload) reload.hidden = !(state === 'completed' && data.reloadRecommended === true);
    if (jobs) jobs.hidden = !(state === 'failed' || state === 'manual_attention');
    if (retry) retry.hidden = true;
    if (icon) icon.className = optimizationIconClass(state, active);
  }

  function showOptimizationNetworkError() {
    if (!optimizationStatus) return;
    var network = optimizationStatus.querySelector('[data-review-optimization-network]');
    var retry = optimizationStatus.querySelector('[data-review-optimization-retry]');
    if (network) {
      network.textContent = 'Die Statusaktualisierung ist vorübergehend unterbrochen. Die Fehlerbehebung bleibt gesperrt.';
      network.hidden = false;
    }
    if (retry) retry.hidden = false;
  }

  function scheduleOptimizationStatus() {
    if (optimizationTimer !== null) window.clearTimeout(optimizationTimer);
    optimizationTimer = window.setTimeout(requestOptimizationStatus, 5000);
  }

  function requestOptimizationStatus() {
    if (!optimizationStatus || optimizationRequestRunning) return;
    var statusUrl = optimizationStatus.getAttribute('data-status-url');
    if (!statusUrl || typeof window.fetch !== 'function') {
      showOptimizationNetworkError();
      return;
    }
    optimizationRequestRunning = true;
    window.fetch(statusUrl, {
      method: 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' }
    }).then(function (response) {
      if (!response.ok) throw new Error('Statusabfrage fehlgeschlagen');
      return response.json();
    }).then(function (data) {
      setOptimizationState(data || {});
      if (data && data.active === true) scheduleOptimizationStatus();
    }).catch(function () {
      showOptimizationNetworkError();
    }).finally(function () {
      optimizationRequestRunning = false;
    });
  }

  function lockOptimizationForms(submitButton) {
    optimizationForms.forEach(function (form) {
      form.setAttribute('data-review-optimization-submitted', 'true');
      form.querySelectorAll('button[type="submit"]').forEach(function (button) {
        button.disabled = true;
        button.setAttribute('aria-disabled', 'true');
      });
    });
    if (submitButton) submitButton.textContent = 'Fehlerbehebung wird eingeplant …';
    setOptimizationState({
      state: 'queued',
      active: true,
      message: 'Die Fehlerbehebung wird eingeplant. Bitte warte einen Moment.',
      reloadRecommended: false
    });
  }

  optimizationForms.forEach(function (form) {
    form.addEventListener('submit', function (event) {
      if (event.defaultPrevented) return;
      if (optimizationLocked) {
        event.preventDefault();
        return;
      }
      optimizationLocked = true;
      lockOptimizationForms(form.querySelector('[data-review-optimization-submit]'));
    });
  });

  if (optimizationStatus) {
    var currentState = safeOptimizationState(optimizationStatus.getAttribute('data-state'));
    var retryStatus = optimizationStatus.querySelector('[data-review-optimization-retry]');
    if (retryStatus) retryStatus.addEventListener('click', requestOptimizationStatus);
    if (currentState === 'queued' || currentState === 'running') {
      scheduleOptimizationStatus();
    }
  }
}());
