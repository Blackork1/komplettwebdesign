import pool from '../util/db.js';
import { getIndustryBySlug } from '../models/industryModel.js';
import Package from '../models/Package.js';


function resolveBaseUrl(req) {
  const proto = req.headers['cf-visitor']
    ? (JSON.parse(req.headers['cf-visitor']).scheme || 'https')
    : (req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http'));
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${proto}://${host}`;
}

// Optionale JSON-LD (Breadcrumb + FAQ)
function buildIndustrySchemas({ industry, url, baseUrl }) {
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Startseite", "item": baseUrl },
      { "@type": "ListItem", "position": 2, "name": "Branchen", "item": baseUrl + "/branchen" },
      { "@type": "ListItem", "position": 3, "name": industry.name, "item": url }
    ]
  };

  const faq = industry.faq_items?.length ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": industry.faq_items.map(({ q, a }) => ({
      "@type": "Question", "name": q, "acceptedAnswer": { "@type": "Answer", "text": a }
    }))
  } : null;

  return { breadcrumbs, faq };
}

export async function showIndustryPage(req, res) {
  const slug = req.params.slug;
  try {
    const industry = await getIndustryBySlug(slug);
    if (!industry) return res.status(404).render('404', { title: 'Branche nicht gefunden', description: 'Die gewünschte Branche existiert nicht.' });

    const baseUrl = resolveBaseUrl(req);
    const url = `${baseUrl}${req.originalUrl}`;
    const { breadcrumbs, faq } = buildIndustrySchemas({ industry, url, baseUrl });

    // Pakete optional mit ausgeben
    const packages = await Package.fetchAll();


    res.render('industries/show', {
      title: industry.title,
      description: industry.description,
      ogImage: industry.og_image_url,
      industry,
      packages,
      jsonLd: [breadcrumbs, faq].filter(Boolean)
    });
  } catch (err) {
    console.error('❌ showIndustryPage:', err);
    res.status(500).send('Branchen-Seite konnte nicht geladen werden.');
  }
}
