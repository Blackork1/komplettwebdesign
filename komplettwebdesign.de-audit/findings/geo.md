# GEO / KI-Suche – AI Search Readiness

**Domain:** https://www.komplettwebdesign.de  
**Prüfdatum:** 23.10.2026  
**Geprüfte URLs:** `/`, `/en`, `/pakete`, `/webdesign-berlin`, `/webdesign-berlin/kosten-preise-pakete`, `/leistungen/website-relaunch`, `/about`, `/faq`, `/impressum`, `/referenzen/zur-alten-backstube`, `/ratgeber/website-kosten-berlin`, `/blog/ki-sichtbarkeit-website-berlin-2026`, `/blog/website-kosten-2025-einfach-erklaert`, sowie `robots.txt`, `llms.txt`, `sitemap.xml` (126 URLs)  
**Methode:** Roh-HTML per `render_page.py --mode never` (alle Seiten serverseitig gerendert, `is_spa: false`), Abruf mit 10 Bot-User-Agents, Abgleich mit dem Quellcode (nur lesend).

---

## AI Search Readiness Score: **64 / 100**

| Dimension | Gewicht | Score | Gewichtet | Kurzbegründung |
|---|---|---|---|---|
| Zitierfähigkeit (Citability) | 25 % | 62 | 15,5 | Gute FAQ-Antworten mit konkreten Zahlen (799 / 1.499 / 2.499 / 3.500 €, 2–4 / 4–6 Wochen), „Kurzantwort“ im Ratgeber. Auf der Startseite allerdings viel Absicherungsprosa („im vereinbarten Umfang“), kaum belegte Fakten, eine FAQ-Antwort passt nicht zur Frage, Blog-Titel sind abgeschnitten |
| Strukturelle Lesbarkeit | 20 % | 72 | 14,4 | Saubere H1→H2→H3-Hierarchie, Frage-Überschriften in Ratgeber/Blog, Vergleichstabellen. Einzelne Satz-H2s, doppelte H1/H2 im Blog, `/about` ohne `<main>` |
| Multimodale Inhalte | 15 % | 50 | 7,5 | Tabellen und Bilder mit Alt-Text auf Kernseiten. Kein eingebettetes Video, obwohl ein YouTube-Kanal existiert. Keine Diagramme oder Prozessgrafiken mit Textäquivalent. Viele Bilder ohne Alt-Text auf `/pakete` und `/about` |
| Autorität & Marken-Signale | 20 % | 45 | 9,0 | Person-Schema „Sören Blocksdorf“ ist vorhanden, die Person ist auf der Startseite aber nicht sichtbar genannt. Artikel sind der Organisation zugeschrieben, ohne Byline. Widerspruch „Agentur/wir“ gegenüber „ich/Einzelunternehmer“. Nur 5 Google-Bewertungen und 3 Referenzen, keine Wikidata-Entität. Organization-`@id` ist zweigeteilt |
| Technische Zugänglichkeit | 20 % | 90 | 18,0 | Alle relevanten KI-Bots erlaubt, SSR, TTFB ca. 0,25 s, `max-snippet:-1`, llms.txt vorhanden. Abzüge: künstliche `lastmod`/`dateModified`-Werte, llms.txt verlinkt auf Nicht-www-URLs |
| **Gesamt** | | | **64,4 → 64** | |

### Plattform-Einschätzung

| Plattform | Score | Wichtigste Hebel |
|---|---|---|
| Google AI Overviews / AI Mode | 66 | Googlebot hat Zugang, gute FAQ-/Preispassagen. Ausbaufähig: lokale Entität (Adresse/GBP im Schema), sichtbare Autorschaft, echte Aktualitätsdaten |
| ChatGPT Search (OAI-SearchBot + Bing-Index) | 58 | Zugang ist offen. Die Sichtbarkeit hängt stark vom Bing-Index ab, dort schwächt die verfälschte `lastmod`-Angabe. Es gibt kaum Marken-Erwähnungen auf Drittseiten |
| Perplexity | 60 | PerplexityBot ist erlaubt, die direkten Antworten passen gut. Es fehlen Quellen, eigene Daten und Drittquellen-Erwähnungen |
| Bing Copilot | 58 | Wie ChatGPT: Bingbot hat Zugang (über `*`). Abzüge für `lastmod`, Entität und Autorschaft |
| Claude (Claude-SearchBot) | 60 | Ausdrücklich erlaubt. Gleiche inhaltliche Hebel wie Perplexity |

---

## KI-Crawler-Zugang (robots.txt + Live-Test)

robots.txt erlaubt `/` für alle unten genannten Bots. Gesperrt sind nur `/admin/`, `/auth/`, `/api/`, `/webhook` und `/test`. Zusätzlich hat jeder getestete User-Agent die Startseite mit **HTTP 200 und identischer Größe (111.465 Bytes)** erhalten. Es gibt also kein WAF-/Bot-Blocking und kein Cloaking.

| Bot | Regelt | robots.txt | Live-Abruf |
|---|---|---|---|
| Googlebot | Google Suche **und** AI Overviews / AI Mode | erlaubt (explizit) | 200 |
| Google-Extended | Gemini-/Vertex-Training und Grounding, **nicht** AIO-Aufnahme | erlaubt (explizit) | – (kein eigener Crawler) |
| OAI-SearchBot | ChatGPT-Search-Zitate | erlaubt (explizit) | 200 |
| ChatGPT-User | Nutzer-initiierte Abrufe in ChatGPT | erlaubt (explizit) | – |
| GPTBot | OpenAI-**Training** (nicht ChatGPT Search) | erlaubt (explizit) | 200 |
| Claude-SearchBot | Claude-Suchzitate | erlaubt (explizit) | 200 |
| Claude-User | Nutzer-initiierte Abrufe in Claude | erlaubt (explizit) | – |
| ClaudeBot | Anthropic-**Training** | erlaubt (explizit) | 200 |
| PerplexityBot | Perplexity-Suchindex | erlaubt (explizit) | 200 |
| Perplexity-User | Nutzer-initiierte Abrufe | erlaubt (über `*`) | – |
| Bingbot | Bing-Index → Copilot **und** Grundlage für ChatGPT Search | erlaubt (über `*`) | 200 |
| Applebot | Siri / Spotlight / Safari | erlaubt (über `*`) | 200 |
| Applebot-Extended | Apple-Intelligence-**Training** | erlaubt (über `*`) | – |
| CCBot | Common Crawl (Trainingsdaten) | erlaubt (über `*`) | 200 |
| meta-externalagent | Meta-KI-Training | erlaubt (über `*`) | 200 |
| cohere-ai | Cohere-Training | erlaubt (über `*`) | – |

**Bewertung:** Für maximale KI-Sichtbarkeit ist der Zugang korrekt konfiguriert. Ob die Trainings-Crawler (GPTBot, ClaudeBot, Google-Extended, CCBot, Applebot-Extended, meta-externalagent) zugelassen werden, ist eine geschäftliche Entscheidung. Auf die Zitierfähigkeit in ChatGPT Search, Claude oder AI Overviews hat sie keinen Einfluss. Für einen Dienstleister, der bekannt werden will, ist „erlauben“ vertretbar.

Hinweis: Im Repo liegen zwei robots-Dateien, `Robots.txt` (Root) und `public/robots.txt`. Ausgeliefert wird `public/robots.txt`. Die Root-Datei sollte gelöscht werden, damit später nicht versehentlich die falsche bearbeitet wird.

## llms.txt- und RSL-Status

| Datei | Status |
|---|---|
| `/llms.txt` | **vorhanden** (200, `text/plain; charset=utf-8`, 4,4 KB), inhaltlich brauchbar, aber **teilweise veraltet und nicht spec-konform** (siehe Finding M6) |
| `/llms-full.txt` | 404 |
| `/.well-known/llms.txt` | 404 |
| RSL 1.0 (`/license.xml`, `/rsl.xml`, `/.well-known/rsl.xml`) | nicht vorhanden. Optional, für ein Dienstleistungsunternehmen ohne Lizenzgeschäft kein Handlungsbedarf |

Hinweis: Google wertet llms.txt nicht aus. Die Datei ist ein günstiges Zusatzsignal für einzelne LLM-Tools, aber kein Ranking-Hebel.

---

## Was gut funktioniert

1. **Serverseitiges Rendering überall.** Alle geprüften Seiten liefern den vollständigen Inhalt im Roh-HTML (`is_spa: false`). Kein Bot muss JavaScript ausführen, um Texte, FAQ oder Preise zu lesen.
2. **Offener Bot-Zugang mit Absicherung.** Alle Such- und Nutzer-Bots (OAI-SearchBot, Claude-SearchBot, PerplexityBot, ChatGPT-User, Claude-User) sind ausdrücklich erlaubt. Der Live-Test bestätigt identische Auslieferung.
3. **`max-snippet:-1, max-image-preview:large`** auf allen Seiten, Google darf also beliebig lange Passagen für AIO/AI Mode verwenden.
4. **Konkrete, zitierfähige Fakten im FAQ der Startseite** (10 Fragen, auch als `FAQPage`-JSON-LD):
   - „Website-Pakete starten bei 799 € … Business ab 1.499 €, Wachstum ab 2.499 €, individuell ab 3.500 €“
   - „Kompakte Start-Websites dauern häufig 2 bis 4 Wochen, Business-Projekte meist 4 bis 6 Wochen.“
   - „Gibt es eine Ranking-Garantie? Nein. …“ (ehrliche, direkte Antwort)
5. **Ratgeber mit Answer-First-Muster.** `/ratgeber/website-kosten-berlin` beginnt mit „**Kurzantwort:** Eine professionelle Website in Berlin startet bei Komplett Webdesign ab 799 €. …“, hat Frage-H2s („Welche laufenden Kosten kommen dazu?“), eine Preistabelle und 4 FAQ. Das ist ein Musterbeispiel für passagenweise Zitierfähigkeit.
6. **Gute Tiefe auf den Money Pages.** `/webdesign-berlin` hat ca. 2.300 Wörter und 20 FAQ, `/leistungen/website-relaunch` ca. 1.870 Wörter und 20 FAQ, `/webdesign-berlin/kosten-preise-pakete` hat Beispielrechnungen. Leistungsgrenzen sind klar benannt („Was nicht automatisch enthalten ist“). Dieses Abgrenzen ist für LLM-Antworten auf Fragen wie „Was kostet …, was ist enthalten?“ sehr wertvoll.
7. **Entitäts-Grundgerüst vorhanden.** Startseite mit `Organization` (`/#organization`), `Person` (`/#person`, „Sören Blocksdorf“, `jobTitle`, `knowsAbout`), `WebSite`, `Service`, `WebPage` (mit `author` → Person). `sameAs` verweist auf LinkedIn, Instagram, Facebook, YouTube, Threads und TikTok.
8. **Echte Vertrauenssignale sichtbar.** 5,0 Sterne aus 5 Google-Bewertungen mit Zitaten, eine Fallstudie mit externem Link (`zuraltenbackstube.de`), Impressum mit Inhaber und Anschrift.
9. **Blog mit Primärquellen.** Der Artikel zur KI-Sichtbarkeit verlinkt Google-Search-Central- und OpenAI-Dokumentation, hat Frage-H3s im FAQ, eine Prioritätentabelle und Praxisbeispiele.
10. **hreflang DE/EN/x-default** korrekt auf Start- und Webdesign-Berlin-Seite.

## Marken- und Entitätspräsenz außerhalb der Website

| Signal | Befund (23.10.2026) | Bewertung |
|---|---|---|
| Wikipedia (de) | 0 Treffer für „Komplett Webdesign“ | erwartbar für Einzelunternehmen, kein Fix nötig |
| Wikidata | 0 Entitäten | später optional (nur mit Belegen aus Drittquellen) |
| YouTube | Kanal `@KomplettWebdesign` erreichbar (HTTP 200). Videoanzahl/Abos nicht ermittelbar (Consent-Seite), auf der Website kein Video eingebettet | ungenutzt, stärkster Korrelationshebel für KI-Zitate (~0,74) |
| LinkedIn | `linkedin.com/in/komplettwebdesign` in `sameAs` (Personenprofil unter Markenhandle) | ok. Besser: Personenprofil „Sören Blocksdorf“ plus Unternehmensseite |
| Reddit / Foren | nicht verifiziert (kein API-Zugang); keine Hinweise auf Erwähnungen | Aufbau empfohlen |
| Google-Unternehmensprofil | 5,0 ★ / 5 Bewertungen (laut Website). Maps-Pin weicht von Impressum-Adresse ab (M3) | mehr Bewertungen + NAP-Abgleich |
| Ratgeber-Zitierfähigkeit (Stichprobe) | `/ratgeber/website-kosten-berlin` und `/ratgeber/website-erstellen-berlin-ablauf-dauer-kosten` beginnen beide mit „**Kurzantwort:** …“, haben Frage-H2s und `FAQPage`. Das ist das beste Muster der Site und sollte auf Blog und Leistungsseiten übertragen werden | stark |

---

## Findings

### HIGH

#### H1: Die Person hinter dem Angebot ist auf der Startseite nur im JSON-LD sichtbar, nicht im Text
- **Beleg:** Im sichtbaren Text der Startseite kommt „Sören“ bzw. „Blocksdorf“ **0-mal** vor. Der einzige Treffer steht im `Person`-JSON-LD. Der Text spricht durchgehend in der Ich-Form („Ich ordne Inhalte …“, „von mir“), ohne zu sagen, wer „ich“ ist. Auch Gründungsjahr, Standortbezirk und Projektanzahl fehlen.
- **Warum relevant:** LLMs und AI Overviews bauen Entitäten aus sichtbarem Text und Schema zusammen. Ein Schema, das der Sichtbarkeit widerspricht oder sie nicht spiegelt, wird schwach gewichtet. Fragen wie „Wer steckt hinter Komplett Webdesign?“ oder „Webdesigner in Berlin-Lichtenberg“ lassen sich so nicht aus einer Passage beantworten.
- **Fix:** Unter H1/Hero einen kurzen Absatz (40–60 Wörter) ergänzen, der als Definition taugt, z. B.:
  > „Komplett Webdesign ist das Webdesign-Studio von Sören Blocksdorf in Berlin-Lichtenberg. Seit [Jahr] entwickle ich individuelle Websites für kleine Unternehmen, Selbstständige und lokale Anbieter in Berlin und Brandenburg – ohne Baukasten, mit Festpaketen ab 799 € und einem festen Ansprechpartner vom Erstgespräch bis zum Launch.“
  
  Dazu im Trust-Block ein Porträt mit Namen und einen Link auf `/about`. Ort: `views/index.ejs` (Hero bzw. Copy-Objekt `copy.heroSubline`) und `controllers/mainController.js`.

#### H2: Uneinheitliche Selbstbeschreibung: „Agentur/wir/Sie“ gegenüber „Einzelunternehmer/ich/du“
- **Beleg:**
  - `/about`: „Seit der Gründung meiner eigenen **Webdesign-Agentur** …“, „ist heute ein **Full-Service-Dienstleister**“, „Der Name meiner **Agentur** ist übrigens Programm“ (`views/about.ejs:82`, `:84`, `:213`). Zugleich sagt dieselbe Seite: „Komplett Webdesign ist noch keine große Agentur“ (`:52`).
  - Title `/about`: „**Über uns** – Wer ist Komplett Webdesign?“ (`controllers/mainController.js:428`), H1 aber „Hallo, ich bin Sören“.
  - `/faq`: durchgehend „**Wir** beraten **Sie** …“, „Eine Webdesign-**Agentur** übernimmt …“, „Bietet **Ihr** ein unverbindliches Erstgespräch an?“
  - Blog `/blog/website-kosten-2025-einfach-erklaert`: „Branchen, für die **wir** Websites erstellen“.
  - `llms.txt`: „Full-Service-Dienstleister für Webdesign, Website-Entwicklung, SEO, Hosting, Wartung, Buchungssysteme und Shops“, während die Startseite Texterstellung, Local SEO, Buchung und Shop ausdrücklich als *separat* einordnet.
- **Warum relevant:** LLM-Antworten verdichten Angaben aus mehreren Quellen. Widersprüche führen zu vagen oder falschen Beschreibungen („Berliner Agentur mit Team …“) und schwächen das Vertrauen in die Entität.
- **Fix:** Eine verbindliche Entitätsformel festlegen, z. B. „Komplett Webdesign = Einzelunternehmen von Sören Blocksdorf, Berlin, Websites für kleine Unternehmen, Pakete ab 799 €“, und sie auf `/about`, `/faq`, in den Blog-Bausteinen, in `public/llms.txt` sowie in Meta-Title und Description anwenden. Title `/about` z. B. auf „Über mich – Sören Blocksdorf, Webdesigner in Berlin | Komplett Webdesign“. Die `/faq`-Inhalte auf Du-Form und Ich-Perspektive umschreiben.

#### H3: Artikel ohne Personen-Autor, keine sichtbare Byline
- **Beleg:**
  - Blog: `"author":{"@id":"https://www.komplettwebdesign.de/#organization"}` (`services/blogPostPresentationService.js:245`)
  - Ratgeber: `"author": { "@type": "Organization", "name": "Komplett Webdesign" }` (`controllers/ratgeberController.js:193`)
  - Im sichtbaren Artikeltext gibt es keine Byline („Von Sören Blocksdorf“), kein Autorenkästchen und keinen Link auf `/about`.
- **Warum relevant:** Für YMYL-nahe Themen wie Kosten, Recht oder SEO-Beratung gewichten Google (E-E-A-T) und Perplexity/ChatGPT erkennbare Fachautoren mit Profil stärker als anonyme Organisationsinhalte. Die Person `/#person` existiert bereits, wird aber nur auf der Startseite genutzt.
- **Fix:** `author: { '@type': 'Person', '@id': '<base>/#person', name: 'Sören Blocksdorf', url: '<base>/about' }` in beiden Dateien. Sichtbare Byline mit Foto, 1–2 Sätzen Expertise („Webentwickler seit über 10 Jahren, Node.js/EJS“) und „Zuletzt aktualisiert am …“ unter der H1 in `views/blog/*` und `views/ratgeber/show.ejs`.

#### H4: `/about` als zentrale Entitätsseite ohne strukturierte Daten und ohne `<main>`
- **Beleg:** `/about` enthält **keinen einzigen JSON-LD-Block** (`views/about.ejs:1` bindet `partials/head` ohne `structuredDataBlocks` ein), kein `<main>`-Element, 19 von 24 Bildern ohne Alt-Text, kein hreflang.
- **Fix:** In `views/about.ejs` `structuredDataBlocks` übergeben, und zwar `ProfilePage` mit `mainEntity: { '@id': '<base>/#person' }` sowie die vollständige `Person` (Bild `/images/meinAvatar.webp`, `jobTitle`, `worksFor`, `sameAs`, `knowsAbout`, optional `alumniOf` und `hasCredential`). Inhalt in `<main>` einschließen. Dekorative Bilder mit `alt=""`, inhaltliche Bilder beschreiben.

### MEDIUM

#### M1: Künstliche Aktualität: `dateModified` und Sitemap-`lastmod` = Abrufzeitpunkt
- **Beleg:**
  - Startseite: `dateModified: new Date().toISOString().split('T')[0]` (`views/index.ejs:173`) → bei jedem Abruf „heute“. `datePublished: '2024-01-01'` ist ein Platzhalter (`:172`).
  - Sitemap: 62 von 126 URLs tragen `lastmod` = Zeitpunkt der Anfrage (`2026-10-23T05:28:39.200Z`), weil statische Routen und Bezirke `nowIso` nutzen (`controllers/sitemapController.js:66`, `:138`, `:144`, `:199`). DB-Seiten nutzen `COALESCE(created_at, now()) AS updated_at` (`:81`), also das Erstellungs- statt des Änderungsdatums.
  - `/leistungen/*`: `webPageSchema.datePublished = updatedIso` (`views/leistungen/show.ejs:125`) überschreibt das Veröffentlichungsdatum mit dem Änderungsdatum.
- **Warum relevant:** Google und Bing ignorieren `lastmod`, wenn es nachweislich unzuverlässig ist. Bing (Datenbasis für Copilot und ChatGPT Search) nutzt `lastmod` aktiv fürs Recrawling. Gleichlaufende Aktualitätsangaben erzeugen Misstrauen statt Frische.
- **Fix:** `lastmod` nur aus echten Änderungsdaten speisen (Git-Commit-Datum des Templates bzw. `updated_at`). Für statische Seiten eine gepflegte Map `{ path: 'YYYY-MM-DD' }` in der SEO-Policy führen. `dateModified` auf der Startseite aus derselben Quelle, `datePublished` mit echtem Datum (Gründung bzw. Launch). In `leistungen/show.ejs` `datePublished` aus `created_at`.

#### M2: Organization-Entität ist zweigeteilt (`/#organization` vs. `#organization`)
- **Beleg:** Startseite, Blog und Ratgeber verwenden `https://www.komplettwebdesign.de/#organization`. `/webdesign-berlin/kosten-preise-pakete` und alle Seiten über `views/leistungen/show.ejs` verwenden `https://www.komplettwebdesign.de#organization` und `…#website` **ohne Slash** (`views/leistungen/show.ejs:33`, `:49`, `:53`, `:94`, `:107`).
- **Warum relevant:** Für Knowledge-Graph-Parser sind das zwei verschiedene Knoten. Service-Seiten hängen dann an einer Organisation ohne Logo-Details, Kontakt und `sameAs`-Kontext der Startseite.
- **Fix:** In `views/leistungen/show.ejs` `baseUrl + "/#organization"` bzw. `"/#website"` verwenden, am besten eine zentrale Helper-Konstante (`helpers/pageSchema.js`) für alle IDs.

#### M3: Lokale Entität unvollständig: keine Adresse und kein GBP-Bezug im Schema, Maps-Pin weicht vom Impressum ab
- **Beleg:**
  - `Organization` auf der Startseite (`views/index.ejs:80–119`) hat **kein `address`**, kein `geo`, kein `hasMap`, keinen `founder` und als Typ nur `Organization`. Die Adresse „Möllendorffstr 26, 10367 Berlin“ steht nur im Impressum und in `llms.txt`, nicht auf der Startseite.
  - Der Google-Maps-Link der Startseite zeigt auf Koordinaten `52.45906, 13.0157992` (westlich von Berlin, Raum Potsdam). Die Impressum-Adresse liegt in Berlin-Lichtenberg (ca. 52.51 / 13.48). Vermutlich ist ein Servicegebiets-Profil die Ursache, das sollte aber geprüft werden.
  - Das GBP-Profil fehlt in `sameAs`.
- **Warum relevant:** Für „Webdesigner Berlin“-Fragen in AI Mode, Gemini und ChatGPT (Bing Places) ist die NAP-Konsistenz zwischen Website, Schema und Unternehmensprofil ein zentraler Abgleich.
- **Fix:** Typ auf `["Organization","ProfessionalService"]` (oder `LocalBusiness`) erweitern, `address` als `PostalAddress` ergänzen, `hasMap` mit GBP-CID-URL, GBP-URL in `sameAs`, dazu `founder: { '@id': '/#person' }`. Sichtbar im Footer Ortsangabe „Berlin-Lichtenberg“ ergänzen (bzw. volle NAP, falls gewünscht). GBP-Pin bzw. Servicegebiet mit der Impressum-Adresse abgleichen.

#### M4: Abgeschnittene Blog-Titel und -Headlines im Schema
- **Beleg:** Mindestens 2 Artikel betroffen (Auswertung `raw/crawl.json`, alle Blog-Titel):
  - `/blog/website-relaunch-inhalte-nicht-loeschen-2026` → `<title>` „Website-Relaunch 2026: Welche Inhalte du nicht löschen“ (Verb fehlt)
  - `/blog/ki-sichtbarkeit-website-berlin-2026` → `<title>` = „KI-Sichtbarkeit 2026 ohne GEO-Mythen: Was deine Website“ (Satz bricht ab)
  - Meta-Description endet auf „… statt H“
  - `BlogPosting.headline` übernimmt den abgeschnittenen Title (`services/blogPostPresentationService.js:205` `pageTitle = post.meta_title || post.title`, `:240` `headline: pageTitle`)
- **Warum relevant:** Die Headline ist das stärkste Label, mit dem LLMs eine Quelle benennen. Ein abgebrochener Satz wirkt automatisiert und minderwertig.
- **Fix:** `meta_title` und `meta_description` in der DB (`posts`) für alle betroffenen Artikel korrigieren. Im Content-Agent (`services/contentAgent/articleValidator.js:173 ff.`) auf Wortgrenze kürzen statt hart abzuschneiden. `headline` im Schema grundsätzlich aus `post.title` (H1) speisen.

#### M5: `/en` deklariert sich im Schema als deutsche Startseite
- **Beleg:** Auf `/en`: `WebPage.@id` = `https://www.komplettwebdesign.de/#webpage`, `url` = `https://www.komplettwebdesign.de/`, `name` = „Website erstellen lassen in Berlin“, deutsche Beschreibung, aber `inLanguage: en-US`. `Organization.description` ist gemischt: „Persönliches Webdesign, technische SEO-Grundlagen und clear website packages from 799 €“. Ursache: `views/index.ejs:142–149`, `:164–173` nutzt für EN dieselben IDs, URLs und deutschen Strings.
- **Fix:** Für `isEn` eigene `@id` (`/en#webpage`), `url` `/en`, englische `name`/`description`. Organization- und Person-Beschreibung pro Sprache vollständig übersetzen oder sprachneutral halten.

#### M6: llms.txt veraltet, verweist auf Nicht-www-URLs, ohne Preise und nicht spec-konform
- **Beleg (`public/llms.txt`):**
  - `Canonical site: https://komplettwebdesign.de/` und alle 10 Links ohne `www`. Die Live-Site leitet `komplettwebdesign.de` per 301 auf `www.` um, Canonical ist `https://www.komplettwebdesign.de/`.
  - `Last updated: 2026-04-21`, also seit 6 Monaten nicht gepflegt.
  - Preise: „aktuelle Paketlogik und Preisangaben siehe …“, obwohl die Preise öffentlich und stabil sind (799 / 1.499 / 2.499 / ab 3.500 €). Ein LLM, das nur llms.txt liest, bekommt keinen Preis.
  - Positionierung „Full-Service … SEO, Hosting, Wartung, Buchungssysteme und Shops“ widerspricht der Leistungsabgrenzung der Startseite (siehe H2).
  - Format: kein `> Blockquote`-Summary, Links nicht als `- [Titel](URL): Beschreibung`. Es fehlen Abschnitte für Ratgeber, Blog-Highlights, Über mich und Referenzen. Inhaber „Sören Blocksdorf“ wird nicht genannt.
- **Fix:** Datei auf `https://www.` umstellen, Preise und Lieferzeiten direkt nennen, Inhaber nennen, im llmstxt.org-Format strukturieren (H1, Blockquote, `## Leistungen`, `## Ratgeber`, `## Über`, `## Optional`) und das Datum automatisch aus dem Deploy setzen. Geringer Aufwand, aber auch geringe Wirkung (Google ignoriert die Datei).

#### M7: Zu wenig belegte und eigene Daten. Sehr viel Absicherungsprosa auf der Startseite
- **Beleg:** Auf der Startseite kommt „im vereinbarten Umfang“ bzw. „separat“ über 15-mal vor. Mehrere Abschnitte („Technische SEO-Grundlagen“, „Keine Garantie“, „Kein Ersatz für ein Audit“) bestehen aus 1–2 Sätzen ohne Fakt. Es gibt keine Projektanzahl, kein Gründungsjahr, keine Messwerte (z. B. Lighthouse-/LCP-Werte der Referenzen), keine Vorher-nachher-Zahlen in der Fallstudie und auf Money Pages keine Quellenangaben.
- **Warum relevant:** Passagen mit konkreten Zahlen und Belegen werden deutlich häufiger als Quelle zitiert als allgemeine Leistungsbeschreibungen.
- **Fix:** Pro Kernseite 2–3 belegbare Fakten ergänzen, z. B. „Ø LCP der Referenzseiten 1,4 s (PageSpeed, Stand 10/2026)“, „X Projekte seit 20XX“, „Reservierungen bei Zur alten Backstube: telefonisch → online“. Absicherungen in einem einzigen „Was nicht enthalten ist“-Block bündeln, statt sie in jedem Absatz zu wiederholen.

#### M8: Startseiten-FAQ: Eine Antwort beantwortet ihre Frage nicht
- **Beleg:** „Warum starten die Pakete bei 799 €?“ → Antwort: „Die Website wird individuell mit Node.js, EJS, CSS und JavaScript umgesetzt …“. Gesagt wird nur, *wie* gebaut wird, nicht *warum* der Preis so liegt. Außerdem: „Business-Websites starten bei **ab** 1.499 €“ (doppeltes „bei ab“).
- **Fix:** Answer-First, z. B. „799 € deckt eine kompakte Website mit 1–3 Seiten, individuellem Layout, responsiver Umsetzung und technischer SEO-Grundlage ab. Günstiger ist eine individuelle Umsetzung ohne Baukasten nicht seriös kalkulierbar; …“. „bei ab“ → „ab“. Quelle: FAQ-Einträge in `controllers/mainController.js` bzw. dem Copy-Objekt für `faqEntries`.

#### M9: Auffällige KI-Spuren im Blog
- **Beleg:** `/blog/ki-sichtbarkeit-website-berlin-2026`:
  - Externe Quellen-Links tragen `?utm_source=openai` (z. B. `developers.google.com/search/docs/appearance/ai-features?…&utm_source=openai`)
  - Die Keyword-Phrase ist unnatürlich eingesetzt: „Genau darum geht es bei **ki sichtbarkeit website** in der Praxis.“
  - Beim Artikel zu Website-Kosten wiederholt sich die H1 wortgleich als erste H2, und der Slug enthält „2025“, obwohl der Artikel 2026 aktualisiert wurde.
- **Warum relevant:** Solche Signale lassen Inhalte als ungeprüfte KI-Texte erscheinen. Das widerspricht E-E-A-T und Googles Hinweisen zu skaliertem Content und schwächt die Zitierwürdigkeit.
- **Fix:** UTM-Parameter aus externen Links entfernen (im Publishing-Schritt automatisch strippen). Keyword-Phrasen natürlich formulieren. Doppelte H2 entfernen. Datums-Slug per 301 auf einen zeitlosen Slug umziehen.

#### M10: Kosten-Frage auf 6+ URLs verteilt (Passagen-Kannibalisierung)
- **Beleg:** „Was kostet eine Website?“ wird parallel beantwortet von `/pakete`, `/webdesign-berlin/kosten-preise-pakete`, `/ratgeber/website-kosten-berlin`, `/ratgeber/kosten-einfache-website` (373 Wörter, **nur 1 interner Inlink**, „Aktualisiert am 30.10.2025“, Preiszeile „Basis (aktueller Paketpreis)“ ohne Zahl im Text-Sample), `/ratgeber/website-kosten-zeitplan`, `/blog/website-kosten-2025-einfach-erklaert` und den Branchen-Kostenseiten.
- **Warum relevant:** Retrieval-Systeme wählen pro Anfrage meist *eine* Passage pro Domain. Viele fast gleiche Kostenseiten mit unterschiedlichen Datumsständen verwässern Signale und erhöhen das Risiko, dass eine veraltete Version zitiert wird.
- **Fix:** Eine kanonische Kostenseite festlegen (Empfehlung: `/webdesign-berlin/kosten-preise-pakete` oder `/ratgeber/website-kosten-berlin`), dünne bzw. veraltete Varianten (`/ratgeber/kosten-einfache-website`, `/ratgeber/website-kosten-zeitplan`, `/blog/website-kosten-2025-einfach-erklaert`) per 301 zusammenführen oder klar differenzieren (z. B. „laufende Kosten“, „Zeitplan“). Alle Preise aus einer einzigen Quelle rendern.

### LOW

#### L1: Satzlange Überschriften und wiederholter Marquee-Text
- **Beleg:** Die zweite H2 der Startseite ist ein ganzer Satz („Komplett Webdesign plant, gestaltet und betreut Websites … Shop.“), auf `/pakete` und `/en` ebenso. Die Highlight-Marquee („Individuelles Design · Keine Standard-Templates · …“) steht dreifach im HTML (`aria-hidden`, `views/partials/hero-highlight-marquee.ejs`) und taucht in jeder Roh-Text-Extraktion 3× auf.
- **Fix:** Unterzeile als `<p class="lead">` statt `<h2>`. Für die Marquee nur eine Gruppe im HTML ausliefern und die Duplikate per JS bzw. CSS klonen.

#### L2: `/faq` ist dünn und generisch
- **Beleg:** 293 Wörter, 5 allgemeine Fragen („Warum ist eine professionelle Website wichtig?“), Sie-Form, „Agentur“-Perspektive, 5 Bilder ohne Alt-Text. Die konkreten, starken FAQ stehen auf Startseite, `/webdesign-berlin` und `/leistungen/*`.
- **Fix:** `/faq` zum zentralen FAQ-Hub machen. Die konkreten Fragen nach Kategorien (Preise, Ablauf, Technik, Laufende Kosten, Rechtliches) bündeln und je Antwort auf die Detailseite verlinken. Alternativ auf `noindex` setzen bzw. per 301 auf eine bessere Seite umleiten.

#### L3: Keine Video- oder Multimedia-Inhalte trotz YouTube-Kanal
- **Beleg:** Auf keiner geprüften Seite gibt es `<video>` oder `<iframe>`. `sameAs` nennt `youtube.com/@KomplettWebdesign`. YouTube-Erwähnungen korrelieren laut Branchenstudien am stärksten mit KI-Zitaten (ca. 0,74).
- **Fix:** 2–3 kurze Videos (z. B. „Was kostet eine Website in Berlin?“, Referenz-Walkthrough „Zur alten Backstube“) auf YouTube veröffentlichen und auf `/ratgeber/website-kosten-berlin` bzw. der Referenzseite einbetten, jeweils mit `VideoObject`-Schema und Transkript.

#### L4: Bilder ohne Alt-Text auf `/pakete` (22/31) und `/about` (19/24)
- **Fix:** Inhaltsbilder beschreiben, dekorative Bilder mit `alt=""` (falls schon so, bleibt nur das Prüfen der Inhaltsbilder).

#### L5: Ratgeber-Kostentabelle unvollständig, Glitch in der Unterzeile
- **Beleg:** In der Tabelle `/ratgeber/website-kosten-berlin` fehlt die Zeile „Individuell ab 3.500 €“. Unterzeile und Meta-Description lauten „Website-Kosten in Berlin: **Preise 799 €**“ (vermutlich falsch ersetzter Preis-Token). `dateModified` = `datePublished` (25.04.2026), obwohl Preise seitdem gepflegt werden.
- **Fix:** Zeile ergänzen, Token-Text korrigieren („Preise ab 799 €“), `updated_at` bei Preisänderungen mitpflegen.

#### L6: Entität außerhalb der Website
- **Beleg:** Keine Wikidata-Entität und kein Wikipedia-Eintrag (für ein Einzelunternehmen erwartbar). `sameAs` verweist nur auf eigene Social-Profile.
- **Fix:** Verzeichnis- und Profil-Einträge mit einheitlicher NAP aufbauen (Bing Places, Apple Business Connect, Gelbe Seiten, IHK-/Branchenportale, Clutch/Sortlist/DesignRush, GitHub-Profil), Gastbeiträge oder Interviews in lokalen bzw. fachlichen Medien gewinnen, Reddit-/Forum-Präsenz mit hilfreichen Antworten (r/berlin, r/de_EDV) aufbauen. Erst danach lohnt sich eventuell ein Wikidata-Item (nur mit Belegen).

---

## Top 5 Maßnahmen mit höchster Wirkung

| # | Maßnahme | Wirkung | Aufwand |
|---|---|---|---|
| 1 | Entitäts-Absatz mit Namen, Ort, Gründungsjahr und Paketen unter die H1 der Startseite, plus Porträt und Link auf `/about` (H1) | hoch | 30 min |
| 2 | Artikel-Autorschaft auf `Person` `/#person` umstellen, sichtbare Byline und „Aktualisiert am“ (H3) | hoch | 1–2 h |
| 3 | `/about` mit `ProfilePage`/`Person`-Schema und `<main>`, „Agentur/wir/Sie“ auf `/about`, `/faq`, Blog und llms.txt vereinheitlichen (H2, H4) | hoch | 2–3 h |
| 4 | Lokale Entität: `ProfessionalService` + `address` + `hasMap` + `founder` + GBP in `sameAs`, `@id` vereinheitlichen, GBP-Pin prüfen (M2, M3) | mittel–hoch | 1–2 h |
| 5 | Echte `lastmod`-/`dateModified`-Werte statt `new Date()` (M1), abgeschnittene Blog-Titel und UTM-Links bereinigen (M4, M9) | mittel | 2–3 h |

**Quick Wins (unter 30 min):** llms.txt auf `www.` und Preise umstellen (M6) · FAQ-Antwort „Warum 799 €“ und „bei ab“ korrigieren (M8) · `#organization` → `/#organization` in `views/leistungen/show.ejs` (M2) · Title `/about` ändern (H2).

---

## Strukturierte Findings (für `audit-data.json`, Kategorie „AI Search Readiness“)

```json
{
  "category": "AI Search Readiness",
  "score": 64,
  "dimensions": {
    "citability": 62,
    "structural_readability": 72,
    "multimodal": 50,
    "authority_brand": 45,
    "technical_accessibility": 90
  },
  "platform_scores": {
    "google_ai_overviews_ai_mode": 66,
    "chatgpt_search": 58,
    "perplexity": 60,
    "bing_copilot": 58,
    "claude_search": 60
  },
  "crawler_access": {
    "Googlebot": "allowed", "Google-Extended": "allowed", "OAI-SearchBot": "allowed",
    "ChatGPT-User": "allowed", "GPTBot": "allowed", "Claude-SearchBot": "allowed",
    "Claude-User": "allowed", "ClaudeBot": "allowed", "PerplexityBot": "allowed",
    "Bingbot": "allowed (wildcard)", "Applebot": "allowed (wildcard)",
    "Applebot-Extended": "allowed (wildcard)", "CCBot": "allowed (wildcard)",
    "live_test": "HTTP 200, identical payload for all tested UAs"
  },
  "llms_txt": "present_outdated_non_canonical",
  "brand_presence": {"wikipedia": false, "wikidata": false, "youtube_channel": "exists_not_embedded", "reddit": "not_verified", "gbp_reviews": "5.0 / 5"},
  "rsl": "absent",
  "findings": [
    {"id": "GEO-H1", "severity": "High", "title": "Person hinter dem Angebot nur im JSON-LD, nicht im sichtbaren Startseitentext", "file": "views/index.ejs", "fix": "Entitäts-Absatz (Name, Ort, Gründungsjahr, Pakete) unter H1 + Porträt/Link /about"},
    {"id": "GEO-H2", "severity": "High", "title": "Widersprüchliche Selbstbeschreibung Agentur/wir/Sie vs. Einzelunternehmer/ich/du", "file": "views/about.ejs:52,82,84,213; controllers/mainController.js:428; /faq; public/llms.txt", "fix": "Einheitliche Entitätsformel auf allen Seiten"},
    {"id": "GEO-H3", "severity": "High", "title": "Blog/Ratgeber: author=Organization, keine sichtbare Byline", "file": "services/blogPostPresentationService.js:245; controllers/ratgeberController.js:193", "fix": "author → Person /#person, Byline + Aktualisiert-Datum"},
    {"id": "GEO-H4", "severity": "High", "title": "/about ohne JSON-LD und ohne <main>", "file": "views/about.ejs:1", "fix": "ProfilePage + Person-Schema, <main>, Alt-Texte"},
    {"id": "GEO-M1", "severity": "Medium", "title": "dateModified/lastmod = Abrufzeitpunkt", "file": "views/index.ejs:172-173; controllers/sitemapController.js:66,81,138,144,199; views/leistungen/show.ejs:125", "fix": "Echte Änderungsdaten verwenden"},
    {"id": "GEO-M2", "severity": "Medium", "title": "Organization-@id inkonsistent (#organization ohne Slash)", "file": "views/leistungen/show.ejs:33,49,53,94,107", "fix": "/#organization und /#website zentral definieren"},
    {"id": "GEO-M3", "severity": "Medium", "title": "Keine Adresse/hasMap/founder im Organization-Schema; Maps-Pin weicht von Impressum ab", "file": "views/index.ejs:80-119", "fix": "ProfessionalService + PostalAddress + hasMap + GBP in sameAs"},
    {"id": "GEO-M4", "severity": "Medium", "title": "Abgeschnittene Blog-Titel/Descriptions/Headlines", "file": "services/blogPostPresentationService.js:205,240; DB posts.meta_title", "fix": "Meta-Felder korrigieren, Kürzung auf Wortgrenze, headline aus post.title"},
    {"id": "GEO-M5", "severity": "Medium", "title": "/en nutzt deutsche WebPage-@id/URL/Beschreibung im Schema", "file": "views/index.ejs:142-149,164-173", "fix": "Sprachspezifische @id, url und Texte"},
    {"id": "GEO-M6", "severity": "Medium", "title": "llms.txt veraltet, Nicht-www-Links, keine Preise, nicht spec-konform", "file": "public/llms.txt", "fix": "www-URLs, Preise, Inhaber, llmstxt.org-Format, Auto-Datum"},
    {"id": "GEO-M7", "severity": "Medium", "title": "Wenig belegte/eigene Daten, viel Absicherungsprosa", "file": "views/index.ejs", "fix": "2-3 belegbare Fakten je Kernseite, Abgrenzungen bündeln"},
    {"id": "GEO-M8", "severity": "Medium", "title": "FAQ-Antwort 'Warum 799 €' beantwortet die Frage nicht; 'bei ab'", "file": "Startseiten-FAQ (faqEntries)", "fix": "Answer-First-Antwort formulieren"},
    {"id": "GEO-M9", "severity": "Medium", "title": "KI-Spuren im Blog: utm_source=openai, Keyword-Phrasen, doppelte H1/H2", "file": "Blog-Inhalte (DB)", "fix": "UTM strippen, Text redigieren"},
    {"id": "GEO-M10", "severity": "Medium", "title": "Kostenfrage auf 6+ URLs verteilt (Kannibalisierung, veraltete Varianten)", "file": "/ratgeber/kosten-einfache-website, /ratgeber/website-kosten-zeitplan, /blog/website-kosten-2025-einfach-erklaert", "fix": "Kanonische Kostenseite, Rest per 301 bündeln oder differenzieren"},
    {"id": "GEO-L1", "severity": "Low", "title": "Satz-H2 im Hero, Marquee 3x im HTML", "file": "views/index.ejs; views/partials/hero-highlight-marquee.ejs", "fix": "<p class=lead>, Marquee-Duplikate clientseitig"},
    {"id": "GEO-L2", "severity": "Low", "title": "/faq dünn und generisch", "file": "views/faq.ejs", "fix": "Zum FAQ-Hub ausbauen oder konsolidieren"},
    {"id": "GEO-L3", "severity": "Low", "title": "Keine eingebetteten Videos trotz YouTube-Kanal", "file": "-", "fix": "Videos + VideoObject + Transkript"},
    {"id": "GEO-L4", "severity": "Low", "title": "Fehlende Alt-Texte auf /pakete und /about", "file": "views/packages_list.ejs; views/about.ejs", "fix": "Alt-Texte ergänzen"},
    {"id": "GEO-L5", "severity": "Low", "title": "Ratgeber-Kostentabelle unvollständig, 'Preise 799 €'-Glitch", "file": "Ratgeber website-kosten-berlin (DB)", "fix": "Zeile Individuell ergänzen, Text korrigieren"},
    {"id": "GEO-L6", "severity": "Low", "title": "Keine Drittquellen-Entität (Wikidata/Verzeichnisse)", "file": "-", "fix": "Konsistente NAP-Verzeichnisse, PR, Community-Präsenz"}
  ]
}
```
