# Content-Agent Provider-Wiederherstellung Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Einen unklar abgeschlossenen OpenAI-Schritt nach ausdrücklicher Adminbestätigung sicher verwerfen, denselben Content-Job exakt an dieser Stufe fortsetzen und künftige Providerfehler mit bereinigten Diagnosedaten nachvollziehbar machen.

**Architecture:** Die normale Retryrichtlinie bleibt für eindeutig wiederholbare Fehler zuständig und schließt `provider_execution_uncertain` aus. Eine separate transaktionale Repositoryaktion validiert Job, Lauf und genau eine offene Budgetreservierung, verschiebt diese in einen Auditdatensatz und reiht denselben Job wieder ein. Die Pipeline persistiert künftig nur streng erlaubte Providerdiagnosefelder; Adminroute und View bieten die risikobehaftete Aktion ausschließlich nach serverseitiger Freigabe an.

**Tech Stack:** Node.js, Express 5, EJS, PostgreSQL 16/JSONB, OpenAI Node SDK, Node Test Runner.

## Global Constraints

- Alle Texte verwenden korrekte deutsche Grammatik sowie `ä`, `ö`, `ü` und `ß`.
- Keine automatische Veröffentlichung; das Ergebnis bleibt `published = FALSE` und `workflow_status = 'needs_review'`.
- Bereits persistierte Stufen und bestätigte Kosten bleiben unverändert.
- Kein Prompt, API-Schlüssel, Header, Stacktrace oder vollständiger Providertext darf persistiert oder im Adminbereich angezeigt werden.
- `provider_execution_uncertain` darf niemals über den normalen Retrypfad erneut ausgeführt werden.
- Die risikobehaftete Wiederholung benötigt eine literale kritische Bestätigung und eine serverseitig noch gültige offene Reservierung.
- Das absolute manuelle Joblimit bleibt `ADMIN_CONTENT_JOB_RETRY_CAP = 5`.
- Für Job #1 darf ausschließlich die offene `seo_brief`-Reservierung verworfen werden; `topic_research` wird wiederverwendet.

---

### Task 1: Bereinigte Providerdiagnose dauerhaft speichern

**Files:**
- Modify: `repositories/contentErrorSanitizer.js`
- Modify: `services/contentAgent/draftPipeline.js`
- Test: `tests/contentErrorSanitizer.test.js`
- Test: `tests/contentAgentDraftPipeline.test.js`

**Interfaces:**
- Consumes: OpenAI-Fehlerobjekte mit optionalen Feldern `name`, `code`, `status`, `statusCode`, `requestID`, `request_id`, `responseId`.
- Produces: `error_report_json.providerDiagnostic` mit ausschließlich `provider`, `stage`, `errorName`, `code`, `httpStatus`, `requestId`, `responseId`.

- [ ] **Step 1: Failing Sanitizer tests schreiben**

Add tests proving that allowed fields survive and sensitive or unknown fields are removed:

```js
test('Fehlerbericht übernimmt nur bereinigte Providerdiagnosefelder', () => {
  const report = sanitizeErrorReport({
    code: 'provider_execution_uncertain',
    message: 'Manuelle Prüfung erforderlich.',
    providerDiagnostic: {
      provider: 'openai',
      stage: 'seo_brief',
      errorName: 'BadRequestError',
      code: 'invalid_json_schema',
      httpStatus: 400,
      requestId: 'req_123',
      responseId: 'resp_123',
      prompt: 'vertraulich',
      authorization: 'Bearer sk-vertraulich'
    }
  });

  assert.deepEqual(report.providerDiagnostic, {
    provider: 'openai',
    stage: 'seo_brief',
    errorName: 'BadRequestError',
    code: 'invalid_json_schema',
    httpStatus: 400,
    requestId: 'req_123',
    responseId: 'resp_123'
  });
  assert.doesNotMatch(JSON.stringify(report), /vertraulich|authorization|prompt/i);
});
```

- [ ] **Step 2: Sanitizer-Test rot ausführen**

Run: `node --test tests/contentErrorSanitizer.test.js`

Expected: FAIL, weil `providerDiagnostic` noch verworfen wird.

- [ ] **Step 3: Providerdiagnose im Sanitizer minimal freigeben**

Add a nested allow-list sanitizer:

```js
function sanitizeProviderDiagnostic(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const sanitized = {};
  for (const field of ['provider', 'stage', 'errorName', 'code', 'requestId', 'responseId']) {
    if (value[field] !== undefined && value[field] !== null) {
      sanitized[field] = sanitizeDiagnosticString(value[field]);
    }
  }
  const httpStatus = Number(value.httpStatus);
  if (Number.isInteger(httpStatus) && httpStatus >= 100 && httpStatus <= 599) {
    sanitized.httpStatus = httpStatus;
  }
  return Object.keys(sanitized).length > 0 ? sanitized : null;
}
```

In `sanitizeErrorReport`, attach only the sanitized nested object when non-null.

- [ ] **Step 4: Sanitizer-Test grün ausführen**

Run: `node --test tests/contentErrorSanitizer.test.js`

Expected: PASS.

- [ ] **Step 5: Failing Pipeline test für Diagnosepersistenz schreiben**

Add a pipeline test whose SEO-brief call throws an OpenAI-shaped error and assert the final run payload:

```js
test('unklarer Providerfehler persistiert nur sichere Diagnosefelder', async () => {
  const providerError = Object.assign(new Error('Authorization: Bearer sk-vertraulich'), {
    name: 'BadRequestError',
    code: 'invalid_json_schema',
    status: 400,
    requestID: 'req_123',
    responseId: 'resp_123',
    prompt: 'vertraulicher Prompt'
  });
  const base = createDependencies();
  const harness = createDependencies({
    openaiService: {
      ...base.dependencies.openaiService,
      async createSeoBrief() { throw providerError; }
    }
  });

  const result = await runDraftPipeline({ runId: 313 }, harness.dependencies);

  assert.equal(result.code, 'provider_execution_uncertain');
  assert.deepEqual(harness.finishCalls.at(-1).errorReport.providerDiagnostic, {
    provider: 'openai',
    stage: 'seo_brief',
    errorName: 'BadRequestError',
    code: 'invalid_json_schema',
    httpStatus: 400,
    requestId: 'req_123',
    responseId: 'resp_123'
  });
  assert.doesNotMatch(JSON.stringify(harness.finishCalls.at(-1)), /sk-vertraulich|vertraulicher Prompt/);
});
```

- [ ] **Step 6: Pipeline-Test rot ausführen**

Run: `node --test --test-name-pattern="unklarer Providerfehler persistiert nur sichere Diagnosefelder" tests/contentAgentDraftPipeline.test.js`

Expected: FAIL, weil `finishManual` noch keine Providerdiagnose übernimmt.

- [ ] **Step 7: Diagnose am Ursprungsfehler erzeugen und an `finishManual` übergeben**

Add a pure helper in `draftPipeline.js`:

```js
function providerErrorDiagnostic(error, stage) {
  const httpStatus = Number(error?.status ?? error?.statusCode ?? error?.response?.status);
  return {
    provider: 'openai',
    stage,
    errorName: error?.name || 'Error',
    code: error?.code || 'OPENAI_REQUEST_FAILED',
    ...(Number.isInteger(httpStatus) ? { httpStatus } : {}),
    requestId: error?.requestID ?? error?.request_id ?? null,
    responseId: error?.responseId ?? error?.response?.id ?? null
  };
}
```

Extend `stopForRecovery` and `finishManual` with `details = {}` and pass:

```js
return stopForRecovery(
  'provider_execution_uncertain',
  'Der Providerfehler lässt nicht sicher erkennen, ob der kostenpflichtige Aufruf ausgeführt wurde.',
  { providerDiagnostic: providerErrorDiagnostic(error, stageId) }
);
```

Ensure `finishRunRequired` receives `{ code, message, ...details }`.

- [ ] **Step 8: Pipeline- und Sanitizer-Tests grün ausführen**

Run: `node --test tests/contentErrorSanitizer.test.js tests/contentAgentDraftPipeline.test.js`

Expected: PASS.

- [ ] **Step 9: Task committen**

```bash
git add repositories/contentErrorSanitizer.js services/contentAgent/draftPipeline.js tests/contentErrorSanitizer.test.js tests/contentAgentDraftPipeline.test.js
git commit -m "fix: persist safe provider diagnostics"
```

---

### Task 2: Normale Retries sperren und Wiederherstellungsfähigkeit präsentieren

**Files:**
- Modify: `services/contentAgent/contentJobRetryPolicy.js`
- Modify: `repositories/contentAgentAdminRepository.js`
- Modify: `services/contentAgent/adminPresentationService.js`
- Test: `tests/contentAgentAdminPresentation.test.js`
- Test: `tests/contentAgentAdminRepository.test.js`

**Interfaces:**
- Consumes: `last_error`, `post_id`, `attempts` und vom SQL berechnete Felder `open_provider_reservation_count`, `open_provider_stage`.
- Produces: Viewmodel-Felder `canRetry`, `canRecoverProvider`, `providerRecoveryStageLabel`, `providerRecoveryActionLabel`.

- [ ] **Step 1: Failing Retryrichtlinien- und Präsentationstests schreiben**

Add tests:

```js
test('unklarer Providerausgang ist kein normaler Adminretry', () => {
  assert.equal(canRetryContentJobManually({
    jobType: 'generate_weekly_draft',
    status: 'needs_manual_attention',
    attempts: 4,
    lastError: 'provider_execution_uncertain'
  }), false);
});

test('Jobpräsentation bietet nur die bestätigte Providerwiederherstellung an', () => {
  const [job] = buildJobListPresentation([{
    id: 1,
    job_type: 'generate_weekly_draft',
    status: 'needs_manual_attention',
    attempts: 4,
    max_attempts: 4,
    last_error: 'provider_execution_uncertain',
    post_id: null,
    open_provider_reservation_count: 1,
    open_provider_stage: 'seo_brief'
  }]);
  assert.equal(job.canRetry, false);
  assert.equal(job.canRecoverProvider, true);
  assert.equal(job.providerRecoveryStageLabel, 'SEO-Briefing');
  assert.equal(job.providerRecoveryActionLabel, 'Reservierung verwerfen und SEO-Briefing erneut erstellen');
});
```

- [ ] **Step 2: Präsentationstests rot ausführen**

Run: `node --test tests/contentAgentAdminPresentation.test.js`

Expected: FAIL, weil die Richtlinie `lastError` ignoriert und die Wiederherstellungsfelder fehlen.

- [ ] **Step 3: Retryrichtlinie und separate Recoveryrichtlinie implementieren**

Change the normal policy signature and add:

```js
export function canRetryContentJobManually({ jobType, status, attempts, lastError } = {}) {
  const normalizedAttempts = Number(attempts);
  return lastError !== 'provider_execution_uncertain'
    && jobType !== ADMIN_REVIEW_NOTIFICATION_JOB
    && RETRYABLE_JOB_STATUSES.has(status)
    && Number.isSafeInteger(normalizedAttempts)
    && normalizedAttempts >= 0
    && normalizedAttempts < ADMIN_CONTENT_JOB_RETRY_CAP;
}

export function canRecoverUncertainProviderJob({
  jobType, status, attempts, lastError, postId, openReservationCount
} = {}) {
  return jobType !== ADMIN_REVIEW_NOTIFICATION_JOB
    && status === 'needs_manual_attention'
    && lastError === 'provider_execution_uncertain'
    && postId == null
    && Number(attempts) < ADMIN_CONTENT_JOB_RETRY_CAP
    && Number(openReservationCount) === 1;
}
```

Harden `retryContentJobForAdmin` independently of the UI by adding this compare-and-set predicate:

```sql
AND COALESCE(last_error, '') <> 'provider_execution_uncertain'
```

Extend the existing repository test with:

```js
assert.match(calls[0].sql, /COALESCE\(last_error, ''\) <> 'provider_execution_uncertain'/i);
```

Add a controller/repository result test in which the standard retry returns no row for this code and the controller responds with the existing safe conflict instead of queuing the job.

- [ ] **Step 4: Adminabfragen auf genau eine offene Reservierung begrenzen**

In both overview and job-list queries, add a lateral aggregate:

```sql
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int AS open_provider_reservation_count,
         MIN(substring(entry.key FROM '^budget:[0-9]{4}-[0-9]{2}:(.+)$'))
           AS open_provider_stage
  FROM jsonb_each(COALESCE(r.stage_results_json, '{}'::jsonb)) AS entry(key, value)
  WHERE entry.key ~ '^budget:[0-9]{4}-[0-9]{2}:.+$'
    AND entry.value ->> 'status' = 'reserved'
) provider_recovery ON TRUE
```

Select both aggregate fields. Do not expose `stage_results_json` itself.

- [ ] **Step 5: Repositorytest für sichere SQL-Projektion schreiben und rot/grün prüfen**

Add the following assertions to the `listJobs()` query test:

```js
const sql = calls.at(-1).sql.replace(/\s+/g, ' ');
assert.match(sql, /COUNT\(\*\)::int AS open_provider_reservation_count/i);
assert.match(sql, /AS open_provider_stage/i);
assert.match(sql, /entry\.value ->> 'status' = 'reserved'/i);
assert.doesNotMatch(sql.match(/^SELECT[\s\S]*?FROM content_jobs/i)?.[0] || '', /stage_results_json\s*(?:,|AS)/i);
```

Run before implementation: `node --test tests/contentAgentAdminRepository.test.js`

Expected before SQL change: FAIL.

Run after SQL change: `node --test tests/contentAgentAdminRepository.test.js`

Expected: PASS.

- [ ] **Step 6: Viewmodel auf getrennte Aktionen abbilden**

In `buildJobListPresentation`, pass `lastError` to the normal policy and compute:

```js
const canRecoverProvider = canRecoverUncertainProviderJob({
  jobType: row.job_type,
  status: row.status,
  attempts: row.attempts,
  lastError: row.last_error,
  postId: row.post_id,
  openReservationCount: row.open_provider_reservation_count
});
```

Map `seo_brief` to `SEO-Briefing`; for other known stages reuse `STAGE_LABELS`. Set the exact SEO action label from the approved design.

- [ ] **Step 7: Präsentations- und Repositorytests grün ausführen**

Run: `node --test tests/contentAgentAdminPresentation.test.js tests/contentAgentAdminRepository.test.js`

Expected: PASS.

- [ ] **Step 8: Task committen**

```bash
git add services/contentAgent/contentJobRetryPolicy.js repositories/contentAgentAdminRepository.js services/contentAgent/adminPresentationService.js tests/contentAgentAdminPresentation.test.js tests/contentAgentAdminRepository.test.js
git commit -m "fix: separate uncertain provider recovery"
```

---

### Task 3: Reservierung atomar auditieren, verwerfen und denselben Job einreihen

**Files:**
- Modify: `repositories/contentJobRepository.js`
- Test: `tests/contentAgentAdminController.test.js`
- Test: `tests/contentAgentPostgresIntegration.test.js`

**Interfaces:**
- Consumes: `recoverUncertainProviderJobForAdmin({ jobId, adminId }, db)`.
- Produces: bei Erfolg `{ job, runId, recoveredStage, reservationMonth, reservedCost, auditKey }`; bei jedem veralteten oder widersprüchlichen Zustand `null` ohne Mutation.

- [ ] **Step 1: Failing Repositorytests für Transaktion und Fail-Closed-Regeln schreiben**

Test the wished-for API with a transactional fake client. The valid fixture contains:

```js
{
  job: {
    id: 1,
    job_type: 'generate_weekly_draft',
    status: 'needs_manual_attention',
    attempts: 4,
    max_attempts: 4,
    last_error: 'provider_execution_uncertain'
  },
  run: {
    id: 1,
    status: 'needs_manual_attention',
    post_id: null,
    error_report_json: { code: 'provider_execution_uncertain' },
    stage_results_json: {
      'budget:2026-07:topic_research': {
        status: 'settled', reservationMonth: '2026-07', reservedCost: 0.5, actualCost: 0.086475
      },
      topic_research: { value: { candidates: [] } },
      'budget:2026-07:seo_brief': {
        status: 'reserved', reservationMonth: '2026-07', reservedCost: 0.5
      }
    },
    cost_estimate: 0.586475
  }
}
```

Assert `BEGIN`, `SELECT ... FOR UPDATE OF j, r`, run update, job update, `COMMIT`, and release. Use a table-driven test for every fail-closed case:

```js
for (const [label, mutate] of [
  ['ohne Reservierung', (state) => { delete state.run.stage_results_json['budget:2026-07:seo_brief']; }],
  ['mit zwei Reservierungen', (state) => {
    state.run.stage_results_json['budget:2026-07:article_generation'] = {
      status: 'reserved', reservationMonth: '2026-07', reservedCost: 0.5
    };
  }],
  ['mit vorhandenem Beitrag', (state) => { state.run.post_id = 99; }],
  ['mit anderem Fehler', (state) => { state.job.last_error = 'OPENAI_BAD_REQUEST'; }],
  ['mit anderem Laufstatus', (state) => { state.run.status = 'running'; }],
  ['am Adminlimit', (state) => { state.job.attempts = 5; state.job.max_attempts = 5; }]
]) {
  test(`Providerreservierung bleibt ${label} unverändert`, async () => {
    const fixture = providerRecoveryFixture();
    mutate(fixture);
    const db = transactionalRecoveryDb(fixture);
    const result = await recoverUncertainProviderJobForAdmin({ jobId: 1, adminId: 7 }, db);
    assert.equal(result, null);
    assert.equal(db.runUpdates, 0);
    assert.equal(db.jobUpdates, 0);
    assert.equal(db.commits, 1);
  });
}
```

- [ ] **Step 2: Repositorytests rot ausführen**

Run: `node --test --test-name-pattern="Providerreservierung" tests/contentAgentAdminController.test.js`

Expected: FAIL, weil `recoverUncertainProviderJobForAdmin` noch nicht existiert.

- [ ] **Step 3: Eingaben und Reservierungszustand mit reinen Helfern validieren**

Add helpers that require positive safe integer IDs and extract exactly one open key matching:

```js
const BUDGET_RESERVATION_KEY = /^budget:(\d{4}-(?:0[1-9]|1[0-2])):(.+)$/;

function singleOpenProviderReservation(stageResults) {
  const matches = Object.entries(stageResults || {}).flatMap(([key, value]) => {
    const match = BUDGET_RESERVATION_KEY.exec(key);
    if (!match || value?.status !== 'reserved') return [];
    const reservedCost = Number(value.reservedCost);
    if (!Number.isFinite(reservedCost) || reservedCost < 0) return [];
    return [{ key, reservationMonth: match[1], stageId: match[2], reservedCost }];
  });
  return matches.length === 1 ? matches[0] : null;
}
```

- [ ] **Step 4: Transaktionale Wiederherstellungsfunktion implementieren**

Implement `recoverUncertainProviderJobForAdmin({ jobId, adminId }, db = pool)`:

1. `BEGIN`.
2. Lock joined job/run with `FOR UPDATE OF j, r`.
3. Validate exact job/run/error/post/attempt state.
4. Extract exactly one reservation.
5. Build deterministic audit key `provider_recovery:<reservationMonth>:<stageId>:attempt-<attempts>`.
6. Update the run using JSONB subtraction plus an audit object:

```sql
UPDATE content_runs
SET stage_results_json =
      (stage_results_json - $2::text)
      || jsonb_build_object(
        $3::text,
        jsonb_build_object(
          'status', 'abandoned_uncertain',
          'stageId', $4::text,
          'reservationMonth', $5::text,
          'reservedCost', $6::numeric,
          'adminId', $7::bigint,
          'abandonedAt', NOW()
        )
      ),
    cost_estimate = GREATEST(0, cost_estimate - $6::numeric),
    error_report_json = jsonb_build_object(
      'code', 'provider_recovery_authorized',
      'stage', $4::text,
      'message', 'Die unklare Providerreservierung wurde durch einen Administrator zur Wiederholung freigegeben.'
    ),
    finished_at = NULL
WHERE id = $1
RETURNING *
```

7. Requeue the same job, clear lease/error/finished fields, and extend `max_attempts` by one up to cap 5.
8. `COMMIT`; on any exception `ROLLBACK`; always release client.

Do not reset `attempts`, delete settled entries, clear topic IDs, or create another job.

- [ ] **Step 5: Repositorytests grün ausführen**

Run: `node --test --test-name-pattern="Providerreservierung" tests/contentAgentAdminController.test.js`

Expected: PASS.

- [ ] **Step 6: Echten PostgreSQL-Integrationstest schreiben**

Import the new repository function. In a guarded test schema, run the existing migrations, insert one job/run with the fixture above, call the function, and assert:

```js
assert.equal(result.recoveredStage, 'seo_brief');
assert.equal(job.rows[0].status, 'queued');
assert.equal(job.rows[0].attempts, 4);
assert.equal(job.rows[0].max_attempts, 5);
assert.equal(run.rows[0].stage_results_json.topic_research.value.candidates.length, 0);
assert.equal(run.rows[0].stage_results_json['budget:2026-07:seo_brief'], undefined);
assert.equal(Number(run.rows[0].cost_estimate), 0.086475);
assert.equal(recoveryAudit.status, 'abandoned_uncertain');
```

Call the function a second time and assert `null` with no second audit or job mutation.

- [ ] **Step 7: PostgreSQL-Integrationstest ausführen**

Run with the existing guarded PostgreSQL test environment:

```bash
CONTENT_AGENT_PG_TEST_URL="$CONTENT_AGENT_PG_TEST_URL" \
CONTENT_AGENT_PG_TEST_ALLOW_RESET=true \
CONTENT_AGENT_PG_TEST_TOKEN="$CONTENT_AGENT_PG_TEST_TOKEN" \
node --test --test-name-pattern="unklare Providerreservierung" tests/contentAgentPostgresIntegration.test.js
```

Expected: PASS. If the guarded environment variables are unavailable locally, record the skip and execute this test against the existing isolated PostgreSQL test container before deployment.

- [ ] **Step 8: Task committen**

```bash
git add repositories/contentJobRepository.js tests/contentAgentAdminController.test.js tests/contentAgentPostgresIntegration.test.js
git commit -m "fix: recover uncertain provider reservations"
```

---

### Task 4: Bestätigte Adminaktion und sichere Oberfläche anbinden

**Files:**
- Modify: `controllers/adminContentAgentController.js`
- Modify: `routes/adminContentAgentRoutes.js`
- Modify: `views/admin/contentAgent/jobs.ejs`
- Test: `tests/contentAgentAdminController.test.js`
- Test: `tests/contentAgentAdminViews.test.js`

**Interfaces:**
- Consumes: POST `/admin/content-agent/jobs/:id/recover-provider` with CSRF token and `confirmed=true`.
- Produces: redirect `/admin/content-agent/jobs?provider-recovery=queued` or a safe 400/409 response.

- [ ] **Step 1: Failing Controller-, Routen- und Viewtests schreiben**

Add controller tests proving that missing confirmation never reaches the repository and valid confirmation passes canonical job/admin IDs:

```js
test('Providerwiederherstellung verlangt literale Bestätigung', async () => {
  let calls = 0;
  const controller = createAdminContentAgentController(baseDependencies({
    jobRepository: { async recoverUncertainProviderJobForAdmin() { calls += 1; } }
  }));
  const res = response();
  await controller.recoverProviderJobAction({
    params: { id: '1' }, body: {}, session: { user: { id: 7 } }
  }, res, assert.fail);
  assert.equal(calls, 0);
  assert.equal(res.statusCode, 400);
});
```

Add view assertions for the CSRF form, hidden literal confirmation, exact action URL, exact button label, explicit duplicate-cost warning, and absence of `/retry`.

- [ ] **Step 2: Adminschichttests rot ausführen**

Run: `node --test tests/contentAgentAdminController.test.js tests/contentAgentAdminViews.test.js`

Expected: FAIL because route, controller action, and view form do not exist.

- [ ] **Step 3: Sichere Fehlercodes ergänzen**

Add `CONTENT_PROVIDER_RECOVERY_NOT_AVAILABLE` to `CONFLICT_CODES` and `SAFE_ERROR_MESSAGES`. Reuse `CONTENT_CONFIRMATION_REQUIRED` for a missing confirmation.

- [ ] **Step 4: Controlleraktion implementieren**

Add:

```js
async recoverProviderJobAction(req, res, next) {
  try {
    if (!criticalConfirmation(req.body?.confirmed)) {
      throw Object.assign(new Error('Bestätigung fehlt.'), {
        code: 'CONTENT_CONFIRMATION_REQUIRED'
      });
    }
    const admin = adminFromRequest(req);
    const recovered = await jobRepository.recoverUncertainProviderJobForAdmin({
      jobId: positiveId(req.params.id),
      adminId: positiveId(admin.id)
    });
    if (!recovered) {
      throw Object.assign(new Error('Providerwiederherstellung nicht verfügbar.'), {
        code: 'CONTENT_PROVIDER_RECOVERY_NOT_AVAILABLE'
      });
    }
    return res.redirect('/admin/content-agent/jobs?provider-recovery=queued');
  } catch (error) {
    return sendKnownError(error, res, next);
  }
}
```

- [ ] **Step 5: Route und Produktionsdependency verdrahten**

Import `recoverUncertainProviderJobForAdmin`, add it to `jobRepository`, and register:

```js
router.post(
  '/admin/content-agent/jobs/:id/recover-provider',
  isAdmin,
  verifyCsrfToken,
  controller.recoverProviderJobAction
);
```

- [ ] **Step 6: Jobansicht auf gegenseitig ausschließende Aktionen umstellen**

Render the recovery block only for `job.canRecoverProvider === true`:

```ejs
<% if (job.canRecoverProvider === true) { %>
  <div class="alert alert-warning" role="alert">
    Der vorherige OpenAI-Aufruf könnte bereits berechnet worden sein. Die erneute Ausführung kann zusätzliche Kosten verursachen.
  </div>
  <form method="post"
        action="/admin/content-agent/jobs/<%= job.id %>/recover-provider"
        data-confirm="Der frühere OpenAI-Aufruf könnte bereits berechnet worden sein. Reservierung wirklich verwerfen und diese Stufe kostenpflichtig erneut ausführen?">
    <input type="hidden" name="_csrf" value="<%= csrf %>">
    <input type="hidden" name="confirmed" value="true">
    <button type="submit" class="btn btn-sm btn-warning">
      <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
      <%= job.providerRecoveryActionLabel %>
    </button>
  </form>
<% } %>
```

Normal retry remains guarded only by `job.canRetry === true`. Never infer capabilities inside the EJS template.

- [ ] **Step 7: Adminschichttests grün ausführen**

Run: `node --test tests/contentAgentAdminController.test.js tests/contentAgentAdminViews.test.js tests/contentAgentAdminPresentation.test.js`

Expected: PASS.

- [ ] **Step 8: Task committen**

```bash
git add controllers/adminContentAgentController.js routes/adminContentAgentRoutes.js views/admin/contentAgent/jobs.ejs tests/contentAgentAdminController.test.js tests/contentAgentAdminViews.test.js
git commit -m "feat: add confirmed provider recovery action"
```

---

### Task 5: Gesamtprüfung, Bereitstellung und kontrollierte Wiederaufnahme von Job #1

**Files:**
- Modify only if verification exposes a defect: files from Tasks 1–4 with a new failing regression test first.
- Verify: complete repository and IONOS-VPS runtime.

**Interfaces:**
- Consumes: completed branch and the existing production Job #1.
- Produces: an unpublished post linked to run/job #1, or a precise new manual error with persisted provider diagnostics.

- [ ] **Step 1: Gezielte Tests ausführen**

Run:

```bash
node --test \
  tests/contentErrorSanitizer.test.js \
  tests/contentAgentDraftPipeline.test.js \
  tests/contentAgentAdminPresentation.test.js \
  tests/contentAgentAdminRepository.test.js \
  tests/contentAgentAdminController.test.js \
  tests/contentAgentAdminViews.test.js
```

Expected: all tests pass, zero failures.

- [ ] **Step 2: Vollständige Suite und Build ausführen**

Run:

```bash
npm test
npm run build
git diff --check
git status --short
```

Expected: zero test failures, build exit 0, no whitespace errors, only intended changes.

- [ ] **Step 3: Implementierung committen, aber nur nach frischer Verifikation**

If verification required no additional commit, confirm all task commits are present. Otherwise commit the test-first correction with a focused message.

- [ ] **Step 4: Vor Produktionsänderung Job #1 schreibgeschützt prüfen**

From `/home/webadmin/apps/komplettwebdesign`, query Job #1 and require all of:

```text
job.status = needs_manual_attention
job.last_error = provider_execution_uncertain
job.attempts = 4
run.status = needs_manual_attention
run.post_id IS NULL
exactly one reserved budget key
reserved stage = seo_brief
topic_research result present
```

If any condition differs, stop without mutation.

- [ ] **Step 5: Branch nach ausdrücklicher Pushfreigabe bereitstellen**

Push/merge only after the user authorizes publication of the code. The existing deployment webhook rebuilds `app` and `content-worker`; no `.env`, Docker-Compose, or database migration change is required for this feature.

- [ ] **Step 6: Neue bestätigte Wiederherstellungsaktion für Job #1 ausführen**

Use the same repository function as the admin POST action from the deployed `app` container with `jobId: 1` and the actual admin ID. Do not modify JSONB manually with ad-hoc SQL.

- [ ] **Step 7: Worker zustandsbasiert beobachten**

Poll Job #1, run #1, provider diagnostics, and post linkage at short intervals without arbitrary long sleeps. Stop at one of:

- `completed` with `post_id` present,
- `needs_manual_attention` with a new precise error,
- `failed`,
- lost/expired lease requiring investigation.

- [ ] **Step 8: Erfolgszustand und Entwurfsgrenzen verifizieren**

Require:

```text
content_jobs.status = completed
content_runs.status = completed
content_runs.post_id IS NOT NULL
posts.generated_by_ai = TRUE
posts.content_format = static_html
posts.published = FALSE
posts.workflow_status = needs_review
```

Also verify that the admin-review notification job exists or its safe failure is separately visible. Do not approve, schedule, or publish the draft automatically.

- [ ] **Step 9: Ergebnis berichten**

Report the draft title, admin review location, final confirmed Content-Agent cost, whether the admin notification was sent, and any remaining manual review requirement. Never expose prompts, API keys, response bodies, or raw database JSON.
