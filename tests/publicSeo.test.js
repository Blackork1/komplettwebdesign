import test from 'node:test';
import assert from 'node:assert/strict';

// Missing normalization creates indexable duplicates; redirecting opaque paths would break assets or POSTs.
test('public path normalization preserves queries and opaque routes', async () => {
  const { canonicalPublicPath } = await import('../middleware/publicSeo.js');
  for (const [input, expected] of [
    ['/leistungen/', '/leistungen'], ['/ABOUT', '/about'], ['//kontakt///', '/kontakt'], ['/de', '/'],
    ['/blog/Scoll-Snapp-Galery-&-Zoom%E2%80%91on%E2%80%91View', '/blog/Scoll-Snapp-Galery-&-Zoom%E2%80%91on%E2%80%91View'],
    ['/images/LogoTransparent.webp', '/images/LogoTransparent.webp'], ['/admin/Page/', '/admin/Page/'], ['/api/Consent', '/api/Consent']
  ]) assert.equal(canonicalPublicPath(input), expected);
});

test('public SEO middleware redirects GET, preserves query, and never redirects POST', async () => {
  const { publicSeoMiddleware } = await import('../middleware/publicSeo.js');
  let redirect;
  const res = { redirect: (status, target) => { redirect = [status, target]; }, setHeader() {} };
  publicSeoMiddleware({ method: 'GET', originalUrl: '/ABOUT/?ref=Test', path: '/ABOUT/' }, res, () => {});
  assert.deepEqual(redirect, [301, '/about?ref=Test']);
  redirect = null;
  let continued = false;
  publicSeoMiddleware({ method: 'POST', originalUrl: '/ABOUT/', path: '/ABOUT/' }, res, () => { continued = true; });
  assert.equal(redirect, null);
  assert.equal(continued, true);
});

test('utility pages and untranslated districts emit noindex including static demo HTML', async () => {
  const { publicSeoMiddleware } = await import('../middleware/publicSeo.js');
  for (const path of ['/demo/cq-compare', '/booking', '/en/booking', '/en/booking/thankyou', '/return_policy', '/swipeandcook-support', '/en/webdesign-berlin/mitte']) {
    const headers = {};
    publicSeoMiddleware({ method: 'GET', path, originalUrl: path }, { setHeader: (k,v) => { headers[k] = v; }, redirect() {} }, () => {});
    assert.match(headers['X-Robots-Tag'] || '', /noindex/, path);
  }
});
