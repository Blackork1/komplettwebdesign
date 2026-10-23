import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import ejs from 'ejs';
import { load } from 'cheerio';
import { SITE_FACTS } from '../helpers/siteFacts.js';

const locals = {
  assetVersion: 'test',
  session: {},
  siteFacts: SITE_FACTS,
  canonicalBaseUrl: 'https://www.komplettwebdesign.de',
  canonicalUrl: 'https://www.komplettwebdesign.de/faq',
  robots: 'index,follow',
  cssAsset: file => `/${file}`,
  jsAsset: file => `/${file}`
};

function assertNoChat($) {
  assert.equal($('[id^="chat-"], .chat-button, .chat-container, .faq-chat-window').length, 0);
  assert.equal($('script[src*="/chat.js"], link[href*="/chat.css"], link[href*="/chat.min.css"]').length, 0);
}

for (const lng of ['de', 'en']) {
  test(`public footer (${lng}) offers direct contact and newsletter without a chatbot`, async () => {
    const html = await ejs.renderFile(fileURLToPath(new URL('../views/partials/footer.ejs', import.meta.url)), { ...locals, lng });
    const $ = load(html);
    assertNoChat($);
    assert.equal($('a[href="mailto:kontakt@komplettwebdesign.de"]').length, 1);
    assert.equal($('form[action="/newsletter/signup"] input[type="email"][required]').length, 1);
    assert.equal($('a.back-to-top[href="#top"]').length, 1);
  });
}

test('FAQ page keeps its answers and accordion while removing the chat form and request script', async () => {
  const category = { id: 1, name: 'Allgemein', icon: '/images/icons/general.svg', description: 'Grundlagen' };
  const html = await ejs.renderFile(fileURLToPath(new URL('../views/faq.ejs', import.meta.url)), {
    ...locals,
    lng: 'de',
    categories: [category],
    selectedCategory: category,
    faqs: [{ question: 'Wie frage ich eine Website an?', answer: '<p>Über die Kontaktseite.</p>' }]
  });
  const $ = load(html);
  assertNoChat($);
  assert.equal($('#faqAccordion .accordion-button').text().trim(), 'Wie frage ich eine Website an?');
  assert.equal($('#faqAccordion .accordion-body p').text(), 'Über die Kontaktseite.');
  assert.doesNotMatch($('script:not([src])').text(), /\/faq\/query|\/chat\/(?:message|history)/);
});
