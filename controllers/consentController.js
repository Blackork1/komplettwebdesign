export function getConsent(req, res) {
  res.json({ cookieConsent: req.session.cookieConsent || null });
}

export function postConsent(req, res) {
  const { analytics = false, marketing = false } = req.body;
  req.session.cookieConsent = {
    necessary: true,
    analytics: Boolean(analytics),
    marketing: Boolean(marketing)
  };
  req.session.save(err => {
    if (err) return res.status(500).json({ success: false });
    res.json({ success: true });
  });
}

export function withdrawConsent(req, res) {
  // Consent entfernen
  delete req.session.cookieConsent;
  req.session.save(err => {
    if (err) return res.status(500).json({ success: false });
    res.json({ success: true });
  });
}
