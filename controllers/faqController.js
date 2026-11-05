import { FAQ_MODIFIED_AT, faqSummary, siteFaqCategories, siteFaqs } from '../data/siteFaqs.js';
import { renderPricingTokens } from '../util/pricingTokenRenderer.js';

const FAQ_TITLE = 'Website-FAQ: Kosten, Dauer, Ablauf | Komplett Webdesign';
const FAQ_DESCRIPTION = 'Antworten zu Kosten, Dauer, Ablauf, Wartung, Technik und SEO deiner Website. Onepager in 2–4 Wochen, mehrseitige Website in 4–6 Wochen. Von Sören aus Berlin.';

function buildFaqStructuredData({ baseUrl, faqs }) {
  const url = `${baseUrl}/faq`;
  return [{
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${url}#faq`,
    url,
    name: 'Häufige Fragen zu deiner Website',
    inLanguage: 'de-DE',
    dateModified: FAQ_MODIFIED_AT,
    isPartOf: { '@id': `${baseUrl}/#website` },
    about: { '@id': `${baseUrl}/#organization` },
    breadcrumb: { '@id': `${url}#breadcrumb` },
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer }
    }))
  }, {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${url}#breadcrumb`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Startseite', item: `${baseUrl}/` },
      { '@type': 'ListItem', position: 2, name: 'FAQ', item: url }
    ]
  }];
}

// Eine Textvariante mit Preisplatzhaltern nur verwenden, wenn jeder darin genannte Preis bekannt ist.
function pricesResolvable(text, pricing) {
  if (/\{\{\s*lowestPackagePriceLabel\s*\}\}/.test(text) && !String(pricing.lowestPackagePriceLabel || '').trim()) return false;
  for (const [, key] of String(text).matchAll(/\{\{\s*package:([a-z0-9_-]+)\.priceLabel\s*\}\}/gi)) {
    if (typeof pricing.priceLabel !== 'function' || !String(pricing.priceLabel(key) || '').trim()) return false;
  }
  return true;
}

const firstResolvable = (variants, pricing) => variants.filter(Boolean).find(text => pricesResolvable(text, pricing));

export async function renderFaqPage(req, res, next) {
  const rawCategory = req.query.cat;
  if (rawCategory !== undefined) {
    // Früher hatte jede Kategorie eine eigene ?cat=-Adresse. Heute stehen alle Fragen auf /faq.
    if (typeof rawCategory !== 'string' || !/^[1-9]\d*$/.test(rawCategory)) return next();
    const category = siteFaqCategories.find(item => item.id === Number(rawCategory));
    if (!category) return next();
    return res.redirect(301, `/faq#${category.slug}`);
  }

  try {
    const pricing = res.locals.packagePricing || {};
    const faqs = renderPricingTokens(
      siteFaqs.map(faq => ({
        categoryId: faq.categoryId,
        question: faq.question,
        answer: firstResolvable([faq.answerWithPrice, faq.answerWithLowestPrice, faq.answer], pricing)
      })),
      pricing
    );
    const summary = renderPricingTokens(firstResolvable([faqSummary.textWithPrice, faqSummary.text], pricing), pricing);
    const categories = siteFaqCategories.map(category => ({
      ...category,
      faqs: faqs.filter(faq => faq.categoryId === category.id)
    }));
    const baseUrl = (res.locals.canonicalBaseUrl || 'https://www.komplettwebdesign.de').replace(/\/+$/, '');
    const canonical = `${baseUrl}/faq`;

    res.set('Cache-Control', 'public, max-age=300');
    res.render('faq', {
      title: FAQ_TITLE,
      description: FAQ_DESCRIPTION,
      keywords: 'faq webdesign berlin, website erstellen lassen fragen, webdesign kosten faq',
      seoExtra: `
        <meta property="og:title" content="Häufige Fragen zu deiner Website">
        <meta property="og:description" content="Antworten zu Kosten, Dauer, Ablauf, Technik und SEO deiner Website von Komplett Webdesign in Berlin.">
        <meta property="og:url" content="${canonical}">
        <meta property="og:type" content="website">
      `,
      categories,
      faqs,
      summary,
      modifiedAt: FAQ_MODIFIED_AT,
      // Das Schema enthält genau die sichtbaren Fragen und Antworten.
      structuredDataBlocks: buildFaqStructuredData({ baseUrl, faqs })
    });
  } catch (err) {
    console.error('Fehler beim Laden der FAQ-Seite:', err);
    res.status(500).send('Interner Serverfehler');
  }
}
