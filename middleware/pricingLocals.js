import pricingService from '../services/pricingService.js';
import { buildPricingViewModel } from '../util/pricingViewModel.js';

function shouldSkipPricingLocals(req) {
  const path = req.path || '/';
  if (
    path.startsWith('/admin') ||
    path.startsWith('/api') ||
    path.startsWith('/assets') ||
    path.startsWith('/webhook') ||
    path.startsWith('/create-checkout-session')
  ) {
    return true;
  }

  return /\.[a-z0-9]{2,8}$/i.test(path);
}

function assignEmptyPricingLocals(res) {
  const pricing = buildPricingViewModel();
  res.locals.visiblePackages = [];
  res.locals.packagePriceMap = {};
  res.locals.lowestPackagePriceLabel = '';
  res.locals.packageByKey = {};
  res.locals.packageContactOptions = [];
  res.locals.packagePricing = pricing;
  res.locals.packagePriceLabel = pricing.priceLabel;
}

export async function pricingLocalsMiddleware(req, res, next) {
  if (shouldSkipPricingLocals(req)) return next();

  try {
    const [
      visiblePackages,
      packagePriceMap,
      lowestPackagePriceLabel,
      contactPackageOptions
    ] = await Promise.all([
      pricingService.getVisiblePackages(),
      pricingService.getPackagePriceMap(),
      pricingService.getLowestVisiblePackagePriceLabel(),
      pricingService.getPackagesForContactForm()
    ]);

    const pricing = buildPricingViewModel({
      visiblePackages,
      packagePriceMap,
      lowestPackagePriceLabel,
      contactPackageOptions
    });

    res.locals.visiblePackages = visiblePackages;
    res.locals.packagePriceMap = packagePriceMap;
    res.locals.lowestPackagePriceLabel = lowestPackagePriceLabel;
    res.locals.packageByKey = pricing.packageByKey;
    res.locals.packageContactOptions = contactPackageOptions;
    res.locals.packagePricing = pricing;
    res.locals.packagePriceLabel = pricing.priceLabel;
  } catch (err) {
    console.error('[pricing-locals] Paketpreise konnten nicht geladen werden:', err?.message || err);
    assignEmptyPricingLocals(res);
  }

  return next();
}

export default pricingLocalsMiddleware;
