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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ATTACHMENTS = 10;
const MAX_TOTAL_ATTACHMENT_SIZE = 15 * 1024 * 1024; // 15 MB

const LABEL_OVERRIDES = {
    name: "Name",
    fullname: "Name",
    full_name: "Name",
    vorname: "Vorname",
    firstname: "Vorname",
    nachname: "Nachname",
    lastname: "Nachname",
    email: "E-Mail",
    mail: "E-Mail",
    emailadresse: "E-Mail",
    email_adresse: "E-Mail",
    emailaddress: "E-Mail",
    email_address: "E-Mail",
    telefon: "Telefon",
    phone: "Telefon",
    tel: "Telefon",
    company: "Firma",
    firma: "Firma",
    unternehmen: "Unternehmen",
    website: "Website",
    webseite: "Webseite",
    domain: "Domain",
    url: "URL",
    goals: "Ziele",
    ziel: "Ziel",
    ziele: "Ziele",
    budget: "Budget",
    preisrahmen: "Budget",
    kostenrahmen: "Budget",
    timeline: "Zeitplan",
    zeitplan: "Zeitplan",
    startdatum: "Startdatum",
    message: "Nachricht",
    nachricht: "Nachricht",
    sonstiges: "Sonstiges",
    bemerkungen: "Bemerkungen",
    projekt: "Projekt",
    project: "Projekt",
    projecttype: "Projekt",
    projektart: "Projektart",
    dienstleistung: "Dienstleistung",
    services: "Leistungen",
    service: "Leistungen",
    leistungen: "Leistungen",
    inhalte: "Inhalte",
    district: "Bezirk",
    stadtteil: "Stadtteil",
    bezirk: "Bezirk",
    currentwebsite: "Bestehende Website",
    websitevorhanden: "Bestehende Website",
    bestandswebsite: "Bestehende Website",
    utm_source: "UTM Source",
    utm_medium: "UTM Medium",
    utm_campaign: "UTM Kampagne"
};

const KNOWN_FORM_KEYS = new Set([
    "name", "fullname", "full_name",
    "vorname", "firstname", "first_name",
    "nachname", "lastname", "last_name",
    "email", "mail", "emailadresse", "email_adresse", "emailaddress", "email_address",
    "telefon", "phone", "tel", "phone_number", "telefonnummer",
    "company", "firma", "unternehmen", "business",
    "website", "webseite", "domain", "url", "current_site",
    "goals", "ziel", "ziele", "ziele_projekt", "ziele_des_projekts",
    "budget", "preisrahmen", "kostenrahmen",
    "timeline", "zeitplan", "startdatum", "start", "go_live",
    "message", "nachricht", "notes", "bemerkungen", "sonstiges", "beschreibung", "anliegen",
    "projekt", "project", "projectType", "projecttype", "projektart", "dienstleistung",
    "services", "service", "leistungen", "inhalte",
    "currentWebsite", "websiteVorhanden", "bestandswebsite",
    "district", "stadtteil", "bezirk",
    "utm_source", "utm_medium", "utm_campaign",
    "paket", "umfang", "texterstellung", "bilderstellung", "weitereWuensche",
    "slotId", "token"
]);

function expectsJson(req) {
    if (req.get("X-Requested-With")?.toLowerCase() === "xmlhttprequest") return true;
    const accept = req.headers.accept || "";
    const contentType = req.headers["content-type"] || "";
    return /application\/json/i.test(accept) || /application\/json/i.test(contentType);
}

const createTransporter = () => nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

const webdesignBerlinMulter = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_TOTAL_ATTACHMENT_SIZE }
});

export const webdesignBerlinUpload = (req, res, next) => {
    webdesignBerlinMulter.array("attachments", MAX_ATTACHMENTS)(req, res, err => {
        if (!err) return next();

        let message = "Deine Dateien konnten nicht hochgeladen werden.";
        if (err instanceof multer.MulterError) {
            if (err.code === "LIMIT_FILE_SIZE") {
                message = "Jede Datei darf maximal 15 MB groß sein.";
            } else if (err.code === "LIMIT_FILE_COUNT") {
                message = `Du kannst maximal ${MAX_ATTACHMENTS} Dateien hochladen.`;
            } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
                message = "Es wurde ein unerwartetes Dateifeld hochgeladen.";
            }
        }

        if (expectsJson(req)) {
            return res.status(400).json({ success: false, message });
        }
        return res.status(400).send(message);
    });
};

const escapeHtml = value => String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatLabel = key => {
    if (LABEL_OVERRIDES[key]) return LABEL_OVERRIDES[key];
    return key
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/[._-]+/g, " ")
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, c => c.toUpperCase());
};

const toCleanString = value => {
    if (value === undefined || value === null) return "";
    return String(value).trim();
};

const toPlainValue = value => {
    if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean).join(", ");
    if (value && typeof value === "object") return JSON.stringify(value);
    return toCleanString(value);
};

const toHtmlValue = value => {
    if (Array.isArray(value)) return value.map(v => escapeHtml(toCleanString(v))).join(", ");
    if (value && typeof value === "object") return escapeHtml(JSON.stringify(value));
    const str = toCleanString(value);
    return str ? escapeHtml(str) : "&mdash;";
};

const joinNonEmpty = (parts, separator = " | ") => parts.map(p => toCleanString(p)).filter(Boolean).join(separator);

function pickField(body, keys) {
    for (const key of keys) {
        if (body[key] !== undefined && toCleanString(body[key])) {
            return toCleanString(body[key]);
        }
    }
    return "";
}

function normalizeWebdesignBerlinBody(body) {
    const firstName = pickField(body, ["name", "fullname", "full_name", "vorname", "firstname", "first_name"]);
    const lastName = pickField(body, ["nachname", "lastname", "last_name"]);
    const explicitName = pickField(body, ["name", "fullname", "full_name"]);
    const name = explicitName || joinNonEmpty([firstName, lastName], " ") || firstName;

    const email = pickField(body, [
        "email", "mail", "emailadresse", "email_adresse", "emailaddress", "email_address"
    ]);

    const phone = pickField(body, ["telefon", "phone", "tel", "phone_number", "telefonnummer"]);
    const company = pickField(body, ["company", "firma", "unternehmen", "business"]);
    const website = pickField(body, ["website", "webseite", "domain", "url", "current_site"]);
    const projectType = pickField(body, [
        "projekt", "project", "projectType", "projecttype", "projektart", "dienstleistung"
    ]);
    const goals = pickField(body, ["goals", "ziel", "ziele", "ziele_projekt", "ziele_des_projekts"]);
    const budget = pickField(body, ["budget", "preisrahmen", "kostenrahmen"]);
    const timeline = pickField(body, ["timeline", "zeitplan", "startdatum", "start", "go_live"]);
    const message = pickField(body, [
        "message", "nachricht", "notes", "bemerkungen", "sonstiges", "beschreibung", "anliegen"
    ]);
    const currentWebsite = pickField(body, ["currentWebsite", "websiteVorhanden", "bestandswebsite"]);
    const location = pickField(body, ["district", "stadtteil", "bezirk"]);

    const servicesField = body.services ?? body.service ?? body.leistungen ?? body.inhalte ?? null;
    const services = Array.isArray(servicesField)
        ? servicesField.map(v => toCleanString(v)).filter(Boolean)
        : toCleanString(servicesField)
            ? toCleanString(servicesField).split(/[,;\n]/).map(v => v.trim()).filter(Boolean)
            : [];

    const utmSource = pickField(body, ["utm_source"]);
    const utmMedium = pickField(body, ["utm_medium"]);
    const utmCampaign = pickField(body, ["utm_campaign"]);

    const usedKeys = new Set(KNOWN_FORM_KEYS);

    const extras = Object.entries(body)
        .filter(([key]) => !usedKeys.has(key))
        .map(([key, value]) => [key, value]);

    return {
        name,
        email,
        phone,
        company,
        website,
        projectType,
        goals,
        budget,
        timeline,
        message,
        currentWebsite,
        services,
        location,
        utmSource,
        utmMedium,
        utmCampaign,
        extras
    };
}

const buildHtmlSummary = rows => `
    <table style="border-collapse:collapse;width:100%;max-width:640px">${rows.map(([label, value]) => `
        <tr>
            <th style="text-align:left;padding:6px 8px;border:1px solid #e5e5e5;background:#f8f9fa;white-space:nowrap;">${escapeHtml(label)}</th>
            <td style="padding:6px 8px;border:1px solid #e5e5e5;">${toHtmlValue(value)}</td>
        </tr>
    `).join("")}
    </table>
`;


const generalUpload = multer({ dest: "uploads/" });

/* ---------- GET /kontakt --------------------------------------------- */
export async function showForm(req, res) {
    const freieTermine = await Apt.getOpenSlotPerDay(3);
    const canonical = `${(res.locals.canonicalBaseUrl || 'https://www.komplettwebdesign.de').replace(/\/$/, '')}/kontakt`;
    res.render("kontakt", {
        title: "Beratungsgespräch vereinbaren",
        description: "Beschreibe uns deine Wünsche, teile uns deine Vorstellungen mit und vereinbare einen Termin für ein Beratungsgespräch. Wir freuen uns auf deine Anfrage!",
        keywords: 'webseite erstellen lassen berlin, webdesign berlin kontakt, erstgespräch webdesign',
        seoExtra: `
          <meta property="og:title" content="Vereinbare deinen Beratungstermin – Komplett Webdesign">
          <meta property="og:site_name" content="Komplett Webdesign Kontakt">
          <meta property="og:description" content="Nutze unser Kontaktformular, um dein individuelles Webdesign-Projekt zu starten. Wähle Paket, Umfang und Termin für dein Beratungsgespräch.">
          <meta property="og:image" content="https://www.komplettwebdesign.de/images/heroBg.webp">
          <meta property="og:url" content="${canonical}">
        `,
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
    generalUpload.array("images"),
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
                if (!slot) return res.render("booking/slot_taken", { title: "Termin vergeben", description: "Leider war jemand schneller. Bitte wählen Sie einen anderen Termin." });

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
            // <tr><th>Weitere Wünsche:</th><td>${req.body.weitereWuensche || 'Keine'}</td></tr>
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

            const transporter = createTransporter();


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

/* ---------- POST /webdesign-berlin/kontakt --------------------------- */
export async function processWebdesignBerlinForm(req, res) {
    const token = toCleanString(req.body.token);
    if (token) {
        try {
            const resp = await axios.post(
                "https://www.google.com/recaptcha/api/siteverify",
                null,
                { params: { secret: process.env.RECAPTCHA_SECRET, response: token } }
            );
            if (!resp.data.success) throw new Error("reCaptcha failed");
        } catch (err) {
            console.error("❌ reCaptcha-Validierung (Webdesign Berlin)", err);
            const message = "reCaptcha-Validierung fehlgeschlagen";
            if (expectsJson(req)) {
                return res.status(400).json({ success: false, message });
            }
            return res.status(400).send(message);
        }
    }

    const normalized = normalizeWebdesignBerlinBody(req.body || {});
    const hasValidEmail = normalized.email && EMAIL_REGEX.test(normalized.email);
    const hasName = toCleanString(normalized.name);
    const attachments = Array.isArray(req.files) ? req.files : [];
    if (!hasName || !hasValidEmail) {
        const message = "Bitte gib deinen Namen und eine gültige E-Mail-Adresse an.";
        if (expectsJson(req)) {
            return res.status(422).json({ success: false, message });
        }
        return res.status(422).send(message);
    }

    if (attachments.length > MAX_ATTACHMENTS) {
        const message = `Du kannst maximal ${MAX_ATTACHMENTS} Dateien hochladen.`;
        if (expectsJson(req)) {
            return res.status(400).json({ success: false, message });
        }
        return res.status(400).send(message);
    }

    const totalAttachmentSize = attachments.reduce((sum, file) => sum + (file?.size || 0), 0);
    if (totalAttachmentSize > MAX_TOTAL_ATTACHMENT_SIZE) {
        const message = "Die hochgeladenen Dateien überschreiten die maximale Gesamtgröße von 15 MB.";
        if (expectsJson(req)) {
            return res.status(400).json({ success: false, message });
        }
        return res.status(400).send(message);
    }


    const addRow = (rows, label, value) => {
        if (Array.isArray(value)) {
            const filtered = value.map(v => toCleanString(v)).filter(Boolean);
            if (filtered.length) rows.push([label, filtered]);
            return;
        }
        if (toCleanString(value)) rows.push([label, value]);
    };

    const summaryRows = [];
    addRow(summaryRows, "Name", normalized.name);
    addRow(summaryRows, "E-Mail", normalized.email);
    addRow(summaryRows, "Telefon", normalized.phone);
    addRow(summaryRows, "Firma", normalized.company);
    addRow(summaryRows, "Bezirk", normalized.location);
    addRow(summaryRows, "Projekt", normalized.projectType);
    addRow(summaryRows, "Website", normalized.website);
    addRow(summaryRows, "Bestehende Website", normalized.currentWebsite);
    addRow(summaryRows, "Leistungen", normalized.services);
    addRow(summaryRows, "Ziele", normalized.goals);
    addRow(summaryRows, "Budget", normalized.budget);
    addRow(summaryRows, "Zeitplan", normalized.timeline);
    addRow(summaryRows, "Nachricht", normalized.message);
    if (attachments.length) {
        addRow(summaryRows, "Dateien", attachments.map(file => file.originalname));
    }
    addRow(summaryRows, "UTM Source", normalized.utmSource);
    addRow(summaryRows, "UTM Medium", normalized.utmMedium);
    addRow(summaryRows, "UTM Kampagne", normalized.utmCampaign);

    normalized.extras.forEach(([key, value]) => addRow(summaryRows, formatLabel(key), value));

    const summaryHtml = buildHtmlSummary(summaryRows);
    const summaryPlain = summaryRows
        .map(([label, value]) => `${label}: ${toPlainValue(value)}`)
        .join(" | ");

    const extrasPlain = normalized.extras
        .map(([key, value]) => `${formatLabel(key)}: ${toPlainValue(value)}`)
        .join(" | ");
    const utmPlain = joinNonEmpty([
        normalized.utmSource && `UTM Source: ${normalized.utmSource}`,
        normalized.utmMedium && `UTM Medium: ${normalized.utmMedium}`,
        normalized.utmCampaign && `UTM Kampagne: ${normalized.utmCampaign}`
    ]);

    const featuresOther = joinNonEmpty([
        normalized.website && `Website: ${normalized.website}`,
        normalized.currentWebsite && `Bestehende Website: ${normalized.currentWebsite}`,
        normalized.location && `Bezirk: ${normalized.location}`,
        extrasPlain,
        utmPlain
    ]);
    const additionalInfo = joinNonEmpty([
        normalized.message,
        normalized.goals && `Ziele: ${normalized.goals}`,
        normalized.budget && `Budget: ${normalized.budget}`,
        normalized.timeline && `Zeitplan: ${normalized.timeline}`
    ]);

    try {
        await CReq.create({
            paket: normalized.projectType || "Webdesign Berlin Anfrage",
            umfang: normalized.goals || null,
            texterstellung: "n/a",
            bilderstellung: "n/a",
            features: normalized.services.length ? normalized.services.join(", ") : "",
            featuresOther: featuresOther || summaryPlain,
            bookingId: null,
            name: normalized.name,
            email: normalized.email,
            phone: normalized.phone || "",
            company: normalized.company || "",
            additionalInfo: additionalInfo || summaryPlain,
            images: "",
            appointmentTime: null
        });
    } catch (err) {
        console.error("❌ Fehler beim Speichern der Webdesign-Berlin-Anfrage:", err);
    }

    const transporter = createTransporter();
    const greetingName = escapeHtml(normalized.name || "Interessent:in");
    const attachmentListHtml = attachments.length
        ? `<p>Folgende Dateien hast du übermittelt:</p><ul>${attachments
            .map(file => `<li>${escapeHtml(file.originalname)}</li>`)
            .join("")}</ul>`
        : "";
    const uploadHintHtml = `<p style="color:#6c757d;font-size:14px;">Hinweis: Du kannst bis zu ${MAX_ATTACHMENTS} Dateien mit insgesamt 15 MB senden.</p>`;
    const userHtml = `
        <p>Hallo <strong>${greetingName}</strong>,</p>
        <p>vielen Dank für deine Anfrage über unsere Seite Webdesign-Berlin. Wir haben die folgenden Angaben erhalten:</p>
        ${summaryHtml}
        ${attachmentListHtml}
        ${uploadHintHtml}
        <p>Wir melden uns in Kürze bei dir, um die nächsten Schritte zu besprechen.</p>
        <p>Mit freundlichen Grüßen<br>Dein Komplett Webdesign-Team</p>
    `;
    const adminHtml = `
        <p>Neue Anfrage über die Landingpage <strong>Webdesign Berlin</strong>.</p>
        ${summaryHtml}
    `;
    const adminAttachments = attachments.map(file => ({
        filename: file.originalname,
        content: file.buffer,
        contentType: file.mimetype
    }));

    const mailPromises = [];
    if (hasValidEmail) {
        mailPromises.push(
            transporter.sendMail({
                from: '"KomplettWebdesign" <kontakt@komplettwebdesign.de>',
                to: normalized.email,
                subject: "Bestätigung deiner Anfrage – Webdesign Berlin",
                html: userHtml
            }).catch(err => console.error("❌ Fehler beim Versand (Kunde Webdesign Berlin):", err))
        );
    }
    mailPromises.push(
        transporter.sendMail({
            from: '"KomplettWebdesign" <kontakt@komplettwebdesign.de>',
            to: 'kontakt@komplettwebdesign.de',
            replyTo: hasValidEmail ? normalized.email : undefined,
            subject: `Neue Webdesign-Berlin-Anfrage von ${normalized.name}`,
            html: adminHtml,
            attachments: adminAttachments
        }).catch(err => console.error("❌ Fehler beim Versand (Admin Webdesign Berlin):", err))
    );
    await Promise.all(mailPromises);

    const successPayload = {
        success: true,
        message: "Danke für deine Anfrage. Wir melden uns schnellstmöglich."
    };

    if (expectsJson(req)) {
        return res.json(successPayload);
    }

    const thankYouData = {
        paket: normalized.projectType || "Webdesign Berlin",
        umfang: normalized.goals || "",
        inhalte: normalized.services,
        weitereWuensche: featuresOther,
        name: normalized.name,
        email: normalized.email,
        telefon: normalized.phone,
        firma: normalized.company,
        sonstigeInfos: additionalInfo
    };

    return res.render('kontakt/thankyou', {
        title: 'Danke für deine Anfrage',
        description: 'Bestätigung deiner Kontaktanfrage',
        data: thankYouData,
        appointment: null,
        formattedAppointment: null
    });
}


/* ---------- GET /kontakt/ics/:id ------------------------------------ */
export async function downloadIcs(req, res) {
    const aptId = Number(req.params.id);
    const apt = await Apt.getById(aptId);
    if (!apt) return res.status(404).send('Termin nicht gefunden');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=Beratungstermin.ics');
    res.send(generateICS(apt, 'pending'));
}
