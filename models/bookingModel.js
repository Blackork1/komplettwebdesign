// models/bookingModel.js
import pool from "../util/db.js";
import { normalizeLocale } from "../util/bookingLocale.js";

let localeColumnEnsured = false;

async function ensureBookingLocaleColumn() {
  if (localeColumnEnsured) return;

  const { rows } = await pool.query(
    `SELECT 1
       FROM information_schema.columns
      WHERE table_name = 'bookings'
        AND column_name = 'booking_locale'
      LIMIT 1`
  );

  if (!rows.length) {
    await pool.query(
      `ALTER TABLE bookings
         ADD COLUMN booking_locale VARCHAR(2) NOT NULL DEFAULT 'de'`
    );
  }

  await pool.query(
    `UPDATE bookings
        SET booking_locale = 'de'
      WHERE booking_locale IS NULL
         OR booking_locale NOT IN ('de', 'en')`
  );

  localeColumnEnsured = true;
}

/* aktive Buchung zu einem Termin holen – ohne cancelled_at */
export async function findByAppointment(aptId) {
  await ensureBookingLocaleColumn();
  const { rows } = await pool.query(
    `SELECT *
       FROM bookings
      WHERE appointment_id = $1
      AND status <> 'cancelled'
      LIMIT 1`,
    [aptId]
  );
  return rows[0] ?? null;
}

/* idempotentes Anlegen */
export async function create(aptId, name, email, note = null, locale = "de") {
  await ensureBookingLocaleColumn();
  const bookingLocale = normalizeLocale(locale);
  const existing = await findByAppointment(aptId);
  if (existing) {
    if (existing.booking_locale !== bookingLocale) {
      const { rows } = await pool.query(
        `UPDATE bookings
            SET booking_locale = $1
          WHERE id = $2
        RETURNING *`,
        [bookingLocale, existing.id]
      );
      return rows[0] ?? existing;
    }
    return existing;
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO bookings
         (appointment_id, name, email, note, booking_locale)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [aptId, name, email, note, bookingLocale]
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
