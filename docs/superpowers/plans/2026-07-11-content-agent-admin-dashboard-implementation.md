# Content-Agent-Admin-Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Den vorhandenen Content-Agenten über ein geschütztes Bootstrap-Admincockpit dynamisch steuern, Entwürfe frontendnah prüfen, fehlgeschlagene Jobs sicher fortsetzen, Bestandsinhalte auditieren und Auto-Publishing erst nach acht Freigaben, Score 90 und vollständigen Risikogates zulassen.

**Architecture:** `.env` bleibt technische Geheimnis- und Hardcap-Ebene; sichere Betriebswerte werden versioniert in PostgreSQL gespeichert und pro Job in `content_runs.runtime_snapshot_json` eingefroren. Der Worker behält Queue-, Lease-, Stufen- und Budgetidempotenz, ersetzt aber den statischen Wochen-Cron durch einen datenbankgesteuerten Minutentick. Express stellt ausschließlich admin- und CSRF-geschützte Controller bereit; lange Generierungs- und Auditoperationen bleiben Queuejobs.

**Tech Stack:** Node.js 20, Express 5, EJS, PostgreSQL 16/pgvector, Bootstrap 5, Luxon, OpenAI Responses API, Cloudinary, node:test, vorhandene Session-Adminauthentifizierung.

## Global Constraints

- Grundlage ist `docs/superpowers/specs/2026-07-11-content-agent-admin-dashboard-design.md`.
- Sichtbarer deutscher Text verwendet korrekte Umlaute und deutsche Grammatik.
- `CONTENT_AGENT_ENABLED` bleibt absoluter technischer Hauptschalter.
- `CONTENT_AGENT_AUTOPUBLISH_ENABLED` bleibt absoluter Auto-Publish-Not-Aus und startet auf `false`.
- OpenAI-Modelle, Tokenpreise, Worker-Polling und Lease-Dauer sind im Dashboard nur lesbar.
- Betriebsmodus, Wochentage, Uhrzeit, Zeitzone, Monatsbudget, Mindestscore und maximale Versuche kommen nach Migration aus PostgreSQL.
- Die Migration startet operativ deaktiviert im Review-Modus mit Montag und Donnerstag um 18:00 Uhr in `Europe/Berlin`.
- „Jetzt Entwurf erstellen“ setzt immer `forced_mode=review`.
- Auto-Publishing verlangt mindestens acht manuelle KI-Freigaben und Score `>= 90`.
- Jeder Risiko-, Quellen-, Aktualitäts-, HTML-, Link-, FAQ-, Meta- oder Bildblocker verhindert Auto-Publishing.
- KI-generiertes `static_html` wird nie als EJS oder JavaScript ausgeführt.
- Bestehende veröffentlichte Artikel werden nie automatisch überschrieben.
- Alle neuen Admin-POST-Routen verwenden `isAdmin` und `verifyCsrfToken`.
- Adminakteure stammen aus `admins`; neue Audit-Fremdschlüssel dürfen nicht auf `users` zeigen.
- Bestehende Queue-, Lease-, Run-, Stufen-, Budget-, Themen-, Bild- und Draft-Idempotenz bleibt erhalten.
- Automatisierte Tests führen keine echten OpenAI- oder Cloudinary-Aufrufe aus.
- Jeder Task beginnt mit einem fehlschlagenden Test, endet mit fokussierten grünen Tests und einem eigenen Commit.

## File Structure

### Neue Laufzeit- und Datenbankdateien

- `scripts/migrations/003_create_content_agent_admin_dashboard.sql` – additive Schemaerweiterung.
- `repositories/contentAgentSettingsRepository.js` – Singleton-Einstellungen und Revisionen.
- `repositories/contentAgentAdminRepository.js` – kompakte Dashboard-, Draft-, Job-, Audit- und Statusabfragen.
- `repositories/contentPublishEventRepository.js` – sichere Publish-Entscheidungsereignisse.
- `repositories/contentAuditRepository.js` – Bestandsaudit-Historie.
- `repositories/contentRevisionRepository.js` – getrennte Revisionen veröffentlichter Artikel.
- `services/contentAgent/runtimeConfigService.js` – Hardcaps, Laufzeitwerte, Snapshots und redigierte Technikansicht.
- `services/contentAgent/contentSchedulerService.js` – IANA-/DST-sicherer dynamischer Termin-Tick.
- `services/contentAgent/adminPresentationService.js` – UI-fertige Zustände ohne Rohpayloads.
- `services/contentAgent/adminDraftService.js` – sichere Entwurfsbearbeitung.
- `services/contentAgent/riskReportService.js` – konkrete Prüfstellen und Sprunganker.
- `services/contentAgent/contentPublicationService.js` – manuelle und automatische Veröffentlichung.
- `services/contentAgent/autoPublishPolicy.js` – reine konservative Entscheidungsmatrix.
- `services/contentAgent/legacyAuditService.js` – technischer und inhaltlicher Bestandsaudit.
- `services/contentAgent/contentRevisionService.js` – revisionsbasierte Bestandsüberarbeitung.
- `services/blogPostPresentationService.js` – gemeinsames öffentliches und Vorschau-Viewmodel.
- `controllers/adminContentAgentController.js` – dünne Adminaktionen.
- `routes/adminContentAgentRoutes.js` – explizite geschützte Routen.

### Neue Views und Browserdateien

- `views/admin/contentAgent/_tabs.ejs`
- `views/admin/contentAgent/_statusCards.ejs`
- `views/admin/contentAgent/_riskChecklist.ejs`
- `views/admin/contentAgent/overview.ejs`
- `views/admin/contentAgent/drafts.ejs`
- `views/admin/contentAgent/existingContent.ejs`
- `views/admin/contentAgent/schedule.ejs`
- `views/admin/contentAgent/jobs.ejs`
- `views/admin/contentAgent/technology.ejs`
- `views/admin/contentAgent/draftEdit.ejs`
- `views/admin/contentAgent/revisionEdit.ejs`
- `public/js/admin-content-agent.js`

### Bestehende Kern-Dateien mit gezielten Änderungen

- `scripts/runContentAgentMigration.js`
- `services/contentAgent/config.js`
- `scripts/contentWorker.js`
- `services/contentAgent/workerService.js`
- `repositories/contentJobRepository.js`
- `repositories/contentRunRepository.js`
- `services/contentAgent/draftPipeline.js`
- `services/contentAgent/articleSchemas.js`
- `services/contentAgent/prompts/articleReviewerPrompt.js`
- `models/BlogPostModel.js`
- `controllers/adminBlogController.js`
- `routes/adminBlogRoutes.js`
- `controllers/blogController.js`
- `views/blog/show.ejs`
- `views/admin/editPost.ejs`
- `views/admin/blogList.ejs`
- `views/partials/admin_header.ejs`
- `views/admin/dashboard.ejs`
- `public/admin.css`
- `index.js`
- `docs/deployment/content-agent-ionos-vps.md`
- `tests/contentAgentDeploymentGuide.test.js`

---

### Task 1: Additives Admin-, Settings-, Audit- und Publishing-Schema

**Files:**
- Create: `scripts/migrations/003_create_content_agent_admin_dashboard.sql`
- Modify: `scripts/runContentAgentMigration.js`
- Modify: `tests/contentAgentMigration.test.js`
- Modify: `tests/contentAgentPostgresIntegration.test.js`
- Test: `tests/contentAgentAdminDashboardMigration.test.js`

**Interfaces:**
- Produces: erweiterte `content_agent_settings`, `content_agent_setting_revisions`, `content_publish_events`, `content_post_audits`, `content_post_revisions`, `content_provider_state` und `content_runs.runtime_snapshot_json`.
- Preserves: `content_jobs.idempotency_key`, `ux_content_runs_job_id`, alle Plan-A-Tabellen und Daten.

- [ ] **Step 1: Fehlschlagenden Migrationstest schreiben**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync(
  new URL('../scripts/migrations/003_create_content_agent_admin_dashboard.sql', import.meta.url),
  'utf8'
);

test('Migration 003 ergänzt Dashboard, Revisionen, Audits und Publish-Events', () => {
  assert.match(sql, /RENAME COLUMN schedule_enabled TO agent_enabled/i);
  assert.match(sql, /operating_mode VARCHAR\(24\) NOT NULL DEFAULT 'review'/i);
  assert.match(sql, /schedule_weekdays SMALLINT\[\]/i);
  assert.match(sql, /schedule_time TIME NOT NULL DEFAULT '18:00'/i);
  assert.match(sql, /timezone VARCHAR\(80\) NOT NULL DEFAULT 'Europe\/Berlin'/i);
  assert.match(sql, /runtime_snapshot_json JSONB NOT NULL DEFAULT '\{\}'::jsonb/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS content_agent_setting_revisions/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS content_publish_events/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS content_post_audits/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS content_post_revisions/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS content_provider_state/i);
  assert.match(sql, /REFERENCES admins\(id\)/i);
});
```

- [ ] **Step 2: Test ausführen und erwarteten Fehler bestätigen**

Run: `node --test tests/contentAgentAdminDashboardMigration.test.js`  
Expected: FAIL mit `ENOENT`.

- [ ] **Step 3: Migration 003 vollständig anlegen**

```sql
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content_agent_settings' AND column_name = 'schedule_enabled'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content_agent_settings' AND column_name = 'agent_enabled'
  ) THEN
    ALTER TABLE content_agent_settings RENAME COLUMN schedule_enabled TO agent_enabled;
    UPDATE content_agent_settings SET agent_enabled = FALSE;
  END IF;
END $$;

ALTER TABLE content_agent_settings
  ADD COLUMN IF NOT EXISTS operating_mode VARCHAR(24) NOT NULL DEFAULT 'review',
  ADD COLUMN IF NOT EXISTS schedule_weekdays SMALLINT[] NOT NULL DEFAULT ARRAY[1,4]::SMALLINT[],
  ADD COLUMN IF NOT EXISTS schedule_time TIME NOT NULL DEFAULT '18:00',
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(80) NOT NULL DEFAULT 'Europe/Berlin',
  ADD COLUMN IF NOT EXISTS monthly_budget_cents INTEGER NOT NULL DEFAULT 2500,
  ADD COLUMN IF NOT EXISTS maximum_attempts INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS settings_version INTEGER NOT NULL DEFAULT 1;

UPDATE content_agent_settings
SET operating_mode = 'review',
    auto_publish_enabled = FALSE
WHERE operating_mode NOT IN ('review', 'auto_publish');

ALTER TABLE content_agent_settings DROP CONSTRAINT IF EXISTS content_agent_settings_mode_valid;
ALTER TABLE content_agent_settings ADD CONSTRAINT content_agent_settings_mode_valid
  CHECK (operating_mode IN ('review', 'auto_publish'));
ALTER TABLE content_agent_settings DROP CONSTRAINT IF EXISTS content_agent_settings_score_valid;
ALTER TABLE content_agent_settings ADD CONSTRAINT content_agent_settings_score_valid
  CHECK (auto_publish_min_score BETWEEN 90 AND 100);
ALTER TABLE content_agent_settings DROP CONSTRAINT IF EXISTS content_agent_settings_budget_valid;
ALTER TABLE content_agent_settings ADD CONSTRAINT content_agent_settings_budget_valid
  CHECK (monthly_budget_cents >= 0);
ALTER TABLE content_agent_settings DROP CONSTRAINT IF EXISTS content_agent_settings_attempts_valid;
ALTER TABLE content_agent_settings ADD CONSTRAINT content_agent_settings_attempts_valid
  CHECK (maximum_attempts BETWEEN 1 AND 5);
ALTER TABLE content_agent_settings DROP CONSTRAINT IF EXISTS content_agent_settings_weekdays_valid;
ALTER TABLE content_agent_settings ADD CONSTRAINT content_agent_settings_weekdays_valid
  CHECK (cardinality(schedule_weekdays) BETWEEN 1 AND 7 AND schedule_weekdays <@ ARRAY[1,2,3,4,5,6,7]::SMALLINT[]);

ALTER TABLE content_runs
  ADD COLUMN IF NOT EXISTS runtime_snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE content_worker_state
  ADD COLUMN IF NOT EXISTS last_scheduler_tick_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_scheduler_error TEXT,
  ADD COLUMN IF NOT EXISTS last_scheduled_slot TEXT;

CREATE TABLE IF NOT EXISTS content_agent_setting_revisions (
  id BIGSERIAL PRIMARY KEY,
  settings_version INTEGER NOT NULL,
  changed_keys TEXT[] NOT NULL,
  previous_values_json JSONB NOT NULL,
  new_values_json JSONB NOT NULL,
  admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  admin_username VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS content_publish_events (
  id BIGSERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  run_id BIGINT REFERENCES content_runs(id) ON DELETE SET NULL,
  decision VARCHAR(24) NOT NULL,
  policy_version VARCHAR(40) NOT NULL,
  quality_score INTEGER NOT NULL,
  reasons_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  context_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  admin_username VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (decision IN ('allowed', 'blocked', 'manual'))
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_content_publish_events_manual_post
  ON content_publish_events (post_id) WHERE decision = 'manual';

CREATE TABLE IF NOT EXISTS content_post_audits (
  id BIGSERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  job_id BIGINT REFERENCES content_jobs(id) ON DELETE SET NULL,
  run_id BIGINT REFERENCES content_runs(id) ON DELETE SET NULL,
  audit_type VARCHAR(64) NOT NULL,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  findings_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommended_actions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(24) NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (status IN ('open', 'revision_created', 'resolved'))
);

CREATE TABLE IF NOT EXISTS content_post_revisions (
  id BIGSERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  audit_id BIGINT REFERENCES content_post_audits(id) ON DELETE SET NULL,
  snapshot_json JSONB NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'draft',
  admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  admin_username VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  CHECK (status IN ('draft', 'approved', 'rejected'))
);

CREATE TABLE IF NOT EXISTS content_provider_state (
  provider_name VARCHAR(80) PRIMARY KEY,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  last_error_code VARCHAR(120),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- [ ] **Step 4: Sequenziellen, idempotenten Runner implementieren**

```js
const MIGRATIONS = [
  './migrations/002_create_content_agent_core.sql',
  './migrations/003_create_content_agent_admin_dashboard.sql'
];

export async function runContentAgentMigration(db = pool) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('kwd_content_agent_migrations'))");
    for (const migration of MIGRATIONS) {
      const sql = await readFile(new URL(migration, import.meta.url), 'utf8');
      await client.query(sql);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

- [ ] **Step 5: Admin-FK-Vorprüfung und PostgreSQL-Integration ergänzen**

Vor dem ersten Schreiben einer Admin-ID muss der Integrationstest `admins` anlegen und sicherstellen, dass alle neuen Tabellen dorthin referenzieren. Bestehende `posts.reviewed_by`- und `content_agent_settings.updated_by`-Felder bleiben aus Kompatibilitätsgründen unbenutzt; neue Auditfelder verwenden ausschließlich `admin_id`.

```js
await pool.query(`
  CREATE TABLE admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL DEFAULT ''
  );
  INSERT INTO admins (username) VALUES ('migration-admin');
`);
await runContentAgentMigration(pool);
await runContentAgentMigration(pool);
const settings = await pool.query('SELECT * FROM content_agent_settings WHERE id = 1');
assert.equal(settings.rows[0].agent_enabled, false);
assert.equal(settings.rows[0].operating_mode, 'review');
assert.deepEqual(settings.rows[0].schedule_weekdays, [1, 4]);
```

- [ ] **Step 6: Fokussierte Tests ausführen und committen**

Run: `node --test tests/contentAgentAdminDashboardMigration.test.js tests/contentAgentMigration.test.js`  
Expected: PASS.

Run mit freigegebener Testdatenbank: `CONTENT_AGENT_PG_TEST_URL="$CONTENT_AGENT_PG_TEST_URL" CONTENT_AGENT_PG_TEST_ALLOW_RESET=true node --test tests/contentAgentPostgresIntegration.test.js`  
Expected: PASS; ansonsten sauber als SKIP.

```bash
git add scripts/migrations/003_create_content_agent_admin_dashboard.sql scripts/runContentAgentMigration.js tests/contentAgentAdminDashboardMigration.test.js tests/contentAgentMigration.test.js tests/contentAgentPostgresIntegration.test.js
git commit -m "feat: add content agent dashboard schema"
```

### Task 2: Versionierte Runtime-Einstellungen und technische Hardcaps

**Files:**
- Create: `repositories/contentAgentSettingsRepository.js`
- Create: `services/contentAgent/runtimeConfigService.js`
- Modify: `services/contentAgent/config.js`
- Test: `tests/contentAgentSettingsRepository.test.js`
- Test: `tests/contentAgentRuntimeConfig.test.js`
- Modify: `tests/contentAgentConfig.test.js`

**Interfaces:**
- Produces: `getContentAgentSettings(db)`, `updateContentAgentSettings(input, db)`, `getContentAgentTechnicalConfig(env)`, `resolveContentAgentRuntimeConfig(input)`, `validateContentAgentSettingsTransition(input)`, `createContentAgentJobSnapshot(input)` und `buildTechnicalConfigPresentation(input)`.
- Preserves: `getContentAgentConfig(env)` als kompatiblen technischen Alias für Dry-Run und bestehende Tests.

- [ ] **Step 1: Fehlschlagende Repository- und Hardcap-Tests schreiben**

```js
test('Runtime begrenzt Dashboardwerte durch .env-Hardcaps', () => {
  const runtime = resolveContentAgentRuntimeConfig({
    technicalConfig: {
      enabled: true,
      autoPublishEnabled: false,
      monthlyCostLimitEur: 100,
      maxAttempts: 5,
      contentModel: 'content-model',
      reviewModel: 'review-model',
      imageModel: 'image-model'
    },
    settings: {
      agent_enabled: true,
      operating_mode: 'auto_publish',
      schedule_weekdays: [1, 4],
      schedule_time: '18:00:00',
      timezone: 'Europe/Berlin',
      monthly_budget_cents: 15000,
      auto_publish_min_score: 80,
      maximum_attempts: 9,
      manual_approvals_count: 8,
      settings_version: 2
    }
  });
  assert.equal(runtime.enabled, true);
  assert.equal(runtime.monthlyCostLimitEur, 100);
  assert.equal(runtime.maxAttempts, 5);
  assert.equal(runtime.autoPublishMinScore, 90);
  assert.equal(runtime.autoPublishEffective, false);
});

test('Settings-Update verlangt die erwartete Version', async () => {
  await assert.rejects(
    updateContentAgentSettings({ expectedVersion: 2, patch: {}, admin: { id: 7, username: 'admin' } }, db),
    (error) => error.code === 'CONTENT_SETTINGS_VERSION_CONFLICT'
  );
});

test('Direktveröffentlichung kann ohne Hardgate und acht Freigaben nicht aktiviert werden', () => {
  assert.throws(() => validateContentAgentSettingsTransition({
    current: { operating_mode: 'review', manual_approvals_count: 7 },
    next: { operating_mode: 'auto_publish', manual_approvals_count: 7 },
    technicalConfig: { autoPublishEnabled: false }
  }), (error) => error.code === 'CONTENT_AUTOPUBLISH_NOT_READY');
});
```

- [ ] **Step 2: Tests ausführen und erwartete Modulfehler bestätigen**

Run: `node --test tests/contentAgentSettingsRepository.test.js tests/contentAgentRuntimeConfig.test.js`  
Expected: FAIL mit `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Settings-Repository mit Transaktion und Versionsvergleich implementieren**

```js
function normalizeSettingsPatch(current, patch = {}) {
  const weekdays = [...new Set((patch.scheduleWeekdays ?? current.schedule_weekdays).map(Number))].sort();
  if (!weekdays.length || weekdays.some((day) => !Number.isInteger(day) || day < 1 || day > 7)) {
    throw Object.assign(new Error('Ungültige Wochentage.'), { code: 'CONTENT_SETTINGS_VALIDATION_FAILED' });
  }
  const scheduleTime = String(patch.scheduleTime ?? current.schedule_time).slice(0, 5);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(scheduleTime)) {
    throw Object.assign(new Error('Ungültige Uhrzeit.'), { code: 'CONTENT_SETTINGS_VALIDATION_FAILED' });
  }
  const timezone = String(patch.timezone ?? current.timezone);
  if (!Intl.supportedValuesOf('timeZone').includes(timezone)) {
    throw Object.assign(new Error('Ungültige Zeitzone.'), { code: 'CONTENT_SETTINGS_VALIDATION_FAILED' });
  }
  return {
    agentEnabled: patch.agentEnabled ?? current.agent_enabled,
    operatingMode: patch.operatingMode ?? current.operating_mode,
    scheduleWeekdays: weekdays,
    scheduleTime,
    timezone,
    monthlyBudgetCents: Number(patch.monthlyBudgetCents ?? current.monthly_budget_cents),
    autoPublishMinScore: Math.max(90, Number(patch.autoPublishMinScore ?? current.auto_publish_min_score)),
    maximumAttempts: Number(patch.maximumAttempts ?? current.maximum_attempts)
  };
}

function changedKeys(current, next) {
  const mapping = {
    agent_enabled: next.agent_enabled,
    operating_mode: next.operating_mode,
    schedule_weekdays: next.schedule_weekdays,
    schedule_time: String(next.schedule_time).slice(0, 5),
    timezone: next.timezone,
    monthly_budget_cents: next.monthly_budget_cents,
    auto_publish_min_score: next.auto_publish_min_score,
    maximum_attempts: next.maximum_attempts
  };
  return Object.entries(mapping)
    .filter(([key, value]) => JSON.stringify(current[key]) !== JSON.stringify(value))
    .map(([key]) => key);
}

export async function getContentAgentSettings(db = pool) {
  const { rows } = await db.query('SELECT * FROM content_agent_settings WHERE id = 1');
  if (!rows[0]) throw new Error('Content-Agent-Einstellungen fehlen.');
  return rows[0];
}

export async function updateContentAgentSettings({ expectedVersion, patch, admin }, db = pool) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const currentResult = await client.query(
      'SELECT * FROM content_agent_settings WHERE id = 1 FOR UPDATE'
    );
    const current = currentResult.rows[0];
    if (!current || current.settings_version !== Number(expectedVersion)) {
      const error = new Error('Die Einstellungen wurden zwischenzeitlich geändert.');
      error.code = 'CONTENT_SETTINGS_VERSION_CONFLICT';
      throw error;
    }
    const next = normalizeSettingsPatch(current, patch);
    const { rows } = await client.query(`
      UPDATE content_agent_settings
      SET agent_enabled = $1, operating_mode = $2, schedule_weekdays = $3,
          schedule_time = $4, timezone = $5, monthly_budget_cents = $6,
          auto_publish_min_score = $7, maximum_attempts = $8,
          settings_version = settings_version + 1, updated_at = NOW()
      WHERE id = 1 AND settings_version = $9
      RETURNING *
    `, [
      next.agentEnabled, next.operatingMode, next.scheduleWeekdays,
      next.scheduleTime, next.timezone, next.monthlyBudgetCents,
      next.autoPublishMinScore, next.maximumAttempts, Number(expectedVersion)
    ]);
    if (!rows[0]) throw Object.assign(new Error('Versionskonflikt.'), { code: 'CONTENT_SETTINGS_VERSION_CONFLICT' });
    await client.query(`
      INSERT INTO content_agent_setting_revisions
        (settings_version, changed_keys, previous_values_json, new_values_json, admin_id, admin_username)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [rows[0].settings_version, changedKeys(current, rows[0]), current, rows[0], admin.id, admin.username]);
    await client.query('COMMIT');
    return rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

- [ ] **Step 4: Technische Konfiguration, Runtime und Snapshot implementieren**

```js
export function resolveContentAgentRuntimeConfig({ technicalConfig, settings }) {
  const budget = Math.min(
    Number(technicalConfig.monthlyCostLimitEur),
    Number(settings.monthly_budget_cents) / 100
  );
  const attempts = Math.min(Number(technicalConfig.maxAttempts), Number(settings.maximum_attempts));
  const score = Math.max(90, Number(settings.auto_publish_min_score));
  return Object.freeze({
    ...technicalConfig,
    enabled: technicalConfig.enabled === true && settings.agent_enabled === true,
    operatingMode: settings.operating_mode,
    scheduleWeekdays: [...settings.schedule_weekdays],
    scheduleTime: String(settings.schedule_time).slice(0, 5),
    timezone: settings.timezone,
    monthlyCostLimitEur: budget,
    maxAttempts: attempts,
    autoPublishMinScore: score,
    manualApprovalsCount: Number(settings.manual_approvals_count),
    settingsVersion: Number(settings.settings_version),
    autoPublishEffective: technicalConfig.autoPublishEnabled === true
      && settings.operating_mode === 'auto_publish'
      && Number(settings.manual_approvals_count) >= 8
  });
}

export function createContentAgentJobSnapshot({ runtimeConfig, claim, now = new Date() }) {
  return Object.freeze({
    version: 1,
    operatingMode: claim?.payload_json?.forced_mode || runtimeConfig.operatingMode,
    source: claim?.payload_json?.source || 'unknown',
    scheduleSlot: claim?.payload_json?.schedule_slot || null,
    monthlyCostLimitEur: runtimeConfig.monthlyCostLimitEur,
    autoPublishMinScore: runtimeConfig.autoPublishMinScore,
    maxAttempts: runtimeConfig.maxAttempts,
    manualApprovalsCount: runtimeConfig.manualApprovalsCount,
    autoPublishEffective: runtimeConfig.autoPublishEffective,
    timezone: runtimeConfig.timezone,
    contentModel: runtimeConfig.contentModel,
    reviewModel: runtimeConfig.reviewModel,
    imageModel: runtimeConfig.imageModel,
    settingsVersion: runtimeConfig.settingsVersion,
    startedAt: now.toISOString()
  });
}

export function validateContentAgentSettingsTransition({ current, next, technicalConfig }) {
  if (next.operating_mode !== 'auto_publish') return next;
  if (technicalConfig.autoPublishEnabled !== true || Number(current.manual_approvals_count) < 8) {
    throw Object.assign(
      new Error('Direktveröffentlichung ist technisch oder durch fehlende Freigaben gesperrt.'),
      { code: 'CONTENT_AUTOPUBLISH_NOT_READY' }
    );
  }
  if (Number(next.auto_publish_min_score) < 90) {
    throw Object.assign(new Error('Mindestscore muss mindestens 90 sein.'), { code: 'CONTENT_SETTINGS_VALIDATION_FAILED' });
  }
  return next;
}
```

`buildTechnicalConfigPresentation()` gibt niemals Secrets zurück und markiert Modelle, Preise, Polling, Lease und Hardcaps mit `editable:false`, `source:'.env'` und `restartRequired:true`.

- [ ] **Step 5: Tests ausführen und committen**

Run: `node --test tests/contentAgentSettingsRepository.test.js tests/contentAgentRuntimeConfig.test.js tests/contentAgentConfig.test.js`  
Expected: PASS.

```bash
git add repositories/contentAgentSettingsRepository.js services/contentAgent/runtimeConfigService.js services/contentAgent/config.js tests/contentAgentSettingsRepository.test.js tests/contentAgentRuntimeConfig.test.js tests/contentAgentConfig.test.js
git commit -m "feat: resolve content agent runtime settings"
```

### Task 3: Dynamischer, DST-sicherer Scheduler und unveränderliche Job-Snapshots

**Files:**
- Create: `services/contentAgent/contentSchedulerService.js`
- Modify: `repositories/contentJobRepository.js`
- Modify: `repositories/contentRunRepository.js`
- Modify: `services/contentAgent/workerService.js`
- Modify: `services/contentAgent/contentCostService.js`
- Modify: `scripts/contentWorker.js`
- Modify: `tests/contentAgentWorker.test.js`
- Modify: `tests/contentAgentJobRepository.test.js`
- Modify: `tests/contentAgentCostService.test.js`
- Test: `tests/contentAgentScheduler.test.js`
- Test: `tests/contentAgentRunSnapshot.test.js`

**Interfaces:**
- Consumes: `getContentAgentSettings`, `resolveContentAgentRuntimeConfig`, `createContentAgentJobSnapshot`.
- Produces: `getLocalScheduleContext`, `findDueScheduleSlot`, `buildScheduledJobIdentity`, `runContentSchedulerTick`, `createDynamicContentScheduler` und `monthKey(now, timezone)`.
- Changes: `createRun({ jobId, currentStage, runtimeSnapshot }, db)` preserves the first snapshot forever.

- [ ] **Step 1: Fehlschlagende Termin-, Pausen- und Snapshot-Tests schreiben**

```js
test('Montag und Donnerstag 18 Uhr erzeugen kanonische Berliner Slots', () => {
  const settings = {
    agent_enabled: true,
    schedule_weekdays: [1, 4],
    schedule_time: '18:00',
    timezone: 'Europe/Berlin'
  };
  assert.equal(
    findDueScheduleSlot({ settings, now: new Date('2026-07-13T16:00:20.000Z') }).key,
    'weekly:2026-07-13:18:00:Europe/Berlin'
  );
  assert.equal(findDueScheduleSlot({ settings, now: new Date('2026-07-14T16:00:20.000Z') }), null);
});

test('Retry bewahrt den ersten Runtime-Snapshot', async () => {
  const first = await createRun({ jobId: 12, runtimeSnapshot: { settingsVersion: 3 } }, db);
  const resumed = await createRun({ jobId: 12, runtimeSnapshot: { settingsVersion: 4 } }, db);
  assert.deepEqual(resumed.runtime_snapshot_json, first.runtime_snapshot_json);
});

test('Monatsbudget verwendet die Zeitzone des Job-Snapshots', () => {
  assert.equal(monthKey(new Date('2026-07-31T22:30:00.000Z'), 'Europe/Berlin'), '2026-08');
  assert.equal(monthKey(new Date('2026-07-31T22:30:00.000Z'), 'UTC'), '2026-07');
});
```

- [ ] **Step 2: Tests ausführen und erwartete Fehler bestätigen**

Run: `node --test tests/contentAgentScheduler.test.js tests/contentAgentRunSnapshot.test.js`  
Expected: FAIL mit fehlenden Exporten.

- [ ] **Step 3: Terminservice mit Luxon implementieren**

```js
import { DateTime } from 'luxon';

export function getLocalScheduleContext({ now = new Date(), timezone }) {
  const local = DateTime.fromJSDate(now, { zone: timezone });
  if (!local.isValid) throw new TypeError('Ungültige IANA-Zeitzone.');
  return {
    date: local.toISODate(),
    weekday: local.weekday,
    time: local.toFormat('HH:mm'),
    minuteStart: local.startOf('minute').toUTC().toISO()
  };
}

export function buildScheduledJobIdentity({ localDate, localTime, timezone }) {
  return `weekly:${localDate}:${localTime}:${timezone}`;
}

export function findDueScheduleSlot({ settings, now = new Date(), graceMinutes = 5 }) {
  if (settings.agent_enabled !== true) return null;
  const local = DateTime.fromJSDate(now, { zone: settings.timezone });
  const [hour, minute] = String(settings.schedule_time).slice(0, 5).split(':').map(Number);
  if (!settings.schedule_weekdays.includes(local.weekday)) return null;
  const scheduled = local.startOf('day').set({ hour, minute });
  const age = local.diff(scheduled, 'minutes').minutes;
  if (age < 0 || age >= graceMinutes) return null;
  const localTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  return {
    localDate: local.toISODate(),
    localTime,
    timezone: settings.timezone,
    key: buildScheduledJobIdentity({ localDate: local.toISODate(), localTime, timezone: settings.timezone })
  };
}
```

Die Tests ergänzen Frühjahr-/Herbst-DST: Nicht existente lokale Zeiten laufen am nächsten gültigen Zeitpunkt desselben Tages; doppelte lokale Zeiten erzeugen wegen identischem Schlüssel höchstens einen Job. Das fünfminütige Nachholfenster verhindert den Verlust eines Termins bei kurzem Worker-/DB-Ausfall.

- [ ] **Step 4: Scheduler-Tick und Minutentimer implementieren**

```js
export async function runContentSchedulerTick({ getSettings, enqueueJob, updateSchedulerState, now }) {
  const settings = await getSettings();
  const slot = findDueScheduleSlot({ settings, now: now() });
  await updateSchedulerState({ lastSchedulerTickAt: now(), lastScheduledSlot: slot?.key || null });
  if (!slot) return null;
  return enqueueJob({
    jobType: 'generate_weekly_draft',
    idempotencyKey: slot.key,
    payload: { source: 'weekly-schedule', schedule_slot: slot.key },
    maxAttempts: settings.maximum_attempts
  });
}

export function createDynamicContentScheduler({ tick, setIntervalFn = setInterval, clearIntervalFn = clearInterval }) {
  let timer = null;
  return {
    start() {
      if (timer !== null) return false;
      timer = setIntervalFn(() => void tick(), 60_000);
      void tick();
      return true;
    },
    stop() {
      if (timer !== null) clearIntervalFn(timer);
      timer = null;
    }
  };
}
```

- [ ] **Step 5: Pause atomar in den Queue-Claim integrieren**

`CLAIM_NEXT_JOB_SQL` erhält innerhalb der Kandidatenauswahl:

```sql
AND EXISTS (
  SELECT 1
  FROM content_agent_settings settings
  WHERE settings.id = 1 AND settings.agent_enabled = TRUE
)
```

Damit läuft der Heartbeat weiter, wartende Jobs bleiben aber unangetastet. `CONTENT_AGENT_ENABLED=false` verhindert weiterhin den gesamten Workerstart.

- [ ] **Step 6: Run-Snapshot beim ersten Start speichern und beim Retry erhalten**

```js
export async function createRun({ jobId, currentStage = 'inventory', runtimeSnapshot = {} }, db = pool) {
  const { rows } = await db.query(`
    INSERT INTO content_runs (job_id, status, current_stage, runtime_snapshot_json)
    VALUES ($1, 'running', $2, $3::jsonb)
    ON CONFLICT (job_id) DO UPDATE
    SET status = 'running', finished_at = NULL
    RETURNING *
  `, [jobId, currentStage, runtimeSnapshot]);
  return rows[0] || null;
}
```

`createProductionJobHandler()` lädt vor `createRun()` die aktuellen Einstellungen, bildet den Snapshot, verwendet anschließend ausschließlich `run.runtime_snapshot_json` und erstellt die Provider-/Pipelineabhängigkeiten pro Job mit diesem Snapshot.

`contentCostService` erhält `monthKey(now, timezone)` und verwendet für neue Reservierungen die Snapshot-Zeitzone. Persistierte Reservierungen behalten ihren vorhandenen `reservation_month`; Retries berechnen einen bereits gespeicherten Monat nicht neu.

- [ ] **Step 7: Tests ausführen und committen**

Run: `node --test tests/contentAgentScheduler.test.js tests/contentAgentRunSnapshot.test.js tests/contentAgentWorker.test.js tests/contentAgentJobRepository.test.js tests/contentAgentCostService.test.js`  
Expected: PASS.

```bash
git add services/contentAgent/contentSchedulerService.js repositories/contentJobRepository.js repositories/contentRunRepository.js services/contentAgent/workerService.js services/contentAgent/contentCostService.js scripts/contentWorker.js tests/contentAgentScheduler.test.js tests/contentAgentRunSnapshot.test.js tests/contentAgentWorker.test.js tests/contentAgentJobRepository.test.js tests/contentAgentCostService.test.js
git commit -m "feat: schedule content jobs from database settings"
```

### Task 4: Kompakte Adminabfragen, Status und sichere Präsentationsmodelle

**Files:**
- Create: `repositories/contentAgentAdminRepository.js`
- Create: `services/contentAgent/adminPresentationService.js`
- Create: `repositories/contentProviderStateRepository.js`
- Modify: `services/contentAgent/draftPipeline.js`
- Test: `tests/contentAgentAdminRepository.test.js`
- Test: `tests/contentAgentAdminPresentation.test.js`
- Test: `tests/contentProviderStateRepository.test.js`

**Interfaces:**
- Produces: `createContentAgentAdminRepository(db)`, `buildDashboardPresentation(data, now)`, `buildDraftListPresentation(rows)`, `buildJobListPresentation(rows)`, `buildTechnologyPresentation(config, state)`, `recordProviderResult(input, db)`.
- Security: Dashboardabfragen liefern keine vollständigen Artikel, Prompts, `stage_results_json`, `openai_response_ids_json` oder Secrets.

- [ ] **Step 1: Fehlschlagende Query- und Präsentationstests schreiben**

```js
test('Dashboardabfragen laden keine Rohpayloads oder Modellantworten', async () => {
  const repository = createContentAgentAdminRepository(db);
  await repository.getOverview();
  const sql = db.calls.map((call) => call.sql).join(' ');
  assert.doesNotMatch(sql, /stage_results_json|openai_response_ids_json|payload_json/i);
  assert.match(sql, /content_worker_state/i);
  assert.match(sql, /content_agent_settings/i);
});

test('Jobpräsentation zeigt bereinigte Fehler und letzte sichere Stufe', () => {
  const [job] = buildJobListPresentation([{
    id: 7,
    status: 'failed',
    current_stage: 'image_generation',
    last_error: 'Upload fehlgeschlagen',
    attempts: 3,
    max_attempts: 3
  }]);
  assert.equal(job.statusLabel, 'Endgültig fehlgeschlagen');
  assert.equal(job.lastSafeStageLabel, 'Bildgenerierung');
});
```

- [ ] **Step 2: Tests ausführen und Modulfehler bestätigen**

Run: `node --test tests/contentAgentAdminRepository.test.js tests/contentAgentAdminPresentation.test.js tests/contentProviderStateRepository.test.js`  
Expected: FAIL mit `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Repository-Factory mit begrenzten Abfragen implementieren**

```js
export function createContentAgentAdminRepository(db = pool) {
  return {
    async getOverview() {
      const [settings, worker, budget, drafts, jobs, approvals] = await Promise.all([
        db.query('SELECT * FROM content_agent_settings WHERE id = 1'),
        db.query('SELECT * FROM content_worker_state WHERE worker_name = $1', ['content-worker']),
        db.query(`SELECT COALESCE(SUM(cost_estimate), 0) AS used FROM content_runs WHERE started_at >= date_trunc('month', NOW())`),
        db.query(`SELECT id, title, slug, workflow_status, image_url, created_at FROM posts WHERE generated_by_ai = TRUE AND published = FALSE ORDER BY created_at DESC LIMIT 10`),
        db.query(`SELECT j.id, j.job_type, j.status, j.attempts, j.max_attempts, j.last_error, j.created_at, j.finished_at, r.current_stage, r.post_id, r.cost_estimate FROM content_jobs j LEFT JOIN content_runs r ON r.job_id = j.id ORDER BY j.created_at DESC LIMIT 10`),
        db.query(`SELECT manual_approvals_count FROM content_agent_settings WHERE id = 1`)
      ]);
      return {
        settings: settings.rows[0], worker: worker.rows[0] || null,
        budgetUsed: Number(budget.rows[0]?.used || 0), drafts: drafts.rows,
        jobs: jobs.rows, approvals: Number(approvals.rows[0]?.manual_approvals_count || 0)
      };
    },
    async listDrafts() {
      const { rows } = await db.query(`
        SELECT p.id, p.title, p.slug, p.excerpt, p.image_url, p.workflow_status, p.created_at,
               m.primary_keyword, m.content_cluster, m.quality_score, m.quality_report_json,
               r.cost_estimate
        FROM posts p
        JOIN content_post_metadata m ON m.post_id = p.id
        LEFT JOIN content_runs r ON r.post_id = p.id
        WHERE p.generated_by_ai = TRUE AND p.published = FALSE
        ORDER BY p.created_at DESC
      `);
      return rows;
    },
    async listJobs(limit = 100) {
      const { rows } = await db.query(`
        SELECT j.id, j.job_type, j.status, j.attempts, j.max_attempts, j.last_error,
               j.created_at, j.updated_at, j.finished_at,
               r.current_stage, r.post_id, r.cost_estimate, r.status AS run_status
        FROM content_jobs j LEFT JOIN content_runs r ON r.job_id = j.id
        ORDER BY j.created_at DESC LIMIT $1
      `, [Math.min(200, Math.max(1, Number(limit) || 100))]);
      return rows;
    }
  };
}
```

- [ ] **Step 4: Präsentationsservice ohne Rohdaten implementieren**

```js
const STAGE_LABELS = Object.freeze({
  inventory: 'Bestandsaufnahme', topic_research: 'Themenrecherche', seo_brief: 'SEO-Briefing',
  article_generation: 'Artikelerstellung', validation: 'Qualitätsprüfung', review: 'Redaktionelle Prüfung',
  repair: 'Überarbeitung', image_generation: 'Bildgenerierung', cloudinary_upload: 'Bild-Upload',
  draft_creation: 'Entwurfsspeicherung', completed: 'Abgeschlossen'
});

export function buildDraftListPresentation(rows = []) {
  return rows.map((row) => ({
    id: row.id, title: row.title, slug: row.slug, excerpt: row.excerpt,
    imageUrl: row.image_url, workflowStatus: row.workflow_status,
    primaryKeyword: row.primary_keyword || '-', contentCluster: row.content_cluster || '-',
    qualityScore: Number(row.quality_score || 0), costEur: Number(row.cost_estimate || 0),
    riskBlocked: row.quality_report_json?.focusedReview?.blocked === true,
    riskCount: row.quality_report_json?.focusedReview?.items?.length || 0,
    createdAt: row.created_at
  }));
}

export function buildJobListPresentation(rows = []) {
  return rows.map((row) => ({
    id: row.id, jobType: row.job_type, status: row.status,
    statusLabel: row.status === 'failed' ? 'Endgültig fehlgeschlagen'
      : row.status === 'needs_manual_attention' ? 'Manuelle Prüfung nötig'
        : row.status === 'completed' ? 'Abgeschlossen' : row.status,
    attempts: Number(row.attempts || 0), maxAttempts: Number(row.max_attempts || 0),
    lastError: row.last_error || null, postId: row.post_id || null,
    costEur: Number(row.cost_estimate || 0),
    lastSafeStageLabel: STAGE_LABELS[String(row.current_stage || '').split(':')[0]] || 'Noch keine Stufe',
    createdAt: row.created_at, finishedAt: row.finished_at
  }));
}

export function buildDashboardPresentation(data, now = new Date()) {
  const heartbeatFresh = isHeartbeatFresh(data.worker?.heartbeat_at, now);
  return {
    modeLabel: data.settings?.agent_enabled === false
      ? 'Deaktiviert'
      : data.settings?.operating_mode === 'auto_publish' ? 'Direkt veröffentlichen' : 'Review',
    worker: { healthy: heartbeatFresh, label: heartbeatFresh ? 'Worker aktiv' : 'Worker nicht erreichbar' },
    budget: {
      usedEur: Number(data.budgetUsed || 0),
      limitEur: Number(data.settings?.monthly_budget_cents || 0) / 100
    },
    approvals: {
      current: Number(data.approvals || 0), required: 8,
      ready: Number(data.approvals || 0) >= 8
    },
    drafts: buildDraftListPresentation(data.drafts || []),
    jobs: buildJobListPresentation(data.jobs || [])
  };
}
```

`buildTechnologyPresentation()` nimmt ausschließlich die bereits redigierte technische Konfiguration, `package.json.version`, `CONTENT_AGENT_WORKER_VERSION`, Workerstatus und Providerstatus entgegen. Es kennzeichnet technische Werte mit `editable:false`; der Service liest keine API-Schlüssel und erhält keine vollständige `process.env`-Kopie.

- [ ] **Step 5: Providerstatus nur aus echten Ergebnissen aktualisieren**

```js
export async function recordProviderResult({ providerName, success, errorCode = null }, db = pool) {
  const { rows } = await db.query(`
    INSERT INTO content_provider_state
      (provider_name, last_success_at, last_failure_at, last_error_code, updated_at)
    VALUES ($1, CASE WHEN $2 THEN NOW() END, CASE WHEN $2 THEN NULL ELSE NOW() END, $3, NOW())
    ON CONFLICT (provider_name) DO UPDATE
    SET last_success_at = CASE WHEN $2 THEN NOW() ELSE content_provider_state.last_success_at END,
        last_failure_at = CASE WHEN $2 THEN content_provider_state.last_failure_at ELSE NOW() END,
        last_error_code = CASE WHEN $2 THEN NULL ELSE $3 END,
        updated_at = NOW()
    RETURNING *
  `, [providerName, success === true, errorCode]);
  return rows[0] || null;
}
```

`draftPipeline.js` ruft diesen Adapter nach erfolgreichen beziehungsweise sicher fehlgeschlagenen OpenAI- und Cloudinary-Stufen auf. Dashboardaufrufe führen keine Provideranfragen aus.

- [ ] **Step 6: Tests ausführen und committen**

Run: `node --test tests/contentAgentAdminRepository.test.js tests/contentAgentAdminPresentation.test.js tests/contentProviderStateRepository.test.js`  
Expected: PASS.

```bash
git add repositories/contentAgentAdminRepository.js services/contentAgent/adminPresentationService.js repositories/contentProviderStateRepository.js services/contentAgent/draftPipeline.js tests/contentAgentAdminRepository.test.js tests/contentAgentAdminPresentation.test.js tests/contentProviderStateRepository.test.js
git commit -m "feat: query content agent dashboard status"
```

### Task 5: Geschützte Adminrouten für Einstellungen, manuelle Jobs und sichere Fortsetzung

**Files:**
- Create: `controllers/adminContentAgentController.js`
- Create: `routes/adminContentAgentRoutes.js`
- Modify: `repositories/contentJobRepository.js`
- Modify: `routes/adminBlogRoutes.js`
- Modify: `controllers/adminBlogController.js`
- Modify: `views/admin/editPost.ejs`
- Modify: `views/admin/blogList.ejs`
- Modify: `index.js`
- Test: `tests/contentAgentAdminRoutes.test.js`
- Test: `tests/contentAgentAdminController.test.js`
- Modify: `tests/blogAdminWorkflow.test.js`

**Interfaces:**
- Produces: explizite GET-Seiten und CSRF-geschützte POST-Aktionen.
- Produces: `retryContentJobForAdmin({ jobId, hardMaxAttempts }, db)` als Compare-and-Set auf demselben Job.
- Consumes: Settings-, Admin- und Job-Repositories.

- [ ] **Step 1: Fehlschlagenden Routen- und Altweg-Sicherheitstest schreiben**

```js
test('alle Content-Agent-Schreibwege verlangen Admin und CSRF', () => {
  assert.match(routes, /router\.post\('\/admin\/content-agent\/settings',\s*isAdmin,\s*verifyCsrfToken/);
  assert.match(routes, /router\.post\('\/admin\/content-agent\/jobs\/manual-draft',\s*isAdmin,\s*verifyCsrfToken/);
  assert.match(routes, /router\.post\('\/admin\/content-agent\/jobs\/:id\/retry',\s*isAdmin,\s*verifyCsrfToken/);
});

test('alte Blog-Schreibrouten verlangen ebenfalls CSRF', () => {
  for (const line of blogRoutes.split('\n').filter((value) => value.includes('router.post'))) {
    assert.match(line, /isAdmin,\s*(?:upload\.single\([^)]*\),\s*)?verifyCsrfToken/);
  }
});
```

- [ ] **Step 2: Tests ausführen und erwartete Fehler bestätigen**

Run: `node --test tests/contentAgentAdminRoutes.test.js tests/contentAgentAdminController.test.js tests/blogAdminWorkflow.test.js`  
Expected: FAIL.

- [ ] **Step 3: Expliziten Router anlegen**

```js
const router = Router();
router.get('/admin/content-agent', isAdmin, controller.overviewPage);
router.get('/admin/content-agent/drafts', isAdmin, controller.draftsPage);
router.get('/admin/content-agent/existing-content', isAdmin, controller.existingContentPage);
router.get('/admin/content-agent/schedule', isAdmin, controller.schedulePage);
router.get('/admin/content-agent/jobs', isAdmin, controller.jobsPage);
router.get('/admin/content-agent/technology', isAdmin, controller.technologyPage);
router.get('/admin/content-agent/drafts/:id/preview', isAdmin, controller.draftPreviewPage);
router.get('/admin/content-agent/drafts/:id/edit', isAdmin, controller.draftEditPage);
router.post('/admin/content-agent/settings', isAdmin, verifyCsrfToken, controller.updateSettingsAction);
router.post('/admin/content-agent/jobs/manual-draft', isAdmin, verifyCsrfToken, controller.enqueueManualDraftAction);
router.post('/admin/content-agent/jobs/:id/retry', isAdmin, verifyCsrfToken, controller.retryJobAction);
router.post('/admin/content-agent/drafts/:id', isAdmin, verifyCsrfToken, controller.updateDraftAction);
router.post('/admin/content-agent/drafts/:id/publish', isAdmin, verifyCsrfToken, controller.publishDraftAction);
router.post('/admin/content-agent/drafts/:id/reject', isAdmin, verifyCsrfToken, controller.rejectDraftAction);
router.post('/admin/content-agent/drafts/:id/regenerate-image', isAdmin, verifyCsrfToken, controller.regenerateImageAction);
router.post('/admin/content-agent/drafts/:id/regenerate-faq', isAdmin, verifyCsrfToken, controller.regenerateFaqAction);
router.post('/admin/content-agent/drafts/:id/regenerate', isAdmin, verifyCsrfToken, controller.regenerateDraftAction);
router.post('/admin/content-agent/existing-content/audit', isAdmin, verifyCsrfToken, controller.enqueueAuditAction);
router.post('/admin/content-agent/existing-content/:id/revision', isAdmin, verifyCsrfToken, controller.createRevisionAction);
router.get('/admin/content-agent/revisions/:id/edit', isAdmin, controller.revisionEditPage);
router.post('/admin/content-agent/revisions/:id', isAdmin, verifyCsrfToken, controller.updateRevisionAction);
router.post('/admin/content-agent/revisions/:id/publish', isAdmin, verifyCsrfToken, controller.publishRevisionAction);
```

- [ ] **Step 4: Controller-Factory und manuelle Draft-Aktion implementieren**

```js
export function createAdminContentAgentController(dependencies) {
  const {
    adminRepository, settingsRepository, jobRepository,
    runtimeConfig, presentation, draftService, publicationService,
    revisionService, previewService
  } = dependencies;

  return {
    async enqueueManualDraftAction(req, res, next) {
      try {
        const settings = await settingsRepository.getSettings();
        if (!settings.agent_enabled) return res.status(409).send('Der Content-Agent ist deaktiviert.');
        const key = `manual:${crypto.randomUUID()}`;
        await jobRepository.enqueueJob({
          jobType: 'generate_manual_draft', idempotencyKey: key,
          payload: { source: 'admin_manual', forced_mode: 'review' },
          maxAttempts: Math.min(settings.maximum_attempts, runtimeConfig.maxAttempts)
        });
        return res.redirect('/admin/content-agent?created=1');
      } catch (error) { return next(error); }
    }
  };
}
```

Der Controller verwendet für alle Aktionen dieselbe explizite Fehlerabbildung:

```js
function contentAgentStatus(error) {
  if (error?.code?.endsWith('_NOT_FOUND')) return 404;
  if (['CONTENT_SETTINGS_VERSION_CONFLICT', 'CONTENT_AUTOPUBLISH_NOT_READY', 'CONTENT_DRAFT_NOT_PUBLISHABLE', 'CONTENT_JOB_NOT_RETRYABLE'].includes(error?.code)) return 409;
  if (error?.code?.includes('VALIDATION') || error?.code === 'CONTENT_CONFIRMATION_REQUIRED') return 400;
  return 500;
}
```

`overviewPage`, `draftsPage`, `existingContentPage`, `schedulePage`, `jobsPage` und `technologyPage` laden ausschließlich ihr jeweiliges Repository-/Präsentationsmodell. `updateSettingsAction` lädt zuerst aktuelle Einstellungen und technische Hardgates, ruft `validateContentAgentSettingsTransition` und danach `updateContentAgentSettings`. `retryJobAction` ruft `retryContentJobForAdmin`, und jede Draft-/Revisionaktion ruft genau den im Routennamen benannten Service auf. Bei bekannten Fehlercodes wird der oben definierte Status ausgegeben; unbekannte Fehler gehen an `next(error)`.

- [ ] **Step 5: Sichere Fortsetzung desselben Jobs implementieren**

```js
export async function retryContentJobForAdmin({ jobId, hardMaxAttempts }, db = pool) {
  const cap = Math.min(5, Math.max(1, Number(hardMaxAttempts) || 1));
  const { rows } = await db.query(`
    UPDATE content_jobs
    SET status = 'queued',
        max_attempts = LEAST($2, GREATEST(max_attempts, attempts + 1)),
        run_after = NOW(), locked_at = NULL, locked_by = NULL,
        last_error = NULL, finished_at = NULL, updated_at = NOW()
    WHERE id = $1
      AND status IN ('failed', 'needs_manual_attention')
      AND attempts < $2
    RETURNING *
  `, [jobId, cap]);
  return rows[0] || null;
}
```

Kein neuer Job und kein neuer Run werden angelegt.

- [ ] **Step 6: Legacy-Blogweg absichern**

`routes/adminBlogRoutes.js` importiert `verifyCsrfToken`; alle POST-Routen verwenden Reihenfolge `isAdmin`, optional `upload`, danach `verifyCsrfToken`, Controller. Alle zugehörigen Formulare erhalten `_csrf`.

`updatePost()` verweigert bei `current.generated_by_ai === true` jede Änderung von `published=false` auf `true` mit HTTP 409 und Link zum Content-Agent-Review. `editPost.ejs` zeigt für KI-Entwürfe keinen Publikationsschalter.

- [ ] **Step 7: Router mounten, Tests ausführen und committen**

Run: `node --test tests/contentAgentAdminRoutes.test.js tests/contentAgentAdminController.test.js tests/blogAdminWorkflow.test.js`  
Expected: PASS.

```bash
git add controllers/adminContentAgentController.js routes/adminContentAgentRoutes.js repositories/contentJobRepository.js routes/adminBlogRoutes.js controllers/adminBlogController.js views/admin/editPost.ejs views/admin/blogList.ejs index.js tests/contentAgentAdminRoutes.test.js tests/contentAgentAdminController.test.js tests/blogAdminWorkflow.test.js
git commit -m "feat: add protected content agent admin actions"
```

### Task 6: Cockpit-Layout A mit fünf Unterreitern

**Files:**
- Create: `views/admin/contentAgent/_tabs.ejs`
- Create: `views/admin/contentAgent/_statusCards.ejs`
- Create: `views/admin/contentAgent/overview.ejs`
- Create: `views/admin/contentAgent/drafts.ejs`
- Create: `views/admin/contentAgent/existingContent.ejs`
- Create: `views/admin/contentAgent/schedule.ejs`
- Create: `views/admin/contentAgent/jobs.ejs`
- Create: `views/admin/contentAgent/technology.ejs`
- Create: `public/js/admin-content-agent.js`
- Modify: `views/partials/admin_header.ejs`
- Modify: `views/admin/dashboard.ejs`
- Modify: `public/admin.css`
- Test: `tests/contentAgentAdminViews.test.js`

**Interfaces:**
- Consumes: ausschließlich bereits präsentierte Viewmodels aus Controller und `adminPresentationService`.
- Produces: bestätigtes Cockpit A mit Übersicht, Entwürfen, Zeitplan, Jobs und Technik.

- [ ] **Step 1: Fehlschlagenden Viewvertrag schreiben**

```js
test('Cockpit enthält bestätigte Reiter und sichere Formulare', () => {
  assert.match(overview, /Content-Agent/);
  assert.match(tabs, /Übersicht/);
  assert.match(tabs, /Entwürfe/);
  assert.match(tabs, /Zeitplan &amp; Modus/);
  assert.match(tabs, /Jobs &amp; Protokolle/);
  assert.match(tabs, /Technik/);
  assert.match(overview, /Jetzt Entwurf erstellen/);
  assert.match(overview, /name="_csrf"/);
  assert.match(schedule, /Montag/);
  assert.match(schedule, /Donnerstag/);
  assert.match(technology, /schreibgeschützt/i);
});
```

- [ ] **Step 2: Test ausführen und fehlende Views bestätigen**

Run: `node --test tests/contentAgentAdminViews.test.js`  
Expected: FAIL mit `ENOENT`.

- [ ] **Step 3: Gemeinsame Reiter und Statuskarten anlegen**

```ejs
<nav class="nav nav-pills content-agent-tabs mb-4" aria-label="Content-Agent-Bereiche">
  <a class="nav-link <%= activeTab === 'overview' ? 'active' : '' %>" href="/admin/content-agent">Übersicht</a>
  <a class="nav-link <%= activeTab === 'drafts' ? 'active' : '' %>" href="/admin/content-agent/drafts">Entwürfe</a>
  <a class="nav-link <%= activeTab === 'schedule' ? 'active' : '' %>" href="/admin/content-agent/schedule">Zeitplan &amp; Modus</a>
  <a class="nav-link <%= activeTab === 'jobs' ? 'active' : '' %>" href="/admin/content-agent/jobs">Jobs &amp; Protokolle</a>
  <a class="nav-link <%= activeTab === 'technology' ? 'active' : '' %>" href="/admin/content-agent/technology">Technik</a>
</nav>
```

Statuskarten zeigen Modus, nächsten Lauf, Budget und offene Prüfung. Alle Daten werden mit `<%=` escaped.

- [ ] **Step 4: Übersicht und sichere Aktionen anlegen**

```ejs
<%- include('../../partials/admin_header') %>
<div class="container-fluid py-4 content-agent-page">
  <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
    <div><h1 class="admin-page-title mb-1">Content-Agent</h1><p class="text-muted mb-0"><%= dashboard.modeLabel %></p></div>
    <div class="d-flex gap-2">
      <form method="post" action="/admin/content-agent/settings" data-confirm="Agentstatus wirklich ändern?">
        <input type="hidden" name="_csrf" value="<%= csrfToken || '' %>">
        <input type="hidden" name="settings_version" value="<%= settings.settings_version %>">
        <input type="hidden" name="agent_enabled" value="<%= settings.agent_enabled ? 'false' : 'true' %>">
        <button class="btn btn-outline-secondary"><%= settings.agent_enabled ? 'Agent pausieren' : 'Agent aktivieren' %></button>
      </form>
      <form method="post" action="/admin/content-agent/jobs/manual-draft" data-confirm="Jetzt einen kostenpflichtigen Entwurf erzeugen?">
        <input type="hidden" name="_csrf" value="<%= csrfToken || '' %>">
        <button class="btn btn-primary" <%= settings.agent_enabled ? '' : 'disabled' %>>Jetzt Entwurf erstellen</button>
      </form>
    </div>
  </div>
  <%- include('_tabs', { activeTab: 'overview' }) %>
  <%- include('_statusCards', { dashboard }) %>
</div>
<script src="<%= jsAsset('js/admin-content-agent.js') %>" defer></script>
<%- include('../../partials/admin_footer') %>
```

- [ ] **Step 5: Zeitplan-, Job-, Draft-, Bestands- und Technikseiten anlegen**

Die Zeitplanseite rendert Checkboxen `schedule_weekdays` mit Werten 1–7, `input type=time`, IANA-Zeitzone, Cent-/Euro-Budget, Score und Versuche. Direktveröffentlichung zeigt acht Freigaben, Hardgate und Risikohinweis.

Die Jobseite rendert nur kompakte Felder aus `buildJobListPresentation`; kein JSON-Rohpayload. Fehlgeschlagene Jobs besitzen ein CSRF-Formular `Job fortsetzen`.

Die Technikseite verwendet deaktivierte Inputs beziehungsweise Definition Lists mit `Quelle: .env` und `Neustart erforderlich`; Secrets erscheinen nur als `konfiguriert` oder `nicht konfiguriert`.

- [ ] **Step 6: Navigation, responsives CSS und Bestätigungs-JavaScript ergänzen**

`admin_header.ejs` erhält vor „Pakete & Preise“ einen eigenen aktiven Hauptlink `Content-Agent`. `admin-content-agent.js` bindet ausschließlich `[data-confirm]` an `window.confirm` und Meta-Zähler an; es ändert keine Betriebsdaten im Browser.

`public/admin.css` erhält die Präfixe `.content-agent-page`, `.content-agent-tabs`, `.content-agent-metric`, `.content-agent-risk`, `.content-agent-status`. Unter 768 Pixeln wechseln Metriken und Hauptspalten auf eine Spalte.

- [ ] **Step 7: Tests, CSS-Build und Commit**

Run: `node --test tests/contentAgentAdminViews.test.js`  
Expected: PASS.

Run: `npm run build`  
Expected: PASS und aktualisiertes CSS-Manifest.

```bash
git add views/admin/contentAgent views/partials/admin_header.ejs views/admin/dashboard.ejs public/admin.css public/js/admin-content-agent.js public/css-asset-manifest.json public/css tests/contentAgentAdminViews.test.js
git commit -m "feat: add content agent admin cockpit"
```

### Task 7: Konkreter Risikobericht mit fokussierten Prüfstellen

**Files:**
- Create: `services/contentAgent/riskReportService.js`
- Modify: `services/contentAgent/articleSchemas.js`
- Modify: `services/contentAgent/prompts/articleReviewerPrompt.js`
- Modify: `services/contentAgent/draftPipeline.js`
- Create: `views/admin/contentAgent/_riskChecklist.ejs`
- Test: `tests/contentAgentRiskReport.test.js`
- Modify: `tests/contentAgentDraftPipeline.test.js`
- Modify: `tests/contentAgentOpenAIService.test.js`

**Interfaces:**
- Produces: `buildFocusedRiskReport({ article, review, validation, sources })`.
- Adds optional Review-Issue fields: `sectionHeading`, `evidenceExcerpt`, `verificationType`, `sourceRequired`, `autoPublishBlocking`.
- Persists: fokussierter Bericht in `content_post_metadata.quality_report_json.focusedReview`.

- [ ] **Step 1: Fehlschlagende Risikoberichtstests schreiben**

```js
test('Risikobericht nennt Abschnitt, Ausschnitt und konkrete Prüfung', () => {
  const report = buildFocusedRiskReport({
    article: {
      contentHtml: '<section><h2>Datenschutz und Cookies</h2><p>Alle Cookies benötigen 2026 eine Einwilligung.</p></section>',
      risk: { privacyClaims: true, currentClaims: true }
    },
    review: {
      issues: [{
        code: 'privacy_claim', severity: 'warning', message: 'Datenschutzaussage prüfen.',
        repairInstruction: 'Aktuelle Quelle prüfen.', blocking: true,
        sectionHeading: 'Datenschutz und Cookies',
        evidenceExcerpt: 'Alle Cookies benötigen 2026 eine Einwilligung.',
        verificationType: 'privacy', sourceRequired: true, autoPublishBlocking: true
      }]
    },
    validation: { issues: [] }, sources: []
  });
  assert.equal(report.blocked, true);
  assert.equal(report.items[0].anchor, 'pruefung-datenschutz-und-cookies');
  assert.equal(report.items[0].instruction, 'Aktuelle Quelle prüfen.');
});
```

- [ ] **Step 2: Test ausführen und Modulfehler bestätigen**

Run: `node --test tests/contentAgentRiskReport.test.js`  
Expected: FAIL mit `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Review-Schema additiv erweitern**

```js
const ReviewIssueSchema = z.object({
  code: NonEmptyString,
  severity: z.enum(['info', 'warning', 'error']),
  message: NonEmptyString,
  repairInstruction: NonEmptyString,
  blocking: z.boolean(),
  sectionHeading: z.string().trim().max(180).nullable().optional().default(null),
  evidenceExcerpt: z.string().trim().max(280).nullable().optional().default(null),
  verificationType: z.enum(['none', 'source', 'date', 'price', 'version', 'legal', 'privacy'])
    .optional().default('none'),
  sourceRequired: z.boolean().optional().default(false),
  autoPublishBlocking: z.boolean().optional().default(false)
}).strict();
```

Der Reviewer-Prompt verlangt für jede Tatsachen-/Risikoaussage den exakten vorhandenen H2-/H3-Titel, einen höchstens 280 Zeichen langen Ausschnitt, Prüfart und Quellenbedarf. Er darf keine HTML-IDs erzeugen.

- [ ] **Step 4: Deterministischen Bericht implementieren**

```js
import slugify from 'slugify';

export function buildFocusedRiskReport({ article = {}, review = {}, validation = {}, sources = [] }) {
  const items = [...(review.issues || []), ...(validation.issues || [])].map((issue, index) => {
    const section = issue.sectionHeading || 'Gesamter Artikel';
    return {
      code: issue.code,
      severity: issue.severity || 'warning',
      section,
      excerpt: issue.evidenceExcerpt || null,
      instruction: issue.repairInstruction || issue.message,
      verificationType: issue.verificationType || 'none',
      sourceRequired: issue.sourceRequired === true,
      blocking: issue.autoPublishBlocking === true || issue.blocking === true,
      anchor: `pruefung-${slugify(section, { lower: true, strict: true }) || index + 1}`
    };
  });
  const riskFlags = Object.entries(article.risk || {}).filter(([, value]) => value === true).map(([key]) => key);
  return {
    blocked: items.some((item) => item.blocking) || riskFlags.length > 0,
    items,
    riskFlags,
    sourceCount: Array.isArray(sources) ? sources.length : 0
  };
}
```

Deterministische Risiko-Flags ohne Modellfundstelle erzeugen einen allgemeinen blockierenden Eintrag. Die View escaped Abschnitt, Ausschnitt und Anweisung und rendert nur serverseitig erzeugte Anchor-IDs.

- [ ] **Step 5: Pipelinebericht persistieren und Tests ausführen**

Nach dem finalen Review bildet `draftPipeline.js` den Bericht und speichert ihn innerhalb von `quality_report_json`. Bestehende `issues` und `risks` bleiben für Kompatibilität erhalten.

Run: `node --test tests/contentAgentRiskReport.test.js tests/contentAgentDraftPipeline.test.js tests/contentAgentOpenAIService.test.js`  
Expected: PASS.

```bash
git add services/contentAgent/riskReportService.js services/contentAgent/articleSchemas.js services/contentAgent/prompts/articleReviewerPrompt.js services/contentAgent/draftPipeline.js views/admin/contentAgent/_riskChecklist.ejs tests/contentAgentRiskReport.test.js tests/contentAgentDraftPipeline.test.js tests/contentAgentOpenAIService.test.js
git commit -m "feat: pinpoint content review risks"
```

### Task 8: Sichere Entwurfsbearbeitung und echte Frontendvorschau

**Files:**
- Create: `services/contentAgent/adminDraftService.js`
- Create: `services/blogPostPresentationService.js`
- Create: `views/admin/contentAgent/draftEdit.ejs`
- Modify: `controllers/blogController.js`
- Modify: `views/blog/show.ejs`
- Modify: `controllers/adminContentAgentController.js`
- Test: `tests/contentAgentAdminDraftService.test.js`
- Test: `tests/contentAgentPreview.test.js`
- Modify: `tests/blogContentFormat.test.js`

**Interfaces:**
- Produces: `getDraftForReview(postId)`, `updateDraft({ postId, input, admin })`, `buildBlogPostPageModel(input)`.
- Preview: rendert dasselbe `views/blog/show.ejs` wie die öffentliche Seite mit `previewMode=true`, ohne Kommentare und mit `noindex`.

- [ ] **Step 1: Fehlschlagende Editor- und Vorschautests schreiben**

```js
test('Entwurfseditor speichert ausschließlich validiertes statisches HTML', async () => {
  await assert.rejects(
    service.updateDraft({ postId: 3, input: { contentHtml: '<script>alert(1)</script>' }, admin }),
    (error) => error.code === 'CONTENT_DRAFT_VALIDATION_FAILED'
  );
  assert.equal(db.updateCalls.length, 0);
});

test('Adminvorschau verwendet öffentliches Bloglayout ohne Kommentare', async () => {
  await controller.draftPreviewPage(req, res);
  assert.equal(res.headers['X-Robots-Tag'], 'noindex, nofollow');
  assert.equal(res.view, 'blog/show');
  assert.equal(res.locals.previewMode, true);
  assert.equal(res.locals.showComments, false);
});
```

- [ ] **Step 2: Tests ausführen und Fehler bestätigen**

Run: `node --test tests/contentAgentAdminDraftService.test.js tests/contentAgentPreview.test.js`  
Expected: FAIL mit fehlenden Modulen/Methoden.

- [ ] **Step 3: Entwurfseingaben streng normalisieren und validieren**

```js
export async function updateDraft({ postId, input, admin }, dependencies) {
  const current = await dependencies.repository.getDraftWithMetadata(postId);
  if (!current || current.post.content_format !== 'static_html' || current.post.published) {
    throw Object.assign(new Error('KI-Entwurf nicht gefunden.'), { code: 'CONTENT_DRAFT_NOT_FOUND' });
  }
  const faqJson = FaqItemSchema.array().min(5).max(7).parse(JSON.parse(String(input.faqJson || '[]')));
  const article = {
    title: String(input.title || '').trim(),
    shortDescription: String(input.shortDescription || '').trim(),
    slug: String(input.slug || '').trim(),
    metaTitle: String(input.metaTitle || '').trim(),
    metaDescription: String(input.metaDescription || '').trim(),
    ogTitle: String(input.ogTitle || '').trim(),
    ogDescription: String(input.ogDescription || '').trim(),
    contentHtml: String(input.contentHtml || ''),
    faqJson,
    imageAlt: String(input.imageAlt || '').trim()
  };
  const validation = dependencies.validateArticle(article, await dependencies.validationContext(postId));
  if (!validation.passed) {
    const error = new Error('Der Entwurf enthält ungültige Felder.');
    error.code = 'CONTENT_DRAFT_VALIDATION_FAILED';
    error.issues = validation.issues;
    throw error;
  }
  return dependencies.repository.updateDraftTransaction({
    postId, article: { ...article, contentHtml: validation.sanitizedHtml }, admin
  });
}
```

Post und `content_post_metadata` werden in einer Transaktion aktualisiert. Slugprüfung schließt den aktuellen Post aus. Speichern und Veröffentlichen bleiben getrennte Aktionen.

- [ ] **Step 4: Gemeinsames Blog-Viewmodel extrahieren**

`services/blogPostPresentationService.js` übernimmt die bisherige statische/Legacy-Renderingtrennung, FAQ-Normalisierung, Meta-/OG-/Canonical-/Structured-Data-Aufbereitung und liefert:

```js
return {
  title: pageTitle,
  description: metaDescription,
  post,
  renderedContent,
  seoExtra,
  ogImage: post.image_url,
  canonicalUrl,
  structuredDataBlocks,
  previewMode,
  showComments: previewMode !== true,
  riskReview: previewMode ? riskReview : null
};
```

`controllers/blogController.showPost()` und die Adminvorschau verwenden denselben Service. Legacy-EJS wird ausschließlich für öffentlich geladene `legacy_ejs`-Posts zugelassen; die Adminvorschau akzeptiert nur `static_html`.

- [ ] **Step 5: Öffentliches Template vorschausicher erweitern**

Am Anfang des `<main>` zeigt `views/blog/show.ejs` bei `previewMode` ein deutliches Banner mit Rücklink. `_riskChecklist.ejs` wird oberhalb des Artikelkörpers eingebunden. Kommentarbereich und Kommentar-JavaScript werden nur gerendert, wenn `showComments === true`.

`seoExtra` enthält im Vorschaumodus `<meta name="robots" content="noindex,nofollow">`; der Controller setzt zusätzlich `X-Robots-Tag`.

- [ ] **Step 6: Editorview anlegen, Tests ausführen und committen**

Der Editor enthält Titel, Kurzbeschreibung, Slug, Meta Title, Meta Description, OG-Titel, OG-Beschreibung, Bild-Alt-Text, FAQ-JSON und HTML. Meta-Zähler zeigen 60/160 Zeichen. Alle Formulare enthalten `_csrf`.

Run: `node --test tests/contentAgentAdminDraftService.test.js tests/contentAgentPreview.test.js tests/blogContentFormat.test.js`  
Expected: PASS.

```bash
git add services/contentAgent/adminDraftService.js services/blogPostPresentationService.js views/admin/contentAgent/draftEdit.ejs controllers/blogController.js views/blog/show.ejs controllers/adminContentAgentController.js tests/contentAgentAdminDraftService.test.js tests/contentAgentPreview.test.js tests/blogContentFormat.test.js
git commit -m "feat: edit and preview content drafts safely"
```

### Task 9: Gezielte Draft-Neugenerierung als wiederaufnehmbare Queuejobs

**Files:**
- Create: `services/contentAgent/draftRegenerationService.js`
- Modify: `scripts/contentWorker.js`
- Modify: `controllers/adminContentAgentController.js`
- Modify: `routes/adminContentAgentRoutes.js`
- Modify: `views/admin/contentAgent/draftEdit.ejs`
- Test: `tests/contentDraftRegenerationService.test.js`
- Modify: `tests/contentAgentWorker.test.js`
- Modify: `tests/contentAgentAdminRoutes.test.js`

**Interfaces:**
- Produces: `runDraftRegenerationJob({ claim, run, runtimeSnapshot }, dependencies)`.
- Supports: `regenerate_article`, `regenerate_metadata`, `regenerate_faq`, `regenerate_image`.
- Invariant: Derselbe Regenerationsjob verwendet denselben Run und dieselben Stufenergebnisse; der Post bleibt unveröffentlicht.

- [ ] **Step 1: Fehlschlagende Dispatch-, Review- und Idempotenztests schreiben**

```js
test('gezielte Regeneration unterstützt genau vier sichere Jobtypen', async () => {
  for (const jobType of ['regenerate_article', 'regenerate_metadata', 'regenerate_faq', 'regenerate_image']) {
    const result = await runDraftRegenerationJob({
      claim: { id: 7, job_type: jobType, payload_json: { post_id: 19, forced_mode: 'review' } },
      run: { id: 12, stage_results_json: {} },
      runtimeSnapshot: { operatingMode: 'review' }
    }, dependencies);
    assert.equal(result.post.published, false);
    assert.equal(result.post.workflow_status, 'needs_review');
  }
});

test('Bild-Retry verwendet persistierten Upload und erzeugt kein zweites Bild', async () => {
  dependencies.getPersistedStageResult.mockReturnValue({ imageUrl: 'https://example.test/existing.webp', publicId: 'blog_images/existing' });
  await runDraftRegenerationJob(input, dependencies);
  assert.equal(dependencies.imageService.generateAndUploadImage.calls.length, 0);
});
```

- [ ] **Step 2: Tests ausführen und fehlenden Service bestätigen**

Run: `node --test tests/contentDraftRegenerationService.test.js tests/contentAgentWorker.test.js`  
Expected: FAIL mit `ERR_MODULE_NOT_FOUND` beziehungsweise nicht unterstütztem Jobtyp.

- [ ] **Step 3: Regenerationsservice mit explizitem Dispatch implementieren**

```js
const REGENERATION_TYPES = new Set([
  'regenerate_article', 'regenerate_metadata', 'regenerate_faq', 'regenerate_image'
]);

export async function runDraftRegenerationJob({ claim, run, runtimeSnapshot }, dependencies) {
  if (!REGENERATION_TYPES.has(claim.job_type)) {
    throw Object.assign(new Error('Regenerationsjobtyp wird nicht unterstützt.'), { retryable: false });
  }
  const draft = await dependencies.draftRepository.getDraftWithMetadata(claim.payload_json.post_id);
  if (!draft || draft.post.published || draft.post.content_format !== 'static_html') {
    throw Object.assign(new Error('KI-Entwurf fehlt.'), { code: 'CONTENT_DRAFT_NOT_FOUND', retryable: false });
  }
  if (claim.job_type === 'regenerate_image') {
    return regenerateImage({ draft, run, runtimeSnapshot }, dependencies);
  }
  const repaired = await dependencies.repairDraft({
    draft,
    mode: claim.job_type,
    instruction: claim.payload_json.instruction || '',
    runId: run.id,
    runtimeSnapshot
  });
  const validation = await dependencies.validateDraft(repaired, draft.post.id);
  if (!validation.passed) {
    return { status: 'needs_manual_attention', code: 'regenerated_draft_invalid', post: draft.post };
  }
  const allowedFields = claim.job_type === 'regenerate_metadata'
    ? ['metaTitle', 'metaDescription', 'ogTitle', 'ogDescription', 'shortDescription']
    : claim.job_type === 'regenerate_faq'
      ? ['contentHtml', 'faqJson']
      : ['title', 'shortDescription', 'metaTitle', 'metaDescription', 'ogTitle', 'ogDescription', 'contentHtml', 'faqJson'];
  const updated = await dependencies.draftRepository.updateGeneratedFields({
    postId: draft.post.id, article: repaired, allowedFields,
    sanitizedHtml: validation.sanitizedHtml
  });
  return { status: 'completed', post: updated.post, metadata: updated.metadata };
}
```

`repairDraft` nutzt dieselben Budgetreservierungs-, Provider-Recovery- und `updateRunStage`-Mechanismen wie die Hauptpipeline. Stage-IDs enthalten Jobtyp und Post-ID, beispielsweise `regenerate_faq:19`, damit ein Retry kein zweites kostenpflichtiges Ergebnis erzeugt.

- [ ] **Step 4: Bildregeneration mit sicherem Cleanup implementieren**

`regenerateImage` prüft zuerst das persistierte Stufenergebnis. Fehlt es, wird genau ein Bild erzeugt, Kosten werden reserviert/settled und das Ergebnis gespeichert. Danach aktualisiert eine Transaktion `image_url`, `hero_public_id` und `image_alt`. Das alte Cloudinary-Bild wird erst nach erfolgreichem Commit gelöscht; bei unklarem Commit wird anhand der Post-ID abgeglichen.

- [ ] **Step 5: Worker, Controller und Routen vollständig anbinden**

`SUPPORTED_JOB_TYPES` erhält die vier Typen. `createProductionJobHandler()` dispatcht Generierungsjobs an `runDraftPipeline`, Auditjobs an `runExistingContentAuditJob` und Regenerationsjobs an `runDraftRegenerationJob`.

Controlleraktionen legen serverseitige Idempotenzschlüssel an:

```js
const idempotencyKey = `${jobType}:${postId}:${crypto.randomUUID()}`;
await jobRepository.enqueueJob({
  jobType,
  idempotencyKey,
  payload: { source: 'admin_regeneration', post_id: postId, forced_mode: 'review' },
  maxAttempts: runtime.maxAttempts
});
```

Zusätzliche Route:

```js
router.post('/admin/content-agent/drafts/:id/regenerate-metadata', isAdmin, verifyCsrfToken, controller.regenerateMetadataAction);
```

Die Editorview enthält getrennte CSRF-Formulare für Artikel, Meta-Daten, FAQ und Bild. Keine Aktion veröffentlicht.

- [ ] **Step 6: Tests ausführen und committen**

Run: `node --test tests/contentDraftRegenerationService.test.js tests/contentAgentWorker.test.js tests/contentAgentAdminRoutes.test.js`  
Expected: PASS.

```bash
git add services/contentAgent/draftRegenerationService.js scripts/contentWorker.js controllers/adminContentAgentController.js routes/adminContentAgentRoutes.js views/admin/contentAgent/draftEdit.ejs tests/contentDraftRegenerationService.test.js tests/contentAgentWorker.test.js tests/contentAgentAdminRoutes.test.js
git commit -m "feat: regenerate draft sections through queued jobs"
```

### Task 10: Atomare manuelle Veröffentlichung und genau acht echte Freigaben

**Files:**
- Create: `repositories/contentPublishEventRepository.js`
- Create: `services/contentAgent/contentPublicationService.js`
- Modify: `controllers/adminContentAgentController.js`
- Modify: `models/BlogPostModel.js`
- Test: `tests/contentPublicationService.test.js`
- Test: `tests/contentManualApprovalCounter.test.js`

**Interfaces:**
- Produces: `publishDraftManually({ postId, admin, confirmed }, dependencies)`, `rejectDraft({ postId, admin, reason }, dependencies)`, `publishDraftAutomatically(input, dependencies)`.
- Invariant: Nur das erste `decision='manual'`-Ereignis eines KI-Artikels erhöht `manual_approvals_count`.

- [ ] **Step 1: Fehlschlagende Publikations- und Doppelzählungstests schreiben**

```js
test('erste manuelle KI-Freigabe veröffentlicht und zählt atomar genau einmal', async () => {
  const first = await service.publishDraftManually({ postId: 9, admin, confirmed: true });
  assert.equal(first.post.published, true);
  assert.equal(first.settings.manual_approvals_count, 1);
  await assert.rejects(
    service.publishDraftManually({ postId: 9, admin, confirmed: true }),
    (error) => error.code === 'CONTENT_DRAFT_NOT_PUBLISHABLE'
  );
  assert.equal(await countManualEvents(9), 1);
});
```

- [ ] **Step 2: Test ausführen und Modulfehler bestätigen**

Run: `node --test tests/contentPublicationService.test.js tests/contentManualApprovalCounter.test.js`  
Expected: FAIL mit `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Persistierten Entwurf vor Veröffentlichung vollständig revalidieren**

```js
function assertPublishable({ post, metadata, validation }) {
  if (!post || post.published || post.workflow_status !== 'needs_review' || !post.generated_by_ai) {
    throw Object.assign(new Error('Entwurf ist nicht veröffentlichbar.'), { code: 'CONTENT_DRAFT_NOT_PUBLISHABLE' });
  }
  if (!validation.passed || !post.image_url || !post.image_alt || Number(metadata.quality_score) < 80) {
    throw Object.assign(new Error('Qualitätsprüfung nicht bestanden.'), { code: 'CONTENT_DRAFT_VALIDATION_FAILED' });
  }
}
```

- [ ] **Step 4: Manuelle Veröffentlichung in einer Transaktion implementieren**

```js
export async function publishDraftManually({ postId, admin, confirmed }, dependencies) {
  if (confirmed !== true) throw Object.assign(new Error('Bestätigung fehlt.'), { code: 'CONTENT_CONFIRMATION_REQUIRED' });
  const client = await dependencies.db.connect();
  try {
    await client.query('BEGIN');
    const draft = await dependencies.repository.getDraftWithMetadataForUpdate(postId, client);
    const validation = await dependencies.validatePersistedDraft(draft, client);
    assertPublishable({ ...draft, validation });
    const { rows: postRows } = await client.query(`
      UPDATE posts SET published = TRUE, workflow_status = 'published',
        published_at = NOW(), reviewed_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND published = FALSE AND workflow_status = 'needs_review'
      RETURNING *
    `, [postId]);
    if (!postRows[0]) throw Object.assign(new Error('Statuskonflikt.'), { code: 'CONTENT_DRAFT_NOT_PUBLISHABLE' });
    const { rows: eventRows } = await client.query(`
      INSERT INTO content_publish_events
        (post_id, run_id, decision, policy_version, quality_score, reasons_json, context_json, admin_id, admin_username)
      VALUES ($1, $2, 'manual', 'manual-v1', $3, '[]'::jsonb, '{}'::jsonb, $4, $5)
      ON CONFLICT (post_id) WHERE decision = 'manual' DO NOTHING
      RETURNING *
    `, [postId, draft.post.generation_run_id, draft.metadata.quality_score, admin.id, admin.username]);
    if (eventRows[0]) {
      await client.query(`UPDATE content_agent_settings SET manual_approvals_count = manual_approvals_count + 1, updated_at = NOW() WHERE id = 1`);
    }
    const settings = await client.query('SELECT * FROM content_agent_settings WHERE id = 1');
    await client.query('COMMIT');
    return { post: postRows[0], settings: settings.rows[0] };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
```

Die Admin-ID wird in den neuen Eventfeldern gespeichert; das inkompatible alte `posts.reviewed_by -> users` bleibt unbenutzt.

- [ ] **Step 5: Ablehnung und Controllerstatus implementieren**

Ablehnung setzt ausschließlich `workflow_status='rejected'`, `published=false` und speichert den bereinigten Grund im Eventkontext. Controller antworten mit 400 bei Validierung, 404 bei fehlendem Entwurf und 409 bei Zustandskonflikt.

- [ ] **Step 6: Tests ausführen und committen**

Run: `node --test tests/contentPublicationService.test.js tests/contentManualApprovalCounter.test.js tests/blogAdminWorkflow.test.js`  
Expected: PASS.

```bash
git add repositories/contentPublishEventRepository.js services/contentAgent/contentPublicationService.js controllers/adminContentAgentController.js models/BlogPostModel.js tests/contentPublicationService.test.js tests/contentManualApprovalCounter.test.js tests/blogAdminWorkflow.test.js
git commit -m "feat: publish ai drafts with manual approval audit"
```

### Task 11: Konservative Auto-Publish-Policy und Pipeline-Fallback auf Review

**Files:**
- Create: `services/contentAgent/autoPublishPolicy.js`
- Modify: `services/contentAgent/draftPipeline.js`
- Modify: `scripts/contentWorker.js`
- Test: `tests/contentAutoPublishPolicy.test.js`
- Test: `tests/contentAutoPublishPipeline.test.js`
- Modify: `tests/contentAgentDraftPipeline.test.js`

**Interfaces:**
- Produces: `evaluateAutoPublish({ snapshot, post, metadata, validation, riskReport })`.
- Consumes: `publishDraftAutomatically` und `recordPublishEvent`.
- Result: `{ allowed, policyVersion:'auto-v1', reasons:string[] }`.

- [ ] **Step 1: Vollständige fehlschlagende Policy-Matrix schreiben**

```js
const safe = {
  snapshot: { operatingMode: 'auto_publish', autoPublishEffective: true, manualApprovalsCount: 8, autoPublishMinScore: 90 },
  post: { image_url: 'https://example.test/image.webp', image_alt: 'Alt', published: false },
  metadata: { quality_score: 92, source_references_json: [] },
  validation: { passed: true, issues: [] },
  riskReport: { blocked: false, items: [], riskFlags: [] }
};

test('Policy erlaubt ausschließlich vollständig sichere Artikel', () => {
  assert.equal(evaluateAutoPublish(safe).allowed, true);
  assert.equal(evaluateAutoPublish({ ...safe, snapshot: { ...safe.snapshot, manualApprovalsCount: 7 } }).allowed, false);
  assert.equal(evaluateAutoPublish({ ...safe, metadata: { ...safe.metadata, quality_score: 89 } }).allowed, false);
  assert.equal(evaluateAutoPublish({ ...safe, riskReport: { ...safe.riskReport, blocked: true } }).allowed, false);
  assert.equal(evaluateAutoPublish({ ...safe, post: { ...safe.post, image_alt: '' } }).allowed, false);
});
```

- [ ] **Step 2: Test ausführen und Modulfehler bestätigen**

Run: `node --test tests/contentAutoPublishPolicy.test.js tests/contentAutoPublishPipeline.test.js`  
Expected: FAIL mit `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Reine Policy mit stabilen Reason-Codes implementieren**

```js
export const AUTO_PUBLISH_POLICY_VERSION = 'auto-v1';

export function evaluateAutoPublish({ snapshot, post, metadata, validation, riskReport }) {
  const reasons = [];
  if (snapshot?.operatingMode !== 'auto_publish') reasons.push('mode_review');
  if (snapshot?.autoPublishEffective !== true) reasons.push('technical_gate_disabled');
  if (Number(snapshot?.manualApprovalsCount) < 8) reasons.push('manual_approvals_too_low');
  if (Number(metadata?.quality_score) < Math.max(90, Number(snapshot?.autoPublishMinScore) || 90)) reasons.push('quality_score_too_low');
  if (validation?.passed !== true || validation?.issues?.length) reasons.push('validation_failed');
  if (riskReport?.blocked || riskReport?.riskFlags?.length) reasons.push('risk_review_required');
  if (!post?.image_url || !post?.image_alt) reasons.push('image_incomplete');
  return { allowed: reasons.length === 0, policyVersion: AUTO_PUBLISH_POLICY_VERSION, reasons };
}
```

Jeder einzelne Risiko-Flag (`currentClaims`, `legalClaims`, `privacyClaims`, `softwareVersionClaims`, `staticPrices`) erhält einen eigenen Test. Quellenpflicht ohne zwei bis sechs validierte Quellen, unbekannte Links, FAQ-/Metafehler und ungelöste Reviewissues blockieren ebenfalls.

- [ ] **Step 4: Pipeline nach `draft_creation` integrieren**

```js
const decision = evaluateAutoPublish({
  snapshot: input.runtimeSnapshot,
  post: draft.post,
  metadata: draft.metadata,
  validation,
  riskReport: focusedRiskReport
});
await publicationService.recordDecision({
  postId: draft.post.id, runId, qualityScore: draft.metadata.quality_score,
  decision: decision.allowed ? 'allowed' : 'blocked',
  policyVersion: decision.policyVersion, reasons: decision.reasons
});
if (decision.allowed && input.runtimeSnapshot?.operatingMode !== 'review') {
  draft.post = await publicationService.publishDraftAutomatically({ postId: draft.post.id, runId });
}
```

Bei `forced_mode=review` bleibt der Draft unveröffentlicht. Eine blockierte Entscheidung beendet den Job erfolgreich mit `reviewRequired:true`; sie ist kein technischer Fehler.

- [ ] **Step 5: Tests ausführen und committen**

Run: `node --test tests/contentAutoPublishPolicy.test.js tests/contentAutoPublishPipeline.test.js tests/contentAgentDraftPipeline.test.js`  
Expected: PASS.

```bash
git add services/contentAgent/autoPublishPolicy.js services/contentAgent/draftPipeline.js scripts/contentWorker.js tests/contentAutoPublishPolicy.test.js tests/contentAutoPublishPipeline.test.js tests/contentAgentDraftPipeline.test.js
git commit -m "feat: auto publish only policy-approved articles"
```

### Task 12: Bestandsaudit und revisionsbasierte Überarbeitung ohne Live-Überschreiben

**Files:**
- Create: `repositories/contentAuditRepository.js`
- Create: `repositories/contentRevisionRepository.js`
- Create: `services/contentAgent/legacyAuditService.js`
- Create: `services/contentAgent/contentRevisionService.js`
- Create: `views/admin/contentAgent/revisionEdit.ejs`
- Modify: `scripts/contentWorker.js`
- Modify: `controllers/adminContentAgentController.js`
- Test: `tests/contentLegacyAudit.test.js`
- Test: `tests/contentRevisionService.test.js`
- Modify: `tests/contentAgentWorker.test.js`

**Interfaces:**
- Produces: `auditExistingPost({ post, inventory, currentYear })`, `runExistingContentAuditJob(input, dependencies)`, `createRevisionFromAudit(input, dependencies)`, `updateRevision(input, dependencies)`, `approveRevision(input, dependencies)`.
- Invariant: Audit und Revision verändern den veröffentlichten Post erst bei explizitem `approveRevision`.

- [ ] **Step 1: Fehlschlagende Audit- und Revisionssicherheitstests schreiben**

```js
test('Bestandsaudit erkennt technische und zeitbezogene Befunde', () => {
  const result = auditExistingPost({
    post: {
      id: 4, title: 'Alter Artikel', content: '<h1>Alt</h1><p>Preise 2024: 999 Euro</p>',
      meta_title: null, meta_description: '', image_alt: '', faq_json: []
    },
    inventory: { blogPosts: [{ id: 5, title: 'Alter Artikel Berlin' }] },
    currentYear: 2026
  });
  assert.deepEqual(new Set(result.findings.map((item) => item.code)), new Set([
    'duplicate_h1', 'stale_year', 'static_price', 'missing_meta_title',
    'missing_meta_description', 'missing_image_alt', 'missing_faq', 'cannibalization_risk'
  ]));
});

test('Revisionserstellung kopiert nur in Revision und lässt Livepost unverändert', async () => {
  const revision = await service.createRevisionFromAudit({ postId: 4, auditId: 8, admin });
  assert.equal(revision.status, 'draft');
  assert.equal(db.postUpdateCalls.length, 0);
});
```

- [ ] **Step 2: Tests ausführen und Modulfehler bestätigen**

Run: `node --test tests/contentLegacyAudit.test.js tests/contentRevisionService.test.js`  
Expected: FAIL mit `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Deterministischen Bestandsaudit implementieren**

```js
export function auditExistingPost({ post, inventory, currentYear }) {
  const html = String(post.content || '');
  const findings = [];
  const add = (code, priority, message, action) => findings.push({ code, priority, message, action });
  if (/<h1\b/i.test(html)) add('duplicate_h1', 'high', 'Artikelinhalt enthält eine zusätzliche H1.', 'H1 im Inhalt in H2 ändern.');
  if (!post.meta_title) add('missing_meta_title', 'high', 'Meta Title fehlt.', 'Meta Title ergänzen.');
  if (!post.meta_description) add('missing_meta_description', 'high', 'Meta Description fehlt.', 'Meta Description ergänzen.');
  if (!post.image_alt) add('missing_image_alt', 'medium', 'Bild-Alt-Text fehlt.', 'Beschreibenden Alt-Text ergänzen.');
  if (!Array.isArray(post.faq_json) || post.faq_json.length < 5) add('missing_faq', 'medium', 'FAQ sind unvollständig.', 'Fünf bis sieben echte Fragen ergänzen.');
  if (new RegExp(`\\b(?:19|20)\\d{2}\\b`).test(html)) {
    const years = [...html.matchAll(/\b(?:19|20)\d{2}\b/g)].map(([year]) => Number(year));
    if (years.some((year) => year < currentYear)) add('stale_year', 'high', 'Artikel enthält ältere Jahresangaben.', 'Jahresangaben fachlich prüfen.');
  }
  if (/\b\d[\d.,\s]*(?:Euro|EUR|€)\b/i.test(html)) add('static_price', 'critical', 'Statischer Preis gefunden.', 'Preis entfernen oder zentralen Pricing-Token verwenden.');
  if (!/href=["']\/kontakt["']/i.test(html)) add('missing_contact_cta', 'medium', 'Kontakt-CTA fehlt.', 'Passenden Kontakt-CTA ergänzen.');
  const inventoryWithoutSelf = (inventory.blogPosts || []).filter((entry) => Number(entry.id) !== Number(post.id));
  const cannibalizationRisk = calculateCannibalizationRisk({
    title: post.title,
    slug: post.slug,
    primary_keyword: post.primary_keyword,
    content_cluster: post.content_cluster
  }, inventoryWithoutSelf);
  if (cannibalizationRisk >= 6) add('cannibalization_risk', 'high', 'Ähnlicher bestehender Artikel gefunden.', 'Suchintentionen und interne Links abgrenzen.');
  const score = Math.max(0, 100 - findings.reduce((sum, item) => sum + ({ critical: 25, high: 15, medium: 8, low: 3 }[item.priority]), 0));
  return { score, findings, recommendedActions: findings.map((item) => item.action) };
}
```

- [ ] **Step 4: Auditjob im Worker dispatchen und Ergebnisse historisieren**

`SUPPORTED_JOB_TYPES` erhält `audit_existing_posts`. Der Handler lädt veröffentlichte Posts, erzeugt für jeden Post ein Auditresultat und speichert über:

```js
await auditRepository.createAudit({
  postId: post.id, jobId: claim.id, runId: run.id,
  auditType: 'structural_content_v1', score: result.score,
  findings: result.findings, recommendedActions: result.recommendedActions
});
```

Der Auditjob verwendet keine externen APIs und verändert keine Posts.

- [ ] **Step 5: Revisionen als sichere Snapshots implementieren**

```js
const REVISION_FIELDS = [
  'title', 'excerpt', 'content', 'meta_title', 'meta_description',
  'og_title', 'og_description', 'faq_json', 'image_url', 'image_alt'
];

export async function createRevisionFromAudit({ postId, auditId, admin }, dependencies) {
  const post = await dependencies.repository.getPublishedPost(postId);
  if (!post) throw Object.assign(new Error('Veröffentlichter Artikel fehlt.'), { code: 'CONTENT_POST_NOT_FOUND' });
  const snapshot = Object.fromEntries(REVISION_FIELDS.map((field) => [field, post[field]]));
  return dependencies.revisionRepository.create({ postId, auditId, snapshot, admin });
}
```

`updateRevision` validiert das Snapshot-HTML entsprechend dem Contentformat. Slugänderungen veröffentlichter Posts sind in dieser Ausbaustufe nicht erlaubt. `approveRevision` sperrt Post und Revision, aktualisiert nur die Allowlist, setzt Revision auf `approved` und Audit auf `resolved` – alles in einer Transaktion.

- [ ] **Step 6: Bestands- und Revisionsviews anbinden**

`existingContent.ejs` zeigt letzten Audit, Score, Befunde und `Überarbeitung als Entwurf erstellen`. `revisionEdit.ejs` zeigt deutlich, dass der Liveartikel unverändert bleibt, und bietet getrennt `Speichern` und `Revision veröffentlichen`; beide POST-Formulare enthalten CSRF und Bestätigung.

- [ ] **Step 7: Tests ausführen und committen**

Run: `node --test tests/contentLegacyAudit.test.js tests/contentRevisionService.test.js tests/contentAgentWorker.test.js`  
Expected: PASS.

```bash
git add repositories/contentAuditRepository.js repositories/contentRevisionRepository.js services/contentAgent/legacyAuditService.js services/contentAgent/contentRevisionService.js views/admin/contentAgent/revisionEdit.ejs scripts/contentWorker.js controllers/adminContentAgentController.js tests/contentLegacyAudit.test.js tests/contentRevisionService.test.js tests/contentAgentWorker.test.js
git commit -m "feat: audit existing posts through safe revisions"
```

### Task 13: Exakte IONOS-VPS-, `.env`-, Compose- und Deploy-Anleitung

**Files:**
- Modify: `docs/deployment/content-agent-ionos-vps.md`
- Modify: `tests/contentAgentDeploymentGuide.test.js`

**Interfaces:**
- Produces: Copy-and-Paste-Anleitung für `/apps/komplettwebdesign` mit manuell gepflegter `.env`, `docker-compose.yml` und `deploy/deploy.sh`.
- Constraint: Kein zusätzlicher Container; vorhandene Dienste und Traefik-Konfiguration bleiben bestehen.

- [ ] **Step 1: Fehlschlagenden Dokumentationsvertrag auf neue Betriebsweise umstellen**

```js
test('VPS-Anleitung verwendet echten Pfad und DB-gesteuerten Zeitplan', () => {
  assert.match(guide, /\/apps\/komplettwebdesign/);
  assert.match(guide, /Montag und Donnerstag um 18:00 Uhr/);
  assert.match(guide, /PostgreSQL.*Betriebswerte/is);
  assert.match(guide, /CONTENT_AGENT_AUTOPUBLISH_ENABLED=false/);
  assert.match(guide, /docker compose .*force-recreate.*app content-worker/);
  assert.doesNotMatch(guide, /CONTENT_AGENT_SCHEDULE=0 9 \* \* 1/);
});
```

- [ ] **Step 2: Test ausführen und veraltete Dokumentation bestätigen**

Run: `node --test tests/contentAgentDeploymentGuide.test.js`  
Expected: FAIL wegen altem Pfad beziehungsweise altem Montag-09:00-Cron.

- [ ] **Step 3: `.env`-Abschnitt exakt aktualisieren**

Die Anleitung enthält diesen technischen Block und erklärt jede Rolle:

```dotenv
CONTENT_AGENT_ENABLED=true
CONTENT_AGENT_AUTOPUBLISH_ENABLED=false
CONTENT_AGENT_MAX_TOPIC_CANDIDATES=8
CONTENT_AGENT_MAX_REVISIONS=2
CONTENT_AGENT_MAX_ATTEMPTS=5
CONTENT_AGENT_MONTHLY_COST_LIMIT_EUR=100
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
```

API-, Cloudinary-, PostgreSQL- und Session-Secrets werden nur namentlich, niemals mit Beispielwerten ausgegeben. `PUBLISH_MODE`, `SCHEDULE` und `TIMEZONE` werden als veraltete Bootstrap-Fallbacks gekennzeichnet; spätere Änderungen erfolgen im Dashboard.

- [ ] **Step 4: Compose-Anleitung bestätigen und nicht erweitern**

Der bestehende `content-worker` bleibt:

```yaml
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
```

Kein Port, `expose`, Traefik-Label oder Proxy-Netzwerk wird ergänzt.

- [ ] **Step 5: Exakten `deploy.sh`-Block dokumentieren**

Nach `git reset --hard origin/main` verwendet die Anleitung:

```bash
cd "$ROOT"
echo "[deploy] 🛠️ Gemeinsames App-Image bauen …"
docker compose -f "$COMPOSE_FILE" build --no-cache app

echo "[deploy] 🗄️ Content-Agent-Migration ausführen …"
docker compose -f "$COMPOSE_FILE" run --rm --no-deps app npm run migrate:content-agent

echo "[deploy] 🚀 App und Worker mit demselben Image neu erstellen …"
docker compose -f "$COMPOSE_FILE" up -d --no-deps --force-recreate app content-worker

echo "[deploy] 🔎 Versionen und Workerstatus prüfen …"
docker compose -f "$COMPOSE_FILE" exec -T app node -v
docker compose -f "$COMPOSE_FILE" exec -T content-worker npm run content-agent:healthcheck
```

Vor dem Recreate muss der Guide zeigen, wie ein laufender Job erkannt und kontrolliert beendet wird. Migrationstestdatenbank, Produktionsbackup, zweimalige Migrationsprüfung, Review-Rollout und Rückfall bleiben erhalten.

- [ ] **Step 6: Tests ausführen und committen**

Run: `node --test tests/contentAgentDeploymentGuide.test.js`  
Expected: PASS.

```bash
git add docs/deployment/content-agent-ionos-vps.md tests/contentAgentDeploymentGuide.test.js
git commit -m "docs: deploy content agent dashboard on ionos"
```

### Task 14: Vollständige Regression, echte PostgreSQL-Integration und Abnahme

**Files:**
- Modify only if a verified failure requires it: files from Tasks 1–13.
- Test: all `tests/*.test.js`.

**Interfaces:**
- Produces: vollständig verifizierte, nicht gepushte Implementierung und exakte Abnahmebefunde.

- [ ] **Step 1: Fokussierte neue Suite ausführen**

Run:

```bash
node --test \
  tests/contentAgentAdminDashboardMigration.test.js \
  tests/contentAgentSettingsRepository.test.js \
  tests/contentAgentRuntimeConfig.test.js \
  tests/contentAgentScheduler.test.js \
  tests/contentAgentRunSnapshot.test.js \
  tests/contentAgentAdminRepository.test.js \
  tests/contentAgentAdminPresentation.test.js \
  tests/contentProviderStateRepository.test.js \
  tests/contentAgentAdminRoutes.test.js \
  tests/contentAgentAdminController.test.js \
  tests/contentAgentAdminViews.test.js \
  tests/contentAgentRiskReport.test.js \
  tests/contentAgentAdminDraftService.test.js \
  tests/contentAgentPreview.test.js \
  tests/contentDraftRegenerationService.test.js \
  tests/contentPublicationService.test.js \
  tests/contentManualApprovalCounter.test.js \
  tests/contentAutoPublishPolicy.test.js \
  tests/contentAutoPublishPipeline.test.js \
  tests/contentLegacyAudit.test.js \
  tests/contentRevisionService.test.js \
  tests/contentAgentDeploymentGuide.test.js
```

Expected: alle Tests PASS.

- [ ] **Step 2: Gesamte Regression und Build ausführen**

Run: `OPENAI_API_KEY=test-key npm test`  
Expected: alle nicht opt-in Tests PASS; echter PostgreSQL-Test darf ohne Variablen nur SKIP sein.

Run: `npm run build`  
Expected: PASS.

- [ ] **Step 3: Dry-Run ohne externe Aufrufe ausführen**

Run: `OPENAI_API_KEY=test-key npm run content-agent:dry-run`  
Expected: JSON mit `"externalCalls":0`, gültigem Artikel und unveröffentlichtem Ergebnis.

- [ ] **Step 4: Echten PostgreSQL-Integrationstest ausführen**

Nur gegen eine ausdrücklich zurücksetzbare Testdatenbank:

```bash
CONTENT_AGENT_PG_TEST_URL="$CONTENT_AGENT_PG_TEST_URL" \
CONTENT_AGENT_PG_TEST_ALLOW_RESET=true \
node --test tests/contentAgentPostgresIntegration.test.js
```

Expected: PASS. Wenn keine freigegebene Testdatenbank verfügbar ist, bleibt der Test als SKIP dokumentiert und wird auf dem VPS vor Produktionsmigration entsprechend der Deploymentanleitung ausgeführt.

- [ ] **Step 5: Sicherheits- und Placeholder-Scan ausführen**

Run:

```bash
rg -n "TODO|TBD|sk-[A-Za-z0-9]|api_key\s*[:=]\s*['\"][^'\"]+|postgres(?:ql)?://[^[:space:]]+:[^[:space:]@]+@" \
  controllers routes repositories services scripts views docs/deployment tests
```

Expected: keine neu eingeführten Platzhalter oder Geheimnisse; bekannte Test-Fixtures sind ausdrücklich redigiert.

- [ ] **Step 6: Abnahmekriterien gegen die Spezifikation prüfen**

Manuell im lokalen Adminbereich verifizieren:

1. eigener Content-Agent-Hauptreiter und fünf Unterreiter,
2. Montag/Donnerstag 18:00 und Review als sichere Datenbankwerte,
3. technische Werte nur lesbar,
4. „Jetzt Entwurf erstellen“ erzeugt `forced_mode=review`,
5. Vorschau entspricht dem öffentlichen Bloglayout, ist adminexklusiv und `noindex`,
6. Risikobox springt zu konkreten Prüfstellen,
7. gleicher fehlgeschlagener Job wird fortgesetzt,
8. manuelle Freigabe zählt genau einmal,
9. Auto-Publishing bleibt vor acht Freigaben, unter Score 90 und bei jedem Risiko blockiert,
10. Bestandsaudit verändert keinen Liveartikel.

- [ ] **Step 7: Abschließenden Implementierungscommit erstellen**

Nur falls Step 1–6 notwendige kleine Integrationskorrekturen erzeugten:

```bash
git add -A
git commit -m "test: verify content agent admin dashboard"
```

Wenn der Arbeitsbaum bereits sauber ist, keinen leeren Commit erzeugen.

## Spec Coverage Review

| Spezifikationsbereich | Implementierungsaufgaben |
|---|---|
| Konfigurationshierarchie und PostgreSQL-Wahrheit | Tasks 1–3 |
| Dashboard-Übersicht, fünf Unterreiter und Technikansicht | Tasks 4–6 |
| Zeitplan Montag/Donnerstag 18:00, frei änderbar, DST und Idempotenz | Task 3 |
| Manuelle Erstellung immer als Review-Entwurf | Tasks 5 und 9 |
| Jobfortsetzung ohne Duplikate | Tasks 3, 5 und 9 |
| Frontendnahe, adminexklusive Noindex-Vorschau | Task 8 |
| Meta-, FAQ-, HTML- und Bildbearbeitung | Tasks 8 und 9 |
| Konkrete Risikoprüfstellen | Task 7 |
| Acht manuelle Freigaben und Score 90 | Tasks 10 und 11 |
| Risiko-Fallback statt Jobfehler | Task 11 |
| Bestandsaudit und Revision ohne Live-Überschreiben | Task 12 |
| CSRF, Legacy-Bypass und Admin-Akteure | Tasks 1, 5, 8 und 10 |
| Provider-/Workerstatus ohne kostenpflichtige Probes | Task 4 |
| Exakte VPS-/Compose-/`.env`-/Deploy-Anleitung | Task 13 |
| Vollständige Tests, Build, Dry-Run und PostgreSQL-Abnahme | Task 14 |

Die Selbstprüfung ergab keine unzugeordnete fachliche Anforderung. Search Console, Leistungsdatenoptimierung, ein separater Publikationskalender und `.env`-Bearbeitung bleiben gemäß Spezifikation außerhalb dieses Plans.
