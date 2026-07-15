import test from 'node:test';
import assert from 'node:assert/strict';

import { validateLegacyStaticOptimization } from '../services/contentAgent/legacyStaticValidationService.js';

const before = {
  contentFormat: 'legacy_ejs',
  contentHtml: '<section class="alte-klasse"><p>Alter Inhalt.</p></section>'
};

test('differenzielle Legacy-Prüfung erlaubt ausschließlich unveränderte Altbefunde', async () => {
  const calls = [];
  const validateArticle = async (article) => {
    calls.push(article.contentHtml);
    return {
      passed: false,
      sanitizedHtml: '<section><p>Inhalt</p></section>',
      issues: [{
        code: 'class_forbidden',
        className: 'alte-klasse',
        message: 'Historische Klasse.'
      }]
    };
  };

  const result = await validateLegacyStaticOptimization({
    before,
    after: { ...before, contentHtml: before.contentHtml.replace('Alter', 'Gezielt reparierter') },
    validateArticle,
    context: {}
  });

  assert.equal(result.passed, true);
  assert.equal(result.sanitizedHtml.includes('Gezielt reparierter'), true);
  assert.deepEqual(result.issues, []);
  assert.equal(calls.length, 2);
});

test('differenzielle Legacy-Prüfung blockiert neue Validatorbefunde', async () => {
  let call = 0;
  const result = await validateLegacyStaticOptimization({
    before,
    after: { ...before, contentHtml: '<section class="neue-klasse"><p>Neu.</p></section>' },
    validateArticle: async () => ({
      passed: false,
      sanitizedHtml: '<section><p>Inhalt</p></section>',
      issues: call++ === 0
        ? [{ code: 'class_forbidden', className: 'alte-klasse', message: 'Alt.' }]
        : [{ code: 'class_forbidden', className: 'neue-klasse', message: 'Neu.' }]
    }),
    context: {}
  });

  assert.equal(result.passed, false);
  assert.deepEqual(result.issues.map(({ code, className }) => ({ code, className })), [{
    code: 'class_forbidden',
    className: 'neue-klasse'
  }]);
});

test('differenzielle Legacy-Prüfung blockiert aktive Syntax unabhängig vom Altbestand', async () => {
  const result = await validateLegacyStaticOptimization({
    before,
    after: { ...before, contentHtml: '<section><script>alert(1)</script></section>' },
    validateArticle: async (article) => ({
      passed: false,
      sanitizedHtml: article.contentHtml,
      issues: []
    }),
    context: {}
  });

  assert.equal(result.passed, false);
  assert.equal(result.issues[0].code, 'legacy_active_content_forbidden');
});

test('differenzielle Legacy-Prüfung blockiert neu eingefügte Sanitizer-Verluste', async () => {
  const result = await validateLegacyStaticOptimization({
    before,
    after: {
      ...before,
      contentHtml: '<section class="alte-klasse"><p>Alter Inhalt.<input name="neu"></p></section>'
    },
    validateArticle: async (article) => ({
      passed: true,
      sanitizedHtml: article.contentHtml.replace(/<input[^>]*>/u, ''),
      issues: []
    }),
    context: {}
  });

  assert.equal(result.passed, false);
  assert.equal(result.issues[0].code, 'legacy_sanitizer_regression');
});

test('differenzielle Legacy-Prüfung toleriert ausschließlich bereits vorhandene Sanitizer-Altlasten', async () => {
  const legacyBefore = {
    ...before,
    contentHtml: '<section id="historisch" class="alte-klasse"><p>Alter Inhalt.</p></section>'
  };
  const result = await validateLegacyStaticOptimization({
    before: legacyBefore,
    after: {
      ...legacyBefore,
      contentHtml: legacyBefore.contentHtml.replace('Alter Inhalt', 'Gezielt optimierter Inhalt')
    },
    validateArticle: async (article) => ({
      passed: true,
      sanitizedHtml: article.contentHtml.replace(' id="historisch"', ''),
      issues: []
    }),
    context: {}
  });

  assert.equal(result.passed, true);
  assert.deepEqual(result.issues, []);
});
