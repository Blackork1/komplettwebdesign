import 'dotenv/config';
import pool from '../util/db.js';
import { rebuildIndustryEmbeddings } from './embeddingsService.js';

async function run() {
  const { rows: industries } = await pool.query('SELECT * FROM industries');
  console.log(`➡️ ${industries.length} Branchen gefunden`);

  for (const industry of industries) {
    console.log(`🔁 Embeddings für Branche ${industry.id} / ${industry.slug || industry.name} ...`);
    await rebuildIndustryEmbeddings(industry);
  }

  console.log('✅ Alle Branchen-Embeddings aktualisiert');
}

run()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Fehler beim Einbetten der Branchen:', err);
    process.exit(1);
  });