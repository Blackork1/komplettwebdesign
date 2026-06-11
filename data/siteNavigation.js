export const headerNavigation = Object.freeze([
  {
    label: 'Start',
    labelEn: 'Home',
    href: '/',
    hrefEn: '/en'
  },
  {
    label: 'Webdesign Berlin',
    labelEn: 'Webdesign Berlin',
    href: '/webdesign-berlin',
    hrefEn: '/en/webdesign-berlin'
  },
  {
    label: 'Pakete & Preise',
    labelEn: 'Packages & pricing',
    href: '/pakete',
    hrefEn: '/en/pakete'
  },
  {
    label: 'Leistungen',
    labelEn: 'Services',
    href: '/leistungen/',
    children: [
      {
        label: 'Übersicht',
        labelEn: 'Overview',
        href: '/leistungen/'
      },
      {
        label: 'Website-Relaunch',
        labelEn: 'Website relaunch',
        href: '/leistungen/website-relaunch'
      },
      {
        label: 'Local SEO',
        labelEn: 'Local SEO',
        href: '/leistungen/local-seo'
      },
      {
        label: 'Landingpage erstellen lassen',
        labelEn: 'Landing page',
        href: '/leistungen/landingpage-erstellen-lassen'
      },
      {
        label: 'Website-Audit',
        labelEn: 'Website audit',
        href: '/leistungen/website-audit'
      },
      {
        label: 'Responsives Design & Mobile',
        labelEn: 'Responsive design & mobile',
        href: '/leistungen/responsives-design-mobile'
      },
      {
        label: 'Inhalte & Texte',
        labelEn: 'Content & copy',
        href: '/leistungen/inhalte-texte-content'
      },
      {
        label: 'Rechtliches & Sicherheit',
        labelEn: 'Legal notes & security',
        href: '/leistungen/rechtliches-sicherheit'
      },
      {
        label: 'Wartung & Support',
        labelEn: 'Maintenance & support',
        href: '/leistungen/website-wartung'
      },
      {
        label: 'Zusatzleistungen',
        labelEn: 'Add-ons',
        href: '/leistungen/zusatzleistungen-webdesign'
      },
      {
        label: 'Laufende Kosten',
        labelEn: 'Running costs',
        href: '/leistungen/laufende-kosten-website'
      }
    ]
  },
  {
    label: 'Referenzen',
    labelEn: 'References',
    href: '/referenzen'
  },
  {
    label: 'Branchen',
    labelEn: 'Industries',
    href: '/branchen'
  }
]);

export const headerCta = Object.freeze({
  label: 'Kontakt',
  labelEn: 'Contact',
  href: '/kontakt',
  hrefEn: '/en/kontakt'
});

export const footerNavigation = Object.freeze([
  {
    label: 'Angebot',
    labelEn: 'Offer',
    links: [
      { label: 'Webdesign Berlin', labelEn: 'Webdesign Berlin', href: '/webdesign-berlin', hrefEn: '/en/webdesign-berlin' },
      { label: 'Website erstellen lassen Berlin', labelEn: 'Website creation Berlin', href: '/website-erstellen-lassen-berlin' },
      { label: 'Pakete & Preise', labelEn: 'Packages & pricing', href: '/pakete', hrefEn: '/en/pakete' },
      { label: 'Website-Relaunch', labelEn: 'Website relaunch', href: '/leistungen/website-relaunch' },
      { label: 'Landingpage', labelEn: 'Landing page', href: '/leistungen/landingpage-erstellen-lassen' },
      { label: 'Website-Audit', labelEn: 'Website audit', href: '/leistungen/website-audit' }
    ]
  },
  {
    label: 'Kosten & Betrieb',
    labelEn: 'Costs & operation',
    links: [
      { label: 'Webdesign Preise', labelEn: 'Webdesign pricing', href: '/webdesign-berlin/kosten-preise-pakete' },
      { label: 'Laufende Website-Kosten', labelEn: 'Running website costs', href: '/leistungen/laufende-kosten-website' },
      { label: 'Zusatzleistungen Webdesign', labelEn: 'Webdesign add-ons', href: '/leistungen/zusatzleistungen-webdesign' },
      { label: 'Website-Wartung', labelEn: 'Website maintenance', href: '/leistungen/website-wartung' }
    ]
  },
  {
    label: 'Sichtbarkeit & Tools',
    labelEn: 'Visibility & tools',
    links: [
      { label: 'Local SEO', labelEn: 'Local SEO', href: '/leistungen/local-seo' },
      { label: 'Website prüfen lassen', labelEn: 'Website audit', href: '/leistungen/website-audit' },
      { label: 'Website-Tester', labelEn: 'Website tester', href: '/website-tester', hrefEn: '/en/website-tester' },
      { label: 'Branchen-Websites', labelEn: 'Industry websites', href: '/branchen' },
      { label: 'Blog', labelEn: 'Blog', href: '/blog' }
    ]
  },
  {
    label: 'Kontakt & Vertrauen',
    labelEn: 'Contact & trust',
    links: [
      { label: 'Referenzen', labelEn: 'References', href: '/referenzen' },
      { label: 'Kontakt', labelEn: 'Contact', href: '/kontakt', hrefEn: '/en/kontakt' },
      { label: 'Ablauf Webdesign Berlin', labelEn: 'Webdesign process Berlin', href: '/ablauf' },
      { label: 'Über mich', labelEn: 'About me', href: '/about' },
      { label: 'Ratgeber', labelEn: 'Guides', href: '/ratgeber' }
    ]
  },
  {
    label: 'Rechtliches',
    labelEn: 'Legal',
    links: [
      { label: 'Impressum', labelEn: 'Legal notice', href: '/impressum' },
      { label: 'Datenschutz', labelEn: 'Privacy policy', href: '/datenschutz' },
      { label: 'Hinweisseite', labelEn: 'Notes page', href: '/hinweise-rechtstexte-seo-datenschutz' }
    ]
  }
]);
