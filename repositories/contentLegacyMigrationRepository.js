import { createHash } from 'node:crypto';
import pool from '../util/db.js';
import { liveHashForContentPost } from '../services/contentAgent/contentPostLiveState.js';
import {
  hasActiveContentOptimization,
  hasDraftContentRevision,
  hasPostWorkSince
} from './contentPostRevisionInvariant.js';

const POST_COLUMNS = `
  p.id, p.title, p.slug, p.excerpt, p.content, p.content_format,
  p.meta_title, p.meta_description, p.og_title, p.og_description,
  p.faq_json, p.image_url, p.image_alt, p.published, p.workflow_status,
  p.scheduled_at, p.published_at, p.created_at, p.updated_at
`;

function repositoryError(code, message) {
  return Object.assign(new Error(message), { code });
}

function sha256(value) {
  return createHash('sha256').update(String(value || '')).digest('hex');
}

function jsonObject(value, fallback = {}) {
  if (value && typeof value === 'object') return value;
  try {
    return JSON.parse(String(value || ''));
  } catch {
    return fallback;
  }
}

async function rollback(client) {
  try { await client.query('ROLLBACK'); } catch { /* ursprünglichen Fehler erhalten */ }
}

async function lockMigration(client, migrationId) {
  const { rows } = await client.query(`
    SELECT *
    FROM content_legacy_migrations
    WHERE id = $1::bigint
    FOR UPDATE
  `, [migrationId]);
  return rows[0] || null;
}

async function lockFullPost(client, postId) {
  const { rows } = await client.query(`
    SELECT ${POST_COLUMNS}
    FROM posts p
    WHERE p.id = $1::integer
    FOR UPDATE
  `, [postId]);
  return rows[0] || null;
}

async function markStale(client, migrationId) {
  await client.query(`
    UPDATE content_legacy_migrations
    SET status = 'stale', updated_at = NOW()
    WHERE id = $1::bigint
      AND status IN ('scanned', 'ready', 'blocked')
  `, [migrationId]);
}

async function rollbackWithConflict(client, code, message) {
  await rollback(client);
  const error = repositoryError(code, message);
  error.transactionRolledBack = true;
  throw error;
}

export function createContentLegacyMigrationRepository(db = pool) {
  async function listScanCandidates() {
    const { rows } = await db.query(`
      SELECT ${POST_COLUMNS},
             EXISTS (
               SELECT 1
               FROM content_post_revisions revision
               WHERE revision.post_id = p.id
                 AND revision.status = 'draft'
             ) AS has_draft_revision,
             EXISTS (
               SELECT 1
               FROM content_jobs job
               WHERE job.job_type = 'optimize_existing_post'
                 AND job.payload_json ->> 'post_id' = p.id::text
                 AND job.status IN ('queued', 'running', 'needs_manual_attention')
             ) AS has_active_optimization
      FROM posts p
      WHERE p.published = TRUE
        AND p.content_format = 'legacy_ejs'
      ORDER BY p.id
    `);
    return rows;
  }

  async function saveScanResult({ admin, result }) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const post = await lockFullPost(client, result.postId);
      if (!post || post.published !== true || post.content_format !== 'legacy_ejs') {
        throw repositoryError(
          'CONTENT_LEGACY_MIGRATION_NOT_AVAILABLE',
          'Der Artikel ist nicht mehr als veröffentlichter Legacy-Artikel verfügbar.'
        );
      }
      await client.query(`
        UPDATE content_legacy_migrations
        SET status = 'stale', updated_at = NOW()
        WHERE post_id = $1::integer
          AND status IN ('scanned', 'ready', 'blocked')
      `, [result.postId]);
      const { rows } = await client.query(`
        INSERT INTO content_legacy_migrations (
          post_id, status, migration_class, base_live_hash,
          source_content_format, source_content, rendered_static_html,
          render_context_json, analysis_json, blocking_issues_json,
          sanitizer_report_json, created_by, created_at, updated_at
        )
        VALUES (
          $1, $2, $3, $4, 'legacy_ejs', $5, $6,
          $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb,
          $11, NOW(), NOW()
        )
        RETURNING *
      `, [
        result.postId,
        result.status,
        result.migrationClass,
        result.baseLiveHash,
        result.sourceContent,
        result.renderedStaticHtml,
        JSON.stringify(result.renderContext || {}),
        JSON.stringify(result.analysis || {}),
        JSON.stringify(result.blockingIssues || []),
        JSON.stringify(result.sanitizerReport || {}),
        admin.id
      ]);
      await client.query('COMMIT');
      return rows[0];
    } catch (error) {
      await rollback(client);
      throw error;
    } finally {
      client.release();
    }
  }

  async function listDashboardRows() {
    const { rows } = await db.query(`
      SELECT DISTINCT ON (migration.post_id)
             migration.*,
             post.title,
             post.slug,
             post.content_format AS current_content_format,
             post.updated_at AS current_post_updated_at
      FROM content_legacy_migrations migration
      JOIN posts post ON post.id = migration.post_id
      WHERE migration.status NOT IN ('stale', 'failed')
      ORDER BY migration.post_id,
               migration.created_at DESC,
               migration.id DESC
    `);
    return rows;
  }

  async function getMigrationForPreview(migrationId) {
    const { rows } = await db.query(`
      SELECT migration.*, to_jsonb(p) AS post
      FROM content_legacy_migrations migration
      JOIN posts p ON p.id = migration.post_id
      WHERE migration.id = $1::bigint
    `, [migrationId]);
    return rows[0] || null;
  }

  async function listReadyStaticLegacyIds() {
    const { rows } = await db.query(`
      SELECT migration.id
      FROM content_legacy_migrations migration
      JOIN posts post ON post.id = migration.post_id
      WHERE migration.status = 'ready'
        AND migration.migration_class = 'static_legacy'
        AND post.published = TRUE
        AND post.content_format = 'legacy_ejs'
      ORDER BY migration.id
    `);
    return rows.map(({ id }) => Number(id));
  }

  async function migrateOne({ migrationId, admin }) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const migration = await lockMigration(client, migrationId);
      if (!migration) {
        throw repositoryError(
          'CONTENT_LEGACY_MIGRATION_NOT_FOUND',
          'Migration nicht gefunden.'
        );
      }
      if (migration.status === 'migrated') {
        await client.query('COMMIT');
        return { status: 'already_migrated', migration };
      }
      if (migration.status !== 'ready') {
        throw repositoryError(
          'CONTENT_LEGACY_MIGRATION_NOT_READY',
          'Migration ist nicht freigabefähig.'
        );
      }

      const post = await lockFullPost(client, migration.post_id);
      if (!post || post.published !== true || post.content_format !== 'legacy_ejs') {
        await markStale(client, migration.id);
        await client.query('COMMIT');
        return { status: 'stale' };
      }
      if (liveHashForContentPost(post) !== migration.base_live_hash) {
        await markStale(client, migration.id);
        await client.query('COMMIT');
        return { status: 'stale' };
      }
      if (await hasDraftContentRevision(client, post.id)
          || await hasActiveContentOptimization(client, post.id)) {
        return rollbackWithConflict(
          client,
          'CONTENT_LEGACY_MIGRATION_CONFLICT',
          'Offene Artikelarbeit blockiert die Migration.'
        );
      }
      if (/<%[=-]?|%>/.test(migration.rendered_static_html || '')) {
        return rollbackWithConflict(
          client,
          'CONTENT_LEGACY_MIGRATION_INVALID',
          'Der statische Kandidat enthält weiterhin EJS.'
        );
      }
      const analysis = jsonObject(migration.analysis_json);
      if (sha256(migration.rendered_static_html) !== analysis.candidateHash) {
        return rollbackWithConflict(
          client,
          'CONTENT_LEGACY_MIGRATION_INVALID',
          'Der gespeicherte Kandidat ist nicht mehr konsistent.'
        );
      }

      const { rows: updatedPosts } = await client.query(`
        UPDATE posts
        SET content = $2,
            content_format = 'static_html',
            updated_at = NOW()
        WHERE id = $1
        RETURNING id, title, slug, excerpt, content, content_format,
                  meta_title, meta_description, og_title, og_description,
                  faq_json, image_url, image_alt, published, workflow_status,
                  scheduled_at, published_at, created_at, updated_at
      `, [post.id, migration.rendered_static_html]);
      if (!updatedPosts[0]) {
        return rollbackWithConflict(
          client,
          'CONTENT_LEGACY_MIGRATION_CONFLICT',
          'Der Artikel konnte nicht atomar migriert werden.'
        );
      }
      const migratedLiveHash = liveHashForContentPost(updatedPosts[0]);
      const { rows: migratedRows } = await client.query(`
        UPDATE content_legacy_migrations
        SET status = 'migrated',
            migrated_live_hash = $2,
            approved_by = $3,
            migrated_at = NOW(),
            updated_at = NOW()
        WHERE id = $1::bigint
          AND status = 'ready'
        RETURNING *
      `, [migration.id, migratedLiveHash, admin.id]);
      if (!migratedRows[0]) {
        return rollbackWithConflict(
          client,
          'CONTENT_LEGACY_MIGRATION_CONFLICT',
          'Der Migrationsstatus konnte nicht atomar gespeichert werden.'
        );
      }
      await client.query('COMMIT');
      return {
        status: 'migrated',
        migration: migratedRows[0],
        post: updatedPosts[0]
      };
    } catch (error) {
      if (error?.transactionRolledBack !== true) await rollback(client);
      throw error;
    } finally {
      client.release();
    }
  }

  async function rollbackOne({ migrationId, admin }) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const migration = await lockMigration(client, migrationId);
      if (!migration) {
        throw repositoryError(
          'CONTENT_LEGACY_MIGRATION_NOT_FOUND',
          'Migration nicht gefunden.'
        );
      }
      if (migration.status === 'rolled_back') {
        await client.query('COMMIT');
        return { status: 'rolled_back', migration };
      }
      if (migration.status !== 'migrated') {
        throw repositoryError(
          'CONTENT_LEGACY_ROLLBACK_NOT_AVAILABLE',
          'Nur eine abgeschlossene Migration kann zurückgenommen werden.'
        );
      }

      const post = await lockFullPost(client, migration.post_id);
      if (!post
          || post.published !== true
          || post.content_format !== 'static_html'
          || liveHashForContentPost(post) !== migration.migrated_live_hash) {
        return rollbackWithConflict(
          client,
          'CONTENT_LEGACY_ROLLBACK_CONFLICT',
          'Die Livefassung wurde seit der Migration verändert.'
        );
      }
      if (await hasPostWorkSince(client, post.id, migration.migrated_at)) {
        return rollbackWithConflict(
          client,
          'CONTENT_LEGACY_ROLLBACK_CONFLICT',
          'Seit der Migration wurde neue Artikelarbeit angelegt.'
        );
      }

      const { rows: restoredPosts } = await client.query(`
        UPDATE posts
        SET content = $2,
            content_format = 'legacy_ejs',
            updated_at = NOW()
        WHERE id = $1
          AND content_format = 'static_html'
        RETURNING id, title, slug, excerpt, content, content_format,
                  meta_title, meta_description, og_title, og_description,
                  faq_json, image_url, image_alt, published, workflow_status,
                  scheduled_at, published_at, created_at, updated_at
      `, [post.id, migration.source_content]);
      if (!restoredPosts[0]) {
        return rollbackWithConflict(
          client,
          'CONTENT_LEGACY_ROLLBACK_CONFLICT',
          'Die Livefassung konnte nicht atomar wiederhergestellt werden.'
        );
      }
      const { rows: rolledBackRows } = await client.query(`
        UPDATE content_legacy_migrations
        SET status = 'rolled_back',
            rolled_back_by = $2,
            rolled_back_at = NOW(),
            updated_at = NOW()
        WHERE id = $1::bigint
          AND status = 'migrated'
        RETURNING *
      `, [migration.id, admin.id]);
      if (!rolledBackRows[0]) {
        return rollbackWithConflict(
          client,
          'CONTENT_LEGACY_ROLLBACK_CONFLICT',
          'Der Rücknahmestatus konnte nicht atomar gespeichert werden.'
        );
      }
      await client.query('COMMIT');
      return {
        status: 'rolled_back',
        migration: rolledBackRows[0],
        post: restoredPosts[0]
      };
    } catch (error) {
      if (error?.transactionRolledBack !== true) await rollback(client);
      throw error;
    } finally {
      client.release();
    }
  }

  return {
    listScanCandidates,
    saveScanResult,
    listDashboardRows,
    getMigrationForPreview,
    listReadyStaticLegacyIds,
    migrateOne,
    rollbackOne
  };
}
