import pool from '../util/db.js';
import { embedAsVector } from '../util/embeddings.js';

export async function retrievePages(question, topK = 5) {
  const vec = await embedAsVector(question);

  const { rows } = await pool.query(
    `SELECT
        id,
        title,
        slug,
        description,
        embedding <=> $1::vector AS distance
       FROM pages
      WHERE embedding IS NOT NULL
   ORDER BY embedding <=> $1::vector
      LIMIT $2`,
    [vec, topK]
  );
  return rows;
}