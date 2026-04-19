import nodemailer from "nodemailer";
import { generateICS } from "./icsService.js";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { enUS } from "date-fns/locale";
import { generateToken } from "../util/bookingToken.js";
import { normalizeLocale } from "../util/bookingLocale.js";
import { renderBrandEmail } from "./emailTemplateService.js";


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

function testerBaseUrl() {
    return (process.env.BASE_URL || process.env.CANONICAL_BASE_URL || "https://komplettwebdesign.de").replace(/\/$/, "");
}

function safeHtml(value = "") {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function newsletterUnsubscribeUrl(unsubscribeToken = "") {
    const token = String(unsubscribeToken || "").trim();
    if (!token) return "";
    return `${testerBaseUrl()}/newsletter/unsubscribe/${encodeURIComponent(token)}`;
}

function newsletterHintHtml({ locale = "de", unsubscribeToken = "" }) {
    const url = newsletterUnsubscribeUrl(unsubscribeToken);
    const lng = wtLocale(locale);
    if (!url) {
        return lng === "en"
            ? `<p>You can unsubscribe from the newsletter at any time via the link in future emails.</p>`
            : `<p>Du kannst den Newsletter jederzeit über den Link in künftigen E-Mails abbestellen.</p>`;
    }
    return lng === "en"
        ? `<p>If you no longer want the newsletter, you can unsubscribe here at any time: <a href="${url}">Unsubscribe newsletter</a>.</p>`
        : `<p>Wenn du den Newsletter nicht mehr erhalten möchtest, kannst du ihn jederzeit hier abbestellen: <a href="${url}">Newsletter abbestellen</a>.</p>`;
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
            html: renderBrandEmail({
                locale,
                subject,
                headline: isEn ? "Request received" : "Anfrage eingegangen",
                preheader: isEn ? "We received your request and will reply shortly." : "Wir haben Ihre Anfrage erhalten und melden uns zeitnah.",
                bodyHtml: html
            })
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
        html: renderBrandEmail({
            locale,
            subject,
            headline: isEn ? "Appointment update" : "Termin-Update",
            preheader: isEn ? "Your booking status has changed." : "Der Status Ihrer Buchung wurde aktualisiert.",
            bodyHtml: html,
            ctaLabel: type === "confirmed" ? (isEn ? "Manage appointment" : "Termin verwalten") : "",
            ctaUrl: type === "confirmed" && bookingId ? `${process.env.BASE_URL || ""}/booking/${bookingId}/reschedule/${generateToken(bookingId)}` : ""
        }),
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
    const html = renderBrandEmail({
        locale: "de",
        subject,
        headline: "Vielen Dank für deine Anfrage",
        preheader: "Wir haben deine Nachricht erhalten.",
        bodyHtml: `
        <p>Hallo ${name}</p>
        <p>vielen Dank für die Anfrage. Wir melden uns in Kürze bei dir.</p>
      `
    });
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
        ? "Confirm your email for your detailed report + newsletter"
        : "Bitte bestätige deine E-Mail für Report + Newsletter";

    const html = lng === "en"
        ? `
      <p>Hello ${person},</p>
      <p>you requested the detailed optimization PDF for <strong>${domain || "your website"}</strong> (${label}).</p>
      <p>Please confirm your email address to receive the report:</p>
      <p><a href="${confirmUrl}">Confirm email and send report</a></p>
      ${expiry ? `<p>This link is valid until <strong>${expiry}</strong>.</p>` : ""}
      <p>By confirming, you also activate your newsletter subscription so we can send the requested report and future optimization updates.</p>
      <p>If you did not request this, you can ignore this email.</p>
      <p>Best regards<br>Komplett Webdesign</p>
    `
        : `
      <p>Hallo ${person},</p>
      <p>du hast den ausführlichen Optimierungsreport für <strong>${domain || "deine Website"}</strong> (${label}) angefordert.</p>
      <p>Bitte bestätige deine E-Mail-Adresse, damit wir dir den Report senden können:</p>
      <p><a href="${confirmUrl}">E-Mail bestätigen und Report senden</a></p>
      ${expiry ? `<p>Der Link ist gültig bis <strong>${expiry}</strong>.</p>` : ""}
      <p>Mit der Bestätigung aktivierst du gleichzeitig deine Newsletter-Anmeldung, damit wir dir den angeforderten Report und weitere Optimierungstipps senden können.</p>
      <p>Falls du das nicht angefordert hast, ignoriere diese E-Mail einfach.</p>
      <p>Beste Grüße<br>Komplett Webdesign</p>
    `;

    return transporter.sendMail({
        from: '"Komplett Webdesign" <kontakt@komplettwebdesign.de>',
        to,
        subject,
        html: renderBrandEmail({
            locale: lng,
            subject,
            headline: lng === "en" ? "Please confirm your email" : "Bitte bestätige deine E-Mail",
            preheader: lng === "en" ? "One click to receive your report." : "Ein Klick, damit wir dir den Report senden können.",
            bodyHtml: html
        })
    });
}

export async function sendWebsiteTesterReportMail({
    to,
    name,
    locale = "de",
    domain = "",
    scoreBand = "mittel",
    report,
    unsubscribeToken = ""
}) {
    const lng = wtLocale(locale);
    const person = String(name || "").trim() || (lng === "en" ? "there" : "dir");
    const label = wtScoreLabel(scoreBand, lng);

    const subject = lng === "en"
        ? "Your detailed website optimization report (PDF)"
        : "Dein ausführlicher Website-Optimierungsreport (PDF)";

    const contactUrl = `${testerBaseUrl()}${lng === "en" ? "/en/kontakt" : "/kontakt"}`;
    const bookingUrl = `${testerBaseUrl()}/booking`;

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
      ${newsletterHintHtml({ locale: lng, unsubscribeToken })}
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
      ${newsletterHintHtml({ locale: lng, unsubscribeToken })}
      <p>Beste Grüße<br>Komplett Webdesign</p>
    `;

    const mail = {
        from: '"Komplett Webdesign" <kontakt@komplettwebdesign.de>',
        to,
        subject,
        html: renderBrandEmail({
            locale: lng,
            subject,
            headline: lng === "en" ? "Your report is ready" : "Dein Report ist bereit",
            preheader: lng === "en" ? "Your PDF is attached to this email." : "Dein PDF findest du im Anhang.",
            bodyHtml: html,
            ctaLabel: lng === "en" ? "Book consultation" : "Beratung buchen",
            ctaUrl: bookingUrl
        }),
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
        html: renderBrandEmail({
            locale: lng,
            subject,
            headline: lng === "en" ? "Please confirm your email" : "Bitte bestätige deine E-Mail",
            preheader: lng === "en" ? "One click to receive your GEO report." : "Ein Klick, damit wir dir den GEO-Report senden können.",
            bodyHtml: html
        })
    });
}

export async function sendGeoTesterReportMail({
    to,
    name,
    locale = "de",
    domain = "",
    scoreBand = "mittel",
    report,
    unsubscribeToken = ""
}) {
    const lng = wtLocale(locale);
    const person = String(name || "").trim() || (lng === "en" ? "there" : "dir");
    const label = wtScoreLabel(scoreBand, lng);

    const subject = lng === "en"
        ? "Your detailed GEO optimization report (PDF)"
        : "Dein detaillierter GEO-Optimierungsreport (PDF)";

    const base = testerBaseUrl();
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
      ${newsletterHintHtml({ locale: lng, unsubscribeToken })}
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
      ${newsletterHintHtml({ locale: lng, unsubscribeToken })}
      <p>Beste Grüße<br>Komplett Webdesign</p>
    `;

    const mail = {
        from: '"Komplett Webdesign" <kontakt@komplettwebdesign.de>',
        to,
        subject,
        html: renderBrandEmail({
            locale: lng,
            subject,
            headline: lng === "en" ? "Your GEO report is ready" : "Dein GEO-Report ist bereit",
            preheader: lng === "en" ? "Your PDF is attached to this email." : "Dein PDF findest du im Anhang.",
            bodyHtml: html,
            ctaLabel: lng === "en" ? "Book consultation" : "Beratung buchen",
            ctaUrl: bookingUrl
        }),
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
        ? "Confirm your email for your detailed SEO report + newsletter"
        : "Bitte bestätige deine E-Mail für SEO-Report + Newsletter";

    const html = lng === "en"
        ? `
      <p>Hello ${person},</p>
      <p>you requested the detailed SEO report for <strong>${domain || "your website"}</strong> (${label}).</p>
      <p>Please confirm your email address to unlock and receive the full report:</p>
      <p><a href="${confirmUrl}">Confirm email and send SEO report</a></p>
      ${expiry ? `<p>This link is valid until <strong>${expiry}</strong>.</p>` : ""}
      <p>After confirmation, your address is added to our newsletter so we can send SEO updates and implementation tips.</p>
      <p>If you did not request this, you can ignore this email.</p>
      <p>Best regards<br>Komplett Webdesign</p>
    `
        : `
      <p>Hallo ${person},</p>
      <p>du hast den detaillierten SEO-Report für <strong>${domain || "deine Website"}</strong> (${label}) angefordert.</p>
      <p>Bitte bestätige deine E-Mail-Adresse, damit wir dir den vollständigen Report senden können:</p>
      <p><a href="${confirmUrl}">E-Mail bestätigen und SEO-Report senden</a></p>
      ${expiry ? `<p>Der Link ist gültig bis <strong>${expiry}</strong>.</p>` : ""}
      <p>Nach der Bestätigung wird deine Adresse in unseren Newsletter aufgenommen, damit wir dir weitere SEO-Tipps senden können.</p>
      <p>Falls du das nicht angefordert hast, ignoriere diese E-Mail einfach.</p>
      <p>Beste Grüße<br>Komplett Webdesign</p>
    `;

    return transporter.sendMail({
        from: '"Komplett Webdesign" <kontakt@komplettwebdesign.de>',
        to,
        subject,
        html: renderBrandEmail({
            locale: lng,
            subject,
            headline: lng === "en" ? "Please confirm your email" : "Bitte bestätige deine E-Mail",
            preheader: lng === "en" ? "One click to receive your SEO report." : "Ein Klick, damit wir dir den SEO-Report senden können.",
            bodyHtml: html
        })
    });
}

export async function sendSeoTesterReportMail({
    to,
    name,
    locale = "de",
    domain = "",
    scoreBand = "mittel",
    report,
    unsubscribeToken = ""
}) {
    const lng = wtLocale(locale);
    const person = String(name || "").trim() || (lng === "en" ? "there" : "dir");
    const label = wtScoreLabel(scoreBand, lng);

    const subject = lng === "en"
        ? "Your detailed SEO report (PDF)"
        : "Dein detaillierter SEO-Report (PDF)";

    const base = testerBaseUrl();
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
      ${newsletterHintHtml({ locale: lng, unsubscribeToken })}
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
      ${newsletterHintHtml({ locale: lng, unsubscribeToken })}
      <p>Beste Grüße<br>Komplett Webdesign</p>
    `;

    const mail = {
        from: '"Komplett Webdesign" <kontakt@komplettwebdesign.de>',
        to,
        subject,
        html: renderBrandEmail({
            locale: lng,
            subject,
            headline: lng === "en" ? "Your SEO report is ready" : "Dein SEO-Report ist bereit",
            preheader: lng === "en" ? "Your PDF is attached to this email." : "Dein PDF findest du im Anhang.",
            bodyHtml: html,
            ctaLabel: lng === "en" ? "Book consultation" : "Beratung buchen",
            ctaUrl: bookingUrl
        }),
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

export async function sendMetaTesterDoiMail({
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
        ? "Confirm your email for your detailed meta report + newsletter"
        : "Bitte bestätige deine E-Mail für Meta-Report + Newsletter";

    const html = lng === "en"
        ? `
      <p>Hello ${person},</p>
      <p>you requested the detailed header/meta report for <strong>${domain || "your website"}</strong> (${label}).</p>
      <p>Please confirm your email address to unlock and receive the report:</p>
      <p><a href="${confirmUrl}">Confirm email and send meta report</a></p>
      ${expiry ? `<p>This link is valid until <strong>${expiry}</strong>.</p>` : ""}
      <p>After confirmation, your address is added to our newsletter so we can send optimization updates.</p>
      <p>If you did not request this, you can ignore this email.</p>
      <p>Best regards<br>Komplett Webdesign</p>
    `
        : `
      <p>Hallo ${person},</p>
      <p>du hast den detaillierten Header-/Meta-Report für <strong>${domain || "deine Website"}</strong> (${label}) angefordert.</p>
      <p>Bitte bestätige deine E-Mail-Adresse, damit wir dir den Report senden können:</p>
      <p><a href="${confirmUrl}">E-Mail bestätigen und Meta-Report senden</a></p>
      ${expiry ? `<p>Der Link ist gültig bis <strong>${expiry}</strong>.</p>` : ""}
      <p>Nach der Bestätigung wird deine Adresse in unseren Newsletter aufgenommen, damit wir dir weitere Optimierungstipps senden können.</p>
      <p>Falls du das nicht angefordert hast, ignoriere diese E-Mail einfach.</p>
      <p>Beste Grüße<br>Komplett Webdesign</p>
    `;

    return transporter.sendMail({
        from: '"Komplett Webdesign" <kontakt@komplettwebdesign.de>',
        to,
        subject,
        html: renderBrandEmail({
            locale: lng,
            subject,
            headline: lng === "en" ? "Please confirm your email" : "Bitte bestätige deine E-Mail",
            preheader: lng === "en" ? "One click to receive your meta report." : "Ein Klick, damit wir dir den Meta-Report senden können.",
            bodyHtml: html
        })
    });
}

export async function sendMetaTesterReportMail({
    to,
    name,
    locale = "de",
    domain = "",
    scoreBand = "mittel",
    report,
    unsubscribeToken = ""
}) {
    const lng = wtLocale(locale);
    const person = String(name || "").trim() || (lng === "en" ? "there" : "dir");
    const label = wtScoreLabel(scoreBand, lng);
    const subject = lng === "en"
        ? "Your detailed header/meta report (PDF)"
        : "Dein detaillierter Header-/Meta-Report (PDF)";

    const base = testerBaseUrl();
    const contactUrl = `${base}${lng === "en" ? "/en/kontakt" : "/kontakt"}`;
    const bookingUrl = `${base}/booking`;

    const html = lng === "en"
        ? `
      <p>Hello ${person},</p>
      <p>here is your detailed header/meta report for <strong>${domain || "your website"}</strong> (${label}).</p>
      <p>The PDF is attached to this email.</p>
      <p>If you want, we can prioritize implementation together in a short consultation:</p>
      <ul>
        <li><a href="${contactUrl}">Contact form</a></li>
        <li><a href="${bookingUrl}">Book a consultation call</a></li>
      </ul>
      ${newsletterHintHtml({ locale: lng, unsubscribeToken })}
      <p>Best regards<br>Komplett Webdesign</p>
    `
        : `
      <p>Hallo ${person},</p>
      <p>hier ist dein detaillierter Header-/Meta-Report für <strong>${domain || "deine Website"}</strong> (${label}).</p>
      <p>Das PDF findest du im Anhang.</p>
      <p>Wenn du möchtest, priorisieren wir die Umsetzung gemeinsam in einem kurzen Beratungsgespräch:</p>
      <ul>
        <li><a href="${contactUrl}">Zum Kontaktformular</a></li>
        <li><a href="${bookingUrl}">Beratungstermin buchen</a></li>
      </ul>
      ${newsletterHintHtml({ locale: lng, unsubscribeToken })}
      <p>Beste Grüße<br>Komplett Webdesign</p>
    `;

    const mail = {
        from: '"Komplett Webdesign" <kontakt@komplettwebdesign.de>',
        to,
        subject,
        html: renderBrandEmail({
            locale: lng,
            subject,
            headline: lng === "en" ? "Your meta report is ready" : "Dein Meta-Report ist bereit",
            preheader: lng === "en" ? "Your PDF is attached to this email." : "Dein PDF findest du im Anhang.",
            bodyHtml: html,
            ctaLabel: lng === "en" ? "Book consultation" : "Beratung buchen",
            ctaUrl: bookingUrl
        }),
        attachments: [
            {
                filename: report?.filename || "meta-audit-report.pdf",
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

export async function sendBrokenLinksTesterDoiMail({
    to,
    name,
    locale = "de",
    domain = "",
    brokenCount = 0,
    confirmUrl = "",
    expiresAt = null
}) {
    const lng = wtLocale(locale);
    const person = String(name || "").trim() || (lng === "en" ? "there" : "dir");
    const expiry = wtPrettyDate(expiresAt, lng);
    const subject = lng === "en"
        ? "Confirm your email for your detailed broken-links report + newsletter"
        : "Bitte bestätige deine E-Mail für Broken-Links-Report + Newsletter";

    const countLabel = Number.isFinite(Number(brokenCount)) ? Number(brokenCount) : 0;

    const html = lng === "en"
        ? `
      <p>Hello ${person},</p>
      <p>you requested the detailed broken-links report for <strong>${domain || "your website"}</strong> (${countLabel} broken link(s) detected).</p>
      <p>Please confirm your email address to unlock and receive the full list (source page, target URL, HTTP status, fix hint):</p>
      <p><a href="${confirmUrl}">Confirm email and send broken-links report</a></p>
      ${expiry ? `<p>This link is valid until <strong>${expiry}</strong>.</p>` : ""}
      <p>After confirmation, your address is added to our newsletter so we can share practical website-quality tips.</p>
      <p>If you did not request this, you can ignore this email.</p>
      <p>Best regards<br>Komplett Webdesign</p>
    `
        : `
      <p>Hallo ${person},</p>
      <p>du hast den detaillierten Broken-Links-Report für <strong>${domain || "deine Website"}</strong> (${countLabel} defekte Links erkannt) angefordert.</p>
      <p>Bitte bestätige deine E-Mail-Adresse, damit wir dir die vollständige Liste senden können (Quellseite, Ziel-URL, HTTP-Status, Fix-Hinweis):</p>
      <p><a href="${confirmUrl}">E-Mail bestätigen und Broken-Links-Report senden</a></p>
      ${expiry ? `<p>Der Link ist gültig bis <strong>${expiry}</strong>.</p>` : ""}
      <p>Nach der Bestätigung wird deine Adresse in unseren Newsletter aufgenommen, damit wir dir weitere praktische Website-Qualitäts-Tipps senden können.</p>
      <p>Falls du das nicht angefordert hast, ignoriere diese E-Mail einfach.</p>
      <p>Beste Grüße<br>Komplett Webdesign</p>
    `;

    return transporter.sendMail({
        from: '"Komplett Webdesign" <kontakt@komplettwebdesign.de>',
        to,
        subject,
        html: renderBrandEmail({
            locale: lng,
            subject,
            headline: lng === "en" ? "Please confirm your email" : "Bitte bestätige deine E-Mail",
            preheader: lng === "en" ? "One click to receive your broken-links report." : "Ein Klick, damit wir dir den Broken-Links-Report senden können.",
            bodyHtml: html
        })
    });
}

export async function sendBrokenLinksTesterReportMail({
    to,
    name,
    locale = "de",
    domain = "",
    brokenCount = 0,
    warningCount = 0,
    report,
    unsubscribeToken = ""
}) {
    const lng = wtLocale(locale);
    const person = String(name || "").trim() || (lng === "en" ? "there" : "dir");
    const broken = Number.isFinite(Number(brokenCount)) ? Number(brokenCount) : 0;
    const warnings = Number.isFinite(Number(warningCount)) ? Number(warningCount) : 0;

    const subject = lng === "en"
        ? "Your detailed broken-links report (PDF)"
        : "Dein detaillierter Broken-Links-Report (PDF)";

    const base = testerBaseUrl();
    const contactUrl = `${base}${lng === "en" ? "/en/kontakt" : "/kontakt"}`;
    const bookingUrl = `${base}/booking`;

    const html = lng === "en"
        ? `
      <p>Hello ${person},</p>
      <p>here is your detailed broken-links report for <strong>${domain || "your website"}</strong>.</p>
      <p>Summary: <strong>${broken}</strong> broken link(s), <strong>${warnings}</strong> warning(s).</p>
      <p>The PDF attached to this email lists every finding with source page, target URL, HTTP status, and a fix hint.</p>
      <p>If you want, we can prioritize the fixes with you in a short consultation:</p>
      <ul>
        <li><a href="${contactUrl}">Contact form</a></li>
        <li><a href="${bookingUrl}">Book a consultation call</a></li>
      </ul>
      ${newsletterHintHtml({ locale: lng, unsubscribeToken })}
      <p>Best regards<br>Komplett Webdesign</p>
    `
        : `
      <p>Hallo ${person},</p>
      <p>hier ist dein detaillierter Broken-Links-Report für <strong>${domain || "deine Website"}</strong>.</p>
      <p>Zusammenfassung: <strong>${broken}</strong> defekte Links, <strong>${warnings}</strong> Warnungen.</p>
      <p>Im PDF im Anhang findest du jeden Fund mit Quellseite, Ziel-URL, HTTP-Status und Fix-Hinweis.</p>
      <p>Wenn du möchtest, priorisieren wir die Behebung gemeinsam in einem kurzen Beratungsgespräch:</p>
      <ul>
        <li><a href="${contactUrl}">Zum Kontaktformular</a></li>
        <li><a href="${bookingUrl}">Beratungstermin buchen</a></li>
      </ul>
      ${newsletterHintHtml({ locale: lng, unsubscribeToken })}
      <p>Beste Grüße<br>Komplett Webdesign</p>
    `;

    const mail = {
        from: '"Komplett Webdesign" <kontakt@komplettwebdesign.de>',
        to,
        subject,
        html: renderBrandEmail({
            locale: lng,
            subject,
            headline: lng === "en" ? "Your broken-links report is ready" : "Dein Broken-Links-Report ist bereit",
            preheader: lng === "en" ? "Your PDF is attached to this email." : "Dein PDF findest du im Anhang.",
            bodyHtml: html,
            ctaLabel: lng === "en" ? "Book consultation" : "Beratung buchen",
            ctaUrl: bookingUrl
        }),
        attachments: [
            {
                filename: report?.filename || "broken-links-report.pdf",
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

export async function sendTesterFullGuideMail({
    to,
    name,
    locale = "de",
    domain = "",
    sourceLabel = "Website",
    guideText = "",
    unsubscribeToken = "",
    guidePdf = null
}) {
    const lng = wtLocale(locale);
    const person = String(name || "").trim() || (lng === "en" ? "there" : "dir");
    const source = safeHtml(sourceLabel || "Website");
    const subject = lng === "en"
        ? `Your complete ${sourceLabel || "Website"} optimization guide`
        : `Deine vollständige ${sourceLabel || "Website"}-Optimierungsanleitung`;

    const contactUrl = `${testerBaseUrl()}${lng === "en" ? "/en/kontakt" : "/kontakt"}`;
    const bookingUrl = `${testerBaseUrl()}/booking`;
    const formattedGuide = safeHtml(guideText || (lng === "en"
        ? "No guide content available."
        : "Kein Leitfadeninhalt verfügbar."));

    const html = lng === "en"
        ? `
      <p>Hello ${person},</p>
      <p>as requested, here is your complete <strong>${source}</strong> optimization guide for <strong>${safeHtml(domain || "your website")}</strong>.</p>
      <p>The guide is included below and is intended as an end-to-end implementation playbook.</p>
      <pre style="white-space:pre-wrap;line-height:1.45;background:#f7f7f7;border:1px solid #e5e7eb;padding:12px;border-radius:8px;">${formattedGuide}</pre>
      <p>If you want, we can prioritize implementation together and review open questions:</p>
      <ul>
        <li><a href="${contactUrl}">Contact form</a></li>
        <li><a href="${bookingUrl}">Book a consultation call</a></li>
      </ul>
      ${newsletterHintHtml({ locale: lng, unsubscribeToken })}
      <p>Best regards<br>Komplett Webdesign</p>
    `
        : `
      <p>Hallo ${person},</p>
      <p>wie gewünscht erhältst du hier deine vollständige <strong>${source}</strong>-Optimierungsanleitung für <strong>${safeHtml(domain || "deine Website")}</strong>.</p>
      <p>Die Anleitung ist unten enthalten und als durchgängiger Umsetzungsleitfaden gedacht.</p>
      <pre style="white-space:pre-wrap;line-height:1.45;background:#f7f7f7;border:1px solid #e5e7eb;padding:12px;border-radius:8px;">${formattedGuide}</pre>
      <p>Wenn du möchtest, priorisieren wir die Umsetzung gemeinsam und klären offene Punkte:</p>
      <ul>
        <li><a href="${contactUrl}">Zum Kontaktformular</a></li>
        <li><a href="${bookingUrl}">Beratungstermin buchen</a></li>
      </ul>
      ${newsletterHintHtml({ locale: lng, unsubscribeToken })}
      <p>Beste Grüße<br>Komplett Webdesign</p>
    `;

    const mail = {
        from: '"Komplett Webdesign" <kontakt@komplettwebdesign.de>',
        to,
        subject,
        html: renderBrandEmail({
            locale: lng,
            subject,
            headline: lng === "en" ? "Your complete guide" : "Deine vollständige Anleitung",
            preheader: lng === "en" ? "Your full optimization playbook is inside." : "Dein vollständiger Umsetzungsleitfaden ist enthalten.",
            bodyHtml: html,
            ctaLabel: lng === "en" ? "Book consultation" : "Beratung buchen",
            ctaUrl: bookingUrl
        }),
        attachments: []
    };

    if (guidePdf?.buffer) {
      const safeFileName = String(guidePdf.filename || `${sourceLabel || 'website'}-vollanleitung.pdf`).replace(/[\\r\\n]/g, ' ').slice(0, 180);
      mail.attachments.push({
        filename: safeFileName,
        content: guidePdf.buffer,
        contentType: "application/pdf"
      });
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
        html: renderBrandEmail({
            locale: "de",
            subject,
            headline: "Neue Buchungsinformation",
            preheader: "Eine Buchung wurde aktualisiert.",
            bodyHtml: html
        })
    };
    return transporter.sendMail(mail);
}

/* ------------------------------------------------------------------
 * Admin-Benachrichtigung bei neuer Tester-Lead Anfrage
 * ------------------------------------------------------------------ */
export async function sendAdminTesterLeadNotification({
    source = "website",
    email = "",
    name = "",
    domain = "",
    scoreBand = "",
    overallScore = null,
    locale = "de"
} = {}) {
    const srcLabel = sourceLabel(source, "de");
    const scoreLabel = scoreBand ? wtScoreLabel(scoreBand, "de") : "";
    const displayName = String(name || "").trim();
    const domainSafe = safeHtml(String(domain || "").trim());
    const emailSafe = safeHtml(String(email || "").trim());
    const subject = `Neue Tester-Anfrage: ${srcLabel}${domain ? " · " + domain : ""}`;

    const lines = [
        `<p>Soeben hat jemand den <strong>${srcLabel}</strong> ausgefüllt und seine E-Mail hinterlassen.</p>`,
        `<p>`,
        displayName ? `<strong>Name:</strong> ${safeHtml(displayName)}<br>` : "",
        `<strong>E-Mail:</strong> <a href="mailto:${emailSafe}">${emailSafe}</a><br>`,
        domain ? `<strong>Domain:</strong> ${domainSafe}<br>` : "",
        scoreLabel ? `<strong>Score-Band:</strong> ${safeHtml(scoreLabel)} (${safeHtml(String(scoreBand))})<br>` : "",
        (overallScore || overallScore === 0) ? `<strong>Score:</strong> ${safeHtml(String(overallScore))}<br>` : "",
        `<strong>Sprache:</strong> ${safeHtml(wtLocale(locale))}<br>`,
        `<strong>Quelle:</strong> ${safeHtml(srcLabel)} (${safeHtml(String(source))})`,
        `</p>`,
        `<p>Sobald die E-Mail über den Double-Opt-in bestätigt wurde, erhält der Lead automatisch den Report. Diese Nachricht dient lediglich als Hinweis, damit du den potenziellen Kunden im Blick behalten und später ggf. die Vollanleitung nachreichen kannst.</p>`
    ].filter(Boolean).join("\n");

    const mail = {
        from: '"Komplett Webdesign" <kontakt@komplettwebdesign.de>',
        to: 'kontakt@komplettwebdesign.de',
        subject,
        html: renderBrandEmail({
            locale: "de",
            subject,
            headline: "Neue Tester-Anfrage",
            preheader: `Neuer Lead über ${srcLabel}${domain ? " · " + domain : ""}`,
            bodyHtml: lines
        })
    };
    try {
        return await transporter.sendMail(mail);
    } catch (err) {
        console.warn("sendAdminTesterLeadNotification failed:", err?.message || err);
        return null;
    }
}

/* ------------------------------------------------------------------
 * Freeform-Mail für den Admin (Mailversand-Funktion im Backend)
 * ------------------------------------------------------------------ */
export async function sendAdminComposedMail({
    to = "",
    subject = "",
    bodyHtml = "",
    headline = "",
    preheader = "",
    ctaLabel = "",
    ctaUrl = "",
    locale = "de",
    replyTo = "",
    attachments = []
} = {}) {
    const lng = wtLocale(locale);
    const cleanSubject = String(subject || "").trim()
        || (lng === "en" ? "A message from Komplett Webdesign" : "Nachricht von Komplett Webdesign");
    const cleanHeadline = String(headline || "").trim() || cleanSubject;
    const cleanPreheader = String(preheader || "").trim()
        || (lng === "en" ? "A quick note from Komplett Webdesign." : "Kurze Nachricht von Komplett Webdesign.");
    const mail = {
        from: '"Komplett Webdesign" <kontakt@komplettwebdesign.de>',
        to,
        subject: cleanSubject,
        html: renderBrandEmail({
            locale: lng,
            subject: cleanSubject,
            headline: cleanHeadline,
            preheader: cleanPreheader,
            bodyHtml,
            ctaLabel,
            ctaUrl
        })
    };
    if (replyTo) mail.replyTo = replyTo;
    if (Array.isArray(attachments) && attachments.length > 0) {
        mail.attachments = attachments;
    }
    return transporter.sendMail(mail);
}

/* ------------------------------------------------------------------
 * Tester-Drip Mails (+48h Vollanleitung + Termin, +7d Case-Study + CTA)
 * Ein Template je Phase, dynamisch über source/domain/scoreBand.
 * ------------------------------------------------------------------ */

function sourceLabel(source, locale = "de") {
    const isEn = wtLocale(locale) === "en";
    const map = isEn
        ? { website: "Website Tester", seo: "SEO Tester", geo: "GEO Tester", meta: "Meta Tester", "broken-links": "Broken-Links Tester" }
        : { website: "Website-Tester", seo: "SEO-Tester", geo: "GEO-Tester", meta: "Meta-Tester", "broken-links": "Broken-Links-Tester" };
    return map[String(source || "").toLowerCase()] || (isEn ? "Website Tester" : "Website-Tester");
}

/**
 * +48h Follow-up: Vollanleitung-Teaser + Termin-Link mit Kontext.
 */
export async function sendTesterDrip48hMail({
    to,
    name,
    locale = "de",
    source = "website",
    domain = "",
    scoreBand = "mittel",
    unsubscribeToken = ""
} = {}) {
    const lng = wtLocale(locale);
    const isEn = lng === "en";
    const person = String(name || "").trim() || (isEn ? "there" : "dir");
    const srcLabel = sourceLabel(source, lng);
    const base = testerBaseUrl();
    const bookingUrl = `${base}${isEn ? "/en/booking" : "/booking"}?src=${encodeURIComponent(source)}-tester${domain ? `&domain=${encodeURIComponent(domain)}` : ""}${scoreBand ? `&score=${encodeURIComponent(scoreBand)}` : ""}`;
    const servicesUrl = `${base}${isEn ? "/en/webdesign-berlin" : "/webdesign-berlin"}`;
    const subject = isEn
        ? `Ready for the full playbook for ${domain || "your website"}?`
        : `Bereit für die volle Anleitung zu ${domain || "deiner Website"}?`;

    const bodyHtml = isEn ? `
      <p>Hello ${person},</p>
      <p>two days ago you received your free ${srcLabel} report${domain ? ` for <strong>${safeHtml(domain)}</strong>` : ""}. Did you get a chance to look through it?</p>
      <p>If you'd like the <strong>full implementation playbook</strong> — including exact priorities, owners and a 90-day sequence — I'm happy to prepare it for you as a personalised PDF.</p>
      <p>Alternatively, we can cut straight to the point in a <strong>free 30-minute call</strong>. Pick a slot that works for you:</p>
      <p><a href="${bookingUrl}">Book a free consultation</a></p>
      <p>Or browse our services: <a href="${servicesUrl}">${servicesUrl}</a></p>
      ${newsletterHintHtml({ locale: lng, unsubscribeToken })}
      <p>Best regards<br>Komplett Webdesign</p>
    ` : `
      <p>Hallo ${person},</p>
      <p>vor zwei Tagen hast du deinen kostenlosen ${srcLabel}-Report${domain ? ` für <strong>${safeHtml(domain)}</strong>` : ""} erhalten. Konntest du schon reinschauen?</p>
      <p>Falls du die <strong>vollständige Umsetzungs-Anleitung</strong> haben möchtest – inklusive konkreter Prioritäten, Verantwortlichkeiten und einem 90-Tage-Plan – stelle ich dir gerne eine personalisierte PDF zusammen.</p>
      <p>Alternativ sprechen wir in einem <strong>kostenlosen 30-Min.-Gespräch</strong> direkt Klartext. Such dir einfach einen passenden Slot:</p>
      <p><a href="${bookingUrl}">Kostenloses Erstgespräch buchen</a></p>
      <p>Oder stöbere direkt in den Leistungen: <a href="${servicesUrl}">${servicesUrl}</a></p>
      ${newsletterHintHtml({ locale: lng, unsubscribeToken })}
      <p>Beste Grüße<br>Komplett Webdesign</p>
    `;

    return transporter.sendMail({
        from: '"Komplett Webdesign" <kontakt@komplettwebdesign.de>',
        to,
        subject,
        html: renderBrandEmail({
            locale: lng,
            subject,
            headline: isEn ? "Ready for the next step?" : "Bereit für den nächsten Schritt?",
            preheader: isEn
                ? "Full playbook + a free 30-min call with a clear plan."
                : "Volle Anleitung + ein kostenloses 30-Min.-Gespräch mit klarem Plan.",
            bodyHtml
        })
    });
}

/**
 * +7d Case-Study + Erinnerungs-CTA.
 */
export async function sendTesterDrip7dMail({
    to,
    name,
    locale = "de",
    source = "website",
    domain = "",
    scoreBand = "mittel",
    unsubscribeToken = ""
} = {}) {
    const lng = wtLocale(locale);
    const isEn = lng === "en";
    const person = String(name || "").trim() || (isEn ? "there" : "dir");
    const srcLabel = sourceLabel(source, lng);
    const base = testerBaseUrl();
    const bookingUrl = `${base}${isEn ? "/en/booking" : "/booking"}?src=${encodeURIComponent(source)}-tester${domain ? `&domain=${encodeURIComponent(domain)}` : ""}${scoreBand ? `&score=${encodeURIComponent(scoreBand)}` : ""}`;
    const ratgeberUrl = `${base}${isEn ? "/en/ratgeber" : "/ratgeber"}`;
    const subject = isEn
        ? `A quick case study + your next step for ${domain || "your site"}`
        : `Kurze Case-Study + dein nächster Schritt für ${domain || "deine Website"}`;

    const bodyHtml = isEn ? `
      <p>Hello ${person},</p>
      <p>a quick update a week after your ${srcLabel} report:</p>
      <p>Clients who acted on the top three priorities from a tester report typically saw <strong>measurable changes within 4–8 weeks</strong> — more qualified visitors, better snippets, fewer wasted clicks.</p>
      <p>If you'd like to plan the same path for ${domain ? `<strong>${safeHtml(domain)}</strong>` : "your site"}, let's talk in a free 30-min call:</p>
      <p><a href="${bookingUrl}">Book a free consultation</a></p>
      <p>More stories, tips and checklists: <a href="${ratgeberUrl}">${ratgeberUrl}</a></p>
      ${newsletterHintHtml({ locale: lng, unsubscribeToken })}
      <p>Best regards<br>Komplett Webdesign</p>
    ` : `
      <p>Hallo ${person},</p>
      <p>eine Woche nach deinem ${srcLabel}-Report kurz ein Blick in die Praxis:</p>
      <p>Kundinnen und Kunden, die die Top-3-Prioritäten aus einem Tester-Report umgesetzt haben, berichten typischerweise von <strong>messbaren Effekten innerhalb von 4–8 Wochen</strong> – mehr qualifizierte Besuchende, bessere Snippets, weniger verlorene Klicks.</p>
      <p>Falls du denselben Weg für ${domain ? `<strong>${safeHtml(domain)}</strong>` : "deine Website"} gehen willst, lass uns in einem kostenlosen 30-Min.-Gespräch planen:</p>
      <p><a href="${bookingUrl}">Kostenloses Erstgespräch buchen</a></p>
      <p>Mehr Stories, Tipps und Checklisten: <a href="${ratgeberUrl}">${ratgeberUrl}</a></p>
      ${newsletterHintHtml({ locale: lng, unsubscribeToken })}
      <p>Beste Grüße<br>Komplett Webdesign</p>
    `;

    return transporter.sendMail({
        from: '"Komplett Webdesign" <kontakt@komplettwebdesign.de>',
        to,
        subject,
        html: renderBrandEmail({
            locale: lng,
            subject,
            headline: isEn ? "Your next step — made simple" : "Dein nächster Schritt – einfach gemacht",
            preheader: isEn
                ? "A short case study and a 30-min call that moves the needle."
                : "Eine kurze Case-Study und ein 30-Min.-Gespräch, das etwas bewegt.",
            bodyHtml
        })
    });
}
