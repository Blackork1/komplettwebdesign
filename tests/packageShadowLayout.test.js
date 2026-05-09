import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const extraCss = readFileSync(new URL('../public/extra.css', import.meta.url), 'utf8');
const packageDetailTemplate = readFileSync(new URL('../views/package_detail.ejs', import.meta.url), 'utf8');
const interactionPolishCss = readFileSync(new URL('../public/interaction-polish.css', import.meta.url), 'utf8');

test('package overview keeps shadow-heavy card groups unclipped', () => {
  assert.match(extraCss, /--packages-shadow-buffer:\s*clamp\(1rem,\s*2vw,\s*1\.5rem\)/);
  assert.match(extraCss, /\.packages-page\s+\.container\s*\{[\s\S]*?overflow:\s*visible;/);
  assert.match(extraCss, /\.packages-page\s+\.packages-hero\s*\{[\s\S]*?overflow:\s*visible;/);
  assert.match(extraCss, /\.packages-page\s+\.package-row\s*\{[\s\S]*?overflow:\s*visible;[\s\S]*?padding:\s*var\(--packages-shadow-buffer\)\s*0;/);
  assert.match(extraCss, /\.packages-page\s+\.intro-grid,[\s\S]*?\.packages-page\s+\.faq-list\s*\{[\s\S]*?overflow:\s*visible;[\s\S]*?padding:\s*var\(--packages-shadow-buffer\);/);
  assert.match(extraCss, /\.packages-page\s+\.compare-table-wrap\s*\{[\s\S]*?margin:\s*var\(--packages-shadow-buffer\)\s*0;/);
  const finalCtaRuleStart = extraCss.lastIndexOf('.packages-page .cta-inner {');
  assert.ok(finalCtaRuleStart > -1);
  const finalCtaRuleEnd = extraCss.indexOf('}', finalCtaRuleStart);
  const finalCtaRule = extraCss.slice(finalCtaRuleStart, finalCtaRuleEnd + 1);
  assert.match(finalCtaRule, /margin:\s*var\(--packages-shadow-buffer\)\s*auto;/);
  assert.doesNotMatch(finalCtaRule, /margin:\s*var\(--packages-shadow-buffer\)\s*0;/);
  assert.match(finalCtaRule, /flex-direction:\s*column;/);
  assert.match(finalCtaRule, /text-align:\s*center;/);
  assert.match(extraCss, /\.packages-page\s+\.packages-cta\s+\.cta-actions\s*\{[\s\S]*?justify-content:\s*center;/);
});

test('package detail template gives card shadows visible breathing room', () => {
  assert.match(packageDetailTemplate, /\.package-detail-page\s*\{[\s\S]*?--packages-shadow-buffer:\s*clamp\(1rem,\s*2vw,\s*1\.5rem\);/);
  assert.match(packageDetailTemplate, /\.package-detail-page\s+\.container,[\s\S]*?\.package-detail-page\s+\.package-previews\s*\{[\s\S]*?overflow:\s*visible;/);
  assert.match(packageDetailTemplate, /\.package-detail-page\s+\.overview-cards,[\s\S]*?\.package-detail-page\s+\.previews-grid\s*\{[\s\S]*?overflow:\s*visible;[\s\S]*?padding:\s*var\(--packages-shadow-buffer\);/);
  assert.match(packageDetailTemplate, /\.package-detail-page\s+\.hero-price,[\s\S]*?\.package-detail-page\s+\.faq-detail-item\s*\{[\s\S]*?position:\s*relative;[\s\S]*?z-index:\s*0;/);
  assert.match(packageDetailTemplate, /Final shadow safety/);
  assert.equal(
    packageDetailTemplate.lastIndexOf('Final shadow safety') > packageDetailTemplate.lastIndexOf('.package-detail-page .timeline-phases {'),
    true
  );
  assert.match(packageDetailTemplate, /Final shadow safety[\s\S]*\.timeline-phases,[\s\S]*padding:\s*var\(--packages-shadow-buffer\);/);
});

test('package detail hero image fills the media frame without a white border', () => {
  assert.match(packageDetailTemplate, /\.package-detail-page\s+\.package-detail-hero\s+\.hero-image-frame\s*\{[\s\S]*?aspect-ratio:\s*2\s*\/\s*3;[\s\S]*?padding:\s*0;[\s\S]*?background:\s*transparent;[\s\S]*?border:\s*0;[\s\S]*?overflow:\s*hidden;/);
  assert.match(packageDetailTemplate, /\.package-detail-page\s+\.package-detail-hero\s+\.hero-image-frame\s+img\s*\{[\s\S]*?width:\s*100%;[\s\S]*?height:\s*100%;[\s\S]*?object-fit:\s*cover;[\s\S]*?object-position:\s*center;/);
});

test('scroll reveal animation does not clip package shadows after reveal', () => {
  assert.match(interactionPolishCss, /\.kwd-scroll-reveal\b/);
  assert.match(interactionPolishCss, /\.kwd-scroll-reveal--visible\b/);
  assert.doesNotMatch(interactionPolishCss, /clip-path/);
  assert.doesNotMatch(interactionPolishCss, /will-change:[^;]*clip-path/);
});
