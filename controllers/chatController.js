import { retrieveFaqs } from '../models/faqModel.js';
import { retrievePages } from '../models/pageModel.js';
import { saveMessage, getHistory } from '../models/chatModel.js';
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

    // 1) Speichere User-Frage
    await saveMessage(sessionId, 'user', userQ);

    // 2) Baue Prompt mit FAQ + Pages
    const faqs = await retrieveFaqs(userQ);
    const pages = await retrievePages(userQ);
    const faqCtx = faqs.map((f, i) =>
        `FAQ${i + 1}: ${f.question}\nAntwort: ${f.answer}`
    ).join('\n\n');
    const pageCtx = pages.map((p, i) =>
        `Page${i + 1}: Titel="${p.title}", Pfad="/${p.slug}"`
    ).join('\n\n');

    const system = `
Du bist ein Webdesign-Chatbot. Nutze diese FAQ-Einträge:

FAQ-Einträge:
${faqCtx}

Und diese Seiteninfos:
${pageCtx}

**Regeln für Links**  
- Verwende ausschließlich relative Pfade aus den Seiteninfos (z. B. "/preise", "/contact").  
- Baue Links so: <a href="https://www.komplettwebdesign.de/PFAD">Zur Seite</a>

Gib dem Nutzer möglichst eine präzise FAQ-Antwort, 
ansonsten nur einen Link zurück.
`;

    // 3) Hol Antwort von OpenAI
    const chatRes = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: system },
            { role: 'user', content: userQ }
        ]
    });
    const answer = chatRes.choices[0].message.content;

    // 4) Speichere Bot-Antwort
    await saveMessage(sessionId, 'bot', answer);

    res.json({ answer });
}


// export async function chatFaq(req, res) {
//   const userQ = req.body.question;
//   if (!userQ) return res.status(400).json({ error: 'Frage fehlt' });

//   const faqs  = await retrieveFaqs(userQ);
//   const pages = await retrievePages(userQ);

//   const faqCtx = faqs.map((f,i) =>
//     `FAQ${i+1}: ${f.question}\nAntwort: ${f.answer}`
//   ).join('\n\n');
//   const pageCtx = pages.map((p,i) =>
//     `Page${i+1}: Titel="${p.title}", Pfad="/${p.slug}"`
//   ).join('\n\n');

//   const system = `
// Du bist ein Webdesign-Chatbot. Nutze diese FAQ-Einträge:

// FAQ-Einträge:
// ${faqCtx}

// Und diese Seiteninfos:
// ${pageCtx}

// **Regeln für Links**
// - Verwende **ausschließlich** relative Pfade aus den Seiteninfos (z. B. "/preise", "/contact").
// - beggine die verlinkte Seite mit <a href="https://www.komplettwebdesign.de">Zur Seite</a> 

// Gib dem Nutzer entweder eine wenn möglich präzise FAQ-Antwort, sonst durchsuche die FAQs und erstelle eine logsche Antwort
// oder einen Link (z.B. "/contact") zurück.
// `;

//   const chatRes = await openai.chat.completions.create({
//     model: 'gpt-4o-mini',
//     messages: [
//       { role: 'system', content: system },
//       { role: 'user',   content: userQ }
//     ]
//   });

//   res.json({ answer: chatRes.choices[0].message.content });
// }
