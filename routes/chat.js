import express from 'express';
import { history, message } from '../controllers/chatController.js';

const router = express.Router();

// Chat-API
router.get ('/chat/history', history);
router.post('/chat/message', message);

// Alias für deine FAQ-Seite, damit Frontend nicht umgebaut werden muss:
router.post('/faq/query', message);

export default router;