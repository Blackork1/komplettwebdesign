import * as cheerio from 'cheerio';
import { sanitizeArticleHtml } from './articleSanitizer.js';
import {
  ALLOWED_ARTICLE_CLASSES,
  ARTICLE_CTA_LOCATIONS
} from './articleHtmlContract.js';
import { normalizeInternalHref, normalizeTrustedInternalPaths } from './trustedInternalLinkService.js';

export const ARTICLE_VALIDATOR_VERSION = 'article-validator-v1';

const ASCII_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CTA_LOCATIONS = ARTICLE_CTA_LOCATIONS;
const MIN_META_TITLE_LENGTH = 50;
const MAX_META_TITLE_LENGTH = 60;
const MIN_META_DESCRIPTION_LENGTH = 100;
const MAX_META_DESCRIPTION_LENGTH = 160;

// Diese kleine Freigabeliste entspricht den im Content-Agent-Design dokumentierten
// Artikelklassen. Containerklassen sind nur innerhalb des Fragments zulässig.
const ALLOWED_CLASSES = new Set(ALLOWED_ARTICLE_CLASSES);

const BOOTSTRAP_BREAKPOINT = '(?:sm|md|lg|xl|xxl)';
const BOOTSTRAP_CLASS_PATTERNS = [
  /^(?:container(?:-|$)|row$|col(?:-|$)|g[xy]?-[0-9]|d-|flex-|justify-content-|align-items-|align-self-|text-|bg-|border(?:-|$)|rounded(?:-|$)|btn(?:-|$)|alert(?:-|$)|table(?:-|$)|list-group(?:-|$)|fw-|fs-|lh-|position-|(?:top|bottom|start|end)-|[wh]-)/,
  new RegExp(`^offset-(?:${BOOTSTRAP_BREAKPOINT}-)?[0-9]+$`),
  new RegExp(`^(?:gap|row-gap|column-gap)-(?:${BOOTSTRAP_BREAKPOINT}-)?[0-9]+$`),
  new RegExp(`^order-(?:${BOOTSTRAP_BREAKPOINT}-)?(?:[0-9]+|first|last)$`),
  new RegExp(`^[mp][trblxy]?-(?:${BOOTSTRAP_BREAKPOINT}-)?(?:[0-9]+|auto)$`)
];
const BLOCK_TAGS = new Set([
  'section', 'div', 'p', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'hr',
  'table', 'thead', 'tbody', 'tr', 'th', 'td'
]);
const BLOCK_BOUNDARY = '\u0000';

function createIssue(code, message, details = {}) {
  return { code, message, ...details };
}

function normalizeText(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function isBootstrapClass(className) {
  return BOOTSTRAP_CLASS_PATTERNS.some((pattern) => pattern.test(className));
}

function visibleTextWithBlockBoundaries(element, isRoot = true) {
  if (!element) return '';
  if (element.type === 'text') return element.data || '';
  if (element.type === 'comment') return '';

  const content = (element.children || [])
    .map((child) => visibleTextWithBlockBoundaries(child, false))
    .join('');
  const isBlock = !isRoot && element.type === 'tag' && BLOCK_TAGS.has(element.name);

  return isBlock ? `${BLOCK_BOUNDARY}${content}${BLOCK_BOUNDARY}` : content;
}

function normalizedVisibleText(element) {
  return visibleTextWithBlockBoundaries(element)
    .split(BLOCK_BOUNDARY)
    .map((part) => normalizeText(part))
    .filter(Boolean)
    .join(' ');
}

function hasOuterBootstrapContainer($) {
  const topLevelContent = $.root().contents().toArray().filter((node) => {
    if (node.type === 'comment') return false;
    if (node.type === 'text') return normalizeText($(node).text()) !== '';
    return true;
  });

  if (topLevelContent.length !== 1 || topLevelContent[0].type !== 'tag') return false;

  const classes = ($(topLevelContent[0]).attr('class') || '').split(/\s+/).filter(Boolean);
  return classes.some((className) => className === 'container' || /^container-(?:fluid|sm|md|lg|xl|xxl)$/.test(className));
}

function sourceUrlsFromContext(context) {
  const values = Array.isArray(context.sourceReferences)
    ? context.sourceReferences
    : (Array.isArray(context.allowedExternalUrls) ? context.allowedExternalUrls : []);

  return values
    .map((value) => typeof value === 'string' ? value : value?.url)
    .filter((value) => typeof value === 'string');
}

function extractFaqInspection($) {
  const questionElements = $('[data-faq-question]').toArray();
  const answerElements = $('[data-faq-answer]').toArray();
  const pairs = questionElements.map((questionElement, index) => {
    const answerElement = $(questionElement).is('[data-faq-answer]')
      ? questionElement
      : answerElements[index];
    const question = normalizeText($(questionElement).attr('data-faq-question'));
    const answer = normalizeText(answerElement ? $(answerElement).attr('data-faq-answer') : '');
    const visibleQuestionText = normalizedVisibleText(questionElement);
    const visibleAnswerText = normalizedVisibleText(answerElement);
    const visibleTextMatches = answerElement === questionElement
      ? visibleQuestionText === normalizeText(`${question} ${answer}`)
      : visibleQuestionText === question && visibleAnswerText === answer;

    return {
      question,
      answer,
      visible: question !== ''
        && answer !== ''
        && visibleTextMatches
    };
  });

  return {
    questionCount: questionElements.length,
    answerCount: answerElements.length,
    pairs
  };
}

function normalizedFaqJson(faqJson) {
  if (!Array.isArray(faqJson)) return [];
  return faqJson.map((item) => ({
    question: normalizeText(item?.question),
    answer: normalizeText(item?.answer)
  }));
}

export function validateArticle(article = {}, context = {}) {
  const html = typeof article.contentHtml === 'string' ? article.contentHtml : '';
  const sanitizedHtml = sanitizeArticleHtml(html);
  const issues = [];
  const $raw = cheerio.load(html, null, false);
  const $sanitized = cheerio.load(sanitizedHtml, null, false);

  if ($raw('h1').length > 0) {
    issues.push(createIssue('h1_forbidden', 'Artikel-HTML darf keine H1 enthalten.'));
  }
  if ($raw('script').length > 0) {
    issues.push(createIssue('script_forbidden', 'Artikel-HTML darf keine Skripte enthalten.'));
  }
  if (/<%|%>/.test(html)) {
    issues.push(createIssue('ejs_forbidden', 'Artikel-HTML darf kein EJS enthalten.'));
  }
  if ($raw('[style], style').length > 0) {
    issues.push(createIssue('inline_style_forbidden', 'Artikel-HTML darf keine Inline-Styles enthalten.'));
  }
  if ($raw('img').length > 0) {
    issues.push(createIssue('image_forbidden', 'Artikel-HTML darf keine Bilder enthalten.'));
  }

  const forbiddenLinkHrefs = new Set();
  $raw('a[href]').each((_, element) => {
    const href = $raw(element).attr('href');
    const normalized = normalizeInternalHref(href);
    if (normalized.kind !== 'unsafe' && normalized.kind !== 'invalid') return;
    if (forbiddenLinkHrefs.has(href)) return;

    forbiddenLinkHrefs.add(href);
    issues.push(createIssue(
      'link_scheme_forbidden',
      `Das Linkziel ${href} verwendet ein nicht erlaubtes Scheme.`,
      { href }
    ));
  });

  if (hasOuterBootstrapContainer($sanitized)) {
    issues.push(createIssue('outer_container_forbidden', 'Artikel-HTML darf keinen äußeren Bootstrap-Container enthalten.'));
  }

  const metaTitleLength = normalizeText(article.metaTitle).length;
  if (metaTitleLength < MIN_META_TITLE_LENGTH || metaTitleLength > MAX_META_TITLE_LENGTH) {
    issues.push(createIssue(
      'meta_title_length',
      `Der Meta Title muss ${MIN_META_TITLE_LENGTH} bis ${MAX_META_TITLE_LENGTH} Zeichen lang sein.`,
      { actualLength: metaTitleLength }
    ));
  }

  const metaDescriptionLength = normalizeText(article.metaDescription).length;
  if (metaDescriptionLength < MIN_META_DESCRIPTION_LENGTH || metaDescriptionLength > MAX_META_DESCRIPTION_LENGTH) {
    issues.push(createIssue(
      'meta_description_length',
      `Die Meta Description muss ${MIN_META_DESCRIPTION_LENGTH} bis ${MAX_META_DESCRIPTION_LENGTH} Zeichen lang sein.`,
      { actualLength: metaDescriptionLength }
    ));
  }

  const slug = typeof article.slug === 'string' ? article.slug : '';
  if (!ASCII_SLUG.test(slug)) {
    issues.push(createIssue('slug_invalid', 'Der Slug darf nur ASCII-Kleinbuchstaben, Ziffern und Bindestriche enthalten.'));
  }

  const existingSlugs = (Array.isArray(context.existingSlugs) ? context.existingSlugs : [])
    .map((value) => typeof value === 'string' ? value : value?.slug);
  if (existingSlugs.includes(slug)) {
    issues.push(createIssue('slug_duplicate', 'Der Slug ist bereits vorhanden.'));
  }

  const ctaElements = $sanitized('[data-track="cta"]').toArray();
  if (ctaElements.length !== CTA_LOCATIONS.length) {
    issues.push(createIssue('cta_count_invalid', 'Artikel-HTML muss genau drei getrackte CTA-Elemente enthalten.'));
  }

  const ctaLocations = ctaElements.map((element) => $sanitized(element).attr('data-cta-location') || '');
  if (ctaLocations.length === CTA_LOCATIONS.length
      && ctaLocations.some((location, index) => location !== CTA_LOCATIONS[index])) {
    issues.push(createIssue('cta_locations_invalid', 'CTA-Elemente müssen in der Reihenfolge blog_early, blog_mid und blog_final erscheinen.'));
  }

  if (ctaElements.some((element) => {
    const location = $sanitized(element).attr('data-cta-location') || '';
    return $sanitized(element).attr('data-cta-name') !== `${location}_contact`;
  })) {
    issues.push(createIssue('cta_tracking_invalid', 'Jeder CTA benötigt einen zur Position passenden Trackingnamen.'));
  }
  if (ctaElements.some((element) => {
    const target = $sanitized(element).is('a[href]')
      ? $sanitized(element).attr('href')
      : $sanitized(element).find('a[href]').first().attr('href');
    const normalized = normalizeInternalHref(target);
    return normalized.kind !== 'internal' || normalized.path !== '/kontakt';
  })) {
    issues.push(createIssue('cta_contact_target_invalid', 'Jeder CTA muss auf den normalisierten Kontaktpfad führen.'));
  }

  const faqInspection = extractFaqInspection($sanitized);
  const jsonFaqs = normalizedFaqJson(article.faqJson);
  if (faqInspection.questionCount < 5
      || faqInspection.questionCount > 7
      || jsonFaqs.length < 5
      || jsonFaqs.length > 7) {
    issues.push(createIssue('faq_count_invalid', 'Artikel-HTML und FAQ-JSON müssen jeweils fünf bis sieben FAQ enthalten.'));
  }

  const visibleFaqsMatch = faqInspection.questionCount === faqInspection.answerCount
    && faqInspection.pairs.every(({ visible }) => visible)
    && faqInspection.pairs.length === jsonFaqs.length
    && faqInspection.pairs.every(({ question, answer }, index) => (
      question === jsonFaqs[index]?.question && answer === jsonFaqs[index]?.answer
    ));
  if (!visibleFaqsMatch) {
    issues.push(createIssue('faq_mismatch', 'Sichtbare FAQ und FAQ-JSON müssen in Reihenfolge und Inhalt übereinstimmen.'));
  }

  const allowedInternalLinks = normalizeTrustedInternalPaths(context.allowedInternalLinks);
  const allowedExternalUrls = new Set(sourceUrlsFromContext(context));
  $sanitized('a[href]').each((_, element) => {
    const href = $sanitized(element).attr('href');
    const normalized = normalizeInternalHref(href);
    if (normalized.kind === 'unsafe' || normalized.kind === 'invalid') return;
    if (normalized.kind === 'external') {
      if (!allowedExternalUrls.has(href)) {
        issues.push(createIssue('external_link_forbidden', `Der externe Link ${href} ist in den Quellenreferenzen nicht freigegeben.`));
      }
    } else if (!allowedInternalLinks.has(normalized.path)) {
      issues.push(createIssue('internal_link_forbidden', `Der interne Link ${href} ist nicht freigegeben.`));
    }
  });

  const reportedClasses = new Set();
  $sanitized('[class]').each((_, element) => {
    for (const className of ($sanitized(element).attr('class') || '').split(/\s+/).filter(Boolean)) {
      if (ALLOWED_CLASSES.has(className) || reportedClasses.has(className)) continue;
      reportedClasses.add(className);
      const bootstrapClass = isBootstrapClass(className);
      issues.push(createIssue(
        bootstrapClass ? 'bootstrap_class_unknown' : 'class_forbidden',
        bootstrapClass
          ? `Die Bootstrap-Klasse ${className} ist für Artikel nicht freigegeben.`
          : `Die semantische Klasse ${className} ist für Artikel nicht freigegeben.`,
        { className }
      ));
    }
  });

  return {
    passed: issues.length === 0,
    sanitizedHtml,
    issues
  };
}
