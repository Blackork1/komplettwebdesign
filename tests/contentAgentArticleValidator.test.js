import test from 'node:test';
import assert from 'node:assert/strict';
import { validateArticle } from '../services/contentAgent/articleValidator.js';
import { sanitizeArticleHtml } from '../services/contentAgent/articleSanitizer.js';

const faqJson = Array.from({ length: 5 }, (_, index) => ({
  question: `Wie funktioniert Schritt ${index + 1}?`,
  answer: `Schritt ${index + 1} wird verständlich und konkret erklärt.`
}));

function faqHtml(items = faqJson) {
  return items.map(({ question, answer }) => (
    `<div class="mb-3" data-faq-question="${question}" data-faq-answer="${answer}">`
      + `<h3>${question}</h3><p>${answer}</p></div>`
  )).join('');
}

function ctaHtml(location) {
  return `<div class="alert alert-primary" data-track="cta" data-cta-name="${location}_contact" data-cta-location="${location}">`
    + '<a class="btn btn-primary" href="/kontakt">Beratung anfragen</a></div>';
}

function validHtml(overrides = {}) {
  const locations = overrides.locations || ['blog_early', 'blog_mid', 'blog_final'];
  const faqs = overrides.faqs || faqJson;
  return [
    '<section class="my-4"><h2>Ein verständlicher Einstieg</h2><p class="lead">Konkrete Hilfe für Unternehmen.</p>',
    ctaHtml(locations[0]),
    '<div class="row"><div class="col-lg-12"><h2>Die wichtigsten Schritte</h2><p>Der Hauptteil erklärt das Vorgehen.</p></div></div>',
    ctaHtml(locations[1]),
    '<p><a href="https://example.com/quellen/artikel">Belegte Quelle</a></p>',
    `<section class="my-5"><h2>Häufige Fragen</h2>${faqHtml(faqs)}</section>`,
    ctaHtml(locations[2]),
    '</section>'
  ].join('');
}

function validArticle(overrides = {}) {
  return {
    metaTitle: 'Website-Relaunch: Praktischer Leitfaden für Betriebe',
    metaDescription: 'Dieser Leitfaden erklärt kleinen Unternehmen verständlich und konkret, wie sie einen Website-Relaunch sinnvoll vorbereiten und umsetzen.',
    slug: 'website-relaunch-leitfaden',
    contentHtml: validHtml(),
    faqJson,
    ...overrides
  };
}

const validContext = {
  allowedInternalLinks: ['/kontakt'],
  allowedExternalUrls: ['https://example.com/quellen/artikel'],
  existingSlugs: ['anderer-artikel']
};

test('validator rejects h1, scripts, ejs and unknown links', () => {
  const result = validateArticle({
    metaTitle: 'Ein ausreichend langer Meta Title für diesen Test',
    metaDescription: 'Eine ausreichend lange Meta Description mit einer konkreten Aussage für diesen technischen Test.',
    slug: 'gueltiger-slug',
    contentHtml: '<h1>Falsch</h1><script>alert(1)</script><p><%= secret %></p><a href="/falsch">Link</a>',
    faqJson: []
  }, {
    allowedInternalLinks: ['/kontakt'],
    allowedExternalUrls: [],
    existingSlugs: []
  });
  assert.equal(result.passed, false);
  assert.ok(result.issues.some((issue) => issue.code === 'h1_forbidden'));
  assert.ok(result.issues.some((issue) => issue.code === 'script_forbidden'));
  assert.ok(result.issues.some((issue) => issue.code === 'ejs_forbidden'));
  assert.ok(result.issues.some((issue) => issue.code === 'internal_link_forbidden'));
});

test('sanitizer keeps only the documented static article surface', () => {
  const sanitized = sanitizeArticleHtml([
    '<section class="my-4" role="region" aria-label="Artikel" data-track="cta" data-cta-name="blog_early_contact" data-cta-location="blog_early">',
    '<h2 style="color:red">Titel</h2><p onclick="alert(1)">Text <strong>stark</strong></p>',
    '<a href="/kontakt">Intern</a><a href="https://example.com/quelle">Extern</a>',
    '<a href="javascript:alert(1)">Unsicher</a><a href="//example.com/pfad">Protokollrelativ</a>',
    '<h1>Verbotene Überschrift</h1><img src="x.webp"><script>alert(1)</script>',
    '</section>'
  ].join(''));

  assert.match(sanitized, /<section class="my-4" role="region" aria-label="Artikel"/);
  assert.match(sanitized, /href="\/kontakt"/);
  assert.match(sanitized, /href="https:\/\/example\.com\/quelle"/);
  assert.doesNotMatch(sanitized, /style=|onclick=|javascript:|href="\/\//);
  assert.doesNotMatch(sanitized, /<\/?(?:h1|img|script)\b/i);
});

test('validator accepts a complete article with approved links, CTA tracking and matching visible FAQ', () => {
  const result = validateArticle(validArticle(), validContext);

  assert.equal(result.passed, true);
  assert.deepEqual(result.issues, []);
  assert.equal(result.sanitizedHtml, sanitizeArticleHtml(validArticle().contentHtml));
});

test('validator reports every forbidden raw HTML construct before sanitizing it', () => {
  const unsafeHtml = '<!--Kommentar-->\n<div class="container-fluid" style="color:red">'
    + '<h1>Titel</h1><script>alert(1)</script><p><%= secret %></p><img src="bild.webp"></div>';
  const result = validateArticle(validArticle({ contentHtml: unsafeHtml, faqJson: [] }), {
    ...validContext,
    allowedExternalUrls: []
  });

  for (const code of [
    'h1_forbidden',
    'script_forbidden',
    'ejs_forbidden',
    'inline_style_forbidden',
    'image_forbidden',
    'outer_container_forbidden'
  ]) {
    assert.ok(result.issues.some((issue) => issue.code === code), `Fehlender Issue-Code: ${code}`);
  }
  assert.equal(typeof result.sanitizedHtml, 'string');
  assert.doesNotMatch(result.sanitizedHtml, /<\/?(?:h1|script|img)\b|style=|<%/i);
});

test('outer container means one top-level Bootstrap container while comments and whitespace are ignored', () => {
  const rejected = validateArticle(validArticle({
    contentHtml: '\n<!--Kommentar--><div class="container-lg"><p>Inhalt</p></div>\n',
    faqJson: []
  }), validContext);
  const multipleRoots = validateArticle(validArticle({
    contentHtml: '<div class="container-lg"><p>Erster Teil</p></div><section><p>Zweiter Teil</p></section>',
    faqJson: []
  }), validContext);

  assert.ok(rejected.issues.some((issue) => issue.code === 'outer_container_forbidden'));
  assert.equal(multipleRoots.issues.some((issue) => issue.code === 'outer_container_forbidden'), false);
});

test('validator enforces meta boundaries and ASCII slug uniqueness', () => {
  const result = validateArticle(validArticle({
    metaTitle: 'Zu kurz',
    metaDescription: 'Zu kurz.',
    slug: 'website-für-berlin'
  }), {
    ...validContext,
    existingSlugs: ['website-für-berlin']
  });

  for (const code of ['meta_title_length', 'meta_description_length', 'slug_invalid', 'slug_duplicate']) {
    assert.ok(result.issues.some((issue) => issue.code === code), `Fehlender Issue-Code: ${code}`);
  }

  assert.equal(validateArticle(validArticle({ metaTitle: 'x'.repeat(49) }), validContext).issues.some(({ code }) => code === 'meta_title_length'), true);
  assert.equal(validateArticle(validArticle({ metaTitle: 'x'.repeat(50) }), validContext).issues.some(({ code }) => code === 'meta_title_length'), false);
  assert.equal(validateArticle(validArticle({ metaTitle: 'x'.repeat(60) }), validContext).issues.some(({ code }) => code === 'meta_title_length'), false);
  assert.equal(validateArticle(validArticle({ metaDescription: 'x'.repeat(99) }), validContext).issues.some(({ code }) => code === 'meta_description_length'), true);
  assert.equal(validateArticle(validArticle({ metaDescription: 'x'.repeat(100) }), validContext).issues.some(({ code }) => code === 'meta_description_length'), false);
  assert.equal(validateArticle(validArticle({ metaDescription: 'x'.repeat(160) }), validContext).issues.some(({ code }) => code === 'meta_description_length'), false);
});

test('validator requires exactly the ordered CTA positions and meaningful tracking names', () => {
  const missing = validateArticle(validArticle({
    contentHtml: validHtml().replace(ctaHtml('blog_mid'), '')
  }), validContext);
  const duplicateLocation = validateArticle(validArticle({
    contentHtml: validHtml({ locations: ['blog_early', 'blog_early', 'blog_final'] })
  }), validContext);
  const wrongName = validateArticle(validArticle({
    contentHtml: validHtml().replace('blog_mid_contact', 'irgendein_name')
  }), validContext);

  assert.ok(missing.issues.some((issue) => issue.code === 'cta_count_invalid'));
  assert.ok(duplicateLocation.issues.some((issue) => issue.code === 'cta_locations_invalid'));
  assert.ok(wrongName.issues.some((issue) => issue.code === 'cta_tracking_invalid'));
});

test('validator requires five to seven visible FAQ and exact JSON content', () => {
  const tooFewFaqs = faqJson.slice(0, 4);
  const invalidCount = validateArticle(validArticle({
    contentHtml: validHtml({ faqs: tooFewFaqs }),
    faqJson: tooFewFaqs
  }), validContext);
  const differentAnswer = validateArticle(validArticle({
    faqJson: faqJson.map((item, index) => index === 2 ? { ...item, answer: 'Eine andere Antwort.' } : item)
  }), validContext);
  const hiddenAnswer = validateArticle(validArticle({
    contentHtml: validHtml().replace('<p>Schritt 4 wird verständlich und konkret erklärt.</p>', '<p>Eine nicht passende sichtbare Antwort.</p>')
  }), validContext);

  assert.ok(invalidCount.issues.some((issue) => issue.code === 'faq_count_invalid'));
  assert.ok(differentAnswer.issues.some((issue) => issue.code === 'faq_mismatch'));
  assert.ok(hiddenAnswer.issues.some((issue) => issue.code === 'faq_mismatch'));
});

test('validator normalisiert vertrauenswürdige interne Links und prüft externe Quellen weiterhin exakt', () => {
  const result = validateArticle(validArticle({
    contentHtml: validHtml()
      .replace('href="/kontakt"', 'href="/kontakt?quelle=blog"')
      .replace('href="https://example.com/quellen/artikel"', 'href="https://example.com/quellen/artikel#abschnitt"')
  }), validContext);

  assert.equal(result.issues.some((issue) => issue.code === 'internal_link_forbidden'), false);
  assert.ok(result.issues.some((issue) => issue.code === 'external_link_forbidden'));
});

test('validator akzeptiert Kontaktquery, Hash und kanonische absolute URL, blockiert aber URL-Bypässe', () => {
  for (const target of [
    '/kontakt?utm_source=blog',
    '/kontakt#formular',
    'https://komplettwebdesign.de/kontakt?utm_source=blog',
    'https://www.komplettwebdesign.de/kontakt#formular'
  ]) {
    const result = validateArticle(validArticle({ contentHtml: validHtml().replaceAll('href="/kontakt"', `href="${target}"`) }), validContext);
    assert.equal(result.issues.some((issue) => ['internal_link_forbidden', 'cta_contact_target_invalid', 'link_scheme_forbidden'].includes(issue.code)), false, target);
  }
  for (const target of [
    '//evil.example/kontakt',
    'http://www.komplettwebdesign.de/kontakt',
    'https://user:pass@www.komplettwebdesign.de/kontakt',
    'https://evil.example/kontakt',
    '/%2e%2e/kontakt',
    '/\\evil.example/kontakt',
    'javascript:alert(1)',
    'data:text/html,schlecht'
  ]) {
    const result = validateArticle(validArticle({ contentHtml: validHtml().replaceAll('href="/kontakt"', `href="${target}"`) }), validContext);
    assert.ok(result.issues.some((issue) => ['external_link_forbidden', 'cta_contact_target_invalid', 'link_scheme_forbidden'].includes(issue.code)), target);
  }
});

test('source reference context takes precedence for exact external-link approval', () => {
  const result = validateArticle(validArticle(), {
    ...validContext,
    allowedExternalUrls: ['https://example.com/quellen/artikel'],
    sourceReferences: [{ url: 'https://example.com/andere-quelle' }]
  });

  assert.ok(result.issues.some((issue) => issue.code === 'external_link_forbidden'));
});

test('validator distinguishes unknown Bootstrap classes from forbidden semantic classes', () => {
  const result = validateArticle(validArticle({
    contentHtml: validHtml()
      .replace('class="row"', 'class="row col-md-6"')
      .replace('class="lead"', 'class="lead erfundene-komponente"')
  }), validContext);

  assert.ok(result.issues.some((issue) => issue.code === 'bootstrap_class_unknown' && issue.className === 'col-md-6'));
  assert.ok(result.issues.some((issue) => issue.code === 'class_forbidden' && issue.className === 'erfundene-komponente'));
});

test('validator accepts central internal-link entries and source-reference objects from context', () => {
  const result = validateArticle(validArticle(), {
    allowedInternalLinks: [{ url: '/kontakt', type: 'contact', label: 'Beratung anfragen' }],
    sourceReferences: [{ url: 'https://example.com/quellen/artikel', title: 'Quelle' }],
    existingSlugs: []
  });

  assert.equal(result.passed, true);
  assert.deepEqual(result.issues, []);
});

test('validator rejects style elements from the original HTML', () => {
  const result = validateArticle(validArticle({
    contentHtml: validHtml().replace('<h2>Ein verständlicher Einstieg</h2>', '<style>.lead{color:red}</style><h2>Ein verständlicher Einstieg</h2>')
  }), validContext);

  assert.ok(result.issues.some((issue) => issue.code === 'inline_style_forbidden'));
  assert.doesNotMatch(result.sanitizedHtml, /<style\b/i);
});

test('validator rejects CTA elements that disappear from sanitized HTML', () => {
  const buttonCtaHtml = (location) => (
    `<button class="btn btn-primary" data-track="cta" data-cta-name="${location}_contact" data-cta-location="${location}">`
      + 'Beratung anfragen</button>'
  );
  let html = validHtml();
  for (const location of ['blog_early', 'blog_mid', 'blog_final']) {
    html = html.replace(ctaHtml(location), buttonCtaHtml(location));
  }

  const result = validateArticle(validArticle({ contentHtml: html }), validContext);

  assert.equal(result.passed, false);
  assert.ok(result.issues.some((issue) => issue.code === 'cta_count_invalid'));
  assert.doesNotMatch(result.sanitizedHtml, /data-track="cta"/);
});

test('validator requires exact normalized visible FAQ text without additions', () => {
  const html = validHtml().replace(
    '<p>Schritt 2 wird verständlich und konkret erklärt.</p>',
    '<p>Schritt 2 wird verständlich und konkret erklärt. Sichtbarer Zusatz.</p>'
  );

  const result = validateArticle(validArticle({ contentHtml: html }), validContext);

  assert.ok(result.issues.some((issue) => issue.code === 'faq_mismatch'));
});

test('validator recognizes additional Bootstrap utility families as unknown Bootstrap classes', () => {
  for (const className of ['offset-md-2', 'gap-3', 'order-lg-2', 'mt-md-4']) {
    const result = validateArticle(validArticle({
      contentHtml: validHtml().replace('class="lead"', `class="lead ${className}"`)
    }), validContext);

    assert.ok(
      result.issues.some((issue) => issue.code === 'bootstrap_class_unknown' && issue.className === className),
      `Bootstrap-Klasse wurde nicht eindeutig erkannt: ${className}`
    );
    assert.equal(
      result.issues.some((issue) => issue.code === 'class_forbidden' && issue.className === className),
      false
    );
  }
});

test('validator preserves natural FAQ text across allowed inline markup', () => {
  const inlineFaqJson = faqJson.map((item, index) => (
    index === 0 ? { ...item, answer: 'Antwort 1.' } : item
  ));
  const html = validHtml({ faqs: inlineFaqJson }).replace(
    '<p>Antwort 1.</p>',
    '<p>Antwort <strong>1</strong>.</p>'
  );

  const result = validateArticle(validArticle({ contentHtml: html, faqJson: inlineFaqJson }), validContext);

  assert.equal(result.passed, true);
  assert.deepEqual(result.issues, []);
});

test('validator blocks forbidden raw link schemes exactly once before sanitizing href', () => {
  for (const href of ['javascript:alert(1)', '//example.com/pfad', 'mailto:hallo@example.com']) {
    const html = validHtml().replace(
      '<h2>Die wichtigsten Schritte</h2>',
      `<p><a href="${href}">Unsicherer Link</a></p><h2>Die wichtigsten Schritte</h2>`
    );

    const result = validateArticle(validArticle({ contentHtml: html }), validContext);
    const linkIssues = result.issues.filter((issue) => (
      issue.code === 'link_scheme_forbidden'
      || issue.code === 'internal_link_forbidden'
      || issue.code === 'external_link_forbidden'
    ));

    assert.equal(result.passed, false, `Verbotener Link wurde akzeptiert: ${href}`);
    assert.equal(linkIssues.length, 1, `Link erzeugte nicht genau einen Issue: ${href}`);
    assert.equal(linkIssues[0].code, 'link_scheme_forbidden');
    assert.equal(linkIssues[0].href, href);
  }
});
