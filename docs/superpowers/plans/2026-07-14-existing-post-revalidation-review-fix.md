# Sichere Revalidierung bestehender Beitragsrevisionen – Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zurückgesetzte oder manuell bearbeitete KI-Revisionen werden erst nach einer asynchronen, kosten- und providergefenceten Neuprüfung wieder freigabefähig; alte Reviews können niemals als aktuelle Freigabe dienen.

**Architecture:** Jede Mutation speichert atomar einen kanonischen Snapshot-Fingerprint, die neue Revisionsversion und `revalidation.status = 'pending'` und reiht genau einen idempotenten Job ein. Der Worker lädt ausschließlich den gesperrten Revisions-, Audit- und Ursprungslaufkontext, nutzt die bestehende bezahlte Review-Stage mit Resume-, Budget- und Provider-Fencing und persistiert `passed` oder `failed` nur bei unverändertem Version-/Fingerprint-Fence. Eine zentrale Freigabepolicy wird von Service und Darstellung gemeinsam verwendet.

**Tech Stack:** Node.js, PostgreSQL, Express, EJS, Zod, `node:test`, bestehende Content-Agent-Job-, Lease-, Cost-, Run- und Provider-Primitiven.

## Global Constraints

- Für alle deutschen Texte gelten korrekte deutsche Grammatik sowie die Zeichen ä, ö, ü und ß.
- Job-Payloads sind `additionalProperties`-frei; IDs sind PostgreSQL-`INT32`, Fingerprints sind kleingeschriebene SHA-256-Werte.
- Es gibt keinen synchronen Provideraufruf und keine automatische Reparatur während der Revalidierung.
- Provider-, Budget-, Qualitäts- und Fence-Fehler enden fail-closed als `failed` und verlangen eine manuelle Entscheidung.
- Ein Resume darf weder eine bezahlte Providerantwort doppelt erzeugen noch Budget doppelt verbuchen.
- Feedback enthält ausschließlich feste Event-, Feld- und Taxonomietexte; Gründe, Auszüge, Prompts, Providerdaten und PII sind verboten.
- Freigabe verlangt ein aktuelles, an Version und Fingerprint gebundenes Review ohne blockierende Auditbefunde oder neue Risiken und mit Score `>= max(80, originalScore)`.

---

## Dateistruktur

- `services/contentAgent/revisionSnapshotFingerprint.js`: kanonische Serialisierung und SHA-256-Fingerprint.
- `services/contentAgent/existingPostRevisionApprovalPolicy.js`: einzige Freigabeentscheidung für Service und UI.
- `services/contentAgent/existingPostRevisionRevalidationService.js`: Worker-Orchestrierung für technische Prüfung, Editorial Review und fenced Abschluss.
- `repositories/contentExistingPostOptimizationRepository.js`: atomare Mutation/Job-Erzeugung, gesperrter Worker-Kontext und fenced Abschluss.
- `services/contentAgent/contentRevisionService.js`: Freigabeguard und PostgreSQL-`INT32`-Grenzen.
- `repositories/contentRevisionRepository.js`: exakte Auditbindung für Annahme und Ablehnung.
- `scripts/contentWorker.js`: strikter neuer Jobtyp sowie Wiederverwendung des Ursprungslauf-Snapshots.
- `services/contentAgent/adminPresentationService.js`: UI-Zustand aus derselben Freigabepolicy.
- `views/admin/contentAgent/revisionEdit.ejs` und `views/admin/contentAgent/revisionCompare.ejs`: keine irreführende Freigabe und sichtbare Ablehnungsbestätigung.
- `tests/contentExistingPostRevisionRevalidation.test.js`: reine Policy- und Worker-Tests.
- Bestehende Service-, Repository-, Worker-, Controller-, View- und PostgreSQL-Integrationstests werden gezielt erweitert.

### Task 1: Fingerprint und zentrale Freigabepolicy

**Files:**
- Create: `services/contentAgent/revisionSnapshotFingerprint.js`
- Create: `services/contentAgent/existingPostRevisionApprovalPolicy.js`
- Create: `tests/contentExistingPostRevisionRevalidation.test.js`
- Modify: `services/contentAgent/adminPresentationService.js`
- Modify: `tests/contentAgentAdminViews.test.js`

**Interfaces:**
- Produces: `snapshotFingerprint(snapshot): string`, `isSnapshotFingerprint(value): boolean`.
- Produces: `evaluateExistingPostRevisionApproval({ revision, snapshotFingerprint }): { allowed, reasonCode, reasonLabel }`.
- Consumes: `revision.snapshot_json`, `revision.version`, `revision.status`, `revision.optimization_report_json`.

- [ ] **Step 1: Rote Tests für kanonische Fingerprints und alle Freigabefences schreiben**

  Prüfe gleiche Fingerprints bei anderer Objektschlüsselreihenfolge sowie Ablehnung bei `pending`, `failed`, falscher Version, falschem Fingerprint, altem Review, Score unter `max(80, beforeScore)`, blockierenden Risiken und ungelösten Auditcodes. Prüfe nur den vollständig gebundenen `passed`-Fall als erlaubt.

- [ ] **Step 2: Rotlauf ausführen**

  Run: `node --test tests/contentExistingPostRevisionRevalidation.test.js tests/contentAgentAdminViews.test.js`

  Expected: FAIL, weil Fingerprintmodul und zentrale Policy noch fehlen.

- [ ] **Step 3: Minimale reine Implementierung ergänzen**

  Der Fingerprint verwendet rekursive stabile Objektschlüssel und `sha256`. Die Policy prüft exakt Status, aktuelle Version, aktuellen Fingerprint, das neue `revalidation.review`, Mindestscore, manuelle Prüfung, alle Risikoflags, blockierende Issues sowie `unresolvedAuditCodes.length === 0`.

- [ ] **Step 4: Darstellung auf die Policy umstellen und Tests grün ausführen**

  Run: `node --test tests/contentExistingPostRevisionRevalidation.test.js tests/contentAgentAdminViews.test.js`

  Expected: PASS; alte `report.review`-Daten aktivieren niemals die Freigabe.

### Task 2: Mutation setzt pending und reiht idempotent einen Job ein

**Files:**
- Modify: `repositories/contentExistingPostOptimizationRepository.js`
- Modify: `services/contentAgent/contentRevisionService.js`
- Modify: `tests/contentExistingPostOptimizationRepository.test.js`
- Modify: `tests/contentRevisionService.test.js`

**Interfaces:**
- Produces: Mutationen mit `optimization_report_json.revalidation = { status: 'pending', revisionVersion, snapshotFingerprint }`.
- Produces: Jobtyp `revalidate_existing_post_revision` mit Payload `{ source: 'revision_revalidation', revision_id, revision_version, snapshot_fingerprint }` und festem Idempotency-Key pro Fence.
- Consumes: technische und Scope-Prüfung vor dem Speichern, aber kein Editorial Review.

- [ ] **Step 1: Rote Tests für pending, Version/Fingerprint und genau einen Job schreiben**

  Prüfe Revert und manuelle Bearbeitung, wiederholte idempotente Einreihung, keine lokale `passed`-Markierung, keine Wiederverwendung des alten Scores sowie PostgreSQL-`INT32` für Update- und Publish-IDs.

- [ ] **Step 2: Rotlauf ausführen**

  Run: `node --test tests/contentExistingPostOptimizationRepository.test.js tests/contentRevisionService.test.js`

  Expected: FAIL bei lokaler `passed`-Markierung und fehlendem Revalidierungsjob.

- [ ] **Step 3: Atomare Transaktion implementieren**

  Nach technischer/Scope-Prüfung wird der finale Snapshot fingerprinted, die neue Revisionsversion in `pending` gebunden und der Job in derselben Transaktion mit festem Payload und Idempotency-Key eingefügt. Ein bestehender Key wird nur akzeptiert, wenn Jobtyp und vollständiger Payload exakt übereinstimmen.

- [ ] **Step 4: Servicegrenzen auf PostgreSQL-`INT32` beschränken und Tests grün ausführen**

  Run: `node --test tests/contentExistingPostOptimizationRepository.test.js tests/contentRevisionService.test.js`

  Expected: PASS; Mutation und Job sind atomar und ein Fence erzeugt höchstens einen Job.

### Task 3: Exakte Auditbindung, private Feedbacktaxonomy und eindeutige Zuordnung

**Files:**
- Modify: `repositories/contentRevisionRepository.js`
- Modify: `repositories/contentExistingPostOptimizationRepository.js`
- Modify: `tests/contentExistingPostOptimizationRepository.test.js`
- Modify: `tests/contentRevisionService.test.js`
- Modify: `tests/contentAgentPostgresIntegration.test.js`

**Interfaces:**
- Consumes: exakt gesperrte Audit-ID, `post_id`, `job_id`, `status = 'revision_created'` und tatsächliche `findings_json`.
- Produces: feste Feld-/Findingcode-zu-Taxonomie-Abbildung ohne Freitext.
- Produces: eindeutige Änderungsidentität aus Feld plus HTML-`path`/`blockType` oder normalisierter FAQ-Frage.

- [ ] **Step 1: Rote Race-, Audit-Swap-, Privacy- und Duplikatentests schreiben**

  Prüfe, dass Annahme nur genau ein Audit mit allen Predikaten auflöst, Ablehnung keines auflöst, ein Audit-Swap scheitert und Feedback keine Gründe/Auszüge/Prompts/Providerdaten enthält. Prüfe doppelte HTML-Blöcke und FAQ-Fragen als `unclassified` ohne Lernbeobachtung.

- [ ] **Step 2: Rotlauf ausführen**

  Run: `node --test tests/contentExistingPostOptimizationRepository.test.js tests/contentRevisionService.test.js`

  Expected: FAIL bei zu weiter Auditabfrage, Freitextklassifikation und mehrdeutiger Zuordnung.

- [ ] **Step 3: Audit-Fences und feste Taxonomie implementieren**

  Lock und Update verwenden dieselben Auditprädikate und verlangen exakt eine Zeile. Feedbackkategorie entsteht nur aus allowgelisteten Codes des gesperrten Audits; Texte stammen aus festen Feldlabels und Taxonomieeinträgen. Mehrdeutige manuelle Abweichungen erzeugen ausschließlich ein `unclassified`-Ereignis und keine Lernbeobachtung.

- [ ] **Step 4: Unit- und PostgreSQL-Race-Tests grün ausführen**

  Run: `node --test tests/contentExistingPostOptimizationRepository.test.js tests/contentRevisionService.test.js tests/contentAgentPostgresIntegration.test.js`

  Expected: PASS; Audit- und Versionsraces sind fail-closed und Feedback ist allowlist-basiert.

### Task 4: Strikter Revalidierungsjob im Worker

**Files:**
- Modify: `scripts/contentWorker.js`
- Modify: `tests/contentAgentWorker.test.js`

**Interfaces:**
- Consumes: Payload `{ source: 'revision_revalidation', revision_id: INT32, revision_version: INT32, snapshot_fingerprint: lowercase SHA-256 }` ohne Zusatzfelder.
- Produces: Handlerzweig mit erforderlicher Lease, Ursprungslauf-Runtime-Snapshot und `createExistingPostRevisionRevalidationDependencies`.

- [ ] **Step 1: Rote Payload-, Lease- und Runtime-Snapshot-Tests schreiben**

  Prüfe fehlende/zusätzliche Felder, `INT32`-Überlauf, Großbuchstaben/ungültige SHA-Werte, verlorene Lease und die Übernahme des gebundenen Ursprungslauf-Snapshots statt einer aktuellen Konfiguration.

- [ ] **Step 2: Rotlauf ausführen**

  Run: `node --test tests/contentAgentWorker.test.js`

  Expected: FAIL, weil der neue Jobtyp unbekannt ist.

- [ ] **Step 3: Jobtyp, Validator und Handlerzweig implementieren**

  Der Handler lädt vor der Run-Erzeugung den fenced Kontext aus dem Repository, kopiert dessen Runtime-Snapshot in den neuen Run, validiert die erforderlichen Link-/Trusted-Context-Bindungen und startet den neuen Service nur mit aktiver Lease.

- [ ] **Step 4: Worker-Tests grün ausführen**

  Run: `node --test tests/contentAgentWorker.test.js`

  Expected: PASS; fremde oder nicht exakt gebundene Payloads erreichen den Runner nicht.

### Task 5: Editorial Revalidation mit Paid-Stage-Resume und fenced Persistenz

**Files:**
- Create: `services/contentAgent/existingPostRevisionRevalidationService.js`
- Modify: `repositories/contentExistingPostOptimizationRepository.js`
- Modify: `services/contentAgent/contentRevisionService.js`
- Modify: `tests/contentExistingPostRevisionRevalidation.test.js`
- Modify: `tests/contentExistingPostOptimizationRepository.test.js`

**Interfaces:**
- Consumes: `loadRevisionRevalidationContext({ revisionId, revisionVersion, snapshotFingerprint })` mit gesperrtem Post, Revision, Audit, Ursprungslauf-Snapshot, technischen Regeln, validierten Quellen und Learning-Snapshot.
- Consumes: bestehendes `executePaidStructuredTextStage` mit Stage-ID `revision_editorial_review` und Fence `${revisionId}:${revisionVersion}:${snapshotFingerprint}`.
- Produces: `completeRevisionRevalidation(...)` oder `failRevisionRevalidation(...)`, jeweils nur bei unverändertem `pending`-Fence.

- [ ] **Step 1: Rote Worker-Tests schreiben**

  Prüfe technische und Scopefehler ohne Provideraufruf, Budgetablehnung, Providerfehler, Qualitätsfehler, verlorene Lease, Versions-/Fingerprintänderung, validierte begrenzte Quellen, unveränderten Original-Learning-/Runtime-Snapshot und einen wiederverwendeten Provider-Stage-Result ohne zweiten Aufruf.

- [ ] **Step 2: Rotlauf ausführen**

  Run: `node --test tests/contentExistingPostRevisionRevalidation.test.js tests/contentExistingPostOptimizationRepository.test.js`

  Expected: FAIL, weil Runner und fenced Repositorymethoden fehlen.

- [ ] **Step 3: Gesperrten Kontext und fenced Abschluss implementieren**

  Der Kontext wird in kanonischer Sperrreihenfolge aus Revision, Beitrag, exakt gebundenem Audit, Ursprungslauf und Ursprungsreport geladen. Quellen werden durch das bestehende Zod-Schema begrenzt und validiert. `passed` speichert Review, Score, Mindestscore, Auditcodes und leere ungelöste Codes an denselben Fence; jeder Fehler speichert nur einen festen Fehlercode als `failed`.

- [ ] **Step 4: Runner auf bestehende Paid-Stage-Primitiven setzen**

  Der Runner führt bestehende technische/Scopevalidierung aus, ruft anschließend genau einmal `openaiService.reviewArticle` über `executePaidStructuredTextStage` auf, verwendet Reviewer-Learning-Regeln des Ursprungssnapshots und führt keine Repair-Stage aus.

- [ ] **Step 5: Resume-, Budget-, Lease- und Race-Tests grün ausführen**

  Run: `node --test tests/contentExistingPostRevisionRevalidation.test.js tests/contentExistingPostOptimizationRepository.test.js`

  Expected: PASS; Resume verwendet die persistierte Providerantwort und Abschlussraces überschreiben keinen neueren Entwurf.

### Task 6: Freigabe, Editor und echte Ablehnungsbestätigung

**Files:**
- Modify: `services/contentAgent/contentRevisionService.js`
- Modify: `services/contentAgent/adminPresentationService.js`
- Modify: `views/admin/contentAgent/revisionEdit.ejs`
- Modify: `views/admin/contentAgent/revisionCompare.ejs`
- Modify: `tests/contentRevisionService.test.js`
- Modify: `tests/contentAgentAdminViews.test.js`
- Modify: passende View-Renderingtests unter `tests/`.

**Interfaces:**
- Consumes: zentrale `evaluateExistingPostRevisionApproval`-Entscheidung.
- Produces: identische `approvalEnabled`-/`approvalBlockedReason`-Semantik in Vergleich, Editor und serverseitiger Freigabe.

- [ ] **Step 1: Rote Service-, Controller- und Viewtests schreiben**

  Prüfe, dass der Editor bei Optimierungsrevisionen nur den Vergleich verlinkt beziehungsweise die Freigabe deaktiviert, der Serverguard unabhängig von der UI bestehen bleibt und das Ablehnungsformular eine sichtbare erforderliche Checkbox statt `confirmed=true` besitzt.

- [ ] **Step 2: Rotlauf ausführen**

  Run: `node --test tests/contentRevisionService.test.js tests/contentAgentAdminViews.test.js`

  Expected: FAIL bei abweichender Editorentscheidung und versteckter Ablehnungsbestätigung.

- [ ] **Step 3: Gemeinsame Policy einbinden und Views härten**

  Service und Darstellung verwenden dieselbe reine Policy. Der Editor bietet für KI-Optimierungsrevisionen keine direkte Freigabe, sondern einen Vergleichslink mit Grund. Das Ablehnungsformular zeigt eine erforderliche Checkbox und enthält kein Inline-JavaScript.

- [ ] **Step 4: UI- und Guardtests grün ausführen**

  Run: `node --test tests/contentRevisionService.test.js tests/contentAgentAdminViews.test.js`

  Expected: PASS; UI und Server können keinen unterschiedlichen Freigabestatus anzeigen.

### Task 7: Vollständige Verifikation, PostgreSQL und Bericht

**Files:**
- Modify: `.superpowers/sdd/existing-post-task-11-report.md`
- Modify: alle in den vorherigen Tasks berührten Tests nur bei tatsächlich gefundenen Integrationsabweichungen.

**Interfaces:**
- Produces: Berichtsnachtrag mit Architektur, RED/GREEN-Belegen, Datenschutzgrenze, Race-Ergebnissen und vollständigen Befehlen.

- [ ] **Step 1: Fokussierte Suiten ausführen**

  Run: `node --test tests/contentExistingPostRevisionRevalidation.test.js tests/contentExistingPostOptimizationRepository.test.js tests/contentRevisionService.test.js tests/contentRevisionRepository.test.js tests/contentAgentAdminViews.test.js tests/contentAgentWorker.test.js tests/contentAgentJobRepository.test.js`

  Expected: PASS ohne übersprungene relevante Tests.

- [ ] **Step 2: Reale PostgreSQL-Integration ausführen**

  Run: `node --test tests/contentAgentPostgresIntegration.test.js`

  Expected: PASS einschließlich Audit-Swap-, Versions-/Fingerprint-Race- und Job-Idempotenzfällen.

- [ ] **Step 3: Build und vollständige Testsuite ausführen**

  Run: `npm run build`

  Expected: Exit 0.

  Run: `npm test`

  Expected: Exit 0.

- [ ] **Step 4: Bericht mit überprüften Ergebnissen ergänzen**

  Dokumentiere den zweiphasigen Ablauf, die neue zentrale Policy, die feste Feedbacktaxonomy, Provider-Resume, Lease/Budget-Fencing, PostgreSQL-Races sowie die tatsächlich ausgeführten Befehle und Resultate.

- [ ] **Step 5: Selbstprüfung und separater Fix-Commit**

  Run: `git diff --check && git status --short && git diff --stat HEAD`

  Expected: keine Whitespacefehler; ausschließlich der Review-Fix und der Berichtsnachtrag sind enthalten.

  Commit: `fix: revalidiere geänderte KI-Revisionen asynchron`
