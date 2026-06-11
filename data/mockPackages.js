import { packages } from './packages.js';

function toMockPackage(pkg) {
  return {
    id: pkg.id,
    name: pkg.name,
    displayName: pkg.displayName,
    slug: pkg.slug,
    canonicalPath: pkg.canonicalPath,
    redirectFrom: pkg.redirectFrom,
    description: pkg.shortDescription,
    longDescription: pkg.longDescription,
    image: pkg.image,
    price_amount_cents: pkg.price_amount_cents,
    price: pkg.price,
    priceFrom: pkg.priceFrom,
    priceLabel: pkg.priceLabel,
    priceNote: pkg.priceNote,
    display: pkg.display,
    features: pkg.features,
    targetGroup: pkg.targetGroup,
    notFor: pkg.notFor,
    pageScope: pkg.pageScope,
    pageScopeShort: pkg.pageScopeShort,
    textScope: pkg.textScope,
    seoScope: pkg.seoScope,
    techScope: pkg.techScope,
    included: pkg.included,
    notIncluded: pkg.notIncluded,
    optionalAddOns: pkg.optionalAddOns,
    feedbackRounds: pkg.feedbackRounds,
    timeline: pkg.timeline,
    runningCostsNote: pkg.runningCostsNote,
    legalNote: pkg.legalNote,
    seoNote: pkg.seoNote,
    thirdPartyNote: pkg.thirdPartyNote,
    faqIds: pkg.faqIds,
    details: {
      Zielgruppe: pkg.targetGroup.join(', '),
      Seitenumfang: pkg.pageScope,
      Textumfang: pkg.textScope.join(' '),
      SEO: pkg.seoScope.join(' '),
      Technik: pkg.techScope.join(' ')
    }
  };
}

export const mockPackages = Object.freeze(packages.map(toMockPackage));

export default mockPackages;
