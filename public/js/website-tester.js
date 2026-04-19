(function () {
  const config = window.WEBSITE_TESTER_CONFIG || {};
  const locale = config.locale === 'en' ? 'en' : 'de';
  const endpoint = config.endpoint || '/api/website-audit';
  const leadEndpoint = config.leadEndpoint || '/api/website-audit/lead';
  const mode = config.mode || 'deep';
  const i18n = config.i18n || {};

  const form = document.querySelector('[data-website-tester-form]');
  if (!form) return;

  const input = form.querySelector('input[name="url"]');
  const businessTypeInput = form.querySelector('input[name="businessType"]');
  const primaryServiceInput = form.querySelector('input[name="primaryService"]');
  const targetRegionInput = form.querySelector('input[name="targetRegion"]');
  const loadingPanel = document.querySelector('[data-audit-loading]');
  const resultsPanel = document.querySelector('[data-audit-results]');
  const errorPanel = document.querySelector('[data-audit-error]');
  const resultAnchor = document.getElementById('website-tester-results');

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

  function trackEvent(eventName, payload) {
    try {
      if (typeof window.gtag !== 'function') return;
      window.gtag('event', eventName, payload || {});
    } catch (_err) {
      // ignore tracking errors
    }
  }

  function buildCtxUrl(href, result) {
    const utils = window.TesterUtils || {};
    const domain = typeof utils.extractDomain === 'function' ? utils.extractDomain(result || '') : '';
    const score = typeof utils.pickScore === 'function' ? utils.pickScore(result) : null;
    const ctx = { src: 'website-tester', domain, score };
    const targetHref = href || '/kontakt';
    if (/\/booking/i.test(targetHref) && typeof utils.buildBookingUrl === 'function') {
      return utils.buildBookingUrl(targetHref, ctx);
    }
    if (typeof utils.buildContactUrl === 'function') {
      return utils.buildContactUrl(targetHref, ctx);
    }
    return targetHref;
  }

  function renderPackageTeaser(result) {
    const utils = window.TesterUtils || {};
    if (typeof utils.buildPackageSuggestion !== 'function' || typeof utils.pickScore !== 'function') return '';
    const score = utils.pickScore(result);
    const pkg = utils.buildPackageSuggestion(score, locale);
    if (!pkg || !pkg.title) return '';
    return `
      <div class="wt-next-step-package" style="margin-top:0.65rem;">
        <strong>${escapeHtml(pkg.title)}</strong>
        <p>${escapeHtml(pkg.text || '')}</p>
        <a class="wt-button wt-button-secondary" data-tester-cta="website" data-tester-action="package" href="${escapeHtml(pkg.href || '/webdesign-berlin')}">${escapeHtml(pkg.label || (locale === 'en' ? 'View packages' : 'Pakete ansehen'))}</a>
      </div>`;
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

  function renderDetails(details) {
    return (details || []).map((detail) => `
      <div class="wt-detail">
        <div class="wt-detail-head">
          <strong>${escapeHtml(detail.label)}</strong>
          <span class="${detail.status === 'ok' ? 'wt-badge-ok' : 'wt-badge-warn'}">${detail.status === 'ok' ? 'OK' : 'Review'}</span>
        </div>
        <p>${escapeHtml(detail.explanation || '')}</p>
        <small>${escapeHtml(detail.value || '')}</small>
        ${detail.action ? `<small><strong>${escapeHtml(i18n.detailActionLabel || 'Empfehlung')}:</strong> ${escapeHtml(detail.action)}</small>` : ''}
      </div>
    `).join('');
  }

  function renderCategories(categories) {
    return (categories || []).map((category) => `
      <article class="wt-category-card">
        <header>
          <div>
            <h3><i class="fa-solid ${escapeHtml(category.icon || 'fa-chart-column')}" aria-hidden="true"></i> ${escapeHtml(category.title)}</h3>
            <p>${escapeHtml(category.summary || '')}</p>
          </div>
          <div>
            <div class="wt-category-score">${escapeHtml(category.score)}/100</div>
            <span class="wt-tag" data-tone="${escapeHtml(category.tone)}">${escapeHtml(category.badge)}</span>
          </div>
        </header>
        <div class="wt-details">${renderDetails(category.details)}</div>
      </article>
    `).join('');
  }

  function renderList(items, fallback) {
    if (!Array.isArray(items) || !items.length) return `<li>${escapeHtml(fallback)}</li>`;
    return items.map((item) => `
      <li><strong>${escapeHtml(item.category || '')}${item.label ? ` - ${escapeHtml(item.label)}` : ''}:</strong> ${escapeHtml(item.text || '')}</li>
    `).join('');
  }

  function renderFacts(facts) {
    const rows = [
      [i18n.contextBusiness || 'Branche', facts.businessType || 'n/a'],
      [i18n.contextService || 'Hauptleistung', facts.primaryService || 'n/a'],
      [i18n.contextRegion || 'Zielregion', facts.targetRegion || 'n/a'],
      ['Title', facts.title],
      ['Meta Description', facts.metaDescription],
      ['H1', facts.h1],
      ['Words', facts.words],
      ['Images', facts.images],
      ['Images without ALT', facts.imagesWithoutAlt],
      ['Scripts', facts.scripts],
      ['HTTPS', facts.usesHttps ? 'Yes' : 'No'],
      ['Schema.org', facts.hasSchema ? 'Yes' : 'No'],
      ['robots.txt', facts.hasRobots ? 'Yes' : 'No'],
      ['sitemap.xml', facts.hasSitemap ? 'Yes' : 'No'],
      ['HTML lang', facts.lang],
      ['Last-Modified', facts.lastModified],
      [i18n.legalRiskTitle || 'Abmahn-Risiko', facts.legalRiskLabel || 'n/a'],
      [i18n.trackingDetected || 'Tracking erkannt', facts.trackingDetected ? 'Yes' : 'No'],
      [i18n.consentSignal || 'Consent-Signal', facts.cookieBannerSignal || facts.consentSettingsSignal ? 'Yes' : 'No'],
      ['Pages crawled', `${facts.pagesCrawled}/${facts.crawlTarget}`],
      ['PSI', facts.psiAvailable ? (facts.psiPerformance + '/100') : 'n/a']
    ];

    return rows.map(([label, value]) => `
      <dt>${escapeHtml(label)}</dt>
      <dd>${escapeHtml(value)}</dd>
    `).join('');
  }

  function toneFromRisk(level) {
    if (level === 'high') return 'kritisch';
    if (level === 'medium') return 'mittel';
    return 'gut';
  }

  function renderScannedPages(scannedPages, failedTargets) {
    const pages = Array.isArray(scannedPages) ? scannedPages : [];
    const failed = Array.isArray(failedTargets) ? failedTargets : [];

    const pageItems = pages.length
      ? pages.map((entry, index) => `
          <li>
            <a href="${escapeHtml(entry.url || '#')}" target="_blank" rel="noopener nofollow">${escapeHtml(entry.url || '')}</a>
            ${entry.title ? `<small>${escapeHtml(entry.title)}</small>` : ''}
            <div class="wt-result-meta">
              <span class="wt-tag" data-tone="gut">#${escapeHtml(index + 1)}</span>
              <span class="wt-tag" data-tone="mittel">HTTP ${escapeHtml(entry.status ?? '-')}</span>
              <span class="wt-tag" data-tone="mittel">${escapeHtml(entry.loadTimeMs ?? '-')} ms</span>
              ${entry.source === 'legal_forced' ? `<span class="wt-tag" data-tone="kritisch">${escapeHtml(i18n.scannedLegalForced || 'Pflichtseiten-Check')}</span>` : ''}
              ${entry.legalType === 'impressum' ? `<span class="wt-tag" data-tone="mittel">${escapeHtml(i18n.legalImpressumTag || 'Impressum')}</span>` : ''}
              ${entry.legalType === 'privacy' ? `<span class="wt-tag" data-tone="mittel">${escapeHtml(i18n.legalPrivacyTag || 'Datenschutz')}</span>` : ''}
            </div>
          </li>
        `).join('')
      : `<li>${escapeHtml(i18n.noScannedPages || 'Es konnten keine Seiten geladen werden.')}</li>`;

    const failedItems = failed.length
      ? `
        <div class="wt-scan-failures">
          <h4>${escapeHtml(i18n.failedScansTitle || 'Nicht geladene Ziele')}</h4>
          <ul class="wt-priority-list">
            ${failed.map((entry) => `<li><strong>${escapeHtml(entry.url || '')}</strong>: ${escapeHtml(entry.message || '')}</li>`).join('')}
          </ul>
        </div>
      `
      : '';

    return `
      <section class="wt-sitefacts" style="margin-top:0.8rem;">
        <h3><i class="fa-solid fa-route"></i> ${escapeHtml(i18n.scannedPagesTitle || 'Für den Scan geladene Seiten')}</h3>
        <ul class="wt-priority-list wt-scanned-pages">${pageItems}</ul>
        ${failedItems}
      </section>
    `;
  }

  function renderScoringBreakdown(scoring) {
    if (!scoring || typeof scoring !== 'object') return '';
    const caps = Array.isArray(scoring.caps) ? scoring.caps : [];
    const penalties = Array.isArray(scoring.penalties) ? scoring.penalties : [];
    const capItems = caps.length
      ? caps.map((cap) => `<li><strong>${escapeHtml(cap.key || 'cap')}:</strong> ${escapeHtml(cap.reason || '')} (${escapeHtml(cap.maxScore)})${cap.applied ? ` - <em>${escapeHtml(i18n.capApplied || 'aktiv')}</em>` : ''}</li>`).join('')
      : `<li>${escapeHtml(i18n.noCaps || 'Keine Score-Caps aktiv.')}</li>`;
    const penaltyItems = penalties.length
      ? penalties.map((penalty) => `<li><strong>${escapeHtml(penalty.key || 'penalty')}:</strong> ${escapeHtml(penalty.reason || '')}</li>`).join('')
      : `<li>${escapeHtml(i18n.noPenalties || 'Keine aktiven Penalties.')}</li>`;

    return `
      <section class="wt-sitefacts" style="margin-top:0.8rem;">
        <h3><i class="fa-solid fa-calculator"></i> ${escapeHtml(i18n.scoreWhyTitle || 'Warum dieser Score?')}</h3>
        <dl>
          <dt>${escapeHtml(i18n.rawScore || 'Rohscore')}</dt><dd>${escapeHtml(scoring.rawScore)}</dd>
          <dt>${escapeHtml(i18n.finalScore || 'Finaler Score')}</dt><dd>${escapeHtml(scoring.finalScore)}</dd>
          <dt>${escapeHtml(i18n.scorePenalty || 'Abzug')}</dt><dd>${escapeHtml(scoring.penalty || 0)}</dd>
        </dl>
        <ul class="wt-priority-list" style="margin-top:0.55rem;">${capItems}</ul>
        <ul class="wt-priority-list" style="margin-top:0.55rem;">${penaltyItems}</ul>
      </section>
    `;
  }

  function renderLegalRisk(legalRisk) {
    if (!legalRisk || typeof legalRisk !== 'object') return '';
    const reasons = Array.isArray(legalRisk.reasons) ? legalRisk.reasons : [];
    const blockers = Array.isArray(legalRisk.blockers) ? legalRisk.blockers : [];
    return `
      <section class="wt-sitefacts" style="margin-top:0.8rem;">
        <h3><i class="fa-solid fa-scale-balanced"></i> ${escapeHtml(i18n.legalRiskTitle || 'Abmahn-Risiko')}</h3>
        <div class="wt-result-meta" style="margin-top:0.4rem;">
          <span class="wt-tag" data-tone="${escapeHtml(toneFromRisk(legalRisk.level))}">${escapeHtml(legalRisk.label || legalRisk.level || 'n/a')}</span>
          ${blockers.length ? `<span class="wt-tag" data-tone="kritisch">${escapeHtml(blockers.length)} ${escapeHtml(i18n.legalBlockers || 'Blocker')}</span>` : ''}
        </div>
        <ul class="wt-priority-list" style="margin-top:0.55rem;">
          ${reasons.length ? reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join('') : `<li>${escapeHtml(i18n.noLegalRiskReasons || 'Keine erhöhten Risikohinweise erkannt.')}</li>`}
        </ul>
      </section>
    `;
  }

  function bindCtaTracking(result) {
    const anchors = resultsPanel.querySelectorAll('[data-tester-cta]');
    anchors.forEach((anchor) => {
      anchor.addEventListener('click', () => {
        // Unified CTA schema: data-tester-cta = tester name (website|seo|geo|
        // meta|broken), data-tester-action = action (booking|contact|package|…).
        // For back-compat with older analytics that keyed on cta_type = action,
        // we keep emitting cta_type too.
        const testerName = anchor.getAttribute('data-tester-cta') || 'website';
        const action = anchor.getAttribute('data-tester-action') || testerName;
        trackEvent('tester_cta_clicked', {
          locale,
          score_bucket: result.scoreBand || 'unknown',
          tester: testerName,
          cta_type: action
        });
      }, { once: true });
    });
  }

  function bindLeadForm(result) {
    const leadForm = resultsPanel.querySelector('[data-tester-lead-form]');
    if (!leadForm) return;

    const submitBtn = leadForm.querySelector('button[type="submit"]');
    const stateBox = leadForm.querySelector('[data-tester-lead-state]');

    leadForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const email = String(leadForm.email?.value || '').trim();
      const name = String(leadForm.name?.value || '').trim();
      const consent = !!leadForm.consent?.checked;

      if (stateBox) {
        stateBox.hidden = true;
        stateBox.textContent = '';
        stateBox.classList.remove('is-error', 'is-success');
      }

      if (!consent) {
        if (stateBox) {
          stateBox.hidden = false;
          stateBox.classList.add('is-error');
          stateBox.textContent = i18n.leadErrorFallback || 'Die Report-Anfrage konnte nicht verarbeitet werden.';
        }
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.label = submitBtn.textContent;
        submitBtn.textContent = i18n.reportLoading || 'Wird gesendet...';
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
            email,
            name,
            locale,
            consent
          })
        });

        const payload = await response.json();
        if (!response.ok || !payload.success) {
          throw new Error(payload.message || i18n.leadErrorFallback || 'Die Report-Anfrage konnte nicht verarbeitet werden.');
        }

        if (stateBox) {
          stateBox.hidden = false;
          stateBox.classList.add('is-success');
          stateBox.textContent = payload.message || i18n.leadSuccessDefault || 'Bitte bestätige deine E-Mail-Adresse.';
        }

        trackEvent('tester_lead_requested', {
          locale,
          score_bucket: result.scoreBand || 'unknown'
        });

        leadForm.reset();
      } catch (error) {
        if (stateBox) {
          stateBox.hidden = false;
          stateBox.classList.add('is-error');
          stateBox.textContent = error.message || i18n.leadErrorFallback || 'Die Report-Anfrage konnte nicht verarbeitet werden.';
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = submitBtn.dataset.label || (i18n.reportSubmit || 'Bestätigungslink senden');
        }
      }
    });
  }

  function renderAuditResult(result) {
    const limitations = (result.limitations || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('');
    const crawlFacts = result.crawlStats || {};
    const relevance = result.relevance || {};

    resultsPanel.innerHTML = `
      <section class="wt-result-header">
        <div class="wt-score-ring" style="--score:${Math.max(0, Math.min(100, Number(result.overallScore) || 0))}">
          <div class="wt-score-content">
            <strong>${escapeHtml(result.overallScore)}</strong>
            <span>${escapeHtml(i18n.scoreOf || 'von 100')}</span>
          </div>
        </div>
        <div>
          <span class="wt-tag" data-tone="${escapeHtml(result.overallTone)}">${escapeHtml(result.overallBadge)}</span>
          <h2>${escapeHtml(i18n.auditFor || 'Analyse für')} ${escapeHtml(result.finalUrl)}</h2>
          <p class="wt-lead">${escapeHtml(result.summary || '')}</p>
          <div class="wt-result-meta">
            <span class="wt-tag" data-tone="gut">HTTP ${escapeHtml(result.httpStatus)}</span>
            <span class="wt-tag" data-tone="mittel">${escapeHtml(result.loadTimeMs)} ms</span>
            <span class="wt-tag" data-tone="mittel">${escapeHtml(crawlFacts.visitedPages || 0)}/${escapeHtml(crawlFacts.plannedPages || 6)} pages</span>
          </div>
          <ul class="wt-result-list">${renderList(result.strengths, i18n.noStrengths || 'Keine Stärken erkannt.')}</ul>
        </div>
      </section>

      <div class="wt-results-grid">
        <div class="wt-result-section">
          <h3><i class="fa-solid fa-chart-column"></i> ${escapeHtml(i18n.categoriesTitle || 'Kategorien')}</h3>
          <div class="wt-category-list">${renderCategories(result.categories)}</div>
        </div>
        <aside>
          ${renderLegalRisk(result.legalRisk)}
          <section class="wt-priorities">
            <h3><i class="fa-solid fa-triangle-exclamation"></i> ${escapeHtml(i18n.topFindingsTitle || 'Top Befunde')}</h3>
            <ul class="wt-priority-list">${renderList(result.topFindings, i18n.noFindings || 'Keine kritischen Befunde erkannt.')}</ul>
          </section>
          <section class="wt-priorities" style="margin-top:0.8rem;">
            <h3><i class="fa-solid fa-list-check"></i> ${escapeHtml(i18n.topActionsTitle || 'Top Maßnahmen')}</h3>
            <ul class="wt-priority-list">${renderList(result.topActions, i18n.noActions || 'Keine dringenden Maßnahmen erkannt.')}</ul>
          </section>
          <section class="wt-sitefacts" style="margin-top:0.8rem;">
            <h3><i class="fa-solid fa-table-list"></i> ${escapeHtml(i18n.factsTitle || 'Fakten')}</h3>
            <dl>${renderFacts(result.siteFacts || {})}</dl>
          </section>
          ${renderScannedPages(result.scannedPages, result.failedScanTargets)}
          <section class="wt-sitefacts" style="margin-top:0.8rem;">
            <h3><i class="fa-solid fa-bullseye"></i> ${escapeHtml(i18n.relevanceTitle || 'Relevanz-Scores')}</h3>
            <dl>
              <dt>${escapeHtml(i18n.seoGeoScore || 'SEO/GEO')}</dt><dd>${escapeHtml(relevance.seoGeoScore ?? 'n/a')}/100</dd>
              <dt>${escapeHtml(i18n.valueScore || 'Mehrwert')}</dt><dd>${escapeHtml(relevance.valueScore ?? 'n/a')}/100</dd>
              <dt>${escapeHtml(i18n.intentScore || 'Intent-Match')}</dt><dd>${escapeHtml(relevance.intentMatchScore ?? 'n/a')}/100</dd>
            </dl>
          </section>
          ${renderScoringBreakdown(result.scoring)}
          <section class="wt-sitefacts" style="margin-top:0.8rem;">
            <h3><i class="fa-solid fa-circle-info"></i> ${escapeHtml(i18n.limitationsTitle || 'Hinweise')}</h3>
            <ul class="wt-priority-list">${limitations}</ul>
          </section>
        </aside>
      </div>

      <section class="wt-cta-card">
        <h2>${escapeHtml(i18n.nextStepsTitle || 'Nächste Schritte')}</h2>
        <div class="wt-next-grid">
          <article class="wt-next-card">
            <h3>${escapeHtml(i18n.consultationTitle || 'Ergebnis gemeinsam priorisieren')}</h3>
            <p>${escapeHtml(i18n.consultationText || '')}</p>
            <a class="wt-button" data-tester-cta="website" data-tester-action="primary" href="${escapeHtml(buildCtxUrl(result.cta?.primaryHref || '/kontakt', result))}">
              ${escapeHtml(result.cta?.primaryLabel || i18n.consultationButton || 'Beratung buchen')}
            </a>
            ${renderPackageTeaser(result)}
          </article>

          <article class="wt-next-card">
            <h3>${escapeHtml(i18n.reportTitle || 'Detaillierten PDF-Optimierungsreport erhalten')}</h3>
            <p>${escapeHtml(i18n.reportText || '')}</p>
            <form class="wt-lead-form" data-tester-lead-form>
              <input type="text" name="name" placeholder="${escapeHtml(i18n.reportNamePlaceholder || 'Name (optional)')}" autocomplete="name">
              <input type="email" name="email" placeholder="${escapeHtml(i18n.reportEmailPlaceholder || 'E-Mail-Adresse')}" autocomplete="email" required>
              <label class="wt-lead-consent">
                <input type="checkbox" name="consent" required>
                <span>${escapeHtml(i18n.reportConsentLabel || 'Ich möchte den angeforderten PDF-Report per E-Mail erhalten.')}</span>
              </label>
              <small class="wt-lead-legal-note">
                <a href="${escapeHtml(i18n.privacyHref || '/datenschutz')}" target="_blank" rel="noopener">
                  ${escapeHtml(i18n.privacyLabel || 'Datenschutzerklärung')}
                </a>
              </small>
              <button class="wt-button" type="submit">${escapeHtml(i18n.reportSubmit || 'Bestätigungslink senden')}</button>
              <p class="wt-lead-state" data-tester-lead-state hidden></p>
            </form>
          </article>
        </div>
      </section>
    `;

    bindCtaTracking(result);
    bindLeadForm(result);
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
    }, 780);

    trackEvent('tester_started', {
      locale,
      mode
    });

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
          url: input.value,
          locale,
          mode,
          context
        })
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || i18n.errorFallback || 'Die Analyse konnte nicht durchgeführt werden.');
      }

      if (progressTimer) {
        window.clearInterval(progressTimer);
        progressTimer = null;
      }
      setProgress(progressItems.length);
      if (loadingPanel) loadingPanel.hidden = true;

      renderAuditResult(payload.result);
      trackEvent('tester_completed', {
        locale,
        mode,
        score_bucket: payload.result?.scoreBand || 'unknown',
        score_value: Number(payload.result?.overallScore) || 0
      });
    } catch (error) {
      if (loadingPanel) loadingPanel.hidden = true;
      if (errorPanel) {
        errorPanel.hidden = false;
        errorPanel.textContent = error.message || (i18n.errorFallback || 'Die Analyse konnte nicht durchgeführt werden.');
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
