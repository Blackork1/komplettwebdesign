# Kompakte Bestandsartikel im Content-Agent

**Datum:** 15. Juli 2026
**Status:** Visuelles Konzept vom Nutzer freigegeben, schriftliche Spezifikation zur Abnahme
**Geltungsbereich:** Content-Agent → Bestehende Inhalte

## 1. Ziel

Die Bestandsübersicht soll viele Blogartikel schnell erfassbar darstellen. Ein Artikel darf in der geschlossenen Standardansicht nicht mehr einen großen Berichtsbereich belegen. Die vorhandenen Performance-, Prüf-, Revisions- und KI-Optimierungsfunktionen bleiben vollständig erhalten, werden aber in eine kompakte Hauptzeile und einen aufklappbaren Detailbereich aufgeteilt.

## 2. Verbindliche Darstellung

Jeder Artikel wird standardmäßig als kompakter Eintrag mit ungefähr 110 bis 150 Pixeln Höhe dargestellt. Direkt sichtbar bleiben:

- Titel und Slug,
- Impressionen und Klicks der letzten vollständig ausgewerteten 28 Tage,
- Qualitätsscore,
- aktueller Prüf- beziehungsweise Optimierungsstatus,
- Aktualisierungsdatum,
- die vorhandenen Hauptaktionen wie Liveartikel, Revision und KI-Optimierung.

Die folgenden Informationen werden unter `Details anzeigen` eingeklappt:

- Performance der letzten 7 und 14 Tage sowie die ausführliche 28-Tage-Darstellung,
- Auditstatus und Erläuterung,
- offene Befunde,
- Ergebnis und Verlauf einer Optimierung,
- ergänzende Statushinweise wie die Wartefrist für eine Erfolgsauswertung.

Der Detailbereich ist beim Laden der Seite geschlossen. Sein Zustand muss nicht dauerhaft gespeichert werden.

## 3. Gruppen bleiben unverändert

Die vier vorhandenen Gruppen bleiben fachlich und funktional unverändert:

1. Artikel mit Sichtbarkeit,
2. Daten werden gesammelt,
3. 0 Impressionen in 28 Tagen,
4. ausgeblendete Artikel.

Gruppen können weiterhin ein- und ausgeklappt werden. Einzel- und Sammelaktionen zum administrativen Ausblenden oder Einblenden bleiben erhalten.

## 4. Interaktion und Bedienbarkeit

- `Details anzeigen` öffnet ausschließlich den Bericht des betreffenden Artikels.
- Der Beschriftung beziehungsweise dem Symbol muss im geöffneten Zustand eindeutig zu entnehmen sein, dass der Bereich wieder geschlossen werden kann.
- Links, Formulare und Buttons behalten ihre bestehenden Routen, CSRF-Felder, Datensätze und JavaScript-Attribute.
- Laufende KI-Optimierungen und deren Statusaktualisierung funktionieren weiterhin.
- Aktionen dürfen nicht versehentlich durch das Öffnen des Detailbereichs ausgelöst werden.
- Tastaturbedienung und semantische Browserfunktionen werden durch ein natives `details`-/`summary`-Element unterstützt.

## 5. Responsive Darstellung

Auf breiten Bildschirmen verwendet die kompakte Zeile ein übersichtliches Raster. Titel, Kennzahlen, Status, Datum und Aktionen stehen ohne große Leerflächen nebeneinander.

Auf kleinen Bildschirmen werden diese Bereiche kontrolliert untereinander angeordnet. Es gelten folgende Anforderungen:

- kein horizontaler Seitenüberlauf,
- keine abgeschnittenen Texte oder Buttons,
- lange Titel und Slugs dürfen umbrechen,
- Aktionen dürfen mehrzeilig angeordnet werden,
- der geschlossene Eintrag bleibt deutlich kompakter als der bisher vollständig geöffnete Bericht.

## 6. Technische Abgrenzung

Die Änderung betrifft ausschließlich die Darstellung der vorhandenen Daten. Sie erfordert:

- keine neue Datenbankmigration,
- keine neuen `.env`-Variablen,
- keine Änderung an `docker-compose.yml`,
- keine Änderung an GSC-Synchronisierung, Klassifizierung, Audit, Optimierungslogik oder Veröffentlichung.

## 7. Tests

Automatisiert werden mindestens folgende Fälle geprüft:

1. Die geschlossene Standardansicht zeigt Titel, Slug, 28-Tage-Werte, Qualitätsscore, Status, Datum und Hauptaktionen.
2. Sekundärdaten befinden sich in einem standardmäßig geschlossenen Detailbereich.
3. Der Detailbereich enthält 7-, 14- und ausführliche 28-Tage-Daten, Audit, Befunde und Optimierungsergebnis.
4. Bestehende Aktionsrouten, CSRF-Felder und JavaScript-Attribute bleiben erhalten.
5. Artikel aller vier Gruppen verwenden dieselbe kompakte Komponente.
6. Mobile CSS-Regeln verhindern horizontalen Überlauf und ordnen Inhalte lesbar untereinander an.
7. Die vorhandenen Tests für Gruppierung, Ausblenden, Revision und KI-Optimierung bleiben erfolgreich.

## 8. Abnahmekriterien

Die Anpassung gilt als abgenommen, wenn:

- auf einem Desktop mehrere Artikel ohne übergroße Leerflächen direkt untereinander sichtbar sind,
- jeder geschlossene Artikel nur seine entscheidungsrelevanten Kerndaten zeigt,
- alle bisherigen Informationen über `Details anzeigen` erreichbar bleiben,
- sämtliche bisherigen Aktionen unverändert funktionieren,
- die mobile Ansicht lesbar und ohne horizontalen Seitenüberlauf bleibt,
- keine Backend-, Datenbank- oder Serverkonfiguration geändert werden muss.
