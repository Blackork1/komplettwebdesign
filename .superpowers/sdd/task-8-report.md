# Task 8 – Sichere Entwurfsbearbeitung und echte Frontendvorschau

## Ergebnis

- KI-Entwürfe können ausschließlich als unveröffentlichte, KI-generierte `static_html`-Posts bearbeitet werden.
- Der Schreibpfad verwendet eine feste Feld-Allowlist, sichere JSON-/Zod-Fehler, vollständige Artikelvalidierung und eine gemeinsame Transaktion für `posts` und `content_post_metadata`.
- Speichern verändert weder `published` noch `workflow_status`, `generated_by_ai`, `generation_run_id` oder andere nicht erlaubte Felder.
- Die Slugprüfung schließt den aktuellen Post aus und wird innerhalb der Schreibtransaktion nach Tabellen-/Row-Lock erneut geprüft.
- Admin-ID, Adminname, Feldliste und Zeitpunkt werden als `lastAdminEdit` sowie in `adminEditHistory` protokolliert.
- Öffentliche Seite und Adminvorschau verwenden dasselbe `buildBlogPostPageModel()` und dieselbe `views/blog/show.ejs`.
- Legacy-EJS wird nur für einen öffentlichen Post mit exakt `content_format='legacy_ejs'` ausgeführt. Vorschau und unbekannte Formate verhalten sich fail-closed.
- Die Vorschau setzt Meta-Robots und `X-Robots-Tag` auf `noindex,nofollow`, verwendet `/blog` als sichere Canonical-/OG-URL und gibt kein Draft-`BlogPosting`-/FAQ-JSON-LD aus.
- Vorschauen enthalten keine Kommentar-HTML, Formulare, Kommentar-, Cookie-, Tracking-, Chat- oder Recaptcha-Logik.
- Die Risikoprüfliste wird nur in der Adminvorschau gezeigt. Zielanker werden gegen das bereits sanitizierte HTML serverseitig neu bestimmt; modellgelieferte IDs werden nicht übernommen, doppelte Überschriften erhalten eindeutige IDs.
- Der Editor enthält Titel, Kurzbeschreibung, Slug, Meta Title, Meta Description, OG-Titel, OG-Beschreibung, Bild-Alt-Text, Artikel-HTML und FAQ-JSON, inklusive 60-/160-Zeichenzählern und CSRF-Token.

## TDD-Nachweis

RED zuerst:

```text
node --test tests/contentAgentAdminDraftService.test.js tests/contentAgentPreview.test.js
→ 2 Testdateien fehlgeschlagen: ERR_MODULE_NOT_FOUND für beide neuen Services
```

GREEN und Regression:

```text
node --test tests/contentAgentAdminDraftService.test.js tests/contentAgentPreview.test.js \
  tests/blogContentFormat.test.js tests/contentAgentAdminController.test.js \
  tests/contentAgentAdminRoutes.test.js tests/contentAgentAdminViews.test.js \
  tests/contentAgentRiskReport.test.js tests/contentAgentArticleValidator.test.js \
  tests/blogAdminWorkflow.test.js
→ 85 bestanden, 0 fehlgeschlagen

OPENAI_API_KEY=test-key npm test
→ 786 Tests, 785 bestanden, 0 fehlgeschlagen, 1 übersprungen

npm run build
→ PASS; 41 CSS-Quelldateien, Manifest aktuell

node --check services/contentAgent/adminDraftService.js
node --check services/blogPostPresentationService.js
node --check controllers/adminContentAgentController.js
node --check controllers/blogController.js
git diff --check
→ jeweils PASS
```

Der übersprungene Test ist die vorhandene opt-in PostgreSQL-Integration ohne ausdrücklich freigegebene zurücksetzbare Testdatenbank.

## Browser- und Render-QA

Der Flow unter Test war:

```text
geschützte Draftvorschau → Risikohinweis auswählen → sanitizierten Artikelabschnitt erreichen
Entwurfseditor → Meta Title ändern → Zeichenzähler aktualisiert sich
```

Der vorgeschriebene Browserpfad wurde zuerst versucht. Die Browserlaufzeit initialisierte, aber `getForUrl()` antwortete mit `No browser is available`; die vorgeschriebene Diagnose ergab `agent.browsers.list() = []`. Daher wurde gemäß Brief ein isolierter lokaler EJS-/Puppeteer-Fixture verwendet. Er nutzte dieselben Services und Views, aber keine App-Authentifizierung, Datenbank oder Live-Daten.

Geprüfte Viewports:

- Vorschau Desktop: 1440 × 1000
- Vorschau Mobil: 390 × 844
- Editor Desktop: 1440 × 1000
- Editor Mobil: 390 × 844

Alle vier Renderprüfungen hatten genau eine H1, keine doppelten IDs, keine fehlenden Formularlabels, keinen horizontalen Overflow, kein Framework-Overlay, keine Console-Errors/-Warnings und keine fehlgeschlagenen Requests. Die Vorschau hatte zusätzlich null Formulare, null Kommentarbereich und null Tracking-/Cookie-/Kommentar-Skripte. Risk-Link, noindex Meta/Header, sichere Canonical-URL, CSRF und Meta-Zähler wurden interaktiv geprüft.

Lokale, nicht versionierte Evidenz:

- `/tmp/task8-preview-desktop.png`
- `/tmp/task8-preview-mobile.png`
- `/tmp/task8-editor-desktop.png`
- `/tmp/task8-editor-mobile.png`

## Verbleibende Risiken

- Der echte authentifizierte Adminflow mit PostgreSQL wurde nicht im Browser verändert oder gespeichert, damit keine Live-Daten betroffen sind. Controller, Route, CSRF, Repositorytransaktion und vollständiges EJS-Rendering sind automatisiert beziehungsweise über isolierte Fixtures geprüft.
- Die PostgreSQL-Integration bleibt ohne freigegebene Reset-Testdatenbank übersprungen und muss im vorgesehenen opt-in Lauf ausgeführt werden.
- Die Adminvorschau entfernt bewusst öffentliche Footer-/Formular-/Trackinglogik. Damit bleibt das sichtbare Bloglayout realitätsnah, während side-effecting Bereiche absichtlich nicht Bestandteil der Vorschau sind.

## Review-Fix

Die beiden Important-Findings aus dem Task-8-Review wurden in einem separaten TDD-Zyklus behoben:

- `adminEditHistory` besitzt ein festes Cap von 50 Einträgen. Beim nächsten Edit werden die letzten 49 vorhandenen Einträge in ihrer bisherigen chronologischen Reihenfolge übernommen und der aktuelle Edit als neuester Eintrag angehängt. Die SQL-Indexserie ist auf höchstens 49 Positionen begrenzt; eine bestehende übergroße oder nicht-arrayförmige Historie wird deterministisch reduziert beziehungsweise sicher ersetzt. `lastAdminEdit` bleibt unabhängig davon aktuell.
- Adminnamen werden vor dem Audit kontrollzeichenfrei und whitespace-normalisiert sowie auf 255 Unicode-Zeichen begrenzt.
- Nicht zu Überschriften gehörende Preview-IDs werden vor der Heading-ID-Erzeugung reserviert. Dadurch bleibt `pruefung-gesamter-artikel` exklusiv beim allgemeinen Wrapper; echte gleichnamige H2/H3 erhalten deterministisch `pruefung-gesamter-artikel-2`, `-3` und so weiter.
- Bei bereits persistierten alten Risk-Ankern wird das exakte Ziel zusätzlich über Abschnitt und Evidenzausschnitt verifiziert. Damit treffen Checklistenlinks auch bei der reservierten ID und doppelten echten Überschriften weiterhin die richtige Fundstelle.

Review-Fix-Nachweis:

```text
RED: node --test tests/contentAgentAdminDraftService.test.js tests/contentAgentPreview.test.js
→ 12 bestanden, 4 gezielt fehlgeschlagen

GREEN: node --test tests/contentAgentAdminDraftService.test.js tests/contentAgentPreview.test.js
→ 16 bestanden, 0 fehlgeschlagen
```

Das Desktop-/Mobil-Fixture wurde nach dem Markup-Fix erneut ausgeführt. Duplicate-IDs, fehlende Labels, horizontaler Overflow, Console-Fehler, Requestfehler und Preview-Side-Effects blieben jeweils bei null.
