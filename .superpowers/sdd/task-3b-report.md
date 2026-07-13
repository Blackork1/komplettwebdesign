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

## Fixbericht zu den Reviewfindings

### Normalisierte Conflict-Key-Duplikate

Mehrere GSC-Zeilen können nach dem Entfernen von Querystring, Fragment und abschließendem Schrägstrich denselben Unique-Key `(metricDate, pageUrl, query, device)` besitzen. Der Service gruppiert diese Zeilen nun vor `upsertSearchMetrics` deterministisch in der Reihenfolge ihres ersten Auftretens.

- `clicks` und `impressions` werden summiert.
- `ctr` wird aus den aggregierten Klicks und Impressionen neu berechnet.
- `averagePosition` wird nach Impressionen gewichtet.
- Eine vorhandene `postId` bleibt erhalten, auch wenn eine andere normalisierte Variante nicht sicher einem Beitrag zugeordnet werden kann.
- Bei null Impressionen werden CTR und durchschnittliche Position auf `0` gesetzt.

RED-Kommando:

```bash
node --test --test-name-pattern='aggregiert normalisierte Conflict-Key-Duplikate' tests/searchConsoleSyncService.test.js
```

RED-Ergebnis: 0 von 1 Tests bestanden. Der Schreibbatch enthielt drei Zeilen mit identischem Conflict-Key statt einer aggregierten Zeile.

GREEN-Ergebnis mit demselben Kommando: 1 von 1 Tests bestanden.

### Schemafeste Zeilenvalidierung

Die Eingangsvalidierung entspricht nun den exakten Grenzen aus `scripts/migrations/007_create_content_search_metrics.sql`:

- `clicks` und `impressions`, `NUMERIC(14,4)`: `0` bis einschließlich `9.999.999.999,9999`.
- `ctr`, `NUMERIC(12,8)`: `0` bis einschließlich `9.999,99999999`.
- `average_position`, `NUMERIC(12,4)`: `0` bis einschließlich `99.999.999,9999`.
- `device`, `VARCHAR(24)`: höchstens 24 Zeichen.

RED-Kommando:

```bash
node --test --test-name-pattern='verwirft negative und die exakten Schemaobergrenzen' tests/searchConsoleSyncService.test.js
```

RED-Ergebnis: 0 von 1 Tests bestanden. Alle neun ungültigen Zeilen wurden zusammen mit der gültigen Grenzwertzeile an das Repository weitergegeben.

GREEN-Ergebnis mit demselben Kommando: 1 von 1 Tests bestanden; nur die gültige Grenzwertzeile wurde geschrieben.

### Abschlussverifikation des Fixes

```bash
node --test tests/contentSearchMetricsRepository.test.js tests/searchConsoleSyncService.test.js
```

Ergebnis: 11 bestanden, 0 fehlgeschlagen, 0 übersprungen.

```bash
OPENAI_API_KEY=test npm test
```

Ergebnis: 1.154 bestanden, 0 fehlgeschlagen, 2 übersprungen.
