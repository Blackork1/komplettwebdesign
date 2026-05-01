import test from 'node:test';
import assert from 'node:assert/strict';

import { buildIndustrySchemas } from '../helpers/industrySchema.js';

test('buildIndustrySchemas returns a WebPage graph with service, breadcrumbs, offers, and clean FAQ answers', () => {
  const schemas = buildIndustrySchemas({
    baseUrl: 'https://komplettwebdesign.de',
    url: 'https://komplettwebdesign.de/branchen/webdesign-immobilienmakler',
    industry: {
      name: 'Immobilienmakler',
      title: 'Immobilienmakler Website erstellen lassen Berlin',
      description: 'Webdesign, SEO und Lead-Generierung fuer Makler.',
      hero_image_url: 'https://res.cloudinary.com/demo/real-estate.webp',
      updated_at: '2026-04-25T10:00:00.000Z',
      faq_items: [
        {
          q: 'Was kostet eine Makler-Website?',
          a: '<p>Makler-Websites starten bei 499&nbsp;EUR.</p>'
        }
      ]
    }
  });

  assert.equal(schemas.length, 1);
  const graph = schemas[0]['@graph'];
  assert.ok(Array.isArray(graph));

  const webPage = graph.find((item) => item['@type'] === 'WebPage');
  assert.equal(webPage.name, 'Immobilienmakler Website erstellen lassen Berlin');
  assert.equal(webPage.url, 'https://komplettwebdesign.de/branchen/webdesign-immobilienmakler');
  assert.equal(webPage.dateModified, '2026-04-25');
  assert.deepEqual(webPage.image, ['https://res.cloudinary.com/demo/real-estate.webp']);

  const service = graph.find((item) => item['@type'] === 'Service');
  assert.equal(service.name, 'Webdesign für Immobilienmakler');
  assert.equal(service.provider['@id'], 'https://komplettwebdesign.de/#organization');
  assert.equal(service.areaServed.name, 'Berlin');
  assert.equal(service.offers['@type'], 'OfferCatalog');
  assert.deepEqual(
    service.offers.itemListElement.map((offer) => offer.name),
    ['Basis', 'Business', 'Premium']
  );

  const breadcrumbs = graph.find((item) => item['@type'] === 'BreadcrumbList');
  assert.equal(breadcrumbs.itemListElement[2].item, 'https://komplettwebdesign.de/branchen/webdesign-immobilienmakler');

  const faq = graph.find((item) => item['@type'] === 'FAQPage');
  assert.equal(faq.mainEntity[0].acceptedAnswer.text, 'Makler-Websites starten bei 499 EUR.');
});
