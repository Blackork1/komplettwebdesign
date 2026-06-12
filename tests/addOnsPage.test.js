import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

import { addOns } from '../data/addOns.js';
import { ctas } from '../data/ctas.js';
import { footerNavigation } from '../data/siteNavigation.js';
import { INDEXABLE_STATIC_ROUTES } from '../helpers/seoPagePolicy.js';

const pageModuleUrl = new URL('../data/addOnsPage.js', import.meta.url);
const templateUrl = new URL('../views/static/zusatzleistungen-webdesign.ejs', import.meta.url);
const overlayScriptUrl = new URL('../public/js/add-ons-overlay.js', import.meta.url);
const routeSource = readFileSync(new URL('../routes/staticPages.js', import.meta.url), 'utf8');
const costsControllerSource = readFileSync(new URL('../controllers/leistungenController.js', import.meta.url), 'utf8');
const templateSource = existsSync(templateUrl) ? readFileSync(templateUrl, 'utf8') : '';
const overlayScriptSource = existsSync(overlayScriptUrl) ? readFileSync(overlayScriptUrl, 'utf8') : '';
const leistungenCssSource = readFileSync(new URL('../public/leistungen.css', import.meta.url), 'utf8');
const addOnsPage = existsSync(pageModuleUrl) ? (await import(pageModuleUrl)).addOnsPage : null;
const pageText = JSON.stringify(addOnsPage || {});
const footerHrefs = footerNavigation.flatMap((column) => (column.links || []).map((link) => link.href));

test('add-ons page exposes canonical URL, SEO metadata, hero and required sections', () => {
  assert.ok(addOnsPage, 'missing addOnsPage data module');
  assert.equal(addOnsPage.slug, 'zusatzleistungen-webdesign');
  assert.equal(addOnsPage.canonicalPath, '/leistungen/zusatzleistungen-webdesign');
  assert.equal(addOnsPage.title, 'Zusatzleistungen Webdesign | Erweiterungen & Preise');
  assert.equal(addOnsPage.h1, 'Zusatzleistungen für deine Website');
  assert.match(addOnsPage.description, /Zusatzleistungen für deine Website/i);
  assert.match(addOnsPage.hero.lead, /Zusatzleistungen werden separat kalkuliert/i);
  assert.equal(addOnsPage.hero.primaryCta.url, '/kontakt?projektart=zusatzleistung');
  assert.equal(addOnsPage.hero.secondaryCta.url, '/pakete');

  const requiredSectionIds = [
    'intro',
    'why-separate',
    'package-boundary',
    'add-on-overview',
    'zusatzseite-standard',
    'seo-leistungsseite',
    'texterstellung-erweitert',
    'animationen-einfach',
    'animationen-umfangreich',
    'buchungssystem-integration',
    'cms-einfach',
    'tracking-einrichtung',
    'local-seo',
    'google-business-profil',
    'mehrsprachigkeit',
    'bildrecherche-bildbearbeitung',
    'inhaltsmigration',
    'landingpage',
    'relaunch-konzept',
    'website-audit',
    'fehlerbehebung',
    'stundenweise-weiterentwicklung',
    'when-individual',
    'not-offered',
    'legal-notes',
    'faq',
    'final-cta'
  ];

  assert.deepEqual(
    requiredSectionIds.filter((id) => !addOnsPage.sections.some((section) => section.id === id)),
    []
  );
});

test('add-ons page uses central add-on data with prompt 8b price ranges and boundaries', () => {
  assert.ok(addOnsPage, 'missing addOnsPage data module');
  assert.deepEqual(addOnsPage.addOns.map((item) => item.id), addOns.map((item) => item.id));
  assert.ok(addOnsPage.addOns.every((item) => item.notIncludedInPackages === true));
  assert.equal(addOns.find((item) => item.id === 'landingpage')?.priceLabel, 'ab 699–1.499 €');

  assert.deepEqual(
    addOnsPage.addOns
      .map((addOn) => addOn.id)
      .filter((id) => !addOnsPage.detailSections.some((detail) => detail.id === id || detail.addOns.some((item) => item.id === id))),
    [],
    'every overview add-on needs a matching overlay detail section'
  );

  const simpleAnimationDetail = addOnsPage.detailSections.find((detail) => detail.id === 'animationen-einfach');
  const extensiveAnimationDetail = addOnsPage.detailSections.find((detail) => detail.id === 'animationen-umfangreich');
  assert.equal(simpleAnimationDetail?.addOns.map((item) => item.id).join(','), 'animationen-einfach');
  assert.equal(extensiveAnimationDetail?.addOns.map((item) => item.id).join(','), 'animationen-umfangreich');
  assert.match(simpleAnimationDetail?.lead || '', /kleine, gezielte Bewegungen/i);
  assert.match(extensiveAnimationDetail?.lead || '', /eigenes Interaktionskonzept/i);
  assert.ok(simpleAnimationDetail.boundaries.some((item) => /keine komplexen Szenen/i.test(item)));
  assert.ok(extensiveAnimationDetail.boundaries.some((item) => /kein kleines Pauschal-Effektpaket|nicht als kleines Pauschal-Effektpaket/i.test(item)));

  [
    'Start bleibt ein klar begrenzter Einstieg ohne Sonderfunktionen.',
    'Business ist die häufig passende Unternehmenswebsite.',
    'Wachstum eignet sich für größere Strukturen, Relaunches und mehrere Leistungsseiten.',
    'Individuell ist sinnvoll, wenn mehrere Sonderfunktionen oder größere technische Anforderungen zusammenkommen.',
    'Alle Preisangaben sind Orientierungswerte und verstehen sich gemäß § 19 UStG ohne Ausweis der Umsatzsteuer.',
    'Drittanbieter-Kosten, Lizenzen und externe Tools sind nicht automatisch enthalten.'
  ].forEach((snippet) => {
    assert.match(pageText, new RegExp(snippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });
});

test('add-ons page avoids old included-feature promises, legal guarantees and success guarantees', () => {
  assert.doesNotMatch(pageText, /Buchungssystem inklusive|Shop optional|CMS inklusive|Mehrsprachigkeit inklusive|Tracking inklusive/i);
  assert.doesNotMatch(pageText, /Google Analytics inklusive|Texte inklusive|SEO inklusive|alles inklusive|keine versteckten Kosten/i);
  assert.doesNotMatch(pageText, /unbegrenzte Änderungen|rechtssicher|rechtlich abgesichert|rechtskonform|DSGVO-konform/i);
  assert.doesNotMatch(pageText, /Ranking garantiert|garantiert mehr Kunden|Conversion-Garantie|Umsatzsteigerung garantiert/i);
});

test('add-ons overview opens animated detail overlay without duplicate detail grid', () => {
  assert.match(templateSource, /data-add-ons-overlay-trigger/);
  assert.match(templateSource, /data-add-ons-detail-index/);
  assert.match(templateSource, /aria-haspopup="dialog"/);
  assert.match(templateSource, /class="add-ons-overlay"[\s\S]*data-add-ons-overlay[\s\S]*role="dialog"[\s\S]*aria-modal="true"/);
  assert.match(templateSource, /data-add-ons-overlay-close/);
  assert.match(templateSource, /data-add-ons-overlay-prev/);
  assert.match(templateSource, /data-add-ons-overlay-next/);
  assert.match(templateSource, /data-add-ons-overlay-counter/);
  assert.match(templateSource, /1 von <%=\s*page\.addOns\.length\s*%>/);
  assert.match(templateSource, /data-add-ons-overlay-viewport/);
  assert.match(templateSource, /<span class="add-ons-list-label">Sinnvoll für<\/span>\s*<ul class="add-ons-list add-ons-list--checks">/);
  assert.match(templateSource, /<span class="add-ons-list-label">Abgrenzung<\/span>\s*<ul class="add-ons-list add-ons-list--crosses">/);
  assert.match(templateSource, /js\/add-ons-overlay\.js/);
  assert.doesNotMatch(templateSource, /<h2 id="details-heading">Zusatzleistungen im Detail<\/h2>/);
  assert.doesNotMatch(templateSource, /<div class="add-ons-detail-grid">/);

  assert.match(leistungenCssSource, /\.add-ons-overlay\s*\{[\s\S]*?position:\s*fixed;[\s\S]*?opacity:\s*0;/);
  assert.match(leistungenCssSource, /\.add-ons-overlay\.is-open/);
  assert.match(leistungenCssSource, /\.add-ons-overlay__slide\.is-exiting-left/);
  assert.match(leistungenCssSource, /\.add-ons-overlay__slide\.is-entering-right/);
  assert.match(leistungenCssSource, /\.add-ons-list--checks li::before\s*\{[\s\S]*?content:\s*"✓";/);
  assert.match(leistungenCssSource, /\.add-ons-list--crosses li::before\s*\{[\s\S]*?content:\s*"×";/);
  assert.match(leistungenCssSource, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);

  assert.match(overlayScriptSource, /data-add-ons-overlay-trigger/);
  assert.match(overlayScriptSource, /pointerdown/);
  assert.match(overlayScriptSource, /ArrowRight/);
  assert.match(overlayScriptSource, /Escape/);
  assert.match(overlayScriptSource, /restoreFocus/);
});

test('add-ons FAQ, internal links, route, template, CTA and sitemap are wired safely', () => {
  assert.ok(addOnsPage, 'missing addOnsPage data module');
  assert.ok(addOnsPage.faq.length >= 20);
  assert.ok(addOnsPage.faq.every((item) => item.question && item.answer));
  assert.ok(addOnsPage.internalLinks.some((link) => link.href === '/leistungen/laufende-kosten-website'));
  assert.ok(addOnsPage.internalLinks.some((link) => link.href === '/pakete/individuell'));

  assert.match(routeSource, /router\.get\('\/zusatzleistungen-webdesign'/);
  assert.match(routeSource, /router\.get\('\/leistungen\/zusatzleistungen-webdesign'/);
  assert.match(templateSource, /add-ons-page/);
  assert.match(templateSource, /FAQPage/);
  assert.match(templateSource, /BreadcrumbList/);
  assert.match(templateSource, /<h1 class="home-hero-reveal home-hero-reveal--h1 animate-on-scroll"><%=\s*page\.h1\s*%><\/h1>/);
  assert.match(templateSource, /class="btn btn-primary add-ons-package-button"/);
  assert.match(leistungenCssSource, /\.add-ons-card-grid--packages\.package-slider-scroll > \.add-ons-card\s*\{[\s\S]*?flex:\s*0 0 clamp\(330px,\s*34vw,\s*430px\);/);
  assert.match(leistungenCssSource, /\.add-ons-package-card\s*\{[\s\S]*?min-height:\s*clamp\(430px,\s*38vw,\s*520px\);/);
  assert.match(leistungenCssSource, /\.add-ons-package-card p:last-of-type\s*\{[\s\S]*?margin-bottom:\s*clamp\(28px,\s*4vw,\s*48px\);/);
  assert.equal(ctas.addOns.url, '/leistungen/zusatzleistungen-webdesign');
  assert.ok(
    INDEXABLE_STATIC_ROUTES.some((route) => route.path === '/leistungen/zusatzleistungen-webdesign'),
    'add-ons page missing from sitemap policy'
  );
  assert.ok(footerHrefs.includes('/leistungen/zusatzleistungen-webdesign'));
  assert.match(costsControllerSource, /href:\s*'\/leistungen\/zusatzleistungen-webdesign'/);
});
