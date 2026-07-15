const LEGACY_CONTENT_FORMAT = 'legacy_ejs';
const EJS_DELIMITER_PATTERN = /<%|%>/u;

export function containsEjsTemplateSyntax(contentHtml) {
  return typeof contentHtml === 'string' && EJS_DELIMITER_PATTERN.test(contentHtml);
}

export function requiresLegacyBytePreservation({ contentFormat, contentHtml } = {}) {
  return contentFormat === LEGACY_CONTENT_FORMAT
    && containsEjsTemplateSyntax(contentHtml);
}

export function isLegacyStaticHtml({ contentFormat, contentHtml } = {}) {
  return contentFormat === LEGACY_CONTENT_FORMAT
    && typeof contentHtml === 'string'
    && !containsEjsTemplateSyntax(contentHtml);
}
