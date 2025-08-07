// Define aspect ratios and resolution options
export const LANDSCAPE_RATIOS = ['16:9','4:3','3:2','21:9','5:4','4:4','16:10','7:5','2:1','5:3','6:5'];
export const PORTRAIT_RATIOS   = ['9:16','3:4','2:3','4:5','10:16','5:7','1:2','3:5','2:5','5:8'];
export const RESOLUTIONS = [480,720,960,1080,1200,1280,1440,1600,1920,2048,2160,2400,2560,3000,3200,3840,4096,4500,5000,6000];

function uploadBuffer(cloud, buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloud.uploader.upload_stream(options, (err, result) => {
      if (err) reject(err); else resolve(result);
    });
    stream.end(buffer);
  });
}

export async function uploadImage(req, res) {
  try {
    if (!req.file) return res.redirect('back');
    const db = req.app.get('db');
    const cloud = req.app.get('cloudinary');
    const { orientation, ratio, resolution, quality } = req.body;
    const [rW, rH] = ratio.split(':').map(Number);
    const resVal = parseInt(resolution, 10);
    const qual   = parseInt(quality, 10) || 'auto';
    let width, height;
    if (orientation === 'landscape') {
      width  = resVal;
      height = Math.round(width * rH / rW);
    } else {
      height = resVal;
      width  = Math.round(height * rW / rH);
    }
    const result = await uploadBuffer(cloud, req.file.buffer, {
      folder: 'admin_gallery',
      format: 'webp',
      tags: ['admin_gallery', orientation],
      transformation: [{ width, height, crop: 'fill', quality: qual }]
    });
    const src = result.secure_url;
    const publicId = result.public_id;
    await db.query(
      'INSERT INTO gallery (orientation, src, public_id) VALUES ($1,$2,$3)',
      [orientation, src, publicId]
    );
    res.redirect('/admin/gallery');
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).send('Fehler beim Hochladen');
  }
}

export async function renderGallery(req, res) {
  const db = req.app.get('db');
  const filter = req.params.filter;
  try {
    let rows;
    if (filter === 'portrait' || filter === 'landscape') {
      ({ rows } = await db.query(
        'SELECT id, src, public_id, orientation FROM gallery WHERE orientation=$1 ORDER BY id DESC',
        [filter]
      ));
    } else {
      ({ rows } = await db.query('SELECT id, src, public_id, orientation FROM gallery ORDER BY id DESC'));
    }
    res.render('admin/gallery', {
      title: 'Galerie',
      images: rows,
      filter: filter || 'all',
      LANDSCAPE_RATIOS,
      PORTRAIT_RATIOS,
      RESOLUTIONS
    });
  } catch (err) {
    console.error('Fetch gallery error:', err);
    res.render('admin/gallery', {
      title: 'Galerie',
      images: [],
      filter: filter || 'all',
      LANDSCAPE_RATIOS,
      PORTRAIT_RATIOS,
      RESOLUTIONS
    });
  }
}

export async function deleteImage(req, res) {
  try {
    const db = req.app.get('db');
    const cloud = req.app.get('cloudinary');
    const { id } = req.params;
    const { rows } = await db.query('SELECT public_id FROM gallery WHERE id=$1', [id]);
    if (!rows.length) return res.status(404).send('Kein Datensatz');
    const { public_id } = rows[0];
    if (public_id) {
      try {
        await cloud.uploader.destroy(public_id);
        console.log(`✅ Cloudinary-Asset ${public_id} gelöscht.`);
      } catch { }
    }
    await db.query('DELETE FROM gallery WHERE id=$1', [id]);
    res.redirect('back');
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).send('Fehler beim Löschen');
  }
}