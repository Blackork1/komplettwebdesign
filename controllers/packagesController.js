import nodemailer from 'nodemailer';
import axios from 'axios';
import {
  getNextOpenSlots,
  lockSlot,
  unlockSlot
} from '../models/appointmentModel.js';
import * as Book from '../models/bookingModel.js';
import { sendBookingMail, sendAdminBookingInfo } from '../services/mailService.js';
import { renderBrandEmail } from '../services/emailTemplateService.js';
import pricingService from '../services/pricingService.js';
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

const RECAPTCHA_MIN_SCORE = Number(process.env.RECAPTCHA_MIN_SCORE || 0.5);
const RECAPTCHA_ACTION = 'package_contact';
const PACKAGE_CUSTOM_SLOT_VALUE = '__custom';


// (optional) falls du kein util/resolveBaseUrl.js nutzt:
function resolveBaseUrl(req, configuredBaseUrl = '') {
  if (configuredBaseUrl) return String(configuredBaseUrl).replace(/\/$/, '');
  if (process.env.CANONICAL_BASE_URL) return String(process.env.CANONICAL_BASE_URL).replace(/\/$/, '');
  if (process.env.BASE_URL) return String(process.env.BASE_URL).replace(/\/$/, '');
  const proto = req.headers['cf-visitor']
    ? (JSON.parse(req.headers['cf-visitor']).scheme || 'https')
    : (req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http'));
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${proto}://${host}`;
}

function resolvePackageLocale(req) {
  if (req.baseUrl?.startsWith('/en')) return 'en';
  if (req.originalUrl?.startsWith('/en/')) return 'en';
  if (req.query?.lng === 'en') return 'en';
  const referer = String(req.get('referer') || '');
  if (referer.includes('/en/') || referer.endsWith('/en')) return 'en';
  return 'de';
}

function toEnglishPriceLabel(label = '') {
  return String(label)
    .replace(/^ab\s+/i, 'from ')
    .replace(/\s*€\b/g, ' EUR')
    .replace(/oder nach Aufwand/i, 'or by effort');
}

function packageTitle(pkg, isEn = false) {
  const name = pkg?.displayName || pkg?.name || 'Website';
  if (isEn) return `${pkg?.name || name} package`;
  return name.endsWith('-Paket') || name === 'Individuelles Projekt' ? name : `${name}-Paket`;
}

function packageDescription(pkg) {
  return pkg?.shortDescription || pkg?.positioning || pkg?.longDescription || '';
}

function escapeHtmlAttribute(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeHtml(value = '') {
  return escapeHtmlAttribute(value);
}

function buildPackageSummaryLabel(packages = [], isEn = false) {
  const visible = packages.filter(Boolean).slice(0, 4);
  if (!visible.length) return '';
  const parts = visible.map((pkg) => {
    const label = isEn ? toEnglishPriceLabel(pkg.priceLabel) : pkg.priceLabel;
    return `${pkg.name || pkg.displayName}: ${label}`;
  });
  return parts.join(isEn ? ', ' : ', ');
}

function buildPackagesListMeta({ isEn, lowestPriceLabel }) {
  const deLowest = lowestPriceLabel ? ` ab ${lowestPriceLabel}` : '';
  const enLowest = lowestPriceLabel ? ` from ${toEnglishPriceLabel(lowestPriceLabel)}` : '';
  return isEn
    ? {
      title: `Website Packages & Pricing${enLowest} | Berlin`,
      description: `Compare individual website packages${enLowest} for small businesses in Berlin. Clear scope, personal implementation and transparent costs.`,
      keywords: 'website pricing berlin, web design packages berlin, website costs berlin, small business website berlin, komplett webdesign'
    }
    : {
      title: `Website-Pakete und Preise${deLowest} | Berlin`,
      description: `Vergleiche Website-Pakete${deLowest} für kleine Unternehmen in Berlin: klare Umfänge, technische SEO-Grundlagen, Zusatzleistungen und laufende Kosten getrennt eingeordnet.`,
      keywords: 'website erstellen berlin preise, webdesign pakete berlin, website paket kosten, leistungsumfang website, start business wachstum individuell, komplett webdesign'
    };
}

function buildPackageDetailMeta({ pack, isEn }) {
  const name = pack?.name || 'Website';
  const label = isEn ? toEnglishPriceLabel(pack?.priceLabel || '') : (pack?.priceLabel || '');
  const fallbackDescription = packageDescription(pack);
  return {
    title: isEn
      ? (pack?.metaTitle || `${name} Website Package | Berlin`)
      : (pack?.metaTitle || `${packageTitle(pack)} Webdesign | Berlin`),
    description: isEn
      ? (pack?.metaDescription || `${fallbackDescription} Pricing starts ${label}. Scope and add-ons are clarified before the project starts.`)
      : (pack?.metaDescription || `${fallbackDescription} ${label ? `Preis ${label}. ` : ''}Umfang, Zusatzleistungen und laufende Kosten werden vorab klar abgegrenzt.`),
    keywords: isEn
      ? 'web design package berlin, website package pricing berlin, komplett webdesign'
      : `webdesign paket berlin, ${pack?.slug || name} paket, website paket preise berlin, komplett webdesign`
  };
}

function buildPackageContactAdminHtml({ pack, name, email, locale }) {
  const isEn = locale === 'en';
  return `
    <p><strong>Neue Paketanfrage ohne gebuchten Termin</strong></p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;">
      <tr><th align="left" style="padding:6px 10px 6px 0;">Paket</th><td style="padding:6px 0;">${escapeHtml(pack?.name || pack?.displayName || 'Paket')}</td></tr>
      <tr><th align="left" style="padding:6px 10px 6px 0;">Name</th><td style="padding:6px 0;">${escapeHtml(name)}</td></tr>
      <tr><th align="left" style="padding:6px 10px 6px 0;">E-Mail</th><td style="padding:6px 0;"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
      <tr><th align="left" style="padding:6px 10px 6px 0;">Sprache</th><td style="padding:6px 0;">${isEn ? 'en' : 'de'}</td></tr>
      <tr><th align="left" style="padding:6px 10px 6px 0;">Termin</th><td style="padding:6px 0;">kein Slot ausgewählt</td></tr>
    </table>
  `;
}

async function sendPackageContactAdminCopy({ pack, name, email, locale }) {
  const isEn = locale === 'en';
  const subject = `Neue Paketanfrage: ${pack?.name || pack?.displayName || 'Paket'}`;
  return transporter.sendMail({
    from: '"Komplett Webdesign" <kontakt@komplettwebdesign.de>',
    to: 'kontakt@komplettwebdesign.de',
    replyTo: email,
    subject,
    html: renderBrandEmail({
      locale: 'de',
      subject,
      headline: 'Neue Paketanfrage',
      preheader: `${pack?.name || pack?.displayName || 'Paket'} ohne direkt gebuchten Termin`,
      bodyHtml: buildPackageContactAdminHtml({ pack, name, email, locale: isEn ? 'en' : 'de' })
    })
  });
}

function normalizeFaqsForSchema(faqs = []) {
  return faqs
    .filter((faq) => faq?.question && faq?.answer)
    .map((faq) => ({ q: faq.question, a: faq.answer }));
}

function withComparisonValueMap(rows = [], packages = [], isEn = false) {
  const dynamicPriceMap = Object.fromEntries(
    (packages || [])
      .filter((pkg) => pkg?.packageKey && pkg?.priceLabel)
      .map((pkg) => [
        pkg.packageKey,
        isEn ? toEnglishPriceLabel(pkg.priceLabel) : pkg.priceLabel
      ])
  );

  return rows.map((row) => ({
    ...row,
    valuesByPackage: row.rowKey === 'price'
      ? dynamicPriceMap
      : Object.fromEntries((row.values || []).map((item) => [item.packageKey, item.value]))
  }));
}

async function enrichOverviewPackages(packages = []) {
  return Promise.all(packages.map(async (pkg) => {
    const [features, notIncluded, useCases, faqs] = await Promise.all([
      pricingService.getPackageFeatures(pkg.id),
      pricingService.getPackageNotIncluded(pkg.id),
      pricingService.getPackageUseCases(pkg.id),
      pricingService.getPackageFaqs(pkg.id, { overviewOnly: true })
    ]);
    return {
      ...pkg,
      features,
      notIncluded,
      useCases,
      overviewFaqs: faqs,
      description: packageDescription(pkg),
      title: packageTitle(pkg)
    };
  }));
}

function buildPackagesSeoExtra({ req, baseUrl: configuredBaseUrl, isEn, title, description, imagePath, pathOverride }) {
  const baseUrl = resolveBaseUrl(req, configuredBaseUrl).replace(/\/$/, '');
  const rawPath = pathOverride || req.path;
  const pathname = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  const dePath = pathname.replace(/^\/en(?=\/|$)/, '') || '/';
  const enPath = dePath === '/' ? '/en' : `/en${dePath}`;
  const deUrl = `${baseUrl}${dePath}`;
  const enUrl = `${baseUrl}${enPath}`;
  const canonical = isEn ? enUrl : deUrl;
  const ogLocale = isEn ? 'en_US' : 'de_DE';
  const ogLocaleAlt = isEn ? 'de_DE' : 'en_US';
  const image = imagePath && imagePath.startsWith('http')
    ? imagePath
    : `${baseUrl}${imagePath || '/images/preiseHero.webp'}`;
  const safeCanonical = escapeHtmlAttribute(canonical);
  const safeDeUrl = escapeHtmlAttribute(deUrl);
  const safeEnUrl = escapeHtmlAttribute(enUrl);
  const safeTitle = escapeHtmlAttribute(title);
  const safeDescription = escapeHtmlAttribute(description);
  const safeImage = escapeHtmlAttribute(image);

  return `
  <link rel="canonical" href="${safeCanonical}">
  <link rel="alternate" hreflang="de-DE" href="${safeDeUrl}">
  <link rel="alternate" hreflang="en-US" href="${safeEnUrl}">
  <link rel="alternate" hreflang="x-default" href="${safeDeUrl}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDescription}">
  <meta property="og:url" content="${safeCanonical}">
  <meta property="og:image" content="${safeImage}">
  <meta property="og:locale" content="${ogLocale}">
  <meta property="og:locale:alternate" content="${ogLocaleAlt}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDescription}">
  <meta name="twitter:image" content="${safeImage}">
  `;
}

function resolveAddOnsTickerDurationSeconds(notes = []) {
  const note = notes.find((item) => item?.noteKey === 'addons_ticker_duration_seconds');
  const raw = String(note?.body || '').replace(',', '.');
  const seconds = Number.parseFloat(raw);
  if (!Number.isFinite(seconds)) return 35;
  return Math.min(180, Math.max(8, seconds));
}

// ────────────────────────────────────────────────────────────────────────────────
//  Übersicht aller Pakete
//  GET /packages
// ────────────────────────────────────────────────────────────────────────────────
export async function listPackages(req, res) {
  const lng = resolvePackageLocale(req);
  const isEn = lng === 'en';
  try {
    const [
      overviewPackagesRaw,
      comparisonPackages,
      comparisonRowsRaw,
      globalNotes,
      lowestPriceLabel
    ] = await Promise.all([
      pricingService.getPackagesForOverview(),
      pricingService.getPackagesForComparison(),
      pricingService.getPackageComparisonRows(),
      pricingService.getGlobalPricingNotes('packages'),
      pricingService.getLowestVisiblePackagePriceLabel()
    ]);

    const packages = await enrichOverviewPackages(overviewPackagesRaw);
    const comparisonRows = withComparisonValueMap(comparisonRowsRaw, comparisonPackages, isEn);
    const overviewFaqs = packages.flatMap((pkg) =>
      (pkg.overviewFaqs || []).map((faq) => ({
        ...faq,
        packageName: pkg.name,
        packageKey: pkg.packageKey,
        slug: pkg.slug
      }))
    );
    const packageSummaryLabel = buildPackageSummaryLabel(packages, isEn);
    const baseMeta = buildPackagesListMeta({ isEn, lowestPriceLabel });
    const pageMeta = {
      ...baseMeta,
      seoExtra: buildPackagesSeoExtra({
        req,
        baseUrl: res.locals.canonicalBaseUrl,
        isEn,
        title: baseMeta.title,
        description: baseMeta.description,
        imagePath: '/images/heroPakete.webp'
      })
    };

    res.render('packages_list', {
      packages,
      comparisonPackages,
      comparisonRows,
      overviewFaqs,
      globalNotes,
      lowestPriceLabel,
      packageSummaryLabel,
      lng,
      isEn,
      ...pageMeta
    });
  } catch (err) {
    console.error('❌ listPackages:', err?.message || err);
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
  let slots = [];
  let jsonLd = [];

  try {
    const redirectTarget = await pricingService.getPackageRedirectByOldPath(`/pakete/${slug}`);
    if (redirectTarget) {
      return res.redirect(Number(redirectTarget.statusCode || 301), `${isEn ? '/en' : ''}${redirectTarget.targetPath}`);
    }

    const [pack, previewPackages, globalNotes, optionalAddOns, addOnsTickerConfig] = await Promise.all([
      pricingService.getPackageWithDetailsBySlug(slug),
      pricingService.getPackagesForComparison(),
      pricingService.getGlobalPricingNotes('packages'),
      pricingService.getVisibleAddOns().catch((err) => {
        console.error('❌ showPackage (add-ons):', err?.message || err);
        return [];
      }),
      pricingService.getGlobalPricingNotes('package_detail_addons_config').catch(() => [])
    ]);
    if (!pack) return res.status(404).send(isEn ? 'Package not found' : 'Paket nicht gefunden');

    try {
      slots = await getNextOpenSlots(3);
    } catch (err) {
      console.error('❌ showPackage (slots):', err?.message || err);
      slots = [];
    }

    try {
      const schemaFaqs = await pricingService.getPackageFaqs(pack.id, { detailOnly: true, schemaOnly: true });
      const baseUrl = resolveBaseUrl(req, res.locals.canonicalBaseUrl);
      const url = `${baseUrl}${isEn ? '/en' : ''}${pack.canonicalPath || `/pakete/${slug}`}`;
      pack.visibleFaqs = normalizeFaqsForSchema(schemaFaqs);
      jsonLd = buildPackageSchemas({ pack, url, baseUrl, lng });
    } catch (err) {
      console.error('❌ showPackage (schema):', err?.message || err);
      jsonLd = [];
    }

    const detailMeta = buildPackageDetailMeta({ pack, isEn });
    res.render('package_detail', {
      pack: {
        ...pack,
        description: packageDescription(pack)
      },
      previewPackages,
      globalNotes,
      optionalAddOns,
      addOnsTickerDurationSeconds: resolveAddOnsTickerDurationSeconds(addOnsTickerConfig),
      slots,
      title: detailMeta.title,
      description: detailMeta.description,
      keywords: detailMeta.keywords,
      seoExtra: buildPackagesSeoExtra({
        req,
        baseUrl: res.locals.canonicalBaseUrl,
        isEn,
        title: detailMeta.title,
        description: detailMeta.description,
        pathOverride: pack.canonicalPath || `/pakete/${slug}`,
        imagePath: '/images/preiseHero.webp'
      }),
      lng,
      isEn,
      jsonLd,
      successMessage: null
    });
  } catch (err) {
    console.error('❌ showPackage:', err?.message || err);
    res.status(500).send(isEn ? 'Package could not be loaded.' : 'Paket konnte nicht geladen werden.');
  }
}

export async function handleContact(req, res) {
  const slug = req.params.slug.toLowerCase();
  const { name, email } = req.body;
  const rawSlot = typeof req.body.slot === 'string' ? req.body.slot.trim() : req.body.slot;
  const slotId = rawSlot === PACKAGE_CUSTOM_SLOT_VALUE ? NaN : Number(rawSlot);
  const hasSelectedSlot = Number.isInteger(slotId) && slotId > 0;
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
    const pack = await pricingService.getPackageWithDetailsBySlug(slug);
    if (!pack) return res.status(404).send(isEn ? 'Package not found' : 'Paket nicht gefunden');

    if (hasSelectedSlot) {
      lockedSlot = await lockSlot(slotId);
      if (!lockedSlot) return res.render('booking/slot_taken', {
        title: isEn ? "Slot unavailable" : "Termin vergeben",
        description: isEn
          ? "That slot was just taken. Please choose a different appointment."
          : "Leider war jemand schneller. Bitte wähle einen anderen Termin."
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
          Du hast dich für das <strong>${pack.name}-Paket</strong> entschieden.
          Keine Sorge, du musst noch nichts bezahlen.
          Ich melde mich zunächst zu einem Online-Beratungsgespräch
          (gern auch persönlich).
        </p>
        <p>Beste Grüße<br>Komplett Webdesign</p>
      `;
      await transporter.sendMail({
        from: '"Komplett Webdesign" <kontakt@komplettwebdesign.de>',
        to: email,
        subject: isEn ? `Your request - ${pack.name} package` : `Deine Anfrage – ${pack.name}-Paket`,
        html: renderBrandEmail({
          locale,
          subject: isEn ? `Your request - ${pack.name} package` : `Deine Anfrage – ${pack.name}-Paket`,
          headline: isEn ? "Package request received" : "Paketanfrage eingegangen",
          preheader: isEn ? "Thank you for your package request." : "Vielen Dank für deine Paketanfrage.",
          bodyHtml: html
        })
      });
      await sendPackageContactAdminCopy({
        pack,
        name,
        email,
        locale
      });
    }

    // Erfolgsmeldung zurück auf Detailseite
    const [previewPackages, globalNotes, schemaFaqs, optionalAddOns, addOnsTickerConfig] = await Promise.all([
      pricingService.getPackagesForComparison(),
      pricingService.getGlobalPricingNotes('packages'),
      pricingService.getPackageFaqs(pack.id, { detailOnly: true, schemaOnly: true }),
      pricingService.getVisibleAddOns().catch((err) => {
        console.error('❌ handleContact (add-ons):', err?.message || err);
        return [];
      }),
      pricingService.getGlobalPricingNotes('package_detail_addons_config').catch(() => [])
    ]);
    pack.visibleFaqs = normalizeFaqsForSchema(schemaFaqs);
    const detailMeta = buildPackageDetailMeta({ pack, isEn });
    const baseUrl = resolveBaseUrl(req, res.locals.canonicalBaseUrl);
    const packageCanonicalPath = pack.canonicalPath || `/pakete/${slug}`;
    res.render('package_detail', {
      title: detailMeta.title,
      description: detailMeta.description,
      keywords: detailMeta.keywords,
      seoExtra: buildPackagesSeoExtra({
        req,
        baseUrl: res.locals.canonicalBaseUrl,
        isEn,
        title: detailMeta.title,
        description: detailMeta.description,
        pathOverride: pack.canonicalPath || `/pakete/${slug}`,
        imagePath: '/images/preiseHero.webp'
      }),
      slots: slots,
      pack: {
        ...pack,
        description: packageDescription(pack)
      },
      previewPackages,
      globalNotes,
      optionalAddOns,
      addOnsTickerDurationSeconds: resolveAddOnsTickerDurationSeconds(addOnsTickerConfig),
      lng,
      isEn,
      jsonLd: buildPackageSchemas({
        pack,
        url: `${baseUrl}${isEn ? '/en' : ''}${packageCanonicalPath}`,
        baseUrl,
        lng
      }),
      successMessage: isEn
        ? 'Thank you! We received your request and will get back to you soon.'
        : 'Vielen Dank! Ich habe deine Anfrage erhalten und melde mich bald.'
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
