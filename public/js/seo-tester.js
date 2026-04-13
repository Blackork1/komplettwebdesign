(function () {
  const config = window.SEO_TESTER_CONFIG || {};
  const locale = config.locale === 'en' ? 'en' : 'de';
  const endpoint = config.endpoint || '/api/seo-audit';
  const leadEndpoint = config.leadEndpoint || '/api/seo-audit/lead';
  const i18n = config.i18n || {};

  const form = document.querySelector('[data-seo-tester-form]');
  if (!form) return;

  const urlInput = form.querySelector('input[name="url"]');
  const businessTypeInput = form.querySelector('input[name="businessType"]');
  const primaryServiceInput = form.querySelector('input[name="primaryService"]');
  const targetRegionInput = form.querySelector('input[name="targetRegion"]');
  const loadingPanel = document.querySelector('[data-seo-loading]');
  const resultsPanel = document.querySelector('[data-seo-results]');
  const errorPanel = document.querySelector('[data-seo-error]');
  const resultAnchor = document.getElementById('seo-results');

  const progressItems = loadingPanel ? Array.from(loadingPanel.querySelectorAll('[data-progress-item]')) : [];
  let progressTimer = null;

  function trackEvent(name, payload) {
    try {
      if (typeof window.gtag !== 'function') return;
      window.gtag('event', name, payload || {});
    } catch (_error) {
      // ignore
    }
  }

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

  function toneForScore(score) {
    const safe = Number.isFinite(score) ? score : 0;
    if (safe >= 75) return 'gut';
    if (safe >= 45) return 'mittel';
    return 'kritisch';
  }

  function labelForCategory(id) {
    const map = i18n.categoryLabels || {};
    return map[id] || id;
  }

  function renderCategoryRows(items) {
    if (!Array.isArray(items) || !items.length) {
      return `<li>${escapeHtml(i18n.noCategories || '-')}</li>`;
    }

    return items.map((item) => {
      const score = Number.isFinite(item?.score) ? item.score : 0;
      return `
        <li>
          <strong>${escapeHtml(labelForCategory(item.id || ''))}:</strong>
          <span class="wt-tag" data-tone="${escapeHtml(toneForScore(score))}">${escapeHtml(score)}/100</span>
        </li>
      `;
    }).join('');
  }

  function renderPotentialAreas(items) {
    if (!Array.isArray(items) || !items.length) {
      return `<li>${escapeHtml(i18n.noPotentials || '-')}</li>`;
    }
    return items.map((entry) => `<li>${escapeHtml(entry)}</li>`).join('');
  }

  function bindLeadForm(result) {
    const leadForm = resultsPanel.querySelector('[data-seo-lead-form]');
    if (!leadForm) return;

    const submitBtn = leadForm.querySelector('button[type="submit"]');
    const stateBox = leadForm.querySelector('[data-seo-lead-state]');

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
          stateBox.textContent = i18n.leadError || 'Die SEO-Report-Anfrage konnte nicht verarbeitet werden.';
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
          throw new Error(data.message || i18n.leadError || 'Die SEO-Report-Anfrage konnte nicht verarbeitet werden.');
        }

        if (stateBox) {
          stateBox.hidden = false;
          stateBox.classList.add('is-success');
          stateBox.textContent = data.message || i18n.leadSuccess || '';
        }

        trackEvent('seo_tester_lead_requested', {
          locale,
          score_bucket: result?.seoScore?.band || 'unknown'
        });
        leadForm.reset();
      } catch (error) {
        if (stateBox) {
          stateBox.hidden = false;
          stateBox.classList.add('is-error');
          stateBox.textContent = error.message || i18n.leadError || 'Die SEO-Report-Anfrage konnte nicht verarbeitet werden.';
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = submitBtn.dataset.label || (i18n.leadSubmit || 'Bestätigungslink senden');
        }
      }
    });
  }

  function bindCtaTracking(result) {
    const links = resultsPanel.querySelectorAll('[data-seo-cta]');
    links.forEach((anchor) => {
      anchor.addEventListener('click', function onClick() {
        trackEvent('seo_tester_cta_clicked', {
          locale,
          score_bucket: result?.seoScore?.band || 'unknown',
          cta_type: anchor.getAttribute('data-seo-cta') || 'unknown'
        });
      }, { once: true });
    });
  }

  function renderResult(result) {
    const crawl = result.crawlStats || {};
    const score = result.seoScore || {};
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
          <h2>${escapeHtml(i18n.seoAuditFor || 'SEO-Analyse für')} ${escapeHtml(result.finalUrl || '')}</h2>
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
            <h3><i class="fa-solid fa-chart-column"></i> ${escapeHtml(i18n.categoryScoresTitle || 'SEO-Kategorien')}</h3>
            <ul class="wt-priority-list">
              ${renderCategoryRows(result.categoryScores || [])}
            </ul>
          </section>
        </div>
        <aside>
          <section class="wt-priorities">
            <h3><i class="fa-solid fa-bullseye"></i> ${escapeHtml(i18n.potentialTitle || 'Optimierungspotenzial')}</h3>
            <p style="margin-top:0.55rem;">${escapeHtml(potential.headline || '')}</p>
            <p>${escapeHtml(potential.text || '')}</p>
            <h4 style="margin:0.75rem 0 0.35rem;">${escapeHtml(i18n.topPotentialAreasTitle || 'Top-Potenzialbereiche')}</h4>
            <ul class="wt-priority-list">${renderPotentialAreas(potential.topPotentialAreas || [])}</ul>
          </section>
        </aside>
      </div>

      <section class="wt-cta-card">
        <h2>${escapeHtml(i18n.lockedTitle || 'Detaillierter SEO-Umsetzungsreport')}</h2>
        <p>${escapeHtml(i18n.lockedText || '')}</p>
        <form class="wt-lead-form" data-seo-lead-form>
          <input type="text" name="name" placeholder="${escapeHtml(i18n.leadName || 'Name (optional)')}" autocomplete="name">
          <input type="email" name="email" placeholder="${escapeHtml(i18n.leadEmail || 'E-Mail-Adresse')}" autocomplete="email" required>
          <label class="wt-lead-consent">
            <input type="checkbox" name="consent" required>
            <span>${escapeHtml(i18n.leadConsent || '')}</span>
          </label>
          <button class="wt-button" type="submit">${escapeHtml(i18n.leadSubmit || 'Bestätigungslink senden')}</button>
          <p class="wt-lead-state" data-seo-lead-state hidden></p>
        </form>
      </section>

      <section class="wt-cta-card" style="margin-top:0.9rem;">
        <h2>${escapeHtml(i18n.ctaTitle || 'SEO-Befunde direkt in Ergebnisse verwandeln')}</h2>
        <p>${escapeHtml(i18n.ctaText || '')}</p>
        <div class="wt-result-meta">
          <a class="wt-button" href="${escapeHtml(i18n.contactHref || '/kontakt')}" data-seo-cta="primary">${escapeHtml(i18n.ctaPrimary || 'Beratung anfragen')}</a>
          <a class="wt-button-secondary" href="/booking" data-seo-cta="secondary">${escapeHtml(i18n.ctaSecondary || 'Termin buchen')}</a>
        </div>
      </section>
    `;

    resultsPanel.hidden = false;
    bindLeadForm(result);
    bindCtaTracking(result);
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
        throw new Error(payload.message || i18n.errorFallback || 'Das SEO-Audit konnte nicht durchgeführt werden.');
      }

      if (progressTimer) {
        window.clearInterval(progressTimer);
        progressTimer = null;
      }
      setProgress(progressItems.length);
      if (loadingPanel) loadingPanel.hidden = true;

      trackEvent('seo_tester_scan_completed', {
        locale,
        score_bucket: payload?.result?.seoScore?.band || 'unknown'
      });

      renderResult(payload.result || {});
    } catch (error) {
      if (loadingPanel) loadingPanel.hidden = true;
      if (errorPanel) {
        errorPanel.hidden = false;
        errorPanel.textContent = error.message || i18n.errorFallback || 'Das SEO-Audit konnte nicht durchgeführt werden.';
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

