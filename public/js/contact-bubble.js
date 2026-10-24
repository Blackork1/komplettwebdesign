// Kontakt-Pop-up unten rechts mit Foto von Sören.
// Erscheint nach 20 Sekunden oder ab 30 % Scrolltiefe, höchstens einmal pro Besuch,
// nicht solange der Cookie-Banner offen ist. Nach dem Schließen 7 Tage Ruhe, nach dem Senden 30 Tage.

export const BUBBLE_SETTINGS = Object.freeze({
  delayMs: 20000,
  scrollProgress: 0.3,
  dismissDays: 7,
  sentDays: 30,
  storageKey: 'kwdContactBubbleUntil',
  sessionKey: 'kwdContactBubbleShown'
});

const DAY_MS = 24 * 60 * 60 * 1000;

export function scrollProgress({ scrollY = 0, innerHeight = 0, scrollHeight = 0 } = {}) {
  const max = scrollHeight - innerHeight;
  if (max <= 0) return 0;
  return Math.min(1, Math.max(0, scrollY / max));
}

function safeGet(storage, key) {
  try { return storage?.getItem(key) ?? null; } catch { return null; }
}

function safeSet(storage, key, value) {
  try { storage?.setItem(key, value); } catch { /* Speicher blockiert: dann eben ohne Merken */ }
}

export function isSuppressed({ local, session, now = Date.now(), settings = BUBBLE_SETTINGS } = {}) {
  if (safeGet(session, settings.sessionKey)) return true;
  const until = Number(safeGet(local, settings.storageKey));
  return Number.isFinite(until) && until > now;
}

export function suppressFor(days, { local, now = Date.now(), settings = BUBBLE_SETTINGS } = {}) {
  safeSet(local, settings.storageKey, String(now + days * DAY_MS));
}

export function formatSlotLabel(startTime, locale = 'de-DE') {
  const date = new Date(startTime);
  if (Number.isNaN(date.getTime())) return '';
  const day = new Intl.DateTimeFormat(locale, { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'Europe/Berlin' }).format(date);
  const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' }).format(date);
  return `${day} um ${time} Uhr`;
}

export function pickNextSlot(slots, now = Date.now()) {
  if (!Array.isArray(slots)) return null;
  return slots
    .filter((slot) => slot && !slot.is_booked && Date.parse(slot.start_time) > now)
    .sort((a, b) => Date.parse(a.start_time) - Date.parse(b.start_time))[0] || null;
}

function loadStylesheet(href) {
  return new Promise((resolve) => {
    if (!href || document.querySelector(`link[data-contact-bubble-css]`)) return resolve();
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.contactBubbleCss = '';
    link.onload = () => resolve();
    link.onerror = () => resolve();
    document.head.appendChild(link);
  });
}

function whenCookieBannerClosed() {
  const root = document.documentElement;
  if (!root.classList.contains('cookie-banner-open')) return Promise.resolve();
  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      if (!root.classList.contains('cookie-banner-open')) {
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
  });
}

async function fetchNextSlot() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch('/api/slots?limit=3', { credentials: 'same-origin', signal: controller.signal });
    if (!response.ok) return null;
    return pickNextSlot(await response.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function initContactBubble() {
  const bubble = document.querySelector('[data-contact-bubble]');
  if (!bubble) return;

  const local = window.localStorage;
  const session = window.sessionStorage;
  // Die Ruhezeit gilt nur für das automatische Erscheinen. Klickt jemand selbst auf „Schreib mir“,
  // öffnet sich das Fenster trotzdem.
  const autoAllowed = !isSuppressed({ local, session });

  const teaser = bubble.querySelector('[data-bubble-teaser]');
  const panel = bubble.querySelector('[data-bubble-panel]');
  const launcher = bubble.querySelector('[data-bubble-launcher]');
  const startStep = bubble.querySelector('[data-bubble-step="start"]');
  const form = bubble.querySelector('[data-bubble-form]');
  const done = bubble.querySelector('[data-bubble-done]');
  const status = bubble.querySelector('[data-bubble-status]');
  let triggered = false;
  let formStartedAt = 0;
  let timer = null;

  const onScroll = () => {
    const progress = scrollProgress({
      scrollY: window.scrollY,
      innerHeight: window.innerHeight,
      scrollHeight: document.documentElement.scrollHeight
    });
    if (progress >= BUBBLE_SETTINGS.scrollProgress) trigger();
  };

  function stopWatching() {
    clearTimeout(timer);
    window.removeEventListener('scroll', onScroll);
  }

  function popIn(element) {
    element.classList.remove('is-popping');
    void element.offsetWidth;
    element.classList.add('is-popping');
  }

  async function reveal() {
    const [, slot] = await Promise.all([loadStylesheet(bubble.dataset.css), fetchNextSlot()]);
    if (slot) {
      const label = formatSlotLabel(slot.start_time);
      bubble.querySelectorAll('[data-bubble-slot]').forEach((line) => {
        const target = line.querySelector('[data-bubble-slot-text]');
        if (target && label) {
          target.textContent = label;
          line.hidden = false;
        }
      });
    }
    bubble.hidden = false;
    document.documentElement.classList.add('has-contact-bubble');
  }

  async function trigger() {
    if (triggered) return;
    triggered = true;
    stopWatching();
    await whenCookieBannerClosed();
    await reveal();
    safeSet(session, BUBBLE_SETTINGS.sessionKey, '1');
    popIn(launcher);
    popIn(teaser);
  }

  function showWriteStep() {
    startStep.hidden = true;
    form.hidden = false;
    formStartedAt = Date.now();
    form.querySelector('textarea')?.focus({ preventScroll: true });
  }

  async function openFromCta(mode) {
    stopWatching();
    const wasHidden = bubble.hidden;
    triggered = true;
    if (wasHidden) await reveal();
    if (wasHidden) popIn(launcher);
    openPanel();
    if (mode === 'write' && done.hidden) {
      if (form.hidden) showWriteStep();
      else form.querySelector('textarea')?.focus({ preventScroll: true });
    }
  }

  function openPanel() {
    teaser.hidden = true;
    panel.hidden = false;
    launcher.setAttribute('aria-expanded', 'true');
    popIn(panel);
    const firstAction = panel.querySelector('[data-bubble-step="start"] a, [data-bubble-step="start"] button');
    firstAction?.focus({ preventScroll: true });
  }

  function closePanel({ restoreFocus = true } = {}) {
    panel.hidden = true;
    launcher.setAttribute('aria-expanded', 'false');
    if (restoreFocus) launcher.focus({ preventScroll: true });
  }

  launcher.addEventListener('click', () => {
    if (panel.hidden) openPanel();
    else closePanel();
  });
  bubble.querySelector('[data-bubble-open]')?.addEventListener('click', openPanel);
  bubble.querySelector('[data-bubble-close]')?.addEventListener('click', () => closePanel());
  bubble.querySelector('[data-bubble-dismiss]')?.addEventListener('click', () => {
    teaser.hidden = true;
    suppressFor(BUBBLE_SETTINGS.dismissDays, { local });
    launcher.focus({ preventScroll: true });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) closePanel();
  });

  bubble.querySelector('[data-bubble-write]')?.addEventListener('click', showWriteStep);

  document.addEventListener('click', (event) => {
    const opener = event.target.closest?.('[data-contact-bubble-open]');
    if (!opener) return;
    event.preventDefault();
    openFromCta(opener.getAttribute('data-contact-bubble-open'));
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = form.elements.message.value.trim();
    const email = form.elements.email.value.trim();
    if (message.length < 10) {
      status.textContent = 'Bitte schreib kurz, worum es geht (mindestens 10 Zeichen).';
      form.elements.message.focus();
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      status.textContent = 'Bitte gib eine gültige E-Mail-Adresse an.';
      form.elements.email.focus();
      return;
    }
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    status.textContent = 'Wird gesendet …';
    try {
      const response = await fetch('/api/kurzanfrage', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          message,
          email,
          website: form.elements.website.value,
          startedAt: formStartedAt,
          page: window.location.pathname
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.message || 'Senden fehlgeschlagen');
      form.hidden = true;
      done.hidden = false;
      done.focus({ preventScroll: true });
      suppressFor(BUBBLE_SETTINGS.sentDays, { local });
    } catch (error) {
      status.textContent = error.message || 'Das Senden hat gerade nicht geklappt. Bitte versuch es noch einmal.';
      submit.disabled = false;
    }
  });

  if (autoAllowed) {
    timer = setTimeout(trigger, BUBBLE_SETTINGS.delayMs);
    window.addEventListener('scroll', onScroll, { passive: true });
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initContactBubble);
  else initContactBubble();
}
