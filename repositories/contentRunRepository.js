import pool from '../util/db.js';

export async function createRun({
  jobId,
  currentStage = 'inventory'
}, db = pool) {
  const { rows } = await db.query(
    `
      INSERT INTO content_runs (job_id, status, current_stage)
      VALUES ($1, 'running', $2)
      RETURNING *
    `,
    [jobId, currentStage]
  );

  return rows[0] || null;
}

export async function updateRunStage(runId, {
  currentStage,
  stageResult = {},
  tokenUsage = {},
  costEstimate = 0,
  responseIds = [],
  selectedTopicId = null
}, db = pool) {
  const { rows } = await db.query(
    `
      UPDATE content_runs
      SET current_stage = $2,
          stage_results_json = stage_results_json || $3::jsonb,
          token_usage_json = token_usage_json || $4::jsonb,
          cost_estimate = cost_estimate + $5,
          openai_response_ids_json = openai_response_ids_json || to_jsonb($6::text[]),
          selected_topic_id = COALESCE($7, selected_topic_id)
      WHERE id = $1
      RETURNING *
    `,
    [
      runId,
      currentStage,
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
    [runId, status, postId, errorReport]
  );

  return rows[0] || null;
}
