# Backend-Eintrag: Woche 4 Rising (KI-gestütztes Webdesign- und Entwicklungsökosystem)

Dieses Projekt nutzt für Blogposts die Tabelle `posts` und den Admin-Flow unter `/admin/blog/new`.

## 1) Felder im Admin-Formular

Trage im Formular `/admin/blog/new` folgende Werte ein:

- `Titel`:
  `Woche 4 Rising: KI-gestütztes Webdesign- und Entwicklungsökosystem`
- `Kurzbeschreibung (excerpt)`:
  `KI-gestütztes Webdesign- und Entwicklungsökosystem: So integrierst du Layout-Ideation, semantische SEO-Unterstützung und automatisierte Accessibility-Checks mit verbindlicher Qualitätskontrolle.`
- `Url-Slug`:
  `woche-4-rising-ki-gestuetztes-webdesign-entwicklungsoekosystem`
- `Kategorie`:
  `Webdesign Masterclass`
- `Description` (Meta Description):
  `Woche 4 Rising: KI-gestütztes Webdesign- und Entwicklungsökosystem. Lerne, wie du KI-Tools für Design, Entwicklung, SEO und Accessibility produktiv einsetzt und mit menschlicher QA absicherst.`
- `FAQ (JSON)`:
  Im Formular wird ein JSON-Array erwartet. Nutze den Wert `mainEntity` aus [woche-4-rising-ki-gestuetztes-webdesign-entwicklungsoekosystem-faq-schema.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-KI-gestuetztes-Webdesign-Entwicklungsoekosystem/woche-4-rising-ki-gestuetztes-webdesign-entwicklungsoekosystem-faq-schema.json) oder direkt das Feld `faq_json` aus [woche-4-rising-ki-gestuetztes-webdesign-entwicklungsoekosystem-post.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-KI-gestuetztes-Webdesign-Entwicklungsoekosystem/woche-4-rising-ki-gestuetztes-webdesign-entwicklungsoekosystem-post.json).
- `Inhalt (HTML erlaubt)`:
  Inhalt aus [woche-4-rising-ki-gestuetztes-webdesign-entwicklungsoekosystem-content.html](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-KI-gestuetztes-Webdesign-Entwicklungsoekosystem/woche-4-rising-ki-gestuetztes-webdesign-entwicklungsoekosystem-content.html)
- `Titelbild`:
  Ein Hero-Bild ist Pflicht (`hero_image`), sonst bricht `createPost` mit `Bild fehlt` ab.

## 2) Fertigpaket-Dateien

- HTML-Content: [woche-4-rising-ki-gestuetztes-webdesign-entwicklungsoekosystem-content.html](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-KI-gestuetztes-Webdesign-Entwicklungsoekosystem/woche-4-rising-ki-gestuetztes-webdesign-entwicklungsoekosystem-content.html)
- FAQ-Schema: [woche-4-rising-ki-gestuetztes-webdesign-entwicklungsoekosystem-faq-schema.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-KI-gestuetztes-Webdesign-Entwicklungsoekosystem/woche-4-rising-ki-gestuetztes-webdesign-entwicklungsoekosystem-faq-schema.json)
- Komplettes Post-Objekt: [woche-4-rising-ki-gestuetztes-webdesign-entwicklungsoekosystem-post.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-KI-gestuetztes-Webdesign-Entwicklungsoekosystem/woche-4-rising-ki-gestuetztes-webdesign-entwicklungsoekosystem-post.json)
- Standalone HTML: [woche-4-rising-ki-gestuetztes-webdesign-entwicklungsoekosystem.html](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-KI-gestuetztes-Webdesign-Entwicklungsoekosystem/woche-4-rising-ki-gestuetztes-webdesign-entwicklungsoekosystem.html)

## 3) Wichtige Backend-Hinweise

- `slug` kannst du manuell setzen (empfohlen für konsistente URLs). Die automatische Generierung in `BlogPostModel.create` funktioniert ebenfalls.
- `faq_json` muss ein JSON-Array sein (nicht das komplette FAQPage-Objekt), da der Controller daraus selbst das FAQPage JSON-LD baut.
- `description` wird im Head als `<meta name="description">` genutzt und im OG-Block verwendet.
