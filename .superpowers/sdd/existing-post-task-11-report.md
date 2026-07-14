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

## Nachtrag: formaler Review-Fix für die Revalidierung

### Architektur und Freigabevertrag

Rücknahmen und manuelle Bearbeitungen markieren den neuen Revisionsstand nicht mehr lokal als bestanden. Stattdessen speichern sie in derselben Transaktion den kanonischen SHA-256-Fingerprint, die neue Revisionsversion und `revalidation.status = 'pending'` und reihen genau einen idempotenten Job des Typs `revalidate_existing_post_revision` ein. Der Job-Payload enthält ausschließlich Quelle, Revisions-ID, Version und Fingerprint; IDs sind auf PostgreSQL-`INT32` begrenzt.

Der Worker lädt den aktuellen Revisionsstand, den veröffentlichten Beitrag, das exakt über Audit-ID, Post-ID, Ursprungjob und Status gebundene Audit sowie den Runtime-Snapshot des Ursprungslaufs. Aktuelle Einstellungen werden nicht als Ersatz verwendet. Technische Prüfung und Umfangsprüfung laufen vor einem Provideraufruf. Anschließend verwendet die Revalidierung die vorhandene bezahlte, fortsetzbare Textstage `revision_editorial_review`; ihr Versionsfence enthält Revisions-ID, Version und Fingerprint. Es gibt keine automatische Reparaturstage.

Eine einzige Freigabepolicy steuert Service und Vergleichsdarstellung. Freigabefähig ist nur ein aktueller Draft mit einem an dieselbe Version und denselben Snapshot gebundenen `passed`-Review. Das Review muss ohne manuelle Prüfpflicht, Risikoflags, blockierende Hinweise oder ungelöste Auditcodes bestehen und mindestens `max(80, originalScore)` erreichen. Alte `report.review`-Daten oder ein lokaler technischer Erfolg können die Freigabe nicht aktivieren. Der Editor einer Optimierungsrevision enthält deshalb keine direkte Veröffentlichungsaktion mehr, sondern verweist auf den schreibgeschützten Vergleich. Die vollständige Ablehnung erfordert dort eine sichtbare, erforderliche Bestätigung.

### Race-, Audit- und Datenschutzgrenzen

- `completeRevisionRevalidation` und `failRevisionRevalidation` schreiben ausschließlich auf einen weiterhin aktuellen `pending`-Fence. Ein neuerer Versions- oder Fingerprint-Stand wird nicht überschrieben.
- Vor jeder Persistenz und vor dem Run-Abschluss wird die Lease erneut geprüft. Persistierte Paid-Stage-Ergebnisse werden bei einer Fortsetzung wiederverwendet; der Provider wird nicht doppelt aufgerufen und das Budget nicht doppelt belastet.
- Budget-, Provider-, Qualitäts-, Kontext- und technische Fehler enden fail-closed mit festen Fehlercodes und erfordern eine manuelle Entscheidung.
- Freigabe und Auditauflösung verwenden dieselben exakten Auditprädikate. Eine Ablehnung löst den Audit weiterhin nicht auf.
- Die Revalidierungsbindung bewahrt alle tatsächlichen gesperrten Auditcodes, auch wenn ein Code noch nicht in der Lerntaxonomie bekannt ist.
- Feedbackkategorien entstehen nur aus einer festen Zuordnung tatsächlicher Codes des gesperrten Audits. Details und Lernbeobachtungen enthalten ausschließlich feste Event-, Feld- und Taxonomietexte; KI-Gründe, Inhaltsauszüge, Prompts, Providerdaten und PII werden nicht gespeichert.
- HTML- und FAQ-Zuordnungen müssen eindeutig über Feld, Fingerprint und strukturelle Identität sein. Mehrdeutige oder nicht zuordenbare manuelle Änderungen werden als `unclassified` gespeichert und erzeugen keine Lernbeobachtung.

### Ergänzter TDD-Verlauf

- RED: Policy- und Fingerprinttests scheiterten zunächst an den fehlenden Modulen. Mutationstests zeigten die bisherige lokale `passed`-Markierung und den fehlenden Revalidierungsjob. Worker- und Repositorytests scheiterten am unbekannten Jobtyp, fehlenden Runtime-Snapshot-Fence sowie fehlenden Abschlussmethoden.
- GREEN: Die neuen Policy-, Resume-, Budget-, Lease-, Quellen-, Versions- und Fingerprintfälle sowie die erweiterten Repository-, Service-, View- und Workerfälle bestanden.
- Zusätzlicher RED/GREEN-Randfall aus dem finalen Selbstreview: Ein Test mit einem zukünftig unbekannten Auditcode deckte auf, dass der Abschlussvergleich versehentlich die Lern-Taxonomie-Allowlist wiederverwendete. Die Revalidierungs-Auditbindung besitzt nun eine getrennte, vollständige Codeliste; der Regressionstest ist grün.
- Der echte PostgreSQL-Lauf prüft zusätzlich den atomaren `pending`-Stand, genau einen Job mit exaktem Payload, die Übernahme des Ursprungslauf-Snapshots, einen verlorenen Fingerprint-Fence und die fenced Fehlerpersistenz.

### Abschließende Verifikation

- Fokussierte Review-Fix-Suiten: 242 bestanden, 0 fehlgeschlagen.
- `tests/contentAgentWorker.test.js`: 88 bestanden, 0 fehlgeschlagen.
- Echter PostgreSQL-Lauf mit explizit freigegebener lokaler Testdatenbank: 11 bestanden, 0 fehlgeschlagen, 0 übersprungen.
- `npm run build`: erfolgreich; 41 CSS-Quelldateien verarbeitet, Manifest unverändert.
- Vollständige Suite mit lokalem, nicht verwendeten Dummywert `OPENAI_API_KEY=test-key`: 1.748 bestanden, 0 fehlgeschlagen, 11 geschützte PostgreSQL-Opt-in-Tests übersprungen.
- `git diff --check`: ohne Befund.
- Externe OpenAI-, Cloudinary-, SMTP- oder Produktionsaufrufe wurden nicht ausgeführt.

## Zweiter Nachtrag: vollständige Härtung der Bestandsrevalidierung

### Audit- und Score-Policy

Die lokale Bestandsprüfung weist jedem bekannten Befundcode serverseitig eine feste Severity und Blocking-Eigenschaft zu; angelieferte Werte können diese Policy nicht überschreiben. Unbekannte neue Codes werden fail-closed als blockierend behandelt. Das Re-Audit verlangt das Verschwinden jedes ursprünglich gesperrten Codes und blockiert zusätzlich neu entstandene lokale Blocker. Die Regressionstests unterscheiden fortbestehende Originalbefunde, neue statische Preise, neue veraltete Jahresangaben und neue nichtblockierende Hinweise.

Die Mindestschwelle stammt an jeder Stelle ausschließlich aus dem numerischen ganzzahligen `beforeScore` und beträgt exakt `max(80, beforeScore)`. `afterScore` beeinflusst weder initiale Revisionsbindung noch pending-Zustand, Worker, Repositoryabschluss oder Freigabepolicy. Fehlende, typfalsche oder außerhalb von 0 bis 100 liegende Ausgangsscores werden fail-closed abgewiesen.

### Quellen-, Fence- und Recovery-Vertrag

- Rücknahme und manuelle Bearbeitung validieren externe Links ausschließlich gegen höchstens sechs normalisierte HTTPS-Quellen aus dem gesperrten `optimization_report_json` sowie gegen den validierten Trusted Context des Ursprungslaufs. Browserquellen werden ignoriert. Eine gebundene Fachquelle erreicht den atomaren `pending`-Stand; ein unbekanntes externes Ziel rollt vor Revisions-, Feedback- und Joberzeugung zurück.
- Frühe terminale Workerpfade für ungültige Payloads, fehlenden Ursprungssnapshot, ungültigen persistierten Runtime-Snapshot und korruptes Regelmanifest markieren zuerst den extrahierbaren Revisionsfence. Ein verlorener Fence überschreibt keinen neueren Stand. Vorübergehende Kontextladefehler bleiben retrybar und erzeugen keinen falschen terminalen Revisionszustand.
- Die Fehlerpersistenz besitzt eine eigene minimale Fence-Sperre. Sie benötigt bewusst keinen möglicherweise bereits defekten Audit- oder Ursprungskontext, bleibt aber an Draftstatus, Revisionsversion, Snapshot-Fingerprint und `pending` gebunden.
- `loadRevisionRevalidationContext` kann für exakt denselben Fence `pending`, `passed` und `failed` laden. Ein Retry nach fachlichem Commit und anschließendem Lease- oder Runabschlussfehler übernimmt den persistierten Zustand. Bei `passed` wird nur noch der Run abgeschlossen; bei `failed` wird nur noch der manuelle Runzustand abgeglichen. Provider, Budgetreservierung, Stagepersistenz und fachlicher Revisionscommit werden nicht wiederholt.
- Fehlercodes stammen aus einer gemeinsamen festen Allowlist für Worker, Runner und Repository. Der Vergleich zeigt den zentral berechneten, escaped Sperrgrund und beschreibt die Freigabe korrekt als Aktion im Vergleich.

### Ergänzter RED/GREEN-Verlauf und Verifikation

- RED/GREEN: Neue Tests deckten die lokale Blocking-Policy, die reine `beforeScore`-Schwelle, gebundene gegenüber unbekannten Quellen, alle frühen Worker-Terminalisierungen sowie Recovery nach Leaseverlust, `finishRun = null`, geworfenem Abschlussfehler und bereits gespeichertem `failed` ab.
- Zusätzlicher RED/GREEN-Selbstreview: Ein defekter Audit-/Ursprungskontext verhinderte zunächst seine eigene fenced Fehlerpersistenz. Eine getrennte minimale Fence-Sperre löst diesen Widerspruch; ein weiterer Test verhindert, dass vorübergehende Kontextfehler fälschlich terminalisiert werden.
- Fokussierte Suiten: 212 bestanden, 0 fehlgeschlagen, 0 übersprungen.
- Echter PostgreSQL-Lauf mit explizit freigegebener lokaler Testdatenbank: 11 bestanden, 0 fehlgeschlagen, 0 übersprungen.
- Vollständige Suite mit lokalem, nicht verwendetem Dummywert `OPENAI_API_KEY=test-key`: 1.765 bestanden, 0 fehlgeschlagen, 11 geschützte PostgreSQL-Opt-in-Tests übersprungen.
- `npm run build`: erfolgreich; 41 CSS-Quelldateien verarbeitet, Manifest unverändert.
- Externe OpenAI-, Cloudinary-, SMTP- oder Produktionsaufrufe wurden nicht ausgeführt.
