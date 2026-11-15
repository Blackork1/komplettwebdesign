import express from 'express';

const SITE_URL = 'https://cookavoli.com';
const PUBLIC_PATHS = Object.freeze([
  '/',
  '/support',
  '/datenschutz',
  '/nutzungsbedingungen',
  '/konto-loeschen',
  '/impressum'
]);

function webPageSchema(path, title, description) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url: `${SITE_URL}${path === '/' ? '/' : path}`,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Cookavoli',
      url: `${SITE_URL}/`
    }
  };
}

function renderLegalPage(res, loadLegalPage, key, description) {
  const legalPage = loadLegalPage(key);
  res.render('cookavoli/legal', {
    title: `${legalPage.title} | Cookavoli`,
    description,
    canonicalPath: legalPage.path,
    legalPage,
    schema: webPageSchema(legalPage.path, legalPage.title, description)
  });
}

export function createCookavoliStaticPagesRouter({ loadLegalPage }) {
  if (typeof loadLegalPage !== 'function') {
    throw new TypeError('cookavoli_legal_loader_required');
  }

  const router = express.Router();
  router.get('/', (_req, res) => {
    const description = 'Cookavoli verbindet Rezeptentdeckung, persönliche Vorlieben, Planung und gemeinsames Kochen in einer App.';
    res.render('cookavoli/home', {
      title: 'Cookavoli – Swipe. Cook. Enjoy.',
      description,
      canonicalPath: '/',
      schema: {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'Cookavoli',
        applicationCategory: 'LifestyleApplication',
        operatingSystem: 'iOS, Android',
        description,
        url: `${SITE_URL}/`,
        provider: {
          '@type': 'Organization',
          name: 'Komplett Webdesign'
        }
      }
    });
  });

  router.get('/support', (_req, res) => renderLegalPage(
    res,
    loadLegalPage,
    'support',
    'Hilfe zu Cookavoli, Konto, Premium, Abos, Käufen und Kontolöschung.'
  ));
  router.get('/datenschutz', (_req, res) => renderLegalPage(
    res,
    loadLegalPage,
    'privacy',
    'Datenschutzerklärung für die Cookavoli-App und ihre Kontofunktionen.'
  ));
  router.get('/nutzungsbedingungen', (_req, res) => renderLegalPage(
    res,
    loadLegalPage,
    'terms',
    'Nutzungsbedingungen für Cookavoli Free, Premium und Kontofunktionen.'
  ));
  router.get('/konto-loeschen', (_req, res) => renderLegalPage(
    res,
    loadLegalPage,
    'accountDeletion',
    'Cookavoli-Konto direkt in der App oder über einen verifizierten Onlineweg löschen.'
  ));

  router.get('/impressum', (_req, res) => {
    const description = 'Impressum und Anbieterinformationen für Cookavoli.';
    res.render('cookavoli/imprint', {
      title: 'Impressum | Cookavoli',
      description,
      canonicalPath: '/impressum',
      schema: webPageSchema('/impressum', 'Impressum', description)
    });
  });

  router.get('/robots.txt', (_req, res) => {
    res.type('text/plain').send([
      'User-agent: *',
      'Allow: /',
      'Disallow: /api/',
      `Sitemap: ${SITE_URL}/sitemap.xml`,
      ''
    ].join('\n'));
  });

  router.get('/sitemap.xml', (_req, res) => {
    const urls = PUBLIC_PATHS.map((path) => (
      `  <url><loc>${SITE_URL}${path === '/' ? '/' : path}</loc></url>`
    )).join('\n');
    res.type('application/xml').send(
      `<?xml version="1.0" encoding="UTF-8"?>\n`
      + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
      + `${urls}\n</urlset>\n`
    );
  });

  return router;
}
