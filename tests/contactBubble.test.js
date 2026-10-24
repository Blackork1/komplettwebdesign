import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import ejs from 'ejs';
import {
  CONTACT_BUBBLE_LIMITS,
  validateContactBubble,
  createContactBubbleHandler,
  createContactBubbleRateLimiter
} from '../controllers/contactBubbleController.js';
import {
  BUBBLE_SETTINGS,
  scrollProgress,
  isSuppressed,
  suppressFor,
  pickNextSlot,
  formatSlotLabel
} from '../public/js/contact-bubble.js';

const NOW = Date.parse('2026-10-24T10:00:00Z');
const validBody = (overrides = {}) => ({
  message: 'Ich brauche eine neue Website für meinen Malerbetrieb.',
  email: 'Kunde@Example.de',
  website: '',
  startedAt: NOW - 20_000,
  page: '/handwerker',
  ...overrides
});

function fakeRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
    setHeader(name, value) { this.headers[name] = value; }
  };
}

function fakeReq(body, { origin = 'https://www.komplettwebdesign.de', host = 'www.komplettwebdesign.de', ip = '203.0.113.5' } = {}) {
  const headers = { origin, host };
  return { body, ip, headers, get: (name) => headers[name.toLowerCase()] };
}

test('Validierung erkennt Bots am versteckten Feld und an zu schneller Eingabe', () => {
  assert.deepEqual(validateContactBubble(validBody({ website: 'http://spam.example' }), NOW), { ok: false, spam: true });
  assert.deepEqual(validateContactBubble(validBody({ startedAt: NOW - 500 }), NOW), { ok: false, spam: true });
  assert.deepEqual(validateContactBubble(validBody({ startedAt: undefined }), NOW), { ok: false, spam: true });
});

test('Validierung verlangt eine kurze Nachricht und eine gültige E-Mail', () => {
  assert.equal(validateContactBubble(validBody({ message: 'Hallo' }), NOW).field, 'message');
  assert.equal(validateContactBubble(validBody({ email: 'keine-mail' }), NOW).field, 'email');
  const ok = validateContactBubble(validBody({ page: '/handwerker?x=<script>' }), NOW);
  assert.equal(ok.ok, true);
  assert.equal(ok.data.email, 'kunde@example.de');
  assert.equal(ok.data.page, '');
  const long = validateContactBubble(validBody({ message: 'x'.repeat(5000) }), NOW);
  assert.equal(long.data.message.length, CONTACT_BUBBLE_LIMITS.messageMax);
});

test('gültige Kurzanfrage wird gespeichert und landet mit Antwortadresse bei Sören', async () => {
  const mails = []; const saved = []; const logged = [];
  const handler = createContactBubbleHandler({
    sendMail: async (mail) => { mails.push(mail); },
    saveRequest: async (data) => { saved.push(data); return { id: 7 }; },
    logRequest: async (data, request) => { logged.push({ data, request }); return 42; },
    now: () => NOW,
    logger: { error() {} }
  });
  const res = fakeRes();
  await handler(fakeReq(validBody({ message: 'Neue Website <script>alert(1)</script> bitte' })), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { success: true });
  assert.equal(saved.length, 1);
  assert.equal(mails.length, 1);
  assert.equal(mails[0].to, 'kontakt@komplettwebdesign.de');
  assert.equal(mails[0].replyTo, 'kunde@example.de');
  assert.match(mails[0].html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(mails[0].html, /<script>alert/);
  assert.match(mails[0].html, /\/handwerker/);
  // Mailverlauf: genau eine Mail, gekennzeichnet und mit Link ins Backend
  assert.equal(logged.length, 1);
  assert.equal(logged[0].request.id, 7);
  assert.equal(mails[0].headers['X-KW-Notification'], '1');
  assert.match(mails[0].messageId, /^<kw\.c42\.hinweis\.[a-f0-9]+@komplettwebdesign\.de>$/);
  assert.match(mails[0].html, /https:\/\/www\.komplettwebdesign\.de\/admin\/anfragen\/42/);
  assert.match(mails[0].html, /Im Backend öffnen und antworten/);
});

test('Kurzanfrage geht auch raus, wenn der Mailverlauf ausfällt', async () => {
  const mails = [];
  const handler = createContactBubbleHandler({
    sendMail: async (mail) => { mails.push(mail); },
    saveRequest: async () => ({ id: 1 }),
    logRequest: async () => { throw new Error('DB down'); },
    now: () => NOW,
    logger: { error() {} }
  });
  const res = fakeRes();
  await handler(fakeReq(validBody()), res);
  assert.equal(res.statusCode, 200);
  assert.equal(mails.length, 1);
  assert.equal(mails[0].messageId, undefined);
  assert.doesNotMatch(mails[0].html, /admin\/anfragen/);
});

test('Spam wird stillschweigend verworfen, fremde Herkunft abgewiesen', async () => {
  let sent = 0;
  const handler = createContactBubbleHandler({ sendMail: async () => { sent += 1; }, saveRequest: async () => {}, logRequest: async () => null, now: () => NOW });
  const spamRes = fakeRes();
  await handler(fakeReq(validBody({ website: 'bot' })), spamRes);
  assert.equal(spamRes.statusCode, 200);
  const foreignRes = fakeRes();
  await handler(fakeReq(validBody(), { origin: 'https://evil.example' }), foreignRes);
  assert.equal(foreignRes.statusCode, 403);
  assert.equal(sent, 0);
});

test('Mailfehler wird ehrlich gemeldet, Speicherfehler blockiert den Versand nicht', async () => {
  const failing = createContactBubbleHandler({
    sendMail: async () => { throw new Error('SMTP down'); },
    saveRequest: async () => {},
    logRequest: async () => null,
    now: () => NOW,
    logger: { error() {} }
  });
  const res = fakeRes();
  await failing(fakeReq(validBody()), res);
  assert.equal(res.statusCode, 502);
  assert.match(res.body.message, /kontakt@komplettwebdesign\.de/);

  let sent = 0;
  const dbDown = createContactBubbleHandler({
    sendMail: async () => { sent += 1; },
    saveRequest: async () => { throw new Error('DB down'); },
    logRequest: async () => null,
    now: () => NOW,
    logger: { error() {} }
  });
  const ok = fakeRes();
  await dbDown(fakeReq(validBody()), ok);
  assert.equal(ok.statusCode, 200);
  assert.equal(sent, 1);
});

test('mehr als drei Nachrichten pro IP im Zeitfenster werden gebremst', () => {
  const limiter = createContactBubbleRateLimiter({ max: 3, windowMs: 60_000, now: () => NOW });
  let passed = 0;
  const statuses = [];
  for (let i = 0; i < 4; i += 1) {
    const res = fakeRes();
    limiter(fakeReq({}), res, () => { passed += 1; });
    statuses.push(res.statusCode);
  }
  assert.equal(passed, 3);
  assert.equal(statuses[3], 429);
});

test('Auslöser: Scrolltiefe, Ruhezeiten und nächster freier Termin', () => {
  assert.equal(BUBBLE_SETTINGS.delayMs, 20000);
  assert.equal(BUBBLE_SETTINGS.scrollProgress, 0.3);
  assert.equal(scrollProgress({ scrollY: 600, innerHeight: 800, scrollHeight: 1800 }), 0.6);
  assert.equal(scrollProgress({ scrollY: 0, innerHeight: 900, scrollHeight: 800 }), 0);

  const store = () => { const data = new Map(); return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)) }; };
  const local = store(); const session = store();
  assert.equal(isSuppressed({ local, session, now: NOW }), false);
  suppressFor(BUBBLE_SETTINGS.dismissDays, { local, now: NOW });
  assert.equal(isSuppressed({ local, session, now: NOW + 6 * 86_400_000 }), true);
  assert.equal(isSuppressed({ local, session, now: NOW + 8 * 86_400_000 }), false);
  session.setItem(BUBBLE_SETTINGS.sessionKey, '1');
  assert.equal(isSuppressed({ local: store(), session, now: NOW }), true);
  const broken = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.equal(isSuppressed({ local: broken, session: broken, now: NOW }), false);

  const slot = pickNextSlot([
    { id: 1, start_time: '2026-10-23T08:00:00Z', is_booked: false },
    { id: 3, start_time: '2026-10-29T09:00:00Z', is_booked: false },
    { id: 2, start_time: '2026-10-27T09:00:00Z', is_booked: true },
    { id: 4, start_time: '2026-10-28T09:00:00Z', is_booked: false }
  ], NOW);
  assert.equal(slot.id, 4);
  assert.equal(formatSlotLabel(slot.start_time), 'Mi., 28.10. um 10:00 Uhr');
  assert.equal(pickNextSlot([], NOW), null);
});

test('Pop-up erscheint auf Angebotsseiten, aber nicht auf Kontakt-, Termin-, Rechts- und englischen Seiten', async () => {
  const partial = fileURLToPath(new URL('../views/partials/contact-bubble.ejs', import.meta.url));
  const render = (currentPathname) => ejs.renderFile(partial, { currentPathname, cssAsset: (f) => `/${f}`, jsAsset: (f) => `/${f}` });
  const html = await render('/handwerker');
  assert.match(html, /data-contact-bubble[^>]*hidden/);
  assert.match(html, /href="\/booking\?src=kontakt-bubble"/);
  assert.match(html, /href="\/datenschutz"/);
  assert.match(html, /name="website"[^>]*tabindex="-1"/);
  assert.match(html, /src="\/images\/soeren-kontakt\.webp(?:\?v=[\w]+)?"/);
  assert.match(html, /id="kwd-bubble-title">Sören<\/p>/);
  assert.doesNotMatch(html, /Blocksdorf/);
  assert.match(html, /<script type="module" src="\/js\/contact-bubble\.js">/);
  for (const path of ['/kontakt', '/booking', '/booking/thankyou', '/impressum', '/datenschutz', '/en/webdesign-berlin', '/hinweise-rechtstexte-seo-datenschutz']) {
    assert.doesNotMatch(await render(path), /data-contact-bubble/, path);
  }
});

test('der Footer bindet das Pop-up ein und die Route ist registriert', async () => {
  const footer = await readFile(new URL('../views/partials/footer.ejs', import.meta.url), 'utf8');
  assert.match(footer, /include\('contact-bubble'\)/);
  const routes = await readFile(new URL('../routes/widgetApiRoutes.js', import.meta.url), 'utf8');
  assert.match(routes, /router\.post\('\/api\/kurzanfrage', contactBubbleRateLimit, handleContactBubble\)/);
  const css = await readFile(new URL('../public/contact-bubble.css', import.meta.url), 'utf8');
  assert.match(css, /@keyframes kwd-bubble-pop/);
  assert.match(css, /prefers-reduced-motion: reduce[\s\S]*animation: none/);
});

test('Startseite holt Besucher zwischendurch ab, nicht erst am Seitenende', async () => {
  const index = await readFile(new URL('../views/index.ejs', import.meta.url), 'utf8');
  // Der frühe Zwischenstopp entfällt: dort erscheint fast gleichzeitig das Kontakt-Pop-up.
  assert.equal(index.indexOf("include('partials/home-midcta', { variant: 'start'"), -1);
  const ablauf = index.indexOf("include('partials/home-midcta', { variant: 'ablauf', isEn, showPhoto: false })");
  assert.ok(ablauf > index.indexOf('id="ablauf"') && ablauf < index.indexOf('id="trust"'), 'Zwischenstopp nach dem Ablauf');
  // Direkt danach folgt „Über mich“ mit Foto, daher ohne eigenes Foto.
  assert.ok(index.indexOf('id="ueber-mich"') > ablauf);
  const partial = fileURLToPath(new URL('../views/partials/home-midcta.ejs', import.meta.url));
  const de = await ejs.renderFile(partial, { variant: 'start', isEn: false });
  assert.match(de, /Weißt du schon, was du brauchst\?/);
  assert.match(de, /href="\/booking\?src=home-start"/);
  assert.match(de, /href="\/kontakt" data-contact-bubble-open="write"/);
  assert.match(de, /href="#preise"/);
  assert.match(de, /class="home-midcta__photo"/);
  const ablaufDe = await ejs.renderFile(partial, { variant: 'ablauf', isEn: false, showPhoto: false });
  assert.match(ablaufDe, /Klingt der Ablauf gut für dich\?/);
  assert.match(ablaufDe, /home-midcta__inner home-midcta__inner--text/);
  assert.doesNotMatch(ablaufDe, /home-midcta__photo/);
  const en = await ejs.renderFile(partial, { variant: 'ablauf', isEn: true });
  assert.match(en, /href="\/en\/kontakt"/);
  assert.doesNotMatch(en, /data-contact-bubble-open/);
});
