import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ejs from 'ejs';
import pool from '../util/db.js';
import { renderFaqPage } from '../controllers/faqController.js';
import { buildPricingViewModel } from '../util/pricingViewModel.js';

const visiblePackages = [
  ['start', 'Start', 'ab 799 €'],
  ['business', 'Business', 'ab 1.499 €'],
  ['wachstum', 'Wachstum', 'ab 2.499 €'],
  ['individuell', 'Individuell', 'ab 3.500 €']
].map(([slug, name, priceLabel]) => ({ slug, name, priceLabel, canonicalPath: `/pakete/${slug}` }));
const pricedContext = () => buildPricingViewModel({ visiblePackages, lowestPackagePriceLabel: '799 €' });

async function renderFaq(query = {}, pricing = buildPricingViewModel()) {
  const response = {
    statusCode: 200,
    locals: { packagePricing: pricing, canonicalBaseUrl: 'https://www.komplettwebdesign.de/' },
    headers: {},
    set(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    send(body) { this.body = body; },
    redirect(code, location) { this.statusCode = code; this.location = location; },
    render(view, model) { this.view = view; this.model = model; }
  };
  let notFound = false;
  const originalQuery = pool.query;
  pool.query = async () => { throw new Error('Legacy FAQ database unavailable'); };
  try {
    await renderFaqPage({ query }, response, () => { notFound = true; });
  } finally {
    pool.query = originalQuery;
  }
  return { ...response, notFound };
}

const plainWords = html => html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;

test('alle Fragen aller Themen stehen auf der kanonischen FAQ-Seite', async () => {
  const { statusCode, view, model } = await renderFaq();
  assert.equal(statusCode, 200);
  assert.equal(view, 'faq');
  assert.deepEqual(model.categories.map(category => [category.slug, category.name]), [
    ['leistungen', 'Leistungen'], ['preise-kosten', 'Preise & Kosten'], ['ablauf', 'Ablauf'],
    ['technik-pflege', 'Technik & Pflege'], ['seo-rechtliches', 'SEO & Rechtliches']
  ]);
  const questions = model.categories.flatMap(category => category.faqs.map(faq => faq.question));
  assert.ok(model.categories.every(category => category.faqs.length >= 4));
  assert.equal(new Set(questions).size, questions.length);
  assert.equal(questions.length, model.faqs.length);
  assert.ok(questions.length >= 20);
});

test('jede Antwort ist ein eigenständiger Absatz mit 40 bis 90 Wörtern', async () => {
  const { model } = await renderFaq({}, pricedContext());
  for (const faq of model.faqs) {
    const words = plainWords(faq.answer);
    assert.ok(words >= 40 && words <= 90, `${faq.question}: ${words} Wörter`);
    assert.doesNotMatch(faq.answer, /\{\{|\}\}/);
  }
});

test('FAQPage-Schema enthält genau die sichtbaren Fragen, dazu die Breadcrumb', async () => {
  const { model, headers } = await renderFaq();
  const [faqPage, breadcrumb] = model.structuredDataBlocks;
  assert.equal(faqPage['@type'], 'FAQPage');
  assert.equal(faqPage.url, 'https://www.komplettwebdesign.de/faq');
  assert.equal(faqPage.breadcrumb['@id'], breadcrumb['@id']);
  assert.equal(breadcrumb['@type'], 'BreadcrumbList');
  assert.deepEqual(
    faqPage.mainEntity.map(question => ({ question: question.name, answer: question.acceptedAnswer.text })),
    model.faqs.map(({ question, answer }) => ({ question, answer }))
  );
  assert.equal(headers['Cache-Control'], 'public, max-age=300');
  assert.match(model.seoExtra, /content="https:\/\/www\.komplettwebdesign\.de\/faq"/);
  assert.doesNotMatch(model.seoExtra, /\?cat=/);
});

test('alte Themen-Adressen leiten dauerhaft auf die passende Sprungmarke', async () => {
  for (const [cat, anchor] of [['1', 'leistungen'], ['2', 'preise-kosten'], ['5', 'seo-rechtliches']]) {
    const response = await renderFaq({ cat });
    assert.equal(response.statusCode, 301);
    assert.equal(response.location, `/faq#${anchor}`);
    assert.equal(response.view, undefined);
  }
});

test('ohne zentrale Paketpreise erscheinen weder leere Preise noch Platzhalter', async () => {
  const { model } = await renderFaq();
  const priceAnswer = model.faqs.find(faq => faq.question === 'Was kostet eine Website bei dir?').answer;
  assert.match(priceAnswer, /href="\/pakete"/);
  assert.ok(priceAnswer.includes('Paketübersicht'));
  for (const text of [priceAnswer, model.summary]) {
    assert.doesNotMatch(text, /\{\{|\}\}|\(\s*\)|bei\s*:/);
    assert.doesNotMatch(text, /\d[\d.,]*\s*€(?!\/Monat)/);
  }
});

test('mit zentralen Paketpreisen nennen Kurzfassung und Kostenfrage die Preise', async () => {
  const { model } = await renderFaq({}, pricedContext());
  const priceAnswer = model.faqs.find(faq => faq.question === 'Was kostet eine Website bei dir?').answer;
  assert.match(priceAnswer, /Start ab 799 €, Business ab 1\.499 €, Wachstum ab 2\.499 €/);
  assert.match(model.summary, /starten bei 799 €/);
});

test('Umfang, Feedbackrunden und Wartungspreise stammen aus den Paket- und Wartungsdaten', async () => {
  const { model } = await renderFaq();
  const answer = question => model.faqs.find(faq => faq.question === question).answer;
  assert.match(answer('Was ist in einem Website-Paket enthalten?'), /Business ca\. 4 bis 7 Seiten mit 2 Feedbackrunden/);
  assert.match(answer('Wie laufen Feedback und Freigabe ab?'), /2 bis 3 Feedbackrunden im Wachstum-Paket/);
  assert.match(answer('Welche laufenden Kosten kommen nach dem Livegang dazu?'), /Wartung Basis ab 39 €\/Monat/);
});

test('die Seite zeigt alle Themen als Sprungmarken, Stand-Datum und Autor', async () => {
  const { model } = await renderFaq({}, pricedContext());
  const template = await readFile(new URL('../views/faq.ejs', import.meta.url), 'utf8');
  const body = template.replace(/<%- include\([^)]*\) %>/g, '');
  const html = ejs.render(body, model);
  for (const category of model.categories) {
    assert.match(html, new RegExp(`href="#${category.slug}"`));
    assert.match(html, new RegExp(`<section class="faq-content" id="${category.slug}"`));
  }
  assert.match(html, /Stand: <time datetime="\d{4}-\d{2}-\d{2}">\d{2}\.\d{2}\.\d{4}<\/time>/);
  assert.match(html, /href="\/about">Sören Blocksdorf<\/a>/);
  assert.equal((html.match(/<details class="faq-item"/g) || []).length, model.faqs.length);
  assert.doesNotMatch(html, /\?cat=/);
});
