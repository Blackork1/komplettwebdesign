// routes/leistungenRoutes.js
import express from 'express';
import { showLeistungPage } from '../controllers/leistungenController.js';
import {
  redirectLegacyLeistungPage,
  redirectLegacyLeistungSection,
  redirectLeistungPriceException
} from '../helpers/leistungPageRouting.js';

const router = express.Router();

// Einzelne Leistungsseite per Slug
router.get('/leistungen/:slug', redirectLeistungPriceException, redirectLegacyLeistungPage, showLeistungPage);
router.get('/webdesign-berlin/:slug', redirectLegacyLeistungSection, showLeistungPage);

export default router;
