# Performance / Core Web Vitals – komplettwebdesign.de

Stand: 2026-10-23. Auditor: Performance-Agent.

## Kategorie-Score: 74 / 100

| Teilbereich | Score | Kurzbegründung |
|---|---|---|
| Server / TTFB | 95 | Median 88 ms, p90 127 ms (Crawl); eigene curl-Messung 123–137 ms inkl. TLS |
| Komprimierung / Protokoll / Caching | 90 | Brotli, HTTP/2, 1 Jahr immutable auf Assets mit Versions-Hash |
| LCP | 65 | Labor 1,7 s ohne Cookie-Banner, aber 2,5–3,4 s mit Banner (Erstbesucher) |
| Bildgewicht | 50 | heroBg.webp 883 KB auf der Startseite, Ratgeber-PNGs ca. 1,8–2,2 MB, kein srcset |
| CLS | 90 | Labor 0–0,019, Bilder haben width/height |
| INP / JavaScript | 85 | Labor TBT 0–104 ms, DOM 657–942 Elemente, kein Third-Party-JS vor Consent |
| Third Party | 95 | GA, Clarity, Stripe, reCAPTCHA werden erst nach Consent bzw. Interaktion geladen |
| Render-Blocking | 70 | 7 blockierende Stylesheets, Bootstrap komplett (232 KB roh / 33 KB br) |

## Datenlage und Grenzen (bitte beachten)

- **Keine Felddaten (CrUX).** Es gibt keinen Google-API-Key. `pagespeed_check.py` lief in einen PSI-Rate-Limit-Fehler (429), `crux_history.py` und `lcp_subparts.py` brauchen einen Key. Es gibt daher **kein Pass/Fail nach dem 75. Perzentil**. Alle LCP-, CLS- und INP-Werte unten sind Laborwerte.
- **Kein Lighthouse-Lauf.** Lighthouse ist lokal nicht installiert. `npx lighthouse` würde installieren, das war laut Auftrag untersagt. Es gibt deshalb **keinen Lighthouse-Performance-Score**. Der Kategorie-Score oben ist meine Gesamtbewertung aus den Messungen, kein Lighthouse-Wert.
- **Eigene Labormessung** mit dem eingerichteten Playwright-Chromium (ohne Lighthouse), Mobilprofil mit CDP-Drosselung: 4x CPU, 150 ms RTT, ca. 1,6 Mbit/s, Viewport 412x823, je 3 Läufe, frischer Browser-Kontext (kein Consent-Cookie). Das ist angelehnt an das Lighthouse-Mobilprofil, aber nicht identisch. Werte nur als Richtwert nutzen.
- Gemessen wurden `/`, `/webdesign-berlin`, `/pakete`, `/en`. Die Ratgeber-Detailseiten wurden **nicht** im Browser gemessen. Dafür stammen die Dateigrößen aus dem lokalen Repo und aus den Crawl-Daten des Koordinators.
- INP lässt sich im Labor nicht echt messen. Ich nutze TBT, Long Tasks und DOM-Größe als Indikator.

## Messwerte (Labor, mobil gedrosselt, Median aus 3 Läufen)

| Seite | TTFB | FCP | LCP mit Banner | LCP ohne Banner | CLS | Long Tasks | DOM | Transfer vor Scroll | Transfer nach Scroll |
|---|---|---|---|---|---|---|---|---|---|
| `/` | 0,17–0,30 s | 1,7–1,8 s | 3,1 s (3,07–3,44) | 1,72 s (H1) | 0,019 | 0–1 (max. 142 ms) | 942 | 1,46 MB / 47 Req. | 3,05 MB / 66 Req. |
| `/en` | 0,16 s | 1,7 s | 3,1 s | n. g. | 0 | 0–1 | 937 | 1,46 MB | 3,05 MB |
| `/webdesign-berlin` | 0,14–0,18 s | 1,7 s | 2,57 s | 1,68 s (Logo-Bild) | 0 | 0–1 | 891 | 0,47 MB / 39 Req. | 2,64 MB / 64 Req. |
| `/pakete` | 0,17–0,23 s | 1,6 s | 2,52 s | 2,75 s (heroPakete.webp) | 0 | 0–1 | 657 | 0,41 MB / 38 Req. | 1,02 MB / 46 Req. |

(n. g. = nicht gemessen.)

Load-Event auf `/` und `/en`: ca. 8,5 s, auf `/webdesign-berlin` und `/pakete`: ca. 2,7–3,1 s. Der Unterschied kommt von heroBg.webp (Finding 1).

Server (curl, Brotli, HTTP/2, aus meinem Netz):

| URL | Status | TTFB | Gesamt | HTML (br) |
|---|---|---|---|---|
| `/` | 200 | 0,137 s | 0,170 s | 20,9 KB (roh 111 KB) |
| `/webdesign-berlin` | 200 | 0,138 s | 0,171 s | 20,9 KB (roh 104 KB) |
| `/en` | 200 | 0,123 s | 0,158 s | 20,4 KB (roh 109 KB) |

Apex `komplettwebdesign.de` antwortet mit 301 auf `https://www.komplettwebdesign.de/` (ein Redirect).

Ressourcen Startseite (Transfer, Brotli): HTML 21 KB, CSS 81,5 KB (11 Dateien), JS 44,8 KB (10 Dateien), Fonts 252 KB, Bilder vor dem Scrollen 1,07 MB (davon heroBg.webp 883 KB), Bilder gesamt nach Scroll 2,65 MB.

## Was gut funktioniert

- **TTFB**: Median 88 ms, p90 127 ms im Crawl. Deutlich unter der 0,8-s-Schwelle. Server-Rendering ohne SPA-Last.
- **Brotli und HTTP/2** aktiv (`content-encoding: br`, `vary: Accept-Encoding`). HTML 111 KB roh wird auf 21 KB komprimiert.
- **Statische Assets**: `cache-control: public, max-age=31536000, immutable` (index.js:292-294, 303). CSS und JS tragen `?v=`-Hash. Das ist sauberes Cache-Busting.
- **HTML**: `cache-control: private, must-revalidate` mit ETag. Bei Revalidierung ist ein 304 möglich. Kein `no-store`, kein `unload`-Listener, also bfcache-tauglich.
- **Third Party ist vorbildlich verzögert**: GA und Clarity erst nach Consent, Stripe erst per Klick, reCAPTCHA erst bei Formular-Interaktion. In der Labormessung gab es auf `/` keinen einzigen Drittanbieter-Request vor Interaktion.
- **Bilder**: fast alles WebP, `width`/`height` gesetzt, `loading="lazy"` und `decoding="async"` unterhalb des Folds, Hero-Bild mit `fetchpriority="high"` und `loading="eager"` (views/index.ejs, gerendert Zeile 604), Nebenbilder `fetchpriority="low"`.
- **Skripte**: alle eigenen Skripte mit `defer`, insgesamt nur 44,8 KB Transfer, nur 0–1 Long Task im Labor.
- **Fonts**: Inter und Poppins als self-hosted WOFF2, Subset latin, per `preload` geladen (23,7 KB und 7,8 KB).
- **CLS** im Labor 0 bis 0,019. Koordinator-Screenshot-Analyse: 0 bis 0,002. Beides im grünen Bereich.
- `preload_check.py`: Score 75, LCP-Preload-Kandidat und `fetchpriority=high` erkannt.

## Findings

### 1. [High] heroBg.webp (883 KB) wird auf Startseite und /en sofort geladen, obwohl es nur ein Hintergrund weit unten ist

- **Beleg**: `public/images/heroBg.webp` hat 903.744 Bytes. Es wird in `public/home.css:2150` als `background` von `.home-page .home-cta-panel` gesetzt, einem Block weit unter dem Fold. Die Netzwerk-Timeline zeigt den Abruf bei ca. 1,77 s mit 883 KB. Das sind 60 % der 1,46 MB Seitengewicht vor dem Scrollen und 83 % der Bild-Bytes. Browser laden CSS-Hintergrundbilder, sobald das Element im Render-Baum ist, unabhängig vom Scrollen. `loading="lazy"` greift hier nicht. Folge im Labor: Load-Event 8,5 s auf `/` gegenüber 3,0 s auf `/webdesign-berlin`. Die Datei konkurriert mit Hero-Bild und Fonts um die gedrosselte Bandbreite.
- Weitere Verwendungen: `public/leistungen.css:2697` und `:4444` (Leistungen), `views/partials/head.ejs:22` (Standard-`og:image`). Der Twitter-/OG-Verweis auf eine 883-KB-Datei ist ebenfalls unnötig schwer.
- **Fix**:
  1. Neue Variante `heroBg-1600.webp` (ca. 1600x900, Qualität 60–70, Ziel unter 100 KB) erzeugen und in `home.css` und `leistungen.css` verwenden. Mit `image-set()` oder `@media (max-width: 768px)` eine ca. 800 px breite Variante (unter 40 KB) liefern. Da das Bild unter einem Verlauf mit 74–92 % Deckkraft liegt, ist starke Kompression unsichtbar.
  2. Alternativ den Hintergrund als `<img loading="lazy">` im Panel oder per IntersectionObserver nachladen.
  3. Danach `home.min.css`, `leistungen.min.css` und `css-asset-manifest.json` neu bauen.
  4. Für `og:image` ein eigenes 1200x630-Bild unter 150 KB nutzen.
- **Erwarteter Effekt**: ca. 800 KB weniger Transfer auf `/` und `/en`, Load-Event im Labor ca. 5 s früher, weniger Bandbreitenkonkurrenz für den LCP.

### 2. [High] Cookie-Banner wird für Erstbesucher zum LCP-Element und schiebt den LCP von 1,7 s auf 2,5–3,4 s

- **Beleg**: Im Labor ist das LCP-Element auf `/`, `/en`, `/webdesign-berlin` und `/pakete` der `<p>` im `#cookie-banner` ("Wir nutzen notwendige Funktionen …"), Fläche 61.288 px². Das ist größer als der H1-Text (48.960 px²). Mit per CSS ausgeblendetem Banner ist das LCP auf `/` die H1 (`.home-hero-title-primary`) bei 1,72 s. Mit Banner sind es 3,07–3,44 s. Der Banner liegt initial mit `class="is-hidden"` im DOM (`views/partials/cookie-banner.ejs:4`) und wird erst durch `public/js/cookie-consent.js` (Start bei `DOMContentLoaded`, Zeile 12) nach dem Consent-Abruf `/api/consent` eingeblendet. Dieser Abruf startet erst bei ca. 3,05 s. Chrome zählt das spät erscheinende, größere Element als neuen LCP-Kandidaten. Betroffen sind alle Besucher ohne gespeicherte Entscheidung, also genau die Erstbesucher aus der Suche.
- **Fix**:
  1. Den Banner-Zustand serverseitig bestimmen (Consent-Cookie im Request prüfen) und den Banner bei fehlender Entscheidung bereits im ausgelieferten HTML sichtbar rendern. Dann wird er mit dem First Paint gemalt und verschiebt den LCP nicht mehr nach hinten.
  2. Zusätzlich die Fläche begrenzen: kürzerer Text, kleinere Schrift, `max-width`, damit er flächenmäßig kleiner bleibt als die H1. So gewinnt weiter das Hero-Element.
  3. Den Consent-Abruf nicht zur Voraussetzung für das Einblenden machen.
- **Erwarteter Effekt**: LCP für Erstbesucher mobil von ca. 3,1 s auf ca. 1,7–1,9 s (Labor).

### 3. [High] Ratgeber-Hero-Bilder sind PNGs mit 1,8–2,2 MB und werden mit `fetchpriority="high"` geladen

- **Beleg**: Lokale Dateigrößen: `public/images/ratgeber/Ablauf.png` 2.150.416 B, `Kosten.png` 1.827.033 B, `Baukasten.png` 1.807.810 B, `Relaunch.png` 1.780.317 B. Referenziert in `data/seoGuideCluster.js:21`, `:88`, `:159`, `:234` (`image_url`). Ausgegeben in `views/ratgeber/show.ejs:41` mit `loading="eager" fetchpriority="high"`, ohne `width`/`height` und ohne `srcset`. Rechnerisch (keine Messung): 2 MB bei 1,6 Mbit/s sind ca. 10 s Übertragungszeit. Auf Mobilgeräten mit schwacher Verbindung ist der LCP dieser Seiten damit sehr wahrscheinlich im roten Bereich (über 4 s). Die Ratgeber-Seiten sind die wichtigsten Einstiegsseiten für organischen Traffic. Diese Seiten habe ich nicht im Browser gemessen.
- **Fix**:
  1. Bilder nach WebP oder AVIF konvertieren, auf max. 1200 px Breite skalieren, Ziel 60–120 KB. Das Repo hat dafür schon `convert-to-webp.sh` und `change-size-images.sh`.
  2. In `show.ejs:41` `width`/`height` ergänzen und `srcset="…-480.webp 480w, …-800.webp 800w, …-1200.webp 1200w"` mit `sizes` setzen.
  3. `fetchpriority="high"` nur beibehalten, wenn das Bild wirklich das LCP-Element ist. Ein kleines Bild darf Priorität haben, ein 2-MB-PNG nicht.
  4. Die `image_url`-Einträge in `data/seoGuideCluster.js` auf die neuen Dateien umstellen. Für Blog-Beiträge die gleiche Prüfung machen.
- **Erwarteter Effekt**: ca. 95 % weniger Bildgewicht auf diesen Seiten, LCP mobil von vermutlich über 4 s auf unter 2,5 s.

### 4. [Medium] Font-Awesome-Font wird doppelt geladen und mit `font-display: block` ausgeliefert

- **Beleg**: Timeline: `/assets/css/fa-solid-900.woff2?v=2a84ae47aa81` (110,7 KB) bei 359 ms via `<link rel="preload">` (`views/partials/head.ejs:99-106` bzw. gerendert Zeile 77), danach `/assets/css/fa-solid-900.woff2` ohne `?v=` (110,5 KB) bei 1777 ms, ausgelöst durch `src:url(fa-solid-900.woff2)` in `public/assets/css/solid.min.css:6`. Der Browser behandelt beide URLs als verschieden, das Preload wird nicht wiederverwendet. Ergebnis: 221 KB statt 110 KB. `solid.min.css` setzt außerdem `font-display:block`, das heißt, Icons sind bis zum Laden unsichtbar. Auf der Startseite wird FA nur für wenige Icons (z. B. `<i class="fas fa-bolt">`) genutzt.
- **Fix**: Entweder in `solid.min.css` die URL exakt auf die versionierte Variante setzen oder das Preload entfernen, sodass nur eine URL existiert. Besser: die wenigen genutzten Icons als Inline-SVG einbinden und Font Awesome (232 KB Fonts und CSS-Overhead) ganz entfernen. Falls FA bleibt, `font-display: swap` oder `optional`.
- **Erwarteter Effekt**: ca. 110 KB weniger auf jeder Seite, eine Anfrage weniger.

### 5. [Medium] Kein `srcset`/`sizes` auf der gesamten Website

- **Beleg**: Alle `<img>` (Startseite, `/en`, `/webdesign-berlin`) verwenden nur `src`. Mobilgeräte bekommen die Desktop-Variante, z. B. `home-hero-klarblick-desktop.webp` mit 1586x992 (73,8 KB), `paket-*.webp` mit 640x420 (54–90 KB), `review-bg.webp` mit 920x520 (150 KB), `home-fit-beratung.webp` mit 1280x720 (78 KB), `webdesign-berlin-begruessung.jpg` (JPEG, 184 KB). Bilder gesamt nach Scroll auf `/`: 2,65 MB.
- **Fix**: Pro Bild 2–3 Breiten erzeugen (z. B. 480/800/1200 px) und mit `srcset`/`sizes` ausliefern, wo das Bild breiter als ca. 400 px ist. Für das JPEG und `review-bg.webp` AVIF/WebP mit Qualität 60–70. Ein EJS-Helper `responsiveImg(path, sizes)` würde das zentral lösen.
- **Erwarteter Effekt**: ca. 30–50 % weniger Bildbytes auf Mobilgeräten, bessere LCP-Zeiten bei langsamen Verbindungen.

### 6. [Medium] Cloudinary-Galerie auf /webdesign-berlin ohne Transformationen (14 Bilder, 919 KB)

- **Beleg**: Labor: `res.cloudinary.com` liefert 14 Requests mit 919 KB. Die URLs haben die Form `https://res.cloudinary.com/dvd2cd2be/image/upload/v…/admin_gallery/….webp`, also ohne `w_`, `q_auto` oder `f_auto`. Sie werden in Originalgröße ausgeliefert.
- **Fix**: Transformationssegment einfügen, z. B. `/image/upload/f_auto,q_auto,w_640/v…/…` und für `srcset` zusätzlich `w_320`/`w_960`. Am besten an der Stelle, an der der Galerie-Service die URLs erzeugt (Admin-Galerie, `routes/adminGalleryRoutes.js` und zugehöriger Service). Dort einen Helper für Transformationen ergänzen.
- **Erwarteter Effekt**: ca. 60–70 % weniger Galerie-Bytes (Schätzung).

### 7. [Medium] LogoWhite.svg ist ein eingebettetes Rastbild mit 444 KB (325 KB Transfer) im Footer jeder Seite

- **Beleg**: `public/images/LogoWhite.svg` (1024x1024) enthält ein per `data:image` eingebettetes Rasterbild in einer `<pattern>`. Eingebunden in `views/partials/footer.ejs:13` (`<img src="/images/LogoWhite.svg" … loading="lazy" />`, ohne `width`/`height`). Es ist das größte Einzelbild nach heroBg und wird beim Scrollen auf jeder Seite nachgeladen (325 KB Transfer).
- **Fix**: Durch ein echtes Vektor-SVG oder ein kleines WebP/PNG in Anzeigegröße (ca. 2–6 KB) ersetzen und `width`/`height` setzen. Das Logo ist offenbar auch als `LogoTransparent.webp` (21 KB) vorhanden und könnte per CSS-Filter weiß eingefärbt werden.
- **Erwarteter Effekt**: ca. 320 KB weniger pro Seitenaufruf mit Footer-Scroll.

### 8. [Medium] Sieben render-blockierende Stylesheets, Bootstrap komplett geladen

- **Beleg**: Im Head blockieren `bootstrap.min.css` (232.803 B roh / 33 KB br), `main.min.css`, `unified-hero.min.css`, `interaction-polish.min.css`, `footer.min.css`, `chat.min.css` und `home.min.css` das Rendering (gerendert `views/partials/head.ejs`, Zeilen ca. 107-135). Zusätzlich vier per `preload`+`onload` nachgeladene Stylesheets (`fontawesome`, `solid`, `extra`, `booking-widget`). Gesamt 81,5 KB CSS-Transfer in 11 Dateien. FCP im Labor 1,6–1,8 s. Preload plus normales `<link>` für dieselbe Datei (z. B. `bootstrap.min.css`) ist redundant.
- **Fix**: Kritisches CSS für den Above-the-Fold-Bereich (Header, Hero) inline einbetten und den Rest asynchron laden. Außerdem Bootstrap per PurgeCSS/PostCSS auf genutzte Klassen reduzieren (`postcss.config.cjs` ist im Repo vorhanden). Kleine Dateien (`chat`, `footer`, `booking-widget`, `interaction-polish`) zu einem Bundle zusammenfassen. Redundante `preload`-Zeilen für bereits blockierend geladene Dateien entfernen.
- **Erwarteter Effekt**: FCP ca. 0,2–0,4 s früher im gedrosselten Labor, weniger Requests.

### 9. [Low] Kleine Layoutverschiebung im Hero der Startseite (CLS 0,019, Labor)

- **Beleg**: Ein einziger Shift bei ca. 2,9 s (Zeitpunkt etwa beim DOMContentLoaded) mit Wert 0,0186. Quellen: `ul.home-hero-bullets`, `h2`, `.hero-ctas`, `.home-hero-trust-note`. Wahrscheinliche Ursache (nicht bewiesen): spät angewendete Stylesheets (`extra.min.css` per `preload`+`onload`) oder der Wechsel von Fallback-Font auf Font Awesome mit `font-display: block`. Auf allen anderen Seiten CLS 0. Die Screenshot-Analyse des Koordinators nennt 0–0,002, beides liegt klar unter 0,1.
- **Fix**: `extra.css` (Hero-relevante Teile) in das blockierende CSS oder das Kritisch-CSS übernehmen, Hero-Bereich mit `min-height` stabilisieren, Icons ohne Fontabhängigkeit (Inline-SVG).

### 10. [Low] Session-Cookie auf jedem anonymen HTML-Aufruf verhindert Edge-Caching

- **Beleg**: Jede HTML-Antwort enthält `set-cookie: connect.sid=…; HttpOnly; Secure; SameSite=Lax` und `cache-control: private, must-revalidate`. Konfiguration in `index.js:317-323` mit `saveUninitialized: false`. Offenbar schreibt eine Middleware bei jedem Besuch in die Session (z. B. CSRF/Consent). Bei einer TTFB von 88 ms ist der Nutzerimpact gering, aber ein CDN oder Edge-Cache kann diese Antworten so nicht ausliefern.
- **Fix**: Session nur auf Routen anlegen, die sie brauchen (Formulare, Chat, Admin). Für öffentliche Seiten `Cache-Control: public, max-age=0, s-maxage=300, stale-while-revalidate=60` und kein `Set-Cookie`, sobald ein CDN (z. B. Cloudflare) davorgeschaltet wird.

### 11. [Low] Unversionierte Assets sind ebenfalls 1 Jahr `immutable` gecacht

- **Beleg**: `index.js:292-294` setzt `immutable` + `maxAge: '365d'` für alles unter `public/`. Das gilt auch für URLs ohne Hash, z. B. `/css/main.min.css` (ohne `?v=` geprüft: `cache-control: public, max-age=31536000, immutable`) und fast alle Bilder (`/images/…`, Referenzen im HTML ohne `?v=`). Wird ein Bild unter gleichem Namen ersetzt (z. B. eine neue, kleinere `heroBg.webp`), sehen Wiederkehrer bis zu einem Jahr die alte Datei.
- **Fix**: Bilder mit Hash im Dateinamen oder `?v=` ausliefern (analog zu `versionedAsset()`), oder für unversionierte Pfade `maxAge: '30d'` ohne `immutable`. Beim Austausch der großen Bilder aus Finding 1/3/7 neue Dateinamen vergeben.

### 12. [Low] Keine Speculation Rules / Prefetch für die wichtigsten Folgeseiten

- **Beleg**: `preload_check.py`: `speculation_rules.inline_blocks = 0`, Score 75. Empfehlung des Tools: Prefetch/Prerender für Top-Pfade.
- **Fix**: `<script type="speculationrules">{"prefetch":[{"where":{"href_matches":["/pakete","/kontakt","/webdesign-berlin","/ratgeber"]},"eagerness":"moderate"}]}</script>` im Layout. Wegen Cookie-Consent und Analytics zunächst nur `prefetch`, nicht `prerender`.

### 13. [Low] Ungenutztes `preconnect` zu Cloudinary und toter Stripe-Code auf Seiten ohne beides

- **Beleg**: `views/partials/head.ejs:96` setzt `<link rel="preconnect" href="https://res.cloudinary.com">` auf allen Seiten. Auf `/`, `/en` und `/pakete` gab es im Labor keinen einzigen Cloudinary-Request (nur `/webdesign-berlin` nutzt es). Außerdem enthält die Startseite einen inline `ensureStripe`-Loader mit globalem Klick-Listener (`passive:false`) für `[data-open-checkout]`, der auf der Startseite nicht gebraucht wird (gerendert ca. Zeilen 100-125).
- **Fix**: `preconnect` nur auf Seiten mit Cloudinary-Bildern setzen. Den Stripe-Loader nur auf Checkout-Seiten ausgeben.
- **Hinweis (außerhalb Performance)**: Im Inline-Skript steht ein Stripe-Publishable-Key mit Präfix `pk_test_`. Das ist kein Geheimnis, aber ein Testschlüssel im Live-HTML. Beim Entfernen des Loaders erledigt sich das mit.

### 14. [Low] /pakete: Hero-Bild bestimmt LCP ohne Banner erst bei 2,75 s (zu prüfen)

- **Beleg**: Ohne Banner ist das LCP-Element `/images/heroPakete.webp`, `loadTime` ca. 2,72 s und `renderTime` 2,75 s (Labor, gedrosselt). Das liegt über den 2,5 s der Grenze zu "gut". Ob das Bild `fetchpriority="high"`/`preload` hat, habe ich im Quellcode nicht geprüft. Der Hinweis ist daher eine Prüfaufgabe.
- **Fix**: Hero-Bild mit `fetchpriority="high"`, `loading="eager"` und `width`/`height` versehen und die Datei verkleinern. Dieselbe Prüfung für die Hero-Bilder der anderen Unterseiten (`/referenzen`, `/ablauf`, `/leistungen`, `/webdesign-berlin/kosten-preise-pakete`).

## Prioritäten

| Priorität | Maßnahme | Aufwand | Erwarteter Effekt |
|---|---|---|---|
| 1 | heroBg.webp verkleinern oder nachladen (Finding 1) | klein | ca. 800 KB weniger, Load-Event ca. 5 s früher |
| 2 | Ratgeber-PNGs nach WebP/AVIF (Finding 3) | klein–mittel | ca. 1,7–2,1 MB weniger je Ratgeber-Seite, LCP deutlich besser |
| 3 | Cookie-Banner serverseitig rendern bzw. verkleinern (Finding 2) | mittel | LCP Erstbesucher von ca. 3,1 s auf ca. 1,8 s (Labor) |
| 4 | FA-Doppelladung beheben bzw. FA entfernen (Finding 4) | klein | ca. 110 KB weniger auf jeder Seite |
| 5 | LogoWhite.svg ersetzen (Finding 7) | klein | ca. 320 KB weniger |
| 6 | srcset/sizes und Cloudinary-Transformationen (Finding 5, 6) | mittel | ca. 30–60 % weniger Bildbytes mobil |
| 7 | Kritisches CSS und Bootstrap-Purge (Finding 8) | mittel | FCP ca. 0,2–0,4 s |
| 8 | Rest (Findings 9–14) | klein | Feinschliff |

## Nächste Schritte zur Absicherung

- PSI-/CrUX-Felddaten nachziehen, sobald ein API-Key vorhanden ist (`pagespeed_check.py`, `crux_history.py`, `lcp_subparts.py`), und im Search Console Bericht "Core Web Vitals" die Ratgeber-URL-Gruppe prüfen. Erst dann ist ein Pass/Fail für LCP, INP und CLS belegt.
- Nach den Bildänderungen Lighthouse (mobil) lokal oder per PSI laufen lassen und die Labor-Werte aus diesem Bericht vergleichen.
- Ratgeber- und Blog-Detailseiten im Browser nachmessen (in diesem Lauf nicht geschehen).
