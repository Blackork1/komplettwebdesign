# Lokaler Datenschutzentwurf: zuverlässige Online-Einkaufshäkchen

Stand: 19. Oktober 2026. **Nicht veröffentlicht, keine Rechtsfreigabe.**

Dieser Entwurf gehört zum inaktiven S3-Mikrobündelpaket im App-Repository.
Bestehende Änderungen an öffentlichen Seiten werden nicht angefasst.

## Anlass und technische Abgrenzung

Die S2-Fassung beschreibt lokale Einkaufsaufträge insbesondere beim
Premium-Offlinebetrieb. Das neue Verfahren speichert auch online erfasste
Häkchen vor dem Versand verschlüsselt, damit ein Verbindungsabbruch keine
doppelte oder unbemerkt verlorene Änderung erzeugt. Das gilt nicht nur für
Premium. Es berechtigt weder zu neuen gemeinsamen Offlineänderungen noch zu
privaten Offlineänderungen ohne den bisherigen Premiumgrant.

Serverseitig entstehen kompakte, zugriffsgeschützte technische Bestätigungen
mit gebundenen Auftrags-/Artikelkennungen, Revisions-/Statuswerten und Frist.
Keine vollständigen Einkaufslisten, Profile, Tokens oder Gesundheitslisten
werden zusätzlich im Receipt gespeichert. Die Frist beträgt 30 Tage,
der einzelne gespeicherte Antwortkörper höchstens 8.192 UTF-8-Bytes.

## Vorgeschlagene Ergänzung bei Konto, Synchronisierung und Speicherdauer

> Damit Änderungen an deiner Einkaufsliste bei Verbindungsabbrüchen nicht
> doppelt ausgeführt werden oder unbemerkt verloren gehen, speichern wir
> online erfasste Einkaufsmarkierungen vorübergehend verschlüsselt auf deinem
> Gerät. Mehrere Markierungen können gemeinsam übertragen werden. Noch
> ungeklärte Aufträge werden bis zu sieben Tage automatisch abgeglichen.
> Zusätzlich speichern wir bis zu 30 Tage kompakte technische Bestätigungen
> mit den hierfür erforderlichen Auftrags-, Artikel- und Statusreferenzen.
> Diese Bestätigungen enthalten keine vollständige Kopie deiner Einkaufsliste.
>
> Die gemeinsame Einkaufsliste benötigt für neue Änderungen weiterhin eine
> bestätigte Onlineverbindung. Der bisherige persönliche Premium-Offlinebetrieb
> bleibt davon getrennt. Abmeldung, Kontolöschung und der Verlust des
> zugehörigen Kontos oder gemeinsamen Bereichs bereinigen die jeweils
> gebundenen lokalen Daten.

Vor einer Veröffentlichung mit der aktuellen öffentlichen Fassung und den
maßgeblichen S2-/S4-Quelldokumenten abgleichen. Die technische Umsetzung fügt
keine neuen Empfänger, Werbe-/Trackingdaten oder Analysezwecke hinzu; dies ist
keine abschließende rechtliche oder Store-Datenschutzbewertung.

## Nachweis und noch ausstehend

## Ergänzender lokaler Entwurf: wiederholbare Profiländerungen

Noch nicht veröffentlicht oder aktiviert. Für die neue Profil-V2-Anbindung
ist vor einer späteren Aktivierung zusätzlich folgender technischer Sachverhalt
mit der dann aktuellen öffentlichen Erklärung abzugleichen:

> Wenn du deine Profileinstellungen online speicherst, bewahrt die App den
> noch unbestätigten Auftrag vorübergehend verschlüsselt auf deinem Gerät auf.
> Dadurch kann dieselbe Änderung nach einem Verbindungsabbruch eindeutig
> geprüft werden, ohne sie doppelt auszuführen. Der zulässige
> Wiederaufnahmezeitraum beträgt sieben Tage. Überfällige lokale Aufträge
> werden beim nächsten Zugriff bereinigt und nicht automatisch neu gesendet.
> Nach einer Speicherbestätigung wird die lokale Auftragskopie durch eine
> kompakte Bestätigung ersetzt; nach dem aktuellen Serverabgleich wird auch
> diese entfernt. Eine Profiländerung wird dadurch nicht für den Offlinebetrieb
> freigeschaltet.
>
> Auf dem Server werden technische Bestätigungen für 720 Stunden vorgehalten.
> Sie enthalten die Kontozuordnung, kryptografische Auftragsbindungen,
> Versions-/Änderungsstatus und Zeitangaben, aber keine zusätzliche vollständige
> Profilkopie oder Listen deiner Allergien und ausgeschlossenen Lebensmittel.
> Gesundheitsbezogene Profilangaben unterliegen weiterhin deiner ausdrücklichen
> Einwilligung. Bei einer Kontolöschung werden die zugehörigen technischen
> Bestätigungen ebenfalls gelöscht.

Vor Aktivierung sind der tatsächliche serverseitige Löschlauf und die lokalen
Abmelde-/Widerrufswege nachzuweisen. Keine neuen Empfänger oder Analysezwecke;
keine Rechtsfreigabe und keine Veröffentlichung durch diesen Entwurf.

Maßgeblich im App-Repository:

- `docs/superpowers/specs/2026-10-18-einkaufsstatus-mikrobuendel-design.md`
- `docs/verification/s5-schritt3-einkaufsstatus-mikrobuendel-2026-10-18.md`
- `docs/runbooks/einkaufsstatus-mikrobuendel.md`
- `docs/legal/s2-datenschutzerklaerung.md`
- `docs/privacy/s4-privacy-and-store-delta.md`

Veröffentlichung und Aktivierung sind nicht Bestandteil dieses lokalen
S3-Abschlusses. Keine bestehenden EJS-/CSSdateien oder deren fremde Änderungen
wurden geändert, kein Websitecommit und kein Deployment ausgeführt.
