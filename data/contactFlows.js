export const contactBranchOptionGroups = Object.freeze({
  relaunchGoals: Object.freeze([
    { value: "design", label: "Design modernisieren", labelEn: "Modernize design" },
    { value: "technical-rebuild", label: "Technisch neu aufbauen", labelEn: "Technical rebuild" },
    { value: "structure", label: "Seitenstruktur verbessern", labelEn: "Improve page structure" },
    { value: "local-seo", label: "Local SEO berücksichtigen", labelEn: "Include local SEO" },
    { value: "performance", label: "Performance verbessern", labelEn: "Improve performance" },
    { value: "content", label: "Inhalte überarbeiten", labelEn: "Revise content" }
  ]),
  googleBusinessProfileStatus: Object.freeze([
    { value: "yes", label: "Ja, ein Profil ist vorhanden", labelEn: "Yes, a profile exists" },
    { value: "no", label: "Nein, noch nicht", labelEn: "No, not yet" },
    { value: "unsure", label: "Noch unsicher", labelEn: "Not sure yet" }
  ]),
  seoFocus: Object.freeze([
    { value: "gbp", label: "Google Business Profile", labelEn: "Google Business Profile" },
    { value: "local-pages", label: "Lokale Leistungsseiten", labelEn: "Local service pages" },
    { value: "technical", label: "Technische SEO-Grundlagen", labelEn: "Technical SEO basics" },
    { value: "structured-data", label: "Strukturierte Daten", labelEn: "Structured data" },
    { value: "content", label: "Lokale Inhalte", labelEn: "Local content" },
    { value: "unsure", label: "Noch unsicher", labelEn: "Not sure yet" }
  ]),
  auditFocus: Object.freeze([
    { value: "technical", label: "Technik", labelEn: "Technical setup" },
    { value: "seo", label: "SEO", labelEn: "SEO" },
    { value: "performance", label: "Performance", labelEn: "Performance" },
    { value: "ux", label: "UX", labelEn: "UX" },
    { value: "conversion", label: "Conversion", labelEn: "Conversion" },
    { value: "local-seo", label: "Local SEO", labelEn: "Local SEO" },
    { value: "content", label: "Inhalte", labelEn: "Content" }
  ]),
  auditDepth: Object.freeze([
    { value: "quick-check", label: "Kurzer Check", labelEn: "Short check" },
    { value: "detailed-audit", label: "Ausführlicher Audit", labelEn: "Detailed audit" },
    { value: "recommendations", label: "Konkrete Handlungsempfehlungen", labelEn: "Concrete recommendations" },
    { value: "relaunch-assessment", label: "Relaunch-Einschätzung", labelEn: "Relaunch assessment" },
    { value: "unsure", label: "Noch unsicher", labelEn: "Not sure yet" }
  ]),
  landingpageGoal: Object.freeze([
    { value: "request", label: "Anfrage erzeugen", labelEn: "Generate enquiries" },
    { value: "appointment", label: "Terminbuchung", labelEn: "Appointment booking" },
    { value: "download", label: "Download oder Lead-Magnet", labelEn: "Download or lead magnet" },
    { value: "campaign", label: "Kampagne", labelEn: "Campaign" },
    { value: "local-service", label: "Lokale Leistung", labelEn: "Local service" },
    { value: "unsure", label: "Noch unsicher", labelEn: "Not sure yet" }
  ]),
  landingpageSource: Object.freeze([
    { value: "new", label: "Neue Landingpage", labelEn: "New landing page" },
    { value: "existing-site", label: "Ergänzung zu bestehender Website", labelEn: "Add-on to existing website" },
    { value: "rework", label: "Bestehende Landingpage überarbeiten", labelEn: "Revise existing landing page" },
    { value: "unsure", label: "Noch unsicher", labelEn: "Not sure yet" }
  ]),
  maintenanceNeed: Object.freeze([
    { value: "maintenance", label: "Regelmäßige Wartung", labelEn: "Regular maintenance" },
    { value: "backups", label: "Backups", labelEn: "Backups" },
    { value: "monitoring", label: "Monitoring", labelEn: "Monitoring" },
    { value: "security-checks", label: "Sicherheitschecks", labelEn: "Security checks" },
    { value: "small-changes", label: "Kleine Änderungen", labelEn: "Small changes" },
    { value: "support", label: "Support", labelEn: "Support" }
  ]),
  maintenanceUrgency: Object.freeze([
    { value: "regular", label: "Regelmäßige Betreuung", labelEn: "Regular support" },
    { value: "one-time", label: "Einmalige Prüfung", labelEn: "One-time check" },
    { value: "acute", label: "Akutes Problem ohne 24/7-Zusage", labelEn: "Acute issue without 24/7 promise" },
    { value: "unsure", label: "Noch unsicher", labelEn: "Not sure yet" }
  ]),
  customFeatureType: Object.freeze([
    { value: "booking-system", label: "Buchungssystem", labelEn: "Booking system" },
    { value: "cms", label: "CMS oder Content-Verwaltung", labelEn: "CMS or content management" },
    { value: "shop-feature", label: "Shop- oder Produktfunktion", labelEn: "Shop or product feature" },
    { value: "tracking", label: "Tracking / Analytics", labelEn: "Tracking / analytics" },
    { value: "animations", label: "Animation", labelEn: "Animation" },
    { value: "multilingual", label: "Mehrsprachigkeit", labelEn: "Multilingual setup" },
    { value: "migration", label: "Inhaltsmigration", labelEn: "Content migration" },
    { value: "other", label: "Sonstige Erweiterung", labelEn: "Other extension" }
  ]),
  bugfixUrgency: Object.freeze([
    { value: "critical", label: "Kritisch, Website funktioniert nicht richtig", labelEn: "Critical, website is not working properly" },
    { value: "visible", label: "Sichtbarer Fehler", labelEn: "Visible issue" },
    { value: "content", label: "Inhaltlicher Fehler", labelEn: "Content issue" },
    { value: "minor", label: "Kleiner Fehler", labelEn: "Small issue" },
    { value: "unsure", label: "Noch unsicher", labelEn: "Not sure yet" }
  ])
});

const commonContactFields = Object.freeze(["preferredContact", "name", "email", "privacyConsent"]);
const commonBudgetFields = Object.freeze(["budgetRange", "timeline"]);

export const contactFlowDefinitions = Object.freeze({
  "new-website": Object.freeze({
    label: "Neue Website",
    labelEn: "New website",
    steps: Object.freeze(["projectType", "packageInterest", "budgetTimeline", "existingWebsite", "pageScope", "content", "optionalFeatures", "hosting", "appointment", "contact"]),
    requiredFields: Object.freeze(["projectType", "packageInterest", ...commonBudgetFields, "existingWebsiteStatus", "pageScope", "contentStatus", "hostingMaintenanceInterest", ...commonContactFields]),
    summaryFields: Object.freeze(["packageInterest", "budgetRange", "timeline", "existingWebsiteStatus", "existingWebsiteUrl", "pageScope", "contentStatus", "optionalFeatures", "hostingMaintenanceInterest", "message"])
  }),
  relaunch: Object.freeze({
    label: "Website-Relaunch",
    labelEn: "Website relaunch",
    steps: Object.freeze(["projectType", "relaunchContext", "relaunchGoals", "content", "budgetTimeline", "optionalFeatures", "appointment", "contact"]),
    requiredFields: Object.freeze(["projectType", "existingWebsiteStatus", ...commonBudgetFields, ...commonContactFields]),
    summaryFields: Object.freeze(["existingWebsiteStatus", "existingWebsiteUrl", "relaunchGoals", "contentStatus", "budgetRange", "timeline", "optionalFeatures", "message"])
  }),
  landingpage: Object.freeze({
    label: "Landingpage",
    labelEn: "Landing page",
    steps: Object.freeze(["projectType", "landingpageGoal", "content", "budgetTimeline", "appointment", "contact"]),
    requiredFields: Object.freeze(["projectType", "landingpageGoal", "landingpageSource", "contentStatus", ...commonBudgetFields, ...commonContactFields]),
    summaryFields: Object.freeze(["landingpageGoal", "landingpageSource", "existingWebsiteUrl", "contentStatus", "budgetRange", "timeline", "message"])
  }),
  "local-seo": Object.freeze({
    label: "Local SEO",
    labelEn: "Local SEO",
    steps: Object.freeze(["projectType", "seoContext", "seoFocus", "budgetTimeline", "appointment", "contact"]),
    requiredFields: Object.freeze(["projectType", "googleBusinessProfileStatus", "localSeoArea", ...commonBudgetFields, ...commonContactFields]),
    summaryFields: Object.freeze(["existingWebsiteStatus", "existingWebsiteUrl", "googleBusinessProfileStatus", "localSeoArea", "seoFocus", "budgetRange", "timeline", "message"])
  }),
  maintenance: Object.freeze({
    label: "Website-Wartung",
    labelEn: "Website maintenance",
    steps: Object.freeze(["projectType", "maintenanceContext", "maintenanceNeed", "contact"]),
    requiredFields: Object.freeze(["projectType", "existingWebsiteUrl", "maintenanceUrgency", ...commonContactFields]),
    summaryFields: Object.freeze(["existingWebsiteUrl", "maintenanceNeed", "maintenanceUrgency", "budgetRange", "timeline", "message"])
  }),
  audit: Object.freeze({
    label: "Website-Audit / Website-Check",
    labelEn: "Website audit / website check",
    steps: Object.freeze(["projectType", "auditContext", "auditFocus", "budgetTimeline", "appointment", "contact"]),
    requiredFields: Object.freeze(["projectType", "existingWebsiteUrl", "auditDepth", ...commonBudgetFields, ...commonContactFields]),
    summaryFields: Object.freeze(["existingWebsiteUrl", "auditFocus", "auditDepth", "budgetRange", "timeline", "message", "auditId", "domain", "scoreBand", "topIssues"])
  }),
  "custom-feature": Object.freeze({
    label: "Zusatzfunktion oder Erweiterung",
    labelEn: "Custom feature or extension",
    steps: Object.freeze(["projectType", "customFeatureContext", "budgetTimeline", "contact"]),
    requiredFields: Object.freeze(["projectType", "existingWebsiteStatus", ...commonBudgetFields, ...commonContactFields]),
    summaryFields: Object.freeze(["existingWebsiteStatus", "existingWebsiteUrl", "customFeatureType", "customFeatureDependencies", "budgetRange", "timeline", "message"])
  }),
  bugfix: Object.freeze({
    label: "Fehlerbehebung an bestehender Website",
    labelEn: "Bug fix on an existing website",
    steps: Object.freeze(["projectType", "bugfixContext", "contact"]),
    requiredFields: Object.freeze(["projectType", "existingWebsiteUrl", "bugfixUrgency", "bugfixDescription", ...commonContactFields]),
    summaryFields: Object.freeze(["existingWebsiteUrl", "bugfixUrgency", "bugfixDescription", "message"])
  }),
  unsure: Object.freeze({
    label: "Noch unsicher",
    labelEn: "Not sure yet",
    steps: Object.freeze(["projectType", "unsureContext", "budgetTimeline", "appointment", "contact"]),
    requiredFields: Object.freeze(["projectType", "existingWebsiteStatus", ...commonContactFields]),
    summaryFields: Object.freeze(["existingWebsiteStatus", "uncertaintyNotes", "budgetRange", "timeline", "message"])
  })
});

export function getContactFlow(projectType) {
  return contactFlowDefinitions[projectType] || contactFlowDefinitions.unsure;
}

export function getRequiredFieldsForProjectType(projectType) {
  return [...getContactFlow(projectType).requiredFields];
}

export function isFieldRequiredForProjectType(projectType, fieldName) {
  return getContactFlow(projectType).requiredFields.includes(fieldName);
}

export function getSummaryFieldsForProjectType(projectType) {
  return [...getContactFlow(projectType).summaryFields];
}
