import pool from '../util/db.js';

function splitDraftRow(row) {
  if (!row) return null;
  const { metadata, ...post } = row;
  return { post, metadata: metadata || null };
}

function queryTarget(client, fallback) {
  return client && typeof client.query === 'function' ? client : fallback;
}

export function createContentPublishEventRepository(db = pool) {
  return {
    async assertScheduleSettingsSnapshot({ scheduleRevision, timezone }, client) {
      const target = queryTarget(client, db);
      const { rows } = await target.query(`
        SELECT schedule_revision, timezone
        FROM content_agent_settings
        WHERE id = 1
        FOR SHARE
      `);
      return Number(rows[0]?.schedule_revision) === Number(scheduleRevision)
        && rows[0]?.timezone === timezone;
    },

    async getDraftWithMetadataForUpdate(postId, client) {
      const target = queryTarget(client, db);
      await target.query('LOCK TABLE posts IN SHARE ROW EXCLUSIVE MODE');
      const { rows } = await target.query(`
        SELECT p.*, to_jsonb(m) AS metadata
        FROM posts p
        JOIN content_post_metadata m ON m.post_id = p.id
        WHERE p.id = $1
        FOR UPDATE OF p
      `, [postId]);
      return splitDraftRow(rows[0]);
    },

    async getValidationContext(postId, current, client) {
      const target = queryTarget(client, db);
      const { rows } = await target.query(
        'SELECT slug FROM posts WHERE id <> $1 ORDER BY id',
        [postId]
      );
      const metadata = current?.metadata || {};
      return {
        existingSlugs: rows.map(({ slug }) => slug).filter(Boolean),
        allowedInternalLinks: metadata.internal_links_json,
        sourceReferences: Array.isArray(metadata.source_references_json)
          ? metadata.source_references_json
          : []
      };
    },

    async updateFocusedReview({ postId, focusedReview, expectedReviewVersion }, client) {
      const target = queryTarget(client, db);
      const { rows } = await target.query(`
        UPDATE content_post_metadata metadata
        SET quality_report_json = jsonb_set(
              COALESCE(metadata.quality_report_json, '{}'::jsonb),
              '{focusedReview}',
              $2::jsonb,
              TRUE
            ),
            updated_at = NOW()
        FROM posts post
        WHERE metadata.post_id = $1
          AND post.id = metadata.post_id
          AND post.generated_by_ai = TRUE
          AND post.published = FALSE
          AND post.content_format = 'static_html'
          AND post.review_version = $3
        RETURNING metadata.*
      `, [postId, JSON.stringify(focusedReview), expectedReviewVersion]);
      return rows[0] || null;
    },

    async publishDraft(postId, client) {
      const target = queryTarget(client, db);
      const { rows } = await target.query(`
        UPDATE posts
        SET published = TRUE,
            workflow_status = 'published',
            published_at = NOW(),
            reviewed_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
          AND generated_by_ai = TRUE
          AND published = FALSE
          AND workflow_status = 'needs_review'
          AND content_format = 'static_html'
        RETURNING *
      `, [postId]);
      return rows[0] || null;
    },

    async approveDraftForSchedule({
      postId,
      scheduledAt,
      reviewVersion,
      publicationVersion,
      adminId,
      allowMissedSlot = false
    }, client) {
      const target = queryTarget(client, db);
      const { rows } = await target.query(`
        WITH updated AS (
          UPDATE posts
          SET workflow_status = 'approved_scheduled',
              scheduled_at = $2,
              approved_review_version = review_version,
              approved_at = NOW(),
              approved_by_admin_id = $5,
              updated_at = NOW()
          WHERE id = $1
            AND generated_by_ai = TRUE
            AND published = FALSE
            AND workflow_status = 'needs_review'
            AND content_format = 'static_html'
            AND review_version = $3
            AND publication_version = $4
            AND ($6 = TRUE OR (
              $2 > NOW()
              AND $2 > clock_timestamp()
            ))
          RETURNING posts.*
        )
        SELECT updated.*, approval_clock.database_now AS approval_database_now
        FROM (SELECT clock_timestamp() AS database_now) AS approval_clock
        LEFT JOIN updated ON TRUE
      `, [
        postId,
        scheduledAt,
        reviewVersion,
        publicationVersion,
        adminId,
        allowMissedSlot === true
      ]);
      const row = rows[0] || null;
      if (!row) return null;
      const { approval_database_now: databaseNowValue, ...post } = row;
      if (post.id) return post;
      const databaseNow = new Date(databaseNowValue);
      const requestedSchedule = new Date(scheduledAt);
      if (allowMissedSlot !== true
          && !Number.isNaN(databaseNow.getTime())
          && !Number.isNaN(requestedSchedule.getTime())
          && requestedSchedule.getTime() <= databaseNow.getTime()) {
        return { post: null, scheduleExpired: true };
      }
      return null;
    },

    async rescheduleApprovedDraft({
      postId,
      scheduledAt,
      approvalVersion,
      publicationVersion,
      adminId
    }, client) {
      const target = queryTarget(client, db);
      const { rows } = await target.query(`
        WITH updated AS (
          UPDATE posts
          SET scheduled_at = $2,
              updated_at = NOW()
          WHERE id = $1
            AND generated_by_ai = TRUE
            AND published = FALSE
            AND workflow_status = 'approved_scheduled'
            AND content_format = 'static_html'
            AND approved_review_version = $3
            AND review_version = $3
            AND publication_version = $4
            AND approved_by_admin_id = $5
            AND $2 > NOW()
            AND $2 > clock_timestamp()
          RETURNING posts.*
        )
        SELECT updated.*, reschedule_clock.database_now AS reschedule_database_now
        FROM (SELECT clock_timestamp() AS database_now) AS reschedule_clock
        LEFT JOIN updated ON TRUE
      `, [postId, scheduledAt, approvalVersion, publicationVersion, adminId]);
      const row = rows[0] || null;
      if (!row) return null;
      const { reschedule_database_now: databaseNowValue, ...post } = row;
      if (post.id) return post;
      const databaseNow = new Date(databaseNowValue);
      const requestedSchedule = new Date(scheduledAt);
      if (!Number.isNaN(databaseNow.getTime())
          && !Number.isNaN(requestedSchedule.getTime())
          && requestedSchedule.getTime() <= databaseNow.getTime()) {
        return { post: null, scheduleExpired: true };
      }
      return null;
    },

    async publishApprovedDraft({
      postId,
      approvalVersion,
      publicationVersion,
      scheduledAt
    }, client) {
      const target = queryTarget(client, db);
      const { rows } = await target.query(`
        UPDATE posts
        SET published = TRUE,
            workflow_status = 'published',
            published_at = NOW(),
            reviewed_at = NOW(),
            publication_version = publication_version + 1,
            updated_at = NOW()
        WHERE id = $1
          AND generated_by_ai = TRUE
          AND published = FALSE
          AND workflow_status = 'approved_scheduled'
          AND content_format = 'static_html'
          AND approved_review_version = $2
          AND review_version = $2
          AND publication_version = $3
          AND scheduled_at = $4
          AND scheduled_at <= NOW()
        RETURNING *
      `, [postId, approvalVersion, publicationVersion, scheduledAt]);
      return rows[0] || null;
    },

    async rejectDraft(postId, client) {
      const target = queryTarget(client, db);
      const { rows } = await target.query(`
        UPDATE posts
        SET published = FALSE,
            workflow_status = 'rejected',
            published_at = NULL,
            reviewed_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
          AND generated_by_ai = TRUE
          AND published = FALSE
          AND workflow_status = 'needs_review'
          AND content_format = 'static_html'
        RETURNING *
      `, [postId]);
      return rows[0] || null;
    },

    async insertManualEvent({ postId, runId, qualityScore, admin }, client) {
      const target = queryTarget(client, db);
      const { rows } = await target.query(`
        INSERT INTO content_publish_events (
          post_id, run_id, decision, policy_version, quality_score,
          reasons_json, context_json, admin_id, admin_username
        )
        VALUES (
          $1, $2, 'manual', 'manual-v1', $3,
          '[]'::jsonb, '{"action":"manual_publish"}'::jsonb, $4, $5
        )
        ON CONFLICT (post_id) WHERE decision = 'manual' DO NOTHING
        RETURNING *
      `, [postId, runId, qualityScore, admin.id, admin.username]);
      return rows[0] || null;
    },

    async insertScheduledManualEvent({
      postId,
      runId,
      qualityScore,
      approvalVersion,
      publicationVersion,
      scheduledAt,
      admin
    }, client) {
      const target = queryTarget(client, db);
      const context = JSON.stringify({
        action: 'scheduled_manual_publish',
        approvalVersion,
        publicationVersion,
        scheduledAt: scheduledAt.toISOString()
      });
      const { rows } = await target.query(`
        INSERT INTO content_publish_events (
          post_id, run_id, decision, policy_version, quality_score,
          reasons_json, context_json, admin_id, admin_username
        )
        VALUES (
          $1, $2, 'manual', 'manual-scheduled-v1', $3,
          '[]'::jsonb, $4::jsonb, $5, $6
        )
        ON CONFLICT (post_id) WHERE decision = 'manual' DO NOTHING
        RETURNING *
      `, [postId, runId, qualityScore, context, admin.id, admin.username]);
      return rows[0] || null;
    },

    async getScheduledManualEvent({ postId, publicationVersion }, client) {
      const target = queryTarget(client, db);
      const { rows } = await target.query(`
        SELECT *
        FROM content_publish_events
        WHERE post_id = $1
          AND decision = 'manual'
          AND policy_version = 'manual-scheduled-v1'
          AND context_json ->> 'publicationVersion' = $2
        LIMIT 1
      `, [postId, String(publicationVersion)]);
      return rows[0] || null;
    },

    async getApprovingAdmin(adminId, client) {
      const target = queryTarget(client, db);
      const { rows } = await target.query(
        'SELECT id, username FROM admins WHERE id = $1',
        [adminId]
      );
      return rows[0] || null;
    },

    async insertRejectionEvent({ postId, runId, qualityScore, admin, reason }, client) {
      const target = queryTarget(client, db);
      const context = JSON.stringify({ action: 'manual_rejection', reason });
      const { rows } = await target.query(`
        INSERT INTO content_publish_events (
          post_id, run_id, decision, policy_version, quality_score,
          reasons_json, context_json, admin_id, admin_username
        )
        VALUES (
          $1, $2, 'blocked', 'manual-reject-v1', $3,
          '[{"code":"manual_rejection"}]'::jsonb, $4::jsonb, $5, $6
        )
        RETURNING *
      `, [postId, runId, qualityScore, context, admin.id, admin.username]);
      return rows[0] || null;
    },

    async getAutoEvent({ runId, policyVersion }, client) {
      const target = queryTarget(client, db);
      const { rows } = await target.query(`
        SELECT *
        FROM content_publish_events
        WHERE run_id = $1 AND policy_version = $2
          AND decision IN ('allowed', 'blocked')
        LIMIT 1
      `, [runId, policyVersion]);
      return rows[0] || null;
    },

    async insertAutoEvent({
      postId,
      runId,
      decision,
      policyVersion,
      qualityScore,
      reasons,
      context
    }, client) {
      const target = queryTarget(client, db);
      const { rows } = await target.query(`
        INSERT INTO content_publish_events (
          post_id, run_id, decision, policy_version, quality_score,
          reasons_json, context_json
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)
        ON CONFLICT (run_id, policy_version)
          WHERE run_id IS NOT NULL AND decision IN ('allowed', 'blocked')
        DO NOTHING
        RETURNING *
      `, [
        postId,
        runId,
        decision,
        policyVersion,
        qualityScore,
        JSON.stringify(reasons),
        JSON.stringify(context)
      ]);
      return rows[0] || null;
    },

    async incrementManualApprovals(client) {
      const target = queryTarget(client, db);
      const { rows } = await target.query(`
        UPDATE content_agent_settings
        SET manual_approvals_count = manual_approvals_count + 1,
            updated_at = NOW()
        WHERE id = 1
        RETURNING *
      `);
      return rows[0] || null;
    },

    async getSettings(client) {
      const target = queryTarget(client, db);
      const { rows } = await target.query(
        'SELECT * FROM content_agent_settings WHERE id = 1'
      );
      return rows[0] || null;
    }
  };
}

const defaultRepository = createContentPublishEventRepository();
export const getDraftWithMetadataForUpdate = defaultRepository.getDraftWithMetadataForUpdate;
export const getValidationContext = defaultRepository.getValidationContext;
export const updateFocusedReview = defaultRepository.updateFocusedReview;
export const publishDraft = defaultRepository.publishDraft;
export const approveDraftForSchedule = defaultRepository.approveDraftForSchedule;
export const rescheduleApprovedDraft = defaultRepository.rescheduleApprovedDraft;
export const publishApprovedDraft = defaultRepository.publishApprovedDraft;
export const rejectDraft = defaultRepository.rejectDraft;
export const insertManualEvent = defaultRepository.insertManualEvent;
export const insertScheduledManualEvent = defaultRepository.insertScheduledManualEvent;
export const getScheduledManualEvent = defaultRepository.getScheduledManualEvent;
export const getApprovingAdmin = defaultRepository.getApprovingAdmin;
export const insertRejectionEvent = defaultRepository.insertRejectionEvent;
export const getAutoEvent = defaultRepository.getAutoEvent;
export const insertAutoEvent = defaultRepository.insertAutoEvent;
export const incrementManualApprovals = defaultRepository.incrementManualApprovals;
export const getSettings = defaultRepository.getSettings;
