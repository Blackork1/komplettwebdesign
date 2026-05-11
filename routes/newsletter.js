// routes/newsletter.js
import { Router } from 'express';
import { signup, unsubscribe } from '../controllers/newsletterController.js';
import { verifyCsrfToken } from '../middleware/csrf.js';
import {
  createNewsletterRateLimiter,
  createNewsletterSignupGuard
} from '../helpers/newsletterSpamProtection.js';

const router = Router();
const newsletterSignupRateLimit = createNewsletterRateLimiter();
const newsletterSignupGuard = createNewsletterSignupGuard();

router.post('/newsletter/signup', newsletterSignupRateLimit, verifyCsrfToken, newsletterSignupGuard, signup);
router.get('/newsletter/unsubscribe/:token', unsubscribe);

export default router;
