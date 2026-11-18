import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLlmsText, buildPricingMarkdown } from '../helpers/llmsText.js';

test('machine-readable price documents use supplied catalog values and central contact facts', () => {
  for (const build of [buildLlmsText, buildPricingMarkdown]) {
    const text = build([{ name: 'Start', priceLabel: 'ab 1.234 €', canonicalPath: '/pakete/start' }]);
    assert.match(text, /ab 1\.234 €/);
    assert.match(text, /\+49 155 11245048/);
    assert.match(text, /https:\/\/www\.komplettwebdesign\.de\/pakete\/start/);
    assert.doesNotMatch(text, /https:\/\/komplettwebdesign\.de|799|aktuelle Paketlogik/);
  }
});

// 18.11.2026: llms.txt nennt alle Branchen-, Bezirks- und Leistungsseiten sowie Blog und Ratgeber,
// llms-full.txt zusätzlich Paketdetails, Branchenseiten mit FAQ und Bezirke.
const PACKAGES = [
  { slug: 'start', name: 'Start', priceLabel: 'ab 1.234 €', canonicalPath: '/pakete/start' },
  { slug: 'business', name: 'Business', priceLabel: 'ab 2.345 €', canonicalPath: '/pakete/business' },
  { slug: 'wachstum', name: 'Wachstum', priceLabel: 'ab 3.456 €', canonicalPath: '/pakete/wachstum' },
  { slug: 'individuell', name: 'Individuell', priceLabel: 'ab 4.567 € oder nach Aufwand', canonicalPath: '/pakete/individuell' }
];
const LISTINGS = {
  posts: [{ slug: 'webdesign-preise-2027', title: 'Webdesign-Preise 2027', description: 'Budget planen.' }],
  guides: [{ slug: 'was-ist-seo', title: 'Was ist SEO?', description: 'Grundlagen.' }]
};

test('llms.txt verlinkt alle Branchen, Bezirke, Leistungen, Blog und Ratgeber', async () => {
  const { INDUSTRY_DIRECTORY } = await import('../data/industryDirectory.js');
  const { DISTRICT_PAGES } = await import('../data/districtPages.js');
  const text = buildLlmsText(PACKAGES, LISTINGS);
  for (const industry of Object.values(INDUSTRY_DIRECTORY)) assert.ok(text.includes(`(https://www.komplettwebdesign.de${industry.href})`), industry.href);
  for (const slug of Object.keys(DISTRICT_PAGES)) assert.ok(text.includes(`(https://www.komplettwebdesign.de/webdesign-berlin/${slug})`), slug);
  assert.match(text, /\[Webdesign Kreuzberg\]/);
  for (const path of ['/leistungen/website-relaunch', '/leistungen/local-seo', '/leistungen/laufende-kosten-website', '/webdesign-berlin/kosten-preise-pakete']) {
    assert.ok(text.includes(`(https://www.komplettwebdesign.de${path})`), path);
  }
  assert.match(text, /## Blog\n\n- \[Webdesign-Preise 2027\]\(https:\/\/www\.komplettwebdesign\.de\/blog\/webdesign-preise-2027\): Budget planen\./);
  assert.match(text, /## Ratgeber\n\n- \[Was ist SEO\?\]\(https:\/\/www\.komplettwebdesign\.de\/ratgeber\/was-ist-seo\)/);
  assert.match(text, /https:\/\/www\.komplettwebdesign\.de\/llms-full\.txt/);
  assert.doesNotMatch(text, /\{\{|undefined|799/);
  assert.doesNotMatch(buildLlmsText(PACKAGES), /## Blog|## Ratgeber/, 'ohne Datenbank fehlen nur Blog und Ratgeber');
});

test('llms-full.txt enthält Paketdetails, alle Branchenseiten mit FAQ und echte Preise', async () => {
  const { buildLlmsFullText } = await import('../helpers/llmsText.js');
  const { NICHE_PAGES } = await import('../services/nichePageViewModel.js');
  const text = buildLlmsFullText(PACKAGES, LISTINGS);
  assert.match(text, /## Pakete im Detail[\s\S]*### Start\n\n- Preis: ab 1\.234 €/);
  for (const { page, faq } of Object.values(NICHE_PAGES)) {
    assert.ok(text.includes(`https://www.komplettwebdesign.de${page.path}`), page.path);
    assert.ok(text.includes(`**${faq[0].q.replace(/\s+/g, ' ').trim()}**`), `${page.path}: FAQ`);
  }
  assert.match(text, /### Website für Handwerker in Berlin/);
  assert.match(text, /## Bezirksseiten im Detail/);
  assert.match(text, /ab 1\.234 €/);
  assert.doesNotMatch(text, /\{\{|undefined|799|## Weitere Dateien/);
});

test('Blog- und Ratgeberliste für llms.txt lässt Weiterleitungen weg und übersteht Datenbankfehler', async () => {
  const { loadLlmsListings } = await import('../services/llmsListingsService.js');
  const listings = await loadLlmsListings({
    blog: { findRelatedCandidates: async () => [{ slug: 'webdesign-preise-2027', title: 'Webdesign-Preise 2027', excerpt: 'Kurz.' }, { slug: '', title: 'ohne Slug' }] },
    ratgeber: { findAll: async () => [{ slug: 'was-ist-seo', title: 'Was ist SEO?', description: 'Grundlagen.' }, { slug: 'website-kosten-berlin', title: 'Weitergeleitet' }] }
  });
  assert.deepEqual(listings.posts, [{ slug: 'webdesign-preise-2027', title: 'Webdesign-Preise 2027', description: 'Kurz.' }]);
  assert.ok(listings.guides.some((guide) => guide.slug === 'was-ist-seo'));
  assert.ok(!listings.guides.some((guide) => guide.slug === 'website-kosten-berlin'), 'weitergeleiteter Ratgeber fehlt');
  assert.ok(listings.guides.some((guide) => guide.slug === 'baukasten-vs-professionelle-website'), 'statischer Ratgeber aus SEO_GUIDE_CLUSTER');
  const empty = await loadLlmsListings({
    blog: { findRelatedCandidates: async () => { throw new Error('DB weg'); } },
    ratgeber: { findAll: async () => { throw new Error('DB weg'); } }
  });
  assert.deepEqual(empty.posts, []);
});
