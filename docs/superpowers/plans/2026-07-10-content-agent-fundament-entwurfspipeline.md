# Content-Agent Fundament und Entwurfspipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Einen separaten Docker-Worker bauen, der wöchentlich oder auf manuellen Datenbankauftrag ein Thema auswählt, einen validierten Blogartikel samt Bild erzeugt und ihn garantiert unveröffentlicht speichert.

**Architecture:** Express bleibt für Website und Adminoberfläche zuständig. Ein separater Worker nutzt PostgreSQL als Queue, führt eine explizite Pipeline aus und greift über injizierbare Adapter auf OpenAI und Cloudinary zu. Bestehende EJS-Bloginhalte bleiben kompatibel; neue Inhalte werden als sanitisiertes statisches HTML gerendert.

**Tech Stack:** Node.js 20, ES-Module, Express 5, PostgreSQL 16, pg, node-cron, OpenAI Responses API, Zod, Cheerio, sanitize-html, Cloudinary, EJS, Bootstrap 5, node:test, Docker Compose auf IONOS VPS.

## Global Constraints

- Sichtbarer deutscher Text verwendet korrekte Umlaute und deutsche Grammatik.
- Neue Blogartikel verwenden den professionellen Du-Ton von Komplett Webdesign.
- Der Blogtitel bleibt die einzige H1; generiertes HTML enthält keine H1 und keinen äußeren Bootstrap-Container.
- Jeder generierte Beitrag erhält `published = false` und `workflow_status = 'needs_review'`.
- `CONTENT_AGENT_AUTOPUBLISH_ENABLED` bleibt in diesem Plan `false`.
- Preise und Leistungsumfänge kommen aus der zentralen Pricing-Logik.
- API-Schlüssel stehen ausschließlich in Umgebungsvariablen oder Docker Secrets.
- Bestehende Chat- und Embedding-Aufrufe werden nicht migriert.
- Jeder Task beginnt mit einem fehlschlagenden Test und endet mit einem fokussierten Commit.
- Spezifikation: `docs/superpowers/specs/2026-07-10-automatisierte-blogartikel-content-agent-design.md`.

---

## Dateistruktur

~~~text
data/contentAgentProfile.js
data/contentAgentLinks.js
repositories/contentJobRepository.js
repositories/contentRunRepository.js
repositories/contentTopicRepository.js
services/contentAgent/articleSchemas.js
services/contentAgent/config.js
services/contentAgent/articleSanitizer.js
services/contentAgent/articleValidator.js
services/contentAgent/cannibalizationService.js
services/contentAgent/topicScoringService.js
services/contentAgent/siteInventoryService.js
services/contentAgent/webResearchService.js
services/contentAgent/contentCostService.js
services/contentAgent/openaiContentService.js
services/contentAgent/contentImageService.js
services/contentAgent/draftPipeline.js
services/contentAgent/workerService.js
services/contentAgent/prompts/brandPolicy.js
services/contentAgent/prompts/topicResearchPrompt.js
services/contentAgent/prompts/webResearchPrompt.js
services/contentAgent/prompts/seoBriefPrompt.js
services/contentAgent/prompts/articleWriterPrompt.js
services/contentAgent/prompts/articleReviewerPrompt.js
services/contentAgent/prompts/articleRepairPrompt.js
scripts/contentWorker.js
scripts/contentAgentDryRun.js
scripts/contentWorkerHealthcheck.js
scripts/runContentAgentMigration.js
scripts/migrations/002_create_content_agent_core.sql
tests/contentAgentMigration.test.js
tests/contentAgentConfig.test.js
tests/contentAgentArticleValidator.test.js
tests/contentAgentJobRepository.test.js
tests/contentAgentTopicScoring.test.js
tests/contentAgentOpenAIService.test.js
tests/contentAgentCostService.test.js
tests/contentAgentDraftPipeline.test.js
tests/contentAgentWorker.test.js
tests/contentAgentDeploymentGuide.test.js
tests/blogContentFormat.test.js
docs/deployment/content-agent-ionos-vps.md
~~~

### Task 1: Additive Datenbankmigration

**Files:**
- Create: `scripts/migrations/002_create_content_agent_core.sql`
- Create: `scripts/runContentAgentMigration.js`
- Modify: `package.json`
- Test: `tests/contentAgentMigration.test.js`

**Interfaces:**
- Consumes: PostgreSQL-Pool aus `util/db.js`.
- Produces: additive Blogspalten sowie Queue-, Lauf-, Themen-, Metadaten-, Einstellungs- und Worker-Tabellen.

- [ ] **Step 1: Fehlschlagenden Migrationstest schreiben**

~~~js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync(
  new URL('../scripts/migrations/002_create_content_agent_core.sql', import.meta.url),
  'utf8'
);

test('content agent migration is additive', () => {
  assert.match(sql, /ALTER TABLE posts ADD COLUMN IF NOT EXISTS workflow_status/i);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS content_format/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS content_jobs/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS content_runs/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS content_topics/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS content_post_metadata/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS content_agent_settings/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS content_worker_state/i);
  assert.match(sql, /UNIQUE \(idempotency_key\)/i);
});
~~~

- [ ] **Step 2: Test ausführen**

Run: `node --test tests/contentAgentMigration.test.js`  
Expected: FAIL mit `ENOENT`.

- [ ] **Step 3: SQL-Migration implementieren**

Die Migration enthält diese vollständigen Objekte:

~~~sql
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS meta_title VARCHAR(255),
  ADD COLUMN IF NOT EXISTS meta_description TEXT,
  ADD COLUMN IF NOT EXISTS og_title VARCHAR(255),
  ADD COLUMN IF NOT EXISTS og_description TEXT,
  ADD COLUMN IF NOT EXISTS image_alt TEXT,
  ADD COLUMN IF NOT EXISTS workflow_status VARCHAR(32),
  ADD COLUMN IF NOT EXISTS content_format VARCHAR(32),
  ADD COLUMN IF NOT EXISTS generated_by_ai BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

UPDATE posts
SET workflow_status = CASE WHEN published THEN 'published' ELSE 'draft' END,
    content_format = COALESCE(content_format, 'legacy_ejs'),
    meta_description = COALESCE(meta_description, description),
    published_at = CASE WHEN published AND published_at IS NULL THEN created_at ELSE published_at END
WHERE workflow_status IS NULL
   OR content_format IS NULL
   OR meta_description IS NULL
   OR (published AND published_at IS NULL);

ALTER TABLE posts
  ALTER COLUMN workflow_status SET DEFAULT 'draft',
  ALTER COLUMN workflow_status SET NOT NULL,
  ALTER COLUMN content_format SET DEFAULT 'legacy_ejs',
  ALTER COLUMN content_format SET NOT NULL;

CREATE TABLE IF NOT EXISTS content_jobs (
  id BIGSERIAL PRIMARY KEY,
  job_type VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'queued',
  idempotency_key VARCHAR(180) NOT NULL UNIQUE,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  run_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  locked_at TIMESTAMPTZ,
  locked_by VARCHAR(180),
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_content_jobs_claim ON content_jobs (status, run_after, created_at);

CREATE TABLE IF NOT EXISTS content_topics (
  id BIGSERIAL PRIMARY KEY,
  topic TEXT NOT NULL,
  suggested_title TEXT,
  primary_keyword TEXT NOT NULL,
  secondary_keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
  content_cluster VARCHAR(120) NOT NULL,
  search_intent VARCHAR(80) NOT NULL,
  target_audience TEXT NOT NULL,
  source VARCHAR(64) NOT NULL,
  business_value NUMERIC(4,2) NOT NULL DEFAULT 0,
  search_opportunity NUMERIC(4,2) NOT NULL DEFAULT 0,
  problem_purchase_proximity NUMERIC(4,2) NOT NULL DEFAULT 0,
  internal_link_potential NUMERIC(4,2) NOT NULL DEFAULT 0,
  local_relevance NUMERIC(4,2) NOT NULL DEFAULT 0,
  cluster_fit NUMERIC(4,2) NOT NULL DEFAULT 0,
  cannibalization_risk NUMERIC(4,2) NOT NULL DEFAULT 0,
  final_score NUMERIC(4,2) NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'candidate',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS content_runs (
  id BIGSERIAL PRIMARY KEY,
  job_id BIGINT REFERENCES content_jobs(id) ON DELETE SET NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'running',
  current_stage VARCHAR(64) NOT NULL DEFAULT 'inventory',
  selected_topic_id BIGINT REFERENCES content_topics(id) ON DELETE SET NULL,
  post_id INTEGER REFERENCES posts(id) ON DELETE SET NULL,
  token_usage_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  cost_estimate NUMERIC(12,6) NOT NULL DEFAULT 0,
  openai_response_ids_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  error_report_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  stage_results_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS content_post_metadata (
  post_id INTEGER PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
  primary_keyword TEXT NOT NULL,
  secondary_keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
  search_intent VARCHAR(80) NOT NULL,
  target_audience TEXT NOT NULL,
  region_focus TEXT,
  content_cluster VARCHAR(120) NOT NULL,
  business_goal TEXT NOT NULL,
  cta_type VARCHAR(80) NOT NULL,
  internal_links_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_references_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  seo_brief_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  quality_score INTEGER NOT NULL DEFAULT 0,
  quality_report_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  generation_metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS content_agent_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  schedule_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  auto_publish_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  auto_publish_min_score INTEGER NOT NULL DEFAULT 90,
  manual_approvals_count INTEGER NOT NULL DEFAULT 0,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO content_agent_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS content_worker_state (
  worker_name VARCHAR(80) PRIMARY KEY,
  worker_id VARCHAR(180) NOT NULL,
  heartbeat_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  last_job_at TIMESTAMPTZ,
  version VARCHAR(80) NOT NULL
);
~~~

- [ ] **Step 4: Migrationsrunner implementieren**

~~~js
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import pool from '../util/db.js';

export async function runContentAgentMigration(db = pool) {
  const sql = await readFile(new URL('./migrations/002_create_content_agent_core.sql', import.meta.url), 'utf8');
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('kwd_content_agent_migration_002'))");
    await client.query(sql);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

const currentFile = fileURLToPath(import.meta.url);
const entryFile = process.argv[1]
  ? fileURLToPath(pathToFileURL(process.argv[1]))
  : null;

if (currentFile === entryFile) {
  runContentAgentMigration()
    .then(async () => {
      console.log('Content-Agent-Migration 002 erfolgreich.');
      await pool.end();
    })
    .catch(async (error) => {
      console.error('Content-Agent-Migration 002 fehlgeschlagen:', error.message);
      await pool.end();
      process.exitCode = 1;
    });
}
~~~

`package.json` erhält:

~~~json
"migrate:content-agent": "node scripts/runContentAgentMigration.js"
~~~

- [ ] **Step 5: Abhängigkeiten installieren**

Run: `npm install zod cheerio sanitize-html`  
Expected: `package.json` und `package-lock.json` enthalten alle drei Pakete.

- [ ] **Step 6: Tests ausführen**

Run: `node --test tests/contentAgentMigration.test.js && npm test`  
Expected: Migrationstest PASS; Gesamtsuite vollständig PASS.

- [ ] **Step 7: Commit**

~~~bash
git add package.json package-lock.json scripts/migrations/002_create_content_agent_core.sql scripts/runContentAgentMigration.js tests/contentAgentMigration.test.js
git commit -m "feat: add content agent database foundation"
~~~

### Task 2: Konfiguration, Markenprofil und Schemata

**Files:**
- Create: `services/contentAgent/config.js`
- Create: `services/contentAgent/articleSchemas.js`
- Create: `data/contentAgentProfile.js`
- Create: `data/contentAgentLinks.js`
- Test: `tests/contentAgentConfig.test.js`

**Interfaces:**
- Produces: `getContentAgentConfig(env)`, `ArticleOutputSchema`, `SeoBriefSchema`, `TopicCandidatesSchema` und `ReviewOutputSchema`.

- [ ] **Step 1: Fehlschlagende Tests schreiben**

~~~js
import test from 'node:test';
import assert from 'node:assert/strict';
import { getContentAgentConfig } from '../services/contentAgent/config.js';

test('config defaults to drafts in Europe Berlin', () => {
  const config = getContentAgentConfig({});
  assert.equal(config.publishMode, 'draft');
  assert.equal(config.timezone, 'Europe/Berlin');
  assert.equal(config.maxTopicCandidates, 8);
  assert.equal(config.autoPublishEnabled, false);
  assert.equal(config.monthlyCostLimitEur, 25);
});
~~~

- [ ] **Step 2: Test ausführen**

Run: `node --test tests/contentAgentConfig.test.js`  
Expected: FAIL mit `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Konfiguration implementieren**

~~~js
function integer(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

function boolean(value, fallback = false) {
  if (value === undefined) return fallback;
  return String(value).toLowerCase() === 'true';
}

function decimal(value, fallback) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function getContentAgentConfig(env = process.env) {
  return Object.freeze({
    enabled: boolean(env.CONTENT_AGENT_ENABLED, false),
    publishMode: env.CONTENT_AGENT_PUBLISH_MODE === 'auto' ? 'auto' : 'draft',
    schedule: env.CONTENT_AGENT_SCHEDULE || '0 9 * * 1',
    timezone: env.CONTENT_AGENT_TIMEZONE || 'Europe/Berlin',
    maxTopicCandidates: integer(env.CONTENT_AGENT_MAX_TOPIC_CANDIDATES, 8, 1, 20),
    maxRevisions: integer(env.CONTENT_AGENT_MAX_REVISIONS, 2, 0, 4),
    maxAttempts: integer(env.CONTENT_AGENT_MAX_ATTEMPTS, 3, 1, 5),
    autoPublishEnabled: boolean(env.CONTENT_AGENT_AUTOPUBLISH_ENABLED, false),
    contentModel: env.OPENAI_CONTENT_MODEL || 'gpt-5.4',
    reviewModel: env.OPENAI_REVIEW_MODEL || 'gpt-5.4-mini',
    imageModel: env.OPENAI_IMAGE_MODEL || 'gpt-image-2',
    monthlyCostLimitEur: decimal(env.CONTENT_AGENT_MONTHLY_COST_LIMIT_EUR, 25),
    contentInputCostPerMtok: decimal(env.OPENAI_CONTENT_INPUT_COST_PER_MTOK, 2.50),
    contentOutputCostPerMtok: decimal(env.OPENAI_CONTENT_OUTPUT_COST_PER_MTOK, 15),
    reviewInputCostPerMtok: decimal(env.OPENAI_REVIEW_INPUT_COST_PER_MTOK, 0.75),
    reviewOutputCostPerMtok: decimal(env.OPENAI_REVIEW_OUTPUT_COST_PER_MTOK, 4.50),
    imageCostEur: decimal(env.OPENAI_IMAGE_COST_EUR, 0.041),
    workerPollMs: integer(env.CONTENT_AGENT_WORKER_POLL_MS, 5000, 1000, 60000),
    jobLeaseMinutes: integer(env.CONTENT_AGENT_JOB_LEASE_MINUTES, 30, 5, 180)
  });
}
~~~

- [ ] **Step 4: Markenprofil und Linkliste anlegen**

`data/contentAgentProfile.js` enthält Zielgruppen, Tonalität, verbotene Floskeln, Cluster und Seed-Themen. `data/contentAgentLinks.js` enthält ausschließlich existierende Pfade:

~~~js
export const CONTENT_AGENT_LINKS = Object.freeze([
  { url: '/kontakt', type: 'contact', label: 'Beratung anfragen' },
  { url: '/pakete', type: 'offer', label: 'Pakete ansehen' },
  { url: '/webdesign-berlin', type: 'service', label: 'Webdesign in Berlin' },
  { url: '/leistungen/website-relaunch', type: 'service', label: 'Website-Relaunch' },
  { url: '/leistungen/local-seo', type: 'service', label: 'Local SEO' },
  { url: '/leistungen/website-audit', type: 'service', label: 'Website-Audit' },
  { url: '/leistungen/landingpage-erstellen-lassen', type: 'service', label: 'Landingpage erstellen lassen' },
  { url: '/website-tester', type: 'tool', label: 'Website kostenlos prüfen' }
]);
~~~

- [ ] **Step 5: Zod-Schemata implementieren**

`ArticleOutputSchema` verlangt Titel, Kurzbeschreibung, Meta- und OG-Daten, ASCII-Slug, mindestens 5.000 Zeichen HTML, fünf bis sieben FAQ, Bilddaten, SEO-, Lead-, Quellen-, Risiko- und Selbstprüfungsobjekte. `SeoBriefSchema` verlangt 1.200 bis 3.200 Wörter, fünf bis sechzehn Gliederungspunkte, zwei bis acht interne Links und fünf bis sieben FAQ-Fragen. Alle Objekt-Schemata verwenden `.strict()`.

Risikoschema:

~~~js
export const RiskSchema = z.object({
  currentClaims: z.boolean(),
  legalClaims: z.boolean(),
  privacyClaims: z.boolean(),
  softwareVersionClaims: z.boolean(),
  staticPrices: z.boolean()
}).strict();
~~~

- [ ] **Step 6: Tests ausführen**

Run: `node --test tests/contentAgentConfig.test.js`  
Expected: alle Tests PASS.

- [ ] **Step 7: Commit**

~~~bash
git add data/contentAgentProfile.js data/contentAgentLinks.js services/contentAgent/config.js services/contentAgent/articleSchemas.js tests/contentAgentConfig.test.js
git commit -m "feat: define content agent contracts"
~~~

### Task 3: Statisches Artikel-HTML validieren

**Files:**
- Create: `services/contentAgent/articleSanitizer.js`
- Create: `services/contentAgent/articleValidator.js`
- Test: `tests/contentAgentArticleValidator.test.js`

**Interfaces:**
- Produces: `sanitizeArticleHtml(html)` und `validateArticle(article, context)` mit `{ passed, sanitizedHtml, issues }`.

- [ ] **Step 1: Fehlschlagenden Validator-Test schreiben**

~~~js
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateArticle } from '../services/contentAgent/articleValidator.js';

test('validator rejects h1, scripts, ejs and unknown links', () => {
  const result = validateArticle({
    metaTitle: 'Ein ausreichend langer Meta Title für diesen Test',
    metaDescription: 'Eine ausreichend lange Meta Description mit einer konkreten Aussage für diesen technischen Test.',
    slug: 'gueltiger-slug',
    contentHtml: '<h1>Falsch</h1><script>alert(1)</script><p><%= secret %></p><a href="/falsch">Link</a>',
    faqJson: []
  }, {
    allowedInternalLinks: ['/kontakt'],
    allowedExternalUrls: [],
    existingSlugs: []
  });
  assert.equal(result.passed, false);
  assert.ok(result.issues.some((issue) => issue.code === 'h1_forbidden'));
  assert.ok(result.issues.some((issue) => issue.code === 'script_forbidden'));
  assert.ok(result.issues.some((issue) => issue.code === 'ejs_forbidden'));
  assert.ok(result.issues.some((issue) => issue.code === 'internal_link_forbidden'));
});
~~~

- [ ] **Step 2: Test ausführen**

Run: `node --test tests/contentAgentArticleValidator.test.js`  
Expected: FAIL mit `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Sanitizer implementieren**

`sanitizeArticleHtml` nutzt `sanitize-html`. Erlaubte Tags: `section`, `div`, `p`, `h2`, `h3`, `h4`, `ul`, `ol`, `li`, `strong`, `em`, `blockquote`, `a`, `span`, `small`, `hr`, `table`, `thead`, `tbody`, `tr`, `th` und `td`. Erlaubte Attribute: `class`, `href`, `role`, `aria-*`, `data-track`, `data-cta-name`, `data-cta-location`, `data-faq-question` und `data-faq-answer`. Der Sanitizer lässt nur relative Pfade sowie HTTP- und HTTPS-Links zu; der Validator prüft externe URLs zusätzlich gegen `sourceReferences`.

- [ ] **Step 4: Validator implementieren**

Der Validator verwendet Cheerio und erzeugt eindeutige Codes für H1, Skript, EJS, Inline-Style, Bild, äußeren Container, Meta-Länge, ungültigen oder doppelten Slug, CTA-Anzahl, FAQ-Anzahl, FAQ-Abweichung, interne und externe Links sowie unbekannte Bootstrap-Klassen. Er verlangt exakt die CTA-Positionen `blog_early`, `blog_mid` und `blog_final`.

- [ ] **Step 5: Positiven Test ergänzen**

Gültiges HTML enthält drei CTA, fünf FAQ, erlaubte Links und nur erlaubte Klassen. Erwartung: `passed === true` und `issues.length === 0`.

- [ ] **Step 6: Tests ausführen**

Run: `node --test tests/contentAgentArticleValidator.test.js`  
Expected: alle Tests PASS.

- [ ] **Step 7: Commit**

~~~bash
git add services/contentAgent/articleSanitizer.js services/contentAgent/articleValidator.js tests/contentAgentArticleValidator.test.js
git commit -m "feat: validate generated article html"
~~~

### Task 4: PostgreSQL-Queue und Laufprotokoll

**Files:**
- Create: `repositories/contentJobRepository.js`
- Create: `repositories/contentRunRepository.js`
- Create: `repositories/contentTopicRepository.js`
- Test: `tests/contentAgentJobRepository.test.js`

**Interfaces:**
- Produces: `enqueueJob`, `claimNextJob`, `completeJob`, `failJob`, `recoverExpiredJobs`, `createRun`, `updateRunStage`, `finishRun` und `upsertWorkerHeartbeat`.

- [ ] **Step 1: Repositorytest schreiben**

Mit einer aufgezeichneten `query(sql, params)`-Funktion prüfen, dass `claimNextJob` `FOR UPDATE SKIP LOCKED` und den in Schritt 3 vollständig angegebenen atomaren CTE in derselben Transaktion verwendet.

- [ ] **Step 2: Test ausführen**

Run: `node --test tests/contentAgentJobRepository.test.js`  
Expected: FAIL mit `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Atomaren Jobclaim implementieren**

~~~sql
WITH candidate AS (
  SELECT id
  FROM content_jobs
  WHERE status = 'queued' AND run_after <= NOW()
  ORDER BY run_after, created_at
  FOR UPDATE SKIP LOCKED
  LIMIT 1
)
UPDATE content_jobs AS job
SET status = 'running',
    attempts = attempts + 1,
    locked_at = NOW(),
    locked_by = $1,
    updated_at = NOW()
FROM candidate
WHERE job.id = candidate.id
RETURNING job.*;
~~~

- [ ] **Step 4: Idempotenz und Lease-Recovery implementieren**

`enqueueJob` nutzt `ON CONFLICT (idempotency_key)`. Abgelaufene laufende Jobs werden bei verbleibenden Versuchen auf `queued` gesetzt, andernfalls auf `failed`.

- [ ] **Step 5: Run-, Topic- und Heartbeatfunktionen implementieren**

Alle Funktionen akzeptieren optional `db = pool` und geben die gespeicherte Zeile zurück. JSON wird als JavaScript-Objekt übergeben.

- [ ] **Step 6: Tests ausführen**

Run: `node --test tests/contentAgentJobRepository.test.js`  
Expected: Queue-, Claim-, Recovery- und Heartbeattests PASS.

- [ ] **Step 7: Commit**

~~~bash
git add repositories/contentJobRepository.js repositories/contentRunRepository.js repositories/contentTopicRepository.js tests/contentAgentJobRepository.test.js
git commit -m "feat: add database backed content queue"
~~~

### Task 5: Website-Inventar und Themenauswahl

**Files:**
- Create: `services/contentAgent/siteInventoryService.js`
- Create: `services/contentAgent/cannibalizationService.js`
- Create: `services/contentAgent/topicScoringService.js`
- Test: `tests/contentAgentTopicScoring.test.js`

**Interfaces:**
- Produces: `buildSiteInventory`, `calculateCannibalizationRisk`, `scoreTopic` und `selectBestTopic`.

- [ ] **Step 1: Scoringtests schreiben**

~~~js
import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreTopic } from '../services/contentAgent/topicScoringService.js';

test('topic score follows approved weights', () => {
  const scored = scoreTopic({
    businessValue: 9,
    searchOpportunity: 8,
    problemPurchaseProximity: 9,
    internalLinkPotential: 8,
    clusterFit: 8,
    localRelevance: 7,
    cannibalizationRisk: 2
  });
  assert.equal(scored.finalScore, 7.95);
  assert.equal(scored.eligible, true);
});
~~~

- [ ] **Step 2: Test ausführen**

Run: `node --test tests/contentAgentTopicScoring.test.js`  
Expected: FAIL mit `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Scoring implementieren**

~~~js
function clamp(value) {
  return Math.min(10, Math.max(0, Number(value) || 0));
}

export function scoreTopic(candidate) {
  const base =
    clamp(candidate.businessValue) * 0.30 +
    clamp(candidate.searchOpportunity) * 0.25 +
    clamp(candidate.problemPurchaseProximity) * 0.15 +
    clamp(candidate.internalLinkPotential) * 0.10 +
    clamp(candidate.clusterFit) * 0.10 +
    clamp(candidate.localRelevance) * 0.10;
  const finalScore = Math.round((base - clamp(candidate.cannibalizationRisk) * 0.20) * 100) / 100;
  return {
    ...candidate,
    finalScore,
    eligible: candidate.businessValue >= 7 && finalScore >= 7 && candidate.cannibalizationRisk <= 4
  };
}
~~~

- [ ] **Step 4: Inventar implementieren**

Parallel Blogposts, Ratgeber, Leistungsseiten, Branchen und `pricingService.getVisiblePackages()` laden. Statische Pfade kommen aus `CONTENT_AGENT_LINKS`. Aus Postinhalten werden nur Titel, Slug, Excerpt, Kategorie, Beschreibung, Überschriften und interne Links in den Modellkontext übernommen.

- [ ] **Step 5: Kannibalisierung implementieren**

Exakter Slug- oder Hauptkeywordtreffer ergibt Risiko 10. Gleicher Cluster plus mindestens 70 Prozent Titelwortüberlappung ergibt mindestens Risiko 6. Risiko über 4 verhindert die Auswahl.

- [ ] **Step 6: Tests ausführen**

Run: `node --test tests/contentAgentTopicScoring.test.js`  
Expected: alle Tests PASS.

- [ ] **Step 7: Commit**

~~~bash
git add services/contentAgent/siteInventoryService.js services/contentAgent/cannibalizationService.js services/contentAgent/topicScoringService.js tests/contentAgentTopicScoring.test.js
git commit -m "feat: score customer focused content topics"
~~~

### Task 6: OpenAI-Adapter und versionierte Promptmodule

**Files:**
- Create: `services/contentAgent/openaiContentService.js`
- Create: `services/contentAgent/prompts/brandPolicy.js`
- Create: `services/contentAgent/prompts/topicResearchPrompt.js`
- Create: `services/contentAgent/prompts/webResearchPrompt.js`
- Create: `services/contentAgent/prompts/seoBriefPrompt.js`
- Create: `services/contentAgent/prompts/articleWriterPrompt.js`
- Create: `services/contentAgent/prompts/articleReviewerPrompt.js`
- Create: `services/contentAgent/prompts/articleRepairPrompt.js`
- Test: `tests/contentAgentOpenAIService.test.js`

**Interfaces:**
- Produces: `createTopicCandidates`, `researchCurrentSources`, `createSeoBrief`, `generateArticle`, `reviewArticle` und `repairArticle`.

- [ ] **Step 1: Fehlschlagenden Adaptertest schreiben**

Der Test injiziert einen Client mit `responses.parse(request)` und prüft Modell, `text.format`, Systemprompt, Ergebnis, Response-ID und Usage. Kein Test ruft OpenAI auf.

Ein zweiter Test injiziert `responses.create(request)` mit zwei `url_citation`-Annotationen und prüft `tools: [{ type: 'web_search' }]` sowie die normalisierte Quellenliste. Ein Ergebnis mit nur einer Quelle muss fehlschlagen.

- [ ] **Step 2: Test ausführen**

Run: `node --test tests/contentAgentOpenAIService.test.js`  
Expected: FAIL mit `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Promptmodule anlegen**

Jedes Modul exportiert eine feste Version und eine reine Build-Funktion:

~~~js
export const promptVersion = '2026-07-10.1';

export function buildArticleWriterPrompt(input) {
  return {
    system: [
      'Du schreibst für Komplett Webdesign aus Berlin.',
      'Schreibe auf Deutsch im professionellen Du-Ton und verwende korrekte Umlaute.',
      'Erzeuge statisches HTML ohne H1, äußeren Container, Bilder, Skripte, EJS und Inline-Styles.',
      'Nutze nur interne Links und Fakten aus dem Briefing.',
      'Baue drei kontextbezogene CTA und fünf bis sieben sichtbare FAQ ein.'
    ].join('\n'),
    user: JSON.stringify(input)
  };
}
~~~

Die übrigen Module enthalten die jeweils freigegebenen Themen-, Briefing-, Review- und Reparaturregeln. Der Reparaturprompt erhält ausschließlich Briefing, Artikel und konkrete Issues.

`webResearchPrompt.js` verlangt zwei bis sechs Primärquellen mit Titel, URL, Herausgeber, Veröffentlichungs- und Abrufdatum. Es verbietet einen aktuellen Artikel, wenn keine belastbaren Quellen gefunden werden.

- [ ] **Step 4: Structured-Output-Adapter implementieren**

~~~js
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';

export function createOpenAIContentService({ apiKey, config, client = null }) {
  const openai = client || new OpenAI({ apiKey });

  async function parse({ model, schema, schemaName, system, user }) {
    const response = await openai.responses.parse({
      model,
      input: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      text: { format: zodTextFormat(schema, schemaName) }
    });
    if (!response.output_parsed) {
      throw new Error('OpenAI lieferte kein strukturiertes Ergebnis.');
    }
    return {
      value: response.output_parsed,
      responseId: response.id,
      usage: response.usage || {}
    };
  }

  return { parse, config };
}
~~~

- [ ] **Step 5: Sechs öffentliche Operationen ergänzen**

Jede Operation wählt ein Promptmodul, `config.contentModel` oder `config.reviewModel` und das passende Zod-Schema. Rückgabe ist immer `{ value, responseId, usage, promptVersion }`.

`researchCurrentSources` verwendet `responses.create` mit `tools: [{ type: 'web_search' }]`. `extractWebSources(response)` sammelt ausschließlich `url_citation`-Annotationen aus Message-Content, normalisiert URL und Titel und verwirft Ergebnisse ohne HTTPS-URL. Sind weniger als zwei Quellen vorhanden, wirft die Funktion `Aktuelle Quellen reichen für einen Artikel nicht aus.`.

- [ ] **Step 6: Tests ausführen**

Run: `node --test tests/contentAgentOpenAIService.test.js`  
Expected: alle Tests PASS.

- [ ] **Step 7: Commit**

~~~bash
git add services/contentAgent/openaiContentService.js services/contentAgent/prompts tests/contentAgentOpenAIService.test.js
git commit -m "feat: add structured content generation service"
~~~

### Task 7: Bildadapter und unveröffentlichte Entwurfspipeline

**Files:**
- Create: `services/contentAgent/contentImageService.js`
- Create: `services/contentAgent/contentCostService.js`
- Create: `services/contentAgent/draftPipeline.js`
- Modify: `models/BlogPostModel.js`
- Test: `tests/contentAgentDraftPipeline.test.js`
- Test: `tests/contentAgentCostService.test.js`

**Interfaces:**
- Produces: `generateAndUploadImage`, `BlogPostModel.createAIDraft` und `runDraftPipeline`.

- [ ] **Step 1: Fehlschlagenden Pipelinetest schreiben**

Mit injizierten Repositories und API-Test-Doubles prüfen:

~~~js
assert.equal(createdPost.published, false);
assert.equal(createdPost.workflow_status, 'needs_review');
assert.equal(createdPost.content_format, 'static_html');
assert.equal(createdPost.generated_by_ai, true);
assert.equal(createdMetadata.quality_score >= 80, true);
~~~

`tests/contentAgentCostService.test.js` prüft `estimateTextCost` mit 1.000.000 Eingabe- und 1.000.000 Ausgabetokens sowie die Grenzfälle 24,90 + 0,10 = 25,00 erlaubt und 24,90 + 0,11 blockiert.

- [ ] **Step 2: Test ausführen**

Run: `node --test tests/contentAgentDraftPipeline.test.js`  
Expected: FAIL mit `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Bildservice implementieren**

~~~js
const generated = await openai.images.generate({
  model: config.imageModel,
  prompt,
  size: '1536x1024',
  quality: 'medium'
});
const buffer = Buffer.from(generated.data[0].b64_json, 'base64');
~~~

Der Buffer wird per `cloudinary.uploader.upload_stream` mit `folder: 'blog_images'`, `format: 'webp'` und bereinigter `public_id` hochgeladen. Rückgabe: `{ imageUrl, publicId, bytes }`.

- [ ] **Step 4: Kostenservice implementieren**

`estimateTextCost({ usage, inputRate, outputRate })` berechnet Eingabe- und Ausgabetokens pro einer Million. `assertMonthlyBudget({ spent, estimatedNext, limit })` wirft `Monatliches Content-Agent-Budget erreicht.`, wenn die Summe das Limit überschreitet. Der Repositoryanteil summiert `content_runs.cost_estimate` ab dem ersten Kalendertag des aktuellen Monats.

- [ ] **Step 5: `BlogPostModel.createAIDraft` implementieren**

Die Methode öffnet eine Transaktion, fügt `posts` und `content_post_metadata` ein und setzt serverseitig:

~~~js
{
  published: false,
  workflow_status: 'needs_review',
  content_format: 'static_html',
  generated_by_ai: true
}
~~~

`meta_description` wird zusätzlich nach `description` gespiegelt, solange der öffentliche Legacy-Fallback existiert.

- [ ] **Step 6: Pipeline implementieren**

Reihenfolge:

~~~text
inventory
topic_research
topic_scoring
source_research
seo_brief
article_generation
validation
review
repair
image_generation
cloudinary_upload
draft_creation
completed
~~~

Nach jeder Stufe wird `updateRunStage` gespeichert. Höchstens `config.maxRevisions` Reparaturen sind zulässig. Reviewscore unter 80 endet mit `needs_manual_attention`. Bildgenerierung beginnt erst nach bestandener Inhaltsprüfung.

`source_research` läuft nur für aktuelle Themen. Ohne zwei validierte Quellen endet der Job mit `needs_manual_attention`. Vor jeder kostenpflichtigen Stufe prüft `assertMonthlyBudget` das konfigurierte Monatslimit.

- [ ] **Step 7: Tests ausführen**

Run: `node --test tests/contentAgentDraftPipeline.test.js tests/contentAgentCostService.test.js && npm test`  
Expected: Pipeline und Gesamtsuite PASS.

- [ ] **Step 8: Commit**

~~~bash
git add services/contentAgent/contentImageService.js services/contentAgent/contentCostService.js services/contentAgent/draftPipeline.js models/BlogPostModel.js tests/contentAgentDraftPipeline.test.js tests/contentAgentCostService.test.js
git commit -m "feat: generate unpublished content drafts"
~~~

### Task 8: Worker, Wochenplan und Dry-Run

**Files:**
- Create: `services/contentAgent/workerService.js`
- Create: `scripts/contentWorker.js`
- Create: `scripts/contentAgentDryRun.js`
- Create: `scripts/contentWorkerHealthcheck.js`
- Modify: `package.json`
- Test: `tests/contentAgentWorker.test.js`

**Interfaces:**
- Produces: `createContentWorker(dependencies)` mit `start()`, `stop()` und `processOnce()`.

- [ ] **Step 1: Worker-Test schreiben**

Mit injizierten Timerfunktionen prüfen: deaktivierter Worker claimt nichts; aktivierter Worker schreibt Heartbeat; `processOnce` verarbeitet genau einen Job; `stop` verhindert weitere Claims.

Der Test führt außerdem die exportierte Funktion `isHeartbeatFresh(heartbeatAt, now, 90_000)` mit 89 und 91 Sekunden alten Zeitpunkten aus und erwartet `true` beziehungsweise `false`.

- [ ] **Step 2: Test ausführen**

Run: `node --test tests/contentAgentWorker.test.js`  
Expected: FAIL mit `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Worker implementieren**

`processOnce` aktualisiert den Heartbeat, stellt abgelaufene Leases wieder her, reserviert höchstens einen Job, ruft den Jobhandler auf und speichert Erfolg oder bereinigten Fehler. Der Worker verarbeitet Jobs seriell.

- [ ] **Step 4: Cron-Einstieg implementieren**

`scripts/contentWorker.js` verwendet `node-cron` mit Ausdruck und Zeitzone aus der Konfiguration. Der Callback legt `generate_weekly_draft` mit Idempotenzschlüssel `weekly-draft:YYYY-MM-DD` an. `SIGTERM` und `SIGINT` rufen `worker.stop()` und `pool.end()` auf.

- [ ] **Step 5: Kostenfreien Dry-Run implementieren**

`scripts/contentAgentDryRun.js` verwendet feste Fixtures und gibt aus:

~~~json
{
  "mode": "dry-run",
  "externalCalls": 0,
  "articleValid": true,
  "qualityScore": 90,
  "publishMode": "draft"
}
~~~

- [ ] **Step 6: npm-Skripte ergänzen**

~~~json
"start:content-worker": "node scripts/contentWorker.js",
"content-agent:dry-run": "node scripts/contentAgentDryRun.js",
"content-agent:healthcheck": "node scripts/contentWorkerHealthcheck.js"
~~~

- [ ] **Step 7: Heartbeat-Healthcheck implementieren**

Das Skript liest `content_worker_state` für `worker_name = 'content-worker'`. Es beendet sich mit Code 0, wenn `heartbeat_at >= NOW() - INTERVAL '90 seconds'` ist, andernfalls mit Code 1. Credentials und vollständige Datenbankfehler werden nicht ausgegeben.

- [ ] **Step 8: Tests ausführen**

Run: `node --test tests/contentAgentWorker.test.js && npm run content-agent:dry-run`  
Expected: Tests PASS; Dry-Run zeigt null externe Aufrufe.

- [ ] **Step 9: Commit**

~~~bash
git add services/contentAgent/workerService.js scripts/contentWorker.js scripts/contentAgentDryRun.js scripts/contentWorkerHealthcheck.js package.json tests/contentAgentWorker.test.js
git commit -m "feat: run content agent in dedicated worker"
~~~

### Task 9: Legacy-EJS und statisches KI-HTML getrennt rendern

**Files:**
- Modify: `controllers/blogController.js`
- Modify: `views/blog/show.ejs`
- Modify: `models/BlogPostModel.js`
- Test: `tests/blogContentFormat.test.js`

**Interfaces:**
- Consumes: `post.content_format` und neue SEO-Felder.
- Produces: sichere öffentliche Darstellung ohne EJS-Auswertung für `static_html`.

- [ ] **Step 1: Fehlschlagenden Renderingtest schreiben**

~~~js
assert.match(source, /post\.content_format === 'static_html'/);
assert.match(source, /sanitizeArticleHtml/);
assert.match(source, /renderDbEjs/);
assert.match(source, /post\.meta_title \|\| post\.title/);
assert.match(source, /post\.meta_description \|\| post\.description/);
~~~

- [ ] **Step 2: Test ausführen**

Run: `node --test tests/blogContentFormat.test.js`  
Expected: FAIL, weil die Verzweigung fehlt.

- [ ] **Step 3: Controller verzweigen**

~~~js
const renderedContent = post.content_format === 'static_html'
  ? sanitizeArticleHtml(renderPricingTokens(post.content, res.locals.packagePricing || {}))
  : demoteContentH1(normalizeLegacyPublicCopy(renderPricingTokens(
      renderDbEjs(post.content, legacyLocals),
      res.locals.packagePricing || {}
    )));
~~~

SEO-Fallbacks:

~~~js
const pageTitle = post.meta_title || post.title;
const metaDescription = post.meta_description || post.description || desc;
const ogTitle = post.og_title || post.title;
const ogDescription = post.og_description || metaDescription;
~~~

- [ ] **Step 4: Bild-Alt-Text umstellen**

~~~ejs
<img src="<%= post.image_url || '/images/default-blog.webp' %>" alt="<%= post.image_alt || post.title %>" loading="eager" fetchpriority="high">
~~~

- [ ] **Step 5: Tests ausführen**

Run: `node --test tests/blogContentFormat.test.js tests/blogRatgeberStyle.test.js tests/db9PricingTokenIntegration.test.js && npm test`  
Expected: alle Tests PASS.

- [ ] **Step 6: Commit**

~~~bash
git add controllers/blogController.js views/blog/show.ejs models/BlogPostModel.js tests/blogContentFormat.test.js
git commit -m "feat: render generated blog html safely"
~~~

### Task 10: IONOS-VPS-Anleitung und Releaseprüfung

**Files:**
- Create: `docs/deployment/content-agent-ionos-vps.md`
- Create: `tests/contentAgentDeploymentGuide.test.js`

**Interfaces:**
- Produces: kopierbare Anleitung für die externe VPS-Datei `docker-compose.yml`.

- [ ] **Step 1: Fehlschlagenden Dokumentationstest schreiben**

~~~js
assert.match(guide, /content-worker:/);
assert.match(guide, /condition: service_healthy/);
assert.match(guide, /pg_isready/);
assert.match(guide, /migrate:content-agent/);
assert.match(guide, /content-agent:dry-run/);
assert.match(guide, /content-agent:healthcheck/);
assert.match(guide, /docker compose logs -f content-worker/);
assert.match(guide, /CONTENT_AGENT_MONTHLY_COST_LIMIT_EUR=25/);
assert.match(guide, /CONTENT_AGENT_AUTOPUBLISH_ENABLED=false/);
assert.match(guide, /docker compose stop content-worker/);
~~~

- [ ] **Step 2: Test ausführen**

Run: `node --test tests/contentAgentDeploymentGuide.test.js`  
Expected: FAIL mit `ENOENT`.

- [ ] **Step 3: Compose-Änderung dokumentieren**

~~~yaml
services:
  app:
    image: komplettwebdesign-app:local
    build:
      context: ./server
    depends_on:
      postgres:
        condition: service_healthy

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

  postgres:
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 20s
~~~

Die vorhandenen App-Netzwerke, Traefik-Labels, Volumes, `webhook`, `pgadmin` und PostgreSQL-Volumes bleiben erhalten. Der Ausschnitt ist eine Änderungshilfe und kein Ersatz für die vollständige Serverdatei.

- [ ] **Step 4: Backup und Deployment dokumentieren**

~~~bash
cd /home/webadmin/apps/komplettwebdesign
mkdir -p ./data/backups
BACKUP_FILE="./data/backups/komplettwebdesign-before-content-agent-$(date +%Y%m%d-%H%M%S).dump"
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$BACKUP_FILE"
test -s "$BACKUP_FILE"
docker compose exec -T postgres pg_restore -l < "$BACKUP_FILE" >/dev/null
docker compose build app
docker compose run --rm app npm run migrate:content-agent
docker compose run --rm app npm run content-agent:dry-run
docker compose up -d app content-worker
docker compose ps
docker compose logs --tail=100 content-worker
docker compose logs -f content-worker
~~~

Die Anleitung weist darauf hin, den Projektpfad anzupassen, falls das Repository auf dem VPS an einem anderen Ort liegt.

- [ ] **Step 5: Umgebungsvariablen und Rückfall dokumentieren**

~~~dotenv
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
~~~

Rückfall:

~~~bash
docker compose stop content-worker
sed -i 's/^CONTENT_AGENT_ENABLED=.*/CONTENT_AGENT_ENABLED=false/' .env
docker compose up -d app
~~~

- [ ] **Step 6: Releaseprüfung**

Run: `node --test tests/contentAgentDeploymentGuide.test.js && npm run build && npm test`  
Expected: Dokumentationstest, Build und Gesamtsuite PASS.

- [ ] **Step 7: Commit**

~~~bash
git add docs/deployment/content-agent-ionos-vps.md tests/contentAgentDeploymentGuide.test.js
git commit -m "docs: add IONOS content worker deployment guide"
~~~

## Plan-A-Abnahme

- [ ] Migration auf einer Testdatenbank zweimal erfolgreich ausführen.
- [ ] `npm test` vollständig grün.
- [ ] `npm run build` erfolgreich.
- [ ] `npm run content-agent:dry-run` meldet null externe Aufrufe.
- [ ] Ein Queuejob erzeugt genau einen unveröffentlichten Beitrag.
- [ ] Der Beitrag rendert ohne EJS-Auswertung und ohne zweite H1.
- [ ] Worker lässt sich unabhängig vom Webprozess stoppen.
- [ ] IONOS-Anleitung gegen eine Kopie der vorhandenen Compose-Datei nachvollziehen.
