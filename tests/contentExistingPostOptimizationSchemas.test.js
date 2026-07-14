import test from 'node:test';
import assert from 'node:assert/strict';
import { zodTextFormat } from 'openai/helpers/zod';

import { ExistingPostOptimizationOutputSchema } from '../services/contentAgent/existingPostOptimizationSchemas.js';
import { assertOpenAISchemaCompatibility } from '../services/contentAgent/openaiContentService.js';
import {
  MAX_SAFE_HTTPS_URL_LENGTH,
  normalizeSafeHttpsUrl
} from '../services/contentAgent/httpsUrlSafety.js';

function validOptimizationOutput() {
  return {
    title: 'Website-Relaunch sicher planen',
    shortDescription: 'Die wichtigsten Schritte für einen sicheren Relaunch.',
    metaTitle: 'Website-Relaunch sicher planen',
    metaDescription: 'Plane deinen Website-Relaunch ohne unnötige SEO-Verluste.',
    ogTitle: 'Website-Relaunch sicher planen',
    ogDescription: 'Ablauf, SEO und Freigabe verständlich erklärt.',
    contentHtml: '<section><h2>Relaunch planen</h2><p>Prüfe Inhalte und Weiterleitungen.</p></section>',
    faqJson: Array.from({ length: 5 }, (_, index) => ({
      question: `Frage ${index + 1}?`,
      answer: `Antwort ${index + 1}.`
    })),
    imageAlt: 'Planungsschritte für einen Website-Relaunch',
    changeReasons: [{
      field: 'metaTitle',
      auditCodes: ['missing_meta_title'],
      reason: 'Der Meta Title wird konkretisiert.',
      sourceUrls: []
    }]
  };
}

test('Optimierungsschema akzeptiert ausschließlich freigegebene Artikelfelder', () => {
  const valid = validOptimizationOutput();
  assert.equal(ExistingPostOptimizationOutputSchema.safeParse(valid).success, true);

  for (const lockedField of [
    'slug',
    'imageUrl',
    'contentFormat',
    'status',
    'publishedAt',
    'scheduledPublishAt'
  ]) {
    assert.equal(
      ExistingPostOptimizationOutputSchema.safeParse({ ...valid, [lockedField]: 'gesperrt' }).success,
      false,
      lockedField
    );
  }
});

test('Optimierungsschema begrenzt FAQ auf fünf bis sieben Einträge', () => {
  const valid = validOptimizationOutput();
  assert.equal(ExistingPostOptimizationOutputSchema.safeParse({
    ...valid,
    faqJson: valid.faqJson.slice(0, 4)
  }).success, false);
  assert.equal(ExistingPostOptimizationOutputSchema.safeParse({
    ...valid,
    faqJson: [...valid.faqJson, valid.faqJson[0], valid.faqJson[0]]
  }).success, true);
  assert.equal(ExistingPostOptimizationOutputSchema.safeParse({
    ...valid,
    faqJson: [...valid.faqJson, valid.faqJson[0], valid.faqJson[0], valid.faqJson[0]]
  }).success, false);
});

test('Änderungsgründe erlauben nur Optimierungsfelder und begrenzte Auditcodes', () => {
  const valid = validOptimizationOutput();
  const reason = valid.changeReasons[0];

  assert.equal(ExistingPostOptimizationOutputSchema.safeParse({
    ...valid,
    changeReasons: [{ ...reason, field: 'slug' }]
  }).success, false);
  assert.equal(ExistingPostOptimizationOutputSchema.safeParse({
    ...valid,
    changeReasons: [{ ...reason, auditCodes: ['ungültiger code'] }]
  }).success, false);
  assert.equal(ExistingPostOptimizationOutputSchema.safeParse({
    ...valid,
    changeReasons: [{ ...reason, auditCodes: Array.from({ length: 13 }, (_, index) => `code_${index}`) }]
  }).success, false);
  assert.equal(ExistingPostOptimizationOutputSchema.safeParse({
    ...valid,
    changeReasons: [{ ...reason, sourceUrls: ['keine-url'] }]
  }).success, false);
});

test('Quellenverweise akzeptieren nur begrenzte absolute HTTPS-URLs', () => {
  const valid = validOptimizationOutput();
  const reason = valid.changeReasons[0];

  assert.equal(ExistingPostOptimizationOutputSchema.safeParse({
    ...valid,
    changeReasons: [{
      ...reason,
      sourceUrls: ['https://example.com/fachbeitrag?version=2#abschnitt']
    }]
  }).success, true);

  for (const invalidUrl of [
    'http://example.com/fachbeitrag',
    '/interner-pfad',
    'https://',
    'https://nutzer:passwort@example.com/fachbeitrag',
    'https://-example.com/fachbeitrag',
    'https://example.com/pfad mit leerzeichen',
    `https://example.com/${'a'.repeat(2_100)}`
  ]) {
    assert.equal(ExistingPostOptimizationOutputSchema.safeParse({
      ...valid,
      changeReasons: [{ ...reason, sourceUrls: [invalidUrl] }]
    }).success, false, invalidUrl);
  }
});

test('Optimierungsschema besteht den OpenAI-Preflight ohne URI-Format', () => {
  const format = zodTextFormat(
    ExistingPostOptimizationOutputSchema,
    'existing_post_targeted_optimization'
  );

  assert.equal(assertOpenAISchemaCompatibility(format.schema), true);
  assert.doesNotMatch(JSON.stringify(format.schema), /"format":"uri"/);
});

test('gemeinsamer HTTPS-Normalisierer begrenzt, prüft und kanonisiert Quellen-URLs', () => {
  assert.equal(MAX_SAFE_HTTPS_URL_LENGTH, 2_048);
  assert.equal(
    normalizeSafeHttpsUrl(' https://example.com/fachbeitrag#abschnitt ', {
      allowSurroundingWhitespace: true,
      stripHash: true
    }),
    'https://example.com/fachbeitrag'
  );
  for (const invalidUrl of [
    'http://example.com/fachbeitrag',
    'https://nutzer:passwort@example.com/fachbeitrag',
    'https://-example.com/fachbeitrag',
    'https://example-.com/fachbeitrag',
    `https://example.com/${'ä'.repeat(700)}`,
    `https://example.com/${'x'.repeat(MAX_SAFE_HTTPS_URL_LENGTH)}`
  ]) {
    assert.equal(normalizeSafeHttpsUrl(invalidUrl), null, invalidUrl);
  }
});

test('Optimierungsschema kanonisiert gültige sourceUrls mit dem gemeinsamen Normalisierer', () => {
  const valid = validOptimizationOutput();
  const parsed = ExistingPostOptimizationOutputSchema.parse({
    ...valid,
    changeReasons: [{
      ...valid.changeReasons[0],
      sourceUrls: ['https://EXAMPLE.com:443/fachbeitrag#abschnitt']
    }]
  });

  assert.deepEqual(parsed.changeReasons[0].sourceUrls, [
    'https://example.com/fachbeitrag#abschnitt'
  ]);
});
