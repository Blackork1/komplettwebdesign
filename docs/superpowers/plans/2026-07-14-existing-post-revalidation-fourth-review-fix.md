# Vierter Review-Fix der Bestandsrevalidierung – Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Providerfehler behalten ihre tatsächliche Disposition, und transiente fachliche Abschlussfehler können einen Revalidierungsjob auch beim letzten Claim niemals vor Revision und Run endgültig fehlschlagen lassen.

**Architecture:** Der bestehende gemeinsame Klassifizierer entscheidet auch über Fehler der bezahlten Stage. Terminale Revisions- und Runoperationen erhalten eine kleine interne, lease-gesicherte Wiederholung; weiterhin transiente Abschlussfehler werden als eigener versuchsneutraler Cleanup-Retry an die Queue gegeben. Die Lease-Recovery reiht nichtterminale Revalidierungsjobs unabhängig vom bisherigen Versuchszähler erneut ein, übernimmt aber weiterhin atomar einen bereits terminalen Run.

**Tech Stack:** Node.js, `node:test`, PostgreSQL und bestehende Content-Agent-Repositories.

## Global Constraints

- Deutsche Texte verwenden korrekte Grammatik sowie ä, ö, ü und ß.
- Keine Produktionsänderung ohne zuvor beobachteten passenden roten Test.
- Provider, Paid Stage, Budget und Lernbeobachtungen dürfen in einem reinen Terminal-Cleanup nicht erneut ausgeführt werden.
- Lease- und Fenceverlust dürfen keinen fremden oder neueren Revisionsstand überschreiben.
- Ein dauerhaft nicht erreichbares Repository lässt den Cleanup-Job wiederaufnehmbar und setzt ihn nicht fälschlich endgültig auf `failed`.
- Es wird keine neue Datenbanktabelle und kein neuer externer Dienst eingeführt.

---

### Task 1: Paid-Stage-Fehler durch die gemeinsame Disposition führen

**Files:**
- Modify: `services/contentAgent/existingPostRevisionFailurePolicy.js`
- Modify: `services/contentAgent/existingPostRevisionRevalidationService.js`
- Test: `tests/contentExistingPostRevisionRevalidation.test.js`

**Interfaces:**
- Consumes: `classifyExistingPostRevisionError(error, claim)`.
- Produces: exakte Dispositionen für `CONTENT_PROVIDER_SAFE_RETRY`, PostgreSQL- und Netzwerkfehler, permanente Providercodes und `provider_execution_uncertain`.

- [x] **Step 1: Rote Runner- und Policytests schreiben**

  Prüfe einen sicheren Providerretry vor und auf dem letzten Attempt, PostgreSQL `40001`, `40P01` und `57P01` aus Kontext- und Budgetzugriffen, einen Netzwerkfehler sowie einen tatsächlich unklaren gestarteten Providerzustand. Transiente Fälle vor dem letzten Attempt werfen den stabilen Retrycode ohne Revisions-/Runabschluss; der letzte Attempt terminalisiert mit `CONTENT_REVISION_REVALIDATION_RETRY_EXHAUSTED`; unklare Ausführung terminalisiert mit `provider_execution_uncertain`.

- [x] **Step 2: Rotlauf ausführen**

  Run: `node --test --test-name-pattern='Providerretry|PostgreSQL.*Budget|unklare Providerausführung' tests/contentExistingPostRevisionRevalidation.test.js`

  Expected: FAIL, weil der äußere Paid-Stage-Catch derzeit jeden Fehler außer Leaseverlust pauschal in `provider_execution_uncertain` umwandelt und `CONTENT_PROVIDER_SAFE_RETRY` nicht als transient kennt.

- [x] **Step 3: Minimal implementieren**

  Ergänze `CONTENT_PROVIDER_SAFE_RETRY` in der expliziten transienten Allowlist. Behandle feste Revalidierungsfehlercodes nach Lease/Fence/transient als permanente exakte Codes. Übergib den Paid-Stage-Catch vollständig an `handleExecutionError`; manuelle Stageergebnisse bleiben separat und behalten ihren allowgelisteten terminalen Code.

- [x] **Step 4: Grünlauf ausführen**

  Run: `node --test tests/contentExistingPostRevisionRevalidation.test.js`

  Expected: PASS.

### Task 2: Abschluss-Cleanup versuchsneutral und wiederaufnehmbar machen

**Files:**
- Modify: `services/contentAgent/existingPostRevisionFailurePolicy.js`
- Modify: `services/contentAgent/existingPostRevisionRevalidationService.js`
- Modify: `services/contentAgent/workerService.js`
- Modify: `repositories/contentJobRepository.js`
- Test: `tests/contentExistingPostRevisionRevalidation.test.js`
- Test: `tests/contentAgentWorker.test.js`
- Test: `tests/contentAgentJobRepository.test.js`

**Interfaces:**
- Produces: `existingPostRevisionCleanupRetryError(cause)` mit `code = CONTENT_REVISION_REVALIDATION_CLEANUP_RETRY`, `retryable = true`, `doesNotConsumeAttempt = true` und gültigem `retryAt`.
- Consumes: `rescheduleJobWithoutAttemptConsumption(claim, error, { retryAt })`.

- [x] **Step 1: Rote Abschluss- und Queueverträge schreiben**

  Prüfe `failRevisionRevalidation` einmal transient und danach erfolgreich im selben letzten Claim, `finishRun` einmal `null` beziehungsweise transient geworfen nach `passed` und `failed`, dauerhaft transienten Cleanup auf dem letzten Attempt, Recovery ohne Provider/Paid Stage/Budget sowie Fenceverlust ohne Revisionsschreibzugriff. Prüfe im Worker, dass der Cleanupcode versuchsneutral neu eingereiht wird, und im Repository, dass Lease-Recovery einen nichtterminalen Revalidierungsjob am Versuchslimit erneut queued und den Versuch zurückgibt.

- [x] **Step 2: Rotlauf ausführen**

  Run: `node --test tests/contentExistingPostRevisionRevalidation.test.js tests/contentAgentWorker.test.js tests/contentAgentJobRepository.test.js`

  Expected: FAIL, weil Abschlussoperationen nur einmal versucht werden und der generische letzte Retry den Job auf `failed` setzt.

- [x] **Step 3: Minimalen Cleanup-Pfad implementieren**

  Wiederhole ausschließlich `failRevisionRevalidation`, `completeRevisionRevalidation` und `finishRun` intern höchstens einmal nach einem explizit transienten Fehler und jeweils mit Leaseprüfung. Wandle einen weiterhin transienten Abschlussfehler in den versuchsneutralen Cleanupfehler um. Bereits `passed` oder `failed` geladene Revisionen schließen nur den Run ab und kehren vor lokaler Prüfung, Paid Stage, Budget oder Provider zurück. Ein `null`-Runabschluss wird als unbestätigter Cleanup behandelt; ein nächster Claim adoptiert einen möglicherweise bereits terminal gespeicherten Run.

  Erweitere die Worker-Allowlist für versuchsneutrale Fehler um den Cleanupcode. Der Reschedule persistiert einen allowlisteten Cleanup-Intent. Die Recovery-SQL behandelt `revalidate_existing_post_revision` mit strukturiertem Intent oder nichtterminalem Run am Versuchslimit wie einen Cleanup: Status `queued`, `attempts = GREATEST(attempts - 1, 0)`, `finished_at = NULL`. Ein normaler früher Crash bleibt eine normale Wiederaufnahme; ein terminaler Run bleibt vorrangig und wird unverändert auf den Job übernommen.

- [x] **Step 4: Grünlauf ausführen**

  Run: `node --test tests/contentExistingPostRevisionRevalidation.test.js tests/contentAgentWorker.test.js tests/contentAgentJobRepository.test.js`

  Expected: PASS.

### Task 3: PostgreSQL-Beleg, Bericht und Gesamtverifikation

**Files:**
- Modify: `tests/contentAgentPostgresIntegration.test.js`
- Modify: `.superpowers/sdd/existing-post-task-11-report.md`

- [x] **Step 1: Roten PostgreSQL-Vertrag ergänzen**

  Ergänze einen echten Recoveryfall für einen ausgeschöpften laufenden Revalidierungsjob mit nichtterminalem Run. Der erste Recoverylauf muss ihn versuchsneutral queueen; nach terminalem Run übernimmt ein weiterer Recoverylauf den exakten Runstatus und Fehlercode, ohne die Revision zu verändern.

- [x] **Step 2: PostgreSQL-Grünlauf ausführen**

  Run: `CONTENT_AGENT_PG_TEST_URL=postgresql://blocksdorf@127.0.0.1/kwd_content_agent_integration_test CONTENT_AGENT_PG_TEST_ALLOW_RESET=true CONTENT_AGENT_PG_TEST_TOKEN=KWDCONTENTAGENT_TEST_RESET_V1 node --test tests/contentAgentPostgresIntegration.test.js`

  Expected: 11 bestanden, 0 fehlgeschlagen, 0 übersprungen.

- [x] **Step 3: Bericht ergänzen und vollständig verifizieren**

  Dokumentiere Providerdisposition, versuchsneutralen Cleanup, Recoverygrenze und RED/GREEN-Belege. Führe die fokussierten Suiten, den echten PostgreSQL-Lauf, `OPENAI_API_KEY=test-key node --test tests/*.test.js`, `npm run build`, Syntaxprüfungen und `git diff --check` aus.

- [x] **Step 4: Separaten Commit erstellen**

  Commit: `fix: sichere terminale Revalidierungs-Cleanups`
