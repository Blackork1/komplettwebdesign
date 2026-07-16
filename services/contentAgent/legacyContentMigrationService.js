import { renderPricingTokens } from '../../util/pricingTokenRenderer.js';
import { sanitizeArticleHtml } from './articleSanitizer.js';
import { liveHashForContentPost } from './contentPostLiveState.js';

function serviceError(code, message = 'Legacy-Migration nicht verfügbar.') {
  return Object.assign(new Error(message), { code });
}

async function mapWithConcurrency(values, concurrency, mapper) {
  const source = Array.from(values || []);
  const results = new Array(source.length);
  let cursor = 0;

  async function worker() {
    while (cursor < source.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(source[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, source.length) }, () => worker())
  );
  return results;
}

function aggregateBatchResults(results) {
  const summary = { migrated: 0, skipped: 0, blocked: 0, failed: 0 };
  for (const result of results) {
    if (result?.status === 'migrated') summary.migrated += 1;
    else if (['stale', 'already_migrated'].includes(result?.status)) summary.skipped += 1;
    else if (result?.status === 'blocked') summary.blocked += 1;
    else summary.failed += 1;
  }
  return summary;
}

function buildDashboard(rows) {
  const source = Array.from(rows || []);
  return {
    totalCount: new Set(source.map(({ post_id }) => Number(post_id))).size,
    readyStatic: source.filter(({ status, migration_class: migrationClass }) => (
      status === 'ready' && migrationClass === 'static_legacy'
    )),
    reviewRequired: source.filter(({ status, migration_class: migrationClass }) => (
      status === 'ready' && migrationClass === 'active_ejs'
    )),
    blocked: source.filter(({ status }) => status === 'blocked'),
    migrated: source.filter(({ status }) => status === 'migrated'),
    lastScanAt: source
      .filter(({ status }) => ['ready', 'blocked', 'scanned'].includes(status))
      .map(({ created_at: createdAt }) => createdAt)
      .sort()
      .at(-1) || null
  };
}

export function createLegacyContentMigrationService({
  repository,
  analysisService,
  blogPostPresentation
}) {
  return {
    async scan({ admin, pricing, allowedInternalLinks }) {
      const posts = await repository.listScanCandidates();
      const results = await mapWithConcurrency(posts, 3, async (post) => {
        const result = analysisService.analyzePost({
          post,
          pricing,
          allowedInternalLinks
        });
        await repository.saveScanResult({ admin, result });
        return result;
      });
      return {
        scanned: results.length,
        ready: results.filter(({ status }) => status === 'ready').length,
        blocked: results.filter(({ status }) => status === 'blocked').length
      };
    },

    async getDashboard() {
      return buildDashboard(await repository.listDashboardRows());
    },

    async getPreview({ migrationId, pricing, canonicalBaseUrl }) {
      const record = await repository.getMigrationForPreview(migrationId);
      if (!record) {
        throw serviceError(
          'CONTENT_LEGACY_MIGRATION_NOT_FOUND',
          'Legacy-Migration nicht gefunden.'
        );
      }
      if (!record.post) {
        throw serviceError(
          'CONTENT_LEGACY_MIGRATION_INVALID',
          'Die gespeicherte Legacy-Migration enthält keinen Artikelstand.'
        );
      }

      const currentHash = liveHashForContentPost(record.post);
      const stale = currentHash !== record.base_live_hash;
      const currentModel = blogPostPresentation.buildBlogPostPageModel({
        post: record.post,
        pricing,
        canonicalBaseUrl,
        previewMode: false
      });
      const rawCandidate = String(record.rendered_static_html || '');
      if (/<%[=-]?|%>/.test(rawCandidate)) {
        throw serviceError(
          'CONTENT_LEGACY_MIGRATION_INVALID',
          'Der statische Migrationskandidat enthält weiterhin EJS.'
        );
      }
      const candidateHtml = sanitizeArticleHtml(
        renderPricingTokens(rawCandidate, pricing)
      );
      if (/<%[=-]?|%>/.test(candidateHtml)) {
        throw serviceError(
          'CONTENT_LEGACY_MIGRATION_INVALID',
          'Der statische Migrationskandidat enthält weiterhin EJS.'
        );
      }
      return {
        id: record.id,
        postId: record.post_id,
        title: record.post.title,
        slug: record.post.slug,
        status: stale ? 'stale' : record.status,
        migrationClass: record.migration_class,
        currentHtml: sanitizeArticleHtml(currentModel.renderedContent),
        candidateHtml,
        analysis: record.analysis_json,
        blockingIssues: record.blocking_issues_json,
        sanitizerReport: record.sanitizer_report_json,
        canMigrate: !stale && record.status === 'ready'
      };
    },

    async migrateOne({ migrationId, admin }) {
      return repository.migrateOne({ migrationId, admin });
    },

    async migrateSafeBatch({ admin }) {
      const ids = await repository.listReadyStaticLegacyIds();
      return aggregateBatchResults(
        await mapWithConcurrency(ids, 1, async (migrationId) => {
          try {
            return await repository.migrateOne({ migrationId, admin });
          } catch (error) {
            if (error.code === 'CONTENT_LEGACY_MIGRATION_CONFLICT') {
              return { status: 'blocked' };
            }
            return { status: 'failed' };
          }
        })
      );
    },

    async rollback({ migrationId, admin }) {
      return repository.rollbackOne({ migrationId, admin });
    }
  };
}
