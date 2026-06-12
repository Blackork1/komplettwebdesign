import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const extraCss = readFileSync(new URL('../public/extra.css', import.meta.url), 'utf8');
const packageListCss = readFileSync(new URL('../public/package-list.css', import.meta.url), 'utf8');
const packageDetailCss = readFileSync(new URL('../public/package-detail.css', import.meta.url), 'utf8');
const packageListTemplate = readFileSync(new URL('../views/packages_list.ejs', import.meta.url), 'utf8');
const packageDetailTemplate = readFileSync(new URL('../views/package_detail.ejs', import.meta.url), 'utf8');
const interactionPolishCss = readFileSync(new URL('../public/interaction-polish.css', import.meta.url), 'utf8');

test('package templates load dedicated CSS assets without inline styles', () => {
  assert.match(packageListTemplate, /extraCssAssets:\s*\['package-list\.css'\]/);
  assert.match(packageDetailTemplate, /extraCssAssets:\s*\['package-list\.css',\s*'package-detail\.css'\]/);
  assert.doesNotMatch(packageListTemplate, /<style\b|style=/i);
  assert.doesNotMatch(packageDetailTemplate, /<style\b|style=/i);
  assert.doesNotMatch(extraCss, /\.packages-page\b/);
});

test('package overview keeps shadow-heavy card groups unclipped', () => {
  assert.match(packageListCss, /--packages-shadow-buffer:\s*clamp\(1rem,\s*2vw,\s*1\.5rem\)/);
  assert.match(packageListCss, /\.packages-page\s+\.container\s*\{[\s\S]*?overflow:\s*visible;/);
  assert.match(packageListCss, /\.packages-page\s+\.packages-hero\s*\{[\s\S]*?overflow:\s*visible;/);
  assert.match(packageListCss, /\.packages-page\s+\.package-row\s*\{[\s\S]*?overflow:\s*visible;[\s\S]*?padding:\s*var\(--packages-shadow-buffer\)\s*0;/);
  assert.match(packageListCss, /\.packages-page\s+\.intro-grid,[\s\S]*?\.packages-page\s+\.faq-list\s*\{[\s\S]*?overflow:\s*visible;[\s\S]*?padding:\s*var\(--packages-shadow-buffer\);/);
  assert.match(packageListCss, /\.packages-page\s+\.compare-table-wrap\s*\{[\s\S]*?margin:\s*var\(--packages-shadow-buffer\)\s*0;/);
  const finalCtaRuleStart = packageListCss.lastIndexOf('.packages-page .cta-inner {');
  assert.ok(finalCtaRuleStart > -1);
  const finalCtaRuleEnd = packageListCss.indexOf('}', finalCtaRuleStart);
  const finalCtaRule = packageListCss.slice(finalCtaRuleStart, finalCtaRuleEnd + 1);
  assert.match(finalCtaRule, /margin:\s*var\(--packages-shadow-buffer\)\s*auto;/);
  assert.doesNotMatch(finalCtaRule, /margin:\s*var\(--packages-shadow-buffer\)\s*0;/);
  assert.match(finalCtaRule, /flex-direction:\s*column;/);
  assert.match(finalCtaRule, /text-align:\s*center;/);
  assert.match(packageListCss, /\.packages-page\s+\.packages-cta\s+\.cta-actions\s*\{[\s\S]*?justify-content:\s*center;/);
});

test('package overview places image link and CTAs in the visual column', () => {
  assert.match(packageListTemplate, /<div class="package-visual">[\s\S]*<a class="package-image-link" href="<%= packageUrl\(pkg\) %>"[\s\S]*<img src="<%= packageImage\(pkg\) %>"[\s\S]*<div class="package-actions package-actions--image">[\s\S]*packages_details_/);
  assert.match(packageListTemplate, /<div class="package-actions package-actions--image">[\s\S]*packages_consult_/);
  assert.doesNotMatch(packageListTemplate, /package-overlay/);
  assert.match(packageListCss, /\.packages-page\s+\.package-frame:hover\s+img,[\s\S]*?\.packages-page\s+\.package-frame:focus-within\s+img\s*\{[\s\S]*?transform:\s*scale\(1\.04\);/);
  assert.match(packageListCss, /\.packages-page\s+\.package-visual\s+\.package-actions\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/);
});

test('package detail template gives card shadows visible breathing room', () => {
  assert.match(packageDetailCss, /\.package-detail-page\s*\{[\s\S]*?--packages-shadow-buffer:\s*clamp\(1rem,\s*2vw,\s*1\.5rem\);/);
  assert.match(packageDetailCss, /\.package-detail-page\s+\.container,[\s\S]*?\.package-detail-page\s+\.package-previews\s*\{[\s\S]*?overflow:\s*visible;/);
  assert.match(packageDetailCss, /\.package-detail-page\s+\.overview-cards,[\s\S]*?\.package-detail-page\s+\.previews-grid\s*\{[\s\S]*?overflow:\s*visible;[\s\S]*?padding:\s*var\(--packages-shadow-buffer\);/);
  assert.match(packageDetailCss, /\.package-detail-page\s+\.hero-price,[\s\S]*?\.package-detail-page\s+\.faq-detail-item\s*\{[\s\S]*?position:\s*relative;[\s\S]*?z-index:\s*0;/);
  assert.match(packageDetailCss, /Final shadow safety/);
  assert.equal(
    packageDetailCss.lastIndexOf('Final shadow safety') > packageDetailCss.lastIndexOf('.package-detail-page .timeline-phases {'),
    true
  );
  assert.match(packageDetailCss, /Final shadow safety[\s\S]*\.timeline-phases,[\s\S]*padding:\s*var\(--packages-shadow-buffer\);/);
});

test('package detail mobile cards keep stable gaps without reveal transforms', () => {
  assert.match(packageDetailCss, /@media \(max-width:\s*700px\)[\s\S]*?\.package-detail-page\s+\.overview-cards\s*\{[\s\S]*?row-gap:\s*1\.15rem;/);
  assert.match(packageDetailCss, /@media \(max-width:\s*700px\)[\s\S]*?\.package-detail-page\s+\.detail-grid\s*\{[\s\S]*?column-count:\s*1;[\s\S]*?column-width:\s*auto;[\s\S]*?column-gap:\s*0;/);
  assert.match(packageDetailCss, /@media \(max-width:\s*700px\)[\s\S]*?\.package-detail-page :is\(\.overview-card, \.detail-card\)\.kwd-scroll-reveal,[\s\S]*?transform:\s*none\s*!important;/);
});

test('package detail service cards use CSS columns masonry for automatic card heights', () => {
  assert.match(packageDetailCss, /\.package-detail-page\s+\.detail-grid\s*\{[\s\S]*?column-count:\s*3;[\s\S]*?column-width:\s*280px;[\s\S]*?column-gap:\s*1\.5rem;/);
  assert.match(packageDetailCss, /\.package-detail-page\s+\.detail-card\s*\{[\s\S]*?display:\s*inline-block;[\s\S]*?width:\s*100%;[\s\S]*?margin:\s*0 0 1\.5rem;[\s\S]*?break-inside:\s*avoid;/);
  assert.match(packageDetailCss, /\.package-detail-page\s+\.detail-card\s+h3\s*\{[\s\S]*?margin:\s*0 0 0\.85rem;/);
});

test('package detail scope boundary columns use semantic visual markers', () => {
  assert.match(packageDetailTemplate, /title:\s*isEnglish \? 'Included services' : 'Enthaltene Leistungen',[\s\S]*?type:\s*'included'/);
  assert.match(packageDetailTemplate, /title:\s*isEnglish \? 'Not automatically included' : 'Nicht automatisch enthalten',[\s\S]*?type:\s*'excluded'/);
  assert.match(packageDetailTemplate, /title:\s*isEnglish \? 'Typical use cases' : 'Typische Einsatzfälle',[\s\S]*?type:\s*'use-cases'/);
  assert.match(packageDetailTemplate, /class="scope-card scope-card--<%=\s*block\.type \|\| 'neutral'\s*%>"/);
  assert.match(packageDetailCss, /\.package-detail-page\s+\.scope-card ul\s*\{[\s\S]*?list-style:\s*none;/);
  assert.match(packageDetailCss, /\.package-detail-page\s+\.scope-card--included li::before\s*\{[\s\S]*?content:\s*"✓";/);
  assert.match(packageDetailCss, /\.package-detail-page\s+\.scope-card--excluded li::before\s*\{[\s\S]*?content:\s*"X";/);
  assert.match(packageDetailCss, /\.package-detail-page\s+\.scope-card--use-cases li::before,[\s\S]*?\.package-detail-page\s+\.scope-card--neutral li::before\s*\{[\s\S]*?content:\s*"•";/);
});

test('package detail who-for list uses automatic three-column placement', () => {
  const whoForRuleStart = packageDetailCss.indexOf('.package-detail-page .who-for-list {', packageDetailCss.indexOf('/* Who-for */'));
  assert.ok(whoForRuleStart > -1);
  const whoForRuleEnd = packageDetailCss.indexOf('}', whoForRuleStart);
  const whoForRule = packageDetailCss.slice(whoForRuleStart, whoForRuleEnd + 1);

  assert.match(whoForRule, /max-width:\s*70rem;/);
  assert.match(whoForRule, /display:\s*grid;/);
  assert.match(whoForRule, /grid-auto-flow:\s*row dense;/);
  assert.match(whoForRule, /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);/);
  assert.doesNotMatch(whoForRule, /flex-direction:\s*column;/);
  assert.doesNotMatch(whoForRule, /column-count:/);

  const whoForItemRuleStart = packageDetailCss.indexOf('.package-detail-page .who-for-list li {', whoForRuleEnd);
  assert.ok(whoForItemRuleStart > -1);
  const whoForItemRuleEnd = packageDetailCss.indexOf('}', whoForItemRuleStart);
  const whoForItemRule = packageDetailCss.slice(whoForItemRuleStart, whoForItemRuleEnd + 1);
  assert.match(whoForItemRule, /width:\s*100%;/);
  assert.match(whoForItemRule, /box-sizing:\s*border-box;/);
  assert.match(packageDetailCss, /@media \(max-width:\s*700px\)[\s\S]*?\.package-detail-page\s+\.who-for-list\s*\{[\s\S]*?grid-template-columns:\s*1fr;/);
});

test('package detail add-ons render as a backend-timed seamless ticker', () => {
  assert.match(packageDetailTemplate, /data-addons-ticker/);
  assert.match(packageDetailTemplate, /data-ticker-duration="<%=\s*addOnsTickerDuration\s*%>"/);
  assert.match(packageDetailTemplate, /const rawDuration = String\(ticker\.dataset\.tickerDuration \|\| ''\)\.trim\(\);/);
  assert.match(packageDetailTemplate, /typeof addOnsTickerDurationSeconds !== 'undefined' \? addOnsTickerDurationSeconds : 35/);
  assert.match(packageDetailTemplate, /Math\.min\(180,\s*Math\.max\(8,\s*addOnsTickerDurationValue\)\)/);
  assert.match(packageDetailCss, /\.package-detail-page\s+\.addons-ticker\s*\{[\s\S]*?overflow-x:\s*hidden;[\s\S]*?touch-action:\s*pan-y;[\s\S]*?container-type:\s*inline-size;[\s\S]*?-webkit-mask-image:\s*linear-gradient/);
  assert.doesNotMatch(packageDetailCss, /\.package-detail-page\s+\.addons-ticker\.is-dragging/);
  assert.doesNotMatch(packageDetailCss, /\.package-detail-page\s+\.addons-ticker[\s\S]*?cursor:\s*grab/);
  assert.match(packageDetailCss, /\.package-detail-page\s+\.addons-list li\s*\{[\s\S]*?flex:\s*0 0 min\(80vw,\s*540px\);/);
  assert.match(packageDetailCss, /@supports \(width:\s*1cqw\)[\s\S]*?flex-basis:\s*min\(80cqw,\s*540px\);/);
  assert.match(packageDetailTemplate, /const clone = group\.cloneNode\(true\);[\s\S]*?clone\.setAttribute\('aria-hidden', 'true'\);[\s\S]*?track\.appendChild\(clone\);/);
  assert.match(packageDetailTemplate, /pixelsPerMs = groupWidth \/ \(durationSecondsFrom\(ticker\) \* 1000\)/);
  assert.match(packageDetailTemplate, /ticker\.scrollLeft \+= delta \* pixelsPerMs/);
  assert.doesNotMatch(packageDetailTemplate, /USER_PAUSE_MS/);
  assert.doesNotMatch(packageDetailTemplate, /isDragging/);
  assert.doesNotMatch(packageDetailTemplate, /ticker\.addEventListener\('pointerdown'/);
  assert.doesNotMatch(packageDetailTemplate, /ticker\.addEventListener\('pointermove'/);
  assert.doesNotMatch(packageDetailTemplate, /ticker\.addEventListener\('touchstart'/);
  assert.doesNotMatch(packageDetailTemplate, /ticker\.addEventListener\('wheel'/);
  assert.match(packageDetailTemplate, /window\.requestAnimationFrame\(tick\)/);
});

test('package detail hero image aligns with the content height from breadcrumbs to price area', () => {
  assert.match(packageDetailCss, /\.packages-page\.package-detail-page\s+\.package-detail-hero\.unified-hero\s+\.hero-grid\s*\{[\s\S]*?align-items:\s*stretch;[\s\S]*?min-height:\s*0;/);
  assert.doesNotMatch(packageDetailCss, /\.packages-page\.package-detail-page\s+\.package-detail-hero\.unified-hero\s+\.hero-grid\s*\{[\s\S]*?min-height:\s*max\(/);
  assert.match(packageDetailCss, /\.packages-page\.package-detail-page\s+\.package-detail-hero\.unified-hero\s+\.hero-copy\s*\{[\s\S]*?align-self:\s*stretch;[\s\S]*?justify-content:\s*flex-start;/);
  assert.match(packageDetailCss, /\.packages-page\.package-detail-page\s+\.package-detail-hero\.unified-hero\s+\.hero-visual\s*\{[\s\S]*?align-self:\s*stretch;[\s\S]*?height:\s*auto;[\s\S]*?min-height:\s*0;/);
  assert.match(packageDetailCss, /\.package-detail-page\s+\.package-detail-hero\s+\.hero-image-frame\s*\{[\s\S]*?aspect-ratio:\s*auto;[\s\S]*?width:\s*100%;[\s\S]*?max-width:\s*none;[\s\S]*?flex:\s*1 1 auto;[\s\S]*?height:\s*100%;[\s\S]*?min-height:\s*0;[\s\S]*?padding:\s*0;[\s\S]*?background:\s*transparent;[\s\S]*?border:\s*0;[\s\S]*?overflow:\s*hidden;/);
  assert.match(packageDetailCss, /\.package-detail-page\s+\.package-detail-hero\s+\.hero-image-frame\s+img\s*\{[\s\S]*?width:\s*100%;[\s\S]*?height:\s*100%;[\s\S]*?object-fit:\s*cover;[\s\S]*?object-position:\s*center;/);
  assert.match(packageDetailCss, /\.package-detail-page\s+\.package-detail-hero\s+\.hero-price\s*\{[\s\S]*?margin-bottom:\s*0;/);
  assert.match(packageDetailCss, /\.package-detail-page\s+\.hero-meta\s*\{[\s\S]*?position:\s*relative;/);
  assert.match(packageDetailCss, /\.package-detail-page\s+\.hero-note\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?top:\s*calc\(100% \+ 0\.7rem\);/);
  assert.match(packageDetailCss, /\.package-detail-page\s+\.package-detail-hero\s+\.hero-actions\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);[\s\S]*?grid-auto-rows:\s*1fr;[\s\S]*?align-items:\s*stretch;/);
  assert.match(packageDetailCss, /@media \(max-width:\s*720px\)[\s\S]*?\.package-detail-page\s+\.hero-price\s*\{[\s\S]*?flex-direction:\s*row;[\s\S]*?align-items:\s*stretch;/);
  assert.match(packageDetailCss, /@media \(max-width:\s*720px\)[\s\S]*?\.package-detail-page\s+\.package-detail-hero\s+\.hero-actions\s*\{[\s\S]*?grid-template-columns:\s*1fr;/);
  assert.match(packageDetailCss, /@media \(max-width:\s*900px\)[\s\S]*?\.package-detail-page\s+\.package-detail-hero\s+\.hero-image-frame\s*\{[\s\S]*?aspect-ratio:\s*4\s*\/\s*3;[\s\S]*?height:\s*auto;[\s\S]*?min-height:\s*0;/);
});

test('scroll reveal animation does not clip package shadows after reveal', () => {
  assert.match(interactionPolishCss, /\.kwd-scroll-reveal\b/);
  assert.match(interactionPolishCss, /\.kwd-scroll-reveal--visible\b/);
  assert.doesNotMatch(interactionPolishCss, /clip-path/);
  assert.doesNotMatch(interactionPolishCss, /will-change:[^;]*clip-path/);
});
