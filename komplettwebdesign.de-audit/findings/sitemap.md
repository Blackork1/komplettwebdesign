# Sitemap-Audit: www.komplettwebdesign.de

Stand: 23.10.2026. Live abgerufen: `https://www.komplettwebdesign.de/sitemap.xml` (HTTP 200, 26.494 Byte, 126 URLs, gzip 2.318 Byte). Abgleich mit `raw/crawl.json` (197 Seiten) und Quellcode in `/Users/blocksdorf/Documents/KomplettWebDesign` (nur gelesen).

Die Sitemap-Discovery (`sitemap_discovery.py`) fand genau eine gültige Sitemap (`/sitemap.xml`, `urlset`, in robots.txt deklariert). Die üblichen Pfade `/sitemap_index.xml`, `/sitemap-index.xml` und `/wp-sitemap.xml` liefern 404. Das ist unkritisch, weil bei 126 URLs kein Index nötig ist.

## Score: 62 / 100

| Bereich | Max | Ist | Kurzbegründung |
|---|---|---|---|
| Format, Limits, Erreichbarkeit | 20 | 20 | Valides XML, 126 URLs, 26 KB, robots.txt-Eintrag, Content-Type korrekt |
| Konsistenz mit Crawl (200/noindex/canonical) | 20 | 15 | 0 Fehler in der Sitemap, aber 17 indexierbare Seiten ohne klare Entscheidung, Dubletten und Utility-Seiten drin |
| lastmod-Qualität | 15 | 4 | 49 % = Abrufzeitpunkt, weitere 23 % identischer Massen-Zeitstempel |
| hreflang / Mehrsprachigkeit | 10 | 6 | Head-hreflang fehlerfrei und reziprok, aber nicht in der Sitemap, `en` und `en-US` gemischt |
| Sonderzeichen-URLs | 5 | 2 | `&` korrekt escaped, Umlaute und U+2011 aber roh statt prozentkodiert |
| Standortseiten-Qualitätsgate | 15 | 4 | Formal unter 30 Seiten, aber eindeutiger Textanteil nur ca. 10 % statt 60 % |
| Robustheit der Generierung | 15 | 11 | Stille Teil-Sitemap bei DB-Fehler, Session-Cookie, kein Caching |
| Summe | 100 | 62 | |

## Was gut funktioniert

- XML ist wohlgeformt, Namespace `http://www.sitemaps.org/schemas/sitemap/0.9` korrekt, UTF-8 ohne BOM, 126 `<url>`-Einträge mit je `loc`, `lastmod`, `changefreq`, `priority`.
- Limits weit unterschritten: 126 von 50.000 URLs, 26.494 Byte von 50 MB. Kein Sitemap-Index und keine News-Sitemap nötig.
- Alle 126 URLs wurden gecrawlt und liefern 200 ohne Weiterleitung. Es gibt 0 noindex-URLs, 0 abweichende Canonicals und 0 URLs ohne Canonical. Alle tragen `index,follow` und einen Self-Canonical.
- Keine Duplikate, einheitlich `https://www.`, keine Query-URLs, keine Trailing-Slash-Varianten.
- In der Sitemap steht nur, was indexierbar ist. Die fünf `/en/pakete*`-Seiten (noindex) fehlen zu Recht (Filter in `controllers/sitemapController.js:129`, Test `tests/seoPagePolicy.test.js`). Redirect-Quellen im Blog und bei Leistungen werden per SQL ausgeschlossen (`sitemapController.js:74`, `:109`).
- hreflang im HTML-Head: Alle 33 Sitemap-URLs mit hreflang sind reziprok, alle Ziele sind selbst in der Sitemap, 0 Fehler.
- Das `&` in `/blog/Scoll-Snapp-Galery-&-Zoom‑on‑View` wird im XML korrekt als `&amp;` ausgegeben (`xmlEscape`, `sitemapController.js:29-36`).
- Auslieferung: `application/xml; charset=utf-8`, gzip aktiv, `X-Content-Type-Options: nosniff`, Antwortzeit ca. 0,46 s.
- Die Sitemap-Policy ist zentral (`helpers/seoPagePolicy.js`) und per Test abgesichert.

## Wo die Sitemap erzeugt wird

| Zweck | Datei und Zeile |
|---|---|
| Route `GET /sitemap.xml` | `routes/sitemapRoutes.js:6`, eingebunden in `index.js:453` |
| Generator | `controllers/sitemapController.js:63-251` (`sitemapXml`) |
| Zeitstempel `nowIso` | `sitemapController.js:66` |
| Statische Routen aus Policy | `sitemapController.js:128-133`, Quelle `helpers/seoPagePolicy.js:1-52` |
| Bezirke DE und EN | `sitemapController.js:136-147`, Quelle `models/districtModel.js:3-8`, Filter `seoPagePolicy.js:64-71`, `:102-104` |
| CMS-Seiten (`created_at` als lastmod) | `sitemapController.js:79-86`, `:150-155` |
| Blogposts | `sitemapController.js:69-77`, `:158-163` |
| Branchen (nur 7 Whitelist-Slugs) | `sitemapController.js:89-99`, `:166-171`, Whitelist `seoPagePolicy.js:54-62`, `:89-100` |
| Ratgeber (statisch und DB) | `sitemapController.js:113-122`, `:181-193`, Datum `data/seoGuideCluster.js:1` |
| Pakete | `sitemapController.js:195-202` |
| XML-Ausgabe (lastmod, changefreq, priority) | `sitemapController.js:225-235` (Zeilen 229, 231, 232) |
| Response-Header | `sitemapController.js:244-247` |

## Findings

### F1 (High): Bezirksseiten unterschreiten das 60-%-Kriterium deutlich (Doorway-Risiko)

Zahlen zur Einordnung: Das Briefing nennt 8 Bezirksseiten. Tatsächlich gibt es 6 Bezirke (`models/districtModel.js:3-8`: Friedrichshain, Prenzlauer Berg, Kreuzberg, Charlottenburg, Lichtenberg, Mitte). In der Sitemap stehen sie je in DE und EN, also 12 URLs (`sitemapController.js:136-147`). Dazu kommen der Hub `/webdesign-berlin`, `/en/webdesign-berlin` und `/webdesign-berlin/kosten-preise-pakete`. Das Warn-Gate bei 30 und der Hard Stop bei 50 Standortseiten sind damit formal nicht erreicht. Das 60-%-Kriterium ist trotzdem klar verfehlt.

Beleg (eigene Messung, 5-Wort-Shingles, nur `<main>`, ohne Navigation, Header und Footer, Bezirksname durch Platzhalter ersetzt, Anteil der Shingles einer Seite, die auf keiner der anderen 5 Bezirksseiten vorkommt):

| Sprache | Wörter pro Seite | Eindeutiger Anteil | Paarweise Ähnlichkeit (Jaccard) |
|---|---|---|---|
| DE | 989 bis 1.005 | 9,7 bis 11,6 % (ohne Namensnormalisierung 16,8 bis 17,9 %) | 0,77 bis 0,80 |
| EN | 518 bis 532 | 7,2 bis 10,3 % (ohne Normalisierung 15,6 bis 18,7 %) | 0,81 bis 0,85 |

- Eindeutig ist nur ein kleiner Block pro Bezirk (`DISTRICT_PAGE_COPY` in `controllers/districtController.js:220-299`: Label, Lead, Kieznamen, Zielgruppen, Beispiele). Prozess, FAQ, Paketkarten und Servicelinks sind für alle gleich (`districtController.js:135-153`).
- Die EN-Bezirksseiten bestehen im Kern aus 3 kurzen Sätzen pro Bezirk (`districtController.js:51-82`) plus einem identischen Template. Die EN-FAQ nennt „EUR 1,500 and EUR 4,500“ (`districtController.js:113`), die DE-Seiten und Pakete zeigen dagegen Preise ab 799 €.
- Alle 12 URLs tragen in der Sitemap `lastmod` = Abrufzeitpunkt, `weekly` und `priority 0.8` (`sitemapController.js:136-147`). Der Inhaltsstand im Code ist `CONTENT_LAST_UPDATED_ISO = "2026-04-23"` (`districtController.js:166`). Gerade bei diesem Seitentyp wirkt die erfundene Frische verdächtig.
- Mögliche Kannibalisierung: `/blog/webdesign-lichtenberg-berlin` (Sitemap-Eintrag Nr. 74) konkurriert mit `/webdesign-berlin/lichtenberg`. Der Inhaltsvergleich wurde nicht durchgeführt.

Fix:
1. EN-Bezirksseiten bis zur echten Übersetzung wie die EN-Pakete behandeln: `noindex,follow` setzen (Muster `robots: isEn ? 'noindex,follow' : undefined` aus dem Plan `docs/superpowers/plans/2026-07-26-seo-reichweiten-sanierung.md:996`), `districtRoutesEn` entfernen (`sitemapController.js:142-147`, Zeile 208 `...districtRoutesEn`) und die `hreflang="en"`-Zeile der Bezirksseiten entfernen (`districtController.js:38-40`, dort für DE und EN unbedingt ausgegeben).
2. DE-Bezirksseiten auf mindestens 60 % eindeutigen Inhalt bringen: echte Kunden oder Projekte im Bezirk, bezirksspezifische FAQ (3 bis 5 Fragen), Kiez-Beispiele mit konkreten Branchen, Anfahrts- und Termininfos, eigene Fotos. Der Standard-Block aus Prozess, Paketen und Servicelinks sollte nur noch ein kleiner Teil bleiben.
3. Wenn der Aufwand nicht für alle 6 Bezirke vertretbar ist: nur 2 bis 3 Bezirke mit echtem Bezug (z. B. Lichtenberg) indexierbar lassen. `REVIEWED_DISTRICT_SLUGS` in `helpers/seoPagePolicy.js:64-71` entsprechend kürzen, der Test `tests/seoPagePolicy.test.js` (Zeile mit `REVIEWED_DISTRICT_SLUGS`) muss angepasst werden. Die übrigen Bezirke auf `noindex,follow` setzen oder per 301 auf `/webdesign-berlin` leiten.
4. Solange kein Bezirk 60 % erreicht, die Bezirke nicht weiter ausbauen. Das Gate steigt bei 30 Seiten auf Warnung und bei 50 auf Hard Stop.

### F2 (Medium): lastmod ist größtenteils unzuverlässig

Beleg:
- 62 von 126 Einträgen (49 %) tragen exakt den Abrufzeitpunkt `2026-10-23T05:32:42.230Z`. Sie ändern sich bei jedem Request. Es sind 46 statische Routen, 4 Paketseiten und 12 Bezirksseiten.
- 29 Blogposts (aus 43) haben denselben Zeitstempel auf die Millisekunde: `2026-07-11T18:14:17.479Z`. Das ist ein Massen-Update, keine redaktionelle Änderung. Die Seiten selbst geben denselben Wert aus (`article:modified_time` 2026-07-11T20:14:17+02:00), Sitemap und Seite sind also konsistent, aber nicht aussagekräftig. Die Ursache ist nicht verifiziert (Hypothese: Migration oder Content-Agent-Lauf, der `updated_at` überschrieben hat).
- 6 statische Ratgeber teilen die Konstante `2026-04-25T07:00:00.000Z` (`data/seoGuideCluster.js:1`). Plausibel, aber nicht pro Artikel gepflegt.
- Nur 29 Werte (23 %) sind individuell und glaubwürdig (14 Blogposts, 5 Branchen, 3 Leistungen, 6 Ratgeber aus der DB, `/handwerker`).
- Die Startseite setzt zusätzlich im JSON-LD `dateModified` bei jedem Aufruf neu (`views/index.ejs:173`, live bestätigt: „dateModified“: „2026-10-23“).
- CMS-Seiten nutzen `created_at` als „updated_at“ (`sitemapController.js:79-86`). Eine Änderung an der Seite verschiebt lastmod also nie. `/handwerker` steht deshalb auf 2025-06-01.
- Formal ist das Format gültig (W3C Datetime mit Millisekunden und `Z`), kein Wert liegt in der Zukunft.

Folge: Google nutzt lastmod nur, wenn es über Zeit nachweislich stimmt. Hier ist es für fast drei Viertel der URLs entwertet, der Recrawl-Hinweis geht verloren. Eine Strafe ist nicht zu erwarten.

Fix:
1. Kein Fallback auf `nowIso`. In `sitemapController.js:229` `<lastmod>` nur ausgeben, wenn ein echtes Datum vorliegt (`u.lastmod ? ... : ""`). Ohne Datum lieber weglassen als erfinden.
2. Statische Routen: in `helpers/seoPagePolicy.js:1-52` je Eintrag ein `lastmod: 'YYYY-MM-DD'` pflegen (oder beim Deploy aus `git log -1 --format=%cI -- <view>` erzeugen). Bezirke auf `CONTENT_LAST_UPDATED_ISO` (`districtController.js:166`) stützen (Konstante in `data/` auslagern und in beide Dateien importieren). Pakete: Datum aus dem Preis- oder Paketmodell, falls vorhanden, sonst statisch.
3. Blog: Ursache des Zeitstempels vom 11.07.2026 finden. Künftig darf eine Migration `updated_at` nicht überschreiben. Echte Daten aus Backup oder Revisionshistorie (`services/contentAgent/contentRevisionService.js` existiert) zurückholen, sonst bei den 29 Posts `lastmod` weglassen.
4. CMS-Seiten: Spalte `updated_at` in `pages` ergänzen (der Test `tests/seoPagePolicy.test.js` prüft derzeit bewusst, dass sie nicht abgefragt wird, und müsste angepasst werden).
5. `views/index.ejs:173`: festes, gepflegtes Datum statt `new Date()`.
6. Das Datumsformat `YYYY-MM-DD` reicht und vermeidet falsche Genauigkeit.

### F3 (Medium): 17 indexierbare Seiten ohne Sitemap-Eintrag, Indexierungssignale uneinheitlich

Korrektur zur Vorgabe: Es sind 17, nicht 18. `/leistungen/` ist ein Trailing-Slash-Duplikat von `/leistungen` (Canonical zeigt auf `/leistungen`, und `/leistungen` steht in der Sitemap, Nr. 31). Es braucht keinen Eintrag, sondern einen 301 (siehe F8).

| URL | Befund | Empfehlung |
|---|---|---|
| 11 × `/branchen/webdesign-{arzt, autowerkstatt, beautysalon, fitnesscoach, fotograf, friseur, hebamme, physiotherapie, steuerberater, tattoo, wellness}` | 200, `index,follow`, Self-Canonical, vom Hub `/branchen` verlinkt (16 Links), nur durch die Whitelist `PRIORITY_INDUSTRY_SLUGS` (`seoPagePolicy.js:54-62`, Filter `:89-100`) ausgeschlossen. Eindeutiger Textanteil 43 bis 49 % (Messung unten). | Entscheiden statt offen lassen: Seiten anreichern (Ziel mindestens 60 %: echte Beispiele, branchenspezifische FAQ, Screenshots) und dann in die Whitelist aufnehmen, oder `noindex,follow` setzen. Nicht unverändert aufnehmen. |
| `/blog?page=2` bis `?page=5` | 200, Self-Canonical, Pagination | Nicht aufnehmen. Die Einzelartikel stehen bereits in der Sitemap. |
| `/booking` | 200, indexierbar, Titel nur „Termin buchen“ (13 Zeichen), kein hreflang | Preferred: `noindex,follow`, weil `/kontakt` die Suchabsicht bedient. Alternativ Titel und Description ausbauen und aufnehmen. |
| `/demo/cq-compare/` | 200, kein Canonical, kein Meta-Robots, keine Description, 7 KB, technische Demo (Container Queries) | Nicht aufnehmen. `noindex` per Meta-Tag in der statischen Datei unter `public/demo/cq-compare/` oder per `X-Robots-Tag`, dazu Canonical und Description ergänzen. |

Messung Branchenseiten (5-Wort-Shingles, ganzer Body ohne Navigation, Header und Footer; Methode weicht leicht von der Bezirksmessung ab, `<main>` war hier nicht auswertbar): bereits in der Sitemap Immobilienmakler 74,7 %, Blumenladen 59,2 %, Café 53,3 %, Restaurant 48,0 %, Reinigung 45,7 %. Nicht in der Sitemap Wellness 48,6 %, Fitnesscoach 47,7 %, Arzt 47,4 %, Friseur 47,0 %, Tattoo 46,4 %, Steuerberater 46,4 %, Hebamme 46,2 %, Autowerkstatt 46,8 %, Fotograf 44,0 %, Physiotherapie 43,3 %, Beautysalon 42,9 %. Die Whitelist bildet die Qualität also nicht ab: Restaurant und Reinigung sind aufgenommen, liegen aber auf demselben Niveau wie die ausgeschlossenen. Bei 16 Branchenseiten ist das Gate bei 30 nicht erreicht.

### F4 (Medium): Swipe-and-Cook-Rechtstexte und Hinweisseite in der Sitemap

Beleg: Die Einträge Nr. 22 bis 26 (`/swipeandcook-datenschutz`, `-nutzungsbedingungen`, `-support`, `-konto-loeschen`, `/hinweise-rechtstexte-seo-datenschutz`) stehen mit `yearly` und `priority 0.2` in der Sitemap (`helpers/seoPagePolicy.js:27-31`). Alle sind `index,follow` und im Footer verlinkt. Sie gehören thematisch nicht zu einem Berliner Webdesign-Angebot, haben keinen Suchwert und verwässern das Themenprofil. Die App wird zu Cookavoli umgezogen (untracked: `routes/cookavoliStaticPages.js`, `cookavoli/`, `docs/superpowers/plans/2026-09-27-cookavoli-product-website-implementation.md`). Die neue Seite liefert eine eigene `sitemap.xml` (`routes/cookavoliStaticPages.js:112`).

Fix:
1. Zeilen `seoPagePolicy.js:27-31` aus `INDEXABLE_STATIC_ROUTES` entfernen. Die Seiten bleiben erreichbar (Store-Pflicht-URLs für Datenschutz, Support und Kontolöschung müssen weiter mit 200 antworten).
2. Tests anpassen: `tests/swipeAndCookPrivacyPage.test.js:75` und `tests/swipeAndCookPublicPagesS2.test.js:322` prüfen die Aufnahme in die „statische Sitemap“, `tests/seoPagePolicy.test.js` führt `/hinweise-rechtstexte-seo-datenschutz` in der Pflichtliste.
3. Zusätzlich `noindex,follow` für die vier Swipe-and-Cook-Seiten erwägen. Das beeinträchtigt keinen Store-Review.
4. Nach dem Cookavoli-Livegang die Pfade per 301 auf die neuen Cookavoli-Seiten leiten und aus dieser Domain entfernen.
5. `/impressum` und `/datenschutz` dürfen bleiben (kein Schaden, im Test als Pflicht geführt). Mit `priority 0.2` und `yearly` haben sie aber keinen Nutzen.

### F5 (Medium): Sonderzeichen-URLs nicht prozentkodiert, Slugs problematisch

Beleg: Im XML stehen zwei Einträge als rohe UTF-8-Zeichen in `<loc>`:
- `https://www.komplettwebdesign.de/blog/website-checkliste-für-selbstandige` (Umlaut `ü`)
- `https://www.komplettwebdesign.de/blog/Scoll-Snapp-Galery-&-Zoom‑on‑View` (`&` und U+2011, geschützte Bindestriche)

Das Sitemap-Protokoll verlangt URL-Escaping nach RFC 3986. Die Seiten selbst nennen im Canonical ebenfalls die rohe Form (Crawl: `canonical` = rohe URL), intern verlinkt wird aber die prozentkodierte Form (`...f%C3%BCr-selbstandige`, `...Zoom%E2%80%91on%E2%80%91View`). Im Crawl entstehen so zwei „Seiten“ pro Artikel (Dubletten-Titel im `onpage-summary.txt`, plus falsch positive Canonical-Abweichungen). Google normalisiert die Kodierung meist, die Signale sind aber unnötig uneinheitlich. Der U+2011 ist beim Kopieren, in E-Mails und in Logs fehleranfällig. Dazu sind die Slugs fehlerhaft („Scoll“, „Snapp“, „Galery“, „selbstandige“) und enthalten Großbuchstaben (5 Slugs: `Landingpages-Webshop-Webdesign-Berlin`, `Scoll-Snapp-Galery-&-Zoom‑on‑View`, `GA4-Tracking-Framework`, `Google-AI-Mode-und-AI-Overviews`, `Lokale-SEO-Hacks-fuer-Berlin`). Kleinschreibung-Varianten liefern 404, es entsteht also keine Dublette, aber Links mit Kleinbuchstaben laufen ins Leere.

Fix:
1. Kurzfristig in `sitemapController.js:158-163` (und analog `:150-155`, `:167`, `:182`) den Pfad segmentweise kodieren: `slug.split('/').map(encodeURIComponent).join('/')`. Dieselbe Kodierung im Canonical-Tag des Blogs verwenden (Erzeugung vermutlich in `services/blogPostPresentationService.js`, nicht geprüft). `xmlEscape` auf `&` bleibt unnötig, weil `&` dann als `%26` erscheint.
2. Besser: Slugs bereinigen, z. B. `/blog/scroll-snap-galerie-zoom-on-view` und `/blog/website-checkliste-fuer-selbststaendige`, und die alten URLs per 301 umleiten. Redirect-Quellen über `data/blogRedirects.js` (`REDIRECTED_BLOG_SLUGS`) pflegen, die Sitemap schließt sie bereits aus (`sitemapController.js:74`). Für die 5 Großbuchstaben-Slugs genauso, mit 301 von der Kleinschreibung der Altform.

### F6 (Medium): Abgeschaltete Ratgeber-Seiten und Themen-Dubletten sind live und in der Sitemap

Beleg: `routes/staticPages.js:399` und `:420` haben `/ratgeber/kosten-einfache-website` und `/ratgeber/website-kosten-zeitplan` auskommentiert, und `tests/seoPagePolicy.test.js` (Test „deaktivierte statische Routen“) erwartet, dass sie nicht in der Sitemap stehen. Live antworten beide trotzdem mit 200 und `index,follow` und stehen in der Sitemap (Nr. 125 und 126, lastmod 2025-10-30). Wahrscheinlich liefert sie die DB-Route `/ratgeber/:slug` (`routes/ratgeberRoutes.js:7`, Sitemap `sitemapController.js:113-122`, `:181-186`). Das ist aus dem Code abgeleitet, die DB-Einträge wurden nicht geprüft. Die Titel sind veraltet („Website-Kosten 2025“). Weitere Themendubletten: `/ratgeber/professionellen-website-vs-baukasten` (Nr. 124) gegen `/ratgeber/baukasten-vs-professionelle-website` (Nr. 118), und mehrere Kostenartikel (`/ratgeber/website-kosten-berlin`, `/blog/website-kosten-2025-einfach-erklaert`, `/webdesign-berlin/kosten-preise-pakete`).

Fix: Inhalte prüfen und die Dubletten per 301 auf den jeweils stärkeren Artikel leiten. Vorschlag: `/ratgeber/kosten-einfache-website` nach `/ratgeber/website-kosten-berlin`, `/ratgeber/website-kosten-zeitplan` nach `/ratgeber/website-erstellen-berlin-ablauf-dauer-kosten`, `/ratgeber/professionellen-website-vs-baukasten` nach `/ratgeber/baukasten-vs-professionelle-website`. Danach den DB-Eintrag unveröffentlichen, damit `guideRoutes` (`sitemapController.js:181`) sie nicht mehr ausgibt.

### F7 (Medium): Bei DB-Fehlern liefert die Sitemap still eine unvollständige Liste mit HTTP 200

Beleg: `querySafe` fängt jeden Fehler ab und gibt `[]` zurück (`sitemapController.js:44-52`), `getPackageSitemapRows` ebenso (`:54-61`). Fällt die Datenbank kurz aus, enthält die Antwort nur die statischen Routen und Bezirke (ca. 60 statt 126 URLs), ohne alle Blogposts, Ratgeber, Branchen, Leistungen und CMS-Seiten, und wird mit 200 und `no-cache` ausgeliefert. Google könnte die Abwesenheit als Entfernung werten.

Fix: Bei einem Fehler in einer der Kernabfragen `503` mit `Retry-After` zurückgeben oder die letzte gute Sitemap aus einem In-Memory-Cache ausliefern (z. B. 1 Stunde TTL). Das spart zusätzlich bei jedem Crawler-Abruf die fünf DB-Abfragen plus Paketabfrage.

### F8 (Low): `/leistungen/` ist ein 200-Duplikat von `/leistungen`

Beleg: `GET /leistungen/` antwortet 200 ohne Weiterleitung, mit Canonical auf `/leistungen` und identischem Titel (Dubletten-Titel im `onpage-summary.txt`). Fix: 301 von `/leistungen/` auf `/leistungen` (Express `strict routing` oder eine Rewrite-Regel vor `routes/leistungenRoutes.js`), nicht in die Sitemap aufnehmen.

### F9 (Low): changefreq und priority ohne Nutzen und teils falsch

Beleg: Alle 126 Einträge haben beide Tags (Ausgabe `sitemapController.js:231-232`). Google ignoriert beide. Die Werte sind zudem wenig sinnvoll: 86 URLs stehen auf `weekly` (alle Blogposts und Bezirksseiten, obwohl unverändert seit Juli), 92 URLs auf `priority 0.8`. Die Policy nennt feinere Werte (0.95, 0.85, 0.82, 0.78, 0.75 in `seoPagePolicy.js`), `toFixed(1)` rundet sie in `sitemapController.js:232` aber auf eine Stelle und verwischt sie (`0.85` wird `0.8`, `0.95` wird `0.9`).
Fix: Die Zeilen 231 und 232 entfernen und `changefreq` und `priority` aus `INDEXABLE_STATIC_ROUTES` sowie aus den Routen-Objekten (`:136-202`) löschen. Das ist nur Aufräumen, keine Dringlichkeit.

### F10 (Low): hreflang nicht in der Sitemap, Sprachcodes uneinheitlich

Beleg: Die Sitemap enthält keine `xhtml:link`-Einträge und deklariert den Namespace `xmlns:xhtml` nicht. hreflang kommt nur aus dem HTML-Head und nur bei 33 von 126 URLs (18 × `de-DE`, `en`, `x-default`; 10 × `de-DE`, `en-US`, `x-default` beim Website-Tester; 5 × nur `de-DE` und `x-default` bei `/pakete` und den vier Paketseiten, deren EN-Gegenstücke noindex sind). Die übrigen 93 Seiten sind DE-only, das ist in Ordnung. Sprachcode `en` und `en-US` sind beide gültig, aber gemischt.
Fix: Es reicht ein Mechanismus. Wenn der HTML-Head bleibt, ist nichts nötig außer einheitlichem Code (Vorschlag `en` überall oder `en-US` überall; Quelle der Website-Tester-Variante nicht lokalisiert). Ein xhtml-Block in der Sitemap ist optional und lohnt erst, wenn mehr EN-Seiten dazukommen.

### F11 (Low): Session-Cookie auf der Sitemap, keine Cache-Validierung

Beleg: Die Sitemap-Antwort setzt `Set-Cookie: connect.sid=...` (Session-Middleware `index.js:317` läuft vor der Route `index.js:453`). Der ETag wechselt bei jedem Abruf, weil `lastmod` bei jedem Request neu entsteht (F2), bedingte Requests liefern deshalb nie 304.
Fix: `sitemapRoutes` und `robots.txt` vor `app.use(session(...))` (`index.js:317`) einhängen. Mit festen lastmod-Werten und einem Cache (F7) stabilisiert sich auch der ETag.

### F12 (Low, Info): Keine Bild-Sitemap

Beleg: Keine `image:image`-Erweiterung. Die 126 Seiten verwenden 367 Inhaltsbilder (ohne Logos und Icons), 239 davon bei Cloudinary (`res.cloudinary.com`), 128 auf der eigenen Domain. Bilder werden über den HTML-Crawl gefunden, eine Bild-Sitemap ist nicht erforderlich.
Empfehlung: Kein Handlungsdruck. Falls Bildsuche relevant wird, zuerst für Referenzen, Bezirks-Heroes und Branchenseiten ergänzen (`image:loc` darf auf eine fremde Domain wie Cloudinary zeigen).

### F13 (Low): `/handwerker`

Beleg: CMS-Seite (`sitemapController.js:150-155`), im Crawl ohne `lang`, ohne hreflang, `lastmod` 2025-06-01 (= `created_at`). Inhaltlich überlappt sie mit `/ratgeber/website-fuer-handwerker-berlin`. Fix: `<html lang="de">` im CMS-Template ergänzen und lastmod über das neue Feld `updated_at` pflegen (F2). Beide Handwerker-Seiten auf getrennte Suchabsichten prüfen.

### Hinweis: robots.txt

Es gibt zwei Dateien: `Robots.txt` im Projektstamm (Sitemap-Zeile 53) und `public/robots.txt` (Zeile 83). Welche ausgeliefert wird und ob die Stamm-Datei veraltet ist, wurde nicht geprüft. Live deklariert robots.txt die Sitemap korrekt.

## Empfehlung: Was rein, was raus

| Aktion | URLs | Stelle |
|---|---|---|
| Entfernen | `/swipeandcook-datenschutz`, `/swipeandcook-nutzungsbedingungen`, `/swipeandcook-support`, `/swipeandcook-konto-loeschen`, `/hinweise-rechtstexte-seo-datenschutz` | `helpers/seoPagePolicy.js:27-31` |
| Entfernen (bis Übersetzung und Unique Content) | 6 × `/en/webdesign-berlin/{bezirk}` | `sitemapController.js:142-147`, `:208` |
| Entfernen nach Redirect | `/ratgeber/kosten-einfache-website`, `/ratgeber/website-kosten-zeitplan`, `/ratgeber/professionellen-website-vs-baukasten` | DB-Eintrag oder 301 |
| Nicht aufnehmen | `/demo/cq-compare/` (noindex), `/leistungen/` (301), `/blog?page=2` bis `5`, `/booking` (noindex) | siehe F3, F8 |
| Aufnehmen, sobald auf mindestens 60 % eindeutig | 11 × `/branchen/webdesign-*` | Whitelist `seoPagePolicy.js:54-62` |
| Behalten | Hub und Leistungen, Referenzen, Ratgeber, Blog-Einzelartikel, DE-Bezirksseiten (nach F1-Maßnahmen), `/impressum`, `/datenschutz` | |

Erwartete Größe danach: ca. 126 − 5 − 6 − 3 = 112 URLs.

## Prioritäten

1. F1: Bezirksseiten. EN auf noindex und aus der Sitemap, DE auf 60 % bringen oder auf 2 bis 3 Bezirke reduzieren.
2. F2: lastmod ehrlich machen (`sitemapController.js:66`, `:138`, `:146`, `:199`, `:229`, `views/index.ejs:173`).
3. F4 und F3: Swipe-and-Cook und Hinweisseite aus der Sitemap, Entscheidung für die 11 Branchenseiten, Demo und Booking auf noindex.
4. F5, F6, F7: Slugs und Kodierung, Ratgeber-Dubletten per 301, 503 oder Cache bei DB-Fehler.
5. F8 bis F13 beim nächsten Aufräumen.

## Messmethodik und Grenzen

- Abruf live am 23.10.2026 05:32 UTC. Der Crawl (`raw/crawl.json`) stammt von heute morgen. `in_sitemap` und die Sitemap-Liste im Crawl stimmen mit dem Live-XML überein (126 URLs).
- Unique-Content-Messung: Skripte `/private/tmp/claude-501/-Users-blocksdorf-Documents-KomplettWebDesign/c4814b0b-d0c8-4735-bf66-424accb1f5b0/scratchpad/uniq.py` (Bezirke) und eine Inline-Variante für die Branchen. Der Wert „eindeutig“ ist streng (Anteil der 5-Wort-Folgen, die auf keiner Vergleichsseite vorkommen) und eher unter dem Wert, den ein Mensch als „eigener Text“ einstuft. Die 60-%-Schwelle stammt aus dem Qualitätsgate des Audit-Agents, nicht von Google. Die Richtung ist trotzdem eindeutig: ca. 10 % eindeutig bei den Bezirksseiten.
- Nicht geprüft: Inhalte der DB (`posts`, `ratgeber`, `pages`, `industries`), Google Search Console (Indexierungsstatus, Sitemap-Bericht), Ursache des Massen-Zeitstempels vom 11.07.2026.

## Strukturierte Findings (für audit-data.json, Kategorie Sitemap)

```json
{
  "category": "Sitemap",
  "score": 62,
  "findings": [
    {"id": "F1", "severity": "High", "title": "Bezirksseiten unter 60 % eindeutigem Inhalt (DE ca. 10 %, EN ca. 9 %)", "files": ["controllers/districtController.js:51-82", "controllers/districtController.js:220-299", "controllers/sitemapController.js:136-147"]},
    {"id": "F2", "severity": "Medium", "title": "lastmod: 62 von 126 = Abrufzeitpunkt, 29 Blogposts identischer Massen-Zeitstempel", "files": ["controllers/sitemapController.js:66", "controllers/sitemapController.js:229", "views/index.ejs:173"]},
    {"id": "F3", "severity": "Medium", "title": "17 indexierbare Seiten nicht in der Sitemap, ohne klare Entscheidung", "files": ["helpers/seoPagePolicy.js:54-62"]},
    {"id": "F4", "severity": "Medium", "title": "Swipe-and-Cook-Rechtstexte und Hinweisseite in der Sitemap", "files": ["helpers/seoPagePolicy.js:27-31"]},
    {"id": "F5", "severity": "Medium", "title": "Sonderzeichen-URLs roh statt prozentkodiert, Slugs fehlerhaft", "files": ["controllers/sitemapController.js:158-163"]},
    {"id": "F6", "severity": "Medium", "title": "Abgeschaltete und doppelte Ratgeber-Seiten live und in der Sitemap", "files": ["routes/staticPages.js:399", "routes/staticPages.js:420", "controllers/sitemapController.js:181-186"]},
    {"id": "F7", "severity": "Medium", "title": "DB-Fehler ergeben stille Teil-Sitemap mit HTTP 200", "files": ["controllers/sitemapController.js:44-52"]},
    {"id": "F8", "severity": "Low", "title": "/leistungen/ als 200-Duplikat ohne 301"},
    {"id": "F9", "severity": "Low", "title": "changefreq und priority wirkungslos und unplausibel", "files": ["controllers/sitemapController.js:231-232"]},
    {"id": "F10", "severity": "Low", "title": "hreflang nicht in der Sitemap, en und en-US gemischt"},
    {"id": "F11", "severity": "Low", "title": "Session-Cookie auf sitemap.xml, wechselnder ETag", "files": ["index.js:317", "index.js:453"]},
    {"id": "F12", "severity": "Low", "title": "Keine Bild-Sitemap (nicht erforderlich)"},
    {"id": "F13", "severity": "Low", "title": "/handwerker ohne lang, lastmod = created_at"}
  ]
}
```
