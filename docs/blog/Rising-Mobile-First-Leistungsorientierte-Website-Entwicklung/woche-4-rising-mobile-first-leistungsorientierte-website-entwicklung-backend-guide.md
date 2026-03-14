# Backend-Eintrag: Woche 4 Rising (Mobile-First und leistungsorientierte Website-Entwicklung)

Dieses Projekt nutzt für Blogposts die Tabelle `posts` und den Admin-Flow unter `/admin/blog/new`.

## 1) Felder im Admin-Formular

Trage im Formular `/admin/blog/new` folgende Werte ein:

- `Titel`:
  `Woche 4 Rising: Mobile-First und leistungsorientierte Website-Entwicklung`
- `Kurzbeschreibung (excerpt)`:
  `Mobile-First und leistungsorientierte Website-Entwicklung: So verbindest du Core Web Vitals, responsive Navigation, moderne Bildformate und automatisierte Audits für bessere Sichtbarkeit und Conversion.`
- `Url-Slug`:
  `woche-4-rising-mobile-first-leistungsorientierte-website-entwicklung`
- `Kategorie`:
  `Webdesign Masterclass`
- `Description` (Meta Description):
  `Woche 4 Rising: Mobile-First und leistungsorientierte Website-Entwicklung. Lerne, wie du Ladezeit, mobile UX und SEO mit Core Web Vitals, AVIF/WebP und Lighthouse-Audits systematisch optimierst.`
- `FAQ (JSON)`:
  Im Formular wird ein JSON-Array erwartet. Nutze den Wert `mainEntity` aus [woche-4-rising-mobile-first-leistungsorientierte-website-entwicklung-faq-schema.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Mobile-First-Leistungsorientierte-Website-Entwicklung/woche-4-rising-mobile-first-leistungsorientierte-website-entwicklung-faq-schema.json) oder direkt das Feld `faq_json` aus [woche-4-rising-mobile-first-leistungsorientierte-website-entwicklung-post.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Mobile-First-Leistungsorientierte-Website-Entwicklung/woche-4-rising-mobile-first-leistungsorientierte-website-entwicklung-post.json).
- `Inhalt (HTML erlaubt)`:
  Inhalt aus [woche-4-rising-mobile-first-leistungsorientierte-website-entwicklung-content.html](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Mobile-First-Leistungsorientierte-Website-Entwicklung/woche-4-rising-mobile-first-leistungsorientierte-website-entwicklung-content.html)
- `Titelbild`:
  Ein Hero-Bild ist Pflicht (`hero_image`), sonst bricht `createPost` mit `Bild fehlt` ab.

## 2) Fertigpaket-Dateien

- HTML-Content: [woche-4-rising-mobile-first-leistungsorientierte-website-entwicklung-content.html](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Mobile-First-Leistungsorientierte-Website-Entwicklung/woche-4-rising-mobile-first-leistungsorientierte-website-entwicklung-content.html)
- FAQ-Schema: [woche-4-rising-mobile-first-leistungsorientierte-website-entwicklung-faq-schema.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Mobile-First-Leistungsorientierte-Website-Entwicklung/woche-4-rising-mobile-first-leistungsorientierte-website-entwicklung-faq-schema.json)
- Komplettes Post-Objekt: [woche-4-rising-mobile-first-leistungsorientierte-website-entwicklung-post.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Mobile-First-Leistungsorientierte-Website-Entwicklung/woche-4-rising-mobile-first-leistungsorientierte-website-entwicklung-post.json)
- Standalone HTML: [woche-4-rising-mobile-first-leistungsorientierte-website-entwicklung.html](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Mobile-First-Leistungsorientierte-Website-Entwicklung/woche-4-rising-mobile-first-leistungsorientierte-website-entwicklung.html)

## 3) Wichtige Backend-Hinweise

- `slug` kannst du manuell setzen (empfohlen für konsistente URLs). Die automatische Generierung in `BlogPostModel.create` funktioniert ebenfalls.
- `faq_json` muss ein JSON-Array sein (nicht das komplette FAQPage-Objekt), da der Controller daraus selbst das FAQPage JSON-LD baut.
- `description` wird im Head als `<meta name="description">` genutzt und im OG-Block verwendet.
