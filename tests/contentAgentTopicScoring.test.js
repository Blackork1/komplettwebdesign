import test from 'node:test';
import assert from 'node:assert/strict';
import { CONTENT_AGENT_LINKS } from '../data/contentAgentLinks.js';
import { calculateCannibalizationRisk } from '../services/contentAgent/cannibalizationService.js';
import { buildSiteInventory } from '../services/contentAgent/siteInventoryService.js';
import { scoreTopic, selectBestTopic } from '../services/contentAgent/topicScoringService.js';

test('topic score follows approved weights', () => {
  const scored = scoreTopic({
    businessValue: 9,
    searchOpportunity: 8,
    problemPurchaseProximity: 9,
    internalLinkPotential: 8,
    clusterFit: 8,
    localRelevance: 7,
    cannibalizationRisk: 2
  });
  assert.equal(scored.finalScore, 7.95);
  assert.equal(scored.eligible, true);
});

test('topic score clamps every scoring input to the approved zero-to-ten range', () => {
  const scored = scoreTopic({
    businessValue: 99,
    searchOpportunity: 99,
    problemPurchaseProximity: 99,
    internalLinkPotential: 99,
    clusterFit: 99,
    localRelevance: 99,
    cannibalizationRisk: -99
  });

  assert.equal(scored.finalScore, 10);
  assert.equal(scored.eligible, true);
});

test('best topic selection is stable on ties and excludes risks above four', () => {
  const first = {
    title: 'Erstes Thema',
    businessValue: 9,
    searchOpportunity: 9,
    problemPurchaseProximity: 9,
    internalLinkPotential: 9,
    clusterFit: 9,
    localRelevance: 9,
    cannibalizationRisk: 2
  };
  const tiedSecond = { ...first, title: 'Zweites Thema' };
  const excluded = {
    ...first,
    title: 'Ausgeschlossenes Thema',
    businessValue: 10,
    searchOpportunity: 10,
    cannibalizationRisk: 5
  };

  assert.equal(selectBestTopic([first, tiedSecond, excluded]).title, 'Erstes Thema');
  assert.equal(selectBestTopic([excluded]), null);
});

test('exact normalized slug or primary keyword matches have maximum risk', () => {
  const inventory = {
    blogPosts: [{
      title: 'Webdesign für Ärzte',
      slug: 'webdesign-aerzte',
      primaryKeyword: 'Website für Ärzte',
      contentCluster: 'Ärzte-Webdesign'
    }]
  };

  assert.equal(calculateCannibalizationRisk({ slug: 'WEBDESIGN-AERZTE' }, inventory), 10);
  assert.equal(calculateCannibalizationRisk({ primaryKeyword: 'website für ärzte!' }, inventory), 10);
});

test('same cluster and at least seventy percent normalized title overlap has risk six', () => {
  const inventory = {
    guides: [{
      title: 'Webdesign für Ärzte: Kosten und Local SEO im Überblick',
      slug: 'bestehender-ratgeber',
      contentCluster: 'Lokale Sichtbarkeit'
    }]
  };
  const candidate = {
    title: 'WEBDESIGN für ÄRZTE – mit klaren Kosten und starkem Local SEO!',
    slug: 'neuer-ratgeber',
    contentCluster: 'lokale sichtbarkeit'
  };

  assert.equal(calculateCannibalizationRisk(candidate, inventory), 6);
});

test('exactly seventy percent title-word overlap reaches the cluster risk threshold', () => {
  const existing = {
    title: 'eins zwei drei vier fünf sechs sieben elf zwölf dreizehn',
    slug: 'bestehend',
    contentCluster: 'Technik & SEO'
  };
  const candidate = {
    title: 'EINS, ZWEI, DREI, VIER, FÜNF, SECHS, SIEBEN, acht, neun, zehn',
    slug: 'neu',
    contentCluster: 'technik seo'
  };

  assert.equal(calculateCannibalizationRisk(candidate, [existing]), 6);
});

test('title overlap below seventy percent or from another cluster has no deterministic risk', () => {
  const existing = {
    title: 'Webdesign für Ärzte: Kosten und Local SEO im Überblick',
    slug: 'bestehender-ratgeber',
    contentCluster: 'Lokale Sichtbarkeit'
  };

  assert.equal(calculateCannibalizationRisk({
    title: 'Webdesign für Handwerker mit Referenzen und Anfrageformular',
    slug: 'handwerker-webdesign',
    contentCluster: 'Lokale Sichtbarkeit'
  }, [existing]), 0);
  assert.equal(calculateCannibalizationRisk({
    title: existing.title,
    slug: 'anderer-slug',
    contentCluster: 'Website-Technik'
  }, [existing]), 0);
});

test('site inventory loads sources in parallel and only exposes compact public context', async () => {
  const started = [];
  const pending = new Map();
  const defer = (name, value) => new Promise((resolve) => {
    started.push(name);
    pending.set(name, () => resolve(value));
  });

  const inventoryPromise = buildSiteInventory({
    loadBlogPosts: () => defer('blog', [{
      id: 42,
      title: 'Website für Ärzte',
      slug: 'website-aerzte',
      excerpt: 'Kurz erklärt.',
      category: 'Webdesign',
      description: 'Öffentliche Beschreibung.',
      content: '<h1>Website für Ärzte</h1><h2>Vorteile</h2><p>Interner Text.</p><a href="/kontakt">Kontakt</a><a href="//fremd.example">Extern</a>',
      adminNote: 'Darf nicht in den Modellkontext'
    }]),
    loadGuides: () => defer('guides', [{
      title: 'SEO-Ratgeber für Cafés',
      slug: 'seo-ratgeber-cafes',
      excerpt: 'Lokale Auffindbarkeit verbessern.',
      category: 'SEO',
      description: 'Ein kompakter Ratgeber.',
      content: '<h2>Google-Unternehmensprofil pflegen</h2><a href="/leistungen/local-seo">Local SEO</a><script>internesTracking()</script>',
      reviewerEmail: 'intern@example.com'
    }]),
    loadServicePages: () => defer('services', [{
      id: 7,
      slug: 'local-seo',
      title: 'Local SEO',
      meta_description: 'Besser lokal gefunden werden.',
      hero_title: 'Local SEO für Berliner Betriebe',
      internal_admin_field: 'geheim'
    }]),
    loadIndustries: () => defer('industries', [{
      id: 8,
      slug: 'aerzte',
      name: 'Ärzte',
      title: 'Webdesign für Ärzte',
      description: 'Websites für Praxen.',
      featured: true
    }]),
    getVisiblePackages: () => defer('packages', [{
      id: 9,
      packageKey: 'start',
      name: 'Start',
      slug: 'start',
      canonicalPath: '/pakete/start',
      priceLabel: 'ab 799 €',
      shortDescription: 'Für kleine Websites.',
      pageScope: 'Bis zu fünf Seiten',
      isVisible: true,
      adminNote: 'interne Kalkulation'
    }])
  });

  assert.deepEqual(started, ['blog', 'guides', 'services', 'industries', 'packages']);
  for (const resolve of pending.values()) resolve();
  const inventory = await inventoryPromise;

  assert.deepEqual(inventory.blogPosts, [{
    title: 'Website für Ärzte',
    slug: 'website-aerzte',
    excerpt: 'Kurz erklärt.',
    category: 'Webdesign',
    description: 'Öffentliche Beschreibung.',
    headings: ['Website für Ärzte', 'Vorteile'],
    internalLinks: ['/kontakt']
  }]);
  assert.deepEqual(inventory.guides, [{
    title: 'SEO-Ratgeber für Cafés',
    slug: 'seo-ratgeber-cafes',
    excerpt: 'Lokale Auffindbarkeit verbessern.',
    category: 'SEO',
    description: 'Ein kompakter Ratgeber.',
    headings: ['Google-Unternehmensprofil pflegen'],
    internalLinks: ['/leistungen/local-seo']
  }]);
  assert.deepEqual(inventory.servicePages, [{
    title: 'Local SEO',
    slug: 'local-seo',
    description: 'Besser lokal gefunden werden.',
    headings: ['Local SEO für Berliner Betriebe'],
    internalLinks: []
  }]);
  assert.deepEqual(inventory.industries, [{
    name: 'Ärzte',
    title: 'Webdesign für Ärzte',
    slug: 'aerzte',
    description: 'Websites für Praxen.',
    headings: [],
    internalLinks: []
  }]);
  assert.deepEqual(inventory.packages, [{
    packageKey: 'start',
    name: 'Start',
    slug: 'start',
    canonicalPath: '/pakete/start',
    priceLabel: 'ab 799 €',
    shortDescription: 'Für kleine Websites.',
    pageScope: 'Bis zu fünf Seiten'
  }]);
  assert.deepEqual(inventory.approvedLinks, CONTENT_AGENT_LINKS.map((link) => ({ ...link })));
  assert.equal(JSON.stringify(inventory).includes('Darf nicht'), false);
  assert.equal(JSON.stringify(inventory).includes('interne Kalkulation'), false);
  assert.equal(JSON.stringify(inventory).includes('intern@example.com'), false);
});
