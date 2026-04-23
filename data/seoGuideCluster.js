const UPDATED_AT = '2026-04-22T09:00:00+02:00';
const DEFAULT_IMAGE = '/images/heroBg.webp';

function faq(name, text) {
  return {
    '@type': 'Question',
    name,
    acceptedAnswer: {
      '@type': 'Answer',
      text
    }
  };
}

export const SEO_GUIDE_CLUSTER = Object.freeze([
  {
    title: 'Was kostet eine Website in Berlin?',
    slug: 'website-kosten-berlin',
    excerpt: 'Realistische Preisbereiche für Berliner Unternehmen: Onepager, Firmenwebsite, Relaunch, Shop und laufende Kosten.',
    description: 'Was kostet eine Website in Berlin? Komplett Webdesign erklärt Preise, Paketlogik, Zusatzkosten und sinnvolle Budgets für kleine Unternehmen.',
    image_url: '/images/ratgeber/Kosten.png',
    category: 'Kosten',
    featured: true,
    published: true,
    created_at: UPDATED_AT,
    updated_at: UPDATED_AT,
    content: `
      <p><strong>Kurzantwort:</strong> Eine einfache Website in Berlin startet bei Komplett Webdesign ab 499 EUR. Mehrseitige Firmenwebsites liegen häufig bei 899 EUR bis 1.499 EUR, abhängig von Umfang, Texten, SEO, Buchungssystemen und Shop-Funktionen.</p>
      <h2>Welche Kosten sind realistisch?</h2>
      <p>Für lokale Unternehmen ist nicht nur der Einstiegspreis wichtig, sondern was nach dem Livegang passiert: Hosting, Domain, E-Mail, Wartung und spätere SEO-Optimierung. Bei Komplett Webdesign bleiben diese Punkte transparent: Domain und Mail starten ab 10 EUR pro Monat, Hosting ab 10 EUR pro Monat und Wartung ab 5 EUR pro Monat.</p>
      <ul>
        <li><strong>Basis ab 499 EUR:</strong> eine Seite, Texte enthalten, SEO-Basis, ideal als digitale Visitenkarte.</li>
        <li><strong>Business ab 899 EUR:</strong> bis zu 5 Seiten, Kontaktformular, Leistungen, Über-uns-/Team-Seite und OnPage-SEO.</li>
        <li><strong>Premium ab 1.499 EUR:</strong> bis zu 20 Seiten, Strategie, Texte, SEO und Buchungssystem inklusive.</li>
      </ul>
      <h2>Wann lohnt sich ein höheres Paket?</h2>
      <p>Ein höheres Paket lohnt sich, wenn deine Website mehrere Leistungen erklären muss, lokal in Berlin gefunden werden soll oder Besucher direkt buchen, anfragen oder kaufen sollen. Je erklärungsbedürftiger dein Angebot ist, desto wichtiger werden klare Unterseiten, Vertrauenselemente und interne Verlinkung.</p>
      <h2>Vor dem Angebot prüfen</h2>
      <p>Starte mit dem <a href="/website-tester">kostenlosen Website-Tester</a>, wenn bereits eine Website existiert. Danach lässt sich besser entscheiden, ob ein Relaunch, eine Optimierung oder ein kompletter Neuaufbau sinnvoll ist.</p>
      <p><a class="btn btn-accent" href="/pakete">Pakete vergleichen</a> <a class="btn btn-outline-primary" href="/kontakt">Kostenlose Einschätzung anfragen</a></p>
    `,
    faq_json: [
      faq('Was kostet eine einfache Website in Berlin?', 'Eine einfache Website startet bei Komplett Webdesign ab 499 EUR. Darin enthalten sind eine Seite, Texte, SEO-Basis und mobiloptimiertes Design.'),
      faq('Sind Hosting und Wartung enthalten?', 'Hosting und Wartung sind bei allen Paketen optional extra. Domain und Mail starten ab 10 EUR pro Monat, Hosting ab 10 EUR pro Monat und Wartung ab 5 EUR pro Monat.'),
      faq('Wann brauche ich das Business- oder Premium-Paket?', 'Business passt für Unternehmen mit mehreren Leistungen. Premium passt für umfangreiche Websites, Buchungssysteme, Shops oder größere lokale SEO-Strukturen.')
    ]
  },
  {
    title: 'Website erstellen lassen in Berlin: Ablauf, Dauer, Kosten',
    slug: 'website-erstellen-berlin-ablauf-dauer-kosten',
    excerpt: 'So läuft ein Website-Projekt in Berlin ab: Briefing, Texte, Design, Entwicklung, SEO, Launch und Tracking.',
    description: 'Website erstellen lassen in Berlin: Ablauf, Dauer und Kosten vom Erstgespräch bis zum Livegang verständlich erklärt.',
    image_url: '/images/ratgeber/Ablauf.png',
    category: 'Ablauf',
    featured: true,
    published: true,
    created_at: UPDATED_AT,
    updated_at: UPDATED_AT,
    content: `
      <p><strong>Kurzantwort:</strong> Ein Website-Projekt dauert meist 2 bis 8 Wochen. Kleine Onepager sind oft nach 2 bis 4 Wochen online, mehrseitige Business-Websites nach 4 bis 6 Wochen und umfangreiche Projekte nach 6 bis 8 Wochen.</p>
      <h2>Der typische Ablauf</h2>
      <ol>
        <li><strong>Erstgespräch:</strong> Zielgruppe, Angebot, Wettbewerb und gewünschte Funktionen klären.</li>
        <li><strong>Struktur und Texte:</strong> Seitenplan, Kernbotschaft, lokale Keywords und CTAs festlegen.</li>
        <li><strong>Design:</strong> Layout, Farben, Bildsprache und Nutzerführung ausarbeiten.</li>
        <li><strong>Umsetzung:</strong> mobile Website, Kontaktformular, Tracking, SEO-Basis und rechtliche Pflichtseiten einrichten.</li>
        <li><strong>Launch:</strong> Domain, Hosting, Weiterleitungen, Sitemap und Google Search Console prüfen.</li>
      </ol>
      <h2>Was macht den Prozess schneller?</h2>
      <p>Schneller wird das Projekt, wenn Angebot, Leistungen, Preise, Bilder und Ansprechpartner früh klar sind. Wenn Texte fehlen, kann Komplett Webdesign diese erstellen und für lokale Suchanfragen in Berlin ausrichten.</p>
      <h2>Wie wird der Erfolg messbar?</h2>
      <p>Vor dem Livegang sollten Kontaktformular, Buchungssystem, Website-Tester-Klicks und Telefon-CTAs als Ereignisse in GA4 geplant werden. So siehst du später, welche Seiten Anfragen bringen.</p>
      <p><a class="btn btn-accent" href="/webdesign-berlin">Webdesign Berlin ansehen</a> <a class="btn btn-outline-primary" href="/website-tester">Website kostenlos testen</a></p>
    `,
    faq_json: [
      faq('Wie lange dauert eine Website-Erstellung in Berlin?', 'Je nach Paket dauert die Umsetzung meist 2 bis 8 Wochen. Basis-Projekte sind schneller, Premium-Projekte brauchen mehr Strategie, Inhalt und Abstimmung.'),
      faq('Sind Texte enthalten?', 'Ja, in den Paketen sind Texte enthalten. Der Umfang hängt vom gewählten Paket und der Seitenanzahl ab.'),
      faq('Wird SEO direkt mitgemacht?', 'Ja. Titles, Meta Descriptions, H1, interne Links, Seitenstruktur und lokale Signale werden von Anfang an berücksichtigt.')
    ]
  },
  {
    title: 'Website-Relaunch Berlin: Wann lohnt sich ein Neustart?',
    slug: 'website-relaunch-berlin',
    excerpt: 'Wann ein Relaunch sinnvoll ist, welche Risiken es gibt und wie Rankings, Anfragen und Technik sauber übertragen werden.',
    description: 'Website-Relaunch in Berlin planen: Komplett Webdesign erklärt Gründe, Ablauf, SEO-Risiken, Weiterleitungen und Tracking.',
    image_url: '/images/ratgeber/Relaunch.png',
    category: 'Relaunch',
    featured: false,
    published: true,
    created_at: UPDATED_AT,
    updated_at: UPDATED_AT,
    content: `
      <p><strong>Kurzantwort:</strong> Ein Relaunch lohnt sich, wenn deine Website langsam ist, mobil schwach wirkt, keine Anfragen bringt oder bei Google nicht mehr zu deinen wichtigsten Leistungen passt.</p>
      <h2>Typische Relaunch-Gründe</h2>
      <ul>
        <li>veraltetes Design oder schlechte mobile Nutzung</li>
        <li>unklare Leistungen und schwache Kontaktführung</li>
        <li>technische Probleme bei Ladezeit, Sicherheit oder Wartung</li>
        <li>keine saubere SEO-Struktur für Berliner Suchanfragen</li>
        <li>kein messbares Tracking für Leads und Formularabschlüsse</li>
      </ul>
      <h2>SEO beim Relaunch schützen</h2>
      <p>Vor dem Relaunch werden bestehende URLs, Rankings und Backlinks geprüft. Wichtige Seiten bekommen passende Weiterleitungen, neue Titles, eindeutige H1 und self-canonicals. So geht vorhandene Sichtbarkeit nicht unnötig verloren.</p>
      <h2>Relaunch oder Optimierung?</h2>
      <p>Nicht jede Website muss komplett neu gebaut werden. Der <a href="/website-tester">Website-Tester</a> hilft, technische und inhaltliche Schwächen einzugrenzen. Wenn nur einzelne Bereiche schwach sind, kann eine gezielte Optimierung reichen.</p>
      <p><a class="btn btn-accent" href="/kontakt">Relaunch besprechen</a> <a class="btn btn-outline-primary" href="/ratgeber/website-kosten-berlin">Kosten einschätzen</a></p>
    `,
    faq_json: [
      faq('Verliert man beim Relaunch Google-Rankings?', 'Nicht automatisch. Mit URL-Mapping, Weiterleitungen, sauberer Seitenstruktur und Search-Console-Prüfung lassen sich Risiken deutlich reduzieren.'),
      faq('Wann reicht eine Optimierung statt Relaunch?', 'Wenn Design, Technik und Struktur grundsätzlich funktionieren, reichen oft bessere Texte, interne Links, CTAs und lokale SEO-Optimierungen.'),
      faq('Wie lange dauert ein Website-Relaunch?', 'Je nach Umfang meist 4 bis 8 Wochen, bei kleinen Seiten auch schneller.')
    ]
  },
  {
    title: 'Baukasten vs. professionelle Website',
    slug: 'baukasten-vs-professionelle-website',
    excerpt: 'Wann ein Website-Baukasten reicht und wann eine professionelle Website für Sichtbarkeit, Vertrauen und Leads sinnvoller ist.',
    description: 'Baukasten oder professionelle Website? Eine klare Entscheidungshilfe für kleine Unternehmen in Berlin.',
    image_url: '/images/ratgeber/Baukasten.png',
    category: 'Entscheidungshilfe',
    featured: true,
    published: true,
    created_at: UPDATED_AT,
    updated_at: UPDATED_AT,
    content: `
      <p><strong>Kurzantwort:</strong> Ein Baukasten kann für sehr einfache Projekte reichen. Sobald du in Berlin über Google gefunden werden, mehrere Leistungen erklären oder hochwertige Anfragen gewinnen willst, ist eine professionelle Website meist die bessere Grundlage.</p>
      <h2>Wann reicht ein Baukasten?</h2>
      <p>Ein Baukasten passt, wenn du nur eine sehr einfache Online-Visitenkarte brauchst, kaum SEO-Ziele hast und Design, Texte, Technik und Wartung selbst übernehmen möchtest.</p>
      <h2>Wann ist professionelle Umsetzung sinnvoll?</h2>
      <ul>
        <li>du möchtest für lokale Suchanfragen wie „Website erstellen lassen Berlin“ oder deine eigene Branche sichtbar werden</li>
        <li>du brauchst klare Leistungsseiten, Kontaktformulare oder Buchungssysteme</li>
        <li>du willst Ladezeit, Datenschutz, Tracking und SEO sauber umgesetzt haben</li>
        <li>du möchtest Texte, Struktur und Design aus einer Hand</li>
      </ul>
      <h2>Der wichtigste Unterschied</h2>
      <p>Eine professionelle Website wird nicht nur gebaut, sondern geplant: Zielgruppe, Einwände, lokale Keywords, CTAs, Tracking und spätere Erweiterbarkeit gehören direkt zum Projekt.</p>
      <p><a class="btn btn-accent" href="/pakete">Professionelle Pakete ansehen</a> <a class="btn btn-outline-primary" href="/website-tester">Bestehende Website prüfen</a></p>
    `,
    faq_json: [
      faq('Ist ein Website-Baukasten schlecht für SEO?', 'Nicht grundsätzlich. Häufig fehlen aber saubere Struktur, einzigartige Inhalte, technische Optimierung und eine klare lokale Keyword-Strategie.'),
      faq('Kann man später von einem Baukasten wechseln?', 'Ja. Beim Wechsel sollten Inhalte, URLs, Weiterleitungen und Tracking sauber geplant werden.'),
      faq('Was ist der Vorteil einer professionellen Website?', 'Du bekommst Strategie, Design, Texte, Technik, SEO und messbare Lead-Ziele aus einer Hand.')
    ]
  },
  {
    title: 'Website für Handwerker in Berlin',
    slug: 'website-fuer-handwerker-berlin',
    excerpt: 'Welche Seiten, Inhalte und CTAs Handwerksbetriebe brauchen, um lokal mehr qualifizierte Anfragen zu bekommen.',
    description: 'Website für Handwerker in Berlin: Seitenstruktur, lokale SEO, Referenzen, Angebotsanfragen und Vertrauenselemente.',
    image_url: '/images/handwerker-min.webp',
    category: 'Branchen',
    featured: false,
    published: true,
    created_at: UPDATED_AT,
    updated_at: UPDATED_AT,
    content: `
      <p><strong>Kurzantwort:</strong> Eine gute Handwerker-Website zeigt Leistungen, Einsatzgebiete, Referenzen und Kontaktwege so klar, dass Besucher schnell eine Anfrage stellen können.</p>
      <h2>Wichtige Seiten für Handwerker</h2>
      <ul>
        <li>Startseite mit klarer Positionierung und Sofortkontakt</li>
        <li>Leistungsseiten pro Gewerk oder Schwerpunkt</li>
        <li>Referenzen mit Vorher-/Nachher-Bildern</li>
        <li>Kontaktformular mit Projektart, Bezirk, Zeitrahmen und Fotos</li>
        <li>FAQ zu Kosten, Ablauf, Verfügbarkeit und Einzugsgebiet</li>
      </ul>
      <h2>Lokale SEO für Berliner Bezirke</h2>
      <p>Handwerker profitieren von klaren Leistungsseiten und lokalen Signalen: Bezirke, Einsatzgebiet, echte Projektbeispiele und interne Links auf relevante Berliner Seiten. Wichtig ist, dass die Texte nicht austauschbar wirken.</p>
      <h2>Lead-Qualität verbessern</h2>
      <p>Ein gutes Formular fragt nicht zu viel, aber genug: Was soll gemacht werden? Wo ist das Projekt? Gibt es Fotos? Wann soll es starten? So entstehen bessere Anfragen und weniger Rückfragen.</p>
      <p><a class="btn btn-accent" href="/kontakt">Handwerker-Website anfragen</a> <a class="btn btn-outline-primary" href="/website-tester">Aktuelle Website testen</a></p>
    `,
    faq_json: [
      faq('Was braucht eine Handwerker-Website?', 'Leistungsseiten, Referenzen, Einsatzgebiet, schnelle Kontaktwege, Vertrauenselemente und eine mobile Darstellung.'),
      faq('Sollte jede Leistung eine eigene Seite haben?', 'Für wichtige Leistungen ja. Das hilft Nutzern und Suchmaschinen, das Angebot klarer zu verstehen.'),
      faq('Sind Projektfotos wichtig?', 'Ja. Echte Bilder und Referenzen schaffen Vertrauen und verbessern die Anfragequalität.')
    ]
  },
  {
    title: 'Website für Restaurants und Cafés in Berlin',
    slug: 'website-fuer-restaurants-cafes-berlin',
    excerpt: 'Was Gastronomie-Websites brauchen: Speisekarte, Reservierung, Events, lokale Sichtbarkeit und schnelle mobile Nutzung.',
    description: 'Website für Restaurants und Cafés in Berlin: Reservierungen, Speisekarte, Events, Local SEO und bessere mobile Nutzerführung.',
    image_url: '/images/review-bg.webp',
    category: 'Branchen',
    featured: false,
    published: true,
    created_at: UPDATED_AT,
    updated_at: UPDATED_AT,
    content: `
      <p><strong>Kurzantwort:</strong> Restaurant- und Café-Websites müssen mobil schnell sein, Speisekarte und Öffnungszeiten sofort zeigen und Reservierungen ohne Umwege ermöglichen.</p>
      <h2>Was Gäste sofort suchen</h2>
      <ul>
        <li>Öffnungszeiten, Adresse und Anfahrt</li>
        <li>Speisekarte oder Wochenkarte</li>
        <li>Reservierung, Telefon oder Buchungsformular</li>
        <li>Fotos von Räumen, Speisen und Atmosphäre</li>
        <li>Events, Catering oder private Feiern</li>
      </ul>
      <h2>Local SEO für Gastronomie</h2>
      <p>Für Cafés und Restaurants ist das Google-Unternehmensprofil genauso wichtig wie die Website. Website, Profil, Bewertungen, Speisekarte und lokale Inhalte sollten zusammenpassen, damit Gäste schneller Vertrauen aufbauen.</p>
      <h2>Mehr Reservierungen statt nur schöne Bilder</h2>
      <p>Eine Gastronomie-Website sollte nicht nur visuell wirken, sondern Reservierungen und Anfragen messen. Deshalb gehören Buchungsklicks, Telefonklicks und Formularabschlüsse in den Tracking-Plan.</p>
      <p><a class="btn btn-accent" href="/branchen/webdesign-cafe">Webdesign für Cafés ansehen</a> <a class="btn btn-outline-primary" href="/kontakt">Restaurant-Website besprechen</a></p>
    `,
    faq_json: [
      faq('Was kostet eine Restaurant-Website in Berlin?', 'Je nach Umfang startet eine einfache Website ab 499 EUR. Mit mehreren Seiten, Reservierung oder Events liegt der Aufwand meist höher.'),
      faq('Sollte eine Speisekarte als PDF eingebunden werden?', 'Eine PDF kann zusätzlich sinnvoll sein, aber die wichtigsten Inhalte sollten auch als HTML auf der Website stehen. Das ist nutzerfreundlicher und besser für SEO.'),
      faq('Kann ein Buchungssystem integriert werden?', 'Ja. Im Premium-Paket ist ein Buchungssystem enthalten, bei anderen Paketen kann es je nach Umfang ergänzt werden.')
    ]
  }
]);

export function getSeoGuideBySlug(slug) {
  return SEO_GUIDE_CLUSTER.find((guide) => guide.slug === slug) || null;
}
