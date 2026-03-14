# Backend-Eintrag: Woche 4 Rising (Strukturierte Daten und KI-optimierte Inhalte)

Dieses Projekt nutzt für Blogposts die Tabelle `posts` und den Admin-Flow unter `/admin/blog/new`.

## 1) Felder im Admin-Formular

Trage im Formular `/admin/blog/new` folgende Werte ein:

- `Titel`:
  `Woche 4 Rising: Strukturierte Daten und KI-optimierte Inhalte`
- `Kurzbeschreibung (excerpt)`:
  `Strukturierte Daten und KI-optimierte Inhalte: So verbesserst du mit Article-, FAQPage- und BreadcrumbList-Markup die Sichtbarkeit in klassischer Suche und KI-Suchergebnissen.`
- `Url-Slug`:
  `woche-4-rising-strukturierte-daten-ki-optimierte-inhalte`
- `Kategorie`:
  `Webdesign Masterclass`
- `Description` (Meta Description):
  `Woche 4 Rising: Strukturierte Daten und KI-optimierte Inhalte. Lerne, wie du semantische Content-Strukturen und Schema-Markup für bessere Sichtbarkeit, klare Suchsignale und stärkere KI-Antwortfähigkeit umsetzt.`
- `FAQ (JSON)`:
  Im Formular wird ein JSON-Array erwartet. Nutze den Wert `mainEntity` aus [woche-4-rising-strukturierte-daten-ki-optimierte-inhalte-faq-schema.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Strukturierte-Daten-KI-Optimierte-Inhalte/woche-4-rising-strukturierte-daten-ki-optimierte-inhalte-faq-schema.json) oder direkt das Feld `faq_json` aus [woche-4-rising-strukturierte-daten-ki-optimierte-inhalte-post.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Strukturierte-Daten-KI-Optimierte-Inhalte/woche-4-rising-strukturierte-daten-ki-optimierte-inhalte-post.json).
- `Inhalt (HTML erlaubt)`:
  Inhalt aus [woche-4-rising-strukturierte-daten-ki-optimierte-inhalte-content.html](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Strukturierte-Daten-KI-Optimierte-Inhalte/woche-4-rising-strukturierte-daten-ki-optimierte-inhalte-content.html)
- `Titelbild`:
  Ein Hero-Bild ist Pflicht (`hero_image`), sonst bricht `createPost` mit `Bild fehlt` ab.

## 2) Fertigpaket-Dateien

- HTML-Content: [woche-4-rising-strukturierte-daten-ki-optimierte-inhalte-content.html](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Strukturierte-Daten-KI-Optimierte-Inhalte/woche-4-rising-strukturierte-daten-ki-optimierte-inhalte-content.html)
- FAQ-Schema: [woche-4-rising-strukturierte-daten-ki-optimierte-inhalte-faq-schema.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Strukturierte-Daten-KI-Optimierte-Inhalte/woche-4-rising-strukturierte-daten-ki-optimierte-inhalte-faq-schema.json)
- Komplettes Post-Objekt: [woche-4-rising-strukturierte-daten-ki-optimierte-inhalte-post.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Strukturierte-Daten-KI-Optimierte-Inhalte/woche-4-rising-strukturierte-daten-ki-optimierte-inhalte-post.json)
- Standalone HTML: [woche-4-rising-strukturierte-daten-ki-optimierte-inhalte.html](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Strukturierte-Daten-KI-Optimierte-Inhalte/woche-4-rising-strukturierte-daten-ki-optimierte-inhalte.html)

## 3) Wichtige Backend-Hinweise

- `slug` kannst du manuell setzen (empfohlen für konsistente URLs). Die automatische Generierung in `BlogPostModel.create` funktioniert ebenfalls.
- `faq_json` muss ein JSON-Array sein (nicht das komplette FAQPage-Objekt), da der Controller daraus selbst das FAQPage JSON-LD baut.
- `description` wird im Head als `<meta name="description">` genutzt und im OG-Block verwendet.
