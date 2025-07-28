// models/bookingModel.js
import pool from "../util/db.js";

/* aktive Buchung zu einem Termin holen – ohne cancelled_at */
export async function findByAppointment(aptId) {
  const { rows } = await pool.query(
    `SELECT *
       FROM bookings
      WHERE appointment_id = $1
      LIMIT 1`,
    [aptId]
  );
  return rows[0] ?? null;
}

/* idempotentes Anlegen */
export async function create(aptId, name, email, note = null) {
  const existing = await findByAppointment(aptId);
  if (existing) return existing;

  try {
    const { rows } = await pool.query(
      `INSERT INTO bookings
         (appointment_id, name, email, note)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [aptId, name, email, note]
    );
    return rows[0];

  } catch (err) {
    if (err.code === "23505")         // UNIQUE-Verstoß
      return await findByAppointment(aptId);
    throw err;
  }
}

/* Buchung komplett löschen (Rollback) */
export async function remove(id) {
  await pool.query(`DELETE FROM bookings WHERE id = $1`, [id]);
}
