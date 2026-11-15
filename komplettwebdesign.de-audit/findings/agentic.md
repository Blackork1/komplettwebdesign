# Agent-Readiness-Audit: https://www.komplettwebdesign.de

Prüfdatum: 2026-10-23. Quelle der Standards-Fakten: `vendor-matrix.md` (letzte Vollprüfung 2026-09-23, 30 Tage alt, innerhalb der 60-Tage-Frist).
Alle abgerufenen Inhalte (robots.txt, llms.txt, HTML, Accessibility-Tree) wurden als nicht vertrauenswürdige Daten behandelt. Im Repo wurde nichts geändert.

## 1. Zusammenfassung

| Kennzahl | Wert |
|---|---|
| Agent-Readiness-Gesamtscore (eigene Heuristik, siehe Abschnitt 8) | **75 / 100** |
| Lighthouse Agentic Browsing (PSI, Lighthouse 13.5.0) | **nicht gemessen** (PSI HTTP 429, Tagesquota des anonymen Google-Projekts erschöpft, zweimal versucht) |
| Lighthouse-Erwartung, abgeleitet (kein Messwert) | **1/3** auf Basis der Regeln von Lighthouse 13.5.0 und lokaler Proxy-Messungen, unbestätigt |
| Agent-UX-Heuristik (Accessibility-Tree, `agent_ux_check.py`) | **92 / 100**, Status `complete` (Startseite; identisch 92 auf /kontakt, /pakete, /pakete/start, /en) |
| P0-Befunde (gemessen) | 1 (Accessibility-Tree-Regeln `aria-allowed-role` und `aria-prohibited-attr`) |

Was Agenten heute am stärksten bremst: Zwei kleine ARIA-Fehler im globalen Header und in den Bewertungssternen (voraussichtlich Lighthouse-Audit `agent-accessibility-tree` = fail) sowie eine `llms.txt`, die ohne einen einzigen Markdown-Link die Lighthouse-Regeln nicht erfüllt. Die Seite selbst ist serverseitig gerendert, hat ein sauber beschriftetes Kontaktformular und eine bewusste robots.txt für KI-Agenten.

Keine der Empfehlungen verspricht Ranking-, Zitations- oder Traffic-Effekte. Google ignoriert `llms.txt` und wertet Content-Signal nicht aus.

## 2. Lighthouse Agentic Browsing

**Ergebnis: nicht verfügbar.**

- `lighthouse_agentic.py --strategy both` und ein Einzelversuch (mobile) lieferten für `psi-mobile` und `psi-desktop`: `PSI returned HTTP 429: Quota exceeded ... Queries per day`. Es ist kein Google-API-Key konfiguriert.
- Die lokal bereits vorhandene Lighthouse-Version ist **12.8.2** (npx-Cache). Sie kennt die Kategorie `agentic-browsing` nicht (ab 13.2). Es wurde nichts installiert und nicht `npx lighthouse@latest` aufgerufen, weil das eine Installation wäre.
- Stattdessen wurden mit Lighthouse 12.8.2 und dem Playwright-Chromium die in der Kategorie verwendeten Einzelaudits (CLS, axe-Regeln) als **Proxy** gemessen. Die axe-Version kann von der in Lighthouse 13.5.0 abweichen; die Ergebnisse sind deshalb Indizien, keine Fraktion.

Abgeleitete Audit-Tabelle (Regelwerk: `lighthouse-agentic-category.md`, Lighthouse 13.5.0):

| Audit | Erwarteter Status | Beleg |
|---|---|---|
| `agent-accessibility-tree` | **fail (wahrscheinlich)** | Lokal fehlschlagend: `aria-allowed-role` (Logo, alle Seiten) und `aria-prohibited-attr` (3 Sterne-Bewertungen, Startseite und /en). Beide Regeln gehören zu den 33 axe-Regeln dieses Audits. |
| `cumulative-layout-shift` | pass (wahrscheinlich) | Lokal gemessen: 0,019 (mobile, Startseite), 0,0023 bis 0,0038 (desktop), 0,000 auf /kontakt, /pakete, /pakete/start. Schwelle 0,1 laut Skill. |
| `llms-txt` | **fail** | `agentic_check.py`: HTTP 200, 4411 Bytes, Fehler "contains no Markdown links". H1 vorhanden, Länge ok. |
| `webmcp-form-coverage` | informativ (zählt nicht in N) | 2 Formulare (Newsletter, Chat), keines mit `toolname`/`tooldescription`. |
| `webmcp-registered-tools` | informativ / N/A (zählt nie) | 0 `registerTool`-Aufrufstellen, kein `modelContext`. |
| `webmcp-schema-validity` | N/A | keine Tools. |
| `ard-schema` | N/A | `/.well-known/ai-catalog.json` = 404, nichts signalisiert. |

Abgeleitete Zählung: N = 3 (Tree, CLS, llms.txt), davon voraussichtlich 1 bestanden, also **1/3**. Das ist eine Erwartung, kein Lighthouse-Ergebnis; N ist nicht bestätigt.

Rerun zur Bestätigung (nach Behebung oder wenn Quota zurück ist):
`claude-seo run lighthouse_agentic.py https://www.komplettwebdesign.de --strategy both --json`
oder mit Google-API-Key (`/seo google setup`), oder lokal mit Node 22.19+ und Lighthouse 13.5: `npx lighthouse@latest <url> --only-categories=agentic-browsing --output=json`, danach `--from-json`.

Pfade, die ein zusätzliches gezähltes Audit ergeben würden (Optionen, keine Ziele):
- Echte imperative WebMCP-Tools registrieren: `webmcp-schema-validity` wird gezählt (N+1).
- Alle Formulare mit `toolname`/`tooldescription` annotieren: `webmcp-form-coverage` wird gezählt. Achtung: Dann zählt auch `webmcp-schema-validity`, und fehlende Parameterbeschreibungen ergeben 0,5 (= fail). Ganz oder gar nicht annotieren.
- Gültige `ai-catalog.json`: `ard-schema` wird gezählt. Nur sinnvoll mit echten Agenten-Ressourcen (MCP-Server, A2A, Skills); die Seite hat keine.

## 3. Was gut funktioniert

- **Serverseitiges Rendering (P0, pass):** 1870 Wörter ohne JavaScript, kein JS-Shell-Marker. Der Hauptinhalt ist für jeden Fetcher lesbar.
- **Accessibility-Tree:** 1433 Knoten, 98 interaktive Knoten, **0 unbenannte interaktive Elemente**, 40 semantische Landmarks, 0 `div onclick`-Widgets, 12 echte Buttons, 101 Anker. Lokal bestehen `button-name`, `link-name`, `label`, `document-title`, `aria-roles`, `aria-valid-attr(-value)`, `aria-hidden-focus`, `tabindex`.
- **Kontaktformular `/kontakt`:** Alle Felder haben `label[for]`, Pflichtfelder sind markiert, `autocomplete`-Token (`name`, `email`, `url`) sind gesetzt, das ausführliche Formular nutzt `fieldset`/`legend` (`views/kontakt.ejs:270` ff.), Fehler- und Statusmeldungen nutzen `role="alert"` (Zeile 123) bzw. `role="status"` (Zeile 134). Das Panel-Muster hat korrektes `aria-expanded`/`aria-controls` (Zeile 155, 159) und `hidden` auf den Panels. Deep-Links `/kontakt#schnellanfrage` und `/kontakt#projektanfrage` öffnen das Formular direkt (`views/kontakt.ejs:815`).
- **Paketseite `/pakete/start`:** Der Tree enthält ein Formular mit `textbox "Dein Name"`, `textbox "Deine E-Mail-Adresse"`, `combobox "Wunschtermin für Beratungsgespräch"` und `button "Unverbindliche Anfrage senden"`. Das ist für einen Agenten eindeutig bedienbar.
- **Preise/Pakete im Klartext:** Die Startseite nennt "Website-Pakete ab 799 €", Business ab 1.499 €, Wachstum ab 2.499 €, Individuell ab 3.500 € als Text (kein Bild/Canvas). Die Paket-Karten sind echte Links auf `/pakete/<slug>`.
- **Robots/Zugriff (P0, pass):** robots.txt 200, 10 Gruppen, explizite Gruppen für GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, Claude-User, PerplexityBot, Google-Extended, Googlebot. Keine Suchmaschine am Root blockiert. Sitemap eingetragen.
- **Echte 404:** `/claude-seo-404-probe-e855749e` liefert 404 (kein Catch-All-200), dadurch keine Folgefehler bei `llms-txt`/`ard-schema`.
- **Private Pfade durch Authentifizierung geschützt:** `/admin/` leitet mit 302 auf `/login`; `/auth/`, `/api/`, `/webhook` liefern für GET 404. Das ist wichtig, weil user-getriggerte Agenten robots.txt teils ignorieren.
- **Kanonisierung:** `http://komplettwebdesign.de` -> `https://komplettwebdesign.de` -> `https://www.komplettwebdesign.de` (301). Canonical-Tag und hreflang (de-DE, en, x-default) sind konsistent auf www.
- **Strukturierte Daten:** 6 JSON-LD-Blöcke (FAQPage, Organization/ContactPoint, Person, WebSite, Service, BreadcrumbList). Maschinenlesbar für Agenten; kein Versprechen für Google-Darstellung.
- **CLS niedrig** (siehe Abschnitt 2), kein verschobenes Layout beim Klicken.

## 4. Findings nach Priorität

Skala: Critical / High / Medium / Low (in Klammern die P-Stufe des `seo-agentic`-Skills).

### F1 – High (P0): Zwei ARIA-Fehler im Accessibility-Tree, vermutlich Fail von `agent-accessibility-tree`

Beleg (lokal, Lighthouse 12.8.2, axe; Lighthouse 13.5.0/PSI nicht verfügbar):

1. `aria-allowed-role` auf **jeder Seite** (Startseite, /en, /kontakt, /pakete, /pakete/start): `div.hero-nav > div#navigation > a.logo > img` mit `<img src="/images/LogoTransparent.webp" alt="Icon um zur Startseite zu kommen" role="presentation">`.
   Quelle: `views/partials/header.ejs:111`. Ein `img` mit nicht leerem `alt` darf nicht `role="presentation"` haben. Der Link trägt bereits `aria-label="Zur Startseite"` (Zeile 110), das Alt "Icon um zur Startseite zu kommen" ist zusätzlich schlechter Text.
2. `aria-prohibited-attr` auf Startseite und /en (3 Knoten): `<div class="trust-review-stars" aria-label="5 von 5 Sternen">`.
   Quelle: `views/index.ejs:707`. `aria-label` auf einem `div` ohne Rolle ist verboten und wird im Tree ignoriert; die Sterne sind für Agenten damit stumm.

Fix:
- `views/partials/header.ejs:111`: `<img src="/images/LogoTransparent.webp" alt="" />` (role entfernen, Alt leer, weil der Link über `aria-label` benannt ist), oder Rolle entfernen und Alt = "Komplett Webdesign" setzen und `aria-label` am Link weglassen.
- `views/index.ejs:707`: `<div class="trust-review-stars" role="img" aria-label="<%= r.rating %> von 5 Sternen">` (die Icons darin sind bereits `aria-hidden="true"`). Prüfen, ob dasselbe Muster in der EN-Variante und in weiteren Templates vorkommt (`grep -rn 'aria-label' views | grep '<div'`).

Bestätigung: `lighthouse_agentic.py` erneut ausführen und `agent-accessibility-tree` prüfen; zusätzlich lokal `aria-allowed-role` und `aria-prohibited-attr` = pass.

### F2 – Medium (P1): `llms.txt` besteht die Lighthouse-Regeln nicht

Beleg: `https://www.komplettwebdesign.de/llms.txt` (identisch mit `public/llms.txt`): HTTP 200, `text/plain`, 4411 Bytes. `agentic_check.py`: Lighthouse = fail, "contains no Markdown links"; Hinweis: keine Blockquote-Zusammenfassung (`> ...`) wie von llmstxt.org empfohlen. `llms-full.txt` = 404 (optional).
Weitere Mängel:
- Alle URLs stehen als Klartext im Format `- Startseite: https://komplettwebdesign.de/` (`public/llms.txt:87` ff.), nicht als `[Titel](URL)`.
- "Canonical site: https://komplettwebdesign.de/" (`public/llms.txt:4`) und alle Links zeigen auf die Nicht-www-Variante. Kanonisch ist `https://www.komplettwebdesign.de/`; jeder Link kostet einen 301-Hop (alle 10 geprüften URLs: 200 nach 1 Redirect).
- "Last updated: 2026-04-21" (ca. 6 Monate alt).
- Paketpreise fehlen bewusst ("Preis: aktuelle Paketlogik und Preisangaben siehe ...", Zeilen 34, 43, 53, 63), obwohl die Startseite 799 / 1.499 / 2.499 / 3.500 € nennt. Hosting/Domain-Preise stehen dagegen hartcodiert drin und können driften.
- Keine Links auf `/en`, `/kontakt#schnellanfrage`, `/webdesign-berlin/kosten-preise-pakete`, Leistungsseiten.
- Hinweis: `tests/phase2LegacyPricingCleanup.test.js:28` prüft `public/llms.txt` auf Alt-Preise; vor dem Eintragen aktueller Preise den Test lesen. Besser: Preise aus derselben Quelle wie die Startseite erzeugen (Route statt statischer Datei).

Fix (Entwurf, nicht deployt; Preise nur übernehmen, wenn sie aus der Pricing-Quelle stammen):

```
# Komplett Webdesign

> Webdesign-Dienstleister aus Berlin (Einzelunternehmer): Websites für kleine Unternehmen, Selbstständige und lokale Dienstleister, mit SEO-Grundlage, Hosting und Wartung. Deutsch, mit englischer Version unter /en.

Stand: 2026-10-23. Kanonische Domain: https://www.komplettwebdesign.de/

## Pakete und Preise

- [Pakete & Preise](https://www.komplettwebdesign.de/pakete): Übersicht aller Pakete, Preise ab 799 EUR (Start)
- [Start](https://www.komplettwebdesign.de/pakete/start): 1 bis 3 Seiten oder Onepager
- [Business](https://www.komplettwebdesign.de/pakete/business): ca. 4 bis 7 Seiten
- [Wachstum](https://www.komplettwebdesign.de/pakete/wachstum): ca. 8 bis 12 Seiten
- [Individuell](https://www.komplettwebdesign.de/pakete/individuell): projektspezifisch
- [Webdesign Preise](https://www.komplettwebdesign.de/webdesign-berlin/kosten-preise-pakete)

## Kontakt

- [Schnellanfrage (Formular)](https://www.komplettwebdesign.de/kontakt#schnellanfrage)
- [Ausführliche Projektanfrage](https://www.komplettwebdesign.de/kontakt#projektanfrage)
- E-Mail: kontakt@komplettwebdesign.de, Telefon: +49 1551 245048

## Leistungen

- [Webdesign Berlin](https://www.komplettwebdesign.de/webdesign-berlin)
- [Leistungen](https://www.komplettwebdesign.de/leistungen/)
- [Website-Relaunch](https://www.komplettwebdesign.de/leistungen/website-relaunch)
- [Local SEO](https://www.komplettwebdesign.de/leistungen/local-seo)
- [Wartung & Support](https://www.komplettwebdesign.de/leistungen/website-wartung)

## Optional

- [English version](https://www.komplettwebdesign.de/en)
- [Website-Tester](https://www.komplettwebdesign.de/website-tester)
- [Referenzen](https://www.komplettwebdesign.de/referenzen)
```

Die von `agentic_fix.py llms` erzeugte Rohfassung enthält zusätzlich Swipe-&-Cook-Seiten (andere Produktlinie auf derselben Domain) und Platzhalter; diese bewusst weglassen oder unter "Optional" führen.
Bestätigung: `agentic_check.py` -> `llms-txt` = pass. Hinweis: Kein bestätigter Verbraucher-Agent liest `llms.txt`; es ist ein Lighthouse-Prüfpunkt, kein Wirkungsversprechen.

### F3 – Medium (P1, manuell geprüft): Mehrdeutige Link-Namen bei der Paketauswahl

Beleg (Accessibility-Tree): Startseite hat 4 Links mit identischem Namen "Details ansehen" (Start, Business, Wachstum, Individuell); `/pakete` ebenfalls 4x "Details ansehen"; `/pakete/start` hat 4x "Paket ansehen". Der Tree zeigt Links nur mit Namen, die zugehörige Überschrift steht nur als Geschwisterknoten. Ein Agent, der "Business-Paket öffnen" soll, muss die Position erraten.
Quellen: `views/index.ejs:464` (Label aus `homePackageCtaLabel`, Zeile 65), `views/packages_list.ejs:73` (`packagePrimaryCtaLabel`), `views/package_detail.ejs:537`.
Fix: Eindeutigen Namen ergänzen, z. B. `aria-label="<%= homePackageCtaLabel(pkg) %>: <%= pkg.name %>-Paket"` oder `<span class="visually-hidden">: <%= pkg.name %></span>`. Der sichtbare Text muss im Namen enthalten bleiben (WCAG 2.5.3 Label in Name).
Bestätigung: Link-Namen im Tree (`render_page.py --a11y-tree`) sind eindeutig.

### F4 – Low (P1): Footer-Eingabefelder nur mit Placeholder, englischer Button-Name auf deutscher Seite

Beleg: `agent_ux_check.py`: "2 input(s) without label[for] (-8)" auf allen geprüften Seiten (92 statt 100).
- `views/partials/footer.ejs:26`: `input#footerNewsletterEmail` hat nur `placeholder` ("Deine E-Mail"). Chrome leitet daraus den Namen ab (Tree zeigt `textbox 'Deine E-Mail'`, Lighthouse `label` = pass), das ist aber ein Fallback.
- `views/partials/footer.ejs:89`: `input#chat-input` ebenfalls nur Placeholder ("Frage eingeben...").
- `views/partials/footer.ejs:27`: `<button type="submit" aria-label="Subscribe">` ist auf der deutschen Seite englisch (Tree: `button 'Subscribe'`).
- `views/partials/footer.ejs:80`: `<button id="chat-toggle">` hat kein `type`.
Fix: `aria-label` bzw. sichtbare/visually-hidden `<label for>` an beiden Inputs; Button-Label mit `isEn`-Weiche ("Newsletter abonnieren"). Danach steigt der Agent-UX-Wert auf etwa 100 (Bestätigung: `agent_ux_check.py`).

### F5 – Low (P1, nicht getestet): reCAPTCHA v3 auf Absende-Pfaden

Beleg: `data-recaptcha="v3"` am Schnellformular (`views/kontakt.ejs:179`), Newsletter (`views/partials/footer.ejs:18`) und Paket-Kontaktformular (`views/package_detail.ejs:441`); Script von `google.com/recaptcha/api.js` wird nachgeladen (`footer.ejs:163`). Das ausführliche Formular (`kontakt.ejs:251`) hat das Attribut nicht.
reCAPTCHA v3 ist unsichtbar und scorebasiert; es gibt keine Challenge auf Inhalten (P0 "kein CAPTCHA auf Inhalten" ist erfüllt). **Nicht getestet:** ob agentengesteuerte Browser (z. B. Gemini in Chrome, Claude in Chrome, Comet) einen so niedrigen Score erhalten, dass die Anfrage abgelehnt wird. Dafür gibt es keine Messung; es ist eine Beobachtung, kein Befund.
Zusätzlich: Honeypot `div.contact-hp` liegt off-screen (`public/kontakt.css:809`), hat `aria-hidden="true"` und `tabindex="-1"` (korrekt aus dem Tree ausgeschlossen); sein Label sagt "Dieses Feld bitte leer lassen". DOM-lesende Agenten könnten es dennoch ausfüllen; geringes Risiko.
Empfehlung: Serverseitige Ablehnung immer als sichtbare, benannte Fehlermeldung (`role="alert"`, bereits vorhanden in `kontakt.ejs:123`) ausgeben und einen Alternativweg (E-Mail/Telefon) in der Fehlermeldung nennen.

### F6 – Low (P1): Content-Signal nicht deklariert (Entwurf-Standard)

Beleg: robots.txt hat keine `Content-Signal`-Zeile. Alle KI-Agenten sind erlaubt (`Allow: /`), also auch Training (GPTBot, ClaudeBot, Google-Extended; CCBot und Applebot-Extended fallen auf `*`).
Das ist eine Eigentümerentscheidung. **Sören muss entscheiden**, ob Trainingsnutzung gewünscht ist; ich entscheide `ai-train` nicht. Beispiel nur zur Ansicht: `Content-Signal: search=yes, ai-input=yes, ai-train=no` je Gruppe (`agentic_fix.py robots` erzeugt den Entwurf auf stdout, Allow/Disallow bleiben unverändert). Content-Signal ist eine Präferenz, keine Durchsetzung, und Google wertet es laut Matrix nicht aus.

### F7 – Low: Repo enthält zwei abweichende robots.txt

Beleg: `Robots.txt` (Repo-Root) und `public/robots.txt` unterscheiden sich; die Root-Datei enthält die Zeilen `Disallow: /api/`, `/webhook`, `/test` in den Gruppen nicht. Ausgeliefert wird `public/robots.txt` (Diff gegen die Live-Datei: identisch). Gefahr: Drift bei späteren Änderungen. Fix: Root-Datei löschen oder per Test an `public/robots.txt` koppeln.

### F8 – Info (kein Defekt): Mehrere Standard-/Entdeckungsschichten fehlen

- **Markdown:** `Accept: text/markdown` liefert `text/html` (kein Markdown); `/index.md` = 404; kein `rel="alternate" type="text/markdown"`. Chance, kein Mangel. Kein Verbraucher-Agent ist als `Accept: text/markdown`-Sender belegt.
- **WebMCP:** 0 Tools, 2 Formulare ohne Annotation (`/newsletter/signup`, `chat-form`). Für diese Seite sind Newsletter und Chat keine sinnvollen Agenten-Aktionen. Falls überhaupt: ein Tool für die Schnellanfrage, gebunden an das vorhandene Submit-Handling mit menschlicher Bestätigung. W3C-Community-Group-Entwurf, kein Standard.
- **ai-catalog.json, API-Catalog, OAuth-Metadaten, A2A-Agent-Card, UCP:** alle 404, alle "nur nötig, wenn der passende Dienst betrieben wird". Hier nicht zutreffend, kein Handlungsbedarf.
- **Web Bot Auth:** nicht geprüft/nicht anwendbar (Entwurf).
- **Kontaktformular hinter Disclosure:** Beim Laden stehen im Tree nur die beiden Buttons "Schnellanfrage" / "Ausführliche Projektanfrage"; die Formulare erscheinen nach Klick bzw. per `#schnellanfrage`-Hash (JS erforderlich, `views/kontakt.ejs:745-821`). Das ist sauber umgesetzt; Fetcher ohne JavaScript sehen die Panels wegen `hidden` nicht als Formular. Empfehlung: In `llms.txt` direkt auf `/kontakt#schnellanfrage` verlinken (siehe F2).
- **WAF-Verhalten gegenüber Agenten-User-Agents:** nicht getestet (`--ua-matrix` nur mit ausdrücklicher Freigabe des Seiteninhabers). Es gab keine Blockade durch den Audit-Fetcher.

## 5. Zugriffsrichtlinie (getrennt nach Zweck)

- **Training:** erlaubt. GPTBot (benannte Gruppe, `Allow: /`), ClaudeBot (benannt), Google-Extended (benannt), CCBot und Applebot-Extended über `*`. Content-Signal fehlt.
- **Suche/Zitation:** erlaubt. OAI-SearchBot, Claude-SearchBot, PerplexityBot (alle benannt), Googlebot (benannt). Kein Suchcrawler am Root blockiert.
- **Nutzergetriggert (Agenten, die eine Person beauftragt):** erlaubt. ChatGPT-User und Claude-User benannt mit `Allow: /`. Laut Matrix: Claude-User beachtet robots.txt; ChatGPT-User "may not apply"; Perplexity-User und Google-Agent ignorieren robots.txt im Allgemeinen (hier `*`-Gruppe, erlaubt). Deshalb ist es richtig, dass `/admin/` per Login (302 -> /login) geschützt ist und nicht nur per robots.txt.
- Alle Gruppen verbieten identisch `/admin/`, `/auth/`, `/api/`, `/webhook`, `/test`. Hinweis: `Disallow: /test` ist ein Präfix und sperrt jede URL, die mit `/test` beginnt.

## 6. Standards-Status (alle Entwürfe/Vorschläge; geprüft laut Matrix am 2026-09-23)

- **WebMCP:** W3C-Community-Group-Entwurf, kein Standard; WebKit lehnt ab, Mozilla neutral; Chrome-Origin-Trial M149 bis M156, kein Ship-Termin angekündigt (Enddatum 2026-11-17 nur sekundär belegt).
- **Content-Signal:** Cloudflare-Policy (CC0) plus IETF-Individualentwurf (abgelaufen 2026-04-04); Präferenz, keine Durchsetzung; keine Google-Aussage gefunden.
- **ai-catalog.json / Agentic Resource Discovery (ARD) 1.0:** Entwurf; von Lighthouse 13.5 (`ard-schema`) geprüft, Abwesenheit = N/A.
- **Web Bot Auth:** `draft-ietf-webbotauth-httpsig-protocol-00` (2026-09-01), Entwurf.
- **MCP Server Card:** SEP-2127 offen, nicht gemergt (2026-09-12).
- **Lighthouse:** 13.5.0 (npm latest 2026-09-18); die Kategorie Agentic Browsing ist laut Quelle "under development and subject to change". WebMCP-Audits hängen vom Test-Browser ab.
- **llms.txt:** Community-Spezifikation (llmstxt.org); Lighthouse prüft sie, Google Search ignoriert sie.

## 7. Empfehlungen in Reihenfolge

1. **F1 beheben** (2 Template-Zeilen: `header.ejs:111`, `index.ejs:707`). Entlastet P0, wirkt sitewide. Prüfen mit `agent_ux_check.py` und `lighthouse_agentic.py` (`agent-accessibility-tree`).
2. **F2 beheben** (`public/llms.txt` neu schreiben, www-URLs, Markdown-Links, Blockquote, Datum). Prüfen mit `agentic_check.py` (`llms-txt`).
3. **F3 beheben** (eindeutige Namen der Paket-Links). Prüfen im Accessibility-Tree.
4. **F4** (Footer-Labels) und **F7** (doppelte robots.txt) als Aufräumarbeit.
5. **F6** erst nach Entscheidung über die Trainingsnutzung.
6. WebMCP, Markdown, ai-catalog.json bewusst zurückstellen (Chancen, keine Mängel).
7. Lighthouse-Fraktion messen, sobald PSI-Quota/Key verfügbar ist, und X/N dann hier eintragen.

## 8. Bewertung des Gesamtscores (75/100), Methode

Eigene, transparente Heuristik, **nicht** der Lighthouse-Wert und nicht die Agent-UX-Zahl (92):

| Bereich | Punkte | Begründung |
|---|---|---|
| Zugriff und Rendering (P0) | 25 / 25 | SSR, robots erreichbar, echte 404, Kanonisierung |
| Accessibility-Tree für Agenten | 16 / 25 | Agent-UX 92, aber 2 axe-Regeln sitewide/Startseite fehlerhaft, mehrdeutige Paket-Links |
| Formulare und Aktionspfade | 15 / 20 | gut beschriftetes Kontakt- und Paketformular; Disclosure-Schritt, reCAPTCHA-Verhalten ungetestet |
| Entdeckungsschicht (llms.txt, Markdown, Katalog) | 6 / 15 | llms.txt vorhanden, aber Lighthouse-fail, veraltet, nicht-www; Rest optional und nicht vorhanden |
| Zugriffsrichtlinie | 13 / 15 | bewusste Gruppen pro Agent, Auth statt robots für Privates; Content-Signal fehlt |

## 9. Strukturierte Findings (für `audit-data.json`, Kategorie "AI Search Readiness")

```json
[
  {
    "title": "Accessibility-Tree: ARIA-Fehler in Header-Logo und Bewertungssternen",
    "severity": "high",
    "description": "views/partials/header.ejs:111 setzt role=\"presentation\" auf ein img mit nicht leerem alt (axe aria-allowed-role, alle Seiten). views/index.ejs:707 setzt aria-label auf ein div ohne Rolle (axe aria-prohibited-attr, 3 Knoten auf / und /en). Beide Regeln gehören zu den 33 axe-Regeln des Lighthouse-Audits agent-accessibility-tree, das daher voraussichtlich fehlschlägt. Gemessen lokal mit Lighthouse 12.8.2; PSI (13.5.0) nicht verfügbar (HTTP 429).",
    "recommendation": "Logo-img mit alt=\"\" und ohne role; Sterne-div mit role=\"img\" und aria-label. Danach lighthouse_agentic.py und agent_ux_check.py erneut ausführen."
  },
  {
    "title": "llms.txt besteht Lighthouse-Regeln nicht (keine Markdown-Links)",
    "severity": "medium",
    "description": "public/llms.txt (HTTP 200, 4411 Bytes) listet URLs als Klartext, hat keine Blockquote-Zusammenfassung, verweist auf die Nicht-www-Domain (301-Hop je Link), ist mit 'Last updated 2026-04-21' veraltet und nennt keine Paketpreise. Lighthouse llms-txt = fail. Google ignoriert llms.txt; kein belegter Verbraucher-Agent liest sie.",
    "recommendation": "Datei mit [Titel](https://www.komplettwebdesign.de/...)-Links, Blockquote, aktuellem Datum und www-URLs neu erzeugen (Preise aus der Pricing-Quelle). Mit agentic_check.py (llms-txt) prüfen."
  },
  {
    "title": "Paket-Links mit identischem Namen im Accessibility-Tree",
    "severity": "medium",
    "description": "Startseite und /pakete haben je 4 Links 'Details ansehen', /pakete/start 4x 'Paket ansehen' (views/index.ejs:464, views/packages_list.ejs:73, views/package_detail.ejs:537). Agenten können Pakete nur über die Position unterscheiden.",
    "recommendation": "Paketnamen in den Linknamen aufnehmen (aria-label oder visually-hidden Text), sichtbaren Text im Namen behalten."
  },
  {
    "title": "Footer-Inputs nur mit Placeholder, englischer Button-Name",
    "severity": "low",
    "description": "views/partials/footer.ejs:26 (Newsletter-E-Mail) und :89 (Chat-Eingabe) ohne label; :27 aria-label=\"Subscribe\" auf deutscher Seite. Agent-UX -8 Punkte (92/100).",
    "recommendation": "aria-label oder label[for] ergänzen, Button-Label lokalisieren."
  },
  {
    "title": "reCAPTCHA v3 auf Absendepfaden: Agentenverhalten ungetestet",
    "severity": "low",
    "description": "Schnellformular, Newsletter und Paketformular nutzen data-recaptcha=\"v3\". Ob agentengesteuerte Browser abgelehnt werden, wurde nicht getestet.",
    "recommendation": "Ablehnung als sichtbare, benannte Fehlermeldung mit Alternativweg (E-Mail/Telefon) ausgeben; Agentenabläufe manuell testen."
  },
  {
    "title": "Content-Signal in robots.txt nicht deklariert",
    "severity": "low",
    "description": "Alle KI-Agenten inklusive Trainingscrawler (GPTBot, ClaudeBot, Google-Extended) sind erlaubt; es gibt keine Content-Signal-Zeile (Entwurfsstandard, Präferenz, Google wertet sie nicht aus).",
    "recommendation": "Trainingsnutzung entscheiden, dann optional Content-Signal je Gruppe ergänzen (agentic_fix.py robots erzeugt Entwurf)."
  },
  {
    "title": "Zwei unterschiedliche robots.txt im Repo",
    "severity": "low",
    "description": "Robots.txt (Root) weicht von public/robots.txt (live ausgeliefert) ab.",
    "recommendation": "Root-Datei entfernen oder per Test synchron halten."
  },
  {
    "title": "Markdown-Auslieferung, WebMCP und ai-catalog.json nicht vorhanden",
    "severity": "info",
    "description": "Accept: text/markdown liefert HTML, /index.md = 404, 0 WebMCP-Tools, /.well-known/ai-catalog.json = 404. Alles optionale Entwurfs- bzw. Community-Funktionen; Abwesenheit ist eine Chance, kein Mangel.",
    "recommendation": "Zurückstellen; nur bei echtem Bedarf umsetzen. Keine Ranking- oder Zitationswirkung zugesagt."
  }
]
```

## 10. Reproduktion

Skripte laufen mit `CLAUDE_PLUGIN_DATA="$HOME/.claude/plugins/data/claude-seo-agricidaniel-claude-seo"`:
`lighthouse_agentic.py <url> --strategy both --json` (PSI 429), `agentic_check.py <url> --json`, `agent_ux_check.py <url> --json`, `render_page.py <url> --a11y-tree --json`, `agentic_fix.py llms|robots|webmcp` (nur stdout). Lokale axe-/CLS-Proxy-Messung mit dem bereits vorhandenen Lighthouse 12.8.2 (`--only-audits`, Playwright-Chromium); Rohdaten im Scratchpad der Sitzung, nicht im Repo.
