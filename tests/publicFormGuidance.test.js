import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

const recaptchaFormJs = read('public/js/recaptcha-form.js');
const bookingWidgetJs = read('public/js/booking-widget.js');
const bookingWidgetView = read('views/partials/booking_widget.ejs');
const newsletterForm = read('views/partials/newsletter_form.ejs');
const packageDetail = read('views/package_detail.ejs');
const testerSpamProtectionJs = read('public/js/tester-spam-protection.js');

test('generic reCAPTCHA forms expose inline guidance, timeout and native validity handling', () => {
  assert.match(recaptchaFormJs, /RECAPTCHA_TIMEOUT_MS\s*=\s*12_000/);
  assert.match(recaptchaFormJs, /function withTimeout/);
  assert.match(recaptchaFormJs, /querySelector\('\[data-form-status\]'\)/);
  assert.match(recaptchaFormJs, /form\.checkValidity\(\)/);
  assert.match(recaptchaFormJs, /form\.reportValidity\(\)/);
  assert.match(recaptchaFormJs, /HTMLFormElement\.prototype\.submit\.call\(form\)/);
  assert.match(recaptchaFormJs, /data-form-status/);
});

test('package inquiry form makes appointment optional and explains required input', () => {
  assert.match(packageDetail, /data-recaptcha-error=/);
  assert.match(packageDetail, /aria-describedby="package-name-help"/);
  assert.match(packageDetail, /id="package-name-help"/);
  assert.match(packageDetail, /aria-describedby="package-email-help"/);
  assert.match(packageDetail, /id="package-email-help"/);
  assert.match(packageDetail, /<option value="" selected>/);
  assert.match(packageDetail, /Termin später abstimmen/);
  assert.match(packageDetail, /data-form-status/);
});

test('booking widget validates visibly and cannot hang silently on reCAPTCHA', () => {
  assert.match(bookingWidgetView, /id="booking-name-help"/);
  assert.match(bookingWidgetView, /id="booking-email-help"/);
  assert.match(bookingWidgetView, /id="booking-note-help"/);
  assert.match(bookingWidgetView, /aria-live="polite"/);
  assert.match(bookingWidgetJs, /RECAPTCHA_TIMEOUT_MS\s*=\s*12_000/);
  assert.match(bookingWidgetJs, /function withTimeout/);
  assert.match(bookingWidgetJs, /form\.checkValidity\(\)/);
  assert.match(bookingWidgetJs, /form\.reportValidity\(\)/);
  assert.match(bookingWidgetJs, /HTMLFormElement\.prototype\.submit\.call\(form\)/);
});

test('newsletter form shows helper and submit status instead of browser error pages', () => {
  assert.match(newsletterForm, /id="newsletterEmailHelp"/);
  assert.match(newsletterForm, /aria-describedby="newsletterEmailHelp"/);
  assert.match(newsletterForm, /data-form-status/);
  assert.match(newsletterForm, /aria-live="polite"/);
});

test('website tester forms describe expected URL and context input', () => {
  const testerViews = [
    'views/test.ejs',
    'views/broken_links_tester.ejs',
    'views/geo_tester.ejs',
    'views/seo_tester.ejs',
    'views/meta_tester.ejs'
  ];

  for (const viewPath of testerViews) {
    const content = read(viewPath);
    assert.match(content, /wt-form-hint/);
    assert.match(content, /aria-describedby=/);
    assert.match(content, /domain\.de/);
  }
});

test('tester reCAPTCHA helper times out instead of leaving scan forms loading forever', () => {
  assert.match(testerSpamProtectionJs, /RECAPTCHA_TIMEOUT_MS\s*=\s*12_000/);
  assert.match(testerSpamProtectionJs, /function withTimeout/);
  assert.match(testerSpamProtectionJs, /withTimeout\(window\.grecaptcha\.execute/);
});
