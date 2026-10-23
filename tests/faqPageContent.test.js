import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../util/db.js';
import { renderFaqPage } from '../controllers/faqController.js';
import { buildPricingViewModel } from '../util/pricingViewModel.js';

async function renderCategory(cat, pricing = buildPricingViewModel()) {
  const response = {
    statusCode: 200,
    locals: { packagePricing: pricing, canonicalBaseUrl: 'https://www.komplettwebdesign.de/' },
    headers: {},
    set(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    send(body) { this.body = body; },
    render(view, model) { this.view = view; this.model = model; }
  };
  let notFound = false;
  const originalQuery = pool.query;
  pool.query = async () => { throw new Error('Legacy FAQ database unavailable'); };
  try {
    await renderFaqPage({ query: cat === undefined ? {} : { cat } }, response, () => { notFound = true; });
  } finally {
    pool.query = originalQuery;
  }
  return { ...response, notFound };
}

test('reviewed FAQ topics remain available when the legacy FAQ database is unavailable', async () => {
  const questions = new Set();
  for (const id of [1, 2, 3, 4, 5]) {
    const response = await renderCategory(String(id));
    assert.equal(response.statusCode, 200, `category ${id}`);
    assert.equal(response.notFound, false);
    assert.equal(response.view, 'faq');
    assert.equal(response.model.selectedCategory.id, id);
    assert.equal(response.model.faqs.length, 4);
    assert.deepEqual(response.model.categories.map(category => [category.id, category.name]), [
      [1, 'Leistungen'], [2, 'Preise & Kosten'], [3, 'Ablauf'], [4, 'Technik & Pflege'], [5, 'SEO & Rechtliches']
    ]);
    for (const faq of response.model.faqs) {
      assert.ok(faq.question.trim());
      assert.ok(faq.answer.trim());
      questions.add(faq.question);
    }
  }
  assert.equal(questions.size, 20);
  assert.equal((await renderCategory()).model.selectedCategory.id, 1);
});

test('each FAQPage describes exactly the questions and answers of its selected topic', async () => {
  for (const cat of ['1', '2', '3', '4', '5']) {
    const { model, headers } = await renderCategory(cat);
    assert.ok(model, `category ${cat} must render`);
    const schema = JSON.parse(model.faqJsonLd);
    assert.equal(schema['@context'], 'https://schema.org');
    assert.equal(schema['@type'], 'FAQPage');
    assert.deepEqual(schema.mainEntity.map(question => ({ question: question.name, answer: question.acceptedAnswer.text })), model.faqs);
    assert.equal(headers['Cache-Control'], 'public, max-age=300');
    assert.match(model.seoExtra, /content="https:\/\/www\.komplettwebdesign\.de\/faq"/);
    assert.doesNotMatch(model.seoExtra, /\?cat=/);
  }
});

test('missing central package prices produce a useful package link without empty prices or token syntax', async () => {
  const { model } = await renderCategory('2');
  assert.ok(model);
  const answer = model.faqs[0].answer;
  assert.match(answer, /href="\/pakete"/);
  assert.doesNotMatch(answer, /\{\{|\}\}|\(\s*\)|starten\s*\./);
  assert.doesNotMatch(answer, /\d[\d.,]*\s*€/);
  assert.ok(answer.includes('Paketübersicht'));
});
