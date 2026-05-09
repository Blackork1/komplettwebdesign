import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ejs from 'ejs';

const controller = readFileSync(new URL('../controllers/leistungenController.js', import.meta.url), 'utf8');
const viewPath = fileURLToPath(new URL('../views/leistungen/show.ejs', import.meta.url));

const EXAMPLE_CALCULATIONS = [
  {
    title: 'Beispiel 1: Selbstständiger Onepager',
    setup: 'Basis-Paket',
    oneTime: '499 EUR einmalig',
    recurring: 'optional: Domain/Mail ab 10 EUR, Hosting 10 EUR, Wartung 5 EUR pro Monat',
    note: 'Geeignet für eine kompakte Website.'
  },
  {
    title: 'Beispiel 2: Kleines Unternehmen mit 5 Seiten',
    setup: 'Business-Paket',
    oneTime: '899 EUR einmalig',
    recurring: 'optional: Domain/Mail ab 10 EUR, Hosting 10 EUR, Wartung 5 EUR pro Monat',
    note: 'Geeignet für mehrere Leistungsseiten.'
  },
  {
    title: 'Beispiel 3: Restaurant oder Café mit Reservierung',
    setup: 'Premium-Paket oder individuelles Angebot',
    oneTime: 'ab 1.499 EUR einmalig',
    recurring: 'optional: Domain/Mail ab 10 EUR, Hosting 10 EUR, Wartung 5 EUR pro Monat',
    note: 'Geeignet für Reservierungsfunktionen.'
  }
];

function buildRenderLocals() {
  return {
    page: {
      slug: 'kosten-preise-pakete',
      title: 'Kosten, Preise & Pakete',
      meta_description: '',
      updatedAt: null,
      hero: {
        title: 'Website Kosten in Berlin 2026',
        subtitle: 'Transparente Beispielrechnungen',
        icons: []
      },
      answerBlock: '',
      ctaVariants: [],
      proofBlock: null,
      trustBlock: null,
      exampleCalculations: EXAMPLE_CALCULATIONS,
      intro: {
        problem: {},
        solution: {}
      },
      description: [],
      services: [],
      risks: {
        items: [],
        conclusion: []
      },
      internalLinks: [],
      faqItems: [
        {
          q: 'Welche laufenden Kosten kommen dazu?',
          a: 'Hosting, Domain, E-Mail und optionale Wartung.'
        }
      ],
      cta: {}
    },
    title: 'Website Kosten Berlin 2026',
    description: 'Website Kosten in Berlin transparent erklärt.',
    ogImage: null,
    canonicalBaseUrl: 'https://www.komplettwebdesign.de',
    canonicalUrl: 'https://www.komplettwebdesign.de/webdesign-berlin/kosten-preise-pakete',
    assetVersion: 'test',
    robots: 'noindex',
    alternateUrls: null,
    currentPathname: '/webdesign-berlin/kosten-preise-pakete',
    currentSearch: '',
    navPages: [],
    navIndustries: [],
    lng: 'de',
    locals: {},
    cssAsset: (assetPath) => `/${assetPath}`,
    escapeJsonForHtml: (value) => JSON.stringify(value)
  };
}

test('kosten page controller contains 2026 cost examples and recurring costs', () => {
  assert.match(controller, /Website Kosten in Berlin 2026/);

  const examples = [
    ['Beispiel 1: Selbstständiger Onepager', '499 EUR einmalig'],
    ['Beispiel 2: Kleines Unternehmen mit 5 Seiten', '899 EUR einmalig'],
    ['Beispiel 3: Restaurant oder Café mit Reservierung', 'ab 1.499 EUR einmalig']
  ];

  for (const [title, oneTime] of examples) {
    assert.match(controller, new RegExp(title));
    assert.match(controller, new RegExp(oneTime.replace('.', '\\.')));
  }

  assert.match(
    controller,
    /optional: Domain\/Mail ab 10 EUR, Hosting 10 EUR, Wartung 5 EUR pro Monat/
  );
});

test('leistung page maps and renders example calculations before faq content', () => {
  assert.match(controller, /exampleCalculations:\s*override\.exampleCalculations\s*\|\|\s*\[\]/);
});

test('leistung page renders example calculations from page fixture', async () => {
  const html = await ejs.renderFile(viewPath, buildRenderLocals());

  assert.match(html, /Beispielrechnungen für typische Website-Projekte/);
  assert.match(html, /Beispiel 1: Selbstständiger Onepager/);
  assert.match(html, /Beispiel 2: Kleines Unternehmen mit 5 Seiten/);
  assert.match(html, /Beispiel 3: Restaurant oder Café mit Reservierung/);
  assert.match(html, /899 EUR einmalig/);
  assert.match(html, /ab 1\.499 EUR einmalig/);

  const examplesIndex = html.indexOf('Beispielrechnungen für typische Website-Projekte');
  const faqIndex = html.indexOf('<section class="service-faq"');

  assert.ok(examplesIndex !== -1, 'examples section missing');
  assert.ok(faqIndex !== -1, 'faq section missing');
  assert.ok(examplesIndex < faqIndex, 'examples should render before FAQ');
});
