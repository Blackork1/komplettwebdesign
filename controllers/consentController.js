// controllers/consentController.js
export function getConsent(req, res) {
  res.set('Cache-Control', 'no-store');          // <— wichtig
  const stored = req.session.cookieConsent;
  const cookieConsent = stored ? {
    necessary: true,
    analytics: Boolean(stored.analytics),
    marketing: Boolean(stored.marketing),
    youtubeVideos: Boolean(stored.youtubeVideos)
  } : null;
  res.json({ cookieConsent });
}

export function postConsent(req, res) {
  const {
    analytics = false,
    marketing = false,
    youtubeVideos = false
  } = req.body;
  req.session.cookieConsent = {
    necessary: true,
    analytics: Boolean(analytics),
    marketing: Boolean(marketing),
    youtubeVideos: Boolean(youtubeVideos)
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
