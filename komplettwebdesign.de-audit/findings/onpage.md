# On-Page SEO – komplettwebdesign.de

**Score: 63 / 100**
Stand: 23.10.2026 · Basis: `raw/crawl.json` (197 URLs), `raw/onpage-summary.txt`, 54 live gerenderte Seiten, Quellcode (nur gelesen).

| Teilbereich | Score |
|---|---|
| Title-Tags | 55 / 100 |
| Meta-Descriptions | 55 / 100 |
| H1 / Überschriftenstruktur | 70 / 100 |
| Interne Verlinkung / Ankertexte | 55 / 100 |
| URL-Hygiene / Duplikate | 65 / 100 |
| Strukturierte Daten (On-Page-Sicht) | 75 / 100 |

---

## Was gut funktioniert

- **Alle 197 URLs haben Title und H1**, keine Seite hat mehrere H1. Nur /demo/cq-compare/ hat keine Meta-Description.
- **Parameter-URLs sauber kanonisiert**: /kontakt?paket=…, /kontakt?projektart=…, /faq?cat=…, /en?cat=… zeigen per Canonical auf die Basis-URL. /leistungen/ ist auf /leistungen kanonisiert.
- **Keine Orphans** in der Sitemap, keine robots-Blockaden. Antwortzeit Median 88 ms.
- **Die meisten Titel sind beschreibend und lokal** („Website-Wartung Berlin | Pflege, Backups und Support“, „Webdesign Preise Berlin | Website-Pakete ab 799 €“). Preise im Titel sind ein Klick-Argument.
- **Leistungs-, Paket- und Ratgeberseiten** haben eigene, präzise Descriptions im Bereich 120–160 Zeichen. `metadata_template.py` findet kein site-weites Template-Muster (`site_risk: low`, `templated_ratio: 0.0`).
- **Breadcrumbs** (BreadcrumbList auf 157 Seiten), Service-, BlogPosting- und Organization-Schema sind breit vorhanden.
- **Gute Hub-Verlinkung von Money Pages**: /webdesign-berlin/kosten-preise-pakete hat 196 Inlinks, /leistungen/* je rund 191–195, /kontakt 158. Die Bezirksseiten verlinken mit beschreibenden Ankern auf Leistungen („Local SEO Berlin“, „Website-Relaunch“, „Business-Paket ansehen“).

---

## Findings

### HIGH

#### OP-H1 – Abgeschnittene Titles und Descriptions bei 8 Blogposts aus 2026 (mitten im Wort)
- **Beleg**:
  - Titles: `/blog/ki-sichtbarkeit-website-berlin-2026` → „KI-Sichtbarkeit 2026 ohne GEO-Mythen: Was deine Website“ (Satz bricht ab; og:title ist vollständig). `/blog/website-relaunch-inhalte-nicht-loeschen-2026` → „Website-Relaunch 2026: Welche Inhalte du nicht löschen“.
  - Descriptions mit exakt 160 Zeichen, mitten im Wort abgeschnitten:
    - /blog/google-unternehmensprofil-website-lokale-signale-berlin-2026 („… typischen Fehlern und“)
    - /blog/google-unternehmensprofil-website-widerspruch-berlin-brandenburg („… für lokale S“)
    - /blog/ki-sichtbarkeit-website-berlin-2026 („… statt H“)
    - /blog/local-seo-berlin-2026-website-profilsignale („… sinnvolle Bezir“)
    - /blog/mehr-anfragen-website-kontaktfehler-kmu-2026 („… Berlin &“)
    - /blog/relaunch-wegen-ki-suche („… praktischer Ein­“)
    - /blog/website-audit-relaunch-kmu-berlin-brandenburg („… 15 priorisierte Prü“)
    - /blog/website-relaunch-seo-ohne-sichtbarkeitsverlust-planen („… sauber um“)
- **Ursache**: Die Content-Agent-Pipeline erzwingt ≤ 160 Zeichen (`services/contentAgent/articleSchemas.js:230` `metaDescription: NonEmptyString.max(160)`, `autoPublishPolicy.js:114`). Gekürzt wird hart, nicht am Wort- oder Satzende. Bei den Titles greift offenbar eine ähnliche Kürzung.
- **Fix**: Kürzung am letzten Satzende (Fallback: Wortende) ohne Auslassungszeichen. Besser: das Modell explizit 140–155 Zeichen bzw. ≤ 60 Zeichen generieren lassen und bei Überlänge neu generieren statt abzuschneiden. Die 8 Datensätze manuell korrigieren.

#### OP-H2 – Titles zu lang (52 Seiten über 65 Zeichen), teils keyword-gestopft
- **Beleg** (Auszug):
  - Branchen: /branchen/webdesign-autowerkstatt (97 Zeichen), /webdesign-fotograf (91), /webdesign-beautysalon (89), /webdesign-blumenladen (88), /webdesign-tattoo (87), /webdesign-reinigung (86, „… Webdesign nach aktueller Paketlogik günstig“), /webdesign-physiotherapie (85), /webdesign-cafe (74)
  - Blog: /blog/webdesign-lichtenberg-berlin (94), /blog/woche-1-was-ist-webdesign (93), /blog/immobilienmakler-website-erstelle (87), /blog/immobilienmakler-homepage-check (86), /blog/webdesign-berlin-warum-eine-website-fuer-unternehmen-unverzichtbar-ist (85), /blog/woche-3-wichtigste-design-elemente (77), /blog/google-ai-overviews (75)
  - Sonstige: /ratgeber/was-ist-seo (80), /referenzen/kurdisches-filmfestival (78), /ratgeber/homepage-checker-website-check (76), Website-Tester-Seiten (68–70)
  - „nach aktueller Paketlogik“ in 7 Branchen-Titles ist ein Artefakt aus `util/legacyPublicCopy.js:33-40`.
- **Fix**: Muster für Branchen `{Branche}-Website erstellen lassen in Berlin | ab 799 €` (≤ 60 Zeichen), z. B. „Friseur-Website erstellen lassen in Berlin | ab 799 €“. Blog: Kernaussage plus Keyword, maximal etwa 60 Zeichen. „[Guide]“, „[Tutorial]“ und „[10 Tipps]“ nur im Title, nicht in der H1.

#### OP-H3 – Mehrere Seiten mit fast gleichem H1 und Title für „Website erstellen lassen Berlin“
- **Beleg**:
  - `/` H1 „Website erstellen lassen in Berlin – persönlich, SEO-freundlich und aus einer Hand“
  - `/webdesign-berlin` H1 „Website erstellen lassen in Berlin“, Title „Website erstellen lassen Berlin | Webdesign & Preise“
  - `/pakete` H1 „Website erstellen lassen in Berlin: Pakete ab 799 €“
  - `/ratgeber/website-erstellen-berlin-ablauf-dauer-kosten` Title „Website erstellen lassen in Berlin: Ablauf, Dauer und Kosten“
  - `/handwerker`, `/blog/full-service-webdesign-in-berlin`, `/blog/webdesign-berlin-warum-…`
  - Details zur Kannibalisierung: content.md, H4.
- **Fix**: Primär-Keyword nur auf **/webdesign-berlin**. Startseite: H1 auf Marke und Positionierung („Webdesigner in Berlin für kleine Unternehmen – persönlich und aus einer Hand“). /pakete: H1 „Website-Pakete und Preise ab 799 €“. Ratgeber: H1 „Ablauf und Dauer eines Website-Projekts“.

#### OP-H4 – Schwache interne Verlinkung von Blog- und Branchenseiten
- **Beleg** (Inlinks aus `crawl.json`, Selbstlinks und Paginierung herausgerechnet):
  - Fast alle 46 Blogposts erhalten Links nur aus der /blog-Paginierung (/blog?page=2–5). Die 2026er-Posts haben nur 1 Inlink (/blog Seite 1); einzelne kommen aus /ratgeber. Kontextuelle Links von Leistungsseiten auf passende Artikel fehlen weitgehend. Ausnahmen: /blog/website-kosten-2025-einfach-erklaert ← /leistungen und /blog/seo-fuer-blumenladen ← /leistungen/local-seo.
  - 11 Branchenseiten haben nur 1 Inlink (/branchen): arzt, autowerkstatt, beautysalon, fotograf, friseur, hebamme, physiotherapie, reinigung, restaurant, steuerberater, tattoo, wellness. Blumenladen, Café, Fitnesscoach und Immobilienmakler werden von der Startseite verlinkt.
  - /webdesign-kleine-unternehmen-berlin: 1 Inlink (/ablauf). /handwerker: 1 Inlink (/branchen). /webdesign-cafe/kosten und /webdesign-blumenladen/kosten: je 1.
  - Gleichzeitig sitewide Footer-Links (195 Inlinks) auf 4 Swipe-&-Cook-Rechtstexte und /hinweise-rechtstexte-seo-datenschutz. Interne Link-Autorität fließt so in fachfremde Seiten.
- **Fix**:
  - Jede Leistungsseite verlinkt 2–3 thematisch passende Blog- und Ratgeberartikel (Relaunch → Relaunch-Posts, Local SEO → Local-SEO- und GBP-Posts), und jeder Artikel verlinkt kontextuell auf genau eine Money Page.
  - Branchen: die 4–6 Kernbranchen aus Leistungs- und Referenzseiten verlinken (Referenz Backstube → /branchen/webdesign-cafe, TM Sauber & Mehr → /branchen/webdesign-reinigung).
  - Swipe-&-Cook-Links aus dem Footer entfernen.

### MEDIUM

#### OP-M1 – Meta-Descriptions zu lang oder mit ungeeignetem Inhalt
- **Zu lang** (33 Seiten über 160 Zeichen): /blog/ki-suche-webdesign-2026 (250), /blog/woche-3-wichtigste-design-elemente (229), /blog/website-checkliste-für-selbstandige (227), /blog/immobilienmakler-website-erstelle (214), /blog/immobilienmakler-homepage-check (209), /blog/Landingpages-Webshop-Webdesign-Berlin (207), /blog/von-traffic-zu-terminen (205), /blog/Scoll-Snapp-… (202), /ratgeber/homepage-checker-website-check (190), /branchen/webdesign-arzt (184), /blog/full-service-webdesign-in-berlin (183), /blog/eigener-website-chatbot (182), /en/webdesign-berlin/* (165–175), /about (170), /pakete (169), /website-tester/geo (171).
- **Inhaltlich problematisch**:
  - Telefonnummer oder CTA statt Nutzen: /en/webdesign-berlin/* „Call now: +49 1551 245048.“ (6× identisch); /blog/full-service-webdesign-in-berlin „Melde dich: +49 1525 4350378“ (**falsche Nummer**); „Antwort ≤ 24h“ in /blog/local-seo-berlin-fuer-freelancer, /blog/eigener-website-chatbot, /blog/Landingpages-…
  - Interner Jargon: /branchen „Alle Branchen auf einen Blick: Hero-Bilder + Titel.“; /branchen/webdesign-arzt „Festpreis nach aktueller Paketlogik“; /ratgeber/professionellen-website-vs-baukasten „– nach aktueller Paketlogik“; /leistungen/landingpage-erstellen-lassen und /leistungen/website-relaunch „technisch sauber mit Node.js/EJS umsetzen“ (für kleine Unternehmen ohne Kaufrelevanz).
  - Abgebrochen bzw. Stub: /blog/chatgpt-agentenmodus (endet mit „:“), /blog/media-queries-vs-container-queries (stray „““ am Ende).
  - Sie-Form: /about („Erfahren Sie …“), /booking („Wählen Sie einen Termin für Ihre Buchung aus.“, 45 Zeichen), /impressum, /datenschutz, /blog/was-ist-webdesign-11-woechiger-guide.
  - Sekundäre Muster aus `metadata_template.py`: `description_echoes_title` auf /en/kontakt, /webdesign-kleine-unternehmen-berlin, /blog/3d-interaktives-ux-design (Description beginnt wortgleich mit dem Titel), /ratgeber/baukasten-vs-professionelle-website, /ratgeber/website-fuer-handwerker-berlin, /ratgeber/website-fuer-restaurants-cafes-berlin. `brand_suffix_in_description` auf /pakete, /pakete/start, /pakete/individuell, /leistungen/website-relaunch und den EN-Paketseiten.
- **Fix**: 130–155 Zeichen, Nutzen + konkreter Fakt (Preis, Dauer, Umfang) + du-Ansprache, keine Telefonnummern und kein Tech-Stack. /booking z. B. „Buche dein kostenloses Erstgespräch zu deinem Website-Projekt in Berlin – 20 Minuten, unverbindlich, per Telefon oder Video.“

#### OP-M2 – Doppelte URL-Varianten durch Sonderzeichen im Slug
- **Beleg**: `/blog/Scoll-Snapp-Galery-&-Zoom‑on‑View` (enthält `&` und das Unicode-Zeichen „‑“ U+2011) und `/blog/Scoll-Snapp-Galery-&-Zoom%E2%80%91on%E2%80%91View` werden beide mit 200 ausgeliefert. Ebenso `/blog/website-checkliste-für-selbstandige` und `/blog/website-checkliste-f%C3%BCr-selbstandige`. Laut Crawl zeigt der Canonical auf die unkodierte Form, Titel und H1 sind doppelt.
- Weitere schwache Slugs: Großschreibung (/blog/GA4-Tracking-Framework, /blog/Google-AI-Mode-und-AI-Overviews, /blog/Landingpages-Webshop-Webdesign-Berlin, /blog/Lokale-SEO-Hacks-fuer-Berlin), Tippfehler (`immobilienmakler-website-erstelle`, `selbstandige`, `Scoll-Snapp-Galery`), widersprüchliche Jahreszahl (`barrierefreiheit-2020-…`, Titel 2025).
- **Fix**: ASCII-Kleinbuchstaben-Slugs (`/blog/website-checkliste-selbststaendige`, `/blog/scroll-snap-galerie-zoom-on-view`) mit 301 von allen Altvarianten. Bei Posts ohne Traffic und Backlinks reicht die Konsolidierung (siehe content.md M4). Weitere Slug-Änderungen nur bei Seiten mit wenig Traffic und immer mit 301.

#### OP-M3 – /en/pakete/* auf noindex, aber deutsche Titles und H1 und intern verlinkt
- **Beleg**: /en/pakete/business, /start, /wachstum, /individuell haben Title und H1 auf Deutsch („Business-Paket für kleine Unternehmen“), `noindex`, und 15–22 Inlinks aus dem EN-Bereich. /en/pakete hat englische H1, ist aber ebenfalls noindex. Die EN-Startseite verspricht „Packages from 799 €“, die Ziel-Paketseiten sind nicht indexierbar und nicht übersetzt.
- **Fix**: EN-Paketseiten übersetzen und indexierbar machen (hreflang-Paare mit /pakete/*), oder EN-Links direkt auf /en/kontakt führen. Kein Halbzustand.

#### OP-M4 – Generische Ankertexte auf Paketkarten
- **Beleg**: In den 54 gerenderten Seiten 41× „Details“ und 8× „Details ansehen“ als Ankertext (Paketkarten auf Branchen-, Paket- und Bezirksseiten), dazu „Hier Pakete ansehen“, „Jetzt anfragen“.
- **Fix**: „Start-Paket ab 799 € ansehen“, „Business-Paket im Detail“. Alternativ `aria-label` plus sichtbarer Kontext. Kein Ranking-Faktor im engeren Sinn, aber ein klareres Relevanzsignal für die Paketseiten.

#### OP-M5 – H1-Qualität einzelner Seiten
- **Beleg**:
  - /handwerker: „Handwerker-Website erstellen lassen in Berlin : In 30 Tage bis zu 128 % mehr Aufträge“ (Leerzeichen vor Doppelpunkt, Grammatik, unbelegte Zahl)
  - /referenzen: „Websites, die im echten Betrieb funktionieren.“ (kein Bezug zu Referenzen oder Webdesign)
  - /ratgeber: „Evergreen-Wissen für Website-Projekte in Berlin.“ (Jargon)
  - /blog: „Aktuelle Einschätzungen zu Webdesign, SEO und Sichtbarkeit.“ (auch auf /blog?page=2–5 identisch)
  - /about: „Hallo, ich bin Sören 👋“ (kein Beruf, kein Ort)
  - Blog-H1s mit Klammer-Zusätzen („[Guide]“, „[Tutorial]“, „[10 Tipps]“, „[Anleitung]“)
  - Branchen-H1s ohne Ort („Friseur Website erstellen“), Bindestrich fehlt („Friseur-Website“)
- **Fix**:
  - /handwerker: „Handwerker-Website erstellen lassen in Berlin“
  - /referenzen: „Webdesign-Referenzen aus Berlin: Projekte im echten Betrieb“
  - /ratgeber: „Ratgeber: Website planen, Kosten und Local SEO für kleine Unternehmen“
  - /about: „Hallo, ich bin Sören – Webdesigner in Berlin“
  - Klammer-Zusätze aus den H1 entfernen
  - Paginierte Blogseiten: Title und H1 mit „– Seite N“

### LOW

- **OP-L1 – Übersprungene Überschriftenebenen** auf 97 Seiten (z. B. h2 → h4 auf /kontakt, /en/kontakt, Website-Tester, /faq). Kein Ranking-Problem, aber relevant für Barrierefreiheit und die Gliederung in KI-Extraktion. Card-Titel als h3 statt h4 bzw. Styling über Klassen.
- **OP-L2 – Kurzer Title**: /booking „Termin buchen“ (13 Zeichen). Fix: „Kostenloses Erstgespräch buchen | Komplett Webdesign“.
- **OP-L3 – /about-Title** „Über uns - Wer ist Komplett Webdesign?“: Einzelunternehmer, Keyword fehlt. Fix: „Über mich: Sören Blocksdorf, Webdesigner in Berlin“.
- **OP-L4 – Fehlendes Schema** auf /about (ProfilePage/Person fehlt), /blog und /ratgeber (CollectionPage), /impressum. Bild-Alt fehlt bei 2 Bildern auf /blog/chatgpt-agentenmodus. 4.066 leere alt-Attribute sind überwiegend dekorative Icons (ok). 5.207 Bilder ohne width/height (CLS-Thema, siehe Performance-Audit).
- **OP-L5 – Indexierbar, aber nicht in Sitemap**: /booking, /demo/cq-compare/, 11 Branchenseiten, /blog?page=2–5. /demo/cq-compare/ und /booking auf noindex. Branchen siehe content.md H5.
- **OP-L6 – hreflang**: 123 Seiten ohne hreflang bzw. ohne Rückverweis (u. a. Parameter-URLs mit hreflang auf Basis-URLs). Details im Technik- und International-Audit.

---

## Priorisierte Quick Wins

| # | Maßnahme | Aufwand |
|---|---|---|
| 1 | 8 abgeschnittene Blog-Descriptions und 2 Titles manuell korrigieren; Kürzungslogik auf Satz- bzw. Wortende umstellen | 1 h |
| 2 | 7 Branchen-Titles ohne „nach aktueller Paketlogik“ auf ≤ 60 Zeichen kürzen | 30 min |
| 3 | Falsche Telefonnummer in der Description von /blog/full-service-webdesign-in-berlin ersetzen; „Call now“ aus den EN-Bezirks-Descriptions entfernen | 15 min |
| 4 | H1 von Startseite, /pakete und /webdesign-berlin entflechten (ein Primär-Keyword pro URL) | 30 min |
| 5 | Kontextuelle Links Leistungsseite ↔ Blog/Ratgeber (2–3 je Leistungsseite); Swipe-&-Cook-Links aus dem Footer | 2 h |
| 6 | Doppelte Sonderzeichen-Slugs per 301 bereinigen | 30 min |
| 7 | „Details“-Anker auf Paketkarten beschreibend machen | 30 min |

---

## Strukturierte Findings (für audit-data.json, Kategorie „On-Page SEO“)

```json
{
  "category": "On-Page SEO",
  "score": 63,
  "stats": {"pages": 197, "titles_over_65": 52, "descriptions_over_160": 33, "missing_description": 1, "missing_h1": 0, "multiple_h1": 0, "skipped_heading_levels": 97, "truncated_meta_2026_posts": 8},
  "findings": [
    {"id": "OP-H1", "severity": "high", "title": "Abgeschnittene Titles/Descriptions (mitten im Wort) bei 8 Content-Agent-Posts 2026", "source": ["services/contentAgent/articleSchemas.js:230", "services/contentAgent/autoPublishPolicy.js:114"]},
    {"id": "OP-H2", "severity": "high", "title": "52 Titles >65 Zeichen, Branchen-Titles keyword-gestopft mit 'nach aktueller Paketlogik'", "source": ["util/legacyPublicCopy.js:33-40"]},
    {"id": "OP-H3", "severity": "high", "title": "H1/Title-Duplikate fuer 'Website erstellen lassen Berlin' auf /, /webdesign-berlin, /pakete, /ratgeber/website-erstellen-berlin-ablauf-dauer-kosten"},
    {"id": "OP-H4", "severity": "high", "title": "Blogposts nur via Paginierung verlinkt; 11 Branchenseiten mit 1 Inlink; Footer-Links auf Swipe-&-Cook-Rechtstexte"},
    {"id": "OP-M1", "severity": "medium", "title": "33 Descriptions >160, Telefon-CTAs (inkl. falscher Nummer), Jargon, Sie-Form"},
    {"id": "OP-M2", "severity": "medium", "title": "Doppelte URL-Varianten durch &/Unicode/Umlaut im Slug; Grossschreibung/Tippfehler in Slugs"},
    {"id": "OP-M3", "severity": "medium", "title": "/en/pakete/* noindex mit deutschem Title/H1, aber intern verlinkt"},
    {"id": "OP-M4", "severity": "medium", "title": "Generische Anker 'Details' (41x in Stichprobe)"},
    {"id": "OP-M5", "severity": "medium", "title": "Schwache H1 auf /handwerker, /referenzen, /ratgeber, /blog, /about"},
    {"id": "OP-L1-L6", "severity": "low", "title": "Heading-Spruenge, kurzer /booking-Title, /about-Title, fehlendes ProfilePage-Schema, Sitemap-Luecken, hreflang"}
  ]
}
```
