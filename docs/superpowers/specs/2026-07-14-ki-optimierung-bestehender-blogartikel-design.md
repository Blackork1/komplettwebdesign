# KI-Optimierung bestehender Blogartikel – Designspezifikation

## 1. Ziel

Veröffentlichte Blogartikel sollen im geschützten Adminbereich mit einem einzigen Auftrag gezielt durch KI geprüft und optimiert werden können. Die KI korrigiert konkrete Schwachstellen, ohne den Artikel unnötig neu zu schreiben. Der Liveartikel bleibt bis zur ausdrücklichen manuellen Freigabe unverändert.

Die Funktion ergänzt den bestehenden Ablauf aus Bestandsprüfung, Revision, Qualitätskontrolle und manueller Übernahme. Sie ersetzt weder die Bestandsprüfung noch das bestehende Revisionssystem.

## 2. Verbindliche Produktentscheidungen

- Der Standardmodus ist ausschließlich **gezielte Optimierung**.
- Ein gemeinsamer Button „Mit KI prüfen und optimieren“ startet Prüfung, bedingte Recherche, Optimierung und Qualitätskontrolle.
- Webrecherche erfolgt nur, wenn zeitabhängige oder überprüfungsbedürftige Aussagen erkannt werden.
- Jede optimierte Revision muss manuell geprüft und ausdrücklich übernommen werden.
- Die Vergleichsansicht verwendet Variante A: Livefassung links, optimierte Revision rechts; auf kleinen Bildschirmen untereinander.
- Einzelne Änderungen können vor der Übernahme zurückgenommen werden.
- Der Erfolg einer übernommenen Revision wird anhand eines GSC-Vorher-Nachher-Vergleichs beobachtet.
- Entscheidungen des Administrators liefern Lernbeobachtungen, aktivieren jedoch niemals ungeprüft globale Regeln.

## 3. Umfang

### 3.1 Statische HTML-Artikel

Bei `content_format = static_html` darf die KI folgende Felder gezielt optimieren:

- Titel
- Kurzbeschreibung
- Artikel-HTML
- Meta Title
- Meta Description
- OG-Titel
- OG-Beschreibung
- FAQ
- Bild-Alt-Text

Die Bild-URL wird nicht durch die KI verändert. Der Slug, das Inhaltsformat, der Veröffentlichungsstatus und alle Veröffentlichungszeitpunkte bleiben gesperrt.

### 3.2 Legacy-EJS-Artikel

Bei `content_format = legacy_ejs` bleiben Artikeltext und EJS-Struktur unveränderlich. Automatisch optimierbar sind ausschließlich:

- Titel
- Kurzbeschreibung
- Meta Title
- Meta Description
- OG-Titel
- OG-Beschreibung
- FAQ
- Bild-Alt-Text

Befunde im nicht bearbeitbaren Artikeltext werden weiterhin angezeigt, aber aus der Freigabeentscheidung für die erlaubten Metadatenfelder ausgeschlossen. Die Revision darf keine neuen Abhängigkeiten vom unveränderten EJS-Inhalt erzeugen.

### 3.3 Nicht enthalten

- automatische Übernahme oder automatische Veröffentlichung
- Änderung des Slugs oder der öffentlichen URL
- automatische Konvertierung von Legacy-EJS in statisches HTML
- Austausch oder Neugenerierung des Beitragsbildes
- vollständige Neufassung eines Artikels
- automatischer Rückbau anhand schwacher GSC-Werte
- kostenpflichtige Keyword-Datenquellen wie DataForSEO oder Google Ads

## 4. Nutzerablauf

### 4.1 Start in der Bestandsliste

Jeder veröffentlichte Artikel zeigt abhängig vom Zustand genau eine primäre Aktion:

- „Mit KI prüfen und optimieren“
- „Optimierung läuft“ mit aktueller Stufe und deaktivierter Aktion
- „Optimierung prüfen“ nach erfolgreichem Abschluss
- „Optimierung fortsetzen“ nur bei einem nachweislich sicher wiederholbaren Fehler
- eine verständliche manuelle Klärungsaktion bei unsicherer Providerausführung

Für denselben Artikel darf höchstens ein aktiver Optimierungsauftrag existieren. Diese Regel wird in der Datenbank und nicht nur in der Oberfläche erzwungen.

### 4.2 Hintergrundverarbeitung

Der Auftrag durchläuft folgende dauerhaft gespeicherte Stufen:

1. `live_snapshot` – Livefassung, Zeitstempel, Format und Hash erfassen
2. `existing_content_audit` – aktuelle technische und redaktionelle Bestandsprüfung
3. `gsc_page_signals` – seitenspezifische GSC-Daten laden
4. `freshness_classification` – Notwendigkeit einer Webrecherche bestimmen
5. `current_source_research` – nur bei Bedarf aktuelle Quellen recherchieren
6. `targeted_optimization` – strukturierten Optimierungsvorschlag erzeugen
7. `targeted_scope_validation` – unerwünschte Komplettneufassung verhindern
8. `article_validation` – HTML, Links, CTA, FAQ und Metadaten prüfen
9. `editorial_review` – Nutzen, Suchintention, Genauigkeit und Natürlichkeit prüfen
10. `repair` – höchstens eine automatische Nachbesserung bei sicher behebbaren Befunden
11. `revision_creation` – gültige Revision und Änderungsbericht speichern

Jede kostenpflichtige Stufe verwendet die vorhandene Kostenreservierung, Response-ID-Speicherung und Providerdiagnose.

### 4.3 Prüfung und Übernahme

Die fertige Revisionsseite zeigt:

- Qualitätsscore und Zahl der Änderungen
- aktuelle Livefassung links und optimierte Revision rechts
- gestapelte Darstellung auf Mobilgeräten
- Sprungmarken zu jeder Änderung
- Markierungen für entfernt, verändert und ergänzt
- Begründung und zugehörigen Auditbefund
- gegebenenfalls aktuelle Quellen
- gegebenenfalls unterstützende GSC-Suchanfragen
- nicht automatisch behebbare Befunde

Jede Änderung besitzt „Änderung zurücknehmen“. Die Aktion erhöht atomar die Revisionsversion und startet die Validierung erneut. Erst eine gültige aktuelle Revisionsversion kann übernommen werden.

## 5. Daten und Zuständigkeiten

### 5.1 Bestehende Strukturen

- `content_jobs` verwaltet Auftrag, Lease, Versuche und Status.
- `content_runs` speichert Stufen, Kosten, Tokens, Response-IDs und Fehlerbericht.
- `content_post_audits` speichert die aktuelle Bestandsprüfung.
- `content_post_revisions` speichert die geschützte Revision und deren Snapshot.
- die vorhandenen GSC-Metriken liefern seitenspezifische Signale.
- die vorhandenen Lernstrukturen speichern Beobachtungen und spätere Regelvorschläge.

### 5.2 Neue Datenbankabsicherung

Eine Migration ergänzt:

- einen Datenbank-Index, der mehr als einen aktiven `optimize_existing_post`-Auftrag pro Artikel verhindert,
- eine Ergebnistabelle für die GSC-Basis und spätere Nachmessung einer übernommenen Optimierungsrevision.

Der Optimierungsauftrag enthält mindestens `post_id`, den initialen Livehash, Administrator-ID und Quelle. Revision und Audit bleiben über die vorhandenen Beziehungen nachvollziehbar.

### 5.3 Optimierungs- und Änderungsbericht

Der Revisionssnapshot enthält zusätzlich einen begrenzten, serverseitig erzeugten Optimierungsbericht:

- Ausgangsscore und neuer Score
- behobene, verbleibende und neu erkannte Befunde
- Liste der Änderungen mit stabiler Änderungs-ID
- Feld oder HTML-Block der Änderung
- alter und neuer Wert beziehungsweise sichere Auszüge
- Begründung
- verwendete Quellenreferenzen
- zugeordnete GSC-Signale
- erlaubter Bearbeitungsumfang
- verwendete Prompt-, Regel- und Modellversionen

Die KI darf Begründungen vorschlagen. Der eigentliche Diff und die Änderungs-IDs werden deterministisch vom Server aus Original und validierter Revision erzeugt.

## 6. Gezielte Optimierung

### 6.1 Eingaben

Die KI erhält nur begrenzte und bereinigte Daten:

- freigegebene Felder der Livefassung
- aktuelle Auditbefunde
- erlaubte interne Links
- Seitensignale aus GSC
- aktive, administrativ freigegebene Lernregeln
- gegebenenfalls aktuelle Quellen
- Marken-, Zielgruppen-, CTA-, HTML- und Sprachregeln

GSC-Suchanfragen und Webquellen gelten als nicht vertrauenswürdige externe Daten. Darin enthaltene Anweisungen werden ignoriert.

### 6.2 Bedingte Webrecherche

Eine Recherche wird ausgelöst, wenn mindestens eines der folgenden Signale vorliegt:

- veraltete oder konkrete Jahresangabe
- Preis- oder Kostenbehauptung
- Google-, SEO-, GEO- oder KI-Änderung
- rechtliche oder datenschutzbezogene Aussage
- konkrete Produkt-, Modell- oder Toolangabe
- technische Norm oder Standard
- anderer Auditbefund, der ohne aktuelle Quelle nicht zuverlässig korrigiert werden kann

Fehlt ein solches Signal, wird ohne Websuche optimiert. Quellen werden nur für die dazugehörigen Aussagen verwendet und im Bericht gespeichert.

### 6.3 Schutz vor Komplettneufassung

Der Server vergleicht Original und Vorschlag vor der normalen Validierung. Die Optimierung wird abgewiesen oder einmal gezielt nachgebessert, wenn sie den festgelegten Bearbeitungsumfang überschreitet. Als Schutzgrenzen gelten:

- höchstens 35 Prozent der vorhandenen Textblöcke werden verändert,
- die Netto-Wortzahl verändert sich höchstens um 25 Prozent,
- die bestehende Hauptgliederung bleibt erhalten,
- nicht von Befunden betroffene Kernaussagen dürfen nicht entfernt werden.

Diese Grenzen gelten für den Modus „gezielte Optimierung“. Eine spätere vollständige Modernisierung wäre ein eigener Modus und ist nicht Bestandteil dieser Spezifikation.

## 7. Diff und einzelne Rücknahmen

Der Server erzeugt den Vergleich unabhängig von der KI:

- einfache Felder werden als Feld-Diff gespeichert,
- FAQ werden anhand normalisierter Fragen verglichen,
- HTML wird in erlaubte DOM-Blöcke zerlegt und über Pfad, Blocktyp und Fingerprint zugeordnet,
- sensible oder nicht eindeutig zuordenbare HTML-Änderungen werden nicht einzeln rücknehmbar angeboten.

Beim Zurücknehmen wird der Originalwert des betroffenen Feldes oder DOM-Blocks in die aktuelle Revision eingesetzt. Passt der Fingerprint wegen einer parallelen manuellen Bearbeitung nicht mehr, entsteht ein Konflikt statt einer stillen Überschreibung. Anschließend laufen Umfangs-, Inhalts- und Qualitätsprüfung erneut.

## 8. Qualitäts- und Freigaberegeln

Eine Revision ist nur freigabefähig, wenn:

- alle erforderlichen Felder gültig sind,
- keine nicht erlaubten HTML-, EJS- oder Script-Inhalte entstanden sind,
- interne Links aus der vertrauenswürdigen Linkliste stammen,
- die gezielt bearbeiteten Befunde behoben wurden,
- keine neuen blockierenden Befunde entstanden sind,
- der neue Qualitätsscore nicht unter dem Ausgangsscore liegt,
- der gezielte Bearbeitungsumfang eingehalten wurde,
- Slug, Inhaltsformat und Veröffentlichungsstatus unverändert sind,
- der Livehash weiterhin zur Ausgangsfassung passt.

Vor der Übernahme prüft eine Datenbanktransaktion Livehash, Revisionsversion, Artikelstatus und Auditbezug erneut. Bei einer zwischenzeitlichen Liveänderung wird nichts übernommen; der Administrator muss einen neuen Optimierungsauftrag starten.

## 9. Fehlerbehandlung und Wiederaufnahme

- Mehrfachklicks und parallele Worker erzeugen keinen zweiten aktiven Auftrag.
- Bereits erfolgreich gespeicherte Stufen werden bei einer sicheren Wiederaufnahme nicht erneut bezahlt.
- Bei offener oder ungeklärter Providerreservierung wird der normale Wiederholungsbutton ausgeblendet.
- Eine bewusst kostenpflichtige Wiederholung erfordert eine gesonderte Bestätigung mit Kostenhinweis.
- Ein ungültiger KI-Vorschlag wird höchstens einmal automatisch repariert.
- Nach weiterhin fehlgeschlagener Qualitätsprüfung wird keine Revision angelegt und der Bericht nennt die konkreten Befunde.
- Ein Kostenlimit stoppt vor einer weiteren kostenpflichtigen Stufe.
- Fehlende GSC-Daten blockieren die Optimierung nicht; die Oberfläche kennzeichnet das fehlende Signal.
- Ein Fehler in der GSC-Nachmessung verändert niemals den Liveartikel oder die Revision.

## 10. GSC-Erfolgsmessung

Bei der Übernahme wird für die öffentliche Artikel-URL eine unveränderliche Basis aus den neuesten 28 vollständig gespeicherten GSC-Tagen gespeichert, deren Enddatum nicht nach dem Übernahmedatum liegt:

- 28-Tage-Zeitraum vor der Übernahme
- Klicks
- Impressionen
- CTR
- impressionsgewichtete durchschnittliche Position
- wichtigste Suchanfragen

Der Folgezeitraum beginnt am ersten vollständigen Kalendertag nach der Übernahme und umfasst 28 Tage. Er wird erst ausgewertet, sobald alle 28 Tage in der lokalen GSC-Datenbank vorliegen. Die Oberfläche zeigt absolute Werte, Veränderungen und neu hinzugekommene beziehungsweise verlorene wichtige Suchanfragen.

Bei geringer Datenmenge wird statt einer Bewertung „Noch nicht belastbar“ angezeigt. Veränderungen werden als Beobachtung und nicht als kausaler Beweis bezeichnet. Saison, Nachfrage und Google-Änderungen können die Werte beeinflussen. Es findet kein automatischer Rückbau statt.

## 11. Lernen aus Entscheidungen

Folgende Ereignisse werden als Lernbeobachtung gespeichert:

- gesamte Revision übernommen
- einzelne KI-Änderung zurückgenommen
- KI-Änderung manuell nachbearbeitet
- Optimierung vollständig verworfen
- wiederkehrender Qualitätsbefund nach der Optimierung

Beobachtungen verändern keine Prompts unmittelbar. Erst wiederkehrende, ausreichend belegte Kategorien erzeugen einen Lernvorschlag. Eine globale Lernregel wird weiterhin nur nach administrativer Freigabe aktiv.

## 12. Sicherheit und Datenschutz

- Alle mutierenden Adminaktionen benötigen Anmeldung und CSRF-Schutz.
- Der Liveartikel wird ausschließlich in der vorhandenen Freigabetransaktion verändert.
- Inhalte und externe Signale werden vor Promptübergabe begrenzt und bereinigt.
- OpenAI-Ausgaben müssen dem strukturierten Schema entsprechen.
- HTML wird vor Speicherung und Übernahme bereinigt und validiert.
- Fehlerberichte speichern keine API-Schlüssel, vollständigen Providerantworten oder anderen Geheimnisse.
- Vorschauen erhalten `noindex, nofollow` und bleiben im geschützten Adminbereich.

## 13. Teststrategie

Mindestens folgende automatisierte Fälle sind erforderlich:

- genau ein aktiver Optimierungsauftrag pro Artikel
- kein direkter Schreibzugriff auf einen Liveartikel während der KI-Verarbeitung
- vollständige Optimierbarkeit statischer HTML-Felder
- unveränderlicher Legacy-EJS-Artikeltext
- gesperrte Slugs, Bild-URLs, Formate und Veröffentlichungsfelder
- Webrecherche nur bei den festgelegten Aktualitätssignalen
- GSC-Ausfall blockiert die Optimierung nicht
- Prompt-Injection aus GSC oder Quellen wird nicht als Anweisung behandelt
- strukturierte KI-Ausgabe und sichere Providerdiagnose
- Umfangsgrenzen verhindern eine Komplettneufassung
- kein doppelter kostenpflichtiger Aufruf bei sicherer Wiederaufnahme
- Vorher-Nachher-Diff wird serverseitig erzeugt
- einzelne Feld-, FAQ- und sichere HTML-Blockänderungen können zurückgenommen werden
- Konflikt bei nicht mehr passendem HTML-Fingerprint
- erneute Validierung nach jeder Rücknahme oder manuellen Bearbeitung
- keine Übernahme bei verändertem Livehash oder veralteter Revisionsversion
- korrekte GSC-Basis und Nachmessung mit zwei vollständigen 28-Tage-Zeiträumen
- Kennzeichnung zu geringer Datenmenge
- Lernbeobachtungen ohne automatische Regelaktivierung
- responsive und zugängliche Vergleichsansicht

## 14. Abnahmekriterien

Die Funktion gilt als fertig, wenn:

1. ein Administrator bei einem veröffentlichten Artikel mit einem Klick einen sicheren Optimierungsauftrag starten kann,
2. Fortschritt und Fehler direkt in der Bestandsliste und der Revision sichtbar sind,
3. statische HTML-Artikel gezielt und Legacy-EJS-Artikel nur in erlaubten Feldern optimiert werden,
4. die Livefassung während Prüfung und Bearbeitung unverändert bleibt,
5. Variante A einen nachvollziehbaren Vorher-Nachher-Vergleich mit einzelnen Rücknahmen bietet,
6. nur eine erneut geprüfte und gültige Revision manuell übernommen werden kann,
7. Kosten, Providerunsicherheit und Wiederaufnahme denselben Sicherheitsregeln wie der bestehende Content-Agent folgen,
8. GSC nach ausreichender Wartezeit einen vorsichtig formulierten Vorher-Nachher-Vergleich liefert,
9. alle neuen Tests sowie die vollständige bestehende Testsuite erfolgreich sind.
