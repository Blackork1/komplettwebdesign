import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const homepageTemplate = readFileSync(new URL('../views/index.ejs', import.meta.url), 'utf8');
const homeCss = readFileSync(new URL('../public/home.css', import.meta.url), 'utf8');
const heroBridgePartial = readFileSync(new URL('../views/partials/hero-highlight-marquee.ejs', import.meta.url), 'utf8');
const homeHighlightsData = readFileSync(new URL('../data/homeHighlights.js', import.meta.url), 'utf8');
const homepage = `${homepageTemplate}\n${homeCss}\n${heroBridgePartial}\n${homeHighlightsData}`;
const controller = readFileSync(new URL('../controllers/mainController.js', import.meta.url), 'utf8');
const slideOnScroll = readFileSync(new URL('../public/js/slideOnScroll.js', import.meta.url), 'utf8');

function indexOfRequired(source, needle) {
  const index = source.indexOf(needle);
  assert.notEqual(index, -1, `Expected to find ${needle}`);
  return index;
}

test('homepage prompt 3 renders the requested guided section order', () => {
  const heroStart = indexOfRequired(homepageTemplate, '<section class="hero hero-main" id="hero">');
  const heroBridgeInclude = indexOfRequired(homepageTemplate, "include('partials/hero-highlight-marquee'");
  const heroClose = homepageTemplate.indexOf('</section>', heroStart);
  assert.ok(heroBridgeInclude > heroStart, 'hero bridge should be rendered after the hero starts');
  assert.ok(heroBridgeInclude < heroClose, 'hero bridge should close the hero from inside the hero section');

  const expectedOrder = [
    'id="hero"',
    "include('partials/hero-highlight-marquee'",
    'id="usp-strip"',
    'id="passt"',
    'id="leistungen"',
    'id="preise"',
    'id="enthalten-optional"',
    'id="technik"',
    'id="ablauf"',
    'id="trust"',
    'id="sichtbarkeit"',
    'id="website-check"',
    'id="faq"',
    'id="cta"'
  ];

  let previous = -1;
  for (const marker of expectedOrder) {
    const current = indexOfRequired(homepage, marker);
    assert.ok(current > previous, `${marker} should appear after the previous homepage section`);
    previous = current;
  }
});

test('homepage prompt 3 keeps pricing usable as a touch and drag slider with working reveal fallback', () => {
  const pricingSection = homepage.match(/<section class="section" id="preise"[\s\S]*?<\/section>/)?.[0] || '';
  assert.ok(pricingSection, 'pricing section should exist');
  assert.match(pricingSection, /data-pricing-slider/);
  assert.match(pricingSection, /home-pricing-track/);
  assert.match(pricingSection, /pricing-card home-pricing-card[\s\S]*?animate-on-scroll/);
  assert.match(homepage, /pointerdown/);
  assert.match(homepage, /scrollLeft/);
  assert.match(slideOnScroll, /data-reveal-immediate/);
  assert.match(slideOnScroll, /closest\('\[data-reveal-immediate\]'\)/);
  assert.doesNotMatch(slideOnScroll, /\?\s*0\.1[\s\S]*:\s*0\.7/);
});

test('homepage prompt 3 design keeps previous visual assets and mobile overflow guards', () => {
  assert.match(homepage, /\/images\/icons\/gift1\.svg/);
  assert.match(homepage, /\/images\/icons\/support1\.svg/);
  assert.match(homepage, /\/images\/code\.webp/);
  assert.match(homepage, /\/images\/seo\.webp/);
  assert.match(homepage, /\/images\/wartung\.webp/);
  assert.match(homepage, /\/images\/home-fit-beratung\.webp/);
  assert.match(homepage, /home-reference-band img\s*{[\s\S]*?aspect-ratio:\s*16 \/ 9/);
  assert.match(homepage, /\/images\/review-bg\.webp/);
  assert.match(homepage, /\.home-page[\s\S]*?overflow-x: hidden/);
  assert.match(homepage, /overflow-wrap: break-word/);
  assert.match(homepage, /hyphens:\s*none/);
  assert.match(homepage, /\.home-pricing-track[\s\S]*?overflow-x: auto/);
  assert.match(homepage, /scroll-snap-type: x mandatory/);
});

test('homepage visual cleanup keeps footer isolated and removes internal placeholder copy', () => {
  const mainClose = indexOfRequired(homepage, '</main>');
  const footerInclude = indexOfRequired(homepage, "include('partials/footer')");
  assert.ok(footerInclude > mainClose, 'footer should render outside the scoped homepage main');

  assert.match(homepage, /\.home-page \.home-hero-showcase__main/);
  assert.match(homepage, /\/images\/home-hero-klarblick-desktop\.webp/);
  assert.match(homepage, /\/images\/home-hero-klarblick-termin-crop\.webp/);
  assert.match(homepage, /\/images\/home-hero-klarblick-mobile-screen\.webp/);
  assert.match(homepage, /\.home-card-grid--centered/);
  assert.match(homepage, /\.home-pricing-card[\s\S]*?min-height/);
  assert.match(homepage, /inner-wrapper text-left animate-on-scroll/);

  assert.doesNotMatch(homepage, /Alter Stil|klarere Angebotslogik|Sekundärer Weg|nicht die Haupt-CTA/i);
});

test('homepage visual polish keeps spacing, slider headings and side navigation readable', () => {
  assert.match(homepage, /#website-check \.hero-ctas\s*{[\s\S]*?margin-top:\s*clamp\(1\.5rem, 3vw, 2rem\)/);
  assert.match(homepage, /\.home-page #website-check \.hero-ctas\s*{[\s\S]*?justify-content:\s*center/);
  assert.match(homepage, /\.home-page \.home-cta-panel \.hero-ctas\s*{[\s\S]*?justify-content:\s*center/);

  assert.match(homepage, /\.home-page \.home-pricing-card\s*{[\s\S]*?flex:\s*0 0 clamp\(340px, 32vw, 360px\)/);
  assert.match(homepage, /\.home-page \.home-pricing-card\s*{[\s\S]*?height:\s*auto[\s\S]*?min-height:\s*0/);
  assert.match(homepage, /\.home-page \.home-pricing-card\s*{[\s\S]*?border:\s*2px solid transparent/);
  assert.match(homepage, /\.home-page \.home-pricing-card\.is-featured\s*{[\s\S]*?border-color:\s*var\(--home-accent\)/);
  assert.match(homepage, /\.home-page \.home-pricing-card h3\s*{[\s\S]*?margin:\s*clamp\(1\.05rem, 1\.6vw, 1\.45rem\) 0 0\.45rem[\s\S]*?padding-top:\s*4px[\s\S]*?text-align:\s*center/);
  assert.match(homepage, /\.home-page \.home-pricing-card \.package-description\s*{[\s\S]*?margin:\s*0\.2rem 0 0\.75rem[\s\S]*?line-height:\s*1\.38/);
  assert.match(homepage, /\.home-page \.home-pricing-card \.price\s*{[\s\S]*?margin:\s*0 0 0\.7rem[\s\S]*?line-height:\s*1/);
  assert.match(homepage, /\.home-page \.home-pricing-card \.features-list\s*{[\s\S]*?gap:\s*0\.42rem[\s\S]*?margin:\s*0 0 0\.85rem/);
  assert.match(homepage, /@supports \(grid-template-rows: subgrid\)\s*{[\s\S]*?\.home-page \.home-pricing-track\s*{[\s\S]*?grid-auto-flow:\s*column[\s\S]*?grid-template-rows:\s*auto auto auto minmax\(0, 1fr\) auto/);
  assert.match(homepage, /@supports \(grid-template-rows: subgrid\)\s*{[\s\S]*?\.home-page \.home-pricing-card\s*{[\s\S]*?display:\s*grid[\s\S]*?grid-template-rows:\s*subgrid/);
  assert.match(homepage, /\.home-page \.home-pricing-card \.p1rem\s*{[\s\S]*?grid-row:\s*2 \/ 6[\s\S]*?grid-template-rows:\s*subgrid/);
  assert.match(homepage, /\.home-page \.home-pricing-card \.price\s*{[\s\S]*?grid-row:\s*2[\s\S]*?align-self:\s*start/);
  assert.doesNotMatch(homepage, /\.home-page \.home-pricing-card\.is-featured h3\s*{/);
  assert.match(homepage, /\.home-page \.home-price-tag\s*{[\s\S]*?position:\s*absolute[\s\S]*?top:\s*1rem[\s\S]*?left:\s*1rem/);

  assert.match(homepage, /body\.home-body \.icon-link\s*{[\s\S]*?color:\s*var\(--home-ink\)/);
  assert.match(homepage, /body\.home-body \.icon-link:is\(:hover, :focus-visible, \.active\)\s*{[\s\S]*?color:\s*var\(--home-accent\)/);
  assert.match(homepage, /buildHomeHeroBridgeHighlights/);
  assert.match(homepage, /views\/partials\/hero-highlight-marquee|hero-highlight-marquee/);
  assert.match(homepage, /class="hero-bridge"/);
  assert.match(homepage, /class="highlight-marquee"/);
  assert.match(homepage, /class="visually-hidden hero-bridge__sr-list"/);
  assert.doesNotMatch(heroBridgePartial, /hero-bridge__content|hero-bridge__eyebrow|hero-bridge__text/);
  assert.doesNotMatch(heroBridgePartial, /Kurz zusammengefasst|Individuelle Websites mit klarer Struktur/);
  assert.match(homepage, /aria-hidden="true"/);
  assert.match(homepage, /\.home-page \.highlight-marquee\s*{[\s\S]*?width:\s*100%[\s\S]*?margin-left:\s*0/);
  assert.match(homepage, /\.home-page \.highlight-chip\s*{[\s\S]*?border-radius:\s*8px/);
  assert.match(homepage, /@keyframes highlight-marquee-scroll/);
  assert.match(homepage, /\.home-page \.highlight-marquee__track\s*{[\s\S]*?animation:\s*highlight-marquee-scroll var\(--highlight-marquee-duration\) linear infinite/);
  assert.match(homepage, /\.home-page \.hero-bridge\s*{[\s\S]*?--highlight-marquee-duration:\s*30s/);
  assert.deepEqual(
    [...homepage.matchAll(/--highlight-marquee-duration:\s*([^;]+);/g)].map((match) => match[1].trim()),
    ['30s']
  );
  assert.match(homepage, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.home-page \.highlight-marquee__group\[aria-hidden="true"\]\s*{[\s\S]*?display:\s*none/);
  assert.match(homepage, /\.home-page #usp-strip\s*{[\s\S]*?background:\s*linear-gradient\(180deg, #f7fafc 0%, #ffffff 100%\)/);
  assert.doesNotMatch(homepage, /\.home-page #usp-strip\s*{[\s\S]*?rgba\(11, 42, 70, 0\.78\)/);
});

test('homepage hero bridge uses safe scoped highlights with dynamic pricing', () => {
  const highlightMatches = homeHighlightsData.match(/key:\s*'/g) || [];
  assert.equal(highlightMatches.length, 15);
  assert.match(homeHighlightsData, /Pakete ab \{\{lowestPackagePriceLabel\}\}/);
  assert.match(homeHighlightsData, /Keine Standard-Templates/);
  assert.match(homeHighlightsData, /Serverseitig gerendertes HTML/);
  assert.match(homeHighlightsData, /Transparente Zusatzleistungen/);
  assert.match(
    homeHighlightsData,
    /key:\s*'performance-goal'[\s\S]*?label:\s*'Schnelle Ladezeiten als Ziel'[\s\S]*?iconClass:\s*'fa-gauge-high'/
  );
  assert.doesNotMatch(homeHighlightsData, /iconClass:\s*'fa-tachometer-alt'/);
  assert.match(controller, /buildHomeHeroBridgeHighlights/);
  assert.match(controller, /lowestPackagePriceLabel:\s*localizedLowestPackagePriceLabel/);
  assert.match(homepageTemplate, /heroBridgeHighlights:\s*homeHeroBridgeHighlights/);

  assert.doesNotMatch(homeHighlightsData, /DSGVO-konform|rechtssicher|Ranking garantiert|garantiert mehr Kunden|alles inklusive|keine versteckten Kosten/i);
});

test('homepage hero uses the final recommended copy and a quieter CTA hierarchy', () => {
  const joined = `${homepage}\n${controller}`;

  assert.match(controller, /seoTitle:\s*'Website erstellen lassen Berlin \| Webdesign ab \{\{lowestPackagePriceLabel\}\}'/);
  assert.match(controller, /Professionelles Webdesign aus Berlin für Selbstständige, kleine Unternehmen und lokale Dienstleister/);
  assert.match(controller, /heroBadge:\s*'Webdesign aus Berlin · ohne Baukasten'/);
  assert.match(controller, /heroTitle:\s*'Website erstellen lassen in Berlin'/);
  assert.match(controller, /heroTitle2:\s*'klar, modern und auf Anfragen optimiert'/);
  assert.match(controller, /heroSubline:\s*'Ich erstelle Websites für Selbstständige, kleine Unternehmen und lokale Dienstleister in Berlin & Brandenburg/);
  assert.match(controller, /heroBullet1:\s*'Maßgeschneidert statt Baukasten oder Template-Look'/);
  assert.match(controller, /heroBullet2:\s*'Klare Pakete ab \{\{lowestPackagePriceLabel\}\} mit transparentem Leistungsumfang'/);
  assert.match(controller, /heroBullet3:\s*'Struktur, Design und Entwicklung mit Fokus auf Kontaktanfragen'/);
  assert.match(controller, /heroCtaSecondary:\s*'Pakete ansehen'/);
  assert.match(controller, /heroTrustNote:\s*'Kostenlose Ersteinschätzung'/);

  assert.match(homepage, /class="home-hero-trust-note home-hero-reveal home-hero-reveal--trust animate-on-scroll"/);
  assert.doesNotMatch(homepage, /heroBadgePackages/);
  assert.doesNotMatch(homepage, /badge text-bg-success/);
  assert.doesNotMatch(joined, /Antwort meist innerhalb von 24 Stunden/);
});

test('homepage prompt 3 copy uses cautious offer, legal and SEO positioning', () => {
  const joined = `${homepage}\n${controller}`;

  assert.match(joined, /Website erstellen lassen in Berlin/i);
  assert.match(joined, /Node\.js/i);
  assert.match(joined, /EJS/i);
  assert.match(joined, /serverseitig/i);
  assert.match(joined, /Keine Standard-Templates|kein Standard-Theme/i);
  assert.match(joined, /Alle Preise verstehen sich gemäß § 19 UStG/i);
  assert.match(joined, /Bestimmte Platzierungen bei Google können nicht garantiert werden/i);
  assert.match(joined, /Die Erstellung oder rechtliche Prüfung .* ist keine Rechtsberatung/i);
  assert.match(joined, /Domain, E-Mail, Hosting, Wartung und Drittanbieter/i);

  assert.doesNotMatch(joined, /ab\s*499|Business\s+ab\s*899|Premium\s+ab\s*1\.499/i);
  assert.doesNotMatch(joined, /rechtssicher|rechtlich abgesichert|DSGVO-konform|rechtskonform/i);
  assert.doesNotMatch(joined, /Buchungssystem\s+(inklusive|enthalten)|Shop optional|Wartung ab 5|garantiert mehr Kunden|Ranking garantiert|alles inklusive|keine versteckten Kosten/i);
});
