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

// router.get('/ratgeber/kosten-einfache-website', (req, res) => {
//   res.render('static/kosten/kosten-einfache-website', { 
//     title: 'Kosten einer einfachen Website – Beispiele & Checkliste',
//     description: 'Ehrliche Preisbeispiele und eine 8-Punkte-Checkliste für einen schnellen, sauberen Start – responsive, mobilfreundlich und klar strukturiert.'
//   });
// });

router.get('/webdesign-blumenladen/kosten', (req, res) => {
  res.render('static/kosten/webdesign-blumenladen', { 
    title: 'Blumenladen-Website: Kosten & 4-Wochen-Zeitplan (Sortiment, Lieferung, Saison)',
    description: 'Preisrahmen, Ablauf und Tipps zu Sortiment, Lieferanfrage & saisonalen Specials – für lokale Blumenläden in Berlin.'
  });
});

router.get('/webdesign-cafe/kosten', (req, res) => {
  res.render('static/kosten/webdesign-cafe', { 
    title: 'Café-Website: Kosten & 4-Wochen-Zeitplan (Speisekarte, Reservierung)',
    description: 'Preisrahmen, 4-Wochen-Plan und Tipps zu Speisekarte, Reservierung & Bildern.'
  });
});

// router.get('/ratgeber/website-kosten-zeitplan', (req, res) => {
//   res.render('static/kosten/website-kosten-zeitplan', { 
//     title: 'Website-Kosten 2025 & realistischer Zeitplan – einfach erklärt',
//     description: 'Was kostet eine Website 2025 – und wie lange dauert’s? Klare Preisbeispiele, 2/4/8-Wochen-Zeitpläne und Tipps für Selbstständige in Berlin.'
//   });
// });


export default router;
