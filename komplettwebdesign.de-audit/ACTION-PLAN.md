# Maßnahmenplan komplettwebdesign.de

Sortiert nach Priorität. Aufwand grob geschätzt. Datei- und Zeilenangaben beziehen sich auf das Repo.

## Critical: sofort (Woche 1)

- [ ] **Platzhaltertexte entfernen.** In `util/legacyPublicCopy.js` (Zeilen 33–44 und die Basis/Business/Premium-Regeln) echte Preise als Ersetzungsziel einsetzen. Einen Test ergänzen, der bei „nach aktueller Paketlogik“, „aktueller Paketpreis“, „aktueller Business-Paketrahmen“ und „nach aktuellem Paketumfang“ fehlschlägt. Danach Café und Blumenladen in der Search Console neu einreichen. *~1 h*
- [ ] **Bezirksseiten-Platzhalter beheben.** `data/seoGuideCluster.js:19` über `interpolatePricingTokens` laufen lassen. In `controllers/districtController.js` (`buildGermanDistrictFaq`) die deutschen statt der `.en`-Tokens nutzen. *~30 Min*
- [ ] **`/handwerker` reparieren.** Die Paket-Komponente von `/pakete` einbinden. Alte Preise, „Standart“, sichtbare `<!-- Preis -->`-Kommentare und unbelegte Prozentzahlen entfernen. Widerspruch „30 Tage“ vs. „zwei Wochen“ auflösen. *~1 h*
- [ ] **Blogartikel korrigieren.** In `full-service-webdesign-in-berlin` und `local-seo-berlin-fuer-freelancer` (Datenbank) die Nummer +49 1525 4350378 und die Preise 499/899/1.499 € korrigieren und den eingebetteten Schema-Block löschen. *~15 Min*
- [ ] **Telefonnummer klären.** Website +49 1551 245048 vs. Verzeichnisse 0155 11 24 50 48. Die richtige Nummer zentral in `helpers/siteFacts.js` pflegen und überall importieren. Danach ProvenExpert, Gelbe Seiten und agenturen.app angleichen. *~1 h*
- [ ] **Google-Unternehmensprofil prüfen.** Adresse, Pin (aktuell ca. 32 km entfernt, Raum Potsdam) und Servicegebiet. *~15 Min*
- [ ] **Stripe prüfen.** Die Live-Seite nutzt einen `pk_test_`-Schlüssel. Ist das gewollt? *~5 Min*

## High: innerhalb von 1–2 Wochen

- [ ] **URL-Varianten per 301 bündeln.** In `data/siteNavigation.js` `/leistungen/` durch `/leistungen` ersetzen. Eine Middleware für Slash, Doppelslash und Kleinschreibung (außer `/blog/`) bauen. *~1 h*
- [ ] **Indexierung von Nebenseiten entscheiden.** `/demo/cq-compare/` und `/booking` auf noindex, `/de` per 301 auf `/`, Branchenseiten in die Sitemap oder noindex. *~1 h*
- [ ] **Bilder verkleinern.** `heroBg.webp` unter 100 KB bringen, die 4 Ratgeber-PNGs nach WebP (60–150 KB) mit `width`/`height`, `meinAvatar.webp` unter 40 KB. `convert-to-webp.sh` liegt im Repo. *~1 h*
- [ ] **Cookie-Banner und Chat-Button.** Den Banner auf einen Satz kürzen und die Buttons nebeneinander setzen (Ziel unter 140 px). Den Chat-Button ausblenden, solange der Banner offen ist (`public/chat.css:7`, `public/css/main.css:389`). Den Banner möglichst serverseitig rendern. *~2 h*
- [ ] **Entity-Graph vereinheitlichen.** Eine Organization als `["Organization","ProfessionalService"]` mit `address`, `hasMap` und Google-Profil in `sameAs`, dazu eine Person (`/#person`). Blog- und Ratgeber-Autor auf die Person umstellen (`services/blogPostPresentationService.js:245`, `controllers/ratgeberController.js:193`). `/about` mit AboutPage + Person ausstatten (Vorschlag in `findings/schema.md`). *~2–3 h*
- [ ] **Bezirksseiten-Schema.** Die Apex-Domain durch `www` ersetzen und ProfessionalService-Knoten durch Service + `provider` ersetzen (`views/bereiche/webdesign-berlin-district.ejs`). *~30 Min*
- [ ] **Echte Datumsangaben.** `nowIso`-Fallbacks in `controllers/sitemapController.js` entfernen, `dateModified` in `views/index.ejs:173` fest setzen. *~1 h*
- [ ] **NAP sichtbar machen.** Adresse, `tel:`-Link und Google-Profil-Link in Footer und auf `/kontakt`. Bewertungszahl vereinheitlichen. *~1 h*

## Medium: innerhalb eines Monats

- [ ] **Kannibalisierung auflösen.** Eine Hauptseite für „Website erstellen lassen Berlin“ / „Webdesign Berlin“ festlegen und die übrigen Titel und H1 auf ihre eigene Intention umschreiben. Eine Kosten-Pillar-Seite, die übrigen 8 Kostenseiten zusammenführen oder abgrenzen.
- [ ] **Interne Verlinkung.** Die Hub-and-Spoke-Struktur mit 5 Clustern und Link-Liste aus `findings/cluster.md` umsetzen. Linkziele des Content-Agents erweitern (`contentAgentLinks.js`).
- [ ] **Bezirksseiten.** Pro Bezirk echte Inhalte (Kundenbeispiel, lokale Branchen) oder zu einer Berlin-Seite zusammenführen. EN-Bezirke bis zur Übersetzung auf noindex.
- [ ] **E-E-A-T.** Ein Personen-Absatz unter der Startseiten-H1, eine Autorbox bei Blog und Ratgeber, einheitlich ich/du (`/about`, `/faq`, `/booking`).
- [ ] **`llms.txt` neu schreiben** mit www-Links, Preisen, Inhaber und Zusammenfassung (Entwurf in `findings/agentic.md`).
- [ ] **Abgeschnittene Titel/Descriptions** bei 8 Blogposts reparieren, Kürzung im Content-Agent auf Wortende umstellen.
- [ ] **Sprachumschalter** ohne Query bauen (`views/partials/header.ejs:27-28`). `/faq?cat=999` soll 404 statt 500 liefern.
- [ ] **Blog-Slugs** mit Sonderzeichen bereinigen und per 301 umleiten.
- [ ] **`srcset`** für alle Inhaltsbilder, Cloudinary mit `f_auto,q_auto,w_`.
- [ ] **CSS:** `p { font-weight: bolder }` entfernen, Orange auf ca. `#c93c0c` abdunkeln, `/kontakt`-Hero ohne `100vh`.
- [ ] **Swipe-and-Cook-Seiten** auf noindex, aus Footer und Sitemap nehmen.
- [ ] **EN-Paketseiten** übersetzen und indexieren oder den Sprachumschalter auf `/en` zeigen lassen.
- [ ] **Security-Header:** HSTS auch auf dem Redirect, `Permissions-Policy`, CSP ausbauen.

## Low: Backlog

- [ ] ARIA: Logo ohne `role="presentation"`, Bewertungssterne mit `role="img"`.
- [ ] Paketnamen in die Linktexte „Details ansehen“ aufnehmen.
- [ ] Font-Awesome-Doppelladung, Footer-Logo-SVG optimieren.
- [ ] Session nur bei Formularseiten anlegen, IndexNow einbauen.
- [ ] Footer-Credit bei sauber-mehr.de, Credit-Klausel in Angebote. Lokale Verzeichnisse und Netzwerke (IHK, Gewerbevereine Lichtenberg).
- [ ] Sicherungsdatei `views/index copy.ejs` mit alter Nummer löschen. Doppelte `Robots.txt` im Root aufräumen.

## Monitoring (laufend)

- [ ] Search Console und einen PageSpeed-API-Key in claude-seo hinterlegen (`/seo google setup`), dann echte Felddaten nachziehen.
- [ ] Nach den Fixes eine Drift-Baseline anlegen (`/seo drift baseline https://www.komplettwebdesign.de`) und nach jedem Deployment vergleichen.
- [ ] Quartalsweise die Rücklinks der Referenzkunden prüfen.
