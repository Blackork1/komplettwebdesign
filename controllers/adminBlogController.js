// controllers/adminBlogController.js
import BlogPostModel from '../models/BlogPostModel.js';
import { v2 as cloudinary } from 'cloudinary';

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

/* ---------- GET /admin/blog/new ---------- */
export function newPostForm(req, res) {
  res.render('admin/newPost', {title: "Neuen Blog-Artikel anlegen"});           // dein Formular-Template
}

/* ---------- POST /admin/blog/new ---------- */
export async function createPost(req, res) {
  try {
    const {
      title,
      excerpt   = '',
      slug      = '',
      content,
      category  = '',
      featured,
      description = ''                   // optional, falls im Formular
    } = req.body;

    if (!req.file) throw new Error('Bild fehlt');

    /* Bild zu Cloudinary hochladen */
    const { secure_url, public_id } = await uploadBufferToCloudinary(req.file.buffer);

    await BlogPostModel.create({
      title,
      excerpt,
      slug,
      content,
      hero_image     : secure_url,       // oder image_url – je nach Spalte
      hero_public_id : public_id,
      category,
      featured: !!featured,
      description
    });

    res.redirect('/blog');
  } catch (err) {
    console.error('createPost-Fehler:', err);
    res.status(500).send('Fehler beim Erstellen');
  }
}

/* ---------- GET /admin/blog/:id/edit ---------- */
export async function editPostForm(req, res) {
  const post = await BlogPostModel.findById(req.params.id);
  if (!post) return res.status(404).send('Post nicht gefunden');
  res.render('admin/editPost', { title: "Bestehenden Blog-Post bearbeiten" ,post });
}

/* ---------- POST /admin/blog/:id/edit ---------- */
export async function updatePost(req, res) {
  try {
    const id      = req.params.id;
    const current = await BlogPostModel.findById(id);
    if (!current) return res.status(404).send('Post nicht gefunden');

    let hero_image, hero_public_id;

    /* falls neues Bild hochgeladen wurde */
    if (req.file) {
      // altes Bild löschen (wenn public_id gespeichert)
      if (current.hero_public_id) {
        try { await cloudinary.uploader.destroy(current.hero_public_id); } catch {}
      }
      const up = await uploadBufferToCloudinary(req.file.buffer);
      hero_image     = up.secure_url;
      hero_public_id = up.public_id;
    }

    await BlogPostModel.update(id, {
      title     : req.body.title,
      excerpt   : req.body.excerpt,
      content   : req.body.content,
      category  : req.body.category,
      featured  : req.body.featured !== undefined ? !!req.body.featured : undefined,
      image_url : hero_image,         // oder hero_image – je nach Spalte
      hero_public_id
    });

    res.redirect('/blog');
  } catch (err) {
    console.error('updatePost-Fehler:', err);
    res.status(500).send('Fehler beim Aktualisieren');
  }
}

/* ---------- POST /admin/blog/:id/delete ---------- */
export async function deletePost(req, res) {
  try {
    const deleted = await BlogPostModel.delete(req.params.id);
    if (!deleted) return res.status(404).send('Post nicht gefunden');

    // Bild in Cloudinary entfernen
    if (deleted.hero_public_id) {
      try { await cloudinary.uploader.destroy(deleted.hero_public_id); } catch {}
    }

    res.redirect('/blog');
  } catch (err) {
    console.error('deletePost-Fehler:', err);
    res.status(500).send('Fehler beim Löschen');
  }
}

export async function listAdminPosts(req, res) {
  const posts = await BlogPostModel.findAll();      // oder findAllAdmin()
  res.render('admin/blogList', {
    title: 'Blog-Verwaltung',
    posts
  });
}