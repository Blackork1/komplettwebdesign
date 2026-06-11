(() => {
  const CUSTOM_SLOT_VALUE = '__custom';
  const root = document.querySelector('.package-detail-page');
  if (!root) return;

  const select = root.querySelector('[data-package-slot-select]');
  const overlay = root.querySelector('[data-package-slot-overlay]');
  if (!select || !overlay) return;

  const lang = overlay.dataset.lng === 'en' ? 'en' : 'de';
  const locale = lang === 'en' ? 'en-GB' : 'de-DE';
  const labels = {
    de: {
      weekdays: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
      loadingDays: 'Freie Termine werden geladen...',
      loadingTimes: 'Uhrzeiten werden geladen...',
      noDays: 'Aktuell sind in diesem Monat keine freien Termine verfügbar.',
      noTimes: 'An diesem Tag sind keine freien Uhrzeiten verfügbar.',
      error: 'Die freien Termine konnten nicht geladen werden. Bitte versuche es erneut.',
      chooseDay: 'Wähle zuerst einen Tag mit freien Terminen.',
      selected: 'Ausgewählter Termin'
    },
    en: {
      weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      loadingDays: 'Loading available appointments...',
      loadingTimes: 'Loading times...',
      noDays: 'There are currently no available appointments in this month.',
      noTimes: 'No available times for this day.',
      error: 'Available appointments could not be loaded. Please try again.',
      chooseDay: 'First choose a day with available appointments.',
      selected: 'Selected appointment'
    }
  }[lang];

  const closeButtons = overlay.querySelectorAll('[data-package-slot-close]');
  const monthLabel = overlay.querySelector('[data-package-month-label]');
  const weekdayRow = overlay.querySelector('[data-package-calendar-weekdays]');
  const daysGrid = overlay.querySelector('[data-package-calendar-days]');
  const statusEl = overlay.querySelector('[data-package-slot-status]');
  const dayPanel = overlay.querySelector('[data-package-day-panel]');
  const timePanel = overlay.querySelector('[data-package-time-panel]');
  const selectedDateEl = overlay.querySelector('[data-package-selected-date]');
  const timeList = overlay.querySelector('[data-package-time-list]');
  const selectedSummary = root.querySelector('[data-package-selected-summary]');
  const navButtons = overlay.querySelectorAll('[data-package-slot-dir]');
  const backToDays = overlay.querySelector('[data-package-back-to-days]');

  const state = {
    month: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    selectedDate: '',
    lastRealValue: select.value && select.value !== CUSTOM_SLOT_VALUE ? select.value : '',
    selectedFromOverlay: false
  };

  function ymd(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function formatMonth(date) {
    return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date);
  }

  function formatDateLabel(dateStr) {
    return new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(new Date(`${dateStr}T00:00:00`));
  }

  function formatShortDateTime(startTime) {
    return new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(startTime));
  }

  function formatTime(startTime) {
    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(startTime));
  }

  function showTimesPanel(showTimes) {
    if (dayPanel) dayPanel.hidden = showTimes;
    if (timePanel) timePanel.hidden = !showTimes;
  }

  function restorePreviousValue() {
    if (select.value !== CUSTOM_SLOT_VALUE) return;
    const fallback = state.lastRealValue || Array.from(select.options).find((option) => option.value !== CUSTOM_SLOT_VALUE)?.value || '';
    select.value = fallback;
  }

  function closeOverlay() {
    restorePreviousValue();
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('package-slot-overlay-open');
    select.focus({ preventScroll: true });
  }

  async function openOverlay() {
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('package-slot-overlay-open');
    statusEl.textContent = labels.loadingDays;
    showTimesPanel(false);
    await loadMonth({ autoAdvance: true, remaining: 6 });
    overlay.querySelector('.package-slot-close')?.focus({ preventScroll: true });
  }

  async function loadMonth(options = {}) {
    const month = `${state.month.getFullYear()}-${String(state.month.getMonth() + 1).padStart(2, '0')}`;
    monthLabel.textContent = formatMonth(state.month);
    weekdayRow.innerHTML = labels.weekdays.map((day) => `<span>${day}</span>`).join('');
    daysGrid.innerHTML = '';
    statusEl.textContent = labels.loadingDays;

    let availableDays = new Set();
    try {
      const response = await fetch(`/api/calendar?month=${encodeURIComponent(month)}`, { credentials: 'same-origin' });
      const data = await response.json();
      availableDays = new Set((data.days || []).map((item) => item.date));
    } catch (_error) {
      statusEl.textContent = labels.error;
      return;
    }

    if (!availableDays.size && options.autoAdvance && options.remaining > 0) {
      state.month = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 1);
      await loadMonth({ autoAdvance: true, remaining: options.remaining - 1 });
      return;
    }

    const firstWeekday = (new Date(state.month.getFullYear(), state.month.getMonth(), 1).getDay() + 6) % 7;
    for (let index = 0; index < firstWeekday; index += 1) {
      const empty = document.createElement('div');
      empty.className = 'package-slot-day package-slot-day--empty';
      daysGrid.appendChild(empty);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysInMonth = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(state.month.getFullYear(), state.month.getMonth(), day);
      const dateStr = ymd(date);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'package-slot-day';
      button.textContent = String(day);

      if (date < today || !availableDays.has(dateStr)) {
        button.classList.add('package-slot-day--muted');
      } else {
        button.classList.add('package-slot-day--available');
        button.addEventListener('click', () => selectDay(dateStr, button));
      }

      daysGrid.appendChild(button);
    }

    statusEl.textContent = availableDays.size ? labels.chooseDay : labels.noDays;
  }

  async function selectDay(dateStr, button) {
    state.selectedDate = dateStr;
    daysGrid.querySelectorAll('.package-slot-day').forEach((item) => {
      item.classList.remove('package-slot-day--selected');
    });
    button.classList.add('package-slot-day--selected');
    selectedDateEl.textContent = formatDateLabel(dateStr);
    timeList.innerHTML = `<p>${labels.loadingTimes}</p>`;
    showTimesPanel(true);

    try {
      const response = await fetch(`/api/day-slots?date=${encodeURIComponent(dateStr)}`, { credentials: 'same-origin' });
      const slots = await response.json();

      if (!Array.isArray(slots) || !slots.length) {
        timeList.innerHTML = `<p>${labels.noTimes}</p>`;
        return;
      }

      timeList.innerHTML = '';
      slots.forEach((slot) => {
        const timeButton = document.createElement('button');
        timeButton.type = 'button';
        timeButton.className = 'package-slot-time-button';
        timeButton.textContent = formatTime(slot.start_time);
        timeButton.addEventListener('click', () => selectTime(slot));
        timeList.appendChild(timeButton);
      });
    } catch (_error) {
      timeList.innerHTML = `<p>${labels.error}</p>`;
    }
  }

  function selectTime(slot) {
    const value = String(slot.id);
    let option = Array.from(select.options).find((candidate) => candidate.value === value);

    if (!option) {
      option = new Option(formatShortDateTime(slot.start_time), value);
      option.dataset.calendarSlot = 'true';
      const customOption = select.querySelector('[data-package-custom-slot]');
      select.insertBefore(option, customOption);
    }

    select.value = String(slot.id);
    state.lastRealValue = value;
    state.selectedFromOverlay = true;

    if (selectedSummary) {
      selectedSummary.hidden = false;
      selectedSummary.textContent = `${labels.selected}: ${formatDateLabel(state.selectedDate)}, ${formatTime(slot.start_time)}`;
    }

    select.dispatchEvent(new Event('change', { bubbles: true }));
    closeOverlay();
  }

  select.addEventListener('change', () => {
    if (select.value === CUSTOM_SLOT_VALUE) {
      openOverlay();
      return;
    }

    if (select.value) {
      state.lastRealValue = select.value;
      if (state.selectedFromOverlay) {
        state.selectedFromOverlay = false;
        return;
      }
      if (selectedSummary) {
        selectedSummary.hidden = true;
      }
    }
  });

  navButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const direction = button.dataset.packageSlotDir === '1' ? 1 : -1;
      state.month = new Date(state.month.getFullYear(), state.month.getMonth() + direction, 1);
      showTimesPanel(false);
      loadMonth();
    });
  });

  backToDays?.addEventListener('click', () => showTimesPanel(false));
  closeButtons.forEach((button) => button.addEventListener('click', closeOverlay));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !overlay.hidden) closeOverlay();
  });
})();
