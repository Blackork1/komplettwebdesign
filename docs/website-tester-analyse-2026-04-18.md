---
title: Analyse der Website-Tester-Suite
datum: 2026-04-18
autor: Claude Opus 4.7 (für Sören Blocksdorf)
umfang: /website-tester, /website-tester/seo, /website-tester/geo, /website-tester/meta, /website-tester/broken-links
---

# Analyse der Website-Tester-Suite

## Zielbild (Kurzfassung)

Die Tester sollen organischen Traffic generieren, im Frontend einen kurzen, glaubwürdigen Teaser zeigen, per Double-Opt-in eine Mail-Adresse für die einfache Anleitung einsammeln und anschließend entweder eine Vollanleitung zustellen oder einen Beratungstermin anbahnen.

Die Gesamtqualität ist schon auf einem guten Niveau: Architektur, Rate-Limits, SSRF-Schutz und Double-Opt-in sind solide. Die Hebel für mehr Conversion und mehr Traffic liegen daher nicht im großen Rewrite, sondern in präzisen Korrekturen am Funnel, an der inhaltlichen Tiefe der Tester-Seiten und am Brückenschlag zwischen „Audit-Ergebnis" und „Terminbuchung bzw. Paket-Angebot". Ein paar echte Bugs und eine klare Code-Duplikation sollten ebenfalls aufgelöst werden.

Der Report ist nach Priorität sortiert (P0 = sofort, P1 = in den nächsten Wochen, P2 = mittelfristig, P3 = Nice-to-have) und thematisch in vier Blöcke unterteilt: Conversion-Funnel, Tester-Qualität/Genauigkeit, SEO/Traffic und Technik.

---

## P0 – Sofortige Maßnahmen

### P0-1 · Broken-Links-Tester hat kein Lead-Gate

Der Broken-Links-Tester ist der einzige von fünf Testern ohne E-Mail-Erfassung. Nutzer bekommen den vollständigen Scan-Report direkt auf der Seite, ohne dass ihre Adresse erfasst wird. Das ist inkonsistent zur übrigen Funnel-Logik und verschenkt die stärkste Traffic-Quelle (Suchbegriffe wie „broken link checker", „defekte Links finden" haben hohes Volumen).

- `views/broken_links_tester.ejs` zeigt das komplette Ergebnis in `.wt-results` ohne Teaser/Gate.
- `public/js/broken-links-tester.js` enthält keinen einzigen Aufruf an `/api/broken-link-audit/lead`.
- Im `testRouter.js` existiert kein Endpoint `/api/broken-link-audit/lead` – es ist also auch serverseitig nicht vorbereitet.

Empfehlung: Broken-Links-Tester genauso gaten wie SEO/GEO/Meta – Kurzergebnis (Anzahl Broken Links pro Kategorie, Top 3 betroffene Seiten) öffentlich, vollständige Linkliste + Handlungsplan nur nach Double-Opt-in. Dafür `brokenLinksTesterLeadService.js` analog zu `seoTesterLeadService.js` anlegen und den Route-Endpoint + Confirm-View ergänzen.

### P0-2 · Full-Guide-Generierung bricht bei SEO/GEO/Meta vermutlich

`testerFullGuideService.js` konsumiert `internalGuideInput`, das der Website-Audit-Service befüllt. SEO-, GEO- und Meta-Audit-Service produzieren dieses Feld nicht, sondern labeln nur das Website-Audit-Ergebnis um. Konsequenz: entweder fällt die Vollanleitung auf das generische Website-Audit zurück (dann ist sie für SEO/GEO/Meta-Leads thematisch falsch) oder sie scheitert stumm und der Lead erhält nie eine Vollanleitung.

Empfehlung: In `seoAuditService.js`, `geoAuditService.js` und `metaAuditService.js` jeweils ein `internalGuideInput` aufbauen, das die tester-spezifischen Kategorien, Top-Maßnahmen und Kontextdaten (businessType, primaryService, targetRegion) enthält. Parallel Logging hinzufügen, damit fehlgeschlagene Guide-Generierungen sichtbar werden (`full_guide_generation_failed`-Status kontrollieren).

### P0-3 · Booking-Link verliert den Audit-Kontext

Nach dem Audit zeigen SEO/GEO/Broken-Links-Tester Buttons „Beratung anfragen" → `/kontakt` und „Termin buchen" → `/booking`. Keine URL trägt den Audit-Score, die Domain oder die Top-Maßnahme mit. Der Nutzer tippt damit Domain + Problem noch einmal ins Kontaktformular – das ist der klassische Knick in der Micro-Conversion.

Empfehlung: Query-Parameter durchreichen, z. B. `/booking?src=seo-tester&domain=example.com&score=47`. Das Booking-Widget kann damit den Termin vorqualifiziert anlegen („SEO-Erstgespräch zu example.com, aktueller Score 47/100") und die Conversion-Rate auf Terminbuchung spürbar heben. Zusätzlich eine versteckte Form-Value im Kontaktformular vorausfüllen.

### P0-4 · Bug: kein Redirect-Limit im Broken-Link-Crawler

Der Website-Audit-Service begrenzt Redirects hart auf 5 (`services/websiteAuditService.js:498`). Im Broken-Link-Service fehlt diese Begrenzung für Subpage-Crawls. Ein bösartiger oder fehlkonfigurierter Zielserver kann damit den Scanner in eine Redirect-Schleife schicken, bis das Timeout greift – unnötiger Ressourcenverbrauch pro Request und zusätzlicher Vektor für DoS-ähnliche Last.

Empfehlung: Im Crawl-Loop von `services/brokenLinkAuditService.js` einen `maxRedirects`-Wert (max. 5) einführen, analog zur Website-Audit-Logik.

---

## P1 – Hoher Hebel für Conversion & Traffic

### P1-1 · Post-Confirm-Seite ist eine Sackgasse

`views/website_tester_confirm.ejs`, `seo_tester_confirm.ejs`, `geo_tester_confirm.ejs`, `meta_tester_confirm.ejs` zeigen nur eine Status-Meldung und einen Back-Link. An genau diesem Punkt ist das Vertrauen des Nutzers maximal (er hat gerade seine E-Mail bestätigt). Das ist der beste Moment für den nächsten Schritt, nicht für einen Back-Link.

Empfehlung:
- Direkt auf der Confirm-Seite einen einbettbaren Booking-Slot oder eine „15-Minuten-Erstgespräch"-CTA mit 1–2 Slots zeigen.
- Eine Preview-Kachel des Vollanleitungs-PDFs mit dem Titel seiner Domain einbauen („Deine SEO-Anleitung für example.com wird in den nächsten Minuten gesendet").
- Eine Liste von 2–3 verwandten Testern („Du hast SEO getestet – teste jetzt auch GEO") als Cross-Sell.
- Optional: Paket-Teaser aus `/pakete` mit einem auf den Score passenden Einstieg (Score < 40 → Relaunch-Paket, Score 40–70 → SEO-Paket, Score > 70 → GEO/Feinschliff-Paket).

### P1-2 · Keine Verlinkung aus Audit-Ergebnissen in die Service-Seiten

Die Tester verlinken in der Ergebnisdarstellung nur auf `/kontakt` und `/booking`. Auf die Verkaufsseiten `/pakete`, `/leistungen/*` und Branchenseiten wird nicht verwiesen – damit bleibt der stärkste interne Linkjuice der Seite ungenutzt und der Nutzer kennt die Angebote gar nicht.

Empfehlung:
- Im Ergebnispanel eine kontextsensitive Box „Nächster Schritt mit uns" einblenden, die abhängig vom Score zwei passende Pakete + eine Branchenseite vorschlägt (z. B. wenn `context.businessType === 'restaurant'` → `/branchen/restaurant`).
- Unterhalb der Tester-Seiten eine Sektion „Unsere SEO- & Webdesign-Pakete" mit 3 Karten.
- Für internes SEO: jeder Tester sollte die anderen vier Tester im Footer verlinken, und mindestens zwei Service-Pakete – das baut ein sauberes Cluster.

### P1-3 · Keine echte Differenzierung „Kurzanleitung ↔ Vollanleitung"

Aktuell liefert der Double-Opt-in-Flow sofort den PDF-Report und erzeugt asynchron die Vollanleitung. Der im Ziel beschriebene Split „erst Kurzanleitung per Mail → anschließend Vollanleitung" ist im Code nicht klar modelliert. Beide Artefakte werden nacheinander erzeugt; der Nutzer bekommt keine Drip-Sequenz, sondern einmal Report + einmal Vollanleitung. Damit ist der natürliche Re-Engagement-Moment verschenkt.

Empfehlung: Drip in drei Steps, zeitlich versetzt, pro Tester unterschiedliche Templates:
1. Sofort nach DOI: Kurzanleitung (5–7 klare Sofortmaßnahmen, stark gekürzt).
2. +48 h: Vollanleitung als PDF + konkreter Gesprächstermin-Link, personalisiert nach Score-Band (kritisch / mittel / gut).
3. +7 Tage: Case-Study oder Branchen-Proof + letzter Call-to-Action für ein Erstgespräch.

Schedule-Kette über den `schedule`-Skill bzw. `scheduled-tasks` MCP abbilden; dafür eine `lead_followup_jobs`-Tabelle mit `send_at`-Zeitpunkt anlegen.

### P1-4 · Score-Teaser zeigt zu viel oder zu wenig

Bei der aktuellen Ausgabe gibt es ein Balance-Problem:
- SEO/GEO/Meta: Score + Kategorien + einzelne Details sind öffentlich, „detaillierter Umsetzungsreport" ist gegated. Das reicht häufig, damit der Nutzer meint, „ok, ich weiß schon genug".
- Gleichzeitig wird der emotionale Hebel (was kostet dich das jetzt?) nicht genutzt.

Empfehlung:
- Score weiterhin öffentlich, aber: jede Kategorie zeigt nur *einen* Befund, die weiteren werden als „+4 weitere Optimierungen" geblurrt.
- Direkt neben dem Score ein Vergleich zur Branche einblenden („Score 47 – Durchschnitt im Bereich Gastronomie: 62"). Dafür im Ergebnis-Archiv eine Aggregat-Tabelle pflegen.
- Einen Sichtbarkeits-/Umsatz-Impact kommunizieren („Bei diesem Score verlierst du schätzungsweise X % deines möglichen organischen Traffics"), konservativ kalibriert.

### P1-5 · Mobile Form-Layout bricht wahrscheinlich

`.wt-context-grid` ist dreispaltig (Branche / Hauptleistung / Region). In den Templates ist kein Mobile-Breakpoint zu sehen; die Spalten liegen vermutlich in `public/website-tester.css`, aber der Broken-Links-Tester hat einen eigenen Mobile-Breakpoint nur für `.bl-meta-grid` – das heißt, die Mobile-Responsivität ist uneinheitlich.

Empfehlung: `.wt-context-grid`, `.wt-hero-grid` und `.wt-form-row` explizit in `public/website-tester.css` bei `max-width: 780px` zu einspaltigen Layouts kippen. Danach in echten Geräten testen (iPhone SE, mittleres Android). Das ist für die Conversion mobiler Nutzer (60–70 % des Traffics solcher Tester-Seiten) entscheidend.

### P1-6 · Content-Tiefe und Trust reichen nicht für Top-3-Rankings

Die Tester-Seiten haben jeweils ~220–300 Zeilen EJS, aber inhaltlich sind es eher knapp gehaltene Landingpages mit Formular + FAQ. Für umkämpfte Keywords wie „SEO check kostenlos" reichen die Seiten gegen direkte Tool-Konkurrenten (Seobility, PageSpeed Insights, SEORCH) nicht aus.

Empfehlung:
- Pro Tester einen eigenen Erklär-Block (500–800 Wörter) direkt unter dem Tester-Formular, der die Methodik auflistet („Wir prüfen 24 Signale in 6 Kategorien: …"), dazu ein Bild mit Beispiel-Report.
- 2–3 echte Proof-Elemente: Kunden-Logo-Leiste, Zitat eines Kunden, „X Websites bereits analysiert"-Counter (der tatsächlich aus den Archiv-Tabellen gezogen wird).
- Unten auf der Seite 3–5 interne Ratgeber-Artikel verlinken (aus `routes/ratgeberRoutes.js`), die das Thema vertiefen.
- Pro Tester ein eigenes, passendes OG-Bild (aktuell nutzen alle `/images/heroBg.webp` – das drückt die CTR bei Social Shares).

### P1-7 · FAQ-Schema ist eingebunden, aber die On-Page-FAQ-Section ist knapp

Der Controller rendert saubere FAQPage-Schemas (`testController.js:403`ff). Auf der Seite selbst sieht der Nutzer aber nur drei FAQ-Fragen pro Tester. Google nutzt die Rich-Snippets nur, wenn Schema und sichtbarer Content übereinstimmen; die Konkurrenz hat meist 8–12 Fragen.

Empfehlung: FAQ-Block pro Tester auf 8–10 Fragen erweitern und Schema entsprechend mitziehen. Die zusätzlichen Fragen idealerweise aus echten Kundenfragen / den Top-„People also ask"-Queries ziehen.

---

## P2 – Mittelfristig, strukturell

### P2-1 · Massive Code-Duplikation im Rate-Limiting und in der SEO-Extra-Generierung

`routes/testRouter.js` implementiert den gleichen Rate-Limiter 9-mal fast identisch (audit, lead, broken, geo, geo-lead, seo, seo-lead, meta, meta-lead). `controllers/testController.js` baut `buildSeoExtra`, `buildBrokenLinksSeoExtra`, `buildGeoSeoExtra`, `buildSeoTesterSeoExtra`, `buildMetaTesterSeoExtra` separat, obwohl die Funktionen zu 95 % identisch sind.

Empfehlung:
- Generischer Rate-Limiter als Factory: `createRateLimiter({ max, windowMs, label })`, dann je Endpoint einmal instanziieren.
- `buildTesterSeoExtra(base, canonical, copy, locale, appName)` – eine Funktion, der `appName` (z. B. „SEO Tester") übergeben wird; damit reduziert sich der Controller um ~500 Zeilen.
- Die drei quasi-identischen `__testables`-Exporte (`seoAuditService.js:295ff`, `geoAuditService.js:323ff`) konsolidieren.

### P2-2 · SEO- und GEO-Tester sind nur Umlabelung des Website-Testers

`seoAuditService.js` und `geoAuditService.js` rufen `auditWebsite()` aus dem Website-Service auf und mappen das Ergebnis lediglich mit Regex-Matching auf Label-Namen in neue Kategorien. Das hat zwei Folgen:

1. Tester-Qualität: Der GEO-Tester macht keine GEO-spezifische Prüfung. `entitySchemaScore` (`geoAuditService.js:147-152`) vergibt Punkte für Schema, robots.txt, sitemap.xml, HTTPS – das sind klassische SEO-Signale. Echte GEO/AIO-Signale (Entitäten-Konsistenz, semantische Nischen, prägnante Frage-Antwort-Blöcke, faktische Zitierbarkeit, LLM-Crawler-Zulassung wie `GPTBot`, `ClaudeBot`, `PerplexityBot` in robots.txt) werden nicht geprüft.
2. SEO-Kategorien sind vom Matching auf `detail.label` abhängig – ändert sich im Website-Audit-Service eine Label-Formulierung, rutschen Findings plötzlich aus der Kategorie.

Empfehlung:
- Für GEO eigene Prüfungen implementieren: Präsenz von `llms.txt`, robots-Zulassung für LLM-User-Agents, FAQ-Blöcke pro Seite, Organization- und Person-Schema, strukturierte „Q&A"-Inhalte, durchschnittliche Absatzlänge, Zitations-Dichte externer Quellen.
- Für SEO wenigstens zusätzlich noch Core-Web-Vitals-Proxies prüfen (Bild-Größen, Lazy-Loading, Render-Blocking Scripts) und strukturierte Daten tiefer validieren (Organisation, LocalBusiness, Product, FAQ, BreadcrumbList).
- Kategorien nicht per Label-Regex zuweisen, sondern im Website-Audit-Service ein `meta.categoryHints = ['seo.onpage', 'seo.technical', ...]` direkt an jedem Detail-Objekt pflegen.

### P2-3 · Audit-Caches wachsen unbeschränkt

`websiteAuditService.js` nutzt `Map` als `auditCache`. Cleanup läuft nur beim Zugriff – eine Instanz, die wochenlang läuft und mit wachsender Trefferquote seltener Cache-Misses erzeugt, kann dauerhaft Speicher halten. Das gilt für alle vier Caches (website, SEO, GEO, Meta).

Empfehlung: Entweder einen echten LRU-Cache (`lru-cache`-npm-Paket) oder einen stündlichen Interval-Sweep (`setInterval(cleanupCache, 60 * 60 * 1000)`). Max-Einträge z. B. 500, TTL wie bisher 24h.

### P2-4 · Rate-Limit nur im Router, nicht im Lead-Service

`testRouter.js` schützt die POST-Endpoints per IP. Die Lead-Endpoints POSTen aber Daten, die anschließend DOI-Mails auslösen. Zwar gibt es auch dort einen Rate-Limiter (`LEAD_RATE_LIMIT_MAX = 5`), doch an mehreren Stellen wird die IP aus `x-forwarded-for` ungesichert gezogen. Hinter einem Proxy, der keinen Header setzt oder einen falschen Header durchlässt, wird jede Request auf `'unknown'` gemappt – und alle Requests teilen sich denselben Rate-Limit-Eintrag. Das kann legitime Nutzer blocken oder einen Angreifer begünstigen, wenn die Proxy-Konfiguration wechselt.

Empfehlung: `app.set('trust proxy', …)` in `index.js` auf den tatsächlichen Proxy-Hop exakt setzen, dann konsequent `req.ip` nutzen. Zusätzlich ein Captcha (hCaptcha / Cloudflare Turnstile) hinter dem Lead-Endpoint; erst ab X Einträgen in kurzer Zeit aus derselben /24 aktivieren.

### P2-5 · Token-Verbrauch bei gleichzeitigen Klicks

Der DOI-Token wird in `confirmWebsiteTesterLeadToken` per `consumeWebsiteTesterLeadConfirmToken(tokenHash)` verbraucht. Wenn das nicht atomar in der DB geschieht (z. B. eine prüfende `SELECT`-Abfrage und ein separates `UPDATE`), kann ein Nutzer bei zweimal schnell hintereinander geklicktem Link zwei Reports / zwei Vollanleitungen triggern. Das ist zwar kein Security-Leck, aber unsauber und kann einen doppelten Newsletter-Eintrag erzeugen.

Empfehlung: Den Consume-Schritt als `UPDATE … WHERE status='pending' AND expires_at > NOW() AND consumed_at IS NULL` mit `RETURNING` oder `affectedRows` implementieren – nur wenn die Zeile tatsächlich aktualisiert wurde, den Report senden. Im Code von `confirmWebsiteTesterLeadToken` dafür eine Stelle ergänzen, die diese Idempotenz explizit testet.

### P2-6 · Beobachtbarkeit fehlt

Es gibt ein Archiv in der DB (`archiveWebsiteTesterRequest`, `archiveSeoAuditRequest`, …), aber keine sichtbaren Metriken oder ein Admin-Dashboard, das die Conversion-Schritte misst: Audit-Start → Audit-Erfolg → Lead-Versuch → DOI-Klick → Report gesendet → Booking / Kontaktaufnahme.

Empfehlung:
- Im Admin-Bereich eine einfache Funnel-Visualisierung je Tester + je Locale.
- Ereignis-IDs konsistent weiterreichen (auditId → leadId → bookingId), damit pro Lead nachverfolgt werden kann, an welcher Stelle er abbricht.
- PostHog, Plausible oder eigenes Logging (bleibt DSGVO-konform, solange keine personenbezogenen Daten im Event sind).

---

## P3 – Nice-to-have

### P3-1 · Einheitliche CTA-Attribute
Broken-Links-Tester nutzt `data-broken-links-cta`, die anderen `data-seo-cta`, `data-geo-cta`, `data-meta-cta`. Konsolidieren auf `data-tester-cta="seo|geo|meta|broken|website"` + `data-tester-action="booking|contact|newsletter"` – vereinfacht Analytics-Events.

### P3-2 · Eigene OG-Bilder pro Tester
Alle fünf Tester nutzen `heroBg.webp` als OG-Bild (Controller-Default). Ein individualisiertes Bild pro Tester (1200×630) mit „SEO-Tester" / „GEO-Tester" etc. hebt Social-CTR spürbar.

### P3-3 · Pro Tester eigener Locale-Fallback statt globaler Default-Message
Error-Messages im Controller wechseln teils manuell zwischen DE/EN (`'Der SEO-Audit konnte nicht …'`). Ein kleiner i18n-Helper (`t('tester.seo.error', locale)`) räumt auf und reduziert Tippfehler-Risiko.

### P3-4 · Hardcoded Pixel-Breiten-Tabelle im Meta-Tester
`metaAuditService.js:54-104` hat eine handkuratierte Zeichen-Pixel-Tabelle. Quelle undokumentiert, Pflege aufwendig. Alternativ: Eine bekannte Library (z. B. `@segment/string-pixel-width` oder Google-eigene Tools zur Breitenmessung, ggf. serverseitig mit Canvas-Rendering via `canvas`-Paket) einsetzen oder die Tabelle mit Quelle + letztem Check-Datum kommentieren.

### P3-5 · robots.txt / sitemap-Hinweise im Footer der Tester
Kleiner Trust-Boost: unten auf der Tester-Seite den Hinweis „Wir respektieren robots.txt, crawlen max. X Unterseiten, Timeout 45 s" (Informationen gibt es schon auf `test.ejs:35-39`) – kann man auch auf die anderen Tester übertragen, damit der Nutzer Vertrauen in den Scanner gewinnt.

### P3-6 · Memory-Feature der Tester ausbauen
Aktuell kann ein angemeldeter / wiederkehrender Nutzer seine früheren Scans nicht sehen. Ein „Mein Tester-Verlauf" unter dem bestehenden Auth-Flow wäre ein sehr niedriger Eingriff (es gibt schon `auditId`-basierten Cache) und erzeugt Wiederkehrer.

---

## Was bereits gut ist (Bestandsschutz)

Bevor ihr anfangt, nicht kaputt machen, was funktioniert – diese Punkte sind solide und sollten nicht refaktoriert werden:

- **SSRF-Schutz**: Blocked-Hostnames-Liste, private-IP-Check via `ipaddr.js`, Schema-Allow-List `http/https`, DNS-Auflösung vor Fetch. Das ist saubere Arbeit.
- **DOI-Token**: UUID + 16 Random-Bytes, SHA-256-Hash, 24 h Ablauf, Single-Use. Kryptografisch in Ordnung.
- **hreflang + Structured Data**: Die fünf `build*SeoExtra`-Funktionen injizieren korrekt `hreflang`, `x-default`, `FAQPage`, `WebApplication`, `Breadcrumb` und `WebSite`-Schema. Das Partial `partials/head.ejs` rendert `seoExtra` unescaped via `<%-`, d. h. die Schemas kommen tatsächlich im HTML an.
- **Sitemap-Priorisierung**: `/website-tester` = 1.0, Sub-Tester = 0.85–0.9 (`sitemapController.js:116-123`). Richtig gewählt.
- **Deadline-basierter Crawl**: `AUDIT_TIMEOUT_MS = 45s`, `REQUEST_TIMEOUT_CAP_MS = 12s`, partielle Ergebnisse werden sauber als partiell gekennzeichnet.
- **Archivierung**: Erfolg- und Fehlerpfade schreiben beide in die DB (`archiveWebsiteTesterRequest(… status: 'success'/'error' …)`) – das ist die Grundlage für künftige Conversion-Analysen.

---

## Vorgeschlagene Roadmap

**Woche 1 (alles P0)**
- Broken-Links-Lead-Gate ergänzen (P0-1)
- Booking-Link mit Audit-Kontext anreichern (P0-3)
- Redirect-Limit im Broken-Link-Crawler (P0-4)
- `internalGuideInput` in SEO-/GEO-/Meta-Service befüllen (P0-2)

**Woche 2–3 (Conversion-Hebel)**
- Post-Confirm-Seite zum aktiven Conversion-Step ausbauen (P1-1)
- Audit-Ergebnisse → Service-Seiten verlinken (P1-2)
- Drip-Sequence Kurz → Voll → Proof (P1-3)
- Teaser-Gating feinjustieren, Branchen-Benchmark integrieren (P1-4)
- Mobile-Layout auf allen Testern reparieren (P1-5)

**Woche 4–6 (Traffic-Hebel)**
- Content-Tiefe pro Tester-Seite ausbauen, FAQ erweitern (P1-6, P1-7)
- Eigene OG-Bilder pro Tester (P3-2)

**Woche 7+ (strukturell / technische Schuld)**
- Code-Duplikation auflösen (P2-1)
- GEO- und SEO-Tester mit eigenen Prüfungen versehen (P2-2)
- Cache-Eviction, Proxy-Config, atomarer Token-Consume (P2-3 bis P2-5)
- Conversion-Funnel-Dashboard (P2-6)

---

## Offene Fragen an dich

1. Läuft der Server hinter einem Reverse Proxy? Wenn ja, welchem und wie ist `trust proxy` gesetzt? (relevant für P2-4).
2. Wie wird die Vollanleitung aktuell zugestellt – automatisch per Mail oder manuell aus dem Admin? (relevant für P0-2 und P1-3).
3. Gibt es eine bestehende Case-Study / Kunden-Zitate, die in den Funnel eingebaut werden können? (relevant für P1-6).
4. Welches Booking-Tool läuft unter `/booking` (eigenes Widget, Cal.com, Calendly)? Das bestimmt, wie Query-Parameter übergeben werden. (relevant für P0-3).

---

*Stand: 2026-04-18 – Analyse ohne Code-Änderungen. Empfehlungen sind priorisiert, konkrete Umsetzung folgt nach deinem Go.*
