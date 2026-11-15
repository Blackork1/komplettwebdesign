# SXO-Analyse (Search Experience): komplettwebdesign.de

Stand: 23.10.2026 · Methode: SERP-Rückwärtsanalyse für 8 Kern-Keywords. Ich habe 11 Zielseiten mit Playwright (mobil) gerendert und mit `parse_html.py` ausgewertet. Außerdem habe ich eine Platzhalter-Messung über 137 eindeutige URLs gemacht. Datengrundlage war `raw/crawl.json`.

## SXO Gap Score: **56 / 100**

> Der SXO Gap Score ist **getrennt** vom SEO Health Score zu lesen. Er misst, wie gut die zuständigen Seiten zu dem passen, was die SERP für das jeweilige Keyword belohnt.

| Dimension | Punkte | Beleg (Kurzform) |
|---|---|---|
| Seitentyp | 10/15 | Kommerzielle Keywords haben passende Service-Seiten. Beim Kosten-Keyword ist der Typ nur teilweise passend, und es gibt Kannibalisierung (3 Seiten mit H1 „Website erstellen lassen in Berlin“). |
| Inhaltstiefe | 9/15 | `/webdesign-berlin` hat 2.433 Wörter. Dagegen hat `/webdesign-kleine-unternehmen-berlin` nur 365 Wörter, die Kosten-Ratgeber haben 373–432 Wörter, und `/handwerker` ist inhaltlich defekt. |
| UX-Signale | 8/15 | Preisanker und CTAs stehen above the fold. Gleichzeitig sieht man Platzhaltertexte, HTML-Kommentare und widersprüchliche Preise. |
| Schema | 9/15 | Service, FAQPage und BreadcrumbList sind breit vorhanden. Es fehlt ein LocalBusiness mit Adresse. `ProfessionalService` „Komplett Webdesign Kreuzberg“ hat keine Adresse. |
| Medien | 8/15 | Es gibt Projekt-Screenshots. Auf `/webdesign-berlin` stehen aber Pexels-Stockfotos, und auf den Branchenseiten fehlen Referenzbilder. |
| Autorität | 7/15 | 5 Google-Bewertungen mit 5,0 und 3 Referenzen sind vorhanden. Es gibt keine Referenz aus Handwerk oder Kreuzberg. Bei einer Brand-Suche taucht die Domain nicht auf. |
| Aktualität | 5/10 | Mehrere Titel enthalten „2025“, die SERP setzt auf „2026“. Im Suchindex steht noch der alte Café-Titel „ab 499€“. |
| **Summe** | **56** | |

---

## Was gut funktioniert

- **Preistransparenz above the fold.** `/webdesign-berlin`, `/pakete` und der Hero von `/branchen/webdesign-cafe` zeigen „Start ab 799 € / Business ab 1.499 € / Wachstum ab 2.499 € / Individuell ab 3.500 €“. Das trifft das stärkste SERP-Signal: Wettbewerber werben mit Festpreisen, z. B. Space Rocket mit „799 € statt 1.999 €“ und Webdesign Helden mit 1.999 €.
- **Der Seitentyp passt bei den Kern-Keywords.** Für „webdesign berlin“, „website erstellen lassen berlin“ und „website relaunch berlin“ ist jeweils eine Service-Seite mit `Service`-, `FAQPage`- und `BreadcrumbList`-Schema zuständig. Das entspricht dem dominanten SERP-Typ.
- **Ehrliche Abgrenzung als Vertrauenssignal.** Die Startseite sagt „Nicht ideal, wenn … du garantierte Rankings oder garantierte Kundengewinnung erwartest“, und auf `/leistungen/website-relaunch` steht „SEO-schonende Umstellung statt Ranking-Versprechen“. Das hebt sich von Wettbewerbern mit Ranking-Versprechen ab.
- **Persönlicher Ansprechpartner.** Es gibt `Person`-Schema und „Hallo, ich bin Sören“. Das passt zur SERP für „webdesigner berlin kleine unternehmen“, die überwiegend aus Einzel-Freelancern mit „fester Ansprechpartner“ besteht.
- **Echte Social Proof auf der Startseite.** „5.0 – 5 verifizierte Bewertungen“, darunter ein Café-Zitat: „Es ist jetzt viel einfacher Tische zu reservieren“.
- **Der Relaunch-Service greift die SERP-Themen auf.** „Alte URLs und Weiterleitungen bewusst behandeln“, Paketpreise, Ablauf und FAQ sind vorhanden.
- **Niedrigschwellige Awareness-CTAs.** Den Website-Tester gibt es als kostenloses Tool.
- **Long-Tail-Sichtbarkeit ist vorhanden.** Im Such-Tool erschienen `/handwerker` (Query „Handwerker Website erstellen lassen Berlin Preis“) und `/branchen/webdesign-cafe` (Query „Café Website erstellen lassen Berlin Webdesign Gastronomie“) unter den gelisteten Treffern. Das ist **keine** Google-Position, zeigt aber: Genau diese beiden Seiten sind Schaufenster. Deshalb sind C1 und C2 so dringend.

---

## SERP-Rückwärtsanalyse je Keyword

Hinweis: Das verfügbare Such-Tool liefert keine echte Google.de-SERP. Es zeigt kein Local Pack, keine PAA, keine Anzeigen und keine AI Overview. Gezählt habe ich die je Query gelieferten 9–10 Ergebnisse (Standard- und Extended-Modus). **Eigene Google-Positionen kann ich nicht sicher feststellen**, deshalb nenne ich keine.

| # | Keyword | Dominanter Seitentyp (Konsens) | Beobachtete Ergebnisse (Auszug) | Zuständige Seite | Typ-Match | Schwere |
|---|---|---|---|---|---|---|
| 1 | webdesign berlin | Service-Seite / Agentur- bzw. Freelancer-Startseite (≈ 85 %, im Extended-Lauf 9/9). Dazu kommen Verzeichnisse (dasoertliche, feedbax, gust) | kopfundstift.de/webdesign-berlin, webneo.de/webdesign-berlin, chris-hortsch.de, homepage-helden.de/webdesign-berlin, netgenerator.de, prima-line.de, wedeon.de, lks-webdesign.de, webdesign-berlin.org | `/webdesign-berlin` (Title beginnt mit „Website erstellen lassen Berlin“) | passend | MEDIUM (Kannibalisierung, Title-Fokus) |
| 2 | website erstellen lassen berlin | Service-Seite ≈ 60 %, Ratgeber/Listicle ≈ 25 % (selbststaendigkeit.de, strato.de), Verzeichnis ≈ 15 % | dailyseven.de, space-rocket-berlin.de, byteforest.de, sellwerk.de, kopfundstift.de, in-berlin-brandenburg.com | `/`, `/webdesign-berlin` und `/pakete` haben **alle** eine H1 mit „Website erstellen lassen in Berlin…“ | passend | HIGH (Kannibalisierung) |
| 3 | webdesigner berlin kleine unternehmen | Freelancer- bzw. Einzelanbieter-Service-Seite ≈ 80 %, Profilverzeichnisse (dasauge, sortlist) ≈ 20 % | webdesign-service.berlin („seit 2014 selbstständig“), lisakoch.de (Festpreis), webdesignfreelancerberlin.de (1.932 € Festpreis), goodhomepage.de, cconnect-webdesign.de, katrinundkerstin.de | `/webdesign-kleine-unternehmen-berlin` (365 Wörter, 1 interner Inlink) | Typ formal passend, Seite zu dünn | HIGH |
| 4 | homepage erstellen lassen kosten | Ratgeber/Blog-Kostenguide ≈ 90 %, durchgehend mit „2026“ im Title, teils mit Rechner | kopfundstift.de/webdesign-kosten, seiten-werk.com/webdesign-preise, webfeinschliff.de („Preise & Rechner“), innovationgutdigital.de, graphek.de, whitespace-marketing.de, experte.de, wix.com, strato.de | 6 Seiten konkurrieren (siehe H2). Am stärksten ist `/webdesign-berlin/kosten-preise-pakete` (Hybrid-Preisseite, nur Berlin) | teilweise (Hybrid statt bundesweitem Ratgeber) | HIGH |
| 5 | website relaunch berlin | Service-Seite ≈ 65 %, Ratgeber zu Kosten und Agenturwahl ≈ 35 % | neuzeitwerber.de, 123-berlin-design.de/website-relaunch, dailyseven.de/website-relaunch-berlin, soerenkimlucas.de, jungmut.com (2× Blog), agentur030.de/webdesign/kosten | `/leistungen/website-relaunch` (1.890 Wörter) | **passend** | MEDIUM (Kannibalisierung durch Ratgeber/Blog, Dauer vage) |
| 6 | webdesign für handwerker (berlin) | Branchen-Service-Landingpage mit sichtbaren Preisen ≈ 80 %, dazu Fachartikel/Verzeichnis | **komplettwebdesign.de/handwerker**, handwerker-website-erstellen-lassen.de, dailyseven.de (Handwerker Berlin), homepagehandmade.de, meinbetriebonline.de, hypemore.de, hauptstadt-homepage.de (Miete ab 39,90 €), bau.net (Anbietervergleich 2026) | `/handwerker` | Typ passend, **Inhalt defekt** | CRITICAL |
| 7 | webdesign café (berlin) | Branchen-Service-Landingpage ≈ 75 %, Ratgeber (herold.at) bzw. Portfolio ≈ 25 % | **komplettwebdesign.de/branchen/webdesign-cafe**, im Index noch mit Titel „Café Website erstellen lassen Berlin - günstig ab 499€ ☕“, netgenerator.de (Gastronomie), restaurant-webdesign.com („ab 1.499€ in 14 Tagen“), html5-webdesign.berlin/gastronomie, hauptstadt-medien.de | `/branchen/webdesign-cafe` | Typ passend, Title/Preis defekt | HIGH (über C1) |
| 8 | webdesign kreuzberg | Bezirks-Service-Seiten von Anbietern mit Kreuzberg-Bezug ≈ 65 %, Verzeichnisse/Listicles ≈ 35 % (dasoertliche, 11880, dastelefonbuch, trustlocal „Top 10“) | dailyseven.de (Friedrichshain/Kreuzberg), cm-webmedia.de/webdesign-kreuzberg, rumler.com, html5-webdesign.berlin (eigene Räume in Kreuzberg), carlokraemer.com | `/webdesign-berlin/kreuzberg` (960–1.034 Wörter) | Typ passend, lokale Belege fehlen | MEDIUM |
| + | web designer Berlin English (EN-Persona) | Service-Seiten von Freelancern mit explizitem Sprachsignal („fluent in German and English“, „native English speaking“) und Listicles (goodfirms, „Top 10“) | sebastian-klammer.de/en, cconnect-webdesign.de, knorke.de/en, lisakoch.de/en, ingo-steinke.com, studiohumm.com | `/en/webdesign-berlin`, `/en` | Typ passend, Sprachsignal fehlt | HIGH |

**Fazit Mismatch:** Einen echten Seitentyp-Mismatch (falscher Typ) gibt es nur beim Kosten-Keyword (#4). Die Hauptprobleme liegen woanders: **Content-Defekte auf genau den Seiten, die bereits sichtbar sind** (#6, #7), **Kannibalisierung** (#2, #4, #5) und **fehlende Vertrauens- und Lokalbelege** (#3, #8, EN).

---

## Findings

### CRITICAL

#### C1: Der Laufzeit-Rewriter `util/legacyPublicCopy.js` schreibt Platzhalterphrasen live in Titles und Fließtext (31 Seiten)

**Beleg (Code):** `util/legacyPublicCopy.js` ersetzt alte Preise per Regex durch generische Phrasen statt durch echte Preise:
- Zeile 33: `Café Website erstellen lassen Berlin - günstig ab 499€ ☕` → `… | Webdesign nach aktueller Paketlogik`
- Zeile 34: der Blumenladen-Title analog
- Zeilen 35–37: ganze Sätze → `„Start, Business und Wachstum werden nach aktueller Paketlogik eingeordnet; …“`, `„Ein professioneller Einstieg wird nach aktuellem Paketumfang eingeordnet.“`, `„Transparente Pakete nach aktueller Paketlogik“`
- Zeilen 38–40: `ab 499 €` / `ab 499,- €` / `ab 499 EUR` → `nach aktueller Paketlogik`
- Zeilen 41–42: `499 €` → `aktueller Paketpreis`
- Zeilen 43–44: `899 €` → `aktueller Business-Paketrahmen`
- Weitere Basis/Business/Premium-Regeln folgen direkt danach (ca. Zeilen 45–85), z. B. `Basis ab 499 €` → `Start nach aktueller Paketlogik`.
- Die Funktion wird in `controllers/slugController.js:3`, `controllers/industriesController.js:6`, `controllers/leistungenController.js:7`, `controllers/ratgeberController.js:7`, `controllers/blogController.js:2`, `controllers/faqController.js:7`, `controllers/chatController.js:5` und `services/blogPostPresentationService.js:5` eingebunden. Sie wirkt also auf Branchen-, Ratgeber-, Blog-, FAQ- und Chat-Ausgaben.
- Nebeneffekt: Die Regex in Zeile 41 `(?<![\d.])499\s*€` trifft **nicht** auf `499,00 €`. Deshalb stehen auf `/handwerker` Platzhalter **und** alte Preise nebeneinander (siehe C2).

**Exakte Phrasen, die live erscheinen:** „nach aktueller Paketlogik“, „aktueller Paketpreis“, „aktueller Business-Paketrahmen“, „nach aktuellem Paketumfang“.

**So erscheinen sie live (Beispielsätze aus dem ausgelieferten HTML):**
1. `/branchen/webdesign-cafe`, **Title-Tag**: „Café Website erstellen lassen Berlin | Webdesign nach aktueller Paketlogik“. Im Fließtext: „Die Antwort: mit einer professionellen Café-Website nach aktueller Paketlogik“
2. `/handwerker`, Hero: „Wir designen, programmieren, hosten und warten deine Handwerker Website Berlin – komplett ab **aktueller Paketpreis Festpreis**.“ H3: „Festpreis von **aktueller Paketpreis** + 4,99 €/Monat für Hosting“
3. `/ratgeber/professionellen-website-vs-baukasten`: „Budgets: ab aktueller Paketpreis (Basis), aktueller Business-Paketrahmen (Business), 1.499 € (Premium) – fair kalkuliert …“
4. `/ratgeber/kosten-einfache-website`: „Basis (aktueller Paketpreis) 1–3 Seiten – ideal zum Start … Business (aktueller Business-Paketrahmen) 4–6 Seiten“
5. `/branchen` (Hub), Kartentitel: „Tattoo Studio Website erstellen lassen Berlin - nach aktueller Paketlogik professionell“

**Betroffene Titles laut Crawl (7):** `/branchen/webdesign-beautysalon`, `-blumenladen`, `-cafe`, `-fotograf`, `-physiotherapie`, `-reinigung`, `-tattoo`. Betroffene Meta-Descriptions: `/branchen/webdesign-arzt`, `/ratgeber/professionellen-website-vs-baukasten`.

**SXO-Folge:** In der SERP liest die Café-Inhaberin „nach aktueller Paketlogik“. Das ist eine Nicht-Antwort auf ihre Preisfrage. Im Suchindex steht zudem noch der alte Titel „günstig ab 499€ ☕“, die Seite selbst nennt aber 799 €. Damit gibt es Erwartungsbruch und Vertrauensverlust beim Klick.

**Messung (einmalig, 23.10.2026):** Rohabruf mit dem Plugin-Renderer (`--mode never`) von **137 eindeutigen URLs** aus `crawl.json`. Von den 197 gecrawlten URLs habe ich Query-Varianten (`?page=`, `?cat=`, `?paket=`, `?projektart=`), Prozent-kodierte Dubletten, Rechtstexte, Swipe-&-Cook-Seiten und `/demo/` ausgeschlossen. Gezählt habe ich die Treffer der Regex `aktuelle[rn]? (Paketlogik|Paketpreis|Paketumfang|Business-Paketrahmen)` im sichtbaren Text inklusive `<title>`.
**Ergebnis: 31 von 137 Seiten enthalten Platzhalterphrasen.**

| Treffer | URL |
|---|---|
| 10 | /ratgeber/professionellen-website-vs-baukasten |
| 8 | /branchen |
| 7 | /blog/von-traffic-zu-terminen |
| 4 | /blog/website-checkliste-für-selbstandige |
| 4 | /blog/webdesign-lichtenberg-berlin |
| 4 | /blog/full-service-webdesign-in-berlin |
| 4 | /blog/Landingpages-Webshop-Webdesign-Berlin |
| 3 | /handwerker (zusätzlich 3× alte Preise 499,00 / 899,00 / 1500,00 €) |
| 3 | /blog/eigener-website-chatbot |
| 2 | /ratgeber/website-kosten-zeitplan |
| 2 | /ratgeber/kosten-einfache-website |
| 2 | /branchen/webdesign-tattoo |
| 2 | /branchen/webdesign-reinigung |
| 2 | /branchen/webdesign-physiotherapie |
| 2 | /branchen/webdesign-fotograf |
| 2 | /branchen/webdesign-cafe |
| 2 | /branchen/webdesign-blumenladen |
| 2 | /branchen/webdesign-beautysalon |
| 2 | /blog/webdesign-berlin-warum-eine-website-fuer-unternehmen-unverzichtbar-ist |
| 2 | /blog/local-seo-berlin-fuer-freelancer |
| 2 | /blog/immobilienmakler-website-erstelle |
| 1 | /webdesign-berlin/kosten-preise-pakete |
| 1 | /blog/GA4-Tracking-Framework |
| 1 | /ratgeber |
| 1 | /branchen/webdesign-wellness |
| 1 | /branchen/webdesign-steuerberater |
| 1 | /branchen/webdesign-restaurant |
| 1 | /branchen/webdesign-immobilienmakler |
| 1 | /branchen/webdesign-hebamme |
| 1 | /branchen/webdesign-fitnesscoach |
| 1 | /branchen/webdesign-autowerkstatt |

Das betrifft alle 17 Branchenseiten bzw. den Hub, 4 von 11 Ratgeber-Seiten und 12 Blogposts.

**Fix:**
1. Den Rewriter nicht mehr einsetzen, um Preise zu „neutralisieren“. Stattdessen die **Quellinhalte** (DB/EJS) korrigieren und konkrete aktuelle Werte aus *einer* zentralen Paket-Konfiguration einsetzen: Start ab 799 €, Business ab 1.499 €, Wachstum ab 2.499 €, Individuell ab 3.500 €.
2. Übergangsweise die Ersetzungsziele in den Zeilen 33–44 und den Folgeregeln so ändern, dass echte Werte herauskommen. Beispiel für Zeile 33: `'Café Website erstellen lassen Berlin | ab 799 €'`. Die Regeln `499 €` bzw. `899 €` durch die Werte ersetzen, die zum gemeinten Paket gehören, oder den Preisteil des Satzes ganz entfernen.
3. Einen Regressionstest ergänzen, der bei `/aktuelle[rn]? Paket(logik|preis|umfang)|Business-Paketrahmen/` im gerenderten HTML aller Branchen-, Ratgeber- und Blog-Routen fehlschlägt.
4. Danach `/branchen/webdesign-cafe` und `/branchen/webdesign-blumenladen` in der Search Console zur Neuindexierung einreichen, damit der alte Index-Titel „ab 499€“ verschwindet.

#### C2: `/handwerker` hat einen kaputten Preisblock, sichtbaren HTML-Kommentar und unbelegte Erfolgsversprechen

**Beleg (gerendert, mobil):**
- H1: „Handwerker-Website erstellen lassen in Berlin : In 30 Tage bis zu 128 % mehr Aufträge“. Grammatikfehler („30 Tage“), Leerzeichen vor dem Doppelpunkt und eine unbelegte Zahl.
- KPI-Kacheln: „+128% mehr Kunden erreichen“, „+34 % mehr Umsatz im Durchschnit“ (Tippfehler), „7 × mehr qualifizierte Gespräche“, „Laut Google erzielen Betriebe, die eine Website günstig erstellen lassen, trotzdem bis zu 8 % mehr Conversion“. Für keine dieser Angaben gibt es eine Quelle.
- Paketkarten: „**Standart** Paket 499,00 €“, „Business Paket 899,00 €“, „Premium Paket 1500,00 €“. Gültig sind laut `/pakete` aber 799 / 1.499 / 2.499 / 3.500 €. Die „Details“-Buttons führen auf Seiten mit anderen Preisen.
- Als Text sichtbar: `<!-- Preis -->`, `<!-- Bullet‑Points -->`, `<!-- Button -->`. Im HTML steht das escaped als `&lt;!-- Preis --&gt;`. „OnePage Website“ steht in derselben Liste doppelt.
- Widersprüchliche Zeitangaben: „in 30 Tagen live“ und „In nur zwei Wochen kannst du … online sein“.
- Keyword-Stuffing: „Suchst du gerade nach Website erstellen kosten, Homepage erstellen lassen Preis oder Internet­seite kosten?“
- Die Startseite sagt dagegen „Nicht ideal, wenn du … garantierte Kundengewinnung erwartest“.
- Laut Crawl hat die Seite nur 1 internen Inlink und liegt nicht unter `/branchen/`. Sie konkurriert mit `/ratgeber/website-fuer-handwerker-berlin` (519 Wörter).

**SXO-Folge:** Die SERP für „Handwerker Website erstellen lassen Berlin“ ist voll mit Festpreis-Angeboten (299–1.499 €). Diese Seite ist im Such-Tool sichtbar, wirkt beim Klick aber unfertig und unseriös. Die Zahlenversprechen sind außerdem wettbewerbsrechtlich riskant (Irreführung). Das ist ein Hinweis, keine Rechtsberatung.

**Fix:** Die Seite nach dieser SOLL-Struktur neu aufsetzen:
1. Hero mit H1 „Handwerker-Website erstellen lassen in Berlin – Festpreis ab 799 €“, Untertitel „Für Betriebe mit veralteter Website: Relaunch inkl. Weiterleitungen ab 1.499 €“, CTAs „Kostenlose Ersteinschätzung“ → `/kontakt?projektart=webdesign` und „Bestehende Website prüfen“ → `/website-tester`.
2. Block „Was Handwerkskunden auf deiner Seite suchen“: Leistungen, Einsatzgebiet, Notdienst/Telefon, Fotos, Bewertungen.
3. Die echte Paket-Komponente von `/pakete` einbinden statt der hartcodierten Karten.
4. Eine Referenz mit Bewertungs-Zitat: TM Sauber & Mehr (Relaunch, Dienstleister) als nächstliegendes Beispiel.
5. Ablauf mit *einer* realistischen Zeitangabe.
6. FAQ mit Kosten, Dauer, Pflege und der Frage „Was passiert mit meiner alten Seite?“

Alle Prozentangaben streichen. Danach die Seite von `/branchen`, `/webdesign-berlin` (Abschnitt Branchen) und `/leistungen/website-relaunch` verlinken. Den Ratgeber `/ratgeber/website-fuer-handwerker-berlin` als informationelle Seite abgrenzen (Title ohne „erstellen lassen“) und auf `/handwerker` verlinken.

### HIGH

#### H1: Kannibalisierung bei „website erstellen lassen berlin“ und „webdesign berlin“

**Beleg:** Drei indexierbare Seiten haben fast die gleiche H1:
- `/`: „Website erstellen lassen in Berlin – persönlich, SEO-freundlich und aus einer Hand“
- `/webdesign-berlin`: „Website erstellen lassen in Berlin“ (Title „Website erstellen lassen Berlin | Webdesign & Preise“)
- `/pakete`: „Website erstellen lassen in Berlin: Pakete ab 799 €“

Dazu kommen `/ratgeber/website-erstellen-berlin-ablauf-dauer-kosten`, `/blog/full-service-webdesign-in-berlin` („Full-Service Webdesign Berlin“) und `/blog/webdesign-berlin-warum-…`. Die SERP für „webdesign berlin“ besteht zu 9/9 aus Service-Seiten, deren Title mit „Webdesign Berlin“ beginnt (kopfundstift, webneo, homepage-helden, wedeon …). Keine Seite der Domain trägt „Webdesign Berlin“ als Title-Anfang.

**Fix (Zuständigkeiten festlegen):**
- `/webdesign-berlin` → Keyword „webdesign berlin“. Title: „Webdesign Berlin für kleine Unternehmen | ab 799 € – Komplett Webdesign“. H1: „Webdesign in Berlin für Selbstständige und kleine Unternehmen“.
- `/` → Brand plus „website erstellen lassen berlin“. Die H1 kann bleiben.
- `/pakete` → „website pakete preise berlin“. H1: „Website-Pakete & Preise: Start ab 799 €, Business ab 1.499 €“.
- Die Blogposts mit Head-Terms im Title auf einen informationellen Winkel umstellen (z. B. „Warum kleine Unternehmen eine eigene Website brauchen“) oder per 301 zusammenführen.

#### H2: Kosten-Keyword ist fragmentiert und passt nur teilweise zum Seitentyp (6 konkurrierende Seiten)

**Beleg:** Die SERP „homepage erstellen lassen kosten“ besteht zu etwa 90 % aus bundesweiten Kostenratgebern mit „2026“ im Title. Sie enthalten Marktspannen (Onepager ca. 1.000–3.500 €, KMU-Website 3.000–8.000 €), den Vergleich Baukasten vs. Freelancer vs. Agentur und teils einen Rechner (webfeinschliff „Preise & Rechner“). Auf der Domain konkurrieren:
- `/webdesign-berlin/kosten-preise-pakete` (1.948 Wörter, Hybrid, nur Berlin und eigene Pakete)
- `/ratgeber/website-kosten-berlin` (727)
- `/ratgeber/kosten-einfache-website` (373, mit Platzhaltern)
- `/ratgeber/website-kosten-zeitplan` (432, Title „Website-Kosten **2025**“, mit Platzhaltern)
- `/blog/website-kosten-2025-einfach-erklaert` (735)
- `/leistungen/laufende-kosten-website` (1.983)

**Fix:** Die drei dünnen Kostenseiten und den Blogpost zu **einem** Ratgeber „Homepage erstellen lassen: Kosten 2026 – Baukasten, Freelancer oder Agentur?“ zusammenführen und die alten URLs per 301 umleiten. Inhalt:
- Marktpreistabelle nach Projekttyp (Onepager / 5–10 Seiten / Shop) und Anbieterart
- die eigenen Pakete als *eine* Zeile
- einmalige vs. laufende Kosten (auf `/leistungen/laufende-kosten-website` verlinken)
- einen einfachen Kostenrechner (die Tool-Infrastruktur ist mit `/website-tester` schon da)
- FAQ

`/webdesign-berlin/kosten-preise-pakete` bleibt die kommerzielle Preisseite für „webdesign preise berlin“.

#### H3: `/webdesign-kleine-unternehmen-berlin` ist zu dünn für eine SERP voller Einzelanbieter

**Beleg:** Gerendert hat die Seite 365 Wörter (Crawl: 407) und 1 internen Inlink. Sie hat keinen Preis, keine Referenz und keine Bewertung (grep auf „799“/„Bewertung“: nur Navigation und Erwähnungen). Die SERP „webdesigner berlin kleine unternehmen“ zeigt dagegen persönliche Anbieter mit klaren Belegen: „seit 2014 selbstständig … fester Ansprechpartner“ (webdesign-service.berlin), Festpreise (lisakoch.de: 2.490 €, webdesignfreelancerberlin.de: 1.932 €). Die Startseite deckt genau das bereits ab (Title „… | Websites für kleine Unternehmen“, Person-Schema, Google-Bewertungen).

**Fix:** Entweder per 301 auf `/` umleiten, was ich empfehle, weil das Einzelunternehmer-Profil dort am stärksten ist. Oder die Seite auf mindestens 1.200 Wörter ausbauen mit Sören-Profil, Preisanker, 2 Referenzen, Bewertungs-Zitaten und dem Abschnitt „Warum ein Einzelunternehmer statt Agentur“, und sie aus Navigation und Footer verlinken.

#### H4: Die englische Persona bricht in der Customer Journey ab

**Beleg:**
- `/en/pakete`, `/en/pakete/start|business|wachstum|individuell` stehen auf `noindex` und liefern deutsche Titles und H1, z. B. „Business-Paket für kleine Unternehmen“ auf `/en/pakete/business`.
- `/en/webdesign-berlin` (1.804 Wörter) und `/en` sagen **an keiner Stelle**, dass die Projektkommunikation auf Englisch läuft (grep „English“: 0 Treffer).
- Die EN-Bezirksseiten haben 503–521 Wörter, nur BreadcrumbList-Schema und 2 Inlinks.
- Die EN-SERP belohnt explizite Sprachsignale: „fluent in both German and English“ (cconnect), „native English speaking“ (Dokument Studio).

**Fix:**
1. Die EN-Paketseiten übersetzen, auf `index` stellen und hreflang-Paare setzen.
2. Im Hero von `/en` und `/en/webdesign-berlin` eine Trust-Zeile ergänzen: „Project communication, quotes and invoices in English – no German required“.
3. Ein englisches Testimonial oder Fallbeispiel ergänzen.
4. Die EN-Bezirksseiten ausbauen oder in `/en/webdesign-berlin` konsolidieren.

### MEDIUM

#### M1: Café-Seite nutzt die eigene Café-Referenz nicht

**Beleg:**
- `/branchen/webdesign-cafe` enthält keinen Verweis auf `/referenzen/zur-alten-backstube` (grep „Backstube“: 0 Treffer). Die passende Google-Bewertung („Es ist jetzt viel einfacher Tische zu reservieren …“) steht nur auf der Startseite.
- Der Text ist generisch: „Gerade in Städten wie Berlin, Hamburg oder München …“.
- Die H1 „Café Website erstellen“ enthält weder „lassen“ noch „Berlin“. Die H2 „Warum eine Website für Café unverzichtbar ist?“ ist grammatisch falsch.
- `/webdesign-cafe/kosten` hat 309 Wörter und 1 Inlink.
- Positiv: Der Hero nennt korrekt „Start ab 799 €“, und der Abschnitt „Was kostet eine professionelle Café-Website 2026?“ ist konkret.

**Fix:**
- H1: „Café-Website erstellen lassen in Berlin – mit Speisekarte und Reservierung“.
- Direkt nach dem Hero einen Block „Echtes Beispiel: Zur alten Backstube“ mit Screenshot, Bewertungs-Zitat und Link zur Referenz einbauen.
- Den Text auf Berlin-Kieze und Café-Alltag umschreiben.
- `/webdesign-cafe/kosten` als Abschnitt integrieren (301) oder prominent verlinken.

#### M2: Bezirksseiten (Beispiel Kreuzberg) ohne lokale Belege, Schema suggeriert eine Filiale

**Beleg:**
- `/webdesign-berlin/kreuzberg` nennt „Kreuzberg“ häufig, hat aber kein Kreuzberger Projekt, keine Adresse und keine Karte.
- Das Schema `ProfessionalService` mit dem Namen „Komplett Webdesign Kreuzberg“ hat keine `address`. Der Firmensitz ist laut Impressum Möllendorffstr. 26, 10367 Berlin (Lichtenberg).
- Die SERP zeigt Anbieter mit echtem Kreuzberg-Bezug (eigene Räume, Kreuzberg-Referenzen) und Verzeichnisse (dasoertliche, 11880, trustlocal „Top 10 Webdesigner Kreuzberg“).

**Fix:**
- Die Schema-Entität in „Komplett Webdesign“ umbenennen und `areaServed: Kreuzberg` setzen, damit keine Filiale suggeriert wird.
- Pro Bezirksseite ein echtes Projekt oder Kundenprofil aus dem Bezirk nennen oder ehrlich formulieren: „Sitz in Lichtenberg, Termine vor Ort in Kreuzberg“.
- Einträge in den rankenden Verzeichnissen anlegen (trustlocal, 11880, Das Örtliche). Für die Vertiefung `/seo local` nutzen.

#### M3: NAP-Inkonsistenz zwischen Impressum und Google-Maps-Link

**Beleg:**
- Impressum: Möllendorffstr 26, 10367 Berlin.
- Der Button „Alle Bewertungen bei Google ansehen“ auf `/` verlinkt einen Maps-Eintrag mit den Koordinaten `!3d52.45906!4d13.0157992`, also im Raum Potsdam/Werder und nicht in Lichtenberg. Das habe ich nur aus der URL abgeleitet, das Unternehmensprofil selbst habe ich nicht geprüft.
- Das `Organization`-Schema auf `/` hat keine `address`.

**Fix:** Den GBP-Standort bzw. das Servicegebiet prüfen. `PostalAddress`, `geo` und `sameAs` (GBP-URL) im Organization- bzw. LocalBusiness-Schema ergänzen. → `/seo local`.

#### M4: Aktualitätssignale veraltet

**Beleg:**
- Titles mit „2025“: `/ratgeber/website-kosten-zeitplan`, `/blog/website-kosten-2025-einfach-erklaert`, `/blog/barrierefreiheit-2020-websites-leitfaden` („… 2025“), `/blog/Google-AI-Mode-und-AI-Overviews` („SEO 2025“), `/blog/wordpress-2025-…`, `/blog/wordpress-68`.
- Kosten-SERP-Titles tragen durchgehend „2026“.
- Der alte Index-Titel für die Café-Seite enthält noch „ab 499€“.

**Fix:** Die evergreen-relevanten Seiten inhaltlich aktualisieren und auf 2026 umstellen. Reine News-Posts (WordPress 6.8) nicht hochdatieren, sondern intern weniger prominent verlinken.

#### M5: Relaunch-Service passt, aber Dauer ist vage und es gibt Kannibalisierung

**Beleg:**
- `/leistungen/website-relaunch` ist passend und enthält Preise ab 1.499 / 2.499 / 3.500 € sowie Weiterleitungen.
- Zur Dauer steht dort nur: „Kleinere Relaunches dauern oft einige Wochen.“ Wettbewerber nennen „6–10 Wochen, komplexere 10–14 Wochen“.
- Parallel bestehen `/ratgeber/website-relaunch-berlin` (Title „Website-Relaunch **Berlin**: Wann lohnt sich ein Neustart?“) und 5 Relaunch-Blogposts mit meist 1 Inlink.

**Fix:**
- Konkrete Zeitspannen je Paket nennen.
- Die Referenz TM Sauber & Mehr als Vorher/Nachher-Fall direkt einbinden.
- Den Ratgeber-Title ohne „Berlin“-Head-Term formulieren (z. B. „Website-Relaunch: Wann lohnt sich ein Neustart?“).
- Alle Relaunch-Posts mit Ankertext „Website-Relaunch in Berlin“ auf die Service-Seite verlinken.

### LOW

- **L1:** `/webdesign-berlin` nutzt Stockfotos („Bild: MART PRODUCTION / Pexels“, „Alena Darmel / Pexels“). Die Wettbewerber zeigen Portfolio. **Fix:** Durch eigene Projekt-Screenshots oder ein Porträt ersetzen.
- **L2:** 11 Branchenseiten (z. B. `/branchen/webdesign-arzt`, `-friseur`, `-steuerberater`) stehen laut Crawl nicht in der Sitemap und haben nur 1 Inlink (den Hub). **Fix:** In die Sitemap aufnehmen und aus thematisch passenden Ratgeber- und Blogseiten verlinken. Vorher C1 beheben.
- **L3:** `/handwerker` liegt außerhalb des Schemas `/branchen/webdesign-*`. **Fix:** Optional per 301 auf `/branchen/webdesign-handwerker` umziehen, damit Hub-Logik und Breadcrumb konsistent sind.

---

## User Stories (aus SERP-Signalen abgeleitet)

1. **Awareness/Consideration:** Als *Café-Inhaberin mit kleinem Budget* möchte ich schnell sehen, was eine Café-Website mit Speisekarte und Reservierung kostet, weil ich jeden Euro zweimal umdrehe. Mich blockiert **Preisunsicherheit**: In der SERP steht bei dieser Domain „nach aktueller Paketlogik“ bzw. im Index noch „ab 499€“.
   *Signale: Query „Café Website erstellen lassen Berlin“ mit Preis-Titles bei Wettbewerbern („ab 1.499€ in 14 Tagen“, „Landingpage ab 499,99 €“) und Feature-Listen „Speisekarte, Reservierung, Allergene“.*
2. **Consideration:** Als *Handwerksbetrieb mit veralteter Website* möchte ich einen Festpreis und einen realistischen Zeitplan, weil ich keine Zeit für Agentur-Pingpong habe. Mich blockiert eine **Vertrauenslücke**: übertriebene Versprechen und widersprüchliche Preise.
   *Signale: Query „Handwerker Website erstellen lassen Berlin Preis“ mit Ergebnissen voller Festpreise (299–1.499 €), Mietmodell „ab 39,90 €“ und Fachartikel bau.net zu Ladezeit, Mobil und lokaler Auffindbarkeit.*
3. **Decision:** Als *Kleinunternehmer, der Anbieter vergleicht*, möchte ich einen festen persönlichen Ansprechpartner mit nachweisbaren Referenzen, weil ich bei Agenturen Angst vor Weiterreichen habe. Mich blockiert **Vergleichsmüdigkeit** bei vielen ähnlichen Anbietern.
   *Signale: „webdesigner berlin kleine unternehmen“ mit Freelancer-Dominanz („seit 2014 selbstständig“, „fester Ansprechpartner“) und Verzeichnisprofilen (dasauge, sortlist).*
4. **Awareness:** Als *Gründer, der Kosten recherchiert*, möchte ich Marktpreise nach Projekttyp und Anbieterart verstehen, bevor ich Angebote einhole, weil ich nicht übervorteilt werden will. Mich blockiert eine **Informationslücke**: Anbieterseiten zeigen nur eigene Pakete.
   *Signale: „homepage erstellen lassen kosten“ mit ca. 90 % Kostenratgebern mit „2026“, Spannentabellen und Rechner-Titles („Preise & Rechner“).*
5. **Consideration/Decision:** Als *englischsprachiger Gründer in Berlin* möchte ich sicher sein, dass das ganze Projekt auf Englisch läuft, weil ich deutsche Verträge und Rechtstexte schlecht einschätzen kann. Mich blockiert eine **Sprach- und Vertrauensbarriere**.
   *Signale: EN-Query mit Treffern, die explizit „fluent in German and English“ und „native English speaking“ betonen, dazu Listicles („Top 10 … Berlin“, goodfirms).*

---

## Persona-Scoring

| Persona | Zielseite | Relevanz | Klarheit | Vertrauen | Aktion | Gesamt | Rating |
|---|---|---|---|---|---|---|---|
| Handwerksbetrieb mit veralteter Seite | `/handwerker` | 16/25 | 6/25 | 5/25 | 11/25 | **38** | Critical Mismatch |
| Englischsprachiger Gründer | `/en/webdesign-berlin` → `/en/pakete` | 17/25 | 15/25 | 11/25 | 10/25 | **53** | Needs Work |
| Café-Inhaberin, kleines Budget | `/branchen/webdesign-cafe` | 18/25 | 13/25 | 10/25 | 16/25 | **57** | Needs Work |
| Kosten-Recherchierer (bundesweit) | `/webdesign-berlin/kosten-preise-pakete` | 15/25 | 18/25 | 14/25 | 17/25 | **64** | Good |
| KMU-Inhaber vergleicht Berliner Anbieter | `/webdesign-berlin` | 21/25 | 20/25 | 14/25 | 20/25 | **75** | Good |

**Begründungen (Kurzform):**
- **Handwerk (38):**
  - *Relevanz* passt zum Thema, aber es gibt keinen Pfad „bestehende Seite erneuern“.
  - *Klarheit*: drei widersprüchliche Preisangaben (Platzhalter, 499/899/1500 € auf der Seite, 799/1.499/2.499 € auf `/pakete`), zwei Zeitangaben und sichtbare HTML-Kommentare.
  - *Vertrauen*: unbelegte „+128 %“ und „+34 % Umsatz“, „Standart Paket“, keine Handwerksreferenz.
  - *Aktion*: „Termin buchen“ → `/kontakt`, „Details“ führt auf Paketseiten mit anderen Preisen.
- **EN-Gründer (53):**
  - *Relevanz* und *Klarheit* sind auf `/en/webdesign-berlin` solide.
  - *Vertrauen*: kein Sprachversprechen, die Bewertungen sind deutsch.
  - *Aktion*: Der Klick auf „Packages“ landet auf deutschsprachigen `noindex`-Seiten.
- **Café (57):**
  - *Relevanz* ist gut (Speisekarte, Reservierung, Allergene).
  - *Klarheit*: Der Preis im Hero ist korrekt, aber Title und SERP-Snippet sind Platzhalter bzw. veraltet, und der Text ist generisch.
  - *Vertrauen*: Die vorhandene Café-Referenz und das Café-Review fehlen auf der Seite.
  - *Aktion*: „Beratungsgespräch vereinbaren“ ist generisch, es gibt keinen Café-spezifischen CTA.
- **Kosten-Recherchierer (64):**
  - Die Preislogik ist klar, und es gibt Beispielrechnungen.
  - Es fehlen ein Marktvergleich, „2026“ und ein Rechner, und die Seite ist auf Berlin beschränkt.
- **KMU-Vergleicher (75):**
  - Die Preise stehen im Hero, „Passt/Passt nicht“-Kriterien sind da, die CTAs sind klar.
  - *Vertrauen* leidet unter Stockfotos, und Bewertungen fehlen auf der Seite selbst.

**Schwächste Persona: Handwerksbetrieb (38).** Fix siehe C2. Die SOLL-Struktur dort ist konkret: Hero mit 799 €, Relaunch-Pfad, echte Paket-Komponente, Referenz und FAQ „Was passiert mit meiner alten Seite?“.

**Systemisches Problem:** Die Dimension **Vertrauen** ist bei allen Personas die schwächste (Ø 10,8/25). Echte Belege (Bewertungen, Referenzen) sind vorhanden, stehen aber nur auf der Startseite und auf `/referenzen` und werden auf den Ziel-Landingpages nicht ausgespielt.

**Prioritäten:**
1. C1 und C2 beheben (Platzhalter und `/handwerker`). Danach Neuindexierung beantragen.
2. Einen Trust-Baustein (Bewertungs-Zitat und passende Referenz) als Partial in `/webdesign-berlin`, alle `/branchen/*`, die Bezirksseiten und `/en/webdesign-berlin` einbinden.
3. Die EN-Paketseiten übersetzen und indexierbar machen, dazu das Sprachversprechen im EN-Hero (H4).
4. Die Kosten-Ratgeber konsolidieren (H2) und die Keyword-Zuständigkeit für „webdesign berlin“ und „website erstellen lassen berlin“ festlegen (H1).

---

## Querverweise

- E-E-A-T bzw. unbelegte Claims (`/handwerker`, Branchen-Statistiken) → `/seo content`
- Organization bzw. LocalBusiness mit Adresse und `ProfessionalService`-Benennung → `/seo schema`
- GBP-Standort, NAP und Verzeichniseinträge (Kreuzberg-SERP) → `/seo local`
- Dünne Seiten (`/webdesign-kleine-unternehmen-berlin`, `/webdesign-cafe/kosten`, EN-Bezirke) → `/seo page`
- PDF-Bericht: `/seo google report`

## Grenzen dieser Analyse

- **Keine echte Google.de-SERP.** Das Such-Tool ist US-basiert und nicht identisch mit Google. Local Pack, People Also Ask, Anzeigen, Featured Snippets und AI Overviews waren nicht sichtbar. Die User Stories stützen sich deshalb auf Ergebnis-Titles, Snippets und Anbieteraussagen statt auf PAA und Ads.
- **Keine Rankingpositionen.** Die eigene Google-Position konnte ich für keines der Keywords sicher feststellen. Die Treffer für `/handwerker` und `/branchen/webdesign-cafe` im Such-Tool sind keine Google-Positionen. Bei einer Brand-Suche („Komplett Webdesign Berlin“) erschien die Domain im Tool nicht. Auch das sagt über Google nichts Sicheres aus.
- Ich hatte keine Search-Console-, Analytics- oder Suchvolumendaten. Die Persona-Gewichtung ist geschätzt.
- Die Platzhalter-Messung deckt 137 eindeutige URLs per Rohabruf ab. Query-Varianten, Rechtstexte, Swipe & Cook und `/demo/` habe ich ausgeschlossen. Auch Chat-Antworten (`chatController`) nutzen den Rewriter, sie wurden aber nicht geprüft.
- Die Herkunft der `/handwerker`-Inhalte (DB vs. Template) habe ich nicht bis zur Zeile verfolgt. Eingebunden wird sie über `controllers/slugController.js` mit `normalizeLegacyPublicCopy`, einen Test gibt es in `tests/handwerkerContentScript.test.js`.
- Ein Wireframe war nicht angefordert und ist nicht enthalten. Die SOLL-Struktur für `/handwerker` steht unter C2.

---

## Strukturierte Findings (für audit-data.json, Kategorie „Search Experience“)

```json
{
  "category": "Search Experience",
  "sxo_gap_score": 56,
  "dimension_scores": {"page_type": 10, "content_depth": 9, "ux_signals": 8, "schema": 9, "media": 8, "authority": 7, "freshness": 5},
  "findings": [
    {"id": "SXO-C1", "severity": "critical", "title": "Platzhalterphrasen aus util/legacyPublicCopy.js live in Titles und Text", "evidence": "31/137 Seiten; z. B. Title /branchen/webdesign-cafe 'Café Website erstellen lassen Berlin | Webdesign nach aktueller Paketlogik'; /handwerker 'komplett ab aktueller Paketpreis Festpreis'", "location": "util/legacyPublicCopy.js:33-44 ff.", "fix": "Quellinhalte mit echten Paketpreisen aus zentraler Konfiguration korrigieren; Regressionstest auf Platzhalterphrasen; Reindex"},
    {"id": "SXO-C2", "severity": "critical", "title": "/handwerker: alte Preise 499/899/1500 €, sichtbare HTML-Kommentare, unbelegte +128 %-Versprechen", "evidence": "'Standart Paket 499,00 €', '<!-- Preis -->' als Text, H1 'In 30 Tage bis zu 128 % mehr Aufträge'", "location": "/handwerker (controllers/slugController.js)", "fix": "Seite nach SOLL-Struktur neu aufsetzen, Paket-Komponente von /pakete nutzen, Claims entfernen, intern verlinken"},
    {"id": "SXO-H1", "severity": "high", "title": "Kannibalisierung 'website erstellen lassen berlin' / 'webdesign berlin'", "evidence": "H1 auf /, /webdesign-berlin, /pakete fast identisch; kein Title beginnt mit 'Webdesign Berlin'", "fix": "Keyword-Zuständigkeiten festlegen, Titles/H1 differenzieren"},
    {"id": "SXO-H2", "severity": "high", "title": "Kosten-Keyword: 6 konkurrierende Seiten, Hybrid statt Kostenratgeber 2026", "evidence": "SERP ~90 % Kostenratgeber mit '2026'/Rechner; eigene Ratgeber 373–735 Wörter, teils '2025'", "fix": "Zu einem Ratgeber 'Kosten 2026' mit Marktvergleich und Rechner zusammenführen, 301"},
    {"id": "SXO-H3", "severity": "high", "title": "/webdesign-kleine-unternehmen-berlin zu dünn (365 Wörter, 1 Inlink)", "fix": "301 auf / oder auf mindestens 1.200 Wörter mit Profil, Preisen, Referenzen ausbauen"},
    {"id": "SXO-H4", "severity": "high", "title": "EN-Journey bricht ab: /en/pakete* noindex und deutsch, kein 'English'-Sprachversprechen", "fix": "EN-Paketseiten übersetzen und indexieren, Sprachversprechen im Hero, EN-Testimonial"},
    {"id": "SXO-M1", "severity": "medium", "title": "Café-Seite ohne eigene Café-Referenz, generischer Text, H1 ohne Berlin", "fix": "Block 'Zur alten Backstube' + Review-Zitat, H1 anpassen, /webdesign-cafe/kosten integrieren"},
    {"id": "SXO-M2", "severity": "medium", "title": "Bezirksseiten ohne lokale Belege; Schema 'Komplett Webdesign Kreuzberg' suggeriert Filiale", "fix": "Schema-Name korrigieren, echtes Bezirksprojekt, Verzeichniseinträge"},
    {"id": "SXO-M3", "severity": "medium", "title": "NAP: Impressum Lichtenberg vs. Maps-Link-Koordinaten Raum Potsdam; Organization ohne address", "fix": "GBP prüfen, PostalAddress/geo/sameAs ergänzen"},
    {"id": "SXO-M4", "severity": "medium", "title": "Veraltete Jahreszahlen (2025) in Titles; alter Index-Titel 'ab 499€'", "fix": "Evergreen-Seiten auf 2026 aktualisieren, Reindex"},
    {"id": "SXO-M5", "severity": "medium", "title": "Relaunch: Dauer vage, Kannibalisierung durch Ratgeber/Blog", "fix": "Konkrete Zeitspannen, TM-Sauber-&-Mehr-Fall, Ratgeber-Title ohne 'Berlin'"},
    {"id": "SXO-L1", "severity": "low", "title": "Stockfotos auf /webdesign-berlin", "fix": "Eigene Projekt-Screenshots/Porträt"},
    {"id": "SXO-L2", "severity": "low", "title": "11 Branchenseiten nicht in Sitemap, 1 Inlink", "fix": "Sitemap + kontextuelle Links (nach C1)"},
    {"id": "SXO-L3", "severity": "low", "title": "/handwerker außerhalb /branchen/-Schema", "fix": "Optional 301 auf /branchen/webdesign-handwerker"}
  ],
  "personas": [
    {"name": "Handwerksbetrieb mit veralteter Seite", "page": "/handwerker", "score": 38},
    {"name": "Englischsprachiger Gründer", "page": "/en/webdesign-berlin", "score": 53},
    {"name": "Café-Inhaberin mit kleinem Budget", "page": "/branchen/webdesign-cafe", "score": 57},
    {"name": "Kosten-Recherchierer", "page": "/webdesign-berlin/kosten-preise-pakete", "score": 64},
    {"name": "KMU-Inhaber vergleicht Anbieter", "page": "/webdesign-berlin", "score": 75}
  ]
}
```

## Quellen (SERP-Stichproben, abgerufen 23.10.2026)

[kopfundstift.de/webdesign-berlin](https://kopfundstift.de/webdesign-berlin/) · [webneo.de](https://www.webneo.de/webdesign-berlin/) · [homepage-helden.de](https://www.homepage-helden.de/webdesign-berlin/) · [wedeon.de](https://wedeon.de/webdesign-berlin/) · [netgenerator.de](https://www.netgenerator.de/) · [dailyseven.de](https://www.dailyseven.de/) · [space-rocket-berlin.de](https://www.space-rocket-berlin.de/) · [webdesign-helden.de](https://webdesign-helden.de/) · [selbststaendigkeit.de](https://selbststaendigkeit.de/news-marketing/website-erstellen-lassen-berlin/) · [sellwerk.de](https://sellwerk.de/website-erstellen-lassen-berlin) · [webdesign-service.berlin](https://webdesign-service.berlin/) · [lisakoch.de](https://lisakoch.de/webdesign-berlin/) · [webdesignfreelancerberlin.de](https://webdesignfreelancerberlin.de/0897-webdesign-fuer-kmu-berlin-starker-auftritt-fuer-kleine-unternehmen/) · [kopfundstift.de/webdesign-kosten](https://kopfundstift.de/webdesign-kosten/) · [webfeinschliff.de](https://www.webfeinschliff.de/ratgeber/was-kostet-eine-website/) · [experte.de](https://www.experte.de/homepage-erstellen/erstellen-lassen) · [123-berlin-design.de/website-relaunch](https://123-berlin-design.de/website-relaunch/) · [dailyseven.de/website-relaunch-berlin](https://www.dailyseven.de/website-relaunch-berlin/) · [jungmut.com](https://www.jungmut.com/blog/was-kostet-ein-website-relaunch/) · [komplettwebdesign.de/handwerker](https://www.komplettwebdesign.de/handwerker) · [handwerker-website-erstellen-lassen.de](https://handwerker-website-erstellen-lassen.de/) · [hauptstadt-homepage.de](https://www.hauptstadt-homepage.de/) · [bau.net](https://bau.net/text/260325-webseite-handwerker) · [komplettwebdesign.de/branchen/webdesign-cafe](https://www.komplettwebdesign.de/branchen/webdesign-cafe) · [restaurant-webdesign.com](https://restaurant-webdesign.com/) · [netgenerator.de Gastronomie](https://www.netgenerator.de/referenzen/restaurants-und-gastronomie/) · [cm-webmedia.de/webdesign-kreuzberg](https://www.cm-webmedia.de/webdesign-kreuzberg) · [trustlocal.de Kreuzberg](https://trustlocal.de/berlin/berlin-kreuzberg/webdesign/) · [dasoertliche.de](https://www.dasoertliche.de/Themen/Website-Design/Berlin-Seite-17.html) · [cconnect-webdesign.de](https://cconnect-webdesign.de/webdesign-agency/) · [sebastian-klammer.de/en](https://sebastian-klammer.de/en/web-design-berlin/) · [goodfirms.co](https://www.goodfirms.co/directory/city/top-web-design-companies/berlin)
