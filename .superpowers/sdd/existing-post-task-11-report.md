# Task 11 – Einzelne KI-Änderungen sicher zurücknehmen

## Ergebnis

Einzelne serverseitig erzeugte KI-Änderungen können in einer aktuellen Draft-Revision sicher zurückgenommen werden. Die Rücknahme prüft Post, Revision, Audit-/Job-Bindung, Livehash, Revisionsversion, Change-ID und aktuellen Fingerprint innerhalb einer Transaktion. Erst nach der erneuten vollständigen Snapshot- und Umfangsprüfung werden Revision, Feedback und Lernbeobachtung gemeinsam gespeichert.

Optimierungsrevisionen können bestätigt vollständig abgelehnt werden. Manuelle Nachbearbeitungen verwenden für Optimierungsrevisionen ebenfalls den gesperrten atomaren Pfad und kennzeichnen betroffene KI-Änderungen als `manual_edit`. Übernahme-Feedback läuft vor dem Commit der bestehenden Freigabetransaktion; ein Fehler rollt damit auch Liveartikel, Revision und Audit zurück.

## TDD-Verlauf

- RED: Zunächst fehlten die Service-Methoden für Rücknahme und Ablehnung; der erweiterte Lauf zeigte anschließend die erwarteten Lücken in Repository, Lerntransaktion, Controller, Routen, Präsentation und View.
- GREEN: Die fokussierten Service-, Repository-, Lern-, Controller-, Routen- und Viewverträge bestanden vollständig.
- Sicherheits-Selbstreview: Die Freigabe wurde zusätzlich serverseitig und in der Präsentation fail-closed gegen Review-Risiken, blockierende Befunde und fehlgeschlagene Revalidierung gehärtet.
- `git diff --check`: ohne Befund.

## Transaktions- und Sicherheitsverträge

- Rücknahme und manuelle Nachbearbeitung sperren in kanonischer Reihenfolge die Post-Tabelle, den veröffentlichten Post, die Revision und den exakt gebundenen Auditdatensatz.
- Revisions-ID, Version und Change-ID werden kanonisch und begrenzt geprüft; Change-IDs akzeptieren ausschließlich exakt 64 kleingeschriebene Hexadezimalzeichen.
- Browserwerte für Feedbackkategorie oder Feedbackdetails werden ignoriert. Kategorie, Ereignisdetails und Lernbeobachtung werden ausschließlich aus dem gesperrten, serverseitigen Diff abgeleitet.
- Feedbackdetails besitzen eine feste Allowlist und enthalten keine Rohinhalte, Prompts oder Providerantworten.
- Lernbeobachtungen verwenden denselben Transaktionsclient. Fehler führen zum Rollback der Revisionsänderung; Lernregeln werden niemals direkt aktiviert.
- Übernahme-Feedback wird an eine freigegebene Optimierungsrevision gebunden. Die begrenzte Zusammenfassung wird in ein vorhandenes Outcome fortgeführt; eine anschließend angelegte Outcome-Basis übernimmt das bereits gespeicherte Übernahme-Feedback.
- Ablehnungen erhöhen die Revisionsversion, lassen den Audit ungelöst und verhindern durch den Revisionsstatus eine spätere Übernahme.
- Alle neuen Schreibwege erfordern Adminsession und CSRF-Schutz. Die Vergleichsansicht rendert nur allowlistete Präsentationsdaten und erzeugt kein unsicheres clientseitiges HTML.

## PostgreSQL-Race

Der geschützte echte PostgreSQL-Test lief gegen die lokal vorhandene, exakt freigegebene Datenbank `kwd_content_agent_integration_test`:

- Eine manipulierte Audit-/Job-Bindung wird ohne Versions- oder Feedbackänderung abgewiesen.
- Zwei identische Rücknahmen mit derselben erwarteten Version erzeugen genau einen Erfolg und einen fachlichen Konflikt.
- Der persistierte Stand besitzt danach Version 4, genau ein Feedbackereignis, den Originalwert und den Status `reverted`.
- Die anschließende Ablehnung erzeugt Version 5 und genau ein zusätzliches Feedbackereignis.
- Vollständiger PG-Lauf: 11 bestanden, 0 fehlgeschlagen, 0 übersprungen.
- Nach dem Lauf verblieben 0 temporäre `kwd_ca_it_*`-Schemas.

Der erste echte Lauf deckte ausschließlich eine unvollständige Miniatur des isolierten Testschemas auf: Die produktiv vorhandenen vertrauenswürdigen Linktabellen fehlten dort. Das Testschema wurde um diese drei leeren Basistabellen ergänzt; danach bestanden der einzelne Race-Test und der vollständige PostgreSQL-Lauf.

## Verifikation

- Fokussierte Task-11-Verträge: 176 bestanden, 0 fehlgeschlagen.
- `npm run build`: erfolgreich; 41 CSS-Quelldateien verarbeitet, Manifest unverändert.
- `OPENAI_API_KEY=test-key npm test`: 1736 bestanden, 0 fehlgeschlagen, 11 geschützte PostgreSQL-Opt-in-Tests im normalen Lauf übersprungen.
- Separater echter PostgreSQL-Lauf: 11 bestanden, 0 fehlgeschlagen, 0 übersprungen.
- Externe OpenAI-, Cloudinary-, SMTP- oder Produktionsaufrufe wurden nicht ausgeführt.

## Bewusste Grenzen

Die Lernpfade erzeugen ausschließlich Beobachtungen und gegebenenfalls bestehende, administrativ zu prüfende Regelvorschläge. Keine Rücknahme, Nachbearbeitung, Übernahme oder Ablehnung aktiviert unmittelbar eine globale Lernregel.
