// Eigenständige Inhalte je Berliner Bezirksseite (/webdesign-berlin/:slug).
// Jede Seite beschreibt ihren eigenen Markt, eigene Kieze, typische Branchen,
// ein eigenes Beispiel und eigene Fragen. Gemeinsam sind nur Pakete und Preise.

export const DISTRICT_CONTENT_UPDATED_ISO = '2026-10-23';

export const DISTRICT_PAGES = Object.freeze({
  kreuzberg: {
    label: 'Kiez, Gastro, Kreativszene',
    h1: 'Webdesign in Kreuzberg: Websites für Cafés, Läden und Studios',
    metaTitle: 'Webdesign Kreuzberg | Websites für Kiezbetriebe',
    metaDescription: 'Website für Café, Laden oder Studio in Kreuzberg: schnell auf dem Handy, auf Wunsch zweisprachig, mit Speisekarte, Öffnungszeiten und Anfrage.',
    lead: 'In Kreuzberg entscheiden Gäste und Kundschaft oft unterwegs auf dem Handy, ob sie vorbeikommen. Zwischen Bergmannstraße, Oranienstraße und Landwehrkanal ist die Auswahl riesig. Ich baue Websites, die auf den ersten Blick zeigen, was du anbietest, wann du geöffnet hast und wie man dich erreicht – auf Wunsch auch auf Englisch.',
    heroHighlights: [
      'Speisekarte, Angebote und Öffnungszeiten als echter Text statt PDF',
      'Deutsch und Englisch für internationale Gäste und Kundschaft',
      'Anruf, Route und Reservierung mit einem Tipp erreichbar'
    ],
    heroImage: 'https://res.cloudinary.com/dvd2cd2be/image/upload/v1755194839/admin_gallery/rvkdyvpwrd25fcm9v3av.webp',
    imageAlt: 'Oberbaumbrücke mit U-Bahn zwischen Kreuzberg und Friedrichshain',
    imageSize: [720, 540],
    market: {
      title: 'Was Kreuzberg online anders macht',
      paragraphs: [
        'Kreuzberg ist kein einheitlicher Markt. Im Bergmannkiez kauft Nachbarschaft, die ihren Kiez kennt. Rund um Kottbusser Tor und Oranienstraße mischen sich Stammgäste, Nachtschwärmer und Touristen. Viele finden dich über Google Maps oder eine Suche wie „Frühstück Graefekiez“ und entscheiden in wenigen Sekunden.',
        'Darum zählen bei Kreuzberger Websites vor allem Tempo und Klarheit: ein erster Bildschirm, der dein Angebot zeigt, aktuelle Öffnungszeiten auch für Feiertage, eine Speisekarte oder Preisliste, die Google lesen kann, und ein Kontaktweg ohne Umwege. Gäste, die kein Deutsch sprechen, sind hier keine Ausnahme.'
      ]
    },
    neighborhoods: [
      { name: 'Bergmannkiez', text: 'Rund um Bergmannstraße und Marheinekeplatz: inhabergeführte Läden, Cafés und Praxen mit treuer Stammkundschaft.' },
      { name: 'Graefekiez', text: 'Zwischen Landwehrkanal und Kottbusser Damm: Frühstückscafés, kleine Restaurants und Ateliers, die oft über Empfehlungen gefunden werden.' },
      { name: 'Wrangelkiez', text: 'Nahe Görlitzer Park und Schlesischem Tor: junge Gastronomie, Studios und Werkstätten mit internationalem Publikum.' },
      { name: 'Oranienstraße & Kottbusser Tor', text: 'Bars, Restaurants, Kultur und Handel dicht nebeneinander – hier zählen sichtbare Öffnungszeiten und klare Wegbeschreibungen.' }
    ],
    audiences: [
      { title: 'Cafés und Restaurants', text: 'Speisekarte als Textseite, die Google versteht und die sich ohne PDF-Download lesen lässt. Dazu Tischanfrage, Hinweise zu Allergenen und ein Bereich für wechselnde Tagesgerichte.' },
      { title: 'Bars und Kulturorte', text: 'Programm und Veranstaltungen als eigene Seiten, damit einzelne Abende in der Suche auftauchen. Öffnungszeiten, Anfahrt und Infos zum Zugang gehören gut sichtbar dazu.' },
      { title: 'Läden und Concept Stores', text: 'Sortiment mit eigenen Fotos, Hinweise zu Abholung oder Versand und eine kurze Geschichte zum Laden. Einen echten Onlineshop plane ich als individuelles Projekt.' },
      { title: 'Studios und Werkstätten', text: 'Ob Tattoo, Yoga oder Fahrradwerkstatt: Leistungen mit Preisrahmen, Beispielarbeiten und eine Terminanfrage. Gerade hier hilft eine englische Fassung.' }
    ],
    example: {
      title: 'Beispiel: Website für ein Café in Kreuzberg',
      intro: 'So könnte eine kompakte Website im Start- oder Business-Paket aufgebaut sein:',
      pages: [
        'Startseite mit Bild, Öffnungszeiten und Route',
        'Speisekarte als Textseite mit Preisen',
        'Frühstück oder Mittagstisch als eigene Unterseite',
        'Veranstaltungen und private Feiern mit Anfrageformular',
        'Über uns: wer hinter dem Café steht',
        'Kontakt, Anfahrt und Impressum'
      ],
      focusTitle: 'Darauf achte ich in Kreuzberg',
      focus: [
        'Öffnungszeiten oben auf der Seite und in den strukturierten Daten',
        'Kurze Ladezeit auch im mobilen Netz auf der Straße',
        'Gleiche Angaben auf Website und Google-Unternehmensprofil',
        'Englische Texte dort, wo sie wirklich gebraucht werden'
      ]
    },
    packageLead: 'Für ein Café oder einen kleinen Laden reicht oft das Start-Paket. Mit Speisekarte, Veranstaltungen und englischer Fassung wird es meist das Business-Paket.',
    faq: [
      { q: 'Brauche ich für Kreuzberg eine englische Website?', a: 'Nicht zwingend, aber oft sinnvoll. Wenn viele Gäste kein Deutsch sprechen, reicht häufig eine englische Fassung der wichtigsten Seiten: Start, Angebot, Öffnungszeiten und Kontakt. Mehrsprachigkeit plane ich als Zusatzleistung.' },
      { q: 'Kann meine Speisekarte ohne PDF auf die Website?', a: 'Ja. Ich setze die Speisekarte als normale Textseite um. Sie lädt schneller, ist auf dem Handy gut lesbar und kann von Google erfasst werden. Gerichte und Preise kannst du mir in jeder Form schicken.' },
      { q: 'Wie finden mich Leute, die im Kiez suchen?', a: 'Vor allem über Google Maps und dein Unternehmensprofil. Die Website unterstützt das mit denselben Kontaktdaten, klaren Angebotsseiten und Hinweisen auf deinen Kiez. Eine bestimmte Platzierung kann niemand garantieren.' },
      { q: 'Lassen sich Reservierungen online annehmen?', a: 'Ja. Für einfache Tischanfragen reicht ein Formular. Ein Buchungssystem mit Kalender binde ich nach Aufwand ein und kalkuliere es vorher separat.' }
    ],
    cta: {
      title: 'Dein Kreuzberger Betrieb verdient eine Website, die auf dem Handy überzeugt',
      text: 'Erzähl mir kurz, was du anbietest und wer zu dir kommt. Ich sage dir, welche Seiten du brauchst und welches Paket passt.'
    },
    hubTeaser: 'Für Cafés, Läden und Studios: Öffnungszeiten, Speisekarte und Anfrage schnell auf dem Handy, auf Wunsch zweisprachig.'
  },

  friedrichshain: {
    label: 'Jung, digital, spontan',
    h1: 'Webdesign in Friedrichshain: Websites für Studios und Gastro',
    metaTitle: 'Webdesign Friedrichshain | Websites für Studios & Gastro',
    metaDescription: 'Website für Studio, Café oder Start-up in Friedrichshain: Kursplan, Online-Buchung und Event-Seiten, die auf dem Handy in wenigen Klicks funktionieren.',
    lead: 'Friedrichshain ist jung, digital und schnell im Vergleichen. Zwischen Boxhagener Platz, Ostkreuz und Warschauer Straße buchen viele ihre Kurse, Termine und Tische online – oft spontan am selben Tag. Ich baue Websites, die genau diesen Weg kurz machen: Angebot verstehen, Termin wählen, fertig.',
    heroHighlights: [
      'Kurse, Termine und Preise auf einen Blick',
      'Online-Buchung oder Anfrage ohne Umwege',
      'Event- und Angebotsseiten, die sich schnell aktualisieren lassen'
    ],
    heroImage: 'https://res.cloudinary.com/dvd2cd2be/image/upload/v1755194808/admin_gallery/yrffluom7yifsi40ydlw.webp',
    imageAlt: 'Bemalte Mauer der East Side Gallery in Friedrichshain mit Passanten',
    imageSize: [720, 540],
    market: {
      title: 'Was Kundschaft in Friedrichshain erwartet',
      paragraphs: [
        'Viele Menschen im Kiez erwarten, dass sie einen Yoga-Kurs, einen Friseurtermin oder einen Tisch ohne Anruf buchen können. Wer erst eine E-Mail schreiben muss, verliert gegen den Anbieter, bei dem drei Klicks reichen.',
        'Gleichzeitig ist die Konkurrenz dicht: Rund um Simon-Dach-Straße und Boxi liegen Cafés, Studios und Läden direkt nebeneinander. Eine Website hilft, wenn sie zeigt, was dich unterscheidet – mit echten Fotos, klaren Preisen und Bewertungen statt austauschbarer Werbesprache.'
      ]
    },
    neighborhoods: [
      { name: 'Boxhagener Platz', text: 'Wochenmarkt am Samstag, Flohmarkt am Sonntag und rundherum Cafés, Boutiquen und kleine Studios.' },
      { name: 'Simon-Dach-Straße & Revaler Straße', text: 'Gastronomie und Nachtleben dicht an dicht, mit vielen Gästen, die spontan entscheiden.' },
      { name: 'Ostkreuz & Rudolfkiez', text: 'Verkehrsknoten und Wohnkiez: Praxen, Fitnessangebote und Dienstleister für die Nachbarschaft.' },
      { name: 'Samariterviertel', text: 'Ruhigere Wohnstraßen nahe Frankfurter Allee mit Kitas, Praxen und Handwerk, deren Kundschaft gezielt in der Nähe sucht.' }
    ],
    audiences: [
      { title: 'Fitness, Yoga und Coaching', text: 'Kursplan, Preise und Probestunde direkt auf der Seite. Ich binde dein Buchungstool ein oder plane eine einfache Terminanfrage.' },
      { title: 'Friseur, Beauty und Tattoo', text: 'Leistungen mit Preisrahmen, eine Galerie mit eigenen Arbeiten und ein Termin-Button, der auf jeder Seite sichtbar bleibt.' },
      { title: 'Cafés und Bars', text: 'Aktuelle Öffnungszeiten, Veranstaltungen als eigene Seiten und eine Speisekarte, die ohne PDF funktioniert.' },
      { title: 'Start-ups und Kreative', text: 'Eine schlanke Website, die das Angebot in einem Satz erklärt, Referenzen zeigt und später mit dir wächst.' }
    ],
    example: {
      title: 'Beispiel: Website für ein Yoga- oder Fitnessstudio',
      intro: 'Typische Struktur im Business-Paket, wenn die Buchung im Mittelpunkt steht:',
      pages: [
        'Startseite mit Kursangebot und Probestunde',
        'Kursplan mit Zeiten und Level',
        'Preise und Mitgliedschaften',
        'Team und Trainerinnen',
        'Buchung oder Terminanfrage',
        'Kontakt, Anfahrt und Impressum'
      ],
      focusTitle: 'Darauf achte ich in Friedrichshain',
      focus: [
        'Buchungsbutton in Reichweite des Daumens',
        'Kursplan, den du selbst aktuell halten kannst',
        'Echte Fotos aus deinem Studio statt Stockbilder',
        'Kurze Ladezeit, auch wenn viele Bilder im Spiel sind'
      ]
    },
    packageLead: 'Für Studios mit Kursplan und Buchung passt meist das Business-Paket. Ein Buchungssystem mit Kalender oder Bezahlung kalkuliere ich separat.',
    faq: [
      { q: 'Kann ich mein bestehendes Buchungstool weiter nutzen?', a: 'Meistens ja. Viele Tools lassen sich als Widget oder Link einbinden. Ich prüfe vorher, ob das Tool datenschutzfreundlich eingebunden werden kann und auf dem Handy gut funktioniert.' },
      { q: 'Kann ich Kurse und Events selbst ändern?', a: 'Wenn du Inhalte regelmäßig änderst, plane ich eine einfache Pflegemöglichkeit ein. Das ist eine Zusatzleistung. Alternativ übernehme ich Änderungen im Rahmen einer Wartung.' },
      { q: 'Lohnt sich eine Website, wenn ich schon Instagram habe?', a: 'Instagram ist gut für Reichweite, aber schlecht für feste Infos wie Preise, Zeiten oder Buchung. Eine Website bündelt das an einem Ort, wird bei Google gefunden und gehört dir.' },
      { q: 'Wie schnell ist eine Website für mein Studio online?', a: 'Eine kompakte Website ist oft in zwei bis vier Wochen fertig, wenn Texte und Fotos bereitstehen. Mit Buchung und mehreren Seiten dauert es meist etwas länger.' }
    ],
    cta: {
      title: 'Mach es deiner Kundschaft in Friedrichshain leicht, bei dir zu buchen',
      text: 'Schick mir kurz dein Angebot und wie Kundinnen heute zu dir kommen. Ich zeige dir, wie eine Website mit Buchung für dich aussehen kann.'
    },
    hubTeaser: 'Für Studios, Gastro und junge Marken: Kursplan, Buchung und Events so einfach wie möglich.'
  },

  'prenzlauer-berg': {
    label: 'Familien, Praxen, Qualität',
    h1: 'Webdesign in Prenzlauer Berg: Websites, die Vertrauen schaffen',
    metaTitle: 'Webdesign Prenzlauer Berg | Websites mit Vertrauen',
    metaDescription: 'Website für Praxis, Kursangebot oder Fachgeschäft in Prenzlauer Berg: ruhige Gestaltung, klare Infos vorab und eine einfache Terminanfrage.',
    lead: 'In Prenzlauer Berg wird genau hingeschaut. Rund um Kollwitzplatz, Helmholtzplatz und Kastanienallee leben viele Familien, die Praxen, Kurse und Fachgeschäfte sorgfältig vergleichen. Ich gestalte Websites, die ruhig und vertrauenswürdig wirken, Fragen vorab beantworten und den Weg zum Termin einfach machen.',
    heroHighlights: [
      'Team, Qualifikationen und Leistungen klar vorgestellt',
      'Antworten auf typische Fragen, bevor jemand anruft',
      'Terminanfrage, die auch mit Kind auf dem Arm funktioniert'
    ],
    heroImage: 'https://res.cloudinary.com/dvd2cd2be/image/upload/v1755194857/admin_gallery/houih15c2s9ao7dimwtj.webp',
    imageAlt: 'Eltern mit Kinderwagen auf einem Weg zwischen Berliner Altbauten',
    imageSize: [720, 540],
    market: {
      title: 'Worauf Menschen in Prenzlauer Berg achten',
      paragraphs: [
        'Wer hier eine Kinderärztin, einen Physiotherapeuten oder einen Babykurs sucht, liest gründlich. Wichtig sind Qualifikationen, das Team, Erfahrungen anderer und ganz praktische Fragen: Gibt es freie Termine? Ist die Praxis mit Kinderwagen erreichbar? Was kostet ein Kurs?',
        'Eine Website überzeugt hier weniger mit lauten Versprechen als mit Ruhe und Klarheit. Ein aufgeräumtes Design, gut lesbare Schrift, echte Fotos der Räume und eine nachvollziehbare Terminanfrage schaffen das Vertrauen, das in diesem Teil von Pankow den Ausschlag gibt.'
      ]
    },
    neighborhoods: [
      { name: 'Kollwitzkiez', text: 'Wochenmarkt am Kollwitzplatz, Gründerzeithäuser und viele Praxen, Cafés und Fachgeschäfte im Erdgeschoss.' },
      { name: 'Helmholtzkiez', text: 'Familienreicher Wohnkiez rund um den Helmholtzplatz mit Kitas, Kursanbietern und kleinen Läden.' },
      { name: 'Kastanienallee & Mauerpark', text: 'Mode, Design und Gastronomie mit vielen Besucherinnen und Besuchern am Wochenende.' },
      { name: 'Bötzowviertel', text: 'Ruhiges Viertel am Volkspark Friedrichshain mit inhabergeführten Geschäften und Dienstleistern für die Nachbarschaft.' }
    ],
    audiences: [
      { title: 'Arzt- und Therapiepraxen', text: 'Leistungen, Team und Sprechzeiten verständlich erklärt, dazu Hinweise zu Kassen- und Privatleistungen und eine Terminanfrage.' },
      { title: 'Hebammen, Kurse und Familienangebote', text: 'Kursübersicht mit Terminen, freien Plätzen und Anmeldung. Ein Fragenbereich nimmt Unsicherheiten vor dem ersten Kontakt.' },
      { title: 'Kosmetik und Wellness', text: 'Behandlungen mit Dauer und Preis, Fotos der Räume und ein Buchungsweg, der auch abends funktioniert.' },
      { title: 'Fachgeschäfte und Manufakturen', text: 'Sortiment, Öffnungszeiten und eine kurze Geschichte zum Geschäft – gut für Menschen, die bewusst lokal kaufen.' }
    ],
    example: {
      title: 'Beispiel: Website für eine Physiotherapie-Praxis',
      intro: 'So kann eine vertrauensstarke Praxis-Website im Business-Paket aufgebaut sein:',
      pages: [
        'Startseite mit Schwerpunkten und Terminhinweis',
        'Leistungen mit kurzen Erklärungen',
        'Team mit Qualifikationen und Fotos',
        'Praxisräume und Erreichbarkeit',
        'Häufige Fragen für neue Patientinnen und Patienten',
        'Terminanfrage, Kontakt und Impressum'
      ],
      focusTitle: 'Darauf achte ich in Prenzlauer Berg',
      focus: [
        'Ruhige Gestaltung mit gut lesbarer Schrift',
        'Ehrliche Angaben zu Terminen und Wartezeiten',
        'Hinweise zur Erreichbarkeit, etwa für Kinderwagen',
        'Datenschutzfreundliche Formulare ohne unnötige Felder'
      ]
    },
    packageLead: 'Für Praxen und Kursanbieter mit mehreren Leistungen passt meist das Business-Paket. Eine einzelne Kurs- oder Angebotsseite gelingt auch im Start-Paket.',
    faq: [
      { q: 'Wie sachlich muss eine Praxis-Website sein?', a: 'Sachliche Informationen zu deinen Leistungen helfen Patientinnen und Patienten. Für Werbeaussagen im Gesundheitsbereich gelten besondere Regeln, eine rechtliche Prüfung kann ich nicht ersetzen. Ich formuliere Texte deshalb nüchtern und ohne Heilversprechen.' },
      { q: 'Wie zeige ich Vertrauen mit wenigen Bewertungen?', a: 'Mit Transparenz: echte Fotos von dir und deinen Räumen, deine Qualifikationen, klare Abläufe und Antworten auf typische Fragen. Bewertungen kommen mit der Zeit dazu, die Website kann direkt darauf verlinken.' },
      { q: 'Kann ich Kursplätze online vergeben?', a: 'Ja. Für Kurse reicht oft eine Übersicht mit Anmeldeformular. Wenn freie Plätze automatisch angezeigt werden sollen, binde ich ein passendes Buchungstool ein und kalkuliere das vorher separat.' },
      { q: 'Ist meine Website auch für ältere Menschen gut lesbar?', a: 'Darauf achte ich von Anfang an: ausreichende Schriftgröße, guter Kontrast, klare Schaltflächen und eine einfache Navigation. Das hilft allen, nicht nur Älteren.' }
    ],
    cta: {
      title: 'Eine Website, die in Prenzlauer Berg Vertrauen schafft, bevor jemand anruft',
      text: 'Erzähl mir, was deine Praxis oder dein Angebot ausmacht. Ich zeige dir, welche Inhalte Menschen hier vor dem ersten Termin sehen wollen.'
    },
    hubTeaser: 'Für Praxen, Familienangebote und Fachgeschäfte: ruhige Gestaltung, klare Infos und einfache Terminanfrage.'
  },

  charlottenburg: {
    label: 'City West, etabliert',
    h1: 'Webdesign in Charlottenburg: seriöse Websites für die City West',
    metaTitle: 'Webdesign Charlottenburg | Seriöse Websites',
    metaDescription: 'Website für Kanzlei, Praxis, Makler oder Fachgeschäft in Charlottenburg: seriöser Auftritt, gut lesbar, mehrsprachig möglich und Relaunch ohne Verlust.',
    lead: 'Charlottenburg steht für die City West: Kurfürstendamm, Savignyplatz, Wilmersdorfer Straße und ruhige Wohnviertel rund um den Lietzensee. Viele Betriebe sind seit Jahren etabliert, ihre Kundschaft erwartet einen seriösen, gut lesbaren Auftritt. Ich modernisiere oder baue Websites, die genau das ausstrahlen, ohne den Charakter deines Hauses zu verlieren.',
    heroHighlights: [
      'Seriöser Auftritt für Kanzleien, Praxen und Fachhandel',
      'Gut lesbar, auch für ältere Kundschaft',
      'Relaunch bestehender Websites ohne Verlust guter Inhalte'
    ],
    heroImage: 'https://res.cloudinary.com/dvd2cd2be/image/upload/v1755194749/admin_gallery/fhjfv6rxlxgedyufvks1.webp',
    imageAlt: 'Fahrradampel mit Aufklebern an einer Berliner Straße',
    imageSize: [405, 720],
    market: {
      title: 'Was in Charlottenburg zählt',
      paragraphs: [
        'Hier haben viele Unternehmen eine lange Geschichte – und oft auch eine Website, die schon einige Jahre alt ist. Die Kundschaft ist anspruchsvoll, teils älter, teils international, und erwartet Verlässlichkeit: vollständige Kontaktdaten, klare Zuständigkeiten und nachvollziehbare Leistungen.',
        'Häufig geht es deshalb nicht um einen völlig neuen Auftritt, sondern um einen sauberen Relaunch: bewährte Inhalte erhalten, Struktur und Technik modernisieren, die Website auf dem Handy nutzbar machen und dabei die Sichtbarkeit bei Google nicht verlieren.'
      ]
    },
    neighborhoods: [
      { name: 'Kurfürstendamm', text: 'Einkaufs- und Geschäftsstraße der City West mit Fachhandel, Hotels sowie Praxen und Büros in den Seitenstraßen.' },
      { name: 'Savignyplatz & Kantstraße', text: 'Buchhandlungen, Galerien und Restaurants; die Kantstraße ist für ihre vielen asiatischen Restaurants bekannt.' },
      { name: 'Wilmersdorfer Straße', text: 'Fußgängerzone für den täglichen Bedarf mit Filialen und Fachgeschäften, deren Kundschaft schnell Öffnungszeiten sucht.' },
      { name: 'Schloss Charlottenburg & Lietzensee', text: 'Ruhige Wohnlagen mit Praxen, Kanzleien und Dienstleistern, deren Kundschaft gezielt in der Nähe sucht.' }
    ],
    audiences: [
      { title: 'Kanzleien und Steuerberatung', text: 'Rechtsgebiete oder Leistungen klar gegliedert, Ansprechpartner mit Foto und ein Kontaktformular, das nur abfragt, was wirklich nötig ist.' },
      { title: 'Arzt- und Zahnarztpraxen', text: 'Leistungen, Sprechzeiten und Team übersichtlich, mit Hinweisen zu Anfahrt, Parken und Barrierefreiheit.' },
      { title: 'Immobilienmakler und Hausverwaltungen', text: 'Regionale Kompetenz zeigen, Ansprechpartner vorstellen und Anfragen zu Bewertung oder Verkauf strukturiert entgegennehmen.' },
      { title: 'Fachhandel und Hotels', text: 'Sortiment oder Zimmer mit hochwertigen Fotos, Öffnungszeiten und auf Wunsch eine englische Fassung für internationale Gäste.' }
    ],
    example: {
      title: 'Beispiel: Relaunch einer Kanzlei-Website',
      intro: 'Typischer Ablauf, wenn eine bestehende Website modernisiert wird, meist im Wachstum-Paket:',
      pages: [
        'Bestehende Seiten und Suchbegriffe sichten',
        'Startseite mit Schwerpunkten und Ansprechpartnern',
        'Je Rechtsgebiet oder Leistung eine eigene Seite',
        'Team und Geschichte der Kanzlei',
        'Kontakt mit Erreichbarkeit und Anfahrt',
        'Weiterleitungen von alten auf neue Adressen'
      ],
      focusTitle: 'Darauf achte ich in Charlottenburg',
      focus: [
        'Größere Schrift und starke Kontraste',
        'Vollständiges Impressum und klare Zuständigkeiten',
        'Weiterleitungen, damit gute Google-Platzierungen nicht verloren gehen',
        'Englische Seiten für internationale Kundschaft, wo sinnvoll'
      ]
    },
    packageLead: 'Für einen Relaunch mit mehreren Leistungsseiten passt meist das Wachstum-Paket. Kleinere Praxen und Geschäfte kommen oft mit dem Business-Paket aus.',
    faq: [
      { q: 'Verliere ich bei einem Relaunch meine Google-Platzierungen?', a: 'Das Risiko lässt sich gering halten. Ich prüfe vorher, welche Seiten gefunden werden, übernehme gute Inhalte und richte Weiterleitungen von alten auf neue Adressen ein. Eine Garantie für Platzierungen gibt es trotzdem nicht.' },
      { q: 'Kann meine alte Website Schritt für Schritt erneuert werden?', a: 'Ja. Manchmal reicht es, zuerst Startseite, Kontakt und die wichtigsten Leistungsseiten zu erneuern. Weitere Seiten folgen später. Die Reihenfolge legen wir im Erstgespräch fest.' },
      { q: 'Wie wichtig ist eine englische Version in Charlottenburg?', a: 'Das hängt von deiner Kundschaft ab. Für Hotels, Fachhandel mit vielen Gästen aus dem Ausland oder Kanzleien mit internationalen Mandanten lohnt sie sich oft. Ich plane Mehrsprachigkeit als Zusatzleistung.' },
      { q: 'Kann ich mein Logo und Corporate Design behalten?', a: 'Ja. Ich übernehme Logo, Farben und Schriften und setze sie modern um. Wenn etwas auf dem Handy nicht gut funktioniert, schlage ich behutsame Anpassungen vor.' }
    ],
    cta: {
      title: 'Mach deinen etablierten Betrieb in Charlottenburg auch online zeitgemäß',
      text: 'Schick mir die Adresse deiner aktuellen Website oder beschreib dein Vorhaben. Ich sage dir ehrlich, ob ein Relaunch oder eine Überarbeitung sinnvoller ist.'
    },
    hubTeaser: 'Für Kanzleien, Praxen, Makler und Fachhandel: seriöser Auftritt, gut lesbar und Relaunch ohne Verlust guter Inhalte.'
  },

  lichtenberg: {
    label: 'Wachsender Osten',
    h1: 'Webdesign in Lichtenberg: Websites für Betriebe im Kiez',
    metaTitle: 'Webdesign Lichtenberg | Websites für Betriebe im Kiez',
    metaDescription: 'Website für Handwerk, Praxis oder Familienbetrieb in Lichtenberg: Leistungen und Einsatzgebiet klar zeigen, persönlich betreut aus dem Bezirk.',
    lead: 'Lichtenberg verändert sich. Rund um die Rummelsburger Bucht und in Friedrichsfelde sind neue Wohnquartiere entstanden, in Karlshorst und Alt-Lichtenberg arbeiten viele Handwerks- und Familienbetriebe seit Jahren. Neue Nachbarn suchen online nach Handwerk, Praxen und Läden. Ich arbeite selbst von Lichtenberg aus und baue Websites, die diesen Betrieben helfen, gefunden und angefragt zu werden.',
    heroHighlights: [
      'Persönliche Betreuung direkt aus dem Bezirk',
      'Leistungen und Einsatzgebiet klar beschrieben',
      'Anfrage mit Fotos, etwa für Handwerksaufträge'
    ],
    heroImage: 'https://res.cloudinary.com/dvd2cd2be/image/upload/v1755194716/admin_gallery/joe7dzz6f0lql4uigcn9.webp',
    imageAlt: 'U-Bahn fährt in einen beleuchteten Berliner Tunnel ein',
    imageSize: [720, 540],
    market: {
      title: 'Warum Lichtenberger Betriebe jetzt online sichtbar sein sollten',
      paragraphs: [
        'Viele Lichtenberger Betriebe leben von Empfehlungen und Stammkundschaft. Das funktioniert, solange sich der Kiez nicht verändert. Mit den neuen Wohnquartieren ziehen aber Menschen her, die noch niemanden kennen – und zuerst bei Google suchen.',
        'Für Handwerk, Praxen und Dienstleister heißt das: Eine Website muss nicht laut sein, aber vollständig. Welche Leistungen bietest du an? In welchen Ortsteilen bist du unterwegs? Wie schnell meldest du dich? Wer das klar beantwortet, bekommt Anfragen, die zur eigenen Arbeit passen.'
      ]
    },
    neighborhoods: [
      { name: 'Alt-Lichtenberg & Frankfurter Allee', text: 'Rund um Rathaus und Frankfurter Allee: Läden, Praxen und Dienstleister für den Alltag.' },
      { name: 'Karlshorst', text: 'Villen- und Wohnviertel mit Trabrennbahn, vielen Familien und inhabergeführten Betrieben.' },
      { name: 'Friedrichsfelde & Tierpark', text: 'Wohnquartiere rund um den Tierpark, in denen Praxen, Pflegedienste und Handwerk gefragt sind.' },
      { name: 'Rummelsburger Bucht', text: 'Neue Wohnquartiere am Wasser, deren Bewohnerinnen und Bewohner Anbieter in der Nähe online suchen.' }
    ],
    audiences: [
      { title: 'Handwerk und Bau', text: 'Leistungen nach Gewerk, Einsatzgebiet nach Ortsteilen und ein Anfrageformular, über das Kundschaft Fotos vom Schaden oder Projekt mitschickt.' },
      { title: 'Praxen und Pflegedienste', text: 'Sprechzeiten, Leistungen und Erreichbarkeit mit Bus und Tram verständlich dargestellt, dazu ein klarer Weg zur Terminanfrage.' },
      { title: 'Familienbetriebe und Läden', text: 'Eine ehrliche Vorstellung, wer hinter dem Betrieb steht, Öffnungszeiten und das, was dich von großen Ketten unterscheidet.' },
      { title: 'Gewerbe und Dienstleister', text: 'Für Betriebe in Gewerbegebieten wie an der Herzbergstraße: klare Leistungsseiten für Geschäftskunden, Ansprechpartner und Anfahrt.' }
    ],
    example: {
      title: 'Beispiel: Website für einen Handwerksbetrieb',
      intro: 'Eine typische Struktur im Business-Paket für Handwerk mit Einsatzgebiet in Lichtenberg:',
      pages: [
        'Startseite mit Leistungen und Einsatzgebiet',
        'Eine Seite je Leistung oder Gewerk',
        'Referenzen mit eigenen Projektfotos',
        'Über den Betrieb und das Team',
        'Anfrage mit Foto-Upload',
        'Kontakt, Anfahrt und Impressum'
      ],
      focusTitle: 'Darauf achte ich in Lichtenberg',
      focus: [
        'Einsatzgebiet mit Ortsteilen klar benannt',
        'Telefonnummer und Anfrage auf jeder Seite erreichbar',
        'Gleiche Angaben auf Website und Google-Profil',
        'Kurze Wege: Treffen im Bezirk sind möglich'
      ]
    },
    packageLead: 'Für Handwerk und Dienstleister mit mehreren Leistungen passt meist das Business-Paket. Für einen kleinen Laden oder eine Praxis mit wenigen Seiten reicht oft das Start-Paket.',
    faq: [
      { q: 'Können wir uns für das Projekt persönlich treffen?', a: 'Ja. Da ich selbst in Lichtenberg arbeite, ist ein Treffen im Bezirk meist unkompliziert. Viele Abstimmungen laufen aber genauso gut per Telefon oder Video.' },
      { q: 'Lohnt sich eine Website, wenn ich genug Stammkundschaft habe?', a: 'Gerade dann ist sie eine Absicherung: Stammkundschaft zieht weg oder geht in Rente, neue Nachbarn suchen online. Eine schlanke Website sorgt dafür, dass du auch für sie auffindbar bleibst.' },
      { q: 'Wie beschreibe ich mein Einsatzgebiet richtig?', a: 'Am besten konkret: Ortsteile wie Karlshorst, Friedrichsfelde oder Rummelsburg nennen und sagen, ob du auch angrenzende Bezirke bedienst. Das hilft Kundschaft und Suchmaschinen gleichermaßen.' },
      { q: 'Kann ich Fotos von Aufträgen über die Website empfangen?', a: 'Ja. Ein Anfrageformular mit Foto-Upload ist für Handwerksbetriebe sehr praktisch. Ich richte es so ein, dass die Daten verschlüsselt übertragen werden.' }
    ],
    cta: {
      title: 'Webdesign aus Lichtenberg für Betriebe in Lichtenberg',
      text: 'Erzähl mir, was dein Betrieb macht und wo deine Kundschaft wohnt. Ich zeige dir, welche Seiten du für mehr passende Anfragen brauchst.'
    },
    hubTeaser: 'Für Handwerk, Praxen und Familienbetriebe: Leistungen und Einsatzgebiet klar zeigen, persönlich betreut aus dem Bezirk.'
  },

  mitte: {
    label: 'Zentrum mit Konkurrenz',
    h1: 'Webdesign in Berlin-Mitte: klare Websites für Dienstleister',
    metaTitle: 'Webdesign Berlin-Mitte | Websites für Dienstleister',
    metaDescription: 'Website für Beratung, Kanzlei, Agentur oder Gastronomie in Berlin-Mitte: klare Positionierung, schnelle Technik und Englisch für internationale Kunden.',
    lead: 'In Mitte arbeiten Beratungen, Kanzleien, Agenturen und Start-ups dicht an dicht – vom Hackeschen Markt über die Friedrichstraße bis nach Moabit und Wedding, die ebenfalls zum Bezirk gehören. Wer hier Kundschaft gewinnen will, muss sich klar abgrenzen. Ich baue Websites, die in Sekunden zeigen, wofür du stehst, und internationalen Kunden den Weg zur Anfrage leicht machen.',
    heroHighlights: [
      'Klare Positionierung statt austauschbarer Werbesprache',
      'Deutsch und Englisch für internationale Kundschaft',
      'Schnelle, schlanke Technik ohne Baukasten'
    ],
    heroImage: 'https://res.cloudinary.com/dvd2cd2be/image/upload/v1755194773/admin_gallery/s4bjmdaw4yrjdf8hs7o0.webp',
    imageAlt: 'Bundeskanzleramt im Regierungsviertel von Berlin-Mitte in der Abenddämmerung',
    imageSize: [720, 405],
    market: {
      title: 'Sichtbar werden im Zentrum Berlins',
      paragraphs: [
        'Mitte ist mehr als Alexanderplatz und Regierungsviertel. Zum Bezirk gehören auch Moabit, Wedding und Gesundbrunnen mit ganz eigener Kundschaft. Gemeinsam ist allen Ortsteilen: Die Konkurrenz ist groß, und viele Mitbewerber haben aufwendige Agentur-Websites.',
        'Mit einer kleinen, sehr klaren Website kannst du trotzdem bestehen: eine Startseite, die dein Angebot in einem Satz erklärt, Leistungsseiten mit echten Beispielen und ein Kontaktweg, der Anfragen vorsortiert. Für Kundschaft aus dem Ausland lohnt sich oft eine englische Fassung.'
      ]
    },
    neighborhoods: [
      { name: 'Hackescher Markt & Rosenthaler Platz', text: 'Agenturen, Studios, Mode und Gastronomie mit internationalem Publikum.' },
      { name: 'Friedrichstraße & Regierungsviertel', text: 'Büros, Kanzleien, Verbände und Beratungen, deren Kundschaft Professionalität erwartet.' },
      { name: 'Alexanderplatz', text: 'Handel, Hotels und viel Laufkundschaft – Öffnungszeiten und Wegbeschreibung müssen sofort sichtbar sein.' },
      { name: 'Moabit & Wedding', text: 'Lebendige Kieze mit Praxen, Handwerk, Gastronomie und vielen kleinen Dienstleistern.' }
    ],
    audiences: [
      { title: 'Beratung und Coaching', text: 'Ein klares Angebot, Fallbeispiele mit nachvollziehbaren Ergebnissen und ein Erstgespräch, das sich online anfragen lässt.' },
      { title: 'Kanzleien und Steuerberatung', text: 'Leistungen verständlich erklärt, Ansprechpartner sichtbar und ein Kontaktweg, der Anfragen vorsortiert.' },
      { title: 'Agenturen und Freelancer', text: 'Portfolio mit ausgewählten Arbeiten, eine Leistungsübersicht und eine schnelle Website, die selbst als Visitenkarte überzeugt.' },
      { title: 'Gastronomie und Hotels', text: 'Mehrsprachige Informationen, Öffnungszeiten, Reservierung und gute Fotos für Gäste aus aller Welt.' }
    ],
    example: {
      title: 'Beispiel: Website für eine Beratung',
      intro: 'Typische Struktur im Business- oder Wachstum-Paket für Beratungen in Mitte:',
      pages: [
        'Startseite mit Positionierung in einem Satz',
        'Leistungen mit klarem Nutzen',
        'Fallbeispiele oder Referenzen',
        'Über mich oder das Team',
        'Erstgespräch anfragen mit wenigen Vorab-Fragen',
        'Englische Fassung der Kernseiten'
      ],
      focusTitle: 'Darauf achte ich in Mitte',
      focus: [
        'Eine Kernbotschaft, die sich von großen Agenturen abhebt',
        'Kontaktformular, das Anfragen vorqualifiziert',
        'Schnelle Ladezeit als Qualitätsmerkmal',
        'Englisch dort, wo internationale Kundschaft sucht'
      ]
    },
    packageLead: 'Für Beratungen und Kanzleien mit mehreren Leistungen passt meist das Business-Paket, mit englischer Fassung und Fallbeispielen oft das Wachstum-Paket.',
    faq: [
      { q: 'Wie hebe ich mich in Mitte von großen Agentur-Websites ab?', a: 'Nicht mit mehr Effekten, sondern mit Klarheit: eine Kernbotschaft, konkrete Leistungen und echte Beispiele. Eine schnelle, aufgeräumte Website wirkt oft professioneller als eine überladene.' },
      { q: 'Brauche ich eine englische Website?', a: 'Wenn du internationale Kundschaft hast oder gewinnen willst, ja – zumindest für Start, Leistungen und Kontakt. Ich plane Mehrsprachigkeit als Zusatzleistung und achte auf saubere Sprachversionen für Google.' },
      { q: 'Gehören Moabit und Wedding auch zu Mitte?', a: 'Ja. Seit der Bezirksreform 2001 gehören Moabit, Wedding, Gesundbrunnen, Tiergarten und das Hansaviertel zum Bezirk Mitte. Für deine Website zählt aber vor allem, wo deine Kundschaft wohnt und sucht.' },
      { q: 'Kann das Kontaktformular Anfragen vorsortieren?', a: 'Ja. Mit wenigen gezielten Fragen, etwa zu Anliegen, Zeitrahmen oder Budget, bekommst du Anfragen, die besser zu dir passen. Das Formular bleibt trotzdem kurz.' }
    ],
    cta: {
      title: 'Eine klare Website für dein Angebot im Zentrum Berlins',
      text: 'Beschreib kurz dein Angebot und deine Wunschkundschaft. Ich sage dir, wie sich deine Website in Mitte klar abheben kann.'
    },
    hubTeaser: 'Für Beratung, Kanzleien, Agenturen und Gastro im Zentrum: klare Positionierung, schnell und auf Wunsch zweisprachig.'
  }
});

export function getDistrictPageContent(slug) {
  return DISTRICT_PAGES[slug] || null;
}
