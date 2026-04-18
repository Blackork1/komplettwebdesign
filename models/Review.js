import pool from '../util/db.js';

export default class Review {
  static async fetchRandom() {
    const { rows } = await pool.query(
      `SELECT author,content,avatar_url FROM reviews
       WHERE approved=true ORDER BY RANDOM() LIMIT 1`
    );
    return rows[0] || null;
  }

  /**
   * Liefert bis zu `limit` approved Reviews, neueste zuerst.
   * Greift zurück auf RANDOM(), falls keine created_at-Spalte existiert.
   */
  static async fetchTop(limit = 3) {
    try {
      const { rows } = await pool.query(
        `SELECT author, content, avatar_url, rating, created_at
         FROM reviews
         WHERE approved = true
         ORDER BY COALESCE(created_at, NOW()) DESC
         LIMIT $1`,
        [limit]
      );
      return rows;
    } catch (err) {
      // Fallback, falls Spalten rating/created_at (noch) nicht existieren
      const { rows } = await pool.query(
        `SELECT author, content, avatar_url
         FROM reviews
         WHERE approved = true
         ORDER BY RANDOM()
         LIMIT $1`,
        [limit]
      );
      return rows;
    }
  }

  /**
   * Aggregat für Schema.org / AggregateRating.
   * Gibt null zurück, wenn weniger als MIN_REVIEWS existieren -
   * so werden keine Fake-Sterne ausgeliefert, die gegen Google-Richtlinien verstoßen.
   */
  static async fetchAggregate(minReviews = 3) {
    try {
      const { rows } = await pool.query(
        `SELECT COUNT(*)::int AS count,
                ROUND(AVG(NULLIF(rating, 0))::numeric, 1) AS avg
         FROM reviews
         WHERE approved = true AND rating IS NOT NULL AND rating > 0`
      );
      const row = rows[0];
      if (!row || !row.count || row.count < minReviews || !row.avg) return null;
      return { count: Number(row.count), avg: Number(row.avg) };
    } catch (err) {
      return null;
    }
  }
}