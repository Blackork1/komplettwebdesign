# Cookavoli Product Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine vollständige, zweisprachige Cookavoli-B2C-Website mit 14 eigenständigen Startseitenbereichen, echten App-Screens, Beta-/Release-Modus, sicherer TestFlight-/Android-Anmeldung und suchmaschinenfähigen Produkt- und Rechtseiten ausliefern.

**Architecture:** Die öffentliche Express-/EJS-Standalone-Website in `KomplettWebDesign` rendert alle Sprachen, Seitentypen und Beta-/Release-Zustände aus einem zentralen, validierten Inhaltsmodell. Sensible Anmeldung, Double-Opt-in, PostgreSQL und Mailversand bleiben im vorhandenen Express-Backend von `SwipeAndCook`; die Website spricht es ausschließlich über ein festes serverseitiges Gateway an. Interaktivität ist progressive Erweiterung, während Routing, Kerninhalte, Formulare und Bestätigungen ohne JavaScript funktionieren.

**Tech Stack:** Node.js ESM, Express 5/EJS, Zod 3, HTML/CSS/Browser-JavaScript ohne neue UI-Bibliothek, Node Test Runner, Cheerio; im App-Backend Express 4, PostgreSQL 16, `pg`, Nodemailer/Manitu, `express-rate-limit`, vorhandene Kryptografie- und Testinfrastruktur.

**Spec:** `docs/superpowers/specs/2026-09-27-cookavoli-website-design.md`

## Global Constraints

- Website-Root: `/Users/blocksdorf/Documents/KomplettWebDesign`; App-/API-Root: `/Users/blocksdorf/development/SwipeAndCook`.
- Vorhandene Nutzeränderungen in beiden schmutzigen Arbeitsbäumen nicht zurücksetzen, überschreiben oder pauschal stagen; jeder Commit enthält ausschließlich die in seiner Aufgabe genannten Dateien.
- Die vorhandene Express-/EJS-Architektur erhalten und keine neue Laufzeitabhängigkeit ergänzen.
- Deutsch korrekt mit Umlauten und deutscher Grammatik schreiben; Englisch idiomatisch und vollständig übersetzen.
- B2C-only: keine B2B-, „für Teams“- oder Business-Ansprache.
- Leitidee sichtbar führen: „Weniger grübeln. Mehr entdecken.“; „Swipe and Cook“ nicht als Hauptformulierung verwenden.
- Keine erfundenen Screens, Funktionen, Preise, Storelinks, Bewertungen, Nutzerzahlen, Auszeichnungen oder Zitate.
- Nur frisch aus echten Builds aufgenommene iOS- und Android-Screens veröffentlichen.
- Das zuletzt vom Nutzer gesendete CA-Blatt-Icon vorläufig exakt verwenden; die unbestätigte Wortmarke nicht verwenden.
- Deutsche Rechtstexte ausschließlich aus den vorhandenen S2-Dokumenten übernehmen; englische Übersetzungen bis zur juristischen Freigabe `noindex` halten.
- `/de/` und `/en/` zeigen zunächst Beta; `/startseite2` und `/en/startseite2` sind vor Release `noindex, nofollow` und fehlen in der Sitemap.
- Beta zeigt keine Preise. Release zeigt Preise, Trial und Storelinks nur aus verifizierter Konfiguration.
- Keine Werbepixel. Optionale Messung ist einwilligungsabhängig, First Party und ohne personenbezogene Formulardaten.
- Medien erhalten feste Maße und Seitenverhältnisse; Slider verändern weder Abschnittshöhe noch vertikale Scrollposition.
- Kein globales `overflow-wrap: anywhere` und kein globales `overflow-x: hidden` als Reparatur für Layoutfehler.
- Bestehende Host-, CSP-, HSTS-, CSRF-, Kontolöschungs- und Sicherheitsregressionen bleiben wirksam.

## Review Focus

- **Unbekannte Sprache, Querystrings und Altpfade:** `/`, alte Kurzpfade und Sprachwechsel führen deterministisch auf kanonische Ziele und verlieren keine sichere Querykomponente; Task 2 testet Redirects, Canonicals und `hreflang`.
- **Ungültiger Modus oder unvollständige Storedaten:** Beta startet ohne Preise, Release scheitert bei fehlenden verifizierten Storewerten geschlossen; Task 1 und Task 11 testen beide Konfigurationen.
- **Extreme Medienmaße und Sliderwechsel:** Hochformat-Screens bleiben vollständig im Rahmen, alle Slides haben eine stabile Höhe und horizontale Bedienung verschiebt die Seite nicht vertikal; Task 4 und Task 6 testen Assetmaße und CSS-/DOM-Verträge.
- **Doppelte Anmeldung, Linkscanner und abgelaufene Tokens:** Anfragen bleiben neutral, GET bestätigt nichts, nur ein CSRF-geschützter POST bestätigt idempotent; Task 9 und Task 10 testen diese Zustände.
- **API-, SMTP- oder JavaScript-Ausfall:** Die Seite behält Eingaben, zeigt sichere lokalisierte Fehler und bietet den vollständigen serverseitigen Formularweg; Task 9 und Task 10 testen Ausfälle und den No-JavaScript-Pfad.

---

## File Structure

### Website-Repository `KomplettWebDesign`

- `data/cookavoli/siteConfig.js`: validiert Sprache, Beta-/Release-Modus, Freigabeflags und verifizierte Storemetadaten.
- `data/cookavoli/siteRoutes.js`: kanonische Seiten-IDs, deutsche/englische Pfade, Altpfade und indexierbare Sitemapziele.
- `data/cookavoli/siteContent.js`: vollständige deutsche und englische Produkttexte einschließlich der 14 Startseitenbereiche.
- `data/cookavoli/appMedia.js`: lokalisierte Alt-Texte, Plattform, Maße und Pfade der verifizierten App-Screens.
- `services/cookavoliPagePresentationService.js`: baut aus Konfiguration, Route und Inhalt unveränderliche Renderdaten und SEO-Schemas.
- `services/cookavoliBetaSignupGateway.js`: einziges serverseitiges Gateway für Anmeldung und Bestätigung.
- `services/cookavoliWebsiteAnalyticsGateway.js`: sendet ausschließlich erlaubte anonyme Ereignisse an die feste API-Herkunft.
- `routes/cookavoliStaticPages.js`: lokalisiertes Produkt-, Legal-, robots- und Sitemap-Routing.
- `routes/cookavoliBetaSignupRoutes.js`: progressive HTML-/JSON-Anmeldung und explizite Bestätigung.
- `routes/cookavoliConsentRoutes.js`: setzt oder widerruft ausschließlich die First-Party-Analyseeinwilligung.
- `views/cookavoli/home.ejs`: orchestriert genau 14 unterschiedliche Startseiten-Partials.
- `views/cookavoli/product-page.ejs`, `faq.ejs`, `beta.ejs`, `confirmation.ejs`: fokussierte Seitentemplates.
- `views/cookavoli/partials/home/*.ejs`: je eine semantische Startseitenkomponente.
- `views/cookavoli/partials/head.ejs`, `header.ejs`, `footer.ejs`, `brand.ejs`, `consent.ejs`: gemeinsamer sprachfähiger Rahmen.
- `public/cookavoli/site.css`: Tokens, Basis, Navigation, Footer, Formulare und gemeinsame Komponenten.
- `public/cookavoli/home.css`: ausschließlich die 14 Startseitenlayouts und ihre responsiven Regeln.
- `public/cookavoli/product.css`: Produkt-, FAQ-, Legal- und Bestätigungsseiten.
- `public/cookavoli/site.js`, `home.js`, `beta-signup.js`, `consent.js`: kleine progressive Browsermodule.
- `public/cookavoli/media/`: vorläufige Iconableitungen und echte Build-Screens.
- `content/cookavoli/en/*.md`: inhaltstreue englische Rechtsübersetzungen.
- `docs/media/cookavoli-app-screens.md`: prüfbares Screen-Inventar mit Buildstand und Aufnahmezustand.
- `tests/cookavoli*.test.js`: Inhalts-, Routing-, Medien-, Komponenten-, Formular-, SEO- und Sicherheitsverträge.

### App-/API-Repository `SwipeAndCook`

- `backend/db/patches/177_public_beta_signups.sql`: Double-Opt-in-Persistenz, Zustände, Constraints, Indizes und Retention.
- `backend/src/beta_signup/beta_signup_config.js`: fail-closed Feature-, SMTP-, URL-, Schlüssel- und Limitkonfiguration.
- `backend/src/beta_signup/beta_signup_crypto.js`: normalisiert, fingerprintet und verschlüsselt E-Mail-Adressen sowie hasht Tokens zweckgebunden.
- `backend/src/beta_signup/beta_signup_store.js`: atomare PostgreSQL-Zustandswechsel und neutrale Deduplizierung.
- `backend/src/beta_signup/beta_signup_mailer.js`: lokalisierte Double-Opt-in-E-Mails von `system@cookavoli.com`.
- `backend/src/beta_signup/beta_signup_service.js`: Start, Zustellung, explizite Bestätigung und Idempotenz.
- `backend/src/beta_signup/beta_signup_router.js`: öffentliche strikt validierte API-Endpunkte.
- `backend/db/patches/178_public_website_event_counts.sql`: ausschließlich tägliche anonyme Ereignisaggregate.
- `backend/src/public_website/website_event_*.js`: Allowlist, atomare Aggregation und öffentlicher Rate-Limit-Endpunkt.
- `backend/src/server.js`, `vps_setup/example.env`, `vps_setup/docker-compose.template.yml`: verdrahten beide neuen öffentlichen, standardmäßig deaktivierten Funktionen.
- `backend/test/beta_signup*.test.js`, `website_event*.test.js`: Unit-, Router-, Mail- und PostgreSQL-Regressionen.

---

### Task 1: Sprach-, Modus- und Inhaltsverträge zentralisieren

**Working directory:** `/Users/blocksdorf/Documents/KomplettWebDesign`

**Files:**
- Create: `data/cookavoli/siteConfig.js`
- Create: `data/cookavoli/siteRoutes.js`
- Create: `data/cookavoli/siteContent.js`
- Create: `services/cookavoliPagePresentationService.js`
- Create: `tests/cookavoliSiteModel.test.js`

**Interfaces:**
- Consumes: freigegebene Routen, Texte, Farben und Zustände aus der Spezifikation.
- Produces: `SUPPORTED_COOKAVOLI_LOCALES`, `COOKAVOLI_PAGE_KEYS`, `pathFor(locale, pageKey)`, `pageForPath(pathname)`, `loadCookavoliSiteConfig(env)`, `getCookavoliPage({ locale, pageKey, variant, config })` und `getCookavoliSitemapEntries(config)`.

- [ ] **Step 1: Failing Inhalts- und Konfigurationstests schreiben**

  `tests/cookavoliSiteModel.test.js` muss unter anderem diese Verträge festhalten:

  ```js
  assert.deepEqual(SUPPORTED_COOKAVOLI_LOCALES, ['de', 'en']);
  assert.equal(pathFor('de', 'home'), '/de/');
  assert.equal(pathFor('en', 'deleteAccount'), '/en/delete-account');
  assert.equal(getCookavoliPage({ locale: 'de', pageKey: 'home', variant: 'beta', config }).sections.length, 14);
  assert.equal(new Set(home.sections.map((section) => section.layout)).size, 14);
  assert.throws(() => loadCookavoliSiteConfig({ COOKAVOLI_SITE_MODE: 'staging' }), /invalid_cookavoli_site_mode/);
  assert.throws(() => loadCookavoliSiteConfig({ COOKAVOLI_SITE_MODE: 'release' }), /cookavoli_release_store_config_required/);
  ```

  Zusätzlich müssen beide Sprachen dieselben Seiten-, Abschnitts-, CTA- und FAQ-IDs besitzen; sichtbare deutsche Texte enthalten echte Umlaute und weder Platzhalter noch „für Teams“.

- [ ] **Step 2: Roten Testlauf bestätigen**

  Run: `node --test tests/cookavoliSiteModel.test.js`  
  Expected: FAIL wegen fehlender Cookavoli-Datenmodule.

- [ ] **Step 3: Routen- und Konfigurationsmodell implementieren**

  `loadCookavoliSiteConfig(env)` akzeptiert ausschließlich `beta` oder `release`. Im Beta-Modus bleiben Storewerte optional und werden nicht gerendert. Im Release-Modus sind HTTPS-Storelinks, nicht leere verifizierte Preisstrings und `trialDays: 7` zwingend.

- [ ] **Step 4: Vollständige DE-/EN-Inhalte und Präsentationsservice implementieren**

  `getCookavoliPage(...)` liefert gefrorene Renderdaten mit `locale`, `langTag`, `pageKey`, `canonicalPath`, `alternatePath`, `title`, `description`, `robots`, `sections`, `navigation`, `footer`, `schema` und `availability`. Texte bilden nur belegte Produktfunktionen ab.

- [ ] **Step 5: Grünen Testlauf bestätigen**

  Run: `node --test tests/cookavoliSiteModel.test.js`  
  Expected: PASS.

- [ ] **Step 6: Aufgabe isoliert committen**

  ```bash
  git add data/cookavoli/siteConfig.js data/cookavoli/siteRoutes.js data/cookavoli/siteContent.js services/cookavoliPagePresentationService.js tests/cookavoliSiteModel.test.js
  git commit -m "feat: add localized Cookavoli site model"
  ```

### Task 2: Kanonisches Sprachrouting und SEO ausliefern

**Working directory:** `/Users/blocksdorf/Documents/KomplettWebDesign`

**Files:**
- Modify: `cookavoli/app.js:136-230`
- Rewrite: `routes/cookavoliStaticPages.js`
- Modify: `views/cookavoli/partials/head.ejs:1-45`
- Modify: `views/cookavoli/not-found.ejs:1-10`
- Modify: `tests/cookavoliStandaloneSite.test.js`
- Create: `tests/cookavoliLocalizedRouting.test.js`

**Interfaces:**
- Consumes: Task 1 `loadCookavoliSiteConfig`, `pageForPath`, `getCookavoliPage`, `getCookavoliSitemapEntries`.
- Produces: lokalisierte EJS-Locals, 308-Redirects von `/` und Bestandsrouten, sprachfähige SEO-Metadaten sowie Sitemap/robots.

- [ ] **Step 1: Failing Routingtests ergänzen**

  Die Tests erwarten: `/` → 308 `/de/`; `/de` → 308 `/de/`; `/en` → 308 `/en/`; `/support?from=app` → 308 `/de/support?from=app`; `/de/`, `/en/`, `/startseite2` und `/en/startseite2` → 200; beide Previewseiten → `noindex, nofollow`; die beiden Startseiten besitzen `canonical`, `hreflang="de"`, `hreflang="en"` und `x-default`; Preview-Pfade fehlen in `sitemap.xml`.

- [ ] **Step 2: Roten Routinglauf bestätigen**

  Run: `node --test tests/cookavoliStandaloneSite.test.js tests/cookavoliLocalizedRouting.test.js`  
  Expected: FAIL bei Redirect, englischen Routen und Sprachmetadaten.

- [ ] **Step 3: App-Locals und Fehlerlokalisierung verdrahten**

  `createCookavoliApp({ siteConfig, ... })` lädt ohne Injektion `loadCookavoliSiteConfig(process.env)`, setzt keine hart codierte Sprache und wählt 404-Texte anhand des sicheren ersten Pfadsegments `de` oder `en`.

- [ ] **Step 4: Statische Routen datengetrieben implementieren**

  `createCookavoliStaticPagesRouter({ siteConfig, loadLegalPage })` rendert in diesem Schritt die beiden lokalisierten Startseiten, beide Release-Vorschauen und die bereits vorhandenen deutschen Legalziele; Produktseiten und englische Rechtseiten werden erst mit ihren vollständigen Templates in Task 7 beziehungsweise Task 8 montiert. Sichere Querystrings werden bei 308-Weiterleitungen erhalten. `robots.txt` sperrt `/api/`; `sitemap.xml` enthält nur bereits erreichbare kanonische, indexierbare Einträge.

- [ ] **Step 5: Head-Partial lokalisieren**

  `<html lang>`, Open-Graph-Locale, Bild-Alttext, Canonical, Alternates, Seitenschema und optionale `pageStyles`/`pageScripts` stammen aus Renderdaten; JSON-LD bleibt gegen `<` escaped und CSP-nonced.

- [ ] **Step 6: Routingtests grün ausführen**

  Run: `node --test tests/cookavoliSiteModel.test.js tests/cookavoliStandaloneSite.test.js tests/cookavoliLocalizedRouting.test.js`  
  Expected: PASS.

- [ ] **Step 7: Aufgabe isoliert committen**

  ```bash
  git add cookavoli/app.js routes/cookavoliStaticPages.js views/cookavoli/partials/head.ejs views/cookavoli/not-found.ejs tests/cookavoliStandaloneSite.test.js tests/cookavoliLocalizedRouting.test.js
  git commit -m "feat: add localized Cookavoli routing and SEO"
  ```

### Task 3: Vorläufige Marke und gemeinsamen Seitenrahmen umsetzen

**Working directory:** `/Users/blocksdorf/Documents/KomplettWebDesign`

**Files:**
- Create: `public/cookavoli/media/cookavoli-icon-light-temporary.png`
- Create: `public/cookavoli/media/cookavoli-icon-dark-temporary.png`
- Create: `docs/media/cookavoli-brand-assets.md`
- Create: `views/cookavoli/partials/brand.ejs`
- Rewrite: `views/cookavoli/partials/header.ejs`
- Rewrite: `views/cookavoli/partials/footer.ejs`
- Modify: `public/cookavoli/site.css`
- Create: `public/cookavoli/site.js`
- Modify: `public/cookavoli/manifest.webmanifest`
- Create: `tests/cookavoliShell.test.js`

**Interfaces:**
- Consumes: Task 1 Navigation, Footer, Locale, Sprachziele und Verfügbarkeitsstatus.
- Produces: zugänglicher Header/Footer, vorläufige Bildmarke, Design-Tokens und `initCookavoliShell(document)`.

- [ ] **Step 1: Failing Shell- und Markenverträge schreiben**

  Tests rendern DE und EN und prüfen: gesetztes „Cookavoli“ statt unbestätigter Wortmarke; kein sichtbares `Swipe • Cook • Enjoy`; aktuelles CA-Blatt-Icon; Skip-Link; Menübefehl mit `aria-expanded`; lokalisierte Navigation; Sprachlink zum äquivalenten Pfad; Beta-CTA; kein B2B-Link.

- [ ] **Step 2: Roten Shell-Test bestätigen**

  Run: `node --test tests/cookavoliShell.test.js`  
  Expected: FAIL wegen alter Wortmarke und einsprachiger Navigation.

- [ ] **Step 3: Vom Nutzer geliefertes Iconmotiv exakt mechanisch ableiten**

  Quelle ist `/tmp/codex-remote-attachments/01a0df54-3618-75f0-9655-247ebed46825/A0DA1B47-D4AF-4C79-B43C-EDEBBFDDB211/1-Foto-1.jpg`. Die beiden Iconhälften werden ohne generative Neuzeichnung quadratisch ausgeschnitten, farblich nicht interpretiert und als temporäre PNGs gespeichert. `docs/media/cookavoli-brand-assets.md` dokumentiert Quelle, Vorläufigkeit und späteren verlustfreien Austausch.

- [ ] **Step 4: Header, Footer und Brand-Partial implementieren**

  Native Links bleiben ohne JavaScript erreichbar. Das mobile Menü nutzt einen Button, Fokuszustände und Escape-Schließen. `brand.ejs` verwendet Icon plus gesetzten Namen und niemals die abgelehnte Wortmarke.

- [ ] **Step 5: Gemeinsame Design-Tokens und Basiskomponenten implementieren**

  Die Tokens enthalten exakt `#050A07`, `#0D1812`, `#59F21C`, `#EEF7EC`, `#F8FCF7`, `#102014`, Sans-/Serif-Stack, Abstands-, Radius- und Medientokens. Globale Regeln verhindern weder Überläufe durch Verstecken noch verwenden sie `overflow-wrap:anywhere`.

- [ ] **Step 6: Shell-Test und Manifestprüfung grün ausführen**

  Run: `node --test tests/cookavoliShell.test.js tests/cookavoliStandaloneSite.test.js`  
  Expected: PASS; Manifestname bleibt `Cookavoli` und verweist nur auf vorhandene lokale Assets.

- [ ] **Step 7: Aufgabe isoliert committen**

  ```bash
  git add public/cookavoli/media/cookavoli-icon-light-temporary.png public/cookavoli/media/cookavoli-icon-dark-temporary.png docs/media/cookavoli-brand-assets.md views/cookavoli/partials/brand.ejs views/cookavoli/partials/header.ejs views/cookavoli/partials/footer.ejs public/cookavoli/site.css public/cookavoli/site.js public/cookavoli/manifest.webmanifest tests/cookavoliShell.test.js
  git commit -m "feat: build Cookavoli brand shell"
  ```

### Task 4: Echte iOS- und Android-Produktmedien erfassen

**Working directories:** `/Users/blocksdorf/development/SwipeAndCook` und `/Users/blocksdorf/Documents/KomplettWebDesign`

**Files:**
- Create: `public/cookavoli/media/app/ios/discover.png`
- Create: `public/cookavoli/media/app/ios/decision.png`
- Create: `public/cookavoli/media/app/ios/week-plan.png`
- Create: `public/cookavoli/media/app/ios/plan-together.png`
- Create: `public/cookavoli/media/app/ios/safety.png`
- Create: `public/cookavoli/media/app/android/discover.png`
- Create: `public/cookavoli/media/app/android/decision.png`
- Create: `public/cookavoli/media/app/android/week-plan.png`
- Create: `public/cookavoli/media/app/android/plan-together.png`
- Create: `public/cookavoli/media/app/android/safety.png`
- Create: `data/cookavoli/appMedia.js`
- Create: `docs/media/cookavoli-app-screens.md`
- Create: `tests/cookavoliMediaAssets.test.js`

**Interfaces:**
- Consumes: echte aktuelle Flutter-Builds und fünf im Produkt belegte Zustände je Plattform.
- Produces: `getCookavoliMedia(mediaId, locale)` mit `src`, `width`, `height`, `platform`, `alt` und dokumentiertem Buildstand.

- [ ] **Step 1: Failing Medieninventartest schreiben**

  Der Test liest PNG-IHDR ohne neue Bibliothek und erwartet zehn vorhandene Dateien, positive Maße, Seitenverhältnisse zwischen `0.42` und `0.85`, fünf eindeutige Zustände pro Plattform, konkrete DE-/EN-Alttexte und keine Dateinamen mit `placeholder`, `mock` oder `demo`.

- [ ] **Step 2: Roten Medientest bestätigen**

  Run: `node --test tests/cookavoliMediaAssets.test.js`  
  Expected: FAIL wegen fehlender Build-Screens.

- [ ] **Step 3: Aktuelle iOS-Zustände nativ aufnehmen**

  App aus dem aktiven `SwipeAndCook`-Stand starten, die fünf belegten Zustände reproduzieren und mit `xcrun simctl io booted screenshot` aufnehmen. Keine Statusdaten, E-Mail-Adressen oder internen QA-Texte dürfen sichtbar sein.

- [ ] **Step 4: Aktuelle Android-Zustände nativ aufnehmen**

  Denselben Produktstand im Android-Emulator verwenden und je Zustand mit `adb exec-out screencap -p` aufnehmen. Es werden keine iOS-Screens als Android ausgegeben.

- [ ] **Step 5: Medien verlustarm begrenzen und dokumentieren**

  Screens behalten ihr vollständiges UI, werden höchstens auf 1440 Pixel Höhe reduziert und erhalten im Inventar Plattform, App-Commit, Aufnahmegerät, Datum, Zustand und zulässige Seitennutzung. Kann ein Zustand im echten Build nicht reproduziert werden, wird er nicht ersetzt oder erfunden, sondern die Aufgabe bis zur realen Quelle angehalten.

- [ ] **Step 6: Medienmodell implementieren und Test grün ausführen**

  Run: `node --test tests/cookavoliMediaAssets.test.js`  
  Expected: PASS.

- [ ] **Step 7: Website-Medien isoliert committen**

  ```bash
  git add public/cookavoli/media/app data/cookavoli/appMedia.js docs/media/cookavoli-app-screens.md tests/cookavoliMediaAssets.test.js
  git commit -m "feat: add verified Cookavoli app screens"
  ```

### Task 5: Semantische Startseite mit 14 eigenständigen Bereichen rendern

**Working directory:** `/Users/blocksdorf/Documents/KomplettWebDesign`

**Files:**
- Rewrite: `views/cookavoli/home.ejs`
- Create: `views/cookavoli/partials/home/hero.ejs`
- Create: `views/cookavoli/partials/home/availability.ejs`
- Create: `views/cookavoli/partials/home/decision-question.ejs`
- Create: `views/cookavoli/partials/home/journey.ejs`
- Create: `views/cookavoli/partials/home/discovery-slider.ejs`
- Create: `views/cookavoli/partials/home/decision-detail.ejs`
- Create: `views/cookavoli/partials/home/personalization-bento.ejs`
- Create: `views/cookavoli/partials/home/week-panorama.ejs`
- Create: `views/cookavoli/partials/home/plan-together.ejs`
- Create: `views/cookavoli/partials/home/use-cases-tabs.ejs`
- Create: `views/cookavoli/partials/home/feature-constellation.ejs`
- Create: `views/cookavoli/partials/home/safety-accordion.ejs`
- Create: `views/cookavoli/partials/home/faq-preview.ejs`
- Create: `views/cookavoli/partials/home/beta-cta.ejs`
- Create: `tests/cookavoliHomePage.test.js`

**Interfaces:**
- Consumes: Task 1 `home.sections`, Task 3 Shell, Task 4 `getCookavoliMedia`.
- Produces: genau 14 `data-home-section`-Bereiche mit eindeutigen `data-layout`-Werten und vollständiger semantischer Fallbackdarstellung.

- [ ] **Step 1: Failing Startseitenvertrag schreiben**

  Der Test rendert DE/EN und prüft genau eine H1, genau 14 Abschnitts-IDs, 14 unterschiedliche Layoutnamen, wechselnde Text-/Medienreihenfolge, vollständige Tabrollen, Slidersteuerung, echte Medienpfade, Beta-CTA sowie das Fehlen von Altmarke, B2B, sichtbaren QA-Begriffen und generischen Drei-Karten-Blöcken.

- [ ] **Step 2: Roten Startseitentest bestätigen**

  Run: `node --test tests/cookavoliHomePage.test.js`  
  Expected: FAIL bei Abschnittszahl und Komponentenstruktur.

- [ ] **Step 3: 14 fokussierte Partials implementieren**

  Jede Partial-Datei konsumiert genau ihren Abschnittsdatensatz, erzeugt eine eigene DOM-Anatomie und verwendet keine fest verdrahteten deutschen Texte. Der Hero führt „Weniger grübeln. Mehr entdecken.“; der Slider zeigt jeden Screen in einem festen Medienrahmen; Tabs und Akkordeons sind ohne JavaScript vollständig lesbar.

- [ ] **Step 4: Homepage-Orchestrierung implementieren**

  `home.ejs` enthält ausschließlich gemeinsamen Rahmen, Hauptbereich und die 14 Partials in der freigegebenen Reihenfolge. Beta- und Releaseinhalte kommen aus `page.availability`, nicht aus duplizierten Templates.

- [ ] **Step 5: Startseitenvertrag grün ausführen**

  Run: `node --test tests/cookavoliSiteModel.test.js tests/cookavoliHomePage.test.js`  
  Expected: PASS.

- [ ] **Step 6: Aufgabe isoliert committen**

  ```bash
  git add views/cookavoli/home.ejs views/cookavoli/partials/home tests/cookavoliHomePage.test.js
  git commit -m "feat: compose Cookavoli homepage story"
  ```

### Task 6: Responsive Guided-Dual-Story-Design und Interaktionen fertigstellen

**Working directory:** `/Users/blocksdorf/Documents/KomplettWebDesign`

**Files:**
- Create: `public/cookavoli/home.css`
- Create: `public/cookavoli/home.js`
- Modify: `views/cookavoli/partials/head.ejs`
- Create: `tests/cookavoliResponsiveComponents.test.js`
- Create: `tests/cookavoliInteractions.test.js`

**Interfaces:**
- Consumes: Task 5 DOM-Verträge.
- Produces: `initCookavoliHome(document, window)`, kontrollierbarer Slider, Tabs, Akkordeon und stabile responsive Medienrahmen.

- [ ] **Step 1: Failing Responsive- und Interaktionstests schreiben**

  Tests verlangen explizite `aspect-ratio`/`max-height` für Geräte, `object-fit: contain` für vollständige Screens, feste Slider-Trackhöhe, ausschließlich horizontale Track-Transformation, `scroll-snap-type: x`, Pausen bei Fokus/Hover/Tabwechsel, `prefers-reduced-motion`, vollständige Tab-ARIA-Beziehungen und keine globalen Überlauf-Hacks.

- [ ] **Step 2: Roten Komponentenlauf bestätigen**

  Run: `node --test tests/cookavoliResponsiveComponents.test.js tests/cookavoliInteractions.test.js`  
  Expected: FAIL wegen fehlender Styles und Controller.

- [ ] **Step 3: Desktop-, Tablet- und Mobilgeometrie implementieren**

  Guided Dual Story wechselt helle und dunkle Flächen ausgewogen. Text und Medien beginnen je nach Bereich links oder rechts. Alle Geräte verwenden begrenzte Container; Tabletpanorama und Smartphone-Screens haben getrennte Seitenverhältnisse. Kein Abschnitt übernimmt ungebremst die natürliche Bildhöhe.

- [ ] **Step 4: Progressive Interaktionen implementieren**

  `initCookavoliHome` aktiviert nur vorhandene Komponenten. Slider nutzt Vor/Zurück, Punktnavigation und eine einzige horizontale Achse; Autoplay stoppt bei Interaktion, unsichtbarem Dokument und reduzierter Bewegung. Tabs aktualisieren `aria-selected`, `tabindex` und Panels; Akkordeons verwenden native `details` oder gleichwertige vollständige Zustände.

- [ ] **Step 5: Komponentenläufe grün ausführen**

  Run: `node --test tests/cookavoliHomePage.test.js tests/cookavoliResponsiveComponents.test.js tests/cookavoliInteractions.test.js`  
  Expected: PASS.

- [ ] **Step 6: Aufgabe isoliert committen**

  ```bash
  git add public/cookavoli/home.css public/cookavoli/home.js views/cookavoli/partials/head.ejs tests/cookavoliResponsiveComponents.test.js tests/cookavoliInteractions.test.js
  git commit -m "feat: style and animate Cookavoli homepage"
  ```

### Task 7: Produkt-, FAQ- und Betaseiten vervollständigen

**Working directory:** `/Users/blocksdorf/Documents/KomplettWebDesign`

**Files:**
- Create: `views/cookavoli/product-page.ejs`
- Create: `views/cookavoli/faq.ejs`
- Create: `views/cookavoli/beta.ejs`
- Create: `views/cookavoli/partials/product/feature-story.ejs`
- Create: `views/cookavoli/partials/product/process-timeline.ejs`
- Create: `views/cookavoli/partials/product/device-stage.ejs`
- Create: `views/cookavoli/partials/product/faq-list.ejs`
- Create: `public/cookavoli/product.css`
- Modify: `routes/cookavoliStaticPages.js`
- Create: `tests/cookavoliProductPages.test.js`

**Interfaces:**
- Consumes: Task 1 Produktseiteninhalte, Task 4 Medien, Task 6 gemeinsame Komponenten.
- Produces: vollständige Seiten für Funktionen, Ablauf, gemeinsames Planen, Sicherheit, Beta und FAQ in beiden Sprachen; Support folgt zusammen mit seiner verbindlichen S2-Quelle in Task 8.

- [ ] **Step 1: Failing Produktseitentests schreiben**

  Für jede Seite und Sprache werden eine H1, eindeutiger Titel/Description, mindestens ein kontextueller interner Link, passende echte Medien, korrekte Breadcrumbdaten und das Fehlen leerer Abschnitte geprüft. FAQ-Markup muss exakt den sichtbaren Fragen entsprechen.

- [ ] **Step 2: Roten Produktseitenlauf bestätigen**

  Run: `node --test tests/cookavoliProductPages.test.js`  
  Expected: FAIL wegen fehlender Templates.

- [ ] **Step 3: Seitenlayouts und Partials implementieren**

  Funktionen nutzt Feature-Stories statt Kartenkopien; So funktioniert’s eine Timeline; Gemeinsam planen eine Zweigeräte-Bühne; Sicherheit eine ruhige Informationsarchitektur; FAQ eine vollständige native Akkordeonliste.

- [ ] **Step 4: Beta-Seite ohne Versandlogik rendern**

  Die Seite enthält die serverseitige Formularstruktur, Plattformwahl, Einwilligungstext und Zustandsplätze. Die tatsächliche Route/Gateway-Verdrahtung folgt in Task 10; ohne aktiviertes Gateway zeigt sie einen ehrlichen „demnächst verfügbar“-Zustand.

- [ ] **Step 5: Produktseitentests grün ausführen**

  Run: `node --test tests/cookavoliProductPages.test.js tests/cookavoliLocalizedRouting.test.js`  
  Expected: PASS.

- [ ] **Step 6: Aufgabe isoliert committen**

  ```bash
  git add views/cookavoli/product-page.ejs views/cookavoli/faq.ejs views/cookavoli/beta.ejs views/cookavoli/partials/product public/cookavoli/product.css routes/cookavoliStaticPages.js tests/cookavoliProductPages.test.js
  git commit -m "feat: add Cookavoli product pages"
  ```

### Task 8: Rechtstexte und Kontolöschung vollständig lokalisieren

**Working directory:** `/Users/blocksdorf/Documents/KomplettWebDesign`

**Files:**
- Create: `content/cookavoli/en/privacy.md`
- Create: `content/cookavoli/en/terms.md`
- Create: `content/cookavoli/en/support.md`
- Create: `content/cookavoli/en/delete-account.md`
- Modify: `services/cookavoliLegalContentService.js`
- Modify: `views/cookavoli/legal.ejs`
- Modify: `views/cookavoli/imprint.ejs`
- Modify: `views/cookavoli/partials/account-deletion-forms.ejs`
- Modify: `public/cookavoli/account-deletion.js`
- Modify: `routes/cookavoliAccountDeletionRoutes.js`
- Modify: `services/cookavoliAccountDeletionGateway.js`
- Create: `tests/cookavoliLegalLocalization.test.js`
- Modify: `tests/cookavoliAccountDeletionGateway.test.js`
- Modify: `tests/cookavoliStandaloneSite.test.js`

**Interfaces:**
- Consumes: bestehende deutsche S2-Dateien und Task 1 Pfad-/Sprachmodell.
- Produces: `loadCookavoliLegalPage(key, locale)`, vollständige DE-/EN-Routen für Support und Rechtliches, inhaltstreue englische Seiten, lokalisierte Löschformulare und ausschließlich Cookavoli-interne Fehlercodes.

- [ ] **Step 1: Failing Legal- und Kontolöschungstests schreiben**

  Tests prüfen deutsche S2-Vollständigkeit, DE-/EN-Überschriftenparität, korrekte Cookavoli-URLs/Kontakte, sichtbaren Versionsstand, keine Altmarke, `noindex` der englischen Rechtseiten ohne Freigabeflag sowie unveränderte neutrale und CSRF-geschützte Kontolöschung.

- [ ] **Step 2: Roten Legallauf bestätigen**

  Run: `node --test tests/cookavoliLegalLocalization.test.js tests/cookavoliAccountDeletionGateway.test.js tests/cookavoliStandaloneSite.test.js`  
  Expected: FAIL bei englischen Quellen, neuen Pfaden und Altmarken-Fehlercodes.

- [ ] **Step 3: Englische Rechtstexte inhaltstreu übertragen**

  Struktur, Pflichten, Anbieter, Fristen und Rechtsfolgen werden nicht erweitert oder verkürzt. Jede Datei enthält den tatsächlichen Stand der deutschen Quelle und einen Hinweis, dass vor öffentlicher Indexierung die juristische Freigabe erforderlich ist.

- [ ] **Step 4: Legalservice und Templates lokalisieren**

  `loadCookavoliLegalPage(key, locale)` verwendet für Deutsch weiterhin die S2-Quelle und für Englisch ausschließlich die neuen Übersetzungen. Pfade und Kontakte werden sprachgerecht eingesetzt; Betreiberangaben bleiben unverändert.

- [ ] **Step 5: Kontolöschung auf neue Sprachpfade und Cookavoli-Codes migrieren**

  Öffentliche API-Verträge bleiben neutral. Interne Codes `swipeandcook_deletion_*` werden zu `cookavoli_deletion_*`; die Website akzeptiert während der Migration zusätzlich die alten Upstreamcodes, gibt sie aber nie neu aus.

- [ ] **Step 6: Legalläufe grün ausführen**

  Run: `node --test tests/cookavoliLegalLocalization.test.js tests/cookavoliAccountDeletionGateway.test.js tests/cookavoliStandaloneSite.test.js`  
  Expected: PASS.

- [ ] **Step 7: Aufgabe isoliert committen**

  ```bash
  git add content/cookavoli/en services/cookavoliLegalContentService.js views/cookavoli/legal.ejs views/cookavoli/imprint.ejs views/cookavoli/partials/account-deletion-forms.ejs public/cookavoli/account-deletion.js routes/cookavoliAccountDeletionRoutes.js services/cookavoliAccountDeletionGateway.js tests/cookavoliLegalLocalization.test.js tests/cookavoliAccountDeletionGateway.test.js tests/cookavoliStandaloneSite.test.js
  git commit -m "feat: localize Cookavoli legal journeys"
  ```

### Task 9: Double-Opt-in im Cookavoli-Backend persistieren

**Working directory:** `/Users/blocksdorf/development/SwipeAndCook`

**Files:**
- Create: `backend/db/patches/177_public_beta_signups.sql`
- Create: `backend/src/beta_signup/beta_signup_config.js`
- Create: `backend/src/beta_signup/beta_signup_crypto.js`
- Create: `backend/src/beta_signup/beta_signup_store.js`
- Create: `backend/src/beta_signup/beta_signup_mailer.js`
- Create: `backend/src/beta_signup/beta_signup_service.js`
- Create: `backend/src/beta_signup/beta_signup_router.js`
- Modify: `backend/src/server.js`
- Modify: `backend/package.json`
- Modify: `vps_setup/example.env`
- Modify: `vps_setup/docker-compose.template.yml`
- Create: `backend/test/beta_signup_config.test.js`
- Create: `backend/test/beta_signup_request.test.js`
- Create: `backend/test/beta_signup_confirmation.test.js`
- Create: `backend/test/beta_signup_mailer.test.js`
- Create: `backend/test/beta_signup_postgres.test.js`
- Modify: `backend/test/db_patch_fresh_bootstrap.test.js`

**Interfaces:**
- Consumes: vorhandene PostgreSQL-, SMTP-, `AuthError`-, Request-ID- und Rate-Limit-Infrastruktur.
- Produces: `loadBetaSignupConfig(env)`, `createBetaSignupCrypto(options)`, `createBetaSignupStore(pool)`, `createBetaSignupMailer(options)`, `createBetaSignupService(options)`, `createBetaSignupRouter(options)` sowie `POST /v1/public/beta-signups` und `POST /v1/public/beta-signup-confirmations`.

- [ ] **Step 1: Failing Schema-, Config- und Kryptografietests schreiben**

  Die Tests verlangen Feature-Default `false`, HTTPS-Bestätigungsbasis, Absender `system@cookavoli.com`, 24-Stunden-Tokenlaufzeit, 60-Sekunden-Wiederholsperre, fünf E-Mail-Anfragen und zehn IP-Anfragen pro Stunde, 32-Byte-Mindestgeheimnisse, normalisierte E-Mail-Fingerprints, AES-256-GCM-Verschlüsselung und zweckgebundene Token-HMACs.

- [ ] **Step 2: Roten Unitlauf bestätigen**

  Run: `node --test backend/test/beta_signup_config.test.js backend/test/beta_signup_request.test.js backend/test/beta_signup_confirmation.test.js backend/test/beta_signup_mailer.test.js`  
  Expected: FAIL wegen fehlender Module.

- [ ] **Step 3: Forward-only PostgreSQL-Patch implementieren**

  Tabelle `public_beta_signups` speichert UUID, E-Mail-Fingerprint, verschlüsselte E-Mail samt Keyversion, `ios|android`, `de|en`, Einwilligungsversion `beta-waitlist-2026-09-27`, Zeitpunkte, Tokenhash, Ablauf, Status `pending|confirmed|delivery_failed|expired|unsubscribed|invited`, Request-ID und Löschfrist. Unbestätigte Datensätze werden spätestens 48 Stunden nach Ablauf löschbar; Unique-/Partial-Indizes verhindern parallele aktive Duplikate.

- [ ] **Step 4: Config, Kryptografie und Store implementieren**

  Der Store bietet `createPending(input)`, `markDeliveryFailed(input)` und `confirm(input)`. `confirm` sperrt die Zeile atomar, bestätigt einen gültigen Pending-Datensatz genau einmal und antwortet bei wiederholter identischer Bestätigung idempotent; falsche, verbrauchte oder abgelaufene Werte sind nach außen gleich.

- [ ] **Step 5: Service, lokalisierte Mail und Router implementieren**

  Anfragefelder sind strikt `{ email, platform, locale, consent, consentVersion, website }`; Bestätigung strikt `{ signupId, token }`. Honeypot, bekannte und doppelte Adresse antworten neutral. Die E-Mail verlinkt nur auf `https://cookavoli.com/de/beta/bestaetigen` oder `/en/beta/confirm`; der Link selbst verändert keinen Zustand.

- [ ] **Step 6: Server und Deploymentkonfiguration fail-closed verdrahten**

  Neue Umgebungswerte heißen `PUBLIC_BETA_SIGNUP_ENABLED`, `PUBLIC_BETA_SIGNUP_URL`, `PUBLIC_BETA_SIGNUP_TOKEN_HMAC_SECRET`, `PUBLIC_BETA_SIGNUP_EMAIL_ENCRYPTION_KEY`, `PUBLIC_BETA_SIGNUP_EMAIL_KEY_VERSION`, `PUBLIC_BETA_SIGNUP_FROM_EMAIL=system@cookavoli.com` und `PUBLIC_BETA_SIGNUP_FROM_NAME=Cookavoli`. Host, Port, Sicherheit und Zugangsdaten kommen aus den vorhandenen SMTP-Werten. Der Router wird nur bei vollständig gültiger Konfiguration montiert. `backend/package.json` erhält den reproduzierbaren Lauf `test:beta:db` für `test/beta_signup_postgres.test.js` mit `--test-concurrency=1`.

- [ ] **Step 7: Unit- und Routertests grün ausführen**

  Run: `node --test backend/test/beta_signup_config.test.js backend/test/beta_signup_request.test.js backend/test/beta_signup_confirmation.test.js backend/test/beta_signup_mailer.test.js`  
  Expected: PASS, einschließlich neutraler Duplikate, Linkscanner-GET ohne Mutation, abgelaufenem Token und SMTP-Ausfall ohne Geheimnisleck.

- [ ] **Step 8: PostgreSQL- und Bootstraptest ausführen**

  Run: `TEST_DATABASE_URL="$TEST_DATABASE_URL" node --test --test-concurrency=1 backend/test/beta_signup_postgres.test.js backend/test/db_patch_fresh_bootstrap.test.js`  
  Expected: PASS; Patch ist auf leerer Datenbank und bei erneutem Patchlauf konsistent.

- [ ] **Step 9: Backendaufgabe isoliert committen**

  ```bash
  git add backend/db/patches/177_public_beta_signups.sql backend/src/beta_signup backend/src/server.js backend/package.json vps_setup/example.env vps_setup/docker-compose.template.yml backend/test/beta_signup_config.test.js backend/test/beta_signup_request.test.js backend/test/beta_signup_confirmation.test.js backend/test/beta_signup_mailer.test.js backend/test/beta_signup_postgres.test.js backend/test/db_patch_fresh_bootstrap.test.js
  git commit -m "feat: add Cookavoli beta double opt in"
  ```

### Task 10: Beta-Anmeldung und explizite Bestätigung in die Website integrieren

**Working directory:** `/Users/blocksdorf/Documents/KomplettWebDesign`

**Files:**
- Create: `services/cookavoliBetaSignupGateway.js`
- Create: `routes/cookavoliBetaSignupRoutes.js`
- Create: `views/cookavoli/confirmation.ejs`
- Create: `views/cookavoli/partials/beta-signup-form.ejs`
- Create: `public/cookavoli/beta-signup.js`
- Modify: `views/cookavoli/beta.ejs`
- Modify: `views/cookavoli/partials/home/beta-cta.ejs`
- Modify: `cookavoli/app.js`
- Modify: `cookavoli/example.env`
- Create: `tests/cookavoliBetaSignupGateway.test.js`
- Create: `tests/cookavoliBetaSignupFlow.test.js`

**Interfaces:**
- Consumes: Task 9 API-Endpunkte und Task 3 CSRF-/Shell-Infrastruktur.
- Produces: `createCookavoliBetaSignupGateway({ apiBaseUrl, fetchImpl, timeoutMs })`, `createCookavoliBetaSignupRouter({ gateway, csrfMiddleware, rateLimitMiddleware })`, HTML-POST-Fallback und optionale Fetch-Erweiterung.

- [ ] **Step 1: Failing Gateway- und End-to-End-Routentests schreiben**

  Tests prüfen feste Basis `https://api.cookavoli.com`, HTTPS-/Origin-Fail-Closed, keine Redirects, acht Sekunden Timeout, sichere Fehler-Allowlist, CSRF, Plattform-/Sprachfelder, verpflichtende Einwilligung, neutralen 303-Erfolg, No-JavaScript-POST sowie GET-Bestätigungsseite ohne Gatewaymutation.

- [ ] **Step 2: Roten Betalauf bestätigen**

  Run: `node --test tests/cookavoliBetaSignupGateway.test.js tests/cookavoliBetaSignupFlow.test.js`  
  Expected: FAIL wegen fehlender Gateway- und Routenmodule.

- [ ] **Step 3: Servergateway implementieren**

  `start(input)` sendet an `/v1/public/beta-signups`, `confirm(input)` an `/v1/public/beta-signup-confirmations`. Nur `202 { accepted: true }`, erlaubte 400-Codes und 429 werden unterschieden; alle anderen Antworten werden als lokalisierbarer 503-Zustand gekapselt.

- [ ] **Step 4: CSRF-Lebenszyklus in `cookavoli/app.js` verallgemeinern**

  `COOKAVOLI_BETA_SIGNUP_ENABLED` steuert das Websitefeature. Cookie-Parser und Token-Attachment laufen, sobald Kontolöschung oder Beta-Anmeldung aktiviert sind. Ein deaktiviertes Feature montiert keine zugehörigen POST-Routen. Bestehende Kontolöschungstests müssen unverändert weiterbestehen.

- [ ] **Step 5: Progressive HTML-Routen und Bestätigungsseite implementieren**

  POST `/de/beta/anmelden` und `/en/beta/signup` validieren, senden und leiten 303 auf einen neutralen Status derselben Sprachseite. GET-Bestätigung rendert Token/ID nur in einem `noindex`-/`no-store`-Formular; ausschließlich der CSRF-geschützte POST ruft `gateway.confirm` auf. Fehler setzen Fokus auf eine Zusammenfassung und erhalten nicht sensible Eingaben.

- [ ] **Step 6: Optionale Browsererweiterung implementieren**

  `beta-signup.js` verbessert Statusdarstellung und Fokus, ersetzt aber weder native Validierung noch den HTML-POST. E-Mail, Token und Einwilligung werden nie in Analytics oder `localStorage` geschrieben.

- [ ] **Step 7: Beta- und Sicherheitsläufe grün ausführen**

  Run: `node --test tests/cookavoliBetaSignupGateway.test.js tests/cookavoliBetaSignupFlow.test.js tests/cookavoliAccountDeletionGateway.test.js tests/cookavoliStandaloneSite.test.js`  
  Expected: PASS.

- [ ] **Step 8: Websiteaufgabe isoliert committen**

  ```bash
  git add services/cookavoliBetaSignupGateway.js routes/cookavoliBetaSignupRoutes.js views/cookavoli/confirmation.ejs views/cookavoli/partials/beta-signup-form.ejs public/cookavoli/beta-signup.js views/cookavoli/beta.ejs views/cookavoli/partials/home/beta-cta.ejs cookavoli/app.js cookavoli/example.env tests/cookavoliBetaSignupGateway.test.js tests/cookavoliBetaSignupFlow.test.js
  git commit -m "feat: connect Cookavoli beta signup"
  ```

### Task 11: First-Party-Einwilligung, Ereignisaggregate und Release-Gates umsetzen

**Working directories:** `/Users/blocksdorf/development/SwipeAndCook` und `/Users/blocksdorf/Documents/KomplettWebDesign`

**Files (App/API):**
- Create: `backend/db/patches/178_public_website_event_counts.sql`
- Create: `backend/src/public_website/website_event_store.js`
- Create: `backend/src/public_website/website_event_service.js`
- Create: `backend/src/public_website/website_event_router.js`
- Modify: `backend/src/server.js`
- Modify: `vps_setup/example.env`
- Modify: `vps_setup/docker-compose.template.yml`
- Create: `backend/test/website_event_router.test.js`
- Create: `backend/test/website_event_postgres.test.js`
- Modify: `backend/test/db_patch_fresh_bootstrap.test.js`

**Files (Website):**
- Create: `services/cookavoliWebsiteAnalyticsGateway.js`
- Create: `routes/cookavoliConsentRoutes.js`
- Create: `public/cookavoli/consent.js`
- Create: `views/cookavoli/partials/consent.ejs`
- Modify: `cookavoli/app.js`
- Modify: `data/cookavoli/siteConfig.js`
- Modify: `services/cookavoliPagePresentationService.js`
- Create: `tests/cookavoliConsentAndRelease.test.js`

**Interfaces:**
- Consumes: Task 1 Mode/Storekonfiguration, Task 3 Consent-Partial, Task 9 Backendkonventionen.
- Produces: `POST /v1/public/website-events`, `createCookavoliWebsiteAnalyticsGateway`, Consentcookie `cookavoli_analytics`, freigegebene Ereignisse und verifizierte Releaseausgabe.

- [ ] **Step 1: Failing Ereignis-, Consent- und Release-Tests schreiben**

  Die einzige Ereignis-Allowlist ist `platform_selected`, `signup_started`, `signup_completed`, `language_changed`, `store_link_clicked`. Payload enthält nur `{ event, locale, siteMode, platform, pathname }`; E-Mail, Token, IP, User-Agent und freie Texte werden abgewiesen. Release ohne beide HTTPS-Storelinks, verifizierte Preise und `trialDays: 7` scheitert; Beta rendert weder Preis noch `Offer`.

- [ ] **Step 2: Roten Lauf in beiden Repositories bestätigen**

  Run API: `node --test backend/test/website_event_router.test.js`  
  Run Website: `node --test tests/cookavoliConsentAndRelease.test.js`  
  Expected: beide FAIL wegen fehlender Module.

- [ ] **Step 3: Anonyme tägliche Aggregation im Backend implementieren**

  Patch 178 speichert nur Datum, Allowlist-Ereignis, `de|en`, `beta|release`, optionale `ios|android`-Plattform und Zähler. `INSERT ... ON CONFLICT ... DO UPDATE count = count + 1` ist atomar. Router ist rate-limitiert und standardmäßig deaktiviert; Request-IP und Header werden nicht persistiert.

- [ ] **Step 4: Einwilligungsroute und Same-Origin-Gateway implementieren**

  POST-Route setzt nach CSRF nur `essential` oder `analytics` in einem `Secure`, `HttpOnly`, `SameSite=Lax`-Cookie mit sechs Monaten Max-Age. Nur bei `analytics` leitet das Websitegateway Allowlist-Ereignisse an die feste API weiter; Ausfälle beeinflussen Navigation und Formulare nicht.

- [ ] **Step 5: Consentoberfläche und Ereignisbindung implementieren**

  Die Oberfläche erklärt optionale Reichweitenmessung, bietet gleichwertiges Ablehnen/Zustimmen und bleibt später im Footer änderbar. `consent.js` sendet keine Ereignisse vor Einwilligung und entfernt keine serverseitigen Inhalte bei Ablehnung.

- [ ] **Step 6: Release- und Previewdarstellung implementieren**

  Im Beta-Modus bleiben `/startseite2` und `/en/startseite2` immer `noindex`; bei fehlenden verifizierten Storedaten zeigen sie ehrliche deaktivierte Verfügbarkeitszustände ohne Preis. Im Release-Modus sind Storedaten zwingend, die 7-Tage-Testphase erscheint und `Offer` wird ausschließlich aus den verifizierten Strings gebaut.

- [ ] **Step 7: API- und Websitetests grün ausführen**

  Run API: `node --test backend/test/website_event_router.test.js`  
  Run Website: `node --test tests/cookavoliConsentAndRelease.test.js tests/cookavoliSiteModel.test.js tests/cookavoliLocalizedRouting.test.js`  
  Expected: PASS.

- [ ] **Step 8: PostgreSQL-Aggregation und Fresh-Bootstrap prüfen**

  Run: `TEST_DATABASE_URL="$TEST_DATABASE_URL" node --test --test-concurrency=1 backend/test/website_event_postgres.test.js backend/test/db_patch_fresh_bootstrap.test.js`  
  Expected: PASS ohne personenbezogene Spalten oder Rohereignistabelle.

- [ ] **Step 9: Backendanteil isoliert committen**

  ```bash
  git add backend/db/patches/178_public_website_event_counts.sql backend/src/public_website backend/src/server.js vps_setup/example.env vps_setup/docker-compose.template.yml backend/test/website_event_router.test.js backend/test/website_event_postgres.test.js backend/test/db_patch_fresh_bootstrap.test.js
  git commit -m "feat: aggregate Cookavoli website events"
  ```

- [ ] **Step 10: Websiteanteil isoliert committen**

  ```bash
  git add services/cookavoliWebsiteAnalyticsGateway.js routes/cookavoliConsentRoutes.js public/cookavoli/consent.js views/cookavoli/partials/consent.ejs cookavoli/app.js data/cookavoli/siteConfig.js services/cookavoliPagePresentationService.js tests/cookavoliConsentAndRelease.test.js
  git commit -m "feat: add Cookavoli consent and release gates"
  ```

### Task 12: Gesamtabnahme, Browserprüfung und Betriebsdokumentation

**Working directories:** beide Repository-Roots.

**Files:**
- Modify: `docs/deployment/cookavoli-vps-manitu.md`
- Create: `docs/qa/2026-09-27-cookavoli-website-abnahme.md`
- Modify: `tests/cookavoliStandaloneSite.test.js`
- Modify: `tests/cookavoliResponsiveComponents.test.js`
- Modify: `/Users/blocksdorf/development/SwipeAndCook/vps_setup/docs/ionos-bootstrap.md`

**Interfaces:**
- Consumes: Tasks 1–11.
- Produces: reproduzierbare Deploy-/Rollbackschritte und eine evidenzbasierte Endabnahme.

- [ ] **Step 1: Abschließende fehlende Regressionen vor der Prüfung ergänzen**

  Tests decken exakt noch ungetestete Abnahmebedingungen ab: keine sichtbaren Platzhalter-/QA-Begriffe, keine Team-/B2B-Rollen, keine unvollständigen Tabs, keine Before/After-Halbzonen, keine generischen Drei-Karten-Blöcke, kein `overflow-wrap:anywhere`, keine Preview-URL in Sitemap und stabile Medienrahmen.

- [ ] **Step 2: Gezielten Website-Testlauf ausführen**

  Run: `node --test tests/cookavoli*.test.js`  
  Expected: alle Cookavoli-Tests PASS.

- [ ] **Step 3: Vollständigen Website-Test und Assetbuild ausführen**

  Run: `npm run build && npm test`  
  Expected: Exit 0; keine bestehende Regression.

- [ ] **Step 4: Gezielten Backend-Unitlauf ausführen**

  Run: `node --test backend/test/beta_signup_config.test.js backend/test/beta_signup_request.test.js backend/test/beta_signup_confirmation.test.js backend/test/beta_signup_mailer.test.js backend/test/website_event_router.test.js`  
  Expected: PASS.

- [ ] **Step 5: Backend-PostgreSQL-Gates seriell ausführen**

  Run: `TEST_DATABASE_URL="$TEST_DATABASE_URL" node --test --test-concurrency=1 backend/test/beta_signup_postgres.test.js backend/test/website_event_postgres.test.js backend/test/db_patch_fresh_bootstrap.test.js`  
  Expected: PASS auf einer isolierten Testdatenbank.

- [ ] **Step 6: Lokalen Cookavoli-Server starten**

  Run: `COOKAVOLI_SITE_MODE=beta COOKAVOLI_COOKIE_SECRET='lokaler-testschluessel-mit-mindestens-32-zeichen' npm run start:cookavoli`  
  Expected: Healthcheck `/health` liefert 200; `/de/`, `/en/`, `/startseite2` und `/en/startseite2` sind erreichbar.

- [ ] **Step 7: Echte Browserabnahme durchführen**

  Prüfe bei 390×844, 768×1024, 1440×1000 und 1920×1080: alle 14 Abschnitte, Bildhöhen, Links-/Rechtswechsel, Menü, Fokus, Slider, Tabs, Akkordeons, Consent, No-JavaScript-Formular, DE/EN-Wechsel und Release-Vorschau. Browserkonsole und Netzwerk müssen frei von relevanten Fehlern, Mixed Content, 404-Assets und ungeplanten Drittanfragen sein.

- [ ] **Step 8: Sicherheits- und Inhaltsaudit ausführen**

  Run:

  ```bash
  rg -n "TODO|TBD|PLACEHOLDER|Lorem|QA|Swipe\s*(?:&|and)\s*Cook|Für Teams|For Teams|overflow-wrap:\s*anywhere" views/cookavoli public/cookavoli data/cookavoli content/cookavoli
  ```

  Expected: keine sichtbaren Platzhalter, Altmarken, B2B-Begriffe oder riskante globale Umbruchregel; zulässige Negativtests dürfen nur unter `tests/` vorkommen.

- [ ] **Step 9: Deployment-, Feature-Flag- und Rollbackdokumentation aktualisieren**

  Dokumentiere Reihenfolge Patch 177 → Backendflag → Websiteflag → Testmail → Beta-Freigabe sowie Patch 178 → Analyticsflag → Consentprüfung. Releaseumschaltung benötigt separat Storelinks, Preisverifikation, juristische EN-Freigabe und `COOKAVOLI_SITE_MODE=release`; Rollback setzt Flags zurück, ohne bestätigte Anmeldungen zu löschen.

- [ ] **Step 10: Abnahmeprotokoll mit frischer Evidenz schreiben**

  `docs/qa/2026-09-27-cookavoli-website-abnahme.md` enthält Befehle, Exitcodes, getestete URLs/Viewports, Medienstand, offene externe Freigaben und ausdrücklich keine Behauptung über nicht ausgeführte Tests.

- [ ] **Step 11: Dokumentation isoliert committen**

  Website:

  ```bash
  git add docs/deployment/cookavoli-vps-manitu.md docs/qa/2026-09-27-cookavoli-website-abnahme.md tests/cookavoliStandaloneSite.test.js tests/cookavoliResponsiveComponents.test.js
  git commit -m "docs: record Cookavoli website release evidence"
  ```

  App/API:

  ```bash
  git add vps_setup/docs/ionos-bootstrap.md
  git commit -m "docs: document Cookavoli public signup rollout"
  ```

---

## Execution Order and Gates

1. Tasks 1–3 establish contracts and shared UI without external services.
2. Task 4 is a hard media gate: no fabricated replacement is permitted.
3. Tasks 5–8 complete the public presentation and legal journeys.
4. Task 9 must pass Backend-Unit- und PostgreSQL-Tests before Task 10 enables website forms.
5. Task 11 remains feature-flagged until its API and Consenttests pass.
6. Task 12 is the final release gate; no Deployment is part of the implementation without separate authorization.

## Self-Review Result

- **Spec coverage:** Alle 21 Spezifikationsabschnitte sind Tasks 1–12 zugeordnet; App-Screens, Legalfreigabe, Beta-API, Analytics und Releasemodus besitzen eigene Gates.
- **Step scan:** Jeder Schritt erzeugt genau einen testbaren Zustand; Implementierungsdetails sind als Signaturen, Werte und erwartete Verträge festgelegt, nicht als vorweggenommener Vollcode.
- **Type consistency:** `locale` ist überall `de|en`, `siteMode` überall `beta|release`, `platform` überall `ios|android`; Signup verwendet durchgehend `signupId` und `token`.
- **Review Focus:** Die fünf wahrscheinlichsten Ausfallklassen besitzen konkrete Tests in Tasks 1/2, 4/6, 9/10 und 11.
- **Proportion:** Der Plan teilt die repositoryübergreifende Arbeit in zwölf eigenständig prüfbare Liefergegenstände und bleibt unterhalb einer vollständigen Codeabschrift.
