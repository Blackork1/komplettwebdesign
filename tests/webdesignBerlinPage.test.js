import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { webdesignBerlinPage } from '../data/webdesignBerlinPage.js';
import { packages } from '../data/packages.js';

function collectText(value, out = []) {
  if (typeof value === 'string') {
    out.push(value);
    return out;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectText(item, out));
    return out;
  }

  if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectText(item, out));
  }

  return out;
}

const requiredSectionIds = [
  'hero',
  'intro',
  'targetGroups',
  'individualWebdesign',
  'techUsp',
  'localBenefits',
  'servicesOverview',
  'districtPages',
  'comparison',
  'packageTeaser',
  'included',
  'notIncluded',
  'process',
  'localSeo',
  'relaunch',
  'runningCosts',
  'trust',
  'faq',
  'cta',
  'finalCta'
];

const expectedLinks = [
  '/pakete',
  '/pakete/start',
  '/pakete/business',
  '/pakete/wachstum',
  '/pakete/individuell',
  '/kontakt',
  '/webdesign-berlin/kosten-preise-pakete',
  '/leistungen/laufende-kosten-website',
  '/leistungen/zusatzleistungen-webdesign',
  '/leistungen/website-wartung',
  '/leistungen/website-relaunch',
  '/leistungen/local-seo',
  '/leistungen/website-audit',
  '/referenzen',
  '/website-tester'
];

const requiredFaqQuestions = [
  'Was kostet Webdesign in Berlin bei Komplettwebdesign?',
  'Für wen ist Komplettwebdesign geeignet?',
  'Was ist der Unterschied zu einer Agentur?',
  'Was ist der Unterschied zu Baukasten oder WordPress-Theme?',
  'Warum setzt du auf Node.js und EJS?',
  'Ist eine individuell entwickelte Website SEO-freundlich?',
  'Gibt es eine Ranking-Garantie?',
  'Sind Texte enthalten?',
  'Sind Impressum und Datenschutzerklärung enthalten?',
  'Ist Hosting enthalten?',
  'Gibt es laufende Kosten?',
  'Kann ich meine bestehende Website relaunchen lassen?',
  'Sind Buchungssysteme oder CMS möglich?',
  'Sind Shops möglich?',
  'Wie lange dauert ein Webdesign-Projekt?',
  'Wie läuft die Zusammenarbeit ab?',
  'Kann ich später weitere Seiten ergänzen?',
  'Bietest du Wartung nach dem Launch an?',
  'Was bedeutet Kleinunternehmer nach § 19 UStG?',
  'Wie frage ich ein Projekt an?'
];

test('webdesign berlin canonical page exposes the requested canonical page model', () => {
  assert.equal(webdesignBerlinPage.canonicalPath, '/webdesign-berlin');
  assert.match(webdesignBerlinPage.title, /Webdesign Berlin/i);
  assert.match(webdesignBerlinPage.description, /kleine Unternehmen/i);
  assert.match(webdesignBerlinPage.h1, /Webdesign Berlin/i);
  assert.match(webdesignBerlinPage.hero.lead, /Berlin/i);
  assert.match(webdesignBerlinPage.hero.lead, /individuell/i);
  assert.deepEqual(webdesignBerlinPage.sections.map((section) => section.id), requiredSectionIds);
});

test('webdesign berlin canonical page uses the new central package logic', () => {
  assert.deepEqual(
    webdesignBerlinPage.packageTeaser.packages.map((pkg) => pkg.id),
    packages.map((pkg) => pkg.id)
  );

  assert.deepEqual(
    webdesignBerlinPage.packageTeaser.packages.map((pkg) => [pkg.name, pkg.priceLabel, pkg.path]),
    [
      ['Start', '{{price.start}}', '/pakete/start'],
      ['Business', '{{price.business}}', '/pakete/business'],
      ['Wachstum', '{{price.wachstum}}', '/pakete/wachstum'],
      ['Individuell', '{{price.individuell}}', '/pakete/individuell']
    ]
  );

  assert.match(webdesignBerlinPage.priceNote, /§ 19 UStG/);
});

test('webdesign berlin canonical page avoids retired pricing and risky promises', () => {
  const pageText = collectText(webdesignBerlinPage).join('\n');
  const forbiddenPatterns = [
    ['alter 499-Preisanker', /(?<![\d.])499(?:[.,]00)?\s*(?:€|EUR)/i],
    ['alter 899-Preisanker', /(?<![\d.])899(?:[.,]00)?\s*(?:€|EUR)/i],
    ['Premium 1.499', /Premium\s*(?:ab\s*)?1\.499\s*(?:€|EUR)/i],
    ['alte Basis-Logik', /\bBasis\s*(?:ab|499|Paket)/i],
    ['Wartung ab 5', /Wartung\s*ab\s*5\s*(?:€|EUR)/i],
    ['Buchungssystem inklusive', /Buchungssystem\s+(?:inklusive|enthalten|im Paket enthalten)/i],
    ['Shop optional', /Shop\s+optional/i],
    ['CMS inklusive', /CMS\s+(?:inklusive|enthalten|im Paket enthalten)/i],
    ['rechtliche Garantie', /rechtssicher|rechtlich abgesichert|rechtskonform|abmahnsicher|rechtlich auf der sicheren Seite|DSGVO-konform/i],
    ['Erfolgsgarantie', /Ranking garantiert|garantiert mehr Kunden|garantiert mehr Anfragen|Platz 1 bei Google/i],
    ['absolute Kostenformel', /keine versteckten Kosten|alles inklusive/i],
    ['unbegrenzte Leistung', /unbegrenzte Änderungen|unbegrenzter Support|24\/7/i]
  ];

  for (const [label, pattern] of forbiddenPatterns) {
    assert.doesNotMatch(pageText, pattern, `${label} gefunden`);
  }
});

test('webdesign berlin canonical page keeps german tone consistent', () => {
  const pageText = collectText(webdesignBerlinPage).join('\n');
  assert.doesNotMatch(pageText, /\bwir\b|\buns\b|\bunser(?:e|er|em|en|es)?\b|\bSie\b/);
  assert.match(pageText, /\bich\b/i);
  assert.match(pageText, /\bdu\b/i);
});

test('webdesign berlin canonical page links only to existing canonical targets', () => {
  const links = new Set(webdesignBerlinPage.internalLinks.map((link) => link.href));

  for (const href of expectedLinks) {
    assert.equal(links.has(href), true, `${href} fehlt`);
  }
});

test('webdesign berlin canonical page FAQ contains the required visible questions', () => {
  assert.equal(webdesignBerlinPage.faq.length, 20);
  assert.deepEqual(webdesignBerlinPage.faq.map((item) => item.question), requiredFaqQuestions);
});

test('webdesign berlin canonical page controller and template wiring are in place', () => {
  const controllerSource = readFileSync(new URL('../controllers/districtController.js', import.meta.url), 'utf8');
  const templateSource = readFileSync(new URL('../views/bereiche/webdesign-berlin.ejs', import.meta.url), 'utf8');

  assert.match(controllerSource, /webdesignBerlinPage/);
  assert.match(controllerSource, /webdesign-berlin/);
  assert.match(templateSource, /webdesign-berlin-page/);
  assert.match(templateSource, /extraCssAssets:\s*\[\s*['"]webdesign-berlin\.css['"]\s*\]/);
  assert.doesNotMatch(templateSource, /<style>|<\/style>/);
  assert.match(templateSource, /unified-hero/);
  assert.match(templateSource, /class="wd-hero-bullets"/);
  assert.match(templateSource, /src="\/images\/icons\/check\.svg"/);
  assert.match(templateSource, /class="wd-hero-note[^"]*"/);
  assert.doesNotMatch(templateSource, /page\.hero\.tertiaryCta/);
  assert.match(templateSource, /wd-process-visual/);
  assert.match(templateSource, /wd-district-card/);
  assert.match(templateSource, /Webdesign in Berlin nach Bezirk einordnen/);
  assert.match(templateSource, /FAQPage/);
  assert.match(templateSource, /BreadcrumbList/);
  assert.match(templateSource, /ItemList/);
  assert.match(templateSource, /"@type": "Service"/);
  assert.doesNotMatch(templateSource, /AggregateRating|OfferCatalog|VideoObject/);
});

test('webdesign berlin hero follows the homepage CTA and bullet style', () => {
  const templateSource = readFileSync(new URL('../views/bereiche/webdesign-berlin.ejs', import.meta.url), 'utf8');
  const cssSource = readFileSync(new URL('../public/webdesign-berlin.css', import.meta.url), 'utf8');

  assert.equal(webdesignBerlinPage.hero.testerLink.href, '/website-tester');
  assert.equal(webdesignBerlinPage.hero.testerLink.label, 'Website-Tester starten');
  assert.equal(webdesignBerlinPage.hero.tertiaryCta, undefined);
  assert.match(templateSource, /id="wd-hero-title" class="home-hero-reveal home-hero-reveal--h1 animate-on-scroll"/);
  assert.match(templateSource, /class="wd-lead home-hero-reveal home-hero-reveal--support animate-on-scroll"/);
  assert.match(templateSource, /class="home-hero-reveal home-hero-reveal--bullet animate-on-scroll"[\s\S]*?src="\/images\/icons\/check\.svg"/);
  assert.match(templateSource, /class="wd-actions home-hero-reveal home-hero-reveal--actions animate-on-scroll"[\s\S]*?page\.hero\.primaryCta[\s\S]*?page\.hero\.secondaryCta/);
  assert.doesNotMatch(templateSource, /class="btn btn-secondary" href="<%= page\.hero\.testerLink\.href %>"/);
  assert.match(templateSource, /<p class="wd-hero-note home-hero-reveal home-hero-reveal--trust animate-on-scroll">\s*<a href="<%= page\.hero\.testerLink\.href %>"><%= page\.hero\.testerLink\.label %><\/a>\s*<\/p>/);
  assert.match(templateSource, /class="wd-hero__media home-hero-reveal home-hero-reveal--visual animate-on-scroll"/);
  assert.match(cssSource, /\.wd-hero-bullets\s*\{[\s\S]*?font-size:\s*clamp\(0?\.98rem,\s*1\.25vw,\s*1\.1rem\);[\s\S]*?font-weight:\s*700;[\s\S]*?margin:\s*0\s+0\s+1\.45rem;/);
  assert.match(cssSource, /\.wd-hero-bullets li\s*\{[\s\S]*?align-items:\s*center;[\s\S]*?font:\s*inherit;/);
  assert.match(cssSource, /\.wd-hero-bullets img\s*\{[\s\S]*?height:\s*26px;[\s\S]*?width:\s*26px;/);
  assert.match(cssSource, /\.wd-hero \.home-hero-reveal\.animate-on-scroll\s*\{[\s\S]*?transition-delay:\s*var\(--home-hero-reveal-delay,\s*0ms\);/);
  assert.match(cssSource, /\.wd-hero \.home-hero-reveal--support\s*\{[\s\S]*?--home-hero-reveal-delay:\s*180ms;/);
  assert.match(cssSource, /\.wd-hero \.home-hero-reveal--visual\s*\{[\s\S]*?--home-hero-reveal-delay:\s*260ms;/);
  assert.match(cssSource, /\.wd-hero \.home-hero-reveal--bullet:nth-child\(1\)\s*\{[\s\S]*?--home-hero-reveal-delay:\s*300ms;/);
  assert.match(cssSource, /\.wd-hero \.home-hero-reveal--bullet:nth-child\(4\)\s*\{[\s\S]*?--home-hero-reveal-delay:\s*570ms;/);
  assert.match(cssSource, /\.wd-hero \.home-hero-reveal--actions\s*\{[\s\S]*?--home-hero-reveal-delay:\s*620ms;/);
  assert.match(cssSource, /\.wd-hero \.home-hero-reveal--trust\s*\{[\s\S]*?--home-hero-reveal-delay:\s*720ms;/);
  assert.match(cssSource, /@media\s*\(max-width:\s*860px\)\s*\{[\s\S]*?\.webdesign-berlin\s+\.wd-hero\s+\.wd-hero__media\.home-hero-reveal\.animate-on-scroll\s*\{[\s\S]*?transform:\s*translate3d\(0,\s*18px,\s*0\);/);
  assert.match(cssSource, /\.wd-hero-note\s*\{[\s\S]*?font-size:\s*clamp\(0?\.9rem,\s*1\.1vw,\s*1rem\);[\s\S]*?font-weight:\s*700;/);
  assert.match(cssSource, /\.wd-hero-note a\s*\{[\s\S]*?color:\s*var\(--wd-accent\);[\s\S]*?text-decoration:\s*none;/);
  assert.match(cssSource, /\.webdesign-berlin h1\s*\{[\s\S]*?hyphens:\s*none;[\s\S]*?overflow-wrap:\s*normal;[\s\S]*?word-break:\s*normal;/);
  assert.match(cssSource, /\.wd-hero h1,\s*\n\s*\.webdesign-berlin \.wd-hero \.wd-lead,\s*\n\s*\.webdesign-berlin \.wd-hero \.wd-hero-bullets span,\s*\n\s*\.webdesign-berlin \.wd-hero \.wd-hero-note\s*\{[\s\S]*?hyphens:\s*none\s*!important;[\s\S]*?overflow-wrap:\s*normal\s*!important;[\s\S]*?word-break:\s*normal\s*!important;/);
});

test('webdesign berlin intro renders the compressed greeting image after the copy', () => {
  const templateSource = readFileSync(new URL('../views/bereiche/webdesign-berlin.ejs', import.meta.url), 'utf8');
  const cssSource = readFileSync(new URL('../public/webdesign-berlin.css', import.meta.url), 'utf8');
  const imagePath = new URL('../public/images/webdesign-berlin-begruessung.jpg', import.meta.url);

  assert.equal(webdesignBerlinPage.intro.image.src, '/images/webdesign-berlin-begruessung.jpg');
  assert.match(webdesignBerlinPage.intro.image.alt, /Begrüßung/);
  assert.equal(existsSync(imagePath), true);
  assert.ok(statSync(imagePath).size < 250_000, 'Intro-Bild ist nicht ausreichend komprimiert');
  assert.match(templateSource, /class="wd-intro-image"/);
  assert.match(templateSource, /src="<%= page\.intro\.image\.src %>"/);
  assert.match(templateSource, /loading="lazy"/);
  assert.match(cssSource, /#intro\s+\.wd-section-head\s*\{[^}]*max-width:\s*1160px/s);
  assert.match(cssSource, /\.wd-intro-image\s*\{[^}]*max-width:\s*1160px/s);
});

test('webdesign berlin first consultation section is text based without video embed', () => {
  const templateSource = readFileSync(new URL('../views/bereiche/webdesign-berlin.ejs', import.meta.url), 'utf8');
  const cssSource = readFileSync(new URL('../public/webdesign-berlin.css', import.meta.url), 'utf8');

  assert.match(templateSource, /Was wir im Erstgespräch für dein Webdesign-Projekt klären/);
  assert.match(templateSource, /Ausgangslage und Ziele/);
  assert.match(templateSource, /Umfang, Zeitrahmen und Paketlogik/);
  assert.match(templateSource, /Preisbereich und erste Designidee/);
  assert.match(templateSource, /unverbindlichen Preisbereich/);
  assert.match(templateSource, /ersten Designidee/);
  assert.match(cssSource, /\.wd-video\s*\{[^}]*max-width:\s*1160px/s);
  assert.doesNotMatch(templateSource, /youtube-wrapper|data-youtube-id|img\.youtube\.com|youtube-consent-btn|VideoObject/);
});

test('webdesign berlin canonical page exposes clickable district cards with district hero images', () => {
  const controllerSource = readFileSync(new URL('../controllers/districtController.js', import.meta.url), 'utf8');
  const templateSource = readFileSync(new URL('../views/bereiche/webdesign-berlin.ejs', import.meta.url), 'utf8');
  const districtSlugs = [
    'friedrichshain',
    'prenzlauer-berg',
    'kreuzberg',
    'charlottenburg',
    'lichtenberg',
    'mitte'
  ];

  assert.match(controllerSource, /buildDistrictHubCards/);
  assert.match(controllerSource, /heroImage/);
  assert.match(controllerSource, /districtCards:\s*buildDistrictHubCards/);
  assert.match(templateSource, /href="<%= district\.href %>"/);
  assert.match(templateSource, /src="<%= district\.image %>"/);

  for (const slug of districtSlugs) {
    assert.match(controllerSource, new RegExp(`\\$\\{basePath\\}/\\$\\{district\\.slug\\}`));
    assert.match(controllerSource, new RegExp(slug.replace('-', '\\-')));
  }
});

test('webdesign berlin process section uses the compressed Ablauf visual', () => {
  assert.equal(webdesignBerlinPage.process.image.src, '/images/webdesign-ablauf.webp');
  assert.match(webdesignBerlinPage.process.image.alt, /Ablaufs von Anfrage/);
});

test('webdesign berlin hero uses the compressed downloaded hero artwork', () => {
  const imagePath = new URL('../public/images/webdesign-berlin-hero.webp', import.meta.url);
  const templateSource = readFileSync(new URL('../views/bereiche/webdesign-berlin.ejs', import.meta.url), 'utf8');
  const cssSource = readFileSync(new URL('../public/webdesign-berlin.css', import.meta.url), 'utf8');

  assert.equal(webdesignBerlinPage.hero.image.src, '/images/webdesign-berlin-hero.webp');
  assert.match(webdesignBerlinPage.hero.image.alt, /Webdesign Berlin/);
  assert.equal(webdesignBerlinPage.hero.image.width, 820);
  assert.equal(webdesignBerlinPage.hero.image.height, 1458);
  assert.equal(existsSync(imagePath), true);
  assert.ok(statSync(imagePath).size < 180_000, 'Hero-Bild ist nicht ausreichend komprimiert');
  assert.match(templateSource, /width="<%= page\.hero\.image\.width %>"/);
  assert.match(templateSource, /height="<%= page\.hero\.image\.height %>"/);
  assert.match(cssSource, /\.wd-hero__media img\s*\{[^}]*aspect-ratio:\s*9\s*\/\s*16/s);
  assert.match(cssSource, /@media\s*\(min-width:\s*861px\)\s*\{[\s\S]*?\.webdesign-berlin\s+\.wd-hero\s*\{[\s\S]*?align-items:\s*stretch;/);
  assert.match(cssSource, /@media\s*\(min-width:\s*861px\)\s*\{[\s\S]*?\.webdesign-berlin\s+\.wd-hero__media\s*\{[\s\S]*?align-self:\s*stretch;[\s\S]*?position:\s*relative;/);
  assert.match(cssSource, /@media\s*\(min-width:\s*861px\)\s*\{[\s\S]*?\.webdesign-berlin\s+\.wd-hero__media img\s*\{[\s\S]*?aspect-ratio:\s*auto;[\s\S]*?height:\s*100%;[\s\S]*?inset:\s*0;[\s\S]*?position:\s*absolute;/);
  assert.match(cssSource, /\.webdesign-berlin\s+\.wd-hero__copy\.kwd-scroll-reveal\s*\{[\s\S]*?opacity:\s*1\s*!important;[\s\S]*?transform:\s*none\s*!important;/);
});
