# Hinweise für KI-Assistenten (Claude, Codex, …)

Diese Datei gilt für jede Arbeit an Inhalten, Templates, Styles und Bildern der Website.
`CLAUDE.md` bindet sie ein, damit Claude Code sie ebenfalls automatisch liest.

## Inhalte erstellen oder ändern

Die öffentlichen Seiten laden aus Performance-Gründen **nicht** das komplette Font Awesome
und **nicht** das komplette Bootstrap, sondern Auszüge mit genau dem, was die Website nutzt.
Wer neue Icons oder Bootstrap-Klassen einführt, muss die Auszüge aktualisieren, sonst fehlt
das Icon bzw. das Element bleibt ungestylt.

### Icons (Font Awesome, `fa-…`)

Ausgeliefert werden `public/assets/css/icons.min.css` und `public/assets/css/fa-solid-900-subset.woff2`.
Beide werden **nicht** automatisch beim Deploy erzeugt.

- **Neues Icon im Code** (views/, public/js, data/, controllers/, services/ …):
  `npm run build:icons` ausführen und die zwei Dateien mit committen.
- **Neues Icon in der Datenbank** (z. B. Leistungsseiten: `leistungen_pages.hero_icons`,
  `services`, `risks_items`; oder ein `<i class="fa-…">` in Blog-/Ratgeber-Inhalten):
  das Icon zusätzlich in `data/fontAwesomeDbIcons.js` eintragen, dann `npm run build:icons`.
  **Ohne diesen Eintrag erscheint das Icon auf der Website nicht, und kein Test bemerkt es**,
  weil die Tests die Datenbank nicht sehen.
- `build:icons` braucht `pyftsubset` (fonttools), nur lokal, nicht auf dem Server:
  `python3 -m venv .venv-icons && .venv-icons/bin/pip install fonttools brotli`, danach
  `PYFTSUBSET=.venv-icons/bin/pyftsubset npm run build:icons`.
- Nur Icons aus Font Awesome 7 **Free, Solid** funktionieren (keine Pro- oder Brand-Icons).

### Bootstrap-Klassen

Öffentliche Seiten laden `public/css/bootstrap-site.css`, erzeugt von
`scripts/buildBootstrapSubset.mjs`. Der Adminbereich (`/admin`) lädt weiter das komplette Bootstrap.

- **Neue Klasse in Templates, Skripten oder Daten im Repo:** wird beim nächsten
  `npm run build:css` automatisch übernommen (läuft auch beim Deploy). Lokal trotzdem
  `npm run build:css` ausführen und `bootstrap-site.css`/`.min.css` mit committen,
  sonst schlägt `tests/pageSpeedMobile.test.js` an.
- **Neue Bootstrap-Klasse nur in Datenbank-Inhalten** (Blog, Ratgeber, Komponenten,
  Branchenseiten): in `data/contentCssClasses.js` eintragen, dann `npm run build:css`.
  Klassen, die mit `table`, `alert`, `img-`, `figure`, `blockquote`, `ratio` oder `badge`
  beginnen, sind immer enthalten.
- Der Content-Agent (Blogartikel) ist abgesichert: Er darf nur die Klassen aus
  `ALLOWED_ARTICLE_CLASSES` in `services/contentAgent/articleHtmlContract.js` verwenden,
  und `<i>`-Icons entfernt der Sanitizer. Wer diese Liste erweitert, braucht nichts weiter
  zu tun, außer `npm run build:css`.

### Bilder

- Bilder als WebP. Große Bilder (breiter als rund 800 px) bekommen kleinere Varianten,
  z. B. `cwebp -q 78 -resize 720 0 bild.webp -o bild-720.webp`, und einen Eintrag in
  `data/responsiveImages.js`. Auf der Startseite erzeugt `responsiveAttrs(...)` daraus
  `srcset`/`sizes`.
- Immer `width`/`height` angeben. Nur das Bild, das als Erstes sichtbar ist, bekommt
  `fetchpriority="high"`, alle anderen `loading="lazy"`.

### Nach Änderungen an CSS

`npm run build:css` ausführen und die erzeugten `.min.css`-Dateien sowie
`public/css-asset-manifest.json` mit committen.

## Tests

`node --test tests/*.test.js`. Der Test „eine doppelte Herbststunde …“ (Sommerzeit) schlägt
bekanntermaßen fehl und hat nichts mit Inhalten zu tun.
