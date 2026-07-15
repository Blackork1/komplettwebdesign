# Kompakte Bestandsartikel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Bestandsübersicht zeigt jeden Blogartikel standardmäßig als kompakte Zeile und verschiebt ausführliche Performance-, Audit- und Optimierungsdaten in einen geschlossenen Detailbereich.

**Architecture:** Die bestehende EJS-Teilansicht bleibt die einzige Artikelkomponente für alle vier Gruppen. Sie bereitet das 28-Tage-Fenster lokal für die kompakte Zusammenfassung auf und verwendet ein natives `details`-/`summary`-Element für Sekundärdaten. Bestehende Formulare, Routen und Polling-Datenattribute werden unverändert weiterverwendet; CSS steuert ausschließlich das kompakte Desktop-Raster und die gestapelte mobile Darstellung.

**Tech Stack:** Node.js, Express, EJS, Bootstrap-Klassen, projektinternes CSS, Node-Test-Runner

## Global Constraints

- Alle Texte verwenden korrektes Deutsch mit Umlauten.
- Die vier bestehenden Artikelgruppen und ihre fachliche Klassifizierung bleiben unverändert.
- Es gibt keine neue Datenbankmigration, keine neuen `.env`-Variablen und keine Änderung an `docker-compose.yml`.
- Alle vorhandenen Aktionsrouten, CSRF-Felder und JavaScript-Datenattribute bleiben erhalten.
- Der Detailbereich ist beim Laden der Seite geschlossen.
- Die mobile Darstellung erzeugt keinen horizontalen Seitenüberlauf.

---

## Dateistruktur

- `tests/contentAgentAdminViews.test.js`: Verträge für kompakte Kerndaten, geschlossene Details, bestehende Aktionen und responsive CSS-Regeln.
- `views/admin/contentAgent/_existingContentItem.ejs`: kompakte Artikelzusammenfassung, aufklappbarer Detailbericht und unveränderte Aktionsformulare.
- `public/admin.css`: kompaktes Desktop-Raster, Detaildarstellung und gestapelte mobile Ansicht.
- `public/admin.min.css`: durch `npm run build` erzeugte minimierte CSS-Datei.
- `public/css-asset-manifest.json`: durch `npm run build` aktualisierter Hash für `admin.min.css`.

### Task 1: Kompakten Darstellungsvertrag testgetrieben festlegen

**Files:**
- Modify: `tests/contentAgentAdminViews.test.js:485-505`
- Test: `tests/contentAgentAdminViews.test.js`

**Interfaces:**
- Consumes: `existingContent.ejs` mit `item.performance.windows[]`, `item.auditScore`, `item.optimization` und bestehenden Aktionsdaten.
- Produces: HTML-Vertrag mit `.content-existing-item__summary`, `.content-existing-item__metric--28`, `details.content-existing-item__details` und unveränderten Formularaktionen.

- [ ] **Step 1: Failing Rendering-Test für die kompakte Standardansicht schreiben**

Den bisherigen CSS-Kartentest um einen EJS-Test ergänzen, der ein Element mit drei Performancefenstern rendert und folgende Verträge prüft:

```js
test('Bestandsartikel zeigt Kerndaten kompakt und hält Sekundärdaten standardmäßig geschlossen', async () => {
  const html = await renderFile(fileURLToPath(viewUrl('existingContent.ejs')), {
    ...baseLocals,
    existingContent: [{
      id: 19,
      title: 'Website-Relaunch planen',
      slug: 'website-relaunch-planen',
      updatedAt: '2026-07-14T10:00:00.000Z',
      auditId: 31,
      auditScore: 88,
      findings: [{ message: 'CTA präzisieren' }],
      performance: {
        headline: 'Suchintention prüfen',
        detailUrl: '/admin/content-agent/existing-content/19/performance',
        windows: [
          { days: 7, label: '7 Tage', hasData: true, impressionsLabel: '14', clicksLabel: '1' },
          { days: 14, label: '14 Tage', hasData: true, impressionsLabel: '33', clicksLabel: '2' },
          { days: 28, label: '28 Tage', hasData: true, impressionsLabel: '68', clicksLabel: '3' }
        ]
      },
      optimization: {
        state: 'idle', active: false, canStart: true,
        statusLabel: 'Noch nicht gestartet', stageLabel: 'Noch keine Stufe',
        message: 'Noch keine KI-Optimierung gestartet.', revisionUrl: null
      }
    }]
  });

  assert.match(html, /class="content-existing-item__summary"/);
  assert.match(html, /class="content-existing-item__metric content-existing-item__metric--28"[\s\S]*?68 Impressionen[\s\S]*?3 Klicks/);
  assert.match(html, /88\/100/);
  assert.match(html, /Noch nicht gestartet/);
  assert.match(html, /14\.7\.2026/);
  assert.match(html, /<details class="content-existing-item__details">/);
  assert.doesNotMatch(html, /<details class="content-existing-item__details" open/);
  assert.match(html, /<summary[\s\S]*?Details anzeigen/);
  assert.match(html, /7 Tage[\s\S]*?14 Impressionen[\s\S]*?14 Tage[\s\S]*?33 Impressionen/);
  assert.match(html, /CTA präzisieren/);
  assert.match(html, /action="\/admin\/content-agent\/existing-content\/19\/optimize"/);
});
```

- [ ] **Step 2: Failing CSS-Vertrag auf das kompakte Raster umstellen**

Den bisherigen Test `Bestandsgruppen verwenden ein responsives Kartenraster ohne mobilen Seitenüberlauf` auf folgende Selektoren ausrichten:

```js
assert.match(adminCss, /\.content-existing-item__summary\s*\{[\s\S]*?display:\s*grid/);
assert.match(adminCss, /\.content-existing-item__details\s*>\s*summary\s*\{/);
assert.match(adminCss, /\.content-existing-item__details\[open\]\s*>\s*summary/);
assert.match(
  adminCss,
  /@media\s*\(max-width:\s*767\.98px\)[\s\S]*?\.content-existing-item__summary\s*\{[\s\S]*?grid-template-columns:\s*1fr/
);
assert.match(adminCss, /\.content-existing-item\s*\{[\s\S]*?min-width:\s*0/);
assert.match(adminCss, /\.content-existing-item__slug\s*\{[\s\S]*?overflow-wrap:\s*anywhere/);
```

- [ ] **Step 3: Fokussierte Tests ausführen und das erwartete Scheitern bestätigen**

Run:

```bash
node --test --test-name-pattern="Bestandsartikel zeigt Kerndaten kompakt|Bestandsgruppen verwenden" tests/contentAgentAdminViews.test.js
```

Expected: FAIL, weil `.content-existing-item__summary`, `.content-existing-item__metric--28` und `.content-existing-item__details` noch nicht gerendert beziehungsweise gestaltet werden.

- [ ] **Step 4: Teständerung committen**

```bash
git add tests/contentAgentAdminViews.test.js
git commit -m "test: kompakte Bestandsartikel festlegen"
```

### Task 2: EJS-Artikelkomponente kompakt strukturieren

**Files:**
- Modify: `views/admin/contentAgent/_existingContentItem.ejs:1-122`
- Test: `tests/contentAgentAdminViews.test.js`

**Interfaces:**
- Consumes: `item.performance.windows` mit `days`, `hasData`, `impressionsLabel`, `clicksLabel` und `emptyLabel`; bestehendes `optimization`-Objekt und `visibilityAction`.
- Produces: kompakte sichtbare Zusammenfassung, geschlossenes `details`-Element und dieselben Aktionsformulare samt Polling-Attributen.

- [ ] **Step 1: 28-Tage-Metrik sicher auswählen**

Im vorhandenen EJS-Initialisierungsblock ergänzen:

```ejs
<%
  const performanceWindows = item.performance && Array.isArray(item.performance.windows)
    ? item.performance.windows
    : [];
  const performance28 = performanceWindows.find((metric) => Number(metric.days) === 28) || null;
%>
```

- [ ] **Step 2: Sichtbaren Artikelkopf als kompaktes Raster rendern**

Direkt innerhalb des Artikels eine `.content-existing-item__summary` mit vier Bereichen anlegen:

```ejs
<div class="content-existing-item__summary">
  <header class="content-existing-item__identity">
    <strong class="content-existing-item__title"><%= item.title %></strong>
    <code class="content-existing-item__slug"><%= item.slug %></code>
  </header>
  <section class="content-existing-item__metric content-existing-item__metric--28" aria-label="Performance der letzten 28 Tage">
    <strong>28 Tage</strong>
    <span><%= performance28 && performance28.hasData ? `${performance28.impressionsLabel} Impressionen · ${performance28.clicksLabel} Klicks` : (performance28?.emptyLabel || 'Noch keine GSC-Daten') %></span>
  </section>
  <section class="content-existing-item__status" aria-label="Qualität und Optimierungsstatus">
    <span class="content-agent-status <%= item.auditId && item.auditScore >= 85 ? 'is-success' : 'is-warning' %>"><%= item.auditId ? `${item.auditScore}/100` : 'Nicht geprüft' %></span>
    <strong data-existing-content-optimization-label><%= optimization.statusLabel %></strong>
  </section>
  <span class="content-existing-item__date"><%= item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('de-DE') : '–' %></span>
</div>
```

- [ ] **Step 3: Sekundärdaten in einen geschlossenen Detailbereich verschieben**

Die aktuelle vollständige Performanceanzeige aus `_existingContentItem.ejs` vom öffnenden Ausdruck `<% if (item.performance) { %>` bis zum zugehörigen schließenden `<% } %>` unmittelbar vor `.content-existing-item__grid` sowie die aktuelle Grid- und Outcome-Struktur vollständig in folgende Struktur verschieben. Das `open`-Attribut wird nicht gesetzt und alle inneren EJS-Ausdrücke bleiben unverändert:

```ejs
<details class="content-existing-item__details">
  <summary><span class="content-existing-item__details-show">Details anzeigen</span><span class="content-existing-item__details-hide">Details schließen</span></summary>
  <div class="content-existing-item__details-body">
    <div class="content-existing-item__grid">
      <section aria-label="Prüfung und Optimierung"></section>
      <section aria-label="Befunde"></section>
    </div>
  </div>
</details>
```

Die beiden im Beispiel leeren `section`-Elemente werden nicht neu oder leer erzeugt: Es sind exakt die beiden bereits vollständig implementierten Section-Elemente aus `.content-existing-item__grid`, die gemeinsam mit ihrer EJS-Logik verschoben werden. Der vorhandene Outcome-Block wird nach dem Grid innerhalb von `.content-existing-item__details-body` verschoben. Alle dynamischen Texte verwenden weiterhin EJS-Escaping. Das Performance-Detailziel bleibt `<a href="<%= item.performance.detailUrl %>">Performance im Detail öffnen</a>`.

- [ ] **Step 4: Bestehende Aktionen kompakt unter der Zusammenfassung erhalten**

Die vorhandenen Aktionsformulare unverändert in `.content-existing-item__actions` rendern. Dafür die zwei aktuellen Öffnungselemente `<footer class="content-existing-item__footer">` und `<div class="content-agent-actions">` durch ein Öffnungselement `<footer class="content-existing-item__actions content-agent-actions">` ersetzen. Am Ende des Aktionsblocks das korrespondierende schließende `</div>` entfernen; das schließende `</footer>` bleibt bestehen. Insbesondere bleiben die folgenden bestehenden Elemente erhalten:

```ejs
<footer class="content-existing-item__actions content-agent-actions">
  <a class="btn btn-sm btn-outline-secondary" href="/blog/<%= item.slug %>" target="_blank" rel="noopener">Liveartikel öffnen</a>
  <div data-existing-content-primary-action>
    <% if (optimization.active === true) { %>
      <button class="btn btn-sm btn-primary" type="button" disabled><%= optimization.state === 'queued' ? 'Optimierung eingeplant' : 'Optimierung läuft' %></button>
    <% } else if (optimization.revisionUrl) { %>
      <a class="btn btn-sm btn-primary" href="<%= optimization.revisionUrl %>">Revision bearbeiten</a>
    <% } %>
  </div>
</footer>
```

Der Ausschnitt zeigt die unveränderte erste Aktion und zwei vorhandene Primärzustände. Sämtliche weitere bereits implementierte Zweige zwischen `optimization.revisionUrl` und dem abschließenden Jobs-Link werden in derselben Reihenfolge bytegleich übernommen; Sichtbarkeits- und Revisionsformulare bleiben vor `data-existing-content-primary-action` stehen.

- [ ] **Step 5: Fokussierte Rendering- und Aktionsverträge prüfen**

Run:

```bash
node --test --test-name-pattern="Bestandsartikel zeigt Kerndaten kompakt|Bestandszeile|laufende Bestandsoptimierung|unsicherer Providerzustand|deterministischer manueller Bestandsfehler" tests/contentAgentAdminViews.test.js
```

Expected: Der neue Rendering-Test besteht; alle vorhandenen Aktions- und Sicherheitsverträge bestehen weiterhin. Nur der CSS-Vertrag darf bis Task 3 noch scheitern.

- [ ] **Step 6: EJS-Änderung committen**

```bash
git add views/admin/contentAgent/_existingContentItem.ejs tests/contentAgentAdminViews.test.js
git commit -m "feat: Bestandsartikel kompakt strukturieren"
```

### Task 3: Kompaktes responsives Layout gestalten und vollständig verifizieren

**Files:**
- Modify: `public/admin.css:3199-3372`
- Modify (generated): `public/admin.min.css`
- Modify (generated): `public/css-asset-manifest.json`
- Test: `tests/contentAgentAdminViews.test.js`

**Interfaces:**
- Consumes: `.content-existing-item__summary`, `__identity`, `__metric`, `__status`, `__date`, `__actions`, `__details` und `__details-body` aus Task 2.
- Produces: dichtes Desktop-Raster und gestapelte mobile Ansicht ohne horizontalen Seitenüberlauf.

- [ ] **Step 1: Desktop-Raster und kompakte Abstände implementieren**

Die bisherigen großflächigen Kartenregeln durch ein kompaktes Raster ersetzen:

```css
.content-existing-item {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--content-agent-border);
  border-radius: 0.8rem;
  background: #fff;
}

.content-existing-item__summary {
  display: grid;
  grid-template-columns: minmax(18rem, 2fr) minmax(11rem, 0.8fr) minmax(12rem, 0.9fr) auto;
  align-items: center;
  gap: 0.75rem 1rem;
  padding: 0.85rem 1rem;
}

.content-existing-item__identity,
.content-existing-item__metric,
.content-existing-item__status {
  min-width: 0;
}

.content-existing-item__metric,
.content-existing-item__status {
  display: grid;
  gap: 0.2rem;
}

.content-existing-item__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0 1rem 0.8rem;
}
```

- [ ] **Step 2: Detailbereich eindeutig und platzsparend gestalten**

```css
.content-existing-item__details {
  border-top: 1px solid var(--content-agent-border);
}

.content-existing-item__details > summary {
  padding: 0.65rem 1rem;
  cursor: pointer;
  color: var(--content-agent-blue);
  font-weight: 800;
  list-style-position: inside;
}

.content-existing-item__details-hide {
  display: none;
}

.content-existing-item__details[open] > summary .content-existing-item__details-show {
  display: none;
}

.content-existing-item__details[open] > summary .content-existing-item__details-hide {
  display: inline;
}

.content-existing-item__details-body {
  padding: 0 1rem 1rem;
}
```

Die vorhandenen `.content-existing-item__grid`, `.content-existing-item__outcome` und `.content-performance-mini`-Regeln bleiben innerhalb des Detailbereichs nutzbar, erhalten aber keine Außenabstände, die die geschlossene Karte vergrößern.

- [ ] **Step 3: Mobile Darstellung auf eine Spalte umstellen**

Innerhalb des vorhandenen Breakpoints `@media (max-width: 767.98px)` ergänzen:

```css
.content-existing-item__summary {
  grid-template-columns: 1fr;
  align-items: stretch;
  padding: 0.8rem;
}

.content-existing-item__actions,
.content-existing-item__actions form,
.content-existing-item__actions .btn {
  width: 100%;
}

.content-existing-item__actions {
  padding: 0 0.8rem 0.8rem;
}

.content-existing-item__details > summary,
.content-existing-item__details-body {
  padding-right: 0.8rem;
  padding-left: 0.8rem;
}
```

- [ ] **Step 4: Fokussierten Test grün ausführen**

Run:

```bash
node --test --test-name-pattern="Bestandsartikel zeigt Kerndaten kompakt|Bestandsgruppen verwenden" tests/contentAgentAdminViews.test.js
```

Expected: PASS.

- [ ] **Step 5: CSS-Build erzeugen und Manifest aktualisieren**

Run:

```bash
npm run build
```

Expected: Die Ausgabe beginnt mit `CSS assets built:` und meldet `manifest updated.`; Änderungen entstehen ausschließlich an den erwarteten erzeugten CSS-Artefakten.

- [ ] **Step 6: Gesamte Test-Suite und Diff-Hygiene prüfen**

Run:

```bash
npm test
git diff --check
```

Expected: alle Tests bestehen, keine Whitespace-Fehler.

- [ ] **Step 7: Implementierung committen**

```bash
git add public/admin.css public/admin.min.css public/css-asset-manifest.json
git commit -m "style: Bestandsübersicht kompakt darstellen"
```

### Task 4: Abnahmeprüfung

**Files:**
- Verify: `views/admin/contentAgent/_existingContentItem.ejs`
- Verify: `public/admin.css`
- Verify: `tests/contentAgentAdminViews.test.js`

**Interfaces:**
- Consumes: vollständige Implementierung aus Task 1 bis 3.
- Produces: belegte Abnahme gegen die freigegebene Spezifikation.

- [ ] **Step 1: Spezifikationsabdeckung kontrollieren**

Prüfen, dass Kerndaten sichtbar, Details geschlossen, vier Gruppen unverändert, Aktionen erhalten und mobile Regeln vorhanden sind.

- [ ] **Step 2: Finalen Build- und Testnachweis frisch erzeugen**

Run:

```bash
npm run build && npm test && git status --short
```

Expected: Build und Tests erfolgreich; Arbeitsbaum enthält keine unbeabsichtigten Dateien.

- [ ] **Step 3: Browserrisiko dokumentieren**

Wenn keine authentifizierte lokale oder produktive Adminsitzung verfügbar ist, wird ausdrücklich festgehalten, dass die visuelle Browserprüfung noch durch einen angemeldeten Administrator erfolgen muss. Die automatisierten EJS- und CSS-Verträge ersetzen nicht die abschließende reale Sichtkontrolle.
