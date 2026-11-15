# Cookavoli: live-auditierter VPS-, Traefik-, Mail- und DNS-Rollout

<!-- markdownlint-disable MD013 -->

Status: verbindliche Betriebsanleitung, noch nicht produktiv angewendet  
Stand: 29. September 2026  
Referenz: `/Users/blocksdorf/development/SwipeAndCook/docs/Cookavoli_Rebranding_Migration_Masterplan.md`

## Ziel und unveränderliche Leitplanken

Diese Anleitung migriert Cookavoli additiv auf die neuen Domains. Sie ersetzt
weder die bestehende App-Identität noch die bestehende Datenbank oder den alten
API-Host.

- Der alte API-Host `api.swipeandcook.komplettwebdesign.de` bleibt erreichbar.
- Bundle-ID, Android-`applicationId`, Store-Einträge, Signing, Produkt-IDs,
  Datenbank-IDs und Nutzerkonten bleiben unverändert.
- `cookavoli.com` wird die kanonische Website.
- `www.cookavoli.com`, `cookavoli.de` und `www.cookavoli.de` leiten dauerhaft
  und pfaderhaltend auf `https://cookavoli.com` um.
- `api.cookavoli.com` wird ein zweiter Host für denselben bestehenden
  Backend-Service.
- Mail bleibt bei manitu; Website und API laufen auf dem VPS.
- Der zentrale Traefik-Container wird für diesen Rollout nicht neu gestartet.
- Die externe Kontolöschung bleibt deaktiviert, bis Website, API, Mail und der
  vollständige Ende-zu-Ende-Test separat freigegeben wurden.
- Keine Secretwerte werden in Git, Compose-Dateien, Shell-Historien oder diese
  Anleitung geschrieben.

## 1. Live-Audit vom 29. September 2026

Der VPS wurde über den vorhandenen SSH-Alias `ionos-vps1` ausschließlich lesend
geprüft. Während des Audits wurden weder Container noch Dateien, DNS-Einträge
oder Konfigurationen verändert.

### 1.1 Host und IP

| Eigenschaft | Live-Wert |
| --- | --- |
| SSH-Benutzer | `webadmin` |
| Hostname | `ubuntu` |
| öffentliche IPv4 | `217.154.89.44` |
| globale VPS-IPv6 | nicht vorhanden |
| IPv6-Default-Route | nicht vorhanden |

Für Cookavoli darf deshalb aktuell kein AAAA-Record auf den VPS zeigen.

### 1.2 Docker-Compose-Projekte auf dem VPS

| Compose-Projekt | Pfad | Bedeutung |
| --- | --- | --- |
| `infra` | `/home/webadmin/apps/_infra` | zentraler Traefik |
| `komplettwebdesign` | `/home/webadmin/apps/komplettwebdesign` | bestehende Website-Infrastruktur |
| `swipe-and-cook-vps` | `/home/webadmin/apps/SwipeAndCook` | Cookavoli-/SwipeAndCook-Backend |
| `kurdischesfestival` | separates Projekt | nicht Teil dieses Rollouts |
| `sauber-mehr` | separates Projekt | nicht Teil dieses Rollouts |

Die beiden fremden Projekte werden nicht verändert.

### 1.3 Zentraler Traefik

| Ebene | Live-Wert |
| --- | --- |
| Compose-Projekt | `infra` |
| Compose-Service | `traefik` |
| Container | `infra-traefik-1` |
| Image | `traefik:v2.11` |
| Docker-Netzwerk | `proxy` |
| EntryPoints | `web` auf Port 80, `websecure` auf Port 443 |
| Zertifikatsresolver | `le` |
| ACME-Challenge | HTTP-01 über EntryPoint `web` |
| Docker-Provider | aktiv, `exposedByDefault=false` |

Traefik beobachtet Docker-Labels automatisch. Neue oder geänderte Labels werden
beim Erstellen des jeweiligen Anwendungscontainers erkannt. Deshalb gilt:

> Für SMTP-, API- oder Websiteänderungen weder `infra-traefik-1` noch den
> gesamten Stack `infra` neu starten.

Ein Traefik-Neustart wäre nur für Änderungen an seiner statischen Konfiguration
unter `/home/webadmin/apps/_infra/docker-compose.yml` erforderlich. Solche
Änderungen sind nicht Teil dieses Rollouts.

### 1.4 Backend-Stack `swipe-and-cook-vps`

Produktive Dateien:

| Zweck | Live-Pfad |
| --- | --- |
| Projekt | `/home/webadmin/apps/SwipeAndCook` |
| Environment | `/home/webadmin/apps/SwipeAndCook/.env` |
| Basis-Compose | `/home/webadmin/apps/SwipeAndCook/vps_setup/docker-compose.template.yml` |
| Traefik-Override | `/home/webadmin/apps/SwipeAndCook/vps_setup/docker-compose.traefik.yml` |
| Deployskript | `/home/webadmin/apps/SwipeAndCook/vps_setup/deploy/deploy.sh` |

Die produktive `.env` besitzt Modus `0600` und gehört `webadmin:webadmin`.

Deklarierte Services:

| Compose-Service | Live-Zustand | Zweck/Port |
| --- | --- | --- |
| `app` | läuft, gesund | eigentliche API, `127.0.0.1:8080` |
| `postgres` | läuft, gesund | PostgreSQL, `10.10.0.1:5435` |
| `pgbouncer` | läuft, gesund | interner DB-Pool, Port 5432 im Container |
| `recipe-pool-worker` | läuft | Rezeptpool-Worker |
| `recipe-image-worker` | läuft | Bild-Worker |
| `recipe-variant-worker` | läuft, gesund | Varianten-Worker |
| `missing-food-worker` | läuft | Hostport `127.0.0.1:8090` |
| `missing-food-admin` | läuft | Hostport `127.0.0.1:8091` |
| `webhook` | läuft | Deployment-Webhook, Port 4000 |
| `account-deletion-worker` | beendet, Exitcode 1 | nicht blind starten |
| `db-migrate` | kein dauerhafter Container | migrationsbezogener Einmalservice |
| `deploy-agent` | kein dauerhafter Container | Deploymentsteuerung |

Wichtige Namensunterscheidung:

| Begriff | Tatsächlicher Name |
| --- | --- |
| Backend-Compose-Service | `app` |
| Backend-Container | `swipe-and-cook-vps-app-1` |
| bestehender Traefik-Router | `swipecook-api` |
| bestehender Traefik-Service | `swipecook-api` |
| bestehender API-Host | `api.swipeandcook.komplettwebdesign.de` |
| geplanter zusätzlicher Router | `cookavoli-api` |
| geplanter zusätzlicher Host | `api.cookavoli.com` |

Der Name `swipecook-api` ist nur ein stabiler interner Traefik-Name. Er muss
nicht aus kosmetischen Gründen umbenannt werden.

Der laufende App-Container wurde vom abgesicherten Deploymentprozess aus einem
temporären, commitgebundenen Buildkontext erstellt. Dieser Kontext wurde danach
erwartungsgemäß entfernt. Deshalb weicht sein Compose-Konfigurationshash von
einem Aufruf aus dem Projektwurzelverzeichnis ab. Die beiden Compose-Dateien
sind inhaltlich unverändert gegenüber dem laufenden Release. Alle 287
effektiven Environmentwerte stimmen überein; bei einem Basic-Auth-Wert besteht
lediglich die erwartete Compose-Escapierung von `$` als `$$`.

### 1.5 Auffällige Container, die nicht Teil des Rollouts sind

- `swipe-and-cook-vps-app-run-b46b44ed0060` ist ein seit dem 11. September
  laufender, ungesunder Compose-One-off-Container mit dem Befehl
  `node scripts/send_auth_monitor_alert.js`.
- `swipe-and-cook-vps-account-deletion-worker-1` ist seit dem 5. September mit
  Exitcode 1 beendet.

Beide werden in diesem Rollout weder entfernt noch neu gestartet. Vor der
späteren Abschaltung alter SMTP-Zugangsdaten müssen sie separat untersucht
werden.

### 1.6 Website-Stack `komplettwebdesign`

| Zweck | Live-Wert |
| --- | --- |
| Stackpfad | `/home/webadmin/apps/komplettwebdesign` |
| Git-Repository | `/home/webadmin/apps/komplettwebdesign/server` |
| Compose-Datei | `/home/webadmin/apps/komplettwebdesign/docker-compose.yml` |
| Deployskript | `/home/webadmin/apps/komplettwebdesign/deploy/deploy.sh` |
| Image | `komplettwebdesign-app:production` |
| bestehender Webservice | `app`, Port 3000 |
| Netzwerk zu Traefik | `proxy` |

Aktuelle Services: `postgres`, `app`, `content-worker`, `pgadmin`, `webhook`.
Ein Service `cookavoli-web` existiert auf dem VPS noch nicht. Das aktuelle
Deployskript baut nur das Image des Service `app` und erstellt nur `app` und
`content-worker` neu. Der neue Service muss deshalb bewusst in Compose und
Deployablauf aufgenommen werden.

## 2. Live-Status von SMTP, DKIM und DNS

### 2.1 SMTP

Der laufende Backend-Container verwendet erfolgreich:

| Schlüssel | Live-Wert ohne Secret |
| --- | --- |
| `SMTP_HOST` | `mail.manitu.de` |
| `SMTP_PORT` | `465` |
| `SMTP_SECURE` | `true` |
| `SMTP_USERNAME` | noch `swipeandcook@komplettwebdesign.de` |
| `SMTP_FROM_EMAIL` | noch `swipeandcook@komplettwebdesign.de` |
| `SMTP_FROM_NAME` | noch `Swipe & Cook` |

Vom VPS wurde TLS 1.3 zu `mail.manitu.de:465` mit gültigem manitu-Zertifikat
bestätigt. Zusätzlich war `nodemailer.transport.verify()` im laufenden
App-Container erfolgreich (`SMTP_VERIFY_OK`). Es wurde dabei keine E-Mail
versendet.

Für diesen Account ist damit Port 465 belegt. Port 587 muss nicht erraten oder
parallel konfiguriert werden.

### 2.2 Unterstützte SMTP-Schlüssel

Das Backend unterstützt exakt:

```text
SMTP_HOST
SMTP_PORT
SMTP_SECURE
SMTP_USERNAME
SMTP_PASSWORD
SMTP_FROM_EMAIL
SMTP_FROM_NAME
```

`SMTP_REPLY_TO` wird im aktuellen Backend nicht ausgewertet und darf deshalb
nicht als vermeintlich wirksame Einstellung in `.env` eingetragen werden. Ein
separates Reply-To erfordert zuerst eine getestete Codeänderung.

### 2.3 Mail-DNS

Für beide Domains wurden öffentlich bestätigt:

- MX: `mail031.webhosting.manitu.net.`;
- SPF: `v=spf1 mx a include:_spf.manitu.net -all`;
- DKIM-Selektor: `manitu-webhosting`;
- DKIM-CNAME-Ziel: `manitu-webhosting.dkim.manitu.net.`;
- DMARC: noch nicht vorhanden.

Die vorhandenen DKIM-Einträge lauten:

```text
manitu-webhosting._domainkey.cookavoli.com. CNAME manitu-webhosting.dkim.manitu.net.
manitu-webhosting._domainkey.cookavoli.de.  CNAME manitu-webhosting.dkim.manitu.net.
```

Sie bleiben unverändert. Es wird kein zusätzlicher DKIM-TXT-Record angelegt.

### 2.4 Web-DNS vor dem Rollout

| Name | Record | Aktueller Wert | TTL |
| --- | --- | --- | ---: |
| `cookavoli.com` | A | `89.238.73.156` | 86400 |
| `cookavoli.com` | AAAA | `2a00:1828:3000::1:47d4:2` | 86400 |
| `cookavoli.de` | A | `89.238.73.156` | 86400 |
| `cookavoli.de` | AAAA | `2a00:1828:3000::1:47d4:2` | 86400 |

Die Werte gehören zum manitu-Webspace. Eine Wildcard beantwortet derzeit auch
beliebige Subdomains, darunter `api.cookavoli.com`, mit diesen manitu-Adressen.
Im manitu-DNS wurde laut Betreiber noch nichts für den VPS-Cutover verändert.

## 3. Zielarchitektur

```text
cookavoli.com, www.cookavoli.com,
cookavoli.de, www.cookavoli.de
    -> DNS A 217.154.89.44
    -> infra-traefik-1 / Netzwerk proxy
    -> komplettwebdesign:cookavoli-web / Port 3000

api.cookavoli.com
    -> DNS A 217.154.89.44
    -> infra-traefik-1 / Netzwerk proxy
    -> swipe-and-cook-vps:app / Port 8080

MX, SPF und DKIM
    -> unverändert zu manitu
```

Es wird kein `admin.cookavoli.com` angelegt.

## 4. Freigabereihenfolge

Die Reihenfolge ist verbindlich:

1. lokale Rebrandingänderungen beider Repositories prüfen und freigeben;
2. Backups der VPS-Konfiguration und beider DNS-Zonen anlegen;
3. zusätzlichen API-Router im Repository ergänzen und über den bestehenden
   Deploymentweg veröffentlichen;
4. `cookavoli-web` in Website-Compose und Deployskript ergänzen;
5. Website und API ohne öffentliches DNS mit erzwungener Hostauflösung testen;
6. SMTP-Zugang auf `system@cookavoli.com` umstellen und nur `app` neu erstellen;
7. Web-TTLs bei manitu senken und mindestens die bisherige TTL abwarten;
8. A-/AAAA-/CNAME-Webrecords umstellen, Mailrecords unverändert lassen;
9. TLS, Redirects, API, Mail und bestehenden alten API-Host abnehmen;
10. erst später Kontolöschung, App-Release und Altlasten separat aktivieren.

Ein DNS-Cutover vor den Schritten 1 bis 6 ist ein No-Go.

## 5. Phase A: Backups und unveränderter Ausgangszustand

### 5.1 DNS sichern

Im manitu-Kundenkonto für `cookavoli.com` und `cookavoli.de` jeweils einen
vollständigen DNS-Export oder Screenshots aller Records erstellen. MX, SPF,
DKIM, CAA, A, AAAA, CNAME und Wildcards müssen sichtbar sein.

### 5.2 VPS-Dateien sichern

Erst unmittelbar vor einer freigegebenen Änderung als `webadmin` ausführen:

```bash
ssh ionos-vps1
umask 077

cd /home/webadmin/apps/SwipeAndCook
install -m 600 .env ".env.before-cookavoli-$(date -u +%Y%m%dT%H%M%SZ)"
install -m 600 vps_setup/docker-compose.traefik.yml \
  "vps_setup/docker-compose.traefik.yml.before-cookavoli-$(date -u +%Y%m%dT%H%M%SZ)"

cd /home/webadmin/apps/komplettwebdesign
install -m 600 docker-compose.yml \
  "docker-compose.yml.before-cookavoli-$(date -u +%Y%m%dT%H%M%SZ)"
install -m 700 deploy/deploy.sh \
  "deploy/deploy.sh.before-cookavoli-$(date -u +%Y%m%dT%H%M%SZ)"
```

Die konkret erzeugten Dateinamen für einen möglichen Rollback notieren.

## 6. Phase B: zusätzlichen API-Router vorbereiten

Datei im App-Repository:

`vps_setup/docker-compose.traefik.yml`

Unter `services.app.labels` bleibt der bestehende Routerblock unverändert. Nach
dem bestehenden `swipecook-api`-Block wird additiv ergänzt:

```yaml
      - "traefik.http.routers.cookavoli-api.rule=Host(`api.cookavoli.com`)"
      - "traefik.http.routers.cookavoli-api.entrypoints=${TRAEFIK_ENTRYPOINTS:-websecure}"
      - "traefik.http.routers.cookavoli-api.tls=true"
      - "traefik.http.routers.cookavoli-api.tls.certresolver=${TRAEFIK_CERTRESOLVER:-letsencrypt}"
      - "traefik.http.routers.cookavoli-api.service=${TRAEFIK_API_SERVICE:-swipecook-api}"
```

Es wird kein zweites Backend und kein neuer Container benötigt. Beide Router
zeigen auf den vorhandenen Traefik-Service `swipecook-api`, der Port 8080 des
Compose-Service `app` verwendet. Die produktive `.env` setzt den Resolver
bereits auf den realen Namen `le`.

Nach Review, Commit und Push wird ausschließlich der bestehende, abgesicherte
GitHub-/Webhook-Deploymentweg verwendet. Der Deployprozess erstellt den
App-Container neu; Traefik erkennt die neuen Labels automatisch.

Vor dem DNS-Cutover prüfen:

```bash
curl --silent --show-error --insecure \
  --resolve api.cookavoli.com:443:217.154.89.44 \
  https://api.cookavoli.com/health
```

`--insecure` ist ausschließlich für diesen Vorabtest zulässig, weil Let's
Encrypt vor dem DNS-Cutover noch kein gültiges Zertifikat ausstellen kann. Der
Test muss die bestehende API-Gesundheitsantwort liefern.

Zusätzlich muss der alte Host weiterhin ohne Ausnahme funktionieren:

```bash
curl --fail --silent --show-error \
  https://api.swipeandcook.komplettwebdesign.de/health
```

## 7. Phase C: `cookavoli-web` im Website-Stack ergänzen

Voraussetzung: Die Cookavoli-Websitequellen einschließlich
`npm run start:cookavoli` sind geprüft, committet, gepusht und im Image
`komplettwebdesign-app:production` enthalten.

In `/home/webadmin/apps/komplettwebdesign/docker-compose.yml` wird unter
`services:` additiv ergänzt:

```yaml
  cookavoli-web:
    image: komplettwebdesign-app:production
    command: ["npm", "run", "start:cookavoli"]
    init: true
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 3000
      COOKAVOLI_API_BASE_URL: https://api.cookavoli.com
      COOKAVOLI_ACCOUNT_DELETION_ENABLED: "false"
    expose:
      - "3000"
    networks:
      - proxy
    healthcheck:
      test:
        - CMD
        - node
        - --input-type=module
        - -e
        - "const r=await fetch('http://127.0.0.1:3000/health');if(!r.ok)process.exit(1)"
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 15s
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=proxy"
      - "traefik.http.routers.cookavoli-web.rule=Host(`cookavoli.com`) || Host(`www.cookavoli.com`) || Host(`cookavoli.de`) || Host(`www.cookavoli.de`)"
      - "traefik.http.routers.cookavoli-web.entrypoints=websecure"
      - "traefik.http.routers.cookavoli-web.tls=true"
      - "traefik.http.routers.cookavoli-web.tls.certresolver=le"
      - "traefik.http.routers.cookavoli-web.service=cookavoli-web"
      - "traefik.http.services.cookavoli-web.loadbalancer.server.port=3000"
```

Der Redirect wird bereits durch die getestete Cookavoli-Anwendung erzeugt. Ein
zweites Traefik-Redirect-Middleware ist deshalb nicht erforderlich.

`COOKAVOLI_COOKIE_SECRET` wird jetzt nicht benötigt, weil die externe
Kontolöschung ausdrücklich deaktiviert bleibt. Vor ihrer späteren Aktivierung
muss ein mindestens 32 Zeichen langes Secret sicher in die nicht versionierte
Website-Environment aufgenommen werden.

### 7.1 Website-Deployskript ergänzen

In `/home/webadmin/apps/komplettwebdesign/deploy/deploy.sh` sind vier Stellen zu
erweitern:

1. Fehlerlogs müssen `cookavoli-web` einschließen:

```bash
compose logs --tail=100 app content-worker cookavoli-web 2>&1 || true
```

1. Nach dem Imagebuild müssen alle drei Services neu erstellt werden:

```bash
compose up -d --no-deps --force-recreate app content-worker cookavoli-web 2>&1
```

1. Nach dem App-Healthcheck wird der neue Service begrenzt geprüft:

```bash
COOKAVOLI_HEALTHY=0
for attempt in $(seq 1 18); do
  if compose exec -T cookavoli-web node --input-type=module -e \
    "const response = await fetch('http://127.0.0.1:3000/health'); const body = await response.json(); if (!response.ok || body.service !== 'cookavoli-web') process.exit(1);" \
    >/dev/null 2>&1; then
    COOKAVOLI_HEALTHY=1
    break
  fi
  echo "[deploy] Cookavoli noch nicht bereit – Versuch $attempt/18"
  sleep 5
done
[[ "$COOKAVOLI_HEALTHY" -eq 1 ]] || fail "Cookavoli wurde nicht rechtzeitig gesund."
```

1. Die Statusausgabe muss den Service einschließen:

```bash
compose ps app content-worker cookavoli-web 2>&1
```

Danach:

```bash
cd /home/webadmin/apps/komplettwebdesign
docker compose config --quiet
```

Erst bei erfolgreicher Compose-Validierung wird der vorhandene
GitHub-/Webhook-Deploy ausgelöst. Auch dabei wird Traefik nicht neu gestartet.

### 7.2 Vorabtests ohne DNS

```bash
curl --silent --show-error --insecure \
  --resolve cookavoli.com:443:217.154.89.44 \
  https://cookavoli.com/health

curl --silent --show-error --insecure --head \
  --resolve www.cookavoli.com:443:217.154.89.44 \
  https://www.cookavoli.com/datenschutz

curl --silent --show-error --insecure --head \
  --resolve cookavoli.de:443:217.154.89.44 \
  https://cookavoli.de/nutzungsbedingungen
```

Erwartet:

- `/health`: HTTP 200 und JSON mit `service: cookavoli-web`;
- beide Aliasdomains: HTTP 308;
- `Location` zeigt pfaderhaltend auf `https://cookavoli.com/...`.

## 8. Phase D: SMTP sicher auf Cookavoli umstellen

Die Postfächer sind laut Betreiber bereits bei manitu eingerichtet. In der
Backend-Environment wird das echte Postfach `system@cookavoli.com` verwendet.

### 8.1 Werte ohne Secret aktualisieren

Als `webadmin`:

```bash
ssh ionos-vps1
cd /home/webadmin/apps/SwipeAndCook
umask 077

printf '%s' 'mail.manitu.de' \
  | node vps_setup/scripts/set-env-value-from-stdin.mjs .env SMTP_HOST
printf '%s' '465' \
  | node vps_setup/scripts/set-env-value-from-stdin.mjs .env SMTP_PORT
printf '%s' 'true' \
  | node vps_setup/scripts/set-env-value-from-stdin.mjs .env SMTP_SECURE
printf '%s' 'system@cookavoli.com' \
  | node vps_setup/scripts/set-env-value-from-stdin.mjs .env SMTP_USERNAME
printf '%s' 'system@cookavoli.com' \
  | node vps_setup/scripts/set-env-value-from-stdin.mjs .env SMTP_FROM_EMAIL
printf '%s' 'Cookavoli' \
  | node vps_setup/scripts/set-env-value-from-stdin.mjs .env SMTP_FROM_NAME
```

### 8.2 Passwort ohne Shell-Historie eintragen

```bash
read -r -s -p 'SMTP-Passwort für system@cookavoli.com: ' COOKAVOLI_SMTP_SECRET
printf '\n'
printf '%s' "$COOKAVOLI_SMTP_SECRET" \
  | node vps_setup/scripts/set-env-value-from-stdin.mjs .env SMTP_PASSWORD
unset COOKAVOLI_SMTP_SECRET
```

Das Passwort wird dabei weder als Befehlsargument noch in der Shell-Historie
gespeichert. Die `.env` bleibt Modus `0600`.

### 8.3 Konfiguration und SMTP-Anmeldung vor dem Neustart prüfen

Abkürzung für die beiden realen Compose-Dateien:

```bash
compose_app=(docker compose --env-file .env \
  -f vps_setup/docker-compose.template.yml \
  -f vps_setup/docker-compose.traefik.yml)

"${compose_app[@]}" config --quiet
```

Anschließend die Anmeldung ohne E-Mail-Versand prüfen:

```bash
"${compose_app[@]}" run --rm --no-deps -T app \
  node --input-type=module -e '
    import nodemailer from "nodemailer";
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD
      }
    });
    await transport.verify();
    transport.close();
    console.log("SMTP_VERIFY_OK");
  '
```

Nur `SMTP_VERIFY_OK` erlaubt den nächsten Schritt.

### 8.4 Nur den Backend-Service neu erstellen

```bash
"${compose_app[@]}" up -d \
  --no-deps \
  --no-build \
  --force-recreate \
  --wait \
  --wait-timeout 180 \
  app
```

Auswirkung:

- Nur `swipe-and-cook-vps-app-1` wird neu erstellt.
- PostgreSQL, PgBouncer, Worker, Website und Traefik bleiben unangetastet.
- Wegen nur einer API-Instanz entsteht ein kurzer API-Neustart; dies ist kein
  Zero-Downtime-Deployment.
- Das vorhandene, bereits gebaute App-Image wird mit `--no-build` beibehalten.

Danach prüfen:

```bash
docker inspect --format '{{.State.Health.Status}}' swipe-and-cook-vps-app-1
curl --fail --silent --show-error \
  https://api.swipeandcook.komplettwebdesign.de/health
```

Anschließend über den regulären Login-/E-Mail-Link-Ablauf genau eine Nachricht
an ein eigenes Testpostfach senden. Absender, sichtbarer Name, DKIM, SPF,
Inhalt, Linkziel, Antwortverhalten und Spamordner prüfen.

## 9. Phase E: DNS bei manitu

### 9.1 TTL-Vorlauf

Mindestens 24 Stunden vor dem Cutover die TTL der später zu ändernden A-, AAAA-
und sichtbaren Wildcard-Webrecords von 86400 auf 300 Sekunden senken. MX, SPF,
DKIM und CAA bleiben unverändert.

Wenn die Wildcard im manitu-DNS-Editor nicht als eigener Record sichtbar ist,
nicht raten, sondern den manitu-Support fragen. Bereits gecachte
Wildcardantworten können bis zum Ablauf der alten TTL weiter auf den
manitu-Webspace zeigen.

### 9.2 Exakter Web-DNS-Zielplan

Erst nach bestandenen Vorabtests eintragen:

| Zone | Host im manitu-Editor | Typ | Aktion/Ziel |
| --- | --- | --- | --- |
| `cookavoli.com` | `@` | A | auf `217.154.89.44` ändern |
| `cookavoli.com` | `@` | AAAA | löschen |
| `cookavoli.com` | `www` | CNAME | `cookavoli.com.` |
| `cookavoli.com` | `api` | A | `217.154.89.44` |
| `cookavoli.com` | `api` | AAAA | nicht anlegen/vorhandenen löschen |
| `cookavoli.de` | `@` | A | auf `217.154.89.44` ändern |
| `cookavoli.de` | `@` | AAAA | löschen |
| `cookavoli.de` | `www` | CNAME | `cookavoli.de.` |

Vor einem CNAME müssen gleichnamige A- und AAAA-Records entfernt werden. Ein
CNAME darf nicht mit anderen Records am selben Namen koexistieren.

Keine manitu-Webweiterleitung für `.de` aktivieren. Der getestete HTTP-308-
Redirect läuft in der Cookavoli-Anwendung hinter Traefik.

### 9.3 Mailrecords beim Web-Cutover unverändert lassen

Nicht ändern:

- MX zu `mail031.webhosting.manitu.net.`;
- beide DKIM-CNAMEs;
- CAA;
- den bestehenden SPF-Record während des Cutovers.

Der aktuelle SPF enthält den Mechanismus `a`. Nach Änderung des A-Records würde
damit auch die VPS-IP als Absender autorisiert, obwohl die Anwendung über
manitu sendet. Das bricht den Mailversand nicht, ist aber weiter gefasst als
nötig. Nach dem Cutover ist beim manitu-Support der aktuell empfohlene SPF-Wert
für ausschließlichen Versand über das manitu-Mailhosting zu erfragen. Danach
wird der bestehende Record als ein einzelner SPF-Record ersetzt; niemals einen
zweiten SPF-Record hinzufügen.

### 9.4 DMARC nach erfolgreichem Mailtest

Nur wenn `dmarc@cookavoli.com` tatsächlich als überwachter Alias eingerichtet
ist, kann für `cookavoli.com` im Monitoringmodus gesetzt werden:

```text
Host: _dmarc
Typ:  TXT
Wert: v=DMARC1; p=none; rua=mailto:dmarc@cookavoli.com; adkim=r; aspf=r; pct=100
```

Für `cookavoli.de` wird DMARC erst nach einem separaten Versand-/Weiterleitungs-
test festgelegt. `quarantine` oder `reject` folgen erst nach ausgewerteten
Berichten, nicht am Cutover-Tag.

## 10. Phase F: Abnahme nach DNS-Cutover

### 10.1 DNS

```bash
dig +short A cookavoli.com
dig +short AAAA cookavoli.com
dig +short CNAME www.cookavoli.com
dig +short A api.cookavoli.com
dig +short AAAA api.cookavoli.com
dig +short A cookavoli.de
dig +short AAAA cookavoli.de
dig +short CNAME www.cookavoli.de
dig +short MX cookavoli.com
dig +short CNAME manitu-webhosting._domainkey.cookavoli.com
```

Erwartet:

- A für Website, `.de` und API: `217.154.89.44`;
- keine AAAA-Antwort für diese Namen;
- CNAMEs wie in Abschnitt 9.2;
- MX und DKIM weiterhin bei manitu.

### 10.2 TLS und HTTP

Nach erfolgreicher Let's-Encrypt-Ausstellung ohne `--insecure` prüfen:

```bash
curl --fail --silent --show-error https://cookavoli.com/health
curl --silent --show-error --head https://www.cookavoli.com/datenschutz
curl --silent --show-error --head https://cookavoli.de/datenschutz
curl --silent --show-error --head https://www.cookavoli.de/datenschutz
curl --fail --silent --show-error https://api.cookavoli.com/health
curl --fail --silent --show-error \
  https://api.swipeandcook.komplettwebdesign.de/health
```

Zusätzlich Zertifikatsnamen und Ablaufdatum für alle fünf neuen Hosts prüfen.

### 10.3 Funktionale Abnahme

- Startseite, Datenschutz, Nutzungsbedingungen, Support und Kontolöschseite;
- kanonische URLs, Sitemap, Robots und Social-Metadaten;
- App-Login, Registrierung und bestehende Sessions;
- E-Mail-Link anfordern und vollständig öffnen;
- Mailversand, Empfang, Antwort und Aliasse;
- SPF-, DKIM- und DMARC-Ergebnis im empfangenen Nachrichtenheader;
- alter API-Host und eine bereits veröffentlichte Appversion;
- API-CORS ohne Wildcardfreigabe;
- keine Aktivierung der externen Kontolöschung.

## 11. Rollback

### 11.1 SMTP-Rollback

Die in Phase A notierte `.env`-Sicherung wieder als `.env` installieren und
anschließend ausschließlich `app` mit dem Befehl aus Abschnitt 8.4 neu
erstellen. Traefik wird nicht neu gestartet.

### 11.2 API-Router-Rollback

Nur den additiven Labelblock `cookavoli-api` aus
`vps_setup/docker-compose.traefik.yml` zurücknehmen und über den normalen
Deploymentweg veröffentlichen. Der alte Router `swipecook-api` bleibt aktiv.

### 11.3 Website-Rollback

Bei einem Anwendungsfehler zuerst die A-/AAAA-Webrecords anhand des DNS-Exports
auf die vorherigen manitu-Werte zurücksetzen. Danach kann ausschließlich der
Service gestoppt werden:

```bash
cd /home/webadmin/apps/komplettwebdesign
docker compose stop cookavoli-web
```

Nicht `docker compose down` verwenden. MX, SPF, DKIM, Postfächer und der alte
API-Host werden bei einem Website-Rollback nicht verändert.

### 11.4 Vorherige öffentlich beobachtete Webwerte

Nur als Gegenprüfung, nicht als Ersatz für den eigenen DNS-Export:

```text
A     89.238.73.156
AAAA  2a00:1828:3000::1:47d4:2
```

## 12. Verbotene Kurzwege

Während dieses Rollouts nicht verwenden:

```text
docker compose down
docker restart infra-traefik-1
docker compose restart traefik
docker system prune
globale Search-and-Replace-Aktionen in .env oder Compose
AAAA auf eine nicht vorhandene VPS-IPv6
zweiter paralleler SPF-Record
Löschen des alten API-Routers
Starten oder Entfernen der beiden auffälligen Container ohne eigene Analyse
```

## 13. Go/No-Go-Checkliste

### Vor SMTP-Umschaltung

- [ ] `.env` wurde mit Modus 0600 gesichert.
- [ ] Das neue manitu-Systempostfach funktioniert im Mailclient.
- [ ] DKIM-CNAME für `cookavoli.com` ist weiterhin öffentlich auflösbar.
- [ ] `SMTP_VERIFY_OK` wurde mit den neuen Daten erreicht.
- [ ] Rebranding-Code und Mailtexte sind freigegeben.

### Vor DNS-Cutover

- [ ] API-Router `cookavoli-api` ist am App-Container vorhanden.
- [ ] Alter Router `swipecook-api` funktioniert weiterhin.
- [ ] `cookavoli-web` läuft gesund im Stack `komplettwebdesign`.
- [ ] Hostheader-Vorabtests liefern 200 beziehungsweise 308.
- [ ] DNS-Export/Screenshots beider Zonen liegen vor.
- [ ] Die alte TTL ist vollständig abgelaufen.
- [ ] Es wird keine VPS-AAAA veröffentlicht.
- [ ] MX, SPF, DKIM und CAA bleiben beim Web-Cutover unangetastet.

### Nach DNS-Cutover

- [ ] Alle fünf neuen Hosts besitzen gültige TLS-Zertifikate.
- [ ] `.de` und `www` leiten pfaderhaltend mit HTTP 308 um.
- [ ] Neue und alte API-Hosts liefern einen gesunden Status.
- [ ] Login-/E-Mail-Link-Ablauf funktioniert Ende zu Ende.
- [ ] SPF und DKIM bestehen; DMARC läuft höchstens im Monitoringmodus.
- [ ] Bestehende iOS-/Android-Appversionen funktionieren unverändert.
- [ ] Externe Kontolöschung ist weiterhin deaktiviert.

## 14. Erster sicherer nächster Schritt

Noch keine A-, AAAA-, CNAME-, MX-, SPF- oder Traefik-Änderung durchführen.
Zuerst:

1. DNS-Zonen exportieren;
2. die Rebranding-Diffs beider Repositories getrennt reviewen und commitfähig
   machen;
3. den additiven API-Router und den Service `cookavoli-web` lokal ergänzen und
   testen;
4. erst danach den produktiven Rollout nach dieser Checkliste freigeben.
