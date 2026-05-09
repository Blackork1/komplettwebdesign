import ejs from 'ejs';
import BlogPostModel from '../models/BlogPostModel.js';
import { isoOffset, isoAtNoon } from '../util/date.js';

const BLOG_PAGE_SIZE = 10;


function renderDbEjs(template, locals = {}) {
  try {
    return ejs.render(template || '', locals, {
      rmWhitespace: true,
      filename: 'db://post-content' // nur für bessere Fehlermeldungen
    });
  } catch (err) {
    console.error('EJS-Renderfehler im DB-Content:', err);
    return template || '';
  }
}

function stripHtml(html) {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseNonNegativeInteger(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

function renderPostCard(res, post, idx) {
  return new Promise((resolve, reject) => {
    res.render('blog/partials/post-card', { post, idx }, (err, html) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(html);
    });
  });
}

export async function listPosts(req, res) {
  const [posts, totalPosts, featuredPosts] = await Promise.all([
    BlogPostModel.findPage({ limit: BLOG_PAGE_SIZE, offset: 0 }),
    BlogPostModel.countPublished(),
    BlogPostModel.findFeatured(5)
  ]);
  res.render('blog/index', {
    title: "Aktuelles und News aus dem Technikbereich sowie Rabattaktionen",
    description: "Neue Informationen zu KI, Websiten, Wissenswertes sowie Angebote und Rabattaktionen.",
    posts,
    featuredPosts,
    totalPosts,
    pageSize: BLOG_PAGE_SIZE
  });
}

export async function listPostsPage(req, res) {
  try {
    const offset = parseNonNegativeInteger(req.query.offset, 0);
    const requestedLimit = parseNonNegativeInteger(req.query.limit, BLOG_PAGE_SIZE);
    const limit = Math.min(Math.max(requestedLimit, 1), BLOG_PAGE_SIZE);
    const [posts, totalPosts] = await Promise.all([
      BlogPostModel.findPage({ limit, offset }),
      BlogPostModel.countPublished()
    ]);
    const html = (await Promise.all(
      posts.map((post, idx) => renderPostCard(res, post, offset + idx))
    )).join('');
    const nextOffset = offset + posts.length;

    res.json({
      html,
      count: posts.length,
      nextOffset,
      hasMore: nextOffset < totalPosts,
      totalPosts
    });
  } catch (err) {
    console.error('Blog-Artikel konnten nicht nachgeladen werden:', err);
    res.status(500).json({ error: 'Artikel konnten nicht geladen werden.' });
  }
}

export async function showPost(req, res) {
  const post = await BlogPostModel.findBySlug(req.params.slug);
  if (!post) return res.status(404).send('Artikel nicht gefunden');


  // EJS im Content rendern; im Template sind post.* und helpers verfügbar
  const publishedISO = isoOffset(post.created_at);      // ergibt z.B. 2025-08-19T12:00:00+02:00
  const modifiedISO = isoOffset(post.updated_at);      // echte Zeit mit Offset

  // FAQ robust: JSONB (Array) ODER Text, der JSON enthält
  let faqArray = [];
  if (Array.isArray(post.faq_json)) {
    faqArray = post.faq_json;
  } else if (typeof post.faq_json === 'string' && post.faq_json.trim().startsWith('[')) {
    try { faqArray = JSON.parse(post.faq_json); } catch { faqArray = []; }
  }

  const renderedContent = renderDbEjs(post.content, {
    post: { ...post, description: post.description }, // erlaubt <%= post.description %> im DB-Content
    modifiedISO,
    publishedISO,
    og_image: post.image_url,
    locale: 'de_DE',
    helpers: {
      date: d => new Date(d).toLocaleDateString('de-DE')
    }
  });

  // Beschreibung/Excerpt bestimmen (DB-Excerpt bevorzugt)
  let desc = (post.excerpt && post.excerpt.trim()) || (post.excerpt && post.excerpt.trim()) || '';
  if (!desc) {
    const textOnly = stripHtml(renderedContent);
    desc = textOnly.slice(0, 160) + (textOnly.length > 160 ? '…' : '');
  }

  const base = (res.locals.canonicalBaseUrl || process.env.BASE_URL || 'https://komplettwebdesign.de').replace(/\/$/, '');
  const canonicalUrl = base ? `${base}/blog/${post.slug}` : `/blog/${post.slug}`;

  // --- SEO Head-Block zusammenbauen (als String) ---
  const seoExtra = `
  <link rel="canonical" href="${canonicalUrl}">
  <!-- Open Graph -->
  <meta property="og:type" content="article">
  <meta property="og:title" content="${ejs.escapeXML(post.title)}">
  <meta property="og:description" content="${ejs.escapeXML(post.description)}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:site_name" content="Komplett Webdesign">
  <meta property="og:locale" content="de_DE">
  <meta property="og:image" content="${ejs.escapeXML(post.image_url || '')}">
  <meta property="og:image:alt" content="Hero Bild für ${ejs.escapeXML(post.title)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="675">
  <meta property="article:published_time" content="${publishedISO}">
  <meta property="article:modified_time" content="${modifiedISO}">

  <!-- JSON-LD: BreadcrumbList -->
  <script type="application/ld+json">
  ${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Startseite", "item": `${base}/` },
      { "@type": "ListItem", "position": 2, "name": "Blog", "item": `${base}/blog` },
      { "@type": "ListItem", "position": 3, "name": post.title, "item": canonicalUrl }
    ]
  }, null, 2)}
  </script>

  <!-- JSON-LD: BlogPosting -->
  <script type="application/ld+json">
  ${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "description": post.description,
    "url": canonicalUrl,
    "mainEntityOfPage": canonicalUrl,
    "image": {
      "@type": "ImageObject",
      "url": post.image_url || '',
      "width": 1200,
      "height": 675
    },
    "author": { "@type": "Organization", "name": "Komplett Webdesign" },
    "publisher": {
      "@type": "Organization",
      "name": "Komplett Webdesign",
      "logo": { "@type": "ImageObject", "url": `${base}/images/LogoTransparent.webp` }
    },
    "datePublished": publishedISO,
    "dateModified": modifiedISO
  }, null, 2)}
  </script>

  <!-- JSON-LD: FAQPage -->
  <script type="application/ld+json">
  ${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqArray
  }, null, 2)}
  </script>
  `;

  res.render('blog/show', {
    // SEO/OG Variablen EXPLIZIT fürs Template
    title: post.title,
    description: post.description,
    excerpt: desc,
    og_image: post.image_url,
    og_url: canonicalUrl,
    slug: post.slug,
    post: post,

    // Daten für die View
    post: { ...post, description: desc, faq_json: faqArray}, // damit <%= post.description %> auch in Views geht
    publishedISO,
    modifiedISO,
    renderedContent,

    // Head-Injektion
    seoExtra
  });
}
