import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildExistingPostDiff,
  validateTargetedOptimizationScope,
  revertExistingPostChange
} from '../services/contentAgent/existingPostDiffService.js';

function article(overrides = {}) {
  return {
    contentFormat: 'static_html',
    title: 'Website-Relaunch planen',
    contentHtml: '<section><h2>Planung</h2><p>Alte Fassung.</p></section>',
    faqJson: [],
    ...overrides
  };
}

function words(prefix, count) {
  return Array.from({ length: count }, (_, index) => `${prefix}${index + 1}`).join(' ');
}

test('Diff-IDs entstehen deterministisch auf dem Server und nicht aus Änderungsgründen', () => {
  const before = article();
  const after = article({
    title: 'Website-Relaunch sicher planen',
    contentHtml: '<section><h2>Planung</h2><p>Konkrete neue Fassung.</p></section>'
  });
  const forgedId = 'von-der-ki-vorgegeben';

  const first = buildExistingPostDiff({
    before,
    after,
    reasons: [{
      id: forgedId,
      field: 'title',
      auditCodes: ['title_unspecific'],
      reason: 'Der Nutzen wird konkretisiert.',
      sourceUrls: []
    }]
  });
  const second = buildExistingPostDiff({ before, after, reasons: [] });

  assert.deepEqual(
    first.changes.map(({ id, kind, field, path }) => ({ id, kind, field, path })),
    second.changes.map(({ id, kind, field, path }) => ({ id, kind, field, path }))
  );
  assert.equal(first.changes.length, 2);
  assert.deepEqual(first.changes.map(({ kind }) => kind), ['field', 'html']);
  for (const change of first.changes) {
    assert.match(change.id, /^[0-9a-f]{64}$/);
    assert.notEqual(change.id, forgedId);
    assert.match(change.beforeFingerprint, /^[0-9a-f]{64}$/);
    assert.match(change.afterFingerprint, /^[0-9a-f]{64}$/);
  }
});

test('einfache Felder werden in fester Reihenfolge direkt verglichen und Leerwerte bleiben unterscheidbar', () => {
  const before = article({ title: null, metaTitle: 'Alt', imageAlt: '' });
  const after = article({ title: '', metaTitle: 'Neu', imageAlt: null });
  const diff = buildExistingPostDiff({ before, after, reasons: [] });

  assert.deepEqual(diff.changes.map(({ field }) => field), ['title', 'metaTitle', 'imageAlt']);
  assert.equal(diff.changes[0].before, null);
  assert.equal(diff.changes[0].after, '');
  assert.equal(diff.changes[2].before, '');
  assert.equal(diff.changes[2].after, null);
});

test('FAQ werden über normalisierte Fragen zugeordnet und reine Umordnungen ignoriert', () => {
  const beforeFaq = [
    { question: '  Wie läuft ein Relaunch ab? ', answer: 'Mit einer Bestandsaufnahme.' },
    { question: 'Was kostet die Planung?', answer: 'Das hängt vom Umfang ab.' }
  ];
  const afterFaq = [
    { question: 'Was kostet die Planung?', answer: 'Das hängt vom Umfang ab.' },
    { question: 'Wie   läuft ein Relaunch ab?', answer: 'Mit Audit und Bestandsaufnahme.' }
  ];
  const diff = buildExistingPostDiff({
    before: article({ faqJson: beforeFaq }),
    after: article({ faqJson: afterFaq }),
    reasons: []
  });

  assert.equal(diff.changes.length, 1);
  assert.equal(diff.changes[0].kind, 'faq');
  assert.equal(diff.changes[0].changeType, 'modified');
  assert.equal(diff.changes[0].before.answer, 'Mit einer Bestandsaufnahme.');
  assert.equal(diff.changes[0].after.answer, 'Mit Audit und Bestandsaufnahme.');
  assert.equal(diff.changes[0].revertible, true);
});

test('eine über Normalisierung zugeordnete geänderte FAQ-Frage bleibt als Änderung sichtbar', () => {
  const before = article({ faqJson: [{ question: 'Was kostet ein Relaunch?', answer: 'Das hängt vom Umfang ab.' }] });
  const after = article({ faqJson: [{ question: '  WAS KOSTET EIN RELAUNCH? ', answer: 'Das hängt vom Umfang ab.' }] });
  const diff = buildExistingPostDiff({ before, after, reasons: [] });

  assert.equal(diff.changes.length, 1);
  assert.equal(diff.changes[0].kind, 'faq');
  assert.equal(diff.changes[0].changeType, 'modified');
});

test('hinzugefügte und entfernte FAQ bleiben getrennt und deterministisch', () => {
  const kept = { question: 'Welche Inhalte bleiben?', answer: 'Die Kernaussagen.' };
  const removed = { question: 'Welche Frist gilt?', answer: 'Vier Wochen.' };
  const added = { question: 'Wer prüft das Ergebnis?', answer: 'Die Redaktion.' };
  const input = {
    before: article({ faqJson: [kept, removed] }),
    after: article({ faqJson: [kept, added] }),
    reasons: []
  };

  const first = buildExistingPostDiff(input);
  const second = buildExistingPostDiff(input);
  assert.deepEqual(first, second);
  assert.deepEqual(first.changes.map(({ kind, changeType }) => [kind, changeType]), [
    ['faq', 'removed'],
    ['faq', 'added']
  ]);
  assert.equal(first.changes[0].revertible, false);
  assert.equal(first.changes[1].revertible, true);
});

test('vollständig identische doppelte FAQ werden vor der Zuordnung positionsunabhängig konsumiert', () => {
  const question = 'Wie läuft die Planung?';
  const first = { question, answer: 'Mit einem Audit.' };
  const second = { question, answer: 'Mit einer Zieldefinition.' };
  const diff = buildExistingPostDiff({
    before: article({ faqJson: [first, second] }),
    after: article({ faqJson: [second, first] }),
    reasons: []
  });

  assert.deepEqual(diff.changes, []);
});

test('nach exakter Zuordnung wird ein eindeutiger FAQ-Rest als Modifikation gepaart', () => {
  const question = 'Wie läuft die Planung?';
  const stable = { question, answer: 'Mit einer Zieldefinition.' };
  const beforeChanged = { question, answer: 'Mit einem Audit.' };
  const afterChanged = { question, answer: 'Mit Audit und Bestandsaufnahme.' };
  const diff = buildExistingPostDiff({
    before: article({ faqJson: [beforeChanged, stable] }),
    after: article({ faqJson: [stable, afterChanged] }),
    reasons: []
  });

  assert.equal(diff.changes.length, 1);
  assert.equal(diff.changes[0].changeType, 'modified');
  assert.deepEqual(diff.changes[0].before, beforeChanged);
  assert.deepEqual(diff.changes[0].after, afterChanged);
  assert.equal(diff.changes[0].revertible, true);
});

test('ein eindeutiger FAQ-Rest mit dupliziertem Zielfingerprint bleibt nicht rücknehmbar', () => {
  const question = 'Wie läuft die Planung?';
  const stable = { question, answer: 'Mit einer Zieldefinition.' };
  const diff = buildExistingPostDiff({
    before: article({ faqJson: [
      { question, answer: 'Mit einem Audit.' },
      stable
    ] }),
    after: article({ faqJson: [stable, stable] }),
    reasons: []
  });

  assert.equal(diff.changes.length, 1);
  assert.equal(diff.changes[0].changeType, 'modified');
  assert.equal(diff.changes[0].revertible, false);
});

test('mehrdeutige Reste doppelter FAQ werden konservativ als Add und Remove modelliert', () => {
  const question = 'Wie läuft die Planung?';
  const diff = buildExistingPostDiff({
    before: article({ faqJson: [
      { question, answer: 'Antwort A.' },
      { question, answer: 'Antwort B.' }
    ] }),
    after: article({ faqJson: [
      { question, answer: 'Antwort C.' },
      { question, answer: 'Antwort D.' }
    ] }),
    reasons: []
  });

  assert.deepEqual(diff.changes.map(({ changeType }) => changeType), [
    'removed', 'removed', 'added', 'added'
  ]);
  assert.equal(diff.changes.every(({ revertible }) => revertible === false), true);
});

test('DOM-Diff erkennt geänderte, hinzugefügte und entfernte erlaubte Textblöcke ohne CTA-Unterblöcke doppelt zu zählen', () => {
  const before = article({
    contentHtml: [
      '<section>',
      '<h2>Planung</h2>',
      '<p>Unverändert.</p>',
      '<blockquote>Wird entfernt.</blockquote>',
      '<div class="alert alert-primary" data-track="cta" data-cta-location="blog_early"><p>Alter CTA.</p><a href="/kontakt">Kontakt</a></div>',
      '</section>'
    ].join('')
  });
  const after = article({
    contentHtml: [
      '<section>',
      '<h2>Planung</h2>',
      '<p>Unverändert.</p>',
      '<p>Neu ergänzt.</p>',
      '<div class="alert alert-primary" data-track="cta" data-cta-location="blog_early"><p>Neuer CTA.</p><a href="/kontakt">Kontakt</a></div>',
      '</section>'
    ].join('')
  });

  const diff = buildExistingPostDiff({ before, after, reasons: [] });
  const htmlChanges = diff.changes.filter(({ kind }) => kind === 'html');

  assert.deepEqual(htmlChanges.map(({ changeType }) => changeType), ['added', 'removed', 'modified']);
  assert.deepEqual(htmlChanges.map(({ blockType }) => blockType), ['p', 'blockquote', 'cta']);
  assert.equal(htmlChanges.some(({ before: value, after: next }) => (
    String(value || '').includes('<p>Alter CTA.</p>') && String(next || '').includes('<p>Neuer CTA.</p>')
  )), true);
  assert.equal(htmlChanges.filter(({ blockType }) => blockType === 'p').length, 1);
});

test('der Tausch zweier eindeutiger Absätze wird als nicht einzeln rücknehmbare Verschiebung erkannt', () => {
  const before = article({
    contentHtml: '<section><p>Alpha ist eindeutig.</p><p>Beta ist eindeutig.</p><p>Der Anker bleibt.</p></section>'
  });
  const after = article({
    contentHtml: '<section><p>Beta ist eindeutig.</p><p>Alpha ist eindeutig.</p><p>Der Anker bleibt.</p></section>'
  });
  const diff = buildExistingPostDiff({ before, after, reasons: [] });
  const htmlChanges = diff.changes.filter(({ kind }) => kind === 'html');

  assert.ok(htmlChanges.some(({ changeType }) => changeType === 'moved'));
  assert.equal(htmlChanges.some(({ changeType }) => changeType === 'modified'), false);
  assert.equal(htmlChanges.every(({ revertible }) => revertible === false), true);
  assert.throws(() => revertExistingPostChange({
    snapshot: { revisionVersion: 1, current: after, diff },
    changeId: htmlChanges[0].id,
    expectedVersion: 1
  }), { code: 'CONTENT_REVISION_CHANGE_CONFLICT' });
  assert.equal((after.contentHtml.match(/Alpha ist eindeutig\./g) || []).length, 1);
  assert.equal((after.contentHtml.match(/Beta ist eindeutig\./g) || []).length, 1);
});

test('Verschieben plus Bearbeiten bleibt gekoppelt und darf keinen falschen Zielblock überschreiben', () => {
  const before = article({
    contentHtml: '<section><p>Alpha beschreibt die Planung.</p><p>Beta beschreibt die Prüfung.</p><p>Der Anker bleibt.</p></section>'
  });
  const after = article({
    contentHtml: '<section><p>Beta beschreibt die Prüfung.</p><p>Alpha beschreibt jetzt die konkrete Planung.</p><p>Der Anker bleibt.</p></section>'
  });
  const diff = buildExistingPostDiff({ before, after, reasons: [] });
  const movedAndModified = diff.changes.find(({ changeType }) => changeType === 'moved_modified');

  assert.ok(movedAndModified);
  assert.match(movedAndModified.before, /Alpha beschreibt die Planung/);
  assert.match(movedAndModified.after, /Alpha beschreibt jetzt die konkrete Planung/);
  assert.equal(movedAndModified.revertible, false);
  assert.throws(() => revertExistingPostChange({
    snapshot: { revisionVersion: 1, current: after, diff },
    changeId: movedAndModified.id,
    expectedVersion: 1
  }), { code: 'CONTENT_REVISION_CHANGE_CONFLICT' });
  assert.equal((after.contentHtml.match(/Alpha beschreibt/g) || []).length, 1);
  assert.equal((after.contentHtml.match(/Beta beschreibt/g) || []).length, 1);
});

test('zwei bearbeitete und vertauschte Absätze bleiben trotz gemeinsamer Nachbarschaft nicht rücknehmbar', () => {
  const before = article({
    contentHtml: '<section><p>Alpha beschreibt die Planung.</p><p>Beta beschreibt die Prüfung.</p><p>Der Anker bleibt.</p></section>'
  });
  const after = article({
    contentHtml: '<section><p>Beta beschreibt jetzt die konkrete Prüfung.</p><p>Alpha beschreibt jetzt die konkrete Planung.</p><p>Der Anker bleibt.</p></section>'
  });
  const diff = buildExistingPostDiff({ before, after, reasons: [] });
  const htmlChanges = diff.changes.filter(({ kind }) => kind === 'html');

  assert.equal(htmlChanges.length, 2);
  assert.equal(htmlChanges.every(({ revertible }) => revertible === false), true);
  for (const change of htmlChanges) {
    assert.throws(() => revertExistingPostChange({
      snapshot: { revisionVersion: 1, current: after, diff },
      changeId: change.id,
      expectedVersion: 1
    }), { code: 'CONTENT_REVISION_CHANGE_CONFLICT' });
  }
});

test('stark ähnliche vertauschte Restblöcke zwischen stabilen Ankern dominieren keine Kreuzpaarung', () => {
  const before = article({
    contentHtml: [
      '<section><h2>Stabiler Start</h2>',
      '<p>Die Planung umfasst Audit, Ziele, Inhalte und Freigabe für Bereich Alpha.</p>',
      '<p>Die Planung umfasst Audit, Ziele, Inhalte und Freigabe für Bereich Beta.</p>',
      '<h3>Stabiles Ende</h3></section>'
    ].join('')
  });
  const after = article({
    contentHtml: [
      '<section><h2>Stabiler Start</h2>',
      '<p>Die Planung umfasst Audit, Ziele, Inhalte und konkrete Freigabe für Bereich Beta.</p>',
      '<p>Die Planung umfasst Audit, Ziele, Inhalte und konkrete Freigabe für Bereich Alpha.</p>',
      '<h3>Stabiles Ende</h3></section>'
    ].join('')
  });
  const diff = buildExistingPostDiff({ before, after, reasons: [] });
  const htmlChanges = diff.changes.filter(({ kind }) => kind === 'html');

  assert.equal(htmlChanges.length, 2);
  assert.equal(htmlChanges.every(({ mappingAmbiguous }) => mappingAmbiguous === true), true);
  assert.equal(htmlChanges.every(({ revertible }) => revertible === false), true);
  for (const change of htmlChanges) {
    assert.throws(() => revertExistingPostChange({
      snapshot: { revisionVersion: 1, current: after, diff },
      changeId: change.id,
      expectedVersion: 1
    }), { code: 'CONTENT_REVISION_CHANGE_CONFLICT' });
  }
});

test('verschobene identische Duplikate werden nie als unabhängige rücknehmbare Modifikationen angeboten', () => {
  const before = article({
    contentHtml: '<section><p>Identischer Absatz.</p><p>Identischer Absatz.</p><p>Eindeutiger Anker.</p></section>'
  });
  const after = article({
    contentHtml: '<section><p>Identischer Absatz.</p><p>Eindeutiger Anker.</p><p>Identischer Absatz.</p></section>'
  });
  const diff = buildExistingPostDiff({ before, after, reasons: [] });
  const htmlChanges = diff.changes.filter(({ kind }) => kind === 'html');

  assert.ok(htmlChanges.some(({ changeType }) => changeType === 'moved'));
  assert.equal(htmlChanges.some(({ changeType }) => changeType === 'modified'), false);
  assert.equal(htmlChanges.every(({ revertible }) => revertible === false), true);
  for (const change of htmlChanges) {
    assert.throws(() => revertExistingPostChange({
      snapshot: { revisionVersion: 1, current: after, diff },
      changeId: change.id,
      expectedVersion: 1
    }), { code: 'CONTENT_REVISION_CHANGE_CONFLICT' });
  }
  assert.equal((after.contentHtml.match(/Identischer Absatz\./g) || []).length, 2);
});

test('eine führende Addition vor langen identischen Absätzen erzeugt keine künstliche Verschiebung', () => {
  const duplicate = `<p>${words('identisch-', 60)}</p>`;
  const before = article({ contentHtml: `${duplicate}${duplicate}` });
  const after = article({ contentHtml: `<p>Kurz ergänzt.</p>${duplicate}${duplicate}` });
  const diff = buildExistingPostDiff({ before, after, reasons: [] });

  assert.deepEqual(diff.changes.map(({ changeType }) => changeType), ['added']);
  assert.equal(validateTargetedOptimizationScope({ before, after, diff }).changedBlockRatio, 0);
});

test('eine führende Entfernung vor langen identischen Absätzen erzeugt keine künstliche Verschiebung', () => {
  const duplicate = `<p>${words('identisch-', 60)}</p>`;
  const before = article({ contentHtml: `<p>Kurz entfernt.</p>${duplicate}${duplicate}` });
  const after = article({ contentHtml: `${duplicate}${duplicate}` });
  const diff = buildExistingPostDiff({ before, after, reasons: [] });

  assert.deepEqual(diff.changes.map(({ changeType }) => changeType), ['removed']);
  assert.equal(
    validateTargetedOptimizationScope({ before, after, diff }).changedBlockRatio,
    0.333333
  );
});

test('mehr als 35 Prozent geänderte vorhandene Textblöcke werden abgelehnt', () => {
  const blocks = Array.from({ length: 10 }, (_, index) => `<p>Abschnitt ${index} bleibt gleich.</p>`);
  const changed = blocks.map((block, index) => (
    index < 4 ? `<p>Abschnitt ${index} wurde erneuert.</p>` : block
  ));
  const before = article({ contentHtml: `<section>${blocks.join('')}</section>` });
  const after = article({ contentHtml: `<section>${changed.join('')}</section>` });
  const diff = buildExistingPostDiff({ before, after, reasons: [] });

  assert.deepEqual(validateTargetedOptimizationScope({ before, after, diff }), {
    passed: false,
    code: 'TARGETED_SCOPE_EXCEEDED',
    changedBlockRatio: 0.4,
    wordCountDeltaRatio: 0
  });
});

test('35 Prozent geänderte vorhandene Textblöcke liegen exakt innerhalb der Grenze', () => {
  const blocks = Array.from({ length: 20 }, (_, index) => `<p>Block ${index} hat vier Wörter.</p>`);
  const changed = blocks.map((block, index) => (
    index < 7 ? `<p>Block ${index} hat neue Wörter.</p>` : block
  ));
  const before = article({ contentHtml: blocks.join('') });
  const after = article({ contentHtml: changed.join('') });

  assert.deepEqual(validateTargetedOptimizationScope({
    before,
    after,
    diff: buildExistingPostDiff({ before, after, reasons: [] })
  }), {
    passed: true,
    code: null,
    changedBlockRatio: 0.35,
    wordCountDeltaRatio: 0
  });
});

test('Entfernen eines strukturellen Bootstrap-Wrappers wird unabhängig vom Textumfang abgelehnt', () => {
  const stable = Array.from({ length: 10 }, (_, index) => `<p>Stabiler Inhalt ${index}.</p>`).join('');
  const table = '<table><tbody><tr><td>Leistung</td></tr></tbody></table>';
  const before = article({
    contentHtml: `<section>${stable}<div class="table-responsive">${table}</div></section>`
  });
  const after = article({ contentHtml: `<section>${stable}${table}</section>` });

  assert.deepEqual(validateTargetedOptimizationScope({ before, after }), {
    passed: false,
    code: 'HTML_STRUCTURE_CHANGED',
    changedBlockRatio: 0,
    wordCountDeltaRatio: 0
  });
});

test('Änderungen an freigegebenen Container- und Präsentationsklassen werden vollständig erkannt', async (t) => {
  const cases = [
    {
      name: 'responsiver Container',
      before: '<section><div class="container-sm"><p>Inhalt bleibt.</p></div></section>',
      after: '<section><div class="container-xl"><p>Inhalt bleibt.</p></div></section>'
    },
    {
      name: 'Präsentationsklassen',
      before: '<section><div class="bg-light border rounded p-4"><p>Inhalt bleibt.</p></div></section>',
      after: '<section><div><p>Inhalt bleibt.</p></div></section>'
    },
    {
      name: 'Listengruppe',
      before: '<section><ul class="list-group"><li class="list-group-item">Inhalt bleibt.</li></ul></section>',
      after: '<section><ul><li class="list-group-item">Inhalt bleibt.</li></ul></section>'
    },
    {
      name: 'responsive Tabelle',
      before: '<section><div class="table-responsive"><table><tbody><tr><td>Inhalt bleibt.</td></tr></tbody></table></div></section>',
      after: '<section><div><table><tbody><tr><td>Inhalt bleibt.</td></tr></tbody></table></div></section>'
    }
  ];

  for (const currentCase of cases) {
    await t.test(currentCase.name, () => {
      const result = validateTargetedOptimizationScope({
        before: article({ contentHtml: currentCase.before }),
        after: article({ contentHtml: currentCase.after })
      });
      assert.equal(result.passed, false);
      assert.equal(result.code, 'HTML_STRUCTURE_CHANGED');
    });
  }
});

test('die Reihenfolge unveränderter freigegebener Wrapperklassen ist nicht strukturell relevant', () => {
  const before = article({
    contentHtml: '<section><div class="bg-light border rounded p-4"><p>Inhalt bleibt.</p></div></section>'
  });
  const after = article({
    contentHtml: '<section><div class="p-4 rounded bg-light border"><p>Inhalt bleibt.</p></div></section>'
  });

  assert.deepEqual(validateTargetedOptimizationScope({ before, after }), {
    passed: true,
    code: null,
    changedBlockRatio: 0,
    wordCountDeltaRatio: 0
  });
});

test('Verschieben eines bestehenden Inhaltsblocks in einen anderen Elternwrapper wird abgelehnt', () => {
  const stable = Array.from({ length: 10 }, (_, index) => `<p>Stabiler Inhalt ${index}.</p>`).join('');
  const before = article({
    contentHtml: `<section>${stable}<div class="row"><div class="col-lg-6"><p>Zuordnung bleibt eindeutig.</p></div><div class="col-lg-6"></div></div></section>`
  });
  const after = article({
    contentHtml: `<section>${stable}<div class="row"><div class="col-lg-6"></div><div class="col-lg-6"><p>Zuordnung bleibt eindeutig.</p></div></div></section>`
  });

  assert.equal(validateTargetedOptimizationScope({ before, after }).code, 'HTML_STRUCTURE_CHANGED');
  assert.equal(validateTargetedOptimizationScope({ before, after }).passed, false);
});

test('reine Textoptimierungen innerhalb derselben Wrapperstruktur bleiben zulässig', () => {
  const blocks = Array.from({ length: 10 }, (_, index) => `<p>Abschnitt ${index} bleibt konkret.</p>`);
  const changed = [...blocks];
  changed[0] = '<p>Abschnitt 0 wird präziser.</p>';
  const before = article({
    contentHtml: `<section><div class="container"><div class="row"><div class="col-lg-12">${blocks.join('')}</div></div></div></section>`
  });
  const after = article({
    contentHtml: `<section><div class="container"><div class="row"><div class="col-lg-12">${changed.join('')}</div></div></div></section>`
  });

  assert.deepEqual(validateTargetedOptimizationScope({ before, after }), {
    passed: true,
    code: null,
    changedBlockRatio: 0.1,
    wordCountDeltaRatio: 0
  });
});

test('hinzugefügte Blöcke zählen nicht als geänderte vorhandene Blöcke, aber zur Netto-Wortzahl', () => {
  const stable = Array.from({ length: 10 }, (_, index) => `<p>${words(`bestand${index}-`, 10)}</p>`);
  const before = article({ contentHtml: stable.join('') });
  const atBoundary = article({ contentHtml: `${stable.join('')}<p>${words('neu-', 25)}</p>` });
  const overBoundary = article({ contentHtml: `${stable.join('')}<p>${words('neu-', 26)}</p>` });

  assert.deepEqual(validateTargetedOptimizationScope({
    before,
    after: atBoundary,
    diff: { changes: [] }
  }), {
    passed: true,
    code: null,
    changedBlockRatio: 0,
    wordCountDeltaRatio: 0.25
  });
  assert.deepEqual(validateTargetedOptimizationScope({
    before,
    after: overBoundary,
    diff: { changes: [] }
  }), {
    passed: false,
    code: 'TARGETED_SCOPE_EXCEEDED',
    changedBlockRatio: 0,
    wordCountDeltaRatio: 0.26
  });
});

test('Inline-Elemente erzeugen keine künstlichen Wortgrenzen', () => {
  const before = article({
    contentHtml: '<p>Web<strong>design</strong> <a href="/kontakt">Berlin</a><span>Agentur</span></p><p>Nächster Absatz</p>'
  });
  const after = article({
    contentHtml: '<p>Web<strong>design</strong> <a href="/kontakt">Berlin</a><span>Agentur</span> Zusatz</p><p>Nächster Absatz</p>'
  });

  assert.equal(
    validateTargetedOptimizationScope({ before, after, diff: { changes: [] } }).wordCountDeltaRatio,
    0.25
  );
});

test('benachbarte Absätze bleiben bei der Wortzählung getrennt', () => {
  const before = article({ contentHtml: '<p>Erster</p><p>Zweiter</p>' });
  const after = article({ contentHtml: '<p>Erster</p><p>Zweiter</p><p>Dritter</p>' });

  assert.equal(
    validateTargetedOptimizationScope({ before, after, diff: { changes: [] } }).wordCountDeltaRatio,
    0.5
  );
});

test('leere Artikel liefern endliche Quoten und neue Inhalte überschreiten die Wortzahlgrenze', () => {
  const empty = article({ contentHtml: '', faqJson: null });
  assert.deepEqual(validateTargetedOptimizationScope({ before: empty, after: empty, diff: { changes: [] } }), {
    passed: true,
    code: null,
    changedBlockRatio: 0,
    wordCountDeltaRatio: 0
  });

  const filled = article({ contentHtml: '<p>Ein neuer Inhalt.</p>', faqJson: [] });
  assert.deepEqual(validateTargetedOptimizationScope({ before: empty, after: filled, diff: { changes: [] } }), {
    passed: false,
    code: 'TARGETED_SCOPE_EXCEEDED',
    changedBlockRatio: 0,
    wordCountDeltaRatio: 1
  });
});

test('übermäßig viele KI-Blöcke werden vor der quadratischen Zuordnung abgewiesen', () => {
  const contentHtml = Array.from({ length: 2_001 }, (_, index) => `<p>Block ${index}</p>`).join('');
  assert.throws(() => buildExistingPostDiff({
    before: article({ contentHtml: '' }),
    after: article({ contentHtml }),
    reasons: []
  }), { code: 'EXISTING_POST_DIFF_INPUT_INVALID' });
});

test('Legacy-EJS erlaubt ausschließlich bytegenau unveränderten Artikeltext', () => {
  const before = article({ contentFormat: 'legacy_ejs', contentHtml: '<p><%= post.title %></p>\n' });
  assert.doesNotThrow(() => buildExistingPostDiff({
    before,
    after: { ...before, title: 'Neuer Metatitel' },
    reasons: []
  }));
  assert.throws(() => buildExistingPostDiff({
    before,
    after: { ...before, contentHtml: '<p><%= post.title %></p>' },
    reasons: []
  }), { code: 'LEGACY_EJS_CONTENT_CHANGE_FORBIDDEN' });
});

test('Slug, Bild-URL, Inhaltsformat und Veröffentlichungszustand sind gesperrt', () => {
  const before = article({
    slug: 'website-relaunch',
    imageUrl: '/uploads/relaunch.webp',
    published: true,
    status: 'published'
  });
  for (const [field, value] of [
    ['slug', 'neuer-slug'],
    ['imageUrl', '/uploads/neu.webp'],
    ['contentFormat', 'legacy_ejs'],
    ['published', false],
    ['status', 'draft']
  ]) {
    assert.throws(() => buildExistingPostDiff({
      before,
      after: { ...before, [field]: value },
      reasons: []
    }), (error) => error.code === 'EXISTING_POST_IMMUTABLE_FIELD_CHANGE_FORBIDDEN' && error.field === field);
  }
});

test('eine Feldänderung wird nur bei passender Version und unverändertem Fingerprint zurückgenommen', () => {
  const before = article();
  const after = article({ title: 'Website-Relaunch sicher planen' });
  const diff = buildExistingPostDiff({ before, after, reasons: [] });
  const state = { revisionVersion: 3, current: after, diff };

  const reverted = revertExistingPostChange({
    snapshot: state,
    changeId: diff.changes[0].id,
    expectedVersion: 3
  });
  assert.equal(reverted.current.title, before.title);
  assert.equal(reverted.revisionVersion, 4);
  assert.equal(reverted.diff.changes[0].status, 'reverted');

  assert.throws(() => revertExistingPostChange({
    snapshot: state,
    changeId: diff.changes[0].id,
    expectedVersion: 2
  }), { code: 'CONTENT_REVISION_CHANGE_CONFLICT' });
  assert.throws(() => revertExistingPostChange({
    snapshot: { ...state, current: { ...after, title: 'Manuell verändert' } },
    changeId: diff.changes[0].id,
    expectedVersion: 3
  }), { code: 'CONTENT_REVISION_CHANGE_CONFLICT' });
});

test('Fingerprints unterscheiden einen fehlenden Wert von gleichlautendem Text', () => {
  const before = article({ title: 'Alt' });
  const after = article({ title: '__undefined__' });
  const diff = buildExistingPostDiff({ before, after, reasons: [] });

  assert.throws(() => revertExistingPostChange({
    snapshot: { revisionVersion: 1, current: { ...after, title: undefined }, diff },
    changeId: diff.changes[0].id,
    expectedVersion: 1
  }), { code: 'CONTENT_REVISION_CHANGE_CONFLICT' });
});

test('FAQ- und sichere HTML-Blockänderungen können einzeln zurückgenommen werden', () => {
  const before = article({
    contentHtml: '<section><h2>Planung</h2><p>Alte Fassung.</p></section>',
    faqJson: [{ question: 'Wie starten wir?', answer: 'Mit einem Audit.' }]
  });
  const after = article({
    contentHtml: '<section><h2>Planung</h2><p>Neue Fassung.</p></section>',
    faqJson: [{ question: 'wie starten wir?', answer: 'Mit Audit und Zieldefinition.' }]
  });
  const diff = buildExistingPostDiff({ before, after, reasons: [] });
  const faqChange = diff.changes.find(({ kind }) => kind === 'faq');
  const htmlChange = diff.changes.find(({ kind }) => kind === 'html');

  const faqReverted = revertExistingPostChange({
    snapshot: { revisionVersion: 1, current: after, diff },
    changeId: faqChange.id,
    expectedVersion: 1
  });
  assert.deepEqual(faqReverted.current.faqJson, before.faqJson);

  const htmlReverted = revertExistingPostChange({
    snapshot: { revisionVersion: 2, current: faqReverted.current, diff: faqReverted.diff },
    changeId: htmlChange.id,
    expectedVersion: 2
  });
  assert.match(htmlReverted.current.contentHtml, /<p>Alte Fassung\.<\/p>/);
  assert.doesNotMatch(htmlReverted.current.contentHtml, /Neue Fassung/);
});

test('unbekannte, bereits zurückgenommene und nicht sicher rücknehmbare Änderungen führen zum Konflikt', () => {
  const before = article({ faqJson: [{ question: 'Alt?', answer: 'Ja.' }] });
  const after = article({ faqJson: [] });
  const diff = buildExistingPostDiff({ before, after, reasons: [] });
  const state = { revisionVersion: 1, current: after, diff };

  assert.equal(diff.changes[0].revertible, false);
  for (const changeId of ['f'.repeat(64), diff.changes[0].id]) {
    assert.throws(() => revertExistingPostChange({ snapshot: state, changeId, expectedVersion: 1 }), {
      code: 'CONTENT_REVISION_CHANGE_CONFLICT'
    });
  }

  const fieldBefore = article();
  const fieldAfter = article({ title: 'Neu' });
  const fieldDiff = buildExistingPostDiff({ before: fieldBefore, after: fieldAfter, reasons: [] });
  const reverted = revertExistingPostChange({
    snapshot: { revisionVersion: 1, current: fieldAfter, diff: fieldDiff },
    changeId: fieldDiff.changes[0].id,
    expectedVersion: 1
  });
  assert.throws(() => revertExistingPostChange({
    snapshot: reverted,
    changeId: fieldDiff.changes[0].id,
    expectedVersion: 2
  }), { code: 'CONTENT_REVISION_CHANGE_CONFLICT' });
});
