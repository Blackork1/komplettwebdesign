import express from 'express';
import * as checkoutCtrl from '../controllers/checkoutController.js';
const router = express.Router();
router.post('/', checkoutCtrl.postCreateCheckoutSession);
export default router;