// controllers/packagesController.js
import { de } from 'date-fns/locale';
import pool from '../util/db.js';
import nodemailer from 'nodemailer';

// ────────────────────────────────────────────────────────────────────────────────
//  Nodemailer-Transport (nutzt deine SMTP-Env-Variablen)
// ────────────────────────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465,      // SSL nur bei Port 465
  auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

// ────────────────────────────────────────────────────────────────────────────────
//  Übersicht aller Pakete
//  GET /packages
// ────────────────────────────────────────────────────────────────────────────────
export async function listPackages(req, res) {
  try {
    const { rows: packages } = await pool.query(
      'SELECT * FROM packages ORDER BY price'   // oder price_amount_cents
    );
    res.render('packages_list', { packages, title: 'Pakete | Komplettwebdesign', description: 'Unsere Pakete im Überblick' });
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
    res.render('package_detail', { pack: rows[0] , title: `Paket: ${rows[0].name} | Komplettwebdesign`, description: 'Details zu unserem Paket' });
  } catch (err) {
    console.error('❌ showPackage:', err);
    res.status(500).send('Paket konnte nicht geladen werden.');
  }
}

// ────────────────────────────────────────────────────────────────────────────────
//  Kontaktformular verarbeiten
//  POST /packages/:slug/kontakt
// ────────────────────────────────────────────────────────────────────────────────
export async function handleContact(req, res) {
  const slug = req.params.slug.toLowerCase();
  const { name, email, slot } = req.body;           // slot = ausgewählter Termin
  try {
    // Paketdaten holen (für Mail & Bestätigung)
    const { rows } = await pool.query(
      'SELECT * FROM packages WHERE LOWER(name) = $1 LIMIT 1',
      [slug]
    );
    if (!rows.length) return res.status(404).send('Paket nicht gefunden');
    const pack = rows[0];

    // Bestätigungs-Mail an Kunden
    const html = `
      <p>Hallo <strong>${name}</strong>,</p>
      <p>
        Sie haben sich für das <strong>${pack.name}-Paket</strong> entschieden.
        Keine Sorge, Sie müssen noch nichts bezahlen. 
        Wir treffen uns zunächst zu einem Online-Beratungsgespräch 
        (gern auch persönlich).<br><br>
        <em>Ausgewählter Termin:</em> ${slot || 'wird noch abgestimmt'}
      </p>
      <p>Beste Grüße<br>Komplettwebdesign</p>
    `;

    await transporter.sendMail({
      from: '"Komplettwebdesign" <kontakt@komplettwebdesign.de>',
      to:   email,
      subject: `Ihre Anfrage – ${pack.name}-Paket`,
      html
    });

    // Erfolgsmeldung zurück auf Detailseite
    res.render('package_detail', {
      pack,
      successMessage: 'Vielen Dank! Wir haben Ihre Anfrage erhalten und melden uns bald.'
    });
  } catch (err) {
    console.error('❌ handleContact:', err);
    res.status(500).send('Fehler beim Senden der Anfrage. Bitte später erneut versuchen.');
  }
}
