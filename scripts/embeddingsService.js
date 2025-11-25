import pool from '../util/db.js';
import { embedAsVector } from '../util/embeddings.js';

// TODO: implementiere deine Embedding-Funktion (OpenAI, HF, o.ä.)
export async function computeEmbedding(text) {
  // du kannst hier ggf. noch Kürzen/Normalisieren
  return embedAsVector(text, 'text-embedding-3-small');
}

export async function rebuildIndustryEmbeddings(industry) {
  // Alle relevanten Textquellen flatten
  const sources = [];

  // Hero
  if (industry.hero_h1) sources.push({ source: 'hero_h1', content: industry.hero_h1 });
  if (industry.hero_h2) sources.push({ source: 'hero_h2', content: industry.hero_h2 });
  (industry.hero_checks||[]).forEach((t,i)=> sources.push({source:`hero_checks[${i}]`, content:t}));

  // Warum
  if (industry.warum_upper) sources.push({ source: 'warum_upper', content: industry.warum_upper });
  if (industry.warum_lower) sources.push({ source: 'warum_lower', content: industry.warum_lower });

  // Carousel (Titel)
  (industry.carousel_items||[]).forEach((it,i)=>{
    if (it.title) sources.push({source:`carousel_items[${i}].title`, content: it.title});
  });

  // Stats
  (industry.stats_cards||[]).forEach((it,i)=>{
    if (it.label) sources.push({source:`stats_cards[${i}].label`, content: it.label});
    if (it.body)  sources.push({source:`stats_cards[${i}].body`,  content: it.body});
  });

  // SEO Slider
  (industry.seo_items||[]).forEach((it,i)=>{
    if (it.title) sources.push({source:`seo_items[${i}].title`, content: it.title});
    if (it.text)  sources.push({source:`seo_items[${i}].text`,  content: it.text});
  });

  // Funktionen
  (industry.funktionen_items||[]).forEach((it,i)=>{
    sources.push({source:`funktionen_items[${i}].title`, content: it.title});
    sources.push({source:`funktionen_items[${i}].text`,  content: it.text});
  });

  // Vorteile
  (industry.vorteile?.pros||[]).forEach((t,i)=> sources.push({source:`vorteile.pros[${i}]`, content:t}));
  (industry.vorteile?.cons||[]).forEach((t,i)=> sources.push({source:`vorteile.cons[${i}]`, content:t}));

  // Tipps
  (industry.tipps_items||[]).forEach((it,i)=>{
    sources.push({source:`tipps_items[${i}].heading`, content: it.heading});
    sources.push({source:`tipps_items[${i}].text`,    content: it.text});
  });

  // FAQ
  (industry.faq_items||[]).forEach((it,i)=>{
    sources.push({source:`faq_items[${i}].q`, content: it.q});
    sources.push({source:`faq_items[${i}].a`, content: it.a});
  });

  // Delete + Insert neu
  await pool.query(`DELETE FROM industry_embeddings WHERE industry_id = $1`, [industry.id]);

  for (const s of sources) {
    const emb = await computeEmbedding(s.content);
    await pool.query(
      `INSERT INTO industry_embeddings (industry_id, source, content, embedding)
       VALUES ($1,$2,$3,$4)`,
      [industry.id, s.source, s.content, emb]
    );
  }
}

export async function searchIndustryEmbeddings(query, topK = 8) {
  const emb = await computeEmbedding(query);

  const { rows } = await pool.query(
    `SELECT
        i.id       AS industry_id,
        i.slug     AS slug,
        i.name     AS name,
        ie.source  AS source,
        ie.content AS content,
        ie.embedding <=> $1::vector AS distance
       FROM industry_embeddings ie
       JOIN industries i
         ON i.id = ie.industry_id
   ORDER BY ie.embedding <=> $1::vector
      LIMIT $2`,
    [emb, topK]
  );

  return rows;
}
