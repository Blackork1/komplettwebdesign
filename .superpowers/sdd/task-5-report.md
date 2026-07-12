# Task 5: Admin-Prüfmail und belastbare Retryfolge

## Ergebnis

Die Admin-Prüfmail wird außerhalb offener Datenbanktransaktionen versendet. Der Delivery-Claim wird vorher als `sending` mit Sperrkennung committed; ein bestätigter Versand wird anschließend in einer neuen Transaktion als `sent` gespeichert. Unklare Versandausgänge werden ohne automatischen SMTP-Retry als `failed/outcome_uncertain` markiert.

Die Zustellung besitzt sechs echte SMTP-Versuche. Nach den ersten fünf Fehlern gelten nacheinander 5 Minuten, 15 Minuten, 1 Stunde, 4 Stunden und 12 Stunden Wartezeit; erst ein Fehler im sechsten SMTP-Versuch ist terminal. `content_notification_deliveries.attempts` ist dafür die alleinige SMTP-Grenze.

Ein vorzeitiger Jobclaim wegen eines zukünftigen `next_attempt_at` verbraucht keinen Jobversuch: `NOT_DUE` wird ausdrücklich markiert und lease-sicher auf denselben `retryAt` verschoben, während genau der gerade durch den Claim erhöhte Jobversuch zurückgenommen wird. Offene Bestandsjobs und idempotent erneut angelegte Admin-Mailjobs werden auf mindestens sechs `max_attempts` angehoben.

Mailbetreff, Nichtöffentlichkeits-Hinweis sowie die Bereinigung von Query und Fragment aus HTTPS-Bild-URLs entsprechen dem finalen Reviewvertrag.

---

## Reviewfix: transaktionsfreier SMTP-Versand und sechs Zustellversuche

Dieser Abschnitt dokumentiert den ersten Reviewfix zur SMTP-Transaktion und zur Grenze von sechs Gesamtversuchen.

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

---

## Zweites Reviewfix: versuchsneutrales NOT_DUE und Bestandsjobs

### Behobene Reviewfindings

- `CONTENT_ADMIN_NOTIFICATION_NOT_DUE` trägt jetzt zusätzlich `doesNotConsumeAttempt = true`.
- Nur die Kombination aus exakt diesem Fehlercode und dem ausdrücklichen Flag verwendet den versuchsneutralen Workerpfad. Andere retrybare Fehler bleiben auch bei einem gleichnamigen Flag im generischen Retry.
- `rescheduleJobWithoutAttemptConsumption()` setzt den gefencten laufenden Job auf `queued`, übernimmt `retryAt` als `run_after`, reduziert `attempts` exakt um den gerade verbrauchten Claim und räumt Locks sowie `finished_at` auf.
- Der Compare-and-Set-Fence enthält Job-ID, Worker-ID, den exakten Claimversuch, `status = 'running'` und `attempts > 0`; dadurch sind veraltete Claims und ein Unterlauf ausgeschlossen.
- Nach einem Crash zwischen Delivery-Retry-Commit und Worker-Retry wird ein vorzeitiger Claim versuchsneutral zurückgegeben. Bei Fälligkeit steht deshalb Jobclaim 6 weiterhin für Delivery-/SMTP-Versuch 6 zur Verfügung.
- Der idempotente Enqueue-Konflikt hebt vorhandene Admin-Mailjobs auf mindestens sechs `max_attempts`, ohne andere Jobtypen zu verändern.
- Migration 004 hebt bestehende offene Admin-Mailjobs in `queued` oder `running` mit weniger als sechs Maximalversuchen auf sechs an.
- Der alte, widersprüchliche Ergebnisabschnitt wurde durch die aktuelle Gesamtbeschreibung ersetzt.

### RED

Vor den Produktionsänderungen:

```text
node --test tests/contentAgentNotificationService.test.js tests/contentAgentWorker.test.js tests/contentAgentJobRepository.test.js tests/contentAgentScheduledMigration.test.js
```

Ergebnis:

```text
tests 95
pass 89
fail 6
```

Die sechs erwarteten Fehlschläge betrafen das fehlende NOT_DUE-Flag, die fehlende Workerroute, die fehlende gefencte Repositorymethode, den verbrauchten sechsten Jobclaim im Recovery-Ablauf, das fehlende Enqueue-Konflikt-Upgrade und den fehlenden Migrations-Backfill.

Die anschließende Eingrenzung auf den exakten NOT_DUE-Code wurde ebenfalls zuerst rot ausgeführt:

```text
node --test --test-name-pattern='nur explizites NOT_DUE' tests/contentAgentWorker.test.js
```

Ergebnis:

```text
tests 1
pass 0
fail 1
```

### GREEN – fokussierter Reviewfix

```text
node --test tests/contentAgentNotificationService.test.js tests/contentAgentWorker.test.js tests/contentAgentJobRepository.test.js tests/contentAgentScheduledMigration.test.js
```

Ergebnis:

```text
tests 96
pass 96
fail 0
```

### GREEN – Task 1, 4 und 5

```text
OPENAI_API_KEY=test-key node --test tests/contentAgentScheduledMigration.test.js tests/contentAgentMigration.test.js tests/contentAgentPostgresIntegration.test.js tests/contentAgentDraftPipeline.test.js tests/blogContentFormat.test.js tests/contentAgentNotificationRepository.test.js tests/contentAgentNotificationService.test.js tests/contentAgentWorker.test.js tests/contentAgentJobRepository.test.js
```

Ergebnis:

```text
tests 194
pass 193
fail 0
skipped 1
```

### GREEN – vollständige Content-Agent-Suite

```text
OPENAI_API_KEY=test-key node --test tests/contentAgent*.test.js
```

Ergebnis:

```text
tests 421
pass 420
fail 0
skipped 1
```

Der einzige Skip in beiden breiten Läufen ist die geschützte PostgreSQL-Integration, weil keine PostgreSQL-Testdatenbank konfiguriert war.

### Controller-Abschluss nach Agentenlimit

Der Fixagent erreichte sein Nutzungslimit unmittelbar vor dem Commit. Die frische Controller-Verifikation deckte dabei noch einen roten SQL-Vertragstest auf: Beim Idempotenzkonflikt prüfte das Update nur `EXCLUDED.job_type`, nicht den bereits gespeicherten `content_jobs.job_type`. Dadurch hätte ein kollidierender neuer Mailjob das Versuchslimit eines vorhandenen anderen Jobtyps anheben können.

Die bestehende rote Assertion verlangte bereits beide Typprüfungen. Der Produktionscode wurde minimal auf folgende Bedingung ergänzt:

```text
content_jobs.job_type = 'send_admin_review_notification'
AND EXCLUDED.job_type = 'send_admin_review_notification'
```

Danach wurden frisch ausgeführt:

```text
OPENAI_API_KEY=test-key node --test tests/contentAgentNotificationService.test.js tests/contentAgentWorker.test.js tests/contentAgentJobRepository.test.js tests/contentAgentScheduledMigration.test.js
96 bestanden, 0 fehlgeschlagen

OPENAI_API_KEY=test-key node --test tests/contentAgent*.test.js
420 bestanden, 0 fehlgeschlagen, 1 PostgreSQL-Skip
```

`git diff --check` blieb sauber.

---

## Finaler Reviewfix: sichere SMTP-Klassifikation, crashfeste Recovery und Datenbankzeit

### Behobene Findings

- SMTP-Fehler werden nun durch `classifySmtpFailure()` rein und deterministisch klassifiziert. Explizite 4xx-Ablehnungen, `ECONNREFUSED`, `EDNS` und `ETIMEDOUT` bei `command = CONN` sind sicher retrybar. Ein Timeout während `DATA` sowie Verbindungsverluste ohne sicheren Prä-Annahme-Nachweis enden dagegen sofort als `failed/outcome_uncertain` mit `retryable = false`.
- Permanente 5xx-Ablehnungen werden unabhängig vom Versuchszähler sofort als `failed/smtp_rejected` terminalisiert und liefern `CONTENT_ADMIN_NOTIFICATION_SMTP_REJECTED` mit `retryable = false`.
- Retryabstände werden mit `NOW() + ($2 * INTERVAL '1 millisecond')` in der Datenbank berechnet. Der Service übernimmt ausschließlich das gespeicherte `RETURNING next_attempt_at`; eine abweichende Worker-Uhr beeinflusst den persistierten Abstand nicht mehr.
- `recoverExpiredJobs()` sperrt die abgelaufenen Jobzeilen in einer CTE und verknüpft Admin-Mailjobs über `payload_json.deliveryId` mit ihrer Delivery. Bei einer `queued` Delivery wird der durch den Claim verbrauchte Versuch mit `GREATEST(attempts - 1, 0)` zurückgegeben und `run_after` auf mindestens `delivery.next_attempt_at` gesetzt. Bei `sending` wird der Versuch ebenfalls zurückgegeben und der Job sofort erneut fällig, damit der Handler die Delivery genau einmal ohne weiteren SMTP-Aufruf als `outcome_uncertain` terminalisiert.
- Der Delivery-Join vergleicht `delivery.id::text` mit dem JSON-Wert und castet niemals fremde Payloaddaten. Nichtnumerische oder übergroße Werte können deshalb keinen Castfehler verursachen und die Recovery anderer Jobs nicht abbrechen.
- Für alle anderen Jobtypen bleibt die bisherige Entscheidung `attempts < max_attempts` unverändert. Locks und `finished_at` werden auf den Recoverypfaden weiterhin atomar bereinigt.

### RED

Nach Ergänzung der reinen SMTP-Klassifikationstests, der Serviceintegration für `DATA`-Timeout, 5xx-Ablehnung und Datenbankzeit sowie der beiden Recoveryverträge:

```text
node --test tests/contentAgentNotificationService.test.js tests/contentAgentJobRepository.test.js
```

Ergebnis vor den Produktionsänderungen:

```text
tests 42
pass 36
fail 6
```

Die sechs erwarteten Fehler belegten die fehlende reine Klassifikation, die fälschlich retrybaren unklaren beziehungsweise permanent abgelehnten SMTP-Ausgänge, die aus der Worker-Uhr berechnete Retryzeit sowie die beiden nicht deliverybewussten Recoveryfälle `running attempt 6/max 6 + queued future Delivery` und `running attempt 6/max 6 + sending Delivery`.

Der Join gegen potenziell ungültige Delivery-IDs erhielt danach einen eigenen RED/GREEN-Vertrag:

```text
node --test --test-name-pattern='künftig fällige queued Delivery' tests/contentAgentJobRepository.test.js

RED: tests 1, pass 0, fail 1
GREEN: tests 1, pass 1, fail 0
```

Der RED-Lauf beanstandete den möglichen `::bigint`-Cast der JSON-Payload; GREEN vergleicht die sicher typisierte Delivery-ID als Text und enthält keinen Payloadcast mehr.

### GREEN – isolierte Findings

```text
node --test tests/contentAgentNotificationService.test.js
tests 14
pass 14
fail 0

node --test tests/contentAgentJobRepository.test.js
tests 28
pass 28
fail 0
```

### GREEN – Task 1, 4 und 5

```text
OPENAI_API_KEY=test-key node --test tests/contentAgentScheduledMigration.test.js tests/contentAgentMigration.test.js tests/contentAgentPostgresIntegration.test.js tests/contentAgentDraftPipeline.test.js tests/blogContentFormat.test.js tests/contentAgentNotificationRepository.test.js tests/contentAgentNotificationService.test.js tests/contentAgentWorker.test.js tests/contentAgentJobRepository.test.js
```

Ergebnis:

```text
tests 200
pass 199
fail 0
skipped 1
```

### GREEN – vollständige Content-Agent-Suite

```text
OPENAI_API_KEY=test-key node --test tests/contentAgent*.test.js
```

Ergebnis:

```text
tests 427
pass 426
fail 0
skipped 1
```

Der einzige Skip ist weiterhin die absichtlich geschützte PostgreSQL-Integration, weil keine PostgreSQL-Testdatenbank konfiguriert war.
