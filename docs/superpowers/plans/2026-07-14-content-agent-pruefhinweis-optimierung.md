# Content-Agent Prüfhinweis-Optimierung Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Einzelne oder alle nicht blockierenden redaktionellen Prüfhinweise eines unveröffentlichten KI-Artikels gezielt reparieren, technisch und redaktionell neu prüfen und atomar als neue Reviewversion speichern.

**Architecture:** Ein neuer Queuejob `optimize_review_issues` wird über eine CSRF-geschützte Adminaktion eingereiht. Ein eigenständiger Optimierungsservice selektiert ausschließlich persistierte Hinweise, führt genau eine strukturierte Reparatur und eine redaktionelle Neuprüfung aus und übergibt das Ergebnis an ein transaktionales Repository. Der vorhandene Worker, das Monatsbudget, die Provider-Fences und die Veröffentlichungsvalidierung bleiben die maßgeblichen Sicherheitsgrenzen.

**Tech Stack:** Node.js 20, Express, EJS, PostgreSQL 16, OpenAI Responses API mit Structured Outputs, Zod, node:test, Bootstrap.

## Global Constraints

- Sichtbare Texte verwenden korrektes Deutsch mit ä, ö, ü und ß.
- Die Funktion bearbeitet ausschließlich unveröffentlichte KI-Entwürfe im Format `static_html`.
- Es wird ausschließlich `contentHtml` aus der KI-Reparatur übernommen.
- Titel, Slug, Kurzbeschreibung, Meta-Daten, Open-Graph-Daten, FAQ, Bild, SEO-Zuordnung, Quellen und CTA-Pfade bleiben erhalten.
- Genau eine Reparatur- und eine Reviewstufe dürfen kostenpflichtig ausgeführt werden.
- Vor jedem Provideraufruf müssen Reviewversion, Monatsbudget und aktive Worker-Lease geprüft sein.
- Ein unklarer Providerzustand darf nicht automatisch erneut ausgeführt werden.
- Keine Aktion veröffentlicht, plant oder genehmigt einen Artikel.
- Persistenz von HTML, Qualitätsscore, Qualitätsbericht und Reviewversion erfolgt atomar.

---

### Task 1: Adminvertrag für Einzel- und Sammeloptimierung

**Files:**
- Modify: `controllers/adminContentAgentController.js`
- Modify: `routes/adminContentAgentRoutes.js`
- Modify: `views/admin/contentAgent/draftEdit.ejs`
- Modify: `views/admin/contentAgent/_riskChecklist.ejs`
- Test: `tests/contentAgentAdminController.test.js`
- Test: `tests/contentAgentAdminRoutes.test.js`
- Test: `tests/contentAgentAdminViews.test.js`

**Interfaces:**
- Consumes: `draftService.getDraftForReview(postId)` und `jobRepository.enqueueJob(input)`.
- Produces: `optimizeReviewIssuesAction(req, res, next)` und POST `/admin/content-agent/drafts/:id/optimize-review`.

- [ ] **Step 1: Failing View- und Routentests schreiben**

Die Tests rendern einen Entwurf mit einem nicht blockierenden `focusedReview` und verlangen:

```js
assert.match(html, /action="\/admin\/content-agent\/drafts\/19\/optimize-review"/);
assert.match(html, /name="issue_mode" value="single"/);
assert.match(html, /name="issue_index" value="0"/);
assert.match(html, /name="issue_mode" value="all"/);
assert.match(html, /name="expected_review_version" value="3"/);
assert.match(html, /Diesen Hinweis beheben/);
assert.match(html, /Alle Hinweise optimieren und neu prüfen/);
```

Der Routentest verlangt die neue Route hinter `isAdmin` und `verifyCsrfToken`.

- [ ] **Step 2: RED verifizieren**

Run:

```bash
node --test tests/contentAgentAdminController.test.js tests/contentAgentAdminRoutes.test.js tests/contentAgentAdminViews.test.js
```

Expected: FAIL, weil Route, Controlleraktion und Formulare fehlen.

- [ ] **Step 3: Controllervertrag minimal implementieren**

Die Aktion akzeptiert ausschließlich:

```js
{
  confirmed: 'true',
  expected_review_version: '3',
  issue_mode: 'single' | 'all',
  issue_index: '0'
}
```

Sie lädt den Entwurf, vergleicht `expected_review_version` mit `draft.reviewVersion`, verlangt mindestens einen Hinweis und `riskReview.blocked !== true` und reiht anschließend ein:

```js
await jobRepository.enqueueJob({
  jobType: 'optimize_review_issues',
  idempotencyKey: `optimize_review_issues:${postId}:${expectedReviewVersion}:${randomUUID()}`,
  payload: {
    source: 'admin_regeneration',
    post_id: postId,
    forced_mode: 'review',
    expected_review_version: expectedReviewVersion,
    issue_mode: mode,
    ...(mode === 'single' ? { issue_index: issueIndex } : {})
  },
  maxAttempts
});
```

Ungültige oder veraltete Werte erhalten sichere 409-Fehlercodes; fehlende Bestätigung erhält 400.

- [ ] **Step 4: Formulare und Queuehinweis implementieren**

`draftEdit.ejs` übergibt `postId`, `csrf`, `reviewVersion` und `actionsEnabled` an `_riskChecklist.ejs`. Der Partial rendert pro Hinweis ein Einzelaktionsformular und unter der Liste ein Sammelformular. Beide enthalten eine Kostenwarnung im Bestätigungsdialog und werden bei blockiertem Bericht nicht gerendert.

- [ ] **Step 5: GREEN verifizieren**

Run:

```bash
node --test tests/contentAgentAdminController.test.js tests/contentAgentAdminRoutes.test.js tests/contentAgentAdminViews.test.js
```

Expected: PASS.

---

### Task 2: Reiner Hinweis- und Kandidatenvertrag

**Files:**
- Create: `services/contentAgent/reviewIssueOptimizationService.js`
- Test: `tests/contentReviewIssueOptimizationService.test.js`

**Interfaces:**
- Produces: `REVIEW_ISSUE_OPTIMIZATION_JOB_TYPE`, `selectOptimizationIssues(draft, payload)` und `buildOptimizationCandidate(draft, repairedArticle)`.
- Consumes: persistierten `quality_report_json.focusedReview`, `ArticleOutputSchema` und `ReviewOutputSchema`.

- [ ] **Step 1: Failing Vertragstests schreiben**

Die Tests beweisen:

```js
assert.deepEqual(selectOptimizationIssues(draft, {
  expected_review_version: 3,
  issue_mode: 'single',
  issue_index: 0
}), [draft.metadata.quality_report_json.focusedReview.items[0]]);

assert.equal(
  buildOptimizationCandidate(draft, repaired).contentHtml,
  repaired.contentHtml
);
assert.equal(
  buildOptimizationCandidate(draft, repaired).metaTitle,
  draft.post.meta_title
);
```

Zusätzliche Tests lehnen veraltete Version, leere Hinweise, blockierten Bericht, ungültigen Modus und außerhalb liegenden Index vor jedem Provideraufruf ab.

- [ ] **Step 2: RED verifizieren**

Run:

```bash
node --test tests/contentReviewIssueOptimizationService.test.js
```

Expected: FAIL mit fehlendem Modul beziehungsweise fehlenden Exporten.

- [ ] **Step 3: Reine Selektions- und Mergefunktionen implementieren**

`selectOptimizationIssues` liefert im Einzelmodus genau den persistierten Hinweis und im Sammelmodus eine Kopie aller persistierten Hinweise. `buildOptimizationCandidate` baut den vollständigen Artikel aus dem aktuellen Entwurf und ersetzt ausschließlich `contentHtml` durch das Reparaturergebnis.

- [ ] **Step 4: GREEN verifizieren**

Run:

```bash
node --test tests/contentReviewIssueOptimizationService.test.js
```

Expected: PASS.

---

### Task 3: Budgetierte Reparatur und redaktionelle Neuprüfung

**Files:**
- Modify: `services/contentAgent/reviewIssueOptimizationService.js`
- Test: `tests/contentReviewIssueOptimizationService.test.js`

**Interfaces:**
- Produces: `runReviewIssueOptimizationJob({ claim, run, runtimeSnapshot, leaseGuard }, dependencies)`.
- Consumes: `openaiService.repairArticle`, `openaiService.reviewArticle`, `validateArticle`, `buildFocusedRiskReport`, `costService`, `runRepository` und `optimizationRepository`.

- [ ] **Step 1: Failing Pipeline-Tests schreiben**

Der Erfolgstest erwartet die Reihenfolge:

```js
assert.deepEqual(calls.map(([name]) => name), [
  'lease', 'load', 'repair', 'validate', 'review', 'focused-review', 'commit', 'finish'
]);
assert.deepEqual(reservations.map(({ stageId }) => stageId), [
  'optimize_review_issues:19:repair',
  'optimize_review_issues:19:review'
]);
```

Weitere Tests beweisen:

- Reparatur erhält im Einzelmodus genau ein Issue und im Sammelmodus alle Issues.
- Reviewer erhält die sanitizierte Kandidatenfassung.
- Fehlerhafte Validierung stoppt vor dem Review.
- Review mit Score unter 80, `passed=false`, `requiresManualReview=true`, aktivem Risiko oder blockiertem fokussierten Bericht wird nicht gespeichert.
- Persistierte Providerenvelopes werden beim Retry wiederverwendet.
- Eine offene Providerreservierung wird nicht erneut ausgeführt.
- Stale-Version stoppt vor Budgetreservierung und Provideraufruf.

- [ ] **Step 2: RED verifizieren**

Run:

```bash
node --test tests/contentReviewIssueOptimizationService.test.js
```

Expected: FAIL, weil der Jobrunner fehlt.

- [ ] **Step 3: Zwei persistente Providerstufen implementieren**

Jede Stufe verwendet einen Envelope:

```js
{
  value,
  responseId,
  usage,
  promptVersion,
  reviewVersionBefore,
  reservationMonth,
  actualCost
}
```

Die Stufe reserviert das Budget, prüft die Lease, ruft den Provider, persistiert den Envelope, rechnet das Budget ab und protokolliert den Providerzustand. Persistierte, schemagültige Envelopes werden ohne zweiten Provideraufruf übernommen.

- [ ] **Step 4: Qualitäts-Gate implementieren**

Nach der Reparatur wird ausschließlich `contentHtml` übernommen und `validateArticle` ausgeführt. Der Reviewer prüft die sanitizierte Fassung. `buildFocusedRiskReport` erzeugt den neuen Bericht. Commit ist nur erlaubt, wenn:

```js
review.passed === true
&& review.score >= 80
&& review.requiresManualReview === false
&& Object.values(review.risks).every((value) => value === false)
&& focusedReview.blocked === false
```

- [ ] **Step 5: GREEN verifizieren**

Run:

```bash
node --test tests/contentReviewIssueOptimizationService.test.js
```

Expected: PASS.

---

### Task 4: Atomarer Optimierungs-Commit mit Fence

**Files:**
- Create: `repositories/contentReviewIssueOptimizationRepository.js`
- Modify: `services/contentAgent/reviewIssueOptimizationService.js`
- Test: `tests/contentReviewIssueOptimizationRepository.test.js`
- Test: `tests/contentAgentPostgresIntegration.test.js`

**Interfaces:**
- Produces: `createContentReviewIssueOptimizationRepository(db)` mit `getDraftWithMetadata(postId)`, `getValidationContext(postId, draft)`, `commitOptimization(input)` und `reconcileOptimizationCommit(input)`.
- Consumes: `postId`, `expectedReviewVersion`, sanitizierte HTML-Fassung, Score, Qualitätsbericht und Commit-Key.

- [ ] **Step 1: Failing Repositorytests schreiben**

Der Test erwartet eine Transaktion, die:

```sql
UPDATE posts
SET content = $2,
    review_version = review_version + 1,
    workflow_status = 'needs_review',
    approved_review_version = NULL,
    approved_at = NULL,
    approved_by_admin_id = NULL,
    updated_at = NOW()
WHERE id = $1 AND review_version = $3
```

und in derselben Transaktion `content_post_metadata.quality_score`, `quality_report_json` sowie `generation_metadata_json.lastReviewIssueOptimization` aktualisiert.

- [ ] **Step 2: RED verifizieren**

Run:

```bash
node --test tests/contentReviewIssueOptimizationRepository.test.js
```

Expected: FAIL mit fehlendem Repository.

- [ ] **Step 3: Repository und Fence implementieren**

Der Commit-Key folgt exakt:

```text
<runId>:optimize_review_issues:<postId>
```

Ein vorhandener identischer Fence liefert idempotent denselben Zustand. Eine andere Reviewversion liefert `CONTENT_REGENERATION_STALE`. Ein unklarer Commit wird über Fence und Reviewversion als `committed`, `not_committed` oder `concurrent` abgeglichen.

- [ ] **Step 4: Echten PostgreSQL-Test ergänzen**

Der Integrationstest erzeugt einen unveröffentlichten Entwurf mit fokussiertem Hinweis, führt den Commit aus und prüft anschließend HTML, Score, Bericht, Reviewversion, gelöschte Freigabe und Fence in derselben Datenbank.

- [ ] **Step 5: GREEN verifizieren**

Run:

```bash
node --test tests/contentReviewIssueOptimizationRepository.test.js
CONTENT_AGENT_PG_TEST_URL=postgresql://blocksdorf@127.0.0.1/kwd_content_agent_integration_test CONTENT_AGENT_PG_TEST_ALLOW_RESET=true CONTENT_AGENT_PG_TEST_TOKEN=KWDCONTENTAGENT_TEST_RESET_V1 node --test tests/contentAgentPostgresIntegration.test.js
```

Expected: PASS.

---

### Task 5: Worker- und Queueintegration

**Files:**
- Modify: `repositories/contentJobRepository.js`
- Modify: `scripts/contentWorker.js`
- Modify: `services/contentAgent/contentRuleManifest.js`
- Test: `tests/contentAgentJobRepository.test.js`
- Test: `tests/contentAgentWorker.test.js`
- Test: `tests/contentAgentRuleManifest.test.js`

**Interfaces:**
- Consumes: `REVIEW_ISSUE_OPTIMIZATION_JOB_TYPE`, `runReviewIssueOptimizationJob` und `createContentReviewIssueOptimizationRepository`.
- Produces: produktive Ausführung des neuen Jobs im vorhandenen Worker.

- [ ] **Step 1: Failing Integrations-Vertragstests schreiben**

Die Tests verlangen:

```js
assert.equal(SUPPORTED_JOB_TYPES.has('optimize_review_issues'), true);
assert.equal(REGENERATION_JOB_TYPES.has('optimize_review_issues'), true);
```

Sie prüfen außerdem, dass der Job nur mit `source: 'admin_regeneration'`, `forced_mode: 'review'`, gültiger Payloadstruktur und aktivem Agenten ausgeführt wird.

- [ ] **Step 2: RED verifizieren**

Run:

```bash
node --test tests/contentAgentJobRepository.test.js tests/contentAgentWorker.test.js tests/contentAgentRuleManifest.test.js
```

Expected: FAIL, weil Jobtyp und Produktionsmodule fehlen.

- [ ] **Step 3: Worker verdrahten**

`loadProductionModules` lädt Service und Repository. `createProductionRuntime` erzeugt die Optimierungsabhängigkeiten mit derselben OpenAI-, Budget-, Validator- und Providerzustandskonfiguration wie die bestehende Pipeline. Der Handler ruft für den neuen Job ausschließlich `runReviewIssueOptimizationJob` auf.

- [ ] **Step 4: Regelmanifest versionieren**

Eine eigene Optimierungs-Promptversion wird in das signierte Content-Regelmanifest aufgenommen, damit ein laufender Job keine unbemerkte Aufgabenänderung übernimmt.

- [ ] **Step 5: GREEN verifizieren**

Run:

```bash
node --test tests/contentAgentJobRepository.test.js tests/contentAgentWorker.test.js tests/contentAgentRuleManifest.test.js
```

Expected: PASS.

---

### Task 6: Veröffentlichungskonsistenz und Gesamtverifikation

**Files:**
- Test: `tests/contentPublicationService.test.js`
- Test: `tests/contentReviewIssueOptimizationService.test.js`
- Modify: `docs/superpowers/plans/2026-07-14-content-agent-pruefhinweis-optimierung.md`

**Interfaces:**
- Consumes: optimierten Entwurf mit neuem Qualitätsbericht.
- Produces: belegte Veröffentlichbarkeit nach manueller Freigabe.

- [ ] **Step 1: Failing Veröffentlichungstest schreiben**

Der Test führt den optimierten Artikel samt neuem Qualitätsbericht durch die vorhandene Veröffentlichungsvalidierung und erwartet keinen `risk_review_inconsistent`-Fehler.

- [ ] **Step 2: RED verifizieren und minimale Korrektur ausführen**

Run:

```bash
node --test tests/contentPublicationService.test.js tests/contentReviewIssueOptimizationService.test.js
```

Expected: Der neue Test muss vor vollständiger Persistenzintegration fehlschlagen und danach bestehen.

- [ ] **Step 3: Vollständige Verifikation ausführen**

Run:

```bash
git diff --check
npm test
npm run build
CONTENT_AGENT_PG_TEST_URL=postgresql://blocksdorf@127.0.0.1/kwd_content_agent_integration_test CONTENT_AGENT_PG_TEST_ALLOW_RESET=true CONTENT_AGENT_PG_TEST_TOKEN=KWDCONTENTAGENT_TEST_RESET_V1 node --test tests/contentAgentPostgresIntegration.test.js
```

Expected: 0 fehlgeschlagene Tests, erfolgreicher Build, erfolgreicher echter PostgreSQL-Test.

- [ ] **Step 4: Planstatus aktualisieren und Änderungen committen**

Alle erledigten Checkboxen werden auf `[x]` gesetzt. Danach werden ausschließlich die zu diesem Plan gehörenden Dateien gestaged und mit einer deutschen, eindeutigen Zusammenfassung geprüft.

- [ ] **Step 5: Auf `main` pushen und VPS verifizieren**

Nach erfolgreichem Push werden auf `~/apps/komplettwebdesign` Git-Stand, App, Worker, HTTP-Status und neue Adminaktion geprüft. Es sind keine `.env`- oder `docker-compose.yml`-Änderungen vorgesehen.
