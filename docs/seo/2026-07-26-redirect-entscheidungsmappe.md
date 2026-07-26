# Entscheidungsmappe für die zwei geplanten SEO-Weiterleitungen

**Stand:** 26. Juli 2026
**Status:** **Gesperrt – kein Redirect-Commit ist für einen Release-Kandidaten freigegeben**

Diese Mappe erfüllt das Entscheidungsverfahren aus Abschnitt 6.1 der SEO-Spezifikation. Sie trennt belegte Werte, versionierte Repository-Nachweise und noch fehlende externe Daten. Planungslisten wie `docs/seo/seo-backlink-targets-berlin.csv` sind keine Belege für tatsächlich vorhandene Backlinks.

## Belegter Suchdatenstand

Die Search-Console-Daten wurden am 26. Juli 2026 in einer `READ ONLY`-Transaktion für das vollständige synchronisierte Störungsfenster vom 17. Juni bis 23. Juli 2026 bestätigt:

- 37 von 37 Sync-Tagen,
- 28.053 Impressionen,
- 0 Klicks,
- 27.254 Impressionen in Messzeilen mit einer durchschnittlichen Position schlechter als 40.

Für die beiden Berliner Hauptseiten sind außerdem die gewichteten Ausgangspositionen dokumentiert: `/website-erstellen-lassen-berlin` lag bei Position 95, `/webdesign-berlin` bei Position 94. Weil die gesamte Property 0 Klicks hatte, kann keine der vier hier betrachteten URLs in diesem Fenster einen positiven Klickwert besitzen. Exakte URL-Impressionen und URL-Positionen der beiden Kostenartikel wurden jedoch nicht in einem versionierten Nachweis festgehalten. Der erneute lesende Zugriff ist in diesem Worktree nicht möglich, weil die lokale Datenbank `blocksdorf` nicht existiert. Es werden deshalb keine URL-Werte ergänzt oder geschätzt.

Vor der Freigabe muss dieselbe Abfrage mit den vier exakten URLs erneut in einer `READ ONLY`-Transaktion ausgeführt und als Nachweis ohne Zugangsdaten archiviert werden:

```sql
BEGIN TRANSACTION READ ONLY;

WITH normalized AS (
  SELECT
    regexp_replace(
      regexp_replace(page_url, '^https?://(www\.)?komplettwebdesign\.de', ''),
      '/$',
      ''
    ) AS page_path,
    clicks,
    impressions,
    average_position
  FROM content_search_metrics
  WHERE metric_date BETWEEN DATE '2026-06-17' AND DATE '2026-07-23'
)
SELECT
  page_path,
  SUM(clicks) AS clicks,
  SUM(impressions) AS impressions,
  ROUND(
    SUM(average_position * impressions) / NULLIF(SUM(impressions), 0),
    2
  ) AS weighted_position
FROM normalized
WHERE page_path IN (
    '/webdesign-berlin',
    '/website-erstellen-lassen-berlin',
    '/blog/website-kosten-2025-einfach-erklaert',
    '/blog/website-kosten-2026-berlin-vergleich-2025'
  )
GROUP BY page_path
ORDER BY page_path;

COMMIT;
```

## R1 – Berliner Hauptseite

**Geplante Weiterleitung:** `/website-erstellen-lassen-berlin` → `/webdesign-berlin`
**Gesperrte Commits:** `dce016a` und `010cac4`

| Kriterium | Belegter Stand | Entscheidung |
| --- | --- | --- |
| Suchmetriken | Quelle Position 95, Ziel Position 94; Property insgesamt 0 Klicks. Exakte URL-Impressionen fehlen im versionierten Nachweis. | Das Ziel ist leicht stärker positioniert, aber die Suchdatenprüfung ist bis zum erneuten URL-Export unvollständig. |
| Semantische Eignung | `/webdesign-berlin` ist die kürzere lokale Haupt-URL und behandelt bereits Webdesign, Zielgruppen, Leistungen, Preise und Projektablauf. | Ziel fachlich geeignet. |
| Inhaltsübernahme | Der vollständige Quellstand ist in `dce016a^:data/seoLandingPages.js` erhalten. Commit `dce016a` übernimmt die drei einzigartigen Themen „Ziele und Suchabsichten“, „Texte, Design und mobile Umsetzung“ sowie „Formulare, Canonicals, Sitemap und Links“ in `webdesignBerlinPage.websiteCreation`. | Repository-seitig nachvollziehbar; fachliche Freigabe des Vorher-Nachher-Vergleichs bleibt Pflicht. |
| Interne Links | Der Stand vor `dce016a` enthält kontextuelle Quellverweise unter anderem in Startseite, Blogübersicht, Bezirks- und Leistungsdaten. `dce016a` stellt diese auf `/webdesign-berlin` um; globale Footer-/Navigationslinks zählen nicht als Kontextbeleg. | Umstellung im Diff vorhanden; mit dem erweiterten Audit auf dem Kandidaten erneut prüfen. |
| Lokales Ziel | Der Task-3-Nachweis belegt lokal Zielstatus 200 und eine direkte 301 der Quelle nach Anwendung des Commits. | Historisch belegt; auf dem späteren Kandidaten erneut prüfen. |
| Externe Links und Erwähnungen | Kein exportierter Live-Backlinkdatensatz für Quelle und Ziel liegt vor. Die Backlink-Zielliste enthält nur geplante Maßnahmen. | **Sperrendes Gate.** Keine Freigabe und keine Aufnahme der Commits in einen Kandidaten. |

## R2 – Website-Kosten-Artikel

**Geplante Weiterleitung:** `/blog/website-kosten-2026-berlin-vergleich-2025` → `/blog/website-kosten-2025-einfach-erklaert`
**Gesperrter Commit:** `c503733`

| Kriterium | Belegter Stand | Entscheidung |
| --- | --- | --- |
| Suchmetriken | Property insgesamt 0 Klicks. Die Spezifikation belegt, dass Kosteninhalte einen großen Anteil der Impressionen erzeugen und der etablierte Artikel noch 2025 im Thema führt. Exakte Werte beider URLs fehlen. | **Sperrendes Gate** bis zum exakten URL-Export. |
| Semantische Eignung | Der etablierte Zielslug ist kürzer, stabil und deckt die informationelle Kostenabsicht ab. Der Content-Brief aktualisiert das sichtbare Thema auf 2026, ohne die etablierte URL umzubenennen. | Ziel fachlich geeignet, wenn die Inhaltsrevision vollständig freigegeben ist. |
| Inhaltsübernahme | `docs/seo/content-briefs/2026-07-26-kosten-und-blumenladen.md` verlangt eine abschnittsweise Prüfung. Eine tatsächliche Content-Agent-Revision, Fakten-/Preisprüfung und Inhaltsfreigabe wurden noch nicht ausgeführt. | **Sperrendes Gate.** Brief allein ist keine Inhaltsübernahme. |
| Interne Links | Der Task-5-Nachweis belegt für das Ziel zwei stabile kontextuelle Quellen: `/leistungen` und `/leistungen/laufende-kosten-website`. Die spätere Redirectquelle darf nicht als stabiler Inlink zählen. | Zwei stabile Repository-Inlinks vorhanden; auf dem Kandidaten erneut auditieren. |
| Lokales Ziel | Der feste Redirect wurde lokal als 301 geprüft. Die dynamische Zielseite konnte ohne PostgreSQL-Datenbank nicht mit Status 200 bestätigt werden. | **Sperrendes Gate** bis Zielstatus 200, selbstreferenzielles Canonical und genau eine H1 belegt sind. |
| Externe Links und Erwähnungen | Kein exportierter Live-Backlinkdatensatz für Quelle und Ziel liegt vor. | **Sperrendes Gate.** Keine Freigabe und keine Aufnahme von `c503733` in einen Kandidaten. |

## Operativer Freigabevertrag

Für jede Entscheidung wird ein eigener versionierter Ordner angelegt:

```text
docs/seo/audit-nachweise/redirect-entscheidungen/<R1-oder-R2>/<UTC-Zeitstempel>/
```

Er muss vor Aufnahme des jeweiligen Redirect-Commits mindestens enthalten:

1. `gsc-url-metriken.csv` mit den exakten Quell- und Zielzeilen, Zeitraum und lesendem Abfragezeitpunkt,
2. `backlinks.csv` aus einem aktuellen Search-Console-Linkexport oder einem anderen benannten, belastbaren Live-Datensatz mit Exportdatum; auch ein belegtes Ergebnis von 0 Links ist zulässig,
3. `inhaltsvergleich.md` mit gesicherten Quellabschnitten, Übernahmeentscheidung je Abschnitt und fachlicher Freigabe,
4. `interne-links.json` aus dem erweiterten Audit; Header, Footer und Navigation sind ausgeschlossen,
5. `zielpruefung.json` mit HTTP 200, selbstreferenziellem Canonical, genau einer H1 und parsebarem JSON-LD,
6. `entscheidung.md` mit exakt der Zeile `Entscheidung: FREIGEGEBEN`,
7. `SHA256SUMS`, das alle übrigen Dateien dieses Ordners umfasst.

Die Freigabe ist nur gültig, wenn alle Dateien vorhanden sind und die Prüfsummen stimmen:

```bash
set -euo pipefail
GATE_DIR="docs/seo/audit-nachweise/redirect-entscheidungen/<R1-oder-R2>/<UTC-Zeitstempel>"
for DATEI in \
  gsc-url-metriken.csv \
  backlinks.csv \
  inhaltsvergleich.md \
  interne-links.json \
  zielpruefung.json \
  entscheidung.md \
  SHA256SUMS
do
  test -s "$GATE_DIR/$DATEI"
done
grep -Fxq 'Entscheidung: FREIGEGEBEN' "$GATE_DIR/entscheidung.md"
(cd "$GATE_DIR" && sha256sum --check SHA256SUMS)
```

Solange R1 nicht erfüllt ist, bleiben `dce016a` und `010cac4` aus jedem Welle-1-Kandidaten ausgeschlossen. Solange R2 nicht erfüllt ist, bleibt `c503733` aus jedem Welle-2-Kandidaten ausgeschlossen. Weil die Intent-Registry die beiden Weiterleitungen bereits als Zielzustand prüft, ist ein Kandidat ohne die freigegebenen Redirects **nicht deploybar** und darf keinen vollständigen Welle-Kandidaten-Tag erhalten. Bei fehlenden Live-Backlinkdaten bleibt damit die gesamte betroffene Welle gesperrt.
