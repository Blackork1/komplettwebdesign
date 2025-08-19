import ejs from 'ejs';
import BlogPostModel from '../models/BlogPostModel.js';
import { isoOffset, isoAtNoon } from '../util/date.js';


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

export async function listPosts(req, res) {
  const posts = await BlogPostModel.findAll();
  const featuredPosts = await BlogPostModel.findFeatured(5);
  res.render('blog/index', { title: "Aktuelles und News aus dem Technikbereich sowie Rabattaktionen", description: "Neue Informationen zu KI, Websiten, Wissenswertes sowie Angebote und Rabattaktionen.", posts, featuredPosts });
}

export async function showPost(req, res) {
  const post = await BlogPostModel.findBySlug(req.params.slug);
  if (!post) return res.status(404).send('Artikel nicht gefunden');

  // Beschreibung/Excerpt bestimmen (DB-Excerpt bevorzugt)
  let desc = (post.excerpt && post.excerpt.trim()) || '';
  // EJS im Content rendern; im Template sind post.* und helpers verfügbar
  const publishedISO = isoOffset(post.created_at);      // ergibt z.B. 2025-08-19T12:00:00+02:00
  const modifiedISO = isoOffset(post.updated_at);      // echte Zeit mit Offset
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
  if (!desc) {
    const textOnly = stripHtml(renderedContent);
    desc = textOnly.slice(0, 160) + (textOnly.length > 160 ? '…' : '');
  }

  // ISO mit Offset:
  // – willst du IMMER 12:00 Uhr? -> isoAtNoon(...)
  // – sonst die echte Uhrzeit beibehalten -> isoOffset(...)


  const base = (process.env.BASE_URL || '').replace(/\/$/, '');
  const canonicalUrl = base ? `${base}/blog/${post.slug}` : `/blog/${post.slug}`;

  res.render('blog/show', {
    // SEO/OG Variablen EXPLIZIT fürs Template
    title: post.title,
    description: post.description,
    excerpt: desc,
    og_image: post.image_url,
    og_url: canonicalUrl,
    slug: post.slug,

    // Daten für die View
    post: { ...post, description: desc }, // damit <%= post.description %> auch in Views geht
    renderedContent
  });
}
