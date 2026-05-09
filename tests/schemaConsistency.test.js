import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('../', import.meta.url));
const productionDirs = [
  'controllers',
  'helpers',
  'routes',
  'views',
  'data',
  'util'
];
const sourceExtensions = new Set(['.js', '.ejs', '.json']);
const ignoredDirectories = new Set(['admin']);

async function collectSourceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(...await collectSourceFiles(fullPath));
      }
      continue;
    }

    if (entry.isFile() && sourceExtensions.has(extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

test('production sources do not contain self-serving aggregateRating schema claims', async () => {
  const files = [];

  for (const dir of productionDirs) {
    files.push(...await collectSourceFiles(join(rootDir, dir)));
  }

  assert.ok(files.length > 0, 'expected production source files to scan');

  for (const file of files) {
    const source = await readFile(file, 'utf8');
    const relativePath = relative(rootDir, file);
    assert.equal(
      source.includes('aggregateRating'),
      false,
      `${relativePath} must not include aggregateRating without supported review evidence`
    );
  }
});
