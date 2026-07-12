# Final-Fix – Settings, Enqueue-Gates und Dashboardbudget

## Ergebnis

- Manuelle Entwürfe, Bestandsaudits und die vier unveränderten Regenerationsaktionen verwenden denselben Controller-Guard aus technischem Hauptschalter und `content_agent_settings.agent_enabled`.
- Ein direkter Admin-POST erzeugt bei technischem Not-Aus oder operativer Pause keinen Queueeintrag.
- Die Settings-Transition verweigert eine Aktivierung bei technischem Not-Aus sowie Monatsbudget und Versuchsanzahl oberhalb der `.env`-Hardcaps vor jedem DB-Schreibzugriff.
- Die Übersicht verwendet dieselbe monatliche Reservierungsabrechnung wie der Worker: offene Reservierungen zählen geschätzt, abgerechnete Reservierungen tatsächlich, andere Zustände nicht. Monat und Zeitzone stammen aus den operativen Settings; die angezeigte Grenze ist das Minimum aus DB und `.env`.
- Die Technikansicht zeigt für OpenAI und Cloudinary ausschließlich konfigurierte/nicht konfigurierte Boolesche Werte, niemals Zugangsdaten.
- Der Migrationsrunner benennt seine beiden Migrationen als `002 + 003`.

## TDD

Der RED-Lauf hatte sieben erwartete Fehlschläge. Nach der Implementierung bestehen 77 fokussierte Tests einschließlich des gemeinsamen Cost-Service-Vertrags.

## Verifikation

- Fokussiert: 77 bestanden, 0 fehlgeschlagen.
- Build: erfolgreich, 41 CSS-Quelldateien, Manifest unverändert.
- Dry-Run: `externalCalls=0`, `articleValid=true`, `publishMode=draft`.
- `git diff --check`: ohne Befund.
- Die vollständige Suite erreichte 925 bestandene Tests und einen übersprungenen PostgreSQL-Opt-in-Test. Sie enthielt sieben bereits parallel bearbeitete Abschluss-Racetests in `draftPipeline` und `draftRegenerationService`; diese liegen ausdrücklich außerhalb dieses Fixpakets und wurden hier nicht verändert.

## Abgrenzung

Snapshot-, Pipeline-, Regenerations- und Legacy-Blogdateien sind nicht Bestandteil dieses Commits.
