import { normalizeLegacyPublicCopy, stripEmbeddedStructuredData } from '../util/legacyPublicCopy.js';

export const AUDITED_LEGACY_BLOG_SLUGS = ['full-service-webdesign-in-berlin', 'local-seo-berlin-fuer-freelancer'];
export const AUDITED_BLOG_META = {
  'full-service-webdesign-in-berlin': {
    meta_description: 'Webdesign in Berlin aus einer Hand: Planung, Gestaltung, technische SEO und Betreuung für dein Unternehmen. Kontakt: +49 155 11245048.'
  },
  'local-seo-berlin-fuer-freelancer': {
    meta_description: 'Local SEO für Freelancer und kleine Unternehmen in Berlin: dein Google-Unternehmensprofil, klare Leistungen und passende Inhalte auf deiner Website.'
  },
  'google-unternehmensprofil-website-lokale-signale-berlin-2026': {
    meta_description: 'So stimmen Berliner Unternehmen Website und Google-Unternehmensprofil ab: mit einheitlichen Kontaktdaten, passenden Leistungen und lokalen Signalen.'
  },
  'google-unternehmensprofil-website-widerspruch-berlin-brandenburg': {
    meta_description: 'Widersprüche zwischen Website und Google-Unternehmensprofil erkennen und beheben: Kontaktdaten, Leistungen und lokale Angaben für Berlin und Brandenburg.'
  },
  'ki-sichtbarkeit-website-berlin-2026': {
    meta_title: 'KI-Sichtbarkeit 2026: Inhalte verständlich strukturieren',
    meta_description: 'Was KI-Sichtbarkeit für deine Website bedeutet: klare Inhalte, überprüfbare Angaben und technische Grundlagen für kleine Unternehmen in Berlin.'
  },
  'local-seo-berlin-2026-website-profilsignale': {
    meta_description: 'Local SEO in Berlin: Verbinde deine Website mit einem stimmigen Unternehmensprofil, klaren Kontaktdaten und passenden Inhalten für dein Einsatzgebiet.'
  },
  'mehr-anfragen-website-kontaktfehler-kmu-2026': {
    meta_description: 'Diese Kontaktfehler erschweren Website-Anfragen: Prüfe Formulare, mobile Bedienung und Kontaktwege für dein kleines Unternehmen in Berlin und Brandenburg.'
  },
  'relaunch-wegen-ki-suche': {
    meta_description: 'Braucht deine Website wegen der KI-Suche einen Relaunch? Prüfe Inhalte, Technik und Anfragewege, bevor du dich für einen Neustart entscheidest.'
  },
  'website-audit-relaunch-kmu-berlin-brandenburg': {
    meta_description: 'Website-Audit oder Relaunch? Prüfe Inhalte, Technik und Kontaktwege deines Unternehmens in Berlin und Brandenburg und setze die wichtigsten Schritte um.'
  },
  'website-relaunch-seo-ohne-sichtbarkeitsverlust-planen': {
    meta_description: 'Plane deinen Website-Relaunch mit SEO: Sichere wichtige Inhalte, ordne alte URLs zu und prüfe Weiterleitungen, interne Links und die neue Seitenstruktur.'
  },
  'website-relaunch-inhalte-nicht-loeschen-2026': {
    meta_title: 'Website-Relaunch 2026: Wichtige Inhalte erhalten'
  }
};

const tokenPricing = {
  priceLabel: key => `{{package:${key}.priceLabel}}`,
  lowestLabel: () => '{{lowestPackagePriceLabel}}'
};
const EDITABLE_TEXT_FIELDS = ['title', 'description', 'excerpt', 'meta_title', 'meta_description', 'og_title', 'og_description', 'content', 'faq_json'];

export function correctAuditedPost(post) {
  const result = { ...post };
  if (AUDITED_LEGACY_BLOG_SLUGS.includes(post.slug)) {
    for (const field of EDITABLE_TEXT_FIELDS) {
      if (post[field] == null) continue;
      let value = post[field];
      if (typeof value === 'string') {
        value = stripEmbeddedStructuredData(value);
        // In these two audited articles every 1.499 € anchor belongs to the retired Premium offer.
        value = value.replace(/(?<![\d.])1\.499\s*(?:€|EUR)/g, '{{price.wachstum}}');
        value = value.replace(/<section\b[^>]*\bid="pakete"[^>]*>[\s\S]*?<\/section>/gi,
          '<section id="pakete"><h2>Aktuelle Website-Pakete</h2><p>Start {{price.start}}, Business {{price.business}}, Wachstum {{price.wachstum}}; individuelle Projekte {{price.individuell}}.</p><p>Der vereinbarte Umfang entscheidet über den Preis. Hosting, Domain, E-Mail, Wartung und Sonderfunktionen werden separat vereinbart.</p><p><a href="/pakete">Pakete und Leistungsumfang vergleichen</a></p></section>');
      }
      result[field] = normalizeLegacyPublicCopy(value, tokenPricing);
    }
  }
  return { ...result, ...AUDITED_BLOG_META[post.slug] };
}
