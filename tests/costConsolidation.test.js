import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';

import { SEO_RECOVERY_REDIRECTS } from '../data/seoIntentRegistry.js';
import { showGuide } from '../controllers/ratgeberController.js';

// Kostenthema gebündelt (25.10.2026): Blogartikel für allgemeine Kosten, Kostenseite für Berlin.
const GUIDE_REDIRECTS = {
  '/ratgeber/website-kosten-berlin': '/webdesign-berlin/kosten-preise-pakete',
  '/ratgeber/kosten-einfache-website': '/blog/website-kosten-2025-einfach-erklaert',
  '/ratgeber/website-kosten-zeitplan': '/blog/website-kosten-2025-einfach-erklaert',
  '/ratgeber/website-erstellen-berlin-ablauf-dauer-kosten': '/ablauf',
  '/ratgeber/website-fuer-restaurants-cafes-berlin': '/branchen/webdesign-restaurant',
  // 26.10.2026: letzte Doppelungen
  '/ratgeber/professionellen-website-vs-baukasten': '/ratgeber/baukasten-vs-professionelle-website',
  '/ratgeber/website-relaunch-berlin': '/blog/website-relaunch-berlin-checkliste'
};

const PAGE_REDIRECTS = {
  '/webdesign-blumenladen/kosten': '/branchen/webdesign-blumenladen',
  '/webdesign-cafe/kosten': '/branchen/webdesign-cafe'
};

test('doppelte Ratgeber leiten auf die Seite mit derselben Suchabsicht', async () => {
  for (const [from, to] of Object.entries(GUIDE_REDIRECTS)) {
    assert.equal(SEO_RECOVERY_REDIRECTS[from], to, from);
    assert.equal(SEO_RECOVERY_REDIRECTS[to], undefined, `${to} wäre eine Kette`);
    let redirected;
    await showGuide({ params: { slug: from.replace('/ratgeber/', '') } }, {
      locals: {},
      redirect(status, location) { redirected = [status, location]; },
      status() { throw new Error('kein 404 erwartet'); }
    });
    assert.deepEqual(redirected, [301, to], from);
  }
});

test('kleine Kostenseiten leiten auf die Branchenseiten und stehen nicht mehr in der Sitemap', () => {
  const routes = readFileSync(new URL('../routes/staticPages.js', import.meta.url), 'utf8');
  const policy = readFileSync(new URL('../helpers/seoPagePolicy.js', import.meta.url), 'utf8');
  for (const [from, to] of Object.entries(PAGE_REDIRECTS)) {
    assert.equal(SEO_RECOVERY_REDIRECTS[from], to, from);
    assert.match(routes, new RegExp(`router\\.get\\('${from.replace(/\//g, '\\/')}', \\(_req, res\\) => res\\.redirect\\(301`));
    assert.doesNotMatch(policy, new RegExp(`path: '${from}'`));
  }
});

test('fest eingebaute Links zeigen direkt auf die neuen Ziele', () => {
  const root = new URL('../', import.meta.url);
  const files = [];
  const walk = (dir) => {
    for (const name of readdirSync(new URL(dir, root))) {
      const rel = `${dir}${name}`;
      if (statSync(new URL(rel, root)).isDirectory()) walk(`${rel}/`);
      else if (/\.(js|ejs)$/.test(name) && rel !== 'data/seoIntentRegistry.js' && !rel.startsWith('views/static/') && rel !== 'util/legacyPublicCopy.js') files.push(rel);
    }
  };
  ['views/', 'data/', 'controllers/', 'helpers/', 'services/'].forEach(walk);
  for (const file of files) {
    const text = readFileSync(new URL(file, root), 'utf8');
    for (const from of [...Object.keys(GUIDE_REDIRECTS), ...Object.keys(PAGE_REDIRECTS)]) {
      assert.ok(!text.includes(`${from}"`) && !text.includes(`${from}'`), `${file} verlinkt ${from}`);
    }
  }
});

test('Startseite und Kostenseite verlinken den Kosten-Ratgeber', () => {
  const home = readFileSync(new URL('../views/index.ejs', import.meta.url), 'utf8');
  assert.match(home, /href="\/blog\/website-kosten-2025-einfach-erklaert"/);
  const leistungen = readFileSync(new URL('../controllers/leistungenController.js', import.meta.url), 'utf8');
  assert.match(leistungen, /label: 'Ratgeber: Was kostet eine Website\?', href: '\/blog\/website-kosten-2025-einfach-erklaert'/);
});
