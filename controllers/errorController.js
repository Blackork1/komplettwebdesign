export function get404(req, res) {
  // Rendert die 404-Seite bei unbekannten Routen
  res.status(404).render('404', {
    pageTitle: 'Seite nicht gefunden',
    path: req.originalUrl
  });
}