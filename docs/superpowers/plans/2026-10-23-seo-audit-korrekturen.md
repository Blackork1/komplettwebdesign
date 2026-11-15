# SEO-Audit: Prüfung und Korrekturen

> **For agentic workers:** Umsetzung mit superpowers:executing-plans, schrittweise anhand des vom Nutzer beauftragten Maßnahmenplans.

**Goal:** Bestätigte Fehler aus Maßnahmenplan und FULL-AUDIT-REPORT.md beheben und offene externe oder redaktionelle Entscheidungen nachvollziehbar ausweisen.

**Architecture:** Vorhandene Express-/EJS-Struktur, Preiskatalog und SITE_FACTS weiterverwenden. Keine ungeprüften Inhaltszusammenführungen, neuen Kundenreferenzen oder erfundenen Geschäftsdaten.

**Tech Stack:** Node.js, Express, EJS, PostgreSQL, node:test, bestehender CSS-Build.

**Spec:** Nutzerauftrag vom 23.10.2026, ergänzender FULL-AUDIT-REPORT.md und komplettwebdesign.de-audit/findings/.

## Global Constraints

- Deutsche Texte mit richtigen Umlauten und deutscher Grammatik.
- Vorhandene fremde Änderungen insbesondere zu Cookavoli und Swipe-and-Cook erhalten.
- Keine Secrets in Diagnoseausgaben; Datenbankzugriffe zunächst nur lesend.
- Telefonnummer und Stripe-Modus nicht erraten; Rückfragen sind gestellt.
- Kein Deployment und keine externen Profiländerungen ohne vorliegende Zugänge.

## Review Focus

- Preisersetzungen dürfen allgemeine Marktpreise oder bereits aktuelle Business-Preise nicht verändern.
- URL-Normalisierung darf Blog-Slugs, Assets, API-/Admin-Routen und POST-Anfragen nicht beschädigen.
- Fehlende Änderungsdaten dürfen keine künstliche Aktualität erzeugen.
- Consent-Ablehnung muss auf Mobilgeräten erreichbar bleiben; optionale Dienste bleiben gesperrt.
- Schema und sichtbare Inhalte müssen dieselben Preise und Geschäftsdaten verwenden.

## Arbeitspakete

### 1. Preise und öffentliche Inhalte

**Files:** util/legacyPublicCopy.js, controllers/districtController.js, services/blogPostPresentationService.js, betroffene Controller, Handwerker-Template, tests/seoAuditCorrections.test.js.
**Interfaces:** normalizeLegacyPublicCopy(value, pricing); bestehendes Pricing-Viewmodel als Preisquelle.

- [x] Regression für alte Preise, Platzhalter, aktuelle Preise und Bezirks-FAQ schreiben und rot ausführen.
- [x] Preisersetzungen auf dynamische Preistokens umstellen; deutsche Bezirks-FAQ und Ratgeber-Teaser auflösen.
- [x] Handwerker aus veralteten CMS-Komponenten lösen und vorhandene Paketkomponente mit aktuellen Katalogdaten verwenden.
- [x] Öffentliche Blogausgabe korrigieren, eingebettetes altes JSON-LD entfernen; persistente DB-Korrekturen gesondert nachvollziehbar machen.
- [x] Betroffene Tests ausführen.

### 2. URLs, Indexierung und Aktualität

**Files:** middleware/publicSeo.js, index.js, helpers/seoPagePolicy.js, controllers/sitemapController.js, controllers/faqController.js, views/partials/header.ejs, tests/publicSeo.test.js.
**Interfaces:** canonicalPublicPath(path), publicSeoMiddleware(req,res,next); Sitemap ohne lastmod bei unbekanntem Datum.

- [x] Verhalten für Slash, Doppelslash, Großschreibung, Blog-Ausnahme, Query-Erhalt und POST testen.
- [x] 301 und noindex für belegte Hilfsseiten einbauen; /de umleiten; Navigation bereinigen.
- [x] Ungültige FAQ-Kategorien mit 404 behandeln.
- [x] Echte Sitemap-Daten und feste inhaltliche Datumsangaben ausgeben.
- [x] Tests ausführen.

### 3. Geschäftsdaten und strukturierte Daten

**Files:** helpers/siteFacts.js, helpers/entitySchema.js, betroffene Schema-Erzeuger, Footer, Kontakt, About, Blog und Ratgeber.
**Interfaces:** buildOrganizationSchema(baseUrl), buildPersonSchema(baseUrl); globale EJS-Locals aus denselben Quellen.

- [x] Entity-Verknüpfungen und Autorenverweise anhand gerenderter Daten testen.
- [x] Organization/ProfessionalService, Person und AboutPage vereinheitlichen; Bezirk als Service mit provider ausgeben.
- [x] Sichtbare NAP-Angaben und Autoren ergänzen; Bewertungszahl aus SITE_FACTS verwenden.
- [x] llms.txt aktualisieren.
- [x] Tests ausführen.

### 4. Bilder, Consent und Darstellung

**Files:** public/images/, data/seoGuideCluster.js, views/ratgeber/, views/partials/cookie-banner.ejs, public/js/cookie-consent.js, public/css/main.css, public/chat.css, public/kontakt.css.

- [x] Bestehende Consent-Tests und Asset-Abmessungen prüfen.
- [x] Hero, Avatar und Ratgeberbilder optimieren; Dimensionen und passende responsive Varianten ergänzen.
- [x] Banner initial serverseitig anzeigen, Text kürzen, gleichwertige Buttons nebeneinander; Chat während Banneranzeige ausblenden.
- [x] Absatzgewicht, Kontrast und Kontakt-Höhe korrigieren.
- [x] CSS bauen und Mobilansicht prüfen.

### 5. Verbleibende Maßnahmen und Abschluss

**Files:** data/contentAgentLinks.js, Content-Agent-Textkürzung, docs/seo/2026-10-23-massnahmenpruefung.md.

- [x] Sichere weitere Korrekturen aus Medium/Low umsetzen; alle übrigen Punkte mit Begründung und nächstem Schritt bewerten.
- [x] Gesamte Testsuite, CSS-Build und Diff-Prüfung ausführen; vorhandene Testfehler transparent nennen.
- [x] Ergebnis ohne Behauptung eines nicht erfolgten Deployments dokumentieren.

## Abschlussprotokoll

- Baseline: 2.249 bestanden, 19 übersprungen, 0 Fehler. Abschließend 2.275 bestanden, 19 übersprungen, 0 Fehler.
- 145 bestehende öffentliche Pfade geprüft; 137 × 200, 8 × 301, keine Platzhalter/Altnummern/ungültigen JSON-LD-Blöcke.
- 24 Browserprüfungen bei 320, 390 und 1.440 Pixeln ohne Überlauf oder Laufzeitfehler; Consent-Ablehnung separat geprüft.
- Elf explizite Blogdatensätze nach Sicherung korrigiert; erneuter Dry-Run ohne Änderungen.
- Unabhängige Codeprüfung durchgeführt. Gefundene FAQ-/Schema-Abweichung und fehlendes EN-Booking-noindex korrigiert und getestet.
- Entscheidung: Im bereitgestellten Arbeitsverzeichnis gearbeitet und vorhandene Änderungen erhalten; kein automatischer Wechsel des bestehenden Arbeitsstands, kein Commit und kein Deployment.
- Externe Zugänge, Inhaltszusammenführungen und übriger Backlog bleiben gemäß `docs/seo/2026-10-23-massnahmenpruefung.md` offen. Die abgeschlossenen Prüfschritte bedeuten keine Veröffentlichung und keine vollständige Umsetzung aller externen bzw. redaktionellen Empfehlungen.
