// routes/packages.js
import express from 'express';
import * as pkgCtrl from '../controllers/packagesController.js';

const router = express.Router();

function redirectLegacyPackage(target) {
  return (req, res) => {
    res.redirect(301, `${req.baseUrl === '/en' ? '/en' : ''}${target}`);
  };
}

// Übersicht & Detailseiten
router.get('/pakete',        pkgCtrl.listPackages);
router.get('/pakete/basis', redirectLegacyPackage('/pakete/start'));
router.get('/pakete/premium', redirectLegacyPackage('/pakete/wachstum'));
router.get('/pakete/:slug',  pkgCtrl.showPackage);

// Kontakt-/Buchungsformular
router.post('/pakete/:slug/kontakt', pkgCtrl.handleContact);

export default router;
