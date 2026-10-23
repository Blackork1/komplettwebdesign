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
  assert.ok(org.sameAs.some(url => url.includes('maps?cid=')));
  assert.ok(org.hasMap);
  assert.equal(person['@id'], 'https://www.komplettwebdesign.de/#person');
  assert.equal(person.worksFor['@id'], org['@id']);
});

test('blog author is the named person and publisher is the organization', async () => {
  const { buildBlogPostPageModel } = await import('../services/blogPostPresentationService.js');
  const model = buildBlogPostPageModel({ post: { id: 1, slug: 'test', title: 'Test', content: '<p>Test</p>', content_format: 'static_html', created_at: '2026-01-01', updated_at: '2026-01-01' }, canonicalBaseUrl: 'https://www.komplettwebdesign.de' });
  const article = model.structuredDataBlocks.find(block => block['@type'] === 'BlogPosting');
  assert.equal(article.author['@id'], 'https://www.komplettwebdesign.de/#person');
  assert.equal(article.publisher['@id'], 'https://www.komplettwebdesign.de/#organization');
});
