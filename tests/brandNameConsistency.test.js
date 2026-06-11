import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const incorrectBrandName = ['Komplett', 'webdesign'].join('');
const incorrectBrandPattern = /Komplett(?:[Ww]eb[Dd]esign|webdesign)/g;
const checkedRoots = ['controllers', 'data', 'helpers', 'public', 'routes', 'services', 'views'];
const checkedFiles = ['app.js', 'blog-ai-native-internet-semantic-retrieval.html'];
const checkedExtensions = new Set(['.css', '.ejs', '.html', '.js', '.json', '.mjs', '.txt']);

function extensionFor(filePath) {
  const index = filePath.lastIndexOf('.');
  return index === -1 ? '' : filePath.slice(index);
}

function collectFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      if (entry === 'node_modules') return [];
      return collectFiles(path);
    }

    return checkedExtensions.has(extensionFor(path)) ? [path] : [];
  });
}

test('public website sources use the spaced company name', () => {
  const files = [
    ...checkedRoots.flatMap((dir) => collectFiles(join(rootDir, dir))),
    ...checkedFiles.map((file) => join(rootDir, file))
  ];
  const offendingFiles = files
    .filter((filePath) => readFileSync(filePath, 'utf8').includes(incorrectBrandName));

  assert.deepEqual(offendingFiles, []);
});

test('public website sources avoid unspaced brand-name variants outside URLs and handles', () => {
  const files = [
    ...checkedRoots.flatMap((dir) => collectFiles(join(rootDir, dir))),
    ...checkedFiles.map((file) => join(rootDir, file))
  ];
  const offenders = files.flatMap((filePath) => {
    const source = readFileSync(filePath, 'utf8');
    const matches = [];

    for (const match of source.matchAll(incorrectBrandPattern)) {
      const previous = source[match.index - 1] || '';
      if (previous === '/' || previous === '@') continue;
      matches.push(filePath);
      break;
    }

    return matches;
  });

  assert.deepEqual(offenders, []);
});
