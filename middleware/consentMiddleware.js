export default (req, res, next) => {
  const consent = req.session?.cookieConsent ?? {
    necessary: true,
    analytics: false,
    marketing: false
  };

  // Für Templates angenehm:
  res.locals.session = req.session ?? {};
  res.locals.consent = consent;
  res.locals.gaEnabled = Boolean(consent.analytics);

  // Seiten nicht CDN-cachen lassen, wenn du auf Nummer sicher gehen willst:
  res.setHeader('Cache-Control', 'private, must-revalidate');

  next();
};