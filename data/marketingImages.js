const PEXELS_LICENSE_URL = 'https://www.pexels.com/legal-pages/license/';

function freezeImage(image) {
  return Object.freeze({
    ...image,
    source: Object.freeze({ ...image.source })
  });
}

const ownSource = Object.freeze({
  kind: 'own',
  provider: 'Komplett Webdesign'
});

export const MARKETING_IMAGES = Object.freeze({
  homeHero: freezeImage({
    src: '/images/home-hero-klarblick-desktop.webp',
    alt: 'Desktop-Entwurf einer klar strukturierten Unternehmenswebsite mit Kontakt- und Leistungsbereichen',
    source: ownSource
  }),
  homeProblem: freezeImage({
    src: '/images/home-fit-beratung.webp',
    alt: 'Visuelle Entscheidungshilfe zur Einordnung eines passenden Website-Projekts',
    source: ownSource
  }),
  homeSolution: freezeImage({
    src: '/images/webdesign-berlin-individuelles-webdesign.webp',
    alt: 'Individueller Website-Entwurf mit übersichtlichen Inhalts- und Navigationsbereichen',
    source: ownSource
  }),
  homeTrust: freezeImage({
    src: '/images/review-bg.webp',
    alt: 'Website-Ansicht eines umgesetzten Projekts als visueller Vertrauensbeleg',
    source: ownSource
  }),
  webdesignHero: freezeImage({
    src: '/images/webdesign-berlin-hero.webp',
    alt: 'Website-Entwurf für ein Berliner Unternehmen mit lokalem Stadtbezug',
    source: ownSource
  }),
  webdesignPlanning: freezeImage({
    src: '/images/editorial/webdesign-planung.webp',
    alt: 'Zwei Personen planen gemeinsam die Struktur und Inhalte einer Website am Laptop',
    source: {
      kind: 'external',
      provider: 'Pexels',
      creator: 'MART PRODUCTION',
      pageUrl: 'https://www.pexels.com/photo/people-having-a-meeting-in-front-of-the-laptop-7550396/',
      licenseUrl: PEXELS_LICENSE_URL
    }
  }),
  webdesignFit: freezeImage({
    src: '/images/editorial/webdesign-zielgruppe.webp',
    alt: 'Beraterin und Unternehmer besprechen gemeinsam ein Website-Projekt am Laptop',
    source: {
      kind: 'external',
      provider: 'Pexels',
      creator: 'Alena Darmel',
      pageUrl: 'https://www.pexels.com/photo/business-man-and-woman-in-the-office-near-glass-window-8133862/',
      licenseUrl: PEXELS_LICENSE_URL
    }
  }),
  webdesignProcess: freezeImage({
    src: '/images/webdesign-ablauf.webp',
    alt: 'Ablauf einer Website-Erstellung von der Anfrage über das Design bis zur Freigabe',
    source: ownSource
  }),
  packageStart: freezeImage({
    src: '/images/paket-start.webp',
    alt: 'Start-Paket für eine kompakte Website mit klar begrenztem Leistungsumfang',
    source: ownSource
  }),
  packageBusiness: freezeImage({
    src: '/images/paket-business.webp',
    alt: 'Business-Paket für eine mehrseitige Unternehmenswebsite mit strukturierten Leistungen',
    source: ownSource
  }),
  packageGrowth: freezeImage({
    src: '/images/paket-wachstum.webp',
    alt: 'Wachstum-Paket für umfangreichere Websites, mehrere Zielgruppen oder einen Relaunch',
    source: ownSource
  }),
  packageCustom: freezeImage({
    src: '/images/paket-individuell.webp',
    alt: 'Individuelles Website-Paket für Sonderfunktionen und besondere digitale Abläufe',
    source: ownSource
  }),
  servicesOverview: freezeImage({
    src: '/images/leistungen/leistungen-uebersicht-hero.webp',
    alt: 'Übersicht verbundener Webdesign-Leistungen von der Planung bis zum laufenden Betrieb',
    source: ownSource
  }),
  serviceRelaunch: freezeImage({
    src: '/images/leistungen/website-relaunch-hero.webp',
    alt: 'Gegenüberstellung einer bestehenden und einer neu strukturierten Website beim Relaunch',
    source: ownSource
  }),
  serviceAudit: freezeImage({
    src: '/images/editorial/website-audit.webp',
    alt: 'Person prüft Diagramme und Kennzahlen einer Website auf einem Laptop',
    source: {
      kind: 'external',
      provider: 'Pexels',
      creator: 'Tiger Lily',
      pageUrl: 'https://www.pexels.com/photo/a-laptop-showing-graphs-7109316/',
      licenseUrl: PEXELS_LICENSE_URL
    }
  }),
  serviceLocalSeo: freezeImage({
    src: '/images/leistungen/local-seo-hero.webp',
    alt: 'Lokale Suchmaschinenoptimierung mit Standortsignalen, Website und Analysebereichen',
    source: ownSource
  }),
  serviceMaintenance: freezeImage({
    src: '/images/leistungen/website-wartung-hero.webp',
    alt: 'Website-Wartung mit Monitoring, Datensicherung und geordneten Support-Aufgaben',
    source: ownSource
  }),
  industryFlorist: freezeImage({
    src: '/images/editorial/floristik.webp',
    alt: 'Floristin arrangiert ein farbenfrohes Blumensortiment für Kundinnen und Kunden',
    source: {
      kind: 'external',
      provider: 'Pexels',
      creator: 'Anna Shvets',
      pageUrl: 'https://www.pexels.com/photo/a-florist-arranging-flowers-5894063/',
      licenseUrl: PEXELS_LICENSE_URL
    }
  }),
  industryRealEstate: freezeImage({
    src: '/images/editorial/immobilienberatung.webp',
    alt: 'Immobilienberater bespricht mit einem Paar Unterlagen zu einer Immobilie',
    source: {
      kind: 'external',
      provider: 'Pexels',
      creator: 'Pavel Danilyuk',
      pageUrl: 'https://www.pexels.com/photo/real-estate-agent-talking-to-clients-7937312/',
      licenseUrl: PEXELS_LICENSE_URL
    }
  }),
  testerOverview: freezeImage({
    src: '/images/site_speed_uplift_de.webp',
    alt: 'Beispielhafte Auswertung einer Website-Prüfung mit priorisierten technischen Hinweisen',
    source: ownSource
  }),
  contactConversation: freezeImage({
    src: '/images/contact-telefonieren.webp',
    alt: 'Persönliches Telefongespräch zur ersten Einordnung eines Website-Projekts',
    source: ownSource
  })
});

export const REQUIRED_VISUAL_ROLES = Object.freeze([
  'homeHero',
  'homeProblem',
  'homeSolution',
  'homeTrust',
  'webdesignHero',
  'webdesignPlanning',
  'webdesignFit',
  'webdesignProcess',
  'packageStart',
  'packageBusiness',
  'packageGrowth',
  'packageCustom',
  'servicesOverview',
  'serviceRelaunch',
  'serviceAudit',
  'serviceLocalSeo',
  'serviceMaintenance',
  'industryFlorist',
  'industryRealEstate',
  'testerOverview',
  'contactConversation'
]);

export function getMarketingImage(role) {
  return MARKETING_IMAGES[role] || null;
}
