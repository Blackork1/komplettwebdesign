import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const adminRoutes = read('routes/adminPricingRoutes.js');
const adminController = read('controllers/adminPricingController.js');
const pricingRepository = read('repositories/pricingRepository.js');
const pricingService = read('services/pricingService.js');
const packagesPartial = read('views/partials/packages.ejs');
const llmsText = read('public/llms.txt');
const pricingMarkdown = read('public/pricing.md');
const kitaJson = read('public/jsons/kita.json');
const realKitoJson = read('public/jsons/realKito.json');
const packagesController = read('controllers/packagesController.js');
const contactController = read('controllers/contactController.js');
const sitemapController = read('controllers/sitemapController.js');
const seoSchemas = read('util/seoSchemas.js');
const pageSchema = read('helpers/pageSchema.js');

const publicCleanupFiles = [
  ['views/partials/packages.ejs', packagesPartial],
  ['public/llms.txt', llmsText],
  ['public/pricing.md', pricingMarkdown],
  ['public/jsons/kita.json', kitaJson],
  ['public/jsons/realKito.json', realKitoJson],
  ['helpers/pageSchema.js', pageSchema]
];

const forbiddenPublicPricePatterns = [
  /Start\s+ab\s+799\s*€/i,
  /Business\s+ab\s+1\.499\s*€/i,
  /Wachstum\s+ab\s+2\.499\s*€/i,
  /Individuell\s+ab\s+3\.500\s*€/i,
  /999,00\s*€/i,
  /1999,00\s*€/i,
  /2499,00\s*€/i,
  /499,99\s*€/i,
  /899,99\s*€/i,
  /Wartung\s+ab\s+5\s*€/i
];

test('DB-11 cleanup removes critical public package price hardcodings from legacy public files', () => {
  for (const [file, source] of publicCleanupFiles) {
    for (const pattern of forbiddenPublicPricePatterns) {
      assert.doesNotMatch(source, pattern, `${file} still contains ${pattern}`);
    }
  }
});

test('legacy packages partial renders package cards from runtime data only', () => {
  assert.match(packagesPartial, /\(packages \|\| \[\]\)\.forEach/);
  assert.match(packagesPartial, /pkg\.priceLabel \|\| pkg\.price/);
  assert.match(packagesPartial, /pkg\.features/);
  assert.match(packagesPartial, /pkg\.ctaUrl/);
  assert.doesNotMatch(packagesPartial, /create-checkout-session/);
  assert.doesNotMatch(packagesPartial, /Standart Paket|Standard Paket/);
});

test('public package, contact, sitemap and schema code keep PostgreSQL as price source', () => {
  assert.match(packagesController, /pricingService\.getPackagesForOverview\(/);
  assert.match(packagesController, /pricingService\.getPackageWithDetailsBySlug\(/);
  assert.match(contactController, /pricingService\.getPackagesForContactForm\(/);
  assert.match(contactController, /basis:\s*["']start["']/);
  assert.match(contactController, /premium:\s*["']wachstum["']/);
  assert.match(contactController, /normalizeContactBody\(req\.body,\s*lng,\s*packageOptions\)/);
  assert.match(contactController, /normalizeWebdesignBerlinBody\(bodyData,\s*packageOptions\)/);
  assert.match(contactController, /pickValidatedDefaults\(req\.query,\s*overrides\.formValues \|\| \{\},\s*packageOptions\)/);
  assert.match(sitemapController, /pricingService\.getVisiblePackages\(/);
  assert.match(seoSchemas, /visibleFaqs/);

  assert.doesNotMatch(packagesController, /from ['"]\.\.\/data\/packages\.js['"]/);
  assert.doesNotMatch(contactController, /packageOptionsForForm/);
  assert.doesNotMatch(sitemapController, /\/pakete\/basis|\/pakete\/premium/);
  assert.doesNotMatch(seoSchemas, /AggregateRating|Review/);
});

test('repository public queries exclude hidden, inactive and archived package data', () => {
  assert.match(pricingRepository, /const PUBLIC_PACKAGE_WHERE = `\s*is_active = TRUE\s*AND is_visible = TRUE\s*AND archived_at IS NULL\s*`/s);
  assert.match(pricingRepository, /AND show_in_contact_form = TRUE/);
  assert.match(pricingRepository, /AND show_in_comparison = TRUE/);
  assert.match(pricingRepository, /AND allow_detail_page = TRUE/);
  assert.match(pricingRepository, /AND redirect_data\.status_code = 301/);
  assert.match(pricingRepository, /AND redirect_data\.old_path <> redirect_data\.target_path/);
});

test('admin pricing routes are protected, CSRF guarded and do not write via GET', () => {
  const adminPricingRoutes = adminRoutes
    .split('\n')
    .filter((line) => line.includes('/admin/pricing/'));
  const writeLines = adminPricingRoutes.filter((line) => line.includes('router.post('));
  const getWriteLines = adminPricingRoutes.filter((line) =>
    line.includes('router.get(') && /(archive|restore|toggle|delete|reorder|create|update)/.test(line)
  );

  assert.ok(adminPricingRoutes.length > 0);
  assert.ok(writeLines.length > 0);
  assert.deepEqual(getWriteLines, []);

  for (const line of adminPricingRoutes) {
    assert.match(line, /isAdmin/, `admin route without isAdmin: ${line}`);
  }

  for (const line of writeLines) {
    assert.match(line, /verifyCsrfToken/, `write route without CSRF: ${line}`);
  }
});

test('admin pricing validation rejects unsafe CTA URLs and flags risky legacy claims', () => {
  assert.match(adminController, /function validInternalUrl/);
  assert.match(adminController, /\^\\s\*javascript:/);
  assert.match(adminController, /RISK_TERMS/);
  assert.match(adminController, /499/);
  assert.match(adminController, /899/);
  assert.match(adminController, /Wartung ab 5/);
  assert.match(adminController, /rechtssicher/);
  assert.match(adminController, /Ranking garantiert/);
  assert.match(adminController, /keine versteckten Kosten/);
});

test('admin pricing code does not expose stack traces or admin notes publicly', () => {
  assert.doesNotMatch(adminController, /err\.stack/);
  assert.match(adminController, /console\.error\([^;]*err\.message/s);
  assert.match(pricingRepository, /admin_note/);
  assert.doesNotMatch(packagesController, /admin_note|adminNote/);
  assert.doesNotMatch(packagesPartial, /admin_note|adminNote/);
});

test('admin write operations invalidate pricing cache for frontend and sitemap freshness', () => {
  assert.match(pricingService, /function invalidateAfter/);
  assert.match(pricingService, /cache\.clear\(\)/);
  assert.match(pricingService, /adminUpdatePackage:\s*invalidateAfter/);
  assert.match(pricingService, /adminToggleVisibility:\s*invalidateAfter/);
  assert.match(pricingService, /adminUpdateGlobalNote:\s*invalidateAfter/);
  assert.match(pricingService, /adminUpdateAddOn:\s*invalidateAfter/);
  assert.match(pricingService, /adminUpdateMaintenancePlan:\s*invalidateAfter/);
  assert.match(sitemapController, /no-cache,\s*max-age=0,\s*must-revalidate/);
});
