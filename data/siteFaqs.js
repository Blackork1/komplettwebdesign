import { packages } from './packages.js';
import { maintenancePlans } from './maintenancePlans.js';
import { SITE_FACTS } from '../helpers/siteFacts.js';

// Inhalte der öffentlichen FAQ-Seite. Alle Fragen stehen auf /faq; die Kategorien sind
// Sprungmarken. Umfang, Feedbackrunden und Wartungspreise kommen aus den Paket- und
// Wartungsdaten, Paketpreise werden erst beim Rendern zentral aufgelöst. Von den Varianten
// answerWithPrice → answerWithLowestPrice → answer gilt die erste, deren Preise alle bekannt sind.
// Bei inhaltlichen Änderungen FAQ_MODIFIED_AT anpassen (sichtbares „Stand“-Datum).
export const FAQ_MODIFIED_AT = '2026-11-05';

const pkg = (slug) => packages.find((item) => item.slug === slug);
const feedbackOf = (slug) => (pkg(slug)?.included || []).find((item) => /Feedbackrunde/.test(item)) || '';
const scopeOf = (slug) => pkg(slug)?.pageScopeShort || '';
const plan = (id) => maintenancePlans.find((item) => item.id === id);
const planLabel = (id) => `${plan(id).name} ${plan(id).priceLabel}`;

export const siteFaqCategories = Object.freeze([
  { id: 1, slug: 'leistungen', name: 'Leistungen', description: 'Was ich für deine Website umsetze und wer daran arbeitet.' },
  { id: 2, slug: 'preise-kosten', name: 'Preise & Kosten', description: 'Projektpreis, laufende Kosten und Bezahlung.' },
  { id: 3, slug: 'ablauf', name: 'Ablauf', description: 'Vom ersten Gespräch bis zum Livegang.' },
  { id: 4, slug: 'technik-pflege', name: 'Technik & Pflege', description: 'Technische Umsetzung und Betreuung nach dem Launch.' },
  { id: 5, slug: 'seo-rechtliches', name: 'SEO & Rechtliches', description: 'Sichtbarkeit bei Google, Rechtstexte und Tracking.' }
].map(Object.freeze));

// Kurzfassung oben auf der Seite: die wichtigsten Fakten in einem Absatz.
export const faqSummary = Object.freeze({
  text: 'Kurz zusammengefasst: Ich, Sören Blocksdorf, plane, gestalte und programmiere deine Website persönlich, von Berlin-Lichtenberg aus. Ein Onepager ist meist in 2 bis 4 Wochen online, eine mehrseitige Website in 4 bis 6 Wochen. Hosting, Domain und Wartung kommen separat dazu.',
  textWithPrice: 'Kurz zusammengefasst: Ich, Sören Blocksdorf, plane, gestalte und programmiere deine Website persönlich, von Berlin-Lichtenberg aus. Die Pakete starten bei {{lowestPackagePriceLabel}} als einmaliger Projektpreis. Ein Onepager ist meist in 2 bis 4 Wochen online, eine mehrseitige Website in 4 bis 6 Wochen. Hosting, Domain und Wartung kommen separat dazu.'
});

export const siteFaqs = Object.freeze([
  {
    categoryId: 1,
    question: 'Welche Websites setzt du um?',
    answer: 'Ich entwickle Websites für Selbstständige und kleine Unternehmen: Onepager, Unternehmenswebsites mit mehreren Seiten, Landingpages und Relaunches bestehender Seiten. Jede Website programmiere ich individuell statt mit einer Baukasten-Vorlage und passe sie an Smartphone, Tablet und Desktop an. Typische Kunden sind Handwerksbetriebe, Praxen, Cafés und lokale Dienstleister. Einen Überblick findest du unter <a href="/leistungen">Leistungen</a>.'
  },
  {
    categoryId: 1,
    question: 'Wer setzt meine Website um?',
    answer: `Ich, Sören Blocksdorf, setze deine Website selbst um. Komplett Webdesign ist mein Ein-Personen-Unternehmen in Berlin-Lichtenberg, gegründet ${SITE_FACTS.foundingYear}. Websites baue ich seit ${SITE_FACTS.workingSinceYear}, zuerst freiberuflich nebenbei. Du sprichst vom Erstgespräch über Design und Programmierung bis nach dem Launch mit derselben Person und hast keinen wechselnden Ansprechpartner. Mehr über mich liest du auf der Seite <a href="/about">Über mich</a>.`
  },
  {
    categoryId: 1,
    question: 'Was ist in einem Website-Paket enthalten?',
    answer: `Jedes Paket enthält Design, individuelle Programmierung, eine mobil optimierte Umsetzung und technische SEO-Grundlagen. Die Pakete unterscheiden sich im Umfang: Start umfasst ${scopeOf('start')} mit ${feedbackOf('start')}, Business ${scopeOf('business')} mit ${feedbackOf('business')} und Wachstum ${scopeOf('wachstum')} mit ${feedbackOf('wachstum')}. Größere Vorhaben plane ich als individuelles Projekt. Alle Leistungen vergleichst du in der <a href="/pakete">Paketübersicht</a>.`
  },
  {
    categoryId: 1,
    question: 'Kannst du meine bestehende Website überarbeiten?',
    answer: 'Ja. Bei einem <a href="/leistungen/website-relaunch">Website-Relaunch</a> prüfe ich zuerst deine bestehende Seite: Inhalte, Technik, Ladezeit, mobile Darstellung und welche Seiten Google bereits findet. Danach entscheiden wir, ob gezielte Änderungen reichen oder ein Neuaufbau sinnvoll ist. Bei einem Neuaufbau richte ich Weiterleitungen von den alten auf die neuen Adressen ein, damit bestehende Links und Google-Platzierungen möglichst erhalten bleiben.'
  },
  {
    categoryId: 1,
    question: 'Arbeitest du nur für Unternehmen in Berlin?',
    answer: 'Nein. Ich arbeite von Berlin-Lichtenberg aus für Unternehmen in Berlin, Brandenburg und ganz Deutschland. Die Abstimmung läuft per Telefon oder Videogespräch, Entwürfe und Zwischenstände schauen wir gemeinsam online an. Für den Ablauf macht es deshalb keinen Unterschied, wo dein Unternehmen sitzt. Für Berlin habe ich zusätzlich Seiten zu einzelnen Bezirken, etwa <a href="/webdesign-berlin/lichtenberg">Webdesign in Lichtenberg</a>.'
  },
  {
    categoryId: 1,
    question: 'Ich weiß noch nicht genau, was ich brauche. Passt das trotzdem?',
    answer: 'Ja. Erzähl mir in einem kostenlosen <a href="/booking">Kennenlerngespräch</a>, was du anbietest, wen du erreichen willst und was deine Website leisten soll, zum Beispiel mehr Anfragen oder weniger Rückfragen am Telefon. Danach empfehle ich dir einen passenden Umfang, und du bekommst ein schriftliches Angebot. Das Gespräch ist unverbindlich. Das Projekt beginnt erst, wenn du das Angebot freigibst.'
  },
  {
    categoryId: 2,
    question: 'Was kostet eine Website bei dir?',
    answer: 'Die aktuellen Preise findest du in der <a href="{{packages.overviewUrl}}">Paketübersicht</a>. Es sind einmalige Projektpreise für die Erstellung der Website. Der genaue Preis hängt von Seitenzahl, Inhalten und Funktionen ab und steht vor dem Start in deinem schriftlichen Angebot. Laufende Kosten für Hosting, Domain und Wartung kommen separat dazu.',
    answerWithLowestPrice: 'Meine Website-Pakete starten bei {{lowestPackagePriceLabel}}. Das sind einmalige Projektpreise für die Erstellung der Website. Der genaue Preis hängt von Seitenzahl, Inhalten und Funktionen ab und steht vor dem Start in deinem schriftlichen Angebot. Alle Pakete und ihre Preise vergleichst du in der <a href="{{packages.overviewUrl}}">Paketübersicht</a>.',
    answerWithPrice: 'Meine Website-Pakete starten bei {{lowestPackagePriceLabel}}: Start {{package:start.priceLabel}}, Business {{package:business.priceLabel}}, Wachstum {{package:wachstum.priceLabel}} und individuelle Projekte {{package:individuell.priceLabel}}. Das sind einmalige Projektpreise für die Erstellung. Der genaue Preis hängt von Seitenzahl, Inhalten und Funktionen ab und steht vor dem Start in deinem Angebot. Alle Leistungen vergleichst du in der <a href="{{packages.overviewUrl}}">Paketübersicht</a>.'
  },
  {
    categoryId: 2,
    question: 'Welche laufenden Kosten kommen nach dem Livegang dazu?',
    answer: `Für Hosting, Domain und E-Mail-Postfächer entstehen laufende Kosten, die nicht im einmaligen Projektpreis enthalten sind. Wenn ich mich um die Technik kümmern soll, gibt es drei Wartungspakete: ${planLabel('wartung-basis')}, ${planLabel('wartung-standard')} und ${planLabel('wartung-plus')}. Welche Posten auf dich zukommen und wie hoch sie typischerweise sind, erkläre ich auf der Seite <a href="/leistungen/laufende-kosten-website">laufende Kosten einer Website</a>.`
  },
  {
    categoryId: 2,
    question: 'Wodurch können zusätzliche Kosten entstehen?',
    answer: 'Zusätzliche Kosten entstehen nur, wenn du mehr möchtest als vereinbart: weitere Seiten, Sonderfunktionen wie Buchungssystem oder Shop, umfangreiche Texterstellung, zusätzliche Feedbackrunden oder kostenpflichtige externe Tools. Solche Wünsche bespreche ich mit dir, bevor ich daran arbeite, und nenne dir den Preis vorher. Ohne deine Zustimmung entsteht keine Mehrarbeit auf deine Kosten. Die Preise findest du unter <a href="/leistungen/zusatzleistungen-webdesign">Zusatzleistungen</a>.'
  },
  {
    categoryId: 2,
    question: 'Wie läuft die Bezahlung?',
    answer: 'Wann welcher Betrag fällig wird, steht in deinem schriftlichen Angebot, bevor das Projekt startet. Live geht die Website nach deiner finalen Freigabe und gemäß diesem Zahlungsmodell. Als Kleinunternehmer nach § 19 UStG stelle ich keine Umsatzsteuer in Rechnung. Der Preis im Angebot ist deshalb der Betrag, den du zahlst, ohne zusätzliche Mehrwertsteuer.'
  },
  {
    categoryId: 3,
    question: 'Wie startet die Zusammenarbeit?',
    answer: 'Du schilderst mir dein Vorhaben über das <a href="/kontakt">Kontaktformular</a> oder buchst direkt ein kostenloses <a href="/booking">Kennenlerngespräch</a>. Im Gespräch klären wir Ziele, Inhalte und Umfang. Danach bekommst du ein schriftliches Angebot mit Leistungen, Preis und Zeitrahmen. Sobald du es freigibst, plane ich die Seitenstruktur und beginne mit dem Design. Den kompletten Ablauf beschreibe ich auf der Seite <a href="/ablauf">Ablauf</a>.'
  },
  {
    categoryId: 3,
    question: 'Wie lange dauert die Umsetzung einer Website?',
    answer: 'Ein Onepager ist meist in 2 bis 4 Wochen online, eine mehrseitige Website in 4 bis 6 Wochen. Projekte mit Buchungssystem, Shop oder vielen Seiten dauern entsprechend länger. Am stärksten beeinflusst das Tempo, wie schnell Texte, Bilder und dein Feedback vorliegen. Den konkreten Zeitplan halten wir im Angebot fest. Eine verbindliche Express-Garantie gebe ich nicht.'
  },
  {
    categoryId: 3,
    question: 'Was sollte ich zum Start vorbereiten?',
    answer: 'Hilfreich sind eine kurze Beschreibung deines Angebots, deine wichtigsten Kundengruppen, vorhandene Texte, eigene Fotos, dein Logo und die Zugangsdaten zu einer bestehenden Domain oder Website. Wenn du Websites kennst, die dir gefallen, schick mir die Links. Fehlt noch etwas, ist das kein Hindernis: Wir klären vorab, wobei ich dich bei Texten und Bildern unterstütze und ob dafür Zusatzkosten entstehen.'
  },
  {
    categoryId: 3,
    question: 'Wie laufen Feedback und Freigabe ab?',
    answer: `Du siehst den Entwurf online und gibst dein Feedback gesammelt in den vereinbarten Runden: ${feedbackOf('start')} im Start-Paket, ${feedbackOf('business')} im Business-Paket, ${feedbackOf('wachstum')} im Wachstum-Paket. Weitere Änderungswünsche stimmen wir separat ab. Vor dem Livegang prüfen wir gemeinsam Inhalte, mobile Darstellung und Kontaktwege. Online geht die Website erst nach deiner finalen Freigabe.`
  },
  {
    categoryId: 4,
    question: 'Mit welcher Technik arbeitest du?',
    answer: 'Ich programmiere individuell mit Node.js, EJS, CSS und JavaScript statt mit einem Baukasten. Der Server liefert fertiges HTML aus. Deshalb laden die Seiten schnell, und Suchmaschinen sowie KI-Suchdienste können alle Inhalte direkt lesen. Bilder optimiere ich für kurze Ladezeiten, das Layout passe ich an alle Bildschirmgrößen an. So bekommst du eine Website, die genau auf dein Angebot zugeschnitten ist.'
  },
  {
    categoryId: 4,
    question: 'Kann ich Inhalte später selbst ändern?',
    answer: 'Ja, wenn wir es vor Projektstart einplanen. Für Inhalte, die sich oft ändern, etwa Öffnungszeiten, Speisekarte, Preise oder Neuigkeiten, richte ich dir eine einfache Verwaltung ein. Dort änderst du Texte und Bilder ohne Programmierkenntnisse. Ein vollständiges CMS ist nicht automatisch in den Standardpaketen enthalten. Alternativ übernehme ich Änderungen für dich, einzeln oder im Rahmen einer Wartung.'
  },
  {
    categoryId: 4,
    question: 'Wer kümmert sich nach dem Livegang um die Website?',
    answer: `Wenn du möchtest, ich. Mit einer <a href="/leistungen/website-wartung">Website-Wartung</a> übernehme ich Backups, technische Prüfungen und Sicherheitschecks. ${planLabel('wartung-basis')} deckt die technische Grundbetreuung ab. ${planLabel('wartung-standard')} und ${planLabel('wartung-plus')} enthalten zusätzlich Zeit für kleine Inhaltsänderungen. Ohne Wartungsvertrag beauftragst du Änderungen einzeln, wenn du sie brauchst.`
  },
  {
    categoryId: 4,
    question: 'Sind Buchungssysteme, Shops oder mehrsprachige Websites möglich?',
    answer: 'Ja. Online-Terminbuchung, kleine Shops oder mehrere Sprachen setze ich als <a href="/pakete/individuell">individuelles Projekt</a> um. Ein Beispiel ist die mehrsprachige Website des <a href="/referenzen/kurdisches-filmfestival">Kurdischen Filmfestivals Berlin</a> mit Mediathek und Filmsuche. Umfang, nötige Schnittstellen und externe Anbieter wie Zahlungs- oder Buchungsdienste klären wir vorab, weil sie Preis und Zeitplan bestimmen.'
  },
  {
    categoryId: 5,
    question: 'Ist Suchmaschinenoptimierung enthalten?',
    answer: 'Technische SEO-Grundlagen sind in jedem Paket enthalten: eine saubere Überschriften-Struktur, Seitentitel und Beschreibungen, kurze Ladezeiten und eine gute mobile Darstellung. Ab dem Business-Paket kommt eine Local-SEO-Grundlage für Suchen in deiner Region dazu. Laufende SEO-Betreuung, längere SEO-Texte oder die Arbeit an deinem Google-Unternehmensprofil vereinbaren wir separat, zum Beispiel über <a href="/leistungen/local-seo">Local SEO</a>.'
  },
  {
    categoryId: 5,
    question: 'Garantierst du bestimmte Google-Platzierungen?',
    answer: 'Nein, das kann seriös niemand. Google entscheidet nach eigenen Kriterien, die sich laufend ändern. Ich schaffe die Grundlagen, die Suchmaschinen und KI-Suchdienste brauchen: schnelle, gut strukturierte Seiten und klare Inhalte zu deinen Leistungen und deinem Einsatzgebiet. Wie weit oben du damit erscheinst, hängt zusätzlich von Wettbewerb, Bewertungen und der Pflege deiner Inhalte ab.'
  },
  {
    categoryId: 5,
    question: 'Kümmerst du dich um Impressum und Datenschutz?',
    answer: 'Ich binde Impressum, Datenschutzerklärung und Cookie-Hinweis technisch in deine Website ein, sodass sie von jeder Seite aus erreichbar sind. Die Texte selbst erstelle oder prüfe ich nicht, weil das Rechtsberatung wäre. Dafür eignen sich spezialisierte Generatoren oder eine Anwaltskanzlei. Was dein Impressum enthalten muss, zum Beispiel nach § 5 DDG, klärst du am besten dort.'
  },
  {
    categoryId: 5,
    question: 'Kannst du Cookies und Tracking einrichten?',
    answer: 'Ja, als Zusatzleistung. Ich richte Analyse-Tools technisch ein und, wenn nötig, ein Consent-Banner, das Tracking erst nach Einwilligung startet. Welche Dienste sinnvoll sind, klären wir vorab. Oft reicht eine datensparsame Statistik ohne Cookies. Kosten externer Anbieter kommen separat dazu. Ob ein Banner rechtlich nötig ist und wie es formuliert sein muss, klärt deine Rechtsberatung.'
  }
].map(Object.freeze));
