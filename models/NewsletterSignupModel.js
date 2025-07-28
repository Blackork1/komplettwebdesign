// models/NewsletterSignupModel.js
/* eslint-disable camelcase */
import pool from '../util/db.js';              // dein pg-Pool (ES-Export)
import { v4 as uuidv4 } from 'uuid';

class NewsletterSignupModel {
  /** Neue Anmeldung anlegen (oder re-aktivieren) */
  static async create(email) {
    const token = uuidv4();                   // Fallback, falls DB-Default nicht greift
    const query = `
      INSERT INTO newsletter_signups (email, active, unsubscribe_token)
      VALUES ($1, true, $2)
      ON CONFLICT (email)
        DO UPDATE SET active = true
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [email, token]);
    return rows[0];
  }

  /** Abmelden (active → false) via Token */
  static async deactivate(token) {
    const { rowCount } = await pool.query(
      `UPDATE newsletter_signups
         SET active = false
       WHERE unsubscribe_token = $1;`,
      [token]
    );
    return rowCount === 1;
  }

  /** Datensatz zu einem Token abrufen (optional) */
  static async findByToken(token) {
    const { rows } = await pool.query(
      `SELECT * FROM newsletter_signups
       WHERE unsubscribe_token = $1
       LIMIT 1;`,
      [token]
    );
    return rows[0] ?? null;
  }
}

export default NewsletterSignupModel;
