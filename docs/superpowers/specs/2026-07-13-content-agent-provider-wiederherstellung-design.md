# Content-Agent: sichere Provider-Wiederherstellung

## Ziel

Ein Content-Agent-Lauf, dessen kostenpflichtiger OpenAI-Aufruf nicht eindeutig abgeschlossen wurde, darf weder automatisch doppelt ausgeführt noch durch einen wirkungslosen Standard-Retry fortgesetzt werden. Ein Administrator soll den unklaren Aufruf nach einer deutlichen Kostenwarnung bewusst verwerfen und den bestehenden Job exakt an dieser Providerstufe fortsetzen können. Bereits dauerhaft gespeicherte Ergebnisse wie Themenrecherche und Themenauswahl bleiben erhalten.

## Gewählte Variante

Die Umsetzung verwendet eine explizite, bestätigungspflichtige Wiederherstellungsaktion. Ein vollständiger neuer Job würde bereits bezahlte Stufen erneut ausführen. Ein automatisches Verwerfen der Reservierung wäre wegen möglicher doppelter Providerkosten nicht vertretbar. Die bestätigungspflichtige Aktion hält beides auseinander: Der normale Retry bleibt für sicher wiederholbare Fehler zuständig; ein unklarer Providerausgang erhält einen eigenen Adminpfad.

## Fachliche Regeln

1. `provider_execution_uncertain` ist nicht über den normalen Button „Job fortsetzen“ wiederholbar.
2. Die Adminübersicht zeigt stattdessen nur dann „Reservierung verwerfen und SEO-Briefing erneut erstellen“, wenn serverseitig genau eine passende offene Providerreservierung vorhanden ist.
3. Vor Ausführung erscheint der eindeutige Hinweis, dass der frühere OpenAI-Aufruf möglicherweise berechnet wurde und durch die Wiederholung zusätzliche Kosten entstehen können.
4. Die Aktion wird serverseitig in einer Datenbanktransaktion geprüft. Maßgeblich sind Jobstatus, Fehlercode, Laufstatus, fehlender Beitrag und die offene Reservierung – niemals allein übermittelte Browserdaten.
5. Die offene Budgetreservierung wird nicht spurlos gelöscht. Sie wird aus dem aktiven Budgetschlüssel entfernt und als unveränderlicher Wiederherstellungsaudit mit Stufe, reserviertem Betrag, Zeitpunkt und Administrator festgehalten.
6. Der reservierte Betrag wird aus `cost_estimate` entfernt. Bestätigte Kosten bereits abgeschlossener Stufen bleiben unverändert.
7. Der vorhandene Job wird erneut eingereiht und erhält innerhalb des absoluten Adminlimits genau einen weiteren Versuch.
8. Beim nächsten Worker-Lauf werden persistierte Stufenergebnisse wiederverwendet. Nur die verworfene, unklare Providerstufe wird erneut aufgerufen.
9. Automatische Veröffentlichung bleibt unverändert deaktiviert; ein erfolgreicher Lauf erzeugt einen unveröffentlichten Entwurf zur Prüfung.

## Sichere Fehlerdiagnose

Bei künftigen unklaren OpenAI-Fehlern speichert der Lauf zusätzlich ausschließlich bereinigte Diagnosedaten:

- betroffene Providerstufe,
- Fehlerklasse,
- technischer Fehlercode,
- HTTP-Status, sofern vorhanden,
- OpenAI-Request-ID beziehungsweise Response-ID, sofern vorhanden.

Prompts, API-Schlüssel, Header, Antworttexte, Stacktraces und vollständige Providerantworten werden nicht gespeichert. Die vorhandene allgemeine Fehlermeldung für den Administrator bleibt bestehen.

## Komponenten

### Retry- und Präsentationslogik

Die normale Retryrichtlinie schließt `provider_execution_uncertain` ausdrücklich aus. Die Adminabfrage ermittelt separat, ob eine atomar wiederherstellbare Reservierung vorliegt, und liefert dafür eine eigene Aktionsfähigkeit samt sicherem Stufenlabel.

### Wiederherstellungs-Repository

Eine neue transaktionale Repositoryfunktion sperrt Job und Lauf, validiert alle Zustände erneut, verschiebt die Reservierung in einen Auditdatensatz, korrigiert den Kostenzähler und reiht den Job wieder ein. Bei veraltetem oder widersprüchlichem Zustand verändert sie nichts.

### Adminroute und Oberfläche

Eine CSRF-geschützte POST-Route ruft ausschließlich die transaktionale Repositoryfunktion auf. Die Jobliste zeigt nie beide Retryaktionen gleichzeitig. Der neue Button enthält eine explizite Bestätigung mit Kostenwarnung.

### Pipeline-Diagnose

Die Pipeline erzeugt aus Providerfehlern eine streng begrenzte Diagnose und hängt diese an `error_report_json`. Diese Diagnose dient der manuellen Klärung künftiger Fälle und ändert die vorsichtige Wiederholungsentscheidung nicht.

## Fehlerbehandlung

- Keine passende Reservierung: keine Mutation, verständliche Adminfehlermeldung.
- Mehrere offene Reservierungen: keine Mutation, weil die Wiederherstellung nicht eindeutig ist.
- Job bereits verändert oder Beitrag vorhanden: keine Mutation.
- Adminlimit erreicht: keine Mutation.
- Transaktionsfehler: vollständiger Rollback.
- Erneuter unklarer Providerfehler: derselbe manuelle Sicherheitszustand mit verbesserten Diagnosedaten.

## Teststrategie

1. Unit-Test: normaler Retry wird für `provider_execution_uncertain` ausgeblendet.
2. Präsentationstest: separate Wiederherstellungsaktion erscheint nur bei serverseitig bestätigter offener Reservierung.
3. Repositorytest: gültiger Zustand verschiebt die Reservierung, korrigiert Kosten und reiht exakt denselben Job ein.
4. Repositorytests: fehlende, mehrere oder widersprüchliche Reservierungen sowie erreichtes Adminlimit verändern nichts.
5. Controllertest: CSRF-geschützte Aktion ruft das Repository mit Job- und Administrator-ID auf und behandelt veraltete Zustände fail-closed.
6. View-Test: Kostenwarnung und neuer Button werden gerendert; der normale Retrybutton fehlt.
7. Pipeline-Test: sichere Diagnosedaten werden gespeichert, sensible Daten werden nicht übernommen.
8. PostgreSQL-Integrationstest: atomare Wiederherstellung des realen JSONB-Reservierungsformats.
9. Vollständiger Testlauf und Produktionsbuild vor Bereitstellung.

## Wiederherstellung von Job #1

Nach Bereitstellung wird Job #1 erneut schreibgeschützt geprüft. Anschließend wird genau die neue bestätigte Wiederherstellungsaktion ausgeführt. Der Worker wird bis zu einem eindeutigen Endzustand beobachtet. Erfolgsbedingung ist ein neuer, unveröffentlichter Blogentwurf mit `workflow_status = 'needs_review'`; es findet keine Veröffentlichung statt.
