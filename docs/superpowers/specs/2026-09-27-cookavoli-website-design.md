# Cookavoli-Produktwebsite – Design-Spezifikation

**Stand:** 27. September 2026  
**Status:** Zur schriftlichen Freigabe  
**Zielsystem:** `cookavoli.com` im bestehenden Projekt `KomplettWebDesign`

## 1. Ziel und Rahmen

Cookavoli erhält eine eigenständige, zweisprachige B2C-Produktwebsite für
iOS und Android. Die Website erklärt die App überzeugend, führt durch den
Produktnutzen und ermöglicht vor der Veröffentlichung die Anmeldung zur
iOS-TestFlight-Beta beziehungsweise zur Android-Warteliste.

Die zentrale kommunikative Idee lautet:

> **Weniger grübeln. Mehr entdecken.**

Cookavoli soll die tägliche Findungsphase erleichtern und aus vielen
Möglichkeiten eine nachvollziehbare Entscheidung und anschließend einen Plan
machen. Die Wörter „Swipe and Cook“ werden dabei nicht als sichtbare
Hauptbotschaft verwendet. Die Website spricht Menschen an, nicht ein
abstraktes Feature-Set.

Die konkrete Cookavoli-Website ist ausschließlich für B2C ausgerichtet. Eine
B2B-Navigation, B2B-Landingpage oder Ansprache „für Teams“ gehört nicht zu
diesem Vorhaben.

## 2. Verbindliche Quellen und Grenzen

### Produktquelle

Verbindliche Produktinformationen, Funktionsumfang, Farben, Storestatus,
rechtliche Texte und später verwendete App-Screens stammen aus:

`/Users/blocksdorf/development/SwipeAndCook`

### Website-Zielprojekt

Die öffentliche Website wird ausschließlich in folgendem Projekt umgesetzt:

`/Users/blocksdorf/Documents/KomplettWebDesign`

Die bestehende Express-/EJS-Architektur wird erhalten. Neue Abhängigkeiten
werden nur aufgenommen, wenn eine zwingende, dokumentierte Notwendigkeit
entsteht. Die Website darf weder Flutter-Produktcode duplizieren noch direkt
auf dessen Datenbank zugreifen.

### Wahrheits- und Medienregeln

- Keine erfundenen Bewertungen, Nutzerzahlen, Auszeichnungen oder
  redaktionellen Zitate.
- Keine erfundenen Preise oder Storeangaben.
- Keine nachgebauten oder generierten App-Screens als vermeintliche
  Produktansichten.
- Sichtbare App-Screens werden frisch aus echten iOS- und Android-Builds
  aufgenommen.
- Funktionen werden nur beschrieben, wenn sie im Produktbestand belegt sind.
- Rechtliche Inhalte stammen ausschließlich aus den freigegebenen
  S2-Dokumenten im App-Projekt.
- Ein leerer Blog und inhaltsarme SEO-Seiten werden nicht angelegt.

## 3. Zielgruppen und Aufgaben der Website

Primäre Zielgruppe sind vielbeschäftigte Erwachsene, Singles, Paare und
Haushalte im deutschen beziehungsweise DACH-Markt. Die englische Fassung
bereitet den internationalen Einsatz vor.

Die Website muss vier zentrale Nutzerfragen beantworten:

1. Was nimmt Cookavoli mir im Alltag ab?
2. Wie führt die App von der Inspiration zu einer Entscheidung und Planung?
3. Wie funktioniert die gemeinsame Nutzung und wie geht Cookavoli mit
   Sicherheit und Daten um?
4. Wie kann ich Cookavoli jetzt testen oder mich für Android vormerken?

## 4. Veröffentlichungszustände

### Beta-Modus

Im anfänglichen Beta-Modus zeigen `/de/` und `/en/`:

- Anmeldung zur iOS-TestFlight-Beta;
- Android-Warteliste mit Hinweis „demnächst verfügbar“;
- keine Preise;
- keine App-Store- oder Google-Play-Buttons, solange die öffentlichen
  Storeseiten nicht verifiziert erreichbar sind.

### Release-Modus

Nach Veröffentlichung werden dieselben Komponenten und Inhaltsmodelle auf
den Release-Modus umgestellt. Dann können angezeigt werden:

- verifizierte App-Store- und Google-Play-Links;
- verifizierte Storepreise;
- der belegte siebentägige Trial;
- angepasste Handlungsaufforderungen zum Download.

### Release-Vorschau

- `/startseite2` zeigt die deutsche Release-Fassung.
- `/en/startseite2` zeigt die englische Release-Fassung.
- Vor dem Release erhalten beide Seiten `noindex, nofollow`.
- Beide Vorschauseiten werden vor dem Release aus der Sitemap ausgeschlossen.
- Sie verwenden dieselbe Komponenten- und Datenbasis wie die produktiven
  Startseiten und sind keine unabhängig gepflegten Kopien.

Ein zentraler, validierter Website-Modus `beta` oder `release` steuert
Verfügbarkeit, CTA-Texte, Storelinks und Preisdarstellung. Ein ungültiger
Modus führt beim Start kontrolliert zu einem Fehler statt zu einem gemischten
Seitenzustand.

## 5. Informationsarchitektur

### Deutsche Seiten

| Seite | Pfad | Hauptaufgabe |
| --- | --- | --- |
| Startseite | `/de/` | Produktidee, Nutzen, Produktbeweis und Beta-Einstieg |
| Funktionen | `/de/funktionen` | belegte Kernfunktionen nachvollziehbar erklären |
| So funktioniert’s | `/de/so-funktionierts` | Ablauf von Entdecken bis Planen zeigen |
| Gemeinsam planen | `/de/gemeinsam-planen` | gemeinsame Nutzung anhand echter Abläufe erklären |
| Sicherheit | `/de/sicherheit` | Sicherheit, Kontrolle und Datenschutz verständlich machen |
| Beta | `/de/beta` | TestFlight-Anmeldung und Android-Warteliste |
| FAQ | `/de/faq` | belegte häufige Fragen beantworten |
| Support | `/de/support` | Hilfe und Kontaktwege |
| Datenschutz | `/de/datenschutz` | freigegebener Rechtstext |
| Nutzungsbedingungen | `/de/nutzungsbedingungen` | freigegebener Rechtstext |
| Konto löschen | `/de/konto-loeschen` | App- und verifizierter Webweg |
| Impressum | `/de/impressum` | unveränderte Betreiberangaben mit Cookavoli-Marke |

### Englische Seiten

| Seite | Pfad |
| --- | --- |
| Homepage | `/en/` |
| Features | `/en/features` |
| How it works | `/en/how-it-works` |
| Plan together | `/en/plan-together` |
| Safety | `/en/safety` |
| Beta | `/en/beta` |
| FAQ | `/en/faq` |
| Support | `/en/support` |
| Privacy | `/en/privacy` |
| Terms | `/en/terms` |
| Delete account | `/en/delete-account` |
| Imprint | `/en/imprint` |

`/` leitet dauerhaft und eindeutig auf `/de/` weiter. Bestehende kurze
deutsche Cookavoli-Routen bleiben aus Kompatibilitätsgründen als dauerhafte
Weiterleitungen auf die neuen `/de/`-Ziele erhalten. Schutzdomains und
`www.cookavoli.com` leiten weiterhin auf die kanonische `.com`-Domain um.

## 6. Navigation

Der Header enthält:

- Cookavoli-Signet und gesetzten Text „Cookavoli“;
- Funktionen;
- So funktioniert’s;
- Gemeinsam planen;
- Sicherheit;
- Sprachwechsel Deutsch/Englisch;
- hervorgehobenen Beta- beziehungsweise Download-CTA.

Auf kleinen Viewports wird eine echte, tastaturbedienbare Menünavigation
verwendet. Horizontales Abschneiden oder eine nur per Wischgeste erreichbare
Hauptnavigation ist nicht zulässig.

Der Footer bündelt Produktnavigation, Support, Sprachwechsel und alle
rechtlichen Seiten. Es gibt keinen leeren Bloglink und keinen B2B-Einstieg.

## 7. Dramaturgie der Startseite

Die Startseite besteht aus 14 in Aufbau und Aufgabe klar unterschiedlichen
Bereichen. Die Bereiche dürfen nicht als Serie austauschbarer Drei- oder
Vierkartenraster erscheinen.

1. **Guided-Dual-Story-Hero**  
   Helle Findungswelt und dunkle App-Bühne treffen asymmetrisch aufeinander.
   Die Leitidee, der Beta-CTA und eine echte zentrale Geräteansicht sind ohne
   Scrollen verständlich.

2. **Verfügbarkeitsleiste**  
   Eine kompakte horizontale Statuszeile trennt iOS-TestFlight, Android
   „demnächst verfügbar“ sowie Deutsch/Englisch. Sie ersetzt weder
   Bewertungen noch erfundene Vertrauenszahlen.

3. **Die tägliche Entscheidungsfrage**  
   Eine redaktionelle, überwiegend typografische Komposition beschreibt den
   Moment vor der Entscheidung. Große und kleine Textflächen, freie Formen
   und gezielte Farbakzente erzeugen bewusst eine andere Anatomie als der
   Hero.

4. **Entdecken – Entscheiden – Planen**  
   Ein dreistufiger, vertikaler Ablauf verbindet kurze Erklärungen mit echten
   Screens. Auf Desktop wechseln Bild und Text die Seite; mobil bleibt die
   Lesereihenfolge linear.

5. **Entdeckungsbühne**  
   Eine dunkle, vollbreite Produktbühne zeigt echte App-Inhalte in einem
   automatisch fortschreitenden, aber vollständig kontrollierbaren
   Bild-Slider. Jeder Slide bleibt vollständig im Rahmen sichtbar; es gibt
   keinerlei vertikalen Slide oder Höhenwechsel.

6. **Entscheidungsdetail**  
   Ein einzelner großer Screen wird mit randständigen Erläuterungen und einer
   klaren visuellen Führung inszeniert. Keine wiederholte Kartenreihe.

7. **Persönliche Orientierung**  
   Ein unregelmäßiges, aber geordnetes Bento aus belegten Einstellungen,
   Signalen und Ergebnissen erklärt, wie Cookavoli Orientierung schafft. Es
   werden nur tatsächlich vorhandene Produktzustände gezeigt.

8. **Wochenplanung als Panorama**  
   Eine breite, helle Oberfläche zeigt die Planung in einem Tablet- oder
   großen Gerätefenster. Die Bildhöhe wird durch einen festen Medienrahmen
   begrenzt; das Originalbild wird mit `object-fit: contain` vollständig
   dargestellt.

9. **Gemeinsam planen**  
   Zwei versetzt angeordnete Geräte und eine verbindende visuelle Spur zeigen
   den belegten gemeinsamen Ablauf. Die Sektion verlinkt auf die eigenständige
   Detailseite.

10. **Alltagssituationen**  
    Ein tabbed Storyboard wechselt zwischen wenigen belegten
    Anwendungssituationen. Tabs besitzen vollständige ARIA-Beziehungen und
    funktionieren per Tastatur; ohne JavaScript sind alle Inhalte lesbar.

11. **Funktionskonstellation**  
    Eine radiale oder frei gesetzte Übersicht verbindet die zentralen
    Funktionen mit einem Mittelpunkt. Sie darf nicht als generischer
    Drei-Karten-Block umgesetzt werden.

12. **Sicherheit und Kontrolle**  
    Eine ruhige, helle Akkordeon-Komponente beantwortet konkrete
    Sicherheitsfragen. Alle Schalter besitzen korrekte Zustände; ohne
    JavaScript bleiben die Inhalte zugänglich.

13. **Kompaktes FAQ**  
    Eine eigenständige, zweispaltige FAQ-Anordnung zeigt nur die wichtigsten
    Fragen und führt zur vollständigen FAQ-Seite. Markup und sichtbarer Text
    stimmen überein.

14. **Beta-Abschluss**  
    Eine kontrastreiche Abschlussfläche enthält Plattformwahl,
    Double-Opt-in-Hinweis und das Beta-Formular. iOS und Android werden klar
    getrennt, ohne eine Plattform künstlich abzuwerten.

Die Veröffentlichungsversion verwendet dieselbe Dramaturgie. Sie ersetzt
Beta-Status und Formular durch verifizierte Store-CTAs und den belegten
Trial, ohne die Seite strukturell zu duplizieren.

## 8. Visuelle Richtung: Guided Dual Story

### Grundidee

Helle, optimistische Findungsbereiche wechseln mit dunklen, konzentrierten
Produktbühnen. Die Verteilung bleibt ausgewogen. Dunkel ist kein permanenter
Seitenhintergrund, sondern markiert Momente, in denen die App selbst im
Mittelpunkt steht.

### Farbwelt

Die Website übernimmt die belegten Appfarben:

- Tiefschwarz-Grün: `#050A07`
- dunkles Grün: `#0D1812`
- Cookavoli-Limette: `#59F21C`
- helles Mint: `#EEF7EC`
- Papierweiß: `#F8FCF7`
- dunkle Textfarbe: `#102014`

Zusätzliche warme Farben dürfen ausschließlich als sparsame Akzente für
Findungsbewegung, Lebensmittel oder Übergänge eingesetzt werden. Alle
Text-Hintergrund-Kombinationen müssen mindestens WCAG AA erfüllen.

### Typografie

- UI, Navigation, Fließtext und prägnante Überschriften verwenden den
  vorhandenen modernen Sans-Stack um „Avenir Next“.
- Ausgewählte redaktionelle Zwischenüberschriften dürfen den vorhandenen
  Serif-Stack um „Iowan Old Style“ einsetzen.
- Der Serif-Stil wird gezielt und nicht in jedem Abschnitt wiederholt.
- Größen, Zeilenlängen und Abstände werden als wiederverwendbare Tokens
  definiert; manuelle Einzelwerte pro Sektion sind zu vermeiden.

### Formen, Kanten und Tiefe

- große App-Bühnen: weich gerundete Geräte- und Medienrahmen;
- redaktionelle Bereiche: teilweise gerade oder nur leicht gerundete Kanten;
- interaktive Elemente: klar erkennbare, konsistente Radien;
- Schatten nur zur Tiefenstaffelung von Geräten und beweglichen Ebenen;
- keine flächendeckende Sammlung identischer abgerundeter Karten.

### Marke

Das vom Nutzer zuletzt gesendete CA-Blatt-Icon wird vorläufig als exakte
visuelle Referenz verwendet. Für die Implementierung wird das übermittelte
Motiv lokal, optimiert und ohne selbst erfundene Neuinterpretation
eingebunden. Es muss später ohne Layoutumbau gegen das finale Originalasset
austauschbar sein.

Die zuvor gezeigte Wortmarke ist nicht als aktuell bestätigt und wird nicht
verwendet. Bis zur Lieferung einer finalen Wortmarke steht neben dem Icon
gesetzter Text „Cookavoli“.

## 9. App-Screens und Medienkomponenten

- Screens werden unmittelbar vor der Umsetzung aus aktuellen echten Builds
  aufgenommen.
- iOS-Screens erscheinen in einem neutralen Smartphone-Rahmen; Android kann
  mit einem eigenen neutralen Rahmen gekennzeichnet werden.
- Rahmen werden mit CSS gebaut und täuschen kein konkretes Gerätemodell vor.
- Tablets oder große Oberflächen erhalten ein eigenes Seitenverhältnis.
- Screens werden nicht verzerrt oder willkürlich beschnitten.
- Für Medien gelten explizite `aspect-ratio`, `max-height`, `width: 100%` und
  je nach Aussage `object-fit: contain` oder ein bewusst dokumentierter Crop.
- Kein Bild darf die Inhaltshöhe einer Sektion unkontrolliert bestimmen.
- Slider behalten über alle Slides eine stabile Höhe.
- Automatische Slider pausieren bei Hover, Fokus, unsichtbarem Tab und
  reduzierter Bewegung.
- Vor/Zurück, Positionsanzeige und direkte Auswahl bleiben verfügbar.
- Auf Mobilgeräten wird ein ganzer Slide dargestellt; es gibt keine
  unbeabsichtigte vertikale Bewegung beim horizontalen Wechsel.
- Aussagekräftige Screens erhalten lokalisierte Alt-Texte. Dekorative
  Rahmen bleiben für Screenreader verborgen.

## 10. Komponenten- und Inhaltsmodell

Deutsch und Englisch verwenden gemeinsame Komponenten und getrennte,
vollständige Inhaltsobjekte. Jede Inhalts-ID muss in beiden Sprachen vorhanden
sein. Ein automatisierter Paritätstest verhindert fehlende Übersetzungen.

Zentrale Datenbereiche sind:

- globale Marken- und Kontaktinformationen;
- Navigation und Footer;
- Seitentitel, Beschreibungen und Social-Metadaten;
- Beta-/Release-Verfügbarkeit;
- Storelinks und verifizierte Preise;
- Startseitenabschnitte;
- Funktionen und Abläufe;
- FAQ;
- rechtliche Metadaten und Versionsstände.

EJS-Partials werden nach echter Wiederverwendung geschnitten. Unterschiede
zwischen Sektionen werden nicht durch dutzende nahezu identische Varianten
oder lange Klassenlisten simuliert. Interaktive Komponenten werden progressiv
erweitert: Grundinhalt und Kernnavigation funktionieren serverseitig ohne
JavaScript.

## 11. Content-, SEO- und Conversion-System

### Tonalität

- klar, zugewandt und alltagsnah;
- keine künstliche Dringlichkeit;
- keine unbelegten Superlative;
- kurze, aktive Handlungsaufforderungen;
- Produktnutzen vor technischer Funktionsliste;
- deutsche Texte nach deutschen Grammatikregeln mit korrekten Umlauten;
- englische Texte werden idiomatisch übertragen und nicht Wort für Wort
  übersetzt.

### Handlungsaufforderungen

Im Beta-Modus sind die primären CTAs:

- „iOS-Beta testen“;
- „Für Android vormerken“;
- englisch entsprechend „Join the iOS beta“ und „Join the Android waitlist“.

„Kostenlos“, konkrete Einladungszeiten oder garantierter Zugang werden nur
genannt, wenn dies nachweislich zugesichert werden kann.

### Suchmaschinenoptimierung

- Jede Seite besitzt einen eindeutigen lokalisierten Titel und eine
  eigenständige Beschreibung.
- Canonicals zeigen immer auf die jeweilige `.com`-Sprachroute.
- Deutsch und Englisch werden über vollständige `hreflang`-Paare verbunden.
- Die Sitemap enthält ausschließlich indexierbare kanonische Seiten.
- `SoftwareApplication` wird nur mit belegten Angaben ausgegeben.
- `Offer`-Daten und Preise erscheinen erst im Release-Modus und nur nach
  Storeverifikation.
- `FAQPage` entspricht exakt den sichtbaren Fragen und Antworten.
- Es gibt kein `AggregateRating` ohne reale, überprüfbare Bewertungen.
- Unterseiten verwenden sinnvolle interne Links statt künstlicher
  Keyword-Wiederholungen.

### Messung

Erfasst werden nur einwilligungsabhängige First-Party-Ereignisse, etwa:

- Auswahl iOS oder Android;
- Start und erfolgreicher Abschluss der Anmeldung;
- Wechsel zur englischen oder deutschen Fassung;
- im Release-Modus Klick auf verifizierte Storelinks.

Es werden keine Werbepixel eingesetzt. Formularinhalte, E-Mail-Adressen und
Bestätigungstoken gelangen nicht in Analytics-Ereignisse.

## 12. Beta-Anmeldung und Double-Opt-in

### Formularfelder

- E-Mail-Adresse;
- Plattform `ios` oder `android`;
- Sprache `de` oder `en`;
- ausdrückliche Einwilligung;
- unsichtbares Honeypot-Feld.

Alle Felder werden serverseitig mit einem strikten Schema validiert. Die
E-Mail-Adresse wird normalisiert. Zusätzliche, nicht erwartete Felder werden
zurückgewiesen.

### Ablauf

1. Der Nutzer sendet das Formular auf der passenden Sprachseite ab.
2. Die Website überträgt die validierten Daten an einen fest definierten
   Cookavoli-API-Endpunkt.
3. Der API-Dienst speichert die Anmeldung im bestehenden PostgreSQL-Kontext.
4. `system@cookavoli.com` versendet über die vorgesehene Manitu-Infrastruktur
   eine lokalisierte Double-Opt-in-E-Mail.
5. Der E-Mail-Link öffnet eine nicht indexierbare Bestätigungsseite.
6. Eine ausdrückliche Bestätigung per POST verhindert versehentliche
   Aktivierung durch automatische Linkscanner.
7. Nach erfolgreicher Bestätigung erscheint eine plattformspezifische,
   lokalisierte Erfolgsseite.

Bestätigungstoken werden gehasht gespeichert, laufen ab und werden weder in
Analytics noch in Anwendungsprotokollen erfasst. Doppelte Anmeldungen und
unbekannte E-Mail-Adressen erhalten nach außen neutrale Antworten.

## 13. Fehler- und Sonderfälle

Das System benötigt verständliche Zustände für:

- ungültige oder fehlende Eingaben;
- fehlende Einwilligung;
- bereits vorhandene Anmeldung;
- abgelaufenen oder ungültigen Bestätigungslink;
- vorübergehend nicht erreichbaren API- oder E-Mail-Dienst;
- Rate-Limit;
- verzögerte Zustellung;
- ausgeschöpfte TestFlight-Kapazität;
- deaktiviertes JavaScript.

Fehler werden direkt am Feld und in einer fokussierbaren Zusammenfassung
ausgegeben. Bei vorübergehenden Fehlern bleiben nicht sensible Eingaben
erhalten. Interne Dienst-, Datenbank- oder Providerdetails werden nie an den
Browser weitergereicht.

## 14. Sicherheit

Die vorhandenen Schutzmechanismen der Standalone-Website bleiben bestehen:

- Content Security Policy;
- HSTS;
- `X-Content-Type-Options: nosniff`;
- restriktive Referrer- und Permissions-Policy;
- Host-Allowlist und kanonische Domainweiterleitungen;
- signierter `HttpOnly`-, `Secure`- und `SameSite=Lax`-CSRF-Cookie;
- zeitkonstanter Vergleich sicherheitsrelevanter Werte.

Die Beta-Anmeldung folgt dem bestehenden Kontolöschungs-Gateway-Muster:

- ausschließlich `https://api.cookavoli.com` als API-Origin;
- HTTPS-Pflicht und Zurückweisung abweichender Pfade oder Zugangsdaten in der
  Basis-URL;
- blockierte Redirects;
- kurze Timeouts;
- sichere öffentliche Fehler-Allowlist;
- Rate-Limiting und Honeypot;
- keine Datenbankzugänge im Website-Prozess;
- `Cache-Control: no-store` für Bestätigungs- und Formularergebnisse.

Noch vorhandene interne Fehlerkennungen mit der Altmarke werden kontrolliert
auf Cookavoli-Bezeichnungen umgestellt. Öffentliche Sicherheitseigenschaften
und bestehende Kontolöschungsabläufe dürfen dabei nicht regressieren.

## 15. Rechtliche Seiten

Die deutschen S2-Dokumente bleiben die einzige verbindliche Inhaltsquelle für
Datenschutz, Nutzungsbedingungen, Support und Kontolöschung. Kontrollierte
Ersetzungen aktualisieren Marke, öffentliche URLs und Cookavoli-Kontakte,
ohne den Rechtstext inhaltlich neu zu erfinden.

Der rechtliche Betreiber bleibt unverändert. Die englischen Fassungen werden
inhaltstreu übersetzt, als Übersetzung gekennzeichnet und vor öffentlicher
Freigabe juristisch abschließend geprüft. Jede Seite zeigt ihren tatsächlichen
Versionsstand.

## 16. Barrierefreiheit und Bewegung

- genau eine Hauptüberschrift pro Seite;
- semantische Bereiche und nachvollziehbare Überschriftenfolge;
- Skip-Link und sichtbare Fokuszustände;
- vollständige Tastaturbedienung von Menü, Tabs, Akkordeons und Slidern;
- ARIA nur dort, wo native Elemente nicht ausreichen;
- keine Information ausschließlich über Farbe, Position oder Bewegung;
- Formulare mit echten Labels, Fehlerzuordnung und Statusmeldungen;
- Mindestzielgröße für interaktive Elemente;
- `prefers-reduced-motion` deaktiviert automatische und dekorative Bewegung;
- Animationen verändern weder Layout noch Scrollposition;
- kein globales `overflow-wrap: anywhere`;
- kein globales Verstecken horizontaler Layoutfehler mit `overflow-x: hidden`.

## 17. Responsive Verhalten und Performance

Die Seite wird für kleine Smartphones, große Smartphones, Tablets, Laptops
und breite Desktopansichten geprüft.

- Inhalte wechseln sinnvoll ihre Reihenfolge, statt nur kleiner zu werden.
- Bild und Text können je nach Abschnitt links oder rechts beginnen.
- Asymmetrische Desktopbereiche werden mobil bewusst linearisiert.
- Medien besitzen begrenzte Höhen und stabile Seitenverhältnisse.
- Hero- und Sliderbilder verwenden responsive Quellen und feste Maße gegen
  Layoutsprünge.
- Nicht sichtbare Medien werden verzögert geladen; der Hero nicht.
- Animationen nutzen transformierbare Ebenen und vermeiden Layout-Thrashing.
- Es werden keine unnötigen Bibliotheken für Slider, Tabs oder Akkordeons
  ergänzt.

## 18. Technische Einordnung

Die bestehende Struktur wird erweitert, nicht ersetzt:

- `cookavoli/app.js` behält Hostschutz, Header, statische Assets und
  Fehlerbehandlung;
- `routes/cookavoliStaticPages.js` erhält sprach- und modusfähige Routen;
- neue Inhalts- und Konfigurationsdaten bilden Sprache, Modus, Navigation und
  SEO zentral ab;
- `views/cookavoli/` erhält gemeinsame Layouts, Seiten und echte
  Komponenten-Partials;
- `public/cookavoli/site.css` bleibt die wartbare CSS-Quelle des
  Standalone-Auftritts;
- kleines, eigenständiges JavaScript erweitert Menü, Tabs, Akkordeon und
  Slider progressiv;
- ein neues Beta-Gateway folgt der Struktur von
  `services/cookavoliAccountDeletionGateway.js`;
- die bestehende Kontolöschung und ihre Freigabeschaltung bleiben erhalten.

Die Altmarken-Templates der übrigen Komplett-Webdesign-Website werden nicht
ungeprüft entfernt, weil sie weiterhin von bestehenden Tests und Routen
verwendet werden können.

## 19. Verifikation und Abnahme

Vor Umsetzung werden gezielte fehlschlagende Regressionstests ergänzt. Nach
der Umsetzung werden mindestens folgende Punkte geprüft:

### Routing und SEO

- alle deutschen und englischen Routen liefern die erwartete Sprache;
- `/` und Bestandsrouten leiten korrekt weiter;
- Canonicals, `hreflang`, Open Graph und strukturierte Daten stimmen;
- Preview-Seiten sind vor Release `noindex` und nicht in der Sitemap;
- Releasepreise und Storelinks erscheinen nur nach Verifikation;
- 404-Seiten sind lokalisiert und nicht indexierbar.

### Inhalt und Marke

- keine sichtbare Altmarke;
- keine B2B- oder „für Teams“-Ansprache;
- keine Platzhalter-, QA- oder internen Begriffe;
- vollständige Sprachparität;
- nur freigegebene Icons und echte Screens;
- keine erfundenen Claims, Bewertungen oder Preise.

### Formulare und Sicherheit

- strikte Validierung aller Formularfelder;
- CSRF-Ablehnung ohne gültigen Cookie und Token;
- feste API-Herkunft, Redirectschutz und Timeout;
- neutrale Antworten bei doppelten Anmeldungen;
- Double-Opt-in ist ablaufend, idempotent und linkscannerfest;
- sichere Fehlerzuordnung ohne interne Details;
- bestehende Kontolöschungs- und Sicherheitsregressionstests bleiben grün.

### Oberfläche

- genau eine H1 und semantische Abschnittsstruktur;
- Tastaturbedienung und sichtbarer Fokus;
- vollständige Tab- und Akkordeonstrukturen;
- stabile Sliderhöhe ohne vertikales Springen;
- alle Screens vollständig und proportional dargestellt;
- keine überlangen Bildsektionen;
- keine horizontale Seitenbewegung;
- große und kleine Viewports werden im echten Browser geprüft;
- Browserkonsole enthält keine relevanten Fehler oder Warnungen;
- automatische Bewegung respektiert reduzierte Bewegung und Pausenzustände.

### Testumfang

- gezielte Node-Testläufe für Cookavoli;
- vollständiger vorhandener Projekttest;
- vorhandener CSS-/Asset-Build;
- Repository-Audit und Branch-Preset-Acceptance, soweit auf die konkrete
  Website anwendbar;
- abschließende Sichtprüfung der deutschen und englischen Beta- sowie
  Release-Vorschau.

## 20. Nicht Bestandteil

- Änderungen am Flutter-Produktumfang;
- neue oder erfundene App-Funktionen;
- B2B-Seiten oder B2B-Komponenten für Cookavoli;
- ein Blog ohne reale Inhalte;
- bezahlte Werbetracker oder Retargeting-Pixel;
- öffentliche Preise vor Storeverifikation;
- selbst erfundene rechtliche Texte;
- ein Deployment oder eine Umschaltung auf Release ohne gesonderte
  Freigabe;
- Entfernung bestehender Nutzeränderungen in einem der beiden Repositories.

## 21. Freigabeprotokoll

Folgende Entscheidungen wurden abschnittsweise bestätigt:

1. gemeinsame Komponentenbasis mit serverseitiger Sprache und zentralem
   Beta-/Release-Modus;
2. zweisprachige Seiten- und SEO-Architektur auf `cookavoli.com`;
3. Startseiten-Dramaturgie mit 14 unterschiedlichen Bereichen;
4. visuelle Richtung „Guided Dual Story“ mit ausgewogener Hell-Dunkel-Welt;
5. Content-, SEO- und Conversion-System ohne leeren Blog;
6. technische Architektur, Beta-Formular, Fehlerfälle, Sicherheit und Tests;
7. vorläufige Nutzung des zuletzt übermittelten CA-Blatt-Icons;
8. keine B2B-Inhalte auf der konkreten Cookavoli-Website.

Die Umsetzung beginnt erst nach schriftlicher Freigabe dieser Spezifikation
und eines anschließend separat erstellten Umsetzungsplans.
