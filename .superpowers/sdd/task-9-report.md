# Task 9 – Gezielte Draft-Neugenerierung als Queuejobs

## Ergebnis

Die vier expliziten Jobtypen `regenerate_article`, `regenerate_metadata`, `regenerate_faq` und `regenerate_image` sind vollständig als wiederaufnehmbare Reviewjobs implementiert. Keine der Aktionen besitzt einen Veröffentlichungsweg.

## Implementierte Sicherheits- und Idempotenzregeln

- Adminaktionen erzeugen ausschließlich Minimalpayloads mit `source=admin_regeneration`, `post_id` und `forced_mode=review`.
- Operative Agentpause und technischer Hauptschalter verhindern neue Regenerationsjobs; der Queue-Insert prüft die operative Pause zusätzlich atomar.
- Jeder Job erhält einen serverseitigen UUID-Idempotenzschlüssel und verwendet bei Retries denselben Queuejob, Run und persistierten Runtime-Snapshot.
- Kosten- und Providerstufen verwenden `${jobType}:${postId}` als stabile Stage-ID.
- Persistierte Stufenergebnisse werden vor Budgetreservierung und Provideraufruf gelesen.
- Offene Reservierungen, settled Reservierungen ohne Ergebnis und unvollständige persistierte Ergebnisse führen zu `needs_manual_attention`, niemals zu einem zweiten Provideraufruf.
- Budgetgrenze und mehrdeutige Providerausgänge werden als manuelle Prüfung behandelt.
- Lease-Guards schützen kostenpflichtige Aufrufe, Budgetabschluss, Stufenpersistenz, Postupdates, Bildcleanup und Runabschluss.
- Textresultate werden mit dem aktuellen vollständigen Artikel zusammengeführt, deterministisch validiert, sanitisiert und nur über die typabhängige Feldallowlist atomar gespeichert.
- Der Repository-Updatepfad prüft unmittelbar unter `FOR UPDATE` erneut auf `generated_by_ai=TRUE`, `published=FALSE` und exakt `content_format='static_html'`.
- Bilder werden genau einmal erzeugt und vor dem Postupdate dauerhaft im Run gespeichert.
- Das alte Cloudinarybild wird erst nach bestätigtem Post-Commit gelöscht.
- Ein unklarer Commit wird über Post-ID und neue Public-ID abgeglichen; bei fehlendem oder fehlgeschlagenem Abgleich wird kein Bild gelöscht.
- Cleanup- oder Cleanup-Auditfehler rollen den bestätigten neuen Postzustand nicht zurück.
- OpenAI- und Cloudinarystatus werden anhand ihrer getrennten Bildstufen aktualisiert.

## Adminoberfläche

Der Drafteditor enthält vier getrennte CSRF-geschützte Formulare:

- Artikel neu erstellen
- Meta-Daten neu erstellen
- FAQ neu erstellen
- Bild neu erstellen

Jede Aktion weist ausdrücklich auf Review und fehlende automatische Veröffentlichung hin.

## Verifikation

- RED: fehlender Regenerationsservice mit `ERR_MODULE_NOT_FOUND` bestätigt.
- Fokussierte Task-Suite: 110 bestanden, 0 fehlgeschlagen.
- Gesamtsuite mit Testschlüssel: 810 bestanden, 1 PostgreSQL-Opt-in-Test übersprungen, 0 fehlgeschlagen.
- Build: erfolgreich; 41 CSS-Quelldateien, Manifest unverändert.
- Dry-Run: `externalCalls=0`, Artikel valide, Qualitätsscore 90, Publishmodus `draft`.
- `git diff --check`: ohne Befund.
- Geheimnisscan: keine neu eingeführten Geheimnisse; Treffer ausschließlich in bestehenden Redaktions-Testfixtures für Fehlerbereinigung.

## Hinweise

- Der echte PostgreSQL-Test bleibt ohne explizit freigegebene Reset-Testdatenbank übersprungen.
- Es wurden keine echten OpenAI- oder Cloudinary-Aufrufe ausgeführt.
