// Antworten aus dem Backend: Marken-Design, saubere Verkettung (Message-ID, In-Reply-To,
// References) und Ablage im Verlauf sowie im Gesendet-Ordner des Postfachs.
import nodemailer from 'nodemailer';
import MailComposer from 'nodemailer/lib/mail-composer/index.js';
import { renderBrandEmail } from '../emailTemplateService.js';
import { mailConversationRepository } from '../../repositories/mailConversationRepository.js';
import { appendToSentFolder } from './mailSyncService.js';
import { OWN_ADDRESS, OWN_FROM, conversationMessageId, htmlToText, recordOutgoing } from './inboxService.js';

let sharedTransport = null;
function defaultTransport() {
  if (!sharedTransport) {
    sharedTransport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
  }
  return sharedTransport;
}

export function replySubject(subject = '') {
  const clean = String(subject || '').trim() || 'Deine Anfrage bei Komplett Webdesign';
  return /^(re|aw|antw):/i.test(clean) ? clean : `Re: ${clean}`;
}

// Baut die Mail als Rohtext, damit exakt dieselbe Fassung verschickt und im Gesendet-Ordner abgelegt wird.
export async function composeRawMail(mail) {
  return new MailComposer(mail).compile().build();
}

export async function sendConversationMail({
  conversation,
  subject,
  headline = '',
  preheader = '',
  bodyHtml,
  ctaLabel = '',
  ctaUrl = '',
  locale = 'de',
  attachments = [],
  kind = 'antwort',
  repo = mailConversationRepository,
  transport = defaultTransport(),
  appendSent = appendToSentFolder,
  logger = console
}) {
  if (!conversation?.id || !conversation.contact_email) throw new TypeError('Gespräch ohne Empfänger.');
  const finalSubject = String(subject || '').trim() || replySubject(conversation.subject);
  const previousIds = await repo.lastMessageIds(conversation.id);
  const messageId = conversationMessageId(conversation.id, kind);
  const inReplyTo = previousIds.at(-1) || null;
  const references = previousIds.slice(-10);

  const html = renderBrandEmail({
    locale,
    subject: finalSubject,
    headline: String(headline || '').trim() || finalSubject.replace(/^(re|aw):\s*/i, ''),
    preheader: String(preheader || '').trim() || htmlToText(bodyHtml).slice(0, 110),
    bodyHtml,
    ctaLabel,
    ctaUrl
  });
  const text = htmlToText(bodyHtml);
  const mail = {
    from: OWN_FROM,
    to: conversation.contact_name ? { name: conversation.contact_name, address: conversation.contact_email } : conversation.contact_email,
    subject: finalSubject,
    html,
    text: ctaLabel && ctaUrl ? `${text}\n\n${ctaLabel}: ${ctaUrl}` : text,
    messageId,
    ...(inReplyTo ? { inReplyTo } : {}),
    ...(references.length ? { references } : {}),
    ...(attachments.length ? { attachments } : {})
  };
  const raw = await composeRawMail(mail);
  await transport.sendMail({ envelope: { from: OWN_ADDRESS, to: [conversation.contact_email] }, raw });

  const saved = await recordOutgoing(repo, {
    conversationId: conversation.id,
    kind,
    toEmail: conversation.contact_email,
    subject: finalSubject,
    bodyText: text,
    bodyHtml,
    messageId,
    inReplyTo,
    references: references.join(' ') || null,
    attachments: attachments.map((file) => ({ filename: file.filename, contentType: file.contentType || '', size: file.content?.length || 0 }))
  });

  // Ablage im Gesendet-Ordner ist ein Extra; ein Fehler dort darf den Versand nicht rückgängig machen.
  let appended = false;
  try {
    appended = await appendSent(raw);
  } catch (error) {
    logger.warn?.('[mail-inbox] Ablage im Gesendet-Ordner fehlgeschlagen:', error?.message || error);
  }
  return { messageId, message: saved, appended };
}
