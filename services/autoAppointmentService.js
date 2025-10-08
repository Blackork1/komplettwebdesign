// services/autoAppointmentService.js
import pool from '../util/db.js';
import { addDays, startOfDay, format } from 'date-fns';

/** Konfiguration laden (Single-Row) */
async function loadConfig() {
  const { rows } = await pool.query('SELECT * FROM auto_config WHERE id=1');
  return rows[0];
}

/** "HH:mm-HH:mm" -> zwei Strings "YYYY-MM-DD HH:mm" (lokal) für SQL */
function buildDateStrings(day, range) {
  const [from, to] = range.split('-');
  const set = (d, hm) => {
    const [H, M] = hm.split(':').map(n => parseInt(n, 10));
    const x = new Date(d);
    x.setHours(H, M, 0, 0);
    return x;
  };
  const start = set(day, from);
  const end   = set(day, to);
  const f = (x) => format(x, 'yyyy-MM-dd HH:mm');
  return { startStr: f(start), endStr: f(end) };
}

/**
 * Erzeugt fehlende automatische Termine bis 'weeks_ahead' Wochen im Voraus.
 * - arbeitet rein mit TIMESTAMP (ohne TZ)
 * - ON CONFLICT (start_time,end_time) DO NOTHING → idempotent
 */
export async function ensureAutoSlots() {
  const cfg = await loadConfig();
  const weeksAhead = cfg?.weeks_ahead ?? 6;
  const weekdays   = cfg?.weekdays || {};
  const base = startOfDay(new Date()); // heute 00:00 (lokal)

  for (let d = 0; d < weeksAhead * 7; d++) {
    const day = addDays(base, d);
    const weekdayKey = day.getDay().toString(); // "0".."6"
    const templates = weekdays[weekdayKey];
    if (!templates || !templates.length) continue;

    for (const tpl of templates) {
      const { startStr, endStr } = buildDateStrings(day, tpl);

      try {
        await pool.query(
          `INSERT INTO appointments (start_time, end_time, title, is_auto)
           VALUES ($1::timestamp, $2::timestamp, $3, TRUE)
           ON CONFLICT (start_time, end_time) DO NOTHING`,
          [startStr, endStr, 'Beratung (auto)']
        );
      } catch (e) {
        console.error('AutoSlot-Insert-Fehler:', e);
      }
    }
  }
}
