import test from 'node:test';
import assert from 'node:assert/strict';

test('organization and person share canonical identities and confirmed NAP', async () => {
  const { buildOrganizationSchema, buildPersonSchema } = await import('../helpers/entitySchema.js');
  const org = buildOrganizationSchema();
  const person = buildPersonSchema();
  assert.deepEqual(org['@type'], ['Organization', 'ProfessionalService']);
  assert.equal(org['@id'], 'https://www.komplettwebdesign.de/#organization');
  assert.equal(org.telephone, '+4915511245048');
  assert.equal(org.address.postalCode, '10367');
  assert.equal(org.address.addressLocality, 'Berlin');
  assert.ok(org.sameAs.includes('https://www.google.com/maps?cid=8211853018206635760'));
  assert.ok(org.hasMap);
  assert.equal(org.foundingDate, '2025');
  assert.equal(org.legalName, 'Komplett Webdesign, Inhaber Sören Blocksdorf');
  assert.match(org.description, /Berlin-Lichtenberg/);
  assert.equal(org.hasOfferCatalog['@id'], 'https://www.komplettwebdesign.de/pakete#katalog');
  // Das persönliche LinkedIn-Profil gehört an die Person, nicht an das Unternehmen.
  assert.ok(!org.sameAs.some((url) => url.includes('linkedin.com/in/')));
  assert.equal(person['@id'], 'https://www.komplettwebdesign.de/#person');
  assert.equal(person.worksFor['@id'], org['@id']);
  assert.deepEqual(person.sameAs, ['https://www.linkedin.com/in/komplettwebdesign']);
  assert.match(person.description, /seit 2021 im Webdesign tätig/);
  assert.match(person.description, /Gründete 2025/);
});

test('blog author is the named person and publisher is the organization', async () => {
  const { buildBlogPostPageModel } = await import('../services/blogPostPresentationService.js');
  const model = buildBlogPostPageModel({ post: { id: 1, slug: 'test', title: 'Test', content: '<p>Test</p>', content_format: 'static_html', created_at: '2026-01-01', updated_at: '2026-01-01' }, canonicalBaseUrl: 'https://www.komplettwebdesign.de' });
  const article = model.structuredDataBlocks.find(block => block['@type'] === 'BlogPosting');
  assert.equal(article.author['@id'], 'https://www.komplettwebdesign.de/#person');
  assert.equal(article.publisher['@id'], 'https://www.komplettwebdesign.de/#organization');
});
