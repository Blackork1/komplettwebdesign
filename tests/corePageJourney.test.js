import test from 'node:test';
import assert from 'node:assert/strict';

import { SEO_RECOVERY_TARGETS } from '../data/seoIntentRegistry.js';

const targetsByPath = new Map(
  SEO_RECOVERY_TARGETS
    .filter((entry) => entry.state === 'active')
    .map((entry) => [entry.path, entry])
);

function assertJourney(paths) {
  for (let index = 0; index < paths.length - 1; index += 1) {
    const currentPath = paths[index];
    const nextPath = paths[index + 1];
    const current = targetsByPath.get(currentPath);
    assert.ok(current, `${currentPath} fehlt in der aktiven Registry`);

    const possibleTargets = [
      ...current.requiredLinks,
      current.primaryAction?.href,
      current.supportingAction?.href
    ].filter(Boolean);

    assert.ok(
      possibleTargets.includes(nextPath),
      `${currentPath} führt nicht nachvollziehbar zu ${nextPath}`
    );
  }
}

test('die wichtigsten Besucherwege sind vollständig verbunden', () => {
  assertJourney(['/', '/webdesign-berlin', '/pakete', '/kontakt']);
  assertJourney(['/', '/leistungen', '/leistungen/website-relaunch', '/referenzen/tm-sauber-mehr']);
  assertJourney(['/website-tester', '/leistungen/website-audit', '/kontakt']);
  assertJourney(['/branchen/webdesign-blumenladen', '/blog/seo-fuer-blumenladen', '/leistungen/local-seo']);
});
