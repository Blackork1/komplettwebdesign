import { SourceReferenceSchema } from './articleSchemas.js';
import { normalizeSafeHttpsUrl } from './httpsUrlSafety.js';

export function normalizeExistingPostRevisionSources(report) {
  const parsed = SourceReferenceSchema.array().max(6).safeParse(report?.sources ?? []);
  if (!parsed.success) return null;
  const normalized = parsed.data.map((source) => {
    const url = normalizeSafeHttpsUrl(source.url);
    return url ? { ...source, url } : null;
  });
  return normalized.every(Boolean) ? normalized : null;
}
