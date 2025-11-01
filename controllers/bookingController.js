// controllers/bookingController.js
import { body, validationResult } from 'express-validator';
import axios from 'axios';
import * as Apt from '../models/appointmentModel.js';
import * as Book from '../models/bookingModel.js';
import { sendBookingMail, sendAdminBookingInfo } from '../services/mailService.js';
import pool from '../util/db.js';
import { verifyToken } from '../util/bookingToken.js';

// Schwelle für reCAPTCHA v3; optional per ENV übersteuerbar
const RECAPTCHA_MIN_SCORE = Number(process.env.RECAPTCHA_MIN_SCORE || 0.5);
const RECAPTCHA_ACTION     = 'booking_submit';

export const validate = [
  body('slotId').isInt().toInt(),
  body('name').trim().isLength({ min: 2 }).withMessage('Name muss länger als 2 Zeichen sein'),
  body('email').isEmail().normalizeEmail().withMessage('Ungültige E-Mail-Adresse'),
  body('note').optional().isLength({ max: 2000 }).withMessage('Notiz zu lang'),
  // v3-Token heisst jetzt g-recaptcha-response
  body('g-recaptcha-response').isString().notEmpty().withMessage('reCAPTCHA fehlt'),
];

export async function listSlots(_req, res) {
  const slots = await Apt.getOpenSlots();
  res.render('booking', {
    title: 'Termin buchen',
    slots,
    description: 'Wählen Sie einen Termin für Ihre Buchung aus.',
  });
}

export async function createBooking(req, res) {
  /* 1) Google reCAPTCHA v3 validieren */
  try {
    const token  = req.body['g-recaptcha-response']; // <-- neuer Feldname
    const secret = process.env.RECAPTCHA_SECRET;      // v3-Secret (kein Enterprise-Key)

    // Google erwartet x-www-form-urlencoded
    const params = new URLSearchParams({
      secret,
      response: token,
      remoteip: req.ip ?? '', // nicht zwingend, hilft aber manchmal
    });

    const { data } = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      params.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    // Pflicht: success + Mindestscore + passende action prüfen
    if (!data?.success) throw new Error('reCAPTCHA: success=false');
    if (typeof data.score === 'number' && data.score < RECAPTCHA_MIN_SCORE) {
      throw new Error(`reCAPTCHA: score ${data.score} < ${RECAPTCHA_MIN_SCORE}`);
    }
    if (data.action && data.action !== RECAPTCHA_ACTION) {
      throw new Error(`reCAPTCHA: action mismatch "${data.action}" != "${RECAPTCHA_ACTION}"`);
    }
  } catch (err) {
    console.error('reCAPTCHA-Validierung fehlgeschlagen:', err?.message || err);
    return res.status(400).send('reCAPTCHA-Validierung fehlgeschlagen. Bitte erneut versuchen.');
  }

  /* 2) Eingaben validieren */
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const msg = 'Ungültige Eingaben: ' + errors.array().map(e => e.msg).join(', ');
    return res.status(422).send(msg);
  }

  /* 3) Slot sperren + Buchung anlegen
   *    Hinweis: lockSlot sollte DB-seitig mit Unique-Constraint/Doppelbuchung abgesichert sein.
   */
  const slot = await Apt.lockSlot(req.body.slotId);
  if (!slot) {
    return res.render('booking/slot_taken', {
      title: 'Termin vergeben',
      description: 'Leider war jemand schneller. Bitte wählen Sie einen anderen Termin.',
    });
  }

  try {
    const booking = await Book.create(
      req.body.slotId,
      req.body.name,
      req.body.email,
      req.body.note || null
    );

    /* 4) Buchungsbestätigung per E-Mail senden */
    await sendBookingMail({
      to: booking.email,
      name: booking.name,
      appointment: slot,
      type: 'pending',
    });
    await sendAdminBookingInfo({ booking, appointment: slot, type: 'new' });

    /* 5) Danke-Seite */
    return res.render('booking/thankyou', {
      title: 'Danke für Ihre Buchung',
      booking,
      apt: slot,
      description: 'Danke für Ihre Buchung. Wir haben Ihnen eine Bestätigung per E-Mail gesendet.',
    });
  } catch (err) {
    // Bei Fehler Slot wieder freigeben
    console.error('❌ Fehler beim Buchen:', err);
    await Apt.unlockSlot(req.body.slotId);
    return res.render('booking/slot_taken');
  }
}

/* --------- Cancel / Reschedule per Token --------- */

async function handleUserCancellation(req, res, action) {
  const { id, token } = req.params;
  if (!verifyToken(id, token)) return res.status(403).send('Ungültiger Link');

  const { rows } = await pool.query(
    `UPDATE bookings SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id]
  );
  if (!rows.length) return res.status(404).send('Buchung nicht gefunden');

  const booking = rows[0];

  // Slot wieder freigeben
  await pool.query('UPDATE appointments SET is_booked = FALSE WHERE id = $1', [
    booking.appointment_id,
  ]);

  const { rows: aptRows } = await pool.query(
    'SELECT * FROM appointments WHERE id = $1',
    [booking.appointment_id]
  );
  const apt = aptRows[0];

  await sendBookingMail({
    to: booking.email,
    name: booking.name,
    appointment: apt,
    type: 'cancelled',
  });

  // FIX: hier war "slot" statt "apt"
  await sendAdminBookingInfo({
    booking,
    appointment: apt,
    type: action === 'reschedule' ? 'reschedule' : 'cancel',
  });

  return res.render(
    action === 'reschedule' ? 'booking/reschedule' : 'booking/cancelled',
    {
      title: action === 'reschedule' ? 'Termin verschoben' : 'Termin storniert',
      description:
        action === 'reschedule'
          ? 'Ihr Termin wurde verschoben. Wir haben die Verwaltung informiert.'
          : 'Ihr Termin wurde storniert. Wir haben die Verwaltung informiert.',
    }
  );
}

export async function cancelByToken(req, res) {
  return handleUserCancellation(req, res, 'cancel');
}

export async function rescheduleByToken(req, res) {
  return handleUserCancellation(req, res, 'reschedule');
}
