import { body, validationResult } from 'express-validator';
import axios from 'axios';
import * as Apt from '../models/appointmentModel.js';
import * as Book from '../models/bookingModel.js';
import { sendBookingMail } from '../services/mailService.js';

export const validate = [
    body("slotId").isInt().toInt(),
    body("name").trim().isLength({ min: 2 }).withMessage("Name muss länger als 2 Zeichen sein"),
    body("email").isEmail().normalizeEmail(),
    body("note").optional().isLength({ max: 2000 }) 
];

export async function listSlots(_req, res) {
    const slots = await Apt.getOpenSlots();
    res.render('booking', { title: "Termin buchen", slots });
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
    if (!slot) return res.render('booking/slot_taken');

    try {
        const booking = await Book.create(req.body.slotId, req.body.name, req.body.email, req.body.note || null);

        /* 4) Buchungsbestätigung per E-Mail senden */
        await sendBookingMail({
            to: booking.email, name: booking.name,
            appointment: slot, type: "pending"
        });
        await sendBookingMail({
            to: 'kontakt@komplettwebdesign.de', name: 'Admin',
            appointment: slot, type: "pending"
        });

        /* 5) Weiterleitung zur Danke-Seite */
        res.render('booking/thankyou', { title: "Danke für Ihre Buchung", booking, apt: slot });
    } catch (err) {
        /*Wenn beim Einfügen ein UNIQUE-Fehler auftritt, dann Slot wieder freigeben*/
        console.error('❌ Fehler beim Buchen:', err);   //  <<<<<<<<<<<<<<
        await Apt.unlockSlot(req.body.slotId);
        res.render('booking/slot_taken');
    }
};