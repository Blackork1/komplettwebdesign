import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildPostNavigation } from '../helpers/relatedPosts.js';

const posts = [
  { slug: 'local-seo-berlin', title: 'Local SEO in Berlin: Google-Unternehmensprofil optimieren', category: 'SEO' },
  { slug: 'website-kosten', title: 'Was kostet eine Website? Preise und Pakete', category: 'Kosten' },
  { slug: 'google-profil-tipps', title: 'Google-Unternehmensprofil: 10 Tipps für lokale Sichtbarkeit', category: 'SEO' },
  { slug: 'relaunch-planen', title: 'Website-Relaunch planen ohne Rankingverlust', category: 'Relaunch' },
  { slug: 'css-galerie', title: 'Scroll-Snap-Galerie mit CSS', category: 'Technik' }
];

test('liefert thematisch passende Artikel und schließt den aktuellen aus', () => {
  const nav = buildPostNavigation(posts[0], posts);
  assert.equal(nav.related.length, 3);
  assert.ok(!nav.related.some((item) => item.slug === 'local-seo-berlin'));
  assert.equal(nav.related[0].slug, 'google-profil-tipps');
});

test('chronologische Nachbarn verbinden jeden Artikel', () => {
  const nav = buildPostNavigation(posts[2], posts);
  assert.equal(nav.newer.slug, 'website-kosten');
  assert.equal(nav.older.slug, 'relaunch-planen');
  assert.ok(!nav.related.some((item) => ['website-kosten', 'relaunch-planen'].includes(item.slug)));
  assert.equal(buildPostNavigation(posts[0], posts).newer, null);
  assert.equal(buildPostNavigation(posts[4], posts).older, null);
});

test('jeder Artikel wird von mindestens zwei anderen Artikeln verlinkt', () => {
  const inbound = new Map(posts.map((post) => [post.slug, new Set()]));
  for (const post of posts) {
    const nav = buildPostNavigation(post, posts);
    for (const link of [...nav.related, nav.newer, nav.older].filter(Boolean)) inbound.get(link.slug).add(post.slug);
  }
  for (const [slug, sources] of inbound) assert.ok(sources.size >= 2, `${slug} hat nur ${sources.size} eingehende Links`);
});

test('Artikelseite rendert „Passende Artikel“ und Vor/Zurück-Links nur außerhalb der Vorschau', () => {
  const view = readFileSync(new URL('../views/blog/show.ejs', import.meta.url), 'utf8');
  assert.match(view, /class="blog-related"/);
  assert.match(view, /rel="prev"/);
  assert.match(view, /rel="next"/);
  assert.match(view, /!isPreview && \(relatedList\.length/);
});
