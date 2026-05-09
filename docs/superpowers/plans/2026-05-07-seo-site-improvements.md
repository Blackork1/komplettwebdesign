# SEO Site Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve organic visibility and lead conversion for Komplett Webdesign by clarifying page intent, adding proof pages, reducing form friction, cleaning SEO signals, and prioritizing high-quality local/industry content.

**Architecture:** Keep the site Express/EJS-first. Add small route-specific controllers for new SEO landing pages and references, centralize business facts so ratings/prices do not drift, and keep generated/DB-backed pages behind explicit indexation policy. Existing routes and views remain in place unless a task explicitly changes them.

**Tech Stack:** Node.js, Express 5, EJS, PostgreSQL-backed CMS tables, static CSS in `public/`, Node test runner via `npm test`.

---

## Skills And Plugins Used

- `superpowers:writing-plans`: this plan structure and execution handoff.
- `seo-audit`: crawlability, sitemap, canonical, title/meta, content quality, Core Web Vitals, indexation policy.
- `schema-markup`: JSON-LD graph design for Organization, ProfessionalService, WebPage, Service, FAQPage, BreadcrumbList.
- `copywriting`: page positioning, CTA language, proof wording without fabricated claims.
- `page-cro` and `form-cro`: homepage/contact conversion improvements.
- `programmatic-seo`: quality policy for district and industry pages so similar pages do not become thin doorway pages.
- `frontend-design`: visual direction for new proof, contact, and landing page surfaces.

## Implementation Principles

- Do not invent metrics. Use qualitative results unless the metric exists in analytics, Search Console, booking logs, or client-approved statements.
- Use `ich`/personal language where trust matters, especially homepage, about, contact, and references. Use neutral service language on SEO landing pages where search intent is broader.
- `/webdesign-berlin` owns `webdesign berlin`.
- `/website-erstellen-lassen-berlin` owns `website erstellen lassen berlin`.
- `/` becomes brand, trust, offer, and routing hub.
- Weak district/industry pages stay accessible during cleanup, but they should not be pushed in the main nav or sitemap until reviewed.
- All visible rating counts and package prices come from one code-level source of truth.

## File Map

Create:
- `helpers/siteFacts.js`: central prices, recurring costs, contact data, public profile URLs, current review count label.
- `tests/siteFacts.test.js`: proves price/review labels stay consistent.
- `data/referenceProjects.js`: source data for the two current proof projects.
- `controllers/referenceController.js`: renders `/referenzen` and `/referenzen/:slug`.
- `routes/referenceRoutes.js`: reference route registration.
- `views/references/index.ejs`: reference overview.
- `views/references/show.ejs`: reference detail page.
- `public/references.css`: focused styling for reference pages.
- `tests/referenceProjects.test.js`: no fabricated proof metrics and required fields present.
- `data/seoLandingPages.js`: content model for new SEO money pages.
- `controllers/seoLandingController.js`: renders static SEO landing pages.
- `routes/seoLandingRoutes.js`: route registration for new money pages.
- `views/seo_landing/show.ejs`: shared template for new SEO money pages.
- `public/seo-landing.css`: focused styling for SEO money pages.
- `tests/seoLandingPages.test.js`: unique title, H1, canonical, FAQ, and CTA checks.
- `helpers/seoPagePolicy.js`: sitemap/indexation allowlists for page types.
- `tests/seoPagePolicy.test.js`: verifies sitemap policy for priority vs. weak pages.

Modify:
- `index.js`: mount new route modules before `slugRoutes`.
- `controllers/mainController.js`: homepage copy, proof labels, shared facts import.
- `views/index.ejs`: homepage trust bar, reference links, updated hero/section copy.
- `views/partials/header.ejs`: simpler top navigation.
- `views/partials/footer.ejs`: district/industry links moved to footer and current year.
- `controllers/districtController.js`: sharpen `/webdesign-berlin`, remove unsupported case metrics, link references.
- `views/bereiche/webdesign-berlin.ejs`: case section wording and reference CTA.
- `routes/contactRoutes.js`: add low-friction quick inquiry route.
- `views/kontakt.ejs`: add quick form before the existing wizard.
- `public/kontakt.css`: style quick form if inline styles are moved out of the EJS file.
- `controllers/leistungenController.js`: improve `/webdesign-berlin/kosten-preise-pakete` example calculations and recurring costs.
- `views/leistungen/show.ejs`: render example calculations when present.
- `helpers/industrySchema.js`: import shared package prices instead of duplicated constants.
- `controllers/sitemapController.js`: include new pages and filter weak generated pages from the sitemap.
- `views/about.ejs`: remove overclaims and align story with current proof reality.

---

### Task 1: Centralize Business Facts

**Files:**
- Create: `helpers/siteFacts.js`
- Create: `tests/siteFacts.test.js`
- Modify: `controllers/mainController.js`
- Modify: `controllers/districtController.js`
- Modify: `helpers/industrySchema.js`

- [ ] **Step 1: Add shared facts**

Create `helpers/siteFacts.js`:

```js
export const SITE_FACTS = {
  brandName: 'Komplett Webdesign',
  legalName: 'Komplett Webdesign',
  founderName: 'Sören Blocksdorf',
  baseUrlFallback: 'https://www.komplettwebdesign.de',
  email: 'kontakt@komplettwebdesign.de',
  phone: '+491551245048',
  phoneDisplay: '01551 245048',
  address: {
    streetAddress: 'Möllendorffstr 26',
    postalCode: '10367',
    addressLocality: 'Berlin',
    addressRegion: 'Berlin',
    addressCountry: 'DE'
  },
  googleProfileUrl: 'https://www.google.com/maps?cid=8211853018206635760',
  googleReviewUrl: 'https://g.page/r/CfAG7dHPXPZxEAE/review',
  googleRating: {
    ratingValue: 5.0,
    reviewCount: 4
  },
  packages: [
    {
      slug: 'basis',
      name: 'Basis',
      price: 499,
      priceLabel: '499 EUR',
      schemaPrice: '499.00',
      scope: '1 Seite',
      deliveryTime: '2 bis 4 Wochen',
      description: 'Onepager mit Design, Texten und SEO-Grundoptimierung.'
    },
    {
      slug: 'business',
      name: 'Business',
      price: 899,
      priceLabel: '899 EUR',
      schemaPrice: '899.00',
      scope: 'bis 5 Seiten',
      deliveryTime: '4 bis 6 Wochen',
      description: 'Mehrseitige Unternehmenswebsite mit Kontaktformular, Leistungsseiten und On-Page-SEO.'
    },
    {
      slug: 'premium',
      name: 'Premium',
      price: 1499,
      priceLabel: '1.499 EUR',
      schemaPrice: '1499.00',
      scope: 'bis 20 Seiten',
      deliveryTime: '6 bis 8 Wochen',
      description: 'Umfangreiche Website mit Strategie, Texten, SEO und Buchungssystem.'
    }
  ],
  recurringCosts: [
    { label: 'Domain und Mail', priceLabel: 'ab 10 EUR/Monat' },
    { label: 'Hosting', priceLabel: '10 EUR/Monat' },
    { label: 'Wartung', priceLabel: '5 EUR/Monat' }
  ]
};

export function getPackageBySlug(slug) {
  return SITE_FACTS.packages.find((pkg) => pkg.slug === slug) || null;
}

export function formatGoogleRating(locale = 'de') {
  const decimal = SITE_FACTS.googleRating.ratingValue.toLocaleString(locale === 'en' ? 'en-US' : 'de-DE', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
  const count = SITE_FACTS.googleRating.reviewCount;
  return locale === 'en'
    ? `★★★★★ ${decimal}/5 · ${count} Google reviews`
    : `★★★★★ ${decimal}/5 · ${count} Google-Rezensionen`;
}
```

- [ ] **Step 2: Add tests for the facts**

Create `tests/siteFacts.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { SITE_FACTS, formatGoogleRating, getPackageBySlug } from '../helpers/siteFacts.js';

test('site facts expose current package prices and recurring costs', () => {
  assert.equal(getPackageBySlug('basis').price, 499);
  assert.equal(getPackageBySlug('business').price, 899);
  assert.equal(getPackageBySlug('premium').price, 1499);
  assert.deepEqual(SITE_FACTS.recurringCosts.map((item) => item.priceLabel), [
    'ab 10 EUR/Monat',
    '10 EUR/Monat',
    '5 EUR/Monat'
  ]);
});

test('google rating label is generated from one source of truth', () => {
  assert.equal(formatGoogleRating('de'), '★★★★★ 5,0/5 · 4 Google-Rezensionen');
  assert.equal(formatGoogleRating('en'), '★★★★★ 5.0/5 · 4 Google reviews');
});
```

- [ ] **Step 3: Replace hardcoded rating labels**

In `controllers/districtController.js`, import and use the helper:

```js
import { SITE_FACTS, formatGoogleRating } from '../helpers/siteFacts.js';
```

Replace hardcoded rating data in `renderWebdesignBerlinHub`:

```js
rating: { label: formatGoogleRating(lng), href: SITE_FACTS.googleProfileUrl },
```

Replace hardcoded contact values near the render call:

```js
contact: {
  phone: SITE_FACTS.phone,
  phoneDisplay: SITE_FACTS.phoneDisplay,
  email: SITE_FACTS.email
}
```

- [ ] **Step 4: Replace duplicate schema package constants**

In `helpers/industrySchema.js`, replace `DEFAULT_OFFERS` with:

```js
import { SITE_FACTS } from './siteFacts.js';

const DEFAULT_OFFERS = SITE_FACTS.packages.map((pkg) => ({
  name: pkg.name,
  price: pkg.schemaPrice,
  url: `/pakete/${pkg.slug}`,
  description: pkg.description
}));
```

- [ ] **Step 5: Verify**

Run:

```bash
npm test
```

Expected: all tests pass, including `siteFacts.test.js` and `industrySchema.test.js`.

---

### Task 2: Reposition Homepage As Brand And Trust Hub

**Files:**
- Modify: `controllers/mainController.js`
- Modify: `views/index.ejs`
- Modify: `views/partials/header.ejs`
- Modify: `views/partials/footer.ejs`

- [ ] **Step 1: Update homepage title and hero copy**

In `controllers/mainController.js`, update `HOMEPAGE_I18N.de`:

```js
seoTitle: 'Komplett Webdesign Berlin | Persönliche Websites für kleine Unternehmen',
seoDescription: 'Komplett Webdesign erstellt moderne, schnelle und SEO-freundliche Websites für kleine Unternehmen in Berlin. Persönlich betreut, Festpreise ab 499 EUR.',
ogTitle: 'Komplett Webdesign: persönliche Websites für kleine Unternehmen in Berlin',
ogDescription: 'Webdesign, Texte, SEO, Hosting und Wartung für kleine Berliner Unternehmen. Transparent, persönlich und ohne Agentur-Chaos.',
heroBadge: 'Persönlicher Webdesigner aus Berlin',
heroTitle: 'Komplett Webdesign:',
heroTitle2: 'persönliche Websites für kleine Unternehmen in Berlin',
heroSubline: 'Modern, schnell, SEO-freundlich und ohne versteckte Kosten',
heroBullet1: 'Direkte Betreuung durch Sören vom Erstgespräch bis zum Launch',
heroBullet2: 'Faire Festpreis-Pakete ab 499 EUR für klare Budgetplanung',
heroBullet3: 'SEO-Grundlage, schnelle Ladezeiten und klare Anfragewege von Anfang an',
heroCtaPrimary: 'Kostenlose Ersteinschätzung anfragen',
heroCtaSecondary: 'Preise ansehen'
```

- [ ] **Step 2: Add visible trust facts below the hero**

In `views/index.ejs`, directly after the hero CTA/price block, add:

```ejs
<ul class="home-trust-strip" aria-label="<%= isEn ? 'Trust facts' : 'Vertrauenssignale' %>">
  <li><%= isEn ? 'Personal contact' : 'Persönlicher Ansprechpartner' %></li>
  <li><%= isEn ? 'Fixed prices from EUR 499' : 'Festpreise ab 499 EUR' %></li>
  <li><%= isEn ? 'First real projects online' : 'Erste echte Projekte online' %></li>
  <li><%= reviewAggregate ? `${Number(reviewAggregate.avg).toLocaleString(isEn ? 'en-US' : 'de-DE', { minimumFractionDigits: 1 })}/5 Google` : (isEn ? 'Google reviews' : 'Google-Bewertungen') %></li>
  <li>Berlin-Lichtenberg</li>
</ul>
```

Add CSS in `public/css/main.css`:

```css
.home-trust-strip {
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
  list-style: none;
  margin: 1rem 0 0;
  padding: 0;
}

.home-trust-strip li {
  background: rgba(255, 255, 255, .9);
  border: 1px solid rgba(12, 42, 70, .12);
  border-radius: 8px;
  color: #0c2a46;
  font-size: .9rem;
  font-weight: 700;
  padding: .45rem .7rem;
}
```

- [ ] **Step 3: Simplify the main navigation**

In `views/partials/header.ejs`, replace the current visible link set with:

```ejs
<a href="<%= homeHref %>">Home</a>
<a href="<%= isEn ? '/en/webdesign-berlin' : '/webdesign-berlin' %>">Webdesign Berlin</a>
<a href="<%= isEn ? '/en/pakete' : '/pakete' %>"><%= isEn ? 'Pricing' : 'Preise' %></a>
<a href="<%= isEn ? '/en/references' : '/referenzen' %>"><%= isEn ? 'References' : 'Referenzen' %></a>
<a href="<%= isEn ? '/en/website-tester' : '/website-tester' %>">Website-Check</a>
<a href="<%= isEn ? '/en/ratgeber' : '/ratgeber' %>"><%= isEn ? 'Guides' : 'Ratgeber' %></a>
<a href="<%= isEn ? '/en/kontakt' : '/kontakt' %>"><%= isEn ? 'Contact' : 'Kontakt' %></a>
```

Move district and industry deep links to `views/partials/footer.ejs`.

- [ ] **Step 4: Verify**

Run:

```bash
npm run build
npm test
```

Expected: CSS build succeeds and all tests pass.

---

### Task 3: Add Reference Hub And Two Project Pages

**Files:**
- Create: `data/referenceProjects.js`
- Create: `controllers/referenceController.js`
- Create: `routes/referenceRoutes.js`
- Create: `views/references/index.ejs`
- Create: `views/references/show.ejs`
- Create: `public/references.css`
- Create: `tests/referenceProjects.test.js`
- Modify: `index.js`
- Modify: `views/partials/header.ejs`
- Modify: `views/partials/footer.ejs`

- [ ] **Step 1: Add reference data**

Create `data/referenceProjects.js`:

```js
export const REFERENCE_PROJECTS = [
  {
    slug: 'zur-alten-backstube',
    name: 'Zur alten Backstube',
    industry: 'Café in Berlin-Rosenthal',
    title: 'Webdesign-Referenz: Zur alten Backstube in Berlin-Rosenthal',
    metaDescription: 'Projektbeispiel für ein Berliner Café: moderne Website, warme Bildsprache, klare Informationen und Online-Reservierung.',
    summary: 'Ein Café mit langer Geschichte bekam eine übersichtliche Website, die Reservierungen erleichtert und den Charakter des Standorts sichtbar macht.',
    problem: 'Vorher mussten viele Reservierungen und Rückfragen telefonisch geklärt werden. Öffnungszeiten, Reservierung und Veranstaltungsinfos sollten online schneller auffindbar sein.',
    goal: 'Eine warme, moderne Website mit klarer Navigation, mobiler Darstellung und einfacher Reservierungsstrecke.',
    implementation: [
      'Modernes Design mit warmer Bildsprache',
      'Öffnungszeiten, Kontakt und Reservierung sichtbar platziert',
      'Mobile Darstellung für Gäste unterwegs',
      'SEO-Grundstruktur für lokale Café-Suchen',
      'Klare Informationsarchitektur für Reservierungen und Veranstaltungen'
    ],
    result: [
      'Reservierungen sind online einfacher möglich',
      'Gäste finden wichtige Informationen schneller',
      'Das Café wirkt online professioneller und persönlicher'
    ],
    quote: 'Das Ergebnis sieht einfach super aus. Es ist jetzt viel einfacher Tische zu reservieren.',
    quoteAuthor: 'Feirefiz',
    image: '/images/review-bg.webp',
    liveUrl: 'https://www.zuraltenbackstube.de'
  },
  {
    slug: 'tm-sauber-mehr',
    name: 'TM Sauber & Mehr',
    industry: 'Lokaler Dienstleister',
    title: 'Webdesign-Referenz: TM Sauber & Mehr',
    metaDescription: 'Projektbeispiel für einen lokalen Dienstleister: Website, Fotos, klare Leistungsstruktur und unkomplizierte Umsetzung.',
    summary: 'Für TM Sauber & Mehr lag der Fokus auf einem professionellen Auftritt, klaren Leistungen und unkomplizierter Projektumsetzung.',
    problem: 'Der Dienstleister brauchte eine professionelle Webpräsenz, die Leistungen verständlich zeigt und Anfragen erleichtert.',
    goal: 'Eine klare, vertrauensbildende Website mit sauberer mobiler Darstellung und nachvollziehbarer Angebotsstruktur.',
    implementation: [
      'Webdesign und Fotomaterial kombiniert',
      'Leistungen verständlich strukturiert',
      'Kontaktwege sichtbar eingebunden',
      'Mobile Darstellung optimiert',
      'SEO-Basis für lokale Dienstleister umgesetzt'
    ],
    result: [
      'Das Angebot ist online klarer erfassbar',
      'Kundenwünsche wurden sichtbar in die Website übersetzt',
      'Der Auftritt wirkt professioneller und anfragefreundlicher'
    ],
    quote: 'Super Service und top Preis-Leistung. Alle unsere Wünsche wurden schnell, professionell und unkompliziert umgesetzt.',
    quoteAuthor: 'TM Sauber & Mehr',
    image: '/images/default-blog.webp',
    liveUrl: ''
  }
];

export function getReferenceBySlug(slug) {
  return REFERENCE_PROJECTS.find((project) => project.slug === slug) || null;
}
```

- [ ] **Step 2: Add controller and routes**

Create `controllers/referenceController.js`:

```js
import { REFERENCE_PROJECTS, getReferenceBySlug } from '../data/referenceProjects.js';

function baseUrl(res) {
  return String(res.locals.canonicalBaseUrl || 'https://www.komplettwebdesign.de').replace(/\/$/, '');
}

export function listReferences(req, res) {
  const base = baseUrl(res);
  res.render('references/index', {
    title: 'Webdesign-Referenzen aus Berlin | Komplett Webdesign',
    description: 'Echte Webdesign-Projekte von Komplett Webdesign: erste Referenzen aus Berlin mit Zielen, Umsetzung, Ergebnis und Kundenstimmen.',
    canonicalUrl: `${base}/referenzen`,
    projects: REFERENCE_PROJECTS,
    structuredDataBlocks: [
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Webdesign-Referenzen aus Berlin',
        url: `${base}/referenzen`,
        mainEntity: REFERENCE_PROJECTS.map((project) => ({
          '@type': 'CreativeWork',
          name: project.name,
          url: `${base}/referenzen/${project.slug}`
        }))
      }
    ]
  });
}

export function showReference(req, res, next) {
  const project = getReferenceBySlug(req.params.slug);
  if (!project) return next();
  const base = baseUrl(res);
  const url = `${base}/referenzen/${project.slug}`;
  return res.render('references/show', {
    title: `${project.name} Referenz | Komplett Webdesign`,
    description: project.metaDescription,
    canonicalUrl: url,
    project,
    structuredDataBlocks: [
      {
        '@context': 'https://schema.org',
        '@type': 'CreativeWork',
        name: project.title,
        url,
        description: project.summary,
        image: project.image.startsWith('http') ? project.image : `${base}${project.image}`,
        author: { '@type': 'Organization', name: 'Komplett Webdesign', url: base }
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Startseite', item: `${base}/` },
          { '@type': 'ListItem', position: 2, name: 'Referenzen', item: `${base}/referenzen` },
          { '@type': 'ListItem', position: 3, name: project.name, item: url }
        ]
      }
    ]
  });
}
```

Create `routes/referenceRoutes.js`:

```js
import { Router } from 'express';
import { listReferences, showReference } from '../controllers/referenceController.js';

const router = Router();

router.get('/referenzen', listReferences);
router.get('/referenzen/:slug', showReference);

export default router;
```

- [ ] **Step 3: Mount routes before catch-all slug routing**

In `index.js`, import:

```js
import referenceRoutes from './routes/referenceRoutes.js';
```

Mount before `app.use(slugRoutes);`:

```js
app.use(referenceRoutes);
app.use(slugRoutes);
```

- [ ] **Step 4: Add templates**

Create `views/references/index.ejs`:

```ejs
<%- include('../partials/head', { title, description, canonicalUrl, structuredDataBlocks }) %>
<%- include('../partials/header') %>
<link rel="stylesheet" href="<%= cssAsset('references.css') %>">

<main class="references-page">
  <section class="references-hero">
    <p class="eyebrow">Referenzen</p>
    <h1>Webdesign-Referenzen aus Berlin: echte Projekte, klare Ergebnisse</h1>
    <p>Komplett Webdesign ist bewusst klein und persönlich aufgebaut. Hier findest du erste echte Projekte, bei denen kleine Unternehmen online professioneller, sichtbarer und anfragefreundlicher geworden sind.</p>
    <a class="btn btn-primary" href="/kontakt">Kostenlose Ersteinschätzung anfragen</a>
  </section>

  <section class="references-grid" aria-label="Projektübersicht">
    <% projects.forEach((project) => { %>
      <article class="reference-card">
        <img src="<%= project.image %>" alt="Screenshot oder Projektbild: <%= project.name %>" width="640" height="420" loading="lazy">
        <div>
          <p class="eyebrow"><%= project.industry %></p>
          <h2><a href="/referenzen/<%= project.slug %>"><%= project.name %></a></h2>
          <p><%= project.summary %></p>
          <a class="text-link" href="/referenzen/<%= project.slug %>">Projekt ansehen</a>
        </div>
      </article>
    <% }) %>
  </section>
</main>

<%- include('../partials/footer') %>
```

Create `views/references/show.ejs` with the same head/header/footer pattern and sections for `problem`, `goal`, `implementation`, `result`, `quote`, and `liveUrl`.

- [ ] **Step 5: Add tests**

Create `tests/referenceProjects.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { REFERENCE_PROJECTS, getReferenceBySlug } from '../data/referenceProjects.js';

test('reference projects expose two real projects with required proof fields', () => {
  assert.equal(REFERENCE_PROJECTS.length, 2);
  for (const project of REFERENCE_PROJECTS) {
    assert.ok(project.slug);
    assert.ok(project.name);
    assert.ok(project.summary);
    assert.ok(project.problem);
    assert.ok(project.goal);
    assert.ok(project.implementation.length >= 3);
    assert.ok(project.result.length >= 2);
  }
});

test('reference copy does not claim unsupported percentage metrics', () => {
  const text = JSON.stringify(REFERENCE_PROJECTS);
  assert.doesNotMatch(text, /\+\d+\s*%|\d+%\s*mehr|LCP|Largest Contentful Paint/i);
});

test('reference lookup works by slug', () => {
  assert.equal(getReferenceBySlug('zur-alten-backstube').name, 'Zur alten Backstube');
  assert.equal(getReferenceBySlug('missing'), null);
});
```

- [ ] **Step 6: Verify**

Run:

```bash
npm test
```

Expected: all tests pass and reference data contains no unsupported numeric case-study claims.

---

### Task 4: Add Low-Friction Contact Form Above The Wizard

**Files:**
- Modify: `routes/contactRoutes.js`
- Modify: `views/kontakt.ejs`
- Modify: `public/kontakt.css`
- Create: `tests/contactQuickForm.test.js`

- [ ] **Step 1: Add quick inquiry route**

In `routes/contactRoutes.js`, add the POST route before the existing `router.post("/")`:

```js
router.post('/kurzanfrage', contactCtrl.webdesignBerlinUpload, contactCtrl.processWebdesignBerlinForm);
```

- [ ] **Step 2: Add quick form before the carousel wizard**

In `views/kontakt.ejs`, insert before the existing `<form id="kontaktForm"...>`:

```ejs
<section class="contact-quick" aria-labelledby="contact-quick-title">
  <div class="contact-quick__copy">
    <p class="contact-quick__eyebrow"><%= isEn ? 'Quick request' : 'Schnellanfrage' %></p>
    <h2 id="contact-quick-title"><%= isEn ? 'Get a free first assessment' : 'Kostenlose Ersteinschätzung für deine neue Website' %></h2>
    <p><%= isEn
      ? 'Briefly describe your project. I will personally reply with an honest package recommendation and next steps.'
      : 'Beschreibe kurz dein Projekt. Ich melde mich persönlich zurück und sage dir ehrlich, welches Paket sinnvoll ist und welche nächsten Schritte passen.'
    %></p>
  </div>
  <form action="<%= isEn ? '/en/kontakt/kurzanfrage' : '/kontakt/kurzanfrage' %>" method="POST" class="contact-quick__form" data-recaptcha="v3" data-recaptcha-action="contact_quick">
    <input type="hidden" name="source" value="kontakt-kurzformular">
    <input type="hidden" name="projectType" value="<%= isEn ? 'Free first assessment' : 'Kostenlose Ersteinschätzung' %>">
    <input type="hidden" name="token">
    <label for="quick-name"><%= isEn ? 'Name' : 'Name' %></label>
    <input id="quick-name" name="name" type="text" autocomplete="name" required>
    <label for="quick-email"><%= isEn ? 'Email' : 'E-Mail' %></label>
    <input id="quick-email" name="email" type="email" autocomplete="email" required>
    <label for="quick-phone"><%= isEn ? 'Phone optional' : 'Telefon optional' %></label>
    <input id="quick-phone" name="phone" type="tel" autocomplete="tel">
    <label for="quick-message"><%= isEn ? 'What is this about?' : 'Worum geht es grob?' %></label>
    <textarea id="quick-message" name="message" rows="4" required></textarea>
    <button type="submit"><%= isEn ? 'Request free assessment' : 'Kostenlose Ersteinschätzung anfragen' %></button>
  </form>
</section>

<p class="contact-wizard-intro">
  <%= isEn
    ? 'Want to plan in more detail right away? Use the project assistant below.'
    : 'Du möchtest direkt genauer planen? Dann nutze den ausführlichen Projektassistenten darunter.'
  %>
</p>
```

- [ ] **Step 3: Add form CSS**

Add to `public/kontakt.css`:

```css
.contact-quick {
  background: #fff;
  border: 1px solid rgba(12, 42, 70, .12);
  border-radius: 8px;
  display: grid;
  gap: 1.5rem;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 420px);
  margin: 1.5rem auto 2rem;
  max-width: 980px;
  padding: 1.25rem;
}

.contact-quick__eyebrow {
  color: #e94a1b;
  font-size: .82rem;
  font-weight: 800;
  margin-bottom: .4rem;
  text-transform: uppercase;
}

.contact-quick__form {
  display: grid;
  gap: .65rem;
}

.contact-quick__form input,
.contact-quick__form textarea {
  border: 1px solid #d8e1ea;
  border-radius: 8px;
  min-height: 44px;
  padding: .7rem .8rem;
}

.contact-quick__form button {
  background: #e94a1b;
  border: 0;
  border-radius: 8px;
  color: #fff;
  font-weight: 800;
  min-height: 46px;
  padding: .75rem 1rem;
}

.contact-wizard-intro {
  color: #eaeae9;
  font-weight: 700;
  margin: 0 auto 1rem;
  max-width: 760px;
  text-align: center;
}

@media (max-width: 760px) {
  .contact-quick {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 4: Add tests**

Create `tests/contactQuickForm.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const routes = readFileSync(new URL('../routes/contactRoutes.js', import.meta.url), 'utf8');
const view = readFileSync(new URL('../views/kontakt.ejs', import.meta.url), 'utf8');

test('contact page exposes quick assessment form before wizard', () => {
  assert.match(view, /contact-quick/);
  assert.match(view, /Kostenlose Ersteinschätzung/);
  assert.match(view, /name="message"/);
  assert.ok(view.indexOf('contact-quick') < view.indexOf('kontaktForm'));
});

test('contact quick form posts to dedicated route using existing lead handler', () => {
  assert.match(routes, /router\.post\('\/kurzanfrage'/);
  assert.match(routes, /processWebdesignBerlinForm/);
});
```

- [ ] **Step 5: Verify**

Run:

```bash
npm test
```

Expected: all tests pass and the quick form appears before the long wizard in the template.

---

### Task 5: Sharpen `/webdesign-berlin` And Remove Unsupported Proof

**Files:**
- Modify: `controllers/districtController.js`
- Modify: `views/bereiche/webdesign-berlin.ejs`
- Modify: `tests/seoLandingPages.test.js` or create `tests/webdesignBerlinContent.test.js`

- [ ] **Step 1: Replace hero and CTA copy**

In `controllers/districtController.js`, update German hero values:

```js
let metaTitle = 'Webdesign Berlin für kleine Unternehmen | Komplett Webdesign';
let metaDescription = 'Webdesign Berlin für kleine Unternehmen, Selbstständige und lokale Dienstleister: persönliche Websites ab 499 EUR mit SEO-Basis, mobiler Optimierung und klaren Anfragewegen.';

const hero = {
  title: 'Webdesign Berlin für kleine Unternehmen, die online Anfragen gewinnen wollen',
  description: 'Persönliches Webdesign ab 499 EUR, inklusive SEO-Grundlage, mobiler Optimierung und klarer Anfrageführung. Ideal für lokale Dienstleister, Handwerker, Cafés, Restaurants, Praxen und Selbstständige in Berlin.',
  ctaPrimary: { label: 'Kostenlose Ersteinschätzung anfragen', href: '/kontakt' },
  ctaSecondary: { label: 'Preise und Pakete ansehen', href: '/webdesign-berlin/kosten-preise-pakete' },
  ctaTertiary: { label: 'Website-Tester starten', href: '/website-tester' },
  rating: { label: formatGoogleRating(lng), href: SITE_FACTS.googleProfileUrl },
  image: {
    src: 'https://res.cloudinary.com/dvd2cd2be/image/upload/v1755194839/admin_gallery/rvkdyvpwrd25fcm9v3av.webp',
    alt: 'Sören Blocksdorf - Webdesigner Berlin'
  },
  trustBadges: [
    'Persönliche Betreuung statt Agentur-Pingpong',
    'Festpreise ab 499 EUR',
    'Antwort innerhalb von 24 Stunden'
  ]
};
```

- [ ] **Step 2: Replace unsupported case-study metrics**

Replace `caseStudies` with:

```js
const caseStudies = [
  {
    name: 'Zur alten Backstube · Café in Rosenthal',
    summary: 'Website für ein Berliner Café mit warmer Bildsprache, klaren Informationen und Online-Reservierung.',
    bullets: [
      'Online-Reservierung sichtbar eingebunden',
      'Öffnungszeiten und Kontaktwege schneller auffindbar',
      'Mobile Darstellung für Gäste unterwegs optimiert'
    ],
    quote: 'Das Ergebnis sieht einfach super aus. Es ist jetzt viel einfacher Tische zu reservieren.',
    link: '/referenzen/zur-alten-backstube',
    image: '/images/review-bg.webp'
  },
  {
    name: 'TM Sauber & Mehr · lokaler Dienstleister',
    summary: 'Professioneller Online-Auftritt mit Webdesign, Fotos und klarer Leistungsstruktur.',
    bullets: [
      'Leistungen verständlicher strukturiert',
      'Kontaktwege klarer platziert',
      'Projektwünsche schnell und unkompliziert umgesetzt'
    ],
    quote: 'Super Service und top Preis-Leistung. Alle unsere Wünsche wurden schnell, professionell und unkompliziert umgesetzt.',
    link: '/referenzen/tm-sauber-mehr',
    image: '/images/default-blog.webp'
  }
];
```

Update `pageCopy.casesTitle`:

```js
casesTitle: 'Erste echte Webdesign-Projekte aus Berlin'
```

- [ ] **Step 3: Add test for no fabricated metrics**

Create `tests/webdesignBerlinContent.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const controller = readFileSync(new URL('../controllers/districtController.js', import.meta.url), 'utf8');

test('webdesign berlin content avoids unsupported numeric case metrics', () => {
  assert.doesNotMatch(controller, /\+70\s*%|50%\s*mehr|1,4\s*s Largest Contentful Paint/i);
  assert.match(controller, /Erste echte Webdesign-Projekte aus Berlin|erste echte/i);
});

test('webdesign berlin targets the correct primary intent', () => {
  assert.match(controller, /Webdesign Berlin für kleine Unternehmen/);
  assert.match(controller, /Preise und Pakete ansehen/);
});
```

- [ ] **Step 4: Verify**

Run:

```bash
npm test
```

Expected: all tests pass, and `/webdesign-berlin` no longer claims unsupported percentage or LCP numbers.

---

### Task 6: Add New Money Pages For Search Intent Separation

**Files:**
- Create: `data/seoLandingPages.js`
- Create: `controllers/seoLandingController.js`
- Create: `routes/seoLandingRoutes.js`
- Create: `views/seo_landing/show.ejs`
- Create: `public/seo-landing.css`
- Create: `tests/seoLandingPages.test.js`
- Modify: `index.js`
- Modify: `controllers/sitemapController.js`

- [ ] **Step 1: Add SEO landing data**

Create `data/seoLandingPages.js`:

```js
export const SEO_LANDING_PAGES = {
  'website-erstellen-lassen-berlin': {
    path: '/website-erstellen-lassen-berlin',
    primaryKeyword: 'website erstellen lassen berlin',
    title: 'Website erstellen lassen Berlin | Persönlich ab 499 EUR',
    description: 'Website erstellen lassen in Berlin: Komplett Webdesign erstellt moderne Websites für kleine Unternehmen mit Texten, SEO-Basis und klaren Anfragewegen.',
    h1: 'Website erstellen lassen in Berlin - persönlich, bezahlbar und SEO-freundlich',
    intro: 'Wenn du in Berlin eine Website erstellen lassen möchtest, brauchst du keinen komplizierten Agenturprozess. Du brauchst eine klare Struktur, verständliche Texte, saubere Technik und jemanden, der dich persönlich durch das Projekt führt.',
    sections: [
      {
        h2: 'Für wen diese Seite gedacht ist',
        body: 'Die Seite richtet sich an kleine Unternehmen, Selbstständige und lokale Dienstleister, die eine neue Website brauchen und noch nicht genau wissen, welcher Umfang sinnvoll ist.'
      },
      {
        h2: 'Was enthalten ist',
        body: 'Je nach Paket bekommst du Design, Texte, SEO-Grundoptimierung, Kontaktformular, rechtliche Grundseiten, Hosting-Optionen und persönliche Betreuung.'
      },
      {
        h2: 'Was eine Website in Berlin kostet',
        body: 'Der Einstieg liegt beim Basis-Paket ab 499 EUR. Das Business-Paket startet bei 899 EUR, Premium bei 1.499 EUR. Laufende Kosten wie Domain, Mail, Hosting und Wartung werden separat ausgewiesen.'
      }
    ],
    cta: { label: 'Kostenlose Ersteinschätzung anfragen', href: '/kontakt' },
    secondaryCta: { label: 'Preise ansehen', href: '/webdesign-berlin/kosten-preise-pakete' },
    faq: [
      {
        q: 'Wie lange dauert es, eine Website erstellen zu lassen?',
        a: 'Je nach Paket dauert ein Projekt typischerweise 2 bis 8 Wochen. Kleine Onepager sind schneller, umfangreichere Websites brauchen mehr Abstimmung.'
      },
      {
        q: 'Sind Texte und SEO enthalten?',
        a: 'Ja. Texte und SEO-Grundoptimierung sind Teil der Pakete. Bei größeren Zielen kann SEO später gezielt ausgebaut werden.'
      },
      {
        q: 'Kann ich klein starten und später erweitern?',
        a: 'Ja. Gerade für junge Unternehmen ist ein sauberer Start mit späterer Erweiterung oft sinnvoller als ein zu großes Erstprojekt.'
      }
    ],
    internalLinks: [
      { label: 'Webdesign Berlin', href: '/webdesign-berlin' },
      { label: 'Referenzen', href: '/referenzen' },
      { label: 'Website-Tester', href: '/website-tester' }
    ]
  },
  'webdesign-kleine-unternehmen-berlin': {
    path: '/webdesign-kleine-unternehmen-berlin',
    primaryKeyword: 'webdesign kleine unternehmen berlin',
    title: 'Webdesign für kleine Unternehmen in Berlin | Komplett Webdesign',
    description: 'Webdesign für kleine Unternehmen in Berlin: persönliche Betreuung, klare Festpreise, SEO-Basis und Websites, die Anfragen erleichtern.',
    h1: 'Webdesign für kleine Unternehmen in Berlin',
    intro: 'Kleine Unternehmen brauchen keine aufgeblähte Agentur-Website. Sie brauchen eine klare Website, die Vertrauen schafft, Leistungen erklärt und Besucher schnell zur Anfrage führt.',
    sections: [
      {
        h2: 'Warum kleine Unternehmen anders planen sollten',
        body: 'Budget, Zeit und Inhalte sind oft begrenzt. Deshalb priorisieren wir die Seiten, die zuerst Vertrauen und Anfragen erzeugen: Startseite, Leistungen, Über uns, Kontakt und bei Bedarf Referenzen.'
      },
      {
        h2: 'Was Komplett Webdesign übernimmt',
        body: 'Du bekommst Design, Texte, technische Umsetzung, SEO-Basis, Hosting-Optionen und Wartung aus einer Hand. Der Prozess bleibt verständlich und planbar.'
      },
      {
        h2: 'Der richtige Einstieg',
        body: 'Für viele kleine Unternehmen ist das Business-Paket ab 899 EUR der beste Start, weil mehrere Leistungen und Kontaktwege sauber dargestellt werden können.'
      }
    ],
    cta: { label: 'Kleine Unternehmenswebsite planen', href: '/kontakt' },
    secondaryCta: { label: 'Business-Paket ansehen', href: '/pakete/business' },
    faq: [
      {
        q: 'Reicht ein Onepager für kleine Unternehmen?',
        a: 'Für den Start manchmal ja. Wenn du mehrere Leistungen erklären oder lokal besser gefunden werden willst, ist eine mehrseitige Struktur oft stärker.'
      },
      {
        q: 'Was ist wichtiger: Design oder SEO?',
        a: 'Beides muss zusammenpassen. Gutes Design schafft Vertrauen, SEO sorgt für Auffindbarkeit, klare CTAs machen aus Besuchern Anfragen.'
      },
      {
        q: 'Muss ich mich technisch auskennen?',
        a: 'Nein. Hosting, Formulare, SEO-Grundlagen und Wartung können komplett betreut werden.'
      }
    ],
    internalLinks: [
      { label: 'Website erstellen lassen Berlin', href: '/website-erstellen-lassen-berlin' },
      { label: 'Preise und Pakete', href: '/webdesign-berlin/kosten-preise-pakete' },
      { label: 'Referenzen', href: '/referenzen' }
    ]
  },
  ablauf: {
    path: '/ablauf',
    primaryKeyword: 'website projekt ablauf',
    title: 'Ablauf eines Website-Projekts | Komplett Webdesign Berlin',
    description: 'So läuft ein Website-Projekt bei Komplett Webdesign ab: Erstgespräch, Struktur, Design, Texte, Umsetzung, Launch und Betreuung.',
    h1: 'So läuft dein Website-Projekt ab',
    intro: 'Ein gutes Website-Projekt braucht keine komplizierte Agenturstruktur, sondern klare Schritte, schnelle Rückmeldungen und verständliche Entscheidungen.',
    sections: [
      {
        h2: '1. Erstgespräch und Zielklärung',
        body: 'Wir klären Angebot, Zielgruppe, Budget, Umfang und ob Basis, Business oder Premium sinnvoll ist.'
      },
      {
        h2: '2. Struktur, Texte und Designrichtung',
        body: 'Aus deinen Leistungen entsteht eine Seitenstruktur mit klaren Botschaften, SEO-Grundlage und Anfragewegen.'
      },
      {
        h2: '3. Umsetzung, Test und Launch',
        body: 'Die Website wird responsive umgesetzt, technisch geprüft, mit dir abgestimmt und nach Freigabe live gestellt.'
      }
    ],
    cta: { label: 'Projekt kurz beschreiben', href: '/kontakt' },
    secondaryCta: { label: 'Referenzen ansehen', href: '/referenzen' },
    faq: [
      {
        q: 'Wie viel Zeit muss ich selbst einplanen?',
        a: 'Vor allem für Erstgespräch, Feedback und Freigaben. Texte und Struktur können im Projekt mit übernommen werden.'
      },
      {
        q: 'Wann sehe ich den ersten Entwurf?',
        a: 'Bei typischen kleinen Projekten entsteht der erste belastbare Entwurf innerhalb der frühen Projektphase, sobald Ziele und Inhalte klar sind.'
      },
      {
        q: 'Was passiert nach dem Launch?',
        a: 'Du kannst Hosting, Wartung, kleine Erweiterungen und SEO-Ausbau weiter betreuen lassen.'
      }
    ],
    internalLinks: [
      { label: 'Kontakt', href: '/kontakt' },
      { label: 'Pakete', href: '/pakete' },
      { label: 'Webdesign Berlin', href: '/webdesign-berlin' }
    ]
  }
};

export function getSeoLandingPage(slug) {
  return SEO_LANDING_PAGES[slug] || null;
}
```

- [ ] **Step 2: Add controller and route**

Create `controllers/seoLandingController.js`:

```js
import { getSeoLandingPage } from '../data/seoLandingPages.js';

function buildSchemas({ page, base, url }) {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: page.h1,
      url,
      description: page.description,
      inLanguage: 'de-DE'
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Startseite', item: `${base}/` },
        { '@type': 'ListItem', position: 2, name: page.h1, item: url }
      ]
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: page.faq.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a }
      }))
    }
  ];
}

export function showSeoLandingPage(req, res, next) {
  const page = getSeoLandingPage(req.params.slug);
  if (!page) return next();
  const base = String(res.locals.canonicalBaseUrl || 'https://www.komplettwebdesign.de').replace(/\/$/, '');
  const url = `${base}${page.path}`;
  return res.render('seo_landing/show', {
    title: page.title,
    description: page.description,
    canonicalUrl: url,
    page,
    structuredDataBlocks: buildSchemas({ page, base, url })
  });
}
```

Create `routes/seoLandingRoutes.js`:

```js
import { Router } from 'express';
import { showSeoLandingPage } from '../controllers/seoLandingController.js';

const router = Router();

router.get('/:slug(website-erstellen-lassen-berlin|webdesign-kleine-unternehmen-berlin|ablauf)', showSeoLandingPage);

export default router;
```

- [ ] **Step 3: Mount route before `slugRoutes`**

In `index.js`, import and mount:

```js
import seoLandingRoutes from './routes/seoLandingRoutes.js';

app.use(seoLandingRoutes);
app.use(referenceRoutes);
app.use(slugRoutes);
```

- [ ] **Step 4: Add template**

Create `views/seo_landing/show.ejs`:

```ejs
<%- include('../partials/head', { title, description, canonicalUrl, structuredDataBlocks }) %>
<%- include('../partials/header') %>
<link rel="stylesheet" href="<%= cssAsset('seo-landing.css') %>">

<main class="seo-landing">
  <section class="seo-landing__hero">
    <p class="eyebrow"><%= page.primaryKeyword %></p>
    <h1><%= page.h1 %></h1>
    <p><%= page.intro %></p>
    <div class="seo-landing__actions">
      <a class="btn btn-primary" href="<%= page.cta.href %>"><%= page.cta.label %></a>
      <a class="btn btn-secondary" href="<%= page.secondaryCta.href %>"><%= page.secondaryCta.label %></a>
    </div>
  </section>

  <section class="seo-landing__sections">
    <% page.sections.forEach((section) => { %>
      <article>
        <h2><%= section.h2 %></h2>
        <p><%= section.body %></p>
      </article>
    <% }) %>
  </section>

  <section class="seo-landing__links" aria-label="Weiterführende Seiten">
    <% page.internalLinks.forEach((link) => { %>
      <a href="<%= link.href %>"><%= link.label %></a>
    <% }) %>
  </section>

  <section class="seo-landing__faq">
    <h2>Häufige Fragen</h2>
    <% page.faq.forEach((item) => { %>
      <details>
        <summary><h3><%= item.q %></h3></summary>
        <p><%= item.a %></p>
      </details>
    <% }) %>
  </section>
</main>

<%- include('../partials/footer') %>
```

- [ ] **Step 5: Add tests**

Create `tests/seoLandingPages.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { SEO_LANDING_PAGES, getSeoLandingPage } from '../data/seoLandingPages.js';

test('seo landing pages have unique search intent and metadata', () => {
  const pages = Object.values(SEO_LANDING_PAGES);
  assert.equal(new Set(pages.map((page) => page.primaryKeyword)).size, pages.length);
  assert.equal(new Set(pages.map((page) => page.title)).size, pages.length);
  for (const page of pages) {
    assert.ok(page.path.startsWith('/'));
    assert.ok(page.h1.length >= 20);
    assert.ok(page.description.length >= 120);
    assert.ok(page.faq.length >= 3);
    assert.ok(page.cta.href);
  }
});

test('website erstellen lassen berlin page is distinct from webdesign berlin', () => {
  const page = getSeoLandingPage('website-erstellen-lassen-berlin');
  assert.match(page.primaryKeyword, /website erstellen lassen berlin/);
  assert.doesNotMatch(page.title.toLowerCase(), /^webdesign berlin:/);
});
```

- [ ] **Step 6: Verify**

Run:

```bash
npm test
```

Expected: all tests pass and the new landing page content has unique titles and H1s.

---

### Task 7: Improve Cost Page With 2026 Examples And Running Costs

**Files:**
- Modify: `controllers/leistungenController.js`
- Modify: `views/leistungen/show.ejs`
- Create or modify: `tests/leistungenKostenPage.test.js`

- [ ] **Step 1: Add example calculations to the override**

In `controllers/leistungenController.js`, add inside the `kosten-preise-pakete` override:

```js
exampleCalculations: [
  {
    title: 'Beispiel 1: Selbstständiger Onepager',
    setup: 'Basis-Paket',
    oneTime: '499 EUR einmalig',
    recurring: 'optional: Domain/Mail ab 10 EUR, Hosting 10 EUR, Wartung 5 EUR pro Monat',
    note: 'Geeignet, wenn eine klare digitale Visitenkarte mit Kontaktweg reicht.'
  },
  {
    title: 'Beispiel 2: Kleines Unternehmen mit 5 Seiten',
    setup: 'Business-Paket',
    oneTime: '899 EUR einmalig',
    recurring: 'optional: Domain/Mail ab 10 EUR, Hosting 10 EUR, Wartung 5 EUR pro Monat',
    note: 'Geeignet, wenn Leistungen, Über uns, Kontakt und lokale SEO-Struktur wichtig sind.'
  },
  {
    title: 'Beispiel 3: Restaurant oder Café mit Reservierung',
    setup: 'Premium-Paket oder individuelles Angebot',
    oneTime: 'ab 1.499 EUR einmalig',
    recurring: 'optional: Domain/Mail ab 10 EUR, Hosting 10 EUR, Wartung 5 EUR pro Monat',
    note: 'Geeignet, wenn Reservierung, Veranstaltungen, viele Inhalte oder spätere Erweiterungen geplant sind.'
  }
]
```

Add it to the `page` object:

```js
exampleCalculations: override.exampleCalculations || []
```

- [ ] **Step 2: Render examples in the template**

In `views/leistungen/show.ejs`, after the hero/answer block and before FAQ, add:

```ejs
<% if (page.exampleCalculations && page.exampleCalculations.length) { %>
  <section class="leistungen-examples" aria-labelledby="leistungen-examples-title">
    <h2 id="leistungen-examples-title">Beispielrechnungen für typische Website-Projekte</h2>
    <div class="leistungen-example-grid">
      <% page.exampleCalculations.forEach((example) => { %>
        <article class="leistungen-example">
          <h3><%= example.title %></h3>
          <p><strong>Paket:</strong> <%= example.setup %></p>
          <p><strong>Einmalig:</strong> <%= example.oneTime %></p>
          <p><strong>Laufend:</strong> <%= example.recurring %></p>
          <p><%= example.note %></p>
        </article>
      <% }) %>
    </div>
  </section>
<% } %>
```

- [ ] **Step 3: Add content test**

Create `tests/leistungenKostenPage.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const controller = readFileSync(new URL('../controllers/leistungenController.js', import.meta.url), 'utf8');
const view = readFileSync(new URL('../views/leistungen/show.ejs', import.meta.url), 'utf8');

test('kosten page uses current 2026 pricing and example calculations', () => {
  assert.match(controller, /Website Kosten in Berlin 2026/);
  assert.match(controller, /Beispiel 1: Selbstständiger Onepager/);
  assert.match(controller, /899 EUR einmalig/);
  assert.match(controller, /ab 1\.499 EUR einmalig/);
});

test('leistungen template renders example calculations when present', () => {
  assert.match(view, /page\.exampleCalculations/);
  assert.match(view, /Beispielrechnungen für typische Website-Projekte/);
});
```

- [ ] **Step 4: Verify**

Run:

```bash
npm test
```

Expected: all tests pass and the cost page exposes clear package examples.

---

### Task 8: Clean Schema And Canonical Signals

**Files:**
- Modify: `controllers/districtController.js`
- Modify: `helpers/industrySchema.js`
- Modify: `controllers/seoLandingController.js`
- Modify: `controllers/referenceController.js`
- Modify: `views/partials/head.ejs` only if canonical URL handling needs a bugfix
- Create: `tests/schemaConsistency.test.js`

- [ ] **Step 1: Keep Review Schema out of LocalBusiness**

Do not add `aggregateRating` to `ProfessionalService` or `LocalBusiness` for self-serving local business reviews. Keep visible reviews in HTML only.

Add `tests/schemaConsistency.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('local business schemas do not use self-serving aggregateRating', () => {
  const files = [
    '../controllers/districtController.js',
    '../helpers/industrySchema.js',
    '../controllers/referenceController.js',
    '../controllers/seoLandingController.js'
  ];
  for (const file of files) {
    const text = readFileSync(new URL(file, import.meta.url), 'utf8');
    assert.doesNotMatch(text, /aggregateRating/);
  }
});
```

- [ ] **Step 2: Ensure page-specific canonical URLs**

In new controllers, always pass `canonicalUrl` to the shared head partial:

```js
canonicalUrl: `${base}${page.path}`
```

For existing `views/partials/head.ejs`, keep the fallback:

```ejs
const pageCanonical = canonicalUrl || `${siteBase}/`;
```

No code change is needed if new controllers pass `canonicalUrl`.

- [ ] **Step 3: Verify JSON-LD rendering with a browser**

Run the dev server:

```bash
npm run dev
```

Open these URLs with Browser Use or Playwright:

```text
http://127.0.0.1:3000/
http://127.0.0.1:3000/webdesign-berlin
http://127.0.0.1:3000/website-erstellen-lassen-berlin
http://127.0.0.1:3000/referenzen/zur-alten-backstube
```

In the browser console, run:

```js
Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((node) => JSON.parse(node.textContent))
```

Expected: JSON parses successfully; no `aggregateRating` exists on local business schemas.

---

### Task 9: Update Sitemap And Generated Page Policy

**Files:**
- Create: `helpers/seoPagePolicy.js`
- Create: `tests/seoPagePolicy.test.js`
- Modify: `controllers/sitemapController.js`

- [ ] **Step 1: Add sitemap/indexation policy**

Create `helpers/seoPagePolicy.js`:

```js
export const INDEXABLE_STATIC_ROUTES = [
  '/',
  '/webdesign-berlin',
  '/website-erstellen-lassen-berlin',
  '/webdesign-kleine-unternehmen-berlin',
  '/webdesign-berlin/kosten-preise-pakete',
  '/pakete',
  '/pakete/basis',
  '/pakete/business',
  '/pakete/premium',
  '/referenzen',
  '/referenzen/zur-alten-backstube',
  '/referenzen/tm-sauber-mehr',
  '/ablauf',
  '/website-tester',
  '/website-tester/seo',
  '/website-tester/geo',
  '/website-tester/meta',
  '/kontakt',
  '/about',
  '/ratgeber'
];

export const PRIORITY_INDUSTRY_SLUGS = new Set([
  'handwerker',
  'restaurant',
  'cafe',
  'reinigungsfirma',
  'immobilienmakler'
]);

export const REVIEWED_DISTRICT_SLUGS = new Set([
  'lichtenberg',
  'mitte',
  'kreuzberg',
  'friedrichshain',
  'charlottenburg',
  'prenzlauer-berg'
]);

export function shouldIncludeIndustryInSitemap(row = {}) {
  const slug = String(row.slug || '').replace(/^webdesign-/, '');
  const text = [row.slug, row.name, row.title, row.description].filter(Boolean).join(' ').toLowerCase();
  const excluded = ['kita', 'kitas', 'schule', 'schulen', 'school', 'schools', 'daycare', 'daycares', 'kindergarten']
    .some((needle) => text.includes(needle));
  return !excluded && PRIORITY_INDUSTRY_SLUGS.has(slug);
}

export function shouldIncludeDistrictInSitemap(slug = '') {
  return REVIEWED_DISTRICT_SLUGS.has(String(slug || '').toLowerCase());
}
```

- [ ] **Step 2: Use policy in sitemap**

In `controllers/sitemapController.js`, import:

```js
import {
  INDEXABLE_STATIC_ROUTES,
  shouldIncludeDistrictInSitemap,
  shouldIncludeIndustryInSitemap
} from '../helpers/seoPagePolicy.js';
```

Replace manual static route entries for marketing pages with:

```js
const staticRoutes = INDEXABLE_STATIC_ROUTES.map((route) => ({
  loc: `${base}${route === '/' ? '/' : route}`,
  changefreq: route === '/' || route === '/webdesign-berlin' ? 'weekly' : 'monthly',
  priority: route === '/' || route === '/webdesign-berlin' ? 1.0 : 0.8
}));
```

Filter district and industry routes:

```js
const districtRoutesDe = DISTRICTS
  .filter((d) => shouldIncludeDistrictInSitemap(d.slug))
  .map((d) => ({
    loc: `${base}/webdesign-berlin/${d.slug}`,
    lastmod: nowIso,
    changefreq: 'monthly',
    priority: 0.7
  }));
```

```js
const industryRoutes = industries
  .filter((r) => shouldIncludeIndustryInSitemap(r))
  .map((r) => ({
    loc: `${base}/branchen/webdesign-${String(r.slug || '').replace(/^webdesign-/, '')}`,
    lastmod: toIso(r.updated_at, nowIso),
    changefreq: 'monthly',
    priority: 0.75
  }));
```

- [ ] **Step 3: Add policy tests**

Create `tests/seoPagePolicy.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INDEXABLE_STATIC_ROUTES,
  shouldIncludeDistrictInSitemap,
  shouldIncludeIndustryInSitemap
} from '../helpers/seoPagePolicy.js';

test('static SEO routes include new money and reference pages', () => {
  assert.ok(INDEXABLE_STATIC_ROUTES.includes('/website-erstellen-lassen-berlin'));
  assert.ok(INDEXABLE_STATIC_ROUTES.includes('/webdesign-kleine-unternehmen-berlin'));
  assert.ok(INDEXABLE_STATIC_ROUTES.includes('/referenzen/zur-alten-backstube'));
});

test('industry sitemap policy includes priority pages and excludes weak/risky pages', () => {
  assert.equal(shouldIncludeIndustryInSitemap({ slug: 'handwerker', name: 'Handwerker' }), true);
  assert.equal(shouldIncludeIndustryInSitemap({ slug: 'tattoo-studio', name: 'Tattoo Studio' }), false);
  assert.equal(shouldIncludeIndustryInSitemap({ slug: 'kita', name: 'Kita' }), false);
});

test('district sitemap policy includes only reviewed districts', () => {
  assert.equal(shouldIncludeDistrictInSitemap('lichtenberg'), true);
  assert.equal(shouldIncludeDistrictInSitemap('spandau'), false);
});
```

- [ ] **Step 4: Verify sitemap locally**

Run:

```bash
npm test
npm run dev
```

Open:

```text
http://127.0.0.1:3000/sitemap.xml
```

Expected: new money/reference pages are present; low-priority industry pages are absent from the sitemap until upgraded.

---

### Task 10: Update About Page For Honest Proof Positioning

**Files:**
- Modify: `views/about.ejs`
- Modify: `public/about.css`
- Create: `tests/aboutCopy.test.js`

- [ ] **Step 1: Remove overclaims**

In `views/about.ejs`, replace the paragraph currently claiming broad project history with:

```ejs
<p>
  Komplett Webdesign ist noch keine große Agentur mit hunderten Referenzen.
  Genau deshalb arbeite ich persönlich, fokussiert und nah am Projekt.
  Du bekommst keinen Standardprozess aus der Massenabfertigung, sondern direkte Betreuung
  vom ersten Gespräch bis zum Launch.
</p>
```

Remove or rewrite lines that imply:

```text
Dutzenden realisierten Projekten
vom Familiencafé um die Ecke über Künstler und Berater bis hin zum Tech-Startup war schon alles dabei
```

- [ ] **Step 2: Add decision-fit sections**

Add sections:

```ejs
<section id="fit" class="about-section two-column">
  <h2>Für wen ich der richtige Ansprechpartner bin</h2>
  <div class="column">
    <ul>
      <li>Kleine Unternehmen, die eine professionelle Website ohne Agentur-Chaos brauchen.</li>
      <li>Selbstständige, die schnell sichtbar werden und klare Preise wollen.</li>
      <li>Lokale Dienstleister, Cafés, Restaurants und Handwerker, die mehr Anfragen oder Reservierungen ermöglichen wollen.</li>
    </ul>
  </div>
  <div class="column">
    <h3>Für wen ich nicht der richtige Anbieter bin</h3>
    <ul>
      <li>Enterprise-Projekte mit langen Ausschreibungsprozessen.</li>
      <li>Reine Billigprojekte ohne Qualitätsanspruch.</li>
      <li>Projekte mit unrealistischen Ranking-Garantien.</li>
    </ul>
  </div>
</section>
```

- [ ] **Step 3: Add tests**

Create `tests/aboutCopy.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const about = readFileSync(new URL('../views/about.ejs', import.meta.url), 'utf8');

test('about page uses honest current-stage positioning', () => {
  assert.match(about, /noch keine große Agentur mit hunderten Referenzen/);
  assert.match(about, /persönlich, fokussiert und nah am Projekt/);
  assert.doesNotMatch(about, /Dutzenden realisierten Projekten/);
  assert.doesNotMatch(about, /Tech-Startup war schon alles dabei/);
});
```

- [ ] **Step 4: Verify**

Run:

```bash
npm test
```

Expected: about copy is honest and no longer overstates proof.

---

### Task 11: Prioritize And Improve Industry Pages

**Files:**
- Modify: `data/industries.bulk.json` if it is the import source for current industry content.
- Modify via admin/import flow if production industry data lives in PostgreSQL.
- Modify: `controllers/industriesController.js` only if page-level `robots` policy is added.
- Modify: `views/industries/show.ejs`

- [ ] **Step 1: Lock priority order**

Priority pages for the first pass:

```text
/branchen/webdesign-handwerker
/branchen/webdesign-restaurant
/branchen/webdesign-cafe
/branchen/webdesign-reinigungsfirma
```

Keep lower priority pages out of the sitemap until content is clearly differentiated.

- [ ] **Step 2: Required content for each priority industry page**

Each priority page must include:

```text
H1: Webdesign für [Branche] in Berlin
Intro: concrete industry problem
Functions: 5 specific website features for that industry
SEO: local SEO angle for Berlin
Package recommendation: Basis/Business/Premium with reason
Proof: relevant reference if available, otherwise honest process/proof block
FAQ: at least 5 industry-specific questions
CTA: Kostenlose Ersteinschätzung anfragen
```

- [ ] **Step 3: Avoid thin generated language**

Remove generic lines like:

```text
Wir bieten noch viele weitere Branchenlösungen an.
professionelle Website für Ihre Branche
mehr Sichtbarkeit und mehr Kunden
```

Replace with branch-specific claims, for example for cafés:

```text
Für Cafés zählen mobil zuerst Öffnungszeiten, Adresse, Speisekarte, Reservierung und aktuelle Hinweise. Die Website muss diese Informationen schneller liefern als ein Social-Media-Profil.
```

- [ ] **Step 4: Verify**

Run:

```bash
npm test
```

Then manually inspect:

```text
http://127.0.0.1:3000/branchen/webdesign-cafe
http://127.0.0.1:3000/branchen/webdesign-handwerker
```

Expected: each priority page has unique, industry-specific sections and no copy that could be swapped unchanged onto another industry page.

---

### Task 12: Frontend QA And Core Web Vitals Pass

**Files:**
- Modify as needed: `views/index.ejs`
- Modify as needed: `views/bereiche/webdesign-berlin.ejs`
- Modify as needed: `views/kontakt.ejs`
- Modify as needed: `views/references/*.ejs`
- Modify as needed: `views/seo_landing/show.ejs`
- Modify as needed: `public/css/main.css`
- Modify as needed: `public/district-berlin.css`
- Modify as needed: `public/kontakt.css`
- Modify as needed: `public/references.css`
- Modify as needed: `public/seo-landing.css`

- [ ] **Step 1: Build CSS**

Run:

```bash
npm run build
```

Expected: CSS asset build exits with code 0.

- [ ] **Step 2: Start local server**

Run:

```bash
npm run dev
```

Expected: local server starts and renders pages.

- [ ] **Step 3: Browser smoke test**

Open and inspect:

```text
http://127.0.0.1:3000/
http://127.0.0.1:3000/webdesign-berlin
http://127.0.0.1:3000/website-erstellen-lassen-berlin
http://127.0.0.1:3000/webdesign-kleine-unternehmen-berlin
http://127.0.0.1:3000/referenzen
http://127.0.0.1:3000/referenzen/zur-alten-backstube
http://127.0.0.1:3000/kontakt
http://127.0.0.1:3000/sitemap.xml
```

Check desktop and mobile widths:

```text
1440x1000
390x844
```

Expected:
- no horizontal scrolling
- no overlapped text
- quick contact form above wizard
- reference pages render with images and CTAs
- new SEO pages render one H1 and unique title/description
- sitemap includes only index-worthy pages

- [ ] **Step 4: Technical SEO checks**

For each inspected page, verify in browser console:

```js
document.querySelectorAll('h1').length
document.querySelector('link[rel="canonical"]')?.href
document.querySelector('meta[name="description"]')?.content
Array.from(document.querySelectorAll('script[type="application/ld+json"]')).length
```

Expected:
- exactly one H1
- canonical points to the current clean URL
- meta description exists and is page-specific
- JSON-LD exists where planned

---

## Suggested Execution Order

1. Task 1: central facts.
2. Task 4: contact quick form, because it improves conversion fastest.
3. Task 3: references, because it fixes the proof gap.
4. Task 5: `/webdesign-berlin`, because it is the main money page.
5. Task 6: new intent-separated money pages.
6. Task 7: cost page.
7. Task 8 and Task 9: schema and sitemap cleanup.
8. Task 10: about page honesty.
9. Task 11: priority industry pages.
10. Task 12: full frontend and technical QA.

## Definition Of Done

- All hardcoded rating and price inconsistencies are removed or intentionally centralized.
- `/referenzen`, `/referenzen/zur-alten-backstube`, and `/referenzen/tm-sauber-mehr` are live.
- `/website-erstellen-lassen-berlin`, `/webdesign-kleine-unternehmen-berlin`, and `/ablauf` are live with unique metadata and schema.
- Contact page has a 3-field quick request path before the detailed wizard.
- `/webdesign-berlin` no longer claims unsupported percentage or performance metrics.
- `/webdesign-berlin/kosten-preise-pakete` uses 2026 copy and concrete example calculations.
- Sitemap includes only pages intended for indexation.
- `npm test` passes.
- `npm run build` passes.
- Browser QA passes on desktop and mobile for the listed URLs.

