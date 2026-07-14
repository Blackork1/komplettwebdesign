-- Freie KI-Metadaten sind beschreibende Inhalte und keine festen Codes.
-- Bestehende VARCHAR-Grenzen waren enger als der validierte Structured Output.
ALTER TABLE IF EXISTS content_topics
  ALTER COLUMN search_intent TYPE TEXT USING search_intent::text,
  ALTER COLUMN content_cluster TYPE TEXT USING content_cluster::text;

ALTER TABLE IF EXISTS content_post_metadata
  ALTER COLUMN search_intent TYPE TEXT USING search_intent::text,
  ALTER COLUMN content_cluster TYPE TEXT USING content_cluster::text,
  ALTER COLUMN cta_type TYPE TEXT USING cta_type::text;
