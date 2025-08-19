// util/date.js
import { DateTime } from 'luxon';

/**
 * ISO-8601 mit Offset, z. B. 2025-08-19T12:00:00+02:00
 * @param {Date|string|number} input  DB-Wert (TIMESTAMPTZ), Date, ISO-String etc.
 * @param {object} opts
 * @param {string} [opts.zone='Europe/Berlin']  Ziel-Zeitzone
 * @param {{hour:number,minute?:number,second?:number}} [opts.setTime]  Fixe Uhrzeit setzen
 */
export function isoOffset(input, { zone = 'Europe/Berlin', setTime } = {}) {
  let dt = DateTime.fromJSDate(new Date(input), { zone }).setZone(zone);
  if (setTime) {
    dt = dt.set({
      hour: setTime.hour, minute: setTime.minute ?? 0,
      second: setTime.second ?? 0, millisecond: 0
    });
  }
  return dt.toFormat("yyyy-LL-dd'T'HH:mm:ssZZ"); // => 2025-08-19T19:50:32+02:00
}

// Komforthelfer: exakt 12:00 setzen
export const isoAtNoon = (input, zone = 'Europe/Berlin') =>
  isoOffset(input, { zone, setTime: { hour: 12 } });