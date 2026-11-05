// Textkorrekturen an Blogartikeln aus dem GEO-Audit vom 05.11.2026 (Ich-Stimme, Briefing-Reste,
// Quellen, Tracking-Parameter, Neufassung Makler-Check). Angewendet mit
// scripts/applyBlogQualityCorrections.js: erst Vorschau, mit --apply samt Sicherung.
// Jede Ersetzung greift genau einmal; ein zweiter Lauf ändert nichts mehr.
import { IMMOBILIENMAKLER_HOMEPAGE_CHECK } from '../data/blogRewrites/immobilienmaklerHomepageCheck.js';

// Großgeschriebenes Du/Dein/Dir/Dich mitten im Satz wird kleingeschrieben (Duden-Empfehlung seit 2006).
// Am Satzanfang, nach Doppelpunkt oder am Anfang eines Elements bleibt es groß.
const MID_SENTENCE_DU = /(?<=[A-Za-zÄÖÜäöüß,;)–“]\s+)(Du|Dein|Deine|Deinen|Deinem|Deiner|Deines|Dir|Dich)\b/g;
export const lowercaseDuForms = (text) => String(text ?? '').replace(MID_SENTENCE_DU, (word) => word.toLowerCase());

export const BLOG_QUALITY_CORRECTIONS = Object.freeze({
  'seo-fuer-blumenladen': {
    replacements: [
      ['schau dir auch unsere Seite zu <a href="/branchen/webdesign-blumenladen">', 'schau dir auch meine Seite zu <a href="/branchen/webdesign-blumenladen">'],
      ['zeigen wir dir auch auf unserer Seite zu', 'zeige ich dir auch auf meiner Seite zu'],
      ['Dann schau dir unsere Seite zu', 'Dann schau dir meine Seite zu'],
      ['an oder nimm direkt Kontakt auf. Wir helfen dir dabei,', 'an oder nimm direkt Kontakt auf. Ich helfe dir dabei,'],
      ['findest du auf unserer Unterseite zu', 'findest du auf meiner Unterseite zu'],
      ['findest du auf unserer Seite auch einen Überblick zu unseren <a href="/pakete">', 'findest du auf meiner Seite auch einen Überblick über meine <a href="/pakete">'],
      ['kannst du uns jederzeit über', 'kannst du mir jederzeit über'],
      ['Dann sende uns einfach eine Anfrage. Wir schauen uns an, wie deine Website aktuell aufgestellt ist,', 'Dann sende mir einfach eine Anfrage. Ich schaue mir an, wie deine Website aktuell aufgestellt ist,']
    ]
  },
  'ki-suche-webdesign-2026': {
    replacements: [
      ['Wir prüfen, ob Deine Website technisch', 'Ich prüfe, ob Deine Website technisch'],
      ['Wir helfen Dir dabei, Deine Website klarer', 'Ich helfe Dir dabei, Deine Website klarer'],
      [
        'Für Komplett Webdesign kann zum Beispiel eine spezialisierte Seite wie <a href="/branchen/webdesign-blumenladen">Webdesign für Blumenläden</a> sinnvoll sein, weil',
        'Auf meiner eigenen Website gibt es zum Beispiel eine Seite zu <a href="/branchen/webdesign-blumenladen">Webdesign für Blumenläden</a>, weil'
      ],
      [
        'auf Deutsch ist er seit Oktober 2025 verfügbar.',
        'auf Deutsch ist er seit Oktober 2025 verfügbar (<a href="https://blog.google/intl/de-de/produkte/suchen-entdecken/ki-modus-startet-in-dach/">Ankündigung im Google-Blog</a>).'
      ],
      [
        'In der Google Search Console fließen Einblendungen in AI Overviews und AI Mode in den normalen Leistungsbericht ein. 2026 hat Google zusätzlich einen eigenen Bericht für KI-Funktionen angekündigt, der schrittweise freigeschaltet wird.',
        'In der Google Search Console zählen Einblendungen in AI Overviews und AI Mode zum normalen Leistungsbericht, Suchtyp „Web“ (<a href="https://developers.google.com/search/docs/appearance/ai-features">Google Search Central</a>). Seit Juni 2026 gibt es zusätzlich einen eigenen Bericht für generative KI-Funktionen. Er zeigt, wie oft deine Seiten in AI Overviews und AI Mode erschienen sind, und steht seit Ende August 2026 allen Websites zur Verfügung (<a href="https://developers.google.com/search/blog/2026/06/gen-ai-performance-reports">Ankündigung von Google</a>).'
      ]
    ],
    // Nach den Ersetzungen: einheitlich kleingeschriebenes du/dein in Text und FAQ.
    transforms: [lowercaseDuForms]
  },
  'mehr-anfragen-website-kontaktfehler-kmu-2026': {
    replacements: [
      ['<p>Die Jahreszahl dient hier als redaktioneller Rahmen für typische Fehlerbilder, die auf kleinen Unternehmenswebsites weiterhin häufig auftreten. Gemeint ist also keine belegte neue Entwicklung nur für dieses Jahr, sondern eine praktische Einordnung für aktuelle Website-Prüfungen.</p>', ''],
      ['https://developers.google.com/search/docs/essentials?utm_source=openai', 'https://developers.google.com/search/docs/essentials'],
      ['https://www.w3.org/WAI/tutorials/forms/?utm_source=openai', 'https://www.w3.org/WAI/tutorials/forms/']
    ]
  },
  [IMMOBILIENMAKLER_HOMEPAGE_CHECK.slug]: {
    fields: IMMOBILIENMAKLER_HOMEPAGE_CHECK.fields
  }
});

export const BLOG_QUALITY_SLUGS = Object.freeze(Object.keys(BLOG_QUALITY_CORRECTIONS));

const TEXT_FIELDS = ['content', 'excerpt', 'description', 'meta_description', 'og_description'];

function transformFaq(faq, transform) {
  if (!Array.isArray(faq)) return faq;
  return faq.map((item) => {
    const next = { ...item };
    for (const key of ['question', 'answer', 'name']) if (typeof next[key] === 'string') next[key] = transform(next[key]);
    if (next.acceptedAnswer?.text) next.acceptedAnswer = { ...next.acceptedAnswer, text: transform(next.acceptedAnswer.text) };
    return next;
  });
}

// Liefert den korrigierten Artikel und die Ersetzungen, die weder vorher noch nachher passen
// (dann hat sich der Text in der Datenbank geändert und die Korrektur muss neu geprüft werden).
export function correctBlogQuality(post) {
  const rule = BLOG_QUALITY_CORRECTIONS[post?.slug];
  if (!rule) return { post, unmatched: [] };
  const result = { ...post };
  const unmatched = [];
  const transforms = rule.transforms || [];
  // So sieht eine Ersetzung nach allen Umformungen aus, also nach einem früheren Lauf in der Datenbank.
  const finalForm = (text) => transforms.reduce((value, transform) => transform(value), text);
  for (const [from, to] of rule.replacements || []) {
    const content = String(result.content ?? '');
    const count = content.split(from).length - 1;
    if (count === 1) result.content = content.replace(from, () => to);
    else if (count > 1) unmatched.push({ from, reason: `${count} Treffer statt einem` });
    else if (!to || content.includes(to) || content.includes(finalForm(to))) continue;
    else unmatched.push({ from, reason: 'nicht gefunden' });
  }
  for (const transform of transforms) {
    for (const field of TEXT_FIELDS) if (typeof result[field] === 'string') result[field] = transform(result[field]);
    result.faq_json = transformFaq(result.faq_json, transform);
  }
  Object.assign(result, rule.fields || {});
  return { post: result, unmatched };
}
