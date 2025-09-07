import express from 'express';
import * as pricingCtrl from '../controllers/pricingController.js';
import { isAdmin } from '../middleware/auth.js';

const router = express.Router();
router.get('/', isAdmin, pricingCtrl.getPricing);
export default router;