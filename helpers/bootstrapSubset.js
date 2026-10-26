// Schlankes Bootstrap: nur Regeln, deren Klassen irgendwo auf der Website vorkommen.
// Genutzt von scripts/buildBootstrapSubset.mjs (läuft bei `npm run build:css`, auch beim Deploy) und den Tests.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';

import { CONTENT_BOOTSTRAP_CLASSES } from '../data/contentCssClasses.js';

// Hier stehen Templates, Skripte und Inhaltsdaten der öffentlichen Seiten.
// Der Adminbereich (/admin) lädt weiter das komplette Bootstrap (siehe views/partials/head.ejs).
export const BOOTSTRAP_SCAN_DIRS = ['views', 'public/js', 'data', 'controllers', 'services', 'helpers', 'util', 'routes', 'models'];

function isAdminOnlyFile(relativePath) {
  return /^views\/admin\//.test(relativePath)
    || /(^|\/)(branchen_admin_|admin_)[^/]*$/.test(relativePath)
    || /^public\/js\/admin[^/]*$/.test(relativePath);
}

// Klassen, die Bootstraps JavaScript zur Laufzeit setzt (Auf-/Zuklappen, Menüs, Formular-Prüfung).
export const BOOTSTRAP_STATE_CLASSES = [
  'show', 'showing', 'hiding', 'fade', 'collapse', 'collapsing', 'collapsed', 'collapse-horizontal',
  'active', 'disabled', 'dropdown-menu-end', 'dropdown-menu-start', 'dropup', 'dropend', 'dropstart',
  'was-validated', 'is-valid', 'is-invalid', 'valid-feedback', 'invalid-feedback'
];

// Klassen, die Redaktionsinhalte (Blog, Ratgeber) typischerweise nutzen. Bleiben immer erhalten,
// auch wenn sie gerade nirgends vorkommen, damit neue Artikel nicht ungestylt erscheinen.
export const CONTENT_CLASS_PREFIXES = ['table', 'alert', 'img-', 'figure', 'blockquote', 'ratio', 'badge'];

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
    else if (/\.(ejs|js|mjs|html|json)$/.test(name)) files.push(full);
  }
  return files;
}

// Bewusst großzügig: jedes Wort im Code zählt als mögliche Klasse.
export function collectSiteWords(root) {
  const words = new Set([...CONTENT_BOOTSTRAP_CLASSES, ...BOOTSTRAP_STATE_CLASSES]);
  for (const dir of BOOTSTRAP_SCAN_DIRS) {
    for (const file of walk(path.join(root, dir))) {
      if (isAdminOnlyFile(path.relative(root, file).split(path.sep).join('/'))) continue;
      for (const word of readFileSync(file, 'utf8').match(/[A-Za-z0-9_-]+/g) || []) words.add(word);
    }
  }
  return words;
}

function selectorClasses(selector) {
  return [...selector.matchAll(/\.(-?[_a-zA-Z][_a-zA-Z0-9-]*)/g)].map((match) => match[1]);
}

function isKeptClass(name, words) {
  return words.has(name) || CONTENT_CLASS_PREFIXES.some((prefix) => name.startsWith(prefix));
}

export function bootstrapClassNames(css) {
  const names = new Set();
  postcss.parse(css).walkRules((rule) => {
    for (const selector of rule.selectors || []) selectorClasses(selector).forEach((name) => names.add(name));
  });
  return names;
}

export function buildBootstrapSubset(css, words) {
  const root = postcss.parse(css);

  root.walkRules((rule) => {
    if (rule.parent?.type === 'atrule' && /keyframes$/i.test(rule.parent.name)) return;
    const kept = rule.selectors.filter((selector) => selectorClasses(selector).every((name) => isKeptClass(name, words)));
    if (kept.length === 0) rule.remove();
    else if (kept.length !== rule.selectors.length) rule.selectors = kept;
  });

  // Leere @media/@supports-Blöcke entfernen (auch verschachtelte).
  let removed = true;
  while (removed) {
    removed = false;
    root.walkAtRules((atRule) => {
      if (atRule.nodes && atRule.nodes.length === 0) {
        atRule.remove();
        removed = true;
      }
    });
  }

  return root.toString();
}
