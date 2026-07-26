# Kurdisches Filmfestival Referenz Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine dritte, belegbare Referenz für das Kurdische Filmfestival Berlin mit echten Projektansichten und ohne erfundene Kundenstimme veröffentlichungsfertig in das bestehende Referenzsystem integrieren.

**Architecture:** Das bestehende datengetriebene Referenzsystem bleibt erhalten. Ein neues Projektobjekt liefert Inhalte und lokale Screenshots an die bestehenden EJS-Templates; kleine optionale Felder verallgemeinern den Funktionsbereich und die Darstellung fehlender Kundenstimmen, ohne Sonderseiten einzuführen.

**Tech Stack:** Node.js, Express, EJS, CSS, Node Test Runner, Browser-Screenshots

## Global Constraints

- Bestehendes Referenzdesign wiederverwenden; keine eigenständige Sondergestaltung erstellen.
- Deutsche Texte verwenden korrekte Grammatik sowie ä, ö, ü und ß.
- Keine unbelegten Kennzahlen oder Ergebnisversprechen verwenden.
- Keine Kundenstimme erfinden; `quote` und `quoteAuthor` bleiben leer.
- Ausschließlich aktuelle, freigegebene Ansichten von `https://www.kurdisches-filmfestival.de` verwenden.
- Alle Projektbilder lokal ablegen und mit konkreten Alternativtexten versehen.
- Nichts pushen, mergen oder auf einen Server übertragen.

---

### Task 1: Referenzvertrag testgetrieben erweitern

**Files:**
- Modify: `tests/referenceProjects.test.js`
- Test: `tests/referenceProjects.test.js`

**Interfaces:**
- Consumes: `referenceProjects` und `getReferenceProjectBySlug(slug)`
- Produces: getesteter Vertrag für drei Projekte, optionale Kundenstimmen und die neue Filmfestival-Referenz

- [ ] **Step 1: Failing Test für das dritte Projekt schreiben**

Den bisherigen Test für exakt zwei Projekte so ändern, dass er diese Slugs in dieser Reihenfolge erwartet:

```js
assert.deepEqual(referenceProjects.map((project) => project.slug), [
  'zur-alten-backstube',
  'tm-sauber-mehr',
  'kurdisches-filmfestival'
]);
```

Zusätzlich einen Test ergänzen, der beim neuen Projekt `liveUrl`, `/pakete/individuell`, leere Zitatfelder, mindestens sechs `additionalScreens` sowie lokale Bildpfade und nicht leere Alternativtexte prüft.

- [ ] **Step 2: Test ausführen und korrektes Rot bestätigen**

Run:

```bash
node --test tests/referenceProjects.test.js
```

Expected: FAIL, weil `kurdisches-filmfestival` noch nicht in `referenceProjects` vorhanden ist.

- [ ] **Step 3: Testvertrag für optionale Kundenstimmen korrigieren**

`EXPECTED_TESTIMONIALS` nur für die beiden vorhandenen freigegebenen Stimmen verwenden. Der Test soll für Projekte mit Zitat weiterhin den exakten Text prüfen und für Projekte ohne Zitat bestätigen, dass auch `quoteAuthor` leer ist.

- [ ] **Step 4: Bilddateien als reale Artefakte prüfen**

Im Filmfestival-Test jeden Pfad aus Hero und `additionalScreens` mit `fs.existsSync(new URL(\`../public${path}\`, import.meta.url))` prüfen. Dadurch fällt der Test aus, solange die Screenshots fehlen.

### Task 2: Freigegebene Projektscreenshots erfassen

**Files:**
- Create: `public/images/references/kurdisches-filmfestival/startseite.webp`
- Create: `public/images/references/kurdisches-filmfestival/mediathek.webp`
- Create: `public/images/references/kurdisches-filmfestival/galerie.webp`
- Create: `public/images/references/kurdisches-filmfestival/news.webp`
- Create: `public/images/references/kurdisches-filmfestival/tickets.webp`
- Create: `public/images/references/kurdisches-filmfestival/newsletter.webp`
- Create: `public/images/references/kurdisches-filmfestival/spenden.webp`

**Interfaces:**
- Consumes: öffentlich erreichbare Seiten unter `https://www.kurdisches-filmfestival.de`
- Produces: optimierte lokale WebP-Screenshots für Hero und Funktionskarten

- [ ] **Step 1: Seiten im Browser öffnen und Cookie-Auswahl schließen**

Startseite, `/video-de`, `/gallery-de`, `/news-de`, `/tickets-de` und `/spende-de` öffnen. Nur notwendige Cookies auswählen, damit kein Dialog die Screenshots verdeckt.

- [ ] **Step 2: Aussagekräftige Ansichten aufnehmen**

Je einen Desktop-Screenshot des relevanten sichtbaren Bereichs erfassen. Für den Newsletter den Newsletterbereich auf der Start- oder Newsseite gezielt aufnehmen. Login-, Zahlungs- oder personenbezogene Daten dürfen nicht sichtbar sein.

- [ ] **Step 3: Bilder verlustarm in WebP umwandeln**

Die aufgenommenen PNG-Dateien mit dem im Projekt verfügbaren Bildwerkzeug auf eine sinnvolle Breite von höchstens 1600 Pixeln skalieren und als die sieben festgelegten WebP-Dateien speichern.

- [ ] **Step 4: Artefakttest erneut ausführen**

Run:

```bash
node --test tests/referenceProjects.test.js
```

Expected: weiterhin FAIL wegen des noch fehlenden Projektobjekts, aber nicht mehr wegen fehlender Bilddateien.

### Task 3: Filmfestival-Projektdaten und optionale Kundenstimme implementieren

**Files:**
- Modify: `data/referenceProjects.js`
- Modify: `views/references/index.ejs`
- Modify: `views/references/show.ejs`
- Test: `tests/referenceProjects.test.js`

**Interfaces:**
- Consumes: lokale Screenshots unter `/images/references/kurdisches-filmfestival/`
- Produces: `getReferenceProjectBySlug('kurdisches-filmfestival')` und vollständig renderbare Referenzdaten

- [ ] **Step 1: Filmfestival-Projektobjekt ergänzen**

Ein drittes Projekt mit diesen Kerndaten ergänzen:

```js
{
  slug: 'kurdisches-filmfestival',
  name: 'Kurdisches Filmfestival Berlin',
  industry: 'Kultur, Festival und Streaming',
  liveUrl: 'https://www.kurdisches-filmfestival.de',
  relatedServiceHref: '/pakete/individuell',
  relatedServiceLabel: 'Individuelles Webdesign-Projekt ansehen',
  quote: '',
  quoteAuthor: ''
}
```

Problem, Ziel, Umsetzung und Ergebnis beschreiben die mehrsprachige Struktur, Mediathek, Galerie, News, Ticketwege, Newsletter, Spenden und Consent-/Zahlungslogik ausschließlich qualitativ. `additionalScreens` enthält sechs Einträge mit `title`, `text`, `image` und `alt`.

- [ ] **Step 2: Referenzübersicht ohne leeres Zitat rendern**

In `views/references/index.ejs` den Kundenstimmen-Eintrag bedingt ausgeben:

```ejs
<% if (project.quote) { %>
  <q><%= project.quote %></q>
  <% if (project.quoteAuthor) { %><small>– <%= project.quoteAuthor %></small><% } %>
<% } else { %>
  <span>Für dieses Projekt liegt keine öffentliche Kundenstimme vor.</span>
<% } %>
```

Die Hero-Einleitung von „Zwei aktuelle Projekte“ auf „Ausgewählte aktuelle Projekte“ ändern.

- [ ] **Step 3: Funktionsbereich verallgemeinern und Alt-Texte verwenden**

In `views/references/show.ejs` optionale Überschriften mit Rückfallwerten verwenden:

```ejs
<p class="references-eyebrow"><%= project.additionalScreensEyebrow || 'Ergänzung' %></p>
<h2 id="reference-added-screens-title"><%= project.additionalScreensTitle || 'Zusätzliche Seiten im Relaunch' %></h2>
```

Für Bilder `screen.alt || \`${screen.title} für ${project.name}\`` verwenden.

- [ ] **Step 4: Referenztest grün ausführen**

Run:

```bash
node --test tests/referenceProjects.test.js
```

Expected: PASS.

- [ ] **Step 5: Änderungen prüfen und committen**

Run:

```bash
git diff --check
git status --short
```

Commit:

```bash
git add data/referenceProjects.js views/references/index.ejs views/references/show.ejs tests/referenceProjects.test.js public/images/references/kurdisches-filmfestival
git commit -m "feat: Filmfestival als Referenz ergänzen"
```

### Task 4: Vollständige technische und visuelle Abnahme

**Files:**
- Verify: `data/referenceProjects.js`
- Verify: `views/references/index.ejs`
- Verify: `views/references/show.ejs`
- Verify: `public/images/references/kurdisches-filmfestival/*.webp`

**Interfaces:**
- Consumes: vollständige Filmfestival-Referenz
- Produces: geprüfte lokale Referenz ohne Deployment

- [ ] **Step 1: Gesamte Testsuite ausführen**

Run:

```bash
npm test
```

Expected: exit code 0 ohne fehlgeschlagene Tests.

- [ ] **Step 2: CSS-Build ausführen**

Run:

```bash
npm run build
```

Expected: exit code 0.

- [ ] **Step 3: Lokalen Server starten**

Run:

```bash
CONTENT_ATTRIBUTION_SESSION_SECRET=lokales-referenzprojekt-geheimnis-mit-mehr-als-32-zeichen npm start
```

Expected: Server ist unter `http://localhost:3000` erreichbar.

- [ ] **Step 4: Desktopansichten prüfen**

Im Browser `/referenzen` und `/referenzen/kurdisches-filmfestival` bei etwa 1440 Pixeln Breite prüfen. Erwartet werden drei Karten, kein leeres Zitat, korrekte Bilder, sechs Funktionskarten, Live-Link und Link zum individuellen Paket.

- [ ] **Step 5: Mobilansichten prüfen**

Dieselben Seiten bei etwa 390 Pixeln Breite prüfen. Es dürfen keine horizontalen Überläufe, abgeschnittenen Texte oder verzerrten Bilder auftreten.

- [ ] **Step 6: Abschlussprüfung**

Run:

```bash
git diff --check
git status --short
git log -3 --oneline
```

Expected: keine unbeabsichtigten Dateien; Dokumentation und Implementierung sind lokal committet, aber weder gepusht noch deployed.
