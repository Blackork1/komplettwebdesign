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
    title: 'Website testen kostenlos: Ist meine Website noch aktuell? | Website-Tester',
    description: 'Kostenloser Website-Tester für SEO, GEO, Technik & Vertrauen. Prüfe sofort: Ist meine Website noch aktuell, sichtbar und update-reif?',
    keywords: 'website testen, website tester kostenlos, website kostenlos testen, ist meine website noch aktuell, muss ich meine website updaten, seo check website, geo check website',
    ogTitle: 'Website testen kostenlos | Ist meine Website noch aktuell?',
    ogDescription: 'Starte den kostenlosen Website-Check für SEO, GEO, Technik, Vertrauen und Conversion in wenigen Sekunden.',
    schemaDescription: 'Kostenloser Website-Check für SEO, GEO, Technik, Barrierefreiheit, Vertrauen und Conversion-Signale.',
    pagePath: '/website-tester',
    altPath: '/en/website-tester',
    localeCode: 'de-DE',
    inLanguage: 'de',
    pageName: 'Website testen kostenlos – Website-Tester',
    breadcrumb: ['Startseite', 'Website-Tester'],
    faq: [
      {
        q: 'Wie kann ich meine Website kostenlos testen?',
        a: 'Mit dem Website-Tester gibst du deine URL ein und bekommst direkt einen Score für SEO, GEO, Technik, Barrierefreiheit und Vertrauen.'
      },
      {
        q: 'Ist meine Website noch aktuell?',
        a: 'Der Tester prüft Modernität, Ladezeit, Struktur, Meta-Daten, technische Signale und zeigt konkrete Hinweise, ob ein Update sinnvoll ist.'
      },
      {
        q: 'Muss ich meine Website updaten?',
        a: 'Wenn wichtige Signale wie Title, Description, Performance, mobile Nutzbarkeit oder Vertrauensfaktoren fehlen, solltest du priorisiert updaten.'
      }
    ]
  },
  en: {
    title: 'Free Website Tester: Is my website outdated? | SEO & GEO Website Check',
    description: 'Run a free website test for SEO, GEO, technical quality, and trust signals. Find out if your website is outdated and needs an update.',
    keywords: 'free website tester, website test free, is my website outdated, does my website need an update, website seo check, geo website check, free website audit',
    ogTitle: 'Free Website Tester | Is my website outdated?',
    ogDescription: 'Run a free website check for SEO, GEO, technical quality, trust, and conversion readiness in seconds.',
    schemaDescription: 'Free website check for SEO, GEO, technical quality, accessibility, trust, and conversion signals.',
    pagePath: '/en/website-tester',
    altPath: '/website-tester',
    localeCode: 'en-US',
    inLanguage: 'en',
    pageName: 'Free Website Tester – SEO & GEO Website Check',
    breadcrumb: ['Home', 'Website Tester'],
    faq: [
      {
        q: 'How can I test my website for free?',
        a: 'Enter your URL in the Website Tester and get an instant score for SEO, GEO, technical quality, accessibility, and trust signals.'
      },
      {
        q: 'Is my website outdated?',
        a: 'The tester checks structure, metadata, speed, modernity, and quality signals to show whether your website is still up to date.'
      },
      {
        q: 'Does my website need an update?',
        a: 'If key factors like titles, descriptions, performance, mobile UX, or trust elements are weak, an update should be prioritized.'
      }
    ]
  }
};

function localeFromRequest(req) {
  return req.params?.lng === 'en' ? 'en' : 'de';
}

function jsonLd(scriptObject) {
  return `<script type="application/ld+json">${JSON.stringify(scriptObject)}</script>`;
}

function buildSeoExtra(base, canonical, copy, locale) {
  const alternateUrl = `${base}${copy.altPath}`;

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: copy.breadcrumb[0],
        item: base
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: copy.breadcrumb[1],
        item: canonical
      }
    ]
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Komplett Webdesign',
    url: base,
    inLanguage: copy.inLanguage,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${base}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  };

  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: copy.pageName,
    description: copy.schemaDescription,
    url: canonical,
    inLanguage: copy.inLanguage,
    isPartOf: {
      '@type': 'WebSite',
      url: base,
      name: 'Komplett Webdesign'
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbSchema.itemListElement
    },
    primaryImageOfPage: `${base}/images/heroBg.webp`
  };

  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Komplett Webdesign Website Tester',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    inLanguage: copy.inLanguage,
    url: canonical,
    description: copy.schemaDescription,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR'
    }
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: copy.faq.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a
      }
    }))
  };

  return `
    <link rel="alternate" hreflang="${copy.localeCode}" href="${canonical}">
    <link rel="alternate" hreflang="${locale === 'en' ? 'de-DE' : 'en-US'}" href="${alternateUrl}">
    <link rel="alternate" hreflang="x-default" href="${base}/website-tester">
    <meta property="og:type" content="website">
    <meta property="og:locale" content="${copy.localeCode}">
    <meta property="og:title" content="${copy.ogTitle}">
    <meta property="og:description" content="${copy.ogDescription}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="${base}/images/heroBg.webp">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${copy.ogTitle}">
    <meta name="twitter:description" content="${copy.ogDescription}">
    ${jsonLd(websiteSchema)}
    ${jsonLd(webPageSchema)}
    ${jsonLd(appSchema)}
    ${jsonLd(breadcrumbSchema)}
    ${jsonLd(faqSchema)}
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
