// controllers/industriesController.js
import pool from '../util/db.js';
import { getIndustryBySlug } from '../models/industryModel.js'; // vorhanden bei dir
import pricingService from '../services/pricingService.js';
import { buildIndustrySchemas } from '../helpers/industrySchema.js';
import { normalizeLegacyPublicCopy } from '../util/legacyPublicCopy.js';
import { MARKETING_IMAGES } from '../data/marketingImages.js';

const INDUSTRY_CONTEXT_LINKS = Object.freeze({
  blumenladen: Object.freeze([
    Object.freeze({
      label: 'SEO für Blumenläden im Blog',
      href: '/blog/seo-fuer-blumenladen'
    })
  ]),
  immobilienmakler: Object.freeze([
    Object.freeze({
      label: 'Immobilienmakler-Website im Blog planen',
      href: '/blog/immobilienmakler-website-erstelle'
    })
  ])
});

const INDUSTRY_GROUP_DEFINITIONS = Object.freeze([
  Object.freeze({
    key: 'appointments',
    title: 'Termine und Buchungen',
    description: 'Angebot, Vertrauen und den Weg zur Terminvereinbarung schnell verständlich machen.',
    terms: Object.freeze(['fitness', 'coach', 'friseur', 'kosmetik', 'therap', 'physio', 'arzt', 'praxis', 'studio'])
  }),
  Object.freeze({
    key: 'local-services',
    title: 'Lokale Dienstleistungen',
    description: 'Leistungen, Einsatzgebiet, Belege und eine kurze Anfrage für lokale Aufträge verbinden.',
    terms: Object.freeze(['handwerk', 'reinigung', 'service', 'maler', 'elektro', 'sanit', 'bau', 'garten'])
  }),
  Object.freeze({
    key: 'hospitality-retail',
    title: 'Gastronomie und Verkauf',
    description: 'Sortiment, Speisekarte, Öffnungszeiten und Besuch oder Bestellung bildlich vermitteln.',
    terms: Object.freeze(['cafe', 'café', 'restaurant', 'gastronomie', 'blumen', 'florist', 'laden', 'shop', 'bäck', 'back'])
  }),
  Object.freeze({
    key: 'consulting-real-estate',
    title: 'Beratung und Immobilien',
    description: 'Kompetenz, regionale Nähe, Leistungen und vertrauliche Kontaktwege nachvollziehbar zeigen.',
    terms: Object.freeze(['immobil', 'makler', 'berat', 'anwalt', 'steuer', 'finanz'])
  })
]);

const INDUSTRY_GROUP_FALLBACK_IMAGES = Object.freeze({
  appointments: Object.freeze({
    src: '/images/webdesign-berlin-individuelles-webdesign.webp',
    alt: 'Mobile Website-Ansicht mit einem klaren Weg zur Terminvereinbarung',
    source: Object.freeze({ kind: 'own', provider: 'Komplett Webdesign' })
  }),
  'local-services': Object.freeze({
    src: '/images/handwerker-min.webp',
    alt: 'Handwerksbetrieb als Beispiel für eine lokale Dienstleistungswebsite',
    source: Object.freeze({ kind: 'own', provider: 'Komplett Webdesign' })
  }),
  'hospitality-retail': Object.freeze({
    src: '/images/cafe-min.webp',
    alt: 'Café als Beispiel für eine Website in Gastronomie und lokalem Verkauf',
    source: Object.freeze({ kind: 'own', provider: 'Komplett Webdesign' })
  }),
  'consulting-real-estate': MARKETING_IMAGES.industryRealEstate
});

const INDUSTRY_COMMERCIAL_GUIDES = Object.freeze({
  blumenladen: Object.freeze({
    eyebrow: 'Website-Schwerpunkte',
    title: 'Was eine Blumenladen-Website wirklich leisten sollte',
    image: MARKETING_IMAGES.industryFlorist,
    sections: Object.freeze([
      Object.freeze({ title: 'Produkte, Öffnungszeiten und lokale Auffindbarkeit', text: 'Sortiment, Standort, Öffnungszeiten und erreichbare Kontaktwege gehören früh auf die Seite, damit Kundinnen und Kunden Besuch oder Bestellung schnell einordnen können.' }),
      Object.freeze({ title: 'Saisonale Angebote ohne Seitenchaos', text: 'Valentinstag, Muttertag, Hochzeiten und Trauerfloristik werden in einer erweiterbaren Struktur dargestellt, statt für jede Aktion eine isolierte Seite anzulegen.' }),
      Object.freeze({ title: 'Anfrage, Vorbestellung oder Abholung', text: 'Die Website erklärt eindeutig, welche Bestellungen online angefragt werden können, welche Angaben nötig sind und wann eine persönliche Rücksprache sinnvoll ist.' }),
      Object.freeze({ title: 'Geeignete Paketgröße', text: 'Für einen kompakten Betrieb kann Start genügen. Mehrere Leistungsbereiche, Galerien oder saisonale Inhalte sprechen meist für Business oder Wachstum.' }),
      Object.freeze({ title: 'Local-SEO-Grundlagen für Blumenläden', text: 'Standortbezug, passendes Sortiment, gepflegte Bilder, ein stimmiges Google-Unternehmensprofil und echte Bewertungen unterstützen die lokale Auffindbarkeit ohne Ranking-Versprechen.' })
    ]),
    action: Object.freeze({ label: 'Local SEO für Blumenläden einordnen', href: '/leistungen/local-seo' })
  }),
  immobilienmakler: Object.freeze({
    eyebrow: 'Website-Schwerpunkte',
    title: 'Was eine Immobilienmakler-Website verständlich machen sollte',
    image: MARKETING_IMAGES.industryRealEstate,
    sections: Object.freeze([
      Object.freeze({ title: 'Vertrauen und lokales Einsatzgebiet', text: 'Persönliche Ansprechpartner, nachvollziehbare Erfahrung und konkrete Regionen helfen Eigentümern und Interessenten bei der ersten Einordnung.' }),
      Object.freeze({ title: 'Leistungen für Verkäufer, Käufer und Vermieter', text: 'Unterschiedliche Anliegen werden getrennt erklärt, damit jede Zielgruppe ohne Umwege zur passenden Leistung gelangt.' }),
      Object.freeze({ title: 'Objektdarstellung und Kontaktwege', text: 'Objekte, Suchauftrag, Bewertungsanfrage und Erstkontakt benötigen jeweils passende Inhalte, Bilder und eine eindeutige nächste Handlung.' }),
      Object.freeze({ title: 'Technische und rechtliche Abgrenzung', text: 'Schnittstellen, Exposés, Formulare, Datenschutztexte und Einwilligungen werden vorab abgegrenzt; rechtliche Beratung ist keine Webdesign-Leistung.' }),
      Object.freeze({ title: 'Geeignete Paketgröße', text: 'Mehrere Zielgruppen, Leistungsseiten oder eine Objektanbindung benötigen meist Wachstum oder eine individuelle Lösung statt einer kompakten Einstiegsseite.' })
    ]),
    action: Object.freeze({ label: 'Immobilien-Website als Projekt besprechen', href: '/kontakt?projektart=webdesign' })
  })
});

const DEFAULT_PRIMARY_INDUSTRY_CTA = Object.freeze({
  label: 'Beratungsgespräch vereinbaren',
  href: '/kontakt',
  ariaLabel: 'Zur Kontaktseite',
  trackingName: 'beratungsgespraech_vereinbaren',
  supportingText: 'Kontaktiere uns für eine kostenlose Erstberatung!'
});

const DEFAULT_PRICING_INDUSTRY_CTA = Object.freeze({
  label: 'Kostenlose Einschätzung anfragen',
  href: '/kontakt',
  trackingName: 'pricing_contact'
});

const INDUSTRY_PRIMARY_CTAS = Object.freeze({
  blumenladen: Object.freeze({
    label: 'Pakete ansehen',
    href: '/pakete',
    ariaLabel: 'Website-Pakete für Blumenläden ansehen',
    trackingName: 'blumenladen_pakete_ansehen',
    supportingText: 'Vergleiche die Website-Pakete und ordne sie dem Umfang deines Blumenladens zu.'
  })
});

/* --- Hilfsfunktionen --- */
function resolveBaseUrl(req) {
  const proto = req.headers['cf-visitor']
    ? (JSON.parse(req.headers['cf-visitor']).scheme || 'https')
    : (req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http'));
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${proto}://${host}`;
}

function isExcludedIndustry(industry = {}) {
  const text = [industry.slug, industry.name, industry.title, industry.description]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return ['kita', 'kitas', 'schule', 'schulen', 'school', 'schools', 'daycare', 'daycares', 'kindergarten']
    .some((needle) => text.includes(needle));
}

async function getIndustryPackages(res) {
  const visiblePackages = res.locals.visiblePackages || await pricingService.getVisiblePackages();
  return visiblePackages
    .slice(0, 3)
    .map((pkg) => ({
      id: pkg.packageKey || pkg.slug,
      name: pkg.displayName || pkg.name,
      slug: pkg.slug,
      description: pkg.shortDescription || pkg.positioning,
      price: pkg.priceLabel,
      display: true,
      features: [
        pkg.pageScope,
        pkg.feedbackRounds ? `${pkg.feedbackRounds} Feedbackrunden` : '',
        pkg.seoScope
      ].filter(Boolean)
    }));
}

export function getIndustryContextLinks(slug) {
  const normalizedSlug = String(slug || '').toLowerCase().replace(/^webdesign-/, '');
  return [...(INDUSTRY_CONTEXT_LINKS[normalizedSlug] || [])];
}

export function getIndustryCommercialGuide(slug) {
  const normalizedSlug = String(slug || '').toLowerCase().replace(/^webdesign-/, '');
  return INDUSTRY_COMMERCIAL_GUIDES[normalizedSlug] || null;
}

function normalizeIndustryPath(slug) {
  const normalizedSlug = String(slug || '').trim();
  return `/branchen/${normalizedSlug.startsWith('webdesign-') ? normalizedSlug : `webdesign-${normalizedSlug}`}`;
}

function findIndustryGroup(industry = {}) {
  const haystack = [industry.slug, industry.name, industry.title, industry.description]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return INDUSTRY_GROUP_DEFINITIONS.find((group) => group.terms.some((term) => haystack.includes(term)))
    || INDUSTRY_GROUP_DEFINITIONS[1];
}

function getIndustryCardImage(industry, groupKey) {
  const normalizedSlug = String(industry.slug || '').toLowerCase().replace(/^webdesign-/, '');
  if (normalizedSlug === 'blumenladen') return MARKETING_IMAGES.industryFlorist;
  if (normalizedSlug === 'immobilienmakler') return MARKETING_IMAGES.industryRealEstate;
  const src = industry.og_image_url || industry.hero_image_url;
  if (src) {
    return Object.freeze({
      src,
      alt: industry.hero_image_alt || `Website-Lösung für ${industry.name || industry.title}`,
      source: Object.freeze({ kind: 'customer-or-own', provider: 'Komplett Webdesign' })
    });
  }
  return INDUSTRY_GROUP_FALLBACK_IMAGES[groupKey];
}

export function buildIndustryGroups(industries = []) {
  const groupedItems = new Map(INDUSTRY_GROUP_DEFINITIONS.map((group) => [group.key, []]));
  const allIndustries = [
    ...industries,
    {
      slug: 'handwerker',
      name: 'Handwerksbetriebe',
      title: 'Website für Handwerker',
      description: 'Leistungen, Einsatzgebiet und Anfragewege für Handwerksbetriebe in Berlin.',
      href: '/handwerker',
      staticPage: true
    }
  ];

  for (const industry of allIndustries) {
    const group = findIndustryGroup(industry);
    groupedItems.get(group.key).push(Object.freeze({
      title: industry.title || `Webdesign für ${industry.name}`,
      name: industry.name || industry.title,
      description: industry.description || 'Branchenspezifische Inhalte, Bilder und Kontaktwege passend einordnen.',
      href: industry.href || normalizeIndustryPath(industry.slug),
      image: getIndustryCardImage(industry, group.key)
    }));
  }

  return INDUSTRY_GROUP_DEFINITIONS.map((group) => Object.freeze({
    key: group.key,
    title: group.title,
    description: group.description,
    items: Object.freeze(groupedItems.get(group.key))
  }));
}

export function getIndustryPrimaryCta(slug, { placement = 'primary' } = {}) {
  const normalizedSlug = String(slug || '').toLowerCase().replace(/^webdesign-/, '');
  const industryCta = INDUSTRY_PRIMARY_CTAS[normalizedSlug];
  if (industryCta) return industryCta;
  return placement === 'pricing' ? DEFAULT_PRICING_INDUSTRY_CTA : DEFAULT_PRIMARY_INDUSTRY_CTA;
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

    const visibleRows = rows
      .filter((r) => !isExcludedIndustry(r))
      .map((r) => normalizeLegacyPublicCopy(r));
    const featured = visibleRows.filter(r => r.featured);
    const others   = visibleRows.filter(r => !r.featured);
    const industryGroups = buildIndustryGroups(visibleRows);

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
      industryGroups,
      existingIndustryPages: [{
        title: 'Website für Handwerker',
        description: 'Webdesign, Leistungen und Anfragewege für Handwerksbetriebe in Berlin.',
        href: '/handwerker'
      }],
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
    const industry = normalizeLegacyPublicCopy(await getIndustryBySlug(slug));
    if (!industry) {
      return res.status(404).render('404', {
        title: 'Branche nicht gefunden',
        description: 'Die gewünschte Branche existiert nicht.'
      });
    }

    const baseUrl = resolveBaseUrl(req);
    const url = `${baseUrl}${req.originalUrl}`;
    const jsonLd = buildIndustrySchemas({ industry, url, baseUrl });

    res.render('industries/show.ejs', {
      title: industry.title || (`Webdesign für ${industry.name}`),
      description: industry.description || (`Website-Erstellung & SEO für ${industry.name}`),
      ogImage: industry.og_image_url || industry.hero_image_url,
      industry,
      industryContextLinks: getIndustryContextLinks(industry.slug),
      industryCommercialGuide: getIndustryCommercialGuide(industry.slug),
      industryPrimaryCta: getIndustryPrimaryCta(industry.slug),
      industryPricingCta: getIndustryPrimaryCta(industry.slug, { placement: 'pricing' }),
      packages: await getIndustryPackages(res),
      jsonLd
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
