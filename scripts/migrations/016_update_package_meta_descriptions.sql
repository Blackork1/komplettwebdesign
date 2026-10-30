-- Setzt die Meta-Descriptions der beiden Paketdetailseiten, solange noch keine gespeichert ist.
-- Der Runner führt alle Migrationen bei jedem Deploy erneut aus. Deshalb überschreibt diese Migration
-- keine vorhandene Description mehr; Änderungen in der Preisverwaltung bleiben erhalten (seit 30.10.2026).
UPDATE pricing_packages
SET meta_description = CASE package_key
  WHEN 'business' THEN 'Business-Website für kleine Unternehmen in Berlin: mehrere Leistungsseiten, klare Angebotsstruktur, technische SEO-Grundlagen und persönlicher Projektablauf.'
  WHEN 'individuell' THEN 'Individuelles Webdesign für Sonderfunktionen, CMS, Buchung, Mehrsprachigkeit oder größere Anforderungen. Umfang und Preis werden vorab transparent geplant.'
END
WHERE package_key IN ('business', 'individuell')
  AND (meta_description IS NULL OR btrim(meta_description) = '');
