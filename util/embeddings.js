import openai from './openai.js';

/** OpenAI-Embedding holen und in pgvector-SQL-Literal umwandeln */
export async function embedAsVector(text, model = 'text-embedding-ada-002') {
  const { data: [{ embedding }] } = await openai.embeddings.create({
    model,
    input: text
  });
  return '[' + embedding.join(',') + ']';     // → "[0.12,0.34,…]"
}