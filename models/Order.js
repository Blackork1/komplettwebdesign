import pool from '../util/db.js';

export default class Order {
  static async create(packageId, sessionId, mode) {
    await pool.query(
      `INSERT INTO orders(package_id,stripe_session_id,mode,status)
       VALUES($1,$2,$3,$4)`,
      [packageId, sessionId, mode, 'open']
    );
  }

  static async markPaid(sessionId) {
    await pool.query(
      'UPDATE orders SET status=$1 WHERE stripe_session_id=$2',
      ['paid', sessionId]
    );
  }

  static async markActive(subscriptionId) {
    await pool.query(
      'UPDATE orders SET status=$1 WHERE stripe_session_id=$2',
      ['active', subscriptionId]
    );
  }
}