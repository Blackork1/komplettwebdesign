const appleBundleIds = Object.freeze([
  'de.komplettwebdesign.swipeandcook',
  'de.komplettwebdesign.swipeandcook.internal'
]);

const androidPackageNames = Object.freeze([
  'de.komplettwebdesign.swipeandcook',
  'de.komplettwebdesign.swipeandcook.internal'
]);

const teamIdPattern = /^[A-Z0-9]{10}$/u;
const sha256FingerprintPattern = /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/u;

function invalidConfig() {
  throw new TypeError('swipeandcook_association_config_invalid');
}

function parseFingerprints(value) {
  if (typeof value !== 'string') invalidConfig();

  const fingerprints = value
    .split(/[\n,]/u)
    .map((fingerprint) => fingerprint.trim().toUpperCase())
    .filter(Boolean);

  if (
    fingerprints.length < 1
    || fingerprints.some((fingerprint) => !sha256FingerprintPattern.test(fingerprint))
  ) {
    invalidConfig();
  }

  return Object.freeze([...new Set(fingerprints)]);
}

export function loadSwipeAndCookAssociationConfig(env = process.env) {
  const appleTeamId = typeof env.SWIPEANDCOOK_APPLE_TEAM_ID === 'string'
    ? env.SWIPEANDCOOK_APPLE_TEAM_ID.trim()
    : '';
  if (!teamIdPattern.test(appleTeamId)) invalidConfig();

  return Object.freeze({
    appleTeamId,
    appleBundleIds,
    androidPackageNames,
    androidSha256Fingerprints: parseFingerprints(
      env.SWIPEANDCOOK_ANDROID_SHA256_CERT_FINGERPRINTS
    )
  });
}

export function buildAppleAppSiteAssociation(config) {
  if (!config || !teamIdPattern.test(config.appleTeamId || '')) invalidConfig();

  return {
    applinks: {
      details: [{
        appIDs: config.appleBundleIds.map((bundleId) => (
          `${config.appleTeamId}.${bundleId}`
        )),
        components: [{ '/': '/swipeandcook/einladung' }]
      }]
    }
  };
}

export function buildAndroidAssetLinks(config) {
  if (!config || !Array.isArray(config.androidSha256Fingerprints)) {
    invalidConfig();
  }

  return config.androidPackageNames.map((packageName) => ({
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: packageName,
      sha256_cert_fingerprints: [...config.androidSha256Fingerprints]
    }
  }));
}
