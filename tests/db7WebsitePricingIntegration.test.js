import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const indexSource = readFileSync(new URL('../index.js', import.meta.url), 'utf8');
const mainControllerSource = readFileSync(new URL('../controllers/mainController.js', import.meta.url), 'utf8');
const contactControllerSource = readFileSync(new URL('../controllers/contactController.js', import.meta.url), 'utf8');
const indexTemplate = readFileSync(new URL('../views/index.ejs', import.meta.url), 'utf8');
const contactTemplate = readFileSync(new URL('../views/kontakt.ejs', import.meta.url), 'utf8');

test('DB-7 exposes website-wide pricing locals before public routes', () => {
  assert.equal(existsSync(new URL('../middleware/pricingLocals.js', import.meta.url)), true);
  const middlewareSource = readFileSync(new URL('../middleware/pricingLocals.js', import.meta.url), 'utf8');

  assert.match(indexSource, /pricingLocalsMiddleware/);
  assert.match(middlewareSource, /pricingService\.getVisiblePackages\(/);
  assert.match(middlewareSource, /pricingService\.getPackagePriceMap\(/);
  assert.match(middlewareSource, /pricingService\.getLowestVisiblePackagePriceLabel\(/);
  assert.match(middlewareSource, /pricingService\.getPackagesForContactForm\(/);
  assert.match(middlewareSource, /res\.locals\.packagePriceMap/);
  assert.match(middlewareSource, /res\.locals\.visiblePackages/);
  assert.match(middlewareSource, /res\.locals\.lowestPackagePriceLabel/);
  assert.match(middlewareSource, /res\.locals\.packageByKey/);
});

test('homepage controller loads package teaser data from pricing service', () => {
  assert.match(mainControllerSource, /from ['"]\.\.\/services\/pricingService\.js['"]/);
  assert.doesNotMatch(mainControllerSource, /data\/mockPackages|mockPackages/);
  assert.match(mainControllerSource, /pricingService\.getPackagesForHome\(/);
  assert.match(mainControllerSource, /pricingService\.getPackageFeatures\(/);
  assert.match(mainControllerSource, /interpolatePricingTokens/);
});

test('homepage visible package prices are rendered from dynamic pricing helpers', () => {
  assert.doesNotMatch(indexTemplate, /Packages from EUR 799|Pakete ab 799 €/);
  assert.doesNotMatch(indexTemplate, /ab 3\.500 € <small>/);
  assert.match(indexTemplate, /pkg\.priceLabel|pkg\.price/);
  assert.match(indexTemplate, /lowestPackagePriceLabel|packagePriceLabel/);
});

test('contact form package options and labels come from pricing DB data', () => {
  assert.match(contactControllerSource, /from ['"]\.\.\/services\/pricingService\.js['"]/);
  assert.doesNotMatch(contactControllerSource, /packageOptionsForForm/);
  assert.match(contactControllerSource, /pricingService\.getPackagesForContactForm\(/);
  assert.match(contactControllerSource, /buildContactPackageOptions/);
  assert.match(contactControllerSource, /basis:\s*["']start["']/);
  assert.match(contactControllerSource, /premium:\s*["']wachstum["']/);

  assert.doesNotMatch(contactTemplate, /Website-Pakete starten ab 799 €|Packages start from EUR 799/);
  assert.match(contactTemplate, /lowestPackagePriceLabel/);
});
