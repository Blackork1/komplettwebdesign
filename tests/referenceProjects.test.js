import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { getReferenceProjectBySlug, referenceProjects } from '../data/referenceProjects.js';

const REQUIRED_FIELDS = [
  'slug',
  'name',
  'industry',
  'title',
  'metaDescription',
  'summary',
  'problem',
  'goal',
  'implementation',
  'result',
  'quote',
  'quoteAuthor',
  'image',
  'liveUrl'
];

const EXPECTED_TESTIMONIALS = {
  'zur-alten-backstube': {
    quote: 'Das Ergebnis sieht einfach super aus. Es ist jetzt viel einfacher Tische zu reservieren.',
    quoteAuthor: 'Feirefiz'
  },
  'tm-sauber-mehr': {
    quote: 'Super Service und top Preis-Leistung. Alle unsere Wünsche wurden schnell, professionell und unkompliziert umgesetzt.',
    quoteAuthor: 'TM Sauber & Mehr'
  }
};

test('referenceProjects exports exactly two current proof projects', () => {
  assert.equal(referenceProjects.length, 2);
  assert.deepEqual(referenceProjects.map((project) => project.slug), [
    'zur-alten-backstube',
    'tm-sauber-mehr'
  ]);
});

test('reference projects include all required proof fields', () => {
  referenceProjects.forEach((project) => {
    REQUIRED_FIELDS.forEach((field) => {
      assert.ok(Object.hasOwn(project, field), `${project.slug} is missing ${field}`);
    });

    assert.equal(typeof project.slug, 'string');
    assert.equal(typeof project.name, 'string');
    assert.equal(typeof project.industry, 'string');
    assert.equal(typeof project.title, 'string');
    assert.equal(typeof project.metaDescription, 'string');
    assert.equal(typeof project.summary, 'string');
    assert.equal(typeof project.problem, 'string');
    assert.equal(typeof project.goal, 'string');
    assert.equal(typeof project.quote, 'string');
    assert.equal(typeof project.quoteAuthor, 'string');
    assert.equal(typeof project.image, 'string');
    assert.equal(typeof project.liveUrl, 'string');
  });
});

test('reference projects include the available customer testimonials', () => {
  referenceProjects.forEach((project) => {
    const expected = EXPECTED_TESTIMONIALS[project.slug];
    assert.ok(expected, `${project.slug} must have expected testimonial coverage`);
    assert.equal(project.quote, expected.quote);
    assert.equal(project.quoteAuthor, expected.quoteAuthor);
  });
});

test('reference projects include enough implementation and result proof points', () => {
  referenceProjects.forEach((project) => {
    assert.ok(Array.isArray(project.implementation), `${project.slug} implementation must be an array`);
    assert.ok(Array.isArray(project.result), `${project.slug} result must be an array`);
    assert.ok(project.implementation.length >= 3, `${project.slug} needs at least 3 implementation items`);
    assert.ok(project.result.length >= 2, `${project.slug} needs at least 2 result items`);
  });
});

test('tm sauber mehr reference is positioned as a relaunch case with before after proof', () => {
  const project = getReferenceProjectBySlug('tm-sauber-mehr');

  assert.equal(project.image, 'https://res.cloudinary.com/dvd2cd2be/image/upload/v1778179218/admin_gallery/lfhdeq3nkirr9wijelqb.webp');
  assert.match(project.title, /Relaunch/i);
  assert.match(project.summary, /Relaunch/i);
  assert.equal(project.relaunchUrl, '/leistungen/website-relaunch');
  assert.ok(Array.isArray(project.beforeAfterComparisons));
  assert.equal(project.beforeAfterComparisons.length, 2);

  const [homepage, services] = project.beforeAfterComparisons;
  assert.equal(homepage.title, 'Startseite');
  assert.equal(homepage.before.previewImage, 'https://res.cloudinary.com/dvd2cd2be/image/upload/v1778179264/admin_gallery/szxgsiumbc0noflhesx5.webp');
  assert.equal(homepage.after.previewImage, 'https://res.cloudinary.com/dvd2cd2be/image/upload/v1778179248/admin_gallery/mbp6ulyacailkqbkaoud.webp');
  assert.equal(homepage.before.fullImage, 'https://res.cloudinary.com/dvd2cd2be/image/upload/v1778179364/admin_gallery/fusvexmfvkkmaga1x0ru.webp');
  assert.equal(homepage.after.fullImage, 'https://res.cloudinary.com/dvd2cd2be/image/upload/v1778179406/admin_gallery/tjxiazf6oq9bybxzdmen.webp');

  assert.equal(services.title, 'Leistungsseite');
  assert.equal(services.before.previewImage, 'https://res.cloudinary.com/dvd2cd2be/image/upload/v1778179288/admin_gallery/miqb95eylhqzj5pxc0wz.webp');
  assert.equal(services.after.previewImage, 'https://res.cloudinary.com/dvd2cd2be/image/upload/v1778179327/admin_gallery/kdzgzbanbnaz0zqu6fqv.webp');
  assert.equal(services.before.fullImage, 'https://res.cloudinary.com/dvd2cd2be/image/upload/v1778179364/admin_gallery/fusvexmfvkkmaga1x0ru.webp');
  assert.equal(services.after.fullImage, 'https://res.cloudinary.com/dvd2cd2be/image/upload/v1778179380/admin_gallery/sytsgkkgwjix8aescwtx.webp');

  assert.deepEqual(project.additionalScreens, [
    {
      title: 'Neue Team-Seite',
      text: 'Ergänzend zum Relaunch wurde eine eigene Team-Seite aufgebaut, damit persönliche Ansprechpartner sichtbar werden.',
      image: 'https://res.cloudinary.com/dvd2cd2be/image/upload/v1778179354/admin_gallery/hdgcjjbhneyscgl2wpqm.webp'
    }
  ]);
});

test('reference detail template renders relaunch comparison gallery controls', () => {
  const showTemplate = fs.readFileSync(new URL('../views/references/show.ejs', import.meta.url), 'utf8');

  assert.match(showTemplate, /project\.relaunchUrl/);
  assert.match(showTemplate, /beforeAfterComparisons/);
  assert.match(showTemplate, /reference-before-after/);
  assert.match(showTemplate, /data-reference-lightbox-trigger/);
  assert.match(showTemplate, /data-reference-lightbox-prev/);
  assert.match(showTemplate, /data-reference-lightbox-next/);
  assert.match(showTemplate, /data-reference-lightbox-close/);
  assert.match(showTemplate, /additionalScreens/);
});

test('reference project copy avoids unsupported numeric metrics and percentage claims', () => {
  const unsupportedMetricPattern = /(?:\d+(?:[.,]\d+)?\s*(?:%|Prozent|€|Euro)|(?:Umsatz|Ranking|Rankings|Platz|Traffic|Besuche|Anfragen|Leads|Conversion|Performance)\s+(?:um|von|auf)?\s*\d+)/i;

  referenceProjects.forEach((project) => {
    const searchableCopy = [
      project.title,
      project.metaDescription,
      project.summary,
      project.problem,
      project.goal,
      project.quote,
      project.quoteAuthor,
      ...project.implementation,
      ...project.result
    ].filter(Boolean).join('\n');

    assert.doesNotMatch(searchableCopy, /%|Prozent/i, `${project.slug} must not use percentage claims`);
    assert.doesNotMatch(searchableCopy, unsupportedMetricPattern, `${project.slug} contains an unsupported metric claim`);
  });
});

test('getReferenceProjectBySlug returns projects and null for missing slugs', () => {
  assert.equal(getReferenceProjectBySlug('zur-alten-backstube')?.name, 'Zur alten Backstube');
  assert.equal(getReferenceProjectBySlug('tm-sauber-mehr')?.name, 'TM Sauber & Mehr');
  assert.equal(getReferenceProjectBySlug('unbekannt'), null);
  assert.equal(getReferenceProjectBySlug(''), null);
});

test('reference routes are mounted before slugRoutes in index.js', () => {
  const indexSource = fs.readFileSync(new URL('../index.js', import.meta.url), 'utf8');
  const referenceImportIndex = indexSource.indexOf("import referenceRoutes from './routes/referenceRoutes.js';");
  const referenceMountIndex = indexSource.indexOf('app.use(referenceRoutes);');
  const slugMountIndex = indexSource.indexOf('app.use(slugRoutes);');

  assert.notEqual(referenceImportIndex, -1, 'index.js must import referenceRoutes');
  assert.notEqual(referenceMountIndex, -1, 'index.js must mount referenceRoutes');
  assert.notEqual(slugMountIndex, -1, 'index.js must still mount slugRoutes');
  assert.ok(referenceMountIndex < slugMountIndex, 'referenceRoutes must be mounted before slugRoutes');
});
