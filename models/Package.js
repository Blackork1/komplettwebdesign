import pool from '../util/db.js';

export default class Package {
  static async fetchAll() {
    const pkgRes = await pool.query(
      `SELECT id,name,price_amount_cents,description,detailshero,stripe_price_id_once,display, slug
       FROM packages ORDER BY id`
    );
    const featRes = await pool.query(
      `SELECT package_id,feature FROM package_features ORDER BY id`
    );
    const featMap = {};
    featRes.rows.forEach(({ package_id, feature }) => {
      featMap[package_id] = featMap[package_id] || [];
      featMap[package_id].push(feature);
    });

    return pkgRes.rows.map(pkg => ({
      ...pkg,
      price: (pkg.price_amount_cents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }),
      features: featMap[pkg.id] || [],
      priceId: pkg.stripe_price_id_once,
      display: pkg.display
    }));
  }

  static async findById(id) {
    const { rows } = await pool.query('SELECT * FROM packages WHERE id=$1', [id]);
    return rows[0];
  }
}