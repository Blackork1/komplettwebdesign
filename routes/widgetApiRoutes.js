import express from 'express';
import * as Apt from '../models/appointmentModel.js';
import pool from '../util/db.js';

const router = express.Router();

/* Liefert die nächsten freien Slots als JSON */
router.get('/api/slots', async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 3;
  const slots = await Apt.getOpenSlots();          // gibt ALLE frei
  res.json(slots.slice(0, limit));                 // nur die ersten „limit“
});

/* Verfuegbarkeit eines Monats (oeffentlich, nur freie Slots in der Zukunft) */
router.get('/api/calendar', async (req, res) => {
  const month = String(req.query.month || '').trim(); // YYYY-MM
  const isValid = /^\d{4}-\d{2}$/.test(month);
  const now = new Date();
  const fallbackMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const base = isValid ? `${month}-01` : `${fallbackMonth}-01`;

  const { rows } = await pool.query(
    `
    SELECT
      TO_CHAR((start_time AT TIME ZONE 'Europe/Berlin')::date, 'YYYY-MM-DD') AS day,
      COUNT(*)::int AS free_count
      FROM appointments
     WHERE is_booked = FALSE
       AND start_time >= NOW()
       AND (start_time AT TIME ZONE 'Europe/Berlin')::date >= $1::date
       AND (start_time AT TIME ZONE 'Europe/Berlin')::date < ($1::date + INTERVAL '1 month')
     GROUP BY (start_time AT TIME ZONE 'Europe/Berlin')::date
     ORDER BY (start_time AT TIME ZONE 'Europe/Berlin')::date
    `,
    [base]
  );

  res.json({
    month: base.slice(0, 7),
    days: rows.map((r) => ({
      date: r.day,
      count: r.free_count
    }))
  });
});

/* Freie Zeiten fuer einen konkreten Tag (oeffentlich) */
router.get('/api/day-slots', async (req, res) => {
  const date = String(req.query.date || '').trim(); // YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'date required (YYYY-MM-DD)' });
  }

  const { rows } = await pool.query(
    `
    SELECT id, start_time, end_time
      FROM appointments
     WHERE is_booked = FALSE
       AND start_time >= NOW()
       AND (start_time AT TIME ZONE 'Europe/Berlin')::date = $1::date
     ORDER BY start_time
    `,
    [date]
  );

  return res.json(rows);
});

export default router;
