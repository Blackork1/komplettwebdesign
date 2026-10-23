import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../util/db.js';
import { renderFaqPage } from '../controllers/faqController.js';

test('unknown or malformed FAQ category reaches the real 404 handler', async () => {
  const query = pool.query;
  pool.query = async () => ({ rows: [{ id: 1, name: 'Allgemein' }] });
  try {
    for (const cat of ['999', '1oops', '0', ['1', '2']]) {
      let notFound = false;
      let rendered = false;
      const res = { locals: {}, status() { throw new Error('must not return 500'); }, render() { rendered = true; } };
      await renderFaqPage({ query: { cat } }, res, () => { notFound = true; });
      assert.equal(notFound, true, JSON.stringify(cat));
      assert.equal(rendered, false);
    }
  } finally { pool.query = query; }
});
