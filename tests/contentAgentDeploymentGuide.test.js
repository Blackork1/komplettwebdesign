import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
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

const bashBlocks = fencedBlocks('bash');
const yamlBlocks = fencedBlocks('yaml');

test('App und Worker verwenden exakt dasselbe benannte Image, Worker bleibt intern', () => {
  const appYaml = blockContaining(yamlBlocks, /^  app:\n    image:/m, 'app.image-YAML');
  const workerYaml = blockContaining(yamlBlocks, /^  content-worker:\n/m, 'Worker-YAML');
  const app = parsedService(appYaml, 'app');
  const worker = parsedService(workerYaml, 'content-worker');

  assert.equal(app.image, 'komplettwebdesign-app:local');
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
  assert.match(guide, /\/apps\/komplettwebdesign\/server/);
  assert.match(guide, /ausschließlich[^\n]*`server\/`[^\n]*(?:Git|automatisch)/i);
  for (const file of ['`.env`', '`docker-compose.yml`', '`deploy/deploy.sh`']) {
    assert.match(guide, new RegExp(`${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\n]*manuell`, 'i'));
  }
  assert.doesNotMatch(guide, /\/home\/webadmin\/apps\/komplettwebdesign/);
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
  const previous = deploy.indexOf('PREVIOUS_COMMIT=');
  const fetch = deploy.indexOf('git fetch --prune origin');
  const reset = deploy.indexOf('git reset --hard origin/main');
  const build = deploy.indexOf('build --no-cache app');
  const migration = deploy.indexOf('npm run migrate:content-agent');
  const recreate = deploy.indexOf('up -d --no-deps --force-recreate app content-worker');

  assert.ok(pause >= 0 && running > pause && stop > running && backup > stop);
  assert.ok(previous > backup && fetch > previous && reset > fetch && build > reset);
  assert.ok(migration > build && recreate > migration);
  assert.match(deploy, /^REPO_DIR="\$ROOT\/server"$/m);
  assert.match(deploy, /git config --global --add safe\.directory "\$REPO_DIR"/);
  assert.match(deploy, /cd "\$REPO_DIR"/);
  assert.match(deploy, /\[\[ "\$PREVIOUS_COMMIT" =~ \^\[0-9a-f\]\{40\}\$ \]\]/);
  assert.doesNotMatch(deploy.slice(0, recreate), /\bstop\b[^\n]*\bapp\b/);
  assert.match(deploy, /if \[\[ "\$RUNNING_JOB_COUNT" != "0" \]\]; then/);
  assert.equal((deploy.match(/npm run migrate:content-agent/g) || []).length, 2);
  assert.match(deploy, /docker image inspect komplettwebdesign-app:local/);
  assert.match(deploy, /pg_restore -l < "\$BACKUP_FILE"/);
  assert.match(deploy, /content-agent:healthcheck/);
  assert.match(deploy, /docker compose -f "\$COMPOSE_FILE" logs --tail=100 app content-worker/);
});

test('Deploy sichert ein unveränderliches Rollback-Image und behandelt den First Deploy explizit', () => {
  const deploy = blockContaining(bashBlocks, /git reset --hard origin\/main/, 'deploy.sh-Block');
  const imageExists = deploy.indexOf('if docker image inspect komplettwebdesign-app:local');
  const rollbackTag = deploy.indexOf('docker image tag komplettwebdesign-app:local "$ROLLBACK_IMAGE"');
  const metadata = deploy.indexOf('ROLLBACK_METADATA=');
  const build = deploy.indexOf('build --no-cache app');
  const workerGuard = deploy.indexOf('if [[ -n "$WORKER_CONTAINER_ID" ]]');
  const stop = deploy.indexOf('stop -t 600 content-worker');

  assert.ok(imageExists >= 0 && rollbackTag > imageExists && metadata > imageExists);
  assert.ok(build > rollbackTag && build > metadata);
  assert.match(deploy, /ROLLBACK_IMAGE="komplettwebdesign-app:rollback-\$\{DEPLOY_TIMESTAMP\}-\$\{SHORT_PREVIOUS_COMMIT\}"/);
  assert.match(deploy, /printf 'ROLLBACK_COMMIT=%s\\nROLLBACK_IMAGE=%s\\n'/);
  assert.match(deploy, /chmod 600 "\$ROLLBACK_METADATA"/);
  assert.match(deploy, /docker image inspect "\$ROLLBACK_IMAGE"/);
  assert.match(deploy, /Erster Deploy: kein vorhandenes App-Image für einen Image-Rollback/);
  assert.ok(workerGuard >= 0 && stop > workerGuard);
  assert.match(deploy.slice(workerGuard, stop), /WORKER_CONTAINER_ID/);
  assert.match(deploy, /case "\$SETTINGS_TABLE:\$CONTENT_JOBS_TABLE" in/);
  assert.match(deploy, /content_agent_settings:content_jobs\)/);
  assert.match(deploy, /Unbekannter oder inkonsistenter Content-Agent-Datenbankzustand/);
  assert.match(deploy, /test "\$PAUSED_STATE" = "false\|review"/);
  assert.match(deploy, /POST_STOP_RUNNING_JOB_COUNT/);
  assert.match(guide, /chmod 700 deploy\/deploy\.sh[\s\S]*bash -n deploy\/deploy\.sh/);
});

test('Deploy und Rollback warten begrenzt auf running beziehungsweise healthy', () => {
  const cases = [
    [/git reset --hard origin\/main/, 'Deploy'],
    [/ROLLBACK_METADATA="\$\{1:/, 'Rollback']
  ];
  for (const [pattern, name] of cases) {
    const block = blockContaining(bashBlocks, pattern, `${name}-Block`);
    const recreate = block.indexOf('up -d --no-deps --force-recreate app content-worker');
    const wait = block.indexOf('wait_for_service app running');
    const workerWait = block.indexOf('wait_for_service content-worker healthy');
    const healthcheck = block.indexOf('content-worker npm run content-agent:healthcheck');
    assert.ok(recreate >= 0 && wait > recreate && workerWait > wait && healthcheck > workerWait);
    assert.match(block, /for attempt in \$\(seq 1 60\); do/);
    assert.match(block, /docker inspect --format '\{\{\.State\.Status\}\}'/);
    assert.match(block, /docker inspect --format '\{\{if \.State\.Health\}\}\{\{\.State\.Health\.Status\}\}\{\{end\}\}'/);
    assert.match(block, /sleep 2/);
  }
});

test('Rollback validiert Metadaten, setzt Code und Image zurück und recreatet beide Dienste ohne Build', () => {
  const rollback = blockContaining(bashBlocks, /ROLLBACK_METADATA="\$\{1:/, 'Rollback-Block');
  const mode = rollback.indexOf('METADATA_MODE=');
  const contentValidation = rollback.indexOf("grep -Eq '^ROLLBACK_COMMIT=");
  const source = rollback.indexOf('. "$ROLLBACK_METADATA"');
  const pause = rollback.indexOf('PAUSED_STATE=');
  const stop = rollback.indexOf('stop -t 600 content-worker');
  const reset = rollback.indexOf('git reset --hard "$ROLLBACK_COMMIT"');
  const image = rollback.indexOf('docker image tag "$ROLLBACK_IMAGE" komplettwebdesign-app:local');
  const recreate = rollback.indexOf('up -d --no-deps --force-recreate app content-worker');

  assert.ok(mode >= 0 && contentValidation > mode && source > contentValidation);
  assert.ok(pause > source && stop > pause && reset > stop && image > reset && recreate > image);
  assert.match(rollback, /test "\$METADATA_MODE" = "600"/);
  assert.match(rollback, /grep -Eq '\^ROLLBACK_COMMIT=\[0-9a-f\]\{40\}\$'/);
  assert.match(rollback, /grep -Eq '\^ROLLBACK_IMAGE=komplettwebdesign-app:rollback-/);
  assert.match(rollback, /\[\[ "\$ROLLBACK_COMMIT" =~ \^\[0-9a-f\]\{40\}\$ \]\]/);
  assert.match(rollback, /\[\[ "\$ROLLBACK_IMAGE" =~ \^komplettwebdesign-app:rollback-/);
  assert.match(rollback, /git config --global --add safe\.directory "\$REPO_DIR"/);
  assert.match(rollback, /docker image inspect "\$ROLLBACK_IMAGE"/);
  assert.doesNotMatch(rollback, /docker compose[^\n]*\bbuild\b/);
  assert.match(rollback, /CONTENT_AGENT_ENABLED=false/);
  assert.match(rollback, /CONTENT_AGENT_ENABLED=true/);
  assert.match(guide, /Rollback-Image enthält den alten Code/i);
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

test('Rollout bleibt Review-first und Rollback trennt Code/Image von vorwärtskompatibler Datenbank', () => {
  assert.match(guide, /deaktiviert[^\n]*Review-Modus/i);
  assert.match(guide, /acht[^\n]*(?:Freigaben|manuelle)/i);
  assert.match(guide, /(?:Score|Mindestscore)[^\n]*90/i);
  assert.match(guide, /manuellen Entwurf/i);
  assert.match(guide, /Vorschau/i);
  assert.match(guide, /Code[^\n]*(?:Image|Release)[^\n]*zurück/i);
  assert.match(guide, /Datenbank[^\n]*(?:vorwärts|forward-only|nicht destruktiv)/i);
});
