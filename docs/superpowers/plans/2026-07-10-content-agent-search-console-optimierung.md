# Content-Agent Search Console und Optimierung Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Search-Console-Leistungsdaten mit rein lesendem Zugriff importieren und daraus nachvollziehbare Themen-, Meta-, Inhalts- und interne-Link-Chancen ableiten.

**Architecture:** Der Worker authentifiziert sich über ein als Docker Secret eingebundenes Google-Service-Account-Credential. Ein dünner HTTP-Adapter ruft Search Analytics auf, ein Synchronisationsservice normalisiert Daten in PostgreSQL und ein separater Opportunity-Service erzeugt Vorschläge; der Import ist für die Kernpipeline nicht blockierend.

**Tech Stack:** Node.js 20, PostgreSQL 16, google-auth-library, Search Console Search Analytics API, Docker Secrets, node:test, Content-Agent aus Plan A und Adminbereich aus Plan B.

## Global Constraints

- Pläne A und B sind implementiert und vollständig getestet.
- Google-Zugriff verwendet ausschließlich den Scope `https://www.googleapis.com/auth/webmasters.readonly`.
- Das Credential liegt nicht in Git und nicht als JSON-Text in `.env`.
- Die Kernpipeline funktioniert weiterhin ohne Search Console.
- Search-Console-Daten enthalten keine Kontakt- oder Formulardaten.
- Themenvorschläge werden nicht allein wegen hoher Impressionen ausgewählt; Geschäftsnutzen und Kannibalisierung bleiben Pflicht.
- Jeder Task beginnt mit einem fehlschlagenden Test und endet mit einem Commit.

---

### Task 1: Search-Metriken-Schema als Migration 007

**Files:**
- Create: `scripts/migrations/007_create_content_search_metrics.sql`
- Modify: `scripts/runContentAgentMigration.js`
- Test: `tests/contentSearchMetricsMigration.test.js`

**Interfaces:**
- Produces: `content_search_metrics` und `content_opportunities`.

- [ ] **Step 1: Fehlschlagenden Migrationstest schreiben**

~~~js
assert.match(sql, /CREATE TABLE IF NOT EXISTS content_search_metrics/i);
assert.match(sql, /CREATE TABLE IF NOT EXISTS content_opportunities/i);
assert.match(sql, /UNIQUE \(metric_date, page_url, query, device\)/i);
~~~

- [ ] **Step 2: Test ausführen**

Run: `node --test tests/contentSearchMetricsMigration.test.js`
Expected: FAIL mit `ENOENT`.

- [ ] **Step 3: Migration implementieren**

~~~sql
CREATE TABLE IF NOT EXISTS content_search_metrics (
  id BIGSERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  page_url TEXT NOT NULL,
  query TEXT NOT NULL DEFAULT '',
  device VARCHAR(24) NOT NULL DEFAULT 'ALL',
  clicks NUMERIC(14,4) NOT NULL DEFAULT 0,
  impressions NUMERIC(14,4) NOT NULL DEFAULT 0,
  ctr NUMERIC(12,8) NOT NULL DEFAULT 0,
  average_position NUMERIC(12,4) NOT NULL DEFAULT 0,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (metric_date, page_url, query, device)
);
CREATE INDEX IF NOT EXISTS idx_content_search_metrics_page_date
  ON content_search_metrics (page_url, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_content_search_metrics_query_date
  ON content_search_metrics (query, metric_date DESC);

CREATE TABLE IF NOT EXISTS content_opportunities (
  id BIGSERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  analysis_key VARCHAR(180) NOT NULL UNIQUE,
  opportunity_type VARCHAR(64) NOT NULL,
  primary_query TEXT,
  score NUMERIC(5,2) NOT NULL,
  evidence_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  recommendation_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(32) NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  CHECK (opportunity_type IN ('meta_refresh', 'content_refresh')),
  CHECK (status IN ('open', 'dismissed', 'resolved'))
);
CREATE INDEX IF NOT EXISTS idx_content_opportunities_status_score
  ON content_opportunities (status, score DESC, created_at DESC);
~~~

- [ ] **Step 4: Bestehenden Runner ergänzen**

`scripts/runContentAgentMigration.js` lädt nach Migration 006 zusätzlich
`./migrations/007_create_content_search_metrics.sql`. Erfolgs- und Fehlermeldung
nennen anschließend reproduzierbar die Migrationen 002 bis 007. Das bestehende
npm-Skript `migrate:content-agent` bleibt unverändert.

- [ ] **Step 5: Tests und Commit**

Run: `node --test tests/contentSearchMetricsMigration.test.js && npm test`
Expected: alle Tests PASS.

~~~bash
git add scripts/migrations/007_create_content_search_metrics.sql scripts/runContentAgentMigration.js tests/contentSearchMetricsMigration.test.js
git commit -m "feat: add search console metrics schema"
~~~

Der bestehende Runner `npm run migrate:content-agent` bleibt die einzige Content-Agent-Migrationsschnittstelle. Es wird kein zweiter Migrationsrunner eingeführt.

### Task 2: Read-only Search-Console-Client

**Files:**
- Create: `services/contentAgent/searchConsoleClient.js`
- Modify: `services/contentAgent/config.js`
- Modify: `package.json`
- Modify: `package-lock.json`
- Test: `tests/searchConsoleClient.test.js`

**Interfaces:**
- Produces: `createSearchConsoleClient(options)` mit `querySearchAnalytics(request)` und `isConfigured()`.

- [ ] **Step 1: Fehlschlagenden Client- und Konfigurationstest schreiben**

Der Test injiziert eine `authFactory(options)` mit `getClient()` und einem Authclient mit `request(options)`. Er prüft URL-Encoding von `sc-domain:komplettwebdesign.de`, POST-Methode, readonly Scope und Requestbody. Ohne Site-URL oder Credentialpfad meldet `isConfigured()` falsch und führt weder Auth-Factory noch Dateizugriff oder Netzwerkaufruf aus. Die technische Adminpräsentation enthält nur `searchConsoleConfigured`, niemals den Credentialpfad.

- [ ] **Step 2: Test ausführen**

Run: `node --test tests/searchConsoleClient.test.js`
Expected: FAIL mit `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Abhängigkeit installieren**

Run: `npm install google-auth-library`
Expected: Paket und Lockdatei aktualisiert.

- [ ] **Step 4: Client implementieren**

~~~js
import { GoogleAuth } from 'google-auth-library';

const READONLY_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

export function createSearchConsoleClient({
  siteUrl,
  credentialsPath,
  authFactory = null
}) {
  function isConfigured() {
    return Boolean(siteUrl && credentialsPath);
  }

  async function querySearchAnalytics(body) {
    if (!isConfigured()) {
      throw new Error('Search Console ist nicht konfiguriert.');
    }
    const authOptions = { keyFile: credentialsPath, scopes: [READONLY_SCOPE] };
    const auth = authFactory
      ? authFactory(authOptions)
      : new GoogleAuth(authOptions);
    const client = await auth.getClient();
    const encodedSite = encodeURIComponent(siteUrl);
    const response = await client.request({
      url: 'https://www.googleapis.com/webmasters/v3/sites/' + encodedSite + '/searchAnalytics/query',
      method: 'POST',
      data: body
    });
    return response.data || { rows: [] };
  }

  return { isConfigured, querySearchAnalytics };
}
~~~

- [ ] **Step 5: Konfiguration erweitern**

~~~js
searchConsoleSiteUrl: env.SEARCH_CONSOLE_SITE_URL || '',
googleCredentialsPath: env.GOOGLE_APPLICATION_CREDENTIALS || '',
searchConsoleSchedule: env.CONTENT_AGENT_GSC_SCHEDULE || '0 6 * * 0',
searchConsoleConfigured: configured(env.SEARCH_CONSOLE_SITE_URL)
  && configured(env.GOOGLE_APPLICATION_CREDENTIALS)
~~~

- [ ] **Step 6: Tests und Commit**

Run: `node --test tests/searchConsoleClient.test.js tests/contentAgentConfig.test.js`
Expected: alle Tests PASS.

~~~bash
git add services/contentAgent/searchConsoleClient.js services/contentAgent/config.js package.json package-lock.json tests/searchConsoleClient.test.js
git commit -m "feat: connect search console read only"
~~~

### Task 3: URL-sicherer, paginierter und idempotenter Import

**Files:**
- Create: `repositories/contentSearchMetricsRepository.js`
- Create: `services/contentAgent/searchConsoleSyncService.js`
- Create: `tests/contentSearchMetricsRepository.test.js`
- Create: `tests/searchConsoleSyncService.test.js`

**Interfaces:**
- Produces: `createContentSearchMetricsRepository(db)` mit `findPostIdsByCanonicalPaths(paths)`, `upsertSearchMetrics(rows)` und `listAggregatedMetrics(input)`.
- Produces: `createSearchConsoleSyncService({ client, repository, allowedHosts })` mit `syncSearchConsoleRange({ startDate, endDate, leaseGuard })`.

- [ ] **Step 1: Fehlschlagende Repository- und Synctests schreiben**

Die Tests belegen Host- und Pfadnormalisierung für `komplettwebdesign.de` und `www.komplettwebdesign.de`, Querystrings, Fragmente, Trailing Slashes und `/blog/:slug`. Fremde Hosts, ungültige Protokolle und nicht kanonische Blogpfade erhalten kein `post_id`. Die API-Seiten enthalten 25.000, 2 und 0 Zeilen; `startRow` ist 0, 25.000 und 25.002.

- [ ] **Step 2: Tests ausführen**

Run: `node --test tests/contentSearchMetricsRepository.test.js tests/searchConsoleSyncService.test.js`
Expected: FAIL wegen fehlender Module.

- [ ] **Step 3: Synchronisationsservice implementieren**

Jede Anfrage verwendet exakt:

~~~js
{
  startDate,
  endDate,
  dimensions: ['date', 'page', 'query', 'device'],
  type: 'web',
  dataState: 'final',
  rowLimit: 25000,
  startRow
}
~~~

`leaseGuard()` läuft vor jeder externen Seite und vor jeder Schreibphase. Leere Zeilen beenden die Pagination. `startRow` wächst um die tatsächlich empfangene Zeilenzahl. Zeilen mit ungültigem Datum, URL oder Zahlenformat werden verworfen; fehlende Blogzuordnungen werden mit `post_id = null` gespeichert.

- [ ] **Step 4: Repository und gewichtete Aggregation implementieren**

Der Upsert verwendet den Unique-Key `(metric_date, page_url, query, device)` und bewahrt einen bereits bekannten `post_id` mit `COALESCE(EXCLUDED.post_id, content_search_metrics.post_id)`. Aggregierte Werte verwenden `SUM(clicks)`, `SUM(impressions)`, `SUM(clicks) / NULLIF(SUM(impressions), 0)` und eine nach Impressionen gewichtete Position.

- [ ] **Step 5: Tests und Commit**

Run: `node --test tests/contentSearchMetricsRepository.test.js tests/searchConsoleSyncService.test.js`
Expected: Pagination, Normalisierung, Lease-Fence, Aggregation und Upsert PASS.

~~~bash
git add repositories/contentSearchMetricsRepository.js services/contentAgent/searchConsoleSyncService.js tests/contentSearchMetricsRepository.test.js tests/searchConsoleSyncService.test.js
git commit -m "feat: sync search console performance data"
~~~

### Task 4: Idempotente, zunächst rein lesende Chancenbewertung

**Files:**
- Create: `repositories/contentSearchOpportunityRepository.js`
- Create: `services/contentAgent/searchOpportunityService.js`
- Create: `tests/contentSearchOpportunityRepository.test.js`
- Create: `tests/searchOpportunityService.test.js`

**Interfaces:**
- Produces: `calculateSearchOpportunity(metrics)` und `buildContentOpportunities(metrics, range)`.
- Produces: `createContentSearchOpportunityRepository(db)` mit `upsertOpenOpportunities(opportunities)` und `listOpenOpportunities(limit)`.

- [ ] **Step 1: Fehlschlagende Scoring- und Idempotenztests schreiben**

Fixtures: Position 12, 500 Impressionen, 1 Prozent CTR ergibt `content_refresh`; Position 4, 2.000 Impressionen, 0,5 Prozent CTR ergibt `meta_refresh`; Position 1, 20 Impressionen, 60 Prozent CTR ergibt keine Chance. Zwei identische Analysen erzeugen denselben `analysis_key`.

- [ ] **Step 2: Tests ausführen**

Run: `node --test tests/contentSearchOpportunityRepository.test.js tests/searchOpportunityService.test.js`
Expected: FAIL wegen fehlender Module.

- [ ] **Step 3: Suchchance exakt implementieren**

~~~js
function impressionScore(impressions) {
  return Math.min(10, Math.log10(Math.max(0, impressions) + 1) * 3);
}
function positionScore(position) {
  if (position >= 8 && position <= 20) return 10;
  if (position > 20 && position <= 30) return 8;
  if (position >= 4 && position < 8) return 6;
  if (position > 30) return 4;
  return 2;
}
function ctrGapScore(position, ctr) {
  if (position <= 10 && ctr < 0.01) return 10;
  if (position <= 10 && ctr < 0.03) return 8;
  if (position <= 20 && ctr < 0.02) return 8;
  if (position <= 30 && ctr < 0.015) return 6;
  return 2;
}
export function calculateSearchOpportunity(metrics) {
  const score = impressionScore(metrics.impressions) * 0.45
    + positionScore(metrics.averagePosition) * 0.35
    + ctrGapScore(metrics.averagePosition, metrics.ctr) * 0.20;
  return Math.round(score * 100) / 100;
}
~~~

- [ ] **Step 4: Nur sichere Empfehlungstypen implementieren**

`meta_refresh` gilt für eindeutig zugeordnete Blogposts auf Position bis 10 mit CTR unter 3 Prozent. `content_refresh` gilt für eindeutig zugeordnete Blogposts auf Position 8 bis 20 mit CTR unter 2 Prozent. `new_article` und `internal_links` bleiben bewusst aus, bis Query-zu-Inventar-Matching und ein kanonischer Linkgraph existieren. Der `analysis_key` ist ein stabiler SHA-256-Wert aus Zeitraum, Typ, Post, Seite und Query.

- [ ] **Step 5: Tests und Commit**

Run: `node --test tests/contentSearchOpportunityRepository.test.js tests/searchOpportunityService.test.js`
Expected: Scoring, Filter und idempotenter Upsert PASS.

~~~bash
git add repositories/contentSearchOpportunityRepository.js services/contentAgent/searchOpportunityService.js tests/contentSearchOpportunityRepository.test.js tests/searchOpportunityService.test.js
git commit -m "feat: derive safe search content opportunities"
~~~

### Task 5: Workerdispatch und separater Wochen-Scheduler

**Files:**
- Create: `services/contentAgent/searchConsoleSchedulerService.js`
- Create: `tests/contentSearchScheduler.test.js`
- Modify: `scripts/contentWorker.js`
- Modify: `repositories/contentJobRepository.js`
- Modify: `repositories/contentProviderStateRepository.js`
- Modify: `tests/contentAgentWorker.test.js`
- Modify: `tests/contentAgentJobRepository.test.js`

**Interfaces:**
- Produces: Jobtypen `sync_search_console` und `analyze_search_opportunities` ohne `content_runs`.
- Produces: `createSearchConsoleScheduler({ tick, intervalMs })` und `runSearchConsoleSchedulerTick(input)`.

- [ ] **Step 1: Fehlschlagende Worker- und Schedulertests schreiben**

Prüfen: unkonfiguriert kein Job; Sonntag 06:00 Uhr `Europe/Berlin` genau ein idempotenter Syncjob; wiederholter Tick kein Duplikat; strikte Payloads; aktive Lease; beide Jobtypen umgehen Generierungsrun und Artikelpipeline.

- [ ] **Step 2: Tests ausführen**

Run: `node --test tests/contentSearchScheduler.test.js tests/contentAgentWorker.test.js tests/contentAgentJobRepository.test.js`
Expected: FAIL für die neuen Jobtypen und den Scheduler.

- [ ] **Step 3: Frühen Workerdispatch implementieren**

`sync_search_console` akzeptiert nur `startDate` und `endDate`, ruft den Syncservice mit Lease auf und legt nach Erfolg `analyze_search_opportunities` mit `gsc-analysis:<startDate>:<endDate>` an. `analyze_search_opportunities` liest aggregierte Metriken, baut Chancen und führt den idempotenten Upsert aus. Beide liefern `{ status: 'completed' }` und werden vor dem allgemeinen Run-/Pipelinepfad behandelt.

- [ ] **Step 4: Scheduler implementieren**

Standard ist `CONTENT_AGENT_GSC_SCHEDULE=0 6 * * 0`. Der Dienst validiert dieses Fünf-Feld-Format für Minute, Stunde und Wochentag, verwendet die konfigurierte Zeitzone und legt `gsc-sync:<lokales-Sonntagsdatum>` an. Das Fenster umfasst 28 Tage bis einschließlich des Vortags. Ein fehlender GSC-Konfigurationsstatus bleibt ohne Job und ohne Fehler für die Artikelpipeline.

- [ ] **Step 5: Tests und Commit**

Run: `node --test tests/contentSearchScheduler.test.js tests/contentAgentWorker.test.js tests/contentAgentJobRepository.test.js && OPENAI_API_KEY=test npm test`
Expected: alle Tests PASS.

~~~bash
git add services/contentAgent/searchConsoleSchedulerService.js scripts/contentWorker.js repositories/contentJobRepository.js repositories/contentProviderStateRepository.js tests/contentSearchScheduler.test.js tests/contentAgentWorker.test.js tests/contentAgentJobRepository.test.js
git commit -m "feat: run search console jobs safely"
~~~

### Task 6: Geschützte, rein lesende Adminauswertung

**Files:**
- Create: `views/admin/contentAgent/searchConsole.ejs`
- Modify: `views/admin/contentAgent/_tabs.ejs`
- Modify: `repositories/contentAgentAdminRepository.js`
- Modify: `services/contentAgent/adminPresentationService.js`
- Modify: `controllers/adminContentAgentController.js`
- Modify: `routes/adminContentAgentRoutes.js`
- Create: `tests/contentSearchAdminIntegration.test.js`

**Interfaces:**
- Produces: GET `/admin/content-agent/search-console` und POST `/admin/content-agent/search-console/sync`.

- [ ] **Step 1: Fehlschlagenden Adminintegrationstest schreiben**

Prüfen: beide Routen sind adminpflichtig, POST besitzt CSRF-Schutz, Konfigurationsstatus enthält nur ein Boolean, Tabellen zeigen Query, Klicks, Impressionen, CTR, Position und Empfehlung und dynamische Texte werden über EJS escaped.

- [ ] **Step 2: Test ausführen**

Run: `node --test tests/contentSearchAdminIntegration.test.js`
Expected: FAIL wegen fehlender Route/View.

- [ ] **Step 3: Repository und Präsentation implementieren**

Die Seite lädt höchstens 100 aggregierte Queryzeilen und 100 offene Chancen. Prozent- und Positionswerte werden serverseitig formatiert; Rohpayloads, Credentialpfad und JSON-Schlüssel werden nie an die View gegeben.

- [ ] **Step 4: Route, Controller und View implementieren**

Der manuelle Sync prüft `searchConsoleConfigured === true`, aktiven Agenten und maximale Versuche, legt einen Job für das 28-Tage-Fenster mit `gsc-manual-sync:<YYYY-MM-DD>` an und leitet mit Statusmeldung zurück. Die Seite verändert keine Artikel und bietet keine automatische „Empfehlung anwenden“-Aktion.

- [ ] **Step 5: Tests und Commit**

Run: `node --test tests/contentSearchAdminIntegration.test.js && npm run build`
Expected: Adminschutz, CSRF, Limits, Escape und Build PASS.

~~~bash
git add views/admin/contentAgent/searchConsole.ejs views/admin/contentAgent/_tabs.ejs repositories/contentAgentAdminRepository.js services/contentAgent/adminPresentationService.js controllers/adminContentAgentController.js routes/adminContentAgentRoutes.js tests/contentSearchAdminIntegration.test.js
git commit -m "feat: add search console admin insights"
~~~

### Task 7: Inerte Docker-Secret- und IONOS-Anleitung

**Files:**
- Modify: `docs/deployment/content-agent-ionos-vps.md`
- Modify: `tests/contentAgentDeploymentGuide.test.js`
- Modify: `.gitignore`

**Interfaces:**
- Produces: sichere Search-Console-Einrichtung auf dem VPS.

- [ ] **Step 1: Fehlschlagenden Dokumentationstest erweitern**

~~~js
assert.match(guide, /gsc_credentials:/);
assert.match(guide, /GOOGLE_APPLICATION_CREDENTIALS/);
assert.match(guide, /SEARCH_CONSOLE_SITE_URL=sc-domain:komplettwebdesign\.de/);
assert.match(guide, /webmasters\.readonly/);
~~~

- [ ] **Step 2: Test ausführen**

Run: `node --test tests/contentAgentDeploymentGuide.test.js`
Expected: FAIL.

- [ ] **Step 3: Secret-Einrichtung dokumentieren**

~~~bash
cd ~/apps/komplettwebdesign
umask 077
mkdir -p ./secrets
chmod 700 ./secrets
chmod 600 ./secrets/gsc-service-account.json
~~~

Die JSON-Datei wird außerhalb des automatisch aktualisierten `server/`-Repositorys abgelegt. `.gitignore` schließt zusätzlich `secrets/*.json` und `secrets/` aus. Die Anleitung zeigt niemals den privaten JSON-Inhalt und verwendet kein `cat`.

Compose-Ergänzung:

~~~yaml
services:
  content-worker:
    secrets:
      - source: gsc_credentials
        target: gsc-service-account.json

secrets:
  gsc_credentials:
    file: ./secrets/gsc-service-account.json
~~~

`.env`:

~~~dotenv
SEARCH_CONSOLE_SITE_URL=sc-domain:komplettwebdesign.de
GOOGLE_APPLICATION_CREDENTIALS=/run/secrets/gsc-service-account.json
CONTENT_AGENT_GSC_SCHEDULE=0 6 * * 0
~~~

Die Service-Account-E-Mail wird in der Search Console als eingeschränkter Nutzer der Property ergänzt. Der OAuth-Scope bleibt read-only.

- [ ] **Step 4: Migration, Neustart und Prüfung dokumentieren**

~~~bash
docker compose run --rm app npm run migrate:content-agent
docker compose up -d --no-deps --force-recreate app content-worker
docker compose logs --tail=100 content-worker
~~~

Zusätzlich wird ein Adminbutton „Search Console jetzt synchronisieren“ als sicherer Funktionstest dokumentiert.

- [ ] **Step 5: Tests und Commit**

Run: `node --test tests/contentAgentDeploymentGuide.test.js && npm test`
Expected: alle Tests PASS.

~~~bash
git add .gitignore docs/deployment/content-agent-ionos-vps.md tests/contentAgentDeploymentGuide.test.js
git commit -m "docs: add search console VPS setup"
~~~

## Plan-C-Abnahme

- [ ] Credential ist nur als Docker Secret vorhanden.
- [ ] API-Client verwendet ausschließlich `webmasters.readonly`.
- [ ] 28-Tage-Synchronisation ist idempotent.
- [ ] Fehlende Search Console blockiert keine Artikelgenerierung.
- [ ] Die geschützte Adminseite zeigt belegte Chancen ohne automatische Änderungen.
- [ ] `npm test` und `npm run build` sind vollständig erfolgreich.
