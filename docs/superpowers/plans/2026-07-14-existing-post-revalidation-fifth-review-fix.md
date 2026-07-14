# Fünfter Review-Fix der Bestandsrevalidierung – Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein erlaubter Cleanup-Intent steht vor jedem Run-, Kontext- oder Runtimezugriff fest und bleibt über beliebig viele versuchsneutrale Wiederaufnahmen erhalten; ein Job wird erst terminal, wenn Revision und Run fenced konsistent terminal oder ausdrücklich ohne Überschreiben adoptiert sind.

**Architecture:** Der Failure-Policy-Baustein stellt Parser, Normalisierung und Fehlerkonstruktion für strukturierte Cleanup-Intents zentral bereit. Der Worker validiert den Intent direkt nach dem minimalen Payloadvertrag, trägt ihn explizit bis in den Runner und wandelt jeden vorbereitenden Fehler im Cleanup-Modus zurück in denselben Intent. Der Runner behandelt alle terminalen Schreibfehler als commit-uncertain, lädt Revision und Run fenced neu, adoptiert bereits terminale Zustände und reiht einen nicht auflösbaren Abschluss ausschließlich als kostenfreien Cleanup erneut ein.

**Tech Stack:** Node.js, `node:test`, PostgreSQL und bestehende Content-Agent-Repositories.

## Globale Bedingungen

- Deutsche Texte verwenden korrekte Grammatik sowie ä, ö, ü und ß.
- Keine Produktionsänderung ohne zuvor beobachteten passenden roten Test.
- Ein Cleanup führt niemals Paid Stage, Provider, Budgetreservierung oder Lernbeobachtung aus.
- `complete` bleibt auch am normalen Versuchslimit `complete`; `fail` behält seinen exakten erlaubten Fehlercode.
- Jeder Cleanup-Reschedule ist versuchsneutral und persistiert denselben strukturierten Intent.
- Ein Job wird niemals `failed` oder `completed`, solange der Revision-/Runabschluss nicht reconciliiert oder ein fremder terminaler Zustand unverändert adoptiert wurde.
- Lease- und Fenceverlust dürfen keinen fremden oder neueren Zustand überschreiben.

---

### Task 1: Cleanup-Intent vor allen vorbereitenden Zugriffen festlegen

**Files:**
- Modify: `services/contentAgent/existingPostRevisionFailurePolicy.js`
- Modify: `scripts/contentWorker.js`
- Modify: `services/contentAgent/existingPostRevisionRevalidationService.js`
- Test: `tests/contentAgentWorker.test.js`
- Test: `tests/contentAgentJobRepository.test.js`
- Test: `tests/contentExistingPostRevisionRevalidation.test.js`

- [x] **Step 1: Rote Intent- und Rescheduleverträge schreiben**

  Prüfe erlaubte `complete`-, `fail`- und `finish`-Tokens vor `findRunByJobId`, bei PostgreSQL `40001` beziehungsweise Netzwerkfehlern aus Run- und Kontextzugriffen, unter und am normalen Versuchslimit sowie über mehrere Wiederaufnahmen. Der exakte Token, `attempts` und `run_after` müssen erhalten bleiben; Runtime, Manifest, Kontext, Paid Stage, Provider, Budget und Observation bleiben unberührt.

- [x] **Step 2: Rotlauf beobachten**

  Run: `node --test --test-name-pattern='Cleanup-Intent|früher Cleanup|mehrere Cleanup' tests/contentAgentWorker.test.js tests/contentExistingPostRevisionRevalidation.test.js`

  Expected: FAIL, weil der Intent erst im Runner nach dem Kontextladen geparst wird und der Worker vorbereitende Fehler generisch klassifiziert beziehungsweise `last_error` überschreibt.

- [x] **Step 3: Minimal implementieren**

  Exportiere den allowlisteten Parser aus der Failure Policy. Parse den Intent unmittelbar nach erfolgreicher Minimal-Payloadprüfung im Produktionshandler, trage ihn explizit Worker → Runner und verwende ihn in jedem vorbereitenden Fehlerpfad. Nutze für jeden Reschedule denselben normalisierten Intent; der Runner liest nicht mehr erst nach dem Kontextzugriff aus `claim.last_error`.

- [x] **Step 4: Fokusgrünlauf ausführen**

  Run: `node --test tests/contentAgentWorker.test.js tests/contentExistingPostRevisionRevalidation.test.js`

  Expected: PASS.

### Task 2: Permanente terminale Schreibfehler fenced reconciliieren

**Files:**
- Modify: `services/contentAgent/existingPostRevisionRevalidationService.js`
- Modify: `scripts/contentWorker.js`
- Test: `tests/contentExistingPostRevisionRevalidation.test.js`
- Test: `tests/contentAgentWorker.test.js`

- [x] **Step 1: Rote terminale Konsistenztests schreiben**

  Prüfe permanente Fehler aus `failRevisionRevalidation`, `completeRevisionRevalidation` und `finishRun`, commit-uncertain Schreibvorgänge, bereits terminale abweichende Zustände und wiederholte Cleanup-Claims. Vor erfolgreichem Reconcile darf der Job nicht terminalisiert werden. Bereits gespeicherte Revision-/Runzustände werden adoptiert und niemals überschrieben; kein Recoveryfall ruft den Provider auf.

- [x] **Step 2: Rotlauf beobachten**

  Run: `node --test --test-name-pattern='permanenter Terminalfehler|commit-uncertain|abweichender Terminalzustand|Cleanup-Wiederaufnahme' tests/contentExistingPostRevisionRevalidation.test.js tests/contentAgentWorker.test.js`

  Expected: FAIL, weil permanente Fehler derzeit aus dem Runner bis zum generischen `failJob` gelangen und `finishRun` nach unklarem Commit nicht gelesen/adoptiert wird.

- [x] **Step 3: Fenced Reconcile minimal implementieren**

  Reconciliiere nach jedem finalen Terminaloperationsfehler Revision und Run erneut. Ist der Zielzustand bereits gespeichert, schließe nur den verbleibenden Run ab. Ist ein anderer fenced oder terminaler Zustand gespeichert, adoptiere ihn ohne Überschreiben. Bleibt der Zustand unbestätigt, wirf einen versuchsneutralen strukturierten Cleanup-Intent mit Backoff; der Worker darf diesen Pfad nie generisch terminalisieren. Ein unbestätigter `finishRun` liest den Run erneut und übernimmt einen bereits terminalen Status.

- [x] **Step 4: Fokusgrünlauf ausführen**

  Run: `node --test tests/contentExistingPostRevisionRevalidation.test.js tests/contentAgentWorker.test.js tests/contentAgentJobRepository.test.js`

  Expected: PASS.

### Task 3: PostgreSQL-Beleg, Bericht und Gesamtverifikation

**Files:**
- Modify: `tests/contentAgentPostgresIntegration.test.js`
- Modify: `.superpowers/sdd/existing-post-task-11-report.md`

- [x] **Step 1: Roten PostgreSQL-Vertrag ergänzen**

  Ergänze einen echten mehrfachen Cleanup-Reschedule mit unverändertem strukturiertem Intent, korrektem Versuchszähler und `run_after`. Belege anschließend die terminale Runadoption, ohne Providerkosten und ohne vorzeitige Jobterminalisierung.

- [x] **Step 2: PostgreSQL-Grünlauf ausführen**

  Run: `CONTENT_AGENT_PG_TEST_URL=postgresql://blocksdorf@127.0.0.1/kwd_content_agent_integration_test CONTENT_AGENT_PG_TEST_ALLOW_RESET=true CONTENT_AGENT_PG_TEST_TOKEN=KWDCONTENTAGENT_TEST_RESET_V1 node --test tests/contentAgentPostgresIntegration.test.js`

  Expected: alle PostgreSQL-Tests bestanden, 0 fehlgeschlagen.

- [x] **Step 3: Bericht ergänzen und vollständig verifizieren**

  Dokumentiere frühen Intent, fenced Reconcile, RED/GREEN-Belege und die Kostenfreiheit. Führe Fokus-Suiten, echten PostgreSQL-Lauf, `OPENAI_API_KEY=test-key node --test tests/*.test.js`, `npm run build`, Syntaxprüfungen und `git diff --check` aus.

### Task 4: Unabhängige Review-Blocker schließen

**Files:**
- Modify: `scripts/contentWorker.js`
- Modify: `services/contentAgent/existingPostRevisionRevalidationService.js`
- Modify: `repositories/contentJobRepository.js`
- Test: `tests/contentAgentWorker.test.js`
- Test: `tests/contentExistingPostRevisionRevalidation.test.js`
- Test: `tests/contentAgentPostgresIntegration.test.js`

- [x] **Step 1: Drei Review-Regressionsverträge rot beobachten**

  Prüfe, dass ein terminaler Revalidierungsrun bei noch offener Revision nicht übernommen wird, ein unlesbarer nachgeladener Revisionskontext denselben Cleanup-Intent behält und ein generischer Cleanup-Intent am Versuchslimit weder im Runner noch in der Lease-Recovery umgedeutet wird.

- [x] **Step 2: Revisions-Reconcile und generischen Intent korrigieren**

  Übernimm einen terminalen Revalidierungsrun erst nach erfolgreicher Revisions-Reconciliation. Behandle syntaktisch ungültige oder unbekannte Revisionszustände als ungeklärten Cleanup. Bewahre den generischen allowlisteten Token im Runner und in allen PostgreSQL-Recovery-Prädikaten exakt.

- [x] **Step 3: Regressionen, PostgreSQL und Gesamtsuite grün verifizieren**

  Ergebnis nach der ersten Korrektur: 201 fokussierte Tests, 12 echte PostgreSQL-Tests und 1.827 Tests in der Gesamtsuite ohne Fehler; 12 geschützte PostgreSQL-Opt-in-Tests wurden im normalen Gesamtlauf übersprungen.

- [x] **Step 4: Zweite Review-Lücken rot beobachten und schließen**

  Verhindere die direkte Lease-Recovery-Adoption terminaler Revalidierungsruns und bewahre `complete` auch bei einem gesettelten Review über alle nachfolgenden lokalen Abweichungen. Ergebnis: 202 fokussierte Tests, 12 echte PostgreSQL-Tests und 1.828 Tests in der Gesamtsuite ohne Fehler; 12 geschützte PostgreSQL-Opt-in-Tests wurden im normalen Gesamtlauf übersprungen.

### Task 5: Separaten Commit erstellen

- [x] **Step 1: Separaten Commit erstellen**

  Commit: `fix: bewahre Revalidierungs-Cleanup bis zur Konsistenz`
