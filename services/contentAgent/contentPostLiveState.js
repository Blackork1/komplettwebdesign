import { createHash } from 'node:crypto';

const EDITABLE_FIELDS = Object.freeze([
  'title',
  'excerpt',
  'content',
  'meta_title',
  'meta_description',
  'og_title',
  'og_description',
  'faq_json',
  'image_url',
  'image_alt'
]);

function normalizedTimestamp(value) {
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value || '') : date.toISOString();
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

export function canonicalContentPostLiveState(post) {
  return {
    slug: String(post?.slug || ''),
    content_format: String(post?.content_format || 'legacy_ejs'),
    updated_at: normalizedTimestamp(post?.updated_at),
    fields: Object.fromEntries(
      EDITABLE_FIELDS.map((key) => [
        key,
        post?.[key] ?? (key === 'faq_json' ? [] : '')
      ])
    )
  };
}

export function liveHashForContentPost(post) {
  return createHash('sha256')
    .update(stableJson(canonicalContentPostLiveState(post)))
    .digest('hex');
}
