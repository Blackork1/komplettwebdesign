// helpers/cssHelper.js
import fs from 'fs';
import { createHash } from 'crypto';
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

export function loadCssAssetManifest(manifestPath = join(__dirname, '..', 'public', 'css-asset-manifest.json')) {
  try {
    const raw = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(raw);
    return manifest && typeof manifest === 'object' ? manifest : { assets: {} };
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.warn('CSS-Asset-Manifest fehlt. Bitte "npm run build:css" vor dem Serverstart ausführen.');
    } else {
      console.warn('CSS-Asset-Manifest konnte nicht gelesen werden:', error.message);
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

function createAssetVersion(publicDir, fallbackVersion = '1', extraFiles = {}) {
  const cache = new Map();

  return function asset(file) {
    const normalized = normalizeCssAssetPath(file);
    const output = `/${normalized}`;
    const fallback = encodeURIComponent(fallbackVersion || '1');

    if (!normalized || normalized.includes('..')) {
      return `${output}?v=${fallback}`;
    }

    const assetPath = extraFiles[normalized] || join(publicDir, normalized);

    try {
      const stat = fs.statSync(assetPath);
      if (!stat.isFile()) {
        return `${output}?v=${fallback}`;
      }

      const cacheKey = `${stat.mtimeMs}:${stat.size}`;
      const cached = cache.get(normalized);
      if (cached?.cacheKey === cacheKey) {
        return `${output}?v=${cached.version}`;
      }

      const version = createHash('sha256')
        .update(fs.readFileSync(assetPath))
        .digest('hex')
        .slice(0, 12);

      cache.set(normalized, { cacheKey, version });
      return `${output}?v=${version}`;
    } catch {
      return `${output}?v=${fallback}`;
    }
  };
}

export function createPublicAssetResolver({
  publicDir = join(__dirname, '..', 'public'),
  fallbackVersion = '1',
  extraFiles = {}
} = {}) {
  return createAssetVersion(publicDir, fallbackVersion, extraFiles);
}

export function createCssAssetResolver(manifest = loadCssAssetManifest(), {
  publicDir = join(__dirname, '..', 'public'),
  preferSource = false,
  fallbackVersion = '1'
} = {}) {
  const manifestPath = join(publicDir, 'css-asset-manifest.json');
  let currentManifest = manifest;
  let currentMtimeMs = 0;
  let assets = currentManifest?.assets && typeof currentManifest.assets === 'object'
    ? currentManifest.assets
    : {};
  const warned = new Set();
  const publicAsset = createPublicAssetResolver({ publicDir, fallbackVersion });

  try {
    currentMtimeMs = fs.statSync(manifestPath).mtimeMs;
  } catch {}

  function refreshManifestIfChanged() {
    try {
      const nextMtimeMs = fs.statSync(manifestPath).mtimeMs;
      if (nextMtimeMs === currentMtimeMs) return;

      currentMtimeMs = nextMtimeMs;
      currentManifest = loadCssAssetManifest(manifestPath);
      assets = currentManifest?.assets && typeof currentManifest.assets === 'object'
        ? currentManifest.assets
        : {};
      warned.clear();
    } catch {}
  }

  return function cssAsset(file) {
    refreshManifestIfChanged();
    const normalized = normalizeCssAssetPath(file);
    const sourcePath = join(publicDir, normalized);

    if (preferSource && fs.existsSync(sourcePath)) {
      return publicAsset(normalized);
    }

    const manifestAsset = assets[normalized];

    if (manifestAsset?.href) {
      return manifestAsset.href;
    }

    if (!warned.has(normalized)) {
      warned.add(normalized);
      console.warn(`CSS-Asset fehlt im Manifest: ${normalized}. Bitte "npm run build:css" ausführen.`);
    }

    return publicAsset(normalized);
  };
}

export function validateCssAssetManifest(manifest = loadCssAssetManifest(), requiredSources = []) {
  const publicDir = join(__dirname, '..', 'public');
  const assets = manifest?.assets && typeof manifest.assets === 'object'
    ? manifest.assets
    : {};
  const entries = Object.values(assets);

  if (!entries.length) {
    console.warn('CSS-Asset-Manifest enthält keine Einträge. CSS-Cache-Busting ist bis zum nächsten Build nicht aktiv.');
    return;
  }

  entries.forEach((asset) => {
    if (!asset?.output) return;
    const outputPath = join(publicDir, asset.output);
    if (!fs.existsSync(outputPath)) {
      console.warn(`Minifizierte CSS-Datei fehlt: public/${asset.output}. Bitte "npm run build:css" ausführen.`);
    }
  });

  requiredSources.forEach((source) => {
    const normalized = normalizeCssAssetPath(source);
    if (!assets[normalized]) {
      console.warn(`CSS-Quelle fehlt im Manifest: ${normalized}. Bitte Datei prüfen und "npm run build:css" ausführen.`);
    }
  });
}
