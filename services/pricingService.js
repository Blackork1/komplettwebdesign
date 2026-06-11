import pricingRepository from '../repositories/pricingRepository.js';
import { formatCurrencyCents, formatPackageOptionLabel, getPriceLabel } from '../util/priceFormatter.js';
import {
  mapComparisonRows,
  mapGlobalPricingNote,
  mapMaintenancePlan,
  mapPackageDetails,
  mapPackageFaq,
  mapPackageFeature,
  mapPackageNotIncluded,
  mapPackageUseCase,
  mapPricingAddOn,
  mapPublicPackage
} from '../util/packageMapper.js';

function createMemoryCache(enabled) {
  const store = new Map();

  return {
    async get(key, loader) {
      if (!enabled) return loader();
      if (!store.has(key)) store.set(key, await loader());
      return store.get(key);
    },
    clear() {
      store.clear();
    }
  };
}

function mapRows(rows) {
  return rows.map(mapPublicPackage).filter(Boolean);
}

export function createPricingService(repository = pricingRepository, options = {}) {
  const cache = createMemoryCache(Boolean(options.cache));

  function invalidateAfter(fn) {
    if (typeof fn !== 'function') return undefined;
    return async (...args) => {
      const result = await fn(...args);
      cache.clear();
      return result;
    };
  }

  async function getVisiblePackages() {
    return cache.get('visible-packages', async () => mapRows(await repository.getVisiblePackages()));
  }

  async function getPackagesForOverview() {
    return cache.get('overview-packages', async () => mapRows(await repository.getPackagesForOverview()));
  }

  async function getPackagesForHome() {
    return cache.get('home-packages', async () => mapRows(await repository.getPackagesForHome()));
  }

  async function getPackagesForComparison() {
    return cache.get('comparison-packages', async () => mapRows(await repository.getPackagesForComparison()));
  }

  async function getPackagesForContactForm() {
    const rows = await repository.getPackagesForContactForm();
    return rows.map((row) => {
      const pkg = mapPublicPackage(row);
      return {
        value: pkg.packageKey,
        label: formatPackageOptionLabel(pkg),
        hint: pkg.shortDescription,
        packageKey: pkg.packageKey,
        slug: pkg.slug,
        canonicalPath: pkg.canonicalPath
      };
    });
  }

  async function getPackageBySlug(slug) {
    return mapPublicPackage(await repository.getPackageBySlug(slug));
  }

  async function getPackageByKey(packageKey) {
    return mapPublicPackage(await repository.getPackageByKey(packageKey));
  }

  async function getPackageWithDetailsBySlug(slug) {
    const details = await repository.getPackageWithDetailsBySlug(slug);
    if (!details) return null;
    return mapPackageDetails(details);
  }

  async function getPackageFeatures(packageId) {
    return (await repository.getPackageFeatures(packageId)).map(mapPackageFeature);
  }

  async function getPackageNotIncluded(packageId) {
    return (await repository.getPackageNotIncluded(packageId)).map(mapPackageNotIncluded);
  }

  async function getPackageUseCases(packageId) {
    return (await repository.getPackageUseCases(packageId)).map(mapPackageUseCase);
  }

  async function getPackageFaqs(packageId, options = {}) {
    return (await repository.getPackageFaqs(packageId, options)).map(mapPackageFaq);
  }

  async function getPackageComparisonRows() {
    return mapComparisonRows(await repository.getPackageComparisonRows());
  }

  async function getPackageRedirectByOldPath(path) {
    return repository.getPackageRedirectByOldPath(path);
  }

  async function getGlobalPricingNotes(context = null) {
    const rows = await repository.getGlobalPricingNotes(context);
    return rows.map(mapGlobalPricingNote);
  }

  async function getVisibleAddOns() {
    return cache.get('visible-addons', async () => (await repository.getVisibleAddOns()).map(mapPricingAddOn));
  }

  async function getVisibleMaintenancePlans() {
    return cache.get('visible-maintenance-plans', async () =>
      (await repository.getVisibleMaintenancePlans()).map(mapMaintenancePlan)
    );
  }

  async function getLowestVisiblePackagePrice() {
    return repository.getLowestVisiblePackagePrice();
  }

  async function getLowestVisiblePackagePriceLabel() {
    const price = await repository.getLowestVisiblePackagePrice();
    return price === null || price === undefined ? null : formatCurrencyCents(Number(price), 'EUR');
  }

  async function getPackagePriceMap() {
    const rows = await repository.getPackagePriceMap();
    return Object.fromEntries(rows.map((row) => [
      row.package_key,
      {
        amountCents: row.price_amount_cents,
        currency: row.price_currency,
        label: getPriceLabel(row),
        priceType: row.price_type
      }
    ]));
  }

  return {
    getVisiblePackages,
    getPackagesForOverview,
    getPackagesForHome,
    getPackagesForComparison,
    getPackagesForContactForm,
    getPackageBySlug,
    getPackageByKey,
    getPackageWithDetailsBySlug,
    getPackageFeatures,
    getPackageNotIncluded,
    getPackageUseCases,
    getPackageFaqs,
    getPackageComparisonRows,
    getPackageRedirectByOldPath,
    getGlobalPricingNotes,
    getVisibleAddOns,
    getVisibleMaintenancePlans,
    getLowestVisiblePackagePrice,
    getLowestVisiblePackagePriceLabel,
    getPackagePriceMap,
    adminListPackages: repository.adminListPackages,
    adminGetPackage: repository.adminGetPackage,
    adminCreatePackage: invalidateAfter(repository.adminCreatePackage),
    adminUpdatePackage: invalidateAfter(repository.adminUpdatePackage),
    adminArchivePackage: invalidateAfter(repository.adminArchivePackage),
    adminRestorePackage: invalidateAfter(repository.adminRestorePackage),
    adminToggleVisibility: invalidateAfter(repository.adminToggleVisibility),
    adminUpdateSortOrder: invalidateAfter(repository.adminUpdateSortOrder),
    adminListPackageContent: repository.adminListPackageContent,
    adminAddFeature: invalidateAfter(repository.adminAddFeature),
    adminUpdateFeature: invalidateAfter(repository.adminUpdateFeature),
    adminDeleteFeature: invalidateAfter(repository.adminDeleteFeature),
    adminAddNotIncluded: invalidateAfter(repository.adminAddNotIncluded),
    adminUpdateNotIncluded: invalidateAfter(repository.adminUpdateNotIncluded),
    adminDeleteNotIncluded: invalidateAfter(repository.adminDeleteNotIncluded),
    adminAddUseCase: invalidateAfter(repository.adminAddUseCase),
    adminUpdateUseCase: invalidateAfter(repository.adminUpdateUseCase),
    adminDeleteUseCase: invalidateAfter(repository.adminDeleteUseCase),
    adminAddFaq: invalidateAfter(repository.adminAddFaq),
    adminUpdateFaq: invalidateAfter(repository.adminUpdateFaq),
    adminDeleteFaq: invalidateAfter(repository.adminDeleteFaq),
    adminListComparisonAdmin: repository.adminListComparisonAdmin,
    adminAddComparisonRow: invalidateAfter(repository.adminAddComparisonRow),
    adminUpdateComparisonRow: invalidateAfter(repository.adminUpdateComparisonRow),
    adminUpsertComparisonValue: invalidateAfter(repository.adminUpsertComparisonValue),
    adminListGlobalNotes: repository.adminListGlobalNotes,
    adminUpdateGlobalNote: invalidateAfter(repository.adminUpdateGlobalNote),
    adminListRedirects: repository.adminListRedirects,
    adminCreateRedirect: invalidateAfter(repository.adminCreateRedirect),
    adminUpdateRedirect: invalidateAfter(repository.adminUpdateRedirect),
    adminListAddOns: repository.adminListAddOns,
    adminGetAddOn: repository.adminGetAddOn,
    adminCreateAddOn: invalidateAfter(repository.adminCreateAddOn),
    adminUpdateAddOn: invalidateAfter(repository.adminUpdateAddOn),
    adminArchiveAddOn: invalidateAfter(repository.adminArchiveAddOn),
    adminRestoreAddOn: invalidateAfter(repository.adminRestoreAddOn),
    adminToggleAddOnVisibility: invalidateAfter(repository.adminToggleAddOnVisibility),
    adminUpdateAddOnSortOrder: invalidateAfter(repository.adminUpdateAddOnSortOrder),
    adminListMaintenancePlans: repository.adminListMaintenancePlans,
    adminGetMaintenancePlan: repository.adminGetMaintenancePlan,
    adminCreateMaintenancePlan: invalidateAfter(repository.adminCreateMaintenancePlan),
    adminUpdateMaintenancePlan: invalidateAfter(repository.adminUpdateMaintenancePlan),
    adminArchiveMaintenancePlan: invalidateAfter(repository.adminArchiveMaintenancePlan),
    adminRestoreMaintenancePlan: invalidateAfter(repository.adminRestoreMaintenancePlan),
    adminToggleMaintenancePlanVisibility: invalidateAfter(repository.adminToggleMaintenancePlanVisibility),
    adminUpdateMaintenancePlanSortOrder: invalidateAfter(repository.adminUpdateMaintenancePlanSortOrder),
    clearCache: cache.clear
  };
}

export default createPricingService();
