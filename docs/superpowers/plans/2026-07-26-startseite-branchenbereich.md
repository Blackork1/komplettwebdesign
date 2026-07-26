# Startseite Branchenbereich Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Den Branchenbereich der Startseite als vier versetzte, bildgetriebene Branchenwege gestalten und „Handwerk“ durch „Gesundheit & Coaching“ ersetzen.

**Architecture:** Der vorhandene Startseitenabschnitt bleibt an seiner aktuellen Position und erzeugt aus einer lokal im EJS definierten, zweisprachigen Kartenliste vier vollständig klickbare Bildgeschichten. Alle Bilder werden über den vorhandenen Marketingbild-Katalog oder lokale Bestandsmedien ausgeliefert; die Darstellung bleibt CSS-basiert und benötigt kein neues JavaScript.

**Tech Stack:** Node.js 22, EJS, Cheerio, PostCSS, CSS, Node-Test-Runner, vorhandener CSS-Build mit cssnano, Browser-Plugin für visuelle Abnahme.

## Global Constraints

- Es werden keine neuen Branchenseiten erstellt.
- Die Zielpfade sind exakt `/branchen/webdesign-fitnesscoach`, `/branchen/webdesign-immobilienmakler`, `/branchen/webdesign-blumenladen` und `/branchen/webdesign-cafe`.
- Der Startseitenbereich enthält weder den Link `/handwerker` noch die sichtbare Bezeichnung „Handwerk“.
- Deutsch und Englisch werden im gleichen EJS-Abschnitt vollständig ausgegeben.
- Jede Karte verwendet ein anderes lokal ausgeliefertes Bild mit einem konkreten deutschen und englischen Alt-Text.
- Externe Bilder werden als WebP lokal gespeichert und in `docs/media/bildquellen-und-alttexte.md` dokumentiert.
- Die Desktop-Ansicht zeigt vier versetzte Karten, die Tablet-Ansicht ein 2×2-Raster und die Smartphone-Ansicht einen horizontal scrollbaren Scroll-Snap-Bereich.
- Es wird keine neue JavaScript- oder Slider-Abhängigkeit ergänzt.
- Hover- und Fokuszustände sind gleichwertig; `prefers-reduced-motion` schaltet Bild- und Kartenbewegung ab.
- Es wird weder gepusht noch gemergt oder veröffentlicht.

---

## File Map

- `public/images/editorial/gesundheit-coaching.webp`: neues lokales Kartenbild für Gesundheit & Coaching.
- `data/marketingImages.js`: zentrale Bildrolle `industryHealthCoaching` mit Alt-Text und Pexels-Quelle.
- `docs/media/bildquellen-und-alttexte.md`: nachvollziehbarer Bildnachweis.
- `tests/marketingImages.test.js`: Bildrolle, Datei, Quelle und Abgrenzung zu anderen Branchenbildern.
- `views/index.ejs`: zweisprachige Kartendaten und neues semantisches Markup für `#branchenwege`.
- `tests/homepageReachContent.test.js`: gerenderter deutscher und englischer Branchenbereich.
- `public/home.css`: Desktop-, Tablet-, Smartphone-, Fokus- und Bewegungsstile.
- `public/home.min.css`: durch `npm run build` erzeugtes CSS.
- `public/css-asset-manifest.json`: durch `npm run build` aktualisierter Hash.

---

### Task 1: Eigenständiges Bild für Gesundheit & Coaching

**Files:**
- Create: `public/images/editorial/gesundheit-coaching.webp`
- Modify: `data/marketingImages.js`
- Modify: `docs/media/bildquellen-und-alttexte.md`
- Test: `tests/marketingImages.test.js`

**Interfaces:**
- Consumes: `freezeImage(image)` und `PEXELS_LICENSE_URL` aus `data/marketingImages.js`.
- Produces: `MARKETING_IMAGES.industryHealthCoaching` mit `src`, `alt` und `source`.

- [ ] **Step 1: Write the failing image-role test**

In `tests/marketingImages.test.js` ergänzen:

```js
test('der Startseitenweg Gesundheit und Coaching besitzt ein eigenständiges dokumentiertes Foto', () => {
  const image = MARKETING_IMAGES.industryHealthCoaching;

  assert.ok(image, 'Bildrolle industryHealthCoaching fehlt');
  assert.equal(image.src, '/images/editorial/gesundheit-coaching.webp');
  assert.match(image.alt, /Trainerin|Trainer|Training|Coaching/i);
  assert.equal(image.source.creator, 'Julia Larson');
  assert.equal(
    image.source.pageUrl,
    'https://www.pexels.com/photo/black-woman-training-on-gym-equipment-while-trainer-helping-6455895/'
  );
  assert.notEqual(image.src, MARKETING_IMAGES.industryFlorist.src);
  assert.notEqual(image.src, MARKETING_IMAGES.industryRealEstate.src);
  assert.equal(existsSync(new URL(`.${image.src}`, PUBLIC_ROOT)), true);
});
```

- [ ] **Step 2: Run the test and verify the expected failure**

Run:

```bash
node --test tests/marketingImages.test.js --test-name-pattern="Gesundheit und Coaching"
```

Expected: FAIL with `Bildrolle industryHealthCoaching fehlt`.

- [ ] **Step 3: Download and convert the selected Pexels image**

Use the Pexels original associated with photo `6455895`, crop it consistently for the portrait cards and remove the temporary download:

```bash
curl -L 'https://images.pexels.com/photos/6455895/pexels-photo-6455895.jpeg?auto=compress&cs=tinysrgb&w=1600' \
  -o /tmp/gesundheit-coaching-pexels.jpg
magick /tmp/gesundheit-coaching-pexels.jpg \
  -auto-orient \
  -resize '1200x1500^' \
  -gravity center \
  -extent 1200x1500 \
  -quality 80 \
  public/images/editorial/gesundheit-coaching.webp
rm /tmp/gesundheit-coaching-pexels.jpg
identify public/images/editorial/gesundheit-coaching.webp
```

Expected: `WEBP 1200x1500` and a file size below 250 KB. Inspect the generated file with `view_image`; the trainer-client interaction must remain clearly recognizable after the crop.

- [ ] **Step 4: Add the central image role**

Add this entry next to the existing industry images in `data/marketingImages.js`:

```js
industryHealthCoaching: freezeImage({
  src: '/images/editorial/gesundheit-coaching.webp',
  alt: 'Personal Trainer unterstützt eine Kundin beim begleiteten Training im Fitnessstudio',
  source: {
    kind: 'external',
    provider: 'Pexels',
    creator: 'Julia Larson',
    pageUrl: 'https://www.pexels.com/photo/black-woman-training-on-gym-equipment-while-trainer-helping-6455895/',
    licenseUrl: PEXELS_LICENSE_URL
  }
}),
```

Add `'industryHealthCoaching'` to `REQUIRED_VISUAL_ROLES`.

- [ ] **Step 5: Document the image source**

Append this row to the external-image table in `docs/media/bildquellen-und-alttexte.md`:

```markdown
| `/images/editorial/gesundheit-coaching.webp` | Startseite, Branchenweg Gesundheit & Coaching | Julia Larson | [Black woman training on gym equipment while trainer helping](https://www.pexels.com/photo/black-woman-training-on-gym-equipment-while-trainer-helping-6455895/) | Personal Trainer unterstützt eine Kundin beim begleiteten Training im Fitnessstudio |
```

- [ ] **Step 6: Run the image tests**

Run:

```bash
node --test tests/marketingImages.test.js
```

Expected: all tests PASS, including uniqueness, local delivery and complete Pexels attribution.

- [ ] **Step 7: Commit the image unit**

```bash
git add public/images/editorial/gesundheit-coaching.webp data/marketingImages.js docs/media/bildquellen-und-alttexte.md tests/marketingImages.test.js
git commit -m "feat: Bild für Gesundheit und Coaching ergänzen"
```

---

### Task 2: Vier zweisprachige Branchenwege rendern

**Files:**
- Modify: `views/index.ejs`
- Modify: `tests/homepageReachContent.test.js`

**Interfaces:**
- Consumes: `isEn` und `homeMarketingImages` aus dem bestehenden EJS-Kontext.
- Produces: `#branchenwege` mit vier `.home-industry-story`-Links und `.home-industry-overview-link`.

- [ ] **Step 1: Add helpers that render the real EJS section**

Add these imports and helpers to `tests/homepageReachContent.test.js`:

```js
import { load } from 'cheerio';
import { render } from 'ejs';
import { MARKETING_IMAGES } from '../data/marketingImages.js';

function getIndustrySectionTemplate() {
  const section = template.match(
    /<section class="section" id="branchenwege"[\s\S]*?<\/section>/
  )?.[0];
  assert.ok(section, 'Branchenbereich fehlt');
  return section;
}

function renderIndustrySection(lng = 'de') {
  return render(getIndustrySectionTemplate(), {
    isEn: lng === 'en',
    homeMarketingImages: MARKETING_IMAGES
  });
}
```

- [ ] **Step 2: Replace the existing source-only industry test with failing rendered tests**

Use these two tests:

```js
test('die Startseite rendert vier vorhandene Branchenpfade ohne Handwerk', () => {
  const $ = load(renderIndustrySection('de'));
  const cards = $('#branchenwege .home-industry-story');

  assert.equal(cards.length, 4);
  assert.deepEqual(
    cards.map((_index, element) => $(element).attr('href')).get(),
    [
      '/branchen/webdesign-fitnesscoach',
      '/branchen/webdesign-immobilienmakler',
      '/branchen/webdesign-blumenladen',
      '/branchen/webdesign-cafe'
    ]
  );
  assert.equal($('#branchenwege a[href="/handwerker"]').length, 0);
  assert.doesNotMatch($('#branchenwege').text(), /\bHandwerk\b/i);
  assert.equal($('#branchenwege img').length, 4);
  assert.ok($('#branchenwege img').toArray().every((image) => $(image).attr('alt')?.trim()));
  assert.equal(
    $('#branchenwege .home-industry-overview-link').attr('href'),
    '/branchen'
  );
});

test('der englische Branchenbereich enthält vollständig englische Beschriftungen', () => {
  const $ = load(renderIndustrySection('en'));
  const text = $('#branchenwege').text().replace(/\s+/g, ' ').trim();

  assert.equal(
    $('#home-industry-title').text().trim(),
    'Four industries. Four different paths to an enquiry.'
  );
  assert.match(text, /Health & Coaching/);
  assert.match(text, /Real Estate/);
  assert.match(text, /Florists/);
  assert.match(text, /Cafés & Hospitality/);
  assert.match(text, /Compare all industry solutions/);
  assert.doesNotMatch(text, /Branchenlösungen|Gesundheit|Immobilien|Blumenladen|Öffnungszeiten/);
});
```

- [ ] **Step 3: Run the rendered tests and verify failure**

Run:

```bash
node --test tests/homepageReachContent.test.js --test-name-pattern="Branchenpfade|englische Beschriftungen"
```

Expected: FAIL because `.home-industry-story` does not exist, `/handwerker` is still rendered and the English section still contains German card text.

- [ ] **Step 4: Define the localized section data inside `#branchenwege`**

At the beginning of the section in `views/index.ejs`, add:

```ejs
<%
const homeIndustryCopy = isEn ? {
  kicker: 'Industry solutions',
  title: 'Four industries. Four different paths to an enquiry.',
  lead: 'Every industry needs different content, images and contact paths. Choose the entry point closest to your offer.',
  overview: 'Compare all industry solutions',
  scrollHint: 'Swipe to explore all industries'
} : {
  kicker: 'Branchenlösungen',
  title: 'Vier Branchen. Vier unterschiedliche Wege zur Anfrage.',
  lead: 'Jede Branche braucht andere Inhalte, Bilder und Kontaktwege. Wähle den Einstieg, der deinem Angebot am nächsten kommt.',
  overview: 'Alle Branchenlösungen vergleichen',
  scrollHint: 'Wischen, um alle Branchen zu entdecken'
};

const homeIndustryStories = [
  {
    number: '01',
    href: '/branchen/webdesign-fitnesscoach',
    name: isEn ? 'Health & Coaching' : 'Gesundheit & Coaching',
    detail: isEn ? 'Trust, services and appointment paths' : 'Vertrauen, Angebote und Terminwege',
    image: homeMarketingImages.industryHealthCoaching,
    imageAlt: isEn
      ? 'Personal trainer supporting a client during guided exercise in a gym'
      : homeMarketingImages.industryHealthCoaching.alt
  },
  {
    number: '02',
    href: '/branchen/webdesign-immobilienmakler',
    name: isEn ? 'Real Estate' : 'Immobilien',
    detail: isEn ? 'Region, properties and personal advice' : 'Region, Objekte und persönliche Beratung',
    image: homeMarketingImages.industryRealEstate,
    imageAlt: isEn
      ? 'Real estate agent discussing property documents with clients'
      : homeMarketingImages.industryRealEstate.alt
  },
  {
    number: '03',
    href: '/branchen/webdesign-blumenladen',
    name: isEn ? 'Florists' : 'Blumenladen',
    detail: isEn ? 'Products, seasons and local presence' : 'Sortiment, Saison und lokaler Standort',
    image: homeMarketingImages.industryFlorist,
    imageAlt: isEn
      ? 'Florist arranging a colourful selection of flowers'
      : homeMarketingImages.industryFlorist.alt
  },
  {
    number: '04',
    href: '/branchen/webdesign-cafe',
    name: isEn ? 'Cafés & Hospitality' : 'Café & Gastronomie',
    detail: isEn ? 'Atmosphere, opening hours and reservations' : 'Atmosphäre, Öffnungszeiten und Reservierung',
    image: {
      src: '/images/cafe-min.webp',
      source: { kind: 'own', provider: 'Komplett Webdesign' }
    },
    imageAlt: isEn
      ? 'Welcoming café interior with a clearly visible hospitality offer'
      : 'Café mit einladender Atmosphäre und sichtbarem gastronomischem Angebot'
  }
];
%>
```

- [ ] **Step 5: Replace the old heading, cards and note with the story markup**

Keep the existing section, container and wrapper hierarchy. Replace the content inside `.inner-wrapper` with:

```ejs
<div class="home-industry-intro">
  <span class="home-section-kicker">
    <i class="fas fa-map-signs" aria-hidden="true"></i><%= homeIndustryCopy.kicker %>
  </span>
  <h2 id="home-industry-title"><%= homeIndustryCopy.title %></h2>
  <p class="home-section-lead"><%= homeIndustryCopy.lead %></p>
</div>

<div class="home-industry-stories" aria-labelledby="home-industry-title">
  <% homeIndustryStories.forEach((story) => { %>
    <a
      class="home-industry-story animate-on-scroll"
      href="<%= story.href %>"
      aria-label="<%= `${story.name}: ${story.detail}` %>"
    >
      <figure class="home-industry-story__media">
        <img
          src="<%= story.image.src %>"
          alt="<%= story.imageAlt %>"
          width="720"
          height="900"
          loading="lazy"
          decoding="async"
        >
        <% if (story.image.source?.kind === 'external') { %>
          <figcaption>Bild: <%= story.image.source.creator %> / <%= story.image.source.provider %></figcaption>
        <% } %>
      </figure>
      <span class="home-industry-story__number" aria-hidden="true"><%= story.number %></span>
      <div class="home-industry-story__copy">
        <h3><%= story.name %></h3>
        <p><%= story.detail %></p>
        <span class="home-industry-story__arrow" aria-hidden="true">→</span>
      </div>
    </a>
  <% }); %>
</div>

<p class="home-industry-scroll-hint">
  <span aria-hidden="true">↔</span> <%= homeIndustryCopy.scrollHint %>
</p>

<div class="home-industry-actions">
  <a class="btn btn-secondary home-industry-overview-link" href="/branchen">
    <%= homeIndustryCopy.overview %>
  </a>
</div>
```

Do not place source links inside the fully clickable cards; that would create invalid nested anchors. The linked source URLs remain in the media documentation.

- [ ] **Step 6: Run the rendered homepage tests**

Run:

```bash
node --test tests/homepageReachContent.test.js
```

Expected: all tests PASS and the existing section-order test remains unchanged.

- [ ] **Step 7: Commit the rendered content**

```bash
git add views/index.ejs tests/homepageReachContent.test.js
git commit -m "feat: Branchenwege der Startseite neu strukturieren"
```

---

### Task 3: Bildgeschichten gestalten und vollständig verifizieren

**Files:**
- Modify: `public/home.css`
- Modify: `tests/homepageReachContent.test.js`
- Modify after build: `public/home.min.css`
- Modify after build: `public/css-asset-manifest.json`

**Interfaces:**
- Consumes: `.home-industry-stories`, `.home-industry-story`, `.home-industry-story__media`, `.home-industry-story__number`, `.home-industry-story__copy`, `.home-industry-scroll-hint` and `.home-industry-actions` from Task 2.
- Produces: four-column staggered desktop layout, two-column tablet layout and native horizontal mobile scroll.

- [ ] **Step 1: Add a failing responsive CSS contract test**

Append to `tests/homepageReachContent.test.js`:

```js
test('die vier Bildgeschichten wechseln von Desktop-Rhythmus zu mobilem Scroll-Snap', () => {
  const css = readFileSync(new URL('../public/home.css', import.meta.url), 'utf8');

  assert.match(
    css,
    /\.home-industry-stories\s*\{[\s\S]*?grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\);/
  );
  assert.match(
    css,
    /\.home-industry-story:nth-child\(even\)\s*\{[\s\S]*?margin-top:\s*28px;/
  );
  assert.match(
    css,
    /@media \(max-width:\s*900px\)[\s\S]*?\.home-industry-stories\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/
  );
  assert.match(
    css,
    /@media \(max-width:\s*640px\)[\s\S]*?\.home-industry-stories\s*\{[\s\S]*?display:\s*flex;[\s\S]*?overflow-x:\s*auto;[\s\S]*?scroll-snap-type:\s*x mandatory;/
  );
  assert.match(
    css,
    /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.home-industry-story[\s\S]*?transition:\s*none\s*!important;/
  );
});
```

- [ ] **Step 2: Run the CSS test and verify failure**

Run:

```bash
node --test tests/homepageReachContent.test.js --test-name-pattern="Bildgeschichten"
```

Expected: FAIL because the old `.home-industry-grid` and `.home-industry-card` styles still exist.

- [ ] **Step 3: Replace the old industry-card CSS**

Remove the existing block from `.home-page .home-industry-grid` through its `@media (max-width: 560px)` rules. Insert:

```css
.home-page #branchenwege {
  background:
    radial-gradient(circle at 12% 12%, rgba(233, 74, 27, 0.08), transparent 28%),
    linear-gradient(180deg, #f7f9fc 0%, #ffffff 100%) !important;
}

.home-page .home-industry-intro {
  max-width: 820px;
}

.home-page .home-industry-intro > .home-section-kicker,
.home-page .home-industry-intro > .home-section-lead,
.home-page .home-industry-intro > h2 {
  justify-content: flex-start;
  margin-left: 0;
  margin-right: 0;
  text-align: left;
}

.home-page .home-industry-stories {
  display: grid;
  gap: clamp(12px, 1.8vw, 20px);
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-top: clamp(28px, 4vw, 48px);
}

.home-page .home-industry-story {
  aspect-ratio: 3 / 4;
  border: 1px solid rgba(11, 42, 70, 0.12);
  border-radius: 22px;
  box-shadow: 0 20px 46px rgba(11, 42, 70, 0.12);
  color: #ffffff;
  isolation: isolate;
  min-height: 0;
  overflow: hidden;
  position: relative;
  scroll-snap-align: start;
  text-decoration: none;
  transition: border-color 180ms ease, box-shadow 220ms ease, transform 220ms ease;
}

.home-page .home-industry-story:nth-child(even) {
  margin-top: 28px;
}

.home-page .home-industry-story::after {
  background: linear-gradient(180deg, rgba(5, 20, 33, 0.02) 24%, rgba(5, 20, 33, 0.9) 100%);
  content: "";
  inset: 0;
  pointer-events: none;
  position: absolute;
  z-index: 0;
}

.home-page .home-industry-story:is(:hover, :focus-visible) {
  border-color: rgba(233, 74, 27, 0.72);
  box-shadow: 0 28px 64px rgba(11, 42, 70, 0.2);
  color: #ffffff;
  outline: 3px solid rgba(233, 74, 27, 0.24);
  outline-offset: 4px;
  transform: translateY(-6px);
}

.home-page .home-industry-story__media,
.home-page .home-industry-story__media img {
  height: 100%;
  inset: 0;
  position: absolute;
  width: 100%;
}

.home-page .home-industry-story__media img {
  object-fit: cover;
  transition: transform 300ms ease;
}

.home-page .home-industry-story:is(:hover, :focus-visible) .home-industry-story__media img {
  transform: scale(1.035);
}

.home-page .home-industry-story__media figcaption {
  background: rgba(5, 20, 33, 0.7);
  color: rgba(255, 255, 255, 0.86);
  font-size: 0.65rem;
  left: 12px;
  padding: 5px 7px;
  position: absolute;
  top: 12px;
  z-index: 2;
}

.home-page .home-industry-story__number {
  align-items: center;
  background: rgba(11, 42, 70, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.46);
  border-radius: 50%;
  color: #ffffff;
  display: inline-flex;
  font-size: 0.74rem;
  font-weight: 900;
  height: 38px;
  justify-content: center;
  position: absolute;
  right: 14px;
  top: 14px;
  width: 38px;
  z-index: 2;
}

.home-page .home-industry-story__copy {
  bottom: 0;
  display: grid;
  gap: 7px;
  left: 0;
  padding: clamp(18px, 2vw, 26px);
  position: absolute;
  right: 0;
  z-index: 2;
}

.home-page .home-industry-story__copy h3,
.home-page .home-industry-story__copy p {
  color: #ffffff;
  margin: 0;
}

.home-page .home-industry-story__copy h3 {
  font-size: clamp(1.12rem, 1.7vw, 1.45rem);
  line-height: 1.16;
}

.home-page .home-industry-story__copy p {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
  line-height: 1.45;
}

.home-page .home-industry-story__arrow {
  color: #ff9b7d;
  font-size: 1.35rem;
  font-weight: 900;
  justify-self: end;
  line-height: 1;
}

.home-page .home-industry-scroll-hint {
  color: var(--home-muted);
  display: none;
  font-size: 0.82rem;
  font-weight: 750;
  margin: 12px 0 0;
}

.home-page .home-industry-actions {
  display: flex;
  justify-content: flex-start;
  margin-top: clamp(38px, 6vw, 66px);
}

.home-page .home-industry-overview-link {
  margin: 0;
}

@media (max-width: 900px) {
  .home-page .home-industry-stories {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .home-page .home-industry-story:nth-child(even) {
    margin-top: 0;
  }

  .home-page .home-industry-actions {
    margin-top: 28px;
  }
}

@media (max-width: 640px) {
  .home-page .home-industry-stories {
    display: flex;
    gap: 14px;
    margin-left: -16px;
    margin-right: -16px;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    padding: 4px 16px 18px;
    scroll-padding-inline: 16px;
    scroll-snap-type: x mandatory;
    scrollbar-color: var(--home-accent) rgba(11, 42, 70, 0.1);
    scrollbar-width: thin;
    -webkit-overflow-scrolling: touch;
  }

  .home-page .home-industry-story {
    flex: 0 0 min(82vw, 320px);
  }

  .home-page .home-industry-scroll-hint {
    align-items: center;
    display: flex;
    gap: 7px;
  }

  .home-page .home-industry-actions {
    margin-top: 24px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-page .home-industry-story,
  .home-page .home-industry-story__media img {
    transition: none !important;
  }
}
```

- [ ] **Step 4: Run targeted tests and build**

Run:

```bash
node --test tests/homepageReachContent.test.js tests/marketingImages.test.js tests/homepagePrompt3.test.js
npm run build
git diff --check
```

Expected: all targeted tests PASS, the build exits `0`, `public/home.min.css` and `public/css-asset-manifest.json` contain the new asset hash, and `git diff --check` prints nothing.

- [ ] **Step 5: Run the complete project test suite**

Run:

```bash
OPENAI_API_KEY='test-only-not-a-real-key' npm test
```

Expected: `0 fail`; environment-dependent tests may remain explicitly skipped.

- [ ] **Step 6: Verify the real homepage in the Browser plugin**

The flow under test is:

```text
http://localhost:3000/
→ zu #branchenwege scrollen
→ vier Bildgeschichten und den angeschnittenen mobilen Folgeschritt prüfen
→ „Gesundheit & Coaching“ öffnen
→ /branchen/webdesign-fitnesscoach erreicht
→ zur Startseite zurückkehren
```

Required checks:

1. URL and title identify the homepage.
2. DOM snapshot contains the four exact industry links and no `/handwerker` inside `#branchenwege`.
3. No framework error overlay or blank page.
4. Browser console contains no relevant warnings or errors.
5. Desktop screenshot shows four equal photo cards with cards `02` and `04` offset.
6. Narrow screenshot shows native horizontal scrolling, a visible next card and the swipe hint.
7. The first card navigates to `/branchen/webdesign-fitnesscoach`.
8. Keyboard focus on a card has a visible outline.

Use the Browser plugin first. Do not fall back to standalone Playwright unless the user explicitly authorizes the fallback after a Browser invocation failure.

- [ ] **Step 7: Commit styles and generated assets**

```bash
git add public/home.css public/home.min.css public/css-asset-manifest.json tests/homepageReachContent.test.js
git commit -m "feat: Branchenbereich als Bildgeschichten gestalten"
```

- [ ] **Step 8: Confirm the branch remains local**

Run:

```bash
git status --short
git log -4 --oneline
```

Expected: clean worktree with the image, markup and styling commits at the branch tip. Do not run `git push`, merge or deployment commands.
