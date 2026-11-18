// Blog- und Ratgeberartikel für /llms.txt und /llms-full.txt, gefiltert wie in der Sitemap:
// keine weitergeleiteten oder auf noindex gesetzten Artikel. Fällt die Datenbank aus,
// bleiben die Listen leer und die Datei wird trotzdem ausgeliefert.
import BlogPostModel from '../models/BlogPostModel.js';
import RatgeberModel from '../models/RatgeberModel.js';
import { SEO_RECOVERY_REDIRECTS } from '../data/seoIntentRegistry.js';
import { SEO_GUIDE_CLUSTER } from '../data/seoGuideCluster.js';

const pick = (row) => ({ slug: row.slug, title: row.title, description: row.description || row.excerpt || '' });
const isRedirectedGuide = (slug) => Boolean(SEO_RECOVERY_REDIRECTS[`/ratgeber/${slug}`]);

export async function loadLlmsListings({ blog = BlogPostModel, ratgeber = RatgeberModel } = {}) {
  const [posts, guides] = await Promise.all([
    blog.findRelatedCandidates().catch(() => []),
    ratgeber.findAll().catch(() => [])
  ]);
  const guideRows = [...guides, ...SEO_GUIDE_CLUSTER.filter((guide) => guide.published !== false)];
  const seen = new Set();
  return {
    posts: posts.filter((post) => post.slug && post.title).map(pick),
    guides: guideRows
      .filter((guide) => guide.slug && guide.title && !isRedirectedGuide(guide.slug))
      .filter((guide) => (seen.has(guide.slug) ? false : seen.add(guide.slug)))
      .map(pick)
  };
}
