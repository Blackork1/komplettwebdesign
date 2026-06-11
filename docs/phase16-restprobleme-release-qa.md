# Phase 16 Restprobleme und Release-QA

Stand: 02.06.2026

## 1. Executive Summary

| Punkt | Ergebnis |
| --- | --- |
| Lokaler Code-Stand | Go mit manuellen Produktions- und Rechtstextprüfungen |
| Lokaler Crawl | 118 Sitemap-Seiten, 180 interne Ziele, 0 kritische Fehler |
| Tests | 264/264 bestanden |
| Build | bestanden, Browserslist-Warnung behoben |
| Direkt korrigiert | Quick-Form-500er bei leerem POST, robots-Sitemap auf www, Production-Canonical-Fallback auf www, dünne Seiten sicher ergänzt |
| Nicht automatisch erledigt | Rechtstexte, echte E-Mail-Zustellung, Captcha-Liveprüfung, Consent-Liveprüfung, Search Console, Rich Results |
| Live-Produktionsbefund | Aktuelle Live-Seite ist noch nicht auf lokalem Stand: mehrere neue URLs liefern live 404; alte Paket-URLs liefern live 200. Nach Deployment erneut prüfen. |

Finale Entscheidung: Go mit manuellen Prüfungen nach Deployment. Kein No-Go im lokalen Code-Stand, aber kein blindes Live-Go ohne erneuten Production-Smoke-Test.

## 2. Geänderte Dateien

| Datei | Änderung | Zweck | Risiko | Status |
| --- | --- | --- | --- | --- |
| `controllers/contactController.js` | Leerer Quick-Form-POST nutzt sicheren Body-Fallback statt `req.body` direkt. | 500er bei Bot-/Leer-POST vermeiden. | Niedrig | Direkt korrigiert |
| `index.js` | Production-Fallback für Canonicals von non-www auf `https://www.komplettwebdesign.de` gesetzt. | Fallback an reale Live-Kanonisierung anpassen. | Niedrig | Direkt korrigiert |
| `public/robots.txt` | Sitemap-Hinweis auf `https://www.komplettwebdesign.de/sitemap.xml` geändert. | robots/Sitemap an Live-www-Basis angleichen. | Niedrig | Direkt korrigiert |
| `views/industries/index.ejs` | Branchenübersicht mit kurzer Einordnung und sinnvollen internen Links ergänzt. | Thin-Content-Risiko auf `/branchen` reduzieren. | Niedrig | Direkt korrigiert |
| `views/references/index.ejs` | Referenzübersicht trust-orientiert ergänzt, ohne erfundene Zahlen. | Thin-Content-Risiko auf `/referenzen` reduzieren. | Niedrig | Direkt korrigiert |
| `views/references/show.ejs` | Referenzdetail mit übertragbarer Einordnung ergänzt. | Thin-Content-Risiko bei `/referenzen/zur-alten-backstube` reduzieren. | Niedrig | Direkt korrigiert |
| `views/static/kosten/webdesign-blumenladen.ejs` | Canonical/Breadcrumb auf dynamische Base umgestellt, Preislogik und Abgrenzung ergänzt. | Korrekte Canonicals, weniger Thin Content, neue Angebotslogik. | Niedrig | Direkt korrigiert |
| `views/static/kosten/webdesign-cafe.ejs` | Canonical/Breadcrumb auf dynamische Base umgestellt, Preislogik und Abgrenzung ergänzt. | Korrekte Canonicals, weniger Thin Content, neue Angebotslogik. | Niedrig | Direkt korrigiert |
| `package-lock.json` | `caniuse-lite`/Browserslist-Daten aktualisiert. | Build-Warnung entfernen, keine Target-Browser-Änderung. | Niedrig | Direkt korrigiert |

## 3. Redirect-Kettenprüfung

| alte URL | Ziel | Hop-Anzahl | Statuscode | Problem | korrigiert ja/nein |
| --- | --- | ---: | --- | --- | --- |
| `/pakete/basis` | `/pakete/start` | 1 | 301 -> 200 | keine Kette | nein, bereits korrekt |
| `/pakete/premium` | `/pakete/wachstum` | 1 | 301 -> 200 | keine Kette | nein, bereits korrekt |
| `/pakete/basis/` | `/pakete/start` | 1 | 301 -> 200 | keine Kette | nein, bereits korrekt |
| `/pakete/premium/` | `/pakete/wachstum` | 1 | 301 -> 200 | keine Kette | nein, bereits korrekt |
| `/webdesign-cafe` | `/branchen/webdesign-cafe` | 1 | 301 -> 200 | keine Kette | nein, bereits korrekt |
| `/webdesign-blumenladen` | `/branchen/webdesign-blumenladen` | 1 | 301 -> 200 | keine Kette | nein, bereits korrekt |

Live-Hinweis: Auf `https://www.komplettwebdesign.de` liefern `/pakete/basis` und `/pakete/premium` aktuell noch 200. Nach Deployment muss dort 301 geprüft werden.

## 4. Canonical-Kettenprüfung

| URL | Canonical | Zielstatus | Problem | korrigiert ja/nein |
| --- | --- | --- | --- | --- |
| `/` | eigene URL | 200 | keines | nein |
| `/webdesign-berlin` | eigene URL | 200 | keines | nein |
| `/pakete` | eigene URL | 200 | keines | nein |
| `/pakete/start` | eigene URL | 200 | keines | nein |
| `/pakete/business` | eigene URL | 200 | keines | nein |
| `/pakete/wachstum` | eigene URL | 200 | keines | nein |
| `/pakete/individuell` | eigene URL | 200 | keines | nein |
| `/webdesign-berlin/kosten-preise-pakete` | eigene URL | 200 | keines | nein |
| `/webdesign-blumenladen/kosten` | eigene URL | 200 | vorher harter Produktionscanonical/Breadcrumb | ja |
| `/webdesign-cafe/kosten` | eigene URL | 200 | vorher harter Produktionscanonical/Breadcrumb | ja |
| `/laufende-kosten-website` | eigene URL | 200 | keines | nein |
| `/zusatzleistungen-webdesign` | eigene URL | 200 | keines | nein |
| `/website-wartung-berlin` | eigene URL | 200 | keines | nein |
| `/local-seo-berlin` | eigene URL | 200 | keines | nein |
| `/website-relaunch-berlin` | eigene URL | 200 | keines | nein |
| `/landingpage-erstellen-lassen` | eigene URL | 200 | keines | nein |
| `/website-audit` | eigene URL | 200 | keines | nein |
| `/kontakt` | eigene URL | 200 | keines | nein |

## 5. Sitemap-Kettenprüfung

| URL | Status | Canonical | Indexierbar | Problem | Status |
| --- | --- | --- | --- | --- | --- |
| lokale Sitemap | 200 | 118 URLs | ja | keine Redirect-/404-/Noindex-URLs gefunden | sauber |
| alte Paket-URLs | nicht enthalten | n/a | n/a | keine alten Paket-URLs in Sitemap | sauber |
| interne Ziele | 180 geprüft | n/a | n/a | 0 kaputte interne Links, 0 interne Redirectlinks | sauber |
| robots.txt | 200 | n/a | ja | Sitemap vorher non-www | korrigiert auf www |

Live-Hinweis: Die Live-Sitemap auf `https://www.komplettwebdesign.de/sitemap.xml` enthält aktuell 109 URLs und entspricht nicht dem lokalen Stand mit 118 URLs. Nach Deployment erneut crawlen.

## 6. Interne Linkprüfung

| Bereich | Status |
| --- | --- |
| alte Paketlinks `/pakete/basis`, `/pakete/premium` | lokal keine internen Links gefunden |
| interne Redirectlinks | lokal 0 gefunden |
| kaputte Links | lokal 0 gefunden |
| CTA-Ketten | lokal keine Redirect-/404-Ziele gefunden |
| Tracking-/Success-Kette | Tracking ist consent-aware; Success-Events werden über Danke-Seite/Success-Status vorbereitet, nicht über Button-Klick als Lead |

## 7. DB-/CMS-Altinhalte

Read-only-Dry-Run, keine Schreibzugriffe.

| Quelle | Fundstellen | Dry-Run | geändert ja/nein | noch offen |
| --- | ---: | --- | --- | --- |
| `industries` | 16 Treffer | alte 499-/899-/Basis-/Premium-/DSGVO-Formulierungen | nein | redaktionell bereinigen |
| `leistungen_pages` | 2 Treffer | alte Preis-/Rechtsformulierungen | nein | redaktionell bereinigen |
| `posts` | 14 Treffer | alte Preis-/Paket-/DSGVO-/Rechtsformulierungen | nein | redaktionell bereinigen |
| `ratgeber` | 3 Treffer | alte Preis-/Paketlogik | nein | redaktionell bereinigen |
| Platzhalterdateien `platzhalter/*` | mehrere Treffer | nicht öffentlich gerouteter Altbestand | nein | optional archivieren oder bereinigen |

Keine Production-DB-Schreibzugriffe durchgeführt. Für echte Bereinigung: Backup erstellen, Redaktionsliste abarbeiten, danach Sanitizer-Treffer erneut messen.

## 8. Runtime-Sanitizer

`util/legacyPublicCopy.js` bleibt erforderlich.

| Punkt | Ergebnis |
| --- | --- |
| Welche Fälle fängt er noch ab? | alte Preise 499/899, Basis/Premium-Logik, riskante Recht-/DSGVO-/Kostenformulierungen, alte Links |
| Quellen bereinigt | öffentlich gerenderte Thin-Seiten und robots/Canonical-Fallback |
| Quellen nicht bereinigt | DB-/CMS-Altinhalte aus `industries`, `posts`, `ratgeber`, `leistungen_pages`; Platzhalterdaten |
| Empfehlung | Sanitizer als Fallback behalten, erst nach redaktioneller DB-Bereinigung reduzieren |

## 9. Dünne Seiten

| URL | Wortanzahl vorher | Wortanzahl nachher | Maßnahme | Empfehlung | Status |
| --- | ---: | ---: | --- | --- | --- |
| `/branchen` | 283 | 402 | Einordnung und interne Links ergänzt | weiter ausbauen, kein Noindex nötig | verbessert |
| `/referenzen` | 284 | 410 | Referenzlogik/Trust erklärt | echte Referenzen später ergänzen | verbessert |
| `/referenzen/zur-alten-backstube` | 435 | 511 | Übertragbarkeit ohne Ergebnisversprechen ergänzt | echte Projektdetails nur bei gesicherter Grundlage ergänzen | verbessert |
| `/webdesign-blumenladen/kosten` | 370 | 497 | Preis-/Umfangslogik und Canonical korrigiert | branchenspezifisch weiter ausbauen | verbessert |
| `/webdesign-cafe/kosten` | 376 | 488 | Preis-/Umfangslogik und Canonical korrigiert | branchenspezifisch weiter ausbauen | verbessert |

## 10. Produktions-Smoke-Test

| Test | Umgebung | Ergebnis | Blocker | manuelle Prüfung nötig |
| --- | --- | --- | --- | --- |
| Hauptseiten lokal | lokal | 200, H1/Meta/Canonical sauber | nein | nein |
| robots/sitemap lokal | lokal | 200, Sitemap-Hinweis auf www | nein | nein |
| Live non-www -> www | Produktion read-only | 301 auf www | nein | nein |
| Live neue Seiten | Produktion read-only | mehrere neue Seiten live noch 404 | ja, bis Deployment erfolgt ist | ja |
| Live alte Paket-URLs | Produktion read-only | `/pakete/basis` und `/pakete/premium` live noch 200 | ja, bis Deployment erfolgt ist | ja |
| Kontaktseite | lokal | 200 | nein | Produktion nach Deployment |
| leerer POST `/kontakt` | lokal | 422 | nein | nein |
| leerer POST `/kontakt/kurzanfrage` | lokal | vorher 500, jetzt 422 | nein | nein |
| Admin Auto-Slot-Routen | lokal | ohne Login 302 geschützt | nein | Admin-Test nach Deployment |
| öffentliche Kalender-API | lokal | 200 | nein | echte freie Slots im Admin prüfen |

## 11. E-Mail-Test

| Punkt | Status |
| --- | --- |
| Formular produktiv gesendet | nein, keine echte Produktionsanfrage ohne Freigabe |
| E-Mail angekommen | nicht geprüft |
| Reply-To korrekt | Codepfad validiert; Live-Zustellung manuell prüfen |
| Paketwerte korrekt | Tests und Codepfad mit neuer Paketlogik bestanden |
| Blocker | Hoch, falls nach Deployment keine E-Mail ankommt |

## 12. Captcha, Consent und Tracking

| Bereich | Ergebnis |
| --- | --- |
| Captcha | lokal nicht live validiert; Quick-Form verlangt Token bei `contact-quick`, Tester-Spamschutz durch Tests abgedeckt |
| Consent | Codepfad consent-aware; Analytics/Marketing nur nach Consent laut Trackingtests |
| Tracking | 0 PII-Treffer im lokalen Crawl; Tests für non-PII-Events bestanden |
| PII | keine E-Mail, Namen, Telefonnummern, Nachrichten oder Website-URLs im Tracking-Crawl gefunden |
| offene Punkte | Live-Browserprüfung mit Ablehnen/Akzeptieren/Einstellungen nach Deployment |

## 13. Search-Console-Vorbereitung

Finale Sitemap-URL: `https://www.komplettwebdesign.de/sitemap.xml`

Manuell in der Search Console prüfen:

- `/`
- `/webdesign-berlin`
- `/pakete`
- `/pakete/start`
- `/pakete/business`
- `/pakete/wachstum`
- `/pakete/individuell`
- `/kontakt`
- `/local-seo-berlin`
- `/website-relaunch-berlin`
- `/website-audit`
- `/pakete/basis` als Weiterleitung
- `/pakete/premium` als Weiterleitung

Aufgaben:

- Sitemap nach Deployment einreichen.
- Coverage nach einigen Tagen prüfen.
- 404-Berichte prüfen.
- Indexierung der vormals dünnen Seiten beobachten.

## 14. Rich-Results-Vorbereitung

| URL | Schema-Typen | Live-Test nötig | Risiko |
| --- | --- | --- | --- |
| `/` | WebPage/Organization/FAQ je nach sichtbarem Inhalt | ja | niedrig |
| `/pakete` | WebPage/Breadcrumb/FAQ | ja | niedrig |
| `/webdesign-berlin` | WebPage/Breadcrumb/FAQ | ja | niedrig |
| `/local-seo-berlin` | WebPage/Service/Breadcrumb/FAQ | ja | niedrig |
| `/website-relaunch-berlin` | WebPage/Breadcrumb/FAQ | ja | niedrig |
| `/website-audit` | WebPage/Breadcrumb/FAQ | ja | niedrig |
| `/kontakt` | ContactPage/Breadcrumb/FAQ | ja | niedrig |

Lokal: 0 JSON-LD-Parsefehler, keine AggregateRating-/Review-Erfindungen im Crawl gefunden.

## 15. Browserslist/caniuse-lite

| Punkt | Ergebnis |
| --- | --- |
| Warnung vorhanden | ja, vor Update |
| Aktualisiert | ja, `npx update-browserslist-db@latest` |
| Änderung | `package-lock.json`, keine Target-Browser-Änderung |
| Build danach | bestanden, keine Browserslist-Warnung |
| Tests danach | 264/264 bestanden |

## 16. Tests, Build und Crawl

| Kommando/Test | Ergebnis | Fehler/Warnungen | Status |
| --- | --- | --- | --- |
| `npm test` vor Browserslist-Update | 264/264 bestanden | keine | bestanden |
| `npm run build` vor Browserslist-Update | bestanden | Browserslist/caniuse-lite veraltet | bestanden mit Hinweis |
| `npx update-browserslist-db@latest` | erfolgreich | keine Target-Browser-Änderung | bestanden |
| `npm run build` nach Update | bestanden | keine Warnung | bestanden |
| `npm test` nach Update | 264/264 bestanden | keine | bestanden |
| finaler lokaler Crawl | 118 Sitemap-Seiten, 180 interne Ziele | 0 Seiten-/Schema-/Link-/Altpreis-/PII-Fehler | bestanden |

## 17. Verbleibende Launch-Blocker

| Priorität | Punkt | Status |
| --- | --- | --- |
| kritisch | Live-Deployment muss lokalen Stand enthalten; aktuell liefern neue URLs live teils 404 und alte Paket-URLs teils 200 | offen bis Deployment |
| hoch | Produktives Kontaktformular mit echter Testanfrage und E-Mail-Zustellung prüfen | manuell |
| hoch | Captcha/Consent/Tracking im Live-Browser prüfen | manuell |
| hoch | Impressum, Datenschutzerklärung und Cookie-/Consent-Konzept rechtlich prüfen | manuell |
| mittel | DB-/CMS-Altinhalte redaktionell bereinigen, danach Sanitizer-Treffer reduzieren | offen |
| mittel | Search Console Sitemap einreichen und Coverage beobachten | manuell |
| mittel | Rich Results Live-Test ausführen | manuell |
| niedrig | Platzhalter-/Archivdateien mit alter Preislogik bereinigen oder archivieren | offen |

## 18. Finale Entscheidung

Go mit manuellen Prüfungen nach Deployment.

Begründung:

- Der lokale Code-Stand besteht Tests, Build und Crawl.
- Redirects, Canonicals, Sitemap, interne Links, öffentliche Altpreisanker und JSON-LD sind lokal sauber.
- Ein echter Formular-500er wurde korrigiert.
- Browserslist/caniuse-lite ist aktualisiert.
- Dünne Seiten wurden sicher verbessert, ohne erfundene Referenzen, Bewertungen oder lokale Angaben.
- Nicht automatisierbare Punkte bleiben bewusst manuell: Rechtstexte, produktive E-Mail-Zustellung, Captcha, Consent/Tracking, Search Console und Rich Results.
- Die aktuelle Live-Seite ist noch nicht identisch mit dem lokalen Stand. Deshalb muss nach Deployment ein erneuter Produktions-Smoke-Test erfolgen.
