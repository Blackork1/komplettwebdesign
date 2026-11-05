import test from 'node:test';
import assert from 'node:assert/strict';
import { BLOG_QUALITY_CORRECTIONS, correctBlogQuality, lowercaseDuForms } from '../services/blogQualityCorrections.js';
import { IMMOBILIENMAKLER_HOMEPAGE_CHECK } from '../data/blogRewrites/immobilienmaklerHomepageCheck.js';
import { stripTrackingParams } from '../util/legacyInternalLinks.js';
import { buildBlogPostPageModel } from '../services/blogPostPresentationService.js';

const base = 'https://www.komplettwebdesign.de';

test('Du-Formen werden nur mitten im Satz kleingeschrieben', () => {
  assert.equal(
    lowercaseDuForms('Möchtest Du Deine Website prüfen? Deine Seite zählt. Checkliste: Du startest, wenn Dir etwas fehlt.'),
    'Möchtest du deine Website prüfen? Deine Seite zählt. Checkliste: Du startest, wenn dir etwas fehlt.'
  );
  assert.equal(lowercaseDuForms('<h2 class="h4">Lass Deine Website prüfen</h2>'), '<h2 class="h4">Lass deine Website prüfen</h2>');
});

test('jede Ersetzung greift genau einmal, ein zweiter Lauf ändert nichts', () => {
  for (const [slug, rule] of Object.entries(BLOG_QUALITY_CORRECTIONS)) {
    if (!rule.replacements) continue;
    const content = rule.replacements.map(([from]) => `<p>${from}</p>`).join('\n');
    const first = correctBlogQuality({ slug, content, faq_json: [] });
    assert.deepEqual(first.unmatched, [], slug);
    for (const [from, to] of rule.replacements) {
      if (to) assert.ok(!first.post.content.includes(from) || to.includes(from), `${slug}: ${from}`);
    }
    const second = correctBlogQuality(first.post);
    assert.deepEqual(second.unmatched, [], `${slug} zweiter Lauf`);
    assert.equal(second.post.content, first.post.content, `${slug} zweiter Lauf`);
  }
});

test('ein geänderter Datenbanktext wird gemeldet statt still übersprungen', () => {
  const { unmatched } = correctBlogQuality({ slug: 'seo-fuer-blumenladen', content: '<p>ganz anderer Text</p>' });
  assert.ok(unmatched.length > 0);
  assert.ok(unmatched.every((item) => item.reason === 'nicht gefunden'));
  const doubled = correctBlogQuality({ slug: 'seo-fuer-blumenladen', content: '<p>kannst du uns jederzeit über</p><p>kannst du uns jederzeit über</p>' });
  assert.ok(doubled.unmatched.some((item) => /2 Treffer/.test(item.reason)));
});

test('KI-Artikel: Ich-Stimme, Quellen für AI Mode und Search Console, kein Briefing-Rest', () => {
  const rule = BLOG_QUALITY_CORRECTIONS['ki-suche-webdesign-2026'];
  const content = rule.replacements.map(([from]) => from).join(' ');
  const { post } = correctBlogQuality({ slug: 'ki-suche-webdesign-2026', content });
  assert.doesNotMatch(post.content, /\bWir (prüfen|helfen)\b|Für Komplett Webdesign kann/);
  assert.match(post.content, /href="https:\/\/blog\.google\/intl\/de-de\/[^"]+"/);
  assert.match(post.content, /href="https:\/\/developers\.google\.com\/search\/blog\/2026\/06\/gen-ai-performance-reports"/);
  assert.doesNotMatch(post.content, /angekündigt, der schrittweise/);
});

test('Makler-Check ist eigenständig: acht Makler-Prüfpunkte, Quellen, sichtbare FAQ wie im Schema', () => {
  const { fields } = IMMOBILIENMAKLER_HOMEPAGE_CHECK;
  assert.equal((fields.content.match(/<h2>Prüfpunkt \d: /g) || []).length, 8);
  // „wir“ im Sinne von „du und ich“ ist in Ordnung, Agentur-Formulierungen nicht.
  assert.doesNotMatch(fields.content, /<h1\b|vollständiger Blogartikel|\b(unsere?[nmrs]?|uns|euch|Wir bieten|Wir prüfen)\b/i);
  for (const law of ['gewo/__34c', 'ddg/__5', 'geg/__87', 'bgb/__656c', 'wovermrg/__2', 'bgb/__312g']) {
    assert.match(fields.content, new RegExp(`href="https://www\\.gesetze-im-internet\\.de/${law}\\.html"`), law);
  }
  assert.match(fields.content, /href="\/ratgeber\/homepage-checker-website-check"/);
  assert.match(fields.content, /href="\/branchen\/webdesign-immobilienmakler"/);
  for (const item of fields.faq_json) {
    assert.equal(item['@type'], 'Question');
    assert.ok(fields.content.includes(`<h3>${item.name}</h3>`), item.name);
    assert.ok(fields.content.includes(`<p>${item.acceptedAnswer.text}</p>`), item.name);
  }
  assert.ok(fields.meta_title.length <= 60);
  assert.ok(fields.meta_description.length >= 120 && fields.meta_description.length <= 160, String(fields.meta_description.length));
  assert.doesNotMatch(fields.excerpt, /Blogartikel|Beitrag zeigt/);
});

test('Kampagnen-Parameter verschwinden aus Artikellinks, andere Parameter und Anker bleiben', () => {
  assert.equal(stripTrackingParams('<a href="https://example.org/a?utm_source=openai">x</a>'), '<a href="https://example.org/a">x</a>');
  assert.equal(stripTrackingParams('<a href="/kontakt?thema=relaunch&amp;utm_medium=mail#form">x</a>'), '<a href="/kontakt?thema=relaunch#form">x</a>');
  assert.equal(stripTrackingParams('<a href="/pakete?seite=2">x</a>'), '<a href="/pakete?seite=2">x</a>');
});

function legacyPost(overrides = {}) {
  return {
    id: 7,
    slug: 'seo-fuer-blumenladen',
    title: 'SEO für Blumenladen',
    content: '<h1 class="display-5">\n  SEO für Blumenladen\n</h1><h2>Abschnitt</h2><p>Text <a href="https://example.org/?utm_source=openai">Quelle</a></p><h3>Frage eins?</h3><p>Antwort.</p>',
    content_format: 'legacy_ejs',
    image_url: '/images/blog/blumen.webp',
    faq_json: [{ question: 'Frage eins?', answer: 'Antwort.' }, { question: 'Frage zwei?', answer: 'Zweite Antwort.' }],
    created_at: '2026-03-21T10:00:00Z',
    published_at: '2026-03-21T10:00:00Z',
    updated_at: '2026-11-05T10:00:00Z',
    ...overrides
  };
}

test('Artikelseite: Titel-H1 im Text entfällt, fehlende FAQ-Fragen werden sichtbar ergänzt', () => {
  const model = buildBlogPostPageModel({ post: legacyPost(), canonicalBaseUrl: base });
  assert.doesNotMatch(model.renderedContent, /<h[12][^>]*>\s*SEO für Blumenladen\s*<\/h[12]>/);
  assert.match(model.renderedContent, /<h2>Abschnitt<\/h2>/);
  assert.doesNotMatch(model.renderedContent, /utm_source/);
  assert.deepEqual(model.supplementalFaq, [{ question: 'Frage zwei?', answer: 'Zweite Antwort.' }]);
  assert.equal(model.supplementalFaqTitle, 'Weitere Fragen');
  const faqPage = model.structuredDataBlocks.find((block) => block['@type'] === 'FAQPage');
  assert.equal(faqPage.mainEntity.length, 2);
});

test('Artikelseite: BlogPosting mit @id, Sprache, Website-Bezug und absoluter Bild-URL', () => {
  const model = buildBlogPostPageModel({ post: legacyPost(), canonicalBaseUrl: base });
  const article = model.structuredDataBlocks.find((block) => block['@type'] === 'BlogPosting');
  assert.equal(article['@id'], `${base}/blog/seo-fuer-blumenladen#article`);
  assert.equal(article.inLanguage, 'de-DE');
  assert.equal(article.isPartOf['@id'], `${base}/#website`);
  assert.equal(article.image.url, `${base}/images/blog/blumen.webp`);
  assert.match(model.seoExtra, new RegExp(`og:image" content="${base}/images/blog/blumen\\.webp"`));
  assert.ok(model.modifiedISO.startsWith('2026-11-05'));
  assert.ok(model.publishedISO.startsWith('2026-03-21'));
});

function fakeDb(rows, { changeBetweenReads = false } = {}) {
  const log = [];
  let reads = 0;
  const client = {
    async query(sql, params = []) {
      log.push(sql.trim().split(/\s+/).slice(0, 2).join(' '));
      if (/^SELECT \* FROM posts WHERE slug/.test(sql)) return { rows: rows.map((row) => ({ ...row })) };
      if (/^SELECT \* FROM posts WHERE id/.test(sql)) {
        reads += 1;
        const row = rows.find((item) => item.id === params[0]);
        return { rows: [changeBetweenReads && reads === 2 ? { ...row, content: `${row.content} geändert` } : row] };
      }
      if (/^UPDATE posts/.test(sql)) return { rowCount: 1 };
      return {};
    },
    release() {}
  };
  return { db: { connect: async () => client }, log };
}

// Gespeicherte Texte mit allen Stellen, die die Korrekturen erwarten.
const originalText = (slug) => BLOG_QUALITY_CORRECTIONS[slug].replacements.map(([from]) => `<p>${from}</p>`).join('\n');
const storedPosts = () => [
  { id: 1, slug: 'seo-fuer-blumenladen', content: originalText('seo-fuer-blumenladen'), faq_json: [] },
  { id: 2, slug: 'mehr-anfragen-website-kontaktfehler-kmu-2026', content: originalText('mehr-anfragen-website-kontaktfehler-kmu-2026'), faq_json: [] }
];

test('Skript: Vorschau schreibt nichts, Anwenden nutzt je Artikel eine eigene Transaktion', async () => {
  const { applyBlogQualityCorrections } = await import('../scripts/applyBlogQualityCorrections.js');
  const { mkdtemp } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const preview = fakeDb(storedPosts());
  const dry = await applyBlogQualityCorrections(preview.db, { apply: false });
  assert.equal(dry.changes.length, 2);
  assert.ok(!preview.log.some((entry) => /^(UPDATE|BEGIN)/.test(entry)));

  const backupDirectory = await mkdtemp(join(tmpdir(), 'blog-quality-'));
  const run = fakeDb(storedPosts());
  const applied = await applyBlogQualityCorrections(run.db, { apply: true, backupDirectory, pauseMs: 0 });
  assert.ok(applied.backupPath.startsWith(backupDirectory));
  assert.deepEqual(run.log.filter((entry) => /^(BEGIN|UPDATE|COMMIT)/.test(entry)), ['BEGIN', 'UPDATE posts', 'COMMIT', 'BEGIN', 'UPDATE posts', 'COMMIT']);
});

test('Skript: ein zwischenzeitlich geänderter Artikel bricht ab, ohne ihn zu überschreiben', async () => {
  const { applyBlogQualityCorrections } = await import('../scripts/applyBlogQualityCorrections.js');
  const { mkdtemp } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const run = fakeDb(storedPosts(), { changeBetweenReads: true });
  await assert.rejects(
    applyBlogQualityCorrections(run.db, { apply: true, backupDirectory: await mkdtemp(join(tmpdir(), 'blog-quality-')), pauseMs: 0 }),
    (error) => error.code === 'CORRECTION_CONFLICT'
  );
  assert.deepEqual(run.log.filter((entry) => /^(BEGIN|UPDATE|COMMIT|ROLLBACK)/.test(entry)), ['BEGIN', 'UPDATE posts', 'COMMIT', 'BEGIN', 'ROLLBACK']);
});
