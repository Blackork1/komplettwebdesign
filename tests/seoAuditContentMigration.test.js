import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fixSeoAuditContent } from '../scripts/fixSeoAuditContent.js';

function fixtureDb(post, { failUpdate = false } = {}) {
  const calls = [];
  return { calls, async connect() { return {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.startsWith('SELECT')) return { rows: [post] };
      if (sql.startsWith('UPDATE')) return { rowCount: failUpdate ? 0 : 1 };
      return { rows: [] };
    }, release() {}
  }; } };
}
const post = { id: 5, slug: 'full-service-webdesign-in-berlin', published: true, content: '<p>499 € +49 1525 4350378</p>' };

test('content correction dry run performs no updates and rolls back', async () => {
  const db = fixtureDb(post);
  const result = await fixSeoAuditContent(db);
  assert.equal(result.applied, false);
  assert.equal(result.changed, 1);
  assert.equal(db.calls.some(call => call.sql.startsWith('UPDATE')), false);
  assert.equal(db.calls.at(-1).sql, 'ROLLBACK');
});

test('applying content correction saves the original public row and commits only changed fields', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'seo-backup-test-'));
  try {
    const db = fixtureDb(post);
    const result = await fixSeoAuditContent(db, { apply: true, backupDirectory: directory });
    const backup = JSON.parse(await readFile(result.backupPath, 'utf8'));
    assert.deepEqual(backup.posts, [post]);
    const updates = db.calls.filter(call => call.sql.startsWith('UPDATE'));
    assert.equal(updates.length, 1);
    assert.match(updates[0].sql, /^UPDATE posts SET meta_description = \$1, content = \$2, updated_at = CURRENT_TIMESTAMP WHERE id = \$3$/);
    assert.match(updates[0].params[1], /package:start.priceLabel/);
    assert.equal(updates[0].params[2], 5);
    assert.equal(db.calls.at(-1).sql, 'COMMIT');
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('unexpected database update count rolls back instead of reporting a partial repair', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'seo-backup-test-'));
  try {
    const db = fixtureDb(post, { failUpdate: true });
    await assert.rejects(fixSeoAuditContent(db, { apply: true, backupDirectory: directory }), /Unerwartete Anzahl/);
    assert.equal(db.calls.at(-1).sql, 'ROLLBACK');
    assert.equal(db.calls.some(call => call.sql === 'COMMIT'), false);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
