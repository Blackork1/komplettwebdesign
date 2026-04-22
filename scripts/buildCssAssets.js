import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import cssnano from 'cssnano';
import postcss from 'postcss';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');
const manifestPath = path.join(publicDir, 'css-asset-manifest.json');
const processor = postcss([cssnano({ preset: 'default' })]);
const watchMode = process.argv.includes('--watch');

function toPosixPath(filePath) {
  return filePath.split(path.sep).join('/');
}

function isCssSource(filePath) {
  const fileName = path.basename(filePath);
  return fileName.endsWith('.css') && !fileName.endsWith('.min.css');
}

function minifiedPathFor(sourcePath) {
  return sourcePath.replace(/\.css$/i, '.min.css');
}

async function discoverCssSources(dir = publicDir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;

    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await discoverCssSources(entryPath));
      continue;
    }

    if (entry.isFile() && isCssSource(entryPath)) {
      files.push(entryPath);
    }
  }

  return files.sort((a, b) => a.localeCompare(b));
}

async function writeIfChanged(filePath, content) {
  try {
    const current = await fs.readFile(filePath, 'utf8');
    if (current === content) return false;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  await fs.writeFile(filePath, content);
  return true;
}

async function minifyCssSource(sourcePath) {
  const sourceCss = await fs.readFile(sourcePath, 'utf8');
  const outputPath = minifiedPathFor(sourcePath);
  const result = await processor.process(sourceCss, {
    from: sourcePath,
    to: outputPath,
    map: false,
  });
  const minifiedCss = result.css.endsWith('\n') ? result.css : `${result.css}\n`;
  const hash = crypto.createHash('sha256').update(minifiedCss).digest('hex').slice(0, 12);
  const sourceRel = toPosixPath(path.relative(publicDir, sourcePath));
  const outputRel = toPosixPath(path.relative(publicDir, outputPath));

  await writeIfChanged(outputPath, minifiedCss);

  return {
    source: sourceRel,
    output: outputRel,
    href: `/${outputRel}?v=${hash}`,
    hash,
    bytes: Buffer.byteLength(minifiedCss),
  };
}

async function buildCssAssets() {
  const sources = await discoverCssSources();
  const assets = {};

  for (const sourcePath of sources) {
    const asset = await minifyCssSource(sourcePath);
    assets[asset.source] = asset;
  }

  const manifest = {
    version: 1,
    assets,
  };
  const manifestJson = `${JSON.stringify(manifest, null, 2)}\n`;
  const changed = await writeIfChanged(manifestPath, manifestJson);

  console.log(
    `CSS assets built: ${sources.length} source files, manifest ${changed ? 'updated' : 'unchanged'}.`
  );
}

async function createSourceSnapshot() {
  const sources = await discoverCssSources();
  const snapshot = new Map();

  for (const sourcePath of sources) {
    const rel = toPosixPath(path.relative(publicDir, sourcePath));
    const stat = await fs.stat(sourcePath);
    snapshot.set(rel, stat.mtimeMs);
  }

  return snapshot;
}

function snapshotsMatch(a, b) {
  if (a.size !== b.size) return false;

  for (const [file, mtimeMs] of a) {
    if (b.get(file) !== mtimeMs) return false;
  }

  return true;
}

async function watchCssAssets() {
  let timer = null;
  let isBuilding = false;
  let queued = false;
  let previousSnapshot = await createSourceSnapshot();

  const scheduleBuild = () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      if (isBuilding) {
        queued = true;
        return;
      }

      isBuilding = true;
      try {
        do {
          queued = false;
          await buildCssAssets();
          previousSnapshot = await createSourceSnapshot();
        } while (queued);
      } catch (error) {
        console.error('CSS asset build failed:', error);
      } finally {
        isBuilding = false;
      }
    }, 120);
  };

  await buildCssAssets();

  setInterval(async () => {
    try {
      const nextSnapshot = await createSourceSnapshot();
      if (!snapshotsMatch(previousSnapshot, nextSnapshot)) {
        previousSnapshot = nextSnapshot;
        scheduleBuild();
      }
    } catch (error) {
      console.error('CSS watcher scan failed:', error.message);
    }
  }, 750);

  console.log('Watching CSS assets by polling source files.');
}

if (watchMode) {
  watchCssAssets().catch((error) => {
    console.error('CSS asset watcher failed:', error);
    process.exit(1);
  });
} else {
  buildCssAssets().catch((error) => {
    console.error('CSS asset build failed:', error);
    process.exit(1);
  });
}
