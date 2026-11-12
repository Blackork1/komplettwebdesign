# Branchenanalyse: Website für Kitas, Kinderläden und Tagesmütter

- Seite: `/branchen/webdesign-kita`
- Stand der Recherche: 10.11.2026
- Hauptbegriff: **Kita-Website erstellen lassen** (Varianten: „kita website erstellen“, „kita homepage erstellen“, „kita homepage gestalten“, „kita internetseite“, „kindergarten homepage“)
- Zweiter Hauptbegriff: **Tagesmutter-Homepage** („tagesmutter website erstellen“, „tagesmutter homepage“, „kindertagespflege homepage erstellen“, „kindertagespflege website“)
- Umsetzung: `data/kitaPage.js`, Gestaltung in `public/branchen-page.css`, Vorlage `views/niche-page.ejs`

## 1. Ausgangslage

Bisher gab es keine eigene Seite. Kita, Kindergarten und Daycare standen auf der Ausschlussliste für Branchenseiten (`helpers/seoPagePolicy.js`), eine alte Datenbank-Vorlage wäre `noindex` gewesen. Mit der neuen Seite fällt der Ausschluss für Kita, Daycare und Kindergarten weg, Schulen bleiben ausgeschlossen.

## 2. Suchanfragen von Einrichtungen (Google-Vorschläge)

- kita website · kita website erstellen · beste kita website · förderverein kita website
- kita homepage · kita homepage gestalten · kita homepage erstellen · schöne kita homepage
- kita internetseite · kindergarten internetseite · kindergarten homepage
- tagesmutter website · tagesmutter website erstellen · tagesmutter homepage · homepage tagesmutter
- kindertagespflege website · kindertagespflege homepage · kindertagespflege homepage erstellen
- Umfeld: tagesmutter werbung · tagesmutter flyer · kita marketing · kita app

Ableitung: Kleines Volumen, klare Absicht. „Website“, „Homepage“ und „Internetseite“ werden gleich oft verwendet, deshalb stehen alle drei Wörter auf der Seite. Für die Kindertagespflege ist „Homepage“ das üblichere Wort.

## 3. Suchanfragen von Eltern und Fachkräften

- kita berlin (mitte, neukölln, reinickendorf, lichtenberg, buch) · kita in der nähe · kita berlin freie plätze · kita navigator berlin freie plätze
- kitaplatz berlin (kosten, beantragen, finden, wann anmelden) · kita anmeldung (ab wann, online, was braucht man)
- kita gutschein berlin (beantragen, nach Bezirken) · kita navigator berlin
- kita eingewöhnung (dauer, berliner modell) · kita konzept · kita tagesablauf · kita öffnungszeiten · kita schließzeiten berlin 2027 · kita kosten berlin · kita warteliste · kita besichtigung fragen · kita speiseplan
- tagesmutter berlin (charlottenburg, mitte, wedding, schöneberg, spandau, prenzlauer berg) · tagesmutter in der nähe · tagesmutter finden · tagesmutter kosten · tagesmutter oder kita · tagesmutter berlin freie plätze · kindertagespflege berlin
- kinderladen berlin + Bezirk · elterninitiative kita berlin · bilinguale kita berlin · waldkita berlin · montessori kita berlin · krippe berlin
- erzieher jobs berlin · kita stellenangebote berlin · kita stellenangebote in der nähe

Ableitung: Diese Fragen muss die Website einer Einrichtung beantworten. Die Seite nennt sie deshalb wörtlich als Beispiele („So wird gesucht“) und leitet daraus die Inhaltsbausteine ab: Konzept, Tagesablauf, Eingewöhnung, Öffnungs- und Schließzeiten, freie Plätze, Platzanfrage, Team, Räume, Essen, Karriere.

## 4. Suchintention

Kommerziell: Wer „kita website erstellen“ sucht, vergleicht Anbieter, Baukästen und Agenturen. Passendes Format ist eine Leistungsseite mit Inhaltsbausteinen, Beispielen, Preisen und FAQ. Eltern-Suchen wie „kita berlin freie plätze“ kann diese Seite nicht selbst gewinnen, sie belegen aber den Nutzen für die Einrichtung.

## 5. Konkurrenz

| Seite | Art | Lücke |
|---|---|---|
| kitavia.de (Kita-Website und SEO) | spezialisierte Agentur | keine Berliner Besonderheiten (Kita-Gutschein, Kita-Navigator), keine Kindertagespflege |
| kitazentrale.de (Kita-Website) | Anbieter mit Kita-Software | Website als Nebenprodukt, wenig zu Inhalten und Suche |
| kita-designliebe.de, da-agency.de, 77neun.de | Agenturen mit Kita-Landingpage | allgemeine Leistungsbeschreibung ohne Zahlen und Quellen |
| kindertagespflege-website.de, webseite-kindertagespflege.de | günstige Homepage-Dienste für Tagesmütter | Vorlagen, kaum individuelle Gestaltung, keine lokale Suche |
| Baukästen (Wix, Webnode, Hostinger) | Selbstbau | keine Beratung zu Datenschutz und Kinderfotos |

## 6. Lücken und Chancen

- Niemand verbindet Kita und Kindertagespflege auf einer Seite und erklärt den Unterschied im Umfang (Onepager gegen Träger-Website).
- Aktuelle Zahlen fehlen überall: erster Rückgang der Kitas seit 2006, 8,6 % weniger Tagespflegepersonen, Berlin −3,0 % betreute Kinder und −14,6 % Kinder in Kindertagespflege.
- Berliner Abläufe (Kita-Gutschein mit Fristen, Kita-Navigator reserviert keinen Platz) erklärt kein Wettbewerber.
- Konkrete Beispiele statt Behauptungen: Platzanfrage in sechs Feldern, Tagesablauf als Zeitleiste.
- Fachkräftegewinnung über die eigene Karriereseite wird selten als Nutzen der Website genannt.
- Ehrliche Einordnung für Tagesmütter: Wann ein Baukasten reicht und wann nicht.

## 7. Gliederung der neuen Seite

| Abschnitt | Inhalt |
|---|---|
| Hero | Drei Elternfragen: Konzept, Öffnungszeiten, freier Platz. Für Kitas, Kinderläden, Tagesmütter |
| Ausgangslage | Zahlen von Destatis und Amt für Statistik, Lücke des Kita-Navigators |
| Einrichtungen | Kita/Kindergarten/Krippe/Hort, Tagesmutter/Tagesvater, Elterninitiative/Kinderladen, Träger, Schwerpunkt-Kitas, jeweils mit Seiten und Suchbeispielen |
| Inhalte | Konzept, Tagesablauf, Eingewöhnung, Zeiten, freie Plätze, Team, Räume, Essen |
| Tagesablauf | Beispiel als Zeitleiste, Hinweis auf Berliner Modell |
| Kindertagespflege | Regeln in Berlin, Verbund (anderswo Großtagespflege), Inhalte der Homepage, ehrliche Einordnung zu Baukästen |
| Platzanfrage | Formular in sechs Feldern, Kita-Navigator, Kita-Gutschein, Datensparsamkeit |
| Einblicke | Bilder ohne erkennbare Kinder, Einwilligung |
| Karriereseite | Stellen, Team, kurze Bewerbung |
| Local SEO | Bezirk, Google-Unternehmensprofil, Standortseiten, Schwerpunktseiten |
| Recht | Datensparsamkeit, § 5 DDG mit Aufsichtsbehörde, Kinderfotos |
| Preise, Ablauf, FAQ | 16 Fragen aus echten Suchen, darunter Website/Homepage/Internetseite und Förderverein |

## 8. Meta-Angaben

- Title: `Kita-Website erstellen lassen | Tagesmutter-Homepage Berlin` (59 Zeichen)
- Description: `Website für Kita, Kindertagesstätte, Kinderladen oder Tagesmutter: Konzept, freie Plätze und Platzanfrage klar zeigen, in Berlin sichtbar. Pakete ab 799 €.`
- Begriffe, die wörtlich auf der Seite stehen: Kita-Website, Kita-Homepage, Internetseite, Kindertagesstätte, Kindergarten, Krippe, Hort, Kinderladen, Elterninitiative, Tagesmutter, Tagesvater, Kindertagespflege, Großtagespflege, Förderverein (geprüft in `tests/nichePages.test.js`).
- H1: `Website für Kitas, Kinderläden und Tagesmütter in Berlin`

## 9. Informationsgewinn

Zahlen zum Stichtag 1. März 2026 für Deutschland und Berlin, Berliner Abläufe (Gutschein, Navigator, Kindertagespflege mit bis zu fünf Kindern), ein fertiger Formularaufbau und ein Tagesablauf als Muster. Dazu die Verbindung von Elternsuche und Fachkräftesuche auf einer Website.

## 10. Bildplätze (Platzhalter)

Alle Bilder liegen unter `public/images/branchen/kita/` und sind gezeichnete Platzhalter ohne Text. Ein echtes Foto ersetzt die Datei unter demselben Namen und im selben Seitenverhältnis, danach den alt-Text in `data/kitaPage.js` anpassen. Keine erkennbaren Kinder ohne Einwilligung der Sorgeberechtigten. Seit 12.11.2026 ist das Bild neben dem Text zur Kindertagespflege hochkant (2:3) und die Einblicke sind quer (3:2), passend zu den Formaten von ChatGPT. Prompts: `docs/seo/content-briefs/2026-11-11-branchen/bild-prompts.md`.

| Datei | Größe | Stelle | Vorschlag für das Motiv |
|---|---|---|---|
| `kita-hero.webp` | 960 × 640 | Hero, oben rechts | Außenansicht, Eingang oder heller Gruppenraum |
| `kita-tagespflege.webp` | 720 × 1080 (hochkant) | Abschnitt Kindertagespflege | Spielecke oder Tagesmutter in ihren Räumen |
| `kita-raeume.webp` | 720 × 480 | Einblicke, Bild 1 | Gruppenraum, Bewegungsraum oder Schlafraum |
| `kita-garten.webp` | 720 × 480 | Einblicke, Bild 2 | Außengelände oder Spielplatz in der Nähe |
| `kita-team.webp` | 720 × 480 | Einblicke, Bild 3 | Team oder Detail aus dem Alltag (Garderobe, Basteltisch) |
| `kita-hero-720.webp` | 720 × 540 | Karte auf `/branchen` | Ausschnitt des Hero-Bildes im Format 4:3, wird aus `kita-hero.webp` erzeugt |

## 11. Quellen

- Destatis, Pressemitteilung Nr. 342 vom 29.09.2026: Kindertagesbetreuung am 1. März 2026
- Amt für Statistik Berlin-Brandenburg, Pressemitteilung 113/2026: Kindertagesbetreuung 2026
- Berlin.de: Kindertagespflege, Kita-Navigator; Service-Portal Berlin: Kita-Gutschein
- § 43 SGB VIII, § 22 KUG, § 5 DDG, § 3 BFSG
- Berliner Beauftragte für Datenschutz und Informationsfreiheit: Broschüre zu Bild-, Ton- und Videoaufnahmen in der Kita

## 12. Interne Links

`/pakete`, `/leistungen/local-seo`, `/leistungen/website-wartung`, `/leistungen/rechtliches-sicherheit`, `/branchen/webdesign-hebamme`, `/branchen/webdesign-arzt`, `/branchen/webdesign-physiotherapie`
