// routes/ratgeberRoutes.js
import { Router } from 'express';
import { listGuides, showGuide } from '../controllers/ratgeberController.js';

const router = Router();

router.get('/ratgeber',       listGuides);
router.get('/ratgeber/:slug', showGuide);

export default router;
