# Automatisierte Blogartikel: Content-und-Lead-Agent – Designspezifikation

**Datum:** 10. Juli 2026  
**Projekt:** Komplett Webdesign  
**Status:** Fachlich und technisch abgestimmt  
**Ziel:** Wöchentlich einen hochwertigen, kundenorientierten und SEO-starken Blogartikel als prüfbaren Entwurf erzeugen, später ausgewählte risikoarme Artikel automatisch veröffentlichen und bestehende Artikel systematisch prüfen.

## 1. Ausgangssituation

Die Website verwendet Node.js 20, Express 5, EJS, PostgreSQL 16 mit pgvector, Cloudinary, Bootstrap 5, `node-cron` und das OpenAI-JavaScript-SDK. Die produktive Umgebung läuft über Docker Compose mit einem öffentlichen App-Container hinter Traefik und einem internen PostgreSQL-Container.

Die vorhandene Blogfunktion besteht aus:

- `models/BlogPostModel.js` für PostgreSQL-Zugriffe,
- `controllers/adminBlogController.js` für das Anlegen und Bearbeiten,
- `controllers/blogController.js` für öffentliche Blogseiten,
- `routes/adminBlogRoutes.js` und `routes/blogRoutes.js`,
- `views/admin/newPost.ejs`, `views/admin/editPost.ejs` und `views/admin/blogList.ejs`,
- `views/blog/show.ejs` und `views/blog/index.ejs`,
- Cloudinary für Titelbilder,
- einer dynamischen Sitemap für veröffentlichte Beiträge.

Zum Zeitpunkt der Bestandsaufnahme enthält die Tabelle `posts` 34 veröffentlichte Artikel und keinen unveröffentlichten Artikel. Neue Beiträge werden durch das vorhandene Modell standardmäßig veröffentlicht. Die öffentliche Detailansicht rendert die H1 bereits im EJS-Template. Datenbankinhalte werden derzeit teilweise als EJS ausgewertet; enthaltene H1-Elemente werden beim Rendern zu H2 herabgestuft.

Die bestehenden 446 automatisierten Tests laufen erfolgreich und bilden die unveränderte Ausgangsbasis.

## 2. Ziele

Das System soll:

1. wöchentlich ein relevantes Thema mit erkennbarem Kundennutzen auswählen,
2. bestehende Inhalte und Suchintentionen berücksichtigen,
3. Keyword-Kannibalisierung vermeiden,
4. ein strukturiertes SEO-Briefing erzeugen,
5. einen vollständigen deutschen Artikel im Du-Ton schreiben,
6. gültiges, statisches und Bootstrap-kompatibles HTML erzeugen,
7. Titel, Kurzbeschreibung, Meta-Daten, Slug, FAQ und Bilddaten bereitstellen,
8. drei kontextbezogene CTA-Elemente integrieren,
9. ein passendes Beitragsbild erzeugen und zu Cloudinary hochladen,
10. technische, redaktionelle und faktenbezogene Prüfungen ausführen,
11. den Beitrag zunächst ausschließlich als Entwurf speichern,
12. eine übersichtliche Adminprüfung ermöglichen,
13. später risikoarme Beiträge nach expliziter Freischaltung automatisch veröffentlichen,
14. Search-Console-Daten für Themenwahl und Optimierungen verwenden,
15. die 34 bestehenden Artikel prüfen, ohne sie automatisch zu verändern.

Das Geschäftsziel ist nicht eine möglichst hohe Artikelzahl. Jeder neue Artikel muss ein konkretes Problem potenzieller Kunden lösen und logisch zu Webdesign, Website-Relaunch, Local SEO, Website-Audit, Website-Optimierung, einem Website-Paket oder einer Kontaktanfrage führen.

## 3. Nicht-Ziele des ersten Ausbaus

Der erste Ausbau enthält ausdrücklich nicht:

- automatisches Veröffentlichen ab dem ersten Artikel,
- eine vollständige No-Code-Orchestrierung mit n8n oder Make,
- massenhaft erzeugte lokale Bezirksseiten,
- automatische Änderungen bestehender Slugs,
- automatische Umschreibung veröffentlichter Bestandsartikel,
- ein neues externes Analytics-System,
- einen parallelen Ersatz des vorhandenen Blog-CMS,
- einen komplexen Multi-Agent-SDK-Aufbau.

Die Orchestrierung bleibt zunächst expliziter Node.js-Code. Die OpenAI Responses API liefert strukturierte Ergebnisse, aber die Anwendung kontrolliert Stufen, Zustände, Prüfungen und Freigaben selbst.

## 4. Zielarchitektur

### 4.1 Webprozess

Der vorhandene `app`-Dienst bleibt verantwortlich für:

- die öffentliche Website,
- öffentliche Bloglisten und Blogdetails,
- den Adminbereich,
- das Anzeigen und Bearbeiten von Entwürfen,
- das Anlegen manueller Content-Jobs,
- Freigaben, Planungen und Veröffentlichungen.

Der Webprozess führt keine langen OpenAI-, Recherche-, Bild- oder Audit-Aufrufe innerhalb eines HTTP-Requests aus.

### 4.2 Content-Worker

Docker Compose erhält einen internen Dienst `content-worker`. Er verwendet dasselbe App-Image und dieselbe `.env`, startet aber:

```text
npm run start:content-worker
```

Der Worker:

- besitzt keinen öffentlichen Port,
- erhält keine Traefik-Labels,
- ist nur mit dem internen Standardnetz verbunden,
- greift intern auf PostgreSQL zu,
- nutzt OpenAI und Cloudinary über ausgehende Verbindungen,
- startet den Wochenplan,
- verarbeitet manuell angelegte Jobs,
- aktualisiert einen Worker-Heartbeat,
- nutzt PostgreSQL-Sperren gegen doppelte Läufe,
- beendet beim Herunterfahren die Annahme neuer Jobs kontrolliert.

### 4.3 Datenfluss

```text
Zeitplan oder Adminaktion
  → content_jobs
  → Content-Worker reserviert Job
  → Website-Inventar
  → Themenkandidaten
  → Themen-Scoring
  → SEO-Briefing
  → Artikelgenerierung
  → deterministische Validierung
  → redaktionelles Review
  → höchstens zwei Reparaturläufe
  → Bildgenerierung
  → Cloudinary-Upload
  → unveröffentlichter Blogentwurf
  → Adminprüfung
  → Veröffentlichung oder Planung
```

Jede Stufe speichert ihren Status. Ein Neustart muss nicht den gesamten Lauf von vorn beginnen.

## 5. Docker- und Betriebsmodell

### 5.1 Gemeinsames Image

`app` und `content-worker` verwenden dasselbe gebaute Image. Dadurch existiert nur eine Code- und Abhängigkeitsversion. Der Worker überschreibt lediglich den Containerbefehl.

### 5.2 PostgreSQL-Healthcheck

Der PostgreSQL-Dienst erhält einen Healthcheck mit `pg_isready`. `app` und `content-worker` verwenden `depends_on` mit `condition: service_healthy`.

### 5.3 Grundkonfiguration

Der erste produktive Betrieb verwendet:

```text
CONTENT_AGENT_ENABLED=true
CONTENT_AGENT_PUBLISH_MODE=draft
CONTENT_AGENT_SCHEDULE=0 9 * * 1
CONTENT_AGENT_TIMEZONE=Europe/Berlin
CONTENT_AGENT_MAX_TOPIC_CANDIDATES=8
CONTENT_AGENT_MAX_REVISIONS=2
CONTENT_AGENT_MAX_ATTEMPTS=3
CONTENT_AGENT_AUTOPUBLISH_ENABLED=false
OPENAI_CONTENT_MODEL=gpt-5.4
OPENAI_REVIEW_MODEL=gpt-5.4-mini
OPENAI_IMAGE_MODEL=gpt-image-2
```

Die Modellnamen sind konfigurierbar und werden nicht in Geschäftslogik oder Promptmodulen verteilt.

### 5.4 Migration

Migrationen laufen nicht automatisch konkurrierend in beiden Containern. Das Projekt erhält einen eindeutigen Migrationsbefehl. Auf dem Server wird er nach einem PostgreSQL-Backup einmalig ausgeführt, bevor `app` und `content-worker` mit der neuen Version gestartet werden.

### 5.5 Search-Console-Credential

Die erste Version funktioniert ohne Search-Console-API. Für die spätere Anbindung wird ein Google-Service-Account mit ausschließlich lesendem Zugriff verwendet. Die JSON-Datei wird als Docker Secret unter `/run/secrets/` eingebunden, nicht als JSON-Text in `.env` abgelegt und nicht in Git gespeichert.

## 6. Datenmodell

### 6.1 Erweiterung von `posts`

Die vorhandene Tabelle bleibt erhalten und erhält additive Spalten:

| Spalte | Zweck |
|---|---|
| `meta_title` | vom sichtbaren Titel abweichender SEO-Titel |
| `meta_description` | explizite Meta Description; Fallback auf bestehendes `description` |
| `og_title` | Open-Graph-Titel |
| `og_description` | Open-Graph-Beschreibung |
| `image_alt` | Alternativtext des Titelbilds |
| `workflow_status` | redaktioneller Status |
| `content_format` | `legacy_ejs` oder `static_html` |
| `generated_by_ai` | Kennzeichnung KI-gestützter Entwürfe |
| `scheduled_at` | geplanter Veröffentlichungstermin |
| `published_at` | tatsächlicher Veröffentlichungstermin |
| `reviewed_at` | Zeitpunkt der menschlichen Prüfung |
| `reviewed_by` | prüfender Benutzer |

Bestehende Artikel werden wie folgt zurückgefüllt:

```text
workflow_status = published
content_format = legacy_ejs
generated_by_ai = false
meta_description = description, wenn meta_description leer ist
published_at = created_at, wenn published = true und published_at leer ist
```

Neue KI-Artikel erhalten:

```text
published = false
workflow_status = draft
content_format = static_html
generated_by_ai = true
```

`published` bleibt aus Kompatibilitätsgründen die öffentliche Wahrheitsquelle. Die Anwendung erzwingt folgende Invariante:

```text
published = true  → workflow_status = published
workflow_status ≠ published → published = false
```

### 6.2 `content_jobs`

Die Jobtabelle enthält:

- `id`,
- `job_type`,
- `status`,
- `payload_json`,
- `run_after`,
- `attempts`,
- `max_attempts`,
- `locked_at`,
- `locked_by`,
- `last_error`,
- `created_at`,
- `updated_at`,
- `finished_at`.

Zulässige Jobtypen im ersten Ausbau:

```text
generate_weekly_draft
generate_manual_draft
audit_existing_posts
regenerate_article
regenerate_metadata
regenerate_faq
regenerate_image
publish_scheduled_posts
```

Zulässige Statuswerte:

```text
queued
running
completed
failed
needs_manual_attention
cancelled
```

### 6.3 `content_runs`

Jeder Verarbeitungsversuch enthält:

- `job_id`,
- `status`,
- `current_stage`,
- `selected_topic_id`,
- `post_id`,
- `started_at`,
- `finished_at`,
- `token_usage_json`,
- `cost_estimate`,
- `openai_response_ids_json`,
- `error_report_json`,
- `stage_results_json`.

Zulässige Stufen:

```text
inventory
topic_research
topic_scoring
seo_brief
article_generation
validation
review
repair
image_generation
cloudinary_upload
draft_creation
completed
```

### 6.4 `content_topics`

Die Thementabelle enthält:

- Thema und vorgeschlagenen Titel,
- Haupt- und Nebenkeywords,
- Content-Cluster,
- Suchintention,
- Zielgruppe,
- Quelle des Vorschlags,
- Geschäftsnutzen,
- Suchpotenzial,
- Problem- und Kaufnähe,
- Potenzial für interne Links,
- lokale Relevanz,
- Kannibalisierungsrisiko,
- Gesamtscore,
- Status und Nutzungszeitpunkt.

### 6.5 `content_post_metadata`

Interne Agentendaten werden nicht in der öffentlichen Blogansicht gerendert. Die Tabelle enthält:

- `post_id`,
- `primary_keyword`,
- `secondary_keywords`,
- `search_intent`,
- `target_audience`,
- `region_focus`,
- `content_cluster`,
- `business_goal`,
- `cta_type`,
- `internal_links_json`,
- `source_references_json`,
- `seo_brief_json`,
- `quality_score`,
- `quality_report_json`,
- `generation_metadata_json`.

### 6.6 `content_audits`

Auditberichte enthalten:

- `post_id`,
- `run_id`,
- `audit_type`,
- `score`,
- `findings_json`,
- `recommended_actions_json`,
- `resolution_status`,
- `created_at`,
- `resolved_at`.

Audits verändern den Artikel nicht.

### 6.7 `content_agent_settings`

Eine Singleton-Konfiguration enthält die veränderbaren Adminwerte:

- `schedule_enabled`,
- `auto_publish_enabled`,
- `auto_publish_min_score` mit Standardwert 90,
- `manual_approvals_count`,
- `updated_by`,
- `updated_at`.

Die Datenbankeinstellung darf die sicherheitsrelevanten Umgebungsvariablen nicht überstimmen. Auto-Publishing ist nur aktiv, wenn Umgebungsvariable und Datenbankeinstellung gleichzeitig aktiv sind.

### 6.8 `content_worker_state`

Der Worker aktualisiert einen kleinen Zustandsdatensatz mit:

- `worker_name`,
- `worker_id`,
- `heartbeat_at`,
- `started_at`,
- `last_job_at`,
- `version`.

Dashboard und Container-Healthcheck verwenden diesen Datensatz, ohne einen öffentlichen Worker-Port einzuführen.

### 6.9 `content_search_metrics`

Nach der Search-Console-Anbindung speichert die Anwendung normalisierte Messwerte:

- `post_id`,
- `metric_date`,
- `page_url`,
- `query`,
- `device`,
- `clicks`,
- `impressions`,
- `ctr`,
- `average_position`,
- `fetched_at`.

Die Tabelle enthält nur Search-Performance-Daten und keine personenbezogenen Such- oder Kontaktdaten.

### 6.10 Slug-Weiterleitungen

Eine kleine Weiterleitungstabelle speichert alte und neue Blogslugs. Wird ein veröffentlichter Slug nach menschlicher Freigabe geändert, entsteht gleichzeitig eine permanente 301-Weiterleitung. Ohne Weiterleitung darf ein veröffentlichter Slug nicht geändert werden.

## 7. Artikelvertrag

Die Writer-Stufe liefert ein strukturiertes Objekt mit:

```text
title
shortDescription
metaTitle
metaDescription
slug
ogTitle
ogDescription
contentHtml
faqJson
category
imagePrompt
imageAlt
imageFilename
seo
lead
sourceReferences
qualitySelfCheck
```

Die Anwendung prüft dieses Objekt gegen ein festes Schema. Die Modellantwort wird nicht direkt gespeichert, bevor diese Prüfung erfolgreich war.

### 7.1 Titel und Meta-Daten

- Der Titel enthält das Hauptkeyword natürlich und ist nicht clickbaitig.
- Der Meta Title soll üblicherweise 50 bis 60 Zeichen lang sein.
- Die Meta Description darf höchstens 160 Zeichen enthalten.
- Der Slug verwendet Kleinbuchstaben, ASCII, Zahlen und Bindestriche.
- Umlaute erscheinen korrekt im sichtbaren Text, aber nicht im Slug.
- OG-Felder werden als Daten gespeichert; das EJS-Template erzeugt den Meta-Block.

### 7.2 Artikel-HTML

`contentHtml` ist ein statisches Fragment und enthält:

- keine H1,
- keinen äußeren `.container`,
- keine `<html>`, `<head>` oder `<body>`-Tags,
- keine Bilder,
- keine Skripte,
- kein EJS,
- keine Inline-Styles,
- keine Breadcrumbs,
- keine unbekannten Platzhalter.

Der Artikel startet mit einer Einleitung und verwendet H2- und H3-Strukturen. Typischerweise enthält er konkrete Beispiele, Checklisten, Vergleiche, eine Schrittfolge, drei CTA-Elemente und einen sichtbaren FAQ-Bereich.

### 7.3 Bootstrap

Erlaubte Strukturklassen umfassen unter anderem:

```text
row
col-lg-12
my-4
my-5
mb-3
mb-4
mb-5
mt-4
p-4
rounded
bg-light
border
alert
alert-primary
table-responsive
table
table-striped
list-group
list-group-item
btn
btn-primary
btn-secondary
lead
```

Der dedicated Article-Sanitizer nutzt eine Tag-, Attribut- und Klassen-Allowlist. Die bestehende globale `sanitizeHtml`-Funktion wird nicht unkontrolliert umgebaut; für Artikel wird ein eigener Validator auf Basis eines etablierten serverseitigen HTML-Sanitizers verwendet.

### 7.4 CTA-Regeln

Jeder Artikel enthält:

1. einen frühen CTA nach der Einleitung,
2. einen mittleren CTA nach einem zentralen Erkenntnisabschnitt,
3. einen abschließenden CTA.

Der primäre Zielpfad ist `/kontakt`. `/pakete`, `/website-tester` oder eine passende Leistungsseite darf ergänzend verwendet werden, wenn das Briefing dies freigibt.

Die CTAs verwenden vorhandene Trackingattribute:

```text
data-track="cta"
data-cta-name="blog_early_contact"
data-cta-location="blog_early"
```

Analog gelten `blog_mid_contact` und `blog_final_contact`.

### 7.5 FAQ

- Jeder neue Artikel enthält fünf bis sieben sichtbare Fragen.
- Dasselbe Fragen-Antwort-Paar erscheint im separaten FAQ-Array.
- HTML und JSON werden deterministisch auf Gleichheit geprüft.
- Die FAQ dient primär Lesern und Einwandbehandlung, nicht einem versprochenen Rich Result.

## 8. Website-Inventar und Geschäftskontext

Der Agent verwendet bei jedem Lauf aktuelle Projektdaten:

- veröffentlichte Blogartikel,
- Ratgeber,
- Leistungsseiten,
- Branchen- und Berlin-Seiten,
- aktive Pakete und Preise,
- freigegebene interne Links,
- bestehende Keywords und Content-Cluster.

Aktuelle Preise und Leistungsumfänge stammen aus dem zentralen Pricing-Service beziehungsweise aus PostgreSQL. Preisangaben werden nicht als langfristig gültiger Freitext in Promptmodulen gepflegt. Vorhandene Pricing-Tokens bleiben nutzbar.

Der statische Markenkontext enthält nur stabile Vorgaben:

- Komplett Webdesign aus Berlin,
- kleine Unternehmen, Selbstständige und lokale Betriebe,
- professioneller deutscher Du-Ton,
- korrekte Umlaute,
- verständliche Sprache,
- keine Rankinggarantien,
- keine unbelegten Erfolgswerte,
- keine Floskeln wie „In der heutigen digitalen Welt“ oder „maßgeschneiderte Lösungen für deinen Erfolg“.

## 9. Themenrecherche

### 9.1 Quellen im ersten Ausbau

- freigegebene Seed-Liste,
- manuell eingegebene Themen,
- Lücken zwischen Angeboten und vorhandenen Artikeln,
- Fragen und Probleme definierter Zielgruppen,
- bestehende Content-Cluster,
- Bestandsaudit.

### 9.2 Quellen nach Search-Console-Anbindung

- Suchanfragen mit Impressionen und wenigen Klicks,
- Seiten mit niedriger CTR,
- Positionen 8 bis 30,
- Suchanfragen ohne passende Zielseite,
- bestehende Artikel mit Aktualisierungspotenzial.

Die Search Console wird über `webmasters.readonly` eingebunden. Abfragen speichern mindestens Seite, Suchanfrage, Klicks, Impressionen, CTR, Position, Zeitraum und Gerät, soweit für die jeweilige Auswertung erforderlich.

### 9.3 Aktuelle Themen

Zeitkritische Themen dürfen die Websuche der Responses API verwenden. Gefundene Quellen werden mit URL, Titel, Herausgeber, Veröffentlichungsdatum und Abrufdatum gespeichert. Bevorzugt werden Primärquellen und offizielle Dokumentationen.

Aktuelle Themen ohne ausreichende Quellen werden nicht geschrieben. Die technische Grundlage orientiert sich an der offiziellen [OpenAI-Dokumentation zur Websuche](https://developers.openai.com/api/docs/guides/tools-web-search).

## 10. Themen-Scoring

Jedes Thema erhält Werte von 0 bis 10. Der Basisscore lautet:

```text
30 % Geschäftsnutzen
25 % Suchpotenzial
15 % Problem- und Kaufnähe
10 % Potenzial für interne Links
10 % Passung zum Content-Cluster
10 % lokale Relevanz
```

Anschließend wird eine Kannibalisierungsstrafe von bis zu 20 Prozentpunkten angewendet.

Ein Thema wird nur verwendet, wenn:

```text
Geschäftsnutzen >= 7
Gesamtscore >= 7
Kannibalisierungsrisiko <= 4
klare Suchintention vorhanden
passendes Angebots- oder Kontaktziel vorhanden
konkreter Lesernutzen vorhanden
```

### 10.1 Kannibalisierungsprüfung

Die erste Prüfung ist deterministisch:

- normalisierter Titel,
- Slug,
- Hauptkeyword,
- Suchintention,
- Content-Cluster,
- eng verwandte vorhandene Artikel.

Eine zweite Modellprüfung bewertet semantische Überschneidungen. Bei hoher Überschneidung entsteht kein neuer Artikel, sondern ein Aktualisierungsvorschlag für den bestehenden Beitrag.

## 11. SEO-Briefing

Das Briefing enthält:

- Thema und Arbeitstitel,
- Hauptkeyword,
- Nebenkeywords,
- Suchintention,
- Zielgruppe,
- Leserproblem,
- Content-Cluster,
- Geschäftsziel,
- CTA-Typ,
- empfohlene Wortlänge,
- Gliederung,
- konkrete lokale Beispiele,
- freigegebene interne Links,
- FAQ-Fragen,
- Quellenanforderungen,
- Bildidee.

Die übliche Länge liegt zwischen 1.800 und 2.500 Wörtern. Das Briefing darf einen anderen Bereich festlegen, wenn die Suchintention dies rechtfertigt. Es gibt keine künstliche Textverlängerung.

## 12. Promptarchitektur

Die bisherige große Bloganleitung wird in versionierte Module aufgeteilt:

```text
brand-policy
topic-research
topic-scoring
seo-brief
article-writer
article-reviewer
article-repair
image-prompt
legacy-audit
```

Jedes Modul hat eine einzige Verantwortung. Promptversion, Modell und Ergebnis werden pro Lauf protokolliert. Der Writer darf keine neuen internen Links, Leistungen, Preise oder Quellen erfinden, die nicht im Briefing enthalten sind.

Strukturierte Ergebnisse werden über die Responses API und validierte Schemata erzeugt. Die Umsetzung orientiert sich an der offiziellen [OpenAI-Dokumentation zu Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs).

## 13. Quellenregeln

Externe aktuelle Primärquellen sind verpflichtend bei:

- Google- und SEO-Updates,
- KI-Modellen und API-Funktionen,
- Datenschutz und Recht,
- Barrierefreiheit,
- aktuellen Preisen oder Marktwerten,
- Softwareversionen,
- Jahreszahlen und technischen Standards.

Diese Themen bleiben auch bei späterem Auto-Publishing manuell freigabepflichtig.

Evergreen-Artikel dürfen ohne sichtbare externe Quellen entstehen, wenn sie keine zeitkritischen Tatsachen behaupten. Ein Quellenabschnitt wird nur aus validierten `sourceReferences` erzeugt.

## 14. Qualitätsprüfung

### 14.1 Deterministische Prüfung

Die Anwendung prüft:

- vollständiges Artikelschema,
- eindeutigen Slug,
- Meta-Längen,
- genau null H1 im Artikelinhalt,
- gültige H2-/H3-Struktur,
- erlaubte Tags, Attribute und Klassen,
- Abwesenheit von Skripten, Bildern, EJS und Inline-Styles,
- drei CTA-Positionen,
- fünf bis sieben FAQ,
- Übereinstimmung von FAQ-HTML und FAQ-JSON,
- Existenz interner Links,
- Freigabe externer Links,
- korrekte deutsche Umlaute,
- Mindeststruktur aus Einleitung, Hauptteil, Handlungsschritten und Abschluss,
- fehlende oder unbekannte Platzhalter.

### 14.2 Redaktionelles Review

Ein separater Reviewer bewertet:

- Erfüllung der Suchintention,
- fachlichen Mehrwert,
- Zielgruppenbezug,
- Konkretheit,
- Quellenabdeckung,
- natürliche Sprache,
- lokale Relevanz,
- Entscheidungsnutzen,
- logische CTA-Führung,
- Risiko erfundener Aussagen,
- Risiko generischer oder skalierter Inhalte.

### 14.3 Reparatur und Schwellenwerte

- Höchstens zwei gezielte Reparaturläufe.
- Score unter 80: `needs_manual_attention`, kein veröffentlichungsfähiger Blogentwurf.
- Score 80 bis 89: Entwurf mit manueller Prüfung.
- Score ab 90: technisch für ein späteres Auto-Publishing geeignet, sofern keine Ausschlussregel greift.

Die Qualitätsausrichtung folgt Googles Empfehlung, hilfreiche, originelle und für Menschen geschriebene Inhalte zu erstellen. Automatisierung ohne zusätzlichen Nutzen wird ausdrücklich vermieden. Siehe [Google Search: Generative KI-Inhalte](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content).

## 15. Bildpipeline

Das Bild wird erst nach bestandener Inhaltsprüfung erzeugt.

Regeln:

- professionelles, markenkonformes Beitragsbild,
- Querformat für Blog-Hero und Social Preview,
- keine eingebetteten Texte,
- keine Logos oder Markenbehauptungen,
- SEO-freundlicher ASCII-Dateiname,
- beschreibender deutscher Alt-Text,
- genau eine erfolgreiche Bildgenerierung pro Entwurf,
- erneute Generierung nur durch einen neuen Bildjob.

Die Bild-API liefert Bilddaten. Der Worker lädt diese zu Cloudinary hoch und speichert `image_url`, `hero_public_id` und `image_alt`. Die Umsetzung orientiert sich an der offiziellen [OpenAI-Dokumentation zur Bildgenerierung](https://developers.openai.com/api/docs/guides/image-generation).

Schlägt die Bildstufe fehl, bleiben Briefing, Artikel und Prüfbericht im Lauf gespeichert. Nur die Bildstufe wird erneut ausgeführt.

## 16. Adminbereich

### 16.1 Dashboard

Neue Hauptseite:

```text
/admin/content-agent
```

Sie zeigt:

- nächsten geplanten Lauf,
- Queue und laufende Jobs,
- fehlgeschlagene Jobs,
- letzte Agentenläufe,
- neue Entwürfe,
- Themenkandidaten,
- Auditfortschritt,
- Qualitätswarnungen,
- Tokenverbrauch und Kostenschätzung,
- Veröffentlichungsmodus.

Aktionen legen ausschließlich Datenbankjobs an:

```text
Jetzt Entwurf erzeugen
Eigenes Thema vorgeben
Themenvorschlag ablehnen
Bestandsartikel prüfen
Fehlgeschlagenen Job wiederholen
```

### 16.2 Review-Seite

```text
/admin/content-agent/posts/:id/review
```

Die Seite zeigt:

- gerenderte Vorschau,
- Titel und Kurzbeschreibung,
- Meta-Daten mit Zeichenzählern,
- Slug,
- Keywords und Suchintention,
- Zielgruppe und Geschäftsziel,
- interne Links,
- CTA-Positionen,
- FAQ-HTML und FAQ-JSON,
- Quellen,
- Bild und Alt-Text,
- Qualitätswert,
- Warnungen und Empfehlungen.

Aktionen:

```text
Veröffentlichen
Veröffentlichung planen
Kompletten Artikel überarbeiten lassen
Meta-Daten überarbeiten
FAQ überarbeiten
Bild neu generieren
Zurückweisen
```

### 16.3 Zustandsmodell

```text
draft
  → needs_review
  → approved
  → scheduled
  → published
```

Alternative Übergänge:

```text
needs_review → rejected
needs_review → revision_requested → needs_review
```

KI-Änderungen an einem veröffentlichten Artikel erzeugen eine unveröffentlichte Revision. Die veröffentlichte Version wird erst nach Freigabe ersetzt.

## 17. Auto-Publishing

Der erste Ausbau veröffentlicht niemals automatisch.

Nach mindestens acht erfolgreich manuell geprüften KI-Artikeln darf der Betreiber Auto-Publishing bewusst aktivieren. Zwei Freigaben sind gleichzeitig erforderlich:

```text
CONTENT_AGENT_AUTOPUBLISH_ENABLED=true
+
Admineinstellung Auto-Publishing aktiv
```

Ein Artikel darf nur automatisch veröffentlicht werden, wenn:

- der Qualitätswert mindestens 90 beträgt,
- keine Quellenwarnung vorliegt,
- keine Kannibalisierungswarnung vorliegt,
- Bild, Alt-Text und interne Links gültig sind,
- keine rechtlichen oder datenschutzbezogenen Aussagen enthalten sind,
- es sich nicht um ein aktuelles Google-, SEO-, KI- oder Softwarethema handelt,
- keine statischen Preise außerhalb der zentralen Preislogik enthalten sind,
- alle deterministischen Prüfungen bestanden wurden.

Ein Umgebungsvariablen-Schalter bleibt als technischer Not-Aus bestehen.

## 18. Audit der vorhandenen Artikel

Alle 34 Bestandsartikel werden einzeln geprüft auf:

- Suchintention,
- Kundennähe,
- veraltete Jahreszahlen und Technologien,
- fehlende oder unpassende CTA,
- fehlende interne Links,
- doppelte oder unnötige H1,
- schwache Meta-Daten,
- ungewöhnliche Slugs,
- doppelte Themen,
- Kannibalisierung,
- fehlende FAQ,
- unbelegte Aussagen,
- fehlende Bild-Alt-Texte,
- zu technische Inhalte ohne Angebotsbezug.

Das Ergebnis ist eine priorisierte Liste:

```text
kritisch
hoch
mittel
niedrig
keine Maßnahme
```

Das Audit verändert weder Inhalt noch Slug noch Veröffentlichungsstatus. Jede Umsetzung benötigt eine separate Adminfreigabe.

## 19. Erfolgsmessung

### 19.1 Erster Ausbau

- Anzahl erzeugter und veröffentlichter Entwürfe,
- Qualitätswerte,
- Fehlerquote,
- API-Verbrauch,
- Themencluster,
- spätere Search-Console-Impressionen,
- Klicks,
- CTR,
- durchschnittliche Position,
- relevante Suchanfragen.

### 19.2 CTA-Tracking

Die vorhandene Tracking-Schicht ergänzt den Seitenpfad und verarbeitet die CTA-Attribute consent-kompatibel. Es entsteht im ersten Ausbau kein neuer ungeprüfter Trackingdienst und keine persistente Erfassung personenbezogener Daten.

### 19.3 Abgeleitete Optimierungsjobs

Nach ausreichender Datengrundlage entstehen:

```text
viele Impressionen, niedrige CTR → Meta-Daten prüfen
Position 8 bis 20 → Inhalt und interne Links prüfen
Klicks, aber schwache CTA-Nutzung → CTA und Angebotsbezug prüfen
starkes Thema → verwandtes, nicht kannibalisierendes Thema vorschlagen
```

## 20. Fehlerbehandlung

### 20.1 Wiederholungen

Temporäre OpenAI-, Cloudinary-, Search-Console- und Datenbankfehler werden höchstens dreimal mit zunehmender Wartezeit wiederholt.

Schema-, HTML- und Qualitätsfehler lösen keine identische Wiederholung aus. Sie werden über eine gezielte Reparaturstufe behandelt.

### 20.2 Sperren und Wiederaufnahme

- Der Scheduler nutzt eine PostgreSQL-Advisory-Lock für den wöchentlichen Lauf.
- Jobreservierungen besitzen eine zeitlich begrenzte Lease.
- Abgelaufene Leases werden wieder in die Queue gestellt.
- Ein erfolgreich abgeschlossener Job wird niemals erneut ausgeführt.
- `SIGTERM` stoppt die Annahme neuer Jobs und hinterlässt einen wiederaufnehmbaren Zustand.

### 20.3 Ausfallverhalten

- Keine Search Console: Website-Inventar und Seed-Themen verwenden.
- Keine belastbare Webquelle: kein zeitkritischer Artikel.
- Bildfehler: nur Bildstufe erneut ausführen.
- Qualität nach zwei Reparaturen unter 80: manuelle Aufmerksamkeit.
- Kein vollständig bestandener Entwurf: keine Veröffentlichung.

## 21. Kostenkontrolle

Voreinstellungen:

- ein geplanter neuer Artikel pro Woche,
- höchstens acht Themenkandidaten,
- höchstens zwei Reparaturläufe,
- eine erfolgreiche Bildgenerierung,
- drei technische Versuche pro temporärem Fehler,
- maximale Laufzeit pro Job,
- konfigurierbares monatliches Kostenlimit.

Der Worker prüft das Monatslimit vor jeder kostenpflichtigen Stufe. Ist es erreicht, erhält der Job `needs_manual_attention`.

## 22. Protokollierung und Datenschutz

Gespeichert werden:

- Job- und Lauf-ID,
- Stufe und Status,
- Zeitpunkte,
- Versuchszahl,
- Tokenverbrauch,
- Kostenschätzung,
- OpenAI-Response-IDs,
- bereinigte Fehlerklasse und Fehlermeldung,
- Thema, Briefing, Qualitätsbericht und Ergebnis.

Nicht gespeichert werden:

- API-Schlüssel,
- Google-Credentials,
- Cloudinary-Secrets,
- vollständige Umgebungsvariablen,
- unnötige personenbezogene Daten.

Kompakte strukturierte Logs erscheinen zusätzlich in `docker compose logs content-worker`.

## 23. Tests

Das Projekt verwendet weiterhin `node:test`.

### 23.1 Unit-Tests

- Themen-Scoring,
- Kannibalisierung,
- Schemas,
- Slug-Erzeugung,
- Meta-Längen,
- HTML-Allowlist,
- Bootstrap-Klassen,
- CTA- und FAQ-Prüfung,
- Zustandsübergänge,
- Kostenlimit.

### 23.2 Integrationstests

- Jobreservierung und Lease,
- Wiederaufnahme nach Fehlern,
- Entwurfsanlage,
- Veröffentlichung und Planung,
- Auto-Publishing-Sperren,
- Auditberichte,
- Search-Console-Normalisierung,
- OpenAI- und Cloudinary-Adapter mit Test-Doubles,
- Blogcontroller mit `legacy_ejs` und `static_html`,
- 301-Weiterleitung nach freigegebener Slugänderung.

### 23.3 Dry-Run

Ein Dry-Run-Modus verwendet feste Fixtures und führt keine kostenpflichtigen OpenAI-, Google- oder Cloudinary-Aufrufe aus. Er durchläuft Job, Briefing, Validierung, Review, Bildmetadaten und Entwurfsanlage auf einer Testdatenbank.

### 23.4 Freigabeprüfungen

```text
npm test
npm run build
Content-Agent-Dry-Run
Migration auf Testdatenbank
manueller Admin-Smoke-Test
```

## 24. Deployment-Anleitung

Der Implementierungsplan enthält eine kopierbare Anleitung für die Server-`docker-compose.yml` und folgende Reihenfolge:

1. PostgreSQL-Backup mit dem vorhandenen Backupablauf erstellen.
2. Servercode aktualisieren.
3. gemeinsames App-Image bauen.
4. PostgreSQL-Healthcheck ergänzen.
5. `content-worker` ohne Port, Traefik und Upload-Mount ergänzen.
6. neue Umgebungsvariablen eintragen.
7. Migration einmalig ausführen.
8. `app` und `content-worker` starten.
9. `docker compose ps` und Workerlogs prüfen.
10. Dry-Run ausführen.
11. einen manuellen Entwurf erzeugen.
12. erst nach erfolgreicher Prüfung den Wochenplan aktiv lassen.
13. Search-Console-Credential später als Docker Secret ergänzen.

## 25. Umsetzungsinkremente

Die Implementierung wird in vier eigenständig nutzbare und testbare Pläne zerlegt:

### Inkrement A: Fundament und Entwurfspipeline

- additive Datenbankmigration,
- gemeinsames OpenAI- und Cloudinary-Adaptermodell,
- Jobqueue, Worker, Sperren und Heartbeat,
- Website-Inventar, Themenwahl und SEO-Briefing,
- strukturierte Artikelgenerierung,
- HTML-, FAQ-, CTA- und Meta-Validierung,
- Bildgenerierung und unveröffentlichter Entwurf,
- Dry-Run und Docker-Compose-Anleitung.

### Inkrement B: Adminprüfung und Bestandsaudit

- Content-Agent-Dashboard,
- Entwurfsreview,
- gezielte Regenerierungsjobs,
- Planen und manuelles Veröffentlichen,
- Audit der 34 Bestandsartikel,
- Slugänderungen nur mit 301-Weiterleitung.

### Inkrement C: Search Console und Optimierung

- Google-Service-Account und Docker Secret,
- lesende Search-Analytics-Abfragen,
- normalisierte Metriken,
- chancenbasierte Themenbewertung,
- Aktualisierungs-, Meta- und interne-Link-Vorschläge.

### Inkrement D: Kontrolliertes Auto-Publishing

- doppelter Freigabeschalter,
- Mindestzahl menschlicher Freigaben,
- Ausschlussregeln für Risikothemen,
- Qualitätsgrenze 90,
- Not-Aus, Protokollierung und Rückfalltest.

## 26. Rückfall und Abschaltung

Der Content-Agent lässt sich ohne Eingriff in den Webprozess abschalten:

```text
CONTENT_AGENT_ENABLED=false
docker compose stop content-worker
```

Alle Migrationen des ersten Ausbaus sind additiv. Die vorhandene Website, öffentliche Blogartikel, Adminbearbeitung und Sitemap funktionieren ohne laufenden Worker weiter. Bestehende Spalten und Inhalte werden nicht entfernt.

## 27. Abnahmekriterien

Das erste produktive Inkrement ist abgenommen, wenn:

1. `app` und `content-worker` getrennt laufen,
2. der Worker keinen öffentlichen Port besitzt,
3. ein manueller Job über den Adminbereich angelegt wird,
4. genau ein Worker den Job reserviert,
5. ein strukturierter Artikel mit gültigem HTML entsteht,
6. Meta-Daten, Slug, FAQ, CTA und interne Links validiert werden,
7. ein Bild zu Cloudinary hochgeladen wird,
8. der Beitrag mit `published = false` gespeichert wird,
9. die Review-Seite alle relevanten Daten und Warnungen zeigt,
10. nur eine Adminaktion veröffentlichen kann,
11. ein fehlgeschlagener Job nachvollziehbar wiederholt werden kann,
12. der Bestandsaudit Berichte erzeugt, aber keine Artikel verändert,
13. alle bestehenden und neuen Tests bestehen,
14. der Worker über die Umgebungsvariable vollständig deaktivierbar ist,
15. die Serveranleitung einen reproduzierbaren Start und Rückfall ermöglicht.
