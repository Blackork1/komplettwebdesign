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
