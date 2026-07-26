function freezeTarget(target) {
  return Object.freeze({
    ...target,
    requiredLinks: Object.freeze([...(target.requiredLinks || [])]),
    primaryAction: target.primaryAction ? Object.freeze({ ...target.primaryAction }) : null,
    supportingAction: target.supportingAction ? Object.freeze({ ...target.supportingAction }) : null
  });
}

export const SEO_RECOVERY_TARGETS = Object.freeze([
  freezeTarget({
    path: '/',
    intentId: 'brand-overview',
    state: 'active',
    priority: 'A',
    primaryQuery: 'komplett webdesign berlin',
    contentRole: 'Marken- und Angebotsüberblick',
    requiredLinks: ['/webdesign-berlin', '/leistungen', '/pakete', '/referenzen'],
    primaryAction: { label: 'Website-Projekt anfragen', href: '/kontakt' },
    supportingAction: { label: 'Pakete ansehen', href: '/pakete' }
  }),
  freezeTarget({
    path: '/webdesign-berlin',
    intentId: 'website-erstellen-lassen-berlin',
    state: 'active',
    priority: 'A',
    primaryQuery: 'website erstellen lassen berlin',
    contentRole: 'Kommerzielle Hauptseite für Website-Erstellung in Berlin',
    requiredLinks: ['/pakete', '/leistungen/website-audit', '/referenzen'],
    primaryAction: { label: 'Beratungsgespräch anfragen', href: '/kontakt?projektart=webdesign' },
    supportingAction: { label: 'Pakete vergleichen', href: '/pakete' }
  }),
  freezeTarget({
    path: '/website-erstellen-lassen-berlin',
    intentId: 'website-erstellen-lassen-berlin',
    state: 'redirect',
    priority: 'A',
    primaryQuery: 'website erstellen lassen berlin',
    requiredLinks: [],
    redirectTo: '/webdesign-berlin'
  }),
  freezeTarget({
    path: '/pakete',
    intentId: 'webdesign-preise-berlin',
    state: 'active',
    priority: 'A',
    primaryQuery: 'webdesign preise berlin',
    contentRole: 'Preis- und Paketauswahl',
    requiredLinks: ['/webdesign-berlin', '/leistungen/laufende-kosten-website'],
    primaryAction: { label: 'Passendes Paket anfragen', href: '/kontakt' },
    supportingAction: { label: 'Leistungen einordnen', href: '/leistungen' }
  }),
  freezeTarget({
    path: '/leistungen',
    intentId: 'webdesign-leistungen-overview',
    state: 'active',
    priority: 'A',
    primaryQuery: 'webdesign leistungen',
    contentRole: 'Auswahlhilfe nach Ausgangslage und Ziel',
    requiredLinks: ['/webdesign-berlin', '/leistungen/website-relaunch', '/leistungen/website-audit'],
    primaryAction: { label: 'Website prüfen', href: '/website-tester' },
    supportingAction: { label: 'Ausgangslage beschreiben', href: '/kontakt' }
  }),
  freezeTarget({
    path: '/leistungen/website-relaunch',
    intentId: 'website-relaunch',
    state: 'active',
    priority: 'A',
    primaryQuery: 'website relaunch',
    contentRole: 'Kommerzielle Relaunch-Leistung',
    requiredLinks: ['/referenzen/tm-sauber-mehr', '/leistungen/website-audit', '/pakete'],
    primaryAction: { label: 'Relaunch anfragen', href: '/kontakt?projektart=website-relaunch' },
    supportingAction: { label: 'Relaunch-Referenz ansehen', href: '/referenzen/tm-sauber-mehr' }
  }),
  freezeTarget({
    path: '/leistungen/website-audit',
    intentId: 'website-audit',
    state: 'active',
    priority: 'A',
    primaryQuery: 'website audit',
    contentRole: 'Individuelle Analyse einer bestehenden Website',
    requiredLinks: ['/website-tester', '/leistungen/website-relaunch'],
    primaryAction: { label: 'Website-Audit anfragen', href: '/kontakt' },
    supportingAction: { label: 'Kostenlosen Tester starten', href: '/website-tester' }
  }),
  freezeTarget({
    path: '/leistungen/local-seo',
    intentId: 'local-seo-berlin',
    state: 'active',
    priority: 'A',
    primaryQuery: 'local seo berlin',
    contentRole: 'Kommerzielle Local-SEO-Leistung mit klaren Grenzen',
    requiredLinks: ['/webdesign-berlin', '/branchen/webdesign-blumenladen', '/blog/seo-fuer-blumenladen'],
    primaryAction: { label: 'Local SEO anfragen', href: '/kontakt?projektart=local-seo' },
    supportingAction: { label: 'Praxisbeispiel Blumenladen', href: '/blog/seo-fuer-blumenladen' }
  }),
  freezeTarget({
    path: '/leistungen/website-wartung',
    intentId: 'website-wartung-berlin',
    state: 'active',
    priority: 'A',
    primaryQuery: 'website wartung berlin',
    contentRole: 'Laufende Betreuung und technische Wartung',
    requiredLinks: ['/pakete', '/leistungen/laufende-kosten-website'],
    primaryAction: { label: 'Wartung anfragen', href: '/kontakt?projektart=website-wartung' },
    supportingAction: { label: 'Laufende Kosten verstehen', href: '/leistungen/laufende-kosten-website' }
  }),
  freezeTarget({
    path: '/branchen/webdesign-blumenladen',
    intentId: 'webdesign-blumenladen-commercial',
    state: 'active',
    priority: 'A',
    primaryQuery: 'website erstellen lassen blumenladen',
    contentRole: 'Kommerzielle Branchenlösung für Blumenläden',
    requiredLinks: ['/blog/seo-fuer-blumenladen', '/pakete'],
    primaryAction: { label: 'Blumenladen-Website anfragen', href: '/kontakt' },
    supportingAction: { label: 'Local-SEO-Ratgeber lesen', href: '/blog/seo-fuer-blumenladen' }
  }),
  freezeTarget({
    path: '/blog/seo-fuer-blumenladen',
    intentId: 'seo-blumenladen-informational',
    state: 'active',
    priority: 'A',
    primaryQuery: 'seo für blumenladen',
    contentRole: 'Informationeller Local-SEO-Ratgeber für Blumenläden',
    requiredLinks: ['/branchen/webdesign-blumenladen', '/leistungen/local-seo'],
    primaryAction: { label: 'Local-SEO-Leistung ansehen', href: '/leistungen/local-seo' },
    supportingAction: { label: 'Blumenladen-Website planen', href: '/branchen/webdesign-blumenladen' }
  }),
  freezeTarget({
    path: '/blog/website-kosten-2025-einfach-erklaert',
    intentId: 'website-kosten-informational',
    state: 'active',
    priority: 'A',
    primaryQuery: 'website kosten',
    contentRole: 'Informationelle Kosten- und Preisorientierung',
    requiredLinks: ['/pakete', '/leistungen/laufende-kosten-website'],
    primaryAction: { label: 'Pakete vergleichen', href: '/pakete' },
    supportingAction: { label: 'Laufende Kosten einordnen', href: '/leistungen/laufende-kosten-website' }
  }),
  freezeTarget({
    path: '/blog/website-kosten-2026-berlin-vergleich-2025',
    intentId: 'website-kosten-informational',
    state: 'redirect',
    priority: 'A',
    primaryQuery: 'website kosten',
    requiredLinks: [],
    redirectTo: '/blog/website-kosten-2025-einfach-erklaert'
  }),
  freezeTarget({
    path: '/website-tester',
    intentId: 'website-test-free',
    state: 'active',
    priority: 'B',
    primaryQuery: 'webseite testen',
    contentRole: 'Kostenloser technischer Website-Einstiegstest',
    requiredLinks: ['/website-tester/seo', '/leistungen/website-audit'],
    primaryAction: { label: 'Website umfassend prüfen lassen', href: '/leistungen/website-audit' },
    supportingAction: { label: 'SEO-Test starten', href: '/website-tester/seo' }
  }),
  freezeTarget({
    path: '/website-tester/seo',
    intentId: 'seo-test-free',
    state: 'active',
    priority: 'B',
    primaryQuery: 'seo test',
    contentRole: 'Kostenloser SEO-Grundlagentest',
    requiredLinks: ['/website-tester', '/leistungen/website-audit'],
    primaryAction: { label: 'Individuelles Audit ansehen', href: '/leistungen/website-audit' },
    supportingAction: { label: 'Alle Website-Tests öffnen', href: '/website-tester' }
  })
]);

export const SEO_RECOVERY_REDIRECTS = Object.freeze(Object.fromEntries(
  SEO_RECOVERY_TARGETS
    .filter((entry) => entry.state === 'redirect' && entry.redirectTo)
    .map((entry) => [entry.path, entry.redirectTo])
));

export function getSeoRecoveryTarget(pathname) {
  return SEO_RECOVERY_TARGETS.find((entry) => entry.path === pathname) || null;
}

export function findActiveIntentCollisions(targets = SEO_RECOVERY_TARGETS) {
  const grouped = new Map();
  for (const entry of targets.filter((item) => item.state === 'active')) {
    const paths = grouped.get(entry.intentId) || [];
    paths.push(entry.path);
    grouped.set(entry.intentId, paths);
  }
  return [...grouped.entries()]
    .filter(([, paths]) => paths.length > 1)
    .map(([intentId, paths]) => ({ intentId, paths }));
}
