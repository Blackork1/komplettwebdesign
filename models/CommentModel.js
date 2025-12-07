import pool from '../util/db.js';

export default class CommentModel {
  static tableEnsured = false;

  static async ensureTable() {
    if (this.tableEnsured) return;
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blog_comments (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        author_name TEXT NOT NULL,
        content TEXT NOT NULL,
        likes INTEGER NOT NULL DEFAULT 0,
        dislikes INTEGER NOT NULL DEFAULT 0,
        ip_hash TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    this.tableEnsured = true;
  }

  static async create({ postId, authorName, content, ipHash = null }) {
    await this.ensureTable();
    const { rows } = await pool.query(
      `INSERT INTO blog_comments (post_id, author_name, content, ip_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [postId, authorName, content, ipHash]
    );
    return rows[0];
  }

  static async listByPost(postId) {
    await this.ensureTable();
    const { rows } = await pool.query(
      `SELECT * FROM blog_comments
       WHERE post_id = $1
       ORDER BY created_at DESC`,
      [postId]
    );
    return rows;
  }

  static async findById(id) {
    await this.ensureTable();
    const { rows } = await pool.query(
      `SELECT * FROM blog_comments WHERE id = $1 LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  }

  static async applyReaction(id, previousReaction, nextReaction) {
    await this.ensureTable();

    let likeDelta = 0;
    let dislikeDelta = 0;

    if (previousReaction === nextReaction) {
      // nothing to change
    } else {
      if (previousReaction === 'like') likeDelta -= 1;
      if (previousReaction === 'dislike') dislikeDelta -= 1;

      if (nextReaction === 'like') likeDelta += 1;
      if (nextReaction === 'dislike') dislikeDelta += 1;
    }

    const { rows } = await pool.query(
      `UPDATE blog_comments
         SET likes = GREATEST(likes + $1, 0),
             dislikes = GREATEST(dislikes + $2, 0)
       WHERE id = $3
       RETURNING *`,
      [likeDelta, dislikeDelta, id]
    );

    return rows[0] || null;
  }
}