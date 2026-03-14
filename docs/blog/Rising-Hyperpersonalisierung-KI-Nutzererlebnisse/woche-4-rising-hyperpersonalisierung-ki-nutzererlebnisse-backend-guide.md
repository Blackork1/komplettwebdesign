# Backend-Eintrag: Woche 4 Rising (Hyperpersonalisierung und KI-gesteuerte Nutzererlebnisse)

Dieses Projekt nutzt für Blogposts die Tabelle `posts` und den Admin-Flow unter `/admin/blog/new`.

## 1) Felder im Admin-Formular

Trage im Formular `/admin/blog/new` folgende Werte ein:

- `Titel`:
  `Woche 4 Rising: Hyperpersonalisierung und KI-gesteuerte Nutzererlebnisse`
- `Kurzbeschreibung (excerpt)`:
  `Hyperpersonalisierung in Deutschland: So nutzt du KI, Segmentierung und DSGVO-konforme Datenprozesse für dynamische Inhalte, höhere Conversion und stärkere Nutzerbindung.`
- `Url-Slug`:
  `woche-4-rising-hyperpersonalisierung-ki-nutzererlebnisse`
- `Kategorie`:
  `Webdesign Masterclass`
- `Description` (Meta Description):
  `Woche 4 Rising: Hyperpersonalisierung und KI-gesteuerte Nutzererlebnisse. Lerne, wie du dynamische Inhalte, segmentierte CTAs und DSGVO-konforme Personalisierung für bessere Conversion und Engagement umsetzt.`
- `FAQ (JSON)`:
  Im Formular wird ein JSON-Array erwartet. Nutze den Wert `mainEntity` aus [woche-4-rising-hyperpersonalisierung-ki-nutzererlebnisse-faq-schema.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Hyperpersonalisierung-KI-Nutzererlebnisse/woche-4-rising-hyperpersonalisierung-ki-nutzererlebnisse-faq-schema.json) oder direkt das Feld `faq_json` aus [woche-4-rising-hyperpersonalisierung-ki-nutzererlebnisse-post.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Hyperpersonalisierung-KI-Nutzererlebnisse/woche-4-rising-hyperpersonalisierung-ki-nutzererlebnisse-post.json).
- `Inhalt (HTML erlaubt)`:
  Inhalt aus [woche-4-rising-hyperpersonalisierung-ki-nutzererlebnisse-content.html](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Hyperpersonalisierung-KI-Nutzererlebnisse/woche-4-rising-hyperpersonalisierung-ki-nutzererlebnisse-content.html)
- `Titelbild`:
  Ein Hero-Bild ist Pflicht (`hero_image`), sonst bricht `createPost` mit `Bild fehlt` ab.

## 2) Fertigpaket-Dateien

- HTML-Content: [woche-4-rising-hyperpersonalisierung-ki-nutzererlebnisse-content.html](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Hyperpersonalisierung-KI-Nutzererlebnisse/woche-4-rising-hyperpersonalisierung-ki-nutzererlebnisse-content.html)
- FAQ-Schema: [woche-4-rising-hyperpersonalisierung-ki-nutzererlebnisse-faq-schema.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Hyperpersonalisierung-KI-Nutzererlebnisse/woche-4-rising-hyperpersonalisierung-ki-nutzererlebnisse-faq-schema.json)
- Komplettes Post-Objekt: [woche-4-rising-hyperpersonalisierung-ki-nutzererlebnisse-post.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Hyperpersonalisierung-KI-Nutzererlebnisse/woche-4-rising-hyperpersonalisierung-ki-nutzererlebnisse-post.json)
- Standalone HTML: [woche-4-rising-hyperpersonalisierung-ki-nutzererlebnisse.html](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Hyperpersonalisierung-KI-Nutzererlebnisse/woche-4-rising-hyperpersonalisierung-ki-nutzererlebnisse.html)

## 3) Wichtige Backend-Hinweise

- `slug` kannst du manuell setzen (empfohlen für konsistente URLs). Die automatische Generierung in `BlogPostModel.create` funktioniert ebenfalls.
- `faq_json` muss ein JSON-Array sein (nicht das komplette FAQPage-Objekt), da der Controller daraus selbst das FAQPage JSON-LD baut.
- `description` wird im Head als `<meta name="description">` genutzt und im OG-Block verwendet.
