import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,   // .env muss die Variable setzen
  // optional: organisation, timeout, …
});

export default openai;    