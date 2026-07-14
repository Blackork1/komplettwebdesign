# Content-Agent-Lernregeln Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wiederkehrende redaktionelle Prüfhinweise werden artikelübergreifend erkannt, nach drei unterschiedlichen Artikeln als Lernregel vorgeschlagen, ausschließlich nach Adminfreigabe aktiviert und in neue SEO-Briefings, Artikel und Reviews eingebunden.

**Architecture:** Ein separater interner Worker-Job verarbeitet persistierte Prüfberichte ausfallsicher. Eine lokale Taxonomie klassifiziert bekannte Hinweise; nur unbekannte Fingerabdrücke dürfen einmalig über ein striktes OpenAI-Schema eingeordnet werden. Versionierte Adminregeln werden kanonisch in neue Job-Snapshots aufgenommen und anschließend in Briefing, Writer und Reviewer verwendet.

**Tech Stack:** Node.js 20, Express, EJS, PostgreSQL 16/pgvector, OpenAI Responses API mit Structured Outputs, Zod, bestehender Content-Worker und `node:test`.

## Global Constraints

- Nutzte immer richtig ü, ö und ä sowie deutsche Grammatik in Benutzeroberflächen und Dokumentation.
- Eine Kategorie zählt pro Artikel höchstens einmal; drei unterschiedliche Artikel sind für einen Vorschlag erforderlich.
- Keine Regel darf ohne ausdrückliche Adminfreigabe aktiv werden.
- Lernaktionen dürfen niemals Artikel veröffentlichen, freigeben oder veröffentlichte Inhalte verändern.
- Bereits laufende Jobs behalten ihren unveränderlichen Regelsnapshot.
- Fehler der Lernschicht dürfen die normale Entwurfs- und Veröffentlichungslogik nicht blockieren.
- Regeltexte sind begrenzter Klartext ohne HTML, EJS, Skripte, Rollenpräfixe, Steuerzeichen oder Prompt-Trennmarker.
- Es entstehen keine neuen `.env`- oder `docker-compose.yml`-Pflichtwerte.
- Produktionscode wird für jede Aufgabe erst nach einem passend fehlgeschlagenen Test geschrieben.

---

## Geplante Dateistruktur

- `scripts/migrations/009_create_content_learning_rules.sql`: Tabellen, Constraints und Indizes der Lernschicht.
- `services/contentAgent/contentLearningTaxonomy.js`: feste Kategorien, lokale Klassifizierung, Fingerabdrücke und Regeltextvalidierung.
- `services/contentAgent/contentLearningSchemas.js`: Zod-Schema für die optionale Providerklassifizierung.
- `services/contentAgent/contentLearningSnapshotService.js`: kanonische aktive Regelversionen, Hash und stufenspezifische Auswahl.
- `repositories/contentLearningRepository.js`: atomare Beobachtungen, Vorschläge, Regeln, Versionen, Verlauf und Wirksamkeitsabfragen.
- `services/contentAgent/contentLearningService.js`: ausfallsichere Verarbeitung eines gespeicherten Reviews.
- `views/admin/contentAgent/learningRules.ejs`: neuer Adminbereich „Lernregeln“.
- Bestehende Worker-, Prompt-, Controller-, Router-, Präsentations-, Migrations- und Testdateien werden gezielt erweitert.

---

### Task 1: Migration 009 und Migrationsvertrag

**Files:**
- Create: `scripts/migrations/009_create_content_learning_rules.sql`
- Modify: `scripts/runContentAgentMigration.js`
- Create: `tests/contentLearningMigration.test.js`
- Modify: `tests/contentAgentPostgresIntegration.test.js`
- Modify: `tests/contentAgentDeploymentGuide.test.js`

**Interfaces:**
- Produces: Tabellen `content_learning_observations`, `content_learning_classifications`, `content_learning_rule_proposals`, `content_learning_rules`, `content_learning_rule_versions`, `content_learning_events`.
- Produces: idempotente Migration 009 mit partiellen Unique-Indizes für klassifizierte und unklassifizierte Beobachtungen.

- [x] **Step 1: Failing migration contract tests schreiben**

```js
test('Migration 009 zählt klassifizierte Beobachtungen pro Artikel und Kategorie nur einmal', async () => {
  const sql = await readFile(new URL('../scripts/migrations/009_create_content_learning_rules.sql', import.meta.url), 'utf8');
  assert.match(sql, /UNIQUE[^;]*post_id[^;]*category_key/i);
  assert.match(sql, /WHERE category_key <> 'unclassified'/i);
  assert.match(sql, /UNIQUE[^;]*post_id[^;]*fingerprint/i);
});
```

- [x] **Step 2: RED prüfen**

Run: `node --test tests/contentLearningMigration.test.js`

Expected: FAIL, weil Migration 009 noch nicht existiert.

- [x] **Step 3: Migration minimal implementieren**

Die SQL-Datei legt alle sechs Tabellen mit Fremdschlüsseln, Status-Checks, Längenbegrenzungen, Zeitstempeln und folgenden Sperren an:

```sql
CREATE UNIQUE INDEX ux_content_learning_observation_category
  ON content_learning_observations (post_id, category_key)
  WHERE category_key <> 'unclassified';

CREATE UNIQUE INDEX ux_content_learning_observation_unclassified
  ON content_learning_observations (post_id, fingerprint)
  WHERE category_key = 'unclassified';

CREATE UNIQUE INDEX ux_content_learning_pending_category
  ON content_learning_rule_proposals (category_key)
  WHERE status = 'pending';
```

`scripts/runContentAgentMigration.js` führt 009 nach 008 aus und meldet den vollständigen Stand 002–009.

- [x] **Step 4: GREEN und echte Datenbank prüfen**

Run: `node --test tests/contentLearningMigration.test.js tests/contentAgentDeploymentGuide.test.js`

Run: `CONTENT_AGENT_PG_TEST_URL=postgresql://blocksdorf@127.0.0.1/kwd_content_agent_integration_test CONTENT_AGENT_PG_TEST_ALLOW_RESET=true CONTENT_AGENT_PG_TEST_TOKEN=KWDCONTENTAGENT_TEST_RESET_V1 node --test tests/contentAgentPostgresIntegration.test.js`

Expected: PASS; Migrationen sind wiederholt ausführbar.

- [x] **Step 5: Commit**

```bash
git add scripts/migrations/009_create_content_learning_rules.sql scripts/runContentAgentMigration.js tests/contentLearningMigration.test.js tests/contentAgentPostgresIntegration.test.js tests/contentAgentDeploymentGuide.test.js
git commit -m "feat: add content learning schema"
```

---

### Task 2: Taxonomie, sichere Texte und Fingerabdrücke

**Files:**
- Create: `services/contentAgent/contentLearningTaxonomy.js`
- Create: `tests/contentLearningTaxonomy.test.js`
- Modify: `services/contentAgent/contentRuleManifest.js`
- Modify: `tests/contentAgentRuleManifest.test.js`

**Interfaces:**
- Produces: `CONTENT_LEARNING_TAXONOMY_VERSION`.
- Produces: `CONTENT_LEARNING_CATEGORIES` als eingefrorene Definitionen.
- Produces: `classifyLearningIssueLocally(issue)` → `{ categoryKey, confidence, source } | null`.
- Produces: `createLearningIssueFingerprint(issue)` → 64-stelliger SHA-256-Hash.
- Produces: `sanitizeLearningText(value, maxLength)` und `validateLearningRuleText(value)`.

- [x] **Step 1: Failing taxonomy tests schreiben**

Tests müssen unter anderem belegen:

```js
assert.equal(classifyLearningIssueLocally({
  reason: 'Mehrere Kontaktaufforderungen sind sehr ähnlich formuliert.',
  instruction: 'Formuliere mindestens einen CTA spezifischer.'
}).categoryKey, 'cta_repetition_or_fit');

assert.throws(
  () => validateLearningRuleText('<script>alert(1)</script>'),
  { code: 'CONTENT_LEARNING_RULE_TEXT_INVALID' }
);
```

- [x] **Step 2: RED prüfen**

Run: `node --test tests/contentLearningTaxonomy.test.js tests/contentAgentRuleManifest.test.js`

Expected: FAIL wegen fehlendem Modul beziehungsweise fehlender Manifestversion.

- [x] **Step 3: Taxonomie minimal implementieren**

Die zehn freigegebenen Kategorien werden mit lokalem Signalwortsatz, sicherer Standardregel, Zielstufen `seo_brief`, `writer`, `reviewer` und Überanpassungswarnung definiert. Fingerabdrücke verwenden ausschließlich normalisierte Begründung, Anweisung und Verifikationstyp. Regeltexte sind 40–800 Zeichen lang und blockieren Markup, Steuerzeichen sowie Rollen-/Promptpräfixe.

- [x] **Step 4: GREEN prüfen und refaktorieren**

Run: `node --test tests/contentLearningTaxonomy.test.js tests/contentAgentRuleManifest.test.js`

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add services/contentAgent/contentLearningTaxonomy.js services/contentAgent/contentRuleManifest.js tests/contentLearningTaxonomy.test.js tests/contentAgentRuleManifest.test.js
git commit -m "feat: classify recurring review issues"
```

---

### Task 3: Strukturierte Providerklassifizierung mit Cachevertrag

**Files:**
- Create: `services/contentAgent/contentLearningSchemas.js`
- Create: `services/contentAgent/prompts/contentLearningClassifierPrompt.js`
- Modify: `services/contentAgent/openaiContentService.js`
- Modify: `services/contentAgent/contentRuleManifest.js`
- Create: `tests/contentLearningOpenAIService.test.js`
- Modify: `tests/contentAgentOpenAIService.test.js`

**Interfaces:**
- Produces: `LearningClassificationBatchSchema`.
- Produces: `buildContentLearningClassifierPrompt({ issues })`.
- Produces: `openaiContentService.classifyLearningIssues({ issues })` mit dem vorhandenen Reviewmodell.

- [x] **Step 1: Failing schema- und Prompttests schreiben**

```js
assert.deepEqual(result.value.classifications[0], {
  fingerprint: 'a'.repeat(64),
  categoryKey: 'technical_precision',
  confidence: 0.91,
  reason: 'Der Hinweis verlangt fachliche Präzisierung.'
});
```

Die Tests lehnen freie Kategorien, zusätzliche Felder, ungültige Fingerabdrücke und Konfidenzen außerhalb 0–1 ab.

- [x] **Step 2: RED prüfen**

Run: `node --test tests/contentLearningOpenAIService.test.js tests/contentAgentOpenAIService.test.js`

Expected: FAIL, weil Schema, Prompt und Servicemethode fehlen.

- [x] **Step 3: Minimalen Structured-Output-Aufruf implementieren**

Der Prompt erhält nur Fingerabdruck, Begründung, Anweisung und die erlaubten Taxonomieschlüssel. Der Systemtext verbietet Regelaktivierung und neue Kategorien. `classifyLearningIssues` verwendet `config.reviewModel` sowie die bestehende `parse`-Funktion.

- [x] **Step 4: GREEN prüfen**

Run: `node --test tests/contentLearningOpenAIService.test.js tests/contentAgentOpenAIService.test.js`

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add services/contentAgent/contentLearningSchemas.js services/contentAgent/prompts/contentLearningClassifierPrompt.js services/contentAgent/openaiContentService.js services/contentAgent/contentRuleManifest.js tests/contentLearningOpenAIService.test.js tests/contentAgentOpenAIService.test.js
git commit -m "feat: classify unknown learning issues safely"
```

---

### Task 4: Atomare Beobachtungen, Vorschlagsschwelle und Verlauf

**Files:**
- Create: `repositories/contentLearningRepository.js`
- Create: `tests/contentLearningRepository.test.js`
- Modify: `tests/contentAgentPostgresIntegration.test.js`

**Interfaces:**
- Produces: `createContentLearningRepository(db)`.
- Repository methods: `loadReview({ postId, reviewVersion })`, `loadCachedClassifications(fingerprints)`, `storeClassifications(input)`, `recordObservationsAndMaybeProposals(input)`, `listActiveRuleVersions()`, `getAdminDashboard()`, `activateProposal(input)`, `rejectProposal(input)`, `reviseRule(input)`, `changeRuleStatus(input)`.

- [x] **Step 1: Failing Repositorytests schreiben**

Die Tests müssen SQL-Parameter und Transaktionsreihenfolge belegen sowie im echten PostgreSQL zeigen:

```js
await repository.recordObservationsAndMaybeProposals({ postId: 1, reviewVersion: 1, observations: [cta] });
await repository.recordObservationsAndMaybeProposals({ postId: 1, reviewVersion: 2, observations: [cta] });
assert.equal(await distinctArticleCount('cta_repetition_or_fit'), 1);
```

Nach Artikel 2 existiert kein Vorschlag; nach Artikel 3 genau ein `pending`-Vorschlag. Zwei parallele dritte Beobachtungen dürfen kein Duplikat erzeugen.

- [x] **Step 2: RED prüfen**

Run: `node --test tests/contentLearningRepository.test.js`

Expected: FAIL wegen fehlendem Repository.

- [x] **Step 3: Repository minimal implementieren**

`recordObservationsAndMaybeProposals` verwendet `BEGIN`, einen Advisory-Xact-Lock auf den Kategorienamen, Upserts, `COUNT(DISTINCT post_id)` und die lokale Regelvorlage. Aktivierung sperrt den Vorschlag `FOR UPDATE`, prüft `proposalVersion`, validiert den Regeltext, schreibt Regel und Version sowie ein Auditereignis und veröffentlicht keinen Beitrag.

- [x] **Step 4: GREEN und echte Nebenläufigkeit prüfen**

Run: `node --test tests/contentLearningRepository.test.js`

Run: `CONTENT_AGENT_PG_TEST_URL=postgresql://blocksdorf@127.0.0.1/kwd_content_agent_integration_test CONTENT_AGENT_PG_TEST_ALLOW_RESET=true CONTENT_AGENT_PG_TEST_TOKEN=KWDCONTENTAGENT_TEST_RESET_V1 node --test tests/contentAgentPostgresIntegration.test.js`

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add repositories/contentLearningRepository.js tests/contentLearningRepository.test.js tests/contentAgentPostgresIntegration.test.js
git commit -m "feat: persist content learning evidence"
```

---

### Task 5: Interner Beobachtungsjob und Providerkosten

**Files:**
- Create: `services/contentAgent/contentLearningService.js`
- Create: `tests/contentLearningService.test.js`
- Modify: `repositories/contentJobRepository.js`
- Modify: `scripts/contentWorker.js`
- Modify: `services/contentAgent/draftPipeline.js`
- Modify: `services/contentAgent/reviewIssueOptimizationService.js`
- Modify: `tests/contentAgentJobRepository.test.js`
- Modify: `tests/contentAgentWorker.test.js`
- Modify: `tests/contentAgentDraftPipeline.test.js`
- Modify: `tests/contentReviewIssueOptimizationService.test.js`

**Interfaces:**
- Produces: `enqueueLearningObservationJob({ postId, reviewVersion }, db)` mit Idempotency-Key `learning-observation:<postId>:<reviewVersion>`.
- Produces: `runContentLearningJob({ claim, run, runtimeSnapshot, leaseGuard }, dependencies)`.
- Consumes: Taxonomie, OpenAI-Service, Kostenreservierung, Run-Repository und `contentLearningRepository`.

- [x] **Step 1: Failing Job- und Servicetests schreiben**

Belegen:

- ungültige Payloads werden permanent abgelehnt,
- bekannte Hinweise verursachen keinen OpenAI-Aufruf,
- unbekannte gecachte Fingerabdrücke verursachen keinen zweiten Aufruf,
- ungeklärte Providerreservierungen werden nicht erneut ausgeführt,
- Fehler des Lernjobs verändern den Entwurf nicht,
- initiale Draft-Persistenz und erfolgreiche Prüfhinweisoptimierung reihen genau einen Job pro Review-Version ein.

- [x] **Step 2: RED prüfen**

Run: `node --test tests/contentLearningService.test.js tests/contentAgentWorker.test.js tests/contentAgentDraftPipeline.test.js tests/contentReviewIssueOptimizationService.test.js`

Expected: FAIL wegen fehlendem Jobtyp und Handler.

- [x] **Step 3: Minimalen Workerfluss implementieren**

Der Service lädt den gespeicherten Review, klassifiziert lokal, liest Caches und führt höchstens einen Batch-Provideraufruf für unbekannte Fingerabdrücke aus. Der Aufruf verwendet eine eigene Stage-ID `learning_classification:<reviewVersion>`, Reviewpreise und die bestehende Reservation-/Persistenzlogik. Anschließend werden Beobachtungen und Vorschläge atomar gespeichert.

Der Generierungs- und Optimierungsfluss fängt ausschließlich Fehler beim Einreihen des Lernjobs ab und protokolliert sie; der bereits persistierte Entwurf bleibt terminal erfolgreich.

- [x] **Step 4: GREEN prüfen**

Run: `node --test tests/contentLearningService.test.js tests/contentAgentJobRepository.test.js tests/contentAgentWorker.test.js tests/contentAgentDraftPipeline.test.js tests/contentReviewIssueOptimizationService.test.js`

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add services/contentAgent/contentLearningService.js repositories/contentJobRepository.js scripts/contentWorker.js services/contentAgent/draftPipeline.js services/contentAgent/reviewIssueOptimizationService.js tests/contentLearningService.test.js tests/contentAgentJobRepository.test.js tests/contentAgentWorker.test.js tests/contentAgentDraftPipeline.test.js tests/contentReviewIssueOptimizationService.test.js
git commit -m "feat: process learning observations asynchronously"
```

---

### Task 6: Versionierte Regelsnapshots und Promptintegration

**Files:**
- Create: `services/contentAgent/contentLearningSnapshotService.js`
- Create: `tests/contentLearningSnapshot.test.js`
- Modify: `services/contentAgent/runtimeConfigService.js`
- Modify: `scripts/contentWorker.js`
- Modify: `services/contentAgent/contentRuleManifest.js`
- Modify: `services/contentAgent/prompts/seoBriefPrompt.js`
- Modify: `services/contentAgent/prompts/articleWriterPrompt.js`
- Modify: `services/contentAgent/prompts/articleReviewerPrompt.js`
- Modify: `services/contentAgent/draftPipeline.js`
- Modify: `services/contentAgent/reviewIssueOptimizationService.js`
- Modify: `tests/contentAgentJobRuleSnapshot.test.js`
- Modify: `tests/contentAgentOpenAIService.test.js`
- Modify: `tests/contentAgentDraftPipeline.test.js`
- Modify: `tests/contentReviewIssueOptimizationService.test.js`

**Interfaces:**
- Produces: `buildLearningRuleSnapshot(rules)` → `{ version, rules, hash }`.
- Produces: `validateLearningRuleSnapshot(snapshot)`.
- Produces: `learningRulesForStage(snapshot, stage, categoryKeys?)`.
- `createContentAgentJobSnapshot` consumes `activeLearningRules` und persistiert den kanonischen Snapshot.

- [x] **Step 1: Failing Snapshot- und Prompttests schreiben**

```js
assert.deepEqual(
  learningRulesForStage(snapshot, 'writer').map(({ id, version }) => [id, version]),
  [[2, 1], [7, 3]]
);
assert.equal(validateLearningRuleSnapshot(structuredClone(snapshot)).valid, true);
```

Manipulierte Texte, Reihenfolgen, Einzelhashes oder Listenhashes müssen fehlschlagen. Prompttests prüfen, dass nur freigegebene Felder und nur stufenrelevante Regeln übertragen werden.

- [x] **Step 2: RED prüfen**

Run: `node --test tests/contentLearningSnapshot.test.js tests/contentAgentJobRuleSnapshot.test.js tests/contentAgentOpenAIService.test.js`

Expected: FAIL.

- [x] **Step 3: Snapshot und drei Promptstufen implementieren**

Vor dem ersten `content_run` lädt der Worker aktive Regeln und übergibt sie an `createContentAgentJobSnapshot`. Der Snapshot wird nach ID und Version sortiert, pro Regel sowie als Liste gehasht und auf höchstens 50 Regeln beziehungsweise 40 KiB begrenzt.

Promptinput:

```js
{
  learningRules: [{ id, version, categoryKey, instruction }]
}
```

SEO-Briefing, Writer und Reviewer erhalten jeweils nur ihre Stufe. Die gezielte Optimierung filtert zusätzlich auf die Kategorien der ausgewählten Prüfhinweise.

- [x] **Step 4: GREEN und Snapshot-Wiederaufnahme prüfen**

Run: `node --test tests/contentLearningSnapshot.test.js tests/contentAgentJobRuleSnapshot.test.js tests/contentAgentOpenAIService.test.js tests/contentAgentDraftPipeline.test.js tests/contentReviewIssueOptimizationService.test.js`

Expected: PASS; ein Retry verwendet unverändert denselben Snapshot.

- [x] **Step 5: Commit**

```bash
git add services/contentAgent/contentLearningSnapshotService.js services/contentAgent/runtimeConfigService.js scripts/contentWorker.js services/contentAgent/contentRuleManifest.js services/contentAgent/prompts/seoBriefPrompt.js services/contentAgent/prompts/articleWriterPrompt.js services/contentAgent/prompts/articleReviewerPrompt.js services/contentAgent/draftPipeline.js services/contentAgent/reviewIssueOptimizationService.js tests/contentLearningSnapshot.test.js tests/contentAgentJobRuleSnapshot.test.js tests/contentAgentOpenAIService.test.js tests/contentAgentDraftPipeline.test.js tests/contentReviewIssueOptimizationService.test.js
git commit -m "feat: apply approved learning rules to new content"
```

---

### Task 7: Adminaktionen für Vorschläge und Regeln

**Files:**
- Create: `services/contentAgent/contentLearningAdminService.js`
- Create: `tests/contentLearningAdminService.test.js`
- Modify: `controllers/adminContentAgentController.js`
- Modify: `routes/adminContentAgentRoutes.js`
- Modify: `tests/contentAgentAdminController.test.js`
- Modify: `tests/contentAgentAdminRoutes.test.js`

**Interfaces:**
- Produces: `createContentLearningAdminService({ repository })`.
- Controller actions: `learningRulesPage`, `activateLearningProposalAction`, `rejectLearningProposalAction`, `reviseLearningRuleAction`, `changeLearningRuleStatusAction`.

- [x] **Step 1: Failing Sicherheits- und Übergangstests schreiben**

Alle POST-Routen benötigen `isAdmin`, `verifyCsrfToken`, `confirmed=true`, positive IDs und eine erwartete Version. Tests belegen erlaubte Übergänge:

```text
pending -> approved
pending -> rejected
active -> paused -> active
active|paused -> disabled
active|paused -> neue Version active
```

Veraltete Versionen liefern eine verständliche Konfliktmeldung. Keine Aktion ruft einen Veröffentlichungsdienst auf.

- [x] **Step 2: RED prüfen**

Run: `node --test tests/contentLearningAdminService.test.js tests/contentAgentAdminController.test.js tests/contentAgentAdminRoutes.test.js`

Expected: FAIL.

- [x] **Step 3: Adminservice, Controller und Routen implementieren**

Routen:

```text
GET  /admin/content-agent/learning-rules
POST /admin/content-agent/learning-rules/proposals/:id/activate
POST /admin/content-agent/learning-rules/proposals/:id/reject
POST /admin/content-agent/learning-rules/:id/revise
POST /admin/content-agent/learning-rules/:id/status
```

Der Service validiert Regeltexte vor dem Repositoryaufruf und reicht Admin-ID sowie Adminname für das Audit durch.

- [x] **Step 4: GREEN prüfen**

Run: `node --test tests/contentLearningAdminService.test.js tests/contentAgentAdminController.test.js tests/contentAgentAdminRoutes.test.js`

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add services/contentAgent/contentLearningAdminService.js controllers/adminContentAgentController.js routes/adminContentAgentRoutes.js tests/contentLearningAdminService.test.js tests/contentAgentAdminController.test.js tests/contentAgentAdminRoutes.test.js
git commit -m "feat: manage content learning rules securely"
```

---

### Task 8: Adminoberfläche und sichere Präsentation

**Files:**
- Create: `views/admin/contentAgent/learningRules.ejs`
- Modify: `views/admin/contentAgent/_tabs.ejs`
- Modify: `services/contentAgent/adminPresentationService.js`
- Modify: `public/css/admin-content-agent.css`
- Modify: `tests/contentAgentAdminViews.test.js`
- Modify: `tests/contentAgentAdminPresentation.test.js`

**Interfaces:**
- Produces: `presentContentLearningDashboard(raw)` ohne Rohpayloads, vollständige Artikeltexte oder Providerantworten.
- View erhält `learningDashboard`, `csrfToken` und sichere Statusmeldungen.

- [x] **Step 1: Failing View- und Präsentationstests schreiben**

Tests rendern Vorschläge, aktive Regeln, Beobachtungen und Verlauf. Sie prüfen deutsche Umlaute, escaped Regeltexte, CSRF-Felder, Versionsfelder, Bestätigungsdialoge und Abwesenheit von `runtime_snapshot_json`, Providerantworten und vollständigem Artikel-HTML.

- [x] **Step 2: RED prüfen**

Run: `node --test tests/contentAgentAdminViews.test.js tests/contentAgentAdminPresentation.test.js`

Expected: FAIL.

- [x] **Step 3: Präsentation, Reiter und responsive Ansicht implementieren**

Der neue Reiter heißt „Lernregeln“. Die Seite zeigt:

- neue Vorschläge mit Belegen und Regeltext,
- aktive, pausierte und deaktivierte Regeln,
- Beobachtungszahlen pro Kategorie,
- unklassifizierte Hinweise,
- Auditverlauf,
- Statusmeldungen für Aktivierung, Ablehnung, Änderung und Konflikte.

Mobile Formulare bleiben einspaltig und Aktionen sind eindeutig beschriftet.

- [x] **Step 4: GREEN und CSS-Build prüfen**

Run: `node --test tests/contentAgentAdminViews.test.js tests/contentAgentAdminPresentation.test.js`

Run: `npm run build`

Expected: PASS; CSS-Manifest wird konsistent erzeugt.

- [x] **Step 5: Commit**

```bash
git add views/admin/contentAgent/learningRules.ejs views/admin/contentAgent/_tabs.ejs services/contentAgent/adminPresentationService.js public/css/admin-content-agent.css public/css/app.bundle.css public/css/manifest.json tests/contentAgentAdminViews.test.js tests/contentAgentAdminPresentation.test.js
git commit -m "feat: add content learning dashboard"
```

---

### Task 9: Wirksamkeitsstatus und GSC-Kontext

**Files:**
- Create: `services/contentAgent/contentLearningEffectivenessService.js`
- Create: `tests/contentLearningEffectiveness.test.js`
- Modify: `repositories/contentLearningRepository.js`
- Modify: `services/contentAgent/adminPresentationService.js`
- Modify: `views/admin/contentAgent/learningRules.ejs`
- Modify: `tests/contentLearningRepository.test.js`
- Modify: `tests/contentAgentAdminPresentation.test.js`
- Modify: `tests/contentAgentAdminViews.test.js`

**Interfaces:**
- Produces: `evaluateLearningRuleEffectiveness({ articleCount, recurrenceCount, baselineRate, currentRate })` → `effective | observing | revision_recommended`.
- Repository liefert pro Regelversion Artikelzahl, Wiederholungen, Qualitätsscore sowie vorhandene aggregierte GSC-Metriken.

- [x] **Step 1: Failing Wirksamkeitstests schreiben**

Belegen:

- unter fünf Artikeln immer `observing`,
- keine oder deutlich geringere Wiederholung ergibt `effective`,
- wiederholtes Auftreten ohne Verbesserung ergibt `revision_recommended`,
- fehlende GSC-Daten ändern den qualitativen Status nicht.

- [x] **Step 2: RED prüfen**

Run: `node --test tests/contentLearningEffectiveness.test.js tests/contentLearningRepository.test.js tests/contentAgentAdminPresentation.test.js tests/contentAgentAdminViews.test.js`

Expected: FAIL.

- [x] **Step 3: Auswertung und Read-only-Anzeige implementieren**

Die Berechnung verwendet ausschließlich Artikel, deren persistierter Runtime-Snapshot die exakte Regel-ID und Version enthält. GSC-Daten werden nur angezeigt. `revision_recommended` erzeugt einen Hinweis, aber keinen automatischen Schreibvorgang.

- [x] **Step 4: GREEN prüfen**

Run: `node --test tests/contentLearningEffectiveness.test.js tests/contentLearningRepository.test.js tests/contentAgentAdminPresentation.test.js tests/contentAgentAdminViews.test.js`

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add services/contentAgent/contentLearningEffectivenessService.js repositories/contentLearningRepository.js services/contentAgent/adminPresentationService.js views/admin/contentAgent/learningRules.ejs tests/contentLearningEffectiveness.test.js tests/contentLearningRepository.test.js tests/contentAgentAdminPresentation.test.js tests/contentAgentAdminViews.test.js
git commit -m "feat: measure content learning effectiveness"
```

---

### Task 10: Gesamtintegration, Rolloutdokumentation und Abnahme

**Files:**
- Modify: `tests/contentAgentPostgresIntegration.test.js`
- Modify: `tests/contentPublicationService.test.js`
- Modify: `tests/contentAutoPublishPolicy.test.js`
- Modify: `docs/deployment/content-agent-ionos-vps.md`
- Modify: `docs/superpowers/plans/2026-07-14-content-agent-lernregeln.md`

**Interfaces:**
- Verifies: Review → Beobachtung → dritter Artikel → Vorschlag → Adminaktivierung → neuer Job-Snapshot → Promptintegration → erneuter Review.
- Verifies: keine Lernaktion setzt `published`, `approved_at` oder `approved_review_version`.

- [x] **Step 1: Failing Ende-zu-Ende-Test ergänzen**

Der echte PostgreSQL-Test erzeugt drei unterschiedliche unveröffentlichte KI-Artikel mit derselben Kategorie, aktiviert den Vorschlag, startet einen vierten Job und prüft die exakte Regelversion im Snapshot. Ein paralleler dritter Beleg darf nur einen Vorschlag erzeugen.

- [x] **Step 2: RED prüfen**

Run: `CONTENT_AGENT_PG_TEST_URL=postgresql://blocksdorf@127.0.0.1/kwd_content_agent_integration_test CONTENT_AGENT_PG_TEST_ALLOW_RESET=true CONTENT_AGENT_PG_TEST_TOKEN=KWDCONTENTAGENT_TEST_RESET_V1 node --test tests/contentAgentPostgresIntegration.test.js`

Expected: FAIL, bis alle Integrationskanten verbunden sind.

- [x] **Step 3: Fehlende Integrationskanten minimal schließen und VPS-Anleitung ergänzen**

Die Anleitung nennt Migration 009, Backup, idempotenten Migrationslauf, Build, Recreate von `app` und `content-worker`, Healthcheck sowie die klare Aussage, dass `.env` und `docker-compose.yml` unverändert bleiben.

- [x] **Step 4: Vollständige Abnahme ausführen**

Run: `OPENAI_API_KEY=test-key npm test`

Expected: 0 fehlgeschlagene Tests.

Run: `npm run build`

Expected: Exit-Code 0.

Run: `CONTENT_AGENT_PG_TEST_URL=postgresql://blocksdorf@127.0.0.1/kwd_content_agent_integration_test CONTENT_AGENT_PG_TEST_ALLOW_RESET=true CONTENT_AGENT_PG_TEST_TOKEN=KWDCONTENTAGENT_TEST_RESET_V1 node --test tests/contentAgentPostgresIntegration.test.js`

Expected: 0 fehlgeschlagene Tests und 0 übersprungene PostgreSQL-Tests.

Run: `git diff --check`

Expected: keine Ausgabe.

- [x] **Step 5: Sicherheitscheck durchführen**

Manuell anhand des Diffs bestätigen:

- keine öffentliche Lernroute,
- kein automatisches Aktivieren,
- kein automatisches Veröffentlichen,
- keine Secrets oder Rohproviderdaten in Views,
- alle Adminwrites mit CSRF, Bestätigung und Versionssperre,
- keine neue Pflichtkonfiguration.

- [x] **Step 6: Plan abhaken und Abschlusscommit erstellen**

```bash
git add docs/deployment/content-agent-ionos-vps.md docs/superpowers/plans/2026-07-14-content-agent-lernregeln.md tests/contentAgentPostgresIntegration.test.js tests/contentPublicationService.test.js tests/contentAutoPublishPolicy.test.js
git commit -m "test: verify content learning workflow"
```
