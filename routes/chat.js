import express from 'express';
import { chatFaq } from '../controllers/chatController.js';
const router = express.Router();

router.post('/faq/query', chatFaq);
export default router;
