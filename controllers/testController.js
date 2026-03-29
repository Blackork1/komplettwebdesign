import { auditWebsite, getCachedAuditResult } from '../services/websiteAuditService.js';
import {
  archiveWebsiteTesterRequest,
  getWebsiteTesterConfig
} from '../models/websiteTesterAdminModel.js';
import {
  confirmWebsiteTesterLeadToken,
  requestWebsiteTesterLead
} from '../services/websiteTesterLeadService.js';

const PAGE_I18N = {
  de: {
    title: 'Website Tester 2.3: SEO, GEO, Technik & Legal-Risiko kostenlos prüfen',
    description: 'Deep-Audit für deine Website: SEO, Technik, Barrierefreiheit, Vertrauen und Modernität in einem klaren Ergebnis-Dashboard.',
    keywords: 'Website Tester, Website Check, SEO Check Website, Website analysieren, Barrierefreiheit Website testen',
    ogTitle: 'Website Tester 2.3 | Deep-Audit für moderne Websites',
    ogDescription: 'Prüfe kostenlos, ob deine Website modern, schnell, sichtbar und conversionstark ist.',
    schemaDescription: 'Kostenloser Deep-Audit für SEO, Technik, Barrierefreiheit und Conversion.',
    pagePath: '/website-tester'
  },
  en: {
    title: 'Website Tester 2.3: free SEO, GEO, technical and legal-risk check',
    description: 'Deep audit for your website: SEO, technical quality, accessibility, trust, and conversion readiness in one clear dashboard.',
    keywords: 'website tester, website audit, seo check, accessibility check, technical website analysis',
    ogTitle: 'Website Tester 2.3 | Deep audit for modern websites',
    ogDescription: 'Check if your website is modern, fast, discoverable, and conversion-ready.',
    schemaDescription: 'Free deep audit for SEO, technical quality, accessibility, and conversion signals.',
    pagePath: '/en/website-tester'
  }
};

function localeFromRequest(req) {
  return req.params?.lng === 'en' ? 'en' : 'de';
}

function buildSeoExtra(base, canonical, copy, locale) {
  return `
    <meta property="og:type" content="website">
    <meta property="og:title" content="${copy.ogTitle}">
    <meta property="og:description" content="${copy.ogDescription}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="${base}/images/heroBg.webp">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${copy.ogTitle}">
    <meta name="twitter:description" content="${copy.ogDescription}">
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": "Komplett Webdesign Website Tester 2.0",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web",
        "inLanguage": "${locale === 'en' ? 'en' : 'de'}",
        "url": "${canonical}",
        "description": "${copy.schemaDescription}",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "EUR"
        }
      }
    </script>
  `;
}

function extractClientIp(req) {
  const forwarded = (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim();
  return (forwarded || req.ip || req.connection?.remoteAddress || '').slice(0, 120);
}

function compactResultForArchive(result) {
  return {
    auditId: result.auditId,
    locale: result.locale,
    mode: result.mode,
    context: result.context,
    finalUrl: result.finalUrl,
    overallScore: result.overallScore,
    scoreBand: result.scoreBand,
    scoring: result.scoring,
    relevance: result.relevance,
    legalRisk: result.legalRisk,
    crawlStats: result.crawlStats,
    scannedPages: (result.scannedPages || []).slice(0, 12),
    failedScanTargets: (result.failedScanTargets || []).slice(0, 12),
    topActions: (result.topActions || []).slice(0, 6),
    categories: (result.categories || []).map((item) => ({
      id: item.id,
      score: item.score,
      tone: item.tone,
      badge: item.badge
    })),
    fetchedAt: result.fetchedAt
  };
}

export async function testPage(req, res) {
  const locale = localeFromRequest(req);
  const copy = PAGE_I18N[locale];
  const base = (res.locals.canonicalBaseUrl || 'https://komplettwebdesign.de').replace(/\/$/, '');
  const canonical = `${base}${copy.pagePath}`;

  res.render('test', {
    lng: locale,
    testerLocale: locale,
    title: copy.title,
    description: copy.description,
    keywords: copy.keywords,
    canonicalUrl: canonical,
    seoExtra: buildSeoExtra(base, canonical, copy, locale)
  });
}

export async function runWebsiteAudit(req, res) {
  const { url, locale, mode, context } = req.body || {};
  const requestedUrl = String(url || '').trim();
  const safeLocale = locale === 'en' ? 'en' : 'de';
  const safeMode = mode === 'deep' ? 'deep' : 'deep';
  const safeContext = {
    businessType: String(context?.businessType || '').trim(),
    primaryService: String(context?.primaryService || '').trim(),
    targetRegion: String(context?.targetRegion || '').trim()
  };
  const sourceIp = extractClientIp(req);

  let config = { maxSubpages: 5 };
  try {
    config = await getWebsiteTesterConfig();
  } catch (error) {
    console.error('Website-Tester-Config konnte nicht geladen werden:', error);
  }

  try {
    const result = await auditWebsite({
      url: requestedUrl,
      locale: safeLocale,
      mode: safeMode,
      maxSubpages: config.maxSubpages,
      context: safeContext
    });

    try {
      await archiveWebsiteTesterRequest({
        auditId: result.auditId,
        requestedUrl,
        normalizedUrl: result.normalizedUrl,
        finalUrl: result.finalUrl,
        locale: safeLocale,
        mode: safeMode,
        status: 'success',
        overallScore: result.overallScore,
        scoreBand: result.scoreBand,
        crawlPlannedPages: result.crawlStats?.plannedPages,
        crawlVisitedPages: result.crawlStats?.visitedPages,
        crawlFailedPages: result.crawlStats?.failedPages,
        httpStatus: result.httpStatus,
        loadTimeMs: result.loadTimeMs,
        sourceIp,
        topIssues: (result.topActions || []).slice(0, 3).map((item) => item.label || item.text),
        resultJson: compactResultForArchive(result)
      });
    } catch (archiveError) {
      console.error('Website-Tester-Archiv (success) fehlgeschlagen:', archiveError);
    }

    res.json({ success: true, result });
  } catch (error) {
    const status = error.status || 500;

    try {
      await archiveWebsiteTesterRequest({
        requestedUrl,
        locale: safeLocale,
        mode: safeMode,
        status: 'error',
        errorMessage: error.message || 'Audit fehlgeschlagen',
        sourceIp
      });
    } catch (archiveError) {
      console.error('Website-Tester-Archiv (error) fehlgeschlagen:', archiveError);
    }

    res.status(status).json({
      success: false,
      message: error.message || 'Die Analyse konnte nicht durchgeführt werden.'
    });
  }
}

export async function getCachedWebsiteAudit(req, res) {
  const { auditId } = req.params || {};
  const result = getCachedAuditResult(auditId);
  if (!result) {
    return res.status(404).json({
      success: false,
      message: 'Audit wurde nicht gefunden oder ist abgelaufen.'
    });
  }
  return res.json({ success: true, result });
}

export async function runWebsiteAuditLead(req, res) {
  const { auditId, email, name, locale, consent } = req.body || {};
  const safeLocale = locale === 'en' ? 'en' : 'de';
  const safeConsent = consent === true || consent === 'true' || consent === 1 || consent === '1';
  const consentText = safeLocale === 'en'
    ? 'I agree to receive the requested optimization PDF by email.'
    : 'Ich stimme zu, den angeforderten Optimierungsreport per E-Mail zu erhalten.';

  try {
    const response = await requestWebsiteTesterLead({
      auditId: String(auditId || '').trim(),
      email,
      name,
      locale: safeLocale,
      consent: safeConsent,
      sourceIp: extractClientIp(req),
      consentText
    });

    return res.json({
      success: true,
      verificationRequired: true,
      message: response.message
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || (safeLocale === 'en'
        ? 'The report request could not be processed.'
        : 'Die Report-Anfrage konnte nicht verarbeitet werden.')
    });
  }
}

export async function confirmWebsiteAuditLead(req, res) {
  const requestedLocale = req.params?.lng === 'en' ? 'en' : 'de';
  const token = String(req.query?.token || '').trim();

  const viewModel = await confirmWebsiteTesterLeadToken({
    token,
    locale: requestedLocale
  });

  const isEn = viewModel.locale === 'en';
  const base = (res.locals.canonicalBaseUrl || 'https://komplettwebdesign.de').replace(/\/$/, '');
  const pagePath = isEn ? '/en/website-tester/report-confirm' : '/website-tester/report-confirm';
  const canonical = `${base}${pagePath}`;

  res.render('website_tester_confirm', {
    lng: viewModel.locale,
    title: isEn ? 'Website Tester report confirmation' : 'Website-Tester Report-Bestätigung',
    description: isEn
      ? 'Confirm your email and receive your detailed website optimization report.'
      : 'Bestätige deine E-Mail und erhalte deinen ausführlichen Website-Optimierungsreport.',
    canonicalUrl: canonical,
    robots: 'noindex,nofollow',
    confirmView: viewModel,
    seoExtra: `
      <meta property="og:type" content="website">
      <meta property="og:title" content="${isEn ? 'Website Tester report confirmation' : 'Website-Tester Report-Bestätigung'}">
      <meta property="og:description" content="${isEn ? 'Email confirmation for your optimization PDF.' : 'E-Mail-Bestätigung für deinen Optimierungsreport.'}">
      <meta property="og:url" content="${canonical}">
    `
  });
}
