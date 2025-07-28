import express from 'express';
import * as pricingCtrl from '../controllers/pricingController.js';
const router = express.Router();
router.get('/', pricingCtrl.getPricing);
export default router;