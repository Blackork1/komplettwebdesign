// util/embeddings.js
import openai from './openai.js';

/** OpenAI-Embedding holen und in pgvector-SQL-Literal umwandeln */
export async function embedAsVector(text, model = 'text-embedding-3-small') {
  const cleaned = (text || '').toString().replace(/\s+/g, ' ').trim();

  if (!cleaned) {
    // Leerer Text → du kannst entweder null zurückgeben
    // oder einen zero-vector nehmen. Wir überspringen lieber.
    throw new Error('embedAsVector: Text ist leer');
  }

  const response = await openai.embeddings.create({
    model,
    input: cleaned,
  });

  const embedding = response.data[0].embedding;
  return '[' + embedding.join(',') + ']'; // → "[0.12,0.34,…]"
}