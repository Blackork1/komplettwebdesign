# Abschlussbericht: Reviewkorrekturen der KI-Bestandsoptimierung

Stand: 15. Juli 2026

## Ergebnis

Alle vier abschließenden Reviewbefunde wurden testgetrieben behoben. Die Änderungen verändern veröffentlichte Artikel niemals direkt. Neue oder wiederholte Optimierungen bleiben an den vorhandenen Draft-, Job-, Lease-, Kosten- und Revisionszäunen gebunden.

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

## Verifikation

- `npm run build`: erfolgreich; 41 CSS-Quelldateien, Manifest unverändert.
- `OPENAI_API_KEY=test-key npm test`: 1.875 Tests, 1.860 bestanden, 15 erwartungsgemäß ohne PostgreSQL-Opt-in übersprungen, 0 fehlgeschlagen.
- Echte PostgreSQL-Integrationssuiten mit freigegebener lokaler Testdatenbank: 15/15 bestanden, 0 übersprungen, 0 fehlgeschlagen.
- Enthalten sind der neue atomare und idempotente Schließpfad sowie die vollständige Migration- und Veröffentlichungsintegration.
- `git diff --check`: erfolgreich.

## Verbleibende Hinweise

Für diese vier Reviewbefunde bestehen keine bekannten offenen technischen Punkte. Vor einem VPS-Deploy gelten weiterhin die vorhandenen Migrations-, Backup- und Workerstart-Anweisungen des Gesamtprojekts.
