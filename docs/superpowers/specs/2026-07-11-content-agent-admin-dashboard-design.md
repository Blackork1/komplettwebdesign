# Content-Agent-Admin-Dashboard – Designspezifikation

**Datum:** 11. Juli 2026  
**Projekt:** Komplett Webdesign  
**Status:** Fachlich und technisch bestätigt  
**Bezug:** Erweiterung der Designspezifikation `2026-07-10-automatisierte-blogartikel-content-agent-design.md`  
**Ziel:** Den bestehenden Content-Agenten vollständig aus dem geschützten Adminbereich steuern, Entwürfe frontendnah prüfen, Jobs nachvollziehen und eine spätere Direktveröffentlichung sicher aktivieren, ohne betriebliche Einstellungen regelmäßig über `.env` ändern zu müssen.

## 1. Ausgangssituation

Der Content-Agent für Plan A ist bereits als separater Worker mit PostgreSQL-Queue, OpenAI-gestützter Themen-, Briefing-, Artikel- und Bildpipeline, Kostenkontrolle, Retry-Mechanismus, Entwurfsspeicherung und geschützter Adminvorschau umgesetzt.

Die operative Konfiguration wird derzeit überwiegend aus `.env` gelesen. Dazu gehören unter anderem Aktivierung, Veröffentlichungsmodus, Cron-Ausdruck, Zeitzone, maximale Versuche und Monatsbudget. Die bestehende Tabelle `content_agent_settings` enthält bereits grundlegende Felder für Zeitplan, Auto-Publishing, Mindestscore und manuelle Freigaben, wird aber noch nicht als vollständige dynamische Laufzeitkonfiguration verwendet.

Das Deployment auf dem IONOS-VPS aktualisiert durch einen Push auf `main` ausschließlich den Repository-Inhalt im Serververzeichnis. Dateien außerhalb davon, insbesondere die produktive `.env`, `docker-compose.yml` und `deploy.sh`, werden manuell gepflegt.

## 2. Bestätigte Produktentscheidungen

Die folgenden Entscheidungen sind verbindlich:

1. Sichere Betriebswerte werden in PostgreSQL gespeichert und ohne Container-Neustart wirksam.
2. `.env` bleibt für Geheimnisse, technische Expertenwerte und absolute Sicherheitsgrenzen zuständig.
3. Das Dashboard überschreibt `.env` nicht.
4. Der Content-Agent erhält die Modi `deaktiviert`, `Review` und `Direkt veröffentlichen`.
5. Der Standardzeitplan ist Montag und Donnerstag um 18:00 Uhr in `Europe/Berlin`.
6. Wochentage, gemeinsame Uhrzeit und Zeitzone sind später frei änderbar.
7. „Jetzt Entwurf erstellen“ erzeugt ausnahmslos einen Entwurf, selbst wenn der Agent auf Direktveröffentlichung steht.
8. Direktveröffentlichung ist erst nach mindestens acht manuell freigegebenen KI-Artikeln möglich.
9. Direktveröffentlichung verlangt einen Qualitätsscore von mindestens 90.
10. Risikothemen und ungeprüfte aktuelle Aussagen bleiben immer im Review.
11. Automatisch freigegebene Artikel werden unmittelbar nach erfolgreicher Generierung veröffentlicht; ein separater Veröffentlichungstermin ist nicht vorgesehen.
12. Fehlgeschlagene Jobs werden am letzten sicheren Schritt fortgesetzt und dürfen keine doppelten Artikel oder Bilder erzeugen.
13. OpenAI-Modelle, Tokenpreise, Worker-Polling und Lease-Dauer werden im Dashboard angezeigt, aber nicht bearbeitet.
14. Es gibt keinen separaten Artikel-Test- oder Simulationsmodus.
15. Unveröffentlichte Artikel erhalten eine geschützte, frontendnahe Vorschau.
16. Bestehende Artikel werden geprüft, aber niemals automatisch überschrieben.

## 3. Ziele

Das Dashboard soll:

- eine schnelle Betriebsübersicht bieten,
- Agent und Zeitplan ohne Serverzugriff steuerbar machen,
- Monatsbudget und Qualitätsgrenzen sicher verwalten,
- manuelle Entwurfserstellung ermöglichen,
- Entwürfe, Meta-Daten, Bild, FAQ und Prüfhinweise zusammenführen,
- kritische Prüfstellen exakt hervorheben,
- fehlgeschlagene Jobs sicher fortsetzen,
- bereinigte Jobprotokolle anzeigen,
- technische Expertenwerte transparent, aber schreibgeschützt darstellen,
- die Voraussetzungen für Direktveröffentlichung sichtbar machen,
- Bestandsartikel strukturell und inhaltlich prüfen,
- jede relevante Adminänderung nachvollziehbar protokollieren.

## 4. Nicht-Ziele dieser Ausbaustufe

Diese Ausbaustufe enthält ausdrücklich nicht:

- das Schreiben von `.env` aus dem Browser,
- die Bearbeitung von API-Schlüsseln im Adminbereich,
- die Bearbeitung von OpenAI-Modellen oder Tokenpreisen im Adminbereich,
- die Bearbeitung von Worker-Polling oder Lease-Dauer im Adminbereich,
- die Google-Search-Console-API,
- die automatische Auswertung von Klicks, Impressionen, CTR oder Positionen,
- die automatische Veröffentlichung oder Überschreibung von Bestandsartikel-Überarbeitungen,
- einen separaten Veröffentlichungskalender,
- eine zweite externe Scheduler-Infrastruktur,
- einen No-Code-Workflow als Kernsystem.

## 5. Zielarchitektur

### 5.1 Konfigurationshierarchie

Die wirksame Konfiguration besitzt drei Ebenen:

```text
.env: Geheimnisse und absolute Sicherheitsgrenzen
  → PostgreSQL: veränderbare Betriebswerte
    → Job-Snapshot: unveränderliche Werte eines gestarteten Jobs
```

Die Anwendung bildet aus `.env` und PostgreSQL eine validierte Laufzeitkonfiguration. PostgreSQL darf keine absolute Grenze aus `.env` aufweichen.

Beispiele:

- Bei einer absoluten Budgetgrenze von 100 Euro darf das Dashboard höchstens 100 Euro speichern.
- Der Auto-Publish-Mindestscore darf nie unter 90 liegen.
- Wenn `CONTENT_AGENT_AUTOPUBLISH_ENABLED=false` gesetzt ist, kann das Dashboard Direktveröffentlichung nicht wirksam aktivieren.
- Ein technisch deaktivierter Agent kann nicht allein durch einen Datenbankwert gestartet werden.

Die bisherigen Variablen werden nach der Umstellung eindeutig eingeordnet:

| Variable | Neue Rolle |
|---|---|
| `CONTENT_AGENT_ENABLED` | absoluter technischer Hauptschalter; muss zusätzlich zum Datenbankschalter aktiv sein |
| `CONTENT_AGENT_AUTOPUBLISH_ENABLED` | absolute technische Freigabe für Auto-Publishing |
| `CONTENT_AGENT_MONTHLY_COST_LIMIT_EUR` | absolute Budgetobergrenze |
| `CONTENT_AGENT_MAX_ATTEMPTS` | technische Obergrenze für den im Dashboard gewählten Wert |
| `CONTENT_AGENT_PUBLISH_MODE` | nach erfolgreicher Migration veraltet; nur einmaliger Bootstrap-Fallback, falls noch kein Einstellungssatz existiert |
| `CONTENT_AGENT_SCHEDULE` | nach erfolgreicher Migration veraltet; nur einmaliger Bootstrap-Fallback, falls noch kein Einstellungssatz existiert |
| `CONTENT_AGENT_TIMEZONE` | nach erfolgreicher Migration veraltet; nur einmaliger Bootstrap-Fallback, falls noch kein Einstellungssatz existiert |
| Modell-, Preis-, Polling- und Lease-Variablen | technische, schreibgeschützte Laufzeitwerte |

Sobald der Einstellungssatz erfolgreich angelegt oder migriert wurde, sind Betriebsmodus, Wochentage, Uhrzeit, Zeitzone, Budget und gewählte Versuche ausschließlich aus PostgreSQL zu lesen. Ein später geänderter veralteter `.env`-Wert darf die Dashboardkonfiguration nicht still überschreiben.

### 5.2 Verantwortlichkeiten des Webprozesses

Der Webprozess ist zuständig für:

- Adminseiten und Berechtigungsprüfung,
- Lesen und Ändern der sicheren Betriebswerte,
- Validierung und Audit-Protokollierung,
- Anlegen manueller Entwurfsjobs,
- Listen, Vorschauen und Bearbeitung von Entwürfen,
- manuelle Freigaben und Veröffentlichungen,
- Anzeige von Workerstatus, Jobs und Protokollen.

Lange KI-, Bild- und Auditoperationen werden weiterhin nicht innerhalb eines HTTP-Requests ausgeführt.

### 5.3 Verantwortlichkeiten des Workers

Der Content-Worker ist zuständig für:

- Heartbeat,
- regelmäßige Prüfung fälliger Termine,
- atomisches Anlegen eindeutiger Termin-Jobs,
- Lesen der wirksamen Konfiguration vor einem neuen Job,
- Speichern eines Job-Snapshots,
- Verarbeitung und Wiederaufnahme von Jobs,
- Kostenreservierung und Kostenverbuchung,
- Entwurfsspeicherung,
- sichere Auto-Publish-Entscheidung,
- strukturierte Status- und Fehlerberichte.

## 6. Informationsarchitektur des Dashboards

Der vorhandene Adminbereich erhält einen eigenen Hauptreiter `Content-Agent`. Das bestätigte Layout ist ein Cockpit mit horizontalen Unterreitern.

### 6.1 Übersicht

Die Übersicht zeigt:

- Agent aktiv oder pausiert,
- aktuellen Betriebsmodus,
- nächsten und weitere geplante Termine,
- verbrauchtes und erlaubtes Monatsbudget,
- offene Entwürfe,
- fehlgeschlagene oder blockierte Jobs,
- Anzahl manuell genehmigter KI-Artikel,
- Fortschritt zur sicheren Direktveröffentlichung,
- Worker-, Datenbank-, OpenAI- und Bilddienststatus,
- letzte erfolgreiche oder fehlgeschlagene Aktivität.

Primäre Aktionen:

- `Jetzt Entwurf erstellen`,
- `Agent pausieren` beziehungsweise `Agent aktivieren`,
- Entwurf prüfen,
- fehlgeschlagenen Job fortsetzen.

Vor der manuellen Erstellung zeigt ein Bestätigungsdialog den aktuellen Budgetstand. Der daraus entstehende Job verwendet immer `forced_mode=review`.

### 6.2 Entwürfe und bestehende Inhalte

Die Entwurfsliste zeigt mindestens:

- Titel und Kurzbeschreibung,
- Erstellungsdatum,
- Hauptkeyword und Content-Cluster,
- Qualitätsscore,
- Workflowstatus,
- bisherige Kosten,
- Risiko- und Faktenhinweise,
- Beitragsbild,
- Ursache einer notwendigen Prüfung.

Aktionen:

- frontendnahe Vorschau,
- Artikel bearbeiten,
- Meta-Daten bearbeiten,
- Bild neu generieren,
- FAQ neu erstellen,
- vollständige Überarbeitung anfordern,
- manuell veröffentlichen,
- Entwurf ablehnen.

Die Unteransicht `Bestehende Inhalte` zeigt Bestandsprüfungen und ermöglicht `Überarbeitung als Entwurf erstellen`. Eine veröffentlichte Version wird dadurch nicht verändert.

### 6.3 Zeitplan und Modus

Bearbeitbar sind:

- Agent aktiviert oder deaktiviert,
- Betriebsmodus `review` oder `auto_publish`,
- beliebige Wochentage,
- gemeinsame lokale Uhrzeit,
- Zeitzone,
- Monatsbudget innerhalb der technischen Obergrenze,
- Mindestscore, mindestens 90 für Auto-Publishing,
- maximale Jobversuche innerhalb der technischen Grenzen.

Beim Wechsel zu Direktveröffentlichung zeigt die Oberfläche jede Voraussetzung einzeln. Die Aktivierung wird serverseitig abgelehnt, solange eine Voraussetzung fehlt.

### 6.4 Jobs und Protokolle

Die Ansicht zeigt pro Job:

- Quelle und Jobtyp,
- Status,
- aktuelle und letzte erfolgreiche Stufe,
- Versuche und maximale Versuche,
- Start-, Aktualisierungs- und Abschlusszeitpunkt,
- Kosten und Tokenverbrauch,
- zugehörigen Entwurf,
- verständliche Fehlerursache,
- mögliche nächste Aktion.

`Job fortsetzen` übernimmt vorhandene Stufenergebnisse und verwendet dieselbe logische Jobidentität. Nur wenn eine Stufe technisch nicht wiederverwendbar ist, wird genau diese Stufe neu ausgeführt und entsprechend protokolliert.

### 6.5 Technik

Schreibgeschützt angezeigt werden:

- `OPENAI_CONTENT_MODEL`,
- `OPENAI_REVIEW_MODEL`,
- `OPENAI_IMAGE_MODEL`,
- konfigurierte Input-, Output- und Bildpreise,
- `CONTENT_AGENT_WORKER_POLL_MS`,
- `CONTENT_AGENT_JOB_LEASE_MINUTES`,
- technische Budgetobergrenze,
- `CONTENT_AGENT_AUTOPUBLISH_ENABLED`,
- Provider-Konfigurationsstatus,
- App- und Worker-Version.

Jeder Eintrag zeigt Wert, Quelle und gegebenenfalls den Hinweis `Worker-Neustart erforderlich`. Geheimwerte werden nur als `konfiguriert` oder `nicht konfiguriert` dargestellt.

## 7. Datenmodell

### 7.1 Erweiterung von `content_agent_settings`

Die Singleton-Tabelle mit `id=1` wird additiv erweitert:

| Feld | Typ | Regel |
|---|---|---|
| `agent_enabled` | Boolean | operativer Schalter |
| `operating_mode` | Text | `review` oder `auto_publish` |
| `schedule_weekdays` | Smallint-Array | eindeutige ISO-Wochentage 1–7 |
| `schedule_time` | Time ohne Zeitzone | gemeinsame lokale Uhrzeit |
| `timezone` | Text | gültige IANA-Zeitzone |
| `monthly_budget_cents` | Integer | nicht negativ, höchstens `.env`-Grenze |
| `auto_publish_min_score` | Integer | mindestens 90, höchstens 100 |
| `maximum_attempts` | Integer | innerhalb der technischen Grenze |
| `manual_approvals_count` | Integer | nur atomar durch echte Freigabe erhöht |
| `settings_version` | Integer | optimistische Nebenläufigkeitskontrolle |
| `updated_by` | FK | vorhandener Adminbenutzer |
| `updated_at` | Timestamptz | Änderungszeitpunkt |

Die vorhandenen Felder werden kontrolliert migriert. `schedule_enabled` wird zu `agent_enabled` umbenannt. `operating_mode` wird aus `auto_publish_enabled` initialisiert und ist danach die einzige fachliche Wahrheitsquelle für den Betriebsmodus. Das alte Feld `auto_publish_enabled` darf während einer Übergangsphase aus Kompatibilitätsgründen erhalten bleiben, wird aber nach erfolgreicher Migration nicht mehr von der Laufzeitlogik gelesen. Datenbank-Constraints begrenzen `operating_mode`, Score, Budget und Versuche; der Service validiert zusätzlich Eindeutigkeit und Wertebereich der Wochentage.

`agent_enabled=false` verhindert neue automatische und manuelle Jobs. Ein bereits laufender Job darf seine aktuelle Verarbeitung kontrolliert abschließen; wartende Jobs werden erst nach erneuter Aktivierung reserviert. Der Button `Jetzt Entwurf erstellen` ist im deaktivierten Zustand nicht ausführbar.

Standardwerte:

```text
agent_enabled = false
operating_mode = review
schedule_weekdays = [1, 4]
schedule_time = 18:00
timezone = Europe/Berlin
monthly_budget_cents = begrenzt durch die bestehende .env-Konfiguration
auto_publish_min_score = 90
maximum_attempts = 3
```

Die Migration startet bewusst mit `agent_enabled=false` und `operating_mode=review`. Dadurch löst das Deployment keinen ungeprüften Termin aus. Nach dem kontrollierten manuellen Entwurf aktiviert der Administrator den Zeitplan im Dashboard. Ein vorhandener `manual_approvals_count` bleibt erhalten.

### 7.2 Einstellungsrevisionen

Die neue Tabelle `content_agent_setting_revisions` speichert:

- Einstellungsschlüssel oder Einstellungsgruppe,
- vorherigen und neuen Wert,
- Adminbenutzer,
- Zeitpunkt,
- resultierende Einstellungsversionsnummer.

Geheimnisse und vollständige `.env`-Inhalte werden nicht gespeichert.

### 7.3 Terminidentität

Geplante Läufe erhalten einen kanonischen Idempotenzschlüssel, beispielsweise:

```text
weekly:2026-07-13:18:00:Europe/Berlin
```

Das vorhandene eindeutige Feld `content_jobs.idempotency_key` speichert diesen Wert. Die bestehende Unique-Regel verhindert doppelte Jobs für denselben Termin. Mehrere Worker dürfen den Termin gleichzeitig prüfen, aber nur einer darf den Job erfolgreich anlegen.

### 7.4 Job-Snapshot

Beim Start werden mindestens gespeichert:

- Betriebsmodus,
- Zeitplankontext und Quelle,
- wirksames Monatsbudget,
- Mindestscore,
- maximale Versuche,
- Modelle und Preisannahmen,
- erlaubte interne Links,
- Prompt- und Regelversion,
- Startzeitpunkt.

Dashboardänderungen beeinflussen nur neue Jobs.

### 7.5 Veröffentlichungsereignisse

Die neue Tabelle `content_publish_events` speichert manuelle und automatische Veröffentlichungen mit Typ, Beitrag, Job, Qualitätsscore, Adminbenutzer oder Worker, Zeitpunkt und Entscheidungsgründen.

Nur das erste manuelle Veröffentlichungsereignis eines KI-generierten Artikels erhöht `manual_approvals_count`. Wiederholte Requests, erneutes Speichern oder spätere Bearbeitungen dürfen den Zähler nicht erhöhen.

## 8. Scheduler und Kostenkontrolle

### 8.1 Dynamischer Scheduler

Statt eines statischen Wochen-Crons aus `.env` führt der Worker einen leichten, regelmäßigen Scheduler-Tick aus. Der Tick:

1. liest die aktuellen Einstellungen,
2. prüft Agentstatus, Wochentag, Uhrzeit und Zeitzone,
3. berechnet den kanonischen Termin,
4. versucht den Termin-Job atomar anzulegen,
5. beendet sich ohne Seiteneffekt, wenn der Termin schon existiert.

Die Zeitberechnung muss Sommer- und Winterzeit korrekt behandeln. Ein Termin darf bei einer Zeitumstellung höchstens einmal erzeugt werden.

### 8.2 Manueller Job

Der Adminbutton legt einen Job mit folgenden Eigenschaften an:

```text
source = admin_manual
job_type = generate_manual_draft
forced_mode = review
```

Dieser Job darf nicht automatisch veröffentlicht werden.

### 8.3 Budget

Vor jedem kostenpflichtigen Schritt wird geprüft:

```text
verbuchte Monatskosten
+ aktive Reservierungen
+ Reservierung des nächsten Schritts
<= wirksames Monatsbudget
```

Bei fehlendem Budget wird der Job pausiert beziehungsweise auf `needs_manual_attention` gesetzt. Bereits erfolgreiche Stufen und erzeugte Inhalte bleiben erhalten.

## 9. Artikel- und Veröffentlichungsablauf

Ein Job durchläuft:

```text
Budgetreservierung
→ Inventar und Bestandsabgleich
→ Themenbewertung
→ SEO-Briefing
→ Briefingvalidierung
→ strukturierte Artikelgenerierung
→ HTML-/Meta-/FAQ-/Link-/CTA-Prüfung
→ begrenzte Reparatur
→ Bildgenerierung und Upload
→ Qualitäts- und Risikobericht
→ Entwurf oder sichere Veröffentlichung
```

Jede Stufe speichert ihr Ergebnis. Die Wiederaufnahme beginnt an der ersten fehlenden oder ungültigen Stufe.

### 9.1 Entwurfsdaten

Der gespeicherte Entwurf umfasst weiterhin Titel, Kurzbeschreibung, Meta Title, Meta Description, Slug, OG-Daten, statisches Bootstrap-HTML, sichtbare FAQ, separates FAQ-JSON, Keywords, Suchintention, Zielgruppe, regionalen Fokus, Content-Cluster, interne Links, CTA-Daten, Bilddaten, Qualitätsscore, Kosten und Prüfbericht.

### 9.2 Manuelle Freigabe

Vor einer manuellen Veröffentlichung prüft das Backend erneut:

- eindeutigen gültigen Slug,
- vollständige Meta- und OG-Daten,
- statisches und erlaubtes HTML,
- vorhandenes Bild und Alt-Text,
- erlaubte interne Links,
- valides FAQ-JSON,
- technische Blocker,
- ausdrückliche Adminbestätigung.

Die Freigabe und Zählererhöhung erfolgen atomar.

### 9.3 Direktveröffentlichung

Auto-Publishing ist nur zulässig, wenn alle Bedingungen erfüllt sind:

```text
.env erlaubt Auto-Publishing
Dashboardmodus ist auto_publish
mindestens 8 manuelle KI-Freigaben
Qualitätsscore >= max(90, konfigurierter Mindestscore)
Monatsbudget nicht überschritten
keine Risikowarnung
keine ungeprüfte aktuelle Behauptung
alle deterministischen Qualitätsprüfungen bestanden
```

Fehlt eine Bedingung, wird ein Entwurf mit `Review erforderlich` gespeichert. Dies ist kein technischer Jobfehler.

## 10. Risikobericht und fokussierte Prüfung

Jede Warnung enthält:

- maschinenlesbare Kategorie,
- Schweregrad,
- betroffenen Abschnitt,
- kurzen Textausschnitt,
- Begründung,
- konkrete Prüfanweisung,
- benötigte Quelle oder Aktualitätsprüfung,
- Auto-Publish-Blocker.

Die Vorschau zeigt oberhalb des Artikels eine kompakte Prüfliste und Sprungmarken zu den betroffenen Abschnitten. Ziel ist, dass der Administrator nicht den gesamten Artikel lesen muss, um alle kritischen Aussagen zu kontrollieren.

Immer blockierend sind insbesondere:

- Rechts- und Datenschutzbehauptungen,
- Cookie- und Einwilligungsaussagen,
- konkrete Preise oder Förderungen,
- Google-Updates und Rankingänderungen,
- aktuelle Software- oder Produktversionen,
- aktuelle KI-Funktionen,
- technische Standards mit Versionsbezug,
- unbelegte Zahlen oder Statistiken,
- zeitbezogene Aussagen wie `aktuell`, `neu`, eine Jahreszahl oder ein konkretes Datum.

## 11. Bestandsprüfung

Veröffentlichte Artikel werden ohne automatische Änderung geprüft auf:

- ähnliche Themen und Kannibalisierung,
- fehlende oder problematische Meta-Daten,
- fehlende Kurzbeschreibung, OG-Daten oder Alt-Texte,
- ungültige interne Links,
- unvollständige FAQ-Daten,
- veraltete Jahres-, Versions- oder Preisaussagen,
- schwache CTA-Verknüpfung,
- strukturelle SEO-Probleme.

Eine Überarbeitung wird als separate prüfbare Revision beziehungsweise als Entwurf angelegt. Die veröffentlichte Version bleibt unverändert, bis ein Administrator ausdrücklich freigibt.

Die neue Tabelle `content_post_audits` speichert pro Prüfung mindestens Beitrag, Job beziehungsweise Run, Prüfzeitpunkt, zusammengefassten Status, Score, Befunde und empfohlene Aktionen. Frühere Prüfungen bleiben als Historie erhalten. `Bestehende Inhalte prüfen` legt einen regulären budgetierten Audit-Job an und verändert keinen Beitrag.

Ohne Search-Console-API ist die Bestandsprüfung zunächst technisch und inhaltlich. Leistungsdaten sind eine spätere Ausbaustufe.

## 12. Vorschau und Bearbeitung

Die Vorschau:

- ist nur für Administratoren erreichbar,
- verwendet das öffentliche Bloglayout,
- kennzeichnet sich deutlich als unveröffentlichte Vorschau,
- setzt `noindex`,
- rendert `static_html` ohne EJS-Auswertung,
- verwendet keine vom Artikel gelieferten Skripte oder Inline-Eventhandler,
- zeigt Risikoabschnitte und Sprungmarken außerhalb beziehungsweise kontrolliert um den Artikelinhalt.

Bearbeitbar sind mindestens Titel, Kurzbeschreibung, Slug, Meta Title, Meta Description, OG-Titel, OG-Beschreibung, Bild-Alt-Text, FAQ-Daten und Artikel-HTML. Jede Änderung wird serverseitig validiert.

## 13. Sicherheit

- Alle Routen verwenden die vorhandene Admin-Authentifizierung.
- Schreibaktionen verwenden keine `GET`-Requests.
- CSRF-Schutz gilt für Einstellungen, Jobaktionen, Ablehnung und Veröffentlichung.
- Alle Eingaben werden serverseitig validiert und normalisiert.
- Einstellungsupdates verwenden Transaktion und `settings_version`.
- Keine Route liest oder schreibt beliebige Dateien.
- Geheimwerte werden niemals an den Browser übertragen.
- Protokolle werden vor Speicherung beziehungsweise Ausgabe bereinigt.
- Vollständige Modellantworten und API-Schlüssel erscheinen nicht im Adminprotokoll.
- KI-generierter Inhalt wird nicht als EJS oder JavaScript ausgeführt.
- Kritische Aktionen benötigen eine Bestätigung.

Kritische Aktionen sind mindestens Agentpause, Umschalten auf Direktveröffentlichung, Veröffentlichung, Ablehnung, vollständige Neugenerierung und manuelles Fortsetzen eines endgültig fehlgeschlagenen Jobs.

## 14. Systemstatus und Fehlerdarstellung

Der Systemstatus basiert auf Heartbeats und letzten echten Verarbeitungsergebnissen. Ein Dashboardaufruf löst keinen kostenpflichtigen Providertest aus.

Angezeigt werden:

- letzter Worker-Heartbeat,
- letzter Scheduler-Tick,
- letzter erfolgreicher Job,
- letzter erfolgreicher OpenAI-Schritt,
- letzter erfolgreicher Bild-Upload,
- Datenbankstatus,
- hängende oder abgelaufene Leases,
- App- und Worker-Version.

Fehlerkategorien:

```text
Review erforderlich
Budgetgrenze erreicht
vorübergehender Providerfehler
ungültige Modellantwort
Bildgenerierung fehlgeschlagen
Upload fehlgeschlagen
Datenbankfehler
Lease abgelaufen
endgültig fehlgeschlagen
```

Die Oberfläche zeigt technische Details nur soweit sie zur Behebung nötig und sicher sind.

## 15. Routen- und Servicezuschnitt

Die genaue Benennung wird im Implementierungsplan an die vorhandene Projektstruktur angepasst. Fachlich werden getrennte Verantwortlichkeiten benötigt für:

- Dashboard-Leseansicht,
- validierte Einstellungsupdates,
- manuelle Jobanlage,
- Jobfortsetzung,
- Entwurfsliste und Bestandsprüfung,
- frontendnahe Vorschau,
- Metadaten- und Artikelbearbeitung,
- manuelle Veröffentlichung,
- technische Nur-Lese-Konfiguration,
- Audit- und Jobprotokolle.

Controller greifen nicht direkt auf SQL oder `process.env` zu. Repository-, Konfigurations-, Scheduler-, Publishing- und Präsentationslogik bleiben getrennt testbar.

## 16. Tests

Ein separater Artikel-Simulationsmodus wird nicht gebaut. Die Implementierung benötigt dennoch automatisierte Tests für:

- Einstellungsvalidierung und Grenzwerte,
- optimistische Nebenläufigkeitskontrolle,
- Adminberechtigungen und CSRF-Schutz,
- mehrere Wochentage zur gleichen Uhrzeit,
- IANA-Zeitzonen sowie Sommer- und Winterzeit,
- Termin-Idempotenz bei mehreren Workern,
- manuelle Erstellung immer als Entwurf,
- Budgetreservierung bei parallelen Jobs,
- sichere Jobfortsetzung,
- acht manuelle Freigaben ohne Doppelzählung,
- Mindestscore 90,
- jeden Auto-Publish-Blocker,
- Fallback von Auto-Publishing auf Review,
- Risiko- und Quellenhinweise,
- HTML-/EJS-Trennung,
- Meta-, FAQ-, Slug- und Linkvalidierung,
- bereinigte Protokolle,
- Datenbankmigration und PostgreSQL-Integration,
- bestehende Blog- und Content-Agent-Regressionstests.

Automatisierte Tests verwenden keine echten kostenpflichtigen OpenAI- oder Cloudinary-Aufrufe.

## 17. Einführung auf dem IONOS-VPS

Die spätere Implementierungs- und Deployment-Anleitung muss die tatsächliche Serverstruktur berücksichtigen:

```text
/apps/komplettwebdesign/
  docker-compose.yml
  .env
  deploy/
  data/
  server/   ← automatisch durch Git aktualisiert
```

Die Aktivierung erfolgt:

1. PostgreSQL-Backup,
2. Code-Deployment,
3. Migration,
4. Start beziehungsweise Neustart von App und Content-Worker,
5. Prüfung des Dashboards im Review-Modus,
6. Prüfung der technischen Nur-Lese-Werte,
7. manueller Entwurfsjob,
8. Kontrolle von Vorschau, Prüfbericht, Meta-Daten und Bild,
9. manuelle Freigabe,
10. Aktivierung des Zeitplans Montag und Donnerstag um 18:00 Uhr,
11. bewusste Freigabe von Direktveröffentlichung frühestens nach acht guten manuellen Freigaben.

Die Anleitung enthält vollständige Copy-and-Paste-Blöcke für jede erforderliche manuelle Änderung an `.env`, `docker-compose.yml` und `deploy.sh`. Änderungen im Repository dürfen nicht voraussetzen, dass diese Dateien außerhalb von `/server` automatisch aktualisiert werden.

## 18. Abnahmekriterien

Die Erweiterung ist fachlich abgeschlossen, wenn:

1. der Adminbereich einen eigenen Content-Agent-Reiter im bestätigten Cockpit-Layout besitzt,
2. sichere Betriebswerte ohne Neustart geändert werden können,
3. technische Expertenwerte vollständig, aber schreibgeschützt angezeigt werden,
4. Montag und Donnerstag um 18:00 Uhr als Standard gesetzt sind,
5. beliebige Wochentage, Zeit und Zeitzone gespeichert werden können,
6. geplante Termine auch mit mehreren Workern höchstens einen Job erzeugen,
7. manuelle Erstellung immer einen Entwurf erzeugt,
8. Entwürfe frontendnah und adminexklusiv angezeigt werden,
9. konkrete Prüfstellen direkt erreichbar sind,
10. fehlgeschlagene Jobs sicher fortgesetzt werden,
11. Bestandsartikel nur als Überarbeitungsentwurf verändert werden können,
12. Auto-Publishing vor acht Freigaben unmöglich ist,
13. Auto-Publishing unter Score 90 unmöglich ist,
14. Risikothemen niemals automatisch veröffentlicht werden,
15. Budget, Secrets, HTML-/EJS-Trennung und Auditregeln durch Tests abgesichert sind,
16. alle bestehenden Tests weiterhin erfolgreich sind,
17. eine exakte VPS-Anleitung für die manuell gepflegten Dateien vorliegt.

## 19. Offene Punkte

Für diese Ausbaustufe bestehen keine offenen fachlichen Entscheidungen. Die technische Dateiaufteilung, konkrete Migrationsschritte und testgetriebene Umsetzungsreihenfolge werden im nachgelagerten Implementierungsplan festgelegt.
