# Content-Agent auf dem IONOS-VPS bereitstellen

Diese Anleitung ergänzt das bestehende Compose-Projekt `komplettwebdesign` um genau einen internen `content-worker`. Sie ist **keine vollständige Ersatzdatei** für die vorhandene `docker-compose.yml`.

Die vorhandenen Dienste `app`, `webhook`, `pgadmin` und `postgres` bleiben erhalten. Das gilt auch für alle App-Volumes für Uploads und Downloads, `expose: 3000`, die Netzwerke `default` und `proxy`, sämtliche Traefik-Labels sowie das persistente PostgreSQL-Volume `./data/postgres` und den vorhandenen WireGuard-Port. Am Worker werden keine `ports`, kein `expose`, keine Traefik-Labels und kein Proxy-Netzwerk ergänzt. Er hängt nur im Compose-Netzwerk `default` und nutzt ausgehend OpenAI und Cloudinary.

## 1. Projektpfad und Ausgangslage prüfen

Die folgenden Befehle werden im Verzeichnis mit der vorhandenen `docker-compose.yml` ausgeführt. Wegen des bestehenden Build-Kontexts `./server` ist das auf dem VPS vermutlich die übergeordnete Ebene, die den Unterordner `server/` enthält, zum Beispiel `/home/webadmin/apps/komplettwebdesign`. Liegt das Repository oder die Compose-Datei an einem anderen Ort, muss der `cd`-Pfad angepasst werden.

```bash
cd /home/webadmin/apps/komplettwebdesign
pwd
test -f docker-compose.yml
test -d ./server
docker compose version
docker compose config --quiet
df -h . /var/lib/docker 2>/dev/null || df -h .
docker system df
```

`docker compose config --quiet` prüft die aktuelle Datei, ohne die aufgelöste Konfiguration und damit möglicherweise Zugangsdaten auszugeben. Vor Backup und Image-Build muss auf dem Dateisystem mit dem Projekt, dem Backup und dem Docker-Datenverzeichnis ausreichend freier Speicher vorhanden sein. Hier nicht vorschnell `docker system prune` ausführen.

## 2. Releaseprüfung des Anwendungsstands

Diese Prüfung läuft im Quellordner mit der `package.json`, laut Compose also in `./server`. Das verwendete `test-key` ist nur ein nicht geheimes Test-Dummy; echte Zugangsdaten gehören weder in die Shell-Historie noch in Logs.

```bash
cd /home/webadmin/apps/komplettwebdesign/server
node --test tests/contentAgentDeploymentGuide.test.js
npm run build
OPENAI_API_KEY=test-key npm test
cd ..
```

Alle drei Befehle müssen erfolgreich enden, bevor die Serverkonfiguration geändert wird.

## 3. PostgreSQL-Backup erstellen und prüfen

Das Custom-Format erhält die Struktur und Datenbankinhalte. `umask 077`, Verzeichnisrechte `700` und Dateirechte `600` verhindern, dass andere lokale Benutzer das Backup lesen. Das Backup enthält sensible Produktionsdaten und darf nicht in Git oder in einen öffentlich erreichbaren Ordner gelangen.

```bash
cd /home/webadmin/apps/komplettwebdesign
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

Nur fortfahren, wenn sowohl `test -s` als auch `pg_restore -l` mit Exitcode `0` enden. Der Zeitstempel verhindert das Überschreiben eines älteren Backups.

## 4. Nur die notwendigen Compose-Blöcke ändern

Vor der Bearbeitung eine Arbeitskopie der Compose-Datei anlegen:

```bash
cp -p docker-compose.yml "docker-compose.yml.before-content-worker-$(date +%Y%m%d-%H%M%S)"
```

Die folgenden Ausschnitte zeigen ausschließlich die Änderungen. Auslassungen sind absichtlich nicht als komplette Compose-Datei dargestellt.

### 4.1 `app.image` ergänzen und den vorhandenen Build explizit benennen

Direkt im vorhandenen `app`-Block `image` ergänzen. Falls `build` derzeit als Kurzform `build: ./server` geschrieben ist, diesen Eintrag in die gezeigte gleichwertige Langform ändern:

```yaml
services:
  app:
    image: komplettwebdesign-app:local
    build:
      context: ./server
```

Alle weiteren vorhandenen `app`-Einträge bleiben direkt darunter unverändert, insbesondere `env_file`, `networks` mit `default` und `proxy`, `expose: 3000`, Upload-/Download-Volumes und Traefik-Labels. Der explizite Image-Name sorgt dafür, dass `app` und `content-worker` exakt dasselbe lokal gebaute Image verwenden.

### 4.2 `app.depends_on` auf den PostgreSQL-Healthstatus umstellen

Den bisherigen PostgreSQL-Eintrag in `app.depends_on` durch diese Mapping-Form ersetzen. Falls `app` noch von weiteren Diensten abhängt, bleiben deren Einträge im selben `depends_on`-Block erhalten.

```yaml
services:
  app:
    depends_on:
      postgres:
        condition: service_healthy
```

### 4.3 `postgres.healthcheck` ergänzen

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

### 4.4 Den neuen `content-worker` einfügen

Den folgenden Block auf derselben Einrückungsebene wie `app`, `webhook`, `pgadmin` und `postgres` unter `services:` einfügen:

```yaml
services:
  content-worker:
    image: komplettwebdesign-app:local
    env_file:
      - .env
    restart: unless-stopped
    init: true
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
```

Der Worker erhält bewusst keine `build`-Anweisung: `docker compose build app` baut und markiert das gemeinsam verwendete Image `komplettwebdesign-app:local`. Ebenso erhält der Worker keine `ports`, keinen `expose`-Block, keine Traefik-Labels, kein `proxy`-Netzwerk und keine zusätzlichen Volumes.

## 5. Content-Agent-Konfiguration in `.env` ergänzen

Die vorhandenen Zugangsdaten für OpenAI, Cloudinary und PostgreSQL bleiben unverändert in der bereits genutzten `.env`; ihre Werte werden hier absichtlich nicht abgedruckt. Nur die folgenden Plan-A-Werte ergänzen oder vorhandene Einträge entsprechend ändern:

```dotenv
CONTENT_AGENT_ENABLED=true
CONTENT_AGENT_PUBLISH_MODE=draft
CONTENT_AGENT_SCHEDULE=0 9 * * 1
CONTENT_AGENT_TIMEZONE=Europe/Berlin
CONTENT_AGENT_MAX_TOPIC_CANDIDATES=8
CONTENT_AGENT_MAX_REVISIONS=2
CONTENT_AGENT_MAX_ATTEMPTS=3
CONTENT_AGENT_MONTHLY_COST_LIMIT_EUR=25
CONTENT_AGENT_AUTOPUBLISH_ENABLED=false
OPENAI_CONTENT_MODEL=gpt-5.4
OPENAI_REVIEW_MODEL=gpt-5.4-mini
OPENAI_IMAGE_MODEL=gpt-image-2
OPENAI_CONTENT_INPUT_COST_PER_MTOK=2.50
OPENAI_CONTENT_OUTPUT_COST_PER_MTOK=15
OPENAI_REVIEW_INPUT_COST_PER_MTOK=0.75
OPENAI_REVIEW_OUTPUT_COST_PER_MTOK=4.50
OPENAI_IMAGE_COST_EUR=0.041
```

`CONTENT_AGENT_PUBLISH_MODE=draft` und insbesondere `CONTENT_AGENT_AUTOPUBLISH_ENABLED=false` sind für Plan A verbindlich: Beiträge werden nicht automatisch veröffentlicht. Die Kostensätze sind Konfigurationswerte und müssen vor dem Livebetrieb mit dem eigenen OpenAI-Vertrag und der aktuellen OpenAI-Preisseite abgeglichen werden. Zusätzlich ist im OpenAI-Projekt ein providerseitiges Projektbudget als äußere Kostengrenze zu setzen; dabei auch prüfen, ob der Anbieter es als harte Grenze oder als Warnschwelle umsetzt. Die interne Monatsgrenze von 25 EUR ersetzt diese providerseitige Grenze nicht.

Für Plan A ist kein Search-Console-API-Zugang erforderlich; die Search Console folgt erst in Plan C.

## 6. Konfiguration validieren, Image bauen und Migration prüfen

Zuerst die bearbeitete Compose-Datei erneut prüfen. Die Befehle danach bauen nur `app`; der Worker verwendet dasselbe explizit benannte App-Image.

```bash
cd /home/webadmin/apps/komplettwebdesign
docker compose config --quiet
docker compose config --services
docker compose build app
docker image inspect komplettwebdesign-app:local >/dev/null
```

Führe die Migration zweimal aus, um ihre Idempotenz praktisch zu belegen. Beide Läufe müssen `Content-Agent-Migration 002 erfolgreich.` melden:

```bash
docker compose run --rm app npm run migrate:content-agent
docker compose run --rm app npm run migrate:content-agent
```

Vor dem Workerstart folgt zwingend der lokale Dry-Run. Er verwendet simulierte Adapter und muss in seinem JSON-Ergebnis `"externalCalls":0`, `"articleValid":true` und `"publishMode":"draft"` melden:

```bash
docker compose run --rm app npm run content-agent:dry-run
```

Ein abweichendes Ergebnis ist ein Abbruchkriterium; in diesem Fall den Worker nicht starten.

## 7. Erst die App, dann den Worker starten

Die Dienste absichtlich in zwei Schritten hochfahren. Durch `condition: service_healthy` startet die App erst nach einem erfolgreichen PostgreSQL-Healthcheck.

```bash
docker compose up -d app
docker compose ps postgres app
docker compose logs --tail=100 app

docker compose up -d content-worker
docker compose ps
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

## 8. Kontrollierter Plan-A-Abnahmelauf

Der Dry-Run verursacht null externe Aufrufe. Einen echten Queuejob erst nach bestätigten API-Berechtigungen, Kostensätzen und Budgets bewusst einplanen, da er OpenAI- und Cloudinary-Kosten verursacht. Für den Abnahmelauf eine einmalige Idempotenz-ID verwenden:

```bash
docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "INSERT INTO content_jobs (job_type, idempotency_key, payload_json, max_attempts) VALUES ('\''generate_manual_draft'\'', '\''release-check:'\'' || to_char(clock_timestamp(), '\''YYYYMMDDHH24MISSMS'\''), '\''{\"source\":\"release-check\"}'\''::jsonb, 3) RETURNING id, idempotency_key;"'
docker compose logs -f content-worker
```

Nach dem terminalen Jobstatus müssen genau ein zugehöriger, unveröffentlichter Beitrag und sein Format geprüft werden:

```bash
docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "WITH latest AS (SELECT id FROM content_jobs WHERE idempotency_key LIKE '\''release-check:%'\'' ORDER BY id DESC LIMIT 1) SELECT j.id AS job_id, j.status AS job_status, r.id AS run_id, r.status AS run_status, p.id AS post_id, p.published, p.workflow_status, p.content_format, (p.content ~* '\''<h1[ >]'\'') AS contains_h1, (p.content LIKE '\''%<\\%%'\'') AS contains_ejs FROM latest l JOIN content_jobs j ON j.id = l.id LEFT JOIN content_runs r ON r.job_id = j.id LEFT JOIN posts p ON p.id = r.post_id;"'
```

Erwartet sind genau eine Ergebniszeile, `published = false`, `workflow_status = needs_review`, `content_format = static_html`, `contains_h1 = false` und `contains_ejs = false`. Den Entwurf zusätzlich in der vorhandenen Admin-Vorschau öffnen: Er muss ohne EJS-Auswertung, ohne zweite H1 und ohne Veröffentlichung rendern.

## 9. Normaler Rückfall ohne Datenbank-Restore

Der normale, schnelle Rückfall deaktiviert nur die neue Funktion. Die App bleibt online; die Website ist nicht vom Workerprozess abhängig.

```bash
cd /home/webadmin/apps/komplettwebdesign
docker compose stop content-worker
sed -i 's/^CONTENT_AGENT_ENABLED=.*/CONTENT_AGENT_ENABLED=false/' .env
docker compose up -d app
docker compose ps app content-worker
```

Den `content-worker`-Block kann man später in einem geplanten Wartungsfenster aus der Compose-Datei entfernen. Additive Spalten und Tabellen nicht übereilt löschen. Sie stören den Webprozess nicht und ihre Löschung würde Diagnose- und Entwurfsdaten vernichten.

Ein Datenbank-Restore ist **kein normaler Rollback**. Er ist eine getrennte, bewusst destruktive Notfalloption, weil er alle seit dem Backup geschriebenen Daten verlieren kann. Nur nach bestätigtem Wartungsfenster, gestoppten schreibenden Diensten, erneut geprüftem Backup und einem für diese PostgreSQL-Instanz getesteten Restore-Plan durchführen. Keinen `pg_restore --clean`-Befehl ungeprüft gegen die Produktionsdatenbank ausführen.

## 10. Fehlerbehebung

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

Der Cron-Ausdruck läuft ausdrücklich in `Europe/Berlin`. Hostzeit und die im Worker verwendete IANA-Zeitzone prüfen:

```bash
date
timedatectl status
docker compose exec -T content-worker node -e 'const z=process.env.CONTENT_AGENT_TIMEZONE; console.log(z, new Intl.DateTimeFormat("de-DE", {dateStyle:"full", timeStyle:"long", timeZone:z}).format(new Date()))'
```

Bei einer Korrektur der `.env` nur den Worker mit `docker compose up -d --force-recreate content-worker` neu erzeugen.

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
