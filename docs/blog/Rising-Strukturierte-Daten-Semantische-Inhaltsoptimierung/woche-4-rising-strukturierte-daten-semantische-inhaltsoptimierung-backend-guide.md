# Backend-Eintrag: Woche 4 Rising (Strukturierte Daten und semantische Inhaltsoptimierung)

Dieses Projekt nutzt für Blogposts die Tabelle `posts` und den Admin-Flow unter `/admin/blog/new`.

## 1) Felder im Admin-Formular

Trage im Formular `/admin/blog/new` folgende Werte ein:

- `Titel`:
  `Woche 4 Rising: Strukturierte Daten und semantische Inhaltsoptimierung`
- `Kurzbeschreibung (excerpt)`:
  `Strukturierte Daten und semantische Inhaltsoptimierung: So setzt du BreadcrumbList, FAQPage und Article strategisch ein, um Sichtbarkeit in klassischer Suche und KI-gestützten Ergebnissen zu steigern.`
- `Url-Slug`:
  `woche-4-rising-strukturierte-daten-semantische-inhaltsoptimierung`
- `Kategorie`:
  `Webdesign Masterclass`
- `Description` (Meta Description):
  `Woche 4 Rising: Strukturierte Daten und semantische Inhaltsoptimierung. Lerne, wie du JSON-LD, semantische Inhalte und klare Entitätslogik für bessere Sichtbarkeit in Suche und KI-Antwortsystemen einsetzt.`
- `FAQ (JSON)`:
  Im Formular wird ein JSON-Array erwartet. Nutze den Wert `mainEntity` aus [woche-4-rising-strukturierte-daten-semantische-inhaltsoptimierung-faq-schema.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Strukturierte-Daten-Semantische-Inhaltsoptimierung/woche-4-rising-strukturierte-daten-semantische-inhaltsoptimierung-faq-schema.json) oder direkt das Feld `faq_json` aus [woche-4-rising-strukturierte-daten-semantische-inhaltsoptimierung-post.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Strukturierte-Daten-Semantische-Inhaltsoptimierung/woche-4-rising-strukturierte-daten-semantische-inhaltsoptimierung-post.json).
- `Inhalt (HTML erlaubt)`:
  Inhalt aus [woche-4-rising-strukturierte-daten-semantische-inhaltsoptimierung-content.html](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Strukturierte-Daten-Semantische-Inhaltsoptimierung/woche-4-rising-strukturierte-daten-semantische-inhaltsoptimierung-content.html)
- `Titelbild`:
  Ein Hero-Bild ist Pflicht (`hero_image`), sonst bricht `createPost` mit `Bild fehlt` ab.

## 2) Fertigpaket-Dateien

- HTML-Content: [woche-4-rising-strukturierte-daten-semantische-inhaltsoptimierung-content.html](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Strukturierte-Daten-Semantische-Inhaltsoptimierung/woche-4-rising-strukturierte-daten-semantische-inhaltsoptimierung-content.html)
- FAQ-Schema: [woche-4-rising-strukturierte-daten-semantische-inhaltsoptimierung-faq-schema.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Strukturierte-Daten-Semantische-Inhaltsoptimierung/woche-4-rising-strukturierte-daten-semantische-inhaltsoptimierung-faq-schema.json)
- Komplettes Post-Objekt: [woche-4-rising-strukturierte-daten-semantische-inhaltsoptimierung-post.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Strukturierte-Daten-Semantische-Inhaltsoptimierung/woche-4-rising-strukturierte-daten-semantische-inhaltsoptimierung-post.json)
- Standalone HTML: [woche-4-rising-strukturierte-daten-semantische-inhaltsoptimierung.html](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Strukturierte-Daten-Semantische-Inhaltsoptimierung/woche-4-rising-strukturierte-daten-semantische-inhaltsoptimierung.html)

## 3) Wichtige Backend-Hinweise

- `slug` kannst du manuell setzen (empfohlen für konsistente URLs). Die automatische Generierung in `BlogPostModel.create` funktioniert ebenfalls.
- `faq_json` muss ein JSON-Array sein (nicht das komplette FAQPage-Objekt), da der Controller daraus selbst das FAQPage JSON-LD baut.
- `description` wird im Head als `<meta name="description">` genutzt und im OG-Block verwendet.
