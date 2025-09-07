import pool from '../util/db.js';
import { sendBookingMail } from '../services/mailService.js';

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
    SELECT b.*, a.start_time, a.end_time
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
  const { rows: aptRows } = await pool.query(
    'SELECT * FROM appointments WHERE id = $1',
    [booking.appointment_id]);
  await sendBookingMail({
    to: booking.email,
    name: booking.name,
    appointment: aptRows[0],
    type: 'confirmed',
    bookingId: booking.id
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

  /* Slot wieder freigeben */
  await pool.query(
    'UPDATE appointments SET is_booked = FALSE WHERE id = $1',
    [booking.appointment_id]);

  /* Kunde informieren */
  const { rows: aptRows } = await pool.query(
    'SELECT * FROM appointments WHERE id = $1',
    [booking.appointment_id]);
  await sendBookingMail({
    to: booking.email,
    name: booking.name,
    appointment: aptRows[0],
    type: 'cancelled'
  });

  res.redirect('/admin/bookings');
}

export async function getTest(req, res) {
  res.render('admin/test', {
    title: 'Testseite',
    description: 'Dies ist eine Testseite'
  });
}

