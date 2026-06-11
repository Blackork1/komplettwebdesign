import { Router } from 'express';
import { showSeoLandingPage } from '../controllers/seoLandingController.js';

const router = Router();

function renderLanding(slug) {
  return (req, res, next) => {
    req.params.slug = slug;
    return showSeoLandingPage(req, res, next);
  };
}

router.get('/website-erstellen-lassen-berlin', (req, res, next) => {
  req.params.slug = 'website-erstellen-lassen-berlin';
  return showSeoLandingPage(req, res, next);
});

router.get('/website-relaunch-berlin', (_req, res) => res.redirect(301, '/leistungen/website-relaunch'));
router.get('/leistungen/website-relaunch', renderLanding('website-relaunch-berlin'));

router.get('/website-audit', (_req, res) => res.redirect(301, '/leistungen/website-audit'));
router.get('/leistungen/website-audit', renderLanding('website-audit'));

router.get('/landingpage-erstellen-lassen', (_req, res) => res.redirect(301, '/leistungen/landingpage-erstellen-lassen'));
router.get('/leistungen/landingpage-erstellen-lassen', renderLanding('landingpage-erstellen-lassen'));

router.get('/webdesign-kleine-unternehmen-berlin', (req, res, next) => {
  req.params.slug = 'webdesign-kleine-unternehmen-berlin';
  return showSeoLandingPage(req, res, next);
});

router.get('/ablauf', (req, res, next) => {
  req.params.slug = 'ablauf';
  return showSeoLandingPage(req, res, next);
});

export default router;
