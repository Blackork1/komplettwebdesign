import { PACKAGE_GLOBAL_NOTES } from './packages.js';
import { SITE_FACTS } from '../helpers/siteFacts.js';

// Geprüfte Inhalte der öffentlichen FAQ-Seite. Die älteren FAQ-Datenbankeinträge
// bleiben erhalten; Paketpreise werden erst beim Rendern zentral aufgelöst.
export const siteFaqCategories = Object.freeze([
  { id: 1, name: 'Leistungen', description: 'Was ich für deine Website umsetzen kann.' },
  { id: 2, name: 'Preise & Kosten', description: 'Projektpreis, Zusatzleistungen und laufende Kosten.' },
  { id: 3, name: 'Ablauf', description: 'Vom ersten Gespräch bis zum Livegang.' },
  { id: 4, name: 'Technik & Pflege', description: 'Technische Umsetzung und spätere Betreuung.' },
  { id: 5, name: 'SEO & Rechtliches', description: 'Sichtbarkeit, Rechtstexte und externe Dienste.' }
].map(Object.freeze));

export const siteFaqs = Object.freeze([
  {
    categoryId: 1,
    question: 'Welche Websites setzt du um?',
    answer: 'Ich entwickle individuelle Websites für Selbstständige und kleine Unternehmen: vom Onepager über Unternehmenswebsites bis zu Landingpages. Einen Überblick findest du unter <a href="/leistungen">Leistungen</a>.'
  },
  {
    categoryId: 1,
    question: 'Kannst du meine bestehende Website überarbeiten?',
    answer: 'Ja. Bei einem <a href="/leistungen/website-relaunch">Website-Relaunch</a> schaue ich mir deine bestehende Seite, Inhalte und Ziele an. Daraus klären wir, welche Änderungen oder welcher Neuaufbau sinnvoll sind.'
  },
  {
    categoryId: 1,
    question: 'Was ist in einem Website-Paket enthalten?',
    answer: 'Design, technische Umsetzung und eine für Smartphone und Desktop angepasste Website gehören zum vereinbarten Umfang. Seitenzahl, Inhalte, SEO-Grundlagen und Feedbackrunden unterscheiden sich je nach <a href="/pakete">Paket</a>.'
  },
  {
    categoryId: 1,
    question: 'Ich weiß noch nicht genau, was ich brauche. Passt das trotzdem?',
    answer: 'Ja. Erzähl mir, was du anbietest und was deine Website erreichen soll. In einem <a href="/booking">Kennenlerngespräch</a> ordnen wir gemeinsam ein, welcher Umfang passt.'
  },
  {
    categoryId: 2,
    question: 'Was kostet eine Website?',
    answer: 'Die aktuellen Einstiegspreise findest du in der <a href="{{packages.overviewUrl}}">Paketübersicht</a>. Der konkrete Preis richtet sich nach Seitenzahl, Inhalten und Funktionen.',
    answerWithPrice: 'Die Website-Pakete starten bei {{lowestPackagePriceLabel}}. Der konkrete Preis richtet sich nach Seitenzahl, Inhalten und Funktionen. Die Leistungen vergleichst du in der <a href="{{packages.overviewUrl}}">Paketübersicht</a>.'
  },
  {
    categoryId: 2,
    question: 'Sind Hosting, Domain und Wartung enthalten?',
    answer: `${SITE_FACTS.runningCostNote} Diese Leistungen sind nicht automatisch Teil des einmaligen Projektpreises.`
  },
  {
    categoryId: 2,
    question: 'Wodurch können zusätzliche Kosten entstehen?',
    answer: 'Weitere Seiten, Sonderfunktionen, umfangreiche Texterstellung oder externe Tools können zusätzlich kosten. Den Umfang und die Kosten klären wir vor der Umsetzung.'
  },
  {
    categoryId: 2,
    question: 'Wie läuft die Bezahlung?',
    answer: `Das Zahlungsmodell wird im Angebot vereinbart. ${PACKAGE_GLOBAL_NOTES.vatNote}`
  },
  {
    categoryId: 3,
    question: 'Wie startet die Zusammenarbeit?',
    answer: 'Du kannst mir dein Vorhaben über das <a href="/kontakt">Kontaktformular</a> schildern oder ein <a href="/booking">Kennenlerngespräch buchen</a>. Danach klären wir Anforderungen und Umfang. Das Projekt startet nach Angebot und Freigabe.'
  },
  {
    categoryId: 3,
    question: 'Wie lange dauert die Umsetzung?',
    answer: 'Das hängt vom Umfang, den verfügbaren Inhalten, deinem Feedback und meiner Auslastung ab. Den Zeitplan stimmen wir für dein Projekt ab.'
  },
  {
    categoryId: 3,
    question: 'Was sollte ich zum Start vorbereiten?',
    answer: 'Hilfreich sind dein Angebot, deine Zielgruppe, vorhandene Texte, Bilder und dein Logo. Falls noch Inhalte fehlen, klären wir die Unterstützung und mögliche Zusatzkosten vorab.'
  },
  {
    categoryId: 3,
    question: 'Wie laufen Feedback und Freigabe ab?',
    answer: 'Du siehst den Entwurf und gibst dein Feedback in den vereinbarten Runden. Weitere Wünsche stimmen wir separat ab. Live geht die Website nach deiner finalen Freigabe und gemäß vereinbartem Zahlungsmodell.'
  },
  {
    categoryId: 4,
    question: 'Mit welcher Technik arbeitest du?',
    answer: 'Ich entwickle individuell mit Node.js, EJS, CSS und JavaScript. Die Website liefert serverseitig gerendertes HTML und wird für verschiedene Bildschirmgrößen angepasst.'
  },
  {
    categoryId: 4,
    question: 'Kann ich Inhalte später selbst ändern?',
    answer: 'Eine einfache Inhaltsverwaltung kann individuell geplant werden. Wenn du Texte oder Bilder selbst pflegen möchtest, berücksichtigen wir das vor Projektstart. Ein CMS ist nicht automatisch in den Standardpaketen enthalten.'
  },
  {
    categoryId: 4,
    question: 'Wer kümmert sich nach dem Livegang um die Website?',
    answer: 'Du kannst eine <a href="/leistungen/website-wartung">laufende Wartung</a> separat vereinbaren. Backups, technische Prüfungen, Support und kleine Inhaltsänderungen richten sich nach dem gewählten Betreuungsumfang.'
  },
  {
    categoryId: 4,
    question: 'Sind Buchungssysteme oder mehrsprachige Websites möglich?',
    answer: 'Ja, solche Erweiterungen prüfe ich passend zu deinem Vorhaben. Umfang, Schnittstellen und externe Anbieter fließen in die Kalkulation ein. Sie sind <a href="/pakete/individuell">individuelle Leistungen</a> und nicht automatisch im Standardpaket enthalten.'
  },
  {
    categoryId: 5,
    question: 'Ist Suchmaschinenoptimierung enthalten?',
    answer: 'Technische SEO-Grundlagen wie Überschriften, Meta-Daten und eine saubere HTML-Struktur gehören zum jeweiligen Paketumfang. Weitergehende Maßnahmen oder <a href="/leistungen/local-seo">Local SEO</a> stimmen wir passend zu deinem Projekt ab.'
  },
  {
    categoryId: 5,
    question: 'Garantierst du bestimmte Google-Platzierungen?',
    answer: 'Nein. Ich kann technische und inhaltliche Grundlagen für die Sichtbarkeit schaffen. Bestimmte Platzierungen, Besucherzahlen oder Anfragen lassen sich daraus nicht garantieren.'
  },
  {
    categoryId: 5,
    question: 'Kümmerst du dich um Impressum und Datenschutz?',
    answer: 'Ich kann bereitgestellte Rechtstexte technisch in deine Website einbinden. Die Erstellung oder rechtliche Prüfung übernehmen bei Bedarf spezialisierte Anbieter oder eine Rechtsberatung.'
  },
  {
    categoryId: 5,
    question: 'Kannst du Cookies und Tracking einrichten?',
    answer: 'Die technische Einrichtung von Analyse- und Consent-Tools kann als Zusatzleistung vereinbart werden. Welche Dienste eingesetzt werden und wie sie eingebunden werden, klären wir vorab. Externe Anbietergebühren werden separat berücksichtigt.'
  }
].map(Object.freeze));
