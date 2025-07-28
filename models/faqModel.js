import pool from '../util/db.js';

export async function getAllCategories() {
  const { rows } = await pool.query(`
    SELECT id, name
      FROM faq_categories
     ORDER BY id
  `);
  return rows;
}

export async function getFaqsByCategory(categoryId) {
  const { rows } = await pool.query(`
    SELECT id, question, answer
      FROM faq_entries
     WHERE category_id = $1
     ORDER BY id
  `, [categoryId]);
  return rows;
}

export async function getCategoryById(id) {
  const { rows } = await pool.query(`
    SELECT id, name
      FROM faq_categories
     WHERE id = $1
  `, [id]);
  return rows[0];
}
