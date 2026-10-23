# Über-mich-Seite und Navigation – Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eine persönlich überzeugende, suchmaschinenfreundliche Über-mich-Seite sowie funktionierende Nach-oben-Navigation und die gewünschte Namensanzeige.

**Architecture:** Bestehende EJS-Templates und lokales CSS verwenden. Seiteninhalte und FAQ in `data/aboutPage.js`, vorhandene Referenzdaten im Controller wiederverwenden, strukturierte Daten im Controller erzeugen. Kein neues Framework und keine Datenbankmigration.

**Tech Stack:** Express, EJS, CSS/PostCSS, Node-Test-Runner und Browser/IAB.

**Spec:** `docs/superpowers/specs/2026-10-23-about-design.md`

## Globale Anforderungen

Echte Umlaute, deutsche Grammatik, Weiß/Dunkelblau/Orange, bestehendes Porträt und belegte Referenzen. Keine erfundenen Erfahrungs- oder Erfolgszahlen. Seiten-CSS bleibt auf `.about-page` begrenzt. Bestehende Person-/Organisations-IDs und zentrale Kontaktdaten verwenden.

## Aufgaben

- [x] Nach-oben-Fehler im Browser reproduzieren, natives globales Ziel einsetzen und auf Seiten ohne `#hero` prüfen. Startseitenvorstellung und Footer auf „Sören“ anpassen.
- [x] Vorhandene, an alten CSS-Werten festhaltende About-Tests durch Prüfungen von gerenderter Leserführung, Kontaktwegen, Datenherkunft und Schema ersetzen; vor Umsetzung den erwarteten Fehler nachweisen.
- [x] `data/aboutPage.js`, `views/about.ejs`, `public/about.css` und `controllers/mainController.js` gemäß den drei Gestaltungsreferenzen überarbeiten. Reale Referenzdaten importieren. AboutPage und BreadcrumbList vervollständigen.
- [x] CSS neu bauen, gesamte Testsuite ausführen, alle drei Hauptabschnitte im Browser mit den Konzepten vergleichen und mobile Darstellung sowie Tastaturbedienung prüfen.
- [ ] Änderungen unabhängig prüfen lassen, konkrete Fehler beheben und innerhalb der erteilten Veröffentlichungsfreigabe ausrollen. Live-Version, Healthchecks und die drei Nutzerwünsche verifizieren.

## Prüfschwerpunkte

- Seiten ohne Hero-ID sowie wiederholte Nach-oben-Klicks und Tastaturaktivierung.
- Lange Überschriften und deutsche Wörter bei 320 px, inklusive Cookie-Banner und fixierter Aktionen.
- Globale Legacy-CSS-Regeln für Hero, Listen, Links und Footer dürfen den neuen Seitensatz nicht überschreiben.
- FAQ, Bildbeschreibungen, Kundenstimme und JSON-LD müssen zu den wirklich angezeigten Inhalten passen.
- Produktiver Stand und fremde lokale Arbeiten müssen bei Integration und Deployment erhalten bleiben.
