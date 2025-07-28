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
    .filter(f => f.toLocaleLowerCase().endsWith('.css'))
  } catch (error) {
    console.error('Fehler beim Lesen des CSS-Verzeichnisses:', error);
    return [];
  }
}
