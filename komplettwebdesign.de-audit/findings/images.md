# Bilder – Befund

**Kategorie-Score: 58 / 100**

Datengrundlage: Crawl von 197 Seiten (6.053 `<img>`-Tags, 197 eindeutige Rasterbilder), HEAD-Abfragen der Dateigrößen, Stichprobe von 7 Seiten auf `width`/`height`, `srcset` und `fetchpriority`.

## Was gut funktioniert

- Fast alle Bilder sind WebP (eigene Dateien und Cloudinary). Ausnahme: die vier Ratgeber-Bilder (siehe unten).
- Lazy Loading wird breit genutzt (4.901 von 6.053 Bildern), das Hero-Bild hat auf den meisten Seiten `fetchpriority="high"`.
- Alt-Texte: Nur 2 von 6.053 Bildern haben gar kein `alt`. Die 4.066 leeren `alt=""` sind fast ausschließlich dekorative Navigations-Icons (SVG, `aria-hidden="true"`). Das ist korrekt.
- Startseite und `/webdesign-berlin` setzen bei Inhaltsbildern fast überall `width`/`height`.

## Findings

### High – Ratgeber-Hero-Bilder sind 1,8–2,1 MB große PNGs und gleichzeitig das LCP-Element
- **Beleg:** `/images/ratgeber/Ablauf.png` 2,15 MB, `Kosten.png` 1,83 MB, `Baukasten.png` 1,81 MB, `Relaunch.png` 1,78 MB. Eingebunden mit `loading="eager" fetchpriority="high"`, ohne `width`/`height` und ohne `srcset`. Betroffen: `/ratgeber`, `/ratgeber/website-kosten-berlin`, `/ratgeber/website-erstellen-berlin-ablauf-dauer-kosten`, `/ratgeber/website-relaunch-berlin`, `/ratgeber/baukasten-vs-professionelle-website`. `/ratgeber` lädt alle vier, also ~7,6 MB.
- **Code:** `data/seoGuideCluster.js:21, 88, 159, 234` (`image_url`), Dateien in `public/images/ratgeber/`.
- **Fix:** In WebP (oder AVIF) umwandeln, auf max. 1600 px Breite skalieren (Ziel < 150 KB), zusätzlich eine 800-px-Variante für Mobil; `width`/`height` setzen. Das ist der größte einzelne Performance-Hebel auf den Ratgeberseiten, die für „Website Kosten Berlin“ und ähnliche Suchanfragen ranken sollen.

### Medium – Kein `srcset` / keine responsiven Bildgrößen
- **Beleg:** In allen 7 Stichproben-Seiten hat kein einziges Rasterbild `srcset`, es gibt kein `<picture>`. Smartphones laden dieselben Dateien wie der Desktop.
- **Fix:** Für eigene Bilder 2–3 Breiten erzeugen (z. B. 480/960/1600) und `srcset` + `sizes` ausgeben. Für Cloudinary-Bilder Transformationen in der URL nutzen (`/upload/f_auto,q_auto,w_800/...`) und daraus ein `srcset` bauen.

### Medium – Inhaltsbilder ohne `width`/`height` auf Branchen-, Referenz-, Blog- und About-Seiten (CLS-Risiko)
- **Beleg:** `/branchen/webdesign-friseur` 23 von 23 Rasterbildern ohne Maße (gilt für alle 17 Branchenseiten, je ~61 Bilder), `/referenzen/kurdisches-filmfestival` 11/11, `/blog/google-ai-overviews` 3/3, `/about` 2/2.
- **Fix:** `width` und `height` (oder CSS `aspect-ratio`) an allen Inhaltsbildern setzen, besonders an Galerie-/Slider-Bildern der Branchenseiten.

### Medium – Überdimensionierte Einzelbilder
- **Beleg:** `/images/meinAvatar.webp` 335 KB (Avatar auf `/about`, `views/about.ejs:23`); Cloudinary-Blogbild `blog_images/vdq8dyidaihmfsbtsqlt.webp` 962 KB; `/images/branchen/features.webp` 313 KB; `/images/blogW.webp` 264 KB.
- **Fix:** Avatar auf die tatsächliche Anzeigegröße skalieren (Ziel < 40 KB). Cloudinary-Bilder mit `w_`/`q_auto` ausliefern.

### Low – 2 Bilder ohne Alt-Attribut
- **Beleg:** `/blog/chatgpt-agentenmodus`: `admin_gallery/d9muw13nwjwl2eugggz0.webp`, `admin_gallery/ervesbwkoqginyp33opc.webp`.
- **Fix:** Beschreibende Alt-Texte im Blog-Admin ergänzen.

### Low – Widersprüchliches Logo-Markup
- **Beleg:** `views/partials/header.ejs:111`: `<img … alt="Icon um zur Startseite zu kommen" role="presentation">`. `role="presentation"` blendet das Bild für Screenreader aus, der Alt-Text wird damit ignoriert. Ist das Bild der einzige Inhalt des Startseiten-Links, hat der Link keinen zugänglichen Namen.
- **Fix:** `role="presentation"` entfernen und Alt-Text auf „Komplett Webdesign – Startseite“ ändern.

### Low – Platzhalterbilder von picsum.photos auf einer Demo-Seite
- **Beleg:** `/demo/cq-compare/` lädt 3 Bilder von `picsum.photos`.
- **Fix:** Demo-Seite auf `noindex` setzen oder entfernen (siehe Technik-Befund).
