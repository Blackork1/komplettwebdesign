// routes/blogRoutes.js
import { Router } from 'express';
import { listPosts, showPost } from '../controllers/blogController.js';
import { addComment, listComments, reactToComment } from '../controllers/commentController.js';


const router = Router();

router.get('/blog',        listPosts);
router.get('/blog/:slug',  showPost);
router.get('/blog/:slug/comments', listComments);
router.post('/blog/:slug/comments', addComment);
router.post('/blog/comments/:commentId/react', reactToComment);

export default router;
