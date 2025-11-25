import { retrieveFaqs } from '../models/faqModel.js';
import { retrievePages } from '../models/pageModel.js';
import { saveMessage, getHistory } from '../models/chatModel.js';
import { searchIndustryEmbeddings } from '../scripts/embeddingsService.js';
import OpenAI from 'openai';


const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


// GET   /chat/history
export async function history(req, res) {
    const sessionId = req.session.id;
    const rows = await getHistory(sessionId);
    res.json(rows);
}

// POST  /chat/message  (und /faq/query als Alias)
export async function message(req, res) {
  const userQ = req.body.question;
  if (!userQ) return res.status(400).json({ error: 'Frage fehlt' });

  const sessionId = req.session.id;

  // 1) User-Frage speichern
  await saveMessage(sessionId, 'user', userQ);

  // 2) Embedding-Retrieval: FAQs, Seiten, Branchen
  const [faqs, pages, industries] = await Promise.all([
    retrieveFaqs(userQ),
    retrievePages(userQ),
    searchIndustryEmbeddings(userQ, 5) // Anzahl Treffer nach Geschmack
  ]);

  // 3) Kontextstrings bauen
  const faqCtx = faqs.map((f, i) =>
    `FAQ${i + 1}${f.distance != null ? ` (Distanz ${f.distance.toFixed(3)})` : ''}:
Frage: ${f.question}
Antwort: ${f.answer}`
  ).join('\n\n');

  const pageCtx = pages.map((p, i) =>
    `Seite${i + 1}${p.distance != null ? ` (Distanz ${p.distance.toFixed(3)})` : ''}:
Titel: ${p.title}
Pfad: "/${p.slug}"
Beschreibung: ${p.description || ''}`
  ).join('\n\n');

  const industryCtx = industries.map((it, i) =>
    `Branche${i + 1}${it.distance != null ? ` (Distanz ${it.distance.toFixed(3)})` : ''}:
Name: ${it.name}
Pfad: "/branchen/webdesign-${it.slug}"   // 👈 ggf. an dein Routing anpassen
Quelle: ${it.source}
Inhalt: ${it.content}`
  ).join('\n\n');

  const system = `
Du bist der offizielle Chatbot von Komplett Webdesign.
Du darfst nur auf Grundlage der folgenden Inhalte antworten.

FAQ-Einträge:
${faqCtx || '(keine passenden FAQ-Treffer)'}

Seiteninfos:
${pageCtx || '(keine passenden Seiten-Treffer)'}

Branchenseiten:
${industryCtx || '(keine passenden Branchen-Treffer)'}

REGELN:
- Antworte auf Deutsch in der Du-Form.
- Nutze nur Informationen aus den obigen Blöcken, erfinde nichts dazu.
- Wenn du auf eine Seite oder Branche verlinkst, verwende ausschließlich Pfade, die oben vorkommen.
  Beispiel: <a href="https://www.komplettwebdesign.de/PFAD">Zur Seite</a>
- Wenn nichts wirklich passt, sag ehrlich, dass es dazu noch keine Inhalte auf der Website gibt und verweise auf das Kontaktformular.
`;

  // 4) Antwort vom Modell holen
  const chatRes = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: userQ }
    ],
    temperature: 0.2
  });

  const answer = chatRes.choices[0].message.content;

  // 5) Bot-Antwort speichern
  await saveMessage(sessionId, 'bot', answer);

  res.json({ answer });
}
