// controllers/adminRatgeberController.js
import RatgeberModel from '../models/RatgeberModel.js';
import { v2 as cloudinary } from 'cloudinary';

/* ---------- Buffer → Cloudinary ---------- */
function uploadBufferToCloudinary(buffer, folder = 'ratgeber_images') {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, format: 'webp' },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    stream.end(buffer);
  });
}

/* ---------- GET /admin/ratgeber/new ---------- */
export function newGuideForm(req, res) {
  res.render('admin/newRatgeber', { title: 'Neuen Ratgeber anlegen' });
}

/* ---------- POST /admin/ratgeber/new ---------- */
export async function createGuide(req, res) {
  try {
    const {
      title,
      excerpt = '',
      slug = '',
      content,
      category = '',
      featured,
      description = '',
      faq_json: faqRaw = ''
    } = req.body;

    // FAQ JSON robust parsen
    let faq_json = [];
    if (typeof faqRaw === 'string' && faqRaw.trim()) {
      try {
        const normalized = faqRaw.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
        faq_json = JSON.parse(normalized);
        if (!Array.isArray(faq_json)) faq_json = [];
      } catch (e) {
        console.warn('FAQ JSON parse warn (Ratgeber):', e.message);
        faq_json = [];
      }
    }

    if (!req.file) throw new Error('Bild fehlt');

    // Bild hochladen
    const { secure_url, public_id } = await uploadBufferToCloudinary(req.file.buffer);

    await RatgeberModel.create({
      title,
      excerpt,
      slug,
      content,
      hero_image: secure_url,
      hero_public_id: public_id,
      category,
      featured: !!featured,
      description,
      faq_json
    });

    res.redirect('/ratgeber');
  } catch (err) {
    console.error('createGuide-Fehler:', err);
    res.status(500).send('Fehler beim Erstellen');
  }
}

/* ---------- GET /admin/ratgeber/:id/edit ---------- */
export async function editGuideForm(req, res) {
  const post = await RatgeberModel.findById(req.params.id);
  if (!post) return res.status(404).send('Ratgeber nicht gefunden');
  res.render('admin/editRatgeber', { title: 'Ratgeber bearbeiten', post });
}

/* ---------- POST /admin/ratgeber/:id/edit ---------- */
export async function updateGuide(req, res) {
  try {
    const id = req.params.id;
    const current = await RatgeberModel.findById(id);
    if (!current) return res.status(404).send('Ratgeber nicht gefunden');

    let image_url, hero_public_id;

    if (req.file) {
      // altes Bild löschen
      if (current.hero_public_id) {
        try { await cloudinary.uploader.destroy(current.hero_public_id); } catch {}
      }
      const up = await uploadBufferToCloudinary(req.file.buffer);
      image_url = up.secure_url;
      hero_public_id = up.public_id;
    }

    await RatgeberModel.update(id, {
      title: req.body.title,
      excerpt: req.body.excerpt,
      content: req.body.content,
      category: req.body.category,
      featured: req.body.featured !== undefined ? !!req.body.featured : undefined,
      image_url,
      hero_public_id
    });

    res.redirect('/ratgeber');
  } catch (err) {
    console.error('updateGuide-Fehler:', err);
    res.status(500).send('Fehler beim Aktualisieren');
  }
}

/* ---------- POST /admin/ratgeber/:id/delete ---------- */
export async function deleteGuide(req, res) {
  try {
    const deleted = await RatgeberModel.delete(req.params.id);
    if (!deleted) return res.status(404).send('Ratgeber nicht gefunden');

    if (deleted.hero_public_id) {
      try { await cloudinary.uploader.destroy(deleted.hero_public_id); } catch {}
    }

    res.redirect('/ratgeber');
  } catch (err) {
    console.error('deleteGuide-Fehler:', err);
    res.status(500).send('Fehler beim Löschen');
  }
}

/* ---------- GET /admin/ratgeber ---------- */
export async function listAdminGuides(req, res) {
  const posts = await RatgeberModel.findAll();
  res.render('admin/ratgeberList', {
    title: 'Ratgeber-Verwaltung',
    posts
  });
}
