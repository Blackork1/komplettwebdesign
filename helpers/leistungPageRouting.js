export const REDIRECTED_LEISTUNG_PAGES = Object.freeze({
  'design-ux-ui': '/leistungen/website-relaunch',
  'seo-sichtbarkeit-einsteiger': '/leistungen/local-seo',
  'domain-hosting-technik': '/leistungen/laufende-kosten-website'
});

export const REDIRECTED_LEISTUNG_SLUGS = Object.freeze(Object.keys(REDIRECTED_LEISTUNG_PAGES));

export const KEPT_LEISTUNG_SLUGS = Object.freeze([
  'kosten-preise-pakete',
  'responsives-design-mobile',
  'inhalte-texte-content',
  'rechtliches-sicherheit'
]);

export function canonicalLeistungPath(slug) {
  if (slug === 'kosten-preise-pakete') return `/webdesign-berlin/${slug}`;
  return `/leistungen/${slug}`;
}

export function redirectLegacyLeistungPage(req, res, next) {
  const target = REDIRECTED_LEISTUNG_PAGES[req.params.slug];
  if (!target) return next();

  return res.redirect(301, target);
}

export function redirectLegacyLeistungSection(req, res, next) {
  const { slug } = req.params;
  const target = REDIRECTED_LEISTUNG_PAGES[slug];
  if (target) return res.redirect(301, target);
  if (slug === 'kosten-preise-pakete') return next();
  if (KEPT_LEISTUNG_SLUGS.includes(slug)) return res.redirect(301, canonicalLeistungPath(slug));
  return next();
}

export function redirectLeistungPriceException(req, res, next) {
  if (req.params.slug === 'kosten-preise-pakete') {
    return res.redirect(301, canonicalLeistungPath(req.params.slug));
  }
  return next();
}
