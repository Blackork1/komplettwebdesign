-- Einmalig nach Veröffentlichung der Version ohne Website-Chat ausführen.
-- Vorher ein geprüftes Datenbankbackup erstellen. Keine Inhaltsdaten löschen.
-- Bewusst ohne CASCADE: unerwartete Abhängigkeiten brechen die Transaktion ab.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DROP TABLE IF EXISTS public.chat_messages;
DROP TABLE IF EXISTS public.industry_embeddings;
ALTER TABLE IF EXISTS public.faq_entries DROP COLUMN IF EXISTS embedding;
ALTER TABLE IF EXISTS public.pages DROP COLUMN IF EXISTS embedding;

COMMIT;
