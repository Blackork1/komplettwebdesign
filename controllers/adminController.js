import pool from '../util/db.js';
import { sendBookingMail } from '../services/mailService.js';
import { startOfMonth, addMonths, format } from 'date-fns';
import { findLocaleMarker, normalizeLocale } from '../util/bookingLocale.js';

async function resolveBookingLocale(booking) {
  if (booking?.booking_locale) return normalizeLocale(booking.booking_locale);

  const localeFromNote = findLocaleMarker(booking?.note);
  if (localeFromNote) return localeFromNote;

  const { rows } = await pool.query(
    `SELECT additional_info
       FROM contact_requests
      WHERE booking_id = $1
      ORDER BY id DESC
      LIMIT 1`,
    [booking.id]
  );
  const localeFromContactRequest = findLocaleMarker(rows[0]?.additional_info);
  return localeFromContactRequest || 'de';
}



export async function adminHome(_req, res) {
  const { rows: pending } = await pool.query(`
    SELECT b.*, a.start_time, a.end_time
      FROM bookings b
      JOIN appointments a ON a.id = b.appointment_id
     WHERE b.status = 'pending'
     ORDER BY a.start_time`);

  const { rows: confirmed } = await pool.query(`
    SELECT b.*, a.start_time, a.end_time
      FROM bookings b
      JOIN appointments a ON a.id = b.appointment_id
     WHERE b.status = 'confirmed'
     ORDER BY a.start_time`);

  res.render('admin/dashboard', {
    title: 'Admin-Startseite',
    pending,
    confirmed
  });
}

/* ------------------------------------------------------------------ */
/*  Kalenderseite rendern                                             */
/* ------------------------------------------------------------------ */
export async function calendarPage(_req, res) {
  res.render('admin/appointments_calendar', { title: 'Termine' });
}

/** JSON: Verfügbarkeit eines Monats (Tage mit freien Slots) */
export async function monthAvailability(req, res) {
  // month=YYYY-MM (z.B. "2025-07")
  const today = new Date();
  const [y, m] = (req.query.month || format(today, 'yyyy-MM')).split('-').map(n => parseInt(n, 10));
  const monthStart = startOfMonth(new Date(y, m - 1, 1));
  const nextStart  = addMonths(monthStart, 1);

  const { rows } = await pool.query(
    `
    SELECT DATE(start_time) AS day, COUNT(*)::int AS free_count
      FROM appointments
     WHERE is_booked = FALSE
       AND start_time >= $1::timestamp
       AND start_time <  $2::timestamp
     GROUP BY DATE(start_time)
     ORDER BY DATE(start_time)
    `,
    [format(monthStart, 'yyyy-MM-01 00:00'), format(nextStart, 'yyyy-MM-01 00:00')]
  );

  res.json({
    month: format(monthStart, 'yyyy-MM'),
    days: rows.map(r => ({ date: format(new Date(r.day), 'yyyy-MM-dd'), count: r.free_count }))
  });
}

/** JSON: freie Slots eines Tages */
export async function daySlotsJSON(req, res) {
  const d = req.query.date; // "YYYY-MM-DD"
  if (!d) return res.status(400).json({ error: 'date required (YYYY-MM-DD)' });

  const { rows } = await pool.query(
    `
    SELECT id, start_time, end_time
      FROM appointments
     WHERE is_booked = FALSE
       AND DATE(start_time) = $1::date
     ORDER BY start_time
    `,
    [d]
  );

  res.json(rows);
}


/* ------------------------------------------------------------------ */
/*  Termine (appointments)                                            */
/* ------------------------------------------------------------------ */
export async function listAppointments(_req, res) {
  const { rows } = await pool.query(
    'SELECT * FROM appointments ORDER BY start_time');
  res.render('admin/appointments_list', {
    title: 'Termine',
    apts: rows
  });
}

export async function newAppointmentForm(_req, res) {
  res.render('admin/appointment_form', {
    title: 'Neuer Termin'
  });
}

export async function createAppointment(req, res) {
  const { start, end, title } = req.body;
  await pool.query(
    `INSERT INTO appointments (start_time, end_time, title)
     VALUES ($1,$2,$3)`,
    [start, end, title]
  );
  res.redirect('/admin/appointments');
}

export async function deleteAppointment(req, res) {
  const { id } = req.params;

  // Zu diesem Termin gehörende Kontaktanfragen entfernen
  await pool.query(
    `DELETE FROM contact_requests
          WHERE booking_id IN (
            SELECT id FROM bookings WHERE appointment_id = $1
          )`,
    [id]
  );

  // Eventuelle Buchungen löschen
  await pool.query(
    'DELETE FROM bookings WHERE appointment_id = $1',
    [id]
  );

  // Termin löschen
  await pool.query(
    'DELETE FROM appointments WHERE id = $1',
    [id]);
  res.redirect('/admin/appointments');
}

/* ------------------------------------------------------------------ */
/*  Buchungen (bookings)                                              */
/* ------------------------------------------------------------------ */
export async function listBookings(_req, res) {
  const { rows } = await pool.query(`
    SELECT b.*, a.start_time, a.end_time, a.title AS appointment_title
      FROM bookings b
      JOIN appointments a ON a.id = b.appointment_id
    ORDER BY a.start_time`);
  res.render('admin/bookings_list', {
    title: 'Buchungen',
    bookings: rows
  });
}

export async function confirmBooking(req, res) {
  const { id } = req.params;

  /* Status auf confirmed setzen */
  const { rows } = await pool.query(
    `UPDATE bookings
       SET status = 'confirmed'
     WHERE id = $1
     RETURNING *`, [id]);
  if (!rows.length) return res.redirect('/admin/bookings');

  /* Kunde informieren */
  const booking = rows[0];
  const locale = await resolveBookingLocale(booking);
  const { rows: aptRows } = await pool.query(
    'SELECT * FROM appointments WHERE id = $1',
    [booking.appointment_id]);
  await sendBookingMail({
    to: booking.email,
    name: booking.name,
    appointment: aptRows[0],
    type: 'confirmed',
    bookingId: booking.id,
    locale
  });

  res.redirect('/admin/bookings');
}

export async function cancelBooking(req, res) {
  const { id } = req.params;

  /* Buchung stornieren */
  const { rows } = await pool.query(
    `UPDATE bookings
       SET status = 'cancelled'
     WHERE id = $1
     RETURNING *`, [id]);
  if (!rows.length) return res.redirect('/admin/bookings');

  const booking = rows[0];
  const locale = await resolveBookingLocale(booking);

  /* Kunde informieren */
  const { rows: aptRows } = await pool.query(
    'SELECT * FROM appointments WHERE id = $1',
    [booking.appointment_id]);
  const appointment = aptRows[0];

  /* Slot wieder freigeben (außer Placeholder "Ohne Termin") */
  if (appointment?.title !== 'Ohne Termin') {
    await pool.query(
      'UPDATE appointments SET is_booked = FALSE WHERE id = $1',
      [booking.appointment_id]);
  }

  await sendBookingMail({
    to: booking.email,
    name: booking.name,
    appointment,
    type: 'cancelled',
    locale
  });

  res.redirect('/admin/bookings');
}

export async function getTest(req, res) {
  res.render('admin/test', {
    title: 'Testseite',
    description: 'Dies ist eine Testseite'
  });
}
