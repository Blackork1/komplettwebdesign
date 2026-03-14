# Backend-Eintrag: Woche 4 Rising (AI in Web Design & Content Experience)

Dieses Projekt nutzt für Blogposts die Tabelle `posts` und den Admin-Flow unter `/admin/blog/new`.

## 1) Felder im Admin-Formular

Trage im Formular `/admin/blog/new` folgende Werte ein:

- `Titel`:
  `Woche 4 Rising: AI in Web Design & Content Experience`
- `Kurzbeschreibung (excerpt)`:
  `AI in Web Design & Content Experience: So integrierst du KI in Layout, SEO, Accessibility und Content-Workflows, um schneller zu besseren Ergebnissen für den deutschen Markt zu kommen.`
- `Url-Slug`:
  `woche-4-rising-ai-web-design-content-experience`
- `Kategorie`:
  `Webdesign Masterclass`
- `Description` (Meta Description):
  `Woche 4 Rising: AI in Web Design & Content Experience. Lerne, wie du KI in Design- und Content-Workflows integrierst, um UX, SEO, Accessibility und Conversion in deutschen Projekten messbar zu verbessern.`
- `FAQ (JSON)`:
  Im Formular wird ein JSON-Array erwartet. Nutze den Wert `mainEntity` aus [woche-4-rising-ai-web-design-content-experience-faq-schema.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-AI-Web-Design-Content-Experience/woche-4-rising-ai-web-design-content-experience-faq-schema.json) oder direkt das Feld `faq_json` aus [woche-4-rising-ai-web-design-content-experience-post.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-AI-Web-Design-Content-Experience/woche-4-rising-ai-web-design-content-experience-post.json).
- `Inhalt (HTML erlaubt)`:
  Inhalt aus [woche-4-rising-ai-web-design-content-experience-content.html](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-AI-Web-Design-Content-Experience/woche-4-rising-ai-web-design-content-experience-content.html)
- `Titelbild`:
  Ein Hero-Bild ist Pflicht (`hero_image`), sonst bricht `createPost` mit `Bild fehlt` ab.

## 2) Fertigpaket-Dateien

- HTML-Content: [woche-4-rising-ai-web-design-content-experience-content.html](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-AI-Web-Design-Content-Experience/woche-4-rising-ai-web-design-content-experience-content.html)
- FAQ-Schema: [woche-4-rising-ai-web-design-content-experience-faq-schema.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-AI-Web-Design-Content-Experience/woche-4-rising-ai-web-design-content-experience-faq-schema.json)
- Komplettes Post-Objekt: [woche-4-rising-ai-web-design-content-experience-post.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-AI-Web-Design-Content-Experience/woche-4-rising-ai-web-design-content-experience-post.json)
- Standalone HTML: [woche-4-rising-ai-web-design-content-experience.html](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-AI-Web-Design-Content-Experience/woche-4-rising-ai-web-design-content-experience.html)

## 3) Wichtige Backend-Hinweise

- `slug` kannst du manuell setzen (empfohlen für konsistente URLs). Die automatische Generierung in `BlogPostModel.create` funktioniert ebenfalls.
- `faq_json` muss ein JSON-Array sein (nicht das komplette FAQPage-Objekt), da der Controller daraus selbst das FAQPage JSON-LD baut.
- `description` wird im Head als `<meta name="description">` genutzt und im OG-Block verwendet.
