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

function firstValidScheduledDateTime(localDate, timezone, hour, minute) {
  const date = DateTime.fromISO(String(localDate), { zone: timezone });
  if (!date.isValid || date.toISODate() !== localDate) {
    throw new TypeError('Ungültiges lokales Veröffentlichungsdatum.');
  }
  const requestedMinute = hour * 60 + minute;
  for (let minuteOfDay = requestedMinute; minuteOfDay < 24 * 60; minuteOfDay += 1) {
    const candidateHour = Math.floor(minuteOfDay / 60);
    const candidateMinute = minuteOfDay % 60;
    const candidate = DateTime.fromObject({
      year: date.year,
      month: date.month,
      day: date.day,
      hour: candidateHour,
      minute: candidateMinute
    }, { zone: timezone });
    if (
      candidate.isValid
      && candidate.year === date.year
      && candidate.month === date.month
      && candidate.day === date.day
      && candidate.hour === candidateHour
      && candidate.minute === candidateMinute
    ) {
      return candidate;
    }
  }
  throw new TypeError('Für den Veröffentlichungstag existiert keine gültige lokale Uhrzeit.');
}

function generationLeadHours(value) {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized < 1 || normalized > 48) {
    throw new TypeError('Der Generierungsvorlauf muss zwischen 1 und 48 Stunden liegen.');
  }
  return normalized;
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

export function buildPublicationSlot({ settings, localDate }) {
  const { hour, minute, normalized } = scheduleTime(settings.schedule_time);
  const leadHours = generationLeadHours(settings.generation_lead_hours);
  const publication = firstValidScheduledDateTime(
    localDate,
    settings.timezone,
    hour,
    minute
  );
  return {
    key: buildScheduledJobIdentity({
      localDate,
      localTime: normalized,
      timezone: settings.timezone
    }),
    publicationAt: publication.toUTC().toISO(),
    generationAt: publication.minus({ hours: leadHours }).toUTC().toISO(),
    localDate,
    localTime: normalized,
    timezone: settings.timezone
  };
}

export function findDueGenerationSlot({ settings, now = new Date() }) {
  if (settings?.agent_enabled !== true) return null;
  if (!Array.isArray(settings.schedule_weekdays) || settings.schedule_weekdays.length === 0) {
    return null;
  }

  const local = localDateTime(now, settings.timezone);
  const leadHours = generationLeadHours(settings.generation_lead_hours);
  const nowMillis = local.toMillis();
  const firstCandidate = local.startOf('day').minus({ days: 7 });
  const futureDays = Math.ceil(leadHours / 24) + 1;
  let latest = null;
  let latestGenerationMillis = Number.NEGATIVE_INFINITY;

  for (let offset = 0; offset <= 7 + futureDays; offset += 1) {
    const publicationDate = firstCandidate.plus({ days: offset });
    if (!settings.schedule_weekdays.includes(publicationDate.weekday)) continue;
    const slot = buildPublicationSlot({ settings, localDate: publicationDate.toISODate() });
    const generationMillis = Date.parse(slot.generationAt);
    if (generationMillis <= nowMillis && generationMillis > latestGenerationMillis) {
      latest = slot;
      latestGenerationMillis = generationMillis;
    }
  }

  return latest;
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
    slot = findDueGenerationSlot({ settings, now: tickAt });
    await updateSchedulerState({
      lastSchedulerTickAt: tickAt,
      lastScheduledSlot: slot?.key || null,
      lastSchedulerError: null
    });
    if (!slot) return null;
    return await enqueueJob({
      jobType: 'generate_weekly_draft',
      idempotencyKey: `generate:${slot.key}`,
      payload: {
        source: 'weekly-schedule',
        schedule_slot: slot.key,
        publication_at: slot.publicationAt,
        publication_local_date: slot.localDate,
        publication_local_time: slot.localTime,
        publication_timezone: slot.timezone
      },
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
