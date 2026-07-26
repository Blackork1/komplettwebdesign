# Neugestaltung „Webdesign Berlin“ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die bestehende Seite `/webdesign-berlin` erhält genau einen Paketbereich, einen bildlich verständlichen Beratungsablauf und einen persönlichen Zielgruppenbereich mit eindeutiger Kontaktführung.

**Architecture:** Die Seitendaten bleiben zentral in `data/webdesignBerlinPage.js`, Bildmetadaten in `data/marketingImages.js` und die Ausgabe im bestehenden EJS-Template. Die seitenbezogene CSS-Datei erhält drei klar abgegrenzte Komponenten: redaktionelles Planungsintro, nummerierter Beratungsablauf und Zielgruppenkomposition. Bestehende Route, Controller, Kontaktformular und Paketdaten bleiben unverändert.

**Tech Stack:** Node.js 22, EJS, CSS, Node-Test-Runner, CSSNano/PostCSS, WebP

## Global Constraints

- Es wird keine neue Seite und keine neue Route erstellt.
- Auf `/webdesign-berlin` darf nur ein vollständiger Paketbereich vorhanden sein.
- Paketpreise und Paketleistungen bleiben unverändert.
- Der Kontaktweg lautet `/kontakt?projektart=webdesign`; es wird kein neues Formular erstellt.
- Neues externes Bildmaterial wird lokal als WebP ausgeliefert und mit Urheber, Originalseite, Lizenz und deutschem Alt-Text dokumentiert.
- Das vorhandene Begrüßungsbild und das Kontaktbild werden im Zielgruppenbereich nicht erneut verwendet.
- Der Planungsabschnitt enthält nur die primäre Handlung „Erstgespräch anfragen“ und keine Paketverlinkung.
- Texte verwenden korrektes Deutsch mit „ä“, „ö“, „ü“ und „ß“.
- Es werden keine Ranking-, Umsatz- oder Rechtsgarantien ergänzt.
- Die Seite darf bei 390, 768 und 1440 Pixel Ansichtsbreite keinen horizontalen Überlauf erzeugen.
- Es wird nichts zusammengeführt, gepusht oder auf dem Server veröffentlicht.

---

## Dateistruktur

- `tests/webdesignBerlinPage.test.js`: sichert Seitenmodell, einmaligen Paketbereich, Planungsablauf, Zielgruppenkomposition und responsive CSS-Verträge.
- `tests/marketingImages.test.js`: sichert die neue Bildrolle, lokale Datei, eindeutige Verwendung und vollständige externe Quellenmetadaten.
- `data/webdesignBerlinPage.js`: liefert strukturierte Daten für Planung und Zielgruppe; entfernt die redundante Paketentscheidung.
- `data/marketingImages.js`: definiert das neue Zielgruppenfoto als zentrale Bildrolle.
- `views/bereiche/webdesign-berlin.ejs`: rendert die zwei neuen Kompositionen und entfernt den doppelten Paketabschnitt.
- `public/webdesign-berlin.css`: enthält ausschließlich die unminifizierten Komponenten- und Responsive-Regeln.
- `public/webdesign-berlin.min.css`: wird aus der Quelldatei erzeugt.
- `public/css-asset-manifest.json`: wird beim CSS-Build mit dem neuen Hash aktualisiert.
- `public/images/editorial/webdesign-zielgruppe.webp`: lokal ausgeliefertes Zielgruppenfoto.
- `docs/media/bildquellen-und-alttexte.md`: dokumentiert Quelle, Einsatz und Alt-Text des Fotos.

### Task 1: Doppelten Paketabschnitt vollständig entfernen

**Files:**
- Modify: `tests/webdesignBerlinPage.test.js:12-40`
- Modify: `tests/webdesignBerlinPage.test.js:147-160`
- Modify: `data/webdesignBerlinPage.js:199-216`
- Modify: `data/webdesignBerlinPage.js:438-466`
- Modify: `views/bereiche/webdesign-berlin.ejs:397-415`
- Modify: `public/webdesign-berlin.css:269-287`

**Interfaces:**
- Consumes: `webdesignBerlinPage.packageTeaser` und `packages` aus `data/packages.js`
- Produces: ein Seitenmodell ohne `decisionGuide` und genau einen DOM-Abschnitt mit `id="packageTeaser"`

- [ ] **Step 1: Den erwarteten Abschnittssatz und den Pakettest zuerst ändern**

Entferne `'decisionGuide'` aus `requiredSectionIds`. Ersetze den bisherigen Test zur Paketentscheidung durch diese zwei Tests, damit der reale Projektbeleg erhalten bleibt:

```js
test('webdesign berlin zeigt den vollständigen Paketbereich genau einmal', () => {
  const templateSource = readFileSync(new URL('../views/bereiche/webdesign-berlin.ejs', import.meta.url), 'utf8');
  const packageSections = templateSource.match(/id="packageTeaser"/g) || [];

  assert.equal(webdesignBerlinPage.decisionGuide, undefined);
  assert.equal(packageSections.length, 1);
  assert.doesNotMatch(templateSource, /id="decisionGuide"/);
  assert.doesNotMatch(templateSource, /page\.decisionGuide/);
  assert.doesNotMatch(templateSource, /wd-decision-card/);
  assert.deepEqual(
    webdesignBerlinPage.packageTeaser.packages.map((pkg) => pkg.id),
    ['start', 'business', 'wachstum', 'individuell']
  );
});

test('webdesign berlin zeigt reale Projektbelege und ordnet laufende Kosten ein', () => {
  assert.deepEqual(
    webdesignBerlinPage.referenceProof.projects.map((project) => project.href),
    ['/referenzen/zur-alten-backstube', '/referenzen/tm-sauber-mehr']
  );
  assert.match(webdesignBerlinPage.runningCosts.title, /Einmalige Projektkosten und laufende Kosten/);
});
```

- [ ] **Step 2: Den gezielten Test ausführen und das erwartete Scheitern bestätigen**

Run:

```bash
node --test tests/webdesignBerlinPage.test.js
```

Expected: FAIL, weil `decisionGuide` noch im Datenmodell, in `sections` und im Template vorhanden ist.

- [ ] **Step 3: Die redundanten Daten und den redundanten Abschnitt entfernen**

Entferne aus `data/webdesignBerlinPage.js` das vollständige Objekt `decisionGuide` und aus `requiredSections()` diesen Eintrag:

```js
{ id: 'decisionGuide', label: 'Website-Größe' },
```

Entferne aus `views/bereiche/webdesign-berlin.ejs` alle Zeilen vom öffnenden Element
`<section id="decisionGuide" class="wd-section" aria-labelledby="wd-decision-title">`
bis zu dessen schließendem `</section>` unmittelbar vor
`<section id="packageTeaser" class="wd-section wd-section--soft" aria-labelledby="wd-packages-title">`.

Entferne aus `public/webdesign-berlin.css` die nicht mehr verwendeten Selektoren:

```css
.wd-decision-card
.wd-decision-card:is(:hover, :focus-visible)
.wd-decision-card__price
```

Lass `.wd-reference-card__industry` mit seiner bisherigen Darstellung bestehen; löse dafür den bisher gemeinsamen Selektor in eine eigene Regel auf.

- [ ] **Step 4: Den Test erneut ausführen**

Run:

```bash
node --test tests/webdesignBerlinPage.test.js
```

Expected: PASS.

- [ ] **Step 5: Die abgeschlossene Änderung committen**

```bash
git add tests/webdesignBerlinPage.test.js data/webdesignBerlinPage.js views/bereiche/webdesign-berlin.ejs public/webdesign-berlin.css
git commit -m "fix: doppelten Paketbereich auf Webdesign Berlin entfernen"
```

### Task 2: Planungsabschnitt als redaktionellen Beratungsablauf gestalten

**Files:**
- Modify: `tests/webdesignBerlinPage.test.js:162-171`
- Modify: `tests/webdesignBerlinPage.test.js:290-304`
- Modify: `data/webdesignBerlinPage.js:35-90`
- Modify: `views/bereiche/webdesign-berlin.ejs:172-211`
- Modify: `public/webdesign-berlin.css:241-268`
- Modify: `public/webdesign-berlin.css:466-480`
- Modify: `public/webdesign-berlin.css:616-675`
- Modify: `public/webdesign-berlin.css:1298-1337`

**Interfaces:**
- Consumes: `MARKETING_IMAGES.webdesignPlanning`
- Produces: `webdesignBerlinPage.consultation` mit `{ eyebrow, title, lead, image, steps, cta }`
- Produces DOM-Klassen: `wd-consultation-intro`, `wd-consultation-copy`, `wd-consultation-steps`, `wd-consultation-step`, `wd-planning-image`

- [ ] **Step 1: Den neuen Daten- und Darstellungsvertrag als fehlschlagenden Test schreiben**

Ersetze den bisherigen Planungsbild-Test und ergänze den CSS-Vertrag:

```js
test('webdesign berlin zeigt die Planung als redaktionellen Beratungsablauf', () => {
  const templateSource = readFileSync(new URL('../views/bereiche/webdesign-berlin.ejs', import.meta.url), 'utf8');
  const cssSource = readFileSync(new URL('../public/webdesign-berlin.css', import.meta.url), 'utf8');
  const consultationMarkup = templateSource.slice(
    templateSource.indexOf('class="wd-section wd-section--video'),
    templateSource.indexOf('id="websiteCheck"')
  );

  assert.equal(webdesignBerlinPage.consultation.steps.length, 3);
  assert.deepEqual(webdesignBerlinPage.consultation.cta, {
    label: 'Erstgespräch anfragen',
    href: '/kontakt?projektart=webdesign'
  });
  assert.equal(webdesignBerlinPage.consultation.image.src, '/images/editorial/webdesign-planung.webp');
  assert.match(webdesignBerlinPage.consultation.image.alt, /planen gemeinsam/i);
  assert.match(webdesignBerlinPage.consultation.image.source.pageUrl, /^https:\/\/www\.pexels\.com\/photo\//);
  assert.match(consultationMarkup, /class="wd-consultation-intro"/);
  assert.match(consultationMarkup, /class="wd-consultation-copy/);
  assert.match(consultationMarkup, /<ol class="wd-consultation-steps"/);
  assert.match(consultationMarkup, /page\.consultation\.image\.alt/);
  assert.match(consultationMarkup, /page\.consultation\.image\.source\.pageUrl/);
  assert.match(consultationMarkup, /page\.consultation\.cta\.label/);
  assert.doesNotMatch(consultationMarkup, /Pakete ansehen|href="\/pakete"/);
  assert.match(cssSource, /\.wd-section-head > \.wd-lead\s*\{[^}]*margin-inline:\s*auto;/s);
  assert.match(cssSource, /\.wd-consultation-intro\s*\{[^}]*grid-template-columns:/s);
  assert.match(cssSource, /\.wd-planning-image\s*\{[^}]*aspect-ratio:\s*4\s*\/\s*3;/s);
  assert.match(cssSource, /\.wd-planning-image img\s*\{[^}]*object-position:\s*center 72%;/s);
  assert.match(cssSource, /\.wd-consultation-steps::before\s*\{/);
});
```

- [ ] **Step 2: Den Test ausführen und das erwartete Scheitern bestätigen**

Run:

```bash
node --test tests/webdesignBerlinPage.test.js
```

Expected: FAIL, weil `consultation` und die neuen Klassen noch fehlen.

- [ ] **Step 3: Die hart codierten Beratungsinhalte in ein strukturiertes Seitenmodell überführen**

Ersetze `planningImage` auf oberster Ebene durch:

```js
consultation: {
  eyebrow: 'Erstgespräch',
  title: 'Was wir für dein Webdesign-Projekt klären',
  lead: 'Im Erstgespräch ordne ich deine Ausgangslage, den realistischen Projektumfang und den passenden nächsten Schritt ein. Du erhältst eine verständliche Einschätzung statt einer vorschnellen Paketempfehlung.',
  image: MARKETING_IMAGES.webdesignPlanning,
  steps: [
    {
      title: 'Ausgangslage und Ziele',
      text: 'Wir klären, ob du neu startest oder eine bestehende Website überarbeiten möchtest. Dazu gehören Zielgruppe, Leistungen, vorhandene Inhalte und der wichtigste Kontaktweg.'
    },
    {
      title: 'Umfang und Zeitrahmen',
      text: 'Wir ordnen Seitenumfang, Texte, Bilder, Zusatzfunktionen, Local-SEO-Grundlagen, laufende Kosten und den realistischen zeitlichen Rahmen.'
    },
    {
      title: 'Preisbereich und erste Empfehlung',
      text: 'Auf Basis deiner Angaben erhältst du einen unverbindlichen Preisbereich und eine Empfehlung für den sinnvollsten nächsten Projektschritt.'
    }
  ],
  cta: {
    label: 'Erstgespräch anfragen',
    href: '/kontakt?projektart=webdesign'
  }
},
```

- [ ] **Step 4: Das Template als Text-Bild-Einstieg mit geordnetem Ablauf rendern**

Ersetze den Inhalt von `.wd-video` durch diese Struktur:

```ejs
<div class="wd-video">
  <div class="wd-consultation-intro">
    <div class="wd-consultation-copy animate-on-scroll">
      <span class="wd-chip"><%= page.consultation.eyebrow %></span>
      <h2 id="wd-video-title"><%= page.consultation.title %></h2>
      <p class="wd-lead"><%= page.consultation.lead %></p>
    </div>
    <figure class="wd-planning-image animate-on-scroll">
      <img src="<%= page.consultation.image.src %>" alt="<%= page.consultation.image.alt %>" width="1600" height="1200" loading="lazy" decoding="async">
      <figcaption>
        Bild: <%= page.consultation.image.source.creator %> /
        <a href="<%= page.consultation.image.source.pageUrl %>" rel="noopener noreferrer">Pexels</a>
      </figcaption>
    </figure>
  </div>
  <ol class="wd-consultation-steps">
    <% page.consultation.steps.forEach(function (step, index) { %>
      <li class="wd-consultation-step animate-on-scroll">
        <span class="wd-consultation-step__number" aria-hidden="true"><%= index + 1 %></span>
        <div>
          <h3><%= step.title %></h3>
          <p><%= step.text %></p>
        </div>
      </li>
    <% }) %>
  </ol>
  <div class="wd-actions wd-consultation-actions animate-on-scroll">
    <a class="btn btn-primary" href="<%= page.consultation.cta.href %>"><%= page.consultation.cta.label %></a>
  </div>
</div>
```

- [ ] **Step 5: Die zugehörige Desktop-Darstellung ergänzen**

Ersetze die bisherigen Bild- und Planungskartenregeln durch:

```css
.webdesign-berlin .wd-section-head > .wd-lead {
  margin-inline: auto;
}

.webdesign-berlin .wd-video {
  margin: 0 auto;
  max-width: 1160px;
}

.webdesign-berlin .wd-consultation-intro {
  align-items: center;
  display: grid;
  gap: clamp(28px, 5vw, 64px);
  grid-template-columns: minmax(0, 0.88fr) minmax(360px, 1.12fr);
}

.webdesign-berlin .wd-consultation-copy {
  text-align: left;
}

.webdesign-berlin .wd-consultation-copy .wd-lead {
  margin-bottom: 0;
}

.webdesign-berlin .wd-planning-image {
  aspect-ratio: 4 / 3;
  border-radius: 24px;
  margin: 0;
  overflow: hidden;
  position: relative;
}

.webdesign-berlin .wd-planning-image img {
  display: block;
  height: 100%;
  object-fit: cover;
  object-position: center 72%;
  width: 100%;
}

.webdesign-berlin .wd-consultation-steps {
  display: grid;
  gap: 0;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  list-style: none;
  margin: clamp(34px, 5vw, 56px) 0 0;
  padding: 0;
  position: relative;
  text-align: left;
}

.webdesign-berlin .wd-consultation-steps::before {
  background: rgba(239, 75, 28, 0.28);
  content: "";
  height: 2px;
  left: calc(16.666% + 17px);
  position: absolute;
  right: calc(16.666% + 17px);
  top: 17px;
}

.webdesign-berlin .wd-consultation-step {
  display: grid;
  gap: 14px;
  grid-template-columns: 34px minmax(0, 1fr);
  padding: 0 clamp(12px, 2vw, 24px);
  position: relative;
}
```

Behalt die vorhandene Gestaltung von `wd-consultation-step__number`, `wd-consultation-actions` und dem Bildnachweis bei. Entferne die nicht mehr benötigten Regeln für `.wd-consultation-grid`, `.wd-consultation-step__head` und `.wd-consultation-step__head h3`.

- [ ] **Step 6: Die mobile Reihenfolge und den vertikalen Ablauf definieren**

Ergänze im vorhandenen `@media (max-width: 860px)`:

```css
.webdesign-berlin .wd-consultation-intro,
.webdesign-berlin .wd-consultation-steps {
  grid-template-columns: 1fr;
}

.webdesign-berlin .wd-consultation-steps {
  gap: 22px;
}

.webdesign-berlin .wd-consultation-steps::before {
  bottom: 17px;
  height: auto;
  left: 17px;
  right: auto;
  top: 17px;
  width: 2px;
}

.webdesign-berlin .wd-consultation-step {
  padding: 0;
}
```

- [ ] **Step 7: Den gezielten Test erneut ausführen**

Run:

```bash
node --test tests/webdesignBerlinPage.test.js
```

Expected: PASS.

- [ ] **Step 8: Den Planungsabschnitt committen**

```bash
git add tests/webdesignBerlinPage.test.js data/webdesignBerlinPage.js views/bereiche/webdesign-berlin.ejs public/webdesign-berlin.css
git commit -m "feat: Beratungsablauf auf Webdesign Berlin neu gestalten"
```

### Task 3: Persönlichen Zielgruppenbereich mit eigenem Bild umsetzen

**Files:**
- Create: `public/images/editorial/webdesign-zielgruppe.webp`
- Modify: `tests/marketingImages.test.js:10-40`
- Modify: `tests/webdesignBerlinPage.test.js`
- Modify: `data/marketingImages.js:40-65`
- Modify: `data/marketingImages.js:135-165`
- Modify: `data/webdesignBerlinPage.js:82-100`
- Modify: `views/bereiche/webdesign-berlin.ejs:65-75`
- Modify: `views/bereiche/webdesign-berlin.ejs:230-249`
- Modify: `public/webdesign-berlin.css`
- Modify: `docs/media/bildquellen-und-alttexte.md:10-25`

**Interfaces:**
- Produces: `MARKETING_IMAGES.webdesignFit`
- Produces: `webdesignBerlinPage.targetGroups` mit `{ eyebrow, title, lead, image, goodFit, notFitTitle, notFit, cta }`
- Produces DOM-Klassen: `wd-target-layout`, `wd-target-photo`, `wd-target-fit-panel`, `wd-target-boundary`

- [ ] **Step 1: Tests für Bildrolle, Inhalt, CTA und DOM-Struktur zuerst ergänzen**

Ergänze in `tests/marketingImages.test.js`:

```js
test('der Zielgruppenbereich verwendet ein eigenes dokumentiertes Foto', () => {
  const image = MARKETING_IMAGES.webdesignFit;

  assert.ok(image);
  assert.equal(image.src, '/images/editorial/webdesign-zielgruppe.webp');
  assert.notEqual(image.src, MARKETING_IMAGES.contactConversation.src);
  assert.notEqual(image.src, MARKETING_IMAGES.webdesignPlanning.src);
  assert.match(image.alt, /Beraterin und Unternehmer/);
  assert.equal(image.source.creator, 'Alena Darmel');
  assert.equal(image.source.pageUrl, 'https://www.pexels.com/photo/business-man-and-woman-in-the-office-near-glass-window-8133862/');
  assert.equal(existsSync(new URL(`.${image.src}`, PUBLIC_ROOT)), true);
});
```

Ergänze in `tests/webdesignBerlinPage.test.js`:

```js
test('webdesign berlin führt passende Zielgruppen persönlich zum Kontakt', () => {
  const templateSource = readFileSync(new URL('../views/bereiche/webdesign-berlin.ejs', import.meta.url), 'utf8');
  const cssSource = readFileSync(new URL('../public/webdesign-berlin.css', import.meta.url), 'utf8');
  const targetMarkup = templateSource.slice(
    templateSource.indexOf('id="targetGroups"'),
    templateSource.indexOf('id="individualWebdesign"')
  );

  assert.equal(webdesignBerlinPage.targetGroups.image.src, '/images/editorial/webdesign-zielgruppe.webp');
  assert.deepEqual(webdesignBerlinPage.targetGroups.cta, {
    label: 'Webdesign-Projekt besprechen',
    href: '/kontakt?projektart=webdesign'
  });
  assert.equal(webdesignBerlinPage.targetGroups.notFitTitle, 'Nicht passend, wenn …');
  assert.match(targetMarkup, /class="wd-target-layout/);
  assert.match(targetMarkup, /class="wd-target-photo/);
  assert.match(targetMarkup, /class="wd-target-fit-panel/);
  assert.match(targetMarkup, /class="wd-target-boundary/);
  assert.match(targetMarkup, /page\.targetGroups\.image\.alt/);
  assert.match(targetMarkup, /page\.targetGroups\.image\.source\.pageUrl/);
  assert.match(targetMarkup, /page\.targetGroups\.cta\.label/);
  assert.match(cssSource, /\.wd-target-layout\s*\{[^}]*grid-template-columns:/s);
  assert.match(cssSource, /\.wd-target-boundary\s*\{[^}]*grid-column:\s*1\s*\/\s*-1;/s);
  assert.match(cssSource, /@media \(max-width: 860px\)[\s\S]*?\.wd-target-layout\s*\{[^}]*grid-template-columns:\s*1fr;/);
});
```

- [ ] **Step 2: Beide gezielten Tests ausführen und das erwartete Scheitern bestätigen**

Run:

```bash
node --test tests/marketingImages.test.js tests/webdesignBerlinPage.test.js
```

Expected: FAIL, weil Bildrolle, lokale Datei, Seitendaten und DOM-Klassen fehlen.

- [ ] **Step 3: Das ausgewählte Pexels-Foto lokal laden und als WebP optimieren**

Das freigegebene Motiv ist „Business Man and Woman in the Office Near Glass Window“ von Alena Darmel. Lade ausschließlich die Bilddatei; die Quellenangaben werden dauerhaft im Repository dokumentiert.

```bash
curl -L 'https://images.pexels.com/photos/8133862/pexels-photo-8133862.jpeg?auto=compress&cs=tinysrgb&w=1600' -o /tmp/webdesign-zielgruppe-8133862.jpg
cwebp -quiet -q 82 -resize 1200 0 /tmp/webdesign-zielgruppe-8133862.jpg -o public/images/editorial/webdesign-zielgruppe.webp
magick identify public/images/editorial/webdesign-zielgruppe.webp
```

Expected: `WEBP 1200x1800`; die Datei bleibt deutlich unter 500 KB.

- [ ] **Step 4: Die zentrale Bildrolle ergänzen**

Füge in `MARKETING_IMAGES` ein:

```js
webdesignFit: freezeImage({
  src: '/images/editorial/webdesign-zielgruppe.webp',
  alt: 'Beraterin und Unternehmer besprechen gemeinsam ein Website-Projekt am Laptop',
  source: {
    kind: 'external',
    provider: 'Pexels',
    creator: 'Alena Darmel',
    pageUrl: 'https://www.pexels.com/photo/business-man-and-woman-in-the-office-near-glass-window-8133862/',
    licenseUrl: PEXELS_LICENSE_URL
  }
}),
```

Ergänze `'webdesignFit'` unmittelbar nach `'webdesignPlanning'` in `REQUIRED_VISUAL_ROLES`.

- [ ] **Step 5: Den Zielgruppeninhalt im Seitenmodell erweitern**

Ersetze `targetGroups` durch:

```js
targetGroups: {
  eyebrow: 'Passt das zu deinem Vorhaben?',
  title: 'Webdesign Berlin passt zu dir, wenn Klarheit wichtiger ist als eine Standardschablone',
  lead: 'Das Angebot richtet sich an kleinere Unternehmen und Selbstständige, die ihre Leistungen verständlich zeigen und Interessenten gezielt zu einer Anfrage führen möchten.',
  image: MARKETING_IMAGES.webdesignFit,
  goodFit: [
    'du ein klares lokales Angebot verständlich darstellen möchtest',
    'du selbstständig bist oder ein kleines Unternehmen, eine Praxis, Beratung oder einen Handwerksbetrieb führst',
    'deine Leistungen in Berlin oder Brandenburg besser auffindbar und nachvollziehbar werden sollen',
    'deine bestehende Website technisch oder inhaltlich geordnet neu aufgebaut werden soll'
  ],
  notFitTitle: 'Nicht passend, wenn …',
  notFit: [
    'eine große Plattform, ein Marktplatz oder ein Enterprise-Projekt entstehen soll',
    'Inhalte, Zielgruppe und verantwortliche Ansprechpartner noch vollständig offen sind',
    'Ranking, Umsatz oder eine rechtliche Prüfung garantiert werden sollen'
  ],
  cta: {
    label: 'Webdesign-Projekt besprechen',
    href: '/kontakt?projektart=webdesign'
  }
},
```

- [ ] **Step 6: Die bisherigen Standardkarten durch die persönliche Komposition ersetzen**

Entferne den nicht mehr benötigten Eintrag `wdSectionImages.targetGroups`. Ersetze den Inhalt des Abschnitts `#targetGroups` durch:

```ejs
<div class="wd-container wd-target-layout">
  <figure class="wd-target-photo animate-on-scroll">
    <img src="<%= page.targetGroups.image.src %>" width="1200" height="1800" alt="<%= page.targetGroups.image.alt %>" loading="lazy" decoding="async">
    <figcaption>
      Bild: <%= page.targetGroups.image.source.creator %> /
      <a href="<%= page.targetGroups.image.source.pageUrl %>" rel="noopener noreferrer">Pexels</a>
    </figcaption>
  </figure>
  <article class="wd-target-fit-panel animate-on-scroll">
    <span class="wd-chip"><%= page.targetGroups.eyebrow %></span>
    <h2 id="wd-target-title"><%= page.targetGroups.title %></h2>
    <p class="wd-lead"><%= page.targetGroups.lead %></p>
    <ul class="wd-list wd-list--checks">
      <% page.targetGroups.goodFit.forEach(function (item) { %>
        <li><%= item %></li>
      <% }) %>
    </ul>
    <a class="btn btn-primary" href="<%= page.targetGroups.cta.href %>"><%= page.targetGroups.cta.label %></a>
  </article>
  <aside class="wd-target-boundary animate-on-scroll" aria-labelledby="wd-target-boundary-title">
    <h3 id="wd-target-boundary-title"><%= page.targetGroups.notFitTitle %></h3>
    <ul class="wd-list wd-list--crosses">
      <% page.targetGroups.notFit.forEach(function (item) { %>
        <li><%= item %></li>
      <% }) %>
    </ul>
  </aside>
</div>
```

- [ ] **Step 7: Die Zielgruppenkomposition gestalten**

Ergänze:

```css
.webdesign-berlin .wd-target-layout {
  align-items: stretch;
  display: grid;
  gap: clamp(18px, 3vw, 30px);
  grid-template-columns: minmax(300px, 0.82fr) minmax(0, 1.18fr);
}

.webdesign-berlin .wd-target-photo {
  border-radius: 24px;
  margin: 0;
  min-height: 620px;
  overflow: hidden;
  position: relative;
}

.webdesign-berlin .wd-target-photo img {
  display: block;
  height: 100%;
  object-fit: cover;
  object-position: center;
  width: 100%;
}

.webdesign-berlin .wd-target-photo figcaption,
.webdesign-berlin .wd-planning-image figcaption {
  background: rgba(11, 42, 70, 0.88);
  bottom: 0;
  color: #fff;
  font-size: 0.75rem;
  left: 0;
  padding: 0.45rem 0.7rem;
  position: absolute;
}

.webdesign-berlin .wd-target-photo figcaption a {
  color: #fff;
}

.webdesign-berlin .wd-target-fit-panel {
  background: var(--wd-ink);
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: clamp(28px, 5vw, 58px);
}

.webdesign-berlin .wd-target-fit-panel h2,
.webdesign-berlin .wd-target-fit-panel p,
.webdesign-berlin .wd-target-fit-panel li {
  color: #fff;
}

.webdesign-berlin .wd-target-fit-panel .wd-lead {
  color: rgba(255, 255, 255, 0.78);
  margin-bottom: 0;
}

.webdesign-berlin .wd-target-fit-panel .wd-list {
  margin-bottom: 28px;
}

.webdesign-berlin .wd-target-fit-panel .btn {
  align-self: flex-start;
}

.webdesign-berlin .wd-target-boundary {
  align-items: start;
  background: #fff;
  border: 1px solid var(--wd-line);
  border-left: 4px solid var(--wd-accent);
  border-radius: 12px;
  display: grid;
  gap: 18px;
  grid-column: 1 / -1;
  grid-template-columns: minmax(180px, 0.32fr) minmax(0, 1fr);
  padding: clamp(20px, 3vw, 30px);
}

.webdesign-berlin .wd-target-boundary .wd-list {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 0;
}
```

Ergänze im vorhandenen `@media (max-width: 860px)`:

```css
.webdesign-berlin .wd-target-layout,
.webdesign-berlin .wd-target-boundary,
.webdesign-berlin .wd-target-boundary .wd-list {
  grid-template-columns: 1fr;
}

.webdesign-berlin .wd-target-photo {
  aspect-ratio: 4 / 5;
  min-height: 0;
}
```

Damit bleibt die mobile Reihenfolge automatisch: Foto → positives Panel mit CTA → Abgrenzung.

- [ ] **Step 8: Die Bildquelle dokumentieren**

Ergänze in der Tabelle „Externe Bildquellen“:

```markdown
| `/images/editorial/webdesign-zielgruppe.webp` | Webdesign Berlin, Zielgruppenberatung | Alena Darmel | [Business Man and Woman in the Office Near Glass Window](https://www.pexels.com/photo/business-man-and-woman-in-the-office-near-glass-window-8133862/) | Beraterin und Unternehmer besprechen gemeinsam ein Website-Projekt am Laptop |
```

- [ ] **Step 9: Beide gezielten Tests ausführen**

Run:

```bash
node --test tests/marketingImages.test.js tests/webdesignBerlinPage.test.js
```

Expected: PASS.

- [ ] **Step 10: Den Zielgruppenbereich committen**

```bash
git add tests/marketingImages.test.js tests/webdesignBerlinPage.test.js data/marketingImages.js data/webdesignBerlinPage.js views/bereiche/webdesign-berlin.ejs public/webdesign-berlin.css public/images/editorial/webdesign-zielgruppe.webp docs/media/bildquellen-und-alttexte.md
git commit -m "feat: persönlichen Zielgruppenbereich ergänzen"
```

### Task 4: CSS-Build, vollständige Tests und visuelle Abnahme

**Files:**
- Modify: `public/webdesign-berlin.min.css`
- Modify: `public/css-asset-manifest.json`
- Verify: `views/bereiche/webdesign-berlin.ejs`
- Verify: `public/webdesign-berlin.css`
- Verify: `public/images/editorial/webdesign-planung.webp`
- Verify: `public/images/editorial/webdesign-zielgruppe.webp`

**Interfaces:**
- Consumes: alle Ergebnisse aus Task 1 bis 3
- Produces: gebaute CSS-Datei, aktualisierten Asset-Hash und lokal geprüfte Desktop-/Mobilansicht

- [ ] **Step 1: Formale Fehler vor dem Build ausschließen**

Run:

```bash
git diff --check
node --check data/webdesignBerlinPage.js
node --check data/marketingImages.js
```

Expected: keine Ausgabe und Exit-Code 0.

- [ ] **Step 2: Die minifizierten CSS-Assets neu erzeugen**

Run:

```bash
npm run build
```

Expected: `CSS assets built` ohne Fehler. `public/webdesign-berlin.min.css` und der Eintrag für `webdesign-berlin.css` in `public/css-asset-manifest.json` müssen aktualisiert sein.

- [ ] **Step 3: Gezielte und vollständige Tests ausführen**

Run:

```bash
node --test tests/marketingImages.test.js tests/webdesignBerlinPage.test.js
npm test
```

Expected: alle ausführbaren Tests bestehen; vorhandene, ausdrücklich übersprungene Tests bleiben als `skipped` gekennzeichnet.

- [ ] **Step 4: Den lokalen Server mit einem ausreichend langen lokalen Sitzungsgeheimnis starten**

Falls der vorhandene Entwicklungsserver nicht mehr läuft:

```bash
SESSION_SECRET='lokal-nur-fuer-webdesign-pruefung-2026' npm run dev
```

Expected: `http://localhost:3000/webdesign-berlin` antwortet mit HTTP 200. Das Geheimnis wird nicht in eine Datei geschrieben oder committed.

- [ ] **Step 5: Die große Ansicht visuell prüfen**

Öffne `http://localhost:3000/webdesign-berlin` mit 1440 × 1000 Pixeln und prüfe:

1. Der frühere Abschnitt „Welche Website-Größe passt zu deinem Unternehmen?“ fehlt.
2. Der Paket-Slider „Pakete für Webdesign in Berlin“ ist genau einmal vorhanden.
3. Text steht links und das Planungsfoto rechts; Personen und Laptop sind klar sichtbar.
4. Der Absatz unter zentrierten Abschnittsüberschriften ist als Block mittig ausgerichtet.
5. Die drei Schritte sind durch eine sichtbare horizontale Linie verbunden.
6. Im Planungsabschnitt gibt es nur „Erstgespräch anfragen“ und keinen Paketlink.
7. Im Zielgruppenbereich stehen das neue Foto links und das dunkelblaue positive Panel rechts.
8. „Nicht passend, wenn …“ erscheint als kompakter Streifen unter der Hauptkomposition.
9. Beide Bildnachweise sind lesbar und führen zur richtigen Pexels-Seite.

- [ ] **Step 6: Die mobile Ansicht visuell und auf Überlauf prüfen**

Prüfe dieselbe URL zuerst bei 390 × 844 Pixeln und anschließend bei 768 × 1024 Pixeln:

1. Planungsabschnitt: Text → Bild → Schritte → CTA.
2. Zielgruppenabschnitt: Foto → positives Panel mit CTA → Abgrenzung.
3. Beide Bildausschnitte zeigen Personen und Handlung.
4. Schaltflächen sind vollständig sichtbar und gut bedienbar.
5. Keine Überschrift, Liste, Linie oder Schaltfläche ragt seitlich aus dem Viewport.
6. `document.documentElement.scrollWidth === document.documentElement.clientWidth`.

- [ ] **Step 7: Den lokalen SEO-Audit ausführen**

Run:

```bash
npm run audit:seo-recovery -- --base-url http://127.0.0.1:3000 --out artifacts/seo-recovery-audit.json --fail-on error
```

Expected: `errors` ist 0. Die Entfernung von `decisionGuide` erzeugt keine defekten Anker oder fehlenden internen Ziele.

- [ ] **Step 8: Build- und Prüfänderungen committen**

```bash
git add public/webdesign-berlin.min.css public/css-asset-manifest.json
git commit -m "build: Webdesign-Berlin-Styles aktualisieren"
```

Falls `git diff --cached --quiet` meldet, dass der CSS-Build keinen neuen Manifestinhalt erzeugt hat, ist kein leerer Commit anzulegen.

- [ ] **Step 9: Abschlusszustand dokumentieren**

Run:

```bash
git status --short --branch
git log -5 --oneline
```

Expected: keine unbeabsichtigten oder uncommitteten Dateien. Es erfolgt kein Push, Merge oder Deployment.
