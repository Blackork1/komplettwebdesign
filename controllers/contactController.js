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
import { sendBookingMail, sendRequestMail } from "../services/mailService.js";
import nodemailer from "nodemailer";

const upload = multer({ dest: "uploads/" });

/* ---------- GET /kontakt --------------------------------------------- */
export async function showForm(req, res) {
    const freieTermine = await Apt.getOpenSlots();
    res.render("kontakt", {
        title: "Kontakt",
        description: "Kontaktformular für Komplettwebdesign",
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
                if (!slot) return res.render("booking/slot_taken");

                booking = await Book.create(
                    slotId,
                    req.body.name,
                    req.body.email
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
            if (slot) {
                await sendBookingMail({
                    to: req.body.email,
                    name: req.body.name,
                    appointment: slot,
                    type: "pending"
                });
                await sendBookingMail({
                    to: "kontakt@komplettwebdesign.de",
                    name: "Admin",
                    appointment: slot,
                    type: "pending"
                });

            } else {
                const transporter = nodemailer.createTransport({
                    host: process.env.SMTP_HOST,
                    port: Number(process.env.SMTP_PORT) || 587,
                    secure: Number(process.env.SMTP_PORT) === 465,
                    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
                });
                await transporter.sendMail({
                    from: '"Komplettwebdesign" <no-reply@komplettwebdesign.de>',
                    to: req.body.email,
                    subject: "Bestätigung deiner Kontaktanfrage",
                    text: `Hallo ${req.body.name},
                            vielen Dank für deine Anfrage! Wir melden uns in Kürze bei dir,
                            um einen passenden Beratungstermin zu vereinbaren.
                            Liebe Grüße
                            Dein Komplettwebdesign-Team`,
                    html: `<p>Hallo <strong>${req.body.name}</strong>,</p>
                            <p>vielen Dank für deine Anfrage! Wir melden uns in Kürze bei dir, um einen passenden Beratungstermin zu vereinbaren.</p>
                            <p>Liebe Grüße<br><strong>Dein Komplettwebdesign-Team</strong></p>`
                });
                await sendRequestMail({
                    to: "kontakt@komplettwebdesign.de",
                    name: "Admin",
                    type: "pending"
                });
            }

            /* 6) Erfolg ------------------------------------------------------ */
            return res.redirect("/kontakt?erfolg=1");

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
