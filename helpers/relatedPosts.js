// Interne Verlinkung zwischen Blogartikeln: thematisch passende Artikel plus
// chronologische Nachbarn, damit jeder Artikel aus anderen Artikeln erreichbar ist.

const STOPWORDS = new Set([
  'aber', 'alle', 'allem', 'auch', 'auf', 'aus', 'beim', 'bereits', 'berlin', 'brandenburg', 'damit', 'dann',
  'dass', 'deine', 'deinen', 'deiner', 'deines', 'dein', 'denen', 'der', 'des', 'diese', 'diesem', 'dieser',
  'dir', 'doch', 'durch', 'eine', 'einem', 'einen', 'einer', 'eines', 'euch', 'fuer', 'für', 'gibt', 'guide',
  'haben', 'hier', 'ihre', 'immer', 'jetzt', 'kann', 'kannst', 'keine', 'mehr', 'mit', 'nach', 'nicht', 'noch',
  'oder', 'ohne', 'sich', 'sind', 'so', 'sowie', 'tipps', 'über', 'ueber', 'und', 'unter', 'viele', 'vom',
  'von', 'warum', 'was', 'welche', 'wenn', 'werden', 'wie', 'wird', 'wirklich', 'zum', 'zur', 'zwei',
  'unternehmen', 'website', 'websites', 'webseite', 'kleine', 'kmu', 'deutschland', '2024', '2025', '2026'
]);

function tokensOf(post) {
  const text = `${post.title || ''} ${post.description || ''} ${post.excerpt || ''}`.toLowerCase();
  return new Set(
    text
      .split(/[^a-z0-9äöüß]+/i)
      .filter((word) => word.length > 3 && !STOPWORDS.has(word))
  );
}

function teaserOf(post, maxLength = 140) {
  const text = String(post.description || post.excerpt || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 60)).replace(/[,;:–-]\s*$/, '')} …`;
}

function toLink(post) {
  return { slug: post.slug, title: post.title, teaser: teaserOf(post) };
}

/**
 * @param {object} current  aktueller Artikel (slug, title, description, excerpt, category)
 * @param {object[]} candidates  veröffentlichte Artikel, neueste zuerst
 * @returns {{ related: object[], newer: object|null, older: object|null }}
 */
export function buildPostNavigation(current, candidates = [], { limit = 3 } = {}) {
  const list = (Array.isArray(candidates) ? candidates : []).filter((post) => post && post.slug);
  const index = list.findIndex((post) => post.slug === current?.slug);
  const newer = index > 0 ? list[index - 1] : null;
  const older = index >= 0 && index < list.length - 1 ? list[index + 1] : null;

  const currentTokens = tokensOf(current || {});
  const others = list.filter((post) => post.slug !== current?.slug && post !== newer && post !== older);
  const scored = others
    .map((post, position) => {
      let shared = 0;
      for (const token of tokensOf(post)) if (currentTokens.has(token)) shared += 1;
      const sameCategory = current?.category && post.category && post.category === current.category ? 2 : 0;
      return { post, score: shared + sameCategory, position };
    })
    .sort((a, b) => b.score - a.score || a.position - b.position);

  const related = scored.filter((entry) => entry.score > 0).slice(0, limit).map((entry) => entry.post);
  for (const entry of scored) {
    if (related.length >= limit) break;
    if (!related.includes(entry.post)) related.push(entry.post);
  }

  return {
    related: related.map(toLink),
    newer: newer ? toLink(newer) : null,
    older: older ? toLink(older) : null
  };
}
