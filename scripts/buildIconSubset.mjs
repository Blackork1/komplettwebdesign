// Baut public/assets/css/icons.min.css und fa-solid-900-subset.woff2 nur mit den Icons,
// die im Code (views, public/js, data, …) oder in data/fontAwesomeDbIcons.js vorkommen.
// Statt 113 KB Schrift und 57 KB CSS lädt der Browser so nur einen Bruchteil.
//
// Voraussetzung (nur zum Erzeugen, nicht auf dem Server): pyftsubset aus fonttools
//   python3 -m venv .venv-icons && .venv-icons/bin/pip install fonttools brotli
//   PYFTSUBSET=.venv-icons/bin/pyftsubset npm run build:icons
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildIconCss,
  collectUsedIconClasses,
  iconCodepoint,
  selectUsedIcons,
  splitFontAwesomeCss
} from '../helpers/iconSubset.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cssDir = path.join(root, 'public/assets/css');
const faCss = readFileSync(path.join(cssDir, 'fontawesome.min.css'), 'utf8');
const solidCss = readFileSync(path.join(cssDir, 'solid.min.css'), 'utf8');

const used = collectUsedIconClasses(root);
const { base, icons } = splitFontAwesomeCss(faCss);
const selected = selectUsedIcons(icons, used);
const codepoints = [...new Set(selected.map((icon) => iconCodepoint(icon.value)))].sort((a, b) => a - b);

const work = mkdtempSync(path.join(tmpdir(), 'icon-subset-'));
const fontOut = path.join(cssDir, 'fa-solid-900-subset.woff2');
try {
  execFileSync(process.env.PYFTSUBSET || 'pyftsubset', [
    path.join(cssDir, 'fa-solid-900.woff2'),
    `--unicodes=${codepoints.map((cp) => `U+${cp.toString(16)}`).join(',')}`,
    '--flavor=woff2',
    '--layout-features=',
    '--no-hinting',
    '--desubroutinize',
    `--output-file=${fontOut}`
  ], { stdio: 'inherit' });
} finally {
  rmSync(work, { recursive: true, force: true });
}

const fontHash = createHash('sha256').update(readFileSync(fontOut)).digest('hex').slice(0, 12);
const license = faCss.match(/\/\*![\s\S]*?\*\//)[0];
const css = buildIconCss({
  solidCss,
  base,
  icons: selected,
  fontUrl: `fa-solid-900-subset.woff2?v=${fontHash}`,
  license
});
writeFileSync(path.join(cssDir, 'icons.min.css'), css);

const fontSize = readFileSync(fontOut).length;
console.log(`${selected.length} Icons, ${codepoints.length} Zeichen · Schrift ${(fontSize / 1024).toFixed(1)} KB · CSS ${(css.length / 1024).toFixed(1)} KB`);
