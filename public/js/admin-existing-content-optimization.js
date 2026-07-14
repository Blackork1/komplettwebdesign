(function () {
  'use strict';

  var activeStates = ['queued', 'running'];
  var terminalStates = ['completed', 'failed', 'manual_attention'];

  function knownState(value) {
    if (activeStates.includes(value) || terminalStates.includes(value)) return value;
    return null;
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
    var state = knownState(data && data.state);
    if (!state) return false;
    var active = activeStates.includes(state) && data.active === true;
    row.setAttribute('data-state', state);
    row.setAttribute('data-active', active ? 'true' : 'false');
    setText(row, '[data-existing-content-optimization-label]', data.statusLabel);
    setText(row, '[data-existing-content-optimization-stage]', data.stageLabel);
    setText(row, '[data-existing-content-optimization-message]', data.message);
    replacePrimaryAction(row, data, state);
    return active;
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
        if (document.contains(row) && updateRow(row, data)) schedule();
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
