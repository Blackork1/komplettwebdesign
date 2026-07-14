# Live-Status für die Fehlerbehebung im Entwurfseditor

## Ziel

Wenn im Entwurfseditor eine automatische Fehlerbehebung gestartet wird, muss der aktuelle Zustand direkt im Entwurf sichtbar sein. Mehrfaches Einreihen derselben Optimierung wird sowohl in der Oberfläche als auch serverseitig verhindert. Der Artikel bleibt während des gesamten Ablaufs unveröffentlicht.

## Zustände und Bedienung

Der Entwurfseditor zeigt oberhalb der konkreten Prüfstellen eine Statusbox mit einem der folgenden Zustände:

- **Bereit:** Es läuft keine Fehlerbehebung für die aktuelle Reviewversion. Die passenden Optimierungsaktionen sind verfügbar.
- **Eingeplant:** Der Auftrag wartet auf den Worker. Alle Optimierungsbuttons werden ausgeblendet oder deaktiviert.
- **In Bearbeitung:** Der Worker bearbeitet den Auftrag. Die Statusbox zeigt den Fortschritt und sperrt weitere Optimierungen.
- **Erfolgreich abgeschlossen:** Die Statusbox bestätigt den Abschluss und bietet „Aktualisierten Entwurf laden“ an.
- **Fehlgeschlagen oder manuelle Prüfung nötig:** Die Statusbox erklärt, dass keine weitere parallele Optimierung gestartet werden kann, und verlinkt gezielt zu „Jobs & Protokolle“.

Beim Absenden einer Optimierung deaktiviert JavaScript sofort alle zugehörigen Buttons. Damit erhält der Admin bereits vor der Serverantwort eine sichtbare Rückmeldung und kann nicht versehentlich doppelt klicken.

## Live-Aktualisierung ohne Datenverlust

Während ein Auftrag eingeplant ist oder läuft, fragt der Browser einen geschützten, nur für Administratoren erreichbaren Statusendpunkt in kurzen Abständen ab. Die Abfrage liefert ausschließlich die für die Anzeige benötigten, bereinigten Jobdaten.

Die Seite wird nach dem Abschluss nicht automatisch neu geladen. Dadurch gehen parallel vorgenommene, noch nicht gespeicherte Änderungen im Entwurfsformular nicht verloren. Stattdessen erscheint die Aktion „Aktualisierten Entwurf laden“. Erst diese bewusste Aktion lädt den vom Worker aktualisierten Artikel und seine neue Reviewversion.

## Serverseitiger Schutz

Die Oberfläche ist nicht die einzige Sperre. Für einen Artikel und eine Reviewversion wird eine deterministische Idempotenz-ID verwendet. Dadurch führt auch ein doppelter Request, ein zweiter Browser-Tab oder deaktiviertes JavaScript nicht zu zwei kostenpflichtigen Optimierungsaufträgen.

Vor dem Einreihen prüft der Server weiterhin:

- ob der Entwurf existiert und unveröffentlicht ist,
- ob die übermittelte Reviewversion aktuell ist,
- ob optimierbare Prüfhinweise vorhanden sind,
- ob der Content-Agent aktiviert ist,
- ob für diese Reviewversion bereits ein entsprechender Auftrag existiert.

Ein bereits vorhandener Auftrag wird als bestehender Zustand zurückgegeben und nicht erneut erzeugt.

## Datenfluss

1. Der Admin klickt auf eine einzelne oder gemeinsame Fehlerbehebung.
2. Alle Optimierungsaktionen werden sofort in der Oberfläche gesperrt.
3. Der Controller reiht den Auftrag idempotent ein und leitet zum Entwurfseditor zurück.
4. Der Entwurfseditor lädt den jüngsten passenden Optimierungsstatus aus PostgreSQL.
5. Solange der Auftrag aktiv ist, aktualisiert der Browser nur die Statusbox.
6. Nach Erfolg bietet die Statusbox das bewusste Neuladen des Entwurfs an.
7. Nach Fehler oder manueller Prüfung führt ein Link zu den ausführlichen Jobprotokollen.

## Sicherheits- und Datenschutzgrenzen

- Der Statusendpunkt verwendet dieselbe Admin-Authentifizierung wie der Entwurfseditor.
- Es werden weder vollständige Providerantworten noch Prompts, Schlüssel oder interne Payloads ausgegeben.
- Fehlertexte werden über die bestehende Fehlerbereinigung dargestellt.
- Schreibende Aktionen bleiben CSRF-geschützt; die reine Statusabfrage verändert keine Daten.
- Der Optimierungsstatus kann keine Veröffentlichung auslösen.

## Fehlerbehandlung

Ist der Statusendpunkt vorübergehend nicht erreichbar, bleibt die letzte bekannte Anzeige erhalten. Die Oberfläche weist auf die unterbrochene Statusaktualisierung hin und bietet ein manuelles erneutes Prüfen an. Sie entsperrt Optimierungsbuttons nicht allein aufgrund eines Netzwerkfehlers.

Fehlgeschlagene oder manuell zu prüfende Aufträge werden nicht durch einen neuen Auftrag derselben Reviewversion ersetzt. Ihre kontrollierte Wiederaufnahme bleibt im Bereich „Jobs & Protokolle“.

## Tests

Die Umsetzung erhält automatisierte Tests für:

- deterministische Idempotenz bei wiederholten Optimierungsrequests,
- Statusermittlung für eingeplante, laufende, erfolgreiche und fehlgeschlagene Jobs,
- Adminschutz und bereinigte Antwort des Statusendpunkts,
- sichtbare Statusbox im Entwurfseditor,
- ausgeblendete oder deaktivierte Optimierungsbuttons bei aktiven beziehungsweise blockierten Jobs,
- sofortige clientseitige Deaktivierung nach dem Absenden,
- Live-Aktualisierung ohne automatisches Neuladen oder Verlust von Formulardaten,
- Weiterleitung zum aktualisierten Entwurf nach erfolgreichem Abschluss.

## Nicht Bestandteil

- automatische Veröffentlichung,
- parallele Optimierung mehrerer Prüfhinweise derselben Reviewversion,
- Anzeige vollständiger OpenAI- oder Workerprotokolle im Entwurfseditor,
- automatisches Überschreiben ungespeicherter manueller Entwurfsänderungen.
