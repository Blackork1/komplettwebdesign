// Erzeugt public/css/bootstrap-site.css: Bootstrap nur mit den Regeln, die die Website nutzt
// (statt 33 KB rund ein Viertel davon, blockiert das erste Rendern also deutlich kürzer).
// Läuft automatisch vor dem CSS-Build (`npm run build:css`), auch beim Deploy im Dockerfile.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildBootstrapSubset, collectSiteWords } from '../helpers/bootstrapSubset.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(path.join(root, 'public/css/bootstrap.min.css'), 'utf8');
const subset = buildBootstrapSubset(source, collectSiteWords(root));
const header = '/* Automatisch erzeugt von scripts/buildBootstrapSubset.mjs aus bootstrap.min.css. Nicht von Hand bearbeiten. */\n';
writeFileSync(path.join(root, 'public/css/bootstrap-site.css'), header + subset);
console.log(`Bootstrap-Auszug: ${(subset.length / 1024).toFixed(1)} KB von ${(source.length / 1024).toFixed(1)} KB`);
