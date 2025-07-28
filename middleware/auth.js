export function isLoggedIn(req, res, next) {
    if (req.session?.user) return next();
    return res.redirect('/login');
  }
export function isAdmin(req, res, next) {
    if (req.session?.user?.isAdmin) return next();
    return res.redirect('/login');
  }