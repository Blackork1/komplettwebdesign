-- Erweitert die reviews-Tabelle um Spalten für Schema.org AggregateRating
-- und Sortierung nach Datum. Sicher wiederholt ausführbar (IF NOT EXISTS).

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS rating SMALLINT CHECK (rating BETWEEN 1 AND 5);

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Optional: Source für Herkunft der Bewertung (google, direct, ...)
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS source VARCHAR(32) NOT NULL DEFAULT 'google';

-- Optional: eindeutiger external_id (z.B. Google-Review-ID), verhindert Duplikate beim Re-Seed
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS external_id VARCHAR(128);

CREATE UNIQUE INDEX IF NOT EXISTS reviews_external_id_unique
  ON reviews (source, external_id)
  WHERE external_id IS NOT NULL;

-- Bestehende approved-Reviews ohne rating auf 5 setzen (Default-Annahme für Legacy-Daten).
-- Bei Bedarf auskommentieren und manuell pflegen.
UPDATE reviews SET rating = 5 WHERE approved = true AND rating IS NULL;

CREATE INDEX IF NOT EXISTS reviews_approved_created_idx
  ON reviews (approved, created_at DESC);
