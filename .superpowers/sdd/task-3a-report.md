# Task 3a: Repository für Search-Console-Metriken

## Umfang

- `repositories/contentSearchMetricsRepository.js`
- `tests/contentSearchMetricsRepository.test.js`

Der Synchronisationsservice und seine Tests waren ausdrücklich nicht Bestandteil dieses Teilauftrags.

## Umsetzung

- `findPostIdsByCanonicalPaths(paths)` fragt nur exakt kanonische Pfade nach dem Muster `/blog/<ascii-slug>` ab und gibt die Zuordnungen als `Map` zurück. Nicht-Blogpfade und nicht kanonische Blogpfade lösen keine Zuordnung aus.
- `upsertSearchMetrics(rows)` schreibt alle Zeilen gebündelt über parametrisierte `UNNEST`-Arrays. Der Konfliktschlüssel ist `(metric_date, page_url, query, device)`. Ein vorhandenes `post_id` bleibt mit `COALESCE(EXCLUDED.post_id, content_search_metrics.post_id)` erhalten.
- `listAggregatedMetrics({ startDate, endDate, limit? })` summiert Klicks und Impressionen, berechnet die CTR aus den Summen und gewichtet die Position nach Impressionen. Ein übergebenes Limit wird als Datenbankparameter serverseitig angewendet.

## TDD-Nachweis

1. RED: `node --test tests/contentSearchMetricsRepository.test.js`
   - Erwarteter Fehler: `ERR_MODULE_NOT_FOUND` für das zunächst fehlende Repository.
2. GREEN: `node --test tests/contentSearchMetricsRepository.test.js`
   - 6 Tests bestanden, 0 fehlgeschlagen.

## Gesamtprüfung

`OPENAI_API_KEY=test npm test`

- 1.151 Tests insgesamt
- 1.149 bestanden
- 0 fehlgeschlagen
- 2 übersprungen

`git diff --check` meldete keine Whitespace-Fehler. Der geprüfte Diff enthält ausschließlich den vereinbarten Repository-Teil, seinen fokussierten Test und diesen Bericht.
