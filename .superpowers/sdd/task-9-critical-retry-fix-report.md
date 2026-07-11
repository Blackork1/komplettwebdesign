# Task 9 – Kritischer Retry-Fix für Bildregeneration

## Ergebnis

Der Same-job-/Same-run-Retry nach einem Bild-CAS-Konflikt oder einem eindeutig nicht ausgeführten Bild-Commit kann den verworfenen Upload nicht mehr nachträglich anwenden. Ein konkurrierendes aktuelles Bild bleibt in allen geprüften Crash- und Retryfenstern unangetastet.

## Sicherheitsmodell

- Die ursprüngliche CAS-Basis wird aus dem dauerhaft gespeicherten Providerresultat `image.previousPublicId` verwendet. Ein Retry ersetzt sie niemals durch die inzwischen aktuelle Public-ID des Entwurfs.
- Vor dem Löschen eines eindeutig neuen Orphans wird unter aktuellem Lease ein append-only Cleanup-Intent in `${stageId}:orphan_cleanup` gespeichert.
- Wegen der write-once Semantik der Run-Stufen werden Ergebnisse getrennt in `${stageId}:orphan_cleanup:failed` und `${stageId}:orphan_cleanup:deleted` protokolliert.
- `loadImageResult` liest den Cleanup-Zustand vor der Providerstufe. Existiert ein Intent, darf der Job ausschließlich den idempotenten Orphan-Cleanup fortsetzen und niemals wieder das Postupdate oder den Provider aufrufen.
- Nach einem Crash zwischen dauerhaftem Intent und Delete setzt derselbe Job/Run ausschließlich das Delete fort.
- Nach einem Deletefehler bleibt der fehlgeschlagene Versuch dauerhaft sichtbar; ein Retry darf das Delete wiederholen und anschließend den erfolgreichen Abschluss ergänzen.
- Bei einem unklaren Cleanup-Intent-Commit wird im aktuellen Lauf weder gelöscht noch angewendet. Ein Retry bleibt durch die unveränderte ursprüngliche CAS-Basis sicher.
- Ist der invalidierte Upload inzwischen wider Erwarten im Entwurf referenziert oder ist der persistierte Cleanup-Zustand widersprüchlich, wird konservativ weder gelöscht noch angewendet.
- Budget und Settlement werden beim reinen Cleanup-Retry nicht erneut verarbeitet. Ohne bestätigten Intent bleibt ein erneut aufgerufenes Settlement über die bestehende Stage-ID idempotent.

## TDD-Nachweis

RED reproduzierte vier konkrete Fehler:

- Retry nach CAS-Mismatch konnte die aktuelle Konkurrenz-ID als neue CAS-Basis verwenden und den verworfenen Upload anwenden.
- Retry nach `image_commit_not_applied` führte das Postupdate erneut aus.
- Ein Crash nach geplanter Invalidierung war nicht wiederaufnehmbar, weil das bisherige Audit erst nach dem Delete geschrieben wurde.
- Ein Deletefehler führte nicht in einen ausschließlichen Cleanup-Retry.

GREEN deckt denselben Job und denselben Run jeweils zweimal ab:

- CAS-Basis A bleibt unverändert.
- Konkurrenzbild C bleibt intakt.
- Upload B wird niemals angewendet.
- Der Provider wird kein zweites Mal aufgerufen.
- Crash-, Deletefehler- und unklare Stage-Commit-Fenster bleiben konservativ und wiederaufnehmbar.

## Verifikation

- Fokussierte Service-Suite: 30 bestanden, 0 fehlgeschlagen.
- Kombinierte Service-/Worker-Suite: 78 bestanden, 0 fehlgeschlagen.
- Gesamtsuite mit Testschlüssel: 828 bestanden, 1 PostgreSQL-Opt-in-Test übersprungen, 0 fehlgeschlagen.
- Build: erfolgreich; 41 CSS-Quelldateien, Manifest unverändert.
- Dry-Run: `externalCalls=0`, Artikel valide, Qualitätsscore 90, Publishmodus `draft`.
- `git diff --check`: ohne Befund.

Es wurden keine echten OpenAI- oder Cloudinary-Aufrufe ausgeführt.
