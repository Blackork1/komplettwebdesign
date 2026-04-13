(function () {
  const config = window.GEO_TESTER_CONFIG || {};
  const locale = config.locale === 'en' ? 'en' : 'de';
  const endpoint = config.endpoint || '/api/geo-audit';
  const leadEndpoint = config.leadEndpoint || '/api/geo-audit/lead';
  const i18n = config.i18n || {};

  const form = document.querySelector('[data-geo-tester-form]');
  if (!form) return;

  const urlInput = form.querySelector('input[name="url"]');
  const businessTypeInput = form.querySelector('input[name="businessType"]');
  const primaryServiceInput = form.querySelector('input[name="primaryService"]');
  const targetRegionInput = form.querySelector('input[name="targetRegion"]');
  const loadingPanel = document.querySelector('[data-geo-loading]');
  const resultsPanel = document.querySelector('[data-geo-results]');
  const errorPanel = document.querySelector('[data-geo-error]');
  const resultAnchor = document.getElementById('geo-results');

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

  function renderSignalRow(label, signal) {
    const score = Number.isFinite(signal?.score) ? signal.score : 0;
    const tone = score >= 75 ? 'gut' : (score >= 45 ? 'mittel' : 'kritisch');
    return `
      <li>
        <strong>${escapeHtml(label)}:</strong>
        <span class="wt-tag" data-tone="${tone}">${escapeHtml(score)}/100</span>
      </li>
    `;
  }

  function renderPotentials(items) {
    if (!Array.isArray(items) || !items.length) {
      return `<li>${escapeHtml(i18n.noPotentials || 'Es wurden noch keine spezifischen Potenzialbereiche erkannt.')}</li>`;
    }
    return items.map((item) => `<li><strong>${escapeHtml(item.category || '')}</strong>: ${escapeHtml(item.label || '')}</li>`).join('');
  }

  function bindLeadForm(result) {
    const leadForm = resultsPanel.querySelector('[data-geo-lead-form]');
    if (!leadForm) return;

    const submitBtn = leadForm.querySelector('button[type="submit"]');
    const stateBox = leadForm.querySelector('[data-geo-lead-state]');

    leadForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      if (stateBox) {
        stateBox.hidden = true;
        stateBox.textContent = '';
        stateBox.classList.remove('is-error', 'is-success');
      }

      const payload = {
        auditId: result.auditId,
        email: String(leadForm.email?.value || '').trim(),
        name: String(leadForm.name?.value || '').trim(),
        locale,
        consent: !!leadForm.consent?.checked
      };

      if (!payload.consent) {
        if (stateBox) {
          stateBox.hidden = false;
          stateBox.classList.add('is-error');
          stateBox.textContent = i18n.leadError || 'Die GEO-Report-Anfrage konnte nicht verarbeitet werden.';
        }
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.label = submitBtn.textContent;
        submitBtn.textContent = i18n.leadLoading || 'Wird gesendet...';
      }

      try {
        const response = await fetch(leadEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || i18n.leadError || 'Die GEO-Report-Anfrage konnte nicht verarbeitet werden.');
        }

        if (stateBox) {
          stateBox.hidden = false;
          stateBox.classList.add('is-success');
          stateBox.textContent = data.message || i18n.leadSuccess || '';
        }
        leadForm.reset();
      } catch (error) {
        if (stateBox) {
          stateBox.hidden = false;
          stateBox.classList.add('is-error');
          stateBox.textContent = error.message || i18n.leadError || 'Die GEO-Report-Anfrage konnte nicht verarbeitet werden.';
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = submitBtn.dataset.label || (i18n.leadSubmit || 'Bestätigungslink senden');
        }
      }
    });
  }

  function renderResult(result) {
    const crawl = result.crawlStats || {};
    const score = result.geoScore || {};
    const signals = result.geoSignals || {};
    const potential = result.potentialSummary || {};

    resultsPanel.innerHTML = `
      <section class="wt-result-header">
        <div class="wt-score-ring" style="--score:${Math.max(0, Math.min(100, Number(score.overall) || 0))}">
          <div class="wt-score-content">
            <strong>${escapeHtml(score.overall ?? 0)}</strong>
            <span>${escapeHtml(i18n.scoreOf || 'von 100')}</span>
          </div>
        </div>
        <div>
          <span class="wt-tag" data-tone="${escapeHtml(score.band || 'mittel')}">${escapeHtml(score.badge || score.band || '')}</span>
          <h2>${escapeHtml(i18n.geoAuditFor || 'GEO-Analyse für')} ${escapeHtml(result.finalUrl || '')}</h2>
          <div class="wt-result-meta">
            <span class="wt-tag" data-tone="mittel">${escapeHtml(i18n.modeLabel || 'Modus')}: ${escapeHtml(result.scanMode || '-')}</span>
            <span class="wt-tag" data-tone="mittel">${escapeHtml(i18n.scannedPages || 'Gescannten Seiten')}: ${escapeHtml(crawl.visitedPages ?? 0)}/${escapeHtml(crawl.plannedPages ?? 0)}</span>
            ${crawl.partial ? `<span class="wt-tag" data-tone="mittel">${escapeHtml(i18n.partialResult || 'Teil-Ergebnis')}</span>` : ''}
            ${crawl.timeoutReached ? `<span class="wt-tag" data-tone="kritisch">${escapeHtml(i18n.timeoutReached || 'Zeitlimit erreicht')}</span>` : ''}
          </div>
        </div>
      </section>

      <div class="wt-results-grid">
        <div class="wt-result-section">
          <section class="wt-priorities">
            <h3><i class="fa-solid fa-chart-line"></i> ${escapeHtml(i18n.geoSignalsTitle || 'GEO-Signale')}</h3>
            <ul class="wt-priority-list">
              ${renderSignalRow(i18n.signalEntity || 'Entity / Schema', signals.entitySchema)}
              ${renderSignalRow(i18n.signalIntent || 'Intent-Kohärenz', signals.intentCoherence)}
              ${renderSignalRow(i18n.signalSnippet || 'FAQ / Snippet-Readiness', signals.faqSnippetReadiness)}
              ${renderSignalRow(i18n.signalTrust || 'Trust / Citations', signals.trustCitations)}
              ${renderSignalRow(i18n.signalInternal || 'Interne Verlinkung', signals.internalLinking)}
            </ul>
          </section>
        </div>
        <aside>
          <section class="wt-priorities">
            <h3><i class="fa-solid fa-bullseye"></i> ${escapeHtml(i18n.potentialTitle || 'Optimierungspotenzial')}</h3>
            <p style="margin-top:0.55rem;">${escapeHtml(potential.headline || '')}</p>
            <p>${escapeHtml(potential.text || '')}</p>
            <h4 style="margin:0.75rem 0 0.35rem;">${escapeHtml(i18n.topPotentials || 'Top-Potenzialbereiche')}</h4>
            <ul class="wt-priority-list">${renderPotentials(potential.topPotentials)}</ul>
          </section>
        </aside>
      </div>

      <section class="wt-cta-card">
        <h2>${escapeHtml(i18n.lockedTitle || 'Detaillierter GEO-Umsetzungsreport')}</h2>
        <p>${escapeHtml(i18n.lockedText || '')}</p>
        <form class="wt-lead-form" data-geo-lead-form>
          <input type="text" name="name" placeholder="${escapeHtml(i18n.leadName || 'Name (optional)')}" autocomplete="name">
          <input type="email" name="email" placeholder="${escapeHtml(i18n.leadEmail || 'E-Mail-Adresse')}" autocomplete="email" required>
          <label class="wt-lead-consent">
            <input type="checkbox" name="consent" required>
            <span>${escapeHtml(i18n.leadConsent || '')}</span>
          </label>
          <button class="wt-button" type="submit">${escapeHtml(i18n.leadSubmit || 'Bestätigungslink senden')}</button>
          <p class="wt-lead-state" data-geo-lead-state hidden></p>
        </form>
      </section>
    `;

    resultsPanel.hidden = false;
    bindLeadForm(result);
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
    let step = 0;
    setProgress(step);
    progressTimer = window.setInterval(() => {
      step = Math.min(step + 1, progressItems.length - 1);
      setProgress(step);
    }, 850);

    try {
      const context = {
        businessType: String(businessTypeInput?.value || '').trim(),
        primaryService: String(primaryServiceInput?.value || '').trim(),
        targetRegion: String(targetRegionInput?.value || '').trim()
      };

      if (!context.businessType || !context.primaryService || !context.targetRegion) {
        throw new Error(i18n.contextRequired || 'Bitte ergänze Branche, Hauptleistung und Zielregion.');
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          url: String(urlInput?.value || '').trim(),
          locale,
          context
        })
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || i18n.errorFallback || 'Das GEO-Audit konnte nicht durchgeführt werden.');
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
        errorPanel.textContent = error.message || i18n.errorFallback || 'Das GEO-Audit konnte nicht durchgeführt werden.';
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
