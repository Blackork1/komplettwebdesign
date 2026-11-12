# Branchenseiten: Ausbau vom 11.11.2026

Alle Branchenseiten haben den Aufbau der Kita-Seite bekommen: dezente Einblend-Animationen,
einen Zeitstrahl, einen vertiefenden Abschnitt mit Bild, einen Beispielaufbau mit drei Ansichten
und je sechs neue Fragen in der FAQ. Betroffen sind die 16 Seiten unter `/branchen/webdesign-…`
(ohne Kita, die diesen Aufbau schon hatte) und `/handwerker`.

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

## 2. Was jede Seite neu hat

- **Zeitstrahl** (`type: 'timeline'`): sechs Stationen, entweder ein Tag mit der Website oder der
  Weg von der Suche bis zur Anfrage.
- **Vertiefung** (`type: 'feature'`): ein Thema, zu dem es Suchanfragen gibt und das die Seite
  vorher nur gestreift hat, mit Text, Stichpunkten und einem Bild.
- **Beispielaufbau** (`type: 'gallery'`): drei Ansichten mit Bildunterschrift.
- **FAQ**: je sechs neue Fragen, sie stehen auch im FAQ-Schema.
- **Farbton** (`tone`): steuert die Akzentfarben der Seite in `public/branchen-page.css`.
- **Stand**: Das Inhaltsdatum (`…_CONTENT_UPDATED_ISO`) steht auf dem 11.11.2026 und geht in
  die Sitemap und in die sichtbare Angabe „Stand“ am Seitenende ein.

| Seite | Farbton | Zeitstrahl | Vertiefung (mit Bild) | Bild der Vertiefung | Bilder im Beispielaufbau |
|---|---|---|---|---|---|
| `/branchen/webdesign-reinigung` | frisch | Vom Suchbegriff zum Auftrag: so arbeitet deine Website | Webdesign für Gebäudeservice: mehrere Leistungen auf einer Website | `reinigung-angebot.webp` | `reinigung-startseite.webp`, `reinigung-anfrage.webp`, `reinigung-suche.webp` |
| `/branchen/webdesign-blumenladen` | floral | Ein Tag mit deiner Blumenladen-Website | Blumen-Onlineshop erstellen lassen: was ein kleiner Shop können muss | `blumenladen-angebot.webp` | `blumenladen-startseite.webp`, `blumenladen-anfrage.webp`, `blumenladen-suche.webp` |
| `/branchen/webdesign-fitnesscoach` | energie | Ein Tag mit deiner Fitnessstudio-Website | Fitnessstudio-Website: Agentur, Baukasten oder Webdesigner? | `fitnesscoach-startseite.webp` | `fitnesscoach-angebot.webp`, `fitnesscoach-anfrage.webp`, `fitnesscoach-suche.webp` |
| `/branchen/webdesign-immobilienmakler` | klar | Vom Verkaufsgedanken zum Auftrag: der Weg eines Eigentümers über deine Website | Webdesign für Makler: Objekte zeigen, ohne sie doppelt zu pflegen | `immobilienmakler-angebot.webp` | `immobilienmakler-startseite.webp`, `immobilienmakler-anfrage.webp`, `immobilienmakler-suche.webp` |
| `/branchen/webdesign-restaurant` | genuss | Ein Tag mit deiner Restaurant-Website | Restaurant-Webseite: warum die Speisekarte die wichtigste Seite ist | `restaurant-angebot.webp` | `restaurant-startseite.webp`, `restaurant-anfrage.webp`, `restaurant-suche.webp` |
| `/branchen/webdesign-cafe` | genuss | Ein Tag mit deiner Café-Website | Torten über die Café-Website vorbestellen: so klappt es ohne Zettelwirtschaft | `cafe-anfrage.webp` | `cafe-startseite.webp`, `cafe-angebot.webp`, `cafe-suche.webp` |
| `/branchen/webdesign-arzt` | frisch | Ein Tag mit deiner Praxis-Website | Praxis-Homepage erstellen lassen: was Patienten in den ersten Sekunden suchen | `arzt-startseite.webp` | `arzt-angebot.webp`, `arzt-anfrage.webp`, `arzt-suche.webp` |
| `/branchen/webdesign-physiotherapie` | frisch | Ein Tag mit deiner Physio-Website | Website für Physiotherapie: jede Therapie verständlich erklärt | `physiotherapie-angebot.webp` | `physiotherapie-startseite.webp`, `physiotherapie-anfrage.webp`, `physiotherapie-suche.webp` |
| `/branchen/webdesign-hebamme` | pastell | Von der Suche zur Betreuung: der Weg einer Familie über deine Website | Hebammen-Website erstellen lassen: Kurse mit Termin, Ort und freien Plätzen | `hebamme-angebot.webp` | `hebamme-startseite.webp`, `hebamme-anfrage.webp`, `hebamme-suche.webp` |
| `/branchen/webdesign-steuerberater` | klar | Von der Suche zum Mandat: der Weg eines Mandanten über deine Kanzlei-Website | Kanzlei-Website erstellen lassen: nach Mandantengruppen statt nach Leistungsliste | `steuerberater-angebot.webp` | `steuerberater-startseite.webp`, `steuerberater-anfrage.webp`, `steuerberater-suche.webp` |
| `/branchen/webdesign-autowerkstatt` | energie | Ein Tag mit deiner Werkstatt-Website | Webdesign für Kfz-Werkstätten: Leistungen so erklären, dass niemand nachfragen muss | `autowerkstatt-angebot.webp` | `autowerkstatt-startseite.webp`, `autowerkstatt-anfrage.webp`, `autowerkstatt-suche.webp` |
| `/branchen/webdesign-friseur` | floral | Ein Tag mit deiner Salon-Website | Friseur-Website erstellen lassen: eine Preisliste, die auf dem Handy lesbar ist | `friseur-angebot.webp` | `friseur-startseite.webp`, `friseur-anfrage.webp`, `friseur-suche.webp` |
| `/branchen/webdesign-beautysalon` | floral | Von der Suche zum Termin: der Weg einer Neukundin über deine Website | Kosmetikstudio-Website erstellen lassen: eine Behandlungsübersicht, die schnell zum Termin führt | `beautysalon-angebot.webp` | `beautysalon-startseite.webp`, `beautysalon-anfrage.webp`, `beautysalon-suche.webp` |
| `/branchen/webdesign-fotograf` | klar | Von der Suche zur Buchung: der Weg eines Paares über deine Website | Webdesign für Fotografen: Portfolio, Pakete und Anfrage auf einer Seite | `fotograf-angebot.webp` | `fotograf-startseite.webp`, `fotograf-anfrage.webp`, `fotograf-suche.webp` |
| `/branchen/webdesign-tattoo` | energie | Von der Idee zum Termin: der Weg über deine Studio-Website | Webdesign für Tattoo-Studios: Stile, Artists und Wanna-dos auf einen Blick | `tattoo-angebot.webp` | `tattoo-startseite.webp`, `tattoo-anfrage.webp`, `tattoo-suche.webp` |
| `/branchen/webdesign-wellness` | floral | Vom Geschenk zum Termin: der Weg eines Gutscheins über deine Website | Webdesign für Massagepraxen: Massagen so beschreiben, dass die Wahl leichtfällt | `wellness-angebot.webp` | `wellness-startseite.webp`, `wellness-anfrage.webp`, `wellness-suche.webp` |
| `/handwerker` | energie | Von der Suche bis zum Auftrag: der Weg eines Kunden über deine Website | Webdesign für Baufirmen und Bauunternehmen in Berlin | `handwerker-angebot.webp` | `handwerker-startseite.webp`, `handwerker-anfrage.webp`, `handwerker-suche.webp` |

`/handwerker` hat ein eigenes Template (`views/handwerker.ejs`). Die Abschnitte heißen dort
`journey`, `focus` und `gallery` in `data/handwerkerPage.js`.

## 3. Bildplätze (Platzhalter)

Je Seite liegen vier Bilder unter `public/images/branchen/<slug>/`, alle als WebP in 720 × 540:

| Datei | Zeigt als Platzhalter | Passendes echtes Bild |
|---|---|---|
| `<slug>-startseite.webp` | Skizze einer Startseite | Bildschirmfoto der Startseite eines echten Projekts aus der Branche |
| `<slug>-angebot.webp` | Skizze einer Leistungs-, Karten- oder Preisübersicht | Bildschirmfoto der Leistungsübersicht, Speisekarte oder Preisliste |
| `<slug>-anfrage.webp` | Skizze eines Formulars auf dem Handy | Bildschirmfoto des Anfrage- oder Buchungsformulars auf dem Handy |
| `<slug>-suche.webp` | Skizze eines lokalen Suchergebnisses | Bildschirmfoto des Google-Unternehmensprofils eines Kunden, mit dessen Einverständnis |

Die Bilder sind gezeichnete Skizzen ohne lesbaren Text. Auf der Seite steht bei jedem Bild
„Beispielaufbau“, damit niemand sie für ein fertiges Kundenprojekt hält.

So wird ein Platzhalter ersetzt:

1. Echtes Bild auf 720 × 540 zuschneiden (Seitenverhältnis 4:3) und als WebP speichern,
   zum Beispiel `cwebp -q 78 -resize 720 540 bild.png -o <slug>-startseite.webp`.
2. Die Datei unter demselben Namen im selben Ordner ablegen.
3. In `data/<slug>Page.js` (Fitness: `data/fitnessPage.js`) den `alt`-Text und die
   Bildunterschrift (`caption`) anpassen. Das Wort „Beispielaufbau“ entfällt, sobald das Bild
   ein echtes Projekt zeigt.
4. Bei anderen Maßen auch `width` und `height` in der Datendatei ändern.

Die Platzhalter der Kita-Seite stehen in `docs/seo/content-briefs/2026-11-10-kita/kita.md`.

## 4. Technik

- `public/kita-page.css` heißt jetzt `public/branchen-page.css` und gilt für alle Seiten mit
  `motion: true`. Die Farben kommen aus `niche-page--tone-<farbton>`
  (frisch, floral, energie, genuss, klar, pastell).
- Die Animationen nutzen `animate-on-scroll` und `js/slideOnScroll.js`, die es schon gab.
  Wer im Betriebssystem „Bewegung reduzieren“ eingestellt hat, sieht die Inhalte ohne Animation.
- Das Hero-Bild reserviert seine Höhe jetzt über `style="aspect-ratio: auto B / H"` im Template.
  Vorher hob die CSS-Regel `aspect-ratio: auto` die Angabe aus `width`/`height` auf, und der
  Hero wuchs erst beim Laden des Bildes (Layoutverschiebung 0,024 auf der Fitness-Seite).
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

## 6. Was offen bleibt

- Echte Bilder statt der Skizzen, siehe Abschnitt 3.
- Die Seiten stehen bei Google noch auf Seite 4 bis 7. Mehr Inhalt und sauberere Technik sind
  die Voraussetzung für bessere Plätze, aber keine Zusage. Ohne Verweise von anderen Websites
  und ohne Klicks aus der Suche bleibt der Sprung auf Seite 1 unsicher.
