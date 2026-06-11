export function get404(req, res) {
  // Rendert die 404-Seite bei unbekannten Routen
  res.locals.robots = 'noindex,nofollow';
  res.status(404).render('404', {
    title: 'Seite nicht gefunden | Komplett Webdesign',
    description: 'Diese Seite wurde nicht gefunden. Von hier kommst du zurück zur Startseite, zu den Paketen oder zur Kontaktseite.',
    path: req.originalUrl
  });
}

export function get500(err, req, res, next) {
  if (res.headersSent) return next(err);

  console.error('❌ Error:', err);
  res.locals.robots = 'noindex,nofollow';
  if (req.accepts('html')) {
    return res.status(500).render('error', {
      title: 'Technischer Fehler | Komplett Webdesign',
      description: 'Es ist ein technischer Fehler aufgetreten. Bitte versuche es später erneut oder nutze die Kontaktseite.'
    });
  }
  res.status(500).json({ error: 'Internal Server Error' });
}
