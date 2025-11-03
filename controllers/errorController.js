export function get404(req, res) {
  // Rendert die 404-Seite bei unbekannten Routen
  res.status(404).render('404', {
    title: 'Seite nicht gefunden',
    description: 'Die angeforderte Seite wurde nicht gefunden.',
    path: req.originalUrl
  });
}
export function get500(req, res) {
  console.error('❌ Error:', err);
  if (req.accepts('html')) return res.status(500).render('error', { message: 'Unerwarteter Fehler' });
  res.status(500).json({ error: 'Internal Server Error' });
}