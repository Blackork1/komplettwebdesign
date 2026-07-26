# Content-Brief: Website-Kosten und Blumenladen

## Website-Kosten

Überlebende URL: /blog/website-kosten-2025-einfach-erklaert
Weiterleitung: /blog/website-kosten-2026-berlin-vergleich-2025 → Überlebende URL
Meta-Titel: Website-Kosten 2026: Preise für Selbstständige
Meta-Description: Was kostet eine professionelle Website 2026? Realistische Preisbereiche, laufende Kosten, Leistungsunterschiede und Beispiele für Selbstständige.
H1: Website-Kosten 2026: realistische Preise für Selbstständige
Primäre Suchabsicht: informationell mit Übergang zur Paketübersicht
Pflichtlinks: /pakete, /leistungen/laufende-kosten-website, /webdesign-berlin
Pflichtabschnitte: einmalige Projektkosten; laufende Kosten; Preisfaktoren; Paketvergleich; günstige Website versus tragfähige Lösung; Checkliste für ein Angebot

Der Inhalt des neueren Artikels wird Abschnitt für Abschnitt geprüft und nur dann in den etablierten Artikel übernommen, wenn er aktuell, einzigartig und fachlich passend ist.

### Deployment-Schritt im Content-Agent

Dieser Schritt benötigt eine autorisierte Adminsession und wird nicht durch die Codeänderung oder einen direkten Produktionsdatenbankzugriff vorweggenommen:

1. Im Bereich „Bestehende Inhalte“ den etablierten Artikel `website-kosten-2025-einfach-erklaert` öffnen.
2. Eine vollständige Revision anhand dieses Briefs erstellen.
3. Fakten, Preise, Links und die Jahreszahl manuell prüfen.
4. Die geprüfte Revision veröffentlichen.
5. Den neueren Artikel `website-kosten-2026-berlin-vergleich-2025` unveröffentlichen.
6. Beide URLs live prüfen und sicherstellen, dass die Weiterleitung genau eine 301-Stufe besitzt.

Es wird kein neuer Artikel erstellt. Preise werden durch diese Maßnahme nicht geändert; Erfolgs- oder Rankinggarantien sind ausgeschlossen.

## Blumenladen

Die beiden vorhandenen Seiten bedienen unterschiedliche Suchabsichten und werden nicht zu einer neuen Seite zusammengeführt.

### Kommerzielle Branchenseite

URL: `/branchen/webdesign-blumenladen`<br>
Suchabsicht: Website-Leistung kaufen beziehungsweise den passenden Leistungsumfang auswählen.<br>
Meta-Titel: `Webdesign für Blumenläden | Website erstellen lassen`<br>
Meta-Description: `Webdesign für Blumenläden: individuelle Website, lokale Auffindbarkeit, Sortiment, Öffnungszeiten und klare Kontaktwege für Floristikbetriebe.`<br>
H1: `Webdesign für Blumenläden`<br>
Pflichtlinks: `/blog/seo-fuer-blumenladen`, `/pakete`, `/webdesign-berlin`<br>
Primärer nächster Schritt: `Pakete ansehen` → `/pakete`

Der Bloglink wird von der bestehenden Branchen-Kontextnavigation ausgegeben, die Paketlinks vom bestehenden Paketbereich und der Link zu Webdesign Berlin im Branchen-Intro. Für den Slug `blumenladen` steuert die statische Vorlage die hervorgehobenen Handlungsaufforderungen auf genau `/pakete`; damit bleibt die kaufnahe Handlungsaufforderung von der informationsorientierten Blogseite getrennt.

### Informationeller Blogartikel

URL: `/blog/seo-fuer-blumenladen`<br>
Suchabsicht: Local SEO für einen Floristikbetrieb verstehen und selbst einordnen.<br>
Meta-Titel: `SEO für Blumenläden: lokal besser gefunden werden`<br>
Meta-Description: `So verbessern Blumenläden ihre lokale Sichtbarkeit: Google-Unternehmensprofil, Standortsignale, Sortiment, Bilder, Bewertungen und passende Website-Inhalte.`<br>
H1: `SEO für Blumenläden: lokal besser gefunden werden`<br>
Pflichtlinks: `/branchen/webdesign-blumenladen`, `/leistungen/local-seo`<br>
Primärer nächster Schritt: `Webdesign für Blumenläden ansehen` → `/branchen/webdesign-blumenladen`

Der Artikel erklärt Google-Unternehmensprofil, Standortsignale, Sortiment, Bilder, Bewertungen und passende Website-Inhalte. Er verkauft keine Paketentscheidung als primäre Handlung und darf weder den H1 noch die primäre Handlungsaufforderung der Branchenseite übernehmen.

### Autorisierter Deployment-Schritt

Die Inhalte liegen in den bestehenden Administrationsdatenbanken. Sie werden weder aus diesem Repository heraus direkt verändert noch wird ein neuer Artikel oder eine neue Branchenseite angelegt.

1. Mit einer autorisierten Adminsession `/admin/industries` öffnen, den bestehenden Datensatz `Blumenladen` bearbeiten und ausschließlich die Felder `SEO Title`, `Meta Description` und `Hero H1` auf die oben genannten Werte setzen. Den bestehenden Slug `blumenladen` nicht ändern.
2. Vor dem Speichern die Vorschau von `/branchen/webdesign-blumenladen` prüfen: Der bestehende Branchen-Kontextlink muss auf `/blog/seo-fuer-blumenladen`, der Paketbereich auf `/pakete` und das Branchen-Intro auf `/webdesign-berlin` verweisen. Die hervorgehobenen Buttons müssen `Pakete ansehen` und `/pakete` verwenden.
3. In `/admin/content-agent/existing-content` den bestehenden Artikel mit dem Slug `seo-fuer-blumenladen` wählen und eine Revision anlegen. In der Revision `Meta Title`, `Meta Description` und den einzelnen H1 im `Artikelinhalt` auf die oben genannten Werte setzen. Nur einen primären CTA mit dem Link `/branchen/webdesign-blumenladen` und der Beschriftung `Webdesign für Blumenläden ansehen` auszeichnen; den Kontextlink `/leistungen/local-seo` im erklärenden Inhalt belassen oder ergänzen.
4. Revision speichern, den Vorher-Nachher-Vergleich und die Vorschau prüfen und erst danach ausdrücklich freigeben. Der Slug und Veröffentlichungsstatus bleiben dabei gesperrt.
5. Beide veröffentlichten URLs aufrufen und die fünf Pflichtlinks sowie die voneinander abweichenden H1 und primären nächsten Schritte anklicken. Preise, rechtliche Aussagen und Rankinggarantien werden nicht verändert oder ergänzt.
