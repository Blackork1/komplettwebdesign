# 28-Tage-Auswertung für Reichweite und Anfragen

Stand: 26. Juli 2026

## Ziel

Diese Auswertung prüft, ob die veröffentlichten Optimierungen mehr organische Reichweite, qualifizierte Website-Besuche und echte Anfragen erzeugen. GA4 ist dafür nicht erforderlich.

`D0` bezeichnet den späteren Veröffentlichungstag. Alle Prüftermine werden erst ab diesem Datum berechnet:

- `D0`: Veröffentlichung und Live-Prüfung
- `D7`: erste Tendenz
- `D14`: belastbarere Zwischenprüfung
- `D28`: erste vollständige Entscheidung

## Benötigte Daten

### Google Search Console

Für jeden Termin werden die letzten 7 beziehungsweise 28 Tage exportiert:

- Seiten,
- Suchanfragen,
- Klicks,
- Impressionen,
- Klickrate,
- durchschnittliche Position,
- Indexierungsstatus der 14 Kernseiten.

Am Tag vor der Veröffentlichung wird zusätzlich ein unveränderter 28-Tage-Ausgangsexport gespeichert. So bleibt nachvollziehbar, welche Werte vor der Änderung bestanden.

### Echte Anfragen

Zusätzlich werden nur tatsächlich eingegangene Kontakte gezählt:

- Schnellanfragen,
- ausführliche Projektanfragen,
- direkte E-Mails mit erkennbarem Website-Bezug,
- qualifizierte Rückmeldungen auf Referenz-, Bewertungs- oder Partnerarbeit.

Spam, Tests und eigene Probeversendungen werden nicht gezählt.

## Zu prüfende Kernseiten

| Seitengruppe | URLs |
| --- | --- |
| Einstieg | `/`, `/webdesign-berlin`, `/pakete`, `/leistungen` |
| Konkreter Bedarf | `/leistungen/website-relaunch`, `/leistungen/website-audit`, `/leistungen/local-seo`, `/leistungen/website-wartung` |
| Zielgruppen | `/branchen`, `/branchen/webdesign-blumenladen`, `/branchen/webdesign-immobilienmakler` |
| Vertrauen und Handlung | `/referenzen`, `/website-tester`, `/kontakt` |

## Ausgangswert an D0

Vor der Veröffentlichung wird diese Tabelle mit dem Search-Console-Export der vorherigen 28 Tage ausgefüllt:

| Kennzahl | Vorherige 28 Tage |
| --- | ---: |
| Organische Klicks |  |
| Organische Impressionen |  |
| Klickrate |  |
| Suchanfragen mit mindestens einer Impression |  |
| Indexierte Kernseiten von 14 |  |
| Echte Anfragen |  |

Zusätzlich wird pro Kernseite festgehalten:

| URL | Klicks | Impressionen | Klickrate | Position | Indexiert? |
| --- | ---: | ---: | ---: | ---: | --- |
| `/` |  |  |  |  |  |
| `/webdesign-berlin` |  |  |  |  |  |
| `/pakete` |  |  |  |  |  |
| `/leistungen` |  |  |  |  |  |
| übrige zehn Kernseiten | getrennt im Export | getrennt im Export | getrennt im Export | getrennt im Export | getrennt prüfen |

## Prüfung an D7

Nach sieben Tagen werden keine vorschnellen Rankingentscheidungen getroffen. Geprüft wird:

- Sind alle 14 Kernseiten erreichbar und indexierbar?
- Hat Google die aktualisierten Titel und Inhalte bereits erneut gecrawlt?
- Entstehen wieder Impressionen für passende Suchanfragen?
- Gibt es Seiten mit 0 Impressionen trotz bestätigter Indexierung?
- Sind technische Live-Fehler, Formularfehler oder Weiterleitungsketten aufgetreten?
- Wurden die vorgesehenen vorhandenen Inhalte tatsächlich verteilt?

Sofortmaßnahme nur bei einem klaren technischen Problem:

| Befund | Maßnahme |
| --- | --- |
| wichtige Seite nicht indexierbar | Canonical, Robots, Statuscode und Sitemap sofort prüfen |
| alte URL endet auf Fehlerseite | Weiterleitung gezielt ergänzen |
| Bilder oder CSS fehlen | Asset-Auslieferung korrigieren |
| Formular funktioniert nicht | Kontaktweg sofort reparieren |
| Seite indexiert, aber noch ohne Impressionen | noch nicht umschreiben; bis D14 beobachten und interne Unterstützung prüfen |

## Prüfung an D14

Nach 14 Tagen werden Seiten und Suchanfragen miteinander verglichen:

| Muster | Bedeutung | Nächste Maßnahme |
| --- | --- | --- |
| Impressionen steigen, Klicks steigen | Thema und Darstellung gewinnen Sichtbarkeit | Seite stabil lassen und weiter intern beziehungsweise extern unterstützen |
| Impressionen steigen, Klickrate schwach | Google zeigt die Seite, aber das Suchergebnis überzeugt zu wenig | Titel und Beschreibung anhand der tatsächlichen Suchanfragen nachschärfen |
| Position verbessert sich, Impressionen bleiben gering | Suchthema ist eng oder Nachfrage gering | Seite nicht künstlich aufblasen; passende interne Links und reale Verteilung prüfen |
| Impressionen vorhanden, falsche Suchanfragen | Suchintention ist noch unscharf | Überschrift, Einleitung und interne Ankertexte präzisieren |
| Keine Impressionen trotz Indexierung | Seite bekommt zu wenig Relevanzsignale oder Suchbedarf ist gering | interne Links, Sitemap, inhaltliche Vollständigkeit und reale Nachfrage prüfen |
| Klicks vorhanden, keine Anfrage | erst dann Conversion prüfen | CTA, Vertrauensbelege, Preisverständlichkeit und Formularweg untersuchen |

## Entscheidung an D28

An Tag 28 wird jede Kernseite einer von vier Kategorien zugeordnet:

1. **Beibehalten:** Impressionen und Klicks entwickeln sich positiv.
2. **Snippet verbessern:** Impressionen sind vorhanden, die Klickrate ist schwach.
3. **Inhalt erweitern:** passende Suchanfragen zeigen eine klar erkennbare unbeantwortete Frage.
4. **Technisch oder intern stärken:** Seite ist relevant, erhält aber zu wenig interne beziehungsweise externe Unterstützung.

Eine neue Seite wird nur empfohlen, wenn alle folgenden Punkte erfüllt sind:

- eine eigenständige Suchintention ist in den Suchanfragen erkennbar,
- keine vorhandene Seite beantwortet diese Absicht sauber,
- eine Erweiterung der passenden Bestandsseite würde die Themen vermischen,
- es gibt genug echte Substanz für eine nützliche Seite,
- die neue Seite kann sinnvoll in die vorhandene Navigation und interne Verlinkung eingeordnet werden.

## 28-Tage-Ergebnistabelle

| Kennzahl | D0-Ausgangswert | D7 | D14 | D28 | Veränderung D0 zu D28 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Organische Klicks |  |  |  |  |  |
| Organische Impressionen |  |  |  |  |  |
| Klickrate |  |  |  |  |  |
| Suchanfragen mit Impressionen |  |  |  |  |  |
| Indexierte Kernseiten von 14 |  |  |  |  |  |
| Echte Anfragen |  |  |  |  |  |

## Seitenbezogene Entscheidung

| URL | wichtigste Suchanfragen | D28-Befund | Entscheidung | konkrete nächste Änderung |
| --- | --- | --- | --- | --- |
| `/` |  |  |  |  |
| `/webdesign-berlin` |  |  |  |  |
| `/pakete` |  |  |  |  |
| `/leistungen` |  |  |  |  |
| `/leistungen/website-relaunch` |  |  |  |  |
| `/leistungen/website-audit` |  |  |  |  |
| `/leistungen/local-seo` |  |  |  |  |
| `/leistungen/website-wartung` |  |  |  |  |
| `/branchen` |  |  |  |  |
| `/branchen/webdesign-blumenladen` |  |  |  |  |
| `/branchen/webdesign-immobilienmakler` |  |  |  |  |
| `/referenzen` |  |  |  |  |
| `/website-tester` |  |  |  |  |
| `/kontakt` |  |  |  |  |

## Bewertungsgrundsatz

Eine Woche ohne sofortigen starken Rankinganstieg bedeutet nicht automatisch, dass die Umsetzung falsch ist. Entscheidend ist die Entwicklung von Indexierung, Impressionen, passenden Suchanfragen, Klicks und echten Anfragen über den vollständigen Zeitraum. Technische Fehler werden sofort behoben; inhaltliche Änderungen werden datenbasiert vorgenommen.
