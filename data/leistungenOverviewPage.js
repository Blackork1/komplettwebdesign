export const leistungenOverviewPage = Object.freeze({
  canonicalPath: '/leistungen',
  title: 'Leistungen Webdesign Berlin | Überblick',
  description:
    'Überblick über Webdesign-Leistungen in Berlin: Relaunch, Local SEO, Landingpages, Website-Audit, Wartung, Zusatzleistungen und laufende Kosten.',
  h1: 'Leistungen für deine Website',
  hero: Object.freeze({
    eyebrow: 'Webdesign-Leistungen',
    lead:
      'Hier findest du die wichtigsten Leistungen rund um individuelle Websites für kleine Unternehmen, Selbstständige und lokale Dienstleister in Berlin und Brandenburg.',
    answer:
      'Die Übersicht hilft dir, Webdesign, Relaunch, Local SEO, Landingpages, Website-Audit, Wartung, Zusatzleistungen und laufende Kosten sauber einzuordnen.',
    primaryCta: Object.freeze({ label: 'Projekt anfragen', url: '/kontakt?projektart=webdesign' }),
    secondaryCta: Object.freeze({ label: 'Pakete ansehen', url: '/pakete' })
  }),
  panel: Object.freeze({
    title: 'Sauber eingeordnet statt alles pauschal',
    text:
      'Nicht jede Website braucht jede Zusatzleistung. Deshalb werden Paketumfang, Erweiterungen und laufende Kosten vor der Umsetzung getrennt betrachtet.',
    items: Object.freeze([
      'klare Abgrenzung von Paket, Zusatzleistung und Betrieb',
      'technische Umsetzung mit serverseitig gerendertem HTML',
      'keine Ranking-, Umsatz- oder Anfragegarantie'
    ])
  }),
  services: Object.freeze([
    Object.freeze({
      title: 'Website-Relaunch',
      href: '/leistungen/website-relaunch',
      text: 'Bestehende Website neu strukturieren, technische Risiken prüfen und den Neustart sauber planen.',
      icon: 'fa-arrows-rotate'
    }),
    Object.freeze({
      title: 'Local SEO',
      href: '/leistungen/local-seo',
      text: 'Lokale Sichtbarkeit mit Website-Struktur, Google Business Profile und lokalen Inhalten vorbereiten.',
      icon: 'fa-location-dot'
    }),
    Object.freeze({
      title: 'Landingpage erstellen lassen',
      href: '/leistungen/landingpage-erstellen-lassen',
      text: 'Gezielte Seite für Kampagnen, Angebote oder konkrete Anfragewege planen und umsetzen.',
      icon: 'fa-file-lines'
    }),
    Object.freeze({
      title: 'Website-Audit',
      href: '/leistungen/website-audit',
      text: 'Bestehende Website technisch, inhaltlich und strukturell prüfen lassen.',
      icon: 'fa-magnifying-glass-chart'
    }),
    Object.freeze({
      title: 'Wartung & Support',
      href: '/leistungen/website-wartung',
      text: 'Technische Betreuung, Backups, Monitoring und kleine Änderungen nach dem Launch einordnen.',
      icon: 'fa-screwdriver-wrench'
    }),
    Object.freeze({
      title: 'Zusatzleistungen',
      href: '/leistungen/zusatzleistungen-webdesign',
      text: 'Zusätzliche Seiten, Texte, Tracking, CMS, Buchung oder Erweiterungen separat kalkulieren.',
      icon: 'fa-puzzle-piece'
    }),
    Object.freeze({
      title: 'Laufende Kosten',
      href: '/leistungen/laufende-kosten-website',
      text: 'Domain, E-Mail, Hosting, Wartung, externe Tools und Betriebskosten realistisch einordnen.',
      icon: 'fa-server'
    })
  ]),
  nextSteps: Object.freeze([
    'Wenn du noch unsicher bist, starte mit einer kurzen Projektanfrage.',
    'Wenn bereits eine Website vorhanden ist, kann ein Website-Audit sinnvoll sein.',
    'Wenn du den Umfang vergleichen möchtest, helfen die Pakete Start, Business, Wachstum und Individuell.'
  ])
});
