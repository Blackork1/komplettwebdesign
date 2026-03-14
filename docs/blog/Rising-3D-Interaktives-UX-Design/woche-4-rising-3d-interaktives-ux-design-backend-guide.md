# Backend-Eintrag: Woche 4 Rising (3D- und interaktives UX-Design)

Dieses Projekt nutzt für Blogposts die Tabelle `posts` und den Admin-Flow unter `/admin/blog/new`.

## 1) Felder im Admin-Formular

Trage im Formular `/admin/blog/new` folgende Werte ein:

- `Titel`:
  `Woche 4 Rising: 3D- und interaktives UX-Design`
- `Kurzbeschreibung (excerpt)`:
  `3D- und interaktives UX-Design: So kombinierst du modularen WebGL-Einsatz, Mikroanimationen und robuste Fallbacks für immersive, performante Benutzererlebnisse.`
- `Url-Slug`:
  `woche-4-rising-3d-interaktives-ux-design`
- `Kategorie`:
  `Webdesign Masterclass`
- `Description` (Meta Description):
  `Woche 4 Rising: 3D- und interaktives UX-Design. Lerne, wie du immersive 3D-Elemente, WebGL-Fallbacks und funktionale Motion-Cues mit klaren Performance-Budgets umsetzt.`
- `FAQ (JSON)`:
  Im Formular wird ein JSON-Array erwartet. Nutze den Wert `mainEntity` aus [woche-4-rising-3d-interaktives-ux-design-faq-schema.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-3D-Interaktives-UX-Design/woche-4-rising-3d-interaktives-ux-design-faq-schema.json) oder direkt das Feld `faq_json` aus [woche-4-rising-3d-interaktives-ux-design-post.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-3D-Interaktives-UX-Design/woche-4-rising-3d-interaktives-ux-design-post.json).
- `Inhalt (HTML erlaubt)`:
  Inhalt aus [woche-4-rising-3d-interaktives-ux-design-content.html](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-3D-Interaktives-UX-Design/woche-4-rising-3d-interaktives-ux-design-content.html)
- `Titelbild`:
  Ein Hero-Bild ist Pflicht (`hero_image`), sonst bricht `createPost` mit `Bild fehlt` ab.

## 2) Fertigpaket-Dateien

- HTML-Content: [woche-4-rising-3d-interaktives-ux-design-content.html](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-3D-Interaktives-UX-Design/woche-4-rising-3d-interaktives-ux-design-content.html)
- FAQ-Schema: [woche-4-rising-3d-interaktives-ux-design-faq-schema.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-3D-Interaktives-UX-Design/woche-4-rising-3d-interaktives-ux-design-faq-schema.json)
- Komplettes Post-Objekt: [woche-4-rising-3d-interaktives-ux-design-post.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-3D-Interaktives-UX-Design/woche-4-rising-3d-interaktives-ux-design-post.json)
- Standalone HTML: [woche-4-rising-3d-interaktives-ux-design.html](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-3D-Interaktives-UX-Design/woche-4-rising-3d-interaktives-ux-design.html)

## 3) Wichtige Backend-Hinweise

- `slug` kannst du manuell setzen (empfohlen für konsistente URLs). Die automatische Generierung in `BlogPostModel.create` funktioniert ebenfalls.
- `faq_json` muss ein JSON-Array sein (nicht das komplette FAQPage-Objekt), da der Controller daraus selbst das FAQPage JSON-LD baut.
- `description` wird im Head als `<meta name="description">` genutzt und im OG-Block verwendet.
