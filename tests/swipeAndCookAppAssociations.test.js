import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';

import {
  buildAndroidAssetLinks,
  buildAppleAppSiteAssociation,
  loadSwipeAndCookAssociationConfig
} from '../services/swipeAndCookAppAssociationService.js';
import {
  createSwipeAndCookInviteRouter
} from '../routes/swipeAndCookInviteRoutes.js';

const fingerprintA = Array.from({ length: 32 }, (_value, index) => (
  index.toString(16).padStart(2, '0').toUpperCase()
)).join(':');
const fingerprintB = Array.from({ length: 32 }, (_value, index) => (
  (255 - index).toString(16).padStart(2, '0').toUpperCase()
)).join(':');

const env = {
  SWIPEANDCOOK_APPLE_TEAM_ID: 'A1B2C3D4E5',
  SWIPEANDCOOK_ANDROID_SHA256_CERT_FINGERPRINTS: `${fingerprintA},${fingerprintB}`
};

function pageConfig() {
  return {
    canonicalInviteUrl: 'https://www.komplettwebdesign.de/swipeandcook/einladung',
    testFlightUrl: 'https://testflight.apple.com/',
    googlePlayInternalTestUrl: 'https://play.google.com/apps/internaltest/example'
  };
}

async function withServer(router, callback) {
  const app = express();
  app.use(router);
  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise((resolve) => server.once('listening', resolve));
    const { port } = server.address();
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (
      error ? reject(error) : resolve()
    )));
  }
}

test('lädt ausschließlich die freigegebenen Apple- und Android-Identitäten', () => {
  const config = loadSwipeAndCookAssociationConfig(env);

  assert.equal(config.appleTeamId, 'A1B2C3D4E5');
  assert.deepEqual(config.appleBundleIds, [
    'de.komplettwebdesign.swipeandcook',
    'de.komplettwebdesign.swipeandcook.internal'
  ]);
  assert.deepEqual(config.androidPackageNames, [
    'de.komplettwebdesign.swipeandcook',
    'de.komplettwebdesign.swipeandcook.internal'
  ]);
  assert.deepEqual(config.androidSha256Fingerprints, [fingerprintA, fingerprintB]);
});

test('verwirft fehlende, unvollständige oder falsch formatierte Association-Werte', () => {
  for (const invalidEnv of [
    {},
    { ...env, SWIPEANDCOOK_APPLE_TEAM_ID: 'zu-kurz' },
    { ...env, SWIPEANDCOOK_ANDROID_SHA256_CERT_FINGERPRINTS: 'AA:BB' }
  ]) {
    assert.throws(
      () => loadSwipeAndCookAssociationConfig(invalidEnv),
      /swipeandcook_association_config_invalid/
    );
  }
});

test('normalisiert doppelt eingetragene öffentliche Zertifikate ohne Doppelvertrag', () => {
  const config = loadSwipeAndCookAssociationConfig({
    ...env,
    SWIPEANDCOOK_ANDROID_SHA256_CERT_FINGERPRINTS: `${fingerprintA},${fingerprintA}`
  });

  assert.deepEqual(config.androidSha256Fingerprints, [fingerprintA]);
});

test('erzeugt eine enge AASA-Datei für genau den Einladungspfad', () => {
  const association = buildAppleAppSiteAssociation(
    loadSwipeAndCookAssociationConfig(env)
  );

  assert.deepEqual(association, {
    applinks: {
      details: [{
        appIDs: [
          'A1B2C3D4E5.de.komplettwebdesign.swipeandcook',
          'A1B2C3D4E5.de.komplettwebdesign.swipeandcook.internal'
        ],
        components: [{ '/': '/swipeandcook/einladung' }]
      }]
    }
  });
});

test('erzeugt Asset Links für beide Pakete und alle freigegebenen Signaturen', () => {
  const assetLinks = buildAndroidAssetLinks(
    loadSwipeAndCookAssociationConfig(env)
  );

  assert.deepEqual(assetLinks, [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'de.komplettwebdesign.swipeandcook',
        sha256_cert_fingerprints: [fingerprintA, fingerprintB]
      }
    },
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'de.komplettwebdesign.swipeandcook.internal',
        sha256_cert_fingerprints: [fingerprintA, fingerprintB]
      }
    }
  ]);
});

test('liefert beide Well-known-Dateien direkt als JSON ohne Redirect', async () => {
  const associationConfig = loadSwipeAndCookAssociationConfig(env);
  const router = createSwipeAndCookInviteRouter({
    associationConfig,
    invitePageConfig: pageConfig()
  });

  await withServer(router, async (origin) => {
    for (const path of [
      '/.well-known/apple-app-site-association',
      '/.well-known/assetlinks.json'
    ]) {
      const response = await fetch(`${origin}${path}`, { redirect: 'manual' });
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type') || '', /^application\/json\b/);
      assert.equal(response.headers.get('location'), null);
      assert.equal(response.headers.get('cache-control'), 'public, max-age=300');
      assert.ok(await response.json());
    }
  });
});
