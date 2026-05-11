import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import {
  TESTER_RECAPTCHA_ACTIONS,
  createTesterSpamGuard,
  validateTesterSpamBody,
  verifyTesterRecaptchaToken
} from '../helpers/testerSpamProtection.js';

const testerSpamScript = fs.readFileSync(new URL('../public/js/tester-spam-protection.js', import.meta.url), 'utf8');

test('tester pages load shared silent spam protection before tester scripts', () => {
  const views = [
    'views/test.ejs',
    'views/broken_links_tester.ejs',
    'views/geo_tester.ejs',
    'views/seo_tester.ejs',
    'views/meta_tester.ejs'
  ];

  for (const viewPath of views) {
    const content = fs.readFileSync(new URL(`../${viewPath}`, import.meta.url), 'utf8');
    assert.match(content, /window\.KWD_TESTER_SPAM/);
    assert.match(content, /RECAPTCHA_SITEKEY/);
    assert.match(content, /js\/tester-spam-protection\.js/);
    assert.ok(
      content.indexOf("js/tester-spam-protection.js") < content.search(/js\/(?:website|broken-links|geo|seo|meta)-tester\.js/),
      `${viewPath} must load spam helper before tester script`
    );
  }
});

test('tester scripts attach spam fields to scan and lead requests', () => {
  const scripts = [
    ['public/js/website-tester.js', 'website_audit_scan', 'website_audit_lead'],
    ['public/js/broken-links-tester.js', 'broken_link_audit_scan', 'broken_link_audit_lead'],
    ['public/js/geo-tester.js', 'geo_audit_scan', 'geo_audit_lead'],
    ['public/js/seo-tester.js', 'seo_audit_scan', 'seo_audit_lead'],
    ['public/js/meta-tester.js', 'meta_audit_scan', 'meta_audit_lead']
  ];

  for (const [scriptPath, scanAction, leadAction] of scripts) {
    const content = fs.readFileSync(new URL(`../${scriptPath}`, import.meta.url), 'utf8');
    assert.match(content, /KWDTesterSpamProtection/);
    assert.match(content, new RegExp(scanAction));
    assert.match(content, new RegExp(leadAction));
  }
});

test('validateTesterSpamBody rejects bots and accepts human timing', () => {
  const now = 100_000_000;
  const baseBody = {
    tester_started_at: String(now - 4_000),
    company_website: ''
  };

  assert.deepEqual(
    validateTesterSpamBody(baseBody, { now, minElapsedMs: 1_500 }),
    { testerStartedAt: now - 4_000 }
  );

  assert.throws(
    () => validateTesterSpamBody({ ...baseBody, company_website: 'https://spam.test' }, { now }),
    /Spam erkannt/
  );
  assert.throws(
    () => validateTesterSpamBody({ ...baseBody, tester_started_at: String(now - 200) }, { now, minElapsedMs: 1_500 }),
    /zu schnell/
  );
  assert.throws(
    () => validateTesterSpamBody({ ...baseBody, tester_started_at: String(now - 90_000_000) }, { now }),
    /abgelaufen/
  );
});

test('verifyTesterRecaptchaToken requires configured action and score', async () => {
  assert.equal(TESTER_RECAPTCHA_ACTIONS.brokenLinkAudit, 'broken_link_audit_scan');

  const ok = await verifyTesterRecaptchaToken('token-ok', {
    secret: 'secret',
    minScore: 0.5,
    expectedAction: TESTER_RECAPTCHA_ACTIONS.brokenLinkAudit,
    postVerify: async () => ({ success: true, score: 0.9, action: 'broken_link_audit_scan' })
  });
  assert.equal(ok, true);

  await assert.rejects(
    () => verifyTesterRecaptchaToken('token-low', {
      secret: 'secret',
      minScore: 0.5,
      expectedAction: TESTER_RECAPTCHA_ACTIONS.brokenLinkAudit,
      postVerify: async () => ({ success: true, score: 0.2, action: 'broken_link_audit_scan' })
    }),
    /reCAPTCHA/
  );

  await assert.rejects(
    () => verifyTesterRecaptchaToken('token-action', {
      secret: 'secret',
      minScore: 0.5,
      expectedAction: TESTER_RECAPTCHA_ACTIONS.brokenLinkAudit,
      postVerify: async () => ({ success: true, score: 0.9, action: 'website_audit_scan' })
    }),
    /reCAPTCHA/
  );
});

test('tester spam guard blocks invalid requests as JSON', async () => {
  const guard = createTesterSpamGuard({
    expectedAction: TESTER_RECAPTCHA_ACTIONS.websiteAudit,
    validateBody: () => {
      throw new Error('Spam erkannt.');
    },
    verifyRecaptcha: async () => true
  });

  const req = { body: {} };
  const statuses = [];
  const res = {
    status(code) {
      statuses.push(code);
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    }
  };

  let nextCalls = 0;
  await guard(req, res, () => {
    nextCalls += 1;
  });

  assert.equal(nextCalls, 0);
  assert.deepEqual(statuses, [400]);
  assert.deepEqual(res.payload, { success: false, message: 'Spam erkannt.' });
});

test('tester spam helper creates hidden fields and executes v3 lazily', async () => {
  const appendedScripts = [];
  const formChildren = [];
  const listeners = {};
  const form = {
    dataset: {},
    querySelector(selector) {
      return formChildren.find((child) => selector === `input[name="${child.name}"]`) || null;
    },
    appendChild(child) {
      formChildren.push(child);
      return child;
    },
    addEventListener(event, handler) {
      listeners[event] = handler;
    }
  };

  const context = {
    console,
    Promise,
    setTimeout,
    clearTimeout,
    Date: { now: () => 123_000 },
    window: {
      KWD_TESTER_SPAM: { siteKey: 'site-key' },
      grecaptcha: {
        ready: (callback) => callback(),
        execute: async (_siteKey, options) => `token:${options.action}`
      }
    },
    document: {
      createElement: (tagName) => ({ tagName: tagName.toUpperCase(), style: {}, setAttribute(name, value) { this[name] = value; } }),
      querySelector: () => null,
      head: {
        appendChild(script) {
          appendedScripts.push(script);
          if (typeof script.onload === 'function') script.onload();
        }
      },
      addEventListener: () => {},
      readyState: 'complete'
    }
  };

  vm.runInNewContext(testerSpamScript, context);

  const fields = await context.window.KWDTesterSpamProtection.collect(form, 'website_audit_scan');
  assert.equal(fields.token, 'token:website_audit_scan');
  assert.equal(fields.tester_started_at, '123000');
  assert.equal(fields.company_website, '');
  assert.equal(formChildren.some((child) => child.name === 'company_website'), true);
  assert.equal(formChildren.some((child) => child.name === 'tester_started_at'), true);
  assert.equal(appendedScripts.length, 0);
  assert.equal(Object.keys(listeners).length, 0);
});
