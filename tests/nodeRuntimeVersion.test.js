import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const verifier = fileURLToPath(new URL('../scripts/verifyNodeVersion.js', import.meta.url));

function runWithVersionFile(contents) {
  const directory = mkdtempSync(join(tmpdir(), 'kwd-node-version-test-'));
  try {
    if (contents !== null) writeFileSync(join(directory, '.nvmrc'), contents);
    return spawnSync(process.execPath, [verifier], { cwd: directory, encoding: 'utf8' });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test('akzeptiert die tatsächlich laufende Node-Version, wenn sie der Versionsdatei entspricht', () => {
  const result = runWithVersionFile(`${process.versions.node}\n`);
  assert.equal(result.status, 0, result.stderr);
});

test('verweigert einen Build mit einer abweichenden Node-Version', () => {
  const result = runWithVersionFile('0.0.0\n');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /0\.0\.0/);
  assert.match(result.stderr, new RegExp(process.versions.node.replaceAll('.', '\\.')));
});

test('verweigert einen Build ohne Versionsdatei', () => {
  const result = runWithVersionFile(null);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /\.nvmrc/);
});
