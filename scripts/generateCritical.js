// scripts/generateCritical.js
import fs        from 'node:fs/promises';
import penthouse from 'penthouse';

// Hier alle URLs/Slugs, die du brauchst
const pages = [
  { url: 'https://komplettwebdesign.de/',         name: 'home'   },
  { url: 'https://komplettwebdesign.de/kontakt',   name: 'kontakt'},
  // … weitere Routen …
];

// Lies dein gebündeltes CSS ein
const cssString = await fs.readFile(
  'public/assets/css/bundle.css', 'utf8'
);

// Viewport-Settings
const VIEWPORT = { width: 360, height: 640 };

// Generiere critical/*.css
await Promise.all(
  pages.map(({ url, name }) =>
    penthouse({ url, cssString, ...VIEWPORT })
      .then(css => fs.writeFile(`views/critical/${name}.css`, css))
  )
);

console.log('✅ Critical CSS fertig!');
process.exit(0);
