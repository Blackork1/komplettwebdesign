import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';

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

function serviceBody(yaml, serviceName) {
  const lines = yaml.split('\n');
  const start = lines.findIndex((line) => line === `  ${serviceName}:`);
  assert.notEqual(start, -1, `Service ${serviceName} fehlt im YAML-Block`);
  const body = [];
  for (const line of lines.slice(start + 1)) {
    if (/^  [^\s].*:$/.test(line)) break;
    body.push(line);
  }
  return body.join('\n');
}

const bashBlocks = fencedBlocks('bash');
const yamlBlocks = fencedBlocks('yaml');

test('App und Worker verwenden exakt dasselbe benannte Image, Worker bleibt intern', () => {
  const appYaml = blockContaining(yamlBlocks, /^  app:\n    image:/m, 'app.image-YAML');
  const workerYaml = blockContaining(yamlBlocks, /^  content-worker:\n/m, 'Worker-YAML');
  const app = serviceBody(appYaml, 'app');
  const worker = serviceBody(workerYaml, 'content-worker');
  const appImage = app.match(/^    image: (\S+)$/m)?.[1];
  const workerImage = worker.match(/^    image: (\S+)$/m)?.[1];

  assert.equal(appImage, 'komplettwebdesign-app:local');
  assert.equal(workerImage, appImage);
  assert.match(worker, /^    stop_grace_period: 10m$/m);
  assert.match(worker, /^    networks:\n      - default$/m);
  assert.doesNotMatch(worker, /^    (?:ports|expose|labels|build):/m);
  assert.doesNotMatch(worker, /^      - proxy$/m);
  assert.match(guide, /öffentliche Website[^\n]*`app`/i);
  assert.match(guide, /`content-worker`[^\n]*(?:intern|keine lokale|nicht öffentlich)/i);
});

test('PostgreSQL-Healthcheck bewahrt die Compose-Escapes und App wartet auf healthy', () => {
  const appDependsYaml = blockContaining(yamlBlocks, /^  app:\n    depends_on:/m, 'app.depends_on-YAML');
  const postgresYaml = blockContaining(yamlBlocks, /^  postgres:\n    healthcheck:/m, 'postgres.healthcheck-YAML');

  assert.match(serviceBody(appDependsYaml, 'app'), /postgres:\n        condition: service_healthy/);
  assert.match(serviceBody(postgresYaml, 'postgres'), /pg_isready -U \$\$\{POSTGRES_USER\} -d \$\$\{POSTGRES_DB\}/);
  assert.match(serviceBody(blockContaining(yamlBlocks, /^  content-worker:\n/m, 'Worker-YAML'), 'content-worker'), /postgres:\n        condition: service_healthy/);
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

test('Deploy-Block stoppt bei laufendem Job, sichert, migriert zweimal und recreatet dasselbe Image', () => {
  const deploy = blockContaining(bashBlocks, /RUNNING_JOB_COUNT=/, 'deploy.sh-Block');
  const running = deploy.indexOf('RUNNING_JOB_COUNT=');
  const stop = deploy.indexOf('docker compose -f "$COMPOSE_FILE" stop -t 600 content-worker');
  const backup = deploy.indexOf('BACKUP_FILE=');
  const build = deploy.indexOf('build --no-cache app');
  const migration = deploy.indexOf('npm run migrate:content-agent');
  const recreate = deploy.indexOf('up -d --no-deps --force-recreate app content-worker');

  assert.ok(running >= 0 && stop > running && backup > stop && build > backup);
  assert.ok(migration > build && recreate > migration);
  assert.match(deploy, /if \[\[ "\$RUNNING_JOB_COUNT" != "0" \]\]; then/);
  assert.equal((deploy.match(/npm run migrate:content-agent/g) || []).length, 2);
  assert.match(deploy, /docker image inspect komplettwebdesign-app:local/);
  assert.match(deploy, /pg_restore -l < "\$BACKUP_FILE"/);
  assert.match(deploy, /content-agent:healthcheck/);
  assert.match(deploy, /docker compose -f "\$COMPOSE_FILE" logs --tail=100 app content-worker/);
});

test('Rückfall stoppt kontrolliert und Wiederanlauf erzeugt den Worker neu', () => {
  const rollback = blockContaining(
    bashBlocks,
    /CONTENT_AGENT_ENABLED=false/,
    'Rollback-Block'
  );
  const restart = blockContaining(
    bashBlocks,
    /CONTENT_AGENT_ENABLED=true/,
    'Wiederanlauf-Block'
  );

  assert.match(rollback, /docker compose stop -t 600 content-worker/);
  assert.doesNotMatch(rollback, /docker compose stop content-worker/);
  assert.match(restart, /docker compose up -d --force-recreate content-worker/);
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
