# Jahresaktuelle Risikoberichte – Implementierungsplan

Die Umsetzung erfolgt in dieser Aufgabe schrittweise und testgetrieben. Die Kontrollkästchen dokumentieren den abgeschlossenen Stand.

**Goal:** Jahresaktuelle Artikel zulassen, veraltete doppelte Risikoblocker entfernen und bestehende Entwürfe ohne OpenAI-Kosten neu bewerten.

**Architecture:** Der fokussierte Risikobericht erhält eine eindeutige Risikoquelle: Ein vollständiger Abschluss-Review überstimmt ältere Artikel-Roh-Risiken, während Validatorfehler und explizite Blocker bestehen bleiben. Vorschau und Veröffentlichung leiten denselben versionierten Bericht deterministisch neu ab; veraltete gespeicherte Berichte werden ohne Modellaufruf aktualisiert.

**Tech Stack:** Node.js, Express, EJS, PostgreSQL, Cheerio, Node-Test-Runner

## Global Constraints

- Jahreszahlen in Titel, Meta-Daten und redaktioneller Einordnung sind erlaubt.
- Konkrete aktuelle Veränderungsbehauptungen bleiben quellenpflichtig.
- Kein OpenAI-Aufruf zur Reparatur eines veralteten Risikoberichts.
- Rechtliche, Datenschutz-, Softwareversions- und Preisrisiken bleiben streng blockierend.
- Alle deutschen Texte verwenden korrekte Umlaute und deutsche Grammatik.

---

### Task 1: Maßgebliche Risikoquelle definieren

**Files:**
- Modify: `services/contentAgent/riskReportService.js`
- Test: `tests/contentAgentRiskReport.test.js`

**Interfaces:**
- Consumes: `buildFocusedRiskReport({ article, review, validation, sources })`
- Produces: `focused-risk-v2` mit Review-Priorität bei vollständigem Risikoblock

- [x] **Step 1: Failing Test für den doppelten Jahresblocker schreiben**

```js
test('vollständiger Abschluss-Review überstimmt ältere Artikel-Roh-Risiken', () => {
  const report = buildFocusedRiskReport({
    article: {
      contentHtml: '<h2>Einordnung 2026</h2><p><a href="https://example.test/source">Quelle</a></p>',
      risk: { currentClaims: true }
    },
    review: {
      risks: {
        currentClaims: false,
        legalClaims: false,
        privacyClaims: false,
        softwareVersionClaims: false,
        staticPrices: false
      },
      issues: [{
        code: 'current-year-claim_requires_source_context',
        blocking: false,
        autoPublishBlocking: false,
        sourceRequired: true,
        verificationType: 'source'
      }]
    },
    validation: { issues: [] },
    sources: [{ title: 'Quelle', url: 'https://example.test/source' }]
  });
  assert.equal(report.blocked, false);
  assert.deepEqual(report.riskFlags, []);
});
```

- [x] **Step 2: Test ausführen und erwartetes Rot verifizieren**

Run: `node --test tests/contentAgentRiskReport.test.js`

Expected: FAIL, weil `risk_current_claims` weiterhin aus `article.risk` erzeugt wird.

- [x] **Step 3: Vollständigen Review-Risikoblock erkennen und priorisieren**

Implementiere eine interne Prüfung auf exakt fünf boolesche Risikofelder. Verwende bei vollständigem Review nur `review.risks`; andernfalls weiterhin `article.risk`.

- [x] **Step 4: Sicherheitsfälle ergänzen**

Tests müssen belegen:

- unvollständiger Review fällt auf Artikelrisiko zurück;
- blockierendes Review-Issue bleibt blockierend;
- Rechts-, Datenschutz-, Versions- und Preisrisiken bleiben blockierend.

- [x] **Step 5: Berichtsversion erhöhen**

Ändere `RISK_REPORT_VERSION` von `focused-risk-v1` auf `focused-risk-v2`.

- [x] **Step 6: Tests grün ausführen**

Run: `node --test tests/contentAgentRiskReport.test.js tests/contentAgentRuleManifest.test.js`

Expected: PASS.

### Task 2: Vorschau kostenfrei mit aktuellem Bericht aufbauen

**Files:**
- Modify: `services/contentAgent/adminDraftService.js`
- Test: `tests/contentAgentAdminDraftService.test.js`

**Interfaces:**
- Consumes: gespeicherter Artikel, `quality_report_json`, Quellen und Validatorergebnis
- Produces: Vorschau mit aktuell abgeleitetem `riskReview`

- [x] **Step 1: Failing Preview-Test schreiben**

Der Test übergibt einen alten blockierenden `focusedReview`, einen vollständigen bereinigten Abschluss-Review und einen Artikel mit älterem `currentClaims=true`. Erwartet wird `riskReview.blocked === false` und kein `risk_current_claims`.

- [x] **Step 2: Test rot ausführen**

Run: `node --test tests/contentAgentAdminDraftService.test.js`

Expected: FAIL, weil aktuell der persistierte Bericht unverändert angezeigt wird.

- [x] **Step 3: Aktuellen Bericht deterministisch ableiten**

Erweitere `getDraftForReview`, sodass bei einem schema-validen Abschluss-Review Artikel, Validatorergebnis und gespeicherte Quellen an `buildFocusedRiskReport` übergeben werden. Es darf kein Provider- oder OpenAI-Service aufgerufen werden.

- [x] **Step 4: Vorschautest grün ausführen**

Run: `node --test tests/contentAgentAdminDraftService.test.js`

Expected: PASS.

### Task 3: Veralteten Bericht im Freigabepfad atomar aktualisieren

**Files:**
- Modify: `services/contentAgent/contentPublicationService.js`
- Modify: `repositories/contentPublishEventRepository.js`
- Test: `tests/contentPublicationService.test.js`
- Test: `tests/contentManualApprovalCounter.test.js`
- Test: `tests/contentAgentPostgresIntegration.test.js`

**Interfaces:**
- Consumes: neu abgeleiteten `focusedReview`
- Produces: aktualisiertes `quality_report_json.focusedReview` unter derselben Postsperre

- [x] **Step 1: Failing Test für einen alten gespeicherten Bericht schreiben**

Der Test simuliert einen `focused-risk-v1`-Blocker, während die aktuelle Ableitung nicht blockiert. Erwartet wird, dass die Freigabe nicht mit `risk_review_inconsistent` abbricht, sondern das Repository genau einmal zur Aktualisierung aufruft.

- [x] **Step 2: Test rot ausführen**

Run: `node --test tests/contentPublicationService.test.js`

Expected: FAIL mit `CONTENT_DRAFT_VALIDATION_FAILED`.

- [x] **Step 3: Sichere Repository-Aktualisierung implementieren**

Aktualisiere ausschließlich `quality_report_json.focusedReview`, während der Beitrag bereits per `FOR UPDATE` gesperrt ist. Verändere weder Artikelinhalt noch Reviewscore, Reviewissues, Veröffentlichungsversion oder Zeitplanung.

- [x] **Step 4: Veröffentlichung verwendet den aktualisierten Bericht**

Der Freigabepfad gibt den aktuell abgeleiteten Bericht an die Auto-Publish- und Veröffentlichungsprüfung weiter.

- [x] **Step 5: Unit- und PostgreSQL-Tests grün ausführen**

Run:

```bash
node --test tests/contentPublicationService.test.js
CONTENT_AGENT_PG_TEST_URL='postgresql://blocksdorf@127.0.0.1/kwd_content_agent_integration_test' \
CONTENT_AGENT_PG_TEST_ALLOW_RESET=true \
CONTENT_AGENT_PG_TEST_TOKEN='KWDCONTENTAGENT_TEST_RESET_V1' \
node --test tests/contentAgentPostgresIntegration.test.js
```

Expected: PASS.

### Task 4: Anzeige und Regression absichern

**Files:**
- Modify: `views/admin/contentAgent/_riskChecklist.ejs` nur falls eine klarere Jahres-Hinweisformulierung nötig ist
- Test: `tests/contentAgentAdminViews.test.js`
- Test: `tests/contentAutoPublishPolicy.test.js`

**Interfaces:**
- Consumes: `focusedReview.blocked`, `items`, `riskFlags`
- Produces: „Hinweise vorhanden“ für nicht blockierende Jahres- und Quellenhinweise

- [x] **Step 1: Ansichtstest ergänzen**

Ein Bericht mit ausschließlich nicht blockierenden Quellenhinweisen muss „Hinweise vorhanden“ ausgeben und darf weder „Veröffentlichung blockiert“ noch „Blockierend“ anzeigen.

- [x] **Step 2: Auto-Publish-Sicherheit prüfen**

Ein echter `currentClaims=true`-Review sowie explizit blockierende Issues müssen weiterhin `risk_review_required` auslösen.

- [x] **Step 3: Gezielte Tests ausführen**

Run:

```bash
node --test \
  tests/contentAgentRiskReport.test.js \
  tests/contentAgentAdminDraftService.test.js \
  tests/contentManualApprovalCounter.test.js \
  tests/contentPublicationService.test.js \
  tests/contentAgentAdminViews.test.js \
  tests/contentAutoPublishPolicy.test.js
```

Expected: PASS.

### Task 5: Vollständige Verifikation

**Files:**
- Verify all modified files

**Interfaces:**
- Produces: deploybarer Commit ohne Migration oder Konfigurationsänderung, sofern keine neue Spalte erforderlich ist

- [x] **Step 1: Diff prüfen**

Run: `git diff --check`

Expected: keine Ausgabe.

- [x] **Step 2: Vollständige Tests ausführen**

Run: `OPENAI_API_KEY='test-key-not-used' npm test`

Expected: 0 Fehler.

- [x] **Step 3: Build ausführen**

Run: `npm run build`

Expected: Exit-Code 0.

- [x] **Step 4: Commit erstellen**

```bash
git add services repositories views tests docs
git commit -m "fix: refresh yearly content risk reports"
```
