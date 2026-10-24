// Admin „Anfragen“: Mailverlauf je Kontakt mit Anfrage, Bestätigung, Antworten und Postfach-Mails.
import { mailConversationRepository, CONVERSATION_STATUSES } from '../repositories/mailConversationRepository.js';
import { sendConversationMail, replySubject } from '../services/mailInbox/outboundService.js';
import { runMailSync, mailSyncConfig } from '../services/mailInbox/mailSyncService.js';
import { SOURCE_LABELS, splitQuoted } from '../services/mailInbox/inboxService.js';
import { parseBodyToHtml, filesToAttachments, formatBytes } from './adminController.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOTAL_ATTACHMENT_LIMIT = 25 * 1024 * 1024;
const PAGE_SIZE = 50;

export const STATUS_LABELS = Object.freeze({ offen: 'Offen', beantwortet: 'Beantwortet', erledigt: 'Erledigt' });

export const KIND_LABELS = Object.freeze({
  anfrage: 'Anfrage',
  eingang: 'Mail erhalten',
  termin: 'Termin',
  bestaetigung: 'Automatische Bestätigung',
  antwort: 'Deine Antwort',
  nachricht: 'Deine Nachricht',
  gesendet: 'Aus deinem Postfach gesendet',
  notiz: 'Interne Notiz'
});

const NOTICES = Object.freeze({
  gesendet: { type: 'success', message: 'Antwort verschickt und im Verlauf gespeichert.' },
  'gesendet-ohne-ablage': { type: 'success', message: 'Antwort verschickt. Im Gesendet-Ordner deines Postfachs konnte sie nicht abgelegt werden.' },
  notiz: { type: 'success', message: 'Notiz gespeichert.' },
  status: { type: 'success', message: 'Status geändert.' },
  abgerufen: { type: 'success', message: 'Postfach abgerufen.' },
  'abruf-aus': { type: 'error', message: 'Postfach-Abruf ist hier nicht aktiv (Zugangsdaten fehlen oder MAIL_SYNC_ENABLED ist aus).' },
  'abruf-laeuft': { type: 'success', message: 'Der Abruf läuft gerade schon. Lade die Seite gleich neu.' },
  'abruf-fehler': { type: 'error', message: 'Postfach-Abruf fehlgeschlagen. Details stehen unten bei „Postfach“.' }
});

export function formatDateTime(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('de-DE', {
    timeZone: 'Europe/Berlin',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function readComposeForm(body = {}) {
  return {
    to: String(body.to || '').trim().toLowerCase(),
    name: String(body.name || '').trim().slice(0, 160),
    subject: String(body.subject || '').trim().slice(0, 200),
    body: String(body.body || '').trim(),
    headline: String(body.headline || '').trim().slice(0, 160),
    preheader: String(body.preheader || '').trim().slice(0, 160),
    ctaLabel: String(body.ctaLabel || '').trim().slice(0, 80),
    ctaUrl: String(body.ctaUrl || '').trim().slice(0, 500),
    locale: body.locale === 'en' ? 'en' : 'de'
  };
}

function readAttachments(files) {
  const uploaded = Array.isArray(files) ? files : [];
  const total = uploaded.reduce((sum, file) => sum + (file.size || file.buffer?.length || 0), 0);
  return { attachments: filesToAttachments(uploaded), total };
}

function validateCompose(form, total, { needsRecipient = false } = {}) {
  if (needsRecipient && !EMAIL_REGEX.test(form.to)) return 'Bitte gib eine gültige Empfänger-Adresse an.';
  if (needsRecipient && !form.subject) return 'Bitte gib einen Betreff ein.';
  if (!form.body) return 'Bitte schreib eine Nachricht.';
  if (form.ctaUrl && !/^https?:\/\//i.test(form.ctaUrl)) return 'Die Button-URL muss mit http:// oder https:// beginnen.';
  if (total > TOTAL_ATTACHMENT_LIMIT) return `Anhänge zusammen zu groß (${formatBytes(total)}). Maximal ${formatBytes(TOTAL_ATTACHMENT_LIMIT)}.`;
  return null;
}

export function presentMessage(message) {
  const isNote = message.kind === 'notiz';
  const { main, quoted } = splitQuoted(message.body_text || '');
  return {
    id: message.id,
    side: isNote ? 'note' : (message.direction === 'out' ? 'out' : 'in'),
    kind: message.kind,
    kindLabel: KIND_LABELS[message.kind] || 'Mail',
    fromLabel: message.direction === 'in' ? (message.from_name || message.from_email || 'Kontakt') : 'Du',
    fromEmail: message.from_email,
    toEmail: message.to_email,
    subject: message.subject,
    main: main || '(ohne Text)',
    quoted,
    attachments: Array.isArray(message.attachments) ? message.attachments : [],
    sentAt: formatDateTime(message.sent_at),
    viaMailbox: Boolean(message.source_folder)
  };
}

export function createAdminInboxController({
  repo = mailConversationRepository,
  sendMail = sendConversationMail,
  runSync = runMailSync,
  syncConfig = () => mailSyncConfig(),
  logger = console
} = {}) {
  async function renderShow(req, res, id, { status = 200, notice = null, form = null } = {}) {
    const conversation = await repo.getConversation(id);
    if (!conversation) return res.status(404).render('admin/anfragen/show', { title: 'Anfrage nicht gefunden', conversation: null, notFound: true });
    if (conversation.unread_count > 0) await repo.markRead(id);
    return res.status(status).render('admin/anfragen/show', {
      title: conversation.subject || 'Anfrage',
      notFound: false,
      conversation,
      sourceLabel: SOURCE_LABELS[conversation.source] || conversation.source,
      statusLabels: STATUS_LABELS,
      statuses: CONVERSATION_STATUSES,
      messages: conversation.messages.map(presentMessage),
      createdAt: formatDateTime(conversation.created_at),
      notice: notice || NOTICES[req.query?.hinweis] || null,
      form: form || {
        subject: replySubject(conversation.subject),
        body: '',
        headline: '',
        preheader: '',
        ctaLabel: '',
        ctaUrl: '',
        locale: 'de'
      }
    });
  }

  return {
    async list(req, res) {
      const status = CONVERSATION_STATUSES.includes(req.query.status) ? req.query.status : null;
      const q = String(req.query.q || '').trim().slice(0, 120);
      const page = Math.max(Number(req.query.seite) || 1, 1);
      try {
        const [conversations, summary, syncStates] = await Promise.all([
          repo.listConversations({ status, q: q || null, limit: PAGE_SIZE + 1, offset: (page - 1) * PAGE_SIZE }),
          repo.countSummary(),
          repo.listSyncStates()
        ]);
        const config = syncConfig();
        return res.render('admin/anfragen/index', {
          title: 'Anfragen',
          conversations: conversations.slice(0, PAGE_SIZE).map((item) => ({
            ...item,
            sourceLabel: SOURCE_LABELS[item.source] || item.source,
            lastAt: formatDateTime(item.last_message_at),
            lastFromYou: item.last_direction === 'out'
          })),
          hasMore: conversations.length > PAGE_SIZE,
          page,
          status,
          q,
          summary,
          statusLabels: STATUS_LABELS,
          notice: NOTICES[req.query.hinweis] || null,
          sync: {
            enabled: config.enabled,
            intervalMinutes: Math.round(config.intervalMs / 60000),
            states: syncStates.map((state) => ({
              mailbox: state.mailbox === 'SENT' ? 'Gesendet' : 'Posteingang',
              lastRunAt: state.last_run_at ? formatDateTime(state.last_run_at) : 'noch nie',
              error: state.last_error
            }))
          }
        });
      } catch (error) {
        logger.error?.('[admin-anfragen] Liste fehlgeschlagen:', error?.message || error);
        return res.status(500).render('admin/anfragen/index', {
          title: 'Anfragen',
          conversations: [],
          hasMore: false,
          page: 1,
          status,
          q,
          summary: { offen: 0, beantwortet: 0, erledigt: 0, ungelesen: 0, gesamt: 0 },
          statusLabels: STATUS_LABELS,
          notice: { type: 'error', message: 'Der Mailverlauf konnte nicht geladen werden. Läuft die Datenbank?' },
          sync: { enabled: false, intervalMinutes: 3, states: [] }
        });
      }
    },

    async show(req, res) {
      const id = parseId(req.params.id);
      if (!id) return res.redirect('/admin/anfragen');
      return renderShow(req, res, id);
    },

    async reply(req, res) {
      const id = parseId(req.params.id);
      if (!id) return res.redirect('/admin/anfragen');
      const form = readComposeForm(req.body);
      const { attachments, total } = readAttachments(req.files);
      const problem = validateCompose(form, total);
      if (problem) return renderShow(req, res, id, { status: 400, notice: { type: 'error', message: problem }, form });

      const conversation = await repo.getConversation(id);
      if (!conversation) return res.redirect('/admin/anfragen');
      try {
        const result = await sendMail({
          conversation,
          subject: form.subject,
          headline: form.headline,
          preheader: form.preheader,
          bodyHtml: parseBodyToHtml(form.body),
          ctaLabel: form.ctaLabel,
          ctaUrl: form.ctaLabel ? form.ctaUrl : '',
          locale: form.locale,
          attachments,
          kind: 'antwort'
        });
        return res.redirect(`/admin/anfragen/${id}?hinweis=${result.appended ? 'gesendet' : 'gesendet-ohne-ablage'}#ende`);
      } catch (error) {
        logger.error?.('[admin-anfragen] Antwort fehlgeschlagen:', error?.message || error);
        return renderShow(req, res, id, {
          status: 502,
          notice: { type: 'error', message: `Senden fehlgeschlagen: ${error?.message || 'unbekannter Fehler'}. Anhänge bitte neu auswählen.` },
          form
        });
      }
    },

    async setStatus(req, res) {
      const id = parseId(req.params.id);
      if (!id) return res.redirect('/admin/anfragen');
      if (CONVERSATION_STATUSES.includes(req.body.status)) await repo.setStatus(id, req.body.status);
      return res.redirect(`/admin/anfragen/${id}?hinweis=status`);
    },

    async addNote(req, res) {
      const id = parseId(req.params.id);
      if (!id) return res.redirect('/admin/anfragen');
      const note = String(req.body.note || '').trim().slice(0, 5000);
      if (note) {
        await repo.addMessage({ conversationId: id, direction: 'intern', kind: 'notiz', subject: 'Notiz', bodyText: note });
      }
      return res.redirect(`/admin/anfragen/${id}?hinweis=notiz#ende`);
    },

    newForm(req, res) {
      return res.render('admin/anfragen/new', {
        title: 'Neue Mail',
        notice: null,
        form: readComposeForm({ to: req.query.an || '', name: req.query.name || '' })
      });
    },

    async create(req, res) {
      const form = readComposeForm(req.body);
      const { attachments, total } = readAttachments(req.files);
      const problem = validateCompose(form, total, { needsRecipient: true });
      if (problem) return res.status(400).render('admin/anfragen/new', { title: 'Neue Mail', notice: { type: 'error', message: problem }, form });

      let conversation = null;
      try {
        conversation = await repo.createConversation({ subject: form.subject, contactEmail: form.to, contactName: form.name, source: 'manuell' });
        await sendMail({
          conversation,
          subject: form.subject,
          headline: form.headline,
          preheader: form.preheader,
          bodyHtml: parseBodyToHtml(form.body),
          ctaLabel: form.ctaLabel,
          ctaUrl: form.ctaLabel ? form.ctaUrl : '',
          locale: form.locale,
          attachments,
          kind: 'nachricht'
        });
        return res.redirect(`/admin/anfragen/${conversation.id}?hinweis=gesendet`);
      } catch (error) {
        logger.error?.('[admin-anfragen] Neue Mail fehlgeschlagen:', error?.message || error);
        if (conversation?.id) {
          await repo.addMessage({ conversationId: conversation.id, direction: 'intern', kind: 'notiz', subject: 'Versand fehlgeschlagen', bodyText: `Die erste Mail konnte nicht gesendet werden: ${error?.message || 'unbekannter Fehler'}` }).catch(() => {});
        }
        return res.status(502).render('admin/anfragen/new', {
          title: 'Neue Mail',
          notice: { type: 'error', message: `Senden fehlgeschlagen: ${error?.message || 'unbekannter Fehler'}. Anhänge bitte neu auswählen.` },
          form
        });
      }
    },

    async sync(req, res) {
      const back = parseId(req.body.zurueck) ? `/admin/anfragen/${parseId(req.body.zurueck)}` : '/admin/anfragen';
      try {
        const outcome = await runSync();
        const code = outcome.skipped === 'deaktiviert'
          ? 'abruf-aus'
          : outcome.skipped
            ? 'abruf-laeuft'
            : (outcome.results || []).some((entry) => entry.error) ? 'abruf-fehler' : 'abgerufen';
        return res.redirect(`${back}?hinweis=${code}`);
      } catch (error) {
        logger.error?.('[admin-anfragen] Abruf fehlgeschlagen:', error?.message || error);
        return res.redirect(`${back}?hinweis=abruf-fehler`);
      }
    }
  };
}

// Zähler „ungelesen“ für die Admin-Navigation, kurz zwischengespeichert.
export function createUnreadBadgeMiddleware({ repo = mailConversationRepository, ttlMs = 5000, now = () => Date.now() } = {}) {
  let cached = { value: 0, at: 0 };
  return async function mailUnreadBadge(req, res, next) {
    if (!req.session?.user?.isAdmin || !String(req.path || '').startsWith('/admin')) return next();
    try {
      if (now() - cached.at > ttlMs) cached = { value: await repo.unreadTotal(), at: now() };
      res.locals.mailUnread = cached.value;
    } catch {
      res.locals.mailUnread = 0;
    }
    return next();
  };
}

const controller = createAdminInboxController();
export const inboxList = controller.list;
export const inboxShow = controller.show;
export const inboxReply = controller.reply;
export const inboxSetStatus = controller.setStatus;
export const inboxAddNote = controller.addNote;
export const inboxNewForm = controller.newForm;
export const inboxCreate = controller.create;
export const inboxSync = controller.sync;
export const mailUnreadBadge = createUnreadBadgeMiddleware();
