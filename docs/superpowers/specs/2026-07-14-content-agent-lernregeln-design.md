# Content-Agent-Lernregeln – Designspezifikation

## Ziel

Der Content-Agent soll wiederkehrende redaktionelle Prüfhinweise artikelübergreifend erkennen und daraus kontrollierte Lernregeln für zukünftige Blogartikel ableiten. Eine Regel darf niemals allein durch eine Modellantwort aktiv werden. Erst mindestens drei unterschiedliche Artikel mit demselben Fehlertyp erzeugen einen Vorschlag, und jede Aktivierung, Änderung, Pausierung oder Deaktivierung benötigt eine ausdrückliche Freigabe im geschützten Adminbereich.

Die Lernschicht verbessert neue Artikel bereits im SEO-Briefing und beim Schreiben. Der Reviewer kontrolliert anschließend, ob die zum Job gehörenden Regelversionen eingehalten wurden. Bereits veröffentlichte Artikel, laufende Jobs und vorhandene Entwürfe werden durch eine neue Regel nicht rückwirkend verändert.

## Abgrenzung

Die Funktion trainiert kein OpenAI-Modell und verändert keine Providerkonfiguration. Sie erweitert die bestehende Content-Agent-Orchestrierung um versionierte, lokale Regeln.

Nicht Bestandteil dieser Ausbaustufe sind:

- automatische Aktivierung oder automatische Änderung von Lernregeln,
- automatische Überarbeitung veröffentlichter Artikel,
- automatische Veröffentlichung als Folge einer Lernregel,
- freie, ungeprüfte Promptfragmente aus Modellantworten,
- ein Ranking-Modell, das GSC-Daten eigenständig in Schreibregeln umwandelt,
- eine rückwirkende Neubewertung aller vorhandenen Blogartikel.

## Leitprinzipien

1. **Artikel statt Optimierungsdurchläufe zählen:** Mehrere Hinweise oder Optimierungen desselben Artikels zählen pro Fehlerkategorie nur einmal für die Vorschlagsschwelle.
2. **Drei unterschiedliche Artikel:** Erst drei eindeutige Artikelbeobachtungen derselben Kategorie erzeugen einen Regelvorschlag.
3. **Manuelle Freigabe:** Vorschläge sind wirkungslos, bis ein Administrator sie ausdrücklich aktiviert.
4. **Unveränderliche Job-Snapshots:** Ein neuer Job erhält die zu seinem Start aktiven Regelversionen kanonisch sortiert und gehasht. Spätere Regeländerungen beeinflussen diesen Job nicht.
5. **Keine Veröffentlichung durch Lernen:** Beobachtung, Klassifizierung, Aktivierung und Optimierung dürfen keinen Beitrag veröffentlichen oder freigeben.
6. **Ausfallsicher:** Fehler in der Beobachtung oder Klassifizierung dürfen die normale Entwurfs- und Veröffentlichungslogik nicht blockieren.
7. **Nachvollziehbar:** Jede Beobachtung, Klassifizierung, Freigabe und Regelversion bleibt revisionssicher nachvollziehbar.

## Architektur

### 1. Kontrollierte Taxonomie

Eine versionierte lokale Taxonomie enthält zunächst folgende Kategorien:

| Schlüssel | Bedeutung |
|---|---|
| `generic_content` | Aussagen sind zu allgemein, oberflächlich oder austauschbar. |
| `cta_repetition_or_fit` | CTAs wiederholen sich oder passen nicht präzise zum Entscheidungsschritt. |
| `examples_or_local_relevance` | Konkrete Beispiele, Branchenszenarien oder sinnvoller lokaler Bezug fehlen. |
| `decision_support` | Der Artikel erleichtert die beabsichtigte Entscheidung nicht ausreichend. |
| `technical_precision` | Fachliche Erklärungen bleiben unpräzise oder wichtige Zusammenhänge fehlen. |
| `structure_or_readability` | Aufbau, Überschriften, Wiederholungen oder Lesbarkeit sind schwach. |
| `search_intent_coverage` | Suchintention oder erforderliche Themenabdeckung wird nicht vollständig erfüllt. |
| `internal_linking` | Interne Verlinkung ist ungeeignet, unnatürlich oder unvollständig. |
| `claims_and_sources` | Aktuelle, rechtliche, technische oder andere belegpflichtige Aussagen sind unzureichend abgesichert. |
| `tone_or_brand_fit` | Tonalität, Du-Ansprache oder Markenwirkung passen nicht zu Komplett Webdesign. |

Die Taxonomie enthält für jede Kategorie sichere lokale Erkennungssignale, eine verständliche Bezeichnung, eine kurze Erklärung, eine zulässige Standardregel und die Stufen, in denen die Regel wirken darf. Taxonomieschlüssel und Version werden im Content-Regelmanifest geführt.

### 2. Hybride Klassifizierung

Bekannte Hinweise werden lokal anhand validierter Codes, Verifikationstypen und normalisierter Textsignale klassifiziert. Die Klassifizierung ist deterministisch und verursacht keine Providerkosten.

Kann ein Hinweis nicht sicher lokal eingeordnet werden, wird ein normalisierter Fingerabdruck gebildet. Für einen noch nicht klassifizierten Fingerabdruck ist höchstens ein kurzer strukturierter OpenAI-Aufruf erlaubt. Das Schema lässt ausschließlich Folgendes zu:

- einen vorhandenen Taxonomieschlüssel oder `unclassified`,
- eine knappe Begründung,
- eine Konfidenz zwischen 0 und 1.

Nur eine vorhandene Kategorie mit ausreichender Konfidenz wird übernommen. Die Modellantwort darf keine Regel aktivieren, keine neuen Promptrollen definieren und keinen ausführbaren Inhalt speichern. Ergebnis und Providerkosten werden gespeichert und bei demselben Fingerabdruck wiederverwendet.

Scheitert die Klassifizierung, bleibt die Beobachtung als `unclassified` erhalten. Der Artikelworkflow läuft weiter.

### 3. Beobachtungen

Nach jeder erfolgreich persistierten Qualitätsprüfung sammelt die Lernschicht die fokussierten redaktionellen Prüfhinweise. Technische Validierungsfehler und blockierte Risikoberichte werden nicht als redaktionelle Lernbelege verwendet.

Die Sammlung läuft nicht innerhalb des kostenpflichtigen Generierungs- oder Optimierungsschritts. Nach dem atomaren Speichern eines neuen Prüfberichts wird idempotent ein interner Job vom Typ `process_learning_observations` eingereiht. Dieser Job liest ausschließlich die gespeicherte Artikel-ID und Review-Version. Initiale Entwürfe und spätere Prüfhinweisoptimierungen verwenden denselben Einstiegspunkt. Ist bereits ein Job für dieselbe Artikel-ID und Review-Version vorhanden, wird kein zweiter Job angelegt.

Eine Beobachtung enthält mindestens:

- Artikel-ID,
- Review-Version,
- Kategorie oder `unclassified`,
- normalisierten Fingerabdruck,
- begrenzte und bereinigte Begründung,
- begrenzte und bereinigte Prüfanweisung,
- Abschnitt beziehungsweise Anker,
- Zeitpunkt,
- Herkunft und verwendete Taxonomieversion.

Die Datenbank erzwingt die Eindeutigkeit pro Artikel und klassifizierter Kategorie. Unklassifizierte Beobachtungen sind stattdessen pro Artikel und Fingerabdruck eindeutig, damit zwei verschiedene unbekannte Hinweise desselben Artikels nicht zusammenfallen. Eine spätere Review-Version desselben Artikels kann das Beispiel aktualisieren, erhöht aber nicht die Anzahl unterschiedlicher Artikel. Der Quelltext des gesamten Artikels wird nicht in der Beobachtung dupliziert.

### 4. Regelvorschläge und Regeln

Sobald mindestens drei unterschiedliche Artikel derselben Kategorie beobachtet wurden, wird idempotent ein offener Regelvorschlag erzeugt. Existiert bereits ein offener oder aktiver Vorschlag derselben Kategorie, entsteht kein Duplikat.

Ein Vorschlag enthält:

- Kategorie und verständlichen Namen,
- Anzahl unterschiedlicher Artikel,
- Referenzen auf die betroffenen Artikel,
- bis zu fünf bereinigte Beispielhinweise,
- vorgeschlagenen Regeltext,
- betroffene Stufen,
- erwartete Wirkung,
- Hinweis auf mögliche Überanpassung,
- Status `pending`, `approved`, `rejected` oder `superseded`.

Der vorgeschlagene Regeltext stammt bei bekannten Kategorien aus einer geprüften lokalen Vorlage. Bei einer späteren Erweiterung um unbekannte Kategorien müsste zuerst die Taxonomie per Codeänderung erweitert werden; ein Modell darf keine freie Kategorie automatisch in eine produktive Regel überführen.

Beim Aktivieren wird aus dem Vorschlag eine versionierte Regel. Der Administrator darf den begrenzten Regeltext vor Aktivierung bearbeiten. Jede weitere Bearbeitung erzeugt eine neue Version. Mögliche Regelzustände sind `active`, `paused` und `disabled`.

## Datenmodell

Eine neue Migration legt folgende Tabellen an:

### `content_learning_observations`

- Primärschlüssel
- `post_id` mit Fremdschlüssel auf den Blogartikel
- `review_version`
- `category_key`
- `fingerprint`
- bereinigte Begründung und Prüfanweisung
- Abschnitt und Anker
- `classification_source` (`local`, `provider`, `unclassified`)
- Konfidenz
- Taxonomieversion
- Zeitstempel
- partieller eindeutiger Index auf `(post_id, category_key)` für klassifizierte Beobachtungen
- partieller eindeutiger Index auf `(post_id, fingerprint)` für unklassifizierte Beobachtungen

### `content_learning_classifications`

- normalisierter Fingerabdruck als eindeutiger Schlüssel
- Kategorie oder `unclassified`
- Quelle und Konfidenz
- begrenzte Begründung
- Providerreservierung beziehungsweise Kostenreferenz
- Taxonomieversion und Zeitstempel

### `content_learning_rule_proposals`

- Primärschlüssel
- eindeutige offene Kategorie
- Status
- vorgeschlagener Regeltext und betroffene Stufen
- Beleganzahl und bereinigte Beispiele als JSON
- Erstellungs-, Entscheidungs- und Adminmetadaten

### `content_learning_rules`

- stabile Regel-ID
- Kategorie
- Status
- aktuelle Versionsnummer
- Zeitstempel und Adminmetadaten

### `content_learning_rule_versions`

- Regel-ID und Versionsnummer als zusammengesetzter Schlüssel
- exakter freigegebener Regeltext
- betroffene Stufen
- kanonischer Hash
- Herkunftsvorschlag
- Zeitstempel und Adminmetadaten

Der interne Beobachtungsjob erhält einen normalen Content-Run. Eine notwendige unbekannte Klassifizierung verwendet das bestehende konfigurierte Reviewmodell, die vorhandenen Review-Tokenpreise sowie die bestehende Reservierungs- und Abrechnungslogik; es gibt keine neue Modell- oder Preisoption. Es werden keine Geheimnisse oder vollständigen Providerantworten in Adminansichten ausgegeben.

## Runtime-Snapshot und Promptintegration

Beim Einreihen eines neuen Generierungsjobs lädt der Scheduler alle aktiven Regeln und bildet daraus eine kanonisch nach Regel-ID und Version sortierte Liste. Jede Regel im Snapshot enthält nur:

- Regel-ID,
- Version,
- Kategorie,
- begrenzten freigegebenen Regeltext,
- erlaubte Zielstufen,
- Regelhash.

Die vollständige Liste erhält zusätzlich einen Hash. Größen-, Zeichen- und Schemaprüfungen verhindern überlange oder manipulierte Snapshots. Die dynamischen Regeln ergänzen das statische Content-Regelmanifest, ersetzen es aber nicht.

Die Einbindung erfolgt in drei Stufen:

1. **SEO-Briefing:** Aktive Regeln werden als überprüfbare Planungsanforderungen übergeben. Das Briefing soll beispielsweise konkrete Szenarien oder voneinander abgegrenzte CTAs bereits vorsehen.
2. **Article Writer:** Der Writer erhält ausschließlich die für `writer` freigegebenen, unveränderlichen Regeln aus dem Job-Snapshot.
3. **Article Reviewer:** Der Reviewer erhält dieselben relevanten Regel-IDs und prüft ihre Einhaltung. Neue Hinweise behalten eine Kategoriezuordnung, damit die Wirksamkeit messbar wird.

Bei einer gezielten Prüfhinweisoptimierung wird nur die zum ausgewählten Hinweis passende aktive Regel verwendet. Eine Sammeloptimierung verwendet die zu den ausgewählten Kategorien passenden Regeln. Unabhängige aktive Regeln lösen keine zusätzliche Komplettüberarbeitung aus.

## Adminbereich

Das Content-Agent-Dashboard erhält den Reiter „Lernregeln“ mit vier Bereichen:

### Neue Vorschläge

Jeder Vorschlag zeigt Kategorie, Regelname, Anzahl unterschiedlicher Artikel, bereinigte Beispiele, Links zu den betroffenen Entwürfen, den exakten vorgeschlagenen Regeltext, Zielstufen, erwartete Wirkung und Überanpassungswarnung.

Aktionen:

- unverändert aktivieren,
- Regeltext bearbeiten und aktivieren,
- ablehnen.

### Aktive Regeln

Die Liste zeigt Zustand, Version, Regeltext, Zielstufen, Aktivierungszeitpunkt, betroffene neue Artikel und aktuellen Wirksamkeitsstatus.

Aktionen:

- neue Version anlegen,
- pausieren,
- wieder aktivieren,
- dauerhaft deaktivieren.

### Beobachtungen

Die Übersicht zeigt Kategorien, Anzahl unterschiedlicher Artikel, letzte Beobachtung und verlinkte Artikel. Unklassifizierte Hinweise werden separat ausgewiesen. Wiederholte Optimierungen desselben Artikels erhöhen den Artikelzähler nicht.

### Verlauf

Der Verlauf zeigt Vorschlagserstellung, Bearbeitung, Aktivierung, Ablehnung, Pausierung, Reaktivierung und Deaktivierung mit Administrator und Zeitpunkt.

Alle Schreibaktionen benötigen Adminauthentifizierung, CSRF-Schutz, eine aktuelle Versionssperre und eine ausdrückliche Bestätigung. Regeltexte erlauben nur begrenzten Klartext ohne HTML, Skripte, Rollenmarkierungen oder Steuerzeichen.

## Wirksamkeitsmessung

Für jede Regelversion werden ausschließlich neue Artikel betrachtet, deren Job-Snapshot diese Version enthält. Gemessen werden:

- Anzahl erzeugter Artikel mit der Regelversion,
- erneutes Auftreten derselben Kategorie,
- Einhaltungsquote laut Reviewer,
- durchschnittlicher Qualitätsscore dieser Artikel,
- Qualitätsscore einer begrenzten Vergleichsgruppe vor Aktivierung,
- GSC-Klicks, Impressionen, CTR und Position später nur als beschreibender Zusatzkontext.

Erst ab fünf neuen Artikeln mit derselben Regelversion wird ein Wirksamkeitsstatus berechnet:

- `effective`: Die Kategorie tritt nicht oder deutlich seltener auf.
- `observing`: Es liegen noch keine eindeutigen Daten vor.
- `revision_recommended`: Die Kategorie tritt weiterhin wiederholt auf.

Ein Status ändert niemals automatisch die Regel. Bei `revision_recommended` erscheint lediglich ein administrativer Hinweis zur manuellen Überarbeitung. Einzelne GSC-Werte aktivieren, verändern oder deaktivieren keine Regel.

## Nebenläufigkeit und Idempotenz

- Beobachtungen werden per Upsert und eindeutigen Indizes erfasst.
- Pro Artikel-ID und Review-Version wird höchstens ein interner Beobachtungsjob eingereiht.
- Die Drei-Artikel-Schwelle wird innerhalb einer Transaktion mit Sperre auf die Kategorie ausgewertet.
- Pro Kategorie darf höchstens ein offener Vorschlag existieren.
- Aktivierungen verwenden eine erwartete Vorschlags- und Regelversion; veraltete Formulare werden abgewiesen.
- Ein Job speichert seine Regelversionen genau einmal im Runtime-Snapshot.
- Providerklassifizierungen verwenden die vorhandene Reservierungs-, Persistenz- und Wiederaufnahmelogik. Offene unklare Providerreservierungen werden nicht automatisch erneut ausgeführt.

## Fehlerbehandlung

- Kann eine Beobachtung nicht gespeichert werden, nutzt der separate Beobachtungsjob die bestehende begrenzte Retry- und Lease-Logik; der bereits erzeugte Entwurf bleibt erhalten.
- Kann ein Hinweis nicht klassifiziert werden, bleibt er als `unclassified` sichtbar.
- Ist eine aktive Regel ungültig oder überschreitet sie die Grenzen, wird sie nicht in einen neuen Snapshot aufgenommen und der Konfigurationsfehler im Adminbereich angezeigt. Bereits gültig gestartete Jobs bleiben unverändert.
- Fehler bei der Wirksamkeitsberechnung verändern keine Regeln.
- Alle Adminaktionen liefern verständliche deutsche Statusmeldungen, ohne interne SQL-, Prompt- oder Providerdetails offenzulegen.

## Sicherheit

- Regeltexte werden als reiner Klartext gespeichert und bei Ausgabe escaped.
- HTML, EJS, Skripte, Steuerzeichen, Rollenpräfixe und Prompt-Trennmarker werden blockiert.
- Beispiele aus Prüfhinweisen werden längenbegrenzt, normalisiert und escaped.
- Adminlisten enthalten keine vollständigen Artikelinhalte und keine Providerantworten.
- Die Lernschicht erhält keine neue öffentliche Route.
- Es gibt keine neue `.env`-Pflichtkonfiguration. Vorhandene Modell-, Budget- und Providerwerte bleiben schreibgeschützt beziehungsweise werden über die bestehende Content-Agent-Konfiguration verwendet.

## Tests und Abnahme

Die Umsetzung erfolgt testgetrieben. Erforderliche Testgruppen:

1. Lokale Taxonomieklassifizierung und sichere Normalisierung.
2. Unbekannte Hinweise, Fingerprint-Caching und Providerfehler.
3. Eindeutigkeit pro Artikel und Kategorie.
4. Vorschlag exakt nach drei unterschiedlichen Artikeln, nicht nach drei Reviews desselben Artikels.
5. Keine doppelten Vorschläge bei Nebenläufigkeit.
6. Adminauthentifizierung, CSRF, Bestätigung und Versionssperren.
7. Aktivieren, Bearbeiten, Ablehnen, Pausieren, Reaktivieren und Deaktivieren.
8. Kanonischer Runtime-Snapshot mit Regel- und Listenhash.
9. Integration in SEO-Briefing, Writer und Reviewer.
10. Gezielte Optimierung verwendet nur passende Regeln.
11. Wirksamkeitsstatus erst nach fünf neuen Artikeln.
12. Lernfehler blockieren weder Entwurf noch Veröffentlichung.
13. Veröffentlichung wird durch keine Lernaktion ausgelöst.
14. Echte PostgreSQL-Integration für Migration, Schwelle, Aktivierung, Snapshot und Nebenläufigkeit.
15. Vollständige bestehende Testsuite, Produktions-Build und `git diff --check`.

## Rollout

Die Funktion startet nach der Migration mit leerer Beobachtungs- und Regeldatenbank. Es findet keine automatische Rückanalyse aller vorhandenen Artikel statt. Neue Prüfberichte füllen die Beobachtungen schrittweise. Der Adminbereich zeigt anfangs entsprechend noch keine Vorschläge.

Alle Regeln beginnen als Vorschlag und bleiben bis zur manuellen Freigabe wirkungslos. Das bestehende Reviewverfahren, die Acht-Artikel-Sicherheitsphase und die Veröffentlichungsregeln bleiben unverändert.

Der VPS-Rollout benötigt die neue Datenbankmigration sowie einen Recreate von App und Content-Worker über den bestehenden Deploymentprozess. Änderungen an `.env` oder `docker-compose.yml` sind nicht erforderlich.
