# Änderungsbericht komplettwebdesign.de

Stand: 03.06.2026

Quelle: lokaler Arbeitsbaum unter `/Users/blocksdorf/Documents/KomplettWebDesign`, Git-Status, Git-Diff gegen `HEAD`, aktuelle Projektdateien und vorhandene Phase-Reports.

Hinweis: Dieser Bericht wurde ausschließlich dokumentierend erstellt. Es wurden keine Tests neu ausgeführt, keine Deployments durchgeführt und keine Produktionsdaten verändert.

## 1. Executive Summary

Der lokale Relaunch-Stand richtet komplettwebdesign.de strategisch neu aus: individuelle Websites für kleine Unternehmen, Selbstständige und lokale Dienstleister in Berlin und Brandenburg, umgesetzt mit Node.js, EJS, CSS und JavaScript statt Baukasten-, Standard-Theme- oder WordPress-Template-Kommunikation.

Die größte inhaltliche Änderung ist die neue Paketlogik:

| Vorher | Nachher | wichtigste Änderung |
|---|---|---|
| Basis ab 499 € | Start ab 799 € | höherer, klar begrenzter Einstieg für Onepager oder 1 bis 3 Seiten |
| Business ab 899 € | Business ab 1.499 € | realistischer Umfang für kleine Unternehmenswebsites mit ca. 4 bis 7 Seiten |
| Premium ab 1.499 € | Wachstum ab 2.499 € | neuer Relaunch-/Struktur-Fokus mit ca. 8 bis 12 Seiten |
| kein sauberer Sonderumfang | Individuell ab 3.500 € oder nach Aufwand | Sonderfunktionen, CMS, Buchung, Mehrsprachigkeit und größere Anforderungen werden getrennt geprüft |

Zusätzlich wurden neue Klarheitsseiten eingeführt oder aktiviert: `/laufende-kosten-website`, `/zusatzleistungen-webdesign`, `/website-wartung-berlin`, `/local-seo-berlin`, `/website-relaunch-berlin`, `/landingpage-erstellen-lassen` und `/website-audit`. Die Preis-, Wartungs-, Zusatzleistungs-, Kontakt-, Tracking- und SEO-Kommunikation wurde deutlich vorsichtiger formuliert.

Auf Basis der vorhandenen QA-Reports gilt: **bedingtes Go**. Lokal sind laut Reports Tests, Build, Crawl, Canonicals, interne Links, JSON-LD und Altpreisprüfung bestanden. Offen bleiben manuelle Live-Prüfungen: Produktions-Smoke-Test, Kontaktformular mit echter E-Mail-Zustellung, Captcha, Consent/Tracking, Rechtstexte, Search Console, Rich Results und dünne Seiten.

## 2. Vergleichsbasis und Projektzustand

| Punkt | Befund |
|---|---|
| Git vorhanden | ja |
| aktueller Branch | `main` |
| HEAD | `b8e86e6` (`hero update und meta für startseite`) |
| Remote-Bezug | `origin/main`, `origin/HEAD` zeigen auf denselben Commit |
| `master`-Branch | nicht gefunden |
| Tags | keine Tags gefunden |
| klare Vorher-/Nachher-Basis | eingeschränkt |
| verwendete Vergleichsbasis | Arbeitsbaum gegen `HEAD` plus vorhandene Phase-Reports |
| geänderte getrackte Dateien | 130 |
| neue/ungetrackte Dateien | 74 vor Erstellung dieses Berichts |
| gelöschte Dateien | 0 |
| umbenannte Dateien | 0 |
| uncommitted changes | ja |
| Git-Diff-Statistik | 130 getrackte Dateien, 9.733 Einfügungen, 5.787 Löschungen |

Die Vergleichsbasis ist **nicht sauber**, weil der Relaunch-Stand nicht als eigener Commit oder klarer Branch vorliegt. `git diff main...HEAD` ist hier nicht sinnvoll, weil der aktuelle Branch bereits `main` ist und die Relaunch-Arbeit als uncommitted Arbeitsbaum vorliegt. Deshalb wurden folgende Quellen genutzt:

- `git status --short`
- `git diff --stat`
- `git diff --name-status`
- vorhandene Reports in `docs/phase14-*.md`, `docs/phase15-final-master-qa.md`, `docs/phase16-restprobleme-release-qa.md` und `docs/tracking-plan.md`
- aktuelle Routen, Controller, Datenobjekte, Templates, Sitemap-/robots-Logik und Suchläufe

Unsicherheit: Der genaue Stand vor dem Relaunch ist nicht vollständig rekonstruierbar. Aussagen mit Vorher/Nachher-Bezug sind daher entweder aus dem Diff, aus bestehenden Reports oder aus den im Prompt genannten Altwerten abgeleitet. Wo das nicht sicher möglich war, ist „manuelle Prüfung empfohlen“ notiert.

## 3. Gesamtüberblick der Änderungen

| Bereich | Änderung | Zweck | Risiko/Prüfpunkt |
|---|---|---|---|
| Positionierung | Solo-Webdesigner aus Berlin, persönliche Betreuung, individuelle Entwicklung | klarere Differenzierung gegen Baukasten/Theme-Kommunikation | öffentliche Texte manuell auf Ton und Konsistenz prüfen |
| Pakete | Start, Business, Wachstum, Individuell | realistischere Preis- und Umfangslogik | alle CTAs und Formularwerte live prüfen |
| Preisverwaltung | neue statische Daten plus DB-fähiger Pricing-Katalog | zentrale Pflege von Paketen, Add-ons, Wartung und Redirects | Migration/Seed nicht ungeprüft in Produktion ausführen |
| Redirects | `/pakete/basis` zu `/pakete/start`, `/pakete/premium` zu `/pakete/wachstum` | alte Paket-URLs auffangen | laut Phase 16 live nach Deployment erneut prüfen |
| neue Seiten | laufende Kosten, Zusatzleistungen, Wartung, Local SEO, Relaunch, Landingpage, Audit | Kostenklarheit, SEO-Struktur, Conversion-Führung | Thin Content und Live-Erreichbarkeit prüfen |
| Kontaktformular | neue Paketwerte, Projektart, Budget, Zeitrahmen, Seitenumfang, Inhalte, Zusatzfunktionen, Hosting/Wartung | bessere Lead-Qualifizierung | echte E-Mail-Zustellung und Captcha live prüfen |
| Tracking | neutrale Event-Schicht, Consent-Prüfung, PII-Filter | Messung ohne personenbezogene Eventparameter | im Browser vor/nach Consent prüfen |
| SEO | zentrale Meta-Daten, Canonicals, Sitemap-Policy, structured data | sauberere Indexierungs- und Rich-Result-Grundlage | Rich Results Test live durchführen |
| Rechtliche Kommunikation | keine Rechtsberatung, keine Ranking-Garantie, Drittanbieter-Kosten separat | weniger riskante Marketingversprechen | Impressum/Datenschutz nicht juristisch geprüft |
| Runtime-Sanitizer | `util/legacyPublicCopy.js` normalisiert Alttexte | Sicherheitsnetz für DB-/CMS-Altinhalte | langfristig redaktionell bereinigen |

## 4. Geänderte Dateien

### 4.1 Zentrale Dateien mit hoher Relevanz

| Datei | Status | Bereich | Kurzbeschreibung | Warum geändert? | betroffene Seiten | Risiko | manuell prüfen | Priorität |
|---|---|---|---|---|---|---|---|---|
| `data/packages.js` | neu | Datenobjekt | neue Paketstruktur, Preislogik, Ausschlüsse, FAQ-IDs, Redirectquellen | zentrale Angebotslogik ersetzen | Startseite, `/pakete`, Paketdetails, Kontakt, SEO | falsche Preiswerte hätten hohe Conversion-/Rechtswirkung | ja | kritisch |
| `data/addOns.js` | neu | Datenobjekt | Zusatzleistungen mit Preisrahmen und Drittanbieter-Hinweisen | Sonderfunktionen aus Paketen herauslösen | `/zusatzleistungen-webdesign`, Paketdetails | Umfang kann falsch verstanden werden | ja | hoch |
| `data/maintenancePlans.js` | neu | Datenobjekt | Wartung ab 39/79/129 €/Monat, keine 24/7-Zusage | alte „Wartung ab 5 €“-Logik ersetzen | `/website-wartung-berlin`, laufende Kosten | Support-Erwartung prüfen | ja | hoch |
| `data/seoMeta.js` | neu | Datenobjekt | Meta Title/Descriptions für Paketseiten | neue Paket-SEO-Daten | `/pakete`, `/pakete/start`, `/pakete/business`, `/pakete/wachstum`, `/pakete/individuell` | SERP-Darstellung prüfen | ja | hoch |
| `data/siteNavigation.js` | neu | Datenobjekt | Header/Footer zentralisiert | alte Links entfernen, neue Supportseiten verlinken | gesamte Website | kaputte Links oder falsche Priorisierung | ja | hoch |
| `routes/packages.js` | geändert | Route | neue Paketdetailrouten und alte Paketredirects | `/pakete/basis` und `/pakete/premium` auffangen | Paketbereich | Redirects live prüfen | ja | kritisch |
| `controllers/packagesController.js` | geändert | Controller | Paketübersicht/-details aus Pricing-Service, Canonicals, hreflang, JSON-LD, Kontakt | neue DB-fähige Paketlogik ausspielen | Paketbereich | DB-Fallback/Produktionsdaten prüfen | ja | kritisch |
| `services/pricingService.js` | neu | Service | zentrale Pricing-Abfragen, Cache, Admin-Funktionen | statische/DB-Daten entkoppeln | Pakete, Kontakt, Sitemap, Admin | Produktions-DB muss passende Tabellen/Daten haben | ja | hoch |
| `repositories/pricingRepository.js` | neu | Repository | SQL-Abfragen für Pakete, Add-ons, Wartung, Redirects, Admin | DB-Katalog betreiben | Paket- und Adminseiten | SQL-/Datenintegrität prüfen | ja | hoch |
| `middleware/pricingLocals.js` | neu | Middleware | lädt sichtbare Pakete, Preis-Map und Kontaktoptionen in `res.locals` | dynamische Preise in Views verfügbar machen | fast alle öffentlichen Seiten | leere Locals bei DB-Ausfall möglich | ja | hoch |
| `scripts/migrations/001_create_pricing_catalog.sql` | neu | Migration | Tabellen für Paketkatalog, Add-ons, Wartung, Redirects, Audit-Log | DB-Struktur vorbereiten | Admin/Pricing | nicht ungeprüft in Produktion ausführen | ja | hoch |
| `scripts/seed_pricing_catalog.js` | neu | Script | Insert-only Seed für Pricing-Katalog, nur mit `--apply` | Daten vorbereiten | DB/Pricing | Production-Seed nur mit Backup/Freigabe | ja | hoch |
| `controllers/contactController.js` | geändert | Controller | Formularnormalisierung, Validierung, Lead-Qualifizierung, Quick-Form-Fix | bessere Anfragequalität, Bot-/Leer-POST absichern | `/kontakt`, `/webdesign-berlin` | E-Mail, Captcha, Dateiupload live prüfen | ja | kritisch |
| `public/js/kontakt.js` | geändert | JavaScript | Wizard, reCAPTCHA, Form-Events, Validierungs-Events | UX und Tracking verbessern | Kontaktformular | mobile Bedienung und Captcha live prüfen | ja | hoch |
| `views/kontakt.ejs` | geändert | View | neues Kontaktformular mit Paket-/Budget-/Projektlogik | Lead-Qualifizierung sichtbar machen | `/kontakt` | Pflichtfelder und Texte prüfen | ja | hoch |
| `views/kontakt/thankyou.ejs` | geändert | View | noindex-Danke-Seite, Success-Events, Session-Deduplizierung | Conversion sauber messen | `/kontakt/thankyou` | Tracking und noindex live prüfen | ja | hoch |
| `public/js/tracking.js` | neu | JavaScript | PII-filternde Event-Schicht, Übergabe an GA/dataLayer/_paq/Plausible nur bei Consent | messbare CTAs/Formulare ohne personenbezogene Eventdaten | gesamte Website | Consent live prüfen | ja | hoch |
| `data/trackingEvents.js` | neu | Datenobjekt | erlaubte Events, Parameter und Page-Kontexte | Tracking dokumentieren/validieren | gesamte Website | Parametervalidierung prüfen | ja | mittel |
| `util/legacyPublicCopy.js` | neu | Utility | ersetzt alte Preise, alte Paketnamen, riskante Rechts-/Garantieformulierungen und alte Links zur Laufzeit | DB-/CMS-Altinhalte öffentlich entschärfen | Blog, Ratgeber, FAQ, Chat, Branchen/Leistungen | Sicherheitsnetz ersetzt keine Datenbereinigung | ja | hoch |
| `controllers/blogController.js` | geändert | Controller | nutzt Legacy-Normalisierung | Altinhalte im Blog entschärfen | Blog | DB-Quellen bereinigen | ja | hoch |
| `controllers/ratgeberController.js` | geändert | Controller | nutzt Legacy-Normalisierung | Altinhalte im Ratgeber entschärfen | Ratgeber | DB-Quellen bereinigen | ja | hoch |
| `controllers/faqController.js` | geändert | Controller | nutzt Legacy-Normalisierung | alte FAQ-Antworten abfangen | FAQ | sichtbare FAQ prüfen | ja | hoch |
| `controllers/chatController.js` | geändert | Controller | nutzt Legacy-Normalisierung | alte Chat-/Wissensantworten entschärfen | Chat | Quellen prüfen | ja | mittel |
| `controllers/newsletterController.js` | geändert | Controller | Logging personenbezogener E-Mail entfernt laut Phase 15 | Datenschutzrisiko reduzieren | Newsletter | Live-Anmeldung prüfen | ja | hoch |
| `routes/staticPages.js` | geändert | Route | neue statische Seiten, Kosten-Redirects, Branchenredirects | Klarheitsseiten aktivieren und alte Kosten-URLs führen | Kosten, Wartung, Local SEO, Zusatzleistungen | Live-Erreichbarkeit prüfen | ja | hoch |
| `routes/seoLandingRoutes.js` | geändert | Route | neue SEO-Landingpages | Relaunch/Audit/Landingpage/etc. aktivieren | SEO-Landingpages | Content und Sitemap prüfen | ja | mittel |
| `controllers/seoLandingController.js` | geändert | Controller | rendert Landingpages mit Breadcrumb/Service/FAQPage-Schema | SEO-Struktur bereitstellen | SEO-Landingpages | Rich Results prüfen | ja | mittel |
| `helpers/seoPagePolicy.js` | geändert | Helper/SEO | Sitemap-Policy für neue Seiten, Branchen und Bezirke | indexierbare Seiten steuern | Sitemap | Prioritäten prüfen | ja | hoch |
| `controllers/sitemapController.js` | geändert | Controller | dynamische Sitemap aus statischen Routen, Paketen, Branchen, Bezirken, Blog/Ratgeber | Sitemap aktualisieren | `/sitemap.xml` | Produktionsbasis-URL prüfen | ja | hoch |
| `public/robots.txt` | geändert | Sitemap/SEO | Disallow für interne Bereiche, LLM-Bots erlaubt, Sitemap auf `www` | Crawl- und Sitemap-Signale klären | `/robots.txt` | live öffnen | ja | hoch |
| `views/partials/head.ejs` | geändert | Partial | Canonical-Fallback, OG/Twitter, JSON-LD, Consent Mode | einheitliche SEO-/Tracking-Grundlage | gesamte Website | Doppelte Canonicals prüfen | ja | hoch |
| `views/partials/header.ejs` | geändert | Partial | Navigation aus `data/siteNavigation.js`, aktive Links, Sprachschalter | neue IA ausspielen | gesamte Website | mobile Navigation prüfen | ja | hoch |
| `views/partials/footer.ejs` | geändert | Partial | neue Footer-Spalten, Newsletter, neue Links, Chat-UI-Anpassungen | interne Links und Conversion verbessern | gesamte Website | Footerlinks prüfen | ja | hoch |
| `views/packages_list.ejs` | geändert | View | Paketvergleich, FAQ, JSON-LD, neue Preislogik | neue Pakete darstellen | `/pakete` | Pakettexte/Schema prüfen | ja | kritisch |
| `views/package_detail.ejs` | geändert | View | Detailseiten für Start/Business/Wachstum/Individuell | Paketdetails ausspielen | `/pakete/:slug` | Preise, Ausschlüsse, CTAs prüfen | ja | kritisch |
| `views/static/zusatzleistungen-webdesign.ejs` | neu/geändert | View | Zusatzleistungsseite | Scope-Abgrenzung | `/zusatzleistungen-webdesign` | Add-on-Preise prüfen | ja | hoch |
| `views/static/laufende-kosten-website.ejs` | neu | View | laufende Betriebskosten | Kostenklarheit | `/laufende-kosten-website` | Drittanbieterhinweise prüfen | ja | hoch |
| `views/static/website-wartung-berlin.ejs` | neu | View | Wartungspakete und Grenzen | Support-Erwartung klären | `/website-wartung-berlin` | Supportformulierungen prüfen | ja | hoch |
| `views/static/local-seo-berlin.ejs` | neu | View | Local-SEO-Seite | lokales SEO-Angebot erklären | `/local-seo-berlin` | keine Rankingversprechen | ja | hoch |
| `views/static/kosten/webdesign-cafe.ejs` | geändert | View | Kosten-/Scope-Logik, Canonical/Breadcrumb laut Report korrigiert | Thin Content reduzieren, Preislogik aktualisieren | `/webdesign-cafe/kosten` | Zusammenführung/Noindex prüfen | ja | mittel |
| `views/static/kosten/webdesign-blumenladen.ejs` | geändert | View | Kosten-/Scope-Logik, Canonical/Breadcrumb laut Report korrigiert | Thin Content reduzieren, Preislogik aktualisieren | `/webdesign-blumenladen/kosten` | Zusammenführung/Noindex prüfen | ja | mittel |
| `views/index.ejs` | geändert | View | Startseite, Paket-/Trust-/FAQ-/Schema-Logik | neue Positionierung und Preise | `/` | visuelle und textliche Prüfung | ja | kritisch |
| `views/bereiche/webdesign-berlin.ejs` | geändert | View | Webdesign-Berlin-Seite mit neuer Angebotslogik | Hauptgeldseite aktualisieren | `/webdesign-berlin` | CTA/Formular prüfen | ja | kritisch |
| `views/industries/index.ejs` | geändert | View | Branchenhub erweitert | Thin Content reduzieren | `/branchen` | weiter ausbauen | ja | mittel |
| `views/references/index.ejs` | geändert | View | Referenzübersicht trust-orientiert ergänzt | Thin Content reduzieren | `/referenzen` | echte Referenzen später ergänzen | ja | mittel |
| `views/references/show.ejs` | geändert | View | Referenzdetail ergänzt | Thin Content reduzieren | `/referenzen/zur-alten-backstube` | keine erfundenen Ergebnisse | ja | mittel |
| `package-lock.json` | geändert | Build/Dependency | Browserslist/caniuse-lite laut Report aktualisiert | Build-Warnung entfernen | Build | nicht erneut getestet | nein | niedrig |

### 4.2 Vollständige Git-Status-Dateiliste

Die vollständige Statusliste umfasst 130 getrackte Änderungen und 74 neue/ungetrackte Einträge vor Erstellung dieses Berichts. Für CSS-Minified-Dateien, Tests, Bilder und Admin-Views gelten die jeweiligen Gruppenbewertungen in Abschnitt 4.3.

| Datei/Gruppe | Status | Bereich |
|---|---|---|
| `.DS_Store` | geändert | sonstiges |
| `blog-ai-native-internet-semantic-retrieval.html` | geändert | sonstiges |
| `controllers/*` | geändert, plus `controllers/adminPricingController.js` neu | Controller |
| `data/*` | mehrere geändert, viele neue zentrale Datenobjekte | Datenobjekt |
| `helpers/*` | geändert | Helper/SEO |
| `index.js` | geändert | App |
| `middleware/pricingLocals.js` | neu | Middleware |
| `repositories/pricingRepository.js` | neu | Repository |
| `routes/*` | Paket-, Static-, SEO- und Admin-Pricing-Routen geändert/neu | Route |
| `services/pricingService.js` | neu | Service |
| `scripts/migrations/001_create_pricing_catalog.sql` | neu | Migration |
| `scripts/seed_pricing_catalog.js` | neu | Script |
| `public/js/*` | geändert, `public/js/tracking.js` neu | JavaScript |
| `public/*.css`, `public/css/*.css`, `*.min.css` | geändert | CSS |
| `public/images/*.webp` | neu | Bild |
| `public/robots.txt`, `public/llms.txt`, `public/pricing.md` | geändert | Sitemap/SEO |
| `views/index.ejs`, `views/packages_list.ejs`, `views/package_detail.ejs`, `views/kontakt.ejs` | geändert | zentrale Views |
| `views/static/*.ejs`, `views/static/kosten/*.ejs` | neu/geändert | View |
| `views/partials/*` | geändert | Header, Head, Footer, Cookie, Packages |
| `views/admin/pricing_*.ejs` | neu | Admin/Pricing |
| `views/bereiche/*`, `views/industries/*`, `views/references/*` | geändert/neu | Local-/Branchen-/Referenzseiten |
| `tests/*.test.js` | mehrere geändert/neu | Testabdeckung |
| `docs/phase14-*.md`, `docs/phase15-final-master-qa.md`, `docs/phase16-restprobleme-release-qa.md`, `docs/tracking-plan.md` | neu | QA-/Tracking-Dokumentation |

### 4.3 Bewertung je Datei-Gruppe

| Gruppe | Warum geändert? | Risiko | manuelle Prüfung |
|---|---|---|---|
| Controller | neue Preis-, Formular-, Sitemap-, SEO-, Sanitizer- und Adminlogik | falsche Daten aus DB oder fehlende Fallbacks könnten Seiten fehlerhaft rendern | Hauptseiten und Formulare live öffnen |
| Datenobjekte | neue zentrale Inhalte für Pakete, Zusatzleistungen, Wartung, Local SEO, Navigation, Tracking | Texte/Preise wirken öffentlich und conversion-relevant | Betreiberprüfung aller Preise/Leistungsgrenzen |
| Views/Partials | neue Darstellung, neue Navigation, neue Pakete, neue Kontakt-UX, SEO-/Schema-Einbindung | Layout, mobile Darstellung, doppelte Metas/Canonicals | Desktop/Mobil und Seitenquelltext prüfen |
| CSS/JS | neue Interaktionen, Kontakt-Wizard, Tracking, Layout-/Overflow-Fixes | mobile Bedienung, Consent-Verhalten, Minified-Dateien | Browser-Spotcheck und Consent-Test |
| Tests | neue/angepasste Erwartungen für Preise, Tracking, Sanitizer, Sitemap, Add-ons, Wartung | nicht erneut in diesem Bericht ausgeführt | vorhandene Ergebnisse übernommen |
| Docs | Phase-Reports und Tracking-Plan | können bereits ältere Zwischenstände enthalten | wichtigste Statuswerte mit Code abgeglichen |
| DB/Migration/Admin | zentrale Pricing-Verwaltung vorbereitet | Production-DB-Schreibzugriffe nur mit Backup und Freigabe | Staging/Produktionsplan separat prüfen |

## 5. Neue Seiten

| URL | Seitentyp | Route/Controller | Template/Datenquelle | Ziel | Hauptkeyword/Suchintention | H1/Title | Canonical/Sitemap | CTA | Schema | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| `/pakete/start` | Paketdetailseite | `routes/packages.js` / `packagesController.showPackage` | `views/package_detail.ejs`, `pricingService`, `data/packages.js`/DB | Einstiegspaket erklären | Start-Paket Webdesign Berlin, transaktional | H1: „Start-Paket für kompakte Websites ab 799 €“ | Canonical und Sitemap laut Policy/Controller | `/kontakt?paket=start` | Service, BreadcrumbList, FAQPage wenn sichtbar | fertig, live prüfen |
| `/pakete/wachstum` | Paketdetailseite | wie oben | wie oben | Relaunch/Strukturpaket erklären | Wachstum-Paket Webdesign, transaktional | H1: Wachstum-Paket für umfangreichere Websites und Relaunches | Canonical/Sitemap | `/kontakt?paket=wachstum` | Service/Breadcrumb/FAQ | fertig, live prüfen |
| `/pakete/individuell` | Paketdetailseite | wie oben | wie oben | Sonderumfang erklären | individuelles Webdesign-Projekt, transaktional | H1: Individuelles Webdesign-Projekt für Sonderfunktionen | Canonical/Sitemap | `/kontakt?paket=individuell` | Service/Breadcrumb/FAQ | fertig, live prüfen |
| `/laufende-kosten-website` | Kosten-/Klarheitsseite | `routes/staticPages.js` | `views/static/laufende-kosten-website.ejs`, `data/runningCostsPage.js` | Betriebskosten abgrenzen | laufende Website-Kosten, informational | „Laufende Website-Kosten nach dem Launch“ | Sitemap ja | `/kontakt`/Pakete | nicht sicher aus Template geprüft, Rich Results empfohlen | fertig, ausbauen möglich |
| `/zusatzleistungen-webdesign` | Zusatzleistungsseite | `routes/staticPages.js` | `views/static/zusatzleistungen-webdesign.ejs`, `data/addOnsPage.js` | Add-ons aus Paketen lösen | Zusatzleistungen Webdesign, commercial/informational | Add-ons/ Zusatzleistungen | Sitemap ja | `/kontakt?projektart=zusatzleistung` | FAQPage/BreadcrumbList laut Tests/Template | fertig |
| `/website-wartung-berlin` | Wartungsseite | `routes/staticPages.js` | `views/static/website-wartung-berlin.ejs`, `data/maintenancePage.js` | Wartung separat anbieten | Website Wartung Berlin, commercial | „Website-Wartung und Support in Berlin“ | Sitemap ja | `/kontakt?projektart=maintenance` | FAQ/Breadcrumb wahrscheinlich, live prüfen | fertig |
| `/local-seo-berlin` | Local-SEO-Seite | `routes/staticPages.js` | `views/static/local-seo-berlin.ejs`, `data/localSeoPage.js` | lokale SEO-Leistung erklären | Local SEO Berlin, commercial/informational | „Local SEO Berlin für kleine Unternehmen“ | Sitemap ja | `/kontakt?projektart=local-seo` | Service/FAQ/Breadcrumb laut Daten/Tests | fertig |
| `/website-relaunch-berlin` | Leistungsseite | `routes/seoLandingRoutes.js` / `seoLandingController` | `views/seo_landing/show.ejs`, `data/seoLandingPages.js` | Relaunch-Angebot erklären | Website Relaunch Berlin | „Website Relaunch Berlin für moderne Unternehmenswebsites“ | Sitemap ja | `/kontakt?projektart=relaunch` | WebPage, Service, BreadcrumbList, FAQPage | fertig |
| `/landingpage-erstellen-lassen` | Leistungsseite | SEO-Landingroute | `data/seoLandingPages.js` | Landingpage-Angebot | Landingpage erstellen lassen | H1 im Datenobjekt | Sitemap ja | Kontakt | WebPage/Service/Breadcrumb/FAQ | fertig, prüfen |
| `/website-audit` | Audit-/Toolseite | SEO-Landingroute | `data/seoLandingPages.js` | Audit als Leistung abgrenzen | Website-Audit | H1 im Datenobjekt | Sitemap ja | Kontakt/Website-Tester | WebPage/Service/Breadcrumb/FAQ | fertig, prüfen |
| `/website-erstellen-lassen-berlin` | SEO-Landingseite | SEO-Landingroute | `data/seoLandingPages.js` | Hauptintent ergänzen | Website erstellen lassen Berlin | „Website erstellen lassen in Berlin“ | Sitemap ja | `/kontakt` | WebPage/Breadcrumb/FAQ, Service wenn gesetzt | fertig |
| `/webdesign-kleine-unternehmen-berlin` | SEO-Landingseite | SEO-Landingroute | `data/seoLandingPages.js` | KMU-Intent | Webdesign kleine Unternehmen Berlin | H1 im Datenobjekt | Sitemap ja | Kontakt | WebPage/Breadcrumb/FAQ | fertig, prüfen |
| `/ablauf` | Prozessseite | SEO-Landingroute | `data/seoLandingPages.js` | Projektablauf erklären | Ablauf Webdesign Berlin | H1 im Datenobjekt | Sitemap ja | Kontakt/Pakete | WebPage/Breadcrumb/FAQ | fertig, prüfen |

Wenn eine der genannten Seiten live noch 404 liefert, ist das laut Phase 16 kein lokaler Code-Blocker, sondern ein Deployment-/Produktionsstand-Thema.

## 6. Überarbeitete Seiten

| URL | vorher kommuniziert | jetzt kommuniziert | Preis-/Paketänderung | CTA-/Linkänderung | offene Punkte |
|---|---|---|---|---|---|
| `/` | alte Paketanker und teilweise günstigere Festpreislogik | individuelle Node/EJS-Websites, klare Pakete ab 799 €, keine Baukasten-Kommunikation | Start/Business/Wachstum/Individuell | CTA zu Kontakt und Paketen | Startseite visuell prüfen |
| `/pakete` | Basis/Business/Premium, alte Einstiegspreise | neue Paketübersicht mit Vergleich, Ausschlüssen, FAQ und Hinweisen | komplett ersetzt | Paket-CTAs mit neuen Querywerten | alle Preise und FAQ prüfen |
| `/pakete/business` | Business ab 899 € | Business ab 1.499 €, ca. 4 bis 7 Seiten | Preis und Umfang angehoben | `/kontakt?paket=business` | Live-Detailseite prüfen |
| `/webdesign-berlin` | ältere Webdesign-Hauptseite mit alten Preis-/Paketresten möglich | neue Angebotslogik, individuelle Umsetzung, lokale Ausrichtung | neue Paketlogik | Kontakt-/Quick-Form integriert | Quick-Form live prüfen |
| `/webdesign-berlin/kosten-preise-pakete` | alte Kostenlogik teilweise möglich | neue Kosten-/Paketabgrenzung | neue Pakete | Footer/Supportseiten verlinkt | manuelle Prüfung empfohlen |
| `/kontakt` | einfachere Anfrage | detailliertes Formular mit Paket, Budget, Projektart, Zeitrahmen, Seitenumfang, Content, Zusatzfunktionen, Hosting/Wartung | neue Paketwerte | Danke-Seite und Tracking-Events | E-Mail/Captcha/Consent live prüfen |
| `/referenzen` | dünnere Übersicht | Trust-orientierte Referenzlogik ohne erfundene Zahlen | keine direkte Preisänderung | Links zu Kontakt/Paketen | echte Referenzen später ergänzen |
| `/branchen` | dünner Hub, laut Phase 14 vorher ca. 283 Wörter | laut Phase 16 auf ca. 402 Wörter verbessert | alte Branchenpreislogik per Sanitizer abgefangen | Branchen- und Webdesign-Links | weiter ausbauen |
| `/webdesign-cafe/kosten` | dünn, alte Preis-/Canonical-Risiken | laut Phase 16 ca. 488 Wörter, Canonical/Breadcrumb korrigiert | neue Paketlogik, Reservierung separat | Kosten-/Paketlinks | Zusammenführung/Noindex prüfen |
| `/webdesign-blumenladen/kosten` | dünn, alte Preis-/Canonical-Risiken | laut Phase 16 ca. 497 Wörter, Canonical/Breadcrumb korrigiert | neue Paketlogik, Shop/Sonderfunktionen separat | Kosten-/Paketlinks | Zusammenführung/Noindex prüfen |
| Blog/Ratgeber/FAQ/Chat | alte DB-/CMS-Inhalte mit 499/899/Basis/Premium möglich | Runtime-Normalisierung vor Ausgabe | alte Preisanker werden ersetzt | alte Links umgeschrieben | Quellen redaktionell bereinigen |
| Toolseiten | bestehende Website-/SEO-/GEO-/Broken-Link-Tools | Tracking-Taxonomie und sicherere CTA-Verknüpfung | keine direkte Paketänderung | Events/CTA-Tracking | Live-Tracking prüfen |

Vorher-Zustand ist nicht für jede Seite sicher rekonstruierbar. Bei diesen Seiten wurde der aktuelle Zustand plus vorhandene QA-Reports ausgewertet.

## 7. Entfernte, weitergeleitete oder nicht mehr intern verlinkte Seiten

| alte URL | neuer Status | Ziel | Typ | interner Link noch vorhanden? | Sitemap? | Risiko | manuelle Prüfung |
|---|---|---|---|---|---|---|---|
| `/pakete/basis` | Redirect | `/pakete/start` | 301 lokal | laut Reports nein | nicht enthalten | live laut Phase 16 vor Deployment noch 200 | nach Deployment prüfen |
| `/pakete/premium` | Redirect | `/pakete/wachstum` | 301 lokal | laut Reports nein | nicht enthalten | live laut Phase 16 vor Deployment noch 200 | nach Deployment prüfen |
| `/pakete/basis/` | Redirect | `/pakete/start` | 301 laut Phase 16 | nein | nicht enthalten | Slash-Variante live prüfen | ja |
| `/pakete/premium/` | Redirect | `/pakete/wachstum` | 301 laut Phase 16 | nein | nicht enthalten | Slash-Variante live prüfen | ja |
| `/webdesign-cafe` | Redirect | `/branchen/webdesign-cafe` | 301 | unklar | nein | alte externe Links möglich | ja |
| `/webdesign-blumenladen` | Redirect | `/branchen/webdesign-blumenladen` | 301 | unklar | nein | alte externe Links möglich | ja |
| `/webdesign-preise` | Redirect | `/webdesign-berlin/kosten-preise-pakete` | 301 | unklar | nein | alte Such-/Backlinkziele prüfen | ja |
| `/website-kosten-berlin` | Redirect | `/webdesign-berlin/kosten-preise-pakete` | 301 | unklar | nein | alte Such-/Backlinkziele prüfen | ja |
| alte PDF-Links | ersetzt/umgelegt | `/webdesign-berlin/kosten-preise-pakete` laut Sanitizer | Linkersatz | Platzhalter-PDF laut Phase 15 ersetzt | n/a | externe Links unbekannt | ja |
| alte Blog-/Ratgeberlinks | runtime-normalisiert | je nach Muster | Linkersatz | nicht vollständig sicher | n/a | Quellen enthalten Altbestand | redaktionell bereinigen |

## 8. Preis- und Paketänderungen

### 8.1 Paketvergleich vorher/nachher

| Paket alt | Paket neu | alter Preis | neuer Preis | alter Umfang | neuer Umfang | wichtigste Änderung |
|---|---|---:|---:|---|---|---|
| Basis | Start | ab 499 € | ab 799 € | digitale Visitenkarte/Onepager, teils Texte/SEO zu stark inkludiert | 1 bis 3 Seiten oder Onepager, klare Begrenzung | Einstieg realistischer, Sonderleistungen ausgeschlossen |
| Business | Business | ab 899 € | ab 1.499 € | bis ca. 5 Seiten, Kontaktformular, On-Page-SEO | ca. 4 bis 7 Seiten, technische SEO-Grundlagen und Struktur | Preis und Umfang an realistische Unternehmenswebsite angepasst |
| Premium | Wachstum | ab 1.499 € | ab 2.499 € | teils bis 20/25 Seiten, Buchung/CMS/Shop unklar enthalten | ca. 8 bis 12 Seiten, Relaunch, mehrere Leistungsseiten, stärkere Struktur | Premium wird durch Wachstum ersetzt, Sonderfunktionen getrennt |
| kein sauberer Altwert | Individuell | unklar | ab 3.500 € oder nach Aufwand | Sonderfälle teils in Premium vermischt | Sonderfunktionen, CMS, Buchung, Mehrsprachigkeit, Shop-Funktionen nach Prüfung | Scope-Risiko reduziert |

### 8.2 Leistungsgrenzen

| Thema | neue Grenze |
|---|---|
| Seitenumfang | Start: 1 bis 3, Business: ca. 4 bis 7, Wachstum: ca. 8 bis 12, Individuell: nach Aufwand |
| Texte | Einbindung/Strukturierung je Paket; umfangreiche Texterstellung separat |
| SEO | technische Grundlagen; Local SEO, zusätzliche SEO-Seiten und laufende SEO separat |
| Feedbackrunden | Start 1, Business 2, Wachstum 2 bis 3, Individuell nach Angebot |
| Zusatzleistungen | eigene Add-on-Logik mit Preisrahmen |
| Hosting/Wartung | nicht automatisch enthalten, separat als laufende Kosten/Wartung |
| Rechtstexte | technische Einbindung möglich, keine Rechtsberatung |
| Buchung/CMS/Shop/Mehrsprachigkeit | nicht Standard, nur Zusatzleistung oder individuelles Projekt |
| Drittanbieter | Kosten und Bedingungen separat |
| Umsatzsteuer | Preise gemäß § 19 UStG ohne Ausweis der Umsatzsteuer |

### 8.3 Entfernte Preisanker

| alte Aussage | neue Aussage | betroffene Bereiche | Status |
|---|---|---|---|
| Basis ab 499 € | Start ab 799 € oder „nach aktueller Paketlogik“ | Pakete, Branchen, DB-/CMS-Inhalte | öffentlich laut Reports bereinigt/normalisiert |
| Business ab 899 € | Business ab 1.499 € | Pakete, Kosten, DB-/CMS-Inhalte | öffentlich laut Reports bereinigt/normalisiert |
| Premium ab 1.499 € | Wachstum ab 2.499 € | Pakete, Branchen, SEO-Daten | öffentlich laut Reports bereinigt/normalisiert |
| Wartung ab 5 € | Wartung ab 39 €/Monat bzw. Wartung separat | Wartung/laufende Kosten | ersetzt |
| Buchungssystem/Shop/CMS unklar enthalten | Zusatzleistung/Individuell | Pakete, Branchen, Zusatzleistungen | entschärft |
| keine versteckten Kosten/alles inklusive | Kosten werden getrennt besprochen, klar abgegrenzter Umfang | Marketing/DB-Alttexte | per Sanitizer und neuen Texten entschärft |

## 9. Rechtliche und kommunikative Entschärfungen

| alte/riskante Aussage | neue Aussage | Datei/Seite | Risiko vorher | Status | manuelle Prüfung |
|---|---|---|---|---|---|
| `rechtssicher` | technisch sauber eingebunden | `util/legacyPublicCopy.js`, neue Angebotsdaten | Rechtsversprechen | normalisiert | ja |
| `rechtskonform` | datenschutzbewusst vorbereitet | `util/legacyPublicCopy.js` | Rechtsversprechen | normalisiert | ja |
| `DSGVO-konform` | datenschutzbewusst vorbereitet | `util/legacyPublicCopy.js`, Tests | Datenschutzversprechen | normalisiert/geprüft | ja |
| vollständiges Impressum/Datenschutzerklärung erstellt | gelieferte oder extern geprüfte Texte technisch eingebunden | Paket-/Kontakt-/Local-SEO-Texte | Rechtsberatung suggeriert | entschärft | ja |
| Ranking garantiert / Platz 1 / Top-Ranking | technische SEO-Grundlagen, keine Garantie | Local SEO, Relaunch, Sanitizer | Erfolgsgarantie | entschärft | ja |
| keine versteckten Kosten / alles inklusive | Kosten werden vor Umsetzung getrennt besprochen | Sanitizer, Add-ons, laufende Kosten | Scope-/Preisrisiko | entschärft | ja |
| 24/7-Buchung/Soforthilfe | Anfrage-/Buchungssystem als Zusatzleistung, kein 24/7-Notfallbetrieb | Add-ons, Wartung | Support-/Verfügbarkeitsversprechen | entschärft | ja |
| unbegrenzte Änderungen/Support | definierter Umfang, zusätzliche Wünsche separat | Pakete/Wartung/Admin-Warnungen | Scope-Risiko | entschärft | ja |

Wichtig: **Impressum und Datenschutzerklärung wurden nicht juristisch geprüft.** Die Entschärfung betrifft Marketing- und Angebotskommunikation. Eine rechtliche Prüfung bleibt manuell erforderlich.

## 10. SEO-Änderungen

| URL | neuer Title/Meta | H1 | Canonical | Sitemap | index/noindex | strukturierte Daten | Hauptkeyword/Intent | Status |
|---|---|---|---|---|---|---|---|---|
| `/` | `Website erstellen lassen Berlin | ab {{lowestPackagePriceLabel}}` laut Controller | Website erstellen lassen in Berlin | zentraler Head-Fallback | ja | index | Organization, Person, WebSite, Service, WebPage, Breadcrumb | Website erstellen lassen Berlin | fertig, visuell prüfen |
| `/pakete` | Website-Pakete/Preise ab niedrigstem Preis | Paketübersicht | Controller-SEO | ja | index | WebPage, BreadcrumbList, ItemList, FAQPage | Webdesign Pakete Berlin | fertig |
| `/pakete/start` | Start-Paket Webdesign ab 799 € | Start-Paket für kompakte Websites ab 799 € | Controller | ja | index | Service, Breadcrumb, FAQ | Paketdetail | fertig |
| `/pakete/business` | Business-Paket Webdesign | Business-Paket für kleine Unternehmen | Controller | ja | index | Service, Breadcrumb, FAQ | Paketdetail | fertig |
| `/pakete/wachstum` | Wachstum-Paket Webdesign | Wachstum-Paket für umfangreichere Websites und Relaunches | Controller | ja | index | Service, Breadcrumb, FAQ | Relaunch/Struktur | fertig |
| `/pakete/individuell` | Individuelles Webdesign-Projekt | Individuelles Webdesign-Projekt für Sonderfunktionen | Controller | ja | index | Service, Breadcrumb, FAQ | Sonderfunktionen | fertig |
| `/webdesign-berlin` | Hauptseite Webdesign Berlin aktualisiert | aktuelle View prüfen | Head-Fallback/Controller | ja | index | WebPage/Service wahrscheinlich | Webdesign Berlin | manuell prüfen |
| `/laufende-kosten-website` | Laufende Website-Kosten | Laufende Website-Kosten nach dem Launch | Head-Fallback | ja | index | manuell/Rich Results prüfen | Betriebskosten | fertig |
| `/zusatzleistungen-webdesign` | Zusatzleistungen Webdesign | Template prüfen | Head-Fallback | ja | index | FAQ/Breadcrumb laut Tests | Add-ons | fertig |
| `/website-wartung-berlin` | Website Wartung Berlin | Website-Wartung und Support in Berlin | Head-Fallback | ja | index | FAQ/Breadcrumb prüfen | Wartung | fertig |
| `/local-seo-berlin` | Local SEO Berlin | Local SEO Berlin für kleine Unternehmen | Head-Fallback | ja | index | Service/FAQ/Breadcrumb prüfen | Local SEO Berlin | fertig |
| `/website-relaunch-berlin` | Website Relaunch Berlin | Website Relaunch Berlin für moderne Unternehmenswebsites | Controller | ja | index | WebPage, Service, BreadcrumbList, FAQPage | Relaunch | fertig |
| `/website-audit` | Website-Audit | Datenobjekt | Controller | ja | index | WebPage/Service/Breadcrumb/FAQ | Audit | fertig |
| `/landingpage-erstellen-lassen` | Landingpage erstellen lassen | Datenobjekt | Controller | ja | index | WebPage/Service/Breadcrumb/FAQ | Landingpage | fertig |
| `/kontakt` | Kontakt aufnehmen | Website-Projekt anfragen | Kontakt-Controller | ja | index | ContactPage, BreadcrumbList, FAQPage | Kontakt/Anfrage | fertig, noindex für Thankyou prüfen |
| `/kontakt/thankyou` | Danke | Vielen Dank | n/a | nein | noindex,nofollow | keine öffentliche Index-Seite | Conversion | korrekt noindex laut Code |

Zusätzliche SEO-Befunde:

- `public/robots.txt` zeigt auf `https://www.komplettwebdesign.de/sitemap.xml`.
- Admin/Auth/API/Webhook/Test-Pfade werden per `robots` noindex/nofollow und robots.txt von öffentlichem Crawling getrennt.
- `helpers/seoPagePolicy.js` enthält neue indexierbare Routen inklusive Paketdetailseiten, Supportseiten, Branchen-Hub, priorisierten Branchen und geprüften Bezirken.
- Phase 15 meldet 118 Sitemap-Seiten, 130 interne Ziele, 0 H1-/Meta-/Canonical-Fehler, 0 JSON-LD-Fehler.
- Phase 16 meldet lokal 118 Sitemap-Seiten, 180 interne Ziele, 0 kritische Fehler.
- Live-Produktionsstand war laut Phase 16 noch nicht identisch: mehrere neue URLs live noch 404, alte Paket-URLs live noch 200. Nach Deployment erneut prüfen.

## 11. Navigation, Footer und interne Links

### 11.1 Neue Hauptnavigation

| Linktext | Ziel | Zweck | Status |
|---|---|---|---|
| Start | `/` | Hauptstart | aktiv |
| Webdesign Berlin | `/webdesign-berlin` | Hauptleistung | aktiv |
| Pakete & Preise | `/pakete` | Angebotsvergleich | aktiv |
| Leistungen | `/zusatzleistungen-webdesign` | Menü-Hub für Leistungen | aktiv |
| Website-Relaunch | `/website-relaunch-berlin` | Relaunch-Intent | aktiv |
| Local SEO Berlin | `/local-seo-berlin` | Local-SEO-Intent | aktiv |
| Landingpage erstellen lassen | `/landingpage-erstellen-lassen` | Landingpage-Angebot | aktiv |
| Website-Audit | `/website-audit` | Audit-Angebot | aktiv |
| Wartung & Support | `/website-wartung-berlin` | laufende Betreuung | aktiv |
| Zusatzleistungen | `/zusatzleistungen-webdesign` | Add-ons | aktiv |
| Laufende Kosten | `/laufende-kosten-website` | Kostenklarheit | aktiv |
| Referenzen | `/referenzen` | Trust | aktiv |
| Kontakt | `/kontakt` | Conversion | aktiv |

### 11.2 Footer-Struktur

| Spalte | Links | Zweck | Status |
|---|---|---|---|
| Angebot | Webdesign Berlin, Website erstellen lassen Berlin, Pakete & Preise, Relaunch, Landingpage, Audit | Hauptangebote bündeln | aktiv |
| Kosten & Betrieb | Webdesign Preise, laufende Kosten, Zusatzleistungen, Wartung | Kostenklarheit | aktiv |
| Sichtbarkeit & Tools | Local SEO, Website-Audit, Website-Tester, Branchen, Blog | SEO-/Tool-Funnel | aktiv |
| Kontakt & Vertrauen | Referenzen, Kontakt, Ablauf, Über mich, Ratgeber | Vertrauen/Conversion | aktiv |
| Rechtliches | Impressum, Datenschutz | Pflichtlinks | aktiv, juristisch prüfen |

### 11.3 Alte Links entfernt oder ersetzt

| alter Link | neuer Link | Quelle | Status |
|---|---|---|---|
| `/pakete/basis` | `/pakete/start` | Paketdaten/Routes/Sanitizer | Redirect aktiv |
| `/pakete/premium` | `/pakete/wachstum` | Paketdaten/Routes/Sanitizer | Redirect aktiv |
| `/pricing` | `/webdesign-berlin/kosten-preise-pakete` | Sanitizer | ersetzt |
| `/downloads/vorteile-professionelle-website.pdf` | `/webdesign-berlin/kosten-preise-pakete` | Sanitizer/Phase 15 | ersetzt |
| `/webdesign-cafe` | `/branchen/webdesign-cafe` | Static Routes/Sanitizer | Redirect aktiv |
| `/webdesign-blumenladen` | `/branchen/webdesign-blumenladen` | Static Routes/Sanitizer | Redirect aktiv |

Manuelle Linkprüfung: Header, Footer, mobile Navigation, Paketkarten, Kontakt-CTAs, Footer-Newsletter, Chat-Button, Website-Tester-CTAs, alte Paketlinks und Live-Sitemap nach Deployment prüfen.

## 12. Kontaktformular und Lead-Qualifizierung

### 12.1 Formularfelder

| Feld | neu/alt | Pflicht | Validierung | Tracking | PII-Risiko |
|---|---|---|---|---|---|
| Name | vorhanden, normalisiert | ja | 2 bis 120 Zeichen | nein als Wert | hoch, nur E-Mail/Admin |
| E-Mail | vorhanden | ja | E-Mail, max. 180 | nein als Wert | hoch, nicht tracken |
| Telefon | optional | nein | max. 80 | nein als Wert | hoch |
| Unternehmen | optional | nein | max. 160 | nein als Wert | mittel |
| bevorzugter Kontaktweg | neu/strukturiert | ja | erlaubte Werte | kategorial | niedrig |
| Projektart | neu | ja | erlaubte Werte | `project_type_selected` | niedrig |
| Paketinteresse | neu | ja | dynamische Paketwerte plus `unsure` | `package_interest_selected` | niedrig |
| Budgetrahmen | neu | ja | `799-1499`, `1500-2499`, `2500-4000`, `4000-plus`, `open` | `budget_range_selected` | niedrig |
| Zeitrahmen | neu | ja | erlaubte Werte | `timeline_selected` | niedrig |
| bestehende Website | neu | ja | erlaubte Werte | indirekt | niedrig |
| bestehende Website-URL | optional | nein | URL, max. 220 | nicht als Eventwert erlaubt | mittel |
| Seitenumfang | neu | ja | Onepager/1-3/4-7/8-12/12-plus/unsure | `page_scope_selected` | niedrig |
| Inhaltsstatus | neu | ja | erlaubte Werte | `content_status_selected` | niedrig |
| Zusatzfunktionen | neu | optional | erlaubte Liste | `optional_features_selected` | niedrig |
| Hosting/Wartung | neu | ja | erlaubte Werte | `hosting_maintenance_selected` | niedrig |
| Nachricht | optional | nein | max. 5.000 | nein | hoch |
| Datenschutz-Hinweis | vorhanden | ja | muss `yes` sein | nein | niedrig |
| Honeypot/Zeitprüfung | neu/erweitert | ja technisch | `contactWebsite` leer, `startedAt` >= 2,5s | nein | Bot-Schutz |
| reCAPTCHA | vorhanden/erweitert | ja | Token/Servercheck | nein | Bot-Schutz |

### 12.2 Paketoptionen

| alt | neu | technischer Wert | Status |
|---|---|---|---|
| Basis | Start | `start` | ersetzt |
| Business | Business | `business` | Preis/Umfang aktualisiert |
| Premium | Wachstum | `wachstum` | ersetzt |
| unsicher | Noch unsicher | `unsure` | aktiv |
| Sonderfunktion/individuell | Individuell | `individuell` | aktiv |

### 12.3 Lead-Qualifizierung

Die serverseitige Lead-Qualifizierung erzeugt interne Felder wie `likely_package`, `lead_category`, `lead_priority`, `estimated_fit`, `needs_followup` und `special_features_detected`. Diese Werte werden nach Codebefund in Admin-E-Mails genutzt und nicht als Analytics-Parameter weitergegeben.

Live zu prüfen:

- echte Testanfrage über `/kontakt`
- Quick-Form auf `/webdesign-berlin`
- reCAPTCHA-Token
- E-Mail an Betreiber
- Bestätigungsmail an Kunde
- Reply-To
- Datei-Upload-Grenzen
- Danke-Seite und noindex
- Session-Deduplizierung der Success-Events

## 13. Tracking, Consent und Datenschutz

### 13.1 Events

| Eventname | Auslöser | Parameter | PII-sicher | Consent nötig | Status |
|---|---|---|---|---|---|
| `hero_cta_click` | Hero-CTA | cta_id, location, target | ja | extern ja | vorbereitet |
| `header_cta_click` | Header-CTA | cta_id, link_url | ja | extern ja | vorbereitet |
| `footer_cta_click` | Footer-CTA | cta_id, link_url | ja | extern ja | vorbereitet |
| `package_card_click` | Paketkarte | package_id, cta | ja | extern ja | vorbereitet |
| `pricing_cta_click` | Preis-/Kostenseite | cta/location | ja | extern ja | vorbereitet |
| `contact_form_view` | Formular sichtbar | form_id/variant | ja | extern ja | vorbereitet |
| `contact_form_start` | erste Interaktion | form_id/variant | ja | extern ja | vorbereitet |
| `contact_form_step_view` | Wizard-Schritt | step_id | ja | extern ja | vorbereitet |
| `contact_form_step_complete` | Wizard weiter | step_id | ja | extern ja | vorbereitet |
| `project_type_selected` | Auswahl | erlaubter Wert | ja | extern ja | vorbereitet |
| `package_interest_selected` | Auswahl | start/business/wachstum/individuell/unsure | ja | extern ja | vorbereitet |
| `budget_range_selected` | Auswahl | Budgetklasse | ja | extern ja | vorbereitet |
| `optional_features_selected` | Auswahl | erlaubte Feature-IDs | ja | extern ja | vorbereitet |
| `contact_form_submit_attempt` | Absenden | form_id/variant | ja | extern ja | vorbereitet |
| `contact_form_submit_error` | Fehler | error_type | ja | extern ja | vorbereitet |
| `contact_form_submit_success` | Danke-Seite | form_id/variant | ja | extern ja | vorbereitet |
| `thank_you_view` | Danke-Seite | form_id/variant | ja | extern ja | vorbereitet |
| `lead_received` | serverseitig erfolgreich verarbeitete Anfrage | form_id/variant | ja | extern ja | vorbereitet |
| Tester-/SEO-/GEO-/Broken-Link-Events | Tool-Nutzung | tester, score_bucket, score_value etc. | ja laut Tracking-Plan | extern ja | vorbereitet |

Die Tracking-Schicht filtert Namen, E-Mail, Telefon, Firma, Nachricht, URL, Domain, Token und Passwortfelder über `DISALLOWED_PARAM_NAMES`. `safeLinkUrl` lässt nur sichere interne Pfade und wenige erlaubte Query-Parameter durch. Externe Weitergabe an `gtag`, `dataLayer`, `_paq` oder `plausible` erfolgt nur bei Analytics-Consent.

### 13.2 Entfernte Datenschutzrisiken

| Risiko | Datei | Änderung | Status |
|---|---|---|---|
| Newsletter-Logging der E-Mail-Adresse | `controllers/newsletterController.js` | laut Phase 15 entfernt | erledigt, live prüfen |
| PII in Tracking | `public/js/tracking.js`, `docs/tracking-plan.md` | PII-Parameter verboten/gefiltert | vorbereitet |
| Success-Doppelerfassung | `views/kontakt/thankyou.ejs` | SessionStorage-Deduplizierung | vorbereitet |
| externe Analytics ohne Consent | `views/partials/head.ejs`, `public/js/cookie-consent.js`, `public/js/tracking.js` | Consent default denied, Laden nach Zustimmung | vorbereitet |

Auf Basis der lokalen Reports wurden **keine personenbezogenen Daten im Tracking-Crawl gefunden**. Nicht erneut getestet. Live-Browserprüfung mit Consent ablehnen/akzeptieren/Einstellungen bleibt erforderlich.

## 14. Strukturierte Daten

| Bereich | Schema-Typen | Befund | Risiko |
|---|---|---|---|
| Startseite | Organization, Person, WebSite, Service, WebPage, Breadcrumb | in `views/index.ejs` aufgebaut | echte Bewertungen nicht als Review-Sterne ausgeben |
| Paketübersicht | WebPage, BreadcrumbList, ItemList, FAQPage | in `views/packages_list.ejs` | FAQ muss sichtbaren Inhalt abbilden |
| Paketdetails | Service, BreadcrumbList, FAQPage | `util/seoSchemas.js` | Preise nicht als falsches Product/Offer überdehnen |
| SEO-Landingpages | WebPage, Service, BreadcrumbList, FAQPage | `seoLandingController` | Service nur, wenn Daten vorhanden |
| Branchen | Organization, WebSite, WebPage, Service, BreadcrumbList, FAQPage | `helpers/industrySchema.js` | keine erfundenen Bewertungen/Öffnungszeiten |
| Kontakt | ContactPage, BreadcrumbList, FAQPage | `contactController` | Danke-Seite noindex |
| Tools | WebSite/WebPage/Application/Breadcrumb/FAQ/Organization laut Helper | `helpers/testerSeoExtra.js` | Tooldaten live validieren |

Phase 15 und 16 melden lokal 0 JSON-LD-Parsefehler und keine falschen AggregateRating-/Review-Fundstellen. Trotzdem sollten Hauptseiten nach Deployment im Google Rich Results Test geprüft werden.

## 15. Sitemap, robots.txt, Canonicals und Redirects

| Thema | Befund | manuelle Prüfung |
|---|---|---|
| Canonical-Basis | `index.js` nutzt `CANONICAL_BASE_URL` oder in Produktion `https://www.komplettwebdesign.de` | Produktions-Env prüfen |
| Head-Fallback | `views/partials/head.ejs` gibt Canonical nur aus, wenn `seoExtra` keinen Canonical enthält | doppelte Canonicals stichprobenartig prüfen |
| Sitemap | dynamisch aus statischen Routen, Paketen, Bezirken, Branchen, Blog, Ratgeber | live `/sitemap.xml` öffnen |
| robots.txt | erlaubt öffentliche Seiten, blockt Admin/Auth/API/Webhook/Test und referenziert www-Sitemap | live `/robots.txt` öffnen |
| alte Paket-URLs | 301 lokal zu neuen Paketen | live nach Deployment prüfen |
| alte Kosten-URLs | 301 zu `/webdesign-berlin/kosten-preise-pakete` | live prüfen |
| noindex | Admin/Auth/API/Webhook/Test und Danke-Seite noindex/nofollow | HTML-Quelle prüfen |
| Sitemap-URLs lokal | Phase 16: 118 Sitemap-Seiten | Search Console einreichen |

## 16. Performance, Mobile UX und Technik

| Thema | Befund | Risiko | Empfehlung |
|---|---|---|---|
| Build | laut Phase 16 bestanden | nicht erneut ausgeführt | bei Release erneut `npm run build` |
| Tests | laut Phase 16 264/264 bestanden | nicht erneut ausgeführt | bei Release erneut `npm test` |
| CSS | viele CSS-/min.css-Dateien geändert, Asset-Manifest aktualisiert | Minified/Source-Konsistenz | Build prüfen |
| Mobile Overflow | laut Phase 15 auf Café/Blumenladen/Zusatzleistungen behoben | neue/andere Seiten nicht vollständig geprüft | echtes Smartphone prüfen |
| FAQ-Akkordeons | global vereinheitlicht laut Phase 15 | JS/Details-Verhalten | Stichprobe |
| Bilder | neue WebP-Bilder für Pakete, Kontakt, Webdesign Berlin, Ablauf | Ladezeit/Alttexte prüfen | PageSpeed/visuell prüfen |
| Cloudinary | weiterhin im Stack, Bildoptimierung erwähnt | konkrete Bildausgabe prüfen | visuelle Prüfung |
| SSR | Node/EJS serverseitig gerendert | DB-Fehler könnten Rendering beeinflussen | Logs nach Deployment prüfen |
| Security Headers | `index.js` setzt CSP frame-ancestors, X-Frame-Options, nosniff, Referrer-Policy, HSTS bei HTTPS | CSP nur minimal | Security-Header live prüfen |
| 404/500 | neue `views/error.ejs`, `views/404.ejs` geändert | Fehlerseiten live prüfen | gezielte 404-Stichprobe |

### Tests und bekannte Ergebnisse

| Test/Kommando | Ergebnis | Quelle | erneut ausgeführt? |
|---|---|---|---|
| `npm test` | 264/264 bestanden | Phase 15/16 | nein |
| `npm run build` | bestanden | Phase 16 | nein |
| finaler lokaler Crawl | 118 Sitemap-Seiten, 180 interne Ziele, 0 kritische Fehler | Phase 16 | nein |
| JSON-LD-Prüfung | 0 Parsefehler | Phase 15/16 | nein |
| interne Linkprüfung | 0 kaputte interne Links, 0 interne Redirectlinks | Phase 16 | nein |
| Browser-Spotcheck | Café, Blumenladen, Zusatzleistungen ohne mobilen Overflow | Phase 15 | nein |
| Kontakt Quick-Form leerer POST | vorher 500, jetzt 422 | Phase 16 | nein |
| Browserslist/caniuse-lite | Warnung laut Phase 16 behoben | Phase 16 | nein |

## 17. Dünne Seiten und Content-Risiken

| URL | aktueller Status | Wortanzahl laut Report | Suchintention | Problem | SEO-Risiko | Conversion-Risiko | Empfehlung | Priorität |
|---|---|---:|---|---|---|---|---|---|
| `/branchen` | verbessert | 402 | Branchen-Hub | noch relativ kurz | mittel | Nutzer finden ggf. nicht schnell passende Branche | weiter ausbauen | mittel |
| `/referenzen` | verbessert | 410 | Trust/Referenzen | wenige echte Projektdetails | mittel | Vertrauen begrenzt | echte Referenzen ergänzen | mittel |
| `/referenzen/zur-alten-backstube` | verbessert | 511 | Projektbeispiel | echte Details nur begrenzt | mittel | Wirkung bleibt vorsichtig | nur belegte Details ergänzen | mittel |
| `/webdesign-blumenladen/kosten` | verbessert | 497 | Kosten für Blumenladen-Website | Überschneidung mit Branchen-/Paketlogik | mittel | Nutzer könnten Seiten verwechseln | ausbauen oder zusammenführen/noindex prüfen | mittel |
| `/webdesign-cafe/kosten` | verbessert | 488 | Kosten für Café-Website | Überschneidung mit Branchen-/Paketlogik | mittel | Nutzer könnten Seiten verwechseln | ausbauen oder zusammenführen/noindex prüfen | mittel |

Keine erfundenen Referenzen, Bewertungen oder Projektergebnisse behaupten. Bei Kosten-Spezialseiten ist die spätere Entscheidung wichtig: behalten und stärker differenzieren, mit Branchen-Seite zusammenführen oder noindex/canonical strategisch prüfen.

## 18. DB-/CMS-Altinhalte und Runtime-Sanitizer

`util/legacyPublicCopy.js` ist ein Runtime-Sicherheitsnetz. Es normalisiert öffentliche Ausgaben, bevor alte oder riskante Inhalte aus Blog, Ratgeber, FAQ, Chat, Branchen- oder Leistungsdaten sichtbar werden.

| Frage | Antwort |
|---|---|
| Warum eingeführt/erweitert? | Weil DB-/CMS-/Platzhalterinhalte noch alte Preise, Paketnamen, Rechts-/Rankingversprechen oder alte Links enthalten können. |
| Welche Altinhalte fängt er ab? | 499/899/1.499-Altpreise, Basis/Premium, alte Paketlinks, Wartung ab 5 €, rechtssicher/rechtskonform/DSGVO-konform, Top-Ranking/Platz 1, keine versteckten Kosten, alles inklusive, 24/7-Buchungsversprechen. |
| Welche Controller nutzen ihn? | Blog, Ratgeber, FAQ, Chat; laut Reports auch Branchen-/Leistungsinhalte über zentrale Bereinigung. |
| Welche Risiken reduziert er? | Öffentlich sichtbare Altpreise, falsche Paketlogik, rechtliche Versprechen, Ranking-/Conversion-Versprechen, kaputte alte Links. |
| Langfristiger Nachteil | Er kaschiert Datenaltlasten und kann Kontext unpräzise machen, wenn Quellinhalte nicht bereinigt werden. |
| Was redaktionell bereinigen? | `industries`, `leistungen_pages`, `posts`, `ratgeber`, alte Platzhalterdaten und interne Kontextdateien. |
| Alte Begriffe suchen | 499, 899, Basis, Premium, Wartung ab 5, rechtssicher, DSGVO-konform, Ranking garantiert, keine versteckten Kosten, alles inklusive, 24/7. |
| Sollte er bleiben? | Ja, bis die Quellinhalte dauerhaft bereinigt sind. Danach kann er reduziert werden. |

Laut Phase 16 ergab ein Read-only-Dry-Run DB-/CMS-Altinhalte: `industries` 16 Treffer, `leistungen_pages` 2 Treffer, `posts` 14 Treffer, `ratgeber` 3 Treffer sowie mehrere Platzhaltertreffer. Keine DB-Schreibzugriffe wurden durchgeführt.

## 19. Tests und Verifikation

| Prüfung | Ergebnis | wann/Quelle | Umgebung | Einschränkung | Launch-Relevanz |
|---|---|---|---|---|---|
| `npm test` | 264/264 bestanden | Phase 15/16, 02.06.2026 | lokal | nicht erneut ausgeführt | hoch |
| `npm run build` | bestanden | Phase 16 | lokal | nicht erneut ausgeführt | hoch |
| Sitemap-Crawl | 118 Sitemap-Seiten | Phase 15/16 | lokal | Live-Sitemap abweichend vor Deployment | hoch |
| interne Linkprüfung | 180 interne Ziele, 0 kaputte Links | Phase 16 | lokal | externe Links separat | hoch |
| JSON-LD | 0 Fehler | Phase 15/16 | lokal | Rich Results live offen | hoch |
| Browser-Spotcheck | keine mobilen Overflows auf geprüften Seiten | Phase 15 | lokal | kein vollständiger Gerätepark | mittel |
| Kontaktformular | Quick-Form-Fix, Validierung, Spam-Schutz, Paketwerte getestet | Phase 15/16 | lokal | echte E-Mail/Captcha live offen | kritisch |
| Auto-Slots | Tests bestanden, Admin live offen | Phase 15/16 | lokal | Admin nach Deployment prüfen | hoch |
| Tracking/PII | 0 PII-Treffer im lokalen Crawl, non-PII-Events getestet | Phase 16 | lokal | Consent live offen | hoch |
| Production Smoke | Live-Seite noch nicht auf lokalem Stand | Phase 16 | Produktion read-only | nach Deployment wiederholen | kritisch |

Nicht erneut ausgeführt. Vor Release sollten `npm test`, `npm run build` und ein kurzer lokaler Smoke-Test erneut laufen.

## 20. Offene Folgeaufgaben

| Aufgabe | Kategorie | Grund | betroffene Seiten/Dateien | Risiko | empfohlene Aktion | Priorität | vor Launch nötig |
|---|---|---|---|---|---|---|---|
| Produktions-Smoke-Test nach Deployment | kritisch/hoch | Live-Stand war laut Phase 16 noch alt | alle neuen URLs, alte Paket-URLs | 404/200 statt Redirect | nach Deployment crawlen | kritisch | ja |
| Kontaktformular echte Anfrage | hoch | E-Mail-Zustellung nicht live geprüft | `/kontakt`, `/webdesign-berlin` | Leads gehen verloren | Testanfrage senden | kritisch | ja |
| Captcha live prüfen | hoch | Token/Keys produktionsabhängig | Kontakt/Paketkontakt | Formular blockiert oder Spam möglich | Browser-Test | hoch | ja |
| Consent/Tracking live prüfen | hoch | Consent-Zustand produktionsabhängig | Head, Cookie, Tracking | Datenschutz-/Datenqualitätsrisiko | ablehnen/akzeptieren testen | hoch | ja |
| Rechtstexte prüfen | hoch | nicht juristisch geprüft | `/impressum`, `/datenschutz`, Cookie | rechtliches Risiko | externe/manuelle Prüfung | hoch | ja |
| alte Paket-Redirects live prüfen | hoch | Phase 16: live vorher noch 200 | `/pakete/basis`, `/pakete/premium` | SEO/UX | 301 prüfen | hoch | ja |
| Sitemap/Search Console | mittel | neue URLs müssen eingereicht werden | `/sitemap.xml` | Indexierung verzögert | einreichen/beobachten | mittel | nach Launch |
| Rich Results testen | mittel | JSON-LD lokal ok, live offen | Hauptseiten | Rich-Result-Fehler | Google Test | mittel | nach Launch |
| DB-/CMS-Altinhalte bereinigen | mittel | Sanitizer bleibt nur Sicherheitsnetz | DB-Tabellen, Platzhalter | Altlogik kann zurückkommen | redaktionelle Migration | mittel | nein |
| dünne Seiten ausbauen | mittel | Content-Qualität | Branchen/Referenzen/Kostenseiten | SEO/Conversion | priorisiert ausbauen | mittel | nein |
| interne `.agents/product-marketing-context.md` aktualisieren | mittel/hoch intern | enthält alte Preislogik | Kontextdatei | künftige Prompt-Fehler | aktualisieren | hoch intern | vor weiterer KI-Arbeit |
| weitere Branchen/Bezirke priorisieren | mittel | Duplicate-/Thin-Risiko | Branchen/Bezirke | SEO-Qualität | Einzeloptimierungen | mittel | nein |
| Performance-Feinschliff | niedrig | nach Launch messbar | CSS/JS/Bilder | CWV | PageSpeed/WebPageTest | niedrig | nein |

## 21. Manuelle Prüfliste für den Betreiber

| Nr. | URL/Bereich | was prüfen? | bestanden | Notizen |
|---:|---|---|---|---|
| 1 | `/` | Startseite visuell, H1, neue Preise, CTAs, mobile Ansicht |  |  |
| 2 | `/pakete` | alle vier Pakete, Vergleich, FAQ, Preise, § 19-UStG-Hinweis |  |  |
| 3 | `/pakete/start` | Preis 799 €, Umfang 1 bis 3 Seiten, Ausschlüsse |  |  |
| 4 | `/pakete/business` | Preis 1.499 €, Umfang ca. 4 bis 7 Seiten |  |  |
| 5 | `/pakete/wachstum` | Preis 2.499 €, Relaunch/SEO-Struktur, keine 20/25-Seiten-Falschlogik |  |  |
| 6 | `/pakete/individuell` | Preis 3.500 € oder nach Aufwand, Sonderfunktionen |  |  |
| 7 | `/kontakt` | Formular vollständig ausfüllen, Datenschutz, Captcha, Danke-Seite |  |  |
| 8 | E-Mail | Betreiber- und Kundenmail angekommen, Reply-To korrekt |  |  |
| 9 | `/kontakt/thankyou` | noindex, Success-Events, kein erneutes Event bei Reload |  |  |
| 10 | Cookie-Banner | Ablehnen, Akzeptieren, Einstellungen, GA/Clarity-Laden prüfen |  |  |
| 11 | Tracking | Events ohne PII, externe Analytics nur nach Consent |  |  |
| 12 | `/pakete/basis` | 301 zu `/pakete/start` |  |  |
| 13 | `/pakete/premium` | 301 zu `/pakete/wachstum` |  |  |
| 14 | `/sitemap.xml` | erreichbar, www-Basis, neue URLs enthalten, alte Paket-URLs nicht enthalten |  |  |
| 15 | `/robots.txt` | erreichbar, Sitemap-Hinweis korrekt |  |  |
| 16 | `/impressum` | inhaltlich/rechtlich prüfen |  |  |
| 17 | `/datenschutz` | inhaltlich/rechtlich inkl. Tracking/Consent prüfen |  |  |
| 18 | `/laufende-kosten-website` | laufende Kosten verständlich und vollständig |  |  |
| 19 | `/zusatzleistungen-webdesign` | Add-ons, Drittanbieter, Grenzen |  |  |
| 20 | `/website-wartung-berlin` | Wartungsumfang, keine 24/7-/Sofortgarantie |  |  |
| 21 | `/local-seo-berlin` | keine Ranking-/Maps-Garantie |  |  |
| 22 | `/website-relaunch-berlin` | keine Ranking-Erhalt-Garantie, Redirect-/Migrationstexte |  |  |
| 23 | `/website-audit` | Audit-Abgrenzung, keine Vollgarantie |  |  |
| 24 | `/branchen` | Hub ausreichend, wichtige Branchen erreichbar |  |  |
| 25 | `/referenzen` | keine erfundenen Zahlen/Ergebnisse, echte Referenzen ergänzen |  |  |
| 26 | Mobile | echtes Smartphone: Header, Footer, Formular, Paketkarten, FAQ, Tabellen |  |  |
| 27 | Search Console | Sitemap einreichen, Coverage beobachten |  |  |
| 28 | Rich Results | Start, Pakete, Kontakt, Local SEO, Relaunch testen |  |  |
| 29 | DB/CMS | Altpreise und alte Paketbegriffe redaktionell bereinigen |  |  |
| 30 | Live-Logs | 404, Redirects, Formularfehler, Captcha, E-Mail beobachten |  |  |

## 22. Go-/No-Go-Einschätzung

**Bedingtes Go.**

Auf Basis der vorliegenden QA-Ergebnisse: bedingtes Go. Technisch keine kritischen öffentlichen Blocker im lokalen Code-Stand, aber Produktions-Smoke-Test, Rechtstexte, Consent/Tracking, E-Mail-Zustellung und einzelne dünne Seiten bleiben manuell zu prüfen.

Begründung:

- Lokal laut Phase 16: Tests bestanden, Build bestanden, Crawl ohne kritische Fehler.
- Paket-, Preis-, Redirect-, Canonical-, Sitemap-, Tracking- und Sanitizer-Logik sind im Code nachvollziehbar.
- Rechtliche Kommunikation wurde vorsichtiger formuliert, aber nicht juristisch geprüft.
- Die Live-Seite war laut Phase 16 noch nicht auf lokalem Stand. Deshalb ist ein erneuter Production-Smoke-Test nach Deployment zwingend.

No-Go wäre erst gegeben, wenn nach Deployment neue URLs weiter 404 liefern, alte Paket-URLs nicht 301 weiterleiten, Kontakt/E-Mail/Captcha nicht funktionieren oder Consent/Tracking personenbezogene Daten ohne gültige Grundlage überträgt.

## 23. Anhang: Suchbegriffe und Fundstellen

### 23.1 Preise und alte Paketlogik

Suchmuster: `499`, `899`, `Business 899`, `Premium 1.499`, `Wartung ab 5`, `Basis-Paket`, `Premium-Paket`, `/pakete/basis`, `/pakete/premium`.

Relevante Fundstellen:

| Datei/Gruppe | Kontext | öffentlich sichtbar? | kritisch? | Status |
|---|---|---|---|---|
| `.agents/product-marketing-context.md` | alte Preis-/Paketlogik | intern | hoch intern | aktualisieren empfohlen |
| `docs/superpowers/plans/2026-05-07-seo-site-improvements.md` | alter Planungsstand | Dokumentation | niedrig bis mittel | historisch |
| `docs/marketing/website-optimization-roadmap.md` | alte Marketingplanung | Dokumentation | mittel intern | prüfen/aktualisieren |
| `platzhalter/*` | alte Platzhalterpreise und Rechtsformulierungen | vermutlich nicht aktiv geroutet | mittel | optional bereinigen |
| `util/legacyPublicCopy.js` | Ersetzungsmuster | nein, Code | nicht kritisch | beabsichtigt |
| Tests | Negativtests und Warnungen | nein | nicht kritisch | beabsichtigt |
| `routes/packages.js` / `pricingRepositoryService.test.js` | Redirects für alte Paket-URLs | ja als Redirect | positiv | beabsichtigt |
| `data/packages.js`, `data/seoMeta.js`, `data/addOns.js` | neue Preise enthalten `1.499`, `2.499`, Add-on-Preise | ja | nicht kritisch | aktuelle Logik |

### 23.2 Rechtlich riskante Aussagen

Suchmuster: `rechtssicher`, `rechtskonform`, `rechtlich abgesichert`, `DSGVO-konform`, `Ranking garantiert`, `Platz 1`, `Top-Ranking`, `alles inklusive`, `keine versteckten Kosten`, `24/7`, `100 % sicher`.

Relevante Fundstellen:

| Datei/Gruppe | Kontext | öffentlich sichtbar? | kritisch? | Status |
|---|---|---|---|---|
| `util/legacyPublicCopy.js` | Ersetzung riskanter Begriffe | nein | positiv | beabsichtigt |
| `data/addOnsPage.js` | „kein 24/7-Notfallbetrieb“ und Grenzen | ja | nein | sichere Negativformulierung |
| `controllers/adminPricingController.js` | Warnbegriffe für Admin-Eingaben | nein/indirekt | positiv | beabsichtigt |
| Tests | `assert.doesNotMatch` und Warnfall-Tests | nein | positiv | beabsichtigt |
| `platzhalter/rechtliches.*`, `platzhalter/preise.json`, `platzhalter/seo.json` | alte riskante Inhalte | vermutlich nicht aktiv | mittel | bereinigen/archivieren |
| `docs/blog/*` | ältere Blog-/Dokumentationsinhalte mit Datenschutz-/Rechtsbegriffen | Dokumentation/ggf. nicht öffentlich | unklar | manuelle Prüfung empfohlen |
| `docs/phase15-final-master-qa.md` | Safe-Hit „kein 24/7-Notfallbetrieb“ | Dokumentation | nein | belegt |

### 23.3 Tracking/PII

Suchmuster: `data-email`, `data-phone`, `data-name`, `data-message`, `localStorage`, `sessionStorage`, `console.log(req.body)`, `gtag`, `dataLayer`, `_paq`, `plausible`, `fbq`, `lintrk`.

Relevante Fundstellen:

| Datei | Kontext | öffentlich sichtbar? | kritisch? | Status |
|---|---|---|---|---|
| `public/js/tracking.js` | Event-Schicht, PII-Filter, GA/dataLayer/_paq/Plausible-Weitergabe nach Consent | ja | niedrig, wenn Consent korrekt | live prüfen |
| `views/partials/head.ejs` | Consent Mode default denied, GA/Clarity Loader | ja | mittel | live prüfen |
| `public/js/cookie-consent.js` | Consent-Update und Pageview | ja | mittel | live prüfen |
| `views/kontakt/thankyou.ejs` | `sessionStorage` zur Event-Deduplizierung | ja | niedrig | beabsichtigt |
| `views/admin/logs.ejs` | `localStorage` für Admin-UI-Filter | admin | niedrig | nicht öffentlich |
| `public/js/chat.js` | `sessionStorage` für Chat-Begrüßung | ja | niedrig | keine PII laut Fund |
| Tests | stellen sicher, dass kein direktes `gtag('event')` in Formularscripts genutzt wird | nein | positiv | beabsichtigt |

Kein Treffer für `console.log(req.body)` im geprüften Suchlauf.

### 23.4 Technisches SEO

Suchmuster: `noindex`, `canonical`, `sitemap`, `robots`, `json-ld`, `FAQPage`, `BreadcrumbList`, `AggregateRating`, `Review`, `Offer`, `Product`.

Relevante Fundstellen:

| Datei/Gruppe | Kontext | Status |
|---|---|---|
| `views/partials/head.ejs` | Canonical, robots, OG/Twitter, JSON-LD, Consent | zentrale SEO-Grundlage |
| `controllers/sitemapController.js` | dynamische Sitemap | aktiv |
| `helpers/seoPagePolicy.js` | Sitemap- und Indexierungs-Policy | aktiv |
| `public/robots.txt` | Crawl-Regeln und Sitemap | aktiv |
| `util/seoSchemas.js` | Paket-Detailschema | aktiv |
| `helpers/industrySchema.js`, `helpers/pageSchema.js`, `helpers/testerSeoExtra.js` | Branchen-/Seiten-/Toolschema | aktiv |
| `views/packages_list.ejs`, `views/package_detail.ejs`, `views/index.ejs` | strukturierte Daten in Views | aktiv |
| Phase-Reports | 0 JSON-LD-Fehler, keine falschen Ratings | übernommen |

## Schlussnotiz

Dieser Bericht unterscheidet zwischen tatsächlich im Code gefundenen Änderungen, in vorhandenen Reports dokumentierten Ergebnissen, aktuellen Suchläufen und offenen Empfehlungen. Nicht sicher ableitbare Punkte sind als manuelle Prüfung markiert. Es wurden keine Produktionsdaten, keine Deployments und keine zusätzlichen Projektdateien verändert.
