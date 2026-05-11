import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import pool from '../util/db.js';
import NewsletterSignupModel from '../models/NewsletterSignupModel.js';
import {
  NEWSLETTER_RECAPTCHA_ACTION,
  createNewsletterRateLimiter,
  validateNewsletterSignupBody,
  verifyNewsletterRecaptchaToken
} from '../helpers/newsletterSpamProtection.js';

const partialForm = fs.readFileSync(new URL('../views/partials/newsletter_form.ejs', import.meta.url), 'utf8');
const footer = fs.readFileSync(new URL('../views/partials/footer.ejs', import.meta.url), 'utf8');
const recaptchaFormScript = fs.readFileSync(new URL('../public/js/recaptcha-form.js', import.meta.url), 'utf8');

test('newsletter form partial includes silent spam protection fields', () => {
  assert.match(partialForm, /data-recaptcha="v3"/);
  assert.match(partialForm, /data-recaptcha-action="newsletter_signup"/);
  assert.match(partialForm, /<input type="hidden" name="token">/);
  assert.match(partialForm, /typeof csrfToken !== 'undefined' \? csrfToken : ''/);
  assert.match(partialForm, /name="newsletter_started_at"/);
  assert.match(partialForm, /name="company_website"/);
  assert.match(partialForm, /autocomplete="off"/);
  assert.match(partialForm, /tabindex="-1"/);
});

test('footer newsletter form includes silent spam protection fields', () => {
  const footerNewsletter = footer.match(/<div class="newsletter">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/)?.[0] || '';
  assert.match(footerNewsletter, /data-recaptcha="v3"/);
  assert.match(footerNewsletter, /data-recaptcha-action="newsletter_signup"/);
  assert.match(footerNewsletter, /<input type="hidden" name="token">/);
  assert.match(footerNewsletter, /typeof csrfToken !== 'undefined' \? csrfToken : ''/);
  assert.match(footerNewsletter, /name="newsletter_started_at"/);
  assert.match(footerNewsletter, /name="company_website"/);
});

test('validateNewsletterSignupBody rejects bots and normalizes valid email', () => {
  const now = 1_000_000;
  const baseBody = {
    email: '  Max@Example.DE  ',
    newsletter_started_at: String(now - 4_000),
    company_website: ''
  };

  assert.deepEqual(
    validateNewsletterSignupBody(baseBody, { now, minElapsedMs: 2_500 }),
    { email: 'max@example.de' }
  );

  assert.throws(
    () => validateNewsletterSignupBody({ ...baseBody, email: 'not-an-email' }, { now }),
    /gültige E-Mail-Adresse/
  );
  assert.throws(
    () => validateNewsletterSignupBody({ ...baseBody, company_website: 'https://spam.test' }, { now }),
    /Spam erkannt/
  );
  assert.throws(
    () => validateNewsletterSignupBody({ ...baseBody, newsletter_started_at: String(now - 100) }, { now, minElapsedMs: 2_500 }),
    /zu schnell/
  );
});

test('verifyNewsletterRecaptchaToken requires configured action and score', async () => {
  assert.equal(NEWSLETTER_RECAPTCHA_ACTION, 'newsletter_signup');

  const ok = await verifyNewsletterRecaptchaToken('token-ok', {
    secret: 'secret',
    minScore: 0.5,
    postVerify: async () => ({ success: true, score: 0.9, action: 'newsletter_signup' })
  });
  assert.equal(ok, true);

  await assert.rejects(
    () => verifyNewsletterRecaptchaToken('token-low', {
      secret: 'secret',
      minScore: 0.5,
      postVerify: async () => ({ success: true, score: 0.2, action: 'newsletter_signup' })
    }),
    /reCAPTCHA/
  );

  await assert.rejects(
    () => verifyNewsletterRecaptchaToken('token-action', {
      secret: 'secret',
      minScore: 0.5,
      postVerify: async () => ({ success: true, score: 0.9, action: 'kontakt' })
    }),
    /reCAPTCHA/
  );
});

test('newsletter rate limiter blocks repeated signup attempts per client IP', () => {
  let now = 1_000;
  const limiter = createNewsletterRateLimiter({ max: 2, windowMs: 60_000, now: () => now });
  const statuses = [];
  const req = { ip: '203.0.113.9', headers: {} };
  const res = {
    setHeader() {},
    status(code) {
      statuses.push(code);
      return this;
    },
    send() {
      return this;
    }
  };
  let nextCalls = 0;
  const next = () => {
    nextCalls += 1;
  };

  limiter(req, res, next);
  limiter(req, res, next);
  limiter(req, res, next);
  assert.equal(nextCalls, 2);
  assert.deepEqual(statuses, [429]);

  now += 61_000;
  limiter(req, res, next);
  assert.equal(nextCalls, 3);
});

test('NewsletterSignupModel deletes newsletter signups created within the last 3 days', async () => {
  const originalQuery = pool.query;
  const calls = [];
  pool.query = async (sql, params) => {
    calls.push({ sql, params });
    return { rowCount: 2, rows: [{ id: 1 }, { id: 2 }] };
  };

  try {
    const result = await NewsletterSignupModel.deleteCreatedWithinDays(3);
    assert.equal(result.deletedCount, 2);
    assert.deepEqual(result.deletedRows, [{ id: 1 }, { id: 2 }]);
    assert.match(calls[0].sql, /DELETE FROM newsletter_signups/);
    assert.match(calls[0].sql, /created_at >= NOW\(\) - \(\$1 \* INTERVAL '1 day'\)/);
    assert.deepEqual(calls[0].params, [3]);
  } finally {
    pool.query = originalQuery;
  }
});

test('newsletter reCAPTCHA script binds forms without polling during initial page load', () => {
  const listeners = {};
  const form = {
    id: '',
    dataset: { recaptcha: 'v3', recaptchaAction: 'newsletter_signup' },
    getAttribute: (name) => (name === 'action' ? '/newsletter/signup' : ''),
    querySelector: () => ({ value: '' }),
    addEventListener: (event, handler) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(handler);
    },
    removeEventListener: () => {},
    appendChild: () => {}
  };

  let timerCalls = 0;
  const context = {
    console,
    URL,
    Promise,
    setTimeout: () => {
      timerCalls += 1;
      return 1;
    },
    window: {
      SITEKEY: 'site-key',
      location: { origin: 'https://komplettwebdesign.de' },
      alert: () => {}
    },
    document: {
      readyState: 'complete',
      forms: [form],
      createElement: () => ({}),
      querySelector: () => null,
      head: { appendChild: () => {} },
      addEventListener: () => {}
    }
  };

  vm.runInNewContext(recaptchaFormScript, context);

  assert.equal(timerCalls, 0);
  assert.equal(form.dataset.recaptchaBound, 'true');
  assert.ok(listeners.submit?.length, 'submit handler should be bound immediately');
});
