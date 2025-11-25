import pool from '../util/db.js';
import { embedAsVector } from '../util/embeddings.js';


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

export async function retrieveFaqs(question, topK = 5) {
  const vec = await embedAsVector(question);

  const { rows } = await pool.query(
    `SELECT
        id,
        question,
        answer,
        embedding <=> $1::vector AS distance
       FROM faq_entries
      WHERE embedding IS NOT NULL
   ORDER BY embedding <=> $1::vector
      LIMIT $2`,
    [vec, topK]
  );
  return rows;
}
export async function getPublishedFaqs(db) {
  const { rows } = await db.query(
    `SELECT id, category_id, question, answer
     FROM faqs
     WHERE is_published = TRUE
     ORDER BY category_id, id`
  );
  return rows;
}