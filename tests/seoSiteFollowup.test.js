import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { SEO_LANDING_PAGES } from '../data/seoLandingPages.js';
import { referenceProjects } from '../data/referenceProjects.js';
import { footerNavigation, headerNavigation } from '../data/siteNavigation.js';

const files = {
  contact: readFileSync(new URL('../views/kontakt.ejs', import.meta.url), 'utf8'),
  header: readFileSync(new URL('../views/partials/header.ejs', import.meta.url), 'utf8'),
  footer: readFileSync(new URL('../views/partials/footer.ejs', import.meta.url), 'utf8'),
  index: readFileSync(new URL('../views/index.ejs', import.meta.url), 'utf8'),
  webdesignBerlin: readFileSync(new URL('../controllers/districtController.js', import.meta.url), 'utf8'),
  leistungenCss: readFileSync(new URL('../public/leistungen.css', import.meta.url), 'utf8'),
  referencesCss: readFileSync(new URL('../public/references.css', import.meta.url), 'utf8'),
  seoLandingTemplate: readFileSync(new URL('../views/seo_landing/show.ejs', import.meta.url), 'utf8'),
  referencesIndexTemplate: readFileSync(new URL('../views/references/index.ejs', import.meta.url), 'utf8'),
  referencesShowTemplate: readFileSync(new URL('../views/references/show.ejs', import.meta.url), 'utf8'),
  referenceController: readFileSync(new URL('../controllers/referenceController.js', import.meta.url), 'utf8'),
  seoGuideCluster: readFileSync(new URL('../data/seoGuideCluster.js', import.meta.url), 'utf8'),
  packageDetailTemplate: readFileSync(new URL('../views/package_detail.ejs', import.meta.url), 'utf8'),
  leistungenShowTemplate: readFileSync(new URL('../views/leistungen/show.ejs', import.meta.url), 'utf8'),
  metaTesterTemplate: readFileSync(new URL('../views/meta_tester.ejs', import.meta.url), 'utf8'),
  websiteTesterTemplate: readFileSync(new URL('../views/test.ejs', import.meta.url), 'utf8'),
  ratgeberIndexTemplate: readFileSync(new URL('../views/ratgeber/index.ejs', import.meta.url), 'utf8'),
  cookieBanner: readFileSync(new URL('../views/partials/cookie-banner.ejs', import.meta.url), 'utf8'),
  bookingWidget: readFileSync(new URL('../views/partials/booking_widget.ejs', import.meta.url), 'utf8')
};

function collectStrings(value, path = [], result = []) {
  if (typeof value === 'string') {
    const key = path.at(-1);
    if (!['slug', 'path', 'href', 'image', 'liveUrl'].includes(key)) {
      result.push(value);
    }
    return result;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => collectStrings(item, [...path, String(index)], result));
    return result;
  }

  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => collectStrings(item, [...path, key], result));
  }

  return result;
}

function stripSourceComments(source) {
  return source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}

function flattenNavigation(items = []) {
  return items.flatMap((item) => [
    item,
    ...flattenNavigation(Array.isArray(item.children) ? item.children : []),
    ...flattenNavigation(Array.isArray(item.links) ? item.links : [])
  ]);
}

const headerHrefs = flattenNavigation(headerNavigation).map((item) => item.href).filter(Boolean);
const footerHrefs = flattenNavigation(footerNavigation).map((item) => item.href).filter(Boolean);

function visibleTemplateText(source) {
  return stripSourceComments(source)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ');
}

const transliterationPattern = /\b(?:fuer|Fuer|ueber|Ueber|haeufig|Haeufig|naechst|Naechst|klaer|Klaer|fuehrt|Fuehrt|spaeter|Spaeter|geprueft|Geprueft|pruefen|Pruefen|verstaendlich|Verstaendlich|noetig|Noetig|gewuenscht|Gewuenscht|gewuenschten|Gewuenschten|gebuendelt|Gebuendelt|eroeff|Eroeff|veroeff|Veroeff|koennen|Koennen|fuehrung|Fuehrung|ausbaufaehig|Ausbaufaehig|Ausgewaehlte|ausgewaehlte|waehlen|Waehlen|Waehle|Naechster|Gefuehl|Praesenz|Atmosphaere|Gaeste|naeher|Gebaeude|wuerdig|oeffentliche|oeffentlich|nachtraeglich|haengt|tragfaehig|laeuft|Einwaende|einwaende|staerken|Inselloesung|Tagesgeschaeft|einschaetzen|Erstgespraech|zerfaellt|haelt|widerspruechliche|persoenliche|persoenlichen|Kontaktmoeglichkeiten|weiss|Cafe)\b/;

test('contact page starts with a request type choice instead of showing both forms stacked', () => {
  assert.match(files.contact, /class="contact-choice"/);
  assert.match(files.contact, /data-contact-mode="quick"/);
  assert.match(files.contact, /data-contact-mode="detailed"/);
  assert.match(files.contact, /id="contact-quick-panel"[\s\S]*?hidden/);
  assert.match(files.contact, /id="contact-detailed-panel"[\s\S]*?hidden/);
});

test('important website-erstellen-lassen landing page is linked from global and core pages', () => {
  assert.ok(footerHrefs.includes('/website-erstellen-lassen-berlin'));
  assert.match(files.index, /href="\/website-erstellen-lassen-berlin"/);
  assert.match(files.webdesignBerlin, /\/website-erstellen-lassen-berlin/);
});

test('important website-relaunch landing page is linked from global and core pages', () => {
  assert.ok(headerHrefs.includes('/leistungen/website-relaunch'));
  assert.ok(footerHrefs.includes('/leistungen/website-relaunch'));
  assert.match(files.index, /href="\/leistungen\/website-relaunch"/);
  assert.match(files.webdesignBerlin, /\/leistungen\/website-relaunch/);
});

test('phase 11 navigation links core webdesign, package and service pages', () => {
  assert.ok(headerHrefs.includes('/webdesign-berlin'));
  assert.ok(headerHrefs.includes('/pakete'));
  assert.ok(headerHrefs.includes('/leistungen/website-relaunch'));
  assert.ok(headerHrefs.includes('/leistungen/local-seo'));
  assert.ok(headerHrefs.includes('/leistungen/website-audit'));
  assert.ok(footerHrefs.includes('/ablauf'));
  assert.doesNotMatch(files.header, /Termin buchen|\/booking/);
  assert.match(files.webdesignBerlin, /\/ablauf/);
});

test('new and changed page styles use the existing blue orange brand palette', () => {
  [files.leistungenCss, files.referencesCss].forEach((css) => {
    assert.match(css, /#0b2a46/i);
    assert.match(css, /#e94a1b/i);
    assert.doesNotMatch(css, /#0f766e|#115e59|#f6c453|#f7efe7/i);
  });
});

test('new seo and reference page copy uses real German umlauts in visible text', () => {
  const visibleText = [
    ...collectStrings(SEO_LANDING_PAGES),
    ...collectStrings(referenceProjects),
    files.seoLandingTemplate,
    files.referencesIndexTemplate,
    files.referencesShowTemplate,
    files.referenceController,
    files.cookieBanner,
    files.bookingWidget
  ].join('\n');

  assert.doesNotMatch(visibleText, transliterationPattern);
});

test('customer-facing page copy does not expose CTA as a visible label or description', () => {
  const customerFacingCopy = [
    visibleTemplateText(files.referencesShowTemplate),
    stripSourceComments(files.seoGuideCluster),
    stripSourceComments(files.webdesignBerlin),
    visibleTemplateText(files.packageDetailTemplate),
    visibleTemplateText(files.leistungenShowTemplate),
    visibleTemplateText(files.index),
    visibleTemplateText(files.metaTesterTemplate),
    visibleTemplateText(files.websiteTesterTemplate),
    visibleTemplateText(files.ratgeberIndexTemplate)
  ].join('\n');

  const customerFacingSource = [
    stripSourceComments(files.referencesShowTemplate),
    files.seoGuideCluster,
    files.webdesignBerlin,
    files.packageDetailTemplate,
    files.leistungenShowTemplate,
    files.index,
    files.metaTesterTemplate,
    files.websiteTesterTemplate,
    files.ratgeberIndexTemplate
  ].map(stripSourceComments).join('\n');

  assert.doesNotMatch(customerFacingCopy, />\s*CTA\s*</);
  assert.doesNotMatch(customerFacingSource, /aria-label="[^"]*(?:CTA|Call-to-Action)[^"]*"/i);
  assert.doesNotMatch(customerFacingCopy, /\b(?:CTAs|CTA[-\s]?(?:Klicks?|Präsenz|Klarheit)|Telefon-CTA|Reservierungs-CTA|Call-to-Action(?:s)?)\b/i);
});
