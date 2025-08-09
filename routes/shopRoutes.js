// routes/shopRoutes.js
import { Router } from 'express';
import { listPackages, createCheckoutSession, successPage, cancelPage, webhook } from '../controllers/shopController.js';

const router = Router();

// Seiten
router.get('/shop', listPackages);
router.get('/shop/success', successPage);
router.get('/shop/cancel', cancelPage);

// Checkout: Einfacher GET der direkt weiterleitet
router.get('/checkout/:id', createCheckoutSession);

// Webhook (RAW! – diese Route wird in index.js mit express.raw() gemountet)
export function mountWebhook(app) {
  app.post('/stripe/webhook', 
    // raw body NUR für Webhook:
    // Achtung: muss VOR bodyParser/json/urlencoded Middlewares kommen!
    // Wir mounten das hier gezielt.
    (req, res, next) => next(), // Platzhalter – echte raw-Config in index.js
    webhook
  );
}

export default router;
