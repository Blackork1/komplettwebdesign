import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildTrustedInternalPaths,
  normalizeInternalHref
} from '../services/contentAgent/trustedInternalLinkService.js';

test('interne Linknormalisierung erkennt sichere Seitensprünge getrennt von URLs', () => {
  assert.deepEqual(normalizeInternalHref('#abschnitt-1'), {
    kind: 'fragment',
    href: '#abschnitt-1',
    fragment: 'abschnitt-1'
  });
  assert.equal(normalizeInternalHref('#').kind, 'unsafe');
  assert.equal(normalizeInternalHref('#abschnitt 1').kind, 'unsafe');
});

test('Brancheninventar verwendet denselben webdesign-Präfix wie die öffentliche Route', () => {
  const paths = buildTrustedInternalPaths([
    { type: 'industry', slug: 'blumenladen' },
    { type: 'industry', slug: 'webdesign-cafe' }
  ]);

  assert.equal(paths.includes('/branchen/webdesign-blumenladen'), true);
  assert.equal(paths.includes('/branchen/webdesign-cafe'), true);
  assert.equal(paths.includes('/branchen/blumenladen'), false);
});
