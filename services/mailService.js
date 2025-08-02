import nodemailer from "nodemailer";
import { generateICS } from "./icsService.js";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { generateToken } from "../util/bookingToken.js";


const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

export async function sendBookingMail({ to, name, appointment, type, bookingId = null }) {
    /* Datum hübsch formatiert (z.B. "Mo., 15.07.2025 um 14:00 Uhr") */
    const pretty = format(new Date(appointment.start_time), "EEEE, dd.MM.yyyy 'um' HH:mm 'Uhr'", { locale: de });

    /*Betreff je nach Status */
    const subject = {
        pending: `Terminbestätigung für ${pretty} ist eingegangen`,
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
        actionHtml = `<p><a href="${cancelUrl}">Termin stornieren</a> oder <a href="${rescheduleUrl}">neuen Termin anfragen</a></p>`;
    }


    /*Mail Body*/
    const html = `
    <p>Hallo ${name}</p>
    <p>${type === "pending"
            ? `vielen Dank für Ihre Terminanfrage. Wir prüfen den Termin und melden uns in spätestens 24 Stunden bei Ihnen zurück.`
            : type === "confirmed"
                ? `Ihr Termin wurde bestätigt. Wir freuen uns auf das Gespräch!`
                : `Leider mussten wir den Termin stornieren. Bitte buchen Sie einen neuen Termin über unsere Website.`
        }</p>
    <p><strong>Termin:</strong> ${pretty}</p>
    ${actionHtml}
    <p>Beste Grüße<br>Komplettwebdesign</p>
    `;

    /* Mail Objekt zusammenstellen */
    const mail = {
        from: '"KomplettWebdesign" <kontakt@komplettwebdesign.de>',
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
        <p>Beste Grüße<br>Komplettwebdesign</p>
    `;
    const mail = {
        from: '"KomplettWebdesign" <kontakt@komplettwebdesign.de>',
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
        from: '"KomplettWebdesign" <kontakt@komplettwebdesign.de>',
        to: 'kontakt@komplettwebdesign.de',
        subject,
        html
    };
    return transporter.sendMail(mail);
}

// export async function sendRequestMail({ to, name, type }) {
//     /* Datum hübsch formatiert (z.B. "Mo., 15.07.2025 um 14:00 Uhr") */

//     /*Betreff je nach Status */
//     const subject = {
//         pending: `Deine Anfrage ist eingegangen`,
//         confirmed: `Termin bestätigt: ${pretty}`,
//         cancelled: `Termin abgesagt: ${pretty}`
//     }[type];

//     /*Mail Body*/
//     const html = `
//     <p>Hallo ${name}</p>
//     <p>${type === "pending"
//             ? `vielen Dank für die Anfrage. Wir prüfen deine Angaben und melden uns in kurze mit einem Beratungstermin bei dir..`
//             : type === "confirmed"
//                 ? `Ihr Termin wurde bestätigt. Wir freuen uns auf das Gespräch!`
//                 : `Leider mussten wir den Termin stornieren. Bitte buchen Sie einen neuen Termin über unsere Website.`
//         }</p>
//     <p><strong>Termin:</strong> ${pretty}</p>
//     <p>Beste Grüße<br>Komplettwebdesign</p>
//     `;

//     /* Mail Objekt zusammenstellen */
//     const mail = {
//         from: '"KomplettWebdesign" <kontakt@komplettwebdesign.de>',
//         to,
//         subject,
//         html
//     };

//     /* Mail senden - Fehler werden im aufrufenden Controller gefangen */
//     return transporter.sendMail(mail)
// }