(function () {
  'use strict';

  var activeStates = ['queued', 'running'];
  var terminalStates = ['completed', 'failed', 'manual_attention'];
  var passiveStates = ['idle'];

  function knownState(value) {
    if (activeStates.includes(value)
        || terminalStates.includes(value)
        || passiveStates.includes(value)) return value;
    return null;
  }

  function positiveIntegerOrNull(value) {
    return value === null
      || (typeof value === 'number' && Number.isSafeInteger(value) && value > 0);
  }

  function safeStatusText(value) {
    return typeof value === 'string' && value.length > 0 && value.length <= 500;
  }

  function safeErrorCode(value) {
    return value === null
      || (typeof value === 'string' && /^[A-Za-z0-9_:-]{1,100}$/.test(value));
  }

  function safeTimestamp(value) {
    return value === null
      || (typeof value === 'string'
        && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value));
  }

  function safeStatusUrl(value) {
    var url = String(value || '');
    return /^\/admin\/content-agent\/existing-content\/[1-9]\d*\/optimization-status$/.test(url)
      ? url
      : null;
  }

  function safeActionUrl(value) {
    var url = String(value || '');
    if (url === '/admin/content-agent/jobs') return url;
    return /^\/admin\/content-agent\/revisions\/[1-9]\d*\/edit$/.test(url)
      ? url
      : null;
  }

  function setText(row, selector, value) {
    var target = row.querySelector(selector);
    if (target) target.textContent = typeof value === 'string' ? value : '';
  }

  function validStatusData(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    var state = knownState(data.state);
    if (!state) return null;
    var expectedActive = activeStates.includes(state);
    var expectedTerminal = terminalStates.includes(state);
    var revisionUrl = data.revisionUrl === null ? null : safeActionUrl(data.revisionUrl);
    if (typeof data.active !== 'boolean'
        || data.active !== expectedActive
        || typeof data.terminal !== 'boolean'
        || data.terminal !== expectedTerminal
        || typeof data.canStart !== 'boolean'
        || !safeStatusText(data.statusLabel)
        || !safeStatusText(data.stageLabel)
        || !safeStatusText(data.message)
        || !positiveIntegerOrNull(data.jobId)
        || (state === 'idle' ? data.jobId !== null : data.jobId === null)
        || !positiveIntegerOrNull(data.revisionId)
        || (data.revisionUrl !== null && revisionUrl === null)
        || (data.revisionId === null) !== (data.revisionUrl === null)
        || (data.revisionId !== null
          && revisionUrl !== '/admin/content-agent/revisions/' + data.revisionId + '/edit')
        || !safeErrorCode(data.errorCode)
        || typeof data.unsafeProviderState !== 'boolean'
        || !safeTimestamp(data.updatedAt)) return null;
    return state;
  }

  function replacePrimaryAction(row, data, state) {
    var target = row.querySelector('[data-existing-content-primary-action]');
    if (!target) return;

    if (activeStates.includes(state)) {
      var activeButton = target.querySelector('button');
      if (activeButton) {
        activeButton.disabled = true;
        activeButton.textContent = state === 'queued'
          ? 'Optimierung eingeplant'
          : 'Optimierung läuft';
      }
      return;
    }

    var link = document.createElement('a');
    link.className = 'btn btn-sm btn-primary';
    var revisionUrl = safeActionUrl(data && data.revisionUrl);
    if (state === 'completed' && revisionUrl) {
      link.href = revisionUrl;
      link.textContent = 'Revision bearbeiten';
    } else if (state === 'failed' && data && data.canStart === true) {
      link.href = '/admin/content-agent/existing-content';
      link.textContent = 'Seite aktualisieren und erneut starten';
    } else {
      link.href = '/admin/content-agent/jobs';
      link.textContent = 'Jobs & Protokolle öffnen';
    }
    target.replaceChildren(link);
  }

  function updateRow(row, data) {
    var state = validStatusData(data);
    if (!state) return { valid: false, active: false };
    var active = activeStates.includes(state);
    row.setAttribute('data-state', state);
    row.setAttribute('data-active', active ? 'true' : 'false');
    setText(row, '[data-existing-content-optimization-label]', data.statusLabel);
    setText(row, '[data-existing-content-optimization-stage]', data.stageLabel);
    setText(row, '[data-existing-content-optimization-message]', data.message);
    replacePrimaryAction(row, data, state);
    return { valid: true, active: active };
  }

  function stopAfterInvalidStatus(row) {
    row.setAttribute('data-active', 'false');
    setText(
      row,
      '[data-existing-content-optimization-message]',
      'Die Statusantwort war ungültig. Die Aktualisierung wurde sicher beendet.'
    );
  }

  function stopAfterNetworkError(row) {
    row.setAttribute('data-active', 'false');
    setText(
      row,
      '[data-existing-content-optimization-message]',
      'Die Statusaktualisierung ist unterbrochen. Bitte lade die Seite später neu.'
    );
  }

  function startPolling(row) {
    var timer = null;
    var requestRunning = false;

    function schedule() {
      if (timer !== null) window.clearTimeout(timer);
      if (!document.contains(row)
          || !activeStates.includes(row.getAttribute('data-state'))) return;
      timer = window.setTimeout(requestStatus, 3000);
    }

    function requestStatus() {
      timer = null;
      if (requestRunning
          || !document.contains(row)
          || !activeStates.includes(row.getAttribute('data-state'))) return;
      var statusUrl = safeStatusUrl(row.getAttribute('data-status-url'));
      if (!statusUrl || typeof window.fetch !== 'function') {
        stopAfterNetworkError(row);
        return;
      }
      requestRunning = true;
      window.fetch(statusUrl, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
      }).then(function (response) {
        if (!response.ok) throw new Error('Status nicht verfügbar');
        return response.json();
      }).then(function (data) {
        requestRunning = false;
        if (!document.contains(row)) return;
        var result = updateRow(row, data);
        if (!result.valid) {
          stopAfterInvalidStatus(row);
          return;
        }
        if (result.active) schedule();
      }).catch(function () {
        requestRunning = false;
        if (document.contains(row)) stopAfterNetworkError(row);
      });
    }

    schedule();
  }

  document.querySelectorAll('[data-existing-content-optimization]').forEach(function (row) {
    if (activeStates.includes(row.getAttribute('data-state'))) startPolling(row);
  });
})();
