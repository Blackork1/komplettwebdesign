# Schema / Structured Data Audit: komplettwebdesign.de

Stand: 2026-10-23 | Prüfer: Schema-Spezialist (claude-seo)

## Score: 58 / 100

| Bereich | Gewicht | Bewertung | Anmerkung |
|---|---|---|---|
| Syntax und Validität | 20 | 19 | Kein einziger defekter Block, `@context` überall `https://schema.org` |
| Pflicht-/empfohlene Felder (Google-Typen) | 20 | 14 | BlogPosting, BreadcrumbList gut. Home-Breadcrumb mit 1 Eintrag, relative Bild-URLs |
| Entity-Graph / @id-Verknüpfung | 25 | 10 | Organization in 6 Varianten, 37 Knoten ohne @id, Person nur auf Home |
| Konsistenz mit sichtbarem Inhalt / Impressum | 20 | 10 | Tel./Mail passen. Eine Seite mit falscher Nummer und falschen Preisen. Apex-Domain, `/en` zeigt auf DE-URL |
| Abdeckung / Chancen | 15 | 5 | `/about`, `/blog`, `/ratgeber`, Pakete ohne Offer, kein Autor als Person |

Eingeordnet: technisch sauber ausgespielt, aber als Graph nicht konsistent und für Autor/Entität (E-E-A-T, KI-Suche) noch nicht genutzt. Rich-Result-Potenzial ist ohnehin klein (siehe Abschnitt "Rich-Result-Eignung").

## Prüfumfang und Methode

- Live abgerufen (Raw-HTML, `render_page.py --mode never`; Seite ist SSR/EJS, `is_spa=false`, JSON-LD steht im Server-HTML): alle 145 URLs aus `raw/crawl.json` ohne Query-String und ohne URL-encodierte Duplikate. Detailprüfung per Hand: `/`, `/en`, `/webdesign-berlin`, `/en/webdesign-berlin`, `/webdesign-berlin/kreuzberg`, `/branchen/webdesign-friseur`, `/pakete`, `/pakete/start`, `/en/pakete/start`, `/blog/full-service-webdesign-in-berlin`, `/blog/website-relaunch-berlin-checkliste`, `/ratgeber/website-kosten-berlin`, `/kontakt`, `/about`, `/impressum`, `/referenzen`, `/referenzen/zur-alten-backstube`, `/referenzen/kurdisches-filmfestival`, `/leistungen/local-seo`.
- Gegenprobe der sichtbaren Daten: `/impressum` (Inhaber Sören Blocksdorf, Möllendorffstr 26, 10367 Berlin, Tel. +49 1551 245048, kontakt@komplettwebdesign.de), Footer-Links, `/about`-Text.
- Nicht ausgeführt: Google Rich Results Test / Schema-Markup-Validator (kein externer Zugriff vorgesehen). Validierung manuell gegen Googles Dokumentation und schema.org.
- Nicht geprüft: `/blog?page=n`, die separate Cookavoli-Site im Repo (`views/cookavoli/partials/head.ejs:42`), ob jede FAQ-Antwort 1:1 im sichtbaren Text steht.

Korrektur zur Auftragsannahme: Google hat FAQ-Rich-Results am 7. Mai 2026 für ALLE Websites abgeschaltet (nicht nur Behörden/Gesundheit seit 2023). Siehe Finding L1.

## Was gut funktioniert

- 145 von 145 Seiten parsebar: 0 ungültige JSON-Blöcke, 0 abgeschnittene Blöcke. `@context` ausnahmslos `https://schema.org` (nie `http`). Keine `http://`-URLs. Keine Platzhaltertexte (die Treffer "[Guide]" und "[A…" sind echte Titelbestandteile).
- Keine veralteten Typen im Einsatz (kein HowTo, SpecialAnnouncement, CourseInfo, LearningVideo). Keine erfundenen Review/AggregateRating-Blöcke.
- Server-seitig gerendert: kein Render-Risiko, Crawler sehen das Markup sofort.
- XSS-Härtung in der zentralen Ausgabe: `views/partials/head.ejs:188-200` maskiert `< > &` als `<` usw. für `structuredDataBlocks`.
- Saubere @id-Graphen auf: Home (`views/index.ejs:78-209`), Branchen und Handwerker (`helpers/industrySchema.js`, `helpers/pageSchema.js:44-150`), `/webdesign-berlin` (`views/bereiche/webdesign-berlin.ejs:7-67`), `/en/webdesign-berlin`. Dort gilt WebPage -> mainEntity/about -> Service -> provider @id -> Organization, plus BreadcrumbList per @id.
- Home: Organization, Person, WebSite, Service, WebPage mit stabilen @ids (`#organization`, `#person`, `#website`, `#webdesign-service`, `#webpage`), `worksFor`, `publisher`, `author` korrekt verlinkt.
- Kontaktdaten konsistent mit Impressum: Telefon `+49 1551 245048` und `kontakt@komplettwebdesign.de` auf allen Seiten außer einer (H4). Name "Komplett Webdesign" und Person "Sören Blocksdorf" decken sich mit dem Impressum.
- BlogPosting (56 Knoten) hat headline, description, `image` als ImageObject 1200x675, publisher, datePublished und dateModified in ISO 8601 mit Zeitzone: Google-Felder bis auf Autor-URL erfüllt. Die Blog-Pipeline lässt FAQPage bei leerem FAQ-Array weg (`services/blogPostPresentationService.js:250-252`).
- BreadcrumbList: 137 Knoten, Positionen und absolute URLs korrekt (Ausnahmen L2).

## Wo das JSON-LD erzeugt wird

| Seitentyp | Datei:Zeile |
|---|---|
| Zentrale Ausgabe (`structuredDataBlocks`, `structuredDataRaw`) | `views/partials/head.ejs:184-186` (Raw-String, ohne Escaping), `:188-200` (Objekte, mit Escaping) |
| Home DE/EN (Org, Person, WebSite, Service, WebPage, FAQ) | `views/index.ejs:71-77` (FAQ), `:78-209` (Org ab `:82`, Person `:123`, WebSite `:142`, Service `:152`, WebPage `:166`, `dateModified` `:173`, Breadcrumb `:190-199`) |
| `/webdesign-berlin` | `views/bereiche/webdesign-berlin.ejs:7-67` |
| `/en/webdesign-berlin` | `views/bereiche/webdesign-berlin-en.ejs:2-13` (Daten kommen aus `schema`-Variable des Controllers) |
| Bezirke DE | `views/bereiche/webdesign-berlin-district.ejs:2-45` (`districtUrl` hart `https://komplettwebdesign.de` in `:2`, Breadcrumb `:22-24`, ProfessionalService `:28-42`) |
| Bezirke EN | `views/bereiche/webdesign-berlin-district-en.ejs:2-14` (nur Breadcrumb, Apex-Domain `:7-9`) |
| Legacy-Bezirke (Apex-Domain, alte Texte, vermutlich ungenutzt, da Live-Ausgabe der `district.ejs` entspricht) | `views/bereiche/webdesign-berlin-{mitte,kreuzberg,friedrichshain,charlottenburg,lichtenberg,prenzlauer-berg}.ejs:2-95` |
| Branchen | `controllers/industriesController.js:303` -> `helpers/industrySchema.js` (`buildIndustrySchemas`), `views/industries/index.ejs:3-20` (nur Breadcrumb) |
| Handwerker (CMS-Slug) | `controllers/slugController.js:44-52` -> `helpers/pageSchema.js:44-150`. Andere CMS-Seiten: `views/page_view.ejs:28` (`JSON.stringify` ohne Escaping) |
| Leistungsseiten (SEO-Landings) | `controllers/seoLandingController.js:109-175` (WebPage `:113`, Service `:133-149`, Breadcrumb `:151-160`, FAQ `:161-173`) |
| Leistungen (Detail mit Org/WebSite) | `views/leistungen/show.ejs:30-155`. Übersicht: `views/static/leistungen.ejs:5-44` |
| Pakete Liste / Detail | `views/packages_list.ejs:28-60`, `util/seoSchemas.js:1-110` (`buildPackageSchemas`, Aufruf `controllers/packagesController.js:357` und `:552`) |
| Blog | `services/blogPostPresentationService.js:219-253` (Org `:221-227`, Breadcrumb `:229-236`, BlogPosting `:238-249`, FAQ `:250-252`). Datumsquellen `:182-183` |
| Ratgeber | `controllers/ratgeberController.js:166-213` (als `seoExtra`-String, ohne Escaping). Datumsquelle `:115-116` (`created_at`/`updated_at`) |
| Referenzen | `controllers/referenceController.js:12-30` (Übersicht), `:34-75` (Detail) |
| Kontakt | `controllers/contactController.js:714-775` (`buildContactStructuredData`), Aufruf `:1074` |
| FAQ-Seite | `views/faq.ejs:2`, `controllers/faqController.js:104-107` (zusätzlich JSON-Endpunkt mit `application/ld+json`) |
| Website-Tester | `controllers/testController.js:576-710`, `helpers/testerSeoExtra.js:8-141` |
| Altlast | `views/index copy.ejs:33,43` (alte Telefonnummer `+49 1525 4350378`) |
| Statische Kostenseiten | `views/static/kosten/*.ejs:5-17` (`structuredDataRaw`), nicht im Detail geprüft |

## Findings

### Critical
Keine. Es gibt keine ungültigen Blöcke, keine Spam-Muster und keine Richtlinienverstöße, die Rich Results gefährden würden.

### High

**H1. Entity-Graph fragmentiert: Organization in 6 Varianten, 37 Knoten ohne @id, Person nur auf Home**
- Beleg (145 Seiten, `https://www.komplettwebdesign.de/#organization`):
  - volle Fassung (Adresse fehlt, aber Kontakt, sameAs, areaServed, priceRange) nur auf `/` und `/en`;
  - 60 Seiten (alle Blogposts, `/handwerker`) nur `name`, `url`, `logo`;
  - 8 Paketseiten (DE+EN) betten die Organization als `provider` mit Kontaktdaten ein;
  - 5 Leistungsseiten nur `name`, `url`;
  - `/en/webdesign-berlin` mit anderem `sameAs`;
  - 4 Seiten (u. a. `/webdesign-berlin/kosten-preise-pakete`, `/leistungen/responsives-design-mobile`, `/leistungen/inhalte-texte-content`) nutzen `https://www.komplettwebdesign.de#organization` ohne Slash, also eine andere @id.
  - 37 Organization-Knoten ohne @id (10 in `provider`/`publisher`-Blöcken, 14 Autor/Publisher Blog+Ratgeber, 13 weitere).
  - `#person` wird nur auf `/` und `/en` definiert. `views/index.ejs:166-186` verweist darauf, Blogposts nutzen es nicht.
- Warum wichtig: Suchmaschinen und KI-Systeme müssen die Entität aus vielen dünnen, widersprüchlichen Fragmenten zusammensetzen. Identische @id mit unterschiedlichem Inhalt gilt als Konflikt.
- Fix: eine zentrale Funktion `buildCoreEntities({ base, lng })` (z. B. `util/schemaCore.js`), die Organization (bzw. ProfessionalService), Person und WebSite mit identischem, vollständigem Inhalt liefert. Alle Controller und Views hängen sie an `structuredDataBlocks` an (oder referenzieren nur `{"@id": …}`, wenn die Node auf derselben Seite steht). @id-Schema vereinheitlichen: `${base}/#organization` (mit Slash), `${base}/#person`, `${base}/#website`. Anonyme `provider`/`publisher`/`author`-Objekte durch `{"@id": …}` ersetzen. Betroffen: `util/seoSchemas.js:8-35`, `views/leistungen/show.ejs:30-60`, `controllers/seoLandingController.js:127-146`, `controllers/referenceController.js:42-47`, `controllers/ratgeberController.js:193-198`, `views/bereiche/webdesign-berlin.ejs:22-26`.

**H2. `/en` beschreibt sich selbst als die deutsche Startseite**
- Beleg: Auf `/en` hat der WebPage-Knoten `url: https://www.komplettwebdesign.de/` (DE), `@id …/#webpage`, `inLanguage: en-US`. Dieselben @ids (`#website`, `#webpage`, `#organization`) werden auf `/` mit `de-DE` und auf `/en` mit `en-US` geliefert (WebSite `inLanguage` widersprüchlich). Texte gemischt: Organization-Description "Persönliches Webdesign, technische SEO-Grundlagen und clear website packages from 799 €." (`views/index.ejs:97`), Service-Name und -Beschreibung bleiben deutsch, WebPage-Name deutsch, `priceRange: "ab 799 €"`. Quelle: `views/index.ejs:78-209` (`schemaHomeUrl` immer DE).
- Fix: für `/en` eigene @ids (`https://www.komplettwebdesign.de/en#webpage`, `…/en#website`), `url` = kanonische `/en`-URL, Texte englisch (`from €799`), `translationOfWork`-artige Verknüpfung nicht nötig. Organization und Person dürfen dieselbe @id behalten, aber mit sprachneutralem Inhalt. Dasselbe gilt für `util/seoSchemas.js` (EN-Paketseiten liefern deutsche `description`, `/en/pakete*` sind zudem noindex).

**H3. Bezirksseiten: Apex-Domain in Schema statt www, plus pseudo-lokale ProfessionalService-Knoten**
- Beleg: 12 Seiten (6 DE, 6 EN). DE: `@id`, `url` und alle Breadcrumb-`item` = `https://komplettwebdesign.de/…`. Die Apex-Domain leitet per 301 auf `www` weiter (geprüft), der Canonical ist `www`. EN-Bezirke liefern nur eine BreadcrumbList (36 Items mit Apex). Quelle: `views/bereiche/webdesign-berlin-district.ejs:2,22-24,30-31` und `…-district-en.ejs:7-9`.
- Zusätzlich: Jeder Bezirk bekommt einen eigenen `ProfessionalService` ("Komplett Webdesign Kreuzberg") ohne Adresse, ohne Verbindung zur Haupt-Organization. Das wirkt wie sechs Standorte, die es nicht gibt (Impressum: ein Einzelunternehmer, Möllendorffstr 26, Berlin-Lichtenberg) und kollidiert mit der Entität auf Home.
- Fix: `districtUrl` aus `canonicalBaseUrl` ableiten (`https://www…`). Bezirks-Knoten als `Service` (nicht ProfessionalService) mit `provider: {"@id": "…/#organization"}` und `areaServed: AdministrativeArea "Kreuzberg"` umbauen (Muster steht in `helpers/industrySchema.js`). WebPage-Knoten mit `mainEntity` ergänzen. Legacy-Dateien `webdesign-berlin-<bezirk>.ejs` löschen, falls ungenutzt.

**H4. Blogpost `/blog/full-service-webdesign-in-berlin`: falsche Telefonnummer, falsche Preise, tote URL**
- Beleg: ProfessionalService mit `telephone +4915254350378` (Sichtbar im Text und in `tel:`-Links ebenfalls `+49 1525 4350378`, Impressum und alle anderen Seiten: `+49 1551 245048`). `hasOfferCatalog` nennt Basis 499 EUR, Business 899 EUR, Premium 1499 EUR; aktuell gelten ab 799 / 1.499 / 2.499 / 3.500 EUR. `sameAs` zeigt auf die eigene Kontaktseite (kein Profil). WebPage-Knoten mit URL `/full-service-webdesign-in-berlin-or-komplett-webdesign-landingpages-and-relaunch` (nicht im Crawl/Sitemap), Breadcrumb dorthin. Das JSON-LD ist im Beitragsinhalt (DB) eingebettet, nicht im Code. Im Repo gibt es die alte Nummer nur in `views/index copy.ejs:33,43`.
- Fix: Block im Beitragsinhalt (Admin/DB) löschen. Die Seite hat bereits BlogPosting und Breadcrumb aus `services/blogPostPresentationService.js`. Falls Preise gezeigt werden sollen, aus `packagePricing` generieren. Nummer im Fließtext (`tel:`-Links) auf `+49 1551 245048` prüfen.

### Medium

**M1. Autor nur als Organization; Person-Typ mit Firmennamen; Dubletten mit Widersprüchen**
- Beleg: BlogPosting/Ratgeber nutzen `author` = Organization (43 per @id, 14 inline ohne @id). Einmal `author: {"@type":"Person","name":"Komplett Webdesign"}` (`/blog/Scoll-Snapp-Galery-&-Zoom‑on‑View`). Drei Beiträge tragen zusätzliche Dubletten aus dem Inhalt: `/blog/wordpress-2025-deutschland-staerken-grenzen-empfehlungen` (BlogPosting + Article mit abweichender Überschrift und `dateModified` 2025-08-17 gegen 2026-07-11), `/blog/Scoll-Snapp-Galery-&-Zoom‑on‑View` (Article ohne `dateModified`), `/blog/Landingpages-Webshop-Webdesign-Berlin` (2x BlogPosting, 2x BreadcrumbList).
- Fix: `author: {"@type":"Person","@id":"…/#person","name":"Sören Blocksdorf","url":"…/about"}` in `services/blogPostPresentationService.js:245` und `controllers/ratgeberController.js:193`, Person-Node per H1 überall mitliefern. Eingebettete Dubletten im Beitragsinhalt entfernen. Für Fachbeiträge Autor sichtbar mit Link auf `/about` ausweisen.

**M2. Unglaubwürdige Datumssignale**
- Beleg: 29 von 56 BlogPostings haben exakt dasselbe `dateModified` `2026-07-11T20:14:17+02:00` (Sammel-Update/Migration, kein inhaltlicher Anlass). Home-WebPage setzt `dateModified` bei jedem Abruf auf das heutige Datum (`views/index.ejs:173`, `new Date()`), `datePublished` fest `2024-01-01`. Ratgeber nutzen `created_at`/`updated_at` statt `published_at` (`controllers/ratgeberController.js:115-116`); alle Ratgeber haben Veröffentlichung = Änderung.
- Fix: `dateModified` nur bei inhaltlicher Änderung setzen (eigenes Feld statt `updated_at`, das bei Migrationen springt). Home-`dateModified` entfernen oder an einen echten Stand koppeln. Ratgeber auf `published_at` umstellen.

**M3. Relative und leere Bild-URLs**
- Beleg: Auf 9 Seiten steht ein relativer Pfad in `image.url`/`url`, z. B. `/images/ratgeber/Kosten.png` (`/ratgeber/website-kosten-berlin`, `…/baukasten-vs-professionelle-website`, `…/website-relaunch-berlin`, `…/website-erstellen-berlin-ablauf-dauer-kosten`, `…/website-fuer-restaurants-cafes-berlin`, `…/website-fuer-handwerker-berlin`, `/leistungen/inhalte-texte-content`, `…/rechtliches-sicherheit`, `…/responsives-design-mobile`). Auch `og:image` ist dort relativ (`controllers/ratgeberController.js:158`). Bei fehlendem Bild wird `url: ""` ausgegeben (`ratgeberController.js:189`, `services/blogPostPresentationService.js:244`).
- Fix: Hilfsfunktion `absoluteUrl(base, path)` (existiert in `controllers/referenceController.js:6-10`) in Blog und Ratgeber verwenden. `image` nur ausgeben, wenn vorhanden.

**M4. Pakete: kein Preis/Offer, uneinheitliche Knoten**
- Beleg: `/pakete/start` etc. liefern Service ohne `@id`, ohne `offers`/Preis. Die Preise (ab 799 / 1.499 / 2.499 / 3.500 EUR) sind sichtbar und in FAQ-Antworten genannt, fehlen aber strukturiert. `provider` bettet die komplette Organization ein, mit `sameAs: ["https://www.komplettwebdesign.de/"]` (keine Profil-URL) und `areaServed Country "Germany"` (Home: "Deutschland"): `util/seoSchemas.js:8-35`. `/pakete`: WebPage, ItemList und `isPartOf`-WebSite ohne @id, `inLanguage "de"` statt `de-DE` (`views/packages_list.ejs:38-52`). Home-Service hat kein `hasOfferCatalog`.
- Fix: Offer mit `priceSpecification.minPrice` aus `res.locals.packagePricing` erzeugen (Vorschlag 2 unten), Service-@id `…/pakete/start#service`, `provider` nur per @id. Paket-Services in `/pakete` per ItemList mit `@id`-Verweisen koppeln. Hinweis: Service/Offer ist kein Google-Rich-Result, der Nutzen liegt in Entitätsklarheit.

**M5. Organization unvollständig und nicht deckungsgleich mit sichtbaren Profilen**
- Beleg: Keine `address` (Impressum nennt öffentlich Möllendorffstr 26, 10367 Berlin), kein `founder`/`employee` -> Person, kein `legalName`. `sameAs` im Schema: `instagram.com/KomplettWebdesign` (www, Großbuchstaben), `youtube.com/@KomplettWebdesign`, plus `threads.com/@komplettwebdesign`. Footer sichtbar: `instagram.com/komplettwebdesign`, `youtube.com/@komplettwebdesign`, kein Threads-Link. `/en/webdesign-berlin` listet wieder andere. LinkedIn `…/in/komplettwebdesign` ist ein Personen-Profilpfad, als Organization-`sameAs` unüblich (Firmenseiten: `/company/`). `priceRange` als Freitext "ab 799 €" (Google/schema.org erwarten eher Preisklasse wie "€€").
- Fix: Profil-URLs exakt wie in den Footer-Links (oder umgekehrt) vereinheitlichen und nur Profile aufnehmen, die tatsächlich verlinkt/gepflegt sind. `address` nur ergänzen, wenn sie mit dem Google-Unternehmensprofil übereinstimmt (Service-Area-Business mit versteckter Adresse: dann weglassen). `founder: {"@id": "…/#person"}` ergänzen. Typ auf `["Organization","ProfessionalService"]` oder ProfessionalService erst nach Entscheidung zu Adresse/GBP umstellen. `priceRange` entfernen oder auf "€€" setzen.

**M6. Fehlende Schema-Chancen**
- `/about`: gar kein JSON-LD, keine Breadcrumb. -> AboutPage + Person mit `mainEntity` (Vorschlag 1 unten). Wichtigster Hebel für Autor-/E-E-A-T-Signal.
- `/blog`, `/ratgeber` (und Pagination): kein Schema. -> `CollectionPage` (oder `Blog`) mit `ItemList` und Breadcrumb.
- `/branchen`: nur BreadcrumbList. -> CollectionPage + ItemList der 16 Branchenseiten.
- `/booking`: kein Schema, indexierbar, nicht in Sitemap, Titel nur 13 Zeichen. Eher `noindex` als Markup.
- `/impressum`, `/datenschutz`, Swipe-and-Cook-Rechtstexte, `/demo/cq-compare/`: kein Markup nötig.
- `/referenzen`: CollectionPage ohne BreadcrumbList.
- Review/AggregateRating: nicht ergänzen. Es sind keine strukturierten Bewertungen vorhanden, und Selbstbewertungen einer Organization auf der eigenen Seite zeigt Google ohnehin nicht als Sterne. Nur sinnvoll, wenn echte, sichtbare Kundenbewertungen mit Quelle existieren (dann `Review` mit `itemReviewed` auf den Service, nicht AggregateRating auf Organization).

### Low

**L1. FAQPage auf 112 der 145 Seiten (160 im Crawl inkl. Query-Varianten): Info, kein SERP-Nutzen**
- Google zeigt FAQ-Rich-Results seit dem 7. Mai 2026 für keine Seite mehr. Das Markup schadet nicht, bringt aber kein Snippet. Ein KI/GEO-Effekt ist nicht belegt.
- Empfehlung: keine neuen FAQPage-Blöcke bauen; bestehende nicht aktiv pflegen. Pflegeaufwand sparen, indem FAQ-Ausgabe zentral gehalten wird (`views/index.ejs:71`, `seoLandingController.js:161`, `util/seoSchemas.js:75-105`). Echte Nutzerfragen mit Community-Antworten wären `QAPage`, trifft hier nicht zu. FAQ-Texte müssen weiter im sichtbaren Inhalt stehen. Branchenseiten haben nur Ein-Satz-Antworten, was als Inhalt dünn ist.

**L2. BreadcrumbList-Details**
- Home hat eine Breadcrumb mit nur einem Eintrag (`views/index.ejs:190-199`); Google verlangt mindestens zwei Items, daher wirkungslos. Entfernen.
- `/kontakt`: Home-Item ohne Slash `https://www.komplettwebdesign.de` (`controllers/contactController.js:732-735`), sonst überall mit Slash. Vereinheitlichen.
- Breadcrumb-Namen im Blog sind der volle Titel (teils >60 Zeichen).

**L3. Referenzen: `sameAs` zeigt auf die Kundenwebsite**
- `controllers/referenceController.js:48` (`sameAs: project.liveUrl`, z. B. `https://www.zuraltenbackstube.de`) besagt "diese Seite ist identisch mit der Kundenseite". Besser `about`-Objekt mit Kunde und `creator: {"@id": "…/#organization"}`; `datePublished` ergänzen, wenn bekannt. CreativeWork hat kein Rich Result.

**L4. Uneinheitliche Erzeugung (Wartbarkeit/Sicherheit)**
- Sechs Mechanismen: `structuredDataBlocks` (escaped), `structuredDataRaw` (Template-String, `head.ejs:184-186`), `seoExtra`-String (Ratgeber), direkte `JSON.stringify` ohne Escaping (`views/page_view.ejs:28`, `controllers/testController.js:577`, `helpers/testerSeoExtra.js:9`, `ratgeberController.js:166-213`), fest verdrahtete Legacy-Views, Altdatei `views/index copy.ejs`. Titel mit `</script>` im Ratgeber könnten das Tag beenden (Admin-Inhalt, geringes Risiko).
- Fix: alles über `structuredDataBlocks` und den Escaper in `head.ejs:192-194` leiten, Legacy-Dateien entfernen.

**L5. Website-Tester**
- `testController.js:706-710` liefert WebSite, WebPage, WebApplication, Breadcrumb, FAQ ohne Organization; `helpers/testerSeoExtra.js:112-141` enthält zusätzlich `orgSchema`. Zwei divergierende Pfade. WebSite-`url` ohne Slash, `inLanguage "de"`. `WebApplication.offers` mit price 0 korrekt, aber ohne `provider`.

**L6. Ratgeber gibt FAQPage auch bei leerem Array aus**
- `controllers/ratgeberController.js:204-211`: kein Guard wie im Blog. Aktuell haben alle Ratgeber FAQs, Risiko bei neuen Einträgen.

## Rich-Result-Eignung

| Typ | Google-Rich-Result | Status |
|---|---|---|
| BreadcrumbList | ja (Breadcrumb im Snippet) | gültig auf ~136 Knoten. Home (1 Item) wirkungslos |
| Article/BlogPosting | kein eigenes Rich Result, Datum/Autor/Bild als Hinweise | ausreichend; Autor als Person fehlt, Dateninkonsistenz M2/M3 |
| Organization | Logo/Knowledge-Signal | Logo ok (ImageObject 400x400 im Schema, Dateigröße nicht geprüft). Adresse/Profile uneinheitlich |
| FAQPage | nein (seit 7. Mai 2026 für alle Sites abgeschaltet) | Info (L1) |
| Service, Offer, ProfessionalService, ContactPage, CollectionPage, CreativeWork, WebApplication | nein | nur Entitäts-/Kontextsignal |
| LocalBusiness-Features | nur mit Adresse | derzeit nicht erfüllt |
| Sitelinks-Suchfeld | eingestellt | nicht relevant |

## JSON-LD-Vorschläge (fertig einsetzbar)

### Vorschlag 1: `/about` als AboutPage + Person (Route `routes/main.js:18` -> `mainCtrl.getAbout` -> `views/about.ejs`; Block über `structuredDataBlocks` an `partials/head` übergeben, Include-Stelle in `views/about.ejs` nicht im Detail geprüft)

Alle Werte stammen aus Home-Schema, Impressum und `/about`-Text. Falls auf `/about` ein Porträtfoto sichtbar ist, `image` (absolute URL) in die Person aufnehmen. Das habe ich auf der Seite nicht gefunden und deshalb weggelassen.

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "AboutPage",
      "@id": "https://www.komplettwebdesign.de/about#webpage",
      "url": "https://www.komplettwebdesign.de/about",
      "name": "Über uns - Wer ist Komplett Webdesign?",
      "description": "Persönlicher Webdesigner aus Berlin für kleine Unternehmen, Selbstständige und lokale Anbieter, die eine klare, schnelle und bezahlbare Website brauchen.",
      "inLanguage": "de-DE",
      "isPartOf": { "@id": "https://www.komplettwebdesign.de/#website" },
      "about": { "@id": "https://www.komplettwebdesign.de/#person" },
      "mainEntity": { "@id": "https://www.komplettwebdesign.de/#person" },
      "breadcrumb": { "@id": "https://www.komplettwebdesign.de/about#breadcrumb" }
    },
    {
      "@type": "Person",
      "@id": "https://www.komplettwebdesign.de/#person",
      "name": "Sören Blocksdorf",
      "givenName": "Sören",
      "familyName": "Blocksdorf",
      "jobTitle": "Webdesigner und Webentwickler",
      "description": "Freiberuflicher Webdesigner und Entwickler aus Berlin mit Schwerpunkt auf individuellen Websites, technischer SEO-Grundlage und klarer Angebotsstruktur.",
      "url": "https://www.komplettwebdesign.de/about",
      "mainEntityOfPage": "https://www.komplettwebdesign.de/about",
      "email": "kontakt@komplettwebdesign.de",
      "telephone": "+49 1551 245048",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Berlin",
        "addressCountry": "DE"
      },
      "worksFor": { "@id": "https://www.komplettwebdesign.de/#organization" },
      "knowsAbout": ["Webdesign", "Webentwicklung", "technische SEO-Grundlagen", "Local SEO", "Node.js", "EJS"],
      "knowsLanguage": ["de", "en"],
      "sameAs": [
        "https://www.linkedin.com/in/komplettwebdesign",
        "https://instagram.com/komplettwebdesign",
        "https://www.youtube.com/@komplettwebdesign"
      ]
    },
    {
      "@type": "Organization",
      "@id": "https://www.komplettwebdesign.de/#organization",
      "name": "Komplett Webdesign",
      "url": "https://www.komplettwebdesign.de/",
      "logo": {
        "@type": "ImageObject",
        "url": "https://www.komplettwebdesign.de/images/LogoTransparent.webp"
      },
      "founder": { "@id": "https://www.komplettwebdesign.de/#person" }
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://www.komplettwebdesign.de/about#breadcrumb",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Startseite", "item": "https://www.komplettwebdesign.de/" },
        { "@type": "ListItem", "position": 2, "name": "Über uns", "item": "https://www.komplettwebdesign.de/about" }
      ]
    }
  ]
}
```

Hinweise: `sameAs` der Person an die tatsächlich sichtbaren Footer-URLs angepasst (M5). Die Home-Person (`views/index.ejs:123-140`) sollte denselben Inhalt bekommen und `url` auf `/about` setzen, damit die @id nicht widersprüchlich beschrieben wird. Blogposts verweisen danach per `author: {"@id": "…/#person"}` und enthalten den Person-Knoten oder die minimale Fassung mit `name` und `url`.

### Vorschlag 2: Paketseite mit Offer (Beispiel `/pakete/start`, Generator `util/seoSchemas.js:50-70`)

Preis 799 EUR laut Seite ("Start-Paket Webdesign ab 799 €", `/pakete/start` sichtbarer Umfang: 1 bis 3 Inhaltsseiten oder Onepager, 1 Feedbackrunde). Ob der Preis brutto oder netto ausgewiesen wird, steht in den abgerufenen Daten nicht: `valueAddedTaxIncluded` nach der Preisangabe auf der Seite ergänzen. Preise im Code aus `res.locals.packagePricing` übernehmen, nicht hart codieren (M4).

```json
{
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": "https://www.komplettwebdesign.de/pakete/start#service",
  "name": "Start-Paket",
  "serviceType": "Webdesign und Entwicklung",
  "description": "Kompakte individuelle Website oder Onepager mit 1 bis 3 Inhaltsseiten für den professionellen Einstieg. Zusatzleistungen und laufende Kosten sind separat.",
  "url": "https://www.komplettwebdesign.de/pakete/start",
  "provider": { "@id": "https://www.komplettwebdesign.de/#organization" },
  "areaServed": [
    { "@type": "City", "name": "Berlin" },
    { "@type": "State", "name": "Brandenburg" }
  ],
  "availableChannel": {
    "@type": "ServiceChannel",
    "serviceUrl": "https://www.komplettwebdesign.de/kontakt?paket=start",
    "servicePhone": "+49 1551 245048",
    "availableLanguage": ["de-DE", "en"]
  },
  "offers": {
    "@type": "Offer",
    "@id": "https://www.komplettwebdesign.de/pakete/start#offer",
    "url": "https://www.komplettwebdesign.de/pakete/start",
    "priceCurrency": "EUR",
    "priceSpecification": {
      "@type": "PriceSpecification",
      "minPrice": 799,
      "priceCurrency": "EUR"
    }
  }
}
```

Hinweise: `servicePhone`/`availableLanguage` aus dem bestehenden Block übernommen. Für die `serviceUrl` ist `/kontakt?paket=start` kanonisiert auf `/kontakt` (laut Crawl), alternativ bei der Paket-URL bleiben. Die Organization-Node (volle Fassung aus H1) muss auf derselben Seite stehen, sonst läuft der `@id`-Verweis ins Leere. Business/Wachstum/Individuell analog mit `minPrice` 1499 / 2499 / 3500.

## Umsetzungsreihenfolge

1. H4: toten Block im Blogpost `full-service-webdesign-in-berlin` löschen (10 Minuten, Datenfehler).
2. H3: Apex-Domain in `webdesign-berlin-district(.-en).ejs` fixen (1 Zeile je Datei plus Service statt ProfessionalService).
3. H1/M1: `util/schemaCore.js` mit Organization, Person, WebSite. In Blog, Ratgeber, Pakete, Leistungen einbinden und Autor auf Person stellen.
4. H2: `/en`-Variante mit eigener URL/@id/Sprache.
5. Vorschlag 1 (`/about`) und `/blog`/`/ratgeber` CollectionPage.
6. M2/M3: Datumslogik und absolute Bild-URLs.
7. Vorschlag 2 (Offer) für alle vier Pakete.
