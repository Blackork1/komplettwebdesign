import { readFileSync } from 'node:fs';

try {
  const required = readFileSync('.nvmrc', 'utf8').trim();
  if (!/^\d+\.\d+\.\d+$/.test(required)) {
    throw new Error('Die Node-Version in .nvmrc muss als vollständige Versionsnummer angegeben sein.');
  }
  if (process.versions.node !== required) {
    throw new Error(`Node.js ${required} wird benötigt; gefunden wurde ${process.versions.node}.`);
  }
  console.log(`Node.js ${required} entspricht der Projektvorgabe.`);
} catch (error) {
  console.error(`Prüfung der Node-Version fehlgeschlagen: ${error.message}`);
  process.exitCode = 1;
}
