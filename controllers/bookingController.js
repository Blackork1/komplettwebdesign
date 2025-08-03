import { body, validationResult } from 'express-validator';
import axios from 'axios';
import * as Apt from '../models/appointmentModel.js';
import * as Book from '../models/bookingModel.js';
import { sendBookingMail, sendAdminBookingInfo } from '../services/mailService.js';
import pool from '../util/db.js';
import { verifyToken } from '../util/bookingToken.js';
import { de } from 'date-fns/locale';

export const validate = [
    body("slotId").isInt().toInt(),
    body("name").trim().isLength({ min: 2 }).withMessage("Name muss länger als 2 Zeichen sein"),
    body("email").isEmail().normalizeEmail(),
    body("note").optional().isLength({ max: 2000 })
];

export async function listSlots(_req, res) {
    const slots = await Apt.getOpenSlots();
    res.render('booking', { title: "Termin buchen", slots, description: "Wählen Sie einen Termin für Ihre Buchung aus." });
}

export async function createBooking(req, res) {
    /* 1) Google reCaptcha validieren */
    try {
        const { token } = req.body;
        const response = await axios.post(`https://www.google.com/recaptcha/api/siteverify`, null, {
            params: { secret: process.env.RECAPTCHA_SECRET, response: token }
        });
        if (!response.data.success) { throw new Error("reCaptcha-Validierung fehlgeschlagen"); }
    } catch {
        return res.status(400).send("reCaptcha-Validierung fehlgeschlagen");
    }

    /* 2) Eingaben validieren */
    const errors = validationResult(req);
    if (!errors.isEmpty()) { return res.status(422).send("Ungeültige Eingaben: " + errors.array().map(e => e.msg).join(", ")); }

    /* 3) Slot sperren + Buchung anlegen (transaktion nicht nötig, weil lockSlot -> Unique-Constraint auf bookins verhindert Doppelbuchung)*/
    const slot = await Apt.lockSlot(req.body.slotId);
    if (!slot) return res.render('booking/slot_taken', { title: "Termin vergeben", description: "Leider war jemand schneller. Bitte wählen Sie einen anderen Termin." });

    try {
        const booking = await Book.create(req.body.slotId, req.body.name, req.body.email, req.body.note || null);

        /* 4) Buchungsbestätigung per E-Mail senden */
        await sendBookingMail({
            to: booking.email, name: booking.name,
            appointment: slot, type: "pending"
        });
        await sendAdminBookingInfo({ booking, appointment: slot, type: 'new' });

        /* 5) Weiterleitung zur Danke-Seite */
        res.render('booking/thankyou', { title: "Danke für Ihre Buchung", booking, apt: slot, description: "Danke für Ihre Buchung. Wir haben Ihnen eine Bestätigung per E-Mail gesendet." });
    } catch (err) {
        /*Wenn beim Einfügen ein UNIQUE-Fehler auftritt, dann Slot wieder freigeben*/
        console.error('❌ Fehler beim Buchen:', err);   //  <<<<<<<<<<<<<<
        await Apt.unlockSlot(req.body.slotId);
        res.render('booking/slot_taken');
    }
}

async function handleUserCancellation(req, res, action) {
    const { id, token } = req.params;
    if (!verifyToken(id, token)) return res.status(403).send('Ungültiger Link');

    const { rows } = await pool.query(
        `UPDATE bookings SET status = 'cancelled' WHERE id = $1 RETURNING *`,
        [id]
    );
    if (!rows.length) return res.status(404).send('Buchung nicht gefunden');

    const booking = rows[0];
    await pool.query(
        'UPDATE appointments SET is_booked = FALSE WHERE id = $1',
        [booking.appointment_id]
    );

    const { rows: aptRows } = await pool.query(
        'SELECT * FROM appointments WHERE id = $1',
        [booking.appointment_id]
    );
    const apt = aptRows[0];

    await sendBookingMail({ to: booking.email, name: booking.name, appointment: apt, type: 'cancelled' });
    await sendAdminBookingInfo({ booking, appointment: slot, type: action === 'reschedule' ? 'reschedule' : 'cancel' });

    res.render(action === 'reschedule' ? 'booking/reschedule' : 'booking/cancelled', { title: 'Termin storniert', description: 'Ihr Termin wurde storniert. Wir haben die Verwaltung informiert.' });
}

export async function cancelByToken(req, res) {
    return handleUserCancellation(req, res, 'cancel');
}

export async function rescheduleByToken(req, res) {
    return handleUserCancellation(req, res, 'reschedule');
}
