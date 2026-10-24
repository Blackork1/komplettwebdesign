// Echte Kundenprojekte für die Startseite. Aussagen stammen aus den Referenzseiten
// (data/referenceProjects.js) und aus öffentlichen Google-Bewertungen der Kunden.
export const HOME_PROJECTS = Object.freeze([
  Object.freeze({
    slug: 'zur-alten-backstube',
    name: 'Zur alten Backstube',
    href: '/referenzen/zur-alten-backstube',
    image: '/images/home-referenz-backstube.webp',
    imageWidth: 1840,
    imageHeight: 805,
    de: {
      industry: 'Café in Berlin-Rosenthal',
      alt: 'Startseite der Website Zur alten Backstube mit historischem Foto der Bäckerei',
      before: 'Angebot, Atmosphäre und Infos zum Besuch waren online nicht gut gebündelt. Tische ließen sich nur per Telefon reservieren.',
      after: 'Eine warme Website mit klaren Besuchsinfos und einem einfachen Weg zur Tischreservierung.',
      quote: 'Es ist jetzt viel einfacher Tische zu reservieren.',
      quoteAuthor: 'Google-Bewertung des Cafés'
    },
    en: {
      industry: 'Café in Berlin-Rosenthal',
      alt: 'Homepage of the Zur alten Backstube website with a historic photo of the bakery',
      before: 'Offer, atmosphere and visitor information were scattered. Tables could only be booked by phone.',
      after: 'A warm website with clear visitor information and a simple way to reserve a table.',
      quote: '',
      quoteAuthor: ''
    }
  }),
  Object.freeze({
    slug: 'tm-sauber-mehr',
    name: 'TM Sauber & Mehr',
    href: '/referenzen/tm-sauber-mehr',
    image: '/images/home-hero-sauber-desktop.webp',
    imageWidth: 1152,
    imageHeight: 720,
    de: {
      industry: 'Gebäudereinigung in Berlin',
      alt: 'Neue Startseite von TM Sauber & Mehr mit Team-Foto und Anfrage-Button',
      before: 'Die alte Website zeigte das Angebot, war aber nicht mehr klar strukturiert und zu wenig persönlich.',
      after: 'Relaunch mit klarer Leistungsübersicht, neuer Team-Seite und kurzen Wegen zu Anruf, WhatsApp und Angebot.',
      quote: 'Alle unsere Wünsche wurden schnell, professionell und unkompliziert umgesetzt.',
      quoteAuthor: 'TM Sauber & Mehr bei Google'
    },
    en: {
      industry: 'Commercial cleaning in Berlin',
      alt: 'New homepage of TM Sauber & Mehr with team photo and enquiry button',
      before: 'The old website showed the offer but was no longer clearly structured and felt impersonal.',
      after: 'Relaunch with a clear service overview, a new team page and short paths to call, WhatsApp or request a quote.',
      quote: '',
      quoteAuthor: ''
    }
  }),
  Object.freeze({
    slug: 'kurdisches-filmfestival',
    name: 'Kurdisches Filmfestival Berlin',
    href: '/referenzen/kurdisches-filmfestival',
    image: '/images/references/kurdisches-filmfestival/startseite-2026-720.webp',
    imageWidth: 720,
    imageHeight: 500,
    de: {
      industry: 'Festival und Kultur',
      alt: 'Startseite des Kurdischen Filmfestivals Berlin mit Festivalmotiv',
      before: 'Filme, Tickets, Spenden, Newsletter und drei Sprachen sollten in einen gemeinsamen Auftritt.',
      after: 'Eine eigene Festivalplattform in Deutsch, Englisch und Kurdisch mit Mediathek, Ticketshop und Spendenbereich.',
      quote: '',
      quoteAuthor: ''
    },
    en: {
      industry: 'Festival and culture',
      alt: 'Homepage of the Kurdish Film Festival Berlin with the festival artwork',
      before: 'Films, tickets, donations, newsletter and three languages had to come together in one website.',
      after: 'A dedicated festival platform in German, English and Kurdish with media library, ticket shop and donations.',
      quote: '',
      quoteAuthor: ''
    }
  })
]);

export function localizedHomeProjects(lng = 'de') {
  const key = lng === 'en' ? 'en' : 'de';
  return HOME_PROJECTS.map((project) => ({
    slug: project.slug,
    name: project.name,
    href: project.href,
    image: project.image,
    imageWidth: project.imageWidth,
    imageHeight: project.imageHeight,
    ...project[key]
  }));
}
