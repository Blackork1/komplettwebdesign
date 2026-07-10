# Content-Agent kontrolliertes Auto-Publishing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nach mindestens acht manuell freigegebenen KI-Artikeln ausschließlich risikoarme Beiträge mit Qualitätswert 90 oder höher automatisch veröffentlichen und jede Entscheidung revisionssicher protokollieren.

**Architecture:** Eine reine Policy-Funktion bewertet Post, Metadaten, Risikoflags, Umgebungsfreigabe und Datenbankeinstellung. Nur ein positives Ergebnis darf den vorhandenen Publikationsservice aufrufen. Der Worker protokolliert auch abgelehnte Auto-Publishing-Entscheidungen; der Umgebungsvariablen-Schalter bleibt der technische Not-Aus.

**Tech Stack:** Node.js 20, PostgreSQL 16, Express 5, EJS, node:test, Content-Agent-Pläne A bis C.

## Global Constraints

- Pläne A bis C sind implementiert und vollständig getestet.
- Standardwert von `CONTENT_AGENT_AUTOPUBLISH_ENABLED` bleibt `false`.
- Datenbankeinstellung und Umgebungsvariable müssen gleichzeitig aktiv sein.
- Mindestens acht KI-Entwürfe müssen zuvor manuell veröffentlicht worden sein.
- Qualitätswert muss mindestens 90 sein.
- Aktuelle, rechtliche, datenschutzbezogene, softwareversionsbezogene oder statisch bepreiste Inhalte bleiben manuell.
- Fehlende Quellen, Bilder oder gültige interne Links blockieren Auto-Publishing.
- Jede Entscheidung wird mit Policyversion und Gründen gespeichert.
- Jeder Task beginnt mit einem fehlschlagenden Test und endet mit einem Commit.

---

### Task 1: Entscheidungsprotokoll in PostgreSQL

**Files:**
- Create: `scripts/migrations/005_create_content_publish_events.sql`
- Create: `scripts/runContentPublishEventsMigration.js`
- Modify: `package.json`
- Test: `tests/contentPublishEventsMigration.test.js`

**Interfaces:**
- Produces: `content_publish_events`.

- [ ] **Step 1: Fehlschlagenden Migrationstest schreiben**

~~~js
assert.match(sql, /CREATE TABLE IF NOT EXISTS content_publish_events/i);
assert.match(sql, /policy_version VARCHAR\(40\) NOT NULL/i);
assert.match(sql, /decision VARCHAR\(24\) NOT NULL/i);
assert.match(sql, /reasons_json JSONB NOT NULL/i);
~~~

- [ ] **Step 2: Test ausführen**

Run: `node --test tests/contentPublishEventsMigration.test.js`  
Expected: FAIL mit `ENOENT`.

- [ ] **Step 3: Migration implementieren**

~~~sql
CREATE TABLE IF NOT EXISTS content_publish_events (
  id BIGSERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  run_id BIGINT REFERENCES content_runs(id) ON DELETE SET NULL,
  decision VARCHAR(24) NOT NULL,
  policy_version VARCHAR(40) NOT NULL,
  quality_score INTEGER NOT NULL,
  reasons_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  context_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (decision IN ('allowed', 'blocked', 'manual'))
);
CREATE INDEX IF NOT EXISTS idx_content_publish_events_post
  ON content_publish_events (post_id, created_at DESC);
~~~

- [ ] **Step 4: Runner und npm-Skript ergänzen**

~~~json
"migrate:content-autopublish": "node scripts/runContentPublishEventsMigration.js"
~~~

- [ ] **Step 5: Tests und Commit**

Run: `node --test tests/contentPublishEventsMigration.test.js && npm test`  
Expected: alle Tests PASS.

~~~bash
git add scripts/migrations/005_create_content_publish_events.sql scripts/runContentPublishEventsMigration.js package.json tests/contentPublishEventsMigration.test.js
git commit -m "feat: log automatic publishing decisions"
~~~

### Task 2: Reine Auto-Publishing-Policy

**Files:**
- Create: `services/contentAgent/autoPublishPolicy.js`
- Test: `tests/autoPublishPolicy.test.js`

**Interfaces:**
- Produces: `evaluateAutoPublishEligibility(input)` mit `{ allowed, reasons, policyVersion }`.

- [ ] **Step 1: Fehlschlagende Policytests schreiben**

Matrix:

1. Umgebungsvariable aus → blockiert.
2. Datenbankschalter aus → blockiert.
3. sieben manuelle Freigaben → blockiert.
4. Score 89 → blockiert.
5. aktueller KI- oder Googlebezug → blockiert.
6. statische Preise → blockiert.
7. fehlendes Bild → blockiert.
8. sichere Daten mit Score 94 → erlaubt.

- [ ] **Step 2: Test ausführen**

Run: `node --test tests/autoPublishPolicy.test.js`  
Expected: FAIL.

- [ ] **Step 3: Policycodes implementieren**

~~~js
export const AUTO_PUBLISH_POLICY_VERSION = '2026-07-10.1';

export const AUTO_PUBLISH_REASONS = Object.freeze({
  ENV_DISABLED: 'env_disabled',
  DB_DISABLED: 'db_disabled',
  APPROVALS_TOO_LOW: 'manual_approvals_too_low',
  STATUS_INVALID: 'status_invalid',
  QUALITY_TOO_LOW: 'quality_too_low',
  CURRENT_CLAIMS: 'current_claims',
  LEGAL_CLAIMS: 'legal_claims',
  PRIVACY_CLAIMS: 'privacy_claims',
  SOFTWARE_VERSION_CLAIMS: 'software_version_claims',
  STATIC_PRICES: 'static_prices',
  CANNIBALIZATION: 'cannibalization_risk',
  SOURCES_INVALID: 'sources_invalid',
  IMAGE_INVALID: 'image_invalid',
  LINKS_INVALID: 'links_invalid',
  VALIDATION_FAILED: 'validation_failed'
});
~~~

- [ ] **Step 4: Policy implementieren**

~~~js
export function evaluateAutoPublishEligibility({
  envEnabled,
  settings,
  post,
  metadata
}) {
  const reasons = [];
  const risk = metadata.quality_report_json?.risk || {};
  const checks = metadata.quality_report_json?.checks || {};

  if (!envEnabled) reasons.push(AUTO_PUBLISH_REASONS.ENV_DISABLED);
  if (!settings.auto_publish_enabled) reasons.push(AUTO_PUBLISH_REASONS.DB_DISABLED);
  if (settings.manual_approvals_count < 8) reasons.push(AUTO_PUBLISH_REASONS.APPROVALS_TOO_LOW);
  if (post.workflow_status !== 'needs_review' || post.published) reasons.push(AUTO_PUBLISH_REASONS.STATUS_INVALID);
  if (metadata.quality_score < Math.max(90, settings.auto_publish_min_score)) reasons.push(AUTO_PUBLISH_REASONS.QUALITY_TOO_LOW);
  if (risk.currentClaims) reasons.push(AUTO_PUBLISH_REASONS.CURRENT_CLAIMS);
  if (risk.legalClaims) reasons.push(AUTO_PUBLISH_REASONS.LEGAL_CLAIMS);
  if (risk.privacyClaims) reasons.push(AUTO_PUBLISH_REASONS.PRIVACY_CLAIMS);
  if (risk.softwareVersionClaims) reasons.push(AUTO_PUBLISH_REASONS.SOFTWARE_VERSION_CLAIMS);
  if (risk.staticPrices) reasons.push(AUTO_PUBLISH_REASONS.STATIC_PRICES);
  if (Number(metadata.quality_report_json?.cannibalizationRisk || 0) > 4) reasons.push(AUTO_PUBLISH_REASONS.CANNIBALIZATION);
  if (checks.sourcesValid !== true) reasons.push(AUTO_PUBLISH_REASONS.SOURCES_INVALID);
  if (!post.image_url || !post.image_alt) reasons.push(AUTO_PUBLISH_REASONS.IMAGE_INVALID);
  if (checks.internalLinksValid !== true) reasons.push(AUTO_PUBLISH_REASONS.LINKS_INVALID);
  if (checks.deterministicValidationPassed !== true) reasons.push(AUTO_PUBLISH_REASONS.VALIDATION_FAILED);

  return {
    allowed: reasons.length === 0,
    reasons,
    policyVersion: AUTO_PUBLISH_POLICY_VERSION
  };
}
~~~

`checks.sourcesValid` ist `true`, wenn das Briefing keine aktuellen Quellen verlangt oder wenn mindestens zwei validierte Primärquellen gespeichert sind. Der Wert darf nicht aus `qualitySelfCheck` des Writer-Modells übernommen werden, sondern wird serverseitig berechnet.

- [ ] **Step 5: Tests und Commit**

Run: `node --test tests/autoPublishPolicy.test.js`  
Expected: gesamte Matrix PASS.

~~~bash
git add services/contentAgent/autoPublishPolicy.js tests/autoPublishPolicy.test.js
git commit -m "feat: enforce automatic publishing policy"
~~~

### Task 3: Manuelle Freigaben korrekt zählen

**Files:**
- Modify: `services/contentAgent/contentPublicationService.js`
- Create: `repositories/contentPublishEventRepository.js`
- Test: `tests/manualApprovalCounter.test.js`

**Interfaces:**
- Produces: atomare Erhöhung von `manual_approvals_count` und `recordPublishEvent`.

- [ ] **Step 1: Fehlschlagenden Zählertest schreiben**

Prüfen: nur manuelle Veröffentlichung eines `generated_by_ai = true`-Posts erhöht den Zähler; erneuter Aufruf, normaler manueller Blogpost und Auto-Publishing erhöhen ihn nicht.

- [ ] **Step 2: Test ausführen**

Run: `node --test tests/manualApprovalCounter.test.js`  
Expected: FAIL.

- [ ] **Step 3: Publikationstransaktion erweitern**

Nach dem erfolgreichen, in Plan B definierten `UPDATE posts SET published = true, workflow_status = 'published', published_at = COALESCE(published_at, NOW()), reviewed_at = NOW(), reviewed_by = $2, updated_at = NOW() WHERE id = $1 RETURNING *`:

~~~sql
UPDATE content_agent_settings
SET manual_approvals_count = manual_approvals_count + 1,
    updated_by = $1,
    updated_at = NOW()
WHERE id = 1;
~~~

Dies erfolgt nur, wenn die vorherige Zeile `generated_by_ai = true` war und der Aufrufmodus `manual` lautet.

- [ ] **Step 4: Manuelles Event speichern**

`recordPublishEvent` speichert `decision = 'manual'`, Policyversion, Score und `reasons_json = ['human_approved']`.

- [ ] **Step 5: Tests und Commit**

Run: `node --test tests/manualApprovalCounter.test.js tests/contentPublicationService.test.js`  
Expected: alle Tests PASS.

~~~bash
git add services/contentAgent/contentPublicationService.js repositories/contentPublishEventRepository.js tests/manualApprovalCounter.test.js
git commit -m "feat: count reviewed ai articles"
~~~

### Task 4: Policy in die Entwurfspipeline integrieren

**Files:**
- Modify: `services/contentAgent/draftPipeline.js`
- Modify: `services/contentAgent/workerService.js`
- Test: `tests/autoPublishPipeline.test.js`

**Interfaces:**
- Consumes: `evaluateAutoPublishEligibility` und `publishDraft({ mode: 'auto' })`.
- Produces: protokollierte erlaubte oder blockierte Entscheidung nach Entwurfsanlage.

- [ ] **Step 1: Fehlschlagende Pipelinefälle schreiben**

Sicherer Score-94-Entwurf bei beiden Schaltern und acht Freigaben wird veröffentlicht. Aktueller Artikel mit Score 98 bleibt `needs_review` und erhält ein blockiertes Event.

- [ ] **Step 2: Test ausführen**

Run: `node --test tests/autoPublishPipeline.test.js`  
Expected: FAIL.

- [ ] **Step 3: Pipeline erweitern**

Nach `createAIDraft`:

1. Einstellungen lesen.
2. Policy bewerten.
3. Event immer speichern.
4. Nur bei `allowed === true` `publishDraft({ mode: 'auto' })` aufrufen.
5. Bei jeder Exception Entwurf unveröffentlicht lassen und Job als `needs_manual_attention` markieren.

- [ ] **Step 4: Workerlogs ergänzen**

Strukturiertes Log enthält `postId`, `decision`, `policyVersion` und Reason-Codes, aber keine Artikelinhalte.

- [ ] **Step 5: Tests und Commit**

Run: `node --test tests/autoPublishPipeline.test.js tests/contentAgentDraftPipeline.test.js`  
Expected: alle Tests PASS.

~~~bash
git add services/contentAgent/draftPipeline.js services/contentAgent/workerService.js tests/autoPublishPipeline.test.js
git commit -m "feat: publish only policy approved drafts"
~~~

### Task 5: Adminschalter mit harter Umgebungssperre

**Files:**
- Modify: `repositories/contentAdminRepository.js`
- Modify: `controllers/adminContentAgentController.js`
- Modify: `routes/adminContentAgentRoutes.js`
- Modify: `views/admin/content_agent_dashboard.ejs`
- Test: `tests/adminAutoPublishSettings.test.js`

**Interfaces:**
- Produces: `POST /admin/content-agent/settings/auto-publish`.

- [ ] **Step 1: Fehlschlagenden Adminsettingtest schreiben**

Prüfen: Route nutzt `isAdmin` und `verifyCsrfToken`; UI ist deaktiviert, solange Env-Schalter aus oder Freigaben unter acht; Backend lehnt Umgehung mit HTTP 409 ab.

- [ ] **Step 2: Test ausführen**

Run: `node --test tests/adminAutoPublishSettings.test.js`  
Expected: FAIL.

- [ ] **Step 3: Repositoryfunktion implementieren**

~~~sql
UPDATE content_agent_settings
SET auto_publish_enabled = $1,
    auto_publish_min_score = GREATEST(90, $2),
    updated_by = $3,
    updated_at = NOW()
WHERE id = 1
RETURNING *;
~~~

- [ ] **Step 4: Backend-Guards implementieren**

Aktivierung nur, wenn `config.autoPublishEnabled === true` und `manual_approvals_count >= 8`. Deaktivierung ist immer erlaubt. Grenzwert unter 90 wird nicht gespeichert.

- [ ] **Step 5: UI implementieren**

Dashboard zeigt beide Schalter, Zahl manueller Freigaben, Mindestscore und Ausschlussregeln. Aktivierungsformular fordert eine Checkbox „Ich bestätige die automatische Veröffentlichung risikoarmer Artikel“.

- [ ] **Step 6: Tests und Commit**

Run: `node --test tests/adminAutoPublishSettings.test.js && npm run build`  
Expected: Tests und Build PASS.

~~~bash
git add repositories/contentAdminRepository.js controllers/adminContentAgentController.js routes/adminContentAgentRoutes.js views/admin/content_agent_dashboard.ejs tests/adminAutoPublishSettings.test.js
git commit -m "feat: control auto publishing from admin"
~~~

### Task 6: Geplante Beiträge veröffentlichen

**Files:**
- Create: `services/contentAgent/scheduledPublicationService.js`
- Modify: `services/contentAgent/workerService.js`
- Modify: `scripts/contentWorker.js`
- Test: `tests/scheduledPublicationService.test.js`

**Interfaces:**
- Produces: `publishDueScheduledPosts({ now, db })`.

- [ ] **Step 1: Fehlschlagenden Zeitplantest schreiben**

Prüfen: fälliger `scheduled`-Post wird veröffentlicht; zukünftiger nicht; blockierter oder bereits veröffentlichter nicht; jeder Post wird separat transaktional verarbeitet.

- [ ] **Step 2: Test ausführen**

Run: `node --test tests/scheduledPublicationService.test.js`  
Expected: FAIL.

- [ ] **Step 3: Service implementieren**

~~~sql
SELECT id
FROM posts
WHERE published = false
  AND workflow_status = 'scheduled'
  AND scheduled_at <= $1
ORDER BY scheduled_at
FOR UPDATE SKIP LOCKED;
~~~

Jeder Treffer wird über den vorhandenen Publikationsservice mit Modus `scheduled` veröffentlicht. Dies ist keine Auto-Publishing-Entscheidung und erhöht den manuellen Freigabezähler nicht, weil die Planung bereits eine Adminfreigabe war.

- [ ] **Step 4: Workerjob und Minutentakt ergänzen**

Der Worker legt idempotent `publish_scheduled_posts:YYYY-MM-DD-HH-mm` an. Keine Logausgabe, wenn nichts fällig ist.

- [ ] **Step 5: Tests und Commit**

Run: `node --test tests/scheduledPublicationService.test.js && npm test`  
Expected: alle Tests PASS.

~~~bash
git add services/contentAgent/scheduledPublicationService.js services/contentAgent/workerService.js scripts/contentWorker.js tests/scheduledPublicationService.test.js
git commit -m "feat: publish approved scheduled posts"
~~~

### Task 7: VPS-Aktivierung und Not-Aus dokumentieren

**Files:**
- Modify: `docs/deployment/content-agent-ionos-vps.md`
- Modify: `tests/contentAgentDeploymentGuide.test.js`

**Interfaces:**
- Produces: sichere Aktivierungs-, Beobachtungs- und Rückfallanleitung.

- [ ] **Step 1: Fehlschlagenden Dokumentationstest erweitern**

~~~js
assert.match(guide, /mindestens acht manuell freigegebene KI-Artikel/i);
assert.match(guide, /migrate:content-autopublish/);
assert.match(guide, /CONTENT_AGENT_AUTOPUBLISH_ENABLED=true/);
assert.match(guide, /CONTENT_AGENT_AUTOPUBLISH_ENABLED=false/);
assert.match(guide, /content_publish_events/);
~~~

- [ ] **Step 2: Test ausführen**

Run: `node --test tests/contentAgentDeploymentGuide.test.js`  
Expected: FAIL.

- [ ] **Step 3: Aktivierung dokumentieren**

~~~bash
docker compose run --rm app npm run migrate:content-autopublish
sed -i 's/^CONTENT_AGENT_AUTOPUBLISH_ENABLED=.*/CONTENT_AGENT_AUTOPUBLISH_ENABLED=true/' .env
docker compose up -d content-worker
docker compose logs --tail=100 content-worker
~~~

Danach muss der zweite Schalter im Adminbereich aktiviert werden. Die Anleitung warnt, dass die Umgebungsvariable allein niemals genügt.

- [ ] **Step 4: Not-Aus dokumentieren**

~~~bash
sed -i 's/^CONTENT_AGENT_AUTOPUBLISH_ENABLED=.*/CONTENT_AGENT_AUTOPUBLISH_ENABLED=false/' .env
docker compose up -d content-worker
docker compose logs --tail=50 content-worker
~~~

Der Worker darf weiter Entwürfe erzeugen; nur automatische Veröffentlichung ist deaktiviert. Für vollständige Abschaltung zusätzlich `docker compose stop content-worker`.

- [ ] **Step 5: Finale Verifikation und Commit**

Run: `node --test tests/contentAgentDeploymentGuide.test.js tests/autoPublishPolicy.test.js tests/autoPublishPipeline.test.js && npm run build && npm test`  
Expected: alle Tests und Build PASS.

~~~bash
git add docs/deployment/content-agent-ionos-vps.md tests/contentAgentDeploymentGuide.test.js
git commit -m "docs: add controlled auto publishing rollout"
~~~

## Plan-D-Abnahme

- [ ] Weniger als acht manuelle Freigaben blockieren Auto-Publishing.
- [ ] Jeder einzelne Risikoflag blockiert Auto-Publishing.
- [ ] Score 89 blockiert, Score 90 allein erlaubt noch nicht.
- [ ] Doppelter Schalter ist technisch erzwungen.
- [ ] Jede Entscheidung steht in `content_publish_events`.
- [ ] Not-Aus wirkt nach Containerneustart.
- [ ] Geplante und automatisch freigegebene Veröffentlichungen sind getrennt nachvollziehbar.
- [ ] `npm test` und `npm run build` sind vollständig erfolgreich.
