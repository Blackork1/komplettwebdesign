(function () {
  const config = window.BROKEN_LINK_TESTER_CONFIG || {};
  const locale = config.locale === 'en' ? 'en' : 'de';
  const endpoint = config.endpoint || '/api/broken-link-audit';
  const leadEndpoint = config.leadEndpoint || '/api/broken-link-audit/lead';
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

  function trackEvent(name, data) {
    try {
      if (typeof window.gtag === 'function') window.gtag('event', name, data || {});
    } catch (_e) { /* ignore */ }
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

  function renderNextStepCard(result) {
    const utils = window.TesterUtils || {};
    const stats = result.linkStats || {};
    // Score approximation: 100 if clean, reduce by broken & warnings
    const broken = Number(stats.brokenCount) || 0;
    const warns = Number(stats.warningCount) || 0;
    const total = Number(stats.totalChecked) || 0;
    let score = null;
    if (total > 0) {
      const ratio = Math.min(1, (broken * 3 + warns) / Math.max(1, total));
      score = Math.max(0, Math.round(100 - ratio * 100));
    }
    const domain = typeof utils.extractDomain === 'function' ? utils.extractDomain(result || '') : '';
    const bookingBase = (i18n.bookingHref || (locale === 'en' ? '/en/booking' : '/booking'));
    const contactBase = (i18n.contactHref || (locale === 'en' ? '/en/kontakt' : '/kontakt'));
    const bookingUrl = typeof utils.buildBookingUrl === 'function'
      ? utils.buildBookingUrl(bookingBase, { src: 'broken-links-tester', domain, score }) : bookingBase;
    const contactUrl = typeof utils.buildContactUrl === 'function'
      ? utils.buildContactUrl(contactBase, { src: 'broken-links-tester', domain, score }) : contactBase;
    const pkg = typeof utils.buildPackageSuggestion === 'function' ? utils.buildPackageSuggestion(score, locale) : null;

    const headline = i18n.nextStepTitle || (locale === 'en' ? 'Your next step' : 'Dein nächster Schritt');
    const intro = i18n.nextStepIntro || (locale === 'en'
      ? 'Want every broken link fixed and your site truly reliable? We plan it with you.'
      : 'Willst du, dass alle defekten Links behoben werden und deine Website zuverlässig läuft? Wir planen es mit dir.');
    const bookingLabel = i18n.bookingCtaLabel || (locale === 'en' ? 'Book a free consultation' : 'Kostenloses Erstgespräch buchen');
    const contactLabel = i18n.contactCtaLabel || (locale === 'en' ? 'Ask a question by email' : 'Frage per Nachricht stellen');

    let pkgBlock = '';
    if (pkg && pkg.title) {
      pkgBlock = `
        <div class="wt-next-step-package">
          <strong>${escapeHtml(pkg.title)}</strong>
          <p>${escapeHtml(pkg.text || '')}</p>
          <a class="wt-button wt-button-secondary" href="${escapeHtml(pkg.href || '/leistungen')}" data-tester-cta="broken" data-tester-action="package" data-bl-cta="package">${escapeHtml(pkg.label || (locale === 'en' ? 'See packages' : 'Pakete ansehen'))}</a>
        </div>`;
    }

    return `
      <section class="wt-cta-card wt-next-step-card" style="margin-top:0.9rem;">
        <h2><i class="fa-solid fa-rocket"></i> ${escapeHtml(headline)}</h2>
        <p>${escapeHtml(intro)}</p>
        <div class="wt-cta-actions">
          <a class="wt-button" href="${escapeHtml(bookingUrl)}" data-tester-cta="broken" data-tester-action="booking" data-bl-cta="booking">${escapeHtml(bookingLabel)}</a>
          <a class="wt-button wt-button-ghost" href="${escapeHtml(contactUrl)}" data-tester-cta="broken" data-tester-action="contact" data-bl-cta="contact">${escapeHtml(contactLabel)}</a>
        </div>
        ${pkgBlock}
      </section>`;
  }

  /**
   * Public summary only — renders the broken/warning counts and up to the top
   * 3 affected source pages. The full broken-links and warnings lists are
   * intentionally NOT rendered here; those are gated behind the lead form
   * and delivered via the confirmed PDF report.
   */
  function renderTopPagesSummary(result) {
    const items = Array.isArray(result.topAffectedPages) ? result.topAffectedPages : [];
    const title = i18n.topPagesTitle || (locale === 'en' ? 'Top 3 affected source pages' : 'Top 3 betroffene Quellseiten');
    const empty = i18n.topPagesEmpty || (locale === 'en' ? 'No affected pages detected.' : 'Keine betroffenen Seiten gefunden.');
    if (!items.length) {
      return `
        <section class="wt-sitefacts" style="margin-top:0.8rem;">
          <h3><i class="fa-solid fa-list-check"></i> ${escapeHtml(title)}</h3>
          <p>${escapeHtml(empty)}</p>
        </section>`;
    }
    const rows = items.map((item) => `
      <li>
        <a href="${escapeHtml(item.sourceUrl || '#')}" target="_blank" rel="noopener nofollow">${escapeHtml(item.sourceUrl || '')}</a>
        <div class="wt-result-meta">
          <span class="wt-tag" data-tone="${toneForCount(Number(item.brokenCount) || 0)}">${escapeHtml(i18n.brokenLinks || 'Broken Links')}: ${escapeHtml(item.brokenCount ?? 0)}</span>
          <span class="wt-tag" data-tone="${toneForCount(Number(item.warningCount) || 0)}">${escapeHtml(i18n.warnings || 'Warnings')}: ${escapeHtml(item.warningCount ?? 0)}</span>
        </div>
      </li>
    `).join('');
    return `
      <section class="wt-sitefacts" style="margin-top:0.8rem;">
        <h3><i class="fa-solid fa-list-check"></i> ${escapeHtml(title)}</h3>
        <ul class="wt-priority-list">${rows}</ul>
      </section>`;
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

  function renderLeadGate() {
    const title = i18n.lockedTitle || (locale === 'en' ? 'Detailed broken-links report (PDF)' : 'Detaillierter Broken-Links-Report (PDF)');
    const text = i18n.lockedText || '';
    return `
      <section class="wt-cta-card" style="margin-top:0.9rem;">
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(text)}</p>
        <form class="wt-lead-form" data-broken-links-lead-form>
          <input type="text" name="name" placeholder="${escapeHtml(i18n.leadName || 'Name (optional)')}" autocomplete="name">
          <input type="email" name="email" placeholder="${escapeHtml(i18n.leadEmail || 'E-Mail-Adresse')}" autocomplete="email" required>
          <label class="wt-lead-consent">
            <input type="checkbox" name="consent" required>
            <span>${escapeHtml(i18n.leadConsent || '')}</span>
          </label>
          <small class="wt-lead-legal-note">
            <a href="${escapeHtml(i18n.privacyHref || '/datenschutz')}" target="_blank" rel="noopener">
              ${escapeHtml(i18n.privacyLabel || 'Datenschutzerklärung')}
            </a>
          </small>
          <button class="wt-button" type="submit">${escapeHtml(i18n.leadSubmit || 'Bestätigungslink senden')}</button>
          <p class="wt-lead-state" data-broken-links-lead-state hidden></p>
        </form>
      </section>
    `;
  }

  function bindLeadForm(result) {
    const leadForm = resultsPanel.querySelector('[data-broken-links-lead-form]');
    if (!leadForm) return;

    const submitBtn = leadForm.querySelector('button[type="submit"]');
    const stateBox = leadForm.querySelector('[data-broken-links-lead-state]');

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
          stateBox.textContent = i18n.leadError || 'Die Broken-Links-Report-Anfrage konnte nicht verarbeitet werden.';
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
          throw new Error(data.message || i18n.leadError || 'Die Broken-Links-Report-Anfrage konnte nicht verarbeitet werden.');
        }

        if (stateBox) {
          stateBox.hidden = false;
          stateBox.classList.add('is-success');
          stateBox.textContent = data.message || i18n.leadSuccess || '';
        }

        trackEvent('broken_links_tester_lead_requested', { locale });
        leadForm.reset();
      } catch (error) {
        if (stateBox) {
          stateBox.hidden = false;
          stateBox.classList.add('is-error');
          stateBox.textContent = error.message || i18n.leadError || 'Die Broken-Links-Report-Anfrage konnte nicht verarbeitet werden.';
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = submitBtn.dataset.label || (i18n.leadSubmit || 'Bestätigungslink senden');
        }
      }
    });
  }

  function bindCtaTracking() {
    const links = resultsPanel.querySelectorAll('[data-tester-cta], [data-bl-cta]');
    links.forEach((anchor) => {
      anchor.addEventListener('click', function onClick() {
        trackEvent('broken_links_tester_cta_clicked', {
          locale,
          tester: anchor.getAttribute('data-tester-cta') || 'broken',
          cta_type: anchor.getAttribute('data-tester-action')
            || anchor.getAttribute('data-bl-cta')
            || 'unknown'
        });
      }, { once: true });
    });
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

      ${renderTopPagesSummary(result)}
      ${renderLimitations(result.limitations)}

      ${renderLeadGate()}

      ${renderNextStepCard(result)}
    `;

    resultsPanel.hidden = false;
    bindLeadForm(result);
    bindCtaTracking();
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
