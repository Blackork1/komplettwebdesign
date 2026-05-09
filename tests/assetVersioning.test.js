import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  createCssAssetResolver,
  createPublicAssetResolver
} from '../helpers/cssHelper.js';

function tempPublicDir() {
  return mkdtempSync(join(tmpdir(), 'kwd-assets-'));
}

test('public asset resolver changes the version when file content changes', () => {
  const publicDir = tempPublicDir();

  try {
    const file = join(publicDir, 'app.js');
    writeFileSync(file, 'console.log("one");');

    const asset = createPublicAssetResolver({ publicDir, fallbackVersion: 'fallback' });
    const firstUrl = asset('app.js');

    writeFileSync(file, 'console.log("two");');
    const secondUrl = asset('app.js');

    assert.match(firstUrl, /^\/app\.js\?v=[a-f0-9]{12}$/);
    assert.match(secondUrl, /^\/app\.js\?v=[a-f0-9]{12}$/);
    assert.notEqual(secondUrl, firstUrl);
  } finally {
    rmSync(publicDir, { recursive: true, force: true });
  }
});

test('public asset resolver can hash files served through explicit aliases', () => {
  const publicDir = tempPublicDir();
  const aliasFile = join(publicDir, 'vendor.js');

  try {
    writeFileSync(aliasFile, 'window.vendor = 1;');

    const asset = createPublicAssetResolver({
      publicDir,
      fallbackVersion: 'fallback',
      extraFiles: {
        'assets/js/vendor.js': aliasFile
      }
    });

    assert.match(asset('assets/js/vendor.js'), /^\/assets\/js\/vendor\.js\?v=[a-f0-9]{12}$/);
  } finally {
    rmSync(publicDir, { recursive: true, force: true });
  }
});

test('css asset resolver serves source files with live hashes in development mode', () => {
  const publicDir = tempPublicDir();

  try {
    writeFileSync(join(publicDir, 'style.css'), '.demo { color: red; }');
    const cssAsset = createCssAssetResolver({
      assets: {
        'style.css': {
          href: '/style.min.css?v=oldhash',
          output: 'style.min.css'
        }
      }
    }, {
      publicDir,
      preferSource: true,
      fallbackVersion: 'fallback'
    });

    assert.match(cssAsset('style.css'), /^\/style\.css\?v=[a-f0-9]{12}$/);
  } finally {
    rmSync(publicDir, { recursive: true, force: true });
  }
});

test('css asset resolver keeps manifest hrefs when source preference is disabled', () => {
  const publicDir = tempPublicDir();

  try {
    const cssAsset = createCssAssetResolver({
      assets: {
        'style.css': {
          href: '/style.min.css?v=currenthash',
          output: 'style.min.css'
        }
      }
    }, {
      publicDir,
      preferSource: false,
      fallbackVersion: 'fallback'
    });

    assert.equal(cssAsset('style.css'), '/style.min.css?v=currenthash');
  } finally {
    rmSync(publicDir, { recursive: true, force: true });
  }
});
