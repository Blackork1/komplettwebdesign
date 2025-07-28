// routes/newsletter.js
import { Router } from 'express';
import { signup, unsubscribe } from '../controllers/newsletterController.js';

const router = Router();

router.post('/newsletter/signup', signup);
router.get('/newsletter/unsubscribe/:token', unsubscribe);

export default router;
