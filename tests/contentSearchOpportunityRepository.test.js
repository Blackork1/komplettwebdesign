import assert from 'node:assert/strict';
import test from 'node:test';

import { createContentSearchOpportunityRepository } from '../repositories/contentSearchOpportunityRepository.js';

function createQueryRecorder(responses = []) {
  const calls = [];
  let responseIndex = 0;

  return {
    calls,
    async query(sql, params = []) {
      calls.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
      const response = responses[responseIndex] || { rows: [] };
      responseIndex += 1;
      return response;
    }
  };
}

const opportunities = [{
  postId: 41,
  analysisKey: 'a'.repeat(64),
  opportunityType: 'content_refresh',
  primaryQuery: 'technisches seo',
  score: 8.74,
  evidenceJson: {
    range: { startDate: '2026-06-01', endDate: '2026-06-30' },
    impressions: 500
  },
  recommendationJson: {
    action: 'content_refresh',
    automaticChanges: false
  }
}, {
  postId: 42,
  analysisKey: 'b'.repeat(64),
  opportunityType: 'meta_refresh',
  primaryQuery: 'webdesign kosten',
  score: 8.56,
  evidenceJson: {
    range: { startDate: '2026-06-01', endDate: '2026-06-30' },
    impressions: 2_000
  },
  recommendationJson: {
    action: 'meta_refresh',
    automaticChanges: false
  }
}];

test('Chancen werden gebündelt, parametrisiert und idempotent gespeichert', async () => {
  const persistedRows = [{ id: 91 }, { id: 92 }];
  const db = createQueryRecorder([{ rows: persistedRows }]);
  const repository = createContentSearchOpportunityRepository(db);

  const result = await repository.upsertOpenOpportunities(opportunities);

  assert.deepEqual(result, persistedRows);
  assert.equal(db.calls.length, 1);
  assert.match(db.calls[0].sql, /INSERT INTO content_opportunities/i);
  assert.match(db.calls[0].sql, /FROM UNNEST\(/i);
  assert.match(db.calls[0].sql, /ON CONFLICT \(analysis_key\) DO UPDATE/i);
  assert.match(db.calls[0].sql, /score\s*=\s*EXCLUDED\.score/i);
  assert.match(db.calls[0].sql, /evidence_json\s*=\s*EXCLUDED\.evidence_json/i);
  assert.match(db.calls[0].sql, /recommendation_json\s*=\s*EXCLUDED\.recommendation_json/i);
  assert.match(db.calls[0].sql, /status\s*=\s*'open'/i);
  assert.match(db.calls[0].sql, /resolved_at\s*=\s*NULL/i);
  assert.doesNotMatch(db.calls[0].sql, /\bDELETE\b/i);
  assert.doesNotMatch(db.calls[0].sql, /'technisches seo'|'webdesign kosten'/i);
  assert.deepEqual(db.calls[0].params, [
    [41, 42],
    ['a'.repeat(64), 'b'.repeat(64)],
    ['content_refresh', 'meta_refresh'],
    ['technisches seo', 'webdesign kosten'],
    [8.74, 8.56],
    [
      JSON.stringify(opportunities[0].evidenceJson),
      JSON.stringify(opportunities[1].evidenceJson)
    ],
    [
      JSON.stringify(opportunities[0].recommendationJson),
      JSON.stringify(opportunities[1].recommendationJson)
    ]
  ]);
});

test('Leere Chancen überspringen die Schreibabfrage', async () => {
  const db = createQueryRecorder();
  const repository = createContentSearchOpportunityRepository(db);

  const result = await repository.upsertOpenOpportunities([]);

  assert.deepEqual(result, []);
  assert.equal(db.calls.length, 0);
});

test('Offene Chancen werden serverseitig begrenzt und stabil sortiert', async () => {
  const openRows = [{ id: 91 }, { id: 92 }];
  const db = createQueryRecorder([{ rows: openRows }]);
  const repository = createContentSearchOpportunityRepository(db);

  const result = await repository.listOpenOpportunities(25);

  assert.deepEqual(result, openRows);
  assert.deepEqual(db.calls[0].params, [25]);
  assert.match(db.calls[0].sql, /WHERE status = 'open'/i);
  assert.match(db.calls[0].sql, /ORDER BY score DESC, created_at DESC, id DESC/i);
  assert.match(db.calls[0].sql, /LIMIT \$1/i);
});

test('Fehlendes Listenlimit verwendet eine serverseitige Standardbegrenzung', async () => {
  const db = createQueryRecorder();
  const repository = createContentSearchOpportunityRepository(db);

  await repository.listOpenOpportunities();

  assert.deepEqual(db.calls[0].params, [100]);
  assert.match(db.calls[0].sql, /LIMIT \$1/i);
});

test('Explizites Listenlimit muss eine positive sichere Ganzzahl sein', async () => {
  const db = createQueryRecorder();
  const repository = createContentSearchOpportunityRepository(db);

  for (const limit of [null, 0, -1, 1.5, '25', Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(
      repository.listOpenOpportunities(limit),
      /positive sichere Ganzzahl/i
    );
  }

  assert.equal(db.calls.length, 0);
});

test('Repository akzeptiert nur strukturierte, serialisierbare JSON-Daten', async () => {
  const db = createQueryRecorder();
  const repository = createContentSearchOpportunityRepository(db);
  const unsafeOpportunity = {
    ...opportunities[0],
    evidenceJson: { calculate: () => 42 }
  };

  await assert.rejects(
    repository.upsertOpenOpportunities([unsafeOpportunity]),
    /strukturierter JSON-Wert/i
  );
  assert.equal(db.calls.length, 0);
});

test('Datenartige JSON-Werte werden ohne Verhaltenscode parametrisiert', async () => {
  const objectWithoutPrototype = Object.create(null);
  objectWithoutPrototype.nested = ['Text', true, null, 42.5];
  const validValues = [
    { nested: ['Text', false, null, -3.5] },
    objectWithoutPrototype,
    ['Text', true, null, 0, { nested: 'Wert' }],
    'Text',
    false,
    null,
    Number.MAX_VALUE
  ];
  const rows = validValues.map((value, index) => ({
    ...opportunities[0],
    analysisKey: String(index).padStart(64, 'c'),
    evidenceJson: value,
    recommendationJson: value
  }));
  const db = createQueryRecorder();
  const repository = createContentSearchOpportunityRepository(db);

  await repository.upsertOpenOpportunities(rows);

  assert.equal(db.calls.length, 1);
  assert.deepEqual(db.calls[0].params[5], validValues.map((value) => JSON.stringify(value)));
  assert.deepEqual(db.calls[0].params[6], validValues.map((value) => JSON.stringify(value)));
});

test('toJSON, Accessoren und Symbolschlüssel werden ohne Ausführung abgelehnt', async (t) => {
  const cases = [
    {
      name: 'nicht aufzählbare eigene toJSON-Methode',
      createValue(markExecuted) {
        return Object.defineProperty({ safe: 'Wert' }, 'toJSON', {
          value() {
            markExecuted();
            return { ersetzt: true };
          }
        });
      }
    },
    {
      name: 'geerbte toJSON-Methode',
      createValue(markExecuted) {
        const prototype = Object.defineProperty({}, 'toJSON', {
          value() {
            markExecuted();
            return { ersetzt: true };
          }
        });
        const value = Object.create(prototype);
        value.safe = 'Wert';
        return value;
      }
    },
    {
      name: 'aufzählbarer Getter',
      createValue(markExecuted) {
        return Object.defineProperty({ safe: 'Wert' }, 'computed', {
          enumerable: true,
          get() {
            markExecuted();
            return 'ausgeführt';
          }
        });
      }
    },
    {
      name: 'nicht aufzählbarer Getter',
      createValue(markExecuted) {
        return Object.defineProperty({ safe: 'Wert' }, 'computed', {
          get() {
            markExecuted();
            return 'ausgeführt';
          }
        });
      }
    },
    {
      name: 'Setter',
      createValue(markExecuted) {
        return Object.defineProperty({ safe: 'Wert' }, 'computed', {
          enumerable: true,
          set() {
            markExecuted();
          }
        });
      }
    },
    {
      name: 'Symbolschlüssel',
      createValue() {
        return {
          safe: 'Wert',
          [Symbol('nicht-json')]: 'verborgen'
        };
      }
    }
  ];

  for (const fieldName of ['evidenceJson', 'recommendationJson']) {
    for (const entry of cases) {
      await t.test(`${fieldName}: ${entry.name}`, async () => {
        let executionCount = 0;
        const value = entry.createValue(() => {
          executionCount += 1;
        });
        const db = createQueryRecorder();
        const repository = createContentSearchOpportunityRepository(db);
        let error = null;

        try {
          await repository.upsertOpenOpportunities([{
            ...opportunities[0],
            [fieldName]: value
          }]);
        } catch (caughtError) {
          error = caughtError;
        }

        assert.match(error?.message || '', /strukturierter JSON-Wert/i);
        assert.equal(executionCount, 0);
        assert.equal(db.calls.length, 0);
      });
    }
  }
});

test('Nicht datenartige oder zyklische JSON-Payloads werden fail-closed abgelehnt', async (t) => {
  const cyclic = { safe: 'Wert' };
  cyclic.self = cyclic;
  const invalidValues = [
    ['Funktion', () => 42],
    ['BigInt', 42n],
    ['NaN', Number.NaN],
    ['positive Unendlichkeit', Number.POSITIVE_INFINITY],
    ['negative Unendlichkeit', Number.NEGATIVE_INFINITY],
    ['Date', new Date('2026-07-13T00:00:00.000Z')],
    ['Map', new Map([['safe', 'Wert']])],
    ['Set', new Set(['Wert'])],
    ['Symbolwert', Symbol('nicht-json')],
    ['undefined', undefined],
    ['zyklisches Objekt', cyclic]
  ];

  for (const [name, value] of invalidValues) {
    await t.test(name, async () => {
      const db = createQueryRecorder();
      const repository = createContentSearchOpportunityRepository(db);

      await assert.rejects(
        repository.upsertOpenOpportunities([{
          ...opportunities[0],
          evidenceJson: value
        }]),
        /strukturierter JSON-Wert/i
      );
      assert.equal(db.calls.length, 0);
    });
  }
});

test('Direkte und verschachtelte Proxys werden ohne Trap-Ausführung abgelehnt', async (t) => {
  function createObservedProxy() {
    const trapCalls = {
      getPrototypeOf: 0,
      ownKeys: 0,
      getOwnPropertyDescriptor: 0,
      get: 0
    };
    const target = { safe: 'Wert' };
    const proxy = new Proxy(target, {
      getPrototypeOf() {
        trapCalls.getPrototypeOf += 1;
        return Reflect.getPrototypeOf(target);
      },
      ownKeys() {
        trapCalls.ownKeys += 1;
        return Reflect.ownKeys(target);
      },
      getOwnPropertyDescriptor(_target, key) {
        trapCalls.getOwnPropertyDescriptor += 1;
        return Reflect.getOwnPropertyDescriptor(target, key);
      },
      get(_target, key, receiver) {
        trapCalls.get += 1;
        return Reflect.get(target, key, receiver);
      }
    });
    return { proxy, trapCalls };
  }

  for (const placement of ['direkt', 'verschachtelt']) {
    await t.test(placement, async () => {
      const { proxy, trapCalls } = createObservedProxy();
      const db = createQueryRecorder();
      const repository = createContentSearchOpportunityRepository(db);
      const evidenceJson = placement === 'direkt'
        ? proxy
        : { nested: ['Wert', { proxy }] };

      await assert.rejects(
        repository.upsertOpenOpportunities([{
          ...opportunities[0],
          evidenceJson
        }]),
        /strukturierter JSON-Wert/i
      );

      assert.deepEqual(trapCalls, {
        getPrototypeOf: 0,
        ownKeys: 0,
        getOwnPropertyDescriptor: 0,
        get: 0
      });
      assert.equal(db.calls.length, 0);
    });
  }
});

test('Repository benötigt eine Datenbank mit query-Funktion', () => {
  assert.throws(
    () => createContentSearchOpportunityRepository({}),
    /Datenbank mit query-Funktion/i
  );
});
