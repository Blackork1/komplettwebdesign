# Content-Architektur, Themencluster & interne Verlinkung – komplettwebdesign.de

**Stand:** 23.10.2026 · **Bereich:** Content Architecture (Semantisches Clustering, Kannibalisierung, Hub/Spoke, interne Links)
**Geschäftsziel als Bewertungsmaßstab:** Anfragen von kleinen Unternehmen in Berlin (Einzelunternehmer-Webdesigner, Pakete ab 799 €)

**Datenbasis**
- `raw/crawl.json` (197 gecrawlte URLs; Titel, H1, Textanfang, interne Links, Inlink-Zahlen, Sitemap-Status)
- Repository (nur gelesen): `data/seoIntentRegistry.js`, `data/contentAgentLinks.js`, `data/seoGuideCluster.js`, `data/addOns.js`, `docs/seo/*` (Seiteninventar und Redirect-Entscheidungsmappe vom 26.07.2026, Keyword-Map-CSV, 90-Tage-Plan)
- Live-Stichprobe des Artikeltexts (ohne Navigation) für 2 Blogposts (`/blog/website-relaunch-seo-ohne-sichtbarkeitsverlust-planen`, `/blog/local-seo-berlin-2026-website-profilsignale`) und `/blog/webdesign-lichtenberg-berlin`
- SERP-Overlap für 12 Kern-Keywords (WebSearch, Top-Ergebnisse, URL-normalisiert)

**Einschränkungen**
- Navigationslinks und Textlinks lassen sich im Crawl nicht trennen. Alle 12 Leistungsseiten, `/webdesign-berlin/kosten-preise-pakete`, `/ratgeber`, `/blog`, `/branchen` und `/referenzen` stehen im Mega-Menü bzw. Footer (rund 190–195 Inlinks). Als „kontextuell“ zählen deshalb nur Links, die nicht seitenweit vorkommen, sowie Links, die im Quelltext (`seoGuideCluster.js`) oder in der Live-Stichprobe belegt sind.
- WebSearch ist **nicht auf Berlin/DE lokalisiert**. Die Overlap-Werte sind deshalb Untergrenzen und als Richtungssignal zu lesen. Vor jeder Weiterleitung müssen sie mit GSC-Query→URL-Daten oder einem lokalisierten SERP-Abruf (Berlin, `de`) geprüft werden, so wie es das bestehende R-Gate-Verfahren aus `docs/seo/2026-07-26-redirect-entscheidungsmappe.md` verlangt.
- Suchvolumina lagen nicht vor. Die Wahl der Pillars stützt sich auf Intention, SERP-Typ und Geschäftsrelevanz.
- 43 eindeutige Blogartikel. Die im Briefing genannten 46 Blog-URLs enthalten Encoding-Dubletten (`Scoll-Snapp-Galery…` und `website-checkliste-für-selbstandige`, je zweimal gecrawlt).

---

## 1. Kurzfazit

| Kennzahl | Wert | Bewertung |
|---|---|---|
| Blogartikel ohne kontextuellen Inlink (nur über Blog-Pagination erreichbar) | **35 von 43 (81 %)** | kritisch für Crawl-Tiefe und Themenautorität |
| Ratgeberartikel mit nur 1 Inlink (Ratgeber-Hub) | 4 von 12 | Dubletten und Altlasten |
| Branchenseiten nicht in der Sitemap / mit nur 1 Inlink | **11 von 16 / 12 von 16** | Branchen-Cluster faktisch verwaist |
| Leistungs-/Paket-/Money-Seiten (ohne Bezirke) ohne einen einzigen Link zu Ratgeber/Blog | **11 von 18** | der Rückkanal fehlt |
| Ratgeber/Blog → Paket-Detailseite (`/pakete/start|business|wachstum`) | 2 Seiten von 55 | kürzester Weg zur Anfrage bleibt ungenutzt |
| Blog → Ratgeber (Pillar) | **0** | keine Spoke→Pillar-Links |
| Kannibalisierungsgruppen (gleiche Intention, mehrere URLs) | **10** (2 Critical) | – |
| Klar themenferne Blogposts | 6 (+6 Randthemen) | – |

**Kernaussage:** Fast jede Themeninsel hat Inhalte, aber keine Struktur. Leistungsseiten, Ratgeber und Blog laufen nebeneinander her, statt Hub und Spokes zu bilden. Zu den beiden wichtigsten kommerziellen Intentionen („Website erstellen lassen Berlin“ sowie „Kosten/Preise“) konkurrieren jeweils 4 bis 9 eigene URLs miteinander. Die Ursache ist teils technisch: Der Content-Agent darf nur 9 feste Linkziele setzen (`data/contentAgentLinks.js`) und kann deshalb keine Geschwisterartikel verlinken. Der im Juli geplante Schritt „intern_integrieren“ (23 URLs) ist laut Crawl vom Oktober **nicht umgesetzt**.

---

## 2. Was gut funktioniert

1. **Intent-Registry mit Kollisionsprüfung** (`data/seoIntentRegistry.js`, `findActiveIntentCollisions`). Das ist ein starkes Steuerungsinstrument. Es deckt aber nur 15 URLs ab und sollte auf alle indexierbaren Inhalte ausgeweitet werden (siehe H-2).
2. **Klarer Money-Hub `/webdesign-berlin`** (2.318 Wörter, 169 Inlinks). Er verlinkt alle 6 Bezirksseiten, alle Pakete, 4 Branchen und 2 Referenzen.
3. **Funktionierender Mini-Cluster „SEO Guide Cluster“** (`data/seoGuideCluster.js`). Sechs Evergreen-Ratgeber verlinken sich gegenseitig, und alle 6 Bezirksseiten verlinken 4 davon. Ergebnis: 13–22 Inlinks je Artikel, die beste interne Vernetzung im Inhaltsbereich.
4. **Neuere Blogposts (2026) verlinken im Text auf Leistungen.** In der Live-Stichprobe sind Links auf `/leistungen/website-audit`, `/leistungen/website-relaunch`, `/leistungen/local-seo`, `/webdesign-berlin` und `/website-tester` belegt. Der Weg Blog → Leistung funktioniert damit grundsätzlich.
5. **Conversion-Pfade sind vorbereitet.** Paket-Detailseiten führen auf vorausgefüllte Anfragen (`/kontakt?paket=business` usw.), Leistungsseiten auf `/kontakt?projektart=…`.
6. **Branchenseiten verlinken einheitlich auf die Pakete** Start, Business und Wachstum.
7. **Website-Tester als Top-Funnel-Werkzeug** mit definierter Weiterleitung zum Website-Audit (Registry: `/website-tester` → `/leistungen/website-audit`).
8. **Referenzen sind an Leistungen angebunden:** `/leistungen/website-relaunch` → `/referenzen/tm-sauber-mehr`.

---

## 3. Ist-Cluster (Bestandsaufnahme)

| Themeninsel | Hub (Ist) | Inhalte (Ist) | Hub↔Spoke-Verlinkung |
|---|---|---|---|
| **Website erstellen lassen Berlin** | `/webdesign-berlin` | `/`, `/webdesign-kleine-unternehmen-berlin`, 6 Bezirke, `/ablauf`, `/ratgeber/website-erstellen-berlin-ablauf-dauer-kosten`, `/blog/full-service-webdesign-in-berlin`, `/blog/webdesign-berlin-warum-eine-website-…`, `/blog/webdesign-lichtenberg-berlin` | Hub → Bezirke ✔; Hub → Ratgeber ✘; Hub → Kleine-Unternehmen-Seite ✘ |
| **Kosten & Pakete** | unklar (`/pakete` *und* `/webdesign-berlin/kosten-preise-pakete`) | 3 Kosten-Ratgeber, 2 Kosten-Blogposts, `/leistungen/laufende-kosten-website`, 2 Branchen-Kostenseiten, 4 Paket-Details | zwei konkurrierende Hubs |
| **Relaunch & Audit** | `/leistungen/website-relaunch` | `/ratgeber/website-relaunch-berlin`, 5 Relaunch-/Audit-Blogposts, `/leistungen/website-audit`, `/website-tester`, `/ratgeber/homepage-checker-website-check` | Leistung → Inhalte ✘; Ratgeber → Leistung ✘ |
| **Local SEO & KI-Sichtbarkeit** | `/leistungen/local-seo` | 5 Local-SEO/GBP-Posts, `seo-fuer-blumenladen`, 2 SEO-Ratgeber, 6 KI-Posts, `/website-tester/geo` | Leistung → Inhalte: nur Blumenladen; kein Info-Pillar |
| **Branchen** | `/branchen` | 16 Branchenseiten, `/handwerker`, 2 Branchen-Ratgeber, 3 Branchen-Blogposts, 2 Branchen-Kostenseiten, 3 Referenzen | Hub → alle ✔; Rückweg und Querverbindungen ✘ |
| **Webdesign-Grundlagen** | `/blog/was-ist-webdesign-11-woechiger-guide` | Woche 1–5 | Serie intern verlinkt ✔ (Woche 5 vom Guide ✘) |
| **Themenfern** | – | Scroll-Snap, Container Queries, 3D/WebGL, AI-Native, ChatGPT-Agent, WordPress 6.8 | – |

---

## 4. SERP-Overlap (12 Kern-Keywords)

Gezählt wurden gemeinsame URLs in den Top-Ergebnissen. Schwellen: 7–10 = gleicher Beitrag, 4–6 = gleicher Cluster, 2–3 = verlinken, 0–1 = getrennt.

| # | Keyword | Intention | SERP-Typ |
|---|---|---|---|
| K1 | website erstellen lassen berlin | transaktional-lokal | Anbieter, Ratgeber von Anbietern |
| K2 | webdesign berlin | transaktional-lokal | Agenturen, Verzeichnisse |
| K3 | webdesign für kleine unternehmen berlin | transaktional-lokal | KMU-Agenturen, Verzeichnisse |
| K4 | was kostet eine website in berlin | informational | lange Kostenratgeber (Blog) |
| K5 | webdesign preise berlin | kommerziell | Preisportale, Verzeichnisse, Preisrechner |
| K6 | website kosten kleines unternehmen | informational (bundesweit) | Ratgeber, Hoster |
| K7 | website relaunch berlin | gemischt (News/kommerziell) | Relaunch-Meldungen, Ratgeber |
| K8 | website relaunch checkliste seo | informational | Checklisten |
| K9 | local seo berlin | kommerziell | Agenturen, Tools |
| K10 | google unternehmensprofil optimieren tipps | informational | Anleitungen |
| K11 | homepage baukasten oder webdesigner | kommerziell-vergleichend | Vergleiche, Medien |
| K12 | homepage check kostenlos website testen | Tool | Tools, Checks |

**Paare mit Überschneidung (alle anderen 0):**

| Paar | Overlap | Gemeinsame URL | Folgerung |
|---|---|---|---|
| K1 ↔ K5 | 2 | kopfundstift.de/webdesign-berlin, kopfundstift.de/?p=16046 | verlinken; kommerziell-lokal |
| K2 ↔ K5 | 2 | kopfundstift.de/webdesign-berlin, dasoertliche.de (Seite 16) | verlinken |
| K1 ↔ K2 | 1 | kopfundstift.de/webdesign-berlin | **Eine** starke Hub-URL rankt bei Wettbewerbern für K1, K2 und K5 → ein Hub genügt |
| K1 ↔ K4 | 1 | strato.de/…/website-erstellen-lassen-berlin | getrennt |
| K2 ↔ K3 | 1 | pinpointdigital.com | „kleine Unternehmen“ verändert die SERP → eigener Spoke gerechtfertigt |
| **K4 ↔ K5** | **0** | – | **Kosten-Info und Preisseite sind zwei Intentionen → zwei Seiten, nicht neun** |
| K4 ↔ K6 | 0 | – | Berlin-Kostenratgeber und bundesweiter Kostenratgeber getrennt (in GSC beobachten) |
| **K7 ↔ K8** | **0** | – | Relaunch-Leistung und Relaunch-Checkliste sind getrennte Seiten (korrekt). Die Checkliste braucht aber **eine** Seite statt drei |
| **K9 ↔ K10** | **0** | – | Local-SEO-Leistung und GBP-Anleitung getrennt → GBP-Anleitung als eigener Spoke |
| K11 ↔ K12 | 0 (gleiche Domain t3n.de) | – | getrennt |

Übereinstimmungen nur auf Domain-Ebene (zweites Signal): K1/K11 selbststaendigkeit.de, K1/K10 sellwerk.de, K11/K12 t3n.de.

---

## 5. Findings

### K-1 · **Critical** · Money-Keyword „Website erstellen lassen (in) Berlin“ besetzt vier H1 und sechs Titles

**Beleg (crawl.json, H1):**

| URL | H1 | Title |
|---|---|---|
| `/` | Website erstellen lassen in Berlin – persönlich, SEO-freundlich und aus einer Hand | Komplett Webdesign Berlin \| Websites für kleine Unternehmen |
| `/webdesign-berlin` | Website erstellen lassen in Berlin | Website erstellen lassen Berlin \| Webdesign & Preise |
| `/pakete` | Website erstellen lassen in Berlin: Pakete ab 799 € | Website-Pakete und Preise ab 799 € \| Berlin |
| `/ratgeber/website-erstellen-berlin-ablauf-dauer-kosten` | Website erstellen lassen in Berlin: Ablauf, Dauer und Kosten | (identisch) |
| Bezirke Friedrichshain, Kreuzberg, Charlottenburg, Prenzlauer Berg, Lichtenberg, Mitte | – | „… \| Website erstellen lassen (Berlin)“ |

- Laut Registry ist die Phrase `/webdesign-berlin` zugeordnet (`primaryQuery: 'website erstellen lassen berlin'`).
- GSC-Ausgangslage vom Juli 2026: `/webdesign-berlin` auf Position 94, gesamte Property 0 Klicks (Redirect-Entscheidungsmappe).
- SERP: Bei Wettbewerbern rankt eine einzige Hub-URL für K1, K2 und K5. Vier eigene URLs mit demselben H1 teilen die Signale auf.

**Empfehlung**
- `/`: H1 auf Marke und Nutzen ohne die Money-Phrase umstellen, z. B. „Komplett Webdesign – dein persönlicher Webdesigner für Berliner Betriebe“. Laut Registry gehört die Startseite der Marke.
- `/pakete`: H1 „Website-Pakete & Preise für kleine Unternehmen“.
- Ratgeber: H1 „Ablauf & Dauer: So läuft ein Website-Projekt ab“, damit die informationale Absicht klar ist.
- Bezirks-Titles: „Webdesign {Bezirk} \| Websites für Betriebe im Kiez“, also ohne den Zusatz „Website erstellen lassen Berlin“.
- Alle genannten URLs mit eigener `intentId` in `seoIntentRegistry.js` eintragen. Dann meldet `findActiveIntentCollisions` künftige Überschneidungen automatisch.

### K-2 · **Critical** · Kosten-/Preis-Intention auf 9 URLs verteilt, zwei interne Dokumente nennen unterschiedliche Owner

**Beleg**

| URL | H1 / Title | Wörter | Inlinks |
|---|---|---|---|
| `/pakete` | T: „Website-Pakete und Preise ab 799 € \| Berlin“ | 840 | 157 |
| `/webdesign-berlin/kosten-preise-pakete` | H1: „Webdesign Preise in Berlin: Was kostet eine Website?“ · T: „Webdesign Preise Berlin \| Website-Pakete ab 799 €“ | 1.784 | 195 |
| `/ratgeber/website-kosten-berlin` | H1: „Was kostet eine Website in Berlin?“ | 727 | 22 |
| `/ratgeber/website-kosten-zeitplan` | „Website-Kosten 2025 & realistischer Zeitplan“ | 432 | **1** |
| `/ratgeber/kosten-einfache-website` | „Kosten einer einfachen Website – Beispiele & Checkliste“ | 373 | **1** |
| `/blog/website-kosten-2025-einfach-erklaert` | „Website-Kosten einfach erklärt (für Selbstständige)“ | 735 | 4 |
| `/blog/festpreis-website-pakete-berlin-und-brandenburg` | „Festpreis-Websites für Berliner KMU“ | 493 | 1 |
| `/webdesign-cafe/kosten` | „Café-Website: Kosten & 4-Wochen-Zeitplan“ | 309 | 1 |
| `/webdesign-blumenladen/kosten` | „Blumenladen-Website: Kosten & 4-Wochen-Zeitplan“ | 321 | 1 |

- Registry: `/pakete` → `primaryQuery: 'webdesign preise berlin'`.
- Keyword-Map (`docs/seo/seo-keyword-map-berlin.csv`): `/webdesign-berlin/kosten-preise-pakete` → „website kosten berlin“ mit Nebenkeyword **„webdesign preise berlin“**. Die beiden Dokumente widersprechen sich.
- Die Titles von `/pakete` und `/webdesign-berlin/kosten-preise-pakete` sind fast gleich, ebenso die H1 von `kosten-preise-pakete` und `/ratgeber/website-kosten-berlin`.
- SERP K4 ↔ K5 = 0: Das Thema umfasst zwei Intentionen, eine informationale und eine kommerzielle.
- Laut Spezifikation vom Juli erzeugen Kosteninhalte einen großen Anteil der Impressionen. Das ist der Bereich mit der größten Hebelwirkung.

**Empfehlung (2+1-Modell, Weiterleitungen nur über das R-Gate-Verfahren)**

| Intention | Owner | Maßnahme |
|---|---|---|
| webdesign preise berlin / website pakete (kommerziell) | `/pakete` | bleibt; H1 siehe K-1 |
| was kostet eine website in berlin / website kosten berlin (informational, Berlin) | `/webdesign-berlin/kosten-preise-pakete` | Title auf „Was kostet eine Website in Berlin? Kosten, Beispiele & laufende Kosten“ ändern („Webdesign Preise“ streichen). `/ratgeber/website-kosten-berlin`, `/ratgeber/website-kosten-zeitplan` und `/ratgeber/kosten-einfache-website` per 301 hierher zusammenführen, Inhalte übernehmen. Auf 2.500+ Wörter ausbauen (Pillar). |
| website kosten (bundesweit, Selbstständige) | `/blog/website-kosten-2025-einfach-erklaert` (Registry-Owner) | bleibt; Fokus „Kostenmodelle für Selbstständige“ schärfen; auf den Berlin-Pillar verlinken |
| Festpreis | → `/pakete` | 301 nach dem R-Gate (493 Wörter, 1 Inlink) |
| Branchen-Kosten | → `/branchen/webdesign-cafe` bzw. `/branchen/webdesign-blumenladen` | als Abschnitt „Kosten & Zeitplan“ integrieren, danach 301 |

- Keyword-Map-CSV durch die Registry ersetzen, damit es nur eine verbindliche Quelle gibt (siehe L-5).
- Falls die Ratgeber-URL als Owner bevorzugt wird: Variante mit umgekehrter Richtung. Entscheidend ist **ein** Owner für die Info-Intention.

### H-1 · **High** · 81 % der Blogartikel ohne kontextuellen Inlink, Integrationsplan vom Juli nicht umgesetzt

**Beleg**
- 35 von 43 Blogartikeln erhalten Links nur aus der Blog-Pagination (`/blog`, `?page=2–5`) bzw. drei davon zusätzlich vom Ratgeber-Hub.
- Einen kontextuellen Inlink haben nur: `seo-fuer-blumenladen` (von `/leistungen/local-seo` und `/branchen/webdesign-blumenladen`), `website-kosten-2025-einfach-erklaert` (von `/leistungen` und `/leistungen/laufende-kosten-website`), `immobilienmakler-website-erstelle` (von der Branchenseite) sowie die Webdesign-Serie Woche 1–4 mit Guide.
- Das Seiteninventar vom 26.07.2026 markiert 23 Posts mit `intern_integrieren` („Zwei passende kontextuelle interne Links planen und umsetzen“). Im Crawl vom Oktober haben alle 23 weiterhin `inlink_count: 1`.
- Ältere Posts landen bei 43 Artikeln auf den Seiten 4–5 der Pagination. Das ergibt eine Klicktiefe von 5–6.

**Empfehlung:** Die Link-Tabelle in Abschnitt 8 umsetzen (Pflichtlinks Hub ↔ Spoke). Jeder behaltene Post bekommt mindestens 3 kontextuelle Inlinks, davon einen vom Pillar oder der Leistungsseite und zwei von Geschwisterartikeln.

### H-2 · **High** · Ursache im Code: Der Content-Agent kennt nur 9 feste Linkziele

**Beleg:** `data/contentAgentLinks.js` enthält nur `/kontakt`, `/pakete`, `/webdesign-berlin`, `/leistungen/website-relaunch`, `/leistungen/local-seo`, `/leistungen/website-audit`, `/leistungen/landingpage-erstellen-lassen`, `/branchen/webdesign-blumenladen` und `/website-tester`.

Das hat drei Folgen:
- Kein 2026er-Post verlinkt einen Geschwisterartikel, einen Ratgeber-Pillar oder eine Paket-Detailseite.
- **Blumenladen ist das einzige erlaubte Branchenziel.** Deshalb verlinken auch themenfremde Posts auf „Webdesign für Blumenläden“: `website-relaunch-seo-ohne-sichtbarkeitsverlust-planen`, `relaunch-wegen-ki-suche`, `website-audit-relaunch-kmu-berlin-brandenburg`, `google-unternehmensprofil-website-*` (2×) und `ki-suche-webdesign-2026` (Crawl-Zeilen 9949, 14421, 14557, 14693, 14835, 14971; live bestätigt).
- Die Registry (`getSeoRecoveryTarget`) liefert Kontext-Links nur für 15 URLs.

**Empfehlung**
- `CONTENT_AGENT_LINKS` in eine **clusterbezogene Linkkarte** umbauen: `{ cluster, pillar, commercialHub, siblings[], package }`.
- Der Agent setzt dann pro Post Pflichtlinks auf Pillar und Leistungs-Hub, 2 Geschwister-Links und einen Paket-Link. Branchenlinks nur, wenn der Post die Branche tatsächlich behandelt.
- Die Registry auf alle indexierbaren Inhalte erweitern (`intentId`, `cluster`, `requiredLinks`).

### H-3 · **High** · Rückkanal fehlt: Leistungs- und Paketseiten verlinken kaum Inhalte, Ratgeber kaum konkrete Leistungen

**Beleg (Links außerhalb der Navigation)**

| Richtung | Ist |
|---|---|
| 18 Money-Seiten (Leistungen, Pakete, Hubs, ohne Bezirke) → Ratgeber/Blog | 7 Links von 7 Seiten. **Ohne Inhaltslink:** `/webdesign-berlin`, `/leistungen/website-relaunch`, `/leistungen/website-audit`, `/leistungen/landingpage-erstellen-lassen`, `/leistungen/website-wartung`, `/leistungen/zusatzleistungen-webdesign`, `/pakete`, alle 4 Paket-Details, `/webdesign-kleine-unternehmen-berlin` |
| Ratgeber (6 im Quelltext) → konkrete Leistungsseite | **0**. Einziges Money-Ziel ist `/webdesign-berlin` (1×, im Artikel „Ablauf“). `/ratgeber/website-relaunch-berlin` verlinkt nur `/website-tester`, `/kontakt` und `/ratgeber/website-kosten-berlin`, **nicht** `/leistungen/website-relaunch` |
| Ratgeber/Blog → Paket-Details | 2 Seiten (`/ratgeber/website-kosten-zeitplan`, `/blog/website-checkliste-für-selbstandige`) |
| Blog → Ratgeber | **0** |
| Branchen → passender Branchen-Ratgeber | 0; alle 16 verlinken nur den generischen Ratgeber `/ratgeber/seo-zielgruppen-content-marketing` |
| Bezirke → Ratgeber | ✔ je 4 Links (positiv) |

**Empfehlung:** Jede Leistungsseite bekommt einen Abschnitt „Weiterlesen“ mit dem Pillar und 2–3 Spokes ihres Clusters (konkret in Abschnitt 8). Jeder Ratgeber verlinkt seine Leistungsseite und das passende Paket im Fließtext.

### H-4 · **High** · Relaunch-Cluster: 9 URLs ohne Hub-Struktur, drei Checklisten konkurrieren

**Beleg**
- Kommerziell: `/leistungen/website-relaunch` (1.869 W.), `/pakete/wachstum` (H1 „… für umfangreichere Websites und Relaunches“).
- Info: `/ratgeber/website-relaunch-berlin` (662 W.), `/blog/website-relaunch-berlin-checkliste` (2.248 W., 0 Textlinks außer Navigation), `/blog/website-relaunch-seo-ohne-sichtbarkeitsverlust-planen` (2.197), `/blog/website-relaunch-inhalte-nicht-loeschen-2026` (2.283), `/blog/website-audit-relaunch-kmu-berlin-brandenburg` (2.371), `/blog/relaunch-wegen-ki-suche` (2.253).
- Die Leistungsseite verlinkt keinen dieser Inhalte. Kein Post verlinkt einen anderen.
- Die SERP K8 (Relaunch-Checkliste SEO) ist eine einzige Checklisten-SERP. „Checkliste“, „ohne Sichtbarkeitsverlust“ und „Inhalte nicht löschen“ behandeln alle Seiteninventur, Weiterleitungen und Inhaltsübernahme.

**Empfehlung**
- `/ratgeber/website-relaunch-berlin` zum Info-Pillar ausbauen (2.500–3.000 W.).
- `website-relaunch-inhalte-nicht-loeschen-2026` in `website-relaunch-seo-ohne-sichtbarkeitsverlust-planen` zusammenführen (Fokus: Weiterleitungen und Inhaltsinventur).
- Die Checkliste bleibt als How-to-Spoke.
- Hub ↔ Spoke-Links wie in Abschnitt 8.

### H-5 · **High** · Local SEO / Google-Unternehmensprofil: 5 überlappende Posts, kein Info-Pillar

**Beleg**

| URL | Title | Wörter |
|---|---|---|
| `/blog/Lokale-SEO-Hacks-fuer-Berlin` | Lokale SEO Berlin: Google Unternehmensprofil optimieren [10 Tipps] | 1.630 |
| `/blog/local-seo-berlin-fuer-freelancer` | Local SEO Berlin für Freelancer & KMU \| Google Profil & Bezirksseiten | 1.924 |
| `/blog/local-seo-berlin-2026-website-profilsignale` | Local SEO in Berlin 2026: Website- und Profilsignale | 2.091 |
| `/blog/google-unternehmensprofil-website-lokale-signale-berlin-2026` | Google-Unternehmensprofil und Website 2026: Lokale Signale | 2.000 |
| `/blog/google-unternehmensprofil-website-widerspruch-berlin-brandenburg` | Google-Unternehmensprofil und Website widersprechen sich? | 2.222 |

- Drei Titles beginnen mit „Local/Lokale SEO Berlin“. Zwei behandeln den Abgleich von Profil und Website.
- `/leistungen/local-seo` (Registry-Owner „local seo berlin“) verlinkt nur `seo-fuer-blumenladen`.
- SERP K9 ↔ K10 = 0: Die Anleitung zum Google-Unternehmensprofil verdient einen eigenen Spoke. Die drei „Local SEO Berlin“-Posts zielen dagegen auf dieselbe Intention.

**Empfehlung**
- `local-seo-berlin-fuer-freelancer` und `local-seo-berlin-2026-website-profilsignale` zu einem **Ratgeber-Pillar „Local SEO Berlin: Leitfaden für kleine Unternehmen“** (neu `/ratgeber/local-seo-berlin`, 301 nach dem R-Gate) zusammenführen.
- `Lokale-SEO-Hacks-fuer-Berlin` → Title „Google-Unternehmensprofil optimieren: 10 Tipps für Berliner Betriebe“.
- Die beiden GBP-Abgleich-Posts zu einem Post zusammenführen (Owner: `…-widerspruch-…`, Fokus NAP-Konsistenz).

### H-6 · **High** · Zielgruppenseite „Webdesign für kleine Unternehmen in Berlin“ verwaist und dünn

**Beleg:** `/webdesign-kleine-unternehmen-berlin` hat 407 Wörter und **1 Inlink** (nur von `/ablauf`). Sie fehlt in der Registry. Die Startseite verwendet im Title dieselbe Zielgruppenphrase („Websites für kleine Unternehmen“). SERP K2 ↔ K3 = 1: Die Zielgruppen-Variante hat eine eigene SERP und trifft genau das Geschäftsziel.

**Empfehlung**
- Zur vollwertigen Zielgruppen-Landingpage ausbauen (1.200–1.800 W.): typische Ausgangslagen von KMU, Business-Paket, Branchenbeispiele, Referenzen, FAQ zu Budget und Aufwand.
- Verlinken von `/webdesign-berlin`, `/`, `/pakete/business`, `/branchen` und den Bezirken.
- In der Registry eintragen (`intentId: 'webdesign-kleine-unternehmen-berlin'`).
- Falls kein Ausbau geplant ist: per R-Gate in `/webdesign-berlin` zusammenführen. Eine verwaiste Dünnseite ist die schlechteste Variante.

### H-7 · **High** · Branchen-Cluster faktisch verwaist (Sitemap und Inlinks)

**Beleg**
- 11 Branchenseiten sind indexierbar (`index,follow`), aber **nicht in der Sitemap**: arzt, autowerkstatt, beautysalon, fitnesscoach, fotograf, friseur, hebamme, physiotherapie, steuerberater, tattoo, wellness.
- 12 von 16 haben nur 1 Inlink (vom Hub `/branchen`). Ausnahmen: Blumenladen 32, Café 30, Fitnesscoach 23, Immobilienmakler 25 (über Startseite und Hub).
- Die Branchenseiten verlinken weder Bezirke noch Referenzen noch passende Branchen-Ratgeber.

**Empfehlung**
- Alle Branchenseiten in die Sitemap aufnehmen.
- Auf `/webdesign-berlin` und `/webdesign-kleine-unternehmen-berlin` einen Block „Websites nach Branche“ mit allen Branchen einbauen.
- Querverbindungen zwischen verwandten Branchen (Friseur ↔ Beauty ↔ Wellness; Arzt ↔ Physio ↔ Hebamme; Café ↔ Restaurant).
- Branche → Referenz: Reinigung → TM Sauber, Café → Zur alten Backstube.
- Für Branchen ohne Referenz und ohne nennenswerte Nachfrage prüfen, ob sie zusammengefasst werden können. 16 fast gleich aufgebaute Seiten (1.250–1.370 W.) bergen sonst ein Risiko für „scaled content“.

### H-8 · **High** · Blogpost „Webdesign Lichtenberg“ konkurriert mit der Bezirksseite Lichtenberg

**Beleg**
- `/blog/webdesign-lichtenberg-berlin` (1.970 W., Title „Webdesign Lichtenberg in Berlin: …“) und `/webdesign-berlin/lichtenberg` (961 W., Title „Webdesign Lichtenberg | Website erstellen lassen ab 799 €“) zielen auf dieselbe Intention.
- Der Blogpost ist doppelt so lang und verlinkt die Bezirksseite **nicht** (live geprüft). Stattdessen verlinkt er 6× `/webdesign-berlin`, davon 4× mit dem exakten Anker „Webdesign Berlin“.

**Empfehlung**
- Einzigartige Inhalte (Lichtenberger Kiez-Bezug, FAQ) in die Bezirksseite übernehmen und den Post per R-Gate auf `/webdesign-berlin/lichtenberg` weiterleiten.
- Sofortmaßnahme: Link Blogpost → Bezirksseite (siehe Abschnitt 8).

### M-1 · **Medium** · Doppelter Ratgeber „Baukasten vs. professionelle Website“

**Beleg:** `/ratgeber/baukasten-vs-professionelle-website` (662 W., 13 Inlinks) und `/ratgeber/professionellen-website-vs-baukasten` (933 W., **1 Inlink**, Title grammatikalisch fehlerhaft). Angrenzend: `/blog/festpreis-…` („individuell statt Baukasten“) und `/blog/wordpress-2025-deutschland-…`. SERP K11 zeigt eine Vergleichs-SERP mit Medien und Vergleichsportalen.

**Empfehlung:** Den zweiten Ratgeber per 301 in den ersten zusammenführen. Daraus einen Comparison-Spoke „Baukasten, WordPress oder individuelle Website?“ (1.500 W.) machen. Den WordPress-2025-Post als Abschnitt übernehmen oder darauf ausrichten.

### M-2 · **Medium** · KI-Sichtbarkeit: zwei Dublettenpaare

**Beleg**
- `/blog/google-ai-overviews` („Google AI Overviews in Deutschland: Was sie für SEO & Content 2025 bedeuten“, 891 W.) und `/blog/Google-AI-Mode-und-AI-Overviews` („Google AI Overviews Deutschland: Auswirkungen auf SEO 2025 [Guide]“, 1.964 W.) sind praktisch titelgleich.
- `/blog/ki-suche-webdesign-2026` („KI-Suche und Webdesign 2026: So bleibt deine Website sichtbar“) und `/blog/ki-sichtbarkeit-website-berlin-2026` („KI-Sichtbarkeit 2026 …: Was deine Website in Berlin wirklich braucht“) haben dieselbe Intention.
- Angrenzend: `rising-ai-native-internet-semantic-retrieval`, `relaunch-wegen-ki-suche`, `/website-tester/geo`.

**Empfehlung:** `google-ai-overviews` → `Google-AI-Mode-und-AI-Overviews` und `ki-suche-webdesign-2026` → `ki-sichtbarkeit-website-berlin-2026` zusammenführen. Den KI-Teil als Unter-Cluster von D (Abschnitt 7) führen, mit Link zum GEO-Tester und zur Audit-Leistung.

### M-3 · **Medium** · Branchen-Dubletten (Handwerk, Makler, Gastronomie)

| Intention | Konkurrierende URLs | Empfehlung |
|---|---|---|
| Handwerker-Website erstellen lassen Berlin | `/handwerker` (1.160 W., 1 Inlink, anderes Template, H1 mit unbelegter Aussage „In 30 Tage bis zu 128 % mehr Aufträge“) vs. `/ratgeber/website-fuer-handwerker-berlin` (519 W., 2 Inlinks). Sie verlinken sich nicht gegenseitig. | Neue Branchenseite `/branchen/webdesign-handwerker` als Owner; `/handwerker` per 301; der Ratgeber wird Info-Spoke „Was muss auf eine Handwerker-Website?“; die 128-%-Aussage belegen oder entfernen (Glaubwürdigkeit, Wettbewerbsrecht) |
| Immobilienmakler Website erstellen | `/branchen/webdesign-immobilienmakler` vs. `/blog/immobilienmakler-website-erstelle` (H1 „Immobilienmakler Website erstellen: …“) | Branchenseite = Owner; Blogpost neu ausrichten auf „Makler-Website: Diese Inhalte bringen Anfragen (Checkliste)“ |
| Restaurant-/Café-Website | `/branchen/webdesign-restaurant`, `/branchen/webdesign-cafe`, `/ratgeber/website-fuer-restaurants-cafes-berlin` (verlinkt nur Café, nicht Restaurant) | Ratgeber = Info-Spoke für beide; Links ergänzen |

### M-4 · **Medium** · „Website prüfen“: 5 URLs ohne klare Aufgabenteilung

**Beleg:** `/website-tester` (Tool), `/leistungen/website-audit` (Leistung), `/ratgeber/homepage-checker-website-check` (2.118 W., **1 Inlink**), `/blog/immobilienmakler-homepage-check` (identische H1-Vorlage „…: Prüfe in 10 Minuten, ob deine Website noch modern ist“) und `/blog/website-audit-relaunch-kmu-berlin-brandenburg`. SERP K12 ist eine reine Tool-SERP.

**Empfehlung:** Rollen festlegen:
- Tool = „website testen kostenlos“
- Leistung = „website audit“
- Ratgeber = „ist meine website veraltet“ (Selbstcheck), mit Pflichtlink zum Tool und zur Leistung
- Makler-Check = Branchen-Spoke mit eigener H1-Formulierung

### M-5 · **Medium** · Themenferne Blogposts verwässern das Themenprofil

| URL | Wörter | Bezug zum Angebot | Empfehlung |
|---|---|---|---|
| `/blog/Scoll-Snapp-Galery-&-Zoom‑on‑View` | 404 | CSS-Tutorial für Entwickler | noindex oder 410 |
| `/blog/media-queries-vs-container-queries` (+ `/demo/cq-compare/`, 46 W.) | 510 | Entwickler-Tutorial | noindex (Demo ebenfalls) |
| `/blog/3d-interaktives-ux-design` | 1.338 | WebGL, keine KMU-Leistung | Umschreiben zu „Animationen auf KMU-Websites: Was lohnt sich?“ (Zusatzleistung „Animationen“ existiert in `data/addOns.js`) oder noindex |
| `/blog/rising-ai-native-internet-semantic-retrieval` | 2.063 | abstrakt | Kernaussagen in den KI-Sichtbarkeits-Post übernehmen, dann 301 |
| `/blog/chatgpt-agentenmodus` | 1.534 | kein Bezug | noindex oder 410 |
| `/blog/wordpress-68` | 1.008 | veraltet; das Angebot setzt bewusst nicht auf WordPress („No builder website and no standard theme“) | 410 oder noindex |
| *Randthemen:* `wordpress-2025-…` | 1.378 | Entscheidungshilfe möglich | → M-1 |
| `google-ads-vs-meta-ads`, `GA4-Tracking-Framework`, `eigener-website-chatbot` | 941–1.569 | angrenzend (Tracking-Einrichtung ist Zusatzleistung) | behalten, als Brücke zu Landingpage bzw. Zusatzleistungen verlinken |
| Woche 1–5 + Guide | ≈ 20.000 | Einsteiger, eher Selbermacher, wenig Kaufnähe | behalten (Top-Funnel), Links zu Baukasten-Ratgeber und `/pakete/start` ergänzen; siehe L-2 |

Vor noindex oder 410 GSC-Impressionen und Backlinks je URL prüfen (Logik des R-Gates).

### M-6 · **Medium** · Ratgeber und Blog ohne Abgrenzung; generischer „Verwandte Ratgeber“-Block

**Beleg**
- Gleiche Themen in beiden Bereichen: Kosten (3 Ratgeber, 2 Blog), Relaunch (1 und 5), SEO (2 und 5), Branchen (2 und 3).
- Der Ratgeber-Hub („Evergreen-Wissen“) verlinkt zusätzlich 3 Blogposts.
- Jeder Ratgeber zeigt dieselben 5 „verwandten“ Artikel, auch wenn sie thematisch nicht passen. So verlinkt der Relaunch-Ratgeber auf „Was ist SEO“.
- 4 Ratgeber sind faktisch verwaist (1 Inlink).

**Empfehlung:** Regel einführen:
- **Ratgeber = genau ein Evergreen-Pillar je Cluster** (5 Stück).
- **Blog = datierte Spokes**, die immer auf ihren Pillar verlinken.
- Den „Verwandte Ratgeber“-Block clusterbezogen befüllen.

### M-7 · **Medium** · App-Rechtstexte „Swipe & Cook“ seitenweit verlinkt

**Beleg:** `/swipeandcook-datenschutz`, `-nutzungsbedingungen`, `-support` und `-konto-loeschen` haben je **195 Inlinks** (Footer auf jeder Seite), 1.700–3.900 Wörter, ohne Bezug zum Webdesign-Angebot.

**Empfehlung:** Die Seiten auf die App-eigene Domain verlagern (im Repository ist bereits eine eigenständige App-Website angelegt) und mit 301 weiterleiten. Mindestens aber aus dem seitenweiten Footer nehmen und nur von einer Seite „Apps/Projekte“ verlinken.

### M-8 · **Medium** · `/ablauf` vs. Ratgeber „Ablauf, Dauer und Kosten“

**Beleg:** `/ablauf` („Website Projekt Ablauf Berlin“, 487 W., seitenweit verlinkt) und `/ratgeber/website-erstellen-berlin-ablauf-dauer-kosten` (725 W.) haben dieselbe Kernphrase.

**Empfehlung:**
- `/ablauf` = „So arbeiten wir zusammen“ (navigational und transaktional, Schritte und Termine).
- Ratgeber = „Wie lange dauert eine Website? Vorbereitung & Zeitplan“ (informational).
- Gegenseitig verlinken. Die Kostenteile in den Kosten-Pillar verlagern (K-2).

### L-1 · **Low** · Bezirke untereinander nicht verlinkt; einseitige Ankertexte

Die 6 Bezirksseiten verlinken keine Nachbarbezirke und keine Branchen. Mehrere Posts verlinken `/webdesign-berlin` mehrfach mit identischem Anker „Webdesign Berlin“ (Lichtenberg-Post 4×). **Empfehlung:** Je 2 Nachbarbezirke verlinken. Ankertexte variieren (kein Anker über 40 % der Links auf eine Ziel-URL).

### L-2 · **Low** · Serienversprechen „11-wöchiger Guide“ nicht eingelöst

Es gibt nur Woche 1–5. Der Guide verlinkt Woche 5 nicht. Die „Rising“-Serie hat nur die Wochen 1 und 4. **Empfehlung:** Den Titel auf „Webdesign-Grundlagen in 5 Teilen“ ändern oder die Serie abschließen. Woche 5 im Guide verlinken.

### L-3 · **Low** · Title- und Slug-Artefakte

- 7 Branchen-Titles enthalten die Floskel „nach aktueller Paketlogik“.
- Der Ratgeber-Title „Professionellen Website vs. Baukasten“ ist grammatikalisch falsch.
- Die Slugs `Scoll-Snapp-Galery-&-Zoom‑on‑View` (Tippfehler, `&`, geschützte Bindestriche) und `website-checkliste-für-selbstandige` (Umlaut) erzeugen Encoding-Dubletten im Crawl.

**Empfehlung:** Titles bereinigen. Slugs bei der nächsten Überarbeitung normalisieren (mit 301).

### L-4 · **Low** · Quellenlinks mit `?utm_source=openai`

In den 2026er-Posts tragen externe Quellenlinks den Parameter `utm_source=openai` (live bestätigt). Für Leser und Qualitätsbewertung wirkt das wie unbearbeiteter KI-Output. **Empfehlung:** Parameter im Content-Agent entfernen. Fällt in den Bereich Inhalt/E-E-A-T.

### L-5 · **Low** · Keyword-Map veraltet

`docs/seo/seo-keyword-map-berlin.csv` verweist auf nicht mehr existierende Pfade, z. B. `/webdesign-berlin/design-ux-ui` (dort: „website relaunch berlin“!), `/webdesign-berlin/seo-sichtbarkeit-einsteiger` und `/webdesign-berlin/domain-hosting-technik`. Außerdem widerspricht sie der Registry (K-2). **Empfehlung:** Die Registry ist die einzige verbindliche Quelle. Die CSV wird daraus erzeugt oder archiviert.

### L-6 · **Low** · Sprachmix in der Verlinkung

`/en/webdesign-berlin` verlinkt deutschsprachige Ratgeber- und Branchenseiten. **Empfehlung:** Auf EN-Seiten nur EN-Ziele verlinken oder die Links als deutschsprachig kennzeichnen (`hreflang`-Logik unberührt).

---

## 6. Kannibalisierungs-Übersicht

| # | Intention | Konkurrierende URLs | Owner (Ziel) | Maßnahme | Schwere |
|---|---|---|---|---|---|
| 1 | website erstellen lassen berlin | `/`, `/webdesign-berlin`, `/pakete`, Ratgeber Ablauf, 6 Bezirks-Titles | `/webdesign-berlin` | H1/Title-Ownership | Critical |
| 2 | website kosten / preise berlin | 9 URLs (K-2) | `/pakete` (Preise), `/webdesign-berlin/kosten-preise-pakete` (Kosten-Info) | 2+1-Modell, 5 Zusammenführungen | Critical |
| 3 | local seo berlin (Info) | 3 Local-SEO-Posts | neuer `/ratgeber/local-seo-berlin` | 2 zusammenführen, 1 neu ausrichten | High |
| 4 | relaunch checkliste / ohne Rankingverlust | 3 Relaunch-Posts | Checkliste + SEO-Relaunch | 1 zusammenführen | High |
| 5 | webdesign lichtenberg | Blogpost vs. Bezirksseite | `/webdesign-berlin/lichtenberg` | zusammenführen, Sofort-Link | High |
| 6 | baukasten vs. professionelle website | 2 Ratgeber (+2 Blog) | `/ratgeber/baukasten-vs-professionelle-website` | 1 zusammenführen | Medium |
| 7 | google ai overviews / ki-sichtbarkeit | 2 Paare | jeweils längere/neuere URL | 2 zusammenführen | Medium |
| 8 | handwerker website berlin | `/handwerker`, Ratgeber Handwerker | `/branchen/webdesign-handwerker` (neu) | 301 + neue Ausrichtung | Medium |
| 9 | immobilienmakler website erstellen | Branchenseite vs. Blogpost | Branchenseite | Blogpost neu ausrichten | Medium |
| 10 | homepage check | Ratgeber vs. Makler-Blogpost (gleiche H1-Vorlage) | Ratgeber | H1 differenzieren | Medium |

---

## 7. Zielarchitektur: Hub and Spoke (5 Cluster)

**Seitenweiter Pillar:** `/webdesign-berlin` (kommerzieller Haupt-Hub). Die Startseite übernimmt Marke und Verteilung.
**Regel:** Jeder Cluster hat einen **kommerziellen Hub** (Leistung/Paket), einen **Ratgeber-Pillar** (2.500–4.000 W.) und **Blog-Spokes** (1.200–1.800 W.). Primärkeywords sind über alle URLs eindeutig.

### Cluster A – Website erstellen lassen in Berlin (Money-Cluster)

| Rolle | URL | Primärkeyword | Intention | Vorlage | Status |
|---|---|---|---|---|---|
| Hub (kommerziell) | `/webdesign-berlin` | website erstellen lassen berlin | transaktional | landing-page | besteht |
| Zielgruppe | `/webdesign-kleine-unternehmen-berlin` | webdesign kleine unternehmen berlin | transaktional | landing-page | **ausbauen** (H-6) |
| Lokal | 6 × `/webdesign-berlin/{bezirk}` | webdesign {bezirk} | transaktional | landing-page | besteht |
| Pillar (Info) | `/ratgeber/website-erstellen-berlin-ablauf-dauer-kosten` | wie lange dauert website erstellen lassen | informational (how) | ultimate-guide | neu ausrichten, ausbauen |
| Spoke | `/ratgeber/baukasten-vs-professionelle-website` | baukasten oder webdesigner | kommerziell (vergleichend) | comparison | Dublette zusammenführen (M-1) |
| Spoke | `/ratgeber/webdesigner-berlin-finden` | webdesigner berlin finden / freelancer oder agentur | kommerziell (bewertend) | listicle | **neu** (G-2) |
| Spoke | `/blog/mehr-anfragen-website-kontaktfehler-kmu-2026` | mehr anfragen über website | informational (how) | how-to | besteht |
| Leistungen | `/leistungen/landingpage-erstellen-lassen`, `/leistungen/responsives-design-mobile`, `/leistungen/inhalte-texte-content` | jeweilige Leistung | transaktional | landing-page | besteht |
| Zusammenführen | `/blog/full-service-webdesign-in-berlin`, `/blog/webdesign-berlin-warum-eine-website-…` → `/webdesign-berlin`; `/blog/webdesign-lichtenberg-berlin` → Bezirksseite | – | – | – | R-Gate |

### Cluster B – Kosten & Pakete

| Rolle | URL | Primärkeyword | Intention | Vorlage | Status |
|---|---|---|---|---|---|
| Hub (kommerziell) | `/pakete` (+ start/business/wachstum/individuell) | webdesign preise berlin / website pakete | kommerziell | landing-page | besteht; H1 anpassen |
| Pillar (Info) | `/webdesign-berlin/kosten-preise-pakete` | was kostet eine website in berlin | informational | ultimate-guide | Title ändern, auf 2.500+ W. ausbauen, 3 Ratgeber aufnehmen |
| Spoke | `/blog/website-kosten-2025-einfach-erklaert` | website kosten selbstständige | informational (Konzept) | explainer | besteht (Registry) |
| Spoke | `/leistungen/laufende-kosten-website` | laufende kosten website | informational/kommerziell | explainer | besteht |
| Spoke | `/ratgeber/onepager-oder-mehrseitige-website` | onepager oder mehrseitige website | kommerziell (vergleichend) | comparison | **neu** (G-6) |
| Spoke | `/ratgeber/website-relaunch-kosten` | website relaunch kosten | informational/kommerziell | explainer | **neu** (G-4), Brücke zu C |
| Leistung | `/leistungen/website-wartung`, `/leistungen/zusatzleistungen-webdesign` | website wartung berlin / zusatzleistungen | transaktional | landing-page | besteht |

### Cluster C – Bestehende Website verbessern: Audit & Relaunch

| Rolle | URL | Primärkeyword | Intention | Vorlage | Status |
|---|---|---|---|---|---|
| Hub (kommerziell) | `/leistungen/website-relaunch` (+ `/pakete/wachstum`) | website relaunch berlin | transaktional | landing-page | besteht |
| Co-Hub | `/leistungen/website-audit` | website audit | transaktional | landing-page | besteht |
| Tool | `/website-tester` (+ seo/meta/geo/broken-links) | website testen kostenlos | Tool | – | besteht |
| Pillar (Info) | `/ratgeber/website-relaunch-berlin` | wann lohnt sich ein website relaunch | informational (Konzept) | ultimate-guide | **auf 2.500+ W. ausbauen** |
| Spoke | `/blog/website-relaunch-berlin-checkliste` | website relaunch checkliste | informational (how) | how-to | besteht |
| Spoke | `/blog/website-relaunch-seo-ohne-sichtbarkeitsverlust-planen` (+ `…inhalte-nicht-loeschen-2026`) | relaunch ohne rankingverlust | informational (how) | how-to | zusammenführen |
| Spoke | `/blog/website-audit-relaunch-kmu-berlin-brandenburg` | website audit vor relaunch | informational (Liste) | listicle | besteht |
| Spoke | `/ratgeber/homepage-checker-website-check` | ist meine website veraltet | informational (how) | how-to | besteht, verlinken |
| Brücke zu D | `/blog/relaunch-wegen-ki-suche`, `/blog/barrierefreiheit-2020-websites-leitfaden` | relaunch wegen ki / bfsg website | informational | explainer | besteht |

### Cluster D – Lokal und in der KI-Suche gefunden werden

| Rolle | URL | Primärkeyword | Intention | Vorlage | Status |
|---|---|---|---|---|---|
| Hub (kommerziell) | `/leistungen/local-seo` | local seo berlin | kommerziell | landing-page | besteht |
| Pillar (Info) | `/ratgeber/local-seo-berlin` | local seo kleine unternehmen berlin | informational (breit) | ultimate-guide | **neu aus 2 Posts** (G-1) |
| Spoke | `/blog/Lokale-SEO-Hacks-fuer-Berlin` | google unternehmensprofil optimieren | informational (Liste) | listicle | Title neu ausrichten |
| Spoke | `/blog/google-unternehmensprofil-website-widerspruch-berlin-brandenburg` (+ `…lokale-signale…`) | google unternehmensprofil website abgleichen | informational (how) | how-to | zusammenführen |
| Spoke | `/blog/seo-fuer-blumenladen` | seo für blumenladen | informational | how-to | besteht (Registry) |
| Spoke | `/ratgeber/was-ist-seo` | was ist seo | informational (Konzept) | explainer | besteht |
| Unter-Cluster KI | `/blog/ki-sichtbarkeit-website-berlin-2026` (+ `ki-suche-webdesign-2026`, Teile von `rising-ai-native…`) | ki sichtbarkeit website | informational | explainer | zusammenführen |
| Unter-Cluster KI | `/blog/Google-AI-Mode-und-AI-Overviews` (+ `google-ai-overviews`) | google ai overviews seo | informational | explainer | zusammenführen |
| Tool | `/website-tester/geo` | geo test website | Tool | – | besteht |

### Cluster E – Websites nach Branche

| Rolle | URL | Primärkeyword | Intention | Vorlage | Status |
|---|---|---|---|---|---|
| Hub | `/branchen` | webdesign branchen berlin | kommerziell | landing-page | besteht |
| Spokes (kommerziell) | 16 × `/branchen/webdesign-{branche}` + **`/branchen/webdesign-handwerker` (neu, aus `/handwerker`)** | {branche} website erstellen lassen | transaktional | landing-page | Sitemap + Links (H-7) |
| Info-Spokes | `/ratgeber/website-fuer-handwerker-berlin`, `/ratgeber/website-fuer-restaurants-cafes-berlin`, `/blog/immobilienmakler-website-erstelle` (neu ausgerichtet), `/blog/immobilienmakler-homepage-check` | was muss auf eine {branche}-website | informational | how-to / listicle | verlinken |
| Belege | `/referenzen/zur-alten-backstube` (Café), `/referenzen/tm-sauber-mehr` (Reinigung, Relaunch), `/referenzen/kurdisches-filmfestival` | – | – | Fallstudie | ausbauen (G-5) |

**Abweichung von der Clustervorgabe (2–4 Posts je Cluster):** Bezirke (6) und Branchen (16) sind kommerzielle Landingpages und keine Blog-Spokes. Die Vorgabe gilt für die Info-Spokes je Cluster und ist dort eingehalten (3–4).

---

## 8. Link-Empfehlungen (Von → Nach, Ankertext)

Alle Links stehen im Fließtext, nicht nur in Boxen. P1 = sofort (ohne Weiterleitung umsetzbar), P2 = mit der Konsolidierung, P3 = Feinschliff. Preise im Anker über die Template-Variable setzen, damit sie nicht veralten.

| Prio | Von | Nach | Ankertext | Cluster/Zweck |
|---|---|---|---|---|
| P1 | `/ratgeber/website-kosten-berlin` | `/pakete/business` | Business-Paket für kleine Unternehmen | B · Kosten-Impressionen → Paket mit vorausgefüllter Anfrage |
| P1 | `/blog/website-kosten-2025-einfach-erklaert` | `/pakete/business` | Business-Paket im Detail ansehen | B |
| P1 | `/blog/website-kosten-2025-einfach-erklaert` | `/webdesign-berlin/kosten-preise-pakete` | Was eine Website in Berlin kostet | B · Spoke → Pillar |
| P1 | `/pakete` | `/webdesign-berlin/kosten-preise-pakete` | Kosten verständlich eingeordnet | B · Hub → Pillar |
| P1 | `/webdesign-berlin/kosten-preise-pakete` | `/blog/website-kosten-2025-einfach-erklaert` | Kostenmodelle für Selbstständige | B · Pillar → Spoke |
| P1 | `/ratgeber/website-relaunch-berlin` | `/leistungen/website-relaunch` | Website-Relaunch in Berlin planen lassen | C · Pillar → Hub |
| P1 | `/ratgeber/website-relaunch-berlin` | `/pakete/wachstum` | Wachstum-Paket für Relaunches | C |
| P1 | `/leistungen/website-relaunch` | `/ratgeber/website-relaunch-berlin` | Wann sich ein Relaunch wirklich lohnt | C · Hub → Pillar |
| P1 | `/leistungen/website-relaunch` | `/blog/website-relaunch-seo-ohne-sichtbarkeitsverlust-planen` | Relaunch ohne Rankingverlust vorbereiten | C · Hub → Spoke |
| P1 | `/leistungen/website-audit` | `/blog/website-audit-relaunch-kmu-berlin-brandenburg` | 15 Prüfpunkte vor dem Relaunch | C · Hub → Spoke |
| P1 | `/ratgeber/homepage-checker-website-check` | `/leistungen/website-audit` | Website professionell prüfen lassen | C · verwaiste Seite → Leistung |
| P1 | `/blog/website-relaunch-berlin-checkliste` | `/ratgeber/website-relaunch-berlin` | Relaunch oder gezielte Überarbeitung? | C · Spoke → Pillar |
| P1 | `/leistungen/local-seo` | `/blog/local-seo-berlin-2026-website-profilsignale` (später `/ratgeber/local-seo-berlin`) | Leitfaden: Local SEO für Berliner Betriebe | D · Hub → Pillar |
| P1 | `/leistungen/local-seo` | `/blog/Lokale-SEO-Hacks-fuer-Berlin` | Google-Unternehmensprofil optimieren | D · Hub → Spoke |
| P1 | `/ratgeber/was-ist-seo` | `/leistungen/local-seo` | lokale Sichtbarkeit in Berlin aufbauen lassen | D · Spoke → Hub |
| P1 | `/blog/webdesign-lichtenberg-berlin` | `/webdesign-berlin/lichtenberg` | Webdesign für Betriebe in Lichtenberg | A · Kannibalisierung entschärfen |
| P1 | `/webdesign-berlin` | `/webdesign-kleine-unternehmen-berlin` | Websites speziell für kleine Unternehmen | A · verwaiste Zielgruppenseite (nach Ausbau) |
| P1 | `/` | `/webdesign-kleine-unternehmen-berlin` | Webdesign für kleine Berliner Betriebe | A |
| P1 | `/ratgeber/website-fuer-handwerker-berlin` | `/handwerker` (später `/branchen/webdesign-handwerker`) | Handwerker-Website erstellen lassen | E · Info → kommerziell |
| P1 | `/ratgeber/website-fuer-restaurants-cafes-berlin` | `/branchen/webdesign-restaurant` | Restaurant-Website mit Speisekarte & Reservierung | E |
| P1 | `/branchen/webdesign-reinigung` | `/referenzen/tm-sauber-mehr` | Praxisbeispiel: Relaunch für einen Reinigungsbetrieb | E · Beleg |
| P2 | `/blog/website-relaunch-berlin-checkliste` | `/blog/website-relaunch-seo-ohne-sichtbarkeitsverlust-planen` | Weiterleitungen und Inhalte sicher übernehmen | C · Geschwister |
| P2 | `/blog/website-relaunch-seo-ohne-sichtbarkeitsverlust-planen` | `/blog/website-relaunch-berlin-checkliste` | komplette Relaunch-Checkliste | C · Geschwister |
| P2 | `/blog/website-audit-relaunch-kmu-berlin-brandenburg` | `/ratgeber/website-relaunch-berlin` | Entscheidung: Relaunch oder Optimierung | C · Spoke → Pillar |
| P2 | `/blog/relaunch-wegen-ki-suche` | `/blog/ki-sichtbarkeit-website-berlin-2026` | was KI-Sichtbarkeit wirklich braucht | C ↔ D · Brücke |
| P2 | `/leistungen/website-audit` | `/ratgeber/homepage-checker-website-check` | Selbstcheck in 10 Minuten | C |
| P2 | `/blog/Lokale-SEO-Hacks-fuer-Berlin` | `/blog/google-unternehmensprofil-website-widerspruch-berlin-brandenburg` | Profil und Website abgleichen | D · Geschwister |
| P2 | `/blog/google-unternehmensprofil-website-lokale-signale-berlin-2026` | `/leistungen/local-seo` | Local-SEO-Grundlage beauftragen | D · Spoke → Hub |
| P2 | `/blog/ki-sichtbarkeit-website-berlin-2026` | `/website-tester/geo` | kostenloser GEO-Test | D · Tool |
| P2 | `/webdesign-berlin` | `/ratgeber/website-erstellen-berlin-ablauf-dauer-kosten` | Ablauf und Dauer eines Website-Projekts | A · Hub → Pillar |
| P2 | `/webdesign-berlin` | `/ratgeber/baukasten-vs-professionelle-website` | Baukasten oder Webdesigner? | A · Hub → Spoke |
| P2 | `/pakete/start` | `/ratgeber/baukasten-vs-professionelle-website` | Wann ein Baukasten reicht | A/B |
| P2 | `/pakete/business` | `/webdesign-kleine-unternehmen-berlin` | für kleine Unternehmen in Berlin | A/B |
| P2 | `/pakete/wachstum` | `/leistungen/website-relaunch` | Relaunch mit dem Wachstum-Paket | B ↔ C |
| P2 | `/leistungen/landingpage-erstellen-lassen` | `/blog/Landingpages-Webshop-Webdesign-Berlin` | zwei Praxisfälle mit Methodik | A |
| P2 | `/branchen/webdesign-restaurant` | `/ratgeber/website-fuer-restaurants-cafes-berlin` | Was eine Gastro-Website braucht | E · Hub → Info |
| P2 | `/branchen/webdesign-cafe` | `/referenzen/zur-alten-backstube` | Referenz: Website für ein Berliner Café | E · Beleg |
| P2 | `/webdesign-berlin` | 12 bisher verwaiste Branchenseiten (Block „Websites nach Branche“) | jeweils „Website für {Branche}“ | E · Verwaisung beheben |
| P3 | `/blog/von-traffic-zu-terminen` | `/blog/mehr-anfragen-website-kontaktfehler-kmu-2026` | häufige Kontaktfehler | A · Geschwister |
| P3 | `/blog/google-ads-vs-meta-ads` | `/leistungen/landingpage-erstellen-lassen` | Landingpage für Kampagnen | A · Randthema anbinden |
| P3 | `/blog/GA4-Tracking-Framework` | `/leistungen/zusatzleistungen-webdesign` | Tracking-Einrichtung als Zusatzleistung | B · Randthema anbinden |
| P3 | `/blog/barrierefreiheit-2020-websites-leitfaden` | `/leistungen/website-audit` | Barrierefreiheit im Audit prüfen | C |
| P3 | `/blog/was-ist-webdesign-11-woechiger-guide` | `/blog/woche-5-ux-ui-design-der-unterschied-der-millionen-wert-ist` | Teil 5: UX und UI | Serie |
| P3 | `/blog/woche-2-webdesign-arten-im-vergleich-…` | `/ratgeber/baukasten-vs-professionelle-website` | Baukasten oder professionelle Website | Top-Funnel → A |
| P3 | Jede Bezirksseite | 2 Nachbarbezirke | „Webdesign in {Nachbarbezirk}“ | A · L-1 |
| P3 | `/blog/immobilienmakler-homepage-check` | `/blog/immobilienmakler-website-erstelle` | Inhalte einer Makler-Website | E · Geschwister |

**Systemische Umsetzung:** Die P1/P2-Pflichtlinks je Cluster in der Registry als `requiredLinks` eintragen. `CONTENT_AGENT_LINKS` clusterbezogen erweitern (H-2), damit neue Posts die Struktur automatisch einhalten.

---

## 9. Fehlende Inhalte (priorisiert)

| ID | Prio | Inhalt (Arbeitstitel) | Ziel-URL | Primärkeyword | Cluster | Begründung |
|---|---|---|---|---|---|---|
| G-1 | **P1** | Local SEO Berlin: Leitfaden für kleine Unternehmen (Pillar) | `/ratgeber/local-seo-berlin` | local seo kleine unternehmen berlin | D | Hub fehlt; aus 2 bestehenden Posts zusammenführen und um Bezirks-/Branchensignale ergänzen (2.500–3.000 W.) |
| G-2 | **P1** | Webdesigner in Berlin finden: Freelancer, Agentur oder Baukasten? 12 Fragen vor der Beauftragung | `/ratgeber/webdesigner-berlin-finden` | webdesigner berlin finden / freelancer oder agentur webdesign | A | kaufnahe Bewertungsphase; passt genau zur Positionierung als Einzelunternehmer; derzeit keine Seite (1.500 W.) |
| G-3 | **P1** | Ausbau „Webdesign für kleine Unternehmen in Berlin“ | `/webdesign-kleine-unternehmen-berlin` | webdesign kleine unternehmen berlin | A | eigene SERP (K3), trifft das Geschäftsziel; heute 407 W. und verwaist (1.200–1.800 W.) |
| G-4 | **P2** | Was kostet ein Website-Relaunch? Aufwand, Kosten, Zeitplan | `/ratgeber/website-relaunch-kosten` | website relaunch kosten | B/C | Schnittmenge der zwei umsatzstärksten Themen; fehlt komplett (1.500 W.) |
| G-5 | **P2** | Ausführliche Fallstudien (Ausgangslage → Lösung → Ergebnis) für TM Sauber (Relaunch) und Zur alten Backstube (Café) | `/referenzen/*` (ausbauen) | – | A/C/E | Referenzen haben 400–520 W.; kommerzielle Seiten brauchen belegte Ergebnisse (E-E-A-T) |
| G-6 | **P2** | Onepager oder mehrseitige Website? Entscheidungshilfe | `/ratgeber/onepager-oder-mehrseitige-website` | onepager oder mehrseitige website | B | Entscheidung zwischen Start- und Business-Paket; Woche 2 deckt das nur als Einsteiger-Thema ab (1.200 W.) |
| G-7 | **P2** | Handwerker-Branchenseite unter `/branchen` | `/branchen/webdesign-handwerker` | handwerker website erstellen lassen berlin | E | Konsolidierung von `/handwerker` und Ratgeber; großes KMU-Segment in Berlin; einheitliche URL-Logik |
| G-8 | **P3** | Website-Wartung: Was ein Wartungsvertrag enthalten sollte (Checkliste) | `/ratgeber/website-wartung-checkliste` | website wartungsvertrag | B | Info-Spoke für die Registry-Leistung `/leistungen/website-wartung`, die heute keinen Inhaltsunterbau hat (1.200 W.) |

Hinweis: Der im Juli dokumentierte achtwöchige Veröffentlichungsstopp für neue SEO-Zielseiten (ab 26.07.2026) ist seit etwa 20.09.2026 abgelaufen.

---

## 10. Umsetzungsreihenfolge

1. **Woche 1–2 (ohne Weiterleitungen):** H1/Title-Ownership (K-1, K-2); P1-Links aus Abschnitt 8; Branchenseiten in die Sitemap (H-7); Registry um alle Owner-URLs erweitern; `CONTENT_AGENT_LINKS` clusterbezogen umbauen (H-2); `utm_source=openai` entfernen.
2. **Woche 3–6 (Konsolidierung über das R-Gate):** Kosten (5 URLs), Local SEO (2 + 2), Relaunch (1), Baukasten (1), KI (2), Lichtenberg (1), `/handwerker` → `/branchen/webdesign-handwerker`; themenferne Posts auf noindex/410 (vorher GSC- und Backlink-Prüfung); App-Rechtstexte auslagern (M-7).
3. **Woche 6–12 (Ausbau):** Pillars C und B auf 2.500+ W.; G-1 bis G-3 (P1), dann G-4 bis G-7.
4. **Messung:** In GSC je Cluster prüfen, ob pro Query nur noch **eine** URL Impressionen bekommt (Query→Seiten-Bericht). Zielwert: jeder Spoke hat mindestens 3 kontextuelle Inlinks.

---

## 11. Validierungs-Checkliste (Zielarchitektur)

- [x] Kein Primärkeyword doppelt vergeben (Abschnitt 7; die Zusammenführungen lösen die Dubletten aus Abschnitt 6 auf)
- [x] Jeder Spoke verlinkt seinen Pillar oder Hub (P1/P2-Links, Abschnitt 8)
- [x] Jeder Pillar oder Hub verlinkt seine Spokes
- [x] Jeder Info-Spoke hat nach Umsetzung mindestens 3 kontextuelle Inlinks (Pillar + Hub + Geschwister)
- [x] Keine verwaisten Seiten nach Umsetzung (Branchen-Block, Sitemap, Rückkanal)
- [x] Vorlagenwahl passt zur Intention (Tabellen in Abschnitt 7)
- [x] Wortzahl-Ziele: Pillars 2.500–4.000; Spokes 1.200–1.800 (Ausbaubedarf ist markiert)
- [x] 5 Cluster; je Cluster 3–4 Info-Spokes (kommerzielle Bezirks- und Branchenseiten ausgenommen, siehe Hinweis)
- [~] SERP-Overlap stützt die Gruppierung nur als Richtungssignal (nicht lokalisiert; Overlap meist 0–2). **Vor den Weiterleitungen mit GSC oder einem lokalisierten SERP-Abruf bestätigen.**

---

## Anhang A – cluster-plan.json (kompakt)

```json
{
  "version": "2.2.5",
  "seed_keyword": "website erstellen lassen berlin",
  "created_at": "2026-10-23T00:00:00+02:00",
  "pillar": { "title": "Website erstellen lassen in Berlin", "keyword": "website erstellen lassen berlin", "volume": null, "template": "landing-page", "wordCount": 2318, "url": "/webdesign-berlin", "status": "written" },
  "clusters": [
    { "name": "A – Website erstellen lassen Berlin", "hub": "/webdesign-berlin", "posts": [
      { "title": "Ablauf & Dauer eines Website-Projekts", "keyword": "wie lange dauert website erstellen lassen", "template": "ultimate-guide", "wordCount": 2500, "url": "/ratgeber/website-erstellen-berlin-ablauf-dauer-kosten", "status": "written" },
      { "title": "Baukasten, WordPress oder individuelle Website?", "keyword": "baukasten oder webdesigner", "template": "comparison", "wordCount": 1500, "url": "/ratgeber/baukasten-vs-professionelle-website", "status": "written" },
      { "title": "Webdesigner in Berlin finden", "keyword": "webdesigner berlin finden", "template": "listicle", "wordCount": 1500, "url": "/ratgeber/webdesigner-berlin-finden", "status": "planned" },
      { "title": "Mehr Anfragen über die Website", "keyword": "mehr anfragen über website", "template": "how-to", "wordCount": 1500, "url": "/blog/mehr-anfragen-website-kontaktfehler-kmu-2026", "status": "written" } ] },
    { "name": "B – Kosten & Pakete", "hub": "/pakete", "posts": [
      { "title": "Was kostet eine Website in Berlin?", "keyword": "was kostet eine website in berlin", "template": "ultimate-guide", "wordCount": 2500, "url": "/webdesign-berlin/kosten-preise-pakete", "status": "written" },
      { "title": "Website-Kosten für Selbstständige", "keyword": "website kosten selbstständige", "template": "explainer", "wordCount": 1500, "url": "/blog/website-kosten-2025-einfach-erklaert", "status": "written" },
      { "title": "Onepager oder mehrseitige Website?", "keyword": "onepager oder mehrseitige website", "template": "comparison", "wordCount": 1200, "url": "/ratgeber/onepager-oder-mehrseitige-website", "status": "planned" },
      { "title": "Laufende Website-Kosten", "keyword": "laufende kosten website", "template": "explainer", "wordCount": 1983, "url": "/leistungen/laufende-kosten-website", "status": "written" } ] },
    { "name": "C – Audit & Relaunch", "hub": "/leistungen/website-relaunch", "posts": [
      { "title": "Wann lohnt sich ein Website-Relaunch?", "keyword": "wann lohnt sich ein website relaunch", "template": "ultimate-guide", "wordCount": 2500, "url": "/ratgeber/website-relaunch-berlin", "status": "written" },
      { "title": "Website-Relaunch-Checkliste", "keyword": "website relaunch checkliste", "template": "how-to", "wordCount": 1800, "url": "/blog/website-relaunch-berlin-checkliste", "status": "written" },
      { "title": "Relaunch ohne Rankingverlust", "keyword": "relaunch ohne rankingverlust", "template": "how-to", "wordCount": 1800, "url": "/blog/website-relaunch-seo-ohne-sichtbarkeitsverlust-planen", "status": "written" },
      { "title": "Website-Audit vor dem Relaunch", "keyword": "website audit vor relaunch", "template": "listicle", "wordCount": 1800, "url": "/blog/website-audit-relaunch-kmu-berlin-brandenburg", "status": "written" } ] },
    { "name": "D – Local SEO & KI-Sichtbarkeit", "hub": "/leistungen/local-seo", "posts": [
      { "title": "Local SEO Berlin: Leitfaden", "keyword": "local seo kleine unternehmen berlin", "template": "ultimate-guide", "wordCount": 3000, "url": "/ratgeber/local-seo-berlin", "status": "planned" },
      { "title": "Google-Unternehmensprofil optimieren: 10 Tipps", "keyword": "google unternehmensprofil optimieren", "template": "listicle", "wordCount": 1600, "url": "/blog/Lokale-SEO-Hacks-fuer-Berlin", "status": "written" },
      { "title": "Unternehmensprofil und Website abgleichen", "keyword": "google unternehmensprofil website abgleichen", "template": "how-to", "wordCount": 1800, "url": "/blog/google-unternehmensprofil-website-widerspruch-berlin-brandenburg", "status": "written" },
      { "title": "KI-Sichtbarkeit 2026", "keyword": "ki sichtbarkeit website", "template": "explainer", "wordCount": 1800, "url": "/blog/ki-sichtbarkeit-website-berlin-2026", "status": "written" } ] },
    { "name": "E – Branchen", "hub": "/branchen", "posts": [
      { "title": "Handwerker-Website erstellen lassen", "keyword": "handwerker website erstellen lassen berlin", "template": "landing-page", "wordCount": 1500, "url": "/branchen/webdesign-handwerker", "status": "planned" },
      { "title": "Website für Restaurants und Cafés", "keyword": "was braucht eine restaurant website", "template": "how-to", "wordCount": 1200, "url": "/ratgeber/website-fuer-restaurants-cafes-berlin", "status": "written" },
      { "title": "Makler-Website: Inhalte, die Anfragen bringen", "keyword": "immobilienmakler website inhalte", "template": "listicle", "wordCount": 1500, "url": "/blog/immobilienmakler-website-erstelle", "status": "written" },
      { "title": "SEO für Blumenladen", "keyword": "seo für blumenladen", "template": "how-to", "wordCount": 1800, "url": "/blog/seo-fuer-blumenladen", "status": "written" } ] }
  ],
  "links": [
    { "from": "/ratgeber/website-kosten-berlin", "to": "/pakete/business", "type": "recommended", "anchor": "Business-Paket für kleine Unternehmen" },
    { "from": "/pakete", "to": "/webdesign-berlin/kosten-preise-pakete", "type": "mandatory", "anchor": "Kosten verständlich eingeordnet" },
    { "from": "/ratgeber/website-relaunch-berlin", "to": "/leistungen/website-relaunch", "type": "mandatory", "anchor": "Website-Relaunch in Berlin planen lassen" },
    { "from": "/leistungen/website-relaunch", "to": "/ratgeber/website-relaunch-berlin", "type": "mandatory", "anchor": "Wann sich ein Relaunch wirklich lohnt" },
    { "from": "/leistungen/local-seo", "to": "/ratgeber/local-seo-berlin", "type": "mandatory", "anchor": "Leitfaden: Local SEO für Berliner Betriebe" },
    { "from": "/webdesign-berlin", "to": "/webdesign-kleine-unternehmen-berlin", "type": "mandatory", "anchor": "Websites speziell für kleine Unternehmen" },
    { "from": "/blog/webdesign-lichtenberg-berlin", "to": "/webdesign-berlin/lichtenberg", "type": "mandatory", "anchor": "Webdesign für Betriebe in Lichtenberg" }
  ],
  "serp_matrix": {
    "keywords": ["website erstellen lassen berlin", "webdesign berlin", "webdesign für kleine unternehmen berlin", "was kostet eine website in berlin", "webdesign preise berlin", "website kosten kleines unternehmen", "website relaunch berlin", "website relaunch checkliste seo", "local seo berlin", "google unternehmensprofil optimieren tipps", "homepage baukasten oder webdesigner", "homepage check kostenlos website testen"],
    "scores": [
      [10,1,0,1,2,0,0,0,0,0,0,0],
      [1,10,1,0,2,0,0,0,0,0,0,0],
      [0,1,10,0,0,0,0,0,0,0,0,0],
      [1,0,0,10,0,0,0,0,0,0,0,0],
      [2,2,0,0,10,0,0,0,0,0,0,0],
      [0,0,0,0,0,10,0,0,0,0,0,0],
      [0,0,0,0,0,0,10,0,0,0,0,0],
      [0,0,0,0,0,0,0,10,0,0,0,0],
      [0,0,0,0,0,0,0,0,10,0,0,0],
      [0,0,0,0,0,0,0,0,0,10,0,0],
      [0,0,0,0,0,0,0,0,0,0,10,0],
      [0,0,0,0,0,0,0,0,0,0,0,10]
    ],
    "note": "WebSearch nicht auf Berlin/DE lokalisiert; Werte sind Untergrenzen"
  },
  "scorecard": { "coverage": 0.2, "linkDensity": 0.39, "orphanPages": 55, "cannibalization": 10, "contentGaps": 8 }
}
```

Erläuterung Scorecard:
- `coverage`: Anteil der 5 Zielcluster mit funktionierender Hub↔Spoke-Verlinkung (heute nur Teile von A über die Bezirke ↔ Ratgeber).
- `linkDensity`: 7 Inhaltslinks auf 18 Money-Seiten.
- `orphanPages`: Inhaltsseiten ohne kontextuellen Inlink (35 Blog, 4 Ratgeber, 12 Branchen, `/handwerker`, `/webdesign-kleine-unternehmen-berlin`, 2 Branchen-Kostenseiten).

## Anhang B – audit-data.json (Kategorie „Content Architecture“)

```json
{
  "category": "Content Architecture",
  "score": 38,
  "findings": [
    { "id": "CA-K1", "severity": "Critical", "title": "Money-Keyword 'Website erstellen lassen Berlin' auf 4 H1 und 6 Titles", "urls": ["/", "/webdesign-berlin", "/pakete", "/ratgeber/website-erstellen-berlin-ablauf-dauer-kosten"], "recommendation": "H1/Title-Ownership: nur /webdesign-berlin; Registry-Einträge für alle URLs" },
    { "id": "CA-K2", "severity": "Critical", "title": "Kosten-/Preis-Intention auf 9 URLs, widersprüchliche Owner (Registry vs. Keyword-Map)", "urls": ["/pakete", "/webdesign-berlin/kosten-preise-pakete", "/ratgeber/website-kosten-berlin", "/ratgeber/website-kosten-zeitplan", "/ratgeber/kosten-einfache-website", "/blog/website-kosten-2025-einfach-erklaert", "/blog/festpreis-website-pakete-berlin-und-brandenburg", "/webdesign-cafe/kosten", "/webdesign-blumenladen/kosten"], "recommendation": "2+1-Modell: /pakete (Preise), /webdesign-berlin/kosten-preise-pakete (Kosten-Info), Blog-Kostenartikel (bundesweit); Rest über R-Gate zusammenführen" },
    { "id": "CA-H1", "severity": "High", "title": "35 von 43 Blogartikeln ohne kontextuellen Inlink; Juli-Plan 'intern_integrieren' nicht umgesetzt", "recommendation": "Mindestens 3 kontextuelle Inlinks je Spoke gemäß Link-Matrix" },
    { "id": "CA-H2", "severity": "High", "title": "contentAgentLinks.js erlaubt nur 9 feste Linkziele; erzwungene Blumenladen-Links in Relaunch-/KI-Posts", "recommendation": "Clusterbezogene Linkkarte (Pillar, Hub, Geschwister, Paket)" },
    { "id": "CA-H3", "severity": "High", "title": "Rückkanal fehlt: 11 von 18 Money-Seiten ohne Inhaltslink; Ratgeber → konkrete Leistung = 0", "recommendation": "Weiterlesen-Abschnitte und Fließtext-Links laut Link-Matrix" },
    { "id": "CA-H4", "severity": "High", "title": "Relaunch-Cluster ohne Hub-Struktur; 3 überlappende Checklisten-Posts", "recommendation": "Ratgeber als Pillar ausbauen; 1 Post zusammenführen; Hub ↔ Spoke-Links" },
    { "id": "CA-H5", "severity": "High", "title": "Local SEO / GBP: 5 überlappende Posts, kein Info-Pillar", "recommendation": "/ratgeber/local-seo-berlin aus 2 Posts; GBP-Posts zusammenführen; Hub-Links" },
    { "id": "CA-H6", "severity": "High", "title": "/webdesign-kleine-unternehmen-berlin verwaist (1 Inlink) und dünn (407 W.)", "recommendation": "Ausbau auf 1.200–1.800 W.; Links von /, /webdesign-berlin, /pakete/business" },
    { "id": "CA-H7", "severity": "High", "title": "11 von 16 Branchenseiten nicht in Sitemap, 12 mit nur 1 Inlink", "recommendation": "Sitemap; Branchen-Block auf Money-Hub; Querverbindungen und Referenzen" },
    { "id": "CA-H8", "severity": "High", "title": "Blogpost 'Webdesign Lichtenberg' konkurriert mit Bezirksseite und verlinkt sie nicht", "recommendation": "Sofort-Link; danach per R-Gate zusammenführen" },
    { "id": "CA-M1", "severity": "Medium", "title": "Doppelter Ratgeber 'Baukasten vs. professionelle Website'", "recommendation": "Zusammenführen zu Vergleichs-Spoke inkl. WordPress" },
    { "id": "CA-M2", "severity": "Medium", "title": "KI-Sichtbarkeit: 2 Dublettenpaare (AI Overviews, KI-Sichtbarkeit 2026)", "recommendation": "2 zusammenführen; Unter-Cluster D" },
    { "id": "CA-M3", "severity": "Medium", "title": "Branchen-Dubletten Handwerker, Makler, Gastronomie", "recommendation": "/branchen/webdesign-handwerker; Makler-Blog neu ausrichten; Gastro-Links" },
    { "id": "CA-M4", "severity": "Medium", "title": "'Website prüfen' auf 5 URLs ohne Aufgabenteilung", "recommendation": "Rollen Tool/Leistung/Selbstcheck/Branche festlegen" },
    { "id": "CA-M5", "severity": "Medium", "title": "6 themenferne Blogposts (Entwickler-Tutorials, KI-News, WordPress 6.8)", "recommendation": "noindex/410 oder neu ausrichten nach GSC-Prüfung" },
    { "id": "CA-M6", "severity": "Medium", "title": "Ratgeber und Blog ohne Abgrenzung; generischer Verwandte-Block", "recommendation": "Ratgeber = 1 Pillar je Cluster; Blog = Spokes" },
    { "id": "CA-M7", "severity": "Medium", "title": "Swipe-&-Cook-Rechtstexte seitenweit verlinkt (je 195 Inlinks)", "recommendation": "Auf App-Domain auslagern bzw. aus dem Footer nehmen" },
    { "id": "CA-M8", "severity": "Medium", "title": "/ablauf vs. Ratgeber Ablauf", "recommendation": "Rollen trennen, gegenseitig verlinken" },
    { "id": "CA-L1", "severity": "Low", "title": "Bezirke nicht untereinander verlinkt; Anker-Monotonie", "recommendation": "Nachbarbezirke; Ankertexte variieren" },
    { "id": "CA-L2", "severity": "Low", "title": "'11-wöchiger Guide' mit 5 Teilen", "recommendation": "Titel anpassen oder Serie abschließen" },
    { "id": "CA-L3", "severity": "Low", "title": "Title-/Slug-Artefakte ('nach aktueller Paketlogik', Encoding-Dubletten)", "recommendation": "Bereinigen" },
    { "id": "CA-L4", "severity": "Low", "title": "utm_source=openai in Quellenlinks", "recommendation": "Im Content-Agent entfernen" },
    { "id": "CA-L5", "severity": "Low", "title": "Keyword-Map-CSV veraltet und widerspricht der Registry", "recommendation": "Registry als einzige verbindliche Quelle" },
    { "id": "CA-L6", "severity": "Low", "title": "EN-Seiten verlinken deutschsprachige Inhalte", "recommendation": "Nur EN-Ziele verlinken" }
  ]
}
```

## Anhang C – SERP-Quellen (Auswahl, nicht vertrauenswürdige Fremddaten)

- K1/K2/K5: [kopfundstift.de/webdesign-berlin](https://kopfundstift.de/webdesign-berlin/), [kopfundstift.de/?p=16046](https://kopfundstift.de/?p=16046), [dasoertliche.de Website-Design Berlin S. 16](https://www.dasoertliche.de/Themen/Website-Design/Berlin-Seite-16.html), [sellwerk.de](https://sellwerk.de/website-erstellen-lassen-berlin), [selbststaendigkeit.de](https://selbststaendigkeit.de/news-marketing/website-erstellen-lassen-berlin/), [trustlocal.de](https://trustlocal.de/berlin/berlin/webdesign/), [fixando.de](https://www.fixando.de/en/web-design-und-web-development/preise/Berlin)
- K1/K4: [strato.de – Website erstellen lassen Berlin](https://www.strato.de/homepage-baukasten/website-erstellen-lassen-berlin/); K4: [kolonell.com Kosten-Ratgeber Berlin](https://kolonell.com/en/blog/corporate-website-price-breakdown-berlin-2026)
- K2/K3: [pinpointdigital.com](https://www.pinpointdigital.com/?p=5668); K3: [dasauge.de – Little Web Giants](https://dasauge.de/-littlewebgiants)
- K6: [experte.de](https://www.experte.de/homepage-erstellen/kleine-unternehmen), [computerwoche.de](https://www.computerwoche.de/article/2762487/was-eine-website-wirklich-kostet.html)
- K7: [iww.de Kanzleimarketing Relaunch](https://www.iww.de/kp/kanzleifuehrung/kanzleimarketing-so-gelingt-der-website-relaunch-f147589); K8: [omt.de Relaunch-Checkliste](https://omt.de/suchmaschinenoptimierung/website-relaunch-checkliste), [webrepublic.com](https://www.webrepublic.com/en/insights/seo-relaunch)
- K9: [sortlist – SEO Local Berlin](https://www.sortlist.co.uk/agency/seo-local-berlin-seo-agentur); K10: [sellwerk.de GBP optimieren](https://sellwerk.de/blog/google-unternehmensprofil-optimieren), [googlewatchblog.de](https://www.googlewatchblog.de/2024/07/unternehmensprofil-bei-google-diese-vorteile-sollten-nicht-versaeumt-werden/)
- K11: [t3n.de](https://t3n.de/news/?p=703983), [vergleich.org](https://www.vergleich.org/homepage-baukasten/); K12: [studiomeyer.io](https://studiomeyer.io/de/website-check), [sitechecker.pro](https://sitechecker.pro/de/speed-test/)
