# Live-Status der Entwurfsoptimierung – Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Der Entwurfseditor zeigt den Zustand einer Fehlerbehebung live an und verhindert doppelte Optimierungsaufträge für dieselbe Reviewversion.

**Architecture:** PostgreSQL bleibt die maßgebliche Statusquelle. Ein schmaler, admin-geschützter GET-Endpunkt liefert eine bereinigte Statusdarstellung; der Browser aktualisiert ausschließlich die Statusbox und lädt niemals ungefragt den Entwurf neu. Eine deterministische Idempotenz-ID verhindert doppelte Jobs unabhängig von JavaScript.

**Tech Stack:** Node.js, Express 5, PostgreSQL, EJS, Browser-JavaScript, Bootstrap, Node-Test-Runner

## Global Constraints

- Alle Texte verwenden korrektes Deutsch mit „ä“, „ö“, „ü“ und „ß“.
- Der Entwurf bleibt während des gesamten Ablaufs unveröffentlicht.
- Der Browser darf ungespeicherte Formulardaten nicht durch automatisches Neuladen verlieren.
- Der Statusendpunkt gibt keine Providerantworten, Prompts, Schlüssel oder vollständigen Job-Payloads aus.
- Schreibende Aktionen bleiben durch Adminsession und CSRF geschützt.
- Für einen Artikel und eine Reviewversion darf höchstens ein Optimierungsjob entstehen.

---

## Geplante Dateistruktur

- `repositories/contentJobRepository.js`: atomare, idempotente Einreihung und sichere Statusabfrage.
- `services/contentAgent/reviewOptimizationStatusService.js`: normalisiert Datenbankzustände zu einer kleinen UI-Darstellung.
- `controllers/adminContentAgentController.js`: lädt den Zustand für die Seite und liefert ihn als JSON.
- `routes/adminContentAgentRoutes.js`: registriert den admin-geschützten Statusendpunkt und injiziert die neuen Repositorymethoden.
- `views/admin/contentAgent/draftEdit.ejs`: bindet die Statusbox in den Entwurfseditor ein.
- `views/admin/contentAgent/_reviewOptimizationStatus.ejs`: rendert alle serverseitigen Optimierungszustände.
- `views/admin/contentAgent/_riskChecklist.ejs`: sperrt beziehungsweise verbirgt Optimierungsaktionen anhand des Status.
- `public/js/admin-content-agent.js`: sofortige Buttonsperre, Statuspolling und bewusstes Neuladen.
- `public/admin.css` und erzeugtes `public/admin.min.css`: visuelle Zustände und Ladeanzeige.
- Bestehende Tests in `tests/contentAgentJobRepository.test.js`, `tests/contentAgentAdminController.test.js`, `tests/contentAgentAdminRoutes.test.js` und `tests/contentAgentAdminViews.test.js` werden erweitert.

---

### Task 1: Idempotente Jobs und sichere Statusdarstellung

**Files:**
- Create: `services/contentAgent/reviewOptimizationStatusService.js`
- Modify: `repositories/contentJobRepository.js`
- Test: `tests/contentAgentJobRepository.test.js`
- Test: `tests/reviewOptimizationStatusService.test.js`

**Interfaces:**
- Produces: `enqueueReviewOptimizationJob(input, db): Promise<ContentJob|null>`
- Produces: `getLatestReviewOptimizationJob({ postId }, db): Promise<ContentJobStatus|null>`
- Produces: `presentReviewOptimizationStatus({ job, currentReviewVersion }): ReviewOptimizationStatus`

- [ ] **Step 1: Failing tests für atomare Idempotenz schreiben**

Die Repositorytests müssen zwei Einreihungen für `postId = 19` und `expectedReviewVersion = 3` ausführen und sicherstellen, dass beide dieselbe Datenbankzeile mit der ID `41` zurückgeben. Erwartete Idempotenz-ID:

```js
assert.equal(job.idempotency_key, 'optimize_review_issues:19:3');
assert.equal(secondJob.id, job.id);
```

- [ ] **Step 2: Failing Tests für bereinigte Statusdaten schreiben**

Die Abfrage darf nur folgende Felder zurückgeben:

```js
{
  id: 41,
  status: 'running',
  attempts: 1,
  max_attempts: 3,
  expected_review_version: 3,
  created_at: '2026-07-14T10:00:00.000Z',
  updated_at: '2026-07-14T10:01:00.000Z',
  finished_at: null,
  last_error_code: null
}
```

Der Test prüft zusätzlich, dass die SQL-Abfrage auf `job_type = 'optimize_review_issues'` und `payload_json ->> 'post_id'` begrenzt ist.

- [ ] **Step 3: Tests ausführen und das erwartete Fehlschlagen prüfen**

Run:

```bash
node --test tests/contentAgentJobRepository.test.js tests/reviewOptimizationStatusService.test.js
```

Expected: FAIL, weil Repositorymethoden und Statusservice noch nicht existieren.

- [ ] **Step 4: Repositorymethoden minimal implementieren**

`enqueueReviewOptimizationJob` validiert positive Ganzzahlen, `issueMode` und optional `issueIndex`. Es verwendet diese feste ID:

```js
const idempotencyKey = `optimize_review_issues:${postId}:${expectedReviewVersion}`;
```

Die Methode ruft die bestehende Einreihungslogik mit `job_type = 'optimize_review_issues'` auf. `ON CONFLICT` gibt den vorhandenen Job zurück und erzeugt keine zweite kostenpflichtige Ausführung.

`getLatestReviewOptimizationJob` projiziert ausschließlich die im Interface definierten Felder. `last_error_code` wird mit der bestehenden Fehlerbereinigung normalisiert.

- [ ] **Step 5: Statusservice minimal implementieren**

Der Service bildet Datenbankzustände wie folgt ab:

```js
const stateByJobStatus = {
  queued: 'queued',
  running: 'running',
  completed: 'completed',
  failed: 'failed',
  needs_manual_attention: 'manual_attention',
  cancelled: 'failed'
};
```

Die Rückgabe enthält ausschließlich:

```js
{
  state: 'running',
  active: true,
  blocksActions: true,
  jobId: 41,
  attempts: 1,
  maxAttempts: 3,
  message: 'Die Fehlerbehebung wird gerade ausgeführt.',
  updatedAt: '2026-07-14T10:01:00.000Z',
  reloadRecommended: false
}
```

Bei `completed` ist `reloadRecommended` nur dann wahr, wenn `expected_review_version < currentReviewVersion`. Fehlerzustände derselben Reviewversion blockieren neue Aufträge und verweisen auf die Jobprotokolle.

- [ ] **Step 6: Fokussierte Tests erneut ausführen**

Run:

```bash
node --test tests/contentAgentJobRepository.test.js tests/reviewOptimizationStatusService.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit erstellen**

```bash
git add repositories/contentJobRepository.js services/contentAgent/reviewOptimizationStatusService.js tests/contentAgentJobRepository.test.js tests/reviewOptimizationStatusService.test.js
git commit -m "feat: track draft review optimization status"
```

---

### Task 2: Controller, Route und serverseitige Doppelausführungssperre

**Files:**
- Modify: `controllers/adminContentAgentController.js`
- Modify: `routes/adminContentAgentRoutes.js`
- Test: `tests/contentAgentAdminController.test.js`
- Test: `tests/contentAgentAdminRoutes.test.js`

**Interfaces:**
- Consumes: `enqueueReviewOptimizationJob(input)` und `getLatestReviewOptimizationJob({ postId })`
- Consumes: `presentReviewOptimizationStatus({ job, currentReviewVersion })`
- Produces: `GET /admin/content-agent/drafts/:id/review-optimization-status`

- [ ] **Step 1: Failing Controllertests schreiben**

Die Tests belegen:

```js
assert.equal(enqueued.idempotencyKey, 'optimize_review_issues:19:3');
assert.equal(res.redirectedTo, '/admin/content-agent/drafts/19/edit?review_optimization=queued');
```

Ein zweiter Request erhält denselben Job und erzeugt keinen zweiten Datensatz. Die Editorroute lädt Entwurf, Einstellungen und jüngsten Optimierungsjob parallel und übergibt `reviewOptimizationStatus` an EJS.

Der JSON-Endpunkt liefert:

```js
assert.deepEqual(res.jsonBody, {
  state: 'running',
  active: true,
  blocksActions: true,
  jobId: 41,
  attempts: 1,
  maxAttempts: 3,
  message: 'Die Fehlerbehebung wird gerade ausgeführt.',
  updatedAt: '2026-07-14T10:01:00.000Z',
  reloadRecommended: false
});
```

- [ ] **Step 2: Failing Routentest schreiben**

`GET_PATHS` erhält:

```js
'/admin/content-agent/drafts/:id/review-optimization-status'
```

Der Test verlangt `isAdmin` und bestätigt, dass die Route keinen CSRF-geschützten Schreibweg darstellt.

- [ ] **Step 3: Tests ausführen und das erwartete Fehlschlagen prüfen**

Run:

```bash
node --test tests/contentAgentAdminController.test.js tests/contentAgentAdminRoutes.test.js
```

Expected: FAIL, weil Controller und Route noch fehlen.

- [ ] **Step 4: Controller und Dependency Injection implementieren**

`draftEditPage` lädt `getLatestReviewOptimizationJob({ postId })`, präsentiert den Zustand mit der aktuellen `reviewVersion` und setzt ihn auf dem Draftmodell. `reviewOptimizationStatusAction` validiert die ID, lädt den aktuellen Entwurf sowie Jobstatus und antwortet mit `res.json(safeStatus)`.

`enqueueReviewIssueOptimization` ruft ausschließlich `enqueueReviewOptimizationJob` auf. Die bisherige zufällige UUID entfällt für diesen Jobtyp. Eine bestehende Zeile wird als Erfolg behandelt und nicht erneut eingeplant.

- [ ] **Step 5: Controller- und Routentests erneut ausführen**

Run:

```bash
node --test tests/contentAgentAdminController.test.js tests/contentAgentAdminRoutes.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit erstellen**

```bash
git add controllers/adminContentAgentController.js routes/adminContentAgentRoutes.js tests/contentAgentAdminController.test.js tests/contentAgentAdminRoutes.test.js
git commit -m "feat: expose safe draft optimization status"
```

---

### Task 3: Sichtbare Statusbox und gesperrte Optimierungsaktionen

**Files:**
- Create: `views/admin/contentAgent/_reviewOptimizationStatus.ejs`
- Modify: `views/admin/contentAgent/draftEdit.ejs`
- Modify: `views/admin/contentAgent/_riskChecklist.ejs`
- Modify: `public/admin.css`
- Test: `tests/contentAgentAdminViews.test.js`

**Interfaces:**
- Consumes: `draft.reviewOptimizationStatus`
- Produces: DOM-Wurzel `[data-review-optimization-status]`
- Produces: Optimierungsformulare `[data-review-optimization-form]`

- [ ] **Step 1: Failing Viewtests für alle Zustände schreiben**

Für `queued` und `running` müssen die Texte „Fehlerbehebung eingeplant“ beziehungsweise „Fehlerbehebung läuft“ sichtbar sein. Kein Formular mit `action="/admin/content-agent/drafts/19/optimize-review"` darf gerendert werden.

Für `completed` muss „Fehlerbehebung abgeschlossen“ und dieser Link erscheinen:

```html
<a href="/admin/content-agent/drafts/19/edit" data-review-optimization-reload>Aktualisierten Entwurf laden</a>
```

Für `failed` und `manual_attention` muss ein Link auf `/admin/content-agent/jobs` sichtbar sein. Bei `idle` bleiben Einzel- und Sammeloptimierung verfügbar.

- [ ] **Step 2: Viewtests ausführen und das erwartete Fehlschlagen prüfen**

Run:

```bash
node --test tests/contentAgentAdminViews.test.js
```

Expected: FAIL, weil Statuspartial und Sperrlogik fehlen.

- [ ] **Step 3: Statuspartial und Sperrlogik implementieren**

Die Statusbox erhält `role="status"`, `aria-live="polite"`, den Endpunkt in `data-status-url` und den aktuellen Zustand in `data-state`. `_riskChecklist.ejs` berechnet die Aktionsfreigabe zusätzlich mit:

```ejs
const optimizationBlocked = reviewOptimizationStatus && reviewOptimizationStatus.blocksActions === true;
```

Sind Aktionen blockiert, werden keine Optimierungsformulare ausgegeben. Stattdessen erklärt ein kurzer Hinweis, dass der Zustand oben verfolgt werden kann.

- [ ] **Step 4: CSS für Statuszustände ergänzen**

Die Statusbox verwendet die vorhandenen Content-Agent-Farben. Aktive Zustände erhalten eine zurückhaltende Ladeanzeige; erfolgreiche Zustände sind grün, Fehlerzustände bernsteinfarben. `prefers-reduced-motion` deaktiviert die Animation über die bereits vorhandene Regel.

- [ ] **Step 5: Viewtests erneut ausführen**

Run:

```bash
node --test tests/contentAgentAdminViews.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit erstellen**

```bash
git add views/admin/contentAgent/_reviewOptimizationStatus.ejs views/admin/contentAgent/draftEdit.ejs views/admin/contentAgent/_riskChecklist.ejs public/admin.css tests/contentAgentAdminViews.test.js
git commit -m "feat: show optimization progress in draft editor"
```

---

### Task 4: Live-Aktualisierung und sofortige Doppelklicksperre

**Files:**
- Modify: `public/js/admin-content-agent.js`
- Modify: `tests/contentAgentAdminViews.test.js`

**Interfaces:**
- Consumes: `[data-review-optimization-status][data-status-url]`
- Consumes: `[data-review-optimization-form]`
- Produces: periodische GET-Abfragen nur bei `queued` oder `running`

- [ ] **Step 1: Failing Browservertragstest schreiben**

Der Quelltexttest verlangt:

```js
assert.match(script, /data-review-optimization-form/);
assert.match(script, /data-review-optimization-status/);
assert.match(script, /window\.fetch/);
assert.doesNotMatch(script, /window\.location\.reload\(\)/);
```

Er prüft außerdem, dass ein erfolgreicher Status einen vorhandenen Reload-Link einblendet, aber das Formular nicht automatisch neu lädt.

- [ ] **Step 2: Test ausführen und das erwartete Fehlschlagen prüfen**

Run:

```bash
node --test tests/contentAgentAdminViews.test.js
```

Expected: FAIL, weil Polling und unmittelbare Buttonsperre fehlen.

- [ ] **Step 3: Unmittelbare Buttonsperre implementieren**

Nach bestätigtem Submit werden alle Buttons in `[data-review-optimization-form]` deaktiviert, mit `aria-disabled="true"` versehen und der ausgelöste Button erhält den Text „Fehlerbehebung wird eingeplant …“. Wird die Bestätigungsfrage abgebrochen, bleiben die Buttons aktiv.

- [ ] **Step 4: Sicheres Polling implementieren**

Bei `queued` oder `running` fragt der Browser den Statusendpunkt alle fünf Sekunden mit folgenden Optionen ab:

```js
window.fetch(statusUrl, {
  method: 'GET',
  credentials: 'same-origin',
  headers: { Accept: 'application/json' }
});
```

Nur vorher definierte Texte und Attribute werden über `textContent`, `hidden` und `setAttribute` aktualisiert. Es wird kein HTML aus der Antwort eingefügt. Nach `completed`, `failed` oder `manual_attention` endet das Polling. Bei einem Netzwerkfehler bleiben Aktionen gesperrt; die Box zeigt „Statusaktualisierung vorübergehend unterbrochen“ und bietet eine manuelle Wiederholung.

- [ ] **Step 5: Browservertragstest erneut ausführen**

Run:

```bash
node --test tests/contentAgentAdminViews.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit erstellen**

```bash
git add public/js/admin-content-agent.js tests/contentAgentAdminViews.test.js
git commit -m "feat: update draft optimization status live"
```

---

### Task 5: Build und vollständige Verifikation

**Files:**
- Modify: `public/admin.min.css` durch den vorhandenen Buildprozess
- Test: alle Content-Agent- und Projekttests

**Interfaces:**
- Consumes: alle Ergebnisse aus Tasks 1 bis 4
- Produces: deploybares CSS und verifizierten Feature-Stand

- [ ] **Step 1: CSS-Assets bauen**

Run:

```bash
npm run build
```

Expected: Exitcode 0; `public/admin.min.css` enthält die neuen Statusklassen.

- [ ] **Step 2: Gezielte Tests ausführen**

Run:

```bash
node --test tests/contentAgentJobRepository.test.js tests/reviewOptimizationStatusService.test.js tests/contentAgentAdminController.test.js tests/contentAgentAdminRoutes.test.js tests/contentAgentAdminViews.test.js
```

Expected: alle Tests PASS.

- [ ] **Step 3: Vollständige Testsuite ausführen**

Run:

```bash
npm test
```

Expected: Exitcode 0, keine fehlgeschlagenen Tests.

- [ ] **Step 4: Diff- und Sicherheitsprüfung ausführen**

Run:

```bash
git diff --check
rg -n "innerHTML|insertAdjacentHTML|location\.reload|OPENAI_API_KEY|payload_json" public/js/admin-content-agent.js views/admin/contentAgent/_reviewOptimizationStatus.ejs controllers/adminContentAgentController.js
```

Expected: keine Whitespacefehler; kein dynamisches HTML, kein automatisches Neuladen, kein Schlüssel und kein vollständiger Payload im Statusweg.

- [ ] **Step 5: Buildartefakt committen**

```bash
git add public/admin.min.css
git commit -m "build: refresh admin content agent styles"
```

- [ ] **Step 6: Arbeitsbaum und Commitfolge prüfen**

Run:

```bash
git status --short
git log -6 --oneline
```

Expected: sauberer Arbeitsbaum und nachvollziehbare Feature-Commits. Es erfolgt kein Merge und kein Push ohne separate Freigabe des Nutzers.
