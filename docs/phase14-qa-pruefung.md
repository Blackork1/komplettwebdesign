# QA nach Phase 14: Branchen-, Bezirks-, Tool- und Local-SEO-Unterseiten

Stand: 2026-06-02

Geprüfter gerenderter Umfang auf `http://127.0.0.1:3000`:

- 1 Branchen-Hub
- 16 Branchen-Detailseiten
- 6 deutsche Bezirksseiten
- 6 englische Bezirksseiten
- 10 Website-Tester-/Toolseiten
- 8 Local-SEO-/Support-Landingpages
- 2 lokale Kosten-Unterseiten

Zusätzlich geprüft: Sitemap, interne Links aus diesen Seiten, Meta-Daten, H1, Canonicals, FAQPage-/Breadcrumb-/Service-Schema und alte Preis-/Paketlogik.

## Ergebnisübersicht

| Bereich | URL | Status | Problem | Risiko | Priorität | empfohlene Maßnahme | direkt korrigiert ja/nein | Folgeaufgabe ja/nein |
|---|---|---|---|---|---|---|---|---|
| Inventar | alle geprüften Phase-14-Seiten | ok | 49 relevante Seiten erfasst und typisiert. Dynamische Branchenroute, Bezirksroute, Leistungsroute und Sitemap-Policy erkannt. | niedrig | niedrig | Inventar aus Phase 14 beibehalten. | nein | nein |
| Branchen-Hub | `/branchen` | ok mit Ausbaupotenzial | Hub ist erreichbar, hat 1 H1, keine Altpreise und keine Garantien, aber nur ca. 283 Wörter. | mittel | mittel | Später als stärkere Branchen-Navigation ausbauen; keine Schnell-Noindex-Entscheidung. | nein | ja |
| Branchen-Detailseiten | `/branchen/webdesign-*` | korrigiert | Mehrere Branchen-FAQs enthielten noch alte 499-Euro-Preisantworten im sichtbaren FAQ und JSON-LD. | hoch | hoch | Zentrale Legacy-Copy-Bereinigung um FAQ-Preisvarianten erweitert. | ja | ja, DB-Inhalte dauerhaft migrieren |
| Branchen-Detailseiten | 16 verlinkte Branchen | ok | Alle verlinkten Branchen-Detailseiten liefern 200, haben genau eine H1, individuelle Titles/Descriptions und Schema. | niedrig | niedrig | Behalten; weitere Branchen erst nach Einzelprüfung in Sitemap priorisieren. | nein | ja |
| Nicht priorisierte Branchen | 11 Branchen-Seiten | ok, bewusst nicht in Sitemap | Seiten sind intern erreichbar, aber nicht alle in der Sitemap. | mittel | mittel | Erst nach Einzeloptimierung in Sitemap aufnehmen. | nein | ja |
| Priorisierte Branchen | Café, Restaurant, Immobilienmakler, Reinigung, Blumenladen | ok | Hochwertige Local-SEO-Intents sind in Sitemap enthalten. | niedrig | niedrig | Als nächste Einzeloptimierungen priorisieren. | nein | ja |
| Deutsche Bezirksseiten | `/webdesign-berlin/{bezirk}` | ok | 6 Seiten, 200, 1 H1, ca. 1.100 Wörter, 3 JSON-LD-Blöcke. Duplicate-Risiko durch ähnliche Struktur bleibt. | mittel | mittel | Lokale Einzigartigkeit später je Bezirk ausbauen. | nein | ja |
| Englische Bezirksseiten | `/en/webdesign-berlin/{district}` | grenzwertig | 6 Seiten, 200, 1 H1, aber nur ca. 700 Wörter und weniger strukturierte Daten. | mittel | hoch | Ausbauen oder Indexierungsstrategie prüfen; keine Massen-Noindex-Änderung ohne Freigabe. | nein | ja |
| Toolseiten | `/website-tester*`, `/en/website-tester*` | ok | 10 Seiten, 200, 1 H1, keine Altpreise/Garantien; Website-Audit ist verlinkt. | niedrig | niedrig | Behalten; Sitemap-Priorität später optional feinjustieren. | nein | nein |
| Toolseiten-Abgrenzung | Website-Tester vs. Website-Audit | ok | Kein vollständiger Rechts-/SEO-/Audit-Check als Garantie im Crawl gefunden. | niedrig | niedrig | Weiterhin vorsichtig formulieren. | nein | nein |
| Local-SEO-Unterseiten | `/local-seo-berlin`, `/website-audit`, `/website-relaunch-berlin`, `/landingpage-erstellen-lassen`, weitere | ok | 200, 1 H1, individuelle Meta-Daten, keine Garantien, klare CTAs. | niedrig | niedrig | Behalten. | nein | nein |
| Lokale Kosten-Unterseiten | `/webdesign-cafe/kosten`, `/webdesign-blumenladen/kosten` | dünn | Beide Seiten haben ca. 370 Wörter und überschneiden sich potenziell mit Branchen- und Preislogik. | mittel | mittel | Später zusammenführen, ausbauen oder Canonical-/Noindex-Strategie prüfen. | nein | ja |
| Alte Preislogik | 49 geprüfte Seiten | korrigiert | Nach Korrektur keine Treffer mehr für 499 €, 899 €, Premium 1.499 €, Wartung ab 5 €, Basis-/Premium-Paket oder alte Paketlinks. | hoch | hoch | Runtime-Guard beibehalten, DB sauber migrieren. | ja | ja |
| Neue Angebotslogik | Branchen/Bezirke/Tools | ok | Neue Paketlinks und Preise werden genutzt: Start ab 799 €, Business ab 1.499 €, Wachstum ab 2.499 €. | niedrig | niedrig | Beibehalten. | nein | nein |
| Rechtliche Vorsicht | alle geprüften Seiten | ok | Keine Treffer für rechtssicher, rechtlich abgesichert, DSGVO-konform, Ranking-Garantie, Local-SEO-Garantie, garantierte Kunden/Anfragen. | niedrig | niedrig | Beibehalten; Rechtstexte nicht automatisch ändern. | nein | nein |
| Strukturierte Daten | Branchen/Bezirke/Tools | ok | Kein AggregateRating, keine Review-Schema-Fundstellen, keine erfundenen Öffnungszeiten im Crawl. FAQPage ist auf sichtbare FAQ ausgerichtet. | niedrig | niedrig | Bei späterer DB-Migration erneut prüfen. | nein | ja |
| Meta-Daten | alle geprüften Seiten | ok | Keine doppelten Titles, Meta Descriptions oder H1s im geprüften Set. | niedrig | niedrig | Beibehalten. | nein | nein |
| Canonicals | alle geprüften Seiten | ok | Canonicals vorhanden und passend im gerenderten HTML geprüft. | niedrig | niedrig | Beibehalten. | nein | nein |
| Sitemap | `/sitemap.xml` | ok | Sitemap erreichbar; keine alten Paketlinks; hochwertige/priorisierte Seiten enthalten. | niedrig | niedrig | EN-Bezirke und dünne Kosten-Seiten später strategisch prüfen. | nein | ja |
| Interne Links | Links aus 49 Seiten | ok | Keine kaputten internen Links im Scope gefunden. EN-Seiten verlinken sprachspezifisch auf `/en/webdesign-berlin`, `/en/pakete`, `/en/kontakt`. | niedrig | niedrig | Beibehalten. | nein | nein |
| Duplicate Content | geprüfte Titles/Descriptions/H1s | ok mit Content-Risiko | Keine identischen Titles, Descriptions oder H1s; inhaltliche Ähnlichkeit bei Bezirken bleibt möglich. | mittel | mittel | Später semantisch/inhaltlich je Bezirk vertiefen. | nein | ja |
| Thin Content | Hub, lokale Kosten-Seiten, EN-Bezirke | offen | `/branchen`, `/webdesign-cafe/kosten`, `/webdesign-blumenladen/kosten` dünn; EN-Bezirke grenzwertig. | mittel | mittel | Ausbau, Zusammenführung, Canonical oder Noindex nur nach manueller Freigabe entscheiden. | nein | ja |
| Priorisierung | Phase-14-Report | ok | Top-10-Liste, Zusammenführungs-/Redirect-/Noindex-Kandidaten und Einzeloptimierungs-Prompts sind dokumentiert. | niedrig | niedrig | Report als Grundlage für Einzelphasen nutzen. | nein | nein |

## Direkt korrigiert

| Fundstelle | Problem | Korrektur |
|---|---|---|
| Branchen-FAQ-Antworten aus DB-Inhalten | Alte Formulierungen wie `Zwischen 499 € ... 1.499 €` wurden sichtbar und in FAQPage-JSON-LD ausgespielt. | `normalizeLegacyPublicCopy` ersetzt diese Varianten jetzt durch `Start ab 799 €, Business ab 1.499 € und Wachstum ab 2.499 €; Zusatzleistungen werden separat eingeordnet.` |

## Verifikation

| Prüfung | Ergebnis |
|---|---|
| Gerenderter Altpreis-Crawl über 49 URLs | keine Treffer nach Korrektur |
| Interne Linkprüfung im Scope | keine 4xx-Links gefunden |
| Duplicate Title/Description/H1 | keine Treffer |
| Rechtlich riskante Suchmuster | keine Treffer |
| Strukturierte Daten Risiko-Suche | kein AggregateRating, kein Review-Schema, keine falschen Öffnungszeiten-Treffer |
| Tests | `npm test` erfolgreich, 264/264 bestanden |
