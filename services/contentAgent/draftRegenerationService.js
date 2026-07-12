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

function positiveReviewVersion(value) {
  const version = Number(value);
  return Number.isSafeInteger(version) && version > 0 ? version : null;
}

function normalizeCommitKey(value) {
  const key = typeof value === 'string' ? value.trim() : '';
  if (!/^[1-9]\d*:regenerate_(?:article|metadata|faq):[1-9]\d*$/.test(key)
      || key.length > 180) {
    throw regenerationError(
      'CONTENT_REGENERATION_VALIDATION_FAILED',
      'Der dauerhafte Regenerations-Commit-Fence ist ungültig.'
    );
  }
  return key;
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

function manualProviderResult(code, message) {
  return { manual: { code, message } };
}

async function reserveAndSettlePersistedStage({
  run,
  stageId,
  runtimeSnapshot,
  estimatedCost,
  actualCost,
  reservationMonth
}, dependencies) {
  const reservation = await dependencies.costService.reserveMonthlyBudget({
    runId: run.id,
    stageId,
    estimatedCost,
    limit: Number(runtimeSnapshot.monthlyCostLimitEur || 0),
    timezone: runtimeSnapshot.timezone
  });
  await dependencies.assertLease();
  await dependencies.costService.settleMonthlyBudget({
    runId: run.id,
    stageId,
    reservationMonth: reservationMonth || reservation.reservationMonth,
    actualCost
  });
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

function persistedOrphanCleanupIntent(value) {
  return value
    && typeof value === 'object'
    && value.kind === 'image_orphan_cleanup_intent'
    && typeof value.publicId === 'string'
    && value.publicId.length > 0
    && ['image_concurrent_update', 'image_commit_not_applied'].includes(value.reason)
    ? value
    : null;
}

function persistedOrphanCleanupOutcome(value, expectedStatus) {
  return value
    && typeof value === 'object'
    && value.kind === 'image_orphan_cleanup_outcome'
    && value.status === expectedStatus
    && typeof value.publicId === 'string'
    && value.publicId.length > 0
    ? value
    : null;
}

async function loadOrphanCleanupRecovery({ run, stageId }, dependencies) {
  const intentStageId = `${stageId}:orphan_cleanup`;
  const deletedStageId = `${intentStageId}:deleted`;
  const failedStageId = `${intentStageId}:failed`;
  const rawIntent = await dependencies.costService.getPersistedStageResult({
    runId: run.id,
    stageId: intentStageId
  });
  const rawDeleted = await dependencies.costService.getPersistedStageResult({
    runId: run.id,
    stageId: deletedStageId
  });
  const rawFailed = await dependencies.costService.getPersistedStageResult({
    runId: run.id,
    stageId: failedStageId
  });
  if (rawIntent == null && rawDeleted == null && rawFailed == null) return null;

  const intent = persistedOrphanCleanupIntent(rawIntent);
  const deleted = rawDeleted == null
    ? null
    : persistedOrphanCleanupOutcome(rawDeleted, 'deleted');
  const failed = rawFailed == null
    ? null
    : persistedOrphanCleanupOutcome(rawFailed, 'failed');
  const outcomeMatches = (outcome) => !outcome || outcome.publicId === intent?.publicId;
  if (!intent || !outcomeMatches(deleted) || !outcomeMatches(failed)) {
    return manualProviderResult(
      'image_cleanup_state_uncertain',
      'Der persistierte Orphan-Cleanup-Zustand ist unvollständig oder widersprüchlich. Das Bild wird weder angewendet noch gelöscht.'
    );
  }
  return {
    cleanupRecovery: {
      intent,
      deleted: Boolean(deleted),
      previousFailure: failed
    }
  };
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
  await finishRunRequired(runRepository, runId, {
    status: 'needs_manual_attention',
    postId,
    errorReport: { code, message, ...(issues.length ? { issues } : {}) }
  }, assertLease);
  return { status: 'needs_manual_attention', code, post: null };
}

function runFinishError(status, cause = null) {
  const error = Object.assign(
    new Error(`Der Content-Agent-Lauf konnte nicht als ${status} abgeschlossen werden.`),
    { code: 'CONTENT_RUN_FINISH_FAILED', retryable: true }
  );
  if (cause) error.cause = cause;
  return error;
}

async function finishRunRequired(runRepository, runId, payload, assertLease = async () => true) {
  await assertLease();
  try {
    const result = await runRepository.finishRun(runId, payload);
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw runFinishError(payload.status);
    return result;
  } catch (error) {
    if (error?.code === 'CONTENT_JOB_LEASE_LOST'
      || (error?.code === 'CONTENT_RUN_FINISH_FAILED' && error?.retryable === true)) {
      throw error;
    }
    throw runFinishError(payload.status, error);
  }
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
    const envelope = providerEnvelope(rawPersisted);
    if (!envelope) return null;
    const reviewVersionBefore = positiveReviewVersion(envelope.reviewVersionBefore);
    if (!reviewVersionBefore) {
      return manualProviderResult(
        'provider_stage_version_fence_missing',
        'Das persistierte Providerergebnis besitzt keinen sicheren Reviewversions-Fence.'
      );
    }
    const actualCost = Number.isFinite(Number(envelope.actualCost))
      ? Number(envelope.actualCost)
      : dependencies.costService.estimateTextCost({
        usage: envelope.usage || {},
        ...textRates(runtimeSnapshot)
      });
    await reserveAndSettlePersistedStage({
      run,
      stageId,
      runtimeSnapshot,
      estimatedCost: textReservation(runtimeSnapshot),
      actualCost,
      reservationMonth: envelope.reservationMonth
    }, dependencies);
    await recordProvider(dependencies, { providerName: 'openai', success: true });
    return { generated: envelope.value, reviewVersionBefore };
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
  const envelope = {
    value: result.value,
    responseId: result.responseId ?? null,
    usage: result.usage || {},
    promptVersion: result.promptVersion || 'unknown',
    reviewVersionBefore: positiveReviewVersion(draft.post.review_version),
    actualCost,
    reservationMonth: reservation.reservationMonth
  };
  if (!envelope.reviewVersionBefore) {
    return manualProviderResult(
      'provider_stage_version_fence_missing',
      'Der Entwurf besitzt keine gültige Reviewversion für die Regeneration.'
    );
  }
  try {
    await dependencies.runRepository.updateRunStage(run.id, {
      currentStage: stageId,
      stageId,
      stageResult: envelope,
      tokenUsage: envelope.usage,
      responseIds: envelope.responseId ? [envelope.responseId] : []
    });
  } catch {
    return manualProviderResult(
      'provider_stage_persistence_uncertain',
      'Das Providerergebnis konnte nicht eindeutig dauerhaft gespeichert werden. Die Budgetreservierung bleibt zur sicheren manuellen Prüfung offen.'
    );
  }
  await dependencies.assertLease();
  await dependencies.costService.settleMonthlyBudget({
    runId: run.id,
    stageId,
    reservationMonth: reservation.reservationMonth,
    actualCost
  });
  await recordProvider(dependencies, { providerName: 'openai', success: true });
  return { generated: envelope.value, reviewVersionBefore: envelope.reviewVersionBefore };
}

async function runTextRegeneration(context, dependencies) {
  const { claim, run, runtimeSnapshot, draft, postId, stageId } = context;
  const loaded = await loadTextResult({
    stageId,
    run,
    runtimeSnapshot,
    draft,
    jobType: claim.job_type
  }, dependencies);
  if (loaded?.manual) {
    return finishManual({
      runId: run.id,
      postId,
      ...loaded.manual
    }, dependencies.runRepository, dependencies.assertLease);
  }
  if (!loaded) {
    return finishManual({
      runId: run.id,
      postId,
      code: 'provider_recovery_result_missing',
      message: 'Die Regenerationsstufe kann ohne eindeutig persistiertes Providerergebnis nicht sicher wiederholt werden.'
    }, dependencies.runRepository, dependencies.assertLease);
  }

  const { generated, reviewVersionBefore } = loaded;

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
    allowedFields,
    expectedReviewVersion: reviewVersionBefore,
    commitKey: `${run.id}:${stageId}`
  });
  await finishRunRequired(dependencies.runRepository, run.id, {
    status: 'completed',
    postId,
    errorReport: {}
  }, dependencies.assertLease);
  return { status: 'completed', ...updated };
}

async function loadImageResult(context, dependencies) {
  const { run, runtimeSnapshot, draft, stageId } = context;
  const cleanupRecovery = await loadOrphanCleanupRecovery({ run, stageId }, dependencies);
  if (cleanupRecovery) return cleanupRecovery;
  const rawPersisted = await dependencies.costService.getPersistedStageResult({
    runId: run.id,
    stageId
  });
  if (rawPersisted !== null && rawPersisted !== undefined) {
    const image = persistedImage(rawPersisted);
    if (!image) return null;
    const actualCost = Number.isFinite(Number(image.actualCost))
      ? Number(image.actualCost)
      : Number(runtimeSnapshot.imageCostEur || 0);
    await reserveAndSettlePersistedStage({
      run,
      stageId,
      runtimeSnapshot,
      estimatedCost: Number(runtimeSnapshot.imageCostEur || 0),
      actualCost,
      reservationMonth: image.reservationMonth
    }, dependencies);
    await recordImageProviders(dependencies, image.audit || {});
    return image;
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
    await dependencies.assertLease();
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

  const actualCost = Number(runtimeSnapshot.imageCostEur || 0);
  const result = {
    imageUrl: uploaded.imageUrl,
    publicId: uploaded.publicId,
    bytes: Number(uploaded.bytes) || 0,
    imageAlt: currentArticle.imageAlt,
    previousPublicId: draft.post.hero_public_id || null,
    actualCost,
    reservationMonth: reservation.reservationMonth,
    audit: uploaded.audit || {}
  };
  try {
    await dependencies.runRepository.updateRunStage(run.id, {
      currentStage: stageId,
      stageId,
      stageResult: result
    });
  } catch {
    return manualProviderResult(
      'provider_stage_persistence_uncertain',
      'Das Bildproviderergebnis konnte nicht eindeutig dauerhaft gespeichert werden. Die Budgetreservierung bleibt zur sicheren manuellen Prüfung offen.'
    );
  }
  await dependencies.assertLease();
  await dependencies.costService.settleMonthlyBudget({
    runId: run.id,
    stageId,
    reservationMonth: reservation.reservationMonth,
    actualCost
  });
  await recordImageProviders(dependencies, uploaded.audit || {});
  return result;
}

async function cleanupGeneratedImage({ runId, stageId, publicId, suffix }, dependencies) {
  let cleanup;
  try {
    await dependencies.assertLease();
    cleanup = await dependencies.imageService.deleteImage({ publicId });
  } catch (error) {
    cleanup = {
      status: 'failed',
      publicId,
      code: error?.code || 'IMAGE_CLEANUP_FAILED'
    };
  }
  try {
    await dependencies.assertLease();
    await dependencies.runRepository.updateRunStage(runId, {
      currentStage: stageId,
      stageId: `${stageId}:${suffix}`,
      stageResult: cleanup
    });
  } catch {
    // Ein bestätigter Postzustand darf durch ein reines Cleanup-Audit nicht zurückgerollt werden.
  }
  return cleanup;
}

async function persistOrphanCleanupOutcome({ runId, stageId, publicId, status, code }, dependencies) {
  await dependencies.assertLease();
  await dependencies.runRepository.updateRunStage(runId, {
    currentStage: stageId,
    stageId: `${stageId}:orphan_cleanup:${status === 'deleted' ? 'deleted' : 'failed'}`,
    stageResult: {
      kind: 'image_orphan_cleanup_outcome',
      status,
      publicId,
      ...(code ? { code } : {})
    }
  });
}

async function resumeOrphanCleanup({ runId, stageId, draft, recovery }, dependencies) {
  const { intent, deleted } = recovery;
  const currentPublicId = draft.post.hero_public_id ?? null;
  if (currentPublicId === intent.publicId) {
    return {
      uncertain: true,
      code: 'image_cleanup_reference_conflict',
      message: 'Der als Orphan markierte Upload ist inzwischen im Entwurf referenziert. Er wird nicht gelöscht oder erneut angewendet.'
    };
  }
  if (deleted) return { completed: true, alreadyDeleted: true };

  await dependencies.assertLease();
  try {
    await dependencies.imageService.deleteImage({ publicId: intent.publicId });
  } catch (error) {
    if (error?.code === 'CONTENT_JOB_LEASE_LOST') throw error;
    try {
      await persistOrphanCleanupOutcome({
        runId,
        stageId,
        publicId: intent.publicId,
        status: 'failed',
        code: error?.code || 'IMAGE_CLEANUP_FAILED'
      }, dependencies);
    } catch (auditError) {
      if (auditError?.code === 'CONTENT_JOB_LEASE_LOST') throw auditError;
    }
    return { completed: false, deleteFailed: true };
  }

  try {
    await persistOrphanCleanupOutcome({
      runId,
      stageId,
      publicId: intent.publicId,
      status: 'deleted'
    }, dependencies);
  } catch (error) {
    if (error?.code === 'CONTENT_JOB_LEASE_LOST') throw error;
    return {
      uncertain: true,
      code: 'image_cleanup_audit_uncertain',
      message: 'Der Orphan wurde gelöscht, der dauerhafte Cleanup-Abschluss ist jedoch unklar. Der Upload wird niemals erneut angewendet.'
    };
  }
  return { completed: true };
}

async function invalidateAndCleanupOrphan({
  runId,
  stageId,
  draft,
  publicId,
  reason,
  expectedOldPublicId,
  currentPublicId
}, dependencies) {
  if (!publicId || currentPublicId === publicId) {
    return {
      uncertain: true,
      code: 'image_cleanup_reference_conflict',
      message: 'Der neue Upload ist nicht eindeutig als unreferenzierter Orphan bestätigt und wird deshalb nicht gelöscht.'
    };
  }
  const intent = {
    kind: 'image_orphan_cleanup_intent',
    publicId,
    reason,
    expectedOldPublicId: expectedOldPublicId ?? null,
    currentPublicId: currentPublicId ?? null
  };
  try {
    await dependencies.assertLease();
    await dependencies.runRepository.updateRunStage(runId, {
      currentStage: stageId,
      stageId: `${stageId}:orphan_cleanup`,
      stageResult: intent
    });
  } catch (error) {
    if (error?.code === 'CONTENT_JOB_LEASE_LOST') throw error;
    return {
      uncertain: true,
      code: 'image_cleanup_invalidation_uncertain',
      message: 'Die dauerhafte Orphan-Markierung ist unklar. Der Upload wird weder gelöscht noch erneut angewendet.'
    };
  }
  return resumeOrphanCleanup({
    runId,
    stageId,
    draft,
    recovery: { intent, deleted: false }
  }, dependencies);
}

async function runImageRegeneration(context, dependencies) {
  const { run, draft, postId, stageId } = context;
  const image = await loadImageResult(context, dependencies);
  if (image?.cleanupRecovery) {
    const cleanup = await resumeOrphanCleanup({
      runId: run.id,
      stageId,
      draft,
      recovery: image.cleanupRecovery
    }, dependencies);
    const intent = image.cleanupRecovery.intent;
    return finishManual({
      runId: run.id,
      postId,
      code: cleanup.code || intent.reason,
      message: cleanup.message || (
        intent.reason === 'image_commit_not_applied'
          ? 'Der nicht übernommene Bild-Upload bleibt dauerhaft invalidiert; ausschließlich sein sicherer Orphan-Cleanup wurde fortgesetzt.'
          : 'Der konkurrierende Bildzustand bleibt erhalten; ausschließlich der sichere Orphan-Cleanup wurde fortgesetzt.'
      )
    }, dependencies.runRepository, dependencies.assertLease);
  }
  if (image?.manual) {
    return finishManual({
      runId: run.id,
      postId,
      ...image.manual
    }, dependencies.runRepository, dependencies.assertLease);
  }
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
      expectedOldPublicId: image.previousPublicId ?? null
    });
  } catch (error) {
    if (error?.code !== 'CONTENT_IMAGE_COMMIT_UNCERTAIN') throw error;
    let reconciled = null;
    try {
      reconciled = await dependencies.draftRepository.reconcileGeneratedImage({
        postId,
        publicId: image.publicId,
        lockedOldPublicId: error.lockedOldPublicId ?? image.previousPublicId ?? null
      });
    } catch {
      // Ohne eindeutigen Abgleich bleiben beide Cloudinarybilder unangetastet.
    }
    if (!reconciled || reconciled.state === 'concurrent') {
      return finishManual({
        runId: run.id,
        postId,
        code: 'image_commit_uncertain',
        message: 'Der Datenbank-Commit des neuen Beitragsbildes konnte nicht eindeutig bestätigt werden.'
      }, dependencies.runRepository, dependencies.assertLease);
    }
    if (reconciled.state === 'not_committed') {
      const cleanup = await invalidateAndCleanupOrphan({
        runId: run.id,
        stageId,
        draft,
        publicId: image.publicId,
        reason: 'image_commit_not_applied',
        expectedOldPublicId: image.previousPublicId ?? null,
        currentPublicId: reconciled.currentPublicId ?? reconciled.post?.hero_public_id ?? null
      }, dependencies);
      return finishManual({
        runId: run.id,
        postId,
        code: cleanup.code || 'image_commit_not_applied',
        message: cleanup.message || 'Der Datenbank-Commit des neuen Beitragsbildes wurde nicht ausgeführt; der Upload bleibt dauerhaft invalidiert und wird ausschließlich als Orphan bereinigt.'
      }, dependencies.runRepository, dependencies.assertLease);
    }
    update = {
      committed: true,
      reconciled: true,
      oldPublicId: error.lockedOldPublicId ?? image.previousPublicId ?? null,
      post: reconciled.post
    };
  }

  if (update?.casMismatch) {
    const cleanup = await invalidateAndCleanupOrphan({
      runId: run.id,
      stageId,
      draft,
      publicId: image.publicId,
      reason: 'image_concurrent_update',
      expectedOldPublicId: image.previousPublicId ?? null,
      currentPublicId: update.currentPublicId ?? null
    }, dependencies);
    return finishManual({
      runId: run.id,
      postId,
      code: cleanup.code || 'image_concurrent_update',
      message: cleanup.message || 'Das Beitragsbild wurde zwischenzeitlich geändert. Das konkurrierende Bild bleibt erhalten; der Upload bleibt dauerhaft invalidiert und wird ausschließlich als Orphan bereinigt.'
    }, dependencies.runRepository, dependencies.assertLease);
  }

  const cleanupPublicId = update.oldPublicId === image.publicId
    ? image.previousPublicId
    : update.oldPublicId;
  if (cleanupPublicId && cleanupPublicId !== image.publicId) {
    await cleanupGeneratedImage({
      runId: run.id,
      stageId,
      publicId: cleanupPublicId,
      suffix: 'cleanup'
    }, dependencies);
  }

  await finishRunRequired(dependencies.runRepository, run.id, {
    status: 'completed',
    postId,
    errorReport: {}
  }, dependencies.assertLease);
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

    async updateGeneratedFields({
      postId,
      article,
      allowedFields,
      expectedReviewVersion,
      commitKey
    }) {
      const uniqueFields = [...new Set(allowedFields || [])];
      if (!uniqueFields.length || uniqueFields.some((field) => !POST_FIELD_MAP[field])) {
        throw regenerationError('CONTENT_REGENERATION_VALIDATION_FAILED', 'Ungültige Feldfreigabe.');
      }
      const normalizedExpectedVersion = positiveReviewVersion(expectedReviewVersion);
      if (!normalizedExpectedVersion) {
        throw regenerationError(
          'CONTENT_REGENERATION_VALIDATION_FAILED',
          'Die erwartete Reviewversion ist ungültig.'
        );
      }
      const normalizedCommitKey = normalizeCommitKey(commitKey);
      const client = await db.connect();
      try {
        await client.query('BEGIN');
        await client.query('LOCK TABLE posts IN SHARE ROW EXCLUSIVE MODE');
        const locked = await client.query(`
          SELECT p.*,
                 m.generation_metadata_json -> 'lastRegenerationCommit'
                   AS regeneration_commit
          FROM posts p
          JOIN content_post_metadata m ON m.post_id = p.id
          WHERE p.id = $1
            AND p.generated_by_ai = TRUE
            AND p.published = FALSE
            AND p.content_format = 'static_html'
          FOR UPDATE OF p, m
        `, [postId]);
        if (!locked.rows[0]) {
          throw regenerationError('CONTENT_DRAFT_NOT_FOUND', 'KI-Entwurf nicht gefunden.');
        }
        const { regeneration_commit: existingCommit, ...lockedPost } = locked.rows[0];
        if (existingCommit?.commitKey === normalizedCommitKey) {
          if (existingCommit.kind !== 'text_regeneration_commit'
              || Number(existingCommit.reviewVersionBefore) !== normalizedExpectedVersion
              || Number(existingCommit.reviewVersionAfter) !== Number(lockedPost.review_version)) {
            throw regenerationError(
              'CONTENT_REGENERATION_COMMIT_FENCE_INVALID',
              'Der dauerhafte Regenerations-Commit-Fence ist widersprüchlich.'
            );
          }
          const metadataResult = await client.query(
            'SELECT * FROM content_post_metadata WHERE post_id = $1',
            [postId]
          );
          await client.query('COMMIT');
          return {
            post: lockedPost,
            metadata: metadataResult.rows[0] || null,
            idempotent: true
          };
        }
        if (Number(lockedPost.review_version) !== normalizedExpectedVersion) {
          throw regenerationError(
            'CONTENT_REGENERATION_STALE',
            'Der Entwurf wurde seit Beginn der Regeneration verändert.'
          );
        }

        const params = [postId];
        const assignments = uniqueFields.map((field) => {
          const mapping = POST_FIELD_MAP[field];
          const value = mapping.json ? JSON.stringify(article[field]) : article[field];
          params.push(value);
          return `${mapping.column} = $${params.length}${mapping.json ? '::jsonb' : ''}`;
        });
        params.push(normalizedExpectedVersion);
        const expectedVersionParameter = params.length;
        const { rows } = await client.query(`
          UPDATE posts
          SET ${assignments.join(', ')},
              review_version = review_version + 1,
              workflow_status = 'needs_review',
              approved_review_version = NULL,
              approved_at = NULL,
              approved_by_admin_id = NULL,
              updated_at = NOW()
          WHERE id = $1
            AND generated_by_ai = TRUE
            AND published = FALSE
            AND content_format = 'static_html'
            AND review_version = $${expectedVersionParameter}
          RETURNING *
        `, params);
        if (!rows[0]) {
          throw regenerationError('CONTENT_DRAFT_NOT_FOUND', 'KI-Entwurf nicht gefunden.');
        }
        const commitMarker = JSON.stringify({
          kind: 'text_regeneration_commit',
          commitKey: normalizedCommitKey,
          postId,
          reviewVersionBefore: normalizedExpectedVersion,
          reviewVersionAfter: Number(rows[0].review_version),
          allowedFields: uniqueFields
        });
        const metadataResult = await client.query(`
          UPDATE content_post_metadata
          SET generation_metadata_json = jsonb_set(
                CASE
                  WHEN jsonb_typeof(generation_metadata_json) = 'object'
                    THEN generation_metadata_json
                  ELSE '{}'::jsonb
                END,
                '{lastRegenerationCommit}',
                $3::jsonb,
                TRUE
              ),
              updated_at = NOW()
          WHERE post_id = $1
            AND COALESCE(
              generation_metadata_json #>> '{lastRegenerationCommit,commitKey}',
              ''
            ) <> $2::text
          RETURNING *
        `, [postId, normalizedCommitKey, commitMarker]);
        if (!metadataResult.rows[0]) {
          throw regenerationError(
            'CONTENT_REGENERATION_COMMIT_FENCE_INVALID',
            'Der Regenerations-Commit-Fence konnte nicht atomar gespeichert werden.'
          );
        }
        await client.query('COMMIT');
        return { post: rows[0], metadata: metadataResult.rows[0] || null };
      } catch (error) {
        try { await client.query('ROLLBACK'); } catch { /* ursprünglichen Fehler erhalten */ }
        throw error;
      } finally {
        client.release();
      }
    },

    async updateGeneratedImage({ postId, imageUrl, publicId, imageAlt, expectedOldPublicId }) {
      const client = await db.connect();
      let commitStarted = false;
      let lockedOldPublicId = null;
      try {
        await client.query('BEGIN');
        await client.query('LOCK TABLE posts IN SHARE ROW EXCLUSIVE MODE');
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
        lockedOldPublicId = locked.rows[0].hero_public_id ?? null;
        const expected = expectedOldPublicId ?? null;
        if (lockedOldPublicId === publicId) {
          await client.query('COMMIT');
          return {
            committed: true,
            idempotent: true,
            oldPublicId: expected,
            post: locked.rows[0]
          };
        }
        if (lockedOldPublicId !== expected) {
          await client.query('COMMIT');
          return {
            committed: false,
            casMismatch: true,
            currentPublicId: lockedOldPublicId,
            post: locked.rows[0]
          };
        }
        const { rows } = await client.query(`
          UPDATE posts
          SET image_url = $2,
              hero_public_id = $3,
              image_alt = $4,
              review_version = review_version + 1,
              workflow_status = 'needs_review',
              approved_review_version = NULL,
              approved_at = NULL,
              approved_by_admin_id = NULL,
              updated_at = NOW()
          WHERE id = $1
            AND generated_by_ai = TRUE
            AND published = FALSE
            AND content_format = 'static_html'
            AND hero_public_id IS NOT DISTINCT FROM $5
          RETURNING *
        `, [postId, imageUrl, publicId, imageAlt, expected]);
        if (!rows[0]) {
          throw regenerationError('CONTENT_DRAFT_NOT_FOUND', 'KI-Entwurf nicht gefunden.');
        }
        commitStarted = true;
        await client.query('COMMIT');
        return { committed: true, oldPublicId: lockedOldPublicId, post: rows[0] };
      } catch (error) {
        try { await client.query('ROLLBACK'); } catch { /* COMMIT-Ausgang kann unklar sein */ }
        if (commitStarted) {
          const uncertain = regenerationError(
            'CONTENT_IMAGE_COMMIT_UNCERTAIN',
            'Der Datenbank-Commit des Beitragsbildes ist unklar.'
          );
          uncertain.lockedOldPublicId = lockedOldPublicId;
          uncertain.newPublicId = publicId;
          throw uncertain;
        }
        throw error;
      } finally {
        client.release();
      }
    },

    async reconcileGeneratedImage({ postId, publicId, lockedOldPublicId = null }) {
      const { rows } = await db.query(`
        SELECT *
        FROM posts
        WHERE id = $1
          AND generated_by_ai = TRUE
          AND published = FALSE
          AND content_format = 'static_html'
        LIMIT 1
      `, [postId]);
      const post = rows[0] || null;
      if (!post) return null;
      const currentPublicId = post.hero_public_id ?? null;
      if (currentPublicId === publicId) return { state: 'committed', post };
      if (currentPublicId === (lockedOldPublicId ?? null)) {
        return { state: 'not_committed', currentPublicId, post };
      }
      return { state: 'concurrent', currentPublicId, post };
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
