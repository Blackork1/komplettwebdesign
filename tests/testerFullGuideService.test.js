import test from 'node:test';
import assert from 'node:assert/strict';
import {
  __testables,
  generateTesterFullGuide
} from '../services/testerFullGuideService.js';

function buildPage(url, overrides = {}) {
  return {
    url,
    title: 'Standardtitel',
    metaDescription: 'Standardbeschreibung',
    h1: 'Standard H1',
    bodyText: 'Website erstellen in Berlin fuer lokale Unternehmen mit klarer Struktur und CTA.',
    wordCount: 450,
    h1Count: 1,
    hasMain: true,
    hasHeader: true,
    hasFooter: true,
    hasNav: true,
    hasSchema: true,
    hasContactLink: true,
    hasPhone: true,
    hasEmail: true,
    buttons: 2,
    scripts: 6,
    stylesheets: 3,
    ...overrides
  };
}

function sampleResult() {
  return {
    source: 'website',
    sourceResult: {
      finalUrl: 'https://www.example.com',
      context: {
        businessType: 'Webdesign Agentur',
        primaryService: 'Website erstellen',
        targetRegion: 'Berlin'
      },
      internalGuideInput: {
        pageAnalyses: [
          buildPage('https://www.example.com'),
          buildPage('https://www.example.com/leistungen', {
            bodyText: 'Allgemeiner Text ohne klaren Servicefokus.',
            hasSchema: false,
            hasContactLink: false,
            hasPhone: false,
            buttons: 0,
            scripts: 24,
            stylesheets: 10,
            wordCount: 180
          }),
          buildPage('https://www.example.com/kontakt', {
            bodyText: 'Kontaktseite mit Formular und Terminbuchung.',
            hasSchema: false,
            hasPhone: false,
            buttons: 1
          }),
          buildPage('https://www.example.com/blog', {
            bodyText: 'Blogbeitrag mit allgemeinen Trends.',
            hasSchema: false,
            hasContactLink: false,
            buttons: 0,
            wordCount: 210
          })
        ]
      }
    }
  };
}

test('chooseTopPages is stable and returns top 3 pages', () => {
  const input = sampleResult();
  const pages = input.sourceResult.internalGuideInput.pageAnalyses;
  const context = input.sourceResult.context;
  const homepage = input.sourceResult.finalUrl;

  const first = __testables.chooseTopPages(pages, context, homepage);
  const second = __testables.chooseTopPages(pages, context, homepage);

  assert.equal(first.length, 3);
  assert.equal(second.length, 3);
  assert.deepEqual(first.map((item) => item.url), second.map((item) => item.url));
  assert.equal(first[0]?.url, 'https://www.example.com');
});

test('generateTesterFullGuide differentiates SEO and GEO output', () => {
  const base = sampleResult();
  const seoGuide = generateTesterFullGuide({ result: base, source: 'seo', locale: 'de' });
  const geoGuide = generateTesterFullGuide({ result: base, source: 'geo', locale: 'de' });

  assert.equal(seoGuide.profile, 'seo');
  assert.equal(geoGuide.profile, 'geo');
  assert.equal(seoGuide.topPages.length, 3);
  assert.equal(geoGuide.topPages.length, 3);

  assert.notEqual(
    seoGuide.topPages[0]?.target?.sectionBlueprint?.[0]?.profileHint,
    geoGuide.topPages[0]?.target?.sectionBlueprint?.[0]?.profileHint
  );
});

test('geo guide keeps contact intent on contact pages', () => {
  const guide = generateTesterFullGuide({ result: sampleResult(), source: 'geo', locale: 'de' });
  const contactPage = (guide.topPages || []).find((page) => page.pageType === 'contact');
  assert.ok(contactPage, 'contact page must be present in top pages');
  assert.match(contactPage.target.title, /Kontakt/i);
  assert.match(contactPage.target.h1, /Kontakt/i);
  assert.doesNotMatch(contactPage.target.title, /Entity-Signale/i);
});

test('brand inference falls back to domain brand when homepage title is generic', () => {
  const base = sampleResult();
  base.sourceResult.finalUrl = 'https://www.komplettwebdesign.de';
  base.sourceResult.internalGuideInput.pageAnalyses[0].title = 'Website erstellen lassen in Berlin | Webdesign, SEO & Hosting';

  const guide = generateTesterFullGuide({ result: base, source: 'geo', locale: 'de' });
  assert.equal(guide.context.brand, 'Komplett Webdesign');
});
