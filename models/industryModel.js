import pool from '../util/db.js';

export async function getIndustryBySlug(slug) {
  const { rows } = await pool.query(
    `SELECT * FROM industries WHERE slug = $1 LIMIT 1`,
    [slug.toLowerCase()]
  );
  return rows[0] || null;
}

export async function listIndustries() {
  const { rows } = await pool.query(`SELECT * FROM industries ORDER BY name`);
  return rows;
}
