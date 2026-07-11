# Task 10 – Review-Fixes für Publikationsinvarianten

## Ergebnis

Die fünf wichtigen Reviewbefunde und die ergänzende PostgreSQL-Testanforderung sind fail-closed umgesetzt. Es wurde keine Auto-Publish-Policy aus Task 11 ergänzt.

## 1. Vollständiger persistierter Quality- und Risk-Report

- Der gespeicherte Reviewteil wird vollständig mit `ReviewOutputSchema` validiert.
- `passed` muss `true`, `requiresManualReview` muss `false` und `report.score` muss exakt gleich `content_post_metadata.quality_score` sein.
- Die fünf Felder `currentClaims`, `legalClaims`, `privacyClaims`, `softwareVersionClaims` und `staticPrices` müssen vollständig vorhanden und exakt `false` sein.
- `focusedReview` benötigt `blocked=false`, Arrays für `items` und `riskFlags`, leere `riskFlags` sowie einen nicht negativen ganzzahligen `sourceCount`.
- Der fokussierte Bericht wird aus dem persistierten Review und der aktuellen Artikelvalidierung erneut aufgebaut und muss strukturell exakt dem gespeicherten Bericht entsprechen.
- Fehlende, malformed oder widersprüchliche Reports blockieren die Veröffentlichung vor jedem Statusupdate.

## 2. Bereits vorhandenes manuelles Event

- Liefert der Partial-Unique-Insert kein neues manuelles Event, gilt der noch offene Review-Draft als Invariantenverletzung.
- Der Service wirft `CONTENT_DRAFT_NOT_PUBLISHABLE` und rollt das vorherige Postupdate zurück.
- Ohne neues Event gibt es weder Commit noch Freigabezählung.

## 3. Persistierte Internal-Link-Allowlist

- Die globale Linkliste ist kein Publikationsfallback mehr.
- `internal_links_json` muss als persistierte Liste mit zwei bis acht vollständigen `InternalLinkSchema`-Einträgen vorliegen.
- Fehlende, leere oder malformed Listen blockieren fail-closed.
- Der aktuelle Artikelvalidator erhält exakt die validierte persistierte Allowlist.

## 4. Einheitliche Slug- und Lock-Reihenfolge

- Veröffentlichung und Ablehnung verwenden vor `FOR UPDATE` denselben `LOCK TABLE posts IN SHARE ROW EXCLUSIVE MODE` wie der Admin-Drafteditor.
- Die Reihenfolge lautet damit einheitlich: Transaktionsbeginn, Tabellenlock, Post-Zeilenlock, Slugkontext.
- Gewöhnliche konkurrierende Post-DML und parallele Slugänderungen werden serialisiert; gegensätzliche Lock-Reihenfolgen zwischen Editor und Publikation entfallen.

## 5. Auditbewahrende Löschstrategie

- Migration 003 erstellt und migriert `content_publish_events.post_id` idempotent auf `ON DELETE RESTRICT`.
- Der Append-only-Trigger gegen Event-Updates und -Deletes bleibt bestehen.
- `BlogPostModel.delete` löscht nur Posts ohne Publish-Events und mappt auch ein konkurrierendes FK-Race auf `BLOG_POST_DELETE_RESTRICTED`.
- Der Legacy-Controller antwortet dafür mit einem sicheren, verständlichen HTTP-409-Konflikt statt eines Datenbank-500.
- Publish-Events werden niemals still oder kaskadierend entfernt.

## PostgreSQL-Opt-in-Abdeckung

Der bestehende Reset-Integrationstest deckt zusätzlich ab:

- zwei parallele manuelle Freigaben mit genau einem Erfolg, Event und Zählerinkrement,
- Rollback bei bereits vorhandenem manuellem Event,
- Unveränderlichkeit des Events bei `UPDATE` und `DELETE`,
- `ON DELETE RESTRICT` bei direktem Postdelete und fachliches Model-Mapping,
- erneute idempotente Ausführung der Migration 003 mit bestehenden Events.

Ohne `CONTENT_AGENT_PG_TEST_URL` und `CONTENT_AGENT_PG_TEST_ALLOW_RESET=true` bleibt der Test sicher übersprungen. In der aktuellen Umgebung war keine freigegebene Reset-Testdatenbank vorhanden.

## TDD und Verifikation

- RED: neun gezielte Assertions schlugen vor den Produktionsänderungen erwartungsgemäß fehl.
- Fokussierte Suite: 60 bestanden, 0 fehlgeschlagen.
- Gesamtsuite mit Testschlüssel: 852 bestanden, 0 fehlgeschlagen, 1 PostgreSQL-Opt-in-Test übersprungen.
- Build: erfolgreich; 41 CSS-Quelldateien, Manifest unverändert.
- `git diff --check`: ohne Befund.
- Geheimnisscan: keine neu eingeführten Geheimnisse oder Platzhalter.
- Keine Live-Daten und keine externen Provider wurden verwendet.
