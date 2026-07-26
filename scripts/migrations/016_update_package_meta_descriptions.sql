-- Aktualisiert ausschließlich die verbindlichen Meta-Descriptions der beiden Paketdetailseiten.
-- Die WHERE-Bedingung vermeidet bei erneutem Lauf unnötige Schreibvorgänge.
UPDATE pricing_packages
SET meta_description = CASE package_key
  WHEN 'business' THEN 'Business-Website für kleine Unternehmen in Berlin: mehrere Leistungsseiten, klare Angebotsstruktur, technische SEO-Grundlagen und persönlicher Projektablauf.'
  WHEN 'individuell' THEN 'Individuelles Webdesign für Sonderfunktionen, CMS, Buchung, Mehrsprachigkeit oder größere Anforderungen. Umfang und Preis werden vorab transparent geplant.'
END
WHERE package_key IN ('business', 'individuell')
  AND meta_description IS DISTINCT FROM CASE package_key
    WHEN 'business' THEN 'Business-Website für kleine Unternehmen in Berlin: mehrere Leistungsseiten, klare Angebotsstruktur, technische SEO-Grundlagen und persönlicher Projektablauf.'
    WHEN 'individuell' THEN 'Individuelles Webdesign für Sonderfunktionen, CMS, Buchung, Mehrsprachigkeit oder größere Anforderungen. Umfang und Preis werden vorab transparent geplant.'
  END;
