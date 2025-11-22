export default (req, res, next) => {
  const consent = {
    necessary: true,
    analytics: false,
    marketing: false,
    youtubeVideos: false,
    ...(req.session?.cookieConsent ?? {})
  };

  req.consent = consent;              // <— diese Zeile ergänzen ✅


  // Für Templates angenehm:
  res.locals.session = req.session ?? {};
  res.locals.consent = consent;
  res.locals.gaEnabled = Boolean(consent.analytics);

  // NEU: Clarity-Flag + ID für EJS
  res.locals.clarityEnabled = Boolean(consent.analytics);
  res.locals.clarityId = process.env.CLARITY_ID || ''; // z.B. "tixw9x3n0i"

  // Seiten nicht CDN-cachen lassen, wenn du auf Nummer sicher gehen willst:
  res.setHeader('Cache-Control', 'private, must-revalidate');

  next();
};