import { createHash } from 'node:crypto';
import { sanitizeArticleHtml } from './articleSanitizer.js';
import { validateArticle as defaultValidateArticle } from './articleValidator.js';
import { createContentRevisionRepository } from '../../repositories/contentRevisionRepository.js';
import { FaqItemSchema } from './articleSchemas.js';
import { normalizeInternalHref } from './trustedInternalLinkService.js';

const EDITABLE_FIELDS = Object.freeze([
  'title', 'excerpt', 'content', 'meta_title', 'meta_description',
  'og_title', 'og_description', 'faq_json', 'image_url', 'image_alt'
]);
const MAX_FIELD_LENGTHS = Object.freeze({
  title: 255,
  excerpt: 500,
  content: 250_000,
  meta_title: 255,
  meta_description: 500,
  og_title: 255,
  og_description: 500,
  image_url: 2_048,
  image_alt: 500
});

function revisionError(code, message, issues = []) {
  return Object.assign(new Error(message), { code, issues });
}

function normalizedTimestamp(value) {
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value || '') : date.toISOString();
}

function canonicalLiveState(post) {
  const fields = Object.fromEntries(EDITABLE_FIELDS.map((key) => [key, post?.[key] ?? (key === 'faq_json' ? [] : '')]));
  return {
    slug: String(post?.slug || ''),
    content_format: String(post?.content_format || 'legacy_ejs'),
    updated_at: normalizedTimestamp(post?.updated_at),
    fields
  };
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function liveHashForPost(post) {
  return createHash('sha256').update(stableJson(canonicalLiveState(post))).digest('hex');
}

export function createRevisionSnapshot(post) {
  const live = canonicalLiveState(post);
  return {
    version: 1,
    base: {
      slug: live.slug,
      content_format: live.content_format,
      updated_at: live.updated_at,
      live_hash: liveHashForPost(post)
    },
    fields: live.fields
  };
}

function normalizeAdmin(admin) {
  const id = Number(admin?.id);
  const username = String(admin?.username || '').trim().slice(0, 255);
  if (!Number.isSafeInteger(id) || id < 1 || !username) {
    throw revisionError('CONTENT_ACTION_VALIDATION_FAILED', 'Die Administrator-Zuordnung ist ungültig.');
  }
  return { id, username };
}

function positiveId(value, field) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw revisionError('CONTENT_ACTION_VALIDATION_FAILED', `${field} ist ungültig.`);
  }
  return id;
}

function parseFaq(value) {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(String(value || '[]'));
    if (Array.isArray(parsed)) return parsed;
  } catch { /* einheitlicher Fehler unten */ }
  throw revisionError('CONTENT_REVISION_VALIDATION_FAILED', 'Die FAQ-Daten sind ungültig.');
}

function normalizePatch(input = {}) {
  for (const forbidden of ['slug', 'published', 'published_at', 'workflow_status', 'content_format']) {
    if (Object.hasOwn(input, forbidden)) {
      throw revisionError('CONTENT_REVISION_VALIDATION_FAILED', `${forbidden} darf in einer Bestandsrevision nicht geändert werden.`);
    }
  }
  const patch = {};
  for (const key of EDITABLE_FIELDS) {
    if (!Object.hasOwn(input, key)) continue;
    if (key === 'faq_json') patch[key] = parseFaq(input[key]);
    else {
      const value = String(input[key] ?? '').replace(/\r\n?/g, '\n');
      if (value.length > MAX_FIELD_LENGTHS[key]) {
        throw revisionError('CONTENT_REVISION_VALIDATION_FAILED', `${key} ist zu lang.`);
      }
      patch[key] = value;
    }
  }
  return patch;
}

function assertRequiredFields(fields) {
  for (const key of ['title', 'excerpt', 'content', 'meta_title', 'meta_description', 'og_title', 'og_description', 'image_alt']) {
    const value = fields?.[key];
    if (typeof value !== 'string' || !value.trim() || value.length > MAX_FIELD_LENGTHS[key]) {
      throw revisionError('CONTENT_REVISION_VALIDATION_FAILED', `${key} fehlt oder ist ungültig.`);
    }
  }
  const faq = FaqItemSchema.array().min(5).max(7).safeParse(fields?.faq_json);
  if (!faq.success || faq.data.some((item) => item.question.length > 300 || item.answer.length > 5_000)) {
    throw revisionError('CONTENT_REVISION_VALIDATION_FAILED', 'Die FAQ müssen fünf bis sieben gültige, begrenzte Frage-Antwort-Objekte enthalten.');
  }
  const imageUrl = String(fields?.image_url || '').trim();
  if (!imageUrl || imageUrl.length > MAX_FIELD_LENGTHS.image_url) {
    throw revisionError('CONTENT_REVISION_VALIDATION_FAILED', 'Die Bild-URL ist nicht sicher freigegeben.');
  }
  let safeImage = false;
  if (imageUrl.startsWith('/')) {
    const normalized = normalizeInternalHref(imageUrl);
    safeImage = normalized.kind === 'internal'
      && normalized.path.startsWith('/uploads/')
      && !/[\s%\\]/.test(imageUrl);
  } else {
    try {
      const url = new URL(imageUrl);
      safeImage = url.protocol === 'https:' && !url.username && !url.password;
    } catch { safeImage = false; }
  }
  if (!safeImage) throw revisionError('CONTENT_REVISION_VALIDATION_FAILED', 'Die Bild-URL ist nicht sicher freigegeben.');
}

function validationArticle(snapshot) {
  return {
    title: snapshot.fields.title,
    shortDescription: snapshot.fields.excerpt,
    slug: snapshot.base.slug,
    metaTitle: snapshot.fields.meta_title,
    metaDescription: snapshot.fields.meta_description,
    ogTitle: snapshot.fields.og_title,
    ogDescription: snapshot.fields.og_description,
    imageAlt: snapshot.fields.image_alt,
    faqJson: snapshot.fields.faq_json,
    contentHtml: snapshot.fields.content
  };
}

async function assertSnapshotValid(snapshot, validateArticle, context = {}) {
  assertRequiredFields(snapshot?.fields);
  if (snapshot?.base?.content_format === 'legacy_ejs') return;
  if (snapshot?.base?.content_format !== 'static_html') {
    throw revisionError('CONTENT_REVISION_VALIDATION_FAILED', 'Das Inhaltsformat ist nicht freigegeben.');
  }
  const content = String(snapshot.fields?.content || '');
  const sanitized = sanitizeArticleHtml(content);
  if (sanitized !== content || /<%|%>/.test(content)) {
    throw revisionError('CONTENT_REVISION_VALIDATION_FAILED', 'Das Artikel-HTML enthält nicht erlaubte Inhalte.');
  }
  const validation = await validateArticle(validationArticle(snapshot), {
    ...context,
    existingSlugs: (context.existingSlugs || []).filter((slug) => slug !== snapshot.base.slug),
    allowedInternalLinks: Array.isArray(context.allowedInternalLinks) ? context.allowedInternalLinks : []
  });
  if (validation?.passed !== true || validation.sanitizedHtml !== content) {
    throw revisionError(
      'CONTENT_REVISION_VALIDATION_FAILED',
      'Die erneute Inhaltsprüfung ist fehlgeschlagen.',
      Array.isArray(validation?.issues) ? validation.issues : []
    );
  }
}

export function createContentRevisionService({
  repository = createContentRevisionRepository(),
  validateArticle = defaultValidateArticle
} = {}) {
  return {
    async enqueueAudit({ admin } = {}) {
      const normalizedAdmin = normalizeAdmin(admin);
      return repository.enqueueAuditJob({ admin: normalizedAdmin });
    },

    async createRevisionFromAudit({ postId, auditId, admin } = {}) {
      const normalizedAdmin = normalizeAdmin(admin);
      return repository.createRevisionFromAudit({
        postId: positiveId(postId, 'postId'),
        auditId: positiveId(auditId, 'auditId'),
        admin: normalizedAdmin,
        createSnapshot: createRevisionSnapshot
      });
    },

    async getRevisionForEdit(revisionId) {
      const revision = await repository.getRevisionForEdit(positiveId(revisionId, 'revisionId'));
      if (!revision) throw revisionError('CONTENT_REVISION_NOT_FOUND', 'Revision nicht gefunden.');
      return revision;
    },

    async renderRevisionEdit(revisionId, req, res) {
      const revision = await this.getRevisionForEdit(revisionId);
      return res.render('admin/contentAgent/revisionEdit', {
        revision,
        saved: req.query?.saved === '1'
      });
    },

    async updateRevision({ revisionId, input, admin } = {}) {
      const id = positiveId(revisionId, 'revisionId');
      normalizeAdmin(admin);
      const revision = await repository.getRevisionForEdit(id);
      if (!revision) throw revisionError('CONTENT_REVISION_NOT_FOUND', 'Revision nicht gefunden.');
      if (revision.status !== 'draft') throw revisionError('CONTENT_REVISION_CONFLICT', 'Nur Entwurfsrevisionen sind bearbeitbar.');
      const expectedVersion = Number(input?.revision_version);
      if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1 || expectedVersion !== Number(revision.revision_version)) {
        throw revisionError('CONTENT_REVISION_CONFLICT', 'Die Revision wurde in einem anderen Browserfenster verändert.');
      }
      const snapshot = structuredClone(revision.snapshot_json);
      const patch = normalizePatch(input);
      if (snapshot.base.content_format === 'legacy_ejs'
          && Object.hasOwn(patch, 'content')
          && patch.content !== snapshot.fields.content) {
        throw revisionError('CONTENT_REVISION_VALIDATION_FAILED', 'Legacy-EJS-Inhalt bleibt unveränderlich.');
      }
      Object.assign(snapshot.fields, patch);
      await assertSnapshotValid(snapshot, validateArticle, revision.validation_context || {});
      const updated = await repository.updateDraftRevision({ revisionId: id, snapshot, expectedVersion });
      if (!updated) throw revisionError('CONTENT_REVISION_CONFLICT', 'Die Revision wurde zwischenzeitlich verändert.');
      return updated;
    },

    async approveRevision({ revisionId, confirmed, admin } = {}) {
      if (confirmed !== true) throw revisionError('CONTENT_CONFIRMATION_REQUIRED', 'Die erforderliche Bestätigung fehlt.');
      const id = positiveId(revisionId, 'revisionId');
      const normalizedAdmin = normalizeAdmin(admin);
      return repository.approveRevisionTransaction({
        revisionId: id,
        admin: normalizedAdmin,
        currentHash: liveHashForPost,
        validateSnapshot: (snapshot, context) => assertSnapshotValid(snapshot, validateArticle, context)
      });
    }
  };
}
