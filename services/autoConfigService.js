// services/autoConfigService.js
import pool from '../util/db.js';

const DEFAULT_TZ = process.env.AUTO_SLOTS_TZ || 'Europe/Berlin';

export async function loadAutoConfig() {
  const { rows } = await pool.query(
    'SELECT timezone, weeks_ahead, weekdays FROM auto_config WHERE id = 1'
  );
  const row = rows[0] || {};
  return {
    timezone: row.timezone || DEFAULT_TZ,
    weeks_ahead: Number.isInteger(row.weeks_ahead) ? row.weeks_ahead : 6,
    // weekdays: JSONB { "0":[...], "1":[...], ... } oder "1".."7" – beides wird unterstützt
    weekdays: row.weekdays || {}
  };
}

export async function resolveTimezone() {
  try {
    const { rows } = await pool.query(
      'SELECT timezone FROM auto_config WHERE id = 1'
    );
    return rows[0]?.timezone || DEFAULT_TZ;
  } catch {
    return DEFAULT_TZ;
  }
}
