import express from 'express';
import * as webhookCtrl from '../controllers/webhookController.js';
const router = express.Router();
router.post('/', express.raw({ type: 'application/json' }), webhookCtrl.postWebhook);
export default router;