// services/autoAppointmentService.js
import pool from '../util/db.js';
import { DateTime } from 'luxon';
import { loadAutoConfig } from './autoConfigService.js';

/**
 * day: Luxon DateTime (Mitternacht in Ziel-TZ)
 * range: "HH:mm-HH:mm"
 */
function buildDateStrings(day, range) {
  const [fromRaw = '', toRaw = ''] = range.split('-').map(s => s.trim());
  if (!fromRaw || !toRaw) throw new Error(`Ungültiges Zeitfenster: "${range}"`);

  const [fH, fM] = fromRaw.split(':').map(n => parseInt(n, 10));
  const [tH, tM] = toRaw.split(':').map(n => parseInt(n, 10));

  const startDT = day.set({ hour: fH, minute: fM, second: 0, millisecond: 0 });

  // Overnight (z. B. 23:00–01:00)?
  const startMin = fH * 60 + fM;
  const endMin   = tH * 60 + tM;
  const isOvernight = endMin <= startMin;
  const endDay = isOvernight ? day.plus({ days: 1 }) : day;
  const endDT  = endDay.set({ hour: tH, minute: tM, second: 0, millisecond: 0 });

  const fmt = dt => dt.toFormat('yyyy-LL-dd HH:mm');
  const startStr = fmt(startDT);
  const endStr   = fmt(endDT);
  // optional: console.log('[autoSlot]', startStr, '→', endStr);

  return { startStr, endStr, startDT, endDT };
}

/**
 * Erzeugt fehlende Auto-Slots.
 * Skipt:
 *  - Slots, deren Ende bereits vorbei ist
 *  - Slots, deren Start in den nächsten `leadMinutes` liegt (Default 30)
 */
export async function ensureAutoSlots() {
  const cfg = await loadAutoConfig();
  const tz  = cfg.timezone;
  const weeksAhead = Number.isInteger(cfg.weeks_ahead) ? cfg.weeks_ahead : 6;
  const weekdays   = cfg.weekdays || {};
  const leadMinutes =
    Number.isInteger(cfg.lead_minutes)
      ? cfg.lead_minutes
      : parseInt(process.env.APPOINTMENT_CLEANUP_LEAD_MINUTES || '30', 10);

  // Heute 00:00 in Ziel-TZ
  let base = DateTime.now().setZone(tz);
  if (!base.isValid) base = DateTime.now().setZone(process.env.AUTO_SLOTS_TZ || 'Europe/Berlin');
  base = base.startOf('day');

  const nowZ   = DateTime.now().setZone(base.zoneName);
  const cutoff = nowZ.plus({ minutes: leadMinutes }); // muss zum Cleaner passen

  for (let d = 0; d < weeksAhead * 7; d++) {
    const day = base.plus({ days: d });

    // Unterstütze Keys "0..6" (So..Sa) und "1..7" (Mo..So)
    const key06 = String(day.weekday % 7); // So=0, Mo=1, ...
    const key17 = String(day.weekday);     // Mo=1, ... So=7
    const templates = weekdays[key06] || weekdays[key17] || [];
    if (!templates.length) continue;

    for (const tpl of templates) {
      let startStr, endStr, startDT, endDT;
      try {
        ({ startStr, endStr, startDT, endDT } = buildDateStrings(day, tpl));
      } catch (err) {
        console.error('AutoSlot-Template-Fehler:', tpl, err.message);
        continue;
      }

      // ⛔ nichts erzeugen, wenn es eh "zu spät" ist
      if (endDT   <= nowZ)   continue; // komplett Vergangenheit
      if (startDT <= cutoff) continue; // startet innerhalb der Lösch-Vorlaufzeit

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
