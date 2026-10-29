# Branchenanalysen 29.10.2026

Zehn Branchenseiten liefen bis zum 29.10.2026 noch über die Datenbank-Vorlage und standen auf `noindex`. Für jede gibt es hier eine eigene Analyse. Die neuen Inhalte liegen in `data/<branche>Page.js` und werden über `services/nichePageViewModel.js` wie die übrigen Branchenseiten ausgeliefert.

## Vorgehen je Branche

1. Alte Seite geprüft (Titel, Inhalt, Indexierung, Bild).
2. Google-Suchvorschläge gesammelt: was Betriebe suchen („… website erstellen lassen“, „… website kosten“, „impressum …“) und was deren Kundschaft sucht („… berlin bezirk“, „… in der nähe ohne termin“, „… kosten“).
3. Suchergebnisse für den Hauptbegriff ausgewertet und die stärksten Konkurrenzseiten nach Tiefe, Aufbau, SEO und Bedienbarkeit bewertet.
4. Lücken bestimmt und belastbare Quellen gesucht: aktuelle Branchenzahlen aus Primärquellen und die Gesetze, die für die Website der Branche gelten.
5. Seite neu geschrieben: Hero, Ausgangslage, Inhaltsbausteine, Arten des Betriebs mit echten Kundensuchen, Anfrageweg, Recht, Local SEO, Preise, Ablauf und zehn Fragen aus echten Suchanfragen.

## Übersicht

| Branche | Seite | Hauptbegriff | Zahlen | Rechtsthemen |
|---|---|---|---|---|
| [Arztpraxis](arzt.md) | `/branchen/webdesign-arzt` | Arztpraxis-Website erstellen lassen | Bitkom 12/2025: 64 % buchen Arzttermine online | DDG, Berufsordnung Ärztekammer Berlin, GOÄ, HWG, BFSG |
| [Physiotherapie](physiotherapie.md) | `/branchen/webdesign-physiotherapie` | Physiotherapie-Website erstellen lassen | BA-Engpassanalyse: Engpasswert 2,7, 280 Tage Vakanz | HWG, sektorale HP-Erlaubnis (BVerwG 3 C 19.08), MPhG |
| [Hebamme](hebamme.md) | `/branchen/webdesign-hebamme` | Hebammen-Website erstellen lassen | bifg 2026: 654.000 Geburten, 17.800 Hebammen | § 24d SGB V, Hebammengesetz, DDG |
| [Steuerberater](steuerberater.md) | `/branchen/webdesign-steuerberater` | Steuerberater-Website erstellen lassen | BStBK 2025: 89.549 Steuerberater, Ø 53,7 Jahre | § 57a StBerG, DDG, DL-InfoV, StBVV |
| [Kfz-Werkstatt](autowerkstatt.md) | `/branchen/webdesign-autowerkstatt` | Kfz-Werkstatt-Website erstellen lassen | KBA 1.1.2026: Pkw Ø 10,9 Jahre, Berlin 1,22 Mio. | § 12 PAngV, DDG |
| [Friseur](friseur.md) | `/branchen/webdesign-friseur` | Friseur-Website erstellen lassen | ZV Friseurhandwerk 6/2026: 80.118 Salons, Preise +3,6 % | § 12 PAngV, KUG, BFSG |
| [Kosmetik](beautysalon.md) | `/branchen/webdesign-beautysalon` | Kosmetikstudio-Website erstellen lassen | keine belastbare Primärquelle gefunden, ohne Zahlen | HWG § 3 und § 11, PAngV, KUG, BGB |
| [Fotograf](fotograf.md) | `/branchen/webdesign-fotograf` | Fotografen-Website erstellen lassen | ohne Zahlen | KUG, UrhG § 13, PAngV § 3 |
| [Tattoo](tattoo.md) | `/branchen/webdesign-tattoo` | Tattoo-Studio-Website erstellen lassen | YouGov 2021 laut BT-Drs. 20/841: fast jede vierte Person tätowiert | REACH (EU) 2020/2081, KUG, DDG |
| [Massage und Wellness](wellness.md) | `/branchen/webdesign-wellness` | Massage-Website erstellen lassen | ohne Zahlen | MPhG § 1, HWG, PAngV, BGB §§ 195, 199 |

## Was sich zusätzlich geändert hat

- Alle zehn Seiten stehen in `PRIORITY_INDUSTRY_SLUGS` und damit im Index und in der Sitemap.
- Die Branchenübersicht `/branchen` zeigt für Seiten mit eigenem Inhalt deren Titel, Text und Foto statt der alten Datenbankangaben.
- Abschnittsüberschriften der Branchenseiten sind auf schmalen Handys etwas kleiner, damit lange Wörter nicht mitten im Wort umbrechen.

## Offene Punkte

- Eigene Fotos wären bei Autowerkstatt (bisher freigestelltes Auto), Physiotherapie, Friseur und Steuerberater stärker als die Bilder aus der Mediathek.
- Für Kosmetik, Fotograf und Massage gibt es keine Branchenzahlen auf der Seite, weil keine belastbare Primärquelle gefunden wurde.
- Die Tattoo-Zahl stammt von 2021.
