# Swipe-&-Cook-Datenschutzseite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die vollständigen freigegebenen Datenschutzhinweise für Swipe & Cook unter `/swipeandcook-datenschutz` im bestehenden Komplettwebdesign-Auftritt veröffentlichen.

**Architecture:** Eine neue statische Express-Route rendert eine eigenständige EJS-View und lädt ein seitenbezogenes Stylesheet. Footer-Navigation und Sitemap-Policy verweisen auf die neue URL; ein fokussierter Dateivertragstest sichert Route, Rechtstext, Navigation, CSS und das Fehlen interner Dokumentpfade ab.

**Tech Stack:** Node.js, Express 5, EJS, CSS/PostCSS/cssnano, `node:test`

## Global Constraints

- Die allgemeine Datenschutzerklärung unter `/datenschutz` bleibt unverändert.
- Die neue öffentliche Route lautet exakt `/swipeandcook-datenschutz`.
- Der vollständige freigegebene Rechtstext aus `SwipeAndCook/docs/privacy/swipe-and-cook-datenschutzhinweise-entwurf.md` wird veröffentlicht; die gekürzte Designvorschau ersetzt ihn nicht.
- Interne Dokumentpfade und Hinweise auf interne S0-Bewertungsdateien erscheinen nicht öffentlich.
- Es werden keine Drittanbieter-Skripte, Cookies, Datenbankänderungen oder neuen Abhängigkeiten eingeführt.
- Die Seite nutzt den bestehenden Header, Footer und CSS-Asset-Build.
- Die Umsetzung erfolgt im lokalen Git-Projekt; der VPS wird nur über den vorhandenen Git-/Deployment-Ablauf aktualisiert.

---

## File Structure

- `views/static/swipeandcook-datenschutz.ejs`: vollständiger öffentlicher Rechtstext und semantische Seitenstruktur.
- `public/swipeandcook-privacy.css`: freigegebenes responsives Design für die neue View.
- `public/swipeandcook-privacy.min.css`: durch `npm run build:css` erzeugtes Deployment-Asset.
- `public/css-asset-manifest.json`: durch den CSS-Build aktualisierte Hash-Zuordnung.
- `routes/staticPages.js`: GET-Route, Seitentitel, Beschreibung, Canonical-Pfad und seitenbezogenes CSS.
- `data/siteNavigation.js`: Footer-Link im Bereich „Rechtliches“.
- `helpers/seoPagePolicy.js`: Aufnahme der neuen Datenschutzseite in die statische Sitemap.
- `tests/swipeAndCookPrivacyPage.test.js`: fokussierter Vertragstest für Route, View, Navigation, Sitemap und CSS.

---

### Task 1: Öffentlichen Seitenvertrag testgetrieben festlegen

**Files:**
- Create: `tests/swipeAndCookPrivacyPage.test.js`

**Interfaces:**
- Consumes: `footerNavigation` aus `data/siteNavigation.js` und `INDEXABLE_STATIC_ROUTES` aus `helpers/seoPagePolicy.js`.
- Produces: ausführbarer Vertrag für Route, View, CSS, Footer und Sitemap.

- [ ] **Step 1: Failing contract test schreiben**

```js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { footerNavigation } from '../data/siteNavigation.js';
import { INDEXABLE_STATIC_ROUTES } from '../helpers/seoPagePolicy.js';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

const routes = read('routes/staticPages.js');
const view = read('views/static/swipeandcook-datenschutz.ejs');
const css = read('public/swipeandcook-privacy.css');

test('registers the canonical Swipe & Cook privacy route with its own CSS', () => {
  assert.match(routes, /router\.get\('\/swipeandcook-datenschutz'/);
  assert.match(routes, /res\.render\('static\/swipeandcook-datenschutz'/);
  assert.match(routes, /Swipe & Cook Datenschutz \| Komplett Webdesign/);
  assert.match(routes, /currentPathname:\s*'\/swipeandcook-datenschutz'/);
  assert.match(routes, /extraCssAssets:\s*\['swipeandcook-privacy\.css'\]/);
});

test('publishes the full approved privacy information without internal paths', () => {
  assert.match(view, /Datenschutzhinweise für die App/);
  assert.match(view, /Konto und Anmeldung/);
  assert.match(view, /Rezept- und Nutzungsdaten/);
  assert.match(view, /Sicherheits- und Betriebsprotokolle/);
  assert.match(view, /Supabase/);
  assert.match(view, /Google Ireland Limited/);
  assert.match(view, /Apple Distribution International Limited/);
  assert.match(view, /höchstens zwölf Monate/);
  assert.match(view, /grundsätzlich innerhalb von 30 Tagen/);
  assert.match(view, /kontakt@komplettwebdesign\.de/);
  assert.match(view, /href="\/datenschutz"/);
  assert.doesNotMatch(view, /docs\/privacy|s0-google-apple|Status:\s*Entwurf/i);
});

test('links the page from the legal footer and static sitemap', () => {
  const legal = footerNavigation.find((column) => column.label === 'Rechtliches');
  assert.ok(legal);
  assert.ok(legal.links.some((link) => (
    link.label === 'Swipe & Cook Datenschutz'
    && link.href === '/swipeandcook-datenschutz'
  )));
  assert.ok(INDEXABLE_STATIC_ROUTES.some((route) => (
    route.path === '/swipeandcook-datenschutz'
    && route.changefreq === 'yearly'
    && route.priority === 0.2
  )));
});

test('provides responsive readable styling without third-party assets', () => {
  assert.match(css, /\.swipe-privacy-hero/);
  assert.match(css, /\.swipe-privacy-summary/);
  assert.match(css, /\.swipe-privacy-provider-grid/);
  assert.match(css, /\.swipe-privacy-contact/);
  assert.match(css, /@media\s*\(max-width:\s*640px\)/);
  assert.doesNotMatch(css, /https?:\/\//);
});
```

- [ ] **Step 2: Zieltest ausführen und erwartetes Rot bestätigen**

Run:

```bash
node --test tests/swipeAndCookPrivacyPage.test.js
```

Expected: FAIL, weil View und CSS noch fehlen und die Route noch nicht registriert ist.

---

### Task 2: Route, vollständige View, Navigation und Sitemap implementieren

**Files:**
- Create: `views/static/swipeandcook-datenschutz.ejs`
- Modify: `routes/staticPages.js`
- Modify: `data/siteNavigation.js`
- Modify: `helpers/seoPagePolicy.js`

**Interfaces:**
- Consumes: bestehende Partials `views/partials/head.ejs`, `header.ejs` und `footer.ejs` sowie `extraCssAssets` aus dem Head-Partial.
- Produces: öffentlich renderbare Route `/swipeandcook-datenschutz` mit vollständigem Rechtstext.

- [ ] **Step 1: Statische Route neben `/datenschutz` ergänzen**

```js
router.get('/swipeandcook-datenschutz', (_req, res) => {
  res.render('static/swipeandcook-datenschutz', {
    title: 'Swipe & Cook Datenschutz | Komplett Webdesign',
    description: 'Datenschutzhinweise zur Verarbeitung von Konto-, Anmelde- und Rezeptdaten in der App Swipe & Cook.',
    currentPathname: '/swipeandcook-datenschutz',
    extraCssAssets: ['swipeandcook-privacy.css']
  });
});
```

- [ ] **Step 2: Footer-Link im Bereich „Rechtliches“ ergänzen**

```js
{
  label: 'Rechtliches',
  labelEn: 'Legal',
  links: [
    { label: 'Impressum', labelEn: 'Legal notice', href: '/impressum' },
    { label: 'Datenschutz', labelEn: 'Privacy policy', href: '/datenschutz' },
    { label: 'Swipe & Cook Datenschutz', labelEn: 'Swipe & Cook privacy', href: '/swipeandcook-datenschutz' },
    { label: 'Hinweisseite', labelEn: 'Notes page', href: '/hinweise-rechtstexte-seo-datenschutz' }
  ]
}
```

- [ ] **Step 3: Sitemap-Policy ergänzen**

Direkt nach `/datenschutz` einfügen:

```js
{ path: '/swipeandcook-datenschutz', changefreq: 'yearly', priority: 0.2 },
```

- [ ] **Step 4: Vollständige EJS-View erstellen**

Die View verwendet genau eine `h1`, semantische Abschnitte, Dienstkarten und
einen Kontaktblock. Der interne Satz zur Dateidokumentation der S0-Bewertung
wird durch die öffentliche Drittlandinformation ersetzt.

```ejs
<%- include('../partials/head') %>
<%- include('../partials/header') %>

<main class="swipe-privacy-page" id="main-content">
  <section class="swipe-privacy-hero" aria-labelledby="swipe-privacy-title">
    <div class="container swipe-privacy-hero__inner">
      <p class="swipe-privacy-eyebrow"><span aria-hidden="true"></span>Swipe &amp; Cook</p>
      <h1 id="swipe-privacy-title">Datenschutzhinweise für die App „Swipe &amp; Cook“</h1>
      <p class="swipe-privacy-lead">Wie deine Daten bei Konto, Anmeldung und persönlicher Rezeptnutzung verarbeitet werden.</p>
      <p class="swipe-privacy-date">Stand: 22. Juli 2026</p>
    </div>
  </section>

  <div class="container swipe-privacy-content">
    <aside class="swipe-privacy-summary" aria-label="Kurz zusammengefasst">
      <h2>Kurz zusammengefasst</h2>
      <p>Swipe &amp; Cook nutzt nur die für Anmeldung und App-Funktionen erforderlichen Daten. Passwörter und Google- oder Apple-Tokens werden nicht im eigenen Produktbackend gespeichert.</p>
    </aside>

    <p class="swipe-privacy-intro">Diese Hinweise ergänzen die <a href="/datenschutz">allgemeine Datenschutzerklärung</a>. Die dort genannten Angaben zum Verantwortlichen, zu den Kontaktdaten und zu den allgemeinen Rechten gelten auch für die App „Swipe &amp; Cook“.</p>

    <article class="swipe-privacy-article">
      <section aria-labelledby="swipe-purpose">
        <h2 id="swipe-purpose">1. Wofür Daten verarbeitet werden</h2>
        <h3>Konto und Anmeldung</h3>
        <p>Für Registrierung, Anmeldung und Kontoschutz verarbeitet Swipe &amp; Cook je nach gewählter Methode:</p>
        <ul>
          <li>E-Mail-Adresse beziehungsweise von Apple bereitgestellte Private-Relay-Adresse;</li>
          <li>technischen Provider und eine eindeutige Providerkennung;</li>
          <li>interne, zufällig erzeugte Benutzerkennung;</li>
          <li>Zeitpunkte von Anmeldung, Bestätigung, Verknüpfung, Entfernung und Sitzungsnutzung;</li>
          <li>pseudonymisierte Sicherheitsmerkmale und technische Anfragekennungen.</li>
        </ul>
        <p>Swipe &amp; Cook speichert keine Passwörter und keine Google- oder Apple-Tokens im eigenen Produktbackend. E-Mail-Codes sind sechs Stellen lang, zehn Minuten gültig und werden im eigenen Backend nur als kryptografischer Hash gespeichert.</p>
        <p>Die Verarbeitung ist erforderlich, um das Nutzerkonto und die vereinbarten Anmeldefunktionen bereitzustellen (Art. 6 Abs. 1 Buchst. b DSGVO). Die Missbrauchsabwehr, Protokollierung sicherheitsrelevanter Änderungen und Störungsanalyse beruhen zusätzlich auf dem berechtigten Interesse an einem sicheren und zuverlässigen Betrieb (Art. 6 Abs. 1 Buchst. f DSGVO).</p>

        <h3>Rezept- und Nutzungsdaten</h3>
        <p>Bei der Verwendung der App können persönliche Rezeptaktionen verarbeitet werden, insbesondere Likes, gespeicherte Rezepte, Bewertungen, Feedback, ausgeblendete Rezepte, lokales Archiv, Feed-Nutzung, Kochabschlüsse und Anfragen zur Rezeptgenerierung. Diese Daten werden ausschließlich der internen Benutzerkennung zugeordnet. Die Verarbeitung erfolgt zur Bereitstellung der App-Funktionen nach Art. 6 Abs. 1 Buchst. b DSGVO.</p>

        <h3>Sicherheits- und Betriebsprotokolle</h3>
        <p>Das eigene Backend protokolliert technische Anfragekennungen, Ergebnis- und Fehlerklassen sowie pseudonymisierte Sicherheitsmerkmale. Eigene Anwendungslogs enthalten keine vollständigen E-Mail-Adressen, Einmalcodes, Bearer-/Refresh-Tokens oder vollständigen Providerkennungen. Zweck sind Angriffserkennung, Fehleranalyse, Verfügbarkeit und Nachweis sicherheitsrelevanter Änderungen (Art. 6 Abs. 1 Buchst. f DSGVO).</p>
      </section>

      <section aria-labelledby="swipe-services">
        <h2 id="swipe-services">2. Empfänger und eingesetzte Dienste</h2>
        <div class="swipe-privacy-provider-grid">
          <article class="swipe-privacy-provider"><h3>Supabase</h3><p><strong>Aufgabe:</strong> Authentifizierung und Sitzungsverwaltung; Projektregion Frankfurt.</p><p><strong>Daten:</strong> E-Mail-/Relay-Adresse, Providerkennung, Auth- und Sitzungsmetadaten.</p></article>
          <article class="swipe-privacy-provider"><h3>IONOS</h3><p><strong>Aufgabe:</strong> Betrieb des eigenen App-Backends und der PostgreSQL-Datenbank.</p><p><strong>Daten:</strong> interne Benutzerkennung, Rezept- und Betriebsdaten.</p></article>
          <article class="swipe-privacy-provider"><h3>Manitu</h3><p><strong>Aufgabe:</strong> Versand von Anmelde- und Sicherheits-E-Mails.</p><p><strong>Daten:</strong> Zieladresse, Nachrichteninhalt und Zustellmetadaten.</p></article>
          <article class="swipe-privacy-provider"><h3>Google</h3><p><strong>Aufgabe:</strong> optionale Anmeldung mit Google.</p><p><strong>Daten:</strong> verifizierte E-Mail-Adresse, Google-Kennung sowie bereitgestellte Standard-Profilangaben wie Name und Profilbild.</p></article>
          <article class="swipe-privacy-provider"><h3>Apple</h3><p><strong>Aufgabe:</strong> optionale Anmeldung mit Apple und gegebenenfalls Private Email Relay.</p><p><strong>Daten:</strong> Apple-Kennung und freigegebene E-Mail- oder Relay-Adresse; ein Name wird nicht angefordert.</p></article>
        </div>
        <p>Supabase, IONOS und Manitu werden für die weisungsgebundene Verarbeitung nur nach rechtsverbindlicher Einbeziehung der jeweiligen Auftragsverarbeitungsbedingungen eingesetzt. Google Ireland Limited und Apple Distribution International Limited erbringen den jeweiligen Anmeldedienst in eigener datenschutzrechtlicher Verantwortlichkeit.</p>
        <p>Swipe &amp; Cook fordert bei Google nur die für Supabase Auth erforderlichen Standardbereiche <code>openid</code>, <code>email</code> und <code>profile</code> an; es besteht kein Zugriff auf Gmail, Drive, Kontakte oder andere Google-Inhalte. Bei Apple wird ausschließlich die E-Mail-Adresse angefordert, wobei auch eine Relay-Adresse gewählt werden kann.</p>
        <p>Google und Apple können Providerdaten außerhalb des Europäischen Wirtschaftsraums verarbeiten. Google verweist für erfasste US-Übermittlungen auf das EU-US Data Privacy Framework und ergänzend auf Standardvertragsklauseln. Apple nennt für internationale Übermittlungen aus dem EWR Standardvertragsklauseln.</p>
      </section>

      <section aria-labelledby="swipe-retention">
        <h2 id="swipe-retention">3. Aufbewahrung und Löschung</h2>
        <ul>
          <li>Konto-, Anmelde- und persönliche Rezeptdaten werden grundsätzlich so lange gespeichert, wie das Konto besteht und die jeweilige App-Funktion genutzt wird.</li>
          <li>Pseudonymisierte Sicherheits- und Änderungsereignisse werden höchstens zwölf Monate aufbewahrt. Technisch notwendige aktive Identitätszuordnungen und Tombstones bewusst entfernter Anmeldemethoden bleiben davon unberührt, solange das Konto besteht oder der Konfliktschutz erforderlich ist.</li>
          <li>Eigene Backend- und Betriebslogs werden höchstens 30 Tage aufbewahrt und können durch kapazitätsbedingte Rotation früher entfallen.</li>
          <li>Nach einem bestätigten Löschverlangen wird das Konto für weitere Nutzung gesperrt und die zuordenbaren Daten werden grundsätzlich innerhalb von 30 Tagen gelöscht oder irreversibel anonymisiert, soweit keine gesetzlichen Pflichten oder zwingenden Sicherheitsgründe eine begrenzte weitere Aufbewahrung erfordern.</li>
          <li>Verschlüsselte Datenbanksicherungen werden täglich erstellt und nach 30 Tagen automatisch entfernt. Sie werden nicht erneut produktiv genutzt. Eine Wiederherstellung übernimmt den zu diesem Zeitpunkt gültigen Löschungsstand erneut.</li>
        </ul>
      </section>

      <section aria-labelledby="swipe-rights">
        <h2 id="swipe-rights">4. Rechte und Kontakt</h2>
        <p>Betroffene Personen können insbesondere Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch verlangen. Zur Vermeidung einer unbefugten Herausgabe oder Löschung kann eine angemessene Bestätigung über die im Konto hinterlegte E-Mail- oder Relay-Adresse erforderlich sein. Swipe &amp; Cook fragt dabei niemals nach einem Einmalcode, Passwort, Provider-Token oder privaten Schlüssel.</p>
        <p>Für die Datenverarbeitung innerhalb der Google- oder Apple-Kontodienste können Rechte zusätzlich unmittelbar gegenüber dem jeweiligen Anbieter ausgeübt werden. Das Entfernen einer Anmeldemethode in Swipe &amp; Cook löscht nicht das zugrunde liegende Google- oder Apple-Konto.</p>
        <p>Außerdem besteht das Recht, sich bei einer Datenschutzaufsichtsbehörde zu beschweren. Weitere Angaben stehen in der <a href="/datenschutz">allgemeinen Datenschutzerklärung</a>.</p>
      </section>

      <section aria-labelledby="swipe-changes">
        <h2 id="swipe-changes">5. Änderungen</h2>
        <p>Diese Hinweise werden angepasst, wenn sich Funktionen, Empfänger, Rechtsgrundlagen oder Aufbewahrungsregeln wesentlich ändern. Die jeweils veröffentlichte Fassung enthält ein Aktualisierungsdatum.</p>
      </section>

      <section class="swipe-privacy-contact" aria-labelledby="swipe-contact">
        <h2 id="swipe-contact">Fragen zum Datenschutz?</h2>
        <p>Schreib uns jederzeit an<br><a href="mailto:kontakt@komplettwebdesign.de">kontakt@komplettwebdesign.de</a></p>
      </section>
    </article>
  </div>
</main>

<%- include('../partials/footer') %>
```

- [ ] **Step 5: Vertragstest erneut ausführen**

Run:

```bash
node --test tests/swipeAndCookPrivacyPage.test.js
```

Expected: Der Inhalts-/Route-/Navigationsanteil besteht; der CSS-Anteil bleibt bis Task 3 rot.

---

### Task 3: Freigegebenes responsives Design integrieren

**Files:**
- Create: `public/swipeandcook-privacy.css`
- Create: `public/swipeandcook-privacy.min.css` (generiert)
- Modify: `public/css-asset-manifest.json` (generiert)

**Interfaces:**
- Consumes: Klassen aus `views/static/swipeandcook-datenschutz.ejs` und vorhandene globale Schrift-/Header-/Footer-Styles.
- Produces: eigenständiges, mobil responsives CSS-Asset ohne externe Ressourcen.

- [ ] **Step 1: Seitenbezogenes CSS erstellen**

```css
.swipe-privacy-page {
  --swipe-navy: #071f32;
  --swipe-navy-soft: #0b2a46;
  --swipe-blue: #0b6fc2;
  --swipe-blue-soft: #e9f4fc;
  --swipe-text: #152633;
  --swipe-muted: #60717e;
  --swipe-line: #dbe4ea;
  background: #fff;
  color: var(--swipe-text);
}

.swipe-privacy-hero {
  padding: clamp(5.5rem, 9vw, 8rem) 0 clamp(2.75rem, 5vw, 4.5rem);
  border-bottom: 1px solid var(--swipe-line);
  background: linear-gradient(155deg, #f8fcff 0%, var(--swipe-blue-soft) 100%);
}

.swipe-privacy-hero__inner,
.swipe-privacy-content {
  max-width: 860px;
}

.swipe-privacy-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: .65rem;
  margin: 0 0 1rem;
  color: var(--swipe-blue);
  font-size: .78rem;
  font-weight: 800;
  letter-spacing: .1em;
  text-transform: uppercase;
}

.swipe-privacy-eyebrow span {
  width: .55rem;
  height: .55rem;
  border-radius: 50%;
  background: #4cff00;
  box-shadow: 0 0 0 .28rem rgba(76, 255, 0, .14);
}

.swipe-privacy-hero h1 {
  max-width: 760px;
  margin: 0;
  color: var(--swipe-navy);
  font-size: clamp(2.35rem, 6vw, 4.6rem);
  line-height: 1.04;
  letter-spacing: -.045em;
}

.swipe-privacy-lead {
  max-width: 680px;
  margin: 1.25rem 0 0;
  color: #385162;
  font-size: clamp(1.05rem, 2vw, 1.3rem);
  line-height: 1.55;
}

.swipe-privacy-date {
  margin: 1.25rem 0 0;
  color: var(--swipe-muted);
  font-size: .9rem;
  font-weight: 650;
}

.swipe-privacy-content {
  padding-top: clamp(2rem, 5vw, 4rem);
  padding-bottom: clamp(4rem, 7vw, 7rem);
}

.swipe-privacy-summary {
  margin-bottom: 2rem;
  padding: clamp(1.25rem, 3vw, 1.75rem);
  border: 1px solid #c9e3f5;
  border-radius: 1rem;
  background: #f4faff;
}

.swipe-privacy-summary h2 {
  margin: 0 0 .55rem;
  color: var(--swipe-navy);
  font-size: 1.25rem;
}

.swipe-privacy-summary p,
.swipe-privacy-intro {
  margin: 0;
  color: #3e5667;
  line-height: 1.7;
}

.swipe-privacy-intro {
  margin-bottom: 2.25rem;
}

.swipe-privacy-article > section {
  padding: clamp(2rem, 5vw, 3.5rem) 0;
  border-top: 1px solid var(--swipe-line);
}

.swipe-privacy-article h2,
.swipe-privacy-article h3 {
  color: var(--swipe-navy);
}

.swipe-privacy-article h2 {
  margin: 0 0 1rem;
  font-size: clamp(1.65rem, 3vw, 2.25rem);
  letter-spacing: -.025em;
}

.swipe-privacy-article h3 {
  margin: 1.75rem 0 .65rem;
  font-size: 1.2rem;
}

.swipe-privacy-article p,
.swipe-privacy-article li {
  color: #425766;
  line-height: 1.75;
}

.swipe-privacy-article ul {
  padding-left: 1.3rem;
}

.swipe-privacy-provider-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin: 1.5rem 0 2rem;
}

.swipe-privacy-provider {
  padding: 1.25rem;
  border: 1px solid var(--swipe-line);
  border-radius: .9rem;
  background: #fbfcfd;
}

.swipe-privacy-provider h3 {
  margin: 0 0 .7rem;
}

.swipe-privacy-provider p:last-child {
  margin-bottom: 0;
}

.swipe-privacy-article .swipe-privacy-contact {
  margin-top: 2rem;
  padding: clamp(1.5rem, 4vw, 2.25rem);
  border: 0;
  border-radius: 1rem;
  background: var(--swipe-navy);
}

.swipe-privacy-contact h2,
.swipe-privacy-contact p {
  color: #fff;
}

.swipe-privacy-contact a {
  color: #8ed6ff;
  font-weight: 750;
}

.swipe-privacy-page a:focus-visible {
  outline: 3px solid #4cff00;
  outline-offset: 3px;
}

@media (max-width: 640px) {
  .swipe-privacy-hero {
    padding-top: 4.75rem;
  }

  .swipe-privacy-hero h1 {
    overflow-wrap: anywhere;
    font-size: 2.35rem;
  }

  .swipe-privacy-content {
    padding-inline: 1.1rem;
  }

  .swipe-privacy-provider-grid {
    grid-template-columns: 1fr;
  }

  .swipe-privacy-article p,
  .swipe-privacy-article li {
    font-size: .98rem;
  }
}
```

- [ ] **Step 2: Minifiziertes Asset und Manifest erzeugen**

Run:

```bash
npm run build:css
```

Expected: `CSS assets built` und neue Dateien/Manifest-Einträge für `swipeandcook-privacy.css`.

- [ ] **Step 3: Zieltest vollständig grün ausführen**

Run:

```bash
node --test tests/swipeAndCookPrivacyPage.test.js
```

Expected: 4 Tests, 4 bestanden.

- [ ] **Step 4: Feature committen**

```bash
git add routes/staticPages.js data/siteNavigation.js helpers/seoPagePolicy.js \
  views/static/swipeandcook-datenschutz.ejs public/swipeandcook-privacy.css \
  public/swipeandcook-privacy.min.css public/css-asset-manifest.json \
  tests/swipeAndCookPrivacyPage.test.js
git commit -m "feat: Swipe-and-Cook-Datenschutzseite veröffentlichen"
```

---

### Task 4: Regression, Veröffentlichung und Produktionsprüfung

**Files:**
- Test: `tests/*.test.js`
- Verify: öffentliche URLs

**Interfaces:**
- Consumes: vollständigen Feature-Commit und vorhandenes VPS-Deployment.
- Produces: auf `main` veröffentlichte, öffentlich geprüfte Datenschutzseite ohne Infrastrukturänderung.

- [ ] **Step 1: Vollständige lokale Regression ausführen**

Run:

```bash
npm test
npm run build
git diff --check
git status --short --branch
```

Expected: gesamte Testsuite grün, CSS-Build erfolgreich, keine Whitespace-Fehler, nur erwartete Änderungen beziehungsweise sauberer Arbeitsbaum.

- [ ] **Step 2: Main pushen**

```bash
git push origin main
```

Expected: `main -> main` ohne abgelehnten Push.

- [ ] **Step 3: Vorhandenes kontrolliertes VPS-Deployment starten**

```bash
ssh ionos-vps1 'cd /home/webadmin/apps/komplettwebdesign && ./deploy/deploy.sh'
```

Expected: Deployment, Healthcheck und bestehende Rollback-Sicherung erfolgreich. Es werden keine `.env`-, Compose- oder Datenbankänderungen vorgenommen.

- [ ] **Step 4: Öffentliche Route und allgemeine Datenschutzerklärung prüfen**

```bash
curl -fsS https://www.komplettwebdesign.de/swipeandcook-datenschutz | grep -F 'Datenschutzhinweise für die App'
curl -fsS https://www.komplettwebdesign.de/swipeandcook-datenschutz | grep -F 'kontakt@komplettwebdesign.de'
curl -fsS https://www.komplettwebdesign.de/datenschutz | grep -F 'Datenschutzerklärung'
```

Expected: alle drei Prüfungen liefern den erwarteten Text und Exitcode 0.

- [ ] **Step 5: Mobile Darstellung prüfen**

Die öffentliche URL im Browser bei einer Breite von 390 Pixeln öffnen und verifizieren:

- keine horizontale Scrollleiste;
- vollständige Überschrift;
- einspaltige Dienstkarten;
- lesbare Kontaktadresse;
- Footer-Link „Swipe & Cook Datenschutz“ vorhanden.
