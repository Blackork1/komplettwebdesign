# Content-Agent: gezielte Prüfhinweis-Optimierung

## Ziel

Ein Administrator kann einen einzelnen redaktionellen Prüfhinweis oder alle aktuell angezeigten Hinweise eines unveröffentlichten KI-Entwurfs gezielt durch OpenAI bearbeiten lassen. Danach werden der geänderte Artikel technisch validiert und redaktionell neu geprüft. Nur ein vollständig konsistentes Ergebnis wird atomar als neue, weiterhin unveröffentlichte Reviewversion gespeichert.

## Ausgangslage

Die fokussierte Prüfung zeigt derzeit konkrete Textstelle, Begründung und Prüfanweisung. Sie ist jedoch nur informativ:

- „Artikel neu erstellen“ verwendet eine allgemeine Reparaturanweisung und kann unnötig den gesamten Artikel umschreiben.
- Manuelle Änderungen erhöhen zwar die Reviewversion, berechnen aber den persistierten Qualitäts- und Risikobericht nicht neu.
- Eine Veröffentlichung verlangt, dass Artikel, Qualitätsbericht und der daraus erneut abgeleitete fokussierte Prüfbericht exakt übereinstimmen.

Eine gezielte Optimierung muss deshalb Textänderung, technische Validierung, redaktionelle Neuprüfung und Metadatenaktualisierung als zusammengehörigen Vorgang behandeln.

## Gewählter Ansatz

Es wird ein eigener Queuejob `optimize_review_issues` ergänzt. Dieser Ansatz ist gegenüber zwei Alternativen vorzuziehen:

1. **Nur manuell bearbeiten:** günstig, aber der Prüfbericht bleibt veraltet und liefert keinen Nachweis, dass der Hinweis behoben wurde.
2. **Den vollständigen Artikel neu erstellen:** bereits vorhanden, aber zu breit, weniger vorhersehbar und für einen einzelnen CTA-Hinweis unnötig teuer.
3. **Gezielte Reparatur mit anschließender Neuprüfung:** ändert nur das Artikel-HTML, bewahrt alle anderen Felder und erzeugt anschließend einen konsistenten neuen Qualitätsbericht. Dieser Ansatz wird umgesetzt.

## Adminoberfläche

In „Konkrete Prüfstellen“ erhält jeder Hinweis die Aktion:

- „Diesen Hinweis beheben“

Zusätzlich erhält der Prüfblock die Aktion:

- „Alle Hinweise optimieren und neu prüfen“

Vor dem Einreihen bestätigt ein Dialog:

- Es entstehen reguläre Kosten für genau eine Textreparatur und eine redaktionelle Prüfung.
- Der Artikel bleibt unveröffentlicht.
- Eine eventuell vorhandene Freigabe wird durch die neue Reviewversion aufgehoben.

Die Anfrage enthält die aktuelle Reviewversion. Bei einer Einzeloptimierung wird zusätzlich der serverseitig geprüfte Index des Hinweises übermittelt. Die Oberfläche übermittelt niemals freien Prompttext.

Nach dem Einreihen erscheint die vorhandene Queuebestätigung. Nach erfolgreicher Verarbeitung zeigt ein erneuter Aufruf des Entwurfs den aktualisierten Artikel, Qualitätsscore und Prüfbericht. Verbleibende oder neu gefundene Hinweise werden weiterhin angezeigt.

## Datenfluss

1. Der Administrator wählt Einzel- oder Sammeloptimierung und bestätigt die Kostenwarnung.
2. Der Controller prüft CSRF, Administratorstatus, positive Entwurfs-ID, exakte Reviewversion, Modus und optionalen Hinweisindex.
3. Der Controller lädt den aktuellen Entwurf. Er lehnt eine veraltete Reviewversion, einen ungültigen Index, einen leeren Prüfbericht oder einen blockierten Prüfbericht ab.
4. Ein budgetierter Queuejob `optimize_review_issues` wird im erzwungenen Reviewmodus angelegt. Sein Payload enthält ausschließlich `post_id`, `expected_review_version`, `issue_mode`, optional `issue_index`, `source` und `forced_mode`.
5. Der Worker lädt denselben Entwurf und prüft die Reviewversion erneut, bevor ein Provideraufruf oder eine Budgetreservierung erfolgt.
6. Für den Reparaturaufruf erhält OpenAI das vorhandene SEO-Briefing, den vollständigen aktuellen Artikel und entweder den gewählten Hinweis oder alle aktuellen Hinweise. Begründung, Fundstelle und Prüfanweisung werden als konkrete Reparatur-Issues verwendet.
7. Vom strukturierten Reparaturergebnis wird ausschließlich `contentHtml` übernommen. Titel, Slug, Kurzbeschreibung, Meta-Daten, Open-Graph-Daten, FAQ, Bilddaten, SEO-Zuordnung, Quellen und CTA-Pfade bleiben unverändert.
8. Der resultierende vollständige Artikel durchläuft die deterministische Artikelvalidierung. Nur die sanitizierte, exakt speicherbare Fassung wird weiterverwendet.
9. OpenAI prüft diese Fassung redaktionell erneut. Der Worker erzeugt anschließend serverseitig den neuen fokussierten Prüfbericht.
10. Nur wenn die redaktionelle Prüfung bestanden wurde, der Score mindestens 80 beträgt, keine manuelle Prüfung erforderlich ist, alle Risikoflags `false` sind und der fokussierte Bericht nicht blockiert ist, wird gespeichert.
11. Artikel-HTML, Qualitätsscore, vollständiger Qualitätsbericht und Regenerationsaudit werden in einer Datenbanktransaktion aktualisiert. Dabei wird die Reviewversion genau einmal erhöht, der Status auf `needs_review` gesetzt und jede vorherige Freigabe entfernt.

## Kosten und Wiederaufnahme

Der Job besitzt zwei getrennte, dauerhaft protokollierte Providerstufen:

- `optimize_review_issues:<postId>:repair`
- `optimize_review_issues:<postId>:review`

Vor jeder Stufe wird das Monatsbudget reserviert. Persistierte, bereits abgerechnete Providerergebnisse werden bei einem sicheren Worker-Retry wiederverwendet. Eine offene oder unklare Providerreservierung wird nicht automatisch doppelt ausgeführt, sondern führt zur manuellen Prüfung.

Doppelte Adminanfragen werden durch die erwartete Reviewversion begrenzt: Der erste erfolgreiche Job erhöht die Version; weitere Jobs derselben Ausgangsversion stoppen vor einem neuen Provideraufruf als veraltet.

## Sicherheits- und Konsistenzregeln

- Die Funktion ist ausschließlich für unveröffentlichte, von der KI erzeugte `static_html`-Entwürfe verfügbar.
- Es wird kein freier Prompt aus einem Formular angenommen.
- Der Hinweis muss exakt aus dem aktuell persistierten `focusedReview` stammen.
- Einzel- und Sammelmodus sind die einzigen erlaubten Modi.
- Reparatur und Review laufen ausschließlich bei aktivem Content-Agent und im Reviewmodus.
- Keine Aktion veröffentlicht, plant oder genehmigt den Artikel.
- Nur das sanitizierte HTML wird gespeichert.
- Interne Links, CTA-Pfade, FAQ, Preise und Quellen werden erneut deterministisch geprüft.
- Ein veralteter Entwurf wird vor dem ersten kostenpflichtigen Aufruf gestoppt.
- Eine fehlgeschlagene Reparatur oder Prüfung lässt den bisherigen Entwurf unverändert.
- Der atomare Commit besitzt einen dauerhaften Fence, damit ein unklarer Datenbankausgang sicher abgeglichen werden kann.

## Fehlerverhalten

- **Ungültiger oder veralteter Hinweis:** HTTP-Konflikt im Adminbereich, kein Job und keine Kosten.
- **Budget ausgeschöpft:** Job endet mit manueller Prüfung, Entwurf bleibt unverändert.
- **Provider sicher abgelehnt:** Reservierung wird freigegeben und der vorhandene sichere Retrymechanismus darf greifen.
- **Providerausführung unklar:** keine automatische Wiederholung; manueller Status verhindert doppelte Kosten.
- **Reparatur technisch ungültig:** keine Speicherung, konkrete Validierungsfehler im Jobprotokoll.
- **Redaktionelle Prüfung nicht bestanden oder blockiert:** keine Speicherung; Issues und Prüfergebnis werden im Run protokolliert.
- **Reviewversion zwischenzeitlich verändert:** Abbruch als `CONTENT_REGENERATION_STALE`, bevor neue Providerkosten entstehen.
- **Commit-Ausgang unklar:** Abgleich über Reviewversion und Commit-Fence; niemals blind erneut speichern.

## Bestehende Funktionen

Die bisherigen Aktionen „Artikel neu erstellen“, „Meta-Daten neu erstellen“, „FAQ neu erstellen“ und „Bild neu erstellen“ bleiben unverändert. Die neue Funktion ist ausschließlich für fokussierte redaktionelle Prüfhinweise zuständig.

## Tests und Abnahmekriterien

Die Umsetzung ist abgeschlossen, wenn automatisierte Tests folgende Punkte beweisen:

- Einzel- und Sammelbuttons werden mit CSRF, Reviewversion, Modus und Bestätigungsdialog gerendert.
- Controller und Route lehnen ungültige Bestätigungen, Modi, Indizes und veraltete Versionen ab.
- Der neue Jobtyp wird nur bei aktivem Agenten und ausschließlich im Reviewmodus angenommen.
- Ein Einzeljob übergibt genau einen persistierten Hinweis; ein Sammeljob übergibt alle aktuellen Hinweise.
- Es werden genau eine Reparatur- und eine Reviewstufe budgetiert.
- Nur `contentHtml` kann sich durch die Reparatur ändern.
- Die technische Validierung läuft vor der redaktionellen Neuprüfung.
- Der neue fokussierte Bericht wird aus der tatsächlich speicherbaren Fassung erzeugt.
- Ein erfolgreicher atomarer Commit aktualisiert HTML, Score und Qualitätsbericht, erhöht die Reviewversion und entfernt eine alte Freigabe.
- Technische, redaktionelle, Budget-, Provider- und Stale-Fehler lassen den bisherigen Entwurf unverändert.
- Ein Retry verwendet persistierte Providerergebnisse und verursacht keine doppelten Kosten.
- Der vorhandene Veröffentlichungsvalidator akzeptiert den optimierten Entwurf mit dem neuen konsistenten Bericht.
- Gesamttests, echter PostgreSQL-Integrationstest und CSS-Build bestehen.

## Nicht enthalten

- Freie Optimierungsanweisungen durch den Administrator
- Automatische Veröffentlichung nach der Optimierung
- Mehrere sequenzielle Reparaturrunden innerhalb eines Jobs
- Änderung von Meta-Daten, FAQ, Bild oder SEO-Zuordnung durch diesen Jobtyp
- Automatische Quellenrecherche für einen nicht blockierenden redaktionellen Hinweis
