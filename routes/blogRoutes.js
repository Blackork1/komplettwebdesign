// routes/blogRoutes.js
import { Router } from 'express';
import { listPosts, listPostsPage, showPost } from '../controllers/blogController.js';
import { addComment, listComments, reactToComment } from '../controllers/commentController.js';


const router = Router();

router.get('/blog',        listPosts);
router.get('/blog/posts',  listPostsPage);
router.get('/blog/website-kosten-2026-berlin-vergleich-2025', (_req, res) => {
  return res.redirect(301, '/blog/website-kosten-2025-einfach-erklaert');
});
router.get('/blog/:slug',  showPost);
router.get('/blog/:slug/comments', listComments);
router.post('/blog/:slug/comments', addComment);
router.post('/blog/comments/:commentId/react', reactToComment);

export default router;
