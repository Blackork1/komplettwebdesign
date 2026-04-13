(function () {
  const config = window.BROKEN_LINK_TESTER_CONFIG || {};
  const locale = config.locale === 'en' ? 'en' : 'de';
  const endpoint = config.endpoint || '/api/broken-link-audit';
  const i18n = config.i18n || {};

  const form = document.querySelector('[data-broken-links-form]');
  if (!form) return;

  const input = form.querySelector('input[name="url"]');
  const loadingPanel = document.querySelector('[data-broken-links-loading]');
  const resultsPanel = document.querySelector('[data-broken-links-results]');
  const errorPanel = document.querySelector('[data-broken-links-error]');
  const resultAnchor = document.getElementById('broken-links-results');

  const progressItems = loadingPanel ? Array.from(loadingPanel.querySelectorAll('[data-progress-item]')) : [];
  let progressTimer = null;

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function setProgress(step) {
    progressItems.forEach((item, index) => {
      item.classList.toggle('is-active', index === step);
      item.classList.toggle('is-done', index < step);
      const icon = item.querySelector('i');
      if (!icon) return;
      icon.className = index < step
        ? 'fa-solid fa-circle-check'
        : index === step
          ? 'fa-solid fa-spinner fa-spin'
          : 'fa-regular fa-circle';
    });
  }

  function resetPanels() {
    if (errorPanel) {
      errorPanel.hidden = true;
      errorPanel.textContent = '';
    }
    if (resultsPanel) {
      resultsPanel.hidden = true;
      resultsPanel.innerHTML = '';
    }
  }

  function toneForCount(value) {
    if (!Number.isFinite(value) || value <= 0) return 'gut';
    if (value < 5) return 'mittel';
    return 'kritisch';
  }

  function renderTableRows(items) {
    return items.map((item) => `
      <tr>
        <td><span class="text-break">${escapeHtml(item.sourceUrl || '-')}</span></td>
        <td><span class="text-break">${escapeHtml(item.targetUrl || '-')}</span></td>
        <td>${escapeHtml(item.targetType || '-')}</td>
        <td>${escapeHtml(Number.isFinite(item.status) ? item.status : '-')}</td>
        <td>${escapeHtml(item.error || '-')}</td>
      </tr>
    `).join('');
  }

  function renderDetailsTable(title, items, emptyText) {
    const rows = Array.isArray(items) && items.length
      ? renderTableRows(items)
      : `<tr><td colspan="5">${escapeHtml(emptyText)}</td></tr>`;

    return `
      <section class="wt-sitefacts" style="margin-top:0.8rem;">
        <h3><i class="fa-solid fa-table-list"></i> ${escapeHtml(title)}</h3>
        <div class="bl-table-wrap">
          <table class="bl-table">
            <thead>
              <tr>
                <th>${escapeHtml(i18n.sourcePage || 'Quellseite')}</th>
                <th>${escapeHtml(i18n.targetUrl || 'Ziel-URL')}</th>
                <th>${escapeHtml(i18n.type || 'Typ')}</th>
                <th>${escapeHtml(i18n.status || 'Status')}</th>
                <th>${escapeHtml(i18n.error || 'Fehler')}</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </section>
    `;
  }

  function renderLimitations(limitations) {
    if (!Array.isArray(limitations) || !limitations.length) return '';
    return `
      <section class="wt-sitefacts" style="margin-top:0.8rem;">
        <h3><i class="fa-solid fa-circle-info"></i> ${escapeHtml(i18n.limitations || 'Hinweise')}</h3>
        <ul class="wt-priority-list">${limitations.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      </section>
    `;
  }

  function renderScannedPages(result) {
    const pages = Array.isArray(result.scannedPages) ? result.scannedPages : [];
    const failures = Array.isArray(result.failedScanTargets) ? result.failedScanTargets : [];

    const pageItems = pages.length
      ? pages.map((item) => `
          <li>
            <a href="${escapeHtml(item.url || '#')}" target="_blank" rel="noopener nofollow">${escapeHtml(item.url || '')}</a>
            <div class="wt-result-meta">
              <span class="wt-tag" data-tone="mittel">HTTP ${escapeHtml(item.status ?? '-')}</span>
              <span class="wt-tag" data-tone="mittel">${escapeHtml(item.loadTimeMs ?? '-')} ms</span>
            </div>
          </li>
        `).join('')
      : '<li>-</li>';

    const failureItems = failures.length
      ? `
        <h4 style="margin-top:0.9rem;">${escapeHtml(i18n.crawlFailed || 'Crawl-Fehler')}</h4>
        <ul class="wt-priority-list">
          ${failures.map((entry) => `<li><strong>${escapeHtml(entry.url || '')}</strong>: ${escapeHtml(entry.message || '')}</li>`).join('')}
        </ul>
      `
      : '';

    return `
      <section class="wt-sitefacts" style="margin-top:0.8rem;">
        <h3><i class="fa-solid fa-route"></i> ${escapeHtml(i18n.scannedPages || 'Gescannten Seiten')}</h3>
        <ul class="wt-priority-list">${pageItems}</ul>
        ${failureItems}
      </section>
    `;
  }

  function renderResult(result) {
    const crawl = result.crawlStats || {};
    const stats = result.linkStats || {};

    resultsPanel.innerHTML = `
      <section class="wt-result-header">
        <div>
          <span class="wt-tag" data-tone="${crawl.partial ? 'mittel' : 'gut'}">${crawl.partial ? escapeHtml(i18n.partialResult || 'Teil-Ergebnis') : 'OK'}</span>
          <h2>${escapeHtml(i18n.scanFor || 'Scan für')} ${escapeHtml(result.finalUrl || result.normalizedUrl || '')}</h2>
          <div class="wt-result-meta">
            <span class="wt-tag" data-tone="mittel">${escapeHtml(i18n.modeLabel || 'Modus')}: ${escapeHtml(result.scanMode || '-')}</span>
            <span class="wt-tag" data-tone="mittel">${escapeHtml(crawl.visitedPages ?? 0)}/${escapeHtml(crawl.plannedPages ?? 0)} Pages</span>
            ${crawl.timeoutReached ? '<span class="wt-tag" data-tone="kritisch">Timeout</span>' : ''}
          </div>
        </div>
      </section>

      <div class="bl-meta-grid" style="margin-top:0.8rem;">
        <section class="wt-sitefacts">
          <h3><i class="fa-solid fa-chart-column"></i> ${escapeHtml(i18n.checkedLinks || 'Geprüfte Links')}</h3>
          <dl>
            <dt>${escapeHtml(i18n.checkedLinks || 'Geprüfte Links')}</dt><dd>${escapeHtml(stats.totalChecked ?? 0)}</dd>
            <dt>${escapeHtml(i18n.brokenLinks || 'Broken Links')}</dt><dd>${escapeHtml(stats.brokenCount ?? 0)}</dd>
            <dt>${escapeHtml(i18n.warnings || 'Warnings')}</dt><dd>${escapeHtml(stats.warningCount ?? 0)}</dd>
            <dt>${escapeHtml(i18n.okLinks || 'OK Links')}</dt><dd>${escapeHtml(stats.okCount ?? 0)}</dd>
          </dl>
        </section>

        <section class="wt-sitefacts">
          <h3><i class="fa-solid fa-traffic-light"></i> Status</h3>
          <div class="wt-result-meta" style="margin-top:0.4rem;">
            <span class="wt-tag" data-tone="${toneForCount(stats.brokenCount)}">${escapeHtml(i18n.brokenLinks || 'Broken Links')}: ${escapeHtml(stats.brokenCount ?? 0)}</span>
            <span class="wt-tag" data-tone="${toneForCount(stats.warningCount)}">${escapeHtml(i18n.warnings || 'Warnings')}: ${escapeHtml(stats.warningCount ?? 0)}</span>
          </div>
        </section>
      </div>

      ${renderScannedPages(result)}
      ${renderLimitations(result.limitations)}
      ${renderDetailsTable(i18n.brokenListTitle || 'Broken-Links Details', result.brokenLinks || [], i18n.noBroken || 'Keine defekten Links gefunden.')}
      ${renderDetailsTable(i18n.warningsListTitle || 'Warnings Details', result.warnings || [], i18n.noWarnings || 'Keine Warnungen gefunden.')}
    `;

    resultsPanel.hidden = false;
    resultAnchor?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    resetPanels();

    if (progressTimer) {
      window.clearInterval(progressTimer);
      progressTimer = null;
    }

    if (loadingPanel) loadingPanel.hidden = false;
    let currentStep = 0;
    setProgress(currentStep);
    progressTimer = window.setInterval(() => {
      currentStep = Math.min(currentStep + 1, progressItems.length - 1);
      setProgress(currentStep);
    }, 900);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          url: String(input?.value || '').trim(),
          locale
        })
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || i18n.errorFallback || 'Der Scan konnte nicht durchgeführt werden.');
      }

      if (progressTimer) {
        window.clearInterval(progressTimer);
        progressTimer = null;
      }
      setProgress(progressItems.length);
      if (loadingPanel) loadingPanel.hidden = true;

      renderResult(payload.result || {});
    } catch (error) {
      if (loadingPanel) loadingPanel.hidden = true;
      if (errorPanel) {
        errorPanel.hidden = false;
        errorPanel.textContent = error.message || i18n.errorFallback || 'Der Scan konnte nicht durchgeführt werden.';
      }
    } finally {
      if (progressTimer) {
        window.clearInterval(progressTimer);
        progressTimer = null;
      }
    }
  }

  form.addEventListener('submit', handleSubmit);
})();
