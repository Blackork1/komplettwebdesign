import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { auditSeoRecoverySite } from '../services/seoRecoveryAuditService.js';

const execFileAsync = promisify(execFile);

function response(body, status = 200, headers = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: new Headers(headers),
    async text() { return body; }
  };
}

test('Audit meldet Canonical-, H1-, Redirect- und Inlinkfehler', async () => {
  const sitemap = `<?xml version="1.0"?><urlset>
    <url><loc>https://example.test/</loc></url>
    <url><loc>https://example.test/webdesign-berlin</loc></url>
  </urlset>`;
  const pages = new Map([
    ['https://example.test/sitemap.xml', response(sitemap)],
    ['https://example.test/', response(`
      <html lang="de"><head><title>Kurzer Titel</title>
      <meta name="description" content="Zu kurz">
      <link rel="canonical" href="https://example.test/falsch"></head>
      <body><h1>Start</h1><h1>Doppelt</h1></body></html>
    `)],
    ['https://example.test/webdesign-berlin', response(`
      <html lang="de"><head><title>Website erstellen lassen Berlin | Webdesign</title>
      <meta name="description" content="${'a'.repeat(130)}">
      <link rel="canonical" href="https://example.test/webdesign-berlin"></head>
      <body><h1>Website erstellen lassen in Berlin</h1></body></html>
    `)]
  ]);

  const report = await auditSeoRecoverySite({
    baseUrl: 'https://example.test',
    fetchImpl: async (url) => pages.get(String(url)) || response('', 404),
    targets: [{
      path: '/webdesign-berlin',
      state: 'active',
      requiredLinks: ['/pakete', '/referenzen']
    }]
  });

  assert.ok(report.violations.some((item) => item.code === 'canonical_mismatch'));
  assert.ok(report.violations.some((item) => item.code === 'h1_count'));
  assert.ok(report.violations.some((item) => item.code === 'missing_required_link'));
});

test('Audit dedupliziert Sitemap-Seiten und zählt Inlinks von anderen Sitemap-Seiten', async () => {
  const sitemap = `<?xml version="1.0"?><urlset>
    <url><loc>https://example.test/</loc></url>
    <url><loc>https://example.test/webdesign-berlin</loc></url>
    <url><loc>https://example.test/webdesign-berlin</loc></url>
  </urlset>`;
  const pages = new Map([
    ['https://example.test/sitemap.xml', response(sitemap)],
    ['https://example.test/', response(`
      <html lang="de"><head><title>Komplett Webdesign Berlin | Website erstellen lassen</title>
      <meta name="description" content="${'a'.repeat(130)}"><link rel="canonical" href="https://example.test/"></head>
      <body><h1>Komplett Webdesign Berlin</h1><a href="/webdesign-berlin">Webdesign Berlin</a></body></html>
    `)],
    ['https://example.test/webdesign-berlin', response(`
      <html lang="de"><head><title>Website erstellen lassen in Berlin | Komplett Webdesign</title>
      <meta name="description" content="${'a'.repeat(130)}"><link rel="canonical" href="https://example.test/webdesign-berlin"></head>
      <body><h1>Website erstellen lassen in Berlin</h1></body></html>
    `)]
  ]);

  const report = await auditSeoRecoverySite({
    baseUrl: 'https://example.test',
    fetchImpl: async (url) => pages.get(String(url)) || response('', 404),
    targets: [{ path: '/webdesign-berlin', state: 'active', priority: 'A', requiredLinks: [] }]
  });

  assert.equal(report.pages.length, 2);
  assert.equal(report.summary.pages, 2);
  assert.deepEqual(
    report.inlinks.find((item) => item.path === '/webdesign-berlin'),
    { path: '/webdesign-berlin', url: 'https://example.test/webdesign-berlin', count: 1, sources: ['https://example.test/'] }
  );
  assert.equal(report.violations.some((item) => item.code === 'orphan_priority_page'), false);
});

test('Audit prüft Redirect-Quellen, Ketten und Zielstatus separat', async () => {
  const pages = new Map([
    ['https://example.test/sitemap.xml', response('<?xml version="1.0"?><urlset></urlset>')],
    ['https://example.test/alt', response('', 301, { location: '/zwischen' })],
    ['https://example.test/indexierbar', response(`
      <html lang="de"><head><title>Indexierbare alte Seite mit vollständigem Titel</title>
      <meta name="description" content="${'a'.repeat(130)}"></head><body><h1>Alte Seite</h1></body></html>
    `)],
    ['https://example.test/neu', response('', 404)]
  ]);

  const report = await auditSeoRecoverySite({
    baseUrl: 'https://example.test',
    fetchImpl: async (url) => pages.get(String(url)) || response('', 404),
    targets: [
      { path: '/alt', state: 'redirect', redirectTo: '/neu', requiredLinks: [] },
      { path: '/indexierbar', state: 'redirect', redirectTo: '/neu', requiredLinks: [] }
    ]
  });

  assert.equal(report.redirects.length, 2);
  assert.ok(report.violations.some((item) => item.code === 'redirect_chain' && item.path === '/alt'));
  assert.ok(report.violations.some((item) => item.code === 'redirect_target_status' && item.path === '/alt'));
  assert.ok(report.violations.some((item) => item.code === 'indexable_redirect_source' && item.path === '/indexierbar'));
});

test('Audit behandelt rechtliche Metadaten tolerant und markiert unpassende Sprache als Warnung', async () => {
  const sitemap = `<?xml version="1.0"?><urlset>
    <url><loc>https://example.test/impressum</loc></url>
    <url><loc>https://example.test/angebot</loc></url>
  </urlset>`;
  const pages = new Map([
    ['https://example.test/sitemap.xml', response(sitemap)],
    ['https://example.test/impressum', response(`
      <html lang="de"><head><title>Impressum</title><meta name="description" content="Rechtliches">
      <link rel="canonical" href="https://example.test/impressum"></head><body><h1>Impressum</h1></body></html>
    `)],
    ['https://example.test/angebot', response(`
      <html lang="fr"><head><title>Notre offre numérique complète à Berlin aujourd'hui</title>
      <meta name="description" content="${'a'.repeat(130)}"><link rel="canonical" href="https://example.test/angebot"></head>
      <body><h1>Notre offre</h1></body></html>
    `)]
  ]);

  const report = await auditSeoRecoverySite({
    baseUrl: 'https://example.test',
    fetchImpl: async (url) => pages.get(String(url)) || response('', 404),
    targets: []
  });

  const legalWarnings = report.violations.filter((item) => item.path === '/impressum');
  assert.equal(legalWarnings.some((item) => item.code === 'title_length'), false);
  assert.equal(legalWarnings.some((item) => item.code === 'description_length'), false);
  assert.ok(report.violations.some((item) => item.code === 'mixed_language' && item.path === '/angebot'));
});

test('CLI schreibt den Audit-Bericht und erlaubt Fehler mit fail-on none', async (t) => {
  let baseUrl = '';
  const server = http.createServer((request, response) => {
    if (request.url === '/sitemap.xml') {
      response.end(`<?xml version="1.0"?><urlset><url><loc>${baseUrl}/</loc></url></urlset>`);
      return;
    }
    response.end(`
      <html lang="de"><head><title>Komplett Webdesign Berlin | Website erstellen lassen</title>
      <meta name="description" content="${'a'.repeat(130)}"><link rel="canonical" href="${baseUrl}/"></head>
      <body><h1>Komplett Webdesign Berlin</h1></body></html>
    `);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
  const reportDirectory = await mkdtemp(path.join(os.tmpdir(), 'seo-recovery-audit-'));
  const reportPath = path.join(reportDirectory, 'audit.json');

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(reportDirectory, { recursive: true, force: true });
  });

  const { stdout } = await execFileAsync('node', [
    'scripts/seoRecoveryAudit.js',
    '--base-url', baseUrl,
    '--out', reportPath,
    '--fail-on', 'none'
  ], { cwd: process.cwd() });
  const report = JSON.parse(await readFile(reportPath, 'utf8'));

  assert.match(stdout, /"pages":1/);
  assert.equal(report.summary.pages, 1);
  assert.ok(report.summary.errors > 0);
});
