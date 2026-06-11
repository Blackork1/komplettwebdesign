# Phase 15 Finale Master-QA

Stand: 2026-06-02

## Veröffentlichungsentscheidung

**Bedingtes Go.** Aus technischer Sicht sind nach den direkten Phase-15-Korrekturen keine kritischen öffentlichen Blocker mehr offen. Vor Veröffentlichung sollten noch die Produktionsumgebung, die echten Rechtstexte und die dünnen Inhaltsseiten manuell geprüft werden.

## Direkt Korrigiert

- Alte Preis- und Paketlogik in gerenderten Blog-/Ratgeber-/FAQ-/Chat-Inhalten über `util/legacyPublicCopy.js` normalisiert.
- Alte sichtbare Vergleichslogik wie `799 € / 1.499 € / 1.499 €`, `Basis (799 €)` und `Premium (1.499 €)` auf Start/Business/Wachstum korrigiert.
- Doppelte Canonicals auf `/webdesign-cafe/kosten` und `/webdesign-blumenladen/kosten` entfernt.
- Kaputter Platzhalter-PDF-Link im Ratgeber auf eine vorhandene Kostenseite umgelegt.
- Mobile Button-Overflow auf den Branchen-Kostenseiten behoben.
- Newsletter-Logging der E-Mail-Adresse entfernt.
- FAQ-Akkordeons global auf einheitliches Aus-/Zuklappverhalten vorbereitet.

## Prüfergebnisse

| Bereich | Status | Problem/Risiko | Priorität | Maßnahme | direkt korrigiert | Folgeaufgabe |
|---|---|---|---|---|---|---|
| Preislogik | OK | Keine kritischen alten 499-/899-/Premium-1.499-Preisanker im finalen Crawl | Hoch | DB-/CMS-Inhalte runtime-seitig normalisiert | Ja | Alte Inhalte in der DB langfristig bereinigen |
| Paketlogik | OK | Alte Begriffe Basis/Premium kamen in älteren Artikeln noch vor | Hoch | Preisnahe Altlogik auf Start/Wachstum ersetzt | Ja | DB-Artikel redaktionell aktualisieren |
| Paket-URLs | OK | Neue URLs erreichbar; alte Paketlinks nicht mehr intern verlinkt | Hoch | Bestehende Redirectlogik beibehalten | Nein | Externe Altlinks nach Launch in Logs prüfen |
| Kontakt/Formular | OK | Schrittlogik, Spam-Schutz, Validierung und neue Paketwerte durch Tests abgedeckt | Hoch | Keine weitere Änderung in Phase 15 nötig | Nein | E-Mail-Zustellung in Produktion manuell testen |
| Auto-Slots/Termine | OK | Auto-Slot-Verhalten durch Tests abgedeckt | Hoch | Keine weitere Änderung nötig | Nein | Live-Admin einmal nach Deployment prüfen |
| Rechtliche Aussagen | OK | Kein kritischer Garantie-/Rechtsversprechen-Treffer im finalen Crawl | Hoch | Öffentliche Marketingtexte entschärft | Ja | Impressum/Datenschutz nicht fachlich geprüft |
| Kostenklarheit | OK | Laufende Kosten, Zusatzleistungen und Wartung getrennt erklärt | Hoch | Kaputten PDF-CTA ersetzt | Ja | Laufende-Kosten-Seite später inhaltlich ausbauen |
| Hosting/Wartung | OK | Kein `Wartung ab 5 €`, kein unbegrenzter Support, kein 24/7-Versprechen | Hoch | Safe-Hit `kein 24/7-Notfallbetrieb` dokumentiert | Nein | Keine |
| SEO-Meta/H1/Canonical | OK | Finaler Crawl: 0 H1-, Meta- oder Canonical-Fehler | Hoch | Doppelte Canonicals auf Kostenseiten entfernt | Ja | Produktionsbasis-URL prüfen |
| Sitemap/Robots | OK | 118 Sitemap-Seiten, robots.txt erreichbar und mit Sitemap-Hinweis | Hoch | XML-Escaping geprüft; kein echter 404 | Nein | Search Console nach Launch einreichen |
| Interne Links | OK | 130 interne Ziele geprüft, 0 kaputte Links, 0 interne Redirectlinks | Hoch | Platzhalter-PDF-Link ersetzt | Ja | Externe Links separat beobachten |
| Strukturierte Daten | OK | 0 JSON-LD-Parsefehler, keine falschen Ratings gefunden | Hoch | Keine weitere Änderung nötig | Nein | Rich Results Test für Hauptseiten nach Deployment |
| FAQ | OK | FAQ-Schema nur bei sichtbaren FAQ-Blöcken; Akkordeonverhalten vereinheitlicht | Mittel | Globales FAQ-Script erweitert | Ja | Visuelle Stichprobe nach Deployment |
| Mobile UX | OK | Browser-Spotcheck ohne Horizontal-Overflow auf zuletzt geänderten Seiten | Hoch | Mobile CTA-Zeile auf Kostenseiten umbruchfähig gemacht | Ja | Geräteprüfung auf echten Smartphones |
| Performance/Build | OK | Build erfolgreich; nur Browserslist-Daten veraltet | Mittel | Keine funktionale Änderung nötig | Nein | `caniuse-lite` später aktualisieren |
| Branchen/Bezirke/Tools | Bedingt OK | Keine kritischen Links/Preise/Garantien; einige Seiten sind dünn | Mittel | Keine Massen-Noindex-/Redirect-Entscheidung getroffen | Nein | Inhalte priorisiert ausbauen |
| Thin Content | Offen | `/branchen`, `/referenzen`, `/referenzen/zur-alten-backstube`, `/webdesign-blumenladen/kosten`, `/webdesign-cafe/kosten` unter 450 Wörtern | Mittel | Dokumentiert, nicht pauschal noindex gesetzt | Nein | Ausbau, Zusammenführung oder Noindex manuell entscheiden |
| Rechtstexte | Manuell | Impressum und Datenschutzerklärung wurden nicht inhaltlich/rechtlich verändert | Hoch | Nur als manuelle Prüfung markiert | Nein | Rechtliche Prüfung vor Veröffentlichung |
| Produktion | Manuell | Lokale QA ersetzt keine Prüfung von Env, E-Mail, Captcha, Analytics und Consent in Produktion | Hoch | Tests lokal bestanden | Nein | Produktions-Smoke-Test vor Go-live |

## Verifikation

- `npm test`: **264/264 Tests bestanden**
- `npm run build`: **bestanden**
- Finaler Sitemap-Crawl:
  - 118 Sitemap-Seiten geprüft
  - 130 interne Ziele geprüft
  - 0 Seitenstatus-/H1-/Meta-/Canonical-Fehler
  - 0 JSON-LD-/Schemafehler
  - 0 kaputte interne Links
  - 0 kritische Preis-, Paket-, Garantie- oder Rechtsversprechen-Treffer
  - 1 sicherer Hinweis-Treffer: `kein 24/7-Notfallbetrieb`
- Browser-Spotcheck:
  - `/webdesign-cafe/kosten`
  - `/webdesign-blumenladen/kosten`
  - `/zusatzleistungen-webdesign`
  - jeweils genau eine H1, Canonical vorhanden, kein Horizontal-Overflow im mobilen Viewport

## Geänderte Dateien In Phase 15

- `util/legacyPublicCopy.js`
- `controllers/blogController.js`
- `controllers/ratgeberController.js`
- `controllers/faqController.js`
- `controllers/chatController.js`
- `controllers/newsletterController.js`
- `routes/staticPages.js`
- `views/partials/footer.ejs`
- `views/packages_list.ejs`
- `views/bereiche/webdesign-berlin.ejs`
- `views/static/zusatzleistungen-webdesign.ejs`
- `views/static/kosten/webdesign-cafe.ejs`
- `views/static/kosten/webdesign-blumenladen.ejs`

## Offene Folgeaufgaben

1. Produktions-Smoke-Test: Kontaktformular, E-Mail-Versand, Terminbuchung, Auto-Slots, Captcha, Consent und Tracking.
2. Rechtstexte manuell prüfen lassen; keine automatische rechtliche Bewertung aus dieser QA ableiten.
3. Dünne Seiten redaktionell ausbauen oder bewusst noindex/zusammenführen.
4. DB-/CMS-Altinhalte dauerhaft redaktionell aktualisieren, damit der Runtime-Sanitizer langfristig weniger abfangen muss.
5. Search Console: Sitemap nach Launch einreichen und Coverage/Indexierung beobachten.
6. Browserslist-Daten bei Gelegenheit aktualisieren.
