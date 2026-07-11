# Task 9 – Review-Fix für sichere Draft-Regeneration

## Ergebnis

Die Reviewhinweise zu Provider-Recovery, Lease-Fencing, Bild-CAS und Runterminalisierung sind umgesetzt. Die Regenerationsjobs bleiben unverändert reine Reviewjobs ohne Veröffentlichungsweg.

## Behobene Punkte

- Erfolgreiche Text- und Bildproviderresultate werden vor Lease-Prüfung, Budget-Settlement und Providerstatus dauerhaft als Stufenergebnis gespeichert.
- Das persistierte Ergebnis enthält die tatsächlichen Kosten und den Reservierungsmonat. Ein Retry verwendet dieses Ergebnis, rechnet eine offene Reservierung idempotent ab und ruft den Provider nicht erneut auf.
- Schlägt die Stufenpersistenz nach einem Provideraufruf fehl, bleibt die Reservierung offen und der Lauf endet mit `provider_stage_persistence_uncertain` zur manuellen Prüfung. Ein Wiederanlauf kann wegen der bestehenden Reservierung keinen zweiten Provideraufruf auslösen.
- Unmittelbar vor jedem Budget-Settlement wird der aktuelle Lease-Fence geprüft, einschließlich des Bildfehlerpfads.
- Bildupdates verwenden unter `FOR UPDATE` einen Vergleich mit der erwarteten alten Public-ID und zusätzlich das NULL-sichere SQL-Prädikat `IS NOT DISTINCT FROM`.
- Bei einem CAS-Konflikt bleibt das konkurrierende aktuelle Bild unangetastet. Nur der eindeutig neue, nicht referenzierte Upload wird als Orphan bereinigt und diese Bereinigung wird im Run protokolliert.
- Ein mehrdeutiger Bild-Commit wird gegen die tatsächlich im Update gelockte alte Public-ID abgeglichen. Nur bestätigte alte Bilder beziehungsweise eindeutig nicht übernommene neue Orphans werden gelöscht; bei konkurrierendem oder unklarem Zustand wird keine Datei gelöscht.
- Permanente Regenerationsfehler nach dem Anlegen des Runs terminalisieren denselben Run nach Lease-Prüfung als `failed`. Retrybare Fehler und Lease-Verlust lassen den Run für eine sichere Wiederaufnahme offen.
- Die Produktionsruntime bindet das Regenerationsrepository und den Runabschluss an dieselbe aktive Datenbankinstanz.

## TDD und Verifikation

- RED: 71 fokussierte Tests, 11 erwartete Fehler in exakt den Reviewlücken.
- GREEN: 73 fokussierte Tests bestanden, 0 fehlgeschlagen.
- Gesamtsuite mit Testschlüssel: 823 bestanden, 1 PostgreSQL-Opt-in-Test übersprungen, 0 fehlgeschlagen.
- Build: erfolgreich; 41 CSS-Quelldateien, Manifest unverändert.
- Dry-Run: `externalCalls=0`, Artikel valide, Qualitätsscore 90, Publishmodus `draft`.
- `git diff --check`: ohne Befund.

## Bewusste Recovery-Semantik

Ein kostenpflichtiges Providerresultat besitzt Vorrang vor der sofortigen Budgetabrechnung: Zuerst wird es dauerhaft gespeichert, danach wird unter aktuellem Lease abgerechnet. Diese Reihenfolge verhindert einen zweiten kostenpflichtigen Provideraufruf, falls der Prozess zwischen Providerantwort und Settlement ausfällt. Ist die Persistenz selbst nicht eindeutig, wird nicht automatisch erneut generiert, sondern sicher zur manuellen Prüfung angehalten.

Es wurden keine echten OpenAI- oder Cloudinary-Aufrufe ausgeführt.
