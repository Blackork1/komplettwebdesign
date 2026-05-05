import { randomBytes, timingSafeEqual } from 'node:crypto';

function ensureSessionToken(req) {
  if (!req.session) return null;
  if (!req.session.csrfToken) {
    req.session.csrfToken = randomBytes(32).toString('hex');
  }
  return req.session.csrfToken;
}

export function attachCsrfToken(req, res, next) {
  const token = ensureSessionToken(req);
  if (token) res.locals.csrfToken = token;
  next();
}

export function verifyCsrfToken(req, res, next) {
  const expected = ensureSessionToken(req);
  const received = String(req.body?._csrf || req.get('x-csrf-token') || '');
  if (!expected || !received) return res.status(403).send('CSRF token invalid');

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) {
    return res.status(403).send('CSRF token invalid');
  }

  return next();
}
