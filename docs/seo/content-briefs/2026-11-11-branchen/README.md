# Branchenseiten: Ausbau vom 11.11.2026

Alle Branchenseiten haben den Aufbau der Kita-Seite bekommen: dezente Einblend-Animationen,
einen eigenen Themenabschnitt, einen vertiefenden Abschnitt mit Bild, einen Beispielaufbau mit
drei Ansichten und je sechs neue Fragen in der FAQ. Betroffen sind die 16 Seiten unter
`/branchen/webdesign-…` und `/handwerker`.

Am 12.11.2026 kam eine zweite Runde dazu: Der Zeitstrahl, den zuerst alle Seiten hatten, passte
nicht zu jeder Branche. Jede Seite hat jetzt stattdessen einen eigenen Abschnitt zu einem Thema,
nach dem in dieser Branche gesucht wird, jeweils mit eigenem Aufbau (Abschnitt 2). Nur die
Kita-Seite behält ihren Tagesablauf, weil er dort selbst das Thema ist. Die ChatGPT-Prompts für
alle Bildplätze stehen in [bild-prompts.md](bild-prompts.md).

## 1. Ausgangslage in der Google Search Console

Stand der Daten: 07.11.2026, Zeitraum 35 Tage. Keine der Seiten hatte in dieser Zeit einen Klick.

| Seite | Impressionen | Mittlere Position |
|---|---|---|
| `/branchen/webdesign-fitnesscoach` | 268 | 64,6 |
| `/branchen/webdesign-blumenladen` | 138 | 42,1 |
| `/handwerker` | 88 | 54,8 |
| `/branchen/webdesign-reinigung` | 68 | 44,0 |
| `/branchen/webdesign-restaurant` | 51 | 50,9 |
| `/branchen` | 15 | |
| `/branchen/webdesign-immobilienmakler` | 6 | |
| `/branchen/webdesign-cafe` | 3 | |
| `/branchen/webdesign-kita` | 1 | |

Die zehn Seiten aus dem Paket vom 29.10.2026 (Arzt, Physiotherapie, Hebamme, Steuerberater,
Autowerkstatt, Friseur, Beautysalon, Fotograf, Tattoo, Wellness) hatten noch keine Impressionen.

Reihenfolge der Bearbeitung nach Sichtbarkeit: Blumenladen, Fitness, Reinigung, Restaurant,
Handwerker, danach Immobilienmakler und Café, zuletzt die zehn Seiten vom 29.10.

Zum Nachmessen: dieselbe Auswertung frühestens vier Wochen nach dem Livegang wiederholen
(Tabelle `content_search_metrics`, Spalte `metric_date`).

Suchanfragen seit Mai 2026 mit den meisten Impressionen (Impressionen / mittlere Position),
Grundlage für die Themen der eigenen Abschnitte:

- Blumenladen: „professionelle website erstellung für blumenläden“ (160 / 10,7),
  „blumen onlineshop erstellen“ (149 / 20,7), „website erstellen lassen blumenladen“ (105 / 7,7),
  „seo für blumenladen“ (108 / 59,6)
- Fitness: „fitnessstudio website erstellen lassen“ (151 / 68,3), „fitnessstudio website agentur“
  (134 / 77,3), „fitnessstudio website kosten“ (12 / 59,6)
- Reinigung: „webdesign gebäudeservice“ (119 / 79,2), „webdesign gebäudereinigung“ (29 / 32,8),
  „seo für reinigungsfirmen“ (4 / 55,8)
- Handwerker: „webdesign für handwerker berlin“ (111 / 82,0), „website für handwerksbetrieb
  berlin“ (94 / 90,6)
- Weitere: „seo für immobilienmakler berlin“ (25 / 37,0), „seo cafes“ (20 / 60,6),
  „seo friseure“ (6 / 50,7), „seo kfz-werkstätten“ (4 / 86,0), „seo für tätowierer“ (2 / 38,5),
  „gute webseiten steuerberater“ (5 / 96,8)

Dazu kamen Google-Suchvorschläge aus Kundensicht, zum Beispiel „blumen bestellen valentinstag
berlin“, „fitnessstudio kursplan“, „gebäudereinigung berlin charlottenburg“, „physiotherapie bei
bandscheibenvorfall“, „geburtsvorbereitungskurs berlin wochenende“, „freie werkstatt berlin bmw“,
„friseur berlin ohne termin“, „fotoshooting berlin familie“, „massage gutschein in der nähe“ und
„immobilienmakler berlin zehlendorf“.

## 2. Was jede Seite neu hat

- **Themenabschnitt** (`type: 'thema'`, `variant`): ein Suchthema der Branche mit eigenem
  Aufbau. Vorlage in `views/partials/branchen-themen/<variante>.ejs`, Aussehen in
  `public/branchen-themen/<variante>.css`. Jede Seite lädt nur ihr eigenes Stylesheet.
- **Vertiefung** (`type: 'feature'`): ein Thema, zu dem es Suchanfragen gibt und das die Seite
  vorher nur gestreift hat, mit Text, Stichpunkten und einem Bild.
- **Beispielaufbau** (`type: 'gallery'`): drei Ansichten mit Bildunterschrift.
- **FAQ**: je sechs neue Fragen, sie stehen auch im FAQ-Schema.
- **Farbton** (`tone`): steuert die Akzentfarben der Seite in `public/branchen-page.css`.
- **Stand**: Das Inhaltsdatum (`…_CONTENT_UPDATED_ISO`) steht auf dem 11.11.2026 und geht in
  die Sitemap und in die sichtbare Angabe „Stand“ am Seitenende ein.

| Seite | Farbton | Themenabschnitt (Variante) | Vertiefung (mit Bild) | Bild der Vertiefung | Bilder im Beispielaufbau |
|---|---|---|---|---|---|
| `/branchen/webdesign-reinigung` | frisch | SEO für Reinigungsfirmen: Jeder Suchbegriff braucht seine Seite (`suchbegriffe`) | Webdesign für Gebäudeservice: mehrere Leistungen auf einer Website | `reinigung-angebot.webp` | `reinigung-startseite.webp`, `reinigung-anfrage.webp`, `reinigung-suche.webp` |
| `/branchen/webdesign-blumenladen` | floral | SEO für Blumenläden: der Kalender der Anlässe (`anlasskalender`) | Blumen-Onlineshop erstellen lassen: was ein kleiner Shop können muss | `blumenladen-angebot.webp` | `blumenladen-startseite.webp`, `blumenladen-anfrage.webp`, `blumenladen-suche.webp` |
| `/branchen/webdesign-fitnesscoach` | energie | Kursplan auf der Website: lesbar für Mitglieder und für Google (`kursplan`) | Fitnessstudio-Website: Agentur, Baukasten oder Webdesigner? | `fitnesscoach-startseite.webp` | `fitnesscoach-angebot.webp`, `fitnesscoach-anfrage.webp`, `fitnesscoach-suche.webp` |
| `/branchen/webdesign-immobilienmakler` | klar | SEO für Immobilienmakler in Berlin: Lagekenntnis pro Bezirk zeigen (`bezirkskarte`) | Webdesign für Makler: Objekte zeigen, ohne sie doppelt zu pflegen | `immobilienmakler-angebot.webp` | `immobilienmakler-startseite.webp`, `immobilienmakler-anfrage.webp`, `immobilienmakler-suche.webp` |
| `/branchen/webdesign-restaurant` | genuss | Google-Profil und Restaurant-Webseite: was wohin gehört (`profil-website`) | Restaurant-Webseite: warum die Speisekarte die wichtigste Seite ist | `restaurant-angebot.webp` | `restaurant-startseite.webp`, `restaurant-anfrage.webp`, `restaurant-suche.webp` |
| `/branchen/webdesign-cafe` | genuss | SEO für Cafés: Gäste suchen nach Merkmalen, nicht nach Namen (`bon`) | Torten über die Café-Website vorbestellen: so klappt es ohne Zettelwirtschaft | `cafe-anfrage.webp` | `cafe-startseite.webp`, `cafe-angebot.webp`, `cafe-suche.webp` |
| `/branchen/webdesign-arzt` | frisch | Das digitale Praxisschild: was Patienten und Google zuerst brauchen (`praxisschild`) | Praxis-Homepage erstellen lassen: was Patienten in den ersten Sekunden suchen | `arzt-startseite.webp` | `arzt-angebot.webp`, `arzt-anfrage.webp`, `arzt-suche.webp` |
| `/branchen/webdesign-physiotherapie` | frisch | Physiotherapie bei Rücken, Knie, Schulter: Seiten, über die Patienten dich finden (`beschwerden`) | Website für Physiotherapie: jede Therapie verständlich erklärt | `physiotherapie-angebot.webp` | `physiotherapie-startseite.webp`, `physiotherapie-anfrage.webp`, `physiotherapie-suche.webp` |
| `/branchen/webdesign-hebamme` | pastell | Hebamme finden: wann Familien wonach suchen (`schwangerschaft`) | Hebammen-Website erstellen lassen: Kurse mit Termin, Ort und freien Plätzen | `hebamme-angebot.webp` | `hebamme-startseite.webp`, `hebamme-anfrage.webp`, `hebamme-suche.webp` |
| `/branchen/webdesign-steuerberater` | klar | Woran man eine gute Steuerberater-Website erkennt (`pruefbogen`) | Kanzlei-Website erstellen lassen: nach Mandantengruppen statt nach Leistungsliste | `steuerberater-angebot.webp` | `steuerberater-startseite.webp`, `steuerberater-anfrage.webp`, `steuerberater-suche.webp` |
| `/branchen/webdesign-autowerkstatt` | energie | SEO für Kfz-Werkstätten: Marken, Antriebe und Service, nach denen gesucht wird (`kennzeichen`) | Webdesign für Kfz-Werkstätten: Leistungen so erklären, dass niemand nachfragen muss | `autowerkstatt-angebot.webp` | `autowerkstatt-startseite.webp`, `autowerkstatt-anfrage.webp`, `autowerkstatt-suche.webp` |
| `/branchen/webdesign-friseur` | floral | SEO für Friseure: mit Spezialisierungen gefunden werden (`farbfaecher`) | Friseur-Website erstellen lassen: eine Preisliste, die auf dem Handy lesbar ist | `friseur-angebot.webp` | `friseur-startseite.webp`, `friseur-anfrage.webp`, `friseur-suche.webp` |
| `/branchen/webdesign-beautysalon` | floral | Eine Seite pro Behandlung: der Steckbrief, den Neukundinnen suchen (`steckbrief`) | Kosmetikstudio-Website erstellen lassen: eine Behandlungsübersicht, die schnell zum Termin führt | `beautysalon-angebot.webp` | `beautysalon-startseite.webp`, `beautysalon-anfrage.webp`, `beautysalon-suche.webp` |
| `/branchen/webdesign-fotograf` | klar | Fotoshooting in Berlin: eine Seite für jeden Anlass (`kontaktbogen`) | Webdesign für Fotografen: Portfolio, Pakete und Anfrage auf einer Seite | `fotograf-angebot.webp` | `fotograf-startseite.webp`, `fotograf-anfrage.webp`, `fotograf-suche.webp` |
| `/branchen/webdesign-tattoo` | energie | SEO für Tätowierer: Fragen vor dem ersten Termin als eigene Seiten (`flash`) | Webdesign für Tattoo-Studios: Stile, Artists und Wanna-dos auf einen Blick | `tattoo-angebot.webp` | `tattoo-startseite.webp`, `tattoo-anfrage.webp`, `tattoo-suche.webp` |
| `/branchen/webdesign-wellness` | floral | Massage-Gutschein online: die Seite, die vor jedem Anlass gesucht wird (`gutschein`) | Webdesign für Massagepraxen: Massagen so beschreiben, dass die Wahl leichtfällt | `wellness-angebot.webp` | `wellness-startseite.webp`, `wellness-anfrage.webp`, `wellness-suche.webp` |
| `/handwerker` | energie | Einsatzgebiet auf der Website: gefunden werden, wo du arbeitest (`einsatzgebiet`) | Webdesign für Baufirmen und Bauunternehmen in Berlin | `handwerker-angebot.webp` | `handwerker-startseite.webp`, `handwerker-anfrage.webp`, `handwerker-suche.webp` |

`/handwerker` hat ein eigenes Template (`views/handwerker.ejs`). Die Abschnitte heißen dort
`area`, `focus` und `gallery` in `data/handwerkerPage.js`.

Was die Themenabschnitte zeigen:

| Variante | Seite | Aufbau |
|---|---|---|
| `anlasskalender` | Blumenladen | Jahresleiste mit sechs Anlässen, darunter Karten mit „Seite online ab“ |
| `kursplan` | Fitness | Wochenkursplan mit Filter zum Ausprobieren (nur CSS, über `:has`) |
| `suchbegriffe` | Reinigung | Suchfeld, Pfeil und Suchtreffer der passenden Seite |
| `profil-website` | Restaurant | Zwei Kreise: Google-Profil, Website und was auf beide gehört |
| `bon` | Café | Kassenbon mit Merkmalen, nach denen Gäste suchen |
| `praxisschild` | Arztpraxis | Praxisschild mit nummerierten Angaben und Erklärungen |
| `beschwerden` | Physiotherapie | Körperskizze mit sechs Bereichen und Karten je Beschwerde |
| `schwangerschaft` | Hebamme | Maßband von der Schwangerschaft bis nach der Geburt, vier Phasen |
| `pruefbogen` | Steuerberater | Prüfbogen mit acht Punkten und Stempel |
| `kennzeichen` | Kfz-Werkstatt | Suchbegriffe als Nummernschilder: Marken, Antriebe, Service |
| `farbfaecher` | Friseur | Farbfächer, jede Karte eine Spezialisierung |
| `steckbrief` | Kosmetikstudio | Steckbrief einer Behandlung und weitere als Etiketten |
| `kontaktbogen` | Fotograf | Kontaktabzug mit Filmrand, je Bild ein Shooting-Anlass |
| `flash` | Tattoostudio | Flash-Bogen mit Fragen vor dem ersten Termin |
| `gutschein` | Massage und Wellness | Gutschein mit Abriss und vier Punkten zur Gutscheinseite |
| `bezirkskarte` | Immobilienmakler | Kachelkarte der zwölf Bezirke, eigene Bezirke hervorgehoben |
| `einsatzgebiet` | Handwerker | Ringe um den Betrieb: Kerngebiet, regelmäßig, nach Absprache |

## 3. Bildplätze

Je Seite liegen vier Bilder unter `public/images/branchen/<slug>/`, alle als WebP:

- Das Bild neben dem langen Text der Vertiefung ist **hochkant (2:3, 720 × 1080)**. Die Texte daneben
  sind 960 bis 1.170 Pixel hoch, ein Querformat ließe viel leere Fläche. Auf dem Handy ist es
  höchstens 340 Pixel breit.
- Die drei Bilder im Beispielaufbau sind **quer (3:2, 720 × 480)**.

Seit 12.11.2026 sind alle 73 Bilder (auch die fünf der Kita-Seite) mit ChatGPT erzeugt. Die Prompts
stehen in [bild-prompts.md](bild-prompts.md). ChatGPT liefert 1024 × 1536 und 1536 × 1024 als PNG
(rund 2 MB je Bild). Eingebaut sind sie als WebP mit durchschnittlich 60 KB, das größte hat 130 KB.

| Datei | Zeigt |
|---|---|
| `<slug>-startseite.webp` | Startseite auf einem Laptop, bei Fitness und Arzt auf dem Handy hochkant |
| `<slug>-angebot.webp` | Leistungs-, Karten- oder Preisübersicht auf dem Handy, bei Fitness, Arzt und Café auf dem Tablet |
| `<slug>-anfrage.webp` | Formular auf dem Handy, beim Café hochkant |
| `<slug>-suche.webp` | Lokales Suchergebnis mit Karte auf einem quer liegenden Handy |

Die Geräte stehen jeweils in einer passenden Umgebung (Blumenladen, Werkstatt, Praxis …). Die
Alt-Texte nennen Gerät, Umgebung und Bildschirminhalt. Auf der Seite steht bei jedem Bild
„Beispielaufbau“, weil die Bilder keine echten Kundenprojekte zeigen.

So wird ein Bild ersetzt:

1. Bild in ChatGPT im richtigen Format erzeugen (Prompt aus `bild-prompts.md`).
2. Verkleinern und als WebP speichern, so wie bei den jetzigen Bildern:
   `magick bild.png -filter Lanczos -resize 720x1080^ -gravity center -extent 720x1080 -unsharp 0x0.6+0.6+0.01 -strip bild-klein.png`
   und dann `cwebp -q 78 -m 6 -sharp_yuv -metadata none bild-klein.png -o blumenladen-angebot.webp`
   (quer: `720x480`, Kita-Hero: `960x640`).
3. Die Datei unter demselben Namen im selben Ordner ablegen.
4. In `data/<slug>Page.js` (Fitness: `data/fitnessPage.js`) den `alt`-Text prüfen und anpassen,
   falls das Bild etwas anderes zeigt.
5. Bei anderen Maßen auch `width` und `height` in der Datendatei ändern.
6. Bei einem neuen Kita-Hero auch die zwei Varianten neu erzeugen: `kita-hero-mobile.webp`
   (720 × 480, `-q 70`, lädt auf dem Handy über `data/responsiveImages.js`) und
   `kita-hero-720.webp` für die Karte auf `/branchen` (mittiger 4:3-Ausschnitt, aus 1536 × 1024
   also 1365 × 1024, verkleinert auf 720 × 540).

PageSpeed: Das Hero-Foto der Kita-Seite ist ein echtes Foto und damit größer als die frühere
Zeichnung (86 KB statt 15 KB). Auf dem Handy lädt deshalb die 720er-Variante (51 KB). Lighthouse
mobil: 99 (LCP 1,8 s, größtes Element ist der Einleitungstext), Desktop: 100. Blumenladen und Café
liegen mit ihren 40-KB-Hero-Fotos ebenfalls bei 99. Unter etwa 20 KB käme die Seite wieder auf 100,
das schafft ein Foto in 720 px Breite aber nicht ohne sichtbare Qualitätsverluste.

## 4. Technik

- `public/kita-page.css` heißt jetzt `public/branchen-page.css` und gilt für alle Seiten mit
  `motion: true`. Die Farben kommen aus `niche-page--tone-<farbton>`
  (frisch, floral, energie, genuss, klar, pastell).
- Die Animationen nutzen `animate-on-scroll` und `js/slideOnScroll.js`, die es schon gab.
  Wer im Betriebssystem „Bewegung reduzieren“ eingestellt hat, sieht die Inhalte ohne Animation.
- Das Hero-Bild reserviert seine Höhe jetzt über `style="aspect-ratio: auto B / H"` im Template.
  Vorher hob die CSS-Regel `aspect-ratio: auto` die Angabe aus `width`/`height` auf, und der
  Hero wuchs erst beim Laden des Bildes (Layoutverschiebung 0,024 auf der Fitness-Seite).
- Gemeinsame Bausteine der Themenabschnitte stehen in `public/branchen-page.css`: Farben je
  Karte (`.bt-farbe-1` bis `-4`) und das Suchbeispiel mit Lupe (`.bt-query`). Neigungen und
  Bewegungen nutzen `rotate`, `scale` und `translate` statt `transform`, damit sie sich nicht mit
  der Einblend-Animation überschreiben.
- Handy: Abschnittsüberschriften sind bis 480 px Breite 1,6rem groß, unter 360 px 1,4rem.
  Bis 360 px trennt der Browser sehr lange Wörter im Fließtext mit Trennstrich.

## 5. Geprüft vor dem Livegang

- Alle 18 Seiten in fünf Breiten (1366, 1024, 768, 375, 320 px): kein seitliches Scrollen,
  alle Bilder geladen, alle Animationen ausgelöst.
- Kein Wort bricht in einer Überschrift ohne Trennstrich um. Einzige Ausnahme im Fließtext ist
  der lange Verordnungsname auf der Steuerberater-Seite.
- Lighthouse mobil, lokal gemessen: Leistung 99 bis 100, SEO 100, Barrierefreiheit 100,
  Layoutverschiebung 0 (Blumenladen, Fitness, Restaurant, Kita, Handwerker).
- Tests: 2461 von 2486 bestanden, 19 übersprungen. Die sechs Fehlschläge sind die bekannten,
  die nichts mit den Branchenseiten zu tun haben.

Zweite Runde (12.11.2026, Themenabschnitte und neue Bildformate):

- Alle 18 Seiten in fünf Breiten erneut geprüft: kein seitliches Scrollen, alle Bilder geladen.
- Jeder Themenabschnitt per Screenshot am PC (1366 px) und am Handy (375 px) angesehen.
- Lighthouse mobil, lokal gemessen: Fitness, Physiotherapie und Handwerker 100, Café und
  Blumenladen 99, jeweils SEO 100, Barrierefreiheit 100, Layoutverschiebung 0.
- Tests: wieder 2461 von 2486 bestanden, dieselben sechs bekannten Fehlschläge.

## 6. Was offen bleibt

- Echte Bilder statt der Skizzen, siehe Abschnitt 3.
- Die Seiten stehen bei Google noch auf Seite 4 bis 7. Mehr Inhalt und sauberere Technik sind
  die Voraussetzung für bessere Plätze, aber keine Zusage. Ohne Verweise von anderen Websites
  und ohne Klicks aus der Suche bleibt der Sprung auf Seite 1 unsicher.
