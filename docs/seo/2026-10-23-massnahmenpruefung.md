# SEO-Maßnahmenprüfung vom 23.10.2026

Grundlage sind der Maßnahmenplan des Nutzers, der ergänzte FULL-AUDIT-REPORT.md vom 23.10.2026, die Dateien unter `komplettwebdesign.de-audit/findings/`, aktuelle öffentliche Stichproben und das bestehende Repository.

**Stand der Erstprüfung, vor dem anschließenden Deployment-Auftrag:** Die unten bezeichneten Codekorrekturen liegen im Arbeitsverzeichnis und sind noch nicht deployed. Die gezielten Blogkorrekturen wurden in der angebundenen Datenbank bereits ausgeführt. Es wurde kein neuer SEO-Gesamtscore und keine Rankingverbesserung gemessen.

Der Nutzer hat **+49 155 11245048**, technisch `+4915511245048`, als richtige Telefonnummer bestätigt. Die aktuellen Paketanker sind Start ab 799 €, Business ab 1.499 €, Wachstum ab 2.499 € und Individuell ab 3.500 € oder nach Aufwand. Öffentliche Preisersetzungen verwenden den jeweiligen Katalogkontext.

## Kritische Maßnahmen

| Maßnahme | Einschätzung und Ergebnis |
|---|---|
| Platzhalter statt Preisen | Bestätigt. `util/legacyPublicCopy.js` erzeugt jetzt aufgelöste Katalogpreise. Spezifische alte Paketkontexte werden vor allgemeinen Preisankern behandelt. Bereits aktuelle Business-/Wachstumspreise bleiben erhalten. Controller übergeben ihren aktuellen Pricing-Kontext. Regressionstests decken die vier beanstandeten Phrasen, Preisänderungen und Regelreihenfolge ab. |
| Café und Blumenladen neu einreichen | Lokale Seitenausgabe korrigiert und geprüft. Eine neue Einreichung in Search Console ist erst nach Veröffentlichung der Codekorrekturen sinnvoll und wurde nicht ausgeführt. |
| Bezirksseiten-Tokens und Sprache | Bestätigt und korrigiert: deutsche Preis-Tokens in FAQ und Metadaten, Auflösung der Ratgeber-Teaser im Bezirkscontroller und Hub. |
| `/handwerker` | Bestätigt. Die öffentliche Ausgabe verwendet eine geprüfte EJS-View mit der gemeinsamen Paketdarstellung von `/pakete`. Alte CMS-Preisboxen, Prozentversprechen und widersprüchliche Zeitangaben werden nicht mehr ausgegeben. Zeitrahmen: kompakt meist 2–4 Wochen, mehrseitig häufig 4–6 Wochen, abhängig von Umfang und Mitarbeit. Sichtbare FAQ und Schema verwenden dieselben Daten. |
| Zwei ältere Blogartikel | Beide Datensätze vorhanden. Telefonnummer und alte Preisanker korrigiert, veraltete eingebettete JSON-LD-Blöcke entfernt; der alte Paketabschnitt im Full-Service-Artikel wurde durch aktuelle Preis-Tokens und eine klare Leistungsabgrenzung ersetzt. Schema kommt aus der Präsentationsschicht. Änderungen bereits in der DB ausgeführt. |
| Telefonnummer | Nach Nutzerbestätigung in `helpers/siteFacts.js` korrigiert; öffentliche Templates, Footer, Kontakt, Impressum und Schema beziehen sie daraus. Die zwei betroffenen Blogtexte wurden ebenfalls berichtigt. Externe Verzeichnisse bleiben separat zu aktualisieren. |
| Google-Unternehmensprofil | Kontaktdaten und Profil-Links im Code vereinheitlicht. Ein zusätzlicher Kartenlink verwendet die vorhandene Berliner Adresse als Suchziel. Der behauptete falsche Profil-Pin, das Servicegebiet und die Profiladresse wurden nicht im angemeldeten Google-Profil bearbeitet. Den bestehenden Profil-Link nicht durch einen geratenen Place-Eintrag ersetzen. |
| Stripe | Die Live-Startseite enthält weiterhin einen öffentlichen Testschlüssel; die lokale Konfiguration verwendet Live-Schlüssel. Auf der geprüften Startseite ist kein Checkout-Button vorhanden; im Repository kommt der Checkout-Marker nur im Lazy-Loader vor. Der öffentliche Schlüssel allein belegt deshalb keine tatsächlich im Testmodus abgewickelte Zahlung. Produktionskonfiguration und aktiven Zahlungsweg gezielt prüfen. Keine Schlüssel ersetzt und keine Zahlungen ausgelöst. |

## Hohe Priorität

| Maßnahme | Einschätzung und Ergebnis |
|---|---|
| Slash, Doppelslash und Großschreibung | Neue Middleware bündelt öffentliche HTML-Pfade per 301 und erhält Query-Parameter. Blog-Slugs bleiben bei der allgemeinen Normalisierung unverändert. Assets, Uploads, Admin, API und POST-Anfragen sind ausgenommen. Navigation verwendet `/leistungen`. HTTPS-/Host-Weiterleitungen verwenden bereits den normalisierten Zielpfad. |
| Indexierung von Hilfsseiten | `/de` wird auf `/` umgeleitet. Demo, Buchungsseiten einschließlich EN und Danke-Seiten, Rückgabeseite und Swipe-and-Cook-Seiten erhalten `noindex`. Der HTTP-Header greift auch für statisches Demo-HTML. Ungeprüfte Branchen bleiben außerhalb der vorhandenen Sitemap-Auswahl und erhalten nun ebenfalls `noindex`. |
| Bilder | `heroBg.webp`: 903.744 → 88.874 Bytes. Avatar: 335.374 → 7.712 Bytes. Vier Ratgeber-PNGs als WebP: 56.074–80.158 Bytes, dazu 600-Pixel-Varianten. Blog-/Ratgeber-Templates nutzen responsive Varianten für bekannte Ratgeberbilder und Cloudinary-Bilder. Bekannte Ratgeberbilder haben tatsächliche Maße von 1.200 × 900. |
| Cookie-Banner und Chat | Banner wird beim Erstbesuch serverseitig angezeigt. Kurzer Text, gleichwertige Buttons nebeneinander, mobile Höhe im geprüften Bereich unter 140 px. CSS blendet Chat und Chatfenster aus, solange der Banner sichtbar ist; das wirkt bereits vor JavaScript. Ablehnung wurde mit anschließend weiterhin gesperrten Analyse-Skripten geprüft. |
| Organisation und Person | Gemeinsame Builder in `helpers/entitySchema.js`: Organisation als `Organization`/`ProfessionalService` mit Adresse, Kartenlink, Profil-Link und `/#organization`; Person unter `/#person`. Aktive Schema-Erzeuger verwenden diese Identität oder einen Verweis darauf. Blog und Ratgeber verweisen als Autor auf die Person. About erhält AboutPage mit Person als Hauptentität. |
| Bezirks-Schema | Aktive deutsche Bezirks-View verwendet www und einen Service mit zentralem Provider. Kein zusätzlicher lokaler Unternehmensstandort je Bezirk. |
| Echte Datumsangaben | Laufende `now()`-/`nowIso`-Ersatzwerte aus der Sitemap entfernt. Unbekannte Daten werden ausgelassen; Paketdaten kommen aus dem Katalog. Bei Ratgeber-Dubletten hat die DB wie in der Seitenausgabe Vorrang. Das Startseiten-Datum beschreibt die tatsächliche Inhaltsänderung vom 23.10.2026. Historische Artikeltermine wurden nicht erfunden oder pauschal zurückdatiert. |
| Sichtbare NAP-Angaben | Gemeinsame Kontaktpartial in Footer und Kontaktseite, mit Adresse, Telefonnummer, `tel:`-Link, E-Mail, Google-Profil und Adress-Kartenlink. Die Startseiten-Bewertungszusammenfassung nutzt dieselben zentralen Werte wie die übrigen Stellen. Die tatsächliche aktuelle Google-Anzahl bleibt manuell zu verifizieren. |

## Mittlere Priorität

| Maßnahme | Einschätzung und Ergebnis |
|---|---|
| Kannibalisierung | Bestehende Intent-Registry legt `/webdesign-berlin` bereits als kommerzielle Hauptseite fest. Dessen Titel und H1 beginnen jetzt mit „Webdesign Berlin“. Startseite fokussiert persönliche Websites für kleine Unternehmen, `/pakete` die Paketauswahl und der Ablauf-Ratgeber die Planung. Umfangreiche Kosten-/Artikelzusammenführungen bleiben offen, da dafür Query-/URL-Daten und die vorhandenen Redirect-Entscheidungen geprüft werden müssen. |
| Fünf Themencluster und interne Links | Linkfreigaben des Content-Agents von 9 auf 22 Ziele erweitert, darunter Paketdetails, Ratgeber und ergänzende Leistungen. Handwerkerseite verbindet Ratgeber, Leistung und Pakete. Die vollständige bestehende Link-Matrix und Artikelkonsolidierung sind damit noch nicht umgesetzt. Geschwisterartikel müssen thematisch zugeordnet und nach Verfügbarkeit freigegeben werden. |
| Bezirksseiten | Preis-, Sprach- und Schemafehler korrigiert. Englische Bezirke erhalten bis zur vollständigen Prüfung `noindex` und stehen nicht mehr in der Sitemap. Der lokale Sitz wird über die gemeinsamen Kontaktdaten sichtbar. Echte bezirksspezifische Kundenbeispiele fehlen weiterhin; dafür keine Referenzen erfinden. Deutsche Bezirke wurden nicht ohne Daten zusammengeführt. |
| E-E-A-T und Ansprache | Personenabsatz unter der Startseiten-H1, Autorenbox bei Blog und Ratgeber, persönliche About-Metadaten und AboutPage ergänzt. Alte generische Handwerkeransprache entfällt. Eine vollständige Redaktion aller älteren FAQ-/Buchungstexte bleibt offen. |
| `llms.txt` | Neu formuliert: www-Links, Inhaber, Telefonnummer, Leistungsgrenzen und konkrete Preise. `llms.txt` und `pricing.md` werden serverseitig aus aktuellen Katalogdaten erzeugt; statische Dateien dienen als mitgepflegte Fassungen. Kein Rankingversprechen daraus ableiten. |
| Abgeschnittene Metadaten | Acht beanstandete Descriptions und zwei Titles in neun Datensätzen durch vollständige Fassungen ersetzt; außerdem die Beschreibungen der zwei älteren Preis-/Telefonartikel gekürzt und vervollständigt. Persistente DB-Korrektur ausgeführt. Der Writer-Prompt verlangt vollständige Aussagen und Neufassung bei Überlänge. Im aktuellen Agenten wurde keine harte Titel-/Description-Kürzung nachgewiesen: `.max(160)` validiert die Länge, es schneidet selbst nichts ab. Die im Report behauptete Ursache ist daher nicht hinreichend belegt. |
| Sprachumschalter und FAQ-Fehler | Sprachwechsel übernimmt keine Query mehr. Der englische Umschalter von deutschen Paketseiten führt vorläufig auf `/en`. Unbekannte oder fehlerhafte FAQ-Kategorien erreichen 404 statt 500. |
| Sonderzeichen in Blog-Slugs | Sechs explizite öffentliche ASCII-Aliase mit 301, beispielsweise `scroll-snap-galerie-zoom-on-view`. Listen und Sitemap verwenden die sauberen Slugs; die Auflösung erfolgt weiter über den gespeicherten Artikel und seine ID. Kommentare und redaktionelle Historie bleiben erhalten. Alte eingehende Links funktionieren über die Weiterleitung. |
| `srcset` überall | Für Ratgeber-/Blog-Teaser und Titelbilder sowie untransformierte Cloudinary-Bilder begonnen. Bereits transformierte oder signierte Cloudinary-URLs bleiben unverändert, damit vorhandene Zuschnitte und Signaturen erhalten bleiben. Nicht sämtliche Bilder in älteren DB-HTML-Texten, Referenzgalerien und Branchenabschnitten sind damit erfasst. Für diese Restmenge Größen und Varianten systematisch ergänzen. |
| CSS | Globales Absatzgewicht auf normal gestellt, zentralen Orange-Wert auf `#c93c0c` angepasst, Kontakt-Hero von fester Viewporthöhe gelöst. Weitere lokale Farbdefinitionen sind nicht vollständig kontrastgeprüft. |
| Swipe-and-Cook | Öffentliche App-Seiten bleiben erreichbar, werden aber aus Marketing-Footer und Sitemap entfernt und auf `noindex` gesetzt. Vorhandene App-Inhalte und die laufenden Cookavoli-Arbeiten wurden nicht umgeschrieben. Zwei Tests zur früheren Footer-/Sitemap-Aufnahme wurden an die neue SEO-Vorgabe angepasst. |
| Englische Paketseiten | Die bestehende noindex-Regel und der Ausschluss aus der Sitemap bleiben bis zur Vollübersetzung erhalten. Der Sprachumschalter führt zu `/en`. Eine vollständige Übersetzung einschließlich DB-Preistexte ist nicht erfolgt; vorhandene EN-Inhaltslinks sind noch gesondert zu prüfen. |
| Security-Header | Header stehen vor HTTPS-/Host-Weiterleitungen. HSTS erreicht damit HTTPS-Redirects; Permissions-Policy und CSP-`form-action` ergänzt. Eine umfassende `script-src`-/`connect-src`-Policy bleibt nach Inventarisierung und Prüfung von Stripe, Consent, Analytics, Chat, reCAPTCHA und Videos offen. |

## Backlog und externe Maßnahmen

| Maßnahme | Ergebnis / nächster Schritt |
|---|---|
| ARIA | `role="presentation"` vom Header-Logo entfernt, Bewertungssterne mit sinnvoller Rolle versehen. |
| Paket-Linktexte | Gemeinsame Paketdarstellung enthält den Paketnamen in den Detail- und Anfrage-Links. Andere ältere Detail-Linktexte sind noch nicht vollständig überarbeitet. |
| Font Awesome | Aktueller gemeinsamer Head lädt Kern-CSS und Solid-Erweiterung. Das ist nicht automatisch eine doppelte Bibliotheksladung; die zusätzlichen noscript-Links sind ein Fallback. Der frühere externe Link auf der Startseite ist auskommentiert. Weitere DB-Seiten und der tatsächliche Netzwerkwasserfall können separat geprüft werden. |
| Footer-SVG | Noch nicht optimiert. Das White-Logo benötigt eine Sichtprüfung vor einem verlustfreien SVG-Optimierungsschritt. |
| Sessions | Bereits `saveUninitialized: false`. Der globale CSRF-Helfer schreibt aber einen Token in die Session, weil das Newsletterformular im Footer auf öffentlichen Seiten steht. „Nur Formularseiten“ würde daher aktuell fast alle Seiten betreffen. Für echte Einsparung ist eine abgestimmte CSRF-/Formularänderung nötig; Schutz nicht einfach abschalten. |
| IndexNow | Nicht eingerichtet. Dafür Anbieter, Host-Key, Auslieferung und Veröffentlichungs-Trigger festlegen; keine Rankings oder Indexierung garantieren. |
| Kunden-Credits / Vertragsklauseln / Netzwerke | Nicht extern bearbeitet. Erfordert Kundenabstimmung bzw. eine gesonderte geschäftliche Entscheidung; Vertragsklauseln fachlich prüfen lassen. |
| Sicherungsdateien | Veraltete `views/index copy.ejs` und doppelte Root-`Robots.txt` entfernt. Ausgeliefert wird weiterhin `public/robots.txt`. |
| ProvenExpert, Gelbe Seiten, agenturen.app | Bestätigte Telefonnummer in den jeweiligen Konten auf +49 155 11245048 angleichen. Keine fremden Konten verändert. |
| Google-Profil | Adresse, Pin, Servicegebiet und aktuelle Rezensionenzahl im angemeldeten Konto prüfen und richtigstellen. |
| Search Console / PageSpeed | Keine Zugangsdaten oder API-Schlüssel neu hinterlegt. Nach Deployment Café/Blumenladen prüfen und erneutes Crawling anfordern, anschließend echte Indexierungs-, Query- und Felddaten auswerten. |
| Drift-Baseline | Keine Baseline des unveröffentlichten Codes gegen die Live-Seite erstellt. Nach Deployment den autorisierten SEO-Workflow ausführen und nur tatsächlich gemessene Änderungen vergleichen. |
| Quartalsweise Backlink-Prüfung | Keine automatische Terminserie angelegt, weil der Auftrag eine aktuelle Prüfung/Korrektur betrifft. Kundenlinks und gewünschte Kadenz gesondert festlegen. |

## Datenbankänderungen und Sicherung

`scripts/fixSeoAuditContent.js` hat ausschließlich elf veröffentlichte, explizit benannte Blogdatensätze bearbeitet. Vor jedem schreibenden Lauf wurde eine lokale Sicherung erstellt. Die ursprüngliche vollständige Sicherung liegt unter `.superpowers/seo-audit-backups/posts-2026-10-23T11-31-25-255Z.json`; eine zweite Sicherung vor der abschließenden Kürzung der beiden Altartikel-Beschreibungen liegt im selben Verzeichnis. Dieses Verzeichnis ist Git-ignoriert. Die frühere zusätzliche Kopie unter `/tmp/komplettwebdesign-seo-backups/` ist kein dauerhaftes Backup.

Es wurden keine Slugs, Artikel-IDs, Kommentarverknüpfungen, Veröffentlichungszustände oder Preise im Katalog geändert. `updated_at` wurde nur bei tatsächlich geänderten Artikeln aktualisiert. Der abschließende Probelauf findet elf Artikel, keine fehlenden Ziele und **null weitere Änderungen**.

Erneute Prüfung ohne Schreiben:

```sh
node scripts/fixSeoAuditContent.js
```

## Verifikation

- Baseline vor Änderungen: 2.249 bestandene Tests, 19 übersprungen, kein Fehler.
- Abschließende Testsuite: **2.275 bestanden, 19 übersprungen, 0 Fehler** (2.294 insgesamt); Regressionen für Preise, Sprache, URLs, Sitemap-Daten, Slug-Aliase, Consent, Entitäten und DB-Korrektur ergänzt.
- CSS-Build erfolgreich; `git diff --check` ohne Befund.
- 145 öffentliche Pfade aus dem bestehenden Crawl lokal geprüft: 137 × 200, 8 × 301, keine 4xx/5xx, keine der beanstandeten Preisphrasen oder Telefonnummern, keine ungültigen JSON-LD-Blöcke.
- Browserprüfung mit Chromium/Playwright auf `http://localhost:3210`, bei 320, 390 und 1.440 Pixeln Breite, jeweils acht wichtige Seiten. Browser-Plugin nicht verfügbar; gebündeltes Playwright verwendet, keine Browserabhängigkeit installiert.
- Auf diesen Seiten keine horizontalen Überläufe und keine JavaScript-Laufzeitfehler. Erstbesucher-Banner mobil je nach Sprache/Breite rund 111–129 px hoch, am Desktop rund 65 px; Chat währenddessen unsichtbar.
- EN-Erstbesuch → „Only necessary“ → Banner geschlossen, Chat sichtbar, keine Google-Analytics-/Clarity-Skripte geladen.
- Unabhängige Codeprüfung hat den zunächst fehlenden sichtbaren Handwerker-FAQ und die fehlende EN-Booking-noindex-Regel gefunden. Beide korrigiert und mit Tests abgesichert; keine weiteren wesentlichen Befunde in den geprüften Schwerpunkten.

Nicht geprüft sind eine produktive Veröffentlichung, echte Zahlungen, Formularversand an reale Empfänger, angemeldete Google-/Verzeichniskonten, Search-Console-Felddaten und sämtliche historischen Bilder in DB-Inhalten. Vorhandene fremde Änderungen im Arbeitsverzeichnis wurden erhalten.

## Einordnung einzelner Audit-Aussagen

Einige Punkte sollten nicht überbewertet werden:

- HSTS gehört auf HTTPS-Antworten einschließlich HTTPS-Weiterleitungen. Ein HSTS-Header auf einer unverschlüsselten HTTP-Antwort schützt den ersten HTTP-Aufruf nicht. Die Änderung der Middleware-Reihenfolge adressiert den sinnvollen Teil des Befunds. [MDN: Strict-Transport-Security](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security)
- Sitemap-`lastmod` soll eine wesentliche Inhaltsänderung beschreiben, nicht den Abrufzeitpunkt. Fehlende Daten auszulassen ist deshalb sinnvoller, als ständig ein neues Datum auszugeben. [Google: Sitemap erstellen](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- Die Angabe im Audit zu eingestellten FAQ-Rich-Results seit Mai 2026 ist in Googles aktuellem Änderungsprotokoll bestätigt. Das erhaltene FAQ-Markup dient der konsistenten Inhaltsbeschreibung; daraus wird kein Google-Rich-Result versprochen. [Google: Dokumentationsänderungen](https://developers.google.com/search/updates)
- Google beschreibt `llms.txt` ausdrücklich als nicht erforderlich und ohne positiven oder negativen Rankingeffekt für Google Search. Die Datei ist als aktuelle Zusammenfassung für andere verwendende Systeme gepflegt, nicht als vorrangiger Google-Ranking-Hebel. [Google: Dokumentationsänderungen vom Juni 2026](https://developers.google.com/search/updates)
