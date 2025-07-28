// routes/blogRoutes.js
import { Router } from 'express';
import { listPosts, showPost } from '../controllers/blogController.js';

const router = Router();

router.get('/blog',        listPosts);
router.get('/blog/:slug',  showPost);

export default router;
