import test from 'node:test';
import assert from 'node:assert/strict';

import {
  auditExistingPost,
  runExistingContentAuditJob
} from '../services/contentAgent/legacyAuditService.js';

test('Bestandsaudit erkennt lokale Befunde deterministisch und schließt den eigenen Post aus', () => {
  const post = {
    id: 7,
    title: 'Website Kosten 2024',
    slug: 'website-kosten',
    excerpt: '',
    content: '<h1>Website Kosten</h1><p>Nur 999 € für dein Projekt.</p>',
    content_format: 'static_html',
    meta_title: '',
    meta_description: '',
    image_alt: '',
    faq_json: []
  };
  const inventory = [
    post,
    { id: 8, title: 'Was kostet eine Website?', slug: 'website-preise', primary_keyword: 'website kosten' }
  ];

  const first = auditExistingPost({ post, inventory, currentYear: 2026 });
  const second = auditExistingPost({ post, inventory, currentYear: 2026 });
  assert.deepEqual(first, second);
  assert.deepEqual(new Set(first.findings.map(({ code }) => code)), new Set([
    'duplicate_h1',
    'stale_year',
    'static_price',
    'missing_meta_title',
    'missing_meta_description',
    'missing_image_alt',
    'missing_faq',
    'missing_contact_cta',
    'missing_internal_links',
    'cannibalization_risk'
  ]));
});

test('Auditjob bleibt lokal, idempotent pro Job/Post/Typ und verändert keine Posts', async () => {
  const persisted = [];
  const uniqueAudits = new Map();
  let postWrites = 0;
  const leaseChecks = [];
  const result = await runExistingContentAuditJob({
    claim: { id: 41 },
    run: { id: 51 },
    currentYear: 2026,
    leaseGuard: async () => leaseChecks.push('lease')
  }, {
    auditRepository: {
      listPublishedPosts: async () => [{
        id: 7, title: 'Titel', slug: 'titel', excerpt: '', content: '<p>Text</p>',
        content_format: 'legacy_ejs', meta_title: '', meta_description: '', image_alt: '', faq_json: []
      }],
      createAuditIdempotent: async (input) => {
        persisted.push(input);
        const key = `${input.jobId}:${input.postId}:${input.auditType}`;
        if (!uniqueAudits.has(key)) uniqueAudits.set(key, { id: uniqueAudits.size + 1, ...input });
        return uniqueAudits.get(key);
      },
      updatePost: async () => { postWrites += 1; }
    }
  });

  await runExistingContentAuditJob({
    claim: { id: 41 }, run: { id: 51 }, currentYear: 2026
  }, {
    auditRepository: {
      listPublishedPosts: async () => [{
        id: 7, title: 'Titel', slug: 'titel', excerpt: '', content: '<p>Text</p>',
        content_format: 'legacy_ejs', meta_title: '', meta_description: '', image_alt: '', faq_json: []
      }],
      createAuditIdempotent: async (input) => {
        const key = `${input.jobId}:${input.postId}:${input.auditType}`;
        if (!uniqueAudits.has(key)) uniqueAudits.set(key, { id: uniqueAudits.size + 1, ...input });
        return uniqueAudits.get(key);
      }
    }
  });

  assert.equal(result.status, 'completed');
  assert.equal(postWrites, 0);
  assert.equal(persisted.length, 1);
  assert.equal(persisted[0].jobId, 41);
  assert.equal(persisted[0].runId, 51);
  assert.equal(persisted[0].postId, 7);
  assert.equal(typeof persisted[0].auditType, 'string');
  assert.equal(uniqueAudits.size, 1);
  assert.ok(leaseChecks.length >= 2);
});
