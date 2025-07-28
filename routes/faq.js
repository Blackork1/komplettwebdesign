import express from 'express';
import { renderFaqPage } from '../controllers/faqController.js';

const router = express.Router();

// Public-FAQ-Seite
router.get('/faq', renderFaqPage);

export default router;
