# Technisches SEO – komplettwebdesign.de (Stand 2026-10-23)

Quellen: `raw/crawl.json` (197 Seiten, alle 200), `raw/onpage-summary.txt`, `raw/robots.txt`, `raw/sitemaps.json`, `raw/homepage-render.json`, Quellcode (nur gelesen) und wenige höfliche curl-Nachprüfungen am 23.10.2026 (ca. 05:30–05:40 UTC).

## Gesamtscore: 72 / 100

| Kategorie | Status | Score |
|---|---|---|
| Crawlbarkeit (robots.txt, Sitemap, noindex) | Bestanden mit Mängeln | 82 |
| Indexierbarkeit (Canonicals, Duplikate, Thin Content) | Teilweise | 60 |
| Sicherheit (HTTPS, Header) | Teilweise | 62 |
| URL-Struktur und Redirects | Teilweise | 58 |
| Mobile (Viewport) | Bestanden | 90 |
| Core-Web-Vitals-Potenzial (nur Quelltext) | Bestanden mit Mängeln | 72 |
| Strukturierte Daten (Detektion) | Bestanden | 80 |
| JavaScript-Rendering | Bestanden | 96 |
| IndexNow | Nicht umgesetzt | 0 (Bonus-Kategorie, gering gewichtet) |

Es gibt keine Critical-Findings. Die Seite ist vollständig crawlbar, serverseitig gerendert und hat saubere Sitemap-Grundlagen. Die Abzüge kommen von Duplikat-URLs (Slash, Groß-/Kleinschreibung, Parameter), widersprüchlichen Index-Signalen bei Nebenseiten, einer unzuverlässigen Sitemap-`lastmod` und einem schwachen Security-Header-Set.

## Was gut funktioniert

- **Rendering:** Alle Inhalte, H1, Meta-Tags und JSON-LD stehen im Roh-HTML (`is_spa=false`, `mode_used=raw`, 111 kB). Kein CSR-Risiko. Alle 10 externen Skripte laden mit `defer`.
- **Statuscodes:** Alle 197 gecrawlten Seiten antworten mit 200 und ohne Redirect-Ketten. Es gibt keine Orphans (0), keine Sitemap-URLs mit noindex oder Canonical-Abweichung, keine durch robots.txt blockierten gecrawlten URLs.
- **Echte 404:** Erfundene URLs liefern HTTP 404 mit `noindex,nofollow` (`controllers/errorController.js:1-6`). Das ist kein Soft-404.
- **HTTPS-Basis:** HTTP/2, gültiges TLS (`ssl_verify_result=0`), Brotli aktiv, HSTS mit 1 Jahr. `X-Powered-By` ist deaktiviert (`index.js:162`) und es gibt keinen `Server`-Header. Das Session-Cookie ist `HttpOnly; Secure; SameSite=Lax`.
- **Redirects:** Apex → www per 301 (Pfad bleibt erhalten, `index.js:201-229`). `http://www` → `https://www` per 301. Legacy-Routen werden per 301 umgeleitet (z. B. `/website-erstellen-lassen-berlin` → `/webdesign-berlin`, `/website-relaunch-berlin` → `/leistungen/website-relaunch`, `/pakete/basis` → `/pakete/start`).
- **Canonicals:** Query-Parameter werden bei fast allen Seiten abgeschnitten (`index.js:262-268`, Canonical aus `pathOnly`). `/?utm_source=x` hat Canonical `/`, `/kontakt?...` hat Canonical `/kontakt`. Blog-Pagination hat korrekte Self-Canonicals (`controllers/blogController.js:56,66`) und `rel=prev/next` (`views/blog/index.ejs:132,136`).
- **hreflang:** Bei allen 74 Seiten ohne Parameter mit hreflang sind die Ziele erreichbar, indexierbar, selbstkanonisch und gegenseitig verlinkt. Die 123 „kaputten“ Einträge aus `onpage-summary.txt` sind ein Tool-Artefakt: Sie betreffen Parameter-URLs, deren hreflang auf die Basis-URL zeigt. Details gehören in den Sub-Skill `seo-hreflang`.
- **Sitemap:** `/sitemap.xml` ist gültig (126 URLs, alle 200, alle indexierbar, in robots.txt mit absoluter www-URL deklariert). Der Helfer `sitemap_discovery.py` validiert sie als `urlset`. Die Fallbacks `sitemap_index.xml`, `sitemap-index.xml` und `wp-sitemap.xml` sind 404, das ist erwartbar.
- **Mobile:** `<meta name="viewport" content="width=device-width, initial-scale=1">` steht auf Startseite, 404, `/handwerker`, `/booking` und der Demo-Seite. Es gibt kein `user-scalable=no`.
- **Server-Antwortzeit:** Median 88 ms, p90 127 ms, Maximum 319 ms (`/pakete`).
- **LCP-Bild Startseite:** Das Hero-Bild hat `fetchpriority="high"`, `loading="eager"` sowie `width` und `height`. Die nachrangigen Bilder sind `lazy` mit `fetchpriority="low"`.
- **Favicon und Manifest:** `icon16/32/192`, `apple-touch-icon` und `site.webmanifest` sind eingebunden.
- **llms.txt:** `/llms.txt` ist vorhanden (200, text/plain).

## Korrekturen und Einordnung der Vorab-Annahmen

| Annahme | Ergebnis |
|---|---|
| `/leistungen/` liefert 200 statt 301 | **Bestätigt** (curl 200). Es ist schwerwiegender als gemeldet: 195 interne Links zeigen auf die Slash-Variante (siehe H-1). |
| `/demo/cq-compare/` hat Canonical auf die Startseite | **Nicht bestätigt.** Die Seite hat gar kein Canonical, kein `meta robots` und keine Description (`public/demo/cq-compare/index.html:1-8`; Crawl: `canonical=None`). Sie ist indexierbar, 46 Wörter. |
| Parameter-URLs werden intern verlinkt | **Bestätigt, aber mit anderer Ursache.** `?cat=` und `?page=` auf `/` und `/en` entstehen durch den Sprachumschalter, nicht durch Content-Links (siehe M-2). Nur `/kontakt?paket=…` und `/kontakt?projektart=…` sind echte CTA-Links (ca. 45 Stellen in `views/` und `data/`). |
| Canonical der Sonderzeichen-Slugs nicht prozentkodiert | **Bestätigt**, aber unkritisch. Google normalisiert Prozent-Kodierung. Der „Canonical zeigt woanders hin“-Treffer im Crawl ist ein reiner String-Vergleich. Relevant ist die Unsauberkeit in Sitemap und Slug (siehe M-3). |
| 11 `/branchen/webdesign-*` indexierbar, nicht in Sitemap | **Bestätigt** (siehe H-2). Ergänzung: Die Sitemap-Auslassung ist Absicht (`helpers/seoPagePolicy.js`, `PRIORITY_INDUSTRY_SLUGS` und `shouldIncludeIndustryInSitemap`), der Indexierungs-Status wurde aber nie angepasst. |
| CSP nur mit `frame-ancestors`, `object-src`, `base-uri` | **Bestätigt** (`index.js:234-257`). |
| HSTS ohne `includeSubDomains` und `preload` | **Bestätigt** (`index.js:253`). Zusätzlich fehlt HSTS auf der Apex-Redirect-Antwort (siehe M-5). |
| `Cache-Control: private, must-revalidate` für HTML | **Bestätigt** (`middleware/consentMiddleware.js:21`). |

## Findings

### High

**H-1: Slash-, Groß-/Kleinschreibungs- und Doppelslash-Varianten liefern 200 mit Self-Canonical auf die Variante; die Navigation verlinkt `/leistungen/`**

- **Beleg (curl):**
  - `/leistungen/` ist 200 mit Canonical `/leistungen` (Titel, Description und H1 sind identisch zu `/leistungen`).
  - `/about/` ist 200 mit Canonical `https://www.komplettwebdesign.de/about/`.
  - `/faq/` ist 200 mit Canonical `/faq/`.
  - `/en/` ist 200 mit Canonical `/en/`.
  - `/branchen/webdesign-arzt/` ist 200 mit Canonical `/branchen/webdesign-arzt/`.
  - `/ABOUT` ist 200 mit Canonical `/ABOUT`.
  - `/Kontakt` ist 200 (Canonical korrekt `/kontakt`, weil der Controller selbst setzt).
  - `/BLOG/website-kosten-2025-einfach-erklaert` ist 200.
  - `//kontakt` ist 200.
  - `/blog/Website-Kosten-2025-Einfach-Erklaert` ist 404, der Slug ist also case-sensitiv.
  - `/pakete/start/`, `/blog/`, `/webdesign-berlin/` und `/referenzen/` sind 200 mit Canonical ohne Slash (Controller setzt eigenen Canonical).
- **Crawl:** `/leistungen/` hat 195 Inlinks, `/leistungen` nur 32. Die komplette Navigation und der Footer zeigen auf die Slash-Variante.
- **Ursache:**
  - Express läuft im nicht-strikten Routing, es gibt keine Normalisierungs-Middleware.
  - Der Standard-Canonical wird aus dem rohen Request-Pfad gebaut (`index.js:262-268`).
  - Die Nav-Links stehen in `data/siteNavigation.js:23`, `:28` und `:128` (`href: '/leistungen/'`).
- **Risiko:**
  - Die interne Verlinkung läuft sitewide auf eine nicht-kanonische URL und verwässert Signale (Google konsolidiert, aber der Crawl-Aufwand verdoppelt sich).
  - Jede extern verlinkte Slash-/Großschreibung erzeugt ein indexierbares Duplikat mit eigenem Self-Canonical.
- **Fix:**
  1. In `data/siteNavigation.js` Zeile 23, 28 und 128 `'/leistungen/'` durch `'/leistungen'` ersetzen (Zeile 128 enthält `labelEn`, nur `href` ändern).
  2. Neue Middleware in `index.js` direkt nach dem Host-/HTTPS-Block (nach Zeile 229, vor `app.use(compression())`):

```js
// Pfad-Normalisierung: Doppelslash, Trailing Slash, Großbuchstaben
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  const raw = req.originalUrl || '/';
  const qIdx = raw.indexOf('?');
  const path = qIdx >= 0 ? raw.slice(0, qIdx) : raw;
  const query = qIdx >= 0 ? raw.slice(qIdx) : '';
  let next301 = path.replace(/\/{2,}/g, '/');
  if (next301.length > 1) next301 = next301.replace(/\/+$/, '');
  // Blog-Slugs sind case-sensitiv (GA4-Tracking-Framework etc.), daher dort nicht lowercasen
  if (!next301.startsWith('/blog/') && !next301.startsWith('/uploads/') && next301 !== next301.toLowerCase()) {
    next301 = next301.toLowerCase();
  }
  if (next301 !== path) return res.redirect(301, next301 + query);
  next();
});
```

  3. Der Demo-Pfad `/demo/cq-compare/` wird dadurch auf `/demo/cq-compare` umgeleitet (dort greift die Route `index.js:295`). Das ist gewollt.
  4. Ergänzend den Canonical in `index.js:262-268` aus dem normalisierten Pfad bauen (Trailing Slash entfernen, Kleinschreibung), damit auch ohne Middleware kein Slash-Canonical entsteht.
- **Aufwand:** niedrig.

**H-2: Widersprüchliche Index-Signale bei Nebenseiten (indexierbar, aber weder in Sitemap noch bewusst gesteuert)**

- **Beleg:**
  - **11 Branchenseiten:** `/branchen/webdesign-arzt`, `-autowerkstatt`, `-beautysalon`, `-fitnesscoach`, `-fotograf`, `-friseur`, `-hebamme`, `-physiotherapie`, `-steuerberater`, `-tattoo`, `-wellness`. Sie haben `index,follow` und ein Self-Canonical, fehlen aber in der Sitemap. Die Policy in `helpers/seoPagePolicy.js` nimmt nur `handwerker`, `restaurant`, `cafe`, `reinigungsfirma`, `reinigung`, `blumenladen`, `immobilienmakler` auf. Zehn der elf Seiten haben nur 1 Inlink (von `/branchen`), `fitnesscoach` hat 23.
  - **Template-Nähe der Branchenseiten:** Die Hauptinhalte haben je 1.250–1.390 Wörter. Die 6-Gramm-Überlappung zwischen Arzt, Friseur, Tattoo und Café liegt bei 35–37 %. Das ist deutlich templatelastig.
  - **`/booking`:** indexierbar, nicht in Sitemap, Titel „Termin buchen“ (13 Zeichen), Description 45 Zeichen im „Sie“-Ton („Wählen Sie einen Termin…“), 406 Wörter. 4 Inlinks von den Tester-Seiten.
  - **`/de`:** 200, Canonical `https://www.komplettwebdesign.de/de`, `index,follow`. Es ist ein vollständiges Duplikat der Startseite mit Self-Canonical (`routes/main.js:7-10`). Der Crawl findet es nicht, weil es nicht verlinkt ist.
  - **`/return_policy`:** 200, indexierbar, Self-Canonical, zweisprachiger Titel „Return Policy / Rückgaberegelung“, nicht in Sitemap (`routes/main.js:19`).
  - **`/branchen-websites-erstellen-lassen`:** 200, indexierbar, Self-Canonical, nicht in Sitemap, H1 „Café Website erstellen“, Template heißt `branchen-tempaltes.ejs` (`routes/main.js:20`, `controllers/mainController.js:434`).
  - **`/demo/cq-compare/`:** siehe M-4.
- **Risiko:** Google entscheidet selbst, was davon im Index landet. Dünne oder templatelastige Seiten ohne Sitemap-Signal und ohne Interne-Link-Stärke ziehen die wahrgenommene Qualität der Domain herunter. Es entsteht Index-Bloat ohne Ranking-Nutzen.
- **Fix:** Pro Seite eine Entscheidung treffen und technisch umsetzen.
  - **Branchenseiten:** Entweder die Seiten inhaltlich differenzieren (eigene Beispiele, Preise, Fragen) und danach in die Sitemap aufnehmen, oder bis dahin `noindex,follow` setzen. Die Umsetzung gehört in den Controller der Branchenseiten (`controllers/industriesController.js`, `robots`-Variable an `res.render`) plus eine Liste in `helpers/seoPagePolicy.js`, z. B. `NOINDEX_INDUSTRY_SLUGS`.
  - **`/booking`:** `noindex,follow` setzen oder Titel und Description überarbeiten (Du-Ansprache) und in `INDEXABLE_STATIC_ROUTES` aufnehmen.
  - **`/de`:** `res.redirect(301, '/')` statt Render (`routes/main.js:7-10`).
  - **`/return_policy` und `/branchen-websites-erstellen-lassen`:** per 301 auf `/datenschutz`/`/impressum` bzw. `/branchen` umleiten oder `noindex` setzen.
- **Aufwand:** mittel (inhaltliche Entscheidung nötig).

### Medium

**M-1: Sitemap-`lastmod` ist unzuverlässig, `changefreq` und `priority` sind Rauschen**

- **Beleg:**
  - 62 von 126 URLs (49 %) haben `lastmod` = exakter Abrufzeitpunkt (2026-10-23T05:32:01.810Z).
  - Alle 29 älteren Blogposts teilen exakt `2026-07-11T18:14:17.479Z` (Massenupdate).
  - Jede URL trägt `changefreq` und `priority` (je 126), die Google ignoriert.
- **Ursache:** `controllers/sitemapController.js` verwendet `nowIso` (Zeile 66) für statische Routen, Bezirksseiten (Zeilen 138 und 144) und Pakete (Zeile 199). Außerdem fällt `toIso()` bei fehlendem Datum auf `nowIso` zurück (Zeile 229).
- **Risiko:** Google vertraut `lastmod` nur, wenn es nachweisbar stimmt. Bei „immer jetzt“ wird es komplett ignoriert, auch für neue Blogposts, bei denen die Aktualität zählt.
- **Fix:**
  1. Für statische Routen ein festes Änderungsdatum pflegen, entweder pro Eintrag in `INDEXABLE_STATIC_ROUTES` (`lastmod: '2026-10-08'`) oder aus dem Git-Datum der View. Bezirksseiten und Pakete analog (DB-`updated_at` bzw. Konstante).
  2. `lastmod` weglassen, wenn kein belastbares Datum existiert (Zeile 229: nur ausgeben, wenn `u.lastmod` gesetzt ist).
  3. `changefreq` und `priority` entfernen (Zeilen im XML-Build, ca. 230-232). Das spart Bytes und Missverständnisse.
- **Aufwand:** niedrig.

**M-2: Sprachumschalter erzeugt Parameter-Duplikate; FAQ-Kategorien sind nicht indexierbar; `?cat=999` liefert 500**

- **Beleg (Crawl):**
  - 36 Parameter-URLs auf `/` und `/en` (`?cat=1..5`, `?page=2..5`, je 1.615 bzw. 1.786 Wörter, identischer Titel und H1). Entdeckt über `/faq?cat=N` → `/en?cat=N` → `/?cat=N` und `/blog?page=N` → `/en?page=N` → `/?page=N`.
  - `/faq?cat=1..5` hat 293/342/539/567/493 Wörter, aber alle kanonisieren auf `/faq` (nur Kategorie 1 mit 293 Wörtern).
  - curl: `/faq?cat=999` liefert **HTTP 500**.
- **Ursache:**
  - `views/partials/header.ejs:7` liest `currentSearch`, Zeilen 27-28 hängen die komplette Query an die Umschalt-Links. `index.js:278` setzt `currentSearch` ungefiltert aus der Request-URL. Seiten ohne EN-Pendant (`/faq`, `/blog`) fallen in Zeile 21 auf `/en` zurück.
  - `controllers/faqController.js:63`: `parseInt(req.query.cat)`, danach läuft `getCategoryById` ohne Null-Prüfung. Die Kanonisierung auf `/faq` ergibt sich aus dem generischen Canonical, in `faqController.js:70` wird nur `og:url` gesetzt.
- **Risiko:**
  - Crawl-Budget-Rauschen (gering bei dieser Seitengröße), aber vor allem gehen die FAQ-Inhalte der Kategorien 2–5 für die Indexierung verloren.
  - Ein 500 bei manipulierten Parametern ist unsauber (und erzeugt Fehlerrauschen in Logs).
- **Fix:**
  1. `header.ejs:27-28`: Query nur auf Seiten übernehmen, wo sie fachlich nötig ist (`/kontakt`-Parameter `paket` und `projektart`). Sonst `currentSearchPart = ''`.
  2. Für Seiten ohne EN-Version (`/faq`, `/blog`, `/about`, …) den Umschalter ausblenden statt auf `/en` zu führen.
  3. FAQ: Entweder alle Kategorien auf `/faq` rendern (Accordion je Kategorie, JSON-LD enthält dann alle sichtbaren Fragen) oder eigene Pfade `/faq/<kategorie>` mit Self-Canonical einführen und in die Sitemap aufnehmen.
  4. `faqController.js:63-66`: ungültige `cat`-Werte auf die erste Kategorie zurückfallen lassen oder `res.redirect(301, '/faq')` bzw. 404 liefern.
- **Aufwand:** mittel.

**M-3: Blog-Slugs mit Sonderzeichen, Tippfehlern und Großbuchstaben; Sitemap enthält nicht kodierte Nicht-ASCII-URLs**

- **Beleg:**
  - `/blog/Scoll-Snapp-Galery-&-Zoom‑on‑View`: enthält `&`, das Zeichen U+2011 (geschützter Bindestrich) und drei Tippfehler. Der Seitentitel lautet „Modernes Micro‑Motion‑Design…“.
  - `/blog/website-checkliste-für-selbstandige`: Umlaut im Pfad, Tippfehler „selbstandige“.
  - `/blog/immobilienmakler-website-erstelle` (abgeschnitten).
  - Großgeschriebene Slugs: `GA4-Tracking-Framework`, `Google-AI-Mode-und-AI-Overviews`, `Landingpages-Webshop-Webdesign-Berlin`, `Lokale-SEO-Hacks-fuer-Berlin`.
  - In der Sitemap stehen die Sonderzeichen-Slugs unkodiert (`Scoll-Snapp-Galery-&amp;-Zoom‑on‑View`, `website-checkliste-für-selbstandige`). Das Sitemap-Protokoll verlangt URL-Escaping nach RFC 3986. Canonical und `og:url` sind ebenfalls unkodiert (`services/blogPostPresentationService.js:211,258`).
  - Die kodierte und die unkodierte Variante liefern beide 200 und zählen im Crawl als Duplikat (identischer Titel).
- **Risiko:** Sonderzeichen-URLs werden in Tools, Social-Shares und Mail-Clients gern abgeschnitten oder falsch kodiert (`&`, U+2011). Eine Umbenennung kostet bei so wenigen Inlinks (1 Inlink je Post) kaum Signal.
- **Fix:**
  1. Slugs in der DB umbenennen: `scroll-snap-galerie-zoom-on-view`, `website-checkliste-fuer-selbststaendige`, `immobilienmakler-website-erstellen`, Kleinschreibung für die vier Großbuchstaben-Slugs.
  2. 301 von alt auf neu. Aktuell ist nur ein Redirect hart verdrahtet (`routes/blogRoutes.js:10-12`), `data/blogRedirects.js` dient nur dem Sitemap-Ausschluss. Besser beides aus einer Quelle speisen:

```js
// routes/blogRoutes.js, vor router.get('/blog/:slug', showPost)
import { BLOG_REDIRECTS } from '../data/blogRedirects.js';
for (const [from, to] of Object.entries(BLOG_REDIRECTS)) {
  router.get(`/blog/${from}`, (_req, res) => res.redirect(301, `/blog/${to}`));
}
```

     Und in `data/blogRedirects.js` die alten Slugs eintragen. Die kodierten Varianten (`%E2%80%91`, `%C3%BC`) müssen mitgenommen werden, Express matcht dekodiert.
  3. Interne Links und Schema-`url` mit aktualisieren.
- **Aufwand:** niedrig bis mittel.

**M-4: `/demo/cq-compare/` ist indexierbar, dünn und ohne Meta-Angaben**

- **Beleg:** Kein Canonical, kein `meta robots`, keine Description, 46 Wörter. Erreichbar mit und ohne Slash (200). Wird von `/blog/media-queries-vs-container-queries` verlinkt. Die Demo lädt Bilder von `picsum.photos`. Das Route-Handling (`index.js:295-302`) liegt vor Session und Consent, die Antwort trägt kein `Cache-Control`.
- **Risiko:** Ein dünnes Demo-Dokument konkurriert im Index mit dem Blogartikel. Fehlendes Canonical und fehlende Description verschenken Kontrolle.
- **Fix:** In `public/demo/cq-compare/index.html` (Head, Zeilen 3-7) ergänzen:

```html
<meta name="robots" content="noindex,follow">
<link rel="canonical" href="https://www.komplettwebdesign.de/blog/media-queries-vs-container-queries">
```

  Alternativ in der Route `index.js:295` `res.set('X-Robots-Tag', 'noindex, follow')` setzen. Das Canonical auf den Blogartikel ist nur sinnvoll, wenn die Demo inhaltlich dazu gehört. Mit `noindex` allein ist die Seite sauber geregelt (nicht beides kombinieren, ein Signal reicht).
- **Aufwand:** niedrig.

**M-5: Security-Header sind minimal (CSP, HSTS, Permissions-Policy)**

- **Beleg (Header der Startseite):**
  - `Content-Security-Policy: frame-ancestors 'self'; object-src 'none'; base-uri 'self'` (kein `script-src`, `default-src` usw.).
  - `Strict-Transport-Security: max-age=31536000` ohne `includeSubDomains` und `preload`.
  - **Neu:** Die 301-Antwort von `https://komplettwebdesign.de/` trägt **keinen** HSTS-Header. Der Redirect-Block (`index.js:201-229`) steht vor der Header-Middleware (`index.js:234-257`). Preload-Listing setzt HSTS auf der Apex-Domain voraus.
  - Fehlend: `Permissions-Policy`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`.
  - Vorhanden und in Ordnung: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN`.
- **Ursache:** Header-Block in `index.js:234-257`. In `app.js:20-40` existiert eine veraltete Kopie (siehe L-9).
- **Fix:**
  1. Header-Middleware vor den Redirect-Block ziehen (vor `index.js:201`), damit HSTS auch auf Redirects liegt. Danach `includeSubDomains; preload` erst setzen, wenn alle Subdomains HTTPS können (Cookavoli-/Swipe-and-Cook-Subdomains prüfen).
  2. `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(self "https://js.stripe.com")` ergänzen.
  3. CSP zuerst als `Content-Security-Policy-Report-Only` mit Allowlist für die tatsächlich genutzten Dienste (Stripe, reCAPTCHA, Google Analytics, Clarity, YouTube, Cloudinary) ausrollen. Hürde: Inline-Skripte in `views/partials/head.ejs` (u. a. Stripe-Lazy-Loader, `kwd-interaction-polish`) und Inline-JSON-LD. Daher Nonce-Verfahren (`res.locals.cspNonce`) oder die Skripte auslagern.
- **Aufwand:** mittel (CSP), niedrig (übrige Header).

**M-6: `/en/pakete*` ist noindex, wird aber massiv intern verlinkt und liefert deutsche Inhalte**

- **Beleg:** Fünf Seiten (`/en/pakete`, `/start`, `/business`, `/wachstum`, `/individuell`) haben `noindex,follow`, deutsche Titel/Descriptions/H1 und zählen 15–39 Inlinks. Der Sprachumschalter führt von `/pakete` auf `/en/pakete` (`header.ejs:15`, Map `deToEnMap`). Die Seiten sind `lang="en"` mit deutschem Text. Gesetzt in `controllers/packagesController.js:307`, `:377`, `:531`.
- **Einordnung:** `noindex` ist hier die richtige Notbremse (Duplikate in falscher Sprache), aber Nutzer und interne Links landen trotzdem dort.
- **Fix:** Entweder die Seiten wirklich übersetzen (Titel, Description, H1, Body, Preise) und dann `robots` freigeben, hreflang `en` ergänzen und in die Sitemap aufnehmen. Oder den Sprachumschalter auf diesen Seiten ausblenden, die EN-Pakete aus der EN-Navigation nehmen und `lang` auf `de` stellen.
- **Aufwand:** mittel (Übersetzung) oder niedrig (Verlinkung).

**M-7: Session-Cookie bei jedem Request, HTML nicht cachebar, `immutable` auf Dateien ohne Versionierung**

- **Beleg:**
  - Jede HTML-Antwort (auch 404 und `/favicon.ico`-404) setzt `Set-Cookie: connect.sid=…`. `middleware/csrf.js:3-8` schreibt bei jedem Request ein CSRF-Token in die Session (`index.js:317-325`, `saveUninitialized:false` hilft dann nicht). Folge: ein Session-Datensatz in PostgreSQL pro Besucher und Bot.
  - `Cache-Control: private, must-revalidate` auf allem HTML (`consentMiddleware.js:21`). Damit ist kein CDN-Caching möglich.
  - Statische Dateien: `public, max-age=31536000, immutable` für **alles** unter `public/` (`index.js:292-294,303`), auch `robots.txt`, `llms.txt`, `site.webmanifest` und `/images/*` ohne `?v=`-Version (z. B. `heroBg.webp`, 903.744 Bytes).
- **Risiko:** Dateien ohne Hash-Parameter bleiben bis zu 1 Jahr in Browser-/Proxy-Caches, selbst wenn sie ersetzt werden. Zusätzlich DB-Last und Cookie vor Einwilligung (datenschutzrechtlich separat bewerten, das Cookie dient der CSRF-Absicherung).
- **Fix:**
  1. CSRF-Token nur erzeugen, wenn ein Formular gerendert wird (lazy in `attachCsrfToken` über `res.locals.csrfToken` als Getter), sodass anonyme GET-Requests keine Session schreiben.
  2. Für `robots.txt`, `llms.txt`, `site.webmanifest`, `sitemap.xml` `Cache-Control: public, max-age=3600` setzen (`express.static` mit `setHeaders`: bei diesen Dateinamen `max-age=3600`, ohne `immutable`).
  3. Bilder in `/images/` über `asset()` mit Hash ausliefern oder `max-age=2592000` ohne `immutable` verwenden.
  4. Optional: Anonyme HTML-Seiten mit `Cache-Control: public, max-age=0, s-maxage=300` ausliefern, sobald ein CDN davor steht.
- **Aufwand:** mittel.

**M-8: IndexNow ist nicht implementiert**

- **Beleg:** Keine Treffer für „indexnow“ im Repo (ohne `node_modules` und Audit-Ordner). Kein Key-File im Webroot.
- **Relevanz:** IndexNow wird von Bing, Yandex, Naver, Seznam und Yep genutzt (nicht von Google). Bing speist Copilot und weitere KI-Suchen, daher für die GEO-Strategie interessant. Bei einem Blog mit Content-Agent (`services/contentAgent/`) lohnt sich die Benachrichtigung bei Veröffentlichung.
- **Fix:**
  1. Key erzeugen (8–128 Zeichen), Datei `public/<key>.txt` mit dem Key als Inhalt anlegen.
  2. Neuer Service `services/indexNowService.js`:

```js
export async function submitIndexNow(urls) {
  const key = process.env.INDEXNOW_KEY;
  if (!key || !urls?.length) return;
  await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: 'www.komplettwebdesign.de',
      key,
      keyLocation: `https://www.komplettwebdesign.de/${key}.txt`,
      urlList: urls
    })
  });
}
```

  3. Aufruf beim Veröffentlichen/Aktualisieren von Blogposts, Ratgebern und Leistungsseiten (in `controllers/adminBlogController.js` und im Publish-Schritt des Content-Agents), mit den kanonischen URLs. Nur echte Änderungen melden, nicht massenhaft.
- **Aufwand:** niedrig.

### Low

- **L-1: Unnötiger Doppel-Hop `http://komplettwebdesign.de` → `https://komplettwebdesign.de` → `https://www.komplettwebdesign.de`.** Die erste Weiterleitung kommt vom Reverse-Proxy (Body „Moved Permanently“, 17 Bytes), die zweite von Express (`index.js:225`). Fix: Im Proxy direkt auf `https://www.komplettwebdesign.de$request_uri` weiterleiten (ein Hop). Siehe auch gebündelte Prüfung unten.
- **L-2: `/handwerker` ohne `lang`-Attribut.** `views/page_view.ejs:2` rendert `<html>` ohne `lang` (CMS-Seiten über `routes/slug.js`). Fix: `<html lang="de">`. Zusätzlich enthält die H1 den Claim „In 30 Tage bis zu 128 % mehr Aufträge“, der belegt oder entfernt werden sollte (Content-Thema).
- **L-3: 404-Seiten teilweise mit `index,follow`.** `/blog?page=99` und `/branchen/webdesign-handwerker` liefern korrekt 404, tragen aber `meta robots index,follow`, weil `res.render('404')` ohne `res.locals.robots='noindex,nofollow'` aufgerufen wird (`controllers/blogController.js:40`; Branchen-Controller analog). Außerdem setzt jede 404-Seite ein Self-Canonical auf die fehlerhafte URL. Fix: Zentral in `views/404.ejs` bzw. vor dem Render `res.locals.robots` setzen und das Canonical bei 404 unterdrücken.
- **L-4: `/favicon.ico` liefert 404** (trotz `<link rel="icon">`). Manche Crawler und Browser fragen die Datei trotzdem an. Fix: `app.get('/favicon.ico', (_req,res)=>res.redirect(301,'/images/icon32.png'))` oder die Datei nach `public/` legen.
- **L-5: Kein `security.txt`.** `/.well-known/security.txt` ist 404. Fix: Datei mit `Contact:` und `Expires:` anlegen.
- **L-6: `llms.txt` nennt `Canonical site: https://komplettwebdesign.de/` (Apex statt www)** und „Last updated: 2026-04-21“. Fix: auf `https://www.komplettwebdesign.de/` ändern und Datum aktualisieren (`public/llms.txt`).
- **L-7: hreflang-Codes uneinheitlich.** `/website-tester*` nutzt `en-US`, alle anderen Seiten `en`. Fix: Einheitlich `en` verwenden (Details im Sub-Skill `seo-hreflang`).
- **L-8: robots.txt: `Disallow: /test` und `Disallow: /webhook` sind Präfix-Regeln.** Künftige Pfade wie `/testimonials` oder `/webhooks-info` wären versehentlich gesperrt. Fix: `Disallow: /test/` bzw. `Disallow: /webhook/` und `Disallow: /webhook$` bei Bedarf. Zusätzlich liegt im Repo-Root eine veraltete `Robots.txt` (ohne `/api/`, `/webhook`, `/test`), ausgeliefert wird `public/robots.txt`. Veraltete Datei löschen. Die Regeln pro Bot sind redundant, aber korrekt, weil benannte Gruppen die `*`-Gruppe ersetzen.
- **L-9: `app.js` enthält eine veraltete Parallel-Implementierung** (eigene Header-Middleware, Session-Setup, Zeilen 20-40, 109-113), die nicht gestartet wird (`package.json`: `"start": "node index.js"`). Risiko: Änderungen landen in der falschen Datei. Fix: entfernen oder klar kennzeichnen.
- **L-10: Title- und Description-Längen, Überschriftenhierarchie.** 52 Titel > 65 Zeichen (Extreme: `/blog/webdesign-lichtenberg-berlin` 94, `/blog/woche-1-was-ist-webdesign` 93), 33 Descriptions > 160 Zeichen (Extrem: `/blog/ki-suche-webdesign-2026` 250), 97 Seiten überspringen Überschriftenebenen, 2 Bilder ohne `alt` (`/blog/chatgpt-agentenmodus`). Details gehören in den On-Page-Report. Technisch: Titel in den Controllern bzw. DB-Feldern `meta_title` kürzen.
- **L-11: Thematische Nähe/Kannibalisierung.** Paare wie `/ratgeber/baukasten-vs-professionelle-website` und `/ratgeber/professionellen-website-vs-baukasten` oder `/ratgeber/website-kosten-zeitplan` und `/blog/website-kosten-2025-einfach-erklaert` behandeln ähnliche Suchintentionen. Eine Konsolidierung per 301 und Canonical sollte der Content-Report prüfen.
- **L-12: Server-Fingerprint und Struktur-Details.** Der Parameter `?page=abc` auf `/blog` liefert 200 mit Canonical `/blog` (korrekt, aber nicht wünschenswert, besser 301 auf `/blog`). Der Parameter `?page=1` liefert 200 mit Canonical `/blog` (korrekt).

## Core Web Vitals (nur Quelltext-Indikatoren, keine Messung)

- **LCP:** Server schnell (88 ms Median). Hero-Bild korrekt priorisiert. Risiken: 12 render-blockierende Stylesheets im `<head>` der Startseite (`bootstrap.min.css`, `main.css`, `unified-hero.css`, `interaction-polish.css`, `footer.css`, `chat.css` plus Seiten-CSS, `views/partials/head.ejs`). `/images/heroBg.webp` ist 904 kB groß und zugleich Standard-`og:image` auf den meisten Seiten. Kleinere Variante erzeugen (unter 200 kB).
- **INP:** Alle Skripte `defer`, kein offensichtlicher Main-Thread-Blocker im Quelltext. Bootstrap-Bundle, Chat-Widget, Tracking und `interaction-polish.js` laden auf jeder Seite. Ein Lab-Test (Lighthouse/PSI) sollte den Effekt messen.
- **CLS:** Laut Crawl fehlen bei 5.207 von 6.053 `<img>`-Tags `width`/`height`. Die Zahl ist durch die Nav-Icons (SVG, auf jeder Seite wiederholt) aufgebläht, auf der Startseite haben die Content-Bilder Maße. Content-Bilder aus Cloudinary (Blog) trotzdem prüfen und `width`/`height` oder `aspect-ratio` ergänzen.

## Strukturierte Daten (Kurzcheck)

- Startseite: 6 JSON-LD-Blöcke, alle valide (FAQPage, Organization mit ContactPoint, Person, WebSite, …).
- FAQPage steht auf 160 Seiten. Für kommerzielle Websites erzeugt FAQPage seit 2023 keine Rich Results mehr. Das schadet nicht, solange die Fragen sichtbar sind, bringt aber keinen SERP-Vorteil.
- Ohne Schema: `/about`, `/blog`, `/ratgeber`, `/impressum`, `/datenschutz`, `/booking`, `/demo/cq-compare/`. Details gehören in den Schema-Report.

## Priorisierte Maßnahmen (Reihenfolge)

1. H-1: Nav-Links `/leistungen` korrigieren, Pfad-Normalisierungs-Middleware, Canonical aus normalisiertem Pfad.
2. M-4, H-2: `noindex`/301 für Demo, `/de`, `/return_policy`, `/branchen-websites-erstellen-lassen`, `/booking`; Entscheidung zu den 11 Branchenseiten.
3. M-1: Sitemap-`lastmod` ehrlich machen, `changefreq`/`priority` entfernen.
4. M-2: Sprachumschalter ohne Query-Übernahme, FAQ-Kategorien indexierbar machen, `?cat=999` abfangen.
5. M-3: Blog-Slugs bereinigen, 301-Redirects aus `data/blogRedirects.js` generisch einbinden.
6. M-5: Header vor den Redirect-Block ziehen, `Permissions-Policy`, CSP-Report-Only.
7. M-7, M-8, L-Liste: Cache-Header für `robots.txt`/Manifest, lazy CSRF, IndexNow, Favicon, `security.txt`.

## Ergänzende curl-Nachprüfungen

Gebündelter Lauf am 23.10.2026 (ca. 05:45 UTC), `curl` mit eigenem User-Agent, 0,8 s Pause zwischen den Requests.

| Test | Ergebnis |
|---|---|
| `http://komplettwebdesign.de/kontakt?x=1` | 301 → `https://komplettwebdesign.de/kontakt?x=1` (Proxy), danach 301 → `https://www.komplettwebdesign.de/kontakt?x=1` (Express). **2 Hops**, Query bleibt erhalten. |
| `http://www.komplettwebdesign.de/kontakt?x=1` | 301 → `https://www.komplettwebdesign.de/kontakt?x=1` (1 Hop, in Ordnung) |
| `https://komplettwebdesign.de/` (Header) | 301 → `https://www.komplettwebdesign.de/`, **ohne** `Strict-Transport-Security` (siehe M-5) |
| `/leistungen/` und `/leistungen` | beide **200**, kein Redirect (siehe H-1) |
| `/Kontakt` | **200** (Canonical `/kontakt`) |
| `/ABOUT/` | **200**, Canonical `https://www.komplettwebdesign.de/ABOUT/` (Groß-/Kleinschreibung und Slash im Canonical, siehe H-1) |
| `/diese-seite-gibt-es-nicht-xyz123` | **404** mit `noindex,nofollow` (korrekt, kein Soft-404) |
| `/blog/website-checkliste-f%C3%BCr-selbstandige` (kodiert) | **200**, Canonical unkodiert `…/website-checkliste-für-selbstandige` |
| `/blog/website-checkliste-für-selbstandige` (unkodiert) | **200**, gleiches Canonical, gleicher Inhalt. Beide Varianten sind dieselbe URL im Sinne von RFC 3986 (Google normalisiert), faktisch also kein Duplikat, aber Canonical und Sitemap sollten kodiert sein (M-3). |
| `/blog/Scoll-Snapp-Galery-&-Zoom%E2%80%91on%E2%80%91View` (kodiert) | **200** |
| `/faq?cat=999` | **500** (siehe M-2) |
| `/de` | **200**, Duplikat der Startseite mit Self-Canonical (siehe H-2) |
| `/indexnow.txt` | 404 (kein IndexNow-Key-File, siehe M-8) |

Bilder ohne `width`/`height` laut Crawl: Startseite 22 von 53, `/kontakt` 22 von 22, `/blog/ki-suche-webdesign-2026` 23 von 23, `/leistungen/website-relaunch` 22 von 23. Das sind überwiegend die wiederholten Nav-Icons (SVG, `loading="lazy"`), wirkt sich also kaum auf CLS aus. Echte Content-Bilder (Cloudinary im Blog) einzeln prüfen.
