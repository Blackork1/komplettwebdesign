# Footer, Projektbeispiele und Kennenlerngespräch

Die konkrete Nutzeranweisung erweitert die bereits freigegebene persönliche Gestaltung. Umsetzung und Veröffentlichung sind im laufenden Auftrag autorisiert; bestehende EJS-/CSS-/JS-Technik und die bewährte Weiß-/Dunkelblau-/Orange-Gestaltung bleiben Grundlage.

## Gewünschtes Ergebnis

- Footer: nur Komplett Webdesign, darunter Telefon und E-Mail auf eigenen Zeilen. Keine Anschrift und kein Link „Adresse auf Google Maps“ im Footer. Google-Profil zentral exakt auf https://maps.app.goo.gl/vzJLbCvqWBdiK5RC7?g_st=ic ändern. Die rechtlichen Kontaktdaten und das zentrale Personenschema bleiben sachlich vollständig.
- Gleiche Inhaltsbreiten und ausgerichtete Überschriften-/Linkzeilen. Das Café Zur alten Backstube erhält eine gleichwertige Projektüberschrift. Filmfestival und Sauber & Mehr erhalten deutlichere Titel; „Besonders“ erhält einen eigenen Akzent.
- Dezente Einblendungen beim Scrollen, kurze Feldanimationen, reduzierte Bewegung respektieren. Inhalte bleiben ohne Animation sichtbar.
- Abschlusskontakt: zwei nebeneinanderstehende Buttons, mobil untereinander. Rechts „Oder schreib mir dein Vorhaben“ als mailto an kontakt@komplettwebdesign.de, Betreff „Anfrage zu meiner Website“, Text exakt „Sag mir kurz was du benötigst oder was du dir vorstellst:“. Telefonnummer hier entfernen.
- /booking und /en/booking: passende persönliche Texte, weiße Gestaltung und deutlich kontrastierender orangefarbener Buchungsbutton. Echte, jederzeit änderbare Vorauswahl ab morgen nach Berliner Ortszeit: erster verfügbarer Tag, früheste freie Uhrzeit. Ohne morgige Verfügbarkeit nächster verfügbarer Tag; ohne freie Termine klarer Hinweis und Kontaktalternative.
- Leere persönliche Werte mit Beispielen als Platzhalter. Sichtbare Labels, Name → E-Mail → optionale Anmerkung und Buchungsbutton. Nach validen Eingaben sanft einblenden; bereits sichtbare Felder beim Korrigieren nicht wieder schließen. Angaben beim Terminwechsel behalten. Keine Buchung oder Mail bei der Prüfung abschicken.

## Umsetzung und Abwägung

Die vorhandene Kalenderoberfläche wird verbessert. Ein neues externes Buchungssystem würde Verfügbarkeit und Bestätigungsprozess duplizieren. Ein vollständig neues mehrseitiges Formular wäre für drei Felder unnötig. Die bestehende Oberfläche mit fortschreitender Eingabe setzt die konkrete Nutzeranweisung um und erhält die funktionierende serverseitige Buchung sowie reCAPTCHA.

Vorauswahl verwendet die vorhandenen öffentlichen Kalender-/Tages-Slot-Endpunkte. Tagesdaten und Uhrzeiten werden explizit in Europe/Berlin dargestellt. Vergangene oder zwischenzeitlich vergebene Slots dürfen nicht vorgeschlagen werden; verspätete Antworten dürfen neuere Auswahlen nicht überschreiben. Standardvorschläge sind unverbindlich und werden erst durch den Buchungsbutton abgeschickt.

## Ergänzung: Kontaktseite

Der Nutzer hat während der Umsetzung zusätzlich die vollständige gestalterische Überarbeitung von /kontakt beauftragt. Dieselbe persönliche Gestaltung wird übernommen: weißer Einstieg mit Sören als Ansprechpartner, klare Anfrageauswahl, ruhige Formularflächen, strukturierte Kontaktalternativen und einheitliche mobile Abstände. Vorhandene Kurz-/Detailformulare, IDs, Feldnamen, Bedingungen, Pflichtfelder, Query-Vorauswahl, reCAPTCHA, Validierung und serverseitige Verarbeitung bleiben erhalten. Die bestehenden allgemeinen Erläuterungen rücken hinter die Anfrageauswahl. Vorher/Nachher werden die gerenderten Formularverträge verglichen; beide Wege und eine spezialisierte Projektart werden im Browser durchgeklickt, ohne abzusenden.

## Verifikation vor Veröffentlichung

- Vollständige Node-Suite: 2297 bestanden, 19 übersprungen, 0 fehlgeschlagen. CSS-Build für 43 Quellen erfolgreich, git diff --check sauber.
- Frisches unabhängiges Review: keine konkreten Befunde.
- /about, /booking und /kontakt bei 320/390/768/1440 px ohne horizontalen Überlauf; je ein H1. Projektüberschriften bleiben auch mobil gut sichtbar. Footer-Überschriften und erste Navigationslinks je Rasterzeile deckungsgleich. Beide About-Kontaktbuttons auf Desktop auf gleicher Höhe und 56 px hoch.
- Reale lokale Buchungsoberfläche: nächste verfügbare Uhrzeit ab morgen vorausgewählt, änderbar, Pflichtfelder schrittweise sichtbar. Uhrzeitwechsel erhält Name und E-Mail. Beim Korrigieren bleiben Felder offen; ungültige Angaben deaktivieren den Button. Orangefarbener Button auf heller Formularfläche visuell geprüft.
- Lokale HTTP-Testfälle mit realem Frontend: morgen leer → Folgetag, aktueller Monat leer → nächster Monat, keine Termine → Hinweis, Slot-API-Fehler → Fehlermeldung mit Wiederholen-Aktion. Keine Buchung abgeschickt.
- Kontaktformularvertrag vor/nach Umbau identisch: Kurzformular 11 Felder, Detailformular 160 Felder / 21 Schritte. Bedingte Audit-URL, Wechsel Kurz/Detail, Tastaturauswahl und Zurück-Navigation mit erhaltener Projektart im Browser geprüft. Verarbeitender Kontaktcontroller und kontakt.js unverändert.
- Neun öffentliche Pfade inklusive deutscher/englischer Buchungs- und Kontaktseite erfolgreich gerendert. Footer enthält exakt den gewünschten Google-Link, Marke, Telefon und E-Mail; keine Anschrift oder Gründername.

## Korrektur: Kontaktseite deutlich vereinfachen

Die anschließende Nutzerkorrektur ersetzt die umfangreiche Kontaktgestaltung: kurzer Einstieg, ein Orientierungssatz und sechs direkt wählbare Anfragethemen auf weißem Grund mit wenigen blauen und orangefarbenen Akzenten. Nach der Themenwahl öffnet sich das Kurzformular mit passender Vorauswahl. Die ausführliche Anfrage bleibt als dezenter Link erreichbar, ebenso E-Mail und Kennenlerngespräch. Zusätzliche Profil-, Vorteils-, FAQ- und Abschlussblöcke entfallen. Ohne sichtbare FAQ wird auch kein FAQ-Schema ausgegeben.

Die Einstiegsansicht wurde von 497 auf 57 sichtbare Wörter reduziert. Gerenderte Formularverträge bleiben gleich (11 beziehungsweise 160 Felder, 21 Detailschritte). Alle sechs Themen, abhängige URL-Pflichtfelder und der Wechsel zur Detailanfrage wurden im Browser geprüft. Bei 320, 390, 768 und 1440 px besteht kein horizontaler Überlauf. CSS-Build und vollständige Suite sind erfolgreich (2297 bestanden, 19 übersprungen); das unabhängige Review ergab keine relevanten Befunde.
