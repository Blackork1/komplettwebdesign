import slugify from 'slugify';

const NO_TEXT_SUFFIX = 'Ohne Schrift, Buchstaben, Wörter, Logos, Wasserzeichen oder UI-Text.';

function safePublicId(filename) {
  const basename = String(filename || '')
    .split(/[\\/]/)
    .at(-1)
    .replace(/\.webp$/i, '');
  return slugify(basename, { lower: true, strict: true }).slice(0, 100) || 'article-image';
}

function imagePrompt(prompt) {
  const normalized = String(prompt || '').replace(/\s+/g, ' ').trim().replace(/[.!?]+$/, '');
  if (!normalized) throw new TypeError('Für die Bildgenerierung wird ein Prompt benötigt.');
  return `${normalized}. ${NO_TEXT_SUFFIX}`;
}

function uploadWebp({ cloudinary, buffer, publicId }) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      folder: 'blog_images',
      format: 'webp',
      public_id: publicId
    }, (error, result) => {
      if (error) return reject(error);
      if (!result?.secure_url || !result?.public_id) {
        return reject(new Error('Cloudinary lieferte kein vollständiges Upload-Ergebnis.'));
      }
      return resolve(result);
    });

    stream.on?.('error', reject);
    stream.end(buffer);
  });
}

export async function generateAndUploadImage({
  prompt,
  filename,
  config,
  openai,
  cloudinary
}) {
  if (!openai?.images?.generate) throw new TypeError('Ein OpenAI-Bildclient wird benötigt.');
  if (!cloudinary?.uploader?.upload_stream) throw new TypeError('Ein Cloudinary-Client wird benötigt.');

  const generated = await openai.images.generate({
    model: config.imageModel,
    prompt: imagePrompt(prompt),
    size: '1536x1024',
    quality: 'medium'
  });
  const encoded = generated?.data?.[0]?.b64_json;
  if (typeof encoded !== 'string' || encoded.length === 0) {
    throw new Error('OpenAI lieferte keine Bilddaten.');
  }

  const buffer = Buffer.from(encoded, 'base64');
  if (buffer.length === 0) throw new Error('OpenAI lieferte leere Bilddaten.');

  const uploaded = await uploadWebp({
    cloudinary,
    buffer,
    publicId: safePublicId(filename)
  });

  return {
    imageUrl: uploaded.secure_url,
    publicId: uploaded.public_id,
    bytes: Number(uploaded.bytes) || buffer.length
  };
}
