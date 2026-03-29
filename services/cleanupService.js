// services/cleanupService.js
import pool from '../util/db.js';
import { resolveTimezone } from './autoConfigService.js';
import { deleteExpiredPendingWebsiteTesterLeads } from '../models/websiteTesterAdminModel.js';

/**
 * Löscht ALLE Termine (auto + manuell), die 30 Min vor Start
 * keine aktive Buchung haben.
 * "Aktiv" = bookings.status IN ('pending','confirmed').
 *
 * Vergleich erfolgt in Lokalzeit:
 *  - appointments.start_time: TIMESTAMP (ohne TZ)
 *  - (NOW() AT TIME ZONE $tz): TIMESTAMP (ohne TZ) in derselben TZ
 */
export async function deleteExpiredUnbooked() {
  const tz = await resolveTimezone();

  const { rowCount } = await pool.query(
    `
    WITH doomed AS (
      SELECT a.id
      FROM appointments a
      WHERE a.start_time <= (NOW() AT TIME ZONE $1) + INTERVAL '30 minutes'
        AND NOT EXISTS (
          SELECT 1
          FROM bookings b
          WHERE b.appointment_id = a.id
            AND b.status IN ('pending','confirmed')
        )
    )
    DELETE FROM appointments a
    USING doomed d
    WHERE a.id = d.id
    `,
    [tz]
  );

  if (rowCount) {
    console.log(`🧹 Cleanup: ${rowCount} Termine entfernt (≤30 Min vor Start, ohne aktive Buchung)`);
  }
}

export async function deleteExpiredWebsiteTesterPendingLeads(days = 14) {
  const removed = await deleteExpiredPendingWebsiteTesterLeads(days);
  if (removed) {
    console.log(`🧹 Cleanup: ${removed} abgelaufene Website-Tester-Leads entfernt`);
  }
}
