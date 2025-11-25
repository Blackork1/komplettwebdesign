# Chatbot-Embedding-Guide

Diese Anleitung fasst zusammen, wie du den kompletten Website-Inhalt (Pages, Branchen/Industries, Bezirke usw.) als Embeddings in der Datenbank ablegst und im Chat nutzt.

## Voraussetzungen
- **OpenAI API Key** in `.env` als `OPENAI_API_KEY` hinterlegen.
- Postgres mit `pgvector`-Extension (wird bereits für `embedding <#>`/`<=>` genutzt).
- Node 20+ und das Projekt installiert (`npm install`).

## 1) OpenAI-Embedding-Funktion für Industries fertigstellen
Der Industries-Embedding-Service ist noch mit einem Platzhalter versehen. Implementiere `computeEmbedding` in `scripts/embeddingsService.js` und nutze die vorhandene Utility `embedAsVector`:

```js
import { embedAsVector } from '../util/embeddings.js';

async function computeEmbedding(text) {
  return embedAsVector(text, 'text-embedding-3-small');
}
```

`computeEmbedding` wird sowohl beim Aufbau (`rebuildIndustryEmbeddings`) als auch bei der Suche (`searchIndustryEmbeddings`) genutzt und muss ein SQL-kompatibles Vektor-Literal wie `[0.12,0.34,...]` zurückgeben.【F:scripts/embeddingsService.js†L1-L83】【F:util/embeddings.js†L1-L9】

## 2) Pages & FAQs einlesen und einbetten
Für statische Seiten und FAQ-Einträge existieren bereits Helfer. Sie erwarten, dass Titel/Beschreibung in der `pages`-Tabelle und Fragen/Antworten in `faq_entries` liegen.

1. `.env` laden und das Script ausführen:
   ```bash
   node scripts/embedPages.js
   node scripts/embedFaqs.js
   ```
2. Beide Skripte laufen alle Datensätze mit fehlendem Embedding durch und schreiben das Ergebnis in die `embedding`-Spalte.【F:services/embeddingService.js†L1-L38】【F:scripts/embedPages.js†L1-L7】  
   Möchtest du mehr Seitentext berücksichtigen (z. B. lange Body- oder Meta-Inhalte), erweitere `embedAllPages` um die zusätzlichen Felder, bevor du den Text an OpenAI sendest.

## 3) Branchen-/Industrieinhalte vollständig einbetten
`rebuildIndustryEmbeddings(industry)` sammelt alle relevanten Textfelder einer Branche (Hero-Texte, Carousel, Vorteile, FAQ usw.) und legt pro Feld einen separaten Eintrag in `industry_embeddings` an.【F:scripts/embeddingsService.js†L9-L67】 
mit `node scripts/embedIndustries.js`

So nutzt du es:
1. Stelle sicher, dass `computeEmbedding` (Schritt 1) implementiert ist.
2. Rufe den Rebuilder auf, sobald du eine Branche speicherst oder importierst (Backend-Forms haben bereits das Flag `rebuild_embeddings`). Alternativ kannst du in einem Script die Branchen aus der DB laden und `rebuildIndustryEmbeddings` manuell aufrufen.
3. Bei der Chat-Suche kannst du `searchIndustryEmbeddings(query, topK)` verwenden, um die nächstliegenden Snippets zu holen und in das Prompt einzubetten.【F:scripts/embeddingsService.js†L69-L82】

## 4) Bezirks- und Webdesign-Branchen-Seiten abdecken
- **Bezirke (Webdesign Berlin)**: Die Inhalte liegen in `controllers/districtController.js` und den EJS-Templates unter `views/bereiche/` bzw. `views/districts/`. Lege pro Bezirk einen Datensatz in `pages` oder eine eigene Tabelle an und schreibe den sichtbaren Content (H1, Teaser, Prozessschritte, Angebote) in die Textspalten. Danach erneut `node scripts/embedPages.js` ausführen, damit der Chat darüber antworten kann.【F:controllers/districtController.js†L205-L340】
- **Weitere Branchen/Webdesign-Seiten**: Nutze dasselbe Vorgehen – Content in der DB ablegen (z. B. `pages` oder eine dedizierte Tabelle), dann über `embedAllPages` oder eine angepasste Variante einbetten. Falls du je Branche feinere Treffer brauchst, erweitere `rebuildIndustryEmbeddings` um zusätzliche Felder.

## 5) Qualitätssicherung & Betrieb
- Nach jedem Content-Update die passenden Embedding-Skripte erneut laufen lassen.
- Prüfe Stichproben mit einer Suche über `embedding <#> $vector` (Pages/FAQs) oder `embedding <=> $vector` (Industries), um zu verifizieren, dass neue Einträge erscheinen.
- Logik im Chat: Beim Retrieval zuerst Top-K Embeddings holen (`retrievePages`/`searchIndustryEmbeddings`), dann die Treffertexte im Prompt referenzieren.

## 6) Troubleshooting
- **Keine Embeddings in der DB**: Prüfe API-Key und ob `computeEmbedding` implementiert ist (siehe Schritt 1). Fehlende `pgvector`-Extension verhindert ebenfalls Inserts.
- **Industries liefern nichts**: Stelle sicher, dass `industry_embeddings` geleert und neu aufgebaut wurde (`rebuild_embeddings`-Checkbox in den Admin-Formularen setzen).【F:controllers/adminIndustriesController.js†L121-L168】【F:views/admin/industries_form.ejs†L136-L137】
- **Zu wenig Kontext im Chat**: Kombiniere mehrere Quellen (Pages + Industries + FAQs) im Prompt und erhöhe `topK` in den Retrieval-Funktionen nach Bedarf.【F:models/pageModel.js†L1-L15】【F:controllers/adminIndustriesController.js†L121-L168】


1. Was dein Script macht

Dein scripts/embedIndustries.js:

import 'dotenv/config';
import pool from '../util/db.js';
import { rebuildIndustryEmbeddings } from './embeddingsService.js';

async function run() {
  const { rows: industries } = await pool.query('SELECT * FROM industries');
  console.log(`➡️ ${industries.length} Branchen gefunden`);

  for (const industry of industries) {
    console.log(`🔁 Embeddings für Branche ${industry.id} / ${industry.slug || industry.name} ...`);
    await rebuildIndustryEmbeddings(industry);
  }

  console.log('✅ Alle Branchen-Embeddings aktualisiert');
}

run()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Fehler beim Einbetten der Branchen:', err);
    process.exit(1);
  });


Das heißt:

Es holt alle Zeilen aus industries.

Für jede Branche rufst du rebuildIndustryEmbeddings(industry) auf.

2. Was rebuildIndustryEmbeddings macht

Wichtige Zeile in rebuildIndustryEmbeddings:

// Delete + Insert neu
await pool.query(`DELETE FROM industry_embeddings WHERE industry_id = $1`, [industry.id]);

for (const s of sources) {
  const emb = await computeEmbedding(s.content);
  await pool.query(
    `INSERT INTO industry_embeddings (industry_id, source, content, embedding)
     VALUES ($1,$2,$3,$4)`,
    [industry.id, s.source, s.content, emb]
  );
}


Die Logik ist also:

Alle bisherigen Embeddings für diese Branche löschen:

DELETE FROM industry_embeddings WHERE industry_id = $1;


Für jeden Text-Schnipsel (source, content) einen neuen Datensatz einfügen.

👉 Das bedeutet:

Wenn du rebuildIndustryEmbeddings mehrfach für dieselbe industry.id aufrufst (egal ob über Admin-Häkchen oder über embedIndustries.js),

werden die alten Embeddings immer vollständig entfernt und

die neuen Embeddings frisch eingefügt.

Es gibt also keine Akkumulation / Verdopplung der Zeilen pro Branche – nur ein „Hard-Reset und neu aufbauen“.

3. Was passiert, wenn du beides machst…

… einmal über das Admin-Formular mit rebuild_embeddings === 'on'

… und zusätzlich ab und zu node scripts/embedIndustries.js ausführst?

Dann ist es einfach so:

Beim Speichern einer Branche im Admin:

werden nur die Embeddings dieser einen Branche neu geschrieben.

Beim globalen Script:

werden alle Branchen-Embeddings einmal komplett neu geschrieben.

Technisch ist das absolut okay – du überschreibst ja jedes Mal.
Der einzige „Nachteil“: zusätzliche API-Kosten und etwas Laufzeit, weil Embeddings neu berechnet werden.

4. Wann kann es doch „doppelt“ wirken?

Das Einzige, was passieren könnte:

Du änderst irgendwann deinen Code und entfernst das DELETE FROM industry_embeddings oder

du legst zusätzlich woanders noch Einträge in industry_embeddings an.

Solange diese Zeile bleibt:

await pool.query(`DELETE FROM industry_embeddings WHERE industry_id = $1`, [industry.id]);


bist du safe – pro Branche hast du immer nur die aktuelle Version der Embeddings in der Tabelle.

5. Empfehlung, wie du es einsetzt

Einmal initial nach dem Setup:

node scripts/embedIndustries.js


Danach:

bei größeren JSON-Imports von Branchen: wieder embedIndustries.js laufen lassen oder beim Import den rebuild_embeddings-Flag (wie vorhanden) setzen,

bei kleinen Änderungen an einer Branche im Admin: Checkbox „Embeddings neu aufbauen“ aktivieren → rechnet nur diese Branche neu.

So hältst du die Kosten niedrig und alles bleibt konsistent.

Wenn du willst, können wir im nächsten Schritt kurz ein SQL-Statement bauen, mit dem du prüfen kannst, wie viele Embedding-Zeilen du pro Branche hast (z. B. COUNT(*) GROUP BY industry_id), um zu sehen, ob alles so aussieht, wie du erwartest.