import { randomUUID } from 'node:crypto';
import slugify from 'slugify';

const IMAGE_FOLDER = 'blog_images';
const NO_TEXT_SUFFIX = 'Ohne Schrift, Buchstaben, Wörter, Logos, Wasserzeichen oder UI-Text.';

export class ContentImageError extends Error {
  constructor(message, { code = 'CONTENT_IMAGE_FAILED', audit = {}, cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'ContentImageError';
    this.code = code;
    this.audit = audit;
  }
}

function safeSlug(value, fallback, maxLength = 80) {
  return slugify(String(value || ''), { lower: true, strict: true }).slice(0, maxLength) || fallback;
}

function safeFilename(filename) {
  const basename = String(filename || '').split(/[\\/]/).at(-1).replace(/\.webp$/i, '');
  return safeSlug(basename, 'article-image');
}

function safeRunId(runId) {
  return safeSlug(`run-${runId}`, 'run-unknown', 48);
}

function safeSuffix(value) {
  return safeSlug(value, randomUUID(), 48);
}

function imagePrompt(prompt) {
  const normalized = String(prompt || '').replace(/\s+/g, ' ').trim().replace(/[.!?]+$/, '');
  if (!normalized) throw new TypeError('Für die Bildgenerierung wird ein Prompt benötigt.');
  return `${normalized}. ${NO_TEXT_SUFFIX}`;
}

function cleanupAudit(status, publicId, code = null) {
  return {
    status,
    publicId,
    ...(code ? { code } : {})
  };
}

export function createContentImageService({ config, openai, cloudinary, idFactory = randomUUID }) {
  if (!openai?.images?.generate) throw new TypeError('Ein OpenAI-Bildclient wird benötigt.');
  if (!cloudinary?.uploader?.upload_stream || !cloudinary?.uploader?.destroy) {
    throw new TypeError('Ein vollständiger Cloudinary-Client wird benötigt.');
  }

  async function deleteImage({ publicId }) {
    try {
      const result = await cloudinary.uploader.destroy(publicId, { invalidate: true });
      if (!['ok', 'not found'].includes(result?.result)) {
        throw new Error('Cloudinary konnte das Bild nicht löschen.');
      }
      return cleanupAudit('completed', publicId);
    } catch (cause) {
      throw new ContentImageError('Bildbereinigung fehlgeschlagen.', {
        code: 'IMAGE_CLEANUP_FAILED',
        cause,
        audit: { cleanup: cleanupAudit('failed', publicId, 'IMAGE_CLEANUP_FAILED') }
      });
    }
  }

  async function uploadWebp({ buffer, publicId, uploadPublicId }) {
    return new Promise((resolve, reject) => {
      let terminal = false;

      async function fail(cause) {
        if (terminal) return;
        terminal = true;
        let cleanup;
        try {
          cleanup = await deleteImage({ publicId });
        } catch (cleanupError) {
          cleanup = cleanupError.audit.cleanup;
        }
        reject(new ContentImageError('Bild-Upload fehlgeschlagen.', {
          code: 'IMAGE_UPLOAD_FAILED',
          cause,
          audit: {
            publicId,
            imageGeneration: { status: 'completed', costIncurred: true },
            upload: { status: 'failed', code: 'IMAGE_UPLOAD_FAILED' },
            cleanup
          }
        }));
      }

      try {
        const stream = cloudinary.uploader.upload_stream({
          folder: IMAGE_FOLDER,
          format: 'webp',
          public_id: uploadPublicId,
          overwrite: false,
          unique_filename: false
        }, (error, result) => {
          if (error) {
            void fail(error);
            return;
          }
          if (terminal) return;
          if (!result?.secure_url || !result?.public_id) {
            void fail(new Error('Unvollständiges Upload-Ergebnis.'));
            return;
          }
          terminal = true;
          resolve(result);
        });

        stream.on?.('error', (error) => void fail(error));
        stream.end(buffer);
      } catch (cause) {
        void fail(cause);
      }
    });
  }

  async function generateAndUploadImage({ prompt, filename, runId }) {
    const uploadPublicId = [safeFilename(filename), safeRunId(runId), safeSuffix(idFactory())].join('-');
    const publicId = `${IMAGE_FOLDER}/${uploadPublicId}`;
    let generated;
    try {
      generated = await openai.images.generate({
        model: config.imageModel,
        prompt: imagePrompt(prompt),
        size: '1536x1024',
        quality: 'medium'
      });
    } catch (cause) {
      throw new ContentImageError('Bildgenerierung fehlgeschlagen.', {
        code: 'IMAGE_GENERATION_FAILED',
        cause,
        audit: {
          publicId,
          imageGeneration: { status: 'failed', costIncurred: true, code: 'IMAGE_GENERATION_FAILED' },
          upload: { status: 'not_started' },
          cleanup: cleanupAudit('not_required', publicId)
        }
      });
    }

    const encoded = generated?.data?.[0]?.b64_json;
    if (typeof encoded !== 'string' || encoded.length === 0) {
      throw new ContentImageError('OpenAI lieferte keine Bilddaten.', {
        code: 'IMAGE_DATA_MISSING',
        audit: {
          publicId,
          imageGeneration: { status: 'failed', costIncurred: true, code: 'IMAGE_DATA_MISSING' },
          upload: { status: 'not_started' },
          cleanup: cleanupAudit('not_required', publicId)
        }
      });
    }

    const buffer = Buffer.from(encoded, 'base64');
    if (buffer.length === 0) {
      throw new ContentImageError('OpenAI lieferte leere Bilddaten.', {
        code: 'IMAGE_DATA_EMPTY',
        audit: {
          publicId,
          imageGeneration: { status: 'failed', costIncurred: true, code: 'IMAGE_DATA_EMPTY' },
          upload: { status: 'not_started' },
          cleanup: cleanupAudit('not_required', publicId)
        }
      });
    }

    const uploaded = await uploadWebp({ buffer, publicId, uploadPublicId });
    return {
      imageUrl: uploaded.secure_url,
      publicId: uploaded.public_id,
      bytes: Number(uploaded.bytes) || buffer.length,
      audit: {
        publicId: uploaded.public_id,
        imageGeneration: { status: 'completed', costIncurred: true },
        upload: { status: 'completed' },
        cleanup: cleanupAudit('not_required', uploaded.public_id)
      }
    };
  }

  return { generateAndUploadImage, deleteImage };
}

export async function generateAndUploadImage({ config, openai, cloudinary, idFactory, ...input }) {
  return createContentImageService({ config, openai, cloudinary, idFactory })
    .generateAndUploadImage(input);
}
