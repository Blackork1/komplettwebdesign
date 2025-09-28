import fs from 'fs/promises';
import pool from '../util/db.js';

async function upsertIndustry(obj) {
  const keys = Object.keys(obj);
  const cols = keys.map(k => `"${k}"`).join(',');
  const vals = keys.map((_,i) => `$${i+1}`).join(',');
  const updates = keys.filter(k => k!=='slug').map((k,i) => `"${k}" = $${i+1}`).join(', ');

  const sql = `
    INSERT INTO industries (${cols}) VALUES (${vals})
    ON CONFLICT (slug) DO UPDATE SET ${updates}
    RETURNING id, slug;
  `;
  const { rows } = await pool.query(sql, keys.map(k => obj[k]));
  return rows[0];
}

const file = process.argv[2]; // e.g. node scripts/seed_industry.js data/industries.cafe.json
if (!file) { console.error('JSON-Datei fehlt'); process.exit(1); }

const raw = await fs.readFile(file,'utf8');
const data = JSON.parse(raw);
const row = await upsertIndustry(data);
console.log('Upserted industry:', row);
process.exit(0);
