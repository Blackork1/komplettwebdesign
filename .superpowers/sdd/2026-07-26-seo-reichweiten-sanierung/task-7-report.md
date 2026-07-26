# Task 7: Doppelte Website-Kosten-Artikel konsolidieren

## Status

Die Codekonsolidierung ist umgesetzt. Die öffentliche Redirectquelle
`/blog/website-kosten-2026-berlin-vergleich-2025` wird direkt mit HTTP 301 auf
`/blog/website-kosten-2025-einfach-erklaert` weitergeleitet. Die feste Route
steht vor der dynamischen Blogroute.

Die Redirectquelle wird über `REDIRECTED_BLOG_SLUGS` aus allen fünf
öffentlichen Blogqueries und der Posts-Sitemapquery ausgeschlossen. Die
Adminliste bleibt vollständig. Die optionale Datenbankinjektion und die
SQL-Parameterreihenfolge sind durch Tests abgesichert.

Die bestehende SEO-Intent-Registry und der SEO-Recovery-Auditvertrag zeigen
weiterhin auf dasselbe Ziel. Die stabilen Inlinks aus Task 5 in
`data/runningCostsPage.js` und `data/leistungenOverviewPage.js` bleiben
unverändert auf der überlebenden URL.

## Inhalt

Der verbindliche Kosten-Brief wurde unter
`docs/seo/content-briefs/2026-07-26-kosten-und-blumenladen.md` angelegt. Es
wurde keine neue Seite und kein neuer Artikel erstellt. Preise wurden nicht
geändert; Erfolgs- und Rankinggarantien wurden nicht ergänzt.

Eine tatsächliche Revision oder Veröffentlichung im Produktions-Content-Agent
und eine Mutation der Produktionsdatenbank wurden nicht vorgetäuscht und nicht
ausgeführt. Der Brief dokumentiert den noch notwendigen Deployment-Schritt:

1. etablierten Artikel im Adminbereich „Bestehende Inhalte“ öffnen,
2. Revision nach Brief erstellen und Fakten, Preise, Links sowie Jahreszahl
   manuell prüfen,
3. geprüfte Revision veröffentlichen,
4. neueren Artikel unveröffentlichen,
5. beide URLs live prüfen.

## TDD und Tests

Der neue Test wurde vor dem Produktionscode ausgeführt:

- erster roter Lauf: fehlende `data/blogRedirects.js`,
- zweiter roter Lauf nach Registry und Route: öffentliche Methoden umgingen
  noch die DB-Injektion; die parametrisierte Sitemapquery fehlte,
- grüner Lauf nach der minimalen Query- und Sitemapimplementierung: 5/5.

Fokussierte Prüfungen:

- `node --test tests/blogSeoRedirects.test.js tests/blogAdminWorkflow.test.js tests/seoPagePolicy.test.js`: 26/26 bestanden.
- Erweiterte Blogregressionen einschließlich Contentformat und Paginierung:
  39/39 bestanden.
- Audit- und Intent-Verträge:
  `node --test tests/seoIntentRegistry.test.js tests/seoRecoveryAuditService.test.js tests/blogSeoRedirects.test.js`:
  18/18 bestanden.
- Nach Anpassung der bestehenden Paginierungsassertion:
  32/32 fokussierte Tests bestanden.

Gesamtsuite:

```text
OPENAI_API_KEY=test-only-placeholder npm test
tests 2159
pass 2140
fail 0
skipped 19
```

`git diff --check` und die Syntaxprüfungen der geänderten JavaScript-Dateien
waren ohne Befund.

## Lokaler Redirect- und Auditcheck

Der lokale HTTP-Check lieferte:

```text
HTTP/1.1 301 Moved Permanently
Location: /blog/website-kosten-2025-einfach-erklaert
```

Der vollständige lokale SEO-Recovery-Audit konnte ohne lokale
PostgreSQL-Datenbank `blocksdorf` nicht abgeschlossen werden. Die lokale
Anwendung konnte zwar für den festen Redirect gestartet werden, dynamische
Zielseite und Sitemap konnten ihre Daten jedoch nicht laden. Der Audit meldete
deshalb ausschließlich `sitemap_status` mit Status 0. Die injizierbaren
Audit-Vertragstests bestehen vollständig; ein echter Live-Audit bleibt nach
Deployment mit erreichbarer Datenbank erforderlich.

## Self-Review und verbleibende Schritte

Im Self-Review wurden Route, Registry, SQL-Platzhalter, Methodenparameter,
Adminvollständigkeit, Sitemapfilter, Audit-Registry, Content-Brief und die
unveränderten Inlinks gegen den verbindlichen Brief geprüft. Es bestehen keine
offenen Codebefunde.

Verbleibend sind ausschließlich die autorisierte Content-Agent-Revision, das
Unveröffentlichen des neueren Artikels und der Live-Audit nach Deployment.
