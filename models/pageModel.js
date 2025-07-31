// models/pageModel.js
import pool from '../util/db.js';
import { embedAsVector } from '../util/embeddings.js';

export async function retrievePages(question, topK = 5) {
  const vec = await embedAsVector(question);

  const { rows } = await pool.query(
    `SELECT id, title, slug
       FROM pages
   ORDER BY embedding <#> $1::vector
      LIMIT $2`,
    [vec, topK]
  );
  return rows;
}
