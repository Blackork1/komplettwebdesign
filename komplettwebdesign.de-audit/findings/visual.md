# Visual-Audit komplettwebdesign.de

Datum: 2026-10-23. Geprüft wurden `/`, `/webdesign-berlin`, `/kontakt`, `/pakete` und `/en` per Playwright/Chromium (Desktop 1440x900, Mobil 375x812 mit Touch und 2x DPR). Zusätzlich liefen Messläufe mit akzeptiertem Banner, mit offenem Mobile-Menü und mit 1366x768, 1280x720, 375x667 und 320x568.

Alle Screenshots liegen unter `/Users/blocksdorf/Documents/KomplettWebDesign/komplettwebdesign.de-audit/screenshots/`. Messwerte (DOM, Boxen, CLS, LCP) stammen aus den Läufen selbst, nicht aus Schätzungen. Wo ein Befund nur auf einer Messung und nicht auf einem Screenshot beruht, steht das dabei.

## Score: 72/100

| Bereich | Bewertung |
|---|---|
| Above-the-fold Desktop | 70 (Inhalt stark, Cookie-Banner überdeckt den Hero-CTA) |
| Above-the-fold Mobil | 62 (36 % des Viewports vom Banner belegt) |
| Mobile Layout / Responsivität | 80 (kein Overflow, gutes Menü, ein Hero-Bug auf /kontakt) |
| Visuelle Hierarchie | 68 (alles fett, lange H1 auf der Startseite) |
| Lesbarkeit / Kontrast | 65 (Orange 3,85:1, viele Texte unter 14px) |
| Stabilität / Performance (visuell) | 95 (CLS 0 bis 0,002) |

## Was gut funktioniert

- **Kein horizontales Scrollen.** `documentElement.scrollWidth` entspricht dem Viewport (375 bzw. 1440) auf allen 5 Seiten. Die Elemente, die über den Rand laufen (`highlight-marquee__track`, Distrikt-Karten, `compare-table`), liegen in Scroll- oder Marquee-Containern.
- **Layout-Stabilität.** CLS 0 bis 0,002 auf allen getesteten Seiten und Breiten. Der LCP ist das Hero-Bild oder der Lead-Text (Desktop-Lauf etwa 0,3 bis 0,5 s).
- **Klares Leistungsversprechen.** Die H1 nennt Leistung und Ort ("Website erstellen lassen in Berlin"). Die Preisanker "ab 799 €" stehen im Hero von Startseite, `/webdesign-berlin` und `/pakete`, auf `/pakete` sogar in der H1.
- **CTAs sind gut dimensioniert.** Die Primär-Buttons sind 46 bis 54px hoch und auf Mobil volle Breite. Primär (Orange) und Sekundär (Navy oder Weiß) sind klar unterscheidbar.
- **Mobile-Menü.** Der Drawer hat 70px hohe Zeilen mit Icons, einen separaten Kontakt-Button und einen EN-Schalter (`screenshots/home-mobile-menu-open.png`). Das Burger-Icon hat `aria-label` und `aria-expanded`.
- **Desktop-Header.** Der orange "Kontakt"-Button und der EN-Schalter sind immer sichtbar (48px hoch).
- **`/kontakt`-Hero.** Er zeigt ein menschliches Foto, Mikro-Zusagen ("Anfrage ist unverbindlich", "ab 799 €") und zwei klare Aktionen. Die Seite hat auf allen Breiten 0 Overflow.
- **`/webdesign-berlin`-Hero.** Kurze H1 (2 Zeilen), Preisliste, zwei CTAs und ein starkes Berlin-Bild. Der CTA liegt bei y=655 (Desktop) und y=586 (Mobil) und damit im ersten Screen.
- **Bild-Attribute.** Alle `img` haben ein `alt`-Attribut (0 ohne). Das Hero-Bild hat `width`/`height`, `fetchpriority="high"` und `loading="eager"` (`views/index.ejs:~247`).
- **Konsistente Marke.** Navy (`#0b2a46`) und Orange (`#e94a1b`) tragen über alle Seiten, die Typografie ist einheitlich.

## Above-the-fold-Bewertung

| Seite | H1 sichtbar | Leistung klar | CTA sichtbar | Vertrauenssignal |
|---|---|---|---|---|
| `/` Desktop 1440x900 | ja (5 Zeilen, 52px) | ja | nur der Header-"Kontakt"; Hero-CTAs (y 786-834) liegen unter dem Banner (ab y 764) | keines (nur Badge "aus Berlin") |
| `/` Mobil 375x812 | ja (6 Zeilen, 30px) | ja | nein, der Banner beginnt bei y=516, die CTAs liegen bei y=689 und 748 | keines |
| `/webdesign-berlin` Desktop | ja | ja | ja (y 655) | Preise, Berlin-Bild |
| `/webdesign-berlin` Mobil | ja | ja | nein (Banner) | Preise |
| `/kontakt` Desktop | ja | ja | ja ("Anfrage starten", y 587) | Foto, "unverbindlich" |
| `/kontakt` Mobil | ja | ja | nein, nur 1 Zeile Button sichtbar (Banner) | Foto |
| `/pakete` Desktop | ja | ja (Preis in H1) | Buttons nur angeschnitten (y 760-808, Banner ab 764) | Preise |
| `/pakete` Mobil | ja | ja | nein (Banner) | Preise |
| `/en` Mobil | ja | ja | ja (Banner nur 29 %, CTA y 522-570) | Tech-Stack-Claims statt Kundennutzen |

## Findings

### 1. High: Cookie-Banner dominiert den ersten Screen
- **Beleg:** `screenshots/home-mobile-atf.png`, `screenshots/pakete-mobile-atf.png`, `screenshots/kontakt-mobile-atf.png` und `screenshots/home-desktop-atf.png`.
  - Mobil DE: Der Banner (`#cookie-banner`, fixed) ist 296px hoch, das sind 36 % von 812px. Er beginnt bei y=516. Dadurch werden Subline, Bullets, beide Hero-CTAs und alle Vertrauenssignale verdeckt.
  - Mobil EN: 232px (29 %).
  - Desktop 1440x900: 136px. Auf der Startseite liegen die Hero-CTAs bei y 786-834 vollständig unter dem Banner, auf `/pakete` bei y 760-808 fast vollständig.
- **Ursache:**
  - Der Text ist lang (3 Sätze), zentriert und fett, weil `p { font-weight: bolder }` auch hier greift (`public/css/main.css:86-89`).
  - Die Buttons sind auf Mobil untereinander gestapelt (je 40px hoch).
  - Das Banner-CSS steht in `public/css/main.css:378-392`, das Markup in `views/partials/cookie-banner.ejs`.
- **Fix:**
  1. Text auf einen Satz kürzen und den Chat-Hinweis in die Datenschutzerklärung oder hinter einen Link verschieben.
  2. Normalen Schriftschnitt verwenden, `font-size: .875rem`, `text-align: left`.
  3. Buttons auf Mobil nebeneinander (`display:flex; gap:.5rem`, je `flex:1`, `min-height:44px`). "Alles akzeptieren" und "Nur Notwendiges" bleiben gleichwertig sichtbar.
  4. Zielhöhe: unter 140px mobil und unter 80px Desktop.
- **Wirkung:** Die Hero-CTAs und die H1-Subline sind beim ersten Besuch sichtbar. Das betrifft jeden Erstbesucher und damit die Conversion-Rate.

### 2. High: Chat-Button überlagert Banner und Hero-CTA
- **Beleg:**
  - `screenshots/en-mobile-atf.png`: Der Button "Chat" (74x48, z-index 1050) liegt über "Only necessary" und schneidet das Label ab. Das ist die Ablehn-Option des Consent-Banners.
  - `screenshots/home-desktop-atf.png`: Der Chat-Button (108x50 bei x 1332-1440) schneidet den Banner-Text bei "werden." ab.
  - `screenshots/home-mobile-nobanner.png`: Der Chat-Button überdeckt die rechten 38px des sekundären Hero-CTAs "Pakete ansehen" (Button x 36-339, y 748-796; Chat x 301-375, y 760-808).
- **Ursache:** `public/chat.css:7` setzt `z-index: 1050`, der Banner hat `z-index: 1000` (`public/css/main.css:389`). Der Chat-Button ist fix positioniert (`public/chat.css:2-26`), im Template steht er in `views/partials/footer.ejs:80`.
- **Fix:**
  - Solange der Banner sichtbar ist, den Chat-Button ausblenden. Dafür in `public/js/cookie-consent.js` beim Anzeigen und Verbergen eine Klasse `body.has-cookie-banner` setzen und `body.has-cookie-banner .chat-button { display:none }` verwenden.
  - Alternativ `bottom: calc(var(--banner-h) + 12px)`.
  - Auf Mobil den Chat-Button zusätzlich kleiner machen oder als Icon-Button (44x44) mit mindestens 16px Abstand zu den Hero-Buttons anlegen.
- **Hinweis:** Eine verdeckte Ablehn-Option ist auch ein Compliance-Risiko (Gleichwertigkeit von Zustimmen und Ablehnen).

### 3. Medium: `/kontakt`-Hero mit `height: 100vh` läuft auf kleinen Viewports über
- **Beleg:** `screenshots/kontakt-m320x568-scrolled-hero-bottom.png`.
  - Bei 320x568 ist der Hero 559px hoch, der Inhalt aber etwa 650px (innerBottom 868 gegenüber heroBottom 662). Der dunkle Hero endet mitten im Button-Block, der weiße Button "Pakete ansehen" und die Fakten-Pills landen auf hellem Grund.
  - Bei 375x667 endet der Inhalt bei y=784, der Hero bei y=761 (Messung, nicht als Screenshot belegt).
  - Auf 375x812 passt es (`screenshots/kontakt-mobile-nobanner.png`), aber oben ist ein hellblauer Streifen (~26px) zwischen Header und Hero und links/rechts ~3px Rand (`screenshots/kontakt-mobile-atf.png`).
- **Ursache:** `public/kontakt.css:21-31` mit `height: 100vh` bei gleichzeitigem Top-Padding von `clamp(5rem, 9vw, 8rem)`. Der mobile Override (`public/kontakt.css:~975-984`) ändert die Höhe nicht.
- **Fix:** `height: auto; min-height: 100svh;` (oder gar keine Mindesthöhe) und mobil `padding-top: 2rem`. Den Streifen und den Seitenrand über die Hero-Margin entfernen.
- **Zusatz (Medium/Low):** Das Formular (`#anfrage`) beginnt erst bei y≈1650 (Mobil) bzw. 1580 (Desktop), also nach einem vollen Bildschirm Hero. Für eine Kontaktseite ist ein kompakterer Hero mit dem Formular im oder direkt unter dem ersten Screen wirksamer.

### 4. Medium: Alle Absätze sind fett, die Hierarchie flacht ab
- **Beleg:** `screenshots/home-mobile-nobanner.png`, `screenshots/home-desktop-atf.png`, `screenshots/pakete-mobile-atf.png`. Subline, Bullets und Fließtext wirken gleich schwer. Messung: 52 von 53 `<p>` auf der Startseite haben `font-weight: 700`, auf `/pakete` 26 von 26.
- **Ursache:** `public/css/main.css:86-89` (`p { font-size:1rem; font-weight: bolder; }`).
- **Fix:** `font-weight: 400` für Fließtext, 500 oder 600 nur für Lead-Absätze und Hervorhebungen. Danach heben sich H1, Lead und CTA deutlich stärker ab. Dazu gehört auch ein normalerer Banner-Text (siehe Finding 1).

### 5. Medium: Orange hat zu wenig Kontrast (3,85:1)
- **Beleg:** Berechnet aus `--color-accent: #e94a1b` (`public/css/main.css:10`).
  - Weiß auf Orange (Primär-Buttons, 16px fett): 3,85:1, nötig sind 4,5:1.
  - Orange Eyebrow "PROJEKTANFRAGE" auf dem Navy-Overlay (12,5px, Versalien): etwa 3,7 bis 4,1:1 (`public/kontakt.css:57-64`), sichtbar in `screenshots/kontakt-mobile-atf.png`.
  - Aktive Nav-Links und Links wie "Website-Tester starten" in Orange auf hellem Grund haben dieselbe Größenordnung (`screenshots/webdesign-berlin-desktop-atf.png`).
- **Fix:** Für Button-Hintergrund und Text ein dunkleres Orange verwenden, z. B. `#c93c0c` (5,08:1 mit Weiß) oder `#cc3f0e` (4,9:1). `#e94a1b` bleibt für Flächen, Icons und Dekor. Für Orange auf Navy den Eyebrow auf `#ff8a5c` oder heller anheben.

### 6. Medium: Kein Vertrauenssignal im ersten Screen
- **Beleg:** `screenshots/home-desktop-atf.png` und `screenshots/home-mobile-nobanner.png`. Es sind nur das Badge "Komplett Webdesign aus Berlin" und der Preisanker sichtbar. Die Google-Bewertungen liegen erst weit unten (Trust-Sektion bei y≈7500 Desktop, y≈11000 Mobil laut Messung).
- **Fix:** Unter den Hero-CTAs eine kompakte Vertrauenszeile ergänzen, die schon im Template vorhandene Slots nutzt, z. B. `copy.heroTrustNote` (`views/index.ejs:250-252`), mit Google-Sterne-Wert und Anzahl, "Persönlich vom Inhaber betreut" und optional einem Foto. Auf `/webdesign-berlin` und `/pakete` dasselbe Muster.

### 7. Medium: Startseiten-H1 ist sehr lang und drückt den CTA nach unten
- **Beleg:** `screenshots/home-desktop-atf.png` (5 Zeilen, 280px hoch, 52px Schrift) und `screenshots/home-mobile-nobanner.png` (6 Zeilen, 194px, 30px). Zum Vergleich hat `/webdesign-berlin` mit "Website erstellen lassen in Berlin" nur 2 Zeilen (`screenshots/webdesign-berlin-desktop-atf.png`). Messung: Bei 1440x780 liegt der Hero-CTA der Startseite bei y 814-862 und damit unterhalb des ersten Screens.
- **Ursache:** `views/index.ejs:225-227` gibt `copy.heroTitle` komplett als H1 aus ("… persönlich, SEO-freundlich und aus einer Hand"). Das Template hat bereits einen Claim-Slot (`copy.heroTitle2`, `views/index.ejs:228-230`).
- **Fix:** H1 auf "Website erstellen lassen in Berlin" kürzen und "persönlich, SEO-freundlich, aus einer Hand" als Claim darunter setzen. Das hält das Keyword und spart rund 120px (Desktop) bzw. rund 100px (Mobil).

### 8. Medium: Kleine Schrift und kleine Tap-Targets (Mobil)
- **Beleg:**
  - Mobil sind auf der Startseite 49 von 79 interaktiven Elementen kleiner als 44px in Höhe oder Breite.
  - Burger-Button 40x36px (`screenshots/home-mobile-atf.png`).
  - Breadcrumb-Link "Startseite" 61x18 (`/pakete`) bzw. 71x23 (`/kontakt`).
  - Inline-Textlinks 17-18px hoch.
  - Footer-Links 295x18px mit **11,2px Schrift** (`public/footer.css:329` und `public/css/main.css:1952`, jeweils `font-size: .7rem`).
  - Newsletter-Checkbox 13x13, "Subscribe"-Button 40x32.
  - Marquee-Chips 13,4px, Eyebrows 12,5 bis 13,6px, Bildquellen-Captions 10,4px, "Cookies widerrufen" 10px.
- **Fix:**
  - Footer-Links mobil auf mindestens 14px und `padding: 12px 0` (Ziel 44px Höhe).
  - Burger auf 44x44 oder 48x48.
  - Breadcrumb mit `padding: 10px 0`.
  - Checkbox mit größerer Label-Fläche.
  - Allgemein 14px als Untergrenze für Text, 16px für Fließtext.

### 9. Medium (Low bis Medium): "Cookies widerrufen" kaum lesbar
- **Beleg:** `screenshots/home-mobile-nobanner.png`, `screenshots/kontakt-mobile-nobanner.png` (unten links). Der Button ist 10px groß, weiße Schrift auf `#e94b1b65` (65 hex = ~40 % Deckkraft). Auf Weiß ergibt das etwa 1,7:1. Er liegt außerdem über Seiteninhalt.
- **Ursache:** `public/css/main.css:427-441`.
- **Fix:** Deckendes Navy (`#0b2a46`) mit weißer Schrift, 12-13px, `min-height: 32px`. Alternativ den Widerruf als Footer-Link anbieten und das Floating-Element entfernen.

### 10. Low: Linke Fortschrittsleiste auf Desktop wirkt unruhig und kann den H1 berühren
- **Beleg:** `screenshots/home-desktop-atf.png`. 14 Icons ohne sichtbare Beschriftung (`aside.scroll-indicator`, fixed, z-index 1000, `public/styles.css:234-245`). Bei 1440px ist der Abstand zur H1 ausreichend (H1 bei x=92). Laut Messung liegt die H1 bei 1280px nur noch bei x=36, während die Icons bis x≈55 reichen (nicht als Screenshot belegt, daher vorsichtig bewerten). Die Leiste zieht Aufmerksamkeit vom Hero ab und wirkt in den ersten Sekunden dominant.
- **Fix:** Erst ab ≥1500px zeigen oder auf eine dünne Linie ohne Icons reduzieren (Tooltips beim Hover), und sicherstellen, dass sie nie über Content liegt.

### 11. Low: Englische Seite nutzt deutsche Mockups und Technik-Claims im Hero
- **Beleg:** `screenshots/en-desktop-atf.png`. Die Mockups zeigen deutschen Text ("Zahnmedizin mit Klarheit und Vertrauen", "Einfach online oder persönlich für Ihr Lächeln"). Bullet 1 ("Built with Node.js, EJS, CSS and JavaScript") und Bullet 2 ("No builder website and no standard theme") sprechen Entwickler, nicht Kleinunternehmer an. Die Sub-CTA "Free initial assessment" ist grau und wirkt wie ein Hinweis, nicht wie ein Versprechen.
- **Fix:** Englisches Mockup oder neutrales Bild verwenden, Kundennutzen in die Bullets ("Clear fixed-price packages", "Personal contact, no agency overhead", "SEO basics included").

### 12. Low: Lead-Text klebt an der H1 auf `/webdesign-berlin`
- **Beleg:** `screenshots/webdesign-berlin-desktop-atf.png` und `screenshots/webdesign-berlin-mobile-atf.png`. Zwischen H1 und Lead fehlt der Abstand (H1 endet bei y=228 mobil, der Lead beginnt unmittelbar darunter). Der Lead hat dagegen sehr großzügigen Zeilenabstand.
- **Fix:** `margin-top: .75rem` für den Lead, `line-height: 1.5`.

### 13. Low: `/kontakt` Desktop, H1 liegt über dem Gesicht
- **Beleg:** `screenshots/kontakt-desktop-atf.png`. Das Wort "Berlin" überdeckt den Kopf der Person, das Foto liegt hinter dunklem Overlay (`rgba(12,42,70,.9→.5)`). Dadurch geht der Vertrauensgewinn des Fotos teilweise verloren.
- **Fix:** Layout zweispaltig (Text links, Foto rechts mit Verlauf nur links), `background-position` auf rechts schieben (`public/kontakt.css:21-31`).

### 14. Low: Mobile-Menü, Details
- **Beleg:** `screenshots/home-mobile-menu-open.png`. Das geschlossene Burger-Icon scheint hinter dem Overlay durch (oben rechts), das Logo sitzt rechts, das Schließen-X links. Der Kontakt-Button hat ein eingebettetes Icon-Chip, das das Label aus der Mitte schiebt.
- **Fix:** Logo links und X rechts (üblich), Burger beim Öffnen ausblenden, Icon im Button links ausrichten oder weglassen.

### 15. Low: Überlange Seiten, Preload-Warnungen
- **Beleg:** Seitenhöhen (Mobil): Startseite 19.535px (≈24 Bildschirme), `/webdesign-berlin` 34.104px (≈42, 23 H2), `/pakete` 17.129px. Konsole: 3 Preload-Warnungen auf allen Seiten (`fa-solid-900.woff2`, `poppins-v23-latin-700.woff2`, `inter-v19-latin-regular.woff2` werden vorgeladen, aber nicht innerhalb weniger Sekunden genutzt), siehe `views/partials/head.ejs:97,109,110`.
- **Fix:** Lange Seiten mit Inhaltsverzeichnis oder Sprungmarken und Abschnitts-CTAs strukturieren. Unbenutzte Preloads entfernen oder auf die tatsächlich verwendeten Schnitte abstimmen.

### Hinweis (zu prüfen)
- `/pakete` Mobil: `table.compare-table` ist 1111px breit bei 375px Viewport. Es entsteht kein Seiten-Overflow, aber der Scroll-Container sollte einen sichtbaren Hinweis ("← wischen →") oder Schatten-Kanten haben. Im Code nicht geprüft.

## Mobile-Responsivität: Zusammenfassung

- Kein horizontaler Seiten-Overflow, Viewport-Meta korrekt (`width=device-width, initial-scale=1`), Basisschrift 16px.
- Navigation per Burger erreichbar (40x36px, etwas zu klein, siehe Finding 8), Drawer mit großen Zeilen.
- Hero-CTAs voll breit und 46-52px hoch (gut). Sie sind aber wegen des Banners (Finding 1) beim Erstbesuch nicht sichtbar. Auf Mobil gibt es keinen sichtbaren Header-CTA, nur den Burger.
- Überlappungen: Chat-Button (Finding 2) und "Cookies widerrufen" (Finding 9).
- Überlauf aus dem Hero auf kleinen Geräten: nur `/kontakt` (Finding 3).

## Priorisierte Fixes

1. Banner kompakt gestalten und den Chat-Button ausblenden, solange der Banner offen ist (Findings 1 und 2). Größter Hebel, wenige Zeilen CSS und JS.
2. `p { font-weight: bolder }` entfernen (Finding 4, eine Zeile) und das Akzentorange für Text und Buttons abdunkeln (Finding 5).
3. Startseiten-H1 kürzen und eine Vertrauenszeile in den Hero setzen (Findings 6 und 7).
4. `/kontakt`-Hero auf `min-height: 100svh` und `height: auto` umstellen (Finding 3).
5. Tap-Targets und Mindestschriftgrößen anheben (Footer 11,2px, Burger, Breadcrumb, Findings 8 und 9).
