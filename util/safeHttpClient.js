import dns from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import axios from 'axios';
import ipaddr from 'ipaddr.js';

const BLOCKED_RANGES = new Set([
  'private',
  'loopback',
  'linkLocal',
  'uniqueLocal',
  'carrierGradeNat',
  'reserved',
  'benchmarking',
  'amt',
  'broadcast',
  'unspecified'
]);

function rejectUnsafe(message = 'unsafe-target') {
  const error = new Error(message);
  error.status = 400;
  throw error;
}

export function isPublicIpAddress(address) {
  try {
    const parsed = ipaddr.parse(address);
    return !BLOCKED_RANGES.has(parsed.range());
  } catch {
    return false;
  }
}

export async function assertPublicHttpUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(String(rawUrl || ''));
  } catch {
    rejectUnsafe('invalid-url');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    rejectUnsafe('unsupported-protocol');
  }

  const hostname = parsed.hostname;
  if (!hostname) rejectUnsafe('invalid-host');

  if (ipaddr.isValid(hostname)) {
    if (!isPublicIpAddress(hostname)) rejectUnsafe('private-target');
    const parsedIp = ipaddr.parse(hostname);
    return {
      url: parsed,
      address: parsedIp.toString(),
      family: parsedIp.kind() === 'ipv6' ? 6 : 4
    };
  }

  let lookups;
  try {
    lookups = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    const error = new Error('unreachable-target');
    error.status = 502;
    throw error;
  }

  if (!lookups.length || lookups.some((entry) => !isPublicIpAddress(entry.address))) {
    rejectUnsafe('private-target');
  }

  return {
    url: parsed,
    address: lookups[0].address,
    family: lookups[0].family
  };
}

function agentFor(protocol, hostname, address, family) {
  const lookup = (requestedHostname, _opts, callback) => {
    if (requestedHostname !== hostname) {
      callback(new Error('unsafe-hostname-change'));
      return;
    }
    callback(null, address, family);
  };

  return protocol === 'https:'
    ? new https.Agent({ lookup })
    : new http.Agent({ lookup });
}

export async function safeAxiosRequest(rawUrl, axiosOptions = {}, { maxRedirects = 0 } = {}) {
  let currentUrl = String(rawUrl || '');

  for (let redirects = 0; redirects <= maxRedirects; redirects += 1) {
    const { url, address, family } = await assertPublicHttpUrl(currentUrl);
    const agent = agentFor(url.protocol, url.hostname, address, family);
    const response = await axios.request({
      ...axiosOptions,
      url: url.toString(),
      maxRedirects: 0,
      httpAgent: agent,
      httpsAgent: agent
    });

    if (response.status >= 300 && response.status < 400 && response.headers?.location) {
      if (redirects >= maxRedirects) return { ...response, finalUrl: url.toString() };
      currentUrl = new URL(response.headers.location, url.toString()).toString();
      continue;
    }

    return { ...response, finalUrl: url.toString() };
  }

  const error = new Error('too-many-redirects');
  error.status = 508;
  throw error;
}
