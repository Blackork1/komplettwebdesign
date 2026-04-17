import test from 'node:test';
import assert from 'node:assert/strict';
import { __testables } from '../services/metaAuditService.js';

test('ensureUrl normalizes any input to homepage root URL', () => {
  const normalized = __testables.ensureUrl('example.com/service?page=1#intro', 'de');
  assert.equal(normalized, 'https://example.com/');
});

test('evaluateTextIntentFit scores matching industry/service/region text as good', () => {
  const fit = __testables.evaluateTextIntentFit({
    title: 'Zahnarztpraxis Berlin | Implantate und Prophylaxe',
    description: 'Zahnarztpraxis in Berlin für Implantate, Prophylaxe und ästhetische Zahnmedizin.',
    h1: 'Zahnarztpraxis Berlin mit Fokus auf Implantate',
    context: {
      businessType: 'Zahnarztpraxis',
      primaryService: 'Implantate',
      targetRegion: 'Berlin'
    }
  });

  assert.equal(fit.status, 'good');
  assert.ok(fit.score >= 58);
});

test('parseHeadSignals validates key head tags and context fit', () => {
  const html = `
    <!doctype html>
    <html lang="de">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Zahnarztpraxis Berlin | Implantate und Prophylaxe schnell</title>
      <meta name="description" content="Zahnarztpraxis in Berlin für Implantate und Prophylaxe mit klaren Terminen, transparenten Abläufen und persönlicher Beratung für Patientinnen und Patienten.">
      <link rel="canonical" href="https://example.com/">
      <meta name="robots" content="index,follow">
      <meta property="og:type" content="website">
      <meta property="og:title" content="Zahnarztpraxis Berlin | Implantate und Prophylaxe schnell">
      <meta property="og:description" content="Zahnarztpraxis in Berlin für Implantate und Prophylaxe mit persönlicher Beratung.">
      <meta property="og:image" content="https://example.com/og.jpg">
      <meta property="og:url" content="https://example.com/">
      <meta name="twitter:card" content="summary_large_image">
      <meta name="twitter:title" content="Zahnarztpraxis Berlin | Implantate und Prophylaxe schnell">
      <meta name="twitter:description" content="Zahnarztpraxis in Berlin für Implantate und Prophylaxe.">
      <meta name="twitter:image" content="https://example.com/og.jpg">
      <link rel="icon" href="/favicon.ico">
      <link rel="apple-touch-icon" href="/apple-touch-icon.png">
      <link rel="manifest" href="/site.webmanifest">
      <script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization"}</script>
    </head>
    <body>
      <header></header>
      <main>
        <h1>Zahnarztpraxis Berlin für Implantate und Prophylaxe</h1>
        <p>Jetzt Termin buchen und Beratung starten.</p>
      </main>
      <footer></footer>
    </body>
    </html>
  `;

  const parsed = __testables.parseHeadSignals({
    html,
    url: 'https://example.com/',
    locale: 'de',
    context: {
      businessType: 'Zahnarztpraxis',
      primaryService: 'Implantate',
      targetRegion: 'Berlin'
    }
  });

  assert.equal(parsed.url, 'https://example.com/');
  assert.ok(parsed.score >= 70);
  assert.ok(Array.isArray(parsed.checks));
  assert.equal(parsed.checks.some((check) => check.id === 'open_graph'), true);
  assert.equal(parsed.contextFit.status, 'good');
  assert.equal(parsed.h1Count, 1);
});
