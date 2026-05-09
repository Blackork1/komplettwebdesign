import { Router } from 'express';
import { listReferences, showReference } from '../controllers/referenceController.js';

const router = Router();

router.get('/referenzen', listReferences);
router.get('/referenzen/:slug', showReference);

export default router;
