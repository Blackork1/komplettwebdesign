# Content-Agent auf dem IONOS-VPS bereitstellen

Diese Anleitung ergänzt das bestehende Compose-Projekt `komplettwebdesign` um genau einen internen `content-worker`. Sie ist **keine vollständige Ersatzdatei** für die vorhandene `docker-compose.yml`.

Die vorhandenen Dienste `app`, `webhook`, `pgadmin` und `postgres` bleiben erhalten. Das gilt auch für alle App-Volumes für Uploads und Downloads, `expose: 3000`, die Netzwerke `default` und `proxy`, sämtliche Traefik-Labels sowie das persistente PostgreSQL-Volume `./data/postgres` und den vorhandenen WireGuard-Port. Die öffentliche Website läuft weiterhin ausschließlich über `app` und dessen Traefik-Anbindung. Der `content-worker` bleibt intern: An ihm werden keine `ports`, kein `expose`, keine Traefik-Labels und kein Proxy-Netzwerk ergänzt. Er hängt nur im Compose-Netzwerk `default` und nutzt ausgehend OpenAI, Cloudinary und den rein lesenden Search-Console-Zugang.

**Hinweis für das Lernregel-Update:** Wenn `app`, `content-worker`, Search Console und SMTP bereits nach dieser Anleitung eingerichtet sind, benötigen die Lernregeln keine neue `.env`-Variable und keine Änderung an `docker-compose.yml`. Für dieses Update genügen ein geprüftes Datenbankbackup, der idempotente Migrationslauf bis Migration 009, der gemeinsame Recreate von `app` und `content-worker` sowie die unten beschriebenen Kontrollen. Lernregeln werden in PostgreSQL verwaltet und erst nach ausdrücklicher Adminfreigabe aktiv.

**Hinweis für das Wochenpool-Update:** Die wöchentliche OpenAI-Webrecherche benötigt keine neue `.env`-Variable und keine Änderung an `docker-compose.yml`. Der vorhandene `OPENAI_API_KEY` wird weiterverwendet. Erforderlich sind ein geprüftes Datenbankbackup, Migration 010 und der gemeinsame Recreate von `app` und `content-worker`. Migration 010 speichert zusätzlich einen dauerhaften Rechercheversuch pro Kalenderwoche, damit ein unklarer oder bereits kostenpflichtiger OpenAI-Aufruf nicht durch einen anderen Lauf doppelt ausgeführt wird. DataForSEO und Google Ads werden nicht angebunden.

**Hinweis für die KI-Bestandsoptimierung:** Dieses Update benötigt keine neue `.env`-Variable und keinen neuen Docker-Dienst. Die bestehende OpenAI-, PostgreSQL- und GSC-Konfiguration wird weiterverwendet. Erforderlich sind ein geprüftes Datenbankbackup, der Migrationslauf einschließlich `011_create_existing_post_optimization.sql` und `012_upgrade_revision_outcome_claims.sql`, die nachfolgende Schema-Prüfung sowie erst danach der gemeinsame Recreate von `app` und `content-worker`. Migration 011 ergänzt die geschützten Optimierungsrevisionen und GSC-Ergebnisse; Migration 012 aktualisiert bereits vorhandene Outcome-Tabellen migrationssicher um die Claim-Spalten und den validierten Claim-Constraint.

**Hinweis für die Artikel-Performance:** Dieses Update benötigt keine neue `.env`-Variable und keine Änderung an `docker-compose.yml`. Erforderlich sind ein geprüftes Datenbankbackup, Migration `013_create_article_performance_learning.sql`, die Schema-Prüfung sowie der gemeinsame Recreate von `app` und `content-worker`. Der bereits vorhandene Search-Console-Zeitplan wird auf den täglichen Lauf um 05:30 Uhr gesetzt.

## 1. Projektpfad und Ausgangslage prüfen

Alle kopierbaren Hostbefehle dieser Anleitung beginnen am bereits geöffneten Prompt `webadmin@ubuntu:~/apps/komplettwebdesign$`. Der feste Host-Betriebsordner ist `~/apps/komplettwebdesign`; ausschließlich `server/` wird per Git automatisch aktualisiert, also `~/apps/komplettwebdesign/server`. Die Dateien `.env`, `docker-compose.yml` und `deploy/deploy.sh` werden manuell gepflegt und vor jeder Änderung gesichert. Sie liegen direkt unter `~/apps/komplettwebdesign` und dürfen nicht durch einen Checkout im Unterordner `server/` überschrieben werden.

Der Webhook-Container verwendet intern ausschließlich den Mountpfad `/apps/komplettwebdesign`. Diese abweichende Zeichenfolge ist kein Hostpfad und darf weder in der Host-`docker-compose.yml` als Projektroot noch in den Host-Deployskripten als `ROOT` verwendet werden.

```bash
pwd
test -f docker-compose.yml
test -f .env
test -f deploy/deploy.sh
test -d ./server
chmod 600 .env
docker compose version
docker compose config --quiet
df -h . /var/lib/docker 2>/dev/null || df -h .
docker system df
```

`docker compose config --quiet` prüft die aktuelle Datei, ohne die aufgelöste Konfiguration und damit möglicherweise Zugangsdaten auszugeben. Vor Backup und Image-Build muss auf dem Dateisystem mit dem Projekt, dem Backup und dem Docker-Datenverzeichnis ausreichend freier Speicher vorhanden sein. Hier nicht vorschnell `docker system prune` ausführen.

## 2. Releaseprüfung des Anwendungsstands

Diese Prüfung läuft im Quellordner mit der `package.json`, laut Compose also in `./server`. Das verwendete `test-key` ist nur ein nicht geheimes Test-Dummy; echte Zugangsdaten gehören weder in die Shell-Historie noch in Logs.

```bash
(cd server && node --test tests/contentAgentDeploymentGuide.test.js)
(cd server && npm run build)
(cd server && OPENAI_API_KEY=test-key npm test)
```

Alle drei Befehle müssen erfolgreich enden, bevor die Serverkonfiguration geändert wird.

## 3. Nur die notwendigen Compose-Blöcke ändern

Vor der Bearbeitung eine Arbeitskopie der Compose-Datei anlegen:

```bash
cp -p docker-compose.yml "docker-compose.yml.before-content-worker-$(date +%Y%m%d-%H%M%S)"
```

Die folgenden Ausschnitte zeigen ausschließlich die Änderungen. Auslassungen sind absichtlich nicht als komplette Compose-Datei dargestellt.

### 3.1 `app.image` ergänzen und den vorhandenen Build explizit benennen

Direkt im vorhandenen `app`-Block `image` ergänzen. Falls `build` derzeit als Kurzform `build: ./server` geschrieben ist, diesen Eintrag in die gezeigte gleichwertige Langform ändern:

```yaml
services:
  app:
    image: komplettwebdesign-app:local
    build:
      context: ./server
      labels:
        org.opencontainers.image.revision: "${APP_REVISION:-unknown}"
        de.komplettwebdesign.content-worker.contract: "dashboard-v1"
```

Alle weiteren vorhandenen `app`-Einträge bleiben direkt darunter unverändert, insbesondere `env_file`, `networks` mit `default` und `proxy`, `expose: 3000`, Upload-/Download-Volumes und Traefik-Labels. Der explizite Image-Name sorgt dafür, dass `app` und `content-worker` exakt dasselbe lokal gebaute Image verwenden. Das OCI-Label wird beim Deployment mit dem tatsächlich gebauten Git-Commit belegt. Ein manuelles Build ohne `APP_REVISION` bleibt absichtlich als `unknown` erkennbar und wird bei einem späteren Rollback nicht fälschlich einem Checkout-Stand zugeordnet.

### 3.2 `app.depends_on` auf den PostgreSQL-Healthstatus umstellen

Den bisherigen PostgreSQL-Eintrag in `app.depends_on` durch diese Mapping-Form ersetzen. Falls `app` noch von weiteren Diensten abhängt, bleiben deren Einträge im selben `depends_on`-Block erhalten.

```yaml
services:
  app:
    depends_on:
      postgres:
        condition: service_healthy
```

### 3.3 `postgres.healthcheck` ergänzen

Diesen Block in den vorhandenen `postgres`-Service einfügen. Das doppelte Dollarzeichen ist beabsichtigt: Compose gibt dadurch `${POSTGRES_USER}` und `${POSTGRES_DB}` erst im Container zur Auswertung frei.

```yaml
services:
  postgres:
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 20s
```

Das vorhandene Image `pgvector/pgvector:pg16`, `./data/postgres`, alle übrigen PostgreSQL-Einstellungen und der WireGuard-Port bleiben unverändert.

### 3.4 Den neuen `content-worker` einfügen

Den folgenden Block auf derselben Einrückungsebene wie `app`, `webhook`, `pgadmin` und `postgres` unter `services:` einfügen:

```yaml
services:
  content-worker:
    image: komplettwebdesign-app:local
    env_file:
      - .env
    restart: unless-stopped
    init: true
    stop_grace_period: 10m
    command: ["npm", "run", "start:content-worker"]
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - default
    healthcheck:
      test: ["CMD", "npm", "run", "content-agent:healthcheck"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 45s
    secrets:
      - source: gsc_credentials
        target: gsc-service-account.json

secrets:
  gsc_credentials:
    file: ./secrets/gsc-service-account.json
```

Der Worker erhält bewusst keine `build`-Anweisung: `docker compose build app` baut und markiert das gemeinsam verwendete Image `komplettwebdesign-app:local`. Ebenso erhält der Worker keine `ports`, keinen `expose`-Block, keine Traefik-Labels, kein `proxy`-Netzwerk und keine zusätzlichen Volumes. Ausschließlich der Worker erhält das read-only genutzte Google-Credential als Docker Secret; `app` benötigt keinen Zugriff auf die JSON-Datei.

`stop_grace_period: 10m` ist absichtlich länger als die interne erste Drain-Wartezeit von 30 Sekunden. Nach `SIGTERM` stoppt der Worker den Scheduler, nimmt keine neuen Jobs an und wartet bei einem bereits aktiven Job weiter auf dessen Abschluss. Zehn Minuten geben diesem kontrollierten Drain ausreichend Spielraum; dauert ein realer Job regelmäßig länger, müssen Compose-Frist und Stopbefehl gemeinsam entsprechend erhöht werden.

### 3.5 Google-Credential außerhalb des Repositorys vorbereiten

Die heruntergeladene Service-Account-Datei wird später als `~/apps/komplettwebdesign/secrets/gsc-service-account.json` abgelegt. Dieser Ordner liegt außerhalb des automatisch aktualisierten `server/`-Repositorys. Der private JSON-Inhalt und insbesondere der private Schlüssel werden niemals in Git, `.env`, Shellausgaben, Logs, Tickets oder Chatnachrichten kopiert. Auch zur Kontrolle wird die Datei nicht mit `cat` ausgegeben.

Die Root-`.env` und Root-`docker-compose.yml` werden nicht aus dem `server/`-Repository bereitgestellt und wurden in der lokalen Vorbereitung absichtlich nicht verändert. Erst nachdem die JSON-Datei auf dem VPS vorliegt, werden beide Rootdateien nach dieser Anleitung manuell angepasst.

Am Prompt `webadmin@ubuntu:~/apps/komplettwebdesign$` zuerst das geschützte Zielverzeichnis vorbereiten:

```bash
cd ~/apps/komplettwebdesign
umask 077
mkdir -p ./secrets
chmod 700 ./secrets
```

Die bereits heruntergeladene JSON-Datei anschließend über einen geschützten Übertragungsweg, beispielsweise SFTP, exakt als `secrets/gsc-service-account.json` hochladen. Danach ausschließlich Existenz, Dateityp und Rechte prüfen, ohne den Inhalt anzuzeigen:

```bash
test -f ./secrets/gsc-service-account.json
test ! -L ./secrets/gsc-service-account.json
chmod 600 ./secrets/gsc-service-account.json
test "$(stat -c '%a' ./secrets)" = "700"
test "$(stat -c '%a' ./secrets/gsc-service-account.json)" = "600"
test -s ./secrets/gsc-service-account.json
```

Das Service-Account-Konto muss in der Google Search Console als eingeschränkter Nutzer für die Property `komplettwebdesign.de` hinzugefügt und bereits berechtigt sein. Eigentümerrechte werden dafür nicht benötigt; uneingeschränkte Nutzerrechte sind ebenfalls nicht erforderlich. Im Backend wird diese Domain-Property exakt als `sc-domain:komplettwebdesign.de` angesprochen. Der verwendete OAuth-Scope ist ausschließlich `https://www.googleapis.com/auth/webmasters.readonly`; die Integration besitzt keine schreibende Search-Console-Berechtigung.

## 4. Content-Agent-Konfiguration in `.env` ergänzen

Die vorhandenen Zugangsdaten für OpenAI, Cloudinary und PostgreSQL bleiben unverändert in der bereits genutzten `.env`; ihre Werte werden hier absichtlich nicht abgedruckt. Vor der Bearbeitung `umask 077` setzen, eine geschützte Sicherung anlegen und die Datei anschließend wieder auf Modus `600` setzen:

```bash
umask 077
cp -p .env ".env.before-content-agent-$(date +%Y%m%d-%H%M%S)"
chmod 600 .env ".env.before-content-agent-"*
```

Nur die folgenden technischen Start- und Sicherheitswerte ergänzen oder entsprechend ändern:

```dotenv
CONTENT_AGENT_ENABLED=true
CONTENT_AGENT_AUTOPUBLISH_ENABLED=false
CONTENT_AGENT_MAX_TOPIC_CANDIDATES=8
CONTENT_AGENT_MAX_REVISIONS=2
CONTENT_AGENT_MAX_ATTEMPTS=5
CONTENT_AGENT_MONTHLY_COST_LIMIT_EUR=100
CONTENT_AGENT_CONTENT_STAGE_RESERVATION_EUR=0.50
CONTENT_AGENT_REVIEW_STAGE_RESERVATION_EUR=0.25
CONTENT_AGENT_WORKER_POLL_MS=5000
CONTENT_AGENT_JOB_LEASE_MINUTES=30
OPENAI_CONTENT_MODEL=gpt-5.4
OPENAI_REVIEW_MODEL=gpt-5.4-mini
OPENAI_IMAGE_MODEL=gpt-image-2
OPENAI_CONTENT_INPUT_COST_PER_MTOK=2.50
OPENAI_CONTENT_OUTPUT_COST_PER_MTOK=15
OPENAI_REVIEW_INPUT_COST_PER_MTOK=0.75
OPENAI_REVIEW_OUTPUT_COST_PER_MTOK=4.50
OPENAI_IMAGE_COST_EUR=0.041
SMTP_HOST=smtp.ionos.de
SMTP_PORT=465
SMTP_USER=<vollständiger-smtp-benutzername>
SMTP_PASS=<separates-sicheres-smtp-passwort>
SMTP_FROM=kontakt@komplettwebdesign.de
SEARCH_CONSOLE_SITE_URL=sc-domain:komplettwebdesign.de
GOOGLE_APPLICATION_CREDENTIALS=/run/secrets/gsc-service-account.json
CONTENT_AGENT_GSC_SCHEDULE=30 5 * * *
```

`SMTP_PASS` ist ein Geheimnis und darf weder in Git eingecheckt noch in Tickets, Logs oder Chatnachrichten kopiert werden. `SMTP_FROM` ist die technische Absenderadresse für Admin-Prüfmails und Blog-Newsletter; sie muss beim SMTP-Konto als Absender zulässig sein. Nach jeder späteren Änderung an den SMTP- oder Search-Console-Werten müssen App und Worker neu erzeugt werden, weil beide Prozesse die `.env` beim Containerstart laden. Beim Erstrollout an dieser Stelle ausdrücklich noch keinen Recreate ausführen: Zuerst die Abschnitte 5 bis 7 mit Image-Build, getrennter Testmigration, geprüftem Produktionsbackup, Produktionsmigration und Dry-Run vollständig abschließen. Der erste gemeinsame Recreate steht danach am Ende von Abschnitt 7.

`CONTENT_AGENT_ENABLED=true` ist nur das technische Prozess-Gate: Es erlaubt dem Worker zu starten, aktiviert aber noch keine Jobübernahme. Die Migration setzt den PostgreSQL-Betriebszustand zunächst auf `agent_enabled=false` und `operating_mode=review`. Die PostgreSQL-Betriebswerte sind danach maßgeblich. Ihre Standardtermine sind Montag und Donnerstag um 18:00 Uhr in `Europe/Berlin`. Die alten Umgebungsvariablen `CONTENT_AGENT_PUBLISH_MODE`, `CONTENT_AGENT_SCHEDULE` und `CONTENT_AGENT_TIMEZONE` sind nur noch veraltete Bootstrap-Fallbacks und werden für diesen Rollout nicht gesetzt.

`CONTENT_AGENT_AUTOPUBLISH_ENABLED=false` ist das zusätzliche technische Auto-Publish-Gate. Selbst eine spätere Dashboard-Einstellung kann dieses Gate nicht übersteuern. Modelle, Kostensätze und Budgetwerte sind vom Betreiber gesetzte Konfigurationswerte, keine Aussage über derzeit gültige OpenAI-Preise. Vor dem Livebetrieb müssen Modellzugriff und Kostensätze mit dem eigenen OpenAI-Vertrag und der aktuellen offiziellen OpenAI-Preisseite abgeglichen und geprüft werden. Zusätzlich ist im OpenAI-Projekt ein providerseitiges Projektbudget als äußere Kostengrenze zu setzen; dabei auch prüfen, ob der Anbieter es als harte Grenze oder als Warnschwelle umsetzt. Die interne Monatsgrenze ersetzt diese providerseitige Grenze nicht.

In `.env` bleiben außerdem nur die Namen der bereits vorhandenen Geheimnisse relevant: `OPENAI_API_KEY`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `SMTP_PASS`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` und `SESSION_SECRET`. Ihre Werte werden weder in diese Anleitung noch in Tickets, Git, Shell-Ausgaben oder Chatnachrichten kopiert.

Die Search-Console-Integration ist jetzt vorbereitet. `CONTENT_AGENT_GSC_SCHEDULE=30 5 * * *` plant den getrennten, täglichen Abruf um 05:30 Uhr in der im Dashboard hinterlegten IANA-Zeitzone. Nach dem GSC-Import wertet derselbe kontrollierte Lauf die 7-, 14- und 28-Tage-Performance veröffentlichter Artikel aus. Er ändert oder veröffentlicht keine Artikel.

## 5. Konfiguration validieren und Image bauen

Zuerst die bearbeitete Compose-Datei erneut prüfen. Die Befehle danach bauen nur `app`; der Worker verwendet dasselbe explizit benannte App-Image.

```bash
docker compose config --quiet
docker compose build app
docker image inspect komplettwebdesign-app:local >/dev/null
```

## 6. Migration und echten E2E-Test in einer separaten Testdatenbank ausführen

Vor jeder Produktionsmigration wird die echte Migration mit dem gebauten App-Image zweimal gegen eine vollständig getrennte Testdatenbank ausgeführt. Danach läuft der echte PostgreSQL-E2E-Test im selben temporären Container und im selben Docker-Netzwerk. Container und Netzwerk bleiben bis nach diesem Test bestehen. Der folgende Block exportiert dafür ausschließlich das aktuelle Produktionsschema ohne Daten, Rollen oder Rechte. Damit enthält die Testdatenbank auch die für die Migration notwendigen Basistabellen `users` und `posts`, ohne Produktionsinhalte zu kopieren. Dieser Lesezugriff verändert die Produktionsdatenbank nicht. Danach stellt er das Schema in einem temporären, nicht veröffentlichten `pgvector/pgvector:pg16`-Container auf einem eigenen Docker-Netzwerk wieder her.

Das temporäre Kennwort wird erst zur Laufzeit erzeugt, nie ausgegeben und nicht in die Shell-Historie geschrieben. Die Produktions-`.env` wird weder geladen noch verändert. Die umschließende Subshell begrenzt Variablen und Traps auf diesen Ablauf. `set -Eeuo pipefail` beendet sie bei jedem nicht behandelten Fehler. Der `EXIT`-Trap entfernt Container, Netzwerk und Schemadatei, sichert aber zuerst den ursprünglichen Exitcode und gibt ihn nach dem Cleanup zurück. Dadurch kann die Aufräumroutine einen fehlgeschlagenen Schemaexport, Restore oder Migrationslauf nicht als Erfolg maskieren.

```bash
(
  set -Eeuo pipefail
  umask 077

  TEST_DB_CONTAINER=""
  TEST_DB_NETWORK=""
  TEST_DB_PASSWORD=""
  TEST_SCHEMA_FILE=""

  cleanup() {
    local command_status=$?
    local cleanup_status=0

    if [[ -n "${TEST_DB_CONTAINER:-}" ]]; then
      docker rm -f "$TEST_DB_CONTAINER" >/dev/null 2>&1 || cleanup_status=$?
    fi
    if [[ -n "${TEST_DB_NETWORK:-}" ]]; then
      docker network rm "$TEST_DB_NETWORK" >/dev/null 2>&1 || cleanup_status=$?
    fi
    if [[ -n "${TEST_SCHEMA_FILE:-}" ]]; then
      rm -f "$TEST_SCHEMA_FILE" || cleanup_status=$?
    fi
    TEST_DB_PASSWORD=""

    if (( command_status != 0 )); then
      return "$command_status"
    fi
    return "$cleanup_status"
  }
  trap cleanup EXIT
  trap 'exit 130' INT
  trap 'exit 143' TERM

  TEST_DB_SUFFIX="$(date +%Y%m%d%H%M%S)-$$"
  TEST_DB_CONTAINER="kwd-content-agent-pg-test-$TEST_DB_SUFFIX"
  TEST_DB_NETWORK="kwd-content-agent-pg-test-$TEST_DB_SUFFIX"
  TEST_DB_USER="content_migration_test"
  TEST_DB_NAME="kwd_content_agent_integration_test"
  TEST_DB_PASSWORD="$(tr -d '-' < /proc/sys/kernel/random/uuid)"
  TEST_SCHEMA_FILE="$(mktemp /tmp/kwd-content-schema.XXXXXX)"

  docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --schema-only --no-owner --no-privileges' > "$TEST_SCHEMA_FILE"
  test -s "$TEST_SCHEMA_FILE"
  docker network create "$TEST_DB_NETWORK" >/dev/null
  docker run -d --name "$TEST_DB_CONTAINER" --network "$TEST_DB_NETWORK" \
    -e POSTGRES_USER="$TEST_DB_USER" \
    -e POSTGRES_PASSWORD="$TEST_DB_PASSWORD" \
    -e POSTGRES_DB="$TEST_DB_NAME" \
    pgvector/pgvector:pg16 >/dev/null

  TEST_DB_READY=false
  for attempt in $(seq 1 30); do
    if docker exec "$TEST_DB_CONTAINER" pg_isready -U "$TEST_DB_USER" -d "$TEST_DB_NAME" >/dev/null 2>&1; then
      TEST_DB_READY=true
      break
    fi
    sleep 1
  done
  test "$TEST_DB_READY" = true

  docker exec -i -e PGPASSWORD="$TEST_DB_PASSWORD" "$TEST_DB_CONTAINER" \
    psql -v ON_ERROR_STOP=1 -U "$TEST_DB_USER" -d "$TEST_DB_NAME" < "$TEST_SCHEMA_FILE"

  docker run --rm --network "$TEST_DB_NETWORK" \
    -e DB_HOST="$TEST_DB_CONTAINER" -e DB_PORT=5432 \
    -e DB_USER="$TEST_DB_USER" -e DB_PASSWORD="$TEST_DB_PASSWORD" -e DB_NAME="$TEST_DB_NAME" \
    komplettwebdesign-app:local npm run migrate:content-agent
  docker run --rm --network "$TEST_DB_NETWORK" \
    -e DB_HOST="$TEST_DB_CONTAINER" -e DB_PORT=5432 \
    -e DB_USER="$TEST_DB_USER" -e DB_PASSWORD="$TEST_DB_PASSWORD" -e DB_NAME="$TEST_DB_NAME" \
    komplettwebdesign-app:local npm run migrate:content-agent

  docker run --rm --network "$TEST_DB_NETWORK" \
    -e CONTENT_AGENT_PG_TEST_URL="postgresql://${TEST_DB_USER}:${TEST_DB_PASSWORD}@${TEST_DB_CONTAINER}:5432/${TEST_DB_NAME}" \
    -e CONTENT_AGENT_PG_TEST_ALLOW_RESET=true \
    -e CONTENT_AGENT_PG_TEST_TOKEN=KWDCONTENTAGENT_TEST_RESET_V1 \
    komplettwebdesign-app:local node --test \
      tests/contentAgentPostgresIntegration.test.js \
      tests/contentRevisionOutcomePostgresIntegration.test.js

  docker exec -e PGPASSWORD="$TEST_DB_PASSWORD" "$TEST_DB_CONTAINER" \
    psql -v ON_ERROR_STOP=1 -U "$TEST_DB_USER" -d "$TEST_DB_NAME" -c '\dt content_*'
  cleanup
  trap - EXIT INT TERM
)
```

Beide Migrationsläufe müssen die Content-Agent-Migrationen 002, 003, 004, 005, 006, 007, 008, 009, 010, 011, 012 und 013 erfolgreich melden. Danach müssen sowohl der E2E-Test für den terminierten Ablauf Generate → Notify → Approve → Publish als auch die isolierten Verträge für KI-Bestandsoptimierung, GSC-Basis, Artikel-Performance, 28-Tage-Folgefenster und migrationssichere Outcome-Claims bestehen. Schlägt Export, Wiederherstellung, einer der beiden Migrationsläufe, einer der E2E-Tests oder die Tabellenprüfung fehl, beendet der Block mit einem Fehler und räumt trotzdem auf. Dann keine Produktionsmigration durchführen.

Der Node-Integrationstest besitzt zusätzlich eine eigene, ausfallsichere Sperre. Er akzeptiert ausschließlich den exakten Datenbanknamen `kwd_content_agent_integration_test`, `CONTENT_AGENT_PG_TEST_ALLOW_RESET=true`, das exakte Token `CONTENT_AGENT_PG_TEST_TOKEN=KWDCONTENTAGENT_TEST_RESET_V1` und entweder einen Loopback-Host oder einen Container mit dem Präfix `kwd-content-agent-pg-test-`. Verbindungsoptionen in der URL sind nicht erlaubt. Eine Produktionsdatenbank darf für diesen Test nie verwendet werden. Ohne alle Bedingungen wird der Test sicher übersprungen, bevor er eine Verbindung öffnet.

Der E2E-Test löscht keine Tabellen im allgemeinen oder öffentlichen Schema. Für jeden Lauf erzeugt er intern ein zufälliges Schema, setzt den PostgreSQL-`search_path` ausschließlich auf dieses Schema und `pg_catalog` und entfernt das Schema im `finally`-Block vollständig. Anschließend prüft er mit `to_regnamespace`, dass das Schema tatsächlich nicht mehr existiert. So bleiben weder Testtabellen noch ein wiederverwendbarer Schemaname zurück.

## 7. Produktionsbackup erstellen, prüfen und erst danach migrieren

Erst nach der erfolgreichen Testdatenbankprüfung folgt das vollständige Produktionsbackup. Das Custom-Format erhält Struktur und Datenbankinhalte. `umask 077`, Verzeichnisrechte `700` und Dateirechte `600` verhindern, dass andere lokale Benutzer das Backup lesen. Das Backup enthält sensible Produktionsdaten und darf nicht in Git oder in einen öffentlich erreichbaren Ordner gelangen.

```bash
umask 077
mkdir -p ./data/backups
chmod 700 ./data/backups
BACKUP_FILE="./data/backups/komplettwebdesign-before-content-agent-$(date +%Y%m%d-%H%M%S).dump"
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$BACKUP_FILE"
chmod 600 "$BACKUP_FILE"
test -s "$BACKUP_FILE"
docker compose exec -T postgres pg_restore -l < "$BACKUP_FILE" >/dev/null
printf 'Geprüftes Backup: %s\n' "$BACKUP_FILE"
```

Nur fortfahren, wenn sowohl `test -s` als auch `pg_restore -l` mit Exitcode `0` enden. Der Zeitstempel verhindert das Überschreiben eines älteren Backups. Der Migrationsrunner führt reproduzierbar und in dieser Reihenfolge `002_create_content_agent_core.sql`, `003_create_content_agent_admin_dashboard.sql`, `004_create_scheduled_content_review.sql`, `005_upgrade_admin_notification_retry_index.sql`, `006_add_schedule_revisions_and_admin_review_lookup.sql`, `007_create_content_search_metrics.sql`, `008_expand_generated_content_metadata.sql`, `009_create_content_learning_rules.sql`, `010_create_weekly_topic_pools.sql`, `011_create_existing_post_optimization.sql`, `012_upgrade_revision_outcome_claims.sql` und `013_create_article_performance_learning.sql` innerhalb derselben Transaktion aus. Migration 005 ersetzt auf bereits migrierten Installationen den alten Admin-Mailindex. Migration 006 ergänzt ohne Datenlöschung die getrennte Zeitplanhistorie und den Index `idx_content_notification_deliveries_post_type_latest` für die neueste Admin-Prüfmail. Migration 007 ergänzt ausschließlich additive Tabellen und Indizes für Search-Console-Metriken und redaktionelle Chancen. Migration 008 erweitert ausschließlich die zuvor zu engen Metadatenfelder. Migration 009 ergänzt Beobachtungen, Vorschläge, versionierte Lernregeln und deren Auditverlauf; sie veröffentlicht und verändert keine Artikel. Migration 010 ergänzt den wiederverwendbaren Wochenpool und die eindeutige Themenbeanspruchung pro Generierungslauf. Migration 011 ergänzt die Tabellen `content_revision_optimization_outcomes` und `content_revision_optimization_feedback`, den eindeutigen aktiven Jobindex `ux_content_jobs_active_existing_optimization` sowie den fälligen Outcome-Index `idx_content_revision_outcomes_pending`. Migration 012 ergänzt bei bereits ausgeführter Migration 011 die Claim-Spalten idempotent und erzwingt den validierten Constraint `content_revision_optimization_outcomes_claim_consistent`. Migration 013 ergänzt die anonymen Artikelereignisse in `content_article_events`, die aggregierten Leistungsstände in `content_article_performance_snapshots` sowie die dafür benötigten Indizes und Prüfbedingungen. Anschließend die Migration genau einmal auf der Produktion ausführen; die zweimalige Idempotenzprüfung der Migrationen 002 bis 013 ist bereits in der separaten Testdatenbank erfolgt:

```bash
docker compose run --rm app npm run migrate:content-agent
```

Unmittelbar nach dem Migrationslauf und noch vor Dry-Run oder Worker-Neustart die für die Bestandsoptimierung benötigten Tabellen, Indizes, Claim-Spalten und den validierten Constraint prüfen. Dieser Block liest ausschließlich PostgreSQL-Systemkataloge und gibt weder Artikelinhalte noch Zugangsdaten aus. Er muss exakt `ok` ausgeben; andernfalls ist der Rollout abzubrechen:

```bash
CONTENT_AGENT_SCHEMA_OK="$(
  docker compose run --rm -T app node --input-type=module <<'NODE'
import pg from 'pg';

const client = new pg.Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

try {
  await client.connect();
  const { rows } = await client.query(`
    SELECT
      to_regclass('public.content_revision_optimization_outcomes') IS NOT NULL AS outcomes_table,
      to_regclass('public.content_revision_optimization_feedback') IS NOT NULL AS feedback_table,
      to_regclass('public.content_article_events') IS NOT NULL AS article_events_table,
      to_regclass('public.content_article_performance_snapshots') IS NOT NULL AS article_performance_snapshots_table,
      to_regclass('public.ux_content_jobs_active_existing_optimization') IS NOT NULL AS active_job_index,
      to_regclass('public.idx_content_revision_outcomes_pending') IS NOT NULL AS pending_outcome_index,
      EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'content_revision_optimization_outcomes'
          AND column_name IN ('evaluation_claim_token', 'evaluation_claimed_at')
        HAVING COUNT(*) = 2
      ) AS claim_columns,
      EXISTS (
        SELECT 1
        FROM pg_constraint constraint_row
        JOIN pg_class table_row ON table_row.oid = constraint_row.conrelid
        JOIN pg_namespace schema_row ON schema_row.oid = table_row.relnamespace
        WHERE schema_row.nspname = 'public'
          AND table_row.relname = 'content_revision_optimization_outcomes'
          AND constraint_row.conname = 'content_revision_optimization_outcomes_claim_consistent'
          AND constraint_row.convalidated = TRUE
      ) AS claim_constraint
  `);
  if (!rows[0] || Object.values(rows[0]).some((value) => value !== true)) {
    throw new Error('Migration 011/012/013 ist nicht vollständig wirksam.');
  }
  process.stdout.write('ok\n');
} finally {
  await client.end().catch(() => {});
}
NODE
)"
test "$CONTENT_AGENT_SCHEMA_OK" = "ok"
```

Vor dem Workerstart folgt zwingend der lokale Dry-Run. Er verwendet simulierte Adapter und muss in seinem JSON-Ergebnis exakt den sicheren Vertrag `"externalCalls":0`, `"articleValid":true`, `"publishMode":"draft"`, `"scheduledReview":true` und `"notificationSimulated":true` melden:

```bash
docker compose run --rm app npm run content-agent:dry-run
```

Ein abweichendes Ergebnis ist ein Abbruchkriterium; in diesem Fall den Worker nicht starten.

Nur wenn Build, getrennte Testmigration, geprüftes Produktionsbackup, Produktionsmigration bis einschließlich 013, Schema-Prüfung und Dry-Run erfolgreich waren, App und Worker für den Erstrollout gemeinsam neu erzeugen. Dadurch starten App und Worker mit dem vollständigen Schema bis Migration 013 und demselben geprüften Image:

```bash
docker compose up -d --no-deps --force-recreate app content-worker
docker compose ps postgres app content-worker
docker compose exec -T content-worker npm run content-agent:healthcheck
docker compose logs --tail=100 app content-worker
```

Schlägt Recreate, App-Start oder Worker-Healthcheck fehl, den Content-Agent nicht im Dashboard aktivieren. Zuerst Containerstatus und Logs prüfen.

### 7.1 Wiederholbare Releases mit `deploy/deploy.sh`

Vor jedem späteren Release den Agenten im Dashboard pausieren. Das folgende Skript liest vor jeder schreibenden Abfrage ausschließlich `to_regclass` und `information_schema.columns`. Es unterscheidet damit das Dashboard-Schema (`agent_enabled` und `operating_mode`), das Legacy-002-Schema (`schedule_enabled` und `auto_publish_enabled`) sowie einen echten First Deploy ohne beide Content-Agent-Tabellen. Partielle oder unbekannte Kombinationen brechen ab. Erst danach führt es genau die zum erkannten Schema passende Pause-Abfrage aus; keine SQL-Abfrage referenziert eine möglicherweise nicht vorhandene Spalte. Dadurch kann der Worker keinen neuen Job mehr übernehmen. Ein bereits parallel begonnener Claim wird durch die zweite Prüfung nach dem kontrollierten Worker-Stopp erkannt. Das Skript aktiviert den Agenten nach dem Deploy nicht wieder; die bewusste Freigabe im Review-Modus erfolgt erst nach der technischen Kontrolle im Dashboard.

Die manuell verwaltete Datei zuerst sichern und das Zielverzeichnis schützen:

```bash
umask 077
mkdir -p deploy
test ! -f deploy/deploy.sh || cp -p deploy/deploy.sh "deploy/deploy.sh.before-$(date +%Y%m%d-%H%M%S)"
chmod 700 deploy
```

Danach den folgenden Block vollständig als `~/apps/komplettwebdesign/deploy/deploy.sh` speichern:

```bash
#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${HOME}/apps/komplettwebdesign"
COMPOSE_FILE="$ROOT/docker-compose.yml"
REPO_DIR="$ROOT/server"
CURRENT_WORKER_CONTRACT="dashboard-v1"
MIN_DASHBOARD_WORKER_REVISION="726df921b2285498eeca228588f8ec63945dd5fa"
OPERATION_LOCK="$ROOT/data/content-agent-deploy.lock"
ROLLBACK_METADATA_TMP=""
DRY_RUN_OUTPUT_FILE=""

fail() {
  printf '%s\n' "$1" >&2
  exit 1
}

cleanup() {
  local command_status=$?
  [[ -z "${ROLLBACK_METADATA_TMP:-}" ]] || rm -f "$ROLLBACK_METADATA_TMP"
  [[ -z "${DRY_RUN_OUTPUT_FILE:-}" ]] || rm -f "$DRY_RUN_OUTPUT_FILE"
  return "$command_status"
}
trap cleanup EXIT

acquire_operation_lock() {
  local lock_file="$1"
  command -v flock >/dev/null 2>&1 || fail "Linux-Werkzeug flock fehlt."
  exec 9>"$lock_file"
  chmod 600 "$lock_file"
  flock -n 9 || fail "Deploy oder Rollback läuft bereits."
}

classify_content_schema_state() {
  case "$1" in
    "1|1|1|0|1|1") printf 'dashboard\n' ;;
    "1|0|0|1|1|1") printf 'legacy002\n' ;;
    "0|0|0|0|0|0") printf 'first_deploy\n' ;;
    *) return 1 ;;
  esac
}

read_content_schema_facts() {
  docker compose -f "$COMPOSE_FILE" exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -AtF "|" -c "SELECT (to_regclass('\''public.content_agent_settings'\'') IS NOT NULL)::int, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = '\''public'\'' AND table_name = '\''content_agent_settings'\'' AND column_name = '\''agent_enabled'\'')::int, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = '\''public'\'' AND table_name = '\''content_agent_settings'\'' AND column_name = '\''operating_mode'\'')::int, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = '\''public'\'' AND table_name = '\''content_agent_settings'\'' AND column_name = '\''schedule_enabled'\'')::int, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = '\''public'\'' AND table_name = '\''content_agent_settings'\'' AND column_name = '\''auto_publish_enabled'\'')::int, (to_regclass('\''public.content_jobs'\'') IS NOT NULL)::int;"'
}

pause_content_agent() {
  case "$1" in
    dashboard)
      if test "$(docker compose -f "$COMPOSE_FILE" exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atqc "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = '\''public'\'' AND table_name = '\''content_agent_settings'\'' AND column_name = '\''schedule_revision'\'') AND to_regclass('\''public.content_agent_schedule_revisions'\'') IS NOT NULL;"')" = "t"; then
        PAUSED_STATE="$(docker compose -f "$COMPOSE_FILE" exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atqc "WITH current_settings AS (SELECT * FROM content_agent_settings WHERE id = 1 FOR UPDATE), updated AS (UPDATE content_agent_settings settings SET agent_enabled = FALSE, operating_mode = '\''review'\'', schedule_revision = settings.schedule_revision + CASE WHEN current_settings.agent_enabled THEN 1 ELSE 0 END, settings_version = settings.settings_version + 1, updated_at = NOW() FROM current_settings WHERE settings.id = current_settings.id RETURNING settings.*, current_settings.agent_enabled AS was_enabled), revision AS (INSERT INTO content_agent_schedule_revisions (revision, effective_at, agent_enabled, schedule_weekdays, schedule_time, timezone, generation_lead_hours) SELECT schedule_revision, updated_at, agent_enabled, schedule_weekdays, schedule_time, timezone, generation_lead_hours FROM updated WHERE was_enabled ON CONFLICT (revision) DO NOTHING) SELECT agent_enabled::text || '\''|'\'' || operating_mode FROM updated;"')"
      else
        PAUSED_STATE="$(docker compose -f "$COMPOSE_FILE" exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atqc "WITH current_settings AS (SELECT * FROM content_agent_settings WHERE id = 1 FOR UPDATE), updated AS (UPDATE content_agent_settings settings SET agent_enabled = FALSE, operating_mode = '\''review'\'', settings_version = settings.settings_version + 1, updated_at = NOW() FROM current_settings WHERE settings.id = current_settings.id RETURNING settings.*), revision AS (INSERT INTO content_agent_setting_revisions (settings_version, changed_keys, previous_values_json, new_values_json, admin_id, admin_username) SELECT updated.settings_version, ARRAY['\''agent_enabled'\'','\''operating_mode'\'']::TEXT[], to_jsonb(current_settings), to_jsonb(updated), NULL, '\''deploy-script'\'' FROM updated CROSS JOIN current_settings WHERE current_settings.agent_enabled IS DISTINCT FROM FALSE OR current_settings.operating_mode IS DISTINCT FROM '\''review'\'') SELECT agent_enabled::text || '\''|'\'' || operating_mode FROM updated;"')"
      fi
      test "$PAUSED_STATE" = "false|review"
      ;;
    legacy002)
      PAUSED_STATE="$(docker compose -f "$COMPOSE_FILE" exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atqc "UPDATE content_agent_settings SET schedule_enabled = FALSE, auto_publish_enabled = FALSE, updated_at = NOW() WHERE id = 1 RETURNING schedule_enabled::text || '\''|'\'' || auto_publish_enabled::text;"')"
      test "$PAUSED_STATE" = "false|false"
      ;;
    first_deploy)
      printf 'Erster Deploy: Content-Agent-Tabellen sind noch nicht vorhanden.\n'
      ;;
    *) fail "Unbekannter Content-Agent-Datenbankzustand." ;;
  esac
}

is_dashboard_worker_compatible() {
  local contract="$1"
  local commit="$2"
  local rollback_ref="$3"
  local resolved_commit=""
  [[ "$contract" == "$CURRENT_WORKER_CONTRACT" ]] || return 1
  [[ "$commit" =~ ^[0-9a-f]{40}$ ]] || return 1
  [[ "$rollback_ref" =~ ^refs/deploy-rollbacks/[0-9]{8}T[0-9]{6}Z-[0-9a-f]{12}$ ]] || return 1
  resolved_commit="$(git rev-parse --verify "${rollback_ref}^{commit}" 2>/dev/null)" || return 1
  [[ "$resolved_commit" =~ ^[0-9a-f]{40}$ ]] || return 1
  [[ "$resolved_commit" == "$commit" ]] || return 1
  git merge-base --is-ancestor "$MIN_DASHBOARD_WORKER_REVISION" "$commit" || return 1
}

wait_for_app_health() {
  local container_id=""
  local status=""
  local consecutive_successes=0

  for attempt in $(seq 1 60); do
    container_id="$(docker compose -f "$COMPOSE_FILE" ps -q app)"
    status="$(docker inspect --format '{{.State.Status}}' "$container_id" 2>/dev/null || true)"
    if [[ -n "$container_id" && "$status" == "running" ]] && docker compose -f "$COMPOSE_FILE" exec -T app node -e 'const http=require("node:http");const request=http.get({host:"localhost",port:3000,path:"/health",timeout:3000},response=>{let body="";response.setEncoding("utf8");response.on("data",chunk=>body+=chunk);response.on("end",()=>process.exit(response.statusCode===200&&body.trim()==="ok"?0:1));});request.on("timeout",()=>request.destroy(new Error("timeout")));request.on("error",()=>process.exit(1));'; then
      consecutive_successes=$((consecutive_successes + 1))
      if (( consecutive_successes >= 3 )); then
        return 0
      fi
    else
      consecutive_successes=0
    fi
    sleep 2
  done

  docker compose -f "$COMPOSE_FILE" ps app >&2 || true
  docker compose -f "$COMPOSE_FILE" logs --tail=100 app >&2 || true
  fail "App-Endpunkt /health war nicht dreimal hintereinander erfolgreich."
}

validate_dry_run_output() {
  node - "$1" <<'NODE'
const { readFileSync } = require('node:fs');
const lines = readFileSync(process.argv[2], 'utf8').split(/\r?\n/).filter(Boolean);
let result = null;
for (let index = lines.length - 1; index >= 0; index -= 1) {
  try {
    const candidate = JSON.parse(lines[index]);
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
      result = candidate;
      break;
    }
  } catch {}
}
if (!result
    || result.externalCalls !== 0
    || result.articleValid !== true
    || result.publishMode !== 'draft'
    || result.scheduledReview !== true
    || result.notificationSimulated !== true) {
  process.exit(1);
}
NODE
}

wait_for_service() {
  local service="$1"
  local expected="$2"
  local container_id=""
  local status=""
  local health=""

  for attempt in $(seq 1 60); do
    container_id="$(docker compose -f "$COMPOSE_FILE" ps -q "$service")"
    if [[ -n "$container_id" ]]; then
      status="$(docker inspect --format '{{.State.Status}}' "$container_id" 2>/dev/null || true)"
      health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$container_id" 2>/dev/null || true)"
      if [[ "$status" == "running" && "$expected" == "running" ]]; then
        return 0
      fi
      if [[ "$status" == "running" && "$expected" == "healthy" && "$health" == "healthy" ]]; then
        return 0
      fi
      if [[ "$status" == "exited" || "$status" == "dead" ]]; then
        break
      fi
    fi
    sleep 2
  done

  docker compose -f "$COMPOSE_FILE" ps "$service" >&2 || true
  docker compose -f "$COMPOSE_FILE" logs --tail=100 "$service" >&2 || true
  fail "Dienst $service wurde nicht rechtzeitig $expected."
}

cd "$ROOT"
test -f "$COMPOSE_FILE"
test -f "$ROOT/.env"
test -e "$REPO_DIR/.git"
mkdir -p "$ROOT/data"
acquire_operation_lock "$OPERATION_LOCK"
docker compose -f "$COMPOSE_FILE" config --quiet
if ! git config --global --get-all safe.directory | grep -Fxq "$REPO_DIR"; then
  git config --global --add safe.directory "$REPO_DIR"
fi

PRE_DEPLOY_SCHEMA_FACTS="$(read_content_schema_facts)" || fail "Content-Agent-Schema konnte nicht gelesen werden."
PRE_DEPLOY_SCHEMA_STATE="$(classify_content_schema_state "$PRE_DEPLOY_SCHEMA_FACTS")" || fail "Unbekannter oder partieller Content-Agent-Datenbankzustand: $PRE_DEPLOY_SCHEMA_FACTS"
printf 'Content-Agent-Schema vor Migration: %s (%s)\n' "$PRE_DEPLOY_SCHEMA_STATE" "$PRE_DEPLOY_SCHEMA_FACTS"
pause_content_agent "$PRE_DEPLOY_SCHEMA_STATE"

running_job_count() {
  case "$PRE_DEPLOY_SCHEMA_STATE" in
    dashboard|legacy002)
      docker compose -f "$COMPOSE_FILE" exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atqc "SELECT count(*) FROM content_jobs WHERE status = '\''running'\'';"'
      ;;
    first_deploy)
      printf '0\n'
      ;;
    *)
      fail "Unbekannter Zustand der Jobtabelle."
      ;;
  esac
}

RUNNING_JOB_COUNT="$(running_job_count)"
if ! [[ "$RUNNING_JOB_COUNT" =~ ^[0-9]+$ ]]; then
  printf 'Laufende Jobs konnten nicht sicher bestimmt werden. Abbruch.\n' >&2
  exit 1
fi
if [[ "$RUNNING_JOB_COUNT" != "0" ]]; then
  printf 'Noch %s Job(s) aktiv. Agent bleibt pausiert; später erneut ausführen.\n' "$RUNNING_JOB_COUNT" >&2
  exit 1
fi

WORKER_CONTAINER_ID="$(docker compose -f "$COMPOSE_FILE" ps -q content-worker)"
if [[ -n "$WORKER_CONTAINER_ID" ]]; then
  docker compose -f "$COMPOSE_FILE" stop -t 600 content-worker
else
  printf 'Erster Deploy: kein vorhandener Content-Worker zu stoppen.\n'
fi

POST_STOP_RUNNING_JOB_COUNT="$(running_job_count)"
if ! [[ "$POST_STOP_RUNNING_JOB_COUNT" =~ ^[0-9]+$ ]]; then
  printf 'Jobstatus nach Worker-Stopp ist unbekannt. Abbruch.\n' >&2
  exit 1
fi
if [[ "$POST_STOP_RUNNING_JOB_COUNT" != "0" ]]; then
  printf 'Nach Worker-Stopp ist noch ein Job aktiv. Nicht migrieren; Ursache untersuchen.\n' >&2
  exit 1
fi

umask 077
mkdir -p "$ROOT/data/backups"
chmod 700 "$ROOT/data/backups"
BACKUP_FILE="$ROOT/data/backups/komplettwebdesign-before-deploy-$(date +%Y%m%d-%H%M%S).dump"
docker compose -f "$COMPOSE_FILE" exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$BACKUP_FILE"
chmod 600 "$BACKUP_FILE"
test -s "$BACKUP_FILE"
docker compose -f "$COMPOSE_FILE" exec -T postgres pg_restore -l < "$BACKUP_FILE" >/dev/null

cd "$REPO_DIR"
DEPLOY_TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
ROLLBACK_DIR="$ROOT/data/rollbacks"
mkdir -p "$ROLLBACK_DIR"
chmod 700 "$ROLLBACK_DIR"
APP_CONTAINER_ID="$(docker compose -f "$COMPOSE_FILE" ps --all -q app)"
RUNNING_APP_CONTAINER_ID="$(docker compose -f "$COMPOSE_FILE" ps --status running -q app)"
if [[ -n "$APP_CONTAINER_ID" && -z "$RUNNING_APP_CONTAINER_ID" ]]; then
  fail "App-Container existiert, läuft aber nicht; kein First Deploy und kein sicherer Snapshot."
fi
if [[ -n "$RUNNING_APP_CONTAINER_ID" && "$RUNNING_APP_CONTAINER_ID" != "$APP_CONTAINER_ID" ]]; then
  fail "App-Containerzustand ist inkonsistent oder der Service ist skaliert."
fi
if [[ -n "$RUNNING_APP_CONTAINER_ID" ]]; then
  RUNNING_IMAGE_ID="$(docker inspect --format '{{.Image}}' "$RUNNING_APP_CONTAINER_ID")"
  if ! [[ "$RUNNING_IMAGE_ID" =~ ^sha256:[0-9a-f]{64}$ ]]; then
    fail "Image-ID des laufenden App-Containers ist ungültig."
  fi
  docker image inspect "$RUNNING_IMAGE_ID" >/dev/null

  RUNNING_IMAGE_HEX="${RUNNING_IMAGE_ID#sha256:}"
  DEPLOY_ID="${DEPLOY_TIMESTAMP}-${RUNNING_IMAGE_HEX:0:12}"
  ROLLBACK_IMAGE="komplettwebdesign-app:rollback-${DEPLOY_ID}"
  ROLLBACK_METADATA="$ROLLBACK_DIR/rollback-${DEPLOY_ID}.env"
  test ! -e "$ROLLBACK_METADATA"
  if docker image inspect "$ROLLBACK_IMAGE" >/dev/null 2>&1; then
    fail "Rollback-Image-Tag existiert bereits; unveränderlichen Snapshot nicht überschreiben."
  fi
  docker image tag "$RUNNING_IMAGE_ID" "$ROLLBACK_IMAGE"
  docker image inspect "$ROLLBACK_IMAGE" >/dev/null
  TAGGED_ROLLBACK_IMAGE_ID="$(docker image inspect --format '{{.Id}}' "$ROLLBACK_IMAGE")"
  test "$TAGGED_ROLLBACK_IMAGE_ID" = "$RUNNING_IMAGE_ID"

  RUNNING_IMAGE_REVISION="$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$RUNNING_IMAGE_ID" 2>/dev/null || true)"
  RUNNING_WORKER_CONTRACT="$(docker image inspect --format '{{index .Config.Labels "de.komplettwebdesign.content-worker.contract"}}' "$RUNNING_IMAGE_ID" 2>/dev/null || true)"
  if [[ "$RUNNING_WORKER_CONTRACT" != "$CURRENT_WORKER_CONTRACT" ]]; then
    RUNNING_WORKER_CONTRACT="unknown"
  fi
  ROLLBACK_COMMIT="unknown"
  ROLLBACK_REF="unknown"
  ROLLBACK_WORKER_COMPATIBILITY="unknown"
  if [[ "$RUNNING_IMAGE_REVISION" =~ ^[0-9a-f]{40}$ ]] && git cat-file -e "${RUNNING_IMAGE_REVISION}^{commit}" 2>/dev/null; then
    ROLLBACK_COMMIT="$RUNNING_IMAGE_REVISION"
    ROLLBACK_REF="refs/deploy-rollbacks/$DEPLOY_ID"
    git check-ref-format "$ROLLBACK_REF"
    git update-ref "$ROLLBACK_REF" "$ROLLBACK_COMMIT"
    if is_dashboard_worker_compatible "$RUNNING_WORKER_CONTRACT" "$ROLLBACK_COMMIT" "$ROLLBACK_REF"; then
      ROLLBACK_WORKER_COMPATIBILITY="compatible"
    else
      ROLLBACK_WORKER_COMPATIBILITY="incompatible"
    fi
  else
    printf 'Image-Revision ist unbekannt, ungültig oder lokal nicht verfügbar; Rollback bleibt image-only.\n' >&2
  fi

  ROLLBACK_METADATA_TMP="$(mktemp "$ROLLBACK_DIR/.rollback-${DEPLOY_ID}.tmp.XXXXXX")"
  printf 'ROLLBACK_IMAGE=%s\nROLLBACK_IMAGE_ID=%s\nROLLBACK_COMMIT=%s\nROLLBACK_REF=%s\nROLLBACK_SCHEMA_STATE=%s\nROLLBACK_WORKER_CONTRACT=%s\nROLLBACK_WORKER_COMPATIBILITY=%s\n' \
    "$ROLLBACK_IMAGE" "$RUNNING_IMAGE_ID" "$ROLLBACK_COMMIT" "$ROLLBACK_REF" \
    "$PRE_DEPLOY_SCHEMA_STATE" "$RUNNING_WORKER_CONTRACT" "$ROLLBACK_WORKER_COMPATIBILITY" > "$ROLLBACK_METADATA_TMP"
  chmod 600 "$ROLLBACK_METADATA_TMP"
  mv -nT "$ROLLBACK_METADATA_TMP" "$ROLLBACK_METADATA"
  if [[ -e "$ROLLBACK_METADATA_TMP" ]]; then
    fail "Rollback-Metadaten existieren bereits; atomarer Publish abgebrochen."
  fi
  ROLLBACK_METADATA_TMP=""
  test -s "$ROLLBACK_METADATA"
  printf 'Rollback-Metadaten: %s\n' "$ROLLBACK_METADATA"
else
  printf 'Erster Deploy: kein laufender App-Container für einen Image-Rollback.\n'
fi

git fetch --prune origin
git rev-parse --verify 'origin/main^{commit}' >/dev/null
git reset --hard origin/main
DEPLOY_COMMIT="$(git rev-parse --verify 'HEAD^{commit}')"
if ! [[ "$DEPLOY_COMMIT" =~ ^[0-9a-f]{40}$ ]]; then
  fail "Deployment-Commit ist ungültig."
fi
export APP_REVISION="$DEPLOY_COMMIT"
cd "$ROOT"

docker compose -f "$COMPOSE_FILE" build --no-cache app
docker image inspect komplettwebdesign-app:local >/dev/null
BUILT_IMAGE_REVISION="$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' komplettwebdesign-app:local)"
test "$BUILT_IMAGE_REVISION" = "$DEPLOY_COMMIT"
BUILT_WORKER_CONTRACT="$(docker image inspect --format '{{index .Config.Labels "de.komplettwebdesign.content-worker.contract"}}' komplettwebdesign-app:local)"
test "$BUILT_WORKER_CONTRACT" = "$CURRENT_WORKER_CONTRACT"

docker compose -f "$COMPOSE_FILE" run --rm --no-deps app npm run migrate:content-agent
docker compose -f "$COMPOSE_FILE" run --rm --no-deps app npm run migrate:content-agent
CONTENT_AGENT_SCHEMA_OK="$(
  docker compose -f "$COMPOSE_FILE" run --rm --no-deps -T app node --input-type=module <<'NODE'
import pg from 'pg';

const client = new pg.Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

try {
  await client.connect();
  const { rows } = await client.query(`
    SELECT
      to_regclass('public.content_revision_optimization_outcomes') IS NOT NULL AS outcomes_table,
      to_regclass('public.content_revision_optimization_feedback') IS NOT NULL AS feedback_table,
      to_regclass('public.content_article_events') IS NOT NULL AS article_events_table,
      to_regclass('public.content_article_performance_snapshots') IS NOT NULL AS article_performance_snapshots_table,
      to_regclass('public.ux_content_jobs_active_existing_optimization') IS NOT NULL AS active_job_index,
      to_regclass('public.idx_content_revision_outcomes_pending') IS NOT NULL AS pending_outcome_index,
      EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'content_revision_optimization_outcomes'
          AND column_name IN ('evaluation_claim_token', 'evaluation_claimed_at')
        HAVING COUNT(*) = 2
      ) AS claim_columns,
      EXISTS (
        SELECT 1
        FROM pg_constraint constraint_row
        JOIN pg_class table_row ON table_row.oid = constraint_row.conrelid
        JOIN pg_namespace schema_row ON schema_row.oid = table_row.relnamespace
        WHERE schema_row.nspname = 'public'
          AND table_row.relname = 'content_revision_optimization_outcomes'
          AND constraint_row.conname = 'content_revision_optimization_outcomes_claim_consistent'
          AND constraint_row.convalidated = TRUE
      ) AS claim_constraint
  `);
  if (!rows[0] || Object.values(rows[0]).some((value) => value !== true)) {
    throw new Error('Migration 011/012/013 ist nicht vollständig wirksam.');
  }
  process.stdout.write('ok\n');
} finally {
  await client.end().catch(() => {});
}
NODE
)"
test "$CONTENT_AGENT_SCHEMA_OK" = "ok" || fail "Content-Agent-Schema nach Migration 011/012/013 ist unvollständig."
DRY_RUN_OUTPUT_FILE="$(mktemp "$ROOT/data/.content-agent-dry-run.XXXXXX")"
if ! docker compose -f "$COMPOSE_FILE" run --rm --no-deps app npm run content-agent:dry-run > "$DRY_RUN_OUTPUT_FILE" 2>&1; then
  cat "$DRY_RUN_OUTPUT_FILE" >&2
  fail "Content-Agent-Dry-Run ist fehlgeschlagen."
fi
cat "$DRY_RUN_OUTPUT_FILE"
validate_dry_run_output "$DRY_RUN_OUTPUT_FILE" || fail "Dry-Run-Ergebnis verletzt den sicheren Vertrag."
rm -f "$DRY_RUN_OUTPUT_FILE"
DRY_RUN_OUTPUT_FILE=""

docker compose -f "$COMPOSE_FILE" up -d --no-deps --force-recreate app content-worker
wait_for_app_health
wait_for_service content-worker healthy
if [[ "${KWD_CHECK_EXTERNAL_HEALTH:-false}" == "true" ]]; then
  command -v curl >/dev/null 2>&1 || fail "Optionaler externer Healthcheck verlangt curl."
  curl --fail --silent --show-error --max-time 10 https://www.komplettwebdesign.de/health | grep -Fxq ok
fi
docker compose -f "$COMPOSE_FILE" ps postgres app content-worker
docker compose -f "$COMPOSE_FILE" exec -T content-worker npm run content-agent:healthcheck
docker compose -f "$COMPOSE_FILE" logs --tail=100 app content-worker
```

Erst nachdem die Datei gespeichert wurde, Rechte und Syntax prüfen und das Skript ausführen:

```bash
chmod 700 deploy/deploy.sh
bash -n deploy/deploy.sh
./deploy/deploy.sh
```

Das Skript benötigt auf dem Linux-VPS `flock` und hält eine gemeinsame, nicht blockierende Sperre für Deploy und Rollback während des gesamten Ablaufs. Es bricht bei einem parallelen Betriebsbefehl, einem unbekannten Datenbankzustand, einem vorhandenen aber gestoppten App-Container, einem unbekannten oder von null abweichenden Jobzähler, einem ungeprüften Backup, ungültigen Git-Commits, einem fehlgeschlagenen Build, einem der beiden idempotenten Migrationsläufe, einer unvollständigen Katalogprüfung für Migration 011/012/013, einem nicht eindeutig sicheren Dry-Run, dem Recreate oder dem Healthcheck durch `set -Eeuo pipefail` sofort ab. Die Katalogprüfung läuft bei jedem wiederholbaren Release unmittelbar nach der zweiten Migration und noch vor Dry-Run oder Neustart; sie liest ausschließlich PostgreSQL-Systemkataloge. Nur `server/` ist ein disponibler Git-Checkout; `git reset --hard origin/main` verwirft dort absichtlich lokale Änderungen. Die Rootdateien bleiben unberührt. Die bisherige App läuft während Pause, Backup, Git-Update, Image-Build, Migration und Katalogprüfung weiter und wird erst beim finalen Recreate ersetzt.

Vor `git fetch`, `git reset` und Build ermittelt das Skript den tatsächlich laufenden App-Container und liest dessen exakte `.Image`-SHA aus. Nur diese SHA erhält einen unveränderlichen Rollback-Tag; der bewegliche Tag `komplettwebdesign-app:local` ist ausdrücklich keine Snapshot-Quelle. Nach einem fehlgeschlagenen Build kann `komplettwebdesign-app:local` bereits ersetzt sein, obwohl das neue Image nie produktiv gestartet wurde; der nächste Rollback verweist trotzdem auf das richtige laufende Image.

Die OCI-Revision des exakten laufenden Images wird nur akzeptiert, wenn sie aus 40 hexadezimalen Zeichen besteht und der Commit im lokalen Repository wirklich vorhanden ist. Dann schützt `refs/deploy-rollbacks/<DEPLOY_ID>` den Commit vor Git-Garbage-Collection. Für den Worker gilt zusätzlich der explizite OCI-Contract `dashboard-v1` und der erste bekannte kompatible Worker-Commit `726df921b2285498eeca228588f8ec63945dd5fa`: Nur wenn Contract und `git merge-base --is-ancestor` passen, wird der alte Worker als kompatibel markiert. Ein älteres, nicht gelabeltes Image bleibt vollständig als App-Image-Rollback nutzbar, wird aber ehrlich mit Commit, Ref oder Worker-Contract `unknown` erfasst; eine Code-/Image-/Worker-Ausrichtung wird dann nicht behauptet.

Die Metadatendatei speichert Tag, exakte Image-ID, Commit, Ref, erkannten Schema-Ausgangszustand, Worker-Contract und explizite Worker-Kompatibilität. Sie entsteht zunächst als Datei mit Modus `600` und wird unter der gemeinsamen Sperre per `mv -nT` atomar und ohne Überschreiben veröffentlicht. Beim ersten Deploy ohne jeden App-Container ist ausdrücklich kein Image-Rollback möglich; ein vorhandener, aber nicht laufender App-Container ist dagegen ein Abbruch. Nach dem Checkout exportiert das Skript den Zielcommit als `APP_REVISION`, baut das gemeinsame Image genau einmal über `app` und prüft Revision und Contract im resultierenden Image.

Der Dry-Run wird vollständig in einer geschützten temporären Datei erfasst. Ein Node-Validator sucht rückwärts die letzte syntaktisch gültige JSON-Zeile und akzeptiert ausschließlich `externalCalls === 0`, `articleValid === true`, `publishMode === "draft"`, `scheduledReview === true` und `notificationSimulated === true`. Nach dem Recreate muss der interne Endpunkt `http://localhost:3000/health` aus dem App-Container dreimal hintereinander innerhalb des begrenzten Fensters Status 200 und den Text `ok` liefern. Wird das Skript bewusst mit `KWD_CHECK_EXTERNAL_HEALTH=true` gestartet, verlangt es zusätzlich `curl` und prüft den öffentlichen Traefik-Pfad. Der Worker muss danach separat `healthy` werden. Nach einem Abbruch den Agenten nicht voreilig reaktivieren, sondern Ursache, Queue und Logs prüfen.

## 8. App und Worker nach dem sicheren Recreate prüfen

Der Erstrollout hat App und Worker am Ende von Abschnitt 7 bereits gemeinsam neu erzeugt. Durch `condition: service_healthy` starten beide erst nach einem erfolgreichen PostgreSQL-Healthcheck. An dieser Stelle keinen zweiten Start ausführen, sondern den bereits laufenden Zustand kontrollieren:

```bash
docker compose ps postgres app
docker compose logs --tail=100 app
docker compose ps content-worker
docker compose logs --tail=100 content-worker
```

Nach der `start_period` von 45 Sekunden muss der Worker `healthy` werden. Status, Docker-Healthdetails, den anwendungsseitigen Healthcheck und die laufenden Logs prüft man so:

```bash
docker compose ps
WORKER_ID="$(docker compose ps -q content-worker)"
test -n "$WORKER_ID"
docker inspect --format '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}}' "$WORKER_ID"
docker compose exec -T content-worker npm run content-agent:healthcheck
docker compose logs --tail=100 content-worker
docker compose logs -f content-worker
```

`npm run content-agent:healthcheck` muss `Content-Worker ist gesund.` ausgeben. `docker compose logs -f content-worker` läuft fortlaufend und wird nach der Kontrolle mit `Strg+C` beendet; der Container selbst läuft weiter.

Den Datenbank-Heartbeat kann man prüfen, ohne Zugangsdaten auf dem Host auszugeben:

```bash
docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT worker_name, heartbeat_at, NOW() - heartbeat_at AS age, version FROM content_worker_state WHERE worker_name = '\''content-worker'\'';"'
```

Das Alter sollte deutlich unter 90 Sekunden liegen.

## 9. Kontrollierter Review-first-Abnahmelauf

Der Agent startet deaktiviert im Review-Modus. Nach Deploy und Healthcheck im Admin-Dashboard zuerst prüfen, dass `agent_enabled=false`, `operating_mode=review`, Montag und Donnerstag um 18:00 Uhr, `Europe/Berlin` sowie das beabsichtigte Monatsbudget angezeigt werden. Erst danach den Agenten im Dashboard aktivieren; der Betriebsmodus bleibt dabei ausdrücklich `review` und das technische Auto-Publish-Gate weiterhin `false`.

Der Dry-Run verursacht null externe Aufrufe. Einen echten Queuejob erst nach bestätigten API-Berechtigungen, verifizierten Kostensätzen und Budgets bewusst einplanen, da er OpenAI- und Cloudinary-Kosten verursacht. Auf der Content-Agent-Übersicht über die vorgesehene Schaltfläche genau einen manuellen Entwurf anlegen. In den Jobs und Workerlogs beobachten, bis dieser Job `completed` oder `failed` ist:

```bash
docker compose logs --tail=100 content-worker
docker compose logs -f content-worker
```

Den fertigen Entwurf unter `/admin/content-agent/drafts` öffnen. Die Schaltfläche „Vorschau“ führt auf `/admin/content-agent/drafts/<POST_ID>/preview`; diese Route ist admin-geschützt und liefert die Vorschau mit `noindex` aus. Die Darstellung wertet niemals EJS aus, sanitisiert den statischen HTML-Inhalt und rendert genau eine H1. Inhalt, Bild, Quellen, Metadaten, FAQ, Risikohinweise und Qualitätsbewertung prüfen. Der Standardablauf erzeugt den Entwurf vier Stunden vor der Veröffentlichung, versendet die Admin-Prüfmail und lässt ihn im Status `needs_review`. „Freigeben“ bestätigt den geplanten Termin und führt in `approved_scheduled`; der Beitrag bleibt bis zur Fälligkeit unveröffentlicht. Nach einem verpassten Termin stehen ausschließlich „Freigeben und jetzt veröffentlichen“ oder „Verschieben“ mit einem neuen beliebigen Termin zur Verfügung.

Die Prüfung gilt erst als vollständig, wenn der fällige Job `publish_approved_post` genau einmal veröffentlicht, genau ein unveränderliches Ereignis in `content_publish_events` vorliegt und `manual_approvals_count` genau um eins erhöht wurde. Der Blog-Newsletter bleibt dabei deaktiviert, bis acht manuelle Freigaben erreicht sind und er danach bewusst im Adminbereich aktiviert wird.

Der Auto-Publish-Modus bleibt während der Einführungsphase gesperrt. Er darf frühestens nach acht manuellen Freigaben, einem konfigurierten Mindestscore von 90 und einer bewussten fachlichen Entscheidung erwogen werden. Dann zuerst `CONTENT_AGENT_AUTOPUBLISH_ENABLED=true` manuell in `.env` setzen, App und Worker neu erzeugen und erst anschließend den Betriebsmodus im Dashboard auf `auto_publish` umstellen. Bis alle drei Gates erfüllt sind, bleibt jeder erzeugte Beitrag ein Review-Entwurf.

### 9.1 Search Console kontrolliert abnehmen

Nach Migration, Recreate und erfolgreichem Worker-Healthcheck im Adminbereich den Reiter „Search Console“ öffnen. Vor dem Funktionstest müssen der technische und fachliche Hauptschalter aktiv sein: `CONTENT_AGENT_ENABLED=true` muss beim Containerstart geladen worden sein und der Content-Agent muss im Dashboard aktiviert sein. Der Betriebsmodus darf weiterhin `review` bleiben.

Mit „Search Console jetzt synchronisieren“ genau einen manuellen Abruf für die letzten 28 abgeschlossenen Tage einplanen. Die Erfolgsmeldung bestätigt nur, dass der Job sicher in die Queue aufgenommen wurde. Nach dem erfolgreichen Import wird die Performance der veröffentlichten Artikel automatisch auf Basis der neuen GSC-Daten ausgewertet. Anschließend Workerstatus und Logs prüfen:

```bash
docker compose ps app content-worker postgres
docker compose exec -T content-worker npm run content-agent:healthcheck
docker compose logs --tail=100 content-worker
```

Ein HTTP-Status 409 mit „Der Content-Agent ist deaktiviert“ bedeutet, dass der technische oder fachliche Hauptschalter deaktiviert beziehungsweise pausiert ist; das ist ein sicherer Abbruch und kein Credentialfehler. Ein 409-Hinweis, dass die Synchronisierung nicht eingeplant wurde, kann außerdem bedeuten, dass für denselben Kalendertag bereits ein identischer manueller Abruf vorhanden ist. In beiden Fällen keinen zweiten Ersatzjob erzwingen, sondern Schalter, Queue und Logs prüfen.

Nach erfolgreichem Abschluss zeigt der Reiter aggregierte Suchanfragen, Klicks, Impressionen, CTR, Positionen und rein redaktionelle Optimierungschancen. Keine Search-Console-Auswertung darf automatisch Inhalte ändern oder veröffentlichen. Bestehende Artikel bleiben unverändert, bis ein Mensch eine Empfehlung bewusst redaktionell umsetzt.

Die Artikelpipeline ist von Search Console unabhängig und darf durch eine fehlende oder fehlerhafte GSC-Verbindung nicht blockiert werden. Die Search-Console-Synchronisierung ist jederzeit deaktivierbar: Dazu `SEARCH_CONSOLE_SITE_URL` und `GOOGLE_APPLICATION_CREDENTIALS` in der manuell verwalteten Root-`.env` leeren, App und Worker neu erzeugen und prüfen, dass der Reiter „Nicht konfiguriert“ meldet. Der normale Review-, Generierungs- und Veröffentlichungsablauf bleibt dabei verfügbar; ein Datenbank-Restore ist dafür nicht erforderlich.

### 9.2 Lernregeln kontrolliert abnehmen

Nach Migration 009 und dem gemeinsamen Recreate im Adminbereich den Reiter „Lernregeln“ öffnen. Die Seite muss ohne technischen Fehler laden. Bei einem neuen System sind zunächst keine aktiven Regeln vorhanden. Ein Vorschlag darf erst erscheinen, nachdem dieselbe klassifizierte Fehlerkategorie bei mindestens drei unterschiedlichen KI-Artikeln beobachtet wurde. Mehrere Optimierungen desselben Artikels zählen dabei nur einmal.

Die neue Datenbankstruktur lässt sich vom Prompt `webadmin@ubuntu:~/apps/komplettwebdesign$` ohne Anzeige von Artikel- oder Providerinhalten prüfen:

```bash
docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atqc "SELECT to_regclass('\''public.content_learning_observations'\''), to_regclass('\''public.content_learning_rule_proposals'\''), to_regclass('\''public.content_learning_rules'\''), to_regclass('\''public.content_learning_rule_versions'\''), to_regclass('\''public.content_learning_events'\'');"'
docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atqc "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = '\''public'\'' AND table_name = '\''content_learning_rules'\'' AND column_name = '\''rule_revision'\'');"'
```

Die erste Ausgabe muss fünf vorhandene Tabellen nennen, die zweite Ausgabe muss `t` lauten. Im Adminbereich anschließend ausschließlich mit einem bewusst geprüften Vorschlag testen: Regeltext und Belege lesen, Regel aktivieren und kontrollieren, dass sie unter „Aktive und bisherige Regeln“ mit Version 1 erscheint. Der zugehörige Artikel muss weiterhin unveröffentlicht bleiben. Erst ein danach neu gestarteter Content-Job erhält die aktive Regelversion in seinem unveränderlichen Snapshot; bereits laufende oder abgeschlossene Jobs werden nicht rückwirkend verändert.

Eine Aktivierung, Änderung, Pausierung oder Deaktivierung benötigt immer den geschützten Admin-POST mit CSRF, ausdrücklicher Bestätigung und aktueller Version. Der Wirksamkeitsstatus bleibt bis zu fünf neuen Artikeln auf „Weiter beobachten“. Search-Console-Werte sind dort nur beschreibender Kontext und dürfen keine Regel automatisch ändern.

### 9.3 KI-Bestandsoptimierung kontrolliert abnehmen

Nach erfolgreicher Schema-Prüfung und gesundem Worker im Adminbereich den Reiter mit den bestehenden Inhalten öffnen. Für den kontrollierten KI-Bestandsoptimierungsauftrag genau einen bereits veröffentlichten Artikel mit `content_format=static_html` auswählen, dessen Livefassung vorher bewusst gelesen und dessen Titel, Slug sowie Änderungszeitpunkt notiert wurden. Die Aktion „Mit KI prüfen und optimieren“ genau einmal starten. Sie kann OpenAI-Kosten und bei festgestelltem Aktualitätsbedarf Kosten für die vorhandene OpenAI-Webrecherche verursachen. Keinen zweiten Auftrag anlegen, solange die Zeile „Optimierung läuft“, einen sicheren Wiederaufnahmezustand oder eine manuelle Providerklärung zeigt.

In „Jobs & Protokolle“ sowie in den Workerlogs prüfen, dass genau ein Auftrag vom Typ `optimize_existing_post` verarbeitet wird. Während des gesamten Laufs muss der öffentliche Artikel unverändert bleiben. Nach erfolgreichem Abschluss muss die Bestandsliste „Optimierung prüfen“ anbieten; die Vergleichsansicht zeigt die Livefassung links und die geschützte Revision rechts. Slug, Bild-URL, Inhaltsformat, Veröffentlichungsstatus und Veröffentlichungszeitpunkte dürfen in der Revision nicht verändert sein. Bei `legacy_ejs` muss zusätzlich der Artikeltext bytegenau unverändert bleiben.

Zunächst mindestens eine sichere Einzeländerung zurücknehmen und abwarten, bis die erneut gestartete Validierung einen terminalen Zustand erreicht. Erst danach die aktuelle Revisionsversion erneut prüfen. Für diesen technischen Abnahmelauf die Gesamtübernahme nur dann bestätigen, wenn Inhalt, Quellen, Qualitätsscore, Diff und verbleibende Befunde redaktionell geprüft wurden. Eine Übernahme muss den Livehash und die aktuelle Revisionsversion atomar prüfen; eine zwischenzeitliche Liveänderung muss stattdessen konfliktfrei abbrechen.

Nach einer bewussten Übernahme muss genau eine Zeile in `content_revision_optimization_outcomes` bestehen. Der gespeicherte Folgezeitraum beginnt am ersten vollständigen lokalen Kalendertag nach der Übernahme und umfasst 28 Tage. Die Auswertung darf erst nach vollständiger lokaler GSC-Tagesabdeckung erscheinen und bleibt als „Neutrale Beobachtung“ beziehungsweise „Noch nicht belastbar“ gekennzeichnet. Sie ändert oder verwirft niemals automatisch einen Artikel. Falls die Revision im Abnahmelauf nicht fachlich freigegeben werden kann, sie bewusst ablehnen; auch dann bleibt die Livefassung unverändert.

## 10. Normaler Rückfall ohne Datenbank-Restore

Der normale, schnelle Rückfall deaktiviert nur die neue Funktion. Die App bleibt online; die Website ist nicht vom Workerprozess abhängig. Aktive Jobs vor dem Stop über Logs und Datenbank beobachten und möglichst bis zu einem terminalen Status `completed` oder `failed` laufen lassen; ein Generierungslauf soll nicht mitten in einem externen Aufruf abgebrochen werden.

Bei einem fehlerhaften Release wird das geprüfte App-Image auf den in der Metadatendatei festgehaltenen Stand zurückgesetzt. Code und Worker werden nur dann gemeinsam zurückgesetzt beziehungsweise gestartet, wenn Dashboard-Schema, OCI-Contract, gespeicherter Ref und Git-Abstammung den konkreten alten Release nachweislich als kompatibel ausweisen. Legacy- und unbekannte Images erhalten ausschließlich einen Image-only-Rollback der App; der Worker bleibt gestoppt, `CONTENT_AGENT_ENABLED=false`, die Datenbank bleibt passend zu ihrem tatsächlich erkannten Schema pausiert und der Git-Checkout unverändert. Das Rollback-Image enthält den alten App-Code bereits; deshalb wird beim Rollback ausdrücklich **nicht neu gebaut**.

Das Datenbankschema bleibt forward-only und wird nicht destruktiv zurückgerollt. Daraus folgt ausdrücklich **keine pauschale Rückwärtskompatibilität älterer Releases**. Kompatibilität ist release-spezifisch und muss über Schemaerkennung, OCI-Contract, Git-Abstammung und den erfolgreichen App-Healthcheck belegt werden. Notwendige Schemankorrekturen erfolgen als neue vorwärtsgerichtete Migration.

Den folgenden Block als `~/apps/komplettwebdesign/deploy/rollback.sh` speichern. Das Skript erwartet den vom Deploy ausgegebenen absoluten Pfad zur geschützten Rollback-Metadatendatei als einziges Argument:

```bash
#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${HOME}/apps/komplettwebdesign"
COMPOSE_FILE="$ROOT/docker-compose.yml"
REPO_DIR="$ROOT/server"
ROLLBACK_DIR="$ROOT/data/rollbacks"
ROLLBACK_METADATA="${1:?Aufruf: rollback.sh ${HOME}/apps/komplettwebdesign/data/rollbacks/rollback-….env}"
CURRENT_WORKER_CONTRACT="dashboard-v1"
MIN_DASHBOARD_WORKER_REVISION="726df921b2285498eeca228588f8ec63945dd5fa"
OPERATION_LOCK="$ROOT/data/content-agent-deploy.lock"

fail() {
  printf '%s\n' "$1" >&2
  exit 1
}

acquire_operation_lock() {
  local lock_file="$1"
  command -v flock >/dev/null 2>&1 || fail "Linux-Werkzeug flock fehlt."
  exec 9>"$lock_file"
  chmod 600 "$lock_file"
  flock -n 9 || fail "Deploy oder Rollback läuft bereits."
}

classify_content_schema_state() {
  case "$1" in
    "1|1|1|0|1|1") printf 'dashboard\n' ;;
    "1|0|0|1|1|1") printf 'legacy002\n' ;;
    "0|0|0|0|0|0") printf 'first_deploy\n' ;;
    *) return 1 ;;
  esac
}

read_content_schema_facts() {
  docker compose -f "$COMPOSE_FILE" exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -AtF "|" -c "SELECT (to_regclass('\''public.content_agent_settings'\'') IS NOT NULL)::int, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = '\''public'\'' AND table_name = '\''content_agent_settings'\'' AND column_name = '\''agent_enabled'\'')::int, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = '\''public'\'' AND table_name = '\''content_agent_settings'\'' AND column_name = '\''operating_mode'\'')::int, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = '\''public'\'' AND table_name = '\''content_agent_settings'\'' AND column_name = '\''schedule_enabled'\'')::int, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = '\''public'\'' AND table_name = '\''content_agent_settings'\'' AND column_name = '\''auto_publish_enabled'\'')::int, (to_regclass('\''public.content_jobs'\'') IS NOT NULL)::int;"'
}

pause_content_agent() {
  case "$1" in
    dashboard)
      if test "$(docker compose -f "$COMPOSE_FILE" exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atqc "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = '\''public'\'' AND table_name = '\''content_agent_settings'\'' AND column_name = '\''schedule_revision'\'') AND to_regclass('\''public.content_agent_schedule_revisions'\'') IS NOT NULL;"')" = "t"; then
        PAUSED_STATE="$(docker compose -f "$COMPOSE_FILE" exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atqc "WITH current_settings AS (SELECT * FROM content_agent_settings WHERE id = 1 FOR UPDATE), updated AS (UPDATE content_agent_settings settings SET agent_enabled = FALSE, operating_mode = '\''review'\'', schedule_revision = settings.schedule_revision + CASE WHEN current_settings.agent_enabled THEN 1 ELSE 0 END, settings_version = settings.settings_version + 1, updated_at = NOW() FROM current_settings WHERE settings.id = current_settings.id RETURNING settings.*, current_settings.agent_enabled AS was_enabled), revision AS (INSERT INTO content_agent_schedule_revisions (revision, effective_at, agent_enabled, schedule_weekdays, schedule_time, timezone, generation_lead_hours) SELECT schedule_revision, updated_at, agent_enabled, schedule_weekdays, schedule_time, timezone, generation_lead_hours FROM updated WHERE was_enabled ON CONFLICT (revision) DO NOTHING) SELECT agent_enabled::text || '\''|'\'' || operating_mode FROM updated;"')"
      else
        PAUSED_STATE="$(docker compose -f "$COMPOSE_FILE" exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atqc "WITH current_settings AS (SELECT * FROM content_agent_settings WHERE id = 1 FOR UPDATE), updated AS (UPDATE content_agent_settings settings SET agent_enabled = FALSE, operating_mode = '\''review'\'', settings_version = settings.settings_version + 1, updated_at = NOW() FROM current_settings WHERE settings.id = current_settings.id RETURNING settings.*), revision AS (INSERT INTO content_agent_setting_revisions (settings_version, changed_keys, previous_values_json, new_values_json, admin_id, admin_username) SELECT updated.settings_version, ARRAY['\''agent_enabled'\'','\''operating_mode'\'']::TEXT[], to_jsonb(current_settings), to_jsonb(updated), NULL, '\''deploy-script'\'' FROM updated CROSS JOIN current_settings WHERE current_settings.agent_enabled IS DISTINCT FROM FALSE OR current_settings.operating_mode IS DISTINCT FROM '\''review'\'') SELECT agent_enabled::text || '\''|'\'' || operating_mode FROM updated;"')"
      fi
      test "$PAUSED_STATE" = "false|review"
      ;;
    legacy002)
      PAUSED_STATE="$(docker compose -f "$COMPOSE_FILE" exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atqc "UPDATE content_agent_settings SET schedule_enabled = FALSE, auto_publish_enabled = FALSE, updated_at = NOW() WHERE id = 1 RETURNING schedule_enabled::text || '\''|'\'' || auto_publish_enabled::text;"')"
      test "$PAUSED_STATE" = "false|false"
      ;;
    first_deploy) printf 'Keine Content-Agent-Tabellen zu pausieren.\n' ;;
    *) fail "Unbekannter Content-Agent-Datenbankzustand." ;;
  esac
}

is_dashboard_worker_compatible() {
  local contract="$1"
  local commit="$2"
  local rollback_ref="$3"
  local resolved_commit=""
  [[ "$contract" == "$CURRENT_WORKER_CONTRACT" ]] || return 1
  [[ "$commit" =~ ^[0-9a-f]{40}$ ]] || return 1
  [[ "$rollback_ref" =~ ^refs/deploy-rollbacks/[0-9]{8}T[0-9]{6}Z-[0-9a-f]{12}$ ]] || return 1
  resolved_commit="$(git rev-parse --verify "${rollback_ref}^{commit}" 2>/dev/null)" || return 1
  [[ "$resolved_commit" =~ ^[0-9a-f]{40}$ ]] || return 1
  [[ "$resolved_commit" == "$commit" ]] || return 1
  git merge-base --is-ancestor "$MIN_DASHBOARD_WORKER_REVISION" "$commit" || return 1
}

recreate_rollback_services() {
  case "$1" in
    true)
      docker compose -f "$COMPOSE_FILE" up -d --no-deps --force-recreate app content-worker
      ;;
    false)
      docker compose -f "$COMPOSE_FILE" up -d --no-deps --force-recreate app
      ;;
    *) fail "Unbekannte Worker-Kompatibilitätsentscheidung." ;;
  esac
}

wait_for_app_health() {
  local container_id=""
  local status=""
  local consecutive_successes=0

  for attempt in $(seq 1 60); do
    container_id="$(docker compose -f "$COMPOSE_FILE" ps -q app)"
    status="$(docker inspect --format '{{.State.Status}}' "$container_id" 2>/dev/null || true)"
    if [[ -n "$container_id" && "$status" == "running" ]] && docker compose -f "$COMPOSE_FILE" exec -T app node -e 'const http=require("node:http");const request=http.get({host:"localhost",port:3000,path:"/health",timeout:3000},response=>{let body="";response.setEncoding("utf8");response.on("data",chunk=>body+=chunk);response.on("end",()=>process.exit(response.statusCode===200&&body.trim()==="ok"?0:1));});request.on("timeout",()=>request.destroy(new Error("timeout")));request.on("error",()=>process.exit(1));'; then
      consecutive_successes=$((consecutive_successes + 1))
      if (( consecutive_successes >= 3 )); then
        return 0
      fi
    else
      consecutive_successes=0
    fi
    sleep 2
  done

  docker compose -f "$COMPOSE_FILE" ps app >&2 || true
  docker compose -f "$COMPOSE_FILE" logs --tail=100 app >&2 || true
  fail "App-Endpunkt /health war nicht dreimal hintereinander erfolgreich."
}

wait_for_service() {
  local service="$1"
  local expected="$2"
  local container_id=""
  local status=""
  local health=""

  for attempt in $(seq 1 60); do
    container_id="$(docker compose -f "$COMPOSE_FILE" ps -q "$service")"
    if [[ -n "$container_id" ]]; then
      status="$(docker inspect --format '{{.State.Status}}' "$container_id" 2>/dev/null || true)"
      health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$container_id" 2>/dev/null || true)"
      if [[ "$status" == "running" && "$expected" == "running" ]]; then
        return 0
      fi
      if [[ "$status" == "running" && "$expected" == "healthy" && "$health" == "healthy" ]]; then
        return 0
      fi
      if [[ "$status" == "exited" || "$status" == "dead" ]]; then
        break
      fi
    fi
    sleep 2
  done

  docker compose -f "$COMPOSE_FILE" ps "$service" >&2 || true
  docker compose -f "$COMPOSE_FILE" logs --tail=100 "$service" >&2 || true
  fail "Dienst $service wurde nicht rechtzeitig $expected."
}

cd "$ROOT"
test -d "$ROOT/data"
acquire_operation_lock "$OPERATION_LOCK"

test -f "$ROLLBACK_METADATA"
test ! -L "$ROLLBACK_METADATA"
ROLLBACK_METADATA="$(realpath -- "$ROLLBACK_METADATA")"
case "$ROLLBACK_METADATA" in
  "$ROLLBACK_DIR"/rollback-*.env) ;;
  *) fail "Rollback-Metadaten liegen außerhalb des geschützten Verzeichnisses." ;;
esac

METADATA_MODE="$(stat -c '%a' "$ROLLBACK_METADATA")"
METADATA_OWNER="$(stat -c '%u' "$ROLLBACK_METADATA")"
test "$METADATA_MODE" = "600"
test "$METADATA_OWNER" = "$(id -u)"
test "$(wc -l < "$ROLLBACK_METADATA" | tr -d ' ')" = "7"
sed -n '1p' "$ROLLBACK_METADATA" | grep -Eq '^ROLLBACK_IMAGE=komplettwebdesign-app:rollback-[0-9]{8}T[0-9]{6}Z-[0-9a-f]{12}$'
sed -n '2p' "$ROLLBACK_METADATA" | grep -Eq '^ROLLBACK_IMAGE_ID=sha256:[0-9a-f]{64}$'
sed -n '3p' "$ROLLBACK_METADATA" | grep -Eq '^ROLLBACK_COMMIT=(unknown|[0-9a-f]{40})$'
sed -n '4p' "$ROLLBACK_METADATA" | grep -Eq '^ROLLBACK_REF=(unknown|refs\/deploy-rollbacks\/[0-9]{8}T[0-9]{6}Z-[0-9a-f]{12})$'
sed -n '5p' "$ROLLBACK_METADATA" | grep -Eq '^ROLLBACK_SCHEMA_STATE=(dashboard|legacy002|first_deploy)$'
sed -n '6p' "$ROLLBACK_METADATA" | grep -Eq '^ROLLBACK_WORKER_CONTRACT=(dashboard-v1|unknown)$'
sed -n '7p' "$ROLLBACK_METADATA" | grep -Eq '^ROLLBACK_WORKER_COMPATIBILITY=(compatible|incompatible|unknown)$'
ROLLBACK_IMAGE="$(sed -n '1s/^ROLLBACK_IMAGE=//p' "$ROLLBACK_METADATA")"
ROLLBACK_IMAGE_ID="$(sed -n '2s/^ROLLBACK_IMAGE_ID=//p' "$ROLLBACK_METADATA")"
ROLLBACK_COMMIT="$(sed -n '3s/^ROLLBACK_COMMIT=//p' "$ROLLBACK_METADATA")"
ROLLBACK_REF="$(sed -n '4s/^ROLLBACK_REF=//p' "$ROLLBACK_METADATA")"
ROLLBACK_SCHEMA_STATE="$(sed -n '5s/^ROLLBACK_SCHEMA_STATE=//p' "$ROLLBACK_METADATA")"
ROLLBACK_WORKER_CONTRACT="$(sed -n '6s/^ROLLBACK_WORKER_CONTRACT=//p' "$ROLLBACK_METADATA")"
ROLLBACK_WORKER_COMPATIBILITY="$(sed -n '7s/^ROLLBACK_WORKER_COMPATIBILITY=//p' "$ROLLBACK_METADATA")"

if ! [[ "$ROLLBACK_IMAGE" =~ ^komplettwebdesign-app:rollback-[0-9]{8}T[0-9]{6}Z-[0-9a-f]{12}$ ]]; then
  fail "Rollback-Image ist ungültig."
fi
if ! [[ "$ROLLBACK_IMAGE_ID" =~ ^sha256:[0-9a-f]{64}$ ]]; then
  fail "Rollback-Image-ID ist ungültig."
fi
if [[ "$ROLLBACK_COMMIT" == "unknown" || "$ROLLBACK_REF" == "unknown" ]]; then
  if [[ "$ROLLBACK_COMMIT" != "unknown" || "$ROLLBACK_REF" != "unknown" ]]; then
    fail "Rollback-Commit und Rollback-Ref müssen gemeinsam bekannt oder unbekannt sein."
  fi
else
  if ! [[ "$ROLLBACK_COMMIT" =~ ^[0-9a-f]{40}$ ]]; then
    fail "Rollback-Commit ist ungültig."
  fi
  if ! [[ "$ROLLBACK_REF" =~ ^refs/deploy-rollbacks/[0-9]{8}T[0-9]{6}Z-[0-9a-f]{12}$ ]]; then
    fail "Rollback-Ref ist ungültig."
  fi
fi

test -f "$COMPOSE_FILE"
test -f "$ROOT/.env"
test -e "$REPO_DIR/.git"
docker compose -f "$COMPOSE_FILE" config --quiet
docker image inspect "$ROLLBACK_IMAGE" >/dev/null
ACTUAL_ROLLBACK_IMAGE_ID="$(docker image inspect --format '{{.Id}}' "$ROLLBACK_IMAGE")"
test "$ACTUAL_ROLLBACK_IMAGE_ID" = "$ROLLBACK_IMAGE_ID"
if ! git config --global --get-all safe.directory | grep -Fxq "$REPO_DIR"; then
  git config --global --add safe.directory "$REPO_DIR"
fi

CURRENT_SCHEMA_FACTS="$(read_content_schema_facts)" || fail "Content-Agent-Schema konnte nicht gelesen werden."
CURRENT_SCHEMA_STATE="$(classify_content_schema_state "$CURRENT_SCHEMA_FACTS")" || fail "Unbekannter oder partieller Content-Agent-Datenbankzustand: $CURRENT_SCHEMA_FACTS"
printf 'Content-Agent-Schema beim Rollback: %s; vor Deploy: %s\n' "$CURRENT_SCHEMA_STATE" "$ROLLBACK_SCHEMA_STATE"
pause_content_agent "$CURRENT_SCHEMA_STATE"

ROLLBACK_WORKER_ALLOWED=false
if [[ "$ROLLBACK_WORKER_COMPATIBILITY" == "compatible" ]]; then
  if [[ "$CURRENT_SCHEMA_STATE" == "dashboard" ]] && is_dashboard_worker_compatible "$ROLLBACK_WORKER_CONTRACT" "$ROLLBACK_COMMIT" "$ROLLBACK_REF"; then
    ROLLBACK_WORKER_ALLOWED=true
  else
    printf 'Worker-Rollback bleibt aus: Dashboard-Schema, Contract oder Git-Abstammung ist nicht sicher kompatibel.\n' >&2
  fi
fi

running_job_count() {
  case "$CURRENT_SCHEMA_STATE" in
    dashboard|legacy002)
      docker compose -f "$COMPOSE_FILE" exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atqc "SELECT count(*) FROM content_jobs WHERE status = '\''running'\'';"'
      ;;
    first_deploy) printf '0\n' ;;
    *) fail "Unbekannter Zustand der Jobtabelle." ;;
  esac
}

RUNNING_JOB_COUNT="$(running_job_count)"
if ! [[ "$RUNNING_JOB_COUNT" =~ ^[0-9]+$ ]]; then
  fail "Laufende Jobs konnten nicht sicher bestimmt werden."
fi
if [[ "$RUNNING_JOB_COUNT" != "0" ]]; then
  fail "Agent ist pausiert, aber ein Job läuft noch. Abschluss abwarten und Rollback erneut starten."
fi

WORKER_CONTAINER_ID="$(docker compose -f "$COMPOSE_FILE" ps -q content-worker)"
if [[ -n "$WORKER_CONTAINER_ID" ]]; then
  docker compose -f "$COMPOSE_FILE" stop -t 600 content-worker
fi

POST_STOP_RUNNING_JOB_COUNT="$(running_job_count)"
if ! [[ "$POST_STOP_RUNNING_JOB_COUNT" =~ ^[0-9]+$ && "$POST_STOP_RUNNING_JOB_COUNT" == "0" ]]; then
  fail "Jobstatus nach Worker-Stopp ist nicht sicher leer."
fi

if [[ "$ROLLBACK_WORKER_ALLOWED" == "true" ]]; then
  cd "$REPO_DIR"
  git reset --hard "$ROLLBACK_COMMIT"
else
  printf 'Image-only-Rollback: App wird zurückgesetzt; Worker bleibt wegen unbekannter oder inkompatibler Revision gestoppt. Git-Checkout bleibt unverändert.\n' >&2
fi
cd "$ROOT"
docker image tag "$ROLLBACK_IMAGE" komplettwebdesign-app:local
docker image inspect komplettwebdesign-app:local >/dev/null

if ! grep -Eq '^CONTENT_AGENT_ENABLED=(true|false)$' "$ROOT/.env"; then
  fail "CONTENT_AGENT_ENABLED fehlt oder besitzt einen unbekannten Wert."
fi
if [[ "$ROLLBACK_WORKER_ALLOWED" == "true" ]]; then
  sed -i 's/^CONTENT_AGENT_ENABLED=.*/CONTENT_AGENT_ENABLED=true/' "$ROOT/.env"
else
  sed -i 's/^CONTENT_AGENT_ENABLED=.*/CONTENT_AGENT_ENABLED=false/' "$ROOT/.env"
fi
chmod 600 "$ROOT/.env"

recreate_rollback_services "$ROLLBACK_WORKER_ALLOWED"
wait_for_app_health
if [[ "$ROLLBACK_WORKER_ALLOWED" == "true" ]]; then
  wait_for_service content-worker healthy
  docker compose -f "$COMPOSE_FILE" exec -T content-worker npm run content-agent:healthcheck
fi
if [[ "${KWD_CHECK_EXTERNAL_HEALTH:-false}" == "true" ]]; then
  command -v curl >/dev/null 2>&1 || fail "Optionaler externer Healthcheck verlangt curl."
  curl --fail --silent --show-error --max-time 10 https://www.komplettwebdesign.de/health | grep -Fxq ok
fi
docker compose -f "$COMPOSE_FILE" ps app content-worker
docker compose -f "$COMPOSE_FILE" logs --tail=100 app content-worker
```

Nach dem Speichern Rechte und Syntax prüfen und dann den exakten, zuvor vom Deploy ausgegebenen Metadatenpfad übergeben:

```bash
chmod 700 deploy/rollback.sh
bash -n deploy/rollback.sh
./deploy/rollback.sh "$HOME/apps/komplettwebdesign/data/rollbacks/rollback-YYYYMMDDTHHMMSSZ-aaaaaaaaaaaa.env"
```

Die Datei wird ohne `source` auf reguläre Datei, Pfad, Eigentümer, Modus `600`, exakt sieben positionsgebundene Werte und sichere Formate geprüft. Zusätzlich muss der unveränderliche Tag weiterhin exakt auf die gespeicherte Image-ID zeigen. Der aktuelle Datenbankzustand wird erneut über dieselbe Schema-State-Machine erkannt und mit der jeweils gültigen Spaltenmenge pausiert. Nur eine als `compatible` gespeicherte und erneut über Dashboard-Schema, `dashboard-v1`, geschützten Ref und Git-Abstammung bestätigte Revision darf Checkout und Worker zurücksetzen. Andernfalls erfolgt ausdrücklich ein App-Image-only-Rollback mit Warnung; Git bleibt unverändert, der Worker gestoppt und das technische Gate wird auf `false` gesetzt. Das App-Image wird immer auf `komplettwebdesign-app:local` zurückgetaggt und niemals neu gebaut. Der interne App-Endpunkt muss danach erneut dreimal stabil erfolgreich sein; nur im kompatiblen Pfad werden zusätzlich Worker, Worker-Healthcheck und `CONTENT_AGENT_ENABLED=true` aktiviert.

`-t 600` entspricht `stop_grace_period: 10m`. Der Worker erhält `SIGTERM`, stoppt Polling und Scheduler und wartet nach seiner ersten internen 30-Sekunden-Drainphase weiter auf den aktiven Job. Erst nach 600 Sekunden würde Docker hart beenden. Ist ein Job dann noch aktiv, den Stop nach Möglichkeit abbrechen und die Ursache untersuchen; nur im Notfall den harten Abbruch in Kauf nehmen.

Bei einem harten Abbruch bleibt der Datensatz zunächst `running`. Die Lease-Recovery setzt ihn nach Ablauf der konfigurierten Job-Lease wieder auf `queued`, solange `attempts < max_attempts`; andernfalls wird er `failed`. Deshalb vor und nach jedem Wiederanlauf Status, `locked_at`, `attempts` und Laufprotokolle prüfen, statt sofort einen zweiten manuellen Job anzulegen.

Den `content-worker`-Block kann man später in einem geplanten Wartungsfenster aus der Compose-Datei entfernen. Additive Spalten und Tabellen nicht übereilt löschen. Sie stören den Webprozess nicht und ihre Löschung würde Diagnose- und Entwurfsdaten vernichten.

Ein Datenbank-Restore ist **kein normaler Rollback**. Er ist eine getrennte, bewusst destruktive Notfalloption, weil er alle seit dem Backup geschriebenen Daten verlieren kann. Nur nach bestätigtem Wartungsfenster, gestoppten schreibenden Diensten, erneut geprüftem Backup und einem für diese PostgreSQL-Instanz getesteten Restore-Plan durchführen. Keinen `pg_restore --clean`-Befehl ungeprüft gegen die Produktionsdatenbank ausführen.

## 11. Kontrollierter Wiederanlauf nach einem Rückfall

Beim Wiederanlauf reicht `docker compose start` nicht: Ein gestoppter Container behält seine alte Umgebung. `CONTENT_AGENT_ENABLED=true` setzen und App sowie Worker zwingend neu erzeugen. Vorher zurückgebliebene Jobs und Queue-Einträge prüfen; keinen Ersatzjob anlegen, solange ein alter Job noch `running` oder wieder `queued` ist.

```bash
docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT id, status, attempts, max_attempts, locked_at, locked_by FROM content_jobs WHERE status IN ('\''queued'\'', '\''running'\'', '\''failed'\'') ORDER BY id DESC LIMIT 20;"'
sed -i 's/^CONTENT_AGENT_ENABLED=.*/CONTENT_AGENT_ENABLED=true/' .env
docker compose up -d --force-recreate app content-worker
WORKER_HEALTH=""
for attempt in $(seq 1 60); do
  WORKER_ID="$(docker compose ps -q content-worker)"
  if [[ -n "$WORKER_ID" ]]; then
    WORKER_HEALTH="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$WORKER_ID" 2>/dev/null || true)"
    if [[ "$WORKER_HEALTH" == "healthy" ]]; then
      break
    fi
  fi
  sleep 2
done
test "$WORKER_HEALTH" = "healthy"
docker compose ps app content-worker
docker compose exec -T content-worker npm run content-agent:healthcheck
docker compose logs --tail=100 content-worker
docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT id, status, attempts, max_attempts, locked_at, locked_by FROM content_jobs WHERE status IN ('\''queued'\'', '\''running'\'', '\''failed'\'') ORDER BY id DESC LIMIT 20;"'
```

Der Healthcheck muss gesund sein. Bei einer zuvor erzwungenen Beendigung kann der alte Job bis zum Ablauf seiner Lease noch `running` bleiben; der laufende Worker prüft die Lease-Recovery in seinen Pollzyklen. Logs und Datenbank weiter beobachten, bis jeder zurückgebliebene Job plausibel `queued`, `running`, `completed` oder `failed` ist.

## 12. Fehlerbehebung

### Worker ist `unhealthy`

```bash
docker compose ps
docker compose logs --tail=200 content-worker
docker inspect --format '{{json .State.Health}}' "$(docker compose ps -q content-worker)"
docker compose exec -T content-worker npm run content-agent:healthcheck
```

Prüfen, ob `CONTENT_AGENT_ENABLED=true` im Worker ankommt, PostgreSQL `healthy` ist und seit weniger als 90 Sekunden ein Heartbeat geschrieben wurde. Keine `.env`-Werte vollständig ausgeben.

### Migration fehlt

Typische Hinweise sind `relation "content_worker_state" does not exist` oder fehlende `content_*`-Tabellen. Tabellenbestand prüfen und die idempotente Migration erneut ausführen:

```bash
docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\\dt content_*"'
docker compose run --rm app npm run migrate:content-agent
```

### Zeitzone oder Ausführungszeit ist falsch

Zeitplan und IANA-Zeitzone werden in PostgreSQL gepflegt. Zuerst die Dashboard-Einstellung und anschließend den tatsächlich gespeicherten Betriebswert prüfen; die Hostzeitzone ist dafür nicht maßgeblich:

```bash
date
timedatectl status
docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT agent_enabled, schedule_weekdays, schedule_time, timezone FROM content_agent_settings WHERE id = 1;"'
```

Erwartet sind im Ausgangszustand die Wochentage `{1,4}`, `18:00:00` und `Europe/Berlin`. Korrekturen ausschließlich über das Content-Agent-Dashboard speichern und danach Schedulerstatus sowie Workerlogs kontrollieren; dafür ist kein Container-Recreate notwendig.

### OpenAI-API hat keine Berechtigung

Bei `401`, `403`, unbekanntem Modell oder fehlender Abrechnung die Workerlogs prüfen. Im OpenAI-Projekt kontrollieren, ob der vorhandene API-Zugang aktiv ist, zu genau diesem Projekt gehört, die drei konfigurierten Modelle verwenden darf und Abrechnung sowie providerseitiges Budget eingerichtet sind. Den API-Wert niemals mit `env`, `printenv` oder `docker compose config` in ein Ticket kopieren.

### Interne oder providerseitige Budgetgrenze ist erreicht

Die Meldung `Monatliches Content-Agent-Budget erreicht.` bezeichnet die interne Grenze `CONTENT_AGENT_MONTHLY_COST_LIMIT_EUR`. Abgerechnete Token, Bildkosten und hinterlegte Kostensätze prüfen, nicht einfach die Grenze erhöhen. Eine OpenAI-seitige Ablehnung wird im Providerprojekt geprüft. Beide Grenzen sind unabhängig; die strengere Grenze gewinnt.

### Cloudinary-Upload oder -Bereinigung schlägt fehl

Vorhandenen Cloudinary-Zugang, Upload-/Löschberechtigung, Cloud-Namen und ausgehende Netzwerkverbindung prüfen. Ohne Geheimnisse anzuzeigen lässt sich nur der Belegungsstatus der nötigen Variablen ausgeben:

```bash
docker compose exec -T content-worker node -e 'for (const k of ["CLOUDINARY_CLOUD_NAME","CLOUDINARY_API_KEY","CLOUDINARY_API_SECRET"]) console.log(k, process.env[k] ? "gesetzt" : "FEHLT")'
docker compose logs --tail=200 content-worker
```

Bei einem fehlgeschlagenen Lauf auch in Cloudinary nach einem verwaisten Asset suchen; die öffentliche ID steht in den Laufmetadaten, nicht der API-Schlüssel.

### Datenbank-Heartbeat fehlt oder ist veraltet

```bash
docker compose exec -T postgres sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT worker_name, worker_id, heartbeat_at, NOW() - heartbeat_at AS age, last_job_at FROM content_worker_state;"'
docker compose logs --tail=200 content-worker
```

Ist PostgreSQL erreichbar, aber der Heartbeat älter als 90 Sekunden, zuerst Workerfehler und einen eventuell hängenden Job untersuchen. Erst danach gezielt nur den Worker mit `docker compose restart content-worker` neu starten.
