import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { z } from 'zod';

const require = createRequire(import.meta.url);
const requireFromExpress = createRequire(require.resolve('express/package.json'));
const proxyaddr = requireFromExpress('proxy-addr');

test('gemappte IPv6-Subnetze vertrauen keinen fremden IPv4-Adressen', () => {
  for (const subnet of ['::ffff:10.0.0.0/8', '::/1']) {
    assert.equal(proxyaddr.compile(subnet)('8.8.8.8'), false, subnet);
  }

  const trusted = proxyaddr.compile('10.0.0.0/8');
  assert.equal(trusted('10.2.3.4'), true);
  assert.equal(trusted('8.8.8.8'), false);
});

test('übergroße begrenzte Zod-Arrays erzeugen nur eine begrenzte Zahl von Fehlern', () => {
  const schema = z.array(z.number()).max(1);
  const result = schema.safeParse(Array(1_000).fill('ungültig'));

  assert.equal(result.success, false);
  assert.ok(result.error.issues.length <= 2);
  assert.deepEqual(schema.parse([42]), [42]);
  assert.equal(schema.safeParse(['ungültig']).success, false);
});
