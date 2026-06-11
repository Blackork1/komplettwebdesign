-- DB-1: Zentrales Datenmodell für Paket-, Preis- und Angebotsverwaltung.
-- Nur Schema, keine Seeds. Nicht ungeprüft auf Production ausführen.

CREATE OR REPLACE FUNCTION pricing_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS pricing_packages (
  id BIGSERIAL PRIMARY KEY,
  package_key VARCHAR(64) NOT NULL,
  name VARCHAR(120) NOT NULL,
  display_name VARCHAR(160) NOT NULL,
  slug VARCHAR(120) NOT NULL,
  canonical_path VARCHAR(255) NOT NULL,
  price_amount_cents INTEGER,
  price_currency CHAR(3) NOT NULL DEFAULT 'EUR',
  price_prefix VARCHAR(40),
  price_suffix VARCHAR(120),
  price_label_override VARCHAR(180),
  price_type VARCHAR(24) NOT NULL DEFAULT 'from',
  vat_note TEXT,
  short_description TEXT,
  long_description TEXT,
  positioning TEXT,
  target_group TEXT,
  not_for TEXT,
  page_scope TEXT,
  text_scope TEXT,
  seo_scope TEXT,
  tech_scope TEXT,
  feedback_rounds TEXT,
  timeline TEXT,
  cta_label VARCHAR(160),
  cta_url VARCHAR(255),
  secondary_cta_label VARCHAR(160),
  secondary_cta_url VARCHAR(255),
  is_recommended BOOLEAN NOT NULL DEFAULT FALSE,
  recommendation_label VARCHAR(120),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  show_in_comparison BOOLEAN NOT NULL DEFAULT TRUE,
  show_in_contact_form BOOLEAN NOT NULL DEFAULT TRUE,
  allow_detail_page BOOLEAN NOT NULL DEFAULT TRUE,
  meta_title VARCHAR(255),
  meta_description TEXT,
  h1 VARCHAR(255),
  schema_type VARCHAR(80),
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT pricing_packages_package_key_unique UNIQUE (package_key),
  CONSTRAINT pricing_packages_slug_unique UNIQUE (slug),
  CONSTRAINT pricing_packages_canonical_path_unique UNIQUE (canonical_path),
  CONSTRAINT pricing_packages_price_amount_non_negative CHECK (
    price_amount_cents IS NULL OR price_amount_cents >= 0
  ),
  CONSTRAINT pricing_packages_canonical_path_absolute CHECK (canonical_path LIKE '/%'),
  CONSTRAINT pricing_packages_price_type_allowed CHECK (
    price_type IN ('from', 'fixed', 'range', 'custom', 'on_request')
  ),
  CONSTRAINT pricing_packages_currency_iso CHECK (price_currency ~ '^[A-Z]{3}$')
);

CREATE TABLE IF NOT EXISTS pricing_package_features (
  id BIGSERIAL PRIMARY KEY,
  package_id BIGINT NOT NULL REFERENCES pricing_packages(id) ON DELETE CASCADE,
  feature_text TEXT NOT NULL,
  feature_group VARCHAR(120),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pricing_package_not_included (
  id BIGSERIAL PRIMARY KEY,
  package_id BIGINT NOT NULL REFERENCES pricing_packages(id) ON DELETE CASCADE,
  item_text TEXT NOT NULL,
  item_group VARCHAR(120),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pricing_package_use_cases (
  id BIGSERIAL PRIMARY KEY,
  package_id BIGINT NOT NULL REFERENCES pricing_packages(id) ON DELETE CASCADE,
  use_case_text TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pricing_package_redirects (
  id BIGSERIAL PRIMARY KEY,
  package_id BIGINT NOT NULL REFERENCES pricing_packages(id) ON DELETE CASCADE,
  old_path VARCHAR(255) NOT NULL,
  target_path VARCHAR(255) NOT NULL,
  status_code SMALLINT NOT NULL DEFAULT 301,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pricing_package_redirects_paths_absolute CHECK (
    old_path LIKE '/%' AND target_path LIKE '/%'
  ),
  CONSTRAINT pricing_package_redirects_status_code_allowed CHECK (
    status_code IN (301, 302, 307, 308)
  ),
  CONSTRAINT pricing_package_redirects_no_self_redirect CHECK (old_path <> target_path)
);

CREATE TABLE IF NOT EXISTS pricing_package_faqs (
  id BIGSERIAL PRIMARY KEY,
  package_id BIGINT REFERENCES pricing_packages(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category VARCHAR(120),
  show_on_overview BOOLEAN NOT NULL DEFAULT FALSE,
  show_on_detail BOOLEAN NOT NULL DEFAULT TRUE,
  schema_eligible BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pricing_comparison_rows (
  id BIGSERIAL PRIMARY KEY,
  row_key VARCHAR(120) NOT NULL,
  label VARCHAR(180) NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pricing_comparison_rows_row_key_unique UNIQUE (row_key)
);

CREATE TABLE IF NOT EXISTS pricing_comparison_values (
  id BIGSERIAL PRIMARY KEY,
  row_id BIGINT NOT NULL REFERENCES pricing_comparison_rows(id) ON DELETE CASCADE,
  package_id BIGINT NOT NULL REFERENCES pricing_packages(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  highlight BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pricing_comparison_values_row_package_unique UNIQUE (row_id, package_id)
);

CREATE TABLE IF NOT EXISTS pricing_addons (
  id BIGSERIAL PRIMARY KEY,
  addon_key VARCHAR(120) NOT NULL,
  name VARCHAR(180) NOT NULL,
  category VARCHAR(120),
  price_from_cents INTEGER,
  price_to_cents INTEGER,
  price_label VARCHAR(180),
  short_description TEXT,
  long_description TEXT,
  third_party_note TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pricing_addons_addon_key_unique UNIQUE (addon_key),
  CONSTRAINT pricing_addons_price_from_non_negative CHECK (
    price_from_cents IS NULL OR price_from_cents >= 0
  ),
  CONSTRAINT pricing_addons_price_to_non_negative CHECK (
    price_to_cents IS NULL OR price_to_cents >= 0
  ),
  CONSTRAINT pricing_addons_price_range_valid CHECK (
    price_from_cents IS NULL OR price_to_cents IS NULL OR price_from_cents <= price_to_cents
  )
);

CREATE TABLE IF NOT EXISTS pricing_maintenance_plans (
  id BIGSERIAL PRIMARY KEY,
  plan_key VARCHAR(120) NOT NULL,
  name VARCHAR(180) NOT NULL,
  price_from_cents INTEGER,
  price_label VARCHAR(180),
  billing_cycle VARCHAR(40) NOT NULL DEFAULT 'monthly',
  short_description TEXT,
  included TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  not_included TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  response_time TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pricing_maintenance_plans_plan_key_unique UNIQUE (plan_key),
  CONSTRAINT pricing_maintenance_plans_price_non_negative CHECK (
    price_from_cents IS NULL OR price_from_cents >= 0
  ),
  CONSTRAINT pricing_maintenance_plans_billing_cycle_allowed CHECK (
    billing_cycle IN ('monthly', 'yearly', 'one_time', 'custom')
  )
);

CREATE TABLE IF NOT EXISTS pricing_global_notes (
  id BIGSERIAL PRIMARY KEY,
  note_key VARCHAR(120) NOT NULL,
  title VARCHAR(180),
  body TEXT NOT NULL,
  context VARCHAR(120),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pricing_global_notes_note_key_unique UNIQUE (note_key)
);

CREATE TABLE IF NOT EXISTS pricing_audit_log (
  id BIGSERIAL PRIMARY KEY,
  admin_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  entity_type VARCHAR(120) NOT NULL,
  entity_id TEXT NOT NULL,
  action VARCHAR(40) NOT NULL,
  before_data JSONB,
  after_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pricing_audit_log_action_allowed CHECK (
    action IN ('create', 'update', 'delete', 'archive', 'restore', 'publish', 'unpublish')
  )
);

ALTER TABLE IF EXISTS pricing_addons
  ADD COLUMN IF NOT EXISTS cta_label VARCHAR(180),
  ADD COLUMN IF NOT EXISTS cta_url VARCHAR(255),
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS pricing_maintenance_plans
  ADD COLUMN IF NOT EXISTS content_change_allowance TEXT,
  ADD COLUMN IF NOT EXISTS emergency_note TEXT,
  ADD COLUMN IF NOT EXISTS third_party_note TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_note TEXT,
  ADD COLUMN IF NOT EXISTS cta_label VARCHAR(180),
  ADD COLUMN IF NOT EXISTS cta_url VARCHAR(255),
  ADD COLUMN IF NOT EXISTS is_recommended BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS pricing_packages_active_sort_idx
  ON pricing_packages (is_active, is_visible, sort_order);

CREATE INDEX IF NOT EXISTS pricing_package_features_package_sort_idx
  ON pricing_package_features (package_id, is_visible, sort_order);

CREATE INDEX IF NOT EXISTS pricing_package_not_included_package_sort_idx
  ON pricing_package_not_included (package_id, is_visible, sort_order);

CREATE INDEX IF NOT EXISTS pricing_package_use_cases_package_sort_idx
  ON pricing_package_use_cases (package_id, is_visible, sort_order);

CREATE INDEX IF NOT EXISTS pricing_package_redirects_old_path_active_idx
  ON pricing_package_redirects (old_path)
  WHERE is_active = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS pricing_package_redirects_old_path_active_unique
  ON pricing_package_redirects (old_path)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS pricing_package_faqs_package_sort_idx
  ON pricing_package_faqs (package_id, is_visible, sort_order);

CREATE INDEX IF NOT EXISTS pricing_package_faqs_overview_sort_idx
  ON pricing_package_faqs (show_on_overview, is_visible, sort_order);

CREATE INDEX IF NOT EXISTS pricing_comparison_rows_visible_sort_idx
  ON pricing_comparison_rows (is_visible, sort_order);

CREATE INDEX IF NOT EXISTS pricing_comparison_values_row_sort_idx
  ON pricing_comparison_values (row_id, sort_order);

CREATE INDEX IF NOT EXISTS pricing_comparison_values_package_idx
  ON pricing_comparison_values (package_id);

CREATE INDEX IF NOT EXISTS pricing_addons_active_sort_idx
  ON pricing_addons (is_active, is_visible, sort_order);

CREATE INDEX IF NOT EXISTS pricing_addons_category_sort_idx
  ON pricing_addons (category, is_active, is_visible, sort_order);

CREATE INDEX IF NOT EXISTS pricing_maintenance_plans_active_sort_idx
  ON pricing_maintenance_plans (is_active, is_visible, sort_order);

CREATE INDEX IF NOT EXISTS pricing_global_notes_context_sort_idx
  ON pricing_global_notes (context, is_active, sort_order);

CREATE INDEX IF NOT EXISTS pricing_audit_log_entity_created_idx
  ON pricing_audit_log (entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS pricing_audit_log_admin_created_idx
  ON pricing_audit_log (admin_user_id, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_pricing_packages_updated_at') THEN
    CREATE TRIGGER trg_pricing_packages_updated_at
      BEFORE UPDATE ON pricing_packages
      FOR EACH ROW EXECUTE FUNCTION pricing_set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_pricing_package_features_updated_at') THEN
    CREATE TRIGGER trg_pricing_package_features_updated_at
      BEFORE UPDATE ON pricing_package_features
      FOR EACH ROW EXECUTE FUNCTION pricing_set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_pricing_package_not_included_updated_at') THEN
    CREATE TRIGGER trg_pricing_package_not_included_updated_at
      BEFORE UPDATE ON pricing_package_not_included
      FOR EACH ROW EXECUTE FUNCTION pricing_set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_pricing_package_use_cases_updated_at') THEN
    CREATE TRIGGER trg_pricing_package_use_cases_updated_at
      BEFORE UPDATE ON pricing_package_use_cases
      FOR EACH ROW EXECUTE FUNCTION pricing_set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_pricing_package_redirects_updated_at') THEN
    CREATE TRIGGER trg_pricing_package_redirects_updated_at
      BEFORE UPDATE ON pricing_package_redirects
      FOR EACH ROW EXECUTE FUNCTION pricing_set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_pricing_package_faqs_updated_at') THEN
    CREATE TRIGGER trg_pricing_package_faqs_updated_at
      BEFORE UPDATE ON pricing_package_faqs
      FOR EACH ROW EXECUTE FUNCTION pricing_set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_pricing_comparison_rows_updated_at') THEN
    CREATE TRIGGER trg_pricing_comparison_rows_updated_at
      BEFORE UPDATE ON pricing_comparison_rows
      FOR EACH ROW EXECUTE FUNCTION pricing_set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_pricing_comparison_values_updated_at') THEN
    CREATE TRIGGER trg_pricing_comparison_values_updated_at
      BEFORE UPDATE ON pricing_comparison_values
      FOR EACH ROW EXECUTE FUNCTION pricing_set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_pricing_addons_updated_at') THEN
    CREATE TRIGGER trg_pricing_addons_updated_at
      BEFORE UPDATE ON pricing_addons
      FOR EACH ROW EXECUTE FUNCTION pricing_set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_pricing_maintenance_plans_updated_at') THEN
    CREATE TRIGGER trg_pricing_maintenance_plans_updated_at
      BEFORE UPDATE ON pricing_maintenance_plans
      FOR EACH ROW EXECUTE FUNCTION pricing_set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_pricing_global_notes_updated_at') THEN
    CREATE TRIGGER trg_pricing_global_notes_updated_at
      BEFORE UPDATE ON pricing_global_notes
      FOR EACH ROW EXECUTE FUNCTION pricing_set_updated_at();
  END IF;
END $$;
