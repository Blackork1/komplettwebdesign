import nodemailer from "nodemailer";
import { generateICS } from "./icsService.js";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { enUS } from "date-fns/locale";
import { generateToken } from "../util/bookingToken.js";
import { normalizeLocale } from "../util/bookingLocale.js";


const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

export async function sendBookingMail({ to, name, appointment, type, bookingId = null, locale = "de" }) {
    const isEn = normalizeLocale(locale) === "en";
    const isWithoutAppointment = !appointment || appointment.title === "Ohne Termin";

    if (isWithoutAppointment) {
        const subject = isEn
            ? {
                pending: "We received your request - Webdesign Berlin",
                confirmed: "Confirmation of your request - Webdesign Berlin",
                cancelled: "Update regarding your request - Webdesign Berlin"
            }[type]
            : {
                pending: "Ihre Anfrage ist eingegangen - Webdesign Berlin",
                confirmed: "Bestätigung Ihrer Anfrage - Webdesign Berlin",
                cancelled: "Aktualisierung zu Ihrer Anfrage - Webdesign Berlin"
            }[type];

        const html = isEn
            ? `
      <p>Hello ${name}</p>
      <p>Thank you for your interest. I would first like to confirm your request.</p>
      <p>Please let me know when you are available for a non-binding conversation. We can also meet at your location, and then discuss everything else together.</p>
      <p>Best regards<br>Komplett Webdesign</p>
      `
            : `
      <p>Hallo ${name}</p>
      <p>Vielen Dank für Ihr Interesse. Hiermit bestätige ich zunächst Ihre Anfrage.</p>
      <p>Teilen Sie mir kurz mit, wann sie für ein unverbindliches Gespräche zur Verfügung stehen würden, gerne auch bei Ihnen vor Ort und dann besprechen wir alles weitere zusammen.</p>
      <p>Beste Grüße<br>Komplett Webdesign</p>
      `;

        return transporter.sendMail({
            from: '"Komplett Webdesign" <kontakt@komplettwebdesign.de>',
            to,
            subject,
            html
        });
    }

    /* Datum hübsch formatiert (z.B. "Mo., 15.07.2025 um 14:00 Uhr") */
    const pretty = isEn
        ? format(new Date(appointment.start_time), "EEEE, dd.MM.yyyy 'at' HH:mm", { locale: enUS })
        : format(new Date(appointment.start_time), "EEEE, dd.MM.yyyy 'um' HH:mm 'Uhr'", { locale: de });

    /*Betreff je nach Status */
    const subject = isEn
        ? {
            pending: `Appointment request received for ${pretty}`,
            confirmed: `Appointment confirmed: ${pretty}`,
            cancelled: `Appointment cancelled: ${pretty}`
        }[type]
        : {
            pending: `Terminanfrage für ${pretty} ist eingegangen`,
            confirmed: `Termin bestätigt: ${pretty}`,
            cancelled: `Termin abgesagt: ${pretty}`
        }[type];

    /* Optionale Aktionslinks */
    let actionHtml = "";
    if (type === "confirmed" && bookingId) {
        const token = generateToken(bookingId);
        const base = process.env.BASE_URL || "";
        const cancelUrl = `${base}/booking/${bookingId}/cancel/${token}`;
        const rescheduleUrl = `${base}/booking/${bookingId}/reschedule/${token}`;
        actionHtml = isEn
            ? `<p><a href="${cancelUrl}">Cancel appointment</a> or <a href="${rescheduleUrl}">request a new appointment</a></p>`
            : `<p><a href="${cancelUrl}">Termin stornieren</a> oder <a href="${rescheduleUrl}">neuen Termin anfragen</a></p>`;
    }


    /*Mail Body*/
    const html = isEn
        ? `
    <p>Hello ${name}</p>
    <p>${type === "pending"
            ? `Thank you for your appointment request. We will review it and get back to you within 24 hours.`
            : type === "confirmed"
                ? `Your appointment has been confirmed. I look forward to speaking with you. I will call you at the scheduled time.`
                : `Unfortunately, we had to cancel this appointment. Please book a new time on our website.`
        }</p>
    <p><strong>Appointment:</strong> ${pretty}</p>
    ${actionHtml}
    <p>Best regards<br>Komplett Webdesign</p>
    `
        : `
    <p>Hallo ${name}</p>
    <p>${type === "pending"
            ? `vielen Dank für Ihre Terminanfrage. Wir prüfen den Termin und melden uns in spätestens 24 Stunden zurück.`
            : type === "confirmed"
                ? `Der Termin wurde bestätigt. Ich freue mich auf unser Gespräch! Ich werde mich zum Termin telefonisch melden.`
                : `Leider mussten wir den Termin stornieren. Bitte buchen Sie einen neuen Termin über unsere Website.`
        }</p>
    <p><strong>Termin:</strong> ${pretty}</p>
    ${actionHtml}
    <p>Beste Grüße<br>Komplett Webdesign</p>
    `;

    /* Mail Objekt zusammenstellen */
    const mail = {
        from: '"Komplett Webdesign" <kontakt@komplettwebdesign.de>',
        to,
        subject,
        html,
        attachments: []
    };

    /* ICS-Anhang hinzufügen */
    if (type !== "cancelled") {
        mail.attachments.push({
            filename: `Beratungstermin.ics`,
            content: generateICS(appointment, type),
            contentType: 'text/calendar; charset=utf-8; method=REQUEST'
        });
    }

    /* Mail senden - Fehler werden im aufrufenden Controller gefangen */
    return transporter.sendMail(mail)
}
export async function sendRequestMail({ to, name }) {
    const subject = 'Deine Anfrage ist eingegangen';
    const html = `
        <p>Hallo ${name}</p>
        <p>vielen Dank für die Anfrage. Wir melden uns in Kürze bei dir.</p>
        <p>Beste Grüße<br>Komplett Webdesign</p>
    `;
    const mail = {
        from: '"Komplett Webdesign" <kontakt@komplettwebdesign.de>',
        to,
        subject,
        html
    };
    return transporter.sendMail(mail);
}


export async function sendAdminBookingInfo({ booking, appointment, type }) {
    const pretty = format(new Date(appointment.start_time), "EEEE, dd.MM.yyyy 'um' HH:mm 'Uhr'", { locale: de });
    const subject = {
        new: `Neue Buchung: ${pretty}`,
        cancel: `Buchung storniert: ${pretty}`,
        reschedule: `Neuer Termin gewünscht: ${pretty}`
    }[type];

    const message = {
        new: "Neue Buchung eingegangen.",
        cancel: "Kunde hat den Termin storniert.",
        reschedule: "Kunde wünscht einen neuen Termin und der Termin wurde storniert."
    }[type];

    const html = `
        <p>${message}</p>
        <p><strong>Name:</strong> ${booking.name}<br>
        <strong>E-Mail:</strong> ${booking.email}</p>
        <p><strong>Termin:</strong> ${pretty}</p>
    `;

    const mail = {
        from: '"Komplett Webdesign" <kontakt@komplettwebdesign.de>',
        to: 'kontakt@komplettwebdesign.de',
        subject,
        html
    };
    return transporter.sendMail(mail);
}
