# Veröffentlichungsprotokoll der SEO-Reichweiten-Sanierung

**Stand:** 26. Juli 2026

**Branch:** `codex/seo-reichweiten-sanierung`

**Geprüfter Ausgangs-Commit:** `cb12b2d`

**Gesamtstatus:** Nicht zur Veröffentlichung freigegeben

Dieses Dokument ist das Abnahme- und Deploymentprotokoll für die gestaffelte Veröffentlichung. Es bestätigt keinen Produktivgang: Welle 1, Welle 2 und Welle 3 sind nicht veröffentlicht. Es wurden keine Produktionsdaten verändert, keine Inhalte im Content-Agent veröffentlicht und keine Einstellungen in der Google Search Console geändert.

## Technische Vorabprüfung

| Prüfung | Befehl | Ergebnis | Status |
| --- | --- | --- | --- |
| Vollständige Testsuite | `OPENAI_API_KEY=test-only-placeholder npm test` | 2.168 Tests: 2.149 bestanden, 0 fehlgeschlagen, 19 übersprungen; Exitcode 0 | Bestanden |
| Produktions-Build | `npm run build` | 42 CSS-Quelldateien gebaut; Manifest unverändert; Exitcode 0 | Bestanden |
| Arbeitsbaum vor der Dokumentation | `git status --short` | Sauber | Bestanden |
| Patchprüfung vor der Dokumentation | `git diff --check` | Kein Befund | Bestanden |

Die übersprungenen Tests sind als solche ausgewiesen und werden nicht als bestanden gezählt. Test und Build belegen den statisch und isoliert prüfbaren Codestand, ersetzen aber weder den vollständigen lokalen Audit mit Datenbank noch einen Live-Audit.

## Lokaler vollständiger Audit

Der Server wurde begrenzt mit lokalen Platzhalterwerten für OpenAI, Sitzung und Stripe gestartet. Anschließend wurde ausgeführt:

```bash
npm run audit:seo-recovery -- \
  --base-url http://127.0.0.1:3000 \
  --out .superpowers/sdd/2026-07-26-seo-reichweiten-sanierung/seo-recovery-local-final.json \
  --fail-on error
```

Ergebnis: **nicht bestanden**, Exitcode 1.

| Kennzahl | Wert |
| --- | ---: |
| Erfasste Seiten | 62 |
| Erfasste Weiterleitungen | 2 |
| Fehler | 72 |
| Warnungen | 8 |

Fehlergruppen:

- 62 × `page_status`
- 8 × `orphan_priority_page`
- 2 × `redirect_target_status`
- zusätzlich 8 Warnungen vom Typ `low_inlink_count`

Die fehlende lokale PostgreSQL-Datenbank `blocksdorf` (`SQLSTATE 3D000`) verursachte den Großteil der nicht auswertbaren Antworten. Zusätzlich ergab die anschließende statische Prüfung zwei echte Sitemapfehler: `/ratgeber/website-kosten-zeitplan` und `/ratgeber/kosten-einfache-website` waren in der Sitemap-Policy aktiv, während ihre Routen auskommentiert waren und 404 lieferten. Beide Einträge wurden nach einem roten Regressionstest aus der Sitemap-Policy entfernt. Das blockierte Audit-Artefakt entstand vor dieser Korrektur und ist keine belastbare fachliche SEO-Abnahme. Insbesondere werden **nicht** 0 Fehler, vollständige Sitemapabdeckung, korrekte H1-Anzahlen, vollständige Pflichtlinks oder fehlerfreie Redirectziele behauptet.

Das JSON-Artefakt liegt ausschließlich im ignorierten SDD-Arbeitsordner und wird nicht committet.

### Nachholung in einer vollständigen lokalen Laufzeit

Die Projektumgebung muss PostgreSQL mit dem vorgesehenen Schema und realistischen, nicht produktiven Inhalten bereitstellen. Geheimnisse dürfen dabei weder ausgegeben noch in dieses Protokoll geschrieben werden.

In einem bereits sicher konfigurierten Laufzeitkontext:

```bash
npm start
```

In einem zweiten Terminal:

```bash
npm run audit:seo-recovery -- \
  --base-url http://127.0.0.1:3000 \
  --out .superpowers/sdd/2026-07-26-seo-reichweiten-sanierung/seo-recovery-local-final-rerun.json \
  --fail-on error
```

Freigabebedingungen sind Exitcode 0, 0 Fehler, keine aktive Redirectquelle in der Sitemap, keine Redirectkette, kein Canonical auf eine Redirectquelle, genau eine H1 pro indexierbarer Seite, keine verwaiste priorisierte Zielseite und alle Registry-Pflichtlinks.

## Manuelle Seitentypprüfung

Die visuelle und interaktive Prüfung auf Mobil und Desktop wurde nicht als bestanden markiert. Ohne funktionsfähige PostgreSQL-Laufzeit lieferten datenbankabhängige Seitenteile Fehler; eine teilweise Darstellung wäre kein belastbarer Abnahmenachweis.

| Seite | Status, Canonical, Robots, H1 | Hauptlinks, Navigation, Kontaktweg | Sprache und mobile Darstellung | Abnahme |
| --- | --- | --- | --- | --- |
| `/` | offen | offen | offen | blockiert |
| `/webdesign-berlin` | offen | offen | offen | blockiert |
| `/website-erstellen-lassen-berlin` | direkte 301 lokal bereits in Task 3 belegt; erneut offen | Weiterleitungsziel offen | nicht anwendbar | blockiert |
| `/pakete` | offen | offen | offen | blockiert |
| `/en/pakete` | `noindex,follow` durch Tests belegt; Renderprüfung offen | offen | offen | blockiert |
| `/leistungen/website-audit` | offen | offen | offen | blockiert |
| `/leistungen/website-wartung` | offen | offen | offen | blockiert |
| `/leistungen/local-seo` | offen | offen | offen | blockiert |
| `/branchen/webdesign-blumenladen` | offen | offen | offen | blockiert |
| `/blog/seo-fuer-blumenladen` | offen | offen | offen | blockiert |
| `/blog/website-kosten-2025-einfach-erklaert` | offen | offen | offen | blockiert |
| `/blog/website-kosten-2026-berlin-vergleich-2025` | direkte 301 lokal bereits in Task 7 belegt; erneut offen | Weiterleitungsziel offen | nicht anwendbar | blockiert |
| `/website-tester` | offen | offen | offen | blockiert |
| `/website-tester/seo` | offen | offen | offen | blockiert |

Für die Nachholung sind alle Zeilen auf einem mobilen und einem Desktop-Viewport zu prüfen. Pro Seite sind HTTP-Status, Canonical, Robots, genau eine H1, Hauptlinks, Navigation, Kontaktweg, Sprache, Umbruch, horizontales Überlaufen und bedienbare Handlungsaufforderungen zu protokollieren.

## Dauerhafte Nachweisablage

Der ignorierte SDD-Ordner ist ausschließlich für vorläufige oder blockierte lokale Artefakte zulässig. Erfolgreiche Live-Audits, Lighthouse-Berichte, Abschlussprüfungen und Backupnachweise müssen dauerhaft unter folgendem versionierbaren Pfad abgelegt werden:

```text
docs/seo/audit-nachweise/welle-<N>/<UTC-Zeitstempel>-<Kandidaten-Commit>/
```

Jeder Nachweisordner enthält:

- die unveränderten JSON-Ausgaben von SEO-Audit und gegebenenfalls Lighthouse,
- `nachweis.md` mit UTC-Prüfzeitpunkt, Welle, Kandidaten-Tag, vollständigem Kandidaten-Commit, Rollback-Commit, Befehl, Exitcode und Ergebnis,
- `SHA256SUMS` mit der SHA-256-Prüfsumme jeder Nachweisdatei,
- bei Welle 2 zusätzlich Backup-, Restore- und Migration-016-Nachweise.

Beispiel für die Prüfsummenbildung:

```bash
sha256sum docs/seo/audit-nachweise/welle-<N>/<LAUF-ID>/*.json \
  > docs/seo/audit-nachweise/welle-<N>/<LAUF-ID>/SHA256SUMS
sha256sum --check docs/seo/audit-nachweise/welle-<N>/<LAUF-ID>/SHA256SUMS
```

Der komplette Nachweisordner wird nach erfolgreicher Prüfung in einem separaten Nachweiskommit versioniert und zusätzlich mit der Release-Dokumentation archiviert. Ein Pfad im SDD-Ordner gilt nicht als Live-Abnahmenachweis.

## Deployment-Gates

### Gemeinsame Gates vor jeder Welle

Eine Welle darf erst veröffentlicht werden, wenn:

1. Arbeitsbaum, vollständige Testsuite und Build sauber sind,
2. der vollständige lokale Audit mit Datenbank 0 Fehler meldet,
3. die manuelle Mobil- und Desktopprüfung abgeschlossen ist,
4. ein konkreter, unveränderlicher Kandidaten-Tag auf genau einem Kandidaten-Commit sowie ein Rollback-Commit feststehen,
5. der Content-Agent weiterhin im Betriebsmodus `review` läuft und Auto-Publish aus ist,
6. der Deploymentprozess den Commit aus dem Kandidaten-Tag verwendet und nicht den jeweils aktuellen `HEAD`,
7. nach dem Deployment der Live-Audit 0 Fehler meldet und dauerhaft mit Datum, Commit, Pfad und Prüfsumme archiviert ist.

In den ersten acht Wochen werden keine neuen SEO-Zielseiten veröffentlicht. Es gibt keine massenhafte URL-Migration und keine Ranking-, Besucher- oder Anfragegarantie.

### Verbindlicher Release-Kandidatenvertrag

Der aktuelle Entwicklungsbranch ist kein pauschaler Deploymentkandidat. Für jede Welle wird ein eigener Release-Branch aus dem tatsächlich laufenden Rollback-Commit aufgebaut und mit einem annotierten Kandidaten-Tag eingefroren.

| Welle | Einzuschließende Tasks | Auszuschließende Tasks | Quellbereich |
| --- | --- | --- | --- |
| 1 | Tasks 1–4 und die Sitemap-404-Korrektur aus Fix-Runde 1 | Tasks 5–11; Task 12 außer der Sitemap-Korrektur | `8172029..7960c61` plus Task-12-Fix-Commit |
| 2 | bereits freigegebene Welle 1 sowie Tasks 5–9 | Tasks 10–11; reine Task-12-Dokumentation | `7960c61..1772a13` auf dem Welle-1-Kandidaten |
| 3 | bereits freigegebene Wellen 1–2 sowie Task 10 | Task 11; reine Task-12-Dokumentation | `1772a13..eb56110` auf dem Welle-2-Kandidaten |

Vor Welle 1 wird der Rollback-Commit aus dem laufenden App-Image gelesen und als vollständige Commit-ID validiert:

```bash
RUNNING_APP_CONTAINER="$(docker compose ps -q app)"
ROLLBACK_COMMIT="$(docker image inspect \
  --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' \
  "$RUNNING_APP_CONTAINER")"
git cat-file -e "${ROLLBACK_COMMIT}^{commit}"
```

Beispiel für Welle 1; `<TASK-12-FIX-COMMIT>` wird durch den vollständigen Hash dieses Fix-Commits ersetzt:

```bash
git switch -c release/seo-sanierung-welle-1 "$ROLLBACK_COMMIT"
git cherry-pick 8172029..7960c61
git cherry-pick <TASK-12-FIX-COMMIT>
CANDIDATE_TAG="seo-sanierung-welle-1-kandidat-<YYYYMMDD>"
git tag -a "$CANDIDATE_TAG" -m "SEO-Sanierung Welle 1 Kandidat"
CANDIDATE_COMMIT="$(git rev-parse "${CANDIDATE_TAG}^{commit}")"
test "$(git rev-parse HEAD)" = "$CANDIDATE_COMMIT"
```

Welle 2 wird aus dem freigegebenen Welle-1-Kandidaten erstellt und ergänzt ausschließlich den angegebenen Quellbereich:

```bash
ROLLBACK_COMMIT="$(git rev-parse "${WELLE_1_TAG}^{commit}")"
git switch -c release/seo-sanierung-welle-2 "$ROLLBACK_COMMIT"
git cherry-pick 7960c61..1772a13
CANDIDATE_TAG="seo-sanierung-welle-2-kandidat-<YYYYMMDD>"
git tag -a "$CANDIDATE_TAG" -m "SEO-Sanierung Welle 2 Kandidat"
CANDIDATE_COMMIT="$(git rev-parse "${CANDIDATE_TAG}^{commit}")"
test "$(git rev-parse HEAD)" = "$CANDIDATE_COMMIT"
```

Welle 3 wird entsprechend aus dem freigegebenen Welle-2-Kandidaten erstellt:

```bash
ROLLBACK_COMMIT="$(git rev-parse "${WELLE_2_TAG}^{commit}")"
git switch -c release/seo-sanierung-welle-3 "$ROLLBACK_COMMIT"
git cherry-pick 1772a13..eb56110
CANDIDATE_TAG="seo-sanierung-welle-3-kandidat-<YYYYMMDD>"
git tag -a "$CANDIDATE_TAG" -m "SEO-Sanierung Welle 3 Kandidat"
CANDIDATE_COMMIT="$(git rev-parse "${CANDIDATE_TAG}^{commit}")"
test "$(git rev-parse HEAD)" = "$CANDIDATE_COMMIT"
```

Vor jedem Deployment müssen Kandidaten-Tag, Kandidaten-Commit, inkludierte und ausgeschlossene Tasks sowie Rollback-Commit in diesem Protokoll nachgetragen werden. Der produktive Build muss dieselbe Commit-ID im OCI-Label `org.opencontainers.image.revision` tragen; eine abweichende oder nicht auflösbare ID sperrt das Deployment.

### Welle 1 – Tasks 1 bis 4

| Feld | Protokoll |
| --- | --- |
| Status | **Nicht veröffentlicht** |
| Kandidaten-Tag | nicht erstellt; Pflichtmuster `seo-sanierung-welle-1-kandidat-<YYYYMMDD>` |
| Kandidaten-Commit | nicht vorhanden |
| Inkludiert | Tasks 1–4 und Sitemap-404-Korrektur |
| Exkludiert | Tasks 5–11 und reine Task-12-Dokumentation |
| Rollback-Commit | vollständige Revision des vor Welle 1 laufenden App-Images; noch nicht erfasst |
| Deploymentdatum | nicht vorhanden |
| Live-Audit direkt nach Deployment | nicht ausgeführt |
| Abschluss-Live-Audit nach mindestens 48 Stunden | nicht ausgeführt |
| 48-Stunden-Fenster | nicht gestartet |

Direkt nach einem autorisierten Deployment wird ein dauerhafter Nachweisordner für exakt den Kandidaten-Commit angelegt:

```bash
PRUEFZEITPUNKT_UTC="$(date -u +%Y%m%dT%H%M%SZ)"
KANDIDAT_COMMIT="$(git rev-parse "${CANDIDATE_TAG}^{commit}")"
NACHWEIS_DIR="docs/seo/audit-nachweise/welle-1/${PRUEFZEITPUNKT_UTC}-${KANDIDAT_COMMIT}"
mkdir -p "$NACHWEIS_DIR"
npm run audit:seo-recovery -- \
  --base-url https://www.komplettwebdesign.de \
  --out "$NACHWEIS_DIR/seo-live-t0.json" \
  --fail-on error
sha256sum "$NACHWEIS_DIR/seo-live-t0.json" > "$NACHWEIS_DIR/SHA256SUMS"
sha256sum --check "$NACHWEIS_DIR/SHA256SUMS"
```

In `nachweis.md` werden Beginn des Fensters, UTC-Prüfzeitpunkt, Kandidaten-Tag, vollständiger Kandidaten-Commit, Rollback-Commit, Exitcode und Audit-Zusammenfassung eingetragen.

Frühestens 48 Stunden nach dem dokumentierten Beginn muss auf demselben Kandidaten-Commit ein Abschluss-Live-Audit ausgeführt werden:

```bash
test "$(git rev-parse "${CANDIDATE_TAG}^{commit}")" = "$KANDIDAT_COMMIT"
npm run audit:seo-recovery -- \
  --base-url https://www.komplettwebdesign.de \
  --out "$NACHWEIS_DIR/seo-live-t48h.json" \
  --fail-on error
sha256sum "$NACHWEIS_DIR/seo-live-t0.json" "$NACHWEIS_DIR/seo-live-t48h.json" \
  > "$NACHWEIS_DIR/SHA256SUMS"
sha256sum --check "$NACHWEIS_DIR/SHA256SUMS"
```

Der zweite Prüfzeitpunkt, die tatsächlich verstrichene Dauer von mindestens 48 Stunden und beide Ergebnisse werden in `nachweis.md` ergänzt. Erst wenn beide Audits Exitcode 0 und 0 Fehler melden und keine neue Indexierungs-, Weiterleitungs- oder Linkregression vorliegt, darf Welle 2 freigegeben werden.

### Welle 2 – Tasks 5 bis 9

| Feld | Protokoll |
| --- | --- |
| Status | **Nicht veröffentlicht** |
| Voraussetzung | Welle 1 mindestens 48 Stunden regressionsfrei; noch nicht erfüllt |
| Kandidaten-Tag | nicht erstellt; Pflichtmuster `seo-sanierung-welle-2-kandidat-<YYYYMMDD>` |
| Kandidaten-Commit | nicht vorhanden |
| Inkludiert | freigegebene Welle 1 und Tasks 5–9 |
| Exkludiert | Tasks 10–11 und reine Task-12-Dokumentation |
| Rollback-Commit | vollständiger freigegebener Welle-1-Kandidaten-Commit; noch nicht vorhanden |
| Deploymentdatum | nicht vorhanden |
| Migration 016 | nicht auf Produktion ausgeführt |
| Dynamische Contentänderungen | nicht ausgeführt |
| Live-Audit | nicht ausgeführt |

#### Gate: Migration 016

Migration `scripts/migrations/016_update_package_meta_descriptions.sql` ist in den transaktionalen Runner eingebunden, wurde aber nicht auf einer Produktionsdatenbank ausgeführt. Sie darf erst nach geprüftem Backup, erfolgreichem Listen- und Restore-Test und im autorisierten Deploymentkontext laufen.

```bash
PRUEFZEITPUNKT_UTC="$(date -u +%Y%m%dT%H%M%SZ)"
KANDIDAT_COMMIT="$(git rev-parse "${CANDIDATE_TAG}^{commit}")"
NACHWEIS_DIR="docs/seo/audit-nachweise/welle-2/${PRUEFZEITPUNKT_UTC}-${KANDIDAT_COMMIT}"
mkdir -p "$NACHWEIS_DIR"
npm run backup:postgres
```

Der absolute Dump-Pfad aus der erfolgreichen Backup-Ausgabe wird ohne Zugangsdaten in `DUMP_PATH` übernommen. Ein bloß vorhandener Dateiname genügt nicht:

```bash
DUMP_PATH="/absoluter/pfad/aus-der-backup-ausgabe.dump"
test -f "$DUMP_PATH"
test -s "$DUMP_PATH"
pg_restore --list "$DUMP_PATH" > "$NACHWEIS_DIR/backup-contents.txt"
test -s "$NACHWEIS_DIR/backup-contents.txt"
sha256sum "$DUMP_PATH" "$NACHWEIS_DIR/backup-contents.txt" \
  > "$NACHWEIS_DIR/backup-SHA256SUMS"
sha256sum --check "$NACHWEIS_DIR/backup-SHA256SUMS"
```

Vor der Produktionsmigration ist ein Restore in einer freigegebenen, separaten PostgreSQL-Testdatenbank Pflicht. Der feste Datenbankname darf nur verwendet werden, wenn er nachweislich nicht existiert:

```bash
RESTORE_TEST_DB="kwd_restore_test_migration016"
if psql -Atqc "SELECT 1 FROM pg_database WHERE datname = '${RESTORE_TEST_DB}'" | grep -Fxq 1; then
  printf 'Restore-Testdatenbank existiert bereits; Abbruch.\n' >&2
  exit 1
fi
createdb "$RESTORE_TEST_DB"
trap 'dropdb --if-exists kwd_restore_test_migration016' EXIT
pg_restore --exit-on-error --no-owner --no-acl --dbname="$RESTORE_TEST_DB" "$DUMP_PATH"
DB_NAME="$RESTORE_TEST_DB" npm run migrate:content-agent
DB_NAME="$RESTORE_TEST_DB" npm run migrate:content-agent
DB_NAME="$RESTORE_TEST_DB" psql -v ON_ERROR_STOP=1 --dbname="$RESTORE_TEST_DB" -c \
  "SELECT package_key, meta_description FROM pricing_packages WHERE package_key IN ('business', 'individuell') ORDER BY package_key;"
dropdb "$RESTORE_TEST_DB"
trap - EXIT
```

Erst nach dem erfolgreichen Restore-Test darf der Runner im Produktionskontext zweimal ausgeführt werden:

```bash
npm run migrate:content-agent
npm run migrate:content-agent
```

Der zweite Lauf prüft die Idempotenz. Anschließend müssen ausschließlich die beiden vorgesehenen Paketwerte kontrolliert werden:

```sql
SELECT package_key, meta_description
FROM pricing_packages
WHERE package_key IN ('business', 'individuell')
ORDER BY package_key;
```

Erwartet werden genau die in Migration 016 hinterlegten Beschreibungen. Preise, Slugs, Titel, Pfade und Leistungsfelder dürfen sich nicht ändern. Dump-Pfad, Dump-Prüfsumme, `pg_restore --list`, erfolgreicher Restore-Test, beide Migrationsläufe, Migrationszeitpunkt, ausführende Person und Abfrageergebnis werden im dauerhaften Welle-2-Nachweisordner abgelegt. Zugangsdaten oder vollständige Umgebungsvariablen gehören nicht in das Protokoll.

#### Gate: Content-Agent und Admininhalte

Verbindliche Quelle für alle Werte und den autorisierten Ablauf ist der [Content-Brief zu Website-Kosten und Blumenladen](content-briefs/2026-07-26-kosten-und-blumenladen.md). Diese Schritte benötigen eine autorisierte Adminsession und sind nicht durch die Codeänderungen erledigt.

| Bestehender Inhalt | Meta-Titel | Meta-Description | H1 | Pflichtlinks | Primärer nächster Schritt |
| --- | --- | --- | --- | --- | --- |
| `/blog/website-kosten-2025-einfach-erklaert` | `Website-Kosten 2026: Preise für Selbstständige` | `Was kostet eine professionelle Website 2026? Realistische Preisbereiche, laufende Kosten, Leistungsunterschiede und Beispiele für Selbstständige.` | `Website-Kosten 2026: realistische Preise für Selbstständige` | `/pakete`, `/leistungen/laufende-kosten-website`, `/webdesign-berlin` | kaufnaher Übergang `Pakete ansehen` → `/pakete` |
| `/branchen/webdesign-blumenladen` | `Webdesign für Blumenläden \| Website erstellen lassen` | `Webdesign für Blumenläden: individuelle Website, lokale Auffindbarkeit, Sortiment, Öffnungszeiten und klare Kontaktwege für Floristikbetriebe.` | `Webdesign für Blumenläden` | `/blog/seo-fuer-blumenladen`, `/pakete`, `/webdesign-berlin` | `Pakete ansehen` → `/pakete` |
| `/blog/seo-fuer-blumenladen` | `SEO für Blumenläden: lokal besser gefunden werden` | `So verbessern Blumenläden ihre lokale Sichtbarkeit: Google-Unternehmensprofil, Standortsignale, Sortiment, Bilder, Bewertungen und passende Website-Inhalte.` | `SEO für Blumenläden: lokal besser gefunden werden` | `/branchen/webdesign-blumenladen`, `/leistungen/local-seo` | `Webdesign für Blumenläden ansehen` → `/branchen/webdesign-blumenladen` |

Die beiden Blumenladen-Inhalte müssen unterschiedliche Suchabsichten und primäre Handlungsaufforderungen behalten: Die Branchenseite führt kaufnah zu den Paketen, der Blogartikel informationell zur Branchenseite. Der Kostenartikel führt zur Paketübersicht, ohne einen neuen Artikel anzulegen.

1. Betriebsmodus im Content-Agent als `review` bestätigen; Auto-Publish bleibt aus.
2. Unter „Bestehende Inhalte“ den Artikel `website-kosten-2025-einfach-erklaert` nach dem verlinkten Content-Brief und der Tabelle vollständig revidieren.
3. Fakten, Preise, alle drei Pflichtlinks, CTA und Jahreszahl prüfen, die geprüfte Revision veröffentlichen und `website-kosten-2026-berlin-vergleich-2025` unveröffentlichen.
4. Unter `/admin/industries` beim bestehenden Datensatz `Blumenladen` ausschließlich SEO-Titel, Meta-Description und Hero-H1 nach Tabelle und Brief aktualisieren; Slug und Veröffentlichungsstatus nicht ändern.
5. In der Branchenseitenvorschau alle drei Pflichtlinks und `Pakete ansehen` → `/pakete` prüfen.
6. Unter `/admin/content-agent/existing-content` den Artikel `seo-fuer-blumenladen` als Revision aktualisieren, beide Pflichtlinks, den abweichenden CTA, Vorher-Nachher-Vergleich und Vorschau prüfen und erst dann ausdrücklich freigeben.
7. Keine neue Seite und keinen neuen Artikel anlegen. Preise, rechtliche Aussagen und Rankinggarantien nicht verändern.
8. Beide Kostenartikel-URLs und beide Blumenladen-URLs live prüfen; Titel, Description, H1, Pflichtlinks, unterschiedliche CTAs und genau einstufige 301-Weiterleitung bestätigen.

Nach Deployment, Migration und den autorisierten Adminschritten:

```bash
npm run audit:seo-recovery -- \
  --base-url https://www.komplettwebdesign.de \
  --out "$NACHWEIS_DIR/seo-live.json" \
  --fail-on error
sha256sum "$NACHWEIS_DIR/seo-live.json" > "$NACHWEIS_DIR/SHA256SUMS"
sha256sum --check "$NACHWEIS_DIR/SHA256SUMS"
```

Datum, Commit, Migrationsergebnis und jede dynamische Inhaltsfreigabe müssen separat nachgetragen werden.

### Welle 3 – Task 10

Task 11 ist externe Reichweitenarbeit und kein Deploymentbestandteil.

| Feld | Protokoll |
| --- | --- |
| Status | **Nicht veröffentlicht** |
| Voraussetzung | Welle 2 vollständig abgenommen; noch nicht erfüllt |
| Kandidaten-Tag | nicht erstellt; Pflichtmuster `seo-sanierung-welle-3-kandidat-<YYYYMMDD>` |
| Kandidaten-Commit | nicht vorhanden |
| Inkludiert | freigegebene Wellen 1–2 und Task 10 |
| Exkludiert | Task 11 und reine Task-12-Dokumentation |
| Rollback-Commit | vollständiger freigegebener Welle-2-Kandidaten-Commit; noch nicht vorhanden |
| Deploymentdatum | nicht vorhanden |
| Live-Audit | nicht ausgeführt |
| Lighthouse | lokal wegen fehlender PostgreSQL-Datenbank nicht messbar |

Nach dem autorisierten Deployment sind Live-Audit und Lighthouse auf demselben Commit auszuführen. Datum, Commit und Artefaktpfade werden erst nach tatsächlicher Messung eingetragen:

```bash
PRUEFZEITPUNKT_UTC="$(date -u +%Y%m%dT%H%M%SZ)"
KANDIDAT_COMMIT="$(git rev-parse "${CANDIDATE_TAG}^{commit}")"
NACHWEIS_DIR="docs/seo/audit-nachweise/welle-3/${PRUEFZEITPUNKT_UTC}-${KANDIDAT_COMMIT}"
mkdir -p "$NACHWEIS_DIR"
npm run audit:seo-recovery -- \
  --base-url https://www.komplettwebdesign.de \
  --out "$NACHWEIS_DIR/seo-live.json" \
  --fail-on error

npx --yes lighthouse https://www.komplettwebdesign.de \
  --only-categories=performance,accessibility,seo,best-practices \
  --form-factor=mobile \
  --output=json \
  --output-path="$NACHWEIS_DIR/lighthouse-home-mobile.json" \
  --chrome-flags="--headless --no-sandbox"
sha256sum "$NACHWEIS_DIR/seo-live.json" "$NACHWEIS_DIR/lighthouse-home-mobile.json" \
  > "$NACHWEIS_DIR/SHA256SUMS"
sha256sum --check "$NACHWEIS_DIR/SHA256SUMS"
```

`nachweis.md` muss den UTC-Prüfzeitpunkt, Kandidaten-Tag, vollständigen Kandidaten-Commit, Rollback-Commit, Befehle, Exitcodes, Audit-Zusammenfassung und Lighthouse-Werte enthalten. Es werden keine Lighthouse-Werte behauptet, bevor ein vollständiges, erfolgreiches Artefakt vorliegt.

## Google Search Console

**Status:** Nicht verändert. Es lag weder eine autorisierte Search-Console-Sitzung noch das erforderliche Veröffentlichungs- und 48-Stunden-Fenster vor.

Erst nach erfolgreicher Veröffentlichung und Live-Abnahme:

1. neue Sitemap genau einmal einreichen,
2. `/webdesign-berlin` inspizieren,
3. `/website-erstellen-lassen-berlin` inspizieren,
4. `/blog/website-kosten-2025-einfach-erklaert` inspizieren,
5. `/blog/website-kosten-2026-berlin-vergleich-2025` inspizieren,
6. `/branchen/webdesign-blumenladen` inspizieren,
7. `/blog/seo-fuer-blumenladen` inspizieren.

Für alle 123 Seiten wird keine massenhafte manuelle Indexierungsanforderung gestellt. Ausführungsdatum, Property, Ergebnis der URL-Prüfungen und ausführende Person müssen anschließend ergänzt werden.

## Offene Freigabepunkte

- [ ] Vollständige lokale PostgreSQL-Laufzeit bereitstellen.
- [ ] Lokalen Audit mit 0 Fehlern wiederholen.
- [ ] Alle 14 Seitentypen auf Mobil und Desktop manuell abnehmen.
- [ ] Pro Welle Kandidaten-Tag, Kandidaten-Commit, inkludierte und ausgeschlossene Tasks sowie Rollback-Commit festhalten.
- [ ] Welle 1 autorisiert deployen und live auditieren.
- [ ] Nach mindestens 48 Stunden den Welle-1-Abschluss-Live-Audit auf demselben Commit ausführen und beide Prüfzeitpunkte sowie Ergebnisse dokumentieren.
- [ ] Vor Welle 2 Dump-Pfad und Prüfsumme prüfen, `pg_restore --list` und Restore-Test erfolgreich ausführen sowie Migration 016 zweimal idempotent ausführen.
- [ ] Kosten- und Blumenladen-Inhalte über die autorisierten Adminabläufe freigeben.
- [ ] Welle 2 live auditieren und dynamische Änderungen separat bestätigen.
- [ ] Welle 3 deployen, live auditieren und Lighthouse vollständig messen.
- [ ] Alle erfolgreichen Live- und Lighthouse-Artefakte mit `nachweis.md` und `SHA256SUMS` unter `docs/seo/audit-nachweise/` versionieren und archivieren.
- [ ] Search Console nach erfolgreichem Veröffentlichungsfenster gezielt aktualisieren.

Bis alle für die jeweilige Welle geltenden Punkte belegt sind, lautet die Entscheidung: **keine Veröffentlichung**.
