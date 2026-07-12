import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { parse as parseYaml } from 'yaml';

const guide = readFileSync(
  new URL('../docs/deployment/content-agent-ionos-vps.md', import.meta.url),
  'utf8'
);

function fencedBlocks(language) {
  const expression = new RegExp('```' + language + '\\n([\\s\\S]*?)```', 'g');
  return [...guide.matchAll(expression)].map((match) => match[1].trim());
}

function blockContaining(blocks, pattern, description) {
  const matches = blocks.filter((block) => pattern.test(block));
  assert.equal(matches.length, 1, `${description}: genau einen passenden Block erwartet`);
  return matches[0];
}

function parsedService(yaml, serviceName) {
  const document = parseYaml(yaml);
  assert.ok(document && typeof document === 'object', 'YAML muss ein Objekt ergeben');
  assert.ok(document.services && typeof document.services === 'object', 'services fehlt im YAML');
  assert.ok(document.services[serviceName], `Service ${serviceName} fehlt im YAML-Block`);
  return document.services[serviceName];
}

function namedShellFunction(block, name) {
  const expression = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\(\\) \\{\\n([\\s\\S]*?)^\\}(?=\\n\\n)`, 'm');
  const match = block.match(expression);
  assert.ok(match, `Shell-Funktion ${name} fehlt`);
  return `${name}() {\n${match[1]}}`;
}

function runBash(script, { env = {} } = {}) {
  return spawnSync('bash', ['-c', script], {
    encoding: 'utf8',
    env: { ...process.env, ...env }
  });
}

const bashBlocks = fencedBlocks('bash');
const yamlBlocks = fencedBlocks('yaml');

test('App und Worker verwenden exakt dasselbe benannte Image, Worker bleibt intern', () => {
  const appYaml = blockContaining(yamlBlocks, /^  app:\n    image:/m, 'app.image-YAML');
  const workerYaml = blockContaining(yamlBlocks, /^  content-worker:\n/m, 'Worker-YAML');
  const app = parsedService(appYaml, 'app');
  const worker = parsedService(workerYaml, 'content-worker');

  assert.equal(app.image, 'komplettwebdesign-app:local');
  assert.equal(
    app.build.labels['org.opencontainers.image.revision'],
    '${APP_REVISION:-unknown}',
    'das gebaute Image muss den tatsächlich gebauten Git-Stand tragen'
  );
  assert.equal(
    app.build.labels['de.komplettwebdesign.content-worker.contract'],
    'dashboard-v1'
  );
  assert.equal(worker.image, app.image);
  assert.equal(worker.stop_grace_period, '10m');
  assert.deepEqual(worker.networks, ['default']);
  for (const forbidden of ['ports', 'expose', 'labels', 'build']) {
    assert.equal(worker[forbidden], undefined, `Worker darf ${forbidden} nicht enthalten`);
  }
  assert.ok(!worker.networks.includes('proxy'));
  assert.match(guide, /öffentliche Website[^\n]*`app`/i);
  assert.match(guide, /`content-worker`[^\n]*(?:intern|keine lokale|nicht öffentlich)/i);
});

test('PostgreSQL-Healthcheck bewahrt die Compose-Escapes und App wartet auf healthy', () => {
  const appDependsYaml = blockContaining(yamlBlocks, /^  app:\n    depends_on:/m, 'app.depends_on-YAML');
  const postgresYaml = blockContaining(yamlBlocks, /^  postgres:\n    healthcheck:/m, 'postgres.healthcheck-YAML');

  const app = parsedService(appDependsYaml, 'app');
  const postgres = parsedService(postgresYaml, 'postgres');
  const worker = parsedService(blockContaining(yamlBlocks, /^  content-worker:\n/m, 'Worker-YAML'), 'content-worker');

  assert.equal(app.depends_on.postgres.condition, 'service_healthy');
  assert.equal(postgres.healthcheck.test[1], 'pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}');
  assert.equal(worker.depends_on.postgres.condition, 'service_healthy');
});

test('Anleitung verwendet den echten Rootpfad und trennt automatisch aktualisierten Code von manuellen Dateien', () => {
  assert.match(guide, /webadmin@ubuntu:~\/apps\/komplettwebdesign\$/);
  assert.match(guide, /~\/apps\/komplettwebdesign\/server/);
  assert.match(guide, /ausschließlich[^\n]*`server\/`[^\n]*(?:Git|automatisch)/i);
  for (const file of ['`.env`', '`docker-compose.yml`', '`deploy/deploy.sh`']) {
    assert.match(guide, new RegExp(`${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\n]*manuell`, 'i'));
  }
  assert.doesNotMatch(guide, /\/home\/webadmin\/apps\/komplettwebdesign/);
  const containerPathMentions = guide.match(/(?<![~}A-Za-z0-9_$])\/apps\/komplettwebdesign/g) || [];
  assert.equal(containerPathMentions.length, 1, '/apps darf ausschließlich als Containerpfad vorkommen');
  assert.match(guide, /Webhook-Container[^\n]*`\/apps\/komplettwebdesign`/i);
});

test('Rollout dokumentiert Migration 004, den terminierten Reviewfluss und exakte Prüfpunkte', () => {
  assert.match(guide, /002[^\n]*003[^\n]*004/i);
  assert.match(guide, /004_create_scheduled_content_review\.sql/);
  assert.match(guide, /vier Stunden[^\n]*Veröffentlichung/i);
  assert.match(guide, /Admin[^\n]*(?:Prüfmail|Benachrichtigung)/i);
  assert.match(guide, /Freigeben[^\n]*geplanten Termin/i);
  assert.match(guide, /Freigeben und jetzt veröffentlichen/i);
  assert.match(guide, /Verschieben[^\n]*Termin/i);
  assert.match(guide, /Newsletter[^\n]*deaktiviert[^\n]*acht/i);
  for (const checkpoint of [
    'needs_review',
    'approved_scheduled',
    'publish_approved_post',
    'manual_approvals_count',
    'content_publish_events'
  ]) assert.match(guide, new RegExp(checkpoint));
});

test('Dry-Run belegt terminierten Review und simulierte Benachrichtigung ohne externe Aufrufe', () => {
  const result = spawnSync(process.execPath, ['scripts/contentAgentDryRun.js'], {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8',
    env: { PATH: process.env.PATH, NODE_ENV: 'test', OPENAI_API_KEY: 'test-key' }
  });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.externalCalls, 0);
  assert.equal(report.articleValid, true);
  assert.equal(report.publishMode, 'draft');
  assert.equal(report.scheduledReview, true);
  assert.equal(report.notificationSimulated, true);
});

test('alle kopierbaren Bash-Blöcke sind syntaktisch gültig und Compose gibt keine Konfiguration aus', () => {
  assert.ok(bashBlocks.length > 0);
  for (const [index, block] of bashBlocks.entries()) {
    const result = spawnSync('bash', ['-n'], { input: block, encoding: 'utf8' });
    assert.equal(result.status, 0, `Bash-Block ${index + 1} ist ungültig: ${result.stderr}`);
  }

  const configCommands = bashBlocks
    .flatMap((block) => block.split('\n'))
    .filter((line) => line.startsWith('docker compose config'));
  assert.ok(configCommands.length >= 2);
  assert.deepEqual([...new Set(configCommands)], ['docker compose config --quiet']);
});

test('separate Testdatenbank belegt Migration zweimal und wird vollständig aufgeräumt', () => {
  const testDatabase = blockContaining(
    bashBlocks,
    /TEST_DB_CONTAINER=/,
    'Testdatenbank-Migrationsblock'
  );

  assert.match(testDatabase, /pgvector\/pgvector:pg16/);
  assert.match(testDatabase, /^\(\n  set -Eeuo pipefail\n/);
  assert.match(testDatabase, /\n\)$/);
  assert.match(testDatabase, /--schema-only --no-owner --no-privileges/);
  assert.match(testDatabase, /docker network create "\$TEST_DB_NETWORK"/);
  assert.match(testDatabase, /trap cleanup EXIT/);
  assert.match(testDatabase, /trap 'exit 130' INT/);
  assert.match(testDatabase, /trap 'exit 143' TERM/);
  assert.match(testDatabase, /local command_status=\$\?/);
  assert.match(testDatabase, /if \(\( command_status != 0 \)\); then\n      return "\$command_status"/);
  assert.match(testDatabase, /return "\$cleanup_status"/);
  assert.match(testDatabase, /docker rm -f "\$TEST_DB_CONTAINER"/);
  assert.match(testDatabase, /docker network rm "\$TEST_DB_NETWORK"/);
  assert.doesNotMatch(testDatabase, /docker compose run --rm app/);
  assert.doesNotMatch(testDatabase, /--env-file/);
  assert.equal((testDatabase.match(/npm run migrate:content-agent/g) || []).length, 2);
  assert.equal((testDatabase.match(/komplettwebdesign-app:local/g) || []).length, 2);
  assert.match(testDatabase, /DB_HOST="\$TEST_DB_CONTAINER"/);
  assert.match(testDatabase, /DB_PORT=5432/);
  assert.match(testDatabase, /DB_USER="\$TEST_DB_USER"/);
  assert.match(testDatabase, /DB_PASSWORD="\$TEST_DB_PASSWORD"/);
  assert.match(testDatabase, /DB_NAME="\$TEST_DB_NAME"/);
  assert.match(guide, /Basistabellen[^\n]*`users`[^\n]*`posts`/i);
});

test('destruktiver PostgreSQL-Integrationstest verlangt Freigabe und Testmarker', () => {
  assert.match(guide, /CONTENT_AGENT_PG_TEST_URL/);
  assert.match(guide, /CONTENT_AGENT_PG_TEST_ALLOW_RESET=true/);
  assert.match(guide, /CONTENT_AGENT_PG_TEST_DATABASE_MARKER/);
  assert.match(guide, /Datenbankname[^\n]*(?:test|testing)/i);
  assert.match(guide, /Produktionsdatenbank[^\n]*(?:nie|nicht)/i);
});

test('Testmigration und geprüftes Backup liegen vor jeder Produktionsmigration', () => {
  const testDatabasePosition = guide.indexOf('TEST_DB_CONTAINER=');
  const backupPosition = guide.indexOf('BACKUP_FILE=');
  const productionMigrationPosition = guide.indexOf(
    'docker compose run --rm app npm run migrate:content-agent'
  );

  assert.ok(testDatabasePosition >= 0);
  assert.ok(backupPosition > testDatabasePosition);
  assert.ok(productionMigrationPosition > backupPosition);
  assert.ok(guide.indexOf('test -s "$BACKUP_FILE"') < productionMigrationPosition);
  assert.ok(guide.indexOf('pg_restore -l < "$BACKUP_FILE"') < productionMigrationPosition);
});

test('Dry-Run liegt vor Workerstart und der Start wird anschließend geprüft', () => {
  const dryRunPosition = guide.indexOf('docker compose run --rm app npm run content-agent:dry-run');
  const workerStartPosition = guide.indexOf('docker compose up -d content-worker');

  assert.ok(dryRunPosition >= 0);
  assert.ok(workerStartPosition > dryRunPosition);
  assert.match(guide.slice(workerStartPosition), /docker compose ps/);
  assert.match(guide.slice(workerStartPosition), /content-agent:healthcheck/);
  assert.match(guide.slice(workerStartPosition), /docker compose logs -f content-worker/);
});

test('Deploy aktualisiert nur server deterministisch und hält die App bis zum Recreate online', () => {
  const deploy = blockContaining(bashBlocks, /git reset --hard origin\/main/, 'deploy.sh-Block');
  const pause = deploy.indexOf('PAUSED_STATE=');
  const running = deploy.indexOf('RUNNING_JOB_COUNT=');
  const stop = deploy.indexOf('docker compose -f "$COMPOSE_FILE" stop -t 600 content-worker');
  const backup = deploy.indexOf('BACKUP_FILE=');
  const snapshot = deploy.indexOf('RUNNING_APP_CONTAINER_ID=');
  const fetch = deploy.indexOf('git fetch --prune origin');
  const reset = deploy.indexOf('git reset --hard origin/main');
  const build = deploy.indexOf('build --no-cache app');
  const migration = deploy.indexOf('npm run migrate:content-agent');
  const recreate = deploy.indexOf('up -d --no-deps --force-recreate app content-worker');

  assert.ok(pause >= 0 && running > pause && stop > running && backup > stop);
  assert.ok(snapshot > backup && fetch > snapshot && reset > fetch && build > reset);
  assert.ok(migration > build && recreate > migration);
  assert.match(deploy, /^REPO_DIR="\$ROOT\/server"$/m);
  assert.match(deploy, /git config --global --add safe\.directory "\$REPO_DIR"/);
  assert.match(deploy, /cd "\$REPO_DIR"/);
  assert.match(deploy, /\[\[ "\$DEPLOY_COMMIT" =~ \^\[0-9a-f\]\{40\}\$ \]\]/);
  assert.doesNotMatch(deploy.slice(0, recreate), /\bstop\b[^\n]*\bapp\b/);
  assert.match(deploy, /if \[\[ "\$RUNNING_JOB_COUNT" != "0" \]\]; then/);
  assert.equal((deploy.match(/npm run migrate:content-agent/g) || []).length, 2);
  assert.match(deploy, /docker image inspect komplettwebdesign-app:local/);
  assert.match(deploy, /pg_restore -l < "\$BACKUP_FILE"/);
  assert.match(deploy, /content-agent:healthcheck/);
  assert.match(deploy, /docker compose -f "\$COMPOSE_FILE" logs --tail=100 app content-worker/);
});

test('Deploy sichert die exakte Image-SHA des laufenden App-Containers vor Reset und Build', () => {
  const deploy = blockContaining(bashBlocks, /git reset --hard origin\/main/, 'deploy.sh-Block');
  const runningContainer = deploy.indexOf('RUNNING_APP_CONTAINER_ID=');
  const runningImage = deploy.indexOf('RUNNING_IMAGE_ID=');
  const exactInspect = deploy.indexOf('docker image inspect "$RUNNING_IMAGE_ID"');
  const rollbackTag = deploy.indexOf('docker image tag "$RUNNING_IMAGE_ID" "$ROLLBACK_IMAGE"');
  const metadata = deploy.indexOf("printf 'ROLLBACK_IMAGE=%s");
  const reset = deploy.indexOf('git reset --hard origin/main');
  const build = deploy.indexOf('build --no-cache app');
  const workerGuard = deploy.indexOf('if [[ -n "$WORKER_CONTAINER_ID" ]]');
  const stop = deploy.indexOf('stop -t 600 content-worker');

  assert.ok(runningContainer >= 0 && runningImage > runningContainer);
  assert.ok(exactInspect > runningImage && rollbackTag > exactInspect && metadata > rollbackTag);
  assert.ok(reset > metadata && build > reset);
  assert.match(deploy, /docker compose -f "\$COMPOSE_FILE" ps --status running -q app/);
  assert.match(deploy, /docker inspect --format '\{\{\.Image\}\}' "\$RUNNING_APP_CONTAINER_ID"/);
  assert.match(deploy, /\[\[ "\$RUNNING_IMAGE_ID" =~ \^sha256:\[0-9a-f\]\{64\}\$ \]\]/);
  assert.doesNotMatch(deploy, /docker image tag komplettwebdesign-app:local "\$ROLLBACK_IMAGE"/);
  assert.match(deploy, /Rollback-Image-Tag existiert bereits/);
  assert.match(deploy, /test "\$TAGGED_ROLLBACK_IMAGE_ID" = "\$RUNNING_IMAGE_ID"/);
  assert.match(deploy, /ROLLBACK_IMAGE_ID=%s/);
  assert.match(deploy, /ROLLBACK_COMMIT=%s/);
  assert.match(deploy, /ROLLBACK_REF=%s/);
  assert.match(deploy, /chmod 600 "\$ROLLBACK_METADATA_TMP"/);
  assert.match(deploy, /docker image inspect "\$ROLLBACK_IMAGE"/);
  assert.match(deploy, /kein laufender App-Container für einen Image-Rollback/i);
  assert.ok(workerGuard >= 0 && stop > workerGuard);
  assert.match(deploy.slice(workerGuard, stop), /WORKER_CONTAINER_ID/);
  assert.match(deploy, /classify_content_schema_state/);
  assert.match(deploy, /Unbekannter oder partieller Content-Agent-Datenbankzustand/);
  assert.match(deploy, /test "\$PAUSED_STATE" = "false\|review"/);
  assert.match(deploy, /POST_STOP_RUNNING_JOB_COUNT/);
  assert.match(guide, /chmod 700 deploy\/deploy\.sh[\s\S]*bash -n deploy\/deploy\.sh/);
});

test('Deploy bindet nur eine belegte Image-Revision an einen geschützten Rollback-Ref', () => {
  const deploy = blockContaining(bashBlocks, /git reset --hard origin\/main/, 'deploy.sh-Block');
  const readLabel = deploy.indexOf('org.opencontainers.image.revision');
  const validateCommit = deploy.indexOf('git cat-file -e "${RUNNING_IMAGE_REVISION}^{commit}"');
  const updateRef = deploy.indexOf('git update-ref "$ROLLBACK_REF" "$ROLLBACK_COMMIT"');
  const fetch = deploy.indexOf('git fetch --prune origin');
  const reset = deploy.indexOf('git reset --hard origin/main');
  const exportRevision = deploy.indexOf('export APP_REVISION="$DEPLOY_COMMIT"');
  const build = deploy.indexOf('build --no-cache app');

  assert.ok(readLabel >= 0 && validateCommit > readLabel && updateRef > validateCommit);
  assert.ok(fetch > updateRef && reset > fetch && exportRevision > reset && build > exportRevision);
  assert.match(deploy, /ROLLBACK_REF="refs\/deploy-rollbacks\/\$DEPLOY_ID"/);
  assert.match(deploy, /ROLLBACK_COMMIT="unknown"/);
  assert.match(deploy, /ROLLBACK_REF="unknown"/);
  assert.match(deploy, /Image-Revision[^\n]*(?:unbekannt|ungültig|nicht verfügbar)/i);
  assert.match(guide, /fehlgeschlagenen Build[^\n]*(?:local|lokalen Tag|beweglichen Tag)/i);
});

test('ausführbare Schema-State-Machine trennt Dashboard, Legacy 002, First Deploy und unbekannt', () => {
  const deploy = blockContaining(bashBlocks, /git reset --hard origin\/main/, 'deploy.sh-Block');
  const classifier = namedShellFunction(deploy, 'classify_content_schema_state');
  const pause = namedShellFunction(deploy, 'pause_content_agent');
  const cases = [
    ['1|1|1|0|1|1', 'dashboard', 0],
    ['1|0|0|1|1|1', 'legacy002', 0],
    ['0|0|0|0|0|0', 'first_deploy', 0],
    ['1|1|0|1|1|1', '', 1],
    ['0|0|0|0|0|1', '', 1]
  ];

  for (const [facts, expected, status] of cases) {
    const result = runBash(`${classifier}\nclassify_content_schema_state '${facts}'`);
    assert.equal(result.status, status, `unerwarteter Status für ${facts}: ${result.stderr}`);
    assert.equal(result.stdout.trim(), expected);
  }

  const directory = mkdtempSync(join(tmpdir(), 'kwd-schema-state-'));
  try {
    const dockerStub = `
fail() { return 1; }
docker() {
  printf '%s\\n' "$*" >> "$CAPTURE"
  case "$*" in
    *"SET agent_enabled = FALSE"*) printf 'false|review\\n' ;;
    *"SET schedule_enabled = FALSE"*) printf 'false|false\\n' ;;
    *) return 1 ;;
  esac
}
`;
    const dashboardCapture = join(directory, 'dashboard.log');
    const dashboard = runBash(`${dockerStub}\n${pause}\npause_content_agent dashboard`, {
      env: { CAPTURE: dashboardCapture }
    });
    assert.equal(dashboard.status, 0, dashboard.stderr);
    const dashboardSql = readFileSync(dashboardCapture, 'utf8');
    assert.match(dashboardSql, /agent_enabled = FALSE/);
    assert.match(dashboardSql, /operating_mode/);
    assert.doesNotMatch(dashboardSql, /schedule_enabled/);

    const legacyCapture = join(directory, 'legacy.log');
    const legacy = runBash(`${dockerStub}\n${pause}\npause_content_agent legacy002`, {
      env: { CAPTURE: legacyCapture }
    });
    assert.equal(legacy.status, 0, legacy.stderr);
    const legacySql = readFileSync(legacyCapture, 'utf8');
    assert.match(legacySql, /schedule_enabled = FALSE/);
    assert.match(legacySql, /auto_publish_enabled = FALSE/);
    assert.doesNotMatch(legacySql, /agent_enabled/);

    const firstCapture = join(directory, 'first.log');
    const first = runBash(`${dockerStub}\n${pause}\npause_content_agent first_deploy`, {
      env: { CAPTURE: firstCapture }
    });
    assert.equal(first.status, 0, first.stderr);
    assert.equal(first.stdout.trim(), 'Erster Deploy: Content-Agent-Tabellen sind noch nicht vorhanden.');
    assert.throws(() => readFileSync(firstCapture, 'utf8'));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }

  assert.match(deploy, /information_schema\.columns/);
  assert.match(deploy, /PRE_DEPLOY_SCHEMA_STATE/);
  assert.match(deploy, /ROLLBACK_SCHEMA_STATE=%s/);
  assert.match(deploy, /legacy002[\s\S]*schedule_enabled = FALSE[\s\S]*auto_publish_enabled = FALSE/);
  assert.match(deploy, /dashboard[\s\S]*agent_enabled = FALSE/);
  assert.match(deploy, /operating_mode =/);
});

test('Worker-Rollback verlangt OCI-Contract und Git-Abstammung vom kompatiblen Mindeststand', () => {
  const deploy = blockContaining(bashBlocks, /git reset --hard origin\/main/, 'deploy.sh-Block');
  const compatibility = namedShellFunction(deploy, 'is_dashboard_worker_compatible');
  const constants = [
    'CURRENT_WORKER_CONTRACT="dashboard-v1"',
    'MIN_DASHBOARD_WORKER_REVISION="726df921b2285498eeca228588f8ec63945dd5fa"'
  ].join('\n');
  const knownCommit = 'a'.repeat(40);
  const knownRef = 'refs/deploy-rollbacks/20260712T120000Z-' + 'b'.repeat(12);
  const gitStub = `
git() {
  case "$1" in
    rev-parse) printf '${knownCommit}\\n' ;;
    merge-base) [[ "$*" == "merge-base --is-ancestor $MIN_DASHBOARD_WORKER_REVISION ${knownCommit}" ]] ;;
    *) return 1 ;;
  esac
}
`;

  const compatible = runBash(`${constants}\n${gitStub}\n${compatibility}\nis_dashboard_worker_compatible dashboard-v1 ${knownCommit} ${knownRef}`);
  assert.equal(compatible.status, 0, compatible.stderr);
  for (const values of [
    `legacy ${knownCommit} ${knownRef}`,
    `dashboard-v1 unknown unknown`,
    `dashboard-v1 ${knownCommit} unknown`
  ]) {
    const result = runBash(`${constants}\n${gitStub}\n${compatibility}\nis_dashboard_worker_compatible ${values}`);
    assert.notEqual(result.status, 0, `${values} darf keinen Worker starten`);
  }

  const rollback = blockContaining(bashBlocks, /ROLLBACK_METADATA="\$\{1:/, 'Rollback-Block');
  const recreate = namedShellFunction(rollback, 'recreate_rollback_services');
  assert.match(rollback, /ROLLBACK_WORKER_COMPATIBILITY/);
  assert.match(rollback, /CONTENT_AGENT_ENABLED=false/);
  assert.match(rollback, /Image-only-Rollback[\s\S]*app(?:\s|"|$)/i);
  assert.doesNotMatch(rollback.match(/Image-only-Rollback[\s\S]*?fi/)?.[0] || '', /app content-worker/);

  const directory = mkdtempSync(join(tmpdir(), 'kwd-worker-rollback-'));
  try {
    const capture = join(directory, 'docker.log');
    const dockerStub = `
fail() { return 1; }
docker() { printf '%s\\n' "$*" >> "$CAPTURE"; }
COMPOSE_FILE=/tmp/docker-compose.yml
`;
    const appOnly = runBash(`${dockerStub}\n${recreate}\nrecreate_rollback_services false`, {
      env: { CAPTURE: capture }
    });
    assert.equal(appOnly.status, 0, appOnly.stderr);
    const appOnlyCommand = readFileSync(capture, 'utf8');
    assert.match(appOnlyCommand, /force-recreate app$/m);
    assert.doesNotMatch(appOnlyCommand, /content-worker/);

    writeFileSync(capture, '');
    const withWorker = runBash(`${dockerStub}\n${recreate}\nrecreate_rollback_services true`, {
      env: { CAPTURE: capture }
    });
    assert.equal(withWorker.status, 0, withWorker.stderr);
    assert.match(readFileSync(capture, 'utf8'), /force-recreate app content-worker$/m);

    const refHarness = `
${constants}
fail() { return 1; }
git() {
  case "$1" in
    rev-parse)
      case "$GIT_REF_MODE" in
        missing) return 1 ;;
        mismatch) printf '${'c'.repeat(40)}\\n' ;;
        *) printf '${knownCommit}\\n' ;;
      esac
      ;;
    merge-base) return 0 ;;
    *) return 1 ;;
  esac
}
docker() { printf '%s\\n' "$*" >> "$CAPTURE"; }
COMPOSE_FILE=/tmp/docker-compose.yml
${compatibility}
${recreate}
ROLLBACK_WORKER_ALLOWED=false
if is_dashboard_worker_compatible dashboard-v1 ${knownCommit} ${knownRef}; then
  ROLLBACK_WORKER_ALLOWED=true
fi
recreate_rollback_services "$ROLLBACK_WORKER_ALLOWED"
`;
    for (const mode of ['missing', 'mismatch']) {
      writeFileSync(capture, '');
      const result = runBash(refHarness, {
        env: { CAPTURE: capture, GIT_REF_MODE: mode }
      });
      assert.equal(result.status, 0, `${mode} darf den App-only-Rollback nicht abbrechen: ${result.stderr}`);
      const command = readFileSync(capture, 'utf8');
      assert.match(command, /force-recreate app$/m);
      assert.doesNotMatch(command, /content-worker/, `${mode} darf keinen Worker neu erstellen`);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }

  assert.match(compatibility, /git rev-parse --verify "\$\{rollback_ref\}\^\{commit\}"/);
});

test('App-Healthcheck prüft /health stabil und bricht bei dauerhaftem Fehler begrenzt ab', () => {
  const deploy = blockContaining(bashBlocks, /git reset --hard origin\/main/, 'deploy.sh-Block');
  const waitForApp = namedShellFunction(deploy, 'wait_for_app_health');
  const harness = `
fail() { return 1; }
sleep() { :; }
docker() {
  case "$*" in
    *"ps -q app"*) printf 'app-container\\n' ;;
    *"inspect --format {{.State.Status}}"*) printf 'running\\n' ;;
    *"exec -T app node -e"*) return 1 ;;
    *) return 0 ;;
  esac
}
${waitForApp}
wait_for_app_health
`;
  const result = runBash(harness);
  assert.notEqual(result.status, 0);
  assert.match(waitForApp, /localhost/);
  assert.match(waitForApp, /\/health/);
  assert.match(waitForApp, /consecutive|SUCCESS|success/i);
});

test('gemeinsame flock-Sperre scheitert bei belegtem Lock fail-closed', () => {
  const deploy = blockContaining(bashBlocks, /git reset --hard origin\/main/, 'deploy.sh-Block');
  const acquireLock = namedShellFunction(deploy, 'acquire_operation_lock');
  const directory = mkdtempSync(join(tmpdir(), 'kwd-deploy-lock-'));
  try {
    const result = runBash(`
fail() { return 1; }
flock() { return 1; }
${acquireLock}
acquire_operation_lock '${join(directory, 'operation.lock')}'
`);
    assert.notEqual(result.status, 0);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }

  const rollback = blockContaining(bashBlocks, /ROLLBACK_METADATA="\$\{1:/, 'Rollback-Block');
  assert.match(deploy, /flock -n/);
  assert.match(rollback, /flock -n/);
  assert.match(deploy, /mv -nT/);
});

test('Dry-Run-Validator findet das letzte JSON nach Logs und prüft alle Sicherheitsfelder', () => {
  const deploy = blockContaining(bashBlocks, /git reset --hard origin\/main/, 'deploy.sh-Block');
  const validator = namedShellFunction(deploy, 'validate_dry_run_output');
  const directory = mkdtempSync(join(tmpdir(), 'kwd-dry-run-'));
  try {
    const output = join(directory, 'dry-run.log');
    writeFileSync(output, 'npm log\n{"externalCalls":0,"articleValid":true,"publishMode":"draft","scheduledReview":true,"notificationSimulated":true}\n');
    const valid = runBash(`${validator}\nvalidate_dry_run_output '${output}'`);
    assert.equal(valid.status, 0, valid.stderr);

    writeFileSync(output, 'log\n{"externalCalls":1,"articleValid":true,"publishMode":"draft","scheduledReview":true,"notificationSimulated":true}\n');
    const invalid = runBash(`${validator}\nvalidate_dry_run_output '${output}'`);
    assert.notEqual(invalid.status, 0);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('vorhandener aber nicht laufender App-Container ist kein First Deploy', () => {
  const deploy = blockContaining(bashBlocks, /git reset --hard origin\/main/, 'deploy.sh-Block');
  const all = deploy.indexOf('APP_CONTAINER_ID=');
  const running = deploy.indexOf('RUNNING_APP_CONTAINER_ID=');
  const stoppedGuard = deploy.indexOf('App-Container existiert, läuft aber nicht');
  const firstDeploy = deploy.indexOf('kein laufender App-Container für einen Image-Rollback');
  assert.ok(all >= 0 && running > all && stoppedGuard > running && firstDeploy > stoppedGuard);
});

test('Deploy und Rollback warten begrenzt auf running beziehungsweise healthy', () => {
  const cases = [
    [/git reset --hard origin\/main/, 'Deploy'],
    [/ROLLBACK_METADATA="\$\{1:/, 'Rollback']
  ];
  for (const [pattern, name] of cases) {
    const block = blockContaining(bashBlocks, pattern, `${name}-Block`);
    const recreate = block.indexOf('up -d --no-deps --force-recreate app content-worker');
    const wait = block.indexOf('wait_for_app_health', recreate);
    const workerWait = block.indexOf('wait_for_service content-worker healthy');
    const healthcheck = block.indexOf('content-worker npm run content-agent:healthcheck');
    assert.ok(recreate >= 0 && wait > recreate && workerWait > wait && healthcheck > workerWait);
    assert.match(block, /for attempt in \$\(seq 1 60\); do/);
    assert.match(block, /docker inspect --format '\{\{\.State\.Status\}\}'/);
    assert.match(block, /docker inspect --format '\{\{if \.State\.Health\}\}\{\{\.State\.Health\.Status\}\}\{\{end\}\}'/);
    assert.match(block, /sleep 2/);
  }
});

test('Rollback parst Metadaten ohne source und setzt Code nur bei belegtem Ref zurück', () => {
  const rollback = blockContaining(bashBlocks, /ROLLBACK_METADATA="\$\{1:/, 'Rollback-Block');
  const mode = rollback.indexOf('METADATA_MODE=');
  const contentValidation = rollback.indexOf("grep -Eq '^ROLLBACK_IMAGE=");
  const parse = rollback.indexOf('ROLLBACK_IMAGE="$(sed -n');
  const pause = rollback.indexOf('pause_content_agent "$CURRENT_SCHEMA_STATE"');
  const stop = rollback.indexOf('stop -t 600 content-worker');
  const reset = rollback.indexOf('git reset --hard "$ROLLBACK_COMMIT"');
  const conditionalReset = rollback.lastIndexOf('if [[ "$ROLLBACK_WORKER_ALLOWED" == "true" ]]', reset);
  const image = rollback.indexOf('docker image tag "$ROLLBACK_IMAGE" komplettwebdesign-app:local');
  const recreate = rollback.indexOf('recreate_rollback_services "$ROLLBACK_WORKER_ALLOWED"');

  assert.ok(mode >= 0 && contentValidation > mode && parse > contentValidation);
  assert.ok(pause > parse && stop > pause && conditionalReset > stop && reset > conditionalReset);
  assert.ok(image > conditionalReset && recreate > image);
  assert.match(rollback, /test "\$METADATA_MODE" = "600"/);
  assert.doesNotMatch(rollback, /^\. "\$ROLLBACK_METADATA"$/m);
  assert.match(rollback, /grep -Eq '\^ROLLBACK_COMMIT=\(unknown\|\[0-9a-f\]\{40\}\)\$'/);
  assert.match(rollback, /grep -Eq '\^ROLLBACK_REF=\(unknown\|refs\\\/deploy-rollbacks\\\//);
  assert.match(rollback, /grep -Eq '\^ROLLBACK_IMAGE=komplettwebdesign-app:rollback-/);
  assert.match(rollback, /ROLLBACK_IMAGE_ID/);
  assert.match(rollback, /\[\[ "\$ROLLBACK_IMAGE" =~ \^komplettwebdesign-app:rollback-/);
  assert.match(rollback, /git config --global --add safe\.directory "\$REPO_DIR"/);
  assert.match(rollback, /docker image inspect "\$ROLLBACK_IMAGE"/);
  assert.match(rollback, /git rev-parse --verify "\$\{rollback_ref\}\^\{commit\}"/);
  assert.match(rollback, /Image-only-Rollback/i);
  assert.doesNotMatch(rollback, /docker compose[^\n]*\bbuild\b/);
  assert.match(rollback, /CONTENT_AGENT_ENABLED=false/);
  assert.match(rollback, /CONTENT_AGENT_ENABLED=true/);
  assert.match(guide, /Rollback-Image enthält den alten App-Code/i);
  assert.match(guide, /Datenbank[^\n]*(?:forward-only|vorwärts)/i);
});

test('Rückfall stoppt kontrolliert und Wiederanlauf erzeugt App und Worker neu', () => {
  const rollback = blockContaining(bashBlocks, /ROLLBACK_METADATA="\$\{1:/, 'Rollback-Block');
  const restart = blockContaining(
    bashBlocks,
    /SELECT id, status, attempts, max_attempts, locked_at, locked_by[\s\S]*CONTENT_AGENT_ENABLED=true/,
    'Wiederanlauf-Block'
  );

  assert.match(rollback, /stop -t 600 content-worker/);
  assert.doesNotMatch(rollback, /stop content-worker/);
  assert.match(restart, /docker compose up -d --force-recreate app content-worker/);
  assert.doesNotMatch(restart, /docker compose start content-worker/);
  assert.match(restart, /docker compose exec -T content-worker npm run content-agent:healthcheck/);
  assert.match(restart, /docker compose logs --tail=100 content-worker/);
  assert.match(guide, /aktive Jobs[^\n]*(?:Logs|Datenbank)/i);
  assert.match(guide, /Lease[^\n]*(?:Recovery|zurück)/i);
  assert.match(guide, /zurückgebliebene[^\n]*(?:Jobs|Queue)/i);
});

test('technische Hardgates sind vollständig, Betriebswerte liegen in PostgreSQL und Altvariablen sind nur Bootstrap-Fallbacks', () => {
  for (const value of [
    'CONTENT_AGENT_ENABLED=true',
    'CONTENT_AGENT_AUTOPUBLISH_ENABLED=false',
    'CONTENT_AGENT_MAX_TOPIC_CANDIDATES=8',
    'CONTENT_AGENT_MAX_REVISIONS=2',
    'CONTENT_AGENT_MAX_ATTEMPTS=5',
    'CONTENT_AGENT_MONTHLY_COST_LIMIT_EUR=100',
    'CONTENT_AGENT_CONTENT_STAGE_RESERVATION_EUR=0.50',
    'CONTENT_AGENT_REVIEW_STAGE_RESERVATION_EUR=0.25',
    'CONTENT_AGENT_WORKER_POLL_MS=5000',
    'CONTENT_AGENT_JOB_LEASE_MINUTES=30',
    'OPENAI_CONTENT_MODEL=gpt-5.4',
    'OPENAI_REVIEW_MODEL=gpt-5.4-mini',
    'OPENAI_IMAGE_MODEL=gpt-image-2',
    'OPENAI_CONTENT_INPUT_COST_PER_MTOK=2.50',
    'OPENAI_CONTENT_OUTPUT_COST_PER_MTOK=15',
    'OPENAI_REVIEW_INPUT_COST_PER_MTOK=0.75',
    'OPENAI_REVIEW_OUTPUT_COST_PER_MTOK=4.50',
    'OPENAI_IMAGE_COST_EUR=0.041'
  ]) {
    assert.ok(guide.includes(value), `${value} fehlt`);
  }

  assert.doesNotMatch(guide, /^CONTENT_AGENT_(?:PUBLISH_MODE|SCHEDULE|TIMEZONE)=/m);
  assert.match(guide, /CONTENT_AGENT_PUBLISH_MODE[^\n]*(?:veraltet|Bootstrap-Fallback)/i);
  assert.match(guide, /CONTENT_AGENT_SCHEDULE[^\n]*(?:veraltet|Bootstrap-Fallback)/i);
  assert.match(guide, /CONTENT_AGENT_TIMEZONE[^\n]*(?:veraltet|Bootstrap-Fallback)/i);
  assert.match(guide, /Montag und Donnerstag um 18:00 Uhr/);
  assert.match(guide, /Europe\/Berlin/);
  assert.match(guide, /PostgreSQL[^\n]*(?:Betriebswerte|Betriebsmodus)/i);
  assert.match(guide, /agent_enabled=false/);
  assert.match(guide, /operating_mode=review/);
  assert.match(guide, /Kostensätze[^\n]*(?:OpenAI|Preisseite)[^\n]*(?:prüfen|abgleichen)/i);
  for (const secret of [
    'OPENAI_API_KEY', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET', 'DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD',
    'DB_NAME', 'SESSION_SECRET'
  ]) {
    assert.match(guide, new RegExp(`\\b${secret}\\b`));
  }
  assert.match(guide, /App bleibt online/i);
  assert.match(guide, /additive[^\n]*(?:Spalten|Tabellen)/i);
  assert.match(guide, /destruktiv/i);
  assert.match(guide, /Search Console[^\n]*Plan C/i);
});

test('Rollout bleibt Review-first und Rollback verlangt release-spezifische Datenbankkompatibilität', () => {
  assert.match(guide, /deaktiviert[^\n]*Review-Modus/i);
  assert.match(guide, /acht[^\n]*(?:Freigaben|manuelle)/i);
  assert.match(guide, /(?:Score|Mindestscore)[^\n]*90/i);
  assert.match(guide, /manuellen Entwurf/i);
  assert.match(guide, /Vorschau/i);
  assert.match(guide, /Code und Worker[^\n]*nur dann[^\n]*zurück/i);
  assert.match(guide, /Datenbank[^\n]*(?:vorwärts|forward-only|nicht destruktiv)/i);
  assert.match(guide, /keine pauschale Rückwärtskompatibilität/i);
});
