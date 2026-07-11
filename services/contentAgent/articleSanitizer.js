import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = [
  'section',
  'div',
  'p',
  'h2',
  'h3',
  'h4',
  'ul',
  'ol',
  'li',
  'strong',
  'em',
  'blockquote',
  'a',
  'span',
  'small',
  'hr',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td'
];

const ALLOWED_ATTRIBUTES = [
  'class',
  'href',
  'role',
  'aria-*',
  'data-track',
  'data-cta-name',
  'data-cta-location',
  'data-faq-question',
  'data-faq-answer'
];

export function sanitizeArticleHtml(html) {
  return sanitizeHtml(typeof html === 'string' ? html : '', {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      '*': ALLOWED_ATTRIBUTES
    },
    allowedSchemes: ['http', 'https'],
    allowedSchemesByTag: {
      a: ['http', 'https']
    },
    allowProtocolRelative: false
  });
}
