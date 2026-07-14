import { Router } from 'express';
import { isAdmin } from '../middleware/auth.js';
import { verifyCsrfToken } from '../middleware/csrf.js';
import { createAdminContentAgentController } from '../controllers/adminContentAgentController.js';
import { createContentAgentAdminRepository } from '../repositories/contentAgentAdminRepository.js';
import {
  getContentAgentSettings,
  updateContentAgentSettings
} from '../repositories/contentAgentSettingsRepository.js';
import {
  enqueueManualSearchConsoleSyncJob,
  enqueueJob,
  enqueueReviewOptimizationJob,
  getLatestReviewOptimizationJob,
  recoverDraftPersistenceForAdmin,
  recoverEditorialReviewForAdmin,
  recoverQualityGateJobForAdmin,
  recoverQualityGateRuleManifestForAdmin,
  recoverRejectedProviderJobForAdmin,
  recoverUncertainProviderJobForAdmin,
  retryContentJobForAdmin
} from '../repositories/contentJobRepository.js';
import {
  buildTechnicalConfigPresentation,
  getContentAgentTechnicalConfig
} from '../services/contentAgent/config.js';
import { validateContentAgentSettingsTransition } from '../services/contentAgent/runtimeConfigService.js';
import { createAdminDraftService } from '../services/contentAgent/adminDraftService.js';
import { createContentPublicationService } from '../services/contentAgent/contentPublicationService.js';
import { createScheduledPublicationService } from '../services/contentAgent/scheduledPublicationService.js';
import { createContentRevisionService } from '../services/contentAgent/contentRevisionService.js';
import { createContentRevisionRepository } from '../repositories/contentRevisionRepository.js';
import { createContentLearningRepository } from '../repositories/contentLearningRepository.js';
import { createContentLearningAdminService } from '../services/contentAgent/contentLearningAdminService.js';
import * as blogPostPresentation from '../services/blogPostPresentationService.js';
import * as presentation from '../services/contentAgent/adminPresentationService.js';
import pool from '../util/db.js';

export function createAdminContentAgentRouter(controller) {
  const router = Router();
  router.get('/admin/content-agent', isAdmin, controller.overviewPage);
  router.get('/admin/content-agent/drafts', isAdmin, controller.draftsPage);
  router.get('/admin/content-agent/existing-content', isAdmin, controller.existingContentPage);
  router.get('/admin/content-agent/schedule', isAdmin, controller.schedulePage);
  router.get('/admin/content-agent/jobs', isAdmin, controller.jobsPage);
  router.get('/admin/content-agent/technology', isAdmin, controller.technologyPage);
  router.get('/admin/content-agent/search-console', isAdmin, controller.searchConsolePage);
  router.get('/admin/content-agent/learning-rules', isAdmin, controller.learningRulesPage);
  router.get('/admin/content-agent/drafts/:id/preview', isAdmin, controller.draftPreviewPage);
  router.get('/admin/content-agent/drafts/:id/edit', isAdmin, controller.draftEditPage);
  router.get('/admin/content-agent/drafts/:id/review-optimization-status', isAdmin, controller.reviewOptimizationStatusAction);
  router.get('/admin/content-agent/existing-content/:id/optimization-status', isAdmin, controller.existingContentOptimizationStatusAction);
  router.post('/admin/content-agent/settings', isAdmin, verifyCsrfToken, controller.updateSettingsAction);
  router.post('/admin/content-agent/jobs/manual-draft', isAdmin, verifyCsrfToken, controller.enqueueManualDraftAction);
  router.post('/admin/content-agent/search-console/sync', isAdmin, verifyCsrfToken, controller.syncSearchConsoleAction);
  router.post('/admin/content-agent/learning-rules/proposals/:id/activate', isAdmin, verifyCsrfToken, controller.activateLearningProposalAction);
  router.post('/admin/content-agent/learning-rules/proposals/:id/reject', isAdmin, verifyCsrfToken, controller.rejectLearningProposalAction);
  router.post('/admin/content-agent/learning-rules/:id/revise', isAdmin, verifyCsrfToken, controller.reviseLearningRuleAction);
  router.post('/admin/content-agent/learning-rules/:id/status', isAdmin, verifyCsrfToken, controller.changeLearningRuleStatusAction);
  router.post('/admin/content-agent/jobs/:id/retry', isAdmin, verifyCsrfToken, controller.retryJobAction);
  router.post('/admin/content-agent/jobs/:id/recover-provider', isAdmin, verifyCsrfToken, controller.recoverProviderJobAction);
  router.post('/admin/content-agent/jobs/:id/recover-rejected-provider', isAdmin, verifyCsrfToken, controller.recoverRejectedProviderJobAction);
  router.post('/admin/content-agent/jobs/:id/recover-quality-gate', isAdmin, verifyCsrfToken, controller.recoverQualityGateJobAction);
  router.post('/admin/content-agent/jobs/:id/recover-rule-manifest', isAdmin, verifyCsrfToken, controller.recoverQualityGateRuleManifestAction);
  router.post('/admin/content-agent/jobs/:id/recover-editorial-review', isAdmin, verifyCsrfToken, controller.recoverEditorialReviewAction);
  router.post('/admin/content-agent/jobs/:id/recover-draft-persistence', isAdmin, verifyCsrfToken, controller.recoverDraftPersistenceAction);
  router.post('/admin/content-agent/drafts/:id', isAdmin, verifyCsrfToken, controller.updateDraftAction);
  router.post('/admin/content-agent/drafts/:id/reject', isAdmin, verifyCsrfToken, controller.rejectDraftAction);
  router.post('/admin/content-agent/drafts/:id/regenerate-image', isAdmin, verifyCsrfToken, controller.regenerateImageAction);
  router.post('/admin/content-agent/drafts/:id/regenerate-faq', isAdmin, verifyCsrfToken, controller.regenerateFaqAction);
  router.post('/admin/content-agent/drafts/:id/regenerate-metadata', isAdmin, verifyCsrfToken, controller.regenerateMetadataAction);
  router.post('/admin/content-agent/drafts/:id/regenerate-article', isAdmin, verifyCsrfToken, controller.regenerateDraftAction);
  router.post('/admin/content-agent/drafts/:id/optimize-review', isAdmin, verifyCsrfToken, controller.optimizeReviewIssuesAction);
  router.post('/admin/content-agent/drafts/:id/approve-scheduled', isAdmin, verifyCsrfToken, controller.approveScheduledAction);
  router.post('/admin/content-agent/drafts/:id/publish-now', isAdmin, verifyCsrfToken, controller.publishNowAction);
  router.post('/admin/content-agent/drafts/:id/reschedule', isAdmin, verifyCsrfToken, controller.rescheduleDraftAction);
  router.post('/admin/content-agent/drafts/:id/notification/retry', isAdmin, verifyCsrfToken, controller.retryDraftNotificationAction);
  router.post('/admin/content-agent/existing-content/audit', isAdmin, verifyCsrfToken, controller.enqueueAuditAction);
  router.post('/admin/content-agent/existing-content/:id/optimize', isAdmin, verifyCsrfToken, controller.optimizeExistingContentAction);
  router.post('/admin/content-agent/existing-content/:id/revision', isAdmin, verifyCsrfToken, controller.createRevisionAction);
  router.get('/admin/content-agent/revisions/:id/edit', isAdmin, controller.revisionEditPage);
  router.post('/admin/content-agent/revisions/:id', isAdmin, verifyCsrfToken, controller.updateRevisionAction);
  router.post('/admin/content-agent/revisions/:id/publish', isAdmin, verifyCsrfToken, controller.publishRevisionAction);
  return router;
}

const technicalConfig = getContentAgentTechnicalConfig();
const draftService = createAdminDraftService();
const publicationService = createContentPublicationService();
const scheduledPublicationService = createScheduledPublicationService();
const revisionService = createContentRevisionService({
  repository: createContentRevisionRepository(pool)
});
const learningAdminService = createContentLearningAdminService({
  repository: createContentLearningRepository(pool)
});
const adminRepository = createContentAgentAdminRepository(pool);
const controller = createAdminContentAgentController({
  adminRepository,
  settingsRepository: {
    getSettings: () => getContentAgentSettings(pool),
    updateSettings: (input) => updateContentAgentSettings(input, pool)
  },
  jobRepository: {
    enqueueJob: (input) => enqueueJob(input, pool),
    enqueueReviewOptimizationJob: (input) => enqueueReviewOptimizationJob(input, pool),
    getLatestReviewOptimizationJob: (input) => getLatestReviewOptimizationJob(input, pool),
    enqueueExistingPostOptimizationJob: (input) => adminRepository.enqueueExistingPostOptimizationJob(input),
    enqueueManualSearchConsoleSyncJob: (input) => enqueueManualSearchConsoleSyncJob(input, pool),
    retryContentJobForAdmin: (input) => retryContentJobForAdmin(input, pool),
    recoverUncertainProviderJobForAdmin: (input) => recoverUncertainProviderJobForAdmin(input, pool),
    recoverRejectedProviderJobForAdmin: (input) => recoverRejectedProviderJobForAdmin(input, pool),
    recoverQualityGateJobForAdmin: (input) => recoverQualityGateJobForAdmin(input, pool),
    recoverQualityGateRuleManifestForAdmin: (input) => recoverQualityGateRuleManifestForAdmin(input, pool),
    recoverEditorialReviewForAdmin: (input) => recoverEditorialReviewForAdmin(input, pool),
    recoverDraftPersistenceForAdmin: (input) => recoverDraftPersistenceForAdmin(input, pool)
  },
  runtimeConfig: technicalConfig,
  technicalPresentation: buildTechnicalConfigPresentation({ technicalConfig }),
  presentation,
  validateSettingsTransition: validateContentAgentSettingsTransition,
  draftService,
  publicationService,
  scheduledPublicationService,
  revisionService,
  learningAdminService,
  blogPostPresentation
});

export default createAdminContentAgentRouter(controller);
