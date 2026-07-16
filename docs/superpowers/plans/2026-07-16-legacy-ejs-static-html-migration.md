# Legacy-EJS zu statischem HTML – Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Veröffentlichte `legacy_ejs`-Blogartikel kontrolliert, nachvollziehbar und rücknehmbar in `static_html` umwandeln, damit sie anschließend über die bestehende KI-Bestandsoptimierung bearbeitet werden können.

**Architecture:** Ein additiver Migrationsdatensatz speichert Originalinhalt, statischen Kandidaten, Hashes, Analyse und Freigabestatus. Ein reiner Scan klassifiziert Artikel, ein isolierter EJS-Renderer löst aktive Templates auf, eine Legacy-Normalisierung erhält kompatible HTML-Strukturen, und transaktionale PostgreSQL-Operationen führen Einzel-, Sammel- und Rücknahmepfade aus. Die Adminoberfläche zeigt Scanstatus, Blocker sowie eine geschützte Vorher-Nachher-Vorschau; kein Scan und keine Vorschau verändert den Liveartikel.

**Tech Stack:** Node.js ESM, Express 5, EJS 3, `node:vm`, Cheerio, `sanitize-html`, PostgreSQL 16, `pg`, Bootstrap 5, Node-Test-Runner, bestehender Content-Agent-Adminbereich.

## Global Constraints

- Alle öffentlichen Slugs, URLs, Veröffentlichungszustände, Veröffentlichungszeitpunkte, Kategorien, Beitragsbilder und GSC-Historien bleiben unverändert.
- Kein Scan, keine Vorschau und kein Deployment darf einen Artikel automatisch migrieren.
- Der ursprüngliche `legacy_ejs`-Inhalt wird vor jeder Umstellung dauerhaft in `content_legacy_migrations.source_content` gespeichert.
- Eine automatische Rücknahme ist nur erlaubt, wenn der Livehash noch dem unmittelbar nach der Migration gespeicherten Hash entspricht und seitdem keine Revision oder Optimierung angelegt wurde.
- Offene Draft-Revisionen sowie Jobs vom Typ `optimize_existing_post` mit `queued`, `running` oder `needs_manual_attention` blockieren Migration und Rücknahme.
- EJS-Includes, Datei-, Netzwerk-, Prozess- und dynamische Codezugriffe sind verboten.
- Statische Kandidaten dürfen keine EJS-Tags, Event-Handler, Formulare, unbekannten Skripte oder unkontrollierte Styles enthalten.
- Preis-Tokens des bestehenden Preisrenderers bleiben als Tokens gespeichert und werden nicht mit einem momentanen Preiswert festgeschrieben.
- Die Vorschau setzt `X-Robots-Tag: noindex, nofollow`, `Cache-Control: no-store` und führt den statischen Kandidaten niemals als EJS aus.
- Es werden keine OpenAI-, GSC-, Cloudinary- oder sonstigen externen Provider für diese technische Migration aufgerufen.
- Es entstehen keine neuen `.env`-Variablen und keine Änderung an `docker-compose.yml`.
- `public/admin.css` ist die bearbeitete Quelle; `public/admin.min.css` wird ausschließlich über `npm run build:css` erzeugt.
- Eine Produktionsprüfung am 16. Juli 2026 ergab 34 veröffentlichte `legacy_ejs`-Artikel: 25 ohne aktive EJS-Tags und 9 mit aktivem EJS.
- Die 25 EJS-freien Artikel sind Migrationskandidaten, aber nicht vorab als stapelfähig zu behandeln: Der heutige Sanitizer erhält nur einen Kandidaten unverändert. Die Legacy-Normalisierung muss sichere Bilder, Codeblöcke, Tabellenbestandteile und semantische Wrapper erhalten; `<style>`, unbekannte JSON-LD-Blöcke und funktionsabhängige Buttons bleiben Einzelprüfungs- oder Blockerfälle.
- Die Sammelaktion verarbeitet ausschließlich `migration_class = static_legacy` und `status = ready`; die Anzahl wird niemals auf 25 fest codiert.

---

## Geplante Dateistruktur

| Datei | Verantwortung |
|---|---|
| `scripts/migrations/015_create_legacy_content_migrations.sql` | Additive Audit-, Vorschau- und Zustandsdaten für Legacy-Migrationen |
| `services/contentAgent/contentPostLiveState.js` | Kanonischer Livezustand und SHA-256-Livehash |
| `services/contentAgent/legacyEjsRenderService.js` | Kontrollierte Legacy-Locals, EJS-Inspektion und isoliertes Rendering |
| `services/contentAgent/legacyStaticHtmlNormalizer.js` | HTML-Kompatibilitätsnormalisierung, JSON-LD-Behandlung und Verlustanalyse |
| `services/contentAgent/legacyContentMigrationAnalysisService.js` | Klassifizierung, Kandidatenerstellung, Vergleich und Blocker |
| `repositories/contentLegacyMigrationRepository.js` | Scanpersistenz, Dashboardabfragen, atomare Migration und Rücknahme |
| `services/contentAgent/legacyContentMigrationService.js` | Anwendungsfälle Scan, Vorschau, Einzelmigration, Sammelmigration und Rücknahme |
| `views/admin/contentAgent/_legacyMigrationDashboard.ejs` | Legacy-Migrationsübersicht im Bestand |
| `views/admin/contentAgent/legacyMigrationPreview.ejs` | Geschützte Vorher-Nachher-Ansicht |
| `tests/fixtures/legacyContent/*` | Reproduzierbare Legacy-HTML- und EJS-Beispiele |

## Verbindliche Schnittstellen

```js
// services/contentAgent/contentPostLiveState.js
export function canonicalContentPostLiveState(post) {}
export function liveHashForContentPost(post) {}

// services/contentAgent/legacyEjsRenderService.js
export function buildLegacyRenderLocals({ post, publishedISO, modifiedISO }) {}
export function inspectLegacyEjsTemplate(template) {}
export function renderLegacyEjsStrict({ template, locals, timeoutMs = 100 }) {}

// services/contentAgent/legacyStaticHtmlNormalizer.js
export function normalizeLegacyStaticHtml({
  html,
  faqJson,
  allowedInternalLinks
}) {}

// services/contentAgent/legacyContentMigrationAnalysisService.js
export function createLegacyContentMigrationAnalysisService({
  blogPostPresentation,
  normalizer,
  strictRenderer
}) {}
// Rückgabe analyzePost(...):
// {
//   postId, migrationClass, status, baseLiveHash, sourceContent,
//   renderedStaticHtml, renderContext, analysis, blockingIssues, sanitizerReport
// }

// repositories/contentLegacyMigrationRepository.js
export function createContentLegacyMigrationRepository(db) {}

// services/contentAgent/legacyContentMigrationService.js
export function createLegacyContentMigrationService({
  repository,
  analysisService,
  blogPostPresentation
}) {}
```

---

### Task 1: Additives Datenmodell und Migrationsrunner

**Files:**
- Create: `scripts/migrations/015_create_legacy_content_migrations.sql`
- Create: `tests/contentLegacyMigrationMigration.test.js`
- Modify: `scripts/runContentAgentMigration.js:5-18`
- Modify: `tests/contentAgentMigration.test.js`
- Modify: `tests/contentAgentMigration006.test.js`
- Modify: `tests/contentWeeklyTopicPoolMigration.test.js`
- Modify: `tests/contentSearchMetricsMigration.test.js`
- Modify: `tests/contentLearningMigration.test.js`
- Modify: `tests/contentExistingPostAdminPreferencesMigration.test.js`

**Interfaces:**
- Consumes: Tabelle `posts` aus dem bestehenden Schema.
- Produces: Tabelle `content_legacy_migrations` und Runnerbereich `002 bis 015`.

- [ ] **Step 1: Schreibe den fehlschlagenden Migrationstest**

```js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(
  new URL('../scripts/migrations/015_create_legacy_content_migrations.sql', import.meta.url),
  'utf8'
);
const runner = readFileSync(
  new URL('../scripts/runContentAgentMigration.js', import.meta.url),
  'utf8'
);

test('Migration 015 legt den vollständigen Legacy-Migrationsaudit additiv an', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS content_legacy_migrations/i);
  for (const column of [
    'post_id', 'status', 'migration_class', 'base_live_hash',
    'migrated_live_hash', 'source_content_format', 'source_content',
    'rendered_static_html', 'render_context_json', 'analysis_json',
    'blocking_issues_json', 'sanitizer_report_json', 'created_by',
    'approved_by', 'rolled_back_by', 'created_at', 'updated_at',
    'migrated_at', 'rolled_back_at'
  ]) {
    assert.match(migration, new RegExp(`\\b${column}\\b`, 'i'));
  }
  assert.match(migration, /WHERE status IN \('scanned', 'ready', 'blocked'\)/i);
  assert.doesNotMatch(migration, /DROP\s+(?:TABLE|COLUMN)|TRUNCATE|DELETE\s+FROM/i);
});

test('Migrationsrunner führt 015 direkt nach 014 aus', () => {
  assert.ok(
    runner.indexOf('015_create_legacy_content_migrations.sql')
      > runner.indexOf('014_create_existing_content_admin_preferences.sql')
  );
  assert.match(runner, /Migration 002 bis 015 erfolgreich/);
  assert.match(runner, /Migration 002 bis 015 fehlgeschlagen/);
});
```

- [ ] **Step 2: Führe den Test aus und bestätige den erwarteten Fehler**

Run:

```bash
node --test tests/contentLegacyMigrationMigration.test.js
```

Expected: FAIL, weil Migration 015 und die Runnerreferenz noch fehlen.

- [ ] **Step 3: Lege die additive SQL-Migration an**

```sql
CREATE TABLE IF NOT EXISTS content_legacy_migrations (
  id BIGSERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE RESTRICT,
  status VARCHAR(24) NOT NULL CHECK (
    status IN ('scanned', 'ready', 'blocked', 'migrated', 'rolled_back', 'stale', 'failed')
  ),
  migration_class VARCHAR(24) NOT NULL CHECK (
    migration_class IN ('static_legacy', 'active_ejs')
  ),
  base_live_hash CHAR(64) NOT NULL CHECK (base_live_hash ~ '^[0-9a-f]{64}$'),
  migrated_live_hash CHAR(64) CHECK (
    migrated_live_hash IS NULL OR migrated_live_hash ~ '^[0-9a-f]{64}$'
  ),
  source_content_format VARCHAR(24) NOT NULL DEFAULT 'legacy_ejs'
    CHECK (source_content_format = 'legacy_ejs'),
  source_content TEXT NOT NULL,
  rendered_static_html TEXT,
  render_context_json JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(render_context_json) = 'object'),
  analysis_json JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(analysis_json) = 'object'),
  blocking_issues_json JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(blocking_issues_json) = 'array'),
  sanitizer_report_json JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(sanitizer_report_json) = 'object'),
  created_by BIGINT NOT NULL,
  approved_by BIGINT,
  rolled_back_by BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  migrated_at TIMESTAMPTZ,
  rolled_back_at TIMESTAMPTZ,
  CHECK (
    (status = 'migrated' AND migrated_at IS NOT NULL AND approved_by IS NOT NULL
      AND migrated_live_hash IS NOT NULL)
    OR status <> 'migrated'
  ),
  CHECK (
    (status = 'rolled_back' AND rolled_back_at IS NOT NULL AND rolled_back_by IS NOT NULL)
    OR status <> 'rolled_back'
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_content_legacy_migrations_open_post
  ON content_legacy_migrations (post_id)
  WHERE status IN ('scanned', 'ready', 'blocked');

CREATE INDEX IF NOT EXISTS idx_content_legacy_migrations_post_history
  ON content_legacy_migrations (post_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_content_legacy_migrations_dashboard
  ON content_legacy_migrations (status, migration_class, updated_at DESC);
```

- [ ] **Step 4: Ergänze Migration 015 im Runner und aktualisiere alle Bereichstests**

```js
const MIGRATIONS = [
  // bestehende Einträge 002 bis 014 unverändert
  './migrations/014_create_existing_content_admin_preferences.sql',
  './migrations/015_create_legacy_content_migrations.sql'
];
```

Die beiden Statusmeldungen lauten danach exakt:

```js
console.log('Content-Agent-Migration 002 bis 015 erfolgreich.');
console.error('Content-Agent-Migration 002 bis 015 fehlgeschlagen:', error.message);
```

Alle Tests, die aktuell `002 bis 014` erwarten, werden auf `002 bis 015` geändert; die Reihenfolge 014 vor 015 bleibt jeweils ausdrücklich geprüft.

- [ ] **Step 5: Führe die fokussierten Migrationstests aus**

Run:

```bash
node --test \
  tests/contentLegacyMigrationMigration.test.js \
  tests/contentAgentMigration.test.js \
  tests/contentAgentMigration006.test.js \
  tests/contentWeeklyTopicPoolMigration.test.js \
  tests/contentSearchMetricsMigration.test.js \
  tests/contentLearningMigration.test.js \
  tests/contentExistingPostAdminPreferencesMigration.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/migrations/015_create_legacy_content_migrations.sql \
  scripts/runContentAgentMigration.js \
  tests/contentLegacyMigrationMigration.test.js \
  tests/contentAgentMigration.test.js \
  tests/contentAgentMigration006.test.js \
  tests/contentWeeklyTopicPoolMigration.test.js \
  tests/contentSearchMetricsMigration.test.js \
  tests/contentLearningMigration.test.js \
  tests/contentExistingPostAdminPreferencesMigration.test.js
git commit -m "feat: Legacy-Migrationsaudit anlegen"
```

---

### Task 2: Gemeinsamen Livehash aus dem Revisionsservice ausgliedern

**Files:**
- Create: `services/contentAgent/contentPostLiveState.js`
- Create: `tests/contentPostLiveState.test.js`
- Modify: `services/contentAgent/contentRevisionService.js:1-55`
- Modify: `tests/contentRevisionService.test.js`

**Interfaces:**
- Consumes: Veröffentlichte Post-Objekte mit den bestehenden editierbaren Feldern.
- Produces: `canonicalContentPostLiveState(post)` und `liveHashForContentPost(post)`.

- [ ] **Step 1: Schreibe Tests für kanonischen Zustand und Hashstabilität**

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canonicalContentPostLiveState,
  liveHashForContentPost
} from '../services/contentAgent/contentPostLiveState.js';

const post = {
  id: 7,
  slug: 'legacy-artikel',
  content_format: 'legacy_ejs',
  updated_at: '2026-07-16T08:00:00.000Z',
  title: 'Titel',
  excerpt: 'Kurz',
  content: '<p>Inhalt</p>',
  meta_title: 'Meta',
  meta_description: 'Beschreibung',
  og_title: 'OG',
  og_description: 'OG Beschreibung',
  faq_json: [{ question: 'Frage?', answer: 'Antwort.' }],
  image_url: '/uploads/bild.webp',
  image_alt: 'Alt'
};

test('Livezustand enthält nur migrationsrelevante Felder in kanonischer Form', () => {
  const state = canonicalContentPostLiveState(post);
  assert.equal(state.slug, 'legacy-artikel');
  assert.equal(state.content_format, 'legacy_ejs');
  assert.equal(state.fields.content, '<p>Inhalt</p>');
  assert.deepEqual(state.fields.faq_json, post.faq_json);
  assert.equal(Object.hasOwn(state, 'id'), false);
});

test('Livehash ist schlüsselreihenfolgeunabhängig und reagiert auf Inhaltsänderungen', () => {
  const reordered = Object.fromEntries(Object.entries(post).reverse());
  assert.equal(liveHashForContentPost(post), liveHashForContentPost(reordered));
  assert.notEqual(
    liveHashForContentPost(post),
    liveHashForContentPost({ ...post, content: '<p>Geändert</p>' })
  );
  assert.match(liveHashForContentPost(post), /^[0-9a-f]{64}$/);
});
```

- [ ] **Step 2: Führe den Test aus und bestätige den Importfehler**

Run:

```bash
node --test tests/contentPostLiveState.test.js
```

Expected: FAIL mit `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Verschiebe die bestehende kanonische Hashlogik in die neue Datei**

```js
import { createHash } from 'node:crypto';

const EDITABLE_FIELDS = Object.freeze([
  'title', 'excerpt', 'content', 'meta_title', 'meta_description',
  'og_title', 'og_description', 'faq_json', 'image_url', 'image_alt'
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
```

`contentRevisionService.js` importiert beide Funktionen. Der bisher exportierte Name bleibt für Rückwärtskompatibilität erhalten:

```js
import {
  canonicalContentPostLiveState,
  liveHashForContentPost
} from './contentPostLiveState.js';

export const liveHashForPost = liveHashForContentPost;
```

`createRevisionSnapshot` verwendet `canonicalContentPostLiveState(post)` und `liveHashForContentPost(post)`.

- [ ] **Step 4: Führe Hash- und Revisionsservicetests aus**

Run:

```bash
node --test tests/contentPostLiveState.test.js tests/contentRevisionService.test.js
```

Expected: PASS ohne Änderung bestehender Snapshot-Hashes.

- [ ] **Step 5: Commit**

```bash
git add services/contentAgent/contentPostLiveState.js \
  services/contentAgent/contentRevisionService.js \
  tests/contentPostLiveState.test.js \
  tests/contentRevisionService.test.js
git commit -m "refactor: Content-Livehash zentralisieren"
```

---

### Task 3: Legacy-kompatiblen HTML-Vertrag und Normalisierung einführen

**Files:**
- Create: `services/contentAgent/legacyStaticHtmlNormalizer.js`
- Create: `tests/legacyStaticHtmlNormalizer.test.js`
- Create: `tests/fixtures/legacyContent/static-compatibility.html`
- Create: `tests/fixtures/legacyContent/unknown-jsonld.html`
- Create: `tests/fixtures/legacyContent/unsafe-style.html`
- Modify: `services/contentAgent/articleSanitizer.js`
- Modify: `tests/contentAgentArticleValidator.test.js`

**Interfaces:**
- Consumes: HTML-Fragment, `faqJson`, erlaubte interne Links.
- Produces: `{ html, report }` mit deterministischen Transformationen, Warnungen, Blockern und Inventar.

`legacyStaticHtmlNormalizer.js` importiert `normalizeInternalHref` aus
`trustedInternalLinkService.js`. Dadurch verwenden Migration und bestehende
Bestandsoptimierung dieselbe Definition für vertrauenswürdige interne Links.

- [ ] **Step 1: Lege repräsentative Fixture-Inhalte an**

`tests/fixtures/legacyContent/static-compatibility.html`:

```html
<article class="legacy-article">
  <header><h1>Legacy-Titel</h1></header>
  <p>Einleitung<br>mit Umbruch und <u>Markierung</u>.</p>
  <figure>
    <picture>
      <source srcset="/images/legacy-640.webp 640w" type="image/webp">
      <img src="/images/legacy.webp" alt="Legacy-Bild" width="1200" height="675" loading="lazy">
    </picture>
    <figcaption>Bildbeschreibung</figcaption>
  </figure>
  <pre><code class="language-css">.card { display: grid; }</code></pre>
  <table><caption>Vergleich</caption><tbody><tr><td>Wert</td></tr></tbody></table>
  <a href="/kontakt" class="btn btn-primary">Kontakt aufnehmen</a>
</article>
```

`tests/fixtures/legacyContent/unknown-jsonld.html`:

```html
<p>Inhalt</p>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"Unbekannt"}</script>
```

`tests/fixtures/legacyContent/unsafe-style.html`:

```html
<style>.legacy-article { position: fixed; inset: 0; background: white; }</style>
<p>Inhalt</p>
```

- [ ] **Step 2: Schreibe die fehlschlagenden Normalisierungs- und Sanitizertests**

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { normalizeLegacyStaticHtml } from '../services/contentAgent/legacyStaticHtmlNormalizer.js';

test('Legacy-Normalisierung erhält sichere Bilder, Code und sichtbare Struktur', async () => {
  const html = await readFile(
    new URL('./fixtures/legacyContent/static-compatibility.html', import.meta.url),
    'utf8'
  );
  const result = normalizeLegacyStaticHtml({
    html,
    faqJson: [],
    allowedInternalLinks: ['/kontakt']
  });
  assert.deepEqual(result.report.blockers, []);
  assert.match(result.html, /<section class="legacy-article">/);
  assert.match(result.html, /<h2>Legacy-Titel<\/h2>/);
  assert.match(result.html, /<img[^>]+alt="Legacy-Bild"/);
  assert.match(result.html, /<pre><code class="language-css">/);
  assert.match(result.html, /<caption>Vergleich<\/caption>/);
  assert.doesNotMatch(result.html, /<h1|<article|<header/i);
});

test('unbekanntes JSON-LD blockiert die Migration', async () => {
  const html = await readFile(
    new URL('./fixtures/legacyContent/unknown-jsonld.html', import.meta.url),
    'utf8'
  );
  const result = normalizeLegacyStaticHtml({
    html,
    faqJson: [],
    allowedInternalLinks: []
  });
  assert.ok(result.report.blockers.some(({ code }) => code === 'legacy_jsonld_unknown'));
});

test('eingebettete Styles werden nicht stillschweigend entfernt', async () => {
  const html = await readFile(
    new URL('./fixtures/legacyContent/unsafe-style.html', import.meta.url),
    'utf8'
  );
  const result = normalizeLegacyStaticHtml({
    html,
    faqJson: [],
    allowedInternalLinks: []
  });
  assert.ok(result.report.blockers.some(({ code }) => code === 'legacy_style_block'));
});
```

- [ ] **Step 3: Führe die Tests aus und bestätige den erwarteten Fehler**

Run:

```bash
node --test tests/legacyStaticHtmlNormalizer.test.js
```

Expected: FAIL, weil Normalizer und Legacy-Allowlist noch fehlen.

- [ ] **Step 4: Erweitere den Sanitizer ausschließlich um sichere Darstellungs-Tags**

Die Allowlist erhält:

```js
const ALLOWED_TAGS = [
  'section', 'div', 'p', 'h2', 'h3', 'h4', 'h5',
  'ul', 'ol', 'li', 'strong', 'em', 'u', 'blockquote',
  'a', 'span', 'small', 'br', 'hr',
  'figure', 'figcaption', 'picture', 'source', 'img',
  'pre', 'code',
  'table', 'caption', 'thead', 'tbody', 'tr', 'th', 'td'
];

const COMMON_ATTRIBUTES = [
  'class', 'id', 'role', 'aria-*',
  'data-track', 'data-cta-name', 'data-cta-location',
  'data-faq-question', 'data-faq-answer'
];

const ALLOWED_ATTRIBUTES = {
  '*': COMMON_ATTRIBUTES,
  a: [...COMMON_ATTRIBUTES, 'href', 'title', 'target', 'rel'],
  img: [...COMMON_ATTRIBUTES, 'src', 'srcset', 'sizes', 'alt', 'width', 'height', 'loading', 'decoding'],
  source: [...COMMON_ATTRIBUTES, 'src', 'srcset', 'sizes', 'media', 'type'],
  th: [...COMMON_ATTRIBUTES, 'colspan', 'rowspan', 'scope'],
  td: [...COMMON_ATTRIBUTES, 'colspan', 'rowspan'],
  table: [...COMMON_ATTRIBUTES, 'summary']
};
```

Verboten bleiben ausdrücklich `html`, `head`, `body`, `main`, `article`, `header`, `h1`, `button`, `form`, `input`, `label`, `script`, `style`, `iframe`, `object`, `embed`, `svg` und alle `on*`-Attribute. `allowedSchemesByTag` erlaubt `http` und `https` für `a`, `img` und `source`; relative URLs bleiben zulässig, `data:`, `javascript:`, `file:` und protokollrelative URLs bleiben unzulässig.

- [ ] **Step 5: Implementiere die deterministische Legacy-Normalisierung**

Die Implementierung verwendet Cheerio und führt diese Reihenfolge aus:

```js
export function normalizeLegacyStaticHtml({
  html,
  faqJson = [],
  allowedInternalLinks = []
} = {}) {
  const source = String(html || '');
  const $ = cheerio.load(source, null, false);
  const transforms = [];
  const warnings = [];
  const blockers = [];

  $('style').each(() => {
    blockers.push(issue(
      'legacy_style_block',
      'Der Artikel enthält eingebettete Styles und benötigt eine Einzelprüfung.'
    ));
  });

  $('script').each((_, element) => {
    const type = String($(element).attr('type') || '').toLowerCase();
    if (type !== 'application/ld+json') {
      blockers.push(issue('legacy_script_unsafe', 'Nicht erlaubtes Script im Artikelinhalt.'));
      return;
    }
    const parsed = parseJsonLd($(element).text());
    if (parsed === null) {
      blockers.push(issue(
        'legacy_jsonld_invalid',
        'Das JSON-LD im Artikelinhalt ist syntaktisch ungültig.'
      ));
      return;
    }
    const types = jsonLdTypes(parsed);
    if (types.every((typeName) => ['BlogPosting', 'FAQPage'].includes(typeName))) {
      $(element).remove();
      transforms.push({ code: 'duplicate_jsonld_removed', count: 1 });
      return;
    }
    blockers.push(issue(
      'legacy_jsonld_unknown',
      'Nicht zuordenbare strukturierte Daten benötigen eine Einzelprüfung.'
    ));
  });

  $('article, main').each((_, element) => renameTag($, element, 'section'));
  $('header').each((_, element) => renameTag($, element, 'div'));
  $('h1').each((_, element) => renameTag($, element, 'h2'));
  $('h5').each((_, element) => renameTag($, element, 'h4'));
  $('label').each((_, element) => {
    if ($(element).attr('for')) {
      blockers.push(issue('legacy_form_control', 'Formularabhängiges Label gefunden.'));
    } else {
      renameTag($, element, 'span');
    }
  });

  $('button').each((_, element) => {
    const anchors = $(element).find('a');
    if (anchors.length !== 1 || $(element).text().trim() !== anchors.first().text().trim()) {
      blockers.push(issue('legacy_button_without_link', 'Button ohne eindeutiges Linkziel gefunden.'));
      return;
    }
    const anchor = anchors.first();
    const classes = [$(element).attr('class'), anchor.attr('class')].filter(Boolean).join(' ');
    anchor.attr('class', classes);
    $(element).replaceWith(anchor);
  });

  $('*').each((_, element) => {
    for (const name of Object.keys(element.attribs || {})) {
      if (/^on/i.test(name)) {
        blockers.push(issue('legacy_event_handler', `Event-Handler ${name} ist nicht erlaubt.`));
      }
    }
  });

  const normalizedBeforeSanitizer = $.html();
  const sanitized = sanitizeArticleHtml(normalizedBeforeSanitizer);
  const before = inventoryForHtml(normalizedBeforeSanitizer);
  const after = inventoryForHtml(sanitized);
  compareInventories({ before, after, allowedInternalLinks, faqJson, blockers, warnings });

  return {
    html: sanitized,
    report: {
      version: 1,
      transforms: compactCounts(transforms),
      warnings,
      blockers: uniqueIssues(blockers),
      before,
      after
    }
  };
}
```

Die Hilfsfunktionen werden in derselben Datei mit diesen Signaturen definiert:

```js
function issue(code, message, details = {}) {
  return { code, message, details };
}

function parseJsonLd(value) {
  try {
    return JSON.parse(String(value || ''));
  } catch {
    return null;
  }
}

function jsonLdTypes(value) {
  const nodes = Array.isArray(value)
    ? value
    : Array.isArray(value?.['@graph']) ? value['@graph'] : [value];
  return nodes
    .flatMap((node) => Array.isArray(node?.['@type']) ? node['@type'] : [node?.['@type']])
    .filter((type) => typeof type === 'string');
}

function renameTag($, element, tagName) {
  element.name = tagName;
  element.tagName = tagName;
}

function normalizedText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function inventoryForHtml(html) {
  const $ = cheerio.load(String(html || ''), null, false);
  return {
    visibleText: normalizedText($.root().text()),
    headings: $('h2, h3, h4, h5').map((_, element) => ({
      level: element.tagName,
      text: normalizedText($(element).text())
    })).get(),
    links: $('a[href]').map((_, element) => ({
      href: String($(element).attr('href') || ''),
      text: normalizedText($(element).text())
    })).get(),
    images: $('img').map((_, element) => ({
      src: String($(element).attr('src') || ''),
      alt: String($(element).attr('alt') || '')
    })).get(),
    ids: $('[id]').map((_, element) => String($(element).attr('id') || '')).get(),
    faqCount: $('[data-faq-question][data-faq-answer]').length,
    captions: $('caption, figcaption').map((_, element) => normalizedText($(element).text())).get(),
    priceTokens: [...String(html || '').matchAll(/\{\{[a-z0-9_.-]+\}\}/gi)]
      .map((match) => match[0])
  };
}

function compactCounts(items) {
  const counts = new Map();
  for (const item of items) counts.set(item.code, (counts.get(item.code) || 0) + 1);
  return [...counts].map(([code, count]) => ({ code, count }));
}

function uniqueIssues(items) {
  return [...new Map(items.map((item) => [
    `${item.code}:${JSON.stringify(item.details || {})}`,
    item
  ])).values()];
}
```

`parseJsonLd()` mit `null` erzeugt `legacy_jsonld_invalid`. `compareInventories()` vergleicht die sechs Array- beziehungsweise Textfelder exakt, normalisiert interne Links über `normalizeInternalHref`, prüft interne Ziele gegen `allowedInternalLinks` und erzeugt diese eindeutigen Blockercodes:

```js
const INVENTORY_BLOCKERS = Object.freeze({
  visibleText: 'legacy_visible_text_loss',
  headings: 'legacy_heading_loss',
  links: 'legacy_link_loss',
  images: 'legacy_image_loss',
  ids: 'legacy_id_loss',
  faqCount: 'legacy_faq_loss',
  captions: 'legacy_caption_loss',
  priceTokens: 'legacy_price_token_loss'
});

function compareInventories({
  before,
  after,
  allowedInternalLinks,
  faqJson,
  blockers,
  warnings
}) {
  for (const [field, code] of Object.entries(INVENTORY_BLOCKERS)) {
    if (JSON.stringify(before[field]) !== JSON.stringify(after[field])) {
      blockers.push(issue(code, `${field} wurde durch die Normalisierung verändert.`, {
        before: before[field],
        after: after[field]
      }));
    }
  }

  const allowed = new Set((allowedInternalLinks || []).map(String));
  for (const link of after.links) {
    if (!link.href.startsWith('/')) continue;
    const normalized = normalizeInternalHref(link.href);
    if (normalized.kind !== 'internal' || !allowed.has(normalized.path)) {
      blockers.push(issue(
        'legacy_internal_link_untrusted',
        'Ein internes Linkziel gehört nicht zum vertrauenswürdigen Linkinventar.',
        { href: link.href }
      ));
    }
  }

  if (Array.isArray(faqJson) && faqJson.length > 0 && after.faqCount === 0) {
    warnings.push(issue(
      'legacy_faq_visible_markup_missing',
      'Strukturierte FAQ sind vorhanden, im Artikelinhalt aber nicht sichtbar markiert.'
    ));
  }
}
```

Ein Verlust erzeugt immer einen strukturierten Blocker; keine Differenz wird nur als Freitext protokolliert.

- [ ] **Step 6: Ergänze Sicherheitsregressionen**

In `tests/contentAgentArticleValidator.test.js` wird geprüft:

```js
const sanitized = sanitizeArticleHtml(`
  <figure><img src="/images/test.webp" alt="Test"><figcaption>Text</figcaption></figure>
  <pre><code>const safe = true;</code></pre>
  <a href="javascript:alert(1)" onclick="alert(1)">Unsicher</a>
  <style>body { display:none }</style>
`);

assert.match(sanitized, /<figure>/);
assert.match(sanitized, /<img[^>]+alt="Test"/);
assert.match(sanitized, /<pre><code>/);
assert.doesNotMatch(sanitized, /javascript:|onclick|<style/i);
```

- [ ] **Step 7: Führe Normalisierungs- und bestehende Validatortests aus**

Run:

```bash
node --test \
  tests/legacyStaticHtmlNormalizer.test.js \
  tests/contentAgentArticleValidator.test.js
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add services/contentAgent/articleSanitizer.js \
  services/contentAgent/legacyStaticHtmlNormalizer.js \
  tests/contentAgentArticleValidator.test.js \
  tests/legacyStaticHtmlNormalizer.test.js \
  tests/fixtures/legacyContent
git commit -m "feat: Legacy-HTML sicher normalisieren"
```

---

### Task 4: Aktives EJS isoliert und strikt rendern

**Files:**
- Create: `services/contentAgent/legacyEjsRenderService.js`
- Create: `tests/legacyEjsRenderService.test.js`
- Create: `tests/fixtures/legacyContent/active-values.ejs`
- Create: `tests/fixtures/legacyContent/active-district-loop.ejs`
- Create: `tests/fixtures/legacyContent/unsafe-process.ejs`
- Modify: `services/blogPostPresentationService.js:22-71`
- Modify: `tests/contentAgentPreview.test.js`

**Interfaces:**
- Consumes: Legacy-Template und ausschließlich serverseitig gebaute Locals.
- Produces: statisches HTML oder einen Fehler mit sicherem Code `CONTENT_LEGACY_EJS_RENDER_BLOCKED`.

- [ ] **Step 1: Lege EJS-Fixtures an**

`active-values.ejs`:

```ejs
<section>
  <h1><%= post.title %></h1>
  <p><%= helpers.date(post.published_at) %></p>
  <img src="<%= post.image_url %>" alt="<%= post.image_alt %>">
</section>
```

`active-district-loop.ejs`:

```ejs
<% const districts = ['Lichtenberg', 'Friedrichshain', 'Charlottenburg']; %>
<ul>
  <% districts.forEach((district) => { %>
    <li>Webdesign in <%= district %>, Berlin</li>
  <% }); %>
</ul>
```

`unsafe-process.ejs`:

```ejs
<p><%= process.env.OPENAI_API_KEY %></p>
```

- [ ] **Step 2: Schreibe die fehlschlagenden Renderer-Tests**

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  buildLegacyRenderLocals,
  inspectLegacyEjsTemplate,
  renderLegacyEjsStrict
} from '../services/contentAgent/legacyEjsRenderService.js';

const post = {
  title: 'Legacy-Titel',
  image_url: '/images/legacy.webp',
  image_alt: 'Legacy-Alt',
  published_at: '2026-07-16T08:00:00.000Z'
};

test('kontrollierte Locals entsprechen dem öffentlichen Legacy-Vertrag', () => {
  const locals = buildLegacyRenderLocals({
    post,
    publishedISO: '2026-07-16T10:00:00+02:00',
    modifiedISO: '2026-07-16T11:00:00+02:00'
  });
  assert.equal(locals.post.title, 'Legacy-Titel');
  assert.equal(locals.og_image, '/images/legacy.webp');
  assert.equal(locals.locale, 'de_DE');
  assert.equal(locals.helpers.date(post.published_at), '16.7.2026');
});

test('einfache Werte und lokale Schleifen werden vollständig statisch gerendert', async () => {
  for (const fixture of ['active-values.ejs', 'active-district-loop.ejs']) {
    const template = await readFile(
      new URL(`./fixtures/legacyContent/${fixture}`, import.meta.url),
      'utf8'
    );
    const html = renderLegacyEjsStrict({
      template,
      locals: buildLegacyRenderLocals({
        post,
        publishedISO: '2026-07-16T10:00:00+02:00',
        modifiedISO: '2026-07-16T11:00:00+02:00'
      })
    });
    assert.doesNotMatch(html, /<%|%>/);
  }
});

test('Prozesszugriff wird vor der Ausführung blockiert', async () => {
  const template = await readFile(
    new URL('./fixtures/legacyContent/unsafe-process.ejs', import.meta.url),
    'utf8'
  );
  assert.ok(inspectLegacyEjsTemplate(template).blockers.length > 0);
  assert.throws(
    () => renderLegacyEjsStrict({ template, locals: {} }),
    { code: 'CONTENT_LEGACY_EJS_RENDER_BLOCKED' }
  );
});
```

- [ ] **Step 3: Führe den Test aus und bestätige den Importfehler**

Run:

```bash
node --test tests/legacyEjsRenderService.test.js
```

Expected: FAIL mit `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 4: Implementiere Inspektion und VM-isoliertes Rendering**

Der Renderer verwendet `ejs.compile(..., { client: true })` und führt die erzeugte Funktion ausschließlich in einem `vm`-Kontext ohne `process`, `require`, `fetch`, Timer oder Dateisystem aus:

```js
import vm from 'node:vm';
import ejs from 'ejs';

const FORBIDDEN = [
  /\bprocess\b/u, /\bglobalThis\b/u, /\bglobal\b/u, /\brequire\b/u,
  /\bimport\s*\(/u, /\bFunction\b/u, /\beval\b/u,
  /\bconstructor\b/u, /\b__proto__\b/u, /\binclude\s*\(/u,
  /\bfetch\b/u, /\bXMLHttpRequest\b/u, /\bWebSocket\b/u
];

function renderError(message) {
  return Object.assign(new Error(message), {
    code: 'CONTENT_LEGACY_EJS_RENDER_BLOCKED'
  });
}

export function inspectLegacyEjsTemplate(template) {
  const source = String(template || '');
  const openCount = (source.match(/<%/g) || []).length;
  const closeCount = (source.match(/%>/g) || []).length;
  const blockers = [];
  if (openCount !== closeCount) blockers.push({ code: 'legacy_ejs_unbalanced' });
  const executableBlocks = [...source.matchAll(/<%(?!%)([\s\S]*?)%>/g)]
    .map((match) => match[1])
    .join('\n');
  FORBIDDEN.forEach((pattern) => {
    if (pattern.test(executableBlocks)) {
      blockers.push({ code: 'legacy_ejs_forbidden_token' });
    }
  });
  return {
    ejsCount: openCount,
    blockers: [...new Map(blockers.map((item) => [item.code, item])).values()]
  };
}

export function renderLegacyEjsStrict({ template, locals, timeoutMs = 100 } = {}) {
  const inspection = inspectLegacyEjsTemplate(template);
  if (inspection.blockers.length > 0) {
    throw renderError('Das Legacy-Template enthält nicht erlaubte Ausdrücke.');
  }
  const compiled = ejs.compile(String(template || ''), {
    client: true,
    compileDebug: false,
    rmWhitespace: true,
    filename: 'db://legacy-migration'
  });
  const sandbox = {
    locals: deepFreeze(normalizeRenderLocals(locals)),
    escapeFn: ejs.escapeXML,
    include() { throw renderError('EJS-Includes sind nicht erlaubt.'); },
    rethrow(error) { throw error; }
  };
  const context = vm.createContext(sandbox, {
    codeGeneration: { strings: false, wasm: false }
  });
  const script = new vm.Script(
    `(${compiled.toString()})(locals, escapeFn, include, rethrow)`,
    { filename: 'db-legacy-migration.vm.js' }
  );
  let result;
  try {
    result = script.runInContext(context, { timeout: timeoutMs });
  } catch (error) {
    throw renderError(`Legacy-EJS konnte nicht sicher gerendert werden: ${error.message}`);
  }
  const html = String(result || '');
  if (/<%[=-]?|%>/.test(html)) {
    throw renderError('Nach dem Rendering ist EJS-Syntax übrig geblieben.');
  }
  return html;
}
```

`deepFreeze` und der Locals-Builder werden exakt so definiert:

```js
function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}

function normalizeRenderLocals(value = {}) {
  return {
    post: structuredClone(value.post || {}),
    publishedISO: String(value.publishedISO || ''),
    modifiedISO: String(value.modifiedISO || ''),
    og_image: String(value.og_image || ''),
    locale: 'de_DE',
    helpers: {
      date(input) {
        return new Date(input).toLocaleDateString('de-DE');
      }
    }
  };
}

export function buildLegacyRenderLocals({
  post,
  publishedISO,
  modifiedISO
} = {}) {
  return {
    post: { ...post, description: post?.description },
    publishedISO,
    modifiedISO,
    og_image: post?.image_url,
    locale: 'de_DE',
    helpers: {
      date(value) {
        return new Date(value).toLocaleDateString('de-DE');
      }
    }
  };
}
```

- [ ] **Step 5: Verwende denselben Locals-Builder in der öffentlichen Darstellung**

`blogPostPresentationService.js` behält den fehlertoleranten öffentlichen EJS-Fallback, ersetzt aber die doppelte Locals-Konstruktion:

```js
const legacyLocals = buildLegacyRenderLocals({
  post,
  modifiedISO,
  publishedISO
});
```

Die öffentliche Reihenfolge bleibt unverändert:

```js
demoteContentH1(
  normalizeLegacyPublicCopy(
    renderPricingTokens(renderDbEjs(post.content, legacyLocals), pricing)
  )
);
```

Der strikte VM-Renderer wird nur für den Migrationsscan verwendet. Dadurch ändert Task 4 keine Liveausgabe.

- [ ] **Step 6: Führe Renderer- und öffentliche Vorschautests aus**

Run:

```bash
node --test \
  tests/legacyEjsRenderService.test.js \
  tests/contentAgentPreview.test.js \
  tests/blogContentFormat.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add services/contentAgent/legacyEjsRenderService.js \
  services/blogPostPresentationService.js \
  tests/legacyEjsRenderService.test.js \
  tests/contentAgentPreview.test.js \
  tests/fixtures/legacyContent/active-values.ejs \
  tests/fixtures/legacyContent/active-district-loop.ejs \
  tests/fixtures/legacyContent/unsafe-process.ejs
git commit -m "feat: Legacy-EJS isoliert rendern"
```

---

### Task 5: Klassifizierung, Kandidatenerstellung und Verlustanalyse

**Files:**
- Create: `services/contentAgent/legacyContentMigrationAnalysisService.js`
- Create: `tests/legacyContentMigrationAnalysisService.test.js`
- Modify: `services/contentAgent/legacyStaticHtmlNormalizer.js`

**Interfaces:**
- Consumes: vollständigen Post, Preise, erlaubte interne Links und Konfliktflags.
- Produces: persistierbares Analyseobjekt mit `status = ready|blocked`.

- [ ] **Step 1: Schreibe Tests für beide Migrationsklassen und Blocker**

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { createLegacyContentMigrationAnalysisService } from '../services/contentAgent/legacyContentMigrationAnalysisService.js';
import { normalizeLegacyStaticHtml } from '../services/contentAgent/legacyStaticHtmlNormalizer.js';
import {
  buildLegacyRenderLocals,
  renderLegacyEjsStrict
} from '../services/contentAgent/legacyEjsRenderService.js';

function post(overrides = {}) {
  return {
    id: 9,
    title: 'Legacy',
    slug: 'legacy',
    excerpt: 'Kurz',
    content: '<section><h2>Inhalt</h2><p>Text</p></section>',
    content_format: 'legacy_ejs',
    meta_title: 'Meta',
    meta_description: 'Beschreibung',
    og_title: 'OG',
    og_description: 'OG Beschreibung',
    faq_json: [],
    image_url: '/images/legacy.webp',
    image_alt: 'Alt',
    published: true,
    published_at: '2026-07-01T10:00:00.000Z',
    created_at: '2026-07-01T10:00:00.000Z',
    updated_at: '2026-07-16T10:00:00.000Z',
    has_draft_revision: false,
    has_active_optimization: false,
    ...overrides
  };
}

const service = createLegacyContentMigrationAnalysisService({
  normalizer: normalizeLegacyStaticHtml,
  strictRenderer: renderLegacyEjsStrict,
  buildRenderLocals: buildLegacyRenderLocals
});

test('EJS-freies Legacy-HTML wird als ready static_legacy klassifiziert', () => {
  const result = service.analyzePost({
    post: post(),
    pricing: {},
    allowedInternalLinks: []
  });
  assert.equal(result.migrationClass, 'static_legacy');
  assert.equal(result.status, 'ready');
  assert.match(result.baseLiveHash, /^[0-9a-f]{64}$/);
  assert.doesNotMatch(result.renderedStaticHtml, /<%|%>/);
});

test('aktives EJS wird gerendert und als active_ejs gespeichert', () => {
  const result = service.analyzePost({
    post: post({ content: '<p><%= post.title %></p>' }),
    pricing: {},
    allowedInternalLinks: []
  });
  assert.equal(result.migrationClass, 'active_ejs');
  assert.equal(result.status, 'ready');
  assert.equal(result.renderedStaticHtml, '<p>Legacy</p>');
});

test('offene Revision und laufende Optimierung blockieren den Kandidaten', () => {
  const result = service.analyzePost({
    post: post({ has_draft_revision: true, has_active_optimization: true }),
    pricing: {},
    allowedInternalLinks: []
  });
  assert.equal(result.status, 'blocked');
  assert.deepEqual(
    result.blockingIssues.map(({ code }) => code).sort(),
    ['legacy_active_optimization', 'legacy_open_revision']
  );
});

test('Preis-Tokens bleiben im gespeicherten Kandidaten erhalten', () => {
  const result = service.analyzePost({
    post: post({ content: '<p>Ab {{package.basic.price}} Euro</p>' }),
    pricing: { package: { basic: { price: '999' } } },
    allowedInternalLinks: []
  });
  assert.match(result.renderedStaticHtml, /\{\{package\.basic\.price\}\}/);
});
```

- [ ] **Step 2: Führe den Test aus und bestätige den Importfehler**

Run:

```bash
node --test tests/legacyContentMigrationAnalysisService.test.js
```

Expected: FAIL mit `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implementiere den Analyseablauf**

```js
export function createLegacyContentMigrationAnalysisService({
  normalizer,
  strictRenderer,
  buildRenderLocals
}) {
  return {
    analyzePost({ post, pricing = {}, allowedInternalLinks = [] }) {
      if (post?.published !== true || post?.content_format !== 'legacy_ejs') {
        throw analysisError(
          'CONTENT_LEGACY_MIGRATION_NOT_AVAILABLE',
          'Der Artikel ist kein veröffentlichter Legacy-Artikel.'
        );
      }

      const sourceContent = String(post.content || '');
      const migrationClass = /<%[=-]?|%>/.test(sourceContent)
        ? 'active_ejs'
        : 'static_legacy';
      const baseLiveHash = liveHashForContentPost(post);
      const blockingIssues = [];

      if (post.has_draft_revision === true) {
        blockingIssues.push(issue('legacy_open_revision', 'Eine offene Revision blockiert die Migration.'));
      }
      if (post.has_active_optimization === true) {
        blockingIssues.push(issue('legacy_active_optimization', 'Ein offener Optimierungsauftrag blockiert die Migration.'));
      }

      let rendered = sourceContent;
      if (migrationClass === 'active_ejs') {
        try {
          rendered = strictRenderer({
            template: sourceContent,
            locals: buildRenderLocals({
              post,
              publishedISO: isoOffset(post.published_at || post.created_at),
              modifiedISO: isoOffset(post.updated_at || post.created_at)
            })
          });
        } catch (error) {
          blockingIssues.push(issue(
            'legacy_ejs_render_failed',
            'Das aktive EJS konnte nicht sicher aufgelöst werden.'
          ));
          rendered = '';
        }
      }

      const normalized = normalizer({
        html: rendered,
        faqJson: post.faq_json,
        allowedInternalLinks
      });
      blockingIssues.push(...normalized.report.blockers);

      const candidateHash = createHash('sha256')
        .update(normalized.html)
        .digest('hex');
      const context = {
        version: 1,
        locale: 'de_DE',
        normalizerVersion: 1,
        pricingHash: hashJson(pricing)
      };

      return {
        postId: Number(post.id),
        migrationClass,
        status: blockingIssues.length === 0 ? 'ready' : 'blocked',
        baseLiveHash,
        sourceContent,
        renderedStaticHtml: normalized.html || null,
        renderContext: context,
        analysis: {
          version: 1,
          ejsCount: (sourceContent.match(/<%/g) || []).length,
          sourceBytes: Buffer.byteLength(sourceContent),
          candidateBytes: Buffer.byteLength(normalized.html),
          candidateHash,
          warnings: normalized.report.warnings
        },
        blockingIssues: uniqueIssues(blockingIssues),
        sanitizerReport: normalized.report
      };
    }
  };
}
```

Der gespeicherte Kandidat wird vor `renderPricingTokens` gebildet. Für die spätere Vorschau wird der Kandidat mit dem aktuellen Preiskatalog gerendert; dadurch bleibt der Preis dynamisch.

Die Datei importiert `createHash`, `isoOffset` und `liveHashForContentPost`. Ihre lokalen Hilfsfunktionen lauten:

```js
function analysisError(code, message) {
  return Object.assign(new Error(message), { code });
}

function issue(code, message, details = {}) {
  return { code, message, details };
}

function uniqueIssues(items) {
  return [...new Map(items.map((item) => [
    `${item.code}:${JSON.stringify(item.details || {})}`,
    item
  ])).values()];
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

function hashJson(value) {
  return createHash('sha256').update(stableJson(value)).digest('hex');
}
```

- [ ] **Step 4: Ergänze Differenztests für Text, Links, Bilder, IDs und FAQ**

Füge je einen Test hinzu, der durch absichtlichen Verlust genau diese Codes erzeugt:

```js
[
  'legacy_visible_text_loss',
  'legacy_link_loss',
  'legacy_image_loss',
  'legacy_id_loss',
  'legacy_faq_loss',
  'legacy_price_token_loss'
]
```

Jeder Test prüft zusätzlich, dass `status === 'blocked'` und der Kandidat nicht als sammelmigrationsfähig gilt.

- [ ] **Step 5: Führe Analyse-, Normalisierungs- und Renderertests aus**

Run:

```bash
node --test \
  tests/legacyContentMigrationAnalysisService.test.js \
  tests/legacyStaticHtmlNormalizer.test.js \
  tests/legacyEjsRenderService.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add services/contentAgent/legacyContentMigrationAnalysisService.js \
  services/contentAgent/legacyStaticHtmlNormalizer.js \
  tests/legacyContentMigrationAnalysisService.test.js
git commit -m "feat: Legacy-Migrationskandidaten analysieren"
```

---

### Task 6: Repository für Scanpersistenz, atomare Migration und Rücknahme

**Files:**
- Create: `repositories/contentLegacyMigrationRepository.js`
- Create: `tests/contentLegacyMigrationRepository.test.js`
- Modify: `repositories/contentPostRevisionInvariant.js`

**Interfaces:**
- Consumes: Analyseergebnisse aus Task 5 und Adminidentität `{ id, username }`.
- Produces: Dashboardzeilen sowie transaktionale Statuswerte `migrated`, `already_migrated`, `stale`, `blocked`, `rolled_back`.

Das Repository importiert `createHash` aus `node:crypto`,
`liveHashForContentPost` aus Task 2 sowie
`hasDraftContentRevision`, `hasActiveContentOptimization` und
`hasPostWorkSince` aus `contentPostRevisionInvariant.js`.

- [ ] **Step 1: Schreibe Repository-Vertragstests mit protokollierendem DB-Stub**

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { createContentLegacyMigrationRepository } from '../repositories/contentLegacyMigrationRepository.js';

test('Scan lädt ausschließlich veröffentlichte legacy_ejs-Artikel mit Konfliktflags', async () => {
  const calls = [];
  const repository = createContentLegacyMigrationRepository({
    async query(sql, values) {
      calls.push({ sql, values });
      return { rows: [] };
    }
  });
  await repository.listScanCandidates();
  assert.match(calls[0].sql, /p\.published = TRUE/i);
  assert.match(calls[0].sql, /p\.content_format = 'legacy_ejs'/i);
  assert.match(calls[0].sql, /content_post_revisions/i);
  assert.match(calls[0].sql, /optimize_existing_post/i);
});

test('offener Scan wird vor dem neuen Datensatz als stale markiert', async () => {
  const calls = [];
  const client = {
    async query(sql, values) {
      calls.push({ sql, values });
      if (/INSERT INTO content_legacy_migrations/i.test(sql)) {
        return { rows: [{ id: 12, status: 'ready' }] };
      }
      return { rows: [] };
    },
    release() {}
  };
  const repository = createContentLegacyMigrationRepository({
    async connect() { return client; }
  });
  await repository.saveScanResult({
    admin: { id: 4, username: 'admin' },
    result: {
      postId: 9,
      migrationClass: 'static_legacy',
      status: 'ready',
      baseLiveHash: 'a'.repeat(64),
      sourceContent: '<p>Alt</p>',
      renderedStaticHtml: '<p>Alt</p>',
      renderContext: { version: 1 },
      analysis: { candidateHash: 'b'.repeat(64) },
      blockingIssues: [],
      sanitizerReport: { version: 1 }
    }
  });
  assert.ok(calls.some(({ sql }) => /SET status = 'stale'/i.test(sql)));
  assert.ok(calls.some(({ sql }) => /INSERT INTO content_legacy_migrations/i.test(sql)));
});
```

- [ ] **Step 2: Führe den Test aus und bestätige den Importfehler**

Run:

```bash
node --test tests/contentLegacyMigrationRepository.test.js
```

Expected: FAIL mit `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Ergänze gemeinsame Konflikthelfer**

`repositories/contentPostRevisionInvariant.js` exportiert zusätzlich:

```js
export async function hasActiveContentOptimization(client, postId) {
  const { rows } = await client.query(`
    SELECT EXISTS (
      SELECT 1
      FROM content_jobs
      WHERE job_type = 'optimize_existing_post'
        AND payload_json ->> 'post_id' = $1::text
        AND status IN ('queued', 'running', 'needs_manual_attention')
    ) AS has_active_optimization
  `, [postId]);
  return rows[0]?.has_active_optimization === true;
}

export async function hasPostWorkSince(client, postId, since) {
  const { rows } = await client.query(`
    SELECT (
      EXISTS (
        SELECT 1 FROM content_post_revisions
        WHERE post_id = $1::integer AND created_at >= $2::timestamptz
      )
      OR EXISTS (
        SELECT 1 FROM content_jobs
        WHERE job_type = 'optimize_existing_post'
          AND payload_json ->> 'post_id' = $1::text
          AND created_at >= $2::timestamptz
      )
    ) AS has_new_work
  `, [postId, since]);
  return rows[0]?.has_new_work === true;
}
```

- [ ] **Step 4: Implementiere die Repositorymethoden**

Der Factory-Rückgabewert enthält exakt:

```js
return {
  listScanCandidates,
  saveScanResult,
  listDashboardRows,
  getMigrationForPreview,
  listReadyStaticLegacyIds,
  migrateOne,
  rollbackOne
};
```

`listScanCandidates()` lädt alle Postfelder für den Livehash sowie:

```sql
EXISTS (
  SELECT 1 FROM content_post_revisions revision
  WHERE revision.post_id = p.id AND revision.status = 'draft'
) AS has_draft_revision,
EXISTS (
  SELECT 1 FROM content_jobs job
  WHERE job.job_type = 'optimize_existing_post'
    AND job.payload_json ->> 'post_id' = p.id::text
    AND job.status IN ('queued', 'running', 'needs_manual_attention')
) AS has_active_optimization
```

Die Repositorydatei definiert eine gemeinsame Spaltenliste:

```js
const POST_COLUMNS = `
  p.id, p.title, p.slug, p.excerpt, p.content, p.content_format,
  p.meta_title, p.meta_description, p.og_title, p.og_description,
  p.faq_json, p.image_url, p.image_alt, p.published, p.workflow_status,
  p.scheduled_at, p.published_at, p.created_at, p.updated_at
`;
```

`saveScanResult()` sperrt den Post, prüft erneut `published` und `legacy_ejs`, setzt einen bisherigen offenen Scan auf `stale` und fügt den neuen Datensatz ein. Scan und Artikeländerung befinden sich nicht in derselben Transaktion; der gespeicherte `base_live_hash` schützt den späteren Schreibweg.

Die internen Repositoryhelfer sind:

```js
function repositoryError(code, message) {
  return Object.assign(new Error(message), { code });
}

function sha256(value) {
  return createHash('sha256').update(String(value || '')).digest('hex');
}

async function rollback(client) {
  try { await client.query('ROLLBACK'); } catch { /* ursprünglichen Fehler erhalten */ }
}

async function lockMigration(client, migrationId) {
  const { rows } = await client.query(`
    SELECT *
    FROM content_legacy_migrations
    WHERE id = $1::bigint
    FOR UPDATE
  `, [migrationId]);
  return rows[0] || null;
}

async function lockFullPost(client, postId) {
  const { rows } = await client.query(`
    SELECT ${POST_COLUMNS}
    FROM posts p
    WHERE p.id = $1::integer
    FOR UPDATE
  `, [postId]);
  return rows[0] || null;
}

async function markStale(client, migrationId) {
  await client.query(`
    UPDATE content_legacy_migrations
    SET status = 'stale', updated_at = NOW()
    WHERE id = $1::bigint
      AND status IN ('scanned', 'ready', 'blocked')
  `, [migrationId]);
}

async function rollbackWithConflict(client, code, message) {
  await rollback(client);
  throw repositoryError(code, message);
}
```

`listDashboardRows()` liefert pro Artikel den neuesten relevanten Datensatz mit aktuellen Postfeldern:

```sql
SELECT DISTINCT ON (migration.post_id)
       migration.*,
       post.title,
       post.slug,
       post.content_format AS current_content_format,
       post.updated_at AS current_post_updated_at
FROM content_legacy_migrations migration
JOIN posts post ON post.id = migration.post_id
WHERE migration.status NOT IN ('stale', 'failed')
ORDER BY migration.post_id,
         migration.created_at DESC,
         migration.id DESC
```

`getMigrationForPreview(id)` lädt denselben Migrationsdatensatz zusammen mit allen `POST_COLUMNS`. `listReadyStaticLegacyIds()` verwendet ausschließlich:

```sql
SELECT migration.id
FROM content_legacy_migrations migration
JOIN posts post ON post.id = migration.post_id
WHERE migration.status = 'ready'
  AND migration.migration_class = 'static_legacy'
  AND post.published = TRUE
  AND post.content_format = 'legacy_ejs'
ORDER BY migration.id
```

`migrateOne()` führt innerhalb einer Transaktion aus:

```js
const migration = await lockMigration(client, migrationId);
if (!migration) throw repositoryError('CONTENT_LEGACY_MIGRATION_NOT_FOUND', 'Migration nicht gefunden.');
if (migration.status === 'migrated') return { status: 'already_migrated', migration };
if (migration.status !== 'ready') {
  throw repositoryError('CONTENT_LEGACY_MIGRATION_NOT_READY', 'Migration ist nicht freigabefähig.');
}

const post = await lockFullPost(client, migration.post_id);
if (!post || post.published !== true || post.content_format !== 'legacy_ejs') {
  await markStale(client, migration.id);
  await client.query('COMMIT');
  return { status: 'stale' };
}
if (liveHashForContentPost(post) !== migration.base_live_hash) {
  await markStale(client, migration.id);
  await client.query('COMMIT');
  return { status: 'stale' };
}
if (await hasDraftContentRevision(client, post.id)
    || await hasActiveContentOptimization(client, post.id)) {
  return rollbackWithConflict(
    client,
    'CONTENT_LEGACY_MIGRATION_CONFLICT',
    'Offene Artikelarbeit blockiert die Migration.'
  );
}
if (/<%[=-]?|%>/.test(migration.rendered_static_html || '')) {
  return rollbackWithConflict(
    client,
    'CONTENT_LEGACY_MIGRATION_INVALID',
    'Der statische Kandidat enthält weiterhin EJS.'
  );
}
if (sha256(migration.rendered_static_html) !== migration.analysis_json.candidateHash) {
  return rollbackWithConflict(
    client,
    'CONTENT_LEGACY_MIGRATION_INVALID',
    'Der gespeicherte Kandidat ist nicht mehr konsistent.'
  );
}
```

Danach aktualisiert genau dieses SQL den Artikel:

```sql
UPDATE posts
SET content = $2,
    content_format = 'static_html',
    updated_at = NOW()
WHERE id = $1
RETURNING id, title, slug, excerpt, content, content_format,
          meta_title, meta_description, og_title, og_description,
          faq_json, image_url, image_alt, published, published_at,
          created_at, updated_at
```

Der Repositorycode berechnet `migrated_live_hash` aus der zurückgegebenen Zeile und setzt `status = 'migrated'`, `approved_by`, `migrated_at` und `updated_at`.

`rollbackOne()` sperrt Migration und Post, vergleicht den aktuellen Hash mit `migrated_live_hash`, prüft `hasPostWorkSince`, stellt `source_content` und `legacy_ejs` wieder her und setzt `status = 'rolled_back'`, `rolled_back_by` und `rolled_back_at`.

- [ ] **Step 5: Ergänze Tests für Idempotenz, Hashkonflikt und Rücknahmesperre**

Die Stubtests prüfen mindestens:

```js
assert.deepEqual(await repository.migrateOne(inputForMigratedRow), {
  status: 'already_migrated',
  migration: expectedMigration
});

await assert.rejects(
  repository.rollbackOne(inputWithChangedLiveHash),
  { code: 'CONTENT_LEGACY_ROLLBACK_CONFLICT' }
);
```

Zusätzlich wird geprüft, dass kein `UPDATE posts` ausgeführt wird, wenn ein Konflikt auftritt.

- [ ] **Step 6: Führe Repositorytests aus**

Run:

```bash
node --test \
  tests/contentLegacyMigrationRepository.test.js \
  tests/contentRevisionRepository.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add repositories/contentLegacyMigrationRepository.js \
  repositories/contentPostRevisionInvariant.js \
  tests/contentLegacyMigrationRepository.test.js \
  tests/contentRevisionRepository.test.js
git commit -m "feat: Legacy-Migration transaktional speichern"
```

---

### Task 7: Anwendungsservice für Scan, Vorschau, Sammelpfad und Rücknahme

**Files:**
- Create: `services/contentAgent/legacyContentMigrationService.js`
- Create: `tests/legacyContentMigrationService.test.js`

**Interfaces:**
- Consumes: Repository aus Task 6, Analyse aus Task 5 und Blogdarstellung.
- Produces: Admin-Anwendungsfälle ohne HTTP-Abhängigkeit.

Die Service-Datei importiert `liveHashForContentPost`,
`sanitizeArticleHtml` und `renderPricingTokens` aus den bestehenden
Content-Agent-Modulen. Die Vorschau verwendet damit dieselbe
Preis- und HTML-Aufbereitung wie die öffentliche Artikeldarstellung.

- [ ] **Step 1: Schreibe Service-Tests**

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { createLegacyContentMigrationService } from '../services/contentAgent/legacyContentMigrationService.js';

test('Scan analysiert jeden Legacy-Artikel und verändert keinen Livepost', async () => {
  const saved = [];
  const service = createLegacyContentMigrationService({
    repository: {
      async listScanCandidates() { return [{ id: 1 }, { id: 2 }]; },
      async saveScanResult(input) { saved.push(input); return input.result; }
    },
    analysisService: {
      analyzePost({ post }) {
        return {
          postId: post.id,
          migrationClass: 'static_legacy',
          status: 'ready'
        };
      }
    },
    blogPostPresentation: {}
  });
  const result = await service.scan({
    admin: { id: 3, username: 'admin' },
    pricing: {},
    allowedInternalLinks: []
  });
  assert.deepEqual(result, { scanned: 2, ready: 2, blocked: 0 });
  assert.equal(saved.length, 2);
});

test('Sammelmigration verarbeitet nur serverseitig gelistete ready static_legacy-IDs', async () => {
  const migrated = [];
  const service = createLegacyContentMigrationService({
    repository: {
      async listReadyStaticLegacyIds() { return [4, 5]; },
      async migrateOne({ migrationId }) {
        migrated.push(migrationId);
        return migrationId === 4 ? { status: 'migrated' } : { status: 'stale' };
      }
    },
    analysisService: {},
    blogPostPresentation: {}
  });
  const result = await service.migrateSafeBatch({
    admin: { id: 3, username: 'admin' }
  });
  assert.deepEqual(migrated, [4, 5]);
  assert.deepEqual(result, {
    migrated: 1,
    skipped: 1,
    blocked: 0,
    failed: 0
  });
});
```

- [ ] **Step 2: Führe den Test aus und bestätige den Importfehler**

Run:

```bash
node --test tests/legacyContentMigrationService.test.js
```

Expected: FAIL mit `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implementiere die Anwendungsfälle**

```js
export function createLegacyContentMigrationService({
  repository,
  analysisService,
  blogPostPresentation
}) {
  return {
    async scan({ admin, pricing, allowedInternalLinks }) {
      const posts = await repository.listScanCandidates();
      const results = await mapWithConcurrency(posts, 3, async (post) => {
        const result = analysisService.analyzePost({
          post,
          pricing,
          allowedInternalLinks
        });
        await repository.saveScanResult({ admin, result });
        return result;
      });
      return {
        scanned: results.length,
        ready: results.filter(({ status }) => status === 'ready').length,
        blocked: results.filter(({ status }) => status === 'blocked').length
      };
    },

    async getDashboard() {
      return buildDashboard(await repository.listDashboardRows());
    },

    async getPreview({ migrationId, pricing, canonicalBaseUrl }) {
      const record = await repository.getMigrationForPreview(migrationId);
      if (!record) throw serviceError('CONTENT_LEGACY_MIGRATION_NOT_FOUND');
      const currentHash = liveHashForContentPost(record.post);
      const stale = currentHash !== record.base_live_hash;
      const currentModel = blogPostPresentation.buildBlogPostPageModel({
        post: record.post,
        pricing,
        canonicalBaseUrl,
        previewMode: false
      });
      const candidateHtml = sanitizeArticleHtml(
        renderPricingTokens(record.rendered_static_html || '', pricing)
      );
      if (/<%[=-]?|%>/.test(candidateHtml)) {
        throw serviceError('CONTENT_LEGACY_MIGRATION_INVALID');
      }
      return {
        id: record.id,
        postId: record.post_id,
        title: record.post.title,
        slug: record.post.slug,
        status: stale ? 'stale' : record.status,
        migrationClass: record.migration_class,
        currentHtml: sanitizeArticleHtml(currentModel.renderedContent),
        candidateHtml,
        analysis: record.analysis_json,
        blockingIssues: record.blocking_issues_json,
        sanitizerReport: record.sanitizer_report_json,
        canMigrate: !stale && record.status === 'ready'
      };
    },

    async migrateOne({ migrationId, admin }) {
      return repository.migrateOne({ migrationId, admin });
    },

    async migrateSafeBatch({ admin }) {
      const ids = await repository.listReadyStaticLegacyIds();
      return aggregateBatchResults(
        await mapWithConcurrency(ids, 1, async (migrationId) => {
          try {
            return await repository.migrateOne({ migrationId, admin });
          } catch (error) {
            if (error.code === 'CONTENT_LEGACY_MIGRATION_CONFLICT') {
              return { status: 'blocked' };
            }
            return { status: 'failed' };
          }
        })
      );
    },

    async rollback({ migrationId, admin }) {
      return repository.rollbackOne({ migrationId, admin });
    }
  };
}
```

Die lokalen Helfer werden in derselben Datei definiert:

```js
function serviceError(code, message = 'Legacy-Migration nicht verfügbar.') {
  return Object.assign(new Error(message), { code });
}

async function mapWithConcurrency(values, concurrency, mapper) {
  const source = Array.from(values || []);
  const results = new Array(source.length);
  let cursor = 0;
  async function worker() {
    while (cursor < source.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(source[index], index);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, source.length) }, () => worker())
  );
  return results;
}

function aggregateBatchResults(results) {
  const summary = { migrated: 0, skipped: 0, blocked: 0, failed: 0 };
  for (const result of results) {
    if (result?.status === 'migrated') summary.migrated += 1;
    else if (['stale', 'already_migrated'].includes(result?.status)) summary.skipped += 1;
    else if (result?.status === 'blocked') summary.blocked += 1;
    else summary.failed += 1;
  }
  return summary;
}

function buildDashboard(rows) {
  const source = Array.from(rows || []);
  return {
    totalCount: new Set(source.map(({ post_id }) => Number(post_id))).size,
    readyStatic: source.filter(({ status, migration_class }) => (
      status === 'ready' && migration_class === 'static_legacy'
    )),
    reviewRequired: source.filter(({ status, migration_class }) => (
      status === 'ready' && migration_class === 'active_ejs'
    )),
    blocked: source.filter(({ status }) => status === 'blocked'),
    migrated: source.filter(({ status }) => status === 'migrated'),
    lastScanAt: source
      .filter(({ status }) => ['ready', 'blocked', 'scanned'].includes(status))
      .map(({ created_at }) => created_at)
      .sort()
      .at(-1) || null
  };
}
```

`mapWithConcurrency` behält die Eingabereihenfolge bei. Die Sammelmigration verwendet absichtlich Parallelität `1`, weil jeder Artikel eine eigene kurze Schreibtransaktion erhält und Konflikte verständlich einzeln ausgewertet werden.

- [ ] **Step 4: Ergänze Vorschautests**

Die Tests prüfen:

```js
assert.equal(preview.canMigrate, true);
assert.doesNotMatch(preview.candidateHtml, /<%|%>/);
assert.equal(preview.currentHtml, '<p>Aktueller Legacy-Stand</p>');
```

Bei abweichendem Livehash:

```js
assert.equal(preview.status, 'stale');
assert.equal(preview.canMigrate, false);
```

Der Candidate wird im Test als Zeichenfolge `<p><%= post.title %></p>` gespeichert; `getPreview` muss mit `CONTENT_LEGACY_MIGRATION_INVALID` abbrechen und darf ihn nicht ausführen.

- [ ] **Step 5: Führe Servicetests aus**

Run:

```bash
node --test tests/legacyContentMigrationService.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add services/contentAgent/legacyContentMigrationService.js \
  tests/legacyContentMigrationService.test.js
git commit -m "feat: Legacy-Migrationsabläufe bereitstellen"
```

---

### Task 8: Admincontroller, sichere Routen und Präsentationsmodell

**Files:**
- Modify: `routes/adminContentAgentRoutes.js:41-149`
- Modify: `controllers/adminContentAgentController.js:5-86,197-203,408-424,584-595`
- Modify: `services/contentAgent/adminPresentationService.js`
- Modify: `repositories/contentRevisionRepository.js:18-47,350`
- Modify: `services/contentAgent/contentRevisionService.js:382-614`
- Modify: `tests/contentAgentAdminRoutes.test.js`
- Modify: `tests/contentAgentAdminController.test.js`
- Modify: `tests/contentAgentAdminPresentation.test.js`
- Modify: `tests/contentRevisionRepository.test.js`
- Modify: `tests/contentRevisionService.test.js`

**Interfaces:**
- Consumes: `legacyMigrationService` aus Task 7.
- Produces: geschützte HTTP-Endpunkte und `legacyMigrationDashboard`.

- [ ] **Step 1: Ergänze die erwarteten Routen in den Routentests**

```js
const LEGACY_GET_PATHS = [
  '/admin/content-agent/existing-content/legacy-migrations/:migrationId/preview'
];

const LEGACY_POST_PATHS = [
  '/admin/content-agent/existing-content/legacy-migrations/scan',
  '/admin/content-agent/existing-content/legacy-migrations/migrate-safe',
  '/admin/content-agent/existing-content/legacy-migrations/:migrationId/migrate',
  '/admin/content-agent/existing-content/legacy-migrations/:migrationId/rollback'
];
```

Jeder GET-Pfad muss `isAdmin`, jeder POST-Pfad `isAdmin, verifyCsrfToken` verwenden. Zusätzlich prüft der Test die Produktionsinjektion von `createContentLegacyMigrationRepository(pool)` und `createLegacyContentMigrationService(...)`.

- [ ] **Step 2: Schreibe Controller-Tests für Scan, Vorschau, Migration und Rücknahme**

Die Basisabhängigkeiten erhalten:

```js
legacyMigrationService: {
  async getDashboard() {
    return { totalCount: 2, readyStatic: [], reviewRequired: [], blocked: [] };
  },
  async scan() { return { scanned: 2, ready: 1, blocked: 1 }; },
  async getPreview() { return { id: 8, canMigrate: true }; },
  async migrateOne() { return { status: 'migrated' }; },
  async migrateSafeBatch() {
    return { migrated: 1, skipped: 0, blocked: 0, failed: 0 };
  },
  async rollback() { return { status: 'rolled_back' }; }
}
```

Prüfe:

```js
assert.equal(rendered.view, 'admin/contentAgent/legacyMigrationPreview');
assert.equal(rendered.locals.migration.id, 8);
assert.equal(res.headers['X-Robots-Tag'], 'noindex, nofollow');
assert.equal(res.headers['Cache-Control'], 'no-store');
```

Mutierende Aktionen ohne `confirmed === 'true'` müssen Status 400 mit der vorhandenen sicheren Meldung zurückgeben.

- [ ] **Step 3: Führe die fokussierten Admin-Tests aus und bestätige die Fehler**

Run:

```bash
node --test \
  tests/contentAgentAdminRoutes.test.js \
  tests/contentAgentAdminController.test.js \
  tests/contentAgentAdminPresentation.test.js
```

Expected: FAIL, weil Routen, Dependency und Handlermethoden fehlen.

- [ ] **Step 4: Ergänze sichere Fehlercodes**

`CONFLICT_CODES` erhält:

```js
'CONTENT_LEGACY_MIGRATION_NOT_READY',
'CONTENT_LEGACY_MIGRATION_CONFLICT',
'CONTENT_LEGACY_MIGRATION_STALE',
'CONTENT_LEGACY_ROLLBACK_CONFLICT'
```

`SAFE_ERROR_MESSAGES` erhält:

```js
CONTENT_LEGACY_MIGRATION_NOT_READY:
  'Diese Legacy-Migration ist noch nicht freigabefähig.',
CONTENT_LEGACY_MIGRATION_CONFLICT:
  'Der Artikel wird bereits bearbeitet oder hat sich zwischenzeitlich geändert.',
CONTENT_LEGACY_MIGRATION_STALE:
  'Die Legacy-Vorschau ist veraltet. Bitte starte einen neuen Scan.',
CONTENT_LEGACY_MIGRATION_INVALID:
  'Der statische Migrationskandidat ist technisch nicht sicher.',
CONTENT_LEGACY_ROLLBACK_CONFLICT:
  'Die Migration kann nach einer späteren Artikeländerung nicht automatisch zurückgenommen werden.'
```

`CONTENT_LEGACY_MIGRATION_INVALID` wird als Validierungsfehler mit Status 400 behandelt; `CONTENT_LEGACY_MIGRATION_NOT_FOUND` folgt durch das vorhandene `_NOT_FOUND`-Verhalten Status 404.

- [ ] **Step 5: Verdrahte Repository, Analyse und Service im Produktionsrouter**

Neue Imports:

```js
import { createContentLegacyMigrationRepository } from '../repositories/contentLegacyMigrationRepository.js';
import { createLegacyContentMigrationAnalysisService } from '../services/contentAgent/legacyContentMigrationAnalysisService.js';
import { createLegacyContentMigrationService } from '../services/contentAgent/legacyContentMigrationService.js';
import {
  buildLegacyRenderLocals,
  renderLegacyEjsStrict
} from '../services/contentAgent/legacyEjsRenderService.js';
import { normalizeLegacyStaticHtml } from '../services/contentAgent/legacyStaticHtmlNormalizer.js';
```

Produktionsinstanz:

```js
const legacyMigrationRepository = createContentLegacyMigrationRepository(pool);
const legacyMigrationAnalysisService = createLegacyContentMigrationAnalysisService({
  normalizer: normalizeLegacyStaticHtml,
  strictRenderer: renderLegacyEjsStrict,
  buildRenderLocals: buildLegacyRenderLocals
});
const legacyMigrationService = createLegacyContentMigrationService({
  repository: legacyMigrationRepository,
  analysisService: legacyMigrationAnalysisService,
  blogPostPresentation
});
```

`legacyMigrationService` wird in `createAdminContentAgentController` injiziert.

- [ ] **Step 6: Ergänze Controllerhandler**

`existingContentPage` lädt parallel und formt das rohe Serviceergebnis
anschließend ausschließlich über das Admin-Präsentationsmodell:

```js
const [rows, rawLegacyMigrationDashboard] = await Promise.all([
  adminRepository.listExistingContent(),
  legacyMigrationService.getDashboard()
]);
const legacyMigrationDashboard =
  presentation.presentLegacyMigrationDashboard(rawLegacyMigrationDashboard);
```

Neue Handler:

```js
async legacyMigrationScanAction(req, res, next) {
  try {
    requiredConfirmation(req.body?.confirmed);
    const result = await legacyMigrationService.scan({
      admin: adminFromRequest(req),
      pricing: res.locals?.packagePricing || {},
      allowedInternalLinks: await revisionService.getTrustedInternalLinks()
    });
    const query = new URLSearchParams({
      legacy: 'scan-complete',
      scanned: String(result.scanned),
      ready: String(result.ready),
      blocked: String(result.blocked)
    });
    return res.redirect(`/admin/content-agent/existing-content?${query}`);
  } catch (error) {
    return sendKnownError(error, res, next);
  }
}
```

Der Revisionsrepository erhält eine eigenständige read-only Methode:

```js
async listTrustedInternalLinks(client = db) {
  return (await trustedValidationContext(0, client)).allowedInternalLinks;
}
```

Der Revisionsservice delegiert ohne weitere Mutation:

```js
async getTrustedInternalLinks() {
  return repository.listTrustedInternalLinks();
}
```

`tests/contentRevisionRepository.test.js` prüft die Abfrage auf `/kontakt`, `/pakete`, veröffentlichte Blog-, Ratgeber-, Leistungs- und Branchenseiten. `tests/contentRevisionService.test.js` prüft, dass die Arrayantwort unverändert weitergegeben wird.

Der Controller definiert für Erfolgsrückmeldungen ausschließlich begrenzte Zähler:

```js
function resultCount(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 && number <= 10_000
    ? number
    : 0;
}

function legacyMigrationResultMessage(query = {}) {
  if (query.legacy === 'scan-complete') {
    return `${resultCount(query.scanned)} Legacy-Artikel geprüft: `
      + `${resultCount(query.ready)} freigabefähig, `
      + `${resultCount(query.blocked)} blockiert.`;
  }
  if (query.legacy === 'batch-complete') {
    return `Sammelmigration abgeschlossen: ${resultCount(query.migrated)} migriert, `
      + `${resultCount(query.skipped)} übersprungen, `
      + `${resultCount(query.blocked)} blockiert, `
      + `${resultCount(query.failed)} fehlgeschlagen.`;
  }
  if (query.legacy === 'migrated') {
    return 'Der geprüfte Artikel wurde zu statischem HTML migriert.';
  }
  if (query.legacy === 'rolled-back') {
    return 'Die Legacy-Migration wurde sicher zurückgenommen.';
  }
  return null;
}
```

`existingContentPage` übergibt zusätzlich:

```js
legacyMigrationMessage: legacyMigrationResultMessage(req.query)
```

Die Sammelaktion baut ihre Rückgabeparameter aus dem serverseitigen Ergebnis:

```js
const result = await legacyMigrationService.migrateSafeBatch({
  admin: adminFromRequest(req)
});
const query = new URLSearchParams({
  legacy: 'batch-complete',
  migrated: String(result.migrated),
  skipped: String(result.skipped),
  blocked: String(result.blocked),
  failed: String(result.failed)
});
return res.redirect(`/admin/content-agent/existing-content?${query}`);
```

Die übrigen Handler verwenden `postgresIntegerId`, `requiredConfirmation`, `adminFromRequest` und leiten nach Erfolg auf diese Ziele um:

```text
Einzelmigration: /admin/content-agent/existing-content?legacy=migrated
Sammelmigration: /admin/content-agent/existing-content?legacy=batch-complete
Rücknahme:       /admin/content-agent/existing-content?legacy=rolled-back
```

Die Vorschau rendert `admin/contentAgent/legacyMigrationPreview` und setzt beide Schutzheader.

- [ ] **Step 7: Füge die Routen vor den dynamischen `:id`-Bestandsrouten ein**

```js
router.get(
  '/admin/content-agent/existing-content/legacy-migrations/:migrationId/preview',
  isAdmin,
  controller.legacyMigrationPreviewPage
);
router.post(
  '/admin/content-agent/existing-content/legacy-migrations/scan',
  isAdmin,
  verifyCsrfToken,
  controller.legacyMigrationScanAction
);
router.post(
  '/admin/content-agent/existing-content/legacy-migrations/migrate-safe',
  isAdmin,
  verifyCsrfToken,
  controller.legacyMigrationBatchAction
);
router.post(
  '/admin/content-agent/existing-content/legacy-migrations/:migrationId/migrate',
  isAdmin,
  verifyCsrfToken,
  controller.legacyMigrationMigrateAction
);
router.post(
  '/admin/content-agent/existing-content/legacy-migrations/:migrationId/rollback',
  isAdmin,
  verifyCsrfToken,
  controller.legacyMigrationRollbackAction
);
```

- [ ] **Step 8: Baue ein ausschließlich darstellendes Dashboardmodell**

`presentLegacyMigrationDashboard(raw)` gibt zurück:

```js
{
  totalCount,
  readyStaticCount,
  reviewRequiredCount,
  blockedCount,
  migratedCount,
  lastScanLabel,
  readyStatic,
  reviewRequired,
  blocked,
  migrated
}
```

Jede Zeile enthält nur normalisierte Texte, numerische IDs, `previewUrl`, `migrateUrl`, `rollbackUrl`, `statusLabel`, `statusTone`, `ejsCount`, `updatedLabel`, `primaryIssue` und `canMigrate|canRollback`.

- [ ] **Step 9: Führe die Admin-Tests aus**

Run:

```bash
node --test \
  tests/contentAgentAdminRoutes.test.js \
  tests/contentAgentAdminController.test.js \
  tests/contentAgentAdminPresentation.test.js \
  tests/contentRevisionRepository.test.js \
  tests/contentRevisionService.test.js
```

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add routes/adminContentAgentRoutes.js \
  controllers/adminContentAgentController.js \
  services/contentAgent/adminPresentationService.js \
  repositories/contentRevisionRepository.js \
  services/contentAgent/contentRevisionService.js \
  tests/contentAgentAdminRoutes.test.js \
  tests/contentAgentAdminController.test.js \
  tests/contentAgentAdminPresentation.test.js \
  tests/contentRevisionRepository.test.js \
  tests/contentRevisionService.test.js
git commit -m "feat: Legacy-Migration im Admin verdrahten"
```

---

### Task 9: Adminübersicht und geschützte Vorher-Nachher-Vorschau

**Files:**
- Create: `views/admin/contentAgent/_legacyMigrationDashboard.ejs`
- Create: `views/admin/contentAgent/legacyMigrationPreview.ejs`
- Modify: `views/admin/contentAgent/existingContent.ejs:100-124`
- Modify: `public/admin.css:3190-3460`
- Modify: `public/admin.min.css`
- Modify: `tests/contentAgentAdminViews.test.js`

**Interfaces:**
- Consumes: `legacyMigrationDashboard`, `migration`, `csrfToken`.
- Produces: responsive Adminbedienung ohne clientseitige EJS-Ausführung.

- [ ] **Step 1: Schreibe Viewtests für Übersicht, Blocker und Vorschau**

Die Tests rendern das bestehende EJS mit:

```js
legacyMigrationDashboard: {
  totalCount: 3,
  readyStaticCount: 1,
  reviewRequiredCount: 1,
  blockedCount: 1,
  migratedCount: 0,
  lastScanLabel: '16.07.2026, 12:00 Uhr',
  readyStatic: [{
    id: 10,
    title: 'Statisch',
    slug: 'statisch',
    ejsCount: 0,
    previewUrl: '/admin/content-agent/existing-content/legacy-migrations/10/preview',
    migrateUrl: '/admin/content-agent/existing-content/legacy-migrations/10/migrate',
    canMigrate: true
  }],
  reviewRequired: [],
  blocked: [{
    id: 12,
    title: 'Blockiert',
    slug: 'blockiert',
    primaryIssue: 'Eingebettete Styles benötigen eine Einzelprüfung.',
    canMigrate: false
  }],
  migrated: []
}
```

Prüfe:

```js
assert.match(html, /Legacy-Migration/);
assert.match(html, /Alle sicheren Artikel migrieren/);
assert.match(html, /legacy-migrations\/10\/preview/);
assert.doesNotMatch(blockedRow, /legacy-migrations\/12\/migrate/);
```

Die Vorschauprüfung bestätigt zwei Bereiche „Aktueller Live-Renderstand“ und „Statischer Kandidat“, technische Unterschiede, Blocker sowie das Fehlen der Migrationsaktion bei `canMigrate: false`.

- [ ] **Step 2: Führe den Viewtest aus und bestätige den Fehler**

Run:

```bash
node --test tests/contentAgentAdminViews.test.js
```

Expected: FAIL, weil Partial und Vorschau fehlen.

- [ ] **Step 3: Ergänze das Legacy-Dashboard vor dem Inventar**

In `existingContent.ejs` direkt vor `stock-heading`:

```ejs
<% if (legacyMigrationMessage) { %>
  <div class="content-agent-notice is-success" role="status">
    <i class="fa-solid fa-circle-check" aria-hidden="true"></i>
    <div>
      <strong>Legacy-Migration aktualisiert</strong>
      <p><%= legacyMigrationMessage %></p>
    </div>
  </div>
<% } %>

<%- include('_legacyMigrationDashboard', {
  dashboard: legacyMigrationDashboard,
  csrf
}) %>
```

Das Partial enthält:

- vier kompakte Kennzahlen,
- letzten Scanzeitpunkt,
- POST-Form „Legacy-Artikel neu prüfen“ mit `_csrf` und `confirmed=true`,
- POST-Form „Alle sicheren Artikel migrieren“ nur bei `readyStaticCount > 0`,
- drei `<details>`-Gruppen „Sicher gesammelt migrierbar“, „Einzelprüfung erforderlich“, „Blockiert“,
- die Gruppe „Migriert“ mit Rücknahmeaktion, sobald `migratedCount > 0`,
- pro Zeile Titel, Slug, EJS-Anzahl, Status, Hauptbefund und primäre Aktion.

Jede mutierende Form verwendet `data-confirm` mit einer eindeutigen deutschen Bestätigung. Blockierte Zeilen haben keine Freigabeform.

- [ ] **Step 4: Erstelle die geschützte Vorschauseite**

Die Seite verwendet den Adminheader und rendert ausschließlich bereits sanitisiertes HTML:

```ejs
<%- include('../../partials/admin_header') %>
<div class="content-agent-page legacy-migration-preview">
  <header class="content-agent-pagehead">
    <div>
      <p class="content-agent-eyebrow">Legacy-Migration</p>
      <h1 class="admin-page-title"><%= migration.title %></h1>
      <p class="content-agent-lead"><code><%= migration.slug %></code></p>
    </div>
    <a class="btn btn-outline-secondary" href="/admin/content-agent/existing-content">
      Zur Bestandsübersicht
    </a>
  </header>

  <% if (migration.status === 'stale') { %>
    <div class="content-agent-notice is-warning">
      Diese Vorschau ist veraltet. Starte einen neuen Legacy-Scan.
    </div>
  <% } %>

  <section class="legacy-migration-compare" aria-label="Vorher-Nachher-Vergleich">
    <article>
      <h2>Aktueller Live-Renderstand</h2>
      <div class="legacy-migration-render"><%- migration.currentHtml %></div>
    </article>
    <article>
      <h2>Statischer Kandidat</h2>
      <div class="legacy-migration-render"><%- migration.candidateHtml %></div>
    </article>
  </section>

  <section class="content-agent-panel">
    <h2>Technische Prüfung</h2>
    <!-- deterministische Analysewerte und Blocker als Listen -->
  </section>

  <% if (migration.canMigrate) { %>
    <form method="post"
      action="/admin/content-agent/existing-content/legacy-migrations/<%= migration.id %>/migrate"
      data-confirm="Diesen geprüften Legacy-Artikel jetzt zu statischem HTML migrieren?">
      <input type="hidden" name="_csrf" value="<%= csrfToken %>">
      <input type="hidden" name="confirmed" value="true">
      <button class="btn btn-primary" type="submit">
        Geprüft zu statischem HTML migrieren
      </button>
    </form>
  <% } %>
</div>
<%- include('../../partials/admin_footer') %>
```

- [ ] **Step 5: Ergänze responsive Styles**

`public/admin.css` erhält:

```css
.legacy-migration-metrics {
  display: grid;
  gap: .75rem;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.legacy-migration-list {
  display: grid;
  gap: .65rem;
}

.legacy-migration-row {
  align-items: center;
  border: 1px solid var(--content-agent-line);
  border-radius: .75rem;
  display: grid;
  gap: .75rem 1rem;
  grid-template-columns: minmax(14rem, 1fr) auto auto;
  padding: .8rem;
}

.legacy-migration-compare {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-bottom: 1rem;
}

.legacy-migration-compare > article {
  background: #fff;
  border: 1px solid var(--content-agent-line);
  border-radius: .8rem;
  min-width: 0;
  overflow: hidden;
}

.legacy-migration-compare h2 {
  background: var(--content-agent-soft);
  font-size: .95rem;
  margin: 0;
  padding: .8rem 1rem;
}

.legacy-migration-render {
  max-height: 70vh;
  overflow: auto;
  padding: 1rem;
}

@media (max-width: 900px) {
  .legacy-migration-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 767.98px) {
  .legacy-migration-metrics,
  .legacy-migration-compare,
  .legacy-migration-row {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 6: Erzeuge das minifizierte CSS und führe Viewtests aus**

Run:

```bash
npm run build:css
node --test tests/contentAgentAdminViews.test.js
```

Expected: CSS-Build erfolgreich, Viewtest PASS.

- [ ] **Step 7: Commit**

```bash
git add views/admin/contentAgent/_legacyMigrationDashboard.ejs \
  views/admin/contentAgent/legacyMigrationPreview.ejs \
  views/admin/contentAgent/existingContent.ejs \
  public/admin.css \
  public/admin.min.css \
  tests/contentAgentAdminViews.test.js
git commit -m "feat: Legacy-Migration im Admin anzeigen"
```

---

### Task 10: Echte PostgreSQL-Transaktionen und Idempotenz prüfen

**Files:**
- Create: `tests/contentLegacyMigrationPgIntegration.test.js`
- Modify: `tests/contentAgentPostgresIntegration.test.js`

**Interfaces:**
- Consumes: Migration 015 und Repository aus Task 6.
- Produces: Beleg für echte Sperren, Hash-CAS, Idempotenz und Rücknahme.

- [ ] **Step 1: Schreibe den PostgreSQL-Integrationstest**

Der Test verwendet `evaluateContentAgentPgResetGuard` und ein isoliertes Schema. Er legt minimale Tabellen für `posts`, `content_post_revisions` und `content_jobs` an, führt Migration 015 aus und prüft:

```js
test('echtes PostgreSQL: Legacy-Migration ist atomar, idempotent und rücknehmbar', {
  skip: resetGuard.allowed ? false : resetGuard.reason
}, async () => {
  // isoliertes Schema erstellen
  // Legacy-Post und ready-Migrationsdatensatz einfügen
  const repository = createContentLegacyMigrationRepository(pool);

  const migrated = await repository.migrateOne({
    migrationId,
    admin: { id: 1, username: 'admin' }
  });
  assert.equal(migrated.status, 'migrated');

  const live = (await pool.query('SELECT * FROM posts WHERE id = $1', [postId])).rows[0];
  assert.equal(live.content_format, 'static_html');
  assert.equal(live.slug, originalSlug);
  assert.equal(live.published, true);
  assert.equal(new Date(live.published_at).toISOString(), originalPublishedAt);

  const repeated = await repository.migrateOne({
    migrationId,
    admin: { id: 1, username: 'admin' }
  });
  assert.equal(repeated.status, 'already_migrated');

  const rolledBack = await repository.rollbackOne({
    migrationId,
    admin: { id: 1, username: 'admin' }
  });
  assert.equal(rolledBack.status, 'rolled_back');
  const restored = (await pool.query('SELECT * FROM posts WHERE id = $1', [postId])).rows[0];
  assert.equal(restored.content_format, 'legacy_ejs');
  assert.equal(restored.content, originalContent);
});
```

Weitere Teiltests:

- Änderung des Postinhalts nach Scan setzt Migration auf `stale` und schreibt kein `static_html`.
- Draft-Revision blockiert die Migration.
- `needs_manual_attention`-Optimierungsjob blockiert die Migration.
- Revision nach erfolgreicher Migration blockiert die Rücknahme.
- Wiederholtes Ausführen von Migration 015 verändert keine vorhandenen Datensätze.
- Zwei parallele Freigabeversuche führen zu genau einem Postupdate.

- [ ] **Step 2: Starte eine isolierte lokale PostgreSQL-Testdatenbank**

Run:

```bash
docker run --rm -d \
  --name kwd-content-agent-pg-test-legacy \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=kwd_content_agent_integration_test \
  -p 127.0.0.1:55439:5432 \
  postgres:16
```

Expected: Container-ID.

- [ ] **Step 3: Führe den echten PostgreSQL-Test aus**

Run:

```bash
CONTENT_AGENT_PG_TEST_URL='postgresql://postgres:postgres@127.0.0.1:55439/kwd_content_agent_integration_test' \
CONTENT_AGENT_PG_TEST_ALLOW_RESET=true \
CONTENT_AGENT_PG_TEST_TOKEN=KWDCONTENTAGENT_TEST_RESET_V1 \
node --test tests/contentLegacyMigrationPgIntegration.test.js
```

Expected: PASS ohne SKIP.

- [ ] **Step 4: Stoppe die isolierte Testdatenbank**

Run:

```bash
docker stop kwd-content-agent-pg-test-legacy
```

Expected: `kwd-content-agent-pg-test-legacy`.

- [ ] **Step 5: Ergänze die zweimalige Runnerausführung im bestehenden Integrationsblock**

Der bestehende Migrationsintegrationstest prüft nach zweimaligem `runContentAgentMigration(pool)`:

```js
const table = await pool.query(`
  SELECT to_regclass('content_legacy_migrations') AS relation
`);
assert.equal(table.rows[0].relation, 'content_legacy_migrations');
```

- [ ] **Step 6: Commit**

```bash
git add tests/contentLegacyMigrationPgIntegration.test.js \
  tests/contentAgentPostgresIntegration.test.js
git commit -m "test: Legacy-Migration mit PostgreSQL verifizieren"
```

---

### Task 11: Öffentliche Regressionen, Deploymentanleitung und Gesamtverifikation

**Files:**
- Modify: `tests/blogContentFormat.test.js`
- Modify: `tests/contentAgentPreview.test.js`
- Modify: `docs/deployment/content-agent-ionos-vps.md`
- Modify: `tests/contentAgentDeploymentGuide.test.js`

**Interfaces:**
- Consumes: alle vorherigen Tasks.
- Produces: deploybarer, dokumentierter Stand ohne Infrastrukturänderung.

- [ ] **Step 1: Ergänze öffentliche Formatregressionen**

Prüfe in `tests/blogContentFormat.test.js`:

```js
assert.match(presentationSource, /content_format === 'legacy_ejs'/);
assert.match(presentationSource, /content_format === 'static_html'/);
assert.match(presentationSource, /buildLegacyRenderLocals/);
```

In `tests/contentAgentPreview.test.js` wird ein migrierter statischer Artikel mit Bild, Codeblock, internen Links, FAQ und Preis-Token gerendert. Erwartet werden:

```js
assert.match(model.renderedContent, /<img[^>]+alt="Beitragsbild"/);
assert.match(model.renderedContent, /<pre><code>/);
assert.match(model.renderedContent, /href="\/kontakt"/);
assert.doesNotMatch(model.renderedContent, /<%|%>|<script|<style|onerror=/i);
assert.equal(model.canonicalUrl, 'https://example.test/blog/unveraenderter-slug');
```

Zusätzlich erhält `tests/contentAgentAdminPresentation.test.js` eine
Regression für den eigentlichen Geschäftszweck der Migration:

```js
const [migrated] = buildExistingContentListPresentation([{
  id: 44,
  title: 'Migrierter Artikel',
  slug: 'migrierter-artikel',
  content_format: 'static_html',
  has_active_legacy_ejs: false,
  optimization_job_status: null,
  open_draft_revision_id: null,
  has_draft_revision: false
}]);

assert.equal(migrated.optimization.canStart, true);
assert.equal(migrated.optimization.legacyEjsBlocked, undefined);
```

Damit ist nicht nur das Rendering, sondern auch der wieder freigeschaltete
KI-Optimierungspfad für migrierte Artikel durch einen Test abgesichert.

- [ ] **Step 2: Aktualisiere die IONOS-VPS-Anleitung**

Die Anleitung nennt Migration 015 direkt nach 014 und ergänzt die Schema-Prüfung:

```sql
SELECT
  to_regclass('public.content_legacy_migrations') IS NOT NULL
  AS content_legacy_migrations_exists;
```

Der Katalogcheck muss diese Spalten verlangen:

```text
post_id
status
migration_class
base_live_hash
source_content
rendered_static_html
analysis_json
blocking_issues_json
migrated_live_hash
migrated_at
rolled_back_at
```

Der Rolloutabschnitt sagt ausdrücklich:

1. Backup erstellen und mit `pg_restore -l` prüfen.
2. `docker compose run --rm app npm run migrate:content-agent` zweimal ausführen.
3. Schema 015 prüfen.
4. bestehenden Dry-Run ausführen.
5. `app` und `content-worker` gemeinsam neu erstellen.
6. im Adminbereich nur „Legacy-Artikel neu prüfen“ ausführen.
7. Scananzahlen und Blocker prüfen.
8. erst danach eine einzelne sichere Vorschau migrieren.
9. öffentlichen Artikel, Slug, Canonical, Bild, Links und GSC-Zuordnung prüfen.
10. Sammelmigration erst nach dem erfolgreichen Einzeltest verwenden.

Die Anleitung enthält zusätzlich:

```text
Keine Änderung an .env erforderlich.
Keine Änderung an docker-compose.yml erforderlich.
Kein automatischer Migrationslauf beim Deployment.
```

- [ ] **Step 3: Aktualisiere den Deployment-Guide-Test**

Der Test verlangt:

```js
assert.match(guide, /015_create_legacy_content_migrations\.sql/);
assert.match(guide, /content_legacy_migrations/);
assert.match(guide, /Keine Änderung an `?\.env`? erforderlich/i);
assert.match(guide, /Keine Änderung an `?docker-compose\.yml`? erforderlich/i);
assert.ok(
  guide.indexOf('015_create_legacy_content_migrations.sql')
    > guide.indexOf('014_create_existing_content_admin_preferences.sql')
);
```

- [ ] **Step 4: Führe alle fokussierten Legacy-Tests aus**

Run:

```bash
node --test \
  tests/contentLegacyMigrationMigration.test.js \
  tests/contentPostLiveState.test.js \
  tests/legacyStaticHtmlNormalizer.test.js \
  tests/legacyEjsRenderService.test.js \
  tests/legacyContentMigrationAnalysisService.test.js \
  tests/contentLegacyMigrationRepository.test.js \
  tests/legacyContentMigrationService.test.js \
  tests/contentAgentAdminRoutes.test.js \
  tests/contentAgentAdminController.test.js \
  tests/contentAgentAdminPresentation.test.js \
  tests/contentAgentAdminViews.test.js \
  tests/blogContentFormat.test.js \
  tests/contentAgentPreview.test.js \
  tests/contentAgentDeploymentGuide.test.js
```

Expected: PASS.

- [ ] **Step 5: Führe vollständige Testsuite und Produktionsbuild aus**

Run:

```bash
npm test
npm run build
git status --short
```

Expected:

- vollständige Testsuite PASS,
- CSS-Build erfolgreich,
- nur beabsichtigte Quell-, Test-, Dokumentations- und generierte CSS-Dateien geändert,
- keine `.env`, `docker-compose.yml`, Zugangsdaten oder Produktionsdaten im Diff.

- [ ] **Step 6: Prüfe den finalen Diff**

Run:

```bash
git diff --check
git diff --stat
git diff -- \
  scripts/migrations/015_create_legacy_content_migrations.sql \
  services/contentAgent \
  repositories/contentLegacyMigrationRepository.js \
  controllers/adminContentAgentController.js \
  routes/adminContentAgentRoutes.js \
  views/admin/contentAgent \
  public/admin.css \
  docs/deployment/content-agent-ionos-vps.md
```

Expected: keine Whitespace-Fehler; keine automatische Veröffentlichung, keine externe Provideranbindung und keine Infrastrukturänderung.

- [ ] **Step 7: Commit**

```bash
git add tests/blogContentFormat.test.js \
  tests/contentAgentPreview.test.js \
  docs/deployment/content-agent-ionos-vps.md \
  tests/contentAgentDeploymentGuide.test.js \
  public/admin.min.css
git commit -m "docs: Legacy-Migrationsrollout absichern"
```

---

## Manuelle Abnahme nach Implementierung

- [ ] Adminbereich „Bestehende Inhalte“ öffnen und prüfen, dass der Scan noch keine Liveänderung ausführt.
- [ ] Scan starten und die drei Gruppen sowie konkrete Blocker kontrollieren.
- [ ] Einen EJS-freien, vollständig sicheren Artikel in der Vorher-Nachher-Ansicht öffnen.
- [ ] Slug, Titel, sichtbaren Text, Bilder, Codeblöcke, Links, FAQ und Preis-Tokens vergleichen.
- [ ] Den Einzelartikel migrieren und die öffentliche URL unverändert öffnen.
- [ ] Prüfen, dass „KI-Optimierung starten“ jetzt für den migrierten Artikel verfügbar ist.
- [ ] Eine Rücknahme ohne Zwischenänderung testen.
- [ ] Erneut migrieren, anschließend eine Draft-Revision anlegen und bestätigen, dass die automatische Rücknahme gesperrt ist.
- [ ] Einen aktiven EJS-Artikel mit Datumswerten und einen mit Schleife prüfen.
- [ ] Einen Artikel mit `<style>` oder unbekanntem JSON-LD kontrollieren und bestätigen, dass keine Sammelfreigabe angeboten wird.
- [ ] Erst nach dieser Abnahme „Alle sicheren Artikel migrieren“ verwenden.
