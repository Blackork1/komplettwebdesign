# Phase 14 XL: Branchen-, Bezirks- und Local-SEO-Audit

Stand: 2026-06-02

Scope: vorhandene Branchen-, Bezirks-, Local-SEO-, Tool- und unterstützende Seiten. Es wurden keine neuen Massen-Landingpages erstellt und keine Redirect-/Noindex-Entscheidungen ohne Folgekonzept umgesetzt.

## Direkt umgesetzte Korrekturen

| Bereich | Status | Problem | Priorität | direkte Korrektur |
|---|---|---|---|---|
| Branchen- und Leistungsseiten aus DB-Inhalten | korrigiert | In dynamischen Inhalten konnten alte Preisanker, alte Paketnamen und riskante Formulierungen öffentlich ausgespielt werden. | hoch | Zentrale öffentliche Copy-Bereinigung vor dem Rendern ergänzt. |
| Branchen-Übersicht | korrigiert | `/branchen` war eine relevante Hub-Seite, aber nicht in der statischen Sitemap-Policy enthalten. | mittel | `/branchen` in die indexierbare Sitemap-Policy aufgenommen. |
| Priorisierte Branchen | korrigiert | `reinigung` und `blumenladen` sind vorhanden und intern verlinkt, waren aber nicht als geprüfte Branchen in der Sitemap-Policy priorisiert. | mittel | Beide Slugs als geprüfte Prioritätsbranchen ergänzt. |
| Sitemap-Tests | korrigiert | Test-Erwartung passte nicht mehr zur erweiterten Sitemap-Policy. | mittel | SEO-Policy-Test aktualisiert; `npm test` besteht mit 264/264 Tests. |

## Zusammenfassung

| Kategorie | geprüft | Status | Hauptrisiko | direkt korrigiert | Folgeaufgabe |
|---|---:|---|---|---|---|
| Branchen-Hub | 1 | ok | Hub-Positionierung und Sitemap-Abdeckung | ja | Hub später stärker als Branchen-Navigation ausbauen. |
| Branchen-Detailseiten | 16 verlinkte Seiten | überwiegend ok | DB-Alttexte, Template-Dopplung, Branchen-Einzigartigkeit | ja, kritische öffentliche Altlogik | Einzeloptimierung pro priorisierter Branche. |
| Bezirksseiten DE | 6 | ok mit mittlerem Risiko | ähnliche Struktur und ähnliche Abschnitte je Bezirk | nein | Einzigartigkeit je Bezirk weiter erhöhen. |
| Bezirksseiten EN | 6 | Folgeaufgabe | dünner und generischer als DE-Seiten | nein | Ausbauen oder Indexierungsstrategie prüfen. |
| Toolseiten | 10 DE/EN Tool-URLs | ok | hohe Sitemap-Priorität gegenüber Geldseiten prüfen | nein | Prioritäten und interne Funnel-Links später feinjustieren. |
| Local-SEO-/Support-Seiten | mehrere | ok | Überschneidung zwischen Audit, Local SEO, Relaunch und Zusatzleistungen | teilweise | Interne Linkführung weiter schärfen. |
| Interne Kontextdatei | 1 | kritisch intern | alte 499-/899-/Premium-Logik kann künftige Arbeit verfälschen | nein | `.agents/product-marketing-context.md` aktualisieren. |

## Seiteninventar

| URL / Muster | Typ | Status | Canonical/Indexierung | Problem | Priorität | Empfehlung |
|---|---|---|---|---|---|---|
| `/branchen` | Branchen-Hub | ok | indexierbar, Sitemap ergänzt | Vorher nicht in der statischen Sitemap-Policy. | mittel | Behalten, später IA und Branchenfilter verbessern. |
| `/branchen/webdesign-cafe` | Branche | korrigiert | indexierbar, Sitemap | Alte Preislogik und günstige Einstiegslogik in DB-Inhalt möglich. | hoch | Behalten, als priorisierte Branchen-Seite einzeln optimieren. |
| `/branchen/webdesign-restaurant` | Branche | korrigiert | indexierbar, Sitemap | Alte Paketlogik und 24/7-nahe Formulierungen möglich. | hoch | Behalten, Reservierung/Buchung strikt als Zusatzleistung führen. |
| `/branchen/webdesign-immobilienmakler` | Branche | korrigiert | indexierbar, Sitemap | Alte Premium-/Preislogik möglich. | hoch | Behalten, Lead-/Exposé-/Referenzlogik vorsichtig weiter ausbauen. |
| `/branchen/webdesign-reinigung` | Branche | korrigiert | indexierbar, Sitemap ergänzt | Datenschutz-/Garantieformulierungen möglich. | hoch | Behalten, als Ersatz für fehlendes `reinigungsfirma` prüfen. |
| `/branchen/webdesign-blumenladen` | Branche | korrigiert | indexierbar, Sitemap ergänzt | Alter 499-Euro-Titel/Preisanker möglich. | hoch | Behalten, lokale Floristik-Intent-Seite weiter ausbauen. |
| `/branchen/webdesign-arzt` | Branche | ok nach Bereinigung | indexierbar, nicht priorisiert | Medizin-/Datenschutzformulierungen besonders vorsichtig halten. | mittel | Vor Sitemap-Ausbau einzeln prüfen. |
| `/branchen/webdesign-autowerkstatt` | Branche | ok | indexierbar, nicht priorisiert | Template-Ähnlichkeit zu anderen Branchen. | mittel | Bei Potenzial einzeln optimieren. |
| `/branchen/webdesign-beautysalon` | Branche | ok nach Bereinigung | indexierbar, nicht priorisiert | Datenschutz-/Toolkosten vorsichtig halten. | mittel | Vor Sitemap-Ausbau einzeln prüfen. |
| `/branchen/webdesign-fitnesscoach` | Branche | ok nach Bereinigung | indexierbar, nicht priorisiert | Datenschutz-/Erfolgsversprechen vermeiden. | mittel | Später mit Local-SEO-Fokus optimieren. |
| `/branchen/webdesign-fotograf` | Branche | ok | indexierbar, nicht priorisiert | Template-Ähnlichkeit. | niedrig | Behalten, erst nach Prioritätsbranchen ausbauen. |
| `/branchen/webdesign-friseur` | Branche | ok | indexierbar, nicht priorisiert | Buchung/Termine klar als Zusatzleistung. | mittel | Später mit Terminbuchungs-Abgrenzung optimieren. |
| `/branchen/webdesign-hebamme` | Branche | ok | indexierbar, nicht priorisiert | Sensible Zielgruppe; keine Rechts-/Gesundheitsgarantien. | mittel | Manuell textlich prüfen, bevor stärker verlinkt. |
| `/branchen/webdesign-physiotherapie` | Branche | ok nach Bereinigung | indexierbar, nicht priorisiert | Gesundheits-/Datenschutzformulierungen. | mittel | Vor Sitemap-Ausbau einzeln prüfen. |
| `/branchen/webdesign-steuerberater` | Branche | ok nach Bereinigung | indexierbar, nicht priorisiert | Recht/Steuern besonders vorsichtig abgrenzen. | mittel | Manuell prüfen. |
| `/branchen/webdesign-tattoo` | Branche | ok | indexierbar, nicht priorisiert | Bild-/Referenzlogik und Buchung als Zusatzleistung abgrenzen. | niedrig | Nach Hauptbranchen prüfen. |
| `/branchen/webdesign-wellness` | Branche | ok nach Bereinigung | indexierbar, nicht priorisiert | Erfolgs-/Datenschutzversprechen vermeiden. | mittel | Später optimieren. |
| `/branchen/webdesign-handwerker` | Branche | nicht vorhanden | nicht in Sitemap ausgespielt, da keine DB-Seite | In der Policy als Priorität vorbereitet, aber keine Seite gefunden. | mittel | Entweder echte Seite erstellen oder Policy später bereinigen. |
| `/branchen/webdesign-reinigungsfirma` | Branche | nicht vorhanden | nicht in Sitemap ausgespielt, da keine DB-Seite | Intent überschneidet sich mit `/branchen/webdesign-reinigung`. | mittel | Wenn externe Links existieren, Redirect-Konzept zu `reinigung` prüfen. |
| `/webdesign-berlin/{bezirk}` | Bezirke DE | ok | indexierbar, Sitemap für 6 Bezirke | Wiederkehrende Struktur kann Duplicate-Risiko erzeugen. | mittel | Bezirksspezifische Belege, Bilder und interne Links ergänzen. |
| `/en/webdesign-berlin/{district}` | Bezirke EN | Folgeaufgabe | indexierbar, Sitemap für 6 Bezirke | Dünner/generischer als DE-Versionen. | hoch | Ausbauen oder Indexierungsstrategie prüfen. |
| `/local-seo-berlin` | Local SEO | ok | indexierbar, Sitemap | Überschneidet sich mit Branchen-/Bezirkslogik. | mittel | Als zentrale erklärende Seite beibehalten. |
| `/website-audit` | Tool-/Audit-Seite | ok | indexierbar, Sitemap | Abgrenzung Schnellcheck vs. Audit kritisch. | niedrig | Beibehalten. |
| `/website-tester` und Untertools | Toolseiten | ok | indexierbar, Sitemap | Toolseiten haben hohe Priorität; Funnel prüfen. | mittel | Priorität und Conversion-Linking später feinjustieren. |
| `/website-relaunch-berlin` | Support/SEO-Landing | ok | indexierbar, Sitemap | Keine Ranking-Erhalt-Garantie zulassen. | niedrig | Beibehalten. |
| `/landingpage-erstellen-lassen` | Support/SEO-Landing | ok | indexierbar, Sitemap | Keine Conversion-/Lead-Garantie zulassen. | niedrig | Beibehalten. |
| `/zusatzleistungen-webdesign` | Support | ok | indexierbar, Sitemap | Add-ons müssen klar getrennt bleiben. | niedrig | Beibehalten. |
| `/laufende-kosten-website` | Support | ok | indexierbar, Sitemap | Laufende Kosten klar getrennt halten. | niedrig | Beibehalten. |
| `/website-wartung-berlin` | Support | ok | indexierbar, Sitemap | Keine 24/7- oder Soforthilfe-Garantie. | niedrig | Beibehalten. |

## Alte Preisanker und Paketlogik

| Bereich | Fundstelle | Status | Problem | Priorität | direkt korrigiert | Folgephase |
|---|---|---|---|---|---|---|
| Branchen-Hub/Branchen-DB | gerenderte DB-Inhalte | korrigiert | Alte 499-/899-/Premium-Logik konnte sichtbar werden. | hoch | ja | DB-Migration statt Render-Fallback. |
| Café-Branche | `/branchen/webdesign-cafe` | korrigiert | Alter Preisanker in Title/Copy möglich. | hoch | ja | Einzeloptimierung Branche Café. |
| Restaurant-Branche | `/branchen/webdesign-restaurant` | korrigiert | Alte Preislogik und Buchungsversprechen möglich. | hoch | ja | Einzeloptimierung Restaurant. |
| Immobilienmakler-Branche | `/branchen/webdesign-immobilienmakler` | korrigiert | Premium-Altlogik möglich. | hoch | ja | Einzeloptimierung Immobilienmakler. |
| Leistungsseiten aus DB | `/webdesign-berlin/:slug` | korrigiert | Alte Preise und rechtliche Formulierungen aus DB-Content möglich. | hoch | ja | DB-Inhalte dauerhaft bereinigen. |
| Interne Kontextdatei | `.agents/product-marketing-context.md` | offen | Alte Paketlogik bleibt intern dokumentiert. | hoch intern | nein | Sofortige Kontextaktualisierung vor weiteren Prompt-Phasen. |

## Rechtlich und kommunikativ riskante Aussagen

| Bereich | Fundstelle | Status | Risiko | direkt korrigiert | manuelle Prüfung |
|---|---|---|---|---|---|
| Branchen-DB | mehrere Branchen mit Datenschutz-/Garantiebezug | korrigiert | Uneingeschränkte Datenschutz- oder Erfolgsaussagen. | ja | nein |
| Leistungsseiten-DB | besonders rechtliche/Sicherheitsseiten | korrigiert | Rechtliche Sicherheit als Versprechen. | ja | ja, falls DB-Text dauerhaft umgeschrieben wird |
| Strukturierte Daten Branchen | `helpers/industrySchema.js` | ok | Keine Offer-/AggregateRating-Falschdaten festgestellt. | nein | nein |
| Rechtstexte | Impressum/Datenschutz | nicht geändert | Prompt untersagt juristische Umformulierung ohne manuelle Prüfung. | nein | ja |
| Alte statische Bezirks-Templates | `views/bereiche/webdesign-berlin-*.ejs` | Folgeaufgabe | Teilweise ältere Text- und Stilreste; aktuell nicht Hauptfund kritischer Altpreise. | nein | bei Wiederverwendung prüfen |

## Duplicate-, Thin-Content- und Doorway-Risiko

| Bereich | Status | Risiko | Begründung | Priorität | Empfehlung |
|---|---|---|---|---|---|
| Branchen-Detailseiten | mittel | Template-Ähnlichkeit | Viele Seiten nutzen ähnliche Angebotslogik und Struktur. | mittel | Nur priorisierte Branchen weiter indexstark ausbauen. |
| Branchen-Hub | niedrig | keine Doorway-Seite | Hub bündelt vorhandene Seiten sinnvoll. | niedrig | Behalten. |
| DE-Bezirksseiten | mittel | ähnliche Bezirksseiten | Je Bezirk echte Berlin-Intention, aber ähnlicher Aufbau. | mittel | Mehr individuelle lokale Beispiele, Bilder und interne Links. |
| EN-Bezirksseiten | hoch | Thin-/Duplicate-Risiko | Kürzer und generischer als DE-Seiten, weniger Schema/FAQ. | hoch | Ausbauen oder Indexierungsentscheidung treffen. |
| Kosten-Spezialseiten Café/Blumenladen | mittel | Überschneidung mit Preis-/Branchenlogik | Kleine statische Preis-Seiten können mit Branchen-Seiten konkurrieren. | mittel | Später zusammenführen, stärker differenzieren oder Canonical prüfen. |
| Toolseiten | niedrig | eigenständige Funktion | Tool-Intent ist klar unterscheidbar. | niedrig | Behalten. |

## Lokale und branchenspezifische Relevanz

| Seite/Gruppe | Status | lokale Relevanz | Branchenrelevanz | Problem | Empfehlung |
|---|---|---|---|---|---|
| `/local-seo-berlin` | ok | hoch | mittel | Zentrale Local-SEO-Erklärung statt Branchen-Fokus. | Als Referenzseite für Branchen verlinken. |
| `/webdesign-berlin` | ok | hoch | allgemein | Hauptseite darf Branchen nicht ersetzen. | Als zentrale Webdesign-Hub-Seite behalten. |
| Café, Restaurant, Reinigung, Blumenladen, Immobilienmakler | gut | hoch | hoch | Hohe KMU-/Local-SEO-Passung. | Priorisiert einzeln optimieren. |
| Gesundheitsnahe Branchen | vorsichtig | mittel bis hoch | hoch | Datenschutz, sensible Aussagen, keine medizinischen Garantien. | Vor stärkerer Index-Priorisierung manuell prüfen. |
| Bezirke DE | gut | hoch | allgemein | Lokale Details weiter ausbauen. | Weiter behalten, aber nicht massenhaft neue Bezirke erzeugen. |
| Bezirke EN | schwach bis mittel | mittel | allgemein | Inhaltlich dünner. | Ausbauen oder strategisch reduzieren. |

## Interne Verlinkung

| Bereich | Status | Problem | Priorität | Empfehlung |
|---|---|---|---|---|
| Branchen-Hub zu Branchen-Details | ok | Alle verlinkten Branchen-Detailseiten liefern 200. | niedrig | Beibehalten. |
| Sitemap vs. Branchen-Hub | bewusst selektiv | Nicht jede verlinkte Branche ist priorisiert in der Sitemap. | mittel | Erst nach Einzelprüfung weitere Branchen in Sitemap aufnehmen. |
| Alte Paketlinks | ok | `/pakete/basis` und `/pakete/premium` existieren nur als Redirects/Legacy-Hinweise. | niedrig | Keine neuen alten Links setzen. |
| Supportseiten | ok | Audit, Local SEO, Zusatzleistungen, Wartung und laufende Kosten sind vorhanden. | niedrig | Bei Einzeloptimierungen gezielter verlinken. |
| Fehlende Branchen-Slugs | offen | `handwerker` und `reinigungsfirma` als Policy-Ideen, aber keine DB-Seiten. | mittel | Keine Links auf fehlende Seiten setzen; später erstellen oder Policy bereinigen. |

## Sitemap, Indexierung und Canonicals

| Bereich | Status | Problem | direkt korrigiert | Empfehlung |
|---|---|---|---|---|
| Statische Seiten | ok | `/branchen` fehlte vorher in Policy. | ja | Beibehalten. |
| Branchen-Sitemap | ok, selektiv | Nur geprüfte/priorisierte Branchen werden aufgenommen. | ja | Keine Massenaufnahme ungeprüfter Branchen. |
| Bezirks-Sitemap DE/EN | ok mit Risiko | EN-Bezirke sind indexierbar, aber inhaltlich schwächer. | nein | EN-Seiten prüfen: ausbauen oder strategisch reduzieren. |
| Toolseiten | ok | Hohe Prioritäten im Verhältnis zu Hauptseiten. | nein | Prioritäten später prüfen. |
| Redirects | unverändert | Keine neuen halben Redirects erstellt. | nein | Externe Linkdaten prüfen, bevor Branchen-Redirects eingerichtet werden. |

## Strukturierte Daten

| Bereich | Status | Problem | Empfehlung |
|---|---|---|---|
| Branchen-Detailseiten | ok | WebPage, Service, BreadcrumbList und FAQPage ohne Offer/AggregateRating. | Beibehalten; FAQ nur mit sichtbaren FAQs. |
| Branchen-Hub | ok | Keine riskanten Bewertungsdaten festgestellt. | Beibehalten. |
| DE-Bezirksseiten | ok | ProfessionalService/FAQ-Logik vorhanden. | Inhalte und Schema je Bezirk weiter angleichen. |
| EN-Bezirksseiten | Folgeaufgabe | Weniger strukturierte Signale als DE. | Schema und Inhalt prüfen. |
| Toolseiten | ok | Keine erfundenen Bewertungen festgestellt. | Offer-/Free-Tool-Daten später im Rich-Result-Kontext prüfen. |

## Top-10-Priorisierung für spätere Optimierung

| Rang | Aufgabe | Nutzen | Risiko bei Nichtbeachtung |
|---:|---|---|---|
| 1 | `.agents/product-marketing-context.md` auf neue Preis- und Paketlogik aktualisieren. | Verhindert künftige Prompt-/KI-Fehler. | Alte 499-/899-Logik kommt wieder in Arbeitskontext. |
| 2 | Branchen-DB dauerhaft migrieren statt nur zur Laufzeit bereinigen. | Saubere Datenbasis. | Runtime-Fallback kaschiert Altbestand. |
| 3 | `/branchen/webdesign-cafe` einzeln optimieren. | Hoher lokaler KMU-Intent. | Konkurrenz durch generische Branchenkopie. |
| 4 | `/branchen/webdesign-restaurant` einzeln optimieren. | Hoher Buchungs-/Local-Intent. | Buchungssystem-Abgrenzung bleibt zu allgemein. |
| 5 | `/branchen/webdesign-reinigung` als kanonische Reinigungsseite stärken. | Besser als fehlendes `reinigungsfirma`. | Doppel-/Slug-Verwirrung. |
| 6 | `/branchen/webdesign-blumenladen` stärken. | Gute lokale Nische. | Preis-/Branchenpotenzial bleibt flach. |
| 7 | `/branchen/webdesign-immobilienmakler` ausbauen. | Hoher Wert pro Anfrage. | Lead-/Referenzlogik bleibt generisch. |
| 8 | EN-Bezirksseiten ausbauen oder Indexierungsstrategie ändern. | Vermeidet Thin-Content-Risiko. | Qualitätsrisiko im Index. |
| 9 | Kosten-Spezialseiten Café/Blumenladen gegen Branchen-Seiten abgrenzen. | Weniger Kannibalisierung. | Duplicate-/Intent-Überschneidung. |
| 10 | Toolseiten-Funnel und Sitemap-Prioritäten prüfen. | Bessere Conversion-Führung. | Tools dominieren Sitemap stärker als Geldseiten. |

## Zusammenführen, Noindex oder Redirect: Kandidaten

| Kandidat | aktueller Status | Empfehlung jetzt | spätere Entscheidung |
|---|---|---|---|
| `/branchen/webdesign-reinigungsfirma` | nicht vorhanden | kein Redirect ohne externe Linkdaten | Bei externen Links 301 auf `/branchen/webdesign-reinigung` prüfen. |
| `/branchen/webdesign-handwerker` | nicht vorhanden | keine neue Seite in Phase 14 | Entweder hochwertige Handwerker-Seite erstellen oder aus Policy entfernen. |
| EN-Bezirksseiten | vorhanden | nicht sofort noindex | Inhalt ausbauen oder noindex nach strategischer Entscheidung. |
| `/webdesign-cafe/kosten` | vorhanden | nicht sofort entfernen | Mit Café-Branche abgrenzen oder Canonical-/Merge-Plan erstellen. |
| `/webdesign-blumenladen/kosten` | vorhanden | nicht sofort entfernen | Mit Blumenladen-Branche abgrenzen oder Canonical-/Merge-Plan erstellen. |
| Alte statische Bezirks-Templates | vorhanden | nicht löschen | Nur bereinigen, wenn sie aktiv geroutet oder wiederverwendet werden. |

## EJS- und Datenstruktur-Empfehlung

| Thema | Status | Empfehlung |
|---|---|---|
| DB-Content | kritisch bereinigt, aber nicht migriert | Inhalte in der Datenbank dauerhaft auf neue Paket-/Preislogik bringen. |
| Runtime-Bereinigung | sinnvoll als Schutz | `normalizeLegacyPublicCopy` als temporären Guard behalten, bis Daten migriert sind. |
| Branchen-Datenmodell | ausbaufähig | Priorität, Intent, Local-Relevanz, Add-on-Grenzen und FAQ zentral pflegen. |
| Sitemap-Policy | verbessert | Policy bleibt selektiv; weitere Branchen erst nach Einzelprüfung aufnehmen. |
| Templates | grundsätzlich nutzbar | Keine Massen-Neuschreibung; wiederkehrende Branchen-Blöcke zentralisieren. |
| Tests | ok | Sitemap- und Sanitizer-Fälle bei DB-Migration erweitern. |

## Prompt-Vorlagen für Einzeloptimierungen

### Branche Café

```text
Prüfe und optimiere ausschließlich /branchen/webdesign-cafe. Stärke lokale Café-/Gastro-Relevanz, klare Angebotsstruktur, Bilder, Reservierung/Buchung als Zusatzleistung und vorsichtige SEO-Aussagen. Keine alten Preise, keine Buchungssysteme inklusive, keine Ranking- oder Umsatzgarantie. Gib Tabelle mit Fundstelle, Problem, Korrektur, direkt korrigiert.
```

### Branche Reinigung

```text
Prüfe und optimiere ausschließlich /branchen/webdesign-reinigung. Kläre Zielgruppe Reinigungsfirmen, Einsatzgebiete, Leistungsseiten, Kontaktwege und Local-SEO-Grundlage. Entscheide, ob /branchen/webdesign-reinigungsfirma später Redirect auf diese Seite braucht. Keine Garantien, keine Datenschutz- oder Rechtsgarantie.
```

### Branche Blumenladen

```text
Prüfe und optimiere ausschließlich /branchen/webdesign-blumenladen. Stärke Floristik, lokale Sichtbarkeit, Öffnungszeiten/Anfragewege, saisonale Angebote und klare Zusatzleistungsabgrenzung. Keine 499-Euro-Logik, kein Shop/Buchungssystem als Standardversprechen.
```

### Bezirksseiten EN

```text
Prüfe ausschließlich die englischen Bezirksseiten unter /en/webdesign-berlin/{district}. Bewerte Thin Content, Duplicate Content, lokale Relevanz, Canonical, Sitemap und Schema. Korrigiere nur sichere Meta-/Schema-/Linkfehler; dokumentiere, ob Ausbau oder noindex sinnvoller ist.
```

### Branchen-Hub

```text
Prüfe ausschließlich /branchen. Ziel: bessere Branchen-Navigation, klare Priorisierung, keine Doorway-Logik, keine alten Preise, sinnvolle Links zu Webdesign Berlin, Paketen, Local SEO und Kontakt. Keine neuen Branchen ohne echte Detailseite erstellen.
```

### Toolseiten-Funnel

```text
Prüfe ausschließlich /website-tester und die Tool-Unterseiten. Bewerte Sitemap-Priorität, CTA-Führung zu Kontakt, Audit, Local SEO und Paketen. Keine neuen Trackingdienste, keine personenbezogenen Trackingdaten, keine Vollaudit- oder Ranking-Garantie.
```

## Offene Folgeaufgaben

| Aufgabe | Phase / Bereich | Priorität |
|---|---|---|
| Interne `.agents/product-marketing-context.md` aktualisieren. | Kontextpflege | hoch |
| Branchen-DB-Inhalte migrieren und Runtime-Fallback später reduzieren. | Datenmigration | hoch |
| EN-Bezirksseiten strategisch prüfen. | Local SEO | hoch |
| `handwerker` und `reinigungsfirma` als fehlende Slugs entscheiden. | Branchen-IA | mittel |
| Priorisierte Branchen einzeln optimieren. | Branchen-SEO | mittel |
| Kosten-Spezialseiten mit Branchen-Seiten abgleichen. | Content-Architektur | mittel |
| Toolseiten-Sitemap-Prioritäten prüfen. | technische SEO | niedrig bis mittel |
| Strukturierte Daten nach DB-Migration erneut prüfen. | Schema | mittel |
