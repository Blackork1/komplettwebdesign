import { createHash } from 'node:crypto';

const SHA256 = /^[0-9a-f]{64}$/;

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => (
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`
    )).join(',')}}`;
  }
  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    throw Object.assign(new Error('Der Revisionssnapshot ist nicht kanonisch serialisierbar.'), {
      code: 'CONTENT_REVISION_VALIDATION_FAILED'
    });
  }
  return serialized;
}

export function isSnapshotFingerprint(value) {
  return typeof value === 'string' && SHA256.test(value);
}

export function snapshotFingerprint(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    throw Object.assign(new Error('Der Revisionssnapshot ist ungültig.'), {
      code: 'CONTENT_REVISION_VALIDATION_FAILED'
    });
  }
  return createHash('sha256').update(canonicalJson(snapshot)).digest('hex');
}
