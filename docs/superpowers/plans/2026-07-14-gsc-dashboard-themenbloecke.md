# GSC-Dashboard mit Themenblöcken – Umsetzungsplan

> **Zugehörige Spezifikation:** `docs/superpowers/specs/2026-07-14-gsc-dashboard-themenbloecke-design.md`

**Ziel:** Das bestätigte GSC-Dashboard „Themenblöcke zuerst“ produktiv umsetzen und GSC-Daten als nicht blockierendes Zehn-Prozent-Signal in die wöchentliche OpenAI-Themenrecherche einbinden.

## 1. Kategorisierungslogik testgetrieben aufbauen

**Dateien:**

- Neu: `services/contentAgent/searchConsoleCategoryService.js`
- Neu: `tests/contentSearchConsoleCategoryService.test.js`

**Vorgehen:**

1. Fehlende Tests für URL-Normalisierung, Sprache, Hauptkategorien und Tester-Unterkategorien schreiben.
2. Tests ausführen und das erwartete Fehlschlagen bestätigen.
3. Eine reine, seiteneffektfreie Kategorisierungsfunktion implementieren.
4. Aggregation nach Themenblock und Sprache sowie die Auswahl wichtiger Nicht-Tester-Anfragen ergänzen.
5. Eingaben begrenzen und bereinigen, damit Suchanfragen niemals als Prompt-Anweisungen interpretiert werden.
6. Tests erneut ausführen.

## 2. GSC-Abfragen auf den neuesten 28-Tage-Zeitraum korrigieren

**Dateien:**

- Ändern: `repositories/contentAgentAdminRepository.js`
- Ändern: `repositories/contentSearchMetricsRepository.js`
- Ändern: `tests/contentAgentAdminRepository.test.js`
- Ändern: `tests/contentSearchMetricsRepository.test.js`

**Vorgehen:**

1. Tests für den jüngsten gespeicherten Tag als Periodenende und 27 Tage Rückblick schreiben.
2. Im Admin-Repository neben Querydaten auch nach URL aggregierte Seitensummen und die tatsächliche Periode laden.
3. Die Querydetails auf eine vernünftige Obergrenze beschränken, ohne die Gesamtsummen zu verfälschen.
4. Im Metrik-Repository eine kompakte Abfrage für aktuelle Themen-Signale ergänzen.
5. Repository-Tests ausführen.

## 3. Präsentationsmodell für Variante A erstellen

**Dateien:**

- Ändern: `services/contentAgent/adminPresentationService.js`
- Ändern: `tests/contentAgentAdminPresentation.test.js`

**Vorgehen:**

1. Erwartete Kennzahlen, Zeitraumtexte, Themenkarten, Sprachgruppen und Content-Chancen in Tests festlegen.
2. Summen ausschließlich aus vollständigen Seitensummen berechnen.
3. Kategorien mit formatierten Zahlen, Anteilen, Unterkategorien und Detailzeilen aufbereiten.
4. Bestehende Optimierungschancen und Providerstatus unverändert übernehmen.
5. Präsentationstests ausführen.

## 4. Bestätigtes Dashboard umsetzen

**Dateien:**

- Ändern: `views/admin/contentAgent/searchConsole.ejs`
- Ändern: `public/admin.css`
- Generieren: `public/admin.min.css`
- Ändern: `tests/contentAgentAdminViews.test.js`

**Vorgehen:**

1. View-Tests für die vier Kennzahlen, den hervorgehobenen Tester-Block, alle weiteren Themenblöcke, Sprachangaben und die Nicht-Tester-Chancen schreiben.
2. Die bisherige flache Haupttabelle durch das bestätigte Themenblock-Layout ersetzen.
3. Details mit nativen `details`-/`summary`-Elementen zugänglich und ohne JavaScript-Zwang umsetzen.
4. Responsive Stile für Desktop und Mobil ergänzen.
5. CSS-Build ausführen und View-/Asset-Tests prüfen.

## 5. GSC als ergänzendes Signal in die Themenrecherche einbinden

**Dateien:**

- Ändern: `services/contentAgent/prompts/weeklyTopicResearchPrompt.js`
- Ändern: `services/contentAgent/contentAgentOpenAIService.js`
- Ändern: `services/contentAgent/topicScoringService.js`
- Ändern: `services/contentAgent/contentAgentDraftPipeline.js`
- Ändern: `scripts/contentWorker.js`
- Ändern: `tests/contentAgentOpenAIService.test.js`
- Ändern: `tests/contentAgentTopicScoring.test.js`
- Ändern: `tests/contentAgentDraftPipeline.test.js`
- Ändern: `tests/contentAgentWorker.test.js`

**Vorgehen:**

1. Tests schreiben, dass der Prompt GSC klar als ergänzendes, nicht vertrauenswürdiges Signal kennzeichnet.
2. Tests für deterministische GSC-Relevanz und den maximalen Zehn-Prozent-Anteil am Score schreiben.
3. Tests schreiben, dass fehlende oder fehlerhafte GSC-Daten die OpenAI-Webrecherche nicht stoppen.
4. Bereinigte Signale aus dem Repository in den Worker und die Pipeline injizieren.
5. GSC-Relevanz nach der Modellantwort deterministisch berechnen; den bestehenden Tester-Anteil von höchstens einem Drittel beibehalten.
6. Die Score-Version erhöhen und ältere/manuelle Kandidaten abwärtskompatibel behandeln.
7. Die betroffenen Tests ausführen.

## 6. Gesamtprüfung

1. Alle gezielten Tests aus den Schritten 1 bis 5 gemeinsam ausführen.
2. Vollständige Testsuite mit einem sicheren Testschlüssel ausführen.
3. Produktionsassets mit `npm run build` erzeugen.
4. `git diff --check` ausführen.
5. Relevante Adminansicht lokal rendern beziehungsweise über bestehende View-Tests prüfen.
6. Datenbanknahe Integrationstests ausführen, soweit die lokale Testumgebung sie bereitstellt.
7. Abschließend prüfen und dokumentieren, dass keine `.env`-, Docker-Compose- oder Migrationsänderung erforderlich ist.
