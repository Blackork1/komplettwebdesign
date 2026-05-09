import assert from 'node:assert/strict';
import test from 'node:test';
import { renderBrandEmail } from '../services/emailTemplateService.js';

test('brand email headline uses the site orange as inline color', () => {
  const html = renderBrandEmail({
    locale: 'de',
    subject: 'Bestätigung deiner Anfrage',
    headline: 'Vielen Dank für deine Anfrage',
    bodyHtml: '<p>Test</p>'
  });

  assert.match(
    html,
    /<h1 style="[^"]*color:\s*#e94a1b\s*!important;?[^"]*">Vielen Dank für deine Anfrage<\/h1>/
  );
});
