import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildOutcomeWindows,
  captureRevisionBaseline,
  compareOutcomeMetrics,
  evaluateDueRevisionOutcomes
} from '../services/contentAgent/contentRevisionOutcomeService.js';

test('Folgezeitraum beginnt am Kalendertag nach Übernahme und umfasst 28 Tage', () => {
  assert.deepEqual(
    buildOutcomeWindows(new Date('2026-07-14T16:00:00.000Z'), 'Europe/Berlin'),
    {
      followupStartDate: '2026-07-15',
      followupEndDate: '2026-08-11'
    }
  );
});

test('Folgezeitraum bleibt über beide Berliner Zeitumstellungen kalendertagsgenau', () => {
  assert.deepEqual(
    buildOutcomeWindows(new Date('2026-03-28T23:30:00.000Z'), 'Europe/Berlin'),
    {
      followupStartDate: '2026-03-30',
      followupEndDate: '2026-04-26'
    }
  );
  assert.deepEqual(
    buildOutcomeWindows(new Date('2026-10-24T22:30:00.000Z'), 'Europe/Berlin'),
    {
      followupStartDate: '2026-10-26',
      followupEndDate: '2026-11-22'
    }
  );
});

test('geringe Datenmenge wird nicht als Verbesserung oder Verschlechterung bewertet', () => {
  const result = compareOutcomeMetrics(
    { impressions: 3, clicks: 0 },
    { impressions: 4, clicks: 1 }
  );

  assert.equal(result.status, 'insufficient_data');
  assert.equal(result.label, 'Noch nicht belastbar');
  assert.doesNotMatch(JSON.stringify(result), /verbesser|verschlechter|kausal/i);
});

test('eine explizit fehlende Basis bleibt auch bei vielen Folgeimpressionen nicht belastbar', () => {
  const result = compareOutcomeMetrics(
    { hasData: false, clicks: 0, impressions: 0 },
    { hasData: true, clicks: 30, impressions: 300, averagePosition: 5 }
  );

  assert.equal(result.status, 'insufficient_data');
  assert.equal(result.label, 'Noch nicht belastbar');
});

test('Vergleich berechnet CTR aus Summen und liefert nur endliche absolute Differenzen', () => {
  const result = compareOutcomeMetrics(
    {
      hasData: true,
      clicks: 10,
      impressions: 100,
      ctr: 999,
      averagePosition: 12,
      queries: [{
        query: ' bestehende\u0000   Suche ', clicks: 7, impressions: 70,
        ctr: 999, averagePosition: 11, providerField: 'nicht übernehmen'
      }],
      providerResponse: { geheim: true }
    },
    {
      hasData: true,
      clicks: 15,
      impressions: 150,
      ctr: -5,
      averagePosition: 9,
      queries: [{
        query: ' neue   Suche ', clicks: 8, impressions: 80,
        ctr: 999, averagePosition: 8, raw: 'nicht übernehmen'
      }]
    }
  );

  assert.deepEqual(result, {
    status: 'observed',
    label: 'Neutrale Beobachtung',
    baseline: {
      hasData: true,
      clicks: 10,
      impressions: 100,
      ctr: 0.1,
      averagePosition: 12,
      queries: [{
        query: 'bestehende Suche', clicks: 7, impressions: 70,
        ctr: 0.1, averagePosition: 11
      }]
    },
    followup: {
      hasData: true,
      clicks: 15,
      impressions: 150,
      ctr: 0.1,
      averagePosition: 9,
      queries: [{
        query: 'neue Suche', clicks: 8, impressions: 80,
        ctr: 0.1, averagePosition: 8
      }]
    },
    changes: {
      clicks: 5,
      impressions: 50,
      ctr: 0,
      averagePosition: -3
    },
    newImportantQueries: [{ query: 'neue Suche', clicks: 8, impressions: 80 }],
    lostImportantQueries: [{ query: 'bestehende Suche', clicks: 7, impressions: 70 }],
    note: 'Die Werte sind eine neutrale Beobachtung. Saison, Nachfrage und Google-Änderungen können sie beeinflussen.'
  });
  assert.doesNotMatch(JSON.stringify(result), /provider|geheim|\braw\b/i);
});

test('Querylisten sind normalisiert, deterministisch begrenzt und Division durch null bleibt endlich', () => {
  const queries = Array.from({ length: 20 }, (_, index) => ({
    query: `${index % 2 ? 'z' : 'a'} ${String(index).padStart(2, '0')}\n`,
    clicks: index,
    impressions: index === 0 ? 0 : 100 - index,
    averagePosition: index + 1
  }));
  const result = compareOutcomeMetrics(
    { hasData: true, clicks: 0, impressions: 0, averagePosition: null, queries: [] },
    { hasData: true, clicks: 20, impressions: 200, averagePosition: 4, queries }
  );

  assert.equal(result.followup.queries.length, 10);
  assert.equal(result.newImportantQueries.length, 5);
  assert.deepEqual(
    result.followup.queries.map(({ query }) => query),
    ['z 01', 'a 02', 'z 03', 'a 04', 'z 05', 'a 06', 'z 07', 'a 08', 'z 09', 'a 10']
  );
  assert.equal(result.baseline.ctr, 0);
  assert.equal(result.changes.averagePosition, null);
  assert.equal(JSON.stringify(result).includes('Infinity'), false);
  assert.equal(JSON.stringify(result).includes('NaN'), false);
});

test('Basisaufnahme liest und speichert höchstens 28 lokale Tage in derselben Freigabetransaktion', async () => {
  const transaction = { query: async () => ({ rows: [] }) };
  const calls = [];
  const result = await captureRevisionBaseline({
    revisionId: 71,
    postId: 19,
    expectedVersion: 3,
    appliedAt: '2026-07-14T22:30:00.000Z',
    timezone: 'Europe/Berlin',
    transactionClient: transaction
  }, {
    searchMetricsRepository: {
      async getLatestCompletePageMetrics(input, client) {
        calls.push(['metrics', input, client]);
        return {
          startDate: '2026-06-17',
          endDate: '2026-07-14',
          coverageDayCount: 28,
          hasData: true,
          clicks: 12,
          impressions: 120,
          averagePosition: 8,
          queries: [{ query: ' sichere   Suche ', clicks: 12, impressions: 120, averagePosition: 8 }]
        };
      }
    },
    outcomeRepository: {
      async createOutcomeBaseline(input, client) {
        calls.push(['outcome', input, client]);
        return { revision_id: input.revisionId };
      }
    }
  });

  assert.deepEqual(result, { revision_id: 71 });
  assert.deepEqual(calls[0], ['metrics', {
    postId: 19,
    throughDate: '2026-07-15',
    days: 28,
    queryLimit: 10
  }, transaction]);
  assert.equal(calls[1][2], transaction);
  assert.deepEqual(calls[1][1], {
    revisionId: 71,
    postId: 19,
    expectedVersion: 3,
    appliedAt: '2026-07-14T22:30:00.000Z',
    baselineStartDate: '2026-06-17',
    baselineEndDate: '2026-07-14',
    baselineMetrics: {
      hasData: true,
      clicks: 12,
      impressions: 120,
      ctr: 0.1,
      averagePosition: 8,
      queries: [{
        query: 'sichere Suche', clicks: 12, impressions: 120,
        ctr: 0.1, averagePosition: 8
      }]
    },
    timezone: 'Europe/Berlin'
  });
});

test('fehlende lokale Basisdaten werden explizit gespeichert und blockieren die Freigabe nicht', async () => {
  let stored;
  await captureRevisionBaseline({
    revisionId: 71,
    postId: 19,
    expectedVersion: 3,
    appliedAt: '2026-07-14T16:00:00.000Z',
    timezone: 'Europe/Berlin',
    transactionClient: { query: async () => ({ rows: [] }) }
  }, {
    searchMetricsRepository: {
      async getLatestCompletePageMetrics() { return null; }
    },
    outcomeRepository: {
      async createOutcomeBaseline(input) { stored = input; return { revision_id: 71 }; }
    }
  });

  assert.equal(stored.baselineStartDate, null);
  assert.equal(stored.baselineEndDate, null);
  assert.deepEqual(stored.baselineMetrics, {
    hasData: false,
    clicks: 0,
    impressions: 0,
    ctr: 0,
    averagePosition: null,
    queries: []
  });
});

test('Nachmessung wertet nur vollständig abgedeckte 28 Tage aus und schließt per Claim-CAS ab', async () => {
  const completed = [];
  const released = [];
  const due = [{
    revision_id: 71,
    post_id: 19,
    revision_version: 3,
    baseline_metrics_json: {
      hasData: true, clicks: 4, impressions: 60, ctr: 0.99,
      averagePosition: 12, queries: [{ query: 'alt', clicks: 4, impressions: 60, averagePosition: 12 }]
    },
    followup_start_date: '2026-07-15',
    followup_end_date: '2026-08-11'
  }, {
    revision_id: 72,
    post_id: 20,
    revision_version: 2,
    baseline_metrics_json: { hasData: false },
    followup_start_date: '2026-07-15',
    followup_end_date: '2026-08-11'
  }];
  const result = await evaluateDueRevisionOutcomes({ endDate: '2026-08-11' }, {
    createClaimToken: () => '11111111-1111-4111-8111-111111111111',
    outcomeRepository: {
      async listDueOutcomes(input) {
        assert.deepEqual(input, {
          throughDate: '2026-08-11',
          limit: 50,
          claimToken: '11111111-1111-4111-8111-111111111111'
        });
        return due;
      },
      async completeOutcome(input) { completed.push(input); return { revision_id: input.revisionId }; },
      async releaseOutcomeClaim(input) { released.push(input); return { revision_id: input.revisionId }; }
    },
    searchMetricsRepository: {
      async getPageOutcomeMetrics({ postId }) {
        if (postId === 20) return { coverageDayCount: 28, hasData: true, clicks: 1, impressions: 1 };
        return {
          coverageDayCount: 28,
          startDate: '2026-07-15',
          endDate: '2026-08-11',
          hasData: true,
          clicks: 8,
          impressions: 90,
          averagePosition: 9,
          queries: [{ query: 'neu', clicks: 8, impressions: 90, averagePosition: 9 }]
        };
      }
    }
  });

  assert.deepEqual(result, { claimed: 2, evaluated: 1, insufficientData: 0, waiting: 1, failed: 0 });
  assert.equal(completed.length, 1);
  assert.deepEqual(completed[0], {
    revisionId: 71,
    expectedRevisionVersion: 3,
    claimToken: '11111111-1111-4111-8111-111111111111',
    evaluationStatus: 'evaluated',
    followupMetrics: {
      hasData: true,
      clicks: 8,
      impressions: 90,
      ctr: 0.08888889,
      averagePosition: 9,
      queries: [{ query: 'neu', clicks: 8, impressions: 90, ctr: 0.08888889, averagePosition: 9 }],
      changes: { clicks: 4, impressions: 30, ctr: 0.02222222, averagePosition: -3 },
      newImportantQueries: [{ query: 'neu', clicks: 8, impressions: 90 }],
      lostImportantQueries: [{ query: 'alt', clicks: 4, impressions: 60 }],
      label: 'Neutrale Beobachtung',
      note: 'Die Werte sind eine neutrale Beobachtung. Saison, Nachfrage und Google-Änderungen können sie beeinflussen.'
    }
  });
  assert.deepEqual(released, [{
    revisionId: 72,
    expectedRevisionVersion: 2,
    claimToken: '11111111-1111-4111-8111-111111111111'
  }]);
});
