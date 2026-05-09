import { getReferenceProjectBySlug, referenceProjects } from '../data/referenceProjects.js';

function baseUrlFrom(res) {
  return (res.locals.canonicalBaseUrl || process.env.CANONICAL_BASE_URL || 'https://komplettwebdesign.de').replace(/\/$/, '');
}

function absoluteUrl(baseUrl, pathOrUrl) {
  if (!pathOrUrl) return '';
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${baseUrl}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`;
}

function overviewStructuredData(baseUrl) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Referenzen',
    description: 'Ausgewählte Webdesign Referenzen von Komplett Webdesign.',
    url: `${baseUrl}/referenzen`,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: referenceProjects.map((project, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: project.name,
        url: `${baseUrl}/referenzen/${project.slug}`
      }))
    }
  };
}

function detailStructuredData(project, baseUrl, canonicalUrl) {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      name: project.name,
      headline: project.title,
      description: project.metaDescription,
      url: canonicalUrl,
      image: absoluteUrl(baseUrl, project.image),
      about: project.industry,
      creator: {
        '@type': 'Organization',
        name: 'Komplett Webdesign',
        url: baseUrl
      },
      ...(project.liveUrl ? { sameAs: project.liveUrl } : {})
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Startseite',
          item: `${baseUrl}/`
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Referenzen',
          item: `${baseUrl}/referenzen`
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: project.name,
          item: canonicalUrl
        }
      ]
    }
  ];
}

export function listReferences(req, res) {
  const baseUrl = baseUrlFrom(res);

  res.render('references/index', {
    title: 'Referenzen | Webdesign Projekte von Komplett Webdesign',
    description: 'Ausgewählte Webdesign Referenzen mit Ausgangslage, Ziel, Umsetzung und qualitativem Ergebnis.',
    canonicalUrl: `${baseUrl}/referenzen`,
    structuredDataBlocks: overviewStructuredData(baseUrl),
    projects: referenceProjects
  });
}

export function showReference(req, res) {
  const project = getReferenceProjectBySlug(req.params.slug);
  if (!project) return res.status(404).send('Referenz nicht gefunden');

  const baseUrl = baseUrlFrom(res);
  const canonicalUrl = `${baseUrl}/referenzen/${project.slug}`;

  return res.render('references/show', {
    title: project.title,
    description: project.metaDescription,
    canonicalUrl,
    structuredDataBlocks: detailStructuredData(project, baseUrl, canonicalUrl),
    project,
    otherProjects: referenceProjects.filter((item) => item.slug !== project.slug)
  });
}
