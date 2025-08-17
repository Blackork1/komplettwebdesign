// controllers/packagesController.js
import { de } from 'date-fns/locale';
import pool from '../util/db.js';
import nodemailer from 'nodemailer';
import { title } from 'process';
import {
  getNextOpenSlots,
  lockSlot,
  unlockSlot
} from '../models/appointmentModel.js';
import * as Book from '../models/bookingModel.js';
import { sendBookingMail, sendAdminBookingInfo } from '../services/mailService.js';
import { buildPackageSchemas } from '../util/seoSchemas.js';



// ────────────────────────────────────────────────────────────────────────────────
//  Nodemailer-Transport (nutzt deine SMTP-Env-Variablen)
// ────────────────────────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465,      // SSL nur bei Port 465
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

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
  try {
    const { rows: packages } = await pool.query(
      'SELECT * FROM packages ORDER BY price'   // oder price_amount_cents
    );
    res.render('packages_list', { packages, title: 'Pakete & Angebote | KomplettWebdesign', description: 'Unsere Pakete im Überblick. Hier erhälst du Informationen zu unserem Paketen und Angeboten.' });
  } catch (err) {
    console.error('❌ listPackages:', err);
    res.status(500).send('Pakete konnten nicht geladen werden.');
  }
}

// ────────────────────────────────────────────────────────────────────────────────
//  Detailseite eines Pakets
//  GET /packages/:slug
// ────────────────────────────────────────────────────────────────────────────────
export async function showPackage(req, res) {
  const slug = req.params.slug.toLowerCase();
  try {
    const { rows } = await pool.query(
      'SELECT * FROM packages WHERE LOWER(name) = $1 LIMIT 1',
      [slug]
    );
    if (!rows.length) return res.status(404).send('Paket nicht gefunden');

    const pack = rows[0];
    const slots = await getNextOpenSlots(3);

    const baseUrl = resolveBaseUrl(req);
    const url = `${baseUrl}${req.originalUrl}`;
    const jsonLd = buildPackageSchemas({ pack, url, baseUrl });

    res.render('package_detail', {
      pack,
      slots,
      title: `Paket: ${pack.name} | KomplettWebdesign`,
      description: `Details zu unserem Paket ${pack.name}.`,
      jsonLd // ← hier rein
    });
  } catch (err) {
    console.error('❌ showPackage:', err);
    res.status(500).send('Paket konnte nicht geladen werden.');
  }
}

export async function handleContact(req, res) {
  const slug = req.params.slug.toLowerCase();
  const { name, email, slot } = req.body;
  let lockedSlot = null;
  let booking = null;
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
      title: `Paket: ${pack.name} | KomplettWebdesign`,
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
