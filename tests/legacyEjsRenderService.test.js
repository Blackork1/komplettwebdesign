import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  buildLegacyRenderLocals,
  inspectLegacyEjsTemplate,
  renderLegacyEjsStrict
} from '../services/contentAgent/legacyEjsRenderService.js';

const post = {
  title: 'Legacy-Titel',
  image_url: '/images/legacy.webp',
  image_alt: 'Legacy-Alt',
  published_at: '2026-07-16T08:00:00.000Z'
};

test('kontrollierte Locals entsprechen dem öffentlichen Legacy-Vertrag', () => {
  const locals = buildLegacyRenderLocals({
    post,
    publishedISO: '2026-07-16T10:00:00+02:00',
    modifiedISO: '2026-07-16T11:00:00+02:00'
  });

  assert.equal(locals.post.title, 'Legacy-Titel');
  assert.equal(locals.og_image, '/images/legacy.webp');
  assert.equal(locals.locale, 'de_DE');
  assert.equal(locals.helpers.date(post.published_at), '16.7.2026');
});

test('einfache Werte und lokale Schleifen werden vollständig statisch gerendert', async () => {
  for (const fixture of ['active-values.ejs', 'active-district-loop.ejs']) {
    const template = await readFile(
      new URL(`./fixtures/legacyContent/${fixture}`, import.meta.url),
      'utf8'
    );
    const html = renderLegacyEjsStrict({
      template,
      locals: buildLegacyRenderLocals({
        post,
        publishedISO: '2026-07-16T10:00:00+02:00',
        modifiedISO: '2026-07-16T11:00:00+02:00'
      })
    });

    assert.doesNotMatch(html, /<%|%>/);
  }
});

test('Prozesszugriff wird vor der Ausführung blockiert', async () => {
  const template = await readFile(
    new URL('./fixtures/legacyContent/unsafe-process.ejs', import.meta.url),
    'utf8'
  );

  assert.ok(inspectLegacyEjsTemplate(template).blockers.length > 0);
  assert.throws(
    () => renderLegacyEjsStrict({ template, locals: {} }),
    { code: 'CONTENT_LEGACY_EJS_RENDER_BLOCKED' }
  );
});

test('berechneter Konstruktorzugriff über Locals kann die VM nicht verlassen', () => {
  const template = [
    '<p><%= helpers.date',
    "['con' + 'structor']('return this')()",
    "['pro' + 'cess'].env.OPENAI_API_KEY %></p>"
  ].join('');

  assert.throws(
    () => renderLegacyEjsStrict({
      template,
      locals: buildLegacyRenderLocals({ post })
    }),
    { code: 'CONTENT_LEGACY_EJS_RENDER_BLOCKED' }
  );
});
