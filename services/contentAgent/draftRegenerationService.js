import pool from '../../util/db.js';

export const DRAFT_REGENERATION_JOB_TYPES = Object.freeze([
  'regenerate_article',
  'regenerate_metadata',
  'regenerate_faq',
  'regenerate_image'
]);

const REGENERATION_TYPE_SET = new Set(DRAFT_REGENERATION_JOB_TYPES);
const TEXT_REGENERATION_FIELDS = Object.freeze({
  regenerate_article: Object.freeze([
    'title',
    'shortDescription',
    'metaTitle',
    'metaDescription',
    'ogTitle',
    'ogDescription',
    'contentHtml',
    'faqJson'
  ]),
  regenerate_metadata: Object.freeze([
    'shortDescription',
    'metaTitle',
    'metaDescription',
    'ogTitle',
    'ogDescription'
  ]),
  regenerate_faq: Object.freeze(['contentHtml', 'faqJson'])
});

const POST_FIELD_MAP = Object.freeze({
  title: { column: 'title' },
  shortDescription: { column: 'excerpt' },
  metaTitle: { column: 'meta_title' },
  metaDescription: { column: 'meta_description' },
  ogTitle: { column: 'og_title' },
  ogDescription: { column: 'og_description' },
  contentHtml: { column: 'content' },
  faqJson: { column: 'faq_json', json: true }
});

const DEFAULT_RISK = Object.freeze({
  currentClaims: false,
  legalClaims: false,
  privacyClaims: false,
  softwareVersionClaims: false,
  staticPrices: false
});

const DEFAULT_SELF_CHECK = Object.freeze({
  searchIntentFulfilled: true,
  noH1: true,
  noOuterBootstrapContainer: true,
  noInventedPricesOrServices: true,
  faqMatchesHtml: true,
  approvedLinksOnly: true
});

function regenerationError(code, message, { retryable = false, issues = [] } = {}) {
  return Object.assign(new Error(message), { code, retryable, issues });
}

function requiredFunction(value, name) {
  if (typeof value !== 'function') {
    throw new TypeError(`Die Regenerationsabhängigkeit ${name} wird benötigt.`);
  }
  return value;
}

function isEligibleDraft(record) {
  const post = record?.post;
  return Boolean(
    post
    && post.generated_by_ai === true
    && post.published === false
    && post.content_format === 'static_html'
  );
}

function positivePostId(value) {
  const postId = Number(value);
  if (!Number.isSafeInteger(postId) || postId < 1) {
    throw regenerationError('CONTENT_REGENERATION_VALIDATION_FAILED', 'Ungültige Entwurfs-ID.');
  }
  return postId;
}

function normalizeFaq(value) {
  return Array.isArray(value) ? value : [];
}

function currentArticleFromDraft(draft) {
  const { post, metadata = {} } = draft;
  const imageIdea = metadata.seo_brief_json?.imageIdea || {};
  const reportRisks = metadata.quality_report_json?.risks;
  return {
    title: post.title || '',
    shortDescription: post.excerpt || '',
    metaTitle: post.meta_title || '',
    metaDescription: post.meta_description || '',
    ogTitle: post.og_title || '',
    ogDescription: post.og_description || '',
    slug: post.slug || '',
    contentHtml: post.content || '',
    faqJson: normalizeFaq(post.faq_json),
    category: post.category || 'Webdesign',
    imagePrompt: imageIdea.prompt || '',
    imageAlt: post.image_alt || imageIdea.altText || '',
    imageFilename: imageIdea.filename || `${post.slug || 'blogartikel'}.webp`,
    seo: {
      primaryKeyword: metadata.primary_keyword || '',
      secondaryKeywords: Array.isArray(metadata.secondary_keywords) ? metadata.secondary_keywords : [],
      searchIntent: metadata.search_intent || '',
      targetAudience: metadata.target_audience || '',
      contentCluster: metadata.content_cluster || ''
    },
    lead: {
      businessGoal: metadata.business_goal || '',
      ctaType: metadata.cta_type || '',
      ctaPositions: ['blog_early', 'blog_mid', 'blog_final']
    },
    sourceReferences: Array.isArray(metadata.source_references_json)
      ? metadata.source_references_json
      : [],
    risk: reportRisks && typeof reportRisks === 'object'
      ? { ...DEFAULT_RISK, ...reportRisks }
      : { ...DEFAULT_RISK },
    qualitySelfCheck: { ...DEFAULT_SELF_CHECK }
  };
}

function providerEnvelope(value) {
  return value
    && typeof value === 'object'
    && value.value
    && typeof value.value === 'object'
    && typeof value.promptVersion === 'string'
    ? value
    : null;
}

function persistedImage(value) {
  return value
    && typeof value === 'object'
    && typeof value.imageUrl === 'string'
    && value.imageUrl.length > 0
    && typeof value.publicId === 'string'
    && value.publicId.length > 0
    ? value
    : null;
}

function providerFailureIsSafeToRetry(error) {
  return error?.safeToRetry === true
    || Number(error?.status ?? error?.statusCode ?? error?.response?.status) === 429;
}

function markSafeRetry(error) {
  if (!error || typeof error !== 'object') return error;
  error.code = 'CONTENT_PROVIDER_SAFE_RETRY';
  error.retryable = true;
  return error;
}

function textRates(snapshot) {
  return {
    inputRate: Number(snapshot.contentInputCostPerMtok || 0),
    outputRate: Number(snapshot.contentOutputCostPerMtok || 0)
  };
}

function textReservation(snapshot) {
  return Number(snapshot.contentStageReservationEur ?? 0.5);
}

function regenerationIssue(jobType) {
  const instructions = {
    regenerate_article: 'Überarbeite den vollständigen Artikel, ohne Slug, Bild oder SEO-Zuordnung zu verändern.',
    regenerate_metadata: 'Überarbeite ausschließlich Kurzbeschreibung, Meta Title, Meta Description und Open-Graph-Texte.',
    regenerate_faq: 'Überarbeite ausschließlich den sichtbaren FAQ-Bereich im HTML und das dazu identische FAQ-JSON.'
  };
  return [{
    code: jobType,
    severity: 'warning',
    message: 'Ein Administrator hat eine gezielte Regeneration angefordert.',
    repairInstruction: instructions[jobType],
    blocking: false
  }];
}

function mergeAllowedFields(current, generated, allowedFields) {
  const merged = { ...current };
  for (const field of allowedFields) merged[field] = generated[field];
  return merged;
}

async function finishManual(
  { runId, postId, code, message, issues = [] },
  runRepository,
  assertLease = async () => true
) {
  await assertLease();
  await runRepository.finishRun(runId, {
    status: 'needs_manual_attention',
    postId,
    errorReport: { code, message, ...(issues.length ? { issues } : {}) }
  });
  return { status: 'needs_manual_attention', code, post: null };
}

async function recordProvider(dependencies, input) {
  if (typeof dependencies.recordProviderResult !== 'function') return;
  try {
    await dependencies.recordProviderResult(input);
  } catch {
    // Die Statusanzeige darf einen fachlich sicheren Job nicht fehlschlagen lassen.
  }
}

async function recordImageProviders(dependencies, audit = {}) {
  const imageGeneration = audit.imageGeneration || {};
  const upload = audit.upload || {};
  if (imageGeneration.status === 'completed') {
    await recordProvider(dependencies, { providerName: 'openai', success: true });
  } else if (imageGeneration.status === 'failed') {
    await recordProvider(dependencies, {
      providerName: 'openai',
      success: false,
      errorCode: imageGeneration.code || 'IMAGE_GENERATION_FAILED'
    });
  }
  if (upload.status === 'completed') {
    await recordProvider(dependencies, { providerName: 'cloudinary', success: true });
  } else if (upload.status === 'failed') {
    await recordProvider(dependencies, {
      providerName: 'cloudinary',
      success: false,
      errorCode: upload.code || 'IMAGE_UPLOAD_FAILED'
    });
  }
}

async function loadTextResult({
  stageId,
  run,
  runtimeSnapshot,
  draft,
  jobType
}, dependencies) {
  const rawPersisted = await dependencies.costService.getPersistedStageResult({
    runId: run.id,
    stageId
  });
  if (rawPersisted !== null && rawPersisted !== undefined) {
    return providerEnvelope(rawPersisted)?.value || null;
  }

  await dependencies.assertLease();
  const reservation = await dependencies.costService.reserveMonthlyBudget({
    runId: run.id,
    stageId,
    estimatedCost: textReservation(runtimeSnapshot),
    limit: Number(runtimeSnapshot.monthlyCostLimitEur || 0),
    timezone: runtimeSnapshot.timezone
  });
  if (reservation.created !== true) return null;

  let result;
  try {
    await dependencies.assertLease();
    result = await dependencies.openaiService.repairArticle({
      briefing: draft.metadata?.seo_brief_json || {},
      article: currentArticleFromDraft(draft),
      issues: regenerationIssue(jobType)
    });
  } catch (error) {
    if (error?.code === 'CONTENT_JOB_LEASE_LOST') throw error;
    await recordProvider(dependencies, {
      providerName: 'openai',
      success: false,
      errorCode: error?.code || 'CONTENT_REGENERATION_PROVIDER_FAILED'
    });
    if (!providerFailureIsSafeToRetry(error)) return null;
    try {
      await dependencies.assertLease();
      await dependencies.costService.releaseMonthlyBudgetReservation({
        runId: run.id,
        stageId,
        reservationMonth: reservation.reservationMonth
      });
    } catch {
      return null;
    }
    throw markSafeRetry(error);
  }

  const actualCost = dependencies.costService.estimateTextCost({
    usage: result.usage || {},
    ...textRates(runtimeSnapshot)
  });
  await dependencies.assertLease();
  await dependencies.costService.settleMonthlyBudget({
    runId: run.id,
    stageId,
    reservationMonth: reservation.reservationMonth,
    actualCost
  });
  const envelope = {
    value: result.value,
    responseId: result.responseId ?? null,
    usage: result.usage || {},
    promptVersion: result.promptVersion || 'unknown'
  };
  await dependencies.assertLease();
  await dependencies.runRepository.updateRunStage(run.id, {
    currentStage: stageId,
    stageId,
    stageResult: envelope,
    tokenUsage: envelope.usage,
    responseIds: envelope.responseId ? [envelope.responseId] : []
  });
  await recordProvider(dependencies, { providerName: 'openai', success: true });
  return envelope.value;
}

async function runTextRegeneration(context, dependencies) {
  const { claim, run, runtimeSnapshot, draft, postId, stageId } = context;
  const generated = await loadTextResult({
    stageId,
    run,
    runtimeSnapshot,
    draft,
    jobType: claim.job_type
  }, dependencies);
  if (!generated) {
    return finishManual({
      runId: run.id,
      postId,
      code: 'provider_recovery_result_missing',
      message: 'Die Regenerationsstufe kann ohne eindeutig persistiertes Providerergebnis nicht sicher wiederholt werden.'
    }, dependencies.runRepository, dependencies.assertLease);
  }

  const allowedFields = TEXT_REGENERATION_FIELDS[claim.job_type];
  const candidate = mergeAllowedFields(currentArticleFromDraft(draft), generated, allowedFields);
  const validationContext = await dependencies.draftRepository.getValidationContext(postId, draft);
  const validation = dependencies.validateArticle(candidate, validationContext);
  if (validation?.passed !== true || typeof validation?.sanitizedHtml !== 'string') {
    return finishManual({
      runId: run.id,
      postId,
      code: 'regenerated_draft_invalid',
      message: 'Das Regenerationsergebnis hat die deterministische Validierung nicht bestanden.',
      issues: Array.isArray(validation?.issues) ? validation.issues : []
    }, dependencies.runRepository, dependencies.assertLease);
  }

  candidate.contentHtml = validation.sanitizedHtml;
  await dependencies.assertLease();
  const updated = await dependencies.draftRepository.updateGeneratedFields({
    postId,
    article: candidate,
    allowedFields
  });
  await dependencies.assertLease();
  await dependencies.runRepository.finishRun(run.id, {
    status: 'completed',
    postId,
    errorReport: {}
  });
  return { status: 'completed', ...updated };
}

async function loadImageResult(context, dependencies) {
  const { run, runtimeSnapshot, draft, stageId } = context;
  const rawPersisted = await dependencies.costService.getPersistedStageResult({
    runId: run.id,
    stageId
  });
  if (rawPersisted !== null && rawPersisted !== undefined) {
    return persistedImage(rawPersisted);
  }

  await dependencies.assertLease();
  const reservation = await dependencies.costService.reserveMonthlyBudget({
    runId: run.id,
    stageId,
    estimatedCost: Number(runtimeSnapshot.imageCostEur || 0),
    limit: Number(runtimeSnapshot.monthlyCostLimitEur || 0),
    timezone: runtimeSnapshot.timezone
  });
  if (reservation.created !== true) return null;

  const currentArticle = currentArticleFromDraft(draft);
  let uploaded;
  try {
    await dependencies.assertLease();
    uploaded = await dependencies.imageService.generateAndUploadImage({
      prompt: currentArticle.imagePrompt,
      filename: currentArticle.imageFilename,
      runId: run.id
    });
  } catch (error) {
    if (error?.code === 'CONTENT_JOB_LEASE_LOST') throw error;
    try {
      await dependencies.costService.settleMonthlyBudget({
        runId: run.id,
        stageId,
        reservationMonth: reservation.reservationMonth,
        actualCost: Number(runtimeSnapshot.imageCostEur || 0)
      });
    } catch {
      // Die unklare kostenpflichtige Bildstufe bleibt bewusst manuell gesperrt.
    }
    await recordImageProviders(dependencies, error?.audit || {});
    return null;
  }

  await dependencies.assertLease();
  await dependencies.costService.settleMonthlyBudget({
    runId: run.id,
    stageId,
    reservationMonth: reservation.reservationMonth,
    actualCost: Number(runtimeSnapshot.imageCostEur || 0)
  });
  const result = {
    imageUrl: uploaded.imageUrl,
    publicId: uploaded.publicId,
    bytes: Number(uploaded.bytes) || 0,
    imageAlt: currentArticle.imageAlt,
    previousPublicId: draft.post.hero_public_id || null,
    audit: uploaded.audit || {}
  };
  await dependencies.assertLease();
  await dependencies.runRepository.updateRunStage(run.id, {
    currentStage: stageId,
    stageId,
    stageResult: result
  });
  await recordImageProviders(dependencies, uploaded.audit || {});
  return result;
}

async function runImageRegeneration(context, dependencies) {
  const { run, draft, postId, stageId } = context;
  const image = await loadImageResult(context, dependencies);
  if (!image) {
    return finishManual({
      runId: run.id,
      postId,
      code: 'image_provider_result_uncertain',
      message: 'Das neue Beitragsbild kann ohne eindeutig persistiertes Providerergebnis nicht sicher wiederholt werden.'
    }, dependencies.runRepository, dependencies.assertLease);
  }

  let update;
  try {
    await dependencies.assertLease();
    update = await dependencies.draftRepository.updateGeneratedImage({
      postId,
      imageUrl: image.imageUrl,
      publicId: image.publicId,
      imageAlt: image.imageAlt || draft.post.image_alt || '',
      expectedOldPublicId: draft.post.hero_public_id || null
    });
  } catch (error) {
    if (error?.code !== 'CONTENT_IMAGE_COMMIT_UNCERTAIN') throw error;
    let reconciled = null;
    try {
      reconciled = await dependencies.draftRepository.reconcileGeneratedImage({
        postId,
        publicId: image.publicId
      });
    } catch {
      // Ohne eindeutigen Abgleich bleiben beide Cloudinarybilder unangetastet.
    }
    if (!reconciled) {
      return finishManual({
        runId: run.id,
        postId,
        code: 'image_commit_uncertain',
        message: 'Der Datenbank-Commit des neuen Beitragsbildes konnte nicht eindeutig bestätigt werden.'
      }, dependencies.runRepository, dependencies.assertLease);
    }
    update = {
      committed: true,
      reconciled: true,
      oldPublicId: image.previousPublicId || null,
      post: reconciled
    };
  }

  const cleanupPublicId = update.oldPublicId === image.publicId
    ? image.previousPublicId
    : update.oldPublicId;
  if (cleanupPublicId && cleanupPublicId !== image.publicId) {
    let cleanup;
    try {
      await dependencies.assertLease();
      cleanup = await dependencies.imageService.deleteImage({ publicId: cleanupPublicId });
    } catch (error) {
      cleanup = {
        status: 'failed',
        publicId: cleanupPublicId,
        code: error?.code || 'IMAGE_CLEANUP_FAILED'
      };
    }
    try {
      await dependencies.assertLease();
      await dependencies.runRepository.updateRunStage(run.id, {
        currentStage: stageId,
        stageId: `${stageId}:cleanup`,
        stageResult: cleanup
      });
    } catch {
      // Das bestätigte Postupdate darf durch ein reines Cleanup-Audit nicht zurückgerollt werden.
    }
  }

  await dependencies.assertLease();
  await dependencies.runRepository.finishRun(run.id, {
    status: 'completed',
    postId,
    errorReport: {}
  });
  return { status: 'completed', post: update.post };
}

function splitDraftRow(row) {
  if (!row) return null;
  const { metadata, ...post } = row;
  return { post, metadata: metadata || null };
}

export function createDraftRegenerationRepository(db = pool) {
  return {
    async getDraftWithMetadata(postId) {
      const { rows } = await db.query(`
        SELECT p.*, to_jsonb(m) AS metadata
        FROM posts p
        LEFT JOIN content_post_metadata m ON m.post_id = p.id
        WHERE p.id = $1
          AND p.generated_by_ai = TRUE
          AND p.published = FALSE
          AND p.content_format = 'static_html'
        LIMIT 1
      `, [postId]);
      return splitDraftRow(rows[0]);
    },

    async getValidationContext(postId, current) {
      const { rows } = await db.query('SELECT slug FROM posts WHERE id <> $1 ORDER BY id', [postId]);
      const metadata = current?.metadata || {};
      return {
        existingSlugs: rows.map(({ slug }) => slug).filter(Boolean),
        allowedInternalLinks: Array.isArray(metadata.internal_links_json)
          ? metadata.internal_links_json
          : [],
        sourceReferences: Array.isArray(metadata.source_references_json)
          ? metadata.source_references_json
          : []
      };
    },

    async updateGeneratedFields({ postId, article, allowedFields }) {
      const uniqueFields = [...new Set(allowedFields || [])];
      if (!uniqueFields.length || uniqueFields.some((field) => !POST_FIELD_MAP[field])) {
        throw regenerationError('CONTENT_REGENERATION_VALIDATION_FAILED', 'Ungültige Feldfreigabe.');
      }
      const client = await db.connect();
      try {
        await client.query('BEGIN');
        const locked = await client.query(`
          SELECT id
          FROM posts
          WHERE id = $1
            AND generated_by_ai = TRUE
            AND published = FALSE
            AND content_format = 'static_html'
          FOR UPDATE
        `, [postId]);
        if (!locked.rows[0]) {
          throw regenerationError('CONTENT_DRAFT_NOT_FOUND', 'KI-Entwurf nicht gefunden.');
        }

        const params = [postId];
        const assignments = uniqueFields.map((field) => {
          const mapping = POST_FIELD_MAP[field];
          const value = mapping.json ? JSON.stringify(article[field]) : article[field];
          params.push(value);
          return `${mapping.column} = $${params.length}${mapping.json ? '::jsonb' : ''}`;
        });
        const { rows } = await client.query(`
          UPDATE posts
          SET ${assignments.join(', ')}, updated_at = NOW()
          WHERE id = $1
            AND generated_by_ai = TRUE
            AND published = FALSE
            AND content_format = 'static_html'
          RETURNING *
        `, params);
        if (!rows[0]) {
          throw regenerationError('CONTENT_DRAFT_NOT_FOUND', 'KI-Entwurf nicht gefunden.');
        }
        const metadataResult = await client.query(
          'SELECT * FROM content_post_metadata WHERE post_id = $1',
          [postId]
        );
        await client.query('COMMIT');
        return { post: rows[0], metadata: metadataResult.rows[0] || null };
      } catch (error) {
        try { await client.query('ROLLBACK'); } catch { /* ursprünglichen Fehler erhalten */ }
        throw error;
      } finally {
        client.release();
      }
    },

    async updateGeneratedImage({ postId, imageUrl, publicId, imageAlt }) {
      const client = await db.connect();
      let commitStarted = false;
      try {
        await client.query('BEGIN');
        const locked = await client.query(`
          SELECT p.id, p.hero_public_id
          FROM posts p
          WHERE p.id = $1
            AND p.generated_by_ai = TRUE
            AND p.published = FALSE
            AND p.content_format = 'static_html'
          FOR UPDATE
        `, [postId]);
        if (!locked.rows[0]) {
          throw regenerationError('CONTENT_DRAFT_NOT_FOUND', 'KI-Entwurf nicht gefunden.');
        }
        const oldPublicId = locked.rows[0].hero_public_id || null;
        const { rows } = await client.query(`
          UPDATE posts
          SET image_url = $2,
              hero_public_id = $3,
              image_alt = $4,
              updated_at = NOW()
          WHERE id = $1
            AND generated_by_ai = TRUE
            AND published = FALSE
            AND content_format = 'static_html'
          RETURNING *
        `, [postId, imageUrl, publicId, imageAlt]);
        if (!rows[0]) {
          throw regenerationError('CONTENT_DRAFT_NOT_FOUND', 'KI-Entwurf nicht gefunden.');
        }
        commitStarted = true;
        await client.query('COMMIT');
        return { committed: true, oldPublicId, post: rows[0] };
      } catch (error) {
        try { await client.query('ROLLBACK'); } catch { /* COMMIT-Ausgang kann unklar sein */ }
        if (commitStarted) {
          throw regenerationError(
            'CONTENT_IMAGE_COMMIT_UNCERTAIN',
            'Der Datenbank-Commit des Beitragsbildes ist unklar.'
          );
        }
        throw error;
      } finally {
        client.release();
      }
    },

    async reconcileGeneratedImage({ postId, publicId }) {
      const { rows } = await db.query(`
        SELECT *
        FROM posts
        WHERE id = $1
          AND generated_by_ai = TRUE
          AND published = FALSE
          AND content_format = 'static_html'
          AND hero_public_id = $2
        LIMIT 1
      `, [postId, publicId]);
      return rows[0] || null;
    }
  };
}

export async function runDraftRegenerationJob({ claim, run, runtimeSnapshot, leaseGuard }, dependencies = {}) {
  if (!REGENERATION_TYPE_SET.has(claim?.job_type)) {
    throw regenerationError(
      'CONTENT_REGENERATION_TYPE_UNSUPPORTED',
      'Regenerationsjobtyp wird nicht unterstützt.'
    );
  }
  if (claim?.payload_json?.forced_mode !== 'review') {
    throw regenerationError(
      'CONTENT_REGENERATION_REVIEW_REQUIRED',
      'Regenerationsjobs dürfen ausschließlich im Reviewmodus laufen.'
    );
  }
  if (!run?.id || !runtimeSnapshot || typeof runtimeSnapshot !== 'object') {
    throw regenerationError('CONTENT_REGENERATION_VALIDATION_FAILED', 'Run oder Runtime-Snapshot fehlt.');
  }

  requiredFunction(dependencies.draftRepository?.getDraftWithMetadata, 'draftRepository.getDraftWithMetadata');
  requiredFunction(dependencies.draftRepository?.getValidationContext, 'draftRepository.getValidationContext');
  requiredFunction(dependencies.draftRepository?.updateGeneratedFields, 'draftRepository.updateGeneratedFields');
  requiredFunction(dependencies.draftRepository?.updateGeneratedImage, 'draftRepository.updateGeneratedImage');
  requiredFunction(dependencies.draftRepository?.reconcileGeneratedImage, 'draftRepository.reconcileGeneratedImage');
  requiredFunction(dependencies.costService?.getPersistedStageResult, 'costService.getPersistedStageResult');
  requiredFunction(dependencies.costService?.reserveMonthlyBudget, 'costService.reserveMonthlyBudget');
  requiredFunction(dependencies.costService?.settleMonthlyBudget, 'costService.settleMonthlyBudget');
  requiredFunction(dependencies.runRepository?.updateRunStage, 'runRepository.updateRunStage');
  requiredFunction(dependencies.runRepository?.finishRun, 'runRepository.finishRun');
  requiredFunction(dependencies.validateArticle, 'validateArticle');
  requiredFunction(dependencies.imageService?.generateAndUploadImage, 'imageService.generateAndUploadImage');
  requiredFunction(dependencies.imageService?.deleteImage, 'imageService.deleteImage');

  const assertLease = typeof leaseGuard === 'function' ? leaseGuard : async () => true;
  const guardedDependencies = { ...dependencies, assertLease };

  const postId = positivePostId(claim.payload_json.post_id);
  const draft = await guardedDependencies.draftRepository.getDraftWithMetadata(postId);
  if (!isEligibleDraft(draft)) {
    throw regenerationError('CONTENT_DRAFT_NOT_FOUND', 'Unveröffentlichter KI-Entwurf nicht gefunden.');
  }
  await assertLease();
  const stageId = `${claim.job_type}:${postId}`;
  const context = { claim, run, runtimeSnapshot, draft, postId, stageId };
  try {
    return claim.job_type === 'regenerate_image'
      ? await runImageRegeneration(context, guardedDependencies)
      : await runTextRegeneration(context, guardedDependencies);
  } catch (error) {
    if (error?.code !== 'CONTENT_BUDGET_LIMIT_REACHED') throw error;
    return finishManual({
      runId: run.id,
      postId,
      code: 'CONTENT_BUDGET_LIMIT_REACHED',
      message: 'Das wirksame Monatsbudget reicht für diese Regeneration nicht aus.'
    }, guardedDependencies.runRepository, assertLease);
  }
}
