import pool from '../util/db.js';
import { sanitizeErrorReport } from './contentErrorSanitizer.js';

export async function createRun({
  jobId,
  currentStage = 'inventory'
}, db = pool) {
  const { rows } = await db.query(
    `
      INSERT INTO content_runs (job_id, status, current_stage)
      VALUES ($1, 'running', $2)
      ON CONFLICT (job_id) DO UPDATE
      SET status = 'running',
          current_stage = content_runs.current_stage,
          stage_results_json = content_runs.stage_results_json,
          finished_at = NULL
      RETURNING *
    `,
    [jobId, currentStage]
  );

  return rows[0] || null;
}

export async function updateRunStage(runId, {
  currentStage,
  stageId,
  stageResult = {},
  tokenUsage = {},
  costEstimate = 0,
  responseIds = [],
  selectedTopicId = null
}, db = pool) {
  const normalizedStageId = typeof stageId === 'string' ? stageId.trim() : '';
  if (!normalizedStageId) {
    throw new TypeError('updateRunStage benötigt eine nichtleere explizite stageId.');
  }

  const { rows } = await db.query(
    `
      UPDATE content_runs
      SET current_stage = $2,
          stage_results_json = CASE
            WHEN stage_results_json ? $3 THEN stage_results_json
            ELSE stage_results_json || jsonb_build_object($3, $4::jsonb)
          END,
          token_usage_json = CASE
            WHEN stage_results_json ? $3 THEN token_usage_json
            ELSE token_usage_json || jsonb_build_object($3, $5::jsonb)
          END,
          cost_estimate = CASE
            WHEN stage_results_json ? $3 THEN cost_estimate
            ELSE cost_estimate + $6
          END,
          openai_response_ids_json = CASE
            WHEN stage_results_json ? $3 THEN openai_response_ids_json
            ELSE openai_response_ids_json || to_jsonb($7::text[])
          END,
          selected_topic_id = COALESCE($8, selected_topic_id)
      WHERE id = $1
      RETURNING *
    `,
    [
      runId,
      currentStage,
      normalizedStageId,
      stageResult,
      tokenUsage,
      costEstimate,
      responseIds,
      selectedTopicId
    ]
  );

  return rows[0] || null;
}

export async function finishRun(runId, {
  status = 'completed',
  postId = null,
  errorReport = {}
} = {}, db = pool) {
  const { rows } = await db.query(
    `
      UPDATE content_runs
      SET status = $2,
          post_id = COALESCE($3, post_id),
          error_report_json = $4::jsonb,
          current_stage = CASE
            WHEN $2 = 'completed' THEN 'completed'
            ELSE current_stage
          END,
          finished_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [runId, status, postId, sanitizeErrorReport(errorReport)]
  );

  return rows[0] || null;
}
