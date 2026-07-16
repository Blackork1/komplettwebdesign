import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = [
  'section', 'div', 'p', 'h2', 'h3', 'h4', 'h5',
  'ul', 'ol', 'li', 'strong', 'em', 'u', 'blockquote',
  'a', 'span', 'small', 'br', 'hr',
  'figure', 'figcaption', 'picture', 'source', 'img',
  'pre', 'code',
  'table', 'caption', 'thead', 'tbody', 'tr', 'th', 'td'
];

const COMMON_ATTRIBUTES = [
  'class',
  'id',
  'role',
  'aria-*',
  'data-track',
  'data-cta-name',
  'data-cta-location',
  'data-faq-question',
  'data-faq-answer'
];

const ALLOWED_ATTRIBUTES = {
  '*': COMMON_ATTRIBUTES,
  a: [...COMMON_ATTRIBUTES, 'href', 'title', 'target', 'rel'],
  img: [
    ...COMMON_ATTRIBUTES,
    'src',
    'srcset',
    'sizes',
    'alt',
    'width',
    'height',
    'loading',
    'decoding'
  ],
  source: [...COMMON_ATTRIBUTES, 'src', 'srcset', 'sizes', 'media', 'type'],
  th: [...COMMON_ATTRIBUTES, 'colspan', 'rowspan', 'scope'],
  td: [...COMMON_ATTRIBUTES, 'colspan', 'rowspan'],
  table: [...COMMON_ATTRIBUTES, 'summary']
};

export function sanitizeArticleHtml(html) {
  return sanitizeHtml(typeof html === 'string' ? html : '', {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ['http', 'https'],
    allowedSchemesByTag: {
      a: ['http', 'https'],
      img: ['http', 'https'],
      source: ['http', 'https']
    },
    allowProtocolRelative: false
  });
}
