import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const PUBLIC_PHASE_2_SOURCES = [
  'controllers/mainController.js',
  'controllers/districtController.js',
  'controllers/leistungenController.js',
  'views/index.ejs',
  'views/kontakt.ejs',
  'views/packages_list.ejs',
  'views/package_detail.ejs',
  'views/bereiche/webdesign-berlin-district.ejs',
  'views/branchen-tempaltes.ejs',
  'views/branchen-template.ejs',
  'views/industries/show.ejs',
  'views/kontakt/thankyou.ejs',
  'views/partials/footer.ejs',
  'views/partials/head.ejs',
  'views/partials/header.ejs',
  'views/partials/packages.ejs',
  'data/seoGuideCluster.js',
  'data/seoLandingPages.js',
  'data/seoMeta.js',
  'helpers/pageSchema.js',
  'helpers/seoPagePolicy.js',
  'util/seoSchemas.js',
  'public/llms.txt',
  'public/jsons/kita.json',
  'public/jsons/realKito.json'
];

const DB_PRICING_SOURCES = [
  'scripts/seed_pricing_catalog.js',
  'data/packages.js'
];

const htmlSpace = String.raw`(?:\s|&nbsp;|&#160;)*`;
const htmlWordSpace = String.raw`(?:\s|&nbsp;|&#160;)+`;

const forbiddenPatterns = [
  ['alter 499-Preisanker', new RegExp(String.raw`(?<![\d.,])499(?:[.,]00)?${htmlSpace}(?:€|EUR)|(?:€|EUR)${htmlSpace}499(?!\d)`, 'i')],
  ['alter 899-Preisanker', new RegExp(String.raw`(?<![\d.,])899(?:[.,]00)?${htmlSpace}(?:€|EUR)|(?:€|EUR)${htmlSpace}899(?!\d)`, 'i')],
  ['alte Paketnamen im Angebotskontext', /\b(?:Basis|Basic|Premium)\s*(?:-|–|\s)*(?:Paket|package|ab|from|EUR|€)|\b(?:Basis|Basic|Premium)\s+(?:dauert|usually|passt|lohnt|liegt|starts|for|für)/i],
  ['alte Wartung-5-Euro-Logik', new RegExp(String.raw`Wartung${htmlSpace}(?:ab|startet|kostet).*5${htmlSpace}(?:€|EUR)|maintenance${htmlSpace}(?:starts|is).*?(?:EUR|€)${htmlSpace}5|5${htmlSpace}(?:€|EUR)${htmlSpace}(?:pro Monat|\/month)`, 'i')],
  ['riskante Inklusiv- oder Rechtsversprechen', new RegExp(String.raw`Buchungssystem${htmlWordSpace}(?:inklusive|enthalten|im Paket enthalten)|Booking system included|Shop${htmlWordSpace}optional|DSGVO-konform|rechtskonform|rechtssicher|rechtlich${htmlWordSpace}abgesichert|Ranking${htmlWordSpace}garantiert|garantiert${htmlWordSpace}mehr${htmlWordSpace}Kunden|keine${htmlWordSpace}versteckten${htmlWordSpace}Kosten|alles${htmlWordSpace}inklusive`, 'i')]
];

function sourceContext(source, pattern) {
  const lines = source.split(/\r?\n/);
  const index = lines.findIndex((line) => pattern.test(line));
  if (index === -1) return '';
  return lines.slice(Math.max(0, index - 1), index + 2).join('\n');
}

test('phase 2 public sources do not expose retired pricing or offer promises', () => {
  for (const file of PUBLIC_PHASE_2_SOURCES) {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

    for (const [label, pattern] of forbiddenPatterns) {
      assert.doesNotMatch(
        source,
        pattern,
        `${file} enthält noch ${label}:\n${sourceContext(source, pattern)}`
      );
    }
  }
});

test('phase 2 public sources expose dynamic package anchor logic and DB seed data', () => {
  const publicJoined = PUBLIC_PHASE_2_SOURCES
    .map((file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'))
    .join('\n');
  const dbJoined = DB_PRICING_SOURCES
    .map((file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'))
    .join('\n');

  assert.match(publicJoined, /pkg\.priceLabel|packagePriceLabel|lowestPackagePriceLabel|\{\{price\.(?:start|business|wachstum|individuell)\}\}/);
  assert.match(dbJoined, /id:\s*'start'[\s\S]+priceFrom:\s*799/);
  assert.match(dbJoined, /id:\s*'business'[\s\S]+priceFrom:\s*1499/);
  assert.match(dbJoined, /id:\s*'wachstum'[\s\S]+priceFrom:\s*2499/);
  assert.match(dbJoined, /id:\s*'individuell'[\s\S]+priceFrom:\s*3500/);
  const individualTextAnchor = new RegExp(String.raw`Individuell${htmlWordSpace}ab${htmlWordSpace}3\.500${htmlSpace}(?:€|EUR)(?:${htmlWordSpace}oder${htmlWordSpace}nach${htmlWordSpace}Aufwand|\/nach Aufwand)`);
  const individualSeedAnchor = /display_name:\s*'Individuelles Projekt'[\s\S]+price_label_override:\s*'ab 3\.500 € oder nach Aufwand'/;
  assert.ok(
    individualTextAnchor.test(publicJoined) || individualSeedAnchor.test(dbJoined),
    'Individuell-Preislogik muss aus öffentlicher Kopie oder dem DB-Pricing-Seed ableitbar sein.'
  );
});
