# ChatGPT-Prompts für die Bildplätze der Branchenseiten

Stand: 12.11.2026. Für jeden Bildplatz unter `public/images/branchen/` steht hier ein Prompt, den du so in ChatGPT einfügen kannst. Die Prompts beschreiben dieselben Inhalte wie die früheren Platzhalter, damit Bildunterschriften und Alt-Texte weiter passen. Alle 73 Bilder sind am 12.11.2026 erzeugt und eingebaut worden. Wer eines neu erzeugt, verkleinert es wie in [README.md](README.md), Abschnitt 3, beschrieben.

## Formate

| Wo das Bild steht | Format | In ChatGPT erzeugen | Auf der Website |
|---|---|---|---|
| Neben einem langen Text (Abschnitt mit Stichpunkten) | Hochformat 2:3 | 1024 × 1536 | 720 × 1080 |
| Im Beispielaufbau, drei Bilder nebeneinander | Querformat 3:2 | 1536 × 1024 | 720 × 480 |
| Hero der Kita-Seite | Querformat 3:2 | 1536 × 1024 | 960 × 640 |

Die Texte neben den Bildern sind 960 bis 1.170 Pixel hoch. Ein Hochkant-Bild füllt diese Höhe, ein Querformat ließe daneben viel leere Fläche. Beide Formate erzeugt ChatGPT direkt, ohne Zuschnitt.

## So kommen die Bilder auf die Website

1. Prompt kopieren, in ChatGPT einfügen, Bild erzeugen. Stimmen Bildschirmtexte nicht, ChatGPT bitten, nur den Text zu korrigieren.
2. Bild als PNG speichern und mir schicken, mit dem Dateinamen aus der Liste. Ich wandle es in WebP um und setze es ein.
3. Selbst umwandeln geht auch: `cwebp -q 80 -resize 720 1080 bild.png -o blumenladen-angebot.webp` (Hochformat) oder `-resize 720 480` (Querformat), dann die Datei unter demselben Namen ersetzen.
4. Die Bildunterschriften behalten das Wort „Beispielaufbau“. Erzeugte Bilder zeigen keine echten Kundenprojekte.

## Reinigung und Gebäudeservice (`/branchen/webdesign-reinigung`)

### reinigung-startseite.webp

- Stelle: Beispielaufbau, Bild „Startseite“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/reinigung/reinigung-startseite.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Ein aufgeklappter Laptop steht auf dem Empfangstresen im hellen Foyer eines Bürogebäudes, leicht von der Seite fotografiert. Auf dem Bildschirm die Startseite einer Website für eine Gebäudereinigung: oben links das Logo „Deine Reinigungsfirma“, die große Überschrift „Saubere Büros und Treppenhäuser in Berlin“, ein farbiger Knopf „Angebot anfragen“ und darunter drei Kacheln „Büroreinigung“, „Treppenhaus“ und „Glasreinigung“. Im Hintergrund unscharf eine Glastür und ein sauber gewischter Steinboden. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Türkis, Hellblau und Mint. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### reinigung-angebot.webp

- Stelle: Abschnitt „Webdesign für Gebäudereinigung und Gebäudeservice: mehrere Leistungen auf einer Website“, neben dem langen Text
- Format: Hochformat 2:3, in ChatGPT 1024 × 1536, auf der Website 720 × 1080
- Datei: `public/images/branchen/reinigung/reinigung-angebot.webp`

```text
Erstelle ein Foto im Hochformat 2:3 (1024 × 1536 Pixel). Eine Hand hält ein modernes Smartphone senkrecht vor die Kamera, aufgenommen im hellen Foyer eines Bürogebäudes. Das Smartphone ist scharf und füllt gut die Hälfte des Bildes. Auf dem Bildschirm die Seite „Unsere Leistungen“ mit sechs Kacheln, jede mit einem einfachen Symbol und einem Titel: „Büroreinigung“, „Treppenhausreinigung“, „Glasreinigung“, „Praxisreinigung“, „Grundreinigung“ und „Hausmeisterservice“. Im Hintergrund unscharf eine Glastür und ein sauber gewischter Steinboden. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Türkis, Hellblau und Mint. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### reinigung-anfrage.webp

- Stelle: Beispielaufbau, Bild „Angebotsanfrage“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/reinigung/reinigung-anfrage.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Eine Hand hält ein Smartphone leicht schräg ins Bild, aufgenommen im hellen Foyer eines Bürogebäudes. Das Smartphone steht im rechten Bilddrittel. Auf dem Bildschirm das Formular „Angebot anfragen“ mit den Feldern „Objektart“ (ausgefüllt mit „Büro“), „Fläche“ (ausgefüllt mit „ca. 250 m²“) und „Turnus“ (ausgefüllt mit „2× pro Woche“), zwei Auswahlknöpfen „Besichtigung“ und „Rückruf“ und dem Knopf „Anfrage senden“. Im Hintergrund unscharf eine Glastür und ein sauber gewischter Steinboden. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Türkis, Hellblau und Mint. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### reinigung-suche.webp

- Stelle: Beispielaufbau, Bild „Lokale Suche“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/reinigung/reinigung-suche.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Ein Smartphone liegt auf dem Empfangstresen im hellen Foyer eines Bürogebäudes neben einem Schlüsselbund und einem Klemmbrett, von schräg oben fotografiert. Auf dem Bildschirm ein lokales Suchergebnis wie in einer Karten-App: oben das Suchfeld mit „gebäudereinigung berlin pankow“, darunter der hervorgehobene Eintrag „Deine Reinigungsfirma“ mit „Gebäudereinigung · Berlin“ und „Geöffnet · schließt 17 Uhr“, drei kleine Knöpfe „Route“, „Anrufen“ und „Website“, daneben ein Kartenausschnitt mit einer Stecknadel. Neutrale Kartendarstellung ohne Logos. Im Hintergrund unscharf eine Glastür und ein sauber gewischter Steinboden. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Türkis, Hellblau und Mint. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

## Blumenladen (`/branchen/webdesign-blumenladen`)

### blumenladen-startseite.webp

- Stelle: Beispielaufbau, Bild „Startseite“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/blumenladen/blumenladen-startseite.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Ein aufgeklappter Laptop steht auf der Holztheke eines kleinen Berliner Blumenladens, leicht von der Seite fotografiert. Auf dem Bildschirm die Startseite einer Website für einen Blumenladen: oben links das Logo „Dein Blumenladen“, die große Überschrift „Sträuße mit Handschrift aus deinem Kiez“, ein farbiger Knopf „Strauß bestellen“ und darunter drei Kacheln „Lieferung“, „Hochzeit“ und „Öffnungszeiten“. Im Hintergrund unscharf Eimer mit Tulpen, Ranunkeln und Eukalyptus. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Rosa, Salbeigrün und ein warmes Gelb. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### blumenladen-angebot.webp

- Stelle: Abschnitt „Blumen-Onlineshop erstellen lassen: was ein kleiner Shop können muss“, neben dem langen Text
- Format: Hochformat 2:3, in ChatGPT 1024 × 1536, auf der Website 720 × 1080
- Datei: `public/images/branchen/blumenladen/blumenladen-angebot.webp`

```text
Erstelle ein Foto im Hochformat 2:3 (1024 × 1536 Pixel). Eine Hand hält ein modernes Smartphone senkrecht vor die Kamera, aufgenommen in einem kleinen Berliner Blumenladen. Das Smartphone ist scharf und füllt gut die Hälfte des Bildes. Auf dem Bildschirm die Seite „Sträuße online bestellen“ mit sechs Kacheln, jede mit einem einfachen Symbol und einem Titel: „Strauß der Woche“, „Rosenstrauß“, „Brautstrauß“, „Trauergesteck“, „Zimmerpflanze“ und „Gutschein“. Im Hintergrund unscharf Eimer mit Tulpen, Ranunkeln und Eukalyptus. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Rosa, Salbeigrün und ein warmes Gelb. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### blumenladen-anfrage.webp

- Stelle: Beispielaufbau, Bild „Bestellung auf dem Handy“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/blumenladen/blumenladen-anfrage.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Eine Hand hält ein Smartphone leicht schräg ins Bild, aufgenommen in einem kleinen Berliner Blumenladen. Das Smartphone steht im rechten Bilddrittel. Auf dem Bildschirm das Formular „Strauß bestellen“ mit den Feldern „Anlass“ (ausgefüllt mit „Geburtstag“), „Budget“ (ausgefüllt mit „35 €“) und „Wunschtermin“ (ausgefüllt mit „Samstag, 10 Uhr“), zwei Auswahlknöpfen „Abholung“ und „Lieferung“ und dem Knopf „Bestellung senden“. Im Hintergrund unscharf Eimer mit Tulpen, Ranunkeln und Eukalyptus. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Rosa, Salbeigrün und ein warmes Gelb. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### blumenladen-suche.webp

- Stelle: Beispielaufbau, Bild „Lokale Suche“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/blumenladen/blumenladen-suche.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Ein Smartphone liegt auf der Holztheke eines kleinen Berliner Blumenladens neben einem kleinen Strauß Tulpen, von schräg oben fotografiert. Auf dem Bildschirm ein lokales Suchergebnis wie in einer Karten-App: oben das Suchfeld mit „blumenladen in der nähe“, darunter der hervorgehobene Eintrag „Dein Blumenladen“ mit „Florist · Berlin“ und „Geöffnet · schließt 18 Uhr“, drei kleine Knöpfe „Route“, „Anrufen“ und „Website“, daneben ein Kartenausschnitt mit einer Stecknadel. Neutrale Kartendarstellung ohne Logos. Im Hintergrund unscharf Eimer mit Tulpen, Ranunkeln und Eukalyptus. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Rosa, Salbeigrün und ein warmes Gelb. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

## Fitnessstudio und Personal Trainer (`/branchen/webdesign-fitnesscoach`)

### fitnesscoach-startseite.webp

- Stelle: Abschnitt „Website für dein Fitnessstudio: Agentur, Baukasten oder Webdesigner?“, neben dem langen Text
- Format: Hochformat 2:3, in ChatGPT 1024 × 1536, auf der Website 720 × 1080
- Datei: `public/images/branchen/fitnesscoach/fitnesscoach-startseite.webp`

```text
Erstelle ein Foto im Hochformat 2:3 (1024 × 1536 Pixel). Eine Hand hält ein modernes Smartphone senkrecht vor die Kamera, aufgenommen in einem modernen, hellen Fitnessstudio. Das Smartphone ist scharf und füllt gut die Hälfte des Bildes. Auf dem Bildschirm die Startseite einer Website für ein Fitnessstudio: oben links das Logo „Dein Studio“, die große Überschrift „Training, das zu deinem Alltag passt“, ein farbiger Knopf „Probetraining buchen“ und darunter drei Kacheln „Kursplan“, „Preise“ und „Trainer“. Im Hintergrund unscharf Kurzhanteln, ein Rack und Gummiboden. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Orange, Himmelblau und Limettengrün. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### fitnesscoach-angebot.webp

- Stelle: Beispielaufbau, Bild „Kurse und Training“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/fitnesscoach/fitnesscoach-angebot.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Ein Tablet liegt auf einer Bank in einem modernen, hellen Fitnessstudio, von schräg oben fotografiert. Auf dem Bildschirm die Seite „Kurse und Training“ mit sechs Kacheln, jede mit einem einfachen Symbol und einem Titel: „Gerätetraining“, „Kurse“, „Personal Training“, „Yoga“, „Functional“ und „Rückenfit“. Im Hintergrund unscharf Kurzhanteln, ein Rack und Gummiboden. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Orange, Himmelblau und Limettengrün. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### fitnesscoach-anfrage.webp

- Stelle: Beispielaufbau, Bild „Probetraining“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/fitnesscoach/fitnesscoach-anfrage.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Eine Hand hält ein Smartphone leicht schräg ins Bild, aufgenommen in einem modernen, hellen Fitnessstudio. Das Smartphone steht im rechten Bilddrittel. Auf dem Bildschirm das Formular „Probetraining buchen“ mit den Feldern „Name“ (ausgefüllt mit „Alex M.“), „Wunschtermin“ (ausgefüllt mit „Dienstag, 18 Uhr“) und „Ziel“ (ausgefüllt mit „Rücken stärken“), zwei Auswahlknöpfen „Kurs“ und „Geräte“ und dem Knopf „Termin anfragen“. Im Hintergrund unscharf Kurzhanteln, ein Rack und Gummiboden. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Orange, Himmelblau und Limettengrün. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### fitnesscoach-suche.webp

- Stelle: Beispielaufbau, Bild „Lokale Suche“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/fitnesscoach/fitnesscoach-suche.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Ein Smartphone liegt auf einer Bank in einem modernen, hellen Fitnessstudio neben einer Trinkflasche und einem Handtuch, von schräg oben fotografiert. Auf dem Bildschirm ein lokales Suchergebnis wie in einer Karten-App: oben das Suchfeld mit „fitnessstudio in der nähe“, darunter der hervorgehobene Eintrag „Dein Studio“ mit „Fitnessstudio · Berlin“ und „Geöffnet · schließt 22 Uhr“, drei kleine Knöpfe „Route“, „Anrufen“ und „Website“, daneben ein Kartenausschnitt mit einer Stecknadel. Neutrale Kartendarstellung ohne Logos. Im Hintergrund unscharf Kurzhanteln, ein Rack und Gummiboden. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Orange, Himmelblau und Limettengrün. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

## Immobilienmakler (`/branchen/webdesign-immobilienmakler`)

### immobilienmakler-startseite.webp

- Stelle: Beispielaufbau, Bild „Startseite“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/immobilienmakler/immobilienmakler-startseite.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Ein aufgeklappter Laptop steht auf einem Schreibtisch in einem hellen Maklerbüro, leicht von der Seite fotografiert. Auf dem Bildschirm die Startseite einer Website für ein Maklerbüro: oben links das Logo „Dein Maklerbüro“, die große Überschrift „Deine Immobilie in Berlin sicher verkaufen“, ein farbiger Knopf „Immobilie bewerten“ und darunter drei Kacheln „Wertermittlung“, „Objekte“ und „Verkauf“. Im Hintergrund unscharf ein hohes Berliner Altbaufenster. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Kornblumenblau, Petrol und Sandgelb. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### immobilienmakler-angebot.webp

- Stelle: Abschnitt „Webdesign für Makler: Objekte zeigen, ohne sie doppelt zu pflegen“, neben dem langen Text
- Format: Hochformat 2:3, in ChatGPT 1024 × 1536, auf der Website 720 × 1080
- Datei: `public/images/branchen/immobilienmakler/immobilienmakler-angebot.webp`

```text
Erstelle ein Foto im Hochformat 2:3 (1024 × 1536 Pixel). Eine Hand hält ein modernes Smartphone senkrecht vor die Kamera, aufgenommen in einem hellen Maklerbüro. Das Smartphone ist scharf und füllt gut die Hälfte des Bildes. Auf dem Bildschirm die Seite „Aktuelle Objekte“ mit sechs Kacheln, jede mit einem einfachen Symbol und einem Titel: „Wohnung“, „Einfamilienhaus“, „Grundstück“, „Gewerbe“, „Mehrfamilienhaus“ und „Referenzen“. Im Hintergrund unscharf ein hohes Berliner Altbaufenster. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Kornblumenblau, Petrol und Sandgelb. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### immobilienmakler-anfrage.webp

- Stelle: Beispielaufbau, Bild „Bewertungsanfrage“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/immobilienmakler/immobilienmakler-anfrage.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Eine Hand hält ein Smartphone leicht schräg ins Bild, aufgenommen in einem hellen Maklerbüro. Das Smartphone steht im rechten Bilddrittel. Auf dem Bildschirm das Formular „Immobilie bewerten“ mit den Feldern „Objektart“ (ausgefüllt mit „Wohnung“), „Lage“ (ausgefüllt mit „Berlin-Pankow“) und „Wohnfläche“ (ausgefüllt mit „78 m²“), zwei Auswahlknöpfen „Verkauf“ und „Vermietung“ und dem Knopf „Bewertung anfragen“. Im Hintergrund unscharf ein hohes Berliner Altbaufenster. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Kornblumenblau, Petrol und Sandgelb. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### immobilienmakler-suche.webp

- Stelle: Beispielaufbau, Bild „Lokale Suche“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/immobilienmakler/immobilienmakler-suche.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Ein Smartphone liegt auf einem Schreibtisch in einem hellen Maklerbüro neben einem Schlüssel mit Anhänger, von schräg oben fotografiert. Auf dem Bildschirm ein lokales Suchergebnis wie in einer Karten-App: oben das Suchfeld mit „immobilienmakler berlin pankow“, darunter der hervorgehobene Eintrag „Dein Maklerbüro“ mit „Immobilienmakler · Berlin“ und „Geöffnet · schließt 18 Uhr“, drei kleine Knöpfe „Route“, „Anrufen“ und „Website“, daneben ein Kartenausschnitt mit einer Stecknadel. Neutrale Kartendarstellung ohne Logos. Im Hintergrund unscharf ein hohes Berliner Altbaufenster. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Kornblumenblau, Petrol und Sandgelb. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

## Restaurant (`/branchen/webdesign-restaurant`)

### restaurant-startseite.webp

- Stelle: Beispielaufbau, Bild „Startseite“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/restaurant/restaurant-startseite.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Ein aufgeklappter Laptop steht auf einem gedeckten Holztisch in einem gemütlichen Restaurant am Abend, leicht von der Seite fotografiert. Auf dem Bildschirm die Startseite einer Website für ein Restaurant: oben links das Logo „Dein Restaurant“, die große Überschrift „Frische Küche mitten im Kiez“, ein farbiger Knopf „Tisch reservieren“ und darunter drei Kacheln „Speisekarte“, „Öffnungszeiten“ und „Feiern“. Im Hintergrund unscharf warmes Licht, Gläser und Gäste ohne erkennbare Gesichter. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Honiggelb, Terrakotta und Olivgrün. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### restaurant-angebot.webp

- Stelle: Abschnitt „Restaurant-Webseite: warum die Speisekarte die wichtigste Seite ist“, neben dem langen Text
- Format: Hochformat 2:3, in ChatGPT 1024 × 1536, auf der Website 720 × 1080
- Datei: `public/images/branchen/restaurant/restaurant-angebot.webp`

```text
Erstelle ein Foto im Hochformat 2:3 (1024 × 1536 Pixel). Eine Hand hält ein modernes Smartphone senkrecht vor die Kamera, aufgenommen in einem gemütlichen Restaurant am Abend. Das Smartphone ist scharf und füllt gut die Hälfte des Bildes. Auf dem Bildschirm die Seite „Speisekarte“ als gut lesbare Textliste mit den Abschnitten „Vorspeisen“ und „Hauptgerichte“, darunter je drei Einträge mit Preis, zum Beispiel „Tagessuppe“ und „Bunter Salat“. Im Hintergrund unscharf warmes Licht, Gläser und Gäste ohne erkennbare Gesichter. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Honiggelb, Terrakotta und Olivgrün. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### restaurant-anfrage.webp

- Stelle: Beispielaufbau, Bild „Reservierung“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/restaurant/restaurant-anfrage.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Eine Hand hält ein Smartphone leicht schräg ins Bild, aufgenommen in einem gemütlichen Restaurant am Abend. Das Smartphone steht im rechten Bilddrittel. Auf dem Bildschirm das Formular „Tisch reservieren“ mit den Feldern „Datum“ (ausgefüllt mit „Samstag, 19:30 Uhr“), „Personen“ (ausgefüllt mit „4“) und „Anlass“ (ausgefüllt mit „Geburtstag“), zwei Auswahlknöpfen „Innen“ und „Terrasse“ und dem Knopf „Reservierung senden“. Im Hintergrund unscharf warmes Licht, Gläser und Gäste ohne erkennbare Gesichter. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Honiggelb, Terrakotta und Olivgrün. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### restaurant-suche.webp

- Stelle: Beispielaufbau, Bild „Lokale Suche“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/restaurant/restaurant-suche.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Ein Smartphone liegt auf einem gedeckten Holztisch in einem gemütlichen Restaurant am Abend neben einem Glas Wein, von schräg oben fotografiert. Auf dem Bildschirm ein lokales Suchergebnis wie in einer Karten-App: oben das Suchfeld mit „restaurant in der nähe“, darunter der hervorgehobene Eintrag „Dein Restaurant“ mit „Restaurant · Berlin“ und „Geöffnet · schließt 23 Uhr“, drei kleine Knöpfe „Route“, „Anrufen“ und „Website“, daneben ein Kartenausschnitt mit einer Stecknadel. Neutrale Kartendarstellung ohne Logos. Im Hintergrund unscharf warmes Licht, Gläser und Gäste ohne erkennbare Gesichter. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Honiggelb, Terrakotta und Olivgrün. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

## Café (`/branchen/webdesign-cafe`)

### cafe-startseite.webp

- Stelle: Beispielaufbau, Bild „Startseite“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/cafe/cafe-startseite.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Ein aufgeklappter Laptop steht auf einem kleinen Marmortisch in einem hellen Café, leicht von der Seite fotografiert. Auf dem Bildschirm die Startseite einer Website für ein Café: oben links das Logo „Dein Café“, die große Überschrift „Kaffee, Kuchen und Frühstück im Kiez“, ein farbiger Knopf „Tisch reservieren“ und darunter drei Kacheln „Kaffee“, „Torten“ und „Öffnungszeiten“. Im Hintergrund unscharf eine Kuchentheke und große Fenster. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Honiggelb, Terrakotta und Olivgrün. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### cafe-angebot.webp

- Stelle: Beispielaufbau, Bild „Karte als Text“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/cafe/cafe-angebot.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Ein Tablet liegt auf einem kleinen Marmortisch in einem hellen Café, von schräg oben fotografiert. Auf dem Bildschirm die Seite „Unsere Karte“ als gut lesbare Textliste mit den Abschnitten „Frühstück“ und „Kuchen und Kaffee“, darunter je drei Einträge mit Preis, zum Beispiel „Frühstück Klassik“ und „Rührei mit Brot“. Im Hintergrund unscharf eine Kuchentheke und große Fenster. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Honiggelb, Terrakotta und Olivgrün. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### cafe-anfrage.webp

- Stelle: Abschnitt „Torten über die Café-Website vorbestellen: so klappt es ohne Zettelwirtschaft“, neben dem langen Text
- Format: Hochformat 2:3, in ChatGPT 1024 × 1536, auf der Website 720 × 1080
- Datei: `public/images/branchen/cafe/cafe-anfrage.webp`

```text
Erstelle ein Foto im Hochformat 2:3 (1024 × 1536 Pixel). Eine Hand hält ein modernes Smartphone senkrecht vor die Kamera, aufgenommen in einem hellen Café. Das Smartphone ist scharf und füllt gut die Hälfte des Bildes. Auf dem Bildschirm das Formular „Torte bestellen“ mit den Feldern „Sorte“ (ausgefüllt mit „Erdbeer-Sahne“), „Größe“ (ausgefüllt mit „12 Stücke“) und „Abholung“ (ausgefüllt mit „Samstag, 10 Uhr“), zwei Auswahlknöpfen „Mit Schriftzug“ und „Ohne Nüsse“ und dem Knopf „Bestellung senden“. Im Hintergrund unscharf eine Kuchentheke und große Fenster. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Honiggelb, Terrakotta und Olivgrün. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### cafe-suche.webp

- Stelle: Beispielaufbau, Bild „Lokale Suche“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/cafe/cafe-suche.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Ein Smartphone liegt auf einem kleinen Marmortisch in einem hellen Café neben einem Cappuccino und einem Stück Kuchen, von schräg oben fotografiert. Auf dem Bildschirm ein lokales Suchergebnis wie in einer Karten-App: oben das Suchfeld mit „café in der nähe“, darunter der hervorgehobene Eintrag „Dein Café“ mit „Café · Berlin“ und „Geöffnet · schließt 18 Uhr“, drei kleine Knöpfe „Route“, „Anrufen“ und „Website“, daneben ein Kartenausschnitt mit einer Stecknadel. Neutrale Kartendarstellung ohne Logos. Im Hintergrund unscharf eine Kuchentheke und große Fenster. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Honiggelb, Terrakotta und Olivgrün. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

## Arztpraxis (`/branchen/webdesign-arzt`)

### arzt-startseite.webp

- Stelle: Abschnitt „Praxis-Homepage erstellen lassen: was Patienten in den ersten Sekunden suchen“, neben dem langen Text
- Format: Hochformat 2:3, in ChatGPT 1024 × 1536, auf der Website 720 × 1080
- Datei: `public/images/branchen/arzt/arzt-startseite.webp`

```text
Erstelle ein Foto im Hochformat 2:3 (1024 × 1536 Pixel). Eine Hand hält ein modernes Smartphone senkrecht vor die Kamera, aufgenommen in einer modernen, hellen Hausarztpraxis. Das Smartphone ist scharf und füllt gut die Hälfte des Bildes. Auf dem Bildschirm die Startseite einer Website für eine Hausarztpraxis: oben links das Logo „Deine Praxis“, die große Überschrift „Deine Hausarztpraxis im Kiez“, ein farbiger Knopf „Termin anfragen“ und darunter drei Kacheln „Sprechzeiten“, „Team“ und „Rezepte“. Im Hintergrund unscharf ein freundlicher Wartebereich mit Pflanzen. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Türkis, Hellblau und Mint. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### arzt-angebot.webp

- Stelle: Beispielaufbau, Bild „Leistungen“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/arzt/arzt-angebot.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Ein Tablet liegt am Empfangstresen einer modernen, hellen Hausarztpraxis, von schräg oben fotografiert. Auf dem Bildschirm die Seite „Leistungen der Praxis“ mit sechs Kacheln, jede mit einem einfachen Symbol und einem Titel: „Vorsorge“, „Impfungen“, „Hausbesuche“, „Labor“, „Videosprechstunde“ und „Rezepte“. Im Hintergrund unscharf ein freundlicher Wartebereich mit Pflanzen. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Türkis, Hellblau und Mint. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### arzt-anfrage.webp

- Stelle: Beispielaufbau, Bild „Terminanfrage“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/arzt/arzt-anfrage.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Eine Hand hält ein Smartphone leicht schräg ins Bild, aufgenommen in einer modernen, hellen Hausarztpraxis. Das Smartphone steht im rechten Bilddrittel. Auf dem Bildschirm das Formular „Termin anfragen“ mit den Feldern „Anliegen“ (ausgefüllt mit „Vorsorge“), „Versicherung“ (ausgefüllt mit „gesetzlich“) und „Wunschzeit“ (ausgefüllt mit „vormittags“), zwei Auswahlknöpfen „Neu in der Praxis“ und „Rückruf“ und dem Knopf „Anfrage senden“. Im Hintergrund unscharf ein freundlicher Wartebereich mit Pflanzen. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Türkis, Hellblau und Mint. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### arzt-suche.webp

- Stelle: Beispielaufbau, Bild „Lokale Suche“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/arzt/arzt-suche.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Ein Smartphone liegt am Empfangstresen einer modernen, hellen Hausarztpraxis neben einer Versichertenkarte ohne lesbare Daten, von schräg oben fotografiert. Auf dem Bildschirm ein lokales Suchergebnis wie in einer Karten-App: oben das Suchfeld mit „hausarzt berlin pankow“, darunter der hervorgehobene Eintrag „Deine Praxis“ mit „Hausarztpraxis · Berlin“ und „Geöffnet · schließt 18 Uhr“, drei kleine Knöpfe „Route“, „Anrufen“ und „Website“, daneben ein Kartenausschnitt mit einer Stecknadel. Neutrale Kartendarstellung ohne Logos. Im Hintergrund unscharf ein freundlicher Wartebereich mit Pflanzen. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Türkis, Hellblau und Mint. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

## Physiotherapie (`/branchen/webdesign-physiotherapie`)

### physiotherapie-startseite.webp

- Stelle: Beispielaufbau, Bild „Startseite“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/physiotherapie/physiotherapie-startseite.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Ein aufgeklappter Laptop steht in einem hellen Behandlungsraum einer Physiotherapiepraxis, leicht von der Seite fotografiert. Auf dem Bildschirm die Startseite einer Website für eine Physiotherapiepraxis: oben links das Logo „Deine Physiopraxis“, die große Überschrift „Physiotherapie in deinem Kiez“, ein farbiger Knopf „Termin anfragen“ und darunter drei Kacheln „Therapien“, „Termine“ und „Rezept“. Im Hintergrund unscharf eine Therapieliege, eine Faszienrolle und Therabänder. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Türkis, Hellblau und Mint. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### physiotherapie-angebot.webp

- Stelle: Abschnitt „Webdesign für Physiotherapie: jede Therapie verständlich erklärt“, neben dem langen Text
- Format: Hochformat 2:3, in ChatGPT 1024 × 1536, auf der Website 720 × 1080
- Datei: `public/images/branchen/physiotherapie/physiotherapie-angebot.webp`

```text
Erstelle ein Foto im Hochformat 2:3 (1024 × 1536 Pixel). Eine Hand hält ein modernes Smartphone senkrecht vor die Kamera, aufgenommen in einem hellen Behandlungsraum einer Physiotherapiepraxis. Das Smartphone ist scharf und füllt gut die Hälfte des Bildes. Auf dem Bildschirm die Seite „Therapien“ mit sechs Kacheln, jede mit einem einfachen Symbol und einem Titel: „Krankengymnastik“, „Manuelle Therapie“, „Lymphdrainage“, „Massage“, „Hausbesuch“ und „Gerätetraining“. Im Hintergrund unscharf eine Therapieliege, eine Faszienrolle und Therabänder. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Türkis, Hellblau und Mint. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### physiotherapie-anfrage.webp

- Stelle: Beispielaufbau, Bild „Terminanfrage“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/physiotherapie/physiotherapie-anfrage.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Eine Hand hält ein Smartphone leicht schräg ins Bild, aufgenommen in einem hellen Behandlungsraum einer Physiotherapiepraxis. Das Smartphone steht im rechten Bilddrittel. Auf dem Bildschirm das Formular „Termin anfragen“ mit den Feldern „Verordnung“ (ausgefüllt mit „Krankengymnastik“), „Versicherung“ (ausgefüllt mit „gesetzlich“) und „Wunschzeit“ (ausgefüllt mit „nach 16 Uhr“), zwei Auswahlknöpfen „Mit Rezept“ und „Selbstzahler“ und dem Knopf „Termin anfragen“. Im Hintergrund unscharf eine Therapieliege, eine Faszienrolle und Therabänder. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Türkis, Hellblau und Mint. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### physiotherapie-suche.webp

- Stelle: Beispielaufbau, Bild „Lokale Suche“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/physiotherapie/physiotherapie-suche.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Ein Smartphone liegt in einem hellen Behandlungsraum einer Physiotherapiepraxis neben einem Therapieband, von schräg oben fotografiert. Auf dem Bildschirm ein lokales Suchergebnis wie in einer Karten-App: oben das Suchfeld mit „physiotherapie in der nähe“, darunter der hervorgehobene Eintrag „Deine Physiopraxis“ mit „Physiotherapie · Berlin“ und „Geöffnet · schließt 19 Uhr“, drei kleine Knöpfe „Route“, „Anrufen“ und „Website“, daneben ein Kartenausschnitt mit einer Stecknadel. Neutrale Kartendarstellung ohne Logos. Im Hintergrund unscharf eine Therapieliege, eine Faszienrolle und Therabänder. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Türkis, Hellblau und Mint. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

## Hebamme (`/branchen/webdesign-hebamme`)

### hebamme-startseite.webp

- Stelle: Beispielaufbau, Bild „Startseite“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/hebamme/hebamme-startseite.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Ein aufgeklappter Laptop steht auf einem Sofa in einem gemütlichen, hellen Wohnzimmer, leicht von der Seite fotografiert. Auf dem Bildschirm die Startseite einer Website für eine freiberufliche Hebamme: oben links das Logo „Deine Hebamme“, die große Überschrift „Hebammenbetreuung in deinem Bezirk“, ein farbiger Knopf „Betreuung anfragen“ und darunter drei Kacheln „Vorsorge“, „Kurse“ und „Wochenbett“. Im Hintergrund unscharf Kissen, eine Decke und eine Tasse Tee. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Sonnengelb, Mint, Hellblau und Apricot. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### hebamme-angebot.webp

- Stelle: Abschnitt „Hebammen-Website erstellen lassen: Kurse mit Termin, Ort und freien Plätzen“, neben dem langen Text
- Format: Hochformat 2:3, in ChatGPT 1024 × 1536, auf der Website 720 × 1080
- Datei: `public/images/branchen/hebamme/hebamme-angebot.webp`

```text
Erstelle ein Foto im Hochformat 2:3 (1024 × 1536 Pixel). Eine Hand hält ein modernes Smartphone senkrecht vor die Kamera, aufgenommen in einem gemütlichen, hellen Wohnzimmer. Das Smartphone ist scharf und füllt gut die Hälfte des Bildes. Auf dem Bildschirm die Seite „Leistungen und Kurse“ mit sechs Kacheln, jede mit einem einfachen Symbol und einem Titel: „Vorsorge“, „Geburtsvorbereitung“, „Wochenbett“, „Rückbildung“, „Stillberatung“ und „Babymassage“. Im Hintergrund unscharf Kissen, eine Decke und eine Tasse Tee. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Sonnengelb, Mint, Hellblau und Apricot. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### hebamme-anfrage.webp

- Stelle: Beispielaufbau, Bild „Betreuungsanfrage“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/hebamme/hebamme-anfrage.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Eine Hand hält ein Smartphone leicht schräg ins Bild, aufgenommen in einem gemütlichen, hellen Wohnzimmer. Das Smartphone steht im rechten Bilddrittel. Auf dem Bildschirm das Formular „Betreuung anfragen“ mit den Feldern „Entbindungstermin“ (ausgefüllt mit „Mitte März“), „Wohnort“ (ausgefüllt mit „Berlin-Pankow“) und „Wunsch“ (ausgefüllt mit „Wochenbett“), zwei Auswahlknöpfen „Vorsorge“ und „Kurs“ und dem Knopf „Anfrage senden“. Im Hintergrund unscharf Kissen, eine Decke und eine Tasse Tee. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Sonnengelb, Mint, Hellblau und Apricot. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### hebamme-suche.webp

- Stelle: Beispielaufbau, Bild „Lokale Suche“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/hebamme/hebamme-suche.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Ein Smartphone liegt auf einem Sofa in einem gemütlichen, hellen Wohnzimmer neben einer Tasse Tee, von schräg oben fotografiert. Auf dem Bildschirm ein lokales Suchergebnis wie in einer Karten-App: oben das Suchfeld mit „hebamme berlin pankow“, darunter der hervorgehobene Eintrag „Deine Hebamme“ mit „Hebamme · Berlin“ und „Termine nach Vereinbarung“, drei kleine Knöpfe „Route“, „Anrufen“ und „Website“, daneben ein Kartenausschnitt mit einer Stecknadel. Neutrale Kartendarstellung ohne Logos. Im Hintergrund unscharf Kissen, eine Decke und eine Tasse Tee. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Sonnengelb, Mint, Hellblau und Apricot. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

## Steuerberater (`/branchen/webdesign-steuerberater`)

### steuerberater-startseite.webp

- Stelle: Beispielaufbau, Bild „Startseite“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/steuerberater/steuerberater-startseite.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Ein aufgeklappter Laptop steht auf einem aufgeräumten Schreibtisch in einer modernen Kanzlei, leicht von der Seite fotografiert. Auf dem Bildschirm die Startseite einer Website für eine Steuerberatungskanzlei: oben links das Logo „Deine Kanzlei“, die große Überschrift „Steuerberatung für Selbstständige in Berlin“, ein farbiger Knopf „Erstgespräch anfragen“ und darunter drei Kacheln „Buchhaltung“, „Jahresabschluss“ und „Digital“. Im Hintergrund unscharf ein Regal mit Ordnern und eine Pflanze. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Kornblumenblau, Petrol und Sandgelb. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### steuerberater-angebot.webp

- Stelle: Abschnitt „Kanzlei-Website erstellen lassen: nach Mandantengruppen statt nach Leistungsliste“, neben dem langen Text
- Format: Hochformat 2:3, in ChatGPT 1024 × 1536, auf der Website 720 × 1080
- Datei: `public/images/branchen/steuerberater/steuerberater-angebot.webp`

```text
Erstelle ein Foto im Hochformat 2:3 (1024 × 1536 Pixel). Eine Hand hält ein modernes Smartphone senkrecht vor die Kamera, aufgenommen in einer modernen Steuerkanzlei. Das Smartphone ist scharf und füllt gut die Hälfte des Bildes. Auf dem Bildschirm die Seite „Leistungen der Kanzlei“ mit sechs Kacheln, jede mit einem einfachen Symbol und einem Titel: „Buchhaltung“, „Lohnabrechnung“, „Jahresabschluss“, „Steuererklärung“, „Gründung“ und „Beratung“. Im Hintergrund unscharf ein Regal mit Ordnern und eine Pflanze. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Kornblumenblau, Petrol und Sandgelb. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### steuerberater-anfrage.webp

- Stelle: Beispielaufbau, Bild „Mandatsanfrage“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/steuerberater/steuerberater-anfrage.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Eine Hand hält ein Smartphone leicht schräg ins Bild, aufgenommen in einer modernen Steuerkanzlei. Das Smartphone steht im rechten Bilddrittel. Auf dem Bildschirm das Formular „Mandat anfragen“ mit den Feldern „Rechtsform“ (ausgefüllt mit „Einzelunternehmen“), „Anliegen“ (ausgefüllt mit „Buchhaltung“) und „Start“ (ausgefüllt mit „zum Quartal“), zwei Auswahlknöpfen „Neugründung“ und „Wechsel“ und dem Knopf „Anfrage senden“. Im Hintergrund unscharf ein Regal mit Ordnern und eine Pflanze. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Kornblumenblau, Petrol und Sandgelb. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### steuerberater-suche.webp

- Stelle: Beispielaufbau, Bild „Lokale Suche“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/steuerberater/steuerberater-suche.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Ein Smartphone liegt auf einem aufgeräumten Schreibtisch in einer modernen Kanzlei neben einem Füller und einem Notizblock, von schräg oben fotografiert. Auf dem Bildschirm ein lokales Suchergebnis wie in einer Karten-App: oben das Suchfeld mit „steuerberater berlin pankow“, darunter der hervorgehobene Eintrag „Deine Kanzlei“ mit „Steuerberater · Berlin“ und „Geöffnet · schließt 17 Uhr“, drei kleine Knöpfe „Route“, „Anrufen“ und „Website“, daneben ein Kartenausschnitt mit einer Stecknadel. Neutrale Kartendarstellung ohne Logos. Im Hintergrund unscharf ein Regal mit Ordnern und eine Pflanze. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Kornblumenblau, Petrol und Sandgelb. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

## Kfz-Werkstatt (`/branchen/webdesign-autowerkstatt`)

### autowerkstatt-startseite.webp

- Stelle: Beispielaufbau, Bild „Startseite“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/autowerkstatt/autowerkstatt-startseite.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Ein aufgeklappter Laptop steht auf einer sauberen Werkbank in einer Kfz-Werkstatt, leicht von der Seite fotografiert. Auf dem Bildschirm die Startseite einer Website für eine freie Kfz-Werkstatt: oben links das Logo „Deine Werkstatt“, die große Überschrift „Kfz-Werkstatt in deinem Kiez“, ein farbiger Knopf „Termin anfragen“ und darunter drei Kacheln „Inspektion“, „HU/AU“ und „Ölwechsel“. Im Hintergrund unscharf ein Auto auf der Hebebühne und Werkzeugwagen. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Orange, Himmelblau und Limettengrün. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### autowerkstatt-angebot.webp

- Stelle: Abschnitt „Webdesign für Kfz-Werkstätten: Leistungen so erklären, dass niemand nachfragen muss“, neben dem langen Text
- Format: Hochformat 2:3, in ChatGPT 1024 × 1536, auf der Website 720 × 1080
- Datei: `public/images/branchen/autowerkstatt/autowerkstatt-angebot.webp`

```text
Erstelle ein Foto im Hochformat 2:3 (1024 × 1536 Pixel). Eine Hand hält ein modernes Smartphone senkrecht vor die Kamera, aufgenommen in einer sauberen Kfz-Werkstatt. Das Smartphone ist scharf und füllt gut die Hälfte des Bildes. Auf dem Bildschirm die Seite „Leistungen der Werkstatt“ mit sechs Kacheln, jede mit einem einfachen Symbol und einem Titel: „Inspektion“, „Ölwechsel“, „Bremsen“, „HU/AU“, „Klimaservice“ und „Batterie“. Im Hintergrund unscharf ein Auto auf der Hebebühne und Werkzeugwagen. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Orange, Himmelblau und Limettengrün. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### autowerkstatt-anfrage.webp

- Stelle: Beispielaufbau, Bild „Terminanfrage“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/autowerkstatt/autowerkstatt-anfrage.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Eine Hand hält ein Smartphone leicht schräg ins Bild, aufgenommen in einer sauberen Kfz-Werkstatt. Das Smartphone steht im rechten Bilddrittel. Auf dem Bildschirm das Formular „Werkstatttermin“ mit den Feldern „Fahrzeug“ (ausgefüllt mit „Kompaktwagen, Bj. 2018“), „Anliegen“ (ausgefüllt mit „Inspektion“) und „Wunschtag“ (ausgefüllt mit „Donnerstag“), zwei Auswahlknöpfen „Ersatzwagen“ und „Rückruf“ und dem Knopf „Termin anfragen“. Im Hintergrund unscharf ein Auto auf der Hebebühne und Werkzeugwagen. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Orange, Himmelblau und Limettengrün. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### autowerkstatt-suche.webp

- Stelle: Beispielaufbau, Bild „Lokale Suche“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/autowerkstatt/autowerkstatt-suche.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Ein Smartphone liegt auf einer sauberen Werkbank in einer Kfz-Werkstatt neben einem Autoschlüssel, von schräg oben fotografiert. Auf dem Bildschirm ein lokales Suchergebnis wie in einer Karten-App: oben das Suchfeld mit „autowerkstatt in der nähe“, darunter der hervorgehobene Eintrag „Deine Werkstatt“ mit „Autowerkstatt · Berlin“ und „Geöffnet · schließt 18 Uhr“, drei kleine Knöpfe „Route“, „Anrufen“ und „Website“, daneben ein Kartenausschnitt mit einer Stecknadel. Neutrale Kartendarstellung ohne Logos. Im Hintergrund unscharf ein Auto auf der Hebebühne und Werkzeugwagen. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Orange, Himmelblau und Limettengrün. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

## Friseur (`/branchen/webdesign-friseur`)

### friseur-startseite.webp

- Stelle: Beispielaufbau, Bild „Startseite“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/friseur/friseur-startseite.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Ein aufgeklappter Laptop steht an einem Frisierplatz in einem modernen Friseursalon, leicht von der Seite fotografiert. Auf dem Bildschirm die Startseite einer Website für einen Friseursalon: oben links das Logo „Dein Salon“, die große Überschrift „Schnitt und Farbe mit Zeit für dich“, ein farbiger Knopf „Termin buchen“ und darunter drei Kacheln „Schnitt“, „Farbe“ und „Preise“. Im Hintergrund unscharf ein großer Spiegel, Bürsten und ein Föhn. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Rosa, Salbeigrün und ein warmes Gelb. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### friseur-angebot.webp

- Stelle: Abschnitt „Friseur-Website erstellen lassen: eine Preisliste, die auf dem Handy lesbar ist“, neben dem langen Text
- Format: Hochformat 2:3, in ChatGPT 1024 × 1536, auf der Website 720 × 1080
- Datei: `public/images/branchen/friseur/friseur-angebot.webp`

```text
Erstelle ein Foto im Hochformat 2:3 (1024 × 1536 Pixel). Eine Hand hält ein modernes Smartphone senkrecht vor die Kamera, aufgenommen in einem modernen Friseursalon. Das Smartphone ist scharf und füllt gut die Hälfte des Bildes. Auf dem Bildschirm die Seite „Leistungen und Preise“ als gut lesbare Textliste mit den Abschnitten „Damen“ und „Herren und Kinder“, darunter je drei Einträge mit Preis, zum Beispiel „Waschen, Schneiden, Föhnen“ und „Farbe und Strähnen“. Im Hintergrund unscharf ein großer Spiegel, Bürsten und ein Föhn. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Rosa, Salbeigrün und ein warmes Gelb. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### friseur-anfrage.webp

- Stelle: Beispielaufbau, Bild „Terminbuchung“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/friseur/friseur-anfrage.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Eine Hand hält ein Smartphone leicht schräg ins Bild, aufgenommen in einem modernen Friseursalon. Das Smartphone steht im rechten Bilddrittel. Auf dem Bildschirm das Formular „Termin buchen“ mit den Feldern „Leistung“ (ausgefüllt mit „Schnitt und Farbe“), „Wunschtermin“ (ausgefüllt mit „Freitag, 14 Uhr“) und „Stylistin“ (ausgefüllt mit „egal“), zwei Auswahlknöpfen „Zum ersten Mal“ und „Stammkundin“ und dem Knopf „Termin anfragen“. Im Hintergrund unscharf ein großer Spiegel, Bürsten und ein Föhn. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Rosa, Salbeigrün und ein warmes Gelb. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### friseur-suche.webp

- Stelle: Beispielaufbau, Bild „Lokale Suche“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/friseur/friseur-suche.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Ein Smartphone liegt an einem Frisierplatz in einem modernen Friseursalon neben einer Haarbürste und einem Kamm, von schräg oben fotografiert. Auf dem Bildschirm ein lokales Suchergebnis wie in einer Karten-App: oben das Suchfeld mit „friseur in der nähe“, darunter der hervorgehobene Eintrag „Dein Salon“ mit „Friseursalon · Berlin“ und „Geöffnet · schließt 19 Uhr“, drei kleine Knöpfe „Route“, „Anrufen“ und „Website“, daneben ein Kartenausschnitt mit einer Stecknadel. Neutrale Kartendarstellung ohne Logos. Im Hintergrund unscharf ein großer Spiegel, Bürsten und ein Föhn. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Rosa, Salbeigrün und ein warmes Gelb. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

## Kosmetikstudio (`/branchen/webdesign-beautysalon`)

### beautysalon-startseite.webp

- Stelle: Beispielaufbau, Bild „Startseite“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/beautysalon/beautysalon-startseite.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Ein aufgeklappter Laptop steht auf einem Beistelltisch in einem ruhigen, hellen Kosmetikstudio, leicht von der Seite fotografiert. Auf dem Bildschirm die Startseite einer Website für ein Kosmetikstudio: oben links das Logo „Dein Kosmetikstudio“, die große Überschrift „Zeit für dich im Kosmetikstudio“, ein farbiger Knopf „Termin buchen“ und darunter drei Kacheln „Gesicht“, „Nägel“ und „Gutscheine“. Im Hintergrund unscharf eine Behandlungsliege und Pflegeprodukte ohne Markennamen. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Rosa, Salbeigrün und ein warmes Gelb. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### beautysalon-angebot.webp

- Stelle: Abschnitt „Kosmetikstudio-Website erstellen lassen: eine Behandlungsübersicht, die schnell zum Termin führt“, neben dem langen Text
- Format: Hochformat 2:3, in ChatGPT 1024 × 1536, auf der Website 720 × 1080
- Datei: `public/images/branchen/beautysalon/beautysalon-angebot.webp`

```text
Erstelle ein Foto im Hochformat 2:3 (1024 × 1536 Pixel). Eine Hand hält ein modernes Smartphone senkrecht vor die Kamera, aufgenommen in einem ruhigen, hellen Kosmetikstudio. Das Smartphone ist scharf und füllt gut die Hälfte des Bildes. Auf dem Bildschirm die Seite „Behandlungen“ mit sechs Kacheln, jede mit einem einfachen Symbol und einem Titel: „Gesichtsbehandlung“, „Maniküre“, „Pediküre“, „Wimpern“, „Waxing“ und „Gutscheine“. Im Hintergrund unscharf eine Behandlungsliege und Pflegeprodukte ohne Markennamen. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Rosa, Salbeigrün und ein warmes Gelb. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### beautysalon-anfrage.webp

- Stelle: Beispielaufbau, Bild „Terminbuchung“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/beautysalon/beautysalon-anfrage.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Eine Hand hält ein Smartphone leicht schräg ins Bild, aufgenommen in einem ruhigen, hellen Kosmetikstudio. Das Smartphone steht im rechten Bilddrittel. Auf dem Bildschirm das Formular „Termin buchen“ mit den Feldern „Behandlung“ (ausgefüllt mit „Gesichtsbehandlung“), „Wunschtermin“ (ausgefüllt mit „Mittwoch, 17 Uhr“) und „Hinweis“ (ausgefüllt mit „empfindliche Haut“), zwei Auswahlknöpfen „Erstbesuch“ und „Gutschein“ und dem Knopf „Termin anfragen“. Im Hintergrund unscharf eine Behandlungsliege und Pflegeprodukte ohne Markennamen. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Rosa, Salbeigrün und ein warmes Gelb. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### beautysalon-suche.webp

- Stelle: Beispielaufbau, Bild „Lokale Suche“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/beautysalon/beautysalon-suche.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Ein Smartphone liegt auf einem Beistelltisch in einem ruhigen, hellen Kosmetikstudio neben einer kleinen Glasflasche ohne Etikett, von schräg oben fotografiert. Auf dem Bildschirm ein lokales Suchergebnis wie in einer Karten-App: oben das Suchfeld mit „kosmetikstudio in der nähe“, darunter der hervorgehobene Eintrag „Dein Kosmetikstudio“ mit „Kosmetikstudio · Berlin“ und „Geöffnet · schließt 19 Uhr“, drei kleine Knöpfe „Route“, „Anrufen“ und „Website“, daneben ein Kartenausschnitt mit einer Stecknadel. Neutrale Kartendarstellung ohne Logos. Im Hintergrund unscharf eine Behandlungsliege und Pflegeprodukte ohne Markennamen. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Rosa, Salbeigrün und ein warmes Gelb. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

## Fotograf (`/branchen/webdesign-fotograf`)

### fotograf-startseite.webp

- Stelle: Beispielaufbau, Bild „Startseite“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/fotograf/fotograf-startseite.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Ein aufgeklappter Laptop steht auf einem Schreibtisch in einem kleinen Fotostudio, leicht von der Seite fotografiert. Auf dem Bildschirm die Startseite einer Website für ein Fotostudio: oben links das Logo „Dein Fotostudio“, die große Überschrift „Fotos, die nach dir aussehen“, ein farbiger Knopf „Shooting anfragen“ und darunter drei Kacheln „Portfolio“, „Preise“ und „Termine“. Im Hintergrund unscharf ein Fotohintergrund und eine Studioleuchte. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Kornblumenblau, Petrol und Sandgelb. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### fotograf-angebot.webp

- Stelle: Abschnitt „Webdesign für Fotografen: Portfolio, Pakete und Anfrage auf einer Seite“, neben dem langen Text
- Format: Hochformat 2:3, in ChatGPT 1024 × 1536, auf der Website 720 × 1080
- Datei: `public/images/branchen/fotograf/fotograf-angebot.webp`

```text
Erstelle ein Foto im Hochformat 2:3 (1024 × 1536 Pixel). Eine Hand hält ein modernes Smartphone senkrecht vor die Kamera, aufgenommen in einem kleinen Fotostudio. Das Smartphone ist scharf und füllt gut die Hälfte des Bildes. Auf dem Bildschirm die Seite „Portfolio“ mit sechs Kacheln, jede mit einem einfachen Symbol und einem Titel: „Hochzeit“, „Business“, „Familie“, „Porträt“, „Event“ und „Produkt“. Im Hintergrund unscharf ein Fotohintergrund und eine Studioleuchte. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Kornblumenblau, Petrol und Sandgelb. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### fotograf-anfrage.webp

- Stelle: Beispielaufbau, Bild „Shooting-Anfrage“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/fotograf/fotograf-anfrage.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Eine Hand hält ein Smartphone leicht schräg ins Bild, aufgenommen in einem kleinen Fotostudio. Das Smartphone steht im rechten Bilddrittel. Auf dem Bildschirm das Formular „Shooting anfragen“ mit den Feldern „Art“ (ausgefüllt mit „Hochzeit“), „Datum“ (ausgefüllt mit „14. Juni“) und „Ort“ (ausgefüllt mit „Potsdam“), zwei Auswahlknöpfen „Ganztags“ und „Halbtags“ und dem Knopf „Anfrage senden“. Im Hintergrund unscharf ein Fotohintergrund und eine Studioleuchte. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Kornblumenblau, Petrol und Sandgelb. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### fotograf-suche.webp

- Stelle: Beispielaufbau, Bild „Lokale Suche“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/fotograf/fotograf-suche.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Ein Smartphone liegt auf einem Schreibtisch in einem kleinen Fotostudio neben einer Kamera ohne sichtbaren Markennamen, von schräg oben fotografiert. Auf dem Bildschirm ein lokales Suchergebnis wie in einer Karten-App: oben das Suchfeld mit „hochzeitsfotograf berlin“, darunter der hervorgehobene Eintrag „Dein Fotostudio“ mit „Fotograf · Berlin“ und „Termine nach Vereinbarung“, drei kleine Knöpfe „Route“, „Anrufen“ und „Website“, daneben ein Kartenausschnitt mit einer Stecknadel. Neutrale Kartendarstellung ohne Logos. Im Hintergrund unscharf ein Fotohintergrund und eine Studioleuchte. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Kornblumenblau, Petrol und Sandgelb. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

## Tattoostudio (`/branchen/webdesign-tattoo`)

### tattoo-startseite.webp

- Stelle: Beispielaufbau, Bild „Startseite“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/tattoo/tattoo-startseite.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Ein aufgeklappter Laptop steht auf der Arbeitsfläche eines sauberen, hellen Tattoostudios, leicht von der Seite fotografiert. Auf dem Bildschirm die Startseite einer Website für ein Tattoostudio: oben links das Logo „Dein Tattoostudio“, die große Überschrift „Tattoos mit eigener Handschrift“, ein farbiger Knopf „Termin anfragen“ und darunter drei Kacheln „Galerie“, „Artists“ und „Hygiene“. Im Hintergrund unscharf Skizzen an der Wand und ein Behandlungsstuhl. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Orange, Himmelblau und Limettengrün. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### tattoo-angebot.webp

- Stelle: Abschnitt „Webdesign für Tattoo-Studios: Stile, Artists und Wanna-dos auf einen Blick“, neben dem langen Text
- Format: Hochformat 2:3, in ChatGPT 1024 × 1536, auf der Website 720 × 1080
- Datei: `public/images/branchen/tattoo/tattoo-angebot.webp`

```text
Erstelle ein Foto im Hochformat 2:3 (1024 × 1536 Pixel). Eine Hand hält ein modernes Smartphone senkrecht vor die Kamera, aufgenommen in einem sauberen, hellen Tattoostudio. Das Smartphone ist scharf und füllt gut die Hälfte des Bildes. Auf dem Bildschirm die Seite „Stile und Artists“ mit sechs Kacheln, jede mit einem einfachen Symbol und einem Titel: „Fineline“, „Blackwork“, „Realistic“, „Lettering“, „Cover-up“ und „Wanna-dos“. Im Hintergrund unscharf Skizzen an der Wand und ein Behandlungsstuhl. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Orange, Himmelblau und Limettengrün. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### tattoo-anfrage.webp

- Stelle: Beispielaufbau, Bild „Tattoo-Anfrage“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/tattoo/tattoo-anfrage.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Eine Hand hält ein Smartphone leicht schräg ins Bild, aufgenommen in einem sauberen, hellen Tattoostudio. Das Smartphone steht im rechten Bilddrittel. Auf dem Bildschirm das Formular „Tattoo anfragen“ mit den Feldern „Motiv“ (ausgefüllt mit „Fineline-Blume“), „Körperstelle“ (ausgefüllt mit „Unterarm“) und „Größe“ (ausgefüllt mit „ca. 10 cm“), zwei Auswahlknöpfen „Beratung“ und „Wanna-do“ und dem Knopf „Anfrage senden“. Im Hintergrund unscharf Skizzen an der Wand und ein Behandlungsstuhl. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Orange, Himmelblau und Limettengrün. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### tattoo-suche.webp

- Stelle: Beispielaufbau, Bild „Lokale Suche“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/tattoo/tattoo-suche.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Ein Smartphone liegt auf der Arbeitsfläche eines sauberen, hellen Tattoostudios neben einem Skizzenblock mit einer Zeichnung, von schräg oben fotografiert. Auf dem Bildschirm ein lokales Suchergebnis wie in einer Karten-App: oben das Suchfeld mit „tattoostudio berlin“, darunter der hervorgehobene Eintrag „Dein Tattoostudio“ mit „Tattoostudio · Berlin“ und „Geöffnet · schließt 20 Uhr“, drei kleine Knöpfe „Route“, „Anrufen“ und „Website“, daneben ein Kartenausschnitt mit einer Stecknadel. Neutrale Kartendarstellung ohne Logos. Im Hintergrund unscharf Skizzen an der Wand und ein Behandlungsstuhl. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Orange, Himmelblau und Limettengrün. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

## Massage und Wellness (`/branchen/webdesign-wellness`)

### wellness-startseite.webp

- Stelle: Beispielaufbau, Bild „Startseite“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/wellness/wellness-startseite.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Ein aufgeklappter Laptop steht in einem ruhigen Massageraum mit warmem Licht, leicht von der Seite fotografiert. Auf dem Bildschirm die Startseite einer Website für eine Massagepraxis: oben links das Logo „Dein Wellnessstudio“, die große Überschrift „Massagen und Auszeit mitten in Berlin“, ein farbiger Knopf „Termin buchen“ und darunter drei Kacheln „Massagen“, „Gutscheine“ und „Öffnungszeiten“. Im Hintergrund unscharf gerollte Handtücher, eine Massageliege und eine Pflanze. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Rosa, Salbeigrün und ein warmes Gelb. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### wellness-angebot.webp

- Stelle: Abschnitt „Webdesign für Massagepraxen: Massagen so beschreiben, dass die Wahl leichtfällt“, neben dem langen Text
- Format: Hochformat 2:3, in ChatGPT 1024 × 1536, auf der Website 720 × 1080
- Datei: `public/images/branchen/wellness/wellness-angebot.webp`

```text
Erstelle ein Foto im Hochformat 2:3 (1024 × 1536 Pixel). Eine Hand hält ein modernes Smartphone senkrecht vor die Kamera, aufgenommen in einem ruhigen Massageraum mit warmem Licht. Das Smartphone ist scharf und füllt gut die Hälfte des Bildes. Auf dem Bildschirm die Seite „Massagen und Anwendungen“ mit sechs Kacheln, jede mit einem einfachen Symbol und einem Titel: „Klassische Massage“, „Hot Stone“, „Aromaöl“, „Fußreflex“, „Paarmassage“ und „Gutscheine“. Im Hintergrund unscharf gerollte Handtücher, eine Massageliege und eine Pflanze. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Rosa, Salbeigrün und ein warmes Gelb. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### wellness-anfrage.webp

- Stelle: Beispielaufbau, Bild „Gutscheinbestellung“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/wellness/wellness-anfrage.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Eine Hand hält ein Smartphone leicht schräg ins Bild, aufgenommen in einem ruhigen Massageraum mit warmem Licht. Das Smartphone steht im rechten Bilddrittel. Auf dem Bildschirm das Formular „Gutschein bestellen“ mit den Feldern „Wert“ (ausgefüllt mit „60 €“), „Anlass“ (ausgefüllt mit „Geburtstag“) und „Versand“ (ausgefüllt mit „per E-Mail“), zwei Auswahlknöpfen „Zum Ausdrucken“ und „Per Post“ und dem Knopf „Gutschein bestellen“. Im Hintergrund unscharf gerollte Handtücher, eine Massageliege und eine Pflanze. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Rosa, Salbeigrün und ein warmes Gelb. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### wellness-suche.webp

- Stelle: Beispielaufbau, Bild „Lokale Suche“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/wellness/wellness-suche.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Ein Smartphone liegt in einem ruhigen Massageraum mit warmem Licht neben gerollten Handtüchern und einer Kerze, von schräg oben fotografiert. Auf dem Bildschirm ein lokales Suchergebnis wie in einer Karten-App: oben das Suchfeld mit „massage in der nähe“, darunter der hervorgehobene Eintrag „Dein Wellnessstudio“ mit „Massagestudio · Berlin“ und „Geöffnet · schließt 20 Uhr“, drei kleine Knöpfe „Route“, „Anrufen“ und „Website“, daneben ein Kartenausschnitt mit einer Stecknadel. Neutrale Kartendarstellung ohne Logos. Im Hintergrund unscharf gerollte Handtücher, eine Massageliege und eine Pflanze. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Rosa, Salbeigrün und ein warmes Gelb. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

## Handwerker (`/handwerker`)

### handwerker-startseite.webp

- Stelle: Beispielaufbau, Bild „Startseite“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/handwerker/handwerker-startseite.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Ein aufgeklappter Laptop steht auf einer Werkbank in einer aufgeräumten Handwerkerwerkstatt, leicht von der Seite fotografiert. Auf dem Bildschirm die Startseite einer Website für einen Handwerksbetrieb: oben links das Logo „Dein Handwerksbetrieb“, die große Überschrift „Dein Meisterbetrieb für Bad und Heizung“, ein farbiger Knopf „Angebot anfragen“ und darunter drei Kacheln „Leistungen“, „Referenzen“ und „Karriere“. Im Hintergrund unscharf Werkzeug an der Wand und ein unbeschrifteter Transporter. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Orange, Himmelblau und Limettengrün. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### handwerker-angebot.webp

- Stelle: Abschnitt „Webdesign für Baufirmen und Bauunternehmen in Berlin“, neben dem langen Text
- Format: Hochformat 2:3, in ChatGPT 1024 × 1536, auf der Website 720 × 1080
- Datei: `public/images/branchen/handwerker/handwerker-angebot.webp`

```text
Erstelle ein Foto im Hochformat 2:3 (1024 × 1536 Pixel). Eine Hand hält ein modernes Smartphone senkrecht vor die Kamera, aufgenommen in einer aufgeräumten Handwerkerwerkstatt. Das Smartphone ist scharf und füllt gut die Hälfte des Bildes. Auf dem Bildschirm die Seite „Unsere Leistungen“ mit sechs Kacheln, jede mit einem einfachen Symbol und einem Titel: „Badsanierung“, „Heizung“, „Elektro“, „Malerarbeiten“, „Dach“ und „Notdienst“. Im Hintergrund unscharf Werkzeug an der Wand und ein unbeschrifteter Transporter. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Orange, Himmelblau und Limettengrün. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### handwerker-anfrage.webp

- Stelle: Beispielaufbau, Bild „Angebotsanfrage“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/handwerker/handwerker-anfrage.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Eine Hand hält ein Smartphone leicht schräg ins Bild, aufgenommen in einer aufgeräumten Handwerkerwerkstatt. Das Smartphone steht im rechten Bilddrittel. Auf dem Bildschirm das Formular „Angebot anfragen“ mit den Feldern „Leistung“ (ausgefüllt mit „Badsanierung“), „Ort“ (ausgefüllt mit „Berlin-Spandau“) und „Zeitraum“ (ausgefüllt mit „ab März“), zwei Auswahlknöpfen „Fotos hochladen“ und „Rückruf“ und dem Knopf „Anfrage senden“. Im Hintergrund unscharf Werkzeug an der Wand und ein unbeschrifteter Transporter. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Orange, Himmelblau und Limettengrün. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

### handwerker-suche.webp

- Stelle: Beispielaufbau, Bild „Lokale Suche“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/handwerker/handwerker-suche.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Ein Smartphone liegt auf einer Werkbank in einer aufgeräumten Handwerkerwerkstatt neben einem Zollstock und einem Bleistift, von schräg oben fotografiert. Auf dem Bildschirm ein lokales Suchergebnis wie in einer Karten-App: oben das Suchfeld mit „handwerker berlin spandau“, darunter der hervorgehobene Eintrag „Dein Handwerksbetrieb“ mit „Handwerksbetrieb · Berlin“ und „Geöffnet · schließt 17 Uhr“, drei kleine Knöpfe „Route“, „Anrufen“ und „Website“, daneben ein Kartenausschnitt mit einer Stecknadel. Neutrale Kartendarstellung ohne Logos. Im Hintergrund unscharf Werkzeug an der Wand und ein unbeschrifteter Transporter. Stil: realistisches Foto mit natürlichem Licht und leichter Unschärfe im Hintergrund, ruhige und freundliche Stimmung, Akzentfarben Orange, Himmelblau und Limettengrün. Alle Texte auf dem Bildschirm auf Deutsch, kurz und gut lesbar. Keine echten Marken, Logos oder Firmennamen, keine Logos von Google, Apple oder anderen Herstellern. Keine erkennbaren Gesichter.
```

## Kita und Kindertagespflege (`/branchen/webdesign-kita`)

### kita-hero.webp

- Stelle: Hero oben auf der Seite
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 960 × 640
- Datei: `public/images/branchen/kita/kita-hero.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Blick in einen hellen, freundlichen Gruppenraum einer Berliner Kita am Morgen: niedrige Holztische mit kleinen Stühlen, ein offenes Regal mit Bilderbüchern und Holzspielzeug, große Fenster mit Blick auf Bäume. Auf einem Tisch ein aufgeklappter Laptop, auf dem Bildschirm die Startseite einer Kita-Website mit der Überschrift „Willkommen in unserer Kita“ und dem Knopf „Platz anfragen“. Wichtige Inhalte in der Bildmitte, weil das Bild später auch als 4:3-Ausschnitt genutzt wird. Stil: realistisches Foto mit weichem Tageslicht, warme und ruhige Stimmung, Akzentfarben Sonnengelb, Mint, Hellblau und Apricot. Keine Kinder mit erkennbarem Gesicht, höchstens von hinten oder stark unscharf. Keine lesbaren Namen, keine Logos.
```

### kita-tagespflege.webp

- Stelle: Abschnitt Kindertagespflege, neben dem langen Text
- Format: Hochformat 2:3, in ChatGPT 1024 × 1536, auf der Website 720 × 1080
- Datei: `public/images/branchen/kita/kita-tagespflege.webp`

```text
Erstelle ein Foto im Hochformat 2:3 (1024 × 1536 Pixel). Gemütliche Spielecke bei einer Tagesmutter in einer Berliner Altbauwohnung: ein runder, heller Teppich, ein niedriges Regal mit Körben und Bilderbüchern, ein Turm aus Holzbauklötzen, ein Fenster mit Tageslicht und einer Pflanze. Die Hände einer Erwachsenen stapeln gerade einen Bauklotz, sonst keine Personen. Stil: realistisches Foto mit weichem Tageslicht, warme und ruhige Stimmung, Akzentfarben Sonnengelb, Mint, Hellblau und Apricot. Keine Kinder mit erkennbarem Gesicht, höchstens von hinten oder stark unscharf. Keine lesbaren Namen, keine Logos.
```

### kita-raeume.webp

- Stelle: Einblicke, Bild „Räume“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/kita/kita-raeume.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Heller Gruppenraum einer Kita: kleiner Tisch mit Stühlen, Regal mit beschrifteten Kisten ohne lesbare Namen, bunte Wimpelkette, großes Fenster, Holzboden. Aufgeräumt und einladend, ohne Personen. Stil: realistisches Foto mit weichem Tageslicht, warme und ruhige Stimmung, Akzentfarben Sonnengelb, Mint, Hellblau und Apricot. Keine Kinder mit erkennbarem Gesicht, höchstens von hinten oder stark unscharf. Keine lesbaren Namen, keine Logos.
```

### kita-garten.webp

- Stelle: Einblicke, Bild „Garten und Umgebung“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/kita/kita-garten.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Außengelände einer Kita im Sommer: Sandkasten mit Eimer und Schaufel, eine Holzrutsche, ein großer Apfelbaum, ein weißer Holzzaun und Rasen mit ein paar Blumen. Sonniger Vormittag, ohne Personen. Stil: realistisches Foto mit weichem Tageslicht, warme und ruhige Stimmung, Akzentfarben Sonnengelb, Mint, Hellblau und Apricot. Keine Kinder mit erkennbarem Gesicht, höchstens von hinten oder stark unscharf. Keine lesbaren Namen, keine Logos.
```

### kita-team.webp

- Stelle: Einblicke, Bild „Team und Alltag“
- Format: Querformat 3:2, in ChatGPT 1536 × 1024, auf der Website 720 × 480
- Datei: `public/images/branchen/kita/kita-team.webp`

```text
Erstelle ein Foto im Querformat 3:2 (1536 × 1024 Pixel). Kita-Garderobe mit niedrigen Haken: kleine bunte Jacken, Kinderrucksäcke, darunter Gummistiefel in einer Reihe, über jedem Haken ein Symbolbild statt eines Namens. Warmes Licht, ohne Personen. Stil: realistisches Foto mit weichem Tageslicht, warme und ruhige Stimmung, Akzentfarben Sonnengelb, Mint, Hellblau und Apricot. Keine Kinder mit erkennbarem Gesicht, höchstens von hinten oder stark unscharf. Keine lesbaren Namen, keine Logos.
```

