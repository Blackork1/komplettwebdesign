import { auditWebsite, getCachedAuditResult } from '../services/websiteAuditService.js';
import { auditBrokenLinks } from '../services/brokenLinkAuditService.js';
import { auditGeoWebsite } from '../services/geoAuditService.js';
import { auditSeoWebsite } from '../services/seoAuditService.js';
import {
  archiveGeoAuditRequest,
  archiveSeoAuditRequest,
  archiveBrokenLinkAuditRequest,
  archiveWebsiteTesterRequest,
  getWebsiteTesterConfig
} from '../models/websiteTesterAdminModel.js';
import {
  confirmWebsiteTesterLeadToken,
  requestWebsiteTesterLead
} from '../services/websiteTesterLeadService.js';
import {
  confirmGeoTesterLeadToken,
  requestGeoTesterLead
} from '../services/geoTesterLeadService.js';
import {
  confirmSeoTesterLeadToken,
  requestSeoTesterLead
} from '../services/seoTesterLeadService.js';

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

const BROKEN_LINK_PAGE_I18N = {
  de: {
    title: 'Broken Links Tester kostenlos: Defekte Links finden & SEO verbessern',
    description: 'Kostenloser Broken-Links-Tester für interne und externe Links. Finde 404-Fehler, behebe Link-Probleme und verbessere Sichtbarkeit in Google.',
    keywords: 'broken links tester, defekte links finden, website link checker, tote links website, 404 links prüfen, seo links check, website tester links',
    ogTitle: 'Broken Links Tester kostenlos',
    ogDescription: 'Scanne deine Website auf defekte interne und externe Links und verbessere dein SEO-Potenzial.',
    schemaDescription: 'Kostenloser Website-Broken-Link-Scan für interne und externe Links mit Fokus auf SEO und Nutzerführung.',
    pagePath: '/website-tester/broken-links',
    altPath: '/en/website-tester/broken-links',
    localeCode: 'de-DE',
    inLanguage: 'de',
    pageName: 'Broken Links Tester – Website Link-Scan',
    breadcrumb: ['Startseite', 'Broken Links Tester'],
    faq: [
      {
        q: 'Wie finde ich defekte Links auf meiner Website?',
        a: 'Mit dem Broken-Links-Tester gibst du deine URL ein und erhältst sofort eine Liste fehlerhafter interner und externer Links.'
      },
      {
        q: 'Warum sind fehlerhafte Links schlecht für SEO?',
        a: 'Defekte Links verschlechtern Nutzererfahrung und Crawl-Signale. Das kann Rankings und Conversion beeinträchtigen.'
      },
      {
        q: 'Was sollte ich zuerst nach dem Scan tun?',
        a: 'Priorisiere Seiten mit vielen Broken Links, ersetze tote Ziele, entferne irrelevante Verweise und setze saubere Weiterleitungen.'
      }
    ]
  },
  en: {
    title: 'Free Broken Links Tester: Find broken links and improve SEO',
    description: 'Run a free broken-links scan for your website, detect 404 issues, and improve search visibility and user experience.',
    keywords: 'broken links tester, website link checker, find broken links, dead links scan, free link audit, seo link check',
    ogTitle: 'Free Broken Links Tester',
    ogDescription: 'Scan your website for broken internal and external links and improve SEO signals.',
    schemaDescription: 'Free website broken-link scan for internal and external links with SEO-focused insights.',
    pagePath: '/en/website-tester/broken-links',
    altPath: '/website-tester/broken-links',
    localeCode: 'en-US',
    inLanguage: 'en',
    pageName: 'Broken Links Tester – Website Link Scan',
    breadcrumb: ['Home', 'Broken Links Tester'],
    faq: [
      {
        q: 'How can I find broken links on my website?',
        a: 'Enter your domain in the Broken Links Tester and get an instant list of broken internal and external links.'
      },
      {
        q: 'Do broken links affect SEO?',
        a: 'Yes. Broken links hurt crawl quality and user experience, which can reduce rankings and conversion performance.'
      },
      {
        q: 'What should I fix first after the scan?',
        a: 'Start with high-traffic pages, remove dead targets, replace broken references, and add clean redirects where needed.'
      }
    ]
  }
};

const GEO_PAGE_I18N = {
  de: {
    title: 'GEO Tester kostenlos: Generative Suchsichtbarkeit prüfen & verbessern',
    description: 'Kostenloser GEO-Tester für deine Website. Prüfe Unterseiten auf GEO-Signale, erkenne Potenzial und erhalte den detaillierten Umsetzungsreport per Newsletter-Double-Opt-in.',
    keywords: 'geo tester, generative engine optimization, geo analyse website, ai suchmaschinen optimierung, llm sichtbarkeit website, geo check',
    ogTitle: 'GEO Tester kostenlos',
    ogDescription: 'Teste deine Website auf GEO-Readiness, erkenne Optimierungspotenziale und erhalte einen detaillierten GEO-Report per E-Mail.',
    schemaDescription: 'Kostenloser GEO-Check für Websites mit Fokus auf AI-/LLM-Sichtbarkeit, semantische Signale und Optimierungspotenziale.',
    pagePath: '/website-tester/geo',
    altPath: '/en/website-tester/geo',
    localeCode: 'de-DE',
    inLanguage: 'de',
    pageName: 'GEO Tester – Generative Suchsichtbarkeit prüfen',
    breadcrumb: ['Startseite', 'GEO Tester'],
    faq: [
      {
        q: 'Was prüft der GEO-Tester?',
        a: 'Der GEO-Tester analysiert unter anderem Entity-/Schema-Signale, Intent-Kohärenz, FAQ-/Snippet-Readiness und GEO-Relevanz über Unterseiten.'
      },
      {
        q: 'Warum sehe ich nicht sofort alle Detailmaßnahmen?',
        a: 'Die konkrete Schritt-für-Schritt-Anleitung wird nach Newsletter-Double-Opt-in per E-Mail versendet.'
      },
      {
        q: 'Ist das Ergebnis nur für Google sinnvoll?',
        a: 'Nein, die Signale helfen sowohl klassischer Suche als auch generativen Suchoberflächen und KI-Antwortsystemen.'
      }
    ]
  },
  en: {
    title: 'Free GEO Tester: Check and improve generative search visibility',
    description: 'Run a free GEO website audit across subpages, discover optimization potential, and receive the detailed implementation report via newsletter double opt-in.',
    keywords: 'geo tester, generative engine optimization, geo website audit, llm visibility checker, ai search optimization',
    ogTitle: 'Free GEO Tester',
    ogDescription: 'Scan your website for GEO readiness, identify optimization potential, and get a detailed GEO report by email.',
    schemaDescription: 'Free GEO website audit focused on AI/LLM visibility signals, semantic structure, and optimization potential.',
    pagePath: '/en/website-tester/geo',
    altPath: '/website-tester/geo',
    localeCode: 'en-US',
    inLanguage: 'en',
    pageName: 'GEO Tester – Generative Search Visibility Audit',
    breadcrumb: ['Home', 'GEO Tester'],
    faq: [
      {
        q: 'What does the GEO tester analyze?',
        a: 'The GEO tester checks entity/schema signals, intent coherence, FAQ/snippet readiness, and GEO relevance across subpages.'
      },
      {
        q: 'Why are detailed implementation steps locked?',
        a: 'Detailed step-by-step instructions are delivered by email after newsletter double opt-in confirmation.'
      },
      {
        q: 'Is GEO relevant only for Google?',
        a: 'No. These signals support both classic search and generative search/AI answer interfaces.'
      }
    ]
  }
};

const SEO_PAGE_I18N = {
  de: {
    title: 'SEO Tester kostenlos: Website auf SEO-Kriterien prüfen',
    description: 'Kostenloser SEO-Tester für deine Website mit Unterseiten-Scan. Erhalte SEO-Score, Potenzial und den detaillierten Maßnahmenreport per DOI.',
    keywords: 'seo tester, website seo testen, seo check website, suchmaschinenoptimierung website prüfen, seo analyse kostenlos',
    ogTitle: 'SEO Tester kostenlos',
    ogDescription: 'Prüfe deine Website auf wichtige SEO- und Technik-Kriterien und erhalte einen detaillierten SEO-Report per E-Mail.',
    schemaDescription: 'Kostenloser SEO-Website-Check für OnPage-, Indexierungs-, Technik-, Content- und Struktur-Signale.',
    pagePath: '/website-tester/seo',
    altPath: '/en/website-tester/seo',
    localeCode: 'de-DE',
    inLanguage: 'de',
    pageName: 'SEO Tester – Website auf SEO-Kriterien prüfen',
    breadcrumb: ['Startseite', 'SEO Tester'],
    faq: [
      {
        q: 'Was prüft der SEO-Tester?',
        a: 'Der SEO-Tester analysiert OnPage-Signale, Indexierung, Technik, Content-Qualität, interne Verlinkung und strukturierte Daten.'
      },
      {
        q: 'Warum sehe ich Detailmaßnahmen erst nach E-Mail-Bestätigung?',
        a: 'Der öffentliche Bereich zeigt bewusst nur Summary und Potenzial. Der vollständige Umsetzungsreport wird nach DOI per E-Mail versendet.'
      },
      {
        q: 'Ist der SEO-Check auch für KI-Suche relevant?',
        a: 'Ja. Die geprüften Signale verbessern sowohl klassische Suchergebnisse als auch AI-retrieval-getriebene Auffindbarkeit.'
      }
    ]
  },
  en: {
    title: 'Free SEO Tester: Audit your website SEO criteria',
    description: 'Run a free SEO audit across your website and subpages. Get SEO score, optimization potential, and a detailed action report via email DOI.',
    keywords: 'seo tester, seo website audit, free seo check website, technical seo checker, onpage seo analysis',
    ogTitle: 'Free SEO Tester',
    ogDescription: 'Audit your website for key SEO and technical signals and receive a detailed SEO report by email.',
    schemaDescription: 'Free SEO website audit for on-page, indexing, technical, content, and structured data signals.',
    pagePath: '/en/website-tester/seo',
    altPath: '/website-tester/seo',
    localeCode: 'en-US',
    inLanguage: 'en',
    pageName: 'SEO Tester – Website SEO Criteria Audit',
    breadcrumb: ['Home', 'SEO Tester'],
    faq: [
      {
        q: 'What does the SEO tester analyze?',
        a: 'The SEO tester checks on-page signals, indexing, technical quality, content quality, internal linking, and structured data.'
      },
      {
        q: 'Why are detailed actions locked before email confirmation?',
        a: 'Public results intentionally show summary and potential only. The full implementation report is sent after DOI confirmation.'
      },
      {
        q: 'Is this useful for AI-driven search discovery too?',
        a: 'Yes. The audited signals support both classic search rankings and AI-retrieval-driven discoverability.'
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

function buildBrokenLinksSeoExtra(base, canonical, copy, locale) {
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
    }
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Komplett Webdesign',
    url: base,
    inLanguage: copy.inLanguage
  };

  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Komplett Webdesign Broken Links Tester',
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
    mainEntity: (copy.faq || []).map((item) => ({
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
    <link rel="alternate" hreflang="x-default" href="${base}/website-tester/broken-links">
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

function buildGeoSeoExtra(base, canonical, copy, locale) {
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
    inLanguage: copy.inLanguage
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
    }
  };

  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Komplett Webdesign GEO Tester',
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
    mainEntity: (copy.faq || []).map((item) => ({
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
    <link rel="alternate" hreflang="x-default" href="${base}/website-tester/geo">
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

function buildSeoTesterSeoExtra(base, canonical, copy, locale) {
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
    inLanguage: copy.inLanguage
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
    }
  };

  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Komplett Webdesign SEO Tester',
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
    mainEntity: (copy.faq || []).map((item) => ({
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
    <link rel="alternate" hreflang="x-default" href="${base}/website-tester/seo">
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

export async function brokenLinksTestPage(req, res) {
  const locale = localeFromRequest(req);
  const copy = BROKEN_LINK_PAGE_I18N[locale];
  const base = (res.locals.canonicalBaseUrl || 'https://komplettwebdesign.de').replace(/\/$/, '');
  const canonical = `${base}${copy.pagePath}`;

  res.render('broken_links_tester', {
    lng: locale,
    title: copy.title,
    description: copy.description,
    keywords: copy.keywords,
    canonicalUrl: canonical,
    seoExtra: buildBrokenLinksSeoExtra(base, canonical, copy, locale)
  });
}

export async function geoTestPage(req, res) {
  const locale = localeFromRequest(req);
  const copy = GEO_PAGE_I18N[locale];
  const base = (res.locals.canonicalBaseUrl || 'https://komplettwebdesign.de').replace(/\/$/, '');
  const canonical = `${base}${copy.pagePath}`;

  res.render('geo_tester', {
    lng: locale,
    title: copy.title,
    description: copy.description,
    keywords: copy.keywords,
    canonicalUrl: canonical,
    seoExtra: buildGeoSeoExtra(base, canonical, copy, locale)
  });
}

export async function seoTestPage(req, res) {
  const locale = localeFromRequest(req);
  const copy = SEO_PAGE_I18N[locale];
  const base = (res.locals.canonicalBaseUrl || 'https://komplettwebdesign.de').replace(/\/$/, '');
  const canonical = `${base}${copy.pagePath}`;

  res.render('seo_tester', {
    lng: locale,
    title: copy.title,
    description: copy.description,
    keywords: copy.keywords,
    canonicalUrl: canonical,
    seoExtra: buildSeoTesterSeoExtra(base, canonical, copy, locale)
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

export async function runBrokenLinkAudit(req, res) {
  const { url, locale } = req.body || {};
  const requestedUrl = String(url || '').trim();
  const safeLocale = locale === 'en' ? 'en' : 'de';
  const sourceIp = extractClientIp(req);

  let config = {
    brokenLinksMaxSubpages: 5,
    brokenLinksScanMode: 'maximal'
  };
  try {
    config = await getWebsiteTesterConfig();
  } catch (error) {
    console.error('Broken-Links-Tester-Config konnte nicht geladen werden:', error);
  }

  const effectiveMaxSubpages = Number.isFinite(config?.brokenLinksMaxSubpages)
    ? config.brokenLinksMaxSubpages
    : 5;
  const effectiveScanMode = ['schnell', 'balanced', 'maximal'].includes(config?.brokenLinksScanMode)
    ? config.brokenLinksScanMode
    : 'maximal';

  try {
    const result = await auditBrokenLinks({
      url: requestedUrl,
      locale: safeLocale,
      maxSubpages: effectiveMaxSubpages,
      scanMode: effectiveScanMode
    });

    try {
      await archiveBrokenLinkAuditRequest({
        auditId: result.auditId,
        requestedUrl,
        normalizedUrl: result.normalizedUrl,
        finalUrl: result.finalUrl,
        locale: safeLocale,
        status: 'success',
        scanMode: result.scanMode,
        maxSubpages: effectiveMaxSubpages,
        crawlPlannedPages: result.crawlStats?.plannedPages,
        crawlVisitedPages: result.crawlStats?.visitedPages,
        crawlFailedPages: result.crawlStats?.failedPages,
        timeoutReached: !!result.crawlStats?.timeoutReached,
        partialResult: !!result.crawlStats?.partial,
        linkTotalChecked: result.linkStats?.totalChecked,
        linkBrokenCount: result.linkStats?.brokenCount,
        linkWarningCount: result.linkStats?.warningCount,
        linkOkCount: result.linkStats?.okCount,
        sourceIp,
        resultJson: result
      });
    } catch (archiveError) {
      console.error('Broken-Links-Archiv (success) fehlgeschlagen:', archiveError);
    }

    return res.json({ success: true, result });
  } catch (error) {
    const status = error.status || 500;

    try {
      await archiveBrokenLinkAuditRequest({
        requestedUrl,
        locale: safeLocale,
        status: 'error',
        errorMessage: error.message || 'Broken-Link-Audit fehlgeschlagen',
        scanMode: effectiveScanMode,
        maxSubpages: effectiveMaxSubpages,
        sourceIp
      });
    } catch (archiveError) {
      console.error('Broken-Links-Archiv (error) fehlgeschlagen:', archiveError);
    }

    return res.status(status).json({
      success: false,
      message: error.message || (safeLocale === 'en'
        ? 'The broken-link scan could not be completed.'
        : 'Der Broken-Link-Scan konnte nicht durchgeführt werden.')
    });
  }
}

export async function runGeoAudit(req, res) {
  const { url, locale, context } = req.body || {};
  const requestedUrl = String(url || '').trim();
  const safeLocale = locale === 'en' ? 'en' : 'de';
  const safeContext = {
    businessType: String(context?.businessType || '').trim(),
    primaryService: String(context?.primaryService || '').trim(),
    targetRegion: String(context?.targetRegion || '').trim()
  };
  const sourceIp = extractClientIp(req);

  let config = {
    geoMaxSubpages: 5,
    geoScanMode: 'maximal'
  };
  try {
    config = await getWebsiteTesterConfig();
  } catch (error) {
    console.error('GEO-Tester-Config konnte nicht geladen werden:', error);
  }

  const effectiveMaxSubpages = Number.isFinite(config?.geoMaxSubpages)
    ? config.geoMaxSubpages
    : 5;
  const effectiveScanMode = ['schnell', 'balanced', 'maximal'].includes(config?.geoScanMode)
    ? config.geoScanMode
    : 'maximal';

  try {
    const result = await auditGeoWebsite({
      url: requestedUrl,
      locale: safeLocale,
      maxSubpages: effectiveMaxSubpages,
      scanMode: effectiveScanMode,
      context: safeContext
    });

    try {
      await archiveGeoAuditRequest({
        auditId: result.auditId,
        requestedUrl,
        normalizedUrl: result.normalizedUrl,
        finalUrl: result.finalUrl,
        locale: safeLocale,
        status: 'success',
        scanMode: result.scanMode,
        maxSubpages: result.config?.effectiveMaxSubpages || effectiveMaxSubpages,
        crawlPlannedPages: result.crawlStats?.plannedPages,
        crawlVisitedPages: result.crawlStats?.visitedPages,
        crawlFailedPages: result.crawlStats?.failedPages,
        timeoutReached: !!result.crawlStats?.timeoutReached,
        partialResult: !!result.crawlStats?.partial,
        geoScore: result.geoScore?.overall,
        geoBand: result.geoScore?.band,
        sourceIp,
        resultJson: result
      });
    } catch (archiveError) {
      console.error('GEO-Archiv (success) fehlgeschlagen:', archiveError);
    }

    return res.json({ success: true, result });
  } catch (error) {
    const status = error.status || 500;

    try {
      await archiveGeoAuditRequest({
        requestedUrl,
        locale: safeLocale,
        status: 'error',
        errorMessage: error.message || 'GEO-Audit fehlgeschlagen',
        scanMode: effectiveScanMode,
        maxSubpages: effectiveMaxSubpages,
        sourceIp
      });
    } catch (archiveError) {
      console.error('GEO-Archiv (error) fehlgeschlagen:', archiveError);
    }

    return res.status(status).json({
      success: false,
      message: error.message || (safeLocale === 'en'
        ? 'The GEO audit could not be completed.'
        : 'Das GEO-Audit konnte nicht durchgeführt werden.')
    });
  }
}

export async function runSeoAudit(req, res) {
  const { url, locale, context } = req.body || {};
  const requestedUrl = String(url || '').trim();
  const safeLocale = locale === 'en' ? 'en' : 'de';
  const safeContext = {
    businessType: String(context?.businessType || '').trim(),
    primaryService: String(context?.primaryService || '').trim(),
    targetRegion: String(context?.targetRegion || '').trim()
  };
  const sourceIp = extractClientIp(req);

  let config = {
    seoMaxSubpages: 5,
    seoScanMode: 'maximal'
  };
  try {
    config = await getWebsiteTesterConfig();
  } catch (error) {
    console.error('SEO-Tester-Config konnte nicht geladen werden:', error);
  }

  const effectiveMaxSubpages = Number.isFinite(config?.seoMaxSubpages)
    ? config.seoMaxSubpages
    : 5;
  const effectiveScanMode = ['schnell', 'balanced', 'maximal'].includes(config?.seoScanMode)
    ? config.seoScanMode
    : 'maximal';

  try {
    const result = await auditSeoWebsite({
      url: requestedUrl,
      locale: safeLocale,
      maxSubpages: effectiveMaxSubpages,
      scanMode: effectiveScanMode,
      context: safeContext
    });

    try {
      await archiveSeoAuditRequest({
        auditId: result.auditId,
        requestedUrl,
        normalizedUrl: result.normalizedUrl,
        finalUrl: result.finalUrl,
        locale: safeLocale,
        status: 'success',
        scanMode: result.scanMode,
        maxSubpages: result.config?.effectiveMaxSubpages || effectiveMaxSubpages,
        crawlPlannedPages: result.crawlStats?.plannedPages,
        crawlVisitedPages: result.crawlStats?.visitedPages,
        crawlFailedPages: result.crawlStats?.failedPages,
        timeoutReached: !!result.crawlStats?.timeoutReached,
        partialResult: !!result.crawlStats?.partial,
        seoScore: result.seoScore?.overall,
        seoBand: result.seoScore?.band,
        sourceIp,
        resultJson: result
      });
    } catch (archiveError) {
      console.error('SEO-Archiv (success) fehlgeschlagen:', archiveError);
    }

    return res.json({ success: true, result });
  } catch (error) {
    const status = error.status || 500;

    try {
      await archiveSeoAuditRequest({
        requestedUrl,
        locale: safeLocale,
        status: 'error',
        errorMessage: error.message || 'SEO-Audit fehlgeschlagen',
        scanMode: effectiveScanMode,
        maxSubpages: effectiveMaxSubpages,
        sourceIp
      });
    } catch (archiveError) {
      console.error('SEO-Archiv (error) fehlgeschlagen:', archiveError);
    }

    return res.status(status).json({
      success: false,
      message: error.message || (safeLocale === 'en'
        ? 'The SEO audit could not be completed.'
        : 'Das SEO-Audit konnte nicht durchgeführt werden.')
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

export async function runGeoAuditLead(req, res) {
  const { auditId, email, name, locale, consent } = req.body || {};
  const safeLocale = locale === 'en' ? 'en' : 'de';
  const safeConsent = consent === true || consent === 'true' || consent === 1 || consent === '1';
  const consentText = safeLocale === 'en'
    ? 'I agree to newsletter signup and to receive the requested detailed GEO report by email.'
    : 'Ich stimme der Newsletter-Anmeldung zu und möchte den detaillierten GEO-Report per E-Mail erhalten.';

  try {
    const response = await requestGeoTesterLead({
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
        ? 'The GEO report request could not be processed.'
        : 'Die GEO-Report-Anfrage konnte nicht verarbeitet werden.')
    });
  }
}

export async function runSeoAuditLead(req, res) {
  const { auditId, email, name, locale, consent } = req.body || {};
  const safeLocale = locale === 'en' ? 'en' : 'de';
  const safeConsent = consent === true || consent === 'true' || consent === 1 || consent === '1';
  const consentText = safeLocale === 'en'
    ? 'I want to receive the requested detailed SEO report by email.'
    : 'Ich möchte den angeforderten detaillierten SEO-Report per E-Mail erhalten.';

  try {
    const response = await requestSeoTesterLead({
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
        ? 'The SEO report request could not be processed.'
        : 'Die SEO-Report-Anfrage konnte nicht verarbeitet werden.')
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

export async function confirmGeoAuditLead(req, res) {
  const requestedLocale = req.params?.lng === 'en' ? 'en' : 'de';
  const token = String(req.query?.token || '').trim();

  const viewModel = await confirmGeoTesterLeadToken({
    token,
    locale: requestedLocale
  });

  const isEn = viewModel.locale === 'en';
  const base = (res.locals.canonicalBaseUrl || 'https://komplettwebdesign.de').replace(/\/$/, '');
  const pagePath = isEn ? '/en/website-tester/geo/report-confirm' : '/website-tester/geo/report-confirm';
  const canonical = `${base}${pagePath}`;

  res.render('geo_tester_confirm', {
    lng: viewModel.locale,
    title: isEn ? 'GEO Tester report confirmation' : 'GEO-Tester Report-Bestätigung',
    description: isEn
      ? 'Confirm your email and receive your detailed GEO optimization report.'
      : 'Bestätige deine E-Mail und erhalte deinen detaillierten GEO-Optimierungsreport.',
    canonicalUrl: canonical,
    robots: 'noindex,nofollow',
    confirmView: viewModel,
    seoExtra: `
      <meta property="og:type" content="website">
      <meta property="og:title" content="${isEn ? 'GEO Tester report confirmation' : 'GEO-Tester Report-Bestätigung'}">
      <meta property="og:description" content="${isEn ? 'Email confirmation for your detailed GEO PDF report.' : 'E-Mail-Bestätigung für deinen detaillierten GEO-Report.'}">
      <meta property="og:url" content="${canonical}">
    `
  });
}

export async function confirmSeoAuditLead(req, res) {
  const requestedLocale = req.params?.lng === 'en' ? 'en' : 'de';
  const token = String(req.query?.token || '').trim();

  const viewModel = await confirmSeoTesterLeadToken({
    token,
    locale: requestedLocale
  });

  const isEn = viewModel.locale === 'en';
  const base = (res.locals.canonicalBaseUrl || 'https://komplettwebdesign.de').replace(/\/$/, '');
  const pagePath = isEn ? '/en/website-tester/seo/report-confirm' : '/website-tester/seo/report-confirm';
  const canonical = `${base}${pagePath}`;

  res.render('seo_tester_confirm', {
    lng: viewModel.locale,
    title: isEn ? 'SEO Tester report confirmation' : 'SEO-Tester Report-Bestätigung',
    description: isEn
      ? 'Confirm your email and receive your detailed SEO report.'
      : 'Bestätige deine E-Mail und erhalte deinen detaillierten SEO-Report.',
    canonicalUrl: canonical,
    robots: 'noindex,nofollow',
    confirmView: viewModel,
    seoExtra: `
      <meta property="og:type" content="website">
      <meta property="og:title" content="${isEn ? 'SEO Tester report confirmation' : 'SEO-Tester Report-Bestätigung'}">
      <meta property="og:description" content="${isEn ? 'Email confirmation for your detailed SEO PDF report.' : 'E-Mail-Bestätigung für deinen detaillierten SEO-Report.'}">
      <meta property="og:url" content="${canonical}">
    `
  });
}
