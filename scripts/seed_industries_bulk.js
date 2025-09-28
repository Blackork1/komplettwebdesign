import fs from 'fs/promises';
import path from 'path';
import pool from '../util/db.js';

async function upsert(ind) {
  const keys = Object.keys(ind);
  const cols = keys.map(k => `"${k}"`).join(',');
  const vals = keys.map((_,i) => `$${i+1}`).join(',');
  const updates = keys.filter(k => k!=='slug').map((k,i) => `"${k}" = EXCLUDED."${k}"`).join(', ');

  const sql = `
    INSERT INTO industries (${cols}) VALUES (${vals})
    ON CONFLICT (slug) DO UPDATE SET ${updates}
    RETURNING id, slug, name;
  `;
  const { rows } = await pool.query(sql, keys.map(k => ind[k]));
  return rows[0];
}

async function run(file) {
  const raw = await fs.readFile(file, 'utf8');
  const data = JSON.parse(raw); // entweder Array oder Objekt
  const list = Array.isArray(data) ? data : [data];
  for (const obj of list) {
    obj.slug = String(obj.slug).toLowerCase();
    const row = await upsert(obj);
    console.log('Upserted:', row.slug, '-', row.name);
  }
  process.exit(0);
}

const file = process.argv[2] || path.join(process.cwd(), 'data', 'industries.bulk.json');
run(file).catch(e => { console.error(e); process.exit(1); });
