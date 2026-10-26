// Schlanke Font-Awesome-Auslieferung: nur die Icons, die die Website wirklich verwendet.
// Wird von scripts/buildIconSubset.mjs (Erzeugung) und den Tests (Vollständigkeit) genutzt.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

// Ordner, in denen Icon-Klassen vorkommen können (Templates, Skripte, Inhaltsdaten).
export const ICON_SCAN_DIRS = ['views', 'public/js', 'data', 'controllers', 'services', 'helpers', 'util', 'routes', 'models'];

const ICON_TOKEN = /fa-[a-z0-9]+(?:-[a-z0-9]+)*/g;

function walk(dir, files = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return files;
  }
  for (const name of entries) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, files);
    else if (/\.(ejs|js|mjs|html)$/.test(name)) files.push(full);
  }
  return files;
}

export function collectUsedIconClasses(root) {
  const used = new Set();
  for (const dir of ICON_SCAN_DIRS) {
    for (const file of walk(path.join(root, dir))) {
      for (const token of readFileSync(file, 'utf8').match(ICON_TOKEN) || []) used.add(token);
    }
  }
  return used;
}

// Zerlegt fontawesome.min.css in Grundregeln und Icon-Regeln (.fa-x{--fa:"\f123"}).
export function splitFontAwesomeCss(css) {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const iconRule = /([^{}]+)\{--fa:"([^"]+)"\}/g;
  const icons = [];
  let base = '';
  let last = 0;
  for (const match of withoutComments.matchAll(iconRule)) {
    base += withoutComments.slice(last, match.index);
    last = match.index + match[0].length;
    const classes = match[1].split(',').map((selector) => selector.trim().replace(/^\./, ''));
    icons.push({ classes, value: match[2] });
  }
  base += withoutComments.slice(last);
  return { base: base.trim(), icons };
}

export function iconCodepoint(value) {
  // "\f0e7" = Hex-Codepoint, "\#" = maskiertes Zeichen, "X" = Zeichen selbst
  const hex = value.match(/^\\([0-9a-f]+)$/i);
  if (hex) return parseInt(hex[1], 16);
  return value.startsWith('\\') ? value.codePointAt(1) : value.codePointAt(0);
}

export function selectUsedIcons(icons, used) {
  return icons
    .map((icon) => ({ ...icon, classes: icon.classes.filter((name) => used.has(name)) }))
    .filter((icon) => icon.classes.length > 0);
}

export function buildIconCss({ solidCss, base, icons, fontUrl, license }) {
  const fontFace = solidCss
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/src:url\([^)]*\)/, `src:url(${fontUrl}) format("woff2")`)
    .trim();
  const iconRules = icons.map((icon) => `${icon.classes.map((name) => `.${name}`).join(',')}{--fa:"${icon.value}"}`).join('');
  return `${license.trim()}\n${fontFace}${base}${iconRules}\n`;
}
