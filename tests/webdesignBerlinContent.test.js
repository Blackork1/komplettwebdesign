import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const controller = readFileSync(new URL('../controllers/districtController.js', import.meta.url), 'utf8');

function extractBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);

  const end = source.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);

  return source.slice(start, end);
}

const germanCaseStudies = extractBetween(
  controller,
  'const caseStudies = [',
  '\n  const processSteps = ['
);

const englishCaseStudies = extractBetween(
  controller,
  'caseStudies.splice(0, caseStudies.length,',
  '\n    );\n\n    processSteps.splice'
);

const caseStudyProofText = `${germanCaseStudies}\n${englishCaseStudies}`;

test('webdesign berlin hub copy removes unsupported proof metrics', () => {
  assert.equal(caseStudyProofText.includes('+70 %'), false);
  assert.equal(caseStudyProofText.includes('+70%'), false);
  assert.equal(caseStudyProofText.includes('50% mehr'), false);
  assert.equal(caseStudyProofText.includes('50% more'), false);
  assert.equal(caseStudyProofText.includes('1,4 s Largest Contentful Paint'), false);
  assert.equal(caseStudyProofText.includes('1.4 s Largest Contentful Paint'), false);
  assert.equal(controller.includes('Ergebnisse aus Berlin - echte Zahlen'), false);
});

test('webdesign berlin case studies avoid unsupported numeric revenue traffic and ranking proof', () => {
  const unsupportedNumericProofPatterns = [
    /\b(?:Umsatz|revenue|traffic|Besucher|rankings?|Platzierungen?|Leads?|Anfragen?)\b.{0,80}(?:\+?\d+(?:[.,]\d+)?\s*%|\b\d+(?:[.,]\d+)?\s*(?:x|mal)\b|\bTop\s*10\b|#\s*\d+)/i,
    /(?:\+?\d+(?:[.,]\d+)?\s*%|\b\d+(?:[.,]\d+)?\s*(?:x|mal)\b|\bTop\s*10\b|#\s*\d+).{0,80}\b(?:Umsatz|revenue|traffic|Besucher|rankings?|Platzierungen?|Leads?|Anfragen?)\b/i,
    /\bTop\s*10\b/i
  ];

  for (const pattern of unsupportedNumericProofPatterns) {
    assert.doesNotMatch(caseStudyProofText, pattern);
  }
});

test('webdesign berlin hub copy uses sharper small-business intent and qualitative references', () => {
  assert.match(controller, /Webdesign Berlin für kleine Unternehmen/);
  assert.match(controller, /Preise und Pakete ansehen/);
  assert.match(controller, /\/referenzen\/zur-alten-backstube/);
  assert.match(controller, /\/referenzen\/tm-sauber-mehr/);
});
