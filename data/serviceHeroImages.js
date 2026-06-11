const heroImageEntries = [
  [
    '/leistungen',
    {
      src: '/images/leistungen/leistungen-uebersicht-hero.webp',
      alt: 'Übersicht der Webdesign-Leistungen mit Website-Struktur, Modulen und Servicebereichen'
    }
  ],
  [
    '/website-erstellen-lassen-berlin',
    {
      src: '/images/leistungen/landingpage-erstellen-lassen-hero.webp',
      alt: 'Landingpage-Visualisierung mit fokussierter Zielseite und Kampagnen-Elementen'
    }
  ],
  [
    '/leistungen/website-relaunch',
    {
      src: '/images/leistungen/website-relaunch-hero.webp',
      alt: 'Abstrakte Relaunch-Visualisierung mit alter und neuer Website-Struktur'
    }
  ],
  [
    '/leistungen/local-seo',
    {
      src: '/images/leistungen/local-seo-hero.webp',
      alt: 'Lokale SEO-Visualisierung mit Standortmarkierungen, Website und Analyseflächen'
    }
  ],
  [
    '/leistungen/landingpage-erstellen-lassen',
    {
      src: '/images/leistungen/landingpage-erstellen-lassen-hero.webp',
      alt: 'Landingpage-Visualisierung mit fokussierter Zielseite und Kampagnen-Elementen'
    }
  ],
  [
    '/leistungen/website-audit',
    {
      src: '/images/leistungen/website-audit-hero.webp',
      alt: 'Website-Audit-Visualisierung mit Prüfbereichen, Kennzahlen und Conversion-Funnel'
    }
  ],
  [
    '/leistungen/website-wartung',
    {
      src: '/images/leistungen/website-wartung-hero.webp',
      alt: 'Website-Wartung-Visualisierung mit Monitoring, Backups und Support-Elementen'
    }
  ],
  [
    '/leistungen/zusatzleistungen-webdesign',
    {
      src: '/images/leistungen/zusatzleistungen-webdesign-hero.webp',
      alt: 'Zusatzleistungen-Visualisierung mit verbundenen Website-Modulen und Erweiterungen'
    }
  ],
  [
    '/leistungen/laufende-kosten-website',
    {
      src: '/images/leistungen/laufende-kosten-website-hero.webp',
      alt: 'Visualisierung laufender Website-Kosten mit Hosting, E-Mail, Sicherheit und Tools'
    }
  ],
  [
    '/leistungen/responsives-design-mobile',
    {
      src: '/images/leistungen/responsives-design-mobile-hero.webp',
      alt: 'Responsive-Webdesign-Visualisierung mit Smartphone, Tablet und Desktop'
    }
  ],
  [
    '/leistungen/inhalte-texte-content',
    {
      src: '/images/leistungen/inhalte-texte-content-hero.webp',
      alt: 'Content-Visualisierung mit Website-Struktur, Textbausteinen und Inhaltsplanung'
    }
  ],
  [
    '/leistungen/rechtliches-sicherheit',
    {
      src: '/images/leistungen/rechtliches-sicherheit-hero.webp',
      alt: 'Sicherheits- und Vertrauensvisualisierung mit Website, Schild, SSL und Backups'
    }
  ]
];

export const SERVICE_HERO_IMAGES = Object.freeze(
  Object.fromEntries(
    heroImageEntries.map(([path, image]) => [path, Object.freeze(image)])
  )
);

export function heroImageForPath(path) {
  const normalizedPath = String(path || '').replace(/\/+$/, '') || '/';
  return SERVICE_HERO_IMAGES[normalizedPath] || null;
}

export function withServiceHeroImage(page) {
  if (!page) return page;
  const heroImage = heroImageForPath(page.canonicalPath || page.path);
  return heroImage ? { ...page, heroImage } : page;
}
