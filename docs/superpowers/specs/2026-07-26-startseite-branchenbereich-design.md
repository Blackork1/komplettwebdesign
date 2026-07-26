# Neugestaltung des Branchenbereichs auf der Startseite

## Ziel

Der Branchenbereich der Startseite wird als hochwertige, bildgetriebene Navigation neu gestaltet. Die bisherige gleichförmige Kartenliste und der Einstieg „Handwerk“ entfallen. Besucher sollen vier unterschiedliche Branchen unmittelbar erkennen, deren wichtigsten Website-Schwerpunkt verstehen und die passende bestehende Branchenseite öffnen können.

Es werden keine neuen Branchenseiten erstellt.

## Freigegebene Gestaltungsrichtung

Die ausgewählte Variante ist **„Vier Bildgeschichten“**.

Der Bereich erhält eine redaktionelle, fotografische Anmutung mit vier großen, gleichwertigen Karten. Auf großen Bildschirmen werden die Karten leicht versetzt angeordnet. Dadurch entsteht ein bewusster Rhythmus, ohne dass eine Branche als wichtiger als die anderen erscheint.

Die Gestaltung bleibt im bestehenden Markenbild:

- dunkelblauer Grundton für Schrift und Overlays;
- Orange als gezielter Akzent für Nummern, Pfeile und Handlungsaufforderungen;
- helle, ruhige Abschnittsfläche;
- klare Poppins-Typografie aus dem vorhandenen Designsystem;
- großzügige Abstände und deutlich weniger optische Enge als im bisherigen Bereich.

## Überschrift und Einleitung

Der deutsche Bereich verwendet:

- Kicker: „Branchenlösungen“
- H2: „Vier Branchen. Vier unterschiedliche Wege zur Anfrage.“
- Einleitung: „Jede Branche braucht andere Inhalte, Bilder und Kontaktwege. Wähle den Einstieg, der deinem Angebot am nächsten kommt.“

Die englische Startseite verwendet:

- Kicker: „Industry solutions“
- H2: „Four industries. Four different paths to an enquiry.“
- Einleitung: „Every industry needs different content, images and contact paths. Choose the entry point closest to your offer.“

## Branchen und Zielseiten

Die vier Karten verlinken ausschließlich auf vorhandene Seiten:

1. **Gesundheit & Coaching**
   - Ziel: `/branchen/webdesign-fitnesscoach`
   - Kurzzeile: „Vertrauen, Angebote und Terminwege“
   - Englisch: „Health & Coaching“ und „Trust, services and appointment paths“
2. **Immobilien**
   - Ziel: `/branchen/webdesign-immobilienmakler`
   - Kurzzeile: „Region, Objekte und persönliche Beratung“
   - Englisch: „Real Estate“ und „Region, properties and personal advice“
3. **Blumenladen**
   - Ziel: `/branchen/webdesign-blumenladen`
   - Kurzzeile: „Sortiment, Saison und lokaler Standort“
   - Englisch: „Florists“ und „Products, seasons and local presence“
4. **Café & Gastronomie**
   - Ziel: `/branchen/webdesign-cafe`
   - Kurzzeile: „Atmosphäre, Öffnungszeiten und Reservierung“
   - Englisch: „Cafés & Hospitality“ und „Atmosphere, opening hours and reservations“

„Handwerk“, das Handwerkerbild und der Link `/handwerker` werden aus diesem Startseitenbereich vollständig entfernt. Andere vorhandene Handwerkerseiten oder Verlinkungen außerhalb dieses Bereichs bleiben unverändert.

## Kartenaufbau

Jede Branchenkarte ist vollständig klickbar und enthält:

- eine sichtbare Nummer von `01` bis `04`;
- ein eigenständiges, zur Branche passendes Foto;
- den Branchennamen als H3;
- eine kurze Nutzenzeile;
- einen sichtbaren Richtungspfeil;
- einen aussagekräftigen zugänglichen Linknamen.

Ein dunkler Verlauf am unteren Bildrand stellt sicher, dass Überschrift und Kurzzeile auf unterschiedlichen Fotos lesbar bleiben. Die Informationen dürfen nicht ausschließlich über das Bild vermittelt werden.

Beim Überfahren oder Fokussieren wird die Karte leicht angehoben. Das Bild darf sich nur sehr zurückhaltend vergrößern. Bei reduzierter Bewegung werden diese Effekte abgeschaltet.

## Bildkonzept und Quellen

Alle vier Karten verwenden unterschiedliche Bilder.

- Für Immobilien und Blumenladen werden die bereits zentral erfassten redaktionellen Bilder und Quellen aus `data/marketingImages.js` weiterverwendet.
- Für Café & Gastronomie wird das vorhandene lokale Café-Bild verwendet.
- Für Gesundheit & Coaching wird ein neues, klar erkennbares Bild eingebunden. Wenn kein eindeutig eigener Bestand geeignet ist, wird ein Bild einer öffentlichen Quelle mit überprüfbarer Lizenzseite ausgewählt, lokal als WebP gespeichert und mit Urheber, Anbieterseite sowie Lizenzhinweis dokumentiert.

Jedes Bild erhält einen konkreten deutschen Alt-Text. Die englische Startseite erhält passende englische Alt-Texte. Reine Dateinamen, leere Alt-Texte und allgemeine Formulierungen wie „Branchenbild“ sind nicht zulässig.

Externe Bilder werden lokal ausgeliefert. Die Herkunft wird weiterhin in `docs/media/bildquellen-und-alttexte.md` dokumentiert. Wenn die Quelle eine sichtbare Nennung verlangt oder die vorhandene Seitenkonvention dies vorsieht, erscheint zusätzlich eine kompakte Bildquellenangabe.

## Responsive Verhalten

### Desktop

- vier gleich breite Karten in einer Reihe;
- Karten `02` und `04` werden leicht nach unten versetzt;
- großzügige Bildhöhe ohne überdimensionierte Einzelbilder;
- Überschrift und Einleitung stehen linksbündig über dem Kartenfeld.

### Tablet

- geordnetes Raster mit zwei Spalten;
- keine vertikale Versetzung;
- identische Kartenhöhen innerhalb einer Reihe.

### Smartphone

- horizontal scrollbarer Kartenbereich mit nativer Bedienung und sichtbarer Scrollleiste;
- die nächste Karte bleibt angeschnitten sichtbar;
- Scroll-Snap unterstützt die Orientierung;
- keine erzwungene automatische Bewegung;
- die Karten bleiben vollständig per Tastatur erreichbar;
- ein kurzer visueller Hinweis erklärt die horizontale Bedienung.

## Abschluss des Bereichs

Unter den Karten steht eine eindeutige Handlungsaufforderung:

- Deutsch: „Alle Branchenlösungen vergleichen“
- Englisch: „Compare all industry solutions“
- Ziel: `/branchen`

Die bisherige schlichte Textnotiz wird durch einen sichtbaren, zum bestehenden Button-System passenden Link ersetzt.

## Technische Einordnung

Die bestehende Startseitenstruktur bleibt erhalten. Geändert werden ausschließlich:

- der Branchenabschnitt in `views/index.ejs`;
- die zugehörigen Stile in `public/home.css`;
- zentrale Bilddaten, falls das neue Gesundheits- und Coachingbild dort aufgenommen wird;
- die erzeugte minimierte CSS-Datei und das CSS-Asset-Manifest;
- die vorhandene Bildquellendokumentation;
- gezielte Startseiten- und Bildtests.

Es wird kein neues JavaScript benötigt. Horizontales Scrollen und Scroll-Snap funktionieren nativ über CSS.

## Barrierefreiheit und SEO

- Semantische Überschriftenfolge bleibt erhalten.
- Jede Karte besitzt einen eindeutigen Linknamen.
- Fokuszustände sind mindestens so deutlich wie Hover-Zustände.
- Texte bleiben auch ohne Bild verständlich.
- Alt-Texte beschreiben Motiv und Kontext, ohne Suchbegriffe zu wiederholen.
- Die vier bestehenden Branchenziele stärken die interne Verlinkung, ohne neue oder inhaltsarme Seiten anzulegen.
- Animationen respektieren `prefers-reduced-motion`.

## Tests und Abnahme

Vor der Umsetzung wird ein fehlschlagender Regressionstest ergänzt. Er prüft das serverseitig gerenderte Ergebnis des Startseitenbereichs:

- genau vier Branchenkarten;
- die vier freigegebenen Zielpfade;
- kein Link zu `/handwerker`;
- keine sichtbare Bezeichnung „Handwerk“;
- vier nicht leere Alt-Texte;
- vollständige deutsche und englische Beschriftung;
- sichtbarer Link zur Branchenübersicht.

Nach der Umsetzung erfolgen:

- gezielte Startseitentests;
- CSS-Build;
- vollständiger Projekttest;
- Sichtprüfung der echten Startseite im Browser;
- Prüfung einer großen Ansicht und einer schmalen Ansicht;
- Kontrolle von Bildladung, Textkontrast, Fokuszustand und horizontaler Bedienung;
- Kontrolle der Browserkonsole auf relevante Fehler und Warnungen.

## Nicht Bestandteil

- neue Branchenseiten;
- Änderungen an den vier Zielseiten;
- Änderungen am Branchenverzeichnis `/branchen`;
- Entfernung der Handwerkerseite aus der Website;
- neue Filter-, Such- oder Slider-Bibliotheken;
- automatische Karussellbewegung;
- Änderungen an Bereichen der Startseite außerhalb von `#branchenwege`.
