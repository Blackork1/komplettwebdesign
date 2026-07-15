# Abschlussbericht: Reviewkorrekturen der KI-Bestandsoptimierung

Stand: 15. Juli 2026

## Ergebnis

Alle sieben abschließenden Reviewbefunde wurden testgetrieben behoben. Die Änderungen verändern veröffentlichte Artikel niemals direkt. Neue oder wiederholte Optimierungen bleiben an den vorhandenen Draft-, Job-, Lease-, Kosten- und Revisionszäunen gebunden.

## Behobene Befunde

### 1. Erneuter Start nach abgeschlossener Revision

- Nach einer abgeschlossenen Optimierung ist ein neuer Start wieder möglich, sobald die erzeugte Revision freigegeben oder verworfen wurde.
- Eine beliebige noch offene Draft-Revision desselben Artikels sperrt den Start weiterhin unabhängig vom letzten Job.
- Laufende oder eingeplante Optimierungen bleiben gesperrt.

Commit: `7ab2b4b fix: erneute Bestandsoptimierung nach Abschluss freigeben`

### 2. Sicheres Schließen deterministischer manueller Fehler

- Bekannte deterministische Fehler in `needs_manual_attention` erhalten eine eigene, ausdrücklich bestätigte Adminaktion.
- Die Aktion prüft Jobtyp, Jobstatus, Runstatus, Artikelbindung, veröffentlichten Artikel, Fehler-Allowlist, Draft-Revisionen und offene Providerreservierungen atomar in PostgreSQL.
- Unklare Providerzustände bleiben ausgeschlossen.
- Der Vorgang ist idempotent, schreibt einen Admin-Auditeintrag und verändert keinen Liveartikel.
- Der generische Retry wird für Bestandsoptimierungen nicht angeboten.

Commits:

- `d096ed4 fix: deterministische Bestandsfehler sicher schließen`
- `81a42cd test: sichere Schließaktion mit PostgreSQL prüfen`

### 3. Schutz der HTML-Wrapperstruktur

- Relevante Bootstrap-Wrapper und Layoutklassen werden unabhängig von Inhaltsänderungen verglichen.
- Das Entfernen oder Verändern beispielsweise von `table-responsive`, Grid-, Container- oder Flex-Wrappern wird erkannt.
- Auch die Verschiebung eines bestehenden Inhaltsblocks in einen anderen Elternwrapper wird erkannt.
- Reine Textoptimierungen innerhalb unveränderter Wrapper bleiben zulässig.
- Die einmalige automatische Reparatur erhält bei einem Strukturverstoß einen eigenen konkreten Befund.

Commit: `6189d16 fix: HTML-Struktur bei Bestandsoptimierung schützen`

### 4. Auditjahr in Europe/Berlin

- Das aktuelle Auditjahr wird aus dem unveränderlichen Startzeitpunkt des Runtime-Snapshots in `Europe/Berlin` bestimmt.
- Der Regressionstest deckt den Jahreswechsel ab, bei dem `2026-12-31T23:30:00Z` in Berlin bereits im Jahr 2027 liegt.
- Ein ungültiger Startzeitpunkt stoppt die Revalidierung fail-closed vor dem Provideraufruf.

Commit: `a6d7a95 fix: Re-Auditjahr in Berlinzeit bestimmen`

### 5. Gemeinsame Transaktionssperre pro Artikel

- KI-Aufträge, manuelle Revisionen und das sichere Schließen deterministischer Fehler verwenden dieselbe PostgreSQL-Zeilensperre des veröffentlichten Artikels.
- Nach dem Erwerb der Sperre werden offene Revisionen und aktive Optimierungsaufträge jeweils mit einem frischen `READ COMMITTED`-Snapshot geprüft.
- Dadurch kann parallel weder ein kostenpflichtiger KI-Auftrag neben einer manuellen Revision entstehen noch ein Auftrag geschlossen werden, während gleichzeitig eine Revision angelegt wird.
- `CONTENT_REVISION_CONFLICT` kann nur dann sicher geschlossen werden, wenn tatsächlich keine Revision und keine offene Providerreservierung mehr vorhanden ist.
- Ein echter PostgreSQL-Parallelitätstest hält die Artikelsperre gezielt und belegt alle drei Konfliktrichtungen.

Commit: `6143640 fix: Bestandsentwürfe pro Artikel serialisieren`

### 6. Vollständiger Schutz der HTML- und Bootstrap-Struktur

- Der Strukturvergleich erfasst jetzt alle relevanten Wrapper-Tags sowie sämtliche erlaubten Bootstrap-Darstellungsklassen des Artikelvertrags.
- Auch Klassen auf inhaltlichen Elementen wie `lead`, `btn` oder `list-group-item` sind Teil des unveränderlichen Strukturfingerabdrucks.
- Das Entfernen, Austauschen oder Verschieben von Container-, Grid-, Tabellen-, Listen-, Rahmen-, Abstands- und CTA-Klassen wird erkannt.
- Eine reine Änderung der Klassenreihenfolge oder des Textinhalts bleibt weiterhin zulässig.

Commit: `2b45243 fix: vollständige Artikelwrapper unverändert halten`

### 7. Sichtbare sichere Schließaktion direkt im Entwurf

- Sobald die Hintergrundoptimierung in einen sicher schließbaren manuellen Zustand wechselt, lädt die Entwurfsansicht einmal neu.
- Dadurch wird die serverseitig geprüfte Schließaktion direkt in der Entwurfsliste sichtbar, ohne dass der Admin zu „Jobs & Protokolle“ wechseln muss.
- Eine sitzungsgebundene Markierung verhindert Reload-Schleifen; unsichere oder nicht zum Job passende Aktions-URLs werden verworfen.

Commit: `8cb0f0b fix: sichere Schließaktion im Entwurf anzeigen`

## Verifikation

- `npm run build`: erfolgreich; 41 CSS-Quelldateien, Manifest unverändert.
- `OPENAI_API_KEY=test-key npm test`: 1.886 Tests, 1.870 bestanden, 16 erwartungsgemäß ohne PostgreSQL-Opt-in übersprungen, 0 fehlgeschlagen.
- Echte PostgreSQL-Integrationssuiten mit freigegebener lokaler Testdatenbank: 16/16 bestanden, 0 übersprungen, 0 fehlgeschlagen.
- Enthalten sind der neue atomare und idempotente Schließpfad, die gemeinsame Artikelsperre unter echter Parallelität sowie die vollständige Migration- und Veröffentlichungsintegration.
- `git diff --check`: erfolgreich.

## Verbleibende Hinweise

Für diese sieben Reviewbefunde bestehen keine bekannten offenen technischen Punkte. Vor einem VPS-Deploy gelten weiterhin die vorhandenen Migrations-, Backup- und Workerstart-Anweisungen des Gesamtprojekts.
