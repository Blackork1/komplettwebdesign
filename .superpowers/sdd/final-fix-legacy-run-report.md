# Final-Fix – Legacy-Schutz, Run-Abschluss und Auto-Recovery

## Ergebnis

Unveröffentlichte KI-Entwürfe können nicht mehr über die alten Blogrouten bearbeitet oder gelöscht werden. Alle terminalen Ergebnisse der Draft-Pipeline und der Regeneration benötigen einen nachweislich persistierten Run-Abschluss. Bereits atomar veröffentlichte Auto-Publish-Läufe können fehlende Pipeline-Stufen auch dann ergänzen, wenn ein aktueller technischer Hardgate inzwischen deaktiviert ist.

## Legacy-Schutz

- `GET /admin/blog/:id/edit` leitet unveröffentlichte KI-Entwürfe zum Content-Agent-Editor um.
- Legacy-Update, Bildänderung und Delete werden serverseitig vor jeder Mutation mit HTTP 409 abgewiesen.
- Blogliste und Legacy-Editor zeigen für diese Entwürfe ausschließlich Content-Agent-Editor, sichere Vorschau und bestätigte Ablehnung.
- Bereits veröffentlichte KI-Beiträge sowie manuell gepflegte Beiträge behalten ihre bisherigen Legacy-Aktionen.

## Strikter Run-Abschluss

- `completed`, `needs_manual_attention` und `failed` gelten nur noch nach einem nichtleeren objektförmigen Ergebnis von `finishRun` als terminal.
- `null`, `undefined` und geworfene Persistenzfehler werden als `CONTENT_RUN_FINISH_FAILED` mit `retryable=true` weitergegeben.
- Unmittelbar vor jedem Abschluss wird die Lease erneut geprüft; ein Leaseverlust wird unverändert weitergegeben.
- Draft-Pipeline und Regenerationsservice verwenden dasselbe fail-closed Verhalten. Bestehende Audit- und Cleanup-Pfade bleiben erhalten.

## Auto-Publish-Recovery

- Ein vorhandenes `allowed`-Event ist nur zusammen mit dem bereits veröffentlichten Post ein committed Zustand.
- Vor der Wiederaufnahme werden unveränderliche Identitätsdaten wie Post, Run, Policy, Qualitätsscore und Snapshot-Kontext strikt gegen das Event geprüft.
- Bei bestätigter Identität wird der committed Zustand übernommen, ohne aktuelle Policy-Neubewertung, erneute Publikation oder Provideraufrufe.
- Die Pipeline ergänzt anschließend fehlende `auto_publish`- und `completed`-Stufen und persistiert den Run-Abschluss.
- Blockierte oder widersprüchliche Events bleiben weiterhin fail-closed und werden nach dem aktuellen Draftzustand revalidiert.

## TDD-Nachweis

RED reproduzierte die drei Fehlerklassen:

- Legacy-Update und Legacy-Delete akzeptierten unveröffentlichte KI-Entwürfe teilweise weiterhin.
- Run-Abschlüsse mit `null` oder geworfenen Fehlern wurden als erfolgreicher beziehungsweise manueller Abschluss behandelt.
- Ein bereits committed Auto-Publish-Zustand kollidierte beim Retry mit einem später deaktivierten technischen Hardgate.

GREEN deckt Route, UI, Pipeline, Regeneration und Publikations-Recovery einschließlich Null-, Throw- und Lease-Pfaden ab.

## Verifikation

- Erstes fokussiertes Paket: 150 bestanden, 0 fehlgeschlagen.
- Breite Content-Agent-/Admin-Suite: 234 bestanden, 0 fehlgeschlagen.
- Gesamtsuite mit Testschlüssel: 934 bestanden, 1 erwarteter Skip, 0 fehlgeschlagen.
- Build: erfolgreich; 41 CSS-Quelldateien, Manifest unverändert.
- Dry-Run: `externalCalls=0`, 42 simulierte Adapteraufrufe, Artikel valide, Qualitätsscore 90, Publishmodus `draft`.
- Syntaxprüfung der geänderten JavaScript-Dateien: ohne Befund.
- `git diff --check`: ohne Befund.

Es wurden keine echten OpenAI-, Cloudinary- oder sonstigen externen Provideraufrufe ausgeführt.
