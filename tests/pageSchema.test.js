import assert from 'node:assert/strict';
import test from 'node:test';
import { buildHandwerkerPageSchemas } from '../helpers/pageSchema.js';

test('buildHandwerkerPageSchemas returns extractable WebPage, Service, breadcrumb, and FAQ graph', () => {
  const page = {
    title: 'Handwerker Website Berlin | Webdesign, SEO & Anfragen',
    description: 'Webdesign fuer Handwerker in Berlin mit Leistungen, Referenzen und Anfragewegen.',
    slug: 'handwerker'
  };

  const schema = buildHandwerkerPageSchemas({
    page,
    baseUrl: 'https://www.komplettwebdesign.de',
    url: 'https://www.komplettwebdesign.de/handwerker'
  });

  assert.equal(schema['@context'], 'https://schema.org');
  assert.ok(Array.isArray(schema['@graph']));

  const graph = schema['@graph'];
  const types = graph.flatMap((node) => node['@type']);
  assert.deepEqual(types, [
    'Organization',
    'WebSite',
    'WebPage',
    'Service',
    'BreadcrumbList',
    'FAQPage'
  ]);

  const service = graph.find((node) => node['@type'] === 'Service');
  assert.equal(service.name, 'Webdesign für Handwerker');
  assert.equal(service.areaServed.name, 'Berlin');
  assert.equal(service.audience.audienceType, 'Handwerksbetriebe');
  assert.equal(service.offers.itemListElement[0].price, '499.00');

  const faq = graph.find((node) => node['@type'] === 'FAQPage');
  assert.ok(faq.mainEntity.length >= 5);
  assert.match(faq.mainEntity[0].name, /Handwerker-Website/);
  assert.doesNotMatch(faq.mainEntity[0].acceptedAnswer.text, /<[^>]+>/);
});
