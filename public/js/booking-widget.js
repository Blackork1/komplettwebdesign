(() => {
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
      loadingTimes: 'Zeiten werden geladen...',
      noTimesForDay: 'An diesem Tag sind keine freien Uhrzeiten verfügbar.',
      loadError: 'Beim Laden ist ein Fehler aufgetreten. Bitte versuche es erneut.',
      backToCalendar: 'Klicke im Kalender einen Tag mit freien Terminen an.',
      chooseTime: 'Wähle eine Uhrzeit:',
      selectedLabel: 'Ausgewählter Termin',
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
      selectedLabel: 'Selected appointment',
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

  const state = {
    month: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    selectedDate: '',
    selectedSlot: null
  };

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
    return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date);
  }

  function formatDateLabel(dateStr) {
    return new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(new Date(dateStr));
  }

  function formatTime(dateStr) {
    return new Intl.DateTimeFormat(locale, {
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

  function resetForm() {
    form.reset();
    inputSlotId.value = '';
    if (inputToken) inputToken.value = '';
    msgEl.textContent = '';
    msgEl.classList.remove('is-error');
  }

  function resetToDays() {
    state.selectedDate = '';
    state.selectedSlot = null;
    selectedDateEl.textContent = '';
    selectedSummaryEl.textContent = '';
    timeList.innerHTML = '';
    hintEl.textContent = text.backToCalendar;
    chooseTimeLabel.textContent = text.chooseTime;
    gridDays.querySelectorAll('.kwd-day').forEach((cell) => cell.classList.remove('selected'));
    resetForm();
    showStep('days');
  }

  async function loadMonth(options = {}) {
    const month = `${state.month.getFullYear()}-${String(state.month.getMonth() + 1).padStart(2, '0')}`;
    monthLabel.textContent = formatMonth(state.month);
    weekdayRow.innerHTML = text.weekdays.map((w) => `<span>${w}</span>`).join('');
    gridDays.innerHTML = '';

    let availableDays = new Set();
    let loadFailed = false;
    try {
      const res = await fetch(`/api/calendar?month=${month}`, { credentials: 'same-origin' });
      const data = await res.json();
      availableDays = new Set((data.days || []).map((d) => d.date));
    } catch (_err) {
      loadFailed = true;
      hintEl.textContent = text.loadError;
    }

    if (!loadFailed && availableDays.size === 0 && options.autoAdvance && options.remaining > 0) {
      state.month = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 1);
      await loadMonth({ autoAdvance: true, remaining: options.remaining - 1 });
      return;
    }

    const firstWeekday = (new Date(state.month.getFullYear(), state.month.getMonth(), 1).getDay() + 6) % 7;
    for (let i = 0; i < firstWeekday; i += 1) {
      const empty = document.createElement('div');
      empty.className = 'kwd-day empty';
      gridDays.appendChild(empty);
    }

    const monthEnd = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let day = 1; day <= monthEnd; day += 1) {
      const dateObj = new Date(state.month.getFullYear(), state.month.getMonth(), day);
      const dateStr = ymd(dateObj);
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'kwd-day';
      cell.textContent = String(day);

      const isPast = dateObj < today;
      const hasFree = availableDays.has(dateStr);

      if (isPast || !hasFree) {
        cell.classList.add('muted');
      } else {
        cell.classList.add('has-free');
        cell.addEventListener('click', () => selectDay(dateStr, cell));
      }

      gridDays.appendChild(cell);
    }

    if (![...availableDays].length) {
      hintEl.textContent = text.hintNoSlots;
    }
  }

  async function selectDay(dateStr, cell) {
    state.selectedDate = dateStr;
    state.selectedSlot = null;
    resetForm();

    gridDays.querySelectorAll('.kwd-day').forEach((d) => d.classList.remove('selected'));
    cell.classList.add('selected');

    selectedDateEl.textContent = formatDateLabel(dateStr);
    timeList.innerHTML = `<p>${text.loadingTimes}</p>`;
    showStep('times');

    try {
      const res = await fetch(`/api/day-slots?date=${dateStr}`, { credentials: 'same-origin' });
      const slots = await res.json();

      if (!Array.isArray(slots) || slots.length === 0) {
        timeList.innerHTML = `<p>${text.noTimesForDay}</p>`;
        return;
      }

      timeList.innerHTML = '';
      slots.forEach((slot) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'kwd-time-btn';
        btn.textContent = formatTime(slot.start_time);
        btn.addEventListener('click', () => selectTime(slot, btn));
        timeList.appendChild(btn);
      });
    } catch (_err) {
      timeList.innerHTML = `<p>${text.loadError}</p>`;
    }
  }

  function selectTime(slot, btn) {
    state.selectedSlot = slot;
    inputSlotId.value = String(slot.id);
    timeList.querySelectorAll('.kwd-time-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    selectedSummaryEl.textContent = `${text.selectedLabel}: ${formatDateLabel(state.selectedDate)}, ${formatTime(slot.start_time)}`;
    showStep('form');
  }

  widget.querySelector('[data-back="days"]').addEventListener('click', resetToDays);
  widget.querySelector('[data-back="times"]').addEventListener('click', () => {
    state.selectedSlot = null;
    inputSlotId.value = '';
    if (inputToken) inputToken.value = '';
    showStep('times');
  });

  navButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const dir = btn.dataset.dir === '+1' ? 1 : -1;
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
