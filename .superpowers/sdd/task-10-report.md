# Task 10 – Atomare manuelle Veröffentlichung und echte Freigaben

## Ergebnis

Manuelle Veröffentlichung und Ablehnung sind als enge, transaktionale Zustandsübergänge implementiert. Nur ein bestätigter, unveröffentlichter KI-Beitrag im Zustand `needs_review` und Format `static_html` kann verarbeitet werden.

## Publikationsgarantien

- Die Servicegrenze akzeptiert die kritische Bestätigung nur als exaktes Boolean `true`; der Controller übersetzt ausschließlich den literalen Formularwert `true`.
- Post- und Admin-IDs werden auf positive PostgreSQL-Integer begrenzt; Adminnamen werden kontrollzeichenfrei normalisiert und auf 255 Zeichen begrenzt.
- Der persistierte Post wird innerhalb der Transaktion mit `FOR UPDATE OF p` gesperrt.
- Die erneute Prüfung verwendet den gespeicherten Artikel und einen im selben Transaktionskontext gelesenen Slug- und Linkkontext.
- Titel, Kurzbeschreibung, Slug, Meta-, OG-, FAQ-, Bild- und HTML-Daten werden erneut validiert.
- Die Veröffentlichung verlangt eine sichere HTTPS-Bild-URL, einen Bild-Alt-Text, einen Qualitätsscore von mindestens 80 und einen vollständigen, nicht blockierenden Risikoreport.
- Das vom Sanitizer zurückgegebene HTML muss exakt dem persistierten HTML entsprechen; still bereinigbarer Rohinhalt wird nicht veröffentlicht.
- Statusupdate, manuelles Event und Freigabezähler werden in einer einzigen Datenbanktransaktion geschrieben.
- Die bestehende partielle Unique-Regel für `decision='manual'` und das Post-Zeilen-Lock verhindern Doppelzählungen bei parallelen Doppel-Clicks.
- Nur ein neu angelegtes manuelles Event erhöht `manual_approvals_count`; ein bereits vorhandenes Ereignis zählt nicht erneut.
- `reviewed_by -> users` wird nicht verwendet. Der Akteur wird ausschließlich über `admin_id -> admins` und den begrenzten Adminnamen im Event auditiert.
- Publish-Events sind durch einen idempotent installierten Trigger gegen `UPDATE` und `DELETE` geschützt.

## Ablehnung und Auto-Publish-Basis

- Ablehnung verlangt ebenfalls eine kritische Bestätigung und einen bereinigten, nicht leeren Grund mit höchstens 500 Zeichen.
- Sie setzt ausschließlich einen unveröffentlichten Review-KI-Draft per Compare-and-Set auf `workflow_status='rejected'`.
- Das nichtzählende Ablehnungsereignis verwendet `decision='blocked'` und belegt deshalb nicht den manuellen Partial-Unique-Key.
- Ein Eventfehler rollt die Ablehnung vollständig zurück; ein zweiter Zustandsübergang endet als Konflikt.
- Eventkontexte enthalten nur feste Aktionskennungen, IDs, Score, begrenzte Auditdaten und den bereinigten Ablehnungsgrund; keine Artikelinhalte oder Geheimnisse.
- `publishDraftAutomatically` ist als fail-closed Task-11-Schnittstelle vorhanden, führt keine Datenbankaktion aus und erhöht niemals den manuellen Zähler.

## Admin- und Legacy-Integration

- Der Produktionsrouter injiziert den echten Publikationsservice.
- Publish- und Reject-Routen bleiben Admin- und CSRF-geschützt.
- Der Drafteditor enthält getrennte, bestätigte Formulare für Veröffentlichung und Ablehnung.
- Der generische `BlogPostModel.update`-Pfad besitzt zusätzlich eine Datenbankbedingung, die unveröffentlichte KI-Drafts nicht publizieren kann.

## TDD und Verifikation

- RED: Beide neuen Suites scheiterten zunächst erwartungsgemäß mit `ERR_MODULE_NOT_FOUND` für Repository und Service.
- Fokussierte Suite: 54 bestanden, 0 fehlgeschlagen.
- Gesamtsuite mit Testschlüssel: 846 bestanden, 0 fehlgeschlagen, 1 PostgreSQL-Opt-in-Test übersprungen.
- Build: erfolgreich; 41 CSS-Quelldateien, Manifest unverändert.
- `git diff --check`: ohne Befund.
- Geheimnisscan: keine neu eingeführten Geheimnisse; Treffer nur in beabsichtigten Negativtestbezeichnungen.

## Hinweis

Der echte PostgreSQL-Integrationstest bleibt ohne ausdrücklich freigegebene Reset-Testdatenbank übersprungen. Es wurden keine externen Provider aufgerufen und keine Live-Daten verändert.
