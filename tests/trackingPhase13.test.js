import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('phase 13 exposes a consent-aware tracking layer instead of direct GA CTA handling', () => {
  const footer = read('views/partials/footer.ejs');
  const tracking = read('public/js/tracking.js');
  const legacyGaEvents = read('public/js/ga-events.js');
  const websiteTester = read('public/js/website-tester.js');
  const seoTester = read('public/js/seo-tester.js');
  const brokenLinksTester = read('public/js/broken-links-tester.js');

  assert.match(footer, /js\/tracking\.js/);
  assert.doesNotMatch(footer, /js\/ga-events\.js/);
  assert.match(tracking, /window\.KWDTracking/);
  assert.match(tracking, /sanitizeTrackingParams/);
  assert.match(tracking, /analyticsConsentGranted/);
  assert.match(tracking, /CustomEvent\("kwd:tracking"/);
  assert.match(tracking, /DISALLOWED_PARAM_NAMES/);
  assert.doesNotMatch(legacyGaEvents, /gtag\('event'/);
  assert.doesNotMatch(legacyGaEvents, /link_url:\s*url/);
  [websiteTester, seoTester, brokenLinksTester].forEach((source) => {
    assert.match(source, /KWDTracking\.trackEvent/);
    assert.doesNotMatch(source, /gtag\('event'/);
    assert.doesNotMatch(source, /window\.gtag\('event'/);
  });
});

test('tracking layer whitelists only non-personal contact form categories', () => {
  const tracking = read('public/js/tracking.js');
  const kontaktTemplate = read('views/kontakt.ejs');
  const kontaktJs = read('public/js/kontakt.js');

  [
    'project_type_selected',
    'package_interest_selected',
    'budget_range_selected',
    'timeline_selected',
    'page_scope_selected',
    'content_status_selected',
    'optional_features_selected',
    'hosting_maintenance_selected',
    'contact_form_submit_attempt',
    'contact_form_validation_error'
  ].forEach((eventName) => {
    assert.match(tracking + kontaktJs + kontaktTemplate, new RegExp(eventName));
  });

  assert.match(kontaktJs, /selected_value:\s*target\.value/);
  assert.match(tracking, /valueForField/);
  assert.match(tracking, /fieldName === "projectType"/);
  assert.match(tracking, /fieldName === "packageInterest"/);
  assert.match(tracking, /fieldName === "budgetRange"/);
  assert.doesNotMatch(kontaktTemplate, /name="email"[^>]*data-contact-event/);
  assert.doesNotMatch(kontaktTemplate, /name="phone"[^>]*data-contact-event/);
  assert.doesNotMatch(kontaktTemplate, /name="company"[^>]*data-contact-event/);
  assert.doesNotMatch(kontaktTemplate, /name="message"[^>]*data-contact-event/);
  assert.doesNotMatch(kontaktTemplate, /name="existingWebsiteUrl"[^>]*data-contact-event/);
});

test('thank-you page tracks conversion through the safe dispatcher without lead IDs in analytics payloads', () => {
  const thankyou = read('views/kontakt/thankyou.ejs');
  const testerConfirmPages = [
    'views/website_tester_confirm.ejs',
    'views/seo_tester_confirm.ejs',
    'views/geo_tester_confirm.ejs',
    'views/broken_links_tester_confirm.ejs'
  ].map(read);

  assert.match(thankyou, /data-event="thank_you_view"/);
  assert.match(thankyou, /KWDTracking\.trackEvent\('thank_you_view'/);
  assert.match(thankyou, /KWDTracking\.trackEvent\('contact_form_submit_success'/);
  assert.match(thankyou, /KWDTracking\.trackEvent\('lead_received'/);
  assert.doesNotMatch(thankyou, /generate_lead/);
  assert.doesNotMatch(thankyou, /gtag\('event'/);

  const payloadBlock = thankyou.match(/var payload = \{[\s\S]*?\};/)?.[0] || '';
  assert.doesNotMatch(payloadBlock, /leadEventId/);
  assert.doesNotMatch(payloadBlock, /lead_event_id/);
  assert.doesNotMatch(payloadBlock, /email|phone|name|message|existingWebsiteUrl/);

  testerConfirmPages.forEach((source) => {
    assert.match(source, /KWDTracking\.trackEvent/);
    assert.doesNotMatch(source, /gtag\('event'/);
    assert.doesNotMatch(source, /window\.gtag\('event'/);
  });
});

test('server-side lead qualification is admin-only metadata and not analytics data', () => {
  const controller = read('controllers/contactController.js');
  const tracking = read('public/js/tracking.js');

  assert.match(controller, /function\s+buildLeadQualification/);
  assert.match(controller, /likely_package/);
  assert.match(controller, /lead_category/);
  assert.match(controller, /lead_priority/);
  assert.match(controller, /estimated_fit/);
  assert.match(controller, /needs_followup/);
  assert.match(controller, /addLeadQualificationRows\(adminRows/);
  assert.match(controller, /addLeadQualificationRows\(adminSummaryRows/);
  assert.doesNotMatch(tracking, /lead_priority|estimated_fit|needs_followup/);
});

test('tracking page context is rendered from server-side route context', () => {
  const index = read('index.js');
  const head = read('views/partials/head.ejs');
  const data = read('data/trackingEvents.js');

  assert.match(index, /trackingPageContextForPath\(req\.path\)/);
  assert.match(head, /window\.KWD_TRACKING_CONTEXT/);
  assert.match(data, /\/leistungen\/local-seo/);
  assert.match(data, /\/leistungen\/website-relaunch/);
  assert.match(data, /\/leistungen\/landingpage-erstellen-lassen/);
  assert.match(data, /\/leistungen\/website-audit/);
});
