import { readFileSync } from 'node:fs';

const CONTENT_ROOT = new URL('../content/swipeandcook/', import.meta.url);

const PAGE_DEFINITIONS = Object.freeze({
  privacy: Object.freeze({
    key: 'privacy',
    source: 's2-datenschutzerklaerung.md',
    path: '/swipeandcook-datenschutz',
    title: 'Datenschutzerklärung für Swipe & Cook',
    lead: 'Wie Swipe & Cook Konto-, Safety-, Premium- und optionale Analysedaten verarbeitet.'
  }),
  terms: Object.freeze({
    key: 'terms',
    source: 's2-nutzungsbedingungen.md',
    path: '/swipeandcook-nutzungsbedingungen',
    title: 'Nutzungsbedingungen für Swipe & Cook',
    lead: 'Die Regeln für Konto, Free-Version, Premiumabo, Trial, Kündigung und Kontolöschung.'
  }),
  support: Object.freeze({
    key: 'support',
    source: 's2-supportseite.md',
    path: '/swipeandcook-support',
    title: 'Support für Swipe & Cook',
    lead: 'Hilfe bei Konto, Premium, Storestatus, Plattformwechsel und Kontolöschung.'
  }),
  accountDeletion: Object.freeze({
    key: 'accountDeletion',
    source: 's2-kontoloeschung.md',
    path: '/swipeandcook-konto-loeschen',
    title: 'Swipe-&-Cook-Konto löschen',
    lead: 'Löschung direkt in der App oder sicher über die verifizierte E-Mail-Adresse anfordern.'
  })
});

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function safeHref(rawHref) {
  const href = String(rawHref ?? '').trim();
  if (href.startsWith('mailto:')) {
    const address = href.slice('mailto:'.length);
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      return href;
    }
    return null;
  }
  try {
    const parsed = new URL(href);
    if (
      parsed.protocol === 'https:'
      && !parsed.username
      && !parsed.password
    ) {
      return parsed.toString();
    }
  } catch {
    return null;
  }
  return null;
}

function renderInline(rawText) {
  const tokens = [];
  const tokenized = String(rawText ?? '').replace(
    /`([^`\n]+)`|\[([^\]\n]+)\]\(([^)\s]+)\)|<(https:\/\/[^>\s]+)>/g,
    (match, code, label, markdownHref, automaticHref) => {
      let html;
      if (code != null) {
        html = `<code>${escapeHtml(code)}</code>`;
      } else {
        const href = safeHref(markdownHref || automaticHref);
        if (!href) {
          html = escapeHtml(match);
        } else {
          const text = label || automaticHref;
          html = `<a href="${escapeHtml(href)}">${escapeHtml(text)}</a>`;
        }
      }
      const token = `\u0000SWIPE_INLINE_${tokens.length}\u0000`;
      tokens.push(html);
      return token;
    }
  );

  let escaped = escapeHtml(tokenized);
  tokens.forEach((html, index) => {
    escaped = escaped.replace(`\u0000SWIPE_INLINE_${index}\u0000`, html);
  });
  return escaped;
}

function headingSlug(text, used) {
  const base = String(text ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' und ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'abschnitt';
  const count = (used.get(base) ?? 0) + 1;
  used.set(base, count);
  return count === 1 ? base : `${base}-${count}`;
}

export function renderApprovedLegalMarkdown(markdown) {
  const cleaned = String(markdown ?? '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\r\n?/g, '\n');
  const lines = cleaned.split('\n');
  const firstSection = lines.findIndex((line) => /^##\s+/.test(line));
  if (firstSection < 0) {
    throw new Error('swipeandcook_legal_sections_missing');
  }

  const html = [];
  const usedHeadings = new Map();
  let paragraph = [];
  let list = null;
  let sectionOpen = false;

  function flushParagraph() {
    if (!paragraph.length) return;
    html.push(`<p>${renderInline(paragraph.join(' '))}</p>`);
    paragraph = [];
  }

  function flushList() {
    if (!list) return;
    html.push(`<${list.type}>`);
    for (const item of list.items) {
      html.push(`<li>${renderInline(item)}</li>`);
    }
    html.push(`</${list.type}>`);
    list = null;
  }

  for (const rawLine of lines.slice(firstSection)) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      flushParagraph();
      flushList();
      if (sectionOpen) html.push('</section>');
      const id = headingSlug(h2[1], usedHeadings);
      html.push(`<section aria-labelledby="${id}">`);
      html.push(`<h2 id="${id}">${renderInline(h2[1])}</h2>`);
      sectionOpen = true;
      continue;
    }

    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      flushParagraph();
      flushList();
      const id = headingSlug(h3[1], usedHeadings);
      html.push(`<h3 id="${id}">${renderInline(h3[1])}</h3>`);
      continue;
    }

    const unordered = line.match(/^-\s+(.+)$/);
    const ordered = line.match(/^\d+\.\s+(.+)$/);
    if (unordered || ordered) {
      flushParagraph();
      const type = unordered ? 'ul' : 'ol';
      if (list && list.type !== type) flushList();
      list ??= { type, items: [] };
      list.items.push((unordered || ordered)[1]);
      continue;
    }

    if (list) {
      list.items[list.items.length - 1] += ` ${line}`;
      continue;
    }
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  if (sectionOpen) html.push('</section>');
  return html.join('\n');
}

function readPage(definition) {
  const source = readFileSync(
    new URL(definition.source, CONTENT_ROOT),
    'utf8'
  );
  const stand = source.match(/^Stand:\s*(.+)$/m)?.[1]?.trim();
  if (!stand) {
    throw new Error(`swipeandcook_legal_date_missing:${definition.key}`);
  }
  return Object.freeze({
    ...definition,
    stand,
    html: renderApprovedLegalMarkdown(source)
  });
}

export function loadSwipeAndCookLegalPage(key) {
  const definition = PAGE_DEFINITIONS[key];
  if (!definition) {
    throw new Error('swipeandcook_legal_page_unknown');
  }
  return readPage(definition);
}

export const SWIPE_AND_COOK_LEGAL_PAGES = PAGE_DEFINITIONS;
