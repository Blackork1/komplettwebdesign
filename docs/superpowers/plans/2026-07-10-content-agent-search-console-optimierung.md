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

### Task 1: Search-Metriken-Schema

**Files:**
- Create: `scripts/migrations/004_create_content_search_metrics.sql`
- Create: `scripts/runContentSearchMetricsMigration.js`
- Modify: `package.json`
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
  opportunity_type VARCHAR(64) NOT NULL,
  primary_query TEXT,
  score NUMERIC(5,2) NOT NULL,
  evidence_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  recommendation_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(32) NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_content_opportunities_status_score
  ON content_opportunities (status, score DESC, created_at DESC);
~~~

- [ ] **Step 4: Runner und npm-Skript ergänzen**

~~~json
"migrate:content-search": "node scripts/runContentSearchMetricsMigration.js"
~~~

- [ ] **Step 5: Tests und Commit**

Run: `node --test tests/contentSearchMetricsMigration.test.js && npm test`  
Expected: alle Tests PASS.

~~~bash
git add scripts/migrations/004_create_content_search_metrics.sql scripts/runContentSearchMetricsMigration.js package.json tests/contentSearchMetricsMigration.test.js
git commit -m "feat: add search console metrics schema"
~~~

### Task 2: Read-only Search-Console-Client

**Files:**
- Create: `services/contentAgent/searchConsoleClient.js`
- Modify: `services/contentAgent/config.js`
- Modify: `package.json`
- Modify: `package-lock.json`
- Test: `tests/searchConsoleClient.test.js`

**Interfaces:**
- Produces: `createSearchConsoleClient(options)` mit `querySearchAnalytics(request)` und `isConfigured()`.

- [ ] **Step 1: Fehlschlagenden Clienttest schreiben**

Der Test injiziert einen Authclient mit `request(options)` und prüft URL-Encoding von `sc-domain:komplettwebdesign.de`, POST-Methode, readonly Scope und Requestbody.

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
    const auth = authFactory
      ? authFactory()
      : new GoogleAuth({ keyFile: credentialsPath, scopes: [READONLY_SCOPE] });
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
searchConsoleSchedule: env.CONTENT_AGENT_GSC_SCHEDULE || '0 6 * * 0'
~~~

- [ ] **Step 6: Tests und Commit**

Run: `node --test tests/searchConsoleClient.test.js tests/contentAgentConfig.test.js`  
Expected: alle Tests PASS.

~~~bash
git add services/contentAgent/searchConsoleClient.js services/contentAgent/config.js package.json package-lock.json tests/searchConsoleClient.test.js
git commit -m "feat: connect search console read only"
~~~

### Task 3: Paginierter Import und normalisierte Speicherung

**Files:**
- Create: `repositories/contentSearchMetricsRepository.js`
- Create: `services/contentAgent/searchConsoleSyncService.js`
- Test: `tests/searchConsoleSyncService.test.js`

**Interfaces:**
- Produces: `syncSearchConsoleRange({ startDate, endDate })`, `upsertSearchMetrics(rows)` und `mapPageUrlToPostId`.

- [ ] **Step 1: Fehlschlagenden Synctest schreiben**

Zwei API-Seiten simulieren: erste Seite 25.000 Zeilen, zweite Seite 2 Zeilen, dritte leer. Prüfen, dass `startRow` 0, 25.000 und 25.002 verwendet wird und alle Zeilen gespeichert werden.

- [ ] **Step 2: Test ausführen**

Run: `node --test tests/searchConsoleSyncService.test.js`  
Expected: FAIL.

- [ ] **Step 3: Synchronisationsservice implementieren**

Request:

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

Leere Zeilenliste beendet die Pagination. Ein fehlender Post-Match darf als `post_id = null` gespeichert werden, damit neue Inhaltslücken erkennbar bleiben.

- [ ] **Step 4: Repository-Upsert implementieren**

~~~sql
INSERT INTO content_search_metrics (
  post_id, metric_date, page_url, query, device,
  clicks, impressions, ctr, average_position, fetched_at
)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
ON CONFLICT (metric_date, page_url, query, device)
DO UPDATE SET
  post_id = COALESCE(EXCLUDED.post_id, content_search_metrics.post_id),
  clicks = EXCLUDED.clicks,
  impressions = EXCLUDED.impressions,
  ctr = EXCLUDED.ctr,
  average_position = EXCLUDED.average_position,
  fetched_at = NOW();
~~~

- [ ] **Step 5: Tests und Commit**

Run: `node --test tests/searchConsoleSyncService.test.js`  
Expected: Pagination, Normalisierung und Upsert PASS.

~~~bash
git add repositories/contentSearchMetricsRepository.js services/contentAgent/searchConsoleSyncService.js tests/searchConsoleSyncService.test.js
git commit -m "feat: sync search console performance data"
~~~

### Task 4: Datenbasierte Chancenbewertung

**Files:**
- Create: `services/contentAgent/searchOpportunityService.js`
- Modify: `services/contentAgent/topicScoringService.js`
- Test: `tests/searchOpportunityService.test.js`

**Interfaces:**
- Produces: `calculateSearchOpportunity(metrics)` und `buildContentOpportunities(metrics, inventory)`.

- [ ] **Step 1: Fehlschlagende Scoringtests schreiben**

Fixtures:

- Position 12, 500 Impressionen, 1 Prozent CTR ergibt hohe Inhaltschance.
- Position 4, 2.000 Impressionen, 0,5 Prozent CTR ergibt hohe Meta-Chance.
- Position 1, 20 Impressionen, 60 Prozent CTR ergibt keine Priorität.

- [ ] **Step 2: Test ausführen**

Run: `node --test tests/searchOpportunityService.test.js`  
Expected: FAIL.

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
  const score =
    impressionScore(metrics.impressions) * 0.45 +
    positionScore(metrics.averagePosition) * 0.35 +
    ctrGapScore(metrics.averagePosition, metrics.ctr) * 0.20;
  return Math.round(score * 100) / 100;
}
~~~

- [ ] **Step 4: Opportunity-Typen implementieren**

`meta_refresh` bei Position bis 10 und niedriger CTR; `content_refresh` bei Position 8 bis 20; `new_article` nur, wenn keine passende Seite existiert; `internal_links` bei Position 8 bis 30 und schwacher interner Verlinkung.

- [ ] **Step 5: Themen-Scoring anbinden**

Search-Console-Score ersetzt `searchOpportunity` nur, wenn belastbare Metriken vorliegen. Geschäftsnutzen, Mindestscore und Kannibalisierungsgrenze bleiben unverändert.

- [ ] **Step 6: Tests und Commit**

Run: `node --test tests/searchOpportunityService.test.js tests/contentAgentTopicScoring.test.js`  
Expected: alle Tests PASS.

~~~bash
git add services/contentAgent/searchOpportunityService.js services/contentAgent/topicScoringService.js tests/searchOpportunityService.test.js
git commit -m "feat: derive content opportunities from search data"
~~~

### Task 5: Workerjobs und Adminauswertung

**Files:**
- Modify: `services/contentAgent/workerService.js`
- Modify: `scripts/contentWorker.js`
- Modify: `repositories/contentAdminRepository.js`
- Modify: `controllers/adminContentAgentController.js`
- Modify: `views/admin/content_agent_dashboard.ejs`
- Test: `tests/contentSearchAdminIntegration.test.js`

**Interfaces:**
- Produces: Jobtypen `sync_search_console` und `analyze_search_opportunities` sowie Dashboardtabellen.

- [ ] **Step 1: Fehlschlagenden Integrationstest schreiben**

Prüfen: Worker kennt beide Jobtypen; Sonntag-Cron legt einen idempotenten Syncjob an; Dashboard zeigt Query, Klicks, Impressionen, CTR, Position und Empfehlung.

- [ ] **Step 2: Test ausführen**

Run: `node --test tests/contentSearchAdminIntegration.test.js`  
Expected: FAIL.

- [ ] **Step 3: Workerhandler ergänzen**

`sync_search_console` importiert die letzten 28 finalisierten Tage. Nach Erfolg wird `analyze_search_opportunities` mit Idempotenzschlüssel aus Enddatum und Importlauf angelegt.

- [ ] **Step 4: Cron ergänzen**

Sonntag 06:00 Uhr Europe/Berlin, getrennt vom Artikelcron. Ist Search Console nicht konfiguriert, wird kein Job angelegt und eine einmalige Warnung geloggt.

- [ ] **Step 5: Dashboard ergänzen**

Top-Chancen zeigen Belegwerte und erzeugen per Adminaktion einen normalen `generate_manual_draft`- oder `regenerate_metadata`-Job. Keine Empfehlung verändert automatisch Inhalte.

- [ ] **Step 6: Tests und Commit**

Run: `node --test tests/contentSearchAdminIntegration.test.js && npm run build && npm test`  
Expected: alle Tests und Build PASS.

~~~bash
git add services/contentAgent/workerService.js scripts/contentWorker.js repositories/contentAdminRepository.js controllers/adminContentAgentController.js views/admin/content_agent_dashboard.ejs tests/contentSearchAdminIntegration.test.js
git commit -m "feat: surface search driven content opportunities"
~~~

### Task 6: Docker Secret und IONOS-Anleitung

**Files:**
- Modify: `docs/deployment/content-agent-ionos-vps.md`
- Modify: `tests/contentAgentDeploymentGuide.test.js`
- Modify: `.gitignore`

**Interfaces:**
- Produces: sichere Search-Console-Einrichtung auf dem VPS.

- [ ] **Step 1: Fehlschlagenden Dokumentationstest erweitern**

~~~js
assert.match(guide, /google_search_console:/);
assert.match(guide, /GOOGLE_APPLICATION_CREDENTIALS/);
assert.match(guide, /SEARCH_CONSOLE_SITE_URL=sc-domain:komplettwebdesign\.de/);
assert.match(guide, /webmasters\.readonly/);
~~~

- [ ] **Step 2: Test ausführen**

Run: `node --test tests/contentAgentDeploymentGuide.test.js`  
Expected: FAIL.

- [ ] **Step 3: Secret-Einrichtung dokumentieren**

~~~bash
cd /home/webadmin/apps/komplettwebdesign
mkdir -p ./secrets
chmod 700 ./secrets
nano ./secrets/google-search-console.json
chmod 600 ./secrets/google-search-console.json
~~~

`.gitignore` auf dem Server beziehungsweise im Repository schließt `secrets/*.json` aus.

Compose-Ergänzung:

~~~yaml
services:
  content-worker:
    secrets:
      - google_search_console
    environment:
      GOOGLE_APPLICATION_CREDENTIALS: /run/secrets/google-search-console.json

secrets:
  google_search_console:
    file: ./secrets/google-search-console.json
~~~

`.env`:

~~~dotenv
SEARCH_CONSOLE_SITE_URL=sc-domain:komplettwebdesign.de
CONTENT_AGENT_GSC_SCHEDULE=0 6 * * 0
~~~

Die Service-Account-E-Mail wird in der Search Console als eingeschränkter Nutzer der Property ergänzt. Der OAuth-Scope bleibt read-only.

- [ ] **Step 4: Migration, Neustart und Prüfung dokumentieren**

~~~bash
docker compose run --rm app npm run migrate:content-search
docker compose up -d content-worker
docker compose logs --tail=100 content-worker
~~~

Zusätzlich wird ein Adminbutton „Search Console jetzt synchronisieren“ als sicherer Funktionstest dokumentiert.

- [ ] **Step 5: Tests und Commit**

Run: `node --test tests/contentAgentDeploymentGuide.test.js && npm test`  
Expected: alle Tests PASS.

~~~bash
git add docs/deployment/content-agent-ionos-vps.md tests/contentAgentDeploymentGuide.test.js
git commit -m "docs: add search console VPS setup"
~~~

## Plan-C-Abnahme

- [ ] Credential ist nur als Docker Secret vorhanden.
- [ ] API-Client verwendet ausschließlich `webmasters.readonly`.
- [ ] 28-Tage-Synchronisation ist idempotent.
- [ ] Fehlende Search Console blockiert keine Artikelgenerierung.
- [ ] Dashboard zeigt belegte Chancen ohne automatische Änderungen.
- [ ] `npm test` und `npm run build` sind vollständig erfolgreich.
