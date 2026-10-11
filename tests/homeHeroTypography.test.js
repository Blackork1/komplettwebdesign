import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import postcss from 'postcss';

const root = postcss.parse(readFileSync(new URL('../public/home.css', import.meta.url), 'utf8'));

function heroTypography(viewport) {
  const declarations = {};
  root.walkRules('.home-page .hero-main h1', rule => {
    let included = true;
    for (let parent = rule.parent; parent; parent = parent.parent) {
      if (parent.type !== 'atrule' || parent.name !== 'media') continue;
      const maximum = parent.params.match(/^\(max-width:\s*(\d+)px\)$/);
      if (!maximum || viewport > Number(maximum[1])) included = false;
    }
    if (included) rule.walkDecls(declaration => { declarations[declaration.prop] = declaration.value; });
  });
  const clamp = declarations['font-size']?.match(/^clamp\(([\d.]+)rem,\s*([\d.]+)vw,\s*([\d.]+)rem\)$/);
  assert.ok(clamp, 'responsive H1 muss eine begrenzte, mitwachsende Schriftgröße haben');
  return { pixels: Math.max(Number(clamp[1]) * 16,
    Math.min(Number(clamp[2]) * viewport / 100, Number(clamp[3]) * 16)),
  lineHeight: Number(declarations['line-height']) };
}

for (const [viewport, minimum, maximum] of [[320, 28, 34], [390, 28, 36],
  [768, 32, 44], [1280, 36, 48], [1440, 40, 54]]) {
  test(`Startseiten-H1 bleibt bei ${viewport}px kompakt und lesbar`, () => {
    const typography = heroTypography(viewport);
    assert(typography.pixels >= minimum && typography.pixels <= maximum,
      `${typography.pixels}px liegt außerhalb des gewünschten Bereichs ${minimum}–${maximum}px`);
    assert(typography.lineHeight >= 1.05, 'mehrzeilige Überschrift braucht ausreichenden Zeilenabstand');
  });
}
