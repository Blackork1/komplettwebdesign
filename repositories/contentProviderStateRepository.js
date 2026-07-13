import pool from '../util/db.js';
import { sanitizeErrorMessage } from './contentErrorSanitizer.js';

const PROVIDERS = new Set(['openai', 'cloudinary', 'google_search_console']);

function normalizeProviderName(value) {
  const providerName = String(value || '').trim().toLowerCase();
  if (!PROVIDERS.has(providerName)) {
    throw new TypeError('Der Providername ist nicht zulässig.');
  }
  return providerName;
}

function normalizeErrorCode(value, success) {
  if (success) return null;
  return sanitizeErrorMessage(value || 'PROVIDER_ERROR').slice(0, 120);
}

export async function recordProviderResult(input = {}, db = pool) {
  const providerName = normalizeProviderName(input.providerName);
  const success = input.success === true;
  const errorCode = normalizeErrorCode(input.errorCode, success);
  const { rows } = await db.query(`
    INSERT INTO content_provider_state
      (provider_name, last_success_at, last_failure_at, last_error_code, updated_at)
    VALUES ($1, CASE WHEN $2 THEN NOW() END, CASE WHEN $2 THEN NULL ELSE NOW() END, $3, NOW())
    ON CONFLICT (provider_name) DO UPDATE
    SET last_success_at = CASE WHEN $2 THEN NOW() ELSE content_provider_state.last_success_at END,
        last_failure_at = CASE WHEN $2 THEN content_provider_state.last_failure_at ELSE NOW() END,
        last_error_code = CASE WHEN $2 THEN NULL ELSE $3 END,
        updated_at = NOW()
    RETURNING provider_name, last_success_at, last_failure_at, last_error_code, updated_at
  `, [providerName, success, errorCode]);
  return rows[0] || null;
}
