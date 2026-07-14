const EMPTY_STATUS = Object.freeze({
  state: 'idle',
  active: false,
  blocksActions: false,
  jobId: null,
  attempts: 0,
  maxAttempts: 0,
  message: '',
  updatedAt: null,
  reloadRecommended: false
});

const STATUS_PRESENTATION = Object.freeze({
  queued: {
    state: 'queued',
    active: true,
    message: 'Die Fehlerbehebung wurde eingeplant und wartet auf den Worker.'
  },
  running: {
    state: 'running',
    active: true,
    message: 'Die Fehlerbehebung wird gerade ausgeführt.'
  },
  completed: {
    state: 'completed',
    active: false,
    message: 'Die Fehlerbehebung wurde erfolgreich abgeschlossen.'
  },
  failed: {
    state: 'failed',
    active: false,
    message: 'Die Fehlerbehebung ist fehlgeschlagen.'
  },
  needs_manual_attention: {
    state: 'manual_attention',
    active: false,
    message: 'Die Fehlerbehebung benötigt eine manuelle Prüfung.'
  },
  cancelled: {
    state: 'failed',
    active: false,
    message: 'Die Fehlerbehebung wurde abgebrochen.'
  }
});

function safeInteger(value) {
  const normalized = Number(value);
  return Number.isSafeInteger(normalized) && normalized >= 0 ? normalized : 0;
}

function safeIso(value) {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
}

export function presentReviewOptimizationStatus({ job, currentReviewVersion } = {}) {
  if (!job || typeof job !== 'object') return { ...EMPTY_STATUS };

  const presentation = STATUS_PRESENTATION[job.status] || STATUS_PRESENTATION.failed;
  const expectedReviewVersion = safeInteger(job.expected_review_version);
  const normalizedCurrentReviewVersion = safeInteger(currentReviewVersion);
  const appliesToCurrentReview = expectedReviewVersion === normalizedCurrentReviewVersion;
  const reloadRecommended = presentation.state === 'completed'
    && expectedReviewVersion > 0
    && normalizedCurrentReviewVersion > expectedReviewVersion;
  const terminalProblem = ['failed', 'manual_attention'].includes(presentation.state);

  return {
    state: presentation.state,
    active: presentation.active,
    blocksActions: presentation.active || ((terminalProblem || presentation.state === 'completed')
      && appliesToCurrentReview),
    jobId: safeInteger(job.id) || null,
    attempts: safeInteger(job.attempts),
    maxAttempts: safeInteger(job.max_attempts),
    message: presentation.message,
    updatedAt: safeIso(job.updated_at),
    reloadRecommended
  };
}
