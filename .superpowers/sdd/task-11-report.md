# Task 11 – Konservative Auto-Publish-Policy und Review-Fallback

## Ergebnis

Die automatische Veröffentlichung ist mit der stabilen Policy `auto-v1` vollständig implementiert. Sie ist fail-closed: Nur ein unter Datenbanksperren erneut validierter, unveröffentlichter KI-Entwurf mit vollständig sicherem Review- und Risikobericht darf veröffentlicht werden. Jede fachliche Blockade bleibt ein erfolgreicher Review-Fallback mit `reviewRequired:true`; technische oder unklare Eventfehler erzeugen keine `completed`-Stage.

## Policy-Garantien

- `forced_mode=review`, Reviewbetrieb, geschlossenes technisches Hardgate oder weniger als acht manuelle Freigaben blockieren.
- Der Score muss mindestens dem höheren Wert aus 90 und dem eingefrorenen Snapshot-Mindestscore entsprechen.
- Draftstatus, KI-Herkunft, statisches HTML, HTTPS-Bild, Alt-Text, Slug, Meta-/OG-Daten, fünf bis sieben FAQ und zwei bis acht erlaubte interne Links werden streng geprüft.
- Die aktuelle Validierung muss bestanden, issuefrei und vollständig sein; der Sanitizer darf den persistierten Inhalt nicht verändern.
- Persistierter und neu berechneter fokussierter Risikobericht müssen exakt übereinstimmen. Unbekannte oder fehlerhafte Felder blockieren.
- Die fünf deterministischen Risikoflags `currentClaims`, `legalClaims`, `privacyClaims`, `softwareVersionClaims` und `staticPrices` blockieren jeweils einzeln.
- Blockierende Reviewissues, fokussierte Blocker und zusätzliche Risikoflags verwenden den stabilen Reason-Code `risk_review_required`.
- Quellenpflichtige Inhalte verlangen zwei bis sechs eindeutige, schemagültige HTTPS-Quellen. Unvollständige oder zusätzliche Quellenfelder blockieren.
- Die kanonischen Reason-Codes aus dem freigegebenen Vertrag sind stabil: unter anderem `technical_gate_disabled`, `validation_failed`, `risk_review_required` und `image_incomplete`.

## Atomare Veröffentlichung und Retry

- Die Produktionspipeline ruft den echten Publikationsservice unmittelbar nach `draft_creation` auf und bindet ihn im Worker an denselben injizierten Datenbank-Pool und den produktiven Validator.
- Der unveränderliche Job-Snapshot steuert die Entscheidung. Live-Einstellungen können einen alten Job nicht nachträglich freischalten; das aktuelle technische Hardgate kann die Veröffentlichung weiterhin abschalten.
- Entwurf, Metadaten und Validierungskontext werden unter derselben globalen Post-Lock-Reihenfolge wie bei der manuellen Veröffentlichung erneut gelesen und geprüft.
- Das unveränderliche `allowed`- oder `blocked`-Event und die Post-Zustandsänderung liegen in derselben Transaktion. Das Event wird vor der öffentlichen Zustandsänderung geschrieben.
- Ein Eventfehler rollt vor jeder Veröffentlichung zurück. Ein blockierendes Event commitet gemeinsam mit dem unveränderten Review-Draft.
- Ein partieller Unique-Index auf `(run_id, policy_version)` stellt genau eine automatische Entscheidung pro Lauf und Policy sicher.
- Retries verwenden das vorhandene Event. Ein bestehendes `blocked`-Event bleibt unveröffentlicht; ein bestehendes `allowed`-Event mit bereits veröffentlichtem Post löst auch einen zuvor unklaren Commit idempotent auf.
- Die automatische Veröffentlichung erhöht weder den manuellen Freigabezähler noch speichert sie einen Admin-Akteur.
- Die Pipeline persistiert `auto_publish:auto-v1` und übernimmt Entscheidung und finalen Post konsistent in `completed`. Providerstufen werden bei einem Retry nicht erneut ausgeführt.

## TDD und Verifikation

- RED: Das Policy-Modul fehlte zunächst erwartungsgemäß; anschließend scheiterten die neuen Pipeline-, Publikations- und Worker-Verträge gezielt vor ihrer Implementierung.
- Fokussierte Suite: 170 bestanden, 0 fehlgeschlagen.
- Gesamtsuite mit nicht geheimem Testschlüssel: 877 bestanden, 0 fehlgeschlagen, 1 vorhandener PostgreSQL-Opt-in-Test übersprungen.
- Build: erfolgreich; 41 CSS-Quelldateien, Manifest unverändert.
- Providerfreier Dry-Run: erfolgreich mit `externalCalls:0`, gültigem Artikel und Score 90.
- Syntaxprüfungen der vier geänderten Laufzeitmodule: erfolgreich.
- `git diff --check`: ohne Befund.
- Geheimnisscan des produktiven Patches: keine Zugangsdaten, privaten Schlüssel oder Datenbank-URLs gefunden.

## Hinweis

Der destruktive PostgreSQL-Integrationstest bleibt ohne ausdrücklich freigegebene Reset-Testdatenbank übersprungen. Es wurden keine externen Provider aufgerufen und keine Live-Daten verändert.
