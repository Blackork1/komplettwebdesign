const CORE_INTERNAL_PATHS = Object.freeze([
  '/kontakt', '/pakete', '/webdesign-berlin', '/blog', '/ratgeber', '/leistungen', '/branchen'
]);

export function normalizeInternalHref(value) {
  const href = typeof value === 'string' ? value.trim() : '';
  if (!href) return { kind: 'invalid', href };
  if (href.startsWith('//')) return { kind: 'unsafe', href };
  if (!href.startsWith('/')) {
    try {
      const url = new URL(href);
      return /^https?:$/.test(url.protocol) ? { kind: 'external', href } : { kind: 'unsafe', href };
    } catch {
      return { kind: 'unsafe', href };
    }
  }
  try {
    const url = new URL(href, 'https://www.komplettwebdesign.de');
    if (url.origin !== 'https://www.komplettwebdesign.de') return { kind: 'unsafe', href };
    const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/g, '') : '/';
    return { kind: 'internal', href, path };
  } catch {
    return { kind: 'unsafe', href };
  }
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
