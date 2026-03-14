# Backend-Eintrag: Woche 4 Rising (Headless CMS und API-gesteuerte Architekturen)

Dieses Projekt nutzt für Blogposts die Tabelle `posts` und den Admin-Flow unter `/admin/blog/new`.

## 1) Felder im Admin-Formular

Trage im Formular `/admin/blog/new` folgende Werte ein:

- `Titel`:
  `Woche 4 Rising: Headless CMS und API-gesteuerte Architekturen`
- `Kurzbeschreibung (excerpt)`:
  `Headless CMS und API-gesteuerte Architekturen: So baust du skalierbare Delivery-Setups mit statischer Regeneration, Preview-Workflows und inkrementellen Builds für Enterprise- und SaaS-Projekte.`
- `Url-Slug`:
  `woche-4-rising-headless-cms-api-gesteuerte-architekturen`
- `Kategorie`:
  `Webdesign Masterclass`
- `Description` (Meta Description):
  `Woche 4 Rising: Headless CMS und API-gesteuerte Architekturen. Lerne, wie du modulare Content-Delivery mit API-Feeds, statischer Regeneration und skalierbaren Build-Prozessen praxisnah umsetzt.`
- `FAQ (JSON)`:
  Im Formular wird ein JSON-Array erwartet. Nutze den Wert `mainEntity` aus [woche-4-rising-headless-cms-api-gesteuerte-architekturen-faq-schema.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Headless-CMS-API-gesteuerte-Architekturen/woche-4-rising-headless-cms-api-gesteuerte-architekturen-faq-schema.json) oder direkt das Feld `faq_json` aus [woche-4-rising-headless-cms-api-gesteuerte-architekturen-post.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Headless-CMS-API-gesteuerte-Architekturen/woche-4-rising-headless-cms-api-gesteuerte-architekturen-post.json).
- `Inhalt (HTML erlaubt)`:
  Inhalt aus [woche-4-rising-headless-cms-api-gesteuerte-architekturen-content.html](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Headless-CMS-API-gesteuerte-Architekturen/woche-4-rising-headless-cms-api-gesteuerte-architekturen-content.html)
- `Titelbild`:
  Ein Hero-Bild ist Pflicht (`hero_image`), sonst bricht `createPost` mit `Bild fehlt` ab.

## 2) Fertigpaket-Dateien

- HTML-Content: [woche-4-rising-headless-cms-api-gesteuerte-architekturen-content.html](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Headless-CMS-API-gesteuerte-Architekturen/woche-4-rising-headless-cms-api-gesteuerte-architekturen-content.html)
- FAQ-Schema: [woche-4-rising-headless-cms-api-gesteuerte-architekturen-faq-schema.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Headless-CMS-API-gesteuerte-Architekturen/woche-4-rising-headless-cms-api-gesteuerte-architekturen-faq-schema.json)
- Komplettes Post-Objekt: [woche-4-rising-headless-cms-api-gesteuerte-architekturen-post.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Headless-CMS-API-gesteuerte-Architekturen/woche-4-rising-headless-cms-api-gesteuerte-architekturen-post.json)
- Standalone HTML: [woche-4-rising-headless-cms-api-gesteuerte-architekturen.html](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Headless-CMS-API-gesteuerte-Architekturen/woche-4-rising-headless-cms-api-gesteuerte-architekturen.html)

## 3) Wichtige Backend-Hinweise

- `slug` kannst du manuell setzen (empfohlen für konsistente URLs). Die automatische Generierung in `BlogPostModel.create` funktioniert ebenfalls.
- `faq_json` muss ein JSON-Array sein (nicht das komplette FAQPage-Objekt), da der Controller daraus selbst das FAQPage JSON-LD baut.
- `description` wird im Head als `<meta name="description">` genutzt und im OG-Block verwendet.
