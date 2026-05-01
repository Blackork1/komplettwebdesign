import pool from '../util/db.js';

const content = {
  title: 'Immobilienmakler Website Berlin | SEO, Exposés & Leads',
  description: 'Immobilienmakler Website in Berlin: Webdesign mit Exposé-Seiten, Bewertungstool, Local SEO, GEO-Struktur und Lead-Formularen für mehr Eigentümer-Anfragen.',
  hero_h1: 'Immobilienmakler Website erstellen lassen in Berlin',
  hero_h2: 'Webdesign für Makler mit Exposés, Bewertungstool und lokalen Eigentümer-Anfragen',
  hero_checks: [
    'Exposé-Seiten, Objektfilter und 360°-Rundgänge sauber strukturiert',
    'Local SEO für Bezirke, Leistungen und Eigentümer-Suchanfragen',
    'Bewertungstool, Rückruf-CTA und Kontaktformulare als Lead-Magneten',
    'Transparente Pakete ab 499 EUR und persönliche Umsetzung aus Berlin'
  ],
  hero_image_alt: 'Moderne Immobilienmakler Website mit Exposé- und Anfragebereich',
  warum_upper: `<p>Wer heute eine Immobilie verkaufen, kaufen oder vermieten möchte, startet die Recherche fast immer digital. Für Makler bedeutet das: Die eigene Website muss in wenigen Sekunden Vertrauen aufbauen, lokale Kompetenz zeigen und Interessenten zu einer klaren Anfrage führen.</p>
<p>Eine starke <strong>Immobilienmakler-Website</strong> verbindet hochwertige Exposés, Referenzen, Team, Verkaufsprozess und Kontaktwege. Sie wirkt nicht wie ein zweites Immobilienportal, sondern wie dein eigener digitaler Akquise-Standort.</p>`,
  warum_lower: `<p><strong>Besonders wichtig für Makler:</strong> Eigentümern muss sofort klar werden, warum sie dir ihr Objekt anvertrauen sollen. Deshalb planen wir Seiten für Immobilienbewertung, Referenzen, lokale Marktkenntnis, Suchmaschinenoptimierung und einfache Kontaktaufnahme zusammen.</p>`,
  unverzichtbar_intro: 'Eigentümer, Käufer und Mieter vergleichen online. Eine schnelle, mobile und SEO-starke Makler-Website mit klaren Exposés, Bewertungstool, Vertrauenselementen und Kontaktoptionen hilft dir, unabhängiger von Portalen zu werden und qualifizierte Anfragen zu gewinnen.',
  unverzichtbar_h3: 'Was eine Makler-Website leisten muss:',
  stats_cards: [
    {
      icon: '70%',
      label: 'Online-Suche',
      body: 'Bitkom berichtet: 70 Prozent der Menschen in Deutschland, die bereits nach einer Wohnung oder einem Haus gesucht haben, nutzten dafür teilweise oder ausschließlich das Internet.'
    },
    {
      icon: '65%',
      label: '360°-Fotos',
      body: 'Laut Bitkom legen 65 Prozent bei der Immobiliensuche Wert auf 360°-Fotos. Gute Bildstrecken, Rundgänge und Grundrisse gehören deshalb sichtbar in die Website-Struktur.'
    },
    {
      icon: '96%',
      label: 'Portal-Druck',
      body: 'ImmoScout24 und Propstack meldeten 2025: 96 Prozent der Makler setzen auf Immobilienportale. Die eigene Website sollte diese Reichweite ergänzen und Leads langfristig absichern.'
    },
    {
      icon: '79%',
      label: 'Digitales Budget',
      body: 'In derselben Maklerbefragung flossen 79 Prozent der Marketingbudgets in digitale Kanäle. Wer hier investiert, braucht eine Website, die messbar Anfragen auslöst.'
    },
    {
      icon: '40%',
      label: 'Digitalisierung',
      body: 'Eine ImmoScout24-Umfrage unter mehr als 500 Maklerinnen und Maklern zeigte 2024: 40 Prozent investierten verstärkt in Digitalisierung, um Nachfrage zu steigern.'
    }
  ],
  seo_items: [
    {
      title: 'Lokale Suchintention',
      text: 'Wir planen Suchbegriffe wie "Immobilienmakler Berlin Mitte", "Haus verkaufen Berlin" oder "Immobilienbewertung Berlin" nicht isoliert, sondern als Seitenstruktur mit klarer Anfrageführung.',
      img_alt: 'Lokale Keyword-Struktur für Immobilienmakler',
      img_url: 'https://res.cloudinary.com/dvd2cd2be/image/upload/v1756655275/admin_gallery/hjvleomny0wd8xxtjnzi.webp'
    },
    {
      title: 'Eigentümer-Landingpages',
      text: 'Bewertung, Verkaufsprozess, Referenzen und Marktkenntnis bekommen eigene Antwortbereiche. So erkennt Google die Relevanz und Besucher erkennen sofort den Nutzen.',
      img_alt: 'Landingpage für Immobilieneigentümer',
      img_url: 'https://res.cloudinary.com/dvd2cd2be/image/upload/v1756655506/admin_gallery/zr3urtt9yps048wnrua4.webp'
    },
    {
      title: 'Objekt-SEO',
      text: 'Exposé-Seiten erhalten sprechende URLs, Title, Description, strukturierte Daten, starke Bilder und interne Links zu Bewertung, Kontakt und lokalen Ratgeberinhalten.',
      img_alt: 'Objektseite mit SEO-Struktur',
      img_url: 'https://res.cloudinary.com/dvd2cd2be/image/upload/v1756655434/admin_gallery/pcimwespifkdsykyip13.webp'
    },
    {
      title: 'GEO für KI-Antworten',
      text: 'Definitionen, kurze Antwortblöcke, FAQ, Quellen und Schema helfen KI-Suchsystemen, Inhalte sauber zu extrahieren und deine Seite als Quelle zu verstehen.',
      img_alt: 'GEO-Struktur für KI-Suche',
      img_url: 'https://res.cloudinary.com/dvd2cd2be/image/upload/v1758978624/admin_gallery/nuhgls3vy4xiallbxwix.webp'
    },
    {
      title: 'Messbare Anfragewege',
      text: 'CTAs wie "Immobilienbewertung anfragen", "Exposé besprechen" und "Rückruf vereinbaren" werden an passenden Entscheidungspunkten platziert und per Event-Tracking messbar gemacht.',
      img_alt: 'Messbare Lead-Formulare für Makler-Websites',
      img_url: 'https://res.cloudinary.com/dvd2cd2be/image/upload/v1756657030/admin_gallery/qwxxe97wnkx4gusxffcb.webp'
    }
  ],
  funktionen_items: [
    {
      text: 'Objekte mit Fotos, Grundrissen, Videos, Energiekennwerten und 360°-Rundgängen professionell präsentieren.',
      title: 'Exposé-Seiten',
      icon_url: '/images/icons/galery.svg'
    },
    {
      text: 'Interessenten finden schneller passende Objekte nach Lage, Preis, Zimmerzahl, Status und Ausstattung.',
      title: 'Suche und Filter',
      icon_url: '/images/icons/bookmark.svg'
    },
    {
      text: 'Kontaktformulare, Rückrufwunsch, WhatsApp-Link und Newsletter holen Anfragen dort ab, wo Interesse entsteht.',
      title: 'Lead-Erfassung',
      icon_url: '/images/icons/chat.svg'
    },
    {
      text: 'Eine kostenlose Ersteinschätzung macht aus anonymen Eigentümer-Besuchen konkrete Verkaufschancen.',
      title: 'Bewertungstool',
      icon_url: '/images/icons/kontakte.svg'
    },
    {
      text: 'Google Maps, Telefonnummer, Einzugsgebiet und Bezirksbezug zeigen sofort, wo du aktiv bist.',
      title: 'Lokale Sichtbarkeit',
      icon_url: '/images/icons/door.svg'
    },
    {
      text: 'Referenzen, Kundenstimmen, Team und Prozess reduzieren Unsicherheit bei Eigentümerinnen und Eigentümern.',
      title: 'Vertrauen',
      icon_url: '/images/icons/bi_table.svg'
    }
  ],
  vorteile: {
    pros: [
      'Mehr qualifizierte Eigentümer- und Kaufinteressenten-Anfragen',
      'Professionelle Präsentation von Objekten, Team und Referenzen',
      'Weniger Abhängigkeit von Immobilienportalen',
      'Bessere lokale Auffindbarkeit für Berlin und Bezirke',
      'Messbare Kontaktwege für Bewertung, Rückruf und Exposé-Anfrage'
    ],
    cons: [
      'Veraltete Exposés und fehlende Aktualität schaden Vertrauen',
      'Ohne mobile Optimierung springen Interessenten schnell ab',
      'Ohne SEO, Schema und klare CTA-Struktur bleibt die Website oft unsichtbar'
    ]
  },
  tipps_items: [
    {
      heading: 'Eigentümer zuerst',
      text: 'Zeige Bewertung, Verkaufsprozess, Referenzen und lokale Marktkenntnis sichtbar vor allgemeinen Agenturtexten.',
      img_alt: 'Strategie für Eigentümer-Anfragen',
      img_url: 'https://res.cloudinary.com/dvd2cd2be/image/upload/v1758979160/admin_gallery/bcrwvvfjsy5obbfzrnws.webp'
    },
    {
      heading: 'CTA pro Intent',
      text: 'Nutze getrennte Handlungswege: Bewertung anfragen, Exposé erhalten, Rückruf vereinbaren oder Projekt besprechen.',
      img_alt: 'Klare Call-to-Action-Struktur',
      img_url: 'https://res.cloudinary.com/dvd2cd2be/image/upload/v1758979179/admin_gallery/ka0mrtecj0b4ptvzvea8.webp'
    },
    {
      heading: 'Objekte aktuell halten',
      text: 'Kennzeichne verkauft, reserviert oder neu sichtbar. Aktualität ist Vertrauenssignal und verhindert unnötige Anfragen.',
      img_alt: 'Aktualität auf Makler-Websites',
      img_url: 'https://res.cloudinary.com/dvd2cd2be/image/upload/v1758979207/admin_gallery/oe0s7nxbw8tjlgyc9ngv.webp'
    },
    {
      heading: 'FAQ für GEO',
      text: 'Beantworte echte Fragen knapp und eigenständig: Kosten, Dauer, Objektpflege, SEO, Bewertungen und Lead-Formulare.',
      img_alt: 'FAQ und GEO-Struktur',
      img_url: 'https://res.cloudinary.com/dvd2cd2be/image/upload/v1758979197/admin_gallery/pkwskoehcpwhrxjwhoc4.webp'
    },
    {
      heading: 'Speed vor Effekt',
      text: 'Immobilienbilder dürfen groß wirken, müssen aber optimiert, lazy-loaded und mobil stabil bleiben.',
      img_alt: 'Schnelle Immobilienmakler Website',
      img_url: 'https://res.cloudinary.com/dvd2cd2be/image/upload/v1758979188/admin_gallery/dxieq3vnxspku2nrek9o.webp'
    }
  ],
  cta_headline: 'Bereit für eine Makler-Website, die Eigentümer-Anfragen gewinnt?',
  cta_text: 'Wir planen Design, Texte, SEO, GEO-Struktur, Exposé-Bereiche und Kontaktwege so, dass dein Webauftritt Vertrauen aufbaut und messbar mehr qualifizierte Anfragen auslöst.',
  faq_items: [
    {
      q: 'Was kostet eine Immobilienmakler-Website?',
      a: '<p>Ein professioneller Einstieg ist ab 499 EUR möglich. Für Makler ist meist das Business- oder Premium-Paket sinnvoll, wenn mehrere Unterseiten, SEO-Struktur, Exposé-Bereiche oder ein Bewertungstool geplant sind.</p>',
      link_url: '/pakete',
      link_label: 'Pakete ansehen'
    },
    {
      q: 'Welche Inhalte braucht eine Makler-Website?',
      a: '<p>Wichtig sind Startseite, Leistungen, Immobilienbewertung, Referenzen, Team, Kontakt, lokale Marktbereiche, FAQ und bei aktiven Objekten eigene Exposé-Seiten mit starken Bildern und klaren Kontaktwegen.</p>'
    },
    {
      q: 'Kann ich Immobilien später selbst pflegen?',
      a: '<p>Ja. Je nach Umfang kann ein pflegbarer Bereich für Exposés, Bilder, Status, Grundrisse und Objektinformationen eingeplant werden.</p>'
    },
    {
      q: 'Hilft SEO Immobilienmaklern wirklich bei Anfragen?',
      a: '<p>Ja, wenn die Website echte Suchintentionen abdeckt: Immobilienbewertung, Hausverkauf, lokale Bezirke, Maklervergleich, Referenzen und konkrete Objektseiten. SEO ersetzt keine Portale, macht dich aber unabhängiger und sichtbarer.</p>'
    },
    {
      q: 'Was bedeutet GEO für Immobilienmakler?',
      a: '<p>GEO bedeutet, Inhalte so klar, strukturiert und belegbar aufzubauen, dass KI-Suchsysteme sie leicht verstehen können. Dafür nutzen wir kurze Antwortblöcke, FAQ, Quellen, interne Links und strukturierte Daten.</p>'
    },
    {
      q: 'Wie schnell kann eine Makler-Website online gehen?',
      a: '<p>Ein kompakter Onepager ist meist in 2 bis 4 Wochen realistisch. Eine mehrseitige Makler-Website mit SEO-Struktur, Exposé-Bereichen und Lead-Funktionen liegt je nach Umfang eher bei 4 bis 8 Wochen.</p>'
    }
  ],
  blocks: [
    {
      type: 'richtext',
      position: 'after_warum',
      html: `<section class="industry-answer-block animate-on-scroll">
  <p class="industry-eyebrow">Kurzantwort für Google und KI-Suche</p>
  <h2>Was macht eine gute Immobilienmakler-Website aus?</h2>
  <p>Eine gute Immobilienmakler-Website macht drei Dinge gleichzeitig: Sie zeigt Kompetenz im lokalen Markt, präsentiert Objekte und Referenzen hochwertig und führt Eigentümer oder Interessenten ohne Umwege zur passenden Anfrage.</p>
  <div class="industry-answer-grid">
    <div class="industry-panel">
      <h3>Für Eigentümer</h3>
      <p>Bewertung, Verkaufsprozess, Referenzen und Rückruf-CTA senken die Hemmschwelle für die erste Kontaktaufnahme.</p>
    </div>
    <div class="industry-panel">
      <h3>Für Suchende</h3>
      <p>Exposé-Seiten, Filter, Bilder, Grundrisse und Statusinformationen helfen schnell zu entscheiden, ob ein Objekt passt.</p>
    </div>
    <div class="industry-panel">
      <h3>Für Google und KI</h3>
      <p>Klare H-Struktur, FAQ, Quellen, Schema und lokale Begriffe machen Inhalte leichter crawlbar, zitierbar und vergleichbar.</p>
    </div>
  </div>
</section>`
    },
    {
      type: 'richtext',
      position: 'after_unverzichtbar',
      html: `<section class="industry-proof-block animate-on-scroll">
  <p class="industry-eyebrow">Conversion-Struktur</p>
  <h2>Die Seitenstruktur für mehr Eigentümer-Anfragen</h2>
  <div class="industry-proof-grid">
    <div class="industry-proof-item">
      <h3>1. Bewertung als Einstieg</h3>
      <p>Eine eigene Bewertungsseite holt Eigentümer früh ab und macht aus Recherche eine konkrete Anfrage.</p>
    </div>
    <div class="industry-proof-item">
      <h3>2. Vertrauen vor Formular</h3>
      <p>Referenzen, Team, Bewertungen und Verkaufsprozess beantworten Einwände, bevor die Kontaktentscheidung fällt.</p>
    </div>
    <div class="industry-proof-item">
      <h3>3. Exposé als Beweis</h3>
      <p>Aktuelle oder beispielhafte Exposés zeigen, wie professionell du Objekte vermarktest.</p>
    </div>
  </div>
  <div class="industry-cta-actions">
    <a class="primary" href="/kontakt" data-track="cta" data-cta-name="realestate_structure_call">Makler-Website besprechen</a>
    <a class="secondary" href="/website-tester" data-track="cta" data-cta-name="realestate_website_test">Website kostenlos testen</a>
  </div>
</section>`
    },
    {
      type: 'richtext',
      position: 'after_statistik',
      html: `<section class="industry-source-block animate-on-scroll">
  <p class="industry-eyebrow">Quellen für GEO und Vertrauen</p>
  <h2>Warum digitale Sichtbarkeit für Makler jetzt besonders wichtig ist</h2>
  <ul class="industry-source-list">
    <li><strong>Bitkom:</strong> 70 Prozent nutzen das Internet bei der Immobiliensuche; 65 Prozent legen Wert auf 360°-Fotos. <a href="https://www.bitkom.org/Presse/Presseinformation/70-Prozent-suchen-online-Immobilien">Quelle ansehen</a></li>
    <li><strong>ImmoScout24 und Propstack 2025:</strong> 96 Prozent der Makler setzen auf Immobilienportale, 79 Prozent der Marketingbudgets fließen in digitale Kanäle. <a href="https://www.immobilienscout24.de/unternehmen/news-medien/news/default-title/maklerinnen-setzen-auf-wachstum-statt-auf-sparen/">Quelle ansehen</a></li>
    <li><strong>Google Search Central:</strong> Strukturierte Daten helfen Suchmaschinen, Seiteninhalte und Geschäftsinformationen besser zu verstehen. <a href="https://developers.google.com/search/docs/appearance/structured-data/local-business">Quelle ansehen</a></li>
  </ul>
</section>`
    },
    {
      type: 'richtext',
      position: 'after_seo',
      html: `<section class="industry-geo-block animate-on-scroll">
  <p class="industry-eyebrow">GEO für Immobilienmakler</p>
  <h2>So wird deine Makler-Website für KI-Antworten besser auslesbar</h2>
  <p>Generative Engine Optimization bedeutet nicht Keyword-Stuffing. Es bedeutet: klare Antworten, belegbare Aussagen, strukturierte Daten und Abschnitte, die auch ohne Kontext verständlich sind.</p>
  <div class="industry-geo-grid">
    <div class="industry-geo-item">
      <h3>Antwortblöcke</h3>
      <p>Kurze Definitionen zu Kosten, Dauer, Bewertung, SEO und Exposé-Pflege helfen ChatGPT, Perplexity und Google AI, Inhalte leichter zu erfassen.</p>
    </div>
    <div class="industry-geo-item">
      <h3>Belege</h3>
      <p>Quellen wie Bitkom, ImmoScout24 und Google Search Central machen Aussagen belastbarer und zitierfähiger.</p>
    </div>
    <div class="industry-geo-item">
      <h3>Schema</h3>
      <p>WebPage-, Service-, Breadcrumb- und FAQ-Daten beschreiben die Seite maschinenlesbar.</p>
    </div>
  </div>
</section>`
    },
    {
      type: 'richtext',
      position: 'after_preise',
      html: `<section class="industry-answer-block animate-on-scroll">
  <p class="industry-eyebrow">Kostenfaktoren</p>
  <h2>Was beeinflusst den Preis einer Immobilienmakler-Website?</h2>
  <p>Der Preis hängt vor allem davon ab, ob du eine kompakte Vertrauensseite oder eine vollwertige Makler-Website mit Objektpflege und Lead-Funktionen brauchst.</p>
  <ul class="industry-compact-list">
    <li>Anzahl der Seiten: Startseite, Bewertung, Leistungen, Referenzen, Kontakt, Bezirksseiten</li>
    <li>Exposé-Verwaltung: manuell gepflegt, CMS-basiert oder mit Schnittstelle</li>
    <li>Medien: Bildergalerien, Grundrisse, Videos, 360°-Rundgänge</li>
    <li>Lead-Funktionen: Bewertungstool, Rückruf, Kontaktformular, Terminbuchung</li>
    <li>SEO und GEO: lokale Inhalte, FAQ, Schema, Quellen und interne Verlinkung</li>
  </ul>
</section>`
    },
    {
      type: 'richtext',
      position: 'after_tipps',
      html: `<section class="industry-check-block alignCenter animate-on-scroll">
  <p class="industry-eyebrow">Nächster Schritt</p>
  <h2>Ist deine aktuelle Makler-Website bereit für mehr Anfragen?</h2>
  <p>Wir prüfen kostenlos, ob deine Website mobil überzeugt, lokale Suchanfragen abdeckt, saubere Meta-Daten hat, für KI-Antworten verständlich ist und Besucher zu Bewertung, Rückruf oder Kontakt führt.</p>
  <div class="industry-check-actions">
    <a class="primary" href="/website-tester" data-track="cta" data-cta-name="realestate_full_website_test">Kostenlosen Website-Test starten</a>
    <a class="secondary" href="/website-tester/geo" data-track="cta" data-cta-name="realestate_geo_test">GEO-Potenzial prüfen</a>
    <a class="secondary" href="/kontakt" data-track="cta" data-cta-name="realestate_contact_after_check">Projekt besprechen</a>
  </div>
</section>`
    }
  ]
};

const fields = Object.keys(content);
const jsonbFields = new Set([
  'stats_cards',
  'seo_items',
  'funktionen_items',
  'vorteile',
  'tipps_items',
  'faq_items',
  'blocks'
]);
const textArrayFields = new Set(['hero_checks']);

const values = fields.map((field) => {
  const value = content[field];
  if (jsonbFields.has(field)) return JSON.stringify(value);
  if (textArrayFields.has(field)) return Array.isArray(value) ? value : [String(value)];
  return value;
});

const typedAssignments = fields
  .map((field, index) => {
    const param = `$${index + 1}`;
    if (jsonbFields.has(field)) return `"${field}" = ${param}::jsonb`;
    if (textArrayFields.has(field)) return `"${field}" = ${param}::text[]`;
    return `"${field}" = ${param}`;
  })
  .join(',\n  ');

try {
  const { rows } = await pool.query(
    `UPDATE industries
     SET
       ${typedAssignments},
       updated_at = NOW()
     WHERE slug = 'immobilienmakler'
     RETURNING slug, title, updated_at`,
    values
  );

  if (!rows.length) {
    throw new Error('Keine Branche mit slug "immobilienmakler" gefunden.');
  }

  console.log(`Updated ${rows[0].slug}: ${rows[0].title} (${rows[0].updated_at.toISOString()})`);
} finally {
  await pool.end();
}
