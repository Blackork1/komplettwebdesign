# Website-Optimierung für Komplett Webdesign

Stand: 22. April 2026

Dieses Dokument bündelt die nächsten Optimierungen aus Copywriting, Page-CRO, Form-CRO, Analytics-Tracking, Content-Strategie, Lead-Magnets, Free-Tool-Strategie, Customer-Research, Marketing-Psychologie und Local SEO.

## 1. Copywriting

Kernbotschaft:
Website erstellen lassen in Berlin - persönlich, SEO-freundlich und aus einer Hand.

Startseiten-Fokus:
- Für kleine Unternehmen in Berlin, die eine professionelle Website brauchen, aber keine Lust auf Technik, verstreute Ansprechpartner oder unklare Kosten haben.
- Wiederkehrende Begriffe: persönliche Betreuung, Festpreis-Pakete, Texte und SEO enthalten, Hosting und Wartung optional, Berlin-Fokus.
- Primäre CTA: Beratungsgespräch anfragen.
- Sekundäre CTA: Pakete ansehen oder kostenlosen Website-Check starten.

Paketlogik:
- Basis 499 EUR: 1 Seite, Texte und SEO-Grundlage, ideal als digitale Visitenkarte.
- Business 899 EUR: bis 5 Seiten, Kontaktformular, Leistungsseiten, Team/Über-uns und On-Page-SEO.
- Premium 1.499 EUR: bis 20 Seiten, Strategie, Texte, SEO und Buchungssystem; Shop optional nach Umfang.

## 2. Page-CRO

Wichtigste Hebel:
- Above the Fold muss sofort Preisrahmen, Berlin-Bezug, Full-Service und nächsten Schritt zeigen.
- Paketseite sollte nicht nur Leistungen nennen, sondern pro Paket die passende Kaufsituation erklären.
- Kontaktseite muss sich wie eine kurze Projektanfrage anfühlen, nicht wie ein langes Formular.
- Website-Tester stärker als risikofreier Einstieg platzieren.

Bereits umgesetzt:
- Startseiten-CTAs erhalten GA4-Trackingnamen.
- Paketseiten-CTAs erhalten GA4-Trackingnamen.
- Kostenloser Website-Check wurde auf der Startseite als Lead-Magnet-Einstieg ergänzt.

## 3. Form-CRO

Ziel:
Mehr abgeschlossene Anfragen und bessere Lead-Qualität im 9-Schritte-Formular.

Bereits umgesetzt:
- Fortschrittsanzeige mit Schrittstatus ergänzt.
- Paketauswahl klarer benannt: Basis, Business, Premium mit Preisen und Kurzbeschreibung.
- Telefonnummer ist optional, weil E-Mail für die Anfrage reicht.
- Submit-CTA wurde von "Absenden" zu "Anfrage senden" geschärft.
- Zusammenfassung escaped Nutzereingaben, damit eingegebene Inhalte sicher angezeigt werden.

Nächste Tests:
- Prüfen, ob Schritt 6 "Termin" optional genug wirkt.
- Prüfen, ob Feature-Auswahl zu viele Optionen enthält oder weiter gruppiert werden sollte.
- Abbruchrate pro Schritt in GA4 nach 2 bis 4 Wochen auswerten.

## 4. Analytics-Tracking

Tracking-Plan:

| Ereignis | Zweck | Key Event |
| --- | --- | --- |
| cta_clicked | Klicks auf wichtige Website-CTAs messen | Nein |
| contact_step_01_scope bis contact_step_09_summary | Formular-Funnel messen | Nein |
| generate_lead | Erfolgreich abgesendete Anfrage | Ja |
| ads_conversion_Kontakt_1 | Ads-/Kontakt-Conversion | Ja |

Regel:
generate_lead darf nur beim erfolgreichen Formularabschluss feuern. Es darf nicht durch page_view auf /kontakt erzeugt werden.

Wichtig für Consent:
Analytics-Events werden erst nach aktiver Analytics-Einwilligung gemessen. Ohne Einwilligung darf die Website normal funktionieren, aber GA4 bekommt keine vollständigen Nutzungsdaten.

## 5. Content-Strategie

Priorisierte lokale Themen:
- Website erstellen lassen Berlin: Ablauf, Kosten, Dauer.
- Webdesign Kosten Berlin: Was 499 EUR, 899 EUR und 1.499 EUR realistisch abdecken.
- Website für Handwerker in Berlin: Leistungen, Referenzen, Anfragen.
- Website für Restaurants und Cafés in Berlin: Speisekarte, Öffnungszeiten, Google Business.
- Website für Immobilienmakler in Berlin: Exposés, Vertrauen, lokale Sichtbarkeit.
- Website für Beauty- und Wellness-Angebote in Berlin: Buchung, Bewertungen, lokale Suche.
- Website für kleine Shops in Berlin: Produktseiten, einfache Bestellwege, spätere Shop-Erweiterung.
- Website-Relaunch Berlin: Wann sich ein Relaunch lohnt.

Struktur je Beitrag:
- Direktantwort im ersten Absatz.
- Berlin-Bezug und konkrete Zielgruppe.
- Preis-/Zeit-/Ablaufabschnitt.
- FAQ-Block für SEO und AI SEO.
- CTA zum Website-Check oder Beratungsgespräch.

## 6. Lead-Magnets

Beste Lead-Magnet-Idee:
Kostenloser Website-Check für Berliner Unternehmen.

Positionierung:
Vor dem Angebot wird geprüft, was aktuell wirklich bremst: SEO, Technik, Meta-Daten, kaputte Links, GEO-/AI-Signale und Anfragewege.

Nächste Ausbaustufen:
- Ergebnis-PDF mit 5 konkreten Empfehlungen.
- E-Mail-Follow-up nach Website-Check mit Paketempfehlung.
- Checkliste "Website-Start für Berliner Unternehmen".

## 7. Free-Tool-Strategie

Website-Tester als Tool-Hub:
- SEO-Tester: technische und inhaltliche SEO-Grundlagen.
- GEO-Tester: AI-/LLM-Signale, Antwortfähigkeit, Entitäten.
- Meta-Tester: Title, Description, Open Graph.
- Broken-Links-Tester: kaputte Links und technische Hygiene.

CTA-Logik:
Tool-Ergebnis -> Kontaktformular mit vorausgefülltem Kontext -> Paketempfehlung.

Metriken:
- Tool-Starts.
- Tool-Abschlüsse.
- Klicks von Tool-Ergebnis zu Kontakt.
- generate_lead aus Tool-Kontext.

## 8. Customer-Research

Annahmen aus aktuellem Website- und Angebotskontext:
- Zielkunden wollen klare Preise, schnelle Orientierung und wenig Technikaufwand.
- Hauptängste: versteckte Kosten, schlechte Erreichbarkeit, keine Google-Sichtbarkeit, zu lange Umsetzung.
- Starke Kaufargumente: ein Ansprechpartner, Berlin-Nähe, Texte und SEO enthalten, Hosting/Wartung optional.

Validierung:
- 5 kurze Gespräche mit bisherigen Interessenten oder Kunden führen.
- Fragen: Warum jetzt eine Website? Was war vor der Anfrage unklar? Welche Einwände gab es beim Preis? Welche Alternative wurde geprüft?

## 9. Marketing-Psychologie

Eingesetzte Prinzipien:
- Klarheit vor Kreativität: Pakete, Preise und nächste Schritte müssen sofort verständlich sein.
- Preisanker: Premium macht Business und Basis leichter einordenbar.
- Social Proof: Google-Bewertungen und konkrete lokale Beispiele stärker zeigen.
- Goal Gradient: Fortschrittsanzeige im Formular reduziert gefühlte Länge.
- Risikoreduktion: kostenloser Website-Check vor der Anfrage senkt Einstiegshürde.

## 10. Local SEO und SEO-Audit

Priorität:
- Einheitliche NAP-Daten: Name, Adresse, Telefonnummer.
- Lokale Landingpages für sinnvolle Branchen und Bezirke.
- Interne Links von Startseite, Paketseite, Ratgeber und Website-Tester.
- FAQ- und LocalBusiness-Schema aktuell halten.
- Google Business Profile regelmäßig mit Beiträgen, Bildern und Bewertungen pflegen.

Nächste Local-SEO-Aufgaben:
- Berlin-Bezirksseiten priorisieren: Lichtenberg, Prenzlauer Berg, Friedrichshain, Kreuzberg, Mitte.
- Branchen ohne Kita/Schule-Fokus weiter ausbauen: Handwerk, Restaurants, Immobilien, Beauty/Wellness, lokale Shops.
- Monatsroutine: GSC-Queries prüfen, GBP-Leistung notieren, neue Bewertungen anfragen, interne Links ergänzen.
