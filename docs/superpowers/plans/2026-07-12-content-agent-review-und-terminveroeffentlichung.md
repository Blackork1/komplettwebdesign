# Content-Agent Review and Scheduled Publication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Blogartikel werden mit einstellbarem Vorlauf erzeugt, per Admin-Mail zur Prüfung gemeldet, nach Freigabe termingerecht veröffentlicht und bei späterer Aktivierung an Newsletter-Abonnenten gemeldet.

**Architecture:** Der vorhandene PostgreSQL-Scheduler berechnet Veröffentlichungsslots und daraus vorgezogene Erstellungszeitpunkte. Entwurf, Mail-Outbox, Freigabeversion und Veröffentlichungsjob werden transaktional und idempotent gespeichert; der bestehende Worker verarbeitet Generierung, Mail, Veröffentlichung und vorbereitete Newsletter-Zustellung als getrennte Jobtypen. Der Adminbereich bleibt die einzige Freigabestelle und widerruft Freigaben bei jeder relevanten Bearbeitung.

**Tech Stack:** Node.js 20, Express, EJS, PostgreSQL 16/pgvector, Luxon, Nodemailer, Bootstrap, `node:test`, Docker Compose.

## Global Constraints

- Schreibe sämtliche deutschsprachigen Texte mit korrekten Umlauten und nach deutschen Grammatikregeln.
- Die Zeitplan-Uhrzeit ist der Veröffentlichungstermin; Standard bleibt Montag und Donnerstag um 18:00 Uhr in `Europe/Berlin`.
- `generation_lead_hours` ist ganzzahlig, im Adminbereich einstellbar, 1 bis 48, Standard 4.
- Ohne gültige Freigabe darf niemals veröffentlicht werden.
- Eine Bearbeitung nach Freigabe muss diese Freigabe widerrufen.
- Admin-Mailfehler dürfen Entwurf und Veröffentlichung nicht zurückrollen.
- Admin-Mailversand wird höchstens fünfmal nach 5 Minuten, 15 Minuten, 1 Stunde, 4 Stunden und 12 Stunden versucht.
- Newsletter-Mails entstehen erst nach erfolgreicher Veröffentlichung, bleiben standardmäßig deaktiviert und sind vor acht erfolgreich manuell freigegebenen KI-Artikeln gesperrt.
- Alle schreibenden Adminaktionen bleiben authentifiziert, CSRF-geschützt, bestätigt und serverseitig validiert.
- Alle neuen Migrationen, Jobs, Mails und Veröffentlichungen müssen idempotent und lease-sicher sein.
- Die öffentliche App darf keine Entwurfsdaten, Adminlinks oder Qualitätsberichte an Newsletter-Abonnenten ausgeben.
- Die bestehende sichere Trennung zwischen statischem KI-HTML und EJS-Artikeln bleibt erhalten.

---

## File Map

**Neue Dateien**

- `scripts/migrations/004_create_scheduled_content_review.sql`: Schema für Vorlauf, Freigabeversionen, Mail-Outbox und Newsletter-Zustellung.
- `repositories/contentNotificationRepository.js`: transaktionale Outbox-, Claim-, Retry- und Zustellabfragen.
- `services/contentAgent/contentNotificationService.js`: sichere Admin- und Newsletter-Mailpayloads sowie Retryentscheidung.
- `services/contentAgent/scheduledPublicationService.js`: Freigeben, Verschieben, Sofortveröffentlichen und fällige Veröffentlichung.
- `services/contentAgent/blogNewsletterService.js`: Empfängerauswahl, Batches und deduplizierte Newsletter-Zustellung.
- `tests/contentAgentScheduledMigration.test.js`: Migrationsvertrag und Idempotenz.
- `tests/contentAgentScheduledSlots.test.js`: Vorlauf-, Zeitzonen- und Catch-up-Logik.
- `tests/contentAgentNotificationService.test.js`: Mailpayload, Retry und Doppelversandschutz.
- `tests/contentAgentScheduledPublication.test.js`: Freigabeversion und Veröffentlichung.
- `tests/contentAgentBlogNewsletter.test.js`: Acht-Freigaben-Sperre und Empfängerzustellung.
- `tests/contentAgentReviewSchedulingAdmin.test.js`: Controller, CSRF und EJS-Aktionen.
- `tests/adminContentAgentReturnTo.test.js`: abgesichertes Rücksprungziel nach Login.

**Geänderte Kernfiles**

- `scripts/runContentAgentMigration.js`: Migration 004 aufnehmen.
- `services/contentAgent/contentSchedulerService.js`: Veröffentlichungsslot minus Vorlauf berechnen.
- `services/contentAgent/runtimeConfigService.js`: neue DB-Einstellungen in Snapshots übernehmen.
- `repositories/contentAgentSettingsRepository.js`: Vorlauf, Mailadresse und Newsletter-Schalter validieren/persistieren.
- `models/BlogPostModel.js`: `scheduled_at`, Reviewversion und Outbox atomar mit dem KI-Entwurf speichern.
- `services/contentAgent/draftPipeline.js`: Slotdaten an die Draftpersistenz weiterreichen; kein früher Direkt-Publish.
- `services/contentAgent/adminDraftService.js`: Freigabe bei Bearbeitung atomar widerrufen.
- `repositories/contentPublishEventRepository.js`: geplante Veröffentlichung statt sofortigem Publish unterstützen.
- `services/contentAgent/contentPublicationService.js`: vorhandene Revalidierung in geplante Veröffentlichung integrieren.
- `repositories/contentJobRepository.js`: explizite Retryzeitpunkte und neue sichere Jobtypen.
- `scripts/contentWorker.js`: neue Handler und Abhängigkeiten laden.
- `controllers/adminContentAgentController.js`: Einstellungen und Freigabeaktionen.
- `routes/adminContentAgentRoutes.js`: Planen, Sofortveröffentlichen, Verschieben, Mailretry.
- `repositories/contentAgentAdminRepository.js`: Termin-, Freigabe- und Mailstatus laden.
- `services/contentAgent/adminPresentationService.js`: abgeleitete Anzeigen `Termin verpasst` und `Freigegeben`.
- `views/admin/contentAgent/schedule.ejs`: Vorlauf, Adminadresse und Newsletter-Gate.
- `views/admin/contentAgent/drafts.ejs`: Filter und Termin-/Mailstatus.
- `views/admin/contentAgent/draftEdit.ejs`: kontextabhängige Freigabeaktionen.
- `public/admin.css` und generierte CSS-Artefakte: responsive Status- und Termincontrols.
- `middleware/auth.js` und `controllers/authController.js`: eng begrenztes Content-Agent-Rücksprungziel.
- `services/mailService.js`: markenkonforme Admin- und Blog-Newsletter-Mailfunktionen.
- `docs/deployment/content-agent-ionos-vps.md`: Migration 004, Hostpfad und Smoke-Test.

---

### Task 1: Migration 004 und Schema-Verträge

**Files:**
- Create: `scripts/migrations/004_create_scheduled_content_review.sql`
- Modify: `scripts/runContentAgentMigration.js`
- Create: `tests/contentAgentScheduledMigration.test.js`
- Modify: `tests/contentAgentMigration.test.js`
- Modify: `tests/contentAgentPostgresIntegration.test.js`

**Interfaces:**
- Produces: Spalten `generation_lead_hours`, `admin_notification_email`, `newsletter_blog_notifications_enabled`, `review_version`, `approved_review_version`, `approved_at`, `approved_by_admin_id`, `publication_version`; Tabelle `content_notification_deliveries`.
- Produces: Workflowstatus `approved_scheduled` und eindeutige Outbox-/Publish-Indizes.

- [ ] **Step 1: Write failing migration contract tests**

```js
test('migration 004 defines scheduled review and notification contracts', async () => {
  const sql = await readFile(new URL('../scripts/migrations/004_create_scheduled_content_review.sql', import.meta.url), 'utf8');
  assert.match(sql, /generation_lead_hours\s+SMALLINT[^;]*DEFAULT 4/i);
  assert.match(sql, /admin_notification_email\s+VARCHAR\(320\)[^;]*NOT NULL[^;]*kontakt@komplettwebdesign\.de/i);
  assert.match(sql, /newsletter_blog_notifications_enabled\s+BOOLEAN[^;]*DEFAULT FALSE/i);
  assert.match(sql, /review_version\s+INTEGER[^;]*DEFAULT 1/i);
  assert.match(sql, /approved_review_version\s+INTEGER/i);
  assert.match(sql, /approved_scheduled/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS content_notification_deliveries/i);
  assert.match(sql, /UNIQUE\s*\(idempotency_key\)/i);
});
```

- [ ] **Step 2: Run the migration tests and confirm failure**

Run: `node --test tests/contentAgentScheduledMigration.test.js tests/contentAgentMigration.test.js`

Expected: FAIL because migration 004 and its runner entry do not exist.

- [ ] **Step 3: Implement the idempotent migration and runner entry**

The SQL must use `ADD COLUMN IF NOT EXISTS`, named replaceable constraints, safe backfills, `CREATE TABLE IF NOT EXISTS`, and unique partial indexes. The runner list becomes:

```js
const MIGRATIONS = [
  './migrations/002_create_content_agent_core.sql',
  './migrations/003_create_content_agent_admin_dashboard.sql',
  './migrations/004_create_scheduled_content_review.sql'
];
```

The delivery table contract is:

```sql
CREATE TABLE IF NOT EXISTS content_notification_deliveries (
  id BIGSERIAL PRIMARY KEY,
  notification_type VARCHAR(40) NOT NULL,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  recipient_id BIGINT,
  recipient_email VARCHAR(320) NOT NULL,
  idempotency_key VARCHAR(220) NOT NULL UNIQUE,
  payload_json JSONB NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'queued',
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  locked_by VARCHAR(180),
  last_error_code VARCHAR(120),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Add checks for delivery type/status/attempts, settings bounds, review versions, and the expanded post workflow consistency.

- [ ] **Step 4: Run migration unit and guarded PostgreSQL tests**

Run: `node --test tests/contentAgentScheduledMigration.test.js tests/contentAgentMigration.test.js tests/contentAgentPostgresIntegration.test.js`

Expected: PASS; PostgreSQL integration safely skips without the guarded test URL.

- [ ] **Step 5: Commit**

```bash
git add scripts/migrations/004_create_scheduled_content_review.sql scripts/runContentAgentMigration.js tests/contentAgentScheduledMigration.test.js tests/contentAgentMigration.test.js tests/contentAgentPostgresIntegration.test.js
git commit -m "feat: add scheduled review schema"
```

---

### Task 2: Einstellungen, Validierung und Runtime-Snapshot

**Files:**
- Modify: `repositories/contentAgentSettingsRepository.js`
- Modify: `services/contentAgent/runtimeConfigService.js`
- Modify: `controllers/adminContentAgentController.js`
- Modify: `views/admin/contentAgent/schedule.ejs`
- Modify: `services/contentAgent/adminPresentationService.js`
- Modify: `tests/contentAgentSettingsRepository.test.js`
- Modify: `tests/contentAgentRuntimeConfig.test.js`
- Modify: `tests/contentAgentAdminController.test.js`
- Modify: `tests/contentAgentAdminViews.test.js`

**Interfaces:**
- Produces: `normalizeNotificationEmail(value): string` internal validator.
- Produces: settings fields `generationLeadHours`, `adminNotificationEmail`, `newsletterBlogNotificationsEnabled` in update patches and immutable job snapshots.

- [ ] **Step 1: Add failing repository, runtime and view tests**

```js
test('settings accept a four hour lead and normalized admin email', async () => {
  const updated = await updateContentAgentSettings({
    expectedVersion: 4,
    admin: { id: 1, username: 'admin' },
    patch: {
      generationLeadHours: 4,
      adminNotificationEmail: ' Redaktion@Example.de ',
      newsletterBlogNotificationsEnabled: false
    }
  }, db);
  assert.equal(updated.generation_lead_hours, 4);
  assert.equal(updated.admin_notification_email, 'redaktion@example.de');
});

test('newsletter activation stays locked before eight publications', async () => {
  await assert.rejects(
    () => updateWith({ manual_approvals_count: 7 }, { newsletterBlogNotificationsEnabled: true }),
    { code: 'CONTENT_NEWSLETTER_NOT_READY' }
  );
});
```

Assert the schedule template contains `generation_lead_hours`, `admin_notification_email`, the 0/8 gate and explanatory publication-time copy.

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `node --test tests/contentAgentSettingsRepository.test.js tests/contentAgentRuntimeConfig.test.js tests/contentAgentAdminController.test.js tests/contentAgentAdminViews.test.js`

Expected: FAIL on missing settings fields and newsletter gate.

- [ ] **Step 3: Implement settings and snapshot support**

Extend normalized settings with:

```js
const generationLeadHours = Number(patch.generationLeadHours ?? current.generation_lead_hours);
if (!Number.isInteger(generationLeadHours) || generationLeadHours < 1 || generationLeadHours > 48) {
  throw validationError('Der Erstellungsvorlauf muss zwischen 1 und 48 Stunden liegen.');
}

const adminNotificationEmail = normalizeEmail(
  patch.adminNotificationEmail ?? current.admin_notification_email
);

if (patch.newsletterBlogNotificationsEnabled === true
    && Number(current.manual_approvals_count) < 8) {
  throw Object.assign(new Error('Newsletter-Freigabe noch nicht erreicht.'), {
    code: 'CONTENT_NEWSLETTER_NOT_READY'
  });
}
```

Add these exact values to `resolveContentAgentRuntimeConfig()` and `createContentAgentJobSnapshot()` so a generation job never changes recipient, lead or target slot halfway through execution.

- [ ] **Step 4: Run focused tests**

Run: `node --test tests/contentAgentSettingsRepository.test.js tests/contentAgentRuntimeConfig.test.js tests/contentAgentAdminController.test.js tests/contentAgentAdminViews.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add repositories/contentAgentSettingsRepository.js services/contentAgent/runtimeConfigService.js controllers/adminContentAgentController.js views/admin/contentAgent/schedule.ejs services/contentAgent/adminPresentationService.js tests/contentAgentSettingsRepository.test.js tests/contentAgentRuntimeConfig.test.js tests/contentAgentAdminController.test.js tests/contentAgentAdminViews.test.js
git commit -m "feat: configure content review timing"
```

---

### Task 3: Veröffentlichungsslots und vorgezogene Generierung

**Files:**
- Modify: `services/contentAgent/contentSchedulerService.js`
- Modify: `scripts/contentWorker.js`
- Create: `tests/contentAgentScheduledSlots.test.js`
- Modify: `tests/contentAgentScheduler.test.js`
- Modify: `tests/contentAgentWorker.test.js`

**Interfaces:**
- Produces: `buildPublicationSlot({ settings, localDate }): { key, publicationAt, generationAt, localDate, localTime, timezone }`.
- Produces: `findDueGenerationSlot({ settings, now }): slot | null`.
- Consumes: `generation_lead_hours`, `schedule_weekdays`, `schedule_time`, `timezone`.

- [ ] **Step 1: Write failing time and DST tests**

```js
test('18:00 publication with four hour lead is generated at 14:00', () => {
  const slot = findDueGenerationSlot({
    settings: settings({ schedule_time: '18:00', generation_lead_hours: 4 }),
    now: new Date('2026-07-13T12:00:00.000Z')
  });
  assert.equal(slot.localTime, '18:00');
  assert.equal(slot.publicationAt, '2026-07-13T16:00:00.000Z');
  assert.equal(slot.generationAt, '2026-07-13T12:00:00.000Z');
});

test('lead time crosses into the previous local day', () => {
  const slot = nextSlot({ weekday: 1, time: '02:00', leadHours: 4 });
  assert.equal(slot.generationLocalDate, '2026-07-12');
});
```

Add spring-forward, fall-back, catch-up-after-restart and duplicate-tick cases.

- [ ] **Step 2: Run focused scheduler tests and confirm failure**

Run: `node --test tests/contentAgentScheduledSlots.test.js tests/contentAgentScheduler.test.js tests/contentAgentWorker.test.js`

Expected: FAIL because the existing scheduler treats 18:00 as generation time.

- [ ] **Step 3: Implement publication-slot calculation**

Refactor without removing the dynamic minute tick. The enqueued generation job payload must be:

```js
{
  source: 'weekly-schedule',
  schedule_slot: slot.key,
  publication_at: slot.publicationAt,
  publication_local_date: slot.localDate,
  publication_local_time: slot.localTime,
  publication_timezone: slot.timezone
}
```

Use `idempotencyKey: generate:${slot.key}`. Catch-up may enqueue a missing slot after `generationAt`; a past `publicationAt` is carried through and later displayed as missed, never auto-published without a valid approval.

- [ ] **Step 4: Run scheduler and worker tests**

Run: `node --test tests/contentAgentScheduledSlots.test.js tests/contentAgentScheduler.test.js tests/contentAgentWorker.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add services/contentAgent/contentSchedulerService.js scripts/contentWorker.js tests/contentAgentScheduledSlots.test.js tests/contentAgentScheduler.test.js tests/contentAgentWorker.test.js
git commit -m "feat: generate drafts before publication slots"
```

---

### Task 4: Entwurf, Termin und Admin-Mail-Outbox atomar speichern

**Files:**
- Modify: `models/BlogPostModel.js`
- Modify: `services/contentAgent/draftPipeline.js`
- Create: `repositories/contentNotificationRepository.js`
- Modify: `repositories/contentJobRepository.js`
- Modify: `tests/contentAgentDraftPipeline.test.js`
- Modify: `tests/blogContentFormat.test.js`
- Create: `tests/contentAgentNotificationRepository.test.js`

**Interfaces:**
- Produces: `createAdminReviewDelivery({ postId, recipientEmail, generationRunId, payload, client })`.
- Changes: `BlogPostModel.createAIDraft(input, db)` consumes `scheduledAt`, `adminNotificationEmail`, and `generationRunId`.
- Produces: one `send_admin_review_notification` job and one outbox row in the same database transaction as a newly persisted draft.

- [ ] **Step 1: Write failing atomic-persistence tests**

```js
test('weekly draft stores publication time and one admin notification outbox row', async () => {
  const draft = await BlogPostModel.createAIDraft({
    ...validDraft,
    scheduledAt: '2026-07-13T16:00:00.000Z',
    adminNotificationEmail: 'redaktion@example.de',
    generationRunId: 17
  }, db);
  assert.equal(draft.post.scheduled_at.toISOString(), '2026-07-13T16:00:00.000Z');
  assert.equal(outboxRows.length, 1);
  assert.equal(jobRows[0].job_type, 'send_admin_review_notification');
});
```

Also test retry of the generation pipeline returns the existing draft and does not create a second outbox row.

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `node --test tests/contentAgentDraftPipeline.test.js tests/blogContentFormat.test.js tests/contentAgentNotificationRepository.test.js`

Expected: FAIL on missing schedule and outbox writes.

- [ ] **Step 3: Implement transactional outbox persistence**

The outbox payload snapshot contains only bounded fields:

```js
{
  postId,
  title,
  shortDescription,
  imageUrl,
  qualityScore,
  riskSummary,
  scheduledAt,
  editorPath: `/admin/content-agent/drafts/${postId}/edit`
}
```

Do not store SMTP configuration, cookies or a rendered session URL. Manual drafts without `scheduledAt` may store `null`; their notification text says `Noch nicht terminiert`.

- [ ] **Step 4: Run focused tests**

Run: `node --test tests/contentAgentDraftPipeline.test.js tests/blogContentFormat.test.js tests/contentAgentNotificationRepository.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add models/BlogPostModel.js services/contentAgent/draftPipeline.js repositories/contentNotificationRepository.js repositories/contentJobRepository.js tests/contentAgentDraftPipeline.test.js tests/blogContentFormat.test.js tests/contentAgentNotificationRepository.test.js
git commit -m "feat: persist review notification outbox"
```

---

### Task 5: Admin-Prüfmail und belastbare Retryfolge

**Files:**
- Create: `services/contentAgent/contentNotificationService.js`
- Modify: `services/mailService.js`
- Modify: `services/contentAgent/workerService.js`
- Modify: `repositories/contentJobRepository.js`
- Modify: `scripts/contentWorker.js`
- Create: `tests/contentAgentNotificationService.test.js`
- Modify: `tests/contentAgentWorker.test.js`
- Modify: `tests/contentAgentJobRepository.test.js`

**Interfaces:**
- Produces: `ADMIN_NOTIFICATION_RETRY_DELAYS_MS = [300000, 900000, 3600000, 14400000, 43200000]`.
- Produces: `sendAdminReviewNotification({ deliveryId, leaseGuard }): { status: 'completed', deliveryId }`.
- Produces: `sendContentAgentReviewMail({ to, article, scheduledAt, editorUrl })` in `mailService.js`.
- Changes: retryable errors may carry `retryAt: Date`; worker forwards it to `retryOrFailJob()`.

- [ ] **Step 1: Write failing rendering, retry and idempotency tests**

```js
test('SMTP failure keeps delivery retryable without changing the post', async () => {
  smtp.sendMail.mockRejectedValueOnce(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }));
  await assert.rejects(() => service.sendAdminReviewNotification({ deliveryId: 7 }), (error) => {
    assert.equal(error.retryable, true);
    assert.equal(error.retryAt.toISOString(), '2026-07-12T10:05:00.000Z');
    return true;
  });
  assert.equal(postUpdates.length, 0);
});

test('already sent delivery does not send twice', async () => {
  const result = await service.sendAdminReviewNotification({ deliveryId: 7 });
  assert.equal(result.status, 'completed');
  assert.equal(smtp.sendMail.mock.calls.length, 0);
});
```

Assert HTML escaping, HTTPS image handling, canonical admin URL and no session/token data.

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `node --test tests/contentAgentNotificationService.test.js tests/contentAgentWorker.test.js tests/contentAgentJobRepository.test.js`

Expected: FAIL on missing mail handler and explicit retry time.

- [ ] **Step 3: Implement mail sending and explicit retry times**

The worker catch branch becomes conceptually:

```js
const terminal = error?.retryable === false
  ? await failJob(claim, error)
  : await retryOrFailJob(claim, error, {
      retryAt: error?.retryAt || null,
      backoffSeconds: Math.min(3_600, 30 * (2 ** Math.max(0, claim.attempts - 1)))
    });
```

Repository SQL uses `$retryAt` when valid, otherwise the existing backoff. The notification repository locks a queued delivery, marks `sending`, and changes to `sent` only after a confirmed Nodemailer result. Jeder SMTP-Fehler verwendet die nächste konfigurierte Retry-Stufe; nach dem fünften fehlgeschlagenen Versuch wechselt die Zustellung auf `failed` und kann im Dashboard manuell erneut eingeplant werden.

- [ ] **Step 4: Run mail, queue and worker tests**

Run: `node --test tests/contentAgentNotificationService.test.js tests/contentAgentWorker.test.js tests/contentAgentJobRepository.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add services/contentAgent/contentNotificationService.js services/mailService.js services/contentAgent/workerService.js repositories/contentJobRepository.js scripts/contentWorker.js tests/contentAgentNotificationService.test.js tests/contentAgentWorker.test.js tests/contentAgentJobRepository.test.js
git commit -m "feat: notify admins about review drafts"
```

---

### Task 6: Freigabeversionen und geplante Veröffentlichung

**Files:**
- Create: `services/contentAgent/scheduledPublicationService.js`
- Modify: `repositories/contentPublishEventRepository.js`
- Modify: `services/contentAgent/contentPublicationService.js`
- Modify: `repositories/contentJobRepository.js`
- Create: `tests/contentAgentScheduledPublication.test.js`
- Modify: `tests/contentPublicationService.test.js`
- Modify: `tests/contentManualApprovalCounter.test.js`

**Interfaces:**
- Produces: `approveForSchedule({ postId, scheduledAt, admin, confirmed })`.
- Produces: `publishNowAfterMissedSlot({ postId, admin, confirmed })`.
- Produces: `publishApprovedPost({ postId, approvalVersion, publicationVersion, leaseGuard })`.
- Produces: workflow transition `needs_review -> approved_scheduled -> published`.

- [ ] **Step 1: Write failing state-machine tests**

```js
test('approval before the slot schedules but does not publish', async () => {
  const result = await service.approveForSchedule({
    postId: 3,
    scheduledAt: new Date('2026-07-13T16:00:00.000Z'),
    admin,
    confirmed: true
  });
  assert.equal(result.post.workflow_status, 'approved_scheduled');
  assert.equal(result.post.published, false);
  assert.equal(result.job.run_after.toISOString(), '2026-07-13T16:00:00.000Z');
});

test('publication rejects a stale approval version', async () => {
  await assert.rejects(
    () => service.publishApprovedPost({ postId: 3, approvalVersion: 2, publicationVersion: 1 }),
    { code: 'CONTENT_APPROVAL_STALE' }
  );
});
```

Test missing confirmation, past time, immediate publish only after missed slot, duplicate job, lease loss and exactly-once approval counter.

- [ ] **Step 2: Run focused publication tests and confirm failure**

Run: `node --test tests/contentAgentScheduledPublication.test.js tests/contentPublicationService.test.js tests/contentManualApprovalCounter.test.js`

Expected: FAIL because manual approval currently publishes immediately.

- [ ] **Step 3: Implement transactional approval and due publication**

Approval must lock the post, revalidate through the existing publication service, set:

```sql
workflow_status = 'approved_scheduled',
scheduled_at = $scheduledAt,
approved_review_version = review_version,
approved_at = NOW(),
approved_by_admin_id = $adminId
```

and insert `publish_approved_post` with `run_after = scheduled_at` in the same transaction. Due publication repeats full validation, checks lease, sets `published`, increments `publication_version`, inserts an immutable manual publication event and increments `manual_approvals_count` exactly once.

- [ ] **Step 4: Run publication tests**

Run: `node --test tests/contentAgentScheduledPublication.test.js tests/contentPublicationService.test.js tests/contentManualApprovalCounter.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add services/contentAgent/scheduledPublicationService.js repositories/contentPublishEventRepository.js services/contentAgent/contentPublicationService.js repositories/contentJobRepository.js tests/contentAgentScheduledPublication.test.js tests/contentPublicationService.test.js tests/contentManualApprovalCounter.test.js
git commit -m "feat: schedule approved blog publication"
```

---

### Task 7: Bearbeitung widerruft Freigabe und neue Adminaktionen

**Files:**
- Modify: `services/contentAgent/adminDraftService.js`
- Modify: `services/contentAgent/draftRegenerationService.js`
- Modify: `controllers/adminContentAgentController.js`
- Modify: `routes/adminContentAgentRoutes.js`
- Modify: `views/admin/contentAgent/draftEdit.ejs`
- Create: `tests/contentAgentReviewSchedulingAdmin.test.js`
- Modify: `tests/contentAgentAdminDraftService.test.js`
- Modify: `tests/contentDraftRegenerationService.test.js`
- Modify: `tests/contentAgentAdminRoutes.test.js`

**Interfaces:**
- Consumes: scheduled publication service methods from Task 6.
- Produces: POST routes `/approve-scheduled`, `/publish-now`, `/reschedule`, and `/notification/retry`.
- Changes: every content edit increments `review_version`, clears approval columns and returns status `needs_review`.

- [ ] **Step 1: Write failing edit-invalidation and route tests**

```js
test('editing an approved draft revokes approval atomically', async () => {
  const updated = await service.updateDraft({ postId: 4, input: validInput, admin });
  assert.equal(updated.workflow_status, 'needs_review');
  assert.equal(updated.review_version, 3);
  assert.equal(updated.approved_review_version, null);
  assert.equal(updated.approved_at, null);
});

test('reschedule route requires CSRF and a future local datetime', async () => {
  assert.match(routeSource, /drafts\/:id\/reschedule/);
  assert.match(routeSource, /verifyCsrfToken/);
});
```

- [ ] **Step 2: Run focused admin tests and confirm failure**

Run: `node --test tests/contentAgentReviewSchedulingAdmin.test.js tests/contentAgentAdminDraftService.test.js tests/contentDraftRegenerationService.test.js tests/contentAgentAdminRoutes.test.js`

Expected: FAIL on absent invalidation and routes.

- [ ] **Step 3: Implement invalidation, controllers and context-aware actions**

The edit transaction adds:

```sql
review_version = review_version + 1,
workflow_status = 'needs_review',
approved_review_version = NULL,
approved_at = NULL,
approved_by_admin_id = NULL
```

Regeneration jobs apply the same invalidation only when they successfully replace content. The EJS view uses server-derived flags, not browser time, to show the future-slot or missed-slot actions. Local datetime input is parsed with the configured IANA timezone and rejected unless its UTC value is strictly in the future.

- [ ] **Step 4: Run admin and regeneration tests**

Run: `node --test tests/contentAgentReviewSchedulingAdmin.test.js tests/contentAgentAdminDraftService.test.js tests/contentDraftRegenerationService.test.js tests/contentAgentAdminRoutes.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add services/contentAgent/adminDraftService.js services/contentAgent/draftRegenerationService.js controllers/adminContentAgentController.js routes/adminContentAgentRoutes.js views/admin/contentAgent/draftEdit.ejs tests/contentAgentReviewSchedulingAdmin.test.js tests/contentAgentAdminDraftService.test.js tests/contentDraftRegenerationService.test.js tests/contentAgentAdminRoutes.test.js
git commit -m "feat: manage scheduled draft approvals"
```

---

### Task 8: Worker-Handler für Veröffentlichung und späteren Auto-Modus

**Files:**
- Modify: `scripts/contentWorker.js`
- Modify: `services/contentAgent/draftPipeline.js`
- Modify: `services/contentAgent/autoPublishPolicy.js`
- Modify: `services/contentAgent/runtimeConfigService.js`
- Modify: `tests/contentAgentWorker.test.js`
- Modify: `tests/contentAgentDraftPipeline.test.js`
- Modify: `tests/contentAutoPublishPipeline.test.js`
- Modify: `tests/contentAutoPublishPolicy.test.js`

**Interfaces:**
- Consumes: `sendAdminReviewNotification()` and `publishApprovedPost()`.
- Changes: supported job sets include `send_admin_review_notification`, `publish_approved_post`, `send_blog_newsletter`, `send_blog_newsletter_delivery`.
- Changes: passing auto-publish policy schedules approval for `publication_at`; it never publishes at generation time.

- [ ] **Step 1: Write failing worker-dispatch and auto-mode tests**

```js
test('publish job is dispatched without creating a generation run', async () => {
  const result = await handler(job('publish_approved_post'), { leaseGuard });
  assert.equal(result.status, 'completed');
  assert.equal(createRun.calls.length, 0);
  assert.equal(publishApprovedPost.calls.length, 1);
});

test('auto-publish policy schedules the target slot instead of publishing early', async () => {
  const result = await pipelineForAutoMode({ publication_at: '2026-07-13T16:00:00.000Z' });
  assert.equal(result.post.workflow_status, 'approved_scheduled');
  assert.equal(result.post.published, false);
});
```

- [ ] **Step 2: Run worker and auto tests and confirm failure**

Run: `node --test tests/contentAgentWorker.test.js tests/contentAgentDraftPipeline.test.js tests/contentAutoPublishPipeline.test.js tests/contentAutoPublishPolicy.test.js`

Expected: FAIL because only generation, regeneration and audit jobs are supported and auto mode publishes immediately.

- [ ] **Step 3: Implement non-generation dispatch and scheduled auto approval**

Dispatch notification/publication jobs before generation-run creation. Retain snapshot validation for publication context. Replace the early `publishDraftAutomatically()` pipeline operation with an auto-policy decision that calls `approveForSchedule()` only when all existing gates pass; otherwise leave `needs_review` and include the policy reasons.

- [ ] **Step 4: Run worker and auto tests**

Run: `node --test tests/contentAgentWorker.test.js tests/contentAgentDraftPipeline.test.js tests/contentAutoPublishPipeline.test.js tests/contentAutoPublishPolicy.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/contentWorker.js services/contentAgent/draftPipeline.js services/contentAgent/autoPublishPolicy.js services/contentAgent/runtimeConfigService.js tests/contentAgentWorker.test.js tests/contentAgentDraftPipeline.test.js tests/contentAutoPublishPipeline.test.js tests/contentAutoPublishPolicy.test.js
git commit -m "feat: process scheduled publication jobs"
```

---

### Task 9: Dashboard-Übersicht, Filter und Mailretry

**Files:**
- Modify: `repositories/contentAgentAdminRepository.js`
- Modify: `services/contentAgent/adminPresentationService.js`
- Modify: `controllers/adminContentAgentController.js`
- Modify: `views/admin/contentAgent/overview.ejs`
- Modify: `views/admin/contentAgent/drafts.ejs`
- Modify: `views/admin/contentAgent/jobs.ejs`
- Modify: `public/admin.css`
- Modify generated: `public/admin.min.css`, `public/css-asset-manifest.json`
- Modify: `tests/contentAgentAdminRepository.test.js`
- Modify: `tests/contentAgentAdminPresentation.test.js`
- Modify: `tests/contentAgentAdminViews.test.js`
- Modify: `tests/contentAgentAdminController.test.js`

**Interfaces:**
- Produces: `deriveReviewState(post, now): 'needs_review' | 'approved_scheduled' | 'missed' | 'published'`.
- Produces: query parameter `status=review|approved|missed|published`.
- Consumes: delivery status from `content_notification_deliveries`.

- [ ] **Step 1: Write failing presentation and view tests**

```js
test('past unapproved scheduled draft is presented as missed', () => {
  assert.equal(deriveReviewState({
    workflow_status: 'needs_review',
    published: false,
    scheduled_at: '2026-07-12T08:00:00.000Z'
  }, new Date('2026-07-12T09:00:00.000Z')), 'missed');
});
```

Assert schedule preview, mail status, manual mail retry, filters and accessible labels.

- [ ] **Step 2: Run dashboard tests and confirm failure**

Run: `node --test tests/contentAgentAdminRepository.test.js tests/contentAgentAdminPresentation.test.js tests/contentAgentAdminViews.test.js tests/contentAgentAdminController.test.js`

Expected: FAIL on missing status fields and controls.

- [ ] **Step 3: Implement repository joins, derived states and responsive UI**

Use a lateral join to select the newest `admin_review` delivery per post. Whitelist the filter value before choosing fixed SQL predicates; never interpolate arbitrary query text. Show exact Berlin-local publication time, approval version, last mail attempt and safe error code. Retry is enabled only for `failed` delivery rows.

- [ ] **Step 4: Build CSS and run dashboard tests**

Run: `npm run build && node --test tests/contentAgentAdminRepository.test.js tests/contentAgentAdminPresentation.test.js tests/contentAgentAdminViews.test.js tests/contentAgentAdminController.test.js`

Expected: PASS and CSS manifest unchanged or intentionally updated by the build script.

- [ ] **Step 5: Commit**

```bash
git add repositories/contentAgentAdminRepository.js services/contentAgent/adminPresentationService.js controllers/adminContentAgentController.js views/admin/contentAgent/overview.ejs views/admin/contentAgent/drafts.ejs views/admin/contentAgent/jobs.ejs public/admin.css public/admin.min.css public/css-asset-manifest.json tests/contentAgentAdminRepository.test.js tests/contentAgentAdminPresentation.test.js tests/contentAgentAdminViews.test.js tests/contentAgentAdminController.test.js
git commit -m "feat: show scheduled review status"
```

---

### Task 10: Vorbereiteter, gesperrter Blog-Newsletter

**Files:**
- Create: `services/contentAgent/blogNewsletterService.js`
- Modify: `repositories/contentNotificationRepository.js`
- Modify: `services/mailService.js`
- Modify: `scripts/contentWorker.js`
- Modify: `controllers/adminContentAgentController.js`
- Modify: `views/admin/contentAgent/schedule.ejs`
- Create: `tests/contentAgentBlogNewsletter.test.js`
- Modify: `tests/contentAgentWorker.test.js`
- Modify: `tests/contentAgentAdminController.test.js`

**Interfaces:**
- Produces: `assertNewsletterActivationAllowed(settings): true` or error `CONTENT_NEWSLETTER_NOT_READY`.
- Produces: `queuePublishedArticleNewsletter({ postId, publicationVersion, leaseGuard })`.
- Produces: `sendNewsletterDelivery({ deliveryId, leaseGuard })`.
- Produces: `sendPublishedBlogNewsletterMail({ to, unsubscribeToken, post })`.
- Consumes: `newsletter_signups` rows with `active = TRUE` and a nonempty `unsubscribe_token`.

- [ ] **Step 1: Write failing gate, batch and unsubscribe tests**

```js
test('newsletter remains disabled before eight manual publications', async () => {
  await assert.rejects(
    () => service.assertNewsletterActivationAllowed({ manual_approvals_count: 7 }),
    { code: 'CONTENT_NEWSLETTER_NOT_READY' }
  );
});

test('delivery rechecks active subscriber immediately before send', async () => {
  subscriber.active = false;
  const result = await service.sendNewsletterDelivery({ deliveryId: 9 });
  assert.equal(result.status, 'cancelled');
  assert.equal(mail.calls.length, 0);
});
```

Also test batches of at most 50, post/publication dedupe, image/title/description/link content and unsubscribe URL.

- [ ] **Step 2: Run newsletter tests and confirm failure**

Run: `node --test tests/contentAgentBlogNewsletter.test.js tests/contentAgentWorker.test.js tests/contentAgentAdminController.test.js`

Expected: FAIL because no blog newsletter jobs exist.

- [ ] **Step 3: Implement disabled-by-default newsletter pipeline**

On successful publication, enqueue `send_blog_newsletter` only when the persisted setting is true and the approval count is at least eight. The batch job creates deduplicated `newsletter_article` deliveries and child jobs in chunks of 50. Delivery locks the row, reloads the subscriber, cancels inactive/missing-token recipients, and sends the existing brand template with public blog URL and unsubscribe link.

- [ ] **Step 4: Run newsletter and worker tests**

Run: `node --test tests/contentAgentBlogNewsletter.test.js tests/contentAgentWorker.test.js tests/contentAgentAdminController.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add services/contentAgent/blogNewsletterService.js repositories/contentNotificationRepository.js services/mailService.js scripts/contentWorker.js controllers/adminContentAgentController.js views/admin/contentAgent/schedule.ejs tests/contentAgentBlogNewsletter.test.js tests/contentAgentWorker.test.js tests/contentAgentAdminController.test.js
git commit -m "feat: prepare gated blog newsletter"
```

---

### Task 11: Sicheres Rücksprungziel aus der Admin-Mail

**Files:**
- Modify: `middleware/auth.js`
- Modify: `controllers/authController.js`
- Modify: `routes/authRoutes.js`
- Create: `tests/adminContentAgentReturnTo.test.js`

**Interfaces:**
- Produces: `safeContentAgentReturnTo(value): string | null`.
- Changes: unauthenticated GET under `/admin/content-agent/` stores only a safe relative path in session; login consumes and deletes it.

- [ ] **Step 1: Write failing open-redirect and happy-path tests**

```js
test('content-agent editor path survives login', () => {
  assert.equal(
    safeContentAgentReturnTo('/admin/content-agent/drafts/42/edit'),
    '/admin/content-agent/drafts/42/edit'
  );
});

for (const unsafe of ['https://evil.example', '//evil.example', '/admin/users', '/admin/content-agent/../../logout']) {
  test(`rejects unsafe return path ${unsafe}`, () => {
    assert.equal(safeContentAgentReturnTo(unsafe), null);
  });
}
```

- [ ] **Step 2: Run return-to tests and confirm failure**

Run: `node --test tests/adminContentAgentReturnTo.test.js`

Expected: FAIL because login always redirects to `/admin`.

- [ ] **Step 3: Implement strict relative-path validation**

Validation must parse no origin, reject backslashes/control characters/dot segments, and match:

```js
/^\/admin\/content-agent(?:\/[a-z0-9/_-]+)?(?:\?[a-z0-9=&_-]+)?$/i
```

Store only for GET/HEAD requests. After successful login:

```js
const returnTo = safeContentAgentReturnTo(req.session.contentAgentReturnTo);
delete req.session.contentAgentReturnTo;
return res.redirect(returnTo || '/admin');
```

- [ ] **Step 4: Run authentication tests**

Run: `node --test tests/adminContentAgentReturnTo.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add middleware/auth.js controllers/authController.js routes/authRoutes.js tests/adminContentAgentReturnTo.test.js
git commit -m "feat: return admins to review drafts"
```

---

### Task 12: Integration, responsive Prüfung und VPS-Rollout

**Files:**
- Modify: `tests/contentAgentPostgresIntegration.test.js`
- Modify: `tests/contentAgentDeploymentGuide.test.js`
- Modify: `tests/contentAgentPreview.test.js`
- Modify: `docs/deployment/content-agent-ionos-vps.md`
- Modify: `scripts/contentAgentDryRun.js`
- Modify: `package.json` only if a focused verification script is necessary.

**Interfaces:**
- Consumes: all previous tasks.
- Produces: reproducible migration 002+003+004, safe dry-run, host/container path distinction and production smoke-test instructions.

- [ ] **Step 1: Add failing end-to-end and deployment-contract tests**

```js
test('PostgreSQL flow generates, notifies, approves and publishes once', async () => {
  const draft = await generateScheduledDraft();
  assert.equal(draft.workflow_status, 'needs_review');
  await approveForFutureSlot(draft.id);
  assert.equal((await readPost(draft.id)).published, false);
  await runDuePublicationJob();
  assert.equal((await readPost(draft.id)).published, true);
  assert.equal(await manualApprovalCountFor(draft.id), 1);
});
```

Deployment guide tests must require migration 004, the SSH host path `~/apps/komplettwebdesign`, the webhook-container path `/apps/komplettwebdesign`, backup, dry-run, shared image recreate and worker healthcheck.

- [ ] **Step 2: Run integration/deployment tests and confirm failure**

Run: `node --test tests/contentAgentPostgresIntegration.test.js tests/contentAgentDeploymentGuide.test.js tests/contentAgentPreview.test.js`

Expected: FAIL until the integration harness and guide cover migration 004 and scheduled review.

- [ ] **Step 3: Complete integration, documentation and dry-run fixtures**

The dry-run must prove:

```json
{
  "externalCalls": 0,
  "articleValid": true,
  "publishMode": "draft",
  "scheduledReview": true,
  "notificationSimulated": true
}
```

The VPS guide must provide commands relative to `webadmin@ubuntu:~/apps/komplettwebdesign$`, while explicitly retaining `/apps/komplettwebdesign` only for commands executed inside the webhook container.

- [ ] **Step 4: Run complete verification**

Run:

```bash
OPENAI_API_KEY=test-key npm test
npm run build
OPENAI_API_KEY=test-key npm run content-agent:dry-run
git diff --check
git status --short
```

Expected: all tests pass, the guarded PostgreSQL test either passes against its isolated database or skips before connecting, build succeeds, dry-run shows zero external calls, and the worktree is clean after the task commit.

Perform responsive render checks of the schedule page, draft list and editor at 1440×900, 1024×768, 768×1024 and 390×844. Verify keyboard focus, readable status labels, no horizontal overflow and correct action visibility before/after a missed slot.

- [ ] **Step 5: Commit**

```bash
git add tests/contentAgentPostgresIntegration.test.js tests/contentAgentDeploymentGuide.test.js tests/contentAgentPreview.test.js docs/deployment/content-agent-ionos-vps.md scripts/contentAgentDryRun.js package.json
git commit -m "docs: verify scheduled content rollout"
```

---

## Final Review Gate

After Task 12:

1. Dispatch a fresh spec-compliance reviewer against the design and all branch commits.
2. Fix every Critical or Important finding with a failing regression test first.
3. Dispatch a fresh code-quality reviewer over the corrected branch.
4. Re-run the full test suite, build, dry-run, `git diff --check` and worktree status.
5. Do not merge or push until the user explicitly chooses the branch-completion action.
