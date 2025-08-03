/* =======================================================================
   controllers/contactController.js   –   Kontakt-/Buchungs-Hybrid
   • ReCAPTCHA v3
   • Slot sperren + Buchung anlegen (idempotent)
   • Bilder → Cloudinary
   • Contact-Request speichern
   • Bestätigungs-Mails (+ ICS)
   ======================================================================= */

import fs from "fs/promises";
import axios from "axios";
import multer from "multer";
import { body, validationResult } from "express-validator";
import * as Apt from "../models/appointmentModel.js";
import * as Book from "../models/bookingModel.js";
import * as CReq from "../models/contactRequestModel.js";
// import { sendBookingMail } from "../services/mailService.js";
import nodemailer from "nodemailer";
import { generateICS } from "../services/icsService.js";
import { format } from "date-fns";

const upload = multer({ dest: "uploads/" });

/* ---------- GET /kontakt --------------------------------------------- */
export async function showForm(req, res) {
    const freieTermine = await Apt.getOpenSlots();
    res.render("kontakt", {
        title: "Kontakt",
        description: "Kontaktformular für KomplettWebdesign",
        freieTermine,
        sitekey: process.env.RECAPTCHA_SITEKEY
    });
}

/* ---------- Validierung ---------------------------------------------- */
export const validate = [
    body("slotId").optional().isInt().toInt(),
    body("token").notEmpty(),
    body("paket").notEmpty(),
    body("umfang").notEmpty(),
    body("name").isLength({ min: 2 }),
    body("email").isEmail()
];

/* ---------- POST /kontakt -------------------------------------------- */
export const processForm = [
    upload.array("images"),
    validate,
    async (req, res) => {

        /* 0) reCAPTCHA v3 -------------------------------------------------- */
        try {
            const { token } = req.body;
            const resp = await axios.post(
                "https://www.google.com/recaptcha/api/siteverify",
                null,
                { params: { secret: process.env.RECAPTCHA_SECRET, response: token } }
            );
            if (!resp.data.success) throw new Error("reCaptcha failed");
        } catch {
            return res.status(400).send("reCaptcha-Validierung fehlgeschlagen");
        }

        /* 1) Express-Validator -------------------------------------------- */
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res
                .status(422)
                .send("Ungültige Eingaben: " + errors.array().map(e => e.msg).join(", "));
        }

        const cloud = req.app.get("cloudinary");
        const slotId = req.body.slotId ? Number(req.body.slotId) : null;
        let slot = null;
        let booking = null;

        try {
            /* 2) Slot sperren + Buchung anlegen ------------------------------ */
            if (slotId) {
                slot = await Apt.lockSlot(slotId);               // is_booked = TRUE
                if (!slot) return res.render("booking/slot_taken", { title: "Termin vergeben", description: "Leider war jemand schneller. Bitte wählen Sie einen anderen Termin." } );

                booking = await Book.create(
                    slotId,
                    req.body.name,
                    req.body.email,
                    req.body.note || null
                );
            }

            /* 3) Bilder (optional) hochladen -------------------------------- */
            const imageUrls = [];
            for (const f of req.files ?? []) {
                const up = await cloud.uploader.upload(f.path, {
                    folder: "kontaktformulare",
                    resource_type: "image"
                });
                imageUrls.push(up.secure_url);
                await fs.unlink(f.path).catch(() => { });
            }

            /* 4) Contact-Request speichern ---------------------------------- */
            await CReq.create({
                paket: req.body.paket,
                umfang: req.body.umfang,
                texterstellung: req.body.texterstellung,
                bilderstellung: req.body.bilderstellung,
                features: Array.isArray(req.body.inhalte)
                    ? req.body.inhalte.join(", ")
                    : (req.body.inhalte || ""),
                featuresOther: req.body.weitereWuensche || "",
                bookingId: booking ? booking.id : null,
                name: req.body.name,
                email: req.body.email,
                phone: req.body.telefon,
                company: req.body.firma || "",
                additionalInfo: req.body.sonstigeInfos || "",
                images: imageUrls.join(";"),
                appointmentTime: slot ? slot.start_time : null

            });

            /* 5) Bestätigungs-Mails ----------------------------------------- */
            const formattedAppointment = slot
                ? `${format(new Date(slot.start_time), 'dd.MM.yyyy HH:mm')}-${format(new Date(slot.end_time), 'HH:mm')} Uhr`
                : null;

            const summaryHtml = `
                <p>Hallo <strong>${req.body.name}</strong>,</p>
                <p>vielen Dank für deine Anfrage über unser Kontaktformular. Wir haben die folgenden Angaben erhalten:</p>
                <table>
                    <tr><th>Paket:</th><td>${req.body.paket}</td></tr>
                    <tr><th>Seitenumfang:</th><td>${req.body.umfang}</td></tr>
                    <tr><th>Texte:</th><td>${req.body.texterstellung === 'erstellt' ? 'Texterstellung benötigt' : 'Eigene Texte vorhanden'}</td></tr>
                    <tr><th>Bilder:</th><td>${req.body.bilderstellung === 'erstellt' ? 'Bildrecherche/-erstellung benötigt' : 'Eigene Bilder vorhanden'}</td></tr>
                    <tr><th>Funktionen:</th><td>${Array.isArray(req.body.inhalte) ? req.body.inhalte.join(', ') : (req.body.inhalte || 'Keine')}</td></tr>
                    <tr><th>Weitere Wünsche:</th><td>${req.body.weitereWuensche || 'Keine'}</td></tr>
                    ${formattedAppointment ? `<tr><th>Termin:</th><td>${formattedAppointment}</td></tr>` : ''}
                    <tr><th>Name:</th><td>${req.body.name}</td></tr>
                    <tr><th>E-Mail:</th><td>${req.body.email}</td></tr>
                    <tr><th>Telefon:</th><td>${req.body.telefon}</td></tr>
                    <tr><th>Firma:</th><td>${req.body.firma || 'Keine'}</td></tr>
                    <tr><th>Sonstige Infos:</th><td>${req.body.sonstigeInfos || 'Keine'}</td></tr>
                </table>
                <p>Wir werden uns in Kürze bei dir melden, um die Details zu besprechen.</p>
                <p>Mit freundlichen Grüßen<br>Dein KomplettWebdesign-Team</p>
            `;

            const attachments = [];
            if (slot) {
                attachments.push({
                    filename: 'Beratungstermin.ics',
                    content: generateICS(slot, 'pending'),
                    contentType: 'text/calendar; charset=utf-8; method=REQUEST'
                });
            }

            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: Number(process.env.SMTP_PORT) || 587,
                secure: Number(process.env.SMTP_PORT) === 465,
                auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            });

            await transporter.sendMail({
                from: '"KomplettWebdesign" <kontakt@komplettwebdesign.de>',
                to: req.body.email,
                subject: 'Bestätigung deiner Kontaktanfrage',
                html: summaryHtml,
                attachments
            });
            await transporter.sendMail({
                from: '"KomplettWebdesign" <kontakt@komplettwebdesign.de>',
                to: 'kontakt@komplettwebdesign.de',
                subject: `Neue Kontaktanfrage von ${req.body.name}`,
                html: summaryHtml,
                attachments
            });

            /* 6) Erfolg ------------------------------------------------------ */

            return res.render('kontakt/thankyou', {
                title: 'Danke für deine Anfrage',
                description: 'Bestätigung deiner Kontaktanfrage',
                data: req.body,
                appointment: slot,
                formattedAppointment,
            });
        } catch (err) {
            console.error("❌ Fehler beim Kontakt-Workflow:", err);

            /* Rollback: Slot & Buchung freigeben ----------------------------- */
            if (slot) await Apt.unlockSlot(slot.id);
            if (booking) await Book.remove(booking.id);

            return res
                .status(500)
                .send("Es ist ein Fehler aufgetreten – bitte erneut versuchen.");
        }
    }
];

/* ---------- GET /kontakt/ics/:id ------------------------------------ */
export async function downloadIcs(req, res) {
    const aptId = Number(req.params.id);
    const apt = await Apt.getById(aptId);
    if (!apt) return res.status(404).send('Termin nicht gefunden');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=Beratungstermin.ics');
    res.send(generateICS(apt, 'pending'));
}