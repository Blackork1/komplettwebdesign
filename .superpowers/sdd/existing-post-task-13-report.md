# Task 13 – Integration, Bereitstellung und Abschlussprüfung

## Ergebnis

Die KI-Optimierung bestehender Blogartikel ist für die kontrollierte Bereitstellung auf dem IONOS-VPS dokumentiert und durch echte PostgreSQL-Integrationsprüfungen abgesichert. Die Anleitung stellt klar, dass weder eine neue `.env`-Variable noch ein zusätzlicher Docker-Dienst erforderlich ist. Die bestehende OpenAI-, PostgreSQL- und GSC-Konfiguration wird weiterverwendet.

Vor dem Neustart des Content-Workers verlangt die Anleitung nun verbindlich:

1. eine PostgreSQL-Sicherung,
2. die idempotenten Migrationen bis einschließlich `011_create_existing_post_optimization.sql` und `012_upgrade_revision_outcome_claims.sql`,
3. eine gezielte Schema-Prüfung der Tabellen, Indizes, Claim-Spalten und des validierten Claim-Constraints,
4. erst danach die Neuerstellung von App und Worker.

Die anschließende kontrollierte Abnahme beschreibt einen einzelnen veröffentlichten `static_html`-Artikel, einen einzelnen KI-Optimierungsauftrag, die unveränderte öffentliche Version während der Prüfung, den Vergleich und die gesperrten Felder, einen sicheren Rücksprung mit erneuter Validierung sowie die redaktionelle Freigabe. Livehash- und Versionskonflikte werden ausdrücklich als erwartete Schutzwirkung erklärt. Nach einer Freigabe wird genau ein neutral formulierter Outcome-Datensatz mit lokalem 28-Tage-Kalenderfenster erwartet; ein automatischer Rückbau findet nicht statt.

## TDD-Verlauf

- RED: Der neue Bereitstellungsvertrag scheiterte zunächst gezielt mit 30 bestandenen und 1 fehlgeschlagenen Test, weil die VPS-Anleitung Migration 011, den migrationssicheren Upgrade 012, die Schema-Prüfung und die kontrollierte Abnahme noch nicht vollständig enthielt.
- GREEN: Nach der Ergänzung der Anleitung bestand die gesamte Deployment-Guide-Suite mit 31 von 31 Tests.
- Die Dokumentationstests sichern zusätzlich, dass keine neue `.env`-Variable und kein neuer Docker-Dienst behauptet werden und dass Migration, Schema-Prüfung und Worker-Neustart in der sicheren Reihenfolge bleiben.
- `git diff --check`: ohne Befund.

## Echte PostgreSQL-Integration

Der bestehende geschützte Content-Agent-Integrationstest wurde um einen rollback-isolierten End-to-End-Pfad für die Bestandsoptimierung erweitert. Er prüft:

- einen veröffentlichten statischen Bestandsartikel,
- genau einen aktiven `optimize_existing_post`-Auftrag je Artikel,
- die Ablehnung eines zweiten parallelen Auftrags durch `ux_content_jobs_active_existing_optimization`,
- Audit- und geschützte Revisionsdaten,
- optimistische Revisionsversionierung und die Ablehnung eines veralteten Schreibversuchs,
- die Outcome-Basis im selben Transaktionskontext,
- das lokale 28-Tage-Folgefenster über die Zeitumstellung im März,
- die Ablehnung einer Optimierung, wenn sich der Liveartikel seit dem Snapshot geändert hat,
- vollständigen Rollback ohne verbliebene Testdaten.

Die separat geschützte Outcome-Integration prüft weiterhin den migrationssicheren Claim-Upgrade 012, die idempotente Wiederholung und das Claim-Token-/Revisionsversions-CAS.

Docker Desktop war lokal wegen eines unabhängigen `containerd`-Ein-/Ausgabefehlers nicht nutzbar. Daher liefen die geschützten Prüfungen sicher gegen die dedizierte lokale PostgreSQL-Datenbank `kwd_content_agent_integration_test`; eine nur für den Lauf angelegte Datenbank wurde anschließend wieder entfernt. Es wurden weder Produktionsdaten noch externe Provider verwendet.

## Verifikation

- Deployment-Anleitung: 32 bestanden, 0 fehlgeschlagen, 0 übersprungen.
- Gebündelte Bestandsoptimierungs-, Schema-, Freshness-, Diff-, Repository-, Prompt-, Pipeline-, Outcome-, Revision-, Worker-, Admin-, Routen- und View-Suiten: 424 bestanden, 0 fehlgeschlagen, 0 übersprungen.
- Echter Content-Agent-PostgreSQL-Lauf: 12 bestanden, 0 fehlgeschlagen, 0 übersprungen.
- Echter Outcome-PostgreSQL-Lauf: 2 bestanden, 0 fehlgeschlagen, 0 übersprungen.
- `npm run build`: erfolgreich; 41 CSS-Quelldateien verarbeitet, Manifest unverändert.
- Vollständige Suite mit `OPENAI_API_KEY=test-key`: 1.843 bestanden, 0 fehlgeschlagen, 14 geschützte Opt-in-Tests übersprungen; 1.857 Tests insgesamt.
- Externe OpenAI-, GSC-, Cloudinary-, SMTP- oder Produktionsaufrufe wurden nicht ausgeführt.

## Bewusste Grenzen

Die Bereitstellung führt nicht automatisch eine echte Optimierung auf dem VPS aus. Der erste Produktionslauf bleibt eine bewusst ausgelöste und redaktionell kontrollierte Abnahme. Die Dokumentation gibt dafür die exakten Prüfstellen vor; Zugangsdaten oder Artikelinhalte werden bei der Schema-Prüfung nicht ausgegeben.

## Nachtrag: Katalogprüfung bei jedem wiederholbaren Release

### Ursache und Korrektur

Der einmalige Erstrollout prüfte die PostgreSQL-Strukturen aus Migration 011 und 012 bereits vor dem Worker-Neustart. Der regulär wiederverwendete Ablauf in `deploy/deploy.sh` führte zwar beide idempotenten Migrationsläufe aus, ging danach aber direkt zum Dry-Run über. Damit war der wichtigste Betriebsweg nicht gegen eine unvollständig wirksame Bestandsoptimierungs- oder Claim-Migration abgesichert.

Der dokumentierte `deploy/deploy.sh` führt jetzt unmittelbar nach dem zweiten Migrationslauf denselben Fail-closed-Katalogcheck aus. Er prüft ohne Ausgabe von Zugangsdaten oder Artikelinhalten:

- `content_revision_optimization_outcomes`,
- `content_revision_optimization_feedback`,
- `ux_content_jobs_active_existing_optimization`,
- `idx_content_revision_outcomes_pending`,
- beide Claim-Spalten `evaluation_claim_token` und `evaluation_claimed_at`,
- den benannten und validierten Constraint `content_revision_optimization_outcomes_claim_consistent`.

Nur die exakte Ausgabe `ok` erlaubt den Dry-Run und anschließend den gemeinsamen Recreate von App und Worker. Eine fehlende oder unvollständige Struktur beendet das Deployment aufgrund von `set -Eeuo pipefail` beziehungsweise der expliziten `fail`-Prüfung, während die bisherige App weiterläuft und der pausierte Agent nicht durch einen neuen Worker fortgesetzt wird.

### RED/GREEN- und Verifikationsbelege

- RED: Der neue Abschnitt-7.1-Test scheiterte gezielt mit „Katalogprüfung muss nach beiden Migrationen laufen“.
- GREEN: Der Test prüft beide Migrationsläufe, die unmittelbar folgende Katalogprüfung, alle relevanten 011/012-Objekte, Claim-Spalten, den validierten Constraint sowie die Reihenfolge vor Dry-Run und Worker-Recreate.
- Vollständige Deployment-Suite: 32 bestanden, 0 fehlgeschlagen, 0 übersprungen; darin ist auch die Bash-Syntax aller kopierbaren Blöcke enthalten.
- Statische Migrations- und Outcome-Verträge: 3 bestanden, 0 fehlgeschlagen; 2 geschützte echte PostgreSQL-Tests ohne konfigurierte Opt-in-Datenbank erwartungsgemäß übersprungen.
- `npm run build`: erfolgreich; 41 CSS-Quelldateien verarbeitet, Manifest unverändert.
- Vollständige Suite mit `OPENAI_API_KEY=test-key`: 1.843 bestanden, 0 fehlgeschlagen, 14 geschützte Opt-in-Tests übersprungen; 1.857 Tests insgesamt.
- Externe OpenAI-, GSC-, Cloudinary-, SMTP- oder Produktionsaufrufe wurden nicht ausgeführt.
