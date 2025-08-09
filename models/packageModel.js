// models/packageModel.js
export async function getAllPackages(db) {
  const { rows } = await db.query(`
    SELECT
      id,
      name,
      description,
      image,
      price_amount_cents              AS amount_cents,
      COALESCE(currency, $1)          AS currency,
      stripe_price_id_once,
      stripe_price_id_recurring
    FROM packages
    ORDER BY id ASC
  `, [process.env.CURRENCY || 'eur']);
  return rows;
}

export async function getPackageById(db, id) {
  const { rows } = await db.query(`
    SELECT
      id,
      name,
      description,
      image,
      price_amount_cents              AS amount_cents,
      COALESCE(currency, $1)          AS currency,
      stripe_price_id_once,
      stripe_price_id_recurring
    FROM packages
    WHERE id = $2
  `, [process.env.CURRENCY || 'eur', id]);
  return rows[0] || null;
}
