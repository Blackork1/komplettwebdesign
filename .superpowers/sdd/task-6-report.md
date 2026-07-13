# Task 6: Geschützte, rein lesende Adminauswertung

## Ergebnis

Die geschützte Adminseite `/admin/content-agent/search-console` ergänzt das bestehende Content-Agent-Cockpit als ruhige redaktionelle Auswertung. Sie zeigt den technischen Konfigurationsstatus ausschließlich als Boolean, die sichere Property `komplettwebdesign.de`, kompakte Kennzahlen sowie zwei responsive Tabellen für aggregierte Suchanfragen und offene Optimierungschancen.

Die Seite erhält ausschließlich serverseitig präsentierte Werte. Credentialpfade, technische Search-Console-URL, Rohpayloads, Analyse-Keys sowie Evidence- und Recommendation-JSON werden weder selektiert noch an die View übergeben. Alle dynamischen Texte werden mit EJS `<%=` escaped; die einzigen unescaped EJS-Ausgaben sind bestehende Partials über `<%- include(...) %>`. Es gibt kein Inline-Skript und keine Inhaltsänderungsaktion.

## Repository und Präsentation

- `getSearchConsoleInsights()` lädt drei voneinander getrennte, parametrisierte Abfragen:
  - höchstens 100 nach Impressionen sortierte, pro Seite und Query aggregierte Metrikzeilen;
  - höchstens 100 offene Chancen ohne JSON-Spalten;
  - ausschließlich den letzten Providerstatus für `google_search_console`.
- Klicks und Impressionen werden mit deutscher Tausendertrennung dargestellt.
- CTR wird als deutscher Prozentwert mit zwei Nachkommastellen formatiert.
- Positionen werden mit einer deutschen Nachkommastelle, Scores mit zwei Nachkommastellen formatiert.
- Seitenwerte werden auf Pfade der erlaubten Property reduziert.
- Empfehlungstexte entstehen aus einer festen serverseitigen Zuordnung der beiden erlaubten Chancentypen.

## Routen und manueller Sync

- `GET /admin/content-agent/search-console` ist durch `isAdmin` geschützt.
- `POST /admin/content-agent/search-console/sync` ist durch `isAdmin` und `verifyCsrfToken` geschützt.
- Der manuelle Sync verlangt:
  - `searchConsoleConfigured === true`;
  - den technischen Content-Agent-Hauptschalter;
  - einen aktivierten Agenten in den gespeicherten Einstellungen.
- Das Zeitfenster reicht in der konfigurierten Zeitzone von lokalem Heute minus 28 Tage bis zum Vortag.
- Der Deduplizierungsschlüssel lautet `gsc-manual-sync:<lokales-datum>`.
- `maxAttempts` ist das Minimum aus gespeichertem Einstellungswert und technischer Obergrenze.
- Ein Null-Ergebnis beim Enqueue wird als sicherer fachlicher Konflikt behandelt und erzeugt keine Erfolgsmeldung.

## TDD-Nachweis

### RED

Vor der Produktionsimplementierung:

```text
node --test tests/contentSearchAdminIntegration.test.js
```

Ergebnis:

```text
tests 8
pass 0
fail 8
```

Die Fehlschläge betrafen ausschließlich die noch fehlenden Task-6-Verträge: Route, Repositorymethode, Präsentation, Controllermethoden und View.

### GREEN – Task-6- und fokussierte Admin-Suite

```text
node --test tests/contentSearchAdminIntegration.test.js tests/contentAgentAdminController.test.js tests/contentAgentAdminRepository.test.js tests/contentAgentAdminPresentation.test.js tests/contentAgentAdminRoutes.test.js tests/contentAgentAdminViews.test.js tests/contentAgentAdminFallbackViews.test.js
```

Ergebnis:

```text
tests 78
pass 78
fail 0
```

### Build

```text
npm run build
```

Ergebnis: Exit-Code 0; 41 CSS-Quelldateien verarbeitet, Manifest unverändert.

### Vollständige Testsuite

```text
OPENAI_API_KEY=test npm test
```

Ergebnis:

```text
tests 1228
pass 1226
fail 0
skipped 2
```

Die zwei vorhandenen, umgebungsabhängigen Tests wurden erwartungsgemäß übersprungen.

## Abnahme

- [x] Beide Routen sind adminpflichtig; POST besitzt CSRF-Schutz.
- [x] Die View erhält nur einen GSC-Konfigurations-Boolean und die sichere Propertyanzeige.
- [x] Query- und Chancenabfragen sind parametrisiert und auf jeweils 100 Zeilen begrenzt.
- [x] CTR, Position, Klicks und Impressionen sind serverseitig deutsch formatiert.
- [x] Dynamische Texte werden ausschließlich über EJS `<%=` escaped.
- [x] Rohpayloads, Credentialpfade und JSON-Schlüssel gelangen nicht in die View.
- [x] Der manuelle Sync verwendet das lokale 28-Tage-Fenster, Tages-Deduplizierung und das Retry-Hardcap.
- [x] Null-Enqueue ist ein fachlicher Fehler.
- [x] Die Seite enthält keine Inhaltsänderungs- oder automatische Empfehlungsaktion.
- [x] Fokus-Tests, Build und vollständige Testsuite sind erfolgreich.
