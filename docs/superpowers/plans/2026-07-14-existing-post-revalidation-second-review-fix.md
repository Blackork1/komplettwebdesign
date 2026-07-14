# Zweiter Review-Fix der Bestandsrevalidierung – Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die asynchrone Revalidierung blockiert alte und neue relevante Auditbefunde, verwendet überall dieselbe Ausgangsscore-Schwelle, validiert gebundene externe Quellen und gleicht fachliche Revisionszustände nach Run-Abschlussfehlern idempotent ab.

**Architecture:** Reine Policyfunktionen normalisieren lokale Auditbefunde, Quellen und Mindestscore. Repository und Worker persistieren ausschließlich version-/fingerprintgebundene Zustände. Der Runner behandelt `pending`, `passed` und `failed` als explizite Zustandsmaschine, sodass ein bereits fachlich persistiertes Ergebnis ohne erneuten Provider- oder Budgetzugriff mit dem Run abgeglichen wird.

**Tech Stack:** Node.js, PostgreSQL, Express, EJS, Zod und `node:test`.

## Global Constraints

- Deutsche Texte verwenden korrekte Grammatik sowie ä, ö, ü und ß.
- Jede Produktionsänderung erhält zuerst einen roten Regressionstest.
- Externe Links stammen ausschließlich aus der gesperrten Revision und dem serverseitigen Ursprungskontext; Browserwerte sind ausgeschlossen.
- Alle Revisionsschreibzugriffe bleiben an Revisions-ID, PostgreSQL-`INT32`-Version und kleingeschriebenen SHA-256-Fingerprint gebunden.
- Nach einem fachlichen `passed` oder `failed` darf kein Retry Provider, Budget oder Lernbeobachtungen erneut ausführen.

---

### Task 1: Lokale Auditbefunde und einheitliche Mindestscore-Policy

**Files:**
- Modify: `services/contentAgent/legacyAuditService.js`
- Modify: `services/contentAgent/existingPostRevisionApprovalPolicy.js`
- Modify: `services/contentAgent/existingPostRevisionRevalidationService.js`
- Modify: `services/contentAgent/contentRevisionService.js`
- Modify: `repositories/contentExistingPostOptimizationRepository.js`
- Test: `tests/contentExistingPostRevisionRevalidation.test.js`
- Test: `tests/contentLegacyAudit.test.js`
- Test: `tests/contentRevisionService.test.js`

**Interfaces:**
- Produces: `normalizeExistingContentAuditFinding(finding)` mit serverseitiger Severity-/Blocking-Policy.
- Produces: `evaluateExistingContentReaudit({ originalFindings, currentFindings })`.
- Produces: `minimumExistingPostRevisionScore(report)` ausschließlich aus `beforeScore`.

- [x] **Step 1: Rote Tests schreiben**

  Prüfe fortbestehende ursprüngliche Codes, neu entstandene `stale_year`- und `static_price`-Befunde, einen neuen nichtblockierenden lokalen Hinweis sowie Schwellen bei `beforeScore < 80`, `beforeScore > 80` und `afterScore < beforeScore`.

- [x] **Step 2: Rotlauf ausführen**

  Run: `node --test tests/contentExistingPostRevisionRevalidation.test.js tests/contentLegacyAudit.test.js tests/contentRevisionService.test.js`

  Expected: FAIL, weil neue blockierende Auditbefunde ignoriert und `afterScore` als Schwelle verwendet werden.

- [x] **Step 3: Minimale Policies implementieren**

  Lokale Auditbefunde erhalten aus einer festen Codetabelle Severity und Blocking. Der Re-Audit verlangt das Verschwinden jedes ursprünglichen Codes und blockiert zusätzlich ausschließlich neu entstandene lokale Befunde mit `blocking = true`. Mindestscore ist exakt `Math.max(80, beforeScore)` und wird in initialem Review, `pending`, Worker, Repositoryabschluss und Freigabe identisch geprüft.

- [x] **Step 4: Grünlauf ausführen**

  Run: `node --test tests/contentExistingPostRevisionRevalidation.test.js tests/contentLegacyAudit.test.js tests/contentRevisionService.test.js tests/contentExistingPostOptimizationRepository.test.js`

  Expected: PASS.

### Task 2: Gebundene Quellen bei synchroner Mutation

**Files:**
- Create: `services/contentAgent/existingPostRevisionSourcePolicy.js`
- Modify: `repositories/contentExistingPostOptimizationRepository.js`
- Modify: `services/contentAgent/existingPostRevisionRevalidationService.js`
- Test: `tests/contentExistingPostOptimizationRepository.test.js`
- Test: `tests/contentRevisionService.test.js`

**Interfaces:**
- Produces: `normalizeExistingPostRevisionSources(report)` mit `SourceReferenceSchema`, HTTPS-Normalisierung und Höchstgrenze sechs.
- Consumes: gesperrte `revision.optimization_report_json.sources` und `content_runs.runtime_snapshot_json` des Ursprungjobs.

- [x] **Step 1: Rote Quellentests schreiben**

  Ein im gesperrten Report erlaubter externer Link erreicht nach Revert und manueller Bearbeitung `pending`; ein unbekannter externer Link scheitert vor jeder Revision- oder Joberzeugung. Browser-Quellen werden ignoriert.

- [x] **Step 2: Rotlauf ausführen**

  Run: `node --test tests/contentExistingPostOptimizationRepository.test.js tests/contentRevisionService.test.js`

  Expected: FAIL, weil `sourceReferences` im synchronen Validierungskontext fehlen.

- [x] **Step 3: Ursprungskontext und Quellen binden**

  Das Repository lädt den Ursprungslauf unter der bestehenden Revisions-/Auditbindung, validiert dessen Trusted Context und kombiniert ihn mit den normalisierten Quellen des gesperrten Reports. Nur dieser Kontext wird dem Servicecallback übergeben.

- [x] **Step 4: Grünlauf ausführen**

  Run: `node --test tests/contentExistingPostOptimizationRepository.test.js tests/contentRevisionService.test.js`

  Expected: PASS.

### Task 3: Fenced frühe Worker-Terminalisierung

**Files:**
- Modify: `scripts/contentWorker.js`
- Modify: `repositories/contentExistingPostOptimizationRepository.js`
- Modify: `tests/contentAgentWorker.test.js`
- Modify: `tests/contentAgentPostgresIntegration.test.js`

**Interfaces:**
- Consumes: ein extrahierbarer gültiger Fence auch dann, wenn der restliche Payload ungültig ist.
- Produces: direkter Adapter `failExistingPostRevisionRevalidation(fence, failureCode)`.

- [x] **Step 1: Rote Tests für Payload-, Kontext-, Runtime- und Manifestfehler schreiben**

  Jeder frühe terminale Pfad ruft vor Run-/Jobterminalisierung exakt einmal den fenced Revisionsfehler auf. Ein inzwischen verlorener Fence verändert keine neuere Revision.

- [x] **Step 2: Rotlauf ausführen**

  Run: `node --test tests/contentAgentWorker.test.js`

  Expected: FAIL, weil die frühen Pfade nur werfen oder den Run abschließen.

- [x] **Step 3: Zentralen Terminalisierungshelper implementieren**

  Der Handler extrahiert zuerst einen kanonischen Fence, prüft die Lease und persistiert einen festen Fehlercode über den direkten Repositoryadapter. `CONTENT_REVISION_REVALIDATION_FENCE_LOST` wird als verlorener alter Auftrag behandelt und überschreibt keinen aktuellen Stand.

- [x] **Step 4: Grünlauf ausführen**

  Run: `node --test tests/contentAgentWorker.test.js tests/contentAgentPostgresIntegration.test.js`

  Expected: PASS.

### Task 4: Post-Commit-Recovery und Run-Reconcile

**Files:**
- Modify: `repositories/contentExistingPostOptimizationRepository.js`
- Modify: `services/contentAgent/existingPostRevisionRevalidationService.js`
- Modify: `tests/contentExistingPostRevisionRevalidation.test.js`
- Modify: `tests/contentAgentPostgresIntegration.test.js`

**Interfaces:**
- Produces: `loadRevisionRevalidationContext` mit `revalidationState: 'pending' | 'passed' | 'failed'` für exakt denselben Fence.
- Consumes: gespeicherten Fehlercode oder gebundenes bestandenes Review.

- [x] **Step 1: Rote Recoverytests schreiben**

  Simuliere Leaseverlust nach `completeRevisionRevalidation`, `finishRun` mit `null` und geworfenen Datenbankfehler. Beim Retry muss `passed` den Run ohne Paid-Stage abschließen; `failed` muss denselben manuellen Zustand übernehmen. Provider-, Budget-, Abschluss- und Beobachtungszähler dürfen nicht doppelt steigen.

- [x] **Step 2: Rotlauf ausführen**

  Run: `node --test tests/contentExistingPostRevisionRevalidation.test.js`

  Expected: FAIL, weil der Repositorykontext nur `pending` akzeptiert.

- [x] **Step 3: Reconcile-Zustandsmaschine implementieren**

  Der Runner prüft den exakt gebundenen fachlichen Zustand vor jeder Vorprüfung: `passed` führt ausschließlich `finishRun(completed)` aus, `failed` ausschließlich `finishRun(needs_manual_attention)`, und nur `pending` erreicht Audit, Budget und Provider. Fehler beim Runabschluss bleiben retrybar.

- [x] **Step 4: Grünlauf ausführen**

  Run: `node --test tests/contentExistingPostRevisionRevalidation.test.js tests/contentAgentWorker.test.js tests/contentAgentPostgresIntegration.test.js`

  Expected: PASS.

### Task 5: Vergleichsdarstellung, Bericht und Gesamtverifikation

**Files:**
- Modify: `views/admin/contentAgent/revisionCompare.ejs`
- Modify: `tests/contentAgentAdminViews.test.js`
- Modify: `.superpowers/sdd/existing-post-task-11-report.md`

**Interfaces:**
- Consumes: `approvalBlockedReason` aus der zentralen Policy.
- Produces: escaped sichtbaren Sperrgrund und korrekten Vergleichs-/Freigabetext.

- [x] **Step 1: Roten Viewtest schreiben und ausführen**

  Run: `node --test tests/contentAgentAdminViews.test.js`

  Expected: FAIL, weil Sperrgrund fehlt und der Text fälschlich auf den Editor verweist.

- [x] **Step 2: View minimal anpassen und grün ausführen**

  Der Sperrgrund wird nur bei blockierter Freigabe mit `<%= ... %>` escaped gerendert; der Einleitungstext beschreibt die Freigabe im Vergleich.

- [x] **Step 3: Berichtsnachtrag ergänzen**

  Dokumentiere Auditpolicy, exakte `beforeScore`-Schwelle, Quellenbindung, frühe Terminalisierung und Post-Commit-Recovery einschließlich RED/GREEN- und PostgreSQL-Belegen.

- [x] **Step 4: Vollständig verifizieren**

  Run: fokussierte Suiten, echter PostgreSQL-Lauf, `OPENAI_API_KEY=test-key node --test tests/*.test.js`, `npm run build` und `git diff --check`.

- [x] **Step 5: Separaten Commit erstellen**

  Commit: `fix: härte die KI-Revalidierung gegen Abschlussfehler`
