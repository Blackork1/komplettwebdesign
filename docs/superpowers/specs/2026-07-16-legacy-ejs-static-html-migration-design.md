# Legacy-EJS zu statischem HTML – Designspezifikation

## 1. Ziel

Veröffentlichte Blogartikel mit `content_format = legacy_ejs` sollen kontrolliert in `static_html` umgewandelt werden können. Nach der Migration können diese Artikel über die bestehende KI-Bestandsoptimierung vollständig geprüft und überarbeitet werden.

Die Migration darf keine öffentliche URL verändern und keine ungeprüften Änderungen direkt veröffentlichen. Der aktuelle Liveartikel bleibt bis zur ausdrücklichen Freigabe unverändert.

## 2. Ausgangslage

Am 16. Juli 2026 befinden sich 34 veröffentlichte Blogartikel mit `content_format = legacy_ejs` in der Produktionsdatenbank:

- 25 Artikel enthalten keinen aktiven EJS-Code mehr. Ihr Inhalt ist bereits statisches HTML, wurde aber noch nicht entsprechend klassifiziert.
- 9 Artikel enthalten aktive EJS-Ausdrücke.
- Die aktiven Ausdrücke umfassen einfache Werte wie `post.title` und `post.image_url`, Datumswerte, JSON-LD-Ausgaben sowie in einem Artikel eine Schleife über Berliner Bezirke.
- Neue KI-Artikel werden bereits als `static_html` angelegt.

Eine reine Änderung der Spalte `content_format` ist unzulässig. Aktive EJS-Ausdrücke würden danach als Text erscheinen oder durch den HTML-Sanitizer beschädigt. Deshalb muss das System zwischen bereits statischem Altinhalt und tatsächlich aktivem EJS unterscheiden.

## 3. Verbindliche Produktentscheidungen

- Die Migration wird im geschützten Content-Agent-Adminbereich bedient.
- Bereits statische Altartikel erhalten einen Sammelpfad.
- Artikel mit aktivem EJS müssen einzeln geprüft und freigegeben werden.
- Kein Artikel wird allein durch einen Scan oder eine Vorschauerstellung verändert.
- Slug, öffentliche URL, Veröffentlichungsstatus, Veröffentlichungsdatum, Kategorie, Beitragsbild und GSC-Historie bleiben unverändert.
- Der ursprüngliche Legacy-Inhalt wird vor jeder Umstellung dauerhaft gespeichert.
- Eine Rückkehr zum Legacy-Stand ist nur möglich, solange der Artikel nach der Migration nicht erneut verändert wurde.
- Offene Revisionen, laufende Optimierungsaufträge und unklare Providerzustände sperren eine Migration.
- Redaktionelle Qualitätsbefunde blockieren die technische Formatmigration nicht, sofern das Ergebnis technisch sicher ist.
- Nach erfolgreicher Migration steht die bestehende KI-Bestandsoptimierung wieder zur Verfügung.
- Es gibt keine automatische nächtliche oder deploymentgetriebene Massenmigration.

## 4. Migrationsklassen

### 4.1 Sicher gesammelt migrierbar

Ein Artikel gehört in diese Gruppe, wenn:

- `content_format = legacy_ejs`,
- der Inhalt weder `<%` noch `%>` enthält,
- der Sanitizer den Inhalt ohne sicherheitsrelevanten Verlust akzeptiert,
- die statische Vorschau erfolgreich gerendert werden kann,
- keine offene Revision besteht,
- kein aktiver oder manuell ungeklärter Optimierungsauftrag besteht,
- der Livehash seit dem Scan unverändert ist.

Der Inhalt wird nicht durch KI neu geschrieben. Vor der Speicherung wird er ausschließlich über die vorhandenen Normalisierungs-, H1- und Sanitizer-Regeln für statische Blogartikel geführt.

Diese Gruppe erhält die Aktion:

> Alle sicheren Artikel migrieren

Vor Ausführung zeigt ein Bestätigungsdialog die genaue Anzahl der betroffenen Artikel. Der Server prüft jeden Kandidaten innerhalb der Transaktion erneut. Artikel, die zwischenzeitlich nicht mehr berechtigt sind, werden übersprungen und mit einer konkreten Begründung protokolliert.

### 4.2 Einzelprüfung erforderlich

Ein Artikel gehört in diese Gruppe, wenn sein Datenbankinhalt aktives EJS enthält.

Das System rendert den Legacy-Inhalt einmalig mit denselben kontrollierten Locals und denselben Preiswerten wie die öffentliche Artikelseite:

- `post`,
- `publishedISO`,
- `modifiedISO`,
- `og_image`,
- `locale`,
- erlaubte Datumshelfer,
- aktueller zentraler Preiskatalog.

Danach werden:

- alle EJS-Tags vollständig aufgelöst,
- enthaltene H1-Überschriften zu H2 herabgestuft,
- bekannte Legacy-Kopierfehler normalisiert,
- Preis-Platzhalter erhalten, sofern sie vom bestehenden statischen Preisrenderer unterstützt werden,
- das Ergebnis mit dem bestehenden Artikel-Sanitizer bereinigt,
- interne Links gegen das vertrauenswürdige Linkinventar geprüft,
- sichtbarer Text, Überschriften, Links, Bilder, IDs und FAQ-Struktur mit dem aktuellen öffentlichen Renderstand verglichen.

Die Vorschau zeigt:

- den aktuellen öffentlichen Renderstand,
- das vorgeschlagene statische HTML,
- eine technische Zusammenfassung der Unterschiede,
- entfernte oder veränderte Elemente,
- Warnungen und Blocker,
- den ursprünglichen und den vorgeschlagenen Inhaltsumfang.

Erst die Aktion:

> Geprüft zu statischem HTML migrieren

ändert den Liveartikel.

### 4.3 Blockiert

Ein Artikel wird blockiert, wenn mindestens eine dieser Bedingungen zutrifft:

- EJS-Rendering schlägt fehl,
- nach dem Rendering bleiben EJS-Tags erhalten,
- der Sanitizer entfernt ausführbare oder sicherheitskritische Inhalte,
- unbekannte oder nicht erlaubte Template-Locals werden verwendet,
- das Ergebnis enthält nicht erlaubte Script-Tags oder Event-Handler,
- wichtige dynamische Inhalte verschwinden,
- der Livehash stimmt nicht mehr mit der Vorschau überein,
- eine offene Revision oder ein aktiver Optimierungsauftrag existiert,
- bereits ein anderer Migrationsauftrag für den Artikel läuft,
- der gespeicherte Vorschauzustand ist abgelaufen oder unvollständig.

Die Oberfläche zeigt die konkrete Ursache und bietet keine Freigabeaktion an.

## 5. Adminoberfläche

Im Reiter „Bestehende Inhalte“ wird ein Bereich „Legacy-Migration“ ergänzt.

Die Übersicht enthält:

- Anzahl aller Legacy-Artikel,
- Anzahl sicher gesammelt migrierbarer Artikel,
- Anzahl einzeln zu prüfender Artikel,
- Anzahl blockierter Artikel,
- Zeitpunkt des letzten Scans,
- Aktion „Legacy-Artikel neu prüfen“.

Darunter folgen drei einklappbare Gruppen:

1. **Sicher gesammelt migrierbar**
2. **Einzelprüfung erforderlich**
3. **Blockiert**

Jede Artikelzeile zeigt:

- Titel,
- Slug,
- aktuellen Formatstatus,
- EJS-Anzahl,
- letzten Änderungszeitpunkt,
- Scanstatus,
- primäre Aktion,
- technische Details in einem einklappbaren Bereich.

Für aktive EJS-Artikel führt „Migration prüfen“ in eine eigene Vorher-Nachher-Ansicht. Nach einer erfolgreichen Migration wechselt die Bestandszeile zu `static_html` und bietet wieder „KI-Optimierung starten“ an.

## 6. Datenmodell

Eine additive Migration legt eine Tabelle `content_legacy_migrations` an.

Erforderliche Felder:

| Feld | Zweck |
|---|---|
| `id` | Primärschlüssel |
| `post_id` | betroffener Blogartikel |
| `status` | `scanned`, `ready`, `blocked`, `migrated`, `rolled_back`, `stale`, `failed` |
| `migration_class` | `static_legacy` oder `active_ejs` |
| `base_live_hash` | Hash des geprüften Livezustands |
| `migrated_live_hash` | Hash des unmittelbar nach der Umstellung gespeicherten Zustands |
| `source_content_format` | immer `legacy_ejs` |
| `source_content` | unveränderliches Original |
| `rendered_static_html` | geprüfter statischer Vorschlag |
| `render_context_json` | versionsgebundene, nicht geheime Renderinformationen |
| `analysis_json` | technische Analyse und Vergleichsdaten |
| `blocking_issues_json` | konkrete Blocker |
| `sanitizer_report_json` | Sanitizer-Ergebnis |
| `created_by` | Admin-ID |
| `approved_by` | freigebende Admin-ID |
| `created_at` | Scanzeitpunkt |
| `updated_at` | letzter Zustandswechsel |
| `migrated_at` | tatsächliche Umstellung |
| `rolled_back_at` | Rücknahmezeitpunkt |

Die Tabelle speichert keine OpenAI-Antworten und benötigt keinen externen Provider.

Ein partieller Unique-Index verhindert mehr als einen offenen Migrationsstand mit `scanned`, `ready` oder `blocked` pro Artikel.

## 7. Scan- und Vorschauablauf

### 7.1 Scan

1. Admin startet den Scan.
2. Das System lädt ausschließlich veröffentlichte Legacy-Artikel.
3. Für jeden Artikel wird unter einer begrenzten Nebenläufigkeit ein Livehash erzeugt.
4. Artikel ohne EJS-Tags werden als `static_legacy` klassifiziert.
5. Artikel mit EJS-Tags werden als `active_ejs` klassifiziert.
6. Jeder Artikel durchläuft die technische Validierung.
7. Das Ergebnis wird gespeichert, ohne den Liveartikel zu verändern.

### 7.2 Vorschau für aktives EJS

1. Der aktuelle Legacy-Inhalt wird mit denselben Locals und Normalisierungen wie in der öffentlichen Renderlogik gerendert.
2. Ein separater Migrationsservice erhält nur die erforderlichen, serverseitig kontrollierten Locals und lässt Renderfehler strikt bis zum blockierten Migrationsstatus durch. Der fehlertolerante öffentliche Fallback auf leeren Inhalt wird nicht übernommen.
3. Das gerenderte Ergebnis wird normalisiert und sanitisiert.
4. Der Dienst prüft, dass keine EJS-Syntax mehr vorhanden ist.
5. Die strukturelle und sichtbare Differenz wird berechnet.
6. Blockierende Abweichungen verhindern die Freigabe.
7. Die Vorschau wird mit `X-Robots-Tag: noindex, nofollow` ausgegeben.

## 8. Atomare Migration

Die eigentliche Umstellung läuft in einer PostgreSQL-Transaktion:

1. Artikel und Migrationsdatensatz werden gesperrt.
2. Der aktuelle Artikel wird erneut gelesen.
3. `published = true`, `content_format = legacy_ejs` und der gespeicherte Livehash werden erneut geprüft.
4. Offene Revisionen und Optimierungsaufträge werden erneut ausgeschlossen.
5. Der geprüfte statische Inhalt wird erneut validiert.
6. `posts.content` wird auf den geprüften Inhalt gesetzt.
7. `posts.content_format` wird auf `static_html` gesetzt.
8. `posts.updated_at` wird aktualisiert.
9. Der Migrationsdatensatz erhält `status = migrated`, Admin-ID und Zeitpunkt.
10. Die Transaktion wird abgeschlossen.

Die Operation ist idempotent. Ein bereits erfolgreich migrierter Datensatz wird nicht erneut geschrieben.

## 9. Sammelmigration

Die Sammelaktion verarbeitet ausschließlich `static_legacy`-Datensätze mit `status = ready`.

Jeder Artikel wird einzeln transaktional migriert. Dadurch kann ein zwischenzeitlich geänderter Artikel übersprungen werden, ohne alle anderen sicheren Kandidaten zurückzurollen.

Das Ergebnis zeigt:

- erfolgreich migriert,
- übersprungen,
- blockiert,
- fehlgeschlagen.

Es werden keine aktiven EJS-Artikel in die Sammelaktion aufgenommen.

## 10. Rücknahme

Eine Migration darf zurückgenommen werden, wenn:

- der Migrationsdatensatz `status = migrated` besitzt,
- der aktuelle Artikel noch `content_format = static_html` verwendet,
- der aktuelle Livehash exakt dem unmittelbar nach der Migration gespeicherten Hash entspricht,
- keine Revision oder neue Optimierung seit der Migration angelegt wurde.

Bei der Rücknahme werden `source_content` und `legacy_ejs` atomar wiederhergestellt. Danach erhält der Migrationsdatensatz `status = rolled_back`.

Nach redaktioneller oder KI-gestützter Änderung des statischen Artikels ist die automatische Rücknahme gesperrt. Der Originalinhalt bleibt zu Audit- und Wiederherstellungszwecken gespeichert.

## 11. Sicherheitsregeln

- EJS aus Datenbankinhalten wird ausschließlich über die vorhandene serverseitige Renderumgebung verarbeitet.
- Es wird kein EJS-Code vom Browser oder aus Formularfeldern ausgeführt.
- Unbekannte Locals und Includes sind nicht erlaubt.
- EJS-Includes, Dateizugriffe, Netzwerkzugriffe und Prozesszugriffe blockieren die Migration.
- Vor dem Rendern prüft eine konservative Tokenrichtlinie alle EJS-Blöcke. Ausdrücke mit `process`, `global`, `globalThis`, `require`, `import`, `Function`, `eval`, `constructor`, `__proto__`, Datei- oder Netzwerkzugriff werden nicht ausgeführt.
- Vorschauen führen niemals den vorgeschlagenen Inhalt als EJS aus.
- Das Ergebnis wird ausschließlich als sanitisiertes HTML gerendert.
- Mutierende Aktionen benötigen Adminanmeldung, CSRF-Schutz und ausdrückliche Bestätigung.
- Scan, Migration, Sammelmigration und Rücknahme werden mit Admin-ID protokolliert.
- Slug und URL sind in allen Migrationsoperationen unveränderlich.
- Das System nimmt keine externe KI- oder Webrecherche für die technische Umwandlung in Anspruch.

## 12. Umgang mit dynamischen Inhalten

### 12.1 Zulässige Auflösung

Diese Werte werden mit dem aktuellen Artikelzustand statisch eingesetzt:

- Titel,
- Bild-URL,
- veröffentlichter und geänderter Zeitpunkt,
- OG-Bild,
- localeabhängige Datumsdarstellung,
- bekannte lokale Arrays und Schleifen, beispielsweise Bezirkskarten.

### 12.2 Preiswerte

Bestehende vom statischen Preisrenderer unterstützte Preis-Tokens bleiben als Tokens erhalten. Bereits hart in EJS oder HTML geschriebene Preisangaben werden nicht automatisch in Tokens umgeschrieben. Solche Angaben werden nach der Migration als redaktioneller Befund durch die bestehende KI-Prüfung behandelt.

### 12.3 Strukturierte Daten

JSON-LD, das bisher im Artikelinhalt per EJS erzeugt wurde, wird nicht ungeprüft in den statischen Artikel übernommen:

- Doppelte `BlogPosting`-Daten werden entfernt, weil das öffentliche Blogtemplate bereits strukturierte Artikeldaten erzeugt.
- Sichtbare FAQ bleiben im Artikel.
- FAQ-JSON-LD wird aus dem bestehenden `faq_json` des Artikels über die öffentliche Seitendarstellung erzeugt.
- Nicht zuordenbare strukturierte Daten blockieren die Einzelmigration zur manuellen Prüfung.

## 13. Fehler- und Wiederaufnahmekonzept

- Ein fehlgeschlagener Scan verändert keinen Artikel.
- Ein abgelaufener oder hashfremder Vorschlag erhält `status = stale`.
- Ein erneuter Scan erzeugt einen neuen, aktuellen Vorschlag.
- Fehlertexte werden im Adminbereich verständlich und in Protokollen technisch präzise gespeichert.
- Eine unterbrochene Sammelmigration kann erneut gestartet werden; bereits migrierte Artikel werden idempotent übersprungen.
- Nach erfolgreicher Datenbankschreibung, aber unklarer HTTP-Antwort wird der aktuelle Datenbankzustand als Wahrheitsquelle verwendet.

## 14. Tests

Die Umsetzung benötigt mindestens folgende automatisierte Prüfungen:

1. Klassifizierung von statischem Legacy-Inhalt und aktivem EJS.
2. Scan verändert keinen Liveartikel.
3. Bereits statische Altartikel werden ohne EJS-Rendering geprüft.
4. Einfache EJS-Werte werden korrekt aufgelöst.
5. Die Bezirks-Schleife wird vollständig zu statischem HTML expandiert.
6. Datumswerte verwenden die öffentliche Renderlogik.
7. Unbekannte Locals, Includes und gefährliche Ausdrücke blockieren die Migration.
8. Nach dem Rendern verbleibende EJS-Tags blockieren die Migration.
9. Sanitizer-Verluste werden korrekt klassifiziert.
10. Slug, Veröffentlichungsstatus und Zeitpunkte bleiben unverändert.
11. Livehash-Konflikte verhindern die Umstellung.
12. Offene Revisionen und Optimierungsaufträge verhindern die Umstellung.
13. Sammelmigration verarbeitet ausschließlich sichere `static_legacy`-Artikel.
14. Sammelmigration überspringt zwischenzeitlich veränderte Kandidaten.
15. Einzelmigration ist atomar und idempotent.
16. Rücknahme funktioniert nur für einen unveränderten Migrationsstand.
17. Nachfolgende Bearbeitung sperrt die automatische Rücknahme.
18. Adminrouten sind geschützt und CSRF-pflichtig.
19. Vorschauen sind `noindex` und führen kein EJS aus.
20. Nach der Migration wird die KI-Optimierung wieder angeboten.
21. Migration und Rücknahme funktionieren in einem echten isolierten PostgreSQL-Schema.
22. Die SQL-Migration ist wiederholt ausführbar.
23. Bestehende öffentliche Blogtests bleiben grün.
24. Vollständige Testsuite und Produktions-Build bleiben erfolgreich.

## 15. Deployment

Die Funktion benötigt:

- eine additive Datenbankmigration,
- das neue App- und Worker-Image,
- keine neuen Umgebungsvariablen,
- keine Änderung an `docker-compose.yml`,
- keine Änderung an OpenAI-, GSC- oder Cloudinary-Zugängen.

Der bestehende Deploymentablauf bleibt:

1. PostgreSQL-Backup,
2. idempotente Migration,
3. Dry-Run,
4. gemeinsames Recreate von App und Worker,
5. Healthchecks.

Nach Deployment wird zunächst nur ein Scan ausgeführt. Die Sammelaktion und jede Einzelmigration erfordern weiterhin eine ausdrückliche Adminaktion.

## 16. Erfolgskriterien

Die Funktion gilt als erfolgreich umgesetzt, wenn:

- alle Legacy-Artikel eindeutig in eine der drei Gruppen eingeordnet werden,
- die 25 bereits statischen Altartikel gesammelt und sicher migriert werden können,
- die 9 aktiven EJS-Artikel jeweils eine überprüfbare statische Vorschau erhalten,
- keine öffentliche URL verändert wird,
- keine Migration ungeprüft automatisch ausgeführt wird,
- ursprüngliche Inhalte dauerhaft wiederherstellbar bleiben,
- migrierte Artikel anschließend über die bestehende KI-Bestandsoptimierung bearbeitet werden können,
- kein EJS-Code in einem als `static_html` markierten Artikel verbleibt.
