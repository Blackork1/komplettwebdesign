# Task 5: Admin-Prüfmail und belastbare Retryfolge

## Ergebnis

Die Admin-Prüfmail wird über den bestehenden Nodemailer-Transport und das vorhandene Brandtemplate versendet. Die Zustellung wird transaktional gesperrt, vor dem SMTP-Aufruf auf `sending` und erst nach bestätigtem Versand auf `sent` gesetzt. Bereits versendete Zustellungen werden ohne weiteren SMTP-Aufruf als abgeschlossen behandelt.

SMTP-Fehler verwenden abhängig vom Zustellversuch exakt diese Verzögerungen:

- 1. Fehler: 5 Minuten
- 2. Fehler: 15 Minuten
- 3. Fehler: 1 Stunde
- 4. Fehler: 4 Stunden
- 5. Fehler: 12 Stunden und Zustellstatus `failed`

Die ersten vier Fehler setzen die Zustellung wieder auf `queued`. Jeder SMTP-Fehler trägt ein explizites `retryAt`, das der Worker an das lease-gefencete Job-Repository weitergibt. Der bereits mit fünf Maximalversuchen angelegte Admin-Mailjob wird dadurch nach dem fünften Fehler ebenfalls terminal.

## RED

Befehl:

```text
node --test tests/contentAgentNotificationService.test.js tests/contentAgentWorker.test.js tests/contentAgentJobRepository.test.js
```

Erwartetes Ergebnis vor der Produktionsimplementierung:

```text
tests 83
pass 73
fail 10
```

Die Fehlschläge betrafen gezielt den noch fehlenden Notification-Service, den fehlenden Mailhandler, das nicht weitergereichte `retryAt`, die fehlende Repository-Unterstützung und den noch nicht registrierten Worker-Jobtyp.

## GREEN

Fokussierter Befehl:

```text
node --test tests/contentAgentNotificationService.test.js tests/contentAgentWorker.test.js tests/contentAgentJobRepository.test.js
```

Ergebnis:

```text
tests 83
pass 83
fail 0
```

Vollständige Suite mit lokal gesetztem, nicht produktivem Testwert für die von einem bestehenden Sicherheitstest verlangte Umgebungsvariable:

```text
OPENAI_API_KEY=test-key npm test
```

Ergebnis:

```text
tests 980
pass 979
fail 0
skipped 1
```

Ohne `OPENAI_API_KEY` scheitert ausschließlich der bestehende Test `industry imports reject unknown SQL identifier keys` bereits beim Import von `util/openai.js`; dieser umgebungsbedingte Fehlschlag steht nicht mit Task 5 in Verbindung.

## Selbstprüfung

- [x] `ADMIN_NOTIFICATION_RETRY_DELAYS_MS` enthält exakt 5m/15m/1h/4h/12h.
- [x] HTML-Felder werden maskiert; unsichere Bild- und Editor-URLs werden verworfen.
- [x] Die Bildvorschau akzeptiert ausschließlich HTTPS ohne URL-Zugangsdaten.
- [x] Die Admin-URL wird aus dem kanonischen HTTPS-Origin und der Post-ID neu aufgebaut; Query, Fragment, Session und Token gelangen nicht in die Maildaten.
- [x] Der Versand verwendet den bestehenden Nodemailer-Transport und `renderBrandEmail()`.
- [x] Die Zustellung wird mit `FOR UPDATE` gesperrt und nur nach bestätigtem SMTP-Ergebnis auf `sent` gesetzt.
- [x] Bereits `sent` führt niemals zu einem zweiten SMTP-Aufruf.
- [x] SMTP-Fehler verändern keine Postzeile und speichern nur einen begrenzten Fehlercode in der Zustellung.
- [x] Der fünfte SMTP-Fehler setzt die Zustellung auf `failed`.
- [x] Explizites `retryAt` wird nur als gültiges `Date` verwendet; andernfalls bleibt der bestehende Backoff aktiv.
- [x] Alle Jobupdates behalten den bestehenden Lease-Fence aus ID, Worker-ID, Versuch und Status.
- [x] Der Admin-Mailjob startet weder Generierungs-, Veröffentlichungs- noch Newsletterlogik.
- [x] Der Diff enthält ausschließlich die acht Taskdateien und diesen Bericht.
- [x] `git diff --check` meldet keine Formatierungsfehler.

---

## Reviewfix: transaktionsfreier SMTP-Versand und sechs Zustellversuche

Dieser Abschnitt ersetzt die oben beschriebenen Aussagen zur offenen SMTP-Transaktion und zur früheren Grenze von fünf Gesamtversuchen.

### Behobene Reviewfindings

- Der Delivery-Claim setzt `sending`, `locked_at`, `locked_by` und den erhöhten Versuch in einer kurzen Transaktion. Der Commit erfolgt nachweislich vor dem SMTP-Aufruf.
- Ein bestätigter SMTP-Versand wird in einer neuen Transaktion als `sent` gespeichert.
- Eine bei einem späteren Joblauf noch als `sending` gefundene Zustellung wird ohne SMTP-Aufruf als `failed` mit `outcome_uncertain` markiert. Damit kann ein Crash nach SMTP oder ein unklares `sent`-Commit keine automatische Doppelmail erzeugen.
- `next_attempt_at` wird vor jedem Versand anhand der serverseitig gelesenen Datenbankzeit geprüft und zusätzlich im Claim-SQL mit `next_attempt_at <= NOW()` gefenct. Ein zu früher Lauf verändert weder Zustellstatus noch Versuchszähler und gibt den unveränderten Zeitpunkt als `retryAt` an den Worker zurück.
- Der Admin-Mailjob besitzt sechs Gesamtversuche: initialer Versuch plus fünf echte Wiederholungen. Die Wartezeiten 5 Minuten, 15 Minuten, 1 Stunde, 4 Stunden und 12 Stunden liegen jeweils vor den Versuchen 2 bis 6. Erst ein Fehler im sechsten Versuch wird terminal.
- Migration 004 erlaubt entsprechend `attempts BETWEEN 0 AND 6` und repariert Bestandswerte auf dieselbe Obergrenze.
- HTTPS-Bild-URLs verlieren Query und Fragment, bevor sie in HTML übernommen werden. Dadurch gelangen weder Token noch Sessionparameter aus einer Bild-URL in die Mail.
- Der Betreff lautet `Neuer Blogartikel zur Prüfung: <Titel>`. Der Mailtext stellt ausdrücklich klar, dass der Artikel noch nicht öffentlich ist.

### RED

Nach Ergänzung der Regressionstests, vor jeder Änderung am Produktionscode:

```text
node --test tests/contentAgentNotificationService.test.js tests/contentAgentWorker.test.js tests/contentAgentJobRepository.test.js tests/contentAgentDraftPipeline.test.js tests/contentAgentScheduledMigration.test.js
```

Ergebnis:

```text
tests 170
pass 162
fail 8
```

Die acht erwarteten Fehlschläge belegten jeweils die alten Verträge:

- Task-4-Jobanlage und Draftpipeline verwendeten `maxAttempts = 5` statt 6.
- Migration 004 erlaubte nur Zustellversuche 0 bis 5.
- Betreff und Klarstellung entsprachen noch nicht dem Reviewvertrag; die Bild-URL behielt Queryparameter.
- Der fünfte SMTP-Fehler terminalisierte die Zustellung bereits.
- Ein zukünftiges `next_attempt_at` verhinderte den SMTP-Aufruf nicht.
- SMTP lief noch vor dem Claim-Commit; deshalb ließ sich ein unklares zweites Commit nicht als `sending` wiederfinden.
- Der Erfolgsweg verwendete keine separate Transaktion für `sent`.

Für den anschließend explizit geprüften `markSent`-Fehler wurde ein eigener Test zuerst rot ausgeführt:

```text
node --test --test-name-pattern='verlorenes markSent' tests/contentAgentNotificationService.test.js
```

Ergebnis vor der Reconciliation-Implementierung:

```text
tests 1
pass 0
fail 1
```

Der Fehler war permanent, ließ die Delivery aber noch als `sending` zurück. Die GREEN-Implementierung gleicht nach einem `markSent`- oder Commitfehler den Zustand in einer neuen Transaktion ab: Bereits `sent` gilt als abgeschlossen; weiterhin `sending` wird sofort `failed/outcome_uncertain` und liefert immer `retryable = false`.

### GREEN – fokussierter Reviewfix

```text
node --test tests/contentAgentNotificationService.test.js tests/contentAgentWorker.test.js tests/contentAgentJobRepository.test.js tests/contentAgentDraftPipeline.test.js tests/contentAgentScheduledMigration.test.js
```

Ergebnis:

```text
tests 172
pass 172
fail 0
```

### GREEN – Task 1, 4 und 5

```text
OPENAI_API_KEY=test-key node --test tests/contentAgentScheduledMigration.test.js tests/contentAgentMigration.test.js tests/contentAgentPostgresIntegration.test.js tests/contentAgentDraftPipeline.test.js tests/blogContentFormat.test.js tests/contentAgentNotificationRepository.test.js tests/contentAgentNotificationService.test.js tests/contentAgentWorker.test.js tests/contentAgentJobRepository.test.js
```

Ergebnis:

```text
tests 189
pass 188
fail 0
skipped 1
```

Der übersprungene Test ist die bestehende, absichtlich geschützte PostgreSQL-Integration; es war keine PostgreSQL-Testdatenbank konfiguriert.

### GREEN – vollständige Content-Agent-Suite

```text
OPENAI_API_KEY=test-key node --test tests/contentAgent*.test.js
```

Ergebnis:

```text
tests 416
pass 415
fail 0
skipped 1
```

Auch hier ist ausschließlich die geschützte PostgreSQL-Integration übersprungen.

### Reviewfix-Selbstprüfung

- [x] Kein SMTP-Aufruf findet innerhalb einer offenen Datenbanktransaktion statt.
- [x] `sending` wird vor SMTP committed und mit einer eindeutigen Delivery-Sperre gefenct.
- [x] `sent` wird nach SMTP in einer neuen Transaktion gespeichert.
- [x] Ein unklares `sent`-Commit wird sofort abgeglichen; ein nach hartem Prozesscrash verbliebenes `sending` wird beim nächsten Lauf ohne SMTP als `outcome_uncertain`/`failed` terminalisiert.
- [x] Ein `markSent`-Fehler wird sofort abgeglichen und führt niemals zu einem retrybaren Workerfehler.
- [x] Ein zu früher Lauf behält `next_attempt_at`, erhöht `attempts` nicht und sendet nicht.
- [x] Fünf Retryabstände führen zu sechs möglichen echten SMTP-Aufrufen; erst Fehler 6 ist terminal.
- [x] Bild-Query und -Fragment werden entfernt; Admin-URL, Query, Fragment, Session und Token gelangen nicht in die Maildaten.
- [x] Betreff und Nichtöffentlichkeits-Hinweis entsprechen dem Reviewwortlaut.
- [x] `git diff --check` meldet keine Formatierungsfehler.
