# SEO-Reichweiten-Sanierung Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die vorhandene Website gewinnt wieder qualifizierte organische Besucher, indem konkurrierende Seiten konsolidiert, bestehende Inhalte gestärkt, interne Links systematisiert, technische Hemmnisse beseitigt und externe Autorität aufgebaut werden.

**Architecture:** Die Umsetzung erfolgt in vier getrennt veröffentlichbaren Wellen: Stabilität und Seitenzuständigkeit, bestehende Inhalte und interne Links, Performance und externe Reichweite sowie spätere Conversion-Vertiefung. Eine zentrale Intent-Registry und ein reproduzierbarer Live-Audit sichern die Seitenzuständigkeit und verhindern neue Kannibalisierung; vorhandene dynamische Inhalte werden über die bestehenden geprüften Admin- und Revisionsabläufe geändert.

**Tech Stack:** Node.js 22, Express 5, EJS, PostgreSQL, Cheerio, Node Test Runner, bestehender Content-Agent, Google Search Console, Lighthouse.

## Global Constraints

- Nutze immer richtig ä, ö und ü sowie die deutschen Grammatikregeln.
- Bestehende Seiten werden vor neuen Seiten priorisiert.
- In den ersten acht Wochen der Sanierung werden keine neuen SEO-Zielseiten veröffentlicht.
- Design, Domain, Protokoll und bevorzugter Host `https://www.komplettwebdesign.de` bleiben stabil.
- Es findet keine erneute Massenmigration von URLs statt.
- Für jede geschäftlich relevante Suchabsicht existiert genau eine primär verantwortliche indexierbare Seite.
- Eine URL wird erst weitergeleitet, nachdem Suchdaten, interne Links, vorhandene Inhalte, externe Links und semantische Eignung geprüft wurden.
- Jede entfernte indexierbare URL mit einem inhaltlichen Nachfolger erhält eine direkte HTTP-301-Weiterleitung ohne zusätzliche Weiterleitungskette.
- Google-Search-Console-Daten dienen der Auswahl und Erfolgskontrolle; GA4 ist nicht Bestandteil dieses Vorhabens.
- Reichweiten- und Autoritätsarbeit beginnt parallel zur Onpage-Sanierung.
- Keine gekauften Linkpakete, automatisierten Verzeichniseinträge oder themenfremden Gastbeiträge.
- Keine Ranking-, Besucher- oder Anfragegarantien in Texten, strukturierten Daten oder Berichten.
- Bestehende Preis- und Leistungsgrenzen sowie § 19 UStG bleiben konsistent.

---

## Ausführungsgrenzen und Veröffentlichungswellen

Dieser Gesamtplan enthält mehrere unabhängige Arbeitsbereiche. Sie werden nicht in einem einzigen Deployment veröffentlicht:

1. **Welle 1 – Stabilität:** Tasks 1 bis 4

   Intent-Registry, Audit, Hauptseiten-Konsolidierung, Startseite und zentrale Berliner Leistungsseite.
2. **Welle 2 – Bestand:** Tasks 5 bis 9

   interne Links, Blog-Paginierung, Paketsprachen, Kostencluster, Blumenladen-Cluster, Leistungs- und Tester-Seiten.
3. **Welle 3 – Qualität und Reichweite:** Tasks 10 und 11

   Performance, Barrierefreiheit, Google-Unternehmensprofil, Bewertungen, Partnererwähnungen und Verteilung.
4. **Welle 4 – Auswertung und Conversion:** Tasks 12 und 13

   Live-Abnahme, 28-Tage-Auswertung und vertiefte Conversion erst nach ausreichendem organischem Traffic.

Nach jeder Welle werden Tests, Build, lokaler Crawl und Live-Crawl vollständig ausgeführt. Die nächste Welle beginnt erst, wenn die vorherige Welle keine neuen Indexierungs-, Weiterleitungs- oder Linkfehler erzeugt hat.

## Geplante Dateistruktur

### Neue Dateien

- `data/seoIntentRegistry.js` – verbindliche Zuständigkeit, Status, Priorität und Mindestlinks der wichtigsten Seiten
- `services/seoRecoveryAuditService.js` – reproduzierbarer Sitemap-, Canonical-, H1-, Metadaten-, Sprach- und Inlink-Audit
- `scripts/seoRecoveryAudit.js` – Kommandozeilen-Einstieg für lokalen und produktiven Audit
- `tests/seoIntentRegistry.test.js` – Kollisions-, Redirect- und Mindestlinkregeln
- `tests/seoRecoveryAuditService.test.js` – Auditfälle ohne Netzwerkzugriff
- `data/blogRedirects.js` – zentrale Redirectliste konsolidierter Blogartikel
- `tests/blogSeoRedirects.test.js` – Routing-, Sitemap- und Listenregeln für Blogkonsolidierungen
- `tests/blogPaginationSeo.test.js` – crawlbare serverseitige Blogpaginierung
- `tests/testerSeoContent.test.js` – Snippet-, Methodik-, Beleg- und Folgeschrittregeln der Tester
- `tests/homePerformance.test.js` – LCP-Bild, Ladeprioritäten und Schrift-Preloads
- `docs/seo/2026-07-26-seiteninventar.md` – abgezeichnete Seiten-, Intent- und Statusliste
- `docs/seo/content-briefs/2026-07-26-kosten-und-blumenladen.md` – genaue redaktionelle Vorgaben für dynamische Inhalte
- `docs/seo/2026-07-26-reichweitenarbeit.md` – externe Maßnahmen, Verantwortliche, Nachweise und Kontakttexte
- `docs/seo/2026-07-26-veroeffentlichungsprotokoll.md` – Deploymentdaten, Prüfungen und 28-Tage-Auswertungen

### Bestehende Hauptdateien

- `controllers/mainController.js` – Startseiten-Metadaten und Startseiten-Copy
- `views/index.ejs` – Startseiten-Hierarchie, interne Links und LCP-Bild
- `data/webdesignBerlinPage.js` – zentrale Berliner Leistungsseite
- `views/bereiche/webdesign-berlin.ejs` – Ausgabe der zentralen Berliner Leistungsseite
- `routes/seoLandingRoutes.js` – 301-Konsolidierung der doppelten Hauptseite
- `data/seoLandingPages.js` – verbleibende eigenständige Landingpages
- `data/siteNavigation.js` – Header- und Footer-Verlinkung
- `helpers/seoPagePolicy.js` – indexierbare statische Sitemap-URLs
- `controllers/sitemapController.js` – dynamische Sitemap und Ausschluss konsolidierter Blogartikel
- `controllers/blogController.js` – serverseitige Paginierung und eindeutige Canonicals
- `models/BlogPostModel.js` – paginierte veröffentlichte Beiträge ohne Redirect-Quellen
- `routes/blogRoutes.js` – direkte Blog-Redirects vor der Slugroute
- `views/blog/index.ejs` – crawlbare Paginierungslinks
- `controllers/packagesController.js` – Indexierungsstatus unvollständig übersetzter Paketbereiche
- `views/packages_list.ejs` und `views/package_detail.ejs` – Paket-Metadaten und Sprachausgabe
- `controllers/industriesController.js` und `views/industries/index.ejs` – Verlinkung vorhandener Branchenseiten
- `data/leistungenOverviewPage.js` – zentrale Leistungsübersicht
- `data/localSeoPage.js`, `data/maintenancePage.js`, `data/runningCostsPage.js` – priorisierte Leistungsseiten
- `controllers/testController.js` – Tester-Snippets
- `views/seo_tester.ejs`, `views/test.ejs` – Methodik, Beispiele und passende Folgeschritte
- `views/partials/head.ejs` – nur die wirklich kritischen Schrift-Preloads
- `public/home.css` – sichtbarer LCP-Zustand ohne Animationsverzögerung

---

### Task 1: Intent-Registry, Veröffentlichungsstopp und Ausgangsstand

**Files:**
- Create: `data/seoIntentRegistry.js`
- Create: `tests/seoIntentRegistry.test.js`
- Create: `docs/seo/2026-07-26-seiteninventar.md`
- Reference: `docs/superpowers/specs/2026-07-26-seo-reichweiten-sanierung-design.md`

**Interfaces:**
- Produces: `SEO_RECOVERY_TARGETS: ReadonlyArray<SeoRecoveryTarget>`
- Produces: `getSeoRecoveryTarget(pathname: string): SeoRecoveryTarget | null`
- Produces: `findActiveIntentCollisions(targets?: SeoRecoveryTarget[]): Array<{ intentId: string, paths: string[] }>`
- Produces: `SEO_RECOVERY_REDIRECTS: Readonly<Record<string, string>>`
- `SeoRecoveryTarget` has `path`, `intentId`, `state`, `priority`, `primaryQuery`, `requiredLinks`, and optional `redirectTo`

- [ ] **Step 1: Content-Agent auf Reviewbetrieb prüfen**

Im Adminbereich des Content-Agenten muss `operating_mode = review` aktiv sein. `auto_publish` darf während der ersten acht Wochen nicht aktiv sein. Bestehende Optimierungen bleiben erlaubt; neue Entwürfe dürfen nicht veröffentlicht werden.

Read-only prüfen:

```sql
SELECT agent_enabled, operating_mode, auto_publish_enabled, schedule_weekdays,
       schedule_time, timezone
FROM content_agent_settings
WHERE id = 1;
```

Erwartet: `operating_mode = 'review'` und `auto_publish_enabled = false`. Falls das nicht zutrifft, die vorhandene geschützte Admin-Einstellung auf „Review“ ändern und anschließend dieselbe Abfrage wiederholen.

- [ ] **Step 2: Failing Registry-Test schreiben**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SEO_RECOVERY_REDIRECTS,
  SEO_RECOVERY_TARGETS,
  findActiveIntentCollisions,
  getSeoRecoveryTarget
} from '../data/seoIntentRegistry.js';

test('jede aktive SEO-Suchabsicht besitzt genau eine Zielseite', () => {
  assert.deepEqual(findActiveIntentCollisions(), []);
});

test('die doppelten Haupt- und Kostenseiten besitzen ein eindeutiges Ziel', () => {
  assert.equal(SEO_RECOVERY_REDIRECTS['/website-erstellen-lassen-berlin'], '/webdesign-berlin');
  assert.equal(
    SEO_RECOVERY_REDIRECTS['/blog/website-kosten-2026-berlin-vergleich-2025'],
    '/blog/website-kosten-2025-einfach-erklaert'
  );
});

test('priorisierte aktive Seiten verlangen mindestens zwei kontextuelle Links', () => {
  const active = SEO_RECOVERY_TARGETS.filter((entry) => entry.state === 'active');
  assert.ok(active.length >= 9);
  for (const entry of active) {
    assert.ok(entry.requiredLinks.length >= 2, `${entry.path} hat zu wenige Pflichtlinks`);
  }
});

test('die zentrale Berliner Seite ist Eigentümerin der kommerziellen Hauptabsicht', () => {
  assert.equal(
    getSeoRecoveryTarget('/webdesign-berlin')?.intentId,
    'website-erstellen-lassen-berlin'
  );
  assert.equal(getSeoRecoveryTarget('/webdesign-berlin')?.state, 'active');
});
```

- [ ] **Step 3: Test ausführen und Fehlschlag bestätigen**

Run:

```bash
node --test tests/seoIntentRegistry.test.js
```

Expected: FAIL mit `ERR_MODULE_NOT_FOUND` für `data/seoIntentRegistry.js`.

- [ ] **Step 4: Registry implementieren**

```js
function freezeTarget(target) {
  return Object.freeze({
    ...target,
    requiredLinks: Object.freeze([...(target.requiredLinks || [])])
  });
}

export const SEO_RECOVERY_TARGETS = Object.freeze([
  freezeTarget({
    path: '/',
    intentId: 'brand-overview',
    state: 'active',
    priority: 'A',
    primaryQuery: 'komplett webdesign berlin',
    requiredLinks: ['/webdesign-berlin', '/pakete', '/referenzen']
  }),
  freezeTarget({
    path: '/webdesign-berlin',
    intentId: 'website-erstellen-lassen-berlin',
    state: 'active',
    priority: 'A',
    primaryQuery: 'website erstellen lassen berlin',
    requiredLinks: ['/pakete', '/leistungen/website-audit', '/referenzen']
  }),
  freezeTarget({
    path: '/website-erstellen-lassen-berlin',
    intentId: 'website-erstellen-lassen-berlin',
    state: 'redirect',
    priority: 'A',
    primaryQuery: 'website erstellen lassen berlin',
    requiredLinks: [],
    redirectTo: '/webdesign-berlin'
  }),
  freezeTarget({
    path: '/pakete',
    intentId: 'webdesign-preise-berlin',
    state: 'active',
    priority: 'A',
    primaryQuery: 'webdesign preise berlin',
    requiredLinks: ['/webdesign-berlin', '/leistungen/laufende-kosten-website']
  }),
  freezeTarget({
    path: '/leistungen/website-audit',
    intentId: 'website-audit',
    state: 'active',
    priority: 'A',
    primaryQuery: 'website audit',
    requiredLinks: ['/website-tester', '/leistungen/website-relaunch']
  }),
  freezeTarget({
    path: '/leistungen/website-wartung',
    intentId: 'website-wartung-berlin',
    state: 'active',
    priority: 'A',
    primaryQuery: 'website wartung berlin',
    requiredLinks: ['/pakete', '/leistungen/laufende-kosten-website']
  }),
  freezeTarget({
    path: '/branchen/webdesign-blumenladen',
    intentId: 'webdesign-blumenladen-commercial',
    state: 'active',
    priority: 'A',
    primaryQuery: 'website erstellen lassen blumenladen',
    requiredLinks: ['/blog/seo-fuer-blumenladen', '/pakete']
  }),
  freezeTarget({
    path: '/blog/seo-fuer-blumenladen',
    intentId: 'seo-blumenladen-informational',
    state: 'active',
    priority: 'A',
    primaryQuery: 'seo für blumenladen',
    requiredLinks: ['/branchen/webdesign-blumenladen', '/leistungen/local-seo']
  }),
  freezeTarget({
    path: '/blog/website-kosten-2025-einfach-erklaert',
    intentId: 'website-kosten-informational',
    state: 'active',
    priority: 'A',
    primaryQuery: 'website kosten',
    requiredLinks: ['/pakete', '/leistungen/laufende-kosten-website']
  }),
  freezeTarget({
    path: '/blog/website-kosten-2026-berlin-vergleich-2025',
    intentId: 'website-kosten-informational',
    state: 'redirect',
    priority: 'A',
    primaryQuery: 'website kosten',
    requiredLinks: [],
    redirectTo: '/blog/website-kosten-2025-einfach-erklaert'
  }),
  freezeTarget({
    path: '/website-tester',
    intentId: 'website-test-free',
    state: 'active',
    priority: 'B',
    primaryQuery: 'webseite testen',
    requiredLinks: ['/website-tester/seo', '/leistungen/website-audit']
  }),
  freezeTarget({
    path: '/website-tester/seo',
    intentId: 'seo-test-free',
    state: 'active',
    priority: 'B',
    primaryQuery: 'seo test',
    requiredLinks: ['/website-tester', '/leistungen/website-audit']
  })
]);

export const SEO_RECOVERY_REDIRECTS = Object.freeze(Object.fromEntries(
  SEO_RECOVERY_TARGETS
    .filter((entry) => entry.state === 'redirect' && entry.redirectTo)
    .map((entry) => [entry.path, entry.redirectTo])
));

export function getSeoRecoveryTarget(pathname) {
  return SEO_RECOVERY_TARGETS.find((entry) => entry.path === pathname) || null;
}

export function findActiveIntentCollisions(targets = SEO_RECOVERY_TARGETS) {
  const grouped = new Map();
  for (const entry of targets.filter((item) => item.state === 'active')) {
    const paths = grouped.get(entry.intentId) || [];
    paths.push(entry.path);
    grouped.set(entry.intentId, paths);
  }
  return [...grouped.entries()]
    .filter(([, paths]) => paths.length > 1)
    .map(([intentId, paths]) => ({ intentId, paths }));
}
```

- [ ] **Step 5: Seiteninventar dokumentieren**

`docs/seo/2026-07-26-seiteninventar.md` enthält für jede Sitemap-URL:

```text
URL | Seitentyp | Primäre Suchabsicht | Status | Priorität | GSC-Impressionen | GSC-Position | Eingehende interne Links | Nächste Aktion
```

Für die zwölf Registry-Einträge werden die Zustände aus `SEO_RECOVERY_TARGETS` übernommen. Alle weiteren URLs erhalten zunächst `unveraendert_behalten`, bis Welle C sie anhand eines vollständigen 28-Tage-Fensters bewertet. Die bekannten 23 Seiten ohne Inlink werden im Dokument ausdrücklich als `intern_integrieren` markiert.

- [ ] **Step 6: Registry-Test ausführen**

Run:

```bash
node --test tests/seoIntentRegistry.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add data/seoIntentRegistry.js tests/seoIntentRegistry.test.js docs/seo/2026-07-26-seiteninventar.md
git commit -m "feat: SEO-Seitenzuständigkeit festlegen"
```

---

### Task 2: Reproduzierbarer SEO-Recovery-Audit

**Files:**
- Create: `services/seoRecoveryAuditService.js`
- Create: `scripts/seoRecoveryAudit.js`
- Create: `tests/seoRecoveryAuditService.test.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: `SEO_RECOVERY_TARGETS`, `SEO_RECOVERY_REDIRECTS`
- Produces: `auditSeoRecoverySite({ baseUrl, fetchImpl, targets }): Promise<SeoRecoveryReport>`
- Produces: `SeoRecoveryReport = { summary, pages, redirects, inlinks, violations }`
- CLI: `node scripts/seoRecoveryAudit.js --base-url <url> --out <path> --fail-on error`

- [ ] **Step 1: Failing Audit-Test schreiben**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { auditSeoRecoverySite } from '../services/seoRecoveryAuditService.js';

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
```

- [ ] **Step 2: Test ausführen und Fehlschlag bestätigen**

Run:

```bash
node --test tests/seoRecoveryAuditService.test.js
```

Expected: FAIL mit `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Audit-Service implementieren**

Der Service:

1. lädt `/sitemap.xml`,
2. dedupliziert alle `<loc>`-Werte,
3. lädt jede URL mit `redirect: 'manual'`,
4. extrahiert mit Cheerio Titel, Description, Robots, Canonical, `lang`, H1 und interne Links,
5. zählt eingehende Links ausschließlich von anderen Sitemap-Seiten,
6. prüft Registry-Pflichtlinks,
7. prüft Redirect-Quellen separat,
8. trennt Fehler von redaktionellen Warnungen.

Verbindliche Codes:

```js
const ERROR_CODES = new Set([
  'sitemap_status',
  'page_status',
  'canonical_missing',
  'canonical_mismatch',
  'h1_count',
  'redirect_chain',
  'redirect_target_status',
  'indexable_redirect_source',
  'missing_required_link',
  'orphan_priority_page'
]);

const WARNING_CODES = new Set([
  'title_length',
  'description_length',
  'mixed_language',
  'low_inlink_count'
]);
```

Längengrenzen sind 30 bis 60 Zeichen für Titel und 120 bis 165 Zeichen für Descriptions. Rechtliche Seiten erhalten bei Längenabweichungen keine Warnung. `noindex,follow` ist für die im Plan definierten englischen Paketseiten zulässig.

- [ ] **Step 4: CLI implementieren**

```js
import fs from 'node:fs/promises';
import path from 'node:path';
import { auditSeoRecoverySite } from '../services/seoRecoveryAuditService.js';

const args = process.argv.slice(2);
function option(name, fallback = '') {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}

const baseUrl = option('--base-url', 'http://127.0.0.1:3000');
const out = option('--out', 'artifacts/seo-recovery-audit.json');
const failOn = option('--fail-on', 'error');
const report = await auditSeoRecoverySite({ baseUrl });

await fs.mkdir(path.dirname(out), { recursive: true });
await fs.writeFile(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report.summary));

if (failOn === 'error' && report.summary.errors > 0) process.exitCode = 1;
```

- [ ] **Step 5: NPM-Script ergänzen**

```json
"audit:seo-recovery": "node scripts/seoRecoveryAudit.js"
```

- [ ] **Step 6: Tests und CLI ausführen**

Run:

```bash
node --test tests/seoRecoveryAuditService.test.js
npm run audit:seo-recovery -- --base-url https://www.komplettwebdesign.de --out artifacts/seo-recovery-before.json --fail-on none
```

Expected: Test PASS; der Live-Audit schreibt einen Bericht und beendet sich trotz vorhandener Warnungen mit Exitcode 0.

- [ ] **Step 7: Commit**

```bash
git add services/seoRecoveryAuditService.js scripts/seoRecoveryAudit.js tests/seoRecoveryAuditService.test.js package.json
git commit -m "feat: reproduzierbaren SEO-Recovery-Audit ergänzen"
```

---

### Task 3: Doppelte Berliner Hauptseite konsolidieren

**Files:**
- Modify: `routes/seoLandingRoutes.js`
- Modify: `data/seoLandingPages.js`
- Modify: `data/webdesignBerlinPage.js`
- Modify: `data/serviceHeroImages.js`
- Modify: `data/siteNavigation.js`
- Modify: `helpers/seoPagePolicy.js`
- Modify: `tests/seoLandingPages.test.js`
- Modify: `tests/seoPagePolicy.test.js`
- Modify: `tests/webdesignBerlinPage.test.js`
- Modify: `tests/navigationPhase11.test.js`

**Interfaces:**
- Consumes: `SEO_RECOVERY_REDIRECTS['/website-erstellen-lassen-berlin']`
- Produces: direkte 301-Weiterleitung `/website-erstellen-lassen-berlin` → `/webdesign-berlin`
- Produces: eine aktive kommerzielle Berliner Hauptseite

- [ ] **Step 1: Failing Redirect- und Sitemap-Tests schreiben**

```js
test('website-erstellen-lassen-berlin redirects directly to the canonical Berlin page', () => {
  const routeSource = fs.readFileSync(new URL('../routes/seoLandingRoutes.js', import.meta.url), 'utf8');
  assert.match(
    routeSource,
    /router\.get\('\/website-erstellen-lassen-berlin'[\s\S]*?res\.redirect\(301,\s*'\/webdesign-berlin'\)/
  );
});

test('the retired duplicate is absent from landing data and sitemap', () => {
  assert.equal(getSeoLandingPage('website-erstellen-lassen-berlin'), null);
  assert.equal(
    INDEXABLE_STATIC_ROUTES.some((route) => route.path === '/website-erstellen-lassen-berlin'),
    false
  );
});
```

Zusätzlich im Navigationstest:

```js
assert.doesNotMatch(JSON.stringify(footerNavigation), /website-erstellen-lassen-berlin/);
assert.match(JSON.stringify(footerNavigation), /webdesign-berlin/);
```

- [ ] **Step 2: Tests ausführen und Fehlschlag bestätigen**

Run:

```bash
node --test tests/seoLandingPages.test.js tests/seoPagePolicy.test.js tests/navigationPhase11.test.js
```

Expected: FAIL, weil Route, Landing-Datensatz, Sitemap und Footer noch die alte URL verwenden.

- [ ] **Step 3: Direkte Route umstellen**

```js
router.get('/website-erstellen-lassen-berlin', (_req, res) => {
  return res.redirect(301, '/webdesign-berlin');
});
```

Der Handler steht weiterhin vor `slugRoutes`. Es gibt keine Zwischenweiterleitung über `/` oder `/leistungen`.

- [ ] **Step 4: Einzigartigen Inhalt in die Zielseite übernehmen**

In `data/webdesignBerlinPage.js` wird der hilfreiche Inhalt der bisherigen Landingpage als Abschnitt integriert:

```js
websiteCreation: {
  title: 'Website-Erstellung von der Struktur bis zum geprüften Livegang',
  text: 'Vor dem Design werden Zielgruppe, Leistungen, Suchabsichten und Kontaktwege geklärt. Danach werden Inhalte, Gestaltung und technische Umsetzung als zusammenhängendes Projekt aufgebaut.',
  points: [
    'Ziele, Leistungen und wichtigste Suchabsichten vor dem Layout klären',
    'Texte, Design und mobile Umsetzung auf eine gemeinsame Struktur ausrichten',
    'Formulare, Canonicals, Sitemap und wichtige Links vor dem Livegang prüfen'
  ]
}
```

`requiredSections()` erhält `websiteCreation` direkt nach `intro`. Im Template wird der Abschnitt mit vorhandenem Karten- und Abschnittsmuster ausgegeben.

- [ ] **Step 5: Alte Quelle aus allen aktiven Signalen entfernen**

Ausführen:

```bash
rg -n "website-erstellen-lassen-berlin" data routes helpers views tests controllers
```

Jeder aktive interne Link wird auf `/webdesign-berlin` geändert. Erlaubt bleiben nur:

- Redirect-Test,
- Redirect-Registry,
- Dokumentation der Migration.

Der Landing-Datensatz wird aus `SEO_LANDING_PAGES` entfernt, der Hero-Mapping-Eintrag gelöscht und die URL aus `INDEXABLE_STATIC_ROUTES` entfernt.

- [ ] **Step 6: Tests ausführen**

Run:

```bash
node --test tests/seoLandingPages.test.js tests/seoPagePolicy.test.js tests/webdesignBerlinPage.test.js tests/navigationPhase11.test.js
```

Expected: PASS.

- [ ] **Step 7: Lokalen Redirect prüfen**

Run:

```bash
curl -sSI http://127.0.0.1:3000/website-erstellen-lassen-berlin
curl -sSI http://127.0.0.1:3000/webdesign-berlin
```

Expected: erste URL `301` mit `Location: /webdesign-berlin`; Ziel-URL `200`.

- [ ] **Step 8: Commit**

```bash
git add routes/seoLandingRoutes.js data/seoLandingPages.js data/webdesignBerlinPage.js data/serviceHeroImages.js data/siteNavigation.js helpers/seoPagePolicy.js views/bereiche/webdesign-berlin.ejs tests
git commit -m "fix: doppelte Berliner Hauptseite konsolidieren"
```

---

### Task 4: Startseite und Berliner Hauptseite klar positionieren

**Files:**
- Modify: `controllers/mainController.js`
- Modify: `views/index.ejs`
- Modify: `data/webdesignBerlinPage.js`
- Modify: `views/bereiche/webdesign-berlin.ejs`
- Modify: `tests/homepagePrompt3.test.js`
- Modify: `tests/webdesignBerlinPage.test.js`
- Create: `tests/seoCorePageIntent.test.js`

**Interfaces:**
- Consumes: Seitenzuständigkeiten aus Task 1
- Produces: brandorientierte Startseite ohne H1-Duplikat
- Produces: kommerzielle Hauptseite für „Website erstellen lassen Berlin“

- [ ] **Step 1: Failing Intent-Test schreiben**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { webdesignBerlinPage } from '../data/webdesignBerlinPage.js';

const main = readFileSync(new URL('../controllers/mainController.js', import.meta.url), 'utf8');

test('Startseite und Berliner Hauptseite besitzen getrennte H1 und Titel', () => {
  assert.match(main, /Komplett Webdesign Berlin \| Websites für kleine Unternehmen/);
  assert.match(main, /Komplett Webdesign für kleine Unternehmen in Berlin/);
  assert.equal(webdesignBerlinPage.title, 'Website erstellen lassen Berlin | Webdesign & Preise');
  assert.equal(webdesignBerlinPage.h1, 'Website erstellen lassen in Berlin');
  assert.notEqual(webdesignBerlinPage.h1, 'Komplett Webdesign für kleine Unternehmen in Berlin');
});

test('Kernbeschreibungen liegen im redaktionellen Zielkorridor', () => {
  assert.ok(webdesignBerlinPage.description.length >= 120);
  assert.ok(webdesignBerlinPage.description.length <= 165);
});
```

- [ ] **Step 2: Test ausführen und Fehlschlag bestätigen**

Run:

```bash
node --test tests/seoCorePageIntent.test.js
```

Expected: FAIL wegen alter Titel und Überschriften.

- [ ] **Step 3: Deutsche Startseiten-Copy ändern**

In `HOMEPAGE_I18N.de`:

```js
seoTitle: 'Komplett Webdesign Berlin | Websites für kleine Unternehmen',
seoDescription: 'Komplett Webdesign entwickelt individuelle Websites für kleine Unternehmen in Berlin: klare Leistungen, faire Pakete, persönliche Umsetzung und saubere Technik.',
ogTitle: 'Komplett Webdesign Berlin | Websites für kleine Unternehmen',
ogDescription: 'Individuelle Websites für kleine Unternehmen in Berlin mit klaren Leistungen, transparenten Paketen und persönlicher Umsetzung.',
heroBadge: 'Komplett Webdesign aus Berlin',
heroTitle: 'Komplett Webdesign für kleine Unternehmen in Berlin',
heroTitle2: 'individuell entwickelt und verständlich geplant',
heroSubline: 'Ich verbinde Struktur, Gestaltung und technische Umsetzung zu einer Website, die dein Angebot verständlich präsentiert und eine solide Grundlage für organische Sichtbarkeit schafft.',
introTitleStrong: 'Webdesign, Pakete und persönliche Umsetzung',
introTitleRest: 'aus einer Hand bei'
```

Die Startseite verlinkt im ersten inhaltlichen Abschnitt mit dem Linktext „Website erstellen lassen in Berlin“ auf `/webdesign-berlin`.

- [ ] **Step 4: Berliner Hauptseite ändern**

```js
title: 'Website erstellen lassen Berlin | Webdesign & Preise',
description: 'Website erstellen lassen in Berlin: individuelles Webdesign für kleine Unternehmen mit klarer Struktur, transparenten Paketen und persönlicher Umsetzung.',
h1: 'Website erstellen lassen in Berlin',
hero: {
  eyebrow: 'Individuelles Webdesign aus Berlin',
  lead: 'Ich plane und entwickle Websites für kleine Unternehmen, Selbstständige und lokale Dienstleister. Leistungen, Inhalte, Pakete und technische Umsetzung werden so geordnet, dass Besucher das Angebot schnell verstehen.',
  // bestehende CTAs und Bilder bleiben erhalten
}
```

Die Techniksektion mit Node.js und EJS bleibt bestehen, steht aber nicht vor Zielgruppe, Nutzen, Leistungen und Preisen.

- [ ] **Step 5: Beleg- und Vertrauensregeln prüfen**

Startseite und Hauptseite dürfen nur reale Bewertungen und vorhandene Referenzen anzeigen. Testregeln:

```js
assert.doesNotMatch(main, /garantiert|Platz 1|mehr Umsatz garantiert/i);
assert.doesNotMatch(JSON.stringify(webdesignBerlinPage), /garantiert mehr Kunden|Ranking garantiert/i);
assert.ok(webdesignBerlinPage.internalLinks.some((link) => link.href === '/referenzen'));
assert.ok(webdesignBerlinPage.internalLinks.some((link) => link.href === '/pakete'));
```

- [ ] **Step 6: Kernseitentests ausführen**

Run:

```bash
node --test tests/seoCorePageIntent.test.js tests/homepagePrompt3.test.js tests/webdesignBerlinPage.test.js tests/homeHeroSequence.test.js
```

Expected: PASS.

- [ ] **Step 7: Lokalen Audit ausführen**

Run:

```bash
npm run audit:seo-recovery -- --base-url http://127.0.0.1:3000 --out artifacts/seo-wave-1.json --fail-on error
```

Expected: keine Fehler für `/` und `/webdesign-berlin`; Titel und Description ohne Längenwarnung.

- [ ] **Step 8: Commit**

```bash
git add controllers/mainController.js views/index.ejs data/webdesignBerlinPage.js views/bereiche/webdesign-berlin.ejs tests
git commit -m "feat: SEO-Absichten der Kernseiten schärfen"
```

---

### Task 5: Blog crawlbar paginieren und interne Links systematisieren

**Files:**
- Modify: `controllers/blogController.js`
- Modify: `models/BlogPostModel.js`
- Modify: `views/blog/index.ejs`
- Create: `tests/blogPaginationSeo.test.js`
- Modify: `controllers/industriesController.js`
- Modify: `views/industries/index.ejs`
- Modify: `data/contentAgentLinks.js`
- Modify: `data/leistungenOverviewPage.js`
- Modify: `tests/contentTrustedInternalLinkService.test.js`

**Interfaces:**
- Produces: `parseBlogPage(value: unknown): number`
- Produces: `GET /blog?page=N` mit selbstreferenziellem Canonical sowie echten Vor-/Zurück-Links
- Produces: mindestens zwei kontextuelle Links auf jede aktive Registry-Seite

- [ ] **Step 1: Failing Paginierungstest schreiben**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const controller = readFileSync(new URL('../controllers/blogController.js', import.meta.url), 'utf8');
const template = readFileSync(new URL('../views/blog/index.ejs', import.meta.url), 'utf8');

test('Blogübersicht besitzt serverseitige indexierbare Paginierung', () => {
  assert.match(controller, /req\.query\.page/);
  assert.match(controller, /canonicalUrl/);
  assert.match(controller, /previousPageUrl/);
  assert.match(controller, /nextPageUrl/);
  assert.match(template, /rel="prev"/);
  assert.match(template, /rel="next"/);
  assert.match(template, /href="<%= nextPageUrl %>"/);
});
```

- [ ] **Step 2: Test ausführen und Fehlschlag bestätigen**

Run:

```bash
node --test tests/blogPaginationSeo.test.js
```

Expected: FAIL.

- [ ] **Step 3: Controllerpaginierung implementieren**

```js
export function parseBlogPage(value) {
  const page = Number.parseInt(String(value || '1'), 10);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export async function listPosts(req, res) {
  const page = parseBlogPage(req.query.page);
  const offset = (page - 1) * BLOG_PAGE_SIZE;
  const [rawPosts, totalPosts, rawFeaturedPosts] = await Promise.all([
    BlogPostModel.findPage({ limit: BLOG_PAGE_SIZE, offset }),
    BlogPostModel.countPublished(),
    BlogPostModel.findFeatured(5)
  ]);
  const totalPages = Math.max(1, Math.ceil(totalPosts / BLOG_PAGE_SIZE));
  if (page > totalPages) {
    return res.status(404).render('404', {
      title: 'Blogseite nicht gefunden',
      description: 'Die angeforderte Blogseite existiert nicht.'
    });
  }

  const pricing = res.locals.packagePricing || {};
  const posts = normalizeLegacyPublicCopy(renderPricingTokens(rawPosts, pricing));
  const featuredPosts = normalizeLegacyPublicCopy(renderPricingTokens(rawFeaturedPosts, pricing));
  const base = (res.locals.canonicalBaseUrl || 'https://www.komplettwebdesign.de').replace(/\/$/, '');
  const pagePath = page === 1 ? '/blog' : `/blog?page=${page}`;
  const pageUrl = (value) => value === 1 ? '/blog' : `/blog?page=${value}`;

  return res.render('blog/index', {
    title: page === 1
      ? 'Aktuelle Einschätzungen zu Webdesign, SEO und Sichtbarkeit'
      : `Webdesign- und SEO-Blog – Seite ${page}`,
    description: page === 1
      ? 'Aktuelle Einschätzungen zu Webdesign, KI, Performance und SEO. Dauerhafte Grundlagen zu Kosten, Ablauf und Local SEO findest du im Ratgeber.'
      : `Weitere Artikel zu Webdesign, SEO, Performance und digitalen Angeboten auf Seite ${page} des Komplett-Webdesign-Blogs.`,
    canonicalUrl: `${base}${pagePath}`,
    posts,
    featuredPosts,
    totalPosts,
    pageSize: BLOG_PAGE_SIZE,
    initialOffset: offset + posts.length,
    currentPage: page,
    totalPages,
    previousPageUrl: page > 1 ? pageUrl(page - 1) : null,
    nextPageUrl: page < totalPages ? pageUrl(page + 1) : null
  });
}
```

- [ ] **Step 4: Sichtbare HTML-Paginierung ergänzen**

Am Anfang von `views/blog/index.ejs` die berechneten Werte vollständig ersetzen:

```ejs
<%
const renderedPosts = Array.isArray(posts) ? posts : [];
const renderedTotalPosts = Number.isFinite(Number(totalPosts)) ? Number(totalPosts) : renderedPosts.length;
const renderedPageSize = Number.isFinite(Number(pageSize)) ? Number(pageSize) : 10;
const renderedCurrentPage = Number.isFinite(Number(currentPage)) ? Number(currentPage) : 1;
const renderedTotalPages = Number.isFinite(Number(totalPages)) ? Number(totalPages) : 1;
const renderedInitialOffset = Number.isFinite(Number(initialOffset))
  ? Number(initialOffset)
  : renderedPosts.length;
const hasMorePosts = renderedCurrentPage < renderedTotalPages;
%>
```

Beim JavaScript-Nachladebutton `data-offset` von `renderedPosts.length` auf `renderedInitialOffset` ändern. Danach direkt unter `div.blog-load-more` ergänzen:

```ejs
<% if (totalPages > 1) { %>
<nav class="blog-pagination" aria-label="Blogseiten">
  <% if (previousPageUrl) { %>
  <a rel="prev" href="<%= previousPageUrl %>">Neuere Artikel</a>
  <% } %>
  <span>Seite <%= currentPage %> von <%= totalPages %></span>
  <% if (nextPageUrl) { %>
  <a rel="next" href="<%= nextPageUrl %>">Ältere Artikel</a>
  <% } %>
</nav>
<% } %>
```

Der vorhandene JavaScript-Nachladebutton darf als Komfortfunktion bleiben, ist aber nicht mehr der einzige Weg zu älteren Artikeln.

- [ ] **Step 5: Vorhandene Handwerkerseite intern anbinden**

`controllers/industriesController.js` übergibt:

```js
existingIndustryPages: [{
  title: 'Website für Handwerker',
  description: 'Webdesign, Leistungen und Anfragewege für Handwerksbetriebe in Berlin.',
  href: '/handwerker'
}]
```

`views/industries/index.ejs` rendert diese Karte unter den vorhandenen Branchen. `data/leistungenOverviewPage.js` erhält zusätzlich einen kontextuellen Link auf `/handwerker`.

- [ ] **Step 6: Vertrauenswürdige Linkziele aktualisieren**

`data/contentAgentLinks.js` muss mindestens diese Ziele enthalten:

```js
{ url: '/webdesign-berlin', type: 'service', label: 'Website erstellen lassen in Berlin' },
{ url: '/pakete', type: 'pricing', label: 'Website-Pakete und Preise' },
{ url: '/leistungen/website-audit', type: 'service', label: 'Website-Audit' },
{ url: '/leistungen/local-seo', type: 'service', label: 'Local SEO Berlin' },
{ url: '/branchen/webdesign-blumenladen', type: 'industry', label: 'Webdesign für Blumenläden' }
```

- [ ] **Step 7: Tests ausführen**

Run:

```bash
node --test tests/blogPaginationSeo.test.js tests/contentTrustedInternalLinkService.test.js tests/seoIntentRegistry.test.js
```

Expected: PASS.

- [ ] **Step 8: Audit gegen lokale Seiten ausführen**

Run:

```bash
npm run audit:seo-recovery -- --base-url http://127.0.0.1:3000 --out artifacts/seo-wave-2-links.json --fail-on error
```

Expected: kein `orphan_priority_page` und kein `missing_required_link`.

- [ ] **Step 9: Commit**

```bash
git add controllers/blogController.js models/BlogPostModel.js views/blog/index.ejs controllers/industriesController.js views/industries/index.ejs data/contentAgentLinks.js data/leistungenOverviewPage.js tests
git commit -m "feat: crawlbare Blog- und Themenverlinkung ergänzen"
```

---

### Task 6: Gemischtsprachige englische Paketseiten aus dem Index nehmen

**Files:**
- Modify: `controllers/packagesController.js`
- Modify: `controllers/sitemapController.js`
- Modify: `helpers/seoPagePolicy.js`
- Modify: `tests/packageDbPublicPages.test.js`
- Modify: `tests/seoPagePolicy.test.js`
- Modify: `tests/packageSeoSchemas.test.js`

**Interfaces:**
- Produces: `/en/pakete` und `/en/pakete/:slug` bleiben erreichbar, aber liefern `noindex,follow`
- Produces: englische Paket-URLs erscheinen nicht mehr in der Sitemap und nicht als Hreflang-Ziele
- Deutsche Paket-URLs bleiben indexierbar

- [ ] **Step 1: Failing Sprachindex-Test ergänzen**

```js
test('unvollständig übersetzte englische Paketseiten bleiben erreichbar aber noindex', () => {
  assert.match(packageControllerSource, /robots:\s*isEn\s*\?\s*'noindex,follow'\s*:\s*undefined/);
});

test('englische Paketseiten stehen bis zur Vollübersetzung nicht in der Sitemap', () => {
  const paths = INDEXABLE_STATIC_ROUTES.map((entry) => entry.path);
  assert.equal(paths.some((path) => path === '/en/pakete' || path.startsWith('/en/pakete/')), false);
  assert.equal(paths.includes('/pakete'), true);
  assert.equal(paths.includes('/pakete/start'), true);
});
```

- [ ] **Step 2: Tests ausführen und Fehlschlag bestätigen**

Run:

```bash
node --test tests/packageDbPublicPages.test.js tests/seoPagePolicy.test.js
```

Expected: FAIL.

- [ ] **Step 3: Robots-Wert in allen Paket-Renderpfaden setzen**

Sowohl `listPackages`, `showPackage` als auch der Erfolgs-Renderpfad von `handleContact` erhalten:

```js
robots: isEn ? 'noindex,follow' : undefined,
```

`buildPackagesSeoExtra()` gibt für englische Paket-URLs keine Hreflang-Tags aus. Deutsche Paket-URLs erhalten nur `de-DE` und `x-default`, solange keine vollständig übersetzte englische Entsprechung existiert.

- [ ] **Step 4: Englische Paket-URLs aus Sitemap entfernen**

Aus `INDEXABLE_STATIC_ROUTES` entfernen:

```text
/en/pakete
/en/pakete/start
/en/pakete/business
/en/pakete/wachstum
/en/pakete/individuell
```

Die Routen bleiben bestehen. Es wird keine Weiterleitung und kein 404 eingerichtet.

In `controllers/sitemapController.js` erzeugt `packageRoutes` ausschließlich deutsche Detail-URLs:

```js
const packageRoutes = pricingPackages
  .filter((pkg) => pkg?.allowDetailPage && pkg?.canonicalPath)
  .map((pkg) => ({
    loc: `${base}${pkg.canonicalPath}`,
    lastmod: nowIso,
    changefreq: 'monthly',
    priority: pkg.packageKey === 'individuell' ? 0.6 : 0.7
  }));
```

- [ ] **Step 5: Deutsche Paketbeschreibungen korrigieren**

Die Meta-Descriptions von Business und Individuell werden in der bestehenden Preisverwaltung auf 120 bis 165 Zeichen erweitert. Verbindliche Fassungen:

```text
Business: Business-Website für kleine Unternehmen in Berlin: mehrere Leistungsseiten, klare Angebotsstruktur, technische SEO-Grundlagen und persönlicher Projektablauf.

Individuell: Individuelles Webdesign für Sonderfunktionen, CMS, Buchung, Mehrsprachigkeit oder größere Anforderungen. Umfang und Preis werden vorab transparent geplant.
```

- [ ] **Step 6: Tests ausführen**

Run:

```bash
node --test tests/packageDbPublicPages.test.js tests/seoPagePolicy.test.js tests/packageSeoSchemas.test.js
```

Expected: PASS.

- [ ] **Step 7: Live-ähnlichen Render prüfen**

```bash
curl -sS http://127.0.0.1:3000/en/pakete | rg 'name="robots" content="noindex,follow"'
curl -sS http://127.0.0.1:3000/pakete | rg 'name="robots" content="index,follow'
```

Expected: englische Seite `noindex,follow`, deutsche Seite `index,follow`.

- [ ] **Step 8: Commit**

```bash
git add controllers/packagesController.js controllers/sitemapController.js helpers/seoPagePolicy.js tests
git commit -m "fix: unvollständige englische Paketseiten noindex setzen"
```

---

### Task 7: Doppelte Website-Kosten-Artikel konsolidieren

**Files:**
- Create: `data/blogRedirects.js`
- Modify: `routes/blogRoutes.js`
- Modify: `models/BlogPostModel.js`
- Modify: `controllers/sitemapController.js`
- Create: `tests/blogSeoRedirects.test.js`
- Create: `docs/seo/content-briefs/2026-07-26-kosten-und-blumenladen.md`

**Interfaces:**
- Produces: `BLOG_REDIRECTS: Readonly<Record<string, string>>`
- Produces: `REDIRECTED_BLOG_SLUGS: ReadonlyArray<string>`
- Produces: direkte 301-Weiterleitung vom neueren Kostenartikel auf den etablierten Artikel
- Consumes: bestehende Content-Agent-Revision für die Inhaltszusammenführung

- [ ] **Step 1: Content-Brief mit exakter Zielseite anlegen**

Der Kostenabschnitt des Briefs enthält:

```text
Überlebende URL: /blog/website-kosten-2025-einfach-erklaert
Weiterleitung: /blog/website-kosten-2026-berlin-vergleich-2025 → Überlebende URL
Meta-Titel: Website-Kosten 2026: Preise für Selbstständige
Meta-Description: Was kostet eine professionelle Website 2026? Realistische Preisbereiche, laufende Kosten, Leistungsunterschiede und Beispiele für Selbstständige.
H1: Website-Kosten 2026: realistische Preise für Selbstständige
Primäre Suchabsicht: informationell mit Übergang zur Paketübersicht
Pflichtlinks: /pakete, /leistungen/laufende-kosten-website, /webdesign-berlin
Pflichtabschnitte: einmalige Projektkosten; laufende Kosten; Preisfaktoren; Paketvergleich; günstige Website versus tragfähige Lösung; Checkliste für ein Angebot
```

Der Inhalt des neueren Artikels wird Abschnitt für Abschnitt geprüft und nur dann in den etablierten Artikel übernommen, wenn er aktuell, einzigartig und fachlich passend ist.

- [ ] **Step 2: Failing Redirect-Test schreiben**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BLOG_REDIRECTS, REDIRECTED_BLOG_SLUGS } from '../data/blogRedirects.js';

test('Kostenartikel besitzt eine einzige kanonische öffentliche URL', () => {
  assert.equal(
    BLOG_REDIRECTS['website-kosten-2026-berlin-vergleich-2025'],
    'website-kosten-2025-einfach-erklaert'
  );
  assert.deepEqual(REDIRECTED_BLOG_SLUGS, ['website-kosten-2026-berlin-vergleich-2025']);
});

test('Blogroute setzt Redirect vor dynamischer Slugroute', () => {
  const source = readFileSync(new URL('../routes/blogRoutes.js', import.meta.url), 'utf8');
  const redirectIndex = source.indexOf("router.get('/blog/website-kosten-2026-berlin-vergleich-2025'");
  const slugIndex = source.indexOf("router.get('/blog/:slug'");
  assert.ok(redirectIndex >= 0 && redirectIndex < slugIndex);
  assert.match(source, /res\.redirect\(301,\s*'\/blog\/website-kosten-2025-einfach-erklaert'\)/);
});
```

- [ ] **Step 3: Test ausführen und Fehlschlag bestätigen**

Run:

```bash
node --test tests/blogSeoRedirects.test.js
```

Expected: FAIL.

- [ ] **Step 4: Redirectdaten und Route implementieren**

```js
export const BLOG_REDIRECTS = Object.freeze({
  'website-kosten-2026-berlin-vergleich-2025': 'website-kosten-2025-einfach-erklaert'
});

export const REDIRECTED_BLOG_SLUGS = Object.freeze(Object.keys(BLOG_REDIRECTS));
```

Vor `/blog/:slug`:

```js
router.get('/blog/website-kosten-2026-berlin-vergleich-2025', (_req, res) => {
  return res.redirect(301, '/blog/website-kosten-2025-einfach-erklaert');
});
```

- [ ] **Step 5: Redirectquelle aus Listen und Sitemap ausschließen**

`models/BlogPostModel.js` importiert `REDIRECTED_BLOG_SLUGS`. Die fünf öffentlichen Lesemethoden werden so ersetzt:

```js
static async findAll(db = pool) {
  const { rows } = await db.query(
    `SELECT * FROM posts
     WHERE published = true
       AND slug <> ALL($1::text[])
     ORDER BY created_at DESC`,
    [REDIRECTED_BLOG_SLUGS]
  );
  return rows;
}

static async findPage({ limit = 10, offset = 0 } = {}, db = pool) {
  const { rows } = await db.query(
    `SELECT * FROM posts
     WHERE published = true
       AND slug <> ALL($1::text[])
     ORDER BY created_at DESC
     LIMIT $2
     OFFSET $3`,
    [REDIRECTED_BLOG_SLUGS, limit, offset]
  );
  return rows;
}

static async countPublished(db = pool) {
  const { rows } = await db.query(
    `SELECT COUNT(*)::int AS count
     FROM posts
     WHERE published = true
       AND slug <> ALL($1::text[])`,
    [REDIRECTED_BLOG_SLUGS]
  );
  return Number(rows[0]?.count || 0);
}

static async findFeatured(limit = 5, db = pool) {
  const { rows } = await db.query(
    `SELECT * FROM posts
     WHERE featured = true
       AND published = true
       AND slug <> ALL($1::text[])
     ORDER BY created_at DESC
     LIMIT $2`,
    [REDIRECTED_BLOG_SLUGS, limit]
  );
  return rows;
}

static async findBySlug(slug, db = pool) {
  const { rows } = await db.query(
    `SELECT * FROM posts
     WHERE slug = $1
       AND published = true
       AND slug <> ALL($2::text[])
     LIMIT 1`,
    [slug, REDIRECTED_BLOG_SLUGS]
  );
  return rows[0] ?? null;
}
```

Die Sitemap importiert `REDIRECTED_BLOG_SLUGS` und ändert die Postquery verbindlich auf:

```sql
SELECT slug,
       COALESCE(updated_at, created_at, now()) AS updated_at
  FROM posts
 WHERE published = true
   AND slug <> ALL($1::text[])
```

`querySafe` erhält dabei `[REDIRECTED_BLOG_SLUGS]` als Parameter. Adminlisten bleiben vollständig und zeigen den gespeicherten Artikel weiterhin an.

- [ ] **Step 6: Bestehenden Artikel über den Content-Agent überarbeiten**

Im Bereich „Bestehende Inhalte“:

1. etablierten Artikel `website-kosten-2025-einfach-erklaert` öffnen,
2. vollständige Revision mit dem Brief aus Step 1 erstellen,
3. Fakten, Preise, Links und Jahreszahl manuell prüfen,
4. Revision veröffentlichen,
5. neuen Artikel `website-kosten-2026-berlin-vergleich-2025` unveröffentlichen,
6. beide URLs live prüfen.

Es wird kein neuer Artikel erstellt.

- [ ] **Step 7: Tests und Redirect prüfen**

Run:

```bash
node --test tests/blogSeoRedirects.test.js tests/blogAdminWorkflow.test.js tests/seoPagePolicy.test.js
curl -sSI http://127.0.0.1:3000/blog/website-kosten-2026-berlin-vergleich-2025
```

Expected: Tests PASS; Redirectquelle liefert genau eine 301-Stufe auf den etablierten Artikel.

- [ ] **Step 8: Commit**

```bash
git add data/blogRedirects.js routes/blogRoutes.js models/BlogPostModel.js controllers/sitemapController.js tests/blogSeoRedirects.test.js docs/seo/content-briefs/2026-07-26-kosten-und-blumenladen.md
git commit -m "fix: doppelte Website-Kosten-Artikel konsolidieren"
```

---

### Task 8: Blumenladen-Chance und bestehende Leistungsseiten stärken

**Files:**
- Modify: `docs/seo/content-briefs/2026-07-26-kosten-und-blumenladen.md`
- Modify: `data/leistungenOverviewPage.js`
- Modify: `data/localSeoPage.js`
- Modify: `data/maintenancePage.js`
- Modify: `data/seoLandingPages.js`
- Modify: `tests/localSeoPage.test.js`
- Modify: `tests/maintenancePage.test.js`
- Modify: `tests/seoLandingPages.test.js`
- Modify: `tests/industryTemplate.test.js`

**Interfaces:**
- Produces: getrennte Informations- und Kaufabsicht für Blumenladen-Inhalte
- Produces: eindeutige Links zwischen Branchen-, Blog-, Local-SEO-, Paket- und Audit-Seiten
- Consumes: bestehende Branchen- und Blog-Adminoberflächen

- [ ] **Step 1: Blumenladen-Brief vervollständigen**

```text
Kommerzielle URL: /branchen/webdesign-blumenladen
Meta-Titel: Webdesign für Blumenläden | Website erstellen lassen
Meta-Description: Webdesign für Blumenläden: individuelle Website, lokale Auffindbarkeit, Sortiment, Öffnungszeiten und klare Kontaktwege für Floristikbetriebe.
H1: Webdesign für Blumenläden
Pflichtlinks: /blog/seo-fuer-blumenladen, /pakete, /webdesign-berlin
Primärer nächster Schritt: Pakete ansehen

Informationelle URL: /blog/seo-fuer-blumenladen
Meta-Titel: SEO für Blumenläden: lokal besser gefunden werden
Meta-Description: So verbessern Blumenläden ihre lokale Sichtbarkeit: Google-Unternehmensprofil, Standortsignale, Sortiment, Bilder, Bewertungen und passende Website-Inhalte.
H1: SEO für Blumenläden: lokal besser gefunden werden
Pflichtlinks: /branchen/webdesign-blumenladen, /leistungen/local-seo
Primärer nächster Schritt: Webdesign für Blumenläden ansehen
```

Die Branchenseite verkauft die Website-Leistung. Der Blogartikel erklärt Local SEO und darf nicht denselben H1 oder dieselbe primäre Handlungsaufforderung verwenden.

- [ ] **Step 2: Dynamische Blumenladen-Inhalte über die bestehenden Adminbereiche ändern**

1. Branchenseite öffnen und Titel, Description, H1 sowie Pflichtlinks aus dem Brief speichern.
2. Blogartikel im Content-Agent als bestehende Inhaltsrevision öffnen.
3. Titel, Description, H1 und Pflichtlinks setzen.
4. Vorschauen prüfen.
5. Beide Änderungen veröffentlichen.
6. Gegenseitige Links live anklicken.

- [ ] **Step 3: Failing Test für Leistungsseiten ergänzen**

```js
test('priorisierte Leistungen verlinken auf passende Reichweiten- und Angebotsseiten', () => {
  assert.ok(localSeoPage.internalLinks.some((link) => link.href === '/blog/seo-fuer-blumenladen'));
  assert.ok(localSeoPage.internalLinks.some((link) => link.href === '/branchen/webdesign-blumenladen'));
  assert.ok(maintenancePage.internalLinks.some((link) => link.href === '/leistungen/website-audit'));
  const audit = getSeoLandingPage('website-audit');
  assert.ok(audit.internalLinks.some((link) => link.href === '/website-tester'));
  assert.ok(audit.internalLinks.some((link) => link.href === '/webdesign-berlin'));
});
```

- [ ] **Step 4: Tests ausführen und Fehlschlag bestätigen**

Run:

```bash
node --test tests/localSeoPage.test.js tests/maintenancePage.test.js tests/seoLandingPages.test.js
```

Expected: mindestens ein fehlender kontextueller Link.

- [ ] **Step 5: Leistungsseiten inhaltlich und intern verknüpfen**

Verbindliche Metadaten:

```text
/leistungen/website-audit
Titel: Website-Audit: SEO, Technik und Inhalte prüfen
Description: Website-Audit für SEO, Technik, Inhalte, Ladezeit und Nutzerführung. Du erhältst priorisierte Empfehlungen für Optimierung oder einen geplanten Relaunch.

/leistungen/website-wartung
Titel: Website-Wartung Berlin | Pflege, Backups und Support
Description: Website-Wartung für Unternehmen in Berlin: Pflege, Backups, technische Kontrollen und klar abgegrenzter Support nach vereinbartem Leistungsumfang.

/leistungen/local-seo
Titel: Local SEO Berlin | Sichtbarkeit für lokale Unternehmen
Description: Local SEO für Unternehmen in Berlin: Website-Struktur, lokale Inhalte, Google-Unternehmensprofil und nachvollziehbare Maßnahmen für bessere Auffindbarkeit.
```

Jede Seite erhält die Registry-Pflichtlinks und genau einen primären nächsten Schritt. Vorhandene rechtliche, Preis- und Rankinggrenzen bleiben erhalten.

- [ ] **Step 6: Tests und Live-Audit ausführen**

Run:

```bash
node --test tests/localSeoPage.test.js tests/maintenancePage.test.js tests/seoLandingPages.test.js tests/industryTemplate.test.js
npm run audit:seo-recovery -- --base-url https://www.komplettwebdesign.de --out artifacts/seo-flower-before-deploy.json --fail-on none
```

Expected: statische Tests PASS; der Live-Audit dokumentiert den Stand vor dem Deployment der Codeänderungen.

- [ ] **Step 7: Commit**

```bash
git add docs/seo/content-briefs/2026-07-26-kosten-und-blumenladen.md data/leistungenOverviewPage.js data/localSeoPage.js data/maintenancePage.js data/seoLandingPages.js tests
git commit -m "feat: vorhandene Rankingchancen gezielt stärken"
```

---

### Task 9: Tester-Snippets und kommerzielle Übergänge verbessern

**Files:**
- Modify: `controllers/testController.js`
- Modify: `views/test.ejs`
- Modify: `views/seo_tester.ejs`
- Create: `tests/testerSeoContent.test.js`
- Modify: `tests/seoTesterLeadService.test.js`
- Modify: `tests/websiteTesterLeadService.test.js`

**Interfaces:**
- Produces: eindeutige, kürzere Titel für `/website-tester` und `/website-tester/seo`
- Produces: belegbare Methodik ohne ungestützte Erfolgsbehauptung
- Produces: fachlich passender Übergang zum Website-Audit

- [ ] **Step 1: Failing Tester-Content-Test schreiben**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const controller = readFileSync(new URL('../controllers/testController.js', import.meta.url), 'utf8');
const seoView = readFileSync(new URL('../views/seo_tester.ejs', import.meta.url), 'utf8');
const websiteView = readFileSync(new URL('../views/test.ejs', import.meta.url), 'utf8');

test('deutsche Tester besitzen klickbare Titel im Zielkorridor', () => {
  assert.match(controller, /Kostenloser Website-Test: SEO, Technik und Sichtbarkeit/);
  assert.match(controller, /Kostenloser SEO-Test für Websites \| Komplett Webdesign/);
});

test('Tester erklären Methodik und führen passend zum Audit', () => {
  assert.match(seoView, /Was der Test prüft/);
  assert.match(seoView, /Beispielauswertung/);
  assert.match(seoView, /\/leistungen\/website-audit/);
  assert.match(websiteView, /\/leistungen\/website-audit/);
  assert.doesNotMatch(seoView, /sechsstelligen monatlichen Traffic/i);
});
```

- [ ] **Step 2: Test ausführen und Fehlschlag bestätigen**

Run:

```bash
node --test tests/testerSeoContent.test.js
```

Expected: FAIL.

- [ ] **Step 3: Deutsche Snippets ersetzen**

```js
// /website-tester
title: 'Kostenloser Website-Test: SEO, Technik und Sichtbarkeit',
description: 'Teste deine Website kostenlos auf SEO, Technik, Ladezeit, Vertrauen und Auffindbarkeit. Du erhältst eine direkte Auswertung mit priorisierten Hinweisen.',

// /website-tester/seo
title: 'Kostenloser SEO-Test für Websites | Komplett Webdesign',
description: 'Prüfe deine Website kostenlos auf Onpage-SEO, Indexierung, interne Links, Inhalte und strukturierte Daten. Mit verständlicher Auswertung und Prioritäten.'
```

- [ ] **Step 4: Methodik und Beispielauswertung ergänzen**

Beide Views erhalten vor dem FAQ:

```ejs
<section class="tester-method">
  <h2>Was der Test prüft</h2>
  <p>Der Test bewertet öffentlich erreichbare Signale. Er ersetzt keinen vollständigen manuellen Website-Audit und greift nicht auf geschützte Konten oder interne Geschäftsdaten zu.</p>
  <ul>
    <li>Indexierung, Canonical, Sitemap und Robots-Signale</li>
    <li>Titel, Description, H1 und Inhaltsstruktur</li>
    <li>interne Links, technische Erreichbarkeit und ausgewählte Performance-Signale</li>
  </ul>
</section>
<section class="tester-example">
  <h2>Beispielauswertung</h2>
  <p>Ein Befund wird als Problem, Auswirkung und nächster Schritt ausgegeben. Unsichere oder nicht öffentlich prüfbare Punkte werden ausdrücklich als Grenze markiert.</p>
</section>
```

- [ ] **Step 5: Passenden Folgeschritt setzen**

```ejs
<a class="btn btn-primary" href="/leistungen/website-audit">
  Website-Audit ansehen
</a>
```

Der allgemeine Kontaktlink bleibt sekundär. Die Aussage über „sechsstelligen monatlichen Traffic“ wird ersatzlos entfernt.

- [ ] **Step 6: Tests ausführen**

Run:

```bash
node --test tests/testerSeoContent.test.js tests/seoTesterLeadService.test.js tests/websiteTesterLeadService.test.js tests/testerSpamProtection.test.js
```

Expected: PASS.

- [ ] **Step 7: Manuell prüfen**

- `/website-tester` ohne Anmeldung öffnen.
- `/website-tester/seo` ohne Anmeldung öffnen.
- jeweils einen Test mit einer öffentlichen URL starten.
- Ergebnis, Methodik, Beispiel und Audit-Link auf Mobil und Desktop prüfen.
- sicherstellen, dass der Tester weiterhin ohne Verkaufszwang nutzbar ist.

- [ ] **Step 8: Commit**

```bash
git add controllers/testController.js views/test.ejs views/seo_tester.ejs tests
git commit -m "feat: Tester-Snippets und Audit-Übergänge verbessern"
```

---

### Task 10: LCP, Bildprioritäten und Barrierefreiheitsfehler verbessern

**Files:**
- Modify: `views/index.ejs`
- Modify: `views/partials/head.ejs`
- Modify: `public/home.css`
- Create: `tests/homePerformance.test.js`
- Modify: `tests/homeHeroSequence.test.js`
- Modify: `tests/mobileDesignRegression.test.js`

**Interfaces:**
- Produces: genau ein priorisiertes LCP-Bild im Startseiten-Hero
- Produces: Startseiten-Hauptinhalt ist ohne JavaScript sichtbar
- Produces: LCP-Ziel unter 2,5 Sekunden unter reproduzierbaren mobilen Lighthouse-Bedingungen

- [ ] **Step 1: Failing Performance-Test schreiben**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const view = readFileSync(new URL('../views/index.ejs', import.meta.url), 'utf8');
const head = readFileSync(new URL('../views/partials/head.ejs', import.meta.url), 'utf8');
const css = readFileSync(new URL('../public/home.css', import.meta.url), 'utf8');

test('nur das wahrscheinliche LCP-Bild lädt eager und high priority', () => {
  assert.match(view, /home-hero-klarblick-desktop\.webp[^>]+fetchpriority="high"[^>]+loading="eager"/);
  assert.match(view, /home-hero-klarblick-termin-crop\.webp[^>]+fetchpriority="low"[^>]+loading="lazy"/);
  assert.match(view, /home-hero-klarblick-mobile-screen\.webp[^>]+fetchpriority="low"[^>]+loading="lazy"/);
});

test('LCP-Inhalt ist vor Animations-JavaScript sichtbar', () => {
  assert.match(css, /\.home-hero-showcase__main\s*\{[\s\S]*?opacity:\s*1/);
  assert.doesNotMatch(css, /\.home-hero-showcase__main[\s\S]{0,300}opacity:\s*0/);
});

test('Head lädt höchstens drei projektspezifische Fonts vor', () => {
  const matches = head.match(/rel="preload"[^>]+as="font"/g) || [];
  assert.ok(matches.length <= 3, `zu viele Font-Preloads: ${matches.length}`);
});
```

- [ ] **Step 2: Test ausführen und Fehlschlag bestätigen**

Run:

```bash
node --test tests/homePerformance.test.js
```

Expected: FAIL wegen drei eager geladenen Hero-Bildern und zu vielen Font-Preloads.

- [ ] **Step 3: Hero-Ladeprioritäten korrigieren**

Das Desktop-Hauptbild bleibt:

```html
fetchpriority="high" loading="eager" decoding="async"
```

Termin- und Telefonbild erhalten:

```html
fetchpriority="low" loading="lazy" decoding="async"
```

Das Hauptbild besitzt einen sofort sichtbaren CSS-Zustand. Nur Detail- und Telefonkarte dürfen zeitversetzt animieren. Bei `prefers-reduced-motion: reduce` gibt es keine Startanimation.

- [ ] **Step 4: Schrift-Preloads reduzieren**

In `views/partials/head.ejs` bleiben als globale Preloads:

```text
fa-solid-900.woff2
inter-v19-latin-regular.woff2
poppins-v23-latin-700.woff2
```

`inter-v19-latin-600.woff2` und `poppins-v23-latin-regular.woff2` werden nicht global vorgeladen. Sie bleiben über CSS verfügbar.

- [ ] **Step 5: Gefundene Barrierefreiheitsfehler auf Kernseiten beheben**

Lighthouse-Funde werden einzeln dokumentiert und mindestens diese Fehlerklassen korrigiert:

- verbotene ARIA-Attribute,
- Rollen ohne passende semantische Elemente,
- unzureichender Farbkontrast,
- übersprungene Überschriftenebenen.

Keine ARIA-Rolle wird ergänzt, wenn ein korrektes natives HTML-Element ausreicht.

- [ ] **Step 6: Tests und Build ausführen**

Run:

```bash
node --test tests/homePerformance.test.js tests/homeHeroSequence.test.js tests/mobileDesignRegression.test.js tests/heroBreadcrumbRegression.test.js
npm run build
```

Expected: PASS.

- [ ] **Step 7: Lighthouse messen**

Run:

```bash
npx lighthouse http://127.0.0.1:3000 --only-categories=performance,accessibility,seo,best-practices --form-factor=mobile --output=json --output-path=artifacts/lighthouse-home-after.json --chrome-flags="--headless"
```

Expected:

- Performance mindestens 90,
- SEO 100,
- Best Practices 100,
- Barrierefreiheit mindestens 95,
- LCP unter 2,5 Sekunden.

Wenn LCP weiterhin über 2,5 Sekunden liegt, den im Bericht benannten LCP-Knoten und seine `loadDelay`-/`renderDelay`-Anteile dokumentieren und ausschließlich diesen Engpass in einem separaten Commit beheben.

- [ ] **Step 8: Commit**

```bash
git add views/index.ejs views/partials/head.ejs public/home.css tests
git commit -m "perf: LCP und Barrierefreiheit der Kernseiten verbessern"
```

---

### Task 11: Externe Reichweite und lokale Autorität parallel aufbauen

**Files:**
- Create: `docs/seo/2026-07-26-reichweitenarbeit.md`
- Reference: `data/referenceProjects.js`
- Reference: bestehendes Google-Unternehmensprofil

**Interfaces:**
- Produces: wöchentliche externe Reichweitenliste mit Verantwortlichem, Ziel, Status, Datum und Nachweis
- Produces: wiederverwendbare Bewertungs- und Partnertexte
- Keine automatisierten externen Schreibaktionen

- [ ] **Step 1: Reichweitendokument strukturieren**

```text
Maßnahme | Ziel | Verantwortlich | Fällig | Status | Nachweis-URL | Ergebnis
```

Bereiche:

1. Google-Unternehmensprofil
2. Kundenbewertungen
3. Kunden- und Partnerlinks
4. lokale Unternehmensprofile
5. Verteilung vorhandener Inhalte
6. optionale bezahlte Suche

- [ ] **Step 2: Google-Unternehmensprofil prüfen**

Verbindliche Checkliste:

- Hauptkategorie beschreibt Webdesign beziehungsweise Webdesigner.
- Website-URL zeigt direkt auf `https://www.komplettwebdesign.de/`.
- Leistungsgebiet Berlin und Brandenburg ist konsistent.
- Telefonnummer, E-Mail und Öffnungs-/Kontaktzeiten stimmen mit der Website überein.
- Leistungen verlinken nur auf bestehende kanonische Seiten.
- Es werden keine Ranking-, Rechts- oder Erfolgsgarantien verwendet.
- Neue Fotos zeigen reale Arbeit oder reale Arbeitsumgebung.

Jede Abweichung erhält im Dokument einen eigenen Eintrag. Änderungen am Google-Konto werden nur nach ausdrücklichem Nutzerzugang beziehungsweise durch den Nutzer vorgenommen.

- [ ] **Step 3: Echte Bewertungen anfragen**

Nachricht:

```text
Hallo, danke noch einmal für die Zusammenarbeit. Wenn du mit dem Projekt und meiner Betreuung zufrieden warst, würde mir eine ehrliche Google-Bewertung sehr helfen. Beschreibe gern kurz, welche Ausgangslage du hattest, was umgesetzt wurde und wie du die Zusammenarbeit erlebt hast. Es gibt selbstverständlich keine Vorgabe für die Bewertung und keine Gegenleistung.
```

Pro Woche werden höchstens drei tatsächlich betreute Kunden angeschrieben. Keine gekauften oder erfundenen Bewertungen.

- [ ] **Step 4: Partner- und Kundenverlinkungen anfragen**

Nachricht:

```text
Hallo, ich habe das gemeinsame Projekt in meinen Referenzen aufgenommen. Falls ihr auf eurer Website eine Partner-, Projekt- oder Anbieterübersicht pflegt, könnt ihr Komplett Webdesign dort gern als Webdesign-Partner mit einem Link auf https://www.komplettwebdesign.de/webdesign-berlin nennen. Der Link sollte nur gesetzt werden, wenn er für eure Besucher inhaltlich passt.
```

Priorität haben reale Referenzkunden und bestehende Partner. Es werden keine Links gekauft.

- [ ] **Step 5: Vorhandene Inhalte verteilen**

Wöchentliche Reihenfolge:

1. eine vorhandene Referenz,
2. eine aktualisierte Kosten- oder Paketinformation,
3. ein hilfreicher Tester oder Audit-Hinweis,
4. eine konkrete Branchenlösung.

Jeder Beitrag verlinkt nur auf die fachlich passende bestehende Seite. Derselbe Text wird nicht automatisiert in zahlreiche Verzeichnisse kopiert.

- [ ] **Step 6: Optionale bezahlte Suche abgrenzen**

Eine Suchkampagne darf erst nach Welle 2 geplant werden. Erlaubte Zielbegriffe:

```text
website erstellen lassen berlin
webdesign berlin kleine unternehmen
website relaunch berlin
website wartung berlin
```

Negative Begriffe:

```text
kostenlos
selber machen
job
ausbildung
vorlage
template
wordpress theme
baukasten
kurs
```

Anzeigen führen ausschließlich auf die passende bestehende Zielseite. Der Website-Tester wird nicht mit kommerziellen Webdesign-Keywords beworben.

- [ ] **Step 7: Dokument prüfen und committen**

Run:

```bash
rg -n "später ausfüllen|offen ergänzen|Ranking garantiert|Besucher garantiert" docs/seo/2026-07-26-reichweitenarbeit.md
```

Expected: keine unfertigen Punkte und keine verbotenen Zusagen.

```bash
git add docs/seo/2026-07-26-reichweitenarbeit.md
git commit -m "docs: externe SEO-Reichweitenarbeit planen"
```

---

### Task 12: Vollständige technische Abnahme und gestaffelte Veröffentlichung

**Files:**
- Create: `docs/seo/2026-07-26-veroeffentlichungsprotokoll.md`
- Modify: keine Anwendungsdatei

**Interfaces:**
- Consumes: Audit aus Task 2 und Ergebnisse aller vorherigen Tasks
- Produces: prüfbares Abnahmeprotokoll pro Welle

- [ ] **Step 1: Arbeitsbaum und vollständige Tests prüfen**

Run:

```bash
git status --short
npm test
npm run build
```

Expected: nur beabsichtigte Änderungen; Tests und Build PASS.

- [ ] **Step 2: Lokalen vollständigen Audit ausführen**

Run:

```bash
npm run audit:seo-recovery -- --base-url http://127.0.0.1:3000 --out artifacts/seo-recovery-local-final.json --fail-on error
```

Expected:

- 0 Fehler,
- keine aktive Redirectquelle in der Sitemap,
- keine Redirectkette,
- kein Canonical auf eine Redirectquelle,
- genau eine H1 pro indexierbarer Seite,
- keine verwaiste priorisierte Zielseite,
- alle Registry-Pflichtlinks vorhanden.

- [ ] **Step 3: Manuelle Seitentypen prüfen**

Auf Mobil und Desktop:

```text
/
/webdesign-berlin
/website-erstellen-lassen-berlin
/pakete
/en/pakete
/leistungen/website-audit
/leistungen/website-wartung
/leistungen/local-seo
/branchen/webdesign-blumenladen
/blog/seo-fuer-blumenladen
/blog/website-kosten-2025-einfach-erklaert
/blog/website-kosten-2026-berlin-vergleich-2025
/website-tester
/website-tester/seo
```

Prüfen: Status, Canonical, Robots, H1, Hauptlinks, Navigation, Kontaktweg, Sprache und mobile Darstellung.

- [ ] **Step 4: Welle 1 veröffentlichen**

Welle 1 enthält nur Tasks 1 bis 4. Nach Deployment:

```bash
npm run audit:seo-recovery -- --base-url https://www.komplettwebdesign.de --out artifacts/seo-wave-1-live.json --fail-on error
```

Erwartet: keine Fehler. Das Datum und der Commit werden im Veröffentlichungsprotokoll notiert.

- [ ] **Step 5: Welle 2 veröffentlichen**

Welle 2 enthält Tasks 5 bis 9. Erst veröffentlichen, wenn Welle 1 mindestens 48 Stunden ohne technische Regression live war.

Nach Deployment denselben Live-Audit mit `seo-wave-2-live.json` ausführen und die dynamischen Contentänderungen separat im Protokoll bestätigen.

- [ ] **Step 6: Welle 3 veröffentlichen**

Welle 3 enthält Task 10. Task 11 läuft parallel als externe Arbeit und ist kein Deployment.

Lighthouse- und Live-Audit-Dateien im Protokoll mit Datum und Commit referenzieren.

- [ ] **Step 7: Search Console aktualisieren**

- neue Sitemap einmal einreichen,
- `/webdesign-berlin` inspizieren,
- Redirectquelle `/website-erstellen-lassen-berlin` inspizieren,
- etablierten Kostenartikel inspizieren,
- Redirectquelle des Kostenartikels inspizieren,
- Blumenladen-Branchenseite und Blogartikel inspizieren.

Keine massenhafte manuelle Indexierungsanforderung für alle 123 Seiten.

- [ ] **Step 8: Veröffentlichungsprotokoll committen**

```bash
git add docs/seo/2026-07-26-veroeffentlichungsprotokoll.md
git commit -m "docs: SEO-Sanierung technisch abnehmen"
```

---

### Task 13: 28-Tage-Auswertung und Conversion-Gate

**Files:**
- Modify: `docs/seo/2026-07-26-veroeffentlichungsprotokoll.md`
- Create only after threshold: `docs/superpowers/specs/conversion-prioritaetsseiten-design.md`

**Interfaces:**
- Consumes: `content_search_metrics` aus Search Console
- Produces: Vergleich vollständiger 28-Tage-Zeiträume
- Produces: Conversion-Spezifikation erst ab mindestens 100 nicht markenbezogenen organischen Klicks auf einer Zielseite in 28 Tagen

- [ ] **Step 1: Störungsfenster seit dem Relaunch festhalten**

```sql
SELECT
  page_url,
  SUM(clicks) AS clicks,
  SUM(impressions) AS impressions,
  ROUND(
    SUM(average_position * impressions) / NULLIF(SUM(impressions), 0),
    2
  ) AS weighted_position
FROM content_search_metrics
WHERE metric_date BETWEEN DATE '2026-06-17' AND DATE '2026-07-23'
GROUP BY page_url
ORDER BY impressions DESC;
```

Die bekannten Werte dieses 37-Tage-Störungsfensters werden im Protokoll festgehalten:

```text
28.053 Impressionen
0 Klicks
27.254 Impressionen auf Position 41+
```

Diese Werte erklären den Einbruch seit dem 17.06., dienen aber wegen der Länge von 37 Tagen nicht als direkter 28-Tage-Vergleich.

- [ ] **Step 2: Vollständige 28-Tage-Vergleichsbasis festhalten**

Das letzte vollständig synchronisierte 28-Tage-Fenster vor Welle 2 wird mit den Sync-Tagen bestimmt:

```sql
WITH bounds AS (
  SELECT MAX(metric_date)::date AS end_date
  FROM content_search_metric_sync_days
  WHERE metric_date < $1::date
)
SELECT
  page_url,
  SUM(clicks) AS clicks,
  SUM(impressions) AS impressions,
  ROUND(
    SUM(average_position * impressions) / NULLIF(SUM(impressions), 0),
    2
  ) AS weighted_position
FROM content_search_metrics, bounds
WHERE metric_date BETWEEN bounds.end_date - 27 AND bounds.end_date
GROUP BY page_url
ORDER BY impressions DESC;
```

`$1` ist das Live-Datum von Welle 2. Im Protokoll werden Startdatum, Enddatum und das Vorhandensein aller 28 Sync-Tage festgehalten.

- [ ] **Step 3: Erstes vollständiges Nachher-Fenster auswerten**

28 vollständige Tage nach Welle 2 dieselbe Abfrage mit dem neuen Datumsfenster ausführen. Zusätzlich nach Query und Zielseite gruppieren.

Bewertet werden:

- nicht markenbezogene Klicks auf aktive kommerzielle Seiten,
- Impressionen auf Position 1 bis 10 und 11 bis 20,
- gewichtete Position der Kernseiten,
- Klicks und Positionen der Blumenladen-Seiten,
- Klicks der Kosten- und Tester-Inhalte,
- Anzahl qualifizierter Anfragen aus Formularen, E-Mails und Anrufen als Gesamtwert.

- [ ] **Step 4: Entscheidung nach festen Regeln treffen**

```text
Position steigt, Impressionen steigen, Klicks fehlen:
Titel und Description einmalig nachschärfen.

Position und Impressionen steigen:
Seite stabil lassen; keine neue URL erstellen.

Position stagniert trotz vollständiger Onpage-Sanierung:
externe Autorität, Referenzen und Links priorisieren.

Zwei Seiten ranken wieder für dieselbe Kaufabsicht:
Intent-Registry und interne Links korrigieren; keine dritte Seite erstellen.

Seite erhält keine Impressionen und besitzt keinen Geschäfts- oder Informationswert:
Konsolidierung oder noindex in einer eigenen geprüften Änderung planen.
```

- [ ] **Step 5: Acht-Wochen-Gate für neue Seiten anwenden**

Eine neue Seite ist nur zulässig, wenn alle sechs Bedingungen aus Abschnitt 14 der Spezifikation dokumentiert erfüllt sind. Andernfalls wird die bestehende passendste Seite weiter verbessert.

- [ ] **Step 6: Conversion-Schwelle prüfen**

```sql
SELECT
  page_url,
  SUM(clicks) AS non_brand_clicks
FROM content_search_metrics
WHERE metric_date BETWEEN $1::date AND $2::date
  AND query !~* '(komplett\\s*webdesign|komplettwebdesign)'
GROUP BY page_url
HAVING SUM(clicks) >= 100
ORDER BY non_brand_clicks DESC;
```

Nur für zurückgegebene Zielseiten wird eine vertiefte Conversion-Spezifikation erstellt. Bis dahin bleiben Änderungen auf klare Angebote, Belege, funktionierende Kontaktwege und einen primären nächsten Schritt begrenzt.

- [ ] **Step 7: Anfrageentwicklung beurteilen**

Die Gesamtzahl qualifizierter Anfragen wird für dasselbe 28-Tage-Fenster mit dem vorherigen Fenster verglichen. Ohne GA4 wird keine unbelegte Zuordnung einer einzelnen Anfrage zu einer bestimmten organischen Landingpage vorgenommen.

- [ ] **Step 8: Ergebnis protokollieren und committen**

```bash
git add docs/seo/2026-07-26-veroeffentlichungsprotokoll.md
git commit -m "docs: erstes SEO-Recovery-Fenster auswerten"
```

---

## Gesamtabnahme

Der Plan ist vollständig umgesetzt, wenn:

- `/website-erstellen-lassen-berlin` direkt auf `/webdesign-berlin` weiterleitet,
- die neue Berliner Hauptseite den hilfreichen Inhalt der alten Seite übernommen hat,
- Startseite und Berliner Hauptseite unterschiedliche primäre Zuständigkeiten besitzen,
- der doppelte neue Kostenartikel direkt auf den aktualisierten etablierten Artikel weiterleitet,
- englische Paketseiten bis zur Vollübersetzung `noindex,follow` sind und nicht in der Sitemap stehen,
- Blogartikel über echte serverseitige Paginierungslinks erreichbar sind,
- keine priorisierte indexierbare Seite verwaist ist,
- Blumenladen-Informations- und Kaufabsicht getrennt sind und sich gegenseitig passend verlinken,
- Tester klare Snippets, Methodik, Beispiel und Audit-Übergang besitzen,
- der lokale und produktive SEO-Recovery-Audit 0 Fehler melden,
- priorisierte mobile Seiten einen LCP unter 2,5 Sekunden erreichen oder eine konkret dokumentierte Restursache besitzen,
- externe Reichweitenarbeit mit echten Bewertungen, Partnern und Nachweisen begonnen hat,
- acht Wochen lang keine neue SEO-Zielseite veröffentlicht wurde,
- die erste vollständige 28-Tage-Auswertung dokumentiert ist,
- vertiefte Conversion-Arbeit nur für Seiten oberhalb der festgelegten Traffic-Schwelle geplant wird.
