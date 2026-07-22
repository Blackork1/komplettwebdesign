# Swipe-&-Cook-Datenschutzseite – Design-Spezifikation

**Stand:** 22. Juli 2026  
**Status:** Vom Auftraggeber visuell freigegeben

## Ziel

Die Website erhält unter `/swipeandcook-datenschutz` eine eigenständige,
öffentlich erreichbare Datenschutzseite für die App „Swipe & Cook“. Die
allgemeine Website-Datenschutzerklärung unter `/datenschutz` bleibt
unverändert und wird auf der neuen Seite ergänzend verlinkt.

## Inhaltsquelle

Die vollständigen Rechtstexte stammen aus
`SwipeAndCook/docs/privacy/swipe-and-cook-datenschutzhinweise-entwurf.md` in
der am 22. Juli 2026 freigegebenen Fassung. Inhaltliche Kürzungen aus der
Designvorschau werden nicht als Ersatz für den vollständigen Text verwendet.

Die veröffentlichte Seite enthält:

1. Einleitung und Verweis auf die allgemeine Datenschutzerklärung;
2. Datenverarbeitung für Konto, Anmeldung, Rezeptnutzung und Betriebslogs;
3. Empfänger und Dienste Supabase, IONOS, Manitu, Google und Apple;
4. Aufbewahrung und Löschung;
5. Betroffenenrechte, Kontakt und Änderungen.

Interne Dokumentpfade oder Hinweise auf interne S0-Bewertungen erscheinen
nicht im öffentlichen Text. Die zugehörige Aussage zu Google und Apple wird
als allgemein verständliche Drittlandinformation veröffentlicht.

## Gestaltung

Die freigegebene mobile Vorschau wird in das bestehende Designsystem von
Komplett Webdesign übertragen:

- normaler Website-Header und bestehender Footer;
- heller Hero mit Kennzeichnung „Swipe & Cook“, großer Überschrift
  „Datenschutzhinweise“ und Aktualisierungsdatum;
- kompakte Zusammenfassung unmittelbar unter dem Hero;
- gut lesbare, fortlaufende Inhaltsabschnitte;
- eingesetzte Dienste als einzelne, klar abgegrenzte Informationskarten;
- hervorgehobener Kontaktblock am Ende;
- dunkelblaue Grundfarbe, bestehende Website-Farben und grüner
  Swipe-&-Cook-Akzent;
- auf Mobilgeräten einspaltig und ohne horizontales Scrollen;
- auf größeren Bildschirmen begrenzte Textbreite für gute Lesbarkeit.

## Navigation und Metadaten

- Die Route wird in `routes/staticPages.js` registriert.
- Im Footer-Bereich „Rechtliches“ wird der Link „Swipe & Cook Datenschutz“
  ergänzt.
- Seitentitel: `Swipe & Cook Datenschutz | Komplett Webdesign`.
- Beschreibung: kurze Erläuterung der Verarbeitung von Konto-, Anmelde- und
  Rezeptdaten in Swipe & Cook.
- `currentPathname` wird gesetzt, damit Canonical- und Navigationslogik die
  neue Route korrekt behandeln.

## Barrierefreiheit und Sicherheit

- semantische Überschriftenhierarchie mit genau einer Hauptüberschrift;
- erkennbare Fokuszustände und ausreichende Farbkontraste;
- echte Links für E-Mail und allgemeine Datenschutzerklärung;
- keine Drittanbieter-Skripte oder neuen Cookies für diese Seite;
- keine personenbezogenen Daten, geheimen Werte oder internen Systemdetails
  im Markup.

## Verifikation

Automatisierte Tests prüfen mindestens:

- HTTP 200 für `/swipeandcook-datenschutz`;
- korrekten Seitentitel und zentrale Textbestandteile;
- vorhandenen Footer-Link;
- unveränderte Erreichbarkeit von `/datenschutz`;
- kein interner Dokumentpfad im gerenderten HTML.

Zusätzlich werden die mobile Darstellung und die öffentliche Route nach dem
Deployment geprüft.

## Nicht Bestandteil

- Änderungen an der allgemeinen Datenschutzerklärung;
- eine englische Übersetzung;
- neue Tracking-, Consent- oder Kontaktfunktionen;
- direkte Bearbeitung von Dateien auf dem VPS.
