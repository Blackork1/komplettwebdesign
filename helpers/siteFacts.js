export const SITE_FACTS = {
  brandName: 'Komplett Webdesign',
  legalName: 'Komplett Webdesign',
  founderName: 'Sören Blocksdorf',
  baseUrlFallback: 'https://www.komplettwebdesign.de',
  email: 'kontakt@komplettwebdesign.de',
  phone: '+491551245048',
  phoneDisplay: '01551 245048',
  address: {
    streetAddress: 'Möllendorffstr 26',
    postalCode: '10367',
    addressLocality: 'Berlin',
    addressRegion: 'Berlin',
    addressCountry: 'DE'
  },
  googleProfileUrl: 'https://www.google.com/maps?cid=8211853018206635760',
  googleReviewUrl: 'https://g.page/r/CfAG7dHPXPZxEAE/review',
  googleRating: {
    ratingValue: 5.0,
    reviewCount: 4
  },
  packages: [
    {
      slug: 'basis',
      name: 'Basis',
      price: 499,
      priceLabel: '499 EUR',
      schemaPrice: '499.00',
      scope: '1 Seite',
      deliveryTime: '2 bis 4 Wochen',
      description: 'Onepager mit Design, Texten und SEO-Grundoptimierung.'
    },
    {
      slug: 'business',
      name: 'Business',
      price: 899,
      priceLabel: '899 EUR',
      schemaPrice: '899.00',
      scope: 'bis 5 Seiten',
      deliveryTime: '4 bis 6 Wochen',
      description: 'Mehrseitige Unternehmenswebsite mit Kontaktformular, Leistungsseiten und On-Page-SEO.'
    },
    {
      slug: 'premium',
      name: 'Premium',
      price: 1499,
      priceLabel: '1.499 EUR',
      schemaPrice: '1499.00',
      scope: 'bis 20 Seiten',
      deliveryTime: '6 bis 8 Wochen',
      description: 'Umfangreiche Website mit Strategie, Texten, SEO und Buchungssystem.'
    }
  ],
  recurringCosts: [
    { label: 'Domain und Mail', priceLabel: 'ab 10 EUR/Monat' },
    { label: 'Hosting', priceLabel: '10 EUR/Monat' },
    { label: 'Wartung', priceLabel: '5 EUR/Monat' }
  ]
};

export function getPackageBySlug(slug) {
  return SITE_FACTS.packages.find((pkg) => pkg.slug === slug) || null;
}

export function formatGoogleRating(locale = 'de') {
  const decimal = SITE_FACTS.googleRating.ratingValue.toLocaleString(locale === 'en' ? 'en-US' : 'de-DE', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
  const count = SITE_FACTS.googleRating.reviewCount;
  return locale === 'en'
    ? `★★★★★ ${decimal}/5 · ${count} Google reviews`
    : `★★★★★ ${decimal}/5 · ${count} Google-Rezensionen`;
}
