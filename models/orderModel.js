// models/orderModel.js
export async function createOrder(db, {
  stripe_session_id, package_id, amount_total, currency, user_email, status, payment_intent, mode
}) {
  await db.query(`
    INSERT INTO orders (stripe_session_id, package_id, amount_total, currency, user_email, status, stripe_payment_intent, mode)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    ON CONFLICT (stripe_session_id) DO NOTHING
  `, [stripe_session_id, package_id, amount_total, currency, user_email, status, payment_intent || null, mode || null]);
}

export async function updateOrderStatusBySession(db, stripe_session_id, status, fields = {}) {
  const { payment_intent, amount_total, currency, user_email, mode } = fields;
  await db.query(`
    UPDATE orders
       SET status = COALESCE($2, status),
           stripe_payment_intent = COALESCE($3, stripe_payment_intent),
           amount_total = COALESCE($4, amount_total),
           currency = COALESCE($5, currency),
           user_email = COALESCE($6, user_email),
           mode = COALESCE($7, mode)
     WHERE stripe_session_id = $1
  `, [stripe_session_id, status || null, payment_intent || null, amount_total || null, currency || null, user_email || null, mode || null]);
}
