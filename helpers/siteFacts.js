import { maintenancePlans } from '../data/maintenancePlans.js';
import { packages } from '../data/packages.js';

const sitePackages = packages.map((pkg) => ({
  slug: pkg.slug,
  name: pkg.name,
  price: pkg.priceFrom,
  priceLabel: pkg.priceLabel,
  schemaPrice: pkg.schemaPrice,
  scope: pkg.pageScopeShort,
  deliveryTime: pkg.timeline,
  description: pkg.shortDescription,
  canonicalPath: pkg.canonicalPath
}));

export const SITE_FACTS = {
  brandName: 'Komplett Webdesign',
  legalName: 'Komplett Webdesign',
  founderName: 'Sören Blocksdorf',
  baseUrlFallback: 'https://www.komplettwebdesign.de',
  email: 'kontakt@komplettwebdesign.de',
  phone: '+4915511245048',
  phoneDisplay: '+49 155 11245048',
  address: {
    streetAddress: 'Möllendorffstr 26',
    postalCode: '10367',
    addressLocality: 'Berlin',
    addressRegion: 'Berlin',
    addressCountry: 'DE'
  },
  addressMapUrl: 'https://www.google.com/maps/search/?api=1&query=M%C3%B6llendorffstra%C3%9Fe+26%2C+10367+Berlin',
  socialProfiles: [
    'https://www.linkedin.com/in/komplettwebdesign',
    'https://instagram.com/komplettwebdesign',
    'https://www.facebook.com/profile.php?id=61579580713573',
    'https://www.youtube.com/@komplettwebdesign',
    'https://www.tiktok.com/@komplett.webdesign'
  ],
  googleProfileUrl: 'https://www.google.com/maps?cid=8211853018206635760',
  googleReviewUrl: 'https://g.page/r/CfAG7dHPXPZxEAE/review',
  googleRating: {
    ratingValue: 5.0,
    reviewCount: 4
  },
  packages: sitePackages,
  recurringCosts: maintenancePlans.map((plan) => ({
    label: plan.name,
    priceLabel: plan.priceLabel
  })),
  runningCostNote: 'Laufende Kosten für Hosting, Domain, E-Mail, Wartung, Monitoring oder externe Dienste werden separat vereinbart.'
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
  const noun = locale === 'en'
    ? (count === 1 ? 'Google review' : 'Google reviews')
    : (count === 1 ? 'Google-Rezension' : 'Google-Rezensionen');
  return `★★★★★ ${decimal}/5 · ${count} ${noun}`;
}
