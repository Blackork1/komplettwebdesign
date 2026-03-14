# Backend-Eintrag: Woche 4 Rising (Mikrointeraktionen und bewegungsorientierte Benutzeroberflächen)

Dieses Projekt nutzt für Blogposts die Tabelle `posts` und den Admin-Flow unter `/admin/blog/new`.

## 1) Felder im Admin-Formular

Trage im Formular `/admin/blog/new` folgende Werte ein:

- `Titel`:
  `Woche 4 Rising: Mikrointeraktionen und bewegungsorientierte Benutzeroberflächen`
- `Kurzbeschreibung (excerpt)`:
  `Mikrointeraktionen und bewegungsorientierte Benutzeroberflächen: So nutzt du Hover-Feedback, Scroll-Reveals und Button-Hinweise CSS-first für bessere UX ohne unnötige Last.`
- `Url-Slug`:
  `woche-4-rising-mikrointeraktionen-bewegungsorientierte-benutzeroberflaechen`
- `Kategorie`:
  `Webdesign Masterclass`
- `Description` (Meta Description):
  `Woche 4 Rising: Mikrointeraktionen und bewegungsorientierte Benutzeroberflächen. Lerne, wie du subtile Motion-UI-Muster mit CSS-first Ansatz performant, barrierearm und nutzerorientiert umsetzt.`
- `FAQ (JSON)`:
  Im Formular wird ein JSON-Array erwartet. Nutze den Wert `mainEntity` aus [woche-4-rising-mikrointeraktionen-bewegungsorientierte-benutzeroberflaechen-faq-schema.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Mikrointeraktionen-Bewegungsorientierte-Benutzeroberflaechen/woche-4-rising-mikrointeraktionen-bewegungsorientierte-benutzeroberflaechen-faq-schema.json) oder direkt das Feld `faq_json` aus [woche-4-rising-mikrointeraktionen-bewegungsorientierte-benutzeroberflaechen-post.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Mikrointeraktionen-Bewegungsorientierte-Benutzeroberflaechen/woche-4-rising-mikrointeraktionen-bewegungsorientierte-benutzeroberflaechen-post.json).
- `Inhalt (HTML erlaubt)`:
  Inhalt aus [woche-4-rising-mikrointeraktionen-bewegungsorientierte-benutzeroberflaechen-content.html](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Mikrointeraktionen-Bewegungsorientierte-Benutzeroberflaechen/woche-4-rising-mikrointeraktionen-bewegungsorientierte-benutzeroberflaechen-content.html)
- `Titelbild`:
  Ein Hero-Bild ist Pflicht (`hero_image`), sonst bricht `createPost` mit `Bild fehlt` ab.

## 2) Fertigpaket-Dateien

- HTML-Content: [woche-4-rising-mikrointeraktionen-bewegungsorientierte-benutzeroberflaechen-content.html](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Mikrointeraktionen-Bewegungsorientierte-Benutzeroberflaechen/woche-4-rising-mikrointeraktionen-bewegungsorientierte-benutzeroberflaechen-content.html)
- FAQ-Schema: [woche-4-rising-mikrointeraktionen-bewegungsorientierte-benutzeroberflaechen-faq-schema.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Mikrointeraktionen-Bewegungsorientierte-Benutzeroberflaechen/woche-4-rising-mikrointeraktionen-bewegungsorientierte-benutzeroberflaechen-faq-schema.json)
- Komplettes Post-Objekt: [woche-4-rising-mikrointeraktionen-bewegungsorientierte-benutzeroberflaechen-post.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Mikrointeraktionen-Bewegungsorientierte-Benutzeroberflaechen/woche-4-rising-mikrointeraktionen-bewegungsorientierte-benutzeroberflaechen-post.json)
- Standalone HTML: [woche-4-rising-mikrointeraktionen-bewegungsorientierte-benutzeroberflaechen.html](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Mikrointeraktionen-Bewegungsorientierte-Benutzeroberflaechen/woche-4-rising-mikrointeraktionen-bewegungsorientierte-benutzeroberflaechen.html)

## 3) Wichtige Backend-Hinweise

- `slug` kannst du manuell setzen (empfohlen für konsistente URLs). Die automatische Generierung in `BlogPostModel.create` funktioniert ebenfalls.
- `faq_json` muss ein JSON-Array sein (nicht das komplette FAQPage-Objekt), da der Controller daraus selbst das FAQPage JSON-LD baut.
- `description` wird im Head als `<meta name="description">` genutzt und im OG-Block verwendet.
