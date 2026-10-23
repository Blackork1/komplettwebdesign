const guideImages = {
  'Kosten.png': 'Kosten', 'Kosten.webp': 'Kosten', 'website-kosten-berlin.webp': 'Kosten',
  'Ablauf.png': 'Ablauf', 'Ablauf.webp': 'Ablauf', 'website-erstellen-berlin-ablauf-dauer-kosten.webp': 'Ablauf',
  'Relaunch.png': 'Relaunch', 'Relaunch.webp': 'Relaunch', 'website-relaunch-berlin.webp': 'Relaunch',
  'Baukasten.png': 'Baukasten', 'Baukasten.webp': 'Baukasten', 'baukasten-vs-professionelle-website.webp': 'Baukasten'
};

export function contentImage(source = '') {
  const src = String(source || '');
  const guideKey = src.startsWith('/images/ratgeber/') && guideImages[src.split('/').at(-1)];
  if (guideKey) {
    const base = `/images/ratgeber/${guideKey}`;
    return { src: `${base}.webp`, srcset: `${base}-600.webp 600w, ${base}.webp 1200w`, sizes: '(max-width: 700px) 100vw, 1200px', width: 1200, height: 900 };
  }
  const deliveryPath = src.split('/image/upload/')[1] || '';
  const alreadyTransformed = /^(?:[a-z]{1,3}_[^/]*|s--[^/]+)\//i.test(deliveryPath);
  if (!alreadyTransformed && /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/(?!s--)/.test(src)) {
    const variant = width => src.replace('/image/upload/', `/image/upload/f_auto,q_auto,w_${width}/`);
    return { src: variant(1200), srcset: [600, 900, 1200].map(width => `${variant(width)} ${width}w`).join(', '), sizes: '(max-width: 700px) 100vw, 1200px' };
  }
  return { src, srcset: '', sizes: '' };
}
