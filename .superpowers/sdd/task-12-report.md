# Task 12 – Integration, responsive Prüfung und VPS-Rollout

## Ergebnis

Der terminierte Reviewablauf ist vollständig als reproduzierbarer Integrations- und Rolloutvertrag abgesichert. Migration 002 + 003 + 004, Entwurfserzeugung, Admin-Benachrichtigung, zukünftige Freigabe, unveröffentlichter Wartezustand, fällige genau-einmalige Veröffentlichung, Freigabezähler, Publikationsereignis und deaktiviertes Newsletter-Gate wurden gegen eine echte isolierte PostgreSQL-Testdatenbank geprüft.

## RED und GREEN

- RED: Die neuen Verträge schlugen zunächst mit vier erwarteten Befunden fehl: falscher Hostpfad in der VPS-Anleitung, fehlende Dry-Run-Felder für terminierten Review und simulierte Benachrichtigung sowie fehlende responsive Überbreiten-/Fokusverträge.
- GREEN fokussiert: 29 Tests bestanden, 0 fehlgeschlagen, 1 PostgreSQL-Opt-in-Test ohne freigegebene Testdatenbank sicher vor dem Verbindungsaufbau übersprungen.
- Echte PostgreSQL-Prüfung: derselbe vollständige Opt-in-Integrationstest wurde zweimal nacheinander gegen die exakt benannte lokale PostgreSQL-Testdatenbank ausgeführt; beide Läufe bestanden ohne Überspringen. Danach existierten null zurückgelassene `kwd_ca_it_*`-Schemas.
- Gesamtsuite: 1092 Tests bestanden, 0 fehlgeschlagen, 1 bewusst geschützter PostgreSQL-Opt-in-Test im normalen Lauf übersprungen.
- Build: erfolgreich; 41 CSS-Quelldateien verarbeitet, das Manifest blieb unverändert.
- Dry-Run: `externalCalls:0`, `articleValid:true`, `publishMode:"draft"`, `scheduledReview:true`, `notificationSimulated:true`.
- `git diff --check`: ohne Befund.

## PostgreSQL-End-to-End-Vertrag

- Der Test setzt Migration 002 + 003 + 004 zweimal reproduzierbar auf und prüft den terminierten Migrationszustand.
- Ein echter KI-Entwurf wird mit Admin-Outbox und Mailjob atomar erzeugt.
- Der Produktionshandler und der echte `ContentWorker` claimen, leasen und beenden sowohl Admin-Benachrichtigung als auch Veröffentlichung über die produktiven Repository-Adapter. Der Test ruft keinen Benachrichtigungs- oder Publikationsservice direkt auf.
- Die Admin-Prüfmail wird mit ausschließlich injiziertem, simuliertem SMTP-Transport genau einmal als `sent` bestätigt.
- Eine manuelle Freigabe führt ausschließlich zu `approved_scheduled`; vor Fälligkeit bleibt `published=false`.
- Nach Fälligkeit veröffentlicht derselbe Jobsnapshot genau einmal. Ein erneuter Aufruf erkennt die bereits veröffentlichte Version idempotent.
- Es existiert genau ein manuelles `content_publish_events`-Ereignis, `manual_approvals_count` steigt genau auf eins und das deaktivierte Newsletter-Gate erzeugt weder Newsletterjob noch Empfängerzustellung.
- Der Test bleibt ausfallsicher geschützt und wird ohne exakten Datenbanknamen `kwd_content_agent_integration_test`, exakte Resetfreigabe, exaktes festes Test-Token und freigegebenen Loopback- oder temporären Containerhost vor jedem `connect` übersprungen.
- Jeder Lauf arbeitet in einem intern aus einer UUID erzeugten Zufallsschema. Der Test setzt den `search_path` auf dieses Schema und `pg_catalog`, löscht niemals Tabellen im öffentlichen Schema und entfernt sein Zufallsschema im `finally`-Block. `to_regnamespace` bestätigt die vollständige Bereinigung.

## VPS-Anleitung

- Alle Hostbefehle starten am Prompt `webadmin@ubuntu:~/apps/komplettwebdesign$` und verwenden `~/apps/komplettwebdesign` beziehungsweise `${HOME}/apps/komplettwebdesign`.
- `/apps/komplettwebdesign` ist ausschließlich und ausdrücklich als interner Mountpfad des Webhook-Containers dokumentiert.
- Backup, Testmigration, Migration 004, gemeinsames App-/Worker-Image, Recreate, Healthchecks, sicherer Dry-Run, kontrollierter echter Reviewtest, Diagnose, Rollback und Wiederanlauf sind enthalten.
- Der temporäre `pgvector`-Container und sein privates Netzwerk bleiben über beide Migrationsläufe bis nach dem echten E2E-Test bestehen und werden erst danach durch den Exit-Trap entfernt.
- Die exakten Prüfpunkte `needs_review`, `approved_scheduled`, `publish_approved_post`, `content_publish_events`, `manual_approvals_count` und das bis zur achten Freigabe deaktivierte Newsletter-Gate sind beschrieben.

## Responsive Browserprüfung

Google Chrome wurde tatsächlich über das DevTools-Protokoll mit exakt 16 Kombinationen gerendert:

- Ansichten: Zeitplan, Entwurfsliste, Editor mit zukünftigem Termin und Editor nach verpasstem Termin.
- Viewports: 1440×900, 1024×768, 768×1024 und 390×844.
- Alle 16 Screenshots besitzen exakt die angeforderte Pixelgröße.
- Alle 16 Messungen ergaben keine horizontale Überbreite.
- Echte Tab-Tastatureingaben erzeugten in allen 16 Messungen `:focus-visible` mit sichtbarer Kontur.
- Beim zukünftigen Termin war „Für Termin freigeben“ sichtbar und „Freigeben und jetzt veröffentlichen“ verborgen.
- Beim verpassten Termin war „Freigeben und jetzt veröffentlichen“ sichtbar; die Terminverschiebung blieb in beiden Zuständen erreichbar.

Die diagnostischen Screenshots und Messberichte lagen ausschließlich unter `/tmp/kwd-task12-responsive` und wurden nicht als Buildartefakte eingecheckt.

## Risiken

Es bleiben keine bekannten funktionalen Task-12-Befunde offen. Der normale Gesamttest verbindet sich absichtlich nicht mit PostgreSQL; die zusätzlich zweimal ausgeführte isolierte PostgreSQL-Prüfung hat denselben geschützten Test vollständig bestanden und ihre Schemas jeweils bereinigt. Externe OpenAI-, Cloudinary-, SMTP- oder Produktionsaufrufe wurden nicht ausgeführt.
