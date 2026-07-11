import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const guide = readFileSync(
  new URL('../docs/deployment/content-agent-ionos-vps.md', import.meta.url),
  'utf8'
);

test('IONOS-Anleitung dokumentiert die Compose-Ergänzungen für den internen Worker', () => {
  assert.match(guide, /content-worker:/);
  assert.match(guide, /image: komplettwebdesign-app:local/);
  assert.match(guide, /condition: service_healthy/);
  assert.match(guide, /pg_isready/);
  assert.match(guide, /kein(?:e|en) (?:`)?ports(?:`)?/i);
  assert.match(guide, /kein(?:e|en) (?:`)?expose(?:`)?/i);
  assert.match(guide, /kein(?:e|en) Traefik-Labels/i);
  assert.match(guide, /kein Proxy-Netzwerk/i);
});

test('IONOS-Anleitung enthält Vorprüfung, Backup und prüfbare Deploymentreihenfolge', () => {
  assert.match(guide, /docker compose config/);
  assert.match(guide, /df -h/);
  assert.match(guide, /test -s "\$BACKUP_FILE"/);
  assert.match(guide, /pg_restore -l/);
  assert.match(guide, /migrate:content-agent/);
  assert.match(guide, /Migration[^\n]*zweimal/i);
  assert.match(guide, /content-agent:dry-run/);
  assert.match(guide, /docker compose up -d app/);
  assert.match(guide, /docker compose up -d content-worker/);
  assert.match(guide, /docker compose ps/);
  assert.match(guide, /content-agent:healthcheck/);
  assert.match(guide, /docker compose logs -f content-worker/);
});

test('IONOS-Anleitung enthält die vollständige Plan-A-Konfiguration ohne Auto-Publishing', () => {
  assert.match(guide, /CONTENT_AGENT_ENABLED=true/);
  assert.match(guide, /CONTENT_AGENT_PUBLISH_MODE=draft/);
  assert.match(guide, /CONTENT_AGENT_SCHEDULE=0 9 \* \* 1/);
  assert.match(guide, /CONTENT_AGENT_TIMEZONE=Europe\/Berlin/);
  assert.match(guide, /CONTENT_AGENT_MAX_TOPIC_CANDIDATES=8/);
  assert.match(guide, /CONTENT_AGENT_MAX_REVISIONS=2/);
  assert.match(guide, /CONTENT_AGENT_MAX_ATTEMPTS=3/);
  assert.match(guide, /CONTENT_AGENT_MONTHLY_COST_LIMIT_EUR=25/);
  assert.match(guide, /CONTENT_AGENT_AUTOPUBLISH_ENABLED=false/);
  assert.match(guide, /OPENAI_CONTENT_MODEL=gpt-5\.4/);
  assert.match(guide, /OPENAI_REVIEW_MODEL=gpt-5\.4-mini/);
  assert.match(guide, /OPENAI_IMAGE_MODEL=gpt-image-2/);
  assert.match(guide, /OPENAI_CONTENT_INPUT_COST_PER_MTOK=2\.50/);
  assert.match(guide, /OPENAI_CONTENT_OUTPUT_COST_PER_MTOK=15/);
  assert.match(guide, /OPENAI_REVIEW_INPUT_COST_PER_MTOK=0\.75/);
  assert.match(guide, /OPENAI_REVIEW_OUTPUT_COST_PER_MTOK=4\.50/);
  assert.match(guide, /OPENAI_IMAGE_COST_EUR=0\.041/);
});

test('IONOS-Anleitung trennt sicheren Rückfall und destruktive Notfallwiederherstellung', () => {
  assert.match(guide, /docker compose stop content-worker/);
  assert.match(guide, /CONTENT_AGENT_ENABLED=false/);
  assert.match(guide, /App bleibt online/i);
  assert.match(guide, /additive[^\n]*(?:Spalten|Tabellen)/i);
  assert.match(guide, /destruktiv/i);
  assert.match(guide, /Search Console[^\n]*Plan C/i);
});
