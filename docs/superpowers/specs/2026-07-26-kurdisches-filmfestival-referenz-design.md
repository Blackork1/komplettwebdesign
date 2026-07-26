# Referenz „Kurdisches Filmfestival Berlin“ – Designspezifikation

## Ziel

Das Kurdische Filmfestival Berlin wird als dritte Referenz in das vorhandene Referenzsystem von Komplett Webdesign aufgenommen. Die Referenz soll den Umfang des Projekts nachvollziehbar zeigen, ohne Kennzahlen oder eine nicht vorhandene Kundenstimme zu erfinden.

## Freigegebener Ansatz

Die neue Referenz übernimmt Aufbau, Typografie, Farben, Karten und Abstände der vorhandenen Referenzseiten. Sie erhält keine abweichende Sondergestaltung. Der Projektumfang wird durch echte Ansichten der öffentlich erreichbaren Festivalplattform sichtbar gemacht.

## Inhaltliche Positionierung

- Projektname: Kurdisches Filmfestival Berlin
- Branche: Kultur, Festival und Streaming
- Projekttyp: individuelle, mehrsprachige Festivalplattform
- Sprachen: Deutsch, Englisch und Kurdisch
- Kernfunktionen:
  - Mediathek mit Filmübersicht, Filmdetails und Videozugang
  - Galerie mit Kategorien und vergrößerbaren Ansichten
  - redaktioneller News- und Blogbereich
  - Ticketbereich für Online- und Kinotickets
  - Newsletter mit auswählbaren Themen
  - Spendenseite mit Zahlungsabwicklung
- Passende Leistung: individuelles Webdesign-Projekt

## Seitenaufbau

### Referenzübersicht

Die vorhandene Referenzkarte wird um das Filmfestival ergänzt. Die Karte zeigt Projektbild, Branche, Ausgangslage, drei Kernleistungen, qualitatives Ergebnis und die Verlinkung zur passenden Leistung. Da keine Kundenstimme vorliegt, erscheint statt eines leeren Zitats der transparente Hinweis „Für dieses Projekt liegt keine öffentliche Kundenstimme vor.“

Die Einleitung der Übersicht spricht künftig von „ausgewählten Projekten“ statt von exakt zwei Projekten.

### Referenzdetailseite

Die Detailseite folgt dem bestehenden Aufbau:

1. Hero mit Projektname, Zusammenfassung, Live-Link und Projektbild
2. Ausgangslage und Ziel
3. geeigneter Projektkontext und Link zum individuellen Paket
4. Umsetzungsschritte
5. Funktionsumfang mit echten Projektansichten
6. qualitative Ergebnisse
7. sachliche Einordnung der übertragbaren Leistungen
8. transparenter Hinweis, dass keine öffentliche Kundenstimme vorliegt
9. Kontaktaufruf und weitere Referenzen

## Bildkonzept

Es werden ausschließlich aktuelle Screenshots der vom Nutzer freigegebenen Website `https://www.kurdisches-filmfestival.de` verwendet. Die Bilder werden lokal im Projekt abgelegt, damit die Referenz nicht von fremden Bild-URLs oder späteren Änderungen der Live-Seite abhängt.

Vorgesehene Ansichten:

- Startseite als Hero-Bild
- Film-/Mediathekbereich
- Galerie
- News-/Blogbereich
- Ticketbereich
- Newsletter
- Spendenseite

Alle Bilder erhalten konkrete deutsche Alternativtexte. Die Screenshots zeigen die jeweilige Funktion und werden nicht als bloße Dekoration eingebunden.

## Datenmodell

Das bestehende Objekt in `data/referenceProjects.js` wird genutzt. Für die Funktionsansichten werden die vorhandenen `additionalScreens` verwendet und um ein optionales `alt`-Feld ergänzt. Zusätzlich dürfen pro Projekt optionale Überschriften für diesen Bereich gesetzt werden:

- `additionalScreensEyebrow`
- `additionalScreensTitle`

Sind diese Felder nicht vorhanden, bleiben die bisherigen Texte für vorhandene Referenzen erhalten.

`quote` und `quoteAuthor` bleiben für das Filmfestival leere Zeichenketten. Übersicht und Detailseite behandeln diesen Zustand ausdrücklich.

## Aussagen und Grenzen

- Es werden keine Besucher-, Umsatz-, Ranking-, Ticket- oder Conversion-Zahlen genannt.
- Der technische und redaktionelle Funktionsumfang darf beschrieben werden, weil er auf der Live-Seite überprüfbar ist.
- Die Referenz verspricht keine identischen Ergebnisse für andere Projekte.
- Die öffentliche Kundenstimme wird nicht erfunden oder aus allgemeinen Aussagen abgeleitet.
- Die Live-Seite wird mit `rel="noopener"` in einem neuen Tab geöffnet.

## Abnahmekriterien

- `/referenzen` zeigt drei Projekte ohne leeres Zitat.
- `/referenzen/kurdisches-filmfestival` ist erreichbar und nutzt das vorhandene Referenzdesign.
- Die Seite zeigt alle sechs genannten Funktionsbereiche und das Hero-Bild.
- Alle sieben Bilder liegen lokal vor und besitzen sinnvolle Alternativtexte.
- Der Live-Link führt zu `https://www.kurdisches-filmfestival.de`.
- Die passende Leistung führt zu `/pakete/individuell`.
- Bestehende Referenzen und deren Texte bleiben funktional unverändert.
- Automatisierte Tests, CSS-Build und eine visuelle Prüfung auf Desktop und Mobil sind erfolgreich.
