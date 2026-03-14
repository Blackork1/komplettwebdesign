# Backend-Eintrag: Woche 4 Rising (Dunkelmodus und adaptive UI-Themes)

Dieses Projekt nutzt für Blogposts die Tabelle `posts` und den Admin-Flow unter `/admin/blog/new`.

## 1) Felder im Admin-Formular

Trage im Formular `/admin/blog/new` folgende Werte ein:

- `Titel`:
  `Woche 4 Rising: Dunkelmodus und adaptive UI-Themes`
- `Kurzbeschreibung (excerpt)`:
  `Dunkelmodus und adaptive UI-Themes: So setzt du Light-, Dark- und Auto-Modus mit CSS-Variablen, OS-Sync und Kontrast-QA professionell um.`
- `Url-Slug`:
  `woche-4-rising-dunkelmodus-adaptive-ui-themes`
- `Kategorie`:
  `Webdesign Masterclass`
- `Description` (Meta Description):
  `Woche 4 Rising: Dunkelmodus und adaptive UI-Themes. Lerne, wie du Theme-Toggles, prefers-color-scheme und barrierearme Kontraste für moderne, nutzerfreundliche Interfaces umsetzt.`
- `FAQ (JSON)`:
  Im Formular wird ein JSON-Array erwartet. Nutze den Wert `mainEntity` aus [woche-4-rising-dunkelmodus-adaptive-ui-themes-faq-schema.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Dunkelmodus-Adaptive-UI-Themes/woche-4-rising-dunkelmodus-adaptive-ui-themes-faq-schema.json) oder direkt das Feld `faq_json` aus [woche-4-rising-dunkelmodus-adaptive-ui-themes-post.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Dunkelmodus-Adaptive-UI-Themes/woche-4-rising-dunkelmodus-adaptive-ui-themes-post.json).
- `Inhalt (HTML erlaubt)`:
  Inhalt aus [woche-4-rising-dunkelmodus-adaptive-ui-themes-content.html](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Dunkelmodus-Adaptive-UI-Themes/woche-4-rising-dunkelmodus-adaptive-ui-themes-content.html)
- `Titelbild`:
  Ein Hero-Bild ist Pflicht (`hero_image`), sonst bricht `createPost` mit `Bild fehlt` ab.

## 2) Fertigpaket-Dateien

- HTML-Content: [woche-4-rising-dunkelmodus-adaptive-ui-themes-content.html](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Dunkelmodus-Adaptive-UI-Themes/woche-4-rising-dunkelmodus-adaptive-ui-themes-content.html)
- FAQ-Schema: [woche-4-rising-dunkelmodus-adaptive-ui-themes-faq-schema.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Dunkelmodus-Adaptive-UI-Themes/woche-4-rising-dunkelmodus-adaptive-ui-themes-faq-schema.json)
- Komplettes Post-Objekt: [woche-4-rising-dunkelmodus-adaptive-ui-themes-post.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Dunkelmodus-Adaptive-UI-Themes/woche-4-rising-dunkelmodus-adaptive-ui-themes-post.json)
- Standalone HTML: [woche-4-rising-dunkelmodus-adaptive-ui-themes.html](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Dunkelmodus-Adaptive-UI-Themes/woche-4-rising-dunkelmodus-adaptive-ui-themes.html)

## 3) Wichtige Backend-Hinweise

- `slug` kannst du manuell setzen (empfohlen für konsistente URLs). Die automatische Generierung in `BlogPostModel.create` funktioniert ebenfalls.
- `faq_json` muss ein JSON-Array sein (nicht das komplette FAQPage-Objekt), da der Controller daraus selbst das FAQPage JSON-LD baut.
- `description` wird im Head als `<meta name="description">` genutzt und im OG-Block verwendet.
