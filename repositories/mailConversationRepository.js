// Datenzugriff für den Mailverlauf: Gespräche (mail_conversations) und einzelne Nachrichten (mail_messages).
import pool from '../util/db.js';
import { ensureMailInboxSchema } from '../services/mailInbox/schema.js';

export const CONVERSATION_STATUSES = Object.freeze(['offen', 'beantwortet', 'erledigt']);

function cleanEmail(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function createMailConversationRepository(db = pool, { ensureSchema = () => ensureMailInboxSchema(db) } = {}) {
  async function query(sql, params = []) {
    await ensureSchema();
    return db.query(sql, params);
  }

  return {
    async createConversation({
      subject = '',
      contactEmail,
      contactName = '',
      source = 'manuell',
      contactRequestId = null,
      bookingId = null,
      pagePath = ''
    } = {}) {
      const { rows } = await query(`
        INSERT INTO mail_conversations (subject, contact_email, contact_name, source, contact_request_id, booking_id, page_path)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [String(subject).slice(0, 300), cleanEmail(contactEmail), String(contactName || '').slice(0, 160), source, contactRequestId, bookingId, String(pagePath || '').slice(0, 300)]);
      return rows[0];
    },

    // Fügt eine Nachricht hinzu. Doppelte Message-IDs werden ignoriert (Rückgabe null).
    async addMessage({
      conversationId,
      direction,
      kind = 'mail',
      fromEmail = '',
      fromName = '',
      toEmail = '',
      subject = '',
      bodyText = '',
      bodyHtml = null,
      messageId = null,
      inReplyTo = null,
      references = null,
      attachments = [],
      sourceFolder = null,
      imapUid = null,
      sentAt = new Date()
    } = {}) {
      const { rows } = await query(`
        INSERT INTO mail_messages (
          conversation_id, direction, kind, from_email, from_name, to_email, subject, body_text, body_html,
          message_id, in_reply_to, references_header, attachments, source_folder, imap_uid, sent_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14, $15, $16)
        ON CONFLICT DO NOTHING
        RETURNING *
      `, [
        conversationId, direction, kind, cleanEmail(fromEmail), String(fromName || '').slice(0, 160), cleanEmail(toEmail),
        String(subject || '').slice(0, 500), String(bodyText || ''), bodyHtml, messageId, inReplyTo, references,
        JSON.stringify(Array.isArray(attachments) ? attachments : []), sourceFolder, imapUid, sentAt
      ]);
      const message = rows[0] || null;
      if (!message || kind === 'notiz') return message;

      // Eingehende Nachrichten öffnen das Gespräch wieder, eigene Antworten markieren es als beantwortet.
      const statusSql = direction === 'in'
        ? (kind === 'anfrage' ? 'status' : `'offen'`)
        : (['antwort', 'gesendet', 'nachricht'].includes(kind) ? `CASE WHEN status = 'erledigt' THEN status ELSE 'beantwortet' END` : 'status');
      await query(`
        UPDATE mail_conversations
           SET last_message_at = GREATEST(last_message_at, $2::timestamptz),
               unread_count = unread_count + $3,
               status = ${statusSql}
         WHERE id = $1
      `, [conversationId, sentAt, direction === 'in' ? 1 : 0]);
      return message;
    },

    async listConversations({ status = null, q = null, limit = 50, offset = 0 } = {}) {
      const search = q ? String(q).trim().slice(0, 120) : null;
      const { rows } = await query(`
        SELECT c.*,
               lm.direction AS last_direction,
               lm.kind AS last_kind,
               left(regexp_replace(coalesce(lm.body_text, ''), '\\s+', ' ', 'g'), 160) AS last_snippet,
               (SELECT COUNT(*) FROM mail_messages m WHERE m.conversation_id = c.id AND m.kind <> 'notiz')::int AS message_count
          FROM mail_conversations c
          LEFT JOIN LATERAL (
            SELECT direction, kind, body_text FROM mail_messages
             WHERE conversation_id = c.id AND kind <> 'notiz'
             ORDER BY sent_at DESC, id DESC LIMIT 1
          ) lm ON TRUE
         WHERE ($1::text IS NULL OR c.status = $1)
           AND ($2::text IS NULL OR c.contact_email ILIKE '%' || $2 || '%' OR c.contact_name ILIKE '%' || $2 || '%' OR c.subject ILIKE '%' || $2 || '%')
         ORDER BY c.last_message_at DESC
         LIMIT $3 OFFSET $4
      `, [CONVERSATION_STATUSES.includes(status) ? status : null, search, Math.min(Math.max(Number(limit) || 50, 1), 200), Math.max(Number(offset) || 0, 0)]);
      return rows;
    },

    async countSummary() {
      const { rows } = await query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'offen')::int AS offen,
          COUNT(*) FILTER (WHERE status = 'beantwortet')::int AS beantwortet,
          COUNT(*) FILTER (WHERE status = 'erledigt')::int AS erledigt,
          COALESCE(SUM(unread_count), 0)::int AS ungelesen,
          COUNT(*)::int AS gesamt
        FROM mail_conversations
      `);
      return rows[0];
    },

    async unreadTotal() {
      const { rows } = await query('SELECT COALESCE(SUM(unread_count), 0)::int AS total FROM mail_conversations');
      return rows[0]?.total || 0;
    },

    async getConversation(id) {
      const { rows } = await query('SELECT * FROM mail_conversations WHERE id = $1', [id]);
      if (!rows[0]) return null;
      const messages = await query(`
        SELECT * FROM mail_messages WHERE conversation_id = $1 ORDER BY sent_at ASC, id ASC
      `, [id]);
      return { ...rows[0], messages: messages.rows };
    },

    async markRead(id) {
      await query('UPDATE mail_conversations SET unread_count = 0 WHERE id = $1', [id]);
    },

    async setStatus(id, status) {
      if (!CONVERSATION_STATUSES.includes(status)) throw new TypeError('Unbekannter Status.');
      await query('UPDATE mail_conversations SET status = $2 WHERE id = $1', [id, status]);
    },

    async findConversationIdByMessageIds(messageIds = []) {
      const ids = [...new Set((messageIds || []).filter(Boolean).map(String))];
      if (!ids.length) return null;
      const { rows } = await query(`
        SELECT conversation_id FROM mail_messages WHERE message_id = ANY($1::text[]) ORDER BY sent_at DESC LIMIT 1
      `, [ids]);
      return rows[0]?.conversation_id ?? null;
    },

    async findConversationByContactEmail(email, { withinDays = 365 } = {}) {
      const address = cleanEmail(email);
      if (!address) return null;
      const { rows } = await query(`
        SELECT * FROM mail_conversations
         WHERE lower(contact_email) = $1 AND last_message_at > NOW() - ($2::int * INTERVAL '1 day')
         ORDER BY last_message_at DESC LIMIT 1
      `, [address, withinDays]);
      return rows[0] || null;
    },

    async findConversationByBookingId(bookingId) {
      if (!bookingId) return null;
      const { rows } = await query(`
        SELECT * FROM mail_conversations WHERE booking_id = $1 ORDER BY id DESC LIMIT 1
      `, [bookingId]);
      return rows[0] || null;
    },

    async lastMessageIds(conversationId) {
      const { rows } = await query(`
        SELECT message_id FROM mail_messages
         WHERE conversation_id = $1 AND message_id IS NOT NULL
         ORDER BY sent_at ASC, id ASC
      `, [conversationId]);
      return rows.map((row) => row.message_id);
    },

    async getSyncState(mailbox) {
      const { rows } = await query('SELECT * FROM mail_sync_state WHERE mailbox = $1', [mailbox]);
      return rows[0] || null;
    },

    async saveSyncState({ mailbox, uidValidity = null, lastUid = 0, error = null }) {
      await query(`
        INSERT INTO mail_sync_state (mailbox, uid_validity, last_uid, last_run_at, last_error)
        VALUES ($1, $2, $3, NOW(), $4)
        ON CONFLICT (mailbox) DO UPDATE
          SET uid_validity = EXCLUDED.uid_validity, last_uid = EXCLUDED.last_uid,
              last_run_at = NOW(), last_error = EXCLUDED.last_error
      `, [mailbox, uidValidity, lastUid, error ? String(error).slice(0, 500) : null]);
    },

    async listSyncStates() {
      const { rows } = await query('SELECT * FROM mail_sync_state ORDER BY mailbox');
      return rows;
    }
  };
}

export const mailConversationRepository = createMailConversationRepository();
