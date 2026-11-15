import test from 'node:test';
import assert from 'node:assert/strict';

test('known guide assets use compressed responsive WebP with intrinsic dimensions', async () => {
  const { contentImage } = await import('../helpers/contentImage.js');
  for (const source of ['/images/ratgeber/Kosten.png', '/images/ratgeber/website-kosten-berlin.webp']) {
    const image = contentImage(source);
    assert.equal(image.src, '/images/ratgeber/Kosten.webp');
    assert.equal(image.width, 1200);
    assert.equal(image.height, 900);
    assert.equal(image.srcset, '/images/ratgeber/Kosten-600.webp 600w, /images/ratgeber/Kosten.webp 1200w');
  }
});

test('Cloudinary variants use automatic format and quality without changing unrelated or signed URLs', async () => {
  const { contentImage } = await import('../helpers/contentImage.js');
  const image = contentImage('https://res.cloudinary.com/example/image/upload/v123/photo.jpg');
  assert.match(image.src, /upload\/f_auto,q_auto,w_1200\//);
  assert.match(image.srcset, /w_600\/v123\/photo.jpg 600w/);
  assert.equal(contentImage('https://example.com/photo.jpg').srcset, '');
  const transformed = 'https://res.cloudinary.com/example/image/upload/c_fill,w_800/v123/photo.jpg';
  assert.equal(contentImage(transformed).src, transformed);
  assert.equal(contentImage(transformed).srcset, '');
  const signed = 'https://res.cloudinary.com/example/image/upload/s--signature--/v123/photo.jpg';
  assert.equal(contentImage(signed).src, signed);
});
