# Swipe-&-Cook-Rechtstextaktualisierung vom 8. Oktober 2026

## Umfang

Die vier kanonischen Seiten Datenschutz, Nutzungsbedingungen, Support und
Kontolöschung wurden gezielt im Komplettwebdesign-Projekt ergänzt. Die
laufende S3-Publikationsfassung vom 4. September wurde als Basis übernommen;
neuere lokale Hinweise zum persönlichen Premium-Offlinebetrieb wurden erhalten.
Die historische S2-Fassung bleibt unverändert lesbar. Der lokale Legalservice
wurde an die bereits produktive S3-Versionsauswahl angeglichen.

Ergänzungen: Fokus und verbindliche Ausschlüsse, rezeptgebundene beidseitige
Risiko-Ausnahme, Warnbestätigungsdaten, private Swipes und Bewertungen,
Firebase-/FCM-/APNs-Kennungen, technische Empfänger sowie Lösch- und
Sicherungsunterschiede. Keine eigene 30-Tage-TTL für Ausnahmebelege zugesagt.
Die Warnbestätigung ist weder Gesundheitsgarantie noch Haftungsverzicht oder
Ersatz der Gesundheitsdateneinwilligung.

## Technische Prüfung

- Zwei neue Tests zunächst wegen fehlender aktueller Versionsauswahl und
  fehlendem historischen Versionslader fehlgeschlagen.
- 18 fokussierte Versions-, Router-, EJS-, Navigations- und Sicherheitstests
  anschließend bestanden.
- Vollständiges `npm test`: 2.260 Tests, 2.241 bestanden, 19 übersprungen,
  0 fehlgeschlagen; Exit 0.
- Alle vorhandenen Abschnittsüberschriften der Produktionsbasis erhalten.
- Alle vier öffentlichen URLs nach Aktivierung HTTP 200, Stand
  „8. Oktober 2026“, genau eine H1, keine internen Entwurfsvermerke.

Technische Prüfungen sind keine anwaltliche Rechtsprüfung oder DSFA-Freigabe.

## Gezielte Veröffentlichung

Host: `webadmin@217.154.89.44`. Die bisherigen vier Textdateien wurden vor
Änderung im Hostverzeichnis
`/home/webadmin/apps/komplettwebdesign/data/legal-20261008.Qy3oFQ`
gesichert. Die Quell- und Containerfassungen hatten vorher übereinstimmende
SHA-256-Prüfsummen.

Nur diese vier Markdowndateien wurden in den bestehenden Hostcheckout unter
`server/content/swipeandcook/` und in den laufenden Appcontainer übernommen.
Der produktive Service liest sie bei jedem Aufruf neu; kein Appneustart,
Imagebuild, Datenbanklauf oder Workerwechsel war notwendig. Rootkonfiguration,
allgemeine Datenschutzerklärung, Websitegestaltung und fremde Cookavoli-
Änderungen blieben unberührt. Keine Storeformulare geändert oder gespeichert.

Die Änderungen sind noch nicht committed oder gepusht. Die produktive
Aktivierung ist eine gezielte Inhaltsaktualisierung, kein neu gebautes Image.
Ein späteres Git-Reset oder Deployment eines alten Images darf diese Fassungen
nicht überschreiben; vor einem normalen Folge-Deployment müssen die vier
Dateien in dessen Quellstand übernommen und mit den öffentlichen Seiten
abgeglichen werden. Kein pauschaler Push des fremd veränderten Arbeitsbaums.

## Verbleibender Datenschutzabgleich

Apple und Google enthielten bei der lesenden Portalprüfung keine Kategorie für
Geräte-/Installationskennungen. Die App verwendet Firebase-/FCM-Kennungen und
kontogebundene Pushregistrierungen. Kategorie, Zweck, Kontoverknüpfung,
Trackingausschluss sowie Google-Weitergabe-/Dienstleisterausnahme müssen
korrekt in beiden Portalen entschieden werden. Die bloße Systemfreigabe für
Mitteilungen beweist keine vollständig optionale SDK-Erhebung, weil Firebase
initialisiert wird und Auto-Init nicht ausdrücklich deaktiviert gefunden wurde.
Diese Veröffentlichung korrigiert nicht automatisch die Storedeklarationen,
Anbietervereinbarungen, Einwilligungsabläufe oder offenen Betriebsbefunde.
