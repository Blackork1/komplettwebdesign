# Phase 13: Tracking- und Lead-Qualifizierungsplan

## Aktueller Tracking-Status

Die Seite hat bereits eine Consent-Infrastruktur. Google Analytics und Clarity werden nur nach Zustimmung geladen. Phase 13 ergänzt keinen neuen externen Dienst, sondern nutzt eine neutrale Event-Schicht in `public/js/tracking.js`.

## Gewählter Modus

- Standard: interne `CustomEvent`-Events über `kwd:tracking`.
- Optional: Weitergabe an bereits vorhandene Tools nur bei Analytics-Consent.
- Keine neuen Cookies, keine neuen Trackingdienste, keine personenbezogenen Werte.
- Keine Namen, E-Mail-Adressen, Telefonnummern, Unternehmensnamen, Website-URLs oder Freitexte in Analytics.

## Event-Taxonomie

| Event | Zweck | Typische Quelle |
| --- | --- | --- |
| `hero_cta_click` | Hero-CTA messen | Startseite, Leistungsseiten |
| `header_cta_click` | Header-CTA messen | Navigation |
| `footer_cta_click` | Footer-CTA messen | Footer |
| `package_card_click` | Paketinteresse messen | Paketkarten |
| `pricing_cta_click` | Preis-/Kosten-CTA messen | Kosten- und Preisseiten |
| `website_check_cta_click` | Website-Check-CTA messen | Website-Tester-Verweise |
| `tester_started` | Website-Tester gestartet | Website-Tester |
| `tester_completed` | Website-Tester abgeschlossen | Website-Tester |
| `tester_cta_clicked` | Tester-Ergebnis-CTA geklickt | Website-Tester-Ergebnis |
| `tester_lead_requested` | Report-Anfrage gestellt | Website-Tester-Ergebnis |
| `tester_lead_confirmed` | Report-Bestätigung erfolgreich | Website-Tester-Bestätigung |
| `tester_report_sent` | Report-Versand nach Bestätigung | Website-Tester-Bestätigung |
| `seo_tester_scan_completed` | SEO-Tester abgeschlossen | SEO-Tester |
| `seo_tester_cta_clicked` | SEO-Tester-CTA geklickt | SEO-Tester-Ergebnis |
| `seo_tester_lead_requested` | SEO-Report angefragt | SEO-Tester-Ergebnis |
| `seo_tester_lead_confirmed` | SEO-Report bestätigt | SEO-Tester-Bestätigung |
| `seo_tester_report_sent` | SEO-Report versendet | SEO-Tester-Bestätigung |
| `geo_tester_lead_confirmed` | GEO-Report bestätigt | GEO-Tester-Bestätigung |
| `geo_tester_report_sent` | GEO-Report versendet | GEO-Tester-Bestätigung |
| `broken_links_tester_cta_clicked` | Broken-Links-Tester-CTA geklickt | Broken-Links-Ergebnis |
| `broken_links_tester_lead_requested` | Broken-Links-Report angefragt | Broken-Links-Ergebnis |
| `broken_links_tester_lead_confirmed` | Broken-Links-Report bestätigt | Broken-Links-Bestätigung |
| `broken_links_tester_report_sent` | Broken-Links-Report versendet | Broken-Links-Bestätigung |
| `contact_cta_click` | Kontakt-CTA messen | Kontakt- und Angebotsseiten |
| `contact_form_view` | Formular sichtbar | Kontaktformular |
| `contact_form_start` | Formularinteraktion gestartet | Kontaktformular |
| `contact_form_step_view` | Wizard-Schritt angezeigt | Projektassistent |
| `contact_form_step_complete` | Wizard-Schritt abgeschlossen | Projektassistent |
| `project_type_selected` | Projektart gewählt | Kontaktformular |
| `package_interest_selected` | Paketinteresse gewählt | Kontaktformular |
| `budget_range_selected` | Budgetrahmen gewählt | Kontaktformular |
| `timeline_selected` | Zeitrahmen gewählt | Kontaktformular |
| `page_scope_selected` | Seitenumfang gewählt | Kontaktformular |
| `content_status_selected` | Textstatus gewählt | Kontaktformular |
| `optional_features_selected` | Zusatzfunktionen gewählt | Kontaktformular |
| `hosting_maintenance_selected` | Hosting/Wartung gewählt | Kontaktformular |
| `contact_form_validation_error` | Validierungsproblem erkannt | Kontaktformular |
| `contact_form_submit_attempt` | Absendeversuch | Kontaktformular |
| `contact_form_submit_success` | Erfolgreich verarbeitete Formularanfrage | Danke-Seite nach Server-Erfolg |
| `contact_form_submit_error` | Server- oder Spamfehler | Kontaktformular |
| `thank_you_view` | Danke-Seite erreicht | `/kontakt/thankyou` |
| `lead_received` | Lead serverseitig erfolgreich verarbeitet | `/kontakt/thankyou` |

## Erlaubte Parameter

Erlaubt sind nur kategoriale oder technische Parameter:

- `page_path`, `page_type`, `page_category`
- `cta_id`, `cta_label`, `cta_location`, `cta_target`, `link_url`
- `form_id`, `form_variant`, `step_id`, `field_name`, `selected_value`
- `package_id`, `project_type`, `budget_range`, `timeline`, `page_scope`, `content_status`
- `optional_features`, `feature_count`, `hosting_maintenance_interest`
- `error_type`
- `locale`, `mode`, `tester`, `cta_type`, `score_bucket`, `score_value`
- sichere UTM-Werte: `utm_source`, `utm_medium`, `utm_campaign`

Nicht erlaubt:

- Name, E-Mail, Telefon, Unternehmen, Website-URL, Nachricht/Freitext
- vollständige Query-Strings
- Passwörter, Zugangsdaten, Token
- Tester-URLs, Domains oder eingegebene Website-Adressen als Eventparameter

## Lead-Qualifizierung

Die interne Lead-Qualifizierung erfolgt serverseitig in `controllers/contactController.js` und wird nur in die Admin-E-Mail geschrieben.

Interne Felder:

- `likely_package`
- `lead_category`
- `lead_priority`
- `estimated_fit`
- `needs_followup`
- `special_features_detected`

Diese Werte werden nicht an Analytics gesendet.

## Danke-Seite und Conversion

Die Danke-Seite ist `noindex,nofollow`. Sie sendet `thank_you_view`, `contact_form_submit_success` und `lead_received` über `window.KWDTracking`, nachdem der Lead serverseitig verarbeitet wurde. Eine interne Lead-ID wird nur zur Session-Deduplizierung genutzt und nicht als Analytics-Parameter übergeben.

## UTM und Referrer

UTM-Werte werden in der Tracking-Schicht nur akzeptiert, wenn sie kurz und technisch unkritisch sind. Es wurde keine dauerhafte UTM-Speicherung eingebaut. Falls später eine persistente Attribution gewünscht ist, muss sie consent-kompatibel und ohne personenbezogene Daten geplant werden.

## Testhinweise

1. `/kontakt` öffnen.
2. Mit `?debug-tracking=1` öffnen, um Events in der Konsole zu sehen.
3. Schnellanfrage und ausführliche Anfrage starten.
4. Im Projektassistenten Auswahlfelder ändern.
5. Formular absenden und `/kontakt/thankyou` prüfen.
6. Ohne Analytics-Consent prüfen: `kwd:tracking` wird ausgelöst, externe Analytics nicht.
7. Mit Analytics-Consent prüfen: vorhandene Tools erhalten nur erlaubte Parameter.

## Folgeaufgaben

- Optionales serverseitiges Lead-Attributionsmodell prüfen.
- Auswertung in GA4, Matomo oder Plausible konkret konfigurieren, falls bewusst entschieden.
- Weitere Toolseiten wie Website-Tester, SEO-Tester und GEO-Tester mit derselben Event-Taxonomie verfeinern.
- Optional: Dashboard für Lead-Kategorien und Paketinteresse bauen.
