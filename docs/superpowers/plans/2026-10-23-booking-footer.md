# Footer und Buchungsseite – Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Den Footer vereinfachen und die persönliche Über-mich-Seite mit einer passenden, verständlichen Terminbuchung verbinden.

**Architecture:** Bestehende EJS-Templates, gezieltes Seiten-CSS und den vorhandenen JS-Kalender weiterverwenden. Keine neuen Abhängigkeiten und keine Datenbankmigration. Reine Datum-/Slot-/Formularzustandsfunktionen im Kalender-Modul lassen sich mit Node prüfen.

**Tech Stack:** Express, EJS, CSS/PostCSS, Browser-Module, Node-Test-Runner, IAB.

**Spec:** docs/superpowers/specs/2026-10-23-booking-footer-design.md

## Anforderungen

Echte Umlaute, bestehende Markenschriften und Farben. Rechtliche Adressdaten erhalten. Mail-Text exakt wie bestellt. Keine echten Buchungen im Test. Gemeinsame Inhaltsbreiten, sichtbare Labels, Tastaturbedienung, reduzierte Bewegung, mobile Darstellung ab 320 px.

## Aufgaben

- [x] Footer mit kompakten Kontaktdaten und ausgerichteten Navigationsspalten umsetzen; neuen Google-Profil-Link zentral einsetzen. Öffentlich gerenderte Ausgabe prüfen.
- [x] Projektüberschriften und „Besonders“-Hinweise vereinheitlichen, Mailbutton neben Buchungsbutton, Telefonnummer dort entfernen, dezente Animationen ergänzen. Bestehende gerenderte About-Prüfungen auf die ausdrücklich bestellte neue Kontaktaktion aktualisieren.
- [x] Verhaltenstests für Berliner Tagesgrenzen, Jahres-/Monatswechsel, unsortierte/vergangene Slots und Formularfortschritt schreiben und den Fehler vor der Umsetzung sehen.
- [x] Kalender-Vorauswahl, Änderbarkeit und schrittweise Felder implementieren. Buchungsseite gestalten, deutsche und englische Texte überarbeiten, reCAPTCHA und Tester-Kontext erhalten.
- [x] Kontaktseite passend gestalten: Hero mit Ansprechpartner, klare Anfrageauswahl, Formular- und Wizard-Darstellung sowie Kontaktalternativen. Bestehende Formularverträge anhand gerenderter Felder vor/nach dem Umbau vergleichen.
- [ ] CSS bauen, komplette Testsuite ausführen, Browser bei 320/390/768/1440 px und alle Formularzustände prüfen. Frisches unabhängiges Review, committen, über bestehende Freigabe veröffentlichen und live verifizieren.

## Review Focus

- Berlin ist bereits am Folgetag, während der Browser noch den Vortag zeigt; Vorschlag beginnt trotzdem ab dem Berliner Folgetag.
- Morgen oder der ganze aktuelle Monat enthält keine freien Termine: nächsten verfügbaren Tag finden, ohne Auswahl zu erfinden.
- Schneller Wechsel von Tag/Monat: verspätete Antworten überschreiben keine neue Auswahl.
- Autofill, Name korrigieren, Datum nach Eingabe wechseln: Felder und Werte bleiben bedienbar und erhalten.
- 320 px, lange deutsche Beschriftungen und reduzierte Bewegung: kein horizontaler Überlauf oder versteckter Pflichtfeldfehler.
