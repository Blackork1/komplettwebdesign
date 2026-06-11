const sharedNotIncluded = [
  'durchgehende Verfügbarkeit ohne separate Vereinbarung',
  'Inhaltsänderungen ohne vereinbarten Rahmen',
  'Drittanbieter-Toolkosten',
  'Rechtsberatung',
  'laufende SEO-Betreuung ohne Zusatzvereinbarung'
];

export const maintenancePlans = Object.freeze([
  {
    id: 'wartung-basis',
    name: 'Wartung Basis',
    priceFrom: 39,
    priceLabel: 'ab 39 €/Monat',
    billingCycle: 'monatlich',
    shortDescription: 'Technische Grundbetreuung für kleine Websites im vereinbarten Umfang.',
    targetGroup: [
      'kleine Websites mit geringer Änderungsfrequenz',
      'Unternehmen ohne eigene technische Betreuung',
      'Kunden, die eine technische Grundprüfung wünschen'
    ],
    included: [
      'technische Sichtprüfung',
      'einfache Erreichbarkeitsprüfung',
      'regelmäßige Backups, sofern über das gewählte Hosting möglich',
      'grundlegende Sicherheitschecks'
    ],
    notIncluded: [
      ...sharedNotIncluded,
      'regelmäßige Inhaltsänderungen'
    ],
    responseTime: 'nach Verfügbarkeit, ohne Express-Zusage',
    contentChangeAllowance: 'keine Inhaltsänderungen oder nur sehr begrenzt nach Absprache',
    backupScope: 'Basis-Backups, sofern technisch möglich',
    monitoringScope: 'einfache Erreichbarkeitsprüfung',
    securityScope: 'grundlegende technische Sichtprüfung auf auffällige Probleme',
    hostingRequired: true,
    emergencyNote: 'Akute Probleme können nach Verfügbarkeit geprüft werden; komplexere Behebungen werden separat eingeordnet.',
    thirdPartyNote: 'Externe Tools, Anbietergebühren und fremde Systeme sind nicht automatisch vollständig enthalten.',
    cancellationNote: 'Kündigungsfristen werden im Angebot festgelegt.',
    ctaLabel: 'Wartung Basis anfragen',
    ctaUrl: '/kontakt?projektart=maintenance',
    isRecommended: false,
    order: 1
  },
  {
    id: 'wartung-standard',
    name: 'Wartung Standard',
    priceFrom: 79,
    priceLabel: 'ab 79 €/Monat',
    billingCycle: 'monatlich',
    shortDescription: 'Regelmäßige technische Betreuung mit kleinem Änderungsrahmen.',
    targetGroup: [
      'kleine Unternehmenswebsites',
      'Websites mit gelegentlichen Änderungen',
      'Kunden, die Backups, Monitoring und technischen Support planbarer bündeln möchten'
    ],
    included: [
      'Backups',
      'Monitoring',
      'Sicherheitschecks',
      'kleine Inhaltsänderungen im definierten Zeitrahmen',
      'technischer Support im vereinbarten Umfang'
    ],
    notIncluded: sharedNotIncluded,
    responseTime: 'innerhalb des vereinbarten Support-Rahmens',
    contentChangeAllowance: 'kleine Änderungen im monatlich vereinbarten Rahmen',
    backupScope: 'regelmäßige Backups, abhängig vom Hosting-Setup',
    monitoringScope: 'Erreichbarkeit und technische Auffälligkeiten im vereinbarten Umfang',
    securityScope: 'Sicherheitschecks im vereinbarten Umfang, ohne vollständige Sicherheitszusage',
    hostingRequired: true,
    emergencyNote: 'Wartungskunden können bei akuten Problemen besser eingeordnet werden; eine Bearbeitung innerhalb einer festen Frist wird nicht pauschal zugesagt.',
    thirdPartyNote: 'Probleme mit Drittanbieter-Tools können geprüft werden, zusätzlicher Aufwand bleibt separat.',
    cancellationNote: 'Kündigungsfristen werden im Angebot festgelegt.',
    ctaLabel: 'Wartung Standard anfragen',
    ctaUrl: '/kontakt?projektart=maintenance',
    isRecommended: true,
    order: 2
  },
  {
    id: 'wartung-plus',
    name: 'Wartung Plus',
    priceFrom: 129,
    priceLabel: 'ab 129 €/Monat',
    billingCycle: 'monatlich',
    shortDescription: 'Erweiterte Betreuung für Websites mit höherem Änderungs- und Prüfbedarf.',
    targetGroup: [
      'umfangreichere Websites',
      'Websites mit häufigerem Änderungsbedarf',
      'Kunden, die bevorzugte Bearbeitung im vereinbarten Rahmen wünschen'
    ],
    included: [
      'erweiterte technische Betreuung',
      'priorisierte Reaktion im Rahmen der Möglichkeiten',
      'mehr Zeit für kleine Änderungen',
      'regelmäßige technische Prüfung',
      'Monitoring und Backup-Kontrolle im vereinbarten Umfang'
    ],
    notIncluded: sharedNotIncluded,
    responseTime: 'priorisiert im vereinbarten Rahmen, ohne durchgehende Notfallzusage',
    contentChangeAllowance: 'mehr Zeit für kleine Änderungen nach vereinbartem Kontingent',
    backupScope: 'erweiterte Backup-Kontrolle, abhängig vom Hosting-Setup',
    monitoringScope: 'regelmäßige technische Prüfung und Erreichbarkeitskontrolle',
    securityScope: 'erweiterte technische Sichtprüfung, keine vollständige Sicherheitszusage',
    hostingRequired: true,
    emergencyNote: 'Akute technische Probleme werden im Rahmen der vereinbarten Kapazität bevorzugt eingeordnet; komplexe Fälle können separat kalkuliert werden.',
    thirdPartyNote: 'Externe Dienste und Schnittstellen liegen nicht vollständig im Einflussbereich und können Zusatzaufwand auslösen.',
    cancellationNote: 'Kündigungsfristen werden im Angebot festgelegt.',
    ctaLabel: 'Wartung Plus anfragen',
    ctaUrl: '/kontakt?projektart=maintenance',
    isRecommended: false,
    order: 3
  }
]);

export function getMaintenancePlanById(id) {
  return maintenancePlans.find((plan) => plan.id === id) || null;
}

export default maintenancePlans;
