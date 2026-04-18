/**
 * Shared TTL + LRU audit cache for tester services.
 *
 * Motivation: each of the 4 audit services (website, SEO, GEO, Meta) had its
 * own near-identical `Map`-backed cache with lazy pruning on every request.
 * That meant:
 *   - unbounded memory if prune logic ever missed an entry,
 *   - duplicate cleanup code across 4 files,
 *   - no safety net when no requests come in for a long time.
 *
 * This helper unifies the pattern:
 *   - Per-entry TTL with lazy eviction on get/set
 *   - Hard `maxEntries` cap with LRU-style eviction (oldest inserted first)
 *   - Optional hourly background sweep via setInterval (unref'd so it doesn't
 *     keep the Node process alive during shutdown)
 *
 * All caches share the same code path, so fixes/improvements land everywhere.
 */

const DEFAULT_MAX_ENTRIES = 500;
const DEFAULT_CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1h

export function createAuditCache({
  ttlMs,
  maxEntries = DEFAULT_MAX_ENTRIES,
  cleanupIntervalMs = DEFAULT_CLEANUP_INTERVAL_MS,
  label
} = {}) {
  if (!ttlMs || ttlMs <= 0) {
    throw new Error('createAuditCache: ttlMs is required and must be > 0');
  }

  const store = new Map();

  function prune(now = Date.now()) {
    for (const [key, value] of store.entries()) {
      if (!value || value.expiresAt <= now) {
        store.delete(key);
      }
    }
  }

  function enforceSizeCap() {
    // Map preserves insertion order, so the first key is the oldest insert.
    // For audit results (short-lived, TTL-bounded), this approximates LRU well
    // enough without the overhead of tracking access order.
    while (store.size > maxEntries) {
      const oldestKey = store.keys().next().value;
      if (oldestKey === undefined) break;
      store.delete(oldestKey);
    }
  }

  function set(key, value) {
    if (!key) return;
    prune();
    // Re-insert to move to end of iteration order (approximate LRU on write).
    if (store.has(key)) store.delete(key);
    store.set(key, { expiresAt: Date.now() + ttlMs, value });
    enforceSizeCap();
  }

  function get(key) {
    if (!key) return null;
    const entry = store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      store.delete(key);
      return null;
    }
    return entry.value;
  }

  function del(key) {
    if (!key) return false;
    return store.delete(key);
  }

  function size() {
    return store.size;
  }

  // Background sweep so memory is reclaimed even on idle instances.
  let timer = null;
  if (cleanupIntervalMs > 0) {
    timer = setInterval(() => {
      try {
        prune();
      } catch (err) {
        // Never crash on the background sweep — log and continue.
        // eslint-disable-next-line no-console
        console.warn(`[auditCache${label ? `:${label}` : ''}] prune error`, err);
      }
    }, cleanupIntervalMs);
    if (typeof timer.unref === 'function') timer.unref();
  }

  function stopCleanup() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  return {
    get,
    set,
    delete: del,
    prune,
    size,
    stopCleanup,
    label: label || null
  };
}
