// controllers/ratgeberController.js
import ejs from 'ejs';
import RatgeberModel from '../models/RatgeberModel.js';
import { isoOffset, isoAtNoon } from '../util/date.js';

/* ---------- Helper: EJS aus DB-Inhalten sicher rendern ---------- */
function renderDbEjs(template, locals = {}) {
  try {
    return ejs.render(template || '', locals, {
      rmWhitespace: true,
      filename: 'db://guide-content' // nur für bessere Fehlermeldungen
    });
  } catch (err) {
    console.error('EJS-Renderfehler im DB-Content (Ratgeber):', err);
    return template || '';
  }
}

/* ---------- Helper: HTML → Text ---------- */
function stripHtml(html) {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/* ---------- GET /ratgeber ---------- */
export async function listGuides(req, res) {
  const posts = await RatgeberModel.findAll();
  const featuredPosts = await RatgeberModel.findFeatured(5);

  res.render('ratgeber/index', {
    title: 'Ratgeber – Webdesign, SEO, Kosten & Zeitpläne',
    description: 'Praxisnahe Ratgeber zu Webdesign, Performance und SEO – mit Beispielen, Checklisten und realistischen Zeitplänen.',
    posts,
    featuredPosts
  });
}

/* ---------- GET /ratgeber/:slug ---------- */
export async function showGuide(req, res) {
  const post = await RatgeberModel.findBySlug(req.params.slug);
  if (!post) return res.status(404).send('Ratgeber nicht gefunden');

  // ISO-Timestamps mit Offset
  const publishedISO = isoOffset(post.created_at);
  const modifiedISO  = isoOffset(post.updated_at);

  // FAQ robust parsen (Array ODER JSON-String)
  let faqArray = [];
  if (Array.isArray(post.faq_json)) {
    faqArray = post.faq_json;
  } else if (typeof post.faq_json === 'string' && post.faq_json.trim().startsWith('[')) {
    try { faqArray = JSON.parse(post.faq_json); } catch { faqArray = []; }
  }

  // DB-Content (EJS) rendern
  const renderedContent = renderDbEjs(post.content, {
    post: { ...post, description: post.description },
    modifiedISO,
    publishedISO,
    og_image: post.image_url,
    locale: 'de_DE',
    helpers: {
      date: d => new Date(d).toLocaleDateString('de-DE')
    }
  });

  // Beschreibung/Excerpt fallback
  let desc = (post.excerpt && post.excerpt.trim()) || '';
  if (!desc) {
    const textOnly = stripHtml(renderedContent);
    desc = textOnly.slice(0, 160) + (textOnly.length > 160 ? '…' : '');
  }

  const base = (res.locals.canonicalBaseUrl || process.env.BASE_URL || 'https://komplettwebdesign.de').replace(/\/$/, '');
  const canonicalUrl = base ? `${base}/ratgeber/${post.slug}` : `/ratgeber/${post.slug}`;

  // ---- SEO Head-Block als String (analog Blog) ----
  const seoExtra = `
  <link rel="canonical" href="${canonicalUrl}">
  <!-- Open Graph -->
  <meta property="og:type" content="article">
  <meta property="og:title" content="${ejs.escapeXML(post.title)}">
  <meta property="og:description" content="${ejs.escapeXML(post.description || desc)}">
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
      { "@type": "ListItem", "position": 2, "name": "Ratgeber", "item": `${base}/ratgeber` },
      { "@type": "ListItem", "position": 3, "name": post.title, "item": canonicalUrl }
    ]
  }, null, 2)}
  </script>

  <!-- JSON-LD: BlogPosting (gewünscht „wie Blog“) -->
  <script type="application/ld+json">
  ${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "description": post.description || desc,
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

  res.render('ratgeber/show', {
    // SEO/OG Variablen
    title: post.title,
    description: post.description || desc,
    excerpt: desc,
    og_image: post.image_url,
    og_url: canonicalUrl,

    // Daten für die View
    post: { ...post, description: desc, faq_json: faqArray },
    publishedISO,
    modifiedISO,
    renderedContent,

    // Head-Injektion
    seoExtra
  });
}
