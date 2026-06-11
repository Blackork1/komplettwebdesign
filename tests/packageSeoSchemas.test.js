import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';

import { packages } from '../data/packages.js';
import { buildPackageSchemas } from '../util/seoSchemas.js';

test('package detail schemas use canonical service names and cautious FAQ copy without product offers', () => {
  const startPackage = {
    ...packages.find((pkg) => pkg.slug === 'start'),
    visibleFaqs: [
      {
        q: 'Was ist im Start-Paket enthalten?',
        a: 'Eine kompakte Website mit 1 bis 3 Seiten oder Onepager, responsives Design und eine Feedbackrunde.'
      },
      {
        q: 'Sind Rechtstexte enthalten?',
        a: 'Rechtlich relevante Seiten können technisch eingebunden werden. Die Erstellung oder Prüfung ist keine Rechtsberatung.'
      }
    ]
  };
  const schemas = buildPackageSchemas({
    pack: startPackage,
    url: 'https://www.komplettwebdesign.de/pakete/start',
    baseUrl: 'https://www.komplettwebdesign.de',
    lng: 'de'
  });

  const service = schemas.find((schema) => schema['@type'] === 'Service');
  const faq = schemas.find((schema) => schema['@type'] === 'FAQPage');

  assert.equal(service.name, 'Start-Paket');
  assert.equal(service.provider['@type'], 'Organization');
  assert.equal(service.provider.url, 'https://www.komplettwebdesign.de/');
  assert.equal(schemas.some((schema) => schema['@type'] === 'Product'), false);
  assert.doesNotMatch(JSON.stringify(schemas), /"@type":"Offer"|"@type":"Product"|priceValidUntil|AggregateRating/);

  const faqText = JSON.stringify(faq.mainEntity);
  assert.match(faqText, /keine Rechtsberatung/);
  assert.deepEqual(
    faq.mainEntity.map((entry) => entry.name),
    startPackage.visibleFaqs.map((entry) => entry.q)
  );
  assert.doesNotMatch(faqText, /Basis-Paket|Premium-Paket|499|899|Buchungssystem\s+enthalten|DSGVO-konform/);
});

test('package detail schemas do not duplicate package suffixes from DB display names', () => {
  const businessPackage = {
    name: 'Business',
    displayName: 'Business-Paket',
    shortDescription: 'Unternehmenswebsite mit mehreren Seiten.',
    visibleFaqs: []
  };
  const individualPackage = {
    name: 'Individuell',
    displayName: 'Individuelles Projekt',
    shortDescription: 'Individuelles Webdesign-Projekt.',
    visibleFaqs: []
  };

  const businessSchemas = buildPackageSchemas({
    pack: businessPackage,
    url: 'https://www.komplettwebdesign.de/pakete/business',
    baseUrl: 'https://www.komplettwebdesign.de',
    lng: 'de'
  });
  const individualSchemas = buildPackageSchemas({
    pack: individualPackage,
    url: 'https://www.komplettwebdesign.de/pakete/individuell',
    baseUrl: 'https://www.komplettwebdesign.de',
    lng: 'de'
  });

  assert.equal(businessSchemas.find((schema) => schema['@type'] === 'Service').name, 'Business-Paket');
  assert.equal(individualSchemas.find((schema) => schema['@type'] === 'Service').name, 'Individuelles Projekt');
});

test('package detail schemas emit FAQPage only from visible DB FAQ data', () => {
  const schemasWithoutFaq = buildPackageSchemas({
    pack: {
      name: 'Start',
      displayName: 'Start-Paket',
      shortDescription: 'Kompaktes Website-Paket.',
      visibleFaqs: []
    },
    url: 'https://www.komplettwebdesign.de/pakete/start',
    baseUrl: 'https://www.komplettwebdesign.de',
    lng: 'de'
  });

  assert.equal(schemasWithoutFaq.some((schema) => schema['@type'] === 'FAQPage'), false);

  const schemasWithFaq = buildPackageSchemas({
    pack: {
      name: 'Start',
      displayName: 'Start-Paket',
      shortDescription: 'Kompaktes Website-Paket.',
      visibleFaqs: [
        {
          question: 'Ist das Start-Paket für kleine Websites geeignet?',
          answer: 'Ja, wenn ein kompakter Umfang ausreicht.'
        }
      ]
    },
    url: 'https://www.komplettwebdesign.de/pakete/start',
    baseUrl: 'https://www.komplettwebdesign.de',
    lng: 'de'
  });
  const faq = schemasWithFaq.find((schema) => schema['@type'] === 'FAQPage');

  assert.equal(faq.mainEntity.length, 1);
  assert.equal(faq.mainEntity[0].name, 'Ist das Start-Paket für kleine Websites geeignet?');
});

test('package overview schema avoids stale product images and aggregate offer claims', () => {
  const template = readFileSync(new URL('../views/packages_list.ejs', import.meta.url), 'utf8');

  assert.doesNotMatch(template, /paket-(?:basis|premium)\.webp/);
  assert.doesNotMatch(template, /"@type":\s*"AggregateOffer"/);
  assert.doesNotMatch(template, /"@type":\s*"Product"/);
  assert.match(template, /"@type":\s*"ItemList"/);
  assert.match(template, /\/pakete\/start/);
  assert.match(template, /\/pakete\/business/);
  assert.match(template, /\/pakete\/wachstum/);
  assert.match(template, /\/pakete\/individuell/);
});

test('package overview hero uses the compressed package hero image', () => {
  const template = readFileSync(new URL('../views/packages_list.ejs', import.meta.url), 'utf8');
  const controller = readFileSync(new URL('../controllers/packagesController.js', import.meta.url), 'utf8');
  const heroImage = new URL('../public/images/heroPakete.webp', import.meta.url);

  assert.ok(existsSync(heroImage), 'compressed package hero image is missing');
  assert.ok(statSync(heroImage).size < 150_000, 'compressed package hero image should stay small');
  assert.match(template, /\/images\/heroPakete\.webp/);
  assert.match(template, /fetchpriority="high"/);
  assert.match(controller, /imagePath:\s*'\/images\/heroPakete\.webp'/);
});
