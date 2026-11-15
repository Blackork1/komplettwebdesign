import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as cheerio from 'cheerio';
import { sanitizeArticleHtml } from '../../../services/contentAgent/articleSanitizer.js';

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, '../../..');
const imageDirectory = path.join(root, 'public/images/blog/webdesign-preise-2027');
const metadata = JSON.parse(await readFile(path.join(directory, 'metadata.json'), 'utf8'));
const article = await readFile(path.join(directory, 'article.html'), 'utf8');
const $ = cheerio.load(article, null, false);
const escape = value => String(value).replace(/[&<>"']/g, character => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[character]));
const money = value => `${value.toLocaleString('de-DE')} €`;

const faq = $('.article-faq').toArray().map(element => ({
  '@type': 'Question',
  name: $(element).find('h3').text().trim(),
  acceptedAnswer: { '@type': 'Answer', text: $(element).find('p').text().trim() }
}));
const fields = ['title', 'slug', 'excerpt', 'description', 'meta_title', 'meta_description', 'og_title', 'og_description', 'image_url', 'hero_image', 'hero_public_id', 'image_alt', 'category', 'featured', 'published', 'workflow_status', 'content_format', 'generated_by_ai'];
const post = Object.fromEntries(fields.map(field => [field, metadata[field]]));
post.content = sanitizeArticleHtml(article);
post.faq_json = faq;
await writeFile(path.join(directory, 'post.json'), `${JSON.stringify(post, null, 2)}\n`);

function text(x, y, value, size = 24, weight = 400, fill = '#0b2a46') {
  return `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}">${escape(value)}</text>`;
}
function svg(title, description, content) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900" role="img" aria-labelledby="title desc"><title id="title">${escape(title)}</title><desc id="desc">${escape(description)}</desc><rect width="1200" height="900" fill="#f6f2ec"/><g font-family="Arial, sans-serif">${content}</g></svg>\n`;
}
function costCard(x, title, subtitle, rows, accent) {
  return `<rect x="${x}" y="220" width="520" height="505" rx="24" fill="white"/>` +
    `<rect x="${x}" y="220" width="520" height="10" rx="5" fill="${accent}"/>` +
    text(x + 30, 286, title, 32, 700) + text(x + 30, 327, subtitle, 22, 400, '#526170') +
    rows.map((row, index) => `<circle cx="${x + 38}" cy="${380 + index * 65}" r="5" fill="${accent}"/>${text(x + 60, 389 + index * 65, row, 24)}`).join('');
}
const costsGraphic = svg('Website-Kosten: einmalig und laufend', 'Zwei Spalten unterscheiden die einmalige Erstellung und laufende Betriebskosten. Leistungen können gebündelt sein.',
  text(50, 73, 'DEIN WEBSITE-BUDGET 2027', 21, 700, '#b73510') +
  text(50, 135, 'Einmal erstellen. Laufend betreiben.', 43, 700) +
  text(50, 181, 'Beide Kostenarten gehören von Anfang an in deine Planung.', 24, 400, '#526170') +
  costCard(50, 'Einmalige Erstellung', 'Der vereinbarte Projektumfang', ['Konzept und Seitenstruktur', 'Design für alle Bildschirmgrößen', 'Texte und Bildbearbeitung¹', 'Programmierung und Tests', 'SEO-Grundlagen und Start'], '#c93c0c') +
  costCard(630, 'Laufender Betrieb', 'Monatlich, jährlich oder nach Nutzung', ['Hosting und Domain', 'E-Mail-Postfächer', 'Wartung nach Vereinbarung', 'Tools und Lizenzen', 'Gebühren bei Shop und Buchung'], '#0b2a46') +
  text(50, 779, '¹ Umfang nach Angebot. Neue Texte, Fotos und Sonderfunktionen separat klären.', 21, 400, '#526170') +
  text(50, 819, 'Enthaltene Leistungen nicht doppelt berechnen. Hosting ist nicht automatisch Wartung.', 21, 400, '#526170') +
  text(50, 868, 'KOMPLETT WEBDESIGN  ·  BERLIN', 19, 700));
await writeFile(path.join(imageDirectory, 'website-kosten-einmalig-laufend-2027.svg'), costsGraphic);

const maxTotal = 6500;
const barWidth = 760;
let bars = '';
metadata.budget_examples.forEach((example, index) => {
  const y = 290 + index * 160;
  const creationWidth = example.creation / maxTotal * barWidth;
  const recurringWidth = (example.three_years - example.creation) / maxTotal * barWidth;
  bars += text(55, y - 25, example.name, 26, 700);
  bars += `<rect x="55" y="${y}" width="${creationWidth}" height="46" fill="#0b2a46"/><rect x="${55 + creationWidth}" y="${y}" width="${recurringWidth}" height="46" fill="#c93c0c"/>`;
  bars += text(55 + creationWidth + recurringWidth + 20, y + 34, money(example.three_years), 29, 700);
  bars += text(55, y + 82, `${money(example.creation)} Erstellung + 36 × ${money(example.monthly)} Betrieb`, 22, 400, '#526170');
});
const budgetGraphic = svg('Website-Budget über drei Jahre', 'Beispielrechnung: Start 1.375 Euro, Business mit Wartung Basis 3.479 Euro, Wachstum mit Wartung Standard 5.919 Euro. Keine Komplettangebote; Zusatzleistungen sind nicht enthalten.',
  text(55, 72, 'BUDGETPLANUNG 2027', 21, 700, '#b73510') +
  text(55, 135, 'Was kostet die Website über drei Jahre?', 43, 700) +
  `<rect x="55" y="181" width="20" height="20" fill="#0b2a46"/>${text(87, 199, 'Einmalige Erstellung', 22)}<rect x="380" y="181" width="20" height="20" fill="#c93c0c"/>${text(412, 199, '36 Monate Betrieb, ggf. mit Wartung', 22)}` +
  bars +
  text(55, 775, 'Rechenannahme: Hosting 10 € + Domain/E-Mail 6 € pro Monat.', 22, 400, '#526170') +
  text(55, 808, 'Wartung Basis 39 €, Standard 79 € pro Monat; beim Start nicht eingerechnet.', 22, 400, '#526170') +
  text(55, 841, 'Ohne Extras und Preisänderungen. Keine verbindlichen Komplettangebote.', 22, 400, '#526170') +
  text(55, 880, 'KOMPLETT WEBDESIGN  ·  PREISSTAND NOVEMBER 2026', 18, 700));
await writeFile(path.join(imageDirectory, 'website-budget-drei-jahre-2027.svg'), budgetGraphic);

const localImage = source => `../../../public${source}`;
const previewBody = cheerio.load(post.content, null, false);
previewBody('img').each((_, image) => {
  const element = previewBody(image);
  element.attr('src', localImage(element.attr('src')));
  if (element.attr('srcset')) element.attr('srcset', element.attr('srcset').replaceAll('/images/', '../../../public/images/'));
});
previewBody('a[href^="/"]').each((_, link) => {
  const element = previewBody(link);
  element.attr('href', `https://www.komplettwebdesign.de${element.attr('href')}`);
});
const preview = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow"><meta name="description" content="${escape(metadata.meta_description)}">
<title>${escape(metadata.meta_title)} – Artikelvorschau</title>
<style>
@font-face{font-family:Inter;src:url('../../../public/fonts/inter-v19-latin-regular.woff2')}@font-face{font-family:Inter;src:url('../../../public/fonts/inter-v19-latin-600.woff2');font-weight:600}@font-face{font-family:Poppins;src:url('../../../public/fonts/poppins-v23-latin-700.woff2');font-weight:700}
:root{color-scheme:light;--ink:#0b2a46;--accent:#bb350d;--muted:#536171}*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:30px}body{margin:0;background:#f7f5f1;color:var(--ink);font-family:Inter,Arial,sans-serif;font-size:17px;line-height:1.8}a{color:var(--accent);text-underline-offset:3px}header{border-bottom:1px solid #d9d9d4;background:#fff}.topbar{max-width:1200px;padding:18px 28px;margin:auto;display:flex;align-items:center;justify-content:space-between;gap:20px}.brand{font-weight:600;letter-spacing:.04em;font-size:14px}.status{background:#f8ede6;color:#93310d;padding:4px 12px;border-radius:6px;font-size:12px;font-weight:600}.hero{max-width:1200px;margin:auto;padding:64px 28px 40px;display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:44px}.eyebrow{font-size:12px;color:var(--accent);font-weight:600;letter-spacing:.11em;text-transform:uppercase}h1,h2,h3{font-family:Poppins,Arial,sans-serif;line-height:1.3;overflow-wrap:break-word}h1{font-size:clamp(30px,3.6vw,46px);margin:15px 0 21px;letter-spacing:-.035em}h2{font-size:clamp(23px,2.5vw,30px);margin:2.2em 0 .7em;letter-spacing:-.025em}h3{font-size:21px;margin:1.6em 0 .65em}.hero p{color:var(--muted);font-size:17px}.hero img{display:block;width:100%;height:auto;border-radius:16px}.byline{font-size:13px;color:var(--muted);margin-top:24px}.layout{display:grid;grid-template-columns:minmax(0,850px) minmax(0,250px);gap:35px;max-width:1200px;margin:0 auto;padding:0 28px 64px}article{background:#fff;padding:clamp(20px,4vw,48px);border:1px solid #e1e3e4;border-radius:14px;min-width:0}article>:first-child{margin-top:0}article p{margin:0 0 1.15em}article li{margin-bottom:.55em}article ul,article ol{padding-left:1.35em}.rg-callout{padding:22px;background:#f7f3ed;border-left:4px solid #c93c0c;border-radius:0 8px 8px 0;margin:28px 0;font-size:16px}.rg-callout>:last-child{margin-bottom:0}.rg-callout h2{margin-top:0}.table-responsive{max-width:100%;overflow-x:auto;margin:26px 0;border:1px solid #dee3e7;border-radius:8px}table{border-collapse:collapse;font-size:14px;line-height:1.6;min-width:600px;width:100%}caption{text-align:left;padding:14px;background:#f4f5f6;color:var(--muted);font-size:12px}th,td{text-align:left;padding:13px 14px;vertical-align:top;border-bottom:1px solid #e2e6ea}thead th{background:var(--ink);color:#fff;font-weight:600}tbody tr:last-child>*{border-bottom:0}tbody th{font-weight:600}figure{margin:32px 0}figure img{width:100%;height:auto;border-radius:10px}figcaption{font-size:12px;color:var(--muted);line-height:1.65;margin-top:10px}.btn{display:inline-block;background:var(--accent);padding:11px 17px;color:white;text-decoration:none;border-radius:6px;font-weight:600;line-height:1.6}.side{align-self:start;position:sticky;top:26px;padding:22px;border:1px solid #dde1e4;background:white;border-radius:12px;font-size:14px}.side h2{font-size:18px;margin:0 0 15px}.side p{color:var(--muted)}.side ul{padding-left:18px}.side li{margin-bottom:9px}.side a{color:var(--ink)}.side .btn{color:white}.article-faq{border-top:1px solid #e0e5e9;padding:8px 0}.article-faq h3{font-size:19px;margin-top:20px}small{font-size:12px;color:var(--muted)}footer{padding:22px 28px 40px;max-width:1200px;margin:auto;color:var(--muted);font-size:12px}details{font-size:13px;border-top:1px solid #dde1e4;margin-top:22px;padding-top:16px}summary{cursor:pointer;font-weight:600}details p{overflow-wrap:anywhere}
@media(max-width:900px){.hero{gap:25px;padding-top:38px}.layout{display:block;max-width:850px}.side{position:static;margin-top:25px}}@media(max-width:600px){body{font-size:16px}.topbar{padding:14px 20px;align-items:flex-start}.brand{font-size:11px}.status{font-size:10px;white-space:nowrap}.hero{grid-template-columns:1fr;padding:30px 20px;gap:20px}.hero h1{margin-top:10px}.hero img{max-height:280px;object-fit:cover}.layout{padding:0 12px 35px}article{padding:23px 18px}.rg-callout{padding:17px 15px}.btn{font-size:14px}figure{margin:25px -5px}.side{margin:22px 8px}h2{scroll-margin-top:20px}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}@media print{header,.side,footer{display:none}.hero,.layout{display:block;padding:0}.hero img{max-width:450px}article{border:0;padding:0}.table-responsive{overflow:visible}table{min-width:0}body{font-size:11pt;background:white}}
</style></head><body>
<header><div class="topbar"><span class="brand">KOMPLETT WEBDESIGN · BERLIN</span><span class="status">Unveröffentlichte Artikelvorschau</span></div></header>
<main><section class="hero"><div><span class="eyebrow">Webdesign &amp; Kosten · Planung 2027</span><h1>${escape(metadata.title)}</h1><p>${escape(metadata.excerpt)}</p><div class="byline">Von Sören Blocksdorf · Recherche- und Preisstand: 15. November 2026</div></div><img src="${localImage(metadata.image_url)}" srcset="${localImage(metadata.image_url.replace('.webp', '-600.webp'))} 600w, ${localImage(metadata.image_url)} 1200w" sizes="(max-width:600px) calc(100vw - 40px), 550px" alt="${escape(metadata.image_alt)}" width="1200" height="675" fetchpriority="high"></section>
<div class="layout"><article>${previewBody.html()}</article><aside class="side"><h2>Dein Budget auf einen Blick</h2><p>Preisstand heute. Orientierung für deine Planung im kommenden Jahr.</p><ul><li><a href="#pakete">Aktuelle Website-Pakete</a></li><li><a href="#laufende-kosten">Monatliche Betriebskosten</a></li><li><a href="#beispielrechnungen">Drei Jahre durchrechnen</a></li><li><a href="#angebotscheck">Angebote vergleichen</a></li></ul><a class="btn" href="https://www.komplettwebdesign.de/kontakt?projektart=website-2027">Budget anfragen</a><details><summary>Redaktionelle Metadaten</summary><p><strong>SEO-Titel:</strong> ${escape(metadata.meta_title)}</p><p><strong>Meta-Beschreibung:</strong> ${escape(metadata.meta_description)}</p><p><strong>Geplante URL:</strong> ${escape(metadata.canonical_url)}</p><p>Diese Vorschau ist nicht indexierbar. Der Beitrag wurde nicht im CMS veröffentlicht.</p></details></aside></div></main>
<footer>Komplett Webdesign · Sören Blocksdorf · Titelbild und die drei Illustrationen im Artikeltext sind KI-generiert. Kostengrafiken: eigene Darstellung.</footer></body></html>`;
await writeFile(path.join(directory, 'preview.html'), preview);
console.log(JSON.stringify({ files: ['post.json', 'preview.html', '2 SVG-Grafiken'], faq_count: faq.length, title_length: metadata.meta_title.length, description_length: metadata.meta_description.length }, null, 2));
