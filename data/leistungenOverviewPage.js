import { MARKETING_IMAGES } from './marketingImages.js';

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
      text: 'SEO, Technik, Inhalte, Ladezeit und Nutzerführung einer bestehenden Website priorisiert prüfen lassen.',
      icon: 'fa-magnifying-glass-chart'
    }),
    Object.freeze({
      title: 'Wartung & Support',
      href: '/leistungen/website-wartung',
      text: 'Pflege, Backups, technische Kontrollen und Support nach vereinbartem Leistungsumfang einordnen.',
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
    }),
    Object.freeze({
      title: 'Website für Handwerker',
      href: '/handwerker',
      text: 'Leistungen und Anfragewege für Handwerksbetriebe in Berlin passend einordnen.',
      icon: 'fa-hammer'
    })
  ]),
  guidance: Object.freeze({
    title: 'Du weißt noch nicht, was du brauchst?',
    text: 'Starte mit dem kostenlosen Website-Tester oder beschreibe kurz deine Ausgangslage. So musst du keine Leistung auswählen, bevor klar ist, welches Problem zuerst gelöst werden sollte.',
    primary: Object.freeze({ label: 'Website kostenlos testen', href: '/website-tester' }),
    secondary: Object.freeze({ label: 'Ausgangslage beschreiben', href: '/kontakt?projektart=website-audit' })
  }),
  serviceGroups: Object.freeze([
    Object.freeze({
      title: 'Neue Website',
      description: 'Angebot, Umfang und Anfrageweg für einen neuen Auftritt festlegen.',
      image: MARKETING_IMAGES.webdesignHero,
      items: Object.freeze([
        Object.freeze({ title: 'Webdesign Berlin', href: '/webdesign-berlin', text: 'Website-Struktur, Gestaltung und Umsetzung gemeinsam planen.' }),
        Object.freeze({ title: 'Pakete & Preise', href: '/pakete', text: 'Start, Business, Wachstum und Individuell vergleichen.' }),
        Object.freeze({ title: 'Landingpage', href: '/leistungen/landingpage-erstellen-lassen', text: 'Eine fokussierte Seite für ein Angebot oder eine Kampagne erstellen.' })
      ])
    }),
    Object.freeze({
      title: 'Bestehende Website verbessern',
      description: 'Prüfen, neu strukturieren oder gezielt ausbauen.',
      image: MARKETING_IMAGES.serviceAudit,
      items: Object.freeze([
        Object.freeze({ title: 'Website-Audit', href: '/leistungen/website-audit', text: 'Technik, Inhalte, SEO und Nutzerführung priorisiert prüfen.' }),
        Object.freeze({ title: 'Website-Relaunch', href: '/leistungen/website-relaunch', text: 'Struktur, Design und Weiterleitungen für den Neustart planen.' }),
        Object.freeze({ title: 'Inhalte & Texte', href: '/leistungen/inhalte-texte-content', text: 'Bestehende Inhalte verständlicher strukturieren und ergänzen.' }),
        Object.freeze({ title: 'Responsives Design', href: '/leistungen/responsives-design-mobile', text: 'Darstellung und Bedienung auf mobilen Geräten verbessern.' })
      ])
    }),
    Object.freeze({
      title: 'Sichtbarkeit erhöhen',
      description: 'Lokale Signale, Suchstruktur und technische Grundlagen stärken.',
      image: MARKETING_IMAGES.serviceLocalSeo,
      items: Object.freeze([
        Object.freeze({ title: 'Local SEO', href: '/leistungen/local-seo', text: 'Website, lokale Inhalte und Google-Unternehmensprofil zusammendenken.' }),
        Object.freeze({ title: 'Website-Tester', href: '/website-tester', text: 'Kostenlosen technischen Einstiegstest durchführen.' })
      ])
    }),
    Object.freeze({
      title: 'Website betreiben',
      description: 'Betrieb, Erweiterungen und laufende Kosten nachvollziehbar planen.',
      image: MARKETING_IMAGES.serviceMaintenance,
      items: Object.freeze([
        Object.freeze({ title: 'Website-Wartung', href: '/leistungen/website-wartung', text: 'Prüfungen, Backups und Support im vereinbarten Umfang.' }),
        Object.freeze({ title: 'Zusatzleistungen', href: '/leistungen/zusatzleistungen-webdesign', text: 'Neue Funktionen oder Inhalte separat ergänzen.' }),
        Object.freeze({ title: 'Laufende Kosten', href: '/leistungen/laufende-kosten-website', text: 'Hosting, Domain, E-Mail, Tools und Wartung einordnen.' })
      ])
    })
  ]),
  relatedContent: Object.freeze([
    Object.freeze({
      label: 'Website-Kosten im Blog erklärt',
      href: '/blog/website-kosten-2025-einfach-erklaert',
      text: 'Einmalige Projektkosten und typische Preisfaktoren im bestehenden Blogartikel nachvollziehen.'
    })
  ]),
  nextSteps: Object.freeze([
    'Wenn du noch unsicher bist, starte mit einer kurzen Projektanfrage.',
    'Wenn bereits eine Website vorhanden ist, kann ein Website-Audit sinnvoll sein.',
    'Wenn du den Umfang vergleichen möchtest, helfen die Pakete Start, Business, Wachstum und Individuell.'
  ])
});
