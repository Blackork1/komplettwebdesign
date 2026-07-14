import test from 'node:test';
import assert from 'node:assert/strict';

import { createContentReviewIssueOptimizationRepository } from '../repositories/contentReviewIssueOptimizationRepository.js';

function repositoryFixture() {
  const calls = [];
  let post = {
    id: 19,
    generated_by_ai: true,
    published: false,
    content_format: 'static_html',
    content: '<section>Alt</section>',
    workflow_status: 'approved_scheduled',
    review_version: 3,
    approved_review_version: 3,
    approved_at: new Date('2026-07-14T08:00:00.000Z'),
    approved_by_admin_id: 7
  };
  let metadata = {
    post_id: 19,
    quality_score: 72,
    quality_report_json: {},
    generation_metadata_json: {}
  };
  const client = {
    async query(sql, params = []) {
      const normalized = sql.replace(/\s+/g, ' ').trim();
      calls.push({ sql: normalized, params });
      if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(normalized)) return { rows: [] };
      if (normalized === 'LOCK TABLE posts IN SHARE ROW EXCLUSIVE MODE') return { rows: [] };
      if (/lastReviewIssueOptimization/i.test(normalized) && /FOR UPDATE/i.test(normalized)) {
        return { rows: [{
          ...post,
          review_optimization_commit: metadata.generation_metadata_json.lastReviewIssueOptimization || null
        }] };
      }
      if (/^UPDATE posts/i.test(normalized)) {
        if (Number(params[2]) !== post.review_version) return { rows: [] };
        post = {
          ...post,
          content: params[1],
          review_version: post.review_version + 1,
          workflow_status: 'needs_review',
          approved_review_version: null,
          approved_at: null,
          approved_by_admin_id: null
        };
        return { rows: [{ ...post }] };
      }
      if (/^UPDATE content_post_metadata/i.test(normalized)) {
        metadata = {
          ...metadata,
          quality_score: params[1],
          quality_report_json: JSON.parse(params[2]),
          generation_metadata_json: {
            ...metadata.generation_metadata_json,
            lastReviewIssueOptimization: JSON.parse(params[4])
          }
        };
        return { rows: [{ ...metadata }] };
      }
      if (/^SELECT \* FROM content_post_metadata/i.test(normalized)) return { rows: [{ ...metadata }] };
      throw new Error(`Unerwartete Query: ${normalized}`);
    },
    release() { calls.push({ sql: 'RELEASE', params: [] }); }
  };
  return {
    calls,
    get post() { return post; },
    get metadata() { return metadata; },
    repository: createContentReviewIssueOptimizationRepository({
      async connect() { return client; },
      async query() { return { rows: [] }; }
    })
  };
}

function payload() {
  return {
    postId: 19,
    contentHtml: '<section><h2>Optimiert</h2></section>',
    qualityScore: 91,
    qualityReport: {
      passed: true,
      score: 91,
      focusedReview: { blocked: false, items: [] }
    },
    expectedReviewVersion: 3,
    commitKey: '12:optimize_review_issues:19'
  };
}

test('speichert HTML, Qualitätsdaten, Fence und Reviewversion atomar und löscht die Freigabe', async () => {
  const fixture = repositoryFixture();
  const result = await fixture.repository.commitOptimization(payload());

  assert.equal(result.post.review_version, 4);
  assert.equal(result.post.content, payload().contentHtml);
  assert.equal(result.post.workflow_status, 'needs_review');
  assert.equal(result.post.approved_review_version, null);
  assert.equal(result.post.approved_at, null);
  assert.equal(result.post.approved_by_admin_id, null);
  assert.equal(result.metadata.quality_score, 91);
  assert.deepEqual(result.metadata.quality_report_json, payload().qualityReport);
  assert.equal(
    result.metadata.generation_metadata_json.lastReviewIssueOptimization.commitKey,
    payload().commitKey
  );

  const sql = fixture.calls.map(({ sql }) => sql);
  assert.equal(sql[0], 'BEGIN');
  assert.equal(sql[1], 'LOCK TABLE posts IN SHARE ROW EXCLUSIVE MODE');
  assert.ok(sql.indexOf('COMMIT') > sql.findIndex((value) => /^UPDATE content_post_metadata/i.test(value)));
  assert.ok(sql.indexOf('RELEASE') > sql.indexOf('COMMIT'));
  const postUpdate = fixture.calls.find(({ sql: value }) => /^UPDATE posts/i.test(value));
  assert.match(postUpdate.sql, /review_version = review_version \+ 1/i);
  assert.match(postUpdate.sql, /workflow_status = 'needs_review'/i);
  assert.match(postUpdate.sql, /approved_review_version = NULL/i);
  assert.match(postUpdate.sql, /approved_at = NULL/i);
  assert.match(postUpdate.sql, /approved_by_admin_id = NULL/i);
  assert.match(postUpdate.sql, /review_version = \$3/i);
});

test('derselbe Commit-Fence ist idempotent und erhöht die Reviewversion nur einmal', async () => {
  const fixture = repositoryFixture();
  const first = await fixture.repository.commitOptimization(payload());
  const second = await fixture.repository.commitOptimization(payload());

  assert.equal(first.post.review_version, 4);
  assert.equal(second.post.review_version, 4);
  assert.equal(second.idempotent, true);
  assert.equal(fixture.calls.filter(({ sql }) => /^UPDATE posts/i.test(sql)).length, 1);
});

test('abweichende Reviewversion wird unter Lock als stale abgelehnt', async () => {
  const fixture = repositoryFixture();
  await assert.rejects(
    fixture.repository.commitOptimization({ ...payload(), expectedReviewVersion: 2 }),
    (error) => error.code === 'CONTENT_REGENERATION_STALE'
  );
  assert.equal(fixture.calls.some(({ sql }) => /^UPDATE posts/i.test(sql)), false);
  assert.equal(fixture.calls.some(({ sql }) => sql === 'ROLLBACK'), true);
});
