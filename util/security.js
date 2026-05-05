const HTML_ESCAPE = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

const JSON_SCRIPT_ESCAPE = {
  '<': '\\u003C',
  '>': '\\u003E',
  '&': '\\u0026',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029'
};

const SAFE_TAGS = new Set([
  'a', 'article', 'aside', 'b', 'blockquote', 'br', 'caption', 'code',
  'div', 'em', 'figcaption', 'figure', 'footer', 'h1', 'h2', 'h3', 'h4',
  'h5', 'h6', 'header', 'hr', 'i', 'li', 'main', 'nav', 'ol', 'p', 'pre',
  'img', 'section', 'small', 'span', 'strong', 'sub', 'sup', 'table', 'tbody',
  'td', 'tfoot', 'th', 'thead', 'tr', 'u', 'ul'
]);

const COMPONENT_TYPES = new Set([
  ...SAFE_TAGS,
  'button',
  'checkbox',
  'form',
  'iframe',
  'input',
  'radio',
  'select',
  'submit',
  'textarea'
]);

const VOID_TAGS = new Set(['br', 'hr', 'img']);
const GLOBAL_ATTRS = new Set(['class', 'id', 'title', 'role']);
const FORM_METHODS = new Set(['get', 'post']);
const INPUT_TYPES = new Set([
  'button', 'checkbox', 'email', 'hidden', 'number', 'password', 'radio',
  'search', 'submit', 'tel', 'text', 'url'
]);

export function escapeHtml(value = '') {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => HTML_ESCAPE[ch]);
}

export function escapeJsonForHtml(value) {
  return JSON.stringify(value ?? null).replace(/[<>&\u2028\u2029]/g, (ch) => JSON_SCRIPT_ESCAPE[ch]);
}

export function safeUrl(value = '#', {
  fallback = '#',
  allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'],
  allowRelative = true,
  allowHash = true
} = {}) {
  const raw = String(value ?? '').trim().replace(/[\u0000-\u001f\u007f]/g, '');
  if (!raw) return fallback;
  if (allowHash && raw.startsWith('#')) return raw;
  if (allowRelative && raw.startsWith('/') && !raw.startsWith('//')) return raw;

  try {
    const parsed = new URL(raw);
    if (allowedProtocols.includes(parsed.protocol)) return parsed.toString();
  } catch {
    return fallback;
  }

  return fallback;
}

export function safeInputType(value = 'text') {
  const type = String(value || 'text').toLowerCase();
  return INPUT_TYPES.has(type) ? type : 'text';
}

export function safeFormMethod(value = 'post') {
  const method = String(value || 'post').toLowerCase();
  return FORM_METHODS.has(method) ? method : 'post';
}

export function safeComponentTag(value = 'div') {
  const tag = String(value || 'div').toLowerCase();
  return COMPONENT_TYPES.has(tag) ? tag : 'div';
}

function sanitizeAttributes(tag, rawAttrs = '') {
  const attrs = [];
  const attrRegex = /([A-Za-z_:][-A-Za-z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;
  while ((match = attrRegex.exec(rawAttrs))) {
    const name = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? '';
    if (name.startsWith('on') || name === 'style') continue;

    const isGlobal = GLOBAL_ATTRS.has(name) || name.startsWith('aria-') || name.startsWith('data-');
    if (isGlobal) {
      attrs.push(`${name}="${escapeHtml(value)}"`);
      continue;
    }

    if (tag === 'a' && name === 'href') {
      attrs.push(`href="${escapeHtml(safeUrl(value))}"`);
      continue;
    }

    if (tag === 'a' && name === 'target') {
      const target = value === '_blank' ? '_blank' : value === '_self' ? '_self' : '';
      if (target) attrs.push(`target="${target}"`);
      continue;
    }

    if (tag === 'a' && name === 'rel') {
      const rel = String(value).split(/\s+/).filter(Boolean).slice(0, 8).map(escapeHtml).join(' ');
      if (rel) attrs.push(`rel="${rel}"`);
      continue;
    }

    if (tag === 'img' && name === 'src') {
      const src = safeUrl(value, { allowedProtocols: ['http:', 'https:'] });
      if (src !== '#') attrs.push(`src="${escapeHtml(src)}"`);
      continue;
    }

    if (tag === 'img' && ['alt', 'loading'].includes(name)) {
      attrs.push(`${name}="${escapeHtml(value)}"`);
      continue;
    }

    if (['img', 'iframe'].includes(tag) && ['width', 'height'].includes(name) && /^\d{1,4}$/.test(String(value))) {
      attrs.push(`${name}="${value}"`);
    }
  }

  if (tag === 'a' && attrs.some((attr) => attr === 'target="_blank"') && !attrs.some((attr) => attr.startsWith('rel='))) {
    attrs.push('rel="noopener noreferrer"');
  }

  return attrs.length ? ` ${attrs.join(' ')}` : '';
}

export function sanitizeHtml(value = '') {
  const input = String(value ?? '');
  if (!input) return '';

  const tagRegex = /<\/?([A-Za-z][A-Za-z0-9:-]*)([^<>]*)>/g;
  let out = '';
  let lastIndex = 0;
  let match;

  while ((match = tagRegex.exec(input))) {
    out += escapeHtml(input.slice(lastIndex, match.index));
    const full = match[0];
    const tag = match[1].toLowerCase();
    const closing = /^<\s*\//.test(full);

    if (SAFE_TAGS.has(tag)) {
      if (closing) {
        if (!VOID_TAGS.has(tag)) out += `</${tag}>`;
      } else {
        out += `<${tag}${sanitizeAttributes(tag, match[2] || '')}>`;
      }
    }

    lastIndex = tagRegex.lastIndex;
  }

  out += escapeHtml(input.slice(lastIndex));
  return out;
}
