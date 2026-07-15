import { createHmac } from 'node:crypto';

const ATTRIBUTION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAFE_LOCATION = /^[a-z0-9._~/-]{1,80}$/i;

function positiveInteger(value) {
  const normalized = Number(value);
  return Number.isSafeInteger(normalized) && normalized > 0 ? normalized : null;
}

function hasAnalyticsConsent(req) {
  return req?.session?.cookieConsent?.analytics === true;
}

function isPublishedPost(post) {
  return post?.published === true || post?.workflow_status === 'published';
}

function validTouch(req, now) {
  if (!hasAnalyticsConsent(req)) return null;
  const touch = req?.session?.contentArticleLastTouch;
  const postId = positiveInteger(touch?.postId);
  const touchedAt = new Date(touch?.touchedAt || '');
  const age = now.getTime() - touchedAt.getTime();
  if (!postId || Number.isNaN(touchedAt.getTime()) || age < 0 || age > ATTRIBUTION_MAX_AGE_MS) {
    return null;
  }
  return { postId, touchedAt: touchedAt.toISOString() };
}

function normalizeInternalPath(value) {
  const raw = String(value || '').trim();
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.length > 180) return null;
  if (/[\\\u0000-\u001f\u007f#]/.test(raw)) return null;
  try {
    const parsed = new URL(raw, 'https://intern.invalid');
    if (parsed.origin !== 'https://intern.invalid') return null;
    const normalized = `${parsed.pathname}${parsed.search}`;
    return normalized.length <= 180 ? normalized : null;
  } catch {
    return null;
  }
}

function normalizeLocation(value) {
  const normalized = String(value || '').trim();
  return SAFE_LOCATION.test(normalized) ? normalized : null;
}

function hash(secret, value) {
  return createHmac('sha256', secret).update(value).digest('hex');
}

export function createContentAttributionService({ repository, secret, now = () => new Date() } = {}) {
  if (!repository || typeof repository.recordArticleEvent !== 'function') {
    throw new TypeError('Ein Repository für Artikelereignisse wird benötigt.');
  }
  if (typeof secret !== 'string' || secret.length < 16) {
    throw new TypeError('Für die anonyme Artikelzuordnung wird ein ausreichend langes Sitzungsgeheimnis benötigt.');
  }
  if (typeof now !== 'function') throw new TypeError('now muss eine Funktion sein.');

  return {
    rememberArticle(req, post) {
      const postId = positiveInteger(post?.id);
      if (!postId || !req?.session || !hasAnalyticsConsent(req) || !isPublishedPost(post)) return false;
      const touchedAt = now();
      if (!(touchedAt instanceof Date) || Number.isNaN(touchedAt.getTime())) return false;
      req.session.contentArticleLastTouch = {
        postId,
        touchedAt: touchedAt.toISOString()
      };
      return true;
    },

    async recordCtaClick(req, input = {}) {
      const occurredAt = now();
      const touch = occurredAt instanceof Date ? validTouch(req, occurredAt) : null;
      const postId = positiveInteger(input.postId);
      const nonce = String(input.nonce || '').trim();
      const ctaLocation = normalizeLocation(input.ctaLocation);
      const ctaTarget = normalizeInternalPath(input.ctaTarget);
      const sessionId = String(req?.sessionID || '');
      if (!touch || !postId || touch.postId !== postId || !UUID.test(nonce)
        || !ctaLocation || !ctaTarget || !sessionId) {
        return false;
      }

      await repository.recordArticleEvent({
        postId,
        eventType: 'cta_click',
        occurredAt,
        ctaLocation,
        ctaTarget,
        eventKeyHash: hash(secret, `${sessionId}|${nonce}|cta_click`)
      });
      return true;
    },

    async recordContactSubmit(req) {
      const occurredAt = now();
      const touch = occurredAt instanceof Date ? validTouch(req, occurredAt) : null;
      const sessionId = String(req?.sessionID || '');
      if (!touch || !sessionId) return false;

      await repository.recordArticleEvent({
        postId: touch.postId,
        eventType: 'contact_submit',
        occurredAt,
        ctaLocation: null,
        ctaTarget: '/kontakt',
        eventKeyHash: hash(secret, `${sessionId}|${touch.touchedAt}|contact_submit`)
      });
      return true;
    }
  };
}

