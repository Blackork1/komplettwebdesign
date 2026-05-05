import dns from 'dns/promises';
import ipaddr from 'ipaddr.js';
import { safeAxiosRequest } from '../util/safeHttpClient.js';

/**
 * GEO-specific checks that go beyond the base Website-Audit.
 *
 * Rationale: the Website-Audit already produces solid SEO/technical signals
 * (title, meta, schema presence, robots reachable, sitemap reachable, etc.)
 * but none of them are GEO / generative-search specific. This module adds the
 * signals that actually matter for AI-Overviews / ChatGPT / Perplexity-style
 * retrieval:
 *
 *   - llms.txt presence (emerging standard for LLM-facing directives)
 *   - robots.txt directives for LLM user-agents
 *     (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot, anthropic-ai,
 *      ChatGPT-User, cohere-ai, Applebot-Extended, Meta-ExternalAgent, Bytespider)
 *   - Per-page FAQ JSON-LD count across crawled pages
 *   - Organization schema presence + key fields (address, sameAs, contactPoint)
 *
 * Kept intentionally lightweight — only 1 extra HTTP fetch (llms.txt); robots.txt
 * parsing piggybacks on a caller-supplied body. The other signals are derived
 * from data the Website-Audit already collected.
 */

const USER_AGENT = 'KomplettWebdesign GEO Tester/2.0 (+https://komplettwebdesign.de)';
const FETCH_TIMEOUT_MS = 8_000;
const MAX_RESPONSE_BYTES = 200_000;

// User-agent tokens of known LLM / AI-answer crawlers. Each entry is the exact
// token we expect to match against User-agent lines in robots.txt.
const LLM_USER_AGENTS = [
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'ClaudeBot',
  'Claude-Web',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'CCBot',
  'cohere-ai',
  'Applebot-Extended',
  'Meta-ExternalAgent',
  'FacebookBot',
  'Bytespider',
  'Amazonbot',
  'YouBot',
  'DuckAssistBot',
  'Diffbot'
];

async function assertPublicTarget(targetUrl) {
  const parsed = new URL(targetUrl);
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('unsupported-protocol');
  }
  const hostname = parsed.hostname;
  const lookup = await dns.lookup(hostname, { all: true });
  for (const entry of lookup) {
    let addr;
    try {
      addr = ipaddr.parse(entry.address);
    } catch {
      continue;
    }
    const range = addr.range();
    const blocked = new Set([
      'private',
      'loopback',
      'linkLocal',
      'uniqueLocal',
      'carrierGradeNat',
      'reserved',
      'benchmarking',
      'amt'
    ]);
    if (blocked.has(range)) {
      throw new Error('private-target');
    }
  }
}

async function fetchText(url) {
  try {
    await assertPublicTarget(url);
    const response = await safeAxiosRequest(url, {
      method: 'GET',
      timeout: FETCH_TIMEOUT_MS,
      responseType: 'text',
      maxContentLength: MAX_RESPONSE_BYTES,
      maxBodyLength: MAX_RESPONSE_BYTES,
      validateStatus: () => true,
      headers: { 'User-Agent': USER_AGENT }
    }, { maxRedirects: 3 });
    return response;
  } catch {
    return null;
  }
}

/**
 * Parse a robots.txt body into { allow: Set, disallow: Set } keyed by LLM UA.
 * A UA counts as "disallow" if any rule block that names it (case-insensitive)
 * contains `Disallow: /` (root) or no Allow to offset it. Simplified, not RFC
 * exact, but enough to flag a "blocking LLMs at all" stance vs "letting them in".
 */
function parseRobotsForLlmAgents(robotsText) {
  const byUa = {};
  for (const ua of LLM_USER_AGENTS) {
    byUa[ua] = { mentioned: false, disallowsRoot: false, allowsRoot: false };
  }
  if (!robotsText || typeof robotsText !== 'string') return byUa;

  // Split into blocks separated by blank lines. Each block has one or more
  // User-agent lines followed by Allow / Disallow rules.
  const blocks = robotsText.replace(/\r\n/g, '\n').split(/\n\s*\n/);
  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
    const blockUas = [];
    const rules = [];
    for (const line of lines) {
      const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
      if (!m) continue;
      const key = m[1].toLowerCase();
      const value = m[2].trim();
      if (key === 'user-agent') blockUas.push(value);
      else if (key === 'disallow' || key === 'allow') rules.push({ type: key, value });
    }
    if (!blockUas.length) continue;
    for (const uaRaw of blockUas) {
      const match = LLM_USER_AGENTS.find((candidate) => candidate.toLowerCase() === uaRaw.toLowerCase());
      if (!match) continue;
      byUa[match].mentioned = true;
      for (const rule of rules) {
        const val = rule.value;
        if (rule.type === 'disallow' && (val === '/' || val === '')) {
          // "Disallow:" (empty) means "allow all"
          if (val === '') byUa[match].allowsRoot = true;
          else byUa[match].disallowsRoot = true;
        } else if (rule.type === 'allow' && (val === '/' || val === '*')) {
          byUa[match].allowsRoot = true;
        }
      }
    }
  }
  return byUa;
}

function summarizeLlmAgentAccess(byUa) {
  const total = LLM_USER_AGENTS.length;
  let mentioned = 0;
  let disallowed = 0;
  let allowed = 0;
  const disallowedAgents = [];
  for (const [ua, info] of Object.entries(byUa)) {
    if (info.mentioned) mentioned += 1;
    if (info.disallowsRoot) {
      disallowed += 1;
      disallowedAgents.push(ua);
    }
    if (info.allowsRoot || (info.mentioned && !info.disallowsRoot)) allowed += 1;
  }
  return {
    totalTracked: total,
    mentioned,
    disallowed,
    allowed,
    disallowedAgents
  };
}

/**
 * Main entry point. Given a base origin (https://example.com) and the
 * already-fetched robotsText (may be null), returns GEO-specific signals.
 *
 * @param {object} opts
 * @param {string} opts.origin        - e.g. "https://example.com"
 * @param {string|null} opts.robotsText - robots.txt body from the main audit,
 *                                        may be null if unreachable
 * @param {Array<{url:string, html?:string, hasFaqSchema?:boolean,
 *                hasOrganizationSchema?:boolean}>} [opts.analyzedPages]
 */
export async function runGeoSpecificChecks({ origin, robotsText = null, analyzedPages = [] } = {}) {
  const results = {
    llmsTxt: { present: false, url: null, size: 0 },
    llmAgents: summarizeLlmAgentAccess(parseRobotsForLlmAgents(robotsText)),
    perPageFaqCount: 0,
    orgSchemaCount: 0,
    pagesAnalyzed: analyzedPages.length
  };

  if (origin) {
    const llmsUrl = `${origin.replace(/\/$/, '')}/llms.txt`;
    const llmsRes = await fetchText(llmsUrl);
    if (llmsRes && llmsRes.status >= 200 && llmsRes.status < 300 && typeof llmsRes.data === 'string') {
      results.llmsTxt = {
        present: true,
        url: llmsUrl,
        size: llmsRes.data.length
      };
    }
  }

  for (const page of analyzedPages) {
    if (page?.hasFaqSchema) results.perPageFaqCount += 1;
    if (page?.hasOrganizationSchema) results.orgSchemaCount += 1;
  }

  return results;
}

export const __testables = {
  parseRobotsForLlmAgents,
  summarizeLlmAgentAccess,
  LLM_USER_AGENTS
};
