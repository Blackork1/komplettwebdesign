# Veröffentlichungsprotokoll der SEO-Reichweiten-Sanierung

**Stand:** 26. Juli 2026

**Branch:** `codex/seo-reichweiten-sanierung`

**Prüfstand:** wird für jeden Kandidaten reproduzierbar aus dem annotierten Kandidaten-Tag ermittelt; der aktuelle Branch-`HEAD` ist kein Freigabenachweis

**Gesamtstatus:** Nicht zur Veröffentlichung freigegeben

Dieses Dokument ist das Abnahme- und Deploymentprotokoll für die gestaffelte Veröffentlichung. Es bestätigt keinen Produktivgang: Welle 1, Welle 2 und Welle 3 sind nicht veröffentlicht. Es wurden keine Produktionsdaten verändert, keine Inhalte im Content-Agent veröffentlicht und keine Einstellungen in der Google Search Console geändert.

## Technische Vorabprüfung

| Prüfung | Befehl | Ergebnis | Status |
| --- | --- | --- | --- |
| Vollständige Testsuite | `OPENAI_API_KEY=test-only-placeholder npm test` | Historischer Lauf war grün; für den Kandidaten zwingend neu ausführen und unverändert archivieren | Offen je Kandidat |
| Produktions-Build | `npm run build` | Historischer Lauf war grün; für den Kandidaten zwingend neu ausführen und unverändert archivieren | Offen je Kandidat |
| Arbeitsbaum | `git status --short` | Muss für den Kandidaten leer sein | Offen je Kandidat |
| Patchprüfung | `git diff --check` | Muss für den Kandidaten ohne Befund sein | Offen je Kandidat |

Die frühere absolute Testanzahl wird nicht als aktueller Nachweis fortgeschrieben. Stattdessen wird der unveränderliche Prüfcommit dynamisch ermittelt und die vollständige Ausgabe pro Kandidat archiviert:

```bash
set -euo pipefail
KANDIDAT_COMMIT="$(git rev-parse "${CANDIDATE_TAG}^{commit}")"
test "$(git rev-parse HEAD)" = "$KANDIDAT_COMMIT"
test -z "$(git status --short)"
NACHWEIS_DIR="docs/seo/audit-nachweise/welle-<N>/<UTC-Zeitstempel>-${KANDIDAT_COMMIT}"
mkdir -p "$NACHWEIS_DIR"
printf '%s\n' "$KANDIDAT_COMMIT" > "$NACHWEIS_DIR/gepruefter-commit.txt"
OPENAI_API_KEY=test-only-placeholder npm test 2>&1 | tee "$NACHWEIS_DIR/npm-test.txt"
npm run build 2>&1 | tee "$NACHWEIS_DIR/npm-build.txt"
git diff --check 2>&1 | tee "$NACHWEIS_DIR/git-diff-check.txt"
```

Übersprungene Tests werden nicht als bestanden gezählt. Test und Build belegen den statisch und isoliert prüfbaren Codestand, ersetzen aber weder den vollständigen lokalen Audit mit Datenbank noch einen Live-Audit.

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
8. für jeden enthaltenen Redirect der vollständige R1- beziehungsweise R2-Nachweis aus der [Redirect-Entscheidungsmappe](2026-07-26-redirect-entscheidungsmappe.md) vorliegt.

In den ersten acht Wochen werden keine neuen SEO-Zielseiten veröffentlicht. Es gibt keine massenhafte URL-Migration und keine Ranking-, Besucher- oder Anfragegarantie.

### Verbindlicher Release-Kandidatenvertrag

Der aktuelle Entwicklungsbranch ist kein pauschaler Deploymentkandidat. Für jede Welle wird ein eigener Release-Branch aus dem tatsächlich laufenden Rollback-Commit aufgebaut und mit einem annotierten Kandidaten-Tag eingefroren.

| Welle | Einzuschließende Tasks | Auszuschließende Tasks | Quellbereich |
| --- | --- | --- | --- |
| 1 | Tasks 1–4 und ein separat erzeugter Code-only-Backport der Sitemap-404-Korrektur, aber Task 3 erst nach R1-Freigabe | Bis R1: Redirectcommits `dce016a` und `010cac4`; außerdem Tasks 5–11 und sämtliche Task-12-Dokumentation | erst nach R1: `8172029..7960c61` plus neuer Backport-Commit mit exakt zwei Dateien |
| 2 | bereits freigegebene Welle 1 sowie Tasks 5–9, aber Task 7 erst nach R2-Freigabe | Bis R2: Redirectcommit `c503733`; außerdem Tasks 10–11 und reine Task-12-Dokumentation | erst nach R2: `7960c61..1772a13` auf dem Welle-1-Kandidaten |
| 3 | bereits freigegebene Wellen 1–2 sowie Task 10 | Task 11; reine Task-12-Dokumentation | `1772a13..eb56110` auf dem Welle-2-Kandidaten |

Vor Welle 1 wird der Rollback-Commit aus dem laufenden App-Image gelesen und als vollständige Commit-ID validiert:

```bash
RUNNING_APP_CONTAINER="$(docker compose ps -q app)"
test -n "$RUNNING_APP_CONTAINER"
RUNNING_IMAGE_ID="$(docker inspect --format '{{.Image}}' "$RUNNING_APP_CONTAINER")"
test -n "$RUNNING_IMAGE_ID"
ROLLBACK_COMMIT="$(docker image inspect \
  --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' \
  "$RUNNING_IMAGE_ID")"
git cat-file -e "${ROLLBACK_COMMIT}^{commit}"
```

Der gemischte Fix-Commit `dd4c61b` darf nicht cherry-gepickt werden, weil er neben der Sitemap-Korrektur Task-12-Dokumentation enthält. Zusätzlich muss R1 vor jedem `git switch`, `git cherry-pick` oder Kandidaten-Tag vollständig bestanden sein. Ohne R1 bleiben `dce016a` und `010cac4` ausgeschlossen; wegen des bereits aktiven Registry-Vertrags ist dieser Holdback-Stand nicht deploybar und erhält keinen vollständigen Welle-1-Kandidaten-Tag.

Erst nach bestandenem R1-Gate wird auf dem Welle-1-Release-Branch ein neuer Code-only-Backport erzeugt; seine Commit-ID entsteht erst dabei und wird anschließend protokolliert:

```bash
set -euo pipefail
R1_GATE_DIR="docs/seo/audit-nachweise/redirect-entscheidungen/R1/<UTC-Zeitstempel>"
NACHWEISDATEIEN=(
  gsc-url-metriken.csv
  backlinks.csv
  inhaltsvergleich.md
  interne-links.json
  zielpruefung.json
  entscheidung.md
)
test -s "$R1_GATE_DIR/SHA256SUMS"
for DATEI in "${NACHWEISDATEIEN[@]}"; do
  test -s "$R1_GATE_DIR/$DATEI"
  awk -v erwartet="$DATEI" '
    {
      name = $0
      sub(/^[[:xdigit:]]{64}[[:space:]]+\*?/, "", name)
      if (name == erwartet) gefunden = 1
    }
    END { exit gefunden ? 0 : 1 }
  ' "$R1_GATE_DIR/SHA256SUMS" || exit 1
done
grep -Fxq 'Entscheidung: FREIGEGEBEN' "$R1_GATE_DIR/entscheidung.md"
(cd "$R1_GATE_DIR" && sha256sum --check SHA256SUMS)

git switch -c release/seo-sanierung-welle-1 "$ROLLBACK_COMMIT"
git cherry-pick 8172029..7960c61
git restore --source=dd4c61b -- \
  helpers/seoPagePolicy.js \
  tests/seoPagePolicy.test.js
git add helpers/seoPagePolicy.js tests/seoPagePolicy.test.js
test "$(git diff --cached --name-only | sort)" = \
  "$(printf '%s\n' helpers/seoPagePolicy.js tests/seoPagePolicy.test.js | sort)"
git diff --cached --check
git commit -m "fix: deaktivierte Ratgeber aus Sitemap entfernen"
SITEMAP_BACKPORT_COMMIT="$(git rev-parse HEAD)"
test "$(git show --format= --name-only "$SITEMAP_BACKPORT_COMMIT" | sed '/^$/d' | sort)" = \
  "$(printf '%s\n' helpers/seoPagePolicy.js tests/seoPagePolicy.test.js | sort)"
git diff --exit-code dd4c61b -- helpers/seoPagePolicy.js tests/seoPagePolicy.test.js
CANDIDATE_TAG="seo-sanierung-welle-1-kandidat-<YYYYMMDD>"
git tag -a "$CANDIDATE_TAG" -m "SEO-Sanierung Welle 1 Kandidat"
CANDIDATE_COMMIT="$(git rev-parse "${CANDIDATE_TAG}^{commit}")"
test "$(git rev-parse HEAD)" = "$CANDIDATE_COMMIT"
```

Der neu entstandene `SITEMAP_BACKPORT_COMMIT` wird im Welle-1-Nachweis eingetragen. `dd4c61b`, `3d29a17` und andere reine oder gemischte Task-12-Dokumentationscommits bleiben deployment-neutral und sind aus allen Release-Kandidaten ausgeschlossen.

Welle 2 wird aus dem freigegebenen Welle-1-Kandidaten erstellt und ergänzt ausschließlich den angegebenen Quellbereich. Vor Aufnahme von `c503733` muss R2 vollständig bestanden sein. Fehlt R2, bleibt der Commit ausgeschlossen; der dadurch unvollständige Holdback-Stand ist nicht deploybar und erhält keinen vollständigen Welle-2-Kandidaten-Tag:

```bash
set -euo pipefail
R2_GATE_DIR="docs/seo/audit-nachweise/redirect-entscheidungen/R2/<UTC-Zeitstempel>"
NACHWEISDATEIEN=(
  gsc-url-metriken.csv
  backlinks.csv
  inhaltsvergleich.md
  interne-links.json
  zielpruefung.json
  entscheidung.md
)
test -s "$R2_GATE_DIR/SHA256SUMS"
for DATEI in "${NACHWEISDATEIEN[@]}"; do
  test -s "$R2_GATE_DIR/$DATEI"
  awk -v erwartet="$DATEI" '
    {
      name = $0
      sub(/^[[:xdigit:]]{64}[[:space:]]+\*?/, "", name)
      if (name == erwartet) gefunden = 1
    }
    END { exit gefunden ? 0 : 1 }
  ' "$R2_GATE_DIR/SHA256SUMS" || exit 1
done
grep -Fxq 'Entscheidung: FREIGEGEBEN' "$R2_GATE_DIR/entscheidung.md"
(cd "$R2_GATE_DIR" && sha256sum --check SHA256SUMS)

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
| Redirect-Gate R1 | **Gesperrt:** exakter URL-Metrikexport und Live-Backlinkexport fehlen |
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
DEPLOY_UTC="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
KANDIDAT_COMMIT="$(git rev-parse "${CANDIDATE_TAG}^{commit}")"
NACHWEIS_DIR="docs/seo/audit-nachweise/welle-1/${PRUEFZEITPUNKT_UTC}-${KANDIDAT_COMMIT}"
mkdir -p "$NACHWEIS_DIR"
node --input-type=module - \
  "$NACHWEIS_DIR/deployment-metadata.json" \
  "$DEPLOY_UTC" \
  "$CANDIDATE_TAG" \
  "$KANDIDAT_COMMIT" \
  "$ROLLBACK_COMMIT" \
  "$NACHWEIS_DIR" <<'NODE'
import { writeFileSync } from 'node:fs';

const [, , file, deployUtc, candidateTag, candidateCommit, rollbackCommit, evidenceDir] = process.argv;
writeFileSync(file, `${JSON.stringify({
  deploy_utc: deployUtc,
  candidate_tag: candidateTag,
  candidate_commit: candidateCommit,
  rollback_commit: rollbackCommit,
  evidence_dir: evidenceDir
}, null, 2)}\n`);
NODE
npm run audit:seo-recovery -- \
  --base-url https://www.komplettwebdesign.de \
  --out "$NACHWEIS_DIR/seo-live-t0.json" \
  --fail-on error
sha256sum "$NACHWEIS_DIR/deployment-metadata.json" "$NACHWEIS_DIR/seo-live-t0.json" \
  > "$NACHWEIS_DIR/SHA256SUMS"
sha256sum --check "$NACHWEIS_DIR/SHA256SUMS"
```

`deployment-metadata.json` ist die maschinenlesbare, persistente Quelle für den späteren Abschlusslauf. In `nachweis.md` werden zusätzlich Beginn des Fensters, UTC-Prüfzeitpunkt, Kandidaten-Tag, vollständiger Kandidaten-Commit, Rollback-Commit, Exitcode und Audit-Zusammenfassung eingetragen.

Frühestens 48 Stunden nach dem dokumentierten Beginn muss auf demselben Kandidaten-Commit ein Abschluss-Live-Audit ausgeführt werden. Der Ablauf setzt keine alten Shellvariablen voraus: Nur der dauerhafte Metadatenpfad wird angegeben; Zeit, Tag, Commit und Nachweisverzeichnis werden daraus validiert und rekonstruiert.

```bash
set -euo pipefail
METADATA_FILE="docs/seo/audit-nachweise/welle-1/<LAUF-ID>/deployment-metadata.json"
test -s "$METADATA_FILE"
META_VALUES_FILE="$(mktemp)"
cleanup_meta_values() {
  rm -f "$META_VALUES_FILE"
}
trap cleanup_meta_values EXIT HUP INT TERM

node --input-type=module - "$METADATA_FILE" "$META_VALUES_FILE" <<'NODE'
import { readFileSync, writeFileSync } from 'node:fs';

const metadata = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const outputFile = process.argv[3];
const commitPattern = /^[0-9a-f]{40}$/;
if (!metadata.deploy_utc || !Number.isFinite(Date.parse(metadata.deploy_utc))) {
  throw new Error('deploy_utc fehlt oder ist ungültig.');
}
if (!/^[A-Za-z0-9._-]+$/.test(metadata.candidate_tag || '')
    || !commitPattern.test(metadata.candidate_commit || '')) {
  throw new Error('Kandidaten-Tag oder Kandidaten-Commit ist ungültig.');
}
if (!commitPattern.test(metadata.rollback_commit || '')) {
  throw new Error('Rollback-Commit ist ungültig.');
}
if (!/^docs\/seo\/audit-nachweise\/welle-1\/[^/]+$/.test(metadata.evidence_dir || '')) {
  throw new Error('Nachweisverzeichnis ist ungültig.');
}
const elapsedMs = Date.now() - Date.parse(metadata.deploy_utc);
if (elapsedMs < 48 * 60 * 60 * 1000) {
  throw new Error(`48-Stunden-Fenster noch nicht erreicht: ${Math.floor(elapsedMs / 3600000)} Stunden.`);
}
writeFileSync(outputFile, `${[
  metadata.deploy_utc,
  metadata.candidate_tag,
  metadata.candidate_commit,
  metadata.rollback_commit,
  metadata.evidence_dir
].join('\t')}\n`);
NODE

test "$(wc -l < "$META_VALUES_FILE" | tr -d '[:space:]')" = "1"
test "$(awk -F '\t' 'NR == 1 { print NF }' "$META_VALUES_FILE")" = "5"
EXTRA_FIELD=""
IFS=$'\t' read -r \
  DEPLOY_UTC \
  CANDIDATE_TAG \
  KANDIDAT_COMMIT \
  ROLLBACK_COMMIT \
  NACHWEIS_DIR \
  EXTRA_FIELD < "$META_VALUES_FILE"
test -n "$DEPLOY_UTC"
test -n "$CANDIDATE_TAG"
test -n "$KANDIDAT_COMMIT"
test -n "$ROLLBACK_COMMIT"
test -n "$NACHWEIS_DIR"
test -z "$EXTRA_FIELD"
test "$METADATA_FILE" = "$NACHWEIS_DIR/deployment-metadata.json"
test "$(git rev-parse "${CANDIDATE_TAG}^{commit}")" = "$KANDIDAT_COMMIT"
npm run audit:seo-recovery -- \
  --base-url https://www.komplettwebdesign.de \
  --out "$NACHWEIS_DIR/seo-live-t48h.json" \
  --fail-on error
sha256sum \
  "$NACHWEIS_DIR/deployment-metadata.json" \
  "$NACHWEIS_DIR/seo-live-t0.json" \
  "$NACHWEIS_DIR/seo-live-t48h.json" \
  > "$NACHWEIS_DIR/SHA256SUMS"
sha256sum --check "$NACHWEIS_DIR/SHA256SUMS"
```

Der zweite Prüfzeitpunkt, die tatsächlich verstrichene Dauer von mindestens 48 Stunden und beide Ergebnisse werden in `nachweis.md` ergänzt. Erst wenn beide Audits Exitcode 0 und 0 Fehler melden und keine neue Indexierungs-, Weiterleitungs- oder Linkregression vorliegt, darf Welle 2 freigegeben werden.

### Welle 2 – Tasks 5 bis 9

| Feld | Protokoll |
| --- | --- |
| Status | **Nicht veröffentlicht** |
| Voraussetzung | Welle 1 mindestens 48 Stunden regressionsfrei; noch nicht erfüllt |
| Redirect-Gate R2 | **Gesperrt:** exakte URL-Metriken, Live-Backlinks, Inhaltsfreigabe und Zielstatus 200 fehlen |
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

Die beiden Blumenladen-Inhalte müssen unterschiedliche Suchabsichten und primäre Handlungsaufforderungen behalten: Die Branchenseite führt kaufnah zu den Paketen, der Blogartikel informationell zur Branchenseite. Der Kostenartikel führt zur Paketübersicht, ohne einen neuen Artikel anzulegen. Die Kostenrevision ist zugleich Bestandteil von R2 und muss vor Aufnahme von `c503733` fachlich freigegeben sein; der Brief allein erfüllt dieses Gate nicht.

1. Betriebsmodus im Content-Agent als `review` bestätigen; Auto-Publish bleibt aus.
2. Vor Bildung des Welle-2-Kandidaten unter „Bestehende Inhalte“ den Artikel `website-kosten-2025-einfach-erklaert` nach dem verlinkten Content-Brief und der Tabelle vollständig revidieren.
3. Fakten, Preise, alle drei Pflichtlinks, CTA und Jahreszahl prüfen, die geprüfte Zielrevision veröffentlichen und den Vorher-Nachher-Vergleich im R2-Nachweis ablegen. Den Quellartikel erst im autorisierten Deploymentfenster unveröffentlichen, unmittelbar bevor der freigegebene Redirectkandidat live geht.
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
test -s "$NACHWEIS_DIR/nachweis.md"
find "$NACHWEIS_DIR" -maxdepth 1 -type f ! -name SHA256SUMS -print0 \
  | LC_ALL=C sort -z \
  | xargs -0 sha256sum \
  > "$NACHWEIS_DIR/SHA256SUMS"
sha256sum --check "$NACHWEIS_DIR/SHA256SUMS"
```

Das abschließende Welle-2-`SHA256SUMS` wird erst erzeugt, nachdem Backup-Inhaltsliste, separates Dump-Prüfsummenblatt, Restore- und Migrationsausgaben, R2-Freigabe, Test-/Buildausgaben, Audit, `nachweis.md` und jede dynamische Inhaltsfreigabe im Nachweisordner liegen. Es umfasst alle Dateien dieses Ordners außer sich selbst; ein früheres Teil-Prüfsummenblatt ersetzt diesen Abschluss nicht.

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

## 28-Tage-Auswertung und Conversion-Gate

**Status:** Für die spätere Auswertung vorbereitet, noch nicht auswertbar. Welle 2 ist nicht veröffentlicht; deshalb existieren weder ein Live-Datum von Welle 2 noch ein abgeschlossenes 28-Tage-Nachher-Fenster. Die folgenden Platzhalter sind verpflichtende Gates und dürfen erst durch tatsächlich belegte Daten ersetzt werden.

### Dokumentiertes 37-Tage-Störungsfenster

Das Fenster vom 17. Juni bis einschließlich 23. Juli 2026 umfasst 37 Tage und beschreibt den Einbruch seit dem Relaunch. Es ist kein zulässiger direkter Vorher-Nachher-Vergleich für die spätere 28-Tage-Auswertung.

| Kennzahl | Dokumentierter Wert |
| --- | ---: |
| Impressionen | 28.053 |
| Klicks | 0 |
| Impressionen auf Position 41 oder schlechter | 27.254 |

Die Seitenaggregation für dieses Störungsfenster lautet:

```sql
SELECT
  page_url,
  SUM(clicks) AS clicks,
  SUM(impressions) AS impressions,
  ROUND(
    SUM(average_position * impressions) / NULLIF(SUM(impressions), 0),
    2
  ) AS weighted_position
FROM content_search_metrics
WHERE metric_date BETWEEN DATE '2026-06-17' AND DATE '2026-07-23'
GROUP BY page_url
ORDER BY impressions DESC;
```

Am 26. Juli 2026 wurden die bekannten Summen gegen die ursprünglich konfigurierte lokale Projektdatenbank ausschließlich lesend in einer `READ ONLY`-Transaktion geprüft. Beide Tabellen waren vorhanden, `content_search_metric_sync_days` enthielt alle 37 Tage vom 17. Juni bis 23. Juli 2026, und die Summen ergaben 28.053 Impressionen, 0 Klicks sowie 27.254 Impressionen für Messzeilen mit `average_position > 40`. Damit bezeichnet „Position 41+“ hier Positionen schlechter als 40. Es wurden keine Zugangsdaten ausgegeben und keine Daten verändert.

### Verpflichtende Zeit- und Vollständigkeits-Gates

| Gate | Einzutragender Nachweis | Aktueller Stand |
| --- | --- | --- |
| Live-Datum Welle 2 | tatsächliches Veröffentlichungsdatum im Format `YYYY-MM-DD` | **[PFLICHTGATE: unbekannt; Welle 2 nicht veröffentlicht]** |
| Vorher-Fenster | Start- und Enddatum des jüngsten vollständig synchronisierten 28-Tage-Fensters vor Welle 2 | **[PFLICHTGATE: erst nach bekanntem Live-Datum bestimmen]** |
| Sync-Abdeckung vorher | exakt 28 unterschiedliche Sync-Tage | **[PFLICHTGATE: `28/28` belegen]** |
| Nachher-Fenster | erster vollständiger Tag nach Welle 2 bis einschließlich Tag 28 | **[PFLICHTGATE: Start- und Enddatum liegen in der Zukunft]** |
| Sync-Abdeckung nachher | exakt 28 unterschiedliche Sync-Tage nach Erreichen des Enddatums | **[PFLICHTGATE: `28/28` belegen]** |
| Auswertungszeitpunkt | UTC-Zeitpunkt, ausführende Person und unveränderte Abfrage | **[PFLICHTGATE: noch nicht ausgeführt]** |

Der Veröffentlichungstag selbst wird wegen seines unvollständigen Tagesanteils nicht dem Nachher-Fenster zugerechnet. `$1` ist in den folgenden Abfragen das tatsächlich dokumentierte Live-Datum von Welle 2. Diese Abfrage bestimmt das jüngste vollständige Vorher-Fenster, das feste Nachher-Fenster und die jeweilige Sync-Abdeckung:

```sql
WITH params AS (
  SELECT $1::date AS wave_2_live_date
),
candidate_before AS (
  SELECT candidate.metric_date AS end_date
  FROM content_search_metric_sync_days candidate
  CROSS JOIN params
  WHERE candidate.metric_date < params.wave_2_live_date
    AND (
      SELECT COUNT(DISTINCT covered.metric_date)
      FROM content_search_metric_sync_days covered
      WHERE covered.metric_date BETWEEN candidate.metric_date - 27
        AND candidate.metric_date
    ) = 28
  ORDER BY candidate.metric_date DESC
  LIMIT 1
),
windows AS (
  SELECT
    'vorher'::text AS window_name,
    end_date - 27 AS start_date,
    end_date
  FROM candidate_before

  UNION ALL

  SELECT
    'nachher'::text AS window_name,
    wave_2_live_date + 1 AS start_date,
    wave_2_live_date + 28 AS end_date
  FROM params
)
SELECT
  windows.window_name,
  windows.start_date,
  windows.end_date,
  COUNT(DISTINCT sync_day.metric_date)::integer AS sync_days,
  COUNT(DISTINCT sync_day.metric_date) = 28 AS is_complete
FROM windows
LEFT JOIN content_search_metric_sync_days sync_day
  ON sync_day.metric_date BETWEEN windows.start_date AND windows.end_date
GROUP BY windows.window_name, windows.start_date, windows.end_date
ORDER BY windows.start_date;
```

Fehlt das Vorher-Fenster oder liefert eines der beiden Fenster nicht `sync_days = 28` und `is_complete = true`, wird keine Vergleichszahl veröffentlicht und keine SEO- oder Conversion-Entscheidung aus unvollständigen Daten abgeleitet.

### Vergleich nach Query, Zielseite und Seitengruppe

Nach bestandener Sync-Prüfung wird mit denselben Fenstergrenzen nach Query und Zielseite gruppiert. Die Seitengruppen machen Kernseiten, Blumenladen-, Kosten- und Tester-Inhalte getrennt sichtbar; der Pfad wird aus absoluten Search-Console-URLs normalisiert.

```sql
WITH params AS (
  SELECT $1::date AS wave_2_live_date
),
candidate_before AS (
  SELECT candidate.metric_date AS end_date
  FROM content_search_metric_sync_days candidate
  CROSS JOIN params
  WHERE candidate.metric_date < params.wave_2_live_date
    AND (
      SELECT COUNT(DISTINCT covered.metric_date)
      FROM content_search_metric_sync_days covered
      WHERE covered.metric_date BETWEEN candidate.metric_date - 27
        AND candidate.metric_date
    ) = 28
  ORDER BY candidate.metric_date DESC
  LIMIT 1
),
windows AS (
  SELECT 'vorher'::text AS window_name, end_date - 27 AS start_date, end_date
  FROM candidate_before
  UNION ALL
  SELECT
    'nachher'::text,
    wave_2_live_date + 1,
    wave_2_live_date + 28
  FROM params
),
coverage AS (
  SELECT
    windows.window_name,
    windows.start_date,
    windows.end_date,
    COUNT(DISTINCT sync_day.metric_date)::integer AS sync_days
  FROM windows
  LEFT JOIN content_search_metric_sync_days sync_day
    ON sync_day.metric_date BETWEEN windows.start_date AND windows.end_date
  GROUP BY windows.window_name, windows.start_date, windows.end_date
),
normalized_metrics AS (
  SELECT
    coverage.window_name,
    coverage.start_date,
    coverage.end_date,
    COALESCE(
      NULLIF(REGEXP_REPLACE(metric.page_url, '^https?://[^/]+', ''), ''),
      '/'
    ) AS page_path,
    metric.query,
    metric.clicks,
    metric.impressions,
    metric.average_position
  FROM coverage
  JOIN content_search_metrics metric
    ON metric.metric_date BETWEEN coverage.start_date AND coverage.end_date
  WHERE coverage.sync_days = 28
)
SELECT
  window_name,
  start_date,
  end_date,
  CASE
    WHEN page_path IN (
      '/', '/webdesign-berlin', '/pakete',
      '/leistungen/website-audit', '/leistungen/website-wartung',
      '/leistungen/local-seo'
    ) THEN 'kernseiten'
    WHEN page_path IN (
      '/branchen/webdesign-blumenladen',
      '/blog/seo-fuer-blumenladen'
    ) THEN 'blumenladen'
    WHEN page_path LIKE '/blog/website-kosten-%'
      OR page_path = '/leistungen/laufende-kosten-website'
      THEN 'kosten'
    WHEN page_path LIKE '/website-tester%' THEN 'tester'
    ELSE 'sonstige'
  END AS page_group,
  page_path,
  query,
  query !~* '(komplett\s*webdesign|komplettwebdesign)' AS is_non_brand,
  SUM(clicks) AS clicks,
  SUM(impressions) AS impressions,
  SUM(impressions) FILTER (
    WHERE average_position > 0 AND average_position <= 10
  ) AS impressions_position_1_10,
  SUM(impressions) FILTER (
    WHERE average_position > 10 AND average_position <= 20
  ) AS impressions_position_11_20,
  ROUND(
    SUM(average_position * impressions) / NULLIF(SUM(impressions), 0),
    2
  ) AS weighted_position
FROM normalized_metrics
GROUP BY
  window_name, start_date, end_date, page_group, page_path, query, is_non_brand
ORDER BY window_name, page_group, impressions DESC;
```

Für die fachliche Auswertung wird am Auswertungstag zusätzlich die Liste der als `active` geführten kommerziellen Seiten aus der Intent-Registry versioniert festgehalten. Aus den Ergebnissen werden mindestens folgende Werte verglichen:

- nicht markenbezogene Klicks auf aktive kommerzielle Seiten,
- Impressionen auf Position 1 bis 10 und 11 bis 20,
- gewichtete Position der Kernseiten,
- Klicks und Positionen der beiden Blumenladen-Seiten,
- Klicks der Kosten- und Tester-Inhalte,
- Gesamtzahl qualifizierter Anfragen aus Formularen, E-Mails und Anrufen.

### Feste Entscheidungsregeln

Für die erste vollständige Auswertung gelten ohne nachträgliche Umdeutung folgende Regeln:

| Beobachtung | Verbindliche Entscheidung |
| --- | --- |
| Position steigt, Impressionen steigen, Klicks fehlen | Titel und Description einmalig nachschärfen. |
| Position und Impressionen steigen | Seite stabil lassen; keine neue URL erstellen. |
| Position stagniert trotz vollständiger Onpage-Sanierung | Externe Autorität, Referenzen und Links priorisieren. |
| Zwei Seiten ranken wieder für dieselbe Kaufabsicht | Intent-Registry und interne Links korrigieren; keine dritte Seite erstellen. |
| Seite erhält keine Impressionen und besitzt keinen Geschäfts- oder Informationswert | Konsolidierung oder `noindex` in einer eigenen geprüften Änderung planen. |

### Acht-Wochen-Gate für neue Seiten

Der Beginn und das Ende des Acht-Wochen-Zeitraums sind mit dem tatsächlichen Start der veröffentlichten Sanierung nachzutragen: **[PFLICHTGATE: Startdatum, Enddatum und Release-Nachweis fehlen]**. Vor Ablauf dieses Zeitraums wird keine neue indexierbare SEO-Zielseite veröffentlicht. Danach ist eine neue Seite nur zulässig, wenn alle sechs Bedingungen aus Abschnitt 14 der Spezifikation einzeln belegt sind:

1. Search Console, SERP-Prüfung oder belastbare Keyword-Daten zeigen eine relevante Nachfrage.
2. Die Suchabsicht unterscheidet sich eindeutig von allen vorhandenen Seiten.
3. Das Thema besitzt einen nachvollziehbaren geschäftlichen Wert.
4. Die Nutzerfrage kann nicht sinnvoll in eine bestehende Seite integriert werden.
5. Die verantwortliche Zielseite, interne Verlinkung und spätere Pflege sind vor Veröffentlichung definiert.
6. Es existiert kein anderer Entwurf oder Liveinhalt mit derselben primären Suchabsicht.

Fehlt auch nur eine Bedingung oder ihr Nachweis, wird die bestehende passendste Seite verbessert und keine neue URL angelegt.

### Conversion-Schwelle

Eine vertiefte Conversion-Spezifikation ist nur für eine Zielseite zulässig, die im vollständigen Nachher-Fenster mindestens 100 nicht markenbezogene organische Klicks erreicht. `$1` und `$2` sind das durch die Sync-Prüfung belegte Start- und Enddatum des Nachher-Fensters:

```sql
SELECT
  page_url,
  SUM(clicks) AS non_brand_clicks
FROM content_search_metrics
WHERE metric_date BETWEEN $1::date AND $2::date
  AND query !~* '(komplett\s*webdesign|komplettwebdesign)'
GROUP BY page_url
HAVING SUM(clicks) >= 100
ORDER BY non_brand_clicks DESC;
```

**Aktueller Gate-Stand:** **[PFLICHTGATE: Nachher-Fenster und Abfrageergebnis fehlen]**. Deshalb wurde keine Conversion-Spezifikation unter `docs/superpowers/specs/conversion-prioritaetsseiten-design.md` angelegt. Bis die Abfrage eine Zielseite zurückgibt, bleiben Änderungen auf ein klares Angebot, Belege, funktionierende Kontaktwege und genau einen primären nächsten Schritt begrenzt.

### Vergleich qualifizierter Anfragen ohne GA4-Attribution

Für exakt dieselben beiden 28-Tage-Fenster wird die Gesamtzahl qualifizierter Anfragen kanalübergreifend verglichen. Als qualifiziert zählen reale, zum Leistungsangebot passende Anfragen; Spam, Tests und erkennbare Duplikate werden nach derselben Regel in beiden Fenstern ausgeschlossen.

| Kennzahl | Vorher | Nachher |
| --- | ---: | ---: |
| Qualifizierte Formularanfragen | **[PFLICHTGATE]** | **[PFLICHTGATE]** |
| Qualifizierte E-Mail-Anfragen | **[PFLICHTGATE]** | **[PFLICHTGATE]** |
| Qualifizierte Anrufe | **[PFLICHTGATE]** | **[PFLICHTGATE]** |
| Qualifizierte Anfragen gesamt | **[PFLICHTGATE]** | **[PFLICHTGATE]** |
| Absolute und prozentuale Veränderung | nicht anwendbar | **[PFLICHTGATE]** |

Quelle, Zählregel, Auswertungszeitpunkt und verantwortliche Person müssen mit den Summen dokumentiert werden. Ohne reparierte und geprüfte GA4-Attribution wird keine einzelne Anfrage einer bestimmten organischen Landingpage zugeschrieben. Der Vergleich ist ausschließlich ein Gesamtvergleich der Anfrageentwicklung und kein Nachweis einer seitenbezogenen SEO-Conversion.

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
- [ ] R1 mit exakten URL-Metriken, Live-Backlinkexport, Inhaltsvergleich, kontextuellen Inlinks und Zielprüfung freigeben; bis dahin `dce016a` und `010cac4` aus Kandidaten ausschließen.
- [ ] Alle 14 Seitentypen auf Mobil und Desktop manuell abnehmen.
- [ ] Pro Welle Kandidaten-Tag, Kandidaten-Commit, inkludierte und ausgeschlossene Tasks sowie Rollback-Commit festhalten.
- [ ] Welle 1 autorisiert deployen und live auditieren.
- [ ] Nach mindestens 48 Stunden den Welle-1-Abschluss-Live-Audit auf demselben Commit ausführen und beide Prüfzeitpunkte sowie Ergebnisse dokumentieren.
- [ ] Vor Welle 2 Dump-Pfad und Prüfsumme prüfen, `pg_restore --list` und Restore-Test erfolgreich ausführen sowie Migration 016 zweimal idempotent ausführen.
- [ ] Kosten- und Blumenladen-Inhalte über die autorisierten Adminabläufe freigeben.
- [ ] R2 mit exakten URL-Metriken, Live-Backlinkexport, Inhaltsübernahme, kontextuellen Inlinks und Zielprüfung freigeben; bis dahin `c503733` aus Kandidaten ausschließen.
- [ ] Welle 2 live auditieren und dynamische Änderungen separat bestätigen.
- [ ] Welle 3 deployen, live auditieren und Lighthouse vollständig messen.
- [ ] Alle erfolgreichen Live- und Lighthouse-Artefakte mit `nachweis.md` und `SHA256SUMS` unter `docs/seo/audit-nachweise/` versionieren und archivieren.
- [ ] Search Console nach erfolgreichem Veröffentlichungsfenster gezielt aktualisieren.
- [ ] Live-Datum von Welle 2 sowie vollständige 28-Tage-Vorher- und Nachher-Fenster mit jeweils `28/28` Sync-Tagen belegen.
- [ ] Query-, Zielseiten- und Seitengruppenvergleich sowie den Gesamtvergleich qualifizierter Anfragen ausführen.
- [ ] Beginn und Ende des Acht-Wochen-Zeitraums belegen und das Neue-Seiten-Gate anwenden.
- [ ] Conversion-Schwelle erst im vollständigen Nachher-Fenster prüfen und nur bei mindestens 100 nicht markenbezogenen Klicks auf einer Zielseite eine vertiefte Spezifikation anlegen.

Bis alle für die jeweilige Welle geltenden Punkte belegt sind, lautet die Entscheidung: **keine Veröffentlichung**.
