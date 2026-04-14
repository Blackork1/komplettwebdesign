const MAX_PAGE_COUNT = 3;

function localeFrom(rawLocale) {
  return rawLocale === 'en' ? 'en' : 'de';
}

function normalizeText(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function tokenize(value = '') {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9äöüß\s-]/gi, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 3);
}

function containsAnyToken(haystack = '', tokens = []) {
  if (!tokens.length) return 0;
  const source = tokenize(haystack);
  if (!source.length) return 0;
  const unique = new Set(source);
  const hits = tokens.filter((token) => unique.has(token)).length;
  return hits / tokens.length;
}

function clampPercent(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function resolveProfile(rawSource = '') {
  const source = String(rawSource || '').trim().toLowerCase();
  if (source === 'geo') return 'geo';
  if (source === 'seo') return 'seo';
  return 'website';
}

function resolveSourceResult(result = {}) {
  if (result?.sourceResult && typeof result.sourceResult === 'object') {
    return result.sourceResult;
  }
  return result;
}

function normalizeUrl(value = '') {
  return normalizeText(value).toLowerCase().replace(/\/$/, '');
}

function pageTypeFromUrl(url = '', homepageUrl = '') {
  const normalized = normalizeUrl(url);
  if (!normalized) return 'landing';
  if (homepageUrl && normalized === normalizeUrl(homepageUrl)) return 'homepage';
  if (/kontakt|contact|anfrage|booking|termin/.test(normalized)) return 'contact';
  if (/paket|preise|pricing|price/.test(normalized)) return 'package';
  if (/leistung|services|service|angebote|angebot/.test(normalized)) return 'service';
  if (/ueber-uns|über-uns|about/.test(normalized)) return 'about';
  if (/blog|ratgeber|news|artikel/.test(normalized)) return 'article';
  if (/faq|fragen/.test(normalized)) return 'faq';
  return 'landing';
}

function titleCase(value = '') {
  return String(value || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function domainBrandFromUrl(url = '') {
  try {
    const hostname = new URL(String(url || '')).hostname.replace(/^www\./i, '');
    const root = hostname.split('.')[0] || '';
    if (!root) return '';

    const mapped = root
      .replace(/komplettwebdesign/gi, 'komplett webdesign')
      .replace(/webdesign/gi, ' webdesign ')
      .replace(/agentur/gi, ' agentur ')
      .replace(/studio/gi, ' studio ')
      .replace(/seo/gi, ' seo ')
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return titleCase(mapped).slice(0, 80);
  } catch {
    return '';
  }
}

function isGenericBrandCandidate(value = '', context = {}) {
  const text = normalizeText(value).toLowerCase();
  if (!text) return true;
  if (/komplett webdesign/.test(text)) return false;

  const intentTokens = [
    ...tokenize(context?.primaryService || ''),
    ...tokenize(context?.targetRegion || '')
  ];
  const intentCoverage = containsAnyToken(text, intentTokens);
  const genericWordHits = (text.match(/\b(webseite|website|webdesign|seo|kontakt|preise|pakete|leistung|service|berlin|hamburg|muenchen|munich|erstellen|lassen|anfrage|booking|termin)\b/g) || []).length;

  if (intentCoverage >= 0.5) return true;
  if (genericWordHits >= 2) return true;
  if (text.split(/\s+/).length > 6) return true;
  return false;
}

function inferBrandName(sourceResult = {}, pageAnalyses = [], context = {}) {
  const homepage = pageAnalyses.find((page) => pageTypeFromUrl(page?.url, sourceResult?.finalUrl) === 'homepage');
  const homepageRaw = normalizeText(homepage?.title || '');
  const homepageCandidate = normalizeText((homepageRaw.split('|')[0] || homepageRaw).replace(/https?:\/\//gi, '').replace(/^www\./i, ''));
  const domainCandidate = domainBrandFromUrl(sourceResult?.finalUrl || sourceResult?.normalizedUrl || '');

  if (homepageCandidate && homepageCandidate.length >= 3 && !isGenericBrandCandidate(homepageCandidate, context)) {
    return homepageCandidate.slice(0, 80);
  }
  if (domainCandidate && domainCandidate.length >= 3) {
    return domainCandidate.slice(0, 80);
  }
  return 'Komplett Webdesign';
}

function scorePagePriority(page = {}, context = {}, homepageUrl = '') {
  const serviceTokens = tokenize(context.primaryService || '');
  const regionTokens = tokenize(context.targetRegion || '');
  const businessTokens = tokenize(context.businessType || '');
  const intentTokens = [...new Set([...serviceTokens, ...regionTokens, ...businessTokens])];

  const textBlock = [
    page.title,
    page.metaDescription,
    page.h1,
    page.bodyText
  ].filter(Boolean).join(' ');

  const pageType = page.pageType || pageTypeFromUrl(page.url, homepageUrl);
  const intentCoverage = containsAnyToken(textBlock, intentTokens);
  const intentGap = 1 - intentCoverage;

  const conversionSignal = [
    page.hasContactLink ? 1 : 0,
    page.hasPhone ? 1 : 0,
    page.hasEmail ? 1 : 0,
    (page.buttons || 0) > 0 ? 1 : 0
  ].reduce((sum, item) => sum + item, 0) / 4;
  const conversionGap = 1 - conversionSignal;

  const structureSignal = [
    page.h1Count === 1 ? 1 : 0,
    page.hasMain ? 1 : 0,
    page.hasHeader ? 1 : 0,
    page.hasFooter ? 1 : 0,
    page.hasNav ? 1 : 0,
    page.hasSchema ? 1 : 0
  ].reduce((sum, item) => sum + item, 0) / 6;
  const structureGap = 1 - structureSignal;

  const titleText = normalizeText(page.title || '').toLowerCase();
  const h1Text = normalizeText(page.h1 || '').toLowerCase();
  const contactClarityMissing = pageType === 'contact' && !/(kontakt|anfrage|erstgespräch|beratung|contact)/.test(`${titleText} ${h1Text}`)
    ? 0.25
    : 0;

  const performancePenalty = (page.scripts || 0) > 15 || (page.stylesheets || 0) > 8 ? 0.2 : 0;
  const contentPenalty = (page.wordCount || 0) < 350 ? 0.15 : 0;

  const pageTypeBoost = {
    homepage: 0.18,
    service: 0.14,
    package: 0.14,
    contact: 0.14,
    faq: 0.08,
    article: 0.05,
    about: 0.06,
    landing: 0.1
  }[pageType] || 0.08;

  const rawPriority = (intentGap * 0.34)
    + (conversionGap * 0.24)
    + (structureGap * 0.22)
    + pageTypeBoost
    + performancePenalty
    + contentPenalty
    + contactClarityMissing;

  return {
    priorityScore: clampPercent(rawPriority * 100),
    intentCoverage: clampPercent(intentCoverage * 100),
    conversionSignal: clampPercent(conversionSignal * 100),
    structureSignal: clampPercent(structureSignal * 100)
  };
}

function chooseTopPages(pageAnalyses = [], context = {}, homepageUrl = '') {
  const normalized = Array.isArray(pageAnalyses) ? pageAnalyses : [];
  const scored = normalized
    .map((page) => {
      const pageType = page.pageType || pageTypeFromUrl(page.url, homepageUrl);
      const scoring = scorePagePriority({ ...page, pageType }, context, homepageUrl);
      return {
        ...page,
        ...scoring,
        pageType
      };
    })
    .sort((a, b) => {
      if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
      return String(a.url || '').localeCompare(String(b.url || ''));
    });

  const homepage = scored.find((page) => page.pageType === 'homepage');
  if (!homepage) return scored.slice(0, MAX_PAGE_COUNT);

  const otherPages = scored.filter((page) => page.url !== homepage.url);
  return [homepage, ...otherPages.slice(0, Math.max(0, MAX_PAGE_COUNT - 1))];
}

function pageGoalByType(pageType = 'landing', locale = 'de') {
  const lng = localeFrom(locale);
  const goals = {
    de: {
      homepage: 'Sofortiges Vertrauen + klare Positionierung + erster qualifizierter CTA.',
      contact: 'Kontaktaufnahme ohne Hürden mit klarer Erwartung für den nächsten Schritt.',
      package: 'Preis- und Leistungsverständnis ohne Rückfragen + klare Angebotsanfrage.',
      service: 'Leistungsverständnis mit Nutzen, Ablauf und nächstem Schritt.',
      faq: 'Schnelle Beantwortung typischer Einwände mit direkter Weiterführung zur Anfrage.',
      article: 'Informationsintent bedienen und qualifiziert zur Leistungsseite leiten.',
      about: 'Vertrauen über Person/Unternehmen stärken und zur Kontaktaufnahme führen.',
      landing: 'Hauptintent abdecken, Nutzen zeigen und Handlung auslösen.'
    },
    en: {
      homepage: 'Immediate trust + clear positioning + first qualified CTA.',
      contact: 'Frictionless contact conversion with clear next-step expectation.',
      package: 'Transparent pricing and scope understanding + clear inquiry trigger.',
      service: 'Service understanding with value, process, and next step.',
      faq: 'Answer objections quickly and route users to contact.',
      article: 'Serve informational intent and route qualified users to service/contact pages.',
      about: 'Build trust through founder/company context and move to contact.',
      landing: 'Cover primary intent, show value, and trigger action.'
    }
  };

  return goals[lng][pageType] || goals[lng].landing;
}

function buildTargetMetadata({ profile, pageType, context, brand, locale = 'de' }) {
  const lng = localeFrom(locale);
  const service = normalizeText(context.primaryService || (lng === 'en' ? 'Web design' : 'Webdesign'));
  const region = normalizeText(context.targetRegion || (lng === 'en' ? 'Berlin' : 'Berlin'));

  if (lng === 'en') {
    if (pageType === 'contact') {
      return {
        title: `Contact for ${service} in ${region} | ${brand}`,
        h1: `Start your ${service} project in ${region}`,
        metaDescription: `Use the contact form to request your ${service} project in ${region}. You get a clear response time, direct contact options, and a focused first consultation.`
      };
    }
    if (pageType === 'homepage') {
      return {
        title: `${service} in ${region} | ${brand}`,
        h1: `${service} in ${region} with clear strategy, design, and implementation`,
        metaDescription: `${service} in ${region} with strategy, SEO, and conversion focus. Get transparent packages, measurable outcomes, and fast project onboarding.`
      };
    }
    if (pageType === 'package') {
      return {
        title: `${service} pricing in ${region} | Packages and scope`,
        h1: `${service}: packages, deliverables, and costs in ${region}`,
        metaDescription: `Compare ${service} packages in ${region}: scope, timelines, add-ons, and expected outcomes. Request your tailored offer directly.`
      };
    }

    return {
      title: `${service} in ${region} | Benefits, process, and results`,
      h1: `${service} in ${region}: clear process and measurable outcomes`,
      metaDescription: `${service} in ${region} with clear structure, trust signals, and conversion-focused UX. Learn scope, timeline, and next steps.`
    };
  }

  if (pageType === 'contact') {
    return {
      title: `Kontakt für ${service} in ${region} | ${brand}`,
      h1: `Kontakt aufnehmen: ${service} in ${region} starten`,
      metaDescription: `Nutze das Kontaktformular für dein ${service}-Projekt in ${region}. Du erhältst klare Antwortzeiten, direkte Kontaktoptionen und ein fokussiertes Erstgespräch.`
    };
  }

  if (pageType === 'homepage') {
    return {
      title: `${service} in ${region} | ${brand}`,
      h1: `${service} in ${region} mit klarer Strategie, Design und Umsetzung`,
      metaDescription: `${service} in ${region} mit Strategie, SEO und Conversion-Fokus. Transparente Pakete, messbare Ergebnisse und schneller Projektstart.`
    };
  }

  if (pageType === 'package') {
    return {
      title: `Preise für ${service} in ${region} | Pakete und Umfang`,
      h1: `${service}: Pakete, Leistungen und Kosten in ${region}`,
      metaDescription: `Vergleiche ${service}-Pakete in ${region}: Leistungsumfang, Zeitrahmen, Add-ons und erwartete Ergebnisse. Angebot direkt anfragen.`
    };
  }

  return {
    title: `${service} in ${region} | Nutzen, Ablauf und Ergebnisse`,
    h1: `${service} in ${region}: klarer Ablauf und messbare Ergebnisse`,
    metaDescription: `${service} in ${region} mit klarer Struktur, starken Vertrauenssignalen und conversion-orientierter UX. Erfahre Umfang, Zeitplan und nächste Schritte.`
  };
}

function faqForPage({ pageType, context, locale = 'de' }) {
  const lng = localeFrom(locale);
  const service = normalizeText(context.primaryService || (lng === 'en' ? 'web design' : 'Webdesign'));
  const region = normalizeText(context.targetRegion || (lng === 'en' ? 'Berlin' : 'Berlin'));

  if (lng === 'en') {
    if (pageType === 'contact') {
      return [
        {
          q: `What happens after I submit the contact form?`,
          a: `You receive a confirmation quickly and we review your request based on goals, timeline, and scope. Then we schedule a focused first call and clarify the best implementation path for your ${service} project in ${region}.`
        },
        {
          q: `How fast do you reply?`,
          a: `Typical response time is within one business day. For urgent launches, mention your deadline in the form so we can prioritize feasibility and propose a realistic rollout plan.`
        },
        {
          q: `What should I include in my request?`,
          a: `Share your business context, target audience, main service, region, and timeline. The clearer your brief, the more precise our first recommendations and project estimate will be.`
        },
        {
          q: `Do you also support SEO and hosting?`,
          a: `Yes. Projects can include positioning, design, implementation, SEO setup, hosting, and maintenance. We align scope based on your growth stage and internal resources.`
        },
        {
          q: `Can we start with a small scope?`,
          a: `Absolutely. We can begin with a focused MVP page set and scale in structured phases. This keeps budget risk lower and allows validation before expansion.`
        },
        {
          q: `How is success measured?`,
          a: `Before implementation we define measurable KPIs such as qualified leads, conversion rate, CTR, and intent-page rankings. This makes decisions transparent and impact-driven.`
        }
      ];
    }

    return [
      {
        q: `How long does a ${service} project in ${region} take?`,
        a: `Depending on scope, a focused launch can go live within a few weeks. We define milestones for strategy, copy, design, implementation, and QA so timelines stay predictable.`
      },
      {
        q: `Which package is right for my business?`,
        a: `That depends on your goals, sales cycle, and existing assets. We map your requirements to a practical baseline scope and avoid oversized packages that do not create immediate value.`
      },
      {
        q: `Do you handle SEO and GEO as well?`,
        a: `Yes. We integrate classic on-page SEO and GEO-friendly structures such as answer-first blocks, FAQ modules, and clear entity signals where relevant.`
      },
      {
        q: `Can existing content be reused?`,
        a: `Usually yes. We audit current assets, keep what works, and rewrite weak sections to improve clarity, rankings, and conversion performance.`
      },
      {
        q: `How are costs structured?`,
        a: `You receive transparent package pricing plus optional add-ons. This gives planning security while still allowing staged upgrades based on results.`
      },
      {
        q: `What happens after launch?`,
        a: `Post-launch we monitor performance, fix conversion bottlenecks, and iterate based on data. This turns the website into a growth asset instead of a static brochure.`
      }
    ];
  }

  if (pageType === 'contact') {
    return [
      {
        q: 'Was passiert nach dem Absenden des Kontaktformulars?',
        a: `Du erhältst zeitnah eine Bestätigung, wir prüfen dein Anliegen nach Ziel, Zeitrahmen und Umfang und vereinbaren danach ein fokussiertes Erstgespräch für dein ${service}-Projekt in ${region}.`
      },
      {
        q: 'Wie schnell erhalte ich eine Rückmeldung?',
        a: 'In der Regel innerhalb eines Werktages. Wenn dein Projekt zeitkritisch ist, nenne im Formular bitte die Deadline, damit wir die Machbarkeit direkt priorisieren können.'
      },
      {
        q: 'Welche Angaben sollte ich im Formular machen?',
        a: 'Hilfreich sind Branche, Zielgruppe, Hauptleistung, Region, aktueller Stand und gewünschter Starttermin. Je klarer die Angaben, desto präziser das Erstfeedback.'
      },
      {
        q: 'Begleitet ihr auch SEO und Hosting?',
        a: 'Ja. Je nach Bedarf übernehmen wir Positionierung, Design, Umsetzung, SEO-Basis, Hosting-Setup und Wartung. Der Umfang wird auf dein Ziel und Budget abgestimmt.'
      },
      {
        q: 'Kann man mit einem kleineren Paket starten?',
        a: 'Ja, wir können mit einer klar priorisierten Basis starten und danach in Phasen ausbauen. So reduzierst du Risiko und siehst schneller erste Ergebnisse.'
      },
      {
        q: 'Wie wird der Erfolg gemessen?',
        a: 'Vor der Umsetzung definieren wir klare KPIs wie qualifizierte Anfragen, Conversion-Rate, CTR und Rankings relevanter Intent-Seiten. Dadurch werden Entscheidungen messbar.'
      }
    ];
  }

  return [
    {
      q: `Wie lange dauert ein ${service}-Projekt in ${region}?`,
      a: 'Je nach Umfang kann ein fokussierter Launch in wenigen Wochen live gehen. Wir arbeiten mit klaren Meilensteinen für Strategie, Inhalte, Design, Umsetzung und QA.'
    },
    {
      q: 'Welches Paket passt zu meinem Unternehmen?',
      a: 'Das hängt von Ziel, Vertriebsprozess und vorhandenem Material ab. Wir empfehlen dir den kleinsten sinnvollen Umfang, der schnell messbaren Nutzen liefert.'
    },
    {
      q: 'Sind SEO und GEO direkt enthalten?',
      a: 'Ja, je nach Paket integrieren wir OnPage-SEO und GEO-freundliche Strukturblöcke wie answer-first Elemente, FAQ-Module und klare Entity-Signale.'
    },
    {
      q: 'Kann bestehender Content weiter genutzt werden?',
      a: 'In vielen Fällen ja. Wir übernehmen funktionierende Inhalte und überarbeiten schwache Abschnitte für bessere Klarheit, Auffindbarkeit und Conversion.'
    },
    {
      q: 'Wie transparent sind die Kosten?',
      a: 'Du erhältst transparente Paketpreise plus optionale Add-ons. Damit hast du Planungssicherheit und kannst trotzdem schrittweise ausbauen.'
    },
    {
      q: 'Wie geht es nach dem Launch weiter?',
      a: 'Nach dem Livegang begleiten wir Monitoring, Optimierung und Priorisierung weiterer Maßnahmen, damit die Website nachhaltig Ergebnisse liefert.'
    }
  ];
}

function sectionBlueprintByType({ pageType, profile, context, locale = 'de' }) {
  const lng = localeFrom(locale);
  const service = normalizeText(context.primaryService || (lng === 'en' ? 'Web design' : 'Webdesign'));
  const region = normalizeText(context.targetRegion || (lng === 'en' ? 'Berlin' : 'Berlin'));

  const profileHint = profile === 'geo'
    ? (lng === 'en'
      ? 'Add one concise answer-first summary and ensure entity/contact consistency in this section.'
      : 'In diesem Abschnitt eine prägnante answer-first Zusammenfassung ergänzen und Entity-/Kontaktdaten konsistent halten.')
    : (lng === 'en'
      ? 'Place primary intent terms naturally in heading and first paragraph, then support with internal links.'
      : 'Primäre Intent-Begriffe natürlich in Überschrift und ersten Absatz einbauen, danach mit internen Links stützen.');

  if (lng === 'en') {
    if (pageType === 'contact') {
      return [
        { heading: 'Primary contact promise', purpose: 'Set expectation for response time and consultation value.', targetWords: '80-120', draftText: `Start with a clear promise for ${service} inquiries in ${region}, including expected response time and what users get in the first call.` },
        { heading: 'Contact options and preferred path', purpose: 'Reduce friction and route users quickly to form submission.', targetWords: '100-140', draftText: 'Offer form-first flow plus phone/email fallback with clear use cases for each option.' },
        { heading: 'Project brief helper block', purpose: 'Improve lead quality by guiding what users should submit.', targetWords: '120-180', draftText: 'Provide a short checklist: business context, target region, service focus, timeline, and budget range.' },
        { heading: 'Trust and delivery reliability', purpose: 'Increase confidence before form submission.', targetWords: '120-160', draftText: 'Show location, references, process reliability, and transparent next steps after submission.' },
        { heading: 'FAQ for contact objections', purpose: 'Remove hesitation and pre-qualify requests.', targetWords: '280-420', draftText: 'Include at least 6 concise FAQ answers focused on response, process, pricing, and timeline.' },
        { heading: 'Strong conversion block', purpose: 'Trigger immediate action.', targetWords: '70-120', draftText: 'Close with one primary CTA and one fallback CTA (call or booking).' }
      ].map((item) => ({ ...item, profileHint }));
    }

    if (pageType === 'package') {
      return [
        { heading: 'Who each package is for', purpose: 'Help users self-select quickly.', targetWords: '120-180', draftText: `Explain package fit by business stage and growth goals for ${service} in ${region}.` },
        { heading: 'Package comparison table', purpose: 'Make scope differences obvious.', targetWords: '140-200', draftText: 'Compare deliverables, timelines, included revisions, and support boundaries.' },
        { heading: 'Process and timeline', purpose: 'Reduce uncertainty.', targetWords: '120-180', draftText: 'Break project execution into milestones from kickoff to launch.' },
        { heading: 'Optional add-ons and scaling path', purpose: 'Capture upsell intent without confusion.', targetWords: '120-170', draftText: 'List optional modules like SEO growth, content expansion, and maintenance.' },
        { heading: 'FAQ on pricing and decisions', purpose: 'Handle key objections before inquiry.', targetWords: '280-420', draftText: 'Add six practical FAQ answers on pricing, scope changes, and ownership.' },
        { heading: 'Offer request CTA', purpose: 'Move users into qualified inquiry.', targetWords: '70-120', draftText: 'Add a clear "request offer" CTA with expected response timing.' }
      ].map((item) => ({ ...item, profileHint }));
    }

    return [
      { heading: `Positioning for ${service} in ${region}`, purpose: 'Make value proposition instantly clear.', targetWords: '120-180', draftText: 'State target audience, concrete outcome, and differentiation in plain language.' },
      { heading: 'Core services and outcomes', purpose: 'Show what is delivered and why it matters.', targetWords: '180-260', draftText: 'Describe each core module with expected business outcomes, not only features.' },
      { heading: 'Process and implementation steps', purpose: 'Build trust through transparency.', targetWords: '160-220', draftText: 'Explain the collaboration process from discovery to launch and optimization.' },
      { heading: 'Proof and trust section', purpose: 'Strengthen confidence and authority.', targetWords: '140-220', draftText: 'Add references, location data, contact details, and quality guarantees.' },
      { heading: 'FAQ and answer blocks', purpose: 'Capture informational intent and support snippets.', targetWords: '280-420', draftText: 'Add six actionable FAQ answers matching high-intent pre-sales questions.' },
      { heading: 'Primary CTA section', purpose: 'Convert intent into action.', targetWords: '80-130', draftText: 'End with one primary CTA and one low-friction secondary CTA.' }
    ].map((item) => ({ ...item, profileHint }));
  }

  if (pageType === 'contact') {
    return [
      { heading: 'Kontaktversprechen oberhalb des Formulars', purpose: 'Erwartung für Rückmeldung und Nutzen des Erstgesprächs klären.', targetWords: '80-120', draftText: `Starte mit einem klaren Versprechen für ${service}-Anfragen in ${region}: Reaktionszeit, nächster Schritt und Nutzen des Erstgesprächs.` },
      { heading: 'Kontaktwege mit klarer Empfehlung', purpose: 'Reibung reduzieren und Formularabschluss erhöhen.', targetWords: '100-140', draftText: 'Formular als primären Weg kommunizieren, Telefon/E-Mail als Alternative mit konkreter Einordnung.' },
      { heading: 'Projekt-Briefing Hilfe', purpose: 'Qualität der Anfragen erhöhen.', targetWords: '120-180', draftText: 'Kurze Liste, welche Angaben sinnvoll sind: Branche, Zielgruppe, Leistung, Region, Zeitrahmen, Budgetrahmen.' },
      { heading: 'Vertrauen und Verlässlichkeit', purpose: 'Sicherheit vor dem Absenden schaffen.', targetWords: '120-160', draftText: 'Standort, Referenzen, klare Prozessschritte und transparente Reaktionszeiten zeigen.' },
      { heading: 'FAQ für Kontakt-Einwände', purpose: 'Hürden abbauen und qualifizieren.', targetWords: '280-420', draftText: 'Mindestens 6 FAQs zu Rückmeldung, Ablauf, Kosten, Starttermin und Umfang.' },
      { heading: 'Starker Abschluss-CTA', purpose: 'Direkte Handlung auslösen.', targetWords: '70-120', draftText: 'Ein primärer CTA (Formular absenden) plus sekundärer CTA (Termin buchen/Anrufen).' }
    ].map((item) => ({ ...item, profileHint }));
  }

  if (pageType === 'package') {
    return [
      { heading: 'Für wen welches Paket passt', purpose: 'Selbstselektion erleichtern.', targetWords: '120-180', draftText: `Pakete nach Unternehmensphase und Zielbild für ${service} in ${region} einordnen.` },
      { heading: 'Paketvergleich mit Leistungsgrenzen', purpose: 'Unterschiede sofort verständlich machen.', targetWords: '140-200', draftText: 'Lieferumfang, Zeitrahmen, Revisionen und Support je Paket klar gegenüberstellen.' },
      { heading: 'Ablauf und Zeitplanung', purpose: 'Planungssicherheit schaffen.', targetWords: '120-180', draftText: 'Umsetzung in klaren Meilensteinen vom Kickoff bis zum Launch darstellen.' },
      { heading: 'Add-ons und Ausbaupfad', purpose: 'Erweiterungen ohne Überforderung anbieten.', targetWords: '120-170', draftText: 'Optionale Module wie SEO-Ausbau, Content-Erweiterung und Wartung strukturiert darstellen.' },
      { heading: 'FAQ zu Kosten und Entscheidung', purpose: 'Einwände vor Angebotsanfrage lösen.', targetWords: '280-420', draftText: 'Sechs praxisnahe FAQs zu Kosten, Änderungen, Eigentumsrechten und Startbedingungen.' },
      { heading: 'Angebots-CTA', purpose: 'Nächsten Schritt auslösen.', targetWords: '70-120', draftText: 'Klarer CTA zur Angebotsanfrage inkl. erwarteter Rückmeldezeit.' }
    ].map((item) => ({ ...item, profileHint }));
  }

  return [
    { heading: `${service} in ${region}: klare Positionierung`, purpose: 'Leistungsversprechen sofort verständlich machen.', targetWords: '120-180', draftText: 'Zielgruppe, Ergebnis und Differenzierung in klarer Sprache formulieren.' },
    { heading: 'Leistungen und konkrete Ergebnisse', purpose: 'Lieferumfang und Nutzen sichtbar machen.', targetWords: '180-260', draftText: 'Kernmodule mit erwartetem Business-Nutzen statt nur Featureliste darstellen.' },
    { heading: 'Ablauf und Umsetzungsschritte', purpose: 'Transparenz und Vertrauen erhöhen.', targetWords: '160-220', draftText: 'Zusammenarbeit von Analyse bis Launch und Optimierung nachvollziehbar erklären.' },
    { heading: 'Trust- und Nachweisbereich', purpose: 'Glaubwürdigkeit steigern.', targetWords: '140-220', draftText: 'Referenzen, Standortdaten, Kontaktdaten und Qualitätszusagen sichtbar integrieren.' },
    { heading: 'FAQ und Antwortblöcke', purpose: 'Informationsintent abdecken und Snippet-Chancen erhöhen.', targetWords: '280-420', draftText: 'Sechs handlungsorientierte FAQs mit klaren Antworten auf Vorverkaufsfragen.' },
    { heading: 'Primärer CTA-Abschnitt', purpose: 'Konversion auslösen.', targetWords: '80-130', draftText: 'Ein primärer CTA plus niedrigschwelliger sekundärer CTA direkt nach FAQ.' }
  ].map((item) => ({ ...item, profileHint }));
}

function fullCopyDraft({ pageType, profile, context, metadata, locale = 'de' }) {
  const lng = localeFrom(locale);
  const service = normalizeText(context.primaryService || (lng === 'en' ? 'web design' : 'Webdesign'));
  const region = normalizeText(context.targetRegion || (lng === 'en' ? 'Berlin' : 'Berlin'));
  const business = normalizeText(context.businessType || (lng === 'en' ? 'service businesses' : 'Unternehmen'));

  const profileLine = profile === 'geo'
    ? (lng === 'en'
      ? 'The copy is tailored for human users and AI-assisted discovery through clear answers, consistent facts, and concise structure.'
      : 'Die Texte sind auf Nutzer und AI-gestützte Auffindbarkeit ausgerichtet: klare Antworten, konsistente Fakten, präzise Struktur.')
    : (lng === 'en'
      ? 'The page is optimized for ranking and conversion through clear intent mapping, structured copy, and internal linking.'
      : 'Die Seite ist für Ranking und Conversion optimiert: durch klare Intent-Zuordnung, strukturierte Texte und interne Verlinkung.');

  if (lng === 'en') {
    if (pageType === 'contact') {
      return {
        heroHeadline: metadata.h1,
        heroSubline: `Use the contact form to get a focused first consultation for your ${service} project in ${region}.`,
        introParagraph: `If someone is ready for ${service} in ${region}, the contact page must remove uncertainty and make the next step obvious. Explain what happens after submission, how quickly users receive a response, and which project details are needed for a useful first recommendation. ${profileLine}`,
        sectionDrafts: [
          {
            heading: 'Contact promise above the form',
            body: `Add a short promise block directly above the form: response within one business day, first consultation scope, and expected next step. This reduces hesitation and makes the page feel professional and reliable. Users should know immediately whether they are in the right place and what value they get before sharing their details.`
          },
          {
            heading: 'Form guidance that improves lead quality',
            body: `Add helper text for each critical field: business type, primary service, target region, timeline, and desired outcome. Keep placeholders concrete and practical. This improves request quality, reduces clarification loops, and allows your first reply to include tailored recommendations instead of generic follow-up questions.`
          },
          {
            heading: 'Contact options with one clear primary path',
            body: `Use the contact form as the primary CTA and keep phone/booking as secondary options. Explain when each option is best: form for structured requests, phone for urgent cases, booking for direct scheduling. A clear hierarchy improves completion rates while still offering flexibility for different user preferences.`
          },
          {
            heading: 'Trust signals before submit',
            body: `Place concrete trust proof directly near the submit button: location, references, transparent process, and realistic response times. Keep this block factual and short. It should reassure users that they will receive a serious response and that their project request does not disappear into a generic inbox.`
          },
          {
            heading: 'FAQ for contact objections',
            body: `Include six concise FAQ answers that remove typical friction: response speed, required information, project start timeline, budget framing, and scope clarity. Each answer should lead naturally to the next action. This gives users confidence and reduces uncertainty that often prevents a form submission.`
          },
          {
            heading: 'Conversion close with clear microcopy',
            body: `Use one primary close CTA such as “Send project request now” and one fallback CTA like “Book first consultation.” Add short microcopy under the button: “No obligation, response within one business day.” This combination improves clarity and supports conversion without aggressive wording.`
          }
        ],
        ctaPrimary: 'Send project request now',
        ctaSecondary: 'Book first consultation'
      };
    }

    if (pageType === 'package') {
      return {
        heroHeadline: metadata.h1,
        heroSubline: `${service} packages in ${region} with transparent scope, timeline, and decision-ready pricing context.`,
        introParagraph: `A package page should make decisions easier, not harder. Users need fast orientation: which package fits their stage, what is included, what is optional, and what outcome they can expect. Keep wording concrete and remove vague marketing statements. ${profileLine}`,
        sectionDrafts: [
          {
            heading: 'Who each package is for',
            body: `Start with a role-based orientation: startup launch, growth phase, or established company redesign. Users should recognize themselves in under 10 seconds. Add one short “best fit” sentence per package so the page supports self-selection before users compare details line by line.`
          },
          {
            heading: 'Scope comparison with clear boundaries',
            body: `Present package differences in a comparison block: pages included, SEO baseline, revision rounds, handover, and support window. Explicitly state boundaries to reduce misunderstandings. Clear scope framing lowers sales friction, sets realistic expectations, and improves lead quality for offer requests.`
          },
          {
            heading: 'Process and timeline transparency',
            body: `Show your delivery process in milestones with realistic durations: kickoff, structure/copy, design/development, QA, launch. Add what the client provides in each phase. This builds trust and helps users understand that projects follow a structured method, not an undefined open-ended process.`
          },
          {
            heading: 'Add-ons and scale path',
            body: `List add-ons as optional modules with practical outcomes: SEO growth, ongoing content, maintenance, analytics improvement. Position them as stage-two upgrades, not forced upsells. This keeps the core offer clear while still allowing expansion once baseline results are achieved.`
          },
          {
            heading: 'FAQ for pricing decisions',
            body: `Answer recurring pricing questions directly: what influences total cost, how changes are handled, who owns the website assets, and which recurring costs exist. Keep answers factual and concrete. Strong FAQ clarity reduces uncertainty and increases readiness to submit a qualified request.`
          },
          {
            heading: 'Offer request CTA',
            body: `Close the page with one dominant CTA such as “Request tailored offer.” Add supporting microcopy: expected response time and what users receive first (scope check + recommendation). This turns package comparison intent into measurable lead actions without overloading the user with extra decisions.`
          }
        ],
        ctaPrimary: 'Request consultation',
        ctaSecondary: 'Book project call'
      };
    }

    return {
      heroHeadline: metadata.h1,
      heroSubline: `${service} in ${region} with clear scope, measurable outcomes, and practical implementation guidance.`,
      introParagraph: `Users evaluating ${service} in ${region} need fast orientation: what you offer, for whom it is relevant, and what happens next. Homepage and service pages should connect positioning, proof, and CTA in one coherent flow without generic filler text. ${profileLine}`,
      sectionDrafts: [
        {
          heading: 'Positioning with outcome focus',
          body: `Open with a clear positioning statement for ${business} in ${region}. Explain concrete outcomes users can expect: better qualified inquiries, stronger trust perception, and a smoother conversion path. Keep language specific and practical so users can quickly assess relevance.`
        },
        {
          heading: 'Core services and expected results',
          body: `Describe the core modules and attach each to a practical result. Example: structure and copy improve message clarity, SEO baseline improves discoverability, technical implementation improves speed and usability. Outcome-oriented service descriptions outperform long feature-only lists.`
        },
        {
          heading: 'Process transparency and timeline',
          body: `Show your project process in understandable phases with short explanations and expected durations. Users should understand how collaboration works, what input is needed from them, and when milestones are reached. This lowers perceived risk and supports faster decision-making.`
        },
        {
          heading: 'Trust section with concrete proof',
          body: `Place real trust signals in one focused block: location, references, project examples, and communication reliability. Avoid vague claims. Users are more likely to convert when they can verify who you are, how you work, and what quality standards they can expect.`
        },
        {
          heading: 'FAQ for pre-sales questions',
          body: `Add six concise FAQ answers that mirror actual buying questions: timeline, budget range, scope changes, SEO support, hosting, and post-launch support. Each answer should reduce friction and route users naturally to the next step instead of ending the reading journey.`
        },
        {
          heading: 'Primary and secondary CTA block',
          body: `Use one dominant CTA (“Request consultation”) plus one lower-friction alternative (“Book call”). Repeat the CTA after key proof and FAQ sections. Visitors should never need to search for the next action, especially on mobile screens.`
        }
      ],
      ctaPrimary: 'Request consultation',
      ctaSecondary: 'Book project call'
    };
  }

  if (pageType === 'contact') {
    return {
      heroHeadline: metadata.h1,
      heroSubline: `Nutze das Kontaktformular und erhalte ein fokussiertes Erstgespräch für dein ${service}-Projekt in ${region}.`,
      introParagraph: `Wenn ein Nutzer für ${service} in ${region} bereit ist, muss die Kontaktseite Unsicherheit abbauen und den nächsten Schritt klar führen. Sie sollte sofort erklären, was nach dem Absenden passiert, wann eine Rückmeldung erfolgt und welche Angaben ein sinnvolles Erstfeedback ermöglichen. ${profileLine}`,
      sectionDrafts: [
        {
          heading: 'Kontaktversprechen oberhalb des Formulars',
          body: 'Setze direkt über dem Formular ein klares Versprechen: Rückmeldung innerhalb eines Werktags, kurze Bedarfseinordnung und konkrete nächste Schritte. Dieser Block sollte in 2-3 Sätzen erklären, welchen Nutzen das Erstgespräch bringt und welche Entscheidung der Interessent danach treffen kann.'
        },
        {
          heading: 'Kontaktwege mit klarer Priorität',
          body: 'Kommuniziere das Formular als primären Weg, ergänze Telefon/Terminbuchung als Alternativen für dringende oder direkte Anliegen. Diese Reihenfolge reduziert Entscheidungsstress, verbessert den Formularabschluss und hält den Prozess für Nutzer trotzdem flexibel.'
        },
        {
          heading: 'Projekt-Briefing Hilfe im Formular',
          body: 'Füge konkrete Formularhilfen ein: Branche, Hauptleistung, Zielregion, aktueller Stand, gewünschter Start und Ziel der Website. So erhältst du qualifiziertere Anfragen, reduzierst Rückfragen und kannst im Erstgespräch schneller zur passenden Umsetzungsoption führen.'
        },
        {
          heading: 'Vertrauen vor dem Absenden',
          body: 'Integriere Standort, Referenzhinweise, klare Reaktionszeiten und einen kurzen Ablaufblock („Anfrage – Einordnung – Erstgespräch – Angebot“). Diese Fakten sollten direkt im sichtbaren Bereich liegen, damit der Nutzer vor dem Klick auf „Absenden“ Sicherheit über Seriosität und Prozess bekommt.'
        },
        {
          heading: 'FAQ für Kontakt-Einwände',
          body: 'Beantworte typische Fragen präzise: Wie schnell erfolgt die Rückmeldung? Was kostet das Erstgespräch? Welche Informationen sind wichtig? Wie schnell kann gestartet werden? Gute FAQ-Antworten reduzieren Hürden und erhöhen die Wahrscheinlichkeit, dass der Nutzer die Anfrage wirklich absendet.'
        },
        {
          heading: 'Abschluss-CTA mit Microcopy',
          body: 'Nutze einen klaren Haupt-CTA wie „Jetzt Projektanfrage senden“ und ergänze eine kurze Sicherheitssatz darunter, z. B. „Unverbindlich, Rückmeldung innerhalb eines Werktags“. Kombiniere bei Bedarf einen sekundären CTA wie „Erstgespräch buchen“, um unterschiedliche Nutzertypen abzuholen.'
        }
      ],
      ctaPrimary: 'Jetzt Projektanfrage senden',
      ctaSecondary: 'Erstgespräch buchen'
    };
  }

  if (pageType === 'package') {
    return {
      heroHeadline: metadata.h1,
      heroSubline: `${service} in ${region} mit transparenter Paketlogik, klaren Leistungen und nachvollziehbarer Preisstruktur.`,
      introParagraph: `Eine Paketseite muss schnelle Entscheidungen ermöglichen: Welches Paket passt, was ist enthalten, welche Grenzen gibt es und was passiert danach? Der Inhalt sollte nicht wie eine unklare Featureliste wirken, sondern wie eine klare Entscheidungsgrundlage für ${business}. ${profileLine}`,
      sectionDrafts: [
        {
          heading: 'Paketwahl nach Ziel und Unternehmensphase',
          body: `Ordne jedes Paket klar einer Situation zu: Einstieg, Wachstum oder Ausbau. Nutzer sollten in wenigen Sekunden verstehen, wo sie sich einordnen. Ergänze je Paket eine kurze Aussage, welches Ergebnis typischerweise erreicht wird, damit die Entscheidung nicht nur über Preis, sondern über Nutzen getroffen wird.`
        },
        {
          heading: 'Vergleich mit klaren Leistungsgrenzen',
          body: 'Stelle die Pakete tabellarisch gegenüber: Seitenumfang, SEO-Basis, Revisionen, Übergabe, Supportdauer. Nenne bewusst auch Grenzen, damit es nach Angebotsstart keine Missverständnisse gibt. Klare Leistungsgrenzen erhöhen Vertrauen und senken späteren Abstimmungsaufwand.'
        },
        {
          heading: 'Ablauf und Zeitplanung je Paket',
          body: 'Erkläre den Projektablauf in Meilensteinen mit realistischer Zeitangabe: Kickoff, Struktur/Inhalte, Design/Entwicklung, QA, Livegang. Ergänze, welche Informationen du vom Kunden in welcher Phase benötigst. Damit wird aus Preisvergleich ein planbarer Projektstart.'
        },
        {
          heading: 'Add-ons und skalierbarer Ausbaupfad',
          body: 'Zeige optionale Erweiterungen wie SEO-Ausbau, weitere Leistungsseiten, Content-Updates oder Wartung als klar getrennte Add-ons. So bleibt das Kernpaket verständlich und Interessenten können trotzdem sehen, wie sie später ohne Relaunch skalieren können.'
        },
        {
          heading: 'FAQ zu Kosten, Änderungen und Besitzrechten',
          body: 'Beantworte die wichtigsten Entscheidungsfragen direkt auf der Seite: Was beeinflusst den Preis? Wie werden Änderungswünsche gehandhabt? Wem gehören Inhalte und Website nach Abschluss? Präzise Antworten verringern Unsicherheit und steigern die Qualität eingehender Anfragen.'
        },
        {
          heading: 'Angebots-CTA mit Erwartungsklärung',
          body: 'Schließe die Seite mit einem eindeutigen CTA wie „Individuelles Angebot anfragen“ ab und ergänze, was der Nutzer danach erhält: kurze Einordnung, empfohlene Paketoption, Zeit- und Budgetrahmen. Das schafft klare Erwartungen und erhöht die Conversion-Wahrscheinlichkeit.'
        }
      ],
      ctaPrimary: 'Beratung anfragen',
      ctaSecondary: 'Projektgespräch buchen'
    };
  }

  return {
    heroHeadline: metadata.h1,
    heroSubline: `${service} in ${region} mit klarem Leistungsumfang, messbaren Ergebnissen und praxisnaher Umsetzung.`,
    introParagraph: `Nutzer mit Suchintention zu ${service} in ${region} brauchen sofort Klarheit: Was bietest du konkret an, für wen ist es gedacht und wie läuft der nächste Schritt? Start- und Leistungsseiten sollten deshalb Positionierung, Nachweise und CTA logisch verbinden. Das gilt besonders für ${business}. ${profileLine}`,
    sectionDrafts: [
      {
        heading: 'Positionierung mit klarem Nutzenversprechen',
        body: `Starte mit einem kurzen Kernversprechen für ${service} in ${region}: für wen die Leistung gedacht ist, welches Ergebnis erreicht werden soll und wodurch dein Ansatz sich unterscheidet. Der erste sichtbare Bereich muss sofort verständlich sein und darf nicht aus allgemeinen Phrasen bestehen.`
      },
      {
        heading: 'Leistungsbereiche mit Ergebnisbezug',
        body: 'Gliedere die Hauptleistungen in klare Blöcke und verknüpfe jede Leistung mit einem messbaren Ergebnis. Beispiel: „Struktur & Copy“ führt zu klarerer Kommunikation, „SEO-Basis“ zu besserer Auffindbarkeit, „Technik & Performance“ zu besserer Nutzererfahrung und Conversion.'
      },
      {
        heading: 'Ablaufdarstellung in Projektphasen',
        body: 'Zeige einen transparenten Prozess mit klaren Schritten: Analyse, Struktur & Texte, Design & Entwicklung, Qualitätssicherung, Livegang und Optimierung. Ergänze je Phase eine kurze Erwartung, damit Interessenten wissen, wie Zusammenarbeit aussieht und wann Ergebnisse sichtbar werden.'
      },
      {
        heading: 'Trust-Bereich mit konkreten Nachweisen',
        body: 'Ergänze sichtbare Vertrauenssignale: Standort, Kontaktmöglichkeiten, Referenzen, Arbeitsweise und Qualitätsversprechen. Dieser Bereich sollte Fakten liefern statt Superlativen. Vertrauensnachweise wirken am besten direkt vor einem CTA, weil dort die eigentliche Entscheidung stattfindet.'
      },
      {
        heading: 'FAQ für Suchintent und Vorverkauf',
        body: 'Baue einen FAQ-Block mit mindestens sechs präzisen Antworten ein. Decke typische Fragen zu Kostenrahmen, Dauer, Leistungsumfang, SEO/GEO-Bestandteilen und Support nach Launch ab. Gute FAQ-Bereiche verbessern Orientierung, reduzieren Einwände und unterstützen Snippet-Chancen.'
      },
      {
        heading: 'CTA-Block mit klarer Handlungsführung',
        body: 'Setze einen primären CTA (z. B. „Beratung anfragen“) und einen sekundären CTA (z. B. „Projektgespräch buchen“). Ergänze darunter eine kurze Sicherheitserwartung wie Antwortzeit oder Gesprächsdauer. So wird die Seite auch auf mobilen Geräten ohne Suchaufwand konvertierbar.'
      }
    ],
    ctaPrimary: 'Beratung anfragen',
    ctaSecondary: 'Projektgespräch buchen'
  };
}

function linkingRecommendations({ pageType, context, locale = 'de' }) {
  const lng = localeFrom(locale);
  const service = normalizeText(context.primaryService || (lng === 'en' ? 'web design' : 'Webdesign'));

  if (lng === 'en') {
    if (pageType === 'contact') {
      return [
        { anchor: 'Services and outcomes', target: '/leistungen', reason: 'Users often want scope details before submitting contact form.' },
        { anchor: 'Packages and pricing', target: '/pakete', reason: 'Pre-qualifies budget expectations and increases lead quality.' },
        { anchor: `${service} FAQ`, target: '/faq', reason: 'Removes hesitation and supports self-qualification.' }
      ];
    }
    return [
      { anchor: 'Contact and first consultation', target: '/kontakt', reason: 'Primary conversion path for high-intent users.' },
      { anchor: 'Packages and pricing overview', target: '/pakete', reason: 'Supports decision phase and pricing transparency.' },
      { anchor: 'Frequently asked questions', target: '/faq', reason: 'Captures informational intent and improves snippet opportunities.' }
    ];
  }

  if (pageType === 'contact') {
    return [
      { anchor: 'Leistungen und Ergebnisse', target: '/leistungen', reason: 'Nutzer prüfen vor Anfrage oft den genauen Leistungsumfang.' },
      { anchor: 'Pakete und Preise', target: '/pakete', reason: 'Klären Budgeterwartung und erhöhen Lead-Qualität.' },
      { anchor: `${service}-FAQ`, target: '/faq', reason: 'Baut letzte Unsicherheiten vor Absenden des Formulars ab.' }
    ];
  }

  return [
    { anchor: 'Kontakt und Erstgespräch', target: '/kontakt', reason: 'Primärer Conversion-Pfad für Nutzer mit Kaufintention.' },
    { anchor: 'Pakete und Preisübersicht', target: '/pakete', reason: 'Unterstützt die Entscheidungsphase und Preistransparenz.' },
    { anchor: 'Häufige Fragen', target: '/faq', reason: 'Deckt Informationsintents ab und verbessert Snippet-Chancen.' }
  ];
}

function schemaRecommendations({ pageType, profile, locale = 'de' }) {
  const lng = localeFrom(locale);
  const base = [
    { type: 'Organization/LocalBusiness', requiredFields: ['name', 'url', 'telephone', 'address', 'sameAs'] },
    { type: 'WebPage', requiredFields: ['name', 'description', 'inLanguage'] }
  ];

  if (pageType === 'faq' || pageType === 'contact' || pageType === 'service' || pageType === 'package') {
    base.push({ type: 'FAQPage', requiredFields: ['mainEntity (Question/Answer)'] });
  }
  if (pageType !== 'homepage') {
    base.push({ type: 'BreadcrumbList', requiredFields: ['itemListElement'] });
  }

  if (profile === 'geo') {
    base.push({
      type: 'Entity consistency rule',
      requiredFields: [lng === 'en'
        ? 'Same phone/address/opening-hours spelling across page copy, footer, and schema'
        : 'Gleiche Schreibweise von Telefon/Adresse/Öffnungszeiten in Copy, Footer und Schema']
    });
  }

  return base;
}

function acceptanceCriteria({ pageType, profile, locale = 'de' }) {
  const lng = localeFrom(locale);
  const base = lng === 'en'
    ? [
      'Exactly one H1 and a logical H2/H3 hierarchy.',
      'Title (45-65 chars) and meta description (130-165 chars) match the page intent.',
      'Primary CTA visible above the fold and once again after FAQ.',
      'At least three internal links with descriptive anchors.',
      'Contact details are consistent in content, footer, and schema.'
    ]
    : [
      'Genau eine H1 und logisch strukturierte H2/H3-Hierarchie.',
      'Title (45-65 Zeichen) und Meta-Description (130-165 Zeichen) passen zum Seitenintent.',
      'Primärer CTA above the fold und erneut nach dem FAQ-Block sichtbar.',
      'Mindestens drei interne Links mit sprechenden Anchors.',
      'Kontaktdaten in Inhalt, Footer und Schema konsistent.'
    ];

  if (pageType === 'contact') {
    base.push(lng === 'en'
      ? 'Form helper text explains which project details should be provided.'
      : 'Formular-Hinweise erklären klar, welche Projektangaben gemacht werden sollen.');
  }

  if (profile === 'geo') {
    base.push(lng === 'en'
      ? 'Answer-first summary block included in first viewport area.'
      : 'Answer-first Kurzantwortblock im oberen Seitenbereich integriert.');
  }

  return base;
}

function analyzePageContent({ page = {}, pageType = 'landing', context = {}, locale = 'de' }) {
  const lng = localeFrom(locale);
  const allText = normalizeText([page.title, page.metaDescription, page.h1, page.bodyText].filter(Boolean).join(' ')).toLowerCase();
  const serviceTokens = tokenize(context.primaryService || '');
  const regionTokens = tokenize(context.targetRegion || '');

  const strengths = [];
  const gaps = [];
  const focus = [];

  const hasServiceSignal = containsAnyToken(allText, serviceTokens) >= 0.5;
  const hasRegionSignal = containsAnyToken(allText, regionTokens) >= 0.5;
  const hasCtaSignal = /(kontakt|anfrage|termin|angebot|buchen|jetzt|call|book|request|contact)/i.test(allText);
  const hasTrustSignal = /(referenz|bewertung|kunden|standort|adresse|qualität|garantie|testimonial|case|review|location)/i.test(allText);
  const hasProcessSignal = /(ablauf|prozess|schritt|zeitplan|phase|timeline|process|steps|kickoff|launch)/i.test(allText);
  const hasResponseSignal = /(werktag|rückmeldung|antwort|response|within|hour|stunde|24)/i.test(allText);
  const hasPriceSignal = /(preis|kosten|ab\s*\d+|eur|€|package|pricing|monat|einmalig)/i.test(allText);

  if ((page.wordCount || 0) >= 900) {
    strengths.push(lng === 'en'
      ? 'The page already has substantial text depth.'
      : 'Die Seite hat bereits eine solide inhaltliche Tiefe.');
  } else {
    gaps.push(lng === 'en'
      ? 'Text depth is low for a high-intent page.'
      : 'Die Texttiefe ist für eine High-Intent-Seite zu gering.');
    focus.push(lng === 'en'
      ? 'Expand decision-relevant sections and FAQ answers.'
      : 'Entscheidungsrelevante Abschnitte und FAQ-Antworten ausbauen.');
  }

  if (hasServiceSignal && hasRegionSignal) {
    strengths.push(lng === 'en'
      ? 'Service + region intent is recognizable in current copy.'
      : 'Leistungs- und Regionsintent ist im aktuellen Text erkennbar.');
  } else {
    gaps.push(lng === 'en'
      ? 'Service/region intent is not consistently visible in core text blocks.'
      : 'Leistungs-/Regionsintent ist in den Kerntexten nicht konsistent sichtbar.');
    focus.push(lng === 'en'
      ? 'Align title, H1, hero intro, and first CTA around one primary intent.'
      : 'Title, H1, Hero-Intro und ersten CTA auf einen Primärintent ausrichten.');
  }

  if (hasTrustSignal) {
    strengths.push(lng === 'en'
      ? 'Trust-related terms are already present.'
      : 'Trust-Signale sind im Inhalt bereits vorhanden.');
  } else {
    gaps.push(lng === 'en'
      ? 'Concrete trust proof is missing or too weak.'
      : 'Konkrete Vertrauensnachweise fehlen oder sind zu schwach.');
    focus.push(lng === 'en'
      ? 'Add references, location, process reliability, and realistic expectations.'
      : 'Referenzen, Standort, Prozesssicherheit und klare Erwartungen ergänzen.');
  }

  if (!hasCtaSignal) {
    gaps.push(lng === 'en'
      ? 'Clear action wording is not visible enough.'
      : 'Klare Handlungsaufforderungen sind nicht ausreichend sichtbar.');
    focus.push(lng === 'en'
      ? 'Place one primary CTA above the fold and one repeated CTA after FAQ.'
      : 'Einen primären CTA above the fold und einen zweiten CTA nach dem FAQ platzieren.');
  }

  if (pageType === 'contact') {
    if (hasResponseSignal) {
      strengths.push(lng === 'en'
        ? 'Response expectation is partially visible.'
        : 'Rückmeldelogik ist teilweise bereits erkennbar.');
    } else {
      gaps.push(lng === 'en'
        ? 'Response time and next-step expectation are missing.'
        : 'Rückmeldezeit und klare Nächster-Schritt-Erwartung fehlen.');
      focus.push(lng === 'en'
        ? 'Add explicit response-time promise and first-call scope.'
        : 'Explizite Rückmeldezeit und Inhalt des Erstgesprächs ergänzen.');
    }
  }

  if (pageType === 'package') {
    if (hasPriceSignal) {
      strengths.push(lng === 'en'
        ? 'Pricing language is visible.'
        : 'Preisbezug ist im Inhalt vorhanden.');
    } else {
      gaps.push(lng === 'en'
        ? 'Pricing orientation is too vague for package intent.'
        : 'Preisorientierung ist für Paket-Intent zu unklar.');
      focus.push(lng === 'en'
        ? 'Clarify package boundaries, add-ons, and expected result per package.'
        : 'Paketgrenzen, Add-ons und erwartete Ergebnisse je Paket klar benennen.');
    }
  }

  if (!hasProcessSignal) {
    focus.push(lng === 'en'
      ? 'Add a concrete process section (kickoff to launch) with timeline hints.'
      : 'Konkreten Ablaufabschnitt (Kickoff bis Launch) mit Zeitangaben ergänzen.');
  }

  return {
    strengths: [...new Set(strengths)],
    gaps: [...new Set(gaps)],
    focus: [...new Set(focus)]
  };
}

function buildPageGuide({ profile, context, page, homepageUrl, brand, locale = 'de' }) {
  const pageType = page.pageType || pageTypeFromUrl(page.url, homepageUrl);
  const metadata = buildTargetMetadata({
    profile,
    pageType,
    context,
    brand,
    locale
  });

  const sectionBlueprint = sectionBlueprintByType({ pageType, profile, context, locale });
  const faq = faqForPage({ pageType, context, locale });
  const copyDraft = fullCopyDraft({ pageType, profile, context, metadata, locale });
  const contentAnalysis = analyzePageContent({ page, pageType, context, locale });

  return {
    url: page.url,
    pageType,
    priorityScore: page.priorityScore,
    diagnosis: {
      title: page.title || '',
      metaDescription: page.metaDescription || '',
      h1: page.h1 || '',
      wordCount: page.wordCount || 0,
      intentCoverage: page.intentCoverage || 0,
      conversionSignal: page.conversionSignal || 0,
      structureSignal: page.structureSignal || 0,
      strengths: contentAnalysis.strengths,
      gaps: contentAnalysis.gaps,
      focus: contentAnalysis.focus
    },
    target: {
      pageGoal: pageGoalByType(pageType, locale),
      title: metadata.title,
      metaDescription: metadata.metaDescription,
      h1: metadata.h1,
      primaryCTA: copyDraft.ctaPrimary,
      secondaryCTA: copyDraft.ctaSecondary,
      sectionBlueprint,
      completeCopyDraft: copyDraft,
      faqBlock: faq,
      internalLinkingRecommendations: linkingRecommendations({ pageType, context, locale }),
      schemaRecommendations: schemaRecommendations({ pageType, profile, locale }),
      implementationOrder: localeFrom(locale) === 'en'
        ? [
          'Metadata + heading corrections',
          'Section rewrite + trust integration',
          'FAQ and internal links',
          'Schema validation + final QA'
        ]
        : [
          'Metadaten + Überschriften korrigieren',
          'Abschnitts-Rewrite + Trust-Integration',
          'FAQ und interne Verlinkung ergänzen',
          'Schema validieren + finalen QA-Check durchführen'
        ],
      acceptanceCriteria: acceptanceCriteria({ pageType, profile, locale })
    }
  };
}

function sourceLabel(profile, locale = 'de') {
  const lng = localeFrom(locale);
  if (lng === 'en') {
    if (profile === 'geo') return 'GEO';
    if (profile === 'seo') return 'SEO';
    return 'Website';
  }
  if (profile === 'geo') return 'GEO';
  if (profile === 'seo') return 'SEO';
  return 'Website';
}

export function generateTesterFullGuide({
  result = {},
  source = '',
  locale = 'de'
} = {}) {
  const sourceResult = resolveSourceResult(result);
  const lng = localeFrom(locale || sourceResult?.locale || result?.locale);
  const profile = resolveProfile(source || result?.source || result?.profile || sourceResult?.source);
  const context = sourceResult?.context || {};
  const homepageUrl = sourceResult?.finalUrl || '';
  const pageAnalyses = sourceResult?.internalGuideInput?.pageAnalyses || [];
  const scoredPages = chooseTopPages(pageAnalyses, context, homepageUrl);
  const brand = inferBrandName(sourceResult, pageAnalyses, context);
  const pageGuides = scoredPages.map((page) => buildPageGuide({
    profile,
    context,
    page,
    homepageUrl,
    brand,
    locale: lng
  }));

  const createdAt = new Date().toISOString();
  const label = sourceLabel(profile, lng);

  return {
    profile,
    label,
    locale: lng,
    createdAt,
    summary: lng === 'en'
      ? `Comprehensive ${label} implementation guide with full rewrite drafts and page-structure plans for ${pageGuides.length} high-impact pages.`
      : `Umfassende ${label}-Umsetzungsanleitung mit vollständigen Rewrite-Entwürfen und Seitenstrukturplänen für ${pageGuides.length} Seiten mit höchstem Hebel.`,
    context: {
      brand,
      businessType: normalizeText(context.businessType || ''),
      primaryService: normalizeText(context.primaryService || ''),
      targetRegion: normalizeText(context.targetRegion || '')
    },
    roadmap: lng === 'en'
      ? [
        'Week 1-2: Fix intent-critical metadata + heading structure on top pages and align CTA paths.',
        'Week 3-4: Implement full copy rewrites, trust modules, and conversion blocks per page blueprint.',
        'Week 5-6: Roll out FAQ/schema/internal-linking enhancements and validate impact with KPI tracking.'
      ]
      : [
        'Woche 1-2: Intent-kritische Metadaten + Überschriftenstruktur auf Top-Seiten korrigieren und CTA-Pfade ausrichten.',
        'Woche 3-4: Volltexte, Trust-Module und Conversion-Blöcke je Seiten-Blueprint umsetzen.',
        'Woche 5-6: FAQ/Schema/interne Verlinkung ausrollen und Wirkung über KPI-Tracking validieren.'
      ],
    kpis: lng === 'en'
      ? [
        'Organic impressions and CTR on top intent pages',
        'Qualified lead rate and conversion rate by landing page',
        'Average ranking movement for main service + region terms',
        'Contact form completion rate and response-qualified inquiries',
        'FAQ/snippet visibility in search and AI answer surfaces'
      ]
      : [
        'Organische Impressionen und CTR auf Top-Intent-Seiten',
        'Qualifizierte Lead-Rate und Conversion-Rate je Landingpage',
        'Ranking-Entwicklung für Hauptleistung + Regionsbegriffe',
        'Kontaktformular-Abschlussrate und qualifizierte Anfragen',
        'FAQ-/Snippet-Sichtbarkeit in Suche und AI-Antwortflächen'
      ],
    topPages: pageGuides
  };
}

export function formatTesterFullGuideAsText(guide = {}) {
  if (!guide || typeof guide !== 'object') return '';

  const lines = [];
  lines.push(`# ${guide.label || 'Website'} Vollanleitung`);
  lines.push('');
  lines.push(`Erstellt: ${guide.createdAt || new Date().toISOString()}`);
  lines.push(`Zusammenfassung: ${guide.summary || ''}`);
  lines.push('');
  lines.push('## Kontext');
  lines.push(`- Marke: ${guide.context?.brand || '-'}`);
  lines.push(`- Branche: ${guide.context?.businessType || '-'}`);
  lines.push(`- Hauptleistung: ${guide.context?.primaryService || '-'}`);
  lines.push(`- Zielregion: ${guide.context?.targetRegion || '-'}`);
  lines.push('');
  lines.push('## Top-Seiten (Volloptimierung)');

  (guide.topPages || []).forEach((page, index) => {
    lines.push(`### ${index + 1}) ${page.url}`);
    lines.push(`Seitentyp: ${page.pageType}`);
    lines.push(`Priorität: ${page.priorityScore}/100`);
    lines.push(`Aktuell: Titel="${page.diagnosis?.title || ''}" | H1="${page.diagnosis?.h1 || ''}" | Wörter=${page.diagnosis?.wordCount || 0}`);
    lines.push(`Signale: Intent=${page.diagnosis?.intentCoverage || 0}/100 | Conversion=${page.diagnosis?.conversionSignal || 0}/100 | Struktur=${page.diagnosis?.structureSignal || 0}/100`);
    lines.push(`Seitenziel: ${page.target?.pageGoal || ''}`);
    lines.push(`Ziel-Title: ${page.target?.title || ''}`);
    lines.push(`Ziel-Meta: ${page.target?.metaDescription || ''}`);
    lines.push(`Ziel-H1: ${page.target?.h1 || ''}`);
    lines.push(`Primärer CTA: ${page.target?.primaryCTA || ''}`);
    lines.push(`Sekundärer CTA: ${page.target?.secondaryCTA || ''}`);
    lines.push('');

    lines.push('Ist-Analyse (seitenbezogen):');
    lines.push('- Vorhandene Stärken:');
    const strengthItems = page.diagnosis?.strengths || [];
    if (strengthItems.length) {
      strengthItems.forEach((entry) => lines.push(`  - ${entry}`));
    } else {
      lines.push('  - Keine klaren Stärken erkannt.');
    }
    lines.push('- Erkannte Lücken:');
    const gapItems = page.diagnosis?.gaps || [];
    if (gapItems.length) {
      gapItems.forEach((entry) => lines.push(`  - ${entry}`));
    } else {
      lines.push('  - Keine kritischen Lücken erkannt.');
    }
    lines.push('- Priorisierte Fokuspunkte:');
    const focusItems = page.diagnosis?.focus || [];
    if (focusItems.length) {
      focusItems.forEach((entry) => lines.push(`  - ${entry}`));
    } else {
      lines.push('  - Keine zusätzlichen Fokuspunkte erforderlich.');
    }
    lines.push('');

    lines.push('Struktur-Blueprint:');
    (page.target?.sectionBlueprint || []).forEach((section, sectionIndex) => {
      lines.push(`- ${sectionIndex + 1}. ${section.heading}`);
      lines.push(`  Zweck: ${section.purpose}`);
      lines.push(`  Zielumfang: ${section.targetWords} Wörter`);
      lines.push(`  Profilhinweis: ${section.profileHint}`);
      lines.push(`  Textentwurf: ${section.draftText}`);
    });
    lines.push('');

    lines.push('Kompletter Textentwurf (Copy/Paste):');
    lines.push(`- Hero: ${page.target?.completeCopyDraft?.heroHeadline || ''}`);
    lines.push(`- Subline: ${page.target?.completeCopyDraft?.heroSubline || ''}`);
    lines.push(`- Intro: ${page.target?.completeCopyDraft?.introParagraph || ''}`);
    (page.target?.completeCopyDraft?.sectionDrafts || []).forEach((section, sectionIndex) => {
      lines.push(`- Abschnitt ${sectionIndex + 1} "${section.heading}": ${section.body}`);
    });
    lines.push('');

    lines.push('FAQ-Block (voll ausgearbeitet):');
    (page.target?.faqBlock || []).forEach((faq) => {
      lines.push(`- Frage: ${faq.q}`);
      lines.push(`  Antwort: ${faq.a}`);
    });
    lines.push('');

    lines.push('Interne Verlinkung:');
    (page.target?.internalLinkingRecommendations || []).forEach((item) => {
      lines.push(`- Anchor: ${item.anchor} | Ziel: ${item.target} | Grund: ${item.reason}`);
    });
    lines.push('');

    lines.push('Schema/Entity-Empfehlungen:');
    (page.target?.schemaRecommendations || []).forEach((item) => {
      lines.push(`- ${item.type}: ${(item.requiredFields || []).join(', ')}`);
    });
    lines.push('');

    lines.push('Umsetzungsreihenfolge:');
    (page.target?.implementationOrder || []).forEach((step) => lines.push(`- ${step}`));
    lines.push('');

    lines.push('Abnahmekriterien:');
    (page.target?.acceptanceCriteria || []).forEach((criterion) => lines.push(`- ${criterion}`));
    lines.push('');
  });

  lines.push('## Roadmap');
  (guide.roadmap || []).forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  lines.push('## KPI-Messung');
  (guide.kpis || []).forEach((item) => lines.push(`- ${item}`));

  return lines.join('\n');
}

export const __testables = {
  localeFrom,
  resolveProfile,
  pageTypeFromUrl,
  scorePagePriority,
  chooseTopPages
};
