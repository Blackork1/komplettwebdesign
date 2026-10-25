// routes/blogRoutes.js
import { Router } from 'express';
import { listPosts, listPostsPage, showPost } from '../controllers/blogController.js';
import { addComment, listComments, reactToComment } from '../controllers/commentController.js';
import { BLOG_SLUG_ALIASES, resolveBlogRedirect } from '../data/blogRedirects.js';

const router = Router();

router.get('/blog',        listPosts);
router.get('/blog/posts',  listPostsPage);
// Zusammengeführte Artikel leiten direkt aufs Ziel, alte Datenbank-Slugs auf die saubere Adresse.
router.get('/blog/:slug', (req, res, next) => {
  const queryIndex = (req.originalUrl || '').indexOf('?');
  const search = queryIndex < 0 ? '' : req.originalUrl.slice(queryIndex);
  const redirectTo = resolveBlogRedirect(req.params.slug);
  if (redirectTo) return res.redirect(301, `${redirectTo}${search}`);
  const alias = Object.hasOwn(BLOG_SLUG_ALIASES, req.params.slug) ? BLOG_SLUG_ALIASES[req.params.slug] : null;
  return alias ? res.redirect(301, `/blog/${alias}${search}`) : next();
}, showPost);
router.get('/blog/:slug/comments', listComments);
router.post('/blog/:slug/comments', addComment);
router.post('/blog/comments/:commentId/react', reactToComment);

export default router;
