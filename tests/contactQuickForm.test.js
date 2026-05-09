import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import contactRouter from '../routes/contactRoutes.js';

const kontaktTemplate = fs.readFileSync(new URL('../views/kontakt.ejs', import.meta.url), 'utf8');
const kontaktCss = fs.readFileSync(new URL('../public/kontakt.css', import.meta.url), 'utf8');
const kontaktJs = fs.readFileSync(new URL('../public/js/kontakt.js', import.meta.url), 'utf8');
const indexSource = fs.readFileSync(new URL('../index.js', import.meta.url), 'utf8');
const quickFormMatch = kontaktTemplate.match(/<section class="contact-quick contact-panel"[\s\S]*?<\/section>/);
const quickForm = quickFormMatch?.[0] || '';

function cssBlock(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = kontaktCss.match(new RegExp(`${escaped}\\s*\\{[\\s\\S]*?\\}`));
  assert.ok(match, `Missing CSS block for ${selector}`);
  return match[0];
}

test('contact page contains quick assessment form above the long wizard', () => {
  assert.match(kontaktTemplate, /contact-quick/);
  assert.match(kontaktTemplate, /Kostenlose Ersteinschätzung/);
  assert.match(kontaktTemplate, /name="message"/);
  assert.ok(quickForm, 'quick form section should be present');

  const quickFormIndex = kontaktTemplate.indexOf('contact-quick');
  const wizardIndex = kontaktTemplate.indexOf('id="kontaktForm"');

  assert.notEqual(quickFormIndex, -1);
  assert.notEqual(wizardIndex, -1);
  assert.ok(quickFormIndex < wizardIndex, 'quick form should appear before kontaktForm');
});

test('contact quick form posts localized recaptcha-protected requests with required fields', () => {
  assert.doesNotMatch(quickForm, /id="kontaktForm"/);
  assert.match(quickForm, /\/kontakt\/kurzanfrage/);
  assert.match(quickForm, /\/en\/kontakt\/kurzanfrage/);
  assert.match(quickForm, /method="POST"/);
  assert.match(quickForm, /data-recaptcha="v3"/);
  assert.match(quickForm, /data-recaptcha-action="contact_quick"/);
  assert.match(quickForm, /<input type="hidden" name="token">/);
  assert.match(quickForm, /<input[^>]*name="name"[\s\S]*?required>/);
  assert.match(quickForm, /<input[^>]*name="email"[\s\S]*?required>/);
  assert.match(quickForm, /<input[^>]*name="phone"[\s\S]*?>/);
  assert.match(quickForm, /<textarea[^>]*name="message"[\s\S]*?required><\/textarea>/);
  assert.match(quickForm, /<input type="hidden" name="source" value="contact-quick">/);
  assert.match(quickForm, /<input type="hidden" name="projectType"/);
  assert.match(quickForm, /<input type="hidden" name="locale"/);
});

test('contact routes expose quick request endpoint through upload and processor handlers', () => {
  const quickRoute = contactRouter.stack.find((layer) => layer.route?.path === '/kurzanfrage');

  assert.ok(quickRoute, 'quick request route should be registered');
  assert.equal(quickRoute.route.methods.post, true);
  assert.deepEqual(
    quickRoute.route.stack.map((layer) => layer.handle.name),
    ['webdesignBerlinUpload', 'processWebdesignBerlinForm']
  );
});

test('contact routes are mounted for German and English contact paths', () => {
  assert.match(indexSource, /app\.use\(["']\/kontakt["'], contactRoutes\)/);
  assert.match(indexSource, /app\.use\(["']\/en\/kontakt["'], contactRoutes\)/);
});

test('contact request chooser uses the same desktop width as the detailed request intro', () => {
  assert.match(cssBlock('.contact-page-section .contact-choice'), /max-width:\s*760px;/);
});

test('quick contact form is centered in the desktop viewport after selection', () => {
  assert.match(
    kontaktCss,
    /@media\s*\(min-width:\s*768px\)\s*\{[\s\S]*?\.contact-page-section\s+\.contact-quick\s*\{[\s\S]*?min-height:\s*calc\(100vh\s*-\s*6rem\);[\s\S]*?align-items:\s*center;[\s\S]*?\}/
  );
  assert.match(kontaktTemplate, /mode === 'quick' && window\.matchMedia\('\(min-width: 768px\)'\)\.matches/);
  assert.match(kontaktTemplate, /block:\s*shouldCenterQuick\s*\?\s*'center'\s*:\s*'start'/);
});

test('quick contact viewport frame stays transparent while only the content card is white', () => {
  assert.match(quickForm, /<div class="contact-quick__card">/);

  const outerBlock = cssBlock('.contact-quick');
  assert.doesNotMatch(outerBlock, /background\s*:/);
  assert.doesNotMatch(outerBlock, /box-shadow\s*:/);
  assert.doesNotMatch(outerBlock, /border:\s*1px/);

  const cardBlock = cssBlock('.contact-quick__card');
  assert.match(cardBlock, /background:\s*#f7fafc;/);
  assert.match(cardBlock, /border:\s*1px solid rgba\(12,\s*42,\s*70,\s*0\.12\);/);
  assert.match(cardBlock, /box-shadow:\s*0 18px 42px rgba\(0,\s*0,\s*0,\s*0\.14\);/);
});

test('detailed contact radio options advance again when an already selected label is clicked after going back', () => {
  assert.match(kontaktJs, /function\s+advanceFromOptionInput\s*\(\s*input\s*\)/);
  assert.match(kontaktJs, /inp\.addEventListener\("click",\s*\(e\)\s*=>\s*\{[\s\S]*?advanceFromOptionInput\(e\.currentTarget\);[\s\S]*?\}\);/);
  assert.doesNotMatch(kontaktJs, /inp\.addEventListener\("change"/);
});
