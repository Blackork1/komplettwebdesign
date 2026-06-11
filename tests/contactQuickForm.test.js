import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import contactRouter from '../routes/contactRoutes.js';

const kontaktTemplate = fs.readFileSync(new URL('../views/kontakt.ejs', import.meta.url), 'utf8');
const kontaktCss = fs.readFileSync(new URL('../public/kontakt.css', import.meta.url), 'utf8');
const kontaktJs = fs.readFileSync(new URL('../public/js/kontakt.js', import.meta.url), 'utf8');
const contactControllerSource = fs.readFileSync(new URL('../controllers/contactController.js', import.meta.url), 'utf8');
const indexSource = fs.readFileSync(new URL('../index.js', import.meta.url), 'utf8');
const quickFormMatch = kontaktTemplate.match(/<section class="contact-panel contact-quick"[\s\S]*?<\/section>/);
const quickForm = quickFormMatch?.[0] || '';

function cssBlock(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = kontaktCss.match(new RegExp(`${escaped}\\s*\\{[\\s\\S]*?\\}`));
  assert.ok(match, `Missing CSS block for ${selector}`);
  return match[0];
}

test('contact page contains quick assessment form above the detailed project request', () => {
  assert.match(kontaktTemplate, /contact-quick/);
  assert.match(kontaktTemplate, /Erste Einschätzung anfragen/);
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
  assert.match(quickForm, /<input[^>]*name="startedAt"/);
  assert.match(quickForm, /<select[^>]*name="projectType"[\s\S]*?required/);
  assert.match(quickForm, /<select[^>]*name="packageInterest"/);
  assert.match(quickForm, /<select[^>]*name="budgetRange"/);
  assert.match(quickForm, /<input[^>]*name="name"[\s\S]*?required>/);
  assert.match(quickForm, /<input[^>]*name="email"[\s\S]*?required>/);
  assert.match(quickForm, /<input[^>]*name="phone"[\s\S]*?>/);
  assert.match(quickForm, /<textarea[^>]*name="message"[\s\S]*?required[\s\S]*><\/textarea>/);
  assert.match(quickForm, /<input type="hidden" name="source" value="contact-quick">/);
  assert.match(quickForm, /<input type="hidden" name="locale"/);
  assert.match(quickForm, /name="privacyConsent"[\s\S]*required/);
});

test('contact forms require consent for privacy policy and the notes page', () => {
  assert.match(kontaktTemplate, /const noticesHref = '\/hinweise-rechtstexte-seo-datenschutz'/);
  assert.match(quickForm, /href="<%= privacyHref %>"/);
  assert.match(quickForm, /href="<%= noticesHref %>"/);
  assert.match(kontaktTemplate, /Datenschutzerklärung[\s\S]*Hinweisseite[\s\S]*gelesen/);
  assert.match(kontaktTemplate, /I have read[\s\S]*privacy policy[\s\S]*notes page/);
  assert.match(contactControllerSource, /Bitte bestätige Datenschutzerklärung und Hinweisseite/);
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

test('contact controller sanitizes query preselects and requires spam token for quick requests', () => {
  assert.match(contactControllerSource, /function\s+buildContactSafeSearch/);
  assert.match(contactControllerSource, /params\.set\("paket",\s*packageInterest\)/);
  assert.match(contactControllerSource, /params\.set\("projektart",\s*projectType\)/);
  assert.match(contactControllerSource, /currentSearch:\s*buildContactSafeSearch\(req\.query,\s*packageOptions\)/);
  assert.match(contactControllerSource, /isContactQuick\s*&&\s*!token/);
  assert.match(contactControllerSource, /Der Spamschutz konnte nicht abgeschlossen werden/);
});

test('contact routes are mounted for German and English contact paths', () => {
  assert.match(indexSource, /app\.use\(["']\/kontakt["'], contactRoutes\)/);
  assert.match(indexSource, /app\.use\(["']\/en\/kontakt["'], contactRoutes\)/);
});

test('contact request chooser keeps a compact readable width', () => {
  assert.match(cssBlock('.contact-choice'), /max-width:\s*820px;/);
});

test('contact mode chooser reveals exactly one panel and scrolls to the selected form', () => {
  assert.match(kontaktTemplate, /showPanel\(mode,\s*shouldScroll\)/);
  assert.match(kontaktTemplate, /panel\.hidden = !active/);
  assert.match(kontaktTemplate, /scrollIntoView\(\{\s*behavior:\s*'smooth',\s*block:\s*'start'\s*\}\)/);
  assert.match(kontaktTemplate, /window\.location\.hash === '#projektanfrage'/);
  assert.doesNotMatch(kontaktTemplate, /else showPanel\('detailed',\s*false\)/);
});

test('detailed contact form uses a single-card wizard with back and next controls', () => {
  assert.match(kontaktTemplate, /data-form-has-errors="<%= errorList\.length \? 'true' : 'false' %>"/);
  assert.match(kontaktTemplate, /data-contact-wizard-viewport/);
  assert.match(kontaktTemplate, /data-contact-step="projectType"/);
  assert.match(kontaktTemplate, /data-contact-branch="new-website"/);
  assert.match(kontaktTemplate, /data-contact-branch="local-seo"/);
  assert.match(kontaktTemplate, /data-contact-branch="audit"/);
  assert.match(kontaktTemplate, /data-contact-final="true"/);
  assert.match(kontaktJs, /function\s+bindDetailedWizard/);
  assert.match(kontaktJs, /function\s+getActiveCards/);
  assert.match(kontaktJs, /function\s+applyBranchFieldState/);
  assert.match(kontaktJs, /function\s+goTo/);
  assert.match(kontaktJs, /contact-step-back/);
  assert.match(kontaktJs, /contact-step-next/);
  assert.match(kontaktJs, /isCardComplete\(form,\s*card\)/);
  assert.match(kontaktCss, /\.contact-form--detailed \[hidden\]/);
  assert.match(kontaktCss, /\.contact-form--detailed \.contact-form-section\.is-leaving-left/);
});

test('detailed contact wizard headings and split groups keep balanced spacing', () => {
  assert.match(kontaktCss, /\.contact-form--detailed \.contact-form-section legend/);
  assert.match(kontaktCss, /text-align:\s*center;/);
  assert.match(kontaktCss, /\.contact-step-split\s*\{[\s\S]*?column-gap:\s*clamp\(2rem,\s*5vw,\s*4rem\);/);
  assert.match(kontaktCss, /\.contact-step-split\s*\{[\s\S]*?grid-template-areas:[\s\S]*?"question-one-title question-two-title"[\s\S]*?"question-one-help question-two-help"[\s\S]*?"question-one-options question-two-options"/);
  assert.match(kontaktCss, /\.contact-question-group\s*\{[\s\S]*?align-content:\s*start;/);
  assert.match(kontaktCss, /\.contact-step-split\s*>\s*\.contact-question-group\s*\{[\s\S]*?display:\s*contents;/);
  assert.match(kontaktCss, /\.contact-step-split\s*>\s*\.contact-question-group:nth-child\(1\)\s*>\s*\.contact-option-grid\s*\{[\s\S]*?grid-area:\s*question-one-options;/);
  assert.match(kontaktCss, /\.contact-step-split\s*>\s*\.contact-question-group:nth-child\(2\)\s*>\s*\.contact-option-grid\s*\{[\s\S]*?grid-area:\s*question-two-options;/);
  assert.match(kontaktCss, /\.contact-step-split \.contact-option-grid\s*\{[\s\S]*?margin-top:\s*0;/);
});

test('new website detailed flow splits existing website and page scope into separate cards', () => {
  assert.match(kontaktTemplate, /data-contact-step="existingWebsite" data-contact-branch="new-website"/);
  assert.match(kontaktTemplate, /data-contact-step="pageScope" data-contact-branch="new-website"/);
  assert.doesNotMatch(kontaktTemplate, /data-contact-step="websiteScope"/);
  assert.ok(kontaktTemplate.indexOf('data-contact-step="existingWebsite"') < kontaktTemplate.indexOf('data-contact-step="pageScope"'));
});

test('detailed contact form contains branch-specific fields for non-package requests', () => {
  [
    'relaunchGoals',
    'googleBusinessProfileStatus',
    'localSeoArea',
    'seoFocus',
    'auditFocus',
    'auditDepth',
    'landingpageGoal',
    'maintenanceNeed',
    'maintenanceUrgency',
    'customFeatureType',
    'bugfixUrgency',
    'bugfixDescription',
    'uncertaintyNotes'
  ].forEach((name) => {
    assert.match(kontaktTemplate, new RegExp(`name="${name}"`));
  });

  assert.match(kontaktTemplate, /data-required-for="new-website"/);
  assert.match(kontaktTemplate, /data-required-for="audit maintenance bugfix"/);
});

test('detailed contact form shows optional appointment slots without admin wording', () => {
  assert.match(kontaktTemplate, /const formatSlotLabel/);
  assert.match(kontaktTemplate, /freieTermine && freieTermine\.length > 0/);
  assert.match(kontaktTemplate, /name="slotId"/);
  assert.match(kontaktTemplate, /Termin später abstimmen/);
  assert.doesNotMatch(kontaktTemplate, /Termin-Automatik/);
  assert.doesNotMatch(kontaktTemplate, /Backend/);
});

test('contact forms use the phase 5 field names and server-rendered option sources', () => {
  assert.match(kontaktTemplate, /id="kontaktForm"/);
  [
    'projectType',
    'packageInterest',
    'budgetRange',
    'timeline',
    'existingWebsiteStatus',
    'existingWebsiteUrl',
    'pageScope',
    'contentStatus',
    'optionalFeatures',
    'hostingMaintenanceInterest',
    'slotId',
    'preferredContact',
    'privacyConsent'
  ].forEach((name) => {
    assert.match(kontaktTemplate, new RegExp(`name="${name}"`));
  });

  assert.match(kontaktTemplate, /getOptions\('packageInterest'\)/);
  assert.match(kontaktTemplate, /getOptions\('budgetRange'\)/);
  assert.match(kontaktTemplate, /getOptions\('projectType'\)/);
  assert.match(kontaktTemplate, /Projektbeschreibung \(optional\)/);
  const messageTag = kontaktTemplate.match(/<textarea id="messageInput"[^>]*>/)?.[0] || '';
  assert.doesNotMatch(messageTag, /required/);
  assert.doesNotMatch(messageTag, /minlength/);
  assert.match(kontaktTemplate, /data-event="contact_form_view"/);
  assert.match(kontaktTemplate, /data-event="contact_form_submit"/);
  assert.match(contactControllerSource, /getRequiredFieldsForProjectType/);
  assert.match(contactControllerSource, /isFieldRequiredForProjectType/);
});

test('contact form script prepares non-PII events without analytics transmission', () => {
  assert.match(kontaktJs, /window\.KWDTracking\.trackEvent\(name,\s*payload\)/);
  assert.match(kontaktJs, /contact_form_start/);
  assert.match(kontaktJs, /field_name:\s*target\.name/);
  assert.match(kontaktJs, /selected_value:\s*target\.value/);
  assert.doesNotMatch(kontaktJs, /gtag\(/);
  assert.doesNotMatch(kontaktJs, /localStorage/);
});

test('optional feature none option clears other add-on choices', () => {
  assert.match(kontaktJs, /function\s+bindOptionalFeatureLogic/);
  assert.match(kontaktJs, /input\.value === "none"/);
  assert.match(kontaktJs, /candidate\.checked = false/);
});
