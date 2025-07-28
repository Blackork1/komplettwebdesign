import pool from '../util/db.js';

export default class Review {
  static async fetchRandom() {
    const { rows } = await pool.query(
      `SELECT author,content,avatar_url FROM reviews
       WHERE approved=true ORDER BY RANDOM() LIMIT 1`
    );
    return rows[0] || null;
  }
}