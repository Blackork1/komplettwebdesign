import { siteFaqCategories, siteFaqs } from '../data/siteFaqs.js';
import { renderPricingTokens } from '../util/pricingTokenRenderer.js';

function buildFaqJsonLd(faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer }
    }))
  };
}

export async function renderFaqPage(req, res, next) {
  const rawCategory = req.query.cat;
  if (rawCategory !== undefined && (typeof rawCategory !== 'string' || !/^[1-9]\d*$/.test(rawCategory))) return next();

  const categories = siteFaqCategories.map(category => ({ ...category }));
  const selectedId = rawCategory === undefined ? categories[0].id : Number(rawCategory);
  const selectedCategory = categories.find(category => category.id === selectedId);
  if (!selectedCategory) return next();

  try {
    const pricing = res.locals.packagePricing || {};
    const hasCurrentPrice = Boolean(String(pricing.lowestPackagePriceLabel || '').trim());
    const faqs = renderPricingTokens(
      siteFaqs.filter(faq => faq.categoryId === selectedId).map(faq => ({
        question: faq.question,
        answer: hasCurrentPrice && faq.answerWithPrice ? faq.answerWithPrice : faq.answer
      })),
      pricing
    );
    const canonical = `${(res.locals.canonicalBaseUrl || 'https://www.komplettwebdesign.de').replace(/\/$/, '')}/faq`;

    res.set('Cache-Control', 'public, max-age=300');
    res.render('faq', {
      title: 'Häufige Fragen zu deiner Website | Komplett Webdesign',
      description: 'Antworten zu Website-Paketen, Preisen, Ablauf, Technik, Wartung und SEO. Erfahre, wie die Zusammenarbeit mit Sören von Komplett Webdesign abläuft.',
      keywords: 'faq webdesign berlin, website erstellen lassen fragen, webdesign kosten faq',
      seoExtra: `
        <meta property="og:title" content="Häufige Fragen zu deiner Website">
        <meta property="og:description" content="Antworten zu Leistungen, Kosten und Zusammenarbeit mit Komplett Webdesign in Berlin.">
        <meta property="og:url" content="${canonical}">
        <meta property="og:type" content="website">
      `,
      categories,
      selectedCategory,
      faqs,
      // Das Schema enthält ausschließlich die vier sichtbaren Antworten.
      faqJsonLd: JSON.stringify(buildFaqJsonLd(faqs)).replace(/</g, '\\u003c')
    });
  } catch (err) {
    console.error('Fehler beim Laden der FAQ-Seite:', err);
    res.status(500).send('Interner Serverfehler');
  }
}
