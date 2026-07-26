function freezeTarget(target) {
  return Object.freeze({
    ...target,
    requiredLinks: Object.freeze([...(target.requiredLinks || [])])
  });
}

export const SEO_RECOVERY_TARGETS = Object.freeze([
  freezeTarget({
    path: '/',
    intentId: 'brand-overview',
    state: 'active',
    priority: 'A',
    primaryQuery: 'komplett webdesign berlin',
    requiredLinks: ['/webdesign-berlin', '/pakete', '/referenzen']
  }),
  freezeTarget({
    path: '/webdesign-berlin',
    intentId: 'website-erstellen-lassen-berlin',
    state: 'active',
    priority: 'A',
    primaryQuery: 'website erstellen lassen berlin',
    requiredLinks: ['/pakete', '/leistungen/website-audit', '/referenzen']
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
    requiredLinks: ['/webdesign-berlin', '/leistungen/laufende-kosten-website']
  }),
  freezeTarget({
    path: '/leistungen/website-audit',
    intentId: 'website-audit',
    state: 'active',
    priority: 'A',
    primaryQuery: 'website audit',
    requiredLinks: ['/website-tester', '/leistungen/website-relaunch']
  }),
  freezeTarget({
    path: '/leistungen/website-wartung',
    intentId: 'website-wartung-berlin',
    state: 'active',
    priority: 'A',
    primaryQuery: 'website wartung berlin',
    requiredLinks: ['/pakete', '/leistungen/laufende-kosten-website']
  }),
  freezeTarget({
    path: '/branchen/webdesign-blumenladen',
    intentId: 'webdesign-blumenladen-commercial',
    state: 'active',
    priority: 'A',
    primaryQuery: 'website erstellen lassen blumenladen',
    requiredLinks: ['/blog/seo-fuer-blumenladen', '/pakete']
  }),
  freezeTarget({
    path: '/blog/seo-fuer-blumenladen',
    intentId: 'seo-blumenladen-informational',
    state: 'active',
    priority: 'A',
    primaryQuery: 'seo für blumenladen',
    requiredLinks: ['/branchen/webdesign-blumenladen', '/leistungen/local-seo']
  }),
  freezeTarget({
    path: '/blog/website-kosten-2025-einfach-erklaert',
    intentId: 'website-kosten-informational',
    state: 'active',
    priority: 'A',
    primaryQuery: 'website kosten',
    requiredLinks: ['/pakete', '/leistungen/laufende-kosten-website']
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
    requiredLinks: ['/website-tester/seo', '/leistungen/website-audit']
  }),
  freezeTarget({
    path: '/website-tester/seo',
    intentId: 'seo-test-free',
    state: 'active',
    priority: 'B',
    primaryQuery: 'seo test',
    requiredLinks: ['/website-tester', '/leistungen/website-audit']
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
