# Task 3b: Search-Console-Synchronisationsservice

## Status

Der abgegrenzte Syncservice ist implementiert. Das bestehende Repository wurde nicht geändert.

## Umgesetztes Verhalten

- `createSearchConsoleSyncService({ client, repository, allowedHosts })` stellt `syncSearchConsoleRange({ startDate, endDate, leaseGuard })` bereit.
- Jede API-Anfrage verwendet die vorgegebene Dimensionierung und eine Seitengröße von 25.000 Zeilen.
- Die Pagination erhöht `startRow` um die tatsächlich empfangene Zeilenanzahl und endet erst mit einer leeren Seite.
- Der Lease-Guard läuft unmittelbar vor jeder API-Seite und unmittelbar vor jedem schreibenden Repositoryaufruf.
- Nur HTTP- und HTTPS-URLs der beiden ausdrücklich erlaubten Hosts werden verarbeitet.
- Querystring, Fragment und abschließende Schrägstriche werden aus der gespeicherten Seiten-URL entfernt.
- Nur unverfälschte Pfade nach dem Muster `/blog/<ascii-slug>` werden zur Beitragszuordnung verwendet. Nicht kanonische, mehrsegmentige und über Dot-Segmente normalisierte Pfade erhalten `postId: null`.
- Ungültige Datumswerte, URLs, Dimensionszeilen und Zahlenwerte werden je Zeile verworfen. Andere gültige Zeilen derselben Seite bleiben erhalten.
- Gültige Zeilen werden in das Camel-Case-Format des bestehenden Repositorys übertragen.

## TDD-Nachweis

1. Der erste RED-Lauf scheiterte erwartungsgemäß mit `ERR_MODULE_NOT_FOUND`, weil `searchConsoleSyncService.js` noch nicht existierte.
2. Nach der Minimalimplementierung bestand der neue Synctest mit 3 von 3 Tests.
3. Ein zusätzlicher Sicherheitstest für Dot-Segmente scheiterte gezielt mit `postId: 91` statt `postId: null`.
4. Nach der abgesicherten Rohpfadprüfung bestanden die fokussierten Repository- und Synctests mit 9 von 9 Tests.

## Geänderte Dateien

- `services/contentAgent/searchConsoleSyncService.js`
- `tests/searchConsoleSyncService.test.js`
- `.superpowers/sdd/task-3b-report.md`

## Repositoryintegration

Für die Integration war keine Änderung an `repositories/contentSearchMetricsRepository.js` erforderlich.

## Verifikation

- `node --test tests/contentSearchMetricsRepository.test.js tests/searchConsoleSyncService.test.js`: 9 bestanden, 0 fehlgeschlagen.
- `OPENAI_API_KEY=test npm test`: 1.152 bestanden, 2 übersprungen, 0 fehlgeschlagen.
