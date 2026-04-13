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

function wtLocale(locale = "de") {
    return normalizeLocale(locale) === "en" ? "en" : "de";
}

function wtScoreLabel(scoreBand = "mittel", locale = "de") {
    const labels = wtLocale(locale) === "en"
        ? { gut: "Modern", mittel: "Needs work", kritisch: "Critical" }
        : { gut: "Modern", mittel: "Ausbaufähig", kritisch: "Kritisch" };
    return labels[scoreBand] || labels.mittel;
}

function wtPrettyDate(value, locale = "de") {
    const asDate = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(asDate.getTime())) return "";
    return asDate.toLocaleString(wtLocale(locale) === "en" ? "en-GB" : "de-DE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });
}

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

export async function sendWebsiteTesterDoiMail({
    to,
    name,
    locale = "de",
    domain = "",
    scoreBand = "mittel",
    confirmUrl = "",
    expiresAt = null
}) {
    const lng = wtLocale(locale);
    const person = String(name || "").trim() || (lng === "en" ? "there" : "dir");
    const label = wtScoreLabel(scoreBand, lng);
    const expiry = wtPrettyDate(expiresAt, lng);
    const subject = lng === "en"
        ? "Confirm your email for your website optimization PDF"
        : "Bitte bestätige deine E-Mail für deinen Website-Optimierungsreport";

    const html = lng === "en"
        ? `
      <p>Hello ${person},</p>
      <p>you requested the detailed optimization PDF for <strong>${domain || "your website"}</strong> (${label}).</p>
      <p>Please confirm your email address to receive the report:</p>
      <p><a href="${confirmUrl}">Confirm email and send report</a></p>
      ${expiry ? `<p>This link is valid until <strong>${expiry}</strong>.</p>` : ""}
      <p>If you did not request this, you can ignore this email.</p>
      <p>Best regards<br>Komplett Webdesign</p>
    `
        : `
      <p>Hallo ${person},</p>
      <p>du hast den ausführlichen Optimierungsreport für <strong>${domain || "deine Website"}</strong> (${label}) angefordert.</p>
      <p>Bitte bestätige deine E-Mail-Adresse, damit wir dir den Report senden können:</p>
      <p><a href="${confirmUrl}">E-Mail bestätigen und Report senden</a></p>
      ${expiry ? `<p>Der Link ist gültig bis <strong>${expiry}</strong>.</p>` : ""}
      <p>Falls du das nicht angefordert hast, ignoriere diese E-Mail einfach.</p>
      <p>Beste Grüße<br>Komplett Webdesign</p>
    `;

    return transporter.sendMail({
        from: '"Komplett Webdesign" <kontakt@komplettwebdesign.de>',
        to,
        subject,
        html
    });
}

export async function sendWebsiteTesterReportMail({
    to,
    name,
    locale = "de",
    domain = "",
    scoreBand = "mittel",
    report
}) {
    const lng = wtLocale(locale);
    const person = String(name || "").trim() || (lng === "en" ? "there" : "dir");
    const label = wtScoreLabel(scoreBand, lng);

    const subject = lng === "en"
        ? "Your detailed website optimization report (PDF)"
        : "Dein ausführlicher Website-Optimierungsreport (PDF)";

    const contactUrl = `${(process.env.BASE_URL || process.env.CANONICAL_BASE_URL || "https://komplettwebdesign.de").replace(/\/$/, "")}${lng === "en" ? "/en/kontakt" : "/kontakt"}`;
    const bookingUrl = `${(process.env.BASE_URL || process.env.CANONICAL_BASE_URL || "https://komplettwebdesign.de").replace(/\/$/, "")}/booking`;

    const html = lng === "en"
        ? `
      <p>Hello ${person},</p>
      <p>here is your detailed optimization report for <strong>${domain || "your website"}</strong> (${label}).</p>
      <p>The PDF is attached to this email.</p>
      <p>If you want, we can review the report together and prioritize implementation:</p>
      <ul>
        <li><a href="${contactUrl}">Contact form</a></li>
        <li><a href="${bookingUrl}">Book a consultation call</a></li>
      </ul>
      <p>Best regards<br>Komplett Webdesign</p>
    `
        : `
      <p>Hallo ${person},</p>
      <p>hier ist dein ausführlicher Optimierungsreport für <strong>${domain || "deine Website"}</strong> (${label}).</p>
      <p>Das PDF findest du im Anhang.</p>
      <p>Wenn du möchtest, priorisieren wir die Umsetzung gemeinsam in einem kurzen Beratungsgespräch:</p>
      <ul>
        <li><a href="${contactUrl}">Zum Kontaktformular</a></li>
        <li><a href="${bookingUrl}">Beratungstermin buchen</a></li>
      </ul>
      <p>Beste Grüße<br>Komplett Webdesign</p>
    `;

    const mail = {
        from: '"Komplett Webdesign" <kontakt@komplettwebdesign.de>',
        to,
        subject,
        html,
        attachments: [
            {
                filename: report?.filename || "website-optimierungsreport.pdf",
                content: report?.buffer,
                contentType: "application/pdf"
            }
        ]
    };

    const adminNotify = String(process.env.WEBSITE_TESTER_ADMIN_NOTIFY || "").trim();
    if (adminNotify) {
        mail.bcc = adminNotify;
    }

    return transporter.sendMail(mail);
}

export async function sendGeoTesterDoiMail({
    to,
    name,
    locale = "de",
    domain = "",
    scoreBand = "mittel",
    confirmUrl = "",
    expiresAt = null
}) {
    const lng = wtLocale(locale);
    const person = String(name || "").trim() || (lng === "en" ? "there" : "dir");
    const label = wtScoreLabel(scoreBand, lng);
    const expiry = wtPrettyDate(expiresAt, lng);
    const subject = lng === "en"
        ? "Confirm your email for your detailed GEO report"
        : "Bitte bestätige deine E-Mail für deinen detaillierten GEO-Report";

    const html = lng === "en"
        ? `
      <p>Hello ${person},</p>
      <p>you requested the detailed GEO optimization report for <strong>${domain || "your website"}</strong> (${label}).</p>
      <p>Please confirm your email address to unlock and receive the full report:</p>
      <p><a href="${confirmUrl}">Confirm email and send GEO report</a></p>
      ${expiry ? `<p>This link is valid until <strong>${expiry}</strong>.</p>` : ""}
      <p>After confirmation, your address will be added to our newsletter so we can send future GEO updates and tips.</p>
      <p>If you did not request this, you can ignore this email.</p>
      <p>Best regards<br>Komplett Webdesign</p>
    `
        : `
      <p>Hallo ${person},</p>
      <p>du hast den detaillierten GEO-Optimierungsreport für <strong>${domain || "deine Website"}</strong> (${label}) angefordert.</p>
      <p>Bitte bestätige deine E-Mail-Adresse, damit wir dir den vollständigen Report senden können:</p>
      <p><a href="${confirmUrl}">E-Mail bestätigen und GEO-Report senden</a></p>
      ${expiry ? `<p>Der Link ist gültig bis <strong>${expiry}</strong>.</p>` : ""}
      <p>Nach der Bestätigung wird deine Adresse in unseren Newsletter aufgenommen, damit wir dir weitere GEO-Tipps senden können.</p>
      <p>Falls du das nicht angefordert hast, ignoriere diese E-Mail einfach.</p>
      <p>Beste Grüße<br>Komplett Webdesign</p>
    `;

    return transporter.sendMail({
        from: '"Komplett Webdesign" <kontakt@komplettwebdesign.de>',
        to,
        subject,
        html
    });
}

export async function sendGeoTesterReportMail({
    to,
    name,
    locale = "de",
    domain = "",
    scoreBand = "mittel",
    report
}) {
    const lng = wtLocale(locale);
    const person = String(name || "").trim() || (lng === "en" ? "there" : "dir");
    const label = wtScoreLabel(scoreBand, lng);

    const subject = lng === "en"
        ? "Your detailed GEO optimization report (PDF)"
        : "Dein detaillierter GEO-Optimierungsreport (PDF)";

    const base = (process.env.BASE_URL || process.env.CANONICAL_BASE_URL || "https://komplettwebdesign.de").replace(/\/$/, "");
    const contactUrl = `${base}${lng === "en" ? "/en/kontakt" : "/kontakt"}`;
    const bookingUrl = `${base}/booking`;

    const html = lng === "en"
        ? `
      <p>Hello ${person},</p>
      <p>here is your detailed GEO optimization report for <strong>${domain || "your website"}</strong> (${label}).</p>
      <p>The PDF is attached to this email.</p>
      <p>If you want, we can prioritize implementation together in a short consultation:</p>
      <ul>
        <li><a href="${contactUrl}">Contact form</a></li>
        <li><a href="${bookingUrl}">Book a consultation call</a></li>
      </ul>
      <p>Best regards<br>Komplett Webdesign</p>
    `
        : `
      <p>Hallo ${person},</p>
      <p>hier ist dein detaillierter GEO-Optimierungsreport für <strong>${domain || "deine Website"}</strong> (${label}).</p>
      <p>Das PDF findest du im Anhang.</p>
      <p>Wenn du möchtest, priorisieren wir die Umsetzung gemeinsam in einem kurzen Beratungsgespräch:</p>
      <ul>
        <li><a href="${contactUrl}">Zum Kontaktformular</a></li>
        <li><a href="${bookingUrl}">Beratungstermin buchen</a></li>
      </ul>
      <p>Beste Grüße<br>Komplett Webdesign</p>
    `;

    const mail = {
        from: '"Komplett Webdesign" <kontakt@komplettwebdesign.de>',
        to,
        subject,
        html,
        attachments: [
            {
                filename: report?.filename || "geo-optimierungsreport.pdf",
                content: report?.buffer,
                contentType: "application/pdf"
            }
        ]
    };

    const adminNotify = String(process.env.WEBSITE_TESTER_ADMIN_NOTIFY || "").trim();
    if (adminNotify) {
        mail.bcc = adminNotify;
    }

    return transporter.sendMail(mail);
}

export async function sendSeoTesterDoiMail({
    to,
    name,
    locale = "de",
    domain = "",
    scoreBand = "mittel",
    confirmUrl = "",
    expiresAt = null
}) {
    const lng = wtLocale(locale);
    const person = String(name || "").trim() || (lng === "en" ? "there" : "dir");
    const label = wtScoreLabel(scoreBand, lng);
    const expiry = wtPrettyDate(expiresAt, lng);
    const subject = lng === "en"
        ? "Confirm your email for your detailed SEO report"
        : "Bitte bestätige deine E-Mail für deinen detaillierten SEO-Report";

    const html = lng === "en"
        ? `
      <p>Hello ${person},</p>
      <p>you requested the detailed SEO report for <strong>${domain || "your website"}</strong> (${label}).</p>
      <p>Please confirm your email address to unlock and receive the full report:</p>
      <p><a href="${confirmUrl}">Confirm email and send SEO report</a></p>
      ${expiry ? `<p>This link is valid until <strong>${expiry}</strong>.</p>` : ""}
      <p>If you did not request this, you can ignore this email.</p>
      <p>Best regards<br>Komplett Webdesign</p>
    `
        : `
      <p>Hallo ${person},</p>
      <p>du hast den detaillierten SEO-Report für <strong>${domain || "deine Website"}</strong> (${label}) angefordert.</p>
      <p>Bitte bestätige deine E-Mail-Adresse, damit wir dir den vollständigen Report senden können:</p>
      <p><a href="${confirmUrl}">E-Mail bestätigen und SEO-Report senden</a></p>
      ${expiry ? `<p>Der Link ist gültig bis <strong>${expiry}</strong>.</p>` : ""}
      <p>Falls du das nicht angefordert hast, ignoriere diese E-Mail einfach.</p>
      <p>Beste Grüße<br>Komplett Webdesign</p>
    `;

    return transporter.sendMail({
        from: '"Komplett Webdesign" <kontakt@komplettwebdesign.de>',
        to,
        subject,
        html
    });
}

export async function sendSeoTesterReportMail({
    to,
    name,
    locale = "de",
    domain = "",
    scoreBand = "mittel",
    report
}) {
    const lng = wtLocale(locale);
    const person = String(name || "").trim() || (lng === "en" ? "there" : "dir");
    const label = wtScoreLabel(scoreBand, lng);

    const subject = lng === "en"
        ? "Your detailed SEO report (PDF)"
        : "Dein detaillierter SEO-Report (PDF)";

    const base = (process.env.BASE_URL || process.env.CANONICAL_BASE_URL || "https://komplettwebdesign.de").replace(/\/$/, "");
    const contactUrl = `${base}${lng === "en" ? "/en/kontakt" : "/kontakt"}`;
    const bookingUrl = `${base}/booking`;

    const html = lng === "en"
        ? `
      <p>Hello ${person},</p>
      <p>here is your detailed SEO report for <strong>${domain || "your website"}</strong> (${label}).</p>
      <p>The PDF is attached to this email.</p>
      <p>If you want, we can prioritize implementation together in a short consultation:</p>
      <ul>
        <li><a href="${contactUrl}">Contact form</a></li>
        <li><a href="${bookingUrl}">Book a consultation call</a></li>
      </ul>
      <p>Best regards<br>Komplett Webdesign</p>
    `
        : `
      <p>Hallo ${person},</p>
      <p>hier ist dein detaillierter SEO-Report für <strong>${domain || "deine Website"}</strong> (${label}).</p>
      <p>Das PDF findest du im Anhang.</p>
      <p>Wenn du möchtest, priorisieren wir die Umsetzung gemeinsam in einem kurzen Beratungsgespräch:</p>
      <ul>
        <li><a href="${contactUrl}">Zum Kontaktformular</a></li>
        <li><a href="${bookingUrl}">Beratungstermin buchen</a></li>
      </ul>
      <p>Beste Grüße<br>Komplett Webdesign</p>
    `;

    const mail = {
        from: '"Komplett Webdesign" <kontakt@komplettwebdesign.de>',
        to,
        subject,
        html,
        attachments: [
            {
                filename: report?.filename || "seo-audit-report.pdf",
                content: report?.buffer,
                contentType: "application/pdf"
            }
        ]
    };

    const adminNotify = String(process.env.WEBSITE_TESTER_ADMIN_NOTIFY || "").trim();
    if (adminNotify) {
        mail.bcc = adminNotify;
    }

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
