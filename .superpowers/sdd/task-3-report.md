# Task 3: Dynamischer Scheduler und unveränderliche Job-Snapshots

## Ergebnis

Umgesetzt sind ein Luxon-basierter dynamischer Scheduler, kanonische Wochen-Slots, DST-sichere Ausführung, ein fünfminütiges Nachholfenster, atomare operative Pausen für Scheduler-Inserts und Queue-Claims sowie unveränderliche Runtime-Snapshots pro Job. Provider- und Pipelineabhängigkeiten entstehen pro Job aus dem persistierten Snapshot. Budgetmonate und Advisory Locks verwenden die Snapshot-Zeitzone beziehungsweise bei Retries den bereits gespeicherten Reservierungsmonat.

## TDD-Nachweise

### RED

1. `node --test tests/contentAgentScheduler.test.js tests/contentAgentRunSnapshot.test.js`
   - 0 bestanden, 2 fehlgeschlagen.
   - Erwartete Ursachen: `contentSchedulerService.js` fehlte; `createRun` übergab und speicherte keinen Runtime-Snapshot.
2. `node --test tests/contentAgentWorker.test.js tests/contentAgentJobRepository.test.js tests/contentAgentCostService.test.js`
   - 39 bestanden, 3 fehlgeschlagen.
   - Erwartete Ursachen: `monthKey` und `updateContentSchedulerState` fehlten; der Produktionshandler übergab keinen Snapshot an `createRun`.
3. `node --test tests/contentAgentCostService.test.js`
   - 13 bestanden, 1 fehlgeschlagen.
   - Erwartete Ursache: Ein Retry im August sperrte fälschlich August statt des persistierten Reservierungsmonats Juli.
4. `node --test tests/contentAgentScheduler.test.js`
   - 8 bestanden, 1 fehlgeschlagen.
   - Erwartete Ursache: Ein fehlgeschlagener Enqueue persistierte noch keinen Schedulerfehler.
5. `node --test tests/contentAgentWorker.test.js`
   - 40 bestanden, 1 fehlgeschlagen.
   - Erwartete Ursache: `worker.start()` wartete den ersten Heartbeat noch nicht ab.
6. `node --test tests/contentAgentJobRepository.test.js`
   - 20 bestanden, 1 fehlgeschlagen.
   - Erwartete Ursache: Der geplante Insert prüfte die operative Pause noch nicht innerhalb desselben SQL-Statements.

### GREEN

1. Neue Scheduler- und Snapshot-Tests: 9/9 bestanden.
2. Worker-, Repository- und Kostenintegration: 74/74 bestanden.
3. Finale fokussierte Task-3-Suite:
   - `node --test tests/contentAgentScheduler.test.js tests/contentAgentRunSnapshot.test.js tests/contentAgentWorker.test.js tests/contentAgentJobRepository.test.js tests/contentAgentCostService.test.js`
   - 86/86 bestanden, 0 fehlgeschlagen.
4. Gesamtsuite:
   - `OPENAI_API_KEY=test-key npm test`
   - 708 bestanden, 0 fehlgeschlagen, 1 übersprungen.
   - Übersprungen wurde ausschließlich die vorhandene echte PostgreSQL-Integration, weil keine Testdatenbank verfügbar war.
5. Syntax und Diff:
   - `node --check` für alle sechs geänderten Produktionsdateien erfolgreich.
   - `git diff --check` erfolgreich.

## Geänderte Dateien

- `services/contentAgent/contentSchedulerService.js`
- `repositories/contentJobRepository.js`
- `repositories/contentRunRepository.js`
- `services/contentAgent/workerService.js`
- `services/contentAgent/contentCostService.js`
- `scripts/contentWorker.js`
- `tests/contentAgentScheduler.test.js`
- `tests/contentAgentRunSnapshot.test.js`
- `tests/contentAgentWorker.test.js`
- `tests/contentAgentJobRepository.test.js`
- `tests/contentAgentCostService.test.js`
- `.superpowers/sdd/task-3-report.md`

## Selbstreview

- `content_jobs.idempotency_key` bleibt die Duplikatsicherung; geplante Inserts behalten `ON CONFLICT (idempotency_key)`.
- Der Claim behält `FOR UPDATE SKIP LOCKED` und sämtliche Lease-Fences.
- Die operative Pause wird im Scheduler-Tick berücksichtigt und zusätzlich atomar im geplanten Insert sowie in der Claim-Kandidatenauswahl geprüft.
- `CONTENT_AGENT_ENABLED=false` beendet den Entrypoint weiterhin vor Datenbank- oder Schedulerzugriff.
- Der Heartbeat läuft unabhängig von der operativen Pause; der erste Heartbeat wird vor dem sofortigen Schedulerstart abgewartet.
- `createRun` verändert `runtime_snapshot_json` beim Konflikt nicht. Der Handler verwendet für Retry-Pipeline und Provider ausschließlich den zurückgegebenen ersten Snapshot.
- Persistierte kostenpflichtige Stufen bleiben idempotent. Ein Retry sperrt den gespeicherten Reservierungsmonat und berechnet ihn nicht neu.
- Frühjahrslücke, doppelte Herbstzeit, kanonischer Schlüssel und Nachholfenster sind abgedeckt.
- Der bestehende Cron-Helfer bleibt für Kompatibilität exportiert; der Produktionsstart verwendet den dynamischen Datenbank-Scheduler. Dry-Run- und Worker-Verträge bleiben grün.

## Sorgen

- `npm test` ohne `OPENAI_API_KEY` scheitert bereits in `tests/securityRegression.test.js`, weil ein bestehender globaler OpenAI-Client beim Import einen Schlüssel verlangt. Mit `OPENAI_API_KEY=test-key` ist die Gesamtsuite grün; diese taskfremde Datei wurde nicht geändert.
- Die echte PostgreSQL-Integration war in dieser Umgebung übersprungen. SQL-Verträge sind durch fokussierte Query-Tests abgesichert, aber ein Lauf gegen eine reale Testdatenbank bleibt als zusätzliche Integrationsprüfung sinnvoll.

## Commit

- Branch: `codex/content-agent-admin-dashboard`
- Betreff: `feat: schedule content jobs from database settings`
- Der endgültige Commit-Hash steht im Task-Handoff, da ein Commit seinen eigenen Hash nicht in seinem Inhalt referenzieren kann.
