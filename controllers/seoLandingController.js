import { getSeoLandingPage } from '../data/seoLandingPages.js';

function baseUrlFrom(res) {
  return (res.locals.canonicalBaseUrl || process.env.CANONICAL_BASE_URL || 'https://komplettwebdesign.de').replace(/\/$/, '');
}

function buildBreadcrumbs(page, baseUrl) {
  const items = [
    {
      label: 'Startseite',
      href: '/'
    }
  ];

  if (page.parentBreadcrumb?.label && page.parentBreadcrumb?.href) {
    items.push(page.parentBreadcrumb);
  }

  items.push({
    label: page.h1,
    href: page.path,
    current: true
  });

  return items.map((item) => ({
    ...item,
    absoluteUrl: item.href.startsWith('http') ? item.href : `${baseUrl}${item.href === '/' ? '/' : item.href}`
  }));
}

function buildStructuredData(page, baseUrl, canonicalUrl) {
  const breadcrumbs = buildBreadcrumbs(page, baseUrl);
  const parentUrl = page.parentBreadcrumb?.href ? `${baseUrl}${page.parentBreadcrumb.href}` : baseUrl;

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: page.h1,
      headline: page.h1,
      description: page.description,
      url: canonicalUrl,
      inLanguage: 'de-DE',
      about: page.primaryKeyword,
      isPartOf: {
        '@type': 'WebPage',
        name: page.parentBreadcrumb?.label || 'Komplett Webdesign',
        url: parentUrl
      },
      publisher: {
        '@type': 'Organization',
        name: 'Komplett Webdesign',
        url: baseUrl
      }
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.label,
        item: item.current ? canonicalUrl : item.absoluteUrl
      }))
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: page.faq.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer
        }
      }))
    }
  ];
}

export function showSeoLandingPage(req, res, next) {
  const page = getSeoLandingPage(req.params.slug);
  if (!page) return next();

  const baseUrl = baseUrlFrom(res);
  const canonicalUrl = `${baseUrl}${page.path}`;
  const breadcrumbs = buildBreadcrumbs(page, baseUrl);

  return res.render('seo_landing/show', {
    title: page.title,
    description: page.description,
    canonicalUrl,
    page,
    breadcrumbs,
    structuredDataBlocks: buildStructuredData(page, baseUrl, canonicalUrl)
  });
}
