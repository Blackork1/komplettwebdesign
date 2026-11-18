import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ejs from 'ejs';

const controller = readFileSync(new URL('../controllers/leistungenController.js', import.meta.url), 'utf8');
const viewPath = fileURLToPath(new URL('../views/leistungen/show.ejs', import.meta.url));

const EXAMPLE_CALCULATIONS = [
  {
    title: 'Beispiel 1: Kompakter Onepager',
    setup: 'Start-Paket',
    oneTime: 'ab 799 € einmalig',
    recurring: 'Domain, E-Mail, Hosting, Wartung und externe Dienste separat nach Setup',
    note: 'Geeignet für eine kompakte Website.'
  },
  {
    title: 'Beispiel 2: Unternehmenswebsite',
    setup: 'Business-Paket',
    oneTime: 'ab 1.499 € einmalig',
    recurring: 'Domain, E-Mail, Hosting, Wartung und externe Dienste separat nach Setup',
    note: 'Geeignet für mehrere Leistungsseiten.'
  },
  {
    title: 'Beispiel 3: Relaunch mit mehr Struktur',
    setup: 'Wachstum-Paket',
    oneTime: 'ab 2.499 € einmalig',
    recurring: 'Domain, E-Mail, Hosting, Wartung und externe Dienste separat nach Setup',
    note: 'Geeignet für Relaunch-Struktur.'
  },
  {
    title: 'Beispiel 4: Sonderfunktionen',
    setup: 'Individuelles Projekt',
    oneTime: 'ab 3.500 € oder nach Aufwand',
    recurring: 'abhängig von Betrieb, Tools, Wartung und Drittanbieter-Leistungen',
    note: 'Geeignet für Sonderfunktionen.'
  }
];

const COST_PAGE_CONTENT = {
  pricePrinciples: [
    {
      title: 'Ab-Preise sind Einstiegspunkte',
      text: 'Der genannte Paketpreis beschreibt den Einstieg bei klar abgegrenztem Umfang.'
    }
  ],
  packages: [
    {
      name: 'Start',
      priceLabel: 'ab 799 €',
      scope: '1 bis 3 Seiten oder Onepager',
      description: 'Kompakte Website.',
      href: '/pakete/start',
      included: ['persönliche Abstimmung']
    },
    {
      name: 'Business',
      priceLabel: 'ab 1.499 €',
      scope: 'ca. 4 bis 7 Seiten',
      description: 'Unternehmenswebsite.',
      href: '/pakete/business',
      recommended: true,
      recommendationLabel: 'Empfohlen für kleine Unternehmen',
      included: ['2 Feedbackrunden']
    }
  ],
  included: ['serverseitig gerendertes HTML'],
  notIncluded: ['Buchungssysteme und CMS in Standardpaketen'],
  priceFactors: ['Seitenumfang und Seitenstruktur'],
  costSplit: [
    {
      title: 'Einmalige Projektkosten',
      text: 'Die Paketpreise beziehen sich auf die einmalige Erstellung.',
      items: ['Konzeption und Umsetzung']
    }
  ],
  maintenancePlans: [
    {
      name: 'Wartung Basis',
      priceLabel: 'ab 39 €/Monat',
      shortDescription: 'Technische Grundbetreuung.',
      responseTime: 'nach Verfügbarkeit',
      contentChangeAllowance: 'nach Absprache'
    }
  ],
  thirdPartyCosts: ['Drittanbieter-Kosten werden separat eingeordnet.'],
  addOns: [
    {
      name: 'Buchungssystem-Integration',
      category: 'Funktionen',
      priceLabel: 'ab 300–900 €',
      shortDescription: 'Einbindung nach Prüfung.',
      whenUseful: 'Sinnvoll für Termine.'
    }
  ],
  paymentAndLaunch: ['Der Livegang erfolgt nach finaler Freigabe.'],
  legalNotes: ['Die technische Einbindung von Rechtstexten ersetzt keine Rechtsberatung.']
};

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
      costPageContent: COST_PAGE_CONTENT,
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

test('kosten page controller contains current package prices and recurring cost separation', () => {
  assert.match(controller, /Website-Kosten in Berlin: Beispiele und Kostenfaktoren/);
  assert.doesNotMatch(controller, /metaTitle: 'Webdesign Preise Berlin/);

  const examples = [
    ['Beispiel 1: Kompakter Onepager', '{{price.start}} einmalig'],
    ['Beispiel 2: Unternehmenswebsite', '{{price.business}} einmalig'],
    ['Beispiel 3: Relaunch mit mehr Struktur', '{{price.wachstum}} einmalig'],
    ['Beispiel 4: Sonderfunktionen', '{{price.individuell}}']
  ];

  for (const [title, oneTime] of examples) {
    assert.match(controller, new RegExp(title));
    assert.match(controller, new RegExp(oneTime.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.match(controller, /Domain, E-Mail, Hosting, Wartung und externe Dienste separat nach Setup/);
  assert.match(controller, /PACKAGE_GLOBAL_NOTES\.vatNote/);
  assert.match(controller, /interpolatePricingTokens/);
});

test('leistung page maps and renders example calculations before faq content', () => {
  assert.match(controller, /exampleCalculations:\s*override\.exampleCalculations\s*\|\|\s*\[\]/);
  assert.match(controller, /description:\s*override\.description\s*\|\|\s*safeJson\(row\.description, \[\]\)/);
  assert.match(controller, /services:\s*override\.services\s*\|\|\s*safeJson\(row\.services, \[\]\)/);
});

test('leistung page renders cost content and example calculations before faq content', async () => {
  const html = await ejs.renderFile(viewPath, buildRenderLocals());

  assert.match(html, /Aktuelle Paketpreise/);
  assert.match(html, /Start-Paket ansehen/);
  assert.match(html, /Business-Paket ansehen/);
  assert.match(html, /Was enthalten ist und was separat geplant wird/);
  assert.match(html, /Wartung, Hosting, Domain und E-Mail/);
  assert.match(html, /Typische Zusatzleistungen/);
  assert.match(html, /Beispielrechnungen für typische Website-Projekte/);
  assert.match(html, /Beispiel 1: Kompakter Onepager/);
  assert.match(html, /Beispiel 2: Unternehmenswebsite/);
  assert.match(html, /Beispiel 3: Relaunch mit mehr Struktur/);
  assert.match(html, /Beispiel 4: Sonderfunktionen/);
  assert.match(html, /ab 1\.499 € einmalig/);
  assert.match(html, /ab 2\.499 € einmalig/);

  const examplesIndex = html.indexOf('Beispielrechnungen für typische Website-Projekte');
  const faqIndex = html.indexOf('<section class="service-faq"');

  assert.ok(examplesIndex !== -1, 'examples section missing');
  assert.ok(faqIndex !== -1, 'faq section missing');
  assert.ok(examplesIndex < faqIndex, 'examples should render before FAQ');
});

// 18.11.2026: Leistungsseiten nennen am Ende Autor und Stand, wie die Branchenseiten.
test('Leistungsseiten zeigen Autor und Stand, ohne Datum nur den Autor', async () => {
  const locals = buildRenderLocals();
  locals.page.updatedAt = new Date('2026-11-18T09:00:00Z');
  const html = await ejs.renderFile(viewPath, locals);
  assert.match(html, /<aside class="page-byline" aria-label="Autor und Stand">\s*<p>Von <a href="\/about">Sören Blocksdorf<\/a>, Webdesigner in Berlin · Stand: <time datetime="2026-11-18">18\.11\.2026<\/time><\/p>/);
  assert.ok(html.indexOf('page-byline') > html.indexOf('<section class="service-faq"'), 'Autorzeile steht am Seitenende');
  const undated = await ejs.renderFile(viewPath, buildRenderLocals());
  assert.match(undated, /Webdesigner in Berlin<\/p>/);
  assert.doesNotMatch(undated, /Stand: <time/);
});

test('Die Kostenseite nennt ihren Stand, die Beispielrechnungen haben einen Sprunglink', () => {
  assert.match(controller, /'kosten-preise-pakete': \{\n\s+\/\/[^\n]*\n\s+updatedIso: '2026-11-18'/);
  assert.match(controller, /updatedAt: latestDate\(row\.updated_at \|\| row\.created_at, override\.updatedIso\)/);
  assert.match(controller, /\{ label: 'Beispielrechnungen ansehen', href: '#beispielrechnungen' \}/);
  assert.match(readFileSync(viewPath, 'utf8'), /<section id="beispielrechnungen" class="leistungen-examples"/);
});

test('Das Stand-Datum übersteht die Preis-Ersetzung (Datenbank liefert Date-Objekte)', async () => {
  const { interpolatePricingTokens } = await import('../util/pricingViewModel.js');
  const latest = new Function(`${controller.match(/function latestDate\([\s\S]*?\n\}/)[0]}; return latestDate;`)();
  const value = latest(new Date('2026-10-25T10:00:00Z'), '2026-11-18');
  assert.equal(value, '2026-11-18T00:00:00.000Z');
  assert.equal(interpolatePricingTokens({ updatedAt: value }, {}).updatedAt, value);
  assert.equal(latest(null, undefined), null);
});
