import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const honestPositioning =
  'Komplett Webdesign ist noch keine große Agentur mit hunderten Referenzen. Genau deshalb arbeite ich persönlich, fokussiert und nah am Projekt. Du bekommst keinen Standardprozess aus der Massenabfertigung, sondern direkte Betreuung vom ersten Gespräch bis zum Launch.';

test('about page contains honest positioning and decision-fit sections', async () => {
  const source = await readFile(new URL('../views/about.ejs', import.meta.url), 'utf8');

  assert.ok(source.includes(honestPositioning));
  assert.ok(source.includes('Für wen ich der richtige Ansprechpartner bin'));
  assert.ok(source.includes('Für wen ich nicht der richtige Anbieter bin'));
});

test('about page does not contain unsupported experience and result overclaims', async () => {
  const source = await readFile(new URL('../views/about.ejs', import.meta.url), 'utf8');

  assert.equal(source.includes('Dutzenden realisierten Projekten'), false);
  assert.equal(
    source.includes('vom Familiencafé um die Ecke über Künstler und Berater bis hin zum Tech-Startup war schon alles dabei'),
    false
  );
  assert.equal(source.includes('mehr Reservierungsanfragen über die Website als zuvor'), false);
});

test('about page passes page-specific css through the head partial', async () => {
  const about = await readFile(new URL('../views/about.ejs', import.meta.url), 'utf8');
  const head = await readFile(new URL('../views/partials/head.ejs', import.meta.url), 'utf8');

  assert.match(about, /include\('partials\/head', \{ seoExtra: aboutHeadExtra \}\)/);
  assert.match(head, /if \(seoExtraText\)/);
  assert.doesNotMatch(head, /locals\.seoExtra/);
});

test('about page keeps the refreshed hero while legacy content only gets readable text colors', async () => {
  const css = await readFile(new URL('../public/about.css', import.meta.url), 'utf8');
  const about = await readFile(new URL('../views/about.ejs', import.meta.url), 'utf8');

  assert.doesNotMatch(css, /(^|\n)body\s*\{/);
  assert.match(css, /body\.about-page\s*\{[\s\S]*?background-color:\s*#0b2a46\s*!important/);
  assert.match(css, /\.about-page\s+#about-hero\.unified-hero\s*\{[\s\S]*?min-height:\s*100vh;[\s\S]*?min-height:\s*100svh;[\s\S]*?background:\s*radial-gradient[\s\S]*?#f4f7fb\s*!important/);
  assert.match(css, /\.about-page\s+#about-hero\.unified-hero\s+\.hero-content\s*\{[\s\S]*?background:\s*transparent;[\s\S]*?box-shadow:\s*none;[\s\S]*?backdrop-filter:\s*none;[\s\S]*?padding:\s*0;/);
  assert.match(css, /\.about-page\s+#about-hero\.unified-hero\s+h1\s*\{[\s\S]*?color:\s*#0b2a46\s*!important/);
  assert.match(css, /\.about-page\s+#about-hero\.unified-hero\s+\.about-portrait-card\s*\{[\s\S]*?background:\s*linear-gradient[\s\S]*?#fff/);
  assert.match(css, /\.about-page\s+\.about-section\s*\{[\s\S]*?color:\s*#d9d9d7/);
  assert.doesNotMatch(css, /\.about-page\s+\.about-section\s*\{[\s\S]*?background:\s*linear-gradient[\s\S]*?#ffffff/);
  assert.match(css, /\.about-page\s+\.about-section\s+h2\s*\{[\s\S]*?color:\s*#ff6538/);
  assert.match(css, /\.about-page\s+\.cta-section\s*\{[\s\S]*?background-color:\s*#1d63a3/);
  assert.doesNotMatch(css, /\.about-page\s+\.cta-section\s*\{[\s\S]*?linear-gradient\(135deg,\s*rgba\(11,\s*42,\s*70/);
  assert.doesNotMatch(about, /\.hero-content,\s*\n\s*\.hero-image\s*\{/);
});
