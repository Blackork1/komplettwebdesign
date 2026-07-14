import { isIP } from 'node:net';
import { domainToASCII } from 'node:url';

export const MAX_SAFE_HTTPS_URL_LENGTH = 2_048;

function validHostname(hostname) {
  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    return isIP(hostname.slice(1, -1)) === 6;
  }
  if (isIP(hostname) !== 0) return true;
  const ascii = domainToASCII(hostname);
  if (!ascii || ascii.length > 253) return false;
  return ascii.split('.').every((label) => (
    label.length >= 1
    && label.length <= 63
    && /^[a-z0-9-]+$/iu.test(label)
    && !label.startsWith('-')
    && !label.endsWith('-')
  ));
}

export function normalizeSafeHttpsUrl(value, {
  allowSurroundingWhitespace = false,
  stripHash = false
} = {}) {
  if (typeof value !== 'string') return null;
  const candidate = allowSurroundingWhitespace ? value.trim() : value;
  if (candidate.length === 0
      || candidate.length > MAX_SAFE_HTTPS_URL_LENGTH
      || (!allowSurroundingWhitespace && candidate !== value)
      || /\s/u.test(candidate)) {
    return null;
  }
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'https:'
        || url.username.length > 0
        || url.password.length > 0
        || !validHostname(url.hostname)) {
      return null;
    }
    if (stripHash) url.hash = '';
    const normalized = url.toString();
    return normalized.length <= MAX_SAFE_HTTPS_URL_LENGTH ? normalized : null;
  } catch {
    return null;
  }
}
