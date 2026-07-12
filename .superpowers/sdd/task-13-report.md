# Task 13 – IONOS-VPS-Deployment-Leitfaden

## Ergebnis

Der Deployment-Leitfaden ist auf den tatsächlichen Betriebsordner `/apps/komplettwebdesign` und die reale Trennung zwischen automatisch aktualisiertem `server/` und manuell verwalteten Rootdateien ausgerichtet. Die bestehende öffentliche App bleibt unverändert über Traefik erreichbar; hinzu kommt ausschließlich ein interner `content-worker`, der dasselbe lokal gebaute Image verwendet.

## TDD-Verlauf

- RED: Nach der Erweiterung des Vertragstests bestanden 7 von 12 Tests; fünf neue Anforderungen an Betriebsstruktur, Deployskript, Konfiguration und Review-first-Rollout fehlten erwartungsgemäß.
- GREEN: Nach der Leitfadenüberarbeitung bestehen alle 12 Vertragstests. Jeder kopierbare Bash-Block wird dabei zusätzlich mit `bash -n` geprüft.

## Dokumentierte Betriebsinvarianten

- Ausschließlich `/apps/komplettwebdesign/server` wird per Git automatisch aktualisiert; `.env`, `docker-compose.yml` und `deploy/deploy.sh` bleiben manuell verwaltet.
- `app`, `webhook`, `pgadmin`, `postgres`, Volumes, WireGuard-Port, Netzwerke und Traefik-Konfiguration bleiben erhalten.
- `app` baut `komplettwebdesign-app:local`; `content-worker` verwendet genau dieses Image ohne eigenen Build.
- Der Worker erhält weder Portfreigaben noch `expose`, Traefik-Labels oder das Proxy-Netzwerk.
- App und Worker warten auf den PostgreSQL-Healthcheck.
- Technische Hardgates stehen in `.env`; Zeitplan, Zeitzone und Betriebsmodus liegen nach der Migration in PostgreSQL.
- Geheimnisse werden ausschließlich namentlich erwähnt. `.env` und Backups erhalten restriktive Dateirechte.
- Modelle und Preise sind Betreiberwerte und müssen vor dem Livebetrieb gegen Vertrag und offizielle OpenAI-Preise verifiziert werden.

## Sicherer Deployablauf

- Das wiederverwendbare `deploy.sh` setzt den Datenbankbetrieb zuerst auf deaktivierten Review-Modus und reaktiviert ihn nach dem Release nicht automatisch.
- Ein laufender Job führt vor dem Worker-Stopp zum Abbruch. Nach dem kontrollierten Stopp erfolgt eine zweite Prüfung, damit auch ein parallel begonnener Claim erkannt wird.
- Vor Image-Build und Migration wird ein geschütztes PostgreSQL-Backup erstellt und mit `pg_restore -l` geprüft.
- Das gemeinsame Image wird einmal über `app` gebaut und anschließend explizit inspiziert.
- Die Produktionsmigration läuft zweimal; der zweite Lauf belegt ihre Idempotenz.
- Erst nach Dry-Run werden App und Worker mit demselben Image neu erzeugt und über Status, Worker-Healthcheck und Logs geprüft.

## Rollout und Rückfall

- Der Agent startet deaktiviert im Review-Modus mit Montag und Donnerstag um 18:00 Uhr in `Europe/Berlin`.
- Die erste Abnahme erfolgt über einen manuellen Entwurf, die geschützte Vorschau und eine bewusste Reviewentscheidung.
- Auto-Publish bleibt bis zu acht manuellen Freigaben, Mindestscore 90 und bewusst geöffnetem technischem Gate gesperrt.
- Ein normaler Rückfall stoppt den Worker kontrolliert; die App bleibt online.
- Code und Image können auf einen geprüften Release zurückgesetzt werden. Die additive Datenbank bleibt forward-only; ein destruktiver Datenbank-Rollback ist ausdrücklich kein normaler Rückfall.

## Verifikation

- `node --test tests/contentAgentDeploymentGuide.test.js`: 12 bestanden, 0 fehlgeschlagen.
- `npm run build`: erfolgreich; 41 CSS-Quelldateien, Manifest unverändert.
- `OPENAI_API_KEY=test-key npm test`: 910 bestanden, 0 fehlgeschlagen, 1 vorhandener PostgreSQL-Opt-in-Test übersprungen.
- `git diff --check`: ohne Befund.

## Bewusste Grenze

Die Anleitung verändert keine produktive VPS-Konfiguration und enthält keine Geheimnisse. Der echte PostgreSQL-Integrationstest bleibt ohne ausdrücklich freigegebene, destruktiv nutzbare Testdatenbank übersprungen; der Leitfaden schreibt deshalb die separate Testdatenbankprüfung vor dem Produktionsschritt weiterhin verbindlich vor.
