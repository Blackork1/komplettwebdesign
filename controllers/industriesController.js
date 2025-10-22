// controllers/industriesController.js
import pool from '../util/db.js';
import { getIndustryBySlug } from '../models/industryModel.js'; // vorhanden bei dir
import Package from '../models/Package.js';

/* --- Hilfsfunktionen --- */
function resolveBaseUrl(req) {
  const proto = req.headers['cf-visitor']
    ? (JSON.parse(req.headers['cf-visitor']).scheme || 'https')
    : (req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http'));
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${proto}://${host}`;
}

function buildIndustrySchemas({ industry, url, baseUrl }) {
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Startseite", "item": baseUrl + "/" },
      { "@type": "ListItem", "position": 2, "name": "Branchen",   "item": baseUrl + "/branchen" },
      { "@type": "ListItem", "position": 3, "name": industry.name, "item": url }
    ]
  };
  const faq = Array.isArray(industry.faq_items) && industry.faq_items.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": industry.faq_items.map(({ q, a }) => ({
          "@type": "Question",
          "name": q,
          "acceptedAnswer": { "@type": "Answer", "text": a }
        }))
      }
    : null;
  return { breadcrumbs, faq };
}

/* --- NEU: Branchen-Übersicht (/branchen) --- */
export async function listIndustries(req, res) {
  try {
    // Minimal-invasiv: wir greifen direkt auf die Tabelle "industries" zu.
    // Spaltennamen sind an deine bestehende Show-Page angepasst (hero_image_url etc.).
    const { rows } = await pool.query(`
      SELECT
        id, slug, name, title, description,
        hero_image_url, og_image_url,
        COALESCE(featured, false) AS featured
      FROM industries
      ORDER BY featured DESC, name ASC
    `);

    const featured = rows.filter(r => r.featured);
    const others   = rows.filter(r => !r.featured);

    const baseUrl = resolveBaseUrl(req);

    // Kleiner Helper fürs Template
    const toPath = (ind) => {
      const s = ind.slug || '';
      // gewünschtes Schema: /branchen/webdesign-cafe
      return '/branchen/' + (s.startsWith('webdesign-') ? s : ('webdesign-' + s));
    };

    res.render('industries/index', {
      title: 'Branchen – Webdesign & SEO für Berliner KMU | Komplett Webdesign',
      description: 'Alle Branchen auf einen Blick: Hero-Bilder + Titel. Klicke durch zu deiner Branche und erfahre Preise, SEO-Tipps & Funktionen.',
      baseUrl,
      featured,
      others,
      toPath
    });
  } catch (err) {
    console.error('❌ listIndustries:', err);
    res.status(500).send('Branchen-Liste konnte nicht geladen werden.');
  }
}

/* --- Detailseite (/branchen/:slug) – bleibt wie gehabt, nur mit /branchen-Canon --- */
export async function showIndustryPage(req, res) {
  const slug = req.params.slug;
  try {
    const industry = await getIndustryBySlug(slug);
    if (!industry) {
      return res.status(404).render('404', {
        title: 'Branche nicht gefunden',
        description: 'Die gewünschte Branche existiert nicht.'
      });
    }

    const baseUrl = resolveBaseUrl(req);
    const url = `${baseUrl}${req.originalUrl}`;
    const { breadcrumbs, faq } = buildIndustrySchemas({ industry, url, baseUrl });

    const packages = await Package.fetchAll();

    res.render('industries/show.ejs', {
      title: industry.title || (`Webdesign für ${industry.name}`),
      description: industry.description || (`Website-Erstellung & SEO für ${industry.name}`),
      ogImage: industry.og_image_url || industry.hero_image_url,
      industry,
      packages,
      jsonLd: [breadcrumbs, faq].filter(Boolean)
    });
  } catch (err) {
    console.error('❌ showIndustryPage:', err);
    res.status(500).send('Branchen-Seite konnte nicht geladen werden.');
  }
}

/* --- 301 Redirects von alten URLs (/webdesign-:slug -> /branchen/webdesign-:slug) --- */
export function redirectOldIndustry(req, res) {
  const { slug } = req.params;
  return res.redirect(301, `/branchen/webdesign-${slug}`);
}
