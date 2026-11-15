# SEO-Audit komplettwebdesign.de

**Datum:** 23.10.2026 · **Werkzeug:** claude-seo 2.5.0 · **Umfang:** 197 gecrawlte Seiten (alle Status 200), 12 Fachprüfungen

## Zusammenfassung

### SEO Health Score: 62 / 100

**Geschäftstyp:** Lokaler Dienstleister. Webdesigner in Berlin, Einzelunternehmer, Websites für kleine Unternehmen, Pakete ab 799 €, deutsche Hauptseite plus englische Version.

Technisch ist die Seite solide gebaut: serverseitig gerendert, schnell (Server-Antwort ca. 90 ms), vollständig crawlbar, KI-Crawler ausdrücklich erlaubt. Der Score leidet vor allem unter **fehlerhaften Inhalten, die live sichtbar sind**: Platzhalter statt Preisen, unaufgelöste Template-Variablen, alte Preise und eine falsche Telefonnummer. Dazu kommen Seiten, die sich gegenseitig Konkurrenz machen, und schwache Vertrauenssignale.

| Kategorie | Gewicht | Score | Grundlage |
|---|---|---|---|
| Technisches SEO | 22 % | **70** | Technik 72, Sitemap 62 (3:1) |
| Inhaltsqualität | 23 % | **55** | E-E-A-T, Thin/Duplicate Content |
| On-Page-SEO | 20 % | **55** | On-Page 63, Content-Architektur/interne Verlinkung 38 (7:3) |
| Strukturierte Daten | 10 % | **58** | |
| Performance (CWV) | 10 % | **74** | Laborwerte, keine Felddaten |
| KI-Suche | 10 % | **67** | GEO 64, Agent-Readiness 75 (7:3) |
| Bilder | 5 % | **58** | |

**Zusatzbereiche** (nicht im Health Score gewichtet, für dein Geschäft aber wichtig):

| Bereich | Score |
|---|---|
| Local SEO | **45** |
| Suchintention/Nutzererlebnis (SXO) | **56** |
| Darstellung/Mobil | **72** |
| Backlinks | **ca. 20** (Schätzung, niedrige Konfidenz) |

### Die 5 kritischsten Probleme

1. **Platzhaltertexte statt Preisen auf 31 Seiten.** `util/legacyPublicCopy.js` ersetzt alte Preise durch „nach aktueller Paketlogik“, „aktueller Paketpreis“ und ähnliche Phrasen. Live steht das sogar im Google-Titel der Café-Seite: „Café Website erstellen lassen Berlin | Webdesign nach aktueller Paketlogik“. Im Ratgeber „Baukasten vs. professionelle Website“ erscheint es 14-mal.
2. **Alle 6 deutschen Bezirksseiten zeigen „{{lowestPackagePriceLabel}}“** und englische Satzteile im deutschen Text („bei from 1,499 €“, „Start from 799 €“). Das steht auch im FAQ-Markup.
3. **Alte Preise und falsche Kontaktdaten live.** `/handwerker` zeigt „Standart Paket 499,00 €“, 899,00 € und 1500,00 €, dazu sichtbare HTML-Kommentare „<!-- Preis -->“ und unbelegte Versprechen („+128 % mehr Aufträge“). Der Blogartikel „Full-Service-Webdesign in Berlin“ nennt viermal die falsche Nummer **+49 1525 4350378** und 499 €.
4. **Kontaktdaten widersprechen sich.** Die Website nennt +49 1551 245048, ProvenExpert und laut Local-Prüfung weitere Verzeichnisse dagegen 0155 11 24 50 48, also eine Ziffer mehr. Der Pin im Google-Maps-Link liegt etwa 32 km von der Impressumsadresse entfernt (Raum Potsdam-Fahrland statt Berlin-Lichtenberg).
5. **Seiten konkurrieren um dieselben Suchanfragen.** Auf „Website erstellen lassen Berlin“ zielen 4 H1 und 6 Titel, auf „Kosten“ 9 URLs. 81 % der Blogartikel sind nur über die Blog-Seitennavigation erreichbar, nicht über Links im Text.

### Die 5 besten Quick Wins

1. Die Ersetzungsregeln in `util/legacyPublicCopy.js` auf echte Preise umstellen und einen Test ergänzen, der bei den Platzhalterphrasen fehlschlägt. **ca. 1 h**
2. Auf den Bezirksseiten `interpolatePricingTokens` anwenden und die deutschen Tokens nutzen (`data/seoGuideCluster.js:19`, `controllers/districtController.js`). **ca. 30 Min**
3. In den Blogartikeln `full-service-webdesign-in-berlin` und `local-seo-berlin-fuer-freelancer` Nummer, Preise und den eingebetteten Schema-Block korrigieren. Die Inhalte liegen in der Datenbank. **ca. 15 Min**
4. `heroBg.webp` (883 KB) verkleinern und die vier Ratgeber-PNGs (je ~2 MB) in WebP umwandeln. Das spart ca. 0,8 MB auf der Startseite und bis zu 7,6 MB auf `/ratgeber`. **ca. 1 h**
5. Den Chat-Button ausblenden, solange der Cookie-Banner offen ist. Er verdeckt auf `/en` die Ablehn-Option „Only necessary“. Den Banner selbst verkleinern. **ca. 1 h**

---

## Technisches SEO (70)

**Gut:** Alle 197 Seiten liefern 200, keine Weiterleitungsketten, keine verwaisten Seiten. Die Sitemap ist valide (126 URLs). Echte 404 bei unbekannten URLs, Brotli, HTTP/2, hreflang DE↔EN gültig.

| Schwere | Befund | Fix |
|---|---|---|
| High | `/leistungen/`, `/about/`, `/faq/`, `/ABOUT`, `//kontakt` liefern 200 statt 301. Die Navigation verlinkt `/leistungen/` 195-mal (`data/siteNavigation.js:23,28,128`). | Navigation korrigieren, 301-Normalisierungs-Middleware |
| High | 11 Branchenseiten, `/booking`, `/de`, `/return_policy`, `/demo/cq-compare/` sind indexierbar, aber nicht in der Sitemap | Pro Seite entscheiden: Sitemap oder noindex/301 |
| Medium | Sitemap-`lastmod` zeigt bei 62 von 126 URLs den Abrufzeitpunkt (`controllers/sitemapController.js`) | Nur echte Daten ausgeben |
| Medium | Der Sprachumschalter erzeugt 36 Parameter-Duplikate, `/faq?cat=999` liefert HTTP 500 | Sprachlink ohne Query, 404 bei ungültiger Kategorie |
| Medium | Blog-Slugs mit Sonderzeichen und Tippfehlern („Scoll-Snapp-Galery-&-Zoom‑on‑View“) | Saubere Slugs + 301 |
| Medium | `/en/pakete*` ist noindex und auf Deutsch, wird aber stark verlinkt | Übersetzen oder Links umleiten |
| Medium | Minimale Security-Header, HSTS fehlt beim Apex-Redirect | Header-Middleware vor den Redirect |
| Low | Session-Cookie bei jedem Request, IndexNow fehlt | Session nur bei Formularen |

Details: [findings/technical.md](findings/technical.md), [findings/sitemap.md](findings/sitemap.md)

## Inhaltsqualität (55)

**Gut:** Viel Inhaltstiefe (Median 1.378 Wörter), Ratgeber mit „Kurzantwort“ am Anfang, konkrete Preise in den Startseiten-FAQ.

| Schwere | Befund |
|---|---|
| Critical | Platzhaltertexte auf 31 Seiten (siehe oben) |
| Critical | `{{lowestPackagePriceLabel}}` und englische Tokens auf allen DE-Bezirksseiten |
| Critical | `/handwerker`: alte Preise, „Standart“, sichtbare Kommentare, unbelegte Prozentzahlen |
| High | Falsche Telefonnummer und alte Preise in zwei Blogartikeln |
| High | Bezirksseiten fast identisch: DE 77–81 % gleiche Sätze, nur ca. 10 % eigener Text (Doorway-Risiko) |
| High | Schwaches E-E-A-T: Dein Name steht nur im JSON-LD, Artikel haben keine Autoren, die Ansprache wechselt zwischen „wir/Sie“ und „ich/du“ |
| Medium | 8 Blogartikel mit mitten im Wort abgeschnittenen Titeln/Descriptions (Content-Agent) |
| Medium | 6 klar themenferne Blogposts, Swipe-and-Cook-App-Seiten verwässern das Themenprofil |

Details: [findings/content.md](findings/content.md), [findings/sxo.md](findings/sxo.md)

## On-Page-SEO (55)

**Gut:** Jede Seite hat genau eine H1 und einen Titel, keine verwaisten Seiten.

| Schwere | Befund |
|---|---|
| Critical | Money-Keyword „Website erstellen lassen Berlin“ auf 4 H1 und 6 Titeln. Keine Seite beginnt mit „Webdesign Berlin“, obwohl 9 von 9 Suchtreffern so starten |
| Critical | Kosten-Intention auf 9 URLs verteilt |
| High | 35 von 43 Blogartikeln ohne Link aus dem Text; Blog → Ratgeber: 0 Links. Der Content-Agent kennt nur 9 feste Linkziele |
| High | Branchen-Cluster faktisch verwaist (11 von 16 nicht in der Sitemap, 12 mit nur 1 Inlink) |
| Medium | 52 Titel über 65 Zeichen, 33 Descriptions über 160 Zeichen |

Die Zielarchitektur mit 5 Themenclustern und konkreten Link-Empfehlungen (von → nach, Ankertext) steht in [findings/cluster.md](findings/cluster.md). Weitere Details: [findings/onpage.md](findings/onpage.md)

## Strukturierte Daten (58)

**Gut:** 0 ungültige JSON-LD-Blöcke, keine erfundenen Bewertungen, BlogPosting fast vollständig.

| Schwere | Befund |
|---|---|
| High | Entity-Graph zerfasert: Organization in 6 Varianten, 37 Knoten ohne @id, Person nur auf `/` und `/en` |
| High | Kein ProfessionalService mit Adresse, Google-Profil fehlt in `sameAs`. Bezirksseiten erzeugen je einen eigenen ProfessionalService mit Apex-Domain |
| Medium | `/en` beschreibt sich im Schema als deutsche Startseite |
| Medium | `dateModified` der Startseite = Abrufzeitpunkt; 29 Blogposts mit identischem Datum |
| Info | FAQPage auf 160 Seiten: Google zeigt FAQ-Rich-Results seit 7. Mai 2026 nicht mehr an. Das Markup schadet nicht |

Fertige JSON-LD-Vorschläge (AboutPage + Person, Paket mit Offer): [findings/schema.md](findings/schema.md)

## Performance (74)

**Datenlage:** Laborwerte (Chromium, mobil gedrosselt). Felddaten gibt es keine, weil PageSpeed Insights ohne API-Key kein Kontingent mehr hatte.

**Gut:** Server-Antwort 88–137 ms, versionierte Assets lange gecacht, Tracking lädt erst nach Consent, CLS 0–0,019.

| Schwere | Befund |
|---|---|
| High | Ratgeber-Titelbilder 1,8–2,1 MB als PNG, gleichzeitig LCP-Element (`views/ratgeber/show.ejs:41`) |
| High | `heroBg.webp` mit 883 KB lädt sofort auf `/` und `/en` (`public/home.css:2150`); Load-Event im Labor 8,5 s |
| High | Der Cookie-Banner ist für Erstbesucher das LCP-Element (LCP 3,1 s mit, 1,7 s ohne Banner) |
| Medium | Kein `srcset` auf der gesamten Website |
| Low | Font Awesome doppelt geladen (110 KB), Footer-Logo-SVG 325 KB |

Details: [findings/performance.md](findings/performance.md)

## KI-Suche (67)

**Gut:** Alle KI-Crawler erlaubt (Live-Test mit 10 Bots: überall 200), serverseitig gerendert, `llms.txt` vorhanden, Accessibility-Tree ohne unbenannte Bedienelemente.

| Schwere | Befund |
|---|---|
| High | Person und Selbstbeschreibung sind für KI-Antworten unklar, `/about` hat kein JSON-LD |
| Medium | `llms.txt` veraltet (April), Links ohne www, keine Preise |
| Medium | ARIA-Fehler: Logo mit `role="presentation"` (`views/partials/header.ejs:111`), Bewertungssterne ohne Rolle (`views/index.ejs:707`) |
| Low | Mehrdeutige Linktexte („Details ansehen“ 4×) |

Lighthouse-Wert „Agentic Browsing“: nicht gemessen (kein PageSpeed-Kontingent). Details: [findings/geo.md](findings/geo.md), [findings/agentic.md](findings/agentic.md)

## Bilder (58)

| Schwere | Befund |
|---|---|
| High | Übergroße Dateien: Ratgeber-PNGs ~2 MB, Avatar 335 KB, ein Blogbild 962 KB |
| Medium | Inhaltsbilder ohne `width`/`height` auf Branchen-, Referenz-, Blog- und About-Seiten |
| Low | 2 Bilder ohne Alt-Text, Platzhalterbilder von picsum.photos auf der Demo-Seite |

Details: [findings/images.md](findings/images.md)

## Local SEO (45, Zusatz)

| Schwere | Befund |
|---|---|
| Critical | Telefonnummer weicht von Verzeichniseinträgen ab |
| High | Maps-Pin ca. 32 km von der Impressumsadresse entfernt |
| High | Bezirksseiten mit Doorway-Risiko; die Lichtenberg-Seite nennt deinen Sitz nicht |
| Medium | Adresse und Telefon fehlen in Footer und auf `/kontakt`; Bewertungszahl widersprüchlich (5 vs. 4) |

Nicht geprüft: Kategorie, Fotos und Bewertungen im Google-Unternehmensprofil. Details: [findings/local.md](findings/local.md)

## Darstellung und Mobil (72, Zusatz)

| Schwere | Befund |
|---|---|
| High | Der Cookie-Banner belegt mobil 36 % des ersten Screens |
| High | Der Chat-Button verdeckt „Only necessary“ (Ablehn-Option) und den Hero-CTA (z-index 1050 vs. 1000) |
| Medium | Alle Absätze fett (`public/css/main.css:86-89`), Orange mit Kontrast 3,85:1 |
| Medium | `/kontakt`-Hero mit `100vh` läuft auf kleinen Handys über |

Screenshots: [screenshots/](screenshots/). Details: [findings/visual.md](findings/visual.md)

## Backlinks (ca. 20, Zusatz, Schätzung)

5 verlinkende Domains bestätigt, alle selbst erzeugt: Footer-Credits von zwei Referenzkunden, sauber-mehr.de nur aus dem Datenschutz, ProvenExpert, firmenpresse.de (nofollow). Keine toxischen Muster in der Stichprobe. Ohne Search Console oder Moz ist das Gesamtprofil nicht messbar. Details: [findings/backlinks.md](findings/backlinks.md)

## Weitere Auffälligkeit (nicht SEO)

Auf der Live-Startseite ist ein **Stripe-Testschlüssel** (`pk_test_…`) eingebunden (`STRIPE_PUBLISHABLE_KEY`). Das ist kein Sicherheitsproblem, denn öffentliche Schlüssel sind zum Anzeigen gedacht. Zahlungen über die Website laufen damit aber im Testmodus. Prüfe, ob das gewollt ist.

## Grenzen dieses Audits

- Keine Felddaten (CrUX/Search Console), keine echten Rankings, kein Backlink-Index. Mit einem PageSpeed-API-Key und angebundener Search Console wären Performance und Indexierung präziser bewertbar (`/seo google setup`).
- Die Suchergebnis-Analysen nutzen ein US-basiertes Suchwerkzeug, ohne Local Pack und ohne AI Overviews.
- Die Kategorie-Zusammenführungen (z. B. Technik 3:1 mit Sitemap) sind eine Festlegung dieses Audits und oben offen ausgewiesen.
