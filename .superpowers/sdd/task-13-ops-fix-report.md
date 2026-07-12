# Task 13 – Ops-Fix für exakten Deploy-/Rollback-Stand

## Ergebnis

Der Rollback-Snapshot wird nicht mehr aus dem beweglichen Tag `komplettwebdesign-app:local` und dem aktuellen Checkout abgeleitet. Das Deployskript ermittelt vor `git fetch`, `git reset` und Build den tatsächlich laufenden App-Container, liest dessen exakte `.Image`-SHA und taggt ausschließlich diese SHA als unveränderliches Rollback-Image.

## TDD-Verlauf

- RED: Nach den neuen Verträgen bestanden 12 von 16 fokussierten Tests. Es fehlten OCI-Revision, laufende Container-Image-SHA, geschützter Git-Ref und der sichere Image-only-Rollback.
- GREEN: Alle 16 fokussierten Tests bestehen. Alle kopierbaren Bash-Blöcke werden weiterhin mit `bash -n` geprüft; die Compose-Ausschnitte werden semantisch mit dem installierten YAML-Parser ausgewertet.

## Deploy-Härtung

- `app.build.labels.org.opencontainers.image.revision` erhält `${APP_REVISION:-unknown}`.
- Nach dem deterministischen Checkout exportiert das Deployskript den geprüften Zielcommit als `APP_REVISION`; nach dem Build wird das Image-Label gegen diesen Commit geprüft.
- Vor Checkout und Build wird die exakte Image-SHA des laufenden App-Containers über `docker inspect '{{.Image}}'` gelesen.
- Der Snapshot taggt diese SHA direkt. Ein bereits vorhandener Rollback-Tag oder eine Metadatendatei wird nicht überschrieben; die getaggte Image-ID wird nochmals gegen die laufende SHA geprüft.
- Das Revision-Label des laufenden Images wird nur bei 40 hexadezimalen Zeichen und einem tatsächlich vorhandenen Git-Commit akzeptiert.
- Ein belegter Commit wird über `refs/deploy-rollbacks/$DEPLOY_ID` vor Git-Garbage-Collection geschützt.
- Ein älteres oder ungültig gelabeltes Image bleibt als Image-Rollback erhalten; Commit und Ref werden ehrlich als `unknown` erfasst.
- Die Metadatendatei besitzt Modus `600` und enthält in fester Reihenfolge Rollback-Tag, exakte Image-ID, Commit beziehungsweise `unknown` und Ref beziehungsweise `unknown`.

## Rollback-Härtung

- Metadaten werden ohne `source` positionsgebunden mit `sed` gelesen und zuvor auf Pfad, Symlinkfreiheit, Eigentümer, Modus, Zeilenzahl und eng begrenzte Formate geprüft.
- Der gespeicherte unveränderliche Tag muss weiterhin exakt auf die gespeicherte Image-ID zeigen.
- Commit und Ref müssen entweder beide `unknown` oder beide belegt sein.
- Bei belegten Werten muss der geschützte Ref exakt auf den gespeicherten Commit auflösen; erst dann erfolgt `git reset --hard` auf den Ref.
- Bei `unknown` erfolgt mit sichtbarer Warnung ein Image-only-Rollback; der Checkout bleibt unverändert und es wird keine Code-/Image-Ausrichtung behauptet.
- Das unveränderliche Image wird in beiden Fällen auf `komplettwebdesign-app:local` zurückgetaggt. App und Worker werden gemeinsam neu erstellt; ein Build ist im Rollback weiterhin ausgeschlossen.

## Verifikation

- `node --test tests/contentAgentDeploymentGuide.test.js`: 16 bestanden, 0 fehlgeschlagen.
- `OPENAI_API_KEY=test-key npm test`: 914 bestanden, 0 fehlgeschlagen, 1 vorhandener PostgreSQL-Opt-in-Test übersprungen.
- `npm run build`: erfolgreich; 41 CSS-Quelldateien, Manifest unverändert.
- `git diff --check`: ohne Befund.

## Bewusste Grenze

Die Abläufe sind statisch über Syntax, Reihenfolge und semantisches YAML geprüft, aber nicht gegen den echten IONOS-VPS, Docker-Daemon oder die Produktionsdatenbank ausgeführt. Der vorhandene destruktive PostgreSQL-Test bleibt ohne ausdrücklich freigegebene Testdatenbank sicher übersprungen.
