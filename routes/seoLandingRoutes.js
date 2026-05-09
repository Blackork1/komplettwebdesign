import { Router } from 'express';
import { showSeoLandingPage } from '../controllers/seoLandingController.js';

const router = Router();

router.get('/website-erstellen-lassen-berlin', (req, res, next) => {
  req.params.slug = 'website-erstellen-lassen-berlin';
  return showSeoLandingPage(req, res, next);
});

router.get('/website-relaunch-berlin', (req, res, next) => {
  req.params.slug = 'website-relaunch-berlin';
  return showSeoLandingPage(req, res, next);
});

router.get('/webdesign-kleine-unternehmen-berlin', (req, res, next) => {
  req.params.slug = 'webdesign-kleine-unternehmen-berlin';
  return showSeoLandingPage(req, res, next);
});

router.get('/ablauf', (req, res, next) => {
  req.params.slug = 'ablauf';
  return showSeoLandingPage(req, res, next);
});

export default router;
