# Startseiten-Check www.komplettwebdesign.de

**Datum:** 23.10.2026, nachmittags · **Werkzeug:** claude-seo 2.5.0 (`seo-page`) · **Geprüft:** Live-Version inklusive der heute ausgerollten Audit-Korrekturen

## Score

```
Gesamt:            80/100

On-Page-SEO:       78/100  ████████░░
Inhaltsqualität:   76/100  ████████░░
Technik:           82/100  ████████░░
Schema:            85/100  █████████░
Bilder:            82/100  ████████░░
```

Gewichtung wie im Gesamtaudit (On-Page 20, Inhalt 23, Technik 22, Schema 10, Bilder 5), auf 100 % normiert.

## Seit dem Audit heute Morgen behoben (live bestätigt)

- Personen-Absatz unter der H1 („Ich bin Sören Blocksdorf …“) mit Link auf /about
- Schema als verknüpfter Graph: `Organization` + `ProfessionalService` mit Adresse, `hasMap`, `founder`; `Person`, `Service`, `WebPage` mit festen @id auf www
- `dateModified` fest (2026-10-23) statt Abrufzeitpunkt
- Telefonnummer vereinheitlicht (+49 155 11245048), NAP-Block mit Google-Profil im Footer
- Cookie-Banner serverseitig gerendert und kompakt (mobil ca. 13 % statt 36 % des ersten Screens), Chat-Button verdeckt nichts mehr
- `heroBg.webp` 88 KB statt 883 KB; Bewertungssterne mit `role="img"`; Logo ohne `role="presentation"`
- H1 jetzt „Persönliche Websites für kleine Unternehmen in Berlin“; `/webdesign-berlin` besetzt „Webdesign Berlin“, `/pakete` die Preise. Die Kannibalisierung mit diesen Seiten ist aufgelöst.

## Offene Punkte

### High

**1. Startseite und `/webdesign-kleine-unternehmen-berlin` zielen auf dieselbe Suchanfrage**
- Startseite: Titel „… | Websites für kleine Unternehmen“, H1 „Persönliche Websites für kleine Unternehmen in Berlin“, 1.634 Wörter.
- Unterseite: Titel „Webdesign für kleine Unternehmen in Berlin“. Laut Audit hat sie 407 Wörter und 1 internen Link, und die Startseite verlinkt sie nicht.
- **Fix:** Die Unterseite per 301 auf die Startseite leiten, weil die Startseite das Thema vollständig abdeckt. Alternativ der Unterseite eine klar andere Intention geben, etwa „Checkliste/Ratgeber: Website für kleine Unternehmen“, und sie von der Startseite verlinken.

**2. Kein Handlungsaufruf im ersten mobilen Screen**
- Auf 375 × 812 belegt die H1 fünf Zeilen. Darauf folgen der Personen-Absatz und die fette Unterzeile. Die Buttons „Beratungsgespräch anfragen“ und „Pakete ansehen“ liegen erst unter dem Fold.
- **Fix:** Die H1 mobil kleiner setzen (etwa `clamp(2rem, 8vw, 3rem)`). Den Personen-Absatz und die Unterzeile zu einem Absatz zusammenführen (siehe 3). Die Buttons direkt danach platzieren.

### Medium

**3. Doppelte Aussage oben, und ein Satz ist als H2 ausgezeichnet**
- „Ich begleite kleine Unternehmen von der Planung bis zur fertigen Website.“ und „Komplett Webdesign plant, gestaltet und betreut Websites für kleine Unternehmen in Berlin. …“ sagen fast dasselbe. Der zweite Satz ist das erste H2 der Seite.
- **Fix:** Beides zu einem Absatz (`<p>`) zusammenfassen, zum Beispiel: „Ich bin Sören Blocksdorf, Webdesigner in Berlin-Lichtenberg. Ich plane, gestalte und betreue Websites für kleine Unternehmen – mit Texten, SEO-Grundlage und Kontaktformular, auf Wunsch mit Hosting, Wartung, Buchungssystem oder Shop.“ So steht auch der eigene Bezirk einmal im Text, der bisher 0-mal vorkommt.

**4. Tippfehler im Preis-Satz der FAQ: „starten bei ab 1.499 €“, „bei ab 2.499 €“**
- **Ursache:** Der Platzhalter `{{price.business}}` liefert bereits „ab 1.499 €“, und der Satz in `controllers/mainController.js:22` setzt noch „bei“ davor. Das betrifft die sichtbare FAQ und das FAQPage-JSON-LD.
- **Fix:** Den Satz umformulieren, zum Beispiel „Business-Websites gibt es {{price.business}}, Wachstum-Projekte {{price.wachstum}} …“. Dasselbe Muster gibt es in `data/webdesignBerlinPage.js:339` („Start beginnt bei {{price.start}}“). In `data/maintenancePage.js:409` steht „bei ab 39 €/Monat“ sogar wörtlich im Text.

**5. FAQ „Warum starten die Pakete bei 799 €?“ beantwortet die Frage nicht**
- Die Antwort beschreibt nur die Technik (Node.js, EJS, kein Baukasten), nicht den Preis.
- **Fix:** Die Antwort mit dem Grund beginnen, zum Beispiel: „799 € deckt eine kompakte, individuell entwickelte Website mit X Seiten, Texten im vereinbarten Umfang, SEO-Grundlage und Kontaktformular ab. Das ist der kleinste Umfang, den ich ohne Baukasten sinnvoll umsetzen kann.“ Erst danach die Technik nennen.

**6. Keine Links zu Ratgebern und Blog**
- Von 45 Links im Hauptbereich gehen keine zu `/ratgeber/*` oder `/blog/*`.
- **Fix:** In der Paket- und FAQ-Sektion je einen Link auf „Was kostet eine Website in Berlin?“ (`/ratgeber/website-kosten-berlin`) und „Ablauf, Dauer und Kosten“ setzen. Das stärkt laut Cluster-Analyse die Kosten- und Ablauf-Cluster.

**7. Render-blockierendes CSS**
- 11 Stylesheets blockieren das Rendern, darunter `chat.min.css` und `booking-widget.min.css`, die oben nicht gebraucht werden. Jedes Stylesheet steht zusätzlich als `preload` im Head, was bei direkt folgendem `stylesheet` nichts bringt.
- **Fix:** Chat- und Booking-CSS nachladen (`media="print" onload="this.media='all'"`), die doppelten `preload`-Einträge entfernen und auf Dauer mehrere Dateien bündeln.

**8. Font Awesome lädt die Schrift doppelt**
- Die Schrift wird mit `?v=…` vorgeladen, `solid.min.css` referenziert sie aber ohne Version (`url(fa-solid-900.woff2)`). Das sind etwa 110 KB zusätzlich.
- **Fix:** Die Versionsangabe in der CSS-Referenz ergänzen oder den Preload an die CSS-URL anpassen.

### Low

- **`twitter:image`** zeigt auf `heroBg.webp` (Hintergrundbild), `og:image` auf das Hero-Mockup. Beide auf dasselbe Vorschaubild setzen.
- **Meta-Description** hat genau 160 Zeichen und keinen Preis. Vorschlag (148 Zeichen): „Persönliches Webdesign in Berlin: individuelle Websites für kleine Unternehmen ab 799 €, mit Texten, SEO-Grundlage und kostenloser Ersteinschätzung.“
- **Linktexte:** 4× „Details ansehen“ bei den Paketen. Besser „Start-Paket ansehen“ usw.
- **„Mehr über mich“** erscheint in Bootstrap-Blau (#0d6efd) statt in der Markenfarbe.
- **Logo-Bilder** (`LogoTransparent.webp`) ohne `width`/`height`. Das Begrüßungsbild ist noch JPG (179 KB), sollte WebP werden.
- **Kein `srcset`.** Das Hero-Mockup (72 KB) lädt mobil in Desktop-Größe. Das ist vertretbar, aber eine 600-px-Variante spart Daten.
- **Lesbarkeit:** Flesch-DE ca. 30 (schwer). Die Sätze sind kurz (Ø 11 Wörter), aber viele Wörter sind lang (Ø 2,4 Silben), etwa „Websiteerstellung“ oder „Leistungsumfang“. In Hero und Paketteil einfachere Wörter wählen. Der Wert ist eine Heuristik.
- **Überschriften:** Im Footer folgt ein H4 („Zum Newsletter anmelden“) direkt auf ein H2. Besser H2/H3 oder ein normaler Text.
- **Adresse:** „Möllendorffstr 26“ ohne Punkt. Die Schreibweise sollte überall identisch sein (Google-Profil, Verzeichnisse).
- **Vertrauen above the fold:** Bewertungen und Referenzen erscheinen erst weiter unten. Eine kurze Zeile unter den Buttons mit echter Google-Bewertung und -Anzahl würde helfen, aber nur mit echten Zahlen.

## Schema-Vorschlag

Die `Person` hat bisher kein `sameAs` und keine `description`. Ergänzung (nur Felder, die schon an anderer Stelle der Seite stehen):

```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": "https://www.komplettwebdesign.de/#person",
  "name": "Sören Blocksdorf",
  "jobTitle": "Webdesigner und Webentwickler",
  "description": "Webdesigner und Webentwickler in Berlin. Plant, gestaltet und betreut individuelle Websites für kleine Unternehmen.",
  "url": "https://www.komplettwebdesign.de/about",
  "worksFor": { "@id": "https://www.komplettwebdesign.de/#organization" },
  "sameAs": [
    "https://www.linkedin.com/in/komplettwebdesign",
    "https://www.instagram.com/komplettwebdesign",
    "https://www.youtube.com/@komplettwebdesign"
  ]
}
```

FAQPage ist weiter vorhanden. Es schadet nicht, bringt seit Mai 2026 aber keine Rich Results mehr. Ausbauen lohnt sich nicht.

## Belege

- Rohdaten: `raw.html`, `render.json`, `headers.txt`
- Screenshots: `shots/www_komplettwebdesign_de_mobile.png`, `shots/www_komplettwebdesign_de_desktop.png`

---

## Nachprüfung 23.10.2026, 20:10 Uhr

Geprüft wurde die Live-Startseite nach den Commits bis `3930875` auf `origin/main` (19:32). Der Gesamtscore bleibt bei **80/100**.

| # | Punkt | Status live | Status in `origin/main` |
|---|---|---|---|
| 1 | Überschneidung mit `/webdesign-kleine-unternehmen-berlin` | offen (200, nicht verlinkt, gleiches Thema) | offen |
| 2 | Kein Button im ersten Handy-Screen | offen (Screenshot `v2/shots/`) | offen |
| 3 | Doppelte Aussage, Unterzeile als H2, „Lichtenberg“ fehlt | offen | offen (`views/index.ejs:174`) |
| 4 | „bei ab 1.499 €“ in FAQ und JSON-LD | offen (3×) | offen (`controllers/mainController.js:23`); weitere Stellen in `data/addOnsPage.js:470,482,506,518`, `data/maintenancePage.js:409` |
| 5 | FAQ „Warum 799 €?“ ohne Antwort | offen | offen (`controllers/mainController.js:26-27`) |
| 6 | Keine Links zu Ratgeber/Blog | offen | offen |
| 7 | Render-blockierendes CSS | teilweise: Chat-CSS entfällt (Chatbot entfernt), 10 Stylesheets + 10 Preloads bleiben | teilweise |
| 8 | Font Awesome doppelt | offen | offen |
| L | twitter:image, Linktexte, Logo-Maße, JPG, srcset, Footer-H4, Person ohne sameAs | offen | offen |

### Neu seit dem letzten Check
- **Positiv:** Der Chatbot ist komplett entfernt. Damit fallen ein CSS-File, `chat.js` und die Überlagerungsprobleme weg.
- **Zu beachten:** Im Personen-Absatz steht nur noch „Sören“ statt „Sören Blocksdorf“. Der volle Name steht jetzt nur noch im Schema. Für Entitätsklarheit und KI-Suche war der volle Name sichtbar besser. Falls das bewusst so ist, reicht der Name auf `/about`.
- **Zu beachten:** Der Footer-Kontaktblock zeigt keine Adresse mehr, nur Name, Telefon und Google-Profil. Die Adresse steht aber weiterhin im Schema (`address`, Möllendorffstr 26). Bitte einheitlich entscheiden:
  - Adresse öffentlich, dann wieder sichtbar zeigen.
  - Adresse privat (Service-Area-Business), dann auch im Schema nur Ort/PLZ angeben und im Google-Profil die Adresse ausblenden.
- **Klein:** Die Google-Links zeigen jetzt auf `maps.app.goo.gl/…?g_st=ic`. `g_st=ic` ist ein Teilen-Parameter aus der iOS-App. Besser die saubere `cid`-URL oder den Kurzlink ohne Parameter verwenden.

---

## Umsetzung der 8 Punkte (Branch `claude/startseite-seo-fixes`, Basis `origin/main` 3930875)

| # | Umsetzung |
|---|---|
| 1 | `/webdesign-kleine-unternehmen-berlin` leitet per 301 auf `/`. Die Umleitung läuft über das Intent-Register (`data/seoIntentRegistry.js`). Die Seite ist aus Landingpage-Register, Controller-Konfiguration und Sitemap entfernt, der Link von `/ablauf` zeigt auf die Startseite. |
| 2 | Auf dem Handy (≤ 540 px) folgen die Buttons direkt auf den Einleitungsabsatz, die Stichpunkte stehen danach (nur per CSS `order`, das HTML ist unverändert). Die H1 läuft über 3 statt 5 Zeilen (ohne `16ch`-Begrenzung, 28 px). Ergebnis: Beide Buttons sind bei 390 × 844 und 360 × 780 im ersten Screen über dem Cookie-Banner sichtbar, bei 375 × 667 der Hauptbutton. |
| 3 | Personen-Absatz und Unterzeile sind zu einem Absatz zusammengeführt („Ich bin Sören …“, `<p class="home-hero-lead">` statt `<h2>`), mit „Mehr über mich“ in Markenfarbe. Name „Sören“ und Footer/Schema wie gewünscht unverändert. „Lichtenberg“ habe ich bewusst nicht ergänzt. |
| 4 | „bei ab“ / „start at from“ behoben: Startseite DE+EN, `/webdesign-berlin`, `/leistungen`, Wartung (`data/maintenancePage.js`), Zusatzleistungen (`data/addOnsPage.js`, 4 Stellen). |
| 5 | Neue Antwort auf „Warum starten die Pakete bei 799 €?“ mit dem Mindestumfang (kompakte Website/Onepager, eigenes Layout, responsiv, SEO-Grundlagen, Inhalte, Kontaktformular, eine Feedbackrunde). |
| 6 | Neue Links: Ratgeber „Website-Kosten in Berlin“ (Paketbereich), „Ablauf, Dauer und Kosten“ (Ablaufbereich), Ratgeber- und Blog-Übersicht (unter der FAQ). Nur DE, weil es `/en/ratgeber` nicht gibt. |
| 7 | Die wirkungslosen `preload`-Zeilen vor 6 blockierenden Stylesheets sind entfernt. **Korrektur:** Im ersten Check hatte ich 11 blockierende Stylesheets genannt. Font Awesome, `solid`, `extra` und `booking-widget` laden aber bereits asynchron; ihre `<noscript>`-Fallbacks waren fälschlich mitgezählt. `footer.css` bleibt blockierend, weil sie auch Header-/Navigations-Styles enthält. |
| 8 | Font-Preload nutzt jetzt dieselbe URL wie `solid.min.css` (`/assets/css/fa-solid-900.woff2`). Damit wird die Schrift (~110 KB) nicht mehr doppelt geladen. Die URL wird ein Jahr gecacht. |

Tests: 2.303 bestanden, 0 fehlgeschlagen, 19 übersprungen. 5 Tests wurden an die neue Struktur angepasst, 1 neuer Test sichert die 301 ab. Die Templates kompilieren, `home.min.css` und das Manifest sind neu gebaut. Die visuelle Prüfung lief per Playwright mit eingespielten Styles auf der Live-Seite. Ein lokaler Serverlauf war nicht möglich, weil er die Datenbank braucht.

## Design-Check (nicht umgesetzt, nur Empfehlung)

**Lohnt sich (in dieser Reihenfolge):**
1. **Schwebende Elemente verdecken auf dem Handy Text:** Der Button „Cookies widerrufen“ (unten links) und der graue „Nach oben“-Button (unten rechts) liegen dauerhaft über dem Inhalt. Vorschlag: „Cookies widerrufen“ nur im Footer anbieten. Den „Nach oben“-Button kleiner und in Markenfarbe gestalten und erst nach einem Screen Scrollen einblenden.
2. **Sehr große Abstände zwischen den Abschnitten:** Am Desktop liegen jeweils ca. 200 px leerer Raum zwischen den Abschnitten. Die Seite ist am Desktop 13.400 px lang, auf dem Handy 19.200 px. Wenn das Abschnitts-Padding um 30–40 % kleiner wird, wirkt die Seite deutlich kompakter.
3. **Bilder widersprechen der Aussage:** Zu „Node.js, EJS“ zeigt die Seite ein Stockfoto mit **Python**-Code, und zwar zweimal (Leistungskarte und „Schlanke Technik“). Dazu kommen ein Google-Screenshot und ein Platinenfoto für „Relaunch“. Besser wären eigene Screenshots, etwa von echtem EJS-Code oder von Projekt-Mockups.
4. **Referenzbild „Zur alten Backstube“** ist ungünstig beschnitten: Unten ist „Familie Ziekow in 5. Generation“ abgeschnitten, oben steht ein Rest „Eier“. Besser ist ein sauberer Website-Screenshot oder ein Mockup.

**Kleinere Punkte:**
- Inline-Link „Website erstellen lassen in Berlin“ in der ersten Kartenreihe erscheint in Bootstrap-Blau statt in der Markenfarbe.
- Kartentitel mit fester Höhe erzeugen ungleiche Lücken zwischen Titel und Text (Leistungs- und SEO-Karten). Die Paketkarten haben große Leerräume.
- Auf dem Handy steht in „Website-Pakete ab 799 €“ das „€“ allein in der nächsten Zeile. Abhilfe: geschütztes Leerzeichen (`799&nbsp;€`).
- Der Branchen-Abschnitt ist linksbündig, alle anderen Abschnitte sind zentriert.
- Bildnachweise „Bild: … / Pexels“ liegen groß über den Branchen-Bildern. Kleiner oder als Nachweis an anderer Stelle wäre ruhiger.
- Der Footer zeigt „All rights reserved.“ auf Englisch.
- Bei den Bewertungs-Buttons klebt das Icon am Text, und „Alle Bewertungen bei Google ansehen“ steht doppelt.

Screenshots: `design/desktop-*.png`, `design/mobile-*.png`, Vorschau des neuen Hero: `preview/*.png`.
