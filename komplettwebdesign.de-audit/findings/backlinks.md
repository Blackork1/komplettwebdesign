# Backlink-Profil: komplettwebdesign.de

Stand: 2026-10-23 | Tier 0 (nur Common Crawl + Verification-Crawler; kein Moz, Bing Webmaster, DataForSEO)
Alle Inhalte fremder Seiten wurden als untrusted Daten behandelt (nur Struktur/Links extrahiert).

## 1. Score

| Größe | Wert |
|---|---|
| Offizieller Backlink Health Score | **Nicht bewertbar (INSUFFICIENT DATA)**: nur 3 von 7 Faktoren mit schwacher Datenlage, Common Crawl liefert keine Referring-Domain-/Qualitäts-/Anker-Daten |
| Begründete Schätzung (nicht belastbar) | **ca. 20/100** (Konfidenz niedrig; Schätzwert, kein Messwert) |

Begründung der Schätzung: Verifiziert sind nur 5 verlinkende Domains, und alle gehen auf eigene Initiative zurück (3 Referenzkunden, 1 Bewertungsportal ProvenExpert, 1 Pressemitteilungs-Portal). Unabhängige redaktionelle Links wurden weder gefunden noch ausgeschlossen (nicht gemessen). Das ist für eine Domain mit erstem Wayback-Snapshot am 2025-11-10 plausibel, aber ausbaufähig. Das Profil wirkt unauffällig und nicht toxisch, ist aber sehr klein.

## 2. Kennzahlen (alle mit Quelle)

| Kennzahl | Wert | Quelle (Konfidenz) |
|---|---|---|
| Common Crawl, komplettwebdesign.de (auch www) | nicht im Webgraph (in_crawl=false, in_rankings=false) in **beiden** geprüften Releases: cc-main-2026-jan-feb-mar und cc-main-2026-jul-aug-sep (Nachprüfung; das Skript kennt das neuere Release nicht automatisch, es muss mit `--release` angegeben werden) | Common Crawl (0.50) |
| PageRank / Harmonic Centrality / Ränge | nicht vorhanden, **nicht gemessen** | Common Crawl |
| Kontrolle: berlin.de | gefunden, PageRank-Rang 2.425, HC-Rang 3.367, 488 Hosts | Common Crawl (0.50) |
| Kontrolle: spiegel.de, ihk.de, denic.de (Release Jan-März) sowie berlin.de (Release Jul-Sep) | "nicht gefunden", obwohl große Domains (berlin.de war im Release Jan-März noch gefunden). Negativ-Ergebnisse des Skripts sind daher **kein Beleg** für fehlende Autorität; Ursache nicht untersucht | Common Crawl |
| zuraltenbackstube.de, sauber-mehr.de | nicht im Webgraph | Common Crawl (0.50) |
| kurdisches-filmfestival.de | im Webgraph. Jan-März: PageRank-Rang 4.583.727, HC-Rang 1.920.457, 7 Hosts. Jul-Sep: PageRank-Rang 2.945.355, HC-Rang 10.879.739, 6 Hosts (sehr schwach, uneinheitlich, aber messbar) | Common Crawl (0.50) |
| Verifizierte verlinkende Domains (Stichprobe der bekannten Quellen) | 5: zuraltenbackstube.de, kurdisches-filmfestival.de, sauber-mehr.de, provenexpert.com, firmenpresse.de | Verify-Crawler (0.95) |
| Verifizierte verlinkende Seiten | 30 von 42 geprüften Seiten (zuraltenbackstube 11/11, kurdisches-filmfestival 16/16, sauber-mehr 1/13, provenexpert 1/1, firmenpresse 1/1); 12 Seiten ohne Link (alle sauber-mehr.de) | Verify-Crawler (0.95) |
| Anker-Verteilung (verifizierte Seiten) | 28x "Komplett Webdesign" (Brand; 27 Kunden-Footer + ProvenExpert), 1x "www.komplettwebdesign.de" (nackte URL), 1x nackte URL mit UTM | Verify-Crawler (0.95) |
| Follow/Nofollow | 29 Links ohne nofollow/sponsored/ugc im Rohquelltext (inkl. ProvenExpert), 1 Link (firmenpresse.de) `rel="nofollow"`. Ob ProvenExpert den Link per JavaScript nachträglich ändert, wurde nicht geprüft | Rohquelltext geparst (0.95) |
| Toxische Muster | in der Stichprobe keine beobachtet. Spam Score/Breitenprüfung **nicht gemessen** | n. a. |
| Link-Velocity, Geo-Verteilung, Domain Authority | **nicht gemessen** (kein Zugang) | n. a. |
| Domain-Alter (WHOIS) | nicht ermittelbar (.de-WHOIS ohne Erstelldatum). Frühester Wayback-Snapshot: 2025-11-10 (eine Abfrage, Folgeabfrage scheiterte, daher unvollständig) | domain_history.py / Wayback CDX |

Scoring-Faktoren (Gewicht → Status): Referring-Domain-Zahl (20%) nur Stichprobe; Qualitätsverteilung (20%) nicht gemessen; Anker-Natürlichkeit (15%) nur Stichprobe; Toxic-Ratio (20%) nur Stichprobe; Velocity (10%) nicht gemessen; Follow-Ratio (5%) Stichprobe; Geo-Relevanz (10%) nicht gemessen.

## 3. Was gut funktioniert

- Alle 3 geprüften Referenzkunden verlinken tatsächlich zurück: zuraltenbackstube.de (Footer "Erstellt durch Komplett Webdesign", sitewide, 11/11 Seiten) und kurdisches-filmfestival.de (Footer "Design: Komplett Webdesign", sitewide, 16/16 Seiten); sauber-mehr.de nur eingeschränkt (siehe H2/M1).
- Links tragen kein nofollow/sponsored/ugc (Rohquelltext), also dofollow-fähig. Der Anker ist ein reiner Brand-Anker (kein Keyword-Stuffing, geringes Abstrafungsrisiko).
- ProvenExpert-Profil (https://www.provenexpert.com/de-de/komplett-webdesign/) ist live und verlinkt mit Brand-Anker auf https://www.komplettwebdesign.de, ohne rel-Attribut im Rohquelltext (Verify-Crawler: verified).
- Pressemitteilung auf firmenpresse.de (pressinfo2205331) ist online und verlinkt auf /kontakt (mit UTM-Parametern, `rel="nofollow"`).
- Interne Marken-Konsistenz: 5 Social-Profile sitewide verlinkt, JSON-LD `sameAs` enthält zusätzlich Threads; Google-Maps-/g.page-Link vorhanden (Google-Profil existiert).
- robots.txt erlaubt alle Crawler inkl. KI-Bots; Sitemap vorhanden (Crawl-Voraussetzung für Linkauffindung gegeben).
- Mit 3 Referenzseiten, rund 45 Blogartikeln und einem 11-Wochen-Guide gibt es verlinkbare Inhalte.

## 4. Findings

### High

**H1: Linkprofil ist klein und rein selbst erzeugt; Gesamtprofil nicht messbar**
- Beleg: Nur 5 verifizierte Referring Domains (3 Kunden, 1 Bewertungsportal, 1 PR-Portal), keine unabhängigen redaktionellen Links gefunden. Ob es weitere gibt, ist **nicht gemessen** (kein Moz/Bing/DataForSEO). Common Crawl kennt die Domain in keinem der beiden geprüften Releases (Jan-März und Jul-Sep 2026).
- Fix: Kostenlose Datenbasis anbinden: Google Search Console "Links" und Bing Webmaster Tools exportieren (echte Referring Domains, Top-verlinkte Seiten, Anker). Danach Score neu berechnen. Parallel Linkaufbau nach Abschnitt 5.

**H2: Keine konsistente Rücklink-Praxis bei Referenzkunden (sauber-mehr.de)**
- Beleg: Verify-Crawler 13 Seiten, 12x `link_removed` (Startseite, Footer, Leistungsseiten ohne Credit). Einziger Link: `/datenschutz`, Abschnitt "15. Webseiterstellung von", Anker = nackte URL "www.komplettwebdesign.de", `rel="noopener noreferrer"`. Footer enthält nur "© TM Sauber & Mehr UG 2026" und Impressum/Datenschutz.
- Fix: Footer-Credit wie bei den anderen Kunden ergänzen ("Webdesign: Komplett Webdesign" → https://www.komplettwebdesign.de). Credit-Klausel als Standard in jedes Angebot/jeden Vertrag aufnehmen.

**H3: NAP-Inkonsistenz in Verzeichnissen (ProvenExpert selbst bestätigt; Gelbe Seiten und agenturen.app nur laut Koordinator)**
- Beleg: Impressum (von mir abgerufen): Telefon +49 1551 245048 (= 01551 245048), Möllendorffstr 26, 10367 Berlin. ProvenExpert-Profil (von mir abgerufen): +49 15511245048 (= 015511245048, eine Ziffer mehr). Laut Koordinator führen auch Gelbe Seiten und agenturen.app 0155 11 24 50 48; das habe ich nicht verifiziert (agenturen.app-Eintrag über geratene URLs nicht auffindbar, Gelbe Seiten nicht geprüft).
- Fix: Eine kanonische Schreibweise festlegen, alle Einträge angleichen (bzw. Impressum korrigieren, falls dort der Fehler liegt), Einträge dabei mit Website-Link versehen.

### Medium

**M1: Sitewide-Kreuzverlinkung Agentur ↔ Kunden (Reciprocal-Pattern)**
- Beleg: Validator-Warnung; die Agentur verlinkt von /about, /referenzen/* und 6 Bezirksseiten (Friedrichshain, Prenzlauer Berg, Kreuzberg, Charlottenburg, Lichtenberg, Mitte) auf zuraltenbackstube.de/sauber-mehr.de/kurdisches-filmfestival.de (nur `rel="noopener"`), die Kunden verlinken zurück.
- Bewertung: Für Webdesign-Referenzen üblich, kein Spam-Indiz. Der Linkwert ist aber begrenzt, und das Profil besteht (bei 4 Domains) vollständig aus diesem Muster.
- Fix: Beibehalten, aber nicht als einzige Quelle verlassen. Zusätzlich unabhängige Quellen aufbauen (Abschnitt 5). Brand-Anker beibehalten; optional ein Geo-Anker in nur einem Teil der Credits ("Webdesign Berlin: Komplett Webdesign").

**M2: Keine Monitoring-Basis für Linkverlust**
- Beleg: Kein Moz/Bing/DataForSEO-Zugang. 12 von 41 geprüften Seiten sind bereits ohne Link (sauber-mehr.de).
- Fix: Quartalsweise `verify_backlinks.py` über die Kundenliste laufen lassen; GSC-Links-Export archivieren.

### Low

**L1: Fehlender `</a>` im Footer von zuraltenbackstube.de**
- Beleg: Rohquelltext: `<a href="https://www.komplettwebdesign.de"><strong>Komplett Webdesign</strong> </p>` (kein schließendes `</a>`). Im Browser-Rendering nicht geprüft.
- Fix: `</a>` im Footer-Template ergänzen (kann je nach Parser nachfolgenden Inhalt in den Link ziehen).

**L2: Referenzseite /referenzen/tm-sauber-mehr ohne "Live ansehen"-Link**
- Beleg: Im Rohquelltext kein Link auf sauber-mehr.de; die Seiten zur Backstube und zum Filmfestival haben ihn. sauber-mehr.de wird nur von 6 Bezirksseiten verlinkt.
- Fix: Link ergänzen, Konsistenz herstellen.

**L3: Pressemitteilungs-Link ist nofollow + UTM**
- Beleg: `rel="nofollow"` auf `https://www.komplettwebdesign.de/kontakt?utm_source=firmenpresse&utm_medium=pr&utm_campaign=festpreis-berlin`. Kein Ranking-Linkwert; Nutzen eher Brand-Erwähnung/Auffindbarkeit.
- Fix: Nicht als Linkbuilding-Kanal weiterverfolgen, ohne Aufwand beibehalten.

**L4: Eigene Produktseiten ohne Rückverweis**
- Beleg: Startseiten cookavoli.com und cookavoli.de (HTTP 200) enthalten keinen Link auf komplettwebdesign.de (nur Startseite geprüft).
- Fix: Dezenter Hinweis "Ein Produkt von Komplett Webdesign" in Impressum/Footer (Entity-Verknüpfung; keine Linknetzwerke aufbauen).

**L5: Toxische Muster**
- Beleg: In der geprüften Stichprobe keine (keine Spam-Anker, keine PBN-/Casino-/Pharma-Quellen). Eine breite Toxizitätsprüfung ist ohne Moz/DataForSEO **nicht möglich**.
- Fix: Nach GSC-Export prüfen; Disavow nur bei nachweislich manipulativen Links.

## 5. Priorisierte, realistische Linkquellen (Berliner Webdesigner)

Alle Kandidaten sind Vorschläge; Linkvergabe und rel-Attribute der jeweiligen Plattformen wurden **nicht geprüft**.

1. **Sofort (Woche 1-2): Referenzkunden-Credits**: sauber-mehr.de-Footer (H2), Credit-Klausel für alle neuen Projekte, Rücklink-Check pro Projekt, Kunden um Testimonial mit Link auf der Kunden-Seite bitten.
2. **Sofort (Woche 1-3): Verzeichnisse/Bewertungsportale mit identischem NAP**: Google-Unternehmensprofil (vorhanden), ProvenExpert (Link vorhanden, Nummer angleichen), Gelbe Seiten und agenturen.app (laut Koordinator vorhanden, von mir nicht geprüft: Nummer angleichen, Website-Link prüfen/setzen), außerdem Bing Places, Apple Business Connect, Das Örtliche, Yelp. Zusätzlich Agentur-Portale wie Clutch oder Sortlist prüfen. Zunächst die Kundenbewertungen in ProvenExpert/Google sammeln.
3. **Kurzfristig (Monat 1-2): Lokale Netzwerke und Kammern**: IHK Berlin (prüfen, ob es ein Mitglieds-/Partnerverzeichnis mit Webseitenlink gibt), Berliner Gründer-/Unternehmernetzwerke und Verbände (z. B. BNI-Gruppen, Selbstständigenverbände), Gewerbevereine/Bezirksnetzwerke in Lichtenberg (PLZ 10367) und den Bezirken der Bezirksseiten. Handwerkskammer ist für Webdesign normalerweise nicht zuständig (nicht geprüft).
4. **Mittelfristig (Monat 2-4): Partner-/Sponsorenseiten der Kunden**: Kurdisches Filmfestival hat eine Sponsorenseite (`/sponsor-de`), dort als technischer Partner nennen lassen. Gleiches bei Kundenprojekten mit Partner- oder Lieferantenlisten.
5. **Mittelfristig: Verlinkbare Inhalte plus Outreach**: Datenbasierte Inhalte, die sich zitieren lassen (Website-Kosten Berlin, Barrierefreiheit/BFSG-Leitfaden, Relaunch-Checkliste), Gastbeiträge in Berliner Gründer-/Mittelstandsblogs, Kunden-Newsletter und Branchenverbände der Zielbranchen (Immobilienmakler, Steuerberater, Physiotherapie u. a. laut Branchenseiten).
6. **Optional: Entwicklerinhalte**: Container-Queries-/Scroll-Snap-Artikel und die Demo `/demo/cq-compare/` in Dev-Communities teilen (meist nofollow, aber Reichweite).

Nicht empfohlen: Linkkauf, Linktauschnetzwerke, Massen-Verzeichniseinträge, Presseportal-Serien (Aufwand ohne Ranking-Wirkung).

## 6. Methodik, Grenzen und nicht Gemessenes

- Common Crawl: Webgraph cc-main-2026-jan-feb-mar (Standard des Skripts) und cc-main-2026-jul-aug-sep (per `--release`, Datei existiert laut Server). Negative Treffer sind bei diesem Skript unzuverlässig (spiegel.de und ihk.de als Kontrolle ebenfalls "nicht gefunden"; berlin.de im Release Jul-Sep nicht gefunden, im Release Jan-März gefunden), daher keine Aussage zu "geringer Autorität".
- Verify-Crawler: nur Seiten, die über interne Links der drei Kundenstartseiten erreichbar waren (40 Seiten) plus Pressemitteilung und ProvenExpert-Profil. Kein Anspruch auf Vollständigkeit der Linkquellen.
- Nicht gemessen: Gesamtzahl Referring Domains, Domain Authority, Spam Score, Link-Velocity, geografische Verteilung, Rücklinks von Social-Profilen, Rücklinks von Verzeichnissen.
- Empfehlung für Folgeprüfungen: `/seo technical <url>` für Crawlbarkeit, `/seo content <url>` für E-E-A-T (nicht Teil dieser Analyse).
