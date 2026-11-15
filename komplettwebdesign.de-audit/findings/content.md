# Content Quality – komplettwebdesign.de

**Score: 55 / 100**
Stand: 23.10.2026 · Basis: `raw/crawl.json` (197 URLs, 147 ohne Parameter), 54 Seiten live gerendert (`render_page.py --mode never`), Quellcode (nur gelesen).
Bewertungsrahmen: Google Quality Rater Guidelines (Fassung vom 11.09.2025). Die E-E-A-T-Gewichtung unten ist das interne Modell dieses Audits und keine Google-Gewichtung.

| Teilbereich | Score |
|---|---|
| E-E-A-T gesamt | 53 / 100 |
| Inhaltstiefe / Thin Content | 62 / 100 |
| Duplicate / Template-Risiko | 40 / 100 |
| Thematischer Fokus / Kannibalisierung | 45 / 100 |
| Lesbarkeit | 70 / 100 |
| KI-Zitierfähigkeit | 60 / 100 |
| Aktualität | 50 / 100 |

### E-E-A-T-Aufschlüsselung

| Faktor | Gewicht | Score | Begründung |
|---|---|---|---|
| Experience | 20 % | 55 | Persönliche About-Seite und 3 echte Referenzen (Zur alten Backstube, TM Sauber & Mehr, Kurdisches Filmfestival). Blogposts zeigen aber fast keine eigene Projekterfahrung, und die Referenzen nennen keine Zahlen. |
| Expertise | 25 % | 55 | Angaben „über 10 Jahre“ Erfahrung und Tech-Stack, viele tiefe Guides. Es gibt aber keinen Autor an Blog- oder Ratgeberartikeln, ein KI-Content-Agent veröffentlicht, und es finden sich generische Branchentexte. |
| Authoritativeness | 25 % | 40 | 4 Google-Rezensionen (5,0), 3 Referenzen, LinkedIn-Firmenprofil. Keine Erwähnungen von außen, keine Fachbeiträge auf anderen Seiten, keine Person-Entität. |
| Trustworthiness | 30 % | 62 | Vollständiges Impressum, ehrliche Hinweise („keine Ranking-Garantie“, „Für wen ich nicht der richtige Anbieter bin“). Dagegen stehen sichtbare Template-Fehler, eine falsche Telefonnummer, Statistiken ohne Quelle, der Wechsel zwischen Sie, du und wir sowie künstliche Aktualitätssignale. |
| **Gewichtet** | | **53** | |

---

## Was gut funktioniert

- **Persönliche, ehrliche Positionierung auf /about**: „Komplett Webdesign ist noch keine große Agentur mit hunderten Referenzen …“, dazu die Abschnitte „Für wen ich der richtige Ansprechpartner bin / nicht der richtige Anbieter bin“. Diese Selbstbeschränkung ist ein starkes Trust-Signal im Sinne der QRG.
- **Transparente Preise**: Start ab 799 €, Business ab 1.499 €, Wachstum ab 2.499 €, Individuell ab 3.500 € stehen konsistent auf /pakete, /webdesign-berlin/kosten-preise-pakete und den Branchenseiten. Laufende Kosten sind getrennt erklärt (/leistungen/laufende-kosten-website). Solche Fakten werden gern zitiert.
- **Rechtlich vorsichtige Formulierungen**: „keine Ranking-Garantie“, „keine Rechtsberatung“, „datenschutzbewusst vorbereitet“ statt „DSGVO-konform“. Die Absicht dahinter ist richtig (siehe aber das Template-Finding zu `util/legacyPublicCopy.js`).
- **Impressum vollständig** (Inhaber Sören Blocksdorf, Möllendorffstr. 26, 10367 Berlin, Telefon, E-Mail). Die NAP-Daten auf Hauptseiten stimmen mit `helpers/siteFacts.js` überein.
- **Inhaltstiefe**: Median 1.378 Wörter. Die Leistungsseiten (/leistungen/*) haben je etwa 1.750–3.100 Wörter, mehrere Ratgeber- und Blogtexte über 2.000 Wörter.
- **Neuere Blogposts (2026)** wie /blog/website-relaunch-seo-ohne-sichtbarkeitsverlust-planen, /blog/ki-sichtbarkeit-website-berlin-2026 oder /blog/website-audit-relaunch-kmu-berlin-brandenburg sind sachlich, ohne Hype („ohne GEO-Mythen“), klar gegliedert und haben FAQ-Blöcke.
- **Kein templatebasiertes Metadaten-Muster site-weit**: `metadata_template.py` (145 Seiten) meldet `site_risk: low`, `templated_ratio: 0.0`, `shared_cta_phrases: {}`. Ausnahme: die EN-Bezirksseiten, siehe C2.
- **Lesbarkeit**: kurze Sätze (Ø 10–15 Wörter auf Money Pages), Ansprache mit du, viele Listen und Zwischenüberschriften.

---

## Findings

### CRITICAL

#### C1 – Sichtbare Platzhalter und englische Preislabels auf allen 6 deutschen Bezirksseiten
- **Beleg**: /webdesign-berlin/kreuzberg, /mitte, /lichtenberg, /charlottenburg, /friedrichshain, /prenzlauer-berg
  - Sichtbarer Text: `Preise {{lowestPackagePriceLabel}}: Welche Website-Pakete sinnvoll sind …` (Teaser im Ratgeber-Block)
  - Sichtbare FAQ-Antwort, die auch im FAQPage-JSON-LD steht: „Die Pakete starten mit Start **from 799 €**. Business beginnt bei **from 1,499 €**, Wachstum bei **from 2,499 €** und individuelle Projekte bei **from 3,500 € or by effort**.“
- **Ursache**:
  - `data/seoGuideCluster.js:19-20` enthält das Token `{{lowestPackagePriceLabel}}`. `controllers/districtController.js` (`seoGuides: SEO_GUIDE_CLUSTER.slice(0, 6).map(...)`) übergibt `excerpt`, ohne vorher `interpolatePricingTokens` aufzurufen.
  - `controllers/districtController.js` → `buildGermanDistrictFaq()` nutzt `{{price.start.en}}`, `{{price.business.en}}` usw. auf den **deutschen** Seiten, daher die englischen Labels.
- **Wirkung**: Für Nutzer, Rater und LLMs wirkt das wie ein Massen-Template mit Fehlern. Die falschen Preisangaben landen zudem in den strukturierten Daten.
- **Fix**: `seoGuides` durch `interpolatePricingTokens(…, pricing, { lng })` laufen lassen und im deutschen FAQ die Tokens ohne `.en` verwenden (bzw. die Varianten `.de`). Einen Test ergänzen, der gerenderte Seiten auf `{{` und `from \d` prüft.

#### C2 – Bezirksseiten (DE und EN) sind Doorway-nah: 77–81 % identische Sätze
- **Beleg** (Shingle-Vergleich des Haupttexts ohne Nav und Footer):
  - DE /webdesign-berlin/{kreuzberg,mitte,lichtenberg,charlottenburg,friedrichshain,prenzlauer-berg}: 5-Gramm-Jaccard **0,66–0,69**, **77–81 %** der längeren Sätze identisch, **48 Sätze stehen wortgleich auf allen 6 Seiten** (Prozess, FAQ, Paketkarten, Proof- und Trust-Block, Ratgeber-Teaser, CTA).
  - EN /en/webdesign-berlin/*: rund 510 Wörter, Jaccard 0,70, 21 identische Sätze. Die Meta-Description ist bis auf den Bezirksnamen identisch, inklusive „Call now: +49 1551 245048.“
  - Je Bezirk unterscheiden sich nur: Label, H1, Lead (2–3 Sätze), 4 Kiez-Namen, 4 Zielgruppen, 1 Proof-Satz, 3 Stichworte (`DISTRICT_PAGE_COPY` in `controllers/districtController.js`). Das sind etwa 120–150 eigene Wörter pro Seite.
  - Meta-Text an Nutzer: „Jede Bezirksseite bekommt klare lokale Anker.“, „Lokale Relevanz statt austauschbarer SEO-Texte“. Die Seite redet über ihre eigene SEO-Funktion, das ist ein typisches Doorway-Merkmal.
  - Die Bezirke sind als Unterscheidungsmerkmal nicht belegt: keine Projekte, Kunden oder Bewertungen aus dem jeweiligen Bezirk. Die zwei „Live-Referenzen aus echten Berliner Projekten“ sind auf allen Seiten dieselben (Zur alten Backstube in Rosenthal/Pankow, Sauber & Mehr).
  - EN-Variante: FAQ „Most projects range between EUR 1,500 and EUR 4,500“ widerspricht „from 799 €“; Lieferzeit „4 to 6 weeks“ steht nur dort.
  - Hinweis: Im Repo liegen ältere, deutlich individuellere Einzel-Templates (`views/bereiche/webdesign-berlin-kreuzberg.ejs` u. a., 350–500 Zeilen), die nicht mehr gerendert werden. Gerendert wird nur `views/bereiche/webdesign-berlin-district.ejs`.
- **Risiko**: Googles Spam-Richtlinie zu Doorway-Seiten (mehrere Seiten für ähnliche Suchanfragen, die zum gleichen Ziel führen). Ein Einzelunternehmer ohne Standorte in den Bezirken ist genau dieser Fall. Ein manueller Eingriff ist bei 6 Seiten unwahrscheinlich, eine Abwertung oder Nicht-Indexierung („Gecrawlt – zurzeit nicht indexiert“) aber realistisch.
- **Fix** (eine von zwei Varianten):
  1. **Konsolidieren** (empfohlen bei wenig Bezirks-Traffic): Bezirke als Abschnitte auf /webdesign-berlin führen, die 6 DE- und 6 EN-URLs per 301 auf /webdesign-berlin bzw. /en/webdesign-berlin umleiten.
  2. **Echt differenzieren**: Nur Bezirke behalten, für die es echte Belege gibt (Kundenprojekt, Bewertung oder Fallbeispiel aus dem Bezirk, lokale Wettbewerbsbeobachtung, Fotos). Pro Seite mindestens etwa 400 eigene Wörter. Gemeinsame Blöcke (Prozess, Pakete, FAQ) kürzen und auf /pakete bzw. /ablauf verlinken statt sie zu wiederholen. Den Meta-Satz „Jede Bezirksseite bekommt …“ streichen. EN-Bezirksseiten auf `noindex` setzen oder entfernen, solange sie nur Übersetzungsschablonen sind.

### HIGH

#### H1 – Keine Autorenangabe bei Blog- und Ratgeberartikeln; Content wird von einem KI-Agenten erzeugt
- **Beleg**: Alle geprüften Blogposts haben im Schema `author: {"@id": ".../#organization"}`, Ratgeberartikel `author: {"@type":"Organization","name":"Komplett Webdesign"}`. Im sichtbaren Kopf steht nur „Veröffentlicht am …“, ohne Byline und ohne Autorbox (`views/blog/show.ejs:44-49`, `services/blogPostPresentationService.js:245`). Person-Schema gibt es nur auf 20 Seiten. Für /about ist laut Crawl gar kein Schema vorhanden.
- Content-Pipeline: `services/contentAgent/config.js:33-35` (contentModel `gpt-5.4`, reviewModel `gpt-5.4-mini`, `autoPublishPolicy.js`). KI-Content ist laut QRG zulässig, wenn er erkennbares E-E-A-T hat. Ohne Autor, eigene Erfahrung und Quellen fehlt genau das.
- **Fix**:
  - Sichtbare Byline „Von Sören Blocksdorf, Webdesigner in Berlin“ mit Link auf /about und kurzer Autorbox am Artikelende (Foto, 2 Sätze, LinkedIn).
  - Schema: `author: {"@type":"Person","@id":".../#person","name":"Sören Blocksdorf","url":".../about","sameAs":[LinkedIn]}`.
  - Auf /about `ProfilePage` mit `mainEntity` Person ergänzen.
  - Im Content-Agent-Prompt Pflichtbausteine verlangen: mindestens 1 eigenes Projektbeispiel oder eine Beobachtung („In meinem Relaunch für TM Sauber & Mehr …“) und Quellenlinks für Zahlen.

#### H2 – Künstliche oder massenhafte Aktualitätssignale
- **Beleg**:
  - Startseite: `dateModified: new Date().toISOString()` (`views/index.ejs:173`). Die Seite meldet täglich „heute geändert“ (gerendert: 2026-10-23).
  - Mindestens 11 geprüfte Blogposts tragen exakt `dateModified 2026-07-11T20:14:17+02:00` (z. B. /blog/chatgpt-agentenmodus, /blog/google-ai-overviews, /blog/full-service-webdesign-in-berlin, /blog/webdesign-lichtenberg-berlin, /blog/woche-3-wichtigste-design-elemente). Weitere tragen `2026-07-17T09:15:26` (/blog/festpreis-website-pakete-berlin-und-brandenburg, /blog/website-kosten-2025-einfach-erklaert). Das passt zu einem Bulk-Update (vermutlich die Regex-Normalisierung), nicht zu einer inhaltlichen Überarbeitung.
  - Sichtbar ist nur `created_at`, ein „Aktualisiert am“ fehlt.
  - Titel und Inhalte mit veralteten Jahreszahlen (heute: 23.10.2026): /blog/Google-AI-Mode-und-AI-Overviews („SEO 2025“), /blog/google-ai-overviews („2025“), /blog/wordpress-68 („Update 2025“), /blog/wordpress-2025-deutschland-staerken-grenzen-empfehlungen, /blog/barrierefreiheit-2020-websites-leitfaden (Slug 2020, Titel 2025), /ratgeber/website-kosten-zeitplan („Website-Kosten 2025“), /blog/website-kosten-2025-einfach-erklaert.
- **Fix**: `dateModified` nur bei echter inhaltlicher Änderung setzen (Startseite: festes Datum aus einer Konfiguration). `updated_at` nicht bei automatischen Normalisierungen anfassen. Im Artikelkopf „Aktualisiert am“ anzeigen. 2025er-Artikel entweder inhaltlich aktualisieren (Jahreszahl im Titel neutral halten) oder in die 2026er-Pendants konsolidieren (siehe H4).

#### H3 – Floskeln aus der Laufzeit-Textersetzung und unbelegte Statistiken
- **Beleg**:
  - `util/legacyPublicCopy.js` ersetzt in Legacy-Inhalten per Regex „ab 499 €“ durch **„nach aktueller Paketlogik“** und „DSGVO-konform“ durch „datenschutzbewusst vorbereitet“. Ergebnisse auf Live-Seiten:
    - Titel: /branchen/webdesign-reinigung „… Webdesign nach aktueller Paketlogik günstig“, /branchen/webdesign-tattoo „… Berlin - nach aktueller Paketlogik professionell“, außerdem Café, Blumenladen, Fotograf, Beautysalon, Physiotherapie.
    - Fließtext /branchen/webdesign-cafe: „Die Antwort: mit einer professionellen Café-Website nach aktueller Paketlogik“.
    - Description /ratgeber/professionellen-website-vs-baukasten: „… mehr Anfragen – nach aktueller Paketlogik“.
    - /handwerker: „komplett ab **aktueller Paketpreis Festpreis**.“
    - /branchen/webdesign-steuerberater: „Unterlagen verschlüsselt hochladen – datenschutzbewusst vorbereitet & effizient.“
  - Unbelegte oder überzogene Zahlen:
    - /handwerker, H1 „In 30 Tage bis zu 128 % mehr Aufträge“, dazu „+34 % mehr Umsatz im Durchschnit“ (Tippfehler), „7 × mehr qualifizierte Gespräche“, „99,9 % Uptime … garantieren wir“, „lädt die Seite immer unter 2s“.
    - Branchenseiten: „Statista (2023): 92 % der Menschen …“, „IHK-Studie“, ohne Link.
  - Das widerspricht der sonst sehr vorsichtigen Linie („keine Ranking-Garantie“) und ist ein QRG-Trust-Minus. Werbeaussagen ohne Beleg können zudem wettbewerbsrechtlich heikel sein (keine Rechtsberatung).
- **Fix**: Legacy-Inhalte in der Datenbank einmalig redaktionell neu schreiben, statt sie zur Laufzeit zu ersetzen. „nach aktueller Paketlogik“ durch konkrete Preise („ab 799 €“) oder ganz streichen. /handwerker: Zahlen ohne Quelle entfernen oder mit Quelle und eigenem Fallbeispiel belegen. H1 neu, z. B. „Handwerker-Website erstellen lassen in Berlin“. Statista/IHK verlinken oder entfernen.

#### H4 – Keyword-Kannibalisierung in 7 Clustern (Überschneidung im Intent, nicht im Text)
Textlich überschneiden sich die Seiten kaum (Jaccard meist unter 0,1), sie zielen aber auf dieselben Suchanfragen. Das schwächt jede einzelne Seite.

| Cluster / Query | Konkurrierende URLs | Empfehlung |
|---|---|---|
| „Website erstellen lassen Berlin“ / „Webdesign Berlin“ | `/` (H1 „Website erstellen lassen in Berlin – …“), `/webdesign-berlin` (H1 „Website erstellen lassen in Berlin“), `/pakete` (H1 „Website erstellen lassen in Berlin: Pakete ab 799 €“), `/ratgeber/website-erstellen-berlin-ablauf-dauer-kosten`, `/webdesign-kleine-unternehmen-berlin`, `/blog/full-service-webdesign-in-berlin`, `/blog/webdesign-berlin-warum-eine-website-fuer-unternehmen-unverzichtbar-ist`, `/leistungen` („Leistungen Webdesign Berlin“) | **/webdesign-berlin** ist die Ziel-URL für „Webdesign Berlin / Website erstellen lassen Berlin“. Die Startseite auf Marke plus „Webdesigner Berlin für kleine Unternehmen“ ausrichten. /pakete auf „Preise/Pakete“. /webdesign-kleine-unternehmen-berlin (319 Wörter, 1 interner Inlink) per 301 nach /webdesign-berlin oder massiv ausbauen. Die beiden Blogposts per 301 in /webdesign-berlin bzw. /leistungen überführen; der Full-Service-Post nennt zudem eine falsche Telefonnummer, siehe M1. |
| Website-Kosten | `/webdesign-berlin/kosten-preise-pakete`, `/ratgeber/website-kosten-berlin`, `/ratgeber/kosten-einfache-website` (151 Wörter Haupttext), `/ratgeber/website-kosten-zeitplan` (202), `/blog/website-kosten-2025-einfach-erklaert`, `/pakete`, `/leistungen/laufende-kosten-website`, `/webdesign-cafe/kosten`, `/webdesign-blumenladen/kosten` | Ziel-URL **/webdesign-berlin/kosten-preise-pakete** (196 Inlinks). Die zwei dünnen Ratgeber und den 2025-Blogpost per 301 dorthin. /ratgeber/website-kosten-berlin als ausführlicher Ratgeber nur behalten, wenn er klar anders ausgerichtet ist (Budgetplanung), sonst zusammenführen. |
| Baukasten | `/ratgeber/baukasten-vs-professionelle-website` und `/ratgeber/professionellen-website-vs-baukasten` (Titel grammatisch falsch) | Zweite URL per 301 auf die erste. |
| Relaunch | `/leistungen/website-relaunch`, `/ratgeber/website-relaunch-berlin`, `/blog/website-relaunch-berlin-checkliste`, `/blog/website-relaunch-inhalte-nicht-loeschen-2026`, `/blog/website-relaunch-seo-ohne-sichtbarkeitsverlust-planen`, `/blog/website-audit-relaunch-kmu-berlin-brandenburg`, `/blog/relaunch-wegen-ki-suche` | Leistungsseite = Money Page. Blogposts klar auf Unterthemen schärfen und kontextuell auf /leistungen/website-relaunch verlinken. Checkliste und Ratgeber zusammenlegen. |
| Local SEO / Unternehmensprofil | `/leistungen/local-seo`, `/blog/local-seo-berlin-fuer-freelancer`, `/blog/Lokale-SEO-Hacks-fuer-Berlin`, `/blog/local-seo-berlin-2026-website-profilsignale`, `/blog/google-unternehmensprofil-website-lokale-signale-berlin-2026`, `/blog/google-unternehmensprofil-website-widerspruch-berlin-brandenburg` | Die beiden Unternehmensprofil-Posts von 2026 zusammenführen. Die 2025er Local-SEO-Posts in den 2026er-Post per 301. Alle auf /leistungen/local-seo verlinken. |
| AI Overviews / KI-Suche | `/blog/google-ai-overviews` und `/blog/Google-AI-Mode-und-AI-Overviews` (beide „AI Overviews Deutschland … 2025“), dazu `/blog/ki-suche-webdesign-2026`, `/blog/ki-sichtbarkeit-website-berlin-2026`, `/blog/rising-ai-native-internet-semantic-retrieval` | Die beiden AI-Overview-Posts zu einem aktualisierten Artikel zusammenführen. KI-Suche 2026 und KI-Sichtbarkeit 2026 klar voneinander abgrenzen oder zusammenlegen. |
| Lokal und Branche doppelt | `/webdesign-berlin/lichtenberg` ↔ `/blog/webdesign-lichtenberg-berlin` (94-Zeichen-Titel); `/handwerker` ↔ `/ratgeber/website-fuer-handwerker-berlin`; `/branchen/webdesign-immobilienmakler` ↔ `/blog/immobilienmakler-website-erstelle` (Slug-Tippfehler); `/ratgeber/homepage-checker-website-check` ↔ `/blog/immobilienmakler-homepage-check` (gleiches Titelmuster) ↔ `/website-tester`; Café: `/branchen/webdesign-cafe` ↔ `/ratgeber/website-fuer-restaurants-cafes-berlin` ↔ `/webdesign-cafe/kosten` | Pro Paar eine Money Page festlegen. Den Lichtenberg-Blogpost in die Bezirksseite (oder nach /webdesign-berlin) per 301. /handwerker als /branchen/webdesign-handwerker in das Branchen-System überführen. Die /kosten-Unterseiten der Branchen als Abschnitt in die Branchenseite integrieren. |

Hinweis: Im Repo gibt es `services/contentAgent/cannibalizationService.js`. Er greift offenbar nur für neue Agent-Artikel, nicht für Bestandsseiten.

#### H5 – Branchenseiten: Template-Anteil 30–40 %, generischer Text, Sie/du-Mix, 11 von 17 nicht in der Sitemap
- **Beleg** (8 Seiten verglichen: Friseur, Tattoo, Fotograf, Steuerberater, Hebamme, Autowerkstatt, Café, Immobilienmakler): Jaccard 0,29–0,34, rund 39 % identische Sätze, 31 Sätze wortgleich auf allen Seiten (Paketblock, „Webdesign Berlin – Was erwartet dich!“-Absatz, SEO-Absatz, „Eine erfolgreiche Website ist mehr als …“, „Kontaktiere uns für eine kostenlose Erstberatung!“). Branchenspezifische Funktionsblöcke sind vorhanden. Das liegt unter der Doorway-Schwelle, ist aber dünn individualisiert.
  - Generische, KI-typische Passagen: „Gerade in Städten wie Berlin, Hamburg oder München …“, Keyword-Beispiele „veganes Café München Schwabing“, „Frühstück Hamburg Altona“ auf einer Berlin-Seite.
  - Gleiche Seite, unterschiedliche Ansprache: „Wie schaffen **Sie** es …“ neben „Was erwartet **dich**!“, außerdem „wir/uns“ (Einzelunternehmer).
  - 11 von 17 Branchenseiten sind indexierbar, aber nicht in der Sitemap (arzt, autowerkstatt, beautysalon, fitnesscoach, fotograf, friseur, hebamme, physiotherapie, steuerberater, tattoo, wellness) und haben nur 1 Inlink (/branchen). Das ist ein widersprüchliches Signal.
  - Nur Immobilienmakler (2.006 Wörter, aktualisiert 04/2026), Café (Referenz Backstube) und Reinigung (Referenz TM Sauber & Mehr) haben echte Erfahrungsbelege.
- **Fix**: Bewusst entscheiden. Entweder 5–6 Kernbranchen mit echten Belegen (Projekt, Zitat, branchenspezifische Checkliste, Berlin-Bezug) ausbauen und in Sitemap und interne Verlinkung aufnehmen, oder die übrigen Seiten auf `noindex` setzen bzw. auf /branchen zusammenfassen. Wiederholte Blöcke (Pakete, SEO-Intro) durch einen kurzen Verweis auf /pakete ersetzen. Konsequent du und ich.

### MEDIUM

#### M1 – Falsche bzw. alte Telefonnummer in Blogposts (NAP-Inkonsistenz)
- **Beleg**: /blog/full-service-webdesign-in-berlin (auch in der Meta-Description: „Melde dich: +49 1525 4350378“) und /blog/local-seo-berlin-fuer-freelancer: **+49 1525 4350378**. Überall sonst und im Impressum steht **+49 1551 245048** (`helpers/siteFacts.js`). Die alte Nummer steht im Repo auch in `views/index copy.ejs`.
- **Fix**: Nummer in den Blog-Datensätzen ersetzen und die Datenbank nach `1525` durchsuchen. Telefonnummern in Artikeln aus `SITE_FACTS` rendern statt sie fest einzutragen.

#### M2 – Uneinheitliche Ansprache und Rolle (Ich/du vs. Wir/Sie/Agentur)
- **Beleg**:
  - /about: Description „Erfahren **Sie** mehr …“, Titel „Über **uns**“, im Text „Seit der Gründung meiner eigenen Webdesign-**Agentur** … heute ein Full-Service-Dienstleister“ gegenüber „noch keine große Agentur“.
  - /faq: durchgehend Sie und „Wir“, „Was macht eine Webdesign-Agentur genau?“
  - Bezirksseiten: „zeigen **wir** dir“, „**unser** öffentliches Google-Profil“
  - /booking: „Wählen **Sie** einen Termin …“
  - /blog/was-ist-webdesign-11-woechiger-guide: „lernen **Sie**“
- Das ist ein Trust-Bruch: Positionierung als persönlicher Einzelunternehmer, Texte im Agentur-Wir.
- **Fix**: Styleguide „ich + du“ auf allen Marketingseiten (Rechtstexte ausgenommen). FAQ, About-Meta, Bezirks- und Branchen-Blöcke umschreiben.

#### M3 – Fachfremde Swipe-&-Cook-Rechtstexte verwässern den thematischen Fokus
- **Beleg**: /swipeandcook-datenschutz (3.867 Wörter), /swipeandcook-nutzungsbedingungen (2.829), /swipeandcook-support (1.730), /swipeandcook-konto-loeschen (1.699). Alle indexierbar, in der Sitemap, mit je **195 Inlinks** (Footer) und Titel „… | Komplett Webdesign“. Rund 10.000 Wörter Rezept-App-Recht auf einer Webdesign-Domain. Im Repo entsteht parallel eine eigene App-Website (`cookavoli/`, `views/cookavoli/`).
- **Fix**: Die Seiten bleiben erreichbar (App-Store-Pflicht-URLs), werden aber auf `noindex, follow` gesetzt, aus der Sitemap und dem Footer genommen. Mittelfristig auf die App-Domain verschieben (301). Alternativ einmal auf /referenzen als eigenes App-Projekt vorstellen; das wäre ein echter Erfahrungsnachweis.

#### M4 – Off-Topic- oder Entwickler-Inhalte im Blog
- **Beleg**:
  - Für die Zielgruppe (kleine Unternehmen, die eine Website kaufen) wenig relevant: /blog/chatgpt-agentenmodus (Titel „Bedeutung ChatGPT Agentenmodus“, Description endet mit „:“), /blog/wordpress-68 (die Agentur baut mit Node/EJS, nicht mit WordPress), /blog/3d-interaktives-ux-design, /blog/rising-ai-native-internet-semantic-retrieval, /blog/media-queries-vs-container-queries (510 Wörter) plus /demo/cq-compare/ (46 Wörter, indexierbar), /blog/Scoll-Snapp-Galery-&-Zoom‑on‑View (404 Wörter, Tippfehler-Slug), /blog/google-ads-vs-meta-ads (Ads sind keine Leistung).
  - „11-wöchige Masterclass“ (/blog/was-ist-webdesign-11-woechiger-guide, „jeden Samstag“): nur Woche 1–5 existieren, die Serie ist unvollständig und richtet sich an Lernende statt Kunden.
- **Fix**: Dünne oder veraltete Entwickler-Posts (Scroll-Snap, Container Queries, 3D, WordPress 6.8, Agentenmodus) auf `noindex` setzen oder löschen (410, bzw. 301 bei Backlinks). /demo/cq-compare/ auf `noindex`. Die Masterclass-Ankündigung auf „5-teilige Serie“ ändern oder fertigstellen. Neue Themen am Kaufprozess der Zielgruppe ausrichten.

#### M5 – Thin Content auf indexierbaren Seiten
- **Beleg** (Haupttext-Wörter): /webdesign-kleine-unternehmen-berlin 319, /ratgeber/kosten-einfache-website 151, /ratgeber/website-kosten-zeitplan 202, /hinweise-rechtstexte-seo-datenschutz 191, /faq 293 (nur Kategorie 1 sichtbar, rund 5 Fragen im Sie-Stil), /webdesign-cafe/kosten 309, /webdesign-blumenladen/kosten 321, /referenzen 380, Referenz-Detailseiten 401–521, /blog/festpreis-website-pakete-berlin-und-brandenburg 493 (als „Pressemeldung“ ausgewiesen), /ratgeber/website-fuer-handwerker-berlin 519, /ratgeber/website-fuer-restaurants-cafes-berlin 531, /demo/cq-compare/ 46.
- **Fix**: Zusammenführen (siehe H4) oder ausbauen. /faq: alle Kategorien serverseitig vollständig rendern, in du-Form umschreiben und Fragen mit konkreten Antworten (Preise, Dauer, Ablauf) ergänzen. /hinweise-rechtstexte-seo-datenschutz auf `noindex`.

#### M6 – Referenzen ohne messbare Ergebnisse
- **Beleg**: /referenzen („qualitatives Ergebnis“), /referenzen/tm-sauber-mehr (503 Wörter), /referenzen/zur-alten-backstube (401), /referenzen/kurdisches-filmfestival (521). Es fehlen Zitate der Kunden, Zahlen (Anfragen, Ladezeit, Rankings) und Vorher/Nachher-Vergleiche.
- **Fix**: Pro Referenz ein Kundenzitat mit Name und Rolle, 2–3 Kennzahlen (z. B. PageSpeed vorher/nachher, Anfragen pro Monat, Indexierung), Screenshots vorher/nachher und Projektdauer. Auf Leistungs-, Branchen- und Bezirksseiten gezielt verlinken. Das ist der größte Hebel für Experience und Authoritativeness.

### LOW

- **L1 – Alter und Erfahrung**: „29 Jahre … über 10 Jahre Erfahrung“ (/about). Plausibel, aber besser belegen: erste Projekte, Ausbildung oder Studium, Zeitstrahl.
- **L2 – FAQPage auf 160 Seiten**: FAQ-Rich-Results zeigt Google seit 2023 nur noch für ausgewählte Behörden- und Gesundheitsseiten. Das Markup schadet nicht, auf Bezirksseiten wird aber dieselbe FAQ sechsmal ausgespielt. Mehrfach identische FAQs entfernen.
- **L3 – Lesbarkeit**: Flesch-DE (Amstad) 39–58, also „schwer“ bis „mittelschwer“, trotz kurzer Sätze (Ø 10–17 Wörter). Ursache sind lange Komposita und Fachjargon („Anfragewege“, „Leistungsdarstellung“, „Suchintention“, „Paketlogik“, „Evergreen-Wissen“, „GEO-Struktur“, „Node.js/EJS“). /blog/ki-sichtbarkeit-website-berlin-2026 hat 15 Sätze über 25 Wörtern. Fix: Jargon gegen Kundensprache tauschen („wie Kunden dich erreichen“ statt „Anfragewege“). Hinweis: `content_quality.py` ist auf Englisch kalibriert (Filler/AI-Pattern = 0 bei deutschem Text) und daher hier nicht aussagekräftig.
- **L4 – Tippfehler**: „Durchschnit“, „In 30 Tage“, „Berlin : In“ (/handwerker), „Professionellen Website vs. Baukasten“, Slugs `Scoll-Snapp-Galery`, `immobilienmakler-website-erstelle`, `selbstandige`, stray „““ in der Description von /blog/media-queries-vs-container-queries.

---

## KI-Zitierfähigkeit (60 / 100)

**Stärken**: Konkrete, zitierbare Fakten (Preise, Seitenumfang pro Paket, Feedbackrunden), Antwort-Absätze direkt unter H2, FAQ-Blöcke, Breadcrumbs, klare H2-Hierarchie auf den Leistungsseiten, Organization-Schema mit Adresse.

**Schwächen**:
- Widersprüchliche Fakten zwischen Seiten: EN-Bezirke „EUR 1,500–4,500“ / „4–6 weeks“ gegenüber DE „ab 799 €“; „from 1,499 €“ auf deutschen Seiten; zwei Telefonnummern. LLMs bevorzugen konsistente Entitäten.
- Keine Person-Entität (Autor) und keine `sameAs`-Verknüpfung zur Person.
- Statistiken ohne Quelle (Statista, IHK, „+128 %“) sind nicht zitierfähig und senken das Vertrauen.
- Viele Themen-Duplikate: Das Modell findet für „Website Kosten Berlin“ 7+ Seiten mit teils abweichenden Aussagen.

**Fix**: Eine kanonische „Fakten“-Quelle (Preise, Lieferzeiten, Leistungsumfang, NAP) aus `SITE_FACTS` überall rendern. Pro Kernfrage eine Ziel-URL mit einem 40–60 Wörter langen Antwortabsatz direkt nach der H1. Person-Schema plus Byline.

---

## Priorisierte Maßnahmen

| # | Maßnahme | Aufwand | Wirkung |
|---|---|---|---|
| 1 | C1: Token-Leaks auf Bezirksseiten fixen (`seoGuideCluster` interpolieren, `.en`-Tokens im DE-FAQ ersetzen) | 30 min | hoch |
| 2 | M1: Alte Telefonnummer +49 1525 4350378 aus Blog-Datensätzen entfernen | 15 min | mittel |
| 3 | H3: „nach aktueller Paketlogik“ und „aktueller Paketpreis Festpreis“ aus Titeln und Texten entfernen; /handwerker-Statistiken streichen | 1–2 h | hoch |
| 4 | H1: Byline, Autorbox und Person-Schema für Blog und Ratgeber; ProfilePage auf /about | 2–3 h | hoch |
| 5 | H2: `dateModified` der Startseite fixieren, Bulk-`updated_at` stoppen, „Aktualisiert am“ anzeigen | 1 h | mittel |
| 6 | M3: Swipe-&-Cook-Seiten auf noindex, aus Footer und Sitemap entfernen | 30 min | mittel |
| 7 | C2: Bezirksseiten konsolidieren oder echt differenzieren | 1–3 Tage | hoch |
| 8 | H4: Kannibalisierungs-Cluster per 301 und Neuausrichtung bereinigen | 1–2 Tage | hoch |
| 9 | H5 und M6: Branchen ausdünnen bzw. ausbauen; Referenzen mit Zahlen und Kundenzitaten | laufend | hoch |

---

## Strukturierte Findings (für audit-data.json, Kategorie „Content Quality“)

```json
{
  "category": "Content Quality",
  "score": 55,
  "eeat": {"experience": 55, "expertise": 55, "authoritativeness": 40, "trustworthiness": 62, "weighted": 53},
  "ai_citation_readiness": 60,
  "metadata_template_check": {"site_risk": "low", "templated_ratio": 0.0, "shared_cta_phrases": {}, "manual_override": "EN-Bezirksseiten teilen identische CTA 'Call now: +49 1551 245048'"},
  "findings": [
    {"id": "C1", "severity": "critical", "title": "Unaufgelöster Platzhalter {{lowestPackagePriceLabel}} und englische Preislabels ('from 1,499 €') auf allen DE-Bezirksseiten inkl. FAQPage-JSON-LD", "urls": ["/webdesign-berlin/kreuzberg", "/webdesign-berlin/mitte", "/webdesign-berlin/lichtenberg", "/webdesign-berlin/charlottenburg", "/webdesign-berlin/friedrichshain", "/webdesign-berlin/prenzlauer-berg"], "source": ["data/seoGuideCluster.js:19-20", "controllers/districtController.js buildGermanDistrictFaq/seoGuides"]},
    {"id": "C2", "severity": "critical", "title": "Bezirksseiten doorway-nah: 77-81 % identische Sätze, Jaccard 0,66-0,69; EN-Varianten ~510 Wörter mit identischer Meta-CTA", "urls": ["/webdesign-berlin/*", "/en/webdesign-berlin/*"], "source": ["controllers/districtController.js", "views/bereiche/webdesign-berlin-district.ejs", "views/bereiche/webdesign-berlin-district-en.ejs"]},
    {"id": "H1", "severity": "high", "title": "Keine Autorenangabe (Byline/Person-Schema) bei Blog/Ratgeber; Inhalte via KI-Content-Agent", "source": ["views/blog/show.ejs:44-49", "services/blogPostPresentationService.js:245", "services/contentAgent/config.js:33-35"]},
    {"id": "H2", "severity": "high", "title": "Künstliche Aktualität: Startseite dateModified=new Date(); Bulk-dateModified 2026-07-11T20:14:17 auf vielen Posts; veraltete 2025-Titel", "source": ["views/index.ejs:173"]},
    {"id": "H3", "severity": "high", "title": "Regex-Floskeln 'nach aktueller Paketlogik' in Titeln/Text, 'aktueller Paketpreis Festpreis', unbelegte Statistiken (+128 %, Statista, IHK)", "urls": ["/handwerker", "/branchen/webdesign-cafe", "/branchen/webdesign-reinigung", "/branchen/webdesign-tattoo", "/branchen/webdesign-fotograf"], "source": ["util/legacyPublicCopy.js"]},
    {"id": "H4", "severity": "high", "title": "Kannibalisierung in 7 Clustern (Berlin-Money, Kosten, Baukasten, Relaunch, Local SEO, AI Overviews, Lokal/Branche doppelt)"},
    {"id": "H5", "severity": "high", "title": "Branchenseiten 30-40 % Template, generisch, Sie/du-Mix; 11/17 indexierbar aber nicht in Sitemap, 1 Inlink"},
    {"id": "M1", "severity": "medium", "title": "Alte Telefonnummer +49 1525 4350378 in Blogposts/Meta-Description", "urls": ["/blog/full-service-webdesign-in-berlin", "/blog/local-seo-berlin-fuer-freelancer"]},
    {"id": "M2", "severity": "medium", "title": "Uneinheitliche Ansprache Ich/du vs. Wir/Sie/Agentur", "urls": ["/about", "/faq", "/booking", "/webdesign-berlin/*"]},
    {"id": "M3", "severity": "medium", "title": "Swipe-&-Cook-App-Rechtstexte (~10.000 Wörter) indexierbar, sitewide verlinkt", "urls": ["/swipeandcook-datenschutz", "/swipeandcook-nutzungsbedingungen", "/swipeandcook-support", "/swipeandcook-konto-loeschen"]},
    {"id": "M4", "severity": "medium", "title": "Off-Topic-/Entwickler-Posts und unvollständige 11-Wochen-Serie"},
    {"id": "M5", "severity": "medium", "title": "Thin Content auf indexierbaren Seiten (<350 Wörter Haupttext)"},
    {"id": "M6", "severity": "medium", "title": "Referenzen ohne Zahlen/Kundenzitate"},
    {"id": "L1-L4", "severity": "low", "title": "Erfahrungsbeleg About, FAQPage-Duplikate, Jargon/Lesbarkeit (Flesch-DE 39-58), Tippfehler"}
  ]
}
```
