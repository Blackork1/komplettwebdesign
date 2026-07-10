# Content-Agent Adminprüfung und Bestandsaudit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generierte Entwürfe im bestehenden Adminbereich vollständig prüfen, gezielt überarbeiten, planen oder manuell veröffentlichen und alle vorhandenen Blogartikel ohne automatische Änderungen auditieren.

**Architecture:** Adminaktionen schreiben Zustände oder neue Queuejobs in PostgreSQL; lange KI-Aufrufe laufen weiterhin ausschließlich im Content-Worker. Veröffentlichte Artikel werden nie direkt von der KI überschrieben, sondern erhalten eine getrennte Revision. Slugänderungen veröffentlichter Beiträge sind nur zusammen mit einer 301-Weiterleitung erlaubt.

**Tech Stack:** Node.js 20, Express 5, EJS, PostgreSQL 16, node:test, vorhandene Session-Adminauthentifizierung, vorhandener CSRF-Schutz, Content-Agent-Fundament aus Plan A.

## Global Constraints

- Plan A ist vollständig implementiert und alle Tests sind grün.
- Alle schreibenden Adminrouten verwenden `isAdmin` und `verifyCsrfToken`.
- KI-Entwürfe bleiben unveröffentlicht, bis eine Adminaktion `publishDraft` aufruft.
- Bestehende Artikel werden im Audit niemals automatisch verändert.
- Sichtbarer deutscher Text verwendet korrekte Umlaute.
- Eine Slugänderung an einem veröffentlichten Artikel braucht in derselben Transaktion einen Redirect.
- Jeder Task beginnt mit einem fehlschlagenden Test und endet mit einem Commit.

---

### Task 1: Audit-, Revisions- und Redirecttabellen

**Files:**
- Create: `scripts/migrations/003_create_content_agent_admin_audit.sql`
- Create: `scripts/runContentAgentAdminMigration.js`
- Modify: `package.json`
- Test: `tests/contentAgentAdminMigration.test.js`

**Interfaces:**
- Produces: `content_post_revisions`, `content_audits` und `blog_slug_redirects`.

- [ ] **Step 1: Fehlschlagenden Migrationstest schreiben**

~~~js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync(
  new URL('../scripts/migrations/003_create_content_agent_admin_audit.sql', import.meta.url),
  'utf8'
);

test('admin audit migration creates revision audit and redirect tables', () => {
  assert.match(sql, /CREATE TABLE IF NOT EXISTS content_post_revisions/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS content_audits/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS blog_slug_redirects/i);
  assert.match(sql, /old_slug VARCHAR\(255\) NOT NULL UNIQUE/i);
});
~~~

- [ ] **Step 2: Test ausführen**

Run: `node --test tests/contentAgentAdminMigration.test.js`  
Expected: FAIL mit `ENOENT`.

- [ ] **Step 3: Migration implementieren**

~~~sql
CREATE TABLE IF NOT EXISTS content_post_revisions (
  id BIGSERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  source_job_id BIGINT REFERENCES content_jobs(id) ON DELETE SET NULL,
  revision_type VARCHAR(64) NOT NULL,
  snapshot_json JSONB NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_content_post_revisions_post
  ON content_post_revisions (post_id, created_at DESC);

CREATE TABLE IF NOT EXISTS content_audits (
  id BIGSERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  run_id BIGINT REFERENCES content_runs(id) ON DELETE SET NULL,
  audit_type VARCHAR(64) NOT NULL,
  score INTEGER NOT NULL,
  findings_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommended_actions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  resolution_status VARCHAR(32) NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_content_audits_priority
  ON content_audits (resolution_status, score, created_at DESC);

CREATE TABLE IF NOT EXISTS blog_slug_redirects (
  id BIGSERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  old_slug VARCHAR(255) NOT NULL UNIQUE,
  new_slug VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  CHECK (old_slug <> new_slug)
);
~~~

- [ ] **Step 4: Runner und npm-Skript ergänzen**

Runner entspricht dem Transaktions- und Advisory-Lock-Muster aus `runContentAgentMigration.js`, liest aber Migration 003. npm-Skript:

~~~json
"migrate:content-agent-admin": "node scripts/runContentAgentAdminMigration.js"
~~~

- [ ] **Step 5: Tests ausführen und committen**

Run: `node --test tests/contentAgentAdminMigration.test.js && npm test`  
Expected: alle Tests PASS.

~~~bash
git add scripts/migrations/003_create_content_agent_admin_audit.sql scripts/runContentAgentAdminMigration.js package.json tests/contentAgentAdminMigration.test.js
git commit -m "feat: add content review and audit schema"
~~~

### Task 2: Adminrepository und Dashboarddaten

**Files:**
- Create: `repositories/contentAdminRepository.js`
- Test: `tests/contentAdminRepository.test.js`

**Interfaces:**
- Produces: `getContentAgentDashboard`, `getReviewPost`, `listTopicCandidates`, `listRecentRuns`, `listAuditFindings` und `getWorkerState`.

- [ ] **Step 1: Fehlschlagenden Repositorytest schreiben**

Der Test injiziert `db.query` und prüft, dass Dashboardlisten keine vollständigen Artikelinhalte oder Promptpayloads laden.

- [ ] **Step 2: Test ausführen**

Run: `node --test tests/contentAdminRepository.test.js`  
Expected: FAIL mit `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Dashboardabfragen implementieren**

`getContentAgentDashboard` führt kompakte Abfragen parallel aus:

~~~sql
SELECT id, job_type, status, attempts, run_after, last_error, created_at, finished_at
FROM content_jobs
ORDER BY created_at DESC
LIMIT 30;

SELECT id, title, slug, workflow_status, image_url, created_at
FROM posts
WHERE generated_by_ai = true AND published = false
ORDER BY created_at DESC
LIMIT 30;

SELECT id, status, current_stage, selected_topic_id, post_id, cost_estimate, started_at, finished_at
FROM content_runs
ORDER BY started_at DESC
LIMIT 30;
~~~

- [ ] **Step 4: Reviewabfrage implementieren**

`getReviewPost(id)` verbindet `posts`, `content_post_metadata`, den letzten `content_run` und eine offene Revision. JSONB-Felder werden als Objekte zurückgegeben.

- [ ] **Step 5: Tests ausführen und committen**

Run: `node --test tests/contentAdminRepository.test.js`  
Expected: alle Tests PASS.

~~~bash
git add repositories/contentAdminRepository.js tests/contentAdminRepository.test.js
git commit -m "feat: query content agent admin data"
~~~

### Task 3: Geschützte Adminrouten und Jobaktionen

**Files:**
- Create: `routes/adminContentAgentRoutes.js`
- Create: `controllers/adminContentAgentController.js`
- Modify: `repositories/contentJobRepository.js`
- Modify: `index.js`
- Modify: `views/admin/dashboard.ejs`
- Test: `tests/adminContentAgentRoutes.test.js`

**Interfaces:**
- Produces: Dashboard-, Review-, Enqueue-, Retry-, Reject-, Publish- und Schedule-Routen.

- [ ] **Step 1: Fehlschlagenden Routentest schreiben**

~~~js
assert.match(routes, /router\.get\('\/admin\/content-agent'/);
assert.match(routes, /router\.post\('\/admin\/content-agent\/jobs'/);
assert.match(routes, /router\.post\('\/admin\/content-agent\/posts\/:id\/publish'/);
assert.match(routes, /router\.post\('\/admin\/content-agent\/posts\/:id\/schedule'/);
assert.match(routes, /isAdmin,\s*verifyCsrfToken/);
assert.match(indexSource, /adminContentAgentRoutes/);
~~~

- [ ] **Step 2: Test ausführen**

Run: `node --test tests/adminContentAgentRoutes.test.js`  
Expected: FAIL.

- [ ] **Step 3: Router implementieren**

Alle GET-Routen verwenden `isAdmin`. Alle POST-Routen verwenden `isAdmin` und `verifyCsrfToken`. Freigegebene Routen:

~~~text
GET  /admin/content-agent
GET  /admin/content-agent/posts/:id/review
POST /admin/content-agent/jobs
POST /admin/content-agent/jobs/:id/retry
POST /admin/content-agent/posts/:id/reject
POST /admin/content-agent/posts/:id/publish
POST /admin/content-agent/posts/:id/schedule
POST /admin/content-agent/posts/:id/regenerate
~~~

- [ ] **Step 4: Controller für reine Queueaktionen implementieren**

`createJobAction` akzeptiert nur `generate_manual_draft`, `audit_existing_posts`, `regenerate_article`, `regenerate_metadata`, `regenerate_faq` und `regenerate_image`. Der Server erzeugt den Idempotenzschlüssel; der Browser darf ihn nicht vorgeben.

`retryJob(id)` setzt ausschließlich `failed` und `needs_manual_attention` auf `queued` zurück, löscht Lease und Fehler und setzt `run_after = NOW()`. Abgeschlossene oder laufende Jobs liefern einen Konflikt.

- [ ] **Step 5: Route mounten und Dashboardlink ergänzen**

`index.js` mountet `adminContentAgentRoutes` bei den übrigen Adminrouten. `views/admin/dashboard.ejs` erhält den Link „Content-Agent“.

- [ ] **Step 6: Tests ausführen und committen**

Run: `node --test tests/adminContentAgentRoutes.test.js && npm test`  
Expected: alle Tests PASS.

~~~bash
git add routes/adminContentAgentRoutes.js controllers/adminContentAgentController.js repositories/contentJobRepository.js index.js views/admin/dashboard.ejs tests/adminContentAgentRoutes.test.js
git commit -m "feat: add protected content agent admin routes"
~~~

### Task 4: Dashboard und Entwurfsreview

**Files:**
- Create: `views/admin/content_agent_dashboard.ejs`
- Create: `views/admin/content_agent_review.ejs`
- Create: `public/js/admin-content-agent.js`
- Modify: `helpers/cssHelper.js`
- Test: `tests/adminContentAgentViews.test.js`

**Interfaces:**
- Consumes: Daten aus `adminContentAgentController`.
- Produces: Bootstrap-basierte Übersicht und sichere Artikelvorschau.

- [ ] **Step 1: Fehlschlagenden Viewtest schreiben**

~~~js
assert.match(dashboard, /Nächster geplanter Lauf/);
assert.match(dashboard, /Themenvorschläge/);
assert.match(review, /Meta Title/);
assert.match(review, /Qualitätswert/);
assert.match(review, /Verwendete Quellen/);
assert.match(review, /name="_csrf"/);
assert.match(review, /Veröffentlichen/);
assert.match(review, /Bild neu generieren/);
~~~

- [ ] **Step 2: Test ausführen**

Run: `node --test tests/adminContentAgentViews.test.js`  
Expected: FAIL mit `ENOENT`.

- [ ] **Step 3: Dashboard implementieren**

Bootstrap-Karten zeigen Workerstatus, nächsten Cronlauf, Queue, Entwürfe, Themen, Kosten und Auditfortschritt. Fehlertexte werden mit `<%= value %>` escaped ausgegeben.

- [ ] **Step 4: Reviewseite implementieren**

Die Vorschau rendert ausschließlich das bereits sanitiserte `static_html`. Rohes Modelloutput wird nicht ausgegeben. Formulare besitzen CSRF-Token und getrennte Buttons für Veröffentlichung, Planung, Ablehnung sowie gezielte Regenerierung.

- [ ] **Step 5: Zeichenzähler implementieren**

`admin-content-agent.js` zählt Meta Title und Meta Description, verändert aber keine Daten. Grenzwerte sind 60 und 160 Zeichen.

- [ ] **Step 6: Tests ausführen und committen**

Run: `node --test tests/adminContentAgentViews.test.js && npm run build`  
Expected: Tests und Build PASS.

~~~bash
git add views/admin/content_agent_dashboard.ejs views/admin/content_agent_review.ejs public/js/admin-content-agent.js helpers/cssHelper.js tests/adminContentAgentViews.test.js
git commit -m "feat: review generated content in admin"
~~~

### Task 5: Manuelles Veröffentlichen, Planen und Ablehnen

**Files:**
- Create: `services/contentAgent/contentPublicationService.js`
- Modify: `models/BlogPostModel.js`
- Modify: `controllers/adminContentAgentController.js`
- Test: `tests/contentPublicationService.test.js`

**Interfaces:**
- Produces: `publishDraft({ postId, userId, db })`, `scheduleDraft` und `rejectDraft`.

- [ ] **Step 1: Fehlschlagende Zustandstests schreiben**

Prüfen: nur `needs_review` und `approved` dürfen veröffentlicht werden; Veröffentlichung setzt `published = true`, `workflow_status = 'published'`, `published_at`, `reviewed_at` und `reviewed_by` in einer Transaktion.

- [ ] **Step 2: Test ausführen**

Run: `node --test tests/contentPublicationService.test.js`  
Expected: FAIL.

- [ ] **Step 3: Publikationsservice implementieren**

~~~sql
UPDATE posts
SET published = true,
    workflow_status = 'published',
    published_at = COALESCE(published_at, NOW()),
    reviewed_at = NOW(),
    reviewed_by = $2,
    updated_at = NOW()
WHERE id = $1
  AND published = false
  AND workflow_status IN ('needs_review', 'approved')
RETURNING *;
~~~

`scheduleDraft` verlangt einen zukünftigen ISO-Zeitpunkt und setzt `workflow_status = 'scheduled'`, `scheduled_at` und `reviewed_by`. `rejectDraft` setzt `workflow_status = 'rejected'` und veröffentlicht nicht.

- [ ] **Step 4: Controller anbinden**

Erfolg leitet auf Review oder Dashboard zurück. Ungültiger Zustand liefert HTTP 409, fehlender Post HTTP 404, Validierungsfehler HTTP 400.

- [ ] **Step 5: Tests ausführen und committen**

Run: `node --test tests/contentPublicationService.test.js && npm test`  
Expected: alle Tests PASS.

~~~bash
git add services/contentAgent/contentPublicationService.js models/BlogPostModel.js controllers/adminContentAgentController.js tests/contentPublicationService.test.js
git commit -m "feat: publish content drafts manually"
~~~

### Task 6: Revisionen veröffentlichter Artikel

**Files:**
- Create: `repositories/contentRevisionRepository.js`
- Create: `services/contentAgent/contentRevisionService.js`
- Modify: `services/contentAgent/draftPipeline.js`
- Modify: `controllers/adminContentAgentController.js`
- Test: `tests/contentRevisionService.test.js`

**Interfaces:**
- Produces: `createRevision`, `approveRevision` und `rejectRevision`.

- [ ] **Step 1: Fehlschlagenden Revisionstest schreiben**

Prüfen: Regeneration eines veröffentlichten Posts verändert `posts` nicht, sondern speichert `snapshot_json`; Freigabe ersetzt erlaubte Felder und markiert Revision `approved`.

- [ ] **Step 2: Test ausführen**

Run: `node --test tests/contentRevisionService.test.js`  
Expected: FAIL.

- [ ] **Step 3: Revisionen implementieren**

Zulässige Snapshotfelder: `title`, `excerpt`, `content`, `meta_title`, `meta_description`, `og_title`, `og_description`, `faq_json`, `image_url`, `image_alt` und `hero_public_id`. `published`, Benutzer-IDs und Zeitstempel dürfen nicht aus `snapshot_json` übernommen werden.

- [ ] **Step 4: Freigabetransaktion implementieren**

Post aktualisieren, Revision auf `approved` setzen und `approved_by` sowie `approved_at` speichern. Bei neuem Bild wird das alte Cloudinary-Bild erst nach erfolgreichem Datenbankcommit als separater Cleanup-Schritt gelöscht.

- [ ] **Step 5: Tests ausführen und committen**

Run: `node --test tests/contentRevisionService.test.js`  
Expected: alle Tests PASS.

~~~bash
git add repositories/contentRevisionRepository.js services/contentAgent/contentRevisionService.js services/contentAgent/draftPipeline.js controllers/adminContentAgentController.js tests/contentRevisionService.test.js
git commit -m "feat: review revisions before replacing posts"
~~~

### Task 7: Bestandsaudit der 34 Artikel

**Files:**
- Create: `services/contentAgent/legacyAuditService.js`
- Create: `services/contentAgent/prompts/legacyAuditPrompt.js`
- Create: `repositories/contentAuditRepository.js`
- Modify: `services/contentAgent/articleSchemas.js`
- Modify: `services/contentAgent/workerService.js`
- Test: `tests/contentLegacyAudit.test.js`

**Interfaces:**
- Produces: `runLegacyAudit({ post, inventory, reviewer })` und `auditExistingPostsJob(job)`.

- [ ] **Step 1: Fehlschlagenden Audittest schreiben**

Fixture mit H1, fehlendem Alt-Text, Jahreszahl 2025, null Kontaktlinks und ähnlichem vorhandenen Titel verwenden. Erwartete Finding-Codes: `duplicate_h1`, `missing_image_alt`, `stale_year`, `missing_cta` und `cannibalization_risk`.

- [ ] **Step 2: Test ausführen**

Run: `node --test tests/contentLegacyAudit.test.js`  
Expected: FAIL.

- [ ] **Step 3: Deterministischen Audit implementieren**

Prüfen: H1, CTA, interne Links, FAQ-Anzahl, Meta-Längen, Alt-Text, Jahreszahlen, Slugformat, Wortumfang, Quellenbedarf und technische Kundennähe.

- [ ] **Step 4: Redaktionellen Audit ergänzen**

Reviewer erhält nur Artikelzusammenfassung, Überschriften, Links und Inventarvergleich. Er gibt `score`, priorisierte Findings und konkrete Empfehlungen als Structured Output zurück.

`AuditOutputSchema`:

~~~js
export const AuditOutputSchema = z.object({
  score: z.number().int().min(0).max(100),
  findings: z.array(z.object({
    code: z.string().min(3),
    priority: z.enum(['critical', 'high', 'medium', 'low']),
    message: z.string().min(10),
    evidence: z.string().min(3)
  })),
  recommendedActions: z.array(z.object({
    action: z.string().min(10),
    reason: z.string().min(10)
  }))
}).strict();
~~~

- [ ] **Step 5: Batchjob implementieren**

Alle veröffentlichten Posts sequentiell auditieren. Nach jedem Post Ergebnis speichern und Fortschritt in `content_runs.stage_results_json` aktualisieren. Ein einzelner Fehler stoppt nicht den gesamten Audit; er wird als Finding `audit_failed` gespeichert.

- [ ] **Step 6: Tests ausführen und committen**

Run: `node --test tests/contentLegacyAudit.test.js && npm test`  
Expected: alle Tests PASS.

~~~bash
git add services/contentAgent/legacyAuditService.js services/contentAgent/prompts/legacyAuditPrompt.js repositories/contentAuditRepository.js services/contentAgent/articleSchemas.js services/contentAgent/workerService.js tests/contentLegacyAudit.test.js
git commit -m "feat: audit existing blog content"
~~~

### Task 8: Sichere Slugänderungen und 301-Weiterleitungen

**Files:**
- Create: `repositories/blogRedirectRepository.js`
- Create: `services/contentAgent/blogSlugService.js`
- Modify: `controllers/blogController.js`
- Modify: `controllers/adminContentAgentController.js`
- Test: `tests/blogSlugRedirect.test.js`

**Interfaces:**
- Produces: `changePublishedSlug` und `findBlogRedirect`.

- [ ] **Step 1: Fehlschlagenden Redirecttest schreiben**

Prüfen: Slugänderung speichert alten und neuen Slug in derselben Transaktion; Aufruf des alten Slugs antwortet mit HTTP 301 auf `/blog/neuer-slug`.

- [ ] **Step 2: Test ausführen**

Run: `node --test tests/blogSlugRedirect.test.js`  
Expected: FAIL.

- [ ] **Step 3: Slugservice implementieren**

Neuen Slug mit `slugify(title, { lower: true, strict: true })` oder explizitem ASCII-Slug validieren, Eindeutigkeit prüfen, Redirect einfügen und Post aktualisieren. Konflikte liefern einen fachlichen Fehler.

- [ ] **Step 4: Öffentlichen Fallback implementieren**

Wenn `findBySlug` keinen veröffentlichten Post findet, `findBlogRedirect` abfragen. Treffer: `res.redirect(301, '/blog/' + redirect.new_slug)`. Kein Treffer: bestehendes 404-Verhalten.

- [ ] **Step 5: Abschlussprüfung und Commit**

Run: `node --test tests/blogSlugRedirect.test.js tests/adminContentAgentRoutes.test.js tests/contentLegacyAudit.test.js && npm run build && npm test`  
Expected: alle Tests und Build PASS.

~~~bash
git add repositories/blogRedirectRepository.js services/contentAgent/blogSlugService.js controllers/blogController.js controllers/adminContentAgentController.js tests/blogSlugRedirect.test.js
git commit -m "feat: preserve blog urls with redirects"
~~~

## Plan-B-Abnahme

- [ ] Ein KI-Entwurf ist im Adminbereich vollständig prüfbar.
- [ ] Veröffentlichung ist ausschließlich per geschützter Adminaktion möglich.
- [ ] Planung setzt keinen Artikel vorzeitig live.
- [ ] Regeneration veröffentlichter Inhalte erzeugt eine Revision.
- [ ] Audit erzeugt für alle 34 Artikel Berichte und verändert keinen Artikel.
- [ ] Alter Slug leitet nach freigegebener Änderung permanent weiter.
- [ ] `npm test` und `npm run build` sind vollständig erfolgreich.
