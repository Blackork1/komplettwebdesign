// Tabellen für den Mailverlauf. Sie werden beim ersten Gebrauch automatisch angelegt,
// damit auf dem Server kein manueller Migrationsbefehl nötig ist. Alle Befehle sind
// wiederholbar (IF NOT EXISTS); eine Advisory-Sperre verhindert parallele Läufe.
import pool from '../../util/db.js';

export const MAIL_INBOX_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS mail_conversations (
  id SERIAL PRIMARY KEY,
  subject TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL,
  contact_name TEXT NOT NULL DEFAULT '',
  source VARCHAR(40) NOT NULL DEFAULT 'manuell',
  status VARCHAR(20) NOT NULL DEFAULT 'offen',
  contact_request_id INTEGER,
  booking_id INTEGER,
  page_path TEXT NOT NULL DEFAULT '',
  unread_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mail_conversations_last ON mail_conversations (last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_mail_conversations_email ON mail_conversations (lower(contact_email));

CREATE TABLE IF NOT EXISTS mail_messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES mail_conversations(id) ON DELETE CASCADE,
  direction VARCHAR(10) NOT NULL,
  kind VARCHAR(20) NOT NULL DEFAULT 'mail',
  from_email TEXT NOT NULL DEFAULT '',
  from_name TEXT NOT NULL DEFAULT '',
  to_email TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  body_text TEXT NOT NULL DEFAULT '',
  body_html TEXT,
  message_id TEXT,
  in_reply_to TEXT,
  references_header TEXT,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_folder TEXT,
  imap_uid BIGINT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_mail_messages_message_id ON mail_messages (message_id) WHERE message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mail_messages_conversation ON mail_messages (conversation_id, sent_at);

CREATE TABLE IF NOT EXISTS mail_sync_state (
  mailbox TEXT PRIMARY KEY,
  uid_validity BIGINT,
  last_uid BIGINT NOT NULL DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  last_error TEXT
);
`;

const SCHEMA_LOCK_KEY = 74120531;
let ensurePromise = null;

export async function createMailInboxSchema(db = pool) {
  const client = typeof db.connect === 'function' ? await db.connect() : db;
  try {
    await client.query('SELECT pg_advisory_lock($1)', [SCHEMA_LOCK_KEY]);
    try {
      await client.query(MAIL_INBOX_SCHEMA_SQL);
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [SCHEMA_LOCK_KEY]);
    }
  } finally {
    if (client !== db && typeof client.release === 'function') client.release();
  }
}

// Einmal pro Prozess; ein Fehlversuch darf beim nächsten Aufruf erneut probiert werden.
export function ensureMailInboxSchema(db = pool) {
  if (!ensurePromise) {
    ensurePromise = createMailInboxSchema(db).catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }
  return ensurePromise;
}

export function resetMailInboxSchemaCacheForTests() {
  ensurePromise = null;
}
