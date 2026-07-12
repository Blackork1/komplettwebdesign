# Task 11 Review-Fix – Policy-, Event- und Stage-Konsistenz

## Ergebnis

Alle drei Important- und beide Minor-Befunde aus dem Task-11-Review sind behoben. Die Auto-Publish-Policy prüft nun den tatsächlich persistierten Inhalt, die Publikation bindet Post, Run, Snapshot und unveränderliches Event strikt zusammen, und eine nicht bestätigte Stage-Persistenz kann keinen erfolgreichen Pipelineabschluss mehr erzeugen.

## Policy-Härtung

- `evaluateAutoPublish()` verlangt `post.content` als nicht leeren, begrenzten String.
- `validation.sanitizedHtml` muss exakt mit `post.content` übereinstimmen. Fehlender oder abweichender Inhalt blockiert mit `validation_failed`.
- Die fokussierte `sourceCount` muss immer exakt der Zahl validierter Quellen entsprechen, auch wenn beide erwartungsgemäß null sind.
- Tests decken fehlenden, leeren und tatsächlich abweichenden Inhalt sowie `sourceCount=1` bei leerer Quellenliste ab.

## Run-, Snapshot- und Eventidentität

- Direkt nach dem Post-Lock muss `generation_run_id` exakt zum normalisierten Aufruf-Run gehören. Ein fremder Run endet vor Eventinsert und Postupdate mit `CONTENT_AUTO_RUN_CONFLICT`.
- Ein vorhandenes Auto-Event muss zu Post-ID, Run-ID, `auto-v1`, Entscheidung, Reason-Liste, Qualitätsscore und begrenztem Snapshot-Kontext passen.
- Der Snapshot-Kontext umfasst Aktionskennung, Settings-Version, Jobquelle und erzwungenen Reviewmodus.
- Die Policy wird beim Retry erneut gegen den gesperrten Post geprüft. `allowed` ist nur mit einem exakt veröffentlichten Post und leerer Reason-Liste konsistent; `blocked` nur mit einem unveröffentlichten Review-Draft und exakt passender Blockierentscheidung.
- Fremde, unvollständige oder widersprüchliche Events werden mit `CONTENT_AUTO_EVENT_CONFLICT` fail-closed abgewiesen und niemals an den Post angehängt.
- Auch ein Event, das erst über den Unique-Konflikt wieder eingelesen wird, muss den vollständigen erwarteten Vertrag erfüllen.

## Stage-Persistenz und Commit-Recovery

- Der Pipeline-Wrapper akzeptiert `updateRunStage()` nur noch mit einem nicht leeren Persistenzergebnis.
- `null` oder ein fehlendes Ergebnis erzeugt den retrybaren technischen Fehler `CONTENT_STAGE_PERSISTENCE_FAILED`.
- Ein fehlgeschlagener Write von `auto_publish:auto-v1` erzeugt weder `completed` noch einen erfolgreichen Runabschluss, auch wenn Event und Post bereits atomar committed wurden.
- Der nächste Versuch reconciled dasselbe Event und den bereits veröffentlichten Post, persistiert die fehlende Stage und ruft keine Provider erneut auf.
- Ein `null`-Ergebnis für die `completed`-Stage bleibt ebenfalls ein technischer Fehler und kann keinen erfolgreichen Runabschluss auslösen.
- Betroffene ältere Testdoubles wurden auf den verbindlichen nicht-null-Persistenzvertrag aktualisiert.

## Guarded PostgreSQL-Integration

- Der vorhandene destruktive Opt-in-Test bleibt unverändert durch URL, Resetfreigabe und expliziten Datenbankmarker geschützt.
- Er prüft jetzt einen echten `allowed`-Insert mit anschließendem idempotentem Retry.
- Ein konkurrierender `blocked`-Insert für denselben Run und dieselbe Policy wird durch den partiellen Unique-Index abgewiesen.
- Nach Retry und Gegenentscheidung existiert exakt ein Auto-Event; der Post bleibt veröffentlicht und der manuelle Freigabezähler unverändert.
- Ohne ausdrücklich konfigurierte sichere Reset-Testdatenbank bleibt dieser Test übersprungen.

## TDD und Verifikation

- RED: Inhaltsabweichung, fehlender Inhalt und falscher Zero-SourceCount wurden zunächst von der Policy zugelassen.
- RED: Fremde Generation-Runs und widersprüchliche vorhandene Events wurden zunächst akzeptiert.
- RED: `null` bei Auto- und Completed-Stage wurde zunächst als erfolgreicher Write behandelt.
- Fokussierter Verbund: 176 bestanden, 0 fehlgeschlagen, 1 sicher gegateter PostgreSQL-Skip.
- Gesamtsuite: 883 bestanden, 0 fehlgeschlagen, 1 sicher gegateter PostgreSQL-Skip.
- Build: erfolgreich; 41 CSS-Quelldateien, Manifest unverändert.
- Providerfreier Dry-Run: erfolgreich mit `externalCalls:0`, gültigem Artikel und Score 90.
- Syntaxprüfungen, `git diff --check` und Geheimnisscan: ohne Befund.

## Hinweis

Es wurden keine externen Provider aufgerufen und keine Live-Daten verändert. Der erweiterte PostgreSQL-Pfad ist lokal mangels ausdrücklich freigegebener Reset-Testdatenbank nicht ausgeführt worden.
