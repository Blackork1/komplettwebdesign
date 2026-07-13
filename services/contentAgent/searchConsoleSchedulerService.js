import { DateTime } from 'luxon';

function parseSchedule(value) {
  const fields = String(value || '').trim().split(/\s+/);
  const [minute, hour, dayOfMonth, month, weekday] = fields;
  const validMinute = /^(?:[0-9]|[0-5][0-9])$/.test(minute || '');
  const validHour = /^(?:[0-9]|[01][0-9]|2[0-3])$/.test(hour || '');
  const validWeekday = /^[0-6]$/.test(weekday || '');
  if (
    fields.length !== 5
    || !validMinute
    || !validHour
    || dayOfMonth !== '*'
    || month !== '*'
    || !validWeekday
  ) {
    throw new TypeError('Ungültiger Search-Console-Zeitplan.');
  }
  return { minute: Number(minute), hour: Number(hour), weekday: Number(weekday) };
}

export async function runSearchConsoleSchedulerTick({
  configured,
  schedule,
  timezone,
  getSettings,
  operationallyEnabled,
  enqueueJob,
  now = () => new Date()
}) {
  if (configured !== true) return null;
  if (operationallyEnabled === false) return null;
  if (typeof getSettings === 'function') {
    const settings = await getSettings();
    if (settings?.agent_enabled !== true) return null;
  }
  const { minute, hour, weekday } = parseSchedule(schedule);
  const local = DateTime.fromJSDate(now(), { zone: timezone });
  if (!local.isValid) throw new TypeError('Ungültige IANA-Zeitzone.');
  if (local.minute !== minute || local.hour !== hour || local.weekday % 7 !== weekday) return null;
  const localDate = local.toISODate();
  return enqueueJob({
    jobType: 'sync_search_console',
    idempotencyKey: `gsc-sync:${localDate}`,
    payload: {
      startDate: local.minus({ days: 28 }).toISODate(),
      endDate: local.minus({ days: 1 }).toISODate()
    }
  });
}

export function createSearchConsoleScheduler({
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
