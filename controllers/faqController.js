// controllers/faqController.js
import {
  getAllCategories,
  getFaqsByCategory,
  getCategoryById
} from '../models/faqModel.js';

const categoryMeta = {
  1: {
    icon: '/images/icons/general.svg',
    description: 'Neue hier? Starte mit den Basics.'
  },
  2: {
    icon: '/images/icons/payment.svg',
    description: 'Alles zu Bezahlung & Rechnungen.'
  },
  3: {
    icon: '/images/icons/content.svg',
    description: 'Abläufe & Inhalte verstehen.'
  },
  4: {
    icon: '/images/icons/tech.svg',
    description: 'Technische Details & Hosting.'
  },
  5: {
    icon: '/images/icons/special.svg',
    description: 'Unsere besonderen Leistungen.'
  }
};

export async function renderFaqPage(req, res) {
  try {
    // Grunddaten
    const catsRaw = await getAllCategories();
    const categories = catsRaw.map(c => ({
      id:          c.id,
      name:        c.name,
      icon:        categoryMeta[c.id]?.icon || '',
      description: categoryMeta[c.id]?.description || ''
    }));

    const selectedId = parseInt(req.query.cat, 10) || categories[0]?.id;
    const selectedCategory = await getCategoryById(selectedId);
    const faqs = await getFaqsByCategory(selectedId);
    
    res.render('faq', {
      title: 'Häufige Fragen – Komplettwebdesign',
      categories,
      selectedCategory,
      faqs,
      description: 'Hier finden Sie Antworten auf häufig gestellte Fragen zu unseren Dienstleistungen, Preisen und mehr.'
    });
  } catch (err) {
    console.error('Fehler beim Laden der FAQ-Seite:', err);
    res.status(500).send('Interner Serverfehler');
  }
}
