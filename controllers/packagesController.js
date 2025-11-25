// controllers/packagesController.js
import { de } from 'date-fns/locale';
import pool from '../util/db.js';
import nodemailer from 'nodemailer';
import { title } from 'process';
import axios from 'axios';
import {
  getNextOpenSlots,
  lockSlot,
  unlockSlot
} from '../models/appointmentModel.js';
import * as Book from '../models/bookingModel.js';
import { sendBookingMail, sendAdminBookingInfo } from '../services/mailService.js';
import { buildPackageSchemas } from '../util/seoSchemas.js';
import { mockPackages } from '../data/mockPackages.js';



// ────────────────────────────────────────────────────────────────────────────────
//  Nodemailer-Transport (nutzt deine SMTP-Env-Variablen)
// ────────────────────────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465,      // SSL nur bei Port 465
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

const RECAPTCHA_MIN_SCORE = Number(process.env.RECAPTCHA_MIN_SCORE || 0.5);
const RECAPTCHA_ACTION = 'package_contact';


// (optional) falls du kein util/resolveBaseUrl.js nutzt:
function resolveBaseUrl(req) {
  const proto = req.headers['cf-visitor']
    ? (JSON.parse(req.headers['cf-visitor']).scheme || 'https')
    : (req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http'));
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${proto}://${host}`;
}

// ────────────────────────────────────────────────────────────────────────────────
//  Übersicht aller Pakete
//  GET /packages
// ────────────────────────────────────────────────────────────────────────────────
export async function listPackages(req, res) {
  const pageMeta = {
    title: 'Unsere Website Pakete - Premium Webdesign Pakete',
    description: 'Professionelle Website Pakete für Selbstständige & KMU. Von der schnellen Landingpage bis zum maßgeschneiderten Premium-Auftritt - deine Website ab 499€.'
  };
  try {
    const { rows: packages } = await pool.query(
      `SELECT id, name, slug, description, image, price_amount_cents, price, display
         FROM packages
         ORDER BY price_amount_cents NULLS LAST, id`
    );

    const { rows: featureRows } = await pool.query(
      'SELECT package_id, feature FROM package_features ORDER BY id'
    );

    const mockFeatureBySlug = new Map(
      (mockPackages || []).map(p => [String(p.slug || '').toLowerCase(), Array.isArray(p.features) ? p.features : []])
    );

    const featureMap = featureRows.reduce((acc, row) => {
      acc[row.package_id] = acc[row.package_id] || [];
      acc[row.package_id].push(row.feature);
      return acc;
    }, {});

    const enhancedPackages = packages.map(pkg => ({
      ...pkg,
      features: mockFeatureBySlug.get(String(pkg.slug || '').toLowerCase())
        ?? featureMap[pkg.id]
        ?? []
    }));

    res.render('packages_list', { packages: enhancedPackages, ...pageMeta });
  } catch (err) {
    console.error('❌ listPackages:', err);
    if (process.env.NODE_ENV !== 'production' && mockPackages.length) {
      console.warn('⚠️ Fallback auf Mock-Pakete für /pakete aktiviert.');
      res.render('packages_list', { packages: mockPackages, ...pageMeta });
      return;
    }
    res.status(500).send('Pakete konnten nicht geladen werden.');
  }
}

// ────────────────────────────────────────────────────────────────────────────────
//  Detailseite eines Pakets
//  GET /packages/:slug
// ────────────────────────────────────────────────────────────────────────────────
export async function showPackage(req, res) {
  const slug = req.params.slug.toLowerCase();
  let pack = null;
  let slots = [];
  let jsonLd = [];

  try {
    const { rows } = await pool.query(
      'SELECT * FROM packages WHERE LOWER(name) = $1 LIMIT 1',
      [slug]
    );
    if (rows.length) {
      pack = rows[0];
    }
  } catch (err) {
    console.error('❌ showPackage (DB):', err);
  }
  if (!pack) {
    const fallbackPack = (mockPackages || []).find(mock => {
      const mockSlug = String(mock.slug || mock.name || '').toLowerCase();
      const mockName = String(mock.name || '').toLowerCase();
      return mockSlug === slug || mockName === slug;
    });

    if (fallbackPack) {
      pack = fallbackPack;
    } else {
      return res.status(404).send('Paket nicht gefunden');
    }
  }

  try {
    slots = await getNextOpenSlots(3);
  } catch (err) {
    console.error('❌ showPackage (slots):', err);
    slots = [];
  }

  try {

    const baseUrl = resolveBaseUrl(req);
    const url = `${baseUrl}${req.originalUrl}`;
    jsonLd = buildPackageSchemas({ pack, url, baseUrl });

  } catch (err) {
    console.error('❌ showPackage (schema):', err);
    jsonLd = [];
  }
  const seoExtra = `<link rel="canonical" href="${resolveBaseUrl(req)}${req.originalUrl}">`;

  res.render('package_detail', {
    pack,
    slots,
    seoExtra,
    title: `Paket: ${pack.name} - Komplett Webdesign`,
    description: `Details zu unserem Paket ${pack.name}.`,
    jsonLd,
    successMessage: null
  });
}

export async function handleContact(req, res) {
  const slug = req.params.slug.toLowerCase();
  const { name, email, slot } = req.body;
  let lockedSlot = null;
  let booking = null;
  const token = typeof req.body.token === 'string' ? req.body.token.trim() : '';

  if (!token) {
    return res.status(400).send('reCAPTCHA-Token fehlt. Bitte versuche es erneut.');
  }

  try {
    const secret = process.env.RECAPTCHA_SECRET;
    if (!secret) throw new Error('Kein reCAPTCHA-Secret konfiguriert.');

    const params = new URLSearchParams({
      secret,
      response: token,
      remoteip: req.ip ?? '',
    });

    const { data } = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      params.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    if (!data?.success) throw new Error('reCAPTCHA: success=false');
    if (typeof data.score === 'number' && data.score < RECAPTCHA_MIN_SCORE) {
      throw new Error(`reCAPTCHA: score ${data.score} < ${RECAPTCHA_MIN_SCORE}`);
    }
    if (data.action && data.action !== RECAPTCHA_ACTION) {
      throw new Error(`reCAPTCHA: action mismatch "${data.action}" != "${RECAPTCHA_ACTION}"`);
    }
  } catch (err) {
    console.error('reCAPTCHA-Validierung fehlgeschlagen:', err?.message || err);
    return res.status(400).send('reCAPTCHA-Validierung fehlgeschlagen. Bitte versuche es erneut.');
  }
  try {
    // Paketdaten holen (für Mail & Bestätigung)
    const { rows } = await pool.query(
      'SELECT * FROM packages WHERE LOWER(name) = $1 LIMIT 1',
      [slug]
    );
    if (!rows.length) return res.status(404).send('Paket nicht gefunden');
    const pack = rows[0];

    if (slot) {
      lockedSlot = await lockSlot(Number(slot));
      if (!lockedSlot) return res.render('booking/slot_taken', { title: "Termin vergeben", description: "Leider war jemand schneller. Bitte wählen Sie einen anderen Termin." });
      booking = await Book.create(lockedSlot.id, name, email);
    }

    const slots = await getNextOpenSlots(3);

    const slotText = lockedSlot
      ? new Date(lockedSlot.start_time).toLocaleString('de-DE', {
        weekday: 'short', day: '2-digit', month: 'short',
        hour: '2-digit', minute: '2-digit'
      })
      : null;

    if (lockedSlot) {
      await sendBookingMail({ to: email, name, appointment: lockedSlot, type: 'pending' });
      await sendAdminBookingInfo({ booking, appointment: lockedSlot, type: 'new' });
    } else {
      const html = `
        <p>Hallo <strong>${name}</strong>,</p>
        <p>
          Sie haben sich für das <strong>${pack.name}-Paket</strong> entschieden.
          Keine Sorge, Sie müssen noch nichts bezahlen.
          Wir treffen uns zunächst zu einem Online-Beratungsgespräch
          (gern auch persönlich).
        </p>
        <p>Beste Grüße<br>KomplettWebdesign</p>
      `;
      await transporter.sendMail({
        from: '"KomplettWebdesign" <kontakt@komplettwebdesign.de>',
        to: email,
        subject: `Ihre Anfrage – ${pack.name}-Paket`,
        html
      });
    }

    // Erfolgsmeldung zurück auf Detailseite
    res.render('package_detail', {
      title: `Paket: ${pack.name} - Komplett Webdesign`,
      description: 'Details zu unserem Paket',
      slots: slots,
      pack,
      successMessage: 'Vielen Dank! Wir haben Ihre Anfrage erhalten und melden uns bald.'
    });
  } catch (err) {
    console.error('❌ handleContact:', err);
    if (lockedSlot) await unlockSlot(lockedSlot.id);
    if (booking) await Book.remove(booking.id);
    res.status(500).send('Fehler beim Senden der Anfrage. Bitte später erneut versuchen.');
  }
}
