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
    ...Array.from({ length: 24_996 }, () => metricRow())
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
    'guard', 'api:0', 'lookup', 'guard', 'write',
    'guard', 'api:25000', 'lookup', 'guard', 'write',
    'guard', 'api:25002'
  ]);
  assert.equal(repository.writeCalls.length, 2);
  assert.equal(repository.writeCalls[0].length, 25_000);
  assert.equal(repository.writeCalls[1].length, 2);
  assert.deepEqual(repository.pathCalls, [
    ['/blog/technisches-seo', '/blog/webdesign-2026'],
    ['/blog/technisches-seo', '/blog/nicht-vorhanden']
  ]);
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
  assert.equal(repository.writeCalls[1][0].postId, 41);
  assert.equal(repository.writeCalls[1][1].postId, null);
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
      clicks: 3,
      impressions: 120,
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
    },
    {
      postId: null,
      metricDate: '2026-07-01',
      pageUrl: 'https://komplettwebdesign.de/blog/sicherer-slug',
      query: 'webdesign berlin',
      device: 'DESKTOP',
      clicks: 3,
      impressions: 120,
      ctr: 0.025,
      averagePosition: 8.5
    }
  ]);
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
