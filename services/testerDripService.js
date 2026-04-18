/**
 * testerDripService.js
 *
 * Drip-Sequenz-Engine für bestätigte Tester-Leads:
 *   - +48h: Vollanleitung-Teaser + Termin-Link
 *   - +7 Tage: Case-Study + Erinnerungs-CTA
 *
 * Schema-Erweiterung auf `website_tester_leads`:
 *   - drip_48h_sent_at TIMESTAMPTZ
 *   - drip_7d_sent_at TIMESTAMPTZ
 *   - drip_opt_out_at TIMESTAMPTZ
 *
 * Wird per Cron (alle 5 Minuten) aufgerufen.
 */
import pool from "../util/db.js";
import {
    sendTesterDrip48hMail,
    sendTesterDrip7dMail
} from "./mailService.js";

let ensured = false;
async function ensureDripColumns() {
    if (ensured) return;
    await pool.query(`ALTER TABLE website_tester_leads
        ADD COLUMN IF NOT EXISTS drip_48h_sent_at TIMESTAMPTZ`);
    await pool.query(`ALTER TABLE website_tester_leads
        ADD COLUMN IF NOT EXISTS drip_7d_sent_at TIMESTAMPTZ`);
    await pool.query(`ALTER TABLE website_tester_leads
        ADD COLUMN IF NOT EXISTS drip_opt_out_at TIMESTAMPTZ`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_wt_leads_drip_48h
        ON website_tester_leads (confirmed_at)
        WHERE confirmed_at IS NOT NULL AND drip_48h_sent_at IS NULL`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_wt_leads_drip_7d
        ON website_tester_leads (confirmed_at)
        WHERE confirmed_at IS NOT NULL AND drip_7d_sent_at IS NULL`);
    ensured = true;
}

/**
 * Lädt Leads, die für die +48h-Mail fällig sind.
 * Kriterien:
 *  - confirmed_at älter als 48h
 *  - drip_48h_sent_at ist NULL
 *  - drip_opt_out_at ist NULL
 *  - E-Mail ist gesetzt
 */
async function loadDueFor48h(limit = 20) {
    const { rows } = await pool.query(
        `SELECT id, email, name, locale, source, domain, score_band, audit_id
         FROM website_tester_leads
         WHERE confirmed_at IS NOT NULL
           AND confirmed_at < NOW() - INTERVAL '48 hours'
           AND drip_48h_sent_at IS NULL
           AND drip_opt_out_at IS NULL
           AND email IS NOT NULL
           AND email <> ''
         ORDER BY confirmed_at ASC
         LIMIT $1`,
        [limit]
    );
    return rows;
}

/**
 * Lädt Leads, die für die +7d-Mail fällig sind.
 * Kriterien:
 *  - confirmed_at älter als 7 Tage
 *  - drip_48h_sent_at ist gesetzt (erst nach +48h soll +7d kommen)
 *  - drip_7d_sent_at ist NULL
 *  - drip_opt_out_at ist NULL
 */
async function loadDueFor7d(limit = 20) {
    const { rows } = await pool.query(
        `SELECT id, email, name, locale, source, domain, score_band, audit_id
         FROM website_tester_leads
         WHERE confirmed_at IS NOT NULL
           AND confirmed_at < NOW() - INTERVAL '7 days'
           AND drip_48h_sent_at IS NOT NULL
           AND drip_7d_sent_at IS NULL
           AND drip_opt_out_at IS NULL
           AND email IS NOT NULL
           AND email <> ''
         ORDER BY confirmed_at ASC
         LIMIT $1`,
        [limit]
    );
    return rows;
}

async function markSent(columnName, leadId) {
    await pool.query(
        `UPDATE website_tester_leads SET ${columnName} = NOW(), updated_at = NOW() WHERE id = $1`,
        [leadId]
    );
}

async function loadUnsubscribeToken(email) {
    try {
        const { rows } = await pool.query(
            `SELECT unsubscribe_token FROM newsletter_signups WHERE email = $1 LIMIT 1`,
            [email]
        );
        return rows[0]?.unsubscribe_token || "";
    } catch (_err) {
        return "";
    }
}

export async function runTesterDripOnce({ batch48h = 20, batch7d = 20 } = {}) {
    await ensureDripColumns();

    const summary = { processed48h: 0, processed7d: 0, errors: [] };

    const due48h = await loadDueFor48h(batch48h);
    for (const lead of due48h) {
        try {
            const unsubscribeToken = await loadUnsubscribeToken(lead.email);
            await sendTesterDrip48hMail({
                to: lead.email,
                name: lead.name || "",
                locale: lead.locale || "de",
                source: lead.source || "website",
                domain: lead.domain || "",
                scoreBand: lead.score_band || "mittel",
                unsubscribeToken
            });
            await markSent("drip_48h_sent_at", lead.id);
            summary.processed48h += 1;
        } catch (err) {
            summary.errors.push({ phase: "48h", leadId: lead.id, error: err?.message || String(err) });
        }
    }

    const due7d = await loadDueFor7d(batch7d);
    for (const lead of due7d) {
        try {
            const unsubscribeToken = await loadUnsubscribeToken(lead.email);
            await sendTesterDrip7dMail({
                to: lead.email,
                name: lead.name || "",
                locale: lead.locale || "de",
                source: lead.source || "website",
                domain: lead.domain || "",
                scoreBand: lead.score_band || "mittel",
                unsubscribeToken
            });
            await markSent("drip_7d_sent_at", lead.id);
            summary.processed7d += 1;
        } catch (err) {
            summary.errors.push({ phase: "7d", leadId: lead.id, error: err?.message || String(err) });
        }
    }

    return summary;
}

export async function optOutLeadFromDrip(leadId) {
    await ensureDripColumns();
    await pool.query(
        `UPDATE website_tester_leads SET drip_opt_out_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [leadId]
    );
}
