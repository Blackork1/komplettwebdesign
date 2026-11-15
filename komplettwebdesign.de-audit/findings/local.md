# Local-SEO-Audit komplettwebdesign.de (Stand 2026-10-23)

Geprüft: Live-Seiten (Startseite, Kontakt, Impressum, Datenschutz, About, Webdesign Berlin, Local SEO, Referenzen, Branchen, 6 Bezirksseiten, EN-Seiten, Sitemap, robots.txt) sowie Quellcode in `/Users/blocksdorf/Documents/KomplettWebDesign` (nur gelesen). Externe Quellen: Gelbe Seiten, ProvenExpert, agenturen.app (öffentlich abrufbar), OpenStreetMap-Geocoding. Keine Bewertungszahlen oder Rankings wurden erfunden; was nicht prüfbar war, ist als „nicht geprüft“ markiert.

## Local SEO Score: 45 / 100

| Dimension | Gewicht | Punkte | Kurzbegründung |
|---|---|---|---|
| GBP-Signale | 25 | 11 | Profil existiert, Maps- und Review-Link funktionieren; aber Maps-Pin liegt ca. 32 km von der Impressums-Adresse entfernt, kein Maps-Embed, kein GBP-Link im Footer/Kontakt, GBP nicht in sameAs. Kategorie/Fotos/Posts nicht prüfbar |
| Bewertungen und Reputation | 20 | 10 | Echte Google-Bewertungen sichtbar, Review-Link ok; sehr geringes Volumen (4–5), widersprüchliche Zählung, ProvenExpert „nicht bewertet“ |
| Lokale On-Page-SEO | 20 | 11 | Berlin in Title/H1/Meta, eigene Local-SEO-Seite, Branchenseiten; aber Adresse/Telefon fehlen auf Kontakt/Footer/Startseite, 6 Bezirksseiten mit Doorway-Risiko |
| NAP-Konsistenz und Citations | 15 | 6 | Adresse konsistent (Impressum, Datenschutz, Gelbe Seiten), aber Telefonnummer weicht zwischen Website und 3 Verzeichnissen ab; Namensvarianten; Verzeichnisabdeckung dünn |
| Lokales Schema | 10 | 3 | Kein LocalBusiness/ProfessionalService mit Adresse auf Startseite; Bezirks-Schema mit falscher Host-Variante und ohne Adresse |
| Lokale Links und Autorität | 10 | 4 | 6 Social-Profile in sameAs, einzelne Verzeichnisprofile; Backlinks nicht prüfbar |

Hinweis: Proximity (laut Search-Atlas-Studie ca. 55 % der Ranking-Varianz) ist nicht beeinflussbar; ein Service-Area-Business aus Lichtenberg konkurriert in „Webdesign Berlin“ stark mit Wettbewerbern in zentraleren Lagen.

## Geschäftstyp und Branche

- Typ: Service-Area-Business mit öffentlicher Impressums-Adresse (Möllendorffstr 26, 10367 Berlin-Lichtenberg; OSM-Geocoding: 52.51987 N, 13.48045 E). Keine Maps-Einbettung, keine Öffnungszeiten, areaServed Berlin/Brandenburg/Deutschland. Einstufung: SAB bzw. „hybrid-light“ (Adresse nur rechtlich im Impressum).
- Branche: Dienstleister Webdesign. Passender Schema-Typ: `ProfessionalService` (Subtyp von LocalBusiness). Wichtig: Google-Business-Kategorie ist der stärkste Einzelfaktor, wurde aber nicht geprüft (kein GBP-Zugang).

## Was gut funktioniert

- Berlin-Bezug in Title, H1, Meta und URL-Struktur (`/webdesign-berlin`, `/leistungen/local-seo`, Branchenseiten). Dedizierte Leistungs- und Local-SEO-Seite vorhanden (laut Whitespark der stärkste lokale Organic-Faktor).
- GBP verlinkt und intakt: Der Link `https://g.page/r/CfAG7dHPXPZxEAE/review` leitet (302, 302, 200) auf Google Maps `place//data=!4m3!3m2!1s0x40da1c9a5b81fab7:0x71f65ccfd1ed06f0 ... merchant-review-solicitation`. Die CID ist identisch mit dem Profil-Link der Startseite und mit `googleProfileUrl` in `helpers/siteFacts.js:31` (hex 0x71f65ccfd1ed06f0 = dezimal 8211853018206635760). Der Bewertungs-Link ist also gültig.
- Bewertungen sind im Seiteninhalt sichtbar und als „Google“ gekennzeichnet; bewusst KEIN aggregateRating-Markup für die eigene Organisation (`controllers/mainController.js:368-370`). Das ist richtig, weil selbst-referenzierende Reviews bei Organization/LocalBusiness kein Rich Result auslösen und Spam-Risiko bergen.
- Ehrliche Kommunikation auf `/leistungen/local-seo`: keine Ranking-Garantie, keine gekauften Bewertungen, „keine massenhaft dünnen Standortseiten“ (siehe aber F3).
- Adresse und E-Mail sind über Impressum, Datenschutz, Gelbe Seiten und `llms.txt` konsistent (Möllendorffstr 26, 10367 Berlin, kontakt@komplettwebdesign.de).
- Canonical-Host sauber: `komplettwebdesign.de` und `http://www` leiten per 301 auf `https://www.komplettwebdesign.de/`. hreflang DE/EN/x-default vorhanden. robots.txt erlaubt Googlebot.
- Citations vorhanden: Gelbe Seiten (Eintrag „Komplett Webdesign Web-Design“), ProvenExpert-Profil, agenturen.app, daneben Facebook, LinkedIn, YouTube, Behance (laut Brand-Suche über DuckDuckGo).

## Findings

### F1 – CRITICAL – Telefonnummer der Website weicht von den Verzeichniseinträgen ab
- Beleg: Website (Impressum `views/static/impressum.ejs:19`, `helpers/siteFacts.js:22-23`, Schema in `views/index.ejs:104,115,130`, `util/seoSchemas.js:16,21,62`, `public/llms.txt:103`, Bezirksseiten `tel:+491551245048`) nennt `+49 1551 245048` = 01551 245048 (11 Ziffern). Gelbe Seiten (`0155 11 24 50 48`), ProvenExpert (`+49 15511245048`, `tel:+4915511245048`) und agenturen.app (`0155 11 24 50 48`) nennen übereinstimmend `015511245048` (12 Ziffern, eine zusätzliche „1“). Welche Variante stimmt, ist von außen nicht feststellbar.
- Wirkung: Eine falsche Nummer in Impressum, Schema und `tel:`-Links kostet direkt Anfragen und ist ein harter NAP-Konflikt. Die Nummer steht außerdem an über 15 Stellen hartcodiert im Code.
- Fix: Richtige Nummer verifizieren (Anruf-Test). Dann nur in `helpers/siteFacts.js` pflegen und überall importieren (`util/seoSchemas.js`, `views/index.ejs`, `controllers/districtController.js:95-96,139-140`, `views/faq.ejs:14`, `views/return_policy.ejs:152`, `views/bereiche/*`, `public/llms.txt`). Abweichende Verzeichnisse (Gelbe Seiten, ProvenExpert, agenturen.app, GBP) angleichen.

### F2 – HIGH – Google-Maps-Pin liegt ca. 32 km von der Impressums-Adresse entfernt
- Beleg: Der Maps-Link der Startseite (`controllers/mainController.js:15`) enthält `!3d52.45906!4d13.0157992`. Reverse-Geocoding (OSM): Fahrland, Potsdam, Brandenburg (14476). Impressums-Adresse Möllendorffstr 26, 10367 Berlin geocodet: 52.51987 N / 13.48045 E, also ca. 32 km Luftlinie (rund 6,8 km Nord-Süd und 31,5 km Ost-West). Der Ausschnitt `@52.451726,11.6969877,8z` ist nur der Kartenviewport, nicht relevant.
- Hinweis: Bei Service-Area-Business-Profilen mit verborgener Adresse kann Google einen anderen Referenzpunkt zeigen; das erklärt eine Abweichung aber nicht zwingend. Es kann auch ein alter oder falscher Adresseintrag sein. Ob das Profil im GBP-Dashboard korrekt ist, wurde nicht geprüft (Google Maps leitet ohne Consent auf `consent.google.com`).
- Fix: Im GBP-Dashboard prüfen: Adresse, ob „Adresse ausblenden“ aktiv ist, Servicegebiete (Berlin, Brandenburg-Orte), Primärkategorie (z. B. „Webdesigner“). Sollte die Adresse falsch sein, korrigieren. Danach NAP überall identisch halten. Den Link in `mainController.js:15` auf `https://www.google.com/maps?cid=8211853018206635760` vereinheitlichen (zwei unterschiedliche Konstanten in `mainController.js:15` und `siteFacts.js:31`).

### F3 – HIGH – Sechs Bezirksseiten mit hohem Doorway-Risiko (plus EN-Spiegel)
- Beleg: `/webdesign-berlin/{friedrichshain,prenzlauer-berg,kreuzberg,charlottenburg,lichtenberg,mitte}` und `/en/webdesign-berlin/<slug>` (alle in der Sitemap, alle `index,follow`). Paarweise 72–75 % identische Textzeilen. Name-Swap-Test (Bezirksname durch Platzhalter ersetzt, Zeilen mit anderen Bezirksseiten verglichen): nur 6–9 % der Wörter sind seitenspezifisch (54–78 von ca. 900 Wörtern, nämlich Title, H1, ein Einleitungsabsatz, eine Kurzbeschreibung, drei Kiez-Stichworte). Alle Seiten teilen Pakete-Block, Prozess, Branchenliste („Mit passenden Leistungsseiten, Vertrauenselementen und klaren Kontaktwegen“ wortgleich für jede Zielgruppe), Referenzen, Bewertungsblock. Generator: `controllers/districtController.js` (`buildGermanDistrictPage`) und `views/bereiche/webdesign-berlin-*.ejs`.
- Widerspruch: `/leistungen/local-seo` verspricht „Was ich vermeide: duplizierte Inhalte mit ausgetauschtem Ortsnamen“ und „massenhaft dünne Standortseiten“. `/webdesign-berlin` sagt, Bezirksseiten würden „nur eingesetzt, wenn sie inhaltlich wirklich sinnvoll sind“.
- Die einzige echte lokale Verbindung (Sitz in Lichtenberg, PLZ 10367) wird auf der Lichtenberg-Seite nicht genannt; sie hat daher keinen Vorsprung vor den fünf anderen.
- Fix: Variante A (empfohlen): Lichtenberg (Standort) als echte Standortseite ausbauen (Sitz, reale Kunden/Projekte in Lichtenberg und Nachbarbezirken, Anfahrt/Termine, Bezirks-FAQ, ca. 600+ eigene Wörter), die übrigen fünf per 301 auf `/webdesign-berlin` bzw. `noindex` und aus der Sitemap nehmen. Variante B: jede Seite um mindestens 400–500 Wörter belegbaren Bezirksbezug ergänzen (echte Projekte, lokale Beispiele, Straßen/Kieze mit Bezug zu Kunden). Mindestziel für die Swap-Test-Quote: über 40 % einzigartig.

### F4 – HIGH – Kein LocalBusiness/ProfessionalService-Schema mit Adresse auf Startseite und Kontakt
- Beleg: Startseite hat FAQPage, Organization, Person, WebSite, Service, WebPage (`views/index.ejs:70-205`). Organization ohne `address`, `geo`, `hasMap`, `openingHoursSpecification`; GBP-URL fehlt in `sameAs`. `views/index.ejs:1060` enthält nur den Kommentar „ProfessionalService (online-first, ohne Adresse)“. Kontaktseite: ContactPage, WebSite, BreadcrumbList, FAQPage.
- Wirkung: Name, Adresse und Telefon sind nirgends maschinenlesbar; Google kann Website und GBP schwerer verknüpfen.
- Fix: Organization-Typ erweitern auf `["Organization","ProfessionalService"]` (gleiche `@id` `#organization`), `address` (PostalAddress Möllendorffstr 26, 10367 Berlin, DE; Quelle `SITE_FACTS.address` in `helpers/siteFacts.js:24-30` existiert bereits, wird aber nicht genutzt), `telephone` aus F1, `areaServed` (Berlin zuerst, Brandenburg-Orte; Deutschland entfernen, da es den lokalen Fokus verwässert), `sameAs` + GBP-URL, `hasMap`. `geo` mit 5 Nachkommastellen nur eintragen, wenn die Adresse öffentlich bleibt. `openingHoursSpecification` nur, wenn echte Zeiten gepflegt werden.

### F5 – MEDIUM – Adresse und Telefon fehlen auf Startseite, Kontakt und Footer; Click-to-call nur auf Bezirksseiten
- Beleg: `/kontakt` enthält weder „Möllendorff“ noch Telefonnummer (nur mailto). Footer `<footer class="site-footer">` zeigt nur Navigation, Newsletter, Social-Links. `tel:`-Links gibt es nur auf den Bezirksseiten und in FAQ/Rückgabe, nicht auf Startseite, Kontakt, Impressum.
- Fix: NAP-Block (Name, Adresse bzw. „Berlin-Lichtenberg, Einsatzgebiet Berlin/Brandenburg“, `tel:`-Link, E-Mail) in Footer und `/kontakt` aufnehmen; Schreibweise wie im GBP („Möllendorffstr. 26“, aktuell „Möllendorffstr 26“ im Impressum ohne Punkt).

### F6 – MEDIUM – Bewertungsanzahl widersprüchlich (5 vs. 4) und hart codiert
- Beleg: Startseite: „5 verifizierte Bewertungen“ (`Review.fetchAggregate` aus eigener Datenbank, `models/Review.js`; Seed-Skript `scripts/seed_google_reviews.js`). Bezirksseiten und EN-Seiten: „5,0/5 · 4 Google-Rezensionen“ (`helpers/siteFacts.js:33-36`, `controllers/districtController.js:330`, `views/bereiche/webdesign-berlin-district.ejs:137`). Die tatsächliche Anzahl bei Google wurde nicht geprüft.
- Wirkung: Vertrauensverlust bei Abweichung zur Google-Anzeige; Begriff „verifiziert“ ist nur haltbar, wenn belegbar (Wettbewerbsrecht).
- Fix: Eine Quelle für Rating und Anzahl, mit dem GBP abgleichen; „verifizierte“ durch „Google-Bewertungen“ ersetzen, falls kein Verifikationsnachweis vorliegt.

### F7 – MEDIUM – Bezirks-ProfessionalService-Schema: falscher Host, eigene Entities, ohne Adresse
- Beleg: Auf den Bezirksseiten tragen `ProfessionalService` (`@id`, `url`) und `BreadcrumbList` URLs ohne www (`https://komplettwebdesign.de/webdesign-berlin/<slug>`, hartcodiert in `views/bereiche/webdesign-berlin-district.ejs:2,22-23`), der Canonical ist `https://www.komplettwebdesign.de/...`. Name „Komplett Webdesign Lichtenberg“ etc.: sechs scheinbar eigene Betriebe, nicht mit `#organization` verknüpft; keine `address`, `sameAs`, `geo`.
- Fix: Dort `Service` mit `provider: {"@id":"https://www.komplettwebdesign.de/#organization"}` und `areaServed` (AdministrativeArea Bezirk) ausgeben; alle URLs auf www vereinheitlichen (auch `SITE_URL`-Fallback `controllers/districtController.js:163`).

### F8 – MEDIUM – GBP-Verknüpfung schwach: nicht in sameAs, kein Footer-/Kontakt-Link, kein Maps-Embed
- Beleg: `sameAs` der Organization enthält keine Google-Maps-URL, obwohl der Code-Kommentar `mainController.js:13` das behauptet. Google-Links nur im Vertrauensblock der Startseite. Kein Maps-Embed auf Startseite/Kontakt/Impressum.
- Fix: GBP-URL in `sameAs` und `hasMap`; Link „Route / Bewertungen auf Google“ in Footer und Kontaktseite; Maps-Embed nur mit Consent-Lösung (Datenschutz).

### F9 – MEDIUM – Citations: Namens- und Adressvarianten sowie dünne Abdeckung
- Beleg: Gelbe Seiten führt „Komplett Webdesign Web-Design“ (Möllendorffstr. 26, 10367 Berlin), agenturen.app ebenso; ProvenExpert führt „Komplett Webdesign“ mit „Möllendorffstr.“ ohne Hausnummer und „Nicht bewertet“. Website: „Komplett Webdesign“ / „Möllendorffstr 26“. Zu Das Örtliche (Abruf 410, vermutlich falsche URL), Cylex (403 geblockt), 11880 (Suche ohne Treffer, ggf. JS-gerendert), Yelp, Bing Places, Apple Business Connect: nicht geprüft/nicht belegbar.
- Fix: Einheitliche Schreibweise festlegen (z. B. „Komplett Webdesign“, „Möllendorffstr. 26, 10367 Berlin“, korrekte Telefonnummer aus F1) und in Gelbe Seiten, ProvenExpert, GBP, Bing Places, Apple Business Connect, Das Örtliche, 11880 angleichen. Auf ProvenExpert Hausnummer ergänzen und Bewertungen einsammeln.

### F10 – MEDIUM – Branchenseiten: 16 Seiten, nur 5 in der Sitemap, hoher Template-Anteil
- Beleg: `/branchen` verlinkt 16 Branchenseiten (arzt, autowerkstatt, beautysalon, blumenladen, cafe, fitnesscoach, fotograf, friseur, hebamme, immobilienmakler, physiotherapie, reinigung, restaurant, steuerberater, tattoo, wellness); alle 200, alle `index`. In der Sitemap stehen nur blumenladen, cafe, immobilienmakler, reinigung, restaurant. Paarweise 42–45 % identische Textzeilen (Template-Anteil); Wortumfang je Seite ca. 950–1.700. Title von Café und Blumenladen enthält die interne Formulierung „nach aktueller Paketlogik“ (z. B. „Café Website erstellen lassen Berlin | Webdesign nach aktueller Paketlogik“). Die Startseite bewirbt nur vier Branchen.
- Einschätzung: Kein klassisches Doorway-Muster (Branche statt Ort, eigener Nutzen), aber Qualität variiert, und die Sitemap passt nicht zur Indexierbarkeit.
- Fix: Sitemap und interne Verlinkung angleichen (alle indexierten Branchen aufnehmen oder schwache per `noindex`/301 entfernen), Titel von internem Jargon befreien, pro Branche echte Beispiele aus Referenzen ergänzen.

### F11 – MEDIUM – EN-Bezirksseiten widersprechen den DE-Angaben
- Beleg: `controllers/districtController.js` (EN-Block): „Most projects range between EUR 1,500 and EUR 4,500“, „Yes. We include local SEO basics … and Google Business support“, „Call now“. DE-Seiten: Pakete ab 799 €, Local SEO ist Zusatzleistung; Local-SEO-Seite: GBP-Pflege nur nach Vereinbarung.
- Fix: EN-Texte an die DE-Faktenlage angleichen.

### F12 – LOW – Impressum nennt veraltete Rechtsgrundlagen
- Beleg: `/impressum` führt „§ 5 TMG“ und „§ 55 Abs. 2 RStV“; TMG wurde durch das DDG, der RStV durch den MStV abgelöst. Keine Rechtsberatung, bitte rechtlich prüfen lassen.
- Fix: Auf aktuelle Normen aktualisieren (prüfen lassen).

### F13 – LOW – Keine Erreichbarkeits-/Öffnungsangabe
- Beleg: Weder sichtbare Zeiten noch `openingHoursSpecification`; Bezirksseiten nennen „Support 24 Stunden Antwortziel“.
- Fix: Als SAB „Termine nach Vereinbarung, Antwort in 24 h“ sichtbar im NAP-Block; im GBP identisch pflegen.

## NAP-Konsistenz (Quellenvergleich)

| Quelle | Name | Adresse | Telefon | E-Mail |
|---|---|---|---|---|
| Impressum | Komplett Webdesign (Inhaber Sören Blocksdorf) | Möllendorffstr 26, 10367 Berlin | +49 1551 245048 | kontakt@komplettwebdesign.de |
| Datenschutz | – | Möllendorff… 10367 (vorhanden) | – | gleich |
| Startseite Footer/Text | – | fehlt | fehlt | nur im Schema |
| Kontaktseite | – | fehlt | fehlt | mailto vorhanden |
| JSON-LD Organization/Person | Komplett Webdesign / Sören Blocksdorf | fehlt | +49 1551 245048 | gleich |
| JSON-LD Bezirke (ProfessionalService) | „Komplett Webdesign <Bezirk>“ | fehlt | +49 1551 245048 | gleich |
| Gelbe Seiten | Komplett Webdesign Web-Design | Möllendorffstr. 26, 10367 Berlin | 0155 11 24 50 48 | kontakt@komplettwebdesign.de |
| ProvenExpert | Komplett Webdesign | Möllendorffstr. (ohne Nr.), 10367 Berlin | +49 15511245048 | – |
| agenturen.app | Komplett Webdesign Web-Design | Möllendorffstr. 26, 10367 Berlin | 0155 11 24 50 48 | – |
| GBP (Maps-Pin) | Komplett Webdesign (Maps-Link) | Pin bei Fahrland/Potsdam, Adresse nicht geprüft | nicht geprüft | nicht geprüft |

## GBP-Checkliste

| Signal | Status |
|---|---|
| Profil vorhanden (CID) | Erkannt (Link auf Startseite) |
| Review-Link (g.page) | Funktioniert, gleiche CID |
| Maps-Embed | Nicht vorhanden |
| GBP-Link im Footer/Kontakt | Nicht vorhanden |
| GBP in sameAs/hasMap | Nicht vorhanden |
| Primärkategorie | Nicht geprüft (kein Zugang) |
| Adresse/Servicegebiet im GBP | Nicht geprüft; Pin-Abweichung siehe F2 |
| Fotos, Posts, Q&A, Produkte/Leistungen | Nicht geprüft |
| Öffnungszeiten | Nicht auf Website, im GBP nicht geprüft |

## Review-Health-Snapshot

- Sichtbar auf der Website: 3 Rezensionen auf der Startseite, 5,0 Sterne. Zählung widersprüchlich: „5“ (Startseite) vs. „4“ (Bezirks- und EN-Seiten). Echte Anzahl bei Google: nicht geprüft.
- Velocity, letzte Bewertung, Antwortquote: nicht prüfbar ohne GBP-Zugang. Das Volumen ist sehr niedrig; ein stetiger Zufluss (z. B. 1 Bewertung pro Projektabschluss, QR/Kurzlink `g.page/r/.../review` in der Abschlussmail) ist der größte Hebel.
- Fremdplattformen: ProvenExpert „Nicht bewertet“. Gelbe Seiten: Bewertungszahl nicht geprüft.

## Lokales Schema (Validierung)

| Prüfpunkt | Startseite | Bezirksseiten | Kontakt |
|---|---|---|---|
| Passender Subtyp (ProfessionalService) | Nein (Organization) | Ja, aber mit eigener Entity | Nein |
| name | Ja | Ja (Bezirkssuffix) | – |
| address (Pflicht lokal) | Fehlt | Fehlt | Fehlt |
| telephone | Ja (siehe F1) | Ja | – |
| url, @id konsistent (www) | Ja | Nein (ohne www) | – |
| geo (5 Nachkommastellen) | Fehlt | Fehlt | Fehlt |
| openingHoursSpecification | Fehlt | Fehlt | Fehlt |
| areaServed | Ja (inkl. Deutschland) | Ja | – |
| sameAs | 6 Social-Profile, ohne GBP | Fehlt | – |
| aggregateRating | Bewusst nicht gesetzt (richtig) | nicht gesetzt | – |

## Qualität der Standort-/Landingpages

- 6 Bezirksseiten (DE) plus 6 EN: 6–9 % einzigartiger Inhalt, ca. 73 % identische Zeilen. Doorway-Swap-Test: bestanden nicht (Seite ließe sich durch Austausch des Bezirksnamens in jede andere verwandeln). Interne Verlinkung: Hub `/webdesign-berlin` verlinkt alle sechs; Tiefe 2. Empfehlung siehe F3.
- 16 Branchenseiten: 42–45 % Template-Anteil, eigener Branchenbezug. Siehe F10.
- `/webdesign-berlin` Hub: solide, enthält Pakete, Referenzen, FAQ; guter Anker für Berlin.

## Top 10 priorisierte Aktionen

1. CRITICAL: Telefonnummer verifizieren und zentral (siehe F1) überall und in allen Verzeichnissen vereinheitlichen.
2. HIGH: GBP-Adresse/Servicegebiet/Pin prüfen (F2), Primärkategorie kontrollieren (Webdesigner).
3. HIGH: Organization zu `["Organization","ProfessionalService"]` mit `address`, `sameAs` inkl. GBP, `areaServed` erweitern (F4).
4. HIGH: Bezirksseiten konsolidieren oder auf echten Mehrwert ausbauen; Lichtenberg als Standortseite (F3).
5. MEDIUM: NAP-Block + `tel:`-Link in Footer und `/kontakt` (F5).
6. MEDIUM: Bewertungsanzahl vereinheitlichen, „verifiziert“ prüfen, Review-Prozess (F6).
7. MEDIUM: Bezirks-Schema auf `Service` + Provider-Verweis, www-Host korrigieren (F7).
8. MEDIUM: GBP-Link in Footer/Kontakt, `hasMap`, optional Embed mit Consent (F8).
9. MEDIUM: Verzeichnisse angleichen (Gelbe Seiten, ProvenExpert, Das Örtliche, 11880, Bing Places, Apple Business Connect) (F9).
10. MEDIUM/LOW: Branchenseiten-Sitemap abgleichen, EN-Texte korrigieren, Impressum-Normen prüfen lassen (F10-F12).

## Limitierungen

Ohne DataForSEO, GBP-Zugang, Local-Pack-Messung und Google-Konto nicht prüfbar: GBP-Kategorie, Attribute, Fotos, Posts, Q&A, echte Bewertungsanzahl und -verläufe, Antwortquote, Local-Pack-Rankings, Backlink-Profil. Citations nur stichprobenartig (Gelbe Seiten, ProvenExpert, agenturen.app per Abruf; Das Örtliche/Cylex/11880/Yelp/Bing/Apple nicht belegt). Geocoding stammt von OpenStreetMap (Näherung). Die Doorway-Quote ist eine zeilenbasierte Näherung, kein Google-Maß.
