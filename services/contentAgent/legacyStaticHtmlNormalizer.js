import * as cheerio from 'cheerio';
import { sanitizeArticleHtml } from './articleSanitizer.js';
import { normalizeInternalHref } from './trustedInternalLinkService.js';

const INVENTORY_BLOCKERS = Object.freeze({
  visibleText: 'legacy_visible_text_loss',
  headings: 'legacy_heading_loss',
  links: 'legacy_link_loss',
  images: 'legacy_image_loss',
  ids: 'legacy_id_loss',
  faqCount: 'legacy_faq_loss',
  captions: 'legacy_caption_loss',
  priceTokens: 'legacy_price_token_loss'
});

function issue(code, message, details = {}) {
  return { code, message, details };
}

function parseJsonLd(value) {
  try {
    return JSON.parse(String(value || ''));
  } catch {
    return null;
  }
}

function jsonLdTypes(value) {
  const nodes = Array.isArray(value)
    ? value
    : Array.isArray(value?.['@graph']) ? value['@graph'] : [value];
  return nodes
    .flatMap((node) => (
      Array.isArray(node?.['@type']) ? node['@type'] : [node?.['@type']]
    ))
    .filter((type) => typeof type === 'string');
}

function renameTag($, element, tagName) {
  element.name = tagName;
  element.tagName = tagName;
}

function normalizedText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function inventoryForHtml(html) {
  const $ = cheerio.load(String(html || ''), null, false);
  return {
    visibleText: normalizedText($.root().text()),
    headings: $('h2, h3, h4, h5').map((_, element) => ({
      level: element.tagName,
      text: normalizedText($(element).text())
    })).get(),
    links: $('a[href]').map((_, element) => ({
      href: String($(element).attr('href') || ''),
      text: normalizedText($(element).text())
    })).get(),
    images: $('img').map((_, element) => ({
      src: String($(element).attr('src') || ''),
      alt: String($(element).attr('alt') || '')
    })).get(),
    ids: $('[id]').map((_, element) => String($(element).attr('id') || '')).get(),
    faqCount: $('[data-faq-question][data-faq-answer]').length,
    captions: $('caption, figcaption')
      .map((_, element) => normalizedText($(element).text()))
      .get(),
    priceTokens: [...String(html || '').matchAll(/\{\{[a-z0-9_.-]+\}\}/gi)]
      .map((match) => match[0])
  };
}

function compactCounts(items) {
  const counts = new Map();
  for (const item of items) {
    counts.set(item.code, (counts.get(item.code) || 0) + 1);
  }
  return [...counts].map(([code, count]) => ({ code, count }));
}

function uniqueIssues(items) {
  return [...new Map(items.map((item) => [
    `${item.code}:${JSON.stringify(item.details || {})}`,
    item
  ])).values()];
}

function compareInventories({
  before,
  after,
  allowedInternalLinks,
  faqJson,
  blockers,
  warnings
}) {
  for (const [field, code] of Object.entries(INVENTORY_BLOCKERS)) {
    if (JSON.stringify(before[field]) !== JSON.stringify(after[field])) {
      blockers.push(issue(
        code,
        `${field} wurde durch die Normalisierung verändert.`,
        { before: before[field], after: after[field] }
      ));
    }
  }

  const allowed = new Set((allowedInternalLinks || [])
    .map((value) => normalizeInternalHref(typeof value === 'string' ? value : value?.url))
    .filter(({ kind }) => kind === 'internal')
    .map(({ path }) => path));
  for (const link of after.links) {
    if (!link.href.startsWith('/')) continue;
    const normalized = normalizeInternalHref(link.href);
    if (normalized.kind !== 'internal' || !allowed.has(normalized.path)) {
      blockers.push(issue(
        'legacy_internal_link_untrusted',
        'Ein internes Linkziel gehört nicht zum vertrauenswürdigen Linkinventar.',
        { href: link.href }
      ));
    }
  }

  if (Array.isArray(faqJson) && faqJson.length > 0 && after.faqCount === 0) {
    warnings.push(issue(
      'legacy_faq_visible_markup_missing',
      'Strukturierte FAQ sind vorhanden, im Artikelinhalt aber nicht sichtbar markiert.'
    ));
  }
}

export function normalizeLegacyStaticHtml({
  html,
  faqJson = [],
  allowedInternalLinks = []
} = {}) {
  const source = String(html || '');
  const $ = cheerio.load(source, null, false);
  const transforms = [];
  const warnings = [];
  const blockers = [];

  $('style').each(() => {
    blockers.push(issue(
      'legacy_style_block',
      'Der Artikel enthält eingebettete Styles und benötigt eine Einzelprüfung.'
    ));
  });

  $('script').each((_, element) => {
    const type = String($(element).attr('type') || '').toLowerCase();
    if (type !== 'application/ld+json') {
      blockers.push(issue(
        'legacy_script_unsafe',
        'Nicht erlaubtes Script im Artikelinhalt.'
      ));
      return;
    }
    const parsed = parseJsonLd($(element).text());
    if (parsed === null) {
      blockers.push(issue(
        'legacy_jsonld_invalid',
        'Das JSON-LD im Artikelinhalt ist syntaktisch ungültig.'
      ));
      return;
    }
    const types = jsonLdTypes(parsed);
    if (types.length > 0
        && types.every((typeName) => ['BlogPosting', 'FAQPage'].includes(typeName))) {
      $(element).remove();
      transforms.push({ code: 'duplicate_jsonld_removed' });
      return;
    }
    blockers.push(issue(
      'legacy_jsonld_unknown',
      'Nicht zuordenbare strukturierte Daten benötigen eine Einzelprüfung.'
    ));
  });

  $('article, main').each((_, element) => renameTag($, element, 'section'));
  $('header').each((_, element) => renameTag($, element, 'div'));
  $('h1').each((_, element) => renameTag($, element, 'h2'));
  $('h5').each((_, element) => renameTag($, element, 'h4'));

  $('form, input, select, textarea, option').each(() => {
    blockers.push(issue(
      'legacy_form_control',
      'Der Artikel enthält Formularbestandteile und benötigt eine Einzelprüfung.'
    ));
  });

  $('label').each((_, element) => {
    if ($(element).attr('for')) {
      blockers.push(issue(
        'legacy_form_control',
        'Formularabhängiges Label gefunden.'
      ));
    } else {
      renameTag($, element, 'span');
    }
  });

  $('button').each((_, element) => {
    const anchors = $(element).find('a');
    if (anchors.length !== 1
        || $(element).text().trim() !== anchors.first().text().trim()) {
      blockers.push(issue(
        'legacy_button_without_link',
        'Button ohne eindeutiges Linkziel gefunden.'
      ));
      return;
    }
    const anchor = anchors.first();
    const classes = [$(element).attr('class'), anchor.attr('class')]
      .filter(Boolean)
      .join(' ');
    if (classes) anchor.attr('class', classes);
    $(element).replaceWith(anchor);
  });

  $('*').each((_, element) => {
    for (const name of Object.keys(element.attribs || {})) {
      if (/^on/i.test(name)) {
        blockers.push(issue(
          'legacy_event_handler',
          `Event-Handler ${name} ist nicht erlaubt.`
        ));
      }
    }
  });

  const normalizedBeforeSanitizer = $.html();
  const sanitized = sanitizeArticleHtml(normalizedBeforeSanitizer);
  const before = inventoryForHtml(normalizedBeforeSanitizer);
  const after = inventoryForHtml(sanitized);
  compareInventories({
    before,
    after,
    allowedInternalLinks,
    faqJson,
    blockers,
    warnings
  });

  return {
    html: sanitized,
    report: {
      version: 1,
      transforms: compactCounts(transforms),
      warnings,
      blockers: uniqueIssues(blockers),
      before,
      after
    }
  };
}
