const DEFAULT_STOP_TIMEOUT_MS = 30_000;

export class LeaseLostError extends Error {
  constructor(message = 'Die Content-Job-Lease wurde verloren.') {
    super(message);
    this.name = 'LeaseLostError';
    this.code = 'CONTENT_JOB_LEASE_LOST';
    this.retryable = false;
  }
}

function validDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isHeartbeatFresh(heartbeatAt, now = new Date(), maxAgeMs = 90_000) {
  const heartbeat = validDate(heartbeatAt);
  const reference = validDate(now);
  const ageLimit = Number(maxAgeMs);
  if (!heartbeat || !reference || !Number.isFinite(ageLimit) || ageLimit < 0) return false;
  const age = reference.getTime() - heartbeat.getTime();
  return age >= 0 && age <= ageLimit;
}

function requiredFunction(value, name) {
  if (typeof value !== 'function') {
    throw new TypeError(`Die Worker-Abhängigkeit ${name} wird benötigt.`);
  }
  return value;
}

export function createContentWorker(dependencies = {}) {
  const enabled = dependencies.enabled === true;
  const workerId = String(dependencies.workerId || 'content-worker');
  const workerName = String(dependencies.workerName || 'content-worker');
  const version = String(dependencies.version || 'unknown');
  const pollMs = Number(dependencies.pollMs) || 5_000;
  const heartbeatMs = Number(dependencies.heartbeatMs) || 30_000;
  const leaseMinutes = Number(dependencies.leaseMinutes) || 30;
  const leaseRenewMs = Number(dependencies.leaseRenewMs)
    || Math.max(1_000, Math.floor(leaseMinutes * 60_000 / 3));
  const stopTimeoutMs = Number(dependencies.stopTimeoutMs) || DEFAULT_STOP_TIMEOUT_MS;
  const now = dependencies.now || (() => new Date());
  const setIntervalFn = dependencies.setIntervalFn || setInterval;
  const clearIntervalFn = dependencies.clearIntervalFn || clearInterval;
  const setTimeoutFn = dependencies.setTimeoutFn || setTimeout;
  const clearTimeoutFn = dependencies.clearTimeoutFn || clearTimeout;
  const logger = dependencies.logger || console;
  const upsertHeartbeat = requiredFunction(dependencies.upsertHeartbeat, 'upsertHeartbeat');
  const recoverExpiredJobs = requiredFunction(dependencies.recoverExpiredJobs, 'recoverExpiredJobs');
  const claimNextJob = requiredFunction(dependencies.claimNextJob, 'claimNextJob');
  const handleJob = requiredFunction(dependencies.handleJob, 'handleJob');
  const renewJobLease = requiredFunction(dependencies.renewJobLease, 'renewJobLease');
  const completeJob = requiredFunction(dependencies.completeJob, 'completeJob');
  const failJob = requiredFunction(dependencies.failJob, 'failJob');
  const retryOrFailJob = requiredFunction(dependencies.retryOrFailJob, 'retryOrFailJob');
  const markJobNeedsManualAttention = requiredFunction(
    dependencies.markJobNeedsManualAttention,
    'markJobNeedsManualAttention'
  );

  const startedAt = now();
  let lastJobAt = null;
  let pollTimer = null;
  let heartbeatTimer = null;
  let running = false;
  let stopping = false;
  let activePromise = null;
  let heartbeatPromise = null;

  async function executeOnce() {
    await writeHeartbeat();
    await recoverExpiredJobs(leaseMinutes);
    if (stopping) return null;

    const claim = await claimNextJob(workerId);
    if (!claim) return null;

    let leaseValid = true;
    let renewalPromise = null;
    const renewLease = () => {
      if (!leaseValid || renewalPromise) return renewalPromise;
      renewalPromise = Promise.resolve()
        .then(() => renewJobLease(claim))
        .then((renewed) => {
          if (!renewed) leaseValid = false;
          return renewed;
        })
        .catch(() => {
          leaseValid = false;
          return null;
        })
        .finally(() => { renewalPromise = null; });
      return renewalPromise;
    };
    const leaseTimer = setIntervalFn(renewLease, leaseRenewMs);
    const leaseGuard = async () => {
      await renewLease();
      if (!leaseValid) throw new LeaseLostError();
      return true;
    };

    let result;
    try {
      result = await handleJob(claim, { leaseGuard });
      await leaseGuard();
    } catch (error) {
      clearIntervalFn(leaseTimer);
      if (renewalPromise) await renewalPromise;
      lastJobAt = now();
      if (!leaseValid || error instanceof LeaseLostError || error?.code === 'CONTENT_JOB_LEASE_LOST') {
        return { status: 'lease_lost' };
      }
      const terminal = error?.retryable === false
        ? await failJob(claim, error)
        : await retryOrFailJob(claim, error, {
          backoffSeconds: Math.min(3_600, 30 * (2 ** Math.max(0, claim.attempts - 1)))
        });
      if (!terminal) return { status: 'lease_lost' };
      return { status: terminal.status || 'failed' };
    }

    clearIntervalFn(leaseTimer);
    if (renewalPromise) await renewalPromise;
    lastJobAt = now();
    if (!leaseValid) return { status: 'lease_lost' };
    if (result?.status === 'needs_manual_attention') {
      const manual = await markJobNeedsManualAttention(claim, result);
      if (!manual) return { status: 'lease_lost' };
      return result;
    }
    const completed = await completeJob(claim);
    if (!completed) return { status: 'lease_lost' };
    return result;
  }

  function processOnce() {
    if (!enabled || stopping) return Promise.resolve(null);
    if (activePromise) return activePromise;

    const current = executeOnce();
    activePromise = current.finally(() => {
      if (activePromise === wrapped) activePromise = null;
    });
    const wrapped = activePromise;
    return wrapped;
  }

  function pollSafely() {
    processOnce().catch(() => {
      logger.error?.('Content-Worker-Zyklus fehlgeschlagen.');
    });
  }

  function writeHeartbeat() {
    if (heartbeatPromise) return heartbeatPromise;
    const operation = Promise.resolve().then(() => upsertHeartbeat({
      workerName,
      workerId,
      startedAt,
      lastJobAt,
      version
    }));
    let wrapped;
    wrapped = operation.finally(() => {
      if (heartbeatPromise === wrapped) heartbeatPromise = null;
    });
    heartbeatPromise = wrapped;
    return wrapped;
  }

  async function heartbeatSafely() {
    try {
      await writeHeartbeat();
    } catch {
      logger.error?.('Content-Worker-Heartbeat fehlgeschlagen.');
    }
  }

  async function start() {
    if (!enabled || running || stopping) return false;
    running = true;
    pollTimer = setIntervalFn(pollSafely, pollMs);
    heartbeatTimer = setIntervalFn(heartbeatSafely, heartbeatMs);
    pollSafely();
    return true;
  }

  async function stop() {
    stopping = true;
    running = false;
    if (pollTimer !== null) {
      clearIntervalFn(pollTimer);
      pollTimer = null;
    }
    if (heartbeatTimer !== null) {
      clearIntervalFn(heartbeatTimer);
      heartbeatTimer = null;
    }
    if (!activePromise && !heartbeatPromise) return { drained: true };

    let timeout = null;
    const drained = await Promise.race([
      whenIdle().then(() => true),
      new Promise((resolve) => {
        timeout = setTimeoutFn(() => resolve(false), stopTimeoutMs);
      })
    ]);
    if (timeout !== null) clearTimeoutFn(timeout);
    return { drained };
  }

  async function whenIdle() {
    while (activePromise || heartbeatPromise) {
      const pending = [activePromise, heartbeatPromise].filter(Boolean);
      await Promise.allSettled(pending);
    }
  }

  return { start, stop, processOnce, whenIdle };
}
