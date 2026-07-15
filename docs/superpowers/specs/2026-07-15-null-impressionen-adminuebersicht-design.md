# Adminübersicht für Artikel ohne Impressionen

**Datum:** 15. Juli 2026  
**Status:** Vom Nutzer abschnittsweise freigegeben  
**Geltungsbereich:** Content-Agent → Bestehende Inhalte

## 1. Ziel

Die Bestandsübersicht soll Artikel mit tatsächlicher Google-Sichtbarkeit priorisieren. Veröffentlichte Blogartikel, die innerhalb eines vollständig ausgewerteten 28-Tage-Zeitraums keine Impressionen erhalten haben, werden in einem eigenen Bereich gebündelt. Administratoren können diese Artikel einzeln oder gesammelt dauerhaft aus ihrer Arbeitsansicht ausblenden und jederzeit wieder einblenden.

Die Funktion ist ausschließlich eine administrative Darstellungshilfe. Sie verändert weder den Liveartikel noch dessen Veröffentlichung, Indexierung oder Auffindbarkeit.

## 2. Verbindliche Grundsätze

1. Ein Artikel gilt nur dann als Artikel ohne Impressionen, wenn 28 vollständige, synchronisierte Tage vorliegen und die Summe der Impressionen exakt null beträgt.
2. Junge Artikel, fehlende Performance-Snapshots und unvollständige GSC-Zeiträume werden neutral als „Daten werden gesammelt“ behandelt.
3. Artikel mit mindestens einer Impression innerhalb der letzten vollständig ausgewerteten 28 Tage bleiben in der Hauptübersicht.
4. Ein administratives Ausblenden verändert keine öffentlichen Artikeldaten.
5. Der Anzeigestatus wird dauerhaft in PostgreSQL gespeichert und gilt für die gemeinsame Adminarbeitsansicht, nicht nur für einen einzelnen Browser.
6. Alle Schreibaktionen sind admin- und CSRF-geschützt.
7. Einzel- und Sammelaktionen werden serverseitig gegen aktuelle Performance-Daten geprüft. Der Browser darf die Gruppenzugehörigkeit nicht vorgeben.

## 3. Nichtziele

Diese Funktion:

- veröffentlicht oder depubliziert keine Artikel,
- setzt kein `noindex`,
- ändert keine Sitemap-, Canonical- oder Slug-Daten,
- löscht keine Artikel,
- startet keine automatische KI-Optimierung,
- bewertet fehlende Impressionen nicht automatisch als Qualitätsmangel,
- verändert keine GSC-, Audit-, Revisions- oder Lernkurvendaten.

## 4. Datenbasis und Klassifizierung

Für jeden veröffentlichten Blogartikel wird der neueste Datensatz aus `content_article_performance_snapshots` verwendet. Maßgeblich ist das darin gespeicherte 28-Tage-Fenster.

Ein 28-Tage-Fenster gilt als vollständig, wenn:

- ein Performance-Snapshot vorhanden ist,
- `evaluated_through_date` vorhanden ist,
- `article_age_days` mindestens 28 beträgt,
- das 28-Tage-Fenster eine `coverageDayCount` von mindestens 28 ausweist.

Die Gruppen werden in dieser Reihenfolge bestimmt:

### 4.1 Artikel mit Sichtbarkeit

Das 28-Tage-Fenster ist vollständig und enthält mindestens eine Impression.

### 4.2 Daten werden gesammelt

Mindestens eine Voraussetzung für ein vollständiges 28-Tage-Fenster fehlt. Dazu gehören insbesondere:

- kein Performance-Snapshot,
- Artikel jünger als 28 Tage,
- weniger als 28 synchronisierte Tage,
- kein auswertbarer 28-Tage-Metrikblock.

Diese Artikel werden niemals allein aufgrund eines impliziten oder fehlenden Nullwerts als erfolglos eingeordnet.

### 4.3 0 Impressionen in 28 Tagen

Das 28-Tage-Fenster ist vollständig und enthält exakt null Impressionen. Es besteht keine gespeicherte aktive Ausblendpräferenz.

### 4.4 Ausgeblendete Artikel

Das 28-Tage-Fenster ist vollständig, enthält exakt null Impressionen und für den Artikel ist die administrative Ausblendpräferenz aktiv.

Die Ausblendpräferenz wird nur innerhalb der Null-Impressions-Klassifizierung berücksichtigt. Erhält ein ausgeblendeter Artikel später mindestens eine Impression, erscheint er automatisch wieder unter „Artikel mit Sichtbarkeit“. Fällt er in einem späteren vollständigen 28-Tage-Zeitraum erneut auf null Impressionen zurück, wird die weiterhin gespeicherte Präferenz wieder angewendet.

## 5. Datenmodell

Migration `014_create_existing_content_admin_preferences.sql` erstellt additiv:

```text
content_existing_post_admin_preferences
- post_id                         BIGINT PRIMARY KEY
- hidden_from_zero_impression_list BOOLEAN NOT NULL DEFAULT FALSE
- created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
- updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

`post_id` verweist mit `ON DELETE CASCADE` auf `posts(id)`. Die Tabelle enthält keine öffentlichen Artikelattribute. Ohne Datensatz beziehungsweise bei `FALSE` gilt ein Artikel als nicht ausgeblendet.

Ein Upsert setzt den Status idempotent. Wiederholtes Ausblenden oder Einblenden erzeugt keine doppelten Datensätze und keinen Fehler.

## 6. Repository- und Servicegrenzen

### 6.1 Repository

Das Admin-Repository lädt zusammen mit jedem veröffentlichten Artikel:

- den neuesten Performance-Snapshot,
- den administrativen Ausblendstatus,
- die bereits vorhandenen Audit-, Revisions-, Optimierungs- und Outcome-Daten.

Schreibmethoden übernehmen keine vom Client berechnete Gruppenzugehörigkeit. Vor einem Ausblenden prüfen sie innerhalb der Datenbanktransaktion erneut:

- Artikel ist veröffentlicht,
- neuester Snapshot ist vorhanden,
- 28-Tage-Abdeckung ist vollständig,
- Impressionen sind weiterhin exakt null.

Sammelaktionen bestimmen ihre Zielmenge innerhalb derselben Transaktion erneut. Dadurch kann ein zwischenzeitlich aktualisierter Artikel mit Impressionen nicht versehentlich ausgeblendet werden.

### 6.2 Präsentationsservice

Der Präsentationsservice erhält rohe Artikeldaten und erzeugt vier fertige Listen:

```text
visibleArticles
collectingArticles
zeroImpressionArticles
hiddenZeroImpressionArticles
```

Die EJS-Ansicht zeigt diese Gruppen nur an und enthält keine eigene fachliche Performance-Klassifizierung.

### 6.3 Controller

Der Controller verwendet das Post/Redirect/Get-Muster. Nach erfolgreichen Aktionen wird zur Bestandsübersicht zurückgeleitet und eine eindeutige Statusmeldung angezeigt. Bekannte Konflikte werden verständlich erklärt; unerwartete Fehler laufen über die vorhandene zentrale Fehlerbehandlung.

## 7. Adminoberfläche

Die Seite `Bestehende Inhalte` erhält vier Bereiche.

### 7.1 Artikel mit Sichtbarkeit

- standardmäßig geöffnet,
- enthält ausschließlich Artikel mit mindestens einer 28-Tage-Impression,
- behält Performance-, Audit-, Revisions- und Optimierungsaktionen unverändert bei.

### 7.2 Daten werden gesammelt

- standardmäßig eingeklappt,
- zeigt die Anzahl der enthaltenen Artikel,
- erklärt neutral, warum noch keine vollständige 28-Tage-Einordnung möglich ist,
- enthält keine Ausblendaktion.

### 7.3 0 Impressionen in 28 Tagen

- standardmäßig eingeklappt,
- zeigt die Anzahl der enthaltenen Artikel,
- bietet pro Artikel `Ausblenden`,
- bietet oberhalb der Gruppe `Alle Artikel ausblenden`,
- behält alle fachlichen Artikelaktionen bei.

### 7.4 Ausgeblendete Artikel

- standardmäßig eingeklappt,
- zeigt die Anzahl der ausgeblendeten Artikel,
- bietet pro Artikel `Einblenden`,
- bietet oberhalb der Gruppe `Alle Artikel einblenden`,
- bleibt jederzeit zugänglich, damit keine administrative Sackgasse entsteht.

Leere Gruppen erhalten einen verständlichen Leerzustand. Auf kleinen Bildschirmen werden Tabellenzeilen als lesbare Karten beziehungsweise gestapelte Inhaltsblöcke dargestellt; Aktionen bleiben vollständig sichtbar und horizontaler Seitenüberlauf wird vermieden.

## 8. Routen und Aktionen

Neue Routen:

```text
POST /admin/content-agent/existing-content/:id/hide-zero-impressions
POST /admin/content-agent/existing-content/:id/show-zero-impressions
POST /admin/content-agent/existing-content/zero-impressions/hide-all
POST /admin/content-agent/existing-content/zero-impressions/show-all
```

Alle Routen verwenden `isAdmin` und `verifyCsrfToken`.

### 8.1 Einzelnes Ausblenden

Die Aktion ist nur zulässig, wenn der Artikel serverseitig weiterhin zur Gruppe „0 Impressionen in 28 Tagen“ gehört. Andernfalls wird nichts verändert und die Oberfläche meldet, dass die Performance-Daten inzwischen abweichen.

### 8.2 Einzelnes Einblenden

Die Aktion deaktiviert die gespeicherte Präferenz idempotent. Sie verändert keine Performance-Daten.

### 8.3 Alle ausblenden

Die Aktion setzt die Präferenz ausschließlich für aktuell veröffentlichte Artikel mit vollständig ausgewerteten 28 Tagen und exakt null Impressionen. Sammelaktionen vertrauen keiner vom Browser übertragenen Artikelliste.

### 8.4 Alle einblenden

Die Aktion deaktiviert alle aktuell aktiven Null-Impressions-Ausblendpräferenzen. Präferenzen für gelöschte Artikel existieren wegen `ON DELETE CASCADE` nicht mehr.

## 9. Sicherheit und Fehlerbehandlung

- Anonyme und nichtadministrative Aufrufe werden durch die vorhandene Adminmiddleware blockiert.
- Jede Schreibaktion verlangt ein gültiges CSRF-Token.
- Artikel-IDs werden als positive PostgreSQL-Integer validiert.
- Die Berechtigung zum Ausblenden wird innerhalb der Schreibtransaktion neu berechnet.
- Bei Datenbankfehlern wird die gesamte Einzel- oder Sammelaktion zurückgerollt.
- Mehrfachklicks bleiben durch idempotente Upserts beziehungsweise Updates sicher.
- Es werden keine Suchanfragen, personenbezogenen Daten oder Secrets in der Präferenztabelle gespeichert.
- Statusmeldungen enthalten keine rohen Datenbankfehler.

## 10. Tests

Mindestens folgende Fälle werden automatisiert geprüft:

1. Vollständige 28 Tage und mehr als null Impressionen ergeben `visibleArticles`.
2. Vollständige 28 Tage und exakt null Impressionen ergeben `zeroImpressionArticles`.
3. Ein ausgeblendeter Null-Impressions-Artikel ergibt `hiddenZeroImpressionArticles`.
4. Kein Snapshot ergibt `collectingArticles`.
5. Ein junger Artikel ergibt `collectingArticles`.
6. Weniger als 28 Abdeckungstage ergeben `collectingArticles`.
7. Fehlende oder ungültige 28-Tage-Metriken ergeben `collectingArticles`.
8. Ein gespeicherter Ausblendstatus wird ignoriert, sobald der Artikel Impressionen besitzt.
9. Einzelnes Ausblenden ist dauerhaft und idempotent.
10. Einzelnes Einblenden ist dauerhaft und idempotent.
11. `Alle ausblenden` betrifft nur aktuell qualifizierte Null-Impressions-Artikel.
12. `Alle einblenden` deaktiviert die betroffenen Präferenzen atomar.
13. Ein zwischenzeitlich sichtbar gewordener Artikel kann nicht mehr ausgeblendet werden.
14. Anonyme, nichtadministrative und CSRF-freie Schreibzugriffe werden blockiert.
15. Öffentliche Felder wie `published`, Inhalt, Slug und Indexierungsdaten bleiben unverändert.
16. Jede Gruppe rendert Anzahl, Leerzustand und zulässige Aktionen korrekt.
17. Die mobile Darstellung enthält alle Inhalte und Aktionen ohne horizontalen Seitenüberlauf.
18. Die bestehende Performance-, Audit- und Optimierungsfunktion bleibt unverändert nutzbar.

## 11. Migration und Deployment

Die Migration wird dem vorhandenen Content-Agent-Migrationsrunner nach Migration 013 hinzugefügt. Der bestehende sichere Deploymentablauf bleibt erhalten:

1. Produktionsbackup erstellen und prüfen.
2. Migrationen zunächst gegen die isolierte Testdatenbank ausführen.
3. Migration 014 in der Produktion ausführen.
4. App und Content-Worker aus demselben neuen Image neu erstellen.
5. Gesundheitsprüfung und Content-Agent-Dry-Run durchführen.
6. GSC-Synchronisierung vollständig abschließen lassen.
7. Die vier Gruppen im Adminbereich kontrollieren.
8. Einen Artikel einzeln aus- und wieder einblenden.
9. Sammelaktionen mit einer kleinen kontrollierten Zielmenge prüfen.

Es sind keine neuen `.env`-Variablen und keine neue `docker-compose.yml`-Konfiguration erforderlich.

## 12. Abnahmekriterien

Die Funktion gilt als abgenommen, wenn:

- die Hauptübersicht nur Artikel mit mindestens einer vollständigen 28-Tage-Impression zeigt,
- unvollständige Daten neutral und getrennt erscheinen,
- bestätigte Null-Impressions-Artikel gesammelt erscheinen,
- Einzel- und Sammelaktionen dauerhaft gespeichert werden,
- ausgeblendete Artikel jederzeit wieder eingeblendet werden können,
- Performanceänderungen die sichtbare Gruppenzuordnung automatisch korrigieren,
- keine Aktion öffentliche Artikel- oder Indexierungsdaten verändert,
- alle neuen und bestehenden relevanten Tests sowie der Build erfolgreich sind.
