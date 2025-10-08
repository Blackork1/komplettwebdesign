import pool from '../util/db.js';

/**
 * Löscht alle Termine, die inzwischen begonnen haben,
 * NIE gebucht wurden (is_booked = FALSE) und auch keine aktive Buchung haben.
 * Läuft z.B. alle 5 Minuten.
 *
 * Achtung: start_time ist TIMESTAMP (ohne TZ).
 * NOW() AT TIME ZONE 'Europe/Berlin' liefert ebenfalls TIMESTAMP
 * in Berlin-Lokalzeit → fairer Vergleich.
 */
export async function deleteExpiredUnbooked() {
  const tz = process.env.AUTO_SLOTS_TZ || 'Europe/Berlin';

  const { rowCount } = await pool.query(
    `
    DELETE FROM appointments a
     WHERE a.is_booked = FALSE
       AND a.start_time <= (NOW() AT TIME ZONE $1)
       AND NOT EXISTS (
             SELECT 1
               FROM bookings b
              WHERE b.appointment_id = a.id
                AND COALESCE(b.status, 'pending') <> 'cancelled'
           )
    `,
    [tz]
  );

  if (rowCount) {
    console.log(`🧹 Cleanup: ${rowCount} abgelaufene freie Termine entfernt`);
  }
}
