import express from 'express';
import * as slugCtrl from '../controllers/slugController.js';
const router = express.Router();
router.get('/:slug', slugCtrl.getPageBySlug);
export default router;