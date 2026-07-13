# Task 5b: Workerdispatch und Produktionsverdrahtung

## Ergebnis

- `sync_search_console` und `analyze_search_opportunities` sind als `SEARCH_CONSOLE_JOB_TYPES` registriert und werden vor Content-Run und Artikelpipeline dispatcht.
- Beide Jobtypen akzeptieren ausschließlich `{ startDate, endDate }` mit echten kanonischen Datumswerten im Format `YYYY-MM-DD`, verlangen `startDate <= endDate` und eine aktive Lease.
- Der Sync verwendet den Search-Console-Syncservice, schreibt für `google_search_console` einen bereinigten Erfolgs- oder Fehlerstatus und enqueued die Analyse idempotent mit `gsc-analysis:<startDate>:<endDate>`.
- Die Analyse liest aggregierte Suchmetriken, baut Chancen und führt den idempotenten Opportunity-Upsert ohne `content_runs` aus.
- Client, Syncservice, Metrikrepository, Opportunity-Repository und Opportunity-Service sind im verzögert geladenen Produktionspfad an den aktiven Datenbankpool gebunden.
- Der Search-Console-Scheduler startet zusammen mit dem bestehenden Artikel-Scheduler nur beim aktivierten Worker. Ohne GSC-Konfiguration bleibt sein Tick ohne Wirkung.
- Die operative Pause wird vor dem Scheduler-Enqueue geprüft und zusätzlich für beide GSC-Jobtypen atomar im Queue-Insert erzwungen. Das zentrale Claim-Gate bleibt unverändert.
- Der idempotente Shutdown stoppt Artikel- und Search-Console-Scheduler vor Worker und Datenbankpool.

## TDD-Nachweis

RED:

```text
node --test tests/contentSearchScheduler.test.js tests/contentAgentWorker.test.js tests/contentAgentJobRepository.test.js
Ergebnis: 100 bestanden, 10 fehlgeschlagen
```

Die Fehler betrafen ausschließlich die fehlenden GSC-Jobtypen, Dispatchpfade, Produktionsmodule, Schedulerverdrahtung, operative Pause und den zweiten Scheduler im Shutdown. Ein zusätzlicher isolierter RED-Lauf bestätigte das noch fehlende atomare GSC-Enqueue-Gate.

GREEN:

```text
node --test tests/contentSearchScheduler.test.js tests/contentAgentWorker.test.js tests/contentAgentJobRepository.test.js
Ergebnis: 111 bestanden, 0 fehlgeschlagen

OPENAI_API_KEY=test npm test
Ergebnis: 1.217 bestanden, 0 fehlgeschlagen, 2 übersprungen
```

Zusätzlich bestand `git diff --check` ohne Befund.

## Geänderte Dateien

- `scripts/contentWorker.js`
- `repositories/contentJobRepository.js`
- `services/contentAgent/searchConsoleSchedulerService.js`
- `tests/contentAgentWorker.test.js`
- `tests/contentAgentJobRepository.test.js`
- `tests/contentSearchScheduler.test.js`
- `.superpowers/sdd/task-5b-report.md`
