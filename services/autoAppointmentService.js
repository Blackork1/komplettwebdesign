// services/autoAppointmentService.js
import pool from '../util/db.js';
import { DateTime } from 'luxon';
import { loadAutoConfig } from './autoConfigService.js';

/**
 * Erwartet:
 *  - day: Luxon DateTime in Ziel-TZ (Mitternacht des Ziel-Tages)
 *  - range: "HH:mm-HH:mm"
 * Liefert:
 *  - startStr / endStr: "yyyy-MM-dd HH:mm" (für INSERT ::timestamp)
 *  - endDT: Luxon DateTime (für Past-Skip)
 *  - startDT: optional falls du es später brauchst
 */
function buildDateStrings(day, range) {
  const [fromRaw = '', toRaw = ''] = range.split('-').map(s => s.trim());
  if (!fromRaw || !toRaw) {
    throw new Error(`Ungültiges Zeitfenster: "${range}"`);
  }
  const [fH, fM] = fromRaw.split(':').map(n => parseInt(n, 10));
  const [tH, tM] = toRaw.split(':').map(n => parseInt(n, 10));

  const startDT = day.set({ hour: fH, minute: fM, second: 0, millisecond: 0 });

  // Overnight? (z.B. 23:00–01:00)
  const startMin = fH * 60 + fM;
  const endMin   = tH * 60 + tM;
  const isOvernight = endMin <= startMin;

  const endDay = isOvernight ? day.plus({ days: 1 }) : day;
  const endDT  = endDay.set({ hour: tH, minute: tM, second: 0, millisecond: 0 });

  const fmt = dt => dt.toFormat('yyyy-LL-dd HH:mm');
  return {
    startStr: fmt(startDT),
    endStr:   fmt(endDT),
    startDT,
    endDT
  };
}

/**
 * Erzeugt fehlende automatische Termine bis 'weeks_ahead' Wochen im Voraus.
 * Arbeitet mit TIMESTAMP (ohne TZ) Strings in derselben Ziel-TZ (keine DST-Überraschungen).
 * Skipt Slots, deren Ende bereits in der Vergangenheit liegt.
 */
export async function ensureAutoSlots() {
  const cfg = await loadAutoConfig();
  const tz  = cfg.timezone;
  const weeksAhead = cfg.weeks_ahead ?? 6;
  const weekdays   = cfg.weekdays || {};

  // heute 00:00 in Ziel-TZ
  let base = DateTime.now().setZone(tz);
  if (!base.isValid) {
    console.warn(`⚠️ Ungültige Zeitzone "${tz}", fallback auf process.env.AUTO_SLOTS_TZ`);
    base = DateTime.now().setZone(process.env.AUTO_SLOTS_TZ || 'Europe/Berlin');
  }
  base = base.startOf('day');

  const nowZ = DateTime.now().setZone(base.zoneName);

  for (let d = 0; d < weeksAhead * 7; d++) {
    const day = base.plus({ days: d });

    // Unterstütze sowohl 0..6 (So..Sa) als auch 1..7 (Mo..So)
    const weekdayKey06 = String(day.weekday % 7);   // So=0, Mo=1, ..., Sa=6
    const weekdayKey17 = String(day.weekday);       // Mo=1 ... So=7
    const templates = weekdays[weekdayKey06] || weekdays[weekdayKey17] || [];
    if (!templates || !templates.length) continue;

    for (const tpl of templates) {
      let startStr, endStr, endDT;
      try {
        ({ startStr, endStr, endDT } = buildDateStrings(day, tpl));
      } catch (err) {
        console.error('AutoSlot-Template-Fehler:', tpl, err.message);
        continue;
      }

      // keine toten Slots erstellen
      if (endDT <= nowZ) continue;

      try {
        await pool.query(
          `INSERT INTO appointments (start_time, end_time, title, is_auto)
           VALUES ($1::timestamp, $2::timestamp, $3, TRUE)
           ON CONFLICT (start_time, end_time) DO NOTHING`,
          [startStr, endStr, 'Beratungstermin Komplett Webdesign']
        );
      } catch (e) {
        console.error('AutoSlot-Insert-Fehler:', e);
      }
    }
  }
}
