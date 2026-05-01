const UPDATED_AT = '2026-04-25T09:00:00+02:00';
const DEFAULT_IMAGE = '/images/heroBg.webp';

function faq(name, text) {
  return {
    '@type': 'Question',
    name,
    acceptedAnswer: {
      '@type': 'Answer',
      text
    }
  };
}

export const SEO_GUIDE_CLUSTER = Object.freeze([
  {
    title: 'Was kostet eine Website in Berlin?',
    slug: 'website-kosten-berlin',
    excerpt: 'Preise ab 499 EUR: Welche Website-Pakete sinnvoll sind, welche laufenden Kosten dazukommen und worauf Berliner Unternehmen achten sollten.',
    description: 'Website-Kosten in Berlin: Preise ab 499 EUR, Paketvergleich, laufende Kosten und Budget-Empfehlung für kleine Unternehmen.',
    image_url: '/images/ratgeber/Kosten.png',
    category: 'Kosten',
    featured: true,
    published: true,
    created_at: UPDATED_AT,
    updated_at: UPDATED_AT,
    content: `
      <p><strong>Kurzantwort:</strong> Eine professionelle Website in Berlin startet bei Komplett Webdesign ab 499 EUR. Für die meisten kleinen Unternehmen liegen sinnvolle Website-Projekte zwischen 899 EUR und 1.499 EUR, weil neben Design auch Texte, mobile Darstellung, On-Page-SEO, Kontaktwege und eine saubere technische Grundlage gebraucht werden.</p>
      <h2>Website-Kosten im Überblick</h2>
      <p>Als grobe Orientierung gilt: Ein Onepager ist der günstige Einstieg, eine Business-Website ist für die meisten kleinen Unternehmen der beste Standard, und Premium lohnt sich bei mehr Seiten, Buchungssystem oder stärkerer SEO-Struktur.</p>
      <div class="table-responsive">
        <table class="table">
          <thead>
            <tr>
              <th>Paket</th>
              <th>Preis</th>
              <th>Geeignet für</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Basis</td>
              <td>ab 499 EUR</td>
              <td>digitale Visitenkarte, Gründer, kleine lokale Anbieter</td>
            </tr>
            <tr>
              <td>Business</td>
              <td>ab 899 EUR</td>
              <td>Firmenwebsite mit Leistungen, Kontaktformular und On-Page-SEO</td>
            </tr>
            <tr>
              <td>Premium</td>
              <td>ab 1.499 EUR</td>
              <td>umfangreichere Websites mit Strategie, SEO und Buchungssystem</td>
            </tr>
          </tbody>
        </table>
      </div>
      <h2>Welche Website-Kosten sind realistisch?</h2>
      <p>Der Preis hängt vor allem davon ab, wie viele Seiten, Texte und Funktionen deine Website braucht. Ein Onepager ist günstiger als eine mehrseitige Firmenwebsite mit Leistungsseiten, Kontaktformular, SEO-Struktur, Buchungssystem oder Shop-Perspektive.</p>
      <ul>
        <li><strong>Basis ab 499 EUR:</strong> eine Seite mit Design, Texten und SEO-Grundoptimierung. Ideal, wenn du schnell professionell online sein willst.</li>
        <li><strong>Business ab 899 EUR:</strong> bis zu 5 Seiten mit Leistungen, Kontaktformular, Über-uns-/Team-Bereich und On-Page-SEO. Das passt für viele lokale Dienstleister.</li>
        <li><strong>Premium ab 1.499 EUR:</strong> bis zu 20 Seiten mit Strategie, SEO, umfangreicher Struktur und Buchungssystem. Sinnvoll bei mehreren Angeboten, Standorten oder mehr Content.</li>
      </ul>
      <h2>Welche laufenden Kosten kommen dazu?</h2>
      <p>Bei einer Website solltest du einmalige Projektkosten und laufende Betriebskosten getrennt betrachten. Domain und Mail starten ab 10 EUR pro Monat, Hosting ab 10 EUR pro Monat und Wartung ab 5 EUR pro Monat. So bleibt klar, was der Aufbau kostet und was später für Betrieb, Sicherheit und Betreuung anfällt.</p>
      <h2>Wann lohnt sich ein größeres Paket?</h2>
      <p>Ein größeres Paket lohnt sich, wenn deine Website mehr leisten soll als nur "da sein". Sobald du mehrere Leistungen erklären, lokal in Berlin gefunden werden, Buchungen ermöglichen oder Anfragen vorqualifizieren willst, brauchst du Struktur, Texte, interne Verlinkung und klare Kontaktwege.</p>
      <h2>Welche Budget-Entscheidung ist sinnvoll?</h2>
      <p>Wenn du nur eine professionelle Startseite brauchst, reicht meist Basis. Wenn du regelmäßig über Google, Empfehlungen oder lokale Suche Anfragen gewinnen willst, ist Business oft der bessere Einstieg. Premium lohnt sich, wenn du mehrere Leistungen, viele Inhalte, ein Buchungssystem oder spätere Shop-Funktionen einplanst.</p>
      <h2>So vermeidest du versteckte Kosten</h2>
      <p>Klare Angebote nennen Seitenanzahl, enthaltene Texte, SEO-Umfang, technische Einrichtung, Feedbackrunden und laufende Kosten separat. Wenn du bereits eine Website hast, starte mit dem <a href="/website-tester">kostenlosen Website-Tester</a>. Danach lässt sich besser einschätzen, ob eine Optimierung reicht oder ein Relaunch sinnvoller ist.</p>
      <p><a class="btn btn-accent" href="/pakete">Pakete vergleichen</a> <a class="btn btn-outline-primary" href="/kontakt">Budget einschätzen lassen</a></p>
    `,
    faq_json: [
      faq('Was kostet eine einfache Website in Berlin?', 'Eine einfache Website startet bei Komplett Webdesign ab 499 EUR. Darin enthalten sind eine Seite, Texte, SEO-Grundoptimierung und mobilfreundliches Design.'),
      faq('Was kostet eine mehrseitige Firmenwebsite?', 'Eine mehrseitige Firmenwebsite startet im Business-Paket ab 899 EUR. Enthalten sind bis zu 5 Seiten, Kontaktformular, Leistungsseiten, Über-uns-/Team-Bereich und On-Page-SEO.'),
      faq('Sind Hosting und Wartung im Website-Preis enthalten?', 'Hosting und Wartung sind separate laufende Leistungen. Domain und Mail starten ab 10 EUR pro Monat, Hosting ab 10 EUR pro Monat und Wartung ab 5 EUR pro Monat.'),
      faq('Wann brauche ich das Premium-Paket?', 'Premium passt für umfangreichere Websites mit bis zu 20 Seiten, mehreren Leistungen, lokaler SEO-Struktur, Buchungssystem oder späterer Shop-Perspektive.')
    ]
  },
  {
    title: 'Website erstellen lassen in Berlin: Ablauf, Dauer und Kosten',
    slug: 'website-erstellen-berlin-ablauf-dauer-kosten',
    excerpt: 'So läuft dein Website-Projekt ab: Vorbereitung, Zeitplan, Inhalte, Launch-Checks und typische Kosten in 2 bis 8 Wochen.',
    description: 'Website erstellen lassen in Berlin: Ablauf, Dauer, Kosten, Vorbereitung, Inhalte und Launch-Checks verständlich erklärt.',
    image_url: '/images/ratgeber/Ablauf.png',
    category: 'Ablauf',
    featured: true,
    published: true,
    created_at: UPDATED_AT,
    updated_at: UPDATED_AT,
    content: `
      <p><strong>Kurzantwort:</strong> Eine Website erstellen zu lassen dauert bei kleinen Unternehmen meist 2 bis 8 Wochen. Basis-Websites sind oft nach 2 bis 4 Wochen online, Business-Websites nach 4 bis 6 Wochen und umfangreiche Projekte nach 6 bis 8 Wochen.</p>
      <h2>Website-Projekt in 6 Schritten</h2>
      <p>Ein gutes Website-Projekt folgt einer klaren Reihenfolge: erst Ziele und Struktur, dann Inhalte und Design, danach technische Umsetzung, Tests und Launch. So entsteht nicht nur eine schöne Seite, sondern ein Auftritt, der verstanden, gefunden und angefragt werden kann.</p>
      <h2>Der typische Ablauf einer Website-Erstellung</h2>
      <ol>
        <li><strong>Erstgespräch:</strong> Ziele, Zielgruppe, Angebot, Wettbewerb, Budget und gewünschte Funktionen klären.</li>
        <li><strong>Struktur:</strong> Seitenplan, Kernbotschaft, lokale Keywords und wichtigste Kontaktwege festlegen.</li>
        <li><strong>Texte und Inhalte:</strong> Leistungen verständlich erklären, Einwände beantworten und passende Bilder auswählen.</li>
        <li><strong>Design:</strong> Layout, Farben, Bildsprache und Nutzerführung so ausarbeiten, dass Besucher schnell verstehen, warum sie anfragen sollten.</li>
        <li><strong>Umsetzung:</strong> mobile Website, Kontaktformular, technische SEO-Basis, Performance und rechtliche Pflichtseiten einrichten.</li>
        <li><strong>Launch:</strong> Domain, Hosting, SSL, Sitemap, Weiterleitungen, Search Console und Conversion-Tracking prüfen.</li>
      </ol>
      <h2>Wie lange dauert welcher Website-Typ?</h2>
      <p>Die Dauer hängt vom Umfang ab. Ein Onepager braucht weniger Abstimmung als eine Firmenwebsite mit mehreren Leistungsseiten, Buchungssystem oder Shop-Vorbereitung.</p>
      <div class="table-responsive">
        <table class="table">
          <thead>
            <tr>
              <th>Website-Typ</th>
              <th>Dauer</th>
              <th>Typischer Fokus</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Basis</td>
              <td>2 bis 4 Wochen</td>
              <td>schneller professioneller Start mit einer Seite</td>
            </tr>
            <tr>
              <td>Business</td>
              <td>4 bis 6 Wochen</td>
              <td>Leistungsseiten, Kontaktformular, Texte und SEO-Grundlage</td>
            </tr>
            <tr>
              <td>Premium</td>
              <td>6 bis 8 Wochen</td>
              <td>mehr Struktur, Strategie, Inhalte und Funktionen</td>
            </tr>
          </tbody>
        </table>
      </div>
      <h2>Was macht den Prozess schneller?</h2>
      <p>Schneller wird das Projekt, wenn Angebot, Leistungen, Preise, Ansprechpartner, Logo und vorhandene Bilder früh klar sind. Wenn Texte fehlen, kann Komplett Webdesign sie erstellen und direkt auf Zielgruppe, lokale Suche und Anfrageziele ausrichten.</p>
      <h2>Wie wird der Erfolg messbar?</h2>
      <p>Vor dem Livegang sollten Kontaktformular, Telefonklicks, Buchungssystem, Website-Tester-Klicks und wichtige CTA-Klicks als Ereignisse geplant werden. So erkennst du später, welche Seiten Anfragen, Reservierungen oder Buchungen auslösen.</p>
      <h2>Was solltest du vor dem Erstgespräch vorbereiten?</h2>
      <p>Hilfreich sind 3 bis 5 Wettbewerber, eine grobe Liste deiner Leistungen, vorhandene Bilder, Wunschfunktionen und eine ehrliche Einschätzung, was deine aktuelle Website nicht leistet. Das spart Abstimmung und macht das Angebot genauer.</p>
      <h2>Was kostet die Website-Erstellung?</h2>
      <p>Bei Komplett Webdesign starten Websites ab 499 EUR. Für eine mehrseitige Unternehmenswebsite mit Kontaktformular, Leistungsseiten und On-Page-SEO solltest du eher mit dem Business-Paket ab 899 EUR planen. Umfangreichere Projekte mit mehr Seiten, Strategie oder Buchungssystem starten ab 1.499 EUR.</p>
      <p><a class="btn btn-accent" href="/webdesign-berlin">Webdesign Berlin ansehen</a> <a class="btn btn-outline-primary" href="/website-tester">Bestehende Website prüfen</a></p>
    `,
    faq_json: [
      faq('Wie lange dauert eine Website-Erstellung in Berlin?', 'Je nach Paket dauert die Umsetzung meist 2 bis 8 Wochen. Basis-Projekte liegen häufig bei 2 bis 4 Wochen, Business-Projekte bei 4 bis 6 Wochen und Premium-Projekte bei 6 bis 8 Wochen.'),
      faq('Sind Website-Texte enthalten?', 'Ja, Texte sind in den Paketen enthalten. Der Umfang hängt vom gewählten Paket, der Seitenanzahl und den Leistungen ab, die erklärt werden müssen.'),
      faq('Wird SEO direkt bei der Website-Erstellung mitgemacht?', 'Ja. Titles, Meta Descriptions, H1, interne Links, Seitenstruktur, mobile Darstellung und lokale Signale werden von Anfang an berücksichtigt.'),
      faq('Was brauche ich vor dem Erstgespräch?', 'Hilfreich sind eine Liste deiner Leistungen, Zielgruppe, vorhandene Bilder, Wunschfunktionen, Beispiele von Websites, die dir gefallen, und eine grobe Budgetvorstellung.')
    ]
  },
  {
    title: 'Website-Relaunch Berlin: Wann lohnt sich ein Neustart?',
    slug: 'website-relaunch-berlin',
    excerpt: 'Relaunch oder gezielte Optimierung? So erkennst du den richtigen Zeitpunkt und schützt Rankings, Weiterleitungen und Anfragen.',
    description: 'Website-Relaunch in Berlin planen: Entscheidungshilfe, SEO-Schutz, Weiterleitungen, Tracking, Ablauf und Relaunch-Checkliste.',
    image_url: '/images/ratgeber/Relaunch.png',
    category: 'Relaunch',
    featured: false,
    published: true,
    created_at: UPDATED_AT,
    updated_at: UPDATED_AT,
    content: `
      <p><strong>Kurzantwort:</strong> Ein Website-Relaunch lohnt sich, wenn deine Website veraltet wirkt, mobil schlecht nutzbar ist, langsam lädt, keine Anfragen bringt oder nicht mehr zu deinen wichtigsten Leistungen und Suchbegriffen passt.</p>
      <h2>Relaunch: schnelle Entscheidungshilfe</h2>
      <p>Ein Relaunch ist sinnvoll, wenn mehrere Probleme gleichzeitig auftreten: schwaches Design, schlechte mobile Nutzung, langsame Ladezeit, unklare Inhalte und fehlende Anfragen. Wenn nur einzelne Bereiche schwach sind, reicht oft eine gezielte Optimierung.</p>
      <h2>Typische Gründe für einen Website-Relaunch</h2>
      <ul>
        <li>Das Design wirkt alt und passt nicht mehr zur Qualität deines Angebots.</li>
        <li>Besucher verstehen nicht schnell genug, welche Leistungen du anbietest.</li>
        <li>Die mobile Version ist schwer zu bedienen oder lädt zu langsam.</li>
        <li>Wichtige Berliner Suchanfragen werden von der Seitenstruktur nicht abgedeckt.</li>
        <li>Kontaktformular, Telefon-CTA oder Buchungssystem sind nicht klar genug sichtbar.</li>
        <li>Tracking fehlt, sodass du nicht siehst, welche Seiten Anfragen bringen.</li>
      </ul>
      <h2>SEO beim Relaunch schützen</h2>
      <p>Der größte Relaunch-Fehler ist ein neues Design ohne URL- und SEO-Plan. Vor dem Relaunch sollten bestehende URLs, Rankings, Backlinks, wichtige Suchbegriffe und aktuelle Seitenleistungen geprüft werden. Danach bekommen relevante Seiten passende Weiterleitungen, neue Titles, eindeutige H1, interne Links und self-canonicals.</p>
      <h2>Relaunch-Checkliste</h2>
      <ul>
        <li>Bestehende URLs exportieren und bewerten.</li>
        <li>Wichtige Seiten, Rankings und Backlinks sichern.</li>
        <li>Neue Seitenstruktur und Weiterleitungen planen.</li>
        <li>Kontaktwege, CTAs und Conversion-Tracking festlegen.</li>
        <li>Mobile Darstellung, Ladezeit, Formular und Sitemap vor Launch testen.</li>
      </ul>
      <h2>Relaunch oder Optimierung?</h2>
      <p>Nicht jede Website muss komplett neu gebaut werden. Wenn Technik, Struktur und Design grundsätzlich funktionieren, reichen oft bessere Texte, interne Links, klare CTAs und lokale SEO-Optimierung. Wenn Design, Technik und Inhalte gleichzeitig schwach sind, ist ein Relaunch meist sauberer.</p>
      <div class="table-responsive">
        <table class="table">
          <thead>
            <tr>
              <th>Situation</th>
              <th>Besserer Weg</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Design wirkt okay, aber Texte und CTAs sind schwach</td>
              <td>Optimierung</td>
            </tr>
            <tr>
              <td>Mobile Nutzung, Technik und Struktur sind veraltet</td>
              <td>Relaunch</td>
            </tr>
            <tr>
              <td>Rankings existieren, aber Anfragen bleiben aus</td>
              <td>SEO- und Conversion-Optimierung prüfen</td>
            </tr>
            <tr>
              <td>Neue Leistungen, neue Zielgruppe oder neues Angebot</td>
              <td>oft Relaunch mit neuer Seitenstruktur</td>
            </tr>
          </tbody>
        </table>
      </div>
      <h2>Vor dem Relaunch messen</h2>
      <p>Nutze den <a href="/website-tester">Website-Tester</a>, bevor du ein Relaunch-Angebot anfragst. Der Test zeigt technische, SEO- und Inhaltsprobleme und hilft dabei, die richtigen Prioritäten für den Neustart zu setzen.</p>
      <p><a class="btn btn-accent" href="/kontakt">Relaunch besprechen</a> <a class="btn btn-outline-primary" href="/ratgeber/website-kosten-berlin">Kosten einschätzen</a></p>
    `,
    faq_json: [
      faq('Verliert man beim Relaunch Google-Rankings?', 'Nicht automatisch. Mit URL-Mapping, Weiterleitungen, sauberer Seitenstruktur, internen Links und Search-Console-Prüfung lassen sich Ranking-Risiken deutlich reduzieren.'),
      faq('Wann reicht eine Optimierung statt Relaunch?', 'Eine Optimierung reicht oft, wenn Design, Technik und Grundstruktur noch funktionieren. Dann können Texte, CTAs, interne Links, Ladezeit und lokale SEO gezielt verbessert werden.'),
      faq('Wie lange dauert ein Website-Relaunch?', 'Je nach Umfang dauert ein Relaunch meist 4 bis 8 Wochen. Kleinere Websites können schneller umgesetzt werden, wenn Inhalte, Seitenstruktur und Feedback zügig geklärt sind.'),
      faq('Was ist vor einem Relaunch besonders wichtig?', 'Vor einem Relaunch sollten bestehende URLs, Rankings, Backlinks, Weiterleitungen, Tracking und die neue Seitenstruktur geplant werden.')
    ]
  },
  {
    title: 'Baukasten vs. professionelle Website',
    slug: 'baukasten-vs-professionelle-website',
    excerpt: 'Wann ein Baukasten reicht und wann eine betreute Website mehr bringt: SEO, Design, Support, Zeitaufwand und Wachstum im Vergleich.',
    description: 'Baukasten vs. professionelle Website: Entscheidungshilfe für kleine Unternehmen in Berlin mit SEO-, Kosten- und Support-Vergleich.',
    image_url: '/images/ratgeber/Baukasten.png',
    category: 'Entscheidungshilfe',
    featured: true,
    published: true,
    created_at: UPDATED_AT,
    updated_at: UPDATED_AT,
    content: `
      <p><strong>Kurzantwort:</strong> Ein Website-Baukasten reicht, wenn du schnell eine sehr einfache Online-Visitenkarte brauchst und Strategie, Texte, SEO, Technik und Pflege selbst übernehmen willst. Eine professionelle Website lohnt sich, wenn Sichtbarkeit, Vertrauen, klare Kontaktwege und langfristige Erweiterbarkeit wichtig sind.</p>
      <h2>Die einfache Entscheidung</h2>
      <p>Wähle einen Baukasten, wenn Zeitaufwand für dich kein Problem ist und die Website keine zentrale Rolle für Anfragen spielt. Wähle eine professionelle Website, wenn dein Auftritt Vertrauen schaffen, bei Google sichtbar werden und konkrete Kontaktanfragen auslösen soll.</p>
      <h2>Wann reicht ein Baukasten?</h2>
      <p>Ein Baukasten passt, wenn dein Angebot einfach ist, du kaum lokale SEO-Ziele hast und du bereit bist, Design, Inhalte, Datenschutz, Tracking und Pflege selbst zu übernehmen. Für einen schnellen Start kann das sinnvoll sein, solange du die Grenzen kennst.</p>
      <h2>Wann ist professionelle Umsetzung sinnvoll?</h2>
      <ul>
        <li>Du möchtest für lokale Suchanfragen in Berlin sichtbar werden.</li>
        <li>Du brauchst klare Leistungsseiten, Kontaktformular, Buchungssystem oder Shop-Perspektive.</li>
        <li>Du willst Ladezeit, Datenschutz-Grundlagen, Tracking und SEO sauber eingerichtet haben.</li>
        <li>Du möchtest Texte, Struktur, Design, Hosting und Wartung aus einer Hand.</li>
        <li>Du willst nicht jedes technische Problem selbst lösen.</li>
      </ul>
      <h2>Der wichtigste Unterschied</h2>
      <p>Eine professionelle Website wird nicht nur gestaltet, sondern geplant: Zielgruppe, Einwände, lokale Keywords, Seitenstruktur, CTAs, Tracking und spätere Erweiterbarkeit gehören direkt zum Projekt. Genau dieser Strategieanteil fehlt bei vielen Baukasten-Websites.</p>
      <h2>Vergleich: Baukasten oder professionelle Website?</h2>
      <div class="table-responsive">
        <table class="table">
          <thead>
            <tr>
              <th>Kriterium</th>
              <th>Baukasten</th>
              <th>Professionelle Website</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Kosten</td>
              <td>niedriger Einstieg, laufende Monatskosten und eigener Zeitaufwand</td>
              <td>höhere Projektkosten, dafür Planung und Umsetzung aus einer Hand</td>
            </tr>
            <tr>
              <td>SEO</td>
              <td>Grundlagen möglich, Strategie musst du selbst entwickeln</td>
              <td>Struktur, Keywords, interne Links und lokale Signale werden geplant</td>
            </tr>
            <tr>
              <td>Design</td>
              <td>oft templatebasiert</td>
              <td>auf Zielgruppe, Angebot und Vertrauen ausgerichtet</td>
            </tr>
            <tr>
              <td>Support</td>
              <td>du löst vieles selbst</td>
              <td>fester Ansprechpartner für Technik, Inhalte und Weiterentwicklung</td>
            </tr>
          </tbody>
        </table>
      </div>
      <h2>Was ist für Berliner Unternehmen wichtiger?</h2>
      <p>Für lokale Anbieter zählt nicht nur, dass eine Website online ist. Entscheidend ist, ob Leistungen schnell verstanden werden, ob Vertrauen entsteht und ob Besucher ohne Nachdenken anfragen, buchen oder anrufen können. Genau dort trennt sich eine einfache Baukasten-Seite von einer Website, die als Vertriebskanal gedacht ist.</p>
      <p><a class="btn btn-accent" href="/pakete">Professionelle Pakete ansehen</a> <a class="btn btn-outline-primary" href="/website-tester">Website prüfen lassen</a></p>
    `,
    faq_json: [
      faq('Ist ein Website-Baukasten schlecht für SEO?', 'Nicht grundsätzlich. Häufig fehlen aber saubere Struktur, individuelle Inhalte, technische Optimierung, interne Verlinkung und eine klare lokale Keyword-Strategie.'),
      faq('Kann man später von einem Baukasten wechseln?', 'Ja. Beim Wechsel sollten Inhalte, URLs, Weiterleitungen, Tracking und die neue Seitenstruktur sauber geplant werden, damit keine Sichtbarkeit verloren geht.'),
      faq('Was ist der Vorteil einer professionellen Website?', 'Du bekommst Strategie, Design, Texte, Technik, SEO, Hosting-Optionen, Wartung und messbare Lead-Ziele aus einer Hand.'),
      faq('Wann lohnt sich der Mehrpreis gegenüber einem Baukasten?', 'Der Mehrpreis lohnt sich, wenn die Website Anfragen, Buchungen oder lokale Sichtbarkeit bringen soll und du Technik, SEO und Inhalte nicht selbst koordinieren möchtest.')
    ]
  },
  {
    title: 'Website für Handwerker in Berlin',
    slug: 'website-fuer-handwerker-berlin',
    excerpt: 'Welche Seiten, Inhalte, Referenzen und Anfragewege Handwerksbetriebe brauchen, um lokal bessere Anfragen zu bekommen.',
    description: 'Website für Handwerker in Berlin: Seitenstruktur, lokale SEO, Referenzen, Anfrageformular, Vertrauen und Lead-Qualität.',
    image_url: '/images/handwerker-min.webp',
    category: 'Branchen',
    featured: false,
    published: true,
    created_at: UPDATED_AT,
    updated_at: UPDATED_AT,
    content: `
      <p><strong>Kurzantwort:</strong> Eine gute Handwerker-Website zeigt Leistungen, Einsatzgebiete, Referenzen, Verfügbarkeit und Kontaktwege so klar, dass Besucher schnell einschätzen können, ob der Betrieb zum Auftrag passt - und ohne Umwege eine Anfrage stellen.</p>
      <h2>Wichtige Seiten für Handwerker</h2>
      <ul>
        <li><strong>Startseite:</strong> Gewerk, Einsatzgebiet, wichtigste Leistungen und Sofortkontakt auf einen Blick.</li>
        <li><strong>Leistungsseiten:</strong> eigene Seiten für wichtige Gewerke, Schwerpunkte oder wiederkehrende Aufträge.</li>
        <li><strong>Referenzen:</strong> echte Projekte mit Bildern, Ortsteil und kurzer Beschreibung der Aufgabe.</li>
        <li><strong>Kontaktformular:</strong> Projektart, Bezirk, Zeitrahmen, Fotos und Rückrufwunsch abfragen.</li>
        <li><strong>FAQ:</strong> Kosten, Ablauf, Vorlaufzeit, Material, Garantie und Einsatzgebiet erklären.</li>
      </ul>
      <h2>Lokale SEO für Berliner Bezirke</h2>
      <p>Handwerker profitieren von klaren Leistungsseiten und lokalen Signalen: Bezirke, Einsatzgebiet, echte Projektbeispiele, Bewertungen und interne Links auf relevante Berliner Seiten. Wichtig ist, dass die Texte nicht austauschbar wirken, sondern konkret zeigen, welche Probleme gelöst werden.</p>
      <h2>Lead-Qualität verbessern</h2>
      <p>Ein gutes Formular fragt nicht zu viel, aber genug: Was soll gemacht werden? Wo ist das Projekt? Gibt es Fotos? Wann soll es starten? So entstehen weniger unpassende Anfragen und die erste Rückmeldung kann deutlich konkreter ausfallen.</p>
      <h2>Vertrauen aufbauen</h2>
      <p>Bei Handwerker-Websites zählen echte Signale: Projektfotos, Bewertungen, klare Ansprechpartner, nachvollziehbare Leistungen und ein verständlicher Ablauf. Besucher wollen wissen, ob du zuverlässig bist, in ihrem Gebiet arbeitest und ihr Problem schon öfter gelöst hast.</p>
      <p><a class="btn btn-accent" href="/kontakt">Handwerker-Website anfragen</a> <a class="btn btn-outline-primary" href="/website-tester">Aktuelle Website testen</a></p>
    `,
    faq_json: [
      faq('Was braucht eine Handwerker-Website?', 'Eine Handwerker-Website braucht klare Leistungen, Einsatzgebiet, Referenzen, schnelle Kontaktwege, Vertrauenselemente, mobile Darstellung und ein Formular, das wichtige Projektinfos abfragt.'),
      faq('Sollte jede Leistung eine eigene Seite haben?', 'Für wichtige Leistungen ja. Eigene Leistungsseiten helfen Nutzern und Suchmaschinen, das Angebot klarer zu verstehen und passende lokale Suchanfragen abzudecken.'),
      faq('Sind Projektfotos wichtig?', 'Ja. Echte Projektfotos und Referenzen schaffen Vertrauen, zeigen Qualität und verbessern die Anfragequalität.'),
      faq('Was sollte ein Anfrageformular für Handwerker abfragen?', 'Sinnvoll sind Projektart, Ort oder Bezirk, gewünschter Zeitraum, Fotos, Kontaktdaten und ein Feld für kurze Zusatzinfos.')
    ]
  },
  {
    title: 'Website für Restaurants und Cafés in Berlin',
    slug: 'website-fuer-restaurants-cafes-berlin',
    excerpt: 'Was Restaurant- und Café-Websites brauchen: Speisekarte, Reservierung, Öffnungszeiten, Events, Local SEO und mobile Geschwindigkeit.',
    description: 'Website für Restaurants und Cafés in Berlin: Reservierungen, Speisekarte, Öffnungszeiten, Events, Local SEO und bessere mobile Nutzerführung.',
    image_url: '/images/review-bg.webp',
    category: 'Branchen',
    featured: false,
    published: true,
    created_at: UPDATED_AT,
    updated_at: UPDATED_AT,
    content: `
      <p><strong>Kurzantwort:</strong> Restaurant- und Café-Websites müssen mobil schnell sein, Öffnungszeiten, Adresse, Speisekarte und Reservierung sofort zeigen und Gästen ohne Umwege helfen, einen Tisch zu buchen oder Kontakt aufzunehmen.</p>
      <h2>Was Gäste sofort suchen</h2>
      <ul>
        <li><strong>Öffnungszeiten, Adresse und Anfahrt:</strong> besonders wichtig auf dem Smartphone.</li>
        <li><strong>Speisekarte oder Wochenkarte:</strong> am besten als HTML und optional zusätzlich als PDF.</li>
        <li><strong>Reservierung:</strong> Telefon, Formular oder Buchungssystem sichtbar im ersten Bildschirmbereich.</li>
        <li><strong>Fotos:</strong> Räume, Speisen, Außenbereich und Atmosphäre zeigen, ohne die Seite langsam zu machen.</li>
        <li><strong>Events und Angebote:</strong> Catering, private Feiern, Brunch, Mittagstisch oder saisonale Aktionen klar auffindbar machen.</li>
      </ul>
      <h2>Local SEO für Gastronomie</h2>
      <p>Für Cafés und Restaurants ist das Google-Unternehmensprofil genauso wichtig wie die Website. Website, Profil, Bewertungen, Speisekarte, Öffnungszeiten und lokale Inhalte sollten zusammenpassen. Das reduziert Unsicherheit und hilft Gästen, schneller zu reservieren.</p>
      <h2>Mehr Reservierungen statt nur schöne Bilder</h2>
      <p>Eine Gastronomie-Website sollte nicht nur gut aussehen, sondern Reservierungen und Anfragen messbar machen. Deshalb gehören Buchungsklicks, Telefonklicks, Formularabschlüsse und Speisekarten-Aufrufe in den Tracking-Plan.</p>
      <h2>Was macht eine Gastronomie-Website schneller?</h2>
      <p>Große Bilder, PDF-Speisekarten und externe Widgets können mobile Seiten bremsen. Gute Websites nutzen komprimierte Bilder, klare HTML-Inhalte, wenige Ablenkungen und einen Reservierungsweg, der auch unterwegs sofort funktioniert.</p>
      <p><a class="btn btn-accent" href="/branchen/webdesign-cafe">Webdesign für Cafés ansehen</a> <a class="btn btn-outline-primary" href="/kontakt">Restaurant-Website besprechen</a></p>
    `,
    faq_json: [
      faq('Was kostet eine Restaurant-Website in Berlin?', 'Je nach Umfang startet eine einfache Website ab 499 EUR. Mit mehreren Seiten, Reservierung, Events, Speisekarte oder Buchungssystem liegt der Aufwand meist höher.'),
      faq('Sollte eine Speisekarte als PDF eingebunden werden?', 'Eine PDF kann zusätzlich sinnvoll sein, aber die wichtigsten Speisen, Kategorien und Hinweise sollten auch als HTML auf der Website stehen. Das ist nutzerfreundlicher und besser für SEO.'),
      faq('Kann ein Buchungssystem integriert werden?', 'Ja. Im Premium-Paket ist ein Buchungssystem enthalten, bei anderen Paketen kann es je nach Umfang ergänzt werden.'),
      faq('Was ist für Restaurants mobil am wichtigsten?', 'Mobil sollten Öffnungszeiten, Adresse, Speisekarte, Reservierung und Telefonkontakt sofort erreichbar sein. Viele Gäste suchen diese Infos unterwegs.')
    ]
  }
]);

export function getSeoGuideBySlug(slug) {
  return SEO_GUIDE_CLUSTER.find((guide) => guide.slug === slug) || null;
}
