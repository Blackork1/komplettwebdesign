# Task 13 – Ops-Fix für Deploy und Rollback

## Ergebnis

Der IONOS-Leitfaden enthält jetzt einen deterministischen, fail-closed Deployablauf und einen vollständigen Code-/Image-Rollback. Die öffentliche App bleibt während Pause, Backup, Git-Update, Build und Migration online und wird erst beim finalen Recreate zusammen mit dem Worker ersetzt.

## TDD-Verlauf

- RED: Nach Erweiterung der Vertragstests bestanden 10 von 15 Tests. Fünf Tests belegten die fehlenden Git-, Rollback-Image-, First-Deploy-, Health-Wait- und Rollback-Verträge.
- GREEN: Alle 15 fokussierten Tests bestehen. YAML-Ausschnitte werden mit dem installierten `yaml`-Parser semantisch ausgewertet; sämtliche kopierbaren Bash-Blöcke werden zusätzlich mit `bash -n` geprüft.

## Deploy-Fixes

- `REPO_DIR` ist fest auf `/apps/komplettwebdesign/server` begrenzt und wird als Git-`safe.directory` registriert.
- Der gültige vorherige Commit wird vor `git fetch --prune origin` und `git reset --hard origin/main` festgehalten.
- Lokale Änderungen im disponiblen `server/`-Checkout werden absichtlich verworfen; manuelle Rootdateien bleiben unberührt.
- Der Datenbankbetrieb wird vor der Jobprüfung auf deaktivierten Review-Modus gesetzt. Unbekannte, inkonsistente oder nicht numerische Zustände brechen ab.
- Beim First Deploy sind nur zwei nachweislich gemeinsam fehlende Content-Agent-Tabellen erlaubt. Ein nicht vorhandener Worker wird nicht gestoppt.
- Vor dem Build wird ein vorhandenes App-Image mit UTC-Zeitstempel und vorherigem Kurzcommit unveränderlich getaggt, inspiziert und zusammen mit dem vollständigen Commit in einer `600`-Metadatendatei festgehalten.
- Ohne vorhandenes Image wird ausdrücklich gemeldet, dass beim First Deploy kein Image-Rollback verfügbar ist.
- Nach dem gemeinsamen Recreate wartet eine auf 120 Sekunden begrenzte Prüfung auf `app: running` und `content-worker: healthy`, bevor der explizite Worker-Healthcheck und die Logs folgen.

## Rollback-Fixes

- Das Rollback erwartet genau eine Metadatendatei aus dem geschützten Rollback-Verzeichnis.
- Vor `source` werden reguläre Datei, Symlinkfreiheit, kanonischer Pfad, Eigentümer, Modus `600`, zwei Zeilen und die beiden erlaubten Zuweisungsformate geprüft.
- Commit und Image werden nach `source` erneut validiert und das Image vor jeder Zustandsänderung inspiziert.
- Der Agent wird in PostgreSQL deaktiviert und auf Review gesetzt; laufende Jobs sowie der Zustand nach kontrolliertem Worker-Stopp werden fail-closed geprüft.
- Git wird auf den gespeicherten Commit gesetzt und das gespeicherte alte Image auf `komplettwebdesign-app:local` zurückgetaggt. Es erfolgt ausdrücklich kein Rebuild.
- Ein gegebenenfalls deaktiviertes technisches Hardgate wird wieder aktiviert. App und Worker werden immer gemeinsam neu erzeugt und begrenzt auf Betriebsbereitschaft geprüft.
- Die Datenbank bleibt forward-only; ein Restore oder destruktiver Schemrollback ist kein normaler Rollback.

## Verifikation

- `node --test tests/contentAgentDeploymentGuide.test.js`: 15 bestanden, 0 fehlgeschlagen.
- `npm run build`: erfolgreich; 41 CSS-Quelldateien, Manifest unverändert.
- `OPENAI_API_KEY=test-key npm test`: 913 bestanden, 0 fehlgeschlagen, 1 vorhandener PostgreSQL-Opt-in-Test übersprungen.
- `git diff --check`: ohne Befund.

## Bewusste Grenze

Die Shellabläufe wurden statisch, syntaktisch und über ihre Reihenfolgen geprüft, aber nicht gegen einen echten VPS, Docker-Daemon oder eine Produktionsdatenbank ausgeführt. Der vorhandene destruktive PostgreSQL-Test bleibt ohne ausdrücklich freigegebene Testdatenbank übersprungen.
