import assert from 'node:assert/strict';
import test from 'node:test';

import { createSearchConsoleSyncService } from '../services/contentAgent/searchConsoleSyncService.js';

const ALLOWED_HOSTS = ['komplettwebdesign.de', 'www.komplettwebdesign.de'];

function metricRow({
  date = '2026-07-01',
  page = 'https://komplettwebdesign.de/leistungen',
  query = 'webdesign berlin',
  device = 'DESKTOP',
  clicks = 3,
  impressions = 120,
  ctr = 0.025,
  position = 8.5
} = {}) {
  return {
    keys: [date, page, query, device],
    clicks,
    impressions,
    ctr,
    position
  };
}

function createRepository({ postIds = new Map(), events = [] } = {}) {
  const pathCalls = [];
  const writeCalls = [];

  return {
    pathCalls,
    writeCalls,
    async findPostIdsByCanonicalPaths(paths) {
      events.push('lookup');
      pathCalls.push(paths);
      return new Map(paths.flatMap((path) => (
        postIds.has(path) ? [[path, postIds.get(path)]] : []
      )));
    },
    async upsertSearchMetrics(rows) {
      events.push('write');
      writeCalls.push(rows);
      return rows;
    }
  };
}

test('paginiert mit tatsächlicher Zeilenzahl und normalisiert sichere Seiten vor dem Schreiben', async () => {
  const events = [];
  const firstPage = [
    metricRow({
      page: 'https://komplettwebdesign.de/blog/technisches-seo/?utm_source=gsc#abschnitt',
      query: 'technisches seo'
    }),
    metricRow({
      page: 'https://www.komplettwebdesign.de/blog/webdesign-2026/',
      query: 'webdesign 2026',
      device: 'MOBILE'
    }),
    metricRow({ page: 'http://komplettwebdesign.de/leistungen/?ref=test#kontakt' }),
    metricRow({ page: 'https://komplettwebdesign.de/blog/Technisches-SEO/' }),
    ...Array.from({ length: 24_996 }, (_, index) => metricRow({
      query: `webdesign berlin ${index}`
    }))
  ];
  const pages = [
    firstPage,
    [
      metricRow({
        date: '2026-07-02',
        page: 'https://www.komplettwebdesign.de/blog/technisches-seo?utm=test',
        clicks: 5
      }),
      metricRow({
        date: '2026-07-02',
        page: 'https://komplettwebdesign.de/blog/nicht-vorhanden#oben',
        clicks: 0
      })
    ],
    []
  ];
  const requests = [];
  const client = {
    async querySearchAnalytics(body) {
      events.push(`api:${body.startRow}`);
      requests.push(body);
      return { rows: pages[requests.length - 1] };
    }
  };
  const repository = createRepository({
    events,
    postIds: new Map([
      ['/blog/technisches-seo', 41],
      ['/blog/webdesign-2026', 42]
    ])
  });
  const service = createSearchConsoleSyncService({
    client,
    repository,
    allowedHosts: ALLOWED_HOSTS
  });

  await service.syncSearchConsoleRange({
    startDate: '2026-07-01',
    endDate: '2026-07-02',
    leaseGuard: async () => events.push('guard')
  });

  assert.deepEqual(requests, [0, 25_000, 25_002].map((startRow) => ({
    startDate: '2026-07-01',
    endDate: '2026-07-02',
    dimensions: ['date', 'page', 'query', 'device'],
    type: 'web',
    dataState: 'final',
    rowLimit: 25_000,
    startRow
  })));
  assert.deepEqual(events, [
    'guard', 'api:0',
    'guard', 'api:25000',
    'guard', 'api:25002',
    'lookup', 'guard', 'write'
  ]);
  assert.equal(repository.writeCalls.length, 1);
  assert.equal(repository.writeCalls[0].length, 25_002);
  assert.deepEqual(repository.pathCalls, [[
    '/blog/technisches-seo',
    '/blog/webdesign-2026',
    '/blog/nicht-vorhanden'
  ]]);
  assert.deepEqual(repository.writeCalls[0].slice(0, 4), [
    {
      postId: 41,
      metricDate: '2026-07-01',
      pageUrl: 'https://komplettwebdesign.de/blog/technisches-seo',
      query: 'technisches seo',
      device: 'DESKTOP',
      clicks: 3,
      impressions: 120,
      ctr: 0.025,
      averagePosition: 8.5
    },
    {
      postId: 42,
      metricDate: '2026-07-01',
      pageUrl: 'https://www.komplettwebdesign.de/blog/webdesign-2026',
      query: 'webdesign 2026',
      device: 'MOBILE',
      clicks: 3,
      impressions: 120,
      ctr: 0.025,
      averagePosition: 8.5
    },
    {
      postId: null,
      metricDate: '2026-07-01',
      pageUrl: 'http://komplettwebdesign.de/leistungen',
      query: 'webdesign berlin',
      device: 'DESKTOP',
      clicks: 3,
      impressions: 120,
      ctr: 0.025,
      averagePosition: 8.5
    },
    {
      postId: null,
      metricDate: '2026-07-01',
      pageUrl: 'https://komplettwebdesign.de/blog/Technisches-SEO',
      query: 'webdesign berlin',
      device: 'DESKTOP',
      clicks: 3,
      impressions: 120,
      ctr: 0.025,
      averagePosition: 8.5
    }
  ]);
  assert.equal(repository.writeCalls[0][25_000].postId, 41);
  assert.equal(repository.writeCalls[0][25_001].postId, null);
});

test('aggregiert normalisierte Conflict-Key-Duplikate vor dem gemeinsamen Upsert', async () => {
  const duplicateRows = [
    metricRow({
      page: 'https://komplettwebdesign.de/blog/anderer-slug/../dedup-slug?quelle=erste',
      query: 'dedup query',
      clicks: 2,
      impressions: 10,
      ctr: 0.2,
      position: 4
    }),
    metricRow({
      page: 'https://komplettwebdesign.de/blog/dedup-slug/#abschnitt',
      query: 'dedup query',
      clicks: 3,
      impressions: 30,
      ctr: 0.1,
      position: 10
    }),
    metricRow({
      page: 'https://komplettwebdesign.de/blog/dedup-slug?quelle=dritte',
      query: 'dedup query',
      clicks: 5,
      impressions: 0,
      ctr: 0,
      position: 99
    })
  ];
  let page = 0;
  const client = {
    async querySearchAnalytics() {
      page += 1;
      return { rows: page === 1 ? duplicateRows : [] };
    }
  };
  const repository = createRepository({
    postIds: new Map([['/blog/dedup-slug', 73]])
  });
  const service = createSearchConsoleSyncService({
    client,
    repository,
    allowedHosts: ALLOWED_HOSTS
  });

  await service.syncSearchConsoleRange({
    startDate: '2026-07-01',
    endDate: '2026-07-01',
    leaseGuard: async () => {}
  });

  assert.deepEqual(repository.pathCalls, [['/blog/dedup-slug']]);
  assert.deepEqual(repository.writeCalls, [[{
    postId: 73,
    metricDate: '2026-07-01',
    pageUrl: 'https://komplettwebdesign.de/blog/dedup-slug',
    query: 'dedup query',
    device: 'DESKTOP',
    clicks: 10,
    impressions: 40,
    ctr: 0.25,
    averagePosition: 8.5
  }]]);
});

test('aggregiert denselben normalisierten Conflict-Key über alle API-Seiten vor dem Upsert', async () => {
  const events = [];
  const pages = [
    [
      metricRow({
        page: 'https://komplettwebdesign.de/blog/anderer-slug/../seitenwechsel?erste=1',
        query: 'seitenübergreifend',
        clicks: 2,
        impressions: 10,
        ctr: 0.2,
        position: 4
      }),
      ...Array.from({ length: 24_999 }, (_, index) => metricRow({
        query: `eindeutig ${index}`
      }))
    ],
    [metricRow({
      page: 'https://komplettwebdesign.de/blog/seitenwechsel/#zweite-seite',
      query: 'seitenübergreifend',
      clicks: 3,
      impressions: 30,
      ctr: 0.1,
      position: 10
    })],
    []
  ];
  const requests = [];
  const repository = createRepository({
    events,
    postIds: new Map([['/blog/seitenwechsel', 82]])
  });
  const service = createSearchConsoleSyncService({
    client: {
      async querySearchAnalytics(body) {
        events.push(`api:${body.startRow}`);
        requests.push(body);
        return { rows: pages[requests.length - 1] };
      }
    },
    repository,
    allowedHosts: ALLOWED_HOSTS
  });

  await service.syncSearchConsoleRange({
    startDate: '2026-07-01',
    endDate: '2026-07-01',
    leaseGuard: async () => events.push('guard')
  });

  assert.deepEqual(requests.map((request) => request.startRow), [0, 25_000, 25_001]);
  assert.deepEqual(events, [
    'guard', 'api:0',
    'guard', 'api:25000',
    'guard', 'api:25001',
    'lookup', 'guard', 'write'
  ]);
  assert.equal(repository.writeCalls.length, 1);
  assert.equal(repository.writeCalls[0].length, 25_000);
  assert.deepEqual(
    repository.writeCalls[0].find((row) => row.query === 'seitenübergreifend'),
    {
      postId: 82,
      metricDate: '2026-07-01',
      pageUrl: 'https://komplettwebdesign.de/blog/seitenwechsel',
      query: 'seitenübergreifend',
      device: 'DESKTOP',
      clicks: 5,
      impressions: 40,
      ctr: 0.125,
      averagePosition: 8.5
    }
  );
});

test('verwirft jede fehlerhafte API-Zeile einzeln und behält gültige Zeilen', async () => {
  const validStringNumbers = metricRow({
    page: 'https://komplettwebdesign.de/blog/sicherer-slug/?x=1#ziel',
    clicks: '3',
    impressions: '120',
    ctr: '0.025',
    position: '8.5'
  });
  const validNonBlogPath = metricRow({
    page: 'https://www.komplettwebdesign.de/blog/zwei/segmente/'
  });
  const normalizedUnsafeBlogPath = metricRow({
    page: 'https://komplettwebdesign.de/blog/anderer-slug/../sicherer-slug/'
  });
  const invalidRows = [
    metricRow({ date: '2026-02-30' }),
    metricRow({ page: 'https://fremde-domain.de/blog/sicherer-slug' }),
    metricRow({ page: 'ftp://komplettwebdesign.de/blog/sicherer-slug' }),
    metricRow({ page: 'keine-url' }),
    metricRow({ clicks: 'keine-zahl' }),
    { ...metricRow(), keys: ['2026-07-01', 'https://komplettwebdesign.de/'] }
  ];
  let page = 0;
  const client = {
    async querySearchAnalytics() {
      page += 1;
      return {
        rows: page === 1
          ? [validStringNumbers, ...invalidRows, validNonBlogPath, normalizedUnsafeBlogPath]
          : []
      };
    }
  };
  const repository = createRepository({
    postIds: new Map([['/blog/sicherer-slug', 91]])
  });
  const service = createSearchConsoleSyncService({
    client,
    repository,
    allowedHosts: ALLOWED_HOSTS
  });

  await service.syncSearchConsoleRange({
    startDate: '2026-07-01',
    endDate: '2026-07-01',
    leaseGuard: async () => {}
  });

  assert.equal(repository.writeCalls.length, 1);
  assert.deepEqual(repository.writeCalls[0], [
    {
      postId: 91,
      metricDate: '2026-07-01',
      pageUrl: 'https://komplettwebdesign.de/blog/sicherer-slug',
      query: 'webdesign berlin',
      device: 'DESKTOP',
      clicks: 6,
      impressions: 240,
      ctr: 0.025,
      averagePosition: 8.5
    },
    {
      postId: null,
      metricDate: '2026-07-01',
      pageUrl: 'https://www.komplettwebdesign.de/blog/zwei/segmente',
      query: 'webdesign berlin',
      device: 'DESKTOP',
      clicks: 3,
      impressions: 120,
      ctr: 0.025,
      averagePosition: 8.5
    }
  ]);
});

test('verwirft negative und die exakten Schemaobergrenzen überschreitende Metrikzeilen einzeln', async () => {
  const numeric14Scale4Max = 9_999_999_999.9999;
  const numeric12Scale8Max = 9_999.99999999;
  const numeric12Scale4Max = 99_999_999.9999;
  const validBoundaryRow = metricRow({
    query: 'gültige Schemaobergrenzen',
    device: 'D'.repeat(24),
    clicks: numeric14Scale4Max,
    impressions: numeric14Scale4Max,
    ctr: numeric12Scale8Max,
    position: numeric12Scale4Max
  });
  const invalidRows = [
    metricRow({ query: 'negative clicks', clicks: -0.0001 }),
    metricRow({ query: 'negative impressions', impressions: -0.0001 }),
    metricRow({ query: 'negative ctr', ctr: -0.00000001 }),
    metricRow({ query: 'negative position', position: -0.0001 }),
    metricRow({ query: 'clicks über Maximum', clicks: '10000000000' }),
    metricRow({ query: 'impressions über Maximum', impressions: '10000000000' }),
    metricRow({ query: 'ctr über Maximum', ctr: '10000' }),
    metricRow({ query: 'position über Maximum', position: '100000000' }),
    metricRow({ query: 'device zu lang', device: 'D'.repeat(25) })
  ];
  let page = 0;
  const repository = createRepository();
  const service = createSearchConsoleSyncService({
    client: {
      async querySearchAnalytics() {
        page += 1;
        return { rows: page === 1 ? [validBoundaryRow, ...invalidRows] : [] };
      }
    },
    repository,
    allowedHosts: ALLOWED_HOSTS
  });

  await service.syncSearchConsoleRange({
    startDate: '2026-07-01',
    endDate: '2026-07-01',
    leaseGuard: async () => {}
  });

  assert.deepEqual(repository.writeCalls, [[{
    postId: null,
    metricDate: '2026-07-01',
    pageUrl: 'https://komplettwebdesign.de/leistungen',
    query: 'gültige Schemaobergrenzen',
    device: 'D'.repeat(24),
    clicks: numeric14Scale4Max,
    impressions: numeric14Scale4Max,
    ctr: 1,
    averagePosition: numeric12Scale4Max
  }]]);
});

test('ein abgelehnter Lease-Guard verhindert die nächste API-Seite und jeden DB-Schreibzugriff', async () => {
  let guardCalls = 0;
  let apiCalls = 0;
  const repository = createRepository();
  const service = createSearchConsoleSyncService({
    client: {
      async querySearchAnalytics() {
        apiCalls += 1;
        return { rows: [metricRow()] };
      }
    },
    repository,
    allowedHosts: ALLOWED_HOSTS
  });

  await assert.rejects(
    service.syncSearchConsoleRange({
      startDate: '2026-07-01',
      endDate: '2026-07-01',
      leaseGuard: async () => {
        guardCalls += 1;
        if (guardCalls === 2) throw new Error('Lease verloren');
      }
    }),
    /Lease verloren/
  );

  assert.equal(guardCalls, 2);
  assert.equal(apiCalls, 1);
  assert.equal(repository.writeCalls.length, 0);
});
