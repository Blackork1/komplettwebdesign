# Content-Agent: Vorab-Erstellung, redaktionelle Freigabe und Terminveröffentlichung

Datum: 12. Juli 2026  
Status: Vom Nutzer im Dialog fachlich bestätigt und schriftlich selbst geprüft

## 1. Ziel

Der Content-Agent soll reguläre Blogartikel vor dem eigentlichen Veröffentlichungstermin erzeugen. Der Administrator erhält unmittelbar nach der erfolgreichen Erstellung eine E-Mail, prüft den Entwurf im geschützten Adminbereich und gibt ihn für den geplanten Termin frei. Eine Freigabe vor dem Termin veröffentlicht den Beitrag nicht sofort. Ohne Freigabe bleibt der Beitrag auch nach Ablauf des Termins unveröffentlicht.

Für den Start gilt:

- reguläre Veröffentlichung montags und donnerstags um 18:00 Uhr in `Europe/Berlin`, soweit im Adminbereich nicht anders eingestellt;
- standardmäßig vier Stunden Erstellungsvorlauf;
- der Erstellungsvorlauf ist im Adminbereich einstellbar;
- der Betriebsmodus bleibt zunächst `review`;
- automatische Veröffentlichung ohne manuelle Freigabe bleibt durch die vorhandenen Sicherheitsregeln gesperrt;
- Newsletter-Benachrichtigungen werden vollständig vorbereitet, bleiben aber zunächst deaktiviert und sind erst nach acht erfolgreich manuell freigegebenen KI-Artikeln aktivierbar.

## 2. Verbindliche Produktentscheidungen

1. Die Zeitangabe im Content-Agent-Zeitplan bezeichnet künftig den Veröffentlichungstermin.
2. Der Agent startet die Erstellung um den eingestellten Vorlauf früher.
3. Der Vorlauf wird in ganzen Stunden gespeichert, ist im Adminbereich zwischen 1 und 48 Stunden einstellbar und hat den Standardwert 4.
4. Nach erfolgreicher Entwurfserstellung wird eine Admin-Prüfmail eingeplant.
5. Ein SMTP-Fehler darf weder den Entwurf noch den Erstellungsjob zurückrollen oder als fehlgeschlagen markieren.
6. Fehlgeschlagene Admin-Mails werden automatisch erneut versucht.
7. Eine redaktionelle Freigabe vor dem Veröffentlichungstermin plant den Beitrag für diesen Termin ein.
8. Ohne Freigabe wird zum Veröffentlichungstermin nichts veröffentlicht.
9. Nach einem verpassten Termin kann der Administrator entweder sofort veröffentlichen oder ein beliebiges zukünftiges Datum mit Uhrzeit wählen.
10. Änderungen am Inhalt nach einer Freigabe widerrufen die Freigabe und verhindern eine ungeprüfte Veröffentlichung.
11. Newsletter-Abonnenten werden niemals über Entwürfe informiert. Eine Newsletter-Mail darf erst nach der tatsächlichen Veröffentlichung entstehen.
12. Der Newsletter-Schalter bleibt bis zur achten erfolgreich manuell freigegebenen und veröffentlichten KI-Arbeit gesperrt.

## 3. Abgrenzung

### 3.1 Bestandteil dieser Ausbaustufe

- neue Semantik des regulären Zeitplans als Veröffentlichungstermin;
- einstellbarer Erstellungsvorlauf;
- Erstellung und Review-Mail vor dem Termin;
- Freigabe für einen geplanten Termin;
- sofortige Veröffentlichung nach einem verpassten Termin;
- Verschiebung auf einen beliebigen zukünftigen Termin;
- belastbare, wiederholbare Mailjobs mit Zustandsanzeige;
- vorbereiteter und sicher deaktivierter Newsletter-Versand für neue Blogartikel;
- Adminansichten, Filter, Statushinweise und Protokolle;
- Migration, Tests und aktualisierte VPS-Dokumentation.

### 3.2 Nicht Bestandteil

- Google-Search-Console-API;
- themenbezogene Newsletter-Segmentierung;
- A/B-Tests für Betreffzeilen;
- mehrere Veröffentlichungszeiten pro Wochentag;
- individuelle Erstellungsvorläufe pro Termin;
- externe Workflow-Systeme wie n8n oder Make.

## 4. Fachlicher Ablauf

### 4.1 Regulärer Review-Ablauf

Bei einem Veröffentlichungstermin am Montag um 18:00 Uhr und vier Stunden Vorlauf gilt:

```text
Montag 14:00 Uhr
  → Scheduler erkennt den Erstellungszeitpunkt
  → genau ein Generierungsjob wird angelegt
  → Artikel, Bild, Metadaten, FAQ und Prüfbericht werden erzeugt
  → Entwurf erhält den geplanten Veröffentlichungstermin Montag 18:00 Uhr
  → Admin-Prüfmail wird als eigener Job angelegt

Montag vor 18:00 Uhr
  → Administrator prüft und bearbeitet den Entwurf
  → Administrator gibt ihn für Montag 18:00 Uhr frei
  → Veröffentlichung wird eindeutig für 18:00 Uhr eingeplant

Montag 18:00 Uhr
  → Worker prüft Freigabe, Inhalt, Bild und Risiken erneut
  → Beitrag wird genau einmal veröffentlicht
  → erfolgreicher manueller Freigabezähler wird genau einmal erhöht
  → Newsletter-Ereignis wird nur bei später aktivierter Funktion angelegt
```

### 4.2 Keine Freigabe bis zum Termin

Ohne Freigabe wird kein Veröffentlichungsjob erzeugt. Nach Ablauf von `scheduled_at` wird der Entwurf im Adminbereich als `Termin verpasst` dargestellt. Der Inhalt bleibt öffentlich unsichtbar.

Der Administrator kann danach:

- `Freigeben und jetzt veröffentlichen` wählen; oder
- `Verschieben` wählen und ein beliebiges zukünftiges Datum mit Uhrzeit eingeben; oder
- den Artikel weiterhin bearbeiten beziehungsweise ablehnen.

### 4.3 Verschieben

Ein neuer Termin muss in der Zukunft liegen und wird in der im Dashboard angezeigten Zeitzone eingegeben. Serverseitig wird er in UTC gespeichert. Ein vorhandener, noch nicht ausgeführter Veröffentlichungsjob wird entwertet beziehungsweise sicher ersetzt. Die neue Jobidentität enthält Beitrag, Freigabeversion und neuen Termin.

Nach einer Verschiebung ist eine erneute ausdrückliche Freigabe erforderlich, sofern die Aktion nicht als kombinierte Aktion `Freigeben und auf diesen Termin verschieben` gestaltet ist. Die Benutzeroberfläche soll die kombinierte Aktion verwenden, damit keine missverständliche Zwischenstufe entsteht.

### 4.4 Bearbeitung nach Freigabe

Jede Änderung an redaktionell relevanten Feldern widerruft die vorhandene Freigabe. Dazu zählen mindestens:

- Titel und Slug;
- Kurzbeschreibung;
- Meta- und Open-Graph-Daten;
- Artikel-HTML und FAQ;
- Bild-URL und Alt-Text;
- freigegebene interne Links;
- Qualitäts- oder Risikobericht nach einer Neugenerierung.

Der Veröffentlichungsjob darf mit einer veralteten Freigabeversion nicht veröffentlichen. Der Entwurf wechselt zurück auf `needs_review` und muss erneut freigegeben werden.

### 4.5 Späterer Auto-Publish-Modus

Im später zulässigen Modus `auto_publish` wird ein Artikel nicht vier Stunden zu früh live gestellt. Besteht er alle vorhandenen Auto-Publish-Regeln, wird er automatisch für den regulären Veröffentlichungstermin freigegeben und erst dort veröffentlicht. Bearbeitung oder neue Risikohinweise widerrufen auch diese automatische Freigabe.

## 5. Zeit- und Scheduler-Modell

### 5.1 Zeitberechnung

Der Veröffentlichungszeitpunkt entsteht aus:

- lokalem Wochentag;
- lokaler Uhrzeit;
- IANA-Zeitzone, standardmäßig `Europe/Berlin`.

Der Erstellungszeitpunkt ist der Veröffentlichungstermin minus `generation_lead_hours`. Luxon übernimmt Zeitzonen- und Sommerzeitberechnung. Persistierte Zeitpunkte werden als `TIMESTAMPTZ` gespeichert.

Bei einer lokalen Uhrzeit, die während der Zeitumstellung nicht existiert, wird wie im bestehenden Scheduler die erste gültige lokale Minute ab dem gewünschten Zeitpunkt verwendet. Bei einer doppelt vorkommenden lokalen Uhrzeit muss dieselbe Veröffentlichungs-Slot-ID dafür sorgen, dass nur ein Artikel entsteht.

### 5.2 Scheduler-Nachholung

Der Scheduler muss einen wegen Worker-Ausfall verpassten Erstellungszeitpunkt sicher nachholen. Solange für den Veröffentlichungsslot keine Generierung existiert, darf er den Generierungsjob nach Wiederanlauf genau einmal anlegen. Liegt der geplante Veröffentlichungstermin bereits in der Vergangenheit, wird der neue Entwurf nach der Erstellung unmittelbar als `Termin verpasst` behandelt und niemals automatisch veröffentlicht. Dadurch bleibt ein Ausfall sichtbar, ohne Inhalte zu verlieren oder ungeprüft live zu stellen.

### 5.3 Eindeutige Identitäten

Der reguläre Slot erhält eine stabile Identität aus lokalem Veröffentlichungsdatum, lokaler Veröffentlichungszeit und Zeitzone. Daraus werden getrennte Idempotenzschlüssel abgeleitet:

```text
generate:<slot-id>
admin-notification:<post-id>:<generation-version>
publish:<post-id>:<approval-version>:<scheduled-at>
newsletter:<post-id>:<publication-version>
newsletter-delivery:<post-id>:<publication-version>:<subscriber-id>
```

Wiederholte Scheduler-Ticks, Worker-Neustarts und Queue-Retries dürfen dadurch keine Duplikate erzeugen.

## 6. Zustandsmodell

### 6.1 Beitragszustände

Die für KI-Beiträge relevanten Zustände werden erweitert beziehungsweise fachlich präzisiert:

- `needs_review`: Entwurf vorhanden, keine gültige Freigabe;
- `approved_scheduled`: freigegeben und für einen zukünftigen Zeitpunkt eingeplant;
- `published`: erfolgreich öffentlich;
- `rejected`: redaktionell abgelehnt.

`Termin verpasst` ist eine abgeleitete Anzeige und kein eigener dauerhaft zu pflegender Zustand:

```text
workflow_status = needs_review
AND scheduled_at <= NOW()
```

### 6.2 Freigabeversion

Jeder Entwurf besitzt eine positive `review_version`. Eine Freigabe speichert die geprüfte Version als `approved_review_version`. Nur wenn beide Werte beim Veröffentlichungsversuch übereinstimmen, ist die Freigabe noch gültig. Jede relevante Bearbeitung erhöht `review_version` und löscht Freigabezeitpunkt, Freigabeadmin und `approved_review_version`.

### 6.3 Freigabezähler

Der bestehende Zähler für acht manuelle Freigaben erhöht sich erst nach einer tatsächlich erfolgreichen Veröffentlichung, nicht bereits beim Klick auf `Freigeben`. Abgebrochene, verschobene, widerrufene oder abgelehnte Freigaben zählen nicht. Ein eindeutiges Veröffentlichungsereignis verhindert mehrfaches Zählen.

## 7. Datenmodell und Migration

Die neue Migration wird idempotent und unter derselben Advisory-Sperre wie die bestehenden Content-Agent-Migrationen ausgeführt.

### 7.1 `content_agent_settings`

Neue Felder:

- `generation_lead_hours SMALLINT NOT NULL DEFAULT 4`, beschränkt auf 1 bis 48;
- `admin_notification_email VARCHAR(320) NOT NULL DEFAULT 'kontakt@komplettwebdesign.de'`, serverseitig als einzelne gültige E-Mailadresse geprüft;
- `newsletter_blog_notifications_enabled BOOLEAN NOT NULL DEFAULT FALSE`.

Der Newsletter-Schalter darf nur aktiviert werden, wenn `manual_approvals_count >= 8` gilt. Der vorhandene technische Auto-Publish-Schalter bleibt davon unabhängig.

### 7.2 `posts`

Vorhandenes `scheduled_at` wird für den geplanten Veröffentlichungstermin verwendet. Ergänzt werden:

- `review_version INTEGER NOT NULL DEFAULT 1`;
- `approved_review_version INTEGER`;
- `approved_at TIMESTAMPTZ`;
- `approved_by_admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL`;
- `publication_version INTEGER NOT NULL DEFAULT 1` für eine eindeutige Veröffentlichung und Newsletter-Zustellung.

Die Workflow-Constraint wird um `approved_scheduled` ergänzt. Ein geplanter Beitrag bleibt `published = FALSE` und `published_at = NULL`.

### 7.3 Mail- und Zustellprotokoll

Ein eigenes Versandprotokoll trennt Mailzustand vom Content-Job. Es speichert mindestens:

- Nachrichtentyp `admin_review` oder `newsletter_article`;
- Beitrag und Veröffentlichungs-/Generierungsversion;
- Empfänger beziehungsweise Abonnent;
- Status `queued`, `sending`, `sent`, `failed` oder `cancelled`;
- Versuche, nächsten Versuch, letzte sichere Fehlerkennung und Versandzeitpunkt;
- eindeutigen Idempotenzschlüssel;
- unveränderlichen Payload-Snapshot ohne SMTP-Passwort und ohne Sessiondaten.

Automatische Admin-Mail-Retries erfolgen höchstens fünfmal mit den Abständen 5 Minuten, 15 Minuten, 1 Stunde, 4 Stunden und 12 Stunden. Danach bleibt die Nachricht `failed` und kann im Adminbereich manuell neu eingeplant werden. Eine manuelle Neueinplanung verwendet die aktuell gespeicherte Admin-Adresse und erzeugt eine neue, nachvollziehbare Versandversion.

Newsletter-Zustellungen werden pro aktivem Abonnenten und Veröffentlichung dedupliziert. Zulässig sind ausschließlich Einträge aus `newsletter_signups` mit `active = TRUE` und einem nicht leeren Abmeldetoken. Abgemeldete oder unvollständige Empfänger werden bereits vor der Jobanlage und erneut unmittelbar vor der Zustellung ausgeschlossen.

## 8. Queue und Worker

Zusätzliche beziehungsweise geänderte Jobtypen:

- `generate_weekly_draft`: wird zum vorgezogenen Erstellungszeitpunkt angelegt und enthält den Veröffentlichungsslot;
- `send_admin_review_notification`: versendet oder wiederholt die Prüfmail;
- `publish_approved_post`: läuft frühestens zu `scheduled_at` und verlangt eine gültige Freigabeversion;
- `send_blog_newsletter`: vorbereitetes Veröffentlichungsevent für den später aktivierbaren Newsletter;
- `send_blog_newsletter_delivery`: deduplizierte Zustellung an einen zulässigen Abonnenten.

Job-Claims, Leases, Heartbeats, Retry-Grenzen und Abschlussfences folgen den bereits gehärteten Content-Agent-Regeln. Mailjobs verwenden eigene Retry-Zeitpunkte und dürfen einen bereits abgeschlossenen Generierungs- oder Veröffentlichungsjob nicht zurücksetzen.

Der Worker prüft vor jeder Veröffentlichung:

1. Beitrag existiert und ist ein statischer KI-Beitrag;
2. Beitrag ist noch unveröffentlicht;
3. `workflow_status = approved_scheduled`;
4. `scheduled_at <= NOW()`;
5. `approved_review_version = review_version`;
6. gespeicherte Artikel-, Bild-, FAQ-, Link-, Qualitäts- und Risikodaten sind erneut gültig;
7. noch kein entsprechendes Veröffentlichungsereignis existiert;
8. Worker-Lease ist unmittelbar vor dem Commit weiterhin gültig.

## 9. Adminbereich

### 9.1 Zeitplan und Einstellungen

Die vorhandene Seite `Zeitplan & Modus` erhält:

- verständlichen Hinweis, dass die Uhrzeit die Veröffentlichung bezeichnet;
- Feld `Erstellungsvorlauf in Stunden`, 1 bis 48, Standard 4;
- berechnete Vorschau wie `Erstellung Montag 14:00 Uhr · Veröffentlichung Montag 18:00 Uhr`;
- Feld `Admin-Benachrichtigungsadresse`;
- Schalter `Newsletter bei neuem Blogartikel`, zunächst aus und bis acht Freigaben gesperrt;
- Anzeige `0/8` bis `8/8` mit Erklärung der Sperre.

SMTP-Zugangsdaten, Absenderadresse, Modelle, Kostensätze, Polling und Lease-Dauer bleiben technische, nicht editierbare Werte aus `.env`.

### 9.2 Übersicht und Entwurfsliste

Zusätzliche Informationen und Filter:

- geplanter Veröffentlichungstermin;
- berechneter Erstellungszeitpunkt;
- Freigabestatus;
- Mailstatus und letzter Versandversuch;
- Filter `Zur Prüfung`, `Freigegeben`, `Termin verpasst`, `Veröffentlicht`;
- Warnung und manuelle Retry-Aktion bei endgültig fehlgeschlagener Prüfmail.

### 9.3 Entwurfseditor

Vor einem zukünftigen Termin werden angeboten:

- `Für den <Datum, Uhrzeit> freigeben`;
- `Freigeben und anderen Termin wählen`;
- `Ablehnen`.

Nach einem verpassten Termin werden angeboten:

- `Freigeben und jetzt veröffentlichen`;
- `Freigeben und verschieben` mit beliebigem zukünftigem Datum und Uhrzeit;
- `Ablehnen`.

Eine kombinierte Terminaktion zeigt den ausgewählten Termin vor der Bestätigung noch einmal an. Alle Aktionen bleiben CSRF-geschützt, serverseitig validiert und benötigen eine ausdrückliche Bestätigung.

## 10. Admin-Prüfmail

Die Mail wird über den vorhandenen Nodemailer-Transport und das vorhandene Marken-E-Mail-Template versendet. Absender und SMTP-Zugang bleiben in `.env`; nur die Empfängeradresse wird im Dashboard verwaltet.

Inhalt:

- Betreff `Neuer Blogartikel zur Prüfung: <Titel>`;
- Artikeltitel und Kurzbeschreibung;
- geplanter Veröffentlichungstermin in `Europe/Berlin`;
- Qualitätsscore und kompakte Warnhinweise;
- Beitragsbild als sichere HTTPS-Vorschau;
- Schaltfläche zum geschützten Entwurfseditor;
- Klarstellung, dass der Artikel noch nicht öffentlich ist.

Der Link basiert auf der kanonischen Produktions-Basis-URL und enthält keine Session, kein Freigabetoken und keine automatische Veröffentlichungsaktion. Der Admin-Login wird für diese internen GET-Ziele um ein serverseitig validiertes Rücksprungziel erweitert: Erlaubt sind ausschließlich relative Pfade unter `/admin/content-agent/`. Nach erfolgreicher Anmeldung führt der Ablauf zum ursprünglichen Entwurfseditor zurück; externe, protokollrelative oder andersartige Rücksprungziele werden verworfen und enden auf `/admin`.

## 11. Vorbereiteter Newsletter-Versand

Die Funktion ist nach der Migration deaktiviert. Der Adminbereich verhindert die Aktivierung vor acht erfolgreich manuell freigegebenen und veröffentlichten KI-Artikeln. Zusätzlich prüft der Worker die Sperre erneut; eine manipulierte Formularanfrage kann sie nicht umgehen.

Nach späterer Aktivierung entsteht ausschließlich nach erfolgreicher Veröffentlichung ein Newsletter-Ereignis. Die Mail enthält:

- Titel;
- Kurzbeschreibung;
- Beitragsbild;
- Link zum öffentlichen Artikel;
- vorhandene Abmeldeinformationen.

Die Empfänger werden aus `newsletter_signups` gelesen. Nur aktuell aktive Einträge mit gültigem Abmeldetoken sind zulässig. Die Versandarchitektur verarbeitet Batches von höchstens 50 Empfängern pro Job, dedupliziert pro Beitrag und Empfänger und unterstützt Retry sowie Fortsetzung nach Worker-Neustart. Unmittelbar vor jedem Versand wird `active = TRUE` erneut geprüft. Ein Fehler bei Newsletter-Zustellungen darf einen bereits veröffentlichten Artikel nicht zurückrollen.

## 12. Fehlerbehandlung und Beobachtbarkeit

- Generierungsfehler folgen dem bestehenden Job-Retry und Kostenlimit.
- Mailfehler werden im Versandprotokoll gespeichert; sensible SMTP-Daten und vollständige Providerantworten werden nicht persistiert.
- Ein fehlgeschlagener Admin-Mailjob zeigt eine Warnung und einen manuellen Retry im Dashboard.
- Ein fehlgeschlagener Veröffentlichungsjob lässt den Beitrag unveröffentlicht beziehungsweise in einem klaren manuellen Prüfzustand und erzeugt keinen falschen Freigabezähler.
- Ein bereits veröffentlichter Beitrag wird bei einem Retry erkannt und nicht erneut veröffentlicht.
- Scheduler, Mailjobs und Veröffentlichungsjobs erhalten aussagekräftige, begrenzte Fehlercodes für das Adminprotokoll.
- Dashboard und Worker zeigen den nächsten Erstellungs- und Veröffentlichungstermin sowie überfällige Review-Entwürfe.

## 13. Sicherheit

- Es gibt keinen öffentlichen Freigabelink per E-Mail.
- Alle redaktionellen Aktionen benötigen Adminauthentifizierung, CSRF-Schutz und serverseitige Bestätigung.
- E-Mailadressen werden normalisiert, validiert und beim Rendern escaped.
- Mail-HTML übernimmt ausschließlich bereits validierte, begrenzte Textfelder und eine sichere HTTPS-Bild-URL.
- Newsletter-Abonnenten erhalten niemals Admin-URLs, Qualitätsberichte oder Entwurfsdaten.
- Ein Entwurf kann nur mit derselben geprüften Version veröffentlicht werden.
- Eindeutige Datenbankindizes schützen gegen Doppeljobs, doppelte Mails, doppelte Veröffentlichungen und doppelte Newsletter-Zustellungen.
- Der Newsletter-Schalter ist sowohl in der Oberfläche als auch in Service und Datenbanklogik abgesichert.

## 14. Tests

### 14.1 Zeit und Scheduler

- vier Stunden Vorlauf am selben Tag;
- Vorlauf über Mitternacht auf den Vortag;
- einstellbare Grenzen 1 und 48 Stunden;
- Sommerzeitlücke und doppelte Herbststunde;
- Nachholung nach Worker-Ausfall;
- keine doppelte Generierung bei wiederholten Ticks.

### 14.2 Freigabe und Veröffentlichung

- Freigabe vor dem Termin veröffentlicht nicht sofort;
- planmäßige Veröffentlichung exakt nach Fälligkeit;
- keine Veröffentlichung ohne Freigabe;
- `Termin verpasst` wird korrekt abgeleitet;
- sofortige Veröffentlichung nach verpasstem Termin;
- Verschieben auf ein beliebiges zukünftiges Datum;
- Zurückweisung vergangener oder ungültiger Termine;
- Bearbeitung widerruft Freigabe;
- veraltete Freigabeversion kann nicht veröffentlichen;
- Veröffentlichung und Freigabezähler sind genau einmal wirksam;
- Retry nach unklarem Commit bleibt konsistent.

### 14.3 E-Mail

- Admin-Mail wird nach Entwurfserstellung eingeplant;
- Mailfehler beeinflusst den Entwurf nicht;
- fünf Retry-Stufen werden korrekt berechnet;
- Doppelversand wird verhindert;
- endgültiger Fehler erscheint im Dashboard;
- manueller Retry verwendet die aktuelle Adminadresse;
- Mailinhalt escaped Nutzdaten und enthält nur sichere Links.

### 14.4 Newsletter

- Schalter vor acht Freigaben gesperrt;
- Schalter nach acht Freigaben aktivierbar;
- deaktivierter Newsletter erzeugt keine Zustellungen;
- ausschließlich veröffentlichte Beiträge erzeugen Ereignisse;
- ausschließlich aktive Abonnenten mit gültigem Abmeldetoken werden ausgewählt;
- Abmeldung vor Zustellung verhindert Versand;
- Deduplizierung pro Beitrag und Abonnent;
- Retry rollt Veröffentlichung nicht zurück.

### 14.5 Oberfläche und Integration

- Controller-, CSRF- und Konflikttests;
- responsive Darstellung auf bestehenden Dashboard-Breakpoints;
- Tastaturbedienbarkeit und verständliche Statusbeschriftungen;
- Migrations-Idempotenz;
- echter PostgreSQL-Integrationstest unter den vorhandenen sicheren Testdatenbank-Sperren;
- vollständige Regressionstests, Produktions-Build und Content-Agent-Dry-Run.

## 15. Rollout

1. Migration und neues Image zunächst gegen eine getrennte Testdatenbank prüfen.
2. Produktionsbackup erstellen und verifizieren.
3. Migration idempotent ausführen.
4. Content-Agent im Review-Modus und Newsletter deaktiviert starten.
5. Worker-Healthcheck und Dry-Run prüfen.
6. Einen manuellen Testentwurf erzeugen und Prüfmailzustellung kontrollieren.
7. Freigabe auf einen nahen Testtermin planen und Veröffentlichung prüfen.
8. Bearbeitung nach Freigabe testen und sicherstellen, dass die Veröffentlichung verhindert wird.
9. Regulären Vorlauf auf vier Stunden und die gewünschten Veröffentlichungstage setzen.
10. Newsletter erst nach acht erfolgreichen manuellen Veröffentlichungen bewusst aktivieren.

Die VPS-Anleitung muss weiterhin zwischen dem SSH-Hostpfad `~/apps/komplettwebdesign` und dem im Webhook-Container gemounteten Pfad `/apps/komplettwebdesign` unterscheiden.

## 16. Erfolgskriterien

Die Ausbaustufe ist abgeschlossen, wenn:

- ein regulärer 18-Uhr-Termin den Entwurf standardmäßig um 14:00 Uhr erzeugt;
- die Admin-Prüfmail zuverlässig und wiederholbar versendet wird;
- eine Freigabe vor 18:00 Uhr erst um 18:00 Uhr veröffentlicht;
- ohne Freigabe nichts live geht;
- ein verpasster Termin sofort veröffentlicht oder beliebig verschoben werden kann;
- Bearbeitung nach Freigabe die Veröffentlichung sicher verhindert;
- Mail-, Veröffentlichungs- und Newsletter-Ereignisse idempotent sind;
- Newsletter-Versand fertig vorbereitet, aber bis zur bewussten Aktivierung nach acht Freigaben deaktiviert bleibt;
- alle automatisierten Prüfungen, der Build, der Dry-Run und die VPS-Betriebsprüfung erfolgreich sind.
