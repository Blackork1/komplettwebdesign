const DEFAULT_STOP_TIMEOUT_MS = 30_000;

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
  const leaseMinutes = Number(dependencies.leaseMinutes) || 30;
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
  const completeJob = requiredFunction(dependencies.completeJob, 'completeJob');
  const failJob = requiredFunction(dependencies.failJob, 'failJob');

  const startedAt = now();
  let lastJobAt = null;
  let timer = null;
  let running = false;
  let stopping = false;
  let activePromise = null;

  async function executeOnce() {
    await upsertHeartbeat({ workerName, workerId, startedAt, lastJobAt, version });
    await recoverExpiredJobs(leaseMinutes);
    if (stopping) return null;

    const claim = await claimNextJob(workerId);
    if (!claim) return null;

    try {
      const result = await handleJob(claim);
      await completeJob(claim);
      lastJobAt = now();
      return result;
    } catch (error) {
      await failJob(claim, error);
      lastJobAt = now();
      return { status: 'failed' };
    }
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

  async function start() {
    if (!enabled || running || stopping) return false;
    running = true;
    timer = setIntervalFn(pollSafely, pollMs);
    pollSafely();
    return true;
  }

  async function stop() {
    stopping = true;
    running = false;
    if (timer !== null) {
      clearIntervalFn(timer);
      timer = null;
    }
    if (!activePromise) return { drained: true };

    let timeout = null;
    const drained = await Promise.race([
      activePromise.then(() => true, () => true),
      new Promise((resolve) => {
        timeout = setTimeoutFn(() => resolve(false), stopTimeoutMs);
      })
    ]);
    if (timeout !== null) clearTimeoutFn(timeout);
    return { drained };
  }

  return { start, stop, processOnce };
}
