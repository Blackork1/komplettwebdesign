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

function validPage({
  path = '/',
  title = 'Eindeutiger Seitentitel für den SEO-Recovery-Audit',
  description = 'Eine eindeutige Meta-Description mit genügend aussagekräftigem Inhalt für den reproduzierbaren SEO-Recovery-Audit.',
  lang = 'de',
  head = '',
  body = ''
} = {}) {
  return `
    <html lang="${lang}"><head>
      <title>${title}</title>
      <meta name="description" content="${description}">
      <link rel="canonical" href="https://example.test${path}">
      ${head}
    </head><body><h1>Seitentitel</h1>${body}</body></html>
  `;
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

test('Audit meldet fehlende Metadaten auch auf Rechtsseiten als Fehler', async () => {
  const sitemap = '<?xml version="1.0"?><urlset><url><loc>https://example.test/impressum</loc></url></urlset>';
  const pages = new Map([
    ['https://example.test/sitemap.xml', response(sitemap)],
    ['https://example.test/impressum', response(`
      <html lang="de"><head>
      <link rel="canonical" href="https://example.test/impressum"></head>
      <body><h1>Impressum</h1></body></html>
    `)]
  ]);

  const report = await auditSeoRecoverySite({
    baseUrl: 'https://example.test',
    fetchImpl: async (url) => pages.get(String(url)) || response('', 404),
    targets: []
  });

  assert.ok(report.violations.some((item) => (
    item.code === 'title_missing'
    && item.path === '/impressum'
    && item.severity === 'error'
  )));
  assert.ok(report.violations.some((item) => (
    item.code === 'description_missing'
    && item.path === '/impressum'
    && item.severity === 'error'
  )));
});

test('Audit meldet einen direkten 302-Redirect als fehlerhafte Redirect-Kette', async () => {
  const pages = new Map([
    ['https://example.test/sitemap.xml', response('<?xml version="1.0"?><urlset></urlset>')],
    ['https://example.test/alt', response('', 302, { location: '/neu' })],
    ['https://example.test/neu', response('<html></html>')]
  ]);

  const report = await auditSeoRecoverySite({
    baseUrl: 'https://example.test',
    fetchImpl: async (url) => pages.get(String(url)) || response('', 404),
    targets: [{ path: '/alt', state: 'redirect', redirectTo: '/neu', requiredLinks: [] }]
  });

  assert.ok(report.violations.some((item) => item.code === 'redirect_chain' && item.path === '/alt'));
});

test('Audit meldet noindex auf einer aktiven deutschen Zielseite als Fehler', async () => {
  const sitemap = '<?xml version="1.0"?><urlset><url><loc>https://example.test/pakete</loc></url></urlset>';
  const pages = new Map([
    ['https://example.test/sitemap.xml', response(sitemap)],
    ['https://example.test/pakete', response(`
      <html lang="de"><head><title>Webdesign-Pakete für Unternehmen in Berlin</title>
      <meta name="description" content="${'a'.repeat(130)}"><meta name="robots" content="noindex,follow">
      <link rel="canonical" href="https://example.test/pakete"></head>
      <body><h1>Webdesign-Pakete</h1></body></html>
    `)]
  ]);

  const report = await auditSeoRecoverySite({
    baseUrl: 'https://example.test',
    fetchImpl: async (url) => pages.get(String(url)) || response('', 404),
    targets: [{ path: '/pakete', state: 'active', requiredLinks: [] }]
  });

  assert.ok(report.violations.some((item) => item.code === 'noindex_active_target' && item.severity === 'error'));
});

test('Audit erlaubt noindex auf den definierten englischen Paketseiten', async () => {
  const sitemap = '<?xml version="1.0"?><urlset><url><loc>https://example.test/en/pakete</loc></url></urlset>';
  const pages = new Map([
    ['https://example.test/sitemap.xml', response(sitemap)],
    ['https://example.test/en/pakete', response(`
      <html lang="en"><head><title>Website packages for small businesses in Berlin</title>
      <meta name="description" content="${'a'.repeat(130)}"><meta name="robots" content="noindex,follow">
      <link rel="canonical" href="https://example.test/en/pakete"></head>
      <body><h1>Website packages</h1><p>Clear packages for small businesses in Berlin.</p></body></html>
    `)]
  ]);

  const report = await auditSeoRecoverySite({
    baseUrl: 'https://example.test',
    fetchImpl: async (url) => pages.get(String(url)) || response('', 404),
    targets: [{ path: '/en/pakete', state: 'active', requiredLinks: [] }]
  });

  assert.equal(report.violations.some((item) => item.code === 'noindex_active_target'), false);
});

test('Audit warnt bei deutschem Inhalt auf einer englischen Paketseite', async () => {
  const sitemap = '<?xml version="1.0"?><urlset><url><loc>https://example.test/en/pakete</loc></url></urlset>';
  const pages = new Map([
    ['https://example.test/sitemap.xml', response(sitemap)],
    ['https://example.test/en/pakete', response(`
      <html lang="en"><head><title>Website packages for small businesses in Berlin</title>
      <meta name="description" content="${'a'.repeat(130)}"><meta name="robots" content="noindex,follow">
      <link rel="canonical" href="https://example.test/en/pakete"></head>
      <body><h1>Website packages</h1>
      <p>Unsere Pakete sind für kleine Unternehmen in Berlin gedacht. Wir erstellen deine Website mit klaren Preisen und persönlicher Beratung.</p>
      </body></html>
    `)]
  ]);

  const report = await auditSeoRecoverySite({
    baseUrl: 'https://example.test',
    fetchImpl: async (url) => pages.get(String(url)) || response('', 404),
    targets: [{ path: '/en/pakete', state: 'active', requiredLinks: [] }]
  });

  assert.ok(report.violations.some((item) => item.code === 'mixed_language' && item.path === '/en/pakete'));
});

test('Audit meldet kaputte interne Linkziele und interne Redirecttreffer als Fehler', async () => {
  const sitemap = `<?xml version="1.0"?><urlset>
    <url><loc>https://example.test/</loc></url>
    <url><loc>https://example.test/ziel</loc></url>
  </urlset>`;
  const pages = new Map([
    ['https://example.test/sitemap.xml', response(sitemap)],
    ['https://example.test/', response(validPage({
      body: '<main><a href="/fehlt">Fehlendes Ziel</a><a href="/alt">Alte URL</a></main>'
    }))],
    ['https://example.test/ziel', response(validPage({
      path: '/ziel',
      title: 'Ein anderes eindeutiges Ziel für den internen Linktest',
      description: `${'Z'.repeat(130)}`
    }))],
    ['https://example.test/fehlt', response('', 404)],
    ['https://example.test/alt', response('', 301, { location: '/ziel' })]
  ]);

  const report = await auditSeoRecoverySite({
    baseUrl: 'https://example.test',
    fetchImpl: async (url) => pages.get(String(url)) || response('', 404),
    targets: [{ path: '/alt', state: 'redirect', redirectTo: '/ziel', requiredLinks: [] }]
  });

  assert.ok(report.violations.some((item) => (
    item.code === 'internal_link_target_status'
    && item.path === '/fehlt'
    && item.status === 404
    && item.severity === 'error'
  )));
  assert.ok(report.violations.some((item) => (
    item.code === 'internal_redirect_link'
    && item.path === '/alt'
    && item.severity === 'error'
  )));
});

test('Audit meldet doppelte Seitentitel und Meta-Descriptions als Fehler', async () => {
  const sitemap = `<?xml version="1.0"?><urlset>
    <url><loc>https://example.test/eins</loc></url>
    <url><loc>https://example.test/zwei</loc></url>
  </urlset>`;
  const duplicateTitle = 'Doppelter aussagekräftiger Seitentitel für zwei Seiten';
  const duplicateDescription = `${'D'.repeat(130)}`;
  const pages = new Map([
    ['https://example.test/sitemap.xml', response(sitemap)],
    ['https://example.test/eins', response(validPage({
      path: '/eins',
      title: duplicateTitle,
      description: duplicateDescription
    }))],
    ['https://example.test/zwei', response(validPage({
      path: '/zwei',
      title: duplicateTitle,
      description: duplicateDescription
    }))]
  ]);

  const report = await auditSeoRecoverySite({
    baseUrl: 'https://example.test',
    fetchImpl: async (url) => pages.get(String(url)) || response('', 404),
    targets: []
  });

  assert.ok(report.violations.some((item) => (
    item.code === 'duplicate_title'
    && item.severity === 'error'
    && item.paths.includes('/eins')
    && item.paths.includes('/zwei')
  )));
  assert.ok(report.violations.some((item) => (
    item.code === 'duplicate_description'
    && item.severity === 'error'
    && item.paths.includes('/eins')
    && item.paths.includes('/zwei')
  )));
});

test('Audit akzeptiert valide gegenseitige Hreflang-Paare', async () => {
  const sitemap = `<?xml version="1.0"?><urlset>
    <url><loc>https://example.test/de</loc></url>
    <url><loc>https://example.test/en</loc></url>
  </urlset>`;
  const deAlternates = `
    <link rel="alternate" hreflang="de-DE" href="https://example.test/de/">
    <link rel="alternate" hreflang="en-US" href="https://example.test/en/">
    <link rel="alternate" hreflang="x-default" href="https://example.test/de/">`;
  const enAlternates = `
    <link rel="alternate" hreflang="en-US" href="https://example.test/en/">
    <link rel="alternate" hreflang="de-DE" href="https://example.test/de/">
    <link rel="alternate" hreflang="x-default" href="https://example.test/de/">`;
  const pages = new Map([
    ['https://example.test/sitemap.xml', response(sitemap)],
    ['https://example.test/de', response(validPage({
      path: '/de',
      head: deAlternates,
      title: 'Deutsche eindeutige Seite mit korrekten Sprachverweisen',
      description: `${'A'.repeat(130)}`
    }))],
    ['https://example.test/en', response(validPage({
      path: '/en',
      lang: 'en',
      head: enAlternates,
      title: 'Unique English page with reciprocal language references',
      description: `${'B'.repeat(130)}`
    }))]
  ]);

  const report = await auditSeoRecoverySite({
    baseUrl: 'https://example.test',
    fetchImpl: async (url) => pages.get(String(url)) || response('', 404),
    targets: []
  });

  assert.equal(report.violations.some((item) => item.code.startsWith('hreflang_')), false);
});

test('Audit akzeptiert einen x-default-Rücklink nicht als sprachlich reziprokes Gegenpaar', async () => {
  const sitemap = `<?xml version="1.0"?><urlset>
    <url><loc>https://example.test/en</loc></url>
    <url><loc>https://example.test/de</loc></url>
  </urlset>`;
  const pages = new Map([
    ['https://example.test/sitemap.xml', response(sitemap)],
    ['https://example.test/en', response(validPage({
      path: '/en',
      lang: 'en',
      head: `
        <link rel="alternate" hreflang="en-US" href="https://example.test/en">
        <link rel="alternate" hreflang="de-DE" href="https://example.test/de">`,
      title: 'English source page with an incomplete reciprocal pair',
      description: `${'E'.repeat(130)}`
    }))],
    ['https://example.test/de', response(validPage({
      path: '/de',
      head: `
        <link rel="alternate" hreflang="de-DE" href="https://example.test/de">
        <link rel="alternate" hreflang="x-default" href="https://example.test/en">`,
      title: 'Deutsche Zielseite ohne englisch annotiertes Gegenpaar',
      description: `${'D'.repeat(130)}`
    }))]
  ]);

  const report = await auditSeoRecoverySite({
    baseUrl: 'https://example.test',
    fetchImpl: async (url) => pages.get(String(url)) || response('', 404),
    targets: []
  });

  assert.ok(report.violations.some((item) => (
    item.code === 'hreflang_not_reciprocal'
    && item.path === '/en'
    && item.hreflang === 'de-DE'
    && item.severity === 'error'
  )));
});

test('Audit prüft auch externe Hreflang-Ziele auf Erreichbarkeit', async () => {
  const sitemap = '<?xml version="1.0"?><urlset><url><loc>https://example.test/en</loc></url></urlset>';
  const pages = new Map([
    ['https://example.test/sitemap.xml', response(sitemap)],
    ['https://example.test/en', response(validPage({
      path: '/en',
      lang: 'en',
      head: `
        <link rel="alternate" hreflang="en-US" href="https://example.test/en">
        <link rel="alternate" hreflang="de-DE" href="https://external.test/de">`,
      title: 'English source page with an unreachable external alternate',
      description: `${'X'.repeat(130)}`
    }))],
    ['https://external.test/de', response('', 404)]
  ]);

  const report = await auditSeoRecoverySite({
    baseUrl: 'https://example.test',
    fetchImpl: async (url) => pages.get(String(url)) || response('', 404),
    targets: []
  });

  assert.ok(report.violations.some((item) => (
    item.code === 'hreflang_target_status'
    && item.path === '/en'
    && item.href === 'https://external.test/de'
    && item.targetStatus === 404
    && item.severity === 'error'
  )));
});

test('Audit meldet ungültige, sprachlich falsche und nicht gegenseitige Hreflang-Verweise', async () => {
  const sitemap = `<?xml version="1.0"?><urlset>
    <url><loc>https://example.test/de</loc></url>
    <url><loc>https://example.test/en</loc></url>
  </urlset>`;
  const pages = new Map([
    ['https://example.test/sitemap.xml', response(sitemap)],
    ['https://example.test/de', response(validPage({
      path: '/de',
      head: `
        <link rel="alternate" hreflang="deutsch" href="https://example.test/de">
        <link rel="alternate" hreflang="en-US" href="https://example.test/en">`,
      title: 'Deutsche Seite mit absichtlich kaputten Sprachverweisen',
      description: `${'C'.repeat(130)}`
    }))],
    ['https://example.test/en', response(validPage({
      path: '/en',
      lang: 'de',
      head: '<link rel="alternate" hreflang="en-US" href="https://example.test/en">',
      title: 'Englisches Ziel mit absichtlich falscher Seitensprache',
      description: `${'E'.repeat(130)}`
    }))]
  ]);

  const report = await auditSeoRecoverySite({
    baseUrl: 'https://example.test',
    fetchImpl: async (url) => pages.get(String(url)) || response('', 404),
    targets: []
  });

  assert.ok(report.violations.some((item) => item.code === 'hreflang_invalid' && item.severity === 'error'));
  assert.ok(report.violations.some((item) => item.code === 'hreflang_language_mismatch' && item.severity === 'error'));
  assert.ok(report.violations.some((item) => item.code === 'hreflang_not_reciprocal' && item.severity === 'error'));
});

test('Audit meldet nicht parsebares JSON-LD als Fehler und akzeptiert valides JSON-LD', async () => {
  const sitemap = `<?xml version="1.0"?><urlset>
    <url><loc>https://example.test/valide</loc></url>
    <url><loc>https://example.test/kaputt</loc></url>
  </urlset>`;
  const pages = new Map([
    ['https://example.test/sitemap.xml', response(sitemap)],
    ['https://example.test/valide', response(validPage({
      path: '/valide',
      head: '<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage"}</script>',
      title: 'Valide strukturierte Daten auf einer eindeutigen Seite',
      description: `${'V'.repeat(130)}`
    }))],
    ['https://example.test/kaputt', response(validPage({
      path: '/kaputt',
      head: '<script type="application/ld+json">{"@context":"https://schema.org",}</script>',
      title: 'Kaputte strukturierte Daten auf einer eindeutigen Seite',
      description: `${'K'.repeat(130)}`
    }))]
  ]);

  const report = await auditSeoRecoverySite({
    baseUrl: 'https://example.test',
    fetchImpl: async (url) => pages.get(String(url)) || response('', 404),
    targets: []
  });

  assert.equal(
    report.violations.some((item) => item.code === 'json_ld_parse_error' && item.path === '/valide'),
    false
  );
  assert.ok(report.violations.some((item) => (
    item.code === 'json_ld_parse_error'
    && item.path === '/kaputt'
    && item.severity === 'error'
  )));
});

test('Audit zählt Header-, Footer- und Navigationslinks nicht als kontextuelle Inlinks', async () => {
  const sitemap = `<?xml version="1.0"?><urlset>
    <url><loc>https://example.test/global</loc></url>
    <url><loc>https://example.test/inhalt</loc></url>
    <url><loc>https://example.test/ziel</loc></url>
  </urlset>`;
  const pages = new Map([
    ['https://example.test/sitemap.xml', response(sitemap)],
    ['https://example.test/global', response(validPage({
      path: '/global',
      body: '<header><a href="/ziel">Header</a></header><nav><a href="/ziel">Navigation</a></nav><footer><a href="/ziel">Footer</a></footer>'
    }))],
    ['https://example.test/inhalt', response(validPage({
      path: '/inhalt',
      title: 'Kontextquelle mit eindeutigem Seitentitel für den Audit',
      description: `${'I'.repeat(130)}`,
      body: '<main><p>Fachlicher Kontext <a href="/ziel">zum Ziel</a></p></main>'
    }))],
    ['https://example.test/ziel', response(validPage({
      path: '/ziel',
      title: 'Zielseite mit eindeutigem Seitentitel für den Audit',
      description: `${'Z'.repeat(130)}`
    }))]
  ]);

  const report = await auditSeoRecoverySite({
    baseUrl: 'https://example.test',
    fetchImpl: async (url) => pages.get(String(url)) || response('', 404),
    targets: [{ path: '/ziel', state: 'active', priority: 'A', requiredLinks: [] }]
  });

  assert.deepEqual(
    report.inlinks.find((item) => item.path === '/ziel')?.sources,
    ['https://example.test/inhalt']
  );
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
