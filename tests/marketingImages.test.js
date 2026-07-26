import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

import {
  MARKETING_IMAGES,
  REQUIRED_VISUAL_ROLES,
  getMarketingImage
} from '../data/marketingImages.js';

const PUBLIC_ROOT = new URL('../public/', import.meta.url);

test('alle geplanten visuellen Rollen besitzen ein eigenes Bild mit verständlichem Alt-Text', () => {
  const resolvedImages = REQUIRED_VISUAL_ROLES.map((role) => getMarketingImage(role));

  assert.ok(resolvedImages.length >= 18);
  assert.ok(resolvedImages.every(Boolean));
  assert.equal(new Set(resolvedImages.map((image) => image.src)).size, resolvedImages.length);

  for (const image of resolvedImages) {
    assert.match(image.src, /^\/images\//);
    assert.ok(image.alt.length >= 20, `${image.src} benötigt einen aussagekräftigen Alt-Text`);
    assert.doesNotMatch(image.alt, /^(Bild|Foto|Grafik|Screenshot)\b/i);
    assert.equal(existsSync(new URL(`.${image.src}`, PUBLIC_ROOT)), true, `${image.src} fehlt`);
  }
});

test('externe Bilder dokumentieren Urheber, Originalseite und Lizenz', () => {
  const externalImages = Object.values(MARKETING_IMAGES).filter((image) => image.source.kind === 'external');

  assert.ok(externalImages.length >= 4);
  for (const image of externalImages) {
    assert.equal(image.source.provider, 'Pexels');
    assert.ok(image.source.creator);
    assert.match(image.source.pageUrl, /^https:\/\/www\.pexels\.com\/photo\//);
    assert.equal(image.source.licenseUrl, 'https://www.pexels.com/legal-pages/license/');
  }
});

test('Bildnachweise verweisen ausschließlich auf lokale Auslieferungsdateien', () => {
  for (const image of Object.values(MARKETING_IMAGES)) {
    assert.doesNotMatch(image.src, /^https?:\/\//);
    assert.ok(['own', 'external'].includes(image.source.kind));
  }
});

test('der Zielgruppenbereich verwendet ein eigenes dokumentiertes Foto', () => {
  const image = MARKETING_IMAGES.webdesignFit;

  assert.ok(image, 'Bildrolle webdesignFit fehlt');
  assert.equal(image.src, '/images/editorial/webdesign-zielgruppe.webp');
  assert.notEqual(image.src, MARKETING_IMAGES.contactConversation.src);
  assert.notEqual(image.src, MARKETING_IMAGES.webdesignPlanning.src);
  assert.match(image.alt, /Beraterin und Unternehmer/);
  assert.equal(image.source.creator, 'Alena Darmel');
  assert.equal(
    image.source.pageUrl,
    'https://www.pexels.com/photo/business-man-and-woman-in-the-office-near-glass-window-8133862/'
  );
  assert.equal(existsSync(new URL(`.${image.src}`, PUBLIC_ROOT)), true);
});

test('der Startseitenweg Gesundheit und Coaching besitzt ein eigenständiges dokumentiertes Foto', () => {
  const image = MARKETING_IMAGES.industryHealthCoaching;

  assert.ok(image, 'Bildrolle industryHealthCoaching fehlt');
  assert.equal(image.src, '/images/editorial/gesundheit-coaching.webp');
  assert.match(image.alt, /Trainerin|Trainer|Training|Coaching/i);
  assert.equal(image.source.creator, 'Julia Larson');
  assert.equal(
    image.source.pageUrl,
    'https://www.pexels.com/photo/black-woman-training-on-gym-equipment-while-trainer-helping-6455895/'
  );
  assert.notEqual(image.src, MARKETING_IMAGES.industryFlorist.src);
  assert.notEqual(image.src, MARKETING_IMAGES.industryRealEstate.src);
  assert.equal(existsSync(new URL(`.${image.src}`, PUBLIC_ROOT)), true);
});
