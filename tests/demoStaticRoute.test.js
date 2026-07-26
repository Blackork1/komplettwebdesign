import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const indexSource = readFileSync(new URL('../index.js', import.meta.url), 'utf8');

test('Container-Query-Demo ist auch ohne abschließenden Slash direkt erreichbar', () => {
  const directRouteIndex = indexSource.indexOf("app.get('/demo/cq-compare'");
  const staticMiddlewareIndex = indexSource.indexOf('app.use(express.static(publicDir');

  assert.notEqual(directRouteIndex, -1);
  assert.notEqual(staticMiddlewareIndex, -1);
  assert.ok(directRouteIndex < staticMiddlewareIndex);
  assert.match(indexSource, /path\.join\(publicDir, 'demo', 'cq-compare', 'index\.html'\)/);
  assert.match(indexSource, /res\.status\(200\)\.type\('html'\)\.send\(html\)/);
});
