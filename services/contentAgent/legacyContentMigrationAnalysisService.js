import { createHash } from 'node:crypto';
import { isoOffset } from '../../util/date.js';
import { liveHashForContentPost } from './contentPostLiveState.js';

function analysisError(code, message) {
  return Object.assign(new Error(message), { code });
}

function issue(code, message, details = {}) {
  return { code, message, details };
}

function uniqueIssues(items) {
  return [...new Map(items.map((item) => [
    `${item.code}:${JSON.stringify(item.details || {})}`,
    item
  ])).values()];
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function hashJson(value) {
  return createHash('sha256').update(stableJson(value)).digest('hex');
}

export function createLegacyContentMigrationAnalysisService({
  normalizer,
  strictRenderer,
  buildRenderLocals
}) {
  return {
    analyzePost({ post, pricing = {}, allowedInternalLinks = [] }) {
      if (post?.published !== true || post?.content_format !== 'legacy_ejs') {
        throw analysisError(
          'CONTENT_LEGACY_MIGRATION_NOT_AVAILABLE',
          'Der Artikel ist kein veröffentlichter Legacy-Artikel.'
        );
      }

      const sourceContent = String(post.content || '');
      const migrationClass = /<%[=-]?|%>/.test(sourceContent)
        ? 'active_ejs'
        : 'static_legacy';
      const baseLiveHash = liveHashForContentPost(post);
      const blockingIssues = [];

      if (post.has_draft_revision === true) {
        blockingIssues.push(issue(
          'legacy_open_revision',
          'Eine offene Revision blockiert die Migration.'
        ));
      }
      if (post.has_active_optimization === true) {
        blockingIssues.push(issue(
          'legacy_active_optimization',
          'Ein offener Optimierungsauftrag blockiert die Migration.'
        ));
      }

      let rendered = sourceContent;
      if (migrationClass === 'active_ejs') {
        try {
          rendered = strictRenderer({
            template: sourceContent,
            locals: buildRenderLocals({
              post,
              publishedISO: isoOffset(post.published_at || post.created_at),
              modifiedISO: isoOffset(post.updated_at || post.created_at)
            })
          });
        } catch {
          blockingIssues.push(issue(
            'legacy_ejs_render_failed',
            'Das aktive EJS konnte nicht sicher aufgelöst werden.'
          ));
          rendered = '';
        }
      }

      const normalized = normalizer({
        html: rendered,
        faqJson: post.faq_json,
        allowedInternalLinks
      });
      blockingIssues.push(...normalized.report.blockers);

      const normalizedHtml = String(normalized.html || '');
      const candidateHash = createHash('sha256')
        .update(normalizedHtml)
        .digest('hex');
      const context = {
        version: 1,
        locale: 'de_DE',
        normalizerVersion: 1,
        pricingHash: hashJson(pricing)
      };

      return {
        postId: Number(post.id),
        migrationClass,
        status: blockingIssues.length === 0 ? 'ready' : 'blocked',
        baseLiveHash,
        sourceContent,
        renderedStaticHtml: normalizedHtml || null,
        renderContext: context,
        analysis: {
          version: 1,
          ejsCount: (sourceContent.match(/<%/g) || []).length,
          sourceBytes: Buffer.byteLength(sourceContent),
          candidateBytes: Buffer.byteLength(normalizedHtml),
          candidateHash,
          warnings: normalized.report.warnings
        },
        blockingIssues: uniqueIssues(blockingIssues),
        sanitizerReport: normalized.report
      };
    }
  };
}
