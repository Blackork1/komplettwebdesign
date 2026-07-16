export async function lockContentPostRevisionInvariant(client, postId) {
  const { rows } = await client.query(`
    SELECT id, published
    FROM posts
    WHERE id = $1::integer
    FOR UPDATE
  `, [postId]);
  return rows[0] || null;
}

export async function hasDraftContentRevision(client, postId) {
  const { rows } = await client.query(`
    SELECT EXISTS (
      SELECT 1
      FROM content_post_revisions
      WHERE post_id = $1::integer
        AND status = 'draft'
    ) AS has_draft_revision
  `, [postId]);
  return rows[0]?.has_draft_revision === true;
}

export async function hasActiveContentOptimization(client, postId) {
  const { rows } = await client.query(`
    SELECT EXISTS (
      SELECT 1
      FROM content_jobs
      WHERE job_type = 'optimize_existing_post'
        AND payload_json ->> 'post_id' = $1::text
        AND status IN ('queued', 'running', 'needs_manual_attention')
    ) AS has_active_optimization
  `, [postId]);
  return rows[0]?.has_active_optimization === true;
}

export async function hasPostWorkSince(client, postId, since) {
  const { rows } = await client.query(`
    SELECT (
      EXISTS (
        SELECT 1
        FROM content_post_revisions
        WHERE post_id = $1::integer
          AND created_at >= $2::timestamptz
      )
      OR EXISTS (
        SELECT 1
        FROM content_jobs
        WHERE job_type = 'optimize_existing_post'
          AND payload_json ->> 'post_id' = $1::text
          AND created_at >= $2::timestamptz
      )
    ) AS has_new_work
  `, [postId, since]);
  return rows[0]?.has_new_work === true;
}
