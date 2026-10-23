const OPAQUE_PREFIXES = ['/admin', '/api', '/auth', '/webhook', '/uploads', '/assets', '/images', '/js', '/css', '/fonts', '/create-checkout-session'];
const matchesPrefix = (path, prefix) => path === prefix || path.startsWith(`${prefix}/`);

export function canonicalPublicPath(path = '/') {
  if (OPAQUE_PREFIXES.some(prefix => matchesPrefix(path.toLowerCase(), prefix)) || /\.[a-z0-9]{2,8}$/i.test(path)) return path;
  const collapsed = path.replace(/\/{2,}/g, '/').replace(/\/+$/, '') || '/';
  const normalized = /^\/blog\//i.test(collapsed)
    ? `/blog/${collapsed.slice('/blog/'.length)}`
    : collapsed.toLowerCase();
  return normalized === '/de' ? '/' : normalized;
}

export function shouldNoindexPublicPath(path = '/') {
  return ['/booking', '/en/booking', '/return_policy', '/demo', '/swipeandcook-datenschutz', '/swipeandcook-nutzungsbedingungen', '/swipeandcook-support', '/swipeandcook-konto-loeschen']
    .some(prefix => matchesPrefix(path, prefix))
    || /^\/en\/webdesign-berlin\/[^/]+$/.test(path);
}

export function publicSeoMiddleware(req, res, next) {
  const raw = req.originalUrl || req.url || '/';
  const queryIndex = raw.indexOf('?');
  const path = queryIndex < 0 ? raw : raw.slice(0, queryIndex);
  const query = queryIndex < 0 ? '' : raw.slice(queryIndex);
  const normalized = canonicalPublicPath(path);
  if (shouldNoindexPublicPath(normalized)) res.setHeader('X-Robots-Tag', 'noindex, follow');
  if (['GET', 'HEAD'].includes(req.method) && normalized !== path) return res.redirect(301, `${normalized}${query}`);
  return next();
}
