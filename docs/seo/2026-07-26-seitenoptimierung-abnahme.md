# Abnahme der Seitenoptimierung – Variante 2

Stand: 26. Juli 2026

## Aktueller Status

Die Umsetzung ist lokal auf dem Branch `codex/sichtbare-seitenoptimierung` fertiggestellt und geprüft. Sie wurde noch nicht mit `main` zusammengeführt, nicht zu GitHub übertragen und nicht auf dem Server veröffentlicht.

Lokale Vorschau: `http://localhost:3000`

Es wurden keine neuen öffentlichen Massenseiten angelegt. Optimiert wurden vorhandene Seiten, bestehende Inhalte, interne Verbindungen und Kontaktwege. Ergänzt wurden lokale Bilddateien, gemeinsame Komponenten, Tests und interne Dokumentation.

## Was genau verändert wurde

### 1. Bildsystem und Bildquellen

- Ein zentraler Bildkatalog ordnet den Seiten unterschiedliche, inhaltlich passende Bilder zu.
- Vorhandene eigene Projekt- und Designbilder werden weiterhin bevorzugt.
- Vier ergänzende Pexels-Bilder wurden lokal als komprimierte WebP-Dateien gespeichert. Es gibt keine externen Bild-Hotlinks.
- Jedes informative Bild erhält einen konkreten deutschen Alt-Text.
- Dekorative Icons behalten bewusst einen leeren Alt-Text, damit Screenreader sie überspringen.
- Quelle, Fotograf, Lizenzseite, Einsatzzweck und Alt-Text sind in `docs/media/bildquellen-und-alttexte.md` dokumentiert.
- Automatische Tests verhindern fehlende Quellen, fehlende Alt-Texte, doppelte Leitmotive und zu große Bilddateien.

Sinn: Besucher sollen anhand unterschiedlicher Motive schneller erkennen, ob es um Planung, Prüfung, Relaunch, Local SEO, Wartung, Floristik, Immobilien oder echte Referenzprojekte geht. Gleichzeitig bleiben Ladezeit und Barrierefreiheit kontrolliert.

### 2. Startseite

- Das Hauptversprechen wurde auf „Website erstellen lassen in Berlin“ und kleine Unternehmen ausgerichtet.
- Leistungen, Preise, Sichtbarkeit, Technik, Referenzen und Website-Check werden als verständlicher Besucherweg verbunden.
- Verlinkte Bildkarten führen auf bestehende Hauptseiten statt in Sackgassen.
- Preiseinstieg, Leistungsumfang und nächste Schritte werden früher sichtbar.
- Mehrere unterschiedliche Bilder begleiten Planung, Leistungen, Referenzen und Technik.

Sinn: Die Startseite erklärt schneller, was angeboten wird, für wen es gedacht ist und auf welcher vorhandenen Seite ein Besucher weitermachen soll.

### 3. Webdesign Berlin

- Angebot, Zielgruppe, Preiseinstieg und Projektweg wurden präziser formuliert.
- Pakete, Website-Tester, Leistungen, Referenzen und Kontakt sind kontextbezogen verlinkt.
- Planung, Arbeitsweise und lokale Einordnung werden mit unterschiedlichen Bildern unterstützt.
- Die englische Seite erhielt eine korrekte wechselseitige Sprachverknüpfung.

Sinn: Die wichtigste Suchseite soll das Suchziel „Website erstellen lassen in Berlin“ vollständig beantworten und gezielt in Vergleich oder Anfrage weiterführen.

### 4. Pakete und Preise

- Start, Business, Wachstum und Individuell werden klarer nach Ziel, Umfang und Eignung unterschieden.
- Bestehende Paketpreise und Leistungsgrenzen werden sichtbarer eingeordnet.
- Bildkarten, Vergleich und Entscheidungshilfen wurden ergänzt.
- Direkte Wege zu Webdesign Berlin, Leistungsübersicht und passender Kontaktvorbelegung wurden verbessert.

Sinn: Nutzer sollen nicht nur einen Preis sehen, sondern verstehen, welches Paket zu ihrer Ausgangslage passt.

### 5. Leistungsübersicht

- Die vorhandenen Angebote wurden nach vier Nutzerzielen gruppiert:
  1. neue Website,
  2. bestehende Website verbessern,
  3. Sichtbarkeit erhöhen,
  4. Website betreiben.
- Jede Gruppe besitzt ein anderes Bild, eine kurze Erklärung und passende bestehende Zielseiten.
- Unsichere Nutzer können den Website-Tester starten oder eine Website-Prüfung anfragen.
- Ein bei der mobilen Abnahme gefundener CSS-Fehler wurde behoben; die Seite hat nun keinen horizontalen Seitenüberlauf mehr.

Sinn: Besucher müssen nicht mehr aus einer ungeordneten Liste selbst erraten, welche Leistung sie benötigen.

### 6. Zentrale Leistungsseiten

Optimiert wurden:

- Website-Relaunch,
- Website-Audit,
- Local SEO,
- Website-Wartung.

Auf jeder Seite wurden Ausgangslage, realistischer Leistungsumfang, Grenzen, nächster Schritt und passende interne Links deutlicher. Die Seiten besitzen unterschiedliche Hero-Bilder und ergänzende Bildbereiche. Audit und Tester werden sauber voneinander abgegrenzt; Wartung und laufende Kosten werden miteinander verbunden.

Sinn: Jede Seite soll ein konkretes Problem vollständig beantworten und danach nur einen logisch passenden nächsten Schritt anbieten.

### 7. Branchen

- Die Branchenübersicht erhielt eine verständliche Einordnung, Bildführung und klare Verweise auf Webdesign, Pakete und Anfrage.
- Die vorhandenen Seiten für Blumenläden und Immobilienmakler wurden mit eigenständigen Branchenbildern, konkreten Funktionen, Paketbezug und weiterführenden Ratgebern ergänzt.
- Externe Bilder sind lokal gespeichert, mit Alt-Text versehen und auf der Seite beziehungsweise in der Bilddokumentation referenziert.

Sinn: Bestehende Branchen-Seiten sollen nicht nur ein Layout zeigen, sondern branchentypische Anforderungen und passende Lösungen verständlich machen.

### 8. Referenzen

- Die Referenzübersicht erklärt jetzt klar, dass Ausgangslage, Ziel, Umsetzung und Ergebnis pro Projekt gezeigt werden.
- „Zur alten Backstube“ und „TM Sauber & Mehr“ wurden als konkrete Vertrauensbelege ausgebaut.
- Bilder, Vorher-Nachher-Material und passende Anfragewege wurden stärker verbunden.
- Es wurden keine erfundenen Erfolgszahlen ergänzt.

Sinn: Reale Arbeit soll Vertrauen schaffen, ohne unbelegte Versprechen.

### 9. Website-Tester

- Der Tester erklärt vor dem Formular, was geprüft wird und wo die Grenzen des kostenlosen Ergebnisses liegen.
- Nach dem Test werden passende nächste Schritte angeboten: selbst weiterarbeiten, Website-Audit oder Relaunch.
- Tester, Audit, Leistungen und Kontakt sind miteinander verlinkt.

Sinn: Der kostenlose Check wird zu einem hilfreichen Einstieg und nicht zu einer isolierten technischen Funktion.

### 10. Navigation und interne Links

- Die Hauptnavigation wurde vereinfacht.
- Leistungen werden nach Nutzerabsicht gruppiert statt als lange ungeordnete Liste gezeigt.
- Startseite, Webdesign Berlin, Pakete, Leistungen, Branchen, Referenzen, Tester und Kontakt sind kontextbezogen miteinander verknüpft.
- Priorisierte bestehende Ratgeber erhalten passende weiterführende Links.
- Verlinkungen sind als inhaltliche Links umgesetzt und nicht nur in Navigation oder Footer versteckt.

Sinn: Nutzer und Suchmaschinen erkennen besser, welche Seiten zusammengehören und welche Seite für welches Suchziel verantwortlich ist.

### 11. Kontakt und Conversion

- Es gibt eine kurze Schnellanfrage und weiterhin die ausführliche Projektanfrage.
- Die Schnellanfrage fragt nur Projektart, Name, E-Mail, Datenschutz und optional eine kurze Beschreibung ab.
- Eine Website-URL wird nur bei Audit, Relaunch und Wartung eingeblendet und verpflichtend.
- Direkte Links können die passende Projektart vorbelegen, zum Beispiel `?projektart=website-audit`.
- Paket-, Budget- und Zusatzfragen bleiben in der ausführlichen Anfrage erhalten.
- Die Texte erklären eindeutig, dass die Anfrage unverbindlich ist und zunächst eingeordnet wird.

Sinn: Besucher mit klarer Absicht können schnell anfragen; komplexe Projekte verlieren trotzdem nicht die notwendige Detailabfrage.

### 12. Technische SEO-Verknüpfungen

- Die wechselseitige deutsche und englische Sprachverknüpfung wurde repariert.
- Kritische kontextbezogene Links zwischen Hauptseiten wurden ergänzt.
- Priorisierte Ratgeber und Website-Tester erhielten sinnvolle Rückverweise.
- Die Demo-Route `/demo/cq-compare` wird ohne unnötige Verzeichnisweiterleitung ausgeliefert.

Sinn: Google erhält konsistente Beziehungen zwischen Sprache, Hauptseiten, unterstützenden Inhalten und kanonischen Zielseiten.

## Welche Seiten wurden visuell geprüft?

Alle folgenden Seiten wurden mit 1440 × 1000 Pixeln und 390 × 844 Pixeln geprüft:

| Seite | Desktop | Mobil | H1 | Bilder/Alt-Texte | Seitenüberlauf |
| --- | --- | --- | --- | --- | --- |
| `/` | bestanden | bestanden | genau 1 | bestanden | keiner |
| `/webdesign-berlin` | bestanden | bestanden | genau 1 | bestanden | keiner |
| `/pakete` | bestanden | bestanden | genau 1 | bestanden | keiner; Vergleich ist kontrolliert scrollbar |
| `/leistungen` | bestanden | nach Korrektur bestanden | genau 1 | bestanden | keiner |
| `/leistungen/website-relaunch` | bestanden | bestanden | genau 1 | bestanden | keiner |
| `/leistungen/website-audit` | bestanden | bestanden | genau 1 | bestanden | keiner |
| `/leistungen/local-seo` | bestanden | bestanden | genau 1 | bestanden | keiner; Paketkarten sind kontrolliert scrollbar |
| `/leistungen/website-wartung` | bestanden | bestanden | genau 1 | bestanden | keiner; Paketkarten sind kontrolliert scrollbar |
| `/branchen` | bestanden | bestanden | genau 1 | bestanden | keiner |
| `/branchen/webdesign-blumenladen` | bestanden | bestanden | genau 1 | bestanden | keiner |
| `/branchen/webdesign-immobilienmakler` | bestanden | bestanden | genau 1 | bestanden | keiner |
| `/referenzen` | bestanden | bestanden | genau 1 | bestanden | keiner |
| `/website-tester` | bestanden | bestanden | genau 1 | bestanden | keiner |
| `/kontakt` | bestanden | bestanden | genau 1 | bestanden | keiner |

Zusätzlich wurde die Kontaktvorbelegung geprüft: Bei `projektart=website-audit` ist „Website-Audit“ gewählt und die Website-URL verpflichtend; bei „Neue Website“ wird das URL-Feld ausgeblendet und ist nicht verpflichtend.

## Technische Prüfergebnisse

- Gesamttests: 2.200 bestanden, 0 fehlgeschlagen, 19 bewusst übersprungen.
- Build: erfolgreich; alle CSS-Dateien und der Asset-Manifest wurden neu erzeugt.
- Lokaler SEO-Recovery-Audit: 116 Seiten geprüft, 2 vorgesehene Weiterleitungen, 0 kritische Fehler, 112 Hinweise.
- Visuelle Kernseitenprüfung: keine defekten Bilder und kein fehlendes Alt-Attribut.
- `git diff --check`: keine fehlerhaften Leerzeichen oder Konfliktmarker.

Die 112 Hinweise sind keine 112 Ausfälle. Sie bestehen aus 46 Titel-Längenhinweisen, 42 Beschreibungs-Längenhinweisen und 24 automatischen Sprachhinweisen. Diese werden nach der Veröffentlichung anhand echter Search-Console-Daten priorisiert und nicht blind geändert.

## Was jetzt noch zu tun ist

1. Der Betreiber prüft die lokale Vorschau und bestätigt die Veröffentlichung ausdrücklich.
2. Erst danach wird der Branch zusammengeführt und übertragen.
3. Danach erfolgt die vollständige Live-Prüfung der echten Domain.
4. Anschließend werden Sitemap und 14 Kernseiten in der Search Console geprüft.
5. Die vorhandenen Seiten werden nach dem Reichweitenplan gezielt verteilt.
6. An Tag 7, 14 und 28 werden Google-Sichtbarkeit und echte Anfragen ausgewertet.

Bis Schritt 1 bestätigt ist, bleibt die Live-Website unverändert.
