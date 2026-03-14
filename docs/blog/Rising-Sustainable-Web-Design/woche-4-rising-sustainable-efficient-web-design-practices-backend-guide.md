# Backend-Eintrag: Woche 4 Rising (Sustainable & Efficient Web Design Practices)

Dieses Projekt nutzt für Blogposts die Tabelle `posts` und den Admin-Flow unter `/admin/blog/new`.

## 1) Felder im Admin-Formular

Trage im Formular `/admin/blog/new` folgende Werte ein:

- `Titel`:
  `Woche 4 Rising: Sustainable & Efficient Web Design Practices`
- `Kurzbeschreibung (excerpt)`:
  `Nachhaltiges Webdesign in Deutschland: So kombinierst du Eco-Hosting, Lean HTML/CSS, Medienoptimierung und Green UX für bessere Performance, geringeren Ressourcenverbrauch und stärkere Conversion.`
- `Url-Slug`:
  `woche-4-rising-sustainable-efficient-web-design-practices`
- `Kategorie`:
  `Webdesign Masterclass`
- `Description` (Meta Description):
  `Woche 4 Rising: Sustainable & Efficient Web Design Practices. Lerne, wie du mit eco-orientiertem Hosting, schlankem Frontend und optimierten Medien nachhaltige, schnelle und differenzierende Websites für den deutschen Markt baust.`
- `FAQ (JSON)`:
  Im Formular wird ein JSON-Array erwartet. Nutze den Wert `mainEntity` aus [woche-4-rising-sustainable-efficient-web-design-practices-faq-schema.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Sustainable-Web-Design/woche-4-rising-sustainable-efficient-web-design-practices-faq-schema.json) oder direkt das Feld `faq_json` aus [woche-4-rising-sustainable-efficient-web-design-practices-post.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Sustainable-Web-Design/woche-4-rising-sustainable-efficient-web-design-practices-post.json).
- `Inhalt (HTML erlaubt)`:
  Inhalt aus [woche-4-rising-sustainable-efficient-web-design-practices-content.html](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Sustainable-Web-Design/woche-4-rising-sustainable-efficient-web-design-practices-content.html)
- `Titelbild`:
  Ein Hero-Bild ist Pflicht (`hero_image`), sonst bricht `createPost` mit `Bild fehlt` ab.

## 2) Fertigpaket-Dateien

- HTML-Content: [woche-4-rising-sustainable-efficient-web-design-practices-content.html](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Sustainable-Web-Design/woche-4-rising-sustainable-efficient-web-design-practices-content.html)
- FAQ-Schema: [woche-4-rising-sustainable-efficient-web-design-practices-faq-schema.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Sustainable-Web-Design/woche-4-rising-sustainable-efficient-web-design-practices-faq-schema.json)
- Komplettes Post-Objekt: [woche-4-rising-sustainable-efficient-web-design-practices-post.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Sustainable-Web-Design/woche-4-rising-sustainable-efficient-web-design-practices-post.json)
- Standalone HTML: [woche-4-rising-sustainable-efficient-web-design-practices.html](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Sustainable-Web-Design/woche-4-rising-sustainable-efficient-web-design-practices.html)

## 3) Wichtige Backend-Hinweise

- `slug` kannst du manuell setzen (empfohlen für konsistente URLs). Die automatische Generierung in `BlogPostModel.create` funktioniert ebenfalls.
- `faq_json` muss ein JSON-Array sein (nicht das komplette FAQPage-Objekt), da der Controller daraus selbst das FAQPage JSON-LD baut.
- `description` wird im Head als `<meta name="description">` genutzt und im OG-Block verwendet.
