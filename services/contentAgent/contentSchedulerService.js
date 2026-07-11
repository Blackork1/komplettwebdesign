import { DateTime } from 'luxon';

function localDateTime(now, timezone) {
  const local = DateTime.fromJSDate(now instanceof Date ? now : new Date(now), { zone: timezone });
  if (!local.isValid) throw new TypeError('Ungültige IANA-Zeitzone.');
  return local;
}

function scheduleTime(value) {
  const normalized = String(value || '').slice(0, 5);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(normalized)) {
    throw new TypeError('Ungültige Scheduler-Uhrzeit.');
  }
  const [hour, minute] = normalized.split(':').map(Number);
  return { hour, minute, normalized };
}

function firstValidScheduledMinute(local, hour, minute) {
  const requestedMinute = hour * 60 + minute;
  for (let minuteOfDay = requestedMinute; minuteOfDay < 24 * 60; minuteOfDay += 1) {
    const candidateHour = Math.floor(minuteOfDay / 60);
    const candidateMinute = minuteOfDay % 60;
    const candidate = DateTime.fromObject({
      year: local.year,
      month: local.month,
      day: local.day,
      hour: candidateHour,
      minute: candidateMinute
    }, { zone: local.zoneName });
    if (
      candidate.isValid
      && candidate.year === local.year
      && candidate.month === local.month
      && candidate.day === local.day
      && candidate.hour === candidateHour
      && candidate.minute === candidateMinute
    ) {
      return minuteOfDay;
    }
  }
  return null;
}

export function getLocalScheduleContext({ now = new Date(), timezone }) {
  const local = localDateTime(now, timezone);
  return {
    date: local.toISODate(),
    weekday: local.weekday,
    time: local.toFormat('HH:mm'),
    minuteStart: local.startOf('minute').toUTC().toISO()
  };
}

export function buildScheduledJobIdentity({ localDate, localTime, timezone }) {
  return `weekly:${localDate}:${localTime}:${timezone}`;
}

export function findDueScheduleSlot({ settings, now = new Date(), graceMinutes = 5 }) {
  if (settings?.agent_enabled !== true) return null;
  const local = localDateTime(now, settings.timezone);
  if (!Array.isArray(settings.schedule_weekdays) || !settings.schedule_weekdays.includes(local.weekday)) {
    return null;
  }

  const { hour, minute, normalized } = scheduleTime(settings.schedule_time);
  const scheduledMinute = firstValidScheduledMinute(local, hour, minute);
  const currentMinute = local.hour * 60 + local.minute;
  const age = scheduledMinute === null ? Number.POSITIVE_INFINITY : currentMinute - scheduledMinute;
  const normalizedGrace = Number(graceMinutes);
  if (!Number.isFinite(normalizedGrace) || normalizedGrace <= 0 || age < 0 || age >= normalizedGrace) {
    return null;
  }

  const localDate = local.toISODate();
  return {
    localDate,
    localTime: normalized,
    timezone: settings.timezone,
    key: buildScheduledJobIdentity({
      localDate,
      localTime: normalized,
      timezone: settings.timezone
    })
  };
}

export async function runContentSchedulerTick({
  getSettings,
  enqueueJob,
  updateSchedulerState,
  now = () => new Date()
}) {
  const tickAt = now();
  let slot = null;
  try {
    const settings = await getSettings();
    slot = findDueScheduleSlot({ settings, now: tickAt });
    await updateSchedulerState({
      lastSchedulerTickAt: tickAt,
      lastScheduledSlot: slot?.key || null,
      lastSchedulerError: null
    });
    if (!slot) return null;
    return await enqueueJob({
      jobType: 'generate_weekly_draft',
      idempotencyKey: slot.key,
      payload: { source: 'weekly-schedule', schedule_slot: slot.key },
      maxAttempts: settings.maximum_attempts
    });
  } catch (error) {
    try {
      await updateSchedulerState({
        lastSchedulerTickAt: tickAt,
        lastScheduledSlot: slot?.key || null,
        lastSchedulerError: error
      });
    } catch {
      // Der ursprüngliche Schedulerfehler bleibt maßgeblich.
    }
    throw error;
  }
}

export function createDynamicContentScheduler({
  tick,
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval
}) {
  let timer = null;
  const runTick = () => {
    void Promise.resolve().then(() => tick()).catch(() => {});
  };
  return {
    start() {
      if (timer !== null) return false;
      timer = setIntervalFn(runTick, 60_000);
      runTick();
      return true;
    },
    stop() {
      if (timer === null) return false;
      clearIntervalFn(timer);
      timer = null;
      return true;
    }
  };
}
