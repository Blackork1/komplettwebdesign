import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const routes = readFileSync(
  new URL('../routes/adminContentAgentRoutes.js', import.meta.url),
  'utf8'
);
const blogRoutes = readFileSync(
  new URL('../routes/adminBlogRoutes.js', import.meta.url),
  'utf8'
);
const indexSource = readFileSync(new URL('../index.js', import.meta.url), 'utf8');

const GET_PATHS = [
  '/admin/content-agent',
  '/admin/content-agent/drafts',
  '/admin/content-agent/existing-content',
  '/admin/content-agent/schedule',
  '/admin/content-agent/jobs',
  '/admin/content-agent/technology',
  '/admin/content-agent/drafts/:id/preview',
  '/admin/content-agent/drafts/:id/edit',
  '/admin/content-agent/revisions/:id/edit'
];

const POST_PATHS = [
  '/admin/content-agent/settings',
  '/admin/content-agent/jobs/manual-draft',
  '/admin/content-agent/jobs/:id/retry',
  '/admin/content-agent/drafts/:id',
  '/admin/content-agent/drafts/:id/publish',
  '/admin/content-agent/drafts/:id/reject',
  '/admin/content-agent/drafts/:id/regenerate-image',
  '/admin/content-agent/drafts/:id/regenerate-faq',
  '/admin/content-agent/drafts/:id/regenerate',
  '/admin/content-agent/existing-content/audit',
  '/admin/content-agent/existing-content/:id/revision',
  '/admin/content-agent/revisions/:id',
  '/admin/content-agent/revisions/:id/publish'
];

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test('alle Content-Agent-Seiten verlangen eine Adminsession', () => {
  for (const path of GET_PATHS) {
    assert.match(
      routes,
      new RegExp(`router\\.get\\('${escapeRegex(path)}',\\s*isAdmin,`),
      `Adminschutz fehlt für GET ${path}`
    );
  }
});

test('alle Content-Agent-Schreibwege verlangen Admin und CSRF', () => {
  for (const path of POST_PATHS) {
    assert.match(
      routes,
      new RegExp(`router\\.post\\('${escapeRegex(path)}',\\s*isAdmin,\\s*verifyCsrfToken,`),
      `Admin- oder CSRF-Schutz fehlt für POST ${path}`
    );
  }
});

test('alte Blog-Schreibrouten verlangen ebenfalls Admin und CSRF', () => {
  const postLines = blogRoutes.split('\n').filter((line) => line.includes('router.post'));
  assert.ok(postLines.length > 0);
  for (const line of postLines) {
    assert.match(
      line,
      /isAdmin,\s*(?:upload\.single\([^)]*\),\s*)?verifyCsrfToken,/,
      `Ungeschützte Legacy-Blogroute: ${line.trim()}`
    );
  }
});

test('der Content-Agent-Router ist in der Anwendung explizit gemountet', () => {
  assert.match(indexSource, /import adminContentAgentRoutes from ['"]\.\/routes\/adminContentAgentRoutes\.js['"]/);
  assert.match(indexSource, /app\.use\(adminContentAgentRoutes\)/);
});
