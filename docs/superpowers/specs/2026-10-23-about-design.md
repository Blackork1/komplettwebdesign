# Persönliche Über-mich-Seite

## Ziel und abgestimmte Richtung

Sören soll als greifbarer, kompetenter Ansprechpartner für Websites kleiner Unternehmen in Berlin überzeugen. Der Nutzer hat am 23.10.2026 die vorgeschlagene persönliche, hochwertige Richtung mit vorhandenem Porträt, kurzen Texten, echten Projekten und sichtbarem Kontaktaufruf bestätigt: „Ja passt“.

Die Seite unterstützt die Entscheidung für ein Kennenlerngespräch. Sie bekommt eine eigenständige, ruhige Gestaltung innerhalb der bestehenden Marke. Das bestehende EJS-/Express-Projekt, die Navigation und der Footer werden weiterverwendet.

## Abgewogene Ansätze

- Persönlich und hochwertig: Porträt, konkreter Nutzen, nachvollziehbare Arbeit. Diese Richtung wurde gewählt.
- Sachlich und zurückhaltend: Fachprofil mit stärkerer Leistungsbeschreibung. Weniger passend zum gewünschten persönlichen Vertrauen.
- Fortführung der bisherigen langen Biografie: erhält die bestehenden Texte, löst aber die schwache Leserführung nicht.

## Gestaltung und Inhalt

Drei koordinierte Bildentwürfe bilden die Referenz: Einstieg, Arbeitsweise/Projektbeleg und Ablauf/Kontakt. Weiß (#ffffff), Dunkelblau (#0b2a46), Orange (#c93c0c), vorhandene Poppins-/Inter-Schriften; eine sparsame Georgia-Kursivbetonung im H1. Keine neuen Schriftdateien. Großzügiger Satzspiegel bis 1280 px, zurückhaltende Bildrahmen, offene Abschnitte statt wiederholter Kacheln. Mobil bleiben Text, Aktionen und echtes Porträt in einer verständlichen Reihenfolge.

1. H1 „Ich bin Sören. Dein Webdesigner in Berlin.“; persönlicher Nutzen, Porträt, frühe Aktion „Kennenlerngespräch vereinbaren“ zu `/booking`, Nebenaktion „Meine Arbeit ansehen“ zu `#meine-arbeit`.
2. Kurze persönliche Vorstellung und drei konkrete Vorteile: direkte Abstimmung, vereinbarter Umfang, nutzerorientierte Website. Leistungen, Pakete und Relaunch mit beschreibenden internen Links.
3. Reales Projekt „Zur alten Backstube“ mit vorhandener Abbildung und belegter Kundenstimme aus `data/referenceProjects.js`; weiterer Link auf TM Sauber & Mehr.
4. Drei verständliche Schritte auf dunkelblauem Grund: Kennenlernen, Planen und umsetzen, Prüfen und veröffentlichen.
5. Drei native, mit Tastatur bedienbare FAQ-Zeilen und abschließender persönlicher Kontaktaufruf mit Buchung, Kontaktformular und zentraler Telefonnummer.

Das vorhandene Foto wird unverändert verwendet. Generierte Designs dienen nur als Gestaltungsreferenzen. Es werden weder Personenfotos noch Kundenarbeiten oder Bewertungen erfunden. Veraltetes Alter, unbelegte Erfahrungszahlen, Hobbybehauptungen, feste Erfolgsversprechen und die lange wiederholte Biografie entfallen. Laufende Betreuung wird als gesondert vereinbarte Leistung beschrieben.

## SEO und Technik

Eigenständiger Titel und Beschreibung mit Personen-/Anbieterintention; ein H1, eindeutiger `/about`-Canonical, AboutPage mit zentraler Person als mainEntity, Organisation als about und BreadcrumbList. Sichtbare Texte und strukturierte Daten bleiben konsistent. Keine Keyword-Konkurrenz mit der allgemeinen Berliner Leistungsseite. Bilder bekommen Abmessungen, das Porträt wird früh geladen, das Projektbild verzögert. Es entstehen keine neuen Bibliotheken oder Datenbankänderungen.

Der seitenübergreifende Nach-oben-Link erhält ein natives, von Abschnitts-IDs unabhängiges Ziel. Auf der deutschen und englischen Startseite steht sichtbar nur „Sören“, auch im Footer; rechtliche Namen und Personendaten anderer Seiten bleiben fachlich korrekt.

## Verifikation

Bestehende Tests angemessen auf das neue Ergebnis ausrichten; EJS-Ausgabe, zentrale Referenzdaten und AboutPage/Breadcrumb-Beziehungen prüfen. Gesamte Testsuite und CSS-Build. Browserprüfung bei 320, 390 und 1440 px, einschließlich FAQ, Buchungs-/Kontaktlinks, Nach-oben-Link auf Startseite und Seiten ohne Hero-ID, reduzierter Bewegung, Bildabmessungen und fehlendem horizontalem Überlauf. Konzept und gerenderte Abschnitte direkt vergleichen. Bestehende produktive Änderungen sowie andere lokale Arbeiten erhalten.

## Ergänzung des Nutzers: zwei weitere Projektbeispiele

Zusätzlich zur Backstube werden das Kurdische Filmfestival Berlin und TM Sauber & Mehr mit echten Screenshots vorgestellt. Beim Filmfestival stammen Startseite und beide Videoansichten aus `/archiv2026/`; die aktuelle Vorschauseite für 2027 wird nicht verwendet. Der Schwerpunkt liegt auf Filmsuche, Filmübersichten und Filminformationen, ohne einen verfügbaren Streamingzugang zu behaupten. Bei Sauber & Mehr werden Startseite und Kontaktseite gezeigt; die schrittweise Anfrage mit Reinigungsart, Objektgröße und Kontaktweg wird hervorgehoben. Alle Screenshots lassen sich in einem neuen Tab vergrößern. Sie werden als WebP mit 720-px-Varianten ausgeliefert.

Die zusätzlichen Bereiche folgen dem vorhandenen offenen Satzspiegel mit zwei Textspalten und einer Medienreihe aus drei beziehungsweise zwei Screenshots. Die Seiten selbst bleiben unverändert. Es wurden keine Kundenformulare abgeschickt.

## Gestaltungsreferenzen und Verifikation

Die fünf Konzeptbilder wurden mit dem eingebauten Image-Gen-Werkzeug erzeugt. Briefing: persönliche hochwertige Über-mich-Seite für kleine Unternehmen, vorhandenes unverändertes Porträt und echte Projektaufnahmen, weiße offene Flächen, Marineblau/Orange, Poppins/Inter mit sparsamer Georgia-Kursivbetonung, native Texte und Bedienelemente, keine erfundenen Zahlen oder Referenzen. Für die ergänzten Projekte wurden die echten Screenshots mit unveränderten Seiteninhalten als Bildreferenzen verwendet.

Konzeptdateien unter `/Users/blocksdorf/.codex/generated_images/01a16872-3089-7161-8d13-30d283a68a89/`:

- Einstieg: `exec-811bc58d-a895-49df-b606-5ba21432de8f.png`
- Projektbeleg: `exec-cc965c5c-9344-470d-9a7d-0367d1af7610.png`
- Ablauf/Kontakt: `exec-f58f7d78-b901-493e-8284-ccf2ed229b16.png`
- Filmfestival: `exec-23a616be-f15f-4cbe-a9f5-7ba86c2c9047.png`
- Sauber & Mehr: `exec-558e4e4c-6796-4a8c-ad6c-5e3bfdb1ca48.png`

Browsermethode: Browser/IAB über `cua_repl`, native Screenshots und DOM-Prüfungen. Kein Playwright-Fallback. Alle fünf Konzeptbilder und die passenden aktuellen Browseraufnahmen wurden mit `view_image` direkt gegenübergestellt. Desktopvergleich bei 1536 px; zusätzlich tatsächliche Viewports 320/390/768/1440 px mit je einem H1, drei nativen FAQ und ohne horizontalen Überlauf oder ungültiges JSON-LD. Rendernachweise liegen lokal in `.superpowers/about-refresh/kwd-about-*-render.png`; die Mobilaufnahme in `kwd-about-mobile.png`.

| Vergleichspunkt | Umsetzung und Prüfung |
| --- | --- |
| Leserführung | Porträt/Einstieg, konkrete Zusammenarbeit, echte Projekte, kurzer Ablauf, FAQ und Kontakt in der vorgesehenen Reihenfolge. |
| Typografie | Vorhandene lokale Poppins-/Inter-Dateien korrekt als Fontfaces eingebunden; nur der Name und die zweite Ablaufzeile verwenden Georgia kursiv. Kleinere Abschnittstitel folgen bewusst der H2/H3-Hierarchie des realen Dokuments. |
| Farben und Flächen | Weiß, Marineblau und dunkles Orange; ein ruhiger blauer Ablaufabschnitt, keine Kartenwand oder erfundenen Kennzahlen. Schrittnummern auf Blau sind für Lesbarkeit heller. |
| Bildbehandlung | Originalporträt bleibt unverändert. Kundenwebsites werden als echte Aufnahmen mit korrektem Seitenverhältnis gezeigt; zusätzliche Projektaufnahmen werden nicht beschnitten und sind vergrößerbar. |
| Abstände und Container | Ein gemeinsamer Satzspiegel mit maximal 1280 px, offene Spalten, dünne Trennlinien und konsistente Bildbeschriftungen; mobil wechseln die Bereiche in eine Spalte. |
| Textvergleich im Einstieg | H1, Nutzenabsatz, primäre und sekundäre Aktion sowie Hinweissatz entsprechen dem Entwurf; bestehende globale Navigation und Footer kommen aus dem realen Projekt. |
| Funktionen | Nativer Nach-oben-Link auf About von 4827 auf 0 px geprüft. FAQ per Enter geöffnet und geschlossen. HTTP-Prüfung bestätigt Kontakt-/Buchungswege, Referenzen und alle Bildpfade. |

Bewusste Anpassungen an die Vorlagen: echtes unverändertes Foto, kürzere Faktenformulierungen ohne Agenturvergleiche, kleinere Hierarchiestufen bei den ergänzten Projekten, dunklere Akzentfarbe und kontrastreichere Schrittnummern. Der zuvor einfache Relaunch-Link wurde auf ausdrücklichen Nutzerwunsch durch zwei vollständige Projektbeispiele ersetzt. Es verbleiben keine bekannten funktionalen oder mobilen Layoutfehler. Die Umsetzung wurde anhand der fünf Entwürfe auf Struktur, Text, Typografie, Farben, Bildbehandlung und Bedienung geprüft.

Gesamte Testsuite: 2310 Tests, 2291 bestanden, 19 übersprungen, keine Fehler. Acht öffentliche Kern- und Referenzseiten liefern 200; die sichtbare Startseiten-Ausgabe DE/EN enthält keinen Nachnamen. Eine unabhängige abschließende Prüfung fand keine konkreten handlungsbedürftigen Fehler.
