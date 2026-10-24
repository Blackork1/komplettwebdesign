// Postfach-Abruf für den Mailverlauf: holt neue Mails aus Posteingang und Gesendet (IMAP)
// und hängt sie an das passende Gespräch. Nicht zuordenbare Mails bleiben unberührt im Postfach.
// Beim ersten Lauf wird nur die Startposition gemerkt; alte Mails werden nicht importiert.
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import pool from '../../util/db.js';
import { mailConversationRepository } from '../../repositories/mailConversationRepository.js';
import { ensureMailInboxSchema } from './schema.js';
import {
  OWN_ADDRESS,
  NOTIFICATION_HEADER,
  conversationIdFromMessageIds,
  htmlToText,
  sanitizeMailHtml
} from './inboxService.js';

const SYNC_LOCK_KEY = 74120532;
const MAX_MESSAGES_PER_RUN = 50;
const MAX_BODY_CHARS = 50000;
const SENT_FALLBACK_NAMES = ['Sent', 'INBOX.Sent', 'Gesendet', 'INBOX.Gesendet', 'Gesendete Objekte', 'Sent Messages', 'Sent Items'];

function envFlag(value) {
  if (value === undefined || value === null || value === '') return null;
  return /^(1|true|yes|ja|on)$/i.test(String(value).trim());
}

export function mailSyncConfig(env = process.env) {
  const host = env.IMAP_HOST || env.SMTP_HOST || '';
  const user = env.IMAP_USER || env.SMTP_USER || '';
  const pass = env.IMAP_PASS || env.SMTP_PASS || '';
  const port = Number(env.IMAP_PORT) || 993;
  const secureFlag = envFlag(env.IMAP_SECURE);
  const enabledFlag = envFlag(env.MAIL_SYNC_ENABLED);
  const wanted = enabledFlag ?? env.NODE_ENV === 'production';
  const ownAddresses = new Set([OWN_ADDRESS]);
  if (/@/.test(user)) ownAddresses.add(String(user).trim().toLowerCase());
  return {
    enabled: Boolean(wanted && host && user && pass),
    host,
    port,
    secure: secureFlag ?? port === 993,
    auth: { user, pass },
    sentFolder: env.IMAP_SENT_FOLDER || null,
    intervalMs: Math.max(60000, Number(env.MAIL_SYNC_INTERVAL_MS) || 3 * 60 * 1000),
    ownAddresses: [...ownAddresses]
  };
}

function defaultCreateClient(config) {
  return new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
    logger: false,
    emitLogs: false
  });
}

function addressList(field) {
  const groups = [].concat(field || []);
  return groups.flatMap((group) => (group?.value || []))
    .map((entry) => ({ address: String(entry.address || '').trim().toLowerCase(), name: String(entry.name || '').trim() }))
    .filter((entry) => entry.address);
}

function referenceIds(parsed) {
  const refs = [].concat(parsed.references || []).flatMap((value) => String(value).split(/\s+/));
  return [...new Set([parsed.inReplyTo, ...refs].filter(Boolean).map((value) => String(value).trim()))];
}

// Reine Entscheidung, ohne Datenbank: was ist das für eine Mail und mit wem?
export function classifyParsedMail(parsed, { folder = 'inbox', ownAddresses = [OWN_ADDRESS] } = {}) {
  const own = new Set(ownAddresses.map((address) => String(address).toLowerCase()));
  const headers = parsed.headers instanceof Map ? parsed.headers : new Map();
  if (headers.has(NOTIFICATION_HEADER.toLowerCase())) return { skip: 'benachrichtigung' };

  const from = addressList(parsed.from)[0] || null;
  const recipients = [...addressList(parsed.to), ...addressList(parsed.cc)];
  if (!from) return { skip: 'ohne-absender' };

  if (folder === 'sent') {
    const contact = recipients.find((entry) => !own.has(entry.address));
    if (!contact) return { skip: 'an-dich-selbst' };
    return { direction: 'out', kind: 'gesendet', contactEmail: contact.address, contactName: contact.name, fromEmail: from.address, fromName: from.name, toEmail: contact.address };
  }

  if (own.has(from.address)) return { skip: 'eigene-mail' };
  if (/^(mailer-daemon|postmaster)@/i.test(from.address)) return { skip: 'zustellfehler' };
  const autoSubmitted = String(headers.get('auto-submitted') || '').toLowerCase();
  if (autoSubmitted && autoSubmitted !== 'no') return { skip: 'automatische-antwort' };
  return { direction: 'in', kind: 'eingang', contactEmail: from.address, contactName: from.name, fromEmail: from.address, fromName: from.name, toEmail: recipients[0]?.address || OWN_ADDRESS };
}

export async function resolveConversationId(repo, parsed, classification) {
  const ids = referenceIds(parsed);
  const fromOwnId = conversationIdFromMessageIds(ids);
  if (fromOwnId) {
    const existing = await repo.getConversation(fromOwnId);
    if (existing) return existing.id;
  }
  const byMessageId = await repo.findConversationIdByMessageIds(ids);
  if (byMessageId) return byMessageId;
  const byContact = await repo.findConversationByContactEmail(classification.contactEmail);
  return byContact?.id ?? null;
}

export function messageFromParsed(parsed, classification, { folder, uid }) {
  const text = parsed.text ? String(parsed.text) : htmlToText(parsed.html || '');
  return {
    direction: classification.direction,
    kind: classification.kind,
    fromEmail: classification.fromEmail,
    fromName: classification.fromName,
    toEmail: classification.toEmail,
    subject: String(parsed.subject || '').slice(0, 500),
    bodyText: text.slice(0, MAX_BODY_CHARS),
    bodyHtml: parsed.html ? sanitizeMailHtml(String(parsed.html).slice(0, MAX_BODY_CHARS * 4)) : null,
    messageId: parsed.messageId ? String(parsed.messageId).trim() : null,
    inReplyTo: parsed.inReplyTo ? String(parsed.inReplyTo).trim() : null,
    references: referenceIds(parsed).join(' ') || null,
    attachments: (parsed.attachments || [])
      .filter((file) => file.contentDisposition !== 'inline' || file.filename)
      .map((file) => ({ filename: file.filename || 'Anhang', contentType: file.contentType || '', size: file.size || 0 })),
    sourceFolder: folder,
    imapUid: uid,
    sentAt: parsed.date instanceof Date && !Number.isNaN(parsed.date.getTime()) ? parsed.date : new Date()
  };
}

// Eine Mail verarbeiten. Rückgabe: 'importiert', 'doppelt', 'nicht-zugeordnet' oder ein Überspring-Grund.
export async function importMessageSource(repo, source, { folder, uid, ownAddresses, parse = simpleParser } = {}) {
  const parsed = await parse(source, { skipImageLinks: true, skipTextToHtml: true });
  const classification = classifyParsedMail(parsed, { folder, ownAddresses });
  if (classification.skip) return classification.skip;
  const conversationId = await resolveConversationId(repo, parsed, classification);
  if (!conversationId) return 'nicht-zugeordnet';
  const saved = await repo.addMessage({ conversationId, ...messageFromParsed(parsed, classification, { folder, uid }) });
  return saved ? 'importiert' : 'doppelt';
}

export async function findSentFolder(client, configured = null) {
  if (configured) return configured;
  const boxes = await client.list();
  const special = boxes.find((box) => box.specialUse === '\\Sent');
  if (special) return special.path;
  const byName = SENT_FALLBACK_NAMES.map((name) => boxes.find((box) => box.path === name)).find(Boolean);
  return byName?.path || null;
}

export async function syncFolder(client, repo, { mailbox, path, folder, ownAddresses, logger = console, maxMessages = MAX_MESSAGES_PER_RUN }) {
  const lock = await client.getMailboxLock(path);
  try {
    const box = client.mailbox || {};
    const uidValidity = box.uidValidity != null ? String(box.uidValidity) : null;
    const newestUid = Math.max(Number(box.uidNext || 1) - 1, 0);
    const state = await repo.getSyncState(mailbox);

    // Erster Lauf oder Postfach neu aufgebaut: ab jetzt mitlesen, keine Altlasten importieren.
    if (!state || String(state.uid_validity ?? '') !== String(uidValidity ?? '')) {
      await repo.saveSyncState({ mailbox, uidValidity, lastUid: newestUid });
      return { mailbox, initialized: true, imported: 0 };
    }

    const lastUid = Number(state.last_uid) || 0;
    if (newestUid <= lastUid) {
      await repo.saveSyncState({ mailbox, uidValidity, lastUid });
      return { mailbox, imported: 0 };
    }

    const rangeEnd = Math.min(lastUid + maxMessages, newestUid);
    const counts = {};
    let processedUid = lastUid;
    let failure = null;
    for await (const msg of client.fetch(`${lastUid + 1}:${rangeEnd}`, { uid: true, source: true }, { uid: true })) {
      if (failure || !msg?.uid || msg.uid <= lastUid) continue;
      try {
        const result = await importMessageSource(repo, msg.source, { folder, uid: msg.uid, ownAddresses });
        counts[result] = (counts[result] || 0) + 1;
        processedUid = Math.max(processedUid, msg.uid);
      } catch (error) {
        failure = error;
        logger.error?.(`[mail-sync] ${mailbox} UID ${msg.uid} nicht verarbeitet:`, error?.message || error);
      }
    }
    // Ohne Fehler bis zum Bereichsende weiter, auch wenn UIDs Lücken haben.
    const nextUid = failure ? processedUid : rangeEnd;
    await repo.saveSyncState({ mailbox, uidValidity, lastUid: nextUid, error: failure ? failure.message : null });
    return { mailbox, imported: counts.importiert || 0, counts, error: failure?.message || null };
  } finally {
    lock.release();
  }
}

let runningInProcess = false;

export async function runMailSync({
  repo = mailConversationRepository,
  db = pool,
  config = mailSyncConfig(),
  createClient = defaultCreateClient,
  logger = console,
  ensureSchema = () => ensureMailInboxSchema(db)
} = {}) {
  if (!config.enabled) return { skipped: 'deaktiviert' };
  if (runningInProcess) return { skipped: 'läuft-bereits' };
  runningInProcess = true;
  const lockClient = typeof db.connect === 'function' ? await db.connect() : db;
  let locked = false;
  try {
    const { rows } = await lockClient.query('SELECT pg_try_advisory_lock($1) AS ok', [SYNC_LOCK_KEY]);
    locked = Boolean(rows?.[0]?.ok);
    if (!locked) return { skipped: 'läuft-woanders' };
    await ensureSchema();

    const client = createClient(config);
    const results = [];
    await client.connect();
    try {
      const folders = [{ mailbox: 'INBOX', path: 'INBOX', folder: 'inbox' }];
      const sentPath = await findSentFolder(client, config.sentFolder).catch(() => null);
      if (sentPath) folders.push({ mailbox: 'SENT', path: sentPath, folder: 'sent' });
      for (const entry of folders) {
        try {
          results.push(await syncFolder(client, repo, { ...entry, ownAddresses: config.ownAddresses, logger }));
        } catch (error) {
          logger.error?.(`[mail-sync] Ordner ${entry.path} fehlgeschlagen:`, error?.message || error);
          const state = await repo.getSyncState(entry.mailbox).catch(() => null);
          if (state) await repo.saveSyncState({ mailbox: entry.mailbox, uidValidity: state.uid_validity, lastUid: state.last_uid, error: error?.message || String(error) }).catch(() => {});
          results.push({ mailbox: entry.mailbox, error: error?.message || String(error) });
        }
      }
    } finally {
      await client.logout().catch(() => client.close?.());
    }
    return { results };
  } finally {
    if (locked) await lockClient.query('SELECT pg_advisory_unlock($1)', [SYNC_LOCK_KEY]).catch(() => {});
    if (lockClient !== db && typeof lockClient.release === 'function') lockClient.release();
    runningInProcess = false;
  }
}

// Eigene Antworten aus dem Backend landen zusätzlich im Gesendet-Ordner, damit sie auch im Mailprogramm stehen.
export async function appendToSentFolder(raw, { config = mailSyncConfig(), createClient = defaultCreateClient, force = false } = {}) {
  if (!force && !(config.host && config.auth?.user && config.auth?.pass)) return false;
  if (!force && !config.enabled) return false;
  const client = createClient(config);
  await client.connect();
  try {
    const sentPath = await findSentFolder(client, config.sentFolder);
    if (!sentPath) return false;
    await client.append(sentPath, raw, ['\\Seen']);
    return true;
  } finally {
    await client.logout().catch(() => client.close?.());
  }
}

export function startMailSync({ config = mailSyncConfig(), initialDelayMs = 30000, logger = console, run = runMailSync } = {}) {
  if (!config.enabled) return () => {};
  const tick = async () => {
    try {
      const outcome = await run({ config, logger });
      const imported = (outcome.results || []).reduce((sum, entry) => sum + (entry.imported || 0), 0);
      if (imported) logger.log?.(`[mail-sync] ${imported} neue Mail(s) im Verlauf.`);
    } catch (error) {
      logger.error?.('[mail-sync] Abruf fehlgeschlagen:', error?.message || error);
    }
  };
  const firstTimer = setTimeout(tick, initialDelayMs);
  const interval = setInterval(tick, config.intervalMs);
  firstTimer.unref?.();
  interval.unref?.();
  return () => {
    clearTimeout(firstTimer);
    clearInterval(interval);
  };
}
