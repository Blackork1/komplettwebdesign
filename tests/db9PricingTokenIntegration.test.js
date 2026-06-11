import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const blogControllerSource = readFileSync(new URL('../controllers/blogController.js', import.meta.url), 'utf8');
const ratgeberControllerSource = readFileSync(new URL('../controllers/ratgeberController.js', import.meta.url), 'utf8');
const faqControllerSource = readFileSync(new URL('../controllers/faqController.js', import.meta.url), 'utf8');
const chatControllerSource = readFileSync(new URL('../controllers/chatController.js', import.meta.url), 'utf8');
const slugControllerSource = readFileSync(new URL('../controllers/slugController.js', import.meta.url), 'utf8');

test('Blog controller renders pricing tokens before public output', () => {
  assert.match(blogControllerSource, /pricingTokenRenderer\.js/);
  assert.match(blogControllerSource, /renderPricingTokens\(rawPosts/);
  assert.match(blogControllerSource, /renderPricingTokens\(rawFeaturedPosts/);
  assert.match(blogControllerSource, /renderPricingTokens\(rawPost/);
  assert.match(blogControllerSource, /renderPricingTokens\(renderDbEjs/);
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

test('FAQ controller renders pricing tokens before visible FAQ and FAQPage JSON-LD', () => {
  assert.match(faqControllerSource, /pricingTokenRenderer\.js/);
  assert.match(faqControllerSource, /renderPricingTokens\(await getFaqsByCategory/);
  assert.match(faqControllerSource, /renderPricingTokens\(await fetchAllFaqsGrouped/);
  assert.match(faqControllerSource, /buildFaqJsonLd\(faqs\)/);
});

test('Chat retrieval context is normalized with pricing tokens before OpenAI prompt usage', () => {
  assert.match(chatControllerSource, /pricingTokenRenderer\.js/);
  assert.match(chatControllerSource, /renderPricingTokens\(rawFaqs/);
  assert.match(chatControllerSource, /renderPricingTokens\(rawPages/);
  assert.match(chatControllerSource, /renderPricingTokens\(rawIndustries/);
});

test('Generic CMS slug controller renders pricing tokens in pages and components', () => {
  assert.match(slugControllerSource, /pricingTokenRenderer\.js/);
  assert.match(slugControllerSource, /renderPricingTokens\(pages\[0\]/);
  assert.match(slugControllerSource, /renderPricingTokens\(rawComps/);
});
