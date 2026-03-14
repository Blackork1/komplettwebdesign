# Backend-Eintrag: Woche 3 Rising (AI & SEO Synergy in German Search)

Dieses Projekt nutzt für Blogposts die Tabelle `posts` und den Admin-Flow unter `/admin/blog/new`.

## 1) Felder im Admin-Formular

Trage im Formular `/admin/blog/new` folgende Werte ein:

- `Titel`:
  `Woche 3 Rising: AI & SEO Synergy in German Search`
- `Kurzbeschreibung (excerpt)`:
  `AI-SEO in Deutschland: So kombinierst du semantische Cluster, Entity-Optimierung, strukturierte Daten und privacy-first Analytics für bessere Sichtbarkeit und datenschutzbewusste Prozesse.`
- `Url-Slug`:
  `woche-3-rising-ai-seo-synergy-german-search`
- `Kategorie`:
  `Webdesign Masterclass`
- `Description` (Meta Description):
  `Woche 3 Rising: AI & SEO Synergy in German Search. Lerne, wie du KI für semantische SEO-Workflows nutzt und dabei Datenschutz, Strukturqualität und Performance im deutschen Markt sicher berücksichtigst.`
- `FAQ (JSON)`:
  Im Formular wird ein JSON-Array erwartet. Nutze den Wert `mainEntity` aus [woche-3-rising-ai-seo-synergy-german-search-faq-schema.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-AI-SEO-Synergy/woche-3-rising-ai-seo-synergy-german-search-faq-schema.json) oder direkt das Feld `faq_json` aus [woche-3-rising-ai-seo-synergy-german-search-post.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-AI-SEO-Synergy/woche-3-rising-ai-seo-synergy-german-search-post.json).
- `Inhalt (HTML erlaubt)`:
  Inhalt aus [woche-3-rising-ai-seo-synergy-german-search-content.html](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-AI-SEO-Synergy/woche-3-rising-ai-seo-synergy-german-search-content.html)
- `Titelbild`:
  Ein Hero-Bild ist Pflicht (`hero_image`), sonst bricht `createPost` mit `Bild fehlt` ab.

## 2) Fertigpaket-Dateien

- HTML-Content: [woche-3-rising-ai-seo-synergy-german-search-content.html](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-AI-SEO-Synergy/woche-3-rising-ai-seo-synergy-german-search-content.html)
- FAQ-Schema: [woche-3-rising-ai-seo-synergy-german-search-faq-schema.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-AI-SEO-Synergy/woche-3-rising-ai-seo-synergy-german-search-faq-schema.json)
- Komplettes Post-Objekt: [woche-3-rising-ai-seo-synergy-german-search-post.json](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-AI-SEO-Synergy/woche-3-rising-ai-seo-synergy-german-search-post.json)
- Standalone HTML: [woche-3-rising-ai-seo-synergy-german-search.html](/Users/blocksdorf/Documents/KomplettWebDesign/docs/blog/Rising-AI-SEO-Synergy/woche-3-rising-ai-seo-synergy-german-search.html)

## 3) Wichtige Backend-Hinweise

- `slug` kannst du manuell setzen (empfohlen für konsistente URLs). Die automatische Generierung in `BlogPostModel.create` funktioniert ebenfalls.
- `faq_json` muss ein JSON-Array sein (nicht das komplette FAQPage-Objekt), da der Controller daraus selbst das FAQPage JSON-LD baut.
- `description` wird im Head als `<meta name="description">` genutzt und im OG-Block verwendet.
- Hinweis: Der Beitrag liefert operative Leitlinien, ersetzt aber keine juristische Beratung zu DSGVO-Einzelfällen.
