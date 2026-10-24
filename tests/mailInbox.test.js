import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import ejs from 'ejs';
import MailComposer from 'nodemailer/lib/mail-composer/index.js';
import { simpleParser } from 'mailparser';
import {
  conversationMessageId,
  conversationIdFromMessageIds,
  adminConversationUrl,
  htmlToText,
  splitQuoted,
  sanitizeMailHtml,
  recordIncomingRequest,
  buildOwnerNotification
} from '../services/mailInbox/inboxService.js';
import {
  mailSyncConfig,
  classifyParsedMail,
  importMessageSource,
  syncFolder,
  runMailSync,
  findSentFolder,
  appendToSentFolder,
  startMailSync
} from '../services/mailInbox/mailSyncService.js';
import { sendConversationMail, replySubject } from '../services/mailInbox/outboundService.js';
import { summaryRowsToText, ownerNotificationExtras, logNewRequest, logOutgoingMail } from '../services/mailInbox/requestLog.js';
import { createMailInboxSchema, ensureMailInboxSchema, resetMailInboxSchemaCacheForTests, MAIL_INBOX_SCHEMA_SQL } from '../services/mailInbox/schema.js';
import { createMailConversationRepository } from '../repositories/mailConversationRepository.js';
import { createAdminInboxController, createUnreadBadgeMiddleware, presentMessage } from '../controllers/adminInboxController.js';

const OWN = 'kontakt@komplettwebdesign.de';
const viewsDir = fileURLToPath(new URL('../views/', import.meta.url));

function memoryRepo() {
  const conversations = new Map();
  const messages = [];
  const sync = new Map();
  let seq = 1;
  let mseq = 1;
  return {
    conversations,
    messages,
    sync,
    async createConversation(d = {}) {
      const row = {
        id: seq++, subject: d.subject || '', contact_email: String(d.contactEmail || '').toLowerCase(), contact_name: d.contactName || '',
        source: d.source || 'manuell', status: 'offen', booking_id: d.bookingId ?? null, contact_request_id: d.contactRequestId ?? null,
        page_path: d.pagePath || '', unread_count: 0, created_at: new Date('2026-10-24T09:00:00Z'), last_message_at: new Date('2026-10-24T09:00:00Z')
      };
      conversations.set(row.id, row);
      return row;
    },
    async addMessage(m = {}) {
      if (m.messageId && messages.some((x) => x.message_id === m.messageId)) return null;
      const row = {
        id: mseq++, conversation_id: m.conversationId, direction: m.direction, kind: m.kind || 'mail', from_email: m.fromEmail || '',
        from_name: m.fromName || '', to_email: m.toEmail || '', subject: m.subject || '', body_text: m.bodyText || '', body_html: m.bodyHtml ?? null,
        message_id: m.messageId ?? null, in_reply_to: m.inReplyTo ?? null, references_header: m.references ?? null, attachments: m.attachments || [],
        source_folder: m.sourceFolder ?? null, imap_uid: m.imapUid ?? null, sent_at: m.sentAt || new Date('2026-10-24T10:00:00Z')
      };
      messages.push(row);
      const conversation = conversations.get(m.conversationId);
      if (conversation && m.direction === 'in') conversation.unread_count += 1;
      return row;
    },
    async getConversation(id) {
      const conversation = conversations.get(Number(id));
      return conversation ? { ...conversation, messages: messages.filter((m) => m.conversation_id === conversation.id) } : null;
    },
    async markRead(id) { const c = conversations.get(Number(id)); if (c) c.unread_count = 0; },
    async setStatus(id, status) { conversations.get(Number(id)).status = status; },
    async findConversationIdByMessageIds(ids = []) {
      const hit = messages.find((m) => m.message_id && ids.includes(m.message_id));
      return hit?.conversation_id ?? null;
    },
    async findConversationByContactEmail(email) {
      return [...conversations.values()].reverse().find((c) => c.contact_email === String(email).toLowerCase()) || null;
    },
    async findConversationByBookingId(bookingId) {
      return [...conversations.values()].find((c) => c.booking_id === bookingId) || null;
    },
    async lastMessageIds(id) { return messages.filter((m) => m.conversation_id === id && m.message_id).map((m) => m.message_id); },
    async getSyncState(mailbox) { return sync.get(mailbox) || null; },
    async saveSyncState({ mailbox, uidValidity = null, lastUid = 0, error = null }) {
      sync.set(mailbox, { mailbox, uid_validity: uidValidity, last_uid: lastUid, last_error: error, last_run_at: new Date('2026-10-24T10:05:00Z') });
    },
    async listSyncStates() { return [...sync.values()]; },
    async listConversations() {
      return [...conversations.values()].map((c) => ({ ...c, last_snippet: 'Letzte Nachricht', message_count: messages.filter((m) => m.conversation_id === c.id).length, last_direction: 'in' }));
    },
    async countSummary() { return { offen: conversations.size, beantwortet: 0, erledigt: 0, ungelesen: 0, gesamt: conversations.size }; },
    async unreadTotal() { return [...conversations.values()].reduce((sum, c) => sum + c.unread_count, 0); }
  };
}

async function rawMail(options) {
  return new MailComposer({ date: new Date('2026-10-24T10:00:00Z'), ...options }).compile().build();
}

async function parsedMail(options) {
  return simpleParser(await rawMail(options));
}

function fakeImap({ uidValidity = 5n, messages = [], uidNext = null } = {}) {
  const client = {
    mailbox: null,
    fetched: [],
    appended: [],
    released: 0,
    async connect() {},
    async logout() {},
    async list() { return [{ path: 'INBOX', specialUse: '\\Inbox' }, { path: 'Sent', specialUse: '\\Sent' }, { path: 'Drafts', specialUse: '\\Drafts' }]; },
    async getMailboxLock(path) {
      const highest = messages.reduce((max, m) => Math.max(max, m.uid), 0);
      client.mailbox = { path, uidValidity, uidNext: uidNext ?? highest + 1 };
      return { release() { client.released += 1; } };
    },
    async *fetch(range) {
      client.fetched.push(range);
      const [from, to] = range.split(':').map(Number);
      for (const m of messages) if (m.uid >= from && m.uid <= to) yield { uid: m.uid, source: m.source };
    },
    async append(path, raw, flags) { client.appended.push({ path, raw, flags }); }
  };
  return client;
}

function fakeRes() {
  return {
    statusCode: 200,
    view: null,
    locals: {},
    redirectedTo: null,
    status(code) { this.statusCode = code; return this; },
    render(view, locals) { this.view = view; this.locals = locals; return this; },
    redirect(url) { this.redirectedTo = url; return this; }
  };
}

async function renderView(name, locals) {
  return ejs.renderFile(`${viewsDir}${name}`, { csrfToken: 'tok123', asset: (p) => `/${p}`, ...locals }, {
    includer(original, filename) {
      return /admin_(header|footer)/.test(original) ? { template: ' ' } : { filename };
    }
  });
}

/* ------------------------------------------------------------------ */

test('eigene Message-IDs tragen die Gesprächsnummer und werden wiedererkannt', () => {
  const id = conversationMessageId(17, 'antwort');
  assert.match(id, /^<kw\.c17\.antwort\.[a-f0-9]{12}@komplettwebdesign\.de>$/);
  assert.notEqual(id, conversationMessageId(17, 'antwort'));
  assert.equal(conversationIdFromMessageIds(['<fremd@example.de>', id]), 17);
  assert.equal(conversationIdFromMessageIds(['<kw.c5.x.y@example.de>']), null);
  assert.equal(conversationIdFromMessageIds([]), null);
  assert.equal(adminConversationUrl(17), 'https://www.komplettwebdesign.de/admin/anfragen/17');
});

test('Text aus HTML, zitierter Verlauf wird abgetrennt, fremdes HTML bereinigt', () => {
  assert.equal(htmlToText('<p>Hallo <b>Sören</b></p><p>Zeile 1<br>Zeile 2</p><script>x()</script>'), 'Hallo Sören\nZeile 1\nZeile 2');

  const de = splitQuoted('Danke, passt!\n\nAm 24.10.2026 um 10:00 schrieb Komplett Webdesign <kontakt@komplettwebdesign.de>:\n> Hallo Max');
  assert.equal(de.main, 'Danke, passt!');
  assert.match(de.quoted, /^Am 24\.10\.2026/);
  const en = splitQuoted('Sounds good\nOn Sat, Oct 24, 2026 at 10:00 Sören wrote:\n> Hi');
  assert.equal(en.main, 'Sounds good');
  const plainQuote = splitQuoted('Ja gern\n> alte Zeile\n> noch eine');
  assert.equal(plainQuote.main, 'Ja gern');
  assert.deepEqual(splitQuoted('Nur Text'), { main: 'Nur Text', quoted: '' });

  const clean = sanitizeMailHtml('<p onclick="x()">Hi <img src="https://track.example/p.gif"><a href="javascript:alert(1)">a</a><a href="https://ok.example">b</a></p><script>alert(1)</script>');
  assert.doesNotMatch(clean, /onclick|<img|javascript:|<script/);
  assert.match(clean, /href="https:\/\/ok\.example" target="_blank" rel="noopener noreferrer nofollow"/);
});

test('Datenbank richtet sich selbst ein: Sperre, Tabellen, Freigabe, nur einmal pro Prozess', async () => {
  const calls = [];
  let released = 0;
  const pool = {
    async connect() {
      return { async query(sql, params) { calls.push({ sql, params }); return { rows: [] }; }, release() { released += 1; } };
    }
  };
  await createMailInboxSchema(pool);
  assert.match(calls[0].sql, /pg_advisory_lock/);
  assert.equal(calls[1].sql, MAIL_INBOX_SCHEMA_SQL);
  assert.match(calls[2].sql, /pg_advisory_unlock/);
  assert.equal(released, 1);
  for (const table of ['mail_conversations', 'mail_messages', 'mail_sync_state']) {
    assert.match(MAIL_INBOX_SCHEMA_SQL, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  }

  resetMailInboxSchemaCacheForTests();
  let attempts = 0;
  const flaky = { async connect() { attempts += 1; if (attempts === 1) throw new Error('DB noch nicht da'); return { async query() { return { rows: [] }; }, release() {} }; } };
  await assert.rejects(ensureMailInboxSchema(flaky), /DB noch nicht da/);
  await ensureMailInboxSchema(flaky);
  await ensureMailInboxSchema(flaky);
  assert.equal(attempts, 2);
  resetMailInboxSchemaCacheForTests();
});

test('Repository: Eingang öffnet wieder, Antwort markiert beantwortet, Notiz ändert nichts', async () => {
  const calls = [];
  const db = {
    async query(sql, params) {
      calls.push({ sql, params });
      return /INSERT INTO mail_messages/.test(sql) ? { rows: [{ id: calls.length }] } : { rows: [] };
    }
  };
  const repo = createMailConversationRepository(db, { ensureSchema: async () => {} });

  await repo.addMessage({ conversationId: 3, direction: 'in', kind: 'eingang', fromEmail: ' Max@Example.DE ' });
  assert.equal(calls[0].params[3], 'max@example.de');
  assert.match(calls[1].sql, /status = 'offen'/);
  assert.equal(calls[1].params[2], 1);

  await repo.addMessage({ conversationId: 3, direction: 'out', kind: 'antwort' });
  assert.match(calls[3].sql, /CASE WHEN status = 'erledigt' THEN status ELSE 'beantwortet' END/);
  assert.equal(calls[3].params[2], 0);

  await repo.addMessage({ conversationId: 3, direction: 'out', kind: 'bestaetigung' });
  assert.match(calls[5].sql, /status = status/);

  const before = calls.length;
  await repo.addMessage({ conversationId: 3, direction: 'intern', kind: 'notiz', bodyText: 'Angebot schicken' });
  assert.equal(calls.length, before + 1);

  await assert.rejects(repo.setStatus(3, 'gelöscht'), /Unbekannter Status/);
});

test('neue Anfrage wird Gespräch mit Anfrage-Nachricht; Fehler im Verlauf blockieren nichts', async () => {
  const repo = memoryRepo();
  const { conversation, message } = await recordIncomingRequest(repo, {
    source: 'kontaktformular', subject: 'Kontaktanfrage: Max', contactEmail: 'Max@Example.de', contactName: 'Max', bodyText: 'Name: Max'
  });
  assert.equal(conversation.contact_email, 'max@example.de');
  assert.equal(message.direction, 'in');
  assert.equal(message.kind, 'anfrage');
  assert.equal(message.to_email, OWN);

  const id = await logNewRequest({ source: 'kurzanfrage', subject: 'x', contactEmail: 'a@b.de' }, { repo });
  assert.equal(typeof id, 'number');
  const broken = { async createConversation() { throw new Error('DB down'); } };
  assert.equal(await logNewRequest({ contactEmail: 'a@b.de' }, { repo: broken, logger: { error() {} } }), null);
  assert.equal(await logOutgoingMail({ conversationId: null, bodyText: 'x' }, { repo }), null);
  const logged = await logOutgoingMail({ conversationId: id, kind: 'bestaetigung', toEmail: 'a@b.de', bodyHtml: '<p>Danke!</p>' }, { repo });
  assert.equal(logged.body_text, 'Danke!');
  assert.equal(logged.direction, 'out');

  assert.equal(summaryRowsToText([['Name', 'Max'], ['Leistungen', ['SEO', 'Pflege']], 'kaputt']), 'Name: Max\nLeistungen: SEO, Pflege');
});

test('Hinweis an Sören ist gekennzeichnet, verkettet und verlinkt ins Backend', () => {
  const extras = ownerNotificationExtras(9);
  assert.equal(extras.mail.headers['X-KW-Notification'], '1');
  assert.match(extras.mail.messageId, /^<kw\.c9\.hinweis\./);
  assert.equal(extras.cta.ctaUrl, 'https://www.komplettwebdesign.de/admin/anfragen/9');
  assert.deepEqual(ownerNotificationExtras(null).cta, {});

  const mail = buildOwnerNotification({ conversationId: 9, subject: 'Neu', headline: 'Neu', preheader: 'p', summaryHtml: '<p>x</p>', replyTo: 'k@example.de' });
  assert.equal(mail.to, OWN);
  assert.equal(mail.replyTo, 'k@example.de');
  assert.match(mail.html, /admin\/anfragen\/9/);
});

test('Postfach-Zugang: Standard aus SMTP, in Produktion an, sonst nur mit Schalter', () => {
  const base = { SMTP_HOST: 'mail.manitu.de', SMTP_USER: 'Kontakt@KomplettWebdesign.de', SMTP_PASS: 'geheim' };
  const prod = mailSyncConfig({ ...base, NODE_ENV: 'production' });
  assert.equal(prod.enabled, true);
  assert.equal(prod.host, 'mail.manitu.de');
  assert.equal(prod.port, 993);
  assert.equal(prod.secure, true);
  assert.equal(prod.intervalMs, 180000);
  assert.ok(prod.ownAddresses.includes(OWN));

  assert.equal(mailSyncConfig({ ...base }).enabled, false);
  assert.equal(mailSyncConfig({ ...base, MAIL_SYNC_ENABLED: 'true' }).enabled, true);
  assert.equal(mailSyncConfig({ ...base, NODE_ENV: 'production', MAIL_SYNC_ENABLED: 'false' }).enabled, false);
  assert.equal(mailSyncConfig({ NODE_ENV: 'production', SMTP_HOST: 'x' }).enabled, false);
  const custom = mailSyncConfig({ ...base, MAIL_SYNC_ENABLED: '1', IMAP_HOST: 'imap.example', IMAP_PORT: '143', MAIL_SYNC_INTERVAL_MS: '1000', IMAP_SENT_FOLDER: 'Gesendet' });
  assert.equal(custom.host, 'imap.example');
  assert.equal(custom.secure, false);
  assert.equal(custom.intervalMs, 60000);
  assert.equal(custom.sentFolder, 'Gesendet');
});

test('Einordnung: Hinweise, eigene Mails, Zustellfehler und Auto-Antworten werden übersprungen', async () => {
  const own = [OWN];
  assert.deepEqual(classifyParsedMail(await parsedMail({ from: OWN, to: OWN, subject: 'x', text: 'x', headers: { 'X-KW-Notification': '1' } }), { ownAddresses: own }), { skip: 'benachrichtigung' });
  assert.deepEqual(classifyParsedMail(await parsedMail({ from: OWN, to: 'max@example.de', text: 'x' }), { folder: 'inbox', ownAddresses: own }), { skip: 'eigene-mail' });
  assert.deepEqual(classifyParsedMail(await parsedMail({ from: 'MAILER-DAEMON@mail.example', to: OWN, text: 'x' }), { ownAddresses: own }), { skip: 'zustellfehler' });
  assert.deepEqual(classifyParsedMail(await parsedMail({ from: 'max@example.de', to: OWN, text: 'Bin im Urlaub', headers: { 'Auto-Submitted': 'auto-replied' } }), { ownAddresses: own }), { skip: 'automatische-antwort' });

  const incoming = classifyParsedMail(await parsedMail({ from: '"Max Muster" <Max@Example.de>', to: OWN, text: 'Hallo' }), { folder: 'inbox', ownAddresses: own });
  assert.equal(incoming.direction, 'in');
  assert.equal(incoming.contactEmail, 'max@example.de');
  assert.equal(incoming.contactName, 'Max Muster');

  const sent = classifyParsedMail(await parsedMail({ from: OWN, to: 'max@example.de', cc: OWN, text: 'Hallo Max' }), { folder: 'sent', ownAddresses: own });
  assert.equal(sent.direction, 'out');
  assert.equal(sent.kind, 'gesendet');
  assert.equal(sent.contactEmail, 'max@example.de');
  assert.deepEqual(classifyParsedMail(await parsedMail({ from: OWN, to: OWN, text: 'Notiz an mich' }), { folder: 'sent', ownAddresses: own }), { skip: 'an-dich-selbst' });
});

test('Zuordnung: eigene ID, bekannte Message-ID, dann Kontaktadresse; Rest bleibt draußen; keine Doppelten', async () => {
  const repo = memoryRepo();
  const a = await repo.createConversation({ subject: 'A', contactEmail: 'anna@example.de' });
  const b = await repo.createConversation({ subject: 'B', contactEmail: 'ben@example.de' });
  await repo.addMessage({ conversationId: b.id, direction: 'in', kind: 'eingang', messageId: '<ben-1@example.de>' });

  const viaOwnId = await rawMail({ from: 'fremd@example.de', to: OWN, subject: 'Re: A', text: 'Antwort', inReplyTo: conversationMessageId(a.id, 'antwort'), messageId: '<r1@example.de>' });
  assert.equal(await importMessageSource(repo, viaOwnId, { folder: 'inbox', uid: 10, ownAddresses: [OWN] }), 'importiert');
  assert.equal(repo.messages.at(-1).conversation_id, a.id);
  assert.equal(repo.messages.at(-1).imap_uid, 10);

  const viaKnownId = await rawMail({ from: 'ben@example.de', to: OWN, subject: 'Re', text: 'Noch was', references: ['<ben-1@example.de>'], messageId: '<r2@example.de>' });
  assert.equal(await importMessageSource(repo, viaKnownId, { folder: 'inbox', uid: 11, ownAddresses: [OWN] }), 'importiert');
  assert.equal(repo.messages.at(-1).conversation_id, b.id);

  const viaAddress = await rawMail({ from: 'Anna <ANNA@example.de>', to: OWN, subject: 'Neue Frage', html: '<p>Frage <b>zwei</b></p>', messageId: '<r3@example.de>' });
  assert.equal(await importMessageSource(repo, viaAddress, { folder: 'inbox', uid: 12, ownAddresses: [OWN] }), 'importiert');
  assert.equal(repo.messages.at(-1).conversation_id, a.id);
  assert.equal(repo.messages.at(-1).body_text, 'Frage zwei');

  const unknown = await rawMail({ from: 'newsletter@shop.example', to: OWN, subject: 'Angebot', text: 'Kauf was', messageId: '<n1@shop.example>' });
  assert.equal(await importMessageSource(repo, unknown, { folder: 'inbox', uid: 13, ownAddresses: [OWN] }), 'nicht-zugeordnet');

  assert.equal(await importMessageSource(repo, viaAddress, { folder: 'inbox', uid: 12, ownAddresses: [OWN] }), 'doppelt');

  const fromMailApp = await rawMail({ from: OWN, to: 'ben@example.de', subject: 'Re', text: 'Gern, bis Montag', messageId: '<s1@komplettwebdesign.de>' });
  assert.equal(await importMessageSource(repo, fromMailApp, { folder: 'sent', uid: 3, ownAddresses: [OWN] }), 'importiert');
  assert.equal(repo.messages.at(-1).direction, 'out');
  assert.equal(repo.messages.at(-1).conversation_id, b.id);
});

test('Ordner-Abruf: erster Lauf merkt nur die Position, danach werden neue Mails übernommen', async () => {
  const repo = memoryRepo();
  const conversation = await repo.createConversation({ subject: 'A', contactEmail: 'anna@example.de' });
  const messages = [
    { uid: 7, source: await rawMail({ from: 'anna@example.de', to: OWN, text: 'alt', messageId: '<old@example.de>' }) }
  ];
  const client = fakeImap({ messages });

  const first = await syncFolder(client, repo, { mailbox: 'INBOX', path: 'INBOX', folder: 'inbox', ownAddresses: [OWN] });
  assert.equal(first.initialized, true);
  assert.equal(client.fetched.length, 0);
  assert.equal(repo.sync.get('INBOX').last_uid, 7);
  assert.equal(client.released, 1);

  messages.push({ uid: 9, source: await rawMail({ from: 'anna@example.de', to: OWN, text: 'neu', messageId: '<new@example.de>' }) });
  messages.push({ uid: 10, source: await rawMail({ from: 'spam@example.net', to: OWN, text: 'spam', messageId: '<spam@example.net>' }) });
  const second = await syncFolder(client, repo, { mailbox: 'INBOX', path: 'INBOX', folder: 'inbox', ownAddresses: [OWN] });
  assert.deepEqual(client.fetched, ['8:10']);
  assert.equal(second.imported, 1);
  assert.equal(repo.sync.get('INBOX').last_uid, 10);
  assert.equal(repo.messages.filter((m) => m.conversation_id === conversation.id).length, 1);
  assert.equal(repo.messages[0].body_text.trim(), 'neu');

  const rebuilt = fakeImap({ uidValidity: 6n, messages });
  const third = await syncFolder(rebuilt, repo, { mailbox: 'INBOX', path: 'INBOX', folder: 'inbox', ownAddresses: [OWN] });
  assert.equal(third.initialized, true);
  assert.equal(rebuilt.fetched.length, 0);
});

test('Ordner-Abruf stoppt bei Datenbankfehlern an der letzten sicheren Stelle', async () => {
  const repo = memoryRepo();
  await repo.createConversation({ contactEmail: 'anna@example.de' });
  await repo.saveSyncState({ mailbox: 'INBOX', uidValidity: '5', lastUid: 1 });
  const realAdd = repo.addMessage;
  let calls = 0;
  repo.addMessage = async (m) => { calls += 1; if (calls === 2) throw new Error('DB weg'); return realAdd(m); };
  const messages = [2, 3, 4].map((uid) => ({ uid, source: null }));
  for (const m of messages) m.source = await rawMail({ from: 'anna@example.de', to: OWN, text: `Mail ${m.uid}`, messageId: `<m${m.uid}@example.de>` });
  const result = await syncFolder(fakeImap({ messages }), repo, { mailbox: 'INBOX', path: 'INBOX', folder: 'inbox', ownAddresses: [OWN], logger: { error() {} } });
  assert.equal(result.error, 'DB weg');
  assert.equal(repo.sync.get('INBOX').last_uid, 2);
  assert.equal(repo.sync.get('INBOX').last_error, 'DB weg');
});

test('Abruf läuft nur einmal gleichzeitig und nur wenn aktiviert', async () => {
  assert.deepEqual(await runMailSync({ config: { enabled: false } }), { skipped: 'deaktiviert' });

  const lockedDb = { async query() { return { rows: [{ ok: false }] }; } };
  assert.deepEqual(await runMailSync({ config: { enabled: true }, db: lockedDb, ensureSchema: async () => {} }), { skipped: 'läuft-woanders' });

  const queries = [];
  const db = { async query(sql) { queries.push(sql); return { rows: [{ ok: true }] }; } };
  const repo = memoryRepo();
  const client = fakeImap({ messages: [] });
  const outcome = await runMailSync({ config: { enabled: true, ownAddresses: [OWN] }, db, repo, createClient: () => client, ensureSchema: async () => {}, logger: { error() {}, log() {} } });
  assert.deepEqual(outcome.results.map((r) => r.mailbox), ['INBOX', 'SENT']);
  assert.ok(queries.some((sql) => /pg_advisory_unlock/.test(sql)));

  assert.equal(await findSentFolder(client), 'Sent');
  assert.equal(await findSentFolder(client, 'Gesendet'), 'Gesendet');
  assert.equal(await findSentFolder({ async list() { return [{ path: 'INBOX.Gesendet' }]; } }), 'INBOX.Gesendet');

  const appendClient = fakeImap();
  assert.equal(await appendToSentFolder(Buffer.from('raw'), { config: { enabled: true, host: 'h', auth: { user: 'u', pass: 'p' } }, createClient: () => appendClient }), true);
  assert.deepEqual(appendClient.appended[0].flags, ['\\Seen']);
  assert.equal(appendClient.appended[0].path, 'Sent');
  assert.equal(await appendToSentFolder(Buffer.from('raw'), { config: { enabled: false } }), false);

  assert.equal(typeof startMailSync({ config: { enabled: false } }), 'function');
});

test('Antwort aus dem Backend: Marken-Design, Verkettung, Verlauf, Gesendet-Ordner', async () => {
  const repo = memoryRepo();
  const conversation = await repo.createConversation({ subject: 'Kontaktanfrage: Max', contactEmail: 'max@example.de', contactName: 'Max Muster' });
  const confirmation = conversationMessageId(conversation.id, 'bestaetigung');
  await repo.addMessage({ conversationId: conversation.id, direction: 'out', kind: 'bestaetigung', messageId: confirmation });
  await repo.addMessage({ conversationId: conversation.id, direction: 'in', kind: 'eingang', messageId: '<frage@example.de>' });

  const sent = [];
  const appended = [];
  const result = await sendConversationMail({
    conversation,
    subject: '',
    bodyHtml: '<p>Hallo Max,</p><p>gern helfe ich dir.</p>',
    attachments: [{ filename: 'angebot.pdf', content: Buffer.from('%PDF-1.4'), contentType: 'application/pdf' }],
    repo,
    transport: { async sendMail(mail) { sent.push(mail); } },
    appendSent: async (raw) => { appended.push(raw); return true; }
  });

  assert.deepEqual(sent[0].envelope, { from: OWN, to: ['max@example.de'] });
  const parsed = await simpleParser(sent[0].raw);
  assert.equal(parsed.subject, 'Re: Kontaktanfrage: Max');
  assert.equal(parsed.messageId, result.messageId);
  assert.match(result.messageId, /^<kw\.c1\.antwort\./);
  assert.equal(parsed.inReplyTo, '<frage@example.de>');
  assert.deepEqual(parsed.references, [confirmation, '<frage@example.de>']);
  assert.match(parsed.html, /gern helfe ich dir/);
  assert.equal(parsed.to.value[0].name, 'Max Muster');
  assert.equal(parsed.attachments[0].filename, 'angebot.pdf');
  assert.equal(appended[0], sent[0].raw);
  assert.equal(result.appended, true);

  const stored = repo.messages.at(-1);
  assert.equal(stored.kind, 'antwort');
  assert.equal(stored.direction, 'out');
  assert.equal(stored.body_text, 'Hallo Max,\ngern helfe ich dir.');
  assert.deepEqual(stored.attachments, [{ filename: 'angebot.pdf', contentType: 'application/pdf', size: 8 }]);

  // Antwortet Max darauf, landet die Mail über die eigene ID im selben Gespräch.
  const reply = await rawMail({ from: 'max@example.de', to: OWN, subject: 'Re: Re: Kontaktanfrage: Max', text: 'Super, danke!', inReplyTo: result.messageId, messageId: '<danke@example.de>' });
  assert.equal(await importMessageSource(repo, reply, { folder: 'inbox', uid: 50, ownAddresses: [OWN] }), 'importiert');
  assert.equal(repo.messages.at(-1).conversation_id, conversation.id);

  const quiet = await sendConversationMail({
    conversation, bodyHtml: '<p>Kurz</p>', repo,
    transport: { async sendMail() {} },
    appendSent: async () => { throw new Error('IMAP weg'); },
    logger: { warn() {} }
  });
  assert.equal(quiet.appended, false);

  assert.equal(replySubject('AW: Frage'), 'AW: Frage');
  assert.equal(replySubject(''), 'Re: Deine Anfrage bei Komplett Webdesign');
  await assert.rejects(sendConversationMail({ conversation: { id: 1 }, bodyHtml: 'x', repo }), /ohne Empfänger/);
});

test('Admin: Liste, Verlauf öffnen markiert gelesen, Antworten, Status, Notiz, neue Mail, Abruf', async () => {
  const repo = memoryRepo();
  const conversation = await repo.createConversation({ subject: 'Kurzanfrage: Website', contactEmail: 'anna@example.de', source: 'kurzanfrage' });
  await repo.addMessage({ conversationId: conversation.id, direction: 'in', kind: 'anfrage', bodyText: 'Ich brauche eine Website' });
  const sentMails = [];
  const controller = createAdminInboxController({
    repo,
    sendMail: async (args) => { sentMails.push(args); return { messageId: '<x>', appended: true }; },
    runSync: async () => ({ results: [{ mailbox: 'INBOX', imported: 1 }] }),
    syncConfig: () => ({ enabled: true, intervalMs: 180000 }),
    logger: { error() {} }
  });

  const list = fakeRes();
  await controller.list({ query: { hinweis: 'abgerufen' } }, list);
  assert.equal(list.view, 'admin/anfragen/index');
  assert.equal(list.locals.conversations[0].sourceLabel, 'Kontakt-Pop-up');
  assert.equal(list.locals.notice.type, 'success');
  assert.equal(list.locals.sync.intervalMinutes, 3);

  const show = fakeRes();
  await controller.show({ params: { id: String(conversation.id) }, query: {} }, show);
  assert.equal(show.view, 'admin/anfragen/show');
  assert.equal(show.locals.form.subject, 'Re: Kurzanfrage: Website');
  assert.equal(show.locals.messages[0].kindLabel, 'Anfrage');
  assert.equal(repo.conversations.get(conversation.id).unread_count, 0);

  const missing = fakeRes();
  await controller.show({ params: { id: '999' }, query: {} }, missing);
  assert.equal(missing.statusCode, 404);

  const empty = fakeRes();
  await controller.reply({ params: { id: '1' }, body: { subject: 'Re', body: '  ' }, query: {} }, empty);
  assert.equal(empty.statusCode, 400);
  assert.match(empty.locals.notice.message, /Nachricht/);

  const badCta = fakeRes();
  await controller.reply({ params: { id: '1' }, body: { body: 'Hallo', ctaLabel: 'Klick', ctaUrl: 'javascript:alert(1)' }, query: {} }, badCta);
  assert.equal(badCta.statusCode, 400);

  const ok = fakeRes();
  await controller.reply({
    params: { id: '1' },
    body: { subject: 'Re: Website', body: 'Hallo Anna,\n\ngern.', ctaLabel: 'Termin buchen', ctaUrl: 'https://www.komplettwebdesign.de/booking' },
    files: [{ originalname: 'a.pdf', buffer: Buffer.from('x'), size: 1, mimetype: 'application/pdf' }],
    query: {}
  }, ok);
  assert.equal(ok.redirectedTo, '/admin/anfragen/1?hinweis=gesendet#ende');
  assert.equal(sentMails[0].bodyHtml, '<p>Hallo Anna,</p>\n<p>gern.</p>');
  assert.equal(sentMails[0].attachments[0].filename, 'a.pdf');
  assert.equal(sentMails[0].kind, 'antwort');

  const failing = createAdminInboxController({ repo, sendMail: async () => { throw new Error('SMTP down'); }, logger: { error() {} } });
  const failed = fakeRes();
  await failing.reply({ params: { id: '1' }, body: { body: 'Hallo' }, query: {} }, failed);
  assert.equal(failed.statusCode, 502);
  assert.equal(failed.locals.form.body, 'Hallo');

  const status = fakeRes();
  await controller.setStatus({ params: { id: '1' }, body: { status: 'erledigt' } }, status);
  assert.equal(repo.conversations.get(1).status, 'erledigt');
  await controller.setStatus({ params: { id: '1' }, body: { status: 'quatsch' } }, fakeRes());
  assert.equal(repo.conversations.get(1).status, 'erledigt');

  await controller.addNote({ params: { id: '1' }, body: { note: 'Angebot bis Freitag' } }, fakeRes());
  assert.equal(repo.messages.at(-1).kind, 'notiz');
  assert.equal(repo.messages.at(-1).direction, 'intern');

  const noRecipient = fakeRes();
  await controller.create({ body: { to: 'keine-mail', subject: 'Hallo', body: 'Text' } }, noRecipient);
  assert.equal(noRecipient.statusCode, 400);
  const created = fakeRes();
  await controller.create({ body: { to: 'neu@example.de', name: 'Neu', subject: 'Angebot', body: 'Hallo' } }, created);
  assert.match(created.redirectedTo, /^\/admin\/anfragen\/2\?hinweis=gesendet$/);
  assert.equal(sentMails.at(-1).kind, 'nachricht');
  assert.equal(repo.conversations.get(2).source, 'manuell');

  const sync = fakeRes();
  await controller.sync({ body: { zurueck: '1' } }, sync);
  assert.equal(sync.redirectedTo, '/admin/anfragen/1?hinweis=abgerufen');
  const off = createAdminInboxController({ repo, runSync: async () => ({ skipped: 'deaktiviert' }) });
  const offRes = fakeRes();
  await off.sync({ body: {} }, offRes);
  assert.equal(offRes.redirectedTo, '/admin/anfragen?hinweis=abruf-aus');
});

test('Navigation zeigt ungelesene Anfragen nur im Admin-Bereich', async () => {
  const repo = { async unreadTotal() { return 4; } };
  const badge = createUnreadBadgeMiddleware({ repo, ttlMs: 0 });
  const res = { locals: {} };
  await badge({ path: '/admin/anfragen', session: { user: { isAdmin: true } } }, res, () => {});
  assert.equal(res.locals.mailUnread, 4);
  const guest = { locals: {} };
  await badge({ path: '/admin', session: {} }, guest, () => {});
  assert.equal(guest.locals.mailUnread, undefined);
  const broken = createUnreadBadgeMiddleware({ repo: { async unreadTotal() { throw new Error('x'); } }, ttlMs: 0 });
  const brokenRes = { locals: {} };
  await broken({ path: '/admin', session: { user: { isAdmin: true } } }, brokenRes, () => {});
  assert.equal(brokenRes.locals.mailUnread, 0);
});

test('Ansichten: Verlauf escaped fremde Inhalte, Formulare tragen CSRF-Token', async () => {
  const message = presentMessage({
    id: 1, direction: 'in', kind: 'eingang', from_email: 'evil@example.de', from_name: '<b>Evil</b>', subject: 'Hi',
    body_text: 'Hallo <script>alert(1)</script>\n\nAm 24.10.2026 schrieb Sören:\n> alt', attachments: [{ filename: 'x.pdf', size: 2048 }],
    sent_at: new Date('2026-10-24T10:00:00Z'), source_folder: 'inbox'
  });
  assert.equal(message.sentAt, '24.10.2026, 12:00');
  const html = await renderView('admin/anfragen/show.ejs', {
    title: 'Hi',
    notFound: false,
    conversation: { id: 1, subject: 'Hi', contact_email: 'evil@example.de', contact_name: '', status: 'offen', page_path: '/handwerker', booking_id: 4 },
    sourceLabel: 'Kontakt-Pop-up',
    statusLabels: { offen: 'Offen', beantwortet: 'Beantwortet', erledigt: 'Erledigt' },
    statuses: ['offen', 'beantwortet', 'erledigt'],
    messages: [message],
    createdAt: '24.10.2026, 11:00',
    notice: null,
    form: { subject: 'Re: Hi', body: '', locale: 'de' }
  });
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /&lt;b&gt;Evil&lt;\/b&gt;/);
  assert.match(html, /Zitierten Verlauf anzeigen/);
  assert.match(html, /action="\/admin\/anfragen\/1\/antwort"/);
  assert.match(html, /enctype="multipart\/form-data"/);
  assert.ok((html.match(/name="_csrf" value="tok123"/g) || []).length >= 4);
  assert.match(html, /x\.pdf/);
  assert.match(html, /\/js\/admin-inbox\.js/);

  const list = await renderView('admin/anfragen/index.ejs', {
    title: 'Anfragen', conversations: [], hasMore: false, page: 1, status: null, q: '',
    summary: { offen: 0, beantwortet: 0, erledigt: 0, ungelesen: 0, gesamt: 0 },
    statusLabels: { offen: 'Offen', beantwortet: 'Beantwortet', erledigt: 'Erledigt' },
    notice: null, sync: { enabled: true, intervalMinutes: 3, states: [{ mailbox: 'Posteingang', lastRunAt: 'jetzt', error: null }] }
  });
  assert.match(list, /Noch keine Anfragen/);
  assert.match(list, /alle 3 Minuten/);
  assert.match(list, /action="\/admin\/anfragen\/sync"/);

  const compose = await renderView('admin/anfragen/new.ejs', { title: 'Neue Mail', notice: null, form: { to: 'a@b.de', name: '', subject: '', body: '', locale: 'de' } });
  assert.match(compose, /name="to"/);
  assert.match(compose, /value="a@b\.de"/);
});

test('Admin-Navigation verlinkt die Anfragen mit Zähler', async () => {
  const html = await ejs.renderFile(`${viewsDir}partials/admin_header.ejs`, { cssAsset: (p) => `/${p}`, currentPathname: '/admin/anfragen/3', mailUnread: 3 });
  assert.match(html, /href="\/admin\/anfragen" class="is-active"/);
  assert.match(html, /admin-nav__badge[^>]*>3</);
  const none = await ejs.renderFile(`${viewsDir}partials/admin_header.ejs`, { cssAsset: (p) => `/${p}`, currentPathname: '/admin' });
  assert.doesNotMatch(none, /admin-nav__badge/);
});

test('Routen: Anhänge werden vor der CSRF-Prüfung gelesen, alles nur für Admins', async () => {
  const { default: router } = await import('../routes/adminRoutes.js');
  const routes = router.stack.filter((layer) => layer.route?.path?.startsWith('/admin/anfragen'));
  const paths = routes.map((layer) => `${Object.keys(layer.route.methods)[0]} ${layer.route.path}`);
  for (const expected of ['get /admin/anfragen', 'get /admin/anfragen/neu', 'post /admin/anfragen/neu', 'post /admin/anfragen/sync', 'get /admin/anfragen/:id', 'post /admin/anfragen/:id/antwort', 'post /admin/anfragen/:id/status', 'post /admin/anfragen/:id/notiz']) {
    assert.ok(paths.includes(expected), expected);
  }
  for (const layer of routes) {
    const names = layer.route.stack.map((entry) => entry.handle.name);
    assert.equal(names[0], 'isAdmin');
    if (layer.route.methods.post) {
      const csrfAt = names.indexOf('verifyCsrfToken');
      assert.ok(csrfAt > 0, `${layer.route.path} ohne CSRF`);
      const multerAt = names.indexOf('multerMiddleware');
      if (multerAt !== -1) assert.ok(multerAt < csrfAt);
    }
  }
  // /neu muss vor /:id stehen, sonst würde „neu“ als ID gelesen
  assert.ok(paths.indexOf('get /admin/anfragen/neu') < paths.indexOf('get /admin/anfragen/:id'));
});
