// controllers/adminBlogController.js
import BlogPostModel from '../models/BlogPostModel.js';
import { v2 as cloudinary } from 'cloudinary';
import { sanitizeArticleHtml } from '../services/contentAgent/articleSanitizer.js';

/* ---------- Hilfsfunktion: Buffer → Cloudinary ---------- */
function uploadBufferToCloudinary(buffer, folder = 'blog_images') {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, format: 'webp' },        // Auto-WebP, Ordner
      (error, result) => (error ? reject(error) : resolve(result))
    );
    stream.end(buffer);                  // Buffer in den Stream schreiben
  });
}

function isUnpublishedAiDraft(post) {
  return post?.generated_by_ai === true && post?.published !== true;
}

function contentAgentDraftUrl(postId) {
  return `/admin/content-agent/drafts/${encodeURIComponent(postId)}/edit`;
}

function rejectLegacyAiDraft(res, postId) {
  return res.status(409).send(
    `KI-Entwürfe dürfen ausschließlich im Content-Agent-Review geändert oder abgelehnt werden: `
    + contentAgentDraftUrl(postId)
  );
}

/* ---------- GET /admin/blog/new ---------- */
export function newPostForm(req, res) {
  res.render('admin/newPost', { title: "Neuen Blog-Artikel anlegen" });           // dein Formular-Template
}

/* ---------- POST /admin/blog/new ---------- */
export async function createPost(req, res) {
  try {
    const {
      title,
      excerpt = '',
      slug = '',
      content,
      category = '',
      featured,
      description = '',                   // optional, falls im Formular
      faq_json : faqRaw = ''                       // optional, falls im Formular
    } = req.body;

    let faq_json = [];
    if (typeof faqRaw === 'string' && faqRaw.trim()) {
      try {
        // Typografische Anführungszeichen notfalls ersetzen:
        const normalized = faqRaw
          .replace(/[“”]/g, '"')
          .replace(/[‘’]/g, "'");
        faq_json = JSON.parse(normalized);
        if (!Array.isArray(faq_json)) faq_json = [];
      } catch (e) {
        // Hier kannst du auch 400 zurückgeben – ich fallbacke auf [] und logge
        console.warn('FAQ JSON parse warn:', e.message);
        faq_json = [];
      }
    }

    if (!req.file) throw new Error('Bild fehlt');

    /* Bild zu Cloudinary hochladen */
    const { secure_url, public_id } = await uploadBufferToCloudinary(req.file.buffer);

    await BlogPostModel.create({
      title,
      excerpt,
      slug,
      content,
      hero_image: secure_url,       // oder image_url – je nach Spalte
      hero_public_id: public_id,
      category,
      featured: !!featured,
      description,
      faq_json,
      published: req.body.published === 'on'
    });

    res.redirect('/admin/blog');
  } catch (err) {
    console.error('createPost-Fehler:', err);
    res.status(500).send('Fehler beim Erstellen');
  }
}

/* ---------- GET /admin/blog/:id/edit ---------- */
export async function editPostForm(req, res) {
  const post = await BlogPostModel.findById(req.params.id);
  if (!post) return res.status(404).send('Post nicht gefunden');
  if (isUnpublishedAiDraft(post)) {
    return res.redirect(contentAgentDraftUrl(post.id));
  }
  res.render('admin/editPost', { title: "Bestehenden Blog-Post bearbeiten", post });
}

/* ---------- POST /admin/blog/:id/edit ---------- */
export async function updatePost(req, res) {
  try {
    const id = req.params.id;
    const current = await BlogPostModel.findById(id);
    if (!current) return res.status(404).send('Post nicht gefunden');

    if (isUnpublishedAiDraft(current)) return rejectLegacyAiDraft(res, id);

    let hero_image, hero_public_id;

    /* falls neues Bild hochgeladen wurde */
    if (req.file) {
      // altes Bild löschen (wenn public_id gespeichert)
      if (current.hero_public_id) {
        try { await cloudinary.uploader.destroy(current.hero_public_id); } catch { }
      }
      const up = await uploadBufferToCloudinary(req.file.buffer);
      hero_image = up.secure_url;
      hero_public_id = up.public_id;
    }

    await BlogPostModel.update(id, {
      title: req.body.title,
      excerpt: req.body.excerpt,
      content: req.body.content,
      category: req.body.category,
      featured: req.body.featured !== undefined ? !!req.body.featured : undefined,
      image_url: hero_image,         // oder hero_image – je nach Spalte
      hero_public_id,
      published: req.body.publication_control === '1'
        ? req.body.published === 'on'
        : undefined
    });

    res.redirect('/admin/blog');
  } catch (err) {
    console.error('updatePost-Fehler:', err);
    res.status(500).send('Fehler beim Aktualisieren');
  }
}

/* ---------- POST /admin/blog/:id/delete ---------- */
export async function deletePost(req, res) {
  try {
    const current = await BlogPostModel.findById(req.params.id);
    if (!current) return res.status(404).send('Post nicht gefunden');
    if (isUnpublishedAiDraft(current)) return rejectLegacyAiDraft(res, req.params.id);
    const deleted = await BlogPostModel.delete(req.params.id);
    if (!deleted) return res.status(404).send('Post nicht gefunden');

    // Bild in Cloudinary entfernen
    if (deleted.hero_public_id) {
      try { await cloudinary.uploader.destroy(deleted.hero_public_id); } catch { }
    }

    res.redirect('/admin/blog');
  } catch (err) {
    if (err?.code === 'BLOG_POST_DELETE_RESTRICTED') {
      return res.status(409).send(
        'Artikel mit Veröffentlichungsprotokoll dürfen aus Auditgründen nicht gelöscht werden.'
      );
    }
    console.error('deletePost-Fehler:', err);
    return res.status(500).send('Fehler beim Löschen');
  }
}

export async function listAdminPosts(req, res) {
  const posts = await BlogPostModel.findAllAdmin();
  res.render('admin/blogList', {
    title: 'Blog-Verwaltung',
    posts
  });
}

export async function previewPost(req, res) {
  const post = await BlogPostModel.findById(req.params.id);
  if (!post) return res.status(404).send('Post nicht gefunden');
  if (post.content_format !== 'static_html') {
    return res.status(400).send('Die sichere Vorschau ist nur für statische HTML-Entwürfe verfügbar.');
  }
  const renderedContent = sanitizeArticleHtml(post.content)
    .replace(/<h1(\b[^>]*)>/gi, '<h2$1>')
    .replace(/<\/h1>/gi, '</h2>');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  return res.render('admin/blogPreview', {
    title: `Vorschau: ${post.title}`,
    post,
    renderedContent
  });
}
