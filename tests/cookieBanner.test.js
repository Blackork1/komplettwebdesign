import test from 'node:test';
import assert from 'node:assert/strict';
import ejs from 'ejs';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';
const template = fileURLToPath(new URL('../views/partials/cookie-banner.ejs', import.meta.url));

test('first visit banner is visible in SSR and buttons share an accessible action group', async () => {
  const html = await ejs.renderFile(template, { lng: 'de', session: {}, assetVersion: 'test' });
  const $ = cheerio.load(html);
  assert.equal($('#cookie-banner').hasClass('is-hidden'), false);
  assert.equal($('.cookie-banner__actions #accept-all').length, 1);
  assert.equal($('.cookie-banner__actions #accept-necessary').length, 1);
});

test('saved consent hides the banner on the initial server render', async () => {
  const html = await ejs.renderFile(template, { lng: 'en', session: { cookieConsent: { analytics: false, marketing: false } }, assetVersion: 'test' });
  const $ = cheerio.load(html);
  assert.equal($('#cookie-banner').hasClass('is-hidden'), true);
  assert.equal($('#accept-necessary').text().trim(), 'Only necessary');
});
