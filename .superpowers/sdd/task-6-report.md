# Task 6 – Cockpit-Layout A mit fünf Unterreitern

## Ergebnis

Das bestätigte Layout A ist als helle, klare redaktionelle Leitstelle umgesetzt. Die Oberfläche bleibt visuell mit dem bestehenden Komplett-Webdesign-Admin verbunden und verwendet dessen Marineblau und Orange. Weiße, präzise konturierte Arbeitsflächen, eine kompakte Kennzahlenzeile und semantische Statusfarben schaffen eine deutliche Hierarchie ohne die verworfene blasse Dashboardwirkung.

Die fünf Hauptreiter sind:

1. Übersicht
2. Entwürfe
3. Zeitplan & Modus
4. Jobs & Protokolle
5. Technik

Bestehende Inhalte bleiben als klarer Unterbereich der Entwürfe direkt über Übersicht und Entwurfsseite erreichbar.

## TDD-Nachweis

Zuerst wurde `tests/contentAgentAdminViews.test.js` angelegt und ausgeführt.

RED:

```text
node --test tests/contentAgentAdminViews.test.js
0 bestanden, 4 fehlgeschlagen
```

Die erwarteten Ursachen waren die fehlenden `_tabs.ejs`- und JavaScript-Dateien, fehlendes Layout-A-Markup, noch nicht vorhandene sichere Aktionsformulare sowie fehlende Content-Agent-Einstiege in Hauptnavigation und Admin-Dashboard.

GREEN nach der Implementierung:

```text
node --test tests/contentAgentAdminViews.test.js \
  tests/contentAgentAdminFallbackViews.test.js \
  tests/contentAgentAdminController.test.js \
  tests/contentAgentAdminRoutes.test.js \
  tests/blogAdminWorkflow.test.js

28 bestanden, 0 fehlgeschlagen
```

Die neuen Renderverträge prüfen zusätzlich dynamische XSS-Testwerte, CSRF-Felder, Admin-POST-Routen, das Fehlen von Rohpayloads und die sichtbaren Einstiege in den Content-Agenten.

## Umgesetzte Oberflächen

- Übersicht mit Modus, Zeitplan, Monatsbudget, offenen Prüfungen, redaktionellem Arbeitsvorrat, Systemstatus, Freigabefortschritt und Jobs mit Handlungsbedarf
- Entwurfskarten mit Bild, Score, Keyword, Cluster, Kosten, Risikohinweis, Vorschau und Prüfung
- Bestandsansicht mit sicherer Audit-Aktion und deutlichem Hinweis, dass Liveinhalte unverändert bleiben
- Zeitplanformular mit Agentstatus, Review-/Auto-Publish-Modus, sieben Wochentagen, Uhrzeit, IANA-Zeitzone, Budget, Mindestscore und Versuchsgrenze
- sichtbare Einzelvoraussetzungen für Direktveröffentlichung; technische Sperren bleiben serverseitig maßgeblich
- kompakte Jobprotokolle ohne JSON-Rohdaten sowie CSRF-geschützte Fortsetzung desselben Jobs
- schreibgeschützte Technikansicht mit Quelle, Neustarthinweis, Versionen, Worker- und Providerstatus
- eigener Content-Agent-Hauptlink und zusätzlicher Einstieg im bestehenden Admin-Dashboard
- Bestätigungs-JavaScript ausschließlich über `window.confirm`; keine Fetch-Aufrufe, kein Local Storage und keine fachliche Betriebslogik im Browser

## Sicherheit und Zugänglichkeit

- Alle Werte aus Viewmodels werden mit escaped EJS-Ausgaben gerendert.
- Es werden keine Secrets, Modellantworten, Stage-Ergebnisse oder Job-Rohpayloads ausgegeben.
- Jede neue Schreibaktion verwendet eine vorhandene Adminroute, POST und CSRF.
- Kritische Aktionen erhalten eine rein clientseitige Bestätigung; die serverseitige Prüfung bleibt unverändert.
- Die Technikansicht ist ausschließlich lesbar und kennzeichnet `.env` sowie erforderliche Neustarts.
- Die Seiten besitzen jeweils genau eine H1, beschriftete Bereiche und Formulare, `aria-current` für aktive Reiter, einen benannten Fortschrittsbalken und sichtbare Fokuszustände.
- `prefers-reduced-motion` wird respektiert.
- Unter 768 Pixeln werden Kennzahlen und Hauptspalten einspaltig; alle fünf Reiter sind ohne verstecktes horizontales Scrollen sichtbar.

## Verifikation

```text
Adminregression: 64 bestanden, 0 fehlgeschlagen
CSS-Build: 41 Quelldateien gebaut, Manifest aktualisiert
Gesamtsuite: 748 bestanden, 1 PostgreSQL-Opt-in-Test übersprungen, 0 fehlgeschlagen
git diff --check: ohne Befund
```

Die Oberfläche wurde zusätzlich aus EJS mit realistischen sicheren Viewmodels gerendert und in Headless Chrome geprüft:

- Übersicht bei 1440 × 1000 Pixeln
- Übersicht bei 390 × 844 Pixeln
- Zeitplan bei 390 × 844 Pixeln
- keine horizontale Seitenüberbreite bei 390 Pixeln
- alle fünf Reiter im mobilen Viewport sichtbar
- genau eine H1 und ein aktiver Hauptreiter
- keine unbenannten sichtbaren Formularelemente
- alle gerenderten Formulare als Admin-POST mit CSRF

## Bewusste Abgrenzung

Task 6 ergänzt ausschließlich die sichere Cockpit-Oberfläche. Vorschau-, Bearbeitungs-, Regenerierungs-, Publikations-, Risiko- und Revisionsfachlogik aus Task 7 und später wurde nicht vorweggenommen. Die bereits vorhandenen geschützten Routen und Zwischenviews wurden ausgebaut, ohne GET-Schreibwege oder neue Betriebslogik einzuführen.

## Sorge

Der lokale PostgreSQL-Integrationstest bleibt ohne ausdrücklich freigegebene, zurücksetzbare Testdatenbank erwartungsgemäß übersprungen. Für Task 6 selbst besteht kein offener UI- oder Sicherheitsblocker.
