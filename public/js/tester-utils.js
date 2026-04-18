/*!
 * tester-utils.js
 * Gemeinsame Client-Utilities für alle Website-Tester.
 * Wird vor dem jeweiligen tester-spezifischen JS eingebunden.
 */
(function () {
  const w = window;

  function safeString(value, max) {
    const v = (value === null || value === undefined) ? '' : String(value);
    return max ? v.slice(0, max) : v;
  }

  function extractDomain(resultOrUrl) {
    try {
      if (!resultOrUrl) return '';
      const raw = typeof resultOrUrl === 'string'
        ? resultOrUrl
        : (resultOrUrl.finalUrl || resultOrUrl.normalizedUrl || resultOrUrl.requestedUrl || '');
      if (!raw) return '';
      const u = new URL(raw, w.location.origin);
      return u.hostname.replace(/^www\./i, '');
    } catch (_err) {
      return '';
    }
  }

  function pickScore(result) {
    if (!result || typeof result !== 'object') return null;
    // verschiedene Tester legen den Score unter unterschiedlichen Schlüsseln ab
    const candidates = [
      result.overallScore,
      result.seoScore && result.seoScore.overall,
      result.geoScore && result.geoScore.overall,
      result.metaScore && result.metaScore.overall,
      result.score && result.score.overall,
      result.score
    ];
    for (const c of candidates) {
      const n = Number(c);
      if (Number.isFinite(n) && n >= 0 && n <= 100) return Math.round(n);
    }
    return null;
  }

  function pickTopAction(result) {
    if (!result || typeof result !== 'object') return '';
    const actions = result.topActions || result.topRecommendations || result.priorityActions || [];
    if (Array.isArray(actions) && actions.length) {
      const first = actions[0];
      return safeString(first.label || first.text || first.title || '', 160);
    }
    return '';
  }

  function buildBookingUrl(baseHref, context) {
    try {
      const href = baseHref || '/booking';
      const url = new URL(href, w.location.origin);
      if (!context) return url.pathname + (url.search || '');
      if (context.src) url.searchParams.set('src', safeString(context.src, 40));
      if (context.domain) url.searchParams.set('domain', safeString(context.domain, 180));
      if (context.score !== null && context.score !== undefined && context.score !== '') {
        url.searchParams.set('score', safeString(context.score, 5));
      }
      return url.pathname + (url.search || '');
    } catch (_e) {
      return baseHref || '/booking';
    }
  }

  function buildContactUrl(baseHref, context) {
    try {
      const href = baseHref || '/kontakt';
      const url = new URL(href, w.location.origin);
      if (!context) return url.pathname + (url.search || '');
      if (context.src) url.searchParams.set('src', safeString(context.src, 40));
      if (context.domain) url.searchParams.set('domain', safeString(context.domain, 180));
      if (context.score !== null && context.score !== undefined && context.score !== '') {
        url.searchParams.set('score', safeString(context.score, 5));
      }
      return url.pathname + (url.search || '');
    } catch (_e) {
      return baseHref || '/kontakt';
    }
  }

  /**
   * Baut einen kurzen Empfehlungs-Block, der dem Nutzer abhängig vom Score
   * das passende Paket / die passende Leistung vorschlägt.
   * @param {number|null} score
   * @param {'de'|'en'} locale
   * @param {Object} [opts]
   * @param {string} [opts.testerName]   z.B. "SEO-Tester"
   * @returns {{title:string, text:string, href:string, label:string}}
   */
  function buildPackageSuggestion(score, locale, opts) {
    const isEn = locale === 'en';
    const s = Number.isFinite(score) ? Number(score) : null;
    // Vorschläge basieren auf Score-Band
    if (s !== null && s < 40) {
      return {
        title: isEn ? 'Relaunch recommended' : 'Relaunch empfohlen',
        text: isEn
          ? 'Your site has fundamental issues across multiple categories. We recommend a focused relaunch.'
          : 'Deine Website hat grundlegende Probleme in mehreren Kategorien. Ein fokussierter Relaunch bringt dich am schnellsten weiter.',
        href: isEn ? '/en/pakete' : '/pakete',
        label: isEn ? 'View website packages' : 'Zu den Webdesign-Paketen'
      };
    }
    if (s !== null && s < 70) {
      return {
        title: isEn ? 'Targeted optimization' : 'Gezielte Optimierung',
        text: isEn
          ? 'A structured SEO/GEO optimization sprint closes the biggest gaps without a full rebuild.'
          : 'Ein strukturierter SEO/GEO-Optimierungs-Sprint schließt die größten Lücken ohne kompletten Neuaufbau.',
        href: isEn ? '/en/leistungen' : '/leistungen',
        label: isEn ? 'View optimization services' : 'Zu den Optimierungs-Leistungen'
      };
    }
    return {
      title: isEn ? 'Fine-tuning & growth' : 'Feinschliff & Wachstum',
      text: isEn
        ? 'Your base is strong. We help you polish details and pull ahead of competitors.'
        : 'Deine Basis ist stark. Wir helfen dir, Details zu polieren und Wettbewerbern davon­zuziehen.',
      href: isEn ? '/en/leistungen' : '/leistungen',
      label: isEn ? 'See how we can help' : 'Beratungsleistungen ansehen'
    };
  }

  w.TesterUtils = {
    extractDomain,
    pickScore,
    pickTopAction,
    buildBookingUrl,
    buildContactUrl,
    buildPackageSuggestion,
    safeString
  };
})();
