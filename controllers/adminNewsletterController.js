/**
 * adminNewsletterController.js
 *
 * Admin-Bereich: Newsletter-Anmeldungen verwalten.
 *
 * Zeigt alle Subscriber aus `newsletter_signups` mit:
 *  - Anmelde-Datum, Status (aktiv/inaktiv), Quelle
 *  - Versandte Mails (Willkommen + Drip, wenn Lead vorhanden)
 *  - Ausstehende Mails (berechnet anhand Drip-Zeitplan)
 *
 * Die Drip-Info kommt aus `website_tester_leads` (JOIN via E-Mail),
 * da die Drip-Engine dort die Timestamps speichert.
 */

import pool from '../util/db.js';

// ---------------------------------------------------------------------------
// DB-Migration: fehlende Spalten automatisch ergänzen
// ---------------------------------------------------------------------------
let _migrated = false;
async function ensureColumns() {
  if (_migrated) return;
  await pool.query(`
    ALTER TABLE newsletter_signups
      ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS source      TEXT        DEFAULT 'blog'
  `);
  _migrated = true;
}

// ---------------------------------------------------------------------------
// Hauptabfrage: alle Subscriber + LEFT JOIN Drip-Info
// ---------------------------------------------------------------------------
async function fetchSubscribers({ filter = 'all', search = '' } = {}) {
  const conditions = [];
  const params = [];

  if (filter === 'active')   conditions.push(`ns.active = true`);
  if (filter === 'inactive') conditions.push(`ns.active = false`);

  if (search && search.trim()) {
    params.push(`%${search.trim().toLowerCase()}%`);
    conditions.push(`LOWER(ns.email) LIKE $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await pool.query(`
    SELECT
      ns.id,
      ns.email,
      ns.active,
      ns.created_at,
      ns.source,
      ns.unsubscribe_token,
      -- Drip-Infos aus website_tester_leads (neuester bestätigter Lead per E-Mail)
      tl.id               AS lead_id,
      tl.name             AS lead_name,
      tl.confirmed_at,
      tl.drip_48h_sent_at,
      tl.drip_7d_sent_at,
      tl.drip_opt_out_at,
      tl.domain           AS lead_domain,
      tl.score_band
    FROM newsletter_signups ns
    LEFT JOIN LATERAL (
      SELECT *
      FROM website_tester_leads
      WHERE LOWER(email) = LOWER(ns.email)
        AND confirmed_at IS NOT NULL
      ORDER BY confirmed_at DESC
      LIMIT 1
    ) tl ON true
    ${where}
    ORDER BY ns.created_at DESC NULLS LAST
  `, params);

  return rows;
}

// ---------------------------------------------------------------------------
// Drip-Timeline pro Subscriber berechnen
// ---------------------------------------------------------------------------
function computeMailTimeline(row) {
  const now = Date.now();
  const sent    = [];
  const pending = [];

  // Willkommens-Mail → immer direkt bei Anmeldung gesendet
  sent.push({
    type:  'welcome',
    label: 'Willkommen',
    icon:  'fa-envelope-open-text',
    at:    row.created_at ?? null,
  });

  // Drip-Mails nur wenn ein bestätigter Tester-Lead verknüpft ist
  if (row.confirmed_at) {
    const confirmed = new Date(row.confirmed_at).getTime();
    const MS_48H    = 48 * 60 * 60 * 1000;
    const MS_7D     = 7  * 24 * 60 * 60 * 1000;

    // +48h Drip
    if (row.drip_48h_sent_at) {
      sent.push({
        type:  'drip_48h',
        label: '+48h Drip',
        icon:  'fa-paper-plane',
        at:    row.drip_48h_sent_at,
      });
    } else if (row.drip_opt_out_at) {
      // opt-out → keine weiteren Drip-Mails
    } else {
      const dueAt = confirmed + MS_48H;
      pending.push({
        type:    'drip_48h',
        label:   '+48h Drip',
        icon:    'fa-clock',
        overdue: now > dueAt,
        dueAt:   new Date(dueAt),
      });
    }

    // +7d Drip (nur wenn +48h bereits raus)
    if (row.drip_48h_sent_at) {
      if (row.drip_7d_sent_at) {
        sent.push({
          type:  'drip_7d',
          label: '+7 Tage Drip',
          icon:  'fa-paper-plane',
          at:    row.drip_7d_sent_at,
        });
      } else if (!row.drip_opt_out_at) {
        const dueAt = confirmed + MS_7D;
        pending.push({
          type:    'drip_7d',
          label:   '+7 Tage Drip',
          icon:    'fa-clock',
          overdue: now > dueAt,
          dueAt:   new Date(dueAt),
        });
      }
    }
  }

  return { sent, pending };
}

// ---------------------------------------------------------------------------
// Controller-Funktionen
// ---------------------------------------------------------------------------

export async function newsletterAdminPage(req, res) {
  try {
    await ensureColumns();

    const filter = ['active', 'inactive'].includes(req.query.filter)
      ? req.query.filter
      : 'all';
    const search = String(req.query.search || '').trim();

    const rawRows    = await fetchSubscribers({ filter, search });
    const subscribers = rawRows.map(r => ({
      ...r,
      ...computeMailTimeline(r),
    }));

    // Gesamtstatistiken (ohne Filter-Einschränkung)
    const { rows: totals } = await pool.query(`
      SELECT
        COUNT(*)                         AS total,
        COUNT(*) FILTER (WHERE active)   AS active,
        COUNT(*) FILTER (WHERE NOT active) AS inactive
      FROM newsletter_signups
    `);
    const stats = {
      total:    Number(totals[0]?.total    ?? 0),
      active:   Number(totals[0]?.active   ?? 0),
      inactive: Number(totals[0]?.inactive ?? 0),
    };

    res.render('admin/newsletter', {
      title:       'Newsletter',
      currentPathname: '/admin/newsletter',
      subscribers,
      stats,
      filter,
      search,
      query:       req.query,
    });
  } catch (err) {
    console.error('[Newsletter Admin] Ladefehler:', err);
    res.status(500).send('Fehler beim Laden der Newsletter-Daten.');
  }
}

export async function newsletterDeactivate(req, res) {
  try {
    await pool.query(
      `UPDATE newsletter_signups SET active = false, updated_at = NOW() WHERE id = $1`,
      [req.params.id]
    );
    res.redirect('/admin/newsletter?action=deactivated');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/newsletter?error=1');
  }
}

export async function newsletterReactivate(req, res) {
  try {
    await pool.query(
      `UPDATE newsletter_signups SET active = true, updated_at = NOW() WHERE id = $1`,
      [req.params.id]
    );
    res.redirect('/admin/newsletter?action=reactivated');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/newsletter?error=1');
  }
}

export async function newsletterDelete(req, res) {
  try {
    await pool.query(`DELETE FROM newsletter_signups WHERE id = $1`, [req.params.id]);
    res.redirect('/admin/newsletter?action=deleted');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/newsletter?error=1');
  }
}
