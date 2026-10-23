import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderFaqPage } from '../controllers/faqController.js';
import { buildPricingViewModel } from '../util/pricingViewModel.js';
import pool from '../util/db.js';

const blogControllerSource = readFileSync(new URL('../controllers/blogController.js', import.meta.url), 'utf8');
const blogPresentationSource = readFileSync(new URL('../services/blogPostPresentationService.js', import.meta.url), 'utf8');
const ratgeberControllerSource = readFileSync(new URL('../controllers/ratgeberController.js', import.meta.url), 'utf8');
const slugControllerSource = readFileSync(new URL('../controllers/slugController.js', import.meta.url), 'utf8');

test('Blog controller renders pricing tokens before public output', () => {
  assert.match(blogControllerSource, /pricingTokenRenderer\.js/);
  assert.match(blogControllerSource, /renderPricingTokens\(rawPosts/);
  assert.match(blogControllerSource, /renderPricingTokens\(rawFeaturedPosts/);
  assert.match(blogControllerSource, /buildBlogPostPageModel/);
  assert.match(blogPresentationSource, /renderPricingTokens\(rawPost/);
  assert.match(blogPresentationSource, /renderPricingTokens\(renderDbEjs/);
});

test('Ratgeber controller uses the DB pricing token renderer for guides and blog teasers', () => {
  assert.match(ratgeberControllerSource, /pricingTokenRenderer\.js/);
  assert.doesNotMatch(ratgeberControllerSource, /interpolatePricingTokens/);
  assert.match(ratgeberControllerSource, /renderPricingTokens\(mergeGuides/);
  assert.match(ratgeberControllerSource, /renderPricingTokens\(featuredPosts/);
  assert.match(ratgeberControllerSource, /renderPricingTokens\(latestBlogPosts/);
  assert.match(ratgeberControllerSource, /renderPricingTokens\(post/);
  assert.match(ratgeberControllerSource, /renderPricingTokens\(renderDbEjs/);
});

test('FAQ controller uses the current central package price in visible answers and FAQPage JSON-LD', async () => {
  let page;
  const response = {
    locals: { packagePricing: buildPricingViewModel({ lowestPackagePriceLabel: '1.237 €' }) },
    set() {},
    status() { return this; },
    send() {},
    render(view, model) { assert.equal(view, 'faq'); page = model; }
  };
  const originalQuery = pool.query;
  pool.query = async () => { throw new Error('Legacy FAQ database unavailable'); };
  try {
    await renderFaqPage({ query: { cat: '2' } }, response, () => assert.fail('price category must exist'));
  } finally {
    pool.query = originalQuery;
  }
  assert.ok(page, 'price category must render');
  const answer = page.faqs[0].answer;
  assert.match(answer, /bei 1\.237 €/);
  assert.doesNotMatch(answer, /\{\{|799\s*€|499\s*€/);
  assert.equal(JSON.parse(page.faqJsonLd).mainEntity[0].acceptedAnswer.text, answer);
});

test('Generic CMS slug controller renders pricing tokens in pages and components', () => {
  assert.match(slugControllerSource, /pricingTokenRenderer\.js/);
  assert.match(slugControllerSource, /renderPricingTokens\(pages\[0\]/);
  assert.match(slugControllerSource, /renderPricingTokens\(rawComps/);
});
