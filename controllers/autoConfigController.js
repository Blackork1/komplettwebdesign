// controllers/autoConfigController.js
import pool from '../util/db.js';
import { ensureAutoSlots } from '../services/autoAppointmentService.js';

function parseRanges(str) {
  // "16:00-17:00, 18:00-19:00" -> ["16:00-17:00","18:00-19:00"]
  return (str || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

export async function getForm(_req, res) {
  const { rows } = await pool.query('SELECT * FROM auto_config WHERE id=1');
  const cfg = rows[0];
  const weekdays = cfg?.weekdays || { "2":[], "4":[], "6":[], "0":[] };

  res.render('admin/auto_config_form', {
    title: 'Automatische Termine',
    cfg: {
      weeks_ahead: cfg?.weeks_ahead ?? 6,
      timezone:    cfg?.timezone || 'Europe/Berlin', // nur Info/ICS
      w2: (weekdays['2']||[]).join(', '),
      w4: (weekdays['4']||[]).join(', '),
      w6: (weekdays['6']||[]).join(', '),
      w0: (weekdays['0']||[]).join(', ')
    }
  });
}

export async function saveForm(req, res) {
  // einfache Bounds
  const weeks = Math.max(1, Math.min(12, parseInt(req.body.weeks_ahead, 10) || 6));
  const tz    = req.body.timezone || 'Europe/Berlin';

  const weekdays = {
    "2": parseRanges(req.body.w2),
    "4": parseRanges(req.body.w4),
    "6": parseRanges(req.body.w6),
    "0": parseRanges(req.body.w0)
  };

  await pool.query(`
    INSERT INTO auto_config (id, weeks_ahead, timezone, weekdays)
    VALUES (1, $1, $2, $3)
    ON CONFLICT (id) DO UPDATE
      SET weeks_ahead=$1, timezone=$2, weekdays=$3, updated_at=NOW()
  `, [weeks, tz, weekdays]);

  if (req.body.fill_now === '1') {
    await ensureAutoSlots();
    return res.redirect('/admin/appointments');
  }
  res.redirect('/admin/auto-config');
}

export async function runAutoGenerate(_req, res) {
  await ensureAutoSlots();
  res.redirect('/admin/appointments');
}
