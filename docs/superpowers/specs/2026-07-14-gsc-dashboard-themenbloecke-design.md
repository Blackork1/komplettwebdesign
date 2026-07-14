# GSC-Dashboard mit Themenblöcken – Design

**Stand:** 14. Juli 2026  
**Status:** Vom Nutzer als Variante A („Themenblöcke zuerst“) bestätigt

## Ziel

Der Search-Console-Bereich des Content-Agenten soll nicht länger überwiegend einzelne, ähnliche Tester-URLs und Suchanfragen untereinander anzeigen. Stattdessen werden die Daten zuerst in verständliche Themenblöcke eingeordnet. So bleibt sichtbar, dass Website-Tester, SEO-Tester, GEO-Tester und Broken-Link-Tester wichtige Reichweitentreiber sind, ohne dass sie die gesamte Übersicht oder die automatische Themenauswahl dominieren.

Google-Search-Console-Daten dienen künftig als ergänzendes Signal. Die primäre Ideenquelle für neue Artikel bleibt die aktuelle OpenAI-Webrecherche. Damit kann der Agent sowohl aktuelle, stark nachgefragte Themen finden als auch erkennen, in welchen Bereichen die Website bereits Sichtbarkeit besitzt.

## Bestätigte Oberfläche

Die Oberfläche folgt dem bereits ausgewählten Mock-up `gsc-dashboard-layout.html`:

1. Oben stehen vier kompakte Kennzahlen:
   - Impressionen
   - Klicks
   - Klickrate
   - ausgewerteter Zeitraum
2. Danach folgt der hervorgehobene Themenblock **Website-Tester**.
3. Innerhalb dieses Blocks werden folgende Tester-Arten getrennt ausgewiesen:
   - SEO-Tester
   - GEO-Tester
   - Broken-Link-Tester
   - Meta-Tester
   - allgemeine Website-Tester
4. Weitere Hauptblöcke sind:
   - Blog & Ratgeber
   - Leistungen
   - Lokale Seiten & Branchen
   - Sonstige Inhalte
5. Deutsche und englische Seiten werden innerhalb der Themenblöcke getrennt dargestellt.
6. Unter **Wichtigste Content-Chancen außerhalb der Tester** erscheinen nicht testerbezogene Suchanfragen mit besonders gutem redaktionellem Potenzial.
7. Die vorhandenen offenen Optimierungschancen bleiben als eigener, nur lesbarer Bereich bestehen.

Die Detailansichten werden als zugängliche aufklappbare Bereiche umgesetzt. Auf kleinen Bildschirmen werden Kennzahlen und Themenkarten untereinander angeordnet.

## Datenzeitraum und korrekte Summen

Das Dashboard verwendet die jüngsten 28 in der Datenbank verfügbaren Kalendertage. Der Zeitraum endet am neuesten gespeicherten `metric_date`; damit funktioniert die Anzeige auch dann korrekt, wenn Google die jüngsten Tage noch nicht vollständig bereitgestellt hat.

Die Gesamtwerte werden aus nach URL aggregierten Daten berechnet und nicht aus einer auf 100 Zeilen begrenzten Suchanfragenliste. Dadurch stimmen Impressionen und Klicks auch bei vielen Suchanfragen. Die Suchanfragenliste bleibt begrenzt und dient nur den Details sowie der Chancenbewertung.

## Serverseitige Kategorisierung

Jede URL erhält genau eine Hauptkategorie, optional eine Tester-Unterkategorie und eine Sprache. Die Priorität ist:

1. Website-Tester
2. Blog & Ratgeber
3. Lokale Seiten & Branchen
4. Leistungen
5. Sonstige Inhalte

Englische Inhalte werden anhand des Pfads `/en` erkannt. Alle anderen Inhalte gelten als deutsch. URLs werden ausschließlich serverseitig klassifiziert; die EJS-Ansicht enthält keine Geschäftslogik.

## Nutzung im wöchentlichen Themenpool

Die aktuelle OpenAI-Webrecherche bleibt die Hauptquelle. GSC-Daten fließen nur ergänzend mit maximal zehn Prozent in die Bewertung ein:

- Der Agent erhält eine kompakte Zusammenfassung der Kategorien, Tester-Blöcke und wichtigsten nicht testerbezogenen Suchanfragen.
- Suchanfragen aus GSC werden als nicht vertrauenswürdige externe Daten behandelt, bereinigt und begrenzt.
- Der Prompt stellt ausdrücklich klar, dass GSC nur die bisherige Sichtbarkeit der eigenen Website und nicht die allgemeine Marktnachfrage abbildet.
- Die tatsächliche GSC-Relevanz wird zusätzlich deterministisch aus Themen-, Kategorie- und Wortüberschneidungen berechnet.
- Höchstens etwa jeder dritte Kandidat darf aus dem Tester-Cluster stammen.
- Fehlende oder vorübergehend nicht ladbare GSC-Daten dürfen die Artikelerstellung niemals blockieren.

## Bewertung

Für Kandidaten aus der wöchentlichen Recherche gilt die gewichtete Bewertung:

- 27 % Bezug zu Leistungen und Zielkunden
- 23 % Suchchance und aktuelle Nachfrage
- 14 % Problem- beziehungsweise Kaufnähe
- 9 % internes Verlinkungspotenzial
- 9 % Passung zum Content-Cluster
- 8 % lokale Relevanz
- 10 % ergänzende GSC-Relevanz
- Abzug für Kannibalisierungsrisiken

Manuell vorgegebene beziehungsweise ältere Themenobjekte bleiben abwärtskompatibel und werden nicht künstlich wegen fehlender GSC-Daten abgewertet.

## Fehler- und Leerzustände

- Ohne GSC-Daten zeigt das Dashboard einen verständlichen Leerzustand.
- Scheitert das Laden der Signale für die Themenrecherche, läuft die OpenAI-Webrecherche ohne GSC weiter.
- Bestehende offene GSC-Optimierungschancen werden unabhängig von der neuen Gruppierung angezeigt.
- Es werden weder Zugangsdaten noch ungefilterte technische Fehler im Adminbereich ausgegeben.

## Technische Grenzen

Für diese Erweiterung sind keine neuen Umgebungsvariablen, keine Docker-Compose-Änderungen und keine neue Datenbankmigration erforderlich. Verwendet werden die bereits vorhandene Search-Console-Anbindung, die bestehende Tabelle `content_search_metrics` und der vorhandene OpenAI-Zugang.

## Abnahmekriterien

- Das bestätigte Themenblock-Design ist im Search-Console-Tab sichtbar.
- Tester-Seiten erscheinen zusammengefasst und nach Tester-Art unterteilt.
- Deutsche und englische Daten lassen sich getrennt erkennen.
- Summen beziehen sich nachweislich auf den jüngsten verfügbaren 28-Tage-Zeitraum.
- Nicht testerbezogene Content-Chancen werden gesondert hervorgehoben.
- Die wöchentliche OpenAI-Recherche erhält bereinigte GSC-Signale, bleibt jedoch davon unabhängig.
- GSC trägt höchstens zehn Prozent zum Themen-Score bei.
- Alle bestehenden Funktionen und Leerzustände bleiben funktionsfähig.
