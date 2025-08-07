export function getConsent(req, res) {
  res.json({ cookieConsent: req.session.cookieConsent || null });
}

export async function postConsent(req, res) {
try {
    console.log('POST /api/consent body:', req.body);
    // Body sollte z.B. { analytics: true, marketing: false } sein
    const { analytics = false, marketing = false } = req.body;

    req.session.cookieConsent = {
      necessary: true,
      analytics: Boolean(analytics),
      marketing: Boolean(marketing)
    };

    // Speichere die Session und warte darauf
    await new Promise((resolve, reject) => {
      req.session.save(err => err ? reject(err) : resolve());
    });

    return res.json({ success: true });
  } catch (err) {
    console.error('Error in postConsent:', err);
    // sende JSON-Fehler, damit der Client nicht das HTML-Error-Page bekommt
    return res.status(500).json({ success: false, message: err.message });
  }
}

export function withdrawConsent(req, res) {
  // Consent entfernen
  delete req.session.cookieConsent;
  req.session.save(err => {
    if (err) return res.status(500).json({ success: false });
    res.json({ success: true });
  });
}
