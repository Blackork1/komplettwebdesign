import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('admin import routers require admin auth before upload handlers', () => {
  const industries = read('routes/adminIndustries.js');
  assert.match(industries, /import\s+\{\s*isAdmin\s*\}/);
  assert.match(industries, /r\.use\(isAdmin\)/);

  const leistungen = read('routes/adminLeistungenRoutes.js');
  assert.match(leistungen, /import\s+\{\s*isAdmin\s*\}/);
  assert.match(
    leistungen,
    /router\.post\('\/admin\/leistungen-pages\/import\/file',\s*isAdmin,\s*upload\.single\('file'\)/
  );

  const components = read('routes/adminComponents.js');
  assert.doesNotMatch(components, /upload\.single\('imageFile'\),\s*isAdmin/);
  assert.match(components, /isAdmin,\s*upload\.single\('imageFile'\)/);
});

test('webhook raw body route is mounted before global body parsers', () => {
  const index = read('index.js');
  assert.ok(index.indexOf("app.use('/webhook', webhookRoutes)") < index.indexOf('app.use(express.json())'));
});

test('docker build context excludes local secrets and runtime artifacts', () => {
  const dockerignore = read('.dockerignore');
  assert.match(dockerignore, /^\.env(?:\r?\n|$)/m);
  assert.match(dockerignore, /^\.git(?:\r?\n|$)/m);
  assert.match(dockerignore, /^node_modules(?:\r?\n|$)/m);
  assert.match(dockerignore, /^uploads(?:\r?\n|$)/m);
});

test('HTML and JSON-LD helpers neutralize active content while keeping safe markup', async () => {
  const { sanitizeHtml, escapeJsonForHtml, safeComponentTag, safeUrl } = await import('../util/security.js');

  const html = sanitizeHtml('<p onclick="alert(1)">Hallo <strong>Welt</strong><script>alert(1)</script><a href="javascript:alert(1)">x</a><a href="/kontakt">ok</a></p>');
  assert.equal(html.includes('<script'), false);
  assert.equal(html.includes('onclick'), false);
  assert.equal(html.includes('javascript:'), false);
  assert.match(html, /<strong>Welt<\/strong>/);
  assert.match(html, /href="\/kontakt"/);

  const json = escapeJsonForHtml({ name: '</script><script>alert(1)</script>' });
  assert.equal(json.includes('</script>'), false);
  assert.equal(JSON.parse(json).name, '</script><script>alert(1)</script>');

  assert.equal(safeUrl('javascript:alert(1)'), '#');
  assert.equal(safeUrl('/kontakt'), '/kontakt');
  assert.equal(safeUrl('https://example.com/a'), 'https://example.com/a');
  assert.equal(safeComponentTag('form'), 'form');
  assert.equal(safeComponentTag('input'), 'input');
  assert.equal(safeComponentTag('script'), 'div');
});

test('industry imports reject unknown SQL identifier keys', async () => {
  const { __testables } = await import('../controllers/adminIndustriesController.js');
  assert.throws(
    () => __testables.normalizeIndustryPayload({ name: 'Test', 'bad"field': 'x' }),
    /Unbekanntes Feld|unknown field/i
  );
});

test('public meta audit result does not expose internal guide body text', async () => {
  const { __testables } = await import('../services/metaAuditService.js');
  const publicResult = __testables.buildPublicResult({
    auditId: 'audit-test',
    locale: 'de',
    requestedUrl: 'https://example.com/',
    finalUrl: 'https://example.com/',
    homepage: {
      score: 80,
      categories: [],
      topFindings: [],
      topActions: [],
      pageGuideInput: { bodyText: 'secret body text' }
    },
    crawl: { visitedPages: 1, failedPages: 0 },
    maxSubpages: 0,
    discoveredSubpages: [],
    context: {}
  });

  assert.equal(publicResult.homepage.pageGuideInput, undefined);
  assert.equal(JSON.stringify(publicResult).includes('secret body text'), false);
});

test('safe HTTP helper rejects loopback and private network targets', async () => {
  const { assertPublicHttpUrl } = await import('../util/safeHttpClient.js');
  await assert.rejects(() => assertPublicHttpUrl('http://127.0.0.1/'), /private|unsafe|loopback/i);
  await assert.rejects(() => assertPublicHttpUrl('http://169.254.169.254/'), /private|unsafe|link/i);
});

test('production checkout base URL must come from BASE_URL', async () => {
  const { resolveBaseUrl } = await import('../util/resolveBaseUrl.js');
  const oldNodeEnv = process.env.NODE_ENV;
  const oldBaseUrl = process.env.BASE_URL;
  try {
    process.env.NODE_ENV = 'production';
    delete process.env.BASE_URL;
    assert.throws(
      () => resolveBaseUrl({
        protocol: 'https',
        headers: { 'x-forwarded-host': 'evil.example', 'x-forwarded-proto': 'https' },
        get: () => 'komplettwebdesign.de'
      }),
      /BASE_URL/i
    );
  } finally {
    process.env.NODE_ENV = oldNodeEnv;
    if (oldBaseUrl === undefined) delete process.env.BASE_URL;
    else process.env.BASE_URL = oldBaseUrl;
  }
});
