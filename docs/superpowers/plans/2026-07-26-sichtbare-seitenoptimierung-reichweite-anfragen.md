# Sichtbare Seitenoptimierung für Reichweite und Anfragen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die vorhandenen Seiten werden sichtbar, inhaltlich und strukturell so verbessert, dass sie klarere Suchintentionen bedienen, mehr organische Reichweite aufbauen und Besucher anschließend gezielter zu einer passenden Anfrage führen.

**Architecture:** Die bestehende Node.js-/Express-/EJS-Struktur bleibt erhalten. Inhalte werden weiterhin in den vorhandenen Datenmodulen gepflegt und serverseitig gerendert. Es entstehen standardmäßig keine neuen öffentlichen URLs; stattdessen werden bestehende Kernseiten, Branchen-Seiten, Referenzen und Ratgeber aktualisiert und über kontextuelle interne Links miteinander verbunden.

**Tech Stack:** Node.js 22, Express, EJS, CSS, PostgreSQL für datenbankgestützte Inhalte, Node Test Runner, bestehender SEO-Recovery-Audit.

## Global Constraints

- Alle sichtbaren Texte verwenden korrektes Deutsch mit echten Umlauten.
- Es werden keine Ranking-, Umsatz-, Anfrage- oder Rechtsgarantien formuliert.
- Es werden keine erfundenen Bewertungen, Referenzen, Kennzahlen oder Projektergebnisse ergänzt.
- Es werden keine neuen öffentlichen Seiten angelegt, solange eine bestehende Seite dieselbe Suchintention sinnvoll übernehmen kann.
- Bestehende kanonische URLs werden beibehalten.
- Die Weiterleitungen auf `/webdesign-berlin` und den etablierten Website-Kosten-Artikel bleiben erhalten.
- Preise, Paketnamen und Leistungsgrenzen stammen aus den bestehenden zentralen Paketdaten.
- Reichweite wird ohne GA4 ausgewertet: maßgeblich sind Google Search Console, HTTP-Status-/Indexierungsprüfungen und tatsächlich eingegangene Anfragen.
- Vor einem weiteren Server-Deployment erhält der Nutzer eine lokale Vorschau und eine verständliche Liste der sichtbaren Änderungen.
- Minifizierte CSS-Dateien und das Asset-Manifest werden ausschließlich über `npm run build` erzeugt.

---

## Was sich für Besucher sichtbar ändern wird

| Bestehende Seite | Sichtbare Verbesserung | Zweck |
| --- | --- | --- |
| `/` | Klarerer Einstieg, Nutzen statt Technik im Vordergrund, Branchenwege, echte Referenzen, transparente Pakete und eindeutige nächste Schritte | Kalte Besucher schneller abholen und auf die passende Hauptseite führen |
| `/webdesign-berlin` | Stärkere Ausrichtung auf „Website erstellen lassen Berlin“, Entscheidungshilfe, Projektbeispiele, Paketbezug und lokaler Ablauf | Wichtigste kommerzielle Suchintention abdecken |
| `/pakete` | Verständlicher Paketfinder, direkte Leistungsabgrenzung, laufende Kosten und passendere Paket-CTAs | Preisinteressierte nicht mit Details alleinlassen |
| `/leistungen` | Leistungen nach Nutzerzielen gruppieren statt nur aufzuzählen | Besucher schneller zur richtigen Lösung führen |
| `/leistungen/website-relaunch` | Relaunch-Risiken, Ablauf, Weiterleitungen und echte Vorher-/Nachher-Referenz | Kommerzielle Relaunch-Anfragen gewinnen |
| `/leistungen/website-audit` | Konkrete Prüfpunkte, Ergebnisbeispiel, Abgrenzung zum kostenlosen Tester | Audit als nachvollziehbare Leistung positionieren |
| `/leistungen/local-seo` | Lokale Maßnahmen, Voraussetzungen, Leistungsumfang und Grenzen konkret erklären | Relevanz für lokale Suchanfragen erhöhen |
| `/leistungen/website-wartung` | Wartungsumfang, Reaktionswege, Abgrenzung und laufende Kosten verständlich zeigen | Unsicherheit vor laufender Betreuung reduzieren |
| `/leistungen/landingpage-erstellen-lassen` | Einsatzfälle, benötigte Inhalte und Unterschied zur vollständigen Website erklären | Passende statt allgemeiner Anfragen erzeugen |
| `/branchen` | Branchen nach Bedarf und Ergebnis gruppieren | Bestehende Branchen-Seiten leichter auffindbar machen |
| `/branchen/webdesign-blumenladen` | Lokale Suchintention, konkrete Funktionen, Paketbezug und passende SEO-Hilfe | Vorhandene Impressionen besser in Klicks und Anfragen überführen |
| `/branchen/webdesign-immobilienmakler` | Klare kommerzielle Rolle gegenüber dem Informationsartikel | Kannibalisierung reduzieren |
| bestehende Kosten-, Blumenladen- und Immobilienartikel | Jahresaktuelle Inhalte, bessere Antwortstruktur und klare Links zu passenden Leistungsseiten | Vorhandene Impressionen nutzen, ohne neue Artikel zu erzeugen |
| `/referenzen` und Detailseiten | Projektergebnis, Ausgangslage, Umsetzung und reale Kundenstimme früher sichtbar | Vertrauen aufbauen |
| `/website-tester` und `/website-tester/seo` | Verständlicher Testumfang, Beispielergebnis und passende Weiterleitung zum Audit | Informationsbesucher sinnvoll weiterführen |
| `/kontakt` | Kürzerer Einstieg und zur Ausgangsseite passende Vorauswahl | Erst nach dem Reichweitenaufbau Anfragehürden senken |

## Verbindliche Reihenfolge

1. Suchintention und Abnahmekriterien technisch festschreiben.
2. Startseite und zentrale Berlin-Seite sichtbar verbessern.
3. Paket- und Leistungsseiten verständlicher machen.
4. Bestehende Branchen- und Ratgeberchancen überarbeiten.
5. Referenzen, Tester und interne Verlinkungen stärken.
6. Kontaktweg passend zu den überarbeiteten Seiten vereinfachen.
7. Lokal prüfen, vom Nutzer abnehmen lassen und erst danach deployen.
8. Google-Indexierung, Reichweitenverteilung und die 28-Tage-Auswertung durchführen.

---

### Task 1: Seitenziele und Abnahmekriterien zentral festschreiben

**Files:**
- Modify: `data/seoIntentRegistry.js`
- Modify: `tests/seoIntentRegistry.test.js`
- Create: `tests/corePageJourney.test.js`

**Interfaces:**
- Consumes: `SEO_RECOVERY_TARGETS`, `getSeoRecoveryTarget(pathname)`
- Produces: `contentRole`, `primaryAction` und `supportingAction` für jede aktive priorisierte Seite

- [ ] **Step 1: Fehlende Seitenziele mit einem fehlschlagenden Test sichtbar machen**

```js
test('priorisierte Seiten besitzen eine eindeutige Inhaltsrolle und Handlung', () => {
  const active = SEO_RECOVERY_TARGETS.filter((entry) => entry.state === 'active');
  for (const entry of active) {
    assert.ok(entry.contentRole, `${entry.path} besitzt keine Inhaltsrolle`);
    assert.ok(entry.primaryAction?.href, `${entry.path} besitzt keine primäre Handlung`);
    assert.notEqual(entry.primaryAction?.href, entry.path);
  }
});
```

- [ ] **Step 2: Den Test ausführen und den erwarteten Fehler bestätigen**

Run: `node --test tests/seoIntentRegistry.test.js`

Expected: FAIL, weil `contentRole` und `primaryAction` noch fehlen.

- [ ] **Step 3: Die bestehenden Einträge um konkrete Rollen erweitern**

Mindestens folgende Zuordnung wird umgesetzt:

```js
{
  path: '/',
  contentRole: 'Marken- und Angebotsüberblick',
  primaryAction: { label: 'Website-Projekt anfragen', href: '/kontakt' },
  supportingAction: { label: 'Pakete ansehen', href: '/pakete' }
}
{
  path: '/webdesign-berlin',
  contentRole: 'Kommerzielle Hauptseite für Website-Erstellung in Berlin',
  primaryAction: { label: 'Beratungsgespräch anfragen', href: '/kontakt?projektart=webdesign' },
  supportingAction: { label: 'Pakete vergleichen', href: '/pakete' }
}
{
  path: '/pakete',
  contentRole: 'Preis- und Paketauswahl',
  primaryAction: { label: 'Passendes Paket anfragen', href: '/kontakt?projektart=webdesign' },
  supportingAction: { label: 'Leistungen einordnen', href: '/leistungen' }
}
```

Für alle weiteren aktiven Registry-Einträge werden entsprechend ihrer bestehenden Suchintention eindeutige Handlungen eingetragen.

- [ ] **Step 4: Die wichtigsten Besucherwege testen**

`tests/corePageJourney.test.js` prüft diese vollständigen Wege:

```text
/ → /webdesign-berlin → /pakete → /kontakt
/ → /leistungen → /leistungen/website-relaunch → /referenzen/tm-sauber-mehr
/website-tester → /leistungen/website-audit → /kontakt
/branchen/webdesign-blumenladen → /blog/seo-fuer-blumenladen → /leistungen/local-seo
```

- [ ] **Step 5: Tests ausführen**

Run: `node --test tests/seoIntentRegistry.test.js tests/corePageJourney.test.js`

Expected: PASS.

- [ ] **Step 6: Commit erstellen**

```bash
git add data/seoIntentRegistry.js tests/seoIntentRegistry.test.js tests/corePageJourney.test.js
git commit -m "test: Seitenziele und Besucherwege absichern"
```

---

### Task 2: Startseite auf Nutzen, Orientierung und echte Belege ausrichten

**Files:**
- Modify: `controllers/mainController.js`
- Modify: `views/index.ejs`
- Modify: `public/home.css`
- Modify: `tests/homepagePrompt3.test.js`
- Create: `tests/homepageReachContent.test.js`

**Interfaces:**
- Consumes: zentrale Paketdaten, `referenceProjects`, Google-Bewertungsdaten und globale CTAs
- Produces: klare Startseitenwege zu `/webdesign-berlin`, `/pakete`, `/branchen`, `/referenzen` und `/kontakt`

- [ ] **Step 1: Fehlende Startseiteninhalte mit einem Test beschreiben**

Der Test verlangt:

```text
H1: Website erstellen lassen in Berlin – persönlich, SEO-freundlich und aus einer Hand
Primär: Beratungsgespräch anfragen
Sekundär: Pakete ansehen
Abschnitte: Problem, Lösung, Pakete, Branchen, Ablauf, Referenzen, FAQ
```

Zusätzlich wird geprüft, dass die Technikbeschreibung nicht vor Paketen, Branchen und Referenzen steht.

- [ ] **Step 2: Test ausführen**

Run: `node --test tests/homepageReachContent.test.js`

Expected: FAIL, weil Hierarchie und Texte noch dem bisherigen Aufbau entsprechen.

- [ ] **Step 3: Hero und erste Bildschirmhöhe überarbeiten**

Die sichtbare Kernaussage lautet:

```text
Website erstellen lassen in Berlin – persönlich, SEO-freundlich und aus einer Hand

Komplett Webdesign plant, gestaltet und betreut Websites für kleine Unternehmen
in Berlin. Mit Texten, SEO-Grundlage, Kontaktformular und auf Wunsch Hosting,
Wartung, Buchungssystem oder Shop.
```

Darunter stehen dynamische Paketpreise, echte Bewertungsdaten und die beiden festgelegten CTAs. Es werden keine festen Bewertungszahlen in das Template geschrieben.

- [ ] **Step 4: Seitenreihenfolge sichtbar neu ordnen**

Die Reihenfolge wird:

```text
Hero
Vertrauensleiste
Problem und Folgen einer unklaren Website
Lösung aus einer Hand
Pakete
Branchenwege
Projektablauf
Referenzen und Bewertungen
Website-Tester
FAQ
Abschluss-CTA
Technische Einzelheiten im unteren Seitenbereich
```

Vorhandene Abschnitte werden verschoben oder verdichtet; es wird keine zweite Startseite angelegt.

- [ ] **Step 5: Branchenwege ergänzen**

Die Startseite verlinkt sichtbar auf:

```text
/handwerker
/branchen/webdesign-immobilienmakler
/branchen/webdesign-blumenladen
/branchen/webdesign-cafe
```

Diese vier bestehenden kanonischen Zielpfade werden unverändert weiterverwendet.

- [ ] **Step 6: Responsive Darstellung und Tests prüfen**

Run:

```bash
node --test tests/homepagePrompt3.test.js tests/homepageReachContent.test.js tests/homePerformance.test.js
npm run build
```

Expected: alle Tests PASS, Build exit 0.

- [ ] **Step 7: Commit erstellen**

```bash
git add controllers/mainController.js views/index.ejs public/home.css public/home.min.css public/css-asset-manifest.json tests/homepagePrompt3.test.js tests/homepageReachContent.test.js
git commit -m "feat: Startseite auf Reichweite und Orientierung ausrichten"
```

---

### Task 3: `/webdesign-berlin` als zentrale kommerzielle Suchseite stärken

**Files:**
- Modify: `data/webdesignBerlinPage.js`
- Modify: `views/bereiche/webdesign-berlin.ejs`
- Modify: `public/webdesign-berlin.css`
- Modify: `tests/webdesignBerlinContent.test.js`
- Modify: `tests/webdesignBerlinPage.test.js`

**Interfaces:**
- Consumes: zentrale Paketdaten, `referenceProjects`, `SEO_RECOVERY_TARGETS`
- Produces: eine eindeutige Zielseite für „Website erstellen lassen Berlin“

- [ ] **Step 1: Inhaltliche Anforderungen als fehlschlagende Tests ergänzen**

Der Test verlangt:

```text
eine Antwort auf „Welche Website passt zu meinem Unternehmen?“
eine klare Paketentscheidung für Start, Business, Wachstum und Individuell
mindestens zwei reale Referenzlinks
einen Berlin-spezifischen Projektablauf
eine Abgrenzung von einmaligen und laufenden Kosten
eine direkte Verbindung zum Website-Audit
```

- [ ] **Step 2: Test ausführen**

Run: `node --test tests/webdesignBerlinContent.test.js tests/webdesignBerlinPage.test.js`

Expected: mindestens eine neue Anforderung FAIL.

- [ ] **Step 3: Generische und doppelte Abschnitte verdichten**

Die Seite erhält diese sichtbare Argumentationsfolge:

```text
1. Website erstellen lassen in Berlin
2. Für welche Unternehmen das Angebot passt
3. Welche Website-Größe passt
4. Leistungen von Struktur bis Livegang
5. Pakete und laufende Kosten
6. Reale Projekte
7. Ablauf und benötigte Mitarbeit
8. Local SEO und Grenzen
9. FAQ
10. Beratungsgespräch
```

Technikdetails zu Node.js und EJS werden zu einem kurzen Vertrauensabschnitt zusammengefasst und stehen nicht vor Bedarf, Paketen oder Referenzen.

- [ ] **Step 4: Konkrete Entscheidungshilfe ergänzen**

Die vier Entscheidungsfälle lauten:

```text
Start: eine kompakte Seite für ein klar begrenztes Angebot
Business: bis zu fünf Seiten für Leistungen, Unternehmen und Kontakt
Wachstum: umfangreicher Relaunch oder mehrere Leistungen und Zielgruppen
Individuell: Sonderfunktionen, Shop, Buchung oder besondere Abläufe
```

Preise und Detailpfade werden aus `data/packages.js` bezogen.

- [ ] **Step 5: Reale Belege kontextuell einbauen**

Verlinkt werden:

```text
/referenzen/zur-alten-backstube
/referenzen/tm-sauber-mehr
```

Es werden ausschließlich Aussagen aus `data/referenceProjects.js` verwendet.

- [ ] **Step 6: Tests und Build ausführen**

Run:

```bash
node --test tests/webdesignBerlinContent.test.js tests/webdesignBerlinPage.test.js tests/seoCorePageIntent.test.js
npm run build
```

Expected: PASS und Build exit 0.

- [ ] **Step 7: Commit erstellen**

```bash
git add data/webdesignBerlinPage.js views/bereiche/webdesign-berlin.ejs public/webdesign-berlin.css public/webdesign-berlin.min.css public/css-asset-manifest.json tests/webdesignBerlinContent.test.js tests/webdesignBerlinPage.test.js
git commit -m "feat: Berliner Webdesign-Hauptseite sichtbar stärken"
```

---

### Task 4: Paketseite als verständliche Entscheidungshilfe umbauen

**Files:**
- Modify: `data/packages.js`
- Modify: `views/packages_list.ejs`
- Modify: `views/package_detail.ejs`
- Modify: `public/package-list.css`
- Modify: `public/package-detail.css`
- Modify: `tests/packageOfferData.test.js`
- Modify: `tests/packageDbPublicPages.test.js`

**Interfaces:**
- Consumes: zentrale Paketpreise, Leistungsgrenzen, Zusatzleistungen und globale Hinweise
- Produces: Paketempfehlung, Vergleich und paketbezogene Kontaktlinks

- [ ] **Step 1: Paketentscheidung mit Tests absichern**

Die Tests verlangen:

```text
Start = kompakter Einstieg
Business = empfohlene Standardwahl
Wachstum = mehr Seiten oder Relaunch
Individuell = Sonderfunktionen
```

Jedes Paket benötigt `bestFor`, `notFor`, `nextStepLabel` und einen eindeutigen Kontaktpfad.

- [ ] **Step 2: Tests ausführen**

Run: `node --test tests/packageOfferData.test.js tests/packageDbPublicPages.test.js`

Expected: FAIL wegen der neuen Entscheidungsfelder.

- [ ] **Step 3: Paketfinder oberhalb des Detailvergleichs ergänzen**

Die vier Auswahlfragen lauten:

```text
Brauche ich nur eine kompakte Seite?
Möchte ich Leistungen, Unternehmen und Kontakt auf mehreren Seiten darstellen?
Plane ich einen Relaunch oder deutlich mehr Inhalte?
Benötige ich Buchung, Shop, Schnittstellen oder andere Sonderfunktionen?
```

Jede Antwort führt zum vorhandenen Paketanker oder zur vorhandenen Detailseite.

- [ ] **Step 4: Enthaltenes, Zusatzleistungen und laufende Kosten trennen**

Direkt nach dem Vergleich werden drei klar getrennte Bereiche gezeigt:

```text
Im Website-Paket enthalten
Optional ergänzbar
Laufende Kosten nach dem Launch
```

Der dritte Bereich verlinkt auf `/leistungen/laufende-kosten-website`, der zweite auf `/leistungen/zusatzleistungen-webdesign`.

- [ ] **Step 5: Paketbezogene CTAs vereinheitlichen**

```text
Start-Paket anfragen
Business-Website planen
Wachstumsprojekt besprechen
Individuelle Lösung anfragen
```

Die Paketkennung wird als vorhandener Query-Parameter an `/kontakt` übergeben.

- [ ] **Step 6: Tests und Build ausführen**

Run:

```bash
node --test tests/packageOfferData.test.js tests/packageDbPublicPages.test.js tests/packageSeoSchemas.test.js
npm run build
```

Expected: PASS und Build exit 0.

- [ ] **Step 7: Commit erstellen**

```bash
git add data/packages.js views/packages_list.ejs views/package_detail.ejs public/package-list.css public/package-list.min.css public/package-detail.css public/package-detail.min.css public/css-asset-manifest.json tests/packageOfferData.test.js tests/packageDbPublicPages.test.js
git commit -m "feat: Pakete als klare Entscheidungshilfe aufbauen"
```

---

### Task 5: Leistungsübersicht nach Problemen und Zielen ordnen

**Files:**
- Modify: `data/leistungenOverviewPage.js`
- Modify: `views/static/leistungen.ejs`
- Modify: `public/leistungen.css`
- Create: `tests/leistungenJourney.test.js`

**Interfaces:**
- Consumes: vorhandene kanonische Leistungsseiten
- Produces: vier verständliche Nutzerwege ohne neue URL

- [ ] **Step 1: Zielgruppenlogik als Test definieren**

Die Übersicht muss diese vier Gruppen enthalten:

```text
Neue Website: Webdesign Berlin, Pakete, Landingpage
Bestehende Website verbessern: Audit, Relaunch, Inhalte, responsives Design
Sichtbarkeit erhöhen: Local SEO, Website-Tester
Website betreiben: Wartung, Zusatzleistungen, laufende Kosten
```

- [ ] **Step 2: Test ausführen**

Run: `node --test tests/leistungenJourney.test.js`

Expected: FAIL, weil die aktuelle Seite Leistungen noch nicht in diesen Wegen gruppiert.

- [ ] **Step 3: Datenmodell und Template gruppieren**

`data/leistungenOverviewPage.js` erhält `serviceGroups`. Jede Gruppe besitzt:

```js
{
  title: 'Bestehende Website verbessern',
  description: 'Prüfen, neu strukturieren oder gezielt ausbauen.',
  items: [
    { title: 'Website-Audit', href: '/leistungen/website-audit' },
    { title: 'Website-Relaunch', href: '/leistungen/website-relaunch' }
  ]
}
```

Alle Links zeigen auf bereits vorhandene kanonische Seiten.

- [ ] **Step 4: Auswahlhilfe ergänzen**

Oberhalb der Gruppen erscheint:

```text
Du weißt noch nicht, was du brauchst?
Starte mit dem kostenlosen Website-Tester oder beschreibe kurz deine Ausgangslage.
```

Die Links führen zu `/website-tester` und `/kontakt?projektart=website-audit`.

- [ ] **Step 5: Tests und Build ausführen**

Run:

```bash
node --test tests/leistungenJourney.test.js tests/leistungenSlugArchitecture.test.js
npm run build
```

Expected: PASS und Build exit 0.

- [ ] **Step 6: Commit erstellen**

```bash
git add data/leistungenOverviewPage.js views/static/leistungen.ejs public/leistungen.css public/leistungen.min.css public/css-asset-manifest.json tests/leistungenJourney.test.js
git commit -m "feat: Leistungen nach Nutzerzielen gruppieren"
```

---

### Task 6: Kommerzielle Leistungsseiten inhaltlich vervollständigen

**Files:**
- Modify: `data/seoLandingPages.js`
- Modify: `data/localSeoPage.js`
- Modify: `data/maintenancePage.js`
- Modify: `views/seo_landing/show.ejs`
- Modify: `views/static/local-seo-berlin.ejs`
- Modify: `views/static/website-wartung-berlin.ejs`
- Modify: `public/leistungen.css`
- Modify: `tests/seoLandingPages.test.js`
- Modify: `tests/localSeoPage.test.js`
- Modify: `tests/maintenancePage.test.js`

**Interfaces:**
- Consumes: vorhandene Service-Seiten und Referenzdaten
- Produces: vollständige Seitenargumente für Relaunch, Audit, Landingpage, Local SEO und Wartung

- [ ] **Step 1: Gemeinsamen Mindestumfang testen**

Jede der fünf Seiten benötigt:

```text
klare Ausgangslage
konkreten Leistungsumfang
nicht enthaltene Leistungen
Ablauf
mindestens einen realen Beleg oder eine sachliche Beispielausgabe
Kosten- oder Angebotsübergang
zwei passende kontextuelle Links
FAQ
primäre Anfragehandlung
```

- [ ] **Step 2: Tests ausführen**

Run: `node --test tests/seoLandingPages.test.js tests/localSeoPage.test.js tests/maintenancePage.test.js`

Expected: FAIL bei mindestens einer neuen Mindestanforderung.

- [ ] **Step 3: Website-Relaunch konkretisieren**

Die Seite erklärt sichtbar:

```text
Bestandsaufnahme
URL- und Weiterleitungsplan
Inhaltsübernahme
Design und technische Umsetzung
Prüfung vor dem Livegang
```

Als realer Beleg wird `/referenzen/tm-sauber-mehr` verlinkt.

- [ ] **Step 4: Website-Audit konkretisieren**

Die Seite zeigt:

```text
was geprüft wird
welche Ausgabe der Kunde erhält
wie priorisiert wird
was der kostenlose Tester nicht ersetzt
wie es nach dem Audit weitergeht
```

Der kostenlose Einstieg führt zu `/website-tester`; die individuelle Leistung führt zu `/kontakt?projektart=website-audit`.

- [ ] **Step 5: Local SEO konkretisieren**

Die Seite trennt:

```text
Website-Signale
Google-Unternehmensprofil
lokale Inhalte
Bewertungen und Erwähnungen
laufende Arbeit
```

Sie verlinkt kontextuell auf `/webdesign-berlin`, `/branchen/webdesign-blumenladen` und `/blog/seo-fuer-blumenladen`.

- [ ] **Step 6: Website-Wartung und Landingpage konkretisieren**

Website-Wartung zeigt Reaktionsweg, Prüfturnus, Backups, Aktualisierungen, Ausschlüsse und laufende Kosten.  
Landingpage erklärt Einsatzfall, benötigte Inhalte, einzelnes Conversion-Ziel und den Unterschied zu einer vollständigen Unternehmenswebsite.

- [ ] **Step 7: Tests und Build ausführen**

Run:

```bash
node --test tests/seoLandingPages.test.js tests/localSeoPage.test.js tests/maintenancePage.test.js
npm run build
```

Expected: PASS und Build exit 0.

- [ ] **Step 8: Commit erstellen**

```bash
git add data/seoLandingPages.js data/localSeoPage.js data/maintenancePage.js views/seo_landing/show.ejs views/static/local-seo-berlin.ejs views/static/website-wartung-berlin.ejs public/leistungen.css public/leistungen.min.css public/css-asset-manifest.json tests/seoLandingPages.test.js tests/localSeoPage.test.js tests/maintenancePage.test.js
git commit -m "feat: zentrale Leistungsseiten inhaltlich vervollständigen"
```

---

### Task 7: Branchen-Seiten und vorhandene Ratgeberchancen verbinden

**Files:**
- Modify: `controllers/industriesController.js`
- Modify: `views/industries/index.ejs`
- Modify: `views/industries/show.ejs`
- Modify: `public/branchen.css`
- Modify: `tests/industryTemplate.test.js`
- Modify: `tests/industrySchema.test.js`
- Create: `docs/seo/content-briefs/2026-07-26-bestandsartikel-reichweite.md`

**Interfaces:**
- Consumes: bestehende Branchendaten, bestehende Blogartikel und `SEO_RECOVERY_TARGETS`
- Produces: klare kommerzielle Branchen-Seiten mit jeweils passendem Informationsartikel

- [ ] **Step 1: Branchenrollen testen**

Der Test verlangt:

```text
/branchen/webdesign-blumenladen = kommerzielle Website-Leistung
/blog/seo-fuer-blumenladen = informationelle SEO-Hilfe
/branchen/webdesign-immobilienmakler = kommerzielle Website-Leistung
/blog/immobilienmakler-website-erstelle = informationelle Planungshilfe
```

Jede Informationsseite verlinkt auf die kommerzielle Seite, und jede kommerzielle Seite verlinkt auf die passende Hilfe.

- [ ] **Step 2: Test ausführen**

Run: `node --test tests/industryTemplate.test.js tests/industrySchema.test.js`

Expected: FAIL, solange die wechselseitigen kontextuellen Links nicht vollständig sind.

- [ ] **Step 3: Branchenübersicht nach Bedarf gruppieren**

Die vorhandenen Branchen werden in sichtbare Gruppen einsortiert:

```text
Termine und Buchungen
Lokale Dienstleistungen
Gastronomie und Verkauf
Beratung und Immobilien
```

Es werden nur vorhandene Branchen-URLs angezeigt.

- [ ] **Step 4: Blumenladen-Seite verbessern**

Verbindliche Abschnitte:

```text
Produkte, Öffnungszeiten und lokale Auffindbarkeit
Saisonale Angebote ohne Seitenchaos
Anfrage, Vorbestellung oder Abholung
Geeignete Paketgröße
Local-SEO-Grundlagen für Blumenläden
```

- [ ] **Step 5: Immobilienmakler-Seite verbessern**

Verbindliche Abschnitte:

```text
Vertrauen und lokales Einsatzgebiet
Leistungen für Verkäufer, Käufer und Vermieter
Objektdarstellung und Kontaktwege
Technische und rechtliche Abgrenzung
Geeignete Paketgröße
```

- [ ] **Step 6: Drei vorhandene Artikel verbindlich aktualisieren**

Im Content-Brief werden diese Änderungen vollständig ausgeschrieben:

```text
/blog/website-kosten-2025-einfach-erklaert
Sichtbarer Titel: Was kostet eine Website 2026? Preise und laufende Kosten
URL bleibt unverändert.
Ergänzungen: einmalige Kosten, laufende Kosten, Paketbeispiele, Zusatzleistungen,
Entscheidungshilfe und Links zu /pakete sowie /leistungen/laufende-kosten-website.

/blog/seo-fuer-blumenladen
Rolle: praktischer Local-SEO-Ratgeber.
Ergänzungen: Google-Unternehmensprofil, Sortiment, Saison, lokale Suchbegriffe,
Bewertungen, Bilder und Links zu /branchen/webdesign-blumenladen sowie
/leistungen/local-seo.

/blog/immobilienmakler-website-erstelle
Rolle: informationelle Planungshilfe.
Ergänzungen: benötigte Seiten, Inhalte, Vertrauenssignale, Objektintegration,
Kontaktwege und Link zu /branchen/webdesign-immobilienmakler.
```

Die Überarbeitung erfolgt über den bestehenden Content-Agent-Revisionsprozess; die URL wird nicht geändert.

- [ ] **Step 7: Tests und Build ausführen**

Run:

```bash
node --test tests/industryTemplate.test.js tests/industrySchema.test.js tests/seoIntentRegistry.test.js
npm run build
```

Expected: PASS und Build exit 0.

- [ ] **Step 8: Commit erstellen**

```bash
git add controllers/industriesController.js views/industries/index.ejs views/industries/show.ejs public/branchen.css public/branchen.min.css public/css-asset-manifest.json tests/industryTemplate.test.js tests/industrySchema.test.js docs/seo/content-briefs/2026-07-26-bestandsartikel-reichweite.md
git commit -m "feat: Branchen und bestehende Ratgeber gezielt verbinden"
```

---

### Task 8: Referenzen früher und konkreter als Vertrauensbeleg einsetzen

**Files:**
- Modify: `data/referenceProjects.js`
- Modify: `views/references/index.ejs`
- Modify: `views/references/show.ejs`
- Modify: `public/references.css`
- Modify: `tests/referenceProjects.test.js`

**Interfaces:**
- Consumes: ausschließlich belegte Projektdaten und freigegebene Kundenstimmen
- Produces: wiederverwendbare Referenzkarten für Start-, Webdesign- und Leistungsseiten

- [ ] **Step 1: Referenzdaten vervollständigen**

Jedes Projekt benötigt:

```js
{
  services: [],
  suitableFor: '',
  relatedServiceHref: '',
  primaryOutcome: ''
}
```

`primaryOutcome` bleibt qualitativ, sofern keine belegte Kennzahl vorliegt.

- [ ] **Step 2: Test ausführen**

Run: `node --test tests/referenceProjects.test.js`

Expected: FAIL, bis beide Projekte die neuen Felder besitzen.

- [ ] **Step 3: Referenzübersicht verkürzen und Belege vorziehen**

Auf jeder Karte erscheinen sofort:

```text
Ausgangslage
umgesetzte Kernleistungen
qualitatives Ergebnis
Kundenstimme
passende Leistung
```

- [ ] **Step 4: Detailseiten auf Anfragekontext ausrichten**

`Zur alten Backstube` verlinkt auf passende Gastronomie-/Webdesign-Angebote.  
`TM Sauber & Mehr` verlinkt auf `/leistungen/website-relaunch`.

Der Abschluss-CTA lautet je nach Projekt:

```text
Ähnliches Website-Projekt besprechen
Relaunch für mein Unternehmen prüfen
```

- [ ] **Step 5: Tests und Build ausführen**

Run:

```bash
node --test tests/referenceProjects.test.js
npm run build
```

Expected: PASS und Build exit 0.

- [ ] **Step 6: Commit erstellen**

```bash
git add data/referenceProjects.js views/references/index.ejs views/references/show.ejs public/references.css public/references.min.css public/css-asset-manifest.json tests/referenceProjects.test.js
git commit -m "feat: Referenzen als konkrete Vertrauensbelege ausbauen"
```

---

### Task 9: Website-Tester als hilfreichen Einstieg und nicht als Sackgasse gestalten

**Files:**
- Modify: `views/test.ejs`
- Modify: `views/seo_tester.ejs`
- Modify: `public/website-tester.css`
- Modify: `tests/testerSeoContent.test.js`
- Create: `tests/testerJourney.test.js`

**Interfaces:**
- Consumes: bestehende Tester-Funktionen und Audit-Leistungsseite
- Produces: klaren Weg von kostenlosem Test zu fachlicher Einordnung

- [ ] **Step 1: Testerweg als Test festschreiben**

Die Seiten müssen beantworten:

```text
Was wird kostenlos geprüft?
Was wird nicht geprüft?
Wie sieht ein Ergebnis aus?
Was kann der Nutzer selbst tun?
Wann ist ein individuelles Audit sinnvoll?
```

- [ ] **Step 2: Tests ausführen**

Run: `node --test tests/testerSeoContent.test.js tests/testerJourney.test.js`

Expected: FAIL, bis alle fünf Antworten und Übergänge vorhanden sind.

- [ ] **Step 3: Beispielergebnis konkretisieren**

Das sichtbare Beispiel enthält:

```text
Status
gefundenes Problem
warum es relevant ist
erste Handlung
Grenze der automatischen Prüfung
```

Es werden keine erfundenen Live-Daten oder Erfolgsprognosen angezeigt.

- [ ] **Step 4: Handlungswege nach dem Ergebnis trennen**

```text
Selbst umsetzen → passende vorhandene Hilfe
Website umfassend prüfen → /leistungen/website-audit
Website neu aufbauen → /webdesign-berlin
Projekt besprechen → /kontakt
```

- [ ] **Step 5: Tests und Build ausführen**

Run:

```bash
node --test tests/testerSeoContent.test.js tests/testerJourney.test.js tests/testerSpamProtection.test.js
npm run build
```

Expected: PASS und Build exit 0.

- [ ] **Step 6: Commit erstellen**

```bash
git add views/test.ejs views/seo_tester.ejs public/website-tester.css public/website-tester.min.css public/css-asset-manifest.json tests/testerSeoContent.test.js tests/testerJourney.test.js
git commit -m "feat: Website-Tester mit klaren nächsten Schritten ergänzen"
```

---

### Task 10: Navigation und kontextuelle interne Links vereinfachen

**Files:**
- Modify: `data/siteNavigation.js`
- Modify: `views/partials/header.ejs`
- Modify: `views/partials/footer.ejs`
- Create: `views/partials/related-links.ejs`
- Modify: `tests/navigationPhase11.test.js`
- Create: `tests/contextualInternalLinks.test.js`

**Interfaces:**
- Consumes: `SEO_RECOVERY_TARGETS.requiredLinks`
- Produces: verständliche Navigation und wiederverwendbare kontextuelle Linkblöcke

- [ ] **Step 1: Navigationsregeln testen**

Der Header behält höchstens diese sechs normalen Haupteinstiege:

```text
Start
Webdesign Berlin
Pakete & Preise
Leistungen
Referenzen
Branchen
```

Rechts steht weiterhin der Kontakt-CTA. Blog, Ratgeber und Website-Tester bleiben im Footer beziehungsweise in kontextuellen Bereichen erreichbar.

- [ ] **Step 2: Test ausführen**

Run: `node --test tests/navigationPhase11.test.js tests/contextualInternalLinks.test.js`

Expected: der neue Kontextlink-Test FAIL.

- [ ] **Step 3: Leistungsmenü verständlich gruppieren**

Das bestehende Untermenü erhält sichtbare Gruppen:

```text
Website erstellen
Website verbessern
Sichtbarkeit
Betrieb und Kosten
```

Die URLs bleiben unverändert.

- [ ] **Step 4: Wiederverwendbaren Kontextlinkblock erstellen**

Interface:

```ejs
<%- include('partials/related-links', {
  title: 'Passende nächste Schritte',
  links: [
    { href: '/pakete', label: 'Website-Pakete vergleichen', description: 'Umfang und Preise einordnen.' }
  ]
}) %>
```

Der Block wird nur ausgegeben, wenn mindestens ein gültiger Link vorhanden ist. Er ersetzt keine Links im Fließtext.

- [ ] **Step 5: Registry-Pflichtlinks auf allen priorisierten Seiten prüfen**

Run:

```bash
npm run audit:seo-recovery -- --base-url http://127.0.0.1:3000 --fail-on error
```

Expected: keine fehlenden kontextuellen Pflichtlinks.

- [ ] **Step 6: Tests und Build ausführen**

Run:

```bash
node --test tests/navigationPhase11.test.js tests/contextualInternalLinks.test.js tests/seoRecoveryAuditService.test.js
npm run build
```

Expected: PASS und Build exit 0.

- [ ] **Step 7: Commit erstellen**

```bash
git add data/siteNavigation.js views/partials/header.ejs views/partials/footer.ejs views/partials/related-links.ejs tests/navigationPhase11.test.js tests/contextualInternalLinks.test.js
git commit -m "feat: Navigation und interne Verlinkung vereinfachen"
```

---

### Task 11: Kontaktweg nach dem Reichweitenaufbau vereinfachen

**Files:**
- Modify: `data/contactFlows.js`
- Modify: `controllers/contactController.js`
- Modify: `views/kontakt.ejs`
- Modify: `public/kontakt.css`
- Modify: `tests/contactFlows.test.js`
- Modify: `tests/contactQuickForm.test.js`

**Interfaces:**
- Consumes: Query-Parameter `projektart`, `paket` und Ausgangsseite
- Produces: passende Vorauswahl und kürzeren Ersteinstieg ohne Verlust der ausführlichen Anfrage

- [ ] **Step 1: Vorauswahl und kurze Anfrage testen**

Zulässige Vorauswahlen:

```text
webdesign
website-relaunch
website-audit
local-seo
website-wartung
landingpage
```

Unbekannte Werte werden ignoriert. Persönliche Daten werden nicht aus der URL übernommen.

- [ ] **Step 2: Tests ausführen**

Run: `node --test tests/contactFlows.test.js tests/contactQuickForm.test.js`

Expected: FAIL, falls neue Projektarten noch nicht eindeutig zugeordnet werden.

- [ ] **Step 3: Kurzen Einstieg auf vier Pflichtangaben begrenzen**

```text
Projektart
Name
E-Mail
Website-URL nur bei Audit, Relaunch oder Wartung
```

Nachricht, Budget, Termin und Dateien bleiben optional beziehungsweise im ausführlichen Anfrageweg.

- [ ] **Step 4: Erwartung nach dem Absenden erklären**

Direkt am Formular steht:

```text
Ich prüfe deine Angaben und melde mich mit einer ersten Einordnung zum passenden
Paket oder nächsten Schritt. Die Anfrage ist unverbindlich.
```

Es wird keine feste Reaktionszeit versprochen, sofern sie nicht betrieblich garantiert werden kann.

- [ ] **Step 5: Tests und Build ausführen**

Run:

```bash
node --test tests/contactFlows.test.js tests/contactQuickForm.test.js tests/publicFormGuidance.test.js
npm run build
```

Expected: PASS und Build exit 0.

- [ ] **Step 6: Commit erstellen**

```bash
git add data/contactFlows.js controllers/contactController.js views/kontakt.ejs public/kontakt.css public/kontakt.min.css public/css-asset-manifest.json tests/contactFlows.test.js tests/contactQuickForm.test.js
git commit -m "feat: Kontaktweg passend zu den Seiten vereinfachen"
```

---

### Task 12: Lokale Abnahme, Veröffentlichung und 28-Tage-Auswertung

**Files:**
- Create: `docs/seo/2026-07-26-seitenoptimierung-abnahme.md`
- Create: `docs/seo/2026-07-26-seitenoptimierung-28-tage.md`
- Modify: `docs/seo/2026-07-26-reichweitenarbeit.md`

**Interfaces:**
- Consumes: lokalen Release-Kandidaten, Search-Console-Daten und tatsächliche Anfragen
- Produces: nachvollziehbare Freigabe, Indexierungsprüfung und Reichweitenauswertung ohne GA4

- [ ] **Step 1: Vollständige lokale Prüfung ausführen**

Run:

```bash
npm test
npm run build
npm run audit:seo-recovery -- --base-url http://127.0.0.1:3000 --fail-on error
```

Expected:

```text
0 fehlgeschlagene Tests
Build exit 0
keine kritischen SEO-Audit-Fehler
```

- [ ] **Step 2: Visuelle Abnahme dokumentieren**

Desktop und Mobil werden mindestens für diese URLs geprüft:

```text
/
/webdesign-berlin
/pakete
/leistungen
/leistungen/website-relaunch
/leistungen/website-audit
/leistungen/local-seo
/leistungen/website-wartung
/branchen
/branchen/webdesign-blumenladen
/branchen/webdesign-immobilienmakler
/referenzen
/website-tester
/kontakt
```

Die Abnahmedatei enthält je URL: geprüftes Datum, Desktop/Mobil, sichtbare Änderung, gefundener Fehler und Freigabestatus.

- [ ] **Step 3: Nutzerfreigabe vor Deployment einholen**

Der Nutzer erhält:

```text
Vorher-/Nachher-Zusammenfassung pro Seite
lokale Vorschau-URL
Liste geänderter Überschriften und CTAs
Liste der unveränderten URLs
Test- und Audit-Ergebnis
```

Ohne ausdrückliche Freigabe erfolgt kein weiteres Server-Deployment.

- [ ] **Step 4: Nach Freigabe deployen und Live-Status prüfen**

Live werden geprüft:

```text
HTTP 200 für alle aktiven Kernseiten
direkte 301 für die beiden konsolidierten URLs
Canonical auf die jeweilige Live-URL
kein noindex auf aktiven Kernseiten
Sitemap enthält nur kanonische indexierbare URLs
genau eine H1 je Kernseite
```

- [ ] **Step 5: Indexierung gezielt anstoßen**

In der Google Search Console werden nur die wichtigsten geänderten URLs über die URL-Prüfung eingereicht:

```text
/
/webdesign-berlin
/pakete
/leistungen
/leistungen/website-relaunch
/leistungen/website-audit
/leistungen/local-seo
/branchen/webdesign-blumenladen
/branchen/webdesign-immobilienmakler
```

Die Sitemap wird einmal geprüft und bei Bedarf erneut eingereicht. Es werden nicht wahllos alle URLs manuell angefordert.

- [ ] **Step 6: Vorhandene Seiten außerhalb der Website verteilen**

Nach dem Live-Check werden ausschließlich vorhandene Zielseiten genutzt:

```text
Google-Unternehmensprofil: Webdesign Berlin, Leistungen und Referenzen aktuell verlinken
Referenzkunden: freiwillige Projekt- oder Partnerverlinkung anfragen
Eigene Kanäle: Referenz, Paketinformation, Tester/Audit und Branchenlösung einzeln vorstellen
Lokale Verzeichnisse: nur echte bestehende Unternehmensprofile mit konsistenten Kontaktdaten pflegen
```

Es werden keine Links gekauft und keine massenhaft identischen Beiträge veröffentlicht.

- [ ] **Step 7: 28-Tage-Messplan ohne GA4 ausführen**

Die Messzeitpunkte sind Tag 0, 7, 14 und 28.

| Kennzahl | Quelle | Vergleich |
| --- | --- | --- |
| Google-Impressionen | Search Console, Seite und Suchanfrage | 28 Tage nach Deployment gegen 28 Tage davor |
| Google-Klicks | Search Console, Seite und Suchanfrage | absolut und pro Kernseite |
| CTR | Search Console | nur bei ausreichenden Impressionen bewerten |
| durchschnittliche Position | Search Console | impressionengewichtet pro Suchintention |
| indexierte Kernseiten | Search Console URL-Prüfung/Sitemap | erwartet gegen tatsächlich indexiert |
| echte Anfragen | serverseitige Kontakt-, Termin- und Audit-Daten | Anzahl und Ausgangsseite, ohne GA4 |

Die Auswertung beantwortet:

```text
Welche Seiten gewinnen Impressionen?
Welche Seiten gewinnen Klicks?
Bei welchen Suchanfragen steigt die Position?
Welche Seiten haben Impressionen, aber weiterhin keine Klicks?
Welche internen Wege führen zu echten Anfragen?
Welche Seite benötigt als Nächstes eine inhaltliche Nachbesserung?
```

- [ ] **Step 8: Entscheidung nach 28 Tagen dokumentieren**

Es wird pro Seite genau eine Entscheidung getroffen:

```text
beibehalten
Titel und Beschreibung nachschärfen
Inhalt vertiefen
interne Links verstärken
Suchintention neu abgrenzen
erst bei belegter Inhaltslücke eine neue Seite prüfen
```

Eine neue öffentliche Seite ist nur zulässig, wenn Search-Console-Daten eine eigenständige Suchintention zeigen, die keine bestehende Seite sinnvoll abdeckt.

- [ ] **Step 9: Abschluss-Commit erstellen**

```bash
git add docs/seo/2026-07-26-seitenoptimierung-abnahme.md docs/seo/2026-07-26-seitenoptimierung-28-tage.md docs/seo/2026-07-26-reichweitenarbeit.md
git commit -m "docs: Seitenoptimierung und Reichweitenprüfung dokumentieren"
```

---

## Definition of Done

Die Seitenoptimierung ist erst abgeschlossen, wenn:

- die sichtbaren Änderungen auf allen aufgeführten Kernseiten umgesetzt sind,
- keine unnötige neue öffentliche URL entstanden ist,
- jede priorisierte Seite eine eindeutige Suchintention und nächste Handlung besitzt,
- die wichtigsten bestehenden Inhalte kontextuell miteinander verlinkt sind,
- alle Tests, der Produktions-Build und der SEO-Audit erfolgreich laufen,
- der Nutzer die lokale Desktop- und Mobilansicht freigegeben hat,
- die Live-Seiten technisch geprüft wurden,
- die 28-Tage-Auswertung mit Search Console und tatsächlichen Anfragen dokumentiert wurde.
