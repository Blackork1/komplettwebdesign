import pool from '../util/db.js';

export default class User {
  static async fetchAll() {
    const { rows } = await pool.query('SELECT * FROM users');
    return rows;
  }

  static async create(name) {
    await pool.query('INSERT INTO users(name) VALUES($1)', [name]);
  }

  static async delete(id) {
    await pool.query('DELETE FROM users WHERE id=$1', [id]);
  }
}