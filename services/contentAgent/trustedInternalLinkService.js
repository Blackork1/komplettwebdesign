const CORE_INTERNAL_PATHS = Object.freeze([
  '/kontakt', '/pakete', '/webdesign-berlin', '/blog', '/ratgeber', '/leistungen', '/branchen'
]);
const CANONICAL_HOSTS = new Set(['komplettwebdesign.de', 'www.komplettwebdesign.de']);

function normalizedPath(url) {
  const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/g, '') : '/';
  return path;
}

export function normalizeInternalHref(value) {
  const original = typeof value === 'string' ? value : '';
  const href = original.trim();
  if (!href) return { kind: 'invalid', href };
  if (href !== original || href.startsWith('//') || href.includes('\\')) return { kind: 'unsafe', href };
  try {
    const rootRelative = href.startsWith('/');
    const rawPath = href.split(/[?#]/, 1)[0];
    if (/%(?:2e|2f|5c|40)/i.test(rawPath)) return { kind: 'unsafe', href };
    const url = rootRelative ? new URL(href, 'https://www.komplettwebdesign.de') : new URL(href);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return { kind: 'unsafe', href };
    if (!CANONICAL_HOSTS.has(url.hostname.toLocaleLowerCase('en-US'))) {
      return { kind: 'external', href };
    }
    return { kind: 'internal', href, path: normalizedPath(url) };
  } catch {
    return { kind: 'unsafe', href };
  }
}

export function normalizeTrustedInternalPaths(values = []) {
  return new Set((Array.isArray(values) ? values : [])
    .map((value) => normalizeInternalHref(typeof value === 'string' ? value : value?.url))
    .filter(({ kind }) => kind === 'internal')
    .map(({ path }) => path));
}

export function buildTrustedInternalPaths(inventory = []) {
  const paths = new Set(CORE_INTERNAL_PATHS);
  for (const item of Array.isArray(inventory) ? inventory : []) {
    const direct = item?.url ?? item?.path ?? item?.href;
    const normalized = normalizeInternalHref(direct);
    if (normalized.kind === 'internal') paths.add(normalized.path);
    const slug = typeof item?.slug === 'string' ? item.slug.replace(/^\/+|\/+$/g, '') : '';
    if (!slug) continue;
    const prefix = item.type === 'guide' ? '/ratgeber/'
      : item.type === 'service' ? '/leistungen/'
        : item.type === 'industry' ? '/branchen/' : '/blog/';
    paths.add(`${prefix}${slug}`);
  }
  return [...paths].sort();
}
