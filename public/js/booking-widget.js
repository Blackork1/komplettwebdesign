const BOOKING_TIME_ZONE = 'Europe/Berlin';

export function getBookingDayKey(date = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: BOOKING_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export function getNextBookingDayKey(now = new Date()) {
  const [year, month, day] = getBookingDayKey(now).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1, 12)).toISOString().slice(0, 10);
}

export function getSuggestedBookingDays(days, now = new Date()) {
  const minimum = getNextBookingDayKey(now);
  return [...new Set(days)].filter(day => /^\d{4}-\d{2}-\d{2}$/.test(day) && day >= minimum).sort();
}

export function sortAvailableBookingSlots(slots, { date, now = new Date() } = {}) {
  if (!Array.isArray(slots)) return [];
  return slots.filter(slot => {
    const start = Date.parse(slot?.start_time);
    return Number.isInteger(Number(slot?.id)) && Number(slot.id) > 0 && !slot.is_booked && Number.isFinite(start) && start > now.getTime() && (!date || getBookingDayKey(new Date(start)) === date);
  }).sort((a, b) => Date.parse(a.start_time) - Date.parse(b.start_time));
}

export function getBookingFormStage(name, emailIsValid) {
  if (String(name || '').trim().length < 2) return 'name';
  return emailIsValid ? 'details' : 'email';
}

(() => {
  if (typeof document === 'undefined') return;
  const widget = document.querySelector('.kwd-booking-widget');
  if (!widget) return;

  const SITEKEY = widget.dataset.sitekey || '';
  const lang = widget.dataset.lng === 'en' ? 'en' : 'de';
  const locale = lang === 'en' ? 'en-GB' : 'de-DE';
  const RECAPTCHA_TIMEOUT_MS = 12_000;

  const text = {
    de: {
      weekdays: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
      hintNoSlots: 'Leider stehen aktuell keine freien Termine zur Verfügung.',
      loadingTimes: 'Freie Uhrzeiten werden geladen …',
      noTimesForDay: 'An diesem Tag sind keine freien Uhrzeiten verfügbar.',
      loadError: 'Beim Laden ist ein Fehler aufgetreten. Bitte versuche es erneut.',
      backToCalendar: 'Wähle einen markierten Tag im Kalender oder schreib mir eine E-Mail.',
      chooseTime: 'Wähle eine Uhrzeit:',
      selectedLabel: 'Dein Termin',
      noSlotSelected: 'Bitte wähle zuerst einen freien Termin im Kalender aus.',
      validationError: 'Bitte fülle Name und E-Mail korrekt aus.',
      submitting: 'Wird gesendet ...',
      recaptchaError: 'reCAPTCHA-Validierung fehlgeschlagen. Bitte neu versuchen.'
    },
    en: {
      weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      hintNoSlots: 'There are currently no available appointments.',
      loadingTimes: 'Loading times...',
      noTimesForDay: 'No available times for this day.',
      loadError: 'Something went wrong while loading. Please try again.',
      backToCalendar: 'Click a day in the calendar with available appointments.',
      chooseTime: 'Choose a time:',
      selectedLabel: 'Your appointment',
      noSlotSelected: 'Please choose an available appointment in the calendar first.',
      validationError: 'Please enter your name and a valid email address.',
      submitting: 'Sending ...',
      recaptchaError: 'reCAPTCHA validation failed. Please try again.'
    }
  }[lang];

  const monthLabel = widget.querySelector('.kwd-month-label');
  const weekdayRow = widget.querySelector('.kwd-weekday-row');
  const gridDays = widget.querySelector('.kwd-grid-days');
  const navButtons = widget.querySelectorAll('.kwd-nav');
  const stepDay = widget.querySelector('.kwd-step-day');
  const stepTimes = widget.querySelector('.kwd-step-times');
  const stepForm = widget.querySelector('.kwd-step-form');
  const hintEl = widget.querySelector('.kwd-hint');
  const selectedDateEl = widget.querySelector('.kwd-selected-date');
  const selectedSummaryEl = widget.querySelector('.kwd-selected-summary');
  const timeList = widget.querySelector('.kwd-time-list');
  const chooseTimeLabel = widget.querySelector('.kwd-step-subline');
  const form = widget.querySelector('.kwd-booking-form');
  const inputSlotId = form.querySelector('input[name="slotId"]');
  const inputToken = form.querySelector('input[name="g-recaptcha-response"]');
  const msgEl = form.querySelector('.form-msg');

  const initialDay = getNextBookingDayKey().split('-').map(Number);
  const state = {
    month: new Date(initialDay[0], initialDay[1] - 1, 1),
    selectedDate: '',
    selectedSlot: null
  };

  const nameInput = form.querySelector('[name="name"]');
  const emailInput = form.querySelector('[name="email"]');
  const emailStage = form.querySelector('.kwd-email-stage');
  const detailsStage = form.querySelector('.kwd-details-stage');
  const submitBtn = form.querySelector('.kwd-submit');
  const retryBtn = widget.querySelector('.kwd-retry');
  let monthRequest = 0;
  let dayRequest = 0;
  let selectionVersion = 0;

  let recaptchaScriptLoaded = false;
  let recaptchaPromise = null;
  let isSubmitting = false;

  function withTimeout(promise, timeoutMs, message) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error(message));
      }, timeoutMs);

      Promise.resolve(promise).then((value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      }, (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  function loadRecaptchaScript() {
    if (!SITEKEY) return Promise.resolve();
    if (recaptchaScriptLoaded) return recaptchaPromise;
    recaptchaScriptLoaded = true;

    recaptchaPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[src^="https://www.google.com/recaptcha/api.js"]');
      if (existing) {
        const start = Date.now();
        const iv = setInterval(() => {
          if (typeof grecaptcha !== 'undefined') {
            clearInterval(iv);
            grecaptcha.ready(resolve);
          } else if (Date.now() - start > RECAPTCHA_TIMEOUT_MS) {
            clearInterval(iv);
            reject(new Error(text.recaptchaError));
          }
        }, 50);
        return;
      }

      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(SITEKEY)}`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (typeof grecaptcha !== 'undefined') {
          grecaptcha.ready(resolve);
          return;
        }
        const iv = setInterval(() => {
          if (typeof grecaptcha !== 'undefined') {
            clearInterval(iv);
            grecaptcha.ready(resolve);
          }
        }, 50);
      };
      script.onerror = () => reject(new Error(text.recaptchaError));
      document.head.appendChild(script);
    }).finally(() => {
      recaptchaScriptLoaded = false;
      recaptchaPromise = null;
    });

    return recaptchaPromise;
  }

  widget.addEventListener('mouseover', () => loadRecaptchaScript().catch(() => {}), { once: true });
  widget.addEventListener('focusin', () => loadRecaptchaScript().catch(() => {}), { once: true });
  widget.addEventListener('click', () => loadRecaptchaScript().catch(() => {}), { once: true });

  function formatMonth(date) {
    return new Intl.DateTimeFormat(locale, { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1, 12)));
  }

  function formatDateLabel(dateStr) {
    return new Intl.DateTimeFormat(locale, {
      timeZone: 'UTC',
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(new Date(`${dateStr}T12:00:00Z`));
  }

  function formatTime(dateStr) {
    return new Intl.DateTimeFormat(locale, {
      timeZone: BOOKING_TIME_ZONE,
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateStr));
  }

  function ymd(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function showStep(which) {
    stepDay.hidden = which !== 'days';
    stepTimes.hidden = which !== 'times';
    stepForm.hidden = which !== 'form';
  }

  function syncFormStages() {
    const stage = getBookingFormStage(nameInput.value, Boolean(emailInput.value.trim()) && emailInput.validity.valid);
    if (stage !== 'name') emailStage.hidden = false;
    if (stage === 'details') detailsStage.hidden = false;
    emailInput.disabled = emailStage.hidden;
    submitBtn.disabled = isSubmitting || stage !== 'details';
  }

  emailStage.hidden = true;
  detailsStage.hidden = true;
  syncFormStages();
  [nameInput, emailInput].forEach(input => {
    input.addEventListener('input', syncFormStages);
    input.addEventListener('change', syncFormStages);
  });
  form.addEventListener('focusin', syncFormStages);
  window.addEventListener('pageshow', syncFormStages);
  requestAnimationFrame(syncFormStages);
  nameInput.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    syncFormStages();
    if (!emailStage.hidden && nameInput.value.trim().length >= 2) emailInput.focus();
    else nameInput.reportValidity();
  });
  emailInput.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    syncFormStages();
    if (emailInput.value.trim() && emailInput.validity.valid) form.querySelector('[name="note"]').focus();
    else emailInput.reportValidity();
  });

  function resetForm() {
    // Keep personal details when the visitor changes the date or time.
    inputSlotId.value = '';
    if (inputToken) inputToken.value = '';
    msgEl.textContent = '';
    msgEl.classList.remove('is-error');
  }

  function resetToDays() {
    selectionVersion += 1;
    dayRequest += 1;
    state.selectedDate = '';
    state.selectedSlot = null;
    selectedDateEl.textContent = '';
    selectedSummaryEl.textContent = '';
    timeList.innerHTML = '';
    hintEl.textContent = text.backToCalendar;
    retryBtn.hidden = true;
    chooseTimeLabel.textContent = text.chooseTime;
    gridDays.querySelectorAll('.kwd-day').forEach(cell => {
      cell.classList.remove('selected');
      cell.setAttribute('aria-pressed', 'false');
    });
    resetForm();
    showStep('days');
  }

  async function loadMonth(options = {}) {
    const request = ++monthRequest;
    const version = selectionVersion;
    const displayMonth = new Date(state.month);
    const month = `${displayMonth.getFullYear()}-${String(displayMonth.getMonth() + 1).padStart(2, '0')}`;
    monthLabel.textContent = formatMonth(displayMonth);
    weekdayRow.innerHTML = text.weekdays.map(w => `<span>${w}</span>`).join('');
    gridDays.innerHTML = '';
    gridDays.setAttribute('aria-busy', 'true');
    retryBtn.hidden = true;

    let availableDays;
    try {
      const response = await fetch(`/api/calendar?month=${month}`, { credentials: 'same-origin' });
      if (!response.ok) throw new Error('Calendar unavailable');
      const data = await response.json();
      if (!Array.isArray(data.days)) throw new Error('Invalid calendar');
      availableDays = new Set(data.days.map(day => day.date));
    } catch (_error) {
      if (request !== monthRequest) return;
      gridDays.setAttribute('aria-busy', 'false');
      hintEl.textContent = text.loadError;
      retryBtn.hidden = false;
      showStep('days');
      return;
    }
    if (request !== monthRequest || version !== selectionVersion) return;
    gridDays.setAttribute('aria-busy', 'false');

    const firstWeekday = (new Date(displayMonth.getFullYear(), displayMonth.getMonth(), 1).getDay() + 6) % 7;
    for (let i = 0; i < firstWeekday; i += 1) {
      const empty = document.createElement('div');
      empty.className = 'kwd-day empty';
      empty.setAttribute('aria-hidden', 'true');
      gridDays.appendChild(empty);
    }
    const monthEnd = new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 0).getDate();
    const today = getBookingDayKey();
    for (let day = 1; day <= monthEnd; day += 1) {
      const dateStr = ymd(new Date(displayMonth.getFullYear(), displayMonth.getMonth(), day));
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'kwd-day';
      cell.textContent = String(day);
      cell.dataset.date = dateStr;
      cell.setAttribute('aria-label', formatDateLabel(dateStr));
      cell.setAttribute('aria-pressed', 'false');
      const hasFree = dateStr >= today && availableDays.has(dateStr);
      cell.disabled = !hasFree;
      cell.classList.add(hasFree ? 'has-free' : 'muted');
      if (hasFree) cell.addEventListener('click', () => selectDay(dateStr, cell));
      gridDays.appendChild(cell);
    }

    if (options.autoAdvance) {
      const candidates = getSuggestedBookingDays([...availableDays]);
      for (const dateStr of candidates) {
        if (request !== monthRequest || version !== selectionVersion) return;
        const cell = gridDays.querySelector(`[data-date="${dateStr}"]`);
        if (!cell) continue;
        const selected = await selectDay(dateStr, cell, { autoSelect: true });
        if (request !== monthRequest || version !== selectionVersion) return;
        if (selected === null) {
          hintEl.textContent = text.loadError;
          retryBtn.hidden = false;
          showStep('days');
          return;
        }
        if (selected) return;
      }
      if (request !== monthRequest || version !== selectionVersion) return;
      if (options.autoAdvance && options.remaining > 0) {
        state.month = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 1);
        await loadMonth({ autoAdvance: true, remaining: options.remaining - 1 });
        return;
      }
      resetToDays();
      hintEl.textContent = text.hintNoSlots;
    } else if (availableDays.size === 0) {
      hintEl.textContent = text.noTimesForDay;
      showStep('days');
    }
  }

  async function selectDay(dateStr, cell, { autoSelect = false } = {}) {
    if (!autoSelect) selectionVersion += 1;
    const request = ++dayRequest;
    state.selectedDate = dateStr;
    state.selectedSlot = null;
    resetForm();
    gridDays.querySelectorAll('.kwd-day').forEach(day => {
      day.classList.remove('selected');
      day.setAttribute('aria-pressed', 'false');
    });
    cell.classList.add('selected');
    cell.setAttribute('aria-pressed', 'true');
    selectedDateEl.textContent = formatDateLabel(dateStr);
    timeList.textContent = text.loadingTimes;
    showStep('times');
    try {
      const response = await fetch(`/api/day-slots?date=${dateStr}`, { credentials: 'same-origin' });
      if (!response.ok) throw new Error('Times unavailable');
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Invalid times');
      const slots = sortAvailableBookingSlots(data, { date: dateStr });
      if (request !== dayRequest || dateStr !== state.selectedDate) return false;
      if (!slots.length) {
        timeList.textContent = text.noTimesForDay;
        return false;
      }
      timeList.innerHTML = '';
      slots.forEach(slot => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'kwd-time-btn';
        button.textContent = formatTime(slot.start_time);
        button.setAttribute('aria-pressed', 'false');
        button.addEventListener('click', () => selectTime(slot, button));
        timeList.appendChild(button);
      });
      if (autoSelect) selectTime(slots[0], timeList.querySelector('.kwd-time-btn'));
      return true;
    } catch (_error) {
      if (request !== dayRequest) return false;
      timeList.textContent = text.loadError;
      return null;
    }
  }

  function selectTime(slot, button) {
    state.selectedSlot = slot;
    inputSlotId.value = String(slot.id);
    timeList.querySelectorAll('.kwd-time-btn').forEach(item => {
      item.classList.remove('active');
      item.setAttribute('aria-pressed', 'false');
    });
    button.classList.add('active');
    button.setAttribute('aria-pressed', 'true');
    selectedSummaryEl.textContent = `${formatDateLabel(state.selectedDate)} · ${formatTime(slot.start_time)}`;
    syncFormStages();
    showStep('form');
  }

  widget.querySelector('[data-back="days"]').addEventListener('click', resetToDays);
  widget.querySelector('[data-back="times"]').addEventListener('click', () => {
    selectionVersion += 1;
    state.selectedSlot = null;
    resetForm();
    showStep('times');
  });
  retryBtn.addEventListener('click', () => {
    resetToDays();
    const tomorrow = getNextBookingDayKey().split('-').map(Number);
    state.month = new Date(tomorrow[0], tomorrow[1] - 1, 1);
    loadMonth({ autoAdvance: true, remaining: 6 });
  });
  navButtons.forEach(button => {
    button.addEventListener('click', () => {
      const dir = button.dataset.dir === '+1' ? 1 : -1;
      state.month = new Date(state.month.getFullYear(), state.month.getMonth() + dir, 1);
      resetToDays();
      loadMonth();
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    msgEl.textContent = '';
    msgEl.classList.remove('is-error');

    if (!inputSlotId.value) {
      msgEl.textContent = text.noSlotSelected;
      msgEl.classList.add('is-error');
      showStep('times');
      return;
    }

    if (typeof form.checkValidity === 'function' && !form.checkValidity()) {
      msgEl.textContent = text.validationError;
      msgEl.classList.add('is-error');
      if (typeof form.reportValidity === 'function') form.reportValidity();
      return;
    }

    const submitButton = e.submitter || form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton?.textContent || '';
    isSubmitting = true;
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.setAttribute('aria-busy', 'true');
      submitButton.textContent = text.submitting;
    }

    try {
      await withTimeout(loadRecaptchaScript(), RECAPTCHA_TIMEOUT_MS, text.recaptchaError);
      if (SITEKEY && typeof grecaptcha !== 'undefined') {
        const token = await withTimeout(
          grecaptcha.execute(SITEKEY, { action: 'booking_submit' }),
          RECAPTCHA_TIMEOUT_MS,
          text.recaptchaError
        );
        if (inputToken) inputToken.value = token;
      }
      HTMLFormElement.prototype.submit.call(form);
    } catch (_err) {
      isSubmitting = false;
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.removeAttribute('aria-busy');
        submitButton.textContent = originalButtonText;
      }
      msgEl.textContent = text.recaptchaError;
      msgEl.classList.add('is-error');
    }
  });

  loadMonth({ autoAdvance: true, remaining: 6 });
})();
