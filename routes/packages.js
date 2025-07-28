// routes/packages.js
import express from 'express';
import * as pkgCtrl from '../controllers/packagesController.js';

const router = express.Router();

// Übersicht & Detailseiten
router.get('/pakete',        pkgCtrl.listPackages);
router.get('/pakete/:slug',  pkgCtrl.showPackage);

// Kontakt-/Buchungsformular
router.post('/pakete/:slug/kontakt', pkgCtrl.handleContact);

export default router;
