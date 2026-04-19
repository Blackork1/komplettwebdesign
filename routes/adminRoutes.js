import express from 'express';
import { body } from 'express-validator';
import multer from 'multer';
import * as admin from '../controllers/adminController.js';
import { isAdmin } from '../middleware/auth.js';
import * as autoCfg from '../controllers/autoConfigController.js';
import * as websiteTesterAdmin from '../controllers/adminWebsiteTesterController.js';
import * as newsletterAdmin from '../controllers/adminNewsletterController.js';

const router = express.Router();

// Mailversand-Anhänge: bis zu 10 Dateien, je max. 15 MB, insgesamt max. 25 MB
const mailUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024,
    files: 10,
    fields: 30
  }
});

router.get('/admin', isAdmin, admin.adminHome);

/* ---------- Kalender () ---------- */
router.get('/admin/appointments', isAdmin, admin.calendarPage);

/* API für das Admin-UI */
router.get('/admin/api/calendar', isAdmin, admin.monthAvailability);
router.get('/admin/api/day-slots', isAdmin, admin.daySlotsJSON);

/* ---------- Termine (appointments) ---------- */
router.get('/admin/appointments/list', isAdmin, admin.listAppointments);
router.get('/admin/appointments/new', isAdmin, admin.newAppointmentForm);

router.post(
  '/admin/appointments',
  isAdmin,
  body('start').isISO8601(),
  body('end').isISO8601(),
  admin.createAppointment
);

router.post('/admin/appointments/:id/delete', isAdmin, admin.deleteAppointment);

/* ---------- Buchungen (bookings) ----------- */
router.get('/admin/bookings', isAdmin, admin.listBookings);
router.post('/admin/bookings/:id/confirm', isAdmin, admin.confirmBooking);
router.post('/admin/bookings/:id/cancel', isAdmin, admin.cancelBooking);


/* ---------- Automatische Termine ---------- */
router.get('/admin/auto-config', isAdmin, autoCfg.getForm);
router.post('/admin/auto-config', isAdmin, autoCfg.saveForm);
router.post('/admin/appointments/auto/run', isAdmin, autoCfg.runAutoGenerate);

router.get('/admin/test', isAdmin, admin.getTest);

/* ---------- Mailversand ---------- */
router.get('/admin/mailversand', isAdmin, admin.mailversandForm);
router.post(
  '/admin/mailversand',
  isAdmin,
  mailUpload.array('attachments', 10),
  admin.mailversandSend
);
router.post('/admin/mailversand/preview', isAdmin, admin.mailversandPreview);
router.get('/admin/website-tester', isAdmin, websiteTesterAdmin.websiteTesterPage);
router.post('/admin/website-tester/config', isAdmin, websiteTesterAdmin.saveWebsiteTesterConfig);
router.post('/admin/website-tester/broken-links/config', isAdmin, websiteTesterAdmin.saveBrokenLinksTesterConfig);
router.post('/admin/website-tester/geo/config', isAdmin, websiteTesterAdmin.saveGeoTesterConfig);
router.post('/admin/website-tester/seo/config', isAdmin, websiteTesterAdmin.saveSeoTesterConfig);
router.post('/admin/website-tester/preview', isAdmin, websiteTesterAdmin.runWebsiteTesterPreviewAction);
router.get('/admin/website-tester/preview/:id/short.pdf', isAdmin, websiteTesterAdmin.downloadWebsiteTesterPreviewShortPdf);
router.get('/admin/website-tester/preview/:id/full.pdf', isAdmin, websiteTesterAdmin.downloadWebsiteTesterPreviewFullPdf);
router.get('/admin/website-tester/preview/:id/full.txt', isAdmin, websiteTesterAdmin.downloadWebsiteTesterPreviewFullText);
router.post('/admin/website-tester/leads/:id/resend-doi', isAdmin, websiteTesterAdmin.resendWebsiteTesterLeadDoiAction);
router.post('/admin/website-tester/leads/:id/resend-report', isAdmin, websiteTesterAdmin.resendWebsiteTesterLeadReportAction);
router.post('/admin/website-tester/leads/:id/send-full-guide', isAdmin, websiteTesterAdmin.sendWebsiteTesterLeadFullGuideAction);

/* ---------- Newsletter ---------- */
router.get('/admin/newsletter',                       isAdmin, newsletterAdmin.newsletterAdminPage);
router.post('/admin/newsletter/:id/deactivate',       isAdmin, newsletterAdmin.newsletterDeactivate);
router.post('/admin/newsletter/:id/reactivate',       isAdmin, newsletterAdmin.newsletterReactivate);
router.post('/admin/newsletter/:id/delete',           isAdmin, newsletterAdmin.newsletterDelete);

export default router;
