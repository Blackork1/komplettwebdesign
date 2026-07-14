# Dritter Review-Fix der Bestandsrevalidierung – Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nur sicher reproduzierbare Auditbefunde dürfen als gelöst gelten, und jeder dauerhafte oder ausgeschöpfte Revalidierungsfehler verlässt den exakt gefenceten `pending`-Stand konsistent.

**Architecture:** Eine feste Re-Audit-Allowlist trennt reproduzierbare von kontextabhängigen oder unbekannten Originalcodes. Eine gemeinsame Fehlerpolicy klassifiziert Worker- und Runnerfehler als Leaseverlust, Fenceverlust, transient oder permanent; der letzte transiente Versuch wird zu einem festen terminalen Fehlercode. Alle terminalen Übergänge verwenden ausschließlich die minimale Repository-Fence-Sperre.

**Tech Stack:** Node.js, PostgreSQL und `node:test`.

## Global Constraints

- Deutsche Texte verwenden korrekte Grammatik sowie ä, ö, ü und ß.
- Produktionsänderungen entstehen ausschließlich nach einem passenden roten Regressionstest.
- Lease- und Fenceverlust dürfen keinen fremden oder neueren Revisionsstand überschreiben.
- Retrybar sind ausschließlich explizite Datenbank-, Netzwerk- und Runabschlussfehler; unbekannte Invarianten sind permanent.
- Nach ausgeschöpftem Retry darf kein exakt gebundener Revisionsstand in `pending` verbleiben.

---

### Task 1: Re-Audit nur für reproduzierbare Codes

**Files:**
- Modify: `services/contentAgent/legacyAuditService.js`
- Test: `tests/contentLegacyAudit.test.js`
- Test: `tests/contentExistingPostRevisionRevalidation.test.js`

**Interfaces:**
- Produces: `REPRODUCIBLE_EXISTING_CONTENT_REAUDIT_CODES` als feste, unveränderliche Codeliste.
- Consumes: `evaluateExistingContentReaudit({ originalFindings, currentFindings })`.

- [x] **Step 1: Rote Policytests schreiben**

  Prüfe `unknown_future_code` und `cannibalization_risk` als immer ungelöst, einen reproduzierbaren verschwundenen Code als gelöst, einen fortbestehenden Code als ungelöst und einen neuen lokalen Blocker als blockierend.

- [x] **Step 2: Rotlauf ausführen**

  Run: `node --test tests/contentLegacyAudit.test.js tests/contentExistingPostRevisionRevalidation.test.js`

  Expected: FAIL, weil unbekannte und kontextabhängige Originalcodes momentan still als gelöst gelten.

- [x] **Step 3: Feste Reproduzierbarkeits-Allowlist implementieren**

  Ausschließlich Befunde, die `auditExistingPost` aus Post-Snapshot, gespeichertem Jahr und vollständigem Linkinventar reproduzieren kann, dürfen bei Abwesenheit verschwinden. Jeder andere ursprüngliche Code bleibt in `unresolvedOriginalCodes`.

- [x] **Step 4: Grünlauf ausführen**

  Run: `node --test tests/contentLegacyAudit.test.js tests/contentExistingPostRevisionRevalidation.test.js`

  Expected: PASS.

### Task 2: Gemeinsame permanente und transiente Fehlerklassifikation

**Files:**
- Modify: `services/contentAgent/existingPostRevisionFailurePolicy.js`
- Modify: `scripts/contentWorker.js`
- Modify: `services/contentAgent/existingPostRevisionRevalidationService.js`
- Test: `tests/contentAgentWorker.test.js`
- Test: `tests/contentExistingPostRevisionRevalidation.test.js`

**Interfaces:**
- Produces: `classifyExistingPostRevisionError(error, claim)` mit `disposition`, `failureCode` und `exhausted`.
- Produces: `existingPostRevisionTransientError(cause)` mit festem retrybaren Code.
- Consumes: Claimfelder `attempts` und `max_attempts` zur sicheren Letztversuchserkennung.

- [x] **Step 1: Rote Klassifikations- und Zustandsübergangstests schreiben**

  Prüfe stale vor Run, stale und ungültigen Kontext nach Run, einen transienten Vor- und Nach-Run-Fehler, einen ausgeschöpften transienten Versuch sowie Lease- und Fenceverlust. Terminale Fälle müssen Revision und gegebenenfalls Run abschließen; transiente Fälle dürfen nichts schreiben.

- [x] **Step 2: Rotlauf ausführen**

  Run: `node --test tests/contentAgentWorker.test.js tests/contentExistingPostRevisionRevalidation.test.js`

  Expected: FAIL, weil Worker und Runner dieselben Fehler unterschiedlich behandeln und letzte Retries `pending` hinterlassen.

- [x] **Step 3: Gemeinsame Policy und minimale Handler implementieren**

  Die Policy allowlistet dauerhafte Revisions-, Report-, Audit-, Ursprungssnapshot-, Manifest-, Payload-, Binding- und Invariantcodes sowie echte transiente PostgreSQL-/Netzwerkcodes. Worker vor Run und Runner nach Run verwenden dieselbe Entscheidung; permanent oder ausgeschöpft ruft den minimalen Failure-Fence auf, transient wirft einen stabilen retrybaren Fehler, Lease/Fence überschreibt nichts.

- [x] **Step 4: Grünlauf ausführen**

  Run: `node --test tests/contentAgentWorker.test.js tests/contentExistingPostRevisionRevalidation.test.js tests/contentExistingPostOptimizationRepository.test.js`

  Expected: PASS.

### Task 3: PostgreSQL, Bericht und Gesamtverifikation

**Files:**
- Modify: `tests/contentAgentPostgresIntegration.test.js`
- Modify: `.superpowers/sdd/existing-post-task-11-report.md`

- [x] **Step 1: PostgreSQL-Beleg ergänzen**

  Der echte Test setzt einen exakt gebundenen pending-Fence trotz defekter Audit-/Ursprungsbindung über `failRevisionRevalidation` auf `failed` und bestätigt, dass kein neuerer Fence überschrieben wird.

- [x] **Step 2: Berichtsnachtrag ergänzen**

  Dokumentiere Reproduzierbarkeits-Allowlist, Fehlerdisposition, Letztversuch und RED/GREEN-Belege.

- [x] **Step 3: Vollständig verifizieren**

  Run: fokussierte Suiten, echter PostgreSQL-Lauf, `OPENAI_API_KEY=test-key node --test tests/*.test.js`, `npm run build` und `git diff --check`.

- [x] **Step 4: Separaten Commit erstellen**

  Commit: `fix: terminalisiere dauerhafte Revalidierungsfehler`
