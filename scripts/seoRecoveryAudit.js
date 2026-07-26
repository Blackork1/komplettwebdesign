import fs from 'node:fs/promises';
import path from 'node:path';
import { auditSeoRecoverySite } from '../services/seoRecoveryAuditService.js';

const args = process.argv.slice(2);

function option(name, fallback = '') {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}

const baseUrl = option('--base-url', 'http://127.0.0.1:3000');
const out = option('--out', 'artifacts/seo-recovery-audit.json');
const failOn = option('--fail-on', 'error');
const report = await auditSeoRecoverySite({ baseUrl });

await fs.mkdir(path.dirname(out), { recursive: true });
await fs.writeFile(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report.summary));

if (failOn === 'error' && report.summary.errors > 0) process.exitCode = 1;
