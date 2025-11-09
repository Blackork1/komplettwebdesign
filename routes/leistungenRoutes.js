// routes/leistungenRoutes.js
import express from 'express';
import { showLeistungPage } from '../controllers/leistungenController.js';

const router = express.Router();

// Einzelne Leistungsseite per Slug
router.get('/webdesign-berlin/:slug', showLeistungPage);

export default router;
