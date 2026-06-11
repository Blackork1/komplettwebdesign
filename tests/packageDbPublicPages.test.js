import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const controllerSource = readFileSync(new URL('../controllers/packagesController.js', import.meta.url), 'utf8');
const packagesListTemplate = readFileSync(new URL('../views/packages_list.ejs', import.meta.url), 'utf8');
const packageListCss = readFileSync(new URL('../public/package-list.css', import.meta.url), 'utf8');
const packageDetailTemplate = readFileSync(new URL('../views/package_detail.ejs', import.meta.url), 'utf8');
const packageDetailCss = readFileSync(new URL('../public/package-detail.css', import.meta.url), 'utf8');
const seoSchemasSource = readFileSync(new URL('../util/seoSchemas.js', import.meta.url), 'utf8');
const sitemapControllerSource = readFileSync(new URL('../controllers/sitemapController.js', import.meta.url), 'utf8');

test('public package controller uses pricing service instead of legacy package data', () => {
  assert.match(controllerSource, /from ['"]\.\.\/services\/pricingService\.js['"]/);

  assert.doesNotMatch(controllerSource, /data\/mockPackages|mockPackages/);
  assert.doesNotMatch(controllerSource, /data\/packages|getPackageBySlug|getPackageRedirectTarget|packageComparisonRows|packageSeoMeta/);
  assert.doesNotMatch(controllerSource, /data\/faqs|packageFaqs/);
  assert.doesNotMatch(controllerSource, /FROM\s+packages\b/i);

  assert.match(controllerSource, /pricingService\.getPackagesForOverview\(/);
  assert.match(controllerSource, /pricingService\.getPackagesForComparison\(/);
  assert.match(controllerSource, /pricingService\.getPackageComparisonRows\(/);
  assert.match(controllerSource, /pricingService\.getGlobalPricingNotes\(['"]packages['"]\)/);
  assert.match(controllerSource, /pricingService\.getPackageWithDetailsBySlug\(slug\)/);
  assert.match(controllerSource, /pricingService\.getPackageRedirectByOldPath\(/);
  assert.match(controllerSource, /pricingService\.getPackageFaqs\([^)]*schemaOnly:\s*true/s);
});

test('package overview template renders prices and comparison data from DB variables', () => {
  assert.doesNotMatch(packagesListTemplate, /schemaPackageFallbacks|fallbackFeatures|packageComparisonRows/);
  assert.doesNotMatch(packagesListTemplate, /Start\s+799|Business\s+1\.499|Wachstum\s+2\.499|ab\s+3\.500\s*€/);

  assert.match(packagesListTemplate, /lowestPriceLabel/);
  assert.match(packagesListTemplate, /overviewFaqs/);
  assert.match(packagesListTemplate, /globalNotes/);
  assert.match(packagesListTemplate, /comparisonPackages/);
  assert.match(packagesListTemplate, /row\.valuesByPackage/);
  assert.match(packagesListTemplate, /pkg\.priceLabel/);
});

test('package overview comparison price row uses current package prices instead of stored static values', () => {
  assert.match(controllerSource, /row\.rowKey === ['"]price['"]/);
  assert.match(controllerSource, /dynamicPriceMap/);
  assert.match(controllerSource, /pkg\.priceLabel/);
  assert.match(controllerSource, /withComparisonValueMap\(comparisonRowsRaw,\s*comparisonPackages,\s*isEn\)/);
});

test('package overview hero image frame matches the visible hero content height on desktop', () => {
  assert.match(packagesListTemplate, /<section class="packages-hero unified-hero" data-reveal-immediate>[\s\S]*?<div class="hero-copy unified-hero__copy">[\s\S]*?<nav class="unified-hero__breadcrumbs"[\s\S]*?<div class="hero-actions unified-hero__actions home-hero-reveal home-hero-reveal--actions animate-on-scroll">/);
  assert.match(packagesListTemplate, /<div class="hero-visual" aria-hidden="true">[\s\S]*?<div class="hero-image-frame unified-hero__media-frame">/);
  assert.match(packageListCss, /@media\s*\(min-width:\s*993px\)\s*\{[\s\S]*?\.packages-page\s+\.packages-hero\.unified-hero\s+\.hero-grid\s*\{[\s\S]*?align-items:\s*stretch;/);
  assert.match(packageListCss, /@media\s*\(min-width:\s*993px\)\s*\{[\s\S]*?\.packages-page\s+\.packages-hero\.unified-hero\s+\.hero-copy\s*\{[\s\S]*?align-self:\s*stretch;/);
  assert.match(packageListCss, /\.packages-page\s+\.hero-copy\.kwd-scroll-reveal\s*\{[\s\S]*?opacity:\s*1\s*!important;[\s\S]*?transform:\s*none\s*!important;/);
  assert.match(packageListCss, /\.packages-page\s+\.packages-hero\s+\.hero-grid\.kwd-scroll-reveal[\s\S]*?\{[\s\S]*?opacity:\s*1\s*!important;[\s\S]*?transform:\s*none\s*!important;/);
  assert.match(packageListCss, /\.packages-page\s+\.packages-hero\s+\.hero-image-frame\.kwd-scroll-reveal[\s\S]*?\{[\s\S]*?opacity:\s*1\s*!important;[\s\S]*?transform:\s*none\s*!important;/);
  assert.match(packageListCss, /@media\s*\(min-width:\s*993px\)\s*\{[\s\S]*?\.packages-page\s+\.packages-hero\.unified-hero\s+\.hero-visual\s*\{[\s\S]*?align-items:\s*stretch;[\s\S]*?align-self:\s*stretch;[\s\S]*?display:\s*flex;/);
  assert.match(packageListCss, /@media\s*\(min-width:\s*993px\)\s*\{[\s\S]*?\.packages-page\s+\.packages-hero\.unified-hero\s+\.hero-image-frame\s*\{[\s\S]*?align-self:\s*stretch;[\s\S]*?flex:\s*0\s+1\s+470px;[\s\S]*?height:\s*auto;[\s\S]*?position:\s*relative;[\s\S]*?width:\s*100%;/);
  assert.match(packageListCss, /@media\s*\(min-width:\s*993px\)\s*\{[\s\S]*?\.packages-page\s+\.packages-hero\.unified-hero\s+\.hero-image-frame\s+picture\s*\{[\s\S]*?height:\s*100%;/);
  assert.match(packageListCss, /@media\s*\(min-width:\s*993px\)\s*\{[\s\S]*?\.packages-page\s+\.packages-hero\.unified-hero\s+\.hero-image-frame\s+img\s*\{[\s\S]*?height:\s*100%;[\s\S]*?max-height:\s*none;[\s\S]*?min-height:\s*0;[\s\S]*?object-fit:\s*cover;/);
});

test('package public pages use the shared homepage-style hero text and check icons', () => {
  assert.match(packagesListTemplate, /class="hero-title home-hero-reveal home-hero-reveal--h1 animate-on-scroll"/);
  assert.match(packagesListTemplate, /<section class="packages-hero unified-hero" data-reveal-immediate>/);
  assert.match(packagesListTemplate, /class="hero-subtitle unified-hero__lead home-hero-reveal home-hero-reveal--support animate-on-scroll"/);
  assert.match(packagesListTemplate, /class="home-hero-reveal home-hero-reveal--bullet animate-on-scroll"[\s\S]*?src="\/images\/icons\/check\.svg"/);
  assert.match(packagesListTemplate, /class="hero-actions unified-hero__actions home-hero-reveal home-hero-reveal--actions animate-on-scroll"/);
  assert.match(packagesListTemplate, /<img class="feature-icon" src="\/images\/icons\/check\.svg"/);
  assert.match(packageDetailTemplate, /class="hero-title home-hero-reveal home-hero-reveal--h1 animate-on-scroll"/);
  assert.match(packageDetailTemplate, /<section class="packages-hero package-detail-hero unified-hero" data-reveal-immediate>/);
  assert.match(packageDetailTemplate, /class="hero-subtitle unified-hero__lead home-hero-reveal home-hero-reveal--support animate-on-scroll"/);
  assert.match(packageDetailTemplate, /class="home-hero-reveal home-hero-reveal--bullet animate-on-scroll"[\s\S]*?src="\/images\/icons\/check\.svg"/);
  assert.match(packageDetailTemplate, /class="hero-price home-hero-reveal home-hero-reveal--price animate-on-scroll"/);
  assert.match(packageDetailTemplate, /<ul class="contact-highlights">[\s\S]*?src="\/images\/icons\/check\.svg"/);
  assert.match(packageListCss, /--packages-accent:\s*#ef4b1c;/);
  assert.match(packageListCss, /--packages-muted:\s*#536173;/);
  assert.match(packageListCss, /\.packages-page\s+\.hero-title\s*\{[\s\S]*?font-size:\s*clamp\(3\.15rem,\s*4\.5vw,\s*4\.7rem\);[\s\S]*?line-height:\s*\.98;/);
  assert.match(packageListCss, /\.packages-page\s+\.hero-subtitle\s*\{[\s\S]*?font-size:\s*clamp\(1\.05rem,\s*1\.5vw,\s*1\.24rem\);[\s\S]*?font-weight:\s*600;/);
  assert.match(packageListCss, /\.packages-page\s+\.hero-highlights\s*\{[\s\S]*?font-size:\s*clamp\(\.98rem,\s*1\.25vw,\s*1\.1rem\);[\s\S]*?font-weight:\s*700;/);
  assert.match(packageListCss, /\.packages-page\s+\.hero-highlights img\s*\{[\s\S]*?height:\s*26px;[\s\S]*?width:\s*26px;/);
  assert.match(packageListCss, /\.packages-page\s+\.packages-hero \.home-hero-reveal\.animate-on-scroll\s*\{[\s\S]*?transition-delay:\s*var\(--home-hero-reveal-delay,\s*0ms\);/);
  assert.match(packageListCss, /\.packages-page\s+\.packages-hero \.home-hero-reveal--support\s*\{[\s\S]*?--home-hero-reveal-delay:\s*180ms;/);
  assert.match(packageListCss, /\.packages-page\s+\.packages-hero \.home-hero-reveal--actions\s*\{[\s\S]*?--home-hero-reveal-delay:\s*620ms;/);
  assert.match(packageListCss, /\.packages-page\s+\.packages-hero \.home-hero-reveal--price\s*\{[\s\S]*?--home-hero-reveal-delay:\s*620ms;/);
  assert.match(packageListCss, /\.packages-page\s+\.package-features\s*\{[\s\S]*?font-weight:\s*700;/);
  assert.match(packageDetailCss, /\.package-detail-page\s+\.contact-highlights img\s*\{[\s\S]*?height:\s*26px;[\s\S]*?width:\s*26px;/);
  assert.match(packageDetailCss, /\.packages-page\.package-detail-page\s+\.package-detail-hero\.unified-hero :is\(\.hero-title,\s*\.hero-subtitle,\s*\.hero-highlights span\)\s*\{[\s\S]*?hyphens:\s*none\s*!important;/);
  assert.match(packageDetailCss, /\.packages-page\.package-detail-page\s+\.package-detail-hero\.unified-hero\s+\.hero-title\s*\{[\s\S]*?font-size:\s*clamp\(2\.75rem,\s*4vw,\s*4\.2rem\)\s*!important;/);
});

test('package detail template renders package content from DB details without raw text output', () => {
  assert.doesNotMatch(packageDetailTemplate, /packagePriceSummary|translatedDetailEntries/);
  assert.doesNotMatch(packageDetailTemplate, /Start\s+ab\s+799|Business\s+ab\s+1\.499|Wachstum\s+ab\s+2\.499|Individuell\s+ab\s+3\.500/);
  assert.doesNotMatch(packageDetailTemplate, /<%-\s*text\s*%>/);

  assert.match(packageDetailTemplate, /pack\.features/);
  assert.match(packageDetailTemplate, /pack\.notIncluded/);
  assert.match(packageDetailTemplate, /pack\.useCases/);
  assert.match(packageDetailTemplate, /pack\.faqs/);
  assert.match(packageDetailTemplate, /pack\.priceLabel/);
});

test('package detail compare buttons jump directly to the package comparison table', () => {
  assert.match(packageDetailTemplate, /const overviewComparePath = overviewPath \+ '#vergleich'/);
  assert.match(packageDetailTemplate, /href="<%= overviewComparePath %>"[\s\S]*package_detail_hero_compare_/);
  assert.match(packageDetailTemplate, /href="<%= overviewComparePath %>"[\s\S]*package_detail_mid_compare_/);
});

test('package detail hero places primary actions inside the price container', () => {
  assert.doesNotMatch(packageDetailTemplate, /<div class="hero-visual" aria-hidden="true">/);
  assert.match(
    packageDetailTemplate,
    /<div class="hero-price home-hero-reveal home-hero-reveal--price animate-on-scroll">[\s\S]*?<div class="hero-price-copy">[\s\S]*?<span class="price-amount">[\s\S]*?priceBreakMatch[\s\S]*?<div class="hero-actions unified-hero__actions">[\s\S]*?package_detail_hero_contact_/
  );
  assert.doesNotMatch(
    packageDetailTemplate,
    /<div class="hero-visual">[\s\S]*?<div class="hero-actions unified-hero__actions">[\s\S]*?package_detail_hero_contact_/
  );
});

test('package detail custom effort price breaks after the euro amount without unescaped DB HTML', () => {
  assert.match(packageDetailTemplate, /const priceDisplayText = String\(priceDisplay \|\| ''\)/);
  assert.match(packageDetailTemplate, /const priceBreakMatch = priceDisplayText\.match\(/);
  assert.match(packageDetailTemplate, /<%= priceBreakMatch\[1\] %><br><span class="price-amount__suffix"><%= priceBreakMatch\[2\] %><\/span>/);
  assert.match(packageDetailCss, /\.package-detail-page\s+\.hero-price\s+\.price-amount__suffix\s*\{/);
  assert.doesNotMatch(packageDetailTemplate, /<%-\s*priceDisplay\s*%>/);
});

test('package detail overview section centers intro text and stacks overview cards below it', () => {
  assert.match(packageDetailCss, /\.package-detail-page\s+\.overview-grid\s*\{[\s\S]*?grid-template-columns:\s*1fr;/);
  assert.match(packageDetailCss, /\.package-detail-page\s+\.overview-intro\s*\{[\s\S]*?text-align:\s*center;/);
  assert.match(packageDetailCss, /\.package-detail-page\s+\.overview-card\s*\{[\s\S]*?text-align:\s*center;/);
  assert.doesNotMatch(packageDetailCss, /grid-template-columns:\s*minmax\(320px,\s*0\.95fr\)\s*minmax\(360px,\s*1\.05fr\)/);
});

test('package detail template renders the project process only once', () => {
  assert.match(packageDetailTemplate, /<section class="package-process">/);
  assert.doesNotMatch(packageDetailTemplate, /<section class="package-timeline-detail">/);
  assert.doesNotMatch(packageDetailTemplate, /Zeitplan und Freigabe|Timeline and approval/);
  assert.equal((packageDetailTemplate.match(/processSteps\.forEach/g) || []).length, 1);
});

test('package JSON-LD uses controller-provided FAQ data without static package fallbacks', () => {
  assert.doesNotMatch(seoSchemasSource, /data\/packages|data\/faqs/);
  assert.match(seoSchemasSource, /visibleFaqs/);
  assert.doesNotMatch(seoSchemasSource, /defaultFaq|COMMON_FAQ/);
});

test('package detail sitemap entries are loaded from pricing DB visibility', () => {
  assert.match(sitemapControllerSource, /pricingService/);
  assert.match(sitemapControllerSource, /getVisiblePackages\(/);
  assert.doesNotMatch(sitemapControllerSource, /\/pakete\/basis|\/pakete\/premium/);
});

test('package sitemap response is revalidated so DB visibility changes are not served stale for an hour', () => {
  assert.match(sitemapControllerSource, /Cache-Control/);
  assert.match(sitemapControllerSource, /no-cache,\s*max-age=0,\s*must-revalidate/);
  assert.doesNotMatch(sitemapControllerSource, /max-age=3600/);
});

test('package contact success schema uses the DB canonical path', () => {
  const handleContactSource = controllerSource.slice(controllerSource.indexOf('export async function handleContact'));

  assert.match(handleContactSource, /const packageCanonicalPath = pack\.canonicalPath \|\| `\/pakete\/\$\{slug\}`/);
  assert.match(handleContactSource, /url:\s*`\$\{baseUrl\}\$\{isEn \? '\/en' : ''\}\$\{packageCanonicalPath\}`/);
});
