# Backend-Eintrag: Woche 1 Rising (AI-Native Internet)

Dieses Projekt nutzt für Blogposts die Tabelle `posts` und den Admin-Flow unter `/admin/blog/new`.

## 1) Felder im Admin-Formular

Trage im Formular `/admin/blog/new` folgende Werte ein:

- `Titel`:
  `Woche 1 Rising: AI-Native Internet & Semantic Retrieval`
- `Kurzbeschreibung (excerpt)`:
  `AI-Native Internet im Praxiseinsatz: So strukturierst du Inhalte für Semantic Retrieval, AI-Suche und Agenten mit klarer Informationsarchitektur, JSON-LD und konkretem 90-Tage-Plan.`
- `Url-Slug`:
  `woche-1-rising-ai-native-internet-semantic-retrieval`
- `Kategorie`:
  `Webdesign Masterclass`
- `Description` (Meta Description):
  `Woche 1 Rising: AI-Native Internet und Semantic Retrieval für Deutschland. Lerne, wie du Websites mit semantischen Content-Chunks, JSON-LD und AI-Discoverability zukunftssicher aufbaust.`
- `FAQ (JSON)`:
  Im Formular wird ein JSON-Array erwartet. Nutze den Wert `mainEntity` aus [woche-1-rising-ai-native-internet-faq-schema.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Ai-Native/woche-1-rising-ai-native-internet-faq-schema.json) oder direkt das Feld `faq_json` aus [woche-1-rising-ai-native-internet-post.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Ai-Native/woche-1-rising-ai-native-internet-post.json).
- `Inhalt (HTML erlaubt)`:
  Inhalt aus [woche-1-rising-ai-native-internet-content.html](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Ai-Native/woche-1-rising-ai-native-internet-content.html)
- `Titelbild`:
  Ein Hero-Bild ist Pflicht (`hero_image`), sonst bricht `createPost` mit `Bild fehlt` ab.

## 2) Fertigpaket-Dateien

- HTML-Content: [woche-1-rising-ai-native-internet-content.html](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Ai-Native/woche-1-rising-ai-native-internet-content.html)
- FAQ-Schema: [woche-1-rising-ai-native-internet-faq-schema.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Ai-Native/woche-1-rising-ai-native-internet-faq-schema.json)
- Komplettes Post-Objekt: [woche-1-rising-ai-native-internet-post.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-Ai-Native/woche-1-rising-ai-native-internet-post.json)

## 3) Wichtige Backend-Hinweise

- `slug` kannst du manuell setzen (empfohlen für konsistente URLs). Die automatische Generierung in `BlogPostModel.create` funktioniert jetzt wieder.
- `faq_json` muss ein JSON-Array sein (nicht das komplette FAQPage-Objekt), da der Controller daraus selbst das FAQPage JSON-LD baut.
- `description` wird im Head als `<meta name="description">` genutzt und im OG-Block verwendet.
