// Brücke zwischen den Formularen und dem Mailverlauf. Alles hier ist „best effort“:
// fällt der Verlauf aus, gehen Anfrage und Mails trotzdem raus.
import { mailConversationRepository } from '../../repositories/mailConversationRepository.js';
import {
  NOTIFICATION_HEADER,
  adminConversationUrl,
  conversationMessageId,
  htmlToText,
  recordIncomingRequest,
  recordOutgoing
} from './inboxService.js';

export function summaryRowsToText(rows = []) {
  return (rows || [])
    .filter((row) => Array.isArray(row) && row.length >= 2)
    .map(([label, value]) => `${label}: ${Array.isArray(value) ? value.join(', ') : String(value ?? '')}`)
    .join('\n');
}

export async function logNewRequest(details, { repo = mailConversationRepository, logger = console } = {}) {
  try {
    const { conversation } = await recordIncomingRequest(repo, details);
    return conversation?.id ?? null;
  } catch (error) {
    logger.error?.('[mail-inbox] Anfrage nicht im Verlauf gespeichert:', error?.message || error);
    return null;
  }
}

export async function logOutgoingMail(details, { repo = mailConversationRepository, logger = console } = {}) {
  if (!details?.conversationId) return null;
  try {
    return await recordOutgoing(repo, {
      ...details,
      bodyText: details.bodyText || htmlToText(details.bodyHtml || '')
    });
  } catch (error) {
    logger.error?.('[mail-inbox] Ausgehende Mail nicht im Verlauf gespeichert:', error?.message || error);
    return null;
  }
}

// Zusätze für die Mail an Sören: Kennzeichnung (wird beim Abruf übersprungen), Verkettung, Link ins Backend.
export function ownerNotificationExtras(conversationId) {
  if (!conversationId) return { mail: { headers: { [NOTIFICATION_HEADER]: '1' } }, cta: {} };
  return {
    mail: {
      headers: { [NOTIFICATION_HEADER]: '1' },
      messageId: conversationMessageId(conversationId, 'hinweis')
    },
    cta: { ctaLabel: 'Im Backend öffnen und antworten', ctaUrl: adminConversationUrl(conversationId) }
  };
}

export function customerMessageId(conversationId, kind = 'bestaetigung') {
  return conversationId ? conversationMessageId(conversationId, kind) : undefined;
}

export async function conversationIdForBooking(bookingId, { repo = mailConversationRepository, logger = console } = {}) {
  try {
    return (await repo.findConversationByBookingId(bookingId))?.id ?? null;
  } catch (error) {
    logger.error?.('[mail-inbox] Gespräch zur Buchung nicht gefunden:', error?.message || error);
    return null;
  }
}

// Ereignisse ohne eigene Mail vom Kunden (z. B. Storno über den Link) als eingehenden Eintrag festhalten.
export async function logCustomerEvent({ conversationId, fromEmail, fromName = '', subject, bodyText }, { repo = mailConversationRepository, logger = console } = {}) {
  if (!conversationId) return null;
  try {
    return await repo.addMessage({ conversationId, direction: 'in', kind: 'termin', fromEmail, fromName, subject, bodyText });
  } catch (error) {
    logger.error?.('[mail-inbox] Ereignis nicht im Verlauf gespeichert:', error?.message || error);
    return null;
  }
}
