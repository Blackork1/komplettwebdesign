(function () {
  const config = window.META_TESTER_CONFIG || {};
  const locale = config.locale === 'en' ? 'en' : 'de';
  const endpoint = config.endpoint || '/api/meta-audit';
  const leadEndpoint = config.leadEndpoint || '/api/meta-audit/lead';
  const i18n = config.i18n || {};

  const form = document.querySelector('[data-meta-tester-form]');
  if (!form) return;

  const urlInput = form.querySelector('input[name="url"]');
  const businessTypeInput = form.querySelector('input[name="businessType"]');
  const primaryServiceInput = form.querySelector('input[name="primaryService"]');
  const targetRegionInput = form.querySelector('input[name="targetRegion"]');

  const loadingPanel = document.querySelector('[data-meta-loading]');
  const errorPanel = document.querySelector('[data-meta-error]');
  const resultsPanel = document.querySelector('[data-meta-results]');
  const resultAnchor = document.getElementById('meta-results');

  const progressItems = loadingPanel ? Array.from(loadingPanel.querySelectorAll('[data-progress-item]')) : [];
  let progressTimer = null;

  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function toneToCssTone(tone) {
    const value = String(tone || '').toLowerCase();
    if (value === 'good' || value === 'gut') return 'gut';
    if (value === 'medium' || value === 'mittel') return 'mittel';
    return 'kritisch';
  }

  function toneForScore(score) {
    const safe = Number(score) || 0;
    if (safe >= 80) return 'gut';
    if (safe >= 55) return 'mittel';
    return 'kritisch';
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

  function renderChecks(checks) {
    const list = Array.isArray(checks) ? checks : [];
    if (!list.length) return `<li>${esc(i18n.noData || '-')}</li>`;

    const labelMap = i18n.checkLabelMap || {};

    return list.map((item) => {
      const label = labelMap[item.id] || item.label || item.id || '-';
      return `
        <li>
          <strong>${esc(label)}:</strong>
          <span class="wt-tag" data-tone="${esc(toneToCssTone(item.status))}">${esc(item.detail || '-')}</span>
        </li>
      `;
    }).join('');
  }

  function renderCategoryRows(items) {
    const list = Array.isArray(items) ? items : [];
    if (!list.length) return `<li>${esc(i18n.noData || '-')}</li>`;

    return list.map((item) => {
      const score = Number(item?.score) || 0;
      return `
        <li>
          <strong>${esc(item.title || item.id || '-')}:</strong>
          <span class="wt-tag" data-tone="${esc(toneForScore(score))}">${esc(score)}/100</span>
        </li>
      `;
    }).join('');
  }

  function renderSimpleList(items) {
    const list = Array.isArray(items) ? items : [];
    if (!list.length) return `<li>${esc(i18n.noData || '-')}</li>`;

    return list.map((item) => {
      if (typeof item === 'string') return `<li>${esc(item)}</li>`;
      return `<li><strong>${esc(item.label || '')}</strong>${item.text ? `: ${esc(item.text)}` : ''}</li>`;
    }).join('');
  }

  function renderLeadForm(result) {
    return `
      <section class="wt-cta-card">
        <h2>${esc(i18n.lockedTitle || '')}</h2>
        <p>${esc(i18n.lockedText || '')}</p>
        <form class="wt-lead-form" data-meta-lead-form>
          <input type="text" name="name" placeholder="${esc(i18n.leadName || 'Name (optional)')}" autocomplete="name">
          <input type="email" name="email" placeholder="${esc(i18n.leadEmail || 'E-Mail-Adresse')}" autocomplete="email" required>
          <label class="wt-lead-consent">
            <input type="checkbox" name="consent" required>
            <span>${esc(i18n.leadConsent || '')}</span>
          </label>
          <small class="wt-lead-legal-note">
            <a href="${esc(i18n.privacyHref || '/datenschutz')}" target="_blank" rel="noopener">${esc(i18n.privacyLabel || 'Datenschutz')}</a>
          </small>
          <button class="wt-button" type="submit">${esc(i18n.leadSubmit || 'Bestätigungslink senden')}</button>
          <p class="wt-lead-state" data-meta-lead-state hidden></p>
        </form>
      </section>

      <section class="wt-cta-card" style="margin-top:0.9rem;">
        <h2>${esc(i18n.ctaTitle || '')}</h2>
        <p>${esc(i18n.ctaText || '')}</p>
        <div class="wt-result-meta">
          <a class="wt-button" href="${esc(i18n.contactHref || '/kontakt')}">${esc(i18n.ctaPrimary || '')}</a>
          <a class="wt-button-secondary" href="/booking">${esc(i18n.ctaSecondary || '')}</a>
        </div>
      </section>
    `;
  }

  function bindLeadForm(result) {
    const leadForm = resultsPanel.querySelector('[data-meta-lead-form]');
    if (!leadForm) return;

    const stateBox = leadForm.querySelector('[data-meta-lead-state]');
    const submitBtn = leadForm.querySelector('button[type="submit"]');

    leadForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      if (stateBox) {
        stateBox.hidden = true;
        stateBox.textContent = '';
        stateBox.classList.remove('is-error', 'is-success');
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.label = submitBtn.textContent;
        submitBtn.textContent = i18n.leadLoading || 'Wird gesendet…';
      }

      try {
        const response = await fetch(leadEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify({
            auditId: result.auditId,
            email: String(leadForm.email?.value || '').trim(),
            name: String(leadForm.name?.value || '').trim(),
            consent: !!leadForm.consent?.checked,
            locale
          })
        });

        const payload = await response.json();
        if (!response.ok || !payload.success) {
          throw new Error(payload.message || i18n.leadError || 'Error');
        }

        if (stateBox) {
          stateBox.hidden = false;
          stateBox.classList.add('is-success');
          stateBox.textContent = payload.message || i18n.leadSuccess || '';
        }
        leadForm.reset();
      } catch (error) {
        if (stateBox) {
          stateBox.hidden = false;
          stateBox.classList.add('is-error');
          stateBox.textContent = error.message || i18n.leadError || 'Error';
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = submitBtn.dataset.label || (i18n.leadSubmit || 'Senden');
        }
      }
    });
  }

  function renderResult(result) {
    const homepage = result.homepage || {};
    const metaScore = result.metaScore || {};
    const crawl = result.crawlStats || {};
    const contextFit = homepage.contextFit || {};

    resultsPanel.innerHTML = `
      <section class="wt-result-header">
        <div class="wt-score-ring" style="--score:${Math.max(0, Math.min(100, Number(metaScore.overall) || 0))}">
          <div class="wt-score-content">
            <strong>${esc(metaScore.overall ?? 0)}</strong>
            <span>${esc(i18n.scoreOf || 'von 100')}</span>
          </div>
        </div>
        <div>
          <span class="wt-tag" data-tone="${esc(toneToCssTone(metaScore.tone))}">${esc(metaScore.badge || '')}</span>
          <h2>${esc(i18n.metaAuditFor || 'Meta-Analyse für')} ${esc(result.finalUrl || '')}</h2>
          <div class="wt-result-meta">
            <span class="wt-tag" data-tone="mittel">${esc(i18n.modeLabel || 'Umfang')}: 1 + ${esc(Math.max(0, Number(crawl.requestedPages) || 0))}</span>
            <span class="wt-tag" data-tone="mittel">${esc(i18n.scannedPages || 'Gescannten Seiten')}: ${esc(crawl.visitedPages ?? 0)}</span>
            <span class="wt-tag" data-tone="${esc(toneForScore(contextFit.score || 0))}">${esc(i18n.contextFitTitle || 'Kontext-Fit')}: ${esc(contextFit.score || 0)}/100</span>
          </div>
        </div>
      </section>

      <div class="wt-results-grid">
        <div class="wt-result-section">
          <section class="wt-priorities">
            <h3><i class="fa-solid fa-list-check"></i> ${esc(i18n.checkOverview || 'Head-Checks')}</h3>
            <ul class="wt-priority-list">${renderChecks(homepage.checks || [])}</ul>
          </section>

          <section class="wt-priorities" style="margin-top:0.9rem;">
            <h3><i class="fa-solid fa-bug"></i> ${esc(i18n.findingsTitle || 'Befunde')}</h3>
            <ul class="wt-priority-list">${renderSimpleList(result.topFindings || homepage.topFindings || [])}</ul>
          </section>
        </div>

        <aside>
          <section class="wt-priorities">
            <h3><i class="fa-solid fa-chart-simple"></i> ${esc(i18n.categoryScoresTitle || 'Meta-Kategorien')}</h3>
            <ul class="wt-priority-list">${renderCategoryRows(result.categories || homepage.categories || [])}</ul>
          </section>

          <section class="wt-priorities" style="margin-top:0.9rem;">
            <h3><i class="fa-solid fa-bullseye"></i> ${esc(i18n.contextFitTitle || 'Branchen-/Regions-Fit')}</h3>
            <p style="margin-top:0.55rem;">${esc(i18n.contextFitDetails || '')}</p>
            <ul class="wt-priority-list">
              <li><strong>Title:</strong> <span class="wt-tag" data-tone="${esc(toneForScore(contextFit.titleCoverage || 0))}">${esc(contextFit.titleCoverage || 0)}%</span></li>
              <li><strong>Description:</strong> <span class="wt-tag" data-tone="${esc(toneForScore(contextFit.descriptionCoverage || 0))}">${esc(contextFit.descriptionCoverage || 0)}%</span></li>
              <li><strong>H1:</strong> <span class="wt-tag" data-tone="${esc(toneForScore(contextFit.h1Coverage || 0))}">${esc(contextFit.h1Coverage || 0)}%</span></li>
            </ul>
          </section>

          <section class="wt-priorities" style="margin-top:0.9rem;">
            <h3><i class="fa-solid fa-wrench"></i> ${esc(i18n.recommendationsTitle || 'Maßnahmen')}</h3>
            <ul class="wt-priority-list">${renderSimpleList(homepage.recommendations || result.topActions || [])}</ul>
          </section>
        </aside>
      </div>

      ${renderLeadForm(result)}
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
        throw new Error(payload.message || i18n.errorFallback || 'Audit failed');
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
        errorPanel.textContent = error.message || i18n.errorFallback || 'Error';
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
