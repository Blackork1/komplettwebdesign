// Mailverlauf: Anfragen erfassen, ausgehende Mails zuordnen, Benachrichtigung an Sören.
import { randomBytes } from 'node:crypto';
import { load } from 'cheerio';
import sanitizeHtml from 'sanitize-html';
import { renderBrandEmail } from '../emailTemplateService.js';

export const OWN_ADDRESS = 'kontakt@komplettwebdesign.de';
export const OWN_FROM = '"Komplett Webdesign" <kontakt@komplettwebdesign.de>';
export const SITE_URL = 'https://www.komplettwebdesign.de';
export const NOTIFICATION_HEADER = 'X-KW-Notification';

export const SOURCE_LABELS = Object.freeze({
  kurzanfrage: 'Kontakt-Pop-up',
  kontaktformular: 'Kontaktformular',
  'webdesign-berlin': 'Formular Webdesign Berlin',
  termin: 'Terminbuchung',
  paket: 'Paketanfrage',
  manuell: 'Von dir gestartet'
});

// Eigene Message-IDs tragen die Gesprächsnummer. Antwortet ein Kunde, steht sie in In-Reply-To/References.
export function conversationMessageId(conversationId, kind = 'msg') {
  const safeKind = String(kind).replace(/[^a-z0-9-]/gi, '').slice(0, 20) || 'msg';
  return `<kw.c${Number(conversationId)}.${safeKind}.${randomBytes(6).toString('hex')}@komplettwebdesign.de>`;
}

export function conversationIdFromMessageIds(ids = []) {
  for (const id of [].concat(ids || [])) {
    const match = /<?kw\.c(\d+)\.[^@>]*@komplettwebdesign\.de>?/i.exec(String(id || ''));
    if (match) return Number(match[1]);
  }
  return null;
}

export function adminConversationUrl(conversationId) {
  return `${SITE_URL}/admin/anfragen/${Number(conversationId)}`;
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]
  ));
}

export function htmlToText(html = '') {
  const withBreaks = String(html || '')
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6]|blockquote|table)>/gi, '\n');
  const text = load(`<body>${withBreaks}</body>`)('body').text();
  return text.replace(/[ \t ]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

// Trennt den neuen Text vom zitierten Verlauf („Am … schrieb …“, „On … wrote:“, „>“-Zeilen).
export function splitQuoted(text = '') {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  const markers = [
    /^Am .{4,120}(schrieb|wrote).{0,120}:\s*$/i,
    /^On .{4,160} wrote:\s*$/i,
    /^-{2,}\s*(Original|Ursprüngliche) (Message|Nachricht)\s*-{2,}/i,
    /^Von:\s.+/i,
    /^From:\s.+/i
  ];
  let cut = lines.findIndex((line) => markers.some((marker) => marker.test(line.trim())));
  if (cut === -1) cut = lines.findIndex((line, index) => line.startsWith('>') && index > 0 && lines.slice(index).every((rest) => !rest.trim() || rest.startsWith('>')));
  if (cut <= 0) return { main: String(text || '').trim(), quoted: '' };
  return { main: lines.slice(0, cut).join('\n').trim(), quoted: lines.slice(cut).join('\n').trim() };
}

// HTML fremder Mails nur bereinigt speichern: keine Skripte, keine externen Bilder, sichere Links.
export function sanitizeMailHtml(html = '') {
  if (!html) return null;
  return sanitizeHtml(String(html), {
    allowedTags: ['p', 'br', 'b', 'strong', 'i', 'em', 'u', 'a', 'ul', 'ol', 'li', 'blockquote', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'pre', 'code', 'hr'],
    allowedAttributes: { a: ['href', 'target', 'rel'] },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer nofollow' })
    }
  });
}

export function textToHtml(text = '') {
  return String(text || '')
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

export async function recordIncomingRequest(repo, {
  source,
  subject,
  contactEmail,
  contactName = '',
  contactRequestId = null,
  bookingId = null,
  pagePath = '',
  bodyText = '',
  sentAt = new Date()
}) {
  const conversation = await repo.createConversation({
    subject, contactEmail, contactName, source, contactRequestId, bookingId, pagePath
  });
  const message = await repo.addMessage({
    conversationId: conversation.id,
    direction: 'in',
    kind: 'anfrage',
    fromEmail: contactEmail,
    fromName: contactName,
    toEmail: OWN_ADDRESS,
    subject,
    bodyText,
    sentAt
  });
  return { conversation, message };
}

export async function recordOutgoing(repo, {
  conversationId,
  kind = 'antwort',
  toEmail,
  subject,
  bodyText = '',
  bodyHtml = null,
  messageId = null,
  inReplyTo = null,
  references = null,
  attachments = [],
  sentAt = new Date()
}) {
  return repo.addMessage({
    conversationId,
    direction: 'out',
    kind,
    fromEmail: OWN_ADDRESS,
    fromName: 'Komplett Webdesign',
    toEmail,
    subject,
    bodyText,
    bodyHtml,
    messageId,
    inReplyTo,
    references,
    attachments,
    sentAt
  });
}

// Genau eine Mail an Sören pro neuer Anfrage, mit Link in den Verlauf. Die Message-ID trägt die
// Gesprächsnummer: antwortet Sören direkt im Mailprogramm, ordnet der Postfach-Abruf das richtig zu.
export function buildOwnerNotification({ conversationId = null, subject, headline, preheader, summaryHtml, replyTo = null, attachments = [] }) {
  const ctaUrl = conversationId ? adminConversationUrl(conversationId) : '';
  return {
    from: OWN_FROM,
    to: OWN_ADDRESS,
    ...(replyTo ? { replyTo } : {}),
    ...(conversationId ? { messageId: conversationMessageId(conversationId, 'hinweis') } : {}),
    subject,
    headers: { [NOTIFICATION_HEADER]: '1' },
    html: renderBrandEmail({
      locale: 'de',
      subject,
      headline,
      preheader,
      bodyHtml: summaryHtml,
      ctaLabel: ctaUrl ? 'Im Backend öffnen und antworten' : '',
      ctaUrl
    }),
    attachments
  };
}
