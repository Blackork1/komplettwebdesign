# Null-Impressions-Adminübersicht – Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Die Bestandsübersicht priorisiert Artikel mit Google-Impressionen, trennt unvollständige Daten und Null-Impressions-Artikel sicher und speichert rein administrative Ein-/Ausblendentscheidungen dauerhaft.

**Architecture:** Eine additive PostgreSQL-Tabelle speichert ausschließlich den Admin-Anzeigestatus. Das Admin-Repository lädt und verändert diesen Zustand transaktional; der Präsentationsservice klassifiziert anhand des neuesten vollständigen 28-Tage-Snapshots vier fertige Gruppen. CSRF-geschützte Controlleraktionen berechnen ihre Zielmenge serverseitig neu und verändern keine öffentlichen Artikelfelder.

**Tech Stack:** Node.js, Express, EJS, PostgreSQL 16/pgvector, node:test, bestehende Bootstrap-/Admin-CSS-Pipeline.

## Globale Vorgaben

- Sichtbare Texte verwenden korrektes Deutsch mit ä, ö, ü und ß.
- Nur article_age_days >= 28, complete === true, coverageDayCount >= 28 und exakt null Impressionen qualifizieren für die Null-Impressions-Gruppe.
- Fehlende, junge oder unvollständige Daten bleiben neutral unter „Daten werden gesammelt“.
- Die Präferenz verändert niemals published, Inhalt, Slug, Sitemap, Canonical oder Indexierung.
- Alle Schreibwege verwenden isAdmin und verifyCsrfToken.
- Der Browser übermittelt weder Impressionen noch eine Artikelliste für Sammelaktionen.
- Repositorymethoden sind idempotent und transaktional.
- Es entstehen keine neuen .env-Variablen und keine neue docker-compose.yml-Konfiguration.
- Öffentliche Blogqueries und öffentliche Views bleiben unverändert.

---

## Dateistruktur

**Neu**

- scripts/migrations/014_create_existing_content_admin_preferences.sql
- tests/contentExistingPostAdminPreferencesMigration.test.js
- tests/contentExistingPostAdminPreferencesPgIntegration.test.js
- views/admin/contentAgent/_existingContentGroup.ejs
- views/admin/contentAgent/_existingContentItem.ejs

**Änderungen**

- scripts/runContentAgentMigration.js
- repositories/contentAgentAdminRepository.js
- services/contentAgent/adminPresentationService.js
- controllers/adminContentAgentController.js
- routes/adminContentAgentRoutes.js
- views/admin/contentAgent/existingContent.ejs
- public/admin.css sowie mechanisch public/admin.min.css und public/css-manifest.json
- zugehörige Migration-, Repository-, Präsentations-, Controller-, Routen-, View- und Deploymenttests
- docs/deployment/content-agent-ionos-vps.md

---

### Task 1: Additive Migration 014

**Files**
- Create: scripts/migrations/014_create_existing_content_admin_preferences.sql
- Create: tests/contentExistingPostAdminPreferencesMigration.test.js
- Modify: scripts/runContentAgentMigration.js
- Modify: tests/contentAgentMigration.test.js
- Modify: tests/contentWeeklyTopicPoolMigration.test.js
- Modify: tests/contentAgentMigration006.test.js
- Modify: tests/contentSearchMetricsMigration.test.js
- Modify: tests/contentLearningMigration.test.js

**Interfaces**
- Produces: content_existing_post_admin_preferences(post_id, hidden_from_zero_impression_list, created_at, updated_at).
- Produces: runContentAgentMigration() führt 002–014 in einer Transaktion aus.

- [ ] **Step 1: Failing migration contract test schreiben**

Create tests/contentExistingPostAdminPreferencesMigration.test.js:

~~~js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const sql = readFileSync(new URL(
  '../scripts/migrations/014_create_existing_content_admin_preferences.sql', import.meta.url
), 'utf8');
const runner = readFileSync(new URL('../scripts/runContentAgentMigration.js', import.meta.url), 'utf8');

test('Migration 014 erstellt nur additive Adminpräferenzen', () => {
  assert.match(sql, /CREATE TABLE IF NOT EXISTS content_existing_post_admin_preferences/i);
  assert.match(sql, /post_id INTEGER PRIMARY KEY REFERENCES posts\(id\) ON DELETE CASCADE/i);
  assert.match(sql, /hidden_from_zero_impression_list BOOLEAN NOT NULL DEFAULT FALSE/i);
  assert.match(sql, /created_at TIMESTAMPTZ NOT NULL DEFAULT NOW\(\)/i);
  assert.match(sql, /updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW\(\)/i);
  assert.doesNotMatch(sql, /DROP\s+(?:TABLE|COLUMN)|TRUNCATE|DELETE\s+FROM/i);
});

test('Runner führt 014 direkt nach 013 aus und meldet 002 bis 014', () => {
  assert.ok(runner.indexOf('014_create_existing_content_admin_preferences.sql')
    > runner.indexOf('013_create_article_performance_learning.sql'));
  assert.match(runner, /Migration 002 bis 014 erfolgreich/);
  assert.match(runner, /Migration 002 bis 014 fehlgeschlagen/);
});
~~~

- [ ] **Step 2: RED belegen**

~~~bash
node --test tests/contentExistingPostAdminPreferencesMigration.test.js tests/contentAgentMigration.test.js
~~~

Expected: FAIL, weil Migration 014 und der Runnerbereich fehlen.

- [ ] **Step 3: Migration und Runner implementieren**

Create scripts/migrations/014_create_existing_content_admin_preferences.sql:

~~~sql
CREATE TABLE IF NOT EXISTS content_existing_post_admin_preferences (
  post_id INTEGER PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
  hidden_from_zero_impression_list BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
~~~

Direkt nach Migration 013 im Runner ergänzen:

~~~js
'./migrations/014_create_existing_content_admin_preferences.sql'
~~~

Beide Konsolenmeldungen auf 002 bis 014 ändern. In tests/contentAgentMigration.test.js muss queries[14] die neue Tabelle enthalten und queries[15] COMMIT sein. Alle oben genannten Runnervertragstests erwarten anschließend 002 bis 014; historische Dateinamen bleiben unverändert.

- [ ] **Step 4: GREEN belegen**

~~~bash
node --test tests/contentExistingPostAdminPreferencesMigration.test.js \
  tests/contentAgentMigration.test.js tests/contentWeeklyTopicPoolMigration.test.js \
  tests/contentAgentMigration006.test.js tests/contentSearchMetricsMigration.test.js \
  tests/contentLearningMigration.test.js
~~~

Expected: alle ausgewählten Tests PASS.

- [ ] **Step 5: Commit**

~~~bash
git add scripts/migrations/014_create_existing_content_admin_preferences.sql \
  scripts/runContentAgentMigration.js tests/contentExistingPostAdminPreferencesMigration.test.js \
  tests/contentAgentMigration.test.js tests/contentWeeklyTopicPoolMigration.test.js \
  tests/contentAgentMigration006.test.js tests/contentSearchMetricsMigration.test.js \
  tests/contentLearningMigration.test.js
git commit -m "feat: add existing content admin preferences"
~~~

---

### Task 2: Repository liest und schreibt Präferenzen

**Files**
- Modify: repositories/contentAgentAdminRepository.js
- Modify: tests/contentAgentAdminRepository.test.js

**Interfaces**
- Produces: listExistingContent() liefert zero_impression_hidden.
- Produces: setExistingContentZeroImpressionHidden({ postId, hidden }) mit updated, not_found oder not_eligible.
- Produces: setAllExistingContentZeroImpressionHidden(hidden) mit changedCount.

- [ ] **Step 1: Failing Read-/Write-Tests ergänzen**

~~~js
test('Bestandsliste lädt den Adminstatus ohne N+1-Abfrage', async () => {
  const db = createQueryRecorder();
  const repository = createContentAgentAdminRepository(db);
  await repository.listExistingContent();
  assert.match(db.calls[0].sql, /LEFT JOIN content_existing_post_admin_preferences admin_preference/i);
  assert.match(db.calls[0].sql,
    /COALESCE\(admin_preference\.hidden_from_zero_impression_list, FALSE\) AS zero_impression_hidden/i);
});

test('Ausblenden verlangt den neuesten vollständigen Null-Impressions-Snapshot', async () => {
  const db = createPreferenceTransactionDb({ published: true, eligible: true });
  const repository = createContentAgentAdminRepository(db);
  assert.deepEqual(
    await repository.setExistingContentZeroImpressionHidden({ postId: 19, hidden: true }),
    { status: 'updated' }
  );
  assert.match(db.calls.find(({ sql }) => /coverageDayCount/.test(sql)).sql, /impressions/);
});

test('neue Impressionen blockieren Ausblenden ohne Präferenzschreibzugriff', async () => {
  const db = createPreferenceTransactionDb({ published: true, eligible: false });
  const repository = createContentAgentAdminRepository(db);
  assert.deepEqual(
    await repository.setExistingContentZeroImpressionHidden({ postId: 19, hidden: true }),
    { status: 'not_eligible' }
  );
  assert.equal(db.calls.some(({ sql }) =>
    /INSERT INTO content_existing_post_admin_preferences/.test(sql)), false);
});
~~~

createPreferenceTransactionDb zeichnet BEGIN/COMMIT/ROLLBACK auf, liefert Post- und Eligibility-Fixtures und zählt release() wie der bestehende Transaktionshelper.

- [ ] **Step 2: RED belegen**

~~~bash
node --test tests/contentAgentAdminRepository.test.js
~~~

- [ ] **Step 3: Präferenz in die bestehende Ein-Abfrage-Liste aufnehmen**

Projection:

~~~sql
COALESCE(admin_preference.hidden_from_zero_impression_list, FALSE)
  AS zero_impression_hidden
~~~

Join:

~~~sql
LEFT JOIN content_existing_post_admin_preferences admin_preference
  ON admin_preference.post_id = p.id
~~~

- [ ] **Step 4: Einzelmethode implementieren**

Die Methode validiert postId mit positivePostgresInteger, sperrt den veröffentlichten Post FOR UPDATE und prüft beim Ausblenden ausschließlich den neuesten Snapshot:

~~~sql
SELECT latest.id
FROM (
  SELECT snapshot.id, snapshot.article_age_days,
         snapshot.evaluated_through_date, snapshot.windows_json
  FROM content_article_performance_snapshots snapshot
  WHERE snapshot.post_id = $1::integer
  ORDER BY snapshot.evaluated_through_date DESC, snapshot.id DESC
  LIMIT 1
) latest
WHERE latest.article_age_days >= 28
  AND latest.evaluated_through_date IS NOT NULL
  AND COALESCE((latest.windows_json -> '28' ->> 'complete')::boolean, FALSE) = TRUE
  AND COALESCE((latest.windows_json -> '28' ->> 'coverageDayCount')::integer, 0) >= 28
  AND COALESCE((latest.windows_json -> '28' ->> 'impressions')::numeric, 0) = 0
~~~

Status schreiben:

~~~sql
INSERT INTO content_existing_post_admin_preferences (
  post_id, hidden_from_zero_impression_list, created_at, updated_at
) VALUES ($1::integer, $2::boolean, NOW(), NOW())
ON CONFLICT (post_id) DO UPDATE SET
  hidden_from_zero_impression_list = EXCLUDED.hidden_from_zero_impression_list,
  updated_at = NOW()
~~~

Kein veröffentlichter Post ergibt not_found. Eine nicht mehr qualifizierte Ausblendung ergibt not_eligible. BEGIN/COMMIT, ROLLBACK im Catch und release() im Finally sind Pflicht.

- [ ] **Step 5: Sammelmethode implementieren**

Für TRUE verwendet die Methode INSERT … SELECT über veröffentlichte Posts und den neuesten LATERAL-Snapshot mit denselben Eligibility-Prüfungen. ON CONFLICT setzt TRUE. Für FALSE:

~~~sql
UPDATE content_existing_post_admin_preferences
SET hidden_from_zero_impression_list = FALSE,
    updated_at = NOW()
WHERE hidden_from_zero_impression_list = TRUE
RETURNING post_id
~~~

Beide Zweige laufen transaktional und geben { changedCount: result.rows.length } zurück. Tests prüfen aktuelle Snapshotauswahl, p.published = TRUE, vollständige Abdeckung, null Impressionen, Idempotenz und Rollback.

- [ ] **Step 6: GREEN und Commit**

~~~bash
node --test tests/contentAgentAdminRepository.test.js
git add repositories/contentAgentAdminRepository.js tests/contentAgentAdminRepository.test.js
git commit -m "feat: persist zero impression admin visibility"
~~~

---

### Task 3: Präsentationsservice klassifiziert vier Gruppen

**Files**
- Modify: services/contentAgent/adminPresentationService.js
- Modify: tests/contentAgentAdminPresentation.test.js

**Interfaces**
- Produces: buildExistingContentGroupsPresentation(rows) mit totalCount, visibleArticles, collectingArticles, zeroImpressionArticles und hiddenZeroImpressionArticles.
- Preserves: buildExistingContentListPresentation(rows).

- [ ] **Step 1: Failing Klassifikationstests schreiben**

~~~js
test('Bestandsgruppen trennen Sichtbarkeit, Datensammlung, null und ausgeblendet', () => {
  const groups = buildExistingContentGroupsPresentation([
    performanceRow({ id: 1, impressions: 4 }),
    performanceRow({ id: 2, impressions: 0, complete: false, coverageDayCount: 12 }),
    performanceRow({ id: 3, impressions: 0 }),
    performanceRow({ id: 4, impressions: 0, hidden: true }),
    performanceRow({ id: 5, hasSnapshot: false })
  ]);
  assert.equal(groups.totalCount, 5);
  assert.deepEqual(groups.visibleArticles.map(({ id }) => id), [1]);
  assert.deepEqual(groups.collectingArticles.map(({ id }) => id), [2, 5]);
  assert.deepEqual(groups.zeroImpressionArticles.map(({ id }) => id), [3]);
  assert.deepEqual(groups.hiddenZeroImpressionArticles.map(({ id }) => id), [4]);
});

test('gespeicherte Ausblendung wird bei neuen Impressionen ignoriert', () => {
  const groups = buildExistingContentGroupsPresentation([
    performanceRow({ id: 6, impressions: 1, hidden: true })
  ]);
  assert.deepEqual(groups.visibleArticles.map(({ id }) => id), [6]);
  assert.equal(groups.hiddenZeroImpressionArticles.length, 0);
});
~~~

performanceRow erzeugt die vorhandenen prefixed Snapshotfelder. Grenztests für Artikelalter 27, Abdeckung 27, complete false, keinen Snapshot und defekte Metriken erwarten collectingArticles.

- [ ] **Step 2: RED belegen**

~~~bash
node --test tests/contentAgentAdminPresentation.test.js
~~~

- [ ] **Step 3: Allowlist und Klassifikation implementieren**

Jeder präsentierte Artikel erhält:

~~~js
zeroImpressionHidden: row.zero_impression_hidden === true
~~~

Neue Funktion:

~~~js
export function buildExistingContentGroupsPresentation(rows = []) {
  const items = buildExistingContentListPresentation(rows);
  const groups = {
    totalCount: items.length,
    visibleArticles: [],
    collectingArticles: [],
    zeroImpressionArticles: [],
    hiddenZeroImpressionArticles: []
  };
  for (const item of items) {
    const window28 = item.performance?.windows?.find(({ days }) => days === 28);
    const complete = item.performance?.hasSnapshot === true
      && item.performance.articleAgeDays >= 28
      && window28?.complete === true
      && window28.coverageDayCount >= 28;
    if (!complete) groups.collectingArticles.push(item);
    else if (window28.impressions > 0) groups.visibleArticles.push(item);
    else if (item.zeroImpressionHidden) groups.hiddenZeroImpressionArticles.push(item);
    else groups.zeroImpressionArticles.push(item);
  }
  return groups;
}
~~~

Die Rohfeldprüfung wird um zeroImpressionHidden: false ergänzt. zero_impression_hidden, windows_json, Rohinhalt und Payloads dürfen nicht durchgereicht werden.

- [ ] **Step 4: GREEN und Commit**

~~~bash
node --test tests/contentAgentAdminPresentation.test.js
git add services/contentAgent/adminPresentationService.js tests/contentAgentAdminPresentation.test.js
git commit -m "feat: group existing content by search visibility"
~~~

---

### Task 4: Controller und geschützte Routen

**Files**
- Modify: controllers/adminContentAgentController.js
- Modify: routes/adminContentAgentRoutes.js
- Modify: tests/contentAgentAdminController.test.js
- Modify: tests/contentAgentAdminRoutes.test.js

**Interfaces**
- Produces: hideZeroImpressionAction, showZeroImpressionAction, hideAllZeroImpressionsAction und showAllZeroImpressionsAction.
- Produces: allowlistete visibilityMessage.

- [ ] **Step 1: Failing Routen-/Controllertests schreiben**

POST_PATHS erhält:

~~~js
'/admin/content-agent/existing-content/:id/hide-zero-impressions',
'/admin/content-agent/existing-content/:id/show-zero-impressions',
'/admin/content-agent/existing-content/zero-impressions/hide-all',
'/admin/content-agent/existing-content/zero-impressions/show-all'
~~~

Controllerfälle prüfen: gruppiertes GET-Modell, allowlistete visibility-Meldung, feste Redirects für vier Erfolge, 404 bei not_found, 409 bei not_eligible und keine internen Fehlerdetails.

- [ ] **Step 2: RED belegen**

~~~bash
node --test tests/contentAgentAdminController.test.js tests/contentAgentAdminRoutes.test.js
~~~

- [ ] **Step 3: Meldungen und GET implementieren**

~~~js
const ZERO_IMPRESSION_RESULT_MESSAGES = Object.freeze({
  hidden: 'Der Artikel wurde aus der Null-Impressions-Arbeitsansicht ausgeblendet.',
  shown: 'Der Artikel wird wieder in der Null-Impressions-Arbeitsansicht angezeigt.',
  'all-hidden': 'Alle aktuell qualifizierten Null-Impressions-Artikel wurden ausgeblendet.',
  'all-shown': 'Alle ausgeblendeten Artikel wurden wieder eingeblendet.'
});
~~~

CONTENT_ZERO_IMPRESSION_NOT_ELIGIBLE kommt in CONFLICT_CODES. Sichere Meldung: „Der Artikel gehört nicht mehr zu den Artikeln ohne Impressionen. Bitte lade die Übersicht neu.“

GET rendert:

~~~js
const rows = await adminRepository.listExistingContent();
const existingContentGroups = presentation.buildExistingContentGroupsPresentation(rows);
return res.render('admin/contentAgent/existingContent', {
  existingContentGroups,
  visibilityMessage: ZERO_IMPRESSION_RESULT_MESSAGES[req.query?.visibility] || null
});
~~~

- [ ] **Step 4: Vier Aktionen implementieren**

Einzelaktionen validieren postgresIntegerId, rufen die Einzelmethode mit TRUE/FALSE auf und redirecten auf visibility=hidden beziehungsweise shown. not_found wird CONTENT_POST_NOT_FOUND, not_eligible wird der neue 409-Code. Sammelaktionen rufen die Sammelmethode mit TRUE/FALSE auf und redirecten auf all-hidden beziehungsweise all-shown. Jeder Catch verwendet sendKnownError.

- [ ] **Step 5: Vier Routen verdrahten**

~~~js
router.post('/admin/content-agent/existing-content/zero-impressions/hide-all', isAdmin, verifyCsrfToken, controller.hideAllZeroImpressionsAction);
router.post('/admin/content-agent/existing-content/zero-impressions/show-all', isAdmin, verifyCsrfToken, controller.showAllZeroImpressionsAction);
router.post('/admin/content-agent/existing-content/:id/hide-zero-impressions', isAdmin, verifyCsrfToken, controller.hideZeroImpressionAction);
router.post('/admin/content-agent/existing-content/:id/show-zero-impressions', isAdmin, verifyCsrfToken, controller.showZeroImpressionAction);
~~~

- [ ] **Step 6: GREEN und Commit**

~~~bash
node --test tests/contentAgentAdminController.test.js tests/contentAgentAdminRoutes.test.js
git add controllers/adminContentAgentController.js routes/adminContentAgentRoutes.js \
  tests/contentAgentAdminController.test.js tests/contentAgentAdminRoutes.test.js
git commit -m "feat: manage zero impression admin visibility"
~~~

---

### Task 5: Vier Gruppen in der Adminansicht

**Files**
- Create: views/admin/contentAgent/_existingContentGroup.ejs
- Create: views/admin/contentAgent/_existingContentItem.ejs
- Modify: views/admin/contentAgent/existingContent.ejs
- Modify: tests/contentAgentAdminViews.test.js

**Interfaces**
- Consumes: existingContentGroups und visibilityMessage.
- Preserves: alle Live-, Performance-, Audit-, Revisions-, Outcome- und Optimierungsaktionen.

- [ ] **Step 1: Failing Viewtests schreiben**

Eine sichere Fixture mit je einem Artikel pro Gruppe muss folgende Verträge ergeben:

~~~js
assert.match(html, /Artikel mit Sichtbarkeit/);
assert.match(html, /Daten werden gesammelt/);
assert.match(html, /0 Impressionen in 28 Tagen/);
assert.match(html, /Ausgeblendete Artikel/);
assert.match(html, /action="\/admin\/content-agent\/existing-content\/3\/hide-zero-impressions"/);
assert.match(html, /action="\/admin\/content-agent\/existing-content\/4\/show-zero-impressions"/);
assert.match(html, /action="\/admin\/content-agent\/existing-content\/zero-impressions\/hide-all"/);
assert.match(html, /action="\/admin\/content-agent\/existing-content\/zero-impressions\/show-all"/);
assert.doesNotMatch(html, /name="(?:post_id|impressions|published|hidden)"/i);
~~~

Zusätzlich: nur Sichtbarkeit ist open; jede Gruppe besitzt Anzahl und Leerzustand; Titel werden escaped; bestehende Optimierungs-/Revisionsaktionen bleiben erhalten; jedes Schreibformular enthält _csrf.

- [ ] **Step 2: RED belegen**

~~~bash
node --test tests/contentAgentAdminViews.test.js
~~~

- [ ] **Step 3: Gruppenpartial erstellen**

views/admin/contentAgent/_existingContentGroup.ejs:

~~~ejs
<details class="content-existing-group content-existing-group--<%= group.key %>" <%= group.open ? 'open' : '' %>>
  <summary class="content-existing-group__summary">
    <span><strong><%= group.heading %></strong><small><%= group.description %></small></span>
    <span class="content-existing-group__count"><%= group.items.length %></span>
  </summary>
  <div class="content-existing-group__body">
    <% if (group.bulkAction && group.items.length) { %>
      <form method="post" action="<%= group.bulkAction.url %>" class="content-existing-group__bulk" data-confirm="<%= group.bulkAction.confirmation %>">
        <input type="hidden" name="_csrf" value="<%= csrf %>">
        <button type="submit" class="btn btn-sm btn-outline-secondary"><%= group.bulkAction.label %></button>
      </form>
    <% } %>
    <% if (!group.items.length) { %>
      <div class="content-agent-empty"><i class="fa-regular fa-folder-open" aria-hidden="true"></i>
        <div><strong>Keine Artikel</strong><p><%= group.emptyText %></p></div>
      </div>
    <% } else { %>
      <div class="content-existing-list">
        <% group.items.forEach((item) => { %>
          <%- include('_existingContentItem', { item, csrf, visibilityAction: group.itemVisibilityAction }) %>
        <% }) %>
      </div>
    <% } %>
  </div>
</details>
~~~

- [ ] **Step 4: Artikelpartial mechanisch extrahieren**

Die vorhandene Bestandszeile wird einmal in _existingContentItem.ejs als article.content-existing-item abgebildet. Folgende Blöcke müssen vollständig und unverändert erhalten bleiben:

- performance.windows und Detaillink,
- Auditstatus und Befunde,
- item.outcome inklusive Basis/Danach/Änderung und Queries,
- data-existing-content-optimization samt Status-URL,
- Revision-anlegen-Formular,
- vollständiger data-existing-content-primary-action-Zustandsbaum,
- Liveartikel-Link, Datum, CSRF-Felder und Bestätigungstexte.

Nur die neue gruppenspezifische Aktion kommt hinzu:

~~~ejs
<% if (visibilityAction) { %>
  <form method="post"
    action="/admin/content-agent/existing-content/<%= item.id %>/<%= visibilityAction.path %>"
    data-confirm="<%= visibilityAction.confirmation %>">
    <input type="hidden" name="_csrf" value="<%= csrf %>">
    <button class="btn btn-sm btn-outline-secondary" type="submit"><%= visibilityAction.label %></button>
  </form>
<% } %>
~~~

Ein Before/After-Viewtest zählt die bestehenden Primäraktionen und URLs, damit die Extraktion keine Funktion verliert.

- [ ] **Step 5: Vier Gruppen konfigurieren**

existingContent.ejs baut exakt:

- visible: offen, keine Sichtbarkeitsaktion;
- collecting: geschlossen, keine Sichtbarkeitsaktion;
- zero: geschlossen, item path hide-zero-impressions, Bulk hide-all;
- hidden: geschlossen, item path show-zero-impressions, Bulk show-all.

Die Texte entsprechen der freigegebenen Spezifikation. visibilityMessage wird escaped in einer role=status-Notice angezeigt. Die Inventarzahl verwendet totalCount, nicht nur die offene Gruppe.

- [ ] **Step 6: GREEN und Commit**

~~~bash
node --test tests/contentAgentAdminViews.test.js tests/contentAgentAdminFallbackViews.test.js
git add views/admin/contentAgent/existingContent.ejs \
  views/admin/contentAgent/_existingContentGroup.ejs \
  views/admin/contentAgent/_existingContentItem.ejs \
  tests/contentAgentAdminViews.test.js
git commit -m "feat: show grouped existing content inventory"
~~~

---

### Task 6: Responsive Darstellung

**Files**
- Modify: public/admin.css
- Modify mechanically: public/admin.min.css
- Modify mechanically: public/css-manifest.json
- Modify: tests/contentAgentAdminViews.test.js

**Interfaces**
- Produces: Desktop-Grid und mobile Einspaltenkarten ohne horizontalen Seitenüberlauf.

- [ ] **Step 1: Failing CSS-Vertrag schreiben**

~~~js
assert.match(adminCss, /\.content-existing-group__summary\s*\{/);
assert.match(adminCss, /\.content-existing-item__grid\s*\{[\s\S]*grid-template-columns:/);
assert.match(adminCss,
  /@media \(max-width: 767\.98px\)[\s\S]*\.content-existing-item__grid[\s\S]*grid-template-columns:\s*1fr/);
assert.match(adminCss,
  /@media \(max-width: 767\.98px\)[\s\S]*\.content-existing-item__footer[\s\S]*flex-direction:\s*column/);
~~~

- [ ] **Step 2: RED belegen**

~~~bash
node --test tests/contentAgentAdminViews.test.js
~~~

- [ ] **Step 3: Scopiertes CSS ergänzen**

~~~css
.content-existing-groups,
.content-existing-list { display: grid; gap: 1rem; }
.content-existing-group {
  overflow: clip;
  border: 1px solid var(--content-agent-border);
  border-radius: 0.9rem;
  background: #fff;
}
.content-existing-group__summary,
.content-existing-item__head,
.content-existing-item__footer {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}
.content-existing-group__summary { padding: 1rem; cursor: pointer; background: var(--content-agent-soft); }
.content-existing-group__summary small { display: block; color: var(--content-agent-muted); }
.content-existing-group__count { min-width: 2rem; padding: 0.2rem 0.55rem; text-align: center; font-weight: 800; border-radius: 999px; background: #fff; }
.content-existing-group__body,
.content-existing-item { padding: 1rem; }
.content-existing-group__bulk { display: flex; justify-content: flex-end; margin-bottom: 0.8rem; }
.content-existing-item { min-width: 0; border: 1px solid var(--content-agent-border); border-radius: 0.8rem; }
.content-existing-item__head h3,
.content-existing-item__head code { overflow-wrap: anywhere; }
.content-existing-item__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr) minmax(0, 1fr);
  gap: 1rem;
  margin: 1rem 0;
}
.content-existing-item__grid > section { min-width: 0; }
.content-existing-item__footer { align-items: center; padding-top: 0.8rem; border-top: 1px solid var(--content-agent-border); }

@media (max-width: 767.98px) {
  .content-existing-group__summary,
  .content-existing-item__head,
  .content-existing-item__footer { align-items: stretch; flex-direction: column; }
  .content-existing-item__grid { grid-template-columns: 1fr; }
  .content-existing-group__bulk,
  .content-existing-group__bulk .btn,
  .content-existing-item__footer .content-agent-actions,
  .content-existing-item__footer .content-agent-actions form,
  .content-existing-item__footer .content-agent-actions .btn { width: 100%; }
}
~~~

- [ ] **Step 4: Build, Tests und visuelle Größen prüfen**

~~~bash
npm run build
node --test tests/contentAgentAdminViews.test.js
~~~

Danach 1440×900, 1024×768, 768×1024 und 390×844 prüfen: keine abgeschnittenen Titel/Befunde/Aktionen, kein horizontaler Seitenüberlauf, Tastaturbedienung und korrekte open-Zustände.

- [ ] **Step 5: Commit**

~~~bash
git add public/admin.css public/admin.min.css public/css-manifest.json tests/contentAgentAdminViews.test.js
git commit -m "fix: make existing content groups responsive"
~~~

---

### Task 7: PostgreSQL- und Deploymentvertrag

**Files**
- Create: tests/contentExistingPostAdminPreferencesPgIntegration.test.js
- Modify: tests/contentAgentPostgresIntegration.test.js
- Modify: tests/contentAgentDeploymentGuide.test.js
- Modify: docs/deployment/content-agent-ionos-vps.md

**Interfaces**
- Produces: echte FK-/Upsert-/Eligibility-Verifikation und VPS-Schritte bis Migration 014.

- [ ] **Step 1: Guarded PostgreSQL-Test schreiben**

Mit evaluateContentAgentPgResetGuard ein isoliertes Schema anlegen. Minimal kompatible posts- und Snapshot-Tabellen erstellen, Migration 014 ausführen und folgende Sequenz prüfen:

1. veröffentlichter Post plus vollständiges Nullfenster;
2. einzelnes Ausblenden ergibt TRUE;
3. zweites Ausblenden bleibt genau eine Zeile;
4. neuerer Snapshot mit einer Impression ergibt not_eligible;
5. Post-Löschung entfernt die Präferenz per Cascade;
6. Schema wird im finally gelöscht.

Fixture:

~~~js
const completeZeroWindow = {
  28: {
    complete: true,
    coverageDayCount: 28,
    impressions: 0,
    clicks: 0,
    ctr: 0,
    averagePosition: 0
  }
};
~~~

Ohne Guardvariablen muss der Test vor jedem Connect explizit SKIP melden.

- [ ] **Step 2: Guarded Test ausführen**

~~~bash
node --test tests/contentExistingPostAdminPreferencesPgIntegration.test.js
~~~

Expected: PASS gegen die isolierte Testdatenbank oder sauberer SKIP ohne Verbindung.

- [ ] **Step 3: Deploymenttest zuerst erweitern**

~~~js
assert.match(guide, /014_create_existing_content_admin_preferences\.sql/);
assert.match(guide, /content_existing_post_admin_preferences/);
assert.match(guide, /keine neue \.env-Variable/i);
assert.match(guide, /keine Änderung an der docker-compose\.yml/i);
~~~

Runner-/Integrationstitel und Bereichstexte auf 002–014 aktualisieren.

- [ ] **Step 4: RED belegen**

~~~bash
node --test tests/contentAgentDeploymentGuide.test.js tests/contentAgentPostgresIntegration.test.js
~~~

Expected: Deploymentvertrag FAIL, bis Migration 014 dokumentiert ist.

- [ ] **Step 5: VPS-Anleitung aktualisieren**

Die Anleitung ergänzt Migration 014 in Runnerliste und Schema-Check:

~~~sql
to_regclass('public.content_existing_post_admin_preferences') IS NOT NULL
  AS existing_content_admin_preferences_table
~~~

Sie behält Backup, isolierte Testmigration, zwei idempotente Produktionsläufe, Dry-Run, gemeinsames Image und Healthchecks. Ergänzt werden die Prüfung der vier Gruppen, ein einzelner Hide/Show-Zyklus und ein kontrollierter Bulk-Zyklus. Explizit dokumentieren: keine neue .env-Variable und keine docker-compose.yml-Änderung.

- [ ] **Step 6: GREEN und Commit**

~~~bash
node --test tests/contentExistingPostAdminPreferencesPgIntegration.test.js \
  tests/contentAgentDeploymentGuide.test.js tests/contentAgentPostgresIntegration.test.js
git add tests/contentExistingPostAdminPreferencesPgIntegration.test.js \
  tests/contentAgentPostgresIntegration.test.js tests/contentAgentDeploymentGuide.test.js \
  docs/deployment/content-agent-ionos-vps.md
git commit -m "docs: deploy zero impression admin overview"
~~~

---

### Task 8: Vollständige Regression und Abnahme

**Files**
- Verify only; nur einen durch Tests belegten, auf diese Funktion begrenzten Defekt ändern.

- [ ] **Step 1: Fokussierte Tests**

~~~bash
node --test tests/contentExistingPostAdminPreferencesMigration.test.js \
  tests/contentExistingPostAdminPreferencesPgIntegration.test.js \
  tests/contentAgentMigration.test.js tests/contentAgentAdminRepository.test.js \
  tests/contentAgentAdminPresentation.test.js tests/contentAgentAdminController.test.js \
  tests/contentAgentAdminRoutes.test.js tests/contentAgentAdminViews.test.js \
  tests/contentAgentDeploymentGuide.test.js
~~~

Expected: alle ausführbaren Tests PASS; PostgreSQL nur mit explizitem Guard SKIP.

- [ ] **Step 2: Vollständige Suite und Build**

~~~bash
npm test
npm run build
~~~

Expected: null Fehler; nur dokumentierte umgebungsbedingte Skips; Build Exit 0.

- [ ] **Step 3: Öffentliche Pfade müssen unverändert sein**

~~~bash
git diff origin/main...HEAD -- models/BlogPostModel.js controllers/blogController.js \
  views/blog controllers/sitemapController.js
~~~

Expected: leer. Jede Abweichung ist vor Abschluss zu entfernen.

- [ ] **Step 4: Schreibwegsicherheit prüfen**

~~~bash
rg -n "hide-zero-impressions|show-zero-impressions|zero-impressions/hide-all|zero-impressions/show-all" \
  routes/adminContentAgentRoutes.js views/admin/contentAgent
rg -n 'name="(post_id|impressions|published|hidden)"' views/admin/contentAgent || true
~~~

Expected: jede Route enthält isAdmin und verifyCsrfToken; Formulare senden nur _csrf, keine Metriken oder Zustände.

- [ ] **Step 5: Diffhygiene prüfen**

~~~bash
git diff --check
git status --short
git log --oneline --decorate -10
~~~

Expected: keine Whitespacefehler und nur beabsichtigte Commits.

- [ ] **Step 6: Abschlussbericht**

Ohne leeren Commit dokumentieren:

- fokussierte und vollständige Testergebnisse,
- Buildresultat,
- PostgreSQL-PASS oder expliziten Guard-Skip,
- geprüfte responsive Größen,
- unveränderte öffentliche Pfade,
- keine nötige .env-/Compose-Änderung.

---

## Abdeckungsmatrix

| Anforderung | Tasks |
|---|---|
| Dauerhafte PostgreSQL-Präferenz | 1–2 |
| Vier serverseitige Gruppen | 3 |
| Nur neuester vollständiger 28-Tage-Zeitraum | 2–3 |
| Einzelnes und gesammeltes Hide/Show | 2, 4–5 |
| Admin-/CSRF-Schutz und keine Clientmetriken | 4, 8 |
| Keine öffentliche oder Indexierungswirkung | 1–5, 8 |
| Mobile Darstellung ohne Abschneiden | 5–6 |
| Additive Migration und VPS-Anleitung | 1, 7 |
| Keine .env-/Compose-Änderung | 7–8 |
| Vollständige Regression | 8 |

