# Task 13 – Finaler Ops-Fix für Deploy und Rollback

## Ergebnis

Der dokumentierte VPS-Ablauf entscheidet jetzt fail-closed über Datenbankschema, laufendes Produktionsimage, Worker-Kompatibilität, Prozesssperre, Dry-Run und echte App-Betriebsbereitschaft. Ein alter oder unbekannter Worker wird nach einem Rollback nicht mehr allein aufgrund eines vorhandenen Images gestartet.

## TDD-Verlauf

- RED: Der erweiterte Vertrag hatte 22 Tests, davon 15 bestanden und 7 erwartungsgemäß fehlgeschlagen. Es fehlten Schema-State-Machine, Worker-Contract, App-Endpunktprüfung, gemeinsame Sperre, robuster Dry-Run-Validator und der Guard für einen gestoppten App-Container.
- GREEN: Alle 22 fokussierten Tests bestehen. Neben Regex-Verträgen werden Shell-Funktionen wirklich mit kontrollierten Eingaben ausgeführt.

## Ausführbarer Shell-Harness

- Klassifiziert Dashboard, Legacy 002 und echten First Deploy; partielle oder unbekannte Fakten liefern einen Fehler.
- Führt die beiden getrennten Pause-SQL-Pfade mit einem Docker-/PSQL-Stub aus und belegt, dass kein Pfad nicht vorhandene Spalten referenziert.
- Belegt Contract und Git-Abstammung für einen kompatiblen Worker sowie fail-closed Verhalten bei Legacy-, unbekannten oder unvollständigen Werten.
- Belegt, dass ein inkompatibler Rollback ausschließlich `app`, ein kompatibler dagegen `app content-worker` neu erstellt.
- Belegt den begrenzten Fehlerpfad des echten `/health`-Checks, Lockkonflikte und die Auswertung der letzten JSON-Zeile nach vorgeschalteten Dry-Run-Logs.
- Alle kopierbaren Bash-Blöcke durchlaufen weiterhin `bash -n`; Compose-Ausschnitte werden semantisch mit dem YAML-Parser geprüft.

## Datenbankzustand und Pause

- Eine gemeinsame Introspektionsabfrage verwendet nur `to_regclass` und `information_schema.columns`.
- Dashboard-Schema: `agent_enabled=false`, `operating_mode=review`.
- Legacy-002-Schema: `schedule_enabled=false`, `auto_publish_enabled=false`.
- Nur wenn Einstellungen und Jobtabelle gemeinsam fehlen, gilt der Zustand als First Deploy.
- Partielle oder unbekannte Kombinationen brechen ab.
- Der erkannte Zustand wird geloggt und in den Rollback-Metadaten festgehalten.

## Image- und Worker-Kompatibilität

- Das App-Image erhält OCI-Revision und den expliziten Contract `de.komplettwebdesign.content-worker.contract=dashboard-v1`.
- Der erste bekannte kompatible Workerstand ist `726df921b2285498eeca228588f8ec63945dd5fa`.
- Ein Worker gilt nur bei Dashboard-Contract, belegter Revision/Ref und erfolgreichem `git merge-base --is-ancestor` als kompatibel.
- Rollback-Metadaten speichern Image, exakte Image-ID, Commit, geschützten Ref, Schema-Ausgangszustand, Worker-Contract und Kompatibilitätsentscheidung.
- Beim Rollback wird die Kompatibilität erneut geprüft. Legacy oder unbekannt führt zu App-only, gestopptem Worker, unverändertem Git-Checkout und `CONTENT_AGENT_ENABLED=false`.
- Das Schema bleibt forward-only; ältere Releases gelten nicht pauschal als rückwärtskompatibel.

### Geschützter Ref als verbindlicher Beleg

- Vor jeder positiven Worker-Entscheidung löst der gemeinsame Helper `${ROLLBACK_REF}^{commit}` mit `git rev-parse --verify` auf.
- Das Ergebnis muss exakt 40 hexadezimale Zeichen besitzen und exakt dem gespeicherten `ROLLBACK_COMMIT` entsprechen.
- Ein fehlender, gelöschter oder auf einen anderen Commit verschobener Ref liefert kontrolliert `false`; `set -e` bricht den App-Rollback nicht ab.
- Der ausführbare Harness belegt für fehlenden und abweichenden Ref jeweils die App-only-Entscheidung: Ausschließlich `app` wird neu erstellt und kein Workerbefehl ausgegeben. Der bestehende Vertrag für das exakte Zurücktaggen der gespeicherten Image-ID bleibt zusätzlich grün.
- Die spätere doppelte Ref-Auflösung wurde entfernt. Nur der bereits vollständig geprüfte Workerpfad setzt den Checkout direkt auf den exakten Metadaten-Commit zurück.

## Prozess- und Dateisicherheit

- Deploy und Rollback benötigen Linux-`flock` und verwenden dieselbe nicht blockierende Sperrdatei während des gesamten Ablaufs.
- Ein vorhandener, aber nicht laufender App-Container ist ein Abbruch und kein First Deploy.
- Rollback-Metadaten werden als geschützte temporäre Datei erstellt und mit `mv -nT` atomar ohne Überschreiben veröffentlicht.
- Der exakte Snapshot des laufenden Container-Images, der geschützte Git-Ref und die vorherigen Fail-closed-Prüfungen bleiben erhalten.

## Dry-Run und Healthchecks

- Der vollständige Dry-Run-Output wird in einer geschützten temporären Datei erfasst.
- Ein Node-Validator findet rückwärts die letzte gültige JSON-Zeile und verlangt exakt `externalCalls=0`, `articleValid=true` und `publishMode=draft`.
- Deploy und Rollback prüfen im App-Container `http://localhost:3000/health` und verlangen drei aufeinanderfolgende Erfolge innerhalb des begrenzten Fensters.
- Optional kann mit `KWD_CHECK_EXTERNAL_HEALTH=true` zusätzlich der öffentliche Traefik-Endpunkt geprüft werden.
- Der Worker-Healthcheck läuft nur, wenn der Worker nachweislich kompatibel ist.

## Verifikation

- `node --test tests/contentAgentDeploymentGuide.test.js`: 22 bestanden, 0 fehlgeschlagen.
- `OPENAI_API_KEY=test-key npm test`: 920 bestanden, 0 fehlgeschlagen, 1 vorhandener PostgreSQL-Opt-in-Test übersprungen.
- `npm run build`: erfolgreich; 41 CSS-Quelldateien, Manifest unverändert.
- `git diff --check`: ohne Befund.

## Bewusste Grenze

Die Shellabläufe wurden syntaktisch, semantisch und mit ausführbaren Stubs geprüft, aber nicht gegen den echten IONOS-VPS, Docker-Daemon oder die Produktionsdatenbank ausgeführt. Der destruktive PostgreSQL-Test bleibt ohne ausdrücklich freigegebene Testdatenbank sicher übersprungen.
