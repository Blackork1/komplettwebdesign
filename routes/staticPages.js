// routes/staticPages.js
import { de } from 'date-fns/locale';
import express from 'express';
const router  = express.Router();

/**
 *  GET /impressum
 *  static/legal imprint
 */
router.get('/impressum', (req, res) => {
  res.render('static/impressum', { 
    title: 'Impressum | KomplettWebdesign',
    description: 'Hier finden Sie unser Impressum mit den rechtlichen Informationen zu unserem Unternehmen.'
  });
});

/**
 *  GET /datenschutz
 *  static/privacy policy
 */
router.get('/datenschutz', (req, res) => {
  res.render('static/datenschutz', { 
    title: 'Datenschutzerklärung | KomplettWebdesign',
    description: 'Hier finden Sie unsere Datenschutzerklärung, die erklärt, wie wir Ihre Daten schützen und verwenden.'
  });
});

export default router;
