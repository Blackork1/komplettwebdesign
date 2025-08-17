// controllers/faqController.js
import {
  getAllCategories,
  getFaqsByCategory,
  getCategoryById
} from '../models/faqModel.js';

/** (Optional) Wenn du später alle FAQs als JSON-LD brauchst,
 *  ohne die Seite zu rendern, nutzen wir diese Hilfsfunktion. */
async function fetchAllFaqsGrouped() {
  const cats = await getAllCategories();
  const out = [];
  for (const c of cats) {
    const list = await getFaqsByCategory(c.id);
    out.push(...list.map(f => ({ ...f, category_id: c.id, category_name: c.name })));
  }
  return out;
}

/** JSON-LD Builder für eine Liste von FAQs (so wie sie gerendert werden) */
function buildFaqJsonLd(faqRows) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqRows.map(r => ({
      '@type': 'Question',
      name: r.question,
      acceptedAnswer: {
        '@type': 'Answer',
        // Wenn Antworten HTML enthalten, kannst du hier auf Plain-Text „strippen“
        // (Google erlaubt etwas HTML; so lassen wir es roh aus der DB):
        text: r.answer
      }
    }))
  };
}

const categoryMeta = {
  1: { icon: '/images/icons/general.svg',  description: 'Neue hier? Starte mit den Basics.' },
  2: { icon: '/images/icons/payment.svg',  description: 'Alles zu Bezahlung & Rechnungen.' },
  3: { icon: '/images/icons/content.svg',  description: 'Abläufe & Inhalte verstehen.' },
  4: { icon: '/images/icons/tech.svg',     description: 'Technische Details & Hosting.' },
  5: { icon: '/images/icons/special.svg',  description: 'Unsere besonderen Leistungen.' }
};

/** HTML-Render der FAQ-Seite + eingebettetes JSON-LD
 *  Das JSON-LD umfasst GENAU die FAQs der ausgewählten Kategorie,
 *  sodass es 1:1 mit den sichtbaren Inhalten übereinstimmt. */
export async function renderFaqPage(req, res) {
  try {
    // Kategorien + Meta anreichern
    const catsRaw = await getAllCategories();
    const categories = catsRaw.map(c => ({
      id:          c.id,
      name:        c.name,
      icon:        categoryMeta[c.id]?.icon || '',
      description: categoryMeta[c.id]?.description || ''
    }));

    // Ausgewählte Kategorie (per ?cat=)
    const selectedId = parseInt(req.query.cat, 10) || categories[0]?.id;
    const selectedCategory = await getCategoryById(selectedId);

    // FAQs der ausgewählten Kategorie
    const faqs = await getFaqsByCategory(selectedId);

    // JSON-LD nur für die auf der Seite gerenderten FAQs erzeugen
    const faqJsonLd = buildFaqJsonLd(faqs);

    // Caching für Besucher (anpassen wenn du Login/Personalisierung nutzt)
    res.set('Cache-Control', 'public, max-age=300');

    res.render('faq', {
      title: 'Häufige Fragen – KomplettWebdesign',
      description: 'Hier findest du Antworten auf häufig gestellte Fragen zu Leistungen, Preisen, Ablauf, Technik & DSGVO.',
      categories,
      selectedCategory,
      faqs,
      // Wichtig: als String an EJS geben und dort mit <%- ... %> ungeescaped ausgeben
      faqJsonLd: JSON.stringify(faqJsonLd)
    });
  } catch (err) {
    console.error('Fehler beim Laden der FAQ-Seite:', err);
    res.status(500).send('Interner Serverfehler');
  }
}

/** Optionaler Endpunkt: reines FAQ-JSON-LD siteweit
 *  (nur aktivieren, wenn die Seite irgendwo ALLE Fragen enthält,
 *  sonst kann Google die Nicht-Übereinstimmung bemängeln). */
export async function serveFaqJsonLd(req, res) {
  try {
    const allFaqs = await fetchAllFaqsGrouped();
    const jsonLd = buildFaqJsonLd(allFaqs);
    res.setHeader('Content-Type', 'application/ld+json; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=300');
    res.send(jsonLd);
  } catch (err) {
    console.error('Fehler beim Erzeugen des FAQ-JSON-LD:', err);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
}
