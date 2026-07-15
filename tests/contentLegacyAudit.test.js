import test from 'node:test';
import assert from 'node:assert/strict';

import {
  auditExistingPost,
  evaluateExistingContentReaudit,
  runExistingContentAuditJob
} from '../services/contentAgent/legacyAuditService.js';

test('lokale Auditpolicy klassifiziert blockierende und nichtblockierende Befunde serverseitig', () => {
  const result = auditExistingPost({
    post: {
      id: 1,
      title: 'Preise 2024',
      excerpt: '',
      content: '<p>Das Paket kostet 900 Euro.</p>',
      content_format: 'static_html',
      meta_title: 'Meta',
      meta_description: 'Beschreibung',
      image_alt: 'Alt',
      faq_json: []
    },
    inventory: [],
    currentYear: 2026
  });
  const findings = Object.fromEntries(result.findings.map((finding) => [finding.code, finding]));

  assert.deepEqual(
    { severity: findings.stale_year.severity, blocking: findings.stale_year.blocking },
    { severity: 'warning', blocking: true }
  );
  assert.deepEqual(
    { severity: findings.static_price.severity, blocking: findings.static_price.blocking },
    { severity: 'error', blocking: true }
  );
  assert.equal(findings.missing_internal_links.blocking, false);
});

test('Re-Audit hält unbekannte zukünftige Originalcodes bindend', () => {
  assert.deepEqual(evaluateExistingContentReaudit({
    originalFindings: [{ code: 'unknown_future_code' }],
    currentFindings: []
  }), {
    passed: false,
    unresolvedOriginalCodes: ['unknown_future_code'],
    newBlockingCodes: []
  });
});

test('Re-Audit hält kontextabhängiges Kannibalisierungsrisiko ohne Vergleichsinventar bindend', () => {
  assert.deepEqual(evaluateExistingContentReaudit({
    originalFindings: [{ code: 'cannibalization_risk' }],
    currentFindings: []
  }), {
    passed: false,
    unresolvedOriginalCodes: ['cannibalization_risk'],
    newBlockingCodes: []
  });
});

test('Re-Audit erkennt einen reproduzierbaren verschwundenen Originalcode als gelöst', () => {
  assert.deepEqual(evaluateExistingContentReaudit({
    originalFindings: [{ code: 'missing_meta_title' }],
    currentFindings: []
  }), {
    passed: true,
    unresolvedOriginalCodes: [],
    newBlockingCodes: []
  });
});

test('Re-Audit hält einen reproduzierbaren fortbestehenden Originalcode ungelöst', () => {
  assert.deepEqual(evaluateExistingContentReaudit({
    originalFindings: [{ code: 'missing_meta_title' }],
    currentFindings: [{ code: 'missing_meta_title' }]
  }), {
    passed: false,
    unresolvedOriginalCodes: ['missing_meta_title'],
    newBlockingCodes: []
  });
});

test('Re-Audit blockiert einen neu entstandenen lokalen Blocker trotz angelieferter Entschärfung', () => {
  assert.deepEqual(evaluateExistingContentReaudit({
    originalFindings: [],
    currentFindings: [
      { code: 'static_price', severity: 'info', blocking: false },
      { code: 'missing_internal_links', severity: 'error', blocking: true }
    ]
  }), {
    passed: false,
    unresolvedOriginalCodes: [],
    newBlockingCodes: ['static_price']
  });
});

test('Re-Audit erlaubt einen neuen serverseitig nichtblockierenden lokalen Hinweis', () => {
  assert.deepEqual(evaluateExistingContentReaudit({
    originalFindings: [],
    currentFindings: [{ code: 'missing_internal_links', severity: 'error', blocking: true }]
  }), {
    passed: true,
    unresolvedOriginalCodes: [],
    newBlockingCodes: []
  });
});

test('Bestandsaudit erkennt tatsächliche Ausgabefehler deterministisch und schließt den eigenen Post aus', () => {
  const post = {
    id: 7,
    title: 'Website Kosten 2024',
    slug: 'website-kosten',
    excerpt: '',
    content: '<h1>Website Kosten</h1><p>Nur 999 € für dein Projekt.</p>',
    content_format: 'static_html',
    meta_title: '',
    meta_description: '',
    image_alt: '',
    faq_json: []
  };
  const inventory = [
    post,
    { id: 8, title: 'Was kostet eine Website?', slug: 'website-preise', primary_keyword: 'website kosten' }
  ];

  const first = auditExistingPost({ post, inventory, currentYear: 2026 });
  const second = auditExistingPost({ post, inventory, currentYear: 2026 });
  assert.deepEqual(first, second);
  assert.deepEqual(new Set(first.findings.map(({ code }) => code)), new Set([
    'stale_year',
    'static_price',
    'missing_contact_cta',
    'missing_internal_links',
    'cannibalization_risk'
  ]));
});

test('Bestandsaudit akzeptiert vier strukturierte FAQ und erkennt ausgeschriebene Europreise, aber keine klar historischen Jahre', () => {
  const result = auditExistingPost({
    post: {
      id: 1, title: 'Unser Betrieb', slug: 'betrieb', excerpt: 'Seit 1999 in Berlin',
      content: '<p>Von 1999 bis 2005 entstand unser Standort. Das Paket kostet 900 Euro.</p><a href="/kontakt">Kontakt</a>',
      content_format: 'legacy_ejs', meta_title: 'Meta', meta_description: 'Beschreibung', image_alt: 'Alt',
      faq_json: Array.from({ length: 4 }, (_, index) => ({ question: `Frage ${index}?`, answer: 'Antwort' }))
    },
    inventory: [{ url: '/kontakt' }],
    currentYear: 2026
  });
  const codes = result.findings.map(({ code }) => code);
  assert.equal(codes.includes('missing_faq'), false);
  assert.equal(codes.includes('missing_structured_faq'), false);
  assert.ok(codes.includes('static_price'));
  assert.equal(codes.includes('stale_year'), false);
});

test('Bestandsaudit bewertet bei Legacyartikeln die öffentliche Ausgabe statt leerer optionaler Datenbankfelder', () => {
  const inlineFaq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: Array.from({ length: 4 }, (_, index) => ({
      '@type': 'Question',
      name: `Frage ${index + 1}?`,
      acceptedAnswer: { '@type': 'Answer', text: `Antwort ${index + 1}.` }
    }))
  };
  const result = auditExistingPost({
    post: {
      id: 7,
      title: 'Full-Service Webdesign Berlin',
      slug: 'full-service-webdesign-in-berlin',
      excerpt: 'Webdesign für Berliner Unternehmen.',
      content: [
        '<h1>Überschrift im Legacyinhalt</h1>',
        '<img src="/uploads/beispiel.webp" alt="Webdesign auf einem Laptop">',
        '<h2>Häufige Fragen</h2>',
        ...inlineFaq.mainEntity.map((item) => `<h3>${item.name}</h3><p>${item.acceptedAnswer.text}</p>`),
        `<script type="application/ld+json">${JSON.stringify(inlineFaq)}</script>`,
        '<a href="/kontakt">Kontakt aufnehmen</a>'
      ].join(''),
      content_format: 'legacy_ejs',
      meta_title: '',
      meta_description: 'Beschreibung',
      image_url: '/uploads/hero.webp',
      image_alt: '',
      faq_json: []
    },
    inventory: [{ url: '/kontakt' }],
    currentYear: 2026
  });
  const codes = result.findings.map(({ code }) => code);

  assert.equal(codes.includes('duplicate_h1'), false);
  assert.equal(codes.includes('missing_meta_title'), false);
  assert.equal(codes.includes('missing_image_alt'), false);
  assert.equal(codes.includes('missing_faq'), false);
  assert.equal(codes.includes('missing_structured_faq'), false);
});

test('Bestandsaudit meldet nur tatsächlich fehlende Bild-Alt-Attribute und nicht den Hero-Fallback', () => {
  const base = {
    id: 8,
    title: 'Webdesign Berlin',
    slug: 'webdesign-berlin',
    excerpt: '',
    content_format: 'legacy_ejs',
    meta_title: '',
    meta_description: 'Beschreibung',
    image_url: '/uploads/hero.webp',
    image_alt: '',
    faq_json: []
  };
  const valid = auditExistingPost({
    post: { ...base, content: '<img src="/uploads/dekorativ.webp" alt=""><a href="/kontakt">Kontakt</a>' },
    inventory: [{ url: '/kontakt' }]
  });
  const invalid = auditExistingPost({
    post: { ...base, content: '<img src="/uploads/inhalt.webp"><a href="/kontakt">Kontakt</a>' },
    inventory: [{ url: '/kontakt' }]
  });

  assert.equal(valid.findings.some(({ code }) => code === 'missing_image_alt'), false);
  assert.equal(invalid.findings.some(({ code }) => code === 'missing_image_alt'), true);
});

test('Bestandsaudit meldet sichtbare FAQ nur dann, wenn strukturierte FAQ-Daten tatsächlich fehlen', () => {
  const result = auditExistingPost({
    post: {
      id: 9,
      title: 'Fragen zum Webdesign',
      slug: 'fragen-zum-webdesign',
      excerpt: '',
      content: '<h2>Häufige Fragen</h2><h3>Was kostet eine Website?</h3><p>Das hängt vom Umfang ab.</p><a href="/kontakt">Kontakt</a>',
      content_format: 'legacy_ejs',
      meta_title: '',
      meta_description: 'Beschreibung',
      image_alt: '',
      faq_json: []
    },
    inventory: [{ url: '/kontakt' }]
  });

  assert.equal(result.findings.some(({ code }) => code === 'missing_faq'), false);
  assert.equal(result.findings.some(({ code }) => code === 'missing_structured_faq'), true);
});

test('Jahresprüfung ignoriert Gründung und abgeschlossene Bereiche, meldet aber alte Preise, Fristen und Versionen', () => {
  const base = {
    id: 20, title: 'Historie', slug: 'historie', excerpt: '', content_format: 'legacy_ejs',
    meta_title: 'Meta', meta_description: 'Beschreibung', image_alt: 'Alt',
    faq_json: Array.from({ length: 5 }, (_, index) => ({ question: `Frage ${index}?`, answer: 'Antwort' }))
  };
  for (const content of ['<p>1999 gegründet.</p>', '<p>Gegründet 1999.</p>', '<p>Seit 1999.</p>', '<p>1999-2005.</p>', '<p>1999–2005.</p>']) {
    const result = auditExistingPost({ post: { ...base, content }, inventory: [], currentYear: 2026 });
    assert.equal(result.findings.some(({ code }) => code === 'stale_year'), false, content);
  }
  for (const content of ['<p>Preise 2024</p>', '<p>Aktuell 2024</p>', '<p>Frist bis 2024</p>', '<p>Version 2024</p>']) {
    const result = auditExistingPost({ post: { ...base, content }, inventory: [], currentYear: 2026 });
    assert.ok(result.findings.some(({ code }) => code === 'stale_year'), content);
  }
});

test('Jahresprüfung behandelt eindeutig bezeichnete Vorjahresartikel nicht als veraltete Aussage', () => {
  const result = auditExistingPost({
    post: {
      id: 21,
      title: 'Website-Kosten aktuell einordnen',
      slug: 'website-kosten-aktuell',
      excerpt: '',
      content: [
        '<p>Wenn du die Ausgangsbasis aus dem Vorjahr lesen möchtest, ',
        '<a href="/blog/website-kosten-2025-einfach-erklaert">Website-Kosten 2025 einfach erklärt</a>.</p>',
        '<h3>Website-Kosten 2025 einfach erklärt</h3>',
        '<p>Der passende Vorjahresbeitrag zeigt die damalige Ausgangslage.</p>'
      ].join(''),
      content_format: 'legacy_ejs',
      meta_title: 'Meta',
      meta_description: 'Beschreibung',
      image_alt: 'Alt',
      faq_json: []
    },
    inventory: [{ url: '/blog/website-kosten-2025-einfach-erklaert' }],
    currentYear: 2026
  });

  assert.equal(result.findings.some(({ code }) => code === 'stale_year'), false);
});

test('Bestandsaudit normalisiert vertrauenswürdige Links und meldet unbekannte sowie unsichere Ziele begrenzt', () => {
  const result = auditExistingPost({
    post: {
      id: 1, title: 'Links 2025', slug: 'links', excerpt: '',
      content: '<a href="/kontakt?quelle=blog#formular">Kontakt</a><a href="/leistungen/seo/?x=1">SEO</a><a href="/nicht-da">Unbekannt</a><a href="//evil.example/path">Unsicher</a>',
      content_format: 'static_html', meta_title: 'Meta', meta_description: 'Beschreibung', image_alt: 'Alt', faq_json: Array.from({ length: 5 }, (_, index) => ({ question: `Frage ${index}?`, answer: 'Antwort' }))
    },
    inventory: [{ url: '/kontakt' }, { url: '/leistungen/seo' }],
    currentYear: 2026
  });
  const byCode = Object.fromEntries(result.findings.map((item) => [item.code, item]));
  assert.equal(byCode.missing_contact_cta, undefined);
  assert.equal(byCode.missing_internal_links, undefined);
  assert.deepEqual(byCode.unknown_internal_link.hrefs, ['/nicht-da']);
  assert.deepEqual(byCode.broken_internal_link.hrefs, ['//evil.example/path']);
});

test('Bestandsaudit akzeptiert vorhandene Sprungziele und meldet nur fehlende Fragmente', () => {
  const result = auditExistingPost({
    post: {
      id: 1, title: 'Inhaltsverzeichnis', slug: 'inhaltsverzeichnis', excerpt: '',
      content: '<nav><a href="#abschnitt-1">Abschnitt 1</a><a href="#fehlt">Fehlt</a></nav><h2 id="abschnitt-1">Abschnitt 1</h2><a href="/kontakt">Kontakt</a>',
      content_format: 'legacy_ejs', meta_title: 'Meta', meta_description: 'Beschreibung',
      image_alt: 'Alt', faq_json: []
    },
    inventory: [{ url: '/kontakt' }],
    currentYear: 2026
  });
  const broken = result.findings.find(({ code }) => code === 'broken_internal_link');

  assert.deepEqual(broken.hrefs, ['#fehlt']);
  assert.equal(result.findings.some(({ code }) => code === 'unknown_internal_link'), false);
});

test('Auditjob bleibt lokal, idempotent pro Job/Post/Typ und verändert keine Posts', async () => {
  const persisted = [];
  const uniqueAudits = new Map();
  let postWrites = 0;
  const leaseChecks = [];
  const result = await runExistingContentAuditJob({
    claim: { id: 41 },
    run: { id: 51 },
    currentYear: 2026,
    leaseGuard: async () => leaseChecks.push('lease')
  }, {
    auditRepository: {
      listPublishedPosts: async () => [{
        id: 7, title: 'Titel', slug: 'titel', excerpt: '', content: '<p>Text</p>',
        content_format: 'legacy_ejs', meta_title: '', meta_description: '', image_alt: '', faq_json: []
      }],
      createAuditIdempotent: async (input) => {
        persisted.push(input);
        const key = `${input.jobId}:${input.postId}:${input.auditType}`;
        if (!uniqueAudits.has(key)) uniqueAudits.set(key, { id: uniqueAudits.size + 1, ...input });
        return uniqueAudits.get(key);
      },
      updatePost: async () => { postWrites += 1; }
    }
  });

  await runExistingContentAuditJob({
    claim: { id: 41 }, run: { id: 51 }, currentYear: 2026
  }, {
    auditRepository: {
      listPublishedPosts: async () => [{
        id: 7, title: 'Titel', slug: 'titel', excerpt: '', content: '<p>Text</p>',
        content_format: 'legacy_ejs', meta_title: '', meta_description: '', image_alt: '', faq_json: []
      }],
      createAuditIdempotent: async (input) => {
        const key = `${input.jobId}:${input.postId}:${input.auditType}`;
        if (!uniqueAudits.has(key)) uniqueAudits.set(key, { id: uniqueAudits.size + 1, ...input });
        return uniqueAudits.get(key);
      }
    }
  });

  assert.equal(result.status, 'completed');
  assert.equal(postWrites, 0);
  assert.equal(persisted.length, 1);
  assert.equal(persisted[0].jobId, 41);
  assert.equal(persisted[0].runId, 51);
  assert.equal(persisted[0].postId, 7);
  assert.equal(typeof persisted[0].auditType, 'string');
  assert.equal(uniqueAudits.size, 1);
  assert.ok(leaseChecks.length >= 2);
});
