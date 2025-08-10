// controllers/consentController.js
export function getConsent(req, res) {
  res.set('Cache-Control', 'no-store');          // <— wichtig
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
    res.set('Cache-Control', 'no-store');        // <— ebenfalls
    res.json({ success: true });
  });
}

export function withdrawConsent(req, res) {
  delete req.session.cookieConsent;
  req.session.save(err => {
    if (err) return res.status(500).json({ success: false });
    res.set('Cache-Control', 'no-store');        // <— ebenfalls
    res.json({ success: true });
  });
}
