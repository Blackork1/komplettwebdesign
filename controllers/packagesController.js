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

function resolvePackageLocale(req) {
  if (req.query?.lng === 'en') return 'en';
  if (req.baseUrl?.startsWith('/en/')) return 'en';
  const referer = String(req.get('referer') || '');
  if (referer.includes('/en/') || referer.endsWith('/en')) return 'en';
  return 'de';
}

function normalizePackSlug(pack, fallbackSlug = '') {
  const raw = String(pack?.slug || pack?.name || fallbackSlug || '').trim().toLowerCase();
  if (!raw) return '';
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function buildPackagesListMeta({ isEn }) {
  return isEn
    ? {
      title: 'Web Design Packages Berlin | Basic, Business, Premium',
      description: 'Compare transparent web design packages in Berlin: Basic, Business and Premium. Includes design, SEO basics, hosting and support from EUR 499.',
      keywords: 'web design packages berlin, website package pricing, basic business premium website, webdesigner berlin prices, website costs berlin'
    }
    : {
      title: 'Webdesign Pakete Berlin | Basis, Business, Premium Preise',
      description: 'Vergleiche transparente Webdesign-Pakete in Berlin: Basis, Business und Premium. Inklusive Design, SEO-Basis, Hosting und Support ab 499 EUR.',
      keywords: 'webdesign pakete berlin, website paket preise, basis business premium website, webdesigner berlin kosten, website kosten berlin'
    };
}

function buildPackageDetailMeta({ slug, isEn, fallbackName, fallbackDescription }) {
  const map = {
    basis: isEn
      ? {
        title: 'Basic Website Package Berlin | Fast Professional Start',
        description: 'Basic package for a fast professional website launch in Berlin. One-page design, legal pages, SEO basics and hosting from EUR 499.'
      }
      : {
        title: 'Basis Paket Berlin | Professionelle Website ab 499 EUR',
        description: 'Basis-Paket für den schnellen professionellen Website-Start in Berlin. Onepager, rechtliche Seiten, SEO-Basis und Hosting ab 499 EUR.'
      },
    business: isEn
      ? {
        title: 'Business Website Package Berlin | More Leads, More Pages',
        description: 'Business package for growing companies in Berlin. Multi-page website, conversion-focused copy, SEO and integrations from EUR 899.'
      }
      : {
        title: 'Business Paket Berlin | Mehr Seiten, mehr Anfragen',
        description: 'Business-Paket für wachsende Unternehmen in Berlin. Mehrseitige Website, conversion-orientierte Inhalte, SEO und Integrationen ab 899 EUR.'
      },
    premium: isEn
      ? {
        title: 'Premium Website Package Berlin | Strategy, Content, Support',
        description: 'Premium package for ambitious brands in Berlin. Strategy, custom UX, content production and ongoing support from EUR 1,499.'
      }
      : {
        title: 'Premium Paket Berlin | Strategie, Content und Betreuung',
        description: 'Premium-Paket für ambitionierte Marken in Berlin. Strategie, individuelles UX-Design, Content-Produktion und laufende Betreuung ab 1.499 EUR.'
      }
  };

  if (map[slug]) {
    return {
      ...map[slug],
      keywords: isEn
        ? `web design ${slug} package berlin, ${slug} website package, website pricing berlin, komplett webdesign`
        : `webdesign ${slug} paket berlin, ${slug} website paket, website preise berlin, komplett webdesign`
    };
  }

  return {
    title: isEn
      ? `${fallbackName} Package Berlin | Komplett Webdesign`
      : `${fallbackName}-Paket Berlin | Komplett Webdesign`,
    description: fallbackDescription || (isEn
      ? `${fallbackName} package by Komplett Webdesign in Berlin.`
      : `${fallbackName}-Paket von Komplett Webdesign in Berlin.`),
    keywords: isEn
      ? 'web design package berlin, website package pricing berlin, komplett webdesign'
      : 'webdesign paket berlin, website paket preise berlin, komplett webdesign'
  };
}

function buildPackagesSeoExtra({ req, isEn, title, description, imagePath, pathOverride }) {
  const baseUrl = resolveBaseUrl(req).replace(/\/$/, '');
  const rawPath = pathOverride || req.path;
  const pathname = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  const deUrl = `${baseUrl}${pathname}`;
  const enUrl = `${baseUrl}${pathname}?lng=en`;
  const canonical = isEn ? enUrl : deUrl;
  const ogLocale = isEn ? 'en_US' : 'de_DE';
  const ogLocaleAlt = isEn ? 'de_DE' : 'en_US';
  const image = imagePath && imagePath.startsWith('http')
    ? imagePath
    : `${baseUrl}${imagePath || '/images/preiseHero.webp'}`;

  return `
  <link rel="canonical" href="${canonical}">
  <link rel="alternate" hreflang="de-DE" href="${deUrl}">
  <link rel="alternate" hreflang="en-US" href="${enUrl}">
  <link rel="alternate" hreflang="x-default" href="${deUrl}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${image}">
  <meta property="og:locale" content="${ogLocale}">
  <meta property="og:locale:alternate" content="${ogLocaleAlt}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${image}">
  `;
}

// ────────────────────────────────────────────────────────────────────────────────
//  Übersicht aller Pakete
//  GET /packages
// ────────────────────────────────────────────────────────────────────────────────
export async function listPackages(req, res) {
  const lng = resolvePackageLocale(req);
  const isEn = lng === 'en';
  const baseMeta = buildPackagesListMeta({ isEn });
  const pageMeta = {
    ...baseMeta,
    seoExtra: buildPackagesSeoExtra({
      req,
      isEn,
      title: baseMeta.title,
      description: baseMeta.description,
      imagePath: '/images/preiseHero.webp'
    })
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

    res.render('packages_list', { packages: enhancedPackages, lng, isEn, ...pageMeta });
  } catch (err) {
    console.error('❌ listPackages:', err);
    if (process.env.NODE_ENV !== 'production' && mockPackages.length) {
      console.warn('⚠️ Fallback auf Mock-Pakete für /pakete aktiviert.');
      res.render('packages_list', { packages: mockPackages, lng, isEn, ...pageMeta });
      return;
    }
    res.status(500).send(isEn ? 'Packages could not be loaded.' : 'Pakete konnten nicht geladen werden.');
  }
}

// ────────────────────────────────────────────────────────────────────────────────
//  Detailseite eines Pakets
//  GET /packages/:slug
// ────────────────────────────────────────────────────────────────────────────────
export async function showPackage(req, res) {
  const slug = req.params.slug.toLowerCase();
  const lng = resolvePackageLocale(req);
  const isEn = lng === 'en';
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
      return res.status(404).send(isEn ? 'Package not found' : 'Paket nicht gefunden');
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
    jsonLd = buildPackageSchemas({ pack, url, baseUrl, lng });

  } catch (err) {
    console.error('❌ showPackage (schema):', err);
    jsonLd = [];
  }
  const normalizedSlug = normalizePackSlug(pack, slug);
  const detailMeta = buildPackageDetailMeta({
    slug: normalizedSlug,
    isEn,
    fallbackName: pack.name || (isEn ? 'Website' : 'Website'),
    fallbackDescription: pack.description
  });
  res.render('package_detail', {
    pack,
    slots,
    title: detailMeta.title,
    description: detailMeta.description,
    keywords: detailMeta.keywords,
    seoExtra: buildPackagesSeoExtra({
      req,
      isEn,
      title: detailMeta.title,
      description: detailMeta.description,
      imagePath: pack?.image?.startsWith('/')
        ? pack.image
        : (pack?.image ? `/images/${pack.image}` : '/images/preiseHero.webp')
    }),
    lng,
    isEn,
    jsonLd,
    successMessage: null
  });
}

export async function handleContact(req, res) {
  const slug = req.params.slug.toLowerCase();
  const { name, email, slot } = req.body;
  const locale = req.body.locale === 'en' ? 'en' : 'de';
  const lng = locale;
  const isEn = locale === 'en';
  let lockedSlot = null;
  let booking = null;
  const token = typeof req.body.token === 'string' ? req.body.token.trim() : '';

  if (!token) {
    return res.status(400).send(isEn ? 'reCAPTCHA token missing. Please try again.' : 'reCAPTCHA-Token fehlt. Bitte versuche es erneut.');
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
    return res.status(400).send(isEn ? 'reCAPTCHA validation failed. Please try again.' : 'reCAPTCHA-Validierung fehlgeschlagen. Bitte versuche es erneut.');
  }
  try {
    // Paketdaten holen (für Mail & Bestätigung)
    const { rows } = await pool.query(
      'SELECT * FROM packages WHERE LOWER(name) = $1 LIMIT 1',
      [slug]
    );
    if (!rows.length) return res.status(404).send(isEn ? 'Package not found' : 'Paket nicht gefunden');
    const pack = rows[0];

    if (slot) {
      lockedSlot = await lockSlot(Number(slot));
      if (!lockedSlot) return res.render('booking/slot_taken', {
        title: isEn ? "Slot unavailable" : "Termin vergeben",
        description: isEn
          ? "That slot was just taken. Please choose a different appointment."
          : "Leider war jemand schneller. Bitte wählen Sie einen anderen Termin."
      });
      booking = await Book.create(lockedSlot.id, name, email, null, locale);
    }

    const slots = await getNextOpenSlots(3);

    const slotText = lockedSlot
      ? new Date(lockedSlot.start_time).toLocaleString('de-DE', {
        weekday: 'short', day: '2-digit', month: 'short',
        hour: '2-digit', minute: '2-digit'
      })
      : null;

    if (lockedSlot) {
      await sendBookingMail({ to: email, name, appointment: lockedSlot, type: 'pending', locale });
      await sendAdminBookingInfo({ booking, appointment: lockedSlot, type: 'new' });
    } else {
      const html = isEn
        ? `
        <p>Hello <strong>${name}</strong>,</p>
        <p>
          You selected the <strong>${pack.name} package</strong>.
          No worries, you do not need to pay anything yet.
          We will first meet for an online consultation
          (in person is also possible).
        </p>
        <p>Best regards<br>Komplett Webdesign</p>
      `
        : `
        <p>Hallo <strong>${name}</strong>,</p>
        <p>
          Sie haben sich für das <strong>${pack.name}-Paket</strong> entschieden.
          Keine Sorge, Sie müssen noch nichts bezahlen.
          Wir treffen uns zunächst zu einem Online-Beratungsgespräch
          (gern auch persönlich).
        </p>
        <p>Beste Grüße<br>Komplett Webdesign</p>
      `;
      await transporter.sendMail({
        from: '"Komplett Webdesign" <kontakt@komplettwebdesign.de>',
        to: email,
        subject: isEn ? `Your request - ${pack.name} package` : `Ihre Anfrage – ${pack.name}-Paket`,
        html
      });
    }

    // Erfolgsmeldung zurück auf Detailseite
    const normalizedSlug = normalizePackSlug(pack, slug);
    const detailMeta = buildPackageDetailMeta({
      slug: normalizedSlug,
      isEn,
      fallbackName: pack.name || (isEn ? 'Website' : 'Website'),
      fallbackDescription: pack.description
    });
    res.render('package_detail', {
      title: detailMeta.title,
      description: detailMeta.description,
      keywords: detailMeta.keywords,
      seoExtra: buildPackagesSeoExtra({
        req,
        isEn,
        title: detailMeta.title,
        description: detailMeta.description,
        pathOverride: `/pakete/${slug}`,
        imagePath: pack?.image?.startsWith('/')
          ? pack.image
          : (pack?.image ? `/images/${pack.image}` : '/images/preiseHero.webp')
      }),
      slots: slots,
      pack,
      lng,
      isEn,
      successMessage: isEn
        ? 'Thank you! We received your request and will get back to you soon.'
        : 'Vielen Dank! Wir haben Ihre Anfrage erhalten und melden uns bald.'
    });
  } catch (err) {
    console.error('❌ handleContact:', err);
    if (lockedSlot) await unlockSlot(lockedSlot.id);
    if (booking) await Book.remove(booking.id);
    res.status(500).send(isEn
      ? 'Error sending your request. Please try again later.'
      : 'Fehler beim Senden der Anfrage. Bitte später erneut versuchen.');
  }
}
