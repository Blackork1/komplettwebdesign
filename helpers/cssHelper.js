// helpers/cssHelper.js
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ESM: __dirname ermitteln
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function getCssClasses() {
  try {
    // Korrekter Pfad zu public/styles.css
    const cssPath = join(__dirname, '..', 'public', 'styles.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    // Regex: erlaubt escaped Doppelpunkte (\:), Slashes usw.
    const regex = /\.([\w\-\:\\/]+)\s*\{/g;
    const classes = new Set();
    let match;
    while ((match = regex.exec(css)) !== null) {
      // Backslashes aus den Klassennamen entfernen
      classes.add(match[1].replace(/\\/g, ''));
    }
    return Array.from(classes).sort();
  } catch {
    return [];
  }
}

export function getAvailableCssFiles() {
  const cssDir = join(__dirname, '..', 'public');
  try {
    // Verzeichnis der CSS-Dateien
    return fs
    .readdirSync(cssDir)
    .filter(f => f.toLocaleLowerCase().endsWith('.css') && !f.toLocaleLowerCase().endsWith('.min.css'))
  } catch (error) {
    console.error('Fehler beim Lesen des CSS-Verzeichnisses:', error);
    return [];
  }
}

export function loadCssAssetManifest() {
  const manifestPath = join(__dirname, '..', 'public', 'css-asset-manifest.json');
  try {
    const raw = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(raw);
    return manifest && typeof manifest === 'object' ? manifest : { assets: {} };
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.warn('CSS asset manifest fehlt. Bitte "npm run build:css" vor dem Serverstart ausfuehren.');
    } else {
      console.warn('CSS asset manifest konnte nicht gelesen werden:', error.message);
    }
    return { assets: {} };
  }
}

function normalizeCssAssetPath(file) {
  return String(file || '')
    .split('?')[0]
    .split('#')[0]
    .replace(/^\/+/, '')
    .replace(/\\/g, '/');
}

export function createCssAssetResolver(manifest = loadCssAssetManifest()) {
  const manifestPath = join(__dirname, '..', 'public', 'css-asset-manifest.json');
  let currentManifest = manifest;
  let currentMtimeMs = 0;
  let assets = currentManifest?.assets && typeof currentManifest.assets === 'object'
    ? currentManifest.assets
    : {};
  const warned = new Set();

  try {
    currentMtimeMs = fs.statSync(manifestPath).mtimeMs;
  } catch {}

  function refreshManifestIfChanged() {
    try {
      const nextMtimeMs = fs.statSync(manifestPath).mtimeMs;
      if (nextMtimeMs === currentMtimeMs) return;

      currentMtimeMs = nextMtimeMs;
      currentManifest = loadCssAssetManifest();
      assets = currentManifest?.assets && typeof currentManifest.assets === 'object'
        ? currentManifest.assets
        : {};
      warned.clear();
    } catch {}
  }

  return function cssAsset(file) {
    refreshManifestIfChanged();
    const normalized = normalizeCssAssetPath(file);
    const asset = assets[normalized];

    if (asset?.href) {
      return asset.href;
    }

    if (!warned.has(normalized)) {
      warned.add(normalized);
      console.warn(`CSS asset fehlt im Manifest: ${normalized}. Bitte "npm run build:css" ausfuehren.`);
    }

    return `/${normalized}`;
  };
}

export function validateCssAssetManifest(manifest = loadCssAssetManifest(), requiredSources = []) {
  const publicDir = join(__dirname, '..', 'public');
  const assets = manifest?.assets && typeof manifest.assets === 'object'
    ? manifest.assets
    : {};
  const entries = Object.values(assets);

  if (!entries.length) {
    console.warn('CSS asset manifest enthaelt keine Eintraege. CSS-Cache-Busting ist bis zum naechsten Build nicht aktiv.');
    return;
  }

  entries.forEach((asset) => {
    if (!asset?.output) return;
    const outputPath = join(publicDir, asset.output);
    if (!fs.existsSync(outputPath)) {
      console.warn(`Minifizierte CSS-Datei fehlt: public/${asset.output}. Bitte "npm run build:css" ausfuehren.`);
    }
  });

  requiredSources.forEach((source) => {
    const normalized = normalizeCssAssetPath(source);
    if (!assets[normalized]) {
      console.warn(`CSS-Quelle fehlt im Manifest: ${normalized}. Bitte Datei pruefen und "npm run build:css" ausfuehren.`);
    }
  });
}
