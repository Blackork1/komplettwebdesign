export default (req, res, next) => {
    // Wenn noch kein Consent gesetzt: Default { analytics: false, marketing: false }
    const consent = req.session?.cookieConsent ?? {
        necessary: true,
        analytics: false,
        marketing: false
    };    res.locals.gaEnabled = Boolean(consent.analytics);
    res.locals.session = req.session ?? {};
    next();
};
