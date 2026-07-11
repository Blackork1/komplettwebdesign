import { randomUUID } from 'node:crypto';

const CONFLICT_CODES = new Set([
  'CONTENT_AGENT_DISABLED',
  'CONTENT_SETTINGS_VERSION_CONFLICT',
  'CONTENT_AUTOPUBLISH_NOT_READY',
  'CONTENT_DRAFT_NOT_PUBLISHABLE',
  'CONTENT_JOB_NOT_RETRYABLE'
]);

const SAFE_ERROR_MESSAGES = Object.freeze({
  CONTENT_AGENT_DISABLED: 'Der Content-Agent ist deaktiviert.',
  CONTENT_SETTINGS_VERSION_CONFLICT: 'Die Einstellungen wurden zwischenzeitlich geändert.',
  CONTENT_AUTOPUBLISH_NOT_READY: 'Direktveröffentlichung ist noch nicht freigegeben.',
  CONTENT_DRAFT_NOT_PUBLISHABLE: 'Der Entwurf kann in diesem Zustand nicht veröffentlicht werden.',
  CONTENT_JOB_NOT_RETRYABLE: 'Der Job kann in diesem Zustand nicht fortgesetzt werden.',
  CONTENT_CONFIRMATION_REQUIRED: 'Die erforderliche Bestätigung fehlt.'
});

export function contentAgentStatus(error) {
  const code = typeof error?.code === 'string' ? error.code : '';
  if (code.endsWith('_NOT_FOUND')) return 404;
  if (CONFLICT_CODES.has(code)) return 409;
  if (code.includes('VALIDATION') || code === 'CONTENT_CONFIRMATION_REQUIRED') {
    return 400;
  }
  return 500;
}

function sendKnownError(error, res, next) {
  const status = contentAgentStatus(error);
  if (status === 500) return next(error);
  const message = SAFE_ERROR_MESSAGES[error.code]
    || (status === 404 ? 'Der angeforderte Inhalt wurde nicht gefunden.' : 'Die Aktion konnte nicht ausgeführt werden.');
  return res.status(status).send(message);
}

function unavailable(res) {
  return res.status(501).send('Diese Content-Agent-Funktion ist noch nicht verfügbar.');
}

function adminFromRequest(req) {
  return {
    id: req.session?.user?.is ?? req.session?.user?.id ?? null,
    username: String(req.session?.user?.username || '')
  };
}

function optionalBoolean(value, fieldName) {
  if (value === undefined) return undefined;
  if (value === true || value === 'true' || value === 'on' || value === '1') return true;
  if (value === false || value === 'false' || value === '0') return false;
  throw Object.assign(new Error(`Ungültiger Wert für ${fieldName}.`), {
    code: 'CONTENT_SETTINGS_VALIDATION_FAILED'
  });
}

function settingsPatch(body = {}) {
  const patch = {};
  if (Object.hasOwn(body, 'agent_enabled')) {
    patch.agentEnabled = optionalBoolean(body.agent_enabled, 'agent_enabled');
  }
  if (Object.hasOwn(body, 'operating_mode')) patch.operatingMode = body.operating_mode;
  if (Object.hasOwn(body, 'schedule_weekdays')) {
    patch.scheduleWeekdays = Array.isArray(body.schedule_weekdays)
      ? body.schedule_weekdays
      : [body.schedule_weekdays];
  } else if (body.settings_form_scope === 'schedule') {
    patch.scheduleWeekdays = [];
  }
  if (Object.hasOwn(body, 'schedule_time')) patch.scheduleTime = body.schedule_time;
  if (Object.hasOwn(body, 'timezone')) patch.timezone = body.timezone;
  if (Object.hasOwn(body, 'monthly_budget_cents')) {
    patch.monthlyBudgetCents = Number(body.monthly_budget_cents);
  }
  if (Object.hasOwn(body, 'auto_publish_min_score')) {
    patch.autoPublishMinScore = Number(body.auto_publish_min_score);
  }
  if (Object.hasOwn(body, 'maximum_attempts')) {
    patch.maximumAttempts = Number(body.maximum_attempts);
  }
  return patch;
}

function transitionTarget(current, patch) {
  return {
    ...current,
    agent_enabled: patch.agentEnabled ?? current.agent_enabled,
    operating_mode: patch.operatingMode ?? current.operating_mode,
    schedule_weekdays: patch.scheduleWeekdays ?? current.schedule_weekdays,
    schedule_time: patch.scheduleTime ?? current.schedule_time,
    timezone: patch.timezone ?? current.timezone,
    monthly_budget_cents: patch.monthlyBudgetCents ?? current.monthly_budget_cents,
    auto_publish_min_score: patch.autoPublishMinScore ?? current.auto_publish_min_score,
    maximum_attempts: patch.maximumAttempts ?? current.maximum_attempts
  };
}

function positiveId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw Object.assign(new Error('Ungültige ID.'), { code: 'CONTENT_ACTION_VALIDATION_FAILED' });
  }
  return id;
}

async function renderCapability({ capability, method, args, res, next }) {
  if (typeof capability?.[method] !== 'function') return unavailable(res);
  try {
    const resolvedArgs = typeof args === 'function' ? args() : args;
    return await capability[method](...resolvedArgs);
  } catch (error) {
    return sendKnownError(error, res, next);
  }
}

async function actionCapability({ capability, method, args, redirect, res, next }) {
  if (typeof capability?.[method] !== 'function') return unavailable(res);
  try {
    const resolvedArgs = typeof args === 'function' ? args() : args;
    await capability[method](...resolvedArgs);
    return res.redirect(redirect);
  } catch (error) {
    return sendKnownError(error, res, next);
  }
}

export function createAdminContentAgentController(dependencies) {
  const {
    adminRepository,
    settingsRepository,
    jobRepository,
    runtimeConfig,
    technicalPresentation = {},
    presentation,
    validateSettingsTransition,
    draftService,
    publicationService,
    revisionService,
    blogPostPresentation
  } = dependencies;

  async function enqueueRegeneration(jobType, req) {
    const postId = positiveId(req.params.id);
    const settings = await settingsRepository.getSettings();
    if (runtimeConfig.enabled !== true || settings.agent_enabled !== true) {
      throw Object.assign(new Error('Content-Agent deaktiviert.'), {
        code: 'CONTENT_AGENT_DISABLED'
      });
    }
    if (typeof draftService?.getDraftForReview !== 'function') {
      throw Object.assign(new Error('Entwurfsprüfung nicht verfügbar.'), {
        code: 'CONTENT_DRAFT_NOT_FOUND'
      });
    }
    await draftService.getDraftForReview(postId);
    const job = await jobRepository.enqueueJob({
      jobType,
      idempotencyKey: `${jobType}:${postId}:${randomUUID()}`,
      payload: {
        source: 'admin_regeneration',
        post_id: postId,
        forced_mode: 'review'
      },
      maxAttempts: Math.min(
        Number(settings.maximum_attempts),
        Number(runtimeConfig.maxAttempts)
      )
    });
    if (!job) {
      throw Object.assign(new Error('Content-Agent deaktiviert.'), {
        code: 'CONTENT_AGENT_DISABLED'
      });
    }
    return job;
  }

  function regenerationAction(jobType, req, res, next) {
    return actionCapability({
      capability: { enqueue: () => enqueueRegeneration(jobType, req) },
      method: 'enqueue',
      args: [],
      redirect: `/admin/content-agent/drafts/${req.params.id}/edit?queued=1`,
      res,
      next
    });
  }

  return {
    async overviewPage(req, res, next) {
      try {
        const data = await adminRepository.getOverview();
        return res.render('admin/contentAgent/overview', {
          dashboard: presentation.buildDashboardPresentation(data),
          settings: data.settings,
          created: req.query?.created === '1'
        });
      } catch (error) {
        return sendKnownError(error, res, next);
      }
    },

    async draftsPage(req, res, next) {
      try {
        const rows = await adminRepository.listDrafts();
        return res.render('admin/contentAgent/drafts', {
          drafts: presentation.buildDraftListPresentation(rows)
        });
      } catch (error) {
        return sendKnownError(error, res, next);
      }
    },

    async existingContentPage(req, res, next) {
      try {
        const rows = await adminRepository.listExistingContent();
        const existingContent = presentation.buildExistingContentListPresentation(rows);
        return res.render('admin/contentAgent/existingContent', { existingContent });
      } catch (error) {
        return sendKnownError(error, res, next);
      }
    },

    async schedulePage(req, res, next) {
      try {
        const settings = await settingsRepository.getSettings();
        return res.render('admin/contentAgent/schedule', { settings, technical: technicalPresentation });
      } catch (error) {
        return sendKnownError(error, res, next);
      }
    },

    async jobsPage(req, res, next) {
      try {
        const rows = await adminRepository.listJobs();
        return res.render('admin/contentAgent/jobs', {
          jobs: presentation.buildJobListPresentation(rows)
        });
      } catch (error) {
        return sendKnownError(error, res, next);
      }
    },

    async technologyPage(req, res, next) {
      try {
        const state = await adminRepository.getTechnologyState();
        return res.render('admin/contentAgent/technology', {
          technology: presentation.buildTechnologyPresentation(technicalPresentation, state)
        });
      } catch (error) {
        return sendKnownError(error, res, next);
      }
    },

    async draftPreviewPage(req, res, next) {
      if (typeof draftService?.getDraftForReview !== 'function'
          || typeof blogPostPresentation?.buildBlogPostPageModel !== 'function') {
        return unavailable(res);
      }
      try {
        const draft = await draftService.getDraftForReview(positiveId(req.params.id));
        const model = blogPostPresentation.buildBlogPostPageModel({
          post: draft.post,
          metadata: draft.metadata,
          pricing: res.locals?.packagePricing || {},
          canonicalBaseUrl: res.locals?.canonicalBaseUrl,
          previewMode: true,
          riskReview: draft.riskReview
        });
        res.set('X-Robots-Tag', 'noindex, nofollow');
        return res.render('blog/show', model);
      } catch (error) {
        return sendKnownError(error, res, next);
      }
    },

    async draftEditPage(req, res, next) {
      if (typeof draftService?.getDraftForReview !== 'function') return unavailable(res);
      try {
        const draft = await draftService.getDraftForReview(positiveId(req.params.id));
        const editorRiskReview = draft.riskReview && typeof draft.riskReview === 'object'
          ? {
              ...draft.riskReview,
              items: Array.isArray(draft.riskReview.items)
                ? draft.riskReview.items.map((item) => ({ ...item, anchor: 'draft-content-html' }))
                : []
            }
          : null;
        return res.render('admin/contentAgent/draftEdit', {
          draft: { ...draft, editorRiskReview },
          saved: req.query?.saved === '1',
          queued: req.query?.queued === '1'
        });
      } catch (error) {
        return sendKnownError(error, res, next);
      }
    },

    revisionEditPage(req, res, next) {
      return renderCapability({
        capability: revisionService,
        method: 'renderRevisionEdit',
        args: () => [positiveId(req.params.id), req, res],
        res,
        next
      });
    },

    async updateSettingsAction(req, res, next) {
      try {
        const current = await settingsRepository.getSettings();
        const patch = settingsPatch(req.body);
        const nextSettings = transitionTarget(current, patch);
        validateSettingsTransition({
          current,
          next: nextSettings,
          technicalConfig: runtimeConfig
        });
        await settingsRepository.updateSettings({
          expectedVersion: Number(req.body?.settings_version),
          patch,
          admin: adminFromRequest(req)
        });
        return res.redirect('/admin/content-agent/schedule?saved=1');
      } catch (error) {
        return sendKnownError(error, res, next);
      }
    },

    async enqueueManualDraftAction(req, res, next) {
      try {
        const settings = await settingsRepository.getSettings();
        if (settings.agent_enabled !== true) {
          throw Object.assign(new Error('Content-Agent deaktiviert.'), {
            code: 'CONTENT_AGENT_DISABLED'
          });
        }
        const job = await jobRepository.enqueueJob({
          jobType: 'generate_manual_draft',
          idempotencyKey: `manual:${randomUUID()}`,
          payload: { source: 'admin_manual', forced_mode: 'review' },
          maxAttempts: Math.min(
            Number(settings.maximum_attempts),
            Number(runtimeConfig.maxAttempts)
          )
        });
        if (!job) {
          throw Object.assign(new Error('Content-Agent deaktiviert.'), {
            code: 'CONTENT_AGENT_DISABLED'
          });
        }
        return res.redirect('/admin/content-agent?created=1');
      } catch (error) {
        return sendKnownError(error, res, next);
      }
    },

    async retryJobAction(req, res, next) {
      try {
        const job = await jobRepository.retryContentJobForAdmin({
          jobId: positiveId(req.params.id),
          hardMaxAttempts: runtimeConfig.maxAttempts
        });
        if (!job) {
          throw Object.assign(new Error('Job kann nicht fortgesetzt werden.'), {
            code: 'CONTENT_JOB_NOT_RETRYABLE'
          });
        }
        return res.redirect('/admin/content-agent/jobs?retried=1');
      } catch (error) {
        return sendKnownError(error, res, next);
      }
    },

    updateDraftAction(req, res, next) {
      return actionCapability({
        capability: draftService,
        method: 'updateDraft',
        args: () => [{ postId: positiveId(req.params.id), input: req.body, admin: adminFromRequest(req) }],
        redirect: `/admin/content-agent/drafts/${req.params.id}/edit?saved=1`,
        res,
        next
      });
    },

    publishDraftAction(req, res, next) {
      return actionCapability({
        capability: publicationService,
        method: 'publishDraftManually',
        args: () => [{
          postId: positiveId(req.params.id),
          admin: adminFromRequest(req),
          confirmed: optionalBoolean(req.body?.confirmed, 'confirmed') === true
        }],
        redirect: '/admin/content-agent/drafts?published=1',
        res,
        next
      });
    },

    rejectDraftAction(req, res, next) {
      return actionCapability({
        capability: publicationService,
        method: 'rejectDraft',
        args: () => [{ postId: positiveId(req.params.id), admin: adminFromRequest(req), reason: req.body?.reason }],
        redirect: '/admin/content-agent/drafts?rejected=1',
        res,
        next
      });
    },

    regenerateImageAction(req, res, next) {
      return regenerationAction('regenerate_image', req, res, next);
    },

    regenerateFaqAction(req, res, next) {
      return regenerationAction('regenerate_faq', req, res, next);
    },

    regenerateMetadataAction(req, res, next) {
      return regenerationAction('regenerate_metadata', req, res, next);
    },

    regenerateDraftAction(req, res, next) {
      return regenerationAction('regenerate_article', req, res, next);
    },

    enqueueAuditAction(req, res, next) {
      return actionCapability({
        capability: revisionService,
        method: 'enqueueAudit',
        args: [{ admin: adminFromRequest(req) }],
        redirect: '/admin/content-agent/existing-content?queued=1',
        res,
        next
      });
    },

    createRevisionAction(req, res, next) {
      return actionCapability({
        capability: revisionService,
        method: 'createRevisionFromAudit',
        args: () => [{
          postId: positiveId(req.params.id),
          auditId: positiveId(req.body?.audit_id),
          admin: adminFromRequest(req)
        }],
        redirect: '/admin/content-agent/existing-content?revision=1',
        res,
        next
      });
    },

    updateRevisionAction(req, res, next) {
      return actionCapability({
        capability: revisionService,
        method: 'updateRevision',
        args: () => [{ revisionId: positiveId(req.params.id), input: req.body, admin: adminFromRequest(req) }],
        redirect: `/admin/content-agent/revisions/${req.params.id}/edit?saved=1`,
        res,
        next
      });
    },

    publishRevisionAction(req, res, next) {
      return actionCapability({
        capability: revisionService,
        method: 'approveRevision',
        args: () => [{
          revisionId: positiveId(req.params.id),
          admin: adminFromRequest(req),
          confirmed: optionalBoolean(req.body?.confirmed, 'confirmed') === true
        }],
        redirect: '/admin/content-agent/existing-content?published=1',
        res,
        next
      });
    }
  };
}
