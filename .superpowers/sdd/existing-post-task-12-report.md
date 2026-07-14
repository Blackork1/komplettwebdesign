# Task 12 – GSC-Basis, Nachmessung und Ergebnisanzeige

## Ergebnis

Bei der bestätigten Übernahme einer Optimierungsrevision wird nun in derselben Datenbanktransaktion eine unveränderliche GSC-Basis angelegt. Sie verwendet höchstens die neuesten 28 vollständig lokal synchronisierten Kalendertage, deren Ende nicht nach dem lokalen Übernahmedatum liegt. Fehlt ein vollständiges Fenster oder besitzt es keine Metrikzeilen, wird dies explizit mit `hasData: false` gespeichert und die Übernahme bleibt möglich.

Der neue lokale Job `evaluate_revision_outcomes` misst den exakten 28-Tage-Folgezeitraum ab dem ersten vollständigen lokalen Kalendertag nach der Übernahme. Er verarbeitet pro Lauf atomar höchstens 50 fällige Datensätze, verwendet parallele PostgreSQL-Claims mit `SKIP LOCKED` sowie Claim-Token und Revisionsversion als CAS und wertet nur eine vollständige lokale Tagesabdeckung aus. Der Job führt keinen GSC- oder sonstigen Provideraufruf aus und verändert weder Liveartikel noch Revision.

Nach erfolgreicher bestehender GSC-Synchronisierung werden die unveränderte Chancenanalyse und anschließend die Outcome-Auswertung mit dem Idempotenzschlüssel `revision-outcomes:<endDate>` sowie dem exakten Payload `{ endDate }` eingereiht. Erfolgreich synchronisierte Tage werden auch dann lokal belegt, wenn Google keine Ergebniszeilen geliefert hat.

## Metrik- und Aussagevertrag

- Klicks und Impressionen werden über den vollständigen Zeitraum summiert.
- Die CTR wird ausschließlich aus den Summen berechnet.
- Die durchschnittliche Position ist impressionsgewichtet.
- Basis und Folgezeitraum enthalten höchstens zehn normalisierte wichtige Suchanfragen; neue und verlorene Listen sind deterministisch auf jeweils fünf Einträge begrenzt.
- Steuerzeichen, zusätzliche Rohfelder, Providerdaten und nicht endliche Werte werden vor der Speicherung verworfen beziehungsweise abgewiesen.
- Bei weniger als 50 kombinierten Impressionen oder einer explizit fehlenden Basis beziehungsweise Folgegrundlage lautet der Zustand `insufficient_data` mit „Noch nicht belastbar“.
- Alle anderen Ergebnisse heißen ausschließlich „Neutrale Beobachtung“. Die Oberfläche nennt Saison, Nachfrage und Google-Änderungen als mögliche Einflüsse, behauptet keine Kausalität und bietet keinen automatischen Rückbau an.

## Transaktions-, Parallelitäts- und Sicherheitsgrenzen

- Basisanlage und bestehendes Übernahmefeedback laufen auf demselben Freigabetransaktionsclient. `ON CONFLICT DO NOTHING` bewahrt eine bereits gespeicherte Basis unverändert.
- Die Auswahl fälliger Outcomes und ihr Wechsel auf `ready` erfolgen in einer kurzen Transaktion mit `FOR UPDATE … SKIP LOCKED`. Veraltete Claims können nach 30 Minuten erneut übernommen werden.
- Abschluss und Claimfreigabe sind an Revisions-ID, aktuelle Revisionsversion und Claim-Token gebunden. Der Abschluss verändert das Feedback-JSON aus Task 11 nicht.
- Ein Auswertungsfehler setzt nur den Outcome-Status auf `failed`; Artikel- und Revisionsdaten bleiben unverändert.
- Baseline- und Follow-up-JSON besitzen exakte Feld- und Größen-Allowlisten. Querytexte sind auf 160 Zeichen, Querylisten auf zehn beziehungsweise fünf Einträge begrenzt.
- Die Bestandsliste projiziert nur die benötigten skalaren Kennzahlen, Differenzen und begrenzten Querylisten. Das Viewmodell normalisiert sie erneut, EJS escaped dynamische Werte und es gibt keinen `innerHTML`-Pfad.
- Die bestehenden Freigabe-, Feedback-, Revalidierungs- und Cleanup-Fences aus Task 11 wurden nicht aufgeweicht.

## Kalendertage und PostgreSQL-Randfall

Alle Folgefenster werden mit Luxon als lokale Kalendertage in `Europe/Berlin` gebildet; es gibt keine 24-Stunden-Millisekundenarithmetik. Tests decken sowohl die März- als auch die Oktober-Zeitumstellung ab.

Der erste echte PostgreSQL-Lauf deckte einen Treiberrandfall auf: Ein PostgreSQL-`DATE` wurde als lokale JavaScript-`Date`-Instanz geliefert und durch eine UTC-ISO-Konvertierung um einen Tag verschoben. Die Repository-Grenzen übertragen Outcome-Kalendertage nun explizit als `YYYY-MM-DD`; ein gezielter Regressionstest und der erneute echte Lauf sind grün.

## TDD-Verlauf

- RED: Das im Brief verlangte Outcome-Modul fehlte zunächst vollständig.
- GREEN: Zeitfenster, DST-Verhalten, Metrikvergleich, unveränderliche Basis, fehlende Daten, vollständige lokale Abdeckung und Claim-CAS wurden schrittweise implementiert.
- RED/GREEN-Selbstreview: Eine explizit fehlende Basis mit vielen späteren Impressionen wurde zunächst fälschlich als beobachtbar eingestuft. Der neue Regressionstest verlangt weiterhin `insufficient_data`; die Implementierung berücksichtigt nun neben der 50-Impressionen-Schwelle auch `hasData` beider Zeiträume.
- Echter PostgreSQL-RED/GREEN-Fund: Der oben beschriebene `DATE`-Versatz wurde im echten Transaktionstest entdeckt und durch reine Kalenderdatumsgrenzen behoben.
- `git diff --check`: ohne Befund.

## Echte PostgreSQL-Integration

Der geschützte Test lief gegen die dedizierte lokale Datenbank `kwd_content_agent_integration_test` in einem zufälligen, anschließend gelöschten Schema:

- vollständige lokale Tagesabdeckung und korrekte Summen beziehungsweise gewichtete Position,
- Basisanlage in einer expliziten Transaktion und unveränderliche Wiederholung,
- zwei parallele Evaluatoren mit insgesamt genau einem Claim und einer Auswertung,
- idempotente Wiederholung ohne erneuten Claim,
- Claim-Token- und Revisionsversions-CAS,
- fehlende Basis als `hasData: false` ohne Übernahmeblockade,
- fehlgeschlagene Auswertung ohne Artikel- oder Revisionsmutation.

Ergebnis: 1 bestanden, 0 fehlgeschlagen, 0 übersprungen.

## Verifikation

- Gebündelte Outcome-, Revision-, Worker-, GSC-, Repository-, Admin-, View-, Migrations- und Jobrepository-Suiten: 350 bestanden, 0 fehlgeschlagen, 0 übersprungen.
- `npm run build`: erfolgreich; 41 CSS-Quelldateien verarbeitet, Manifest unverändert.
- `OPENAI_API_KEY=test-key npm test`: 1.840 bestanden, 0 fehlgeschlagen, 13 geschützte Opt-in-Tests übersprungen; 1.853 Tests insgesamt.
- Separater echter PostgreSQL-Lauf: 1 bestanden, 0 fehlgeschlagen, 0 übersprungen.
- Externe GSC-, OpenAI-, Cloudinary-, SMTP- oder Produktionsaufrufe wurden nicht ausgeführt.

## Bewusste Grenzen

Die Nachmessung ist eine lokale deskriptive Beobachtung. Sie führt weder eine Kausalitätsanalyse noch eine automatische Rücknahme oder Lernregelaktivierung aus. Fehlende lokale Tagesabdeckung bleibt wartend und wird nach einer späteren erfolgreichen Synchronisierung erneut geprüft.
