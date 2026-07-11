# Task 7 – Konkreter Risikobericht mit fokussierten Prüfstellen

## Status

DONE_WITH_CONCERNS

## Ergebnis

Der Content-Agent erzeugt nach dem finalen Review einen deterministischen fokussierten Risikobericht und speichert ihn additiv unter `content_post_metadata.quality_report_json.focusedReview`. Die bestehenden Felder `issues`, `risks`, Score, Zusammenfassung und Empfehlungen bleiben unverändert erhalten.

Jeder Berichtspunkt enthält:

- maschinenlesbare Kategorie und Schweregrad,
- einen tatsächlich im Artikel vorhandenen H2-/H3-Abschnitt oder den sicheren Fallback `Gesamter Artikel`,
- einen höchstens 280 Zeichen langen, tatsächlich im Artikel vorhandenen Belegausschnitt,
- Begründung und konkrete Prüfanweisung,
- Prüfart und Quellenbedarf,
- Blocking-Status,
- einen ausschließlich serverseitig erzeugten, deutschen und stabilen Sprunganker.

Doppelte Überschriften werden über den Belegausschnitt ihrer konkreten Fundstelle zugeordnet und erhalten eindeutige Suffixe. Deutsche Umlaute werden stabil transliteriert, beispielsweise `Über Größe & Ästhetik` zu `pruefung-ueber-groesse-und-aesthetik`.

## TDD-Nachweis

Erster RED-Lauf des neuen Service-/Viewvertrags:

```text
node --test tests/contentAgentRiskReport.test.js
0 bestanden, 1 fehlgeschlagen
ERR_MODULE_NOT_FOUND: services/contentAgent/riskReportService.js
```

Zusätzlicher RED-Lauf für Pipeline, Schema und Prompt:

```text
node --test tests/contentAgentOpenAIService.test.js tests/contentAgentDraftPipeline.test.js
90 bestanden, 4 fehlgeschlagen
```

Bestätigte Ursachen:

- `quality_report_json.focusedReview` fehlte in der Pipeline.
- alte Review-Issues erhielten noch keine sicheren Standardwerte für die neuen optionalen Felder,
- der Reviewer-Prompt verlangte noch keine exakten vorhandenen H2-/H3-Titel, Belegausschnitte, Prüfarten und Quellenbedarfe,
- der Reviewer-Prompt untersagte noch nicht ausdrücklich Modell-IDs und erfundene Sprungmarken.

Zusätzlicher Selbstreview-RED für den Partial-Leerzustand:

```text
node --test --test-name-pattern='ohne Bericht' tests/contentAgentRiskReport.test.js
0 bestanden, 1 fehlgeschlagen
ReferenceError: riskReview is not defined
```

GREEN:

```text
node --test \
  tests/contentAgentRiskReport.test.js \
  tests/contentAgentDraftPipeline.test.js \
  tests/contentAgentOpenAIService.test.js \
  tests/contentAgentAdminViews.test.js \
  tests/contentAgentArticleValidator.test.js

125 bestanden, 0 fehlgeschlagen
```

## Umsetzung

- `ReviewIssueSchema` wurde ausschließlich additiv um optionale Felder mit sicheren Defaults erweitert. Alte Antworten ohne diese Felder bleiben gültig.
- Der Reviewer-Prompt ist auf `2026-07-11.1` versioniert und verlangt exakte vorhandene H2-/H3-Titel, wörtliche Ausschnitte bis 280 Zeichen, Prüfart, Quellenbedarf und Auto-Publish-Blocking. HTML-IDs, Anker und Sprungmarken darf das Modell nicht erzeugen.
- `riskReportService.js` akzeptiert auch fehlende, ungültige oder anders geformte Review- und Validation-Issues ohne Absturz und erzeugt verständliche Fallbacks.
- Validation-Issues gelten im Bericht deterministisch als blockierend, auch wenn sie nicht das Review-Issue-Format besitzen.
- Abschnitt und Ausschnitt werden gegen das tatsächliche sanitizierte Artikel-HTML geprüft. Erfundenen Überschriften oder Ausschnitten wird nicht vertraut.
- Jedes aktive Artikel-Riskflag ohne konkrete Modellfundstelle erzeugt einen sichtbaren allgemeinen blockierenden Prüfpunkt. Bekannte Flags erhalten deutsche konkrete Anweisungen; unbekannte zukünftige Flags bleiben ebenfalls sichtbar und blockierend.
- Findet das Modell für ein deterministisches Riskflag eine echte passende Fundstelle, übernimmt diese den Blocker und es entsteht kein doppelter allgemeiner Punkt.
- Die Pipeline bildet den Bericht aus der final reviewten, sanitizierten Artikelfassung, dem finalen Review, den deterministischen Validation-Issues und den bereits validierten Quellen.
- `_riskChecklist.ejs` rendert alle dynamischen Texte ausschließlich escaped. Es verwendet weder rohes HTML noch Modell-IDs und bleibt ohne Bericht leer.

## Geprüfte Randfälle

- fehlende und ungültige Issue-Felder,
- Validation-Issues mit abweichender Form,
- vorhandene und fehlende Quellenlisten,
- leerer Bericht,
- doppelte Abschnittsüberschriften,
- deutsche Umlaute und Sonderzeichen,
- unbekannte Riskflags,
- vorhandene Modell-Fundstelle gegenüber allgemeinem Riskflag-Fallback,
- bösartige Texte in Abschnitt, Ausschnitt, Begründung, Anweisung und Kategorie,
- fehlender `riskReview`-Viewlocal.

## Verifikation

```text
Fokussierte Suite: 125 bestanden, 0 fehlgeschlagen
Gesamtsuite mit OPENAI_API_KEY=test-key: 764 bestanden, 1 übersprungen, 0 fehlgeschlagen
CSS-Build: 41 Quelldateien gebaut, Manifest unverändert
git diff --check: ohne Befund
```

## Bewusste Abgrenzung

Das neue Partial wird in Task 7 bewusst noch nicht in die öffentliche beziehungsweise frontendnahe Vorschau eingebunden. Diese Einbindung und das Setzen der korrespondierenden Ziel-IDs im Artikel gehören laut Gesamtplan zu Task 8. Dadurch nimmt Task 7 weder Vorschaucontroller noch Blog-Rendering vorweg.

## Sorgen

- Der echte PostgreSQL-Integrationstest bleibt ohne ausdrücklich freigegebene zurücksetzbare Testdatenbank erwartungsgemäß übersprungen. Task 7 ändert kein Datenbankschema.
- Bis Task 8 das Partial und die serverseitigen Zielanker in die Vorschau einbindet, ist der Bericht korrekt persistiert und separat sicher renderbar, aber noch nicht Bestandteil der frontendnahen Artikelvorschau.

## Review-Fix: konservative Riskflag- und Fundstellenzuordnung

Die Important-Funde des Task-7-Reviews wurden in einem getrennten TDD-Zyklus behoben.

### RED

```text
node --test tests/contentAgentRiskReport.test.js
9 bestanden, 6 fehlgeschlagen
```

Bestätigte Ursachen:

- aktive Flags wurden nur aus `article.risk`, nicht aus dem finalen `review.risks` gelesen,
- ein beliebiges passendes `verificationType` genügte zur Riskflag-Deduplizierung,
- unbekannte Codes mit Datumsbegriffen wurden heuristisch und zu großzügig als `date` eingestuft,
- ein artikelweit vorhandener, aber sektionfremder Ausschnitt blieb fälschlich an der angeforderten Überschrift,
- doppelte Überschriften ohne eindeutigen Ausschnitt fielen willkürlich auf die erste Fundstelle,
- HTML, Überschriften, Abschnittstexte und normalisierte Anweisungen waren für die Analyse nicht begrenzt.

### GREEN

```text
Review-Fix-Unit: 15 bestanden, 0 fehlgeschlagen
Fokussierte Task-7-Suite: 132 bestanden, 0 fehlgeschlagen
Gesamtsuite mit OPENAI_API_KEY=test-key: 771 bestanden, 1 übersprungen, 0 fehlgeschlagen
CSS-Build: 41 Quelldateien gebaut, Manifest unverändert
git diff --check: ohne Befund
```

### Korrekturen

- Der Bericht bildet eine stabile Union aller aktiven Flags aus `article.risk` und dem finalen `review.risks`; ein `false` in einer Quelle hebt ein `true` in der anderen nicht auf.
- Jedes bekannte Riskflag besitzt eine explizite Allowlist zulässiger Issuecodes und Prüfarten. Eine Deduplizierung erfolgt nur, wenn Code und Prüfart zur selben Risikokategorie gehören.
- Zusätzlich muss die Überschrift exakt im begrenzten Artikel vorkommen und der Belegausschnitt eindeutig innerhalb genau dieses H2-/H3-Abschnitts gefunden werden.
- Fehlt eine dieser Bedingungen, bleibt der allgemeine blockierende Flag-Prüfpunkt sichtbar. Unbekannte Riskflags werden grundsätzlich nicht durch Modell-Issues dedupliziert.
- Die frühere regexbasierte Prüfart-Vermutung wurde entfernt. Fehlende oder unbekannte Prüfarten bleiben konservativ `none`.
- Sektionfremde, erfundene und nicht eindeutige Ausschnitte werden verworfen und auf `Gesamter Artikel` zurückgestuft.
- Doppelte Überschriften benötigen einen Ausschnitt, der genau einer Fundstelle zugeordnet werden kann. Ohne eindeutigen Beleg wird keine erste Fundstelle geraten.
- Die Analyse ist auf 250.000 HTML-Zeichen, 64 H2-/H3-Überschriften und 20.000 normalisierte Zeichen je Abschnitt begrenzt. Überschriften bleiben auf 180, Begründungen und Prüfanweisungen auf 500 Zeichen begrenzt.
- Die bestehende Ausschnittgrenze bleibt unverändert korrekt: exakt 280 Zeichen werden vollständig erhalten, längere Eingaben werden deterministisch auf 280 Zeichen begrenzt.
