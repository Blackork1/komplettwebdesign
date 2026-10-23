import { buildOrganizationSchema } from '../helpers/entitySchema.js';
import { SITE_FACTS } from '../helpers/siteFacts.js';
// util/seoSchemas.js
/**
 * Erzeugt JSON-LD für Paket-Detailseiten:
 *  - BreadcrumbList
 *  - Service (zusätzliche Entity-Verankerung für GEO/Google Rich Results)
 *  - FAQPage nur aus sichtbaren Controller-/DB-Daten
 */

function buildServiceSchema({ pack, url, baseUrl, lng }) {
  const isEn = lng === "en";
  const name = String(pack.name || "").trim();
  const displayName = pack.displayName || name;
  const germanServiceName = /(?:-Paket|Paket|Projekt)$/i.test(displayName)
    ? displayName
    : `${displayName}-Paket`;
  const englishServiceName = `${name || displayName} package`;
  const description = pack.shortDescription || pack.description || pack.positioning || "";
  const org = buildOrganizationSchema(baseUrl);

  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: isEn ? englishServiceName : germanServiceName,
    description,
    serviceType: isEn ? "Website design and development" : "Webdesign und Entwicklung",
    provider: org,
    areaServed: [
      { "@type": "City", name: "Berlin" },
      { "@type": "State", name: "Brandenburg" }
    ],
    availableChannel: {
      "@type": "ServiceChannel",
      serviceUrl: url,
      servicePhone: SITE_FACTS.phone,
      availableLanguage: ["de-DE", "en"]
    }
  };
}

function normalizeFaqEntities(items = []) {
  return items
    .map((item) => {
      const name = item?.q || item?.question || item?.name;
      const answer = item?.a || item?.answer || item?.acceptedAnswer?.text;
      if (!name || !answer) return null;
      return {
        "@type": "Question",
        name,
        acceptedAnswer: { "@type": "Answer", text: answer }
      };
    })
    .filter(Boolean);
}

export function buildPackageSchemas({ pack, url, baseUrl, lng = "de" }) {
  const isEn = lng === "en";
  const name = String(pack.name || "").trim();

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: isEn ? "Home" : "Startseite", item: `${baseUrl}/` },
      { "@type": "ListItem", position: 2, name: isEn ? "Packages" : "Pakete", item: `${baseUrl}${isEn ? "/en" : ""}/pakete` },
      { "@type": "ListItem", position: 3, name,              item: url }
    ]
  };

  const service = buildServiceSchema({ pack, url, baseUrl, lng });

  const faqEntities = Array.isArray(pack.visibleFaqs) ? normalizeFaqEntities(pack.visibleFaqs) : [];
  const schemas = [breadcrumbs, service];

  if (faqEntities.length) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqEntities
    });
  }

  return schemas;
}
