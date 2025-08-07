import { Router } from 'express';
import { getConsent, postConsent, withdrawConsent } from '../controllers/consentController.js';

const router = Router();

// GET: aktuellen Consent ausliefern
router.get('/', getConsent);

// POST: Consent in Session speichern
router.post('/', postConsent);

router.delete('/', withdrawConsent);


export default router;
