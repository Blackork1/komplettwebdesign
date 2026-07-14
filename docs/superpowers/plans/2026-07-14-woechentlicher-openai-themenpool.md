# Wöchentlicher OpenAI-Themenpool – Implementierungsplan

> **Für agentische Worker:** REQUIRED SUB-SKILL: Nutze `superpowers:executing-plans`, um diesen Plan schrittweise umzusetzen.

**Ziel:** Der Content-Agent recherchiert höchstens einmal pro Kalenderwoche mit OpenAI-Websuche aktuelle, kundennahe Themen, verwendet diesen Themenpool für die Artikeltermine derselben Woche wieder und prüft die konkreten Quellen jedes ausgewählten Artikels weiterhin separat.

**Architektur:** Der erste reguläre Artikellauf einer Woche legt den Wochenpool verzögert an. PostgreSQL speichert den dauerhaften Rechercheversuch, Kandidaten, Recherchequellen und bereits verwendete Kandidaten eindeutig je Wochenbeginn und Zeitzone. Die vorhandene Themenbewertung wählt aus dem noch freien Pool; eine explizite manuelle Seed-Themenvorgabe behält den bisherigen Ablauf. DataForSEO und Google Ads werden nicht angebunden.

**Technik:** Node.js, OpenAI Responses API mit `web_search` und Structured Outputs, PostgreSQL/pgvector, Zod, Luxon, Node-Test-Runner.

## Verbindliche Regeln

- Aktuelle Themen stammen aus einer echten OpenAI-Webrecherche, nicht aus dem Modellgedächtnis allein.
- Exakte Suchvolumina oder Trendzahlen dürfen ohne belastbare Datenquelle nicht erfunden werden.
- GSC bleibt ein ergänzendes Signal; bestehende Inhalte verhindern Doppelungen und Kannibalisierung.
- Tester-Themen dürfen technisch höchstens ein Drittel des Pools ausmachen.
- Jeder aus dem Webpool gewählte Kandidat verlangt vor dem Schreiben eine eigene Quellenrecherche für den konkreten Artikel.
- Ein fehlgeschlagener Retry behält die bereits beanspruchte Themenwahl desselben Laufs.
- Ein unklar oder kostenpflichtig ausgeführter Wochenrechercheversuch sperrt weitere Läufe derselben Woche; nur sicher nicht ausgeführte Aufrufe geben die Wochensperre wieder frei.
- Es entstehen keine neuen `.env`-Variablen und keine neuen kostenpflichtigen Datenanbieter.

### Aufgabe 1: OpenAI-Wochenrecherche testgetrieben ergänzen

**Dateien:**
- Ändern: `tests/contentAgentOpenAIService.test.js`
- Ändern: `services/contentAgent/articleSchemas.js`
- Neu: `services/contentAgent/prompts/weeklyTopicResearchPrompt.js`
- Ändern: `services/contentAgent/openaiContentService.js`

1. Einen fehlschlagenden Test ergänzen, der `createWeeklyTopicPool` mit `web_search`, Structured Output, normalisierten Quellen und `requiresCurrentSources: true` erwartet.
2. Nur diesen Test ausführen und das erwartete Fehlen der Methode bestätigen.
3. Schema, Prompt und Service-Methode minimal implementieren.
4. Test erneut ausführen und grün bekommen.

### Aufgabe 2: Wochenidentität und Pool-Repository testgetrieben bauen

**Dateien:**
- Neu: `tests/contentAgentWeeklyTopicPoolService.test.js`
- Neu: `services/contentAgent/weeklyTopicPoolService.js`
- Neu: `tests/contentWeeklyTopicPoolRepository.test.js`
- Neu: `repositories/contentWeeklyTopicPoolRepository.js`

1. Tests für den Berliner Wochenbeginn, den Wechsel zur Folgewoche sowie Kandidatenausschluss schreiben.
2. Tests für Pool-Lesen, konkurrierendes `ON CONFLICT`, einen wochenweiten PostgreSQL-Advisory-Lock und idempotente Themenbeanspruchung schreiben.
3. Erwartete Fehlschläge bestätigen.
4. Service und Repository mit strikter Eingabevalidierung implementieren.
5. Teiltests grün ausführen.

### Aufgabe 3: Datenbankmigration ergänzen

**Dateien:**
- Neu: `scripts/migrations/010_create_weekly_topic_pools.sql`
- Ändern: `scripts/runContentAgentMigration.js`
- Ändern: relevante Migrations- und PostgreSQL-Integrationstests

1. Tests ergänzen, die Migration 010 und ihre Tabellen erwarten.
2. Erwarteten Fehlschlag bestätigen.
3. Tabellen für Wochenpools und eindeutige Kandidatenbeanspruchungen anlegen.
4. Migration im Runner registrieren und Tests grün ausführen.

### Aufgabe 4: Wochenpool in die Entwurfspipeline integrieren

**Dateien:**
- Ändern: `tests/contentAgentDraftPipeline.test.js`
- Ändern: `services/contentAgent/draftPipeline.js`

1. Tests schreiben für: erste Recherche, Wiederverwendung im zweiten Wochenlauf, unterschiedliche Kandidaten, Retry mit gleicher Auswahl und manuellen Seed-Fallback.
2. Erwartete Fehlschläge bestätigen.
3. Den Wochenpool nur aktivieren, wenn keine expliziten Seed-Themen vorgegeben sind.
4. Mindestens zwei Quellen, eindeutige Slugs, Kandidatenzahl und Tester-Anteil validieren, Kandidaten bewerten und atomar beanspruchen.
5. Die Wochenrecherche unter einem PostgreSQL-Lock nach erneutem Pool-Lesen höchstens einmal ausführen und die reale Parallelität im PostgreSQL-Integrationstest belegen.
6. Die vorhandene konkrete Artikelquellenrecherche unverändert nach der Auswahl ausführen.
7. Pipeline-Tests grün ausführen.

### Aufgabe 5: Produktionsworker verdrahten

**Dateien:**
- Ändern: `scripts/contentWorker.js`
- Ändern: zugehörige Worker-/Importtests

1. Einen Test ergänzen, der das neue Repository in den Produktionsabhängigkeiten erwartet.
2. Erwarteten Fehlschlag bestätigen.
3. Repository dynamisch laden, instanziieren und an die Pipeline übergeben.
4. Worker-Tests grün ausführen.

### Aufgabe 6: Gesamtverifikation

1. Gezielte Tests für OpenAI-Service, Wochenpool, Repository, Pipeline, Migration und Worker ausführen.
2. Vollständigen Testlauf mit lokalem Dummy-Schlüssel ausführen.
3. Produktions-Build ausführen.
4. `git diff --check`, Status und Diff prüfen.
5. Festhalten, dass auf dem VPS nur die neue Migration ausgeführt werden muss; `.env` und `docker-compose.yml` bleiben unverändert.
