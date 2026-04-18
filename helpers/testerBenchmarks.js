// helpers/testerBenchmarks.js
//
// Branchen- bzw. Geschäftstyp-Benchmarks für den Score-Teaser.
// Werte sind konservativ kalibriert (Durchschnitt von Audits für
// typische KMU-Websites). Sie werden im Ergebnis-Teaser eingeblendet,
// um dem Nutzer einen Vergleichswert zu geben:
//   "Score 47 – Durchschnitt im Bereich Gastronomie: 62".
//
// Wenn businessType nicht zugeordnet werden kann, wird der "default"-Wert
// genommen. Der Mapping-Algorithmus ist absichtlich fuzzy – der Nutzer gibt
// freitext ein.

const BENCHMARKS = {
  default: { avg: 58, label_de: 'Durchschnitt aller analysierten Websites', label_en: 'Average across all analyzed websites' },
  restaurant: { avg: 52, label_de: 'Durchschnitt Gastronomie', label_en: 'Restaurant industry average' },
  handwerker: { avg: 48, label_de: 'Durchschnitt Handwerk', label_en: 'Trade industry average' },
  arzt: { avg: 63, label_de: 'Durchschnitt Praxis / Arzt', label_en: 'Medical practice average' },
  anwalt: { avg: 66, label_de: 'Durchschnitt Kanzlei', label_en: 'Law firm average' },
  ecommerce: { avg: 68, label_de: 'Durchschnitt Online-Shop', label_en: 'E-commerce average' },
  agency: { avg: 72, label_de: 'Durchschnitt Agentur', label_en: 'Agency average' },
  saas: { avg: 74, label_de: 'Durchschnitt SaaS', label_en: 'SaaS average' },
  realestate: { avg: 57, label_de: 'Durchschnitt Immobilien', label_en: 'Real estate average' },
  consultant: { avg: 62, label_de: 'Durchschnitt Beratung', label_en: 'Consulting average' },
  fitness: { avg: 54, label_de: 'Durchschnitt Fitness / Studio', label_en: 'Fitness studio average' },
  beauty: { avg: 55, label_de: 'Durchschnitt Beauty / Salon', label_en: 'Beauty salon average' },
  automotive: { avg: 50, label_de: 'Durchschnitt Auto / KFZ', label_en: 'Automotive average' },
  education: { avg: 65, label_de: 'Durchschnitt Bildung', label_en: 'Education average' }
};

// Freitext -> Kategorie-Slug
const KEYWORDS = [
  { re: /restaurant|gastro|caf[eé]|bistro|pizzeria|imbiss|hotel|bar|kneipe/i, slug: 'restaurant' },
  { re: /handwerk|maler|dachdecker|installateur|sanit[aä]r|elektr|schreiner|tischler|fliesen|kfz.?werkstatt|klempner|gartenbau|landschaft/i, slug: 'handwerker' },
  { re: /werkstatt|autohaus|kfz|automobil|auto/i, slug: 'automotive' },
  { re: /arzt|praxis|zahnarzt|mediziner|klinik|therapie|physio|heilpraktiker/i, slug: 'arzt' },
  { re: /anwalt|kanzlei|rechtsanwalt|notar|jurist|jura|steuerberat/i, slug: 'anwalt' },
  { re: /shop|ecommerce|online.?shop|online.?store|e-commerce|store/i, slug: 'ecommerce' },
  { re: /agentur|werbeagentur|marketing.?agentur|webagentur|design.?agentur/i, slug: 'agency' },
  { re: /saas|software|cloud|app|plattform|portal/i, slug: 'saas' },
  { re: /immobilien|makler|realestate|real.?estate|wohnung|haus/i, slug: 'realestate' },
  { re: /beratung|consult|coach|trainer|berater/i, slug: 'consultant' },
  { re: /fitness|gym|studio|personal.?trainer|yoga|pilates/i, slug: 'fitness' },
  { re: /beauty|kosmetik|friseur|salon|nagel|barbier/i, slug: 'beauty' },
  { re: /schule|bildung|akademie|kurs|seminar|education|universit/i, slug: 'education' }
];

/**
 * Liefert einen Benchmark passend zum businessType-Freitext.
 * @param {string} businessType
 * @param {'de'|'en'} [locale='de']
 * @returns {{slug: string, avg: number, label: string}}
 */
export function getBenchmarkForBusinessType(businessType, locale = 'de') {
  const input = String(businessType || '').toLowerCase();
  let slug = 'default';
  if (input) {
    for (const { re, slug: s } of KEYWORDS) {
      if (re.test(input)) { slug = s; break; }
    }
  }
  const entry = BENCHMARKS[slug] || BENCHMARKS.default;
  const label = locale === 'en' ? entry.label_en : entry.label_de;
  return { slug, avg: entry.avg, label };
}

export default getBenchmarkForBusinessType;
