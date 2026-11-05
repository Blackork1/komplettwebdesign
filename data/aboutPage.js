import { referenceProjects } from './referenceProjects.js';
import { SITE_FACTS, formatGoogleRating } from '../helpers/siteFacts.js';

export const aboutPage = Object.freeze({
  title: 'Über mich: Sören Blocksdorf, Webdesigner in Berlin',
  description: `Sören Blocksdorf, Webdesigner in Berlin-Lichtenberg: seit ${SITE_FACTS.workingSinceYear} im Webdesign, ${SITE_FACTS.foundingYear} Komplett Webdesign gegründet. Werdegang, Arbeitsweise und Projekte.`,
  modifiedAt: '2026-11-05',
  // Werdegang mit belegbaren Jahreszahlen (keine Projektzahl: bewusst nur die gezeigten Referenzen).
  timeline: [
    { year: SITE_FACTS.workingSinceYear, title: 'Erste Websites für Kunden', text: 'Ich plane, gestalte und programmiere die ersten Websites für Kunden, zunächst freiberuflich nebenbei. Von Anfang an setze ich jede Seite selbst um, vom Entwurf bis zum Livegang.' },
    { year: SITE_FACTS.foundingYear, title: 'Gründung von Komplett Webdesign', text: 'Ich gründe Komplett Webdesign in Berlin-Lichtenberg. Seitdem biete ich Websites zu festen Paketpreisen an, dazu Wartung und Betreuung nach dem Launch, weiter als einziger Ansprechpartner.' },
    { year: '2026', title: 'Kostenlose Website-Tester', text: 'Mit meinen <a href="/website-tester">Website-Testern</a> prüfst du selbst SEO-Grundlagen, Sichtbarkeit in KI-Suchen, Meta-Daten und defekte Links deiner Website, kostenlos direkt im Browser.' },
    { year: '2026', title: 'Websites nach Branche', text: 'Für Handwerk, Praxen, Cafés, Reinigung und weitere <a href="/branchen">Branchen</a> habe ich recherchiert, was deren Kunden auf einer Website suchen und welche Pflichtangaben gelten.' }
  ],
  glance: [
    { label: 'Name', value: 'Sören Blocksdorf' },
    { label: 'Tätigkeit', value: 'Webdesigner und Webentwickler, Inhaber von Komplett Webdesign' },
    { label: 'Standort', value: 'Berlin-Lichtenberg; Projekte in Berlin, Brandenburg und deutschlandweit' },
    { label: 'Im Webdesign seit', value: SITE_FACTS.workingSinceYear },
    { label: 'Unternehmen gegründet', value: SITE_FACTS.foundingYear },
    { label: 'Schwerpunkte', value: 'Websites für kleine Unternehmen, Website-Relaunch, technische SEO und Local SEO, kurze Ladezeiten' },
    { label: 'Technik', value: 'Node.js, EJS, CSS und JavaScript, serverseitig gerendertes HTML' },
    { label: 'Bewertung', value: formatGoogleRating('de').replace(/^★+\s*/, ''), link: { href: SITE_FACTS.googleProfileUrl, text: 'Google-Profil' } },
    { label: 'Profil', link: { href: SITE_FACTS.founderProfiles[0], text: 'LinkedIn' } }
  ],
  featuredProject: referenceProjects.find(project => project.slug === 'zur-alten-backstube'),
  showcases: [
    {
      project: referenceProjects.find(project => project.slug === 'kurdisches-filmfestival'),
      description: 'Eine mehrsprachige Festivalplattform, auf der Programm, Filme und redaktionelle Inhalte zusammenfinden. Hier siehst du die Startseite der Ausgabe 2026.',
      featureTitle: 'Besonders: die Mediathek',
      featureText: 'Filmsuche, nach Kategorien geordnete Übersichten und Filminformationen machen das Programm zugänglich. Die Videoseite verbindet starke Bilder mit einer klaren Orientierung.',
      liveUrl: 'https://www.kurdisches-filmfestival.de/archiv2026/de',
      liveLabel: 'Festival-Website 2026 ansehen',
      featureUrl: 'https://www.kurdisches-filmfestival.de/archiv2026/video-de',
      featureLabel: 'Mediathek der Ausgabe 2026 ansehen',
      screens: [
        { image: '/images/references/kurdisches-filmfestival/startseite-2026.webp', width: 1440, height: 1000, caption: 'Startseite · Ausgabe 2026', alt: 'Archivierte Startseite des 16. Kurdischen Filmfestivals Berlin 2026 mit Festivalmotiv' },
        { image: '/images/references/kurdisches-filmfestival/video-2026.webp', width: 1440, height: 1000, caption: 'Videoseite · Film und Hintergrund', alt: 'Videoseite der Festivalausgabe 2026 mit Filmbild, Regie, Sprachen und Inhaltsbeschreibung' },
        { image: '/images/references/kurdisches-filmfestival/mediathek-2026.webp', width: 1440, height: 1000, caption: 'Mediathek · Filme entdecken', alt: 'Filmübersicht der Festivalausgabe 2026 mit Filmsuche und Kategorien wie Spielfilme und Dokumentarfilme' }
      ]
    },
    {
      project: referenceProjects.find(project => project.slug === 'tm-sauber-mehr'),
      description: 'Ein persönlicher Auftritt für einen Berliner Reinigungsbetrieb. Leistungen, Team und Anfragewege sind so gestaltet, dass Interessenten sich schnell orientieren können.',
      featureTitle: 'Besonders: die geführte Kontaktanfrage',
      featureText: 'Schritt für Schritt wählen Besucher Reinigungsart, Objektgröße und ihren bevorzugten Kontaktweg. Aus einer allgemeinen Anfrage wird ein Anliegen mit den passenden Informationen.',
      liveUrl: 'https://www.sauber-mehr.de/',
      liveLabel: 'Website von Sauber & Mehr ansehen',
      featureUrl: 'https://www.sauber-mehr.de/kontakt',
      featureLabel: 'Geführte Kontaktseite ansehen',
      screens: [
        { image: '/images/references/tm-sauber-mehr/startseite.webp', width: 1280, height: 720, caption: 'Startseite · Team und Leistungen', alt: 'Startseite von TM Sauber und Mehr mit dem Reinigungsteam und dem Einstieg zur Angebotsanfrage' },
        { image: '/images/references/tm-sauber-mehr/kontakt.webp', width: 1280, height: 720, caption: 'Kontaktseite · Geführte Anfrage', alt: 'Kontaktseite von TM Sauber und Mehr mit visueller Auswahl der Reinigungsart als erstem Formularschritt' }
      ]
    }
  ],
  highlights: [
    { title: 'Ein fester Ansprechpartner', text: 'Du hast direkt mit mir zu tun – persönlich, unkompliziert und auf Augenhöhe.' },
    { title: 'Design und Entwicklung', text: 'Von der Idee über das Design bis zur fertigen Website.' },
    { title: 'Berlin und remote', text: 'Ich arbeite in Berlin und deutschlandweit mit kleinen Unternehmen zusammen.' }
  ],
  principles: [
    { title: 'Du sprichst direkt mit mir.', text: 'Ich berate dich und setze deine Website um. Deine Fragen und dein Feedback kommen direkt bei der Person an, die an deinem Projekt arbeitet.' },
    { title: 'Du weißt, was vereinbart ist.', text: 'Wir klären Leistungen, Zeitrahmen und Kosten vor dem Start. Zusätzliche Wünsche besprechen wir, bevor daraus zusätzliche Arbeit entsteht.' },
    { title: 'Deine Website wird für deine Kunden gemacht.', text: 'Ich ordne Inhalte, Gestaltung und Kontaktwege so, dass Besucher dein Angebot verstehen und den passenden nächsten Schritt finden.' }
  ],
  steps: [
    { title: 'Kennenlernen', text: 'Wir sprechen über dein Unternehmen, deine Ziele und das, was deine Website leisten soll.' },
    { title: 'Planen und umsetzen', text: 'Du erhältst ein Angebot mit klarem Umfang. Entwurf und Umsetzung stimmen wir gemeinsam ab.' },
    { title: 'Prüfen und veröffentlichen', text: 'Wir prüfen Inhalte, mobile Darstellung und Kontaktwege. Die weitere Betreuung vereinbaren wir nach Bedarf.' }
  ],
  faq: [
    { question: 'Brauche ich schon fertige Texte?', answer: 'Nein. Vorhandene Texte, Bilder oder erste Stichpunkte helfen beim Einstieg. Wir klären gemeinsam, welche Inhalte fehlen und welche Unterstützung bei Struktur und Texten sinnvoll ist. Den Umfang halten wir im Angebot fest.' },
    { question: 'Kannst du meine bestehende Website überarbeiten?', answer: 'Ja. Ich schaue mir zuerst an, was bereits funktioniert und wo Inhalte, Gestaltung oder Technik verbessert werden können. Danach besprechen wir, ob gezielte Änderungen oder ein Relaunch der passende Weg sind.' },
    { question: 'Arbeitest du auch außerhalb von Berlin?', answer: 'Ja. Die Abstimmung kann per Telefon oder Videogespräch erfolgen. Entwürfe und Zwischenstände schauen wir gemeinsam online an – unabhängig davon, wo dein Unternehmen sitzt.' }
  ]
});
