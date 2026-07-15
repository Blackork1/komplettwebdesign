# Artikel-Performance und datenbasierte Lernkurve – Designspezifikation

**Stand:** 15. Juli 2026  
**Status:** Grundaufbau vom Nutzer bestätigt

## Ziel

Jeder veröffentlichte Blogartikel soll im geschützten Content-Agent-Adminbereich eine eigene, verständliche Leistungsübersicht erhalten. Direkt in der Artikelliste werden die wichtigsten Google-Search-Console-Werte der letzten 7, 14 und 28 vollständig synchronisierten Tage sichtbar. Eine Detailseite erklärt zusätzlich, was gut funktioniert, wo belastbares Optimierungspotenzial besteht und welche nächste Maßnahme sinnvoll ist.

Die Erkenntnisse sollen nicht nur einzelne Artikel verbessern. Wiederkehrende, datenbasierte Muster werden als kontrollierte Lernbeobachtungen gespeichert. Erst wenn mehrere unterschiedliche Artikel dasselbe belastbare Muster zeigen, entsteht ein Lernregel-Vorschlag. Wie bei den bestehenden redaktionellen Lernregeln darf dieser Vorschlag erst nach ausdrücklicher Freigabe im Adminbereich zukünftige Artikel beeinflussen.

## Bestätigte Entscheidungen

1. Die Auswertung umfasst **alle veröffentlichten Blogartikel**, nicht nur KI-generierte Beiträge.
2. Die Artikelliste erhält kompakte Leistungswerte; zusätzlich gibt es eine vollständige Detailanalyse pro Artikel.
3. Angezeigt werden 7, 14 und 28 Tage. „Ein Monat“ bedeutet verbindlich die letzten 28 vollständig synchronisierten Tage.
4. Die GSC-Synchronisierung und anschließende Bewertung laufen täglich um **05:30 Uhr Europe/Berlin**.
5. Zeiträume enden immer am letzten vollständig synchronisierten GSC-Tag und nicht am aktuellen Kalendertag.
6. Werte werden sofort angezeigt. Eine belastbare Bewertung, Optimierungsempfehlung oder Lernbeobachtung entsteht aber erst nach 28 vollständigen Tagen und mindestens 50 Impressionen.
7. Verglichen wird mit dem eigenen vorherigen Zeitraum und mit Artikeln desselben Content-Clusters und ähnlichen Alters. Ist diese Gruppe zu klein, wird auf alle ähnlich alten Blogartikel zurückgefallen.
8. GSC wird um lokale CTA-Klicks und Kontaktanfragen ergänzt.
9. Die Zuordnung von Kontaktanfragen erfolgt bei erteilter Analytics-Einwilligung als anonyme 7-Tage-Last-Touch-Zuordnung.
10. Kennzahlen und Bewertungen sind regelbasiert. OpenAI formuliert nur bei ausreichender Datenlage eine verständliche Begründung und einen kontrollierten Lernvorschlag.
11. Artikel mit mindestens 50 Impressionen und null Google-Klicks werden automatisch zu Kandidaten für Titel-, Meta- und Suchintentionsoptimierung.
12. Keine Bewertung, Lernbeobachtung oder KI-Empfehlung veröffentlicht oder verändert einen Artikel automatisch.

## Abgrenzung

Nicht Bestandteil dieser Ausbaustufe sind:

- Google-Analytics-API-Importe,
- DataForSEO oder Google-Ads-Daten,
- automatische Änderung veröffentlichter Artikel,
- automatische Aktivierung von Lernregeln,
- freie KI-Bewertungen ohne deterministische Messgrundlage,
- personenbezogene Nutzerprofile,
- eine exakte kanalübergreifende Customer-Journey,
- Ranking- oder Anfragegarantien.

## Empfohlene Architektur

Die Funktion verwendet eine täglich gespeicherte Performance-Auswertung. Das ist gegenüber reinen Live-Abfragen schneller, nachvollziehbarer und für eine Lernkurve geeignet. Die vorhandenen GSC-Tagesdaten bleiben die Messgrundlage; pro Artikel werden keine separaten Google-Aufrufe ausgeführt.

Der Ablauf lautet:

1. Der Worker reiht täglich um 05:30 Uhr die bestehende GSC-Synchronisierung ein.
2. Nur nach erfolgreicher Synchronisierung wird idempotent ein interner Job `evaluate_article_performance` eingereiht.
3. Der Auswertungsjob bestimmt den letzten vollständig synchronisierten GSC-Tag.
4. Für jeden veröffentlichten Blogartikel berechnet er die 7-, 14- und 28-Tage-Fenster sowie die entsprechenden vorherigen Zeiträume.
5. Für den 28-Tage-Zeitraum wird eine Vergleichsgruppe gebildet.
6. Ein lokaler Prüfer berechnet Status, Diagnosen, Optimierungskandidaten und belastbare positive Signale.
7. Das Ergebnis wird als täglicher Snapshot gespeichert.
8. Nur bei ausreichenden Daten und einem neuen Evidenz-Hash darf ein kurzer OpenAI-Erklärjob eingereiht werden. Derselbe unveränderte Befund verursacht keinen erneuten Provideraufruf.
9. Wiederkehrende Diagnosen aus mindestens drei unterschiedlichen Artikeln können einen freigabepflichtigen Lernregel-Vorschlag erzeugen.

Fehlt die GSC-Konfiguration oder scheitert die Synchronisierung, bleibt die letzte gültige Auswertung sichtbar. Es wird keine neue Bewertung aus unvollständigen Daten erzeugt.

## Messzeiträume und Datenabdeckung

### Aktuelle Fenster

- 7 Tage: `latest_complete_day - 6` bis `latest_complete_day`
- 14 Tage: `latest_complete_day - 13` bis `latest_complete_day`
- 28 Tage: `latest_complete_day - 27` bis `latest_complete_day`

Für jeden Zeitraum werden gespeichert beziehungsweise angezeigt:

- Impressionen,
- Google-Klicks,
- Klickrate,
- impressionsgewichtete durchschnittliche Position,
- Anzahl vollständig synchronisierter Tage,
- CTA-Klicks des Artikels,
- zugeordnete Kontaktanfragen.

### Vorherige Fenster

- aktuelle 7 Tage gegen die davorliegenden 7 Tage,
- aktuelle 14 Tage gegen die davorliegenden 14 Tage,
- aktuelle 28 Tage gegen die davorliegenden 28 Tage.

Ein Vergleich wird nur angezeigt, wenn beide Fenster vollständig abgedeckt sind. Fehlende ältere Daten werden als „Vergleich noch nicht verfügbar“ und niemals als Nullleistung dargestellt.

### Neue und noch nicht ausreichend gemessene Artikel

Ein Artikel kann bereits ab dem ersten vorhandenen GSC-Tag Werte anzeigen. Solange seit Veröffentlichung noch keine 28 vollständig synchronisierten Tage vorliegen, erhält er den Status `collecting_data`. Unter 50 Impressionen lautet der Status `insufficient_impressions`. Beide Zustände verhindern negative Bewertungen, Optimierungskandidaten, Provideraufrufe und Lernbeobachtungen.

## Vergleichsgruppen

Der Vergleich verwendet Medianwerte, damit einzelne Ausreißer die Bewertung nicht verzerren.

Altersgruppen werden anhand der Tage seit Veröffentlichung gebildet:

- 28 bis 59 Tage,
- 60 bis 119 Tage,
- 120 bis 239 Tage,
- ab 240 Tagen.

Zuerst werden andere veröffentlichte Artikel aus demselben Content-Cluster und derselben Altersgruppe verwendet. Eine belastbare Clustergruppe benötigt mindestens drei andere Artikel. Ist sie kleiner, wird auf alle anderen Blogartikel derselben Altersgruppe zurückgefallen. Sind auch dort weniger als drei Vergleichsartikel vorhanden, wird nur der eigene Vorperiodenvergleich verwendet und der Kohortenvergleich als nicht verfügbar markiert.

Verglichen werden ausschließlich gleich lange vollständige Fenster. Lebenszeitwerte eines alten Artikels werden nicht mit einem jungen Artikel verglichen.

## Regelbasierte Bewertung

Die Oberfläche verwendet keine scheinpräzise Gesamtnote. Stattdessen werden vier verständliche Dimensionen separat bewertet:

1. **Sichtbarkeit:** Impressionen und durchschnittliche Position.
2. **Suchergebnis:** Google-Klicks und CTR im Verhältnis zur Position, Vorperiode und Vergleichsgruppe.
3. **Artikelwirkung:** CTA-Klicks im Verhältnis zu organischen Klicks.
4. **Anfrageweg:** Kontaktanfragen im Verhältnis zu CTA-Klicks.

Mögliche Zustände sind:

- `collecting_data` – Zeitraum noch nicht vollständig,
- `insufficient_impressions` – weniger als 50 Impressionen,
- `positive` – belastbar über Vorperiode beziehungsweise Vergleichsmedian,
- `stable` – ohne deutliche positive oder negative Abweichung,
- `opportunity` – belastbares Optimierungspotenzial,
- `not_applicable` – für diese Funnelstufe fehlen noch die notwendigen vorgelagerten Ereignisse.

### Verbindliche Diagnosen

#### Zu wenig Sichtbarkeit

Ein Sichtbarkeitshinweis entsteht nur bei mindestens 50 Impressionen, wenn die Impressionen deutlich unter dem Vergleichsmedian liegen und die durchschnittliche Position schwach ist. Die Empfehlung zielt auf Themenabdeckung, interne Links, Suchintention und gegebenenfalls Kannibalisierung – nicht automatisch auf Meta-Daten.

#### Impressionen ohne Google-Klick

Bei mindestens 50 Impressionen und null Google-Klicks entsteht verbindlich die Diagnose `snippet_or_intent_opportunity`. Der Artikel wird als Kandidat für Titel-, Meta-Description- und Suchintentionsprüfung markiert. Diese Regel gilt unabhängig davon, dass aktuell viele Artikel noch null Klicks haben; unterhalb der Mindestdaten bleibt der Status neutral.

#### Rankingchance

Bei ausreichenden Impressionen und einer durchschnittlichen Position ungefähr zwischen 8 und 20 kann `ranking_opportunity` entstehen. Die Empfehlung priorisiert inhaltliche Vertiefung, interne Verlinkung und präzisere Abdeckung der wichtigsten Suchanfragen.

#### Klicks ohne CTA-Klick

Die Artikelwirkung wird erst ab mindestens zehn organischen Google-Klicks im 28-Tage-Fenster bewertet. Sind dann keine CTA-Klicks vorhanden, entsteht `content_or_cta_opportunity`. So werden einzelne oder zufällige Klicks nicht überinterpretiert.

#### CTA-Klicks ohne Anfrage

Der Anfrageweg wird erst ab mindestens fünf CTA-Klicks bewertet. Liegt dann keine zugeordnete Kontaktanfrage vor, entsteht `contact_path_opportunity`. Die Empfehlung betrifft Angebotspassung, Kontaktseite und Übergang zum Formular, nicht automatisch den Blogtext allein.

#### Positive Muster

Positive Signale werden ebenfalls gespeichert. Beispiele sind eine steigende CTR bei vergleichbarer Position, überdurchschnittliche Sichtbarkeit innerhalb der Vergleichsgruppe oder ein funktionierender Übergang von organischen Klicks zu CTA-Klicks. Nur so kann die Lernkurve erfolgreiche Strukturen erhalten und nicht ausschließlich Fehler sammeln.

Alle Schwellenwerte werden als versionierte lokale Bewertungsrichtlinie im Code geführt. Sie sind zunächst technische Expertenwerte und nicht im Adminbereich veränderbar.

## Suchanfragen und Diagnosebelege

Die Detailanalyse zeigt höchstens die zehn wichtigsten bereinigten GSC-Suchanfragen des Artikels. Sortiert wird primär nach Impressionen. Pro Suchanfrage werden Impressionen, Klicks, CTR und Position angezeigt.

Suchanfragen sind nicht vertrauenswürdige externe Daten. Sie werden längenbegrenzt, als Text ausgegeben und niemals als HTML, Promptanweisung oder ungefilterter Dateiname verwendet. OpenAI erhält nur eine begrenzte strukturierte Zusammenfassung und eine eindeutige Anweisung, Suchanfragen ausschließlich als Daten zu behandeln.

## Datenschutzarme Artikel- und Conversion-Zuordnung

Die bestehende Session läuft bereits maximal sieben Tage und speichert die Analytics-Einwilligung serverseitig. Darauf wird aufgebaut:

1. Beim Aufruf eines veröffentlichten Blogartikels wird nur bei aktiver Analytics-Einwilligung in der bestehenden Serversession eine anonyme Last-Touch-Referenz mit Artikel-ID und Zeitpunkt gespeichert.
2. Der nächste gelesene Blogartikel überschreibt die vorherige Referenz.
3. Nach sieben Tagen ist die Referenz ungültig; die bestehende Session läuft ebenfalls aus.
4. Ein CTA-Klick im Artikel wird über einen gleichursprünglichen, CSRF-geschützten und begrenzt ratelimitierten Endpunkt als Ereignis gespeichert.
5. Wird das Kontaktformular erfolgreich in der Datenbank gespeichert, erzeugt der Server bei gültiger Einwilligung und Attribution ein anonymes `contact_submit`-Ereignis für den zuletzt gelesenen Artikel.
6. Schlägt das Performance-Tracking fehl, bleiben CTA-Navigation und Kontaktanfrage vollständig funktionsfähig.

In der Performance-Tabelle werden nicht gespeichert:

- Name,
- E-Mail-Adresse,
- Telefonnummer,
- Nachricht,
- Firma,
- IP-Adresse,
- vollständige Session-ID.

Für Deduplizierung und Missbrauchsbegrenzung wird lediglich ein serverseitig gehashter, nicht rückrechenbarer Ereignisschlüssel verwendet. Ohne Analytics-Einwilligung findet weder Last-Touch-Speicherung noch lokale Conversion-Zuordnung statt. Die Oberfläche weist deshalb darauf hin, dass Conversionwerte nur einwilligungsfähige Sitzungen abbilden.

## Datenmodell

Eine neue idempotente Migration `013_create_article_performance_learning.sql` erweitert das System.

### `content_article_events`

Speichert ausschließlich anonyme, einwilligungsabhängige Funnelereignisse:

- Primärschlüssel,
- `post_id` mit Fremdschlüssel auf `posts`,
- `event_type` mit den erlaubten Werten `cta_click` und `contact_submit`,
- Ereigniszeitpunkt,
- optional begrenzte CTA-Position und internes CTA-Ziel,
- gehashter Ereignisschlüssel zur Deduplizierung,
- Attributionstyp `session_last_touch_7d`,
- Zeitstempel.

Indizes unterstützen Abfragen nach Artikel, Ereignistyp und Datum. JSON-Freitext und personenbezogene Felder sind nicht vorgesehen.

### `content_article_performance_snapshots`

Speichert pro Artikel und ausgewertetem GSC-Endtag genau einen täglichen Snapshot:

- Primärschlüssel,
- `post_id`,
- ausgewerteter letzter vollständiger GSC-Tag,
- Veröffentlichungsalter,
- 7-, 14- und 28-Tage-Metriken als validierte JSON-Objekte,
- Vorperiodenwerte als validierte JSON-Objekte,
- Vergleichsgruppe und Medianwerte als validiertes JSON-Objekt,
- Bewertungsstatus,
- deterministische Diagnosen als validiertes JSON-Array,
- positive Signale als validiertes JSON-Array,
- Daten- und Lernberechtigung,
- kanonischer Evidenz-Hash,
- begrenzte KI-Erklärung als validiertes JSON-Objekt,
- Erklärstatus `not_needed`, `pending`, `ready` oder `failed`,
- Zeitstempel.

Ein eindeutiger Index auf `(post_id, evaluated_through_date)` macht den täglichen Lauf idempotent. Die Liste liest immer den neuesten Snapshot; die Historie bleibt für spätere Trend- und Regelprüfung erhalten.

### Bestehende Tabellen

- `content_search_metrics` und `content_search_metric_sync_days` bleiben die GSC-Quelle.
- `content_opportunities` wird wiederverwendet, um idempotente `meta_refresh`- oder `content_refresh`-Kandidaten anzulegen.
- Die bestehenden Lernregel-Tabellen bleiben die Freigabe- und Versionsquelle.
- Performance-Snapshots dienen als eigene, klar gekennzeichnete Lernbelege. Vorschläge entstehen erst aus mindestens drei unterschiedlichen Artikeln mit derselben Diagnose.

## OpenAI-Erklärungen

OpenAI bewertet keine Rohzahlen frei. Der Provider erhält ausschließlich:

- lokale Diagnosecodes,
- bereits berechnete Kennzahlen und Vergleiche,
- begrenzte wichtigste Suchanfragen,
- Titel, Kurzbeschreibung, Content-Cluster und Suchintention,
- die Aufforderung, die deterministische Diagnose verständlich zu erklären und eine konkrete, nicht automatisch ausgeführte Empfehlung zu formulieren.

Structured Output enthält nur:

- kurze Zusammenfassung,
- was gut funktioniert,
- was verbessert werden sollte,
- konkrete nächste Prüfung,
- optional einen Vorschlagstext für die lokale Lernregel-Kategorie.

Ein Provideraufruf ist nur zulässig, wenn:

- 28 vollständige Tage vorliegen,
- mindestens 50 Impressionen vorliegen,
- mindestens eine belastbare positive oder negative Diagnose existiert,
- derselbe Evidenz-Hash noch nicht erklärt wurde.

Providerfehler ändern die deterministische Bewertung nicht. Sie setzen nur den Erklärstatus auf `failed` und verwenden die bestehende begrenzte Retry-, Reservierungs- und Kostenlogik. Im Adminbereich werden keine API-Schlüssel, vollständigen Prompts oder ungefilterten Providerantworten ausgegeben.

## Lernkurve

Performance-Lernen verwendet kontrollierte Kategorien:

- `performance_visibility`,
- `performance_snippet_intent`,
- `performance_ranking`,
- `performance_content_engagement`,
- `performance_conversion_path`,
- `performance_positive_pattern`.

Ein einzelner Artikel kann sofort einen Optimierungskandidaten erhalten, erzeugt aber keine globale Lernregel. Erst mindestens drei unterschiedliche Artikel mit derselben belastbaren Diagnose erzeugen idempotent einen Vorschlag.

Der Vorschlag zeigt:

- betroffene Artikel,
- Messzeitraum und Mindestdaten,
- gemeinsame Diagnose,
- wichtige Vergleichswerte,
- vorgeschlagenen Regeltext,
- Zielstufen `brief`, `writer` und/oder `reviewer`,
- Hinweis auf mögliche Überanpassung.

Die vorhandenen Adminaktionen Aktivieren, Bearbeiten und aktivieren, Ablehnen, Pausieren und Deaktivieren bleiben verbindlich. Eine aktive Performance-Regel wirkt erst auf neue Jobs und wird wie bisher versioniert in deren Runtime-Snapshot aufgenommen. Bestehende Entwürfe und veröffentlichte Artikel werden nicht rückwirkend verändert.

Positive Muster dürfen ebenfalls Vorschläge erzeugen, beispielsweise eine bewährte Titelstruktur oder eine besonders passende CTA-Führung. Die vorgeschlagene Regel darf jedoch keine exakten Suchanfragen, temporären Zahlen oder einzelne Artikeltitel blind auf alle Inhalte übertragen.

## Adminoberfläche

### Artikelliste

Die vorhandene Liste veröffentlichter Inhalte erhält pro Artikel einen kompakten Bereich „Performance“:

- 7 Tage: Impressionen und Google-Klicks,
- 14 Tage: Impressionen und Google-Klicks,
- 28 Tage: Impressionen, Google-Klicks und CTR,
- verständliches Statuskennzeichen,
- letzter vollständig synchronisierter GSC-Tag,
- Link „Analyse öffnen“.

Bei fehlenden Daten erscheinen keine irreführenden Nullen, sondern „Noch keine GSC-Daten“. Teilweise Zeiträume zeigen beispielsweise „4 von 7 Tagen“. Auf Mobilgeräten werden die drei Zeiträume untereinander dargestellt.

### Artikel-Detailanalyse

Die neue admin-geschützte Detailseite enthält:

1. Titel, Veröffentlichungsdatum, Content-Cluster und Liveartikel-Link.
2. Datenhinweis mit letztem GSC-Tag und Abdeckungsstatus.
3. Drei Karten für 7, 14 und 28 Tage.
4. Vorperiodenvergleich mit absoluten und prozentualen Änderungen, sofern vollständig.
5. Vergleich mit ähnlichen Artikeln und klare Angabe, ob Cluster- oder allgemeiner Altersvergleich verwendet wurde.
6. Suchtrichter: Impressionen → Google-Klicks → Artikel-CTA-Klicks → Kontaktanfragen.
7. Wichtigste Suchanfragen mit Impressionen, Klicks, CTR und Position.
8. Bereich „Was funktioniert gut?“.
9. Bereich „Was sollte geprüft werden?“ mit Begründung, Mindestdaten und nächster Maßnahme.
10. Lernstatus: keine Beobachtung, Beobachtung gespeichert, Vorschlag wartet auf Freigabe oder aktive Regel vorhanden.
11. Aktion „KI-Revision anlegen“, wenn ein belastbarer Optimierungskandidat vorhanden ist.

Die Revisionsaktion verwendet den bestehenden Workflow zur KI-Optimierung veröffentlichter Artikel. Sie übergibt Diagnose und Messbelege als unveränderlichen Ausgangskontext, verändert aber den Liveartikel nicht. Freigabe und Veröffentlichung der Revision bleiben manuell.

### Null-Klick-Darstellung

Da derzeit viele Artikel keine Klicks haben, wird differenziert dargestellt:

- wenig Impressionen und null Klicks: „Noch keine belastbare Aussage“,
- mindestens 50 Impressionen und null Klicks: „Suchergebnis oder Suchintention prüfen“,
- Google-Klicks, aber keine CTA-Klicks: „Artikelwirkung und CTA prüfen“,
- CTA-Klicks, aber keine Anfrage: „Kontaktweg und Angebot prüfen“.

So werden Nullwerte nicht pauschal als Artikelversagen bezeichnet.

## Routen und Berechtigungen

Neue Admin-Leserouten liegen unter dem bestehenden geschützten Content-Agent-Bereich, beispielsweise:

- `GET /admin/content-agent/existing-content/:postId/performance`

Die CTA-Ereignisroute ist öffentlich erreichbar, akzeptiert aber nur gleichursprüngliche, CSRF-geschützte, einwilligungsfähige und streng validierte Ereignisse. Alle Adminaktionen und Revisionsaktionen benötigen weiterhin Adminsession, CSRF-Schutz und die vorhandenen Versions- beziehungsweise Nebenläufigkeitssperren.

## Nebenläufigkeit und Idempotenz

- Pro erfolgreichem GSC-Sync-Endtag wird höchstens ein Auswertungsjob eingereiht.
- Pro Artikel und Auswertungsendtag existiert höchstens ein Snapshot.
- Derselbe Evidenz-Hash erzeugt keinen zweiten OpenAI-Erklärjob.
- Derselbe Diagnosecode erzeugt pro Artikel nur einen aktiven Optimierungskandidaten.
- Derselbe anonyme Ereignisschlüssel kann nur einmal gespeichert werden.
- Lernvorschläge bleiben pro Kategorie eindeutig offen.
- Ein Fehler bei einem Artikel verhindert nicht die Auswertung der übrigen Artikel.

## Fehlerbehandlung

- GSC-Synchronisierung fehlgeschlagen: keine neue Bewertung; letzter gültiger Snapshot bleibt sichtbar.
- Lückenhafte Sync-Abdeckung: Zeitraum wird als unvollständig angezeigt und nicht bewertet.
- Keine Impressionen: neutraler Datenzustand, keine Division durch null.
- Keine Vergleichsgruppe: nur eigener Vorperiodenvergleich.
- Fehlende Content-Cluster-Zuordnung: allgemeine Altersgruppe als Fallback.
- Conversiontracking blockiert oder ohne Einwilligung: GSC-Auswertung bleibt vollständig nutzbar; Funnelstufe wird als eingeschränkt gekennzeichnet.
- OpenAI-Erklärung fehlgeschlagen: deterministische Diagnose bleibt sichtbar und nutzbar.
- Optimierungsjob fehlgeschlagen: bestehender sicherer Revisions- und Wiederaufnahmeprozess bleibt zuständig.

Technische Fehler werden serverseitig protokolliert. Im Adminbereich erscheinen bereinigte deutsche Hinweise statt SQL-, Session- oder Providerdetails.

## Sicherheit und Datenschutz

- Keine personenbezogenen Daten in Performance-Snapshots oder Artikelereignissen.
- Keine rohe Session-ID; nur nicht rückrechenbare, rotierbare Hashwerte zur Deduplizierung.
- Attribution ausschließlich bei erteilter Analytics-Einwilligung.
- Sieben Tage maximale Attribution.
- Eingaben aus GSC und CTA-Ereignissen werden validiert, begrenzt und bei Ausgabe escaped.
- Öffentliche Ereignisroute mit CSRF, Same-Origin-Prüfung, Rate Limit und fester Ereignis-Whitelist.
- Kein Tracking in Adminvorschauen, Entwurfsvorschauen oder für unveröffentlichte Artikel.
- Lösch- und Aufbewahrungsregeln: anonyme Rohereignisse werden nach einer begrenzten Frist gelöscht; aggregierte, nicht personenbezogene Snapshots dürfen für historische Vergleiche erhalten bleiben.
- Der Datenschutztext und die Trackingdokumentation werden um die anonyme Artikelzuordnung ergänzt, bevor sie produktiv aktiviert wird.

## Aufbewahrung

- Anonyme `content_article_events`: 180 Tage.
- Tägliche Performance-Snapshots: zunächst dauerhaft, da sie ausschließlich aggregierte Artikeldaten enthalten und die Lernkurve belegen.
- Fehlgeschlagene Providererklärungen: vorhandene Kosten- und Protokollfristen.

Ein täglicher beziehungsweise vorhandener Wartungsjob löscht abgelaufene anonyme Ereignisse idempotent.

## Deployment und Konfiguration

Die bestehende GSC-Konfiguration und die vorhandenen OpenAI-Werte werden wiederverwendet. Es sind keine neuen Pflichtwerte in `.env` und keine Änderungen an `docker-compose.yml` vorgesehen.

Der Rollout benötigt:

1. Migration 013,
2. Build von App und Content-Worker,
3. Migration vor und nach dem Recreate über den bereits gehärteten Deploymentprozess,
4. Schema- und Dry-Run-Prüfung,
5. Recreate von App und Worker,
6. einmaligen kontrollierten GSC-Sync und Performance-Auswertung.

Der Zeitplan 05:30 Uhr wird als versionierte interne Workerplanung umgesetzt und im Technikbereich lesbar angezeigt. Er ist in dieser Ausbaustufe kein frei änderbarer Modell- oder Tokenwert.

## Tests und Abnahmekriterien

Die Umsetzung erfolgt testgetrieben. Erforderlich sind mindestens:

1. 7-, 14- und 28-Tage-Aggregation mit exakt vollständiger GSC-Abdeckung.
2. Vorperiodenberechnung ohne überlappende Tage.
3. Neutrale Zustände bei jungen Artikeln, weniger als 50 Impressionen und Sync-Lücken.
4. Impressionsgewichtete Position und korrekte CTR ohne Division durch null.
5. Vergleichsgruppe desselben Clusters und Alters sowie definierter Fallback.
6. Null Klicks ab 50 Impressionen erzeugen genau einen Meta-/Intent-Kandidaten.
7. Unter 50 Impressionen entsteht kein negativer Kandidat.
8. CTA-Diagnose erst ab zehn organischen Klicks.
9. Kontaktweg-Diagnose erst ab fünf CTA-Klicks.
10. Positive Muster werden gespeichert.
11. Anonyme 7-Tage-Last-Touch-Zuordnung nur mit Analytics-Einwilligung.
12. Kein PII in Artikelereignissen, Snapshots oder OpenAI-Payloads.
13. CTA-Endpunkt mit CSRF, Same-Origin-Prüfung, Rate Limit, Whitelist und Deduplizierung.
14. Trackingfehler blockieren weder Navigation noch Kontaktanfrage.
15. OpenAI-Aufruf nur bei ausreichenden Daten und neuem Evidenz-Hash.
16. Providerfehler ändern nicht die deterministische Diagnose.
17. Lernvorschlag erst nach drei unterschiedlichen Artikeln derselben Diagnose.
18. Lernvorschlag bleibt bis zur Adminfreigabe wirkungslos.
19. Listenansicht, mobile Darstellung, Detailseite und verständliche Leerzustände.
20. Adminauthentifizierung und CSRF für Detail- und Revisionsaktionen.
21. KI-Revision verändert den Liveartikel nicht automatisch.
22. Echte PostgreSQL-Integration für Migration, Idempotenz, Nebenläufigkeit, Ereignisdeduplizierung und Aggregationen.
23. Vollständige bestehende Testsuite, Produktions-Build, Content-Agent-Dry-Run und `git diff --check`.

## Erfolgskriterium

Nach dem Rollout kann ein Administrator für jeden veröffentlichten Blogartikel sofort erkennen:

- wie viele Impressionen und Klicks in 7, 14 und 28 Tagen entstanden,
- ob die Daten vollständig und belastbar sind,
- wie sich der Artikel gegenüber vorher und gegenüber ähnlichen Artikeln entwickelt,
- an welcher Stufe zwischen Sichtbarkeit und Kontaktanfrage Potenzial verloren geht,
- welche konkrete, kontrollierte Optimierung sinnvoll ist,
- ob daraus bereits eine artikelübergreifende Lernbeobachtung oder freigabepflichtige Lernregel entstanden ist.

Das System lernt damit aus echten Ergebnissen, ohne einzelne schwache Zahlen zu überinterpretieren und ohne veröffentlichte Inhalte oder zukünftige Regeln eigenmächtig zu verändern.
