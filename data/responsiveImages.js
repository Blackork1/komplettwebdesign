// Kleinere Varianten großer Bilder für srcset, damit Handys nicht die Desktop-Datei laden.
// Schlüssel: Bildpfad im src-Attribut. Werte: [Breite in Pixeln, Datei], aufsteigend.
export const RESPONSIVE_IMAGES = Object.freeze({
  '/images/home-hero-sauber-desktop.webp': [
    [720, '/images/home-hero-sauber-desktop-720.webp'],
    [1152, '/images/home-hero-sauber-desktop.webp']
  ],
  '/images/home-hero-filmfestival-mediathek-880.webp': [
    [480, '/images/home-hero-filmfestival-mediathek-480.webp'],
    [880, '/images/home-hero-filmfestival-mediathek-880.webp']
  ],
  '/images/home-hero-backstube-mobile.webp': [
    [240, '/images/home-hero-backstube-mobile-240.webp'],
    [360, '/images/home-hero-backstube-mobile-360.webp'],
    [574, '/images/home-hero-backstube-mobile.webp']
  ],
  '/images/home-fit-beratung.webp': [
    [720, '/images/home-fit-beratung-720.webp'],
    [1280, '/images/home-fit-beratung.webp']
  ],
  '/images/webdesign-berlin-individuelles-webdesign.webp': [
    [720, '/images/webdesign-berlin-individuelles-webdesign-720.webp'],
    [1100, '/images/webdesign-berlin-individuelles-webdesign.webp']
  ],
  '/images/home-referenz-backstube.webp': [
    [760, '/images/home-referenz-backstube-760.webp'],
    [1840, '/images/home-referenz-backstube.webp']
  ]
});

export function srcsetFor(src) {
  const variants = RESPONSIVE_IMAGES[src];
  return variants ? variants.map(([width, file]) => `${file} ${width}w`).join(', ') : '';
}
