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
import { renderBrandEmail } from "../services/emailTemplateService.js";
import pricingService from "../services/pricingService.js";
import { toEnglishPriceLabel } from "../util/pricingViewModel.js";
import {
    PACKAGE_GLOBAL_NOTES,
    budgetOptions,
    contentStatusOptions,
    existingWebsiteStatusOptions,
    hostingMaintenanceOptions,
    optionalFeatureOptions,
    pageScopeOptions,
    preferredContactOptions,
    projectTypeOptions,
    timelineOptions
} from "../data/packages.js";
import {
    contactFlowDefinitions,
    contactBranchOptionGroups,
    getRequiredFieldsForProjectType,
    getSummaryFieldsForProjectType,
    isFieldRequiredForProjectType
} from "../data/contactFlows.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ATTACHMENTS = 10;
const MAX_TOTAL_ATTACHMENT_SIZE = 15 * 1024 * 1024; // 15 MB
const MAX_GENERAL_UPLOAD_FILE_SIZE = 5 * 1024 * 1024; // 5 MB per image
const ALLOWED_GENERAL_UPLOAD_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif"
]);

function logSafeError(label, err) {
    console.error(label, err?.message || "Unbekannter Fehler");
}

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
    budgetRange: "Budgetrahmen",
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
    packageInterest: "Paketinteresse",
    projecttype: "Projekt",
    projektart: "Projektart",
    dienstleistung: "Dienstleistung",
    preferredContact: "Bevorzugter Kontaktweg",
    existingWebsiteStatus: "Bestehende Website",
    existingWebsiteUrl: "Aktuelle Website-URL",
    pageScope: "Seitenumfang",
    contentStatus: "Inhalte/Texte",
    optionalFeatures: "Zusatzfunktionen",
    hostingMaintenanceInterest: "Hosting/Wartung",
    relaunchGoals: "Relaunch-Ziele",
    googleBusinessProfileStatus: "Google Business Profile",
    localSeoArea: "Zielgebiet",
    seoFocus: "SEO-Fokus",
    auditFocus: "Prüffokus",
    auditDepth: "Gewünschtes Ergebnis",
    landingpageGoal: "Landingpage-Ziel",
    landingpageSource: "Landingpage-Ausgangslage",
    maintenanceNeed: "Wartungsbedarf",
    maintenanceUrgency: "Dringlichkeit",
    customFeatureType: "Gewünschte Erweiterung",
    customFeatureDependencies: "Abhängigkeiten",
    bugfixUrgency: "Dringlichkeit",
    bugfixDescription: "Problembeschreibung",
    uncertaintyNotes: "Klärungsbedarf",
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
    source: "Quelle",
    auditid: "Audit-ID",
    auditId: "Audit-ID",
    scoreband: "Score-Band",
    scoreBand: "Score-Band",
    topissues: "Top-Baustellen",
    topIssues: "Top-Baustellen",
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
    "budget", "budgetRange", "preisrahmen", "kostenrahmen",
    "timeline", "zeitplan", "startdatum", "start", "go_live",
    "message", "nachricht", "notes", "bemerkungen", "sonstiges", "beschreibung", "anliegen",
    "projekt", "project", "projectType", "projecttype", "projektart", "dienstleistung",
    "packageInterest", "preferredContact", "existingWebsiteStatus", "existingWebsiteUrl",
    "pageScope", "contentStatus", "optionalFeatures", "hostingMaintenanceInterest",
    "relaunchGoals", "googleBusinessProfileStatus", "localSeoArea", "seoFocus",
    "auditFocus", "auditDepth", "landingpageGoal", "landingpageSource",
    "maintenanceNeed", "maintenanceUrgency", "customFeatureType", "customFeatureDependencies",
    "bugfixUrgency", "bugfixDescription", "uncertaintyNotes",
    "privacyConsent", "startedAt", "contactWebsite",
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

function normalizeWebdesignBerlinBody(body, packageOptions = []) {
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
    const packageInterest = pickField(body, ["packageInterest", "paket"]);
    const goals = pickField(body, ["goals", "ziel", "ziele", "ziele_projekt", "ziele_des_projekts"]);
    const budget = pickField(body, ["budgetRange", "budget", "preisrahmen", "kostenrahmen"]);
    const timeline = pickField(body, ["timeline", "zeitplan", "startdatum", "start", "go_live"]);
    const message = pickField(body, [
        "message", "nachricht", "notes", "bemerkungen", "sonstiges", "beschreibung", "anliegen"
    ]);
    const currentWebsite = pickField(body, ["existingWebsiteStatus", "currentWebsite", "websiteVorhanden", "bestandswebsite"]);
    const existingWebsiteUrl = pickField(body, ["existingWebsiteUrl", "website", "webseite", "domain", "url", "current_site"]);
    const pageScope = pickField(body, ["pageScope", "umfang"]);
    const contentStatus = pickField(body, ["contentStatus", "texterstellung"]);
    const hostingMaintenanceInterest = pickField(body, ["hostingMaintenanceInterest"]);
    const preferredContact = pickField(body, ["preferredContact"]);
    const location = pickField(body, ["district", "stadtteil", "bezirk"]);

    const servicesField = body.optionalFeatures ?? body.services ?? body.service ?? body.leistungen ?? body.inhalte ?? null;
    const services = Array.isArray(servicesField)
        ? servicesField.map(v => toCleanString(v)).filter(Boolean)
        : toCleanString(servicesField)
            ? toCleanString(servicesField).split(/[,;\n]/).map(v => v.trim()).filter(Boolean)
            : [];

    const utmSource = pickField(body, ["utm_source"]);
    const utmMedium = pickField(body, ["utm_medium"]);
    const utmCampaign = pickField(body, ["utm_campaign"]);
    const source = pickField(body, ["source"]);

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
        projectType: normalizeContactOption("projectType", projectType, projectType),
        packageInterest: normalizeContactOption("packageInterest", packageInterest, CONTACT_DEFAULTS.packageInterest, packageOptions),
        goals,
        budget: normalizeContactOption("budgetRange", budget, budget),
        timeline: normalizeContactOption("timeline", timeline, timeline),
        message,
        currentWebsite: normalizeContactOption("existingWebsiteStatus", currentWebsite, currentWebsite),
        existingWebsiteUrl,
        pageScope: normalizeContactOption("pageScope", pageScope, pageScope),
        contentStatus: normalizeContactOption("contentStatus", contentStatus, contentStatus),
        hostingMaintenanceInterest: normalizeContactOption("hostingMaintenanceInterest", hostingMaintenanceInterest, hostingMaintenanceInterest),
        preferredContact: normalizeContactOption("preferredContact", preferredContact, preferredContact),
        services: normalizeContactArray("optionalFeatures", services),
        location,
        utmSource,
        utmMedium,
        utmCampaign,
        source,
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

const CONTACT_OPTION_GROUPS = Object.freeze({
    projectType: projectTypeOptions,
    packageInterest: [],
    budgetRange: budgetOptions,
    timeline: timelineOptions,
    existingWebsiteStatus: existingWebsiteStatusOptions,
    pageScope: pageScopeOptions,
    contentStatus: contentStatusOptions,
    optionalFeatures: optionalFeatureOptions,
    hostingMaintenanceInterest: hostingMaintenanceOptions,
    preferredContact: preferredContactOptions,
    ...contactBranchOptionGroups
});

const CONTACT_DEFAULTS = Object.freeze({
    projectType: "unsure",
    packageInterest: "unsure",
    budgetRange: "open",
    timeline: "open",
    existingWebsiteStatus: "unsure",
    pageScope: "unsure",
    contentStatus: "unsure",
    hostingMaintenanceInterest: "unsure",
    preferredContact: "email",
    googleBusinessProfileStatus: "unsure",
    auditDepth: "unsure",
    landingpageGoal: "unsure",
    landingpageSource: "unsure",
    maintenanceUrgency: "unsure",
    bugfixUrgency: "unsure"
});

const LEAD_SPECIAL_FEATURES = new Set([
    "booking-system",
    "cms",
    "multilingual",
    "animations",
    "migration",
    "tracking",
    "local-seo",
    "google-business-profile",
    "landingpage",
    "audit",
    "shop-feature"
]);

const PACKAGE_RELEVANT_PROJECT_TYPES = new Set([
    "new-website",
    "relaunch",
    "landingpage",
    "custom-feature",
    "unsure"
]);

const BUDGET_TIMELINE_RELEVANT_PROJECT_TYPES = new Set([
    "new-website",
    "relaunch",
    "landingpage",
    "local-seo",
    "audit",
    "custom-feature",
    "unsure"
]);

const PAGE_SCOPE_RELEVANT_PROJECT_TYPES = new Set([
    "new-website",
    "relaunch"
]);

const CONTENT_RELEVANT_PROJECT_TYPES = new Set([
    "new-website",
    "relaunch",
    "landingpage"
]);

const CONTACT_VALUE_ALIASES = Object.freeze({
    projectType: {
        "neue-website": "new-website",
        "website-relaunch": "relaunch",
        "website-wartung": "maintenance",
        wartung: "maintenance",
        "website-audit": "audit",
        "website-check": "audit",
        "website-test": "audit",
        "website-tester": "audit",
        "seo": "local-seo",
        "seo-optimierung": "local-seo",
        zusatzfunktion: "custom-feature",
        zusatzleistung: "custom-feature",
        unsicher: "unsure"
    },
    packageInterest: {
        basis: "start",
        premium: "wachstum",
        unsicher: "unsure"
    },
    budgetRange: {
        "under-1500": "799-1499",
        "bis-1500": "799-1499",
        "over-4000": "4000-plus"
    },
    timeline: {
        unsicher: "open"
    },
    existingWebsiteStatus: {
        unsicher: "unsure"
    },
    pageScope: {
        "1-seite": "onepager",
        "2-5": "4-7",
        ">5": "8-12",
        unsicher: "unsure"
    },
    contentStatus: {
        erstellt: "copywriting-needed",
        eigen: "content-ready",
        unsicher: "unsure"
    },
    optionalFeatures: {
        zusatzseiten: "extra-pages",
        buchungssystem: "booking-system",
        mehrsprachigkeit: "multilingual",
        animationen: "animations",
        wartung: "maintenance",
        inhaltsmigration: "migration",
        unsicher: "unsure"
    },
    hostingMaintenanceInterest: {
        wartung: "maintenance",
        unsicher: "unsure"
    },
    auditDepth: {
        "website-test": "quick-check",
        "website-tester": "quick-check",
        unsicher: "unsure"
    },
    googleBusinessProfileStatus: {
        ja: "yes",
        nein: "no",
        unsicher: "unsure"
    },
    landingpageGoal: {
        anfrage: "request",
        termin: "appointment",
        kampagne: "campaign",
        unsicher: "unsure"
    },
    landingpageSource: {
        neu: "new",
        bestehend: "existing-site",
        unsicher: "unsure"
    },
    maintenanceUrgency: {
        regelmaessig: "regular",
        regelmäßig: "regular",
        akut: "acute",
        unsicher: "unsure"
    },
    bugfixUrgency: {
        kritisch: "critical",
        sichtbar: "visible",
        klein: "minor",
        unsicher: "unsure"
    }
});

const contactFaqs = Object.freeze([
    {
        question: "Ist die Anfrage unverbindlich?",
        questionEn: "Is the request non-binding?",
        answer: "Ja. Deine Anfrage dient erst der Einschätzung. Ein Projekt startet erst nach Abstimmung, Angebot und Freigabe.",
        answerEn: "Yes. Your request is for an initial assessment. A project only starts after scope, offer and approval are clarified."
    },
    {
        question: "Muss ich schon genau wissen, welches Paket passt?",
        questionEn: "Do I need to know the right package already?",
        answer: "Nein. Wenn du unsicher bist, wähle einfach „Noch unsicher“. Ich ordne den Umfang nach deiner Anfrage grob ein.",
        answerEn: "No. If you are unsure, choose \"Not sure yet\". I classify the rough scope after your request."
    },
    {
        question: "Warum fragst du nach einem Budgetrahmen?",
        questionEn: "Why do you ask for a budget range?",
        answer: "Ein grober Budgetrahmen hilft, dir eine realistische Empfehlung zu geben. Er ist keine automatische Verpflichtung.",
        answerEn: "A rough budget range helps me give a realistic recommendation. It is not an automatic commitment."
    },
    {
        question: "Was passiert nach dem Absenden?",
        questionEn: "What happens after submitting?",
        answer: "Ich schaue mir deine Angaben an. Wenn Informationen fehlen, frage ich nach. Danach bekommst du eine grobe Einschätzung oder einen Vorschlag für den nächsten Schritt.",
        answerEn: "I review your details. If information is missing, I ask follow-up questions. Then you receive a rough assessment or a suggested next step."
    },
    {
        question: "Sind Buchungssysteme, CMS oder Shops möglich?",
        questionEn: "Are booking systems, CMS or shops possible?",
        answer: "Ja, aber nicht automatisch als Standardpaket. Solche Funktionen werden vorab geprüft und separat kalkuliert.",
        answerEn: "Yes, but not automatically as part of a standard package. These features are reviewed and estimated separately."
    },
    {
        question: "Sind Hosting und Wartung enthalten?",
        questionEn: "Are hosting and maintenance included?",
        answer: "Hosting, Domain, E-Mail, Wartung und Drittanbieter-Tools sind nicht automatisch im Projektpreis enthalten und werden separat abgestimmt.",
        answerEn: "Hosting, domain, email, maintenance and third-party tools are not automatically included in the project price and are clarified separately."
    },
    {
        question: "Muss ich schon fertige Texte haben?",
        questionEn: "Do I need finished texts already?",
        answer: "Nein. Gelieferte Inhalte können eingebunden und strukturiert werden. Umfangreiche Texterstellung ist eine Zusatzleistung.",
        answerEn: "No. Provided content can be added and structured. Extensive copywriting is an add-on."
    },
    {
        question: "Werden Rechtstexte und SEO-Ergebnisse garantiert?",
        questionEn: "Are legal texts and SEO results guaranteed?",
        answer: "Nein. Rechtlich relevante Seiten können technisch eingebunden werden, ersetzen aber keine Rechtsberatung. Technische SEO-Grundlagen sind möglich, bestimmte Rankings werden nicht garantiert.",
        answerEn: "No. Legal pages can be technically integrated, but this does not replace legal advice. Technical SEO basics are possible, but specific rankings are not guaranteed."
    }
]);

function localizedOption(option, lng) {
    if (!option || typeof option !== "object") return option;
    return {
        ...option,
        label: lng === "en" && option.labelEn ? option.labelEn : option.label,
        hint: lng === "en" && option.hintEn ? option.hintEn : option.hint
    };
}

function localizePackageFormOption(option, lng) {
    if (!option || typeof option !== "object") return option;
    if (lng !== "en") return option;

    return {
        ...option,
        label: toEnglishPriceLabel(option.label),
        hint: option.hint
            ? "Website package with clear scope."
            : option.hint
    };
}

async function buildContactPackageOptions(lng) {
    const dbOptions = await pricingService.getPackagesForContactForm();
    const localizedOptions = dbOptions.map(option => localizePackageFormOption(option, lng));
    return [
        ...localizedOptions,
        {
            value: "unsure",
            label: lng === "en" ? "Not sure yet" : "Noch unsicher",
            hint: lng === "en"
                ? "I will classify the likely scope after your request."
                : "Ich ordne den wahrscheinlichen Umfang nach deiner Anfrage ein."
        }
    ];
}

function buildContactFormOptions(lng, packageOptions = []) {
    return Object.fromEntries(
        Object.entries(CONTACT_OPTION_GROUPS).map(([key, options]) => [
            key,
            key === "packageInterest"
                ? packageOptions
                : options.map(option => localizedOption(option, lng))
        ])
    );
}

function allowedValues(groupName, packageOptions = []) {
    if (groupName === "packageInterest") {
        const dynamicValues = packageOptions.map(option => option.value);
        return new Set([...dynamicValues, "start", "business", "wachstum", "individuell", "unsure"]);
    }
    return new Set((CONTACT_OPTION_GROUPS[groupName] || []).map(option => option.value));
}

function normalizeContactOption(groupName, value, fallback = "", packageOptions = []) {
    const raw = toCleanString(value).toLowerCase();
    if (!raw) return fallback;
    const alias = CONTACT_VALUE_ALIASES[groupName]?.[raw] || raw;
    return allowedValues(groupName, packageOptions).has(alias) ? alias : fallback;
}

function normalizeContactArray(groupName, value) {
    const list = Array.isArray(value) ? value : (toCleanString(value) ? [value] : []);
    const allowed = allowedValues(groupName);
    const normalized = list
        .map(item => {
            const raw = toCleanString(item).toLowerCase();
            return CONTACT_VALUE_ALIASES[groupName]?.[raw] || raw;
        })
        .filter(item => allowed.has(item));

    return [...new Set(normalized)];
}

function labelForOption(groupName, value, lng, packageOptions = []) {
    const normalized = groupName === "optionalFeatures"
        ? toCleanString(value)
        : normalizeContactOption(groupName, value, value, packageOptions);
    const optionList = groupName === "packageInterest"
        ? packageOptions
        : (CONTACT_OPTION_GROUPS[groupName] || []);
    const option = optionList.find(item => item.value === normalized);
    if (!option) return toCleanString(value);
    return localizedOption(option, lng).label;
}

function labelsForOptions(groupName, values, lng, packageOptions = []) {
    const normalized = normalizeContactArray(groupName, values);
    return normalized.map(value => labelForOption(groupName, value, lng, packageOptions));
}

function buildContactPreselect(query = {}, packageOptions = []) {
    return {
        packageInterest: normalizeContactOption("packageInterest", query.paket || query.packageInterest, "", packageOptions),
        projectType: normalizeContactOption("projectType", query.projektart || query.projectType, "")
    };
}

function buildContactSafeSearch(query = {}, packageOptions = []) {
    const params = new URLSearchParams();
    const packageInterest = normalizeContactOption("packageInterest", query.paket || query.packageInterest, "", packageOptions);
    const projectType = normalizeContactOption("projectType", query.projektart || query.projectType, "");
    if (packageInterest) params.set("paket", packageInterest);
    if (projectType) params.set("projektart", projectType);
    const value = params.toString();
    return value ? `?${value}` : "";
}

function pickValidatedDefaults(query = {}, values = {}, packageOptions = []) {
    const preselect = buildContactPreselect(query, packageOptions);
    const submittedValues = Object.fromEntries(Object.entries(values || {}).filter(([, value]) => value !== undefined && value !== null && value !== ""));
    return {
        ...submittedValues,
        ...Object.fromEntries(Object.entries(preselect).filter(([, value]) => value))
    };
}

function isValidOptionalUrl(value) {
    const raw = toCleanString(value);
    if (!raw) return true;
    const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
        const url = new URL(candidate);
        return Boolean(url.hostname && url.hostname.includes("."));
    } catch {
        return false;
    }
}

function safeSubjectText(value, fallback = "Kontaktanfrage") {
    const cleaned = toCleanString(value).replace(/[\r\n]+/g, " ").slice(0, 120);
    return cleaned || fallback;
}

function addSummaryRow(rows, label, value) {
    if (Array.isArray(value)) {
        const filtered = value.map(item => toCleanString(item)).filter(Boolean);
        if (filtered.length) rows.push([label, filtered]);
        return;
    }
    if (toCleanString(value)) rows.push([label, value]);
}

function buildContactStructuredData({ baseUrl, url, lng, faqs }) {
    const isEn = lng === "en";
    const faqEntities = (faqs || []).map(item => ({
        "@type": "Question",
        name: isEn && item.questionEn ? item.questionEn : item.question,
        acceptedAnswer: {
            "@type": "Answer",
            text: isEn && item.answerEn ? item.answerEn : item.answer
        }
    }));

    const graph = [
        {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
                {
                    "@type": "ListItem",
                    position: 1,
                    name: isEn ? "Home" : "Startseite",
                    item: `${baseUrl}${isEn ? "/en" : ""}`
                },
                {
                    "@type": "ListItem",
                    position: 2,
                    name: isEn ? "Contact" : "Kontakt",
                    item: url
                }
            ]
        },
        {
            "@context": "https://schema.org",
            "@type": "ContactPage",
            name: isEn ? "Request your website project" : "Website-Projekt anfragen",
            description: isEn
                ? "Contact page for website project requests in Berlin."
                : "Kontaktseite für Website-Projektanfragen in Berlin.",
            url,
            inLanguage: isEn ? "en" : "de-DE",
            isPartOf: {
                "@type": "WebSite",
                name: "Komplett Webdesign",
                url: baseUrl
            }
        }
    ];

    if (faqEntities.length) {
        graph.push({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqEntities
        });
    }

    return graph;
}

function normalizeContactBody(body, lng, packageOptions = []) {
    const optionalFeatures = normalizeContactArray("optionalFeatures", body.optionalFeatures || body.inhalte);
    const relaunchGoals = normalizeContactArray("relaunchGoals", body.relaunchGoals);
    const seoFocus = normalizeContactArray("seoFocus", body.seoFocus);
    const auditFocus = normalizeContactArray("auditFocus", body.auditFocus);
    const maintenanceNeed = normalizeContactArray("maintenanceNeed", body.maintenanceNeed);
    const customFeatureType = normalizeContactArray("customFeatureType", body.customFeatureType);
    const message = pickField(body, ["message", "nachricht", "sonstigeInfos", "notes", "bemerkungen", "beschreibung", "anliegen"]);

    return {
        source: toCleanString(body.source || "contact-page").slice(0, 80),
        name: pickField(body, ["name", "fullname", "full_name", "vorname", "firstname", "first_name"]).slice(0, 120),
        email: pickField(body, ["email", "mail", "emailadresse", "email_adresse", "emailaddress", "email_address"]).slice(0, 180),
        phone: pickField(body, ["phone", "telefon", "tel", "phone_number", "telefonnummer"]).slice(0, 80),
        company: pickField(body, ["company", "firma", "unternehmen", "business"]).slice(0, 160),
        preferredContact: normalizeContactOption("preferredContact", body.preferredContact, CONTACT_DEFAULTS.preferredContact),
        projectType: normalizeContactOption("projectType", body.projectType || body.projektart || body.projekt, CONTACT_DEFAULTS.projectType),
        packageInterest: normalizeContactOption("packageInterest", body.packageInterest || body.paket, CONTACT_DEFAULTS.packageInterest, packageOptions),
        budgetRange: normalizeContactOption("budgetRange", body.budgetRange || body.budget, CONTACT_DEFAULTS.budgetRange),
        timeline: normalizeContactOption("timeline", body.timeline || body.zeitplan, CONTACT_DEFAULTS.timeline),
        existingWebsiteStatus: normalizeContactOption("existingWebsiteStatus", body.existingWebsiteStatus, CONTACT_DEFAULTS.existingWebsiteStatus),
        existingWebsiteUrl: toCleanString(body.existingWebsiteUrl || body.website || body.webseite || body.domain).slice(0, 220),
        pageScope: normalizeContactOption("pageScope", body.pageScope || body.umfang, CONTACT_DEFAULTS.pageScope),
        contentStatus: normalizeContactOption("contentStatus", body.contentStatus || body.texterstellung, CONTACT_DEFAULTS.contentStatus),
        optionalFeatures,
        hostingMaintenanceInterest: normalizeContactOption("hostingMaintenanceInterest", body.hostingMaintenanceInterest, CONTACT_DEFAULTS.hostingMaintenanceInterest),
        relaunchGoals,
        googleBusinessProfileStatus: normalizeContactOption("googleBusinessProfileStatus", body.googleBusinessProfileStatus, CONTACT_DEFAULTS.googleBusinessProfileStatus),
        localSeoArea: toCleanString(body.localSeoArea).slice(0, 180),
        seoFocus,
        auditFocus,
        auditDepth: normalizeContactOption("auditDepth", body.auditDepth, CONTACT_DEFAULTS.auditDepth),
        landingpageGoal: normalizeContactOption("landingpageGoal", body.landingpageGoal, CONTACT_DEFAULTS.landingpageGoal),
        landingpageSource: normalizeContactOption("landingpageSource", body.landingpageSource, CONTACT_DEFAULTS.landingpageSource),
        maintenanceNeed,
        maintenanceUrgency: normalizeContactOption("maintenanceUrgency", body.maintenanceUrgency, CONTACT_DEFAULTS.maintenanceUrgency),
        customFeatureType,
        customFeatureDependencies: toCleanString(body.customFeatureDependencies).slice(0, 1200),
        bugfixUrgency: normalizeContactOption("bugfixUrgency", body.bugfixUrgency, CONTACT_DEFAULTS.bugfixUrgency),
        bugfixDescription: toCleanString(body.bugfixDescription).slice(0, 2000),
        uncertaintyNotes: toCleanString(body.uncertaintyNotes).slice(0, 1200),
        message: message.slice(0, 5000),
        auditId: toCleanString(body.auditId).slice(0, 120),
        domain: toCleanString(body.domain).slice(0, 180),
        scoreBand: toCleanString(body.scoreBand).slice(0, 32),
        topIssues: toCleanString(body.topIssues).slice(0, 450),
        lng
    };
}

function contactSummaryRows(normalized, lng, { includeMessage = true, packageOptions = [] } = {}) {
    const isEn = lng === "en";
    const rows = [];
    const projectType = normalized.projectType || "unsure";
    addSummaryRow(rows, isEn ? "Name" : "Name", normalized.name);
    addSummaryRow(rows, isEn ? "Company" : "Unternehmen", normalized.company);
    addSummaryRow(rows, "E-Mail", normalized.email);
    addSummaryRow(rows, isEn ? "Phone" : "Telefon", normalized.phone);
    addSummaryRow(rows, isEn ? "Preferred contact" : "Bevorzugter Kontaktweg", labelForOption("preferredContact", normalized.preferredContact, lng));
    addSummaryRow(rows, isEn ? "Project type" : "Projektart", labelForOption("projectType", normalized.projectType, lng));

    const labels = {
        packageInterest: isEn ? "Package interest" : "Paketinteresse",
        budgetRange: isEn ? "Budget range" : "Budgetrahmen",
        timeline: isEn ? "Timeline" : "Zeitrahmen",
        existingWebsiteStatus: isEn ? "Existing website" : "Bestehende Website",
        existingWebsiteUrl: isEn ? "Current website URL" : "Aktuelle Website-URL",
        pageScope: isEn ? "Page scope" : "Seitenumfang",
        contentStatus: isEn ? "Content status" : "Inhalte/Texte",
        optionalFeatures: isEn ? "Additional features" : "Zusatzfunktionen",
        hostingMaintenanceInterest: isEn ? "Hosting / maintenance" : "Hosting/Wartung",
        relaunchGoals: isEn ? "Relaunch goals" : "Relaunch-Ziele",
        googleBusinessProfileStatus: "Google Business Profile",
        localSeoArea: isEn ? "Target area" : "Zielgebiet",
        seoFocus: isEn ? "SEO focus" : "SEO-Fokus",
        auditFocus: isEn ? "Audit focus" : "Prüffokus",
        auditDepth: isEn ? "Desired result" : "Gewünschtes Ergebnis",
        landingpageGoal: isEn ? "Landing page goal" : "Landingpage-Ziel",
        landingpageSource: isEn ? "Landing page source" : "Landingpage-Ausgangslage",
        maintenanceNeed: isEn ? "Maintenance need" : "Wartungsbedarf",
        maintenanceUrgency: isEn ? "Urgency" : "Dringlichkeit",
        customFeatureType: isEn ? "Extension" : "Erweiterung",
        customFeatureDependencies: isEn ? "Dependencies" : "Abhängigkeiten",
        bugfixUrgency: isEn ? "Urgency" : "Dringlichkeit",
        bugfixDescription: isEn ? "Problem description" : "Problembeschreibung",
        uncertaintyNotes: isEn ? "Clarification needed" : "Klärungsbedarf",
        message: isEn ? "Message" : "Nachricht",
        auditId: "Audit-ID",
        domain: "Domain",
        scoreBand: isEn ? "Score band" : "Score-Band",
        topIssues: isEn ? "Top issues" : "Top-Baustellen"
    };

    const arrayFields = new Set(["optionalFeatures", "relaunchGoals", "seoFocus", "auditFocus", "maintenanceNeed", "customFeatureType"]);
    const optionFields = new Set([
        "packageInterest",
        "budgetRange",
        "timeline",
        "existingWebsiteStatus",
        "pageScope",
        "contentStatus",
        "hostingMaintenanceInterest",
        "googleBusinessProfileStatus",
        "auditDepth",
        "landingpageGoal",
        "landingpageSource",
        "maintenanceUrgency",
        "bugfixUrgency"
    ]);

    getSummaryFieldsForProjectType(projectType).forEach((fieldName) => {
        if (fieldName === "message" && !includeMessage) return;
        if (arrayFields.has(fieldName)) {
            addSummaryRow(rows, labels[fieldName] || formatLabel(fieldName), labelsForOptions(fieldName, normalized[fieldName], lng, packageOptions));
            return;
        }
        if (optionFields.has(fieldName)) {
            addSummaryRow(rows, labels[fieldName] || formatLabel(fieldName), labelForOption(fieldName, normalized[fieldName], lng, packageOptions));
            return;
        }
        addSummaryRow(rows, labels[fieldName] || formatLabel(fieldName), normalized[fieldName]);
    });
    return rows;
}

function buildLeadQualification(normalized = {}) {
    const optionalFeatures = Array.isArray(normalized.optionalFeatures)
        ? normalized.optionalFeatures
        : (Array.isArray(normalized.services) ? normalized.services : []);
    const specialFeaturesDetected = optionalFeatures.filter(feature => LEAD_SPECIAL_FEATURES.has(feature));
    const hasSpecialFeatures = specialFeaturesDetected.length > 0;
    const projectType = normalized.projectType || "unsure";
    const packageInterest = normalized.packageInterest || "unsure";
    const budgetRange = normalized.budgetRange || normalized.budget || "open";
    const pageScope = normalized.pageScope || "unsure";
    const timeline = normalized.timeline || "open";
    const contentStatus = normalized.contentStatus || "unsure";
    const hostingMaintenanceInterest = normalized.hostingMaintenanceInterest || "unsure";

    let likelyPackage = "unsure";
    if (["start", "business", "wachstum", "individuell"].includes(packageInterest)) {
        likelyPackage = packageInterest;
    } else if (hasSpecialFeatures || budgetRange === "4000-plus" || pageScope === "12-plus") {
        likelyPackage = "individuell";
    } else if (projectType === "relaunch" || pageScope === "8-12" || budgetRange === "2500-4000") {
        likelyPackage = "wachstum";
    } else if (pageScope === "4-7" || budgetRange === "1500-2499") {
        likelyPackage = "business";
    } else if (pageScope === "onepager" || pageScope === "1-3" || budgetRange === "799-1499") {
        likelyPackage = "start";
    }

    let leadCategory = "package_request";
    if (projectType === "maintenance" || hostingMaintenanceInterest === "maintenance" || hostingMaintenanceInterest === "both") {
        leadCategory = "maintenance_request";
    } else if (projectType === "audit" || optionalFeatures.includes("audit")) {
        leadCategory = "audit_request";
    } else if (projectType === "local-seo" || optionalFeatures.includes("local-seo") || optionalFeatures.includes("google-business-profile")) {
        leadCategory = "local_seo_request";
    } else if (projectType === "landingpage" || optionalFeatures.includes("landingpage")) {
        leadCategory = "landingpage_request";
    } else if (projectType === "relaunch") {
        leadCategory = "relaunch_request";
    } else if (projectType === "custom-feature" || hasSpecialFeatures || likelyPackage === "individuell") {
        leadCategory = "custom_feature_request";
    } else if (projectType === "unsure" && packageInterest === "unsure") {
        leadCategory = "unclear_request";
    }

    const needsFollowup = [
        projectType === "unsure",
        PACKAGE_RELEVANT_PROJECT_TYPES.has(projectType) && packageInterest === "unsure",
        BUDGET_TIMELINE_RELEVANT_PROJECT_TYPES.has(projectType) && budgetRange === "open",
        BUDGET_TIMELINE_RELEVANT_PROJECT_TYPES.has(projectType) && timeline === "open",
        PAGE_SCOPE_RELEVANT_PROJECT_TYPES.has(projectType) && pageScope === "unsure",
        CONTENT_RELEVANT_PROJECT_TYPES.has(projectType) && contentStatus === "unsure",
        hasSpecialFeatures
    ].some(Boolean);

    let leadPriority = "medium";
    if (budgetRange === "4000-plus" || likelyPackage === "individuell" || hasSpecialFeatures) {
        leadPriority = "high";
    } else if (budgetRange === "open" && packageInterest === "unsure" && pageScope === "unsure") {
        leadPriority = "low";
    }

    const estimatedFit = hasSpecialFeatures || likelyPackage === "individuell"
        ? "custom_review"
        : (needsFollowup ? "needs_scope_clarification" : "standard_fit");

    return {
        project_type: projectType,
        likely_package: likelyPackage,
        lead_category: leadCategory,
        lead_priority: leadPriority,
        estimated_fit: estimatedFit,
        needs_followup: needsFollowup,
        special_features_detected: specialFeaturesDetected
    };
}

function addLeadQualificationRows(rows, qualification, lng, { packageOptions = [] } = {}) {
    const isEn = lng === "en";
    const translate = (value, map) => map[value] || value;
    if (PACKAGE_RELEVANT_PROJECT_TYPES.has(qualification.project_type || "unsure")) {
        addSummaryRow(rows, isEn ? "Likely package" : "Wahrscheinliches Paket", qualification.likely_package === "unsure"
            ? (isEn ? "Not clear yet" : "Noch offen")
            : labelForOption("packageInterest", qualification.likely_package, lng, packageOptions));
    }
    addSummaryRow(rows, isEn ? "Lead category" : "Lead-Kategorie", translate(qualification.lead_category, isEn ? {
        maintenance_request: "Maintenance request",
        audit_request: "Audit request",
        local_seo_request: "Local SEO request",
        landingpage_request: "Landing page request",
        relaunch_request: "Relaunch request",
        custom_feature_request: "Custom feature request",
        unclear_request: "Unclear request",
        package_request: "Package request"
    } : {
        maintenance_request: "Wartungsanfrage",
        audit_request: "Audit-Anfrage",
        local_seo_request: "Local-SEO-Anfrage",
        landingpage_request: "Landingpage-Anfrage",
        relaunch_request: "Relaunch-Anfrage",
        custom_feature_request: "Sonderfunktions-Anfrage",
        unclear_request: "Unklare Anfrage",
        package_request: "Paket-Anfrage"
    }));
    addSummaryRow(rows, isEn ? "Lead priority" : "Lead-Priorität", translate(qualification.lead_priority, isEn ? {
        high: "High",
        medium: "Medium",
        low: "Low"
    } : {
        high: "Hoch",
        medium: "Mittel",
        low: "Niedrig"
    }));
    addSummaryRow(rows, isEn ? "Estimated fit" : "Geschätzter Fit", translate(qualification.estimated_fit, isEn ? {
        custom_review: "Custom review",
        needs_scope_clarification: "Needs scope clarification",
        standard_fit: "Standard fit"
    } : {
        custom_review: "Individuelle Prüfung",
        needs_scope_clarification: "Umfang klären",
        standard_fit: "Standard-Fit"
    }));
    addSummaryRow(rows, isEn ? "Needs follow-up" : "Nachfassen nötig", qualification.needs_followup
        ? (isEn ? "Yes" : "Ja")
        : (isEn ? "No" : "Nein"));
    addSummaryRow(rows, isEn ? "Special features detected" : "Erkannte Sonderfunktionen", labelsForOptions("optionalFeatures", qualification.special_features_detected, lng));
}

async function buildContactViewModel(req, res, overrides = {}) {
    const lng = resolveContactLocale(req);
    const isEn = lng === "en";
    const contactPath = isEn ? "/en/kontakt" : "/kontakt";
    const baseUrl = (res.locals.canonicalBaseUrl || "https://komplettwebdesign.de").replace(/\/$/, "");
    const canonical = `${baseUrl}${contactPath}`;
    const packageOptions = overrides.packageOptions || await buildContactPackageOptions(lng);
    const lowestLabel = isEn
        ? toEnglishPriceLabel(res.locals.lowestPackagePriceLabel || await pricingService.getLowestVisiblePackagePriceLabel())
        : (res.locals.lowestPackagePriceLabel || await pricingService.getLowestVisiblePackagePriceLabel());
    const testerPrefill = buildTesterPrefill(req, lng);
    const formValues = pickValidatedDefaults(req.query, overrides.formValues || {}, packageOptions);
    if (testerPrefill && !overrides.formValues) {
        Object.assign(formValues, {
            projectType: "audit",
            existingWebsiteUrl: testerPrefill.domain && /^https?:\/\//i.test(testerPrefill.domain)
                ? testerPrefill.domain
                : (testerPrefill.domain ? `https://${testerPrefill.domain}` : ""),
            auditDepth: "quick-check",
            message: testerPrefill.suggestedMessage
        });
    }
    const localizedFaqs = contactFaqs.map(item => ({
        question: isEn && item.questionEn ? item.questionEn : item.question,
        answer: isEn && item.answerEn ? item.answerEn : item.answer
    }));
    const contactFlowSteps = Object.fromEntries(
        Object.entries(contactFlowDefinitions).map(([key, flow]) => [key, [...flow.steps]])
    );

    return {
        title: isEn ? "Request your website project | Komplett Webdesign Berlin" : "Kontakt aufnehmen | Webdesign-Projekt in Berlin anfragen",
        description: isEn
            ? `Request your website project in Berlin. Packages from ${lowestLabel}, personal assessment and clear project scope.`
            : `Frage dein Website-Projekt in Berlin an. Pakete ab ${lowestLabel}, persönliche Einschätzung und klare Projektabgrenzung.`,
        keywords: isEn
            ? "web design berlin contact, website project request, web design package berlin"
            : "webdesign berlin kontakt, website projekt anfragen, webdesign paket berlin",
        canonicalUrl: canonical,
        seoExtra: `
          <meta property="og:title" content="${isEn ? "Request your website project - Komplett Webdesign Berlin" : "Website-Projekt anfragen - Komplett Webdesign Berlin"}">
          <meta property="og:site_name" content="Komplett Webdesign">
          <meta property="og:description" content="${isEn
                ? "Describe your website project, budget and scope for a personal assessment."
                : "Beschreibe Website-Projekt, Budget und Umfang für eine persönliche Einschätzung."}">
          <meta property="og:image" content="${baseUrl}/images/heroBg.webp">
          <meta property="og:url" content="${canonical}">
        `,
        structuredDataBlocks: buildContactStructuredData({
            baseUrl,
            url: canonical,
            lng,
            faqs: contactFaqs
        }),
        alternateUrls: {
            de: `${baseUrl}/kontakt`,
            en: `${baseUrl}/en/kontakt`,
            xDefault: `${baseUrl}/kontakt`
        },
        currentSearch: buildContactSafeSearch(req.query, packageOptions),
        lng,
        contactAction: contactPath,
        sitekey: process.env.RECAPTCHA_SITEKEY,
        testerPrefill,
        contactFormOptions: buildContactFormOptions(lng, packageOptions),
        contactFlowStepsJson: JSON.stringify(contactFlowSteps).replace(/</g, "\\u003c"),
        packageContactOptions: packageOptions,
        lowestPackagePriceLabel: lowestLabel,
        contactFaqs: localizedFaqs,
        formValues,
        formErrors: overrides.formErrors || [],
        formStatus: overrides.formStatus || null,
        globalNotes: PACKAGE_GLOBAL_NOTES
    };
}


const generalUpload = multer({
    dest: "uploads/",
    limits: {
        files: MAX_ATTACHMENTS,
        fileSize: MAX_GENERAL_UPLOAD_FILE_SIZE
    },
    fileFilter: (_req, file, cb) => {
        if (ALLOWED_GENERAL_UPLOAD_TYPES.has(file.mimetype)) return cb(null, true);
        return cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
    }
});

function handleGeneralUpload(req, res, next) {
    generalUpload.array("images", MAX_ATTACHMENTS)(req, res, err => {
        if (!err) return next();
        const lng = resolveContactLocale(req);
        let message = lng === "en"
            ? "The uploaded images could not be accepted."
            : "Die hochgeladenen Bilder konnten nicht angenommen werden.";
        if (err instanceof multer.MulterError) {
            if (err.code === "LIMIT_FILE_SIZE") {
                message = lng === "en"
                    ? "Each image may be at most 5 MB."
                    : "Jedes Bild darf maximal 5 MB groß sein.";
            } else if (err.code === "LIMIT_FILE_COUNT") {
                message = lng === "en"
                    ? `You can upload a maximum of ${MAX_ATTACHMENTS} images.`
                    : `Du kannst maximal ${MAX_ATTACHMENTS} Bilder hochladen.`;
            } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
                message = lng === "en"
                    ? "Only JPG, PNG, WebP or GIF images are allowed."
                    : "Es sind nur JPG-, PNG-, WebP- oder GIF-Bilder erlaubt.";
            }
        }
        if (expectsJson(req)) return res.status(400).json({ success: false, message });
        return res.status(400).send(message);
    });
}

function resolveContactLocale(req) {
    if (req.body?.locale === "en") return "en";
    if (req.baseUrl && req.baseUrl.startsWith("/en/")) return "en";
    return "de";
}

function buildTesterPrefill(req, lng) {
    const query = req.query || {};
    if (String(query.source || "").trim() !== "website-tester") return null;

    const clean = (value, limit = 180) => String(value || "").trim().slice(0, limit);
    const domain = clean(query.domain, 180);
    const scoreBandRaw = clean(query.scoreBand, 32).toLowerCase();
    const scoreBand = ["gut", "mittel", "kritisch"].includes(scoreBandRaw) ? scoreBandRaw : "mittel";
    const topIssues = clean(query.topIssues, 450);
    const auditId = clean(query.auditId, 120);

    const scoreLabel = lng === "en"
        ? (scoreBand === "gut" ? "modern" : scoreBand === "mittel" ? "needs work" : "critical")
        : (scoreBand === "gut" ? "modern" : scoreBand === "mittel" ? "ausbaufähig" : "kritisch");

    const intro = lng === "en"
        ? `Website Tester result for ${domain || "my website"} (${scoreLabel}).`
        : `Website-Tester-Ergebnis für ${domain || "meine Website"} (${scoreLabel}).`;
    const issuesLabel = lng === "en" ? "Top issues" : "Top-Baustellen";
    const idLabel = lng === "en" ? "Audit ID" : "Audit-ID";
    const suggestedMessage = `${intro}${topIssues ? ` ${issuesLabel}: ${topIssues}.` : ""}${auditId ? ` ${idLabel}: ${auditId}.` : ""}`;

    return {
        source: "website-tester",
        auditId,
        domain,
        scoreBand,
        topIssues,
        suggestedMessage
    };
}

/* ---------- GET /kontakt --------------------------------------------- */
export async function showForm(req, res) {
    const freieTermine = await Apt.getOpenSlotPerDay(3);
    res.render("kontakt", {
        ...await buildContactViewModel(req, res),
        freieTermine
    });
}

function projectTypeFromReq(req) {
    return normalizeContactOption(
        "projectType",
        req.body?.projectType || req.body?.projektart || req.body?.projekt,
        CONTACT_DEFAULTS.projectType
    );
}

function isRequiredForRequest(req, fieldName) {
    return isFieldRequiredForProjectType(projectTypeFromReq(req), fieldName);
}

function validateRequiredOption(groupName, fieldName, message) {
    return body(fieldName).custom(async (value, { req }) => {
        if (!isRequiredForRequest(req, fieldName) && !toCleanString(value)) return true;
        const packageOptions = groupName === "packageInterest"
            ? await buildContactPackageOptions(resolveContactLocale(req))
            : [];
        return Boolean(normalizeContactOption(groupName, value, "", packageOptions));
    }).withMessage(message);
}

function validateOptionalOption(groupName, fieldName, message) {
    return body(fieldName).optional({ checkFalsy: true }).custom(value => {
        return Boolean(normalizeContactOption(groupName, value, ""));
    }).withMessage(message);
}

function validateOptionArray(groupName, fieldName, message) {
    return body(fieldName).optional({ checkFalsy: true }).custom(value => {
        const submitted = Array.isArray(value) ? value : [value];
        return submitted.every(item => Boolean(normalizeContactOption(groupName, item, "")));
    }).withMessage(message);
}

function buildBranchScopeSummary(normalized, lng, packageOptions = []) {
    const projectType = normalized.projectType || "unsure";
    const parts = [];
    const add = (label, value) => {
        if (Array.isArray(value)) {
            const text = value.map(item => toCleanString(item)).filter(Boolean).join(", ");
            if (text) parts.push(`${label}: ${text}`);
            return;
        }
        if (toCleanString(value)) parts.push(`${label}: ${value}`);
    };

    if (projectType === "new-website") {
        add("Seitenumfang", labelForOption("pageScope", normalized.pageScope, lng, packageOptions));
        return parts.join(" | ");
    }
    if (projectType === "relaunch") {
        add("Bestehende Website", labelForOption("existingWebsiteStatus", normalized.existingWebsiteStatus, lng));
        add("Relaunch-Ziele", labelsForOptions("relaunchGoals", normalized.relaunchGoals, lng));
    } else if (projectType === "local-seo") {
        add("Zielgebiet", normalized.localSeoArea);
        add("SEO-Fokus", labelsForOptions("seoFocus", normalized.seoFocus, lng));
    } else if (projectType === "audit") {
        add("Prüffokus", labelsForOptions("auditFocus", normalized.auditFocus, lng));
        add("Ergebnis", labelForOption("auditDepth", normalized.auditDepth, lng));
    } else if (projectType === "landingpage") {
        add("Landingpage-Ziel", labelForOption("landingpageGoal", normalized.landingpageGoal, lng));
        add("Ausgangslage", labelForOption("landingpageSource", normalized.landingpageSource, lng));
    } else if (projectType === "maintenance") {
        add("Wartungsbedarf", labelsForOptions("maintenanceNeed", normalized.maintenanceNeed, lng));
        add("Dringlichkeit", labelForOption("maintenanceUrgency", normalized.maintenanceUrgency, lng));
    } else if (projectType === "custom-feature") {
        add("Erweiterung", labelsForOptions("customFeatureType", normalized.customFeatureType, lng));
        add("Abhängigkeiten", normalized.customFeatureDependencies);
    } else if (projectType === "bugfix") {
        add("Dringlichkeit", labelForOption("bugfixUrgency", normalized.bugfixUrgency, lng));
        add("Problem", normalized.bugfixDescription);
    } else {
        add("Klärungsbedarf", normalized.uncertaintyNotes);
    }

    add("URL", normalized.existingWebsiteUrl);
    return parts.join(" | ");
}

/* ---------- Validierung ---------------------------------------------- */
export const validate = [
    body("slotId").optional({ checkFalsy: true }).isInt().withMessage("Termin ist ungültig.").toInt(),
    body("token").notEmpty().withMessage("reCAPTCHA-Token fehlt."),
    body("contactWebsite").custom(value => !toCleanString(value)).withMessage("Die Anfrage konnte nicht verarbeitet werden."),
    body("startedAt").custom(value => {
        const startedAt = Number(value);
        if (!Number.isFinite(startedAt)) return false;
        return Date.now() - startedAt >= 2500;
    }).withMessage("Bitte sende das Formular noch einmal ab."),
    body("projectType").custom(value => Boolean(normalizeContactOption("projectType", value, ""))).withMessage("Bitte wähle eine Projektart aus."),
    validateRequiredOption("packageInterest", "packageInterest", "Bitte wähle ein Paketinteresse aus."),
    validateRequiredOption("budgetRange", "budgetRange", "Bitte wähle einen Budgetrahmen aus."),
    validateRequiredOption("timeline", "timeline", "Bitte wähle einen Zeitrahmen aus."),
    validateRequiredOption("existingWebsiteStatus", "existingWebsiteStatus", "Bitte wähle aus, ob es bereits eine Website gibt."),
    body("existingWebsiteUrl").custom((value, { req }) => {
        const raw = toCleanString(value);
        if (!raw && !isRequiredForRequest(req, "existingWebsiteUrl")) return true;
        return Boolean(raw) && raw.length <= 220 && isValidOptionalUrl(raw);
    }).withMessage("Bitte gib eine gültige Website-URL ein."),
    validateRequiredOption("pageScope", "pageScope", "Bitte wähle den groben Seitenumfang aus."),
    validateRequiredOption("contentStatus", "contentStatus", "Bitte wähle aus, ob Inhalte vorhanden sind."),
    validateOptionArray("optionalFeatures", "optionalFeatures", "Bitte prüfe die ausgewählten Zusatzfunktionen."),
    validateRequiredOption("hostingMaintenanceInterest", "hostingMaintenanceInterest", "Bitte wähle aus, ob Hosting oder Wartung interessant ist."),
    validateOptionArray("relaunchGoals", "relaunchGoals", "Bitte prüfe die ausgewählten Relaunch-Ziele."),
    validateRequiredOption("googleBusinessProfileStatus", "googleBusinessProfileStatus", "Bitte wähle den Status des Google Business Profile aus."),
    body("localSeoArea").custom((value, { req }) => {
        const raw = toCleanString(value);
        if (!raw && !isRequiredForRequest(req, "localSeoArea")) return true;
        return Boolean(raw) && raw.length <= 180;
    }).withMessage("Bitte gib ein Zielgebiet für Local SEO an."),
    validateOptionArray("seoFocus", "seoFocus", "Bitte prüfe den SEO-Fokus."),
    validateOptionArray("auditFocus", "auditFocus", "Bitte prüfe den Prüffokus."),
    validateRequiredOption("auditDepth", "auditDepth", "Bitte wähle das gewünschte Audit-Ergebnis aus."),
    validateRequiredOption("landingpageGoal", "landingpageGoal", "Bitte wähle das Ziel der Landingpage aus."),
    validateRequiredOption("landingpageSource", "landingpageSource", "Bitte wähle die Ausgangslage der Landingpage aus."),
    validateOptionArray("maintenanceNeed", "maintenanceNeed", "Bitte prüfe den Wartungsbedarf."),
    validateRequiredOption("maintenanceUrgency", "maintenanceUrgency", "Bitte wähle die Dringlichkeit aus."),
    validateOptionArray("customFeatureType", "customFeatureType", "Bitte prüfe die gewünschte Erweiterung."),
    body("customFeatureDependencies").optional({ checkFalsy: true }).trim().isLength({ max: 1200 }).withMessage("Die Angaben zu Abhängigkeiten sind zu lang."),
    validateRequiredOption("bugfixUrgency", "bugfixUrgency", "Bitte wähle die Dringlichkeit der Fehlerbehebung aus."),
    body("bugfixDescription").custom((value, { req }) => {
        const raw = toCleanString(value);
        if (!raw && !isRequiredForRequest(req, "bugfixDescription")) return true;
        return Boolean(raw) && raw.length <= 2000;
    }).withMessage("Bitte beschreibe kurz, was nicht funktioniert."),
    body("uncertaintyNotes").optional({ checkFalsy: true }).trim().isLength({ max: 1200 }).withMessage("Der Klärungsbedarf ist zu lang."),
    body("preferredContact").custom(value => Boolean(normalizeContactOption("preferredContact", value, ""))).withMessage("Bitte wähle einen Kontaktweg aus."),
    body("name").trim().isLength({ min: 2, max: 120 }).withMessage("Bitte gib deinen Namen ein."),
    body("company").optional({ checkFalsy: true }).trim().isLength({ max: 160 }).withMessage("Der Unternehmensname ist zu lang."),
    body("email").trim().isEmail().isLength({ max: 180 }).withMessage("Bitte gib eine gültige E-Mail-Adresse ein."),
    body("phone").optional({ checkFalsy: true }).trim().isLength({ max: 80 }).withMessage("Die Telefonnummer ist zu lang."),
    body("message").optional({ checkFalsy: true }).trim().isLength({ max: 5000 }).withMessage("Die Projektbeschreibung ist zu lang."),
    body("privacyConsent").equals("yes").withMessage("Bitte bestätige Datenschutzerklärung und Hinweisseite.")
];

/* ---------- POST /kontakt -------------------------------------------- */
export const processForm = [
    handleGeneralUpload,
    validate,
    async (req, res) => {
        const lng = resolveContactLocale(req);
        const renderContactError = async (status, messages) => {
            const freieTermine = await Apt.getOpenSlotPerDay(3);
            return res.status(status).render("kontakt", {
                ...await buildContactViewModel(req, res, {
                    formValues: req.body,
                    formErrors: messages.map(message => ({ msg: message })),
                    formStatus: "error"
                }),
                freieTermine
            });
        };

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return renderContactError(422, errors.array().map(error => error.msg));
        }

        try {
            const { token } = req.body;
            const resp = await axios.post(
                "https://www.google.com/recaptcha/api/siteverify",
                null,
                { params: { secret: process.env.RECAPTCHA_SECRET, response: token } }
            );
            if (!resp.data.success) throw new Error("reCaptcha failed");
        } catch {
            return renderContactError(400, [
                lng === "en"
                    ? "The spam protection check could not be completed. Please try again."
                    : "Der Spamschutz konnte nicht abgeschlossen werden. Bitte versuche es noch einmal."
            ]);
        }

        const cloud = req.app.get("cloudinary");
        const slotId = req.body.slotId ? Number(req.body.slotId) : null;
        let slot = null;
        let booking = null;

        try {
            const packageOptions = await buildContactPackageOptions(lng);
            const normalized = normalizeContactBody(req.body, lng, packageOptions);

            /* 2) Slot sperren + Buchung anlegen ------------------------------ */
            if (slotId) {
                slot = await Apt.lockSlot(slotId);               // is_booked = TRUE
                if (!slot) {
                    return res.render("booking/slot_taken", {
                        lng,
                        title: lng === "en" ? "Slot unavailable" : "Termin vergeben",
                        description: lng === "en"
                            ? "Someone else booked this time first. Please choose another appointment."
                            : "Leider war jemand schneller. Bitte wähle einen anderen Termin."
                    });
                }

                booking = await Book.create(
                    slotId,
                    normalized.name,
                    normalized.email,
                    req.body.note || null,
                    lng
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
            const branchScopeSummary = buildBranchScopeSummary(normalized, lng, packageOptions);
            const branchFeatures = [
                ...normalized.optionalFeatures,
                ...normalized.relaunchGoals,
                ...normalized.seoFocus,
                ...normalized.auditFocus,
                ...normalized.maintenanceNeed,
                ...normalized.customFeatureType
            ];
            const contactRequest = await CReq.create({
                paket: normalized.projectType === "new-website" ? normalized.packageInterest : normalized.projectType,
                umfang: normalized.projectType === "new-website" ? normalized.pageScope : branchScopeSummary,
                texterstellung: normalized.contentStatus || "n/a",
                bilderstellung: "n/a",
                features: [...new Set(branchFeatures)].join(", "),
                featuresOther: joinNonEmpty([
                    `Projektart: ${labelForOption("projectType", normalized.projectType, lng)}`,
                    `Budget: ${labelForOption("budgetRange", normalized.budgetRange, lng)}`,
                    `Zeitrahmen: ${labelForOption("timeline", normalized.timeline, lng)}`,
                    normalized.existingWebsiteStatus && `Bestehende Website: ${labelForOption("existingWebsiteStatus", normalized.existingWebsiteStatus, lng)}`,
                    normalized.existingWebsiteUrl && `URL: ${normalized.existingWebsiteUrl}`,
                    normalized.hostingMaintenanceInterest && `Hosting/Wartung: ${labelForOption("hostingMaintenanceInterest", normalized.hostingMaintenanceInterest, lng)}`,
                    branchScopeSummary
                ]),
                bookingId: booking ? booking.id : null,
                name: normalized.name,
                email: normalized.email,
                phone: normalized.phone,
                company: normalized.company,
                additionalInfo: normalized.message,
                images: imageUrls.join(";"),
                appointmentTime: slot ? slot.start_time : null

            });

            /* 5) Bestätigungs-Mails ----------------------------------------- */
            // <tr><th>Weitere Wünsche:</th><td>${req.body.weitereWuensche || 'Keine'}</td></tr>
            const formattedAppointment = slot
                ? `${new Date(slot.start_time).toLocaleString(lng === "en" ? "en-GB" : "de-DE", {
                    weekday: "long",
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                })} - ${new Date(slot.end_time).toLocaleTimeString(lng === "en" ? "en-GB" : "de-DE", {
                    hour: "2-digit",
                    minute: "2-digit"
                })}${lng === "en" ? "" : " Uhr"}`
                : null;

            const publicRows = contactSummaryRows(normalized, lng, { includeMessage: false, packageOptions });
            const adminRows = contactSummaryRows(normalized, lng, { includeMessage: true, packageOptions });
            const leadQualification = buildLeadQualification(normalized);
            addLeadQualificationRows(adminRows, leadQualification, lng, { packageOptions });
            if (formattedAppointment) {
                addSummaryRow(publicRows, lng === "en" ? "Appointment" : "Termin", formattedAppointment);
                addSummaryRow(adminRows, lng === "en" ? "Appointment" : "Termin", formattedAppointment);
            }

            const userHtml = `
                <p>${lng === "en" ? "Hello" : "Hallo"} <strong>${escapeHtml(normalized.name)}</strong>,</p>
                <p>${lng === "en"
                    ? "thank you for your request. I will review your details and get back to you with a rough assessment or a useful next step."
                    : "vielen Dank für deine Anfrage. Ich schaue mir deine Angaben an und melde mich mit einer groben Einschätzung oder einem sinnvollen nächsten Schritt."}</p>
                ${buildHtmlSummary(publicRows)}
                <p>${lng === "en"
                    ? "If information is missing, I will ask for it before preparing a concrete offer. A project only starts after scope, offer and approval are clarified."
                    : "Falls Informationen fehlen, frage ich nach, bevor ein konkretes Angebot entsteht. Ein Projekt startet erst nach Abstimmung, Angebot und Freigabe."}</p>
                <p>${lng === "en"
                    ? "Please do not send passwords or confidential login data by email or form."
                    : "Bitte sende keine Passwörter oder vertraulichen Zugangsdaten per E-Mail oder Formular."}</p>
                <p>${lng === "en" ? "Best regards" : "Viele Grüße"}<br>Komplett Webdesign</p>
            `;
            const adminHtml = `
                <p><strong>Neue Kontaktanfrage über /kontakt</strong></p>
                ${buildHtmlSummary(adminRows)}
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
                from: '"Komplett Webdesign" <kontakt@komplettwebdesign.de>',
                to: normalized.email,
                subject: lng === "en" ? "Confirmation of your contact request" : "Bestätigung deiner Kontaktanfrage",
                html: renderBrandEmail({
                    locale: lng,
                    subject: lng === "en" ? "Confirmation of your contact request" : "Bestätigung deiner Kontaktanfrage",
                    headline: lng === "en" ? "Thank you for your request" : "Vielen Dank für deine Anfrage",
                    preheader: lng === "en" ? "I received your project request." : "Ich habe deine Projektanfrage erhalten.",
                    bodyHtml: userHtml
                }),
                attachments
            });
            await transporter.sendMail({
                from: '"Komplett Webdesign" <kontakt@komplettwebdesign.de>',
                to: 'kontakt@komplettwebdesign.de',
                replyTo: EMAIL_REGEX.test(normalized.email) ? normalized.email : undefined,
                subject: `Neue Kontaktanfrage von ${safeSubjectText(normalized.name, "Kontakt")}`,
                html: renderBrandEmail({
                    locale: lng,
                    subject: `Neue Kontaktanfrage von ${safeSubjectText(normalized.name, "Kontakt")}`,
                    headline: "Neue Kontaktanfrage",
                    preheader: "Neue Details über das Kontaktformular eingegangen.",
                    bodyHtml: adminHtml
                }),
                attachments
            });

            /* 6) Erfolg ------------------------------------------------------ */

            return res.render('kontakt/thankyou', {
                title: lng === "en" ? "Thanks for your request" : "Danke für deine Anfrage",
                description: lng === "en" ? "Confirmation of your contact request" : "Bestätigung deiner Kontaktanfrage",
                robots: "noindex,nofollow",
                data: normalized,
                summaryRows: publicRows,
                appointment: slot,
                formattedAppointment,
                leadEventId: contactRequest?.id ? `contact-${contactRequest.id}` : null,
                successFormId: "kontaktForm",
                successFormVariant: "detailed",
                lng,
            });
        } catch (err) {
            logSafeError("❌ Fehler beim Kontakt-Workflow:", err);

            /* Rollback: Slot & Buchung freigeben ----------------------------- */
            if (slot) await Apt.unlockSlot(slot.id);
            if (booking) await Book.remove(booking.id);

            return res
                .status(500)
                .send(lng === "en"
                    ? "An error occurred. Please try again."
                    : "Es ist ein Fehler aufgetreten - bitte erneut versuchen.");
        }
    }
];

/* ---------- POST /webdesign-berlin/kontakt --------------------------- */
export async function processWebdesignBerlinForm(req, res) {
    const lng = resolveContactLocale(req);
    const db = req.app.get("db");
    const bodyData = req.body || {};
    const token = toCleanString(bodyData.token);
    const packageOptions = await buildContactPackageOptions(lng);
    const normalized = normalizeWebdesignBerlinBody(bodyData, packageOptions);
    const isContactQuick = normalized.source === "contact-quick";
    if (isContactQuick && !token) {
        const message = lng === "en"
            ? "The spam protection check could not be completed. Please try again."
            : "Der Spamschutz konnte nicht abgeschlossen werden. Bitte versuche es noch einmal.";
        if (expectsJson(req)) {
            return res.status(400).json({ success: false, message });
        }
        return res.status(400).send(message);
    }
    if (token) {
        try {
            const resp = await axios.post(
                "https://www.google.com/recaptcha/api/siteverify",
                null,
                { params: { secret: process.env.RECAPTCHA_SECRET, response: token } }
            );
            if (!resp.data.success) throw new Error("reCaptcha failed");
        } catch (err) {
            logSafeError("❌ reCaptcha-Validierung (Webdesign Berlin)", err);
            const message = lng === "en" ? "reCAPTCHA validation failed" : "reCaptcha-Validierung fehlgeschlagen";
            if (expectsJson(req)) {
                return res.status(400).json({ success: false, message });
            }
            return res.status(400).send(message);
        }
    }

    const hasValidEmail = normalized.email && EMAIL_REGEX.test(normalized.email);
    const hasName = toCleanString(normalized.name);
    const attachments = Array.isArray(req.files) ? req.files : [];
    if (!hasName || !hasValidEmail) {
        const message = lng === "en"
            ? "Please provide your name and a valid email address."
            : "Bitte gib deinen Namen und eine gültige E-Mail-Adresse an.";
        if (expectsJson(req)) {
            return res.status(422).json({ success: false, message });
        }
        return res.status(422).send(message);
    }

    if (isContactQuick) {
        const quickMessage = toCleanString(normalized.message);
        const startedAt = Number(bodyData.startedAt);
        const timingOk = Number.isFinite(startedAt) && Date.now() - startedAt >= 2500;
        const honeypotOk = !toCleanString(bodyData.contactWebsite);
        const privacyOk = bodyData.privacyConsent === "yes";
        if (quickMessage.length < 20 || !privacyOk || !timingOk || !honeypotOk) {
            const message = lng === "en"
                ? "Please describe your project briefly and confirm the privacy notice."
                : "Bitte beschreibe dein Projekt kurz und bestätige Datenschutzerklärung und Hinweisseite.";
            if (expectsJson(req)) {
                return res.status(422).json({ success: false, message });
            }
            return res.status(422).send(message);
        }
    }

    if (attachments.length > MAX_ATTACHMENTS) {
        const message = lng === "en"
            ? `You can upload a maximum of ${MAX_ATTACHMENTS} files.`
            : `Du kannst maximal ${MAX_ATTACHMENTS} Dateien hochladen.`;
        if (expectsJson(req)) {
            return res.status(400).json({ success: false, message });
        }
        return res.status(400).send(message);
    }

    const totalAttachmentSize = attachments.reduce((sum, file) => sum + (file?.size || 0), 0);
    if (totalAttachmentSize > MAX_TOTAL_ATTACHMENT_SIZE) {
        const message = lng === "en"
            ? "Uploaded files exceed the total maximum size of 15 MB."
            : "Die hochgeladenen Dateien überschreiten die maximale Gesamtgröße von 15 MB.";
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

    const labels = lng === "en"
        ? {
            email: "Email",
            phone: "Phone",
            company: "Company",
            district: "District",
            project: "Project",
            packageInterest: "Package interest",
            currentWebsite: "Current website",
            existingWebsiteUrl: "Current website URL",
            pageScope: "Page scope",
            contentStatus: "Content status",
            services: "Services",
            goals: "Goals",
            budget: "Budget",
            timeline: "Timeline",
            preferredContact: "Preferred contact",
            hostingMaintenanceInterest: "Hosting / maintenance",
            message: "Message",
            files: "Files",
            utmCampaign: "UTM Campaign"
        }
        : {
            email: "E-Mail",
            phone: "Telefon",
            company: "Firma",
            district: "Bezirk",
            project: "Projekt",
            packageInterest: "Paketinteresse",
            currentWebsite: "Bestehende Website",
            existingWebsiteUrl: "Aktuelle Website-URL",
            pageScope: "Seitenumfang",
            contentStatus: "Inhalte/Texte",
            services: "Leistungen",
            goals: "Ziele",
            budget: "Budget",
            timeline: "Zeitplan",
            preferredContact: "Bevorzugter Kontaktweg",
            hostingMaintenanceInterest: "Hosting/Wartung",
            message: "Nachricht",
            files: "Dateien",
            utmCampaign: "UTM Kampagne"
        };

    const summaryRows = [];
    addRow(summaryRows, "Name", normalized.name);
    addRow(summaryRows, labels.email, normalized.email);
    addRow(summaryRows, labels.phone, normalized.phone);
    addRow(summaryRows, labels.company, normalized.company);
    addRow(summaryRows, labels.district, normalized.location);
    addRow(summaryRows, labels.project, labelForOption("projectType", normalized.projectType, lng));
    addRow(summaryRows, labels.packageInterest, labelForOption("packageInterest", normalized.packageInterest, lng, packageOptions));
    addRow(summaryRows, "Website", normalized.website);
    addRow(summaryRows, labels.currentWebsite, labelForOption("existingWebsiteStatus", normalized.currentWebsite, lng));
    addRow(summaryRows, labels.existingWebsiteUrl, normalized.existingWebsiteUrl);
    addRow(summaryRows, labels.pageScope, labelForOption("pageScope", normalized.pageScope, lng));
    addRow(summaryRows, labels.contentStatus, labelForOption("contentStatus", normalized.contentStatus, lng));
    addRow(summaryRows, labels.services, labelsForOptions("optionalFeatures", normalized.services, lng));
    addRow(summaryRows, labels.goals, normalized.goals);
    addRow(summaryRows, labels.budget, labelForOption("budgetRange", normalized.budget, lng));
    addRow(summaryRows, labels.timeline, labelForOption("timeline", normalized.timeline, lng));
    addRow(summaryRows, labels.preferredContact, labelForOption("preferredContact", normalized.preferredContact, lng));
    addRow(summaryRows, labels.hostingMaintenanceInterest, labelForOption("hostingMaintenanceInterest", normalized.hostingMaintenanceInterest, lng));
    addRow(summaryRows, labels.message, normalized.message);
    if (attachments.length) {
        addRow(summaryRows, labels.files, attachments.map(file => file.originalname));
    }
    addRow(summaryRows, "UTM Source", normalized.utmSource);
    addRow(summaryRows, "UTM Medium", normalized.utmMedium);
    addRow(summaryRows, labels.utmCampaign, normalized.utmCampaign);

    normalized.extras.forEach(([key, value]) => addRow(summaryRows, formatLabel(key), value));

    const adminSummaryRows = [...summaryRows];
    addLeadQualificationRows(adminSummaryRows, buildLeadQualification(normalized), lng, { packageOptions });

    const summaryHtml = buildHtmlSummary(summaryRows);
    const adminSummaryHtml = buildHtmlSummary(adminSummaryRows);
    const summaryPlain = summaryRows
        .map(([label, value]) => `${label}: ${toPlainValue(value)}`)
        .join(" | ");

    const extrasPlain = normalized.extras
        .map(([key, value]) => `${formatLabel(key)}: ${toPlainValue(value)}`)
        .join(" | ");
    const utmPlain = joinNonEmpty([
        normalized.utmSource && `UTM Source: ${normalized.utmSource}`,
        normalized.utmMedium && `UTM Medium: ${normalized.utmMedium}`,
        normalized.utmCampaign && `${labels.utmCampaign}: ${normalized.utmCampaign}`
    ]);

    const featuresOther = joinNonEmpty([
        normalized.website && `Website: ${normalized.website}`,
        normalized.currentWebsite && `${labels.currentWebsite}: ${normalized.currentWebsite}`,
        normalized.location && `${labels.district}: ${normalized.location}`,
        extrasPlain,
        utmPlain
    ]);
    const additionalInfo = joinNonEmpty([
        normalized.message,
        normalized.goals && `${labels.goals}: ${normalized.goals}`,
        normalized.budget && `${labels.budget}: ${normalized.budget}`,
        normalized.timeline && `${labels.timeline}: ${normalized.timeline}`
    ]);

    let booking = null;
    let contactRequest = null;
    try {
        if (db) {
            const startTime = new Date();
            const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
            const { rows: aptRows } = await db.query(
                `INSERT INTO appointments (start_time, end_time, title, is_booked)
                 VALUES ($1, $2, $3, TRUE)
                 RETURNING id`,
                [startTime.toISOString(), endTime.toISOString(), "Ohne Termin"]
            );

            const appointmentId = aptRows[0]?.id;
            if (appointmentId) {
                booking = await Book.create(
                    appointmentId,
                    normalized.name,
                    normalized.email,
                    lng === "en" ? "Without appointment slot (webdesign-berlin form)" : "Ohne Termin (webdesign-berlin Formular)",
                    lng
                );
            }
        }

        contactRequest = await CReq.create({
            paket: normalized.packageInterest || normalized.projectType || "Webdesign Berlin Anfrage",
            umfang: normalized.pageScope || normalized.goals || null,
            texterstellung: normalized.contentStatus || "n/a",
            bilderstellung: "n/a",
            features: normalized.services.length ? normalized.services.join(", ") : "",
            featuresOther: featuresOther || summaryPlain,
            bookingId: booking?.id || null,
            name: normalized.name,
            email: normalized.email,
            phone: normalized.phone || "",
            company: normalized.company || "",
            additionalInfo: additionalInfo || summaryPlain,
            images: "",
            appointmentTime: null
        });
    } catch (err) {
        logSafeError("❌ Fehler beim Speichern der Webdesign-Berlin-Anfrage:", err);
    }

    const transporter = createTransporter();
    const greetingName = escapeHtml(normalized.name || (lng === "en" ? "interested visitor" : "Interessent:in"));
    const attachmentListHtml = attachments.length
        ? `<p>${lng === "en" ? "You submitted the following files:" : "Folgende Dateien hast du übermittelt:"}</p><ul>${attachments
            .map(file => `<li>${escapeHtml(file.originalname)}</li>`)
            .join("")}</ul>`
        : "";
    const uploadHintHtml = `<p style="color:#6c757d;font-size:14px;">${lng === "en"
        ? `Note: You can upload up to ${MAX_ATTACHMENTS} files with a total size of 15 MB.`
        : `Hinweis: Du kannst bis zu ${MAX_ATTACHMENTS} Dateien mit insgesamt 15 MB senden.`}</p>`;
    const userHtml = `
        <p>${lng === "en" ? "Hello" : "Hallo"} <strong>${greetingName}</strong>,</p>
        <p>${lng === "en"
            ? "thank you for your request via our Webdesign Berlin page. We have received the following details:"
            : "vielen Dank für deine Anfrage. Ich habe die folgenden Angaben erhalten:"}</p>
        ${summaryHtml}
        ${attachmentListHtml}
        ${uploadHintHtml}
        <p>${lng === "en"
            ? "I will review your details and suggest a useful next step. A project only starts after scope, offer and approval are clarified."
            : "Ich schaue mir deine Angaben an und schlage dir einen sinnvollen nächsten Schritt vor. Ein Projekt startet erst nach Abstimmung, Angebot und Freigabe."}</p>
        <p>${lng === "en" ? "Best regards" : "Viele Grüße"}<br>Komplett Webdesign</p>
    `;
    const adminHtml = `
        <p><strong>Neue Anfrage über webdesign-berlin auf (${lng})</strong></p>
        ${adminSummaryHtml}
        ${attachmentListHtml}
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
                from: '"Komplett Webdesign" <kontakt@komplettwebdesign.de>',
                to: normalized.email,
                subject: lng === "en"
                    ? "Confirmation of your request - Webdesign Berlin"
                    : "Bestätigung deiner Anfrage - Webdesign Berlin",
                html: renderBrandEmail({
                    locale: lng,
                    subject: lng === "en"
                        ? "Confirmation of your request - Webdesign Berlin"
                        : "Bestätigung deiner Anfrage - Webdesign Berlin",
                    headline: lng === "en" ? "Thank you for your request" : "Vielen Dank für deine Anfrage",
                    preheader: lng === "en" ? "I received your Webdesign Berlin request." : "Ich habe deine Webdesign-Berlin-Anfrage erhalten.",
                    bodyHtml: userHtml
                })
            }).catch(err => logSafeError("❌ Fehler beim Versand (Kunde Webdesign Berlin):", err))
        );
    }
    mailPromises.push(
        transporter.sendMail({
            from: '"Komplett Webdesign" <kontakt@komplettwebdesign.de>',
            to: 'kontakt@komplettwebdesign.de',
            replyTo: hasValidEmail ? normalized.email : undefined,
            subject: `Neue Anfrage über webdesign-berlin auf (${lng})`,
            html: renderBrandEmail({
                locale: lng,
                subject: `Neue Anfrage über webdesign-berlin auf (${lng})`,
                headline: "Neue Webdesign-Berlin-Anfrage",
                preheader: "Es wurde eine neue Anfrage mit Details eingereicht.",
                bodyHtml: adminHtml
            }),
            attachments: adminAttachments
        }).catch(err => logSafeError("❌ Fehler beim Versand (Admin Webdesign Berlin):", err))
    );
    await Promise.all(mailPromises);

    const successPayload = {
        success: true,
        message: lng === "en"
            ? "Thanks for your request. I will review your details and get back to you with a useful next step."
            : "Danke für deine Anfrage. Ich schaue mir deine Angaben an und melde mich mit einem sinnvollen nächsten Schritt."
    };

    if (expectsJson(req)) {
        return res.json(successPayload);
    }

    const thankYouData = {
        paket: normalized.packageInterest || normalized.projectType || "Webdesign Berlin",
        umfang: normalized.pageScope || normalized.goals || "",
        projectType: normalized.projectType,
        packageInterest: normalized.packageInterest,
        budgetRange: normalized.budget,
        timeline: normalized.timeline,
        existingWebsiteStatus: normalized.currentWebsite,
        existingWebsiteUrl: normalized.existingWebsiteUrl,
        contentStatus: normalized.contentStatus,
        hostingMaintenanceInterest: normalized.hostingMaintenanceInterest,
        preferredContact: normalized.preferredContact,
        inhalte: normalized.services,
        weitereWuensche: featuresOther,
        name: normalized.name,
        email: normalized.email,
        telefon: normalized.phone,
        firma: normalized.company,
        sonstigeInfos: additionalInfo
    };

    return res.render('kontakt/thankyou', {
        title: lng === "en" ? "Thanks for your request" : "Danke für deine Anfrage",
        description: lng === "en" ? "Confirmation of your request" : "Bestätigung deiner Kontaktanfrage",
        robots: "noindex,nofollow",
        data: thankYouData,
        appointment: null,
        formattedAppointment: null,
        leadEventId: contactRequest?.id ? `contact-${contactRequest.id}` : null,
        successFormId: isContactQuick ? "contactQuickForm" : "webdesignBerlinForm",
        successFormVariant: isContactQuick ? "quick" : "webdesign_berlin",
        lng
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
