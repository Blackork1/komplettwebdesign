import pool from '../util/db.js';
import { sendBookingMail, sendAdminComposedMail } from '../services/mailService.js';
import { renderBrandEmail } from '../services/emailTemplateService.js';
import { startOfMonth, addMonths, format } from 'date-fns';
import { findLocaleMarker, normalizeLocale } from '../util/bookingLocale.js';

async function resolveBookingLocale(booking) {
  if (booking?.booking_locale) return normalizeLocale(booking.booking_locale);

  const localeFromNote = findLocaleMarker(booking?.note);
  if (localeFromNote) return localeFromNote;

  const { rows } = await pool.query(
    `SELECT additional_info
       FROM contact_requests
      WHERE booking_id = $1
      ORDER BY id DESC
      LIMIT 1`,
    [booking.id]
  );
  const localeFromContactRequest = findLocaleMarker(rows[0]?.additional_info);
  return localeFromContactRequest || 'de';
}



export async function adminHome(_req, res) {
  const { rows: pending } = await pool.query(`
    SELECT b.*, a.start_time, a.end_time
      FROM bookings b
      JOIN appointments a ON a.id = b.appointment_id
     WHERE b.status = 'pending'
     ORDER BY a.start_time`);

  const { rows: confirmed } = await pool.query(`
    SELECT b.*, a.start_time, a.end_time
      FROM bookings b
      JOIN appointments a ON a.id = b.appointment_id
     WHERE b.status = 'confirmed'
     ORDER BY a.start_time`);

  res.render('admin/dashboard', {
    title: 'Admin-Startseite',
    pending,
    confirmed
  });
}

/* ------------------------------------------------------------------ */
/*  Kalenderseite rendern                                             */
/* ------------------------------------------------------------------ */
export async function calendarPage(_req, res) {
  res.render('admin/appointments_calendar', { title: 'Termine' });
}

/** JSON: Verfügbarkeit eines Monats (Tage mit freien Slots) */
export async function monthAvailability(req, res) {
  // month=YYYY-MM (z.B. "2025-07")
  const today = new Date();
  const [y, m] = (req.query.month || format(today, 'yyyy-MM')).split('-').map(n => parseInt(n, 10));
  const monthStart = startOfMonth(new Date(y, m - 1, 1));
  const nextStart  = addMonths(monthStart, 1);

  const { rows } = await pool.query(
    `
    SELECT DATE(start_time) AS day, COUNT(*)::int AS free_count
      FROM appointments
     WHERE is_booked = FALSE
       AND start_time >= $1::timestamp
       AND start_time <  $2::timestamp
     GROUP BY DATE(start_time)
     ORDER BY DATE(start_time)
    `,
    [format(monthStart, 'yyyy-MM-01 00:00'), format(nextStart, 'yyyy-MM-01 00:00')]
  );

  res.json({
    month: format(monthStart, 'yyyy-MM'),
    days: rows.map(r => ({ date: format(new Date(r.day), 'yyyy-MM-dd'), count: r.free_count }))
  });
}

/** JSON: freie Slots eines Tages */
export async function daySlotsJSON(req, res) {
  const d = req.query.date; // "YYYY-MM-DD"
  if (!d) return res.status(400).json({ error: 'date required (YYYY-MM-DD)' });

  const { rows } = await pool.query(
    `
    SELECT id, start_time, end_time
      FROM appointments
     WHERE is_booked = FALSE
       AND DATE(start_time) = $1::date
     ORDER BY start_time
    `,
    [d]
  );

  res.json(rows);
}


/* ------------------------------------------------------------------ */
/*  Termine (appointments)                                            */
/* ------------------------------------------------------------------ */
export async function listAppointments(_req, res) {
  const { rows } = await pool.query(
    'SELECT * FROM appointments ORDER BY start_time');
  res.render('admin/appointments_list', {
    title: 'Termine',
    apts: rows
  });
}

export async function newAppointmentForm(_req, res) {
  res.render('admin/appointment_form', {
    title: 'Neuer Termin'
  });
}

export async function createAppointment(req, res) {
  const { start, end, title } = req.body;
  await pool.query(
    `INSERT INTO appointments (start_time, end_time, title)
     VALUES ($1,$2,$3)`,
    [start, end, title]
  );
  res.redirect('/admin/appointments');
}

export async function deleteAppointment(req, res) {
  const { id } = req.params;

  // Zu diesem Termin gehörende Kontaktanfragen entfernen
  await pool.query(
    `DELETE FROM contact_requests
          WHERE booking_id IN (
            SELECT id FROM bookings WHERE appointment_id = $1
          )`,
    [id]
  );

  // Eventuelle Buchungen löschen
  await pool.query(
    'DELETE FROM bookings WHERE appointment_id = $1',
    [id]
  );

  // Termin löschen
  await pool.query(
    'DELETE FROM appointments WHERE id = $1',
    [id]);
  res.redirect('/admin/appointments');
}

/* ------------------------------------------------------------------ */
/*  Buchungen (bookings)                                              */
/* ------------------------------------------------------------------ */
export async function listBookings(_req, res) {
  const { rows } = await pool.query(`
    SELECT b.*, a.start_time, a.end_time, a.title AS appointment_title
      FROM bookings b
      JOIN appointments a ON a.id = b.appointment_id
    ORDER BY a.start_time`);
  res.render('admin/bookings_list', {
    title: 'Buchungen',
    bookings: rows
  });
}

export async function confirmBooking(req, res) {
  const { id } = req.params;

  /* Status auf confirmed setzen */
  const { rows } = await pool.query(
    `UPDATE bookings
       SET status = 'confirmed'
     WHERE id = $1
     RETURNING *`, [id]);
  if (!rows.length) return res.redirect('/admin/bookings');

  /* Kunde informieren */
  const booking = rows[0];
  const locale = await resolveBookingLocale(booking);
  const { rows: aptRows } = await pool.query(
    'SELECT * FROM appointments WHERE id = $1',
    [booking.appointment_id]);
  await sendBookingMail({
    to: booking.email,
    name: booking.name,
    appointment: aptRows[0],
    type: 'confirmed',
    bookingId: booking.id,
    locale
  });

  res.redirect('/admin/bookings');
}

export async function cancelBooking(req, res) {
  const { id } = req.params;

  /* Buchung stornieren */
  const { rows } = await pool.query(
    `UPDATE bookings
       SET status = 'cancelled'
     WHERE id = $1
     RETURNING *`, [id]);
  if (!rows.length) return res.redirect('/admin/bookings');

  const booking = rows[0];
  const locale = await resolveBookingLocale(booking);

  /* Kunde informieren */
  const { rows: aptRows } = await pool.query(
    'SELECT * FROM appointments WHERE id = $1',
    [booking.appointment_id]);
  const appointment = aptRows[0];

  /* Slot wieder freigeben (außer Placeholder "Ohne Termin") */
  if (appointment?.title !== 'Ohne Termin') {
    await pool.query(
      'UPDATE appointments SET is_booked = FALSE WHERE id = $1',
      [booking.appointment_id]);
  }

  await sendBookingMail({
    to: booking.email,
    name: booking.name,
    appointment,
    type: 'cancelled',
    locale
  });

  res.redirect('/admin/bookings');
}

export async function getTest(req, res) {
  res.render('admin/test', {
    title: 'Testseite',
    description: 'Dies ist eine Testseite'
  });
}

/* ------------------------------------------------------------------ */
/*  Mailversand – freie Mails im Marken-Template an einzelne Empfänger */
/* ------------------------------------------------------------------ */
function splitRecipients(raw = '') {
  return String(raw || '')
    .split(/[\s,;]+/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function parseBodyToHtml(body = '') {
  // Wenn der Text bereits HTML enthält (z. B. <p>, <a>, …), unverändert nutzen.
  const raw = String(body || '').trim();
  if (!raw) return '';
  if (/<\w+[\s>]/.test(raw)) return raw;

  // Einfacher Text -> HTML: doppelte Zeilenumbrüche = neue Absätze, einfache = <br>
  const escape = (s) => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return raw
    .split(/\n{2,}/)
    .map((block) => `<p>${escape(block).replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}

export async function mailversandForm(_req, res) {
  res.render('admin/mailversand', {
    title: 'Mailversand',
    status: null,
    form: {
      to: '',
      subject: '',
      headline: '',
      preheader: '',
      body: '',
      ctaLabel: '',
      ctaUrl: '',
      locale: 'de',
      replyTo: '',
      attachments: []
    }
  });
}

export async function mailversandPreview(req, res) {
  const locale = normalizeLocale(req.body.locale || 'de');
  const subject = String(req.body.subject || '').trim();
  const headline = String(req.body.headline || '').trim();
  const preheader = String(req.body.preheader || '').trim();
  const bodyHtml = parseBodyToHtml(req.body.body || '');
  const ctaLabel = String(req.body.ctaLabel || '').trim();
  const ctaUrl = String(req.body.ctaUrl || '').trim();

  const html = renderBrandEmail({
    locale,
    subject: subject || (locale === 'en' ? 'Preview' : 'Vorschau'),
    headline: headline || subject || (locale === 'en' ? 'Preview' : 'Vorschau'),
    preheader,
    bodyHtml,
    ctaLabel,
    ctaUrl
  });
  res.type('text/html').send(html);
}

function filesToAttachments(files = []) {
  if (!Array.isArray(files)) return [];
  return files
    .filter((f) => f && f.buffer && f.originalname)
    .map((f) => ({
      filename: f.originalname,
      content: f.buffer,
      contentType: f.mimetype || 'application/octet-stream'
    }));
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
}

export async function mailversandSend(req, res) {
  const recipients = splitRecipients(req.body.to);
  const subject = String(req.body.subject || '').trim();
  const headline = String(req.body.headline || '').trim();
  const preheader = String(req.body.preheader || '').trim();
  const rawBody = String(req.body.body || '').trim();
  const ctaLabel = String(req.body.ctaLabel || '').trim();
  const ctaUrl = String(req.body.ctaUrl || '').trim();
  const locale = normalizeLocale(req.body.locale || 'de');
  const replyTo = String(req.body.replyTo || '').trim();

  const uploadedFiles = Array.isArray(req.files) ? req.files : [];
  const attachments = filesToAttachments(uploadedFiles);
  const attachmentSummary = uploadedFiles.map((f) => ({
    name: f.originalname,
    size: formatBytes(f.size || (f.buffer ? f.buffer.length : 0)),
    type: f.mimetype
  }));
  const totalBytes = uploadedFiles.reduce((sum, f) => sum + (f.size || (f.buffer ? f.buffer.length : 0)), 0);
  const TOTAL_LIMIT = 25 * 1024 * 1024; // 25 MB

  const form = {
    to: req.body.to || '',
    subject,
    headline,
    preheader,
    body: rawBody,
    ctaLabel,
    ctaUrl,
    locale,
    replyTo,
    attachments: attachmentSummary
  };

  if (recipients.length === 0) {
    return res.status(400).render('admin/mailversand', {
      title: 'Mailversand',
      status: { type: 'error', message: 'Bitte gib mindestens einen Empfänger an.' },
      form
    });
  }
  if (!subject) {
    return res.status(400).render('admin/mailversand', {
      title: 'Mailversand',
      status: { type: 'error', message: 'Bitte gib einen Betreff ein.' },
      form
    });
  }
  if (!rawBody) {
    return res.status(400).render('admin/mailversand', {
      title: 'Mailversand',
      status: { type: 'error', message: 'Bitte gib einen Nachrichtentext ein.' },
      form
    });
  }
  if (totalBytes > TOTAL_LIMIT) {
    return res.status(400).render('admin/mailversand', {
      title: 'Mailversand',
      status: {
        type: 'error',
        message: `Anhänge zusammen zu groß (${formatBytes(totalBytes)}). Maximal ${formatBytes(TOTAL_LIMIT)} erlaubt.`
      },
      form
    });
  }

  const bodyHtml = parseBodyToHtml(rawBody);

  const results = await Promise.allSettled(
    recipients.map((to) => sendAdminComposedMail({
      to,
      subject,
      headline: headline || subject,
      preheader: preheader || subject,
      bodyHtml,
      ctaLabel,
      ctaUrl,
      locale,
      replyTo: replyTo || undefined,
      attachments
    }))
  );

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.length - sent;

  const attachmentNote = attachments.length > 0
    ? ` (${attachments.length} Anhang${attachments.length === 1 ? '' : 'e'})`
    : '';

  if (failed === 0) {
    return res.render('admin/mailversand', {
      title: 'Mailversand',
      status: { type: 'success', message: `Mail erfolgreich an ${sent} Empfänger versendet${attachmentNote}.` },
      form: {
        to: '',
        subject: '',
        headline: '',
        preheader: '',
        body: '',
        ctaLabel: '',
        ctaUrl: '',
        locale,
        replyTo: '',
        attachments: []
      }
    });
  }

  const failedReasons = results
    .map((r, idx) => (r.status === 'rejected' ? `${recipients[idx]}: ${r.reason?.message || 'Fehler'}` : null))
    .filter(Boolean)
    .join(' · ');

  return res.status(500).render('admin/mailversand', {
    title: 'Mailversand',
    status: {
      type: 'error',
      message: `Versand teilweise fehlgeschlagen (${sent} erfolgreich, ${failed} fehlgeschlagen). ${failedReasons}`
    },
    form
  });
}
