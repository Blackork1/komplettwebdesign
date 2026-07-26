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

Die Ursache ist die fehlende lokale PostgreSQL-Datenbank `blocksdorf` (`SQLSTATE 3D000`). Dadurch konnten dynamische Sitemapbestandteile, Navigation, Pakete, Blogartikel und weitere datenbankgestützte Seiten nicht korrekt geladen werden. Die 72 Befunde sind deshalb Infrastrukturfolgefehler und keine belastbare fachliche SEO-Abnahme. Insbesondere werden **nicht** 0 Fehler, vollständige Sitemapabdeckung, korrekte H1-Anzahlen, vollständige Pflichtlinks oder fehlerfreie Redirectziele behauptet.

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

## Deployment-Gates

### Gemeinsame Gates vor jeder Welle

Eine Welle darf erst veröffentlicht werden, wenn:

1. Arbeitsbaum, vollständige Testsuite und Build sauber sind,
2. der vollständige lokale Audit mit Datenbank 0 Fehler meldet,
3. die manuelle Mobil- und Desktopprüfung abgeschlossen ist,
4. ein konkreter Deployment-Commit und ein Rollbackpunkt feststehen,
5. der Content-Agent weiterhin im Betriebsmodus `review` läuft und Auto-Publish aus ist,
6. nach dem Deployment der Live-Audit 0 Fehler meldet.

In den ersten acht Wochen werden keine neuen SEO-Zielseiten veröffentlicht. Es gibt keine massenhafte URL-Migration und keine Ranking-, Besucher- oder Anfragegarantie.

### Welle 1 – Tasks 1 bis 4

| Feld | Protokoll |
| --- | --- |
| Status | **Nicht veröffentlicht** |
| Deploymentdatum | nicht vorhanden |
| Deployment-Commit | nicht vorhanden |
| Live-Audit | nicht ausgeführt |
| 48-Stunden-Fenster | nicht gestartet |

Nach einem autorisierten Deployment:

```bash
npm run audit:seo-recovery -- \
  --base-url https://www.komplettwebdesign.de \
  --out .superpowers/sdd/2026-07-26-seo-reichweiten-sanierung/seo-wave-1-live.json \
  --fail-on error
```

Erst nach mindestens 48 Stunden ohne neue Indexierungs-, Weiterleitungs- oder Linkregression darf Welle 2 freigegeben werden. Start und Ende dieses Fensters sowie der geprüfte Commit müssen nachgetragen werden.

### Welle 2 – Tasks 5 bis 9

| Feld | Protokoll |
| --- | --- |
| Status | **Nicht veröffentlicht** |
| Voraussetzung | Welle 1 mindestens 48 Stunden regressionsfrei; noch nicht erfüllt |
| Deploymentdatum | nicht vorhanden |
| Deployment-Commit | nicht vorhanden |
| Migration 016 | nicht auf Produktion ausgeführt |
| Dynamische Contentänderungen | nicht ausgeführt |
| Live-Audit | nicht ausgeführt |

#### Gate: Migration 016

Migration `scripts/migrations/016_update_package_meta_descriptions.sql` ist in den transaktionalen Runner eingebunden, wurde aber nicht auf einer Produktionsdatenbank ausgeführt. Sie darf erst nach geprüftem Backup und im autorisierten Deploymentkontext laufen.

```bash
npm run backup:postgres
npm run migrate:content-agent
npm run migrate:content-agent
```

Der zweite Migrationslauf prüft die Idempotenz. Anschließend müssen ausschließlich die beiden vorgesehenen Paketwerte kontrolliert werden:

```sql
SELECT package_key, meta_description
FROM pricing_packages
WHERE package_key IN ('business', 'individuell')
ORDER BY package_key;
```

Erwartet werden genau die in Migration 016 hinterlegten Beschreibungen. Preise, Slugs, Titel, Pfade und Leistungsfelder dürfen sich nicht ändern. Backup-Pfad, Backup-Prüfung, Migrationszeitpunkt, ausführende Person und Abfrageergebnis sind vor der Wellenfreigabe nachzutragen. Zugangsdaten oder vollständige Umgebungsvariablen gehören nicht in das Protokoll.

#### Gate: Content-Agent und Admininhalte

Diese Schritte benötigen eine autorisierte Adminsession und sind nicht durch die Codeänderungen erledigt:

1. Betriebsmodus im Content-Agent als `review` bestätigen; Auto-Publish bleibt aus.
2. Unter „Bestehende Inhalte“ den Artikel `website-kosten-2025-einfach-erklaert` nach dem Content-Brief vollständig revidieren.
3. Fakten, Preise, Links und Jahreszahl prüfen, die geprüfte Revision veröffentlichen und `website-kosten-2026-berlin-vergleich-2025` unveröffentlichen.
4. Unter `/admin/industries` beim bestehenden Datensatz `Blumenladen` ausschließlich SEO-Titel, Meta-Description und Hero-H1 nach dem Brief aktualisieren; den Slug nicht ändern.
5. Unter `/admin/content-agent/existing-content` den Artikel `seo-fuer-blumenladen` als Revision aktualisieren, Vorher-Nachher-Vergleich und Vorschau prüfen und erst dann ausdrücklich freigeben.
6. Keine neue Seite und keinen neuen Artikel anlegen. Preise, rechtliche Aussagen und Rankinggarantien nicht verändern.
7. Beide Kostenartikel-URLs und beide Blumenladen-URLs live prüfen; Pflichtlinks, unterschiedliche Suchabsichten und genau einstufige 301-Weiterleitung bestätigen.

Nach Deployment, Migration und den autorisierten Adminschritten:

```bash
npm run audit:seo-recovery -- \
  --base-url https://www.komplettwebdesign.de \
  --out .superpowers/sdd/2026-07-26-seo-reichweiten-sanierung/seo-wave-2-live.json \
  --fail-on error
```

Datum, Commit, Migrationsergebnis und jede dynamische Inhaltsfreigabe müssen separat nachgetragen werden.

### Welle 3 – Task 10

Task 11 ist externe Reichweitenarbeit und kein Deploymentbestandteil.

| Feld | Protokoll |
| --- | --- |
| Status | **Nicht veröffentlicht** |
| Voraussetzung | Welle 2 vollständig abgenommen; noch nicht erfüllt |
| Deploymentdatum | nicht vorhanden |
| Deployment-Commit | nicht vorhanden |
| Live-Audit | nicht ausgeführt |
| Lighthouse | lokal wegen fehlender PostgreSQL-Datenbank nicht messbar |

Nach dem autorisierten Deployment sind Live-Audit und Lighthouse auf demselben Commit auszuführen. Datum, Commit und Artefaktpfade werden erst nach tatsächlicher Messung eingetragen:

```bash
npm run audit:seo-recovery -- \
  --base-url https://www.komplettwebdesign.de \
  --out .superpowers/sdd/2026-07-26-seo-reichweiten-sanierung/seo-wave-3-live.json \
  --fail-on error

npx --yes lighthouse https://www.komplettwebdesign.de \
  --only-categories=performance,accessibility,seo,best-practices \
  --form-factor=mobile \
  --output=json \
  --output-path=.superpowers/sdd/2026-07-26-seo-reichweiten-sanierung/lighthouse-home-wave-3-live.json \
  --chrome-flags="--headless --no-sandbox"
```

Es werden keine Lighthouse-Werte behauptet, bevor ein vollständiges, erfolgreiches Artefakt vorliegt.

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
- [ ] Welle 1 autorisiert deployen und live auditieren.
- [ ] 48 regressionsfreie Stunden für Welle 1 dokumentieren.
- [ ] Vor Welle 2 Backup prüfen und Migration 016 zweimal idempotent ausführen.
- [ ] Kosten- und Blumenladen-Inhalte über die autorisierten Adminabläufe freigeben.
- [ ] Welle 2 live auditieren und dynamische Änderungen separat bestätigen.
- [ ] Welle 3 deployen, live auditieren und Lighthouse vollständig messen.
- [ ] Search Console nach erfolgreichem Veröffentlichungsfenster gezielt aktualisieren.

Bis alle für die jeweilige Welle geltenden Punkte belegt sind, lautet die Entscheidung: **keine Veröffentlichung**.
