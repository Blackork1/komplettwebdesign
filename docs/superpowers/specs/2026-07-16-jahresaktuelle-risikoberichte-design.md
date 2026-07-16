# Jahresaktuelle Risikoberichte – Design

## Ziel

Jahresaktuelle Blogartikel bleiben ausdrücklich erlaubt. Ein Jahr im Titel, in Meta-Daten oder als redaktioneller Aktualitätsrahmen darf nicht automatisch die Veröffentlichung blockieren. Blockierend bleiben nur konkrete zeitbezogene Tatsachenbehauptungen, die weder durch eine freigegebene sichtbare Quelle belegt noch vorsichtig als redaktionelle Einordnung formuliert sind.

## Problem

Der Abschluss-Review kann ein ursprünglich erkanntes Risiko wie `currentClaims` anhand der Artikelreparatur und der sichtbaren Quellenlinks korrekt auf `false` setzen. Der fokussierte Risikobericht vereinigt derzeit jedoch weiterhin die älteren Roh-Risiken des Artikelobjekts mit den bereinigten Risiken des Abschluss-Reviews. Dadurch entsteht nachträglich erneut ein pauschaler Blocker `risk_current_claims`, obwohl der Review bestanden wurde.

Der Fehler betrifft sowohl die Entwurfsvorschau als auch die Veröffentlichung: Der gespeicherte fokussierte Bericht ist blockierend, während der normalisierte Abschluss-Review keine offene Risikoflagge mehr enthält.

## Verbindliche Fachregel

1. Ein vollständiger, schema-validierter Abschluss-Review ist die maßgebliche Risikoquelle.
2. Artikel-Roh-Risiken werden nur verwendet, wenn kein vollständiger Review-Risikoblock vorliegt.
3. Ein bloßer Jahresbezug wie „Local SEO 2026“ oder „Worauf Unternehmen 2026 achten sollten“ ist kein eigener Blocker.
4. Eine konkrete Veränderungsbehauptung wie „2026 hat Google den Faktor X geändert“ bleibt quellenpflichtig.
5. Nicht blockierende Quellenhinweise dürfen in der Vorschau sichtbar bleiben, aber nicht als „Veröffentlichung blockiert“ erscheinen.
6. Rechtliche, Datenschutz-, Softwareversions- und Preisrisiken bleiben unverändert streng.

## Technische Lösung

### Risikobericht Version 2

`buildFocusedRiskReport` erhält eine eindeutige Risikoauflösung:

- Ist `review.risks` ein vollständiges Objekt mit allen fünf booleschen Risikofeldern, werden ausschließlich diese Risiken ausgewertet.
- Andernfalls wird aus Sicherheitsgründen auf `article.risk` zurückgefallen.
- Validierungsprobleme und explizit blockierende Review-Issues bleiben unabhängig davon blockierend.

Die Berichtsversion wird auf `focused-risk-v2` erhöht und damit Bestandteil des Content-Agent-Regelmanifests.

### Kostenfreie Reparatur vorhandener Entwürfe

Beim Laden einer geschützten Entwurfsvorschau wird der fokussierte Risikobericht deterministisch aus dem gespeicherten Artikel, Abschluss-Review, Validatorergebnis und den gespeicherten Quellen neu berechnet. Weicht nur der fokussierte Bericht vom gespeicherten Altbericht ab, wird die Anzeige mit dem aktuellen Bericht aufgebaut. Es erfolgt kein OpenAI-Aufruf.

Vor Freigabe oder Veröffentlichung wird derselbe aktuelle Bericht abgeleitet. Ein veralteter fokussierter Bericht darf die Veröffentlichung nicht dauerhaft blockieren; der aktuelle Bericht wird transaktional in `quality_report_json.focusedReview` gespeichert, bevor der vorhandene Freigabepfad weiterläuft.

## Benutzeroberfläche

- Nicht blockierende Hinweise werden als „Hinweise vorhanden“ dargestellt.
- Der pauschale doppelte Punkt `risk_current_claims` verschwindet, wenn der Abschluss-Review `currentClaims=false` enthält.
- Die bestehenden Quellenhinweise bleiben sichtbar und können freiwillig redaktionell geprüft werden.
- Es wird kein kostenpflichtiger Optimierungsbutton benötigt, um nur den Altbericht zu reparieren.

## Sicherheit

- Ohne vollständigen Abschluss-Review gilt weiterhin die vorsichtigere Artikel-Risikobewertung.
- Ein blockierendes Review-Issue oder ein Validatorfehler kann durch die neue Prioritätsregel nicht aufgehoben werden.
- Die Veröffentlichung prüft weiterhin Artikelzustand, Score, Bild, interne Links, Quellen und den abgeleiteten Risikobericht.

## Tests

- Ein Artikel mit `article.risk.currentClaims=true`, einem vollständigen Review mit `currentClaims=false` und nicht blockierenden Quellenhinweisen erzeugt keinen Blocker.
- Derselbe Artikel bleibt blockiert, wenn der Abschluss-Review unvollständig ist.
- Explizit blockierende aktuelle Behauptungen bleiben blockierend.
- Vorschau und Veröffentlichungsprüfung verwenden denselben neu abgeleiteten Bericht.
- Ein alter gespeicherter `focused-risk-v1`-Bericht wird ohne OpenAI-Aufruf ersetzt.

