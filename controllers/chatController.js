import { retrieveFaqs } from '../models/faqModel.js';
import { retrievePages } from '../models/pageModel.js';
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function chatFaq(req, res) {
  const userQ = req.body.question;
  if (!userQ) return res.status(400).json({ error: 'Frage fehlt' });

  const faqs  = await retrieveFaqs(userQ);
  const pages = await retrievePages(userQ);

  const faqCtx = faqs.map((f,i) =>
    `FAQ${i+1}: ${f.question}\nAntwort: ${f.answer}`
  ).join('\n\n');
  const pageCtx = pages.map((p,i) =>
    `Page${i+1}: Titel="${p.title}", Pfad="/${p.slug}"`
  ).join('\n\n');

  const system = `
Du bist ein Webdesign-Chatbot. Nutze diese FAQ-Einträge:

FAQ-Einträge:
${faqCtx}

Und diese Seiteninfos:
${pageCtx}

**Regeln für Links**
- Verwende **ausschließlich** relative Pfade aus den Seiteninfos (z. B. "/preise", "/contact").
- beggine die verlinkte Seite mit <a href="https://www.komplettwebdesign.de">Zur Seite</a> 

Gib dem Nutzer entweder eine wenn möglich präzise FAQ-Antwort, sonst durchsuche die FAQs und erstelle eine logsche Antwort
oder einen Link (z.B. "/contact") zurück.
`;

  const chatRes = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: system },
      { role: 'user',   content: userQ }
    ]
  });

  res.json({ answer: chatRes.choices[0].message.content });
}
