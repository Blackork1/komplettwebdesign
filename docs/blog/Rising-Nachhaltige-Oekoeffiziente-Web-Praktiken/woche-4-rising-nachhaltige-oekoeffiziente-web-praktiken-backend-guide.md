# Backend-Eintrag: Woche 4 Rising (Nachhaltige und ökoeffiziente Webpraktiken)

Dieses Projekt nutzt für Blogposts die Tabelle `posts` und den Admin-Flow unter `/admin/blog/new`.

## 1) Felder im Admin-Formular

Trage im Formular `/admin/blog/new` folgende Werte ein:

- `Titel`:
  `Woche 4 Rising: Nachhaltige und ökoeffiziente Webpraktiken`
- `Kurzbeschreibung (excerpt)`:
  `Nachhaltige und ökoeffiziente Webpraktiken: So verbindest du Öko-Hosting, Lean Coding, Medienoptimierung und Barrierefreiheit mit messbarer Performance und ROI.`
- `Url-Slug`:
  `woche-4-rising-nachhaltige-oekoeffiziente-web-praktiken`
- `Kategorie`:
  `Webdesign Masterclass`
- `Description` (Meta Description):
  `Woche 4 Rising: Nachhaltige und ökoeffiziente Webpraktiken. Lerne, wie du Ressourceneffizienz, Green UX und Performance in einem skalierbaren Qualitätsprozess für moderne Websites kombinierst.`
- `FAQ (JSON)`:
  Im Formular wird ein JSON-Array erwartet. Nutze den Wert `mainEntity` aus [woche-4-rising-nachhaltige-oekoeffiziente-web-praktiken-faq-schema.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Nachhaltige-Oekoeffiziente-Web-Praktiken/woche-4-rising-nachhaltige-oekoeffiziente-web-praktiken-faq-schema.json) oder direkt das Feld `faq_json` aus [woche-4-rising-nachhaltige-oekoeffiziente-web-praktiken-post.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Nachhaltige-Oekoeffiziente-Web-Praktiken/woche-4-rising-nachhaltige-oekoeffiziente-web-praktiken-post.json).
- `Inhalt (HTML erlaubt)`:
  Inhalt aus [woche-4-rising-nachhaltige-oekoeffiziente-web-praktiken-content.html](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Nachhaltige-Oekoeffiziente-Web-Praktiken/woche-4-rising-nachhaltige-oekoeffiziente-web-praktiken-content.html)
- `Titelbild`:
  Ein Hero-Bild ist Pflicht (`hero_image`), sonst bricht `createPost` mit `Bild fehlt` ab.

## 2) Fertigpaket-Dateien

- HTML-Content: [woche-4-rising-nachhaltige-oekoeffiziente-web-praktiken-content.html](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Nachhaltige-Oekoeffiziente-Web-Praktiken/woche-4-rising-nachhaltige-oekoeffiziente-web-praktiken-content.html)
- FAQ-Schema: [woche-4-rising-nachhaltige-oekoeffiziente-web-praktiken-faq-schema.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Nachhaltige-Oekoeffiziente-Web-Praktiken/woche-4-rising-nachhaltige-oekoeffiziente-web-praktiken-faq-schema.json)
- Komplettes Post-Objekt: [woche-4-rising-nachhaltige-oekoeffiziente-web-praktiken-post.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Nachhaltige-Oekoeffiziente-Web-Praktiken/woche-4-rising-nachhaltige-oekoeffiziente-web-praktiken-post.json)
- Standalone HTML: [woche-4-rising-nachhaltige-oekoeffiziente-web-praktiken.html](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Nachhaltige-Oekoeffiziente-Web-Praktiken/woche-4-rising-nachhaltige-oekoeffiziente-web-praktiken.html)

## 3) Wichtige Backend-Hinweise

- `slug` kannst du manuell setzen (empfohlen für konsistente URLs). Die automatische Generierung in `BlogPostModel.create` funktioniert ebenfalls.
- `faq_json` muss ein JSON-Array sein (nicht das komplette FAQPage-Objekt), da der Controller daraus selbst das FAQPage JSON-LD baut.
- `description` wird im Head als `<meta name="description">` genutzt und im OG-Block verwendet.
