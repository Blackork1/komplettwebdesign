import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

import { mapPublicPackage } from '../util/packageMapper.js';

const migrationUrl = new URL(
  '../scripts/migrations/016_update_package_meta_descriptions.sql',
  import.meta.url
);
const migrationSql = existsSync(migrationUrl)
  ? readFileSync(migrationUrl, 'utf8')
  : '';
const runnerSource = readFileSync(
  new URL('../scripts/runContentAgentMigration.js', import.meta.url),
  'utf8'
);

const BUSINESS_DESCRIPTION = 'Business-Website für kleine Unternehmen in Berlin: mehrere Leistungsseiten, klare Angebotsstruktur, technische SEO-Grundlagen und persönlicher Projektablauf.';
const INDIVIDUAL_DESCRIPTION = 'Individuelles Webdesign für Sonderfunktionen, CMS, Buchung, Mehrsprachigkeit oder größere Anforderungen. Umfang und Preis werden vorab transparent geplant.';

test('Migration 016 setzt nur fehlende Paket-Meta-Descriptions und überschreibt keine Admin-Änderung', () => {
  assert.equal(existsSync(migrationUrl), true, 'Die Paket-Meta-Migration fehlt.');
  assert.match(migrationSql, /UPDATE pricing_packages/i);
  assert.match(migrationSql, /SET\s+meta_description\s*=/i);
  assert.match(migrationSql, /package_key\s+IN\s*\(\s*'business'\s*,\s*'individuell'\s*\)/i);
  assert.match(migrationSql, new RegExp(BUSINESS_DESCRIPTION.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(migrationSql, new RegExp(INDIVIDUAL_DESCRIPTION.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(migrationSql, /IS DISTINCT FROM/i);
  assert.match(migrationSql, /meta_description IS NULL OR btrim\(meta_description\) = ''/i);
  assert.doesNotMatch(migrationSql, /\b(?:price_amount_cents|price_currency|price_prefix|price_suffix|price_label_override|meta_title|slug|canonical_path|name|display_name|short_description|long_description)\b\s*=/i);
});

test('Migrationsrunner führt die Paket-Meta-Migration direkt nach Migration 015 aus', () => {
  assert.ok(runnerSource.indexOf('016_update_package_meta_descriptions.sql')
    > runnerSource.indexOf('015_create_legacy_content_migrations.sql'));
  assert.match(runnerSource, /Migration 002 bis 016 erfolgreich/);
  assert.match(runnerSource, /Migration 002 bis 016 fehlgeschlagen/);
});

test('der öffentliche Paket-Mapper reicht die migrierten DB-Meta-Descriptions unverändert durch', () => {
  const mapped = mapPublicPackage({
    package_key: 'business',
    meta_description: BUSINESS_DESCRIPTION,
    price_amount_cents: 149900,
    price_currency: 'EUR',
    price_type: 'from'
  });

  assert.equal(mapped.metaDescription, BUSINESS_DESCRIPTION);
});

test('der Paket-Mapper gleicht Preise an und behält den Großbuchstaben am Satzanfang', () => {
  const mapped = mapPublicPackage({
    package_key: 'start',
    meta_description: 'Kleine Website, individuell gestaltet. Ab 799 €. Preis ab 799 € netto.',
    h1: 'Start-Paket ab 799 €',
    price_amount_cents: 79900,
    price_currency: 'EUR',
    price_prefix: 'ab',
    price_type: 'from'
  });
  assert.equal(mapped.metaDescription, 'Kleine Website, individuell gestaltet. Ab 799 €. Preis ab 799 € netto.');
  assert.equal(mapped.h1, 'Start-Paket ab 799 €');
});
