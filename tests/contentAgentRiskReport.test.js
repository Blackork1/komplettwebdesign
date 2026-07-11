import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { renderFile } from 'ejs';

import { buildFocusedRiskReport } from '../services/contentAgent/riskReportService.js';

const riskChecklistPath = fileURLToPath(
  new URL('../views/admin/contentAgent/_riskChecklist.ejs', import.meta.url)
);

test('Risikobericht nennt echten Abschnitt, Ausschnitt und konkrete Prüfung', () => {
  const report = buildFocusedRiskReport({
    article: {
      contentHtml: '<section><h2>Datenschutz und Cookies</h2><p>Alle Cookies benötigen 2026 eine Einwilligung.</p></section>',
      risk: { privacyClaims: true, currentClaims: true }
    },
    review: {
      issues: [{
        code: 'privacy_claim',
        severity: 'warning',
        message: 'Datenschutzaussage prüfen.',
        repairInstruction: 'Aktuelle Quelle prüfen.',
        blocking: true,
        sectionHeading: 'Datenschutz und Cookies',
        evidenceExcerpt: 'Alle Cookies benötigen 2026 eine Einwilligung.',
        verificationType: 'privacy',
        sourceRequired: true,
        autoPublishBlocking: true
      }]
    },
    validation: { issues: [] },
    sources: []
  });

  assert.equal(report.blocked, true);
  assert.equal(report.items[0].section, 'Datenschutz und Cookies');
  assert.equal(report.items[0].excerpt, 'Alle Cookies benötigen 2026 eine Einwilligung.');
  assert.equal(report.items[0].anchor, 'pruefung-datenschutz-und-cookies');
  assert.equal(report.items[0].instruction, 'Aktuelle Quelle prüfen.');
  assert.equal(report.items[0].verificationType, 'privacy');
  assert.equal(report.items[0].sourceRequired, true);
  assert.equal(report.items[0].blocking, true);
});

test('deterministische Artikel-Riskflags ohne Modellfundstelle werden einzeln sichtbar und blockierend', () => {
  const report = buildFocusedRiskReport({
    article: {
      contentHtml: '<h2>Einordnung</h2><p>Allgemeiner Text.</p>',
      risk: {
        currentClaims: true,
        legalClaims: false,
        privacyClaims: false,
        softwareVersionClaims: true,
        staticPrices: false,
        experimentalClaim: true
      }
    },
    review: { issues: [] },
    validation: { issues: [] }
  });

  assert.deepEqual(report.riskFlags, [
    'currentClaims',
    'softwareVersionClaims',
    'experimentalClaim'
  ]);
  assert.equal(report.items.length, 3);
  assert.equal(report.items.every((item) => item.blocking), true);
  assert.equal(report.items.every((item) => item.section === 'Gesamter Artikel'), true);
  assert.equal(report.items.some((item) => /Aktualität|zeitbezogen/i.test(item.instruction)), true);
  assert.equal(report.items.some((item) => /Softwareversion/i.test(item.instruction)), true);
  assert.equal(report.items.some((item) => /experimental claim/i.test(item.instruction)), true);
});

test('eine echte Modellfundstelle übernimmt den deterministischen Blocker ohne doppelten Risikopunkt', () => {
  const report = buildFocusedRiskReport({
    article: {
      contentHtml: '<h2>Datenschutz</h2><p>Die Aussage muss geprüft werden.</p>',
      risk: { privacyClaims: true }
    },
    review: {
      issues: [{
        code: 'privacy_claim',
        severity: 'warning',
        message: 'Datenschutz prüfen.',
        repairInstruction: 'Datenschutzquelle prüfen.',
        blocking: false,
        sectionHeading: 'Datenschutz',
        evidenceExcerpt: 'Die Aussage muss geprüft werden.',
        verificationType: 'privacy'
      }]
    }
  });

  assert.equal(report.items.length, 1);
  assert.equal(report.items[0].blocking, true);
  assert.equal(report.items[0].sourceRequired, true);
});

test('doppelte Überschriften und deutsche Umlaute erhalten stabile eindeutige Abschnittsanker', () => {
  const report = buildFocusedRiskReport({
    article: {
      contentHtml: [
        '<h2>Über Größe &amp; Ästhetik</h2><p>Erste Fundstelle.</p>',
        '<h2>Über Größe &amp; Ästhetik</h2><p>Zweite Fundstelle.</p>'
      ].join('')
    },
    review: {
      issues: [
        {
          code: 'first',
          message: 'Erste Aussage prüfen.',
          repairInstruction: 'Erste Fundstelle prüfen.',
          sectionHeading: 'Über Größe & Ästhetik',
          evidenceExcerpt: 'Erste Fundstelle.'
        },
        {
          code: 'second',
          message: 'Zweite Aussage prüfen.',
          repairInstruction: 'Zweite Fundstelle prüfen.',
          sectionHeading: 'Über Größe & Ästhetik',
          evidenceExcerpt: 'Zweite Fundstelle.'
        }
      ]
    }
  });

  assert.deepEqual(report.items.map(({ anchor }) => anchor), [
    'pruefung-ueber-groesse-und-aesthetik',
    'pruefung-ueber-groesse-und-aesthetik-2'
  ]);
});

test('abweichende Validation-Issues sowie fehlende oder ungültige Issue-Felder bleiben verständlich', () => {
  const report = buildFocusedRiskReport({
    article: { contentHtml: '<h2>Qualität</h2><p>Zu prüfender Inhalt.</p>' },
    review: {
      issues: [
        null,
        { code: 42, severity: 'fatal', message: '', repairInstruction: '', blocking: 'ja' }
      ]
    },
    validation: {
      issues: [{ code: 'faq_mismatch', message: 'Sichtbare FAQ und FAQ-JSON stimmen nicht überein.', path: ['faqJson'] }]
    }
  });

  assert.equal(report.items.length, 3);
  assert.equal(report.items.every((item) => typeof item.code === 'string' && item.code.length > 0), true);
  assert.equal(report.items.every((item) => ['info', 'warning', 'error'].includes(item.severity)), true);
  assert.equal(report.items.every((item) => typeof item.instruction === 'string' && item.instruction.length > 0), true);
  const validationItem = report.items.find(({ code }) => code === 'faq_mismatch');
  assert.equal(validationItem.instruction, 'Sichtbare FAQ und FAQ-JSON stimmen nicht überein.');
  assert.equal(validationItem.blocking, true);
});

test('Quellenanzahl und leerer Bericht sind deterministisch', () => {
  const report = buildFocusedRiskReport({
    sources: [
      { title: 'Quelle A', url: 'https://example.test/a' },
      { title: 'Quelle B', url: 'https://example.test/b' }
    ]
  });
  const empty = buildFocusedRiskReport({ sources: 'keine Liste' });

  assert.equal(report.sourceCount, 2);
  assert.deepEqual(report.items, []);
  assert.equal(report.blocked, false);
  assert.equal(empty.sourceCount, 0);
  assert.deepEqual(empty.riskFlags, []);
});

test('Prüflisten-Partial escaped alle dynamischen Texte und verwendet nur Serveranker', async () => {
  const report = buildFocusedRiskReport({
    article: {
      contentHtml: '<h2>&lt;script&gt;abschnitt&lt;/script&gt;</h2><p>&lt;img src=x onerror=alert(1)&gt;</p>'
    },
    review: {
      issues: [{
        code: '<script>code</script>',
        severity: 'error',
        message: '<script>meldung</script>',
        repairInstruction: '<img src=x onerror=alert(2)>',
        sectionHeading: '<script>abschnitt</script>',
        evidenceExcerpt: '<img src=x onerror=alert(1)>',
        verificationType: 'source',
        sourceRequired: true,
        autoPublishBlocking: true,
        anchor: 'modell-id-darf-nicht-verwendet-werden'
      }]
    }
  });
  const html = await renderFile(riskChecklistPath, { riskReview: report });

  assert.match(html, /href="#pruefung-script-abschnitt-script"/);
  assert.match(html, /&lt;script&gt;abschnitt&lt;\/script&gt;/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(html, /&lt;img src=x onerror=alert\(2\)&gt;/);
  assert.doesNotMatch(html, /<script>|<img|modell-id-darf-nicht-verwendet-werden/);
});

test('Prüflisten-Partial rendert ohne Bericht einen sicheren Leerzustand', async () => {
  const html = await renderFile(riskChecklistPath, {});

  assert.equal(html.trim(), '');
});
