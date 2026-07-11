# Task 10 – Lock-Fix für Draft-Regeneration

## Ergebnis

Die Text- und Bildregeneration verwenden jetzt dieselbe Sperrreihenfolge wie manuelle Veröffentlichung und Admin-Drafteditor. Der Fix bleibt auf Task 10 begrenzt; insbesondere wurden weder Auto-Publish-Regeln aus Task 11 noch die bestehende Bild-CAS-/Retry-Semantik verändert.

## Einheitliche Sperrreihenfolge

Beide Transaktionspfade in `draftRegenerationService` führen unmittelbar nach `BEGIN` `LOCK TABLE posts IN SHARE ROW EXCLUSIVE MODE` aus. Erst danach folgen Eignungsprüfung und `SELECT ... FOR UPDATE`.

Damit gilt für alle eigenen Task-10-Pfade dieselbe Reihenfolge:

1. Transaktion beginnen.
2. `posts` mit `SHARE ROW EXCLUSIVE` sperren.
3. betroffene Post-Zeile mit `FOR UPDATE` sperren und ihre Eignung prüfen.
4. Änderung beziehungsweise Veröffentlichung ausführen.

Die Abfrage-Reihenfolge wird für Text- und Bildregeneration durch gezielte Unit-Tests exakt abgesichert. Die Prüfung aller eigenen Featurepfade ergab keine weitere Stelle, die eine Post-Zeilensperre vor dem Tabellenlock erwirbt. `adminDraftService` und die Publikation hatten bereits die gewünschte Reihenfolge.

## Bild-CAS und Retry

Die bestehende NULL-sichere Compare-and-swap-Prüfung für `hero_public_id`, die Rückgabe konkurrierender Bildzustände und der darauf aufbauende Retry-Ablauf blieben unverändert. Die vorhandenen CAS-Tests sind weiterhin grün.

## Echte PostgreSQL-Konkurrenztests

Der opt-in PostgreSQL-Test führt zusätzlich zwei reale Parallelfälle aus:

- manuelle Veröffentlichung gegen Textregeneration,
- manuelle Veröffentlichung gegen Bildregeneration.

Die Operationen besitzen ein begrenztes Zeitfenster. Der Test weist PostgreSQL-Deadlocks (`40P01`), Lock-Timeouts (`55P03`) und abgebrochene Statements (`57014`) ausdrücklich aus und verlangt in beiden Fällen eine erfolgreiche Veröffentlichung. Der Pool besitzt zusätzlich `statement_timeout` und `query_timeout`, damit ein Sperrproblem nicht unbegrenzt hängen bleibt.

In der aktuellen Umgebung war keine freigegebene Reset-Testdatenbank vorhanden. Der echte PostgreSQL-Test wurde deshalb sicher übersprungen; alle nicht destruktiven Abdeckungen liefen vollständig.

## Destruktiver Testschutz

Vor jeder Verbindung und vor jedem `DROP TABLE` müssen alle folgenden Bedingungen erfüllt sein:

- `CONTENT_AGENT_PG_TEST_URL` enthält eine gültige PostgreSQL-URL.
- `CONTENT_AGENT_PG_TEST_ALLOW_RESET=true` erteilt die ausdrückliche Reset-Freigabe.
- Der tatsächliche Datenbankname enthält `test` oder `testing` als abgegrenzten Namensteil, oder `CONTENT_AGENT_PG_TEST_DATABASE_MARKER` ist gesetzt und kommt im Datenbanknamen vor.

Fehlt eine Bedingung, wird der Test mit einem sicheren Grund übersprungen. Produktionsähnliche Namen wie `production` oder `contest` bestehen die Standardprüfung nicht. Der Guard gibt weder URL noch Zugangsdaten in seiner Begründung aus. Die Deployment-Anleitung dokumentiert diese dreifache Sperre und verbietet die Produktionsdatenbank ausdrücklich.

## TDD und Verifikation

- RED: Die beiden Reihenfolgetests schlugen ohne Tabellenlock erwartungsgemäß fehl; der Guard-Test schlug vor der Implementierung wegen des fehlenden Helper-Moduls fehl.
- Fokussierte Suite: 42 bestanden, 0 fehlgeschlagen, 1 PostgreSQL-Opt-in-Test sicher übersprungen.
- Gesamtsuite mit Testschlüssel: 856 bestanden, 0 fehlgeschlagen, 1 PostgreSQL-Opt-in-Test sicher übersprungen.
- Build: erfolgreich; 41 CSS-Quelldateien, Manifest unverändert.
- Dry-Run: erfolgreich; `externalCalls=0`, `articleValid=true`, `qualityScore=90`, `publishMode=draft`.
- Keine Live-Daten und keine externen Provider wurden verwendet.
